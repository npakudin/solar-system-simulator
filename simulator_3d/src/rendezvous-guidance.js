import { add, subtract, multiply, normalizeOrFallback, distance, len } from "./vec3.js";

const DEFAULT_TERMINAL_START_M = 25000;
const DEFAULT_DOCK_DISTANCE_M = 0.1;
const DEFAULT_DOCK_SPEED_MPS = 0.1;
const DEFAULT_CAPTURE_DISTANCE_M = 1;
const DEFAULT_MAX_ACCEL_MPS2 = 0.08;
const DEFAULT_RESERVE_FUEL_KG = 1000;

export function updateRendezvousGuidance(state, bodies, dt) {
  const config = state && state.mission && state.mission.rendezvous;
  if (!config || state.attachedToPad || !state.rocket) {
    return null;
  }

  const target = bodies.find((body) => body.name === config.targetBody);
  if (!target) {
    return null;
  }

  const rocket = state.rocket;
  const status = relativeStatus(rocket, target, config);

  if (state.rendezvous && state.rendezvous.phase === "docked") {
    lockToDockingPoint(state, target);
    return { ...status, phase: "docked" };
  }

  const firstGuidanceTime = config.startAfterMissionTimeSeconds ?? lastProgramThrustEnd(state.mission);
  if (state.missionTime < firstGuidanceTime) {
    state.rendezvous = { phase: "ascent", distance: status.distance, relativeSpeed: status.relativeSpeed };
    return state.rendezvous;
  }

  if (status.distance <= (config.dockDistanceM || DEFAULT_DOCK_DISTANCE_M) &&
      status.relativeSpeed <= (config.dockSpeedMps || DEFAULT_DOCK_SPEED_MPS)) {
    state.rendezvous = { phase: "docked", distance: status.distance, relativeSpeed: status.relativeSpeed };
    lockToDockingPoint(state, target);
    return state.rendezvous;
  }

  const transferCaptureDistance = config.transferCaptureDistanceM || 0;
  if (!state.rendezvousTransferCaptured &&
      transferCaptureDistance > 0 &&
      status.distance <= transferCaptureDistance) {
    enterTerminalCorridor(state, target, config);
    const capturedStatus = relativeStatus(rocket, target, config);
    const dockDistance = config.dockDistanceM || DEFAULT_DOCK_DISTANCE_M;
    const dockSpeed = config.dockSpeedMps || DEFAULT_DOCK_SPEED_MPS;
    if (capturedStatus.distance <= dockDistance && capturedStatus.relativeSpeed <= dockSpeed) {
      state.rendezvous = { phase: "docked", distance: capturedStatus.distance, relativeSpeed: capturedStatus.relativeSpeed };
      lockToDockingPoint(state, target);
      return state.rendezvous;
    }
    state.rendezvous = { phase: "terminal", distance: capturedStatus.distance, relativeSpeed: capturedStatus.relativeSpeed };
    return state.rendezvous;
  }

  if (status.distance <= (config.captureDistanceM || DEFAULT_CAPTURE_DISTANCE_M) &&
      status.relativeSpeed <= Math.max(config.dockSpeedMps || DEFAULT_DOCK_SPEED_MPS, 0.15)) {
    matchTargetVelocity(rocket, target);
    state.rendezvous = { phase: "capture", distance: status.distance, relativeSpeed: status.relativeSpeed };
    return state.rendezvous;
  }

  const phase = guidancePhase(status.distance, config);
  const acceleration = guidanceAcceleration(status, config, phase);
  applyGuidanceAcceleration(state, rocket, acceleration, dt, config);
  state.rendezvous = { phase, distance: status.distance, relativeSpeed: status.relativeSpeed };
  return state.rendezvous;
}

export function relativeStatus(rocket, target, config = {}) {
  const relativePosition = subtract(target.position, rocket.position);
  const relativeVelocity = subtract(target.velocity, rocket.velocity);
  return {
    relativePosition,
    relativeVelocity,
    distance: len(relativePosition),
    relativeSpeed: len(relativeVelocity),
    terminalStartDistanceM: config.terminalStartDistanceM || DEFAULT_TERMINAL_START_M
  };
}

export function rendezvousCommandName(rendezvous) {
  if (!rendezvous) {
    return null;
  }

  if (rendezvous.phase === "ascent") return "Launching";
  if (rendezvous.phase === "phasing") return "Phasing orbit";
  if (rendezvous.phase === "transfer") return "Transfer to ISS orbit";
  if (rendezvous.phase === "terminal") return "Final approach";
  if (rendezvous.phase === "capture") return "Matching ISS velocity";
  if (rendezvous.phase === "docked") return "Docked";
  return null;
}

function guidancePhase(distanceM, config) {
  const terminalStart = config.terminalStartDistanceM || DEFAULT_TERMINAL_START_M;
  if (distanceM <= terminalStart) return "terminal";
  if (distanceM <= 250000) return "transfer";
  return "phasing";
}

function guidanceAcceleration(status, config, phase) {
  const distanceM = status.distance;
  const closingSpeed = desiredClosingSpeed(distanceM, phase);
  const targetRelativeVelocity = multiply(normalizeOrFallback(status.relativePosition, { x: 1, y: 0, z: 0 }), closingSpeed);
  const tau = phase === "terminal" ? 8 : 60;
  const desiredAcceleration = multiply(subtract(targetRelativeVelocity, status.relativeVelocity), 1 / tau);
  return clampMagnitude(desiredAcceleration, config.maxGuidanceAccelerationMps2 || DEFAULT_MAX_ACCEL_MPS2);
}

function desiredClosingSpeed(distanceM, phase) {
  if (distanceM > 250000) return 180;
  if (distanceM > 25000) return 60;
  if (distanceM > 5000) return 8;
  if (distanceM > 500) return 2;
  if (distanceM > 50) return 0.3;
  if (distanceM > 1) return 0.08;
  return 0;
}

function applyGuidanceAcceleration(state, rocket, acceleration, dt, config) {
  const accel = len(acceleration);
  if (accel <= 0 || dt <= 0) {
    rocket.engineOn = false;
    return;
  }

  const reserveFuel = config.reserveFuelKg ?? DEFAULT_RESERVE_FUEL_KG;
  const usableFuel = Math.max(0, rocket.fuelMass - reserveFuel);
  if (usableFuel <= 0) {
    rocket.engineOn = false;
    return;
  }

  const vehicle = state.mission.vehicle;
  const mass = rocket.dryMass + rocket.fuelMass;
  const requiredFuel = mass * accel * dt / vehicle.exhaustVelocityMps;
  const fuel = Math.min(usableFuel, requiredFuel);
  const scale = requiredFuel > 0 ? fuel / requiredFuel : 0;

  rocket.velocity.x += acceleration.x * dt * scale;
  rocket.velocity.y += acceleration.y * dt * scale;
  rocket.velocity.z += acceleration.z * dt * scale;
  rocket.fuelMass -= fuel;
  rocket.mass = rocket.dryMass + rocket.fuelMass;
  rocket.engineOn = fuel > 0;
}

function lockToDockingPoint(state, target) {
  const offset = state.rendezvousDockingOffset || { x: 0, y: 0, z: 0 };
  state.rocket.position = add(target.position, offset);
  matchTargetVelocity(state.rocket, target);
  state.rocket.engineOn = false;
}

function matchTargetVelocity(rocket, target) {
  rocket.velocity = { ...target.velocity };
}

function enterTerminalCorridor(state, target, config) {
  const rocket = state.rocket;
  const terminalDistance = config.transferCaptureCorridorDistanceM ||
    config.terminalStartDistanceM ||
    DEFAULT_TERMINAL_START_M;
  const direction = normalizeOrFallback(subtract(rocket.position, target.position), { x: 1, y: 0, z: 0 });
  const closingSpeed = terminalDistance <= 1 ? 0 : Math.min(8, desiredClosingSpeed(terminalDistance, "terminal"));
  rocket.position = add(target.position, multiply(direction, terminalDistance));
  rocket.velocity = add(target.velocity, multiply(direction, -closingSpeed));
  const fuelCost = config.transferCaptureFuelKg || 500;
  rocket.fuelMass = Math.max(config.reserveFuelKg ?? DEFAULT_RESERVE_FUEL_KG, rocket.fuelMass - fuelCost);
  rocket.mass = rocket.dryMass + rocket.fuelMass;
  state.rendezvousTransferCaptured = true;
}

function lastProgramThrustEnd(mission) {
  let end = 0;
  for (const command of mission.program || []) {
    if ((command.throttle || 0) > 0) {
      end = Math.max(end, command.end || 0);
    }
  }
  return end;
}

function clampMagnitude(vector, maxLength) {
  const length = len(vector);
  if (length <= maxLength || length === 0) {
    return vector;
  }
  return multiply(vector, maxLength / length);
}
