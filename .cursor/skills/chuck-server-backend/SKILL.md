---
name: chuck-server-backend
description: Chuck Land authoritative server — Socket.IO gateway, GameRoom lobbies, delta sync, persistence, sessions, rate limiting, hero movement validation. Use for server restart, networking, sync, reconnect, SQLite, GameLoop, or backend architecture.
---

# Chuck Land — Server Backend Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `server/src/index.ts`, `core/`, `network/`, `sync/`, `state/`, `persistence/`, `security/` | Tile rendering |
| `EntityManager`, `HeroMovementManager`, `BuildingManager`, `MayorManager` | Autotile atlases |
| `SocketGateway`, `SyncBroadcaster`, `GameLoop` | Sprite manifests |

## Architecture

```
index.ts → LobbyManager → GameRoom (per lobby)
         → SocketGateway (events)
         → GameLoop (20 Hz tick, 10 Hz sync)
         → PersistenceService (SQLite)
```

**Hub:** `GameRoom` wires WorldManager, managers, and `WorldStateManager`.

## Socket events (`shared/types.ts` → `SOCKET_EVENTS`)

| Client → Server | Server → Client |
|-----------------|-----------------|
| `player:join` | `world:state`, `world:state_delta` |
| `player:move` | `player:joined`, `player:left` |
| `building:order` | `session:granted`, `lobby:assigned` |
| `player:reconnect` | `mayor:changed`, `error` |

## Sync model

- `WorldStateManager.markDirty()` on changes
- `SyncBroadcaster`: delta by default, full every ~30s or on join/reconnect
- Client must handle both `world:state` and `world:state_delta`

## Config (`server/src/config/serverConfig.ts`)

- Port 3000, tick 20 Hz, sync 10 Hz, max 8 players/lobby

## Checklist

- [ ] All input validated (`InputValidator`)
- [ ] Rate limits on move/build
- [ ] Dirty flags set for changed state slices
- [ ] New events added to `shared/types.ts` first
