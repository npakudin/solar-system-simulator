import { cross, dot, normalizeOrFallback } from "./vec3.js";
import { DEG2RAD, TWO_PI } from "./constants.js";

export function computeLaunchWindowFromState(position, velocity, site, mission = {}, options = {}) {
  if (!position || !velocity || !site) {
    return 0;
  }

  const normal = normalizeOrFallback(cross(position, velocity), { x: 0, y: 0, z: 1 });
  const earth = mission.earth || {};
  const northPole = normalizeOrFallback(earth.northPole || options.northPole || { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 });
  const basis = equatorialBasis(northPole);
  const omega = TWO_PI / (earth.rotationPeriodSeconds || options.rotationPeriodSeconds || 86164.0905);
  const lat = site.latDeg * DEG2RAD;
  const lon0 = site.lonDeg * DEG2RAD + (options.lonOffsetRad || 0);
  const cosLat = Math.cos(lat);

  const A = dot(normal, basis.eq1) * cosLat;
  const B = dot(normal, basis.eq2) * cosLat;
  const C = dot(normal, basis.pole) * Math.sin(lat);
  const R = Math.sqrt(A * A + B * B);

  if (R < 1e-12) {
    return 0;
  }

  const cosArg = -C / R;
  if (Math.abs(cosArg) > 1) {
    return 0;
  }

  const alpha = Math.acos(cosArg);
  const phi = Math.atan2(B, A);
  const siderealPeriod = TWO_PI / omega;
  const minLeadSeconds = options.minLeadSeconds ?? 60;

  function nextPositiveTime(theta) {
    const raw = (theta - lon0) / omega;
    const wrapped = ((raw % siderealPeriod) + siderealPeriod) % siderealPeriod;
    return wrapped < minLeadSeconds ? wrapped + siderealPeriod : wrapped;
  }

  return Math.min(nextPositiveTime(phi + alpha), nextPositiveTime(phi - alpha));
}

export function computeLaunchWindowForBodies(bodies, site, mission = {}, targetName = "ISS") {
  const earth = bodies && bodies.find((body) => body.name === "Earth");
  const target = bodies && bodies.find((body) => body.name === targetName);
  if (!earth || !target) {
    return 0;
  }

  return computeLaunchWindowFromState(
    {
      x: target.position.x - earth.position.x,
      y: target.position.y - earth.position.y,
      z: target.position.z - earth.position.z
    },
    {
      x: target.velocity.x - earth.velocity.x,
      y: target.velocity.y - earth.velocity.y,
      z: target.velocity.z - earth.velocity.z
    },
    site,
    mission
  );
}

function equatorialBasis(pole) {
  const helper = Math.abs(pole.x) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const eq1 = normalizeOrFallback(cross(cross(pole, helper), pole), { x: 1, y: 0, z: 0 });
  return {
    eq1,
    eq2: normalizeOrFallback(cross(pole, eq1), { x: 0, y: 1, z: 0 }),
    pole
  };
}

