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

// ─── 모듈 파츠 레지스트리 (라이브러리) ────────────────────────────────────────
// 런타임이 이 목록을 순회하며 부위별 파츠를 독립 로드·장착하고, 디버그 패널이 같은 목록으로
// on/off 토글을 그린다. 파츠가 늘면 여기에 한 줄 추가 (→ manifest 화의 토대).
//   kind: 'static' = loadPart(GLB, 정적 스킨드) / 'spring' = loadSpringPart(VRM, VRMC_springBone)
// 파생 파츠 파일은 scripts/extractParts.mjs 가 소스 VRM 에서 생성(gitignore, prebuild 재생성).
export type PartStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error'
export type PartKind = 'static' | 'spring'
export type PartCategory = 'tops' | 'bottoms' | 'hair' | 'accessory' | 'shoes'

export interface ModulePart {
  id: string
  label: string
  detail: string
  category: PartCategory
  url: string
  kind: PartKind
}

export const MODULE_PARTS: ModulePart[] = [
  { id: 'tops',    label: 'Tops',    detail: '셔츠 · 정적',   category: 'tops',    kind: 'static', url: '/avatars/male1/Tops_white_shirt.glb' },
  { id: 'bottoms', label: 'Bottoms', detail: '바지 · 정적',   category: 'bottoms', kind: 'static', url: '/avatars/male1/Bottoms_scotch_pants.glb' },
  { id: 'hair',    label: 'Hair',    detail: '스프링 헤어',   category: 'hair',    kind: 'spring', url: '/avatars/Hair_sample.vrm' },
]
