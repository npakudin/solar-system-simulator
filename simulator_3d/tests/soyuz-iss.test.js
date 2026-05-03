import { setupScenarioMission, runTo } from './harness.js';

const SCENARIO = 'soyuz-iss-baikonur';

const G  = 6.67408e-11;
const GM = G * 5.972e24;

function getBody(bodies, name) { return bodies.find(b => b.name === name); }

function altitude(bodies, sim) {
  const earth  = getBody(bodies, 'Earth');
  const rocket = getBody(bodies, 'Rocket');
  return sim.SolarPhysics.distance(rocket.position, earth.position) - earth.radius;
}

describe('ISS orbit — altitude 380–460 km', () => {
  let state, result;

  beforeAll(() => {
    state = setupScenarioMission(SCENARIO);
    result = runTo(5000, state.sim, state.bodies, state.missionState);
  });

  test('altitude is 380–460 km after circularization', () => {
    if (result.crashed) console.log(`  Crashed at t=${result.crashTime} s`);
    expect(result.crashed).toBe(false);
    const alt = altitude(state.bodies, state.sim);
    console.log(`  Altitude at t=5000 s: ${(alt / 1000).toFixed(1)} km`);
    expect(alt).toBeGreaterThanOrEqual(380e3);
    expect(alt).toBeLessThan(460e3);
  });
});
