# ARCHITECTURE — avatar-composer

에디터에서 **에셋 스왑**으로 얼굴 조형 / 헤어스타일 / 옷차림을 바꾸는 아바타 조립기.
drei-avatar-project(임의 VRM 1개를 통째 로드)와 **전제가 다르다**: 여기선 **우리가 만든 고정 베이스 +
authored 모듈 파츠 라이브러리**를 조합한다. (임의 사용자 업로드는 지원하지 않음 — 파츠가 안 맞음)

## 왜 별도 프로젝트인가
| | drei-avatar-project | avatar-composer |
|---|---|---|
| 자산 모델 | 통짜 VRM 1개 (임의 업로드) | 모듈형 파츠 라이브러리 (authored) |
| 스켈레톤 | 모델마다 제각각 | **고정 베이스 1개에 전 파츠 공유** |
| 헤어/옷 | 교체 불가 (가시성 토글만) | 동일 리그에 부착·교체 |
| 얼굴 | 색/셰이더만 | 모프 슬라이더(조형) |

## 3층 구조
**① 에셋 저작 (오프라인 — 본체)**
- 베이스: VRoid Studio → 중립 마네킨 → `male_base.vrm` (스켈레톤/포즈/스케일/네이밍 = 컨벤션 락)
- 파츠: Blender에서 베이스에 스키닝 → 파츠별 GLB/VRM (외주). 규약은 [ASSET_SPEC.md](ASSET_SPEC.md).
- 얼굴 조형: 베이스 머리 셰이프키 (별도, 후순위).

**② 런타임 조립 (웹 — R3F)** — `src/composer/`
- 베이스 1회 로드 → 공유 스켈레톤 확보.
- 리지드 부착(헤어 → head 본 parent) / 스킨드 rebind(파츠 SkinnedMesh → `bind(baseSkeleton)`).
- 얼굴 모프 → `expressionManager`/morphInfluence.
- (예정) 스프링본 동적 병합 / 옷밑 살 클리핑(`Hide_Body`).

**③ 에디터 UI (웹 — 가장 쉬움)**
- 라이브러리에서 파츠 선택·장착, 모프 슬라이더. (drei-avatar-project의 패널 패턴 재사용 가능)

## 검증 상태 (PoC 게이트)
drei-avatar-project `poc/asset-swap` 브랜치에서 하중 시험 통과 → 이 코드로 이관:
- [x] ① 리지드 부착 — head 본 parent, 머리 회전 추종
- [x] ② 스킨드 rebind — 런타임 생성 SkinnedMesh `bind()` → 팔 변형 추종 (핵심)
- [x] ③ 모프 슬라이더 — expressionManager 구동
- [ ] 외부 authored GLB 파츠 로딩 (현재는 더미: 바디 복제 쉘)
- [ ] 스프링본 동적 병합 (헤어/옷 물리)
- [ ] 옷밑 살 클리핑 (`Hide_Body` 영역 숨김)

미증명 3종은 **authored 에셋이 있어야** 풀린다 → ASSET_SPEC 기준 외주 파츠 도착 후 ②의 완전 검증.

## 기술 스택 (drei-avatar-project와 동일 핀)
- VRM: `@pixiv/three-vrm` v3.5.x — VRM 1.0 네이티브
- R3F v8 train: React 18 / `@react-three/fiber` v8 / `@react-three/drei` v9 / Three.js **0.170.x**
- Zustand v5 / Vite / Tailwind
- 불변식: Zustand에 Three.js 객체 금지 / `vrm.update(delta)` 매 프레임 필수 / KTX2 타입충돌 `any` 캐스트
