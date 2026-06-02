# DEVELOPMENT.md — 개발 / 테스트 / 에셋 가이드

이 문서는 프로젝트의 영속적인 개발, 테스트 및 배포 절차를 정리한 개발자용 가이드입니다.

## 0. 한 줄 요약
빌드 없음 · Vanilla JS(ESM) · SVG 코드생성 · localStorage 세이브(+Firebase 클라우드) · 정적 호스팅(Firebase) · i18n(en 기본/ko) · 광고 GameMonetize SDK.
`index.html` 정적 서빙만으로 동작. `main` 푸시 시 GitHub Actions → Firebase Hosting 자동 배포(https://baseball-alone.web.app).

---

## 0.1 개발 방식 — 문서화 원칙

이 프로젝트는 기능 구현과 문서를 동기화하여 개발 효율성을 높이는 방식을 사용합니다.

**문서화의 중요성:**
- 코드는 *무엇을* 하는지 보여주지만, *왜 그렇게 했고 / 현재 어디까지 개발되었고 / 다음에 무엇을 해야 하는지*는 문서에만 남습니다.
- 코드와 문서가 일치하지 않으면 프로젝트 파악에 시간이 낭비되거나 잘못된 가정을 하기 쉽습니다.
- **모든 주요 기능 변경이나 밸런스 조정 시 관련 문서(README.md 등)의 변경사항 갱신을 함께 포함합니다.**

**각 문서의 역할:**
| 문서 | 관점 | 적는 내용 |
|---|---|---|
| `README.md` | 플레이어/전체 | 게임 소개 + **버전 changelog**(기능·밸런스 변경 내역) + 문서 안내 + 핵심 시스템/파일구조/로드맵 |
| `DEVELOPMENT.md` | 개발자 | 개발 방식·도구·의존성·**테스트 방법**·배포·**에셋 파이프라인**(어떻게 개발·검증하나) |
| `EVENTS.md` | 야구 컨텐츠 | 실제 야구 대비 **이벤트 갭 분석** + 구현 노트 + probe 사용법 + 변경 로그 |
| `MONETIZATION.md` | 광고/수익화 | **GameMonetize.com SDK** 등록 연동 및 트리거 설정 가이드 |
| `assets/README.md` | 에셋 | 이미지/오디오 파일명·스펙 규약 및 리소스 목록 |

---

## 0.5 필요 도구 / 의존성

**런타임 의존성: 없음.** 프레임워크/번들러/런타임 npm 패키지 0개 (Vanilla JS ESM). `index.html` 만으로 동작.

| 구분 | 항목 | 용도 / 비고 |
|---|---|---|
| **런타임(설치 X)** | Firebase SDK 10.13.0 | 클라우드 세이브/로그인. **CDN(gstatic) 직접 import** — 설치 없음. `firebaseConfig` 비면 자동 비활성. |
| **서버** | Python 3 | `python3 -m http.server` 정적 서빙 (ESM은 file:// 불가) |
| **시뮬 테스트** | Node ≥ 18 | `probe.mjs` / `probe-career.mjs` 실행 (ESM, 의존성 0) |
| **브라우저 테스트** | Playwright `1.60.0` | `npm install --no-save` (커밋 X). 헤드리스 Chromium 구동 |
| | Chromium 바이너리 | `npx playwright install chromium` (1회) |
| | apt 시스템 라이브러리 | chromium 구동용 (아래 목록, sudo 1회) |
| **이미지 가공** | Python **Pillow(PIL)** | 이미지 해상도 조정 및 WebP 변환/축소 |
| **배포 상태** | GitHub CLI `gh` | `gh run list` 로 Actions 확인 (선택) |
| **버전관리** | git | main 푸시 → 자동 배포 |

apt 시스템 라이브러리 (chromium):
```
libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2
libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1
libpango-1.0-0 libcairo2 libasound2t64
```

---

## 1. 실행

```bash
# 로컬 플레이 (ES Module 은 file:// 로 못 열림 — 반드시 HTTP 서버 필요)
python3 -m http.server 8765
# → http://localhost:8765 접속
```

---

## 2. 테스트

### 2.1 시뮬 회귀 테스트 (Node.js)
```bash
node probe.mjs          # 단계별 단위 검증. 마지막에 "✅ 전체 통과" 출력 확인
node probe-career.mjs   # 16세~38세 풀 커리어 시뮬레이션 및 데이터 분포 검증
```
기대치:
- `probe.mjs`: `[FAIL]` 0건, "✅ 전체 통과".
- `probe-career.mjs`: 프로 시즌 평균 **AVG .24~.27 / ERA 2~4** 등 현실적인 야구 스탯 범위 내에 위치.
- 로직 변경 후에는 항상 두 테스트를 실행하여 버그 발생 여부를 확인합니다.

### 2.2 브라우저 검증 (Playwright)
로컬 서버 구동 상태에서 Playwright 테스트 스크립트를 사용하여 핵심 시나리오(시작 화면, 시즌 진행, 모달 레이아웃 등)가 정상 작동하는지 자동 검증합니다.

---

## 3. 폴더 구조

```
├── index.html            # 메인 진입점 및 광고 SDK 스크립트 로드
├── styles/
│   └── main.css          # 공용 스타일시트 (모바일 레이아웃 및 다크 모드)
├── src/
│   ├── main.js           # 게임 부트스트랩 및 모달/뷰 라우팅 제어
│   ├── state.js          # 게임 상태(전역 변수, 저장/불러오기, 클라우드 세이브 연동)
│   ├── systems/          # 게임 엔진 및 시뮬레이션 핵심 로직
│   │   ├── simulator.js   # 매치 및 투타 At-Bat 시뮬레이션 엔진
│   │   ├── player.js      # 선수 생성 및 발달 스케일 제어
│   │   ├── career.js      # 고교/대학/프로 등 커리어 패스 및 성장
│   │   └── ...
│   ├── assets/           # 에셋 로더 레이어 (manifest/images/audio)
│   ├── views/            # 화면별 렌더링 뷰 (menu, weekly, shop, settingsModal)
│   ├── data/             # 데이터 사전 (구단 정보, 이름 정보, 상점 품목 등)
│   └── i18n/             # 다국어(ko/en) 사전 모듈
└── assets/               # 바이너리 에셋 폴더
    ├── img/              # 이벤트 및 캐릭터 일러스트 리소스
    └── audio/            # BGM 오디오 파일
```

---

## 4. 배포 / Git

- `main` 브랜치 푸시 시 GitHub Actions(`Deploy to Firebase Hosting on merge`)가 작동하여 자동으로 실 배포됩니다.
- 배포 상태는 `gh run list --limit 5` 로 모니터링할 수 있습니다.
- 빌드된 결과물만 배포하려면 `ninthinning-web.zip` 번들 형태로 아카이브하여 사용합니다.
- `node_modules/`, `package-lock.json` 및 기타 임시 원본 폴더는 `.gitignore`에 등록되어 있습니다.

---

## 5. 에셋 파이프라인 (이미지 / 오디오)

### 5.1 폴백 원칙
에셋 파일이 존재하지 않거나 로드에 실패하더라도 게임은 에러 없이 정상 구동됩니다.
- **이미지**: 로드 실패 시 `src/assets/images.js` 가 코드로 그려진 **SVG 벡터 그래픽**으로 즉시 대체합니다.
- **BGM**: 오디오 파일이 없으면 무음 처리됩니다.
- **효과음**: 파일 리소스 대신 Web Audio API를 활용하여 코드로 사운드를 실시간 합성(Synthesis)합니다.

### 5.2 이미지 에셋 최적화
게임에 적용할 이미지는 용량과 모바일 로딩 속도를 최적화하기 위해 WebP 포맷을 적용합니다.
1. 이미지를 가공 폴더에 준비합니다.
2. Pillow 라이브러리를 사용하여 모바일 화면에 맞게 해상도(이벤트 컷 512px, 타이틀 640px)를 줄이고 WebP로 변환합니다.
   ```python
   from PIL import Image
   im = Image.open('source.png')
   W = 512
   im = im.resize((W, round(im.size[1]*W/im.size[0])), Image.Resampling.LANCZOS)
   im.save('assets/img/target.webp', 'WEBP', quality=82)
   ```
3. 생성된 `assets/img/<이름>.webp`를 `src/assets/manifest.js`에 키와 경로로 매핑합니다.

### 5.3 오디오 에셋
- **효과음**: `src/assets/audio.js`가 코드로 오실레이터를 제어하여 타격음, 환호성 등을 자동 생성합니다.
- **BGM**: `assets/audio/bgm-menu.wav`, `bgm-game.wav` 등의 리소스를 활용하며 게임 설정 모달에서 볼륨 조절이 가능합니다.

---

## 6. 자주 쓰는 명령
```bash
node probe.mjs && node probe-career.mjs          # 시뮬레이션 회귀 확인
python3 -m http.server 8765                      # 로컬 서버 구동
```
