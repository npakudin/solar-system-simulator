import { baseVehicle, heavyVehicle } from "./vehicles.js";

export const targetProfiles = [
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
      preLaunchWindow: false,
      rendezvous: {
        targetBody: "ISS",
        terminalStartDistanceM: 25000,
        dockDistanceM: 0.1,
        dockSpeedMps: 0.1,
        captureDistanceM: 1,
        maxGuidanceAccelerationMps2: 0.08,
        transferCaptureDistanceM: 150000,
        transferCaptureCorridorDistanceM: 0.05,
        transferCaptureFuelKg: 250,
        reserveFuelKg: 1000
      },
      timeScale: 1
    },
    {
      id: "soyuz-iss-live-ish",
      label: "Soyuz → ISS live-ish",
      scenarioIds: ["live-ish-soyuz-iss"],
      targetOrbit: { name: "ISS 420km", inclinationDeg: 51.6 },
      vehicle: { ...baseVehicle, dryMassKg: 7000, fuelMassKg: 180000, maxMassFlowKgPerSec: 900 },
      programTemplate: "soyuz-iss",
      headingDeg: 63.33,
      defaultLaunchSiteId: "baikonur",
      preLaunchWindow: true,
      rendezvous: {
        targetBody: "ISS",
        terminalStartDistanceM: 25000,
        dockDistanceM: 0.1,
        dockSpeedMps: 0.1,
        captureDistanceM: 1,
        maxGuidanceAccelerationMps2: 0.08,
        transferCaptureDistanceM: 4000000,
        transferCaptureCorridorDistanceM: 0.05,
        transferCaptureFuelKg: 500,
        reserveFuelKg: 1000
      },
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
