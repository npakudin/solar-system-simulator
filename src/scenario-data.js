(function () {
  const bodyCatalog = {
    Sun: {
      color: "#ffc247",
      mass: 1.989e30,
      radius: 6.9634e8,
      displayScale: 12,
      axialTiltDeg: 7.25,
      rotationPeriodHours: 609.12,
      texturePath: "sim-assets/textures/solar-system-scope/sun.jpg"
    },
    Mercury: {
      color: "#b7a79a",
      mass: 3.3011e23,
      radius: 2.4397e6,
      displayScale: 1800,
      axialTiltDeg: 0.034,
      rotationPeriodHours: 1407.6,
      texturePath: "sim-assets/textures/solar-system-scope/mercury.jpg"
    },
    Venus: {
      color: "#d8c18a",
      mass: 4.8675e24,
      radius: 6.0518e6,
      displayScale: 950,
      axialTiltDeg: 177.36,
      rotationPeriodHours: -5832.5,
      texturePath: "sim-assets/textures/solar-system-scope/venus_surface.jpg"
    },
    Earth: {
      color: "#4f9cff",
      mass: 5.972e24,
      radius: 6.371e6,
      displayScale: 900,
      axialTiltDeg: 23.44,
      rotationPeriodHours: 23.9344696,
      texturePath: "sim-assets/textures/solar-system-scope/earth_daymap.jpg",
      ellipsoid: {
        equatorialRadiusM: 6378137,
        polarRadiusM: 6356752.314245,
        flattening: 1 / 298.257223563
      }
    },
    Moon: {
      color: "#b8bcc7",
      mass: 7.347673092e22,
      radius: 1.7374e6,
      displayScale: 1200,
      axialTiltDeg: 6.68,
      rotationPeriodHours: 655.7,
      texturePath: "sim-assets/textures/solar-system-scope/moon.jpg"
    },
    Mars: {
      color: "#c56d4f",
      mass: 6.4171e23,
      radius: 3.3895e6,
      displayScale: 1300,
      axialTiltDeg: 25.19,
      rotationPeriodHours: 24.6,
      texturePath: "sim-assets/textures/solar-system-scope/mars.jpg"
    },
    Jupiter: {
      color: "#d8a35d",
      mass: 1.8986e27,
      radius: 6.9911e7,
      displayScale: 200,
      axialTiltDeg: 3.13,
      rotationPeriodHours: 9.9,
      texturePath: "sim-assets/textures/solar-system-scope/jupiter.jpg"
    },
    Saturn: {
      color: "#d7bd82",
      mass: 5.6834e26,
      radius: 5.8232e7,
      displayScale: 200,
      axialTiltDeg: 26.73,
      rotationPeriodHours: 10.7,
      texturePath: "sim-assets/textures/solar-system-scope/saturn.jpg",
      rings: {
        innerRadiusM: 6.69e7,
        outerRadiusM: 1.39826e8,
        texturePath: "sim-assets/textures/solar-system-scope/saturn_ring_alpha.png"
      }
    },
    Uranus: {
      color: "#8fd3df",
      mass: 8.681e25,
      radius: 2.5362e7,
      displayScale: 260,
      axialTiltDeg: 97.77,
      rotationPeriodHours: -17.2,
      texturePath: "sim-assets/textures/solar-system-scope/uranus.jpg"
    },
    Neptune: {
      color: "#5c8dff",
      mass: 1.02413e26,
      radius: 2.4622e7,
      displayScale: 260,
      axialTiltDeg: 28.32,
      rotationPeriodHours: 16.1,
      texturePath: "sim-assets/textures/solar-system-scope/neptune.jpg"
    }
  };

  const real20260501Bodies = [
    {
      name: "Sun",
      positionKm: [-332816.2034775745, -753780.965769488, -308058.8033718319],
      velocityKmS: [0.01178997261234482, 0.002259112972783861, 0.0007148041935189578]
    },
    {
      name: "Mercury",
      positionKm: [53249860.66055881, -13507309.01800729, -12674272.62636359],
      velocityKmS: [4.975752957417446, 43.29425441019247, 22.61300902368923]
    },
    {
      name: "Venus",
      positionKm: [-34472434.52593641, 91408420.71130878, 43322212.80748413],
      velocityKmS: [-33.31440167979373, -11.08683410339325, -2.88066071516034]
    },
    {
      name: "Earth",
      positionKm: [-115303588.1221946, -90149015.21680424, -39058177.14352452],
      velocityKmS: [18.78105325476009, -20.9418215085781, -9.077597332868253]
    },
    {
      name: "Moon",
      positionKm: [-115641601.5211506, -90332402.73099622, -39169333.58682307],
      velocityKmS: [19.28376656366025, -21.69907933560962, -9.461543385000832]
    },
    {
      name: "Mars",
      positionKm: [207541867.0262742, -3068942.707823334, -6976595.939199345],
      velocityKmS: [1.498644064783976, 23.92218747004688, 10.93213629436779]
    },
    {
      name: "Jupiter",
      positionKm: [-379135675.1409218, 628995444.4692538, 278840357.6552655],
      velocityKmS: [-11.60068020503878, -5.330827005949991, -2.002542796271329]
    },
    {
      name: "Saturn",
      positionKm: [1410114413.531751, 149392212.9680628, 970010.4437848706],
      velocityKmS: [-1.468715711250244, 8.845751237935009, 3.716361137204334]
    },
    {
      name: "Uranus",
      positionKm: [1415812926.293712, 2337788614.549699, 1003862322.710469],
      velocityKmS: [-6.001151197893395, 2.71170379652304, 1.272496299088548]
    },
    {
      name: "Neptune",
      positionKm: [4466649796.470223, 164501369.7093467, -43872569.65846012],
      velocityKmS: [-0.1982435699795591, 5.05736665658193, 2.075671671595769]
    }
  ];

  const scenarios = [
    {
      id: "jupiter-gravity-assist-handcrafted",
      label: "Jupiter assist tuned",
      description: "Current hand-tuned Sun/Earth/Jupiter setup. Keeps the visible gravity-assist flight intact.",
      initialState: {
        type: "circular",
        stopMassCenter: true,
        bodies: [
          { name: "Sun", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Earth", orbitRadius: 1.496e11, speed: 2.978e4, phase: 0, inclination: 0 },
          { name: "Jupiter", orbitRadius: 7.7857e11, speed: 1.307e4, phase: -1.85, inclination: 0 }
        ]
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 9.75e3,
        radialDeltaV: -0.3e3,
        outOfPlaneDeltaV: 0
      },
      referenceOrbits: [
        { radius: 1.496e11, color: "#203f76", inclination: 0 },
        { radius: 7.7857e11, color: "#5f4631", inclination: 0 }
      ],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, minBodyRadius: 0.45, markers: true },
      camera: { position: [0, 85, 155], target: [0, 0, 0], maxDistance: 1200 },
      ui: { cameraTarget: "rocket", timeScale: 80 }
    },
    {
      id: "real-2026-05-01-full",
      label: "Real 2026-05-01 full",
      description: "NASA/JPL Horizons state vectors for Sun, planets, and Moon at 2026-05-01 00:00 TDB.",
      initialState: {
        type: "vectors",
        units: { position: "km", velocity: "km/s" },
        epoch: "2026-05-01T00:00:00 TDB",
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 9.75e3,
        radialDeltaV: -0.3e3,
        outOfPlaneDeltaV: 0
      },
      referenceOrbits: [
        { radius: 1.496e11, color: "#203f76", inclination: 0 },
        { radius: 7.7857e11, color: "#5f4631", inclination: 1.304 }
      ],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 40 }
    },
    {
      id: "real-2026-05-01-sun-earth-jupiter",
      label: "Real Sun-Earth-Jupiter",
      description: "Real 2026-05-01 positions, filtered to Sun, Earth, Moon, Jupiter, and rocket launch.",
      initialState: {
        type: "vectors",
        units: { position: "km", velocity: "km/s" },
        epoch: "2026-05-01T00:00:00 TDB",
        includeBodies: ["Sun", "Earth", "Moon", "Jupiter"],
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 9.75e3,
        radialDeltaV: -0.3e3,
        outOfPlaneDeltaV: 0
      },
      referenceOrbits: [
        { radius: 1.496e11, color: "#203f76", inclination: 0 },
        { radius: 7.7857e11, color: "#5f4631", inclination: 1.304 }
      ],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 60 }
    },
    {
      id: "toy-earth-rocket",
      label: "Toy Earth + rocket",
      description: "Earth-centered sandbox for launch experiments without solar gravity.",
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] }
        ]
      },
      rocket: {
        mode: "localOrbitKick",
        altitudeEarthRadii: 1.08,
        tangentialDeltaV: 7.85e3,
        radialDeltaV: 0
      },
      referenceOrbits: [
        { radius: 6.371e6 * 1.08, color: "#315e9f", inclination: 0 }
      ],
      stepSeconds: 1,
      view: { metersToUnits: 1.0e-6, radiusScale: 1.0e-6, useDisplayScale: false, minBodyRadius: 0.08, markers: false },
      camera: { position: [0, 16, 30], target: [0, 0, 0], maxDistance: 80 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "toy-earth-moon-rocket",
      label: "Toy Earth-Moon + rocket",
      description: "Earth-centered Moon sandbox with a circular Moon approximation.",
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] }
        ]
      },
      rocket: {
        mode: "localOrbitKick",
        altitudeEarthRadii: 1.08,
        tangentialDeltaV: 7.85e3,
        radialDeltaV: 0
      },
      referenceOrbits: [
        { radius: 6.371e6 * 1.08, color: "#315e9f", inclination: 0 },
        { radius: 384400000, color: "#4b5566", inclination: 0 }
      ],
      stepSeconds: 1,
      view: { metersToUnits: 5.0e-7, radiusScale: 5.0e-7, useDisplayScale: false, minBodyRadius: 0.12, markers: false },
      camera: { position: [0, 10, 22], target: [0, 0, 0], maxDistance: 260 },
      ui: { cameraTarget: "earth", timeScale: 200 }
    }
  ];

  window.SolarScenarioData = {
    bodyCatalog,
    defaultScenarioId: "toy-earth-moon-rocket",
    scenarios
  };
})();
