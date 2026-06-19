import { ResourceNodeType } from '@shared/types';
import { pickTreeProfile, TreeAssetProfile } from '@shared/treeAssets';
import { PROP_KEYS } from '../../world/EnvironmentLoader';
import { getPropRenderTextureKey } from '../../world/propSpritesheetRegistry';

export interface ResourcePropDefinition {
  textureKey: string;
  frame?: number;
  displayScale: number;
  originY: number;
  yOffsetFactor: number;
}

export const RESOURCE_PROPS: Record<ResourceNodeType, ResourcePropDefinition> = {
  [ResourceNodeType.TREE]: {
    textureKey: 'prop-tree-fallback',
    displayScale: 1.85,
    originY: 0.92,
    yOffsetFactor: -0.06,
  },
  [ResourceNodeType.STONE_NODE]: {
    textureKey: getPropRenderTextureKey(PROP_KEYS.rocks),
    frame: 42,
    displayScale: 1.35,
    originY: 0.9,
    yOffsetFactor: 0,
  },
  [ResourceNodeType.IRON_ORE]: {
    textureKey: getPropRenderTextureKey(PROP_KEYS.rocks),
    frame: 57,
    displayScale: 1.25,
    originY: 0.88,
    yOffsetFactor: 0.01,
  },
  [ResourceNodeType.WILD_GAME]: {
    textureKey: getPropRenderTextureKey(PROP_KEYS.vegetation),
    frame: 18,
    displayScale: 1.15,
    originY: 0.82,
    yOffsetFactor: 0.02,
  },
  [ResourceNodeType.CROP]: {
    textureKey: getPropRenderTextureKey(PROP_KEYS.farm),
    frame: 8,
    displayScale: 1.3,
    originY: 0.88,
    yOffsetFactor: 0.01,
  },
};

export function resolveTreePropDefinition(
  profiles: TreeAssetProfile[],
  tileX: number,
  tileY: number,
  variant: number,
): ResourcePropDefinition {
  const profile = pickTreeProfile(profiles, variant, tileX, tileY);
  if (!profile) {
    return RESOURCE_PROPS[ResourceNodeType.TREE];
  }

  return {
    textureKey: profile.textureKey,
    displayScale: profile.displayScale,
    originY: profile.originY,
    yOffsetFactor: profile.yOffsetFactor,
  };
}
