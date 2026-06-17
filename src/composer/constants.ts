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

// ─── 모듈 파츠 카탈로그 (라이브러리) ──────────────────────────────────────────
// PoC(카테고리당 1개·로드-올)에서 승격: 카테고리마다 변형(variant) N개를 들고, 런타임은
// '카테고리 슬롯당 1개 active' 로 선택·교체(swap-on-select)한다. drei 에디터 탭이 실제로
// 필요로 하는 엔진 형태다. VRoid식 피커가 이 카탈로그를 탭/그리드로 그린다.
//   kind: 'static' = loadPart(GLB, 정적 스킨드) / 'spring' = loadSpringPart(VRM, VRMC_springBone)
//        'face'   = loadFacePart(VRM, Face 메시 교체 + 눈 본 graft + 표정 모프 미러)
//   변형 추가 = 소스 드롭 → scripts/extractParts.mjs JOBS 1줄 → 아래 variants 1줄 → npm run thumbs
//   단일 베이스(male1) 가정. 남자2 도착 시 이 카탈로그를 characters[] 로 승격(INTEGRATION 원칙 5).
export type PartStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error'
export type PartKind = 'static' | 'spring' | 'face'
export type PartCategory = 'face' | 'hair' | 'tops' | 'bottoms'

export interface PartVariant {
  id: string    // 전역 고유(썸네일 파일명·선택 키로도 쓰임)
  label: string
  url: string
  thumb: string // '/avatars/thumbs/<id>.png' (scripts/renderThumbs.mjs 산출)
}

export interface PartCategoryDef {
  id: PartCategory
  label: string       // 탭 라벨
  icon: string        // 탭 아이콘(이모지)
  kind: PartKind      // 로더 선택
  allowNone: boolean  // '원본/없음' 선택 허용
  variants: PartVariant[]
}

const thumb = (id: string) => `/avatars/thumbs/${id}.png`

export const CATALOG: PartCategoryDef[] = [
  {
    id: 'face', label: 'Face', icon: '🙂', kind: 'face', allowNone: true,
    variants: [
      { id: 'face-eyesample', label: '눈 변형', url: '/avatars/male1/Face_eyesample.vrm', thumb: thumb('face-eyesample') },
    ],
  },
  {
    id: 'hair', label: 'Hair', icon: '💇', kind: 'spring', allowNone: true,
    variants: [
      { id: 'hair-sample', label: '기본 헤어', url: '/avatars/Hair_sample.vrm', thumb: thumb('hair-sample') },
    ],
  },
  {
    id: 'tops', label: 'Tops', icon: '👕', kind: 'static', allowNone: true,
    variants: [
      { id: 'tops-white-shirt', label: '화이트 셔츠', url: '/avatars/male1/Tops_white_shirt.glb', thumb: thumb('tops-white-shirt') },
      { id: 'tops-basic',       label: '베이직 티',   url: '/avatars/male1/Tops_basic.glb',       thumb: thumb('tops-basic') },
      { id: 'tops-hawaian',     label: '하와이안',    url: '/avatars/male1/Tops_hawaian.glb',     thumb: thumb('tops-hawaian') },
    ],
  },
  {
    id: 'bottoms', label: 'Bottoms', icon: '👖', kind: 'static', allowNone: true,
    variants: [
      { id: 'bottoms-scotch-pants', label: '스카치 팬츠', url: '/avatars/male1/Bottoms_scotch_pants.glb', thumb: thumb('bottoms-scotch-pants') },
      { id: 'bottoms-jean',         label: '청바지',     url: '/avatars/male1/Bottoms_jean.glb',         thumb: thumb('bottoms-jean') },
      { id: 'bottoms-white-pants',  label: '화이트 팬츠', url: '/avatars/male1/Bottoms_white_pants.glb',  thumb: thumb('bottoms-white-pants') },
    ],
  },
]

// ─── 카탈로그 파생 인덱스 ──────────────────────────────────────────────────────
export interface ResolvedVariant { categoryId: PartCategory; kind: PartKind; variant: PartVariant }

export const VARIANTS_BY_ID: Map<string, ResolvedVariant> = new Map(
  CATALOG.flatMap((c) => c.variants.map((variant) => [variant.id, { categoryId: c.id, kind: c.kind, variant }] as const)),
)

export type Selection = Record<PartCategory, string | null>

// 기본 선택: 각 카테고리 첫 변형 active (현재 '풀 장착' 거동 보존). 없으면 null.
export const defaultSelection = (): Selection =>
  Object.fromEntries(CATALOG.map((c) => [c.id, c.variants[0]?.id ?? null])) as Selection
