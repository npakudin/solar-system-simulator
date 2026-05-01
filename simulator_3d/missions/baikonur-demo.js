(function () {
  window.Missions = window.Missions || {};

  const earthCatalog = window.SolarScenarioData.bodyCatalog.Earth;
  const earth = {
    rotationPeriodSeconds: earthCatalog.rotationPeriodHours * 3600,
    ellipsoid: earthCatalog.ellipsoid
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
      defaultLaunchSiteId: "cape-canaveral",
      timeScale: 1
    },
    {
      id: "soyuz-iss",
      label: "Soyuz → ISS 420km",
      scenarioIds: ["soyuz-iss-baikonur"],
      targetOrbit: { name: "ISS 420km", inclinationDeg: 51.6 },
      vehicle: { ...baseVehicle, dryMassKg: 7000, fuelMassKg: 280000, exhaustVelocityMps: 3300, maxMassFlowKgPerSec: 700 },
      programTemplate: "soyuz-iss",
      headingDeg: 63.33,
      defaultLaunchSiteId: "baikonur",
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

    const scenario = window.SolarScenarioData && window.SolarScenarioData.scenarios.find((s) => s.id === scenarioId);
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
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 38 },
          { t: 280, pitchDeg: 4 }
        ] } },
        { name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize 200km: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
        { name: "Hohmann 1 — raise apogee to 420km: engine 530-560s", start: 530, end: 560, throttle: 0.05, attitude: { mode: "prograde" } },
        { name: "coast to apogee", start: 560, end: 3277, throttle: 0, attitude: { mode: "prograde" } },
        { name: "Hohmann 2 — circularize 420km: engine 3277-3307s", start: 3277, end: 3307, throttle: 0.05, attitude: { mode: "prograde" } },
        { name: "correction 2 — phase adjust toward ISS: engine 3310-3360s", start: 3310, end: 3360, throttle: 0.025, attitude: { mode: "target-body", target: "ISS", leadSeconds: 1200 } },
        { name: "coast to close approach", start: 3360, end: 18000, throttle: 0, attitude: { mode: "target-body", target: "ISS", leadSeconds: 0 } },
        { name: "approach burn: engine 18000-18100s", start: 18000, end: 18100, throttle: 0.018, attitude: { mode: "target-body", target: "ISS", leadSeconds: 0 } },
        { name: "docking coast", start: 18100, end: 21600, throttle: 0, attitude: { mode: "target-body", target: "ISS", leadSeconds: 0 } }
      ];
    }

    if (profile.programTemplate === "lunar-orbit") {
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
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast to Moon — 5 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "LOI burn — enter lunar capture orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LLO: engine 434311-434380s", start: 434311, end: 434380, throttle: 0.12, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 434380, end: 450000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "artemis-2") {
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
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast — free return trajectory", start: 620, end: 431220, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "MCC-1 correction: engine 431220-431225s", start: 431220, end: 431225, throttle: 0.1, attitude: { mode: "prograde" } },
        { name: "coast — return to Earth", start: 431225, end: 864000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "lunar-landing") {
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
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast to Moon — 5 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "LOI burn — enter lunar orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
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
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 38 },
          { t: 280, pitchDeg: 4 }
        ] } },
        { name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LEO: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast to Moon — 3 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "LOI burn — enter lunar orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
        { name: "DOI — lower perilune: engine 434311-434330s", start: 434311, end: 434330, throttle: 0.1, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 434330, end: 437722, throttle: 0, attitude: { mode: "prograde" } },
        { name: "PDI — powered descent: engine 437722-437900s", start: 437722, end: 437900, throttle: 0.9, attitude: { mode: "retrograde" } },
        { name: "ascent from Moon surface: engine 439960-440140s", start: 439960, end: 440140, throttle: 0.6, attitude: { mode: "prograde" } },
        { name: "coast to TEI window", start: 440140, end: 448600, throttle: 0, attitude: { mode: "prograde" } },
        { name: "TEI — trans-Earth injection: engine 448600-448700s", start: 448600, end: 448700, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast back to Earth", start: 448700, end: 708704, throttle: 0, attitude: { mode: "prograde" } }
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
    defaultTargetProfileId: "moon-demo",
    buildMission,
    firstProfileForScenario
  };
})();
