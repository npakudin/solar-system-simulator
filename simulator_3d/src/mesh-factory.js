const TRAIL_INITIAL_CAPACITY = 2000;
const TINTED_TEXTURE_BODIES = new Set([
  "Moon",
  "Io",
  "Europa",
  "Ganymede",
  "Callisto",
  "Titan",
  "Rhea",
  "Iapetus",
  "Dione",
  "Enceladus"
]);

  let _textures = {};
  let _getLdem = () => null;
  let _getSaturnRing = () => null;
  let _getElapsed = () => 0;
  let _getShowTrails = () => true;

  function init({ textures, getLdemTexture, getSaturnRingTexture, getElapsed, getShowTrails }) {
    _textures = textures;
    _getLdem = getLdemTexture;
    _getSaturnRing = getSaturnRingTexture;
    _getElapsed = getElapsed;
    _getShowTrails = getShowTrails;
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

    if (body.name === "Sun") {
      const mat = new THREE.MeshBasicMaterial({ color: body.color });
      if (_textures[body.name]) { mat.color.set('#ffffff'); mat.map = _textures[body.name]; }
      const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
      return createAxialBodyMesh(body, surface);
    }

    if (body.name === "Saturn") {
      return createSaturnMesh(body);
    }

    if (body.name === 'ISS') {
      const mat = new THREE.MeshBasicMaterial({ color: '#00ffff' });
      return new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
    }

    const isMoon = body.name === 'Moon';
    const isNaturalSatellite = body.isSatellite && body.name !== 'ISS';
    const material = new THREE.MeshStandardMaterial({
      color: body.color,
      roughness: isNaturalSatellite || isMoon ? 0.88 : 0.6,
      metalness: isNaturalSatellite || isMoon ? 0.0 : 0.05
    });
    if (_textures[body.name]) {
      if (!TINTED_TEXTURE_BODIES.has(body.name)) material.color.set('#ffffff');
      material.map = _textures[body.name];
    }
    const ldemTexture = _getLdem();
    if (isMoon && ldemTexture) {
      material.bumpMap = ldemTexture;
      material.bumpScale = 0.015;
    }
    const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
    return createAxialBodyMesh(body, surface);
  }

  function createAxialBodyMesh(body, surface) {
    if (!Number.isFinite(body.axialTiltDeg)) {
      return surface;
    }

    const root = new THREE.Group();
    const axialGroup = new THREE.Group();
    const spinGroup = new THREE.Group();
    axialGroup.rotation.z = -body.axialTiltDeg * Math.PI / 180;
    spinGroup.add(surface);
    axialGroup.add(spinGroup);
    root.add(axialGroup);
    root.userData.axialGroup = axialGroup;
    root.userData.spinNode = spinGroup;
    root.userData.surface = surface;
    return root;
  }

  function createSaturnMesh(body) {
    const ringInnerRadius = body.rings ? body.rings.innerRadiusM / body.radius : 0;
    const ringOuterRadius = body.rings ? body.rings.outerRadiusM / body.radius : 0;

    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: _textures.Saturn ? "#ffffff" : body.color,
      map: _textures.Saturn || null,
      roughness: 0.7,
      metalness: 0.0
    });
    const surface = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), surfaceMaterial);
    surface.name = "SaturnSurface";

    const root = createAxialBodyMesh(body, surface);
    const axialGroup = root.userData.axialGroup;

    const rings = new THREE.Mesh(
      createSaturnRingGeometry(ringInnerRadius, ringOuterRadius, 384),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        map: _getSaturnRing(),
        transparent: true,
        opacity: 0.92,
        alphaTest: 0.015,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    rings.name = "SaturnRings";
    rings.renderOrder = 2;
    axialGroup.add(rings);

    const planetShadow = createSaturnPlanetShadow(ringInnerRadius, ringOuterRadius);
    const ringShadow = createSaturnRingShadow();
    axialGroup.add(planetShadow, ringShadow);

    root.userData.rings = rings;
    root.userData.saturnPlanetShadow = planetShadow;
    root.userData.saturnRingShadow = ringShadow;
    return root;
  }

  function createSaturnPlanetShadow(ringInnerRadius, ringOuterRadius) {
    const geometry = createSaturnShadowSectorGeometry(
      ringInnerRadius,
      ringOuterRadius * 0.94,
      -Math.PI * 0.18,
      Math.PI * 0.36,
      64
    );
    const material = new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(geometry, material);
    shadow.position.y = 0.006;
    shadow.renderOrder = 3;
    return shadow;
  }

  function createAnnularGeometry(innerRadius, outerRadius, segments, thetaStart = 0, thetaLength = Math.PI * 2, withUVs = false) {
    const positions = [];
    const uvs = withUVs ? [] : null;
    const indices = [];

    for (let i = 0; i <= segments; i += 1) {
      const angle = thetaStart + thetaLength * i / segments;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.push(innerRadius * cos, 0, innerRadius * sin);
      positions.push(outerRadius * cos, 0, outerRadius * sin);
      if (withUVs) {
        uvs.push(0, i / segments);
        uvs.push(1, i / segments);
      }
    }

    for (let i = 0; i < segments; i += 1) {
      const innerA = i * 2;
      const outerA = innerA + 1;
      const innerB = innerA + 2;
      const outerB = innerA + 3;
      indices.push(innerA, outerA, outerB, innerA, outerB, innerB);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (withUVs) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createSaturnRingGeometry(innerRadius, outerRadius, segments) {
    return createAnnularGeometry(innerRadius, outerRadius, segments, 0, Math.PI * 2, true);
  }

  function createSaturnShadowSectorGeometry(innerRadius, outerRadius, thetaStart, thetaLength, segments) {
    return createAnnularGeometry(innerRadius, outerRadius, segments, thetaStart, thetaLength, false);
  }

  function createSaturnRingShadow() {
    const shadow = new THREE.Mesh(
      new THREE.TorusGeometry(1.012, 0.028, 10, 160),
      new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    );
    shadow.rotation.x = Math.PI / 2;
    shadow.renderOrder = 4;
    return shadow;
  }

  function applyBodyTexture(mesh, name, tex) {
    const target = mesh.userData && mesh.userData.surface ? mesh.userData.surface : mesh;
    const mat = target.material;
    if (!mat) return;
    if (!TINTED_TEXTURE_BODIES.has(name)) mat.color.set('#ffffff');
    mat.map = tex;
    mat.needsUpdate = true;
  }

  function applySaturnRingTexture(mesh, tex) {
    const rings = mesh.userData && mesh.userData.rings;
    if (!rings || !rings.material) return;
    rings.material.map = tex;
    rings.material.needsUpdate = true;
  }

  function createTrail(body) {
    const capacity = TRAIL_INITIAL_CAPACITY;
    const positions = new Float32Array(capacity * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: body.name === "Rocket" ? "#ffffff" : body.color,
      transparent: true,
      opacity: body.name === "Rocket" ? 0.95 : 0.35
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.visible = _getShowTrails();
    return { line, positions, capacity, count: 0, nextSampleTime: _getElapsed() };
  }

  function resetTrail(trail) {
    trail.count = 0;
    trail.nextSampleTime = _getElapsed();
    trail.line.geometry.setDrawRange(0, 0);
    trail.line.geometry.attributes.position.needsUpdate = true;
  }

export const MeshFactory = {
  init,
  createBodyMesh,
  createTrail,
  resetTrail,
  applyBodyTexture,
  applySaturnRingTexture,
};
