# assets/ — 바이너리 에셋 (이미지 / 오디오)

게임은 이 폴더의 파일이 **없어도 정상 동작**합니다 (이미지=SVG/로고 폴백, BGM=무음, 효과음=Web Audio 합성).
파일을 규약 이름으로 넣으면 **즉시 반영**됩니다. 매니페스트: `src/assets/manifest.js`.

---

## 1. 에셋 구성 목록

### 이미지 에셋
- **이벤트/타이틀 14장** (`assets/img/*.webp`):
  `title-hero` · `event-champion` · `event-hof` · `event-draft` · `event-intl` · `event-allstar` ·
  `event-military` · `event-training` · `event-award` · `event-injury` · `event-retire` ·
  `event-demote` · `event-fa` · `event-trade`
- **캐릭터 및 경기 POV 16장**:
  - 캐릭터 선택 미리보기 12장: 얼굴 6종(`char-bat-f1..f6`/`char-pitch-f1..f6`) × 포즈 2종(타자/투수)
  - 결승 POV 4장: 배경 2(`pov-bg-bat`/`pov-bg-pitch`) + 전경 누끼 소품 2(`pov-fg-bat`/`pov-fg-pitch`)

### 오디오 에셋
- **BGM 2곡** (`assets/audio/*.wav`):
  `bgm-menu.wav` (메뉴/타이틀 배경음) · `bgm-game.wav` (경기 진행 배경음)
- **효과음**:
  별도 사운드 파일 없이 `src/assets/audio.js`에서 Web Audio API로 오실레이터 주파수를 조절하여 타격음, 관중 함성, 클릭음 등을 실시간 합성해 사용합니다.

---

## 2. 이미지 에셋 규격 및 가이드

- **포맷**: 모바일 기기의 로딩 최적화를 위해 모두 **WebP** 포맷을 준수합니다.
- **해상도**:
  - 이벤트 컷 및 캐릭터 미리보기: 가로 **512px** 기준 (비율 유지)
  - 타이틀 화면: 가로 **640px** 기준
- **네이밍 규칙**:
  - 이벤트 컷: `event-<이름>.webp`
  - 캐릭터 미리보기: `char-bat-f<얼굴번호>.webp`, `char-pitch-f<얼굴번호>.webp`
  - 경기 POV: `pov-bg-<역할>.webp`, `pov-fg-<역할>.webp` (배경 및 투명 누끼)

---

## 3. 오디오 에셋 규격 및 가이드

- **포맷**: 브라우저 호환성을 고려해 **WAV** 또는 **MP3** 포맷을 사용합니다.
- **사양**: 모바일 데이터 및 리소스 절약을 위해 모노(Mono) 채널, 22050Hz 주파수로 최적화합니다.
- **네이밍 규칙**: `bgm-<이름>.wav` (예: `bgm-menu.wav`, `bgm-game.wav`)
