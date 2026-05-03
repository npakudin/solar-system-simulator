export function buildProgram(profile, headingDeg) {
    if (profile.programTemplate === "moon") {
      return [
        { name: "liftoff: engine 0-80s", start: 0, end: 80, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "moon injection: engine 80-300s", start: 80, end: 300, throttle: 0.45, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 1", start: 300, end: 62000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 1: engine 62000-62120s", start: 62000, end: 62120, throttle: 0.04, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to correction 2", start: 62120, end: 145000, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "correction 2: engine 145000-145080s", start: 145000, end: 145080, throttle: 0.03, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "coast to Moon — final approach", start: 145080, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "LOI burn — enter lunar capture orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LLO (<=2R Moon): engine 434311-434380s", start: 434311, end: 434380, throttle: 0.12, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 434380, end: 450000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "geo") {
      return [
        { name: "vertical climb: engine 0-40s", start: 0, end: 40, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "parking orbit: engine 40-360s", start: 40, end: 360, throttle: 0.95, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 40, pitchDeg: 86 },
          { t: 120, pitchDeg: 58 },
          { t: 240, pitchDeg: 20 },
          { t: 360, pitchDeg: 0 }
        ] } },
        { name: "coast to apogee raise", start: 360, end: 1800, throttle: 0, attitude: { mode: "prograde" } },
        { name: "GTO burn: engine 1800-2200s", start: 1800, end: 2200, throttle: 0.38, attitude: { mode: "prograde" } },
        { name: "circularization demo: engine 18000-18300s", start: 18000, end: 18300, throttle: 0.18, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "interplanetary-note") {
      return [
        { name: "launch to parking orbit: engine 0-420s", start: 0, end: 420, throttle: 0.85, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 0, pitchDeg: 90 },
          { t: 120, pitchDeg: 55 },
          { t: 260, pitchDeg: 12 },
          { t: 420, pitchDeg: 0 }
        ] } },
        { name: "interplanetary injection: engine 2400-2900s", start: 2400, end: 2900, throttle: 0.35, attitude: { mode: "prograde" } },
        { name: "mid-course correction: engine 86400-86700s", start: 86400, end: 86700, throttle: 0.02, attitude: { mode: "target-body", target: "Jupiter", leadSeconds: 7.2e7 } }
      ];
    }

    if (profile.programTemplate === "soyuz-iss" || profile.programTemplate === "crew-dragon-iss") {
      return [
        { name: "vertical climb: engine 0-12s", start: 0, end: 12, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 12-170s", start: 12, end: 170, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 12,  pitchDeg: 87 },
          { t: 40,  pitchDeg: 70 },
          { t: 80,  pitchDeg: 42 },
          { t: 130, pitchDeg: 13 },
          { t: 170, pitchDeg: 0  }
        ] } },
        { name: "coast to natural apogee (~175km)", start: 170, end: 315, throttle: 0, attitude: { mode: "prograde" } },
        { name: "injection at apogee: raise to 408km", start: 315, end: 338, throttle: 0.9834, attitude: { mode: "prograde" } },
        { name: "coast to 408km apogee", start: 338, end: 3194, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize at 408km apogee: raise perigee", start: 3194, end: 3215, throttle: 0.0148, attitude: { mode: "prograde" } },
        { name: "coast in orbit", start: 3194, end: 6*3600, throttle: 0, attitude: { mode: "prograde" } },
      ];
    }

    function leoAscent(headingDeg) {
      return [
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-280s", start: 28, end: 280, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 38 },
          { t: 280, pitchDeg: 4 }
        ] } },
        { name: "coast to MECO", start: 280, end: 460, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize LEO: engine 460-530s", start: 460, end: 530, throttle: 0.18, attitude: { mode: "prograde" } },
      ];
    }

    function tliCoast() {
      return [
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast to Moon — 5 days", start: 620, end: 430704, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
      ];
    }

    function loiApproach() {
      return [
        { name: "LOI burn — enter lunar orbit: engine 430704-430900s", start: 430704, end: 430900, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 430900, end: 434311, throttle: 0, attitude: { mode: "prograde" } },
      ];
    }

    if (profile.programTemplate === "lunar-orbit") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "circularize LLO: engine 434311-434380s", start: 434311, end: 434380, throttle: 0.12, attitude: { mode: "retrograde" } },
        { name: "coast in lunar orbit", start: 434380, end: 450000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "artemis-2") {
      return [
        ...leoAscent(headingDeg),
        { name: "TLI burn: engine 530-620s", start: 530, end: 620, throttle: 0.9, attitude: { mode: "prograde" } },
        { name: "coast — free return trajectory", start: 620, end: 431220, throttle: 0, attitude: { mode: "target-body", target: "Moon", leadSeconds: 86400 } },
        { name: "MCC-1 correction: engine 431220-431225s", start: 431220, end: 431225, throttle: 0.1, attitude: { mode: "prograde" } },
        { name: "coast — return to Earth", start: 431225, end: 864000, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    if (profile.programTemplate === "lunar-landing") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "DOI — lower perilune: engine 434311-434330s", start: 434311, end: 434330, throttle: 0.1, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 434330, end: 437722, throttle: 0, attitude: { mode: "prograde" } },
        { name: "PDI — powered descent: engine 437722-437900s", start: 437722, end: 437900, throttle: 0.9, attitude: { mode: "retrograde" } }
      ];
    }

    if (profile.programTemplate === "vostok-1") {
      return [
        { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
        { name: "gravity turn: engine 28-295s", start: 28, end: 295, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
          { t: 28, pitchDeg: 88 },
          { t: 80, pitchDeg: 72 },
          { t: 150, pitchDeg: 42 },
          { t: 295, pitchDeg: 5 }
        ] } },
        { name: "coast to circularization", start: 295, end: 350, throttle: 0, attitude: { mode: "prograde" } },
        { name: "circularize: engine 350-420s", start: 350, end: 420, throttle: 0.18, attitude: { mode: "prograde" } },
        { name: "1 orbit coast", start: 420, end: 5786, throttle: 0, attitude: { mode: "prograde" } },
        { name: "deorbit burn: engine 5786-5840s", start: 5786, end: 5840, throttle: 0.3, attitude: { mode: "retrograde" } }
      ];
    }

    if (profile.programTemplate === "apollo-11") {
      return [
        ...leoAscent(headingDeg),
        ...tliCoast(),
        ...loiApproach(),
        { name: "DOI — lower perilune: engine 434311-434330s", start: 434311, end: 434330, throttle: 0.1, attitude: { mode: "retrograde" } },
        { name: "coast to perilune", start: 434330, end: 437722, throttle: 0, attitude: { mode: "prograde" } },
        { name: "PDI — powered descent: engine 437722-437900s", start: 437722, end: 437900, throttle: 0.9, attitude: { mode: "retrograde" } },
        { name: "ascent from Moon surface: engine 439960-440140s", start: 439960, end: 440140, throttle: 0.6, attitude: { mode: "prograde" } },
        { name: "coast to TEI window", start: 440140, end: 448600, throttle: 0, attitude: { mode: "prograde" } },
        { name: "TEI — trans-Earth injection: engine 448600-448700s", start: 448600, end: 448700, throttle: 0.4, attitude: { mode: "retrograde" } },
        { name: "coast back to Earth", start: 448700, end: 708704, throttle: 0, attitude: { mode: "prograde" } }
      ];
    }

    // Default LEO profile (shorter gravity turn than lunar ascent)
    return [
      { name: "vertical climb: engine 0-28s", start: 0, end: 28, throttle: 1, attitude: { mode: "surface-up" } },
      { name: "gravity turn: engine 28-250s", start: 28, end: 250, throttle: 1, attitude: { mode: "pitch-program", headingDeg, points: [
        { t: 28, pitchDeg: 88 },
        { t: 80, pitchDeg: 72 },
        { t: 150, pitchDeg: 38 },
        { t: 250, pitchDeg: 4 }
      ] } },
      { name: "coast to circularization", start: 250, end: 520, throttle: 0, attitude: { mode: "prograde" } },
      { name: "circularization: engine 520-590s", start: 520, end: 590, throttle: 0.18, attitude: { mode: "prograde" } }
    ];
  }
