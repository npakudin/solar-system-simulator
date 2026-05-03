import { bodyCatalog } from "./data/body-catalog.js";
import { real20260501Bodies } from "./data/horizons-2026-05-01.js";

  const scenarios = [
    {
      id: "jupiter-gravity-assist-handcrafted",
      label: "Jupiter assist tuned",
      description: "Current hand-tuned Sun/Earth/Jupiter setup. Keeps the visible gravity-assist flight intact.",
      flybyTargets: ["Jupiter"],
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
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.45, markers: true },
      camera: { position: [0, 85, 155], target: [0, 0, 0], maxDistance: 1200 },
      ui: { cameraTarget: "rocket", timeScale: 80 }
    },
    {
      id: "real-2026-05-01-full",
      label: "Real 2026-05-01 full",
      description: "NASA/JPL Horizons state vectors for Sun, planets, and Moon at 2026-05-01 00:00 TDB.",
      flybyTargets: ["Jupiter"],
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
      referenceOrbits: [],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 40 }
    },
    {
      id: "real-2026-05-01-sun-earth-jupiter",
      label: "Real Sun-Earth-Jupiter",
      description: "Real 2026-05-01 positions, filtered to Sun, Earth, Moon, Jupiter, and rocket launch.",
      flybyTargets: ["Jupiter"],
      initialState: {
        type: "vectors",
        units: { position: "km", velocity: "km/s" },
        epoch: "2026-05-01T00:00:00 TDB",
        includeBodies: ["Sun", "Earth", "Moon", "Jupiter", "ISS"],
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 9.75e3,
        radialDeltaV: -0.3e3,
        outOfPlaneDeltaV: 0
      },
      referenceOrbits: [],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 60 }
    },
    {
      id: "toy-earth-rocket",
      label: "Toy Earth + rocket",
      description: "Earth-centered sandbox for launch experiments without solar gravity.",
      flybyTargets: ["ISS"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "ISS", position: [6781000, 0, 0], velocity: [0, 7660, 0] }
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
      flybyTargets: ["Moon"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] },
          { name: "ISS", position: [6781000, 0, 0], velocity: [0, 7660, 0] }
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
    },
    {
      id: "soyuz-iss-baikonur",
      label: "Soyuz → ISS (Baikonur)",
      description: "Full 7-maneuver Soyuz scheme for docking with ISS",
      flybyTargets: ["ISS"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] },
          // ISS at 408 km, 51.6° inclined orbit (same plane as Soyuz), ~100 km ahead at t≈3215
          { name: "ISS", position: [2837000, 4119000, 4578000], velocity: [-6919, 1480, 2956] }
        ]
      },
      stepSeconds: 2,
      view: { metersToUnits: 1.4e-7, radiusScale: 1.4e-7, minBodyRadius: 0.05, markers: false },
      camera: { position: [0, 10, 20], target: [0, 0, 0], maxDistance: 60 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "crew-dragon-iss-ksc",
      label: "Crew Dragon → ISS (KSC)",
      description: "Full Crew Dragon scheme for docking with ISS",
      flybyTargets: ["ISS"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] },
          { name: "ISS", position: [6791000, 0, 0], velocity: [0, 7661, 0] }
        ]
      },
      stepSeconds: 2,
      view: { metersToUnits: 1.4e-7, radiusScale: 1.4e-7, minBodyRadius: 0.05, markers: false },
      camera: { position: [0, 10, 20], target: [0, 0, 0], maxDistance: 60 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "lunar-orbit-mission",
      label: "Lunar orbit insertion",
      description: "Transfer to the Moon and lunar orbit insertion.",
      flybyTargets: ["Moon"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] }
        ]
      },
      stepSeconds: 30,
      view: { metersToUnits: 5.0e-7, radiusScale: 5.0e-7, useDisplayScale: false, minBodyRadius: 0.12, markers: false },
      camera: { position: [0, 40, 90], target: [0, 0, 0], maxDistance: 400 },
      ui: { cameraTarget: "earth", timeScale: 200 }
    },
    {
      id: "artemis-2-free-return",
      label: "Artemis II — Moon flyby (2026)",
      description: "Lunar flyby on the Artemis II free-return trajectory.",
      flybyTargets: ["Moon"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] }
        ]
      },
      stepSeconds: 60,
      view: { metersToUnits: 5.0e-7, radiusScale: 5.0e-7, useDisplayScale: false, minBodyRadius: 0.12, markers: false },
      camera: { position: [0, 40, 90], target: [0, 0, 0], maxDistance: 400 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "lunar-landing-mission",
      label: "Lunar landing",
      description: "Full lunar landing scheme: TLI, LOI, DOI, and PDI.",
      flybyTargets: ["Moon"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] }
        ]
      },
      stepSeconds: 10,
      view: { metersToUnits: 5.0e-7, radiusScale: 5.0e-7, useDisplayScale: false, minBodyRadius: 0.12, markers: false },
      camera: { position: [0, 40, 90], target: [0, 0, 0], maxDistance: 400 },
      ui: { cameraTarget: "earth", timeScale: 200 }
    },
    {
      id: "vostok-1",
      label: "Vostok 1 — Gagarin (1961)",
      description: "One orbit around Earth and a deorbit burn to return.",
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] }
        ]
      },
      stepSeconds: 2,
      view: { metersToUnits: 1.4e-7, radiusScale: 1.4e-7, minBodyRadius: 0.05, markers: false },
      camera: { position: [0, 10, 20], target: [0, 0, 0], maxDistance: 60 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "apollo-11",
      label: "Apollo 11 — lunar landing (1969)",
      description: "Full Apollo 11 mission: TLI, LOI, DOI, PDI, ascent, and TEI.",
      flybyTargets: ["Moon"],
      initialState: {
        type: "absolute",
        bodies: [
          { name: "Earth", position: [0, 0, 0], velocity: [0, 0, 0] },
          { name: "Moon", position: [384400000, 0, 0], velocity: [0, 1022, 0] }
        ]
      },
      stepSeconds: 20,
      view: { metersToUnits: 5.0e-7, radiusScale: 5.0e-7, useDisplayScale: false, minBodyRadius: 0.12, markers: false },
      camera: { position: [0, 40, 90], target: [0, 0, 0], maxDistance: 400 },
      ui: { cameraTarget: "earth", timeScale: 200 }
    },
    {
      id: "jupiter-earth-return",
      label: "Jupiter gravity assist → return to Earth",
      description: "Launch to Jupiter, gravity assist maneuver, and return to Earth.",
      flybyTargets: ["Jupiter", "Earth"],
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
        progradeDeltaV: 8069,
        radialDeltaV: -1500,
        outOfPlaneDeltaV: 0
      },
      referenceOrbits: [],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 60 }
    },
    {
      id: "voyager-2-grand-tour",
      label: "Voyager 2 — grand tour (1977)",
      description: "Grand tour of the outer planets: Jupiter, Saturn, Uranus, Neptune.",
      flybyTargets: ["Jupiter", "Saturn", "Uranus", "Neptune"],
      initialState: {
        type: "vectors",
        units: { position: "km", velocity: "km/s" },
        epoch: "2026-05-01T00:00:00 TDB",
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 8793,
        radialDeltaV: 0,
        outOfPlaneDeltaV: 800
      },
      referenceOrbits: [],
      stepSeconds: 86400,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 40 }
    }
  ];

  // --- Mission configuration ---

  const earth = {
    rotationPeriodSeconds: bodyCatalog.Earth.rotationPeriodHours * 3600,
    ellipsoid: bodyCatalog.Earth.ellipsoid
  };

  const launchSites = [
    {
      id: "baikonur",
      name: "Baikonur",
      latDeg: 45.965,
      lonDeg: 63.305,
      altitudeM: 90,
      defaultHeadingDeg: 63.5,
      notes: "Good for 51.6 deg ISS-style inclinations."
    },
    {
      id: "cape-canaveral",
      name: "Cape Canaveral",
      latDeg: 28.3922,
      lonDeg: -80.6077,
      altitudeM: 3,
      defaultHeadingDeg: 72,
      notes: "Good for low and medium inclination launches."
    },
    {
      id: "kourou",
      name: "Kourou",
      latDeg: 5.1597,
      lonDeg: -52.6503,
      altitudeM: 10,
      defaultHeadingDeg: 90,
      notes: "Near-equatorial, efficient for GEO."
    },
    {
      id: "vandenberg",
      name: "Vandenberg",
      latDeg: 34.742,
      lonDeg: -120.5724,
      altitudeM: 120,
      defaultHeadingDeg: 180,
      notes: "Polar and sun-synchronous style launches."
    },
    {
      id: "plesetsk",
      name: "Plesetsk",
      latDeg: 62.9256,
      lonDeg: 40.5778,
      altitudeM: 130,
      defaultHeadingDeg: 180,
      notes: "High-latitude polar launches."
    },
    {
      id: "tanegashima",
      name: "Tanegashima",
      latDeg: 30.375,
      lonDeg: 130.9606,
      altitudeM: 40,
      defaultHeadingDeg: 95,
      notes: "Eastward ocean launches."
    },
    {
      id: "equator",
      name: "Equator demo",
      latDeg: 0,
      lonDeg: 0,
      altitudeM: 0,
      defaultHeadingDeg: 90,
      notes: "Idealized equatorial launch pad."
    }
  ];

  const baseVehicle = {
    dryMassKg: 12000,
    fuelMassKg: 180000,
    radiusMeters: 2.2e6,
    exhaustVelocityMps: 3400,
    maxMassFlowKgPerSec: 650
  };

  const heavyVehicle = {
    ...baseVehicle,
    dryMassKg: 20000,
    fuelMassKg: 260000,
    exhaustVelocityMps: 7000,
    maxMassFlowKgPerSec: 1200
  };

  const targetProfiles = [
    {
      id: "starlink-leo",
      label: "LEO internet 550 km",
      scenarioIds: ["toy-earth-rocket", "toy-earth-moon-rocket"],
      targetOrbit: { altitudeKm: 550, inclinationDeg: 53 },
      vehicle: { ...baseVehicle },
      programTemplate: "leo",
      headingMode: "inclination",
      timeScale: 1
    },
    {
      id: "iss",
      label: "ISS 420 km",
      scenarioIds: ["toy-earth-rocket", "toy-earth-moon-rocket"],
      targetOrbit: { altitudeKm: 420, inclinationDeg: 51.6 },
      vehicle: { ...baseVehicle },
      programTemplate: "leo",
      headingMode: "inclination",
      timeScale: 1
    },
    {
      id: "polar-700",
      label: "Polar 700 km",
      scenarioIds: ["toy-earth-rocket", "toy-earth-moon-rocket"],
      targetOrbit: { altitudeKm: 700, inclinationDeg: 90 },
      vehicle: { ...baseVehicle, fuelMassKg: 210000 },
      programTemplate: "leo",
      headingDeg: 180,
      timeScale: 1
    },
    {
      id: "sso-demo",
      label: "SSO-ish 700 km",
      scenarioIds: ["toy-earth-rocket", "toy-earth-moon-rocket"],
      targetOrbit: { altitudeKm: 700, inclinationDeg: 97.6 },
      vehicle: { ...baseVehicle, fuelMassKg: 220000 },
      programTemplate: "leo",
      headingDeg: 190,
      timeScale: 1
    },
    {
      id: "geo-demo",
      label: "GEO demo",
      scenarioIds: ["toy-earth-rocket", "toy-earth-moon-rocket"],
      targetOrbit: { altitudeKm: 35786, inclinationDeg: 0 },
      vehicle: { ...heavyVehicle, fuelMassKg: 340000 },
      programTemplate: "geo",
      headingMode: "equatorial",
      timeScale: 1
    },
    {
      id: "moon-demo",
      label: "Moon flyby",
      scenarioIds: ["toy-earth-moon-rocket"],
      targetOrbit: { name: "Moon flyby", inclinationDeg: 51.6 },
      vehicle: { ...heavyVehicle },
      programTemplate: "moon",
      headingMode: "inclination",
      timeScale: 1
    },
    {
      id: "jupiter-demo",
      label: "Jupiter assist note",
      scenarioIds: ["jupiter-gravity-assist-handcrafted", "real-2026-05-01-sun-earth-jupiter", "real-2026-05-01-full"],
      targetOrbit: { name: "Jupiter assist", inclinationDeg: 0 },
      vehicle: { ...heavyVehicle, fuelMassKg: 420000 },
      programTemplate: "interplanetary-note",
      headingMode: "east",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 1
    },
    {
      id: "soyuz-iss",
      label: "Soyuz → ISS 420km",
      scenarioIds: ["soyuz-iss-baikonur"],
      targetOrbit: { name: "ISS 420km", inclinationDeg: 51.6 },
      vehicle: { ...baseVehicle, dryMassKg: 7000, fuelMassKg: 180000, maxMassFlowKgPerSec: 900 },
      programTemplate: "soyuz-iss",
      headingDeg: 63.33,
      defaultLaunchSiteId: "baikonur",
      preLaunchWindow: true,
      timeScale: 1
    },
    {
      id: "crew-dragon-iss",
      label: "Crew Dragon → ISS 420km",
      scenarioIds: ["crew-dragon-iss-ksc"],
      targetOrbit: { name: "ISS 420km", inclinationDeg: 51.6 },
      vehicle: { ...baseVehicle, dryMassKg: 12000, fuelMassKg: 480000, exhaustVelocityMps: 3500, maxMassFlowKgPerSec: 1200 },
      programTemplate: "crew-dragon-iss",
      headingDeg: 44.98,
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 1
    },
    {
      id: "lunar-orbit",
      label: "Lunar orbit insertion",
      scenarioIds: ["lunar-orbit-mission"],
      targetOrbit: { name: "Lunar orbit 100km", inclinationDeg: 51.6 },
      vehicle: { ...heavyVehicle },
      programTemplate: "lunar-orbit",
      headingMode: "inclination",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 0.1
    },
    {
      id: "artemis-2",
      label: "Artemis II free return",
      scenarioIds: ["artemis-2-free-return"],
      targetOrbit: { name: "Artemis II free return", inclinationDeg: 51.6 },
      vehicle: { ...heavyVehicle, fuelMassKg: 420000 },
      programTemplate: "artemis-2",
      headingMode: "inclination",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 0.1
    },
    {
      id: "lunar-landing",
      label: "Lunar landing",
      scenarioIds: ["lunar-landing-mission"],
      targetOrbit: { name: "Lunar surface", inclinationDeg: 51.6 },
      vehicle: { ...heavyVehicle, fuelMassKg: 480000 },
      programTemplate: "lunar-landing",
      headingMode: "inclination",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 0.1
    },
    {
      id: "vostok-1",
      label: "Vostok 1 — Gagarin",
      scenarioIds: ["vostok-1"],
      targetOrbit: { name: "Vostok 1 orbit", inclinationDeg: 64.95 },
      vehicle: { ...baseVehicle, dryMassKg: 4700, fuelMassKg: 180000, exhaustVelocityMps: 3100, maxMassFlowKgPerSec: 600 },
      programTemplate: "vostok-1",
      headingDeg: 43,
      defaultLaunchSiteId: "baikonur",
      timeScale: 1
    },
    {
      id: "apollo-11",
      label: "Apollo 11",
      scenarioIds: ["apollo-11"],
      targetOrbit: { name: "Moon surface (Sea of Tranquility)", inclinationDeg: 51.6 },
      vehicle: { ...heavyVehicle, fuelMassKg: 480000 },
      programTemplate: "apollo-11",
      headingMode: "inclination",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 0.1
    },
    {
      id: "jupiter-return",
      label: "Jupiter gravity assist → Earth return",
      scenarioIds: ["jupiter-earth-return"],
      targetOrbit: { name: "Jupiter flyby return", inclinationDeg: 0 },
      vehicle: { ...heavyVehicle, fuelMassKg: 420000 },
      programTemplate: "interplanetary-note",
      headingMode: "east",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 1
    },
    {
      id: "voyager-2",
      label: "Voyager 2 grand tour",
      scenarioIds: ["voyager-2-grand-tour"],
      targetOrbit: { name: "Outer planets grand tour", inclinationDeg: 0 },
      vehicle: { ...heavyVehicle, fuelMassKg: 420000 },
      programTemplate: "interplanetary-note",
      headingMode: "east",
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 1
    }
  ];

  // Earth's north pole in the J2000 ecliptic frame used by real heliocentric scenarios.
  // ecliptic lon=270°, ecliptic lat=66.56° (= 90° - 23.44° obliquity)
  const ECLIPTIC_NORTH_POLE = { x: 0, y: -0.3978, z: 0.9175 };

  function buildMission({ scenarioId, launchSiteId, targetProfileId }) {
    const profile = targetProfiles.find((item) => {
      return item.id === targetProfileId && item.scenarioIds.includes(scenarioId);
    }) || firstProfileForScenario(scenarioId);

    const preferredSiteId = (profile && profile.defaultLaunchSiteId) || launchSiteId;
    const site = launchSites.find((item) => item.id === preferredSiteId) || launchSites[0];

    if (!site || !profile) {
      return null;
    }

    const headingDeg = resolveHeading(site, profile);
    const vehicle = { ...profile.vehicle };
    const isLunarMission = ["lunar-orbit", "artemis-2", "lunar-landing", "apollo-11"].includes(profile.programTemplate);
    const isInterplanetary = profile.programTemplate === "interplanetary-note";

    const scenario = scenarios.find((s) => s.id === scenarioId);
    const isEclipticFrame = scenario && scenario.initialState && scenario.initialState.type === "vectors";
    const missionEarth = isEclipticFrame ? { ...earth, northPole: ECLIPTIC_NORTH_POLE } : earth;

    return {
      id: `${site.id}-${profile.id}`,
      label: `${site.name} -> ${profile.label}`,
      scenarioIds: profile.scenarioIds,
      launchSite: { ...site },
      earth: missionEarth,
      vehicle,
      launchTimeScale: profile.timeScale || 1,
      preLaunchWindow: profile.preLaunchWindow || false,
      targetOrbit: { ...profile.targetOrbit },
      program: buildProgram(profile, headingDeg),
      timestep: {
        thrustSeconds: 0.5,
        preBurnLookaheadSeconds: isLunarMission ? 90 : 30,
        preBurnSeconds: 1,
        nearEarthSeconds: 2,
        orbitSeconds: isLunarMission ? 20 : 10,
        farSeconds: isInterplanetary ? 3600 : (isLunarMission ? 300 : 60),
        closeBodySeconds: isLunarMission ? 15 : 10,
        flybySeconds: isLunarMission ? 120 : 45
      },
      metadata: {
        launchSite: site.name,
        target: profile.label,
        headingDeg,
        notes: site.notes
      }
    };
  }

  function firstProfileForScenario(scenarioId) {
    return targetProfiles.find((profile) => profile.scenarioIds.includes(scenarioId)) || null;
  }

  function resolveHeading(site, profile) {
    if (Number.isFinite(profile.headingDeg)) {
      return profile.headingDeg;
    }

    if (profile.headingMode === "equatorial") {
      return 90;
    }

    if (profile.headingMode === "east") {
      return site.defaultHeadingDeg || 90;
    }

    const inclination = profile.targetOrbit && profile.targetOrbit.inclinationDeg;
    if (!Number.isFinite(inclination)) {
      return site.defaultHeadingDeg || 90;
    }

    if (inclination >= 88) {
      return 180;
    }

    const lat = Math.abs(site.latDeg);
    if (inclination < lat) {
      return site.defaultHeadingDeg || 90;
    }

    const sinAz = Math.cos(inclination * Math.PI / 180) / Math.cos(site.latDeg * Math.PI / 180);
    return Math.asin(Math.max(-1, Math.min(1, sinAz))) * 180 / Math.PI;
  }

  function buildProgram(profile, headingDeg) {
    if (profile.programTemplate === "moon") {
      return [
        { name: "liftoff: engine 0-80s", start: 0, end: 80, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "moon injection: engine 80-300s", start: 80, end: 300, throttle: 0.45, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 1", start: 300, end: 62000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 1: engine 62000-62120s", start: 62000, end: 62120, throttle: 0.04, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 2", start: 62120, end: 145000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 2: engine 145000-145080s", start: 145000, end: 145080, throttle: 0.03, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to Moon — final approach", start: 145080, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "LOI burn — enter lunar capture orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LLO (<=2R Moon): engine 434311-434380s", start: 434311, end: 434380, throttle: 0.12, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 434380, end: 450000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "geo") {
      return [
        { name: "vertical climb: engine 0-40s", start: 0, end: 40, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "parking orbit: engine 40-360s", start: 40, end: 360, throttle: 0.95, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 40, pitchDeg: 86 },
          { t: 120, pitchDeg: 58 },
          { t: 240, pitchDeg: 20 },
          { t: 360, pitchDeg: 0 }
        ] } },
        { name: "coast to apogee raise", start: 360, end: 1800, throttle: 0, attitude: { mode: "prograde" } },
        { name: "GTO burn: engine 1800-2200s", start: 1800, end: 2200, throttle: 0.38, attitude: { mode: "prograde" } },
        { name: "circularization demo: engine 18000-18300s", start: 18000, end: 18300, throttle: 0.18, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "interplanetary-note") {
      return [
        { name: "launch to parking orbit: engine 0-420s", start: 0, end: 420, throttle: 0.85, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 0, pitchDeg: 90 },
          { t: 120, pitchDeg: 55 },
          { t: 260, pitchDeg: 12 },
          { t: 420, pitchDeg: 0 }
        ] } },
        { name: "interplanetary injection: engine 2400-2900s", start: 2400, end: 2900, throttle: 0.35, attitude: { mode: "prograde" } },
        { name: "mid-course correction: engine 86400-86700s", start: 86400, end: 86700, throttle: 0.02, attitude: { mode: "target-body", target: "Jupiter", leadSeconds: 7.2e7 } }
      ];
    }

    if (profile.programTemplate === "soyuz-iss" || profile.programTemplate === "crew-dragon-iss") {
      return [
        { name: "vertical climb: engine 0-12s", start: 0, end: 12, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 12-170s", start: 12, end: 170, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 12,  pitchDeg: 87 },
          { t: 40,  pitchDeg: 70 },
          { t: 80,  pitchDeg: 42 },
          { t: 130, pitchDeg: 13 },
          { t: 170, pitchDeg: 0  }
        ] } },
        { name: "coast to natural apogee (~175km)", start: 170, end: 315, throttle: 0, attitude: { mode: "prograde" } },
        { name: "injection at apogee: raise to 408km", start: 315, end: 338, throttle: 0.9834, attitude: { mode: "prograde" } },
        { name: "coast to 408km apogee", start: 338, end: 3194, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize at 408km apogee: raise perigee", start: 3194, end: 3215, throttle: 0.0148, attitude: { mode: "prograde" } },
        { name: "coast in orbit", start: 3194, end: 6*3600, throttle: 0, attitude: { mode: "prograde" } },
      ];
    }

    function leoAscent(headingDeg) {
      return [
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 38 },
          { t: 280, pitchDeg: 4 }
        ] } },
        { name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LEO: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
      ];
    }

    function tliCoast() {
      return [
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast to Moon — 5 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
      ];
    }

    function loiApproach() {
      return [
        { name: "LOI burn — enter lunar orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
      ];
    }

    if (profile.programTemplate === "lunar-orbit") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "circularize LLO: engine 434311-434380s", start: 434311, end: 434380, throttle: 0.12, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 434380, end: 450000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "artemis-2") {
      return [
        ...leoAscent(headingDeg),
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast — free return trajectory", start: 620, end: 431220, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "MCC-1 correction: engine 431220-431225s", start: 431220, end: 431225, throttle: 0.1, attitude: { mode: "prograde" } },
        { name: "coast — return to Earth", start: 431225, end: 864000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "lunar-landing") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "DOI — lower perilune: engine 434311-434330s", start: 434311, end: 434330, throttle: 0.1, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 434330, end: 437722, throttle: 0, attitude: { mode: "prograde" } },
        { name: "PDI — powered descent: engine 437722-437900s", start: 437722, end: 437900, throttle: 0.9, attitude: { mode: "retrograde" } }
      ];
    }

    if (profile.programTemplate === "vostok-1") {
      return [
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-295s", start: 28, end: 295, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 42 },
          { t: 295, pitchDeg: 5 }
        ] } },
        { name: "coast to circularization", start: 295, end: 350, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize: engine 350-420s", start: 350, end: 420, throttle: 0.18, attitude: { mode: "prograde" } },
        { name: "1 orbit coast", start: 420, end: 5786, throttle: 0, attitude: { mode: "prograde" } },
        { name: "deorbit burn: engine 5786-5840s", start: 5786, end: 5840, throttle: 0.3, attitude: { mode: "retrograde" } }
      ];
    }

    if (profile.programTemplate === "apollo-11") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "DOI — lower perilune: engine 434311-434330s", start: 434311, end: 434330, throttle: 0.1, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 434330, end: 437722, throttle: 0, attitude: { mode: "prograde" } },
        { name: "PDI — powered descent: engine 437722-437900s", start: 437722, end: 437900, throttle: 0.9, attitude: { mode: "retrograde" } },
        { name: "ascent from Moon surface: engine 439960-440140s", start: 439960, end: 440140, throttle: 0.6, attitude: { mode: "prograde" } },
        { name: "coast to TEI window", start: 440140, end: 448600, throttle: 0, attitude: { mode: "prograde" } },
        { name: "TEI — trans-Earth injection: engine 448600-448700s", start: 448600, end: 448700, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast back to Earth", start: 448700, end: 708704, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    // Default LEO profile (shorter gravity turn than lunar ascent)
    return [
      { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
      { name: "gravity turn: engine 28-250s", start: 28, end: 250, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
        { t: 28, pitchDeg: 88 },
        { t: 80, pitchDeg: 72 },
        { t: 150, pitchDeg: 38 },
        { t: 250, pitchDeg: 4 }
      ] } },
      { name: "coast to circularization", start: 250, end: 520, throttle: 0, attitude: { mode: "prograde" } },
      { name: "circularization: engine 520-590s", start: 520, end: 590, throttle: 0.18, attitude: { mode: "prograde" } }
    ];
  }

export const SolarScenarioData = {
  bodyCatalog,
  defaultScenarioId: "voyager-2-grand-tour",
  scenarios
};

export const RocketLaunchConfig = {
  earth,
  launchSites,
  targetProfiles,
  defaultLaunchSiteId: "baikonur",
  defaultTargetProfileId: "moon-demo",
  buildMission,
  firstProfileForScenario
};
