import { RocketSim } from "../src/rocket-classic.js";
import { SolarPhysics } from "../src/physics-classic.js";
import { SolarScenarioData } from "../src/scenario-data.js";
import { runTo, setupScenarioMission } from "./harness.js";

function body(bodies, name) {
  return bodies.find((item) => item.name === name);
}

describe("Voyager 2 grand tour scenario", () => {
  test("uses the 1977 launch epoch and Horizons planet vectors", () => {
    const scenario = SolarScenarioData.scenarios.find((item) => item.id === "voyager-2-grand-tour");
    const bodies = SolarPhysics.createInitialBodies("voyager-2-grand-tour");
    const earth = body(bodies, "Earth");
    const jupiter = body(bodies, "Jupiter");

    expect(scenario.initialState.epoch).toBe("1977-08-20T14:29:44 TDB");
    expect(bodies.map((item) => item.name)).toEqual(expect.arrayContaining([
      "Sun",
      "Mercury",
      "Venus",
      "Earth",
      "Moon",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune"
    ]));
    expect(earth.position.x).toBeCloseTo(1.280209582891718e11, -3);
    expect(earth.position.y).toBeCloseTo(-8.072393952988523e10, -3);
    expect(jupiter.position.y).toBeCloseTo(7.517279440679684e11, -3);
  });

  test("builds a Cape Canaveral mission targeting all outer-planet assists", () => {
    const mission = RocketSim.missionForScenarioId("voyager-2-grand-tour");
    const programTargets = new Set(
      mission.program
        .map((command) => command.attitude && command.attitude.target)
        .filter(Boolean)
    );

    expect(mission.launchSite.id).toBe("cape-canaveral");
    expect(mission.vehicle.dryMassKg).toBeCloseTo(721.9);
    expect(mission.targetOrbit.name).toContain("Jupiter Saturn Uranus Neptune");
    expect(programTargets).toEqual(new Set(["Jupiter", "Saturn", "Uranus", "Neptune"]));
  });

  test("clears Earth during the modeled Titan IIIE ascent", () => {
    const state = setupScenarioMission("voyager-2-grand-tour");
    const result = runTo(700, state.sim, state.bodies, state.missionState);
    const earth = body(state.bodies, "Earth");
    const rocket = body(state.bodies, "Rocket");
    const altitude = SolarPhysics.distance(rocket.position, earth.position) - earth.radius;

    expect(result.crashed).toBe(false);
    expect(rocket._landed).toBeFalsy();
    expect(altitude).toBeGreaterThan(1.0e6);
  });
});
