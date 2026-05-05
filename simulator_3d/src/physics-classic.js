import { add, subtract, multiply, cross, normalize, normalizeOrFallback, distance, len } from './vec3.js';
import { G, DAY, YEAR } from './constants.js';
import { SolarScenarioData } from './scenario-data.js';
import { createEphemerisBodyStates, julianDate, smallBodyStateFromElements } from './ephemeris.js';

const SOFTENING = 1.0e5;
const KM_TO_M = 1000;

const scenarioData = SolarScenarioData;

  class Body {
    constructor({
      name,
      color,
      mass,
      radius,
      position,
      velocity,
      displayScale = 1,
      axialTiltDeg = 0,
      rotationPeriodHours = null,
      texturePath = null,
      ellipsoid = null,
      rings = null,
      isSatellite = false,
      kinematicOrbit = null,
      heliocentricOrbit = null
    }) {
      this.name = name;
      this.color = color;
      this.mass = mass;
      this.radius = radius;
      this.position = { ...position };
      this.velocity = { ...velocity };
      this.acceleration = { x: 0, y: 0, z: 0 };
      this.displayScale = displayScale;
      this.axialTiltDeg = axialTiltDeg;
      this.rotationPeriodHours = rotationPeriodHours;
      this.texturePath = texturePath;
      this.ellipsoid = ellipsoid;
      this.rings = rings;
      this.isSatellite = isSatellite;
      this.kinematicOrbit = kinematicOrbit;
      this.heliocentricOrbit = heliocentricOrbit;
      this._orbitTimeSeconds = 0;
    }
  }

  function circularBody({ name, color, mass, radius, orbitRadius, speed, phase, inclination = 0, displayScale = 1 }) {
    const cosPhase = Math.cos(phase);
    const sinPhase = Math.sin(phase);
    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);

    const x = -orbitRadius * sinPhase;
    const planarY = orbitRadius * cosPhase;
    const y = planarY * cosInc;
    const z = planarY * sinInc;

    const vx = speed * cosPhase;
    const planarVy = speed * sinPhase;
    const vy = planarVy * cosInc;
    const vz = planarVy * sinInc;

    return new Body({
      name,
      color,
      mass,
      radius,
      displayScale,
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz }
    });
  }

  function copyBody(body) {
    return new Body({
      name: body.name,
      color: body.color,
      mass: body.mass,
      radius: body.radius,
      displayScale: body.displayScale,
      axialTiltDeg: body.axialTiltDeg,
      rotationPeriodHours: body.rotationPeriodHours,
      texturePath: body.texturePath,
      ellipsoid: body.ellipsoid,
      rings: body.rings,
      isSatellite: body.isSatellite || false,
      kinematicOrbit: body.kinematicOrbit,
      heliocentricOrbit: body.heliocentricOrbit,
      position: body.position,
      velocity: body.velocity
    });
  }

  function getScenarios() {
    return scenarioData.scenarios;
  }

  function getScenario(scenarioId) {
    return (
      scenarioData.scenarios.find((scenario) => scenario.id === scenarioId) ||
      scenarioData.scenarios.find((scenario) => scenario.id === scenarioData.defaultScenarioId) ||
      scenarioData.scenarios[0]
    );
  }

  function stopMassCenter(bodies) {
    let totalMass = 0;
    const momentum = { x: 0, y: 0, z: 0 };

    for (const body of bodies) {
      totalMass += body.mass;
      momentum.x += body.velocity.x * body.mass;
      momentum.y += body.velocity.y * body.mass;
      momentum.z += body.velocity.z * body.mass;
    }

    for (const body of bodies) {
      body.velocity.x -= momentum.x / totalMass;
      body.velocity.y -= momentum.y / totalMass;
      body.velocity.z -= momentum.z / totalMass;
    }
  }

  function createInitialBodies(scenarioId, options = {}) {
    const scenario = getScenario(scenarioId);
    const bodies = createBodiesForScenario(scenario, options);

    if (scenario.initialState.stopMassCenter) {
      stopMassCenter(bodies);
    }

    computeAccelerations(bodies);

    return bodies;
  }

  function createBodiesForScenario(scenario, options = {}) {
    const initialState = scenario.initialState;
    if (initialState.type === "ephemeris") {
      const dateTime = options.dateTime || initialState.dateTime || new Date();
      const states = createEphemerisBodyStates({
        dateTime,
        includeBodies: initialState.includeBodies,
        satelliteLib: options.satelliteLib,
        maxTleAgeDays: options.maxTleAgeDays
      });
      return withCatalogOrbits(states.map((body) => createCatalogBody({
        name: body.name,
        position: body.position,
        velocity: body.velocity
      })), initialState.includeBodies, dateTime);
    }

    if (initialState.type === "vectors") {
      const included = initialState.includeBodies && new Set(initialState.includeBodies);
      return withCatalogOrbits(initialState.bodies
        .filter((body) => !included || included.has(body.name))
        .map((body) => createCatalogBody({
          name: body.name,
          position: vectorFromArray(body.positionKm, KM_TO_M),
          velocity: vectorFromArray(body.velocityKmS, KM_TO_M)
        })), initialState.includeBodies, initialState.dateTime);
    }

    if (initialState.type === "absolute") {
      return withCatalogOrbits(initialState.bodies.map((body) => createCatalogBody({
        name: body.name,
        position: vectorFromArray(body.position, 1),
        velocity: vectorFromArray(body.velocity, 1)
      })), initialState.includeBodies, initialState.dateTime);
    }

    return withCatalogOrbits(initialState.bodies.map((body) => {
      if (body.orbitRadius) {
        return circularBody({
          ...catalogDefaults(body.name),
          orbitRadius: body.orbitRadius,
          speed: body.speed,
          phase: body.phase,
          inclination: degreesToRadians(body.inclination || 0)
        });
      }

      return createCatalogBody({
        name: body.name,
        position: vectorFromArray(body.position, 1),
        velocity: vectorFromArray(body.velocity, 1)
      });
    }), initialState.includeBodies, initialState.dateTime);
  }

  function createCatalogBody({ name, position, velocity }) {
    return new Body({
      ...catalogDefaults(name),
      position,
      velocity
    });
  }

  function withCatalogOrbits(baseBodies, includeBodies, dateTime) {
    const included = includeBodies && new Set(includeBodies);
    const bodyNames = new Set(baseBodies.map((body) => body.name));
    const bodies = [...baseBodies];

    for (const [name, catalog] of Object.entries(scenarioData.bodyCatalog)) {
      const orbit = catalog.kinematicOrbit;
      if (!orbit || bodyNames.has(name) || !bodyNames.has(orbit.parent)) {
        continue;
      }
      if (included && !included.has(name)) {
        continue;
      }
      const body = createCatalogBody({
        name,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 }
      });
      applyKinematicOrbit(body, bodies, 0);
      bodies.push(body);
      bodyNames.add(name);
    }

    const jd = dateTime ? julianDate(dateTime) : null;
    for (const [name, catalog] of Object.entries(scenarioData.bodyCatalog)) {
      const orbit = catalog.heliocentricOrbit;
      if (!orbit || bodyNames.has(name) || !bodyNames.has("Sun")) {
        continue;
      }
      if (included && !included.has(name)) {
        continue;
      }
      const state = smallBodyStateFromElements(orbit, jd || orbit.epochJd);
      const body = createCatalogBody({
        name,
        position: state.position,
        velocity: state.velocity
      });
      bodies.push(body);
      bodyNames.add(name);
    }

    return bodies;
  }

  function catalogDefaults(name) {
    const catalog = scenarioData.bodyCatalog[name];
    if (!catalog) {
      throw new Error(`Missing body catalog entry for ${name}`);
    }

    return {
      name,
      color: catalog.color,
      mass: catalog.mass,
      radius: catalog.radius,
      displayScale: catalog.displayScale,
      axialTiltDeg: catalog.axialTiltDeg || 0,
      rotationPeriodHours: catalog.rotationPeriodHours || null,
      texturePath: catalog.texturePath || null,
      ellipsoid: catalog.ellipsoid || null,
      rings: catalog.rings || null,
      isSatellite: catalog.isSatellite || false,
      kinematicOrbit: catalog.kinematicOrbit || null,
      heliocentricOrbit: catalog.heliocentricOrbit || null
    };
  }

  function launchRocket(bodies, scenarioId) {
    const scenario = getScenario(scenarioId);
    const config = scenario.rocket || {};
    const earth = bodies.find((body) => body.name === "Earth");
    const sun = bodies.find((body) => body.name === "Sun");
    if (!earth || bodies.some((body) => body.name === "Rocket")) {
      return bodies;
    }

    const radial = sun
      ? normalize(subtract(earth.position, sun.position))
      : { x: 1, y: 0, z: 0 };
    const prograde = normalizeOrFallback(earth.velocity, { x: 0, y: 1, z: 0 });
    const outOfPlane = normalizeOrFallback(cross(radial, prograde), { x: 0, y: 0, z: 1 });
    const launchAltitude = earth.radius * (config.altitudeEarthRadii || 9);

    let extraVelocity;
    if (config.mode === "localOrbitKick") {
      const tangential = normalizeOrFallback(cross(outOfPlane, radial), { x: 0, y: 1, z: 0 });
      extraVelocity = add(
        multiply(tangential, config.tangentialDeltaV || 0),
        multiply(radial, config.radialDeltaV || 0)
      );
    } else {
      extraVelocity = add(
        add(
          multiply(prograde, config.progradeDeltaV || 0),
          multiply(radial, config.radialDeltaV || 0)
        ),
        multiply(outOfPlane, config.outOfPlaneDeltaV || 0)
      );
    }

    const rocket = new Body({
      name: "Rocket",
      color: "#f7f7f2",
      mass: 1.0e3,
      radius: 1.8e7,
      displayScale: 1,
      position: add(earth.position, multiply(radial, launchAltitude)),
      velocity: add(earth.velocity, extraVelocity)
    });

    const nextBodies = [...bodies.map(copyBody), rocket];
    computeAccelerations(nextBodies);
    return nextBodies;
  }

  function stepSimulation(bodies, dt) {
    for (const body of bodies) {
      if (body.kinematicOrbit) {
        continue;
      }
      body.velocity.x += body.acceleration.x * dt * 0.5;
      body.velocity.y += body.acceleration.y * dt * 0.5;
      body.velocity.z += body.acceleration.z * dt * 0.5;

      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.position.z += body.velocity.z * dt;
    }

    updateKinematicOrbits(bodies, dt);
    computeAccelerations(bodies);

    for (const body of bodies) {
      if (body.kinematicOrbit) {
        continue;
      }
      body.velocity.x += body.acceleration.x * dt * 0.5;
      body.velocity.y += body.acceleration.y * dt * 0.5;
      body.velocity.z += body.acceleration.z * dt * 0.5;
    }
  }

  function updateKinematicOrbits(bodies, dt) {
    for (const body of bodies) {
      if (!body.kinematicOrbit) {
        continue;
      }
      body._orbitTimeSeconds = (body._orbitTimeSeconds || 0) + dt;
      applyKinematicOrbit(body, bodies, body._orbitTimeSeconds);
    }
  }

  function applyKinematicOrbit(body, bodies, elapsedSeconds) {
    const orbit = body.kinematicOrbit;
    const parent = orbit && bodies.find((candidate) => candidate.name === orbit.parent);
    if (!parent) {
      return;
    }

    const phase = degreesToRadians(orbit.phaseDeg || 0);
    const inclination = degreesToRadians(orbit.inclinationDeg || 0);
    const angularSpeed = Math.PI * 2 / ((orbit.periodDays || 1) * DAY);
    const angle = phase + angularSpeed * elapsedSeconds;
    const radius = orbit.radiusM;
    const xAxis = normalizeOrFallback(parent.position, { x: 1, y: 0, z: 0 });
    let zAxis = normalizeOrFallback(cross(xAxis, parent.velocity), { x: 0, y: 0, z: 1 });
    if (len(cross(xAxis, zAxis)) < 0.001) {
      zAxis = { x: 0, y: 0, z: 1 };
    }
    const yAxis = normalizeOrFallback(cross(zAxis, xAxis), { x: 0, y: 1, z: 0 });
    const inclinedYAxis = add(multiply(yAxis, Math.cos(inclination)), multiply(zAxis, Math.sin(inclination)));
    const relPosition = add(
      multiply(xAxis, Math.cos(angle) * radius),
      multiply(inclinedYAxis, Math.sin(angle) * radius)
    );
    const relVelocity = add(
      multiply(xAxis, -Math.sin(angle) * radius * angularSpeed),
      multiply(inclinedYAxis, Math.cos(angle) * radius * angularSpeed)
    );

    body.position = add(parent.position, relPosition);
    body.velocity = add(parent.velocity, relVelocity);
  }

  function speed(body) {
    return len(body.velocity);
  }

  function computeAccelerations(bodies) {
    for (const body of bodies) {
      body.acceleration.x = 0;
      body.acceleration.y = 0;
      body.acceleration.z = 0;
    }

    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        // Two satellites: skip entirely (negligible mutual influence)
        if (a.isSatellite && b.isSatellite) continue;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        const dist2 = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
        const invDist3 = 1 / (dist2 * Math.sqrt(dist2));

        // Satellites are massless for gravity purposes — they get pulled but don't pull
        // Only apply acceleration to non-satellites as attractors (bScale) and to
        // the attracted body (aScale) when the attractor is a non-satellite.
        if (!a.isSatellite) {
          // a is massive: a gets pulled toward b (only if b is also massive)
          if (!b.isSatellite) {
            const aScale = G * b.mass * invDist3;
            const bScale = G * a.mass * invDist3;
            a.acceleration.x += dx * aScale;
            a.acceleration.y += dy * aScale;
            a.acceleration.z += dz * aScale;
            b.acceleration.x -= dx * bScale;
            b.acceleration.y -= dy * bScale;
            b.acceleration.z -= dz * bScale;
          }
          // b is a satellite: b gets pulled toward a (massive body)
          else {
            const bScale = G * a.mass * invDist3;
            b.acceleration.x -= dx * bScale;
            b.acceleration.y -= dy * bScale;
            b.acceleration.z -= dz * bScale;
          }
        } else {
          // a is a satellite: a gets pulled toward b (massive body, since sat+sat already skipped above)
          const aScale = G * b.mass * invDist3;
          a.acceleration.x += dx * aScale;
          a.acceleration.y += dy * aScale;
          a.acceleration.z += dz * aScale;
        }
      }
    }
  }

  function vectorFromArray(values, scale) {
    return {
      x: values[0] * scale,
      y: values[1] * scale,
      z: values[2] * scale
    };
  }

  function degreesToRadians(value) {
    return value * Math.PI / 180;
  }

  // LDEM height lookup: returns terrain height in meters above mean Moon radius
  function ldemHeightAt(latRad, lonRad) {
    const imageData = _ldemImageData;
    if (!imageData) return 0;
    const w = imageData.width;
    const h = imageData.height;
    // equirectangular: lon [-pi,pi] -> x [0,w], lat [-pi/2,pi/2] -> y [h,0]
    const u = ((lonRad / Math.PI) + 1) / 2;
    const v = 1 - ((latRad / (Math.PI / 2)) + 1) / 2;
    const x = Math.floor(u * (w - 1));
    const y = Math.floor(v * (h - 1));
    const idx = (y * w + x) * 4;
    const pixel = imageData.data[idx]; // 0-255
    // LRO LDEM: min=-9150m, max=+10784m, range=19934m
    return (pixel / 255) * 19934 - 9150;
  }

  function checkLandings(bodies, rocket, onLanding) {
    if (!rocket || rocket._landed) return;

    for (const body of bodies) {
      if (body.name !== 'Moon' && body.name !== 'Earth') continue;

      const dx = rocket.position.x - body.position.x;
      const dy = rocket.position.y - body.position.y;
      const dz = rocket.position.z - body.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      let surfaceRadius = body.radius;

      if (body.name === 'Moon') {
        // lat/lon relative to Moon
        const latRad = Math.asin(dz / dist);
        const lonRad = Math.atan2(dy, dx);
        surfaceRadius = body.radius + ldemHeightAt(latRad, lonRad);
      }

      if (dist <= surfaceRadius + 100) { // 100m tolerance
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const relVx = rocket.velocity.x - body.velocity.x;
        const relVy = rocket.velocity.y - body.velocity.y;
        const relVz = rocket.velocity.z - body.velocity.z;
        const radialSpeed = relVx * nx + relVy * ny + relVz * nz;
        if (radialSpeed > 0) continue; // moving away — still launching
        const impactSpeed = Math.abs(radialSpeed);

        rocket._landed = true;
        rocket.velocity.x = body.velocity.x;
        rocket.velocity.y = body.velocity.y;
        rocket.velocity.z = body.velocity.z;
        rocket.position.x = body.position.x + nx * (surfaceRadius + 50);
        rocket.position.y = body.position.y + ny * (surfaceRadius + 50);
        rocket.position.z = body.position.z + nz * (surfaceRadius + 50);

        const threshold = body.name === 'Moon' ? 5 : 10;
        const success = impactSpeed <= threshold;
        if (onLanding) onLanding(success, impactSpeed, body.name);
        return;
      }
    }
  }

let _ldemImageData = null;
export function setLdemImageData(imageData) { _ldemImageData = imageData; }

export const SolarPhysics = {
  constants: { G, DAY, YEAR },
  checkLandings,
  createInitialBodies,
  distance,
  getScenario,
  getScenarios,
  launchRocket,
  ldemHeightAt,
  speed,
  stepSimulation
};
