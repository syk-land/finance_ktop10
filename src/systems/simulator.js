// 경기 자동 시뮬레이션 (Phase 1: POV 없이 결과만)
// 9이닝 × 양팀 약 36타석. 매치업 공식으로 결과 산출.
// 동점/연장은 리그별 규정에 따름 — STAGE_RULES 참조.

import { getTeamById } from "./league.js";
import { npcOverall } from "./npc.js";
import { getEffectiveBatter, getEffectivePitcher, BATTER_STATS, PITCHER_STATS, emptyStats } from "./player.js";

// 리그별 동점/연장 규정 (2026 기준, WebSearch 결과 기반)
//   regulation:     정규 이닝
//   maxExtra:       최대 연장 이닝 수 (Infinity = 결판날 때까지)
//   tiebreaker:     연장 진입 시 시작 베이스 (null이면 정상 룰)
//                   { fromInning, runners: [1루, 2루, 3루] }
//   tieAllowed:     true면 maxExtra 후 동점 시 무승부 인정
const STAGE_RULES = {
  // 한국 고교 — 본 게임은 토너먼트 진행이므로 사실상 결승 외에도 무승부 없음.
  // 단, league.schedule 의 일반 경기는 주말리그(권역 풀리그) 시뮬레이션으로 무승부 허용.
  high:        { regulation: 9, maxExtra: 3,        tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: true  },
  high_final:  { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: false },
  // 한국 대학 (U-리그/주말리그) — 정규는 무승부 즉시, 결승만 승부치기
  univ:        { regulation: 9, maxExtra: 0,        tiebreaker: null,                                              tieAllowed: true  },
  univ_final:  { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: false },
  // KBO 1군 — 2026 시즌 부터 10~12회 승부치기, 12회 후 무승부
  pro1:        { regulation: 9, maxExtra: 3,        tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: true  },
  pro1_final:  { regulation: 9, maxExtra: 6,        tiebreaker: null,                                              tieAllowed: true  },
  // KBO 퓨처스 (2군) — 연장 없이 9회 후 즉시 무승부
  pro2:        { regulation: 9, maxExtra: 0,        tiebreaker: null,                                              tieAllowed: true  },
  // 일본 NPB — 12회까지, 정상 연장 (승부치기 없음)
  japan:       { regulation: 9, maxExtra: 3,        tiebreaker: null,                                              tieAllowed: true  },
  japan_final: { regulation: 9, maxExtra: 6,        tiebreaker: null,                                              tieAllowed: true  },
  // MLB — 10회부터 2루 ghost runner, 무승부 없음
  mlb:         { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false },
  mlb_final:   { regulation: 9, maxExtra: Infinity, tiebreaker: null,                                              tieAllowed: false },
  // MLB 마이너 — 메이저와 동일 룰
  mlb_aaa:     { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false },
  mlb_aa:      { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false },
  mlb_a:       { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false },
};

function getStageRule(stage) {
  return STAGE_RULES[stage] ?? STAGE_RULES.high;
}

// 결과 종류: K(삼진), BB(볼넷), 1B(안타), 2B(2루타), 3B(3루타), HR(홈런), OUT(범타)
// type 키만 반환. 표시용 라벨은 UI 에서 i18n 의 event.<type> 로 조회.
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

  if (r < kChance) return { type: "K" };
  if (r < kChance + bbChance) return { type: "BB" };

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
    if (r3 < hrChance) return { type: "HR" };
    if (r3 < hrChance + tripleChance) return { type: "3B" };
    if (r3 < hrChance + tripleChance + doubleChance) return { type: "2B" };
    return { type: "1B" };
  }
  return { type: "OUT" };
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
  const homeInnings = [];
  const awayInnings = [];

  const rule = getStageRule(league.stage);
  const maxInning = rule.regulation + (rule.maxExtra === Infinity ? 999 : rule.maxExtra);
  // 정규 이닝 완료 후엔 매 이닝 끝마다 결판 체크. tieAllowed=false 이고 max 도달했는데도 동점이면 추가로 이어감.
  for (let inning = 1; inning <= maxInning; inning++) {
    const useTiebreaker = rule.tiebreaker && inning >= rule.tiebreaker.fromInning;
    const initialBases = useTiebreaker ? [...rule.tiebreaker.runners] : [false, false, false];

    const awayRuns = playHalfInning(awayLineup, homePitcher, myBoxBatter, myBoxPitcher, events, () => {
      const b = awayLineup[awayBatterIdx % awayLineup.length];
      awayBatterIdx++;
      return b;
    }, inning, initialBases);
    awayScore += awayRuns;
    awayInnings.push(awayRuns);

    // 끝내기: 정규 마지막 이닝 이상 + 홈 리드면 9말(또는 그 이상 말) 생략
    if (inning >= rule.regulation && homeScore > awayScore) {
      homeInnings.push(null);
      break;
    }

    const homeRuns = playHalfInning(homeLineup, awayPitcher, myBoxBatter, myBoxPitcher, events, () => {
      const b = homeLineup[homeBatterIdx % homeLineup.length];
      homeBatterIdx++;
      return b;
    }, inning, initialBases);
    homeScore += homeRuns;
    homeInnings.push(homeRuns);

    // 정규 이닝 완료 후 점수가 다르면 종료. 동점이면 연장(또는 무승부 cap 도달).
    if (inning >= rule.regulation && homeScore !== awayScore) break;
    // 무승부 허용 + 한도 도달이면 동점 무승부로 종료
    if (inning >= maxInning && rule.tieAllowed) break;
    // 무승부 불허 + 무한 연장은 동점이면 계속 (위 for 가 maxInning=999 까지 진행)
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
    home: { team: home, score: homeScore, pitcher: homePitcher.name, innings: homeInnings },
    away: { team: away, score: awayScore, pitcher: awayPitcher.name, innings: awayInnings },
    winner: winner ? winner.name : null,
    mainPlayer: (roles.bat || roles.pitch) ? {
      roles,
      batterBox: roles.bat ? myBoxBatter : null,
      pitcherBox: roles.pitch ? myBoxPitcher : null,
      events,
    } : null,
  };
}

// OVR (정렬·라인업 슬롯 결정용. 출장 결정에서는 더 이상 사용 안 함)
export function batterOVR(player) {
  const b = player.batter;
  return (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
}
export function pitcherOVR(player) {
  const p = player.pitcher;
  return (p.velocity + p.control + p.breaking + p.stamina + p.mental) / 5;
}

// 출장 룰 (Phase 1, 단순화):
//   - 타자: 부상 아니면 매 경기 무조건 출장 (양방향 주전 가정)
//   - 투수: 직전 경기 등판 → 등판 불가, 1경기 휴식 → 50%, 2경기+ 휴식 → 무조건 등판
function pitcherChanceByRest(restGames) {
  if (restGames === 0) return 0;
  if (restGames === 1) return 0.5;
  return 1;
}

// UI 표시용 — 현재 출장 확률 (0~1)
export function appearanceChance(player) {
  if (player.injury) return { bat: 0, pitch: 0 };
  const restGames = player.gamesSinceLastPitch ?? 99;
  return { bat: 1, pitch: pitcherChanceByRest(restGames) };
}

function decideRolesForGame(player) {
  if (player.injury) return { bat: false, pitch: false };
  const restGames = player.gamesSinceLastPitch ?? 99;
  const pitchChance = pitcherChanceByRest(restGames);
  return {
    bat: true,
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

function playHalfInning(battingLineup, pitcher, myBox, myPbox, events, nextBatter, inning = 0, initialBases = null) {
  let outs = 0;
  let runs = 0;
  // 베이스: [1루, 2루, 3루] — 주자 있으면 true. 승부치기/ghost runner 시 시작 베이스 지정.
  let bases = initialBases ? [...initialBases] : [false, false, false];

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
      events.push({ inning, type: result.type, role: "batter" });
    }
    if (isMainPit) {
      myPbox.pa = (myPbox.pa ?? 0) + 1;
      if (result.type === "K") myPbox.pK++;
      if (result.type === "BB") myPbox.pBB++;
      if (["1B","2B","3B","HR"].includes(result.type)) myPbox.pH++;
      if (result.type === "HR") myPbox.pHR++;
      events.push({ inning, type: result.type, role: "pitcher" });
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
