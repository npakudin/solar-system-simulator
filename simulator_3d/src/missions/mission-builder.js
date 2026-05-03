import { bodyCatalog } from "../data/body-catalog.js";
import { scenarios } from "../scenarios/scenarios.js";
import { launchSites } from "./launch-sites.js";
import { buildProgram } from "./program-templates.js";
import { targetProfiles } from "./target-profiles.js";

export const earth = {
    rotationPeriodSeconds: bodyCatalog.Earth.rotationPeriodHours * 3600,
    ellipsoid: bodyCatalog.Earth.ellipsoid
  };

// Earth's north pole in the J2000 ecliptic frame used by real heliocentric scenarios.
// ecliptic lon=270°, ecliptic lat=66.56° (= 90° - 23.44° obliquity)
const ECLIPTIC_NORTH_POLE = { x: 0, y: -0.3978, z: 0.9175 };

export function buildMission({ scenarioId, launchSiteId, targetProfileId }) {
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

export function firstProfileForScenario(scenarioId) {
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
