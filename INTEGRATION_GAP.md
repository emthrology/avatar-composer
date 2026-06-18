# INTEGRATION_GAP — drei-avatar-project ↔ avatar-composer 괴리 조사

통합 준비 스냅샷(2026-06-18 조사). **통합 작업은 drei-avatar-project 세션에서 진행**하며, 이 문서는 그
핸드오프용 괴리 지도다. 결정 원장은 [INTEGRATION.md](INTEGRATION.md)(엔진/정책/스캐폴딩 분류), 여긴 "지금
양쪽이 실제로 어떻게 다른가 + 어디를 접합하나"의 실사.

조사 대상: drei `main`(통합 호스트, 현재 체크아웃은 `poc/asset-swap`=composer가 포크한 씨앗) vs composer `main`.

---

## 0. 한 줄 요약

**스택은 동일(이관 마찰 거의 없음), 전제가 다르다.** drei 에디터는 *임의 VRM 1개(모놀리식 merged 메시)를
업로드해 show/hide·색·셰이더만* 만진다. composer 는 *고정 base + authored 파츠 라이브러리를 런타임 조립*한다.
drei 는 이미 후자로 피벗 중 → composer 의 조립 엔진이 **drei 에디터 탭**에 흡수된다. 핵심 갭은 **(a) 파츠 조립
엔진 부재, (b) base/파츠/카탈로그/선택 데이터 모델 부재, (c) 멀티 베이스(캐릭터 축) 부재** 세 가지다.

---

## 1. 스택 정합성 — ✅ 사실상 동일 (이관 리스크 낮음)

| 항목 | drei | composer | 정합 |
|---|---|---|---|
| VRM | `@pixiv/three-vrm` v3.5.x | v3.5.x | ✅ |
| 렌더 | R3F v8 / drei v9 / three 0.170.x | 동일 | ✅ |
| 상태 | Zustand v5 | 동일 | ✅ |
| 빌드/UI | Vite / Tailwind | 동일 | ✅ |
| VRM 로드 패턴 | `useGLTF(url,true,true, extendLoader→VRMLoaderPlugin)` | 동일(`AvatarComposer`) | ✅ |
| 프레임 갱신 | `vrm.update(delta)` 매 프레임 | 동일 | ✅ |
| rest 포즈 | normalized UpperArm z=∓1.3(차렷) | 동일 기대 | ✅ |
| 카메라 프레이밍 | 본+`Box3.max.y` 상반신 fit | 유사(자체 fit) | ✅ |
| MToon 제어 | ShaderPanel 전역(outlineWidth·shadingToony) | 파츠에 MToon 적용(PR #10) | ⚠ 접합(§4) |

> 같은 컨벤션 락(VRM1.0·`J_Bip_*`·A-pose·신장·MToon)을 공유. composer `BASE_SPEC`/`ASSET_SPEC` 가 drei 의
> 공유 불변식 단일 출처가 될 수 있다(INTEGRATION 원칙3). 단 **락은 모듈 조립 경로에만** — drei 의 임의-VRM
> 업로드 경로엔 비적용.

---

## 2. 현황 스냅샷

### drei `main` (호스트)
- **App**: `editor` / `companion` 모드 토글. 에디터 = `<AvatarScene avatarUrl>` + `<EditorPanel>`(폭 w-72).
- **store** (`src/store.ts`): `avatarUrl`(단일) · `meshInfos[]`(name/visible/litColor/shadeColor) · `lighting` ·
  `shader`(outlineWidth, shadingToony) · `grading`(밝기/대비/색조/채도). **base/파츠/카탈로그/선택 개념 없음.**
- **VRMAvatar** (`src/components/VRMAvatar.tsx`): VRM 1개 로드 → `<primitive object={vrm.scene}>` 렌더.
  `collectMeshInfos`(메시 목록 추출) → `meshInfos` 변경 시 effect 가 실제 메시에 visible/색 반영. 파츠 *교체* 없음.
- **EditorPanel**: 아코디언 — 「파츠/색상」(메시 리스트 show/hide + lit/shade 색) · 셰이더 · 조명 · 톤 · 애니메이션.
  **"파츠"=메시 토글**이지 카탈로그 스왑이 아님. 파일 업로드(.vrm/.glb)로 모델 교체.
- **companion**: 두텁다(TTS·립싱크·시선·anim 스케줄러·무드·제스처). 통합과 직접 관련 적음 — **정책의 산실**.
- 자기 인지: `CLAUDE.md` L249 "VRM 파츠는 merged 메시 → 진정한 파츠 교체는 VRoid 별도 내보내기 필요" —
  **정확히 composer 가 채우는 빈칸.**

### avatar-composer (이관 대상 엔진)
- **CHARACTERS[]**(남자1·여자1) = base별 `{baseUrl, catalog}` + `VARIANTS_BY_ID` union + `Selection`(슬롯→변형).
- **partLoader.ts**: `loadPart`(GLB 정적·rebind+graft+MToon) / `loadSpringPart`(VRM 스프링 헤어·멀티메시) /
  `loadFacePart`(VRM 얼굴·눈본 graft·표정 미러·donor 폴백).
- **AvatarComposer**: base 동적 로드 + 슬롯 diff 엔진(desired vs 현재 → dispose/load, genRef 레이스 가드).
- **ComposerScene**: 캐릭터 셀렉터 + `CatalogPicker`(탭+썸네일 그리드) + dev 드로어(스캐폴딩).
- **오프라인**: `extractParts.mjs`(추출·prune·네임스페이싱·멀티메시) + `renderThumbs.mjs`(`?thumb=` puppeteer).

> drei 작업트리에 `public/avatars/male_base.vrm`(untracked)이 이미 복사돼 있음 — 자산 측 통합 준비 착수 흔적.

---

## 3. 괴리 매트릭스 (영역별)

| 영역 | drei 현재 | composer | 갭 / 접합 액션 | INTEGRATION 분류 |
|---|---|---|---|---|
| **데이터 모델** | `avatarUrl`+flat `meshInfos[]` | `CHARACTERS[]`/`catalog`/`Selection`/`VARIANTS_BY_ID` | drei store 에 **에디터 슬라이스 신설**(characters·selection). meshInfos 와 공존 | 엔진(이관) |
| **렌더/조립 엔진** | `<primitive>` 1개, 교체 없음 | partLoader 3종 + 슬롯 diff 엔진 | **핵심 이관물**. base 로드 + 파츠 load/dispose + graft/rebind | 엔진(이관) |
| **에디터 파츠 UI** | 메시 show/hide + 색 | `CatalogPicker`(슬롯 스왑) | drei 에디터의 「파츠」 섹션을 **카탈로그 피커로 교체**(메시 토글은 업로드 경로 유지) | 스캐폴딩→drei 대체 |
| **자산 전제** | 임의 업로드 VRM(merged) | 고정 base + authored 파츠, 업로드 없음 | **두 경로 공존**: ①업로드(색/show-hide만) ②authored base+parts(풀 조립). 락은 ②에만 | 엔진/정책 |
| **멀티 베이스** | 없음(gender=TTS 토글뿐) | `CHARACTERS[]` base 스왑+카탈로그 동반 | drei 에 **캐릭터 축 신규 도입**. `useGLTF.clear` 캐시 정합 | 엔진(이관) |
| **오프라인 파이프라인** | 없음 | extractParts/renderThumbs | 라이브러리 빌드+썸네일 파이프라인 이관(`npm run assets`) | 엔진(오프라인) |
| **MToon** | ShaderPanel 전역(vrm.scene singleton) | 파츠 로드시 PBR→MToon 변환(PR #10) | **접합**: 런타임 추가 파츠를 ShaderPanel/meshInfos 가 인지하게(§4) | 엔진 API ↔ 정책 |
| **조명/톤** | SceneLights+grading(공유 store) | 자체 하드코딩 조명 | drei 정책 채택(composer 조명 폐기) | 정책 |
| **시선/유휴/제스처** | anim 스케줄러·lookAt·무드 | 범위내 랜덤 유휴 시선뿐 | composer 시선 폐기 → drei 구현 채택 | 정책 |
| **포즈/카메라** | rest pose + frameUpperBody | 유사 | 거의 정합 — drei 것 유지 | 정책 |
| **dev 드로어/더미/눈색 UI** | — | 스캐폴딩 | 폐기 | 스캐폴딩 |

---

## 4. 통합 핵심 접합부(seam) — 주의 지점

1. **런타임 추가 파츠 ↔ meshInfos/ShaderPanel.** drei 는 *로드 직후 1회* `collectMeshInfos` 하고
   ShaderPanel 은 `vrm.scene` 싱글턴을 잡는다. composer 가 **나중에** 파츠 메시를 scene 에 add/remove 하므로,
   파츠 교체 때마다 **meshInfos 재수집 + ShaderPanel 재적용**이 필요(안 그러면 새 파츠가 색/셰이더 패널에 안
   뜨거나 전역 셰이더가 안 먹음). composer 의 MToon 변환(PR #10)은 이미 base 와 같은 MToon 파라미터를 쓰므로
   톤 충돌은 없음 — 단 ShaderPanel 전역 조정이 파츠에도 닿게 연결.
2. **업로드 경로 vs authored 경로 공존.** drei 의 파일 업로드(임의 VRM)는 **유지하되 조립 비대상**. 모드 판별
   (업로드=모놀리식 show/hide / 캐릭터선택=base+parts 조립)로 분기. 컨벤션 락은 후자에만(INTEGRATION 원칙3).
3. **store 단일화.** composer 의 `Selection`/`status` 를 drei store 슬라이스로. Zustand 에 Three.js 객체 금지
   원칙은 양쪽 공통 — 파츠 객체는 module singleton/ref 로(drei 의 ShaderPanel 패턴과 동일).
4. **`vrm.update(delta)` 단일 호출.** base+파츠가 한 scene 이므로 update 는 base vrm 한 번 — 스프링 헤어는
   composer 가 base springBoneManager 에 병합하니 그 한 번에 같이 돈다(이미 그렇게 설계됨). 이중 호출 금지.
5. **rest pose/프레이밍 중복.** 양쪽 다 UpperArm z=∓1.3 + 상반신 fit. **drei 것으로 단일화**(composer 중복 제거).

---

## 5. 권장 이관 순서 (drei 세션용 제안)

1. **데이터 모델 이식** — `constants.ts`(CHARACTERS/CATALOG/Selection/VARIANTS_BY_ID/BASE_SPEC) → drei store
   슬라이스. 업로드 경로와 공존하는 얇은 셸로(과설계 금지, INTEGRATION 원칙5).
2. **partLoader 이식** — 3종 로더 + graft/rebind. base 불가지(`load*(url, baseVrm)`)라 무수정 이식 목표.
3. **조립 엔진 이식** — `AvatarComposer` 슬롯 diff(genRef 가드)를 drei VRMAvatar 의 authored 경로로.
4. **에디터 「파츠」 섹션 = 카탈로그 피커** — `CatalogPicker`/`VariantCard` 를 drei EditorPanel 아코디언 한
   섹션으로(메시 show/hide 는 업로드 경로용으로 잔류). 캐릭터 셀렉터 추가.
5. **seam 연결**(§4) — 파츠 교체 시 meshInfos 재수집 + ShaderPanel 재적용.
6. **오프라인 파이프라인 이식** — extractParts/renderThumbs + `?thumb=` 모드.
7. **정책 수렴** — composer 시선/조명/dev UI 폐기, drei 것 채택.

---

## 6. 미해결 / 결정 필요

- **업로드 경로 존치 여부 확정.** drei 가 임의 VRM 업로드를 완전 폐기하고 authored-only 로 갈지, 둘 다 둘지.
  현재 가정 = **둘 다 존치, 락은 authored 경로에만**. drei 측 확정 필요.
- **에디터 「파츠/색상」 섹션 운명.** 카탈로그 피커로 *대체* vs 두 섹션 *병치*(업로드는 메시 토글, 캐릭터는 피커).
- **per-mesh 색 편집(litColor/shadeColor) 유지 범위.** authored 파츠에도 색 편집을 노출할지(텍스처 축 vs 단색).
- **썸네일 PNG git 정책.** composer 는 커밋(puppeteer 재생성 불가). drei Vercel 빌드에서도 동일 정책 승계.
- **남자2 등 베이스 추가**는 `CHARACTERS[]` 1줄 — 이관 후 확장은 기계적.

---

실사 출처: drei `main`(store.ts·App.tsx·VRMAvatar.tsx·EditorPanel.tsx·CLAUDE.md·code-structure-guide.md),
composer `main`(constants.ts·partLoader.ts·INTEGRATION.md). drei 구조 원칙(응집·결합·관심사분리·DRY·발견성 +
비퇴락/실질개선)을 이관 코드도 따른다.
