---
name: chuck-client-gameplay
description: Chuck Land client gameplay — GameScene, ClassSelectScene, input, HUD, local hero movement, build UI, SocketClient. Use for UI, controls, scenes, player experience, or client-side game flow.
---

# Chuck Land — Client Gameplay Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `client/src/scenes/*` | Server authoritative logic |
| `client/src/input/*`, `characters/*` | World generation |
| `client/src/network/SocketClient.ts` | Autotile atlases |
| `client/src/config/*` (gameplay constants) | Asset scan tools |

## Scene flow

`BootScene` (preload) → `ClassSelectScene` (join) → `GameScene` (play)

## Sync pattern

1. `socketClient.connect()` → `join(name, classType, profileId)`
2. `onWorldState()` → `GameScene.syncWorld()`
3. Send `player:move` on input; reconcile from server state
4. Handle `build:order_created/rejected`, `mayor:changed`

## Local movement

- `HeroMovementInput` captures keys
- `LocalHeroMovement` interpolates local hero between server updates
- Server is authoritative — no cheating client-side position commits

## Known gaps

- `world:state_delta` not yet merged in client (Server Backend scope)
- Buildings: colored rectangles, not sprites (Asset Management scope)
- No reconnect UI despite server session support

## Checklist

- [ ] Never mutate `WorldState` locally except display interpolation
- [ ] HUD reflects mayor/build permissions (`shared/permissions.ts`)
- [ ] Class select only shows manifest-backed classes
- [ ] Error messages surfaced from `SocketClient.onError`
