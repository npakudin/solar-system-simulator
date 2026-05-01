# Realistic Missions Design

**Date:** 2026-05-01  
**Scope:** Realistic orbital missions, ISS as flying object, Moon surface collision, Earth splashdown, historical missions

---

## 1. Overview

Add 10+ realistic missions with accurate orbital mechanics, ISS as a live object positioned via SGP4, Moon heightmap for landing collision, and Earth splashdown detection.

---

## 2. Feature List

| # | Feature | Priority |
|---|---------|----------|
| 1 | Moon bumpMap (LDEM texture) | Quick win |
| 2 | ISS as SGP4-propagated object | Foundation |
| 3 | ISS orbit from Baikonur (7 maneuvers) | Core mission |
| 4 | ISS orbit from KSC (Crew Dragon) | Core mission |
| 5 | Lunar orbit mission | Core mission |
| 6 | Artemis II flyby (April 2026) | Core mission |
| 7 | Lunar landing with LDEM collision | Core mission |
| 8 | Earth splashdown mechanic | New mechanic |
| 9 | Jupiter gravity assist → return to Earth | Core mission |
| 10 | Vostok 1 (Gagarin 1961) | Historical |
| 11 | Apollo 11 (Moon landing 1969) | Historical |
| 12 | Voyager 2 (grand tour 1977) | Historical |

---

## 3. Architecture Changes

### 3.1 ISS Object (satellite.js SGP4)

**Library:** `vendor/satellite.js` — JS port of SGP4/SDP4, ~50KB, no dependencies.

**Position source (priority order):**
1. `GET https://api.wheretheiss.at/v1/satellites/25544` — timeout 1s
2. Fallback: hardcoded TLE for 2026-05-01, propagate to `Date.now()`

**Object type:** new body category `"satellite"`:
```js
{
  name: "ISS",
  type: "satellite",       // no gravitational influence
  tleLine1: "...",
  tleLine2: "...",
  color: "#ffffff",
  radius: 50,              // visual only, ~50m exaggerated
  satrec: null,            // satellite.js record, populated at init
}
```

**Update loop:** each simulation step, call `satellite.propagate(satrec, date)` → ECI position → convert to simulation frame.

**Coordinate transform (ECI → simulation):**
- ECI origin: Earth center, J2000 epoch
- Simulation frame for Earth scenarios: Earth-centered Cartesian (same axes as ECI)
- Only need to account for epoch offset: `simTime = scenarioEpoch + simulatedSeconds`

### 3.2 Moon bumpMap

In `app-classic.js` `createBodyMesh()`, for Moon:
```js
material.bumpMap = textures['Moon_LDEM'];
material.bumpScale = 0.02;
```
Load `moon_ldem_3_8bit.jpg` alongside existing `moon.jpg`.

### 3.3 LDEM Collision Detection

When rocket reaches Moon proximity:
1. Compute lat/lon of rocket relative to Moon center
2. Sample LDEM texture pixel at (lon, lat) → brightness 0–255
3. LDEM height range: −9150m to +10784m (LRO data)
4. `terrainHeight = (pixel / 255) * 19934 - 9150`
5. `surfaceRadius = MOON_RADIUS + terrainHeight`
6. Collision: `distance(rocket, moonCenter) <= surfaceRadius`
7. Landing speed: `dot(velocity, surfaceNormal)` (radial component)
   - `< 5 m/s` → "Soft landing ✓"
   - `>= 5 m/s` → "Impact — mission failed"

LDEM texture reading: render to offscreen canvas once at load, then `getImageData()` for pixel lookup.

### 3.4 Earth Splashdown

Same approach as Moon collision:
- Radius check: `distance(rocket, earthCenter) <= EARTH_RADIUS + 10`
- Speed check (radial):
  - `< 10 m/s` → "Splashdown ✓" (parachute assumed)
  - `>= 100 m/s` → "Reentry burn — mission failed"
  - Between: "Hard landing"

---

## 4. Mission Specifications

### 4.1 Soyuz → ISS from Baikonur

**Launch site:** Baikonur (51.6°N, 76.0°E)  
**Target orbit:** 420 km circular, 51.6° inclination  
**Duration:** ~6 hours sim time (time scale ×100 = ~3.6 min playback)

| # | Name | Time | ΔV | Attitude |
|---|------|------|----|----------|
| 1 | Vertical climb | 0–28s | ~1500 m/s | surface-up |
| 2 | Gravity turn | 28–280s | ~6000 m/s | pitch-program 88°→4° |
| 3 | MECO + coast | 280–400s | — | prograde |
| 4 | Parking orbit circularize | 400–450s | ~63 m/s | prograde |
| 5 | Hohmann burn #1 (200→420 km) | at next perigee | ~63 m/s | prograde |
| 6 | Hohmann burn #2 (circularize) | at apogee | ~63 m/s | prograde |
| 7 | Phase / rendezvous approach | varies | ~1–5 m/s | toward ISS |

**Plane correction:** Baikonur latitude = ISS inclination = 51.6° — launches naturally into correct plane, no plane change needed.

### 4.2 Crew Dragon → ISS from KSC

**Launch site:** Kennedy Space Center (28.5°N, 80.6°W)  
**Target orbit:** 420 km, 51.6° inclination  
**Note:** KSC launches on azimuth ~45° NNE to reach 51.6° incl directly — no plane change burn needed, handled by launch azimuth.

Same maneuver sequence as 4.1 but with different gravity turn heading (NNE vs NE from Baikonur).

### 4.3 Lunar Orbit Mission

**Launch:** Baikonur  
**Target:** 100 km circular lunar orbit

| # | Name | ΔV |
|---|------|----|
| 1–2 | Launch + LEO (same as 4.1 steps 1–4) | ~9500 m/s |
| 3 | Trans-Lunar Injection (TLI) | ~3150 m/s |
| 4 | Coast 3 days | — |
| 5 | Lunar Orbit Insertion (LOI) | ~900 m/s |
| 6 | Circularization | ~50 m/s |

### 4.4 Artemis II — Lunar Flyby (April 2026)

**Trajectory type:** Free-return trajectory (no LOI burn)  
**Key events:**
- T+0: Launch from KSC, 2026-04-01
- T+3 days: TLI burn (~3150 m/s)
- T+6 days (2026-04-06 23:00 UTC): Closest approach, 6545 km above far-side surface
- T+10 days (2026-04-10): Pacific splashdown

**Maneuvers:**
1. Launch + LEO insertion
2. TLI (prograde)
3. Course correction #1 (MCC-1, small, ~5 m/s)
4. Course correction #2 (MCC-2, ~2 m/s)
5. Coast through lunar flyby (no burn — free return)
6. Entry Interface at Earth (~10 km altitude, ~11 km/s → splashdown mechanic triggers)

### 4.5 Lunar Landing

**Based on Apollo-style direct descent**

| # | Name | ΔV |
|---|------|----|
| 1–5 | Launch + TLI + LOI (same as 4.3) | |
| 6 | Descent Orbit Insertion | ~50 m/s |
| 7 | Powered Descent Initiation | ~1600 m/s |
| 8 | Terminal descent (hover & land) | ~10 m/s |

**Collision:** LDEM heightmap (see §3.3)

### 4.6 Jupiter Gravity Assist → Return to Earth

**Trajectory:** Earth → Jupiter flyby → return to Earth (similar to Voyager but closing)  
**Duration:** ~5 years total, time scale ×1M

| # | Name | ΔV |
|---|------|----|
| 1 | Launch from Earth | ~11 km/s |
| 2 | Earth escape burn | ~650 m/s |
| 3 | Course correction | ~20 m/s |
| 4 | Jupiter flyby (no burn — gravity assist) | 0 |
| 5 | Return course correction | ~50 m/s |
| 6 | Earth arrival (splashdown) | — |

**Gravity assist geometry:** approach Jupiter on trailing side → velocity adds to spacecraft (slingshot). Fine-tune approach distance in scenario data to achieve closed Earth-return trajectory.

### 4.7 Vostok 1 — Gagarin (1961-04-12)

**Type:** Single-orbit LEO flight, 108 minutes  
**Orbit:** 181 × 327 km, 64.95° inclination  
**Landing:** Parachute ejection at 108 min (triggers Earth landing mechanic)

| # | Name | Duration |
|---|------|----------|
| 1 | Vertical + gravity turn | 0–120s |
| 2 | Stage 2 burn | 120–300s |
| 3 | 1 orbit coast | 300–6780s |
| 4 | Retro burn (deorbit) | ~6780s, 45s, retrograde |
| 5 | Coast + reentry | → landing mechanic |

### 4.8 Apollo 11 (1969-07-16)

**Full mission:** LEO → TLI → LOI → landing → ascent → TEI → splashdown

| # | Name |
|---|------|
| 1–2 | Launch from KSC + LEO |
| 3 | TLI |
| 4 | LOI |
| 5 | DOI + PDI (powered descent) |
| 6 | Lunar surface (static, 21h) |
| 7 | Ascent to LLO |
| 8 | CSM rendezvous |
| 9 | Trans-Earth Injection (TEI) |
| 10 | Course corrections |
| 11 | Pacific splashdown |

### 4.9 Voyager 2 Grand Tour (1977)

**Targets:** Jupiter → Saturn → Uranus → Neptune  
**Type:** Gravity assist chain, no return  
**Duration:** 12 years to Neptune, time scale ×10M

Uses existing `jupiter-gravity-assist-handcrafted` scenario as base, extend with Saturn/Uranus/Neptune.

---

## 5. Data Sources

| Data | Source |
|------|--------|
| ISS TLE (2026-05-01) | CelesTrak / Space-Track hardcoded |
| ISS live position | `api.wheretheiss.at/v1/satellites/25544` |
| Artemis II trajectory | Approximate from NASA press kit (6 key waypoints) |
| Apollo 11 trajectory | NASA mission report (burn times + ΔV) |
| Vostok 1 parameters | Wikipedia + Astronautix |
| Voyager 2 | NASA JPL Horizons (already in project) |
| Moon LDEM | `moon_ldem_3_8bit.jpg` (already in project) |
| Planet positions | `horizons_state_vectors_2026-05-01.json` (already in project) |

---

## 6. Success Criteria

- ISS object appears at correct real-world position at sim start
- Soyuz reaches 420 km / 51.6° orbit and visually approaches ISS
- Lunar lander touches down on visible crater rim vs flat mare (LDEM)
- Artemis II completes 10-day loop with flyby + Pacific splashdown
- Jupiter gravity assist changes trajectory to return toward Earth
- Voyager 2 visits all 4 outer planets
- Landing events show success/fail UI message based on speed
