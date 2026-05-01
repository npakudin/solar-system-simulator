import { add, subtract, multiply, cross, normalize, normalizeOrFallback } from './vec3.js';
import { DEG2RAD } from './constants.js';

export function attitudeDirection(state, bodies, command) {
  const earth = bodies.find(b => b.name === "Earth");
  const rocket = state.rocket;
  if (!earth || !rocket) {
    return { x: 1, y: 0, z: 0 };
  }

  const up = normalize(subtract(rocket.position, earth.position));
  const attitude = command.attitude || { mode: "surface-up" };

  if (attitude.mode === "prograde") {
    return normalizeOrFallback(subtract(rocket.velocity, earth.velocity), up);
  }

  if (attitude.mode === "retrograde") {
    return normalizeOrFallback(multiply(subtract(rocket.velocity, earth.velocity), -1), up);
  }

  if (attitude.mode === "target-body") {
    const target = bodies.find(b => b.name === attitude.target);
    if (target) {
      const leadSeconds = attitude.leadSeconds || 0;
      const targetPosition = add(target.position, multiply(target.velocity, leadSeconds));
      return normalizeOrFallback(subtract(targetPosition, rocket.position), up);
    }
  }

  if (attitude.mode === "pitch-program") {
    const spinAxis = (state.mission.earth && state.mission.earth.northPole) || { x: 0, y: 0, z: 1 };
    return pitchDirection(up, attitude.headingDeg || 90, pitchAt(attitude, state.missionTime), spinAxis);
  }

  if (attitude.mode === "rtn") {
    // RTN (LVLH): R=radial-out, T=tangential(prograde), N=normal(out of plane)
    const relVel = subtract(rocket.velocity, earth.velocity);
    const T = normalizeOrFallback(relVel, { x: 0, y: 1, z: 0 });
    const N = normalizeOrFallback(cross(up, T), { x: 0, y: 0, z: 1 });
    const r = attitude.r || 0;
    const t = attitude.t || 0;
    const n = attitude.n || 0;
    return normalizeOrFallback(
      add(add(multiply(up, r), multiply(T, t)), multiply(N, n)),
      up
    );
  }

  return up;
}

function pitchAt(attitude, missionTime) {
  const points = attitude.points || [];
  if (points.length === 0) {
    return attitude.pitchDeg || 90;
  }

  if (missionTime <= points[0].t) {
    return points[0].pitchDeg;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (missionTime >= a.t && missionTime <= b.t) {
      const mix = (missionTime - a.t) / (b.t - a.t);
      return a.pitchDeg + (b.pitchDeg - a.pitchDeg) * mix;
    }
  }

  return points[points.length - 1].pitchDeg;
}

function pitchDirection(up, headingDeg, pitchDeg, spinAxis) {
  spinAxis = spinAxis || { x: 0, y: 0, z: 1 };
  const east = normalizeOrFallback(cross(spinAxis, up), { x: 0, y: 1, z: 0 });
  const north = normalizeOrFallback(cross(up, east), { x: 0, y: 0, z: 1 });
  const heading = headingDeg * DEG2RAD;
  const horizontal = normalize(add(
    multiply(north, Math.cos(heading)),
    multiply(east, Math.sin(heading))
  ));
  const pitch = pitchDeg * DEG2RAD;
  return normalize(add(
    multiply(up, Math.sin(pitch)),
    multiply(horizontal, Math.cos(pitch))
  ));
}
