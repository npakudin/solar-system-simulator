import { add, multiply, cross, normalize, normalizeOrFallback, len } from "./vec3.js";
import { G, DAY, DEG2RAD, TWO_PI } from "./constants.js";

const EARTH_MASS_KG = 5.972e24;
const EARTH_RADIUS_M = 6371000;
const DEFAULT_ALTITUDE_M = 414000;
const DEFAULT_INCLINATION_RAD = 51.6 * DEG2RAD;
const MAX_TLE_AGE_DAYS = 14;
export const ECLIPTIC_NORTH_POLE = normalize({ x: 0, y: -0.3978, z: 0.9175 });

export const ISS_TLES = [
  {
    epoch: "2026-04-30T12:00:00Z",
    line1: "1 25544U 98067A   26120.50000000  .00016717  00000-0  10270-3 0  9001",
    line2: "2 25544  51.6461 339.7939 0002234  43.0609 317.0704 15.48919811999999"
  },
  {
    epoch: "2020-01-29T13:08:59Z",
    line1: "1 25544U 98067A   20029.54791435  .00000733  00000-0  20523-4 0  9993",
    line2: "2 25544  51.6436  23.4372 0007417  52.9004  50.6505 15.49147136210616"
  }
];

export function createIssState(options = {}) {
  const date = parseDateTime(options.dateTime || new Date());
  const earthState = options.earthState || {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 }
  };
  const northPole = normalizeOrFallback(options.northPole || ECLIPTIC_NORTH_POLE, { x: 0, y: 0, z: 1 });
  const tle = selectNearestTle(date, options.maxTleAgeDays ?? MAX_TLE_AGE_DAYS);

  if (tle && options.satelliteLib) {
    const sgp4State = sgp4IssState(date, earthState, northPole, tle, options.satelliteLib);
    if (sgp4State) {
      return { ...sgp4State, source: "sgp4", tle };
    }
  }

  return {
    ...syntheticIssState(date, earthState, northPole),
    source: "synthetic",
    tle: tle || null
  };
}

export function syntheticIssState(dateTime, earthState, northPole = ECLIPTIC_NORTH_POLE) {
  const date = parseDateTime(dateTime);
  const basis = earthEquatorialBasis(northPole);
  const radius = EARTH_RADIUS_M + DEFAULT_ALTITUDE_M;
  const speed = Math.sqrt(G * EARTH_MASS_KG / radius);
  const meanMotion = speed / radius;
  const jd = julianDate(date);
  const days = jd - 2451545.0;
  const raan = wrapRadians((40 + days * -4.8) * DEG2RAD);
  const phase = wrapRadians(days * meanMotion * DAY + 1.25);

  const cosRaan = Math.cos(raan);
  const sinRaan = Math.sin(raan);
  const cosInc = Math.cos(DEFAULT_INCLINATION_RAD);
  const sinInc = Math.sin(DEFAULT_INCLINATION_RAD);
  const xAxis = add(multiply(basis.eq1, cosRaan), multiply(basis.eq2, sinRaan));
  const yAxis = add(
    add(multiply(basis.eq1, -sinRaan * cosInc), multiply(basis.eq2, cosRaan * cosInc)),
    multiply(basis.pole, sinInc)
  );
  const relativePosition = add(multiply(xAxis, radius * Math.cos(phase)), multiply(yAxis, radius * Math.sin(phase)));
  const relativeVelocity = add(multiply(xAxis, -speed * Math.sin(phase)), multiply(yAxis, speed * Math.cos(phase)));

  return {
    position: add(earthState.position, relativePosition),
    velocity: add(earthState.velocity, relativeVelocity),
    relativePosition,
    relativeVelocity
  };
}

export function selectNearestTle(dateTime, maxAgeDays = MAX_TLE_AGE_DAYS) {
  const date = parseDateTime(dateTime);
  let best = null;
  let bestAgeDays = Infinity;

  for (const tle of ISS_TLES) {
    const ageDays = Math.abs(parseDateTime(tle.epoch).getTime() - date.getTime()) / 86400000;
    if (ageDays < bestAgeDays) {
      best = tle;
      bestAgeDays = ageDays;
    }
  }

  return best && bestAgeDays <= maxAgeDays ? best : null;
}

export function orbitalInclinationDeg(relativePosition, relativeVelocity, northPole = ECLIPTIC_NORTH_POLE) {
  const h = normalizeOrFallback(cross(relativePosition, relativeVelocity), { x: 0, y: 0, z: 1 });
  const cosInc = clamp(dot(h, normalizeOrFallback(northPole, { x: 0, y: 0, z: 1 })), -1, 1);
  return Math.acos(cosInc) / DEG2RAD;
}

function sgp4IssState(date, earthState, northPole, tle, satelliteLib) {
  if (!satelliteLib.twoline2satrec || !satelliteLib.propagate) {
    return null;
  }

  const satrec = satelliteLib.twoline2satrec(tle.line1, tle.line2);
  const posVel = satelliteLib.propagate(satrec, date);
  if (!posVel || !posVel.position || !posVel.velocity) {
    return null;
  }

  const basis = earthEquatorialBasis(northPole);
  const relativePosition = fromEquatorialCoordinates({
    x: posVel.position.x * 1000,
    y: posVel.position.y * 1000,
    z: posVel.position.z * 1000
  }, basis);
  const relativeVelocity = fromEquatorialCoordinates({
    x: posVel.velocity.x * 1000,
    y: posVel.velocity.y * 1000,
    z: posVel.velocity.z * 1000
  }, basis);

  return {
    position: add(earthState.position, relativePosition),
    velocity: add(earthState.velocity, relativeVelocity),
    relativePosition,
    relativeVelocity
  };
}

function earthEquatorialBasis(northPole) {
  const pole = normalizeOrFallback(northPole, { x: 0, y: 0, z: 1 });
  const helper = Math.abs(pole.x) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const eq1 = normalizeOrFallback(cross(cross(pole, helper), pole), { x: 1, y: 0, z: 0 });
  return {
    eq1,
    eq2: normalizeOrFallback(cross(pole, eq1), { x: 0, y: 1, z: 0 }),
    pole
  };
}

function fromEquatorialCoordinates(vector, basis) {
  return add(
    add(multiply(basis.eq1, vector.x), multiply(basis.eq2, vector.y)),
    multiply(basis.pole, vector.z)
  );
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapRadians(value) {
  const wrapped = value % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

export function altitudeAboveEarth(relativePosition) {
  return len(relativePosition) - EARTH_RADIUS_M;
}

function parseDateTime(dateTime) {
  if (dateTime === "now") {
    return new Date();
  }

  if (dateTime instanceof Date) {
    if (Number.isNaN(dateTime.getTime())) {
      throw new Error("Invalid ISS orbit date");
    }
    return dateTime;
  }

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISS orbit date: ${dateTime}`);
  }
  return date;
}

function julianDate(dateTime = new Date()) {
  const date = parseDateTime(dateTime);
  return date.getTime() / 86400000 + 2440587.5;
}
