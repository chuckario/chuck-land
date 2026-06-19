import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const { PNG } = require(path.join(ROOT, 'client/node_modules/pngjs/lib/png.js'));
const PUBLIC_TREES_DIR = path.join(ROOT, 'client', 'public', 'assets', 'Land', 'Props', 'Trees');
const SOURCE_TREES_DIR = path.join(ROOT, 'client', 'assets', 'Land');
const OUTPUT_DIR = path.join(PUBLIC_TREES_DIR, 'Individual');
const MANIFEST_PATH = path.join(PUBLIC_TREES_DIR, 'treeManifest.json');

const SOURCE_SHEETS = [
  {
    scanDir: PUBLIC_TREES_DIR,
    match: (fileName, filePath) => {
      if (!/^Size_\d{2}\.png$/i.test(fileName)) {
        return false;
      }
      if (fileName.toLowerCase().includes('export')) {
        return false;
      }
      const relative = path.relative(PUBLIC_TREES_DIR, filePath).replace(/\\/g, '/');
      const match = relative.match(/^(Model_\d{2})\/(Size_\d{2}\.png)$/i);
      if (!match) {
        return false;
      }
      return {
        groupId: match[1].toLowerCase().replace('_', '-'),
        sizeId: match[2].replace('.png', '').toLowerCase().replace('_', '-'),
        publicPath: `/assets/Land/Props/Trees/${relative}`,
      };
    },
  },
  {
    scanDir: path.join(SOURCE_TREES_DIR, 'Fairy Forest', 'Assets'),
    match: (fileName, filePath) => {
      if (fileName !== 'Tree.png') {
        return false;
      }
      return {
        groupId: 'fairy-forest',
        sizeId: 'sheet',
        publicPath: '/assets/Land/Props/Trees/Individual/fairy-forest/sheet',
        copyToPublic: true,
        sourcePath: filePath,
      };
    },
  },
];

function isVisiblePixel(r, g, b, a) {
  return a > 20 && (r + g + b) > 30;
}

function findSpriteBounds(png) {
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const sprites = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index]) {
        continue;
      }

      const offset = index * 4;
      if (!isVisiblePixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) {
        continue;
      }

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const stack = [[x, y]];
      visited[index] = 1;

      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop();
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (const [nextX, nextY] of [
          [currentX + 1, currentY],
          [currentX - 1, currentY],
          [currentX, currentY + 1],
          [currentX, currentY - 1],
        ]) {
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue;
          }

          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex]) {
            continue;
          }

          const nextOffset = nextIndex * 4;
          if (!isVisiblePixel(
            data[nextOffset],
            data[nextOffset + 1],
            data[nextOffset + 2],
            data[nextOffset + 3],
          )) {
            continue;
          }

          visited[nextIndex] = 1;
          stack.push([nextX, nextY]);
        }
      }

      const spriteWidth = maxX - minX + 1;
      const spriteHeight = maxY - minY + 1;
      if (spriteWidth < 10 || spriteHeight < 10) {
        continue;
      }

      sprites.push({
        x: minX,
        y: minY,
        width: spriteWidth,
        height: spriteHeight,
      });
    }
  }

  return sprites.sort((left, right) => {
    if (left.y !== right.y) {
      return left.y - right.y;
    }
    return left.x - right.x;
  });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writeCroppedPng(source, bounds, outputPath) {
  const cropped = new PNG({ width: bounds.width, height: bounds.height });

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex = ((bounds.y + y) * source.width + (bounds.x + x)) * 4;
      const targetIndex = (y * bounds.width + x) * 4;
      cropped.data[targetIndex] = source.data[sourceIndex];
      cropped.data[targetIndex + 1] = source.data[sourceIndex + 1];
      cropped.data[targetIndex + 2] = source.data[sourceIndex + 2];
      cropped.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, PNG.sync.write(cropped));
}

function collectSourceFiles() {
  const files = [];

  for (const source of SOURCE_SHEETS) {
    if (!fs.existsSync(source.scanDir)) {
      continue;
    }

    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }

        if (!entry.name.toLowerCase().endsWith('.png')) {
          continue;
        }

        const meta = source.match(entry.name, fullPath);
        if (!meta) {
          continue;
        }

        files.push({
          ...meta,
          filePath: fullPath,
        });
      }
    };

    walk(source.scanDir);
  }

  return files;
}

function sizeToDisplayScale(sizeId) {
  switch (sizeId) {
    case 'size-02':
      return 1.35;
    case 'size-03':
      return 1.55;
    case 'size-04':
      return 1.85;
    case 'size-05':
      return 2.1;
    default:
      return 1.6;
  }
}

function main() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }

  const profiles = [];

  for (const sheet of collectSourceFiles()) {
    if (sheet.copyToPublic) {
      const targetSheetPath = path.join(OUTPUT_DIR, sheet.groupId, `${sheet.sizeId}.png`);
      fs.mkdirSync(path.dirname(targetSheetPath), { recursive: true });
      fs.copyFileSync(sheet.sourcePath, targetSheetPath);
      sheet.filePath = targetSheetPath;
    }

    const png = readPng(sheet.filePath);
    const sprites = findSpriteBounds(png);

    sprites.forEach((bounds, index) => {
      const profileId = `tree:${sheet.groupId}:${sheet.sizeId}:${String(index).padStart(2, '0')}`;
      const textureKey = `prop-${profileId.replace(/:/g, '-')}`;
      const fileName = `tree-${String(index).padStart(2, '0')}.png`;
      const outputPath = path.join(OUTPUT_DIR, sheet.groupId, sheet.sizeId, fileName);
      const assetPath = `/assets/Land/Props/Trees/Individual/${sheet.groupId}/${sheet.sizeId}/${fileName}`;

      writeCroppedPng(png, bounds, outputPath);

      profiles.push({
        profileId,
        textureKey,
        label: `${sheet.groupId} ${sheet.sizeId} #${index + 1}`,
        assetPath,
        groupId: sheet.groupId,
        sizeId: sheet.sizeId,
        sourceSheet: sheet.publicPath,
        bounds,
        displayScale: sizeToDisplayScale(sheet.sizeId),
        originY: 0.92,
        yOffsetFactor: -0.06,
      });
    });

    console.log(`  ${sheet.groupId}/${sheet.sizeId}: ${sprites.length} trees`);
  }

  const manifest = {
    scannedAt: new Date().toISOString(),
    profileCount: profiles.length,
    profiles,
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${profiles.length} tree profiles to ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main();
