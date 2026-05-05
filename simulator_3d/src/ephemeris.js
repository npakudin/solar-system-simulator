import { add, subtract, multiply, len } from "./vec3.js";
import { DAY, DEG2RAD, TWO_PI } from "./constants.js";
import { createIssState, ECLIPTIC_NORTH_POLE } from "./iss-orbit.js";

const AU_M = 149597870700;
const J2000_JD = 2451545.0;
const DEFAULT_BODIES = ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

// Low-precision J2000 elements with linear rates per Julian century. This is
// meant for a believable visual simulator, not navigation-grade ephemerides.
const PLANET_ELEMENTS = {
  Mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], wBar: [77.45779628, 0.16047689], omega: [48.33076593, -0.12534081] },
  Venus: { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], i: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], wBar: [131.60246718, 0.00268329], omega: [76.67984255, -0.27769418] },
  Earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], wBar: [102.93768193, 0.32327364], omega: [0, 0] },
  Mars: { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], i: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], wBar: [-23.94362959, 0.44441088], omega: [49.55953891, -0.29257343] },
  Jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], i: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], wBar: [14.72847983, 0.21252668], omega: [100.47390909, 0.20469106] },
  Saturn: { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], i: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], wBar: [92.59887831, -0.41897216], omega: [113.66242448, -0.28867794] },
  Uranus: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], i: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], wBar: [170.95427630, 0.40805281], omega: [74.01692503, 0.04240589] },
  Neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], i: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], wBar: [44.96476227, -0.32241464], omega: [131.78422574, -0.00508664] },
  Pluto: { a: [39.48211675, -0.00031596], e: [0.24882730, 0.00005170], i: [17.14001206, 0.00004818], L: [238.92903833, 145.20780515], wBar: [224.06891629, -0.04062942], omega: [110.30393684, -0.01183482] }
};

const MOON = {
  semiMajorAxisM: 384400000,
  eccentricity: 0.0549,
  inclinationRad: 5.145 * DEG2RAD,
  periodDays: 27.321661,
  meanLongitudeDeg: 218.316,
  meanLongitudeRateDegPerDay: 13.176396,
  perigeeDeg: 83.353,
  perigeeRateDegPerDay: 0.111404,
  nodeDeg: 125.045,
  nodeRateDegPerDay: -0.0529538
};

export function julianDate(dateTime = new Date()) {
  const date = parseDateTime(dateTime);
  return date.getTime() / 86400000 + 2440587.5;
}

export function createEphemerisBodyStates(options = {}) {
  const dateTime = options.dateTime || new Date();
  const includeBodies = options.includeBodies || DEFAULT_BODIES;
  const included = new Set(includeBodies);
  const jd = julianDate(dateTime);
  const states = [];

  if (included.has("Sun")) {
    states.push({
      name: "Sun",
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 }
    });
  }

  const earth = planetState("Earth", jd);

  for (const name of includeBodies) {
    if (name === "Sun" || name === "Moon" || !PLANET_ELEMENTS[name]) {
      continue;
    }
    states.push({ name, ...planetState(name, jd) });
  }

  if (included.has("Moon")) {
    const moon = moonState(jd, earth);
    states.push({ name: "Moon", ...moon });
  }

  if (included.has("ISS")) {
    const iss = createIssState({
      dateTime,
      earthState: earth,
      northPole: ECLIPTIC_NORTH_POLE,
      satelliteLib: options.satelliteLib,
      maxTleAgeDays: options.maxTleAgeDays
    });
    states.push({ name: "ISS", position: iss.position, velocity: iss.velocity, source: iss.source });
  }

  return states;
}

export function planetState(name, jd) {
  const position = planetPosition(name, jd);
  const dt = 60;
  const velocity = multiply(
    subtract(planetPosition(name, jd + dt / DAY), planetPosition(name, jd - dt / DAY)),
    1 / (2 * dt)
  );
  return { position, velocity };
}

export function moonState(jd, earthState = planetState("Earth", jd)) {
  const relativePosition = moonRelativePosition(jd);
  const dt = 60;
  const relativeVelocity = multiply(
    subtract(moonRelativePosition(jd + dt / DAY), moonRelativePosition(jd - dt / DAY)),
    1 / (2 * dt)
  );

  return {
    position: add(earthState.position, relativePosition),
    velocity: add(earthState.velocity, relativeVelocity)
  };
}

export function parseDateTime(dateTime) {
  if (dateTime === "now") {
    return new Date();
  }

  if (dateTime instanceof Date) {
    if (Number.isNaN(dateTime.getTime())) {
      throw new Error("Invalid ephemeris date");
    }
    return dateTime;
  }

  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ephemeris date: ${dateTime}`);
  }
  return date;
}

function planetPosition(name, jd) {
  const T = (jd - J2000_JD) / 36525;
  const el = PLANET_ELEMENTS[name];
  if (!el) {
    throw new Error(`Missing ephemeris elements for ${name}`);
  }

  const a = valueAt(el.a, T) * AU_M;
  const e = valueAt(el.e, T);
  const i = valueAt(el.i, T) * DEG2RAD;
  const L = wrapRadians(valueAt(el.L, T) * DEG2RAD);
  const wBar = wrapRadians(valueAt(el.wBar, T) * DEG2RAD);
  const omega = wrapRadians(valueAt(el.omega, T) * DEG2RAD);
  const M = wrapRadians(L - wBar);
  const argPeriapsis = wBar - omega;
  const E = solveKepler(M, e);
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);

  return rotateFromOrbitalPlane(xPrime, yPrime, omega, i, argPeriapsis);
}

function moonRelativePosition(jd) {
  const days = jd - J2000_JD;
  const meanLongitude = wrapRadians((MOON.meanLongitudeDeg + MOON.meanLongitudeRateDegPerDay * days) * DEG2RAD);
  const perigee = wrapRadians((MOON.perigeeDeg + MOON.perigeeRateDegPerDay * days) * DEG2RAD);
  const node = wrapRadians((MOON.nodeDeg + MOON.nodeRateDegPerDay * days) * DEG2RAD);
  const M = wrapRadians(meanLongitude - perigee);
  const E = solveKepler(M, MOON.eccentricity);
  const xPrime = MOON.semiMajorAxisM * (Math.cos(E) - MOON.eccentricity);
  const yPrime = MOON.semiMajorAxisM * Math.sqrt(1 - MOON.eccentricity * MOON.eccentricity) * Math.sin(E);
  return rotateFromOrbitalPlane(xPrime, yPrime, node, MOON.inclinationRad, perigee - node);
}

function rotateFromOrbitalPlane(xPrime, yPrime, omega, inclination, argPeriapsis) {
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosW = Math.cos(argPeriapsis);
  const sinW = Math.sin(argPeriapsis);

  return {
    x: (cosOmega * cosW - sinOmega * sinW * cosI) * xPrime +
       (-cosOmega * sinW - sinOmega * cosW * cosI) * yPrime,
    y: (sinOmega * cosW + cosOmega * sinW * cosI) * xPrime +
       (-sinOmega * sinW + cosOmega * cosW * cosI) * yPrime,
    z: (sinW * sinI) * xPrime + (cosW * sinI) * yPrime
  };
}

function solveKepler(meanAnomaly, eccentricity) {
  let E = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 12; i += 1) {
    const f = E - eccentricity * Math.sin(E) - meanAnomaly;
    const fp = 1 - eccentricity * Math.cos(E);
    E -= f / fp;
  }
  return E;
}

function valueAt(pair, T) {
  return pair[0] + pair[1] * T;
}

function wrapRadians(value) {
  const wrapped = value % TWO_PI;
  return wrapped < 0 ? wrapped + TWO_PI : wrapped;
}

export function distanceFromSun(state) {
  return len(state.position);
}
