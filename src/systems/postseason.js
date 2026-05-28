// 포스트시즌 시스템 — 시즌 종료 시 pro1/mlb 단계에서 트리거.
// 단순화: 각 라운드를 단판 시뮬레이션으로 처리 (finals.js 패턴 재사용).
//
// 흐름:
//   1. week.js endWeek 의 season.finished=true 직후 checkPostseasonAdvance() 호출
//   2. 우리 팀 순위로 시작 라운드 결정. 진출 X 면 null.
//   3. state.pendingPostseason 세팅 → weekly.js 가 모달 진행
//   4. 라운드 우승 시 다음 라운드로, 패배 시 시즌 종료.
//
// KBO: wc(와카) → spo(준PO) → po(PO) → ks(한국시리즈)
//   순위 1=ks, 2=po, 3=spo, 4·5=wc
// MLB: wc → ds → cs → ws
//   순위 1·2=ds, 3·4·5·6=wc

import { state } from "../state.js";
import { getPlayerTeam, standings } from "./league.js";
import { simulateGame } from "./simulator.js";
import { createRoster } from "./npc.js";
import { getTeamPool } from "../data/teams.js";
import { BATTER_STATS, PITCHER_STATS, getPlayerStatCap, addFame } from "./player.js";
import { effectMultiplier } from "./traitEffects.js";

const STAT_MIN = 20;

export const KBO_BRACKET = ["wc", "spo", "po", "ks"];
export const MLB_BRACKET = ["wc", "ds", "cs", "ws"];

// 라운드별 시리즈 길이 (실제 KBO/MLB 규정 반영)
//   KBO: wc 1게임(단판), spo 3전2승, po 5전3승, ks 7전4승
//   MLB: wc 3전2승, ds 5전3승, cs·ws 7전4승
const SERIES_LENGTH_KBO = { wc: 1, spo: 3, po: 5, ks: 7 };
const SERIES_LENGTH_MLB = { wc: 3, ds: 5, cs: 7, ws: 7 };
export function seriesLengthFor(stage, round) {
  const table = stage === "pro1" ? SERIES_LENGTH_KBO : SERIES_LENGTH_MLB;
  return table[round] ?? 1;
}
export function winsToClinch(seriesLength) {
  return Math.ceil(seriesLength / 2);
}

function bracketForStage(stage) {
  if (stage === "pro1") return KBO_BRACKET;
  if (stage === "mlb")  return MLB_BRACKET;
  return null;
}

function startRoundForRank(stage, rank) {
  if (stage === "pro1") {
    if (rank === 1)              return "ks";
    if (rank === 2)              return "po";
    if (rank === 3)              return "spo";
    if (rank === 4 || rank === 5) return "wc";
    return null;
  }
  if (stage === "mlb") {
    if (rank === 1 || rank === 2) return "ds";
    if (rank >= 3 && rank <= 6)   return "wc";
    return null;
  }
  return null;
}

// 시즌 종료 시 호출 — 진출 자격 있으면 state.pendingPostseason 객체 반환
export function checkPostseasonAdvance(player, league) {
  if (!player || !league) return null;
  if (player.stage !== "pro1" && player.stage !== "mlb") return null;

  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;
  const stng = standings(league);
  const rank = stng.findIndex(t => t.name === myTeam.name) + 1;
  if (rank === 0) return null;

  const startRound = startRoundForRank(player.stage, rank);
  if (!startRound) return null;

  return {
    bracket: bracketForStage(player.stage),
    round: startRound,
    rank,
    teamStrength: myTeam.strength ?? 70,
    opponent: makeOpponentForRound(myTeam.strength ?? 70, startRound, player.stage),
    status: "announce",  // announce → playing → gameResult → (다음 경기로 반복 or 라운드 종료)
    result: null,
    completedRounds: [],   // [{round, won, scoreMy, scoreOpp}] — 라운드 단위 (시리즈 종합)
    seriesWins: { my: 0, opp: 0 },        // 현재 라운드 시리즈 누적
    seriesGames: [],                       // 현재 라운드 게임별 [{won, scoreMy, scoreOpp}]
    seriesLength: seriesLengthFor(player.stage, startRound),
    stage: player.stage,
  };
}

// 라운드 진행 후 다음 라운드 세팅 — 같은 pendingPostseason 객체를 갱신.
export function advanceToNextRound(ps) {
  const idx = ps.bracket.indexOf(ps.round);
  if (idx < 0 || idx >= ps.bracket.length - 1) return false;
  ps.round = ps.bracket[idx + 1];
  ps.status = "announce";
  ps.result = null;
  ps.opponent = makeOpponentForRound(ps.teamStrength, ps.round, ps.stage);
  ps.seriesWins = { my: 0, opp: 0 };
  ps.seriesGames = [];
  ps.seriesLength = seriesLengthFor(ps.stage, ps.round);
  return true;
}

// 시리즈 한 게임 결과 누적. clinched 면 라운드 종료 (advanceToNextRound 호출 가능).
export function recordSeriesGame(ps, won, scoreMy, scoreOpp) {
  ps.seriesWins = ps.seriesWins ?? { my: 0, opp: 0 };
  ps.seriesGames = ps.seriesGames ?? [];
  if (won) ps.seriesWins.my++;
  else     ps.seriesWins.opp++;
  ps.seriesGames.push({ won, scoreMy, scoreOpp });
}

// 시리즈가 누군가의 승리로 결정됐는지
export function isSeriesClinched(ps) {
  const need = winsToClinch(ps.seriesLength ?? 1);
  return (ps.seriesWins?.my ?? 0) >= need || (ps.seriesWins?.opp ?? 0) >= need;
}

// 시리즈 최종 승자 — clinched 일 때만 의미 있음
export function seriesWinner(ps) {
  const need = winsToClinch(ps.seriesLength ?? 1);
  if ((ps.seriesWins?.my ?? 0) >= need) return "my";
  if ((ps.seriesWins?.opp ?? 0) >= need) return "opp";
  return null;
}

function makeOpponentForRound(myStrength, round, stage) {
  const bonus = { wc: 0, spo: 4, po: 8, ks: 12, ds: 6, cs: 12, ws: 18 }[round] ?? 0;
  const strength = Math.max(60, myStrength + bonus);
  const locale = state?.locale ?? "ko";
  const poolStage = stage === "pro1" ? "pro1" : "mlb";
  const pool = getTeamPool(poolStage, locale);
  const pick = pool?.[Math.floor(Math.random() * (pool?.length || 1))];
  const ageRange = stage === "pro1" ? [22, 36] : [22, 38];
  return {
    id: -200,
    name: pick?.name ?? "Opponent",
    region: pick?.region,
    strength,
    // stage 옵션 없으면 getNpcStatCap(undefined) 폴백 150 → MLB 200/pro1 160 보다 약체로 생성되던 버그 fix.
    roster: createRoster(strength, ageRange, { stage: poolStage }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: false,
  };
}

// 라운드 단판 시뮬레이션
export function simulatePostseasonGame(player, league, opponent, stage) {
  const myTeam = getPlayerTeam(league);
  if (!myTeam) return null;
  const seriesStage = (stage === "pro1") ? "pro1_final" : "mlb_final";
  const tempLeague = {
    stage: seriesStage,
    teams: [myTeam, opponent],
    schedule: [],
    weeksPerSeason: 1,
    gamesPerWeek: 1,
  };
  const gameDef = { home: myTeam.id, away: opponent.id };
  return simulateGame(tempLeague, gameDef, player);
}

// 포스트시즌 종료 시 player.tournamentHistory 에 한 줄 push.
// finalRound: 도달한 마지막 라운드 (ks/ws 까지 갔으면 챔피언, 아니면 그 라운드에서 탈락)
// wonChampionship: ks/ws 우승 여부
export function pushPostseasonRecord(player, stage, finalRound, wonChampionship) {
  player.tournamentHistory = player.tournamentHistory ?? [];
  const prefix = stage === "pro1" ? "kbo_" : "mlb_";
  const isFinalRound = (finalRound === "ks" || finalRound === "ws");
  const result = wonChampionship ? "champion"
              : (isFinalRound ? "runner" : "eliminated");
  player.tournamentHistory.push({
    year:  state.gameDate?.year ?? null,
    grade: player.grade,
    tournamentKey: prefix + finalRound,
    result,
    mvp: false,
  });
  if (player.tournamentHistory.length > 400) player.tournamentHistory.shift();
}

// 라운드 승/패 보상 — 우승만 보상 부여. ks/ws 는 큰 보상.
export function applyRoundReward(player, round, won) {
  if (!won) return [];
  // big_game trait — finalsReward ×1.5 (PO 도 동일 kind 적용).
  const rewardMult = effectMultiplier(player, "finalsReward");
  const baseFame = Math.round(({ wc: 5, spo: 8, po: 12, ks: 30, ds: 8, cs: 15, ws: 35 }[round] ?? 5) * rewardMult);
  const baseStat = +(({ wc: 1, spo: 2, po: 2, ks: 4, ds: 2, cs: 3, ws: 5 }[round] ?? 1) * rewardMult).toFixed(1);

  const cap = getPlayerStatCap(player);
  const changes = [];
  function bump(group, stat, delta) {
    if (player[group]?.[stat] === undefined) return;
    const before = player[group][stat];
    const after = Math.max(STAT_MIN, Math.min(cap, before + delta));
    player[group][stat] = +after.toFixed(1);
    if (after !== before) changes.push({ group, stat, delta: +(after - before).toFixed(1) });
  }

  for (const s of BATTER_STATS)  bump("batter",  s, baseStat);
  for (const s of PITCHER_STATS) bump("pitcher", s, baseStat);
  const fameDelta = addFame(player, baseFame);
  changes.push({ group: "meta", stat: "fame", delta: fameDelta });

  // 챔피언십(ks/ws) 우승 — 우승 기록 누적 (player.championships)
  if (round === "ks" || round === "ws") {
    player.championships = player.championships ?? [];
    player.championships.push({
      round,
      year: state.gameDate?.year ?? null,
      stage: player.stage,
    });
  }

  return changes;
}
