# LLM Context Reduction: Next Steps

Date: 2026-05-03

This plan is written for a smaller coding model working in a fresh context.
Follow the steps in order. Do not combine large steps in one change. After each
code step, run the stated verification before continuing.

## Goal

Reduce how much source a coding model must read to make reliable changes. The
main targets are:

1. `simulator_3d/src/scenario-data.js` - currently mixes unrelated data and
   mission-building logic in one 1000-line file.
2. `simulator_3d/src/app-classic.js` - currently mixes UI, rendering, ISS
   tracking, simulation loop, readouts, trails, and overlays in one 1300-line
   file.
3. Default tests - currently include verbose diagnostic traces that pollute
   command output and LLM context.

## Non-Negotiable Constraints

- Preserve direct browser usage of `simulator_3d/index.html`.
- Do not introduce a bundler or dev server requirement.
- Use static ES module imports for runtime data. Do not use JSON `fetch()` for
  core scenario data.
- Do not read or modify `node_modules`, `vendor`, or texture files unless the
  task explicitly requires it.
- Keep behavior unchanged unless a step explicitly says otherwise.
- Keep patches small enough to review.
- Existing untracked docs may be present. Do not delete or rewrite them unless
  the user asks.

## Baseline Checklist

Start every implementation session with:

```sh
git status --short
cd simulator_3d
npm test
```

If tests are already failing before your edits, stop and report the failing
tests before changing code.

## Step 1 - Move Diagnostic Tests Out Of Default Test Run

Purpose: make `npm test` shorter and less noisy for future agents.

Current state:

- `tests/leo-diagnostic.test.js` prints a trajectory trace and asserts
  `expect(true).toBe(true)`.
- `tests/soyuz-iss-diagnostic.test.js` prints a long event-driven trace.
- Both files match the current Jest pattern and run on every `npm test`.

Implementation:

1. Rename:
   - `simulator_3d/tests/leo-diagnostic.test.js`
     to `simulator_3d/tests/leo-diagnostic.diagnostic.js`
   - `simulator_3d/tests/soyuz-iss-diagnostic.test.js`
     to `simulator_3d/tests/soyuz-iss-diagnostic.diagnostic.js`
2. Keep `package.json` default `testMatch` as `**/tests/**/*.test.js`.
3. Add package scripts:

   ```json
   "test:diagnostic": "node --experimental-vm-modules node_modules/.bin/jest --no-coverage --testMatch '**/tests/**/*.diagnostic.js' --runInBand",
   "test:all": "npm test -- --runInBand && npm run test:diagnostic"
   ```

4. Update any comments in the renamed diagnostic files that mention the command
   to run.

Verification:

```sh
cd simulator_3d
npm test
npm run test:diagnostic
```

Expected result:

- `npm test` runs only focused `.test.js` tests.
- `npm run test:diagnostic` runs the verbose traces.

## Step 2 - Decide What To Do With `body-index.js`

Purpose: remove dead context or make it useful.

Current state:

- `simulator_3d/src/body-index.js` exports `BodyIndex`.
- No source or test file imports it.
- Many files still use `bodies.find((body) => body.name === "...")`.

Recommended smaller-model choice: delete `body-index.js`.

Reason: adopting it consistently touches multiple hot modules and can create
behavioral risk. The file is only 19 lines, but dead files cause agents to read
unneeded context.

Implementation:

1. Confirm no imports:

   ```sh
   rg "BodyIndex|body-index" simulator_3d/src simulator_3d/tests
   ```

2. Delete `simulator_3d/src/body-index.js`.
3. Do not replace `bodies.find(...)` in this step.

Verification:

```sh
cd simulator_3d
npm test
```

Alternative: if the user explicitly wants lookup adoption, create a separate
plan for that refactor and do it after the larger file splits.

## Step 3 - Split `scenario-data.js` Into Static Modules

Purpose: let future agents read one small data module instead of a 1000-line
mixed file.

Important: preserve the existing public exports from
`simulator_3d/src/scenario-data.js`:

```js
export const SolarScenarioData = { bodyCatalog, defaultScenarioId, scenarios };
export const RocketLaunchConfig = {
  earth,
  launchSites,
  targetProfiles,
  defaultLaunchSiteId,
  defaultTargetProfileId,
  buildMission,
  firstProfileForScenario
};
```

Recommended target structure:

```txt
simulator_3d/src/data/body-catalog.js
simulator_3d/src/data/horizons-2026-05-01.js
simulator_3d/src/scenarios/scenarios.js
simulator_3d/src/missions/launch-sites.js
simulator_3d/src/missions/vehicles.js
simulator_3d/src/missions/target-profiles.js
simulator_3d/src/missions/program-templates.js
simulator_3d/src/missions/mission-builder.js
simulator_3d/src/scenario-data.js
```

Do this in substeps.

### Step 3A - Extract Body Catalog

1. Create `src/data/body-catalog.js`.
2. Move only `const bodyCatalog = { ... }` into it.
3. Export it:

   ```js
   export const bodyCatalog = { ... };
   ```

4. Import it in `scenario-data.js`.
5. Leave everything else in `scenario-data.js`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3B - Extract Horizons Vectors

1. Create `src/data/horizons-2026-05-01.js`.
2. Move only `real20260501Bodies`.
3. Export it:

   ```js
   export const real20260501Bodies = [ ... ];
   ```

4. Import it in `scenario-data.js`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3C - Extract Scenarios

1. Create `src/scenarios/scenarios.js`.
2. Move only `const scenarios = [ ... ]`.
3. Import `real20260501Bodies` inside this file.
4. Export it:

   ```js
   export const scenarios = [ ... ];
   export const defaultScenarioId = "voyager-2-grand-tour";
   ```

5. Import `scenarios` and `defaultScenarioId` in `scenario-data.js`.
6. Keep `SolarScenarioData.defaultScenarioId` equal to the imported
   `defaultScenarioId`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3D - Extract Launch Sites And Vehicles

1. Create `src/missions/launch-sites.js`.
2. Move `launchSites`.
3. Create `src/missions/vehicles.js`.
4. Move `baseVehicle` and `heavyVehicle`.
5. Export all moved constants.
6. Import them in `scenario-data.js`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3E - Extract Target Profiles

1. Create `src/missions/target-profiles.js`.
2. Move `targetProfiles`.
3. Import `baseVehicle` and `heavyVehicle` there.
4. Export `targetProfiles`.
5. Import it in `scenario-data.js`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3F - Extract Program Templates

1. Create `src/missions/program-templates.js`.
2. Move `buildProgram(profile, headingDeg)` into it.
3. Export `buildProgram`.
4. Keep nested helpers such as `leoAscent`, `tliCoast`, and `loiApproach`
   local to this module unless reuse becomes obvious.
5. Import `buildProgram` in `scenario-data.js`.

Verification:

```sh
cd simulator_3d
npm test
```

### Step 3G - Extract Mission Builder

1. Create `src/missions/mission-builder.js`.
2. Move:
   - `earth`
   - `ECLIPTIC_NORTH_POLE`
   - `buildMission`
   - `firstProfileForScenario`
   - `resolveHeading`
3. Import:
   - `bodyCatalog`
   - `scenarios`
   - `launchSites`
   - `targetProfiles`
   - `buildProgram`
4. Export:

   ```js
   export const earth = { ... };
   export function buildMission(...) { ... }
   export function firstProfileForScenario(...) { ... }
   ```

5. Keep `resolveHeading` private unless tests need it.
6. Make `scenario-data.js` a facade that only imports and re-exports grouped
   data.

Verification:

```sh
cd simulator_3d
npm test
```

Expected result:

- `scenario-data.js` becomes a small facade.
- Future mission-only tasks can read `src/missions/*`.
- Future scenario-only tasks can read `src/scenarios/scenarios.js`.
- Future catalog-only tasks can read `src/data/body-catalog.js`.

## Step 4 - Document Scenario And Mission Schemas

Purpose: let agents edit data without reading every existing scenario.

Create `docs/scenario-schema.md` with:

- Body catalog fields.
- Scenario fields:
  - `id`
  - `label`
  - `description`
  - `flybyTargets`
  - `initialState`
  - `rocket`
  - `referenceOrbits`
  - `stepSeconds`
  - `view`
  - `camera`
  - `ui`
- Initial state variants:
  - `vectors`
  - `absolute`
  - `circular`
- Target profile fields.
- Mission program command fields.
- Coordinate and unit conventions.
- One short example for a toy Earth scenario and one short example for a
  mission program command.

Verification:

- No tests required for docs-only.
- Read the file once and confirm it matches current code.

## Step 5 - Extract ISS Tracking From `app-classic.js`

Purpose: remove a self-contained SGP4 block from the browser orchestrator.

Current block:

- TLE constants.
- `_issSatrec`, `_issEpochMs`, `_issGmst0`.
- `initISS()`.
- `updateISSPosition(bodies, simulatedElapsedSeconds)`.
- `computeLaunchWindowSeconds(site)`.

Target file:

```txt
simulator_3d/src/iss-tracking.js
```

Suggested API:

```js
export function createIssTracker(satelliteLib = globalThis.satellite) {
  return {
    init,
    updatePosition,
    computeLaunchWindowSeconds
  };
}
```

Implementation notes:

- Keep the same hardcoded TLE initially.
- Preserve current behavior when `satellite` is unavailable: warn or return 0,
  but do not crash.
- `updatePosition(bodies, simulatedElapsedSeconds)` should keep using body names
  `"ISS"` and `"Earth"`.
- `app-classic.js` should instantiate one tracker and call the same methods.

Verification:

```sh
cd simulator_3d
npm test
```

Manual browser check:

- Open `simulator_3d/index.html`.
- Select an ISS-related scenario.
- Start simulation.
- Confirm no console error and the ISS/launch window behavior still appears.

## Step 6 - Extract Time Scale Logic From `app-classic.js`

Purpose: make playback speed behavior testable and readable.

Target file:

```txt
simulator_3d/src/time-scale.js
```

Move or create exports for:

- `sliderToTimeScale`
- `timeScaleToSlider`
- `fmtTimeScale`
- `clampTimeScale`
- `DYNAMIC_TIME_SCALE`
- a pure-ish helper for choosing dynamic playback scale if practical

Keep DOM event listeners in `app-classic.js` for now. The first extraction
should focus on pure conversion/config functions.

Verification:

```sh
cd simulator_3d
npm test
```

Manual browser check:

- Time scale slider changes numeric input.
- Numeric input changes slider.
- Dynamic time scale can be disabled by manual input.

## Step 7 - Extract Readouts From `app-classic.js`

Purpose: isolate DOM readout formatting and reduce app orchestrator size.

Current functions:

- `updateReadouts()`
- `updateMissionReadouts(missionStatus)`
- helpers near them:
  - `speedRefBody`
  - `speedRelativeTo`
  - `closingSpeed`
  - `getCurrentFlybyTargetName`
  - `advanceFlybyTarget`

Recommended approach:

1. First extract pure helpers into `src/readout-metrics.js`:
   - `speedRelativeTo`
   - `closingSpeed`
   - maybe `speedRefBody`
2. Add focused tests for these helpers if extraction changes logic.
3. Then create `src/readouts.js` with a controller:

   ```js
   export function createReadoutController(deps) {
     return { update };
   }
   ```

4. Pass dependencies explicitly:
   - DOM elements
   - `getBodies`
   - `getElapsedSeconds`
   - `getActiveScenario`
   - `getRocketMissionState`
   - `currentMission`
   - `rocketSim`
   - formatting helpers

Avoid a huge extraction in one patch. Split pure metrics first, DOM controller
second.

Verification:

```sh
cd simulator_3d
npm test
```

Manual browser check:

- Before launch: speed says not launched, target distance appears.
- During launch: mission time, program, next burn, throttle, fuel, inclination,
  target distance, and compact readouts update.

## Step 8 - Revisit `app-classic.js` After Extractions

Purpose: keep the remaining app file as an orchestrator.

Only after Steps 5-7, inspect `app-classic.js` again. Consider extracting:

- `scene-sync.js` for `syncSceneObjects`, `updateMeshes`, Saturn shadows,
  launch-site markers, reference orbits.
- `camera-controller.js` for camera follow and launch focus.
- `overlays.js` for landing and launch-window overlays.

Do not extract all of these at once. Pick the block related to the next feature
request.

## Suggested Prompt For The Next Smaller Model

Use this prompt for Step 1:

```txt
Read AGENTS.md and docs/plans/2026-05-03-llm-context-reduction-next-steps.md.
Implement only Step 1: move diagnostic Jest traces out of the default test run.
Do not touch simulator runtime code. Preserve existing untracked docs. After
the change, run `cd simulator_3d && npm test` and
`cd simulator_3d && npm run test:diagnostic`, then summarize changed files and
test results.
```

Use this prompt for Step 3A:

```txt
Read AGENTS.md and the plan file. Implement only Step 3A: extract the body
catalog from simulator_3d/src/scenario-data.js into
simulator_3d/src/data/body-catalog.js. Keep scenario-data.js public exports
unchanged. Do not split any other data. Run `cd simulator_3d && npm test`.
```

