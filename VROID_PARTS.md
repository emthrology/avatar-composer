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

## 2. 실측 카탈로그 (male1 셔츠/바지)

| 파츠 | 머티리얼 | 실버텍스 | base 누락 본 | 바인드 정합 | 스프링 | 로더 |
|---|---|---|---|---|---|---|
| Tops (셔츠) | `Tops_01_CLOTH` | 1,691 | 0 | **0.00mm** | (CoatSkirt 잔존, 미가중) | `loadPart`(GLB) |
| Tie (넥타이) | `Accessory_Tie_01_CLOTH` | 145 | 0 | 0.00mm | — | (보류) |
| Bottoms (바지) | `Bottoms_01_CLOTH` | 1,076 | 0 | 0.00mm | 0 | `loadPart`(GLB) |

핵심: **base 기반으로 저작하면 0 누락 · 0.00mm 정합** → 오프셋 없이 딱 맞는다(ASSET_SPEC §1 신장 락의 보상).
다른 신장 파일에서 빌리면 균일 오프셋이 생긴다(male_sample = 2.5cm).

VRoid 의상 템플릿엔 `J_Sec_*_CoatSkirt*` 같은 스프링 본이 딸려오지만, 짧은 옷은 거기 메시가 안 물린다
→ 정적 파츠로 취급(미가중 본은 `loadPart`가 누락 보고에서 제외).

## 3. 제공 형식

- 정적 스킨드(상의·하의·신발·고정 헤어) = **GLB**, `loadPart`
- 스프링 물리(흔들 헤어·코트 스커트) = **VRM**(VRMC_springBone 보존), `loadSpringPart`
- 모두 base 스켈레톤 규약(ASSET_SPEC §1) + 프리픽스 네이밍 준수

## 4. 추출 파이프라인 (현재)

`scripts/extractParts.mjs` — 잡(JOB) 선언으로 소스 VRM에서 부위 추출. 2단:
1. **raw glTF 수술** — 타깃 mesh만 남기고 머티리얼로 프리미티브 필터, 노드·bin 통째 유지(스프링/콜라이더/
   IBM 참조 무결성 보존).
2. **GLB prune** — `gltf-transform` `prune()`+`dedup()`로 끊긴 메시·미사용 머티리얼/텍스처/액세서리 회수.
   **~13MB → 1\~2MB** (Tops 13.5→1.0, Bottoms 14.2→1.8). 정적 GLB 한정(확장 없어 무손실).

런타임은 `MODULE_PARTS` 레지스트리를 순회해 부위별 독립 장착·토글. 파생 파일은 gitignore + `prebuild` 훅 재생성.

## 5. 라이브러리화 진척

**완료**
- ✅ **GLB 본/지오메트리/텍스처 prune** — §4-2. 스킨 73조인트·가중 본 이름 전부 보존 → rebind 0 누락 무변.
  (잔여: POSITION이 메시 공유 버퍼라 7,431 verts 중 1,691만 쓰는데도 통째 잔존 ≈ 1MB. vertex 압축은 후속.)
- ✅ **스프링 본 네임스페이싱** — 헤어 스프링 노드(`J_Sec_*Hair*`) 45개에 파츠 prefix(`Hair_sample__`) 부여 →
  다중 스프링 파츠 동시 로드 시 이름 충돌 제거. node 참조는 인덱스라 무손상, 런타임 `/Hair/i` 매칭·고유성 유지.
  humanoid(`J_Bip_*`)·Bust·CoatSkirt 불간섭.

**남은 과제**
- **VRM 인지 prune** — 헤어 VRM은 `VRMC_springBone`을 gltf-transform이 모르고 떨궈서 prune 제외(현 11MB).
  VRM 확장 등록 후 동일 압축 적용 필요.
- **vertex 압축** — 머티리얼 분리 후에도 POSITION이 메시 공유 버퍼라 미사용 verts 잔존. 인덱스 기준 재패킹 시 추가 ↓.
- **manifest 화** — `MODULE_PARTS` 하드코딩 → 추출 산출 `manifest.json`(id/카테고리/형식/썸네일) 구동 셀렉터.
- **batch** — 소스 디렉터리 일괄 → 라이브러리 + manifest 생성, 멱등 재실행.
