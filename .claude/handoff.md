# 인계 문서 — 이미지/사운드 에셋 작업 (다음 세션 이어가기용)

> 마지막 갱신: 2026-05-29. 이 문서만 읽으면 이어서 진행 가능하도록 정리.
> **개발/테스트/에셋 절차는 `DEVELOPMENT.md`** 에 상세히 있음 (이 문서는 진행상황·결정 위주).

## ⏩ 현재 상태 (최신)
- 이미지 **14장 생성·가공·wiring 완료** → `assets/img/*.webp` (title-hero + 이벤트 13종:
  champion/hof/draft/intl/allstar/military/training/award/injury/retire/demote/fa/trade).
  Gemini 워터마크 제거 + WebP 축소(각 37~140KB). manifest 14키 전부 파일 존재 확인.
  부상은 수술(토미존) 시 컷 모달, 은퇴는 비-HoF 등급에 eventRetire.
- **BGM 2곡 완료** — MusicFX 생성 WAV(원본 `aibgm/`, gitignore)를 모노 22050Hz WAV(각 1.3MB)로 변환 →
  `assets/audio/bgm-{menu,game}.wav`. 브라우저 재생 확인(200). 효과음은 합성으로 동작.
- **★ 에셋 작업(이미지 14 + BGM 2 + 효과음) 전부 완료.** ffmpeg 있으면 BGM 을 mp3(≈400KB)로 더 줄일 수 있음(선택).
- **이벤트 컷 8장 wiring 완료** — 우승(buildFinalResult)/입단(드래프트 모달)/HoF(careerEnded, rank hof)/
  군입대(openMilitaryModal)/올스타·국제대회(result 화면)/특훈(offseason intense·camp)/시상(awards 슬라이드).
  공용 헬퍼 `eventCut(key)` (weekly.js, 파일 없으면 미표시). title-hero 는 타이틀 화면.
- BGM 파일 아직 없음(무음). 효과음은 합성으로 동작 중.
- 미생성 이벤트 컷: **부상/토미존, 은퇴, 강등, FA/트레이드** (+휴식기 옵션).
- 원본 `gemini_images/`(70MB) 는 .gitignore (가공본만 커밋).

## 큰 그림 / 결정 사항
게임에 **바이너리 에셋(이미지 + 오디오)** 을 추가한다. 기존 원칙(zero-asset, 코드생성 SVG)에서 벗어나는 결정.

- **에셋 생성 경로 = "경로 2"** (확정): 개발 샌드박스에선 구글 로그인/외부 인증이 불가하므로,
  **사용자 본인 PC의 로그인된 Chrome**에서 생성한다.
  - 이미지: **Gemini(Imagen)** — 본인 브라우저 (또는 Claude-for-Chrome 확장).
  - BGM: **MusicFX / Lyria (labs.google)** — Gemini 챗 아님. 막히면 CC0 무료음원.
  - 효과음: **파일 불필요** — `src/assets/audio.js` 가 Web Audio 로 합성 (이미 구현).
  - (옵션) 아나운서 음성: Gemini TTS — 미정/보류.
- 생성된 파일은 `assets/img/`, `assets/audio/` 에 **규약된 파일명**으로 넣으면 즉시 반영.
  파일이 없어도 게임은 정상(이미지=SVG/로고 폴백, BGM=무음, SFX=합성).

## 단계
- **Phase 1 — 에셋 통합 레이어: ✅ 완료 (이번 세션)**
- **Phase 2 — 에셋 스펙·프롬프트 시트: 다음 작업**
  타이틀/특별이벤트 이미지 + BGM 곡별로 Gemini/MusicFX 프롬프트, 해상도, 파일명 표 작성.
  `assets/README.md` 에 파일명/스펙 표 초안 있음 — 여기에 실제 프롬프트를 채우면 됨.
- **Phase 3 — 로컬 생성 스크립트 (본인 PC): 다음 작업**
  `tools/gen-assets.mjs` — Playwright `launchPersistentContext(본인 Chrome 프로필)` 로 로그인 상속,
  Gemini 조작·다운로드. **웹 UI 자동화는 깨지기 쉬움**(셀렉터/봇차단) → 스펙시트 기반 수동/Claude-for-Chrome 생성도 동등 지원.

## Phase 1 에서 구현된 것 (코드 위치)
- `src/assets/manifest.js` — 에셋 키→경로/메타 (IMAGES, BGM). **새 에셋은 여기 등록.**
- `src/assets/images.js` — `createImage(key,{fallback})` (로드 실패 시 폴백), `preloadImages()`.
- `src/assets/audio.js` — AudioManager:
  - `sfx(name)` 합성: click / hit / homerun / strikeout / good / bad.
  - `playBgm(key)` / `stopBgm()` / `applyAudioSettings()` (파일 기반, 없으면 무음).
  - `initAudioUnlock()` — 첫 제스처에 오디오 unlock (모바일 자동재생 정책).
- `src/systems/settings.js` — `muted` / `bgmVolume(0.4)` / `sfxVolume(0.6)` 추가.
- `src/views/settingsModal.js` — 사운드 섹션 (음소거 토글 + 볼륨 슬라이더 2개).
- `src/main.js` — 부팅 시 `initAudioUnlock()` + `preloadImages()`, `route()` 에서 뷰별 BGM
  (`VIEW_BGM`: start/menu/shop→menu, weekly→game).
- `src/views/menu.js` — 타이틀 화면 hero 가 `createImage("titleHero")` (폴백=로고 텍스트), 시작 버튼 클릭음.
- `src/views/weekly.js` — 라이브 로그 `appendEventLog` 에서 메인 타석 HR/안타/삼진 효과음.
- i18n: `settingsModal.soundTitle/soundOn/soundMuted/soundBgm/soundSfx` (ko/en).

## 필요한 에셋 파일 (넣으면 바로 작동)
이미지 `assets/img/`: `title-hero.png` (타이틀, ~1024×640), `event-draft.png`, `event-champion.png`.
오디오 `assets/audio/`: `bgm-menu.mp3` (메뉴 루프 ≤1MB), `bgm-game.mp3` (경기 루프 ≤1MB).
(상세 스펙은 `assets/README.md`.)

## 다음 세션 시작 시 할 일 (우선순위)
1. **부족 이벤트 컷 생성** (부상/은퇴/강등/FA·트레이드) — 프롬프트 시트(`assets/README.md`)에 추가 후 사용자가 Gemini 로 생성 → `gemini_images/` → §에셋 가공(워터마크 제거+WebP) → manifest 키 추가 → 해당 모달에 `eventCut(키)`.
   (강등=showDemotionModal, FA=showFreeAgencyModal, 트레이드=showTradeModal, 부상/은퇴=해당 표시 지점)
2. **BGM**: MusicFX 로 `bgm-menu.mp3`/`bgm-game.mp3` 생성 → `assets/audio/`.
3. (선택) `tools/gen-assets.mjs` — 본인 PC Playwright persistentContext 자동 생성 스크립트.
4. (선택) 브라우저로 각 이벤트 컷 실제 표시 확인 (우승/드래프트 등 도달이 길어 상태 주입 필요).

## 개발 환경 메모 (브라우저 검증)
- 이 샌드박스 브라우저는 **`ignoreHTTPSErrors:true`** 면 외부 사이트 접근 가능(인증서 가로채기 회피).
  단 **구글 로그인은 불가** (계정 인증/봇차단). 그래서 에셋 생성은 경로 2(본인 PC).
- 로컬 검증: `python3 -m http.server 8765` + `npm install --no-save playwright@1.60.0` 후
  Playwright 로 `firebasejs` 라우트를 빈 스텁으로 가로채면 오프라인 구동 가능
  (Firebase가 외부 CDN 의존이라 그대로면 모듈 로드 실패). 검증 후 `node_modules` 제거.
- `node probe.mjs` / `node probe-career.mjs` 로 시뮬 회귀 확인.
