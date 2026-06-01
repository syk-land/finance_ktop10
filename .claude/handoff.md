# 인계 문서 — 이미지/사운드 에셋 작업 (다음 세션 이어가기용)

> 마지막 갱신: 2026-06-01 (이슈 A — BGM 백그라운드 pause + 이슈 B — 멘탈/스태미나 실질화 수정 세션). 이 문서만 읽으면 이어서 진행 가능하도록 정리.
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
- 원본 `gemini_images/`(70MB)·`aibgm/` 는 .gitignore (가공본만 커밋).
- ✅ **현재 에셋(이미지 14 + BGM 2 + 합성 효과음)은 전부 생성·연결·배포 완료.** 라이브 200 확인.

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

## 진행 메모 (v0.7.1 fix — 이번 세션)
- 배포: firebase.json ignore 에서 `assets/**` 제거(→ 이미지·BGM 배포). 원본 폴더는 ignore.
- 오디오: 효과음 suspended-resume + 모든 버튼 클릭음. 모달 통과클릭 전역 가드(main.js).
- 콜업: 같은 구단 유지(teamForStageKeeping) + 콜업 모달(showPromotionModal). 휴식기 타이틀 프로=나이.

## ✅ 결승 POV / 캐릭터 생성 이미지 + 애니메이션 — 완료 (v0.7.4, 2026-06-01)

**완료:** ① 결승 POV 씬 ② 캐릭터 생성 미리보기를 Gemini 일러스트 16장으로 교체 + CSS 리깅 모션. 에셋 없으면 SVG 폴백.
**에셋 16장:** 캐릭터 12(6얼굴×2포즈, `char-bat/pitch-f1..f6`) + POV 4(배경 `pov-bg-bat/pitch` + 전경 누끼 `pov-fg-bat/pitch`).
구현 상세는 README v0.7.4. **시각 렌더(전경 크기/위치·스윙 모양)는 브라우저 실기 확인만 남음**(샌드박스 브라우저 부재).
아래는 당시 작업 명세(보존).

**대상 코드:**
- POV: `src/render/finalAnim.js` `createPOVScene(mode)` — 현재 SVG(타석/마운드). `playPitch(ev)`가 프레임 호출.
- 캐릭터 생성: `src/views/menu.js` `renderPreview()` — 현재 `createCharacterSVG(faceId,hand,...)`.

**생성 프롬프트:** `assets/README.md` "🔲 결승 POV / 캐릭터 생성" 표 — **총 16장**으로 확정(아래).
사용자가 본인 Chrome 의 Gemini 로 생성 → `gemini_images/` → 워터마크 제거+WebP(§DEVELOPMENT 5.2) → `assets/img/` → manifest 키.

**확정된 에셋 구성 (16장):**
- **(A) 캐릭터 선택 미리보기 12장** = 얼굴 6종(f1~f6, `avatars.js` FACES 와 1:1) × 포즈 2(타자/투수). 3인칭 전신 portrait 3:4.
  좌/우타·좌/우투는 코드 `scaleX(-1)` 거울반전 → 우타·우투 기준 1장씩만 생성. 키: `charBatF1`..`charBatF6`, `charPitchF1`..`charPitchF6`.
- **(B) 결승 POV 4장** = 배경 2(`povBgBat`/`povBgPitch`, landscape 3:2, 중앙 비움) + 전경 소품 2(`povFgBat` 방망이+손/`povFgPitch` 던지는팔+글러브, 1:1 누끼).
  **1인칭이라 얼굴 안 보임 → POV 는 6얼굴 매트릭스와 무관.**

**진행 순서:**
1. 프롬프트로 16장 생성 → 가공(누끼는 단색배경 키잉) → manifest 등록(위 키).
2. **정지 교체(1순위)**: `renderPreview()` 가 `createImage("charBat"+faceId)`(폴백=기존 `createCharacterSVG`), `createPOVScene` 가 배경/전경 이미지(폴백=기존 SVG). `createImage` 패턴 재사용.
3. **모션(CSS 리깅, 추가 이미지 0)**: POV 모션 엔진(`animateBall`/`swingBat`/`spawnFireworks`)은 그대로. povFgBat 은 `transform-origin` 손쪽 + rotate 로 스윙, povFgPitch 는 release 에 맞춰 push, 배경 미세 줌/패럴랙스. 좌/우는 `scaleX(-1)`(타격 flip=hand∈{left,mixed}, 투구 flip=hand∈{left,lefty_rb}).
4. 캐릭터 미리보기: 정지 + 선택적 idle 미세 흔들림. 좌타 flip=hand∈{left,mixed}.

**애니메이션 결론:** Gemini=정지만. **단일 정지 + CSS 변형(회전/패럴랙스)으로 진짜 스윙·투구 모션을 낸다(권장).**
스프라이트 시트(프레임 여러 장)는 **비권장** — Gemini 가 프레임 간 캐릭터 일관성을 못 지켜 품질 불가. 영상생성(Veo 등)=용량·난도↑ 보류.

## 🐛 미해결 버그 / 설계 이슈 (이번 세션 감사 — 코드 미변경, 방향 미정)

> 사용자 보고 2건을 코드에서 추적해 원인 확정. **설계 결정이 필요해 아직 코드는 안 고침.** 아래는 다음 세션이
> 바로 착수할 수 있게 원인·후보 수정·미정 결정을 정리한 것. (이번 세션에 시도했던 클램프 헬퍼는 방향 미정이라 되돌림.)

### 이슈 A — BGM 이 안 멈춤 (안드로이드 백그라운드) — ✅ 수정 완료 (실기 검증 대기)
- **증상:** "노래가 안 끝난다. 브라우저를 꺼도 안 끝난다." (타깃=안드로이드 portrait)
- **원인:** `src/assets/audio.js` 의 BGM 은 `<audio>` 엘리먼트(파일 재생). 모바일 브라우저는 **앱을 백그라운드로
  보내도 `<audio>` 재생을 계속**한다. 코드에 `visibilitychange`/`pagehide` 핸들러가 없어 화면이 가려져도
  `pause` 가 안 걸림. **서비스워커는 없음**(별개 원인 아님).
- **수정:** `initAudioUnlock()` 에 핸들러 추가 — `visibilitychange`(hidden→`currentBgm.el.pause()` / visible→재생),
  `pagehide`→pause, `pageshow`→재생. 복귀 재생은 `unlocked && !isMuted()` 일 때만. `currentBgm` 은 유지해
  멈춘 `currentTime` 부터 이어 재생(stopBgm 과 달리 리셋 안 함). unlock 핸들러와 달리 self-removing 아님(세션 내내 유지).
- **검증:** `node --check` 통과. **실기 검증 대기** — 안드로이드 실기/크롬 모바일에서 BGM 재생 중 홈 버튼 →
  소리 멈추는지. PC 는 탭 전환으로 대용 확인. (샌드박스는 audio 백그라운드 거동 재현 불가.)

### 이슈 B — 멘탈·스태미나가 경기에 무영향 — ✅ 수정 완료 (v0.7.3, 2026-06-01)
> 사용자 결정: "클램프"가 아니라 **10개 능력치 전부에 실제 경기 기능 부여**(파워=장타, 주루=도루율 식).
> 감사 결과 타자5+투수3은 이미 효과 있었고 빠진 건 `pitcher.mental`·`pitcher.stamina` 2개뿐 →
> 둘에 아래처럼 실제 at-bat 역할 부여. (멘탈=투수 전용 스탯이라 클러치=투수 위기관리로 구현.)
> 구현/검증은 README v0.7.3 changelog 참조. 아래는 당시 원인 분석 기록(보존).
- **증상:** 멘탈 능력치가 나머지보다 100 이상 높게 표시됨.
- **직접 원인:** `pitcher.mental` 이 **투구와 무관한** 이벤트로 과도하게 누적 → 타자형은 나머지 투수 스탯이
  시작값(~50)에 머무는데 멘탈만 캡(150)까지 솟음. 누적 출처:
  - 휴식기 매년 +3 (`offseason.js:82` rest.base — 역할 무관 무조건), 대표팀/국제대회 +3 (`offseason.js:94,107`)
  - 군 복무 +3~5 (`military.js:24~36`), 결승 우승 전체 +3·MVP +5·준우승 +5 (`finals.js:217,221,225`)
  - 마일스톤(노히터 등) (`milestones.js:126`), 매 경기 +0.05~0.30 (`player.js:555,566,569`, 단 등판 시만)
- **왜 단순 표시 문제가 아닌가:** 멘탈은 `pitcherOVR`(`simulator.js:522`, `player.js:616/626`)에 들어가고,
  이 OVR 이 **종합점수(`overallScore` 0.6타+0.4투)·대표팀 선발(`nationalTeamRating`)·투수 등판확률(코치판단)·
  라인업 슬롯**에 쓰인다. → 멘탈 폭주가 타자형의 OVR/선발/등판을 부풀린다.

- **★ 더 근본 문제 (능력치 영향도 감사 결과):** 시뮬레이터 전수 조사 결과 **10개 능력치 중 8개만 실제 경기
  계산에 쓰이고, 멘탈·투수 스태미나(능력치)는 한 구 한 구 결과(at-bat)에 직접 안 쓰인다.**

  | 능력치 | 경기 계산 사용 | 위치 |
  |---|---|---|
  | contact | ✅ 삼진/안타/실책유발 | `simulateAtBat` `classifyOut` |
  | power | ✅ 홈런·2루타·희생플라이 | `simulateAtBat` `classifyOut` |
  | eye | ✅ 볼넷·삼진회피 | `simulateAtBat` |
  | speed | ✅ 도루·병살회피·주루·대주자 | `attemptSteal` `classifyOut` 외 |
  | defense | ✅ 수비 시 실책 방지 | `classifyOut` |
  | velocity | ✅ 구위(컨택억제)·홈런억제 | `simulateAtBat` (stuffAvg) |
  | control | ✅ 볼넷·사구·도루 억제 | `simulateAtBat` `attemptSteal` |
  | breaking | ✅ 구위(컨택억제) | `simulateAtBat` (stuffAvg) |
  | **stamina(능력치)** | ✅ **(v0.7.3 해결)** 인게임 피로 | `simulateAtBat` — 누적 PA가 용량(`18+(stamina-50)*0.18`) 초과 시 구위·제구 −최대12. 강판 임계 용량연동(`shouldReplacePitcher`). |
  | **mental** | ✅ **(v0.7.3 해결)** 클러치 | `simulateAtBat` — 고압 leverage 비례로 피안타·피홈런·볼넷 억제. 평상시 무영향. |

  (※ `player.stamina` *자원*(현재치)은 fatigueMod 로 경기에 영향. 위 표의 ❌는 `pitcher.stamina` *능력치*.)

- **채택한 결정 (v0.7.3):** 위 2안 + 스태미나 실질화를 합친 형태로 구현. `simulateAtBat` 에 leverage(클러치)·
  pitcherPA(피로) 컨텍스트 전달, `shouldReplacePitcher` 강판 임계를 스태미나 용량 연동. 스태미나 50·평상시엔
  기존과 동일(베이스라인 보존), 고스태미나/고멘탈·후반접전일수록 효과↑. 상세는 README v0.7.3.
- **(참고) 당시 검토했던 대안 (미채택):**
  1. **클램프만(최소):** 멘탈 폭주/OVR·대표팀 왜곡만 차단(멘탈이 나머지 투수스탯 평균+마진 못 넘게 상한),
     능력치가 '장식성'인 점은 문서에 명시. → 가장 작음.
  2. **멘탈에 실제 경기 역할 부여:** 클러치(결승/끝내기/고리프) 상황에서 멘탈↑ → 호투/타격 확률 가산,
     대량실점 확률 감소 등. → at-bat 에 상황 컨텍스트 + 멘탈 항 추가(범위 큼, 밸런스 재검증).
  3. **멘탈+스태미나 둘 다 실질화:** 멘탈=클러치/멘탈붕괴 방지, 스태미나(능력치)=투수 지구력/강판 임계 연동.
     → 가장 큼, `probe-regression.mjs`/`probe-career.mjs` 재밸런싱 필요.

## 📋 앞으로 해야 할 개발 예정 (백로그 — 우선순위순)

| # | 항목 | 범위 | 상태 |
|---|---|---|---|
| 1 | ~~결승 POV / 캐릭터 생성 이미지 + 애니메이션~~ | 중 | ✅ 완료 (v0.7.4, 실기 시각확인 대기) |
| 2 | **이슈 A — BGM 안드로이드 백그라운드 pause** | 소 | ✅ 수정 완료 (실기 검증 대기) |
| 3 | ~~이슈 B — 멘탈/스태미나 능력치 실질화~~ | 소~대 | ✅ 완료 (v0.7.3) |
| 4 | (선택) 이벤트 컷 14장 실제 표시 브라우저 확인 | 소 | 선택 |
| 5 | (선택) BGM ffmpeg mp3(≈400KB) 경량화 | 소 | 선택 |
| 6 | (선택) `tools/gen-assets.mjs` 본인 PC Playwright 자동 생성 | 중 | 선택 |

## 다음 세션 시작 시 할 일 (우선순위)
1. ~~결승 POV / 캐릭터 생성 이미지 + 애니메이션~~ — ✅ 완료(v0.7.4). **브라우저 실기 시각확인만 남음**:
   캐릭터 생성창 미리보기에 얼굴별 일러스트가 뜨는지, 결승 라이브에서 POV 배경/전경·스윙 모션이 정상인지.
   특히 **전경 소품(povFg) 크기/위치(width 62%·bottom)**·스윙 회전각은 실제 보고 미세조정 필요할 수 있음(`finalAnim.js`).
2. ~~이슈 A (BGM 안드로이드 백그라운드 pause)~~ — ✅ 수정 완료(2026-06-01). 안드로이드 실기 검증만 남음.
3. ~~이슈 B (멘탈/스태미나 실질화)~~ — ✅ 완료(v0.7.3). 10개 능력치 전부 경기 효과.
4. (선택) 기존 이벤트 컷 14장 브라우저로 실제 표시 확인 (도달이 길어 상태 주입 필요).
5. (선택) BGM 을 ffmpeg 로 mp3(≈400KB)로 더 경량화.
6. (선택) `tools/gen-assets.mjs` — 본인 PC Playwright persistentContext 자동 생성 스크립트.

## 개발 환경 메모 (브라우저 검증)
- 이 샌드박스 브라우저는 **`ignoreHTTPSErrors:true`** 면 외부 사이트 접근 가능(인증서 가로채기 회피).
  단 **구글 로그인은 불가** (계정 인증/봇차단). 그래서 에셋 생성은 경로 2(본인 PC).
- 로컬 검증: `python3 -m http.server 8765` + `npm install --no-save playwright@1.60.0` 후
  Playwright 로 `firebasejs` 라우트를 빈 스텁으로 가로채면 오프라인 구동 가능
  (Firebase가 외부 CDN 의존이라 그대로면 모듈 로드 실패). 검증 후 `node_modules` 제거.
- `node probe.mjs` / `node probe-career.mjs` 로 시뮬 회귀 확인.
