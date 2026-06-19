export interface TreeAssetProfile {
  profileId: string;
  textureKey: string;
  label: string;
  assetPath: string;
  groupId: string;
  sizeId: string;
  sourceSheet: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  displayScale: number;
  originY: number;
  yOffsetFactor: number;
}

export interface TreeAssetManifest {
  scannedAt: string;
  profileCount: number;
  profiles: TreeAssetProfile[];
}

export const TREE_MANIFEST_URL = '/assets/Land/Props/Trees/treeManifest.json';

export async function fetchTreeAssetManifest(): Promise<TreeAssetManifest | null> {
  try {
    const response = await fetch(TREE_MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    return await response.json() as TreeAssetManifest;
  } catch {
    return null;
  }
}

export function pickTreeProfile(
  profiles: TreeAssetProfile[],
  variant: number,
  tileX: number,
  tileY: number,
): TreeAssetProfile | null {
  if (profiles.length === 0) {
    return null;
  }

  const index = Math.abs(variant + tileX * 17 + tileY * 31) % profiles.length;
  return profiles[index] ?? profiles[0] ?? null;
}
