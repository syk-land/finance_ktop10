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
};

export const BGM = {
  menu: { src: "assets/audio/bgm-menu.mp3", loop: true },   // 타이틀/메뉴
  game: { src: "assets/audio/bgm-game.mp3", loop: true },   // 경기(weekly)
};
