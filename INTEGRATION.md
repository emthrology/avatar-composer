# INTEGRATION — avatar-composer → drei-avatar-project

avatar-composer의 최종 목적지는 **drei-avatar-project에 흡수 통합**이다. 이 문서는 통합 시 무엇을
들어올리고 무엇을 버리는지 결정을 **그때그때 한 줄로 적어** "쌓이다 허들"이 되는 걸 막는 원장(ledger)이다.

## 방향 (확정)

- **흡수(A)**: drei가 호스트, composer 엔진을 그 **에디터 탭**의 조립 시스템으로 이관.
- drei는 "임의 VRM 업로드"에서 **"기본 지급 VRM + 교체용 파츠"**로 피벗 중 → composer의 base+parts
  모델이 곧 drei 에디터의 목적지. **composer = drei 에디터 차세대 아키텍처의 프로토타입/증명장.**
- drei 구성: **컴패니언 탭** + **에디터 탭** — composer 기능은 에디터 탭에 합쳐진다.
- **다중 베이스 (착수)**: 남자1·여자1 구현(`CHARACTERS[]`). 남자2 등은 `CHARACTERS[]`에 1줄로 추가.

## 원칙

0. **엔진은 composer가 선도, 정책은 drei를 따른다.**
   - 엔진(base+parts 조립) → drei가 composer를 채택하니 composer가 앞서감.
   - 정책(시선/유휴모션/카메라/조명/UI/탭) → drei가 호스트니 composer가 맞춤.
1. **엔진 / 셸 분리.** 통합에 가져갈 *엔진*만 깨끗이 유지. 버릴 *셸*은 격리.
2. **엔진은 행동 불가지(behavior-agnostic).** 엔진은 *훅*만 노출(예: "눈 본은 base를 미러한다"),
   *행동*은 호스트가 주입. 정책을 엔진 모듈에 새게 하지 않는다.
3. **공유 불변식 단일 출처.** 컨벤션 락(VRM1.0/본네이밍/A-pose/신장/MToon)은 한 곳에 정의해 양쪽이 import.
   단 락은 **모듈 조립 경로에만** 적용(drei의 임의-VRM 경로는 비적용).
4. **PoC 스캐폴딩 명시적 표식.** `DUMMY_` 프리픽스·디버그 패널로 격리. "데모지 제품결정 아님"을 코드/문서에 박는다.
5. **베이스 불가지 유지 → 캐릭터 축.** (✅ 구현) 컨벤션 락·파츠 라이브러리가 **베이스별**이고 파츠는
   베이스에 종속(남자1 셔츠 ≠ 여자1 셔츠). 엔진은 이미 `load*(url, baseVrm)`로 베이스 불가지 — 새 기능도
   baseVrm/스펙을 **파라미터로** 받게 유지. `constants`를 `CHARACTERS[]`(베이스별 `{baseUrl, catalog}`)로
   승격 완료. **얇은 스왑 셸**로 유지할 것(깊은 추상·과설계 금지) — 여자1이 기계 무수정 재사용으로 실증.

## 원장 (ledger)

| 항목 | 분류 | 통합 시 처리 |
|---|---|---|
| `partLoader.ts` (loadPart/loadSpringPart/loadFacePart) | **엔진** | drei 에디터 탭으로 이관 |
| `CHARACTERS[]`/`CATALOG` 데이터 모델(베이스→카테고리→변형 + `VARIANTS_BY_ID`/`Selection`, `constants.ts`) | **엔진** | 이관 |
| 캐릭터(베이스) 셀렉터 + 전환 시 base/카탈로그 스왑(`ComposerScene`, `useGLTF.clear`) | **엔진** | 이관 — drei 에디터의 다중 베이스 축 |
| 슬롯 선택·교체 오케스트레이션(`AvatarComposer` selection effect, genRef 레이스 가드) | **엔진** | 이관 — drei 에디터의 파츠 교체 핵심 |
| `scripts/extractParts.mjs` (추출·prune·네임스페이싱) | **엔진(오프라인)** | 라이브러리 빌드 파이프라인으로 이관 |
| `scripts/renderThumbs.mjs` + `?thumb=` 모드(`ThumbScene`, 파츠 단독+fit 카메라) | **엔진(오프라인 툴링)** | 이관 — 카탈로그 썸네일 생성 파이프라인 |
| 컨벤션 락(`BASE_SPEC`) | **엔진** | 이관 |
| `setEyeColor`/`setVisible`/`sync` · 파츠 로드 상태 | **엔진 API** | 유지 — drei 에디터 UI가 바인딩 |
| 유휴 시선(범위 내 랜덤 드리프트) | **정책** | drei의 시선 구현으로 교체 |
| `CatalogPicker`/`VariantCard`(VRoid식 탭+그리드 피커) | **스캐폴딩** | 에디터 탭 UI 프로토타입 — drei 에디터 탭이 대체 |
| `ComposerScene` dev 드로어 · 눈색 스와치 UI | **스캐폴딩** | 폐기 — drei 에디터 탭 UI가 대체 |
| 더미 ①②③(`dummyParts.ts`, `DUMMY_*`) · wave 토글 | **스캐폴딩** | 폐기 (PoC 검증용) |
| ~~단일 베이스 가정(`BASE_URL`/`BASE_SPEC` 단일)~~ | **엔진** | ✅ `CHARACTERS[]` 캐릭터 축으로 승격 완료(남자1·여자1) |

> 새 결정이 생기면 위 표에 한 줄 추가하고 분류(`엔진` / `엔진 API` / `정책` / `스캐폴딩` / `미성숙`)를 단다.
