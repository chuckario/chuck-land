# Chuck Land — Specialized Agents

This project uses **domain agents** for parallel development. Each agent owns specific folders and coordinates through `shared/`.

## Quick routing

| If you are working on… | Agent | Skill / Rule |
|------------------------|-------|--------------|
| Map generation, biomes, noise, resources spawn | **World Generation** | `chuck-world-generation` |
| Isometric tiles, autotile, cliffs, tilesets | **Tile Rendering** | `chuck-tile-rendering` |
| Socket.IO, lobbies, sync, persistence, movement | **Server Backend** | `chuck-server-backend` |
| NPC professions, enemies, combat AI | **AI Logic** | `chuck-ai-logic` |
| Sprites, manifests, trees, animation loading | **Asset Management** | `chuck-asset-management` |
| GameScene, input, HUD, class select, UI | **Client Gameplay** | `chuck-client-gameplay` |
| Types, socket events, shared enums/config | **Shared Contract** | `chuck-shared-contract` |

## Architecture

```
shared/          ← contract layer (types, events, biome rules)
    ↑
server/          ← authoritative simulation (GameRoom hub)
    ↕ Socket.IO
client/          ← rendering + input (never mutates game state)
tools/           ← asset pipelines → manifests
```

**Stack:** Phaser 3 client (Vite, :5173) · Node.js + Socket.IO server (:3000) · TypeScript monorepo

## Agent ownership

### Shared Contract
- **Owns:** `shared/*`
- **Rule:** Change types/events here **before** server or client implementations.

### World Generation
- **Owns:** `server/src/WorldManager.ts`, `biomeGeneration.ts`, `ResourceManager.ts` (spawn), `shared/worldNoise.ts`
- **Produces:** `WorldMapInterface` (`tiles`, `biomes`, `elevations`)

### Tile Rendering
- **Owns:** `client/src/world/tiles/*`, `TileWorldRenderer.ts`, `tileset*`, `EnvironmentLoader.ts`, `shared/blobAutotile.ts`
- **Reads only:** map data from server; never changes gameplay state.

### Server Backend
- **Owns:** `server/src/index.ts`, `core/`, `network/`, `sync/`, `state/`, `persistence/`, `security/`, `EntityManager`, `HeroMovementManager`, `BuildingManager`, `MayorManager`
- **Hub:** `GameRoom` wires all managers per lobby.

### AI Logic
- **Owns:** `server/src/professions/*`, `EnemyManager.ts`, `client/src/world/NpcRenderer.ts`, `EnemyRenderer.ts`
- **Mutates:** `WorldState.npcs`, `WorldState.enemies` (server only).

### Asset Management
- **Owns:** `tools/*`, `client/public/assets/`, manifests, `BootScene.ts`, `client/src/animations/*`, `shared/assetPaths.ts`, `shared/treeAssets.ts`, `shared/classConfig.ts`

### Client Gameplay
- **Owns:** `client/src/scenes/*`, `client/src/input/*`, `client/src/characters/*`, `client/src/network/SocketClient.ts`

## Communication contract

1. **Shared types** (`shared/types.ts`, `SOCKET_EVENTS`) are the API between client and server.
2. Client sends **intentions** (`player:join`, `player:move`, `building:order`).
3. Server **validates** and broadcasts `world:state` or `world:state_delta`.
4. Client **renders** received state; local hero uses interpolation only.

## Coordination rules

1. **Shared first** — new fields/events in `shared/` before implementations.
2. **Server is authoritative** — client never mutates heroes, NPCs, enemies, buildings.
3. **One domain per change** — avoid mixing world gen + tile rendering in one PR.
4. **GameRoom hub** — new server features attach to `GameRoom`, not loose globals.
5. **Manifests via tools** — run `npm run assets:scan-*`; do not hand-edit large JSON.

## How to invoke an agent

In Cursor chat, prefix or mention the domain:

- `@chuck-world-generation` or "world gen agent: …"
- `@chuck-tile-rendering` or "tile rendering agent: …"
- `@chuck-server-backend` or "server agent: …"
- `@chuck-ai-logic` or "AI agent: …"
- `@chuck-asset-management` or "asset agent: …"
- `@chuck-client-gameplay` or "gameplay agent: …"
- `@chuck-shared-contract` or "shared contract: …"

The orchestrator rule (`.cursor/rules/chuck-land-orchestrator.mdc`) auto-routes ambiguous requests.
