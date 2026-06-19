import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, '..', 'client', 'public', 'assets');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function moveIfExists(from, to) {
  if (!fs.existsSync(from)) {
    return false;
  }

  ensureDir(path.dirname(to));
  if (fs.existsSync(to)) {
    fs.rmSync(to, { recursive: true, force: true });
  }

  fs.renameSync(from, to);
  console.log(`[migrate] ${path.relative(ASSET_DIR, from)} -> ${path.relative(ASSET_DIR, to)}`);
  return true;
}

function moveChildren(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) {
    return;
  }

  ensureDir(toDir);
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    moveIfExists(path.join(fromDir, entry.name), path.join(toDir, entry.name));
  }
}

ensureDir(path.join(ASSET_DIR, 'Class'));
ensureDir(path.join(ASSET_DIR, 'Enemies'));
ensureDir(path.join(ASSET_DIR, 'Villagers'));
ensureDir(path.join(ASSET_DIR, 'Land', 'Tilesets'));
ensureDir(path.join(ASSET_DIR, 'Land', 'Props', 'Trees'));

moveIfExists(
  path.join(ASSET_DIR, 'Environment', 'Tilesets', 'Floors_Tiles.png'),
  path.join(ASSET_DIR, 'Land', 'Tilesets', 'Floors_Tiles.png'),
);
moveIfExists(
  path.join(ASSET_DIR, 'Environment', 'Tilesets', 'Water_tiles.png'),
  path.join(ASSET_DIR, 'Land', 'Tilesets', 'Water_tiles.png'),
);
moveIfExists(
  path.join(ASSET_DIR, 'Environment', 'Props', 'Static', 'Rocks.png'),
  path.join(ASSET_DIR, 'Land', 'Props', 'Rocks.png'),
);
moveIfExists(
  path.join(ASSET_DIR, 'Environment', 'Props', 'Static', 'Vegetation.png'),
  path.join(ASSET_DIR, 'Land', 'Props', 'Vegetation.png'),
);
moveIfExists(
  path.join(ASSET_DIR, 'Environment', 'Props', 'Static', 'Farm.png'),
  path.join(ASSET_DIR, 'Land', 'Props', 'Farm.png'),
);
moveChildren(
  path.join(ASSET_DIR, 'Environment', 'Props', 'Static', 'Trees'),
  path.join(ASSET_DIR, 'Land', 'Props', 'Trees'),
);

moveChildren(path.join(ASSET_DIR, 'Entities', 'Characters'), path.join(ASSET_DIR, 'Class'));
moveChildren(path.join(ASSET_DIR, 'Entities', 'Heroes'), path.join(ASSET_DIR, 'Class'));
moveChildren(path.join(ASSET_DIR, 'Entities', 'Mobs'), path.join(ASSET_DIR, 'Enemies'));

console.log('[migrate] Done. Dungeon and Weapons were left untouched.');
