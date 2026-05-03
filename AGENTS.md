# AGENTS.md

This file is the project map for coding agents. Read it before opening large
source files. Its purpose is to reduce unnecessary context use and prevent
agents from rediscovering the architecture from scratch.

## Project Summary

`planets3d` contains browser-based solar-system simulators. The actively
developed app is `simulator_3d`: a static Three.js simulator for solar-system
and near-Earth spaceflight. It models N-body gravity, rocket flight programs,
launch sites, target profiles, ISS tracking, lunar terrain collision, and visual
rendering of planets, trails, launch markers, and readouts.

The simulator is intended to be an interactive educational/visual model, not a
validated astrodynamics product. Many values are real or real-inspired, while
some mission programs are tuned for useful visualization and gameplay-like
experimentation.

## Runtime And Dependencies

- Main entry page: `index.html`.
- Main 3D app: `simulator_3d/index.html`.
- Legacy 2D app: `simulator_2d/index.html`.
- The 3D app has no build step and no runtime CDN dependency.
- Three.js, OrbitControls, and satellite.js are vendored in
  `simulator_3d/vendor/` and loaded as browser globals.
- `simulator_3d/src/*.js` files are ES modules.
- Runtime should keep working when `simulator_3d/index.html` is opened directly
  from disk. Avoid changes that require a bundler or a server unless the user
  explicitly asks for that migration.
- Tests use Jest from `simulator_3d/package.json`.

Useful commands:

```sh
cd simulator_3d
npm test
npm run test:verbose
```

## Read This First For Each Task

Use the smallest relevant file set. Prefer `rg` and targeted line ranges over
opening whole large files.

For UI, DOM, animation loop, camera, trails, readouts, or texture loading:

- `simulator_3d/index.html`
- `simulator_3d/src/app-classic.js`
- `simulator_3d/src/styles.css`
- `simulator_3d/src/mesh-factory.js` only when body meshes, Saturn rings, Moon
  bump maps, rocket mesh, or trails are involved.

For gravity, body creation, landing checks, or physical units:

- `simulator_3d/src/physics-classic.js`
- `simulator_3d/src/vec3.js`
- `simulator_3d/src/constants.js`
- relevant scenario block in `simulator_3d/src/scenario-data.js`

For rocket flight programs, launch sites, target profiles, attitude, fuel, or
adaptive timestep:

- `simulator_3d/src/rocket-classic.js`
- `simulator_3d/src/attitude.js`
- relevant mission/profile/program block in `simulator_3d/src/scenario-data.js`
- `simulator_3d/tests/harness.js` and focused mission tests if behavior changes

For scenario or mission data:

- `simulator_3d/src/scenario-data.js`
- use `rg "scenario-id|profile-id|programTemplate"` first, then read only the
  surrounding block.

For tests:

- `simulator_3d/tests/harness.js`
- `simulator_3d/tests/soyuz-iss.test.js`
- Diagnostic tests are verbose traces. Read them only if tuning trajectories or
  investigating mission regressions.

## Do Not Read Unless Needed

These paths are high-noise for LLM context:

- `simulator_3d/node_modules/`
- `simulator_3d/vendor/`
- `simulator_3d/sim-assets/textures/`
- `simulator_3d/package-lock.json`
- `.git/`
- IDE metadata such as `.idea/`

Only open vendored libraries, lockfiles, or binary asset directories when the
task is specifically about dependencies, browser library behavior, or assets.

## Current Architecture

`simulator_3d/index.html` defines the control panel and canvas, then loads:

1. `vendor/satellite.js`
2. `vendor/three.min.js`
3. `vendor/OrbitControls.js`
4. `src/app-classic.js`

`src/app-classic.js` is the browser orchestrator. It:

- reads DOM controls and readout elements;
- initializes Three.js scene, renderer, camera, lights, controls, stars, and
  texture loading;
- initializes `MeshFactory`;
- creates initial bodies from the active scenario;
- owns simulation state such as `bodies`, `elapsedSeconds`, `running`,
  `rocketMissionState`, launch-window state, camera-follow state, and flyby
  tracking;
- handles scenario/profile/site UI changes;
- runs the animation loop;
- updates rocket, physics, ISS position, landing checks, trails, meshes,
  camera, sky, readouts, and overlays.

`src/scenario-data.js` is currently a large data/configuration monolith. It
exports:

- `SolarScenarioData`: body catalog, default scenario id, and scenario list.
- `RocketLaunchConfig`: Earth config, launch sites, target profiles, default
  launch/profile ids, and mission-building helpers.

`src/physics-classic.js` exports `SolarPhysics`. It:

- creates `Body` objects from scenario definitions;
- converts vector scenarios from km and km/s to SI units;
- computes N-body gravity;
- steps body positions and velocities;
- handles legacy simple rocket launch mode;
- checks Earth/Moon landings and Moon LDEM terrain height.

`src/rocket-classic.js` exports `RocketSim`. It:

- builds mission state from `RocketLaunchConfig`;
- creates the rocket on the selected launch site;
- keeps the rocket attached to the rotating pad before liftoff;
- applies flight-program commands before physics;
- advances mission time after physics;
- chooses adaptive timesteps around burns, events, low orbit, and close-body
  flybys;
- reports mission status for UI readouts.

`src/attitude.js` converts mission command attitude modes into thrust
directions. Important modes include `surface-up`, `prograde`, `retrograde`,
`target-body`, `pitch-program`, and `rtn`.

`src/mesh-factory.js` creates Three.js meshes for planets, Sun, Saturn rings,
ISS, rocket, and trails. It depends on the browser global `THREE`; do not import
it in Node tests without providing a browser-like environment.

## Data Flow

Startup:

1. `app-classic.js` reads `SolarScenarioData.defaultScenarioId`.
2. `SolarPhysics.createInitialBodies(activeScenarioId)` finds the scenario and
   builds `Body` objects from catalog defaults plus scenario initial state.
3. The app creates meshes/trails for those bodies and populates scenario, launch
   site, target profile, and camera dropdowns.

Run loop:

1. `animate()` schedules the next frame.
2. If running, `getPlaybackTimeScale()` chooses manual, dynamic, or pre-launch
   speed.
3. `stepPhysicsFrame()` subdivides the scenario timestep.
4. `RocketSim.updateRocketBeforePhysics()` locks or burns the rocket.
5. `SolarPhysics.stepSimulation()` advances gravity.
6. `elapsedSeconds` advances.
7. ISS position is refreshed from SGP4 when available.
8. Launch-window and landing checks run.
9. `RocketSim.updateRocketAfterPhysics()` advances mission time.
10. Trails, meshes, camera, sky, readouts, overlays, and renderer update.

## Units And Coordinate Systems

- Physics uses SI units: meters, seconds, kilograms, meters per second.
- Vector scenarios in `scenario-data.js` use `positionKm` and `velocityKmS`.
  `physics-classic.js` converts them to meters and meters per second.
- Three.js scene coordinates are not the same as physics coordinates.
  `app-classic.js` maps physics `{ x, y, z }` to scene
  `THREE.Vector3(x, z, y)` in `toScenePosition()`.
- Earth rotation and launch-site math in toy scenarios use physics Z as the
  north-pole axis. Real heliocentric vector scenarios can use an ecliptic-frame
  north pole from mission config.
- Textures are mirrored horizontally in `app-classic.js` because the physics to
  scene axis mapping changes handedness.

## Important Domain Objects

Body objects usually contain:

- `name`
- `color`
- `mass`
- `radius`
- `position`
- `velocity`
- `acceleration`
- `displayScale`
- optional render/metadata fields such as `texturePath`, `ellipsoid`, `rings`,
  `axialTiltDeg`, `rotationPeriodHours`, `isSatellite`

The rocket is also a body named `"Rocket"` and may contain:

- `dryMass`
- `fuelMass`
- `engineOn`
- `attitudeDirection`
- `_landed`

Mission state contains:

- `mission`
- `rocket`
- `earthRotationOffsetSeconds`
- `missionTime`
- `attachedToPad`
- `lastCommand`

Mission programs are arrays of burn/coast commands:

- `name`
- `start`
- `end`
- `throttle`
- `attitude`

## Invariants And Caveats

- Keep the static-file runtime unless the user asks for a build/server
  migration.
- Prefer static JS module imports for runtime data. Do not use JSON `fetch()`
  for core scenario data if it would break direct file opening.
- `app-classic.js` relies on browser globals `THREE` and `satellite`.
- Node tests import physics and rocket modules directly; they do not execute the
  browser app.
- Satellites are treated as massless for gravity in `computeAccelerations()`.
  They can be pulled by massive bodies but should not perturb planets.
- ISS handling is split across data and app behavior: scenario data may include
  an ISS body, while `app-classic.js` updates ISS from SGP4 when satellite.js is
  available.
- `body-index.js` currently exists but is not imported anywhere. Treat it as
  unused unless a task explicitly adopts it.
- Some historical docs in `docs/plans/` describe intended refactors that may
  already be partially complete. Verify against current source before relying
  on them.

## Testing Guidance

Run tests from `simulator_3d`:

```sh
npm test
```

The current test suite includes verbose diagnostic traces. Passing diagnostic
tests does not always mean the trajectory is physically correct; some are
inspection aids. When changing mission physics, read the printed values and add
or update focused assertions where possible.

For narrow docs-only changes, tests are usually not required. For code changes
in `physics-classic.js`, `rocket-classic.js`, `attitude.js`, or
`scenario-data.js`, run `npm test`.

## Refactoring Priorities For LLM Context Reduction

Highest value:

1. Split `scenario-data.js` into focused static JS modules while keeping
   `scenario-data.js` as a compatibility facade.
2. Split `app-classic.js` by responsibility: ISS tracking, time-scale logic,
   readouts, and later scene synchronization.
3. Move verbose diagnostics out of the default Jest test run.
4. Either remove unused `body-index.js` or adopt it consistently.

Lower value:

- Shortening descriptive variable names. Do not rename meaningful names just to
  save tokens. Use short names only for local math (`dt`, `dx`, `r`, `v`).
- Deleting useful explanatory comments. Keep comments that explain coordinate
  systems, frame conversions, physical assumptions, or non-obvious browser
  behavior. Remove stale comments and commented-out code.

## Coding Style

- Keep plain JavaScript ES modules.
- Preserve existing browser-global library usage unless doing a dedicated
  dependency migration.
- Keep edits scoped to the requested behavior.
- Avoid broad renames and formatting churn.
- Prefer small pure helpers for math and mission logic.
- For performance-sensitive render loops, avoid creating unnecessary objects in
  hot paths unless the call frequency is low and readability matters.
- Use clear domain names over terse names for mission and physics entities.

