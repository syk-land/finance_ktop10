// 시즌 중 (in-season) 이벤트 일반화 메커니즘
//
// 사용 케이스:
//   - 청소년 세계대회 (현재는 휴식기 카테고리지만, 시즌 중으로 이동 가능)
//   - 프로 시즌 중 올스타전 (7월)
//   - 올림픽 (4년 주기, 시즌 중단)
//   - WBC (3-4년 주기, 시즌 전 또는 중)
//   - 아시안게임 (4년 주기)
//
// 흐름:
//   1. 매 주 endWeek 후 checkScheduledEvents 호출
//   2. 트리거 만족하는 이벤트 →
//        type="toast"  : apply(player) 즉시 실행 + pushToast
//        type="modal"  : state.pendingEvents 큐에 적재 → UI 처리
//   3. UI 가 pendingEvents 첫 항목을 처리 (모달) → 처리 후 큐에서 제거
//
// 같은 이벤트 중복 발동 방지: player.processedEvents[year-key] = true.

import { state, pushToast } from "../state.js";
import { t } from "../i18n/index.js";
import { BATTER_STATS, PITCHER_STATS, getPlayerStatCap } from "./player.js";
import { simulateGame } from "./simulator.js";
import { createRoster } from "./npc.js";
import { getPlayerTeam } from "./league.js";

const STAT_MIN = 20;

function bumpAll(player, delta) {
  const cap = getPlayerStatCap(player);
  for (const s of BATTER_STATS) {
    if (player.batter[s] === undefined) continue;
    player.batter[s] = +Math.max(STAT_MIN, Math.min(cap, player.batter[s] + delta)).toFixed(1);
  }
  for (const s of PITCHER_STATS) {
    if (player.pitcher[s] === undefined) continue;
    player.pitcher[s] = +Math.max(STAT_MIN, Math.min(cap, player.pitcher[s] + delta)).toFixed(1);
  }
}
function bump(player, group, stat, delta) {
  const cap = getPlayerStatCap(player);
  if (player[group]?.[stat] === undefined) return;
  player[group][stat] = +Math.max(STAT_MIN, Math.min(cap, player[group][stat] + delta)).toFixed(1);
}
function fameUp(player, delta) {
  player.fame = (player.fame ?? 0) + delta;
}

// 프로 단계 (KBO 1군/MLB) — 대표팀 선출 조건 공통
function isProStage(stage) {
  return stage === "pro1" || stage === "mlb";
}

// 등록된 이벤트 카탈로그.
// type="toast" 는 apply 즉시 실행 + 토스트.
// type="modal" 은 큐에 적재 → UI 가 별도 모달 처리.
export const SEASON_EVENTS = [
  // 올스타전 — KBO/MLB, 7월 중순. 명성 50+. 휴식기 대체 X (단발 출전).
  // 라이브 모달 — 보상은 모달 종료 후 UI 가 applyAllStarReward 호출.
  {
    key: "all_star",
    type: "modal",
    handlerKey: "allStarLive",
    canReplaceOffseason: false,
    trigger(player, gameDate) {
      return (player.stage === "pro1" || player.stage === "mlb")
        && gameDate.month === 7
        && gameDate.dayOfMonth >= 8 && gameDate.dayOfMonth <= 18
        && (player.fame ?? 0) >= 50;
    },
  },

  // 올스타전 보상 — UI 가 라이브 모달 종료 후 호출.
  // (apply 가 SEASON_EVENTS 의 일부가 아니라 별도 export 함수로 빼서 모달 종료 시점에 부여)

  // WBC — 4년 주기, 3월 초. KBO/MLB. 명성 60+. 라이브 모달.
  {
    key: "wbc",
    type: "modal",
    handlerKey: "intlTournamentLive",
    canReplaceOffseason: true,
    trigger(player, gameDate) {
      return (player.stage === "pro1" || player.stage === "mlb")
        && gameDate.month === 3
        && gameDate.dayOfMonth <= 14
        && gameDate.year % 4 === 2
        && (player.fame ?? 0) >= 60;
    },
    apply(player) {
      fameUp(player, 15);
      bumpAll(player, 1);
      bump(player, "pitcher", "mental", 3);
    },
  },

  // 올림픽 — 4년 주기 짝수년, 7-8월. KBO/MLB. 동메달 이상이면 병역 면제.
  {
    key: "olympics",
    type: "modal",
    handlerKey: "intlTournamentLive",
    canReplaceOffseason: true,
    trigger(player, gameDate) {
      return isProStage(player.stage)
        && (gameDate.month === 7 || gameDate.month === 8)
        && gameDate.year % 4 === 0
        && (player.fame ?? 0) >= 70;
    },
    apply(player) {
      fameUp(player, 20);
      bumpAll(player, 2);
      bump(player, "pitcher", "mental", 4);
    },
  },

  // 아시안게임 — 4년 주기 (올림픽 사이), 9월. KBO. 금메달이면 병역 면제.
  {
    key: "asian_games",
    type: "modal",
    handlerKey: "intlTournamentLive",
    canReplaceOffseason: true,
    trigger(player, gameDate) {
      return player.stage === "pro1"
        && gameDate.month === 9
        && gameDate.dayOfMonth <= 14
        && gameDate.year % 4 === 2
        && (player.fame ?? 0) >= 50;
    },
    apply(player) {
      fameUp(player, 12);
      bumpAll(player, 1);
      bump(player, "pitcher", "mental", 3);
    },
  },

  // 프리미어12 — 4년 주기, 11월. 면제 X.
  {
    key: "premier12",
    type: "modal",
    handlerKey: "intlTournamentLive",
    canReplaceOffseason: true,
    trigger(player, gameDate) {
      return isProStage(player.stage)
        && gameDate.month === 11
        && gameDate.year % 4 === 3
        && (player.fame ?? 0) >= 50;
    },
    apply(player) {
      fameUp(player, 10);
      bumpAll(player, 1);
    },
  },
];

// 매 endWeek 후 호출 — 발동 조건 만족하는 이벤트를 처리.
// 같은 이벤트는 같은 연도에 한 번만 발동.
export function checkScheduledEvents(player, gameDate) {
  if (!player || !gameDate) return;
  player.processedEvents = player.processedEvents ?? {};
  if (!state.pendingEvents) state.pendingEvents = [];

  for (const ev of SEASON_EVENTS) {
    const seasonKey = `${gameDate.year}-${ev.key}`;
    if (player.processedEvents[seasonKey]) continue;
    if (!ev.trigger(player, gameDate)) continue;
    player.processedEvents[seasonKey] = true;

    if (ev.type === "toast") {
      if (ev.apply) ev.apply(player);
      // 시즌 휴식기를 이 대회로 대체 — offseason.js 가 player.pendingTournament 를 읽고 분기
      if (ev.canReplaceOffseason) {
        player.pendingTournament = { key: ev.key, year: gameDate.year };
      }
      if (ev.toastKey) pushToast(t(ev.toastKey), "good");
    } else if (ev.type === "modal") {
      state.pendingEvents.push({
        key: ev.key,
        type: ev.type,
        handlerKey: ev.handlerKey,
        year: gameDate.year,
      });
    }
  }
}

// UI 가 큐에서 첫 이벤트 꺼냄. 처리는 UI 측의 핸들러 매핑이 담당.
export function nextPendingEvent() {
  if (!state.pendingEvents || state.pendingEvents.length === 0) return null;
  return state.pendingEvents[0];
}

export function clearPendingEvent() {
  if (state.pendingEvents && state.pendingEvents.length > 0) {
    state.pendingEvents.shift();
  }
}

// 올스타전 출장 보상 — 라이브 모달 종료 시 UI 가 호출.
export function applyAllStarReward(player) {
  fameUp(player, 8);
  bump(player, "pitcher", "mental", 2);
  bump(player, "batter", "eye", 1);
}

// 국제대회 (WBC/올림픽/아시안게임/프리미어12) 보상 부여 + 휴식기 대체 효과.
// 라이브 모달 종료 시 UI 가 호출.
export function applyIntlTournamentReward(player, eventKey, year) {
  const ev = SEASON_EVENTS.find(e => e.key === eventKey);
  if (!ev) return;
  if (ev.apply) ev.apply(player);
  // canReplaceOffseason 면 휴식기에서 intl_tournament 카테고리로 대체 (offseason.js 가 읽음)
  if (ev.canReplaceOffseason) {
    player.pendingTournament = { key: eventKey, year };
  }
}

// 국제대회 단판 라이브 시뮬레이션 — 대표팀 vs 상대국 대표팀.
// 양 팀 모두 stage cap 의 95% 강도 (국대급).
export function simulateIntlTournamentGame(player, league) {
  const baseStage = player.stage === "mlb" ? "mlb" : "pro1";
  const ageRange = [22, 36];
  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;

  const eliteStrength = 95;
  const myNational = {
    id: -400,
    name: t("seasonEvent.intlMyTeamName"),
    strength: eliteStrength,
    roster: createRoster(eliteStrength, ageRange, { stage: baseStage }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: true,
  };
  const oppNational = {
    id: -401,
    name: t("seasonEvent.intlOppTeamName"),
    strength: eliteStrength,
    roster: createRoster(eliteStrength, ageRange, { stage: baseStage }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: false,
  };
  const tempLeague = {
    stage: baseStage === "mlb" ? "mlb_final" : "pro1_final",
    teams: [myNational, oppNational],
    schedule: [],
    weeksPerSeason: 1,
    gamesPerWeek: 1,
  };
  const gameDef = { home: myNational.id, away: oppNational.id };
  return simulateGame(tempLeague, gameDef, player);
}

// 올스타전 단판 시뮬레이션.
// 주인공은 자기 팀 베이스 + 양쪽 올스타 NPC 로 구성된 임시 매치업에 참여.
// 단계 cap 90% 수준의 강한 양 팀을 만들어 화려한 경기.
export function simulateAllStarGame(player, league) {
  const baseStage = player.stage === "mlb" ? "mlb" : "pro1";
  const ageRange = baseStage === "mlb" ? [22, 38] : [22, 36];
  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;

  const allStarStrength = 90;  // 올스타급 — 일반 팀(70) 대비 매우 강함
  const myAllStars = {
    id: -300,
    name: baseStage === "mlb" ? "League All-Stars" : t("seasonEvent.allStarMyTeamName"),
    strength: allStarStrength,
    roster: [
      // 본인 + NPC 올스타 채우기. 본인이 라인업/마운드에 들어가는 건 simulator 가 처리.
      ...createRoster(allStarStrength, ageRange, { stage: baseStage }),
    ],
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: true,
  };
  const oppAllStars = {
    id: -301,
    name: baseStage === "mlb" ? "Opposing All-Stars" : t("seasonEvent.allStarOppTeamName"),
    strength: allStarStrength,
    roster: createRoster(allStarStrength, ageRange, { stage: baseStage }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: false,
  };

  const allStarLeague = {
    stage: baseStage === "mlb" ? "mlb_final" : "pro1_final",
    teams: [myAllStars, oppAllStars],
    schedule: [],
    weeksPerSeason: 1,
    gamesPerWeek: 1,
  };
  // 임시: 주인공의 gamesSinceLastPitch 가 0(피로) 일 수 있어 코치판단/휴식 굴림으로 등판 안 할 수도.
  // 출장 안 해도 모달은 라이브로 진행.
  const gameDef = { home: myAllStars.id, away: oppAllStars.id };
  return simulateGame(allStarLeague, gameDef, player);
}
