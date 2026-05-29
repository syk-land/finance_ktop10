# assets/ — 바이너리 에셋 (이미지 / 오디오)

게임은 이 폴더의 파일이 **없어도 정상 동작**한다 (이미지=SVG/로고 폴백, BGM=무음, 효과음=Web Audio 합성).
아래 경로·파일명에 맞춰 파일을 넣으면 **즉시 반영**된다. 매니페스트: `src/assets/manifest.js`.

## 이미지 — `assets/img/`
| 파일명 | 용도 | 권장 스펙 |
|---|---|---|
| `title-hero.png` | 타이틀 화면 대표 일러스트 | 가로형 ~1024×640, 모바일 가독, 텍스트 없이(로고는 위에 덧씀) |
| `event-draft.png` | 특별이벤트 컷 — 드래프트 (예시) | 정사각/세로 ~768, 투명배경 선택 |
| `event-champion.png` | 특별이벤트 컷 — 우승 (예시) | 동상 |

- 포맷: PNG(투명 필요 시) 또는 WebP. 한 장당 가급적 ≤300KB (모바일 데이터).
- 생성: Gemini(Imagen) — 본인 로그인 브라우저에서. 프롬프트 시트는 Phase 2 에서.

## 오디오 — `assets/audio/`
| 파일명 | 용도 | 권장 스펙 |
|---|---|---|
| `bgm-menu.mp3` | 타이틀/메뉴 BGM (루프) | 30~60s 루프, 차분, ≤1MB |
| `bgm-game.mp3` | 경기(weekly) BGM (루프) | 30~60s 루프, 경쾌, ≤1MB |

- 효과음(타격/홈런/삼진/클릭)은 파일 불필요 — `src/assets/audio.js` 가 합성.
- BGM 생성: MusicFX / Lyria (labs.google) — Gemini 챗 아님. 막히면 CC0 무료음원.
- 음소거/볼륨: 설정 모달(⚙) 에서 조절.

---

## Phase 2 — 프롬프트 시트 (생성용)

생성 후 원본 PNG 를 `gemini_images/` 에 두면, 워터마크 제거 + WebP 축소 후 `assets/img/event-<name>.webp`
로 저장하고 `manifest.js` 키를 추가한다. (가공 절차: `DEVELOPMENT.md` §5.2)

**공통 스타일 접미(모든 이미지 끝에 붙임)** — 기존 9장과 톤 일치:
> `anime/manga style illustration, cel-shaded, vibrant colors, dramatic cinematic lighting, detailed background, high quality, no text, no watermark, portrait 9:16`

### 부족 이벤트 컷 (Gemini / Imagen, 세로 9:16)
| 파일(→키) | 장면 | 프롬프트 (앞부분 + 공통 접미) |
|---|---|---|
| event-injury (eventInjury) | 부상 | `A young Korean baseball player in uniform wincing in pain, clutching his shoulder on the field, an athletic trainer rushing in to help, worried teammates blurred in background, tense dramatic atmosphere` |
| event-retire (eventRetire) | 은퇴 | `A veteran Korean baseball player in his late 30s standing alone on an empty stadium field at dusk, holding his cap to his chest, bittersweet emotional farewell, warm golden sunset, empty stands` |
| event-demote (eventDemote) | 강등 | `A Korean baseball player sitting dejected on the bench in a dim minor-league dugout, head down, gloves beside him, disappointment, cold muted lighting, quiet somber mood` |
| event-fa (eventFa) | FA 계약 | `A Korean baseball player at a press table signing a contract with a pen, confident smile, a new team cap and folded jersey on the table, camera flashes, celebratory professional press conference` |
| event-trade (eventTrade) | 트레이드 | `A Korean baseball player carrying a duffel bag over his shoulder, glancing back at his old stadium while wearing a new team's cap, moving-on mood, overcast evening sky` |

### 결승 POV / 캐릭터 생성 (다음 단계, 애니메이션 검토)
| 파일(→키) | 장면 | 프롬프트 (앞부분 + 공통 접미) |
|---|---|---|
| pov-bat (povBat) | 타석 POV | `First-person batter's box point of view in a baseball stadium, pitcher winding up on the mound ahead, catcher and umpire framing, tense at-bat moment` |
| pov-pitch (povPitch) | 마운드 POV | `First-person pitcher's mound point of view, looking toward home plate, batter set in the box and catcher giving signs, stadium crowd behind` |
| char-batter (charBatter) | 생성-타자 | `Full-body Korean baseball player in batting stance with bat, clean studio background, character select pose, confident` |
| char-pitcher (charPitcher) | 생성-투수 | `Full-body Korean baseball player in pitching wind-up pose, clean studio background, character select pose` |

> 애니메이션: Gemini는 정지뿐. 1순위 = 정지 이미지 + CSS 미세 모션(줌/흔들림). 타격 폼은 스프라이트 시트(프레임 여러 장 → CSS steps()) 검토. 상세는 `.claude/handoff.md`.

### BGM (MusicFX / Lyria, 루프 ≤1MB)
| 파일 | 프롬프트 |
|---|---|
| bgm-menu.mp3 | `Calm hopeful theme with soft piano, acoustic guitar and gentle strings, nostalgic and uplifting, Korean baseball coming-of-age drama main menu, seamless loop, instrumental` |
| bgm-game.mp3 | `Upbeat energetic instrumental, light rock and orchestral hybrid with driving percussion, momentum and competitive spirit, baseball game broadcast, seamless loop, instrumental` |
