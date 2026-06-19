import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSET_DIR = path.join(ROOT, 'client', 'public', 'assets');
const CLASS_DIR = path.join(ASSET_DIR, 'Class');
const ENEMIES_DIR = path.join(ASSET_DIR, 'Enemies');
const VILLAGERS_DIR = path.join(ASSET_DIR, 'Villagers');
const MANIFEST_PATH = path.join(ASSET_DIR, 'spriteManifest.json');
const DEFAULTS_PATH = path.join(ASSET_DIR, 'spritesheet.defaults.json');

const CHARACTER_ANIMATION_FOLDERS = {
  Idle_Base: 'IDLE',
  Run_Base: 'RUN',
  Walk_Base: 'WALK',
  Carry_Idle: 'CARRY_IDLE',
  Carry_Run: 'CARRY_RUN',
  Carry_Walk: 'CARRY_WALK',
  Collect_Base: 'COLLECT',
  Crush_Base: 'CRUSH',
  Death_Base: 'DEATH',
  Fishing_Base: 'FISHING',
  Hit_Base: 'HIT',
  Pierce_Base: 'PIERCE',
  Slice_Base: 'SLICE',
  Watering_Base: 'WATERING',
};

const CHARACTER_DEFAULT_KEYS = {
  Idle_Base: 'idle',
  Run_Base: 'run',
  Walk_Base: 'walk',
  Carry_Idle: 'carry_idle',
  Carry_Run: 'carry_run',
  Carry_Walk: 'carry_walk',
  Collect_Base: 'collect',
  Crush_Base: 'crush',
  Death_Base: 'death',
  Fishing_Base: 'fishing',
  Hit_Base: 'hit',
  Pierce_Base: 'pierce',
  Slice_Base: 'slice',
  Watering_Base: 'watering',
};

const SIMPLE_ACTION_FOLDERS = {
  Idle: 'IDLE',
  Run: 'RUN',
  Walk: 'WALK',
  Death: 'DEATH',
};

const SIMPLE_DEFAULT_KEYS = {
  Idle: 'idle',
  Run: 'run',
  Walk: 'walk',
  Death: 'death',
};

const DIRECTION_SUFFIXES = {
  down: 'DOWN',
  side: 'RIGHT',
  up: 'UP',
  top: 'UP',
};

const DEFAULT_DEFAULTS = {
  frameWidth: 64,
  frameHeight: 64,
  defaultFrameCount: 4,
  animations: {
    idle: { frameRate: 6, repeat: -1 },
    run: { frameRate: 10, repeat: -1 },
    walk: { frameRate: 10, repeat: -1 },
    carry_idle: { frameRate: 6, repeat: -1 },
    carry_run: { frameRate: 10, repeat: -1 },
    carry_walk: { frameRate: 10, repeat: -1 },
    collect: { frameRate: 10, repeat: 0 },
    crush: { frameRate: 12, repeat: 0 },
    death: { frameRate: 8, repeat: 0 },
    fishing: { frameRate: 8, repeat: -1 },
    hit: { frameRate: 12, repeat: 0 },
    pierce: { frameRate: 12, repeat: 0 },
    slice: { frameRate: 12, repeat: 0 },
    watering: { frameRate: 8, repeat: 0 },
  },
};

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function loadDefaults() {
  if (!fs.existsSync(DEFAULTS_PATH)) {
    return DEFAULT_DEFAULTS;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
    return {
      ...DEFAULT_DEFAULTS,
      ...parsed,
      animations: {
        ...DEFAULT_DEFAULTS.animations,
        ...(parsed.animations ?? {}),
      },
    };
  } catch {
    return DEFAULT_DEFAULTS;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toCharacterSet(value) {
  return slugify(value);
}

function toAssetUrl(...segments) {
  return `/assets/${segments.map((segment) => segment.split(path.sep).join('/')).join('/')}`;
}

function resolveFrameConfig(defaults, defaultKey, dimensions) {
  const animationDefaults = defaults.animations[defaultKey] ?? defaults.animations.idle;
  const frameHeight = dimensions.height;
  const frameWidth = frameHeight;
  const columns = Math.max(1, Math.floor(dimensions.width / frameWidth));
  const rows = Math.max(1, Math.floor(dimensions.height / frameHeight));
  const inferredCount = columns * rows;
  const configuredCount = animationDefaults.frameCount ?? defaults.defaultFrameCount;

  return {
    frameWidth,
    frameHeight,
    frameCount: inferredCount > 1 ? inferredCount : configuredCount,
    frameRate: animationDefaults.frameRate,
    repeat: animationDefaults.repeat,
  };
}

function buildKeys(characterSet, action, direction) {
  const actionKey = action.toLowerCase();
  const directionKey = direction.toLowerCase();

  return {
    textureKey: `${characterSet}-tex-${actionKey}-${directionKey}`,
    animationKey: `${characterSet}-${actionKey}-${directionKey}`,
  };
}

function parseCharacterSheet(fileName, folderName) {
  if (!fileName.endsWith('-Sheet.png')) {
    return null;
  }

  const action = CHARACTER_ANIMATION_FOLDERS[folderName];
  if (!action) {
    return null;
  }

  const stem = fileName.replace(/-Sheet\.png$/i, '');
  const directionToken = stem.split('_').pop()?.toLowerCase();
  const direction = directionToken ? DIRECTION_SUFFIXES[directionToken] : null;

  if (!direction) {
    return null;
  }

  return {
    action,
    direction,
    defaultKey: CHARACTER_DEFAULT_KEYS[folderName],
  };
}

function parseSimpleSheet(fileName, folderName) {
  if (!fileName.endsWith('-Sheet.png')) {
    return null;
  }

  const action = SIMPLE_ACTION_FOLDERS[folderName];
  if (!action) {
    return null;
  }

  return {
    action,
    direction: 'RIGHT',
    defaultKey: SIMPLE_DEFAULT_KEYS[folderName],
  };
}

function scanCharacterBody(bodyDirName, animationsDir, defaults, entityType, profilePrefix) {
  const characterSet = toCharacterSet(bodyDirName);
  const profileId = `${profilePrefix}:${characterSet}`;
  const assetRoot = toAssetUrl('Class', bodyDirName, 'Animations');
  const sheets = [];
  const animationKeys = new Set();

  for (const folderName of fs.readdirSync(animationsDir, { withFileTypes: true })) {
    if (!folderName.isDirectory()) {
      continue;
    }

    const folderPath = path.join(animationsDir, folderName.name);

    for (const fileName of fs.readdirSync(folderPath)) {
      const parsed = parseCharacterSheet(fileName, folderName.name);
      if (!parsed) {
        continue;
      }

      const relativePath = `${folderName.name}/${fileName}`;
      const absolutePath = path.join(folderPath, fileName);
      const dimensions = readPngDimensions(absolutePath);
      if (!dimensions) {
        continue;
      }

      const frameConfig = resolveFrameConfig(defaults, parsed.defaultKey, dimensions);
      const keys = buildKeys(characterSet, parsed.action, parsed.direction);
      if (animationKeys.has(keys.animationKey)) {
        continue;
      }

      sheets.push({
        file: relativePath,
        ...keys,
        action: parsed.action,
        direction: parsed.direction,
        ...frameConfig,
      });
      animationKeys.add(keys.animationKey);
      console.log(`[scan] ${profileId} ${relativePath} -> ${keys.animationKey}`);
    }
  }

  sheets.sort((a, b) => a.animationKey.localeCompare(b.animationKey));

  return {
    profileId,
    characterSet,
    entityType,
    label: bodyDirName,
    assetRoot,
    sheets,
  };
}

function scanSimpleEntity(entityDir, profileId, entityType, label, characterSet, defaults) {
  const relativeFromAssets = path.relative(ASSET_DIR, entityDir).split(path.sep).join('/');
  const assetRoot = `/assets/${relativeFromAssets}`;
  const sheets = [];
  const animationKeys = new Set();

  for (const folderName of fs.readdirSync(entityDir, { withFileTypes: true })) {
    if (!folderName.isDirectory()) {
      continue;
    }

    const folderPath = path.join(entityDir, folderName.name);

    for (const fileName of fs.readdirSync(folderPath)) {
      const parsed = parseSimpleSheet(fileName, folderName.name);
      if (!parsed) {
        continue;
      }

      const relativePath = `${folderName.name}/${fileName}`;
      const absolutePath = path.join(folderPath, fileName);
      const dimensions = readPngDimensions(absolutePath);
      if (!dimensions) {
        continue;
      }

      const frameConfig = resolveFrameConfig(defaults, parsed.defaultKey, dimensions);
      const keys = buildKeys(characterSet, parsed.action, parsed.direction);
      if (animationKeys.has(keys.animationKey)) {
        continue;
      }

      sheets.push({
        file: relativePath,
        ...keys,
        action: parsed.action,
        direction: parsed.direction,
        ...frameConfig,
      });
      animationKeys.add(keys.animationKey);
      console.log(`[scan] ${profileId} ${relativePath} -> ${keys.animationKey}`);
    }
  }

  sheets.sort((a, b) => a.animationKey.localeCompare(b.animationKey));

  return {
    profileId,
    characterSet,
    entityType,
    label,
    assetRoot,
    sheets,
  };
}

function isEntityRoot(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).some((entry) => {
    return entry.isDirectory() && Object.hasOwn(SIMPLE_ACTION_FOLDERS, entry.name);
  });
}

function scanGroupedEntities(rootDir, profilePrefix, entityType, defaults) {
  const profiles = [];

  function walk(currentDir) {
    if (isEntityRoot(currentDir)) {
      const relativePath = path.relative(rootDir, currentDir);
      const slug = slugify(relativePath);
      const profileId = `${profilePrefix}:${slug}`;
      const characterSet = `${profilePrefix}-${slug}`;
      profiles.push(
        scanSimpleEntity(currentDir, profileId, entityType, relativePath, characterSet, defaults),
      );
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(currentDir, entry.name));
      }
    }
  }

  if (!fs.existsSync(rootDir)) {
    return profiles;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(path.join(rootDir, entry.name));
    }
  }

  return profiles;
}

function scanClassEntities(defaults) {
  const profiles = [];

  if (!fs.existsSync(CLASS_DIR)) {
    return profiles;
  }

  for (const classDir of fs.readdirSync(CLASS_DIR, { withFileTypes: true })) {
    if (!classDir.isDirectory()) {
      continue;
    }

    const classPath = path.join(CLASS_DIR, classDir.name);
    const animationsDir = path.join(classPath, 'Animations');

    if (fs.existsSync(animationsDir)) {
      profiles.push(scanCharacterBody(classDir.name, animationsDir, defaults, 'CLASS', 'class'));
      continue;
    }

    if (isEntityRoot(classPath)) {
      const slug = slugify(classDir.name);
      profiles.push(
        scanSimpleEntity(
          classPath,
          `class:${slug}`,
          'CLASS',
          classDir.name,
          `class-${slug}`,
          defaults,
        ),
      );
    }
  }

  return profiles;
}

function scanEntities() {
  const defaults = loadDefaults();
  const profiles = [
    ...scanClassEntities(defaults),
    ...scanGroupedEntities(ENEMIES_DIR, 'enemy', 'ENEMY', defaults),
    ...scanGroupedEntities(VILLAGERS_DIR, 'villager', 'VILLAGER', defaults),
  ];

  const bundle = {
    scannedAt: new Date().toISOString(),
    defaultCharacterProfileId: 'class:body-a',
    defaultVillagerProfileId: 'villager:body-a',
    profiles: profiles.filter((profile) => profile.sheets.length > 0),
  };

  if (!bundle.profiles.some((profile) => profile.profileId === bundle.defaultCharacterProfileId)) {
    const firstClass = bundle.profiles.find((profile) => profile.entityType === 'CLASS');
    if (firstClass) {
      bundle.defaultCharacterProfileId = firstClass.profileId;
    }
  }

  if (!bundle.profiles.some((profile) => profile.profileId === bundle.defaultVillagerProfileId)) {
    const firstVillager = bundle.profiles.find((profile) => profile.entityType === 'VILLAGER');
    bundle.defaultVillagerProfileId = firstVillager?.profileId ?? bundle.defaultCharacterProfileId;
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  const sheetCount = bundle.profiles.reduce((total, profile) => total + profile.sheets.length, 0);
  console.log(
    `[scan] ${bundle.profiles.length} Profile, ${sheetCount} Spritesheets -> ${MANIFEST_PATH}`,
  );
}

scanEntities();
