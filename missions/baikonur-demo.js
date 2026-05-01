(function () {
  window.Missions = window.Missions || {};

  const earth = {
    rotationPeriodSeconds: 86164.0905,
    ellipsoid: {
      equatorialRadiusM: 6378137,
      polarRadiusM: 6356752.314245,
      flattening: 1 / 298.257223563
    }
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
    maxMassFlowKgPerSec: 650,
    visualPelletsPerSecond: 180,
    visualPelletTtlSeconds: 90,
    visualPelletSpeedScale: 0.04,
    visualPelletConeDeg: 9
  };

  const heavyVehicle = {
    ...baseVehicle,
    dryMassKg: 20000,
    fuelMassKg: 260000,
    exhaustVelocityMps: 7000,
    maxMassFlowKgPerSec: 1200,
    visualPelletsPerSecond: 220
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
      timeScale: 1
    }
  ];

  function buildMission({ scenarioId, launchSiteId, targetProfileId }) {
    const site = launchSites.find((item) => item.id === launchSiteId) || launchSites[0];
    const profile = targetProfiles.find((item) => {
      return item.id === targetProfileId && item.scenarioIds.includes(scenarioId);
    }) || firstProfileForScenario(scenarioId);

    if (!site || !profile) {
      return null;
    }

    const headingDeg = resolveHeading(site, profile);
    const vehicle = { ...profile.vehicle };

    return {
      id: `${site.id}-${profile.id}`,
      label: `${site.name} -> ${profile.label}`,
      scenarioIds: profile.scenarioIds,
      launchSite: { ...site },
      earth,
      vehicle,
      targetOrbit: { ...profile.targetOrbit },
      program: buildProgram(profile, headingDeg),
      timestep: {
        thrustSeconds: 0.5,
        preBurnLookaheadSeconds: profile.programTemplate === "moon" ? 90 : 30,
        preBurnSeconds: 1,
        nearEarthSeconds: 2,
        orbitSeconds: profile.programTemplate === "moon" ? 20 : 10,
        farSeconds: profile.programTemplate === "moon" ? 300 : 60
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

    const cosAz = Math.cos(inclination * Math.PI / 180) / Math.cos(site.latDeg * Math.PI / 180);
    const azimuthFromNorth = Math.asin(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
    return 90 - azimuthFromNorth;
  }

  function buildProgram(profile, headingDeg) {
    if (profile.programTemplate === "moon") {
      return [
        { name: "liftoff: engine 0-80s", start: 0, end: 80, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "moon injection: engine 80-300s", start: 80, end: 300, throttle: 0.45, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 1", start: 300, end: 62000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 1: engine 62000-62120s", start: 62000, end: 62120, throttle: 0.04, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 2", start: 62120, end: 145000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 2: engine 145000-145080s", start: 145000, end: 145080, throttle: 0.03, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } }
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
        { name: "interplanetary injection demo: engine 2400-2900s", start: 2400, end: 2900, throttle: 0.35, attitude: { mode: "prograde" } }
      ];
    }

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

  window.RocketLaunchConfig = {
    earth,
    launchSites,
    targetProfiles,
    defaultLaunchSiteId: "baikonur",
    defaultTargetProfileId: "iss",
    buildMission,
    firstProfileForScenario
  };
})();
