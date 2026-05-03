/**
 * Headless test harness — imports the simulator modules directly as ES modules.
 */

import { SolarPhysics } from '../src/physics-classic.js';
import { RocketSim } from '../src/rocket-classic.js';

export function loadSimulator() {
  return { SolarPhysics, RocketSim };
}

/**
 * Advance the simulation to targetTime using the mission's own adaptive timestep.
 * Returns an object: { events, crashed }.
 *   events  — array of burn events: { time, dt, fuelConsumed }
 *   crashed — true if the rocket went underground (sub-surface collision)
 */
export function runTo(targetTime, sim, bodies, missionState) {
  const { RocketSim, SolarPhysics } = sim;
  const events = [];

  while (missionState.missionTime < targetTime) {
    const remaining = targetTime - missionState.missionTime;
    const dt = Math.min(
      RocketSim.chooseStepSeconds(missionState, bodies, 10),
      remaining
    );

    const fuelBefore = missionState.rocket.fuelMass;

    RocketSim.updateRocketBeforePhysics(missionState, bodies, dt);
    SolarPhysics.stepSimulation(bodies, dt);
    RocketSim.updateRocketAfterPhysics(missionState, bodies, dt);

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
export function groupBurnSegments(events, gapSeconds = 5) {
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

export function setupMission(scenarioId, launchSiteId, profileId) {
  const bodies = SolarPhysics.createInitialBodies(scenarioId);
  const mission = RocketSim.missionForScenario(scenarioId, launchSiteId, profileId);
  const missionState = RocketSim.createMissionState(mission, bodies);
  const sim = { SolarPhysics, RocketSim };
  return { sim, bodies, mission, missionState };
}

export function setupScenarioMission(scenarioId) {
  const bodies = SolarPhysics.createInitialBodies(scenarioId);
  const mission = RocketSim.missionForScenarioId
    ? RocketSim.missionForScenarioId(scenarioId)
    : RocketSim.missionForScenario(scenarioId);
  const missionState = mission
    ? RocketSim.createMissionState(mission, bodies)
    : null;
  const sim = { SolarPhysics, RocketSim };
  return { sim, bodies, mission, missionState };
}

export function relativeSpeed(bodyA, bodyB) {
  const dx = bodyA.velocity.x - bodyB.velocity.x;
  const dy = bodyA.velocity.y - bodyB.velocity.y;
  const dz = bodyA.velocity.z - bodyB.velocity.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
