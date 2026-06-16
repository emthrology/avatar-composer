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
- ✅ ④외부 GLB 로딩+rebind — 실측 스탠드인(`Tops_sample.glb`)으로 시각 검증
- 🔧 ⑤스프링본 병합 — `loadSpringPart()` 구현·정적검증 완료, sway 시각 확인 대기
- ⬜ ⑥옷밑 살 클리핑 — 외주 마킹 채널 합의 후

화면 **좌측** 모듈 파츠 on/off 디버그 패널 + **우측** 더미 토글·모프 슬라이더·검증 리포트.
실제 authored 파츠는 외주 도착 후 `PART_TEST_URL`/`SPRING_PART_TEST_URL` 교체로 연결.

> 스탠드인(`Tops_sample.glb`/`Hair_sample.vrm`)은 `male_sample.vrm`에서 재생성 가능해 gitignore.
> `npm run build`의 `prebuild` 훅(`scripts/extractParts.mjs`)이 자동 생성한다. 클론 후 dev만 돌릴 땐
> `node scripts/extractParts.mjs` 1회 실행.

## 문서
- [ARCHITECTURE.md](ARCHITECTURE.md) — 왜 별도 프로젝트인가 + 3층 구조 + 검증 상태
- [ASSET_SPEC.md](ASSET_SPEC.md) — 외주 핸드오프 사양 (베이스 규약 실측값)
- [DECISIONS.md](DECISIONS.md) — 의사결정 로그 (ADR): 분기·에셋전략·베이스 결정 근거

## 구조
```
src/
├── App.tsx
└── composer/
    ├── ComposerScene.tsx   # Canvas + 좌/우 패널 + 검증 리포트
    ├── AvatarComposer.tsx  # 베이스 로드 + 파츠 부착/병합 + 모프 + 추종 검증
    ├── PartsPanel.tsx      # 좌측 모듈 파츠 on/off 디버그 오버레이
    ├── partLoader.ts       # 실 파츠 로더 — loadPart(④) / loadSpringPart(⑤)
    ├── dummyParts.ts       # 더미 파츠 팩토리 (PoC ①②③ 검증 자산)
    └── constants.ts        # 컨벤션 락 + 파츠 URL + MODULE_PARTS 레지스트리
scripts/extractParts.mjs      # male_sample.vrm → Tops/Hair 스탠드인 추출
public/avatars/
├── male_base.vrm             # 고정 베이스 (VRoid 마네킨, 민머리) — 앱이 로드
└── male_sample.vrm           # 스탠드인 추출 소스 (옷·헤어 입은 VRoid 샘플)
```
