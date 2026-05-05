import { mkdir, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const root = new URL("./", import.meta.url);
const parametersDir = new URL("./parameters/", root);
const texturesDir = new URL("./textures/solar-system-scope/", root);
const nasaTexturesDir = new URL("./textures/nasa/", root);

const epoch = "2026-May-01 00:00";
const nextEpoch = "2026-May-02 00:00";

const horizonsBodies = [
  { id: "10", name: "Sun" },
  { id: "199", name: "Mercury" },
  { id: "299", name: "Venus" },
  { id: "399", name: "Earth" },
  { id: "301", name: "Moon" },
  { id: "499", name: "Mars" },
  { id: "599", name: "Jupiter" },
  { id: "699", name: "Saturn" },
  { id: "799", name: "Uranus" },
  { id: "899", name: "Neptune" },
  { id: "999", name: "Pluto" }
];

const textures = [
  ["sun.jpg", "File:Solarsystemscope texture 8k sun.jpg"],
  ["mercury.jpg", "File:Solarsystemscope texture 8k mercury.jpg"],
  ["venus_surface.jpg", "File:Solarsystemscope texture 8k venus surface.jpg"],
  ["venus_atmosphere.jpg", "File:Solarsystemscope texture 4k venus atmosphere.jpg"],
  ["earth_daymap.jpg", "File:Solarsystemscope texture 8k earth daymap.jpg"],
  ["earth_nightmap.jpg", "File:Solarsystemscope texture 8k earth nightmap.jpg"]
];

const directSolarSystemScopeTextures = [
  ["moon.jpg", "https://www.solarsystemscope.com/textures/download/8k_moon.jpg"],
  ["mars.jpg", "https://www.solarsystemscope.com/textures/download/8k_mars.jpg"],
  ["jupiter.jpg", "https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg"],
  ["saturn.jpg", "https://www.solarsystemscope.com/textures/download/8k_saturn.jpg"],
  ["saturn_ring_alpha.png", "https://www.solarsystemscope.com/textures/download/8k_saturn_ring_alpha.png"],
  ["uranus.jpg", "https://www.solarsystemscope.com/textures/download/2k_uranus.jpg"],
  ["neptune.jpg", "https://www.solarsystemscope.com/textures/download/2k_neptune.jpg"],
  ["stars.jpg", "https://www.solarsystemscope.com/textures/download/8k_stars.jpg"],
  ["stars_milky_way.jpg", "https://www.solarsystemscope.com/textures/download/8k_stars_milky_way.jpg"]
];

const nasaTextures = [
  {
    file: "earth_blue_marble_august_21600.jpg",
    url: "https://neo.gsfc.nasa.gov/archive/bluemarble/bmng/world_2km/world.topo.bathy.200408.3x21600x10800.jpg",
    sourceUrl: "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
    credit: "NASA Earth Observatory"
  },
  {
    file: "earth_clouds_2048.jpg",
    url: "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg",
    sourceUrl: "https://visibleearth.nasa.gov/images/57747/blue-marble-clouds",
    credit: "NASA Visible Earth"
  },
  {
    file: "moon_lroc_color_2k.jpg",
    url: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg",
    sourceUrl: "https://svs.gsfc.nasa.gov/4720/",
    credit: "NASA/Goddard Space Flight Center Scientific Visualization Studio"
  },
  {
    file: "moon_ldem_3_8bit.jpg",
    url: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg",
    sourceUrl: "https://svs.gsfc.nasa.gov/4720/",
    credit: "NASA/Goddard Space Flight Center Scientific Visualization Studio"
  },
  {
    file: "pluto.jpg",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Pluto-map-sept-16-2015.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Pluto-map-sept-16-2015.jpg",
    credit: "NASA/JPL/SwRI — New Horizons mission; via Wikimedia Commons",
    license: "CC BY-SA 4.0"
  }
];

const physicalConstants = {
  units: "SI",
  sources: [
    "https://ssd.jpl.nasa.gov/planets/phys_par.html",
    "https://ssd.jpl.nasa.gov/sats/phys_par/",
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
    "https://science.nasa.gov/moon/by-the-numbers/",
    "https://www.wikidata.org/wiki/Q258129",
    "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/"
  ],
  earth: {
    meanRadiusM: 6371008.4,
    equatorialRadiusM: 6378136.6,
    gmM3S2: 3.98600436e14,
    siderealRotationPeriodS: 86164.1,
    angularVelocityRadS: 7.292115e-5,
    obliquityRad: 0.409093
  },
  moon: {
    meanRadiusM: 1737400,
    gmM3S2: 4.9028e12,
    massKg: 7.347673092e22,
    semiMajorAxisM: 384400000,
    eccentricity: 0.0549,
    meanPerigeeM: 363300000,
    meanApogeeM: 405500000,
    orbitalPeriodS: 2360594.88,
    meanOrbitalSpeedMS: 1022,
    inclinationToEclipticRad: 0.0897972
  },
  launchSites: {
    baikonurSite31_6: {
      latitudeRad: 0.802783582,
      longitudeRad: 1.109403995,
      latitudeDeg: 45.99611111,
      longitudeDeg: 63.56416667,
      recommendedDefault: true
    },
    baikonurSite1_5GagarinStart: {
      latitudeRad: 0.801460045,
      longitudeRad: 1.105530329,
      latitudeDeg: 45.920278,
      longitudeDeg: 63.342222,
      recommendedDefault: false
    }
  },
  rocketV1: {
    dryMassKg: 38000,
    fuelMassKg: 274000,
    wetMassKg: 312000,
    exhaustVelocityMS: 3000,
    maxMassFlowKgS: 1500,
    referenceVacuumIspS: 320.2,
    referenceSeaLevelIspS: 263.3
  }
};

await mkdir(parametersDir, { recursive: true });
await mkdir(texturesDir, { recursive: true });
await mkdir(nasaTexturesDir, { recursive: true });

const stateVectors = [];
for (const body of horizonsBodies) {
  const result = await fetchHorizons(body);
  stateVectors.push(result);
  console.log(`Horizons: ${body.name}`);
}

await writeJson(new URL("./horizons_state_vectors_2026-05-01.json", parametersDir), {
  source: {
    type: "NASA/JPL Horizons",
    api: "https://ssd.jpl.nasa.gov/api/horizons.api",
    docs: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
    query: {
      EPHEM_TYPE: "VECTORS",
      CENTER: "@0",
      REF_SYSTEM: "ICRF",
      REF_PLANE: "FRAME",
      OUT_UNITS: "KM-S",
      VEC_TABLE: "2",
      VEC_CORR: "NONE",
      TIME_TYPE: "TDB",
      START_TIME: epoch,
      STOP_TIME: nextEpoch,
      STEP_SIZE: "1 d"
    }
  },
  epoch: {
    calendar: "2026-05-01T00:00:00",
    requestedHorizonsTime: epoch,
    timeScale: "TDB"
  },
  frame: "ICRF",
  center: { id: "0", name: "Solar System Barycenter" },
  units: {
    position: "km",
    velocity: "km/s"
  },
  bodies: stateVectors
});

await writeJson(new URL("./physical_constants_and_launch.json", parametersDir), physicalConstants);

const textureManifest = [];
const nasaTextureManifest = [];
for (const item of nasaTextures) {
  const output = new URL(`./${item.file}`, nasaTexturesDir);
  await download(item.url, output);
  nasaTextureManifest.push({
    file: item.file,
    sourceUrl: item.sourceUrl,
    downloadUrl: item.url,
    license: "NASA media, generally public domain; retain credit.",
    credit: item.credit
  });
  console.log(`NASA texture: ${item.file}`);
}

for (const [fileName, title] of textures) {
  const info = await fetchCommonsImageInfo(title);
  const output = new URL(`./${fileName}`, texturesDir);
  await download(info.url, output);
  textureManifest.push({
    file: fileName,
    commonsTitle: title,
    sourceUrl: info.descriptionurl,
    downloadUrl: info.url,
    mime: info.mime,
    sizeBytes: info.size,
    width: info.width,
    height: info.height,
    license: info.extmetadata?.LicenseShortName?.value ?? "CC BY 4.0",
    artist: stripHtml(info.extmetadata?.Artist?.value ?? "Solar System Scope"),
    credit: stripHtml(info.extmetadata?.Credit?.value ?? "Solar System Scope")
  });
  console.log(`Texture: ${fileName}`);
}

for (const [fileName, url] of directSolarSystemScopeTextures) {
  const output = new URL(`./${fileName}`, texturesDir);
  await download(url, output);
  textureManifest.push({
    file: fileName,
    sourceUrl: "https://www.solarsystemscope.com/textures/",
    downloadUrl: url,
    license: "Solar System Scope texture; see source page terms and keep attribution.",
    artist: "Solar System Scope",
    credit: "Solar System Scope"
  });
  console.log(`Texture: ${fileName}`);
}

await writeJson(new URL("./manifest.json", texturesDir), {
  source: {
    collection: "Solar System Scope textures from Wikimedia Commons and direct Solar System Scope downloads",
    collectionUrl: "https://commons.wikimedia.org/wiki/Category:Solar_System_Scope",
    directSourceUrl: "https://www.solarsystemscope.com/textures/",
    license: "Mixed per texture entry; keep attribution."
  },
  textures: textureManifest
});

await writeJson(new URL("./manifest.json", nasaTexturesDir), {
  source: {
    collection: "NASA/GSFC texture sources",
    license: "NASA media, generally public domain; retain credit."
  },
  textures: nasaTextureManifest
});

await writeFile(new URL("./README.md", root), `# Space Assets

Generated on ${new Date().toISOString()}.

- \`parameters/horizons_state_vectors_2026-05-01.json\`: NASA/JPL Horizons state vectors for Sun, planets, and Moon at 2026-05-01 00:00 TDB, centered on the Solar System barycenter.
- \`parameters/physical_constants_and_launch.json\`: SI constants for Earth, Moon, Baikonur presets, and a Soyuz-like v1 rocket.
- \`textures/nasa/\`: higher-resolution NASA Earth and Moon textures.
- \`textures/solar-system-scope/\`: equirectangular textures from Solar System Scope via Wikimedia Commons where possible, and direct Solar System Scope downloads where Wikimedia rate-limited. See \`manifest.json\` per file.

The app code is not wired to these files yet.
`);

async function fetchHorizons(body) {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${body.id}'`,
    OBJ_DATA: "YES",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER: "@0",
    START_TIME: `'${epoch}'`,
    STOP_TIME: `'${nextEpoch}'`,
    STEP_SIZE: "'1 d'",
    REF_SYSTEM: "ICRF",
    REF_PLANE: "FRAME",
    OUT_UNITS: "KM-S",
    VEC_TABLE: "2",
    VEC_CORR: "NONE",
    TIME_TYPE: "TDB"
  });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
  if (!response.ok) {
    throw new Error(`Horizons request failed for ${body.name}: ${response.status}`);
  }
  const json = await response.json();
  const raw = json.result ?? "";
  const block = raw.match(/\$\$SOE([\s\S]*?)\$\$EOE/)?.[1];
  if (!block) {
    throw new Error(`Could not parse Horizons vector block for ${body.name}`);
  }
  const values = {};
  for (const key of ["X", "Y", "Z", "VX", "VY", "VZ"]) {
    const match = block.match(new RegExp(`${key}\\s*=\\s*([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)`));
    if (!match) {
      throw new Error(`Missing ${key} for ${body.name}`);
    }
    values[key] = Number(match[1]);
  }
  return {
    id: body.id,
    name: body.name,
    positionKm: [values.X, values.Y, values.Z],
    velocityKmS: [values.VX, values.VY, values.VZ],
    rawCalendarLine: block.trim().split("\n")[0].trim()
  };
}

async function fetchCommonsImageInfo(title) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata"
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "planets3d asset downloader" }
  });
  if (!response.ok) {
    throw new Error(`Commons request failed for ${title}: ${response.status}`);
  }
  const json = await response.json();
  const page = Object.values(json.query.pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) {
    throw new Error(`No image URL for ${title}`);
  }
  return info;
}

async function download(url, output) {
  try {
    const existing = await stat(output);
    if (existing.size > 0) {
      return;
    }
  } catch {
    // Download the file when it does not exist yet.
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": "planets3d asset downloader" }
    });
    if (response.ok && response.body) {
      await pipeline(response.body, createWriteStream(output));
      return;
    }
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Math.min(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 15000, 30000);
      console.log(`Retry ${attempt}/5 after ${delayMs / 1000}s: ${url}`);
      await sleep(delayMs);
      continue;
    }
    throw new Error(`Download failed for ${url}: ${response.status}`);
  }
  throw new Error(`Download failed after retries for ${url}`);
}

async function writeJson(url, value) {
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
