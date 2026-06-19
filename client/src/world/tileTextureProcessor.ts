import Phaser from 'phaser';

const PROCESSED_SUFFIX = '-processed';

export function getProcessedTextureKey(sourceKey: string): string {
  return `${sourceKey}${PROCESSED_SUFFIX}`;
}

export interface TileTransparencyOptions {
  threshold?: number;
  tileWidth: number;
  tileHeight: number;
}

/**
 * Copies a loaded spritesheet and turns near-black pixels transparent so
 * isometric tiles can overlap cleanly across layers.
 */
export function processTilesetTransparency(
  scene: Phaser.Scene,
  sourceKey: string,
  options: TileTransparencyOptions,
): string {
  const processedKey = getProcessedTextureKey(sourceKey);

  if (scene.textures.exists(processedKey)) {
    return processedKey;
  }

  if (!scene.textures.exists(sourceKey)) {
    return sourceKey;
  }

  const threshold = options.threshold ?? 8;
  const sourceTexture = scene.textures.get(sourceKey);
  const source = sourceTexture.getSourceImage() as HTMLCanvasElement | HTMLImageElement;

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext('2d');
  if (!context) {
    return sourceKey;
  }

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index]!;
    const green = imageData.data[index + 1]!;
    const blue = imageData.data[index + 2]!;

    if (red <= threshold && green <= threshold && blue <= threshold) {
      imageData.data[index + 3] = 0;
      imageData.data[index] = 0;
      imageData.data[index + 1] = 0;
      imageData.data[index + 2] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);

  scene.textures.addSpriteSheet(processedKey, canvas as unknown as HTMLImageElement, {
    frameWidth: options.tileWidth,
    frameHeight: options.tileHeight,
  });

  return processedKey;
}
