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

// ④ 외부 authored GLB 파츠 검증용 테스트 URL.
// 비어 있으면 런타임이 ④를 건너뛰고 "미설정"으로 리포트한다. 셀프 스탠드인 or 외주 파츠를
// public/avatars/ 에 두고 여기에 경로를 적으면(예: '/avatars/Tops_test.glb') loadPart() 가
// base 스켈레톤으로 rebind 해 팔/머리 추종을 그 자리에서 검증한다.
export const PART_TEST_URL = '/avatars/Tops_sample.glb'

// ⑤ 스프링 헤어 검증용 VRM 파츠 URL (VRMC_springBone 보존). 비면 ⑤ 스킵.
// scripts/extractParts.mjs 가 male_sample.vrm 에서 헤어+헤어스프링만 떼어 생성.
export const SPRING_PART_TEST_URL = '/avatars/Hair_sample.vrm'

// ─── 모듈 파츠 레지스트리 (on/off 토글 대상) ──────────────────────────────────
// 디버그 패널이 이 목록을 그려 가시성 토글을 건다. 파츠가 늘면 여기에 한 줄 추가.
export type PartStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error'

export interface ModulePart {
  id: 'tops' | 'hair'
  label: string
  detail: string
}

export const MODULE_PARTS: ModulePart[] = [
  { id: 'tops', label: 'Tops', detail: '④ 스킨드 rebind' },
  { id: 'hair', label: 'Hair', detail: '⑤ 스프링 병합' },
]
