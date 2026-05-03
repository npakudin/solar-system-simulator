# Mobile Controls And Dynamic Time Scale Plan

**Date:** 2026-05-01
**Scope:** Mobile-first simulation controls, collapsible advanced parameters, dynamic playback time scale, and adaptive physics timestep rules.

## 1. Decision

Use two separate mechanisms:

- **Playback time scale** in `src/app-classic.js`: controls how much simulated time the app tries to advance per rendered frame. This is a UX and viewing-speed concern.
- **Physics timestep** in `src/rocket-classic.js`: controls how small each integration step should be inside that frame budget. This is a numerical stability and event-resolution concern.

Do not move viewing-speed decisions into physics. Physics can expose mission state and clamp step sizes, but it should not decide what is pleasant to watch.

## 2. Current State

`src/app-classic.js` currently reads `timeScaleInput.value` directly in `animate()`:

```js
const steps = Math.max(1, Math.floor(Number(timeScaleInput.value)));
let remainingSeconds = steps * (activeScenario.stepSeconds || BASE_STEP_SECONDS);
```

Then, inside the simulation loop, rocket missions can reduce the step:

```js
stepSeconds = rocketSim.chooseStepSeconds(rocketMissionState, bodies, stepSeconds);
```

This is already the right general shape. The planned change should preserve it and make both layers more explicit.

## 3. UX Goals

- On mobile, show the simple flow first:
  - choose scenario;
  - choose launch site;
  - choose target profile;
  - choose camera;
  - press `Start` or `Launch`.
- Put secondary controls and detailed telemetry behind an `Advanced` disclosure.
- When the user presses `Start` or `Launch` on mobile, collapse the panel so the scene becomes the primary view.
- Add `Dynamic time scale`, checked by default.
- When dynamic mode is enabled, the time scale slider should display the current effective playback scale.
- When the user manually moves the slider, disable dynamic mode and keep the selected manual value.

## 4. Playback Time Scale Rules

Add a function in `src/app-classic.js`, for example:

```js
function getPlaybackTimeScale() {
  if (!dynamicTimeScaleInput.checked) {
    return getManualTimeScale();
  }

  return chooseDynamicPlaybackScale();
}
```

Suggested behavior:

- Engine currently on: slow down strongly, for example `1-3`.
- Next burn is soon: slow down before the burn starts, for example:
  - next burn under 30 seconds: `2`;
  - next burn under 120 seconds: `5-10`.
- Rocket close to Earth or in low orbit: moderate speed, for example `5-20`.
- Rocket close to Moon, Jupiter, or another meaningful flyby body: moderate speed, for example `10-30`.
- Long coast with no nearby event: use a large value, bounded by the slider maximum and scenario defaults.

The exact numbers should be constants near the time-scale code, not magic numbers inside the loop.

## 5. Slider Synchronization

Track manual and effective values separately:

```js
let manualTimeScale = Number(timeScaleInput.value);
let effectiveTimeScale = manualTimeScale;
```

Rules:

- If dynamic mode is off:
  - `effectiveTimeScale = manualTimeScale`;
  - slider and number input show `manualTimeScale`.
- If dynamic mode is on:
  - `effectiveTimeScale = chooseDynamicPlaybackScale()`;
  - slider and number input show `effectiveTimeScale`;
  - do not overwrite `manualTimeScale`.
- If the user changes the range input or number input:
  - set `manualTimeScale` to the new value;
  - uncheck `Dynamic time scale`;
  - show the manual value.

This prevents the UI from fighting the user while still making dynamic mode visible.

## 6. Physics Timestep Rules

Keep `rocketSim.chooseStepSeconds()` as the physics clamp. Extend it only for integration accuracy and event resolution.

Existing useful rules:

- throttle on: clamp to `timestep.thrustSeconds`;
- next mission event: clamp to event boundary;
- next burn soon: clamp to `timestep.preBurnSeconds`;
- near Earth: clamp based on altitude.

Add or refine:

- proximity to mission target body, if available;
- proximity to Moon for lunar scenarios;
- proximity to Jupiter for gravity-assist scenarios;
- optionally proximity to any massive body that is close enough relative to its radius or sphere of influence.

Important distinction: these rules should choose physical `dt`, not the amount of simulation time to play per frame.

## 7. Proposed App Loop Shape

In `src/app-classic.js`, change `animate()` toward this shape:

```js
const playbackScale = getPlaybackTimeScale();
syncDisplayedTimeScale(playbackScale);

let remainingSeconds = playbackScale * (activeScenario.stepSeconds || BASE_STEP_SECONDS);

while (remainingSeconds > 0 && guard < MAX_FRAME_SUBSTEPS) {
  const requestedStepSeconds = Math.min(remainingSeconds, scenarioStepSeconds);
  let physicsStepSeconds = requestedStepSeconds;

  if (rocketSim && rocketMissionState) {
    physicsStepSeconds = rocketSim.chooseStepSeconds(
      rocketMissionState,
      bodies,
      requestedStepSeconds
    );
  }

  physicsStepSeconds = Math.min(physicsStepSeconds, remainingSeconds);
  stepSimulation(bodies, physicsStepSeconds);
  elapsedSeconds += physicsStepSeconds;
  remainingSeconds -= physicsStepSeconds;
}
```

Also define `MAX_FRAME_SUBSTEPS` instead of leaving `500` as an inline guard.

## 8. Mobile UI Implementation Plan

### `index.html`

- Add a top-level panel class/state target if needed, for example `.panel-expanded` or `.panel-collapsed`.
- Group primary controls separately from advanced controls.
- Add:

```html
<label class="check">
  <input id="dynamic-time-scale" type="checkbox" checked />
  <span>Dynamic time scale</span>
</label>
```

- Move detailed telemetry into an advanced block or make it visually secondary on mobile.

### `src/styles.css`

- Keep desktop side panel behavior close to current behavior.
- For mobile:
  - overlay controls over the canvas instead of taking a large permanent grid row;
  - keep primary controls compact and touch-friendly;
  - make advanced controls scrollable with a bounded height;
  - support collapsed state after launch/start.

Suggested states:

- expanded: shows selectors, buttons, compact telemetry, and advanced disclosure.
- collapsed: shows compact HUD and essential action buttons only.
- advanced open: shows full parameters and detailed readout.

### `src/app-classic.js`

- Query `#dynamic-time-scale`.
- Add manual/effective time scale state.
- Add panel collapse helpers:

```js
function isMobileLayout() {}
function collapsePanelAfterRun() {}
function setPanelCollapsed(collapsed) {}
```

- Call collapse helper after successful `Start` and `Launch`.
- On `Reset`, expand the panel again on mobile.

## 9. Acceptance Criteria

- Desktop layout remains usable and visually close to the current app.
- Mobile layout does not dedicate most of the viewport to controls after launch.
- `Dynamic time scale` is checked by default.
- With dynamic mode on:
  - burns are visibly slower;
  - upcoming burns slow down before they happen;
  - close flybys slow down;
  - long coasts speed up;
  - slider and number input reflect the current effective scale.
- Moving the slider manually disables dynamic mode.
- Physics remains stable because `chooseStepSeconds()` still clamps actual integration steps.
- Reset returns to a state where changing scenario and parameters is easy.

## 10. Historical Mission Epochs

For historical or date-specific missions, the scenario should carry an explicit epoch and initialize body positions for that real date instead of using only generic demo phases.

Examples:

- Vostok 1 / Gagarin: `1961-04-12T06:07:00Z`.
- Apollo 11: `1969-07-16T13:32:00Z`.
- Artemis II or modern scenarios: use the planned or actual launch date once known.

Scenario data should include fields such as:

```js
{
  epochIso: "1961-04-12T06:07:00Z",
  epochLabel: "12 Apr 1961, 06:07 UTC",
  ephemerisSource: "precomputed",
  bodies: [...]
}
```

Implementation options:

- Precompute state vectors for each historical scenario and store them in scenario data. This is the most reliable offline option for the current static app.
- Add an asset-generation script later that can pull Horizons/SPICE data and write JSON snapshots for known epochs.
- Keep simple demo scenarios on approximate circular orbits, but mark realistic/historical scenarios as epoch-based.

UI changes:

- Add a readout for simulation date/time, separate from elapsed mission time.
- Display `epoch + elapsedSeconds` while the sim runs.
- For historical missions, show the real mission date prominently enough that users understand they are seeing the solar system for that date.
- On mobile collapsed HUD, prefer a short date/time format, for example `1961-04-12 06:12 UTC`.

Important distinction:

- `Mission time` remains time since launch or scenario start.
- `Simulation date` is the absolute historical or scenario date.

This becomes especially important for lunar missions, because the Earth-Moon-Sun geometry and Moon phase should match the real launch window.

## 11. Verification

Run the app and test:

- desktop viewport around `1440x900`;
- mobile viewport around `390x844`;
- `toy-earth-rocket`;
- `toy-earth-moon-rocket`;
- one Jupiter or full solar-system scenario.
- at least one historical/date-specific scenario once available.

Check specifically:

- panel collapse/expand behavior;
- slider movement in dynamic mode;
- manual slider disables dynamic mode;
- burns do not get skipped visually;
- close approaches do not run too fast;
- absolute simulation date/time advances correctly from the scenario epoch;
- canvas resizes correctly when the panel state changes.

## 12. Risks

- Very high playback scale can hit the per-frame substep guard and make simulated time advance less than the slider suggests.
- Updating the slider every frame may feel noisy if the dynamic scale changes too often. Smooth or quantize the selected values if needed.
- Mobile overlay controls can hide the rocket during launch. Camera follow and collapsed panel height need to be checked together.
- Physics proximity rules should avoid clamping too aggressively during long missions, or performance will drop.
- Historical ephemerides can give a false sense of accuracy if the rocket mission program remains approximate. Label approximate trajectories clearly until mission programs and state vectors are both realistic.
