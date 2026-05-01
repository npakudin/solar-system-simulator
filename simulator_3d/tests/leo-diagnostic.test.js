/**
 * Diagnostic for the leo programTemplate + ISS profile (the reference that works).
 * Shows what trajectory baseVehicle achieves with the standard gravity-turn timing.
 */

import { setupMission, runTo, relativeSpeed } from './harness.js';

const GM = 6.67408e-11 * 5.972e24;

function snapshot(label, bodies, missionState, sim) {
  const earth  = bodies.find(b => b.name === 'Earth');
  const rocket = bodies.find(b => b.name === 'Rocket');

  const r     = sim.SolarPhysics.distance(rocket.position, earth.position);
  const alt   = (r - earth.radius) / 1000;
  const v     = sim.SolarPhysics.speed(rocket);
  const circV = Math.sqrt(GM / r);
  const fuelP = (rocket.fuelMass / missionState.mission.vehicle.fuelMassKg * 100).toFixed(1);
  const status = sim.RocketSim.missionStatus(missionState, bodies);

  console.log(
    `t=${String(Math.round(missionState.missionTime)).padStart(5)} s` +
    `  alt=${String(alt.toFixed(0)).padStart(6)} km` +
    `  v=${String(v.toFixed(0)).padStart(5)} m/s` +
    `  v/circ=${(v/circV).toFixed(3)}` +
    `  fuel=${fuelP}%` +
    `  incl=${(status.inclinationDeg||0).toFixed(1)}°` +
    `  | ${label}`
  );
}

test('leo ISS 420km profile — trajectory trace', () => {
  // toy-earth-rocket scenario, iss target profile (leo programTemplate)
  const state = setupMission('toy-earth-rocket', 'baikonur', 'iss');
  const { sim, bodies, missionState } = state;

  console.log('\n  leo/ISS reference trace:');
  console.log('  ' + '─'.repeat(90));

  const milestones = [
    { t: 28,   label: 'end vertical climb' },
    { t: 250,  label: 'end gravity turn' },
    { t: 300,  label: 'coast (early)' },
    { t: 400,  label: 'coast (mid)' },
    { t: 520,  label: 'start circularize' },
    { t: 590,  label: 'end circularize' },
    { t: 700,  label: '+ 110 s coast' },
    { t: 1800, label: '+ 30 min' },
    { t: 5540, label: '+ 1 orbit (~92 min)' },
  ];

  for (const m of milestones) {
    const { crashed } = runTo(m.t, sim, bodies, missionState);
    if (crashed) { console.log(`  *** CRASHED at t=${m.t} s ***`); break; }
    snapshot(m.label, bodies, missionState, sim);
  }

  console.log('  ' + '─'.repeat(90));
  expect(true).toBe(true);
});
