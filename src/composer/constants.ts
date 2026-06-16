// ─── 컨벤션 락 (male_base.vrm 실측, 2026-06-16) ──────────────────────────
// 이 값들은 베이스 파일에서 실측한 "고정 규약"이다. 모든 authored 파츠는 이 규약에
// 순응해야 런타임 조립이 성립한다. 베이스 교체 시 이 파일과 ASSET_SPEC.md 동기화.
export const BASE_URL = '/avatars/male_base.vrm'

export const BASE_SPEC = {
  vrmVersion: '1.0',          // VRMC_vrm specVersion
  boneNaming: 'VRoid J_Bip_*', // VRM humanoid 54본
  humanoidBones: 54,
  bindPose: 'A-pose',         // VRoid 표준
  heightMeters: 1.756,
  scale: 1.0,
  material: 'MToon',
  // Face (merged): 표정/비세메 모프 57종 (Fcl_*) — 조형(shape) 모프는 없음(Blender 별도)
  expressionPresets: 14,
} as const

// 파츠 식별 프리픽스 (메시/노드 네이밍 규칙)
export const PART_PREFIX = {
  hair: 'Hair_',
  tops: 'Tops_',
  bottoms: 'Bottoms_',
  shoes: 'Shoes_',
} as const
