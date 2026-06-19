---
name: chuck-asset-management
description: Chuck Land asset pipeline — sprite manifests, tree scanning, BootScene preload, animation loading, class profiles, asset paths. Use for spritesheets, trees, scan tools, spriteManifest, treeManifest, or missing assets.
---

# Chuck Land — Asset Management Agent

## Scope

| Owns | Does not own |
|------|----------------|
| `tools/scanSpritesheets.mjs`, `scanTreeAssets.mjs` | Gameplay logic |
| `client/public/assets/`, manifests | Server simulation |
| `client/src/animations/*`, `BootScene.ts` | Autotile frame mapping |
| `shared/assetPaths.ts`, `treeAssets.ts`, `classConfig.ts` | Socket events |

## Pipeline

```
Disk PNGs → scan tools → JSON manifests → BootScene preload → runtime loaders
```

## Commands

```bash
cd client && npm run assets:scan-sprites   # → spriteManifest.json
cd client && npm run assets:scan-trees       # → treeManifest.json + Individual/
```

## Key manifests

| File | Contents |
|------|----------|
| `spriteManifest.json` | Class, Enemy, Villager sprite profiles |
| `treeManifest.json` | 215 individual tree profiles |
| `spritesheet.defaults.json` | Frame size/rate defaults |

## Playable classes

`shared/classConfig.ts` maps `HeroClass` → `profileId` from manifest entries with `entityType: CLASS`.

## Asset roots

- Runtime: `client/public/assets/` (Vite `/assets/...`)
- Conventions: `shared/assetPaths.ts`
- Reserved/unused: `Dungeon/`, `Weapons/`

## Checklist

- [ ] Regenerate manifests after adding PNGs (don't hand-edit)
- [ ] `BootScene` preloads new asset keys
- [ ] `classConfig` updated when new playable class added
- [ ] Large binaries not committed unnecessarily
