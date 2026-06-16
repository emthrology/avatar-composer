# avatar-composer

고정 베이스 + authored 모듈 파츠를 조립해 **얼굴 조형 / 헤어 / 옷차림**을 바꾸는 3D 아바타 조립기.
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
- 🔧 ⑤스프링본 병합 — `loadSpringPart()` 구현·정적검증 완료, sway 시각 확인 대기
- ⬜ ⑥옷밑 살 클리핑 — 외주 마킹 채널 합의 후

`MODULE_PARTS` 레지스트리를 순회해 **부위별(상의/하의/헤어) 독립 장착·토글**. 화면 **좌측** 모듈 파츠
on/off 디버그 패널 + **우측** 더미 토글·모프 슬라이더·검증 리포트. 파츠 추가는 레지스트리 한 줄.

> 파생 파츠(`male1/*.glb`, `Hair_sample.vrm`)는 소스 VRM에서 재생성 가능해 gitignore.
> `npm run build`의 `prebuild` 훅(`scripts/extractParts.mjs`)이 자동 생성한다. 클론 후 dev만 돌릴 땐
> `node scripts/extractParts.mjs` 1회 실행.

## 문서
- [ARCHITECTURE.md](ARCHITECTURE.md) — 왜 별도 프로젝트인가 + 3층 구조 + 검증 상태
- [VROID_PARTS.md](VROID_PARTS.md) — VRoid 부위별 추출 가능 범위 + 라이브러리화 과제
- [ASSET_SPEC.md](ASSET_SPEC.md) — 외주 핸드오프 사양 (베이스 규약 실측값)
- [DECISIONS.md](DECISIONS.md) — 의사결정 로그 (ADR): 분기·에셋전략·베이스 결정 근거

## 구조
```
src/
├── App.tsx
└── composer/
    ├── ComposerScene.tsx   # Canvas + 좌/우 패널 + 검증 리포트
    ├── AvatarComposer.tsx  # 베이스 로드 + MODULE_PARTS 순회 장착 + 모프 + 추종 검증
    ├── PartsPanel.tsx      # 좌측 모듈 파츠 on/off 디버그 오버레이
    ├── partLoader.ts       # 실 파츠 로더 — loadPart(정적 GLB) / loadSpringPart(스프링 VRM)
    ├── dummyParts.ts       # 더미 파츠 팩토리 (PoC ①②③ 검증 자산)
    └── constants.ts        # 컨벤션 락 + MODULE_PARTS 파츠 레지스트리
scripts/extractParts.mjs      # 소스 VRM → 부위별 파츠(상의/하의/헤어) 추출 (JOB 선언)
public/avatars/
├── male_base.vrm             # 고정 베이스 (VRoid 마네킨, 민머리) — 앱이 로드
├── male_sample.vrm           # 헤어 스탠드인 추출 소스
└── male1/parts/              # base 기반 의류 소스 VRM (셔츠·바지) → 부위 추출
```
