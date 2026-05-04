import { formatClosingSpeed, formatTargetDistance } from "../src/time-format.js";

describe("target readout formatting", () => {
  test("uses meters for close target distances", () => {
    expect(formatTargetDistance(0)).toBe("0 m");
    expect(formatTargetDistance(999.4)).toBe("999 m");
    expect(formatTargetDistance(1000)).toBe("1 km");
  });

  test("uses meters per second for close approach speeds", () => {
    expect(formatClosingSpeed(0)).toBe("+0.0 m/s");
    expect(formatClosingSpeed(12.34)).toBe("+12.3 m/s");
    expect(formatClosingSpeed(-4.56)).toBe("-4.6 m/s");
    expect(formatClosingSpeed(1000)).toBe("+1.00 km/s");
  });
});
