import { createEphemerisBodyStates } from "../src/ephemeris.js";
import { SolarPhysics } from "../src/physics-classic.js";

const AU_M = 149597870700;
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

function body(states, name) {
  return states.find((item) => item.name === name);
}

function vectorIsFinite(vector) {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

describe("date-based ephemeris", () => {
  test.each(TEST_DATES)("returns finite plausible Sun, Earth, Moon states for %s", (dateTime) => {
    const states = createEphemerisBodyStates({
      dateTime,
      includeBodies: ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
    });

    expect(states.map((item) => item.name)).toEqual([
      "Sun",
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Moon"
    ]);

    for (const state of states) {
      expect(vectorIsFinite(state.position)).toBe(true);
      expect(vectorIsFinite(state.velocity)).toBe(true);
    }

    const sun = body(states, "Sun");
    const earth = body(states, "Earth");
    const moon = body(states, "Moon");
    const earthSunDistance = SolarPhysics.distance(earth.position, sun.position);
    const moonEarthDistance = SolarPhysics.distance(moon.position, earth.position);

    expect(earthSunDistance).toBeGreaterThan(0.97 * AU_M);
    expect(earthSunDistance).toBeLessThan(1.03 * AU_M);
    expect(moonEarthDistance).toBeGreaterThan(360000e3);
    expect(moonEarthDistance).toBeLessThan(410000e3);
  });

  test("can include a focused body set", () => {
    const states = createEphemerisBodyStates({
      dateTime: "2026-05-04T00:00:00Z",
      includeBodies: ["Sun", "Earth", "Moon"]
    });

    expect(states.map((item) => item.name)).toEqual(["Sun", "Earth", "Moon"]);
  });
});
