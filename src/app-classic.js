(function () {
  const {
    constants,
    createInitialBodies,
    distance,
    getScenario,
    getScenarios,
    launchRocket,
    speed,
    stepSimulation
  } = window.SolarPhysics;
  const rocketSim = window.RocketSim;

  const canvas = document.querySelector("#scene");
  const scenarioSelect = document.querySelector("#scenario-select");
  const runButton = document.querySelector("#toggle-run");
  const launchButton = document.querySelector("#launch-rocket");
  const resetButton = document.querySelector("#reset-sim");
  const cameraTargetSelect = document.querySelector("#camera-target");
  const timeScaleInput = document.querySelector("#time-scale");
  const showTrailsInput = document.querySelector("#show-trails");
  const timeReadout = document.querySelector("#time-readout");
  const rocketSpeedReadout = document.querySelector("#rocket-speed");
  const jupiterDistanceReadout = document.querySelector("#jupiter-distance");
  const missionTimeReadout = document.querySelector("#mission-time");
  const flightPhaseReadout = document.querySelector("#flight-phase");
  const nextBurnReadout = document.querySelector("#next-burn-readout");
  const throttleReadout = document.querySelector("#throttle-readout");
  const fuelReadout = document.querySelector("#fuel-readout");
  const rocketMassReadout = document.querySelector("#rocket-mass-readout");
  const massFlowReadout = document.querySelector("#mass-flow-readout");
  const orbitInclinationReadout = document.querySelector("#orbit-inclination");
  const launchSiteSelect = document.querySelector("#launch-site-select");
  const targetProfileSelect = document.querySelector("#target-profile-select");

  const DEFAULT_METERS_TO_UNITS = 1 / 8.0e9;
  const DEFAULT_RADIUS_TO_UNITS = 1 / 8.0e9;
  const BASE_STEP_SECONDS = 3600;
  const MAX_TRAIL_POINTS = 1500;
  const TRAIL_SAMPLE_SECONDS = {
    Sun: constants.DAY * 7,
    Mercury: constants.DAY * 2,
    Venus: constants.DAY * 2,
    Earth: constants.DAY * 2,
    Moon: constants.DAY / 8,
    Mars: constants.DAY * 3,
    Jupiter: constants.DAY * 10,
    Saturn: constants.DAY * 14,
    Uranus: constants.DAY * 20,
    Neptune: constants.DAY * 24,
    Rocket: constants.DAY / 4
  };

  let activeScenarioId = window.SolarScenarioData.defaultScenarioId;
  let activeScenario = getScenario(activeScenarioId);
  let bodies = createInitialBodies(activeScenarioId);
  let elapsedSeconds = 0;
  let running = false;
  let lastFrameTime = 0;
  let rocketMissionState = null;
  let activeLaunchSiteId = rocketSim ? rocketSim.defaultLaunchSiteId() : "";
  let activeTargetProfileId = rocketSim ? rocketSim.defaultTargetProfileId(activeScenarioId) : "";

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

  const sunLight = new THREE.PointLight("#fff1c4", 4, 0, 0);
  scene.add(sunLight);

  const grid = new THREE.GridHelper(220, 44, "#243040", "#101722");
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const stars = createStars();
  scene.add(stars);

  const bodyMeshes = new Map();
  const trails = new Map();
  const markerGroup = new THREE.Group();
  const referenceOrbitGroup = new THREE.Group();
  const pelletSystem = rocketSim
    ? rocketSim.createPelletSystem(THREE, 2000, DEFAULT_METERS_TO_UNITS)
    : null;
  scene.add(markerGroup);
  scene.add(referenceOrbitGroup);
  if (pelletSystem) {
    scene.add(pelletSystem.points);
  }

  populateScenarioSelect();
  populateLaunchSiteSelect();
  populateTargetProfileSelect(activeScenarioId);
  applyScenarioUiDefaults();
  applyScenarioCamera();
  syncSceneObjects();
  syncReferenceOrbits();

  scenarioSelect.addEventListener("change", () => {
    activeScenarioId = scenarioSelect.value;
    activeScenario = getScenario(activeScenarioId);
    activeTargetProfileId = rocketSim ? rocketSim.defaultTargetProfileId(activeScenarioId) : "";
    populateTargetProfileSelect(activeScenarioId);
    resetSimulation();
    applyScenarioUiDefaults();
    applyScenarioCamera();
    syncPelletScale();
  });

  launchSiteSelect && launchSiteSelect.addEventListener("change", () => {
    activeLaunchSiteId = launchSiteSelect.value;
  });

  targetProfileSelect && targetProfileSelect.addEventListener("change", () => {
    activeTargetProfileId = targetProfileSelect.value;
  });

  runButton.addEventListener("click", () => {
    running = !running;
    runButton.textContent = running ? "Stop" : "Start";
  });

  launchButton.addEventListener("click", () => {
    const mission = currentMission();
    if (mission) {
      if (!rocketMissionState) {
        rocketMissionState = rocketSim.createMissionState(mission, bodies);
        if (pelletSystem) {
          rocketSim.resetPelletSystem(pelletSystem);
        }
      }
    } else {
      bodies = launchRocket(bodies, activeScenarioId);
    }
    syncSceneObjects();
    cameraTargetSelect.value = "rocket";
    if (mission) {
      focusCameraOnRocketLaunch();
    }
    running = true;
    runButton.textContent = "Stop";
  });

  resetButton.addEventListener("click", () => {
    resetSimulation();
  });

  showTrailsInput.addEventListener("change", () => {
    for (const trail of trails.values()) {
      trail.line.visible = showTrailsInput.checked;
    }
  });

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();
  requestAnimationFrame(animate);

  function animate(frameTime) {
    requestAnimationFrame(animate);

    const deltaMs = Math.min(frameTime - lastFrameTime, 80);
    lastFrameTime = frameTime;

    if (running) {
      syncPelletScale();
      const steps = Math.max(1, Math.floor(Number(timeScaleInput.value)));
      let remainingSeconds = steps * (activeScenario.stepSeconds || BASE_STEP_SECONDS);
      let guard = 0;

      while (remainingSeconds > 0 && guard < 500) {
        const scenarioStepSeconds = activeScenario.stepSeconds || BASE_STEP_SECONDS;
        let stepSeconds = Math.min(remainingSeconds, scenarioStepSeconds);
        if (rocketSim && rocketMissionState) {
          stepSeconds = rocketSim.chooseStepSeconds(rocketMissionState, bodies, stepSeconds);
        }

        stepSeconds = Math.min(stepSeconds, remainingSeconds);
        rocketSim && rocketSim.updateRocketBeforePhysics(
          rocketMissionState,
          bodies,
          stepSeconds,
          pelletSystem
        );
        stepSimulation(bodies, stepSeconds);
        elapsedSeconds += stepSeconds;
        rocketSim && rocketSim.updateRocketAfterPhysics(
          rocketMissionState,
          bodies,
          stepSeconds,
          pelletSystem
        );
        appendTrailSamples();
        remainingSeconds -= stepSeconds;
        guard += 1;
      }
    }

    updateMeshes();
    updateCameraTarget(deltaMs / 1000);
    controls.update();
    updateReadouts();
    renderer.render(scene, camera);
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
    return rocketSim && rocketSim.missionForScenario(activeScenarioId, activeLaunchSiteId, activeTargetProfileId);
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

  function populateLaunchSiteSelect() {
    if (!rocketSim || !launchSiteSelect) {
      return;
    }
    launchSiteSelect.replaceChildren();
    for (const site of rocketSim.launchSites()) {
      const option = document.createElement("option");
      option.value = site.id;
      option.textContent = `${site.name} (${site.latDeg.toFixed(1)}°)`;
      launchSiteSelect.append(option);
    }
    if (activeLaunchSiteId) {
      launchSiteSelect.value = activeLaunchSiteId;
    }
  }

  function populateTargetProfileSelect(scenarioId) {
    if (!rocketSim || !targetProfileSelect) {
      return;
    }
    const profiles = rocketSim.targetProfilesForScenario(scenarioId);
    targetProfileSelect.replaceChildren();
    for (const profile of profiles) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.label;
      targetProfileSelect.append(option);
    }
    const matchesCurrent = profiles.some((p) => p.id === activeTargetProfileId);
    if (matchesCurrent) {
      targetProfileSelect.value = activeTargetProfileId;
    } else if (profiles.length > 0) {
      activeTargetProfileId = profiles[0].id;
      targetProfileSelect.value = activeTargetProfileId;
    }
  }

  function resetSimulation() {
    bodies = createInitialBodies(activeScenarioId);
    elapsedSeconds = 0;
    running = false;
    rocketMissionState = null;
    if (rocketSim && pelletSystem) {
      rocketSim.resetPelletSystem(pelletSystem);
    }
    runButton.textContent = "Start";
    syncSceneObjects();
    syncReferenceOrbits();
    syncPelletScale();
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
    if (defaults.timeScale) {
      timeScaleInput.value = defaults.timeScale;
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

  function createBodyMesh(body) {
    if (body.name === "Rocket") {
      const group = new THREE.Group();
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.9, 20),
        new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.35, metalness: 0.2 })
      );
      const bodyMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.8, 20),
        new THREE.MeshStandardMaterial({ color: "#c9ccd3", roughness: 0.45, metalness: 0.45 })
      );
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.55, 16),
        new THREE.MeshBasicMaterial({ color: "#ff7b31", transparent: true, opacity: 0.75 })
      );
      nose.position.y = 0.65;
      flame.position.y = -0.65;
      flame.rotation.x = Math.PI;
      group.add(nose, bodyMesh, flame);
      return group;
    }

    const material = body.name === "Sun"
      ? new THREE.MeshBasicMaterial({ color: body.color })
      : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.6, metalness: 0.05 });

    return new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
  }

  function createTrail(body) {
    const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: body.name === "Rocket" ? "#ffffff" : body.color,
      transparent: true,
      opacity: body.name === "Rocket" ? 0.95 : 0.35
    });

    const line = new THREE.Line(geometry, material);
    line.visible = showTrailsInput.checked;
    return { line, points: [], positions, nextSampleTime: elapsedSeconds };
  }

  function resetTrail(trail) {
    trail.points.length = 0;
    trail.nextSampleTime = elapsedSeconds;
    trail.line.geometry.setDrawRange(0, 0);
    trail.line.geometry.attributes.position.needsUpdate = true;
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
        mesh.scale.setScalar(1);
      } else {
        const radius = getBodyVisualRadius(body);
        if (body.name === "Earth") {
          applyEarthEllipsoidScale(mesh, body, radius);
        } else {
          mesh.scale.setScalar(radius);
        }
        mesh.rotation.y += body.name === "Jupiter" ? 0.008 : 0.004;
      }

      if (getViewConfig().markers && shouldShowMarker(body)) {
        addLabelMarker(body, scenePosition);
      }

      if (body.name === "Sun") {
        sunLight.position.copy(scenePosition);
      }
    }
  }

  function appendTrailSamples() {
    if (!showTrailsInput.checked) {
      return;
    }

    for (const body of bodies) {
      const trail = trails.get(body.name);
      if (!trail) {
        continue;
      }

      const interval = TRAIL_SAMPLE_SECONDS[body.name] || constants.DAY * 3;
      if (elapsedSeconds < trail.nextSampleTime) {
        continue;
      }

      appendTrailPoint(trail, toScenePosition(body.position));
      trail.nextSampleTime = elapsedSeconds + interval;
    }
  }

  function appendTrailPoint(trail, scenePosition) {
    trail.points.push(scenePosition.clone());
    if (trail.points.length > MAX_TRAIL_POINTS) {
      trail.points.shift();
    }

    for (let i = 0; i < trail.points.length; i += 1) {
      const point = trail.points[i];
      trail.positions[i * 3] = point.x;
      trail.positions[i * 3 + 1] = point.y;
      trail.positions[i * 3 + 2] = point.z;
    }

    trail.line.geometry.setDrawRange(0, trail.points.length);
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
      return;
    }

    const body = bodies.find((item) => item.name.toLowerCase() === targetName);
    if (!body) {
      return;
    }

    const target = toScenePosition(body.position);
    controls.target.lerp(target, Math.min(1, deltaSeconds * 3));
  }

  function updateReadouts() {
    timeReadout.textContent = `${(elapsedSeconds / constants.YEAR).toFixed(2)} years`;

    const rocket = bodies.find((body) => body.name === "Rocket");
    const jupiter = bodies.find((body) => body.name === "Jupiter");

    if (!rocket) {
      rocketSpeedReadout.textContent = "not launched";
      jupiterDistanceReadout.textContent = "not launched";
      updateMissionReadouts(null);
      return;
    }

    const missionStatus = rocketSim && rocketSim.missionStatus(rocketMissionState, bodies);
    const fuelText = missionStatus
      ? `, fuel ${(missionStatus.fuelMass / 1000).toFixed(1)} t`
      : "";
    rocketSpeedReadout.textContent = `${(speed(rocket) / 1000).toFixed(2)} km/s${fuelText}`;
    jupiterDistanceReadout.textContent = jupiter
      ? `${(distance(rocket.position, jupiter.position) / 1e9).toFixed(2)} Gm`
      : "no Jupiter";

    updateMissionReadouts(missionStatus);
  }

  function updateMissionReadouts(missionStatus) {
    const mission = currentMission();
    if (!mission) {
      missionTimeReadout.textContent = "n/a";
      flightPhaseReadout.textContent = "n/a";
      nextBurnReadout.textContent = "n/a";
      throttleReadout.textContent = "n/a";
      fuelReadout.textContent = "n/a";
      rocketMassReadout.textContent = "n/a";
      massFlowReadout.textContent = "n/a";
      orbitInclinationReadout.textContent = "n/a";
      return;
    }

    if (!missionStatus) {
      missionTimeReadout.textContent = "0 s";
      flightPhaseReadout.textContent = "ready";
      nextBurnReadout.textContent = firstBurnText(mission);
      throttleReadout.textContent = "0%";
      fuelReadout.textContent = `${(mission.vehicle.fuelMassKg / 1000).toFixed(1)} t`;
      rocketMassReadout.textContent = `${((mission.vehicle.dryMassKg + mission.vehicle.fuelMassKg) / 1000).toFixed(1)} t`;
      massFlowReadout.textContent = `0 / ${mission.vehicle.maxMassFlowKgPerSec.toFixed(0)} kg/s`;
      orbitInclinationReadout.textContent = `target ${(mission.targetOrbit || {}).inclinationDeg || "?"} deg`;
      return;
    }

    missionTimeReadout.textContent = `${missionStatus.missionTime.toFixed(1)} s`;
    flightPhaseReadout.textContent = formatCommand(missionStatus);
    nextBurnReadout.textContent = missionStatus.nextBurnName
      ? `${missionStatus.nextBurnName} in ${formatDuration(missionStatus.nextBurnInSeconds)}`
      : "none";
    throttleReadout.textContent = `${(missionStatus.throttle * 100).toFixed(0)}%`;
    fuelReadout.textContent = `${(missionStatus.fuelMass / 1000).toFixed(1)} t (${missionStatus.fuelPercent.toFixed(0)}%)`;
    rocketMassReadout.textContent = `${(missionStatus.totalMass / 1000).toFixed(1)} t`;
    massFlowReadout.textContent = `${missionStatus.massFlowKgPerSec.toFixed(0)} / ${missionStatus.maxMassFlowKgPerSec.toFixed(0)} kg/s`;
    orbitInclinationReadout.textContent = Number.isFinite(missionStatus.inclinationDeg)
      ? `${missionStatus.inclinationDeg.toFixed(1)} deg`
      : `target ${missionStatus.targetInclinationDeg || "?"} deg`;
  }

  function firstBurnText(mission) {
    const first = (mission.program || []).find((burn) => (burn.throttle || 0) > 0);
    return first ? `${first.name} at ${formatDuration(first.start)}` : "none";
  }

  function formatCommand(missionStatus) {
    const name = missionStatus.commandName || "idle";
    if (Number.isFinite(missionStatus.commandStart) && Number.isFinite(missionStatus.commandEnd)) {
      return `${name} (${missionStatus.commandStart.toFixed(0)}-${missionStatus.commandEnd.toFixed(0)}s)`;
    }
    return name;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) {
      return "n/a";
    }
    if (seconds < 120) {
      return `${seconds.toFixed(0)}s`;
    }
    if (seconds < 3 * 3600) {
      return `${(seconds / 60).toFixed(1)}m`;
    }
    return `${(seconds / 3600).toFixed(1)}h`;
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
      useDisplayScale: view.useDisplayScale !== false,
      minBodyRadius: view.minBodyRadius ?? 0.45,
      markers: view.markers !== false
    };
  }

  function syncPelletScale() {
    if (pelletSystem) {
      pelletSystem.metersToUnits = getViewConfig().metersToUnits;
    }
  }

  function getBodyVisualRadius(body) {
    const view = getViewConfig();
    const displayScale = view.useDisplayScale ? body.displayScale : 1;
    return Math.max(view.minBodyRadius, body.radius * displayScale * view.radiusScale);
  }

  function applyEarthEllipsoidScale(mesh, body, radius) {
    const ellipsoid = rocketSim && rocketSim.earthEllipsoid();
    if (!ellipsoid) {
      mesh.scale.setScalar(radius);
      return;
    }
    const eqScale = ellipsoid.equatorialRadiusM / body.radius;
    const polScale = ellipsoid.polarRadiusM / body.radius;
    // scene Y = physics Z = Earth rotation axis = polar direction
    mesh.scale.set(radius * eqScale, radius * polScale, radius * eqScale);
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
})();
