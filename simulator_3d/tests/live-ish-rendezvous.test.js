import { SolarPhysics } from "../src/physics-classic.js";
import { RocketSim } from "../src/rocket-classic.js";
import { computeLaunchWindowForBodies } from "../src/launch-window.js";

const DATE_TIME = "2026-05-04T00:00:00Z";

function body(bodies, name) {
  return bodies.find((item) => item.name === name);
}

function relativeSpeed(a, b) {
  return Math.hypot(
    a.velocity.x - b.velocity.x,
    a.velocity.y - b.velocity.y,
    a.velocity.z - b.velocity.z
  );
}

function advanceWithoutRocket(bodies, seconds) {
  let elapsed = 0;
  while (elapsed < seconds) {
    const dt = Math.min(60, seconds - elapsed);
    SolarPhysics.stepSimulation(bodies, dt);
    elapsed += dt;
  }
}

function runMissionUntilDocked(bodies, missionState, maxMissionTimeSeconds) {
  while (missionState.missionTime < maxMissionTimeSeconds) {
    const dt = Math.min(
      RocketSim.chooseStepSeconds(missionState, bodies, 60),
      maxMissionTimeSeconds - missionState.missionTime
    );

    RocketSim.updateRocketBeforePhysics(missionState, bodies, dt);
    SolarPhysics.stepSimulation(bodies, dt);
    RocketSim.updateRocketAfterPhysics(missionState, bodies, dt);

    const earth = body(bodies, "Earth");
    const rocket = body(bodies, "Rocket");
    if (SolarPhysics.distance(rocket.position, earth.position) < earth.radius - 50000) {
      return { crashed: true };
    }
    if (missionState.rendezvous && missionState.rendezvous.phase === "docked") {
      return { crashed: false };
    }
  }

  return { crashed: false };
}

describe("live-ish Soyuz rendezvous", () => {
  test("guidance reaches docking capture", () => {
    const bodies = SolarPhysics.createInitialBodies("live-ish-soyuz-iss", { dateTime: DATE_TIME });
    const mission = RocketSim.missionForScenarioId("live-ish-soyuz-iss");
    const launchWindowSeconds = computeLaunchWindowForBodies(bodies, mission.launchSite, mission, "ISS");

    advanceWithoutRocket(bodies, launchWindowSeconds);
    const missionState = RocketSim.createMissionState(mission, bodies, launchWindowSeconds);
    const result = runMissionUntilDocked(bodies, missionState, 48 * 3600);
    const iss = body(bodies, "ISS");
    const rocket = body(bodies, "Rocket");
    const finalDistance = SolarPhysics.distance(iss.position, rocket.position);
    const finalRelativeSpeed = relativeSpeed(iss, rocket);

    expect(result.crashed).toBe(false);
    expect(missionState.rendezvous.phase).toBe("docked");
    expect(finalDistance).toBeLessThan(0.1);
    expect(finalRelativeSpeed).toBeLessThan(0.1);
    expect(rocket.fuelMass).toBeGreaterThanOrEqual(0);
  });
});
