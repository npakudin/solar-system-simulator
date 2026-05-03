/**
 * Event-driven diagnostic trace for Soyuz → ISS mission.
 * Run with:  npm run test:diagnostic
 */

import { loadSimulator, relativeSpeed } from './harness.js';

const SCENARIO     = 'soyuz-iss-baikonur';
const SITE         = 'baikonur';
const PROFILE      = 'soyuz-iss';
const GM           = 6.67408e-11 * 5.972e24;
const END_TIME     = 6*3600;
const STEP_REQUEST = 0.01;
const HEARTBEAT_S  = 1000;

function radialVelocity(body, anchor) {
  const dx = body.position.x - anchor.position.x;
  const dy = body.position.y - anchor.position.y;
  const dz = body.position.z - anchor.position.z;
  const r  = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (r === 0) return 0;
  const dvx = body.velocity.x - anchor.velocity.x;
  const dvy = body.velocity.y - anchor.velocity.y;
  const dvz = body.velocity.z - anchor.velocity.z;
  return (dvx*dx + dvy*dy + dvz*dz) / r;
}

const HDR =
  'E      t(s)       alt(km) v_tan  v_rad v/circ fuel(kg)  ISS(km) relV(m/s) incl  event';

function buildLine(tag, bodies, ms, sim) {
  const earth  = bodies.find(b => b.name === 'Earth');
  const rocket = bodies.find(b => b.name === 'Rocket');
  const iss    = bodies.find(b => b.name === 'ISS');

  const r_e    = sim.SolarPhysics.distance(rocket.position, earth.position);
  const alt    = (r_e - earth.radius) / 1000;
  const v_abs  = sim.SolarPhysics.speed(rocket);
  const v_circ = Math.sqrt(GM / r_e);
  const v_rad  = radialVelocity(rocket, earth);
  const v_tan  = Math.sqrt(Math.max(0, v_abs*v_abs - v_rad*v_rad));

  const r_iss  = sim.SolarPhysics.distance(rocket.position, iss.position) / 1000;
  const rv_iss = relativeSpeed(rocket, iss);

  const fuel_kg  = rocket.fuelMass;
  const status   = sim.RocketSim.missionStatus(ms, bodies);
  const incl     = (status.inclinationDeg || 0).toFixed(1);
  const eng      = rocket.engineOn ? 'E' : ' ';

  const t = ms.missionTime.toFixed(3);
  return (
    `${eng}` +
    `  ${String(t).padStart(10)}` +
    `  ${String(alt.toFixed(6)).padStart(10)}` +
    `  ${String(v_tan.toFixed(0)).padStart(5)}` +
    `  ${String(v_rad.toFixed(0)).padStart(5)}` +
    `  ${(v_abs/v_circ).toFixed(6)}` +
    `  ${String(fuel_kg.toFixed(0)).padStart(8)}` +
    `  ${String(r_iss.toFixed(6)).padStart(7)}` +
    `  ${String(rv_iss.toFixed(6)).padStart(8)}` +
    `  ${incl.padStart(4)}°` +
    `  ${tag}`
  );
}

/**
 * Compute launch window (seconds to wait) from ISS orbital plane and Baikonur position.
 * Matches the algorithm in computeLaunchWindowSeconds() in app-classic.js,
 * but uses the initial ISS body state instead of SGP4 (no satellite.js in tests).
 * In the soyuz-iss-baikonur scenario the physics frame IS the inertial frame at t=0,
 * so no GMST rotation is needed.
 */
function computeLaunchWindow(bodies, site) {
  const iss = bodies.find(b => b.name === 'ISS');
  if (!iss) return 0;

  // Orbital angular momentum = r × v
  const { x: rx, y: ry, z: rz } = iss.position;
  const { x: vx, y: vy, z: vz } = iss.velocity;
  const hx = ry*vz - rz*vy;
  const hy = rz*vx - rx*vz;
  const hz = rx*vy - ry*vx;
  const hMag = Math.sqrt(hx*hx + hy*hy + hz*hz);
  if (hMag === 0) return 0;
  const nx = hx/hMag, ny = hy/hMag, nz = hz/hMag;

  const omega    = 7.2921150e-5; // rad/s sidereal
  const latRad   = site.latDeg * Math.PI / 180;
  const lonRad   = site.lonDeg * Math.PI / 180; // gmst0=0 in physics frame
  const T_sid    = 2 * Math.PI / omega;

  const A = nx * Math.cos(latRad);
  const B = ny * Math.cos(latRad);
  const C = nz * Math.sin(latRad);
  const R = Math.sqrt(A*A + B*B);
  if (R < 1e-10) return 0;
  const cosArg = -C / R;
  if (Math.abs(cosArg) > 1) return 0;

  const alpha = Math.acos(cosArg);
  const phi   = Math.atan2(B, A);

  function nextPositiveT(theta) {
    const t = (theta - lonRad) / omega;
    const n = ((t % T_sid) + T_sid) % T_sid;
    return n < 60 ? n + T_sid : n;
  }

  const t1 = nextPositiveT(phi + alpha);
  const t2 = nextPositiveT(phi - alpha);
  return Math.min(t1, t2);
}

test('mission trace — immediate launch (earthRotationOffset=0)', () => {
  const sim    = loadSimulator();
  const bodies = sim.SolarPhysics.createInitialBodies(SCENARIO);
  const mission = sim.RocketSim.missionForScenario(SCENARIO, SITE, PROFILE);
  const ms     = sim.RocketSim.createMissionState(mission, bodies, 0);

  _runTrace(sim, bodies, ms, 'earthRotationOffset=0');
});

test('mission trace — with pre-launch Earth rotation wait', () => {
  const sim    = loadSimulator();
  const bodies = sim.SolarPhysics.createInitialBodies(SCENARIO);
  const mission = sim.RocketSim.missionForScenario(SCENARIO, SITE, PROFILE);

  const site = mission.launchSite;
  const launchWindowSeconds = computeLaunchWindow(bodies, site);
  console.log(`\nComputed launch window: ${launchWindowSeconds.toFixed(0)} s ` +
    `(${(launchWindowSeconds/3600).toFixed(2)} h)`);

  // Advance physics for launchWindowSeconds before creating the rocket
  const PRE_STEP = 100;
  let preLaunchTime = 0;
  while (preLaunchTime < launchWindowSeconds) {
    const dt = Math.min(PRE_STEP, launchWindowSeconds - preLaunchTime);
    sim.SolarPhysics.stepSimulation(bodies, dt);
    preLaunchTime += dt;
  }

  const ms = sim.RocketSim.createMissionState(mission, bodies, launchWindowSeconds);
  _runTrace(sim, bodies, ms,
    `earthRotationOffset=${launchWindowSeconds.toFixed(0)}s`);
});

function _runTrace(sim, bodies, ms, label) {
  const earth  = bodies.find(b => b.name === 'Earth');
  const rocket = bodies.find(b => b.name === 'Rocket');

  let prevEngineOn = false;
  let prevVRad     = 0;
  let lastHeartbeat = 0;

  const lines = [];
  lines.push(`\nSoyuz→ISS [${label}]  E=engine on  v_rad>0=climbing  v_rad<0=falling  v/circ≈1=circular`);
  lines.push(HDR);
  lines.push('─'.repeat(HDR.length));
  lines.push(buildLine('init', bodies, ms, sim));

  while (ms.missionTime < END_TIME) {
    const remaining = END_TIME - ms.missionTime;
    const dt = Math.min(
      sim.RocketSim.chooseStepSeconds(ms, bodies, STEP_REQUEST),
      remaining
    );

    sim.RocketSim.updateRocketBeforePhysics(ms, bodies, dt, null);
    sim.SolarPhysics.stepSimulation(bodies, dt);
    sim.RocketSim.updateRocketAfterPhysics(ms, bodies, dt, null);

    const r    = sim.SolarPhysics.distance(rocket.position, earth.position);
    const alt  = (r - earth.radius) / 1000;
    const vRad = radialVelocity(rocket, earth);
    const engOn = rocket.engineOn;

    if (r < earth.radius - 50000) {
      lines.push(buildLine('*** CRASHED ***', bodies, ms, sim));
      break;
    }

    let tag = null;
    if (engOn && !prevEngineOn)           tag = 'engine ON';
    if (!engOn && prevEngineOn)           tag = 'engine OFF';
    if (prevVRad > 0 && vRad < 0)        tag = 'APOGEE';
    if (prevVRad < 0 && vRad > 0 && alt > 10) tag = 'PERIGEE';
    if (!tag && ms.missionTime - lastHeartbeat >= HEARTBEAT_S) tag = 'heartbeat';

    if (tag) {
      lines.push(buildLine(tag, bodies, ms, sim));
      if (!engOn && prevEngineOn) {
        const rk = bodies.find(b => b.name === 'Rocket');
        lines.push(`  POS  [${rk.position.x.toFixed(0)}, ${rk.position.y.toFixed(0)}, ${rk.position.z.toFixed(0)}]`);
        lines.push(`  VEL  [${rk.velocity.x.toFixed(3)}, ${rk.velocity.y.toFixed(3)}, ${rk.velocity.z.toFixed(3)}]`);
      }
      lastHeartbeat = ms.missionTime;
    }

    prevEngineOn = engOn;
    prevVRad     = vRad;
  }

  if (ms.missionTime >= END_TIME) {
    lines.push(buildLine('end of program', bodies, ms, sim));
  }

  console.log(lines.join('\n'));
  expect(true).toBe(true);
}
