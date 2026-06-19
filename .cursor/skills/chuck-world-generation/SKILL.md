---
name: chuck-world-generation
description: Procedural world generation for Chuck Land — elevation, moisture, biomes, rivers, beaches, resource spawn placement. Use for map generation, WorldManager, biomeGeneration, worldNoise, terrain painting, spawn points, or biome boundaries.
---

# Chuck Land — World Generation Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `server/src/WorldManager.ts` | Client tile rendering |
| `server/src/biomeGeneration.ts` | Socket events |
| `server/src/ResourceManager.ts` (spawn logic) | Enemy AI behavior |
| `shared/worldNoise.ts` | Visual autotile frames |

## Pipeline

1. Generate elevation/moisture/forest/stone fields (`fbm`, `hashNoise` in `shared/worldNoise.ts`)
2. `assignBiomeField()` → STANDARD, DESERT, FAIRY_FOREST, CEMETERY
3. `paintBiomeTerrain()` → `TerrainType[]`
4. Post-process: rivers, beaches, stone clusters, walkability
5. Expose via `WorldMapInterface`: `tiles`, `biomes`, `elevations`

## Constants

- Map: 320×240 tiles, 32px (`WORLD_MAP_WIDTH/HEIGHT`, `WORLD_TILE_SIZE`)
- Biome rules: `shared/biomeConfig.ts`

## Coordination

- New map fields → update `shared/types.ts` first (Shared Contract agent)
- Tile rendering agent reads output; keep semantic data stable
- `EnemyManager` and `ResourceManager` consume biome at spawn time

## Checklist

- [ ] Walkability correct at biome/elevation boundaries
- [ ] Spawn points on valid grass tiles
- [ ] Biome distribution matches climate intent
- [ ] No client-only logic in server gen code
