// 경기 자동 시뮬레이션 (Phase 1: POV 없이 결과만)
// 9이닝 × 양팀 약 36타석. 매치업 공식으로 결과 산출.
// 동점/연장은 리그별 규정에 따름 — STAGE_RULES 참조.

import { getTeamById } from "./league.js";
import { npcOverall } from "./npc.js";
import { getEffectiveBatter, getEffectivePitcher, BATTER_STATS, PITCHER_STATS, emptyStats, MAIN_INJURY_LUCK } from "./player.js";

// HBP 부상 — 실제 야구에서 사구로 부상 가는 비율은 매우 낮음(<<1% per HBP).
// 게임은 박진감을 위해 5% 베이스, 단 주인공은 MAIN_INJURY_LUCK(0.4x) 적용해 실효 2%.
const HBP_INJURY_RATE = 0.05;

function rollHbpSeverity() {
  const r = Math.random();
  if (r < 0.65) return { weeksLeft: 1, severity: "minor" };
  if (r < 0.92) return { weeksLeft: 3, severity: "moderate" };
  return { weeksLeft: 8, severity: "severe" };
}

// 리그별 동점/연장 규정 (2026 기준, WebSearch 결과 기반)
//   regulation:     정규 이닝
//   maxExtra:       최대 연장 이닝 수 (Infinity = 결판날 때까지)
//   tiebreaker:     연장 진입 시 시작 베이스 (null이면 정상 룰)
//                   { fromInning, runners: [1루, 2루, 3루] }
//   tieAllowed:     true면 maxExtra 후 동점 시 무승부 인정
//   mercyRule:      콜드게임 임계 — [{ afterInning, diff }, ...] 또는 null.
//                   해당 이닝 종료 시점 점수차가 diff 이상이면 즉시 종료.
const STAGE_RULES = {
  // 한국 고교 — 본 게임은 토너먼트 진행이므로 사실상 결승 외에도 무승부 없음.
  // 단, league.schedule 의 일반 경기는 주말리그(권역 풀리그) 시뮬레이션으로 무승부 허용.
  // 한국 고교야구는 5회 10점, 7회 7점 콜드게임 (KBSA 규정 단순화).
  high:        { regulation: 9, maxExtra: 3,        tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: true,  mercyRule: [{afterInning: 5, diff: 10}, {afterInning: 7, diff: 7}] },
  high_final:  { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: false, mercyRule: null },
  // 한국 대학 (U-리그/주말리그) — 정규는 무승부 즉시, 결승만 승부치기. 콜드게임 동일.
  univ:        { regulation: 9, maxExtra: 0,        tiebreaker: null,                                              tieAllowed: true,  mercyRule: [{afterInning: 5, diff: 10}, {afterInning: 7, diff: 7}] },
  univ_final:  { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: false, mercyRule: null },
  // KBO 1군 — 2026 시즌 부터 10~12회 승부치기, 12회 후 무승부. 콜드게임 없음.
  pro1:        { regulation: 9, maxExtra: 3,        tiebreaker: { fromInning: 10, runners: [true, true, false] }, tieAllowed: true,  mercyRule: null },
  pro1_final:  { regulation: 9, maxExtra: 6,        tiebreaker: null,                                              tieAllowed: true,  mercyRule: null },
  // KBO 퓨처스 (2군) — 연장 없이 9회 후 즉시 무승부.
  pro2:        { regulation: 9, maxExtra: 0,        tiebreaker: null,                                              tieAllowed: true,  mercyRule: null },
  // 일본 NPB — 12회까지, 정상 연장 (승부치기 없음).
  japan:       { regulation: 9, maxExtra: 3,        tiebreaker: null,                                              tieAllowed: true,  mercyRule: null },
  japan_final: { regulation: 9, maxExtra: 6,        tiebreaker: null,                                              tieAllowed: true,  mercyRule: null },
  // MLB — 10회부터 2루 ghost runner, 무승부 없음.
  mlb:         { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false, mercyRule: null },
  mlb_final:   { regulation: 9, maxExtra: Infinity, tiebreaker: null,                                              tieAllowed: false, mercyRule: null },
  // MLB 마이너 — 메이저와 동일 룰.
  mlb_aaa:     { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false, mercyRule: null },
  mlb_aa:      { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false, mercyRule: null },
  mlb_a:       { regulation: 9, maxExtra: Infinity, tiebreaker: { fromInning: 10, runners: [false, true, false] }, tieAllowed: false, mercyRule: null },
};

// 콜드게임 체크 — 해당 이닝 종료 시점 점수차로 굴림.
function isMercyTriggered(mercyRule, inning, homeScore, awayScore) {
  if (!mercyRule) return false;
  const diff = Math.abs(homeScore - awayScore);
  for (const rule of mercyRule) {
    if (inning >= rule.afterInning && diff >= rule.diff) return true;
  }
  return false;
}

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
  // 큰 격차일수록 추가 감쇄 — 30 OVR 차이가 비현실적 ERA 폭증 만들던 문제 완화.
  // softDiff(x): |x|>15 부터 점점 평탄화. 30 격차도 효과 18 정도로 묶임.
  function softDiff(x) {
    const sign = x < 0 ? -1 : 1;
    const a = Math.abs(x);
    if (a <= 15) return x;
    return sign * (15 + (a - 15) * 0.4);
  }
  const contactDiff = softDiff(contact - stuffAvg);
  const eyeDiff     = softDiff(eye - control);

  const r = Math.random() * 100;

  // 계수 감쇄 (0.4→0.28, 0.15→0.10, 0.35→0.24, 0.5→0.30) — 실제 야구 매치업 spread (.150 AVG) 에 가깝게.
  const kChance = clamp(22 - contactDiff * 0.28 - eyeDiff * 0.10, 5, 38);
  const bbChance = clamp(9 + eyeDiff * 0.22, 3, 22);
  const hbpChance = clamp(1.0 - (control - 50) * 0.03, 0.3, 3.0);

  if (r < kChance) return { type: "K" };
  if (r < kChance + bbChance) return { type: "BB" };
  if (r < kChance + bbChance + hbpChance) return { type: "HBP" };

  const inPlayHitChance = clamp(30 + contactDiff * 0.24, 20, 52);
  const r2 = Math.random() * 100;
  if (r2 < inPlayHitChance) {
    const r3 = Math.random() * 100;
    const powerDiff = softDiff(power - velocity);
    const hrChance = clamp(powerDiff * 0.30 + 4, 1, 18);
    const tripleChance = 1.5;
    const doubleChance = clamp(powerDiff * 0.22 + 10, 5, 20);
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
  const roles = mainPlayer && playerTeam ? decideRolesForGame(mainPlayer, playerTeam) : { bat: false, pitch: false };

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
  // 양팀 mound 상태 (현재 등판 + 사용한 투수 풀)
  const homeMound = createMoundState(home, homePitcher);
  const awayMound = createMoundState(away, awayPitcher);
  // 결승투수 결정용 — 결승점이 들어온 시점의 양팀 투수.
  // homeAhead/awayAhead 가 바뀐 마지막 시점에 lockIn.
  let leadHistory = []; // [{ inning, leadingTeam: 'home'|'away'|'tie', leadingPitcher, trailingPitcher }]
  let coldGame = false;
  // 정규 이닝 완료 후엔 매 이닝 끝마다 결판 체크. tieAllowed=false 이고 max 도달했는데도 동점이면 추가로 이어감.
  for (let inning = 1; inning <= maxInning; inning++) {
    const useTiebreaker = rule.tiebreaker && inning >= rule.tiebreaker.fromInning;
    const initialBases = useTiebreaker
      ? rule.tiebreaker.runners.map(b => b ? ghostRunner() : null)
      : [null, null, null];

    // away 공격 = home 수비. defending mound = homeMound, defSide = "home".
    const awayRuns = playHalfInning(awayLineup, homeMound, myBoxBatter, myBoxPitcher, events, () => {
      const b = awayLineup[awayBatterIdx % awayLineup.length];
      awayBatterIdx++;
      return b;
    }, inning, [...initialBases], homeDefense, "home", () => ({ home: homeScore, away: awayScore }));
    awayScore += awayRuns;
    awayInnings.push(awayRuns);
    recordLead(leadHistory, inning, homeScore, awayScore, homeMound, awayMound);

    // 끝내기: 정규 마지막 이닝 이상 + 홈 리드면 9말(또는 그 이상 말) 생략
    if (inning >= rule.regulation && homeScore > awayScore) {
      homeInnings.push(null);
      break;
    }

    // home 공격 = away 수비. defending mound = awayMound, defSide = "away".
    const homeRuns = playHalfInning(homeLineup, awayMound, myBoxBatter, myBoxPitcher, events, () => {
      const b = homeLineup[homeBatterIdx % homeLineup.length];
      homeBatterIdx++;
      return b;
    }, inning, [...initialBases], awayDefense, "away", () => ({ home: homeScore, away: awayScore }));
    homeScore += homeRuns;
    homeInnings.push(homeRuns);
    recordLead(leadHistory, inning, homeScore, awayScore, homeMound, awayMound);

    // 콜드게임 — 이닝 종료 시 점수차 임계. 결승전(mercyRule=null)에는 미적용.
    if (isMercyTriggered(rule.mercyRule, inning, homeScore, awayScore)) {
      coldGame = true;
      events.push({ inning, type: "COLD_GAME", role: "system", runsScored: 0 });
      break;
    }

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

  // ── 결승투수 결정 (W/L/SV) ──
  // 마지막으로 lead 가 결정된 시점의 양팀 투수가 W/L. SV 는 winning team 의 마지막 투수.
  let winningPitcher = null, losingPitcher = null, savingPitcher = null;
  if (winner) {
    const lastLead = leadHistory.slice().reverse().find(h => h.leadingTeam !== "tie");
    if (lastLead) {
      winningPitcher = lastLead.leadingPitcher;
      losingPitcher = lastLead.trailingPitcher;
    }
    // 세이브: winning team 마지막 등판이 결승투수와 다르고 + 1이닝(3 outs) 이상 + 리드 3점 이내
    const winMound = (winner === home) ? homeMound : awayMound;
    const cur = winMound.current;
    if (cur && winningPitcher && cur.id !== winningPitcher.id) {
      const ps = winMound.pitcherStats.get(cur.id);
      const diff = Math.abs(homeScore - awayScore);
      if (ps && ps.outsRecorded >= 3 && diff <= 3) savingPitcher = cur;
    }
  }
  // 메인의 W/L/SV — myBoxPitcher 에 누적
  if (winningPitcher?.isMain) myBoxPitcher.w = (myBoxPitcher.w ?? 0) + 1;
  if (losingPitcher?.isMain)  myBoxPitcher.l = (myBoxPitcher.l ?? 0) + 1;
  if (savingPitcher?.isMain)  myBoxPitcher.sv = (myBoxPitcher.sv ?? 0) + 1;

  // 게임에 등판한 NPC pitcher ID — week.js 가 휴식 카운터 reset 용.
  const usedNpcPitcherIds = [...homeMound.usedIds, ...awayMound.usedIds].filter(id => id !== -1);

  return {
    home: { team: home, score: homeScore, pitcher: homePitcher.name, innings: homeInnings },
    away: { team: away, score: awayScore, pitcher: awayPitcher.name, innings: awayInnings },
    winner: winner ? winner.name : null,
    coldGame,
    usedNpcPitcherIds,
    mainPlayer: (roles.bat || roles.pitch) ? {
      roles,
      batterBox: roles.bat ? myBoxBatter : null,
      pitcherBox: roles.pitch ? myBoxPitcher : null,
      events,
      hbpInjury: myBoxBatter?._hbpInjury ?? null,
      // 메인이 강판됐는지 — myBoxPitcher.ipOuts < 27(9이닝) 이면 강판 OR 게임 조기 종료(콜드/끝내기).
      pitcherReplaced: roles.pitch && (myBoxPitcher.ipOuts ?? 0) < 27 && !coldGame
                        && !(homeScore !== awayScore && (homeInnings.length < 9 || awayInnings.length < 9)),
    } : null,
  };
}

// 마지막 lead 변경 시점 + 그 시점 양팀 투수 추적 (W/L 결정용).
function recordLead(history, inning, homeScore, awayScore, homeMound, awayMound) {
  let leadingTeam = "tie";
  if (homeScore > awayScore) leadingTeam = "home";
  else if (awayScore > homeScore) leadingTeam = "away";
  const prev = history[history.length - 1];
  if (!prev || prev.leadingTeam !== leadingTeam) {
    history.push({
      inning,
      leadingTeam,
      leadingPitcher: leadingTeam === "home" ? homeMound.current
                     : leadingTeam === "away" ? awayMound.current : null,
      trailingPitcher: leadingTeam === "home" ? awayMound.current
                      : leadingTeam === "away" ? homeMound.current : null,
    });
  }
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

// 출장 룰:
//   - 타자: 부상 아니면 매 경기 무조건 출장 (양방향 주전 가정)
//   - 투수: 휴식 기반 베이스 확률 × 코치판단 곱
//     실제 5선발 로테이션 모방 — SP 는 4-5일 휴식 후 등판.
//     시즌 78게임 × 평균 등판률 ~20% = 시즌당 ~15-20회 등판 (KBO 선발 26-30회 의 비례)
//   - 코치판단: 메인 pitcher OVR vs 팀 SP 평균 OVR 비율로 감쇄.
function pitcherChanceByRest(restGames) {
  if (restGames <= 0) return 0;
  if (restGames === 1) return 0.05;  // 직후 — 거의 X (긴급 구원만)
  if (restGames === 2) return 0.20;  // 짧은 휴식
  if (restGames === 3) return 0.55;  // 정상 휴식 시작
  if (restGames === 4) return 0.85;  // 4일 휴식 — SP 정상
  return 1.0;                        // 5일+ — 풀 휴식
}

// 코치판단 — 0~1. 1 = 정상 등판, 0.15 = 거의 안 등판.
// 실제 야구 현실 반영: 약체 선발도 시즌 등판은 한다 (5선발 로테이션, 결과 나쁘면 단축 등판).
// 결승전 압살 방지는 라이브 모달 결승 분기에서만 강하게 작동, 일반 시즌은 완만.
function coachJudgment(player, team) {
  if (!team || !Array.isArray(team.roster)) return 1;
  const mainOvr = pitcherOVR(player);
  if (!isFinite(mainOvr)) return 0.15;
  const sps = team.roster.filter(p =>
    p.role === "pitcher" && p.pos === "SP" && !p.injury && p.pitcher
  );
  if (sps.length === 0) return 1;
  const ovrs = sps.map(p => npcOverall(p)).filter(v => isFinite(v));
  if (ovrs.length === 0) return 1;
  const avgSpOvr = ovrs.reduce((s, v) => s + v, 0) / ovrs.length;
  if (!isFinite(avgSpOvr) || avgSpOvr <= 0) return 1;
  const ratio = mainOvr / avgSpOvr;
  if (!isFinite(ratio)) return 0.15;
  if (ratio >= 1.10) return 1.00;  // 에이스 수준 — 무조건 등판
  if (ratio >= 0.95) return 0.90;  // 거의 동급 — 정상 등판
  if (ratio >= 0.80) return 0.70;  // 약간 약체 — 자주 등판
  if (ratio >= 0.65) return 0.45;  // 약체 — 절반 정도
  if (ratio >= 0.50) return 0.25;  // 더 약체 — 가끔
  return 0.10;                     // 극단 약체 — 드물게라도 등판
}

// UI 표시용 — 현재 출장 확률 (0~1). team 생략 시 코치판단 = 1.
export function appearanceChance(player, team = null) {
  if (player.injury) return { bat: 0, pitch: 0 };
  const restGames = player.gamesSinceLastPitch ?? 99;
  const judgment = coachJudgment(player, team);
  return { bat: 1, pitch: pitcherChanceByRest(restGames) * judgment };
}

function decideRolesForGame(player, team) {
  if (player.injury) return { bat: false, pitch: false };
  const restGames = player.gamesSinceLastPitch ?? 99;
  const restChance = pitcherChanceByRest(restGames);
  const judgment = coachJudgment(player, team);
  return {
    bat: true,
    pitch: Math.random() < restChance * judgment,
  };
}

function buildLineup(team, mainPlayerForBat) {
  // 부상 NPC 제외. 9명 못 채우면 부상자도 넣어서 강행 (드문 케이스).
  const healthy = team.roster.filter(p => p.role === "batter" && !p.injury);
  const fallback = team.roster.filter(p => p.role === "batter" && p.injury);
  const ordered = [...healthy.sort((a, b) => npcOverall(b) - npcOverall(a)), ...fallback];
  const lineup = ordered.slice(0, 9);
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
  // 휴식 카운터 우선 — 1게임+ 쉰 SP 중 OVR 최고. 모두 0(직전 등판)이면 가장 오래 쉰 순.
  const sps = team.roster.filter(p => p.role === "pitcher" && p.pos === "SP" && !p.injury);
  sps.sort((a, b) => {
    const aFresh = (a.gamesSinceLastPitch ?? 99) >= 1 ? 1 : 0;
    const bFresh = (b.gamesSinceLastPitch ?? 99) >= 1 ? 1 : 0;
    if (aFresh !== bFresh) return bFresh - aFresh;
    return npcOverall(b) - npcOverall(a);
  });
  if (sps[0]) return sps[0];
  // 부상 없는 SP 없음 → RP / 마지막 보루로 부상자
  return team.roster.find(p => p.role === "pitcher" && !p.injury)
      ?? team.roster.find(p => p.role === "pitcher");
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

// 마운드 상태 — 현재 등판 + 사용한 투수 목록 + 투수별 누적 (PA/허용 점수/잡은 outs).
// W/L/SV 결정용으로 currentByInning 도 추적.
function createMoundState(team, startingPitcher) {
  const usedIds = new Set([startingPitcher.id]);
  return {
    team,
    current: startingPitcher,
    usedIds,
    pitcherStats: new Map(), // id -> {paFaced, runsAllowed, outsRecorded}
  };
}

function getPstats(mound) {
  let s = mound.pitcherStats.get(mound.current.id);
  if (!s) { s = { paFaced: 0, runsAllowed: 0, outsRecorded: 0 }; mound.pitcherStats.set(mound.current.id, s); }
  return s;
}

// 강판 굴림. 이닝 시작 또는 PA 후 호출.
// trigger: "start"(이닝 시작) | "midInning"(PA 직후 위기) | "highLeverage"(7회+ 클로저)
function shouldReplacePitcher(mound, inning, leadDiff, isWinning, trigger) {
  const cur = mound.current;
  const s = getPstats(mound);
  if (cur.isMain) {
    // 메인 강판 — 후하게. PA 30+ OR 허용 6점+ OR (PA 25+ AND 허용 5점+).
    if (s.paFaced >= 30) return true;
    if (s.runsAllowed >= 6) return true;
    if (s.paFaced >= 25 && s.runsAllowed >= 5) return true;
    return false;
  }
  // NPC 강판
  if (trigger === "midInning") {
    // 위기 — 1이닝에 5점 이상 줬으면 즉시 강판
    return s.runsAllowed >= 5 && s.paFaced - 0 >= 6;
  }
  // 이닝 시작 시 일반 강판
  if (s.paFaced >= 25) return true;
  if (s.runsAllowed >= 6) return true;
  // 7회+ 리드 3점 이내 → 클로저 등판
  if (inning >= 7 && isWinning && leadDiff <= 3 && leadDiff >= 0) {
    const hasFreshRP = mound.team.roster.some(p =>
      p.role === "pitcher" && p.pos === "RP" && !p.injury &&
      !mound.usedIds.has(p.id) && (p.gamesSinceLastPitch ?? 99) >= 1
    );
    if (hasFreshRP) return true;
  }
  return false;
}

function pickReliever(mound) {
  const candidates = mound.team.roster.filter(p =>
    p.role === "pitcher" && !p.injury && !mound.usedIds.has(p.id)
  );
  // 휴식 1게임+ 우선. 그 다음 RP 우선. 그 다음 OVR.
  candidates.sort((a, b) => {
    const aRest = (a.gamesSinceLastPitch ?? 99) >= 1 ? 1 : 0;
    const bRest = (b.gamesSinceLastPitch ?? 99) >= 1 ? 1 : 0;
    if (aRest !== bRest) return bRest - aRest;
    const aRP = a.pos === "RP" ? 1 : 0;
    const bRP = b.pos === "RP" ? 1 : 0;
    if (aRP !== bRP) return bRP - aRP;
    return npcOverall(b) - npcOverall(a);
  });
  // 부상 없는 후보 전혀 없으면 부상자라도 강행 — fallback
  if (candidates.length === 0) {
    const anyone = mound.team.roster.find(p => p.role === "pitcher");
    return anyone ?? mound.current;
  }
  return candidates[0];
}

function tryReplace(mound, inning, leadDiff, isWinning, trigger, events) {
  if (!shouldReplacePitcher(mound, inning, leadDiff, isWinning, trigger)) return false;
  const newP = pickReliever(mound);
  if (!newP || newP === mound.current || newP.id === mound.current.id) return false;
  events.push({
    inning, type: "PIT_CHANGE", role: "system",
    from: mound.current.name, to: newP.name,
    fromIsMain: !!mound.current.isMain, toIsMain: !!newP.isMain,
    sideIsPlayer: !!mound.team.isPlayerTeam,
    runsScored: 0,
  });
  mound.current = newP;
  mound.usedIds.add(newP.id);
  return true;
}

function playHalfInning(battingLineup, mound, myBox, myPbox, events, nextBatter,
                       inning, initialBases, defenseRating, defSide, getScores) {
  let outs = 0;
  let runs = 0;
  let bases = initialBases ? [...initialBases] : [null, null, null];

  // 이닝 시작 강판 굴림
  {
    const sc = getScores();
    const isWinning = (defSide === "home") ? sc.home > sc.away : sc.away > sc.home;
    const leadDiff = (defSide === "home") ? sc.home - sc.away : sc.away - sc.home;
    tryReplace(mound, inning, leadDiff, isWinning, "start", events);
  }

  while (outs < 3) {
    const pitcher = mound.current;
    const pStats = pitcher.pitcher ?? pitcher;
    const isMainPit = pitcher.isMain;

    // ─ 도루 phase (타석 전) ─ 1루 주자 → 2루 도루만 처리.
    const steal = attemptSteal(bases, pStats);
    if (steal.attempted) {
      const r1 = steal.runner;
      if (steal.success) {
        bases[1] = r1;
        bases[0] = null;
        if (r1.isMain) { myBox.sb = (myBox.sb ?? 0) + 1; events.push({ inning, type: "SB", role: "batter", runsScored: 0 }); }
      } else {
        bases[0] = null;
        outs++;
        if (isMainPit) { myPbox.ipOuts = (myPbox.ipOuts ?? 0) + 1; }
        getPstats(mound).outsRecorded++;
        if (r1.isMain) { myBox.cs = (myBox.cs ?? 0) + 1; events.push({ inning, type: "CS", role: "batter", runsScored: 0 }); }
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

    // 만루 여부 — 만루 홈런 검출용. applyResult 호출 전 캡처.
    const basesLoadedBeforeAB = !!(bases[0] && bases[1] && bases[2]);

    // HBP 부상 굴림 — 메인은 myBox._hbpInjury 에 stash, NPC 는 즉시 injury 부여
    if (resolvedType === "HBP") {
      const rate = isMainBat ? HBP_INJURY_RATE * MAIN_INJURY_LUCK : HBP_INJURY_RATE;
      if (Math.random() < rate) {
        const inj = rollHbpSeverity();
        if (isMainBat) {
          myBox._hbpInjury = { ...inj };
        } else {
          batter.injury = { weeksLeft: inj.weeksLeft, severity: inj.severity };
        }
      }
    }

    const ab = applyResult(resolvedType, bases, batter);
    runs += ab.runs;
    bases = ab.bases;
    outs += ab.outsAdded;

    // 메인 outs 누적 (강판 후 NPC 던지면 안 누적)
    if (isMainPit) myPbox.ipOuts = (myPbox.ipOuts ?? 0) + ab.outsAdded;

    // 마운드 누적 (강판 굴림용)
    const ps = getPstats(mound);
    ps.paFaced += 1;
    ps.runsAllowed += ab.runs;
    ps.outsRecorded += ab.outsAdded;

    // 타자 통계 누적 (메인)
    if (isMainBat) {
      myBox.pa++;
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
        else if (resolvedType === "HR") {
          myBox.hr++;
          myBox.tb += 4;
          // 만루 홈런 검출 — 마일스톤 토스트용
          if (basesLoadedBeforeAB) myBox.gs = (myBox.gs ?? 0) + 1;
        }
        else myBox.tb += 1;
      }
      myBox.rbi = (myBox.rbi ?? 0) + (ab.rbi ?? 0);
      events.push({ inning, type: resolvedType, role: "batter", runsScored: ab.runs });
    }
    // R 추적 — 베이스 isMain 주자 + HR 시 본인.
    if (ab.scoredRunners) {
      for (const r of ab.scoredRunners) {
        if (r?.isMain) myBox.r = (myBox.r ?? 0) + 1;
      }
    }

    // 투수 통계 누적 (메인)
    if (isMainPit) {
      myPbox.pa = (myPbox.pa ?? 0) + 1;
      if (resolvedType === "K") myPbox.pK++;
      if (resolvedType === "BB") myPbox.pBB++;
      if (resolvedType === "HBP") myPbox.pHbp = (myPbox.pHbp ?? 0) + 1;
      if (["1B","2B","3B","HR"].includes(resolvedType)) myPbox.pH++;
      if (resolvedType === "HR") myPbox.pHR++;
      // 자책점: 실책 출루는 비자책.
      const earned = resolvedType === "E" ? 0 : ab.runs;
      myPbox.er = (myPbox.er ?? 0) + earned;
      events.push({ inning, type: resolvedType, role: "pitcher", runsScored: ab.runs });
    }

    // PA 직후 위기 강판 굴림 — 같은 이닝 안에 NPC 들어와서 다음 타자부터 던지게.
    if (outs < 3) {
      const sc = getScores();
      const isWinning = (defSide === "home") ? sc.home > sc.away : sc.away > sc.home;
      const leadDiff = (defSide === "home") ? sc.home - sc.away : sc.away - sc.home;
      tryReplace(mound, inning, leadDiff, isWinning, "midInning", events);
    }
  }
  return runs;
}

function applyResult(type, bases, batter) {
  let outsAdded = 0;
  let rbi = 0;
  let newBases = [...bases];
  const newRunner = makeRunner(batter);
  // 어떤 주자가 홈을 밟았는지 추적 — R 카운트와 isMain 체크용.
  const scoredRunners = [];

  switch (type) {
    case "K":
    case "OUT":
      outsAdded = 1;
      break;
    case "BB":
    case "HBP": {
      // 1루 출루 + 강제진루. 만루였다면 3루 주자 1명 강제득점 → RBI.
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) { scoredRunners.push(newBases[2]); rbi++; }
          newBases[2] = newBases[1];
        }
        newBases[1] = newBases[0];
      }
      newBases[0] = newRunner;
      break;
    }
    case "1B": {
      if (newBases[2]) { scoredRunners.push(newBases[2]); newBases[2] = null; rbi++; }
      if (newBases[1]) { newBases[2] = newBases[1]; newBases[1] = null; }
      if (newBases[0]) { newBases[1] = newBases[0]; newBases[0] = null; }
      newBases[0] = newRunner;
      break;
    }
    case "E": {
      // 1B 와 같은 진루지만 실책이라 RBI 없음.
      if (newBases[2]) { scoredRunners.push(newBases[2]); newBases[2] = null; }
      if (newBases[1]) { newBases[2] = newBases[1]; newBases[1] = null; }
      if (newBases[0]) { newBases[1] = newBases[0]; newBases[0] = null; }
      newBases[0] = newRunner;
      break;
    }
    case "2B": {
      if (newBases[2]) { scoredRunners.push(newBases[2]); newBases[2] = null; rbi++; }
      if (newBases[1]) { scoredRunners.push(newBases[1]); newBases[1] = null; rbi++; }
      if (newBases[0]) { newBases[2] = newBases[0]; newBases[0] = null; }
      newBases[1] = newRunner;
      break;
    }
    case "3B": {
      for (const r of newBases) { if (r) { scoredRunners.push(r); rbi++; } }
      newBases = [null, null, newRunner];
      break;
    }
    case "HR": {
      for (const r of newBases) { if (r) { scoredRunners.push(r); rbi++; } }
      newBases = [null, null, null];
      // 본인도 홈 — RBI 1, R 트래킹용으로도 newRunner 추가.
      scoredRunners.push(newRunner);
      rbi++;
      break;
    }
    case "SF": {
      // 희생플라이: 아웃 + 3루 주자 득점 + RBI.
      outsAdded = 1;
      if (newBases[2]) { scoredRunners.push(newBases[2]); newBases[2] = null; rbi++; }
      break;
    }
    case "DP": {
      // 병살: 타자 + 1루 주자 동시 아웃. 단순화 — 3루 주자 진루 없음, RBI 없음.
      outsAdded = 2;
      newBases[0] = null;
      break;
    }
  }
  return { runs: scoredRunners.length, outsAdded, bases: newBases, scoredRunners, rbi };
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
