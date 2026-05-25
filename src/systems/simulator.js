// 경기 자동 시뮬레이션 (Phase 1: POV 없이 결과만)
// 9이닝 × 양팀 약 36타석. 매치업 공식으로 결과 산출.

import { getTeamById } from "./league.js";
import { npcOverall } from "./npc.js";
import { getEffectiveBatter, getEffectivePitcher, BATTER_STATS, PITCHER_STATS, emptyStats } from "./player.js";

// 결과 종류: K(삼진), BB(볼넷), 1B(안타), 2B(2루타), 3B(3루타), HR(홈런), OUT(범타)
// 매치업 공식 — 컨택의 영향력을 강하게 반영
function simulateAtBat(batter, pitcher) {
  const b = batter;
  const p = pitcher;
  const contact = b.contact ?? 50;
  const power   = b.power ?? 50;
  const eye     = b.eye ?? 50;
  const velocity = p.velocity ?? 50;
  const control  = p.control ?? 50;
  const breaking = p.breaking ?? 50;

  // 차이값
  const stuffAvg = (velocity + breaking) / 2;
  const contactDiff = contact - stuffAvg;     // +면 타자 우위
  const eyeDiff = eye - control;

  const r = Math.random() * 100;

  // 삼진 확률: 컨택과 선구안이 좋으면 감소
  const kChance = clamp(22 - contactDiff * 0.4 - eyeDiff * 0.15, 3, 45);
  // 볼넷 확률: 선구안 vs 제구
  const bbChance = clamp(9 + eyeDiff * 0.3, 3, 25);

  if (r < kChance) return { type: "K", desc: "삼진" };
  if (r < kChance + bbChance) return { type: "BB", desc: "볼넷" };

  // 인플레이 안타 확률 (BABIP 기반)
  const inPlayHitChance = clamp(30 + contactDiff * 0.35, 18, 62);
  const r2 = Math.random() * 100;
  if (r2 < inPlayHitChance) {
    // 장타 분류
    const r3 = Math.random() * 100;
    const powerDiff = power - velocity;
    const hrChance = clamp(powerDiff * 0.5 + 5, 1, 25);
    const tripleChance = 1.5;
    const doubleChance = clamp(powerDiff * 0.3 + 10, 5, 22);
    if (r3 < hrChance) return { type: "HR", desc: "홈런" };
    if (r3 < hrChance + tripleChance) return { type: "3B", desc: "3루타" };
    if (r3 < hrChance + tripleChance + doubleChance) return { type: "2B", desc: "2루타" };
    return { type: "1B", desc: "단타" };
  }
  return { type: "OUT", desc: "범타" };
}

// 한 경기 전체 시뮬레이션
// 양방향 선수: 부상 아니면 매 경기 타자로 라인업 + 선발 투수로 등판
export function simulateGame(league, gameDef, mainPlayer) {
  const home = getTeamById(league, gameDef.home);
  const away = getTeamById(league, gameDef.away);

  const playerTeam = mainPlayer && (home.isPlayerTeam ? home : away.isPlayerTeam ? away : null);
  const roles = mainPlayer && playerTeam ? decideRolesForGame(mainPlayer) : { bat: false, pitch: false };

  const homeLineup = buildLineup(home, playerTeam === home && roles.bat ? mainPlayer : null);
  const awayLineup = buildLineup(away, playerTeam === away && roles.bat ? mainPlayer : null);
  const homePitcher = pickStartingPitcher(home, playerTeam === home && roles.pitch ? mainPlayer : null);
  const awayPitcher = pickStartingPitcher(away, playerTeam === away && roles.pitch ? mainPlayer : null);

  const myBoxBatter = emptyStats();
  const myBoxPitcher = emptyStats();
  const events = []; // {role, type, desc}

  let homeScore = 0;
  let awayScore = 0;
  let awayBatterIdx = 0;
  let homeBatterIdx = 0;

  for (let inning = 1; inning <= 9; inning++) {
    const awayRuns = playHalfInning(awayLineup, homePitcher, myBoxBatter, myBoxPitcher, events, () => {
      const b = awayLineup[awayBatterIdx % awayLineup.length];
      awayBatterIdx++;
      return b;
    });
    awayScore += awayRuns;
    if (inning === 9 && homeScore > awayScore) break;
    const homeRuns = playHalfInning(homeLineup, awayPitcher, myBoxBatter, myBoxPitcher, events, () => {
      const b = homeLineup[homeBatterIdx % homeLineup.length];
      homeBatterIdx++;
      return b;
    });
    homeScore += homeRuns;
  }

  let winner;
  if (homeScore > awayScore) {
    home.record.w++; away.record.l++;
    winner = home;
  } else if (awayScore > homeScore) {
    away.record.w++; home.record.l++;
    winner = away;
  } else {
    home.record.t++; away.record.t++;
  }

  return {
    home: { team: home, score: homeScore, pitcher: homePitcher.name },
    away: { team: away, score: awayScore, pitcher: awayPitcher.name },
    winner: winner ? winner.name : null,
    mainPlayer: (roles.bat || roles.pitch) ? {
      roles,
      batterBox: roles.bat ? myBoxBatter : null,
      pitcherBox: roles.pitch ? myBoxPitcher : null,
      events,
    } : null,
  };
}

// 출장 확률 곡선: OVR이 lo 이하면 0%, hi 이상이면 100%, 사이는 선형
function chanceFromOVR(ovr, lo, hi) {
  if (ovr <= lo) return 0;
  if (ovr >= hi) return 1;
  return (ovr - lo) / (hi - lo);
}

const BAT_LO = 30;
const BAT_HI = 80;
const PIT_LO = 35;
const PIT_HI = 80;

export function batterOVR(player) {
  const b = player.batter;
  return (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
}
export function pitcherOVR(player) {
  const p = player.pitcher;
  return (p.velocity + p.control + p.breaking + p.stamina + p.mental) / 5;
}

// UI 표시용 — 현재 출장 확률 (0~1)
export function appearanceChance(player) {
  if (player.injury) return { bat: 0, pitch: 0 };
  const batChance = chanceFromOVR(batterOVR(player), BAT_LO, BAT_HI);
  const restGames = player.gamesSinceLastPitch ?? 99;
  const restMult = restGames === 0 ? 0 : restGames === 1 ? 0.5 : 1.0;
  const pitchChance = chanceFromOVR(pitcherOVR(player), PIT_LO, PIT_HI) * restMult;
  return { bat: batChance, pitch: pitchChance };
}

function decideRolesForGame(player) {
  if (player.injury) return { bat: false, pitch: false };

  const batChance = chanceFromOVR(batterOVR(player), BAT_LO, BAT_HI);

  // 투수 등판 휴식: 직전 게임 등판 시 등판 불가
  const restGames = player.gamesSinceLastPitch ?? 99;
  let restMult;
  if (restGames === 0) restMult = 0;
  else if (restGames === 1) restMult = 0.5;
  else restMult = 1.0;
  const pitchChance = chanceFromOVR(pitcherOVR(player), PIT_LO, PIT_HI) * restMult;

  return {
    bat: Math.random() < batChance,
    pitch: Math.random() < pitchChance,
  };
}

function buildLineup(team, mainPlayerForBat) {
  const fielders = team.roster.filter(p => p.role === "batter");
  fielders.sort((a, b) => npcOverall(b) - npcOverall(a));
  const lineup = fielders.slice(0, 9);
  if (mainPlayerForBat) {
    const b = mainPlayerForBat.batter;
    const ovr = (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
    const slot = ovr > 60 ? 3 : ovr > 50 ? 4 : 6;
    lineup.splice(slot, 1, asLineupEntry(mainPlayerForBat));
  }
  return lineup;
}

function pickStartingPitcher(team, mainPlayerForPitch) {
  if (mainPlayerForPitch) return asPitcherEntry(mainPlayerForPitch);
  const pitchers = team.roster.filter(p => p.role === "pitcher" && p.pos === "SP");
  pitchers.sort((a, b) => npcOverall(b) - npcOverall(a));
  return pitchers[0] ?? team.roster.find(p => p.role === "pitcher");
}

function asLineupEntry(mainPlayer) {
  return {
    id: -1,
    name: mainPlayer.name,
    role: "batter",
    pos: "DH",
    isMain: true,
    batter: getEffectiveBatter(mainPlayer),
  };
}
function asPitcherEntry(mainPlayer) {
  return {
    id: -1,
    name: mainPlayer.name,
    role: "pitcher",
    pos: "SP",
    isMain: true,
    pitcher: getEffectivePitcher(mainPlayer),
  };
}

function playHalfInning(battingLineup, pitcher, myBox, myPbox, events, nextBatter) {
  let outs = 0;
  let runs = 0;
  // 베이스: [1루, 2루, 3루] — 주자 있으면 true
  let bases = [false, false, false];

  while (outs < 3) {
    const batter = nextBatter();
    const isMainBat = batter.isMain;
    const isMainPit = pitcher.isMain;
    const bStats = batter.batter ?? batter; // already effective if main
    const pStats = pitcher.pitcher ?? pitcher;

    const result = simulateAtBat(bStats, pStats);

    // 주인공이 타석/투구 중이면 통계 누적
    if (isMainBat) {
      myBox.pa++; if (result.type !== "BB") myBox.ab++;
      if (result.type === "K") myBox.k++;
      if (result.type === "BB") myBox.bb++;
      if (["1B","2B","3B","HR"].includes(result.type)) {
        myBox.h++;
        if (result.type === "2B") myBox.tb += 2;
        else if (result.type === "3B") myBox.tb += 3;
        else if (result.type === "HR") { myBox.hr++; myBox.tb += 4; }
        else myBox.tb += 1;
      }
      events.push({ inning: 0, type: result.type, desc: result.desc, role: "batter" });
    }
    if (isMainPit) {
      myPbox.pa = (myPbox.pa ?? 0) + 1;
      if (result.type === "K") myPbox.pK++;
      if (result.type === "BB") myPbox.pBB++;
      if (["1B","2B","3B","HR"].includes(result.type)) myPbox.pH++;
      if (result.type === "HR") myPbox.pHR++;
      events.push({ inning: 0, type: result.type, desc: result.desc, role: "pitcher" });
    }

    // 베이스 상태 갱신
    const ab = applyResult(result.type, bases, batter);
    runs += ab.runs;
    bases = ab.bases;
    if (ab.out) outs++;

    if (isMainPit) {
      myPbox.er = (myPbox.er ?? 0) + ab.runs;
    }
  }
  return runs;
}

function applyResult(type, bases, batter) {
  let runs = 0;
  let out = false;
  let newBases = [...bases];
  switch (type) {
    case "K":
    case "OUT":
      out = true;
      break;
    case "BB": {
      // 1루로 보내고 강제진루
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) runs++;
          newBases[2] = true;
        }
        newBases[1] = true;
      }
      newBases[0] = true;
      break;
    }
    case "1B": {
      // 모든 주자 1루씩 진루 (단순화)
      if (newBases[2]) { runs++; newBases[2] = false; }
      if (newBases[1]) { newBases[2] = true; newBases[1] = false; }
      if (newBases[0]) { newBases[1] = true; newBases[0] = false; }
      newBases[0] = true;
      break;
    }
    case "2B": {
      if (newBases[2]) { runs++; newBases[2] = false; }
      if (newBases[1]) { runs++; newBases[1] = false; }
      if (newBases[0]) { newBases[2] = true; newBases[0] = false; }
      newBases[1] = true;
      break;
    }
    case "3B": {
      runs += bases.filter(Boolean).length;
      newBases = [false, false, true];
      break;
    }
    case "HR": {
      runs += bases.filter(Boolean).length + 1;
      newBases = [false, false, false];
      break;
    }
  }
  return { runs, out, bases: newBases };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
