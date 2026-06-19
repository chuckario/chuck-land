/**
 * Active asset folders under /assets (client/public/assets).
 *
 * - Class     — playable character classes
 * - Enemies   — map-spawned enemies
 * - Land      — world map tiles and terrain props
 * - Villagers — village NPCs
 *
 * Reserved but unused for now: Dungeon, Weapons
 */
export const ASSET_ROOT = '/assets';

export const ASSET_FOLDERS = {
  class: 'Class',
  enemies: 'Enemies',
  land: 'Land',
  villagers: 'Villagers',
} as const;

export function assetUrl(...segments: string[]): string {
  return `${ASSET_ROOT}/${segments.map((segment) => segment.replace(/\\/g, '/')).join('/')}`;
}

export const SPRITE_MANIFEST_FILE = 'spriteManifest.json';
export const SPRITE_DEFAULTS_FILE = 'spritesheet.defaults.json';
export const SPRITE_MANIFEST_URL = assetUrl(SPRITE_MANIFEST_FILE);

/** Land — world map generation (tilesets + terrain props only). */
export const LAND_ASSETS = {
  tilesets: {
    floors: assetUrl(ASSET_FOLDERS.land, 'Tilesets', 'Floors_Tiles.png'),
    water: assetUrl(ASSET_FOLDERS.land, 'Tilesets', 'Water_tiles.png'),
  },
  props: {
    rocks: assetUrl(ASSET_FOLDERS.land, 'Props', 'Rocks.png'),
    vegetation: assetUrl(ASSET_FOLDERS.land, 'Props', 'Vegetation.png'),
    farm: assetUrl(ASSET_FOLDERS.land, 'Props', 'Farm.png'),
    treeManifest: assetUrl(ASSET_FOLDERS.land, 'Props', 'Trees', 'treeManifest.json'),
  },
} as const;
