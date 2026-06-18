# ARCHITECTURE — avatar-composer

에디터에서 **에셋 스왑**으로 얼굴 조형 / 헤어스타일 / 옷차림을 바꾸는 아바타 조립기.
drei-avatar-project(임의 VRM 1개를 통째 로드)와 **전제가 다르다**: 여기선 **우리가 만든 고정 베이스 +
authored 모듈 파츠 라이브러리**를 조합한다. (임의 사용자 업로드는 지원하지 않음 — 파츠가 안 맞음)

## 왜 별도 프로젝트인가
| | drei-avatar-project | avatar-composer |
|---|---|---|
| 자산 모델 | 통짜 VRM 1개 (임의 업로드) | 모듈형 파츠 라이브러리 (authored) |
| 스켈레톤 | 모델마다 제각각 | **베이스별 공유 리그** — 베이스(캐릭터)마다 그 베이스 파츠 라이브러리 |
| 헤어/옷 | 교체 불가 (가시성 토글만) | 동일 리그에 부착·교체 |
| 얼굴 | 색/셰이더만 | 메시 교체(조형) + 모프 슬라이더 |

> **다중 베이스(캐릭터 축).** 현재 남자1·여자1. 베이스를 바꾸면 그 베이스의 카탈로그로 통째 스왑(파츠 동반).
> 에셋은 베이스 종속 silo(남자1 셔츠 ≠ 여자1 셔츠), 일반화 대상은 기계(추출·엔진·카탈로그·피커·썸네일).

## 3층 구조
**① 에셋 저작 (오프라인 — 본체)**
- 베이스: VRoid Studio → 중립 마네킨 → `male_base.vrm` (스켈레톤/포즈/스케일/네이밍 = 컨벤션 락)
- 파츠: Blender에서 베이스에 스키닝 → 파츠별 GLB/VRM (외주). 규약은 [ASSET_SPEC.md](ASSET_SPEC.md).
- 얼굴 조형: 베이스 머리 셰이프키 (별도, 후순위).

**② 런타임 조립 (웹 — R3F)** — `src/composer/`
- 활성 캐릭터의 베이스 로드(`useGLTF(baseUrl)`, 캐릭터 변경 시 `key`로 remount) → 공유 스켈레톤 확보.
- 리지드 부착(헤어 → head 본 parent) / 스킨드 rebind(파츠 SkinnedMesh → `bind(baseSkeleton)`).
- 스프링 헤어: 스프링 본 base Head 이식 + `springBoneManager` 병합(멀티-메시 헤어 지원).
- 얼굴: 메시 교체 + 눈 본 graft + 표정 모프 미러(짝 없는 메시는 donor 폴백).
- (예정) 옷밑 살 클리핑(`Hide_Body`).

**③ 에디터 UI (웹 — 가장 쉬움)**
- 좌측 캐릭터 셀렉터(`CHARACTERS[]`) + VRoid식 카탈로그 피커(`ui/CatalogPicker`: 베이스 카탈로그 탭+썸네일 그리드, 슬롯당 1개 active). 우측: 3D + 접이식 dev 드로어(더미 토글·모프·검증 리포트 — 스캐폴딩).

## 검증 상태 (PoC 게이트)
drei-avatar-project `poc/asset-swap` 브랜치에서 하중 시험 통과 → 이 코드로 이관:
- [x] ① 리지드 부착 — head 본 parent, 머리 회전 추종
- [x] ② 스킨드 rebind — 런타임 생성 SkinnedMesh `bind()` → 팔 변형 추종 (핵심)
- [x] ③ 모프 슬라이더 — expressionManager 구동
- [x] 외부 authored GLB 파츠 로딩 — `partLoader.ts` `loadPart()`(자체 스켈레톤 → base rebind). **base 기반 실파츠**(`male1/Tops_white_shirt.glb`, `Bottoms_scotch_pants.glb`)로 검증: 0 누락 본 + **0.00mm 바인드 정합 → 오프셋 없이 딱 맞음**. (앞선 male_sample 스탠드인은 다른 신장이라 균일 2.5cm 떴는데, 그 차이가 ASSET_SPEC §1 신장 락이 하중받음을 실증.) 상의·하의가 독립 모듈 파츠로 따로 장착·토글됨 → [VROID_PARTS.md](VROID_PARTS.md).
- [x] 스프링본 동적 병합 (헤어 물리) — `partLoader.ts` `loadSpringPart()`: 헤어 스프링 본 base Head 이식 → `springBoneManager.addJoint` 병합. 남자1 단일-메시 헤어 + **여자1 2메시 헤어**(앞머리 `Hair001` + 뒷머리 `HairBack`/Body 프리미티브 결합 — 추출기 멀티-메시, 로더 전 SkinnedMesh 루프)까지 sway 확인.
- [x] 얼굴 메시 교체 — `loadFacePart()`: 눈 본 graft + 8 Face 메시 rebind + 표정 모프 미러. 짝 없는 메시(여자1 `FaceEyelash`처럼 base에 없는 머티리얼)는 아무 base 얼굴 메시를 donor로 미러.
- [x] **다중 베이스(캐릭터 축)** — `constants`를 `CHARACTERS[]`로 승격(남자1/여자1, 베이스별 `{baseUrl, catalog}`). 엔진은 `load*(url, baseVrm)`로 이미 베이스 불가지 → 무수정 재사용으로 여자1 실증.
- [ ] 옷밑 살 클리핑 (`Hide_Body` 영역 숨김) — 마킹 채널 합의 후

남은 1종(살 클리핑)은 **authored 에셋 마킹 합의가 있어야** 풀린다 → ASSET_SPEC §3 외주 합의 후.

## 기술 스택 (drei-avatar-project와 동일 핀)
- VRM: `@pixiv/three-vrm` v3.5.x — VRM 1.0 네이티브
- R3F v8 train: React 18 / `@react-three/fiber` v8 / `@react-three/drei` v9 / Three.js **0.170.x**
- Zustand v5 / Vite / Tailwind
- 불변식: Zustand에 Three.js 객체 금지 / `vrm.update(delta)` 매 프레임 필수 / KTX2 타입충돌 `any` 캐스트
