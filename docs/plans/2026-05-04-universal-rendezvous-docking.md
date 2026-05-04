# Live-ish Soyuz ISS Rendezvous Plan

Date: 2026-05-04

This is a simple plan for a coding agent. Keep the work small and staged. The
goal is not perfect astrodynamics. The goal is a fun, believable browser
simulation that works today and still works years from now.

## Goal

Add a new scenario, not a replacement for the current tuned Soyuz scenario:

```text
Live-ish Soyuz -> ISS
```

The new scenario should:

- place the planets roughly correctly for the selected date/time;
- place the Moon roughly correctly for the selected date/time;
- use SGP4 for ISS when a bundled TLE is close enough to the selected date;
- fall back to a synthetic ISS-like orbit when the TLE is too old;
- launch from Baikonur after a computed launch window;
- let the rocket inherit Earth orbital velocity and launch-site rotation;
- use reusable rendezvous guidance;
- dock with ISS to about `0.1 m` and `0.1 m/s` by using a final docking capture
  mode.

Do not try to make a real mission planner. This is a visual simulator.

## What Not To Do

- Do not use network access at runtime.
- Do not require a dev server or build step.
- Do not fetch scenario data from JSON at runtime.
- Do not replace the existing `soyuz-iss-baikonur` scenario in the first patch.
- Do not rely on one old TLE for dates many months or years away.
- Do not try to implement a full Lambert solver or professional rendezvous
  planner.
- Do not open `node_modules`, `vendor`, texture folders, or `package-lock.json`
  unless a task explicitly needs them.

## Files To Read First

Read only these first:

- `AGENTS.md`
- `simulator_3d/src/scenarios/scenarios.js`
- `simulator_3d/src/data/horizons-2026-05-01.js`
- `simulator_3d/src/physics-classic.js`
- `simulator_3d/src/rocket-classic.js`
- `simulator_3d/src/attitude.js`
- `simulator_3d/src/missions/mission-builder.js`
- `simulator_3d/src/missions/target-profiles.js`
- `simulator_3d/src/missions/program-templates.js`
- `simulator_3d/tests/harness.js`
- `simulator_3d/tests/soyuz-iss.test.js`

Open only if needed:

- `simulator_3d/src/app-classic.js` for browser scenario setup, ISS updates,
  launch-window flow, readouts, and overlays.
- `simulator_3d/src/time-format.js` for countdown/status text.
- `simulator_3d/src/styles.css` only for UI styling.
- `simulator_3d/src/mesh-factory.js` only for visual docking markers or ISS /
  rocket mesh changes.

Useful search commands:

```sh
rg -n "ISS|soyuz-iss|launchWindow|preLaunchWindow|missionStatus|docked" simulator_3d/src simulator_3d/tests
rg -n "createInitialBodies|initialState|vectors|absolute|horizons" simulator_3d/src
rg -n "createMissionState|updateRocketBeforePhysics|updateRocketAfterPhysics|surfaceState|missionTime" simulator_3d/src/rocket-classic.js
```

## Recommended Architecture

Add small modules instead of growing `app-classic.js` or `scenario-data.js`.

Suggested new files:

- `simulator_3d/src/ephemeris.js`
- `simulator_3d/src/iss-orbit.js`
- `simulator_3d/src/launch-window.js`
- `simulator_3d/src/rendezvous-guidance.js`

Keep `scenario-data.js` as a compatibility facade.

## Stage 1 - Date-Based Ephemeris

Purpose: create approximate planet and Moon states for any selected date/time.

Implement:

- Julian date helper.
- Analytic approximate planet positions from orbital elements.
- Approximate Moon position around Earth.
- Return SI-unit body states compatible with `physics-classic.js`.

Accuracy target:

- Earth should be roughly `1 AU` from Sun.
- Moon should be roughly `360000-410000 km` from Earth.
- Planet positions should look plausible, not NASA-perfect.

Good enough is fine. This is for fun.

Files:

- `simulator_3d/src/ephemeris.js`
- `simulator_3d/src/physics-classic.js`
- `simulator_3d/src/scenarios/scenarios.js`
- `simulator_3d/tests/soyuz-iss.test.js` or a new focused test

## Stage 2 - ISS State For The Same Date

Purpose: place ISS in the same Earth-centered frame as the selected date.

Implement:

- Bundled TLE list for a few known dates.
- Pick the nearest TLE if it is recent enough.
- Use vendored `satellite.js` in the browser path when available.
- In tests, either provide a small Node-compatible helper or use synthetic mode.
- If the date is too far from bundled TLE data, use synthetic ISS mode.

Synthetic ISS mode:

- altitude: about `408-420 km`;
- inclination: `51.6 deg`;
- near-circular orbit;
- deterministic phase from the selected date;
- no network;
- valid for dates like `today + 10 years`.

Important:

- Do not let SGP4 overwrite a scripted scenario unless that scenario explicitly
  asks for live-ish ISS.
- ISS position should be relative to Earth, then added to Earth position.
- ISS velocity should include Earth velocity.

Files:

- `simulator_3d/src/iss-orbit.js`
- `simulator_3d/src/app-classic.js` only for browser integration
- `simulator_3d/src/physics-classic.js`
- tests

## Stage 3 - New Scenario

Purpose: add the new live-ish scenario without breaking old missions.

Add a scenario like:

```js
{
  id: "live-ish-soyuz-iss",
  label: "Live-ish Soyuz -> ISS",
  initialState: {
    type: "ephemeris",
    dateTime: "now",
    includeBodies: ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "ISS"]
  },
  mission: {
    launchSiteId: "baikonur",
    targetProfileId: "soyuz-iss-live-ish"
  }
}
```

It is okay to start tests with fixed dates instead of real `Date.now()`.

Files:

- `simulator_3d/src/scenarios/scenarios.js`
- `simulator_3d/src/missions/target-profiles.js`
- `simulator_3d/src/missions/mission-builder.js`
- `simulator_3d/src/physics-classic.js`

## Stage 4 - Launch Window

Purpose: wait until Baikonur is in the ISS orbital plane.

Implement:

- Given launch site, Earth rotation, and ISS orbital plane, compute wait time.
- The result should normally be less than `24h`.
- During wait, Earth rotates and ISS moves.
- At launch, create the rocket on the launch site.

Rocket initial velocity must include:

- Earth orbital velocity around the Sun;
- Earth rotation velocity at Baikonur;
- whatever launch program adds after engine ignition.

Files:

- `simulator_3d/src/launch-window.js`
- `simulator_3d/src/rocket-classic.js`
- `simulator_3d/src/app-classic.js`
- tests

## Stage 5 - Rendezvous Guidance

Purpose: stop relying only on fixed timed burns.

Add optional mission metadata:

```js
rendezvous: {
  targetBody: "ISS",
  terminalStartDistanceM: 25000,
  dockDistanceM: 0.1,
  dockSpeedMps: 0.1,
  maxGuidanceAccelerationMps2: 0.08,
  reserveFuelKg: 1000
}
```

Guidance phases:

- `launch-window`: waiting for plane alignment;
- `ascent`: normal launch program;
- `phasing`: lower orbit catches up, higher orbit falls back;
- `transfer`: move toward target orbit;
- `terminal`: from about `25 km`, control relative velocity;
- `capture`: inside about `1 m`, lock to docking point if speed is low enough;
- `docked`: rocket stays attached to ISS.

Keep the first version simple. The phasing logic can be rough. The terminal
controller is more important for visible success.

Files:

- `simulator_3d/src/rendezvous-guidance.js`
- `simulator_3d/src/rocket-classic.js`
- `simulator_3d/src/attitude.js` only if a new attitude mode is needed
- tests

## Stage 6 - Terminal Autopilot

Use relative motion:

```js
r = target.position - rocket.position
v = target.velocity - rocket.velocity
distance = length(r)
relativeSpeed = length(v)
```

Desired closing speed:

- `25 km -> 5 km`: about `8 m/s`;
- `5 km -> 500 m`: about `2 m/s`;
- `500 m -> 50 m`: about `0.3 m/s`;
- `50 m -> 1 m`: about `0.05-0.1 m/s`;
- below `1 m`: match velocity and enter capture if safe.

Basic controller:

```js
desiredRelativeVelocity = normalize(r) * desiredClosingSpeed
dv = desiredRelativeVelocity - currentRelativeVelocity
acceleration = clampMagnitude(dv / tau, maxGuidanceAccelerationMps2)
```

Apply this through the rocket fuel/thrust model if practical. If that is too
large for the first patch, apply a low-thrust guidance acceleration in
`rocket-classic.js` and consume fuel consistently.

Docking success:

- distance `< 0.1 m`;
- relative speed `< 0.1 m/s`;
- fuel non-negative;
- set mission state to `docked`;
- after docking, lock rocket to an ISS-relative docking point so it does not
  drift away due to numerical noise.

## Stage 7 - Browser Readouts

Keep UI work small. Reuse current readout fields when possible.

Useful statuses:

- `Waiting for launch window`
- `Launching`
- `Phasing orbit`
- `Transfer to ISS orbit`
- `Final approach`
- `Matching ISS velocity`
- `Docked`

Files:

- `simulator_3d/src/app-classic.js`
- `simulator_3d/src/time-format.js`
- `simulator_3d/src/styles.css` only if needed

## Test Dates

Do not use floating `Date.now()` in tests. Use a fixed base date and offsets.

Suggested set:

- base date, for example `2026-05-04T00:00:00Z`;
- `+1 day`;
- `+30 days`;
- `+180 days`;
- `+1 year`;
- `+5 years`;
- `+10 years`;
- one fixed winter date;
- one fixed summer date.

## Required Tests

For every test date:

- no `NaN` in body positions or velocities;
- Earth is roughly `1 AU` from Sun;
- Moon is roughly `360000-410000 km` from Earth;
- ISS altitude is roughly `380-460 km`;
- ISS inclination is roughly `51.6 deg`;
- launch window exists and is `< 24h`;
- rocket initial velocity includes Earth velocity and launch-site rotation;
- rocket reaches orbit without hitting Earth.

At least one synthetic ISS rendezvous test:

- start a full live-ish Soyuz mission;
- guidance reaches ISS;
- final distance `< 0.1 m`;
- final relative speed `< 0.1 m/s`;
- mission state is `docked`;
- fuel is not negative.

Run:

```sh
cd simulator_3d
npm test
```

## Suggested Patch Order

Do not do all of this in one patch.

1. Add `ephemeris.js` and tests for planet/Moon sanity.
2. Add `iss-orbit.js` and tests for SGP4-or-synthetic ISS sanity.
3. Add the new `live-ish-soyuz-iss` scenario.
4. Add launch-window helper and tests.
5. Add terminal guidance and docking capture.
6. Add rough phasing guidance.
7. Add browser readout/status polish.

Each patch should keep the old scenarios working.

