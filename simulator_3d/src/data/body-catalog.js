export const bodyCatalog = {
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
      texturePath: "sim-assets/textures/nasa/earth_blue_marble_8192.jpg",
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
    Io: {
      color: "#d6b257",
      mass: 8.931938e22,
      radius: 1.8216e6,
      displayScale: 650,
      axialTiltDeg: 0.05,
      rotationPeriodHours: 42.46,
      texturePath: "sim-assets/textures/moons/io.png",
      isSatellite: true,
      kinematicOrbit: { parent: "Jupiter", radiusM: 4.217e8, periodDays: 1.769, inclinationDeg: 0.04, phaseDeg: 20 }
    },
    Europa: {
      color: "#bfc2ba",
      mass: 4.799844e22,
      radius: 1.5608e6,
      displayScale: 700,
      axialTiltDeg: 0.1,
      rotationPeriodHours: 85.23,
      texturePath: "sim-assets/textures/moons/europa.png",
      isSatellite: true,
      kinematicOrbit: { parent: "Jupiter", radiusM: 6.711e8, periodDays: 3.551, inclinationDeg: 0.47, phaseDeg: 105 }
    },
    Ganymede: {
      color: "#9b9082",
      mass: 1.4819e23,
      radius: 2.6341e6,
      displayScale: 520,
      axialTiltDeg: 0.2,
      rotationPeriodHours: 171.7,
      texturePath: "sim-assets/textures/moons/ganymede.png",
      isSatellite: true,
      kinematicOrbit: { parent: "Jupiter", radiusM: 1.0704e9, periodDays: 7.155, inclinationDeg: 0.2, phaseDeg: 190 }
    },
    Callisto: {
      color: "#8a8176",
      mass: 1.075938e23,
      radius: 2.4103e6,
      displayScale: 520,
      axialTiltDeg: 0.4,
      rotationPeriodHours: 400.5,
      texturePath: "sim-assets/textures/moons/callisto.png",
      isSatellite: true,
      kinematicOrbit: { parent: "Jupiter", radiusM: 1.8827e9, periodDays: 16.689, inclinationDeg: 0.19, phaseDeg: 285 }
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
    Phobos: {
      color: "#8b7a6f",
      mass: 1.06e16,
      radius: 1.11e4,
      displayScale: 100000,
      axialTiltDeg: 1.08,
      rotationPeriodHours: 0.31891 * 24,
      texturePath: "sim-assets/textures/nasa/mars_phobos.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Mars", radiusM: 9.378e6, periodDays: 0.31891, inclinationDeg: 1.08, phaseDeg: 35 }
    },
    Deimos: {
      color: "#8a7d72",
      mass: 2.4e15,
      radius: 6.2e3,
      displayScale: 140000,
      axialTiltDeg: 1.79,
      rotationPeriodHours: 1.26244 * 24,
      texturePath: "sim-assets/textures/nasa/mars_deimos.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Mars", radiusM: 2.3459e7, periodDays: 1.26244, inclinationDeg: 1.79, phaseDeg: 145 }
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
    Titan: {
      color: "#c28b49",
      mass: 1.3452e23,
      radius: 2.5747e6,
      displayScale: 560,
      axialTiltDeg: 0.3,
      rotationPeriodHours: 382.7,
      texturePath: "sim-assets/textures/moons/titan.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Saturn", radiusM: 1.22187e9, periodDays: 15.945, inclinationDeg: 0.35, phaseDeg: 65 }
    },
    Rhea: {
      color: "#b8b4aa",
      mass: 2.3065e21,
      radius: 7.638e5,
      displayScale: 1100,
      axialTiltDeg: 0.1,
      rotationPeriodHours: 108.4,
      texturePath: "sim-assets/textures/moons/rhea.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Saturn", radiusM: 5.27108e8, periodDays: 4.518, inclinationDeg: 0.35, phaseDeg: 145 }
    },
    Iapetus: {
      color: "#8f857b",
      mass: 1.8056e21,
      radius: 7.345e5,
      displayScale: 1100,
      axialTiltDeg: 0.1,
      rotationPeriodHours: 1903.7,
      texturePath: "sim-assets/textures/moons/iapetus.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Saturn", radiusM: 3.56082e9, periodDays: 79.322, inclinationDeg: 15.47, phaseDeg: 250 }
    },
    Dione: {
      color: "#c7c2b8",
      mass: 1.0955e21,
      radius: 5.614e5,
      displayScale: 1250,
      axialTiltDeg: 0.1,
      rotationPeriodHours: 65.7,
      texturePath: "sim-assets/textures/moons/dione.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Saturn", radiusM: 3.77396e8, periodDays: 2.737, inclinationDeg: 0.02, phaseDeg: 320 }
    },
    Enceladus: {
      color: "#d8dce0",
      mass: 1.08022e20,
      radius: 2.521e5,
      displayScale: 1900,
      axialTiltDeg: 0.1,
      rotationPeriodHours: 32.9,
      texturePath: "sim-assets/textures/moons/enceladus.jpg",
      isSatellite: true,
      kinematicOrbit: { parent: "Saturn", radiusM: 2.38042e8, periodDays: 1.37, inclinationDeg: 0.01, phaseDeg: 30 }
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
    },
    Pluto: {
      color: "#c9a87a",
      mass: 1.307e22,
      radius: 1.1883e6,
      displayScale: 3000,
      axialTiltDeg: 122.53,
      rotationPeriodHours: -153.293,
      texturePath: "sim-assets/textures/nasa/pluto.jpg"
    },
    ISS: {
      color: "#00ffff",
      mass: 420000,
      radius: 50,
      displayScale: 80000,
      isSatellite: true,
      axialTiltDeg: 0,
      rotationPeriodHours: 1.54
    }
  };
