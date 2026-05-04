import { add, subtract, multiply, cross, normalize, normalizeOrFallback, distance, dot, len } from './vec3.js';
import { G, TWO_PI, DEG2RAD as DEG_TO_RAD } from './constants.js';
import { attitudeDirection } from './attitude.js';
import { RocketLaunchConfig as LAUNCH_CONFIG } from './scenario-data.js';
import { rendezvousCommandName, updateRendezvousGuidance } from './rendezvous-guidance.js';

const MISSIONS = {};
const KM_TO_M = 1000;

  function missionForScenario(scenarioId, launchSiteId, targetProfileId) {
    if (LAUNCH_CONFIG) {
      if (!launchSiteId && !targetProfileId && LAUNCH_CONFIG.buildMissionForScenario) {
        return LAUNCH_CONFIG.buildMissionForScenario(scenarioId);
      }

      return LAUNCH_CONFIG.buildMission({ scenarioId, launchSiteId, targetProfileId });
    }

    return Object.values(MISSIONS).find((mission) => {
      return (mission.scenarioIds || []).includes(scenarioId);
    }) || null;
  }

  function missionForScenarioId(scenarioId) {
    if (LAUNCH_CONFIG && LAUNCH_CONFIG.buildMissionForScenario) {
      return LAUNCH_CONFIG.buildMissionForScenario(scenarioId);
    }

    return missionForScenario(scenarioId);
  }

  function launchSites() {
    return LAUNCH_CONFIG ? LAUNCH_CONFIG.launchSites : [];
  }

  function targetProfilesForScenario(scenarioId) {
    return LAUNCH_CONFIG
      ? LAUNCH_CONFIG.targetProfiles.filter((profile) => profile.scenarioIds.includes(scenarioId))
      : [];
  }

  function defaultLaunchSiteId() {
    return LAUNCH_CONFIG ? LAUNCH_CONFIG.defaultLaunchSiteId : "";
  }

  function defaultLaunchSiteIdForScenario(scenarioId, profileId) {
    if (!LAUNCH_CONFIG) return "";
    const profiles = LAUNCH_CONFIG.targetProfiles.filter((p) => p.scenarioIds.includes(scenarioId));
    const profile = profileId
      ? profiles.find((p) => p.id === profileId) || profiles[0]
      : profiles[0];
    return (profile && profile.defaultLaunchSiteId) || LAUNCH_CONFIG.defaultLaunchSiteId || "";
  }

  function defaultTargetProfileId(scenarioId) {
    if (!LAUNCH_CONFIG) {
      return "";
    }
    const preferred = LAUNCH_CONFIG.targetProfiles.find((profile) => {
      return profile.id === LAUNCH_CONFIG.defaultTargetProfileId && profile.scenarioIds.includes(scenarioId);
    });
    const fallback = LAUNCH_CONFIG.firstProfileForScenario(scenarioId);
    return (preferred || fallback || {}).id || "";
  }

  function earthEllipsoid() {
    return LAUNCH_CONFIG && LAUNCH_CONFIG.earth && LAUNCH_CONFIG.earth.ellipsoid;
  }

  function createMissionState(mission, bodies, earthRotationOffsetSeconds = 0) {
    const earth = findBody(bodies, "Earth");
    if (!earth || bodies.some((body) => body.name === "Rocket")) {
      return null;
    }

    const site = mission.launchSite;
    const vehicle = mission.vehicle;
    if (vehicle.initialHeliocentricState) {
      const state = vehicle.initialHeliocentricState;
      const rocket = {
        name: "Rocket",
        color: "#f7f7f2",
        mass: vehicle.dryMassKg + (vehicle.correctionFuelMassKg || 0),
        dryMass: vehicle.dryMassKg,
        fuelMass: 0,
        correctionFuelMass: vehicle.correctionFuelMassKg || 0,
        radius: vehicle.radiusMeters || 2e6,
        displayScale: 1,
        position: vectorFromArray(state.positionKm, KM_TO_M),
        velocity: vectorFromArray(state.velocityKmS, KM_TO_M),
        acceleration: { x: 0, y: 0, z: 0 },
        attitudeDirection: { x: 1, y: 0, z: 0 },
        engineOn: false
      };

      bodies.push(rocket);

      return {
        mission,
        rocket,
        earthRotationOffsetSeconds,
        missionTime: 0,
        attachedToPad: false,
        lastCommand: commandAt(mission, 0),
        rendezvous: null,
        rendezvousDockingOffset: { x: 0, y: 0, z: 0 }
      };
    }

    const surface = surfaceState(earth, site, mission, earthRotationOffsetSeconds);
    const rocket = {
      name: "Rocket",
      color: "#f7f7f2",
      mass: vehicle.dryMassKg + vehicle.fuelMassKg + (vehicle.correctionFuelMassKg || 0),
      dryMass: vehicle.dryMassKg,
      fuelMass: vehicle.fuelMassKg,
      correctionFuelMass: vehicle.correctionFuelMassKg || 0,
      radius: vehicle.radiusMeters || 2e6,
      displayScale: 1,
      position: add(surface.position, multiply(surface.up, 50)),
      velocity: surface.velocity,
      acceleration: { x: 0, y: 0, z: 0 },
      attitudeDirection: surface.up,
      engineOn: false
    };

    bodies.push(rocket);

    return {
      mission,
      rocket,
      earthRotationOffsetSeconds,
      missionTime: 0,
      attachedToPad: true,
      lastCommand: commandAt(mission, 0),
      rendezvous: null,
      rendezvousDockingOffset: { x: 0, y: 0, z: 0 }
    };
  }

  function updateRocketBeforePhysics(state, bodies, dt) {
    if (!state) {
      return;
    }

    const earth = findBody(bodies, "Earth");
    const rocket = state.rocket;
    if (!earth || !rocket) {
      return;
    }

    const command = commandAt(state.mission, state.missionTime);
    const attitude = correctionAttitudeDirection(state, bodies, command) || attitudeDirection(state, bodies, command);
    const throttle = clamp(command.throttle || 0, 0, 1);

    const availableFuel = command.correction ? (rocket.correctionFuelMass || 0) : rocket.fuelMass;
    rocket.attitudeDirection = attitude;
    rocket.engineOn = throttle > 0 && availableFuel > 0;

    if (state.attachedToPad) {
      lockRocketToPad(state, earth);
      if (!rocket.engineOn) {
        state.lastCommand = command;
        return;
      }
      state.attachedToPad = false;
    }

    if (rocket.engineOn) {
      burnFuel(state, rocket, attitude, throttle, dt, command);
    } else {
      updateRendezvousGuidance(state, bodies, dt);
    }

    state.lastCommand = command;
  }

  function updateRocketAfterPhysics(state, bodies, dt) {
    if (!state) {
      return;
    }

    const earth = findBody(bodies, "Earth");
    if (state.attachedToPad && earth) {
      lockRocketToPad(state, earth);
    }
    if (state.rendezvous && state.rendezvous.phase === "docked") {
      updateRendezvousGuidance(state, bodies, dt);
    }

    state.missionTime += dt;
  }

  function chooseStepSeconds(state, bodies, requestedDt) {
    if (!state) {
      return requestedDt;
    }

    const mission = state.mission;
    const timestep = mission.timestep || {};
    const rocket = state.rocket;
    const earth = findBody(bodies, "Earth");
    const command = commandAt(mission, state.missionTime);
    const throttle = clamp(command.throttle || 0, 0, 1);
    let dt = requestedDt;

    if (command.correction && throttle > 0 && (rocket.correctionFuelMass || 0) > 0) {
      dt = Math.min(dt, timestep.correctionSeconds || 60);
    } else if (throttle > 0 && rocket.fuelMass > 0) {
      dt = Math.min(dt, timestep.thrustSeconds || 0.5);
    }

    const nextEvent = secondsToNextEvent(mission, state.missionTime);
    if (nextEvent > 0) {
      dt = Math.min(dt, nextEvent);
    }

    const proximity = Math.min(nextEvent, secondsSinceLastEvent(mission, state.missionTime));
    if (proximity <= 2) {
      dt = Math.min(dt, timestep.nearEventSeconds || 0.05);
    } else if (proximity <= 10) {
      dt = Math.min(dt, timestep.preEventSeconds || 0.5);
    } else if (proximity <= (timestep.preBurnLookaheadSeconds || 30)) {
      dt = Math.min(dt, timestep.preBurnSeconds || 1);
    }

    if (earth && rocket) {
      const altitude = distance(rocket.position, earth.position) - earth.radius;
      if (altitude < 500000) {
        dt = Math.min(dt, timestep.nearEarthSeconds || 2);
      } else if (altitude < earth.radius * 20) {
        dt = Math.min(dt, timestep.orbitSeconds || 10);
      } else {
        dt = Math.min(dt, timestep.farSeconds || requestedDt);
      }
    }

    if (state.rendezvous && ["terminal", "capture", "docked"].includes(state.rendezvous.phase)) {
      dt = Math.min(dt, timestep.terminalGuidanceSeconds || 1);
    } else if (mission.rendezvous && rocket && state.missionTime >= lastProgramThrustEnd(mission)) {
      dt = Math.min(dt, timestep.guidanceSeconds || 10);
    }

    //const MIN_STEP = 0.001;
    const MIN_STEP = 0.01;

    dt = Math.min(dt, chooseProximityStepSeconds(mission, bodies, rocket, timestep, dt));

    if (!command.correction && rocket.engineOn && throttle > 0) {
      dt = Math.min(dt, MIN_STEP)
    }

    return Math.max(MIN_STEP, dt);
  }

  function chooseProximityStepSeconds(mission, bodies, rocket, timestep, currentDt) {
    if (!rocket) {
      return currentDt;
    }

    let dt = currentDt;
    const closeBodySeconds = timestep.closeBodySeconds || timestep.orbitSeconds || 10;
    const flybySeconds = timestep.flybySeconds || timestep.farSeconds || 60;
    const targetNames = missionTargetBodyNames(mission);

    for (const body of bodies || []) {
      if (!body || body === rocket || body.name === "Rocket" || body.name === "Sun") {
        continue;
      }

      const separation = distance(rocket.position, body.position);
      const closeRadius = body.radius * closeBodyRadiusMultiplier(body, targetNames);
      if (separation < closeRadius) {
        dt = Math.min(dt, closeBodySeconds);
        continue;
      }

      if (isMeaningfulFlybyBody(body, targetNames) && separation < body.radius * 80) {
        dt = Math.min(dt, flybySeconds);
      }
    }

    return dt;
  }

  function missionTargetBodyNames(mission) {
    const names = new Set();
    const targetName = mission.targetOrbit && mission.targetOrbit.name;
    if (targetName) {
      for (const name of ["Moon", "Jupiter", "Saturn", "Uranus", "Neptune", "Mars", "Venus", "ISS"]) {
        if (targetName.toLowerCase().includes(name.toLowerCase())) {
          names.add(name);
        }
      }
    }

    for (const burn of mission.program || []) {
      const target = burn.attitude && burn.attitude.target;
      if (target) {
        names.add(target);
      }
    }

    return names;
  }

  function closeBodyRadiusMultiplier(body, targetNames) {
    if (targetNames.has(body.name)) {
      return body.name === "Jupiter" ? 60 : 25;
    }
    if (body.name === "Moon") {
      return 18;
    }
    if (body.name === "Jupiter") {
      return 50;
    }
    return 8;
  }

  function isMeaningfulFlybyBody(body, targetNames) {
    return targetNames.has(body.name) || body.name === "Moon" || body.name === "Jupiter";
  }

  function correctionAttitudeDirection(state, bodies, command) {
    const correction = command && command.correction;
    const rocket = state && state.rocket;
    if (!correction || !rocket) {
      return null;
    }

    const target = findBody(bodies, correction.target);
    if (!target) {
      return null;
    }

    const secondsToEncounter = Math.max(1, correction.encounterTime - state.missionTime);
    const targetPosition = add(target.position, multiply(target.velocity, secondsToEncounter));
    const aimDirection = normalizeOrFallback(
      vectorFromArray(correction.direction),
      normalizeOrFallback(subtract(rocket.position, target.position), { x: 1, y: 0, z: 0 })
    );
    const aimPosition = add(targetPosition, multiply(aimDirection, target.radius + (correction.altitudeKm || 0) * 1000));
    const desiredVelocity = lambertDepartureVelocity(rocket.position, aimPosition, secondsToEncounter, bodies)
      || multiply(subtract(aimPosition, rocket.position), 1 / secondsToEncounter);
    return normalizeOrFallback(subtract(desiredVelocity, rocket.velocity), rocket.attitudeDirection || { x: 1, y: 0, z: 0 });
  }

  function lambertDepartureVelocity(fromPosition, toPosition, timeOfFlight, bodies) {
    const sun = findBody(bodies, "Sun");
    if (!sun || timeOfFlight <= 0) {
      return null;
    }

    const r1 = subtract(fromPosition, sun.position);
    const r2 = subtract(toPosition, sun.position);
    const r1mag = len(r1);
    const r2mag = len(r2);
    if (r1mag === 0 || r2mag === 0) {
      return null;
    }

    const cosDelta = clamp(dot(r1, r2) / (r1mag * r2mag), -1, 1);
    const crossDelta = cross(r1, r2);
    const sinDelta = normalizeOrFallback(crossDelta, { x: 0, y: 0, z: 1 }).z < 0
      ? -Math.sqrt(Math.max(0, 1 - cosDelta * cosDelta))
      : Math.sqrt(Math.max(0, 1 - cosDelta * cosDelta));
    const a = sinDelta * Math.sqrt((r1mag * r2mag) / Math.max(1e-12, 1 - cosDelta));
    if (!Number.isFinite(a) || Math.abs(a) < 1e-9) {
      return null;
    }

    const mu = G * sun.mass;
    let low = -4 * Math.PI * Math.PI;
    let high = 4 * Math.PI * Math.PI;
    let z = 0;
    let y = 0;
    let c = 0;
    let s = 0;

    for (let i = 0; i < 80; i += 1) {
      z = (low + high) * 0.5;
      c = stumpffC(z);
      s = stumpffS(z);
      if (c <= 0) {
        low = z;
        continue;
      }
      y = r1mag + r2mag + a * (z * s - 1) / Math.sqrt(c);
      if (y < 0) {
        low = z;
        continue;
      }
      const x = Math.sqrt(y / c);
      const t = (x * x * x * s + a * Math.sqrt(y)) / Math.sqrt(mu);
      if (!Number.isFinite(t)) {
        low = z;
      } else if (t < timeOfFlight) {
        low = z;
      } else {
        high = z;
      }
    }

    if (y <= 0 || Math.abs(a) < 1e-9) {
      return null;
    }

    const f = 1 - y / r1mag;
    const g = a * Math.sqrt(y / mu);
    if (!Number.isFinite(g) || Math.abs(g) < 1e-9) {
      return null;
    }

    const heliocentricVelocity = multiply(subtract(r2, multiply(r1, f)), 1 / g);
    return add(heliocentricVelocity, sun.velocity);
  }

  function stumpffC(z) {
    if (z > 1e-8) {
      const root = Math.sqrt(z);
      return (1 - Math.cos(root)) / z;
    }
    if (z < -1e-8) {
      const root = Math.sqrt(-z);
      return (Math.cosh(root) - 1) / -z;
    }
    return 0.5;
  }

  function stumpffS(z) {
    if (z > 1e-8) {
      const root = Math.sqrt(z);
      return (root - Math.sin(root)) / (root * root * root);
    }
    if (z < -1e-8) {
      const root = Math.sqrt(-z);
      return (Math.sinh(root) - root) / (root * root * root);
    }
    return 1 / 6;
  }

  function vectorFromArray(values, scale = 1) {
    return {
      x: ((values && values[0]) || 0) * scale,
      y: ((values && values[1]) || 0) * scale,
      z: ((values && values[2]) || 0) * scale
    };
  }

  function secondsToNextEvent(mission, missionTime) {
    let best = Infinity;

    for (const burn of mission.program || []) {
      for (const time of [burn.start, burn.end]) {
        if (time > missionTime) {
          best = Math.min(best, time - missionTime);
        }
      }

      const points = burn.attitude && burn.attitude.points;
      if (points) {
        for (const point of points) {
          if (point.t > missionTime) {
            best = Math.min(best, point.t - missionTime);
          }
        }
      }
    }

    return Number.isFinite(best) ? best : Infinity;
  }

  function secondsSinceLastEvent(mission, missionTime) {
    let best = Infinity;

    for (const burn of mission.program || []) {
      for (const time of [burn.start, burn.end]) {
        if (time <= missionTime) {
          best = Math.min(best, missionTime - time);
        }
      }

      const points = burn.attitude && burn.attitude.points;
      if (points) {
        for (const point of points) {
          if (point.t <= missionTime) {
            best = Math.min(best, missionTime - point.t);
          }
        }
      }
    }

    return Number.isFinite(best) ? best : Infinity;
  }

  function commandAt(mission, missionTime) {
    const program = mission.program || [];
    let lastPast = null;
    let activeCommand = null;

    for (const burn of program) {
      if (missionTime >= burn.start && missionTime < burn.end) {
        if (burn.correction) {
          return burn;
        }
        activeCommand = activeCommand || burn;
      }
      if (missionTime >= burn.end) {
        lastPast = burn;
      }
    }

    if (activeCommand) {
      return activeCommand;
    }

    return {
      name: lastPast ? `${lastPast.name} complete` : "idle",
      start: missionTime,
      end: missionTime,
      throttle: 0,
      attitude: lastPast ? lastPast.attitude : { mode: "surface-up" }
    };
  }

  function burnFuel(state, rocket, attitude, throttle, dt, command) {
    const vehicle = state.mission.vehicle;
    const desiredMassFlow = throttle * vehicle.maxMassFlowKgPerSec;
    const usesCorrectionFuel = command && command.correction && rocket.correctionFuelMass > 0;
    const availableFuel = usesCorrectionFuel ? rocket.correctionFuelMass : rocket.fuelMass;
    const maxMassFlow = availableFuel / dt;
    const massFlow = Math.max(0, Math.min(desiredMassFlow, maxMassFlow));
    const spentFuel = massFlow * dt;

    if (spentFuel <= 0) {
      rocket.engineOn = false;
      return;
    }

    const massBefore = rocket.dryMass + rocket.fuelMass;
    const thrustAcceleration = massFlow * vehicle.exhaustVelocityMps / massBefore;
    rocket.velocity.x += attitude.x * thrustAcceleration * dt;
    rocket.velocity.y += attitude.y * thrustAcceleration * dt;
    rocket.velocity.z += attitude.z * thrustAcceleration * dt;
    if (usesCorrectionFuel) {
      rocket.correctionFuelMass -= spentFuel;
    } else {
      rocket.fuelMass -= spentFuel;
    }
    rocket.mass = rocket.dryMass + rocket.fuelMass + (rocket.correctionFuelMass || 0);
  }

  function lockRocketToPad(state, earth) {
    const offset = state.earthRotationOffsetSeconds || 0;
    const surface = surfaceState(earth, state.mission.launchSite, state.mission, offset + state.missionTime);
    state.rocket.position = add(surface.position, multiply(surface.up, 50));
    state.rocket.velocity = surface.velocity;
    state.rocket.attitudeDirection = surface.up;
  }

  function surfaceState(earth, site, mission, missionTime) {
    const surface = siteSurfaceVector(site, mission, missionTime);
    const up = surface.up;
    const relativePosition = surface.position;
    const omega = earthAngularVelocity(mission);
    return {
      up,
      position: add(earth.position, relativePosition),
      velocity: add(earth.velocity, cross(omega, relativePosition))
    };
  }

  function siteSurfaceVector(site, mission, missionTime) {
    const rotation = earthAngularVelocityMagnitude(mission) * missionTime;
    const lat = site.latDeg * DEG_TO_RAD;
    const lon = site.lonDeg * DEG_TO_RAD + rotation;
    const height = site.altitudeM || 0;
    const ellipsoid = mission.earth && mission.earth.ellipsoid;
    const northPole = mission.earth && mission.earth.northPole;

    if (northPole) {
      return siteSurfaceVectorGeneral(northPole, lat, lon, height, ellipsoid);
    }

    // Fast path for toy scenarios where Z is the north pole
    const cosLat = Math.cos(lat);
    const up = normalize({
      x: cosLat * Math.cos(lon),
      y: cosLat * Math.sin(lon),
      z: Math.sin(lat)
    });

    if (!ellipsoid) {
      return { up, position: multiply(up, 6371000 + height) };
    }

    const a = ellipsoid.equatorialRadiusM;
    const b = ellipsoid.polarRadiusM;
    const e2 = 1 - (b * b) / (a * a);
    const sinLat = Math.sin(lat);
    const n = a / Math.sqrt(1 - e2 * sinLat * sinLat);

    return {
      up,
      position: {
        x: (n + height) * cosLat * Math.cos(lon),
        y: (n + height) * cosLat * Math.sin(lon),
        z: (n * (1 - e2) + height) * sinLat
      }
    };
  }

  function siteSurfaceVectorGeneral(pole, lat, lon, height, ellipsoid) {
    // Build an equatorial basis in the plane perpendicular to pole.
    // eq1 points toward lon=0 in the equatorial plane; eq2 = cross(pole, eq1).
    // Gram-Schmidt: project a reference vector onto the equatorial plane.
    const helper = (Math.abs(pole.x) > 0.9) ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    // eq1 = normalize(helper - (helper·pole)*pole) via cross-cross identity: cross(cross(pole,helper),pole)
    const eq1 = normalize(cross(cross(pole, helper), pole));
    const eq2 = cross(pole, eq1);

    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const cosLon = Math.cos(lon);
    const sinLon = Math.sin(lon);

    const up = normalize(add(
      add(multiply(eq1, cosLat * cosLon), multiply(eq2, cosLat * sinLon)),
      multiply(pole, sinLat)
    ));

    if (!ellipsoid) {
      return { up, position: multiply(up, 6371000 + height) };
    }

    const a = ellipsoid.equatorialRadiusM;
    const b = ellipsoid.polarRadiusM;
    const e2 = 1 - (b * b) / (a * a);
    const n = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    const eqR = (n + height) * cosLat;
    const polR = (n * (1 - e2) + height) * sinLat;

    return {
      up,
      position: add(
        add(multiply(eq1, eqR * cosLon), multiply(eq2, eqR * sinLon)),
        multiply(pole, polR)
      )
    };
  }

  function earthAngularVelocity(mission) {
    const mag = earthAngularVelocityMagnitude(mission);
    const pole = (mission.earth && mission.earth.northPole) || { x: 0, y: 0, z: 1 };
    return multiply(pole, mag);
  }

  function earthAngularVelocityMagnitude(mission) {
    return TWO_PI / mission.earth.rotationPeriodSeconds;
  }

  function missionStatus(state, bodies) {
    if (!state) {
      return null;
    }

    const command = commandAt(state.mission, state.missionTime);
    const throttle = clamp(command.throttle || 0, 0, 1);
    const maxMassFlow = state.mission.vehicle.maxMassFlowKgPerSec;
    const nextBurn = nextBurnInfo(state.mission, state.missionTime);
    const massFlow = state.rocket.engineOn
      ? Math.min(throttle * maxMassFlow, state.rocket.fuelMass)
      : 0;
    const earth = bodies && findBody(bodies, "Earth");
    const altitude = earth
      ? distance(state.rocket.position, earth.position) - earth.radius
      : NaN;
    const inclination = earth
      ? orbitalInclination(state.rocket, earth)
      : NaN;

    const status = {
      missionTime: state.missionTime,
      fuelMass: state.rocket.fuelMass,
      fuelPercent: state.rocket.fuelMass / state.mission.vehicle.fuelMassKg * 100,
      dryMass: state.rocket.dryMass,
      totalMass: state.rocket.mass,
      engineOn: state.rocket.engineOn,
      commandName: command.name || (state.lastCommand && state.lastCommand.name),
      rendezvousPhase: state.rendezvous && state.rendezvous.phase,
      rendezvousDistance: state.rendezvous && state.rendezvous.distance,
      rendezvousRelativeSpeed: state.rendezvous && state.rendezvous.relativeSpeed,
      throttle,
      massFlowKgPerSec: massFlow,
      maxMassFlowKgPerSec: maxMassFlow,
      altitude,
      inclinationDeg: inclination,
      targetInclinationDeg: state.mission.targetOrbit && state.mission.targetOrbit.inclinationDeg,
      commandStart: command.start,
      commandEnd: command.end,
      nextBurnName: nextBurn && nextBurn.name,
      nextBurnInSeconds: nextBurn && nextBurn.start - state.missionTime
    };

    const rendezvousName = rendezvousCommandName(state.rendezvous);
    if (rendezvousName) {
      status.commandName = rendezvousName;
    }

    return status;
  }

  function lastProgramThrustEnd(mission) {
    let end = 0;
    for (const command of mission.program || []) {
      if ((command.throttle || 0) > 0) {
        end = Math.max(end, command.end || 0);
      }
    }
    return end;
  }

  function nextBurnInfo(mission, missionTime) {
    let best = null;

    for (const burn of mission.program || []) {
      if ((burn.throttle || 0) <= 0 || burn.start <= missionTime) {
        continue;
      }
      if (!best || burn.start < best.start) {
        best = burn;
      }
    }

    return best;
  }

  function orbitalInclination(rocket, earth) {
    const relativePosition = subtract(rocket.position, earth.position);
    const relativeVelocity = subtract(rocket.velocity, earth.velocity);
    const angularMomentum = cross(relativePosition, relativeVelocity);
    const length = Math.sqrt(
      angularMomentum.x * angularMomentum.x +
      angularMomentum.y * angularMomentum.y +
      angularMomentum.z * angularMomentum.z
    );

    if (length === 0) {
      return NaN;
    }

    return Math.acos(clamp(angularMomentum.z / length, -1, 1)) / DEG_TO_RAD;
  }

  function findBody(bodies, name) {
    return bodies.find((body) => body.name === name);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

export const RocketSim = {
  missionForScenario,
  missionForScenarioId,
  launchSites,
  targetProfilesForScenario,
  defaultLaunchSiteId,
  defaultLaunchSiteIdForScenario,
  defaultTargetProfileId,
  earthEllipsoid,
  createMissionState,
  updateRocketBeforePhysics,
  updateRocketAfterPhysics,
  chooseStepSeconds,
  missionStatus
};
