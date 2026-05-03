import { SolarPhysics, setLdemImageData } from './physics-classic.js';
import { RocketSim as rocketSim } from './rocket-classic.js';
import { SolarScenarioData } from './scenario-data.js';
import { MeshFactory } from './mesh-factory.js';
import { formatDuration, formatElapsedTime, formatCountdown, formatDist, formatCommand, firstBurnText } from './time-format.js';

const {
  constants,
  checkLandings,
  createInitialBodies,
  distance,
  getScenario,
  getScenarios,
  launchRocket,
  speed,
  stepSimulation
} = SolarPhysics;

  const canvas = document.querySelector("#scene");
  const panel = document.querySelector(".panel");
  const advancedControls = document.querySelector(".advanced");
  const scenarioSelect = document.querySelector("#scenario-select");
  const runButton = document.querySelector("#toggle-run");
  const resetButton = document.querySelector("#reset-sim");
  const cameraTargetSelect = document.querySelector("#camera-target");
  const dynamicTimeScaleInput = document.querySelector("#dynamic-time-scale");
  const timeScaleInput = document.querySelector("#time-scale");
  const timeScaleNum = document.querySelector("#time-scale-num");

  const TS_LOG_MIN = Math.log10(0.1);
  const TS_LOG_MAX = Math.log10(10000);

  function sliderToTimeScale(pos) {
    return Math.pow(10, TS_LOG_MIN + (Number(pos) / 1000) * (TS_LOG_MAX - TS_LOG_MIN));
  }

  function timeScaleToSlider(ts) {
    return Math.round((Math.log10(Math.max(Number(ts), 0.1)) - TS_LOG_MIN) / (TS_LOG_MAX - TS_LOG_MIN) * 1000);
  }

  function fmtTimeScale(ts) {
    return ts < 10 ? parseFloat(ts.toPrecision(2)) : Math.round(ts);
  }

  function clampTimeScale(value) {
    return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, Number(value)));
  }
  const showTrailsInput = document.querySelector("#show-trails");
  const timeReadout = document.querySelector("#time-readout");
  const rocketSpeedLabel = document.querySelector("#rocket-speed-label");
  const rocketSpeedReadout = document.querySelector("#rocket-speed");
  const targetDistanceLabel = document.querySelector("#target-distance-label");
  const targetDistanceReadout = document.querySelector("#target-distance");
  const speedToTargetReadout = document.querySelector("#speed-to-target");
  const missionTimeReadout = document.querySelector("#mission-time");
  const flightPhaseReadout = document.querySelector("#flight-phase");
  const nextBurnReadout = document.querySelector("#next-burn-readout");
  const throttleReadout = document.querySelector("#throttle-readout");
  const fuelReadout = document.querySelector("#fuel-readout");
  const orbitInclinationReadout = document.querySelector("#orbit-inclination");
  const compactMissionTimeReadout = document.querySelector("#compact-mission-time");
  const compactRocketSpeedReadout = document.querySelector("#compact-rocket-speed");
  const compactTimeScaleReadout = document.querySelector("#compact-time-scale");

  const DEFAULT_METERS_TO_UNITS = 1 / 8.0e9;
  const DEFAULT_RADIUS_TO_UNITS = 1 / 8.0e9;
  const BASE_STEP_SECONDS = 3600;
  const MAX_FRAME_SUBSTEPS = 500;
  const TIME_SCALE_MIN = 0.1;
  const TIME_SCALE_MAX = 10000;
  const DYNAMIC_TIME_SCALE = {
    engineOn: 1,
    burnUnder30Seconds: 2,
    burnUnder120Seconds: 8,
    lowOrbit: 12,
    nearEarth: 20,
    nearMoon: 18,
    nearJupiter: 24,
    longCoast: 220
  };
  const TRAIL_SAMPLE_SECONDS = {
    Sun: constants.DAY * 7,
    Mercury: constants.DAY * 2,
    Venus: constants.DAY * 2,
    Earth: constants.DAY * 2,
    Moon: constants.DAY / 8,
    ISS: 60,
    Mars: constants.DAY * 3,
    Jupiter: constants.DAY * 10,
    Saturn: constants.DAY * 14,
    Uranus: constants.DAY * 20,
    Neptune: constants.DAY * 24,
    Rocket: constants.DAY / 4
  };

  let activeScenarioId = SolarScenarioData.defaultScenarioId;
  let activeScenario = getScenario(activeScenarioId);
  let bodies = createInitialBodies(activeScenarioId);
  let elapsedSeconds = 0;
  let running = false;
  let lastFrameTime = 0;
  let rocketMissionState = null;
  let rocketLaunched = false;
  let preLaunchPhase = false;
  let launchWindowAtSeconds = null;
  const PRE_LAUNCH_TIME_SCALE = 100;
  let manualTimeScale = clampTimeScale(sliderToTimeScale(Number(timeScaleInput.value)));
  let effectiveTimeScale = manualTimeScale;
  const cameraFollowOffset = new THREE.Vector3();
  let lastCameraTargetName = "";
  let flybyTargetIndex = 0;
  let flybyTargetMinDist = Infinity;

  // --- ISS SGP4 tracking ---
  // TLE for 2026-05-01 (NORAD 25544)
  const ISS_TLE_LINE1 = '1 25544U 98067A   26120.50000000  .00016717  00000-0  10270-3 0  9001';
  const ISS_TLE_LINE2 = '2 25544  51.6461 339.7939 0002234  43.0609 317.0704 15.48919811999999';

  let _issSatrec = null;
  let _issEpochMs = null;
  let _issGmst0 = null;

  function initISS() {
    if (typeof satellite === 'undefined') {
      console.warn('[ISS] satellite.js not loaded, SGP4 unavailable');
      return;
    }
    _issSatrec = satellite.twoline2satrec(ISS_TLE_LINE1, ISS_TLE_LINE2);
    _issEpochMs = Date.now();
    _issGmst0 = satellite.gstime(new Date(_issEpochMs));
    console.log('[ISS] SGP4 initialised from hardcoded TLE');
  }

  function updateISSPosition(bodies, simulatedElapsedSeconds) {
    const issBody = bodies.find((b) => b.name === 'ISS');
    const earth = bodies.find((b) => b.name === 'Earth');
    if (!issBody || !earth || !_issSatrec) return;

    // Real-world time offset by simulated elapsed time
    const nowMs = (_issEpochMs || Date.now()) + simulatedElapsedSeconds * 1000;
    const nowDate = new Date(nowMs);

    const posVel = satellite.propagate(_issSatrec, nowDate);
    if (!posVel || !posVel.position) return;

    // satellite.js returns km in ECI (J2000 Earth-centred inertial).
    // Physics frame is a frozen-ECEF frame: x = geographic lon 0° at simulation epoch.
    // Rotate ECI -> frozen-ECEF by -GMST0 around z-axis, then convert km -> m.
    const cg = Math.cos(-_issGmst0), sg = Math.sin(-_issGmst0);
    const px = posVel.position.x * 1000, py = posVel.position.y * 1000;
    const vx = posVel.velocity.x * 1000, vy = posVel.velocity.y * 1000;
    issBody.position.x = earth.position.x + px * cg - py * sg;
    issBody.position.y = earth.position.y + px * sg + py * cg;
    issBody.position.z = earth.position.z + posVel.position.z * 1000;
    issBody.velocity.x = earth.velocity.x + vx * cg - vy * sg;
    issBody.velocity.y = earth.velocity.y + vx * sg + vy * cg;
    issBody.velocity.z = earth.velocity.z + posVel.velocity.z * 1000;
  }

  // Initialise ISS once satellite.js is available (it's loaded synchronously before this script)
  initISS();

  // Returns seconds until the next launch window (when launchSite enters the ISS orbital plane).
  // Uses the SGP4-derived orbital normal and GMST to solve analytically.
  // Returns 0 if satellite.js is unavailable.
  function computeLaunchWindowSeconds(site) {
    if (typeof satellite === 'undefined' || !_issSatrec || !_issEpochMs) return 0;
    const date0 = new Date(_issEpochMs);
    const posVel = satellite.propagate(_issSatrec, date0);
    if (!posVel || !posVel.position || !posVel.velocity) return 0;

    const { x: rx, y: ry, z: rz } = posVel.position;
    const { x: vx, y: vy, z: vz } = posVel.velocity;
    const hx = ry*vz - rz*vy, hy = rz*vx - rx*vz, hz = rx*vy - ry*vx;
    const hMag = Math.sqrt(hx*hx + hy*hy + hz*hz);
    if (hMag === 0) return 0;
    const nx = hx/hMag, ny = hy/hMag, nz = hz/hMag;

    const ω = 7.2921150e-5; // Earth sidereal rotation rad/s
    const latRad = site.latDeg * Math.PI / 180;
    const lonRad = site.lonDeg * Math.PI / 180;
    const gmst0 = satellite.gstime(date0);
    const lonEci0 = lonRad + gmst0;

    // Solve: nx*cos(lat)*cos(lonEci0+ω*t) + ny*cos(lat)*sin(lonEci0+ω*t) + nz*sin(lat) = 0
    const A = nx * Math.cos(latRad);
    const B = ny * Math.cos(latRad);
    const C = nz * Math.sin(latRad);
    const R = Math.sqrt(A*A + B*B);
    if (R < 1e-10) return 0;

    const cosArg = -C / R;
    if (Math.abs(cosArg) > 1) return 0;
    const alpha = Math.acos(cosArg); // in [0, π]
    const phi = Math.atan2(B, A);
    const T_sidereal = 2 * Math.PI / ω; // ~86164 s

    function nextPositiveT(theta) {
      const t = (theta - lonEci0) / ω;
      const n = ((t % T_sidereal) + T_sidereal) % T_sidereal;
      return n < 60 ? n + T_sidereal : n; // skip if essentially now
    }

    const t1 = nextPositiveT(phi + alpha);
    const t2 = nextPositiveT(phi - alpha);
    return Math.min(t1, t2);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#03050a");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.001, 2000);
  camera.position.set(0, 85, 155);
  camera.lookAt(0, 0, 0);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 1200;

  const ambient = new THREE.AmbientLight("#ffffff", 0.18);
  scene.add(ambient);

  const sunLight = new THREE.PointLight("#fff1c4", 1.5, 0, 0);
  scene.add(sunLight);


  let proceduralStars = createStars();
  let skySphere = null;
  scene.add(proceduralStars);

  const bodyMeshes = new Map();
  const trails = new Map();
  const markerGroup = new THREE.Group();
  const referenceOrbitGroup = new THREE.Group();
  scene.add(markerGroup);
  scene.add(referenceOrbitGroup);

  const textures = {};
  let saturnRingTexture = null;
  const textureLoader = new THREE.TextureLoader();

  // Mirror horizontally for all spheres: physics Y → scene Z inverts east/west handedness.
  function mirrorTex(tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(-1, 1);
    tex.offset.set(1, 0);
    tex.needsUpdate = true;
  }

  const BODY_TEXTURES = Object.fromEntries(
    Object.entries(SolarScenarioData.bodyCatalog)
      .filter(([, body]) => body.texturePath)
      .map(([name, body]) => [name, body.texturePath])
  );
  const saturnCatalog = SolarScenarioData.bodyCatalog.Saturn || {};
  const saturnRingTexturePath = saturnCatalog.rings && saturnCatalog.rings.texturePath;

  for (const [name, path] of Object.entries(BODY_TEXTURES)) {
    textureLoader.load(path, (tex) => {
      mirrorTex(tex);
      textures[name] = tex;
      const mesh = bodyMeshes.get(name);
      if (mesh) applyBodyTexture(mesh, name, tex);
    }, undefined, () => console.warn(`Texture ${name} skipped`));
  }

  if (saturnRingTexturePath) {
    textureLoader.load(saturnRingTexturePath, (tex) => {
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      saturnRingTexture = tex;
      const mesh = bodyMeshes.get("Saturn");
      if (mesh) applySaturnRingTexture(mesh, tex);
    }, undefined, () => console.warn('Saturn ring texture skipped'));
  }

  // Star background: replace procedural points with milky-way texture sphere.
  textureLoader.load('sim-assets/textures/solar-system-scope/stars_milky_way.jpg', (tex) => {
    scene.remove(proceduralStars);
    proceduralStars = null;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
    );
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    skySphere = sky;
    scene.add(sky);
  });

  let ldemTexture = null;
  MeshFactory.init({
    textures,
    getLdemTexture: () => ldemTexture,
    getSaturnRingTexture: () => saturnRingTexture,
    getElapsed: () => elapsedSeconds,
    getShowTrails: () => showTrailsInput.checked,
  });
  const { createBodyMesh, createTrail, resetTrail, applyBodyTexture, applySaturnRingTexture } = MeshFactory;
  const _siteVec = new THREE.Vector3();
  let ldemCanvas = null;
  let ldemImageData = null;
  textureLoader.load('sim-assets/textures/nasa/moon_ldem_3_8bit.jpg', (tex) => {
    ldemTexture = tex;
    // Pre-bake into canvas for pixel lookup (used by collision detection)
    const img = tex.image;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ldemCanvas = c;
    ldemImageData = ctx.getImageData(0, 0, c.width, c.height);
    setLdemImageData(ldemImageData);
  }, undefined, () => console.warn('LDEM texture skipped'));

  const launchSiteMarkers = [];
  if (rocketSim) {
    for (const site of rocketSim.launchSites()) {
      site.latRad = site.latDeg * Math.PI / 180;
      site.lonRad = site.lonDeg * Math.PI / 180;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ff6600' })
      );
      dot.visible = false;
      scene.add(dot);
      launchSiteMarkers.push({ site, dot });
    }
  }

  populateScenarioSelect();
  applyScenarioUiDefaults();
  applyScenarioCamera();
  syncSceneObjects();
  syncReferenceOrbits();

  scenarioSelect.addEventListener("change", () => {
    activeScenarioId = scenarioSelect.value;
    activeScenario = getScenario(activeScenarioId);
    resetSimulation();
    applyScenarioUiDefaults();
    applyScenarioCamera();
  });

  function doLaunch() {
    if (rocketLaunched) return;
    rocketLaunched = true;
    const mission = currentMission();
    if (mission && mission.preLaunchWindow) {
      const site = mission.launchSite;
      const windowSeconds = computeLaunchWindowSeconds(site);
      if (windowSeconds > 60) {
        preLaunchPhase = true;
        launchWindowAtSeconds = windowSeconds;
        showLaunchWindowOverlay(windowSeconds);
        syncSceneObjects();
        return;
      }
    }
    activateLaunch(mission, 0);
  }

  function activateLaunch(mission, earthRotationOffsetSeconds) {
    if (mission) {
      if (!rocketMissionState) {
        rocketMissionState = rocketSim.createMissionState(mission, bodies, earthRotationOffsetSeconds);
        if (mission.launchTimeScale != null) {
          timeScaleInput.value = timeScaleToSlider(mission.launchTimeScale);
          timeScaleNum.value = fmtTimeScale(mission.launchTimeScale);
        }
      }
    } else if (activeScenario.rocket) {
      bodies = launchRocket(bodies, activeScenarioId);
    }
    syncSceneObjects();
    if (mission && activeScenario.ui && activeScenario.ui.focusRocketOnLaunch) {
      focusCameraOnRocketLaunch();
    }
  }

  runButton.addEventListener("click", () => {
    running = !running;
    runButton.textContent = running ? "Stop" : "Start";
    if (running) {
      doLaunch();
      collapsePanelAfterRun();
    }
  });

  resetButton.addEventListener("click", () => {
    resetSimulation();
  });

  showTrailsInput.addEventListener("change", () => {
    for (const trail of trails.values()) {
      trail.line.visible = showTrailsInput.checked;
    }
  });

  timeScaleInput.addEventListener("input", () => {
    applyManualTimeScale(sliderToTimeScale(timeScaleInput.value));
  });

  timeScaleNum.addEventListener("blur", () => {
    const raw = Number(timeScaleNum.value);
    if (!Number.isFinite(raw) || timeScaleNum.value.trim() === "") {
      syncDisplayedTimeScale(effectiveTimeScale);
      return;
    }
    applyManualTimeScale(raw);
  });

  timeScaleNum.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      timeScaleNum.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      setTimeout(() => {
        const v = Number(timeScaleNum.value);
        if (Number.isFinite(v)) {
          applyManualTimeScale(v);
        }
      }, 0);
    }
  });

  dynamicTimeScaleInput && dynamicTimeScaleInput.addEventListener("change", () => {
    if (!dynamicTimeScaleInput.checked) {
      effectiveTimeScale = manualTimeScale;
      syncDisplayedTimeScale(effectiveTimeScale);
    }
  });

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();

  // Landing result overlay
  const landingOverlay = document.createElement('div');
  landingOverlay.id = 'landing-overlay';
  landingOverlay.style.cssText = 'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:24px 40px;border-radius:12px;font-size:24px;font-weight:bold;z-index:1000;text-align:center;border:2px solid #0f0;';
  document.body.appendChild(landingOverlay);

  // Launch window countdown overlay
  const launchWindowOverlay = document.createElement('div');
  launchWindowOverlay.id = 'launch-window-overlay';
  launchWindowOverlay.style.cssText = [
    'display:none',
    'position:fixed',
    'top:50%',
    'left:50%',
    'transform:translate(-50%,-50%)',
    'background:rgba(0,8,20,0.88)',
    'color:#7cf',
    'padding:20px 36px',
    'border-radius:12px',
    'font-family:monospace',
    'font-size:14px',
    'z-index:999',
    'text-align:center',
    'border:1px solid #1af',
    'pointer-events:none'
  ].join(';');
  launchWindowOverlay.innerHTML = `
    <div style="font-size:11px;opacity:0.7;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">
      Ожидание окна запуска
    </div>
    <div id="lw-countdown" style="font-size:28px;font-weight:bold;letter-spacing:2px;color:#fff">—</div>
    <div style="font-size:11px;opacity:0.6;margin-top:6px">Байконур входит в плоскость орбиты МКС</div>
  `;
  document.body.appendChild(launchWindowOverlay);

  function showLaunchWindowOverlay(totalSeconds) {
    launchWindowOverlay.style.display = 'block';
    updateLaunchWindowCountdown(totalSeconds);
  }

  function hideLaunchWindowOverlay() {
    launchWindowOverlay.style.display = 'none';
  }

  function updateLaunchWindowCountdown(remainingSeconds) {
    const el = document.getElementById('lw-countdown');
    if (el) el.textContent = formatCountdown(remainingSeconds);
  }

  function showLandingResult(success, speedMs, bodyName) {
    const body = bodyName || 'surface';
    if (success) {
      landingOverlay.style.borderColor = '#0f0';
      landingOverlay.style.color = '#0f0';
      landingOverlay.innerHTML = `✓ Soft landing on ${body}<br><span style="font-size:16px;color:#aaa">${speedMs.toFixed(1)} m/s impact speed</span>`;
    } else {
      landingOverlay.style.borderColor = '#f00';
      landingOverlay.style.color = '#f00';
      landingOverlay.innerHTML = `✗ Mission failed — ${body} impact<br><span style="font-size:16px;color:#aaa">${speedMs.toFixed(1)} m/s impact speed</span>`;
    }
    landingOverlay.style.display = 'block';
    setTimeout(() => { landingOverlay.style.display = 'none'; }, 6000);
  };

  requestAnimationFrame(animate);

  function animate(frameTime) {
    requestAnimationFrame(animate);
    const deltaMs = Math.min(frameTime - lastFrameTime, 80);
    lastFrameTime = frameTime;

    if (running) {
      const playbackScale = getPlaybackTimeScale();
      syncDisplayedTimeScale(playbackScale);
      stepPhysicsFrame(playbackScale);
    }

    updateMeshes();
    updateCameraTarget(deltaMs / 1000);
    controls.update();
    updateSkyPosition();
    updateReadouts();
    if (preLaunchPhase && launchWindowAtSeconds !== null) {
      updateLaunchWindowCountdown(launchWindowAtSeconds - elapsedSeconds);
    }
    renderer.render(scene, camera);
  }

  function stepPhysicsFrame(playbackScale) {
    let remainingSeconds = Math.max(playbackScale, 0.001) * (activeScenario.stepSeconds || BASE_STEP_SECONDS);
    let guard = 0;

    while (remainingSeconds > 0 && guard < MAX_FRAME_SUBSTEPS) {
      const scenarioStepSeconds = activeScenario.stepSeconds || BASE_STEP_SECONDS;
      const requestedStepSeconds = Math.min(remainingSeconds, scenarioStepSeconds);
      let stepSeconds = requestedStepSeconds;
      if (rocketSim && rocketMissionState) {
        stepSeconds = rocketSim.chooseStepSeconds(rocketMissionState, bodies, requestedStepSeconds);
      }

      stepSeconds = Math.min(stepSeconds, remainingSeconds);
      rocketSim && rocketSim.updateRocketBeforePhysics(rocketMissionState, bodies, stepSeconds);
      stepSimulation(bodies, stepSeconds);
      elapsedSeconds += stepSeconds;
      updateISSPosition(bodies, elapsedSeconds);
      checkLaunchWindow();

      const rocketBody = bodies.find((b) => b.name === 'Rocket');
      if (rocketBody && !(rocketMissionState && rocketMissionState.attachedToPad)) {
        checkLandings(bodies, rocketBody, showLandingResult);
        if (rocketBody._landed) {
          running = false;
          break;
        }
      }
      rocketSim && rocketSim.updateRocketAfterPhysics(rocketMissionState, bodies, stepSeconds);
      appendTrailSamples();
      remainingSeconds -= stepSeconds;
      guard += 1;
    }
  }

  function checkLaunchWindow() {
    if (preLaunchPhase && launchWindowAtSeconds !== null && elapsedSeconds >= launchWindowAtSeconds) {
      preLaunchPhase = false;
      hideLaunchWindowOverlay();
      activateLaunch(currentMission(), launchWindowAtSeconds);
    }
  }

  function getPlaybackTimeScale() {
    if (preLaunchPhase) {
      effectiveTimeScale = Math.max(PRE_LAUNCH_TIME_SCALE, manualTimeScale);
      return effectiveTimeScale;
    }
    effectiveTimeScale = dynamicTimeScaleInput && dynamicTimeScaleInput.checked
      ? chooseDynamicPlaybackScale()
      : manualTimeScale;
    return effectiveTimeScale;
  }

  function chooseDynamicPlaybackScale() {
    const missionStatus = rocketSim && rocketSim.missionStatus(rocketMissionState, bodies);
    if (!missionStatus) {
      return manualTimeScale;
    }

    if (missionStatus.engineOn) {
      return DYNAMIC_TIME_SCALE.engineOn;
    }

    if (missionStatus.nextBurnInSeconds <= 30) {
      return DYNAMIC_TIME_SCALE.burnUnder30Seconds;
    }

    if (missionStatus.nextBurnInSeconds <= 120) {
      return DYNAMIC_TIME_SCALE.burnUnder120Seconds;
    }

    const rocket = bodies.find((body) => body.name === "Rocket");
    if (!rocket) {
      return manualTimeScale;
    }

    const earth = bodies.find((body) => body.name === "Earth");
    if (earth) {
      const earthAltitude = distance(rocket.position, earth.position) - earth.radius;
      if (earthAltitude < 600000) {
        return DYNAMIC_TIME_SCALE.lowOrbit;
      }
      if (earthAltitude < earth.radius * 20) {
        return DYNAMIC_TIME_SCALE.nearEarth;
      }
    }

    const moon = bodies.find((body) => body.name === "Moon");
    if (isNearFlybyBody(rocket, moon, 18)) {
      return DYNAMIC_TIME_SCALE.nearMoon;
    }

    const jupiter = bodies.find((body) => body.name === "Jupiter");
    if (isNearFlybyBody(rocket, jupiter, 80)) {
      return DYNAMIC_TIME_SCALE.nearJupiter;
    }

    return Math.min(TIME_SCALE_MAX, Math.max(manualTimeScale, DYNAMIC_TIME_SCALE.longCoast));
  }

  function isNearFlybyBody(rocket, body, radiusMultiplier) {
    if (!rocket || !body) {
      return false;
    }
    return distance(rocket.position, body.position) < body.radius * radiusMultiplier;
  }

  function applyManualTimeScale(value) {
    manualTimeScale = clampTimeScale(value);
    effectiveTimeScale = manualTimeScale;
    if (dynamicTimeScaleInput) {
      dynamicTimeScaleInput.checked = false;
    }
    syncDisplayedTimeScale(effectiveTimeScale);
  }

  function syncDisplayedTimeScale(value) {
    const scale = clampTimeScale(value);
    timeScaleInput.value = timeScaleToSlider(scale);
    timeScaleNum.value = fmtTimeScale(scale);
    if (compactTimeScaleReadout) {
      compactTimeScaleReadout.textContent = `${fmtTimeScale(scale)}x`;
    }
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  function setPanelCollapsed(collapsed) {
    if (!panel) {
      return;
    }
    panel.classList.toggle("panel-collapsed", collapsed);
    panel.classList.toggle("panel-expanded", !collapsed);
  }

  function collapsePanelAfterRun() {
    if (isMobileLayout()) {
      setPanelCollapsed(true);
      if (advancedControls) {
        advancedControls.open = false;
      }
      resizeRenderer();
    }
  }

  function syncSceneObjects() {
    const currentNames = new Set(bodies.map((body) => body.name));

    for (const [name, mesh] of bodyMeshes) {
      if (!currentNames.has(name)) {
        scene.remove(mesh);
        bodyMeshes.delete(name);
      }
    }

    for (const [name, trail] of trails) {
      if (!currentNames.has(name)) {
        scene.remove(trail.line);
        trails.delete(name);
      }
    }

    for (const body of bodies) {
      if (!bodyMeshes.has(body.name)) {
        const mesh = createBodyMesh(body);
        bodyMeshes.set(body.name, mesh);
        scene.add(mesh);
      }

      if (!trails.has(body.name)) {
        const trail = createTrail(body);
        trails.set(body.name, trail);
        scene.add(trail.line);
      } else {
        resetTrail(trails.get(body.name));
      }
    }

    updateMeshes();
    syncCameraOptions();
  }

  function currentMission() {
    return rocketSim && rocketSim.missionForScenarioId(activeScenarioId);
  }

  function populateScenarioSelect() {
    for (const scenario of getScenarios()) {
      const option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = scenario.label;
      scenarioSelect.append(option);
    }
    scenarioSelect.value = activeScenarioId;
  }

  function resetSimulation() {
    landingOverlay.style.display = 'none';
    hideLaunchWindowOverlay();
    preLaunchPhase = false;
    launchWindowAtSeconds = null;
    bodies = createInitialBodies(activeScenarioId);
    elapsedSeconds = 0;
    running = false;
    rocketMissionState = null;
    rocketLaunched = false;
    flybyTargetIndex = 0;
    flybyTargetMinDist = Infinity;
    runButton.textContent = "Start";
    syncSceneObjects();
    syncReferenceOrbits();
    if (isMobileLayout()) {
      setPanelCollapsed(false);
      if (advancedControls) {
        advancedControls.open = false;
      }
      resizeRenderer();
    }
    syncDisplayedTimeScale(getPlaybackTimeScale());
  }

  function applyScenarioCamera() {
    const config = activeScenario.camera || {};
    const position = config.position || [0, 85, 155];
    const target = config.target || [0, 0, 0];
    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.maxDistance = config.maxDistance || 1200;
    controls.update();
  }

  function focusCameraOnRocketLaunch() {
    const rocket = bodies.find((body) => body.name === "Rocket");
    const earth = bodies.find((body) => body.name === "Earth");
    if (!rocket || !earth) {
      return;
    }

    const rocketPosition = toScenePosition(rocket.position);
    const earthPosition = toScenePosition(earth.position);
    const up = rocketPosition.clone().sub(earthPosition);
    if (up.lengthSq() === 0) {
      up.set(0, 1, 0);
    }
    up.normalize();

    const side = new THREE.Vector3(0, 1, 0).cross(up);
    if (side.lengthSq() < 0.0001) {
      side.set(1, 0, 0);
    }
    side.normalize();

    const earthRadius = getBodyVisualRadius(earth);
    const distance = Math.max(earthRadius * 1.8, 8);
    camera.position.copy(rocketPosition)
      .add(up.multiplyScalar(distance * 0.55))
      .add(side.multiplyScalar(distance));
    controls.target.copy(rocketPosition);
    controls.update();
  }

  function applyScenarioUiDefaults() {
    const defaults = activeScenario.ui || {};
    if (defaults.timeScale != null) {
      manualTimeScale = clampTimeScale(defaults.timeScale);
      if (!dynamicTimeScaleInput || !dynamicTimeScaleInput.checked) {
        effectiveTimeScale = manualTimeScale;
      }
      syncDisplayedTimeScale(getPlaybackTimeScale());
    }
    if (defaults.cameraTarget && hasSelectOption(cameraTargetSelect, defaults.cameraTarget)) {
      cameraTargetSelect.value = defaults.cameraTarget;
    }
  }

  function syncCameraOptions() {
    const previousValue = cameraTargetSelect.value;
    const values = new Set(["free"]);
    const bodyNames = bodies.map((body) => body.name.toLowerCase());

    cameraTargetSelect.replaceChildren();
    addCameraOption("free", "Free");
    for (const name of bodyNames) {
      if (values.has(name)) {
        continue;
      }
      values.add(name);
      addCameraOption(name, capitalize(name));
    }

    if (values.has(previousValue)) {
      cameraTargetSelect.value = previousValue;
    } else if (values.has((activeScenario.ui || {}).cameraTarget)) {
      cameraTargetSelect.value = activeScenario.ui.cameraTarget;
    } else {
      cameraTargetSelect.value = "free";
    }
  }

  function addCameraOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    cameraTargetSelect.append(option);
  }

  function updateMeshes() {
    markerGroup.clear();

    for (const body of bodies) {
      const mesh = bodyMeshes.get(body.name);
      const scenePosition = toScenePosition(body.position);
      mesh.position.copy(scenePosition);

      if (body.name === "Rocket") {
        const direction = body.attitudeDirection || body.velocity;
        const sceneDirection = new THREE.Vector3(direction.x, direction.z, direction.y);
        if (sceneDirection.lengthSq() > 0) {
          sceneDirection.normalize();
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sceneDirection);
        }
        const earthBody = bodies.find(b => b.name === "Earth");
        const earthR = earthBody ? getBodyVisualRadius(earthBody) : 1;
        mesh.scale.setScalar(Math.max(0.05, earthR * 0.1));
      } else {
        const radius = getBodyVisualRadius(body);
        if (body.name === "Earth") {
          applyEarthEllipsoidScale(mesh, body, radius);
        } else {
          mesh.scale.setScalar(radius);
        }
        if (mesh.userData && mesh.userData.spinNode) {
          mesh.userData.spinNode.rotation.y = getBodySpinAngle(body);
        } else {
          mesh.rotation.y = getBodySpinAngle(body);
        }
        if (body.name === "Saturn") {
          updateSaturnShadows(mesh, body);
        }
      }

      if (getViewConfig().markers && shouldShowMarker(body)) {
        addLabelMarker(body, scenePosition);
      }

      if (body.name === "Sun") {
        sunLight.position.copy(scenePosition);
      }
    }

    updateLaunchSiteMarkers();
  }

  function getBodySpinAngle(body) {
    const periodHours = body.rotationPeriodHours;
    if (!periodHours) {
      return 0;
    }
    return -elapsedSeconds / (Math.abs(periodHours) * 3600) * Math.PI * 2 * Math.sign(periodHours);
  }

  function updateSaturnShadows(mesh, saturn) {
    const shadow = mesh.userData && mesh.userData.saturnPlanetShadow;
    if (!shadow) return;

    const sun = bodies.find((body) => body.name === "Sun");
    if (!sun) {
      shadow.visible = false;
      return;
    }

    shadow.visible = true;
    const sunDirection = toScenePosition(sun.position).sub(toScenePosition(saturn.position)).normalize();
    const axialInverse = mesh.userData.axialGroup.quaternion.clone().invert();
    const localSun = sunDirection.applyQuaternion(axialInverse);
    shadow.rotation.y = Math.atan2(localSun.z, -localSun.x);
  }

  function appendTrailSamples() {
    if (!showTrailsInput.checked) {
      return;
    }

    const rocketInterval = rocketMissionState
      ? Math.max(10, activeScenario.stepSeconds || BASE_STEP_SECONDS)
      : TRAIL_SAMPLE_SECONDS.Rocket;

    for (const body of bodies) {
      const trail = trails.get(body.name);
      if (!trail) {
        continue;
      }

      const interval = body.name === "Rocket"
        ? rocketInterval
        : (TRAIL_SAMPLE_SECONDS[body.name] || constants.DAY * 3);
      if (elapsedSeconds < trail.nextSampleTime) {
        continue;
      }

      appendTrailPoint(trail, toScenePosition(body.position));
      trail.nextSampleTime = elapsedSeconds + interval;
    }
  }

  function appendTrailPoint(trail, scenePosition) {
    if (trail.count >= trail.capacity) {
      const newCapacity = trail.capacity * 2;
      const newPositions = new Float32Array(newCapacity * 3);
      newPositions.set(trail.positions.subarray(0, trail.count * 3));
      trail.positions = newPositions;
      trail.capacity = newCapacity;
      trail.line.geometry.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
    }

    const i = trail.count;
    trail.positions[i * 3] = scenePosition.x;
    trail.positions[i * 3 + 1] = scenePosition.y;
    trail.positions[i * 3 + 2] = scenePosition.z;
    trail.count++;

    trail.line.geometry.setDrawRange(0, trail.count);
    trail.line.geometry.attributes.position.needsUpdate = true;
  }

  function addLabelMarker(body, position) {
    const size = body.name === "Rocket" ? 0.25 : 0.18;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(size, size * 1.35, 24),
      new THREE.MeshBasicMaterial({ color: body.color, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    marker.position.copy(position);
    marker.lookAt(camera.position);
    markerGroup.add(marker);
  }

  function updateCameraTarget(deltaSeconds) {
    const targetName = cameraTargetSelect.value;
    if (targetName === "free") {
      lastCameraTargetName = targetName;
      return;
    }

    const body = bodies.find((item) => item.name.toLowerCase() === targetName);
    if (!body) {
      return;
    }

    const target = toScenePosition(body.position);
    const switched = targetName !== lastCameraTargetName;
    lastCameraTargetName = targetName;

    if (switched) {
      // Camera stays at current world position; orbit pivot snaps to new body.
      // cameraFollowOffset is set so subsequent frames track the body with the same offset.
      controls.target.copy(target);
      cameraFollowOffset.copy(camera.position).sub(target);
      return;
    }

    // Keep camera-to-target offset constant: camera follows body immediately.
    cameraFollowOffset.copy(camera.position).sub(controls.target);
    controls.target.copy(target);
    camera.position.copy(controls.target).add(cameraFollowOffset);
  }

  function updateSkyPosition() {
    if (proceduralStars) {
      proceduralStars.position.copy(camera.position);
    }
    if (skySphere) {
      skySphere.position.copy(camera.position);
    }
  }

  function speedRefBody(rocket) {
    const moon = bodies.find((b) => b.name === "Moon");
    if (moon && distance(rocket.position, moon.position) < moon.radius * 40) return moon;
    const earth = bodies.find((b) => b.name === "Earth");
    if (earth && distance(rocket.position, earth.position) < earth.radius * 150) return earth;
    const jupiter = bodies.find((b) => b.name === "Jupiter");
    if (jupiter && distance(rocket.position, jupiter.position) < jupiter.radius * 700) return jupiter;
    return bodies.find((b) => b.name === "Sun") || null;
  }

  function speedRelativeTo(rocket, refBody) {
    if (!refBody) return speed(rocket);
    const dvx = rocket.velocity.x - refBody.velocity.x;
    const dvy = rocket.velocity.y - refBody.velocity.y;
    const dvz = rocket.velocity.z - refBody.velocity.z;
    return Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
  }

  function closingSpeed(rocket, targetBody) {
    const dx = targetBody.position.x - rocket.position.x;
    const dy = targetBody.position.y - rocket.position.y;
    const dz = targetBody.position.z - rocket.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist === 0) return 0;
    const ux = dx / dist, uy = dy / dist, uz = dz / dist;
    const dvx = rocket.velocity.x - targetBody.velocity.x;
    const dvy = rocket.velocity.y - targetBody.velocity.y;
    const dvz = rocket.velocity.z - targetBody.velocity.z;
    return dvx * ux + dvy * uy + dvz * uz;
  }

  function getCurrentFlybyTargetName() {
    const targets = (activeScenario && activeScenario.flybyTargets) || [];
    if (!targets.length) return null;
    return targets[Math.min(flybyTargetIndex, targets.length - 1)];
  }

  function advanceFlybyTarget(rocket) {
    const targets = (activeScenario && activeScenario.flybyTargets) || [];
    if (!targets.length || flybyTargetIndex >= targets.length - 1) return;
    const targetBody = bodies.find((b) => b.name === targets[flybyTargetIndex]);
    if (!targetBody) return;
    const dist = distance(rocket.position, targetBody.position);
    if (dist < flybyTargetMinDist) flybyTargetMinDist = dist;
    if (flybyTargetMinDist < targetBody.radius * 200 && dist > flybyTargetMinDist * 2) {
      flybyTargetIndex++;
      flybyTargetMinDist = Infinity;
    }
  }

  function updateReadouts() {
    timeReadout.textContent = formatElapsedTime(elapsedSeconds);

    const rocket = bodies.find((body) => body.name === "Rocket");

    if (!rocket) {
      rocketSpeedReadout.textContent = "not launched";
      if (rocketSpeedLabel) rocketSpeedLabel.textContent = "Speed";
      if (compactRocketSpeedReadout) {
        compactRocketSpeedReadout.textContent = "not launched";
      }
      const flybyTargetName = getCurrentFlybyTargetName();
      const flybyTargetBody = flybyTargetName ? bodies.find((b) => b.name === flybyTargetName) : null;
      const earth = bodies.find((b) => b.name === "Earth");
      const origin = earth || bodies[0];
      if (flybyTargetBody && origin && flybyTargetBody !== origin) {
        const dist = distance(origin.position, flybyTargetBody.position);
        if (targetDistanceLabel) targetDistanceLabel.textContent = `→ ${flybyTargetName}`;
        if (targetDistanceReadout) targetDistanceReadout.textContent = formatDist(dist);
      } else {
        if (targetDistanceLabel) targetDistanceLabel.textContent = "Target";
        if (targetDistanceReadout) targetDistanceReadout.textContent = "—";
      }
      if (speedToTargetReadout) speedToTargetReadout.textContent = "—";
      updateMissionReadouts(null);
      return;
    }

    advanceFlybyTarget(rocket);

    const refBody = speedRefBody(rocket);
    const spd = speedRelativeTo(rocket, refBody);
    const refName = refBody ? refBody.name : "inertial";
    if (rocketSpeedLabel) rocketSpeedLabel.textContent = `Speed (from ${refName})`;

    const missionStatus = rocketSim && rocketSim.missionStatus(rocketMissionState, bodies);
    const fuelText = missionStatus
      ? `, fuel ${(missionStatus.fuelMass / 1000).toFixed(1)} t`
      : "";
    rocketSpeedReadout.textContent = `${(spd / 1000).toFixed(2)} km/s${fuelText}`;
    if (compactRocketSpeedReadout) {
      compactRocketSpeedReadout.textContent = `${(spd / 1000).toFixed(2)} km/s`;
    }

    const flybyTargetName = getCurrentFlybyTargetName();
    const flybyTargetBody = flybyTargetName ? bodies.find((b) => b.name === flybyTargetName) : null;
    if (flybyTargetBody) {
      const dist = distance(rocket.position, flybyTargetBody.position);
      if (targetDistanceLabel) targetDistanceLabel.textContent = `→ ${flybyTargetName}`;
      if (targetDistanceReadout) targetDistanceReadout.textContent = formatDist(dist);
      const cs = closingSpeed(rocket, flybyTargetBody);
      if (speedToTargetReadout) {
        const sign = cs >= 0 ? "+" : "";
        speedToTargetReadout.textContent = `${sign}${(cs / 1000).toFixed(2)} km/s`;
      }
    } else {
      if (targetDistanceLabel) targetDistanceLabel.textContent = "Target";
      if (targetDistanceReadout) targetDistanceReadout.textContent = "—";
      if (speedToTargetReadout) speedToTargetReadout.textContent = "—";
    }

    updateMissionReadouts(missionStatus);
  }

  function updateMissionReadouts(missionStatus) {
    const mission = currentMission();
    if (!mission) {
      missionTimeReadout.textContent = "n/a";
      if (compactMissionTimeReadout) {
        compactMissionTimeReadout.textContent = "n/a";
      }
      flightPhaseReadout.textContent = "n/a";
      nextBurnReadout.textContent = "n/a";
      throttleReadout.textContent = "n/a";
      fuelReadout.textContent = "n/a";
      orbitInclinationReadout.textContent = "n/a";
      return;
    }

    if (!missionStatus) {
      missionTimeReadout.textContent = formatElapsedTime(0);
      if (compactMissionTimeReadout) {
        compactMissionTimeReadout.textContent = formatElapsedTime(0);
      }
      flightPhaseReadout.textContent = "ready";
      nextBurnReadout.textContent = firstBurnText(mission);
      throttleReadout.textContent = "0%";
      fuelReadout.textContent = `${(mission.vehicle.fuelMassKg / 1000).toFixed(1)} t`;
      orbitInclinationReadout.textContent = `target ${(mission.targetOrbit || {}).inclinationDeg || "?"} deg`;
      return;
    }

    missionTimeReadout.textContent = formatElapsedTime(missionStatus.missionTime);
    if (compactMissionTimeReadout) {
      compactMissionTimeReadout.textContent = formatElapsedTime(missionStatus.missionTime);
    }
    flightPhaseReadout.textContent = formatCommand(missionStatus);
    nextBurnReadout.textContent = missionStatus.nextBurnName
      ? `${missionStatus.nextBurnName} in ${formatDuration(missionStatus.nextBurnInSeconds)}`
      : "none";
    throttleReadout.textContent = `${(missionStatus.throttle * 100).toFixed(0)}%`;
    fuelReadout.textContent = `${(missionStatus.fuelMass / 1000).toFixed(1)} t (${missionStatus.fuelPercent.toFixed(0)}%)`;
    orbitInclinationReadout.textContent = Number.isFinite(missionStatus.inclinationDeg)
      ? `${missionStatus.inclinationDeg.toFixed(1)} deg`
      : `target ${missionStatus.targetInclinationDeg || "?"} deg`;
  }

  function syncReferenceOrbits() {
    referenceOrbitGroup.clear();
    for (const orbit of activeScenario.referenceOrbits || []) {
      createReferenceOrbit(orbit.radius, orbit.color, orbit.inclination || 0);
    }
  }

  function createReferenceOrbit(radiusMeters, color, inclinationDegrees) {
    const points = [];
    const inclination = inclinationDegrees * Math.PI / 180;
    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);

    for (let i = 0; i <= 256; i += 1) {
      const angle = i / 256 * Math.PI * 2;
      const x = Math.cos(angle) * radiusMeters * getViewConfig().metersToUnits;
      const y = Math.sin(angle) * radiusMeters * cosInc * getViewConfig().metersToUnits;
      const z = Math.sin(angle) * radiusMeters * sinInc * getViewConfig().metersToUnits;
      points.push(new THREE.Vector3(x, z, y));
    }

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    referenceOrbitGroup.add(line);
  }

  function updateLaunchSiteMarkers() {
    const earth = bodies.find(b => b.name === 'Earth');
    if (!earth) {
      for (const m of launchSiteMarkers) m.dot.visible = false;
      return;
    }
    const earthPos = toScenePosition(earth.position);
    const earthR = getBodyVisualRadius(earth);
    const dotR = Math.max(0.06, earthR * 0.035);
    const elev = earthR * 1.018;
    const earthMesh = bodyMeshes.get("Earth");
    const axialRotation = earthMesh && earthMesh.userData.axialGroup
      ? earthMesh.userData.axialGroup.quaternion
      : null;

    for (const { site, dot } of launchSiteMarkers) {
      const theta = site.lonRad - getBodySpinAngle(earth);
      _siteVec.set(
        Math.cos(site.latRad) * Math.cos(theta),
        Math.sin(site.latRad),
        Math.cos(site.latRad) * Math.sin(theta)
      );
      if (axialRotation) _siteVec.applyQuaternion(axialRotation);
      dot.scale.setScalar(dotR);
      dot.position.set(
        earthPos.x + elev * _siteVec.x,
        earthPos.y + elev * _siteVec.y,
        earthPos.z + elev * _siteVec.z
      );
      dot.visible = true;
    }
  }

  function createStars() {
    const count = 2600;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 850 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: "#dfe7ff", size: 0.8, sizeAttenuation: true })
    );
  }

  function resizeRenderer() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function toScenePosition(position) {
    const metersToUnits = getViewConfig().metersToUnits;
    return new THREE.Vector3(
      position.x * metersToUnits,
      position.z * metersToUnits,
      position.y * metersToUnits
    );
  }

  function getViewConfig() {
    const view = activeScenario.view || {};
    return {
      metersToUnits: view.metersToUnits || DEFAULT_METERS_TO_UNITS,
      radiusScale: view.radiusScale || DEFAULT_RADIUS_TO_UNITS,
      useDisplayScale: view.useDisplayScale === true,
      minBodyRadius: view.minBodyRadius ?? 0.45,
      markers: view.markers !== false
    };
  }

  function getBodyVisualRadius(body) {
    const view = getViewConfig();
    const displayScale = view.useDisplayScale ? body.displayScale : 1;
    return Math.max(view.minBodyRadius, body.radius * displayScale * view.radiusScale);
  }

  function applyEarthEllipsoidScale(mesh, body, radius) {
    const ellipsoid = body.ellipsoid || (rocketSim && rocketSim.earthEllipsoid());
    if (!ellipsoid) {
      mesh.scale.setScalar(radius);
      return;
    }
    const eqScale = ellipsoid.equatorialRadiusM / body.radius;
    const polScale = ellipsoid.polarRadiusM / body.radius;
    // scene Y = physics Z = Earth rotation axis = polar direction
    if (mesh.userData && mesh.userData.surface) {
      mesh.scale.setScalar(radius);
      mesh.userData.surface.scale.set(eqScale, polScale, eqScale);
    } else {
      mesh.scale.set(radius * eqScale, radius * polScale, radius * eqScale);
    }
  }

  function shouldShowMarker(body) {
    const radius = getBodyVisualRadius(body);
    return body.name === "Rocket" || radius < 0.3;
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function hasSelectOption(select, value) {
    return Array.from(select.options).some((option) => option.value === value);
  }
