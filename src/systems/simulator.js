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

// 결과 종류:
//   매치업 산출: K(삼진), BB(볼넷), HBP(사구), 1B/2B/3B/HR, OUT(범타)
//   상황 분기:   E(실책 출루), DP(병살), SF(희생플라이) — OUT 의 변형
//   이닝 페이즈: SB(도루 성공), CS(도루 실패) — 타석과 무관, 베이스 주자 액션
// type 키만 반환. 표시용 라벨은 UI 에서 i18n 의 event.<type> 로 조회.
function simulateAtBat(batter, pitcher) {
  const b = batter;
  const p = pitcher;
  const contact = b.contact ?? 50;
  const power   = b.power ?? 50;
  const eye     = b.eye ?? 50;
  const velocity = p.velocity ?? 50;
  const control  = p.control ?? 50;
  const breaking = p.breaking ?? 50;

  const stuffAvg = (velocity + breaking) / 2;
  const contactDiff = contact - stuffAvg;
  const eyeDiff = eye - control;

  const r = Math.random() * 100;

  const kChance = clamp(22 - contactDiff * 0.4 - eyeDiff * 0.15, 3, 45);
  const bbChance = clamp(9 + eyeDiff * 0.3, 3, 25);
  // 사구 — 제구 낮을수록 증가. 베이스라인 ~1%.
  const hbpChance = clamp(1.0 - (control - 50) * 0.03, 0.3, 3.0);

  if (r < kChance) return { type: "K" };
  if (r < kChance + bbChance) return { type: "BB" };
  if (r < kChance + bbChance + hbpChance) return { type: "HBP" };

  const inPlayHitChance = clamp(30 + contactDiff * 0.35, 18, 62);
  const r2 = Math.random() * 100;
  if (r2 < inPlayHitChance) {
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

// OUT 을 상황별로 분기 — E(실책) / SF(희생플라이) / DP(병살) / OUT(범타) 중 하나로.
// outs: 현재 이닝 아웃수, defenseRating: 수비팀 평균 defense
function classifyOut(batter, bases, outs, defenseRating) {
  const contact = batter.contact ?? 50;
  const power   = batter.power ?? 50;
  const speed   = batter.speed ?? 50;

  // 실책 출루(E) — 수비 낮을수록 + 컨택 높을수록 (강한 타구). 베이스라인 ~1.5%.
  const eChance = clamp((contact - defenseRating) * 0.08 + 1.5, 0.3, 7);
  if (Math.random() * 100 < eChance) return "E";

  // 희생플라이(SF) — 3루 주자 + <2아웃 + 파워(타구 깊이) 영향
  if (bases[2] && outs < 2) {
    const sfChance = clamp(16 + (power - 50) * 0.25, 6, 32);
    if (Math.random() * 100 < sfChance) return "SF";
  }

  // 병살타(DP) — 1루 주자 + <2아웃. 느릴수록 잘 걸림.
  if (bases[0] && outs < 2) {
    const dpChance = clamp(14 - (speed - 50) * 0.20, 4, 28);
    if (Math.random() * 100 < dpChance) return "DP";
  }

  return "OUT";
}

// 도루 시도 굴림. 1루 주자(2루 비어있을 때)만 처리 — 단순화.
// 시도 여부는 주자 speed 기반, 성공률은 speed vs pitcher.control.
// 결과: { attempted: bool, success: bool, runner } — runner는 시도한 주자 객체.
function attemptSteal(bases, pitcher) {
  const r1 = bases[0];
  if (!r1 || bases[1]) return { attempted: false };
  const speed = r1.speed ?? 50;
  const attemptChance = clamp((speed - 50) * 0.7, 0, 30);
  if (Math.random() * 100 >= attemptChance) return { attempted: false };
  const control = pitcher.control ?? 50;
  const successChance = clamp(62 + (speed - control) * 0.5, 25, 90);
  const success = Math.random() * 100 < successChance;
  return { attempted: true, success, runner: r1 };
}

// 베이스 슬롯에 들어갈 주자 객체. 도루 굴림과 메인 캐릭터 통계 추적용.
function makeRunner(batter) {
  const stats = batter.batter ?? batter;
  return {
    isMain: !!batter.isMain,
    speed: stats.speed ?? 50,
  };
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
  // 수비팀 평균 defense — 실책(E) 굴림에 사용
  const homeDefense = teamDefenseRating(homeLineup);
  const awayDefense = teamDefenseRating(awayLineup);
  // 정규 이닝 완료 후엔 매 이닝 끝마다 결판 체크. tieAllowed=false 이고 max 도달했는데도 동점이면 추가로 이어감.
  for (let inning = 1; inning <= maxInning; inning++) {
    const useTiebreaker = rule.tiebreaker && inning >= rule.tiebreaker.fromInning;
    const initialBases = useTiebreaker
      ? rule.tiebreaker.runners.map(b => b ? ghostRunner() : null)
      : [null, null, null];

    const awayRuns = playHalfInning(awayLineup, homePitcher, myBoxBatter, myBoxPitcher, events, () => {
      const b = awayLineup[awayBatterIdx % awayLineup.length];
      awayBatterIdx++;
      return b;
    }, inning, [...initialBases], homeDefense);
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
    }, inning, [...initialBases], awayDefense);
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

function playHalfInning(battingLineup, pitcher, myBox, myPbox, events, nextBatter, inning = 0, initialBases = null, defenseRating = 50) {
  let outs = 0;
  let runs = 0;
  // 베이스: [1루, 2루, 3루] — 주자가 있으면 {isMain, speed} 객체, 비어있으면 null.
  let bases = initialBases ? [...initialBases] : [null, null, null];
  const pStats = pitcher.pitcher ?? pitcher;
  const isMainPit = pitcher.isMain;

  while (outs < 3) {
    // ─ 도루 phase (타석 전) ─ 1루 주자 → 2루 도루만 처리.
    const steal = attemptSteal(bases, pStats);
    if (steal.attempted) {
      const r1 = steal.runner;
      if (steal.success) {
        bases[1] = r1;
        bases[0] = null;
        if (r1.isMain) { myBox.sb = (myBox.sb ?? 0) + 1; events.push({ inning, type: "SB", role: "batter" }); }
      } else {
        bases[0] = null;
        outs++;
        if (r1.isMain) { myBox.cs = (myBox.cs ?? 0) + 1; events.push({ inning, type: "CS", role: "batter" }); }
        if (outs >= 3) break;
      }
    }

    // ─ 타석 ─
    const batter = nextBatter();
    const isMainBat = batter.isMain;
    const bStats = batter.batter ?? batter;

    const raw = simulateAtBat(bStats, pStats);
    const resolvedType = raw.type === "OUT"
      ? classifyOut(bStats, bases, outs, defenseRating)
      : raw.type;

    // 통계 누적 — 주인공이 타석에 있을 때
    if (isMainBat) {
      myBox.pa++;
      // AB 산입: BB/HBP/SF 는 제외. DP/E/OUT/안타류는 산입.
      if (!["BB", "HBP", "SF"].includes(resolvedType)) myBox.ab++;
      if (resolvedType === "K") myBox.k++;
      if (resolvedType === "BB") myBox.bb++;
      if (resolvedType === "HBP") myBox.hbp = (myBox.hbp ?? 0) + 1;
      if (resolvedType === "SF")  myBox.sf  = (myBox.sf  ?? 0) + 1;
      if (resolvedType === "DP")  myBox.dp  = (myBox.dp  ?? 0) + 1;
      if (resolvedType === "E")   myBox.e   = (myBox.e   ?? 0) + 1;
      if (["1B","2B","3B","HR"].includes(resolvedType)) {
        myBox.h++;
        if (resolvedType === "2B") myBox.tb += 2;
        else if (resolvedType === "3B") myBox.tb += 3;
        else if (resolvedType === "HR") { myBox.hr++; myBox.tb += 4; }
        else myBox.tb += 1;
      }
      events.push({ inning, type: resolvedType, role: "batter" });
    }
    if (isMainPit) {
      myPbox.pa = (myPbox.pa ?? 0) + 1;
      if (resolvedType === "K") myPbox.pK++;
      if (resolvedType === "BB") myPbox.pBB++;
      if (resolvedType === "HBP") myPbox.pHbp = (myPbox.pHbp ?? 0) + 1;
      if (["1B","2B","3B","HR"].includes(resolvedType)) myPbox.pH++;
      if (resolvedType === "HR") myPbox.pHR++;
      events.push({ inning, type: resolvedType, role: "pitcher" });
    }

    const ab = applyResult(resolvedType, bases, batter);
    runs += ab.runs;
    bases = ab.bases;
    outs += ab.outsAdded;

    if (isMainPit) {
      // 자책점: 실책으로 인한 출루는 비자책. 그 외 실점은 자책 처리.
      // 단순화 — 실책 출루 발생 후 같은 이닝 추가 실점도 일단 자책 처리 (정확한 ER 룰은 복잡).
      const earned = resolvedType === "E" ? 0 : ab.runs;
      myPbox.er = (myPbox.er ?? 0) + earned;
    }
  }
  return runs;
}

function applyResult(type, bases, batter) {
  let runs = 0;
  let outsAdded = 0;
  let newBases = [...bases];
  const newRunner = makeRunner(batter);

  switch (type) {
    case "K":
    case "OUT":
      outsAdded = 1;
      break;
    case "BB":
    case "HBP": {
      // 1루 출루 + 강제진루
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) runs++;
          newBases[2] = newBases[1];
        }
        newBases[1] = newBases[0];
      }
      newBases[0] = newRunner;
      break;
    }
    case "E":
    case "1B": {
      // 모든 주자 1루씩 진루 (단순화)
      if (newBases[2]) { runs++; newBases[2] = null; }
      if (newBases[1]) { newBases[2] = newBases[1]; newBases[1] = null; }
      if (newBases[0]) { newBases[1] = newBases[0]; newBases[0] = null; }
      newBases[0] = newRunner;
      break;
    }
    case "2B": {
      if (newBases[2]) { runs++; newBases[2] = null; }
      if (newBases[1]) { runs++; newBases[1] = null; }
      if (newBases[0]) { newBases[2] = newBases[0]; newBases[0] = null; }
      newBases[1] = newRunner;
      break;
    }
    case "3B": {
      runs += newBases.filter(Boolean).length;
      newBases = [null, null, newRunner];
      break;
    }
    case "HR": {
      runs += newBases.filter(Boolean).length + 1;
      newBases = [null, null, null];
      break;
    }
    case "SF": {
      // 희생플라이: 아웃 + 3루 주자 득점
      outsAdded = 1;
      if (newBases[2]) { runs++; newBases[2] = null; }
      break;
    }
    case "DP": {
      // 병살: 타자 + 1루 주자 동시 아웃. 단순화 — 3루 주자 진루 없음.
      outsAdded = 2;
      newBases[0] = null;
      break;
    }
  }
  return { runs, outsAdded, bases: newBases };
}

// 수비팀 평균 defense — 실책 굴림에 사용. lineup 의 야수 9명 평균.
function teamDefenseRating(lineup) {
  if (!lineup || lineup.length === 0) return 50;
  let sum = 0, n = 0;
  for (const e of lineup) {
    const d = (e.batter?.defense ?? e.defense);
    if (d != null) { sum += d; n++; }
  }
  return n > 0 ? sum / n : 50;
}

// 승부치기/ghost runner — speed 정보 필요해서 합리적인 중간값 runner 객체로.
function ghostRunner() {
  return { isMain: false, speed: 55 };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
