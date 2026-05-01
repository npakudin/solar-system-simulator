/**
 * Headless test harness — loads the browser simulator modules into a plain Node.js
 * object instead of a real window, preserving the exact script loading order from
 * index.html.  No DOM or Three.js is required.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

const SCRIPT_ORDER = [
  'src/scenario-data.js',
  'missions/baikonur-demo.js',
  'src/physics-classic.js',
  'src/rocket-classic.js',
];

function loadSimulator() {
  const window = {};

  for (const rel of SCRIPT_ORDER) {
    const code = fs.readFileSync(path.join(BASE, rel), 'utf-8');
    // Each source file does  (function(){ window.X = ... })()
    // Passing our object as the 'window' parameter makes all assignments land there.
    // eslint-disable-next-line no-new-func
    new Function('window', code)(window);
  }

  return {
    SolarPhysics: window.SolarPhysics,
    RocketSim: window.RocketSim,
    RocketLaunchConfig: window.RocketLaunchConfig,
  };
}

/**
 * Advance the simulation to targetTime using the mission's own adaptive timestep.
 * pelletSystem is always null — we skip visual exhaust particles in tests.
 * Returns an object: { events, crashed }.
 *   events  — array of burn events: { time, dt, fuelConsumed }
 *   crashed — true if the rocket went underground (sub-surface collision)
 */
function runTo(targetTime, sim, bodies, missionState) {
  const { RocketSim, SolarPhysics } = sim;
  const events = [];

  while (missionState.missionTime < targetTime) {
    const remaining = targetTime - missionState.missionTime;
    const dt = Math.min(
      RocketSim.chooseStepSeconds(missionState, bodies, 10),
      remaining
    );

    const fuelBefore = missionState.rocket.fuelMass;

    RocketSim.updateRocketBeforePhysics(missionState, bodies, dt, null);
    SolarPhysics.stepSimulation(bodies, dt);
    RocketSim.updateRocketAfterPhysics(missionState, bodies, dt, null);

    // Detect crash: rocket inside Earth
    const earth = bodies.find(b => b.name === 'Earth');
    const rocket = bodies.find(b => b.name === 'Rocket');
    if (earth && rocket) {
      const dist = SolarPhysics.distance(rocket.position, earth.position);
      if (dist < earth.radius - 50000) { // 50 km tolerance for off-latitude starts
        return { events, crashed: true, crashTime: missionState.missionTime };
      }
    }

    const fuelConsumed = fuelBefore - missionState.rocket.fuelMass;
    if (fuelConsumed > 0) {
      events.push({ time: missionState.missionTime, dt, fuelConsumed });
    }
  }

  return { events, crashed: false };
}

/**
 * Group consecutive burn steps (where fuelConsumed > 0) into discrete burn segments.
 * A new segment starts whenever there is a gap of more than gapSeconds between steps.
 */
function groupBurnSegments(events, gapSeconds = 5) {
  if (events.length === 0) return [];

  const segments = [];
  let seg = { startTime: events[0].time, endTime: events[0].time, totalFuel: events[0].fuelConsumed };

  for (let i = 1; i < events.length; i++) {
    const ev = events[i];
    if (ev.time - seg.endTime <= gapSeconds) {
      seg.endTime = ev.time;
      seg.totalFuel += ev.fuelConsumed;
    } else {
      segments.push({ ...seg, duration: seg.endTime - seg.startTime });
      seg = { startTime: ev.time, endTime: ev.time, totalFuel: ev.fuelConsumed };
    }
  }
  segments.push({ ...seg, duration: seg.endTime - seg.startTime });
  return segments;
}

function setupMission(scenarioId, launchSiteId, profileId) {
  const sim = loadSimulator();
  const bodies = sim.SolarPhysics.createInitialBodies(scenarioId);
  const mission = sim.RocketSim.missionForScenario(scenarioId, launchSiteId, profileId);
  const missionState = sim.RocketSim.createMissionState(mission, bodies);
  return { sim, bodies, missionState };
}

function relativeSpeed(bodyA, bodyB) {
  const dx = bodyA.velocity.x - bodyB.velocity.x;
  const dy = bodyA.velocity.y - bodyB.velocity.y;
  const dz = bodyA.velocity.z - bodyB.velocity.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

module.exports = { loadSimulator, runTo, groupBurnSegments, setupMission, relativeSpeed };
