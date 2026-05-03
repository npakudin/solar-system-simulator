# Modularization Plan for planets3d Simulator

## Problem Statement

The codebase has three large monolithic files totalling ~3600 lines. The main issues:

1. **`system.x / system.y / system.z` pattern repeated 120+ times** across all files — no unified Vector3 type
2. **Global coupling via `window.*`** — modules communicate through `window.SolarPhysics`, `window.RocketSim`, etc., with no type safety
3. **Duplicated math utilities** — `distance()`, `normalize()`, `cross()` defined in both `physics-classic.js` and `rocket-classic.js`
4. **No body lookup abstraction** — `.find(b => b.name === 'Earth')` repeated 20+ times
5. **Monolithic `animate()` loop** — physics, ISS, rocket, pellets, camera, UI readouts all in one 68-line function
6. **Hardcoded constants scattered across files** — `G = 6.67408e-11` appears in two files, time scales hardcoded in `app-classic.js`

---

## Refactoring Steps

Each step is independent enough to do in isolation. Estimated LLM context reduction after each step is noted.

---

### Step 1: Extract `vec3.js` — Vector3 Math Module

**Why first:** Eliminates the most repeated pattern (120+ occurrences). All other modules depend on math, so this unblocks clean refactors later.

**What to create:** `src/vec3.js` — a lightweight module with pure functions:

```javascript
// All functions take plain {x, y, z} objects, return new {x, y, z}
export function add(a, b)       // a + b
export function sub(a, b)       // a - b
export function scale(v, s)     // v * scalar
export function dot(a, b)       // scalar dot product
export function cross(a, b)     // cross product → {x, y, z}
export function len(v)          // magnitude
export function dist(a, b)      // distance between two points
export function norm(v)         // normalize → unit vector
export function lerp(a, b, t)   // linear interpolation
```

**Migration approach:**
- Replace inline `Math.sqrt(dx*dx + dy*dy + dz*dz)` with `vec3.dist(a, b)`
- Replace `v.x += w.x; v.y += w.y; v.z += w.z` with `Object.assign(v, vec3.add(v, w))`
- Replace manual cross products in `attitudeDirection()` and `siteSurfaceVectorGeneral()`

**Files affected:** `physics-classic.js`, `rocket-classic.js`, `app-classic.js`

**Context reduction:** ~80-120 lines removed across files (many 3-line blocks become 1-line calls)

---

### Step 2: Extract `constants.js` — Shared Physical Constants

**Why:** `G = 6.67408e-11` is hardcoded in two files independently. Time constants (`DAY`, `TWO_PI`) are duplicated.

**What to create:** `src/constants.js`:

```javascript
export const G        = 6.67408e-11;   // gravitational constant
export const DAY_S    = 86400;         // seconds per day
export const TWO_PI   = Math.PI * 2;
export const DEG2RAD  = Math.PI / 180;
export const RAD2DEG  = 180 / Math.PI;
```

**Files affected:** `physics-classic.js` (line 2-3), `rocket-classic.js` (line 4, and inline G on line 456), `app-classic.js` (line 4)

**Context reduction:** Minimal line reduction but prevents divergence bugs.

---

### Step 3: Extract `body-index.js` — Body Lookup Abstraction

**Why:** `.find(b => b.name === 'Earth')` appears 20+ times. A typo in a body name fails silently at runtime.

**What to create:** `src/body-index.js`:

```javascript
export class BodyIndex {
  constructor(bodies) {
    this._map = new Map(bodies.map(b => [b.name, b]));
  }

  get(name) {
    const b = this._map.get(name);
    if (!b) throw new Error(`Body not found: ${name}`);
    return b;
  }

  has(name) { return this._map.has(name); }

  // Convenience getters for frequently accessed bodies
  get earth()  { return this.get('Earth'); }
  get moon()   { return this.get('Moon'); }
  get sun()    { return this.get('Sun'); }
}
```

**Migration:** Pass a `BodyIndex` instance instead of `bodies` array where body lookups occur.

**Files affected:** `physics-classic.js`, `rocket-classic.js`, `app-classic.js`

**Context reduction:** ~20 scattered `.find()` calls become clean property accesses

---

### Step 4: Extract `attitude.js` — Attitude Mode System

**Why:** `attitudeDirection()` in `rocket-classic.js` (lines 504–551) is a 48-line if-else chain with 6 modes. Each mode is not independently testable.

**What to create:** `src/attitude.js` with one function per mode:

```javascript
// Each returns a unit vector {x, y, z}
export function prograde(rocket)
export function retrograde(rocket)
export function targetBody(rocket, target, bodyIndex)
export function pitchProgram(rocket, angle, bodyIndex)
export function rtn(rocket, component)          // radial / transverse / normal
export function surfaceUp(rocket, bodyIndex)

// Dispatcher (replaces the if-else chain)
export function attitudeDirection(rocket, command, bodyIndex)
```

**Files affected:** `rocket-classic.js` (primary), `app-classic.js` (indirectly)

**Context reduction:** Breaks 48-line monolith into 6 focused 6-8 line functions. Each is unit-testable.

---

### Step 5: Extract `time-format.js` — Time Formatting Utilities

**Why:** Three nearly identical h/m/s breakdown functions exist in `app-classic.js` (lines 1508–1532). Minor variation in output format is the only difference.

**What to create:** `src/time-format.js`:

```javascript
export function formatDuration(totalSeconds)      // "2h 15m 30s"
export function formatElapsedTime(totalSeconds)   // "1y 45d 2h 15m 30s"
export function formatCountdown(totalSeconds)     // "-0:15:30"
```

**Files affected:** `app-classic.js`

**Context reduction:** ~25 lines consolidated into one module

---

### Step 6: Extract `readouts.js` — UI Readout Registry

**Why:** `updateReadouts()` and `updateMissionReadouts()` (app-classic.js lines 1388–1493) sync 15+ DOM elements in one monolithic function. Adding a readout requires modifying a large function.

**What to create:** `src/readouts.js` — a registry pattern:

```javascript
export function createReadoutRegistry(state) {
  const registry = [
    { el: '#elapsed-time',    value: () => state.elapsedSeconds,      format: formatElapsedTime },
    { el: '#rocket-speed',    value: () => getRocketSpeed(state),      format: formatSpeed },
    { el: '#apoapsis',        value: () => state.mission.apoapsis,     format: formatDistance },
    // ... one line per readout
  ];

  return {
    update() {
      for (const r of registry) {
        const el = document.querySelector(r.el);
        if (el) el.textContent = r.format(r.value());
      }
    }
  };
}
```

**Files affected:** `app-classic.js`

**Context reduction:** ~100 lines (the two `update*Readouts` functions) replaced by a declarative list

---

### Step 7: Split `app-classic.js` — Break Up the Animate Loop

**Why:** The `animate()` loop (lines 540–608) mixes timing, physics, ISS SGP4, rocket state, pellets, UI, and camera. Every new feature adds to it.

**What to do — extract into named sub-functions within `app-classic.js`:**

```javascript
function stepPhysics(dt)       // RK4 substeps, body gravity
function stepRocket(dt)        // rocket engine + attitude
function stepISS()             // SGP4 TLE propagation
function stepPellets(dt)       // exhaust particle updates
function checkLaunchWindow()   // open/close launch window
function checkLanding()        // detect rocket touchdown
function syncMeshes()          // THREE.js mesh positions from bodies
function syncCamera()          // camera follow / orbit
function syncReadouts()        // DOM readout update

function animate() {
  // 15 lines: compute dt, call each step, request frame
}
```

**Files affected:** `app-classic.js` only (internal reorganization, no new files needed)

**Context reduction:** `animate()` shrinks from 68 to ~15 lines. Each sub-function is independently readable.

---

### Step 8: Split `createBodyMesh()` — Mesh Factory per Body Type

**Why:** `createBodyMesh()` (app-classic.js lines 927–981) has 7 branches for Rocket, Sun, Saturn, ISS, Moon, Earth, and generic planets.

**What to do:** Extract into small factory functions inside `app-classic.js` or a new `src/mesh-factory.js`:

```javascript
function createRocketMesh(body)    // cone + cylinder + flame group
function createSunMesh(body)       // sphere + sun texture + emissive
function createSaturnMesh(body)    // sphere + ring + shadow planes
function createPlanetMesh(body)    // generic sphere + texture + ellipsoid
function createISSMarker(body)     // small sphere marker

function createBodyMesh(body) {
  // 10 lines: dispatch to the right factory
}
```

**Files affected:** `app-classic.js` only

**Context reduction:** Main dispatcher shrinks to ~10 lines; each factory is 10-15 lines

---

### Step 9: Replace `window.*` Globals with ES Module Imports

**Why:** Global coupling via `window.SolarPhysics`, `window.RocketSim`, `window.Missions` is fragile — load order matters, types are unchecked, names can clash.

**Prerequisite:** Steps 1–8 create the module foundations.

**Migration approach:**
1. Add `type="module"` to script tags in `index.html`
2. Replace `window.SolarScenarioData = {...}` with `export const SolarScenarioData = {...}`
3. Replace `window.SolarPhysics = {...}` with `export const SolarPhysics = {...}`
4. Update `app-classic.js` to `import { SolarPhysics } from './physics-classic.js'` etc.
5. Update `harness.js` to use ES module imports instead of explicit script loading

**Files affected:** `index.html`, all `.js` files

**Context reduction:** Eliminates 15+ `window.*` assignments; load ordering becomes implicit in imports

---

## Recommended Order

| Priority | Step | Effort | Context Reduction |
|----------|------|--------|-------------------|
| 1 | Step 1: vec3.js | Medium | High (120+ lines) |
| 2 | Step 2: constants.js | Low | Low (prevents bugs) |
| 3 | Step 7: Split animate() | Low | Medium (internal only) |
| 4 | Step 3: body-index.js | Low | Medium (20 lookups) |
| 5 | Step 5: time-format.js | Low | Low (25 lines) |
| 6 | Step 6: readouts.js | Medium | High (100 lines) |
| 7 | Step 4: attitude.js | Medium | Medium (48-line block) |
| 8 | Step 8: mesh factory | Low | Medium (45 lines) |
| 9 | Step 9: ES modules | High | High (global coupling) |

---

## What NOT to Do

- **Don't introduce a class hierarchy for bodies** — the flat `{name, mass, radius, position, velocity}` shape is easy to serialize and test
- **Don't use TypeScript yet** — too much churn for a solo project; JSDoc types on key functions are sufficient
- **Don't abstract the THREE.js render loop** — THREE.js APIs change enough that a wrapper creates maintenance debt

---

## Step 10: Remove Pellets

**Why:** Pellets (exhaust particle effects) were tried and didn't pay off. They add complexity to the animate loop, memory for the buffer, and fields in every vehicle definition — for zero gameplay value.

**What to delete:**
- All code in `app-classic.js` touching `pellets` / `updatePellets` / `visualPellets*`
- In `rocket-classic.js`: the `updatePellets()` function and anything feeding it
- In vehicle definitions in `baikonur-demo.js`: remove four fields from `baseVehicle`:
  ```js
  visualPelletsPerSecond: 180,   // delete
  visualPelletTtlSeconds: 90,    // delete
  visualPelletSpeedScale: 0.04,  // delete
  visualPelletConeDeg: 9         // delete
  ```
  Same in `heavyVehicle` (`visualPelletsPerSecond: 220` → delete).

**Files affected:** `app-classic.js`, `rocket-classic.js`, `baikonur-demo.js`

**Context reduction:** ~80-120 lines removed; vehicle definitions shrink by 4 fields each

---

## Step 11: Consolidate Data — Kill the Zombie JSON Files

**Problem:** There are TWO parallel data systems that have diverged:

| Source | Used by | Status |
|--------|---------|--------|
| `src/data/body-catalog.json` | Unknown — not loaded by any script tag in index.html | **Dead / orphaned** |
| `src/data/scenarios.json` | Unknown — not loaded by any script tag in index.html | **Dead / diverged** |
| `src/data/launch-sites.json` | Unknown — not loaded by any script tag in index.html | **Dead / incomplete** |
| `scenario-data.js` | `app-classic.js` via `window.SolarScenarioData` | **Live** |
| `baikonur-demo.js` | `app-classic.js` via `window.RocketLaunchConfig` | **Live** |

**Specific divergences between the dead JSON and live JS:**

1. `body-catalog.json` is missing ISS entirely; `scenario-data.js` has it
2. `launch-sites.json` has 11 sites but no `altitudeM`, `defaultHeadingDeg`, `notes` fields; `baikonur-demo.js` has 7 sites with those fields
3. `scenarios.json` default is `"jupiter-gravity-assist-handcrafted"`; `scenario-data.js` default is `"soyuz-iss-baikonur"`
4. ISS initial position differs: JSON has `[6791000, 0, 0]` (equatorial), JS has `[2837000, 4119000, 4578000]` (inclined orbit matching Soyuz plane)
5. State vectors in `scenarios.json` are embedded inline in 3 separate scenarios; `scenario-data.js` correctly extracts them into `real20260501Bodies` const

**Action:** Delete all three JSON files. The live JS files are the correct source of truth.

```
rm simulator_3d/src/data/body-catalog.json
rm simulator_3d/src/data/scenarios.json
rm simulator_3d/src/data/launch-sites.json
```

---

## Step 12: Eliminate Duplicate State Vectors in `scenario-data.js`

**Problem:** The 2026-05-01 Horizons state vectors (`real20260501Bodies`) are correctly extracted into a constant in `scenario-data.js`. But `sim-assets/parameters/horizons_state_vectors_2026-05-01.json` exists as a separate reference file. Meanwhile inside `scenario-data.js` itself, the ISS entry in `real20260501Bodies` is a hardcoded placeholder (line 166–169) that is immediately overwritten by SGP4 at runtime — it's just noise.

**Actions:**
1. Remove the ISS placeholder from `real20260501Bodies` — the array feeds heliocentric scenarios where ISS is irrelevant. When ISS is needed in a scenario, it's added explicitly in `initialState.bodies`.
2. Keep `horizons_state_vectors_2026-05-01.json` as a reference/audit file (it's in `sim-assets/parameters/`, not loaded at runtime).

**Files affected:** `scenario-data.js` lines 164–170 (delete ISS entry from `real20260501Bodies`)

---

## Step 13: Merge `baikonur-demo.js` into `scenario-data.js`

**Problem:** `baikonur-demo.js` is not a "demo" — it's half the app's mission data. It reads `window.SolarScenarioData` at the top of the IIFE (line 4), meaning it must load after `scenario-data.js`. They're tightly coupled.

**What to merge:**
- `launchSites` array → move into `scenario-data.js`
- `baseVehicle` / `heavyVehicle` definitions → move into `scenario-data.js`
- `targetProfiles` array → move into `scenario-data.js`
- `buildMission()`, `resolveHeading()`, `buildProgram()` functions → move into `scenario-data.js`
- Export everything via `window.SolarScenarioData` (or `window.RocketLaunchConfig` — pick one)

**Why acceptable to inline:** The user confirmed "Один фиг чтобы эти json править надо код править" — there's no benefit to the JSON/JS split since both require code changes.

**Result:** One `scenario-data.js` file (~600 lines) containing all scenario and mission data. Delete `baikonur-demo.js`. Update `index.html` to remove its script tag.

---

## Step 14: Deduplicate Launch Programs — Extract Shared Templates

**Problem:** In `baikonur-demo.js`, five missions share an identical liftoff + gravity turn sequence (lines 450–470 in `lunar-orbit`, `artemis-2`, `lunar-landing`, `apollo-11`, and the default LEO template). Only the *later* maneuvers differ.

**Identical block in all five:**
```js
{ name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
{ name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
  { t: 28, pitchDeg: 88 },
  { t: 80, pitchDeg: 72 },
  { t: 150, pitchDeg: 38 },
  { t: 280, pitchDeg: 4 }
] } },
{ name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
{ name: "circularize LEO: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
{ name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
```

**Solution:** Extract helper functions inside `buildProgram()`:

```js
function leoPhase(headingDeg) {
  return [
    { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
    { name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
      { t: 28, pitchDeg: 88 }, { t: 80, pitchDeg: 72 }, { t: 150, pitchDeg: 38 }, { t: 280, pitchDeg: 4 }
    ] } },
    { name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
    { name: "circularize LEO: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
  ];
}

function tliPhase() {
  return [
    { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
    { name: "coast to Moon — 5 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
  ];
}

function loiPhase() {
  return [
    { name: "LOI burn — enter lunar orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
    { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
  ];
}
```

Then each program becomes a composition:
```js
// lunar-orbit
return [...leoPhase(headingDeg), ...tliPhase(), ...loiPhase(),
  { name: "circularize LLO...", ... }
];

// lunar-landing
return [...leoPhase(headingDeg), ...tliPhase(), ...loiPhase(),
  { name: "DOI...", ... },
  { name: "PDI...", ... }
];
```

**Context reduction:** ~60 lines of repetition eliminated in `buildProgram()`

---

## Revised Priority Table

| Priority | Step | Effort | Impact |
|----------|------|--------|--------|
| 1 | Step 10: Remove pellets | Low | Simplicity |
| 2 | Step 11: Delete zombie JSON files | Low | No dead code |
| 3 | Step 12: Remove ISS from real20260501Bodies | Trivial | Clean data |
| 4 | Step 13: Merge baikonur-demo into scenario-data | Medium | One data file |
| 5 | Step 14: Extract program templates | Low | -60 lines |
| 6 | Step 1: vec3.js | Medium | -120 lines |
| 7 | Step 2: constants.js | Low | Bug prevention |
| 8 | Step 7: Split animate() | Low | Readability |
| 9 | Step 3: body-index.js | Low | -20 lookups |
| 10 | Step 5: time-format.js | Low | -25 lines |
| 11 | Step 6: readouts.js | Medium | -100 lines |
| 12 | Step 4: attitude.js | Medium | Testability |
| 13 | Step 8: mesh factory | Low | Readability |
| 14 | Step 9: ES modules | High | Clean coupling |

---

## File Size Targets After Refactoring

| File | Current | Target |
|------|---------|--------|
| `app-classic.js` | 1,686 lines | ~900 lines |
| `rocket-classic.js` | 857 lines | ~650 lines |
| `physics-classic.js` | 461 lines | ~400 lines |
| `scenario-data.js` | 483 lines | unchanged |
| `vec3.js` (new) | — | ~60 lines |
| `attitude.js` (new) | — | ~80 lines |
| `body-index.js` (new) | — | ~30 lines |
| `constants.js` (new) | — | ~15 lines |
| `time-format.js` (new) | — | ~30 lines |
| `readouts.js` (new) | — | ~50 lines |
