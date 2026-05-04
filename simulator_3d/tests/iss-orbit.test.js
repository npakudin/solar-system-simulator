import { createEphemerisBodyStates } from "../src/ephemeris.js";
import { altitudeAboveEarth, createIssState, ECLIPTIC_NORTH_POLE, orbitalInclinationDeg, selectNearestTle } from "../src/iss-orbit.js";
import { SolarPhysics } from "../src/physics-classic.js";

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

function relativeState(state, earth) {
  return {
    position: {
      x: state.position.x - earth.position.x,
      y: state.position.y - earth.position.y,
      z: state.position.z - earth.position.z
    },
    velocity: {
      x: state.velocity.x - earth.velocity.x,
      y: state.velocity.y - earth.velocity.y,
      z: state.velocity.z - earth.velocity.z
    }
  };
}

describe("ISS orbit state", () => {
  test.each(TEST_DATES)("synthetic fallback stays ISS-like for %s", (dateTime) => {
    const ephemeris = createEphemerisBodyStates({ dateTime, includeBodies: ["Earth"] });
    const earth = body(ephemeris, "Earth");
    const iss = createIssState({ dateTime, earthState: earth, maxTleAgeDays: 0 });
    const rel = relativeState(iss, earth);
    const altitude = altitudeAboveEarth(rel.position);
    const inclination = orbitalInclinationDeg(rel.position, rel.velocity, ECLIPTIC_NORTH_POLE);

    expect(iss.source).toBe("synthetic");
    expect(altitude).toBeGreaterThan(380e3);
    expect(altitude).toBeLessThan(460e3);
    expect(inclination).toBeGreaterThan(51.0);
    expect(inclination).toBeLessThan(52.2);
  });

  test("date-based ephemeris can include ISS in Earth-relative coordinates", () => {
    const states = createEphemerisBodyStates({
      dateTime: "2036-05-04T00:00:00Z",
      includeBodies: ["Sun", "Earth", "Moon", "ISS"]
    });
    const earth = body(states, "Earth");
    const iss = body(states, "ISS");
    const moon = body(states, "Moon");
    const issAltitude = SolarPhysics.distance(iss.position, earth.position) - 6371000;
    const moonDistance = SolarPhysics.distance(moon.position, earth.position);

    expect(iss).toBeTruthy();
    expect(issAltitude).toBeGreaterThan(380e3);
    expect(issAltitude).toBeLessThan(460e3);
    expect(moonDistance).toBeGreaterThan(360000e3);
    expect(moonDistance).toBeLessThan(410000e3);
  });

  test("TLE selection refuses stale TLEs", () => {
    expect(selectNearestTle("2026-05-04T00:00:00Z", 14)).toBeTruthy();
    expect(selectNearestTle("2036-05-04T00:00:00Z", 14)).toBeNull();
  });

  test("live-ish Soyuz scenario creates date-based ISS and mission config", () => {
    const bodies = SolarPhysics.createInitialBodies("live-ish-soyuz-iss", {
      dateTime: "2026-05-04T00:00:00Z"
    });
    const names = bodies.map((item) => item.name);
    const earth = body(bodies, "Earth");
    const iss = body(bodies, "ISS");
    const issAltitude = SolarPhysics.distance(iss.position, earth.position) - earth.radius;

    expect(names).toContain("Sun");
    expect(names).toContain("Earth");
    expect(names).toContain("Moon");
    expect(names).toContain("ISS");
    expect(issAltitude).toBeGreaterThan(380e3);
    expect(issAltitude).toBeLessThan(460e3);
  });
});
