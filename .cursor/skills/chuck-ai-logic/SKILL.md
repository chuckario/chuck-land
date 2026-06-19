---
name: chuck-ai-logic
description: Chuck Land AI — NPC profession behaviors, enemy spawning, patrol, aggro, combat. Use for ProfessionAiManager, profession behaviors, EnemyManager, NpcRenderer, EnemyRenderer, or game AI.
---

# Chuck Land — AI Logic Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `server/src/professions/*` | Map generation |
| `server/src/EnemyManager.ts` | Socket gateway |
| `client/src/world/NpcRenderer.ts`, `EnemyRenderer.ts` | Tile autotile |

## NPC AI

- `ProfessionAiManager.tick()` called from `GameRoom.simulateTick()`
- 12 active professions in `professionBehaviors.ts`
- `BaseProfessionBehavior`: move toward resource/building, work in place
- Config: `shared/professionConfig.ts`, `shared/resourceConfig.ts`

## Enemies (current state)

- Spawn once at init via `ENEMY_SPAWN_DEFINITIONS` (`shared/biomeConfig.ts`)
- Static positions, `hp: 100`, **no combat loop yet**
- Future: tick loop, aggro radius, damage events → new `SOCKET_EVENTS` via Shared Contract

## Rendering

- Client reads `WorldState.npcs` / `enemies` from sync
- Sprites via `profileId` + `AnimatedCharacterVisual`
- Biome-colored fallback when sprite missing

## Checklist

- [ ] AI runs only in `simulateTick`, not in socket handlers
- [ ] `markDirty('npcs')` / `markDirty('enemies')` after changes
- [ ] Combat events defined in `shared/types.ts` before implementation
- [ ] Client renderers stay read-only
