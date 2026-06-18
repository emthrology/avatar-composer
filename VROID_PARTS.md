# VROID_PARTS — VRoid 부위별 추출 가능 범위 (분리 범위 지도)

목표: VRoid 에셋을 **부위별로 추출**해 파츠 라이브러리를 다변화한다. 이 문서는 "어디까지 분리되나 /
어떻게 제공하나 / batch 가능한가"의 실측 기준선.

## 1. 분리 단위 = 머티리얼(프리미티브)

VRoid 통짜 export 안에서 분리 가능한 최소 단위는 **머티리얼**이다. VRoid가 별도 아이템으로 저작한 것만
별도 머티리얼로 갈라져 추출된다. 통짜로 bake되면 못 쪼갠다.

- **천장 = VRoid 저작 단계에서 몇 개 아이템으로 만들었는가.** 추출툴은 수확만 하지 없는 다양성은 못 만든다.
- 실측: `male_sample.vrm`은 전신 일체 `Tops_01_CLOTH` 하나뿐(하의 없음) → 못 가름.
  `male1/parts/`의 셔츠·바지는 각각 `Tops_*`/`Bottoms_*` 별도 머티리얼 → 깔끔히 분리됨.

머지 메시 주의: VRoid는 **버텍스 버퍼를 공유하고 프리미티브를 `indices`로 구분**한다. 본 사용 분석은
반드시 인덱스 기준으로 해야 정확(전체 버텍스로 보면 프리미티브가 다 같아 보임).

## 2. 실측 카탈로그

**남자1 (male1)**
| 카테고리 | 변형 | 머티리얼 | base 누락 본(보조) | 로더 |
|---|---|---|---|---|
| Face | 눈 변형 | Face 메시(8 머티·57 모프) | 눈 본 `J_Adj_*FaceEye` graft | `loadFacePart`(VRM) |
| Hair | 기본 헤어 | `Hair`(단일 메시) | 헤어 스프링 `J_Sec_*Hair*` 이식 | `loadSpringPart`(VRM) |
| Tops | 화이트셔츠 | `Tops_01_CLOTH` | CoatSkirt(미가중) | `loadPart`(GLB) |
| Tops | 베이직 티 | `Tops_01_CLOTH` | `J_Sec_*TopsUpperArm*`(소매 **가중** → graft) | `loadPart` |
| Tops | 하와이안 | `Tops_01_CLOTH` | CoatSkirt → graft | `loadPart` |
| Bottoms | 스카치/청바지 | `Bottoms_01_CLOTH` | 0 | `loadPart` |
| Bottoms | 화이트팬츠 | `Onepiece_00_CLOTH`(2 prim) | 0 | `loadPart` |
| (Tie) | 넥타이 | `Accessory_Tie_01_CLOTH` | 0 | (보류) |

**여자1 (female1)** — 남자1 기계를 무수정 재사용. 베이스 `female1/female_base.vrm`(54본·57모프·A-pose 동일 규약 검증).
| 카테고리 | 변형 | 머티리얼/구조 | 비고 | 로더 |
|---|---|---|---|---|
| Face | 얼굴 2~4 (3) | Face 메시(57 모프) | 얼굴2는 `FaceEyelash`가 base에 없어 donor 폴백 미러(§6) | `loadFacePart` |
| Hair | 헤어 1~4 (4) | **2메시 결합**: 앞머리 `Hair001` + 뒷머리 `HairBack`(Body 프리미티브) | 멀티-메시 추출·로더(§4·§7) | `loadSpringPart` |
| Tops | 상의 1~4 (4) | `Tops_01_CLOTH` | top_3=타이 제외본 / top_4=Onepiece·Shoes 혼합본 → **시각 분류 확정 대기** | `loadPart` |
| Bottoms | 하의 1~3 (3) | `Bottoms_01_CLOTH` | 0 | `loadPart` |

핵심: **base 기반으로 저작하면 0 누락 · 0.00mm 정합** → 오프셋 없이 딱 맞는다(ASSET_SPEC §1 신장 락의 보상).
다른 신장 파일에서 빌리면 균일 오프셋이 생긴다(male_sample = 2.5cm).

**보조 본 graft (중요):** VRoid 의상 템플릿엔 소매·옷자락 흔들림용 secondary 본(`J_Sec_*TopsUpperArm*`,
`J_Sec_*CoatSkirt*`)이 딸려온다. 거기 메시가 **안 물리면**(짧은 옷) 정적 파츠로 무시하면 되지만, **물리면**
(베이직 티 소매) 그 본이 맨몸 base에 없어 rebind 실패 → 정점이 A-pose에 고정(소매가 옆으로 뻗음). →
`loadPart`의 `graftAuxBones`가 **부모가 base에 있는 보조 본을 그 부모(예: UpperArm) 아래로 reparent**(local
보존) → base 본을 리지드로 추종해 rebind 매칭. 스프링은 안 붙어 정적이지만 정적 의류엔 충분. (헤어 graft와 동형.)

## 3. 제공 형식

- 정적 스킨드(상의·하의·신발·고정 헤어) = **GLB**, `loadPart`
- 스프링 물리(흔들 헤어·코트 스커트) = **VRM**(VRMC_springBone 보존), `loadSpringPart`
- 모두 base 스켈레톤 규약(ASSET_SPEC §1) + 프리픽스 네이밍 준수

## 4. 추출 파이프라인 (현재)

`scripts/extractParts.mjs` — 잡(JOB) 선언으로 소스 VRM에서 부위 추출. 2단:
1. **raw glTF 수술** — 타깃 mesh만 남기고 머티리얼로 프리미티브 필터, 노드·bin 통째 유지(스프링/콜라이더/
   IBM 참조 무결성 보존). **멀티-메시 잡**(`meshes: [{mesh, keepMaterial}]`)으로 한 파츠가 여러 메시에
   걸친 경우 결합 보존 — 여자1 헤어(앞머리 `Hair001` 메시 + `Body`의 `HairBack` 프리미티브)가 그 예.
   VRM 파츠는 드롭된 메시를 가리키는 표정 `morphTargetBinds`를 제거(three-vrm `null.every` 크래시 방지 —
   헤어처럼 Face를 버린 파츠는 바인드 전부 dangling).
2. **GLB prune** — `gltf-transform` `prune()`+`dedup()`로 끊긴 메시·미사용 머티리얼/텍스처/액세서리 회수.
   **~13MB → 1\~2MB** (Tops 13.5→1.0, Bottoms 14.2→1.8). 정적 GLB 한정(확장 없어 무손실).

런타임은 활성 캐릭터의 `CATALOG`(카테고리→변형) 기반으로 **슬롯당 1개 선택·교체**(swap-on-select).

**올인원 에셋 빌드 (`npm run assets`):** 소스 VRM → 파츠 추출 → 썸네일 렌더를 한 명령으로 묶는다
(`extractParts.mjs && renderThumbs.mjs`). 산출물의 git 정책은 **재생성 비용**으로 가른다:
- **파생 파츠(GLB/VRM, ~17MB)** = gitignore. Vercel 빌드의 `prebuild` 훅이 순수-node 로 재생성(puppeteer 불필요).
- **썸네일(PNG, ~0.5MB)** = ★커밋★. puppeteer 가 필요해 Vercel 에서 재생성 불가 → 소스처럼 취급.

→ 상세 §7.

## 5. 라이브러리화 진척

**완료**
- ✅ **GLB 본/지오메트리/텍스처 prune** — §4-2. 스킨 73조인트·가중 본 이름 전부 보존 → rebind 0 누락 무변.
  (잔여: POSITION이 메시 공유 버퍼라 7,431 verts 중 1,691만 쓰는데도 통째 잔존 ≈ 1MB. vertex 압축은 후속.)
- ✅ **스프링 본 네임스페이싱** — 헤어 스프링 노드(`J_Sec_*Hair*`) 45개에 파츠 prefix(`Hair_sample__`) 부여 →
  다중 스프링 파츠 동시 로드 시 이름 충돌 제거. node 참조는 인덱스라 무손상, 런타임 `/Hair/i` 매칭·고유성 유지.
  humanoid(`J_Bip_*`)·Bust·CoatSkirt 불간섭.

- ✅ **VRM 안전 prune** — gltf-transform이 `VRMC_*`를 떨구므로 raw 수술로 직접: 렌더 mesh가 안 쓰는
  머티리얼·텍스처·이미지의 bufferView만 회수 + bin 재패킹. **accessor/모프/skin/노드/VRMC는 일절 불변**
  (material/texture/image 인덱스만 이동·갱신). 헤어 11.3→9.9MB, 얼굴 11.8→**7.6MB**, 무결성·모프 57 검증.
  → 모프 prune은 **의도적으로 안 함**(57 중 14만 쓰지만 확장성 위해 보존).

- ✅ **다양화 + 카탈로그 + 피커 + 썸네일** — §7.

**남은 과제**
- **vertex 압축** — 머티리얼 분리 후에도 POSITION이 메시 공유 버퍼라 미사용 verts 잔존. 인덱스 기준 재패킹 시 추가 ↓.
- **manifest 화** — `CATALOG`(코드)가 토대. 추출 산출 `manifest.json`(id/카테고리/형식/썸네일) 자동생성으로 진화.
- **batch** — 소스 디렉터리 일괄 → 라이브러리 + manifest 생성, 멱등 재실행.

## 6. 얼굴 트랙 (B): 형태 변형은 메시 교체 [PoC]

얼굴은 옷·헤어와 **범주가 다르다**. VRoid에서 얼굴 *모양*(눈크기·비율)은 머리 메시 지오메트리에 baked →
텍스처로 못 바꾼다 → **다른 Face 메시로 교체**해야 한다. (눈색·화장 같은 *표면* 변형만 텍스처 스왑 — 별도 축.)

**실측 (`male_eye_sample.vrm` vs base):**
- Face 메시는 통짜 8 머티리얼(FaceMouth/EyeIris/…)·**모프타깃 57**·익스프레션 14. 4123→**4175 verts**(실제 형태 차).
- 가중 본은 **단 3개**: Head(**0.00mm 동일**) + 좌/우 눈 본(`J_Adj_*FaceEye`, **46.7mm 이동**).
  → 형태는 Head에 리지드라 그대로 정렬, **눈 본만** 변형이 데려오면 됨(헤어 graft와 동형).
- 표정 바인드 인덱스가 base와 **완전 동일**(happy=3, aa=39…) → 표정 리그 재연결이 기계적.

**메커니즘 (`loadFacePart`):**
1. 추출 시 눈 본(`/FaceEye/`)만 네임스페이스 → base와 이름 어긋나 로더가 base 눈 본(어긋남) 대신 *자기 눈 본*을 graft.
2. 눈 본을 base Head 아래로 graft(Head 직속 리프라 local 보존) → 8 Face 메시를 base로 rebind → 0 누락.
3. base 원본 Face 숨김(겹침 방지).
4. 표정: three-vrm 내부 불간섭 — 매 프레임 **base Face `morphTargetInfluences` → 새 Face 미러**(머티리얼 이름 1:1).
   **base에 짝 머티리얼이 없는 새 메시**(여자1 얼굴2의 `FaceEyelash` — female_base엔 그 머티리얼 부재)는 아무
   base 얼굴 메시를 **donor**로 미러한다 — VRoid 얼굴 프리미티브는 동일 57 표정 모프를 인덱스 정렬로 공유하므로
   어느 base 얼굴이든 같은 influences를 들고 있다.

**제공 형식:** **VRM**(Face 메시 + 눈 본 + 57 모프). base 가 MToon(툰)이라 GLB(PBR)로 빼면 톤이 어긋남 →
`VRMC_materials_mtoon` 보존 위해 VRM 유지·VRMLoaderPlugin 로드. 표정 메타는 base 익스프레션 재사용.
VRM 안전 prune 적용(§5) → 11.8→**7.6MB**, 모프 57 보존.

**확장 (구현됨):**
- **눈 lookAt** — base lookAt(bone)이 돌리는 base 눈 본의 회전을 graft 눈 본에 미러 → 새 얼굴 눈도 추종.
  시선 *행동*은 정책(drei가 호스트) → composer 데모는 drei식 **범위 내 랜덤 유휴 시선**(엔진 미러가
  카메라트래킹뿐 아니라 호스트 실제 행동에서도 도는지 선검증). 통합 시 drei 구현으로 교체.
- **텍스처/머티리얼 축(눈색)** — 얼굴 '모양'(메시)과 **독립**된 별도 축. `setEyeColor`로 EyeIris 머티리얼 색
  런타임 변경(우측 패널 스와치). 실제 카탈로그는 `baseColorTexture` 교체(저작 PNG 세트)지만 노브는 동일.

**확인됨:** 얼굴 토글·모프·시선 추적·눈색 스와치 + **다중 얼굴 카탈로그**(여자1 얼굴 3종, donor 폴백 포함).
**다음:** 형태 모프(Blender 셰이프키) 병행 / 화장(눈썹·아이라인) 텍스처 변형.

## 7. 다양화 + 카탈로그 + VRoid식 피커 [구현됨]

PoC(카테고리당 1개·마운트 시 전부 로드)에서 **카탈로그 + 슬롯 교체 엔진**으로 승격. drei 에디터 탭이
실제로 필요로 하는 형태(INTEGRATION.md). 변형 추가 = **소스 드롭 → JOBS 1줄 → CATALOG 1줄 → `npm run assets`**
(추출+썸네일 올인원, §4).

**데이터 모델 (`constants.ts`):** `CHARACTERS[]`(베이스별 `{baseUrl, catalog}` — 남자1·여자1). 각 `CATALOG`
(카테고리→변형 N개) + `VARIANTS_BY_ID`(전 캐릭터 union) / `Selection` / `defaultSelection(catalog)` /
`getCharacter()`. variant id는 전역 고유(여자1은 `f1-` 프리픽스로 충돌 회피).
- 남자1: 얼굴 1 · 헤어 1 · 상의 3 · 하의 3
- 여자1: 얼굴 3 · 헤어 4 · 상의 4 · 하의 3
+ 카테고리별 '원본/없음'. **베이스 셀렉터**로 캐릭터를 바꾸면 그 베이스 카탈로그로 통째 스왑(선택·상태 리셋).

**슬롯 엔진 (`AvatarComposer`):** 카테고리 슬롯당 1개 active. `selection` 변경 시 desired vs 현재 diff →
기존 dispose 후 새 변형 load(null이면 비움). 슬롯당 `genRef` 토큰으로 빠른 연속 선택 async 레이스 가드.

**피커 UI (`ui/CatalogPicker`·`VariantCard`):** VRoid식 상단 탭 + 변형 썸네일 그리드 + 원본 카드 + 눈색 스와치.
`ComposerScene` = 좌측 피커 + 우측 3D + 접이식 dev 드로어(스캐폴딩 격리). → 통합 시 drei 에디터 탭이 대체.

**오프라인 썸네일 (`?thumb=` 모드 + `scripts/renderThumbs.mjs`):** 파츠를 base 조립 없이 **단독 로드**해
바운딩 fit 카메라로 렌더(조립 타이밍 의존 제거 — 초기엔 조립 후 클로즈업 시도했으나 슬롯/StrictMode 타이밍에
휘둘려 옷이 안 찍힘). 전 캐릭터 변형을 union으로 순회. tops/bottoms는 몸통/다리 X크롭, face는 패딩 당김.
**fit bbox는 인덱스된 정점만 합산** — 프리미티브 필터 메시(여자1 헤어 `HairBack`은 `Body`의 POSITION 버퍼를
공유)는 `computeBoundingBox()`가 몸 전체 범위를 잡아 파츠가 작게 나오던 문제 해결(여자1 헤어 bbox 1.19→0.29).
puppeteer로 투명 PNG 스냅샷, `public/avatars/thumbs/`에 저장 — Vercel 빌드에서 못 도므로 **커밋**(소스 취급, §4).
VRM=MToon 보존, GLB=PBR.

**다음:** top_3/top_4 시각 분류 확정 / 남자2 등 베이스 추가(`CHARACTERS[]`에 1줄) / `manifest.json` 자동생성(§5).
