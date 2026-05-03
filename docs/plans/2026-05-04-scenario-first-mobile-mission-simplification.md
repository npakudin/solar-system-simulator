# Scenario-First Mobile Mission Simplification

Date: 2026-05-04

This plan is written for a smaller coding agent working in a fresh context.
Follow the steps in order. Keep each patch small. Do not combine UI cleanup,
mission data migration, and test harness changes into one large edit.

## Goal

Make the 3D simulator feel like an interactive animated spaceflight show:

1. The user chooses one scenario.
2. The user presses Start.
3. The scenario runs with its own launch site, target, flight program, camera,
   and playback defaults.

The main UI should no longer expose `Launch site` or `Target`. Those are part
of the scenario, not independent user controls.

## Product Decisions

- Remove `Launch site` from the main UI.
- Remove `Target` from the main UI.
- Keep all launch-site markers visible when the scenario view enables markers.
- Scenarios without a rocket should still run when Start is pressed; Start just
  advances time.
- On mobile, do not hide `Time scale` after Start.
- Keep camera selection available as normal UI.
- Move mission test setup toward:

  ```js
  setupScenarioMission("soyuz-iss-baikonur")
  ```

  instead of requiring separate `scenarioId`, `launchSiteId`, and `profileId`.

## Non-Negotiable Constraints

- Preserve direct browser usage of `simulator_3d/index.html`.
- Do not add a bundler, build step, or dev server requirement.
- Keep static ES module imports for runtime data.
- Do not fetch core scenario data over HTTP.
- Do not read or modify `node_modules`, `vendor`, or texture files.
- Keep `scenario-data.js` as a compatibility facade while migrating.
- Keep patches scoped and run tests after code changes.
- Do not split `body-catalog.js` in this plan.

## Current State

Relevant files:

- `simulator_3d/index.html`
- `simulator_3d/src/app-classic.js`
- `simulator_3d/src/styles.css`
- `simulator_3d/src/scenarios/scenarios.js`
- `simulator_3d/src/missions/mission-builder.js`
- `simulator_3d/src/missions/program-templates.js`
- `simulator_3d/src/missions/target-profiles.js`
- `simulator_3d/src/missions/launch-sites.js`
- `simulator_3d/tests/harness.js`

Important observations:

- Most real missions already have a one-to-one relationship between scenario
  and target profile.
- `mission-builder.js` already prefers `profile.defaultLaunchSiteId` over the
  UI-selected launch site, so the launch-site selector is partly misleading.
- `app-classic.js` forces camera follow to `rocket` during launch activation.
- Mobile collapsed mode hides `.field` and `.advanced`, which hides camera and
  time scale controls after Start.

## Target Architecture

Treat each scenario as a complete runnable episode.

Recommended scenario shape:

```js
{
  id: "soyuz-iss-baikonur",
  label: "Soyuz -> ISS (Baikonur)",
  description: "...",
  initialState: { ... },
  mission: {
    launchSiteId: "baikonur",
    targetProfileId: "soyuz-iss",
    // Later migration target:
    // vehicle,
    // targetOrbit,
    // programTemplate,
    // headingDeg,
    // preLaunchWindow,
    // timeScale
  },
  ui: {
    cameraTarget: "earth",
    timeScale: 1
  }
}
```

The first implementation may keep `targetProfileId` as a bridge to the existing
`target-profiles.js` file. The final direction is to move mission-defining
fields into `scenario.mission` and make `target-profiles.js` unnecessary.

## Step 1 - Add Scenario-Based Mission Lookup

Purpose: allow code and tests to ask for a mission by scenario only.

Implementation:

1. In `scenarios.js`, add `mission` blocks to rocket mission scenarios.
2. Initially use bridge fields:

   ```js
   mission: {
     launchSiteId: "baikonur",
     targetProfileId: "soyuz-iss"
   }
   ```

3. Add a new function in `mission-builder.js`:

   ```js
   export function buildMissionForScenario(scenarioId) {
     const scenario = scenarios.find((item) => item.id === scenarioId);
     const missionConfig = scenario && scenario.mission;
     if (!missionConfig) return null;
     return buildMission({
       scenarioId,
       launchSiteId: missionConfig.launchSiteId,
       targetProfileId: missionConfig.targetProfileId
     });
   }
   ```

4. Export it through `RocketLaunchConfig` in `scenario-data.js`.
5. Add `RocketSim.missionForScenarioId(scenarioId)` or change
   `missionForScenario` to tolerate missing site/profile arguments by using the
   scenario mission block.

Verification:

```sh
cd simulator_3d
npm test
```

## Step 2 - Update Test Harness API

Purpose: make mission debugging small-context and scenario-centered.

Implementation:

1. Add this helper to `tests/harness.js`:

   ```js
   export function setupScenarioMission(scenarioId) {
     const bodies = SolarPhysics.createInitialBodies(scenarioId);
     const mission = RocketSim.missionForScenarioId
       ? RocketSim.missionForScenarioId(scenarioId)
       : RocketSim.missionForScenario(scenarioId);
     const missionState = RocketSim.createMissionState(mission, bodies);
     const sim = { SolarPhysics, RocketSim };
     return { sim, bodies, mission, missionState };
   }
   ```

2. Keep old `setupMission(scenarioId, launchSiteId, profileId)` temporarily for
   compatibility.
3. Update focused tests that only need the scenario to use:

   ```js
   setupScenarioMission("soyuz-iss-baikonur")
   ```

Verification:

```sh
cd simulator_3d
npm test
```

## Step 3 - Remove Launch Site And Target From Main UI

Purpose: make the app flow scenario-first.

Implementation:

1. Remove or hide these blocks from `index.html`:
   - `#launch-site-select`
   - `#target-profile-select`
2. In `app-classic.js`, stop populating these selectors for normal UI.
3. Replace `currentMission()` with scenario-only mission lookup:

   ```js
   function currentMission() {
     return rocketSim && rocketSim.missionForScenarioId(activeScenarioId);
   }
   ```

4. On scenario change, stop resolving target profile and launch site from UI.
5. Keep launch-site markers using `rocketSim.launchSites()`; this is display
   data, not a user launch choice.

Do not delete `launch-sites.js` in this step.
Do not delete `target-profiles.js` in this step.

Verification:

```sh
cd simulator_3d
npm test
```

Manual browser check:

- Open `simulator_3d/index.html`.
- Confirm the main panel has Scenario, Start, Reset, Camera, and time controls.
- Confirm launch-site markers still render for scenarios where markers are on.

## Step 4 - Stop Forcing Camera To Rocket On Launch

Purpose: let each scenario own the default viewing target.

Current behavior:

- `activateLaunch()` sets `cameraTargetSelect.value = "rocket"`.

Implementation:

1. Remove that forced assignment.
2. Keep `focusCameraOnRocketLaunch()` only if the active scenario explicitly
   asks for it. A simple bridge field is acceptable:

   ```js
   ui: {
     cameraTarget: "earth",
     focusRocketOnLaunch: false
   }
   ```

3. Default Earth-launch scenarios to `ui.cameraTarget: "earth"`.
4. Default interplanetary whole-system scenarios to `earth` or `sun`, depending
   on which view looks better.

Verification:

```sh
cd simulator_3d
npm test
```

Manual browser check:

- Start `soyuz-iss-baikonur`; camera should remain on Earth unless the user
  chooses Rocket.
- Choose Rocket manually; follow should still work.

## Step 5 - Keep Time Scale Usable On Mobile After Start

Purpose: fix the main mobile pain without redesigning the whole UI.

Current behavior:

- On mobile, `collapsePanelAfterRun()` adds `.panel-collapsed`.
- CSS hides `.panel-primary .field` and `.advanced`.
- This hides Camera and Time scale controls.

Implementation:

1. Keep `Time scale` outside the advanced block or mark it as a primary control.
2. In collapsed mobile CSS, do not hide the time scale control.
3. Camera may remain available if already in the primary panel. If a small
   layout adjustment is needed, keep it compact.
4. Manual time-scale changes should continue to disable dynamic/auto mode.
5. Rename user-facing `Dynamic time scale` to `Auto speed`.

Suggested markup direction:

```html
<div class="primary-playback">
  <label class="field">
    <span>Camera</span>
    <select id="camera-target"></select>
  </label>

  <label class="field field-range playback-scale">
    <span>Time scale</span>
    ...
  </label>
</div>
```

Keep the implementation small; do not create a full new mobile HUD in this
step.

Verification:

```sh
cd simulator_3d
npm test
```

Manual mobile-width check:

- Resize browser below 760px.
- Start a scenario.
- Confirm Time scale is still visible and usable.
- Move the scale control and confirm `Auto speed` turns off.

## Step 6 - Migrate Mission Data Into Scenarios

Purpose: remove the conceptual duplication between scenarios and targets.

Do this only after Steps 1-5 are working.

Implementation:

1. For one mission at a time, move fields from `target-profiles.js` into
   `scenario.mission`:
   - `vehicle`
   - `targetOrbit`
   - `programTemplate`
   - `headingMode` or `headingDeg`
   - `preLaunchWindow`
   - `timeScale`
2. Update `buildMissionForScenario()` to prefer `scenario.mission` fields.
3. Keep fallback to `targetProfiles` while migration is incomplete.
4. After all scenarios are migrated, remove target-profile UI code and then
   consider deleting `target-profiles.js`.

Recommended order:

1. `soyuz-iss-baikonur`
2. `crew-dragon-iss-ksc`
3. `vostok-1`
4. lunar scenarios
5. interplanetary scenarios
6. toy sandbox scenarios

Verification after each migrated mission:

```sh
cd simulator_3d
npm test
```

For trajectory-sensitive missions, inspect diagnostics if available:

```sh
cd simulator_3d
npm run test:diagnostic
```

## Step 7 - Decide Whether Toy Sandbox Scenarios Stay

Purpose: avoid keeping generic target profiles just for old sandbox behavior.

Options:

1. Convert each useful toy combination into a named scenario:
   - `LEO 550 km from Cape`
   - `ISS inclination demo from Baikonur`
   - `Polar orbit from Vandenberg`
   - `GEO from Kourou`
2. Or move sandbox controls behind a dedicated debug/development mode.

Recommended choice for the product goal: named scenarios.

Reason: the main app should behave like a curated set of interactive episodes,
not a mission-planning form.

## Files To Avoid Unless Needed

- `simulator_3d/vendor/`
- `simulator_3d/node_modules/`
- `simulator_3d/sim-assets/textures/`
- `simulator_3d/package-lock.json`

## Out Of Scope

- Full MVC rewrite.
- Moving `styles.css` in this plan.
- Splitting `body-catalog.js`.
- Adding multi-rocket launches.
- Replacing Three.js globals or adding a bundler.
- Validating real astrodynamics accuracy.

## Acceptance Criteria

- Main UI no longer shows Launch site or Target.
- Choosing a scenario is enough to determine the mission.
- Start works for both rocket and non-rocket scenarios.
- Mobile Start does not hide Time scale.
- Manual Time scale still works during playback.
- Camera is not forced to Rocket on launch.
- Mission tests can use `setupScenarioMission("soyuz-iss-baikonur")`.
- Existing focused tests pass.

