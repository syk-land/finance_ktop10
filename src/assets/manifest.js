// 에셋 매니페스트 — 논리 키 → 파일 경로/메타.
//
// 파일이 아직 없어도 게임은 정상 동작한다:
//   - 이미지: 로드 실패 시 images.js 가 fallback(기존 SVG 등)으로 대체
//   - BGM:   파일 없으면 무음
//   - 효과음: 파일 불필요 (audio.js 가 Web Audio 로 합성)
//
// 생성된 에셋을 아래 경로/파일명에 맞춰 넣으면 즉시 반영된다.

export const IMAGES = {
  titleHero:     { src: "assets/img/title-hero.webp",    preload: true },  // 타이틀 — 석양 타자
  eventChampion: { src: "assets/img/event-champion.webp" },               // 우승 트로피 세리머니
  eventHof:      { src: "assets/img/event-hof.webp" },                    // 명예의 전당 헌액
  eventDraft:    { src: "assets/img/event-draft.webp" },                  // 드래프트 입단
  eventIntl:     { src: "assets/img/event-intl.webp" },                   // 국제대회 금메달(대표팀)
  eventAllstar:  { src: "assets/img/event-allstar.webp" },                // 올스타전
  eventMilitary: { src: "assets/img/event-military.webp" },               // 군 입대
  eventTraining: { src: "assets/img/event-training.webp" },               // 특훈/재활
  eventAward:    { src: "assets/img/event-award.webp" },                  // 시상식
  eventInjury:   { src: "assets/img/event-injury.webp" },                 // 부상
  eventRetire:   { src: "assets/img/event-retire.webp" },                 // 은퇴(일반)
  eventDemote:   { src: "assets/img/event-demote.webp" },                 // 강등
  eventFa:       { src: "assets/img/event-fa.webp" },                     // FA 계약
  eventTrade:    { src: "assets/img/event-trade.webp" },                  // 트레이드

  // 캐릭터 생성 미리보기 — 얼굴 6종(avatars FACES) × 포즈 2(타자/투수). 우투/우타 기준, 좌측은 CSS scaleX(-1).
  charBatF1: { src: "assets/img/char-bat-f1.webp" },   charPitchF1: { src: "assets/img/char-pitch-f1.webp" },
  charBatF2: { src: "assets/img/char-bat-f2.webp" },   charPitchF2: { src: "assets/img/char-pitch-f2.webp" },
  charBatF3: { src: "assets/img/char-bat-f3.webp" },   charPitchF3: { src: "assets/img/char-pitch-f3.webp" },
  charBatF4: { src: "assets/img/char-bat-f4.webp" },   charPitchF4: { src: "assets/img/char-pitch-f4.webp" },
  charBatF5: { src: "assets/img/char-bat-f5.webp" },   charPitchF5: { src: "assets/img/char-pitch-f5.webp" },
  charBatF6: { src: "assets/img/char-bat-f6.webp" },   charPitchF6: { src: "assets/img/char-pitch-f6.webp" },

  // 결승 POV — 배경(앞=상대) + 전경 소품(투명 누끼, 내 방망이/던지는팔). 모션은 CSS 리깅.
  povBgBat:  { src: "assets/img/pov-bg-bat.webp" },    povBgPitch:  { src: "assets/img/pov-bg-pitch.webp" },
  povFgBat:  { src: "assets/img/pov-fg-bat.webp" },    povFgPitch:  { src: "assets/img/pov-fg-pitch.webp" },
};

export const BGM = {
  menu: { src: "assets/audio/bgm-menu.wav", loop: true },   // 타이틀/메뉴 (차분)
  game: { src: "assets/audio/bgm-game.wav", loop: true },   // 경기(weekly) (경쾌)
};
