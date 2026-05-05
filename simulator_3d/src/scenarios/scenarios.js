import { real20260501Bodies } from "../data/horizons-2026-05-01.js";
import { voyager2LaunchBodies } from "../data/horizons-voyager-2-launch.js";

export const defaultScenarioId = "voyager-2-grand-tour";

const JUPITER_MOONS = ["Io", "Europa", "Ganymede", "Callisto"];
const SATURN_MOONS = ["Titan", "Rhea", "Iapetus", "Dione", "Enceladus"];

export const scenarios = [
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "jupiter-demo" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "jupiter-demo" },
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
        includeBodies: ["Sun", "Earth", "Moon", "Jupiter", ...JUPITER_MOONS, "ISS"],
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 9.75e3,
        radialDeltaV: -0.3e3,
        outOfPlaneDeltaV: 0
      },
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "jupiter-demo" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "starlink-leo" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "moon-demo" },
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
      mission: { launchSiteId: "baikonur", targetProfileId: "soyuz-iss" },
      view: { metersToUnits: 1.4e-7, radiusScale: 1.4e-7, minBodyRadius: 0.05, markers: false },
      camera: { position: [0, 10, 20], target: [0, 0, 0], maxDistance: 60 },
      ui: { cameraTarget: "earth", timeScale: 1 }
    },
    {
      id: "live-ish-soyuz-iss",
      label: "Live-ish Soyuz → ISS",
      description: "Date-based solar-system setup with ISS from a recent bundled TLE or a deterministic ISS-like fallback.",
      flybyTargets: ["ISS"],
      initialState: {
        type: "ephemeris",
        dateTime: "now",
        includeBodies: ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", ...JUPITER_MOONS, "Saturn", ...SATURN_MOONS, "Uranus", "Neptune", "Pluto", "ISS"]
      },
      stepSeconds: 2,
      mission: { launchSiteId: "baikonur", targetProfileId: "soyuz-iss-live-ish" },
      view: { metersToUnits: 1.4e-7, radiusScale: 1.4e-7, useDisplayScale: false, minBodyRadius: 0.05, markers: true },
      camera: { position: [0, 10, 20], target: [0, 0, 0], maxDistance: 900 },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "crew-dragon-iss" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "lunar-orbit" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "artemis-2" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "lunar-landing" },
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
      mission: { launchSiteId: "baikonur", targetProfileId: "vostok-1" },
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
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "apollo-11" },
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
        includeBodies: ["Sun", "Earth", "Moon", "Jupiter", ...JUPITER_MOONS],
        bodies: real20260501Bodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 8069,
        radialDeltaV: -1500,
        outOfPlaneDeltaV: 0
      },
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "jupiter-return" },
      referenceOrbits: [],
      stepSeconds: 3600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 60 }
    },
    {
      id: "voyager-2-grand-tour",
      label: "Voyager 2 — grand tour (1977)",
      description: "Voyager 2 launch epoch with NASA/JPL Horizons planet positions and the outer-planet grand tour.",
      flybyTargets: ["Jupiter", "Saturn", "Uranus", "Neptune"],
      initialState: {
        type: "vectors",
        units: { position: "km", velocity: "km/s" },
        epoch: "1977-08-20T14:29:44 TDB",
        bodies: voyager2LaunchBodies
      },
      rocket: {
        mode: "earthProgradeKick",
        altitudeEarthRadii: 9,
        progradeDeltaV: 8750,
        radialDeltaV: -250,
        outOfPlaneDeltaV: -950
      },
      mission: { launchSiteId: "cape-canaveral", targetProfileId: "voyager-2" },
      referenceOrbits: [],
      stepSeconds: 21600,
      view: { metersToUnits: 1.0e-10, radiusScale: 1.0e-10, useDisplayScale: true, minBodyRadius: 0.35, markers: true },
      camera: { position: [0, 95, 170], target: [0, 0, 0], maxDistance: 1400 },
      ui: { cameraTarget: "earth", timeScale: 80, focusRocketOnLaunch: true }
    }
  ];
