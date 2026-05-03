# Solar System Simulators

Interactive browser simulators for solar-system motion, near-Earth launches, and
rocket flight programs.

The actively developed app is `simulator_3d`: a static Three.js simulator that
combines N-body gravity, planet rendering, launch sites, target profiles,
programmed rocket burns, ISS-style rendezvous scenarios, lunar transfers,
landing checks, and interplanetary flyby/gravity-assist experiments. The older
`simulator_2d` app is kept as a lightweight classic version.

## Run

Open `index.html` in a browser and choose the 3D or 2D simulator.

You can also open `simulator_3d/index.html` directly. The 3D app has no build
step, no dev server requirement, and no runtime CDN dependency. Three.js,
OrbitControls, and satellite.js are vendored locally in `simulator_3d/vendor/`.

## What The 3D Simulator Models

- Solar-system and near-Earth scenarios with SI-unit physics.
- N-body gravity for planets, Moon, ISS-like satellites, and the rocket.
- Rocket flight programs made of timed coast/burn commands with throttle and
  attitude modes such as surface-up, prograde, retrograde, target-body,
  pitch-program, and RTN.
- Launch sites and target profiles for LEO, ISS, polar, GEO-style, lunar, and
  interplanetary demonstrations.
- Adaptive timesteps around engine burns, mission events, low orbit, and close
  flybys.
- ISS tracking and launch-window estimation through vendored satellite.js.
- Planet textures, Saturn rings, Moon terrain bump/height data, orbital trails,
  launch-site markers, camera follow modes, and mission readouts.

This is an interactive educational/visual simulator, not validated mission
planning software. Some data is real or real-inspired, while many trajectories
are tuned for useful visualization and experimentation.

## Project Layout

- `index.html` - landing page linking to the simulators.
- `simulator_2d/index.html` - legacy self-contained 2D canvas simulator.
- `simulator_3d/index.html` - 3D app shell and DOM controls.
- `simulator_3d/src/app-classic.js` - browser orchestrator: UI, Three.js scene,
  animation loop, ISS tracking, camera, readouts, trails, and overlays.
- `simulator_3d/src/physics-classic.js` - body creation, N-body gravity,
  simulation stepping, and landing checks.
- `simulator_3d/src/rocket-classic.js` - rocket mission state, launch-site
  placement, burn execution, adaptive timestep, and mission status.
- `simulator_3d/src/scenario-data.js` - current scenario, body, launch-site,
  vehicle, target-profile, and mission-program data.
- `simulator_3d/src/attitude.js` - attitude mode math for rocket thrust
  direction.
- `simulator_3d/src/mesh-factory.js` - Three.js mesh and trail construction.
- `simulator_3d/src/vec3.js`, `constants.js`, `time-format.js` - small shared
  helpers.
- `simulator_3d/sim-assets/` - textures, downloaded assets, and source
  parameter JSON files.
- `simulator_3d/tests/` - Jest tests and diagnostic trajectory traces.

## Tests

```sh
cd simulator_3d
npm test
```

The default test run currently includes verbose diagnostic traces. They are
useful when tuning mission programs, but they can be noisy for routine changes.

## Notes For Coding Agents

Read `AGENTS.md` before working on the project. It explains the architecture,
data flow, coordinate conventions, files to read for each task, and high-noise
paths to avoid when trying to keep LLM context small.
