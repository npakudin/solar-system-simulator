export const baseVehicle = {
    dryMassKg: 12000,
    fuelMassKg: 180000,
    radiusMeters: 2.2e6,
    exhaustVelocityMps: 3400,
    maxMassFlowKgPerSec: 650
  };

export const heavyVehicle = {
    ...baseVehicle,
    dryMassKg: 20000,
    fuelMassKg: 260000,
    exhaustVelocityMps: 7000,
    maxMassFlowKgPerSec: 1200
  };
