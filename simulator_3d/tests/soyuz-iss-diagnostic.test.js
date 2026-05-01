/**
 * Diagnostic trace — logs altitude, speed, and fuel at each mission milestone.
 * Run with:  npx jest soyuz-iss-diagnostic --no-coverage --verbose
 *
 * Purpose: understand what the rocket is actually doing so the mission
 * program can be tuned.
 */

const { setupMission, runTo, relativeSpeed } = require('./harness');

const SCENARIO = 'soyuz-iss-baikonur';
const SITE     = 'baikonur';
const PROFILE  = 'soyuz-iss';
const GM       = 6.67408e-11 * 5.972e24;

function snapshot(label, bodies, missionState, sim) {
  const earth  = bodies.find(b => b.name === 'Earth');
  const rocket = bodies.find(b => b.name === 'Rocket');
  const iss    = bodies.find(b => b.name === 'ISS');

  const r   = sim.SolarPhysics.distance(rocket.position, earth.position);
  const alt = (r - earth.radius) / 1000; // km
  const v   = sim.SolarPhysics.speed(rocket);
  const circV = Math.sqrt(GM / r);
  const fuelPct = (rocket.fuelMass / missionState.mission.vehicle.fuelMassKg * 100).toFixed(1);
  const dist2iss = sim.SolarPhysics.distance(rocket.position, iss.position) / 1000;
  const relV = relativeSpeed(rocket, iss);
  const status = sim.RocketSim.missionStatus(missionState, bodies);

  console.log(
    `t=${String(Math.round(missionState.missionTime)).padStart(6)} s` +
    `  alt=${String(alt.toFixed(0)).padStart(7)} km` +
    `  v=${String(v.toFixed(0)).padStart(5)} m/s` +
    `  v/circ=${(v/circV).toFixed(3)}` +
    `  fuel=${fuelPct}%` +
    `  dist_ISS=${dist2iss.toFixed(0)} km` +
    `  relV=${relV.toFixed(0)} m/s` +
    `  | ${label}`
  );
}

test('mission trace — key milestones', () => {
  const state = setupMission(SCENARIO, SITE, PROFILE);
  const { sim, bodies, missionState } = state;

  const milestones = [
    { t: 28,    label: 'end vertical climb' },
    { t: 250,   label: 'end gravity turn (engine cut)' },
    { t: 520,   label: 'start circularize' },
    { t: 590,   label: 'end circularize / start Hohmann-1' },
    { t: 620,   label: 'end Hohmann-1 apogee raise' },
    { t: 2000,  label: 'coasting to 420 km apogee' },
    { t: 5000,  label: 'coasting to 420 km apogee (2)' },
    { t: 9220,  label: 'start Hohmann-2 circularize 420 km' },
    { t: 9250,  label: 'end Hohmann-2' },
    { t: 9280,  label: 'end phase correction — begin coast to ISS' },
    { t: 18000, label: '5 h mark' },
    { t: 36000, label: '10 h mark' },
    { t: 54000, label: '15 h mark' },
    { t: 86400, label: '24 h mark — end of program' },
  ];

  console.log('\n  Mission trace for Soyuz → ISS:');
  console.log('  ' + '─'.repeat(110));

  for (const m of milestones) {
    const { crashed, crashTime } = runTo(m.t, sim, bodies, missionState);
    if (crashed) {
      console.log(`  *** CRASHED at t=${crashTime.toFixed(0)} s ***`);
      break;
    }
    snapshot(m.label, bodies, missionState, sim);
    prev = m.t;
  }

  console.log('  ' + '─'.repeat(110));

  // Always pass — this is a diagnostic, not a correctness test
  expect(true).toBe(true);
});
