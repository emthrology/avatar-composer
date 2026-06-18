# avatar-composer

캐릭터(베이스) + authored 모듈 파츠를 조립해 **얼굴 조형 / 헤어 / 옷차림**을 바꾸는 3D 아바타 조립기.
베이스를 바꾸면(남자1↔여자1) 그 베이스의 파츠 라이브러리로 통째 스왑되고, 피커는 그 파츠만 보여준다.
drei-avatar-project(임의 VRM 로드·커스터마이즈)에서 갈라져 나온 별도 프로젝트 — 전제가 다르다.

## 시작
```bash
npm install
npm run dev    # http://localhost:5173
```

## 현재 상태
조립 메커니즘 검증 단계. 검증 게이트(상세는 [ARCHITECTURE.md](ARCHITECTURE.md)):
- ✅ ①리지드 부착 ②스킨드 rebind ③모프 — 더미 파츠로 확인
- ✅ ④외부 GLB 로딩+rebind — **base 기반 실파츠**(셔츠·바지)로 검증, 0 누락·**0.00mm 정합**
- ✅ ⑤스프링본 병합 — `loadSpringPart()` 헤어 sway 확인(여자1 앞머리+뒷머리 2메시 결합 포함)
- ✅ 얼굴 메시 교체 — `loadFacePart()`(눈 본 graft + 표정 미러, 짝 없는 메시는 donor 폴백)
- ✅ **다중 베이스(캐릭터 축)** — `CHARACTERS[]`(남자1/여자1). 베이스 스왑 시 카탈로그·파츠 동반 교체
- ⬜ ⑥옷밑 살 클리핑 — 외주 마킹 채널 합의 후

`CHARACTERS[]`(베이스별 `CATALOG`)를 순회해 **카테고리 슬롯당 1개 선택·교체**(swap-on-select). 화면
**좌측** 캐릭터 셀렉터 + VRoid식 카탈로그 피커(탭+썸네일) + **우측** 3D + 접이식 dev 드로어(스캐폴딩).
변형 추가 = 소스 드롭 → `extractParts.mjs` JOBS 1줄 → `CATALOG` 1줄 → `npm run assets`.

> 파생 파츠(`male1/*.glb`, `female1/*.glb`·`Face_*`·`Hair_*.vrm`, `Hair_sample.vrm`)는 소스 VRM에서
> 재생성 가능해 gitignore. `npm run build`의 `prebuild` 훅(`scripts/extractParts.mjs`)이 자동 생성한다.
> 클론 후 dev만 돌릴 땐 `node scripts/extractParts.mjs` 1회 실행. (썸네일 PNG는 puppeteer 필요 → 커밋)

## 문서
- [ARCHITECTURE.md](ARCHITECTURE.md) — 왜 별도 프로젝트인가 + 3층 구조 + 검증 상태
- [VROID_PARTS.md](VROID_PARTS.md) — VRoid 부위별 추출 가능 범위 + 라이브러리화 과제
- [ASSET_SPEC.md](ASSET_SPEC.md) — 외주 핸드오프 사양 (베이스 규약 실측값)
- [DECISIONS.md](DECISIONS.md) — 의사결정 로그 (ADR): 분기·에셋전략·베이스 결정 근거

## 구조
```
src/
├── App.tsx                 # 앱 / 썸네일(?thumb=) 모드 분기 + 전 캐릭터 카탈로그 노출
└── composer/
    ├── ComposerScene.tsx   # Canvas + 캐릭터 셀렉터/피커(좌) + 3D/dev 드로어(우)
    ├── AvatarComposer.tsx  # 베이스 로드 + CATALOG 순회 슬롯 장착 + 모프 + 유휴 시선
    ├── partLoader.ts       # 실 파츠 로더 — loadPart(GLB)/loadSpringPart(VRM)/loadFacePart(VRM)
    ├── dummyParts.ts       # 더미 파츠 팩토리 (PoC ①②③ 검증 자산)
    ├── constants.ts        # 컨벤션 락(BASE_SPEC) + CHARACTERS[](베이스별 CATALOG)
    └── ui/                 # CatalogPicker(탭+그리드) · VariantCard · ThumbScene(?thumb 렌더)
scripts/
├── extractParts.mjs          # 소스 VRM → 부위별 파츠 추출 (JOBS 선언; 멀티-메시 지원)
└── renderThumbs.mjs          # ?thumb= 모드를 puppeteer로 순회 렌더 → thumbs PNG
public/avatars/
├── male_base.vrm             # 남자1 베이스 (VRoid 마네킨, 민머리)
├── male_sample.vrm           # 남자1 헤어 추출 소스
├── male1/parts/              # 남자1 의류 소스 VRM → 부위 추출
└── female1/                  # 여자1 베이스(female_base.vrm) + parts/ 소스(옷·얼굴·헤어)
```
