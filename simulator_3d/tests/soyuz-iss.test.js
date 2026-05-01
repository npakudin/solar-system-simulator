/**
 * Headless simulation tests for the Soyuz → ISS mission.
 *
 * Each describe block initialises a fresh simulation (via beforeAll) and advances
 * it to a specific mission milestone so that all assertions in that block share
 * the same snapshot without duplicating simulation work.
 *
 * Tests that are expected to FAIL with the current mission program are marked
 * with "TODO:" in their description — they document what the program still needs.
 */

const { setupMission, runTo, groupBurnSegments, relativeSpeed } = require('./harness');

const SCENARIO  = 'soyuz-iss-baikonur';
const SITE      = 'baikonur';
const PROFILE   = 'soyuz-iss';

const G       = 6.67408e-11;
const GM      = G * 5.972e24;

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBody(bodies, name) {
  return bodies.find(b => b.name === name);
}

function altitude(bodies, sim) {
  const earth  = getBody(bodies, 'Earth');
  const rocket = getBody(bodies, 'Rocket');
  return sim.SolarPhysics.distance(rocket.position, earth.position) - earth.radius;
}

function circularVelocity(bodies, sim) {
  const earth = getBody(bodies, 'Earth');
  const rocket = getBody(bodies, 'Rocket');
  const r = sim.SolarPhysics.distance(rocket.position, earth.position);
  return Math.sqrt(GM / r);
}

// ─── Phase 1: launch + parking orbit ──────────────────────────────────────────

describe('Phase 1 — launch and parking orbit (t=530 s)', () => {
  let state, result;

  beforeAll(() => {
    state = setupMission(SCENARIO, SITE, PROFILE);
    result = runTo(530, state.sim, state.bodies, state.missionState);
  });

  test('rocket has not crashed during ascent', () => {
    expect(result.crashed).toBe(false);
  });

  test('rocket has left the ground', () => {
    expect(altitude(state.bodies, state.sim)).toBeGreaterThan(1000);
  });

  test('TODO: parking orbit altitude is 150–250 km', () => {
    const alt = altitude(state.bodies, state.sim);
    console.log(`  Altitude at t=530 s: ${(alt / 1000).toFixed(0)} km`);
    expect(alt).toBeGreaterThan(150e3);
    expect(alt).toBeLessThan(250e3);
  });

  test('TODO: speed is at least 95 % of circular velocity at this altitude', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    const v      = state.sim.SolarPhysics.speed(rocket);
    const circV  = circularVelocity(state.bodies, state.sim);
    console.log(`  v/circV at t=530 s: ${(v / circV).toFixed(3)}`);
    expect(v / circV).toBeGreaterThan(0.95);
  });

  test('fuel was actually consumed during ascent', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    const initialFuel = state.missionState.mission.vehicle.fuelMassKg;
    expect(rocket.fuelMass).toBeLessThan(initialFuel);
    expect(rocket.fuelMass).toBeGreaterThan(0);
  });

  test('thrust-to-weight ratio at liftoff is > 1', () => {
    const v = state.missionState.mission.vehicle;
    const initialMass = v.dryMassKg + v.fuelMassKg;
    const maxThrust = v.maxMassFlowKgPerSec * v.exhaustVelocityMps;
    const weight = initialMass * 9.8;
    const twr = maxThrust / weight;
    console.log(`  Liftoff T/W ratio: ${twr.toFixed(3)} (need > 1.0)`);
    expect(twr).toBeGreaterThan(1.0);
  });
});

// ─── Phase 2: Hohmann transfer to ISS orbit ───────────────────────────────────

describe('Phase 2 — Hohmann transfer to 420 km orbit (t=3 400 s)', () => {
  let state, result;

  beforeAll(() => {
    state = setupMission(SCENARIO, SITE, PROFILE);
    result = runTo(3400, state.sim, state.bodies, state.missionState);
  });

  test('rocket has not crashed during transfer', () => {
    expect(result.crashed).toBe(false);
  });

  test('TODO: altitude is 380–460 km', () => {
    const alt = altitude(state.bodies, state.sim);
    console.log(`  Altitude at t=3400 s: ${(alt / 1000).toFixed(0)} km`);
    expect(alt).toBeGreaterThan(380e3);
    expect(alt).toBeLessThan(460e3);
  });

  test('TODO: speed is close to circular velocity at 420 km', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    const v      = state.sim.SolarPhysics.speed(rocket);
    const circV  = circularVelocity(state.bodies, state.sim);
    console.log(`  v/circV at t=3400 s: ${(v / circV).toFixed(3)}`);
    expect(v / circV).toBeGreaterThan(0.97);
    expect(v / circV).toBeLessThan(1.05);
  });

  test('orbital inclination is 45–60°', () => {
    const status = state.sim.RocketSim.missionStatus(state.missionState, state.bodies);
    expect(status.inclinationDeg).toBeGreaterThan(45);
    expect(status.inclinationDeg).toBeLessThan(60);
  });

  test('fuel reserves are adequate (> 5 000 kg)', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    expect(rocket.fuelMass).toBeGreaterThan(5000);
  });

  test('TODO: at least 3 distinct burn segments detected', () => {
    const segments = groupBurnSegments(result.events);
    console.log(`  Burn segments detected by t=3400 s: ${segments.length}`);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Phase 3: ISS rendezvous (end of program at t=21 600 s) ───────────────────

describe('Phase 3 — ISS rendezvous (t=21 600 s)', () => {
  let state, result, finalBurnEvents;

  beforeAll(() => {
    state = setupMission(SCENARIO, SITE, PROFILE);
    result = runTo(21600, state.sim, state.bodies, state.missionState);
    finalBurnEvents = result.events.filter(ev => ev.time > 3330);
  });

  test('rocket has not crashed during rendezvous phase', () => {
    if (result.crashed) {
      console.log(`  CRASHED at t=${result.crashTime.toFixed(0)} s`);
    }
    expect(result.crashed).toBe(false);
  });

  test('TODO: still in ISS orbit altitude band (350–500 km)', () => {
    const alt = altitude(state.bodies, state.sim);
    console.log(`  Altitude at t=21600 s: ${(alt / 1000).toFixed(0)} km`);
    expect(alt).toBeGreaterThan(350e3);
    expect(alt).toBeLessThan(500e3);
  });

  test('has not run out of fuel', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    expect(rocket.fuelMass).toBeGreaterThan(0);
  });

  // ── The two tests below are currently expected to FAIL ────────────────────
  // They define the acceptance criteria for the rendezvous manoeuvre.
  // Once the mission program gains a proper proximity-operations sequence
  // these should turn green.

  test('TODO: distance to ISS is under 1 km at end of program', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    const iss    = getBody(state.bodies, 'ISS');
    const dist   = state.sim.SolarPhysics.distance(rocket.position, iss.position);
    console.log(`  Distance to ISS at t=21600 s: ${(dist / 1000).toFixed(1)} km`);
    expect(dist).toBeLessThan(1000);
  });

  test('TODO: relative velocity w.r.t. ISS is under 5 m/s at end of program', () => {
    const rocket = getBody(state.bodies, 'Rocket');
    const iss    = getBody(state.bodies, 'ISS');
    const relV   = relativeSpeed(rocket, iss);
    console.log(`  Relative speed vs ISS at t=21600 s: ${relV.toFixed(2)} m/s`);
    expect(relV).toBeLessThan(5);
  });
});

// ─── Phase 4: approach correction structure ────────────────────────────────────

describe('Phase 4 — proximity-operations correction structure', () => {
  let state, approachBurns, burnSegments;

  beforeAll(() => {
    state = setupMission(SCENARIO, SITE, PROFILE);
    const result = runTo(21600, state.sim, state.bodies, state.missionState);
    const approachEvents = result.events.filter(ev => ev.time > 3330);
    burnSegments = groupBurnSegments(approachEvents);

    approachBurns = state.missionState.mission.program.filter(
      b => b.start >= 3330 && (b.throttle || 0) > 0
    );
  });

  // ── Currently expected to FAIL ────────────────────────────────────────────

  test('TODO: program has at least 5 correction burns after initial phase (t > 3330 s)', () => {
    console.log(`  Correction burns in mission program after t=3330 s: ${approachBurns.length}`);
    expect(approachBurns.length).toBeGreaterThanOrEqual(5);
  });

  test('TODO: correction burn durations are non-increasing (shorter over time)', () => {
    if (approachBurns.length < 2) {
      expect(approachBurns.length).toBeGreaterThanOrEqual(2);
      return;
    }
    for (let i = 1; i < approachBurns.length; i++) {
      const prev = approachBurns[i - 1];
      const curr = approachBurns[i];
      const prevDuration = prev.end - prev.start;
      const currDuration = curr.end - curr.start;
      expect(currDuration).toBeLessThanOrEqual(prevDuration * 1.1);
    }
  });

  test('TODO: correction burn impulses are non-increasing (smaller throttle×duration)', () => {
    if (approachBurns.length < 2) {
      expect(approachBurns.length).toBeGreaterThanOrEqual(2);
      return;
    }
    for (let i = 1; i < approachBurns.length; i++) {
      const prev = approachBurns[i - 1];
      const curr = approachBurns[i];
      const prevImpulse = (prev.throttle || 0) * (prev.end - prev.start);
      const currImpulse = (curr.throttle || 0) * (curr.end - curr.start);
      expect(currImpulse).toBeLessThanOrEqual(prevImpulse * 1.1);
    }
  });

  test('TODO: simulation shows at least 5 distinct burn segments in final approach', () => {
    console.log(`  Burn segments detected in approach (t > 3330 s): ${burnSegments.length}`);
    if (burnSegments.length > 0) {
      burnSegments.forEach((s, i) => {
        console.log(`    Segment ${i + 1}: t=${s.startTime.toFixed(0)}–${s.endTime.toFixed(0)} s, fuel=${s.totalFuel.toFixed(1)} kg`);
      });
    }
    expect(burnSegments.length).toBeGreaterThanOrEqual(5);
  });
});
