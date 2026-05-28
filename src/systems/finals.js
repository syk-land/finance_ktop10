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

import { getTournamentPool } from "../data/tournaments.js";
import { getTeamPool } from "../data/teams.js";
import { getPlayerTeam } from "./league.js";
import { createRoster, stageAgeRange } from "./npc.js";
import { simulateGame } from "./simulator.js";
import { overallScore, BATTER_STATS, PITCHER_STATS, getPlayerStatCap, addFame } from "./player.js";
import { effectMultiplier } from "./traitEffects.js";
import { state, pushToast } from "../state.js";
import { t } from "../i18n/index.js";

const STAT_CAP = 150;
const STAT_MIN = 20;

// 그 주 (3월의 N번째 주 ~) 에 end 가 포함된 토너먼트 — 결승전 시점
function tournamentsEndingThisWeek(stage, gameDate, weeksPerSeason, weekIndex) {
  // 게임 캘린더는 시즌 시작 = 3월 1일. 매 tick 마다 dayOfMonth/month 갱신.
  // weekIndex 가 진행 중인 주차. endWeek 직후 호출되는 시점이라 gameDate 는
  // 다음 주 시작 직전 ~ 약간 후. 안전하게 현재 month/dayOfMonth 의 +- 7일 범위에 대회 end 가 있는지 본다.
  if (!gameDate) return [];
  const pool = getTournamentPool(stage);
  const today = gameDate.month * 100 + gameDate.dayOfMonth;
  return pool.filter(tn => {
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

// 가상의 결승전 상대 팀 생성 — 팀 풀에서 리그에 없는 강팀 하나 선택
function makeOpponentTeam(myTeamStrength, league, stage) {
  const locale = state?.locale ?? "ko";
  const pool = getTeamPool(stage, locale);
  const existingNames = new Set((league?.teams ?? []).map(t => t.name));
  const candidates = pool.filter(t => !existingNames.has(t.name));
  const usable = candidates.length > 0 ? candidates : pool;
  // 결승까지 올라온 팀이므로 strength 상위 절반 중 랜덤 선택
  const sorted = [...usable].sort((a, b) => b.strength - a.strength);
  const topN = Math.max(3, Math.ceil(sorted.length / 2));
  const pick = sorted[Math.floor(Math.random() * Math.min(topN, sorted.length))];
  const finalStrength = Math.max(60, myTeamStrength + 5, pick.strength);
  return {
    id: -100,
    name: pick.name,
    region: pick.region,
    strength: finalStrength,
    // stage 옵션 필수 — 누락 시 getNpcStatCap 가 default 150 폴백해서
    // 결승 상대 NPC 가 일반 리그 NPC(cap 100) 보다 1.5배 강하게 생성됨 (압살 게임 원인).
    roster: createRoster(finalStrength, stageAgeRange(stage), { stage, teamName: pick.name }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: false,
  };
}

// 결승 진출 굴림 — 이번 주 종료되는 토너먼트마다 체크. 진출하면 첫 번째만 처리.
// player.lastFinalCheckWeek 로 중복 방지.
export function checkFinalAdvance(player, league, season, gameDate) {
  if (!player || !league || !season || !gameDate) return null;
  // 학원 토너먼트(고교/대학)만 결승 굴림. 프로/MLB 는 postseason.js 가 처리.
  if (player.stage !== "high" && player.stage !== "univ") return null;
  player.processedFinals = player.processedFinals ?? {};

  const list = tournamentsEndingThisWeek(player.stage, gameDate, league.weeksPerSeason, season.weekIndex);
  for (const tn of list) {
    const seasonId = `${gameDate.year}-${tn.key}`;
    if (player.processedFinals[seasonId]) continue;       // 이미 처리한 시즌×대회
    player.processedFinals[seasonId] = true;

    if (Math.random() < advanceProbability(player, league)) {
      // 결승 진출!
      const myStrength = getPlayerTeam(league)?.strength ?? 60;
      const opponent = makeOpponentTeam(myStrength, league, player.stage);
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
  if (player.tournamentHistory.length > 100) {
    player.tournamentHistory.shift();
  }
}

// 결승전 9이닝 시뮬레이션.
// forcedRoles 가 주어지면 진입 모달에서 미리 굴린 결과 그대로 사용 (UI 표시와 일치 보장).
export function simulateFinal(player, league, opponent, forcedRoles = null) {
  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;

  // simulator.js 에 정의된 stage 별 결승 규정(연장/승부치기/콜드게임) 적용
  const finalStage = player.stage === "univ" ? "univ_final" : "high_final";

  // 임시 league-like 객체로 simulateGame 호출
  const finalLeague = {
    stage: finalStage,
    teams: [myTeam, opponent],
    schedule: [],
    weeksPerSeason: 1,
    gamesPerWeek: 1,
  };
  const gameDef = { home: myTeam.id, away: opponent.id };
  return simulateGame(finalLeague, gameDef, player, { forcedRoles });
}

// 메인 결승 성적 → 보상 배율 (0.3~1.0).
// 출장 X → 0.3 (관전 보상), 부진 → 0.5~0.7, 평범 → 1.0.
// MVP 보너스는 별도 (기존 분기 유지).
function performanceMultiplier(result) {
  const mp = result?.mainPlayer;
  if (!mp || (!mp.roles?.bat && !mp.roles?.pitch)) return 0.3;
  const b = mp.batterBox;
  const p = mp.pitcherBox;
  const batPa = b?.pa ?? 0;
  const batH = b?.h ?? 0;
  const batHr = b?.hr ?? 0;
  const pOuts = p?.ipOuts ?? 0;
  const pER = p?.er ?? 0;
  // 부진 판정: 3타석+ 무안타 / 3이닝+ 자책 5+
  const batBad = batPa >= 3 && batH === 0 && batHr === 0;
  const pitBad = pOuts >= 9 && pER >= 5;
  const both = mp.roles?.bat && mp.roles?.pitch;
  if (both) {
    if (batBad && pitBad) return 0.4;
    if (batBad || pitBad) return 0.7;
    return 1.0;
  }
  // 단방향 — 부진이면 절반
  return (batBad || pitBad) ? 0.5 : 1.0;
}

// 우승/준우승 보상 적용. changes[] + mvp 여부 반환.
// tournamentKey 가 주어지면 player.tournamentHistory 에 기록도 누적.
// 보상은 메인 결승 성적(perfMult)에 비례 — 우승해도 메인이 부진/미출장이면 축소.
export function applyFinalReward(player, result, tournamentKey = null) {
  const my = result?.home?.team?.isPlayerTeam ? result.home : result.away;
  const opp = my === result.home ? result.away : result.home;
  const won = result.winner && result.winner === my.team.name;
  const mvp = won && checkMVP(result);
  const perfMult = performanceMultiplier(result);

  const changes = [];
  const cap = getPlayerStatCap(player);
  // big_game trait — finalsReward ×1.5. stat 가산과 fame 양쪽에 적용.
  const rewardMult = effectMultiplier(player, "finalsReward");
  function bump(group, stat, delta) {
    if (player[group]?.[stat] === undefined) return;
    const before = player[group][stat];
    const after = Math.max(STAT_MIN, Math.min(cap, before + delta));
    player[group][stat] = +after.toFixed(1);
    changes.push({ group, stat, delta: +(after - before).toFixed(1) });
  }
  function bumpAll(delta) {
    for (const s of BATTER_STATS)  bump("batter",  s, delta);
    for (const s of PITCHER_STATS) bump("pitcher", s, delta);
  }
  function fameUp(delta) {
    // addFame 이 stardom 의 fameGain multiplier 자동 적용. 여기 finalsReward 도 같이 곱.
    const actual = addFame(player, delta);
    changes.push({ group: "meta", stat: "fame", delta: actual });
  }

  if (won) {
    bumpAll(+(3 * perfMult * rewardMult).toFixed(1));
    fameUp(Math.round(25 * perfMult * rewardMult));
    if (mvp) {
      // MVP 추가 보너스 — perfMult 영향 받지 않음 (MVP 조건 자체가 호조 보증)
      bump("pitcher", "mental", +5);
      fameUp(Math.round(10 * rewardMult));
    }
  } else {
    bump("pitcher", "mental", +(5 * perfMult).toFixed(1));
    fameUp(Math.round(10 * perfMult * rewardMult));
  }

  // 대회 기록 누적
  if (tournamentKey) {
    pushTournamentRecord(player, tournamentKey, won ? "champion" : "runner", mvp);
  }

  return { won, mvp, myScore: my.score, oppScore: opp.score, changes, perfMult };
}
