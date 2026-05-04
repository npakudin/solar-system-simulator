import { SolarPhysics } from "../src/physics-classic.js";
import { RocketSim } from "../src/rocket-classic.js";
import { computeLaunchWindowForBodies } from "../src/launch-window.js";

const TEST_DATES = [
  "2026-05-04T00:00:00Z",
  "2026-05-05T00:00:00Z",
  "2026-06-03T00:00:00Z",
  "2026-10-31T00:00:00Z",
  "2027-05-04T00:00:00Z",
  "2031-05-04T00:00:00Z",
  "2036-05-04T00:00:00Z",
  "2026-01-15T12:00:00Z",
  "2026-07-15T12:00:00Z"
];

function body(bodies, name) {
  return bodies.find((item) => item.name === name);
}

function speed(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

describe("launch window helper", () => {
  test.each(TEST_DATES)("live-ish Soyuz has a Baikonur window within one sidereal day for %s", (dateTime) => {
    const bodies = SolarPhysics.createInitialBodies("live-ish-soyuz-iss", { dateTime });
    const mission = RocketSim.missionForScenarioId("live-ish-soyuz-iss");
    const windowSeconds = computeLaunchWindowForBodies(bodies, mission.launchSite, mission, "ISS");

    expect(windowSeconds).toBeGreaterThan(0);
    expect(windowSeconds).toBeLessThan(24 * 3600);
  });

  test("rocket starts with Earth orbital velocity plus launch-site rotation", () => {
    const bodies = SolarPhysics.createInitialBodies("live-ish-soyuz-iss", {
      dateTime: "2026-05-04T00:00:00Z"
    });
    const mission = RocketSim.missionForScenarioId("live-ish-soyuz-iss");
    const earth = body(bodies, "Earth");
    const windowSeconds = computeLaunchWindowForBodies(bodies, mission.launchSite, mission, "ISS");
    const state = RocketSim.createMissionState(mission, bodies, windowSeconds);
    const relativeVelocity = subtract(state.rocket.velocity, earth.velocity);

    expect(speed(earth.velocity)).toBeGreaterThan(25000);
    expect(speed(relativeVelocity)).toBeGreaterThan(200);
    expect(speed(relativeVelocity)).toBeLessThan(400);
  });
});
