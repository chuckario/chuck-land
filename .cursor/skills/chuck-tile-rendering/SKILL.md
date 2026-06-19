---
name: chuck-tile-rendering
description: Isometric tile rendering for Chuck Land — autotile, Wang/blob bitmask, cliff underfill, tileset atlases, water animation. Use for TileWorldRenderer, terrainAutotile, Floors_Tiles, isometric layers, biome transitions, or visual map bugs.
---

# Chuck Land — Tile Rendering Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `client/src/world/tiles/*` | Map generation algorithms |
| `client/src/world/TileWorldRenderer.ts` | Server simulation |
| `client/src/world/tilesetRegistry.ts`, `tilesetConfig.ts` | Gameplay rules |
| `shared/blobAutotile.ts` | Socket protocol |

## Autotile algorithm

**Cardinal mask:** N=1, E=2, S=4, W=8 (neighbor same terrain mass)

**Roles:** `fill`, `edge-n/e/s/w`, `inner-ne/nw/se/sw`, `outer-ne/nw/se/sw`, `isolated`

**Frame index:** `origin + col + row * 25` (25 columns, 16px cells)

**Atlases:** `terrainAutotileAtlas.ts` maps roles → frame indices per terrain set (`grassLower`, `sandGrass`, etc.)

## Layer stack

1. Lower layer (sand/stone under cliffs)
2. Base terrain
3. Overlay (forest/grass on elevated tiles)
4. Cliff edges via `cliffRendering.ts` using `elevations[]`

## Coordination

- Reads `WorldMapInterface` from server sync only
- If new terrain type added → Shared Contract + World Gen first, then atlas frames
- Asset agent owns tileset PNG paths; this agent owns frame mapping

## Checklist

- [ ] Biome borders seamless (inner/outer corners correct)
- [ ] Cliff underfill matches elevation
- [ ] Water animates via `tilesetConfig.ts`
- [ ] No mutation of map arrays on client
