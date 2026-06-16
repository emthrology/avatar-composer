# avatar-composer

고정 베이스 + authored 모듈 파츠를 조립해 **얼굴 조형 / 헤어 / 옷차림**을 바꾸는 3D 아바타 조립기.
drei-avatar-project(임의 VRM 로드·커스터마이즈)에서 갈라져 나온 별도 프로젝트 — 전제가 다르다.

## 시작
```bash
npm install
npm run dev    # http://localhost:5173
```

## 현재 상태
조립 메커니즘 검증 단계 — **더미 파츠**로 ①리지드 부착 / ②스킨드 rebind / ③모프를 확인한다.
화면 우측 패널에서 토글·슬라이더 + 검증 리포트. 실제 authored 파츠는 외주 도착 후 연결.

## 문서
- [ARCHITECTURE.md](ARCHITECTURE.md) — 왜 별도 프로젝트인가 + 3층 구조 + 검증 상태
- [ASSET_SPEC.md](ASSET_SPEC.md) — 외주 핸드오프 사양 (베이스 규약 실측값)
- [DECISIONS.md](DECISIONS.md) — 의사결정 로그 (ADR): 분기·에셋전략·베이스 결정 근거

## 구조
```
src/
├── App.tsx
└── composer/
    ├── ComposerScene.tsx   # Canvas + 컨트롤 UI + 검증 리포트
    ├── AvatarComposer.tsx  # 베이스 로드 + 파츠 부착 + 모프 + 추종 검증
    ├── dummyParts.ts       # 더미 파츠 팩토리 (PoC 검증 자산) + loadPart TODO
    └── constants.ts        # 컨벤션 락 (male_base.vrm 실측)
public/avatars/male_base.vrm  # 고정 베이스 (VRoid 마네킨, 민머리)
```
