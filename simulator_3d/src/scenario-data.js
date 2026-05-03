import { bodyCatalog } from "./data/body-catalog.js";
import { launchSites } from "./missions/launch-sites.js";
import { buildMission, buildMissionForScenario, earth, firstProfileForScenario } from "./missions/mission-builder.js";
import { targetProfiles } from "./missions/target-profiles.js";
import { defaultScenarioId, scenarios } from "./scenarios/scenarios.js";

export const SolarScenarioData = {
  bodyCatalog,
  defaultScenarioId,
  scenarios
};

export const RocketLaunchConfig = {
  earth,
  launchSites,
  targetProfiles,
  defaultLaunchSiteId: "baikonur",
  defaultTargetProfileId: "moon-demo",
  buildMission,
  buildMissionForScenario,
  firstProfileForScenario
};
