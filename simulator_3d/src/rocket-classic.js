(function () {
  const MISSIONS = window.Missions || {};
  const LAUNCH_CONFIG = window.RocketLaunchConfig || null;
  const TWO_PI = Math.PI * 2;
  const DEG_TO_RAD = Math.PI / 180;

  function missionForScenario(scenarioId, launchSiteId, targetProfileId) {
    if (LAUNCH_CONFIG) {
      return LAUNCH_CONFIG.buildMission({ scenarioId, launchSiteId, targetProfileId });
    }

    return Object.values(MISSIONS).find((mission) => {
      return (mission.scenarioIds || []).includes(scenarioId);
    }) || null;
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

  function createMissionState(mission, bodies) {
    const earth = findBody(bodies, "Earth");
    if (!earth || bodies.some((body) => body.name === "Rocket")) {
      return null;
    }

    const site = mission.launchSite;
    const vehicle = mission.vehicle;
    const surface = surfaceState(earth, site, mission, 0);
    const rocket = {
      name: "Rocket",
      color: "#f7f7f2",
      mass: vehicle.dryMassKg + vehicle.fuelMassKg,
      dryMass: vehicle.dryMassKg,
      fuelMass: vehicle.fuelMassKg,
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
      missionTime: 0,
      attachedToPad: true,
      pelletAccumulator: 0,
      lastCommand: commandAt(mission, 0)
    };
  }

  function createPelletSystem(THREE, maxPellets, metersToUnits) {
    const max = maxPellets || 2000;
    const positions = new Float32Array(max * 3);
    const worldPositions = new Float64Array(max * 3);
    const velocities = new Float64Array(max * 3);
    const ttl = new Float32Array(max);
    const alive = new Uint8Array(max);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: "#ffb45b",
        size: 0.28,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85
      })
    );

    return {
      max,
      next: 0,
      positions,
      worldPositions,
      velocities,
      ttl,
      alive,
      points,
      metersToUnits
    };
  }

  function resetPelletSystem(system) {
    if (!system) {
      return;
    }

    system.next = 0;
    system.alive.fill(0);
    system.ttl.fill(0);
    system.positions.fill(0);
    system.worldPositions.fill(0);
    system.velocities.fill(0);
    system.points.geometry.attributes.position.needsUpdate = true;
  }

  function updateRocketBeforePhysics(state, bodies, dt, pelletSystem) {
    if (!state) {
      return;
    }

    const earth = findBody(bodies, "Earth");
    const rocket = state.rocket;
    if (!earth || !rocket) {
      return;
    }

    const command = commandAt(state.mission, state.missionTime);
    const attitude = attitudeDirection(state, bodies, command);
    const throttle = clamp(command.throttle || 0, 0, 1);

    rocket.attitudeDirection = attitude;
    rocket.engineOn = throttle > 0 && rocket.fuelMass > 0;

    if (state.attachedToPad) {
      lockRocketToPad(state, earth);
      if (!rocket.engineOn) {
        state.lastCommand = command;
        return;
      }
      state.attachedToPad = false;
    }

    if (rocket.engineOn) {
      burnFuel(state, rocket, attitude, throttle, dt, pelletSystem);
    }

    state.lastCommand = command;
  }

  function updateRocketAfterPhysics(state, bodies, dt, pelletSystem) {
    if (!state) {
      updatePellets(pelletSystem, bodies, dt);
      return;
    }

    const earth = findBody(bodies, "Earth");
    if (state.attachedToPad && earth) {
      lockRocketToPad(state, earth);
    }

    state.missionTime += dt;
    updatePellets(pelletSystem, bodies, dt);
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

    if (throttle > 0 && rocket.fuelMass > 0) {
      dt = Math.min(dt, timestep.thrustSeconds || 0.5);
    }

    const nextEvent = secondsToNextEvent(mission, state.missionTime);
    if (nextEvent > 0) {
      dt = Math.min(dt, nextEvent);
    }

    const nextBurn = secondsToNextBurn(mission, state.missionTime);
    if (nextBurn <= (timestep.preBurnLookaheadSeconds || 30)) {
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

    dt = Math.min(dt, chooseProximityStepSeconds(mission, bodies, rocket, timestep, dt));

    return Math.max(0.05, dt);
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

  function secondsToNextBurn(mission, missionTime) {
    let best = Infinity;

    for (const burn of mission.program || []) {
      if ((burn.throttle || 0) <= 0) {
        continue;
      }
      if (burn.start >= missionTime) {
        best = Math.min(best, burn.start - missionTime);
      }
    }

    return Number.isFinite(best) ? best : Infinity;
  }

  function commandAt(mission, missionTime) {
    const program = mission.program || [];
    let lastPast = null;

    for (const burn of program) {
      if (missionTime >= burn.start && missionTime < burn.end) {
        return burn;
      }
      if (missionTime >= burn.end) {
        lastPast = burn;
      }
    }

    return {
      name: lastPast ? `${lastPast.name} complete` : "idle",
      start: missionTime,
      end: missionTime,
      throttle: 0,
      attitude: lastPast ? lastPast.attitude : { mode: "surface-up" }
    };
  }

  function burnFuel(state, rocket, attitude, throttle, dt, pelletSystem) {
    const vehicle = state.mission.vehicle;
    const desiredMassFlow = throttle * vehicle.maxMassFlowKgPerSec;
    const maxMassFlow = rocket.fuelMass / dt;
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
    rocket.fuelMass -= spentFuel;
    rocket.mass = rocket.dryMass + rocket.fuelMass;

    spawnPellets(state, rocket, attitude, dt, pelletSystem);
  }

  function spawnPellets(state, rocket, attitude, dt, pelletSystem) {
    if (!pelletSystem) {
      return;
    }

    const vehicle = state.mission.vehicle;
    const visualRate = vehicle.visualPelletsPerSecond || 0;
    if (visualRate <= 0) {
      return;
    }

    state.pelletAccumulator += visualRate * dt;
    const count = Math.min(80, Math.floor(state.pelletAccumulator));
    state.pelletAccumulator -= count;

    const ttl = vehicle.visualPelletTtlSeconds || 60;
    const speed = vehicle.exhaustVelocityMps * (vehicle.visualPelletSpeedScale || 0.04);
    const cone = (vehicle.visualPelletConeDeg || 8) * DEG_TO_RAD;

    for (let i = 0; i < count; i += 1) {
      const exhaustDirection = randomConeDirection(multiply(attitude, -1), cone);
      const velocity = add(rocket.velocity, multiply(exhaustDirection, speed));
      addPellet(pelletSystem, rocket.position, velocity, ttl);
    }
  }

  function updatePellets(system, bodies, dt) {
    if (!system) {
      return;
    }

    const earth = findBody(bodies, "Earth");

    for (let i = 0; i < system.max; i += 1) {
      if (!system.alive[i]) {
        continue;
      }

      const base = i * 3;
      system.ttl[i] -= dt;
      if (system.ttl[i] <= 0) {
        killPellet(system, i);
        continue;
      }

      if (earth) {
        const dx = earth.position.x - system.worldPositions[base];
        const dy = earth.position.y - system.worldPositions[base + 1];
        const dz = earth.position.z - system.worldPositions[base + 2];
        const dist2 = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(dist2);

        if (dist <= earth.radius) {
          killPellet(system, i);
          continue;
        }

        const gravity = 6.67408e-11 * earth.mass / dist2;
        system.velocities[base] += dx / dist * gravity * dt;
        system.velocities[base + 1] += dy / dist * gravity * dt;
        system.velocities[base + 2] += dz / dist * gravity * dt;
      }

      system.worldPositions[base] += system.velocities[base] * dt;
      system.worldPositions[base + 1] += system.velocities[base + 1] * dt;
      system.worldPositions[base + 2] += system.velocities[base + 2] * dt;
      writeRenderPosition(system, i);
    }

    system.points.geometry.attributes.position.needsUpdate = true;
  }

  function addPellet(system, position, velocity, ttl) {
    const index = system.next;
    const base = index * 3;

    system.alive[index] = 1;
    system.ttl[index] = ttl;
    system.worldPositions[base] = position.x;
    system.worldPositions[base + 1] = position.y;
    system.worldPositions[base + 2] = position.z;
    system.velocities[base] = velocity.x;
    system.velocities[base + 1] = velocity.y;
    system.velocities[base + 2] = velocity.z;
    writeRenderPosition(system, index);

    system.next = (system.next + 1) % system.max;
  }

  function killPellet(system, index) {
    const base = index * 3;
    system.alive[index] = 0;
    system.ttl[index] = 0;
    system.positions[base] = 0;
    system.positions[base + 1] = 0;
    system.positions[base + 2] = 0;
  }

  function writeRenderPosition(system, index) {
    const base = index * 3;
    system.positions[base] = system.worldPositions[base] * system.metersToUnits;
    system.positions[base + 1] = system.worldPositions[base + 2] * system.metersToUnits;
    system.positions[base + 2] = system.worldPositions[base + 1] * system.metersToUnits;
  }

  function attitudeDirection(state, bodies, command) {
    const earth = findBody(bodies, "Earth");
    const rocket = state.rocket;
    if (!earth || !rocket) {
      return { x: 1, y: 0, z: 0 };
    }

    const up = normalize(subtract(rocket.position, earth.position));
    const attitude = command.attitude || { mode: "surface-up" };

    if (attitude.mode === "prograde") {
      return normalizeOrFallback(subtract(rocket.velocity, earth.velocity), up);
    }

    if (attitude.mode === "retrograde") {
      return normalizeOrFallback(multiply(subtract(rocket.velocity, earth.velocity), -1), up);
    }

    if (attitude.mode === "target-body") {
      const target = findBody(bodies, attitude.target);
      if (target) {
        const leadSeconds = attitude.leadSeconds || 0;
        const targetPosition = add(target.position, multiply(target.velocity, leadSeconds));
        return normalizeOrFallback(subtract(targetPosition, rocket.position), up);
      }
    }

    if (attitude.mode === "pitch-program") {
      const spinAxis = (state.mission.earth && state.mission.earth.northPole) || { x: 0, y: 0, z: 1 };
      return pitchDirection(up, attitude.headingDeg || 90, pitchAt(attitude, state.missionTime), spinAxis);
    }

    return up;
  }

  function pitchAt(attitude, missionTime) {
    const points = attitude.points || [];
    if (points.length === 0) {
      return attitude.pitchDeg || 90;
    }

    if (missionTime <= points[0].t) {
      return points[0].pitchDeg;
    }

    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (missionTime >= a.t && missionTime <= b.t) {
        const mix = (missionTime - a.t) / (b.t - a.t);
        return a.pitchDeg + (b.pitchDeg - a.pitchDeg) * mix;
      }
    }

    return points[points.length - 1].pitchDeg;
  }

  function pitchDirection(up, headingDeg, pitchDeg, spinAxis) {
    spinAxis = spinAxis || { x: 0, y: 0, z: 1 };
    const east = normalizeOrFallback(cross(spinAxis, up), { x: 0, y: 1, z: 0 });
    const north = normalizeOrFallback(cross(up, east), { x: 0, y: 0, z: 1 });
    const heading = headingDeg * DEG_TO_RAD;
    const horizontal = normalize(add(
      multiply(north, Math.cos(heading)),
      multiply(east, Math.sin(heading))
    ));
    const pitch = pitchDeg * DEG_TO_RAD;
    return normalize(add(
      multiply(up, Math.sin(pitch)),
      multiply(horizontal, Math.cos(pitch))
    ));
  }

  function lockRocketToPad(state, earth) {
    const surface = surfaceState(earth, state.mission.launchSite, state.mission, state.missionTime);
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

    return {
      missionTime: state.missionTime,
      fuelMass: state.rocket.fuelMass,
      fuelPercent: state.rocket.fuelMass / state.mission.vehicle.fuelMassKg * 100,
      dryMass: state.rocket.dryMass,
      totalMass: state.rocket.mass,
      engineOn: state.rocket.engineOn,
      commandName: command.name || (state.lastCommand && state.lastCommand.name),
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

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function multiply(v, value) {
    return { x: v.x * value, y: v.y * value, z: v.z * value };
  }

  function distance(a, b) {
    return Math.sqrt(
      (a.x - b.x) * (a.x - b.x) +
      (a.y - b.y) * (a.y - b.y) +
      (a.z - b.z) * (a.z - b.z)
    );
  }

  function normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  }

  function normalizeOrFallback(v, fallback) {
    const normalized = normalize(v);
    if (normalized.x === 0 && normalized.y === 0 && normalized.z === 0) {
      return fallback;
    }
    return normalized;
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomConeDirection(axis, coneRadians) {
    const w = normalize(axis);
    const helper = Math.abs(w.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const u = normalize(cross(helper, w));
    const v = cross(w, u);
    const theta = Math.random() * TWO_PI;
    const radius = Math.tan(coneRadians) * Math.sqrt(Math.random());
    return normalize(add(
      w,
      add(
        multiply(u, Math.cos(theta) * radius),
        multiply(v, Math.sin(theta) * radius)
      )
    ));
  }

  window.RocketSim = {
    missionForScenario,
    launchSites,
    targetProfilesForScenario,
    defaultLaunchSiteId,
    defaultLaunchSiteIdForScenario,
    defaultTargetProfileId,
    earthEllipsoid,
    createMissionState,
    createPelletSystem,
    resetPelletSystem,
    updateRocketBeforePhysics,
    updateRocketAfterPhysics,
    chooseStepSeconds,
    missionStatus
  };
})();
