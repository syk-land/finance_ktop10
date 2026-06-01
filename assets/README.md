# assets/ — 바이너리 에셋 (이미지 / 오디오)

게임은 이 폴더의 파일이 **없어도 정상 동작**한다 (이미지=SVG/로고 폴백, BGM=무음, 효과음=Web Audio 합성).
파일을 규약 이름으로 넣으면 **즉시 반영**된다. 매니페스트: `src/assets/manifest.js`.

> ⚠️ **다음 세션 주의 — 아래 "✅ 완료" 에셋은 이미 생성·가공·연결까지 끝났다. 절대 재생성하지 말 것.**
> **결승 POV/캐릭터 16장도 v0.7.4 에서 생성·가공·wiring 완료** (아래 🔲 표는 프롬프트 기록용으로 보존).
> 현재 미생성 신규 에셋 없음.

## ✅ 완료된 에셋 (재생성 금지)
**이미지 14장** (`assets/img/*.webp`, 워터마크 제거+WebP, manifest 등록, 모달 wiring 완료):
`title-hero` · `event-champion` · `event-hof` · `event-draft` · `event-intl` · `event-allstar` ·
`event-military` · `event-training` · `event-award` · `event-injury` · `event-retire` ·
`event-demote` · `event-fa` · `event-trade`

**BGM 2곡** (`assets/audio/*.wav`, 모노 22050Hz, 자동재생 연결): `bgm-menu.wav` · `bgm-game.wav`

**효과음**: 파일 불필요 — `src/assets/audio.js` 합성 (타격/홈런/삼진/클릭 등). 음소거/볼륨은 설정 모달(⚙).

→ 라이브 배포 200 확인 완료. **위 16개 파일은 다시 만들 필요 없음.**

## ✅ 결승 POV / 캐릭터 16장 (v0.7.4 완료 — 재생성 금지)
**총 16장 생성·가공·wiring 완료.** 아래 프롬프트 시트는 **기록·재생성 참고용**으로 보존(다시 만들 필요 없음).
캐릭터 12(`char-bat-f1..f6`/`char-pitch-f1..f6`) + POV 배경 2(`pov-bg-bat`/`pov-bg-pitch`) + POV 전경 누끼 2(`pov-fg-bat`/`pov-fg-pitch`).
- **캐릭터 선택 미리보기 12장**: 얼굴 6종(f1~f6) × 포즈 2종(타자/투수). 3인칭 전신, 얼굴이 보임.
- **결승 POV 4장**: 배경 2(타격/투구) + 전경 소품 2(방망이+손 / 던지는 팔+글러브). 1인칭, 얼굴 안 보임.
- 좌/우타·좌/우투는 **CSS 거울반전(`scaleX(-1)`)** 으로 처리 → 손 종류별 추가 이미지 불필요.

---

## Phase 2 — 프롬프트 시트 (생성용)

생성 후 원본 PNG 를 `gemini_images/` 에 두면, 워터마크 제거 + WebP 축소 후 `assets/img/event-<name>.webp`
로 저장하고 `manifest.js` 키를 추가한다. (가공 절차: `DEVELOPMENT.md` §5.2)

**공통 스타일 접미(모든 이미지 끝에 붙임)** — 기존 9장과 톤 일치:
> `anime/manga style illustration, cel-shaded, vibrant colors, dramatic cinematic lighting, detailed background, high quality, no text, no watermark, portrait 9:16`

### ✅ 부족 이벤트 컷 (완료 — 재생성 금지, 기록용)
| 파일(→키) | 장면 | 프롬프트 (앞부분 + 공통 접미) |
|---|---|---|
| event-injury (eventInjury) | 부상 | `A young Korean baseball player in uniform wincing in pain, clutching his shoulder on the field, an athletic trainer rushing in to help, worried teammates blurred in background, tense dramatic atmosphere` |
| event-retire (eventRetire) | 은퇴 | `A veteran Korean baseball player in his late 30s standing alone on an empty stadium field at dusk, holding his cap to his chest, bittersweet emotional farewell, warm golden sunset, empty stands` |
| event-demote (eventDemote) | 강등 | `A Korean baseball player sitting dejected on the bench in a dim minor-league dugout, head down, gloves beside him, disappointment, cold muted lighting, quiet somber mood` |
| event-fa (eventFa) | FA 계약 | `A Korean baseball player at a press table signing a contract with a pen, confident smile, a new team cap and folded jersey on the table, camera flashes, celebratory professional press conference` |
| event-trade (eventTrade) | 트레이드 | `A Korean baseball player carrying a duffel bag over his shoulder, glancing back at his old stadium while wearing a new team's cap, moving-on mood, overcast evening sky` |

### 🔲 결승 POV / 캐릭터 생성 (TODO — 아직 미생성, 이것만 생성)

> ⚠️ **이 16장은 위 "공통 스타일 접미"의 `portrait 9:16` 을 쓰지 않는다.** 용도별 비율·배경이 다르다.
>
> **공통 스타일 접미(이 16장용, 위 9:16 대신 사용):**
> `anime/manga style illustration, cel-shaded, vibrant colors, dramatic cinematic lighting, high quality, no text, no watermark, no UI, no logos`
> **Negative(피할 것):** `text, watermark, letters, scoreboard numbers, blurry mush, extra limbs, deformed hands, cluttered center, multiple overlapping players blocking the center`

#### (A) 캐릭터 선택 미리보기 — 12장 (3인칭 전신, **portrait 3:4**)
`src/render/character.js` 기본 180×240(3:4). 머리~발 전신 + 헤드룸, **배경은 균일한 무지/그라데이션**(누끼 쉽게).
얼굴 6종은 `src/render/avatars.js` `FACES` 와 1:1 매칭 — 머리모양·액세서리·표정을 그대로 반영해야 선택과 일치한다.
**우타/우투를 기준(canonical)으로 1장씩** 그린다. 좌타·좌투는 코드에서 `scaleX(-1)` 거울반전(미리보기 batting stance 는 hand∈{left,mixed} 일 때 flip).

**포즈 템플릿(아래 {FACE} 자리에 얼굴 설명 삽입 + 공통 접미):**
- 타자 `{BAT}` = `Full-body portrait of a young Korean male baseball batter, {FACE}, clean white home uniform, confident right-handed batting stance holding a wooden bat resting on the shoulder, facing the viewer at a slight three-quarter angle, full body from head to cleats with a little headroom, neutral seamless soft-gradient studio background, even rim lighting, character-select roster-card pose, centered`
- 투수 `{PIT}` = `Full-body portrait of a young Korean male baseball pitcher, {FACE}, clean home uniform, dynamic right-handed wind-up pose with the glove raised at the chest and front leg lifted, facing the viewer at a slight three-quarter angle, full body with a little headroom, neutral seamless soft-gradient studio background, even rim lighting, character-select roster-card pose, centered`

| 얼굴 | {FACE} (머리/액세서리/표정) | 타자 파일(→키) | 투수 파일(→키) |
|---|---|---|---|
| f1 스포츠컷 | `short cropped sporty black hair, bare head, calm composed expression` | char-bat-f1 (charBatF1) | char-pitch-f1 (charPitchF1) |
| f2 헬멧 | `wearing a navy batting helmet, dark hair, sharp intense eyes` | char-bat-f2 (charBatF2) | char-pitch-f2 (charPitchF2) |
| f3 곱슬 | `curly dark-brown hair, bare head, friendly smiling eyes` | char-bat-f3 (charBatF3) | char-pitch-f3 (charPitchF3) |
| f4 캡모자 | `wearing a team baseball cap, black hair, cool calm look` | char-bat-f4 (charBatF4) | char-pitch-f4 (charPitchF4) |
| f5 안경 | `neat short dark hair, wearing sporty glasses, calm gentle eyes` | char-bat-f5 (charBatF5) | char-pitch-f5 (charPitchF5) |
| f6 장발 | `long brown hair, bare head, fierce determined eyes` | char-bat-f6 (charBatF6) | char-pitch-f6 (charPitchF6) |

> 얼굴별 **액세서리(헬멧/캡/안경)는 두 포즈 모두 유지**해 선택한 얼굴과 일치시킨다(투수에 배팅헬멧이 너무 어색하면 캡으로 대체 허용 — 머리/표정으로 식별됨).
> **일관성:** 한 포즈(예: 타자 6장)를 한 세션에 같은 스타일/유니폼/배경/조명으로 몰아 생성해 한 세트처럼 보이게 한다.

#### (B) 결승 POV — 4장 (1인칭, 얼굴 안 보임)
`src/render/finalAnim.js` 씬 viewBox 320×220. **모션은 이미 구현된 엔진**(공 궤적 `animateBall`, 방망이 회전 `swingBat`, 폭죽 `spawnFireworks`)을 재사용 → 일러스트는 그 위에 얹는 **정지**면 되고, 스윙/투구는 CSS 회전 transform 으로 만든다(프레임 시트 불필요).

- **배경 2장 (landscape 3:2, full-bleed):** 공·스트라이크존이 **위에 오버레이**되므로 투수↔홈플레이트 잇는 **중앙 세로 라인을 비워둘 것**. 정중앙 대칭.
- **전경 소품 2장 (square 1:1, 투명/단색 배경):** 화면 하단에 얹는 1인칭 신체부위. **plain solid-color background(예: flat magenta)** 로 생성해 누끼 제거. 우타/우투 기준 1장씩, 좌측은 `scaleX(-1)`.

| 파일(→키) | 장면 / 비율 | 프롬프트 (앞부분 + 공통 접미) |
|---|---|---|
| pov-bg-bat (povBgBat) | 타격 배경(앞=투수) / **3:2 가로** | `First-person batter's-eye background of a packed night baseball stadium, looking out over home plate toward the pitcher's mound straight ahead with a pitcher mid wind-up far in the center, floodlit green grass, dirt base paths, glowing crowd and scoreboard glow, shallow depth of field, centered symmetrical composition with the central lane toward the pitcher kept completely open and uncluttered, no foreground bat or hands` |
| pov-bg-pitch (povBgPitch) | 투구 배경(앞=타자) / **3:2 가로** | `First-person pitcher's-mound background of a night baseball stadium, looking down the lane toward home plate ahead where a batter is set in the box with a crouched catcher and umpire far in the center, infield dirt, foul lines, packed glowing grandstand, shallow depth of field, centered symmetrical composition with the lane toward home plate kept completely open and uncluttered, no foreground arm` |
| pov-fg-bat (povFgBat) | 전경: 방망이+손 / **1:1, 누끼** | `Close-up first-person foreground of a baseball batter's own forearms and gloved hands gripping a wooden bat held up ready to swing, right-handed grip, viewed from the batter's own eyes at the bottom of frame, dynamic readiness, isolated on a plain flat magenta background, no face, no background scenery` |
| pov-fg-pitch (povFgPitch) | 전경: 던지는 팔+글러브 / **1:1, 누끼** | `Close-up first-person foreground of a baseball pitcher's own right throwing arm and glove hand at the moment of release, viewed from the pitcher's own eyes at the bottom of frame, dynamic motion, isolated on a plain flat magenta background, no face, no background scenery` |

> **모션(CSS 리깅, 추가 이미지 0):** povFgBat 은 `swingBat` 처럼 `transform-origin` 을 손 쪽에 두고 rotate 로 스윙. povFgPitch 는 기존 공 release 오버레이에 맞춰 살짝 push/blur. 배경엔 미세 줌/패럴랙스. 좌/우는 `scaleX(-1)`(타격 flip=hand∈{left,mixed}, 투구 flip=hand∈{left,lefty_rb}).
> **스프라이트 시트(프레임 애니)는 비권장** — Gemini 는 정지만 생성, 프레임 간 캐릭터 일관성이 깨져 품질 불가. 진짜 모션은 위 단일 정지 + CSS 변형으로 낸다.
> **생성 팁:** 키당 2~3장 뽑아 중앙이 깨끗하고 톤이 기존 14장과 맞는 것 선택.

### ✅ BGM (완료 — 재생성 금지, 기록용)
| 파일 | 프롬프트 |
|---|---|
| bgm-menu.mp3 | `Calm hopeful theme with soft piano, acoustic guitar and gentle strings, nostalgic and uplifting, Korean baseball coming-of-age drama main menu, seamless loop, instrumental` |
| bgm-game.mp3 | `Upbeat energetic instrumental, light rock and orchestral hybrid with driving percussion, momentum and competitive spirit, baseball game broadcast, seamless loop, instrumental` |
