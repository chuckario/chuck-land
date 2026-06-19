---
name: chuck-shared-contract
description: Chuck Land shared contract layer — types, SOCKET_EVENTS, enums, WorldState, biome config used by both client and server. Use when adding fields, events, enums, or breaking API changes between client and server.
---

# Chuck Land — Shared Contract Agent

## Scope

**Owns all of `shared/`** — the API between client and server.

## Critical files

| File | Purpose |
|------|---------|
| `types.ts` | Enums, interfaces, `WorldState`, `SOCKET_EVENTS`, map constants |
| `biomeConfig.ts` | `WorldBiome`, classification, enemy spawn table |
| `characterAnimation.ts` | Directions, actions, manifest types |
| `movement.ts` | Direction ↔ tile delta |
| `classConfig.ts` | Playable class → sprite profile |
| `resourceConfig.ts` | Gather targets per profession |
| `permissions.ts` | Mayor build rights |
| `worldNoise.ts` | Noise functions (also used by world gen) |
| `blobAutotile.ts` | Autotile math (also used by tile rendering) |

## Change protocol

1. Add type/event to `shared/types.ts`
2. Update server (`SocketGateway`, `GameRoom`, managers)
3. Update client (`SocketClient`, `GameScene`, renderers)
4. Build both: `cd server && npm run build`, `cd client && npm run build`

## Import paths

- Client: `@shared/foo` (Vite alias)
- Server: `../../shared/foo` (tsconfig `rootDir: ".."`)

## Breaking change checklist

- [ ] `SOCKET_EVENTS` updated for new events
- [ ] Both sides handle new `WorldState` fields
- [ ] Delta sync includes new dirty slices if needed
- [ ] No server-only types leaked into client-only files without shared home
