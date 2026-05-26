// 토너먼트 결승전 시스템
//
// 흐름:
//   1. endWeek 호출 시 그 주에 토너먼트 end 가 포함되어 있으면 결승 진출 굴림
//   2. 진출 시 state.pendingFinal = { tournamentKey, opponent, status: "announce" }
//   3. UI 가 모달로 띄움 — phase: announce → playing → result
//   4. result 후 보상 적용 (우승/준우승) + pendingFinal = null
//
// 결승 진출 확률: 사용자 팀 strength + 메인 캐릭터 OVR + 토너먼트 난이도 보정.
// 토너먼트별로 시즌당 한 번만 굴림 (state.pendingFinal.processedWeek 로 중복 방지).

import { HIGH_SCHOOL_TOURNAMENTS } from "../data/tournaments.js";
import { getPlayerTeam } from "./league.js";
import { createRoster } from "./npc.js";
import { simulateGame } from "./simulator.js";
import { overallScore, BATTER_STATS, PITCHER_STATS } from "./player.js";
import { state, pushToast } from "../state.js";
import { t } from "../i18n/index.js";

const STAT_CAP = 150;
const STAT_MIN = 20;

// 그 주 (3월의 N번째 주 ~) 에 end 가 포함된 토너먼트 — 결승전 시점
function tournamentsEndingThisWeek(gameDate, weeksPerSeason, weekIndex) {
  // 게임 캘린더는 시즌 시작 = 3월 1일. 매 tick 마다 dayOfMonth/month 갱신.
  // weekIndex 가 진행 중인 주차. endWeek 직후 호출되는 시점이라 gameDate 는
  // 다음 주 시작 직전 ~ 약간 후. 안전하게 현재 month/dayOfMonth 의 +- 7일 범위에 대회 end 가 있는지 본다.
  if (!gameDate) return [];
  const today = gameDate.month * 100 + gameDate.dayOfMonth;
  return HIGH_SCHOOL_TOURNAMENTS.filter(tn => {
    if (tn.type !== "tournament") return false; // 결승은 토너먼트만 (주말리그는 제외)
    const e = tn.end[0] * 100 + tn.end[1];
    // end 가 지난 7일 ~ 향후 0일 범위 = 이번 주에 종료
    return today >= e - 7 && today <= e + 1;
  });
}

// 결승 진출 확률 (0~1)
function advanceProbability(player, league) {
  const myTeam = getPlayerTeam(league);
  const teamStrength = myTeam?.strength ?? 50;
  const playerOVR = overallScore(player);
  // 팀(60% 비중) + 선수(40% 비중) 의 합 / 200 → 0~0.7 정도
  const score = (teamStrength * 0.6 + playerOVR * 0.4) / 100;
  return Math.max(0.05, Math.min(0.55, score));
}

// 가상의 결승전 상대 팀 생성 — 결승까지 올라온 강팀
function makeOpponentTeam(myTeamStrength, opponentSeed) {
  const baseStr = Math.max(60, myTeamStrength + (opponentSeed === "strong" ? 10 : 5));
  return {
    id: -100,
    name: opponentSeed === "strong" ? "라이벌 고등학교" : "지역 강호고",
    region: "기타",
    strength: baseStr,
    roster: createRoster(baseStr, [16, 18]),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: false,
  };
}

// 결승 진출 굴림 — 이번 주 종료되는 토너먼트마다 체크. 진출하면 첫 번째만 처리.
// player.lastFinalCheckWeek 로 중복 방지.
export function checkFinalAdvance(player, league, season, gameDate) {
  if (!player || !league || !season || !gameDate) return null;
  player.processedFinals = player.processedFinals ?? {};

  const list = tournamentsEndingThisWeek(gameDate, league.weeksPerSeason, season.weekIndex);
  for (const tn of list) {
    const seasonId = `${gameDate.year}-${tn.key}`;
    if (player.processedFinals[seasonId]) continue;       // 이미 처리한 시즌×대회
    player.processedFinals[seasonId] = true;

    if (Math.random() < advanceProbability(player, league)) {
      // 결승 진출!
      const myStrength = getPlayerTeam(league)?.strength ?? 60;
      const opponent = makeOpponentTeam(myStrength, "strong");
      return {
        tournamentKey: tn.key,
        opponent,
        status: "announce",   // announce → playing → result
        result: null,
      };
    } else {
      // 진출 실패 — 토스트 + 기록
      pushToast(t("weekly.finalLoss", { tournament: t("tournament." + tn.key) }), "info");
      pushTournamentRecord(player, tn.key, "eliminated", false);
    }
  }
  return null;
}

// 결승 진출했을 때 메인 캐릭터 성적이 MVP 기준을 만족하는지
function checkMVP(result) {
  const mp = result?.mainPlayer;
  if (!mp) return false;
  const b = mp.batterBox;
  const p = mp.pitcherBox;
  // 타자 호조건: 2안타 이상 또는 홈런 1개 이상
  if (b?.pa > 0 && (b.h >= 2 || b.hr >= 1)) return true;
  // 투수 호조건: 자책점 1 이하 + 탈삼진 5 이상
  if (p && (p.er ?? 0) <= 1 && (p.pK ?? 0) >= 5) return true;
  return false;
}

// 대회 기록 누적 (player.tournamentHistory)
function pushTournamentRecord(player, tournamentKey, result, mvp) {
  player.tournamentHistory = player.tournamentHistory ?? [];
  player.tournamentHistory.push({
    year:  state.gameDate?.year ?? null,
    grade: player.grade,
    tournamentKey,
    result,    // "champion" | "runner" | "eliminated"
    mvp,
  });
  // 메모리 폭발 방지 (커리어 누적 시 ~50 시즌 * 5 대회 = 250 → 안전)
  if (player.tournamentHistory.length > 400) {
    player.tournamentHistory.shift();
  }
}

// 결승전 9이닝 시뮬레이션
export function simulateFinal(player, league, opponent) {
  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;

  // 임시 league-like 객체로 simulateGame 호출
  const finalLeague = {
    stage: "high_final",
    teams: [myTeam, opponent],
    schedule: [],
    weeksPerSeason: 1,
    gamesPerWeek: 1,
  };
  const gameDef = { home: myTeam.id, away: opponent.id };
  return simulateGame(finalLeague, gameDef, player);
}

// 우승/준우승 보상 적용. changes[] + mvp 여부 반환.
// tournamentKey 가 주어지면 player.tournamentHistory 에 기록도 누적.
export function applyFinalReward(player, result, tournamentKey = null) {
  const my = result?.home?.team?.isPlayerTeam ? result.home : result.away;
  const opp = my === result.home ? result.away : result.home;
  const won = result.winner && result.winner === my.team.name;
  const mvp = won && checkMVP(result);

  const changes = [];
  function bump(group, stat, delta) {
    if (player[group]?.[stat] === undefined) return;
    const before = player[group][stat];
    const after = Math.max(STAT_MIN, Math.min(STAT_CAP, before + delta));
    player[group][stat] = +after.toFixed(1);
    changes.push({ group, stat, delta: +(after - before).toFixed(1) });
  }
  function bumpAll(delta) {
    for (const s of BATTER_STATS)  bump("batter",  s, delta);
    for (const s of PITCHER_STATS) bump("pitcher", s, delta);
  }
  function fameUp(delta) {
    player.fame = (player.fame ?? 0) + delta;
    changes.push({ group: "meta", stat: "fame", delta });
  }

  if (won) {
    bumpAll(+3);
    fameUp(+25);
    if (mvp) {
      // MVP 추가 보너스
      bump("pitcher", "mental", +5);
      fameUp(+10);
    }
  } else {
    bump("pitcher", "mental", +5);
    fameUp(+10);
  }

  // 대회 기록 누적
  if (tournamentKey) {
    pushTournamentRecord(player, tournamentKey, won ? "champion" : "runner", mvp);
  }

  return { won, mvp, myScore: my.score, oppScore: opp.score, changes };
}
