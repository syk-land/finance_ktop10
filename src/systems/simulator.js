// 경기 자동 시뮬레이션 (Phase 1: POV 없이 결과만)
// 9이닝 × 양팀 약 36타석. 매치업 공식으로 결과 산출.
// 동점/연장은 리그별 규정에 따름 — STAGE_RULES 참조.

import { getTeamById } from "./league.js";
import { npcOverall } from "./npc.js";
import { getEffectiveBatter, getEffectivePitcher, BATTER_STATS, PITCHER_STATS, emptyStats, MAIN_INJURY_LUCK, conditionInjuryMultiplier } from "./player.js";
import { effectMultiplier, effectAdd } from "./traitEffects.js";
import { pickPitch, handMatchupPenalty } from "./pitches.js";

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
// opts.walkoffMult / opts.walkoffAddPct: 9회+ home bottom + 메인 batter 시 inPlayHitChance 부스트.
//   - walkoffMult: 곱연산 (clutch trait ×2)
//   - walkoffAddPct: %p 가산 (lucky_bat relic +5%p)
// opts.handPenalty: 좌/우 매치업 contactDiff 패널티 (같은 손 -3, 그 외 0). 호출자에서 계산.
// opts.leverage:  고압 상황도(0~1). 투수 mental(클러치) 발동 강도. 0이면 멘탈 무영향.
// opts.pitcherPA: 현재 등판 투수가 이 타석 전까지 상대한 누적 타자수. 투수 stamina(지구력) 감쇄용.
function simulateAtBat(batter, pitcher, opts = {}) {
  const { walkoffMult = 1, walkoffAddPct = 0, handPenalty = 0, leverage = 0, pitcherPA = 0 } = opts;
  const b = batter;
  const p = pitcher;
  const contact = (b.contact ?? 50) + handPenalty;  // 같은 손이면 contact 살짝 감쇄
  const power   = b.power ?? 50;
  const eye     = b.eye ?? 50;
  const speed   = b.speed ?? 50;   // 3루타(주력 의존) 산출용
  const velocity = p.velocity ?? 50;
  const control  = p.control ?? 50;
  const breaking = p.breaking ?? 50;

  // 투수 stamina(지구력) — 등판 후 누적 타자수가 스태미나 기반 용량을 넘으면 구위·제구 저하.
  //   capacity: stamina 50=18타자, 100=27, 150=36. 초과분 12타자에 걸쳐 overwork 0→1.
  //   fatiguePenalty: stuffAvg·control 에서 최대 -12 (지친 투수는 안타·볼넷·사구 ↑).
  const stamina = p.stamina ?? 50;
  const capacity = 18 + (stamina - 50) * 0.18;
  const overwork = clamp((pitcherPA - capacity) / 12, 0, 1);
  const fatiguePenalty = overwork * 12;

  // 투수 mental(클러치) — 고압 상황(leverage)에서만 위기관리로 작동.
  //   고멘탈: 안타/홈런/볼넷 억제(침착). 저멘탈: 멘탈붕괴로 실점↑. leverage=0 이면 무영향.
  const mental = p.mental ?? 50;
  const mentalEdge = leverage > 0 ? (mental - 50) * leverage : 0;

  const stuffAvg   = (velocity + breaking) / 2 - fatiguePenalty;
  const effControl = control - fatiguePenalty;
  // 큰 격차일수록 추가 감쇄 — 30 OVR 차이가 비현실적 ERA 폭증 만들던 문제 완화.
  // softDiff(x): |x|>15 부터 점점 평탄화. 30 격차도 효과 18 정도로 묶임.
  function softDiff(x) {
    const sign = x < 0 ? -1 : 1;
    const a = Math.abs(x);
    if (a <= 15) return x;
    return sign * (15 + (a - 15) * 0.4);
  }
  const contactDiff = softDiff(contact - stuffAvg);
  const eyeDiff     = softDiff(eye - effControl);

  const r = Math.random() * 100;

  // 계수 감쇄 — 실제 야구 매치업 spread 에 가깝게. (기초타율 보정: kChance 22→21, inPlay 30→33 으로 50v50 AVG ~.250)
  // mentalEdge: 고압 상황에서 고멘탈 투수는 볼넷↓ (clamp 전 가산).
  const kChance = clamp(21 - contactDiff * 0.28 - eyeDiff * 0.10, 5, 38);
  const bbChance = clamp(9 + eyeDiff * 0.22 - mentalEdge * 0.04, 3, 22);
  const hbpChance = clamp(1.0 - (effControl - 50) * 0.03, 0.3, 3.0);

  if (r < kChance) return { type: "K" };
  if (r < kChance + bbChance) return { type: "BB" };
  if (r < kChance + bbChance + hbpChance) return { type: "HBP" };

  // 끝내기 부스트 — clutch ×2 (multiplier) + lucky_bat +5%p (flat). 9회+ 메인 home batter 한정.
  // mentalEdge: 고압 상황에서 고멘탈 투수는 인플레이 안타 억제.
  let inPlayHitChance = clamp(33 + contactDiff * 0.24 - mentalEdge * 0.08, 20, 55);
  if (walkoffMult !== 1 || walkoffAddPct !== 0) {
    inPlayHitChance = clamp(inPlayHitChance * walkoffMult + walkoffAddPct, 20, 95);
  }
  const r2 = Math.random() * 100;
  if (r2 < inPlayHitChance) {
    const r3 = Math.random() * 100;
    const powerDiff = softDiff(power - velocity);
    // mentalEdge: 고압 상황에서 고멘탈 투수는 장타(홈런) 억제.
    const hrChance = clamp(powerDiff * 0.30 + 4 - mentalEdge * 0.04, 1, 18);
    // 3루타 — 주력 의존(현실에서 가장 발 빠른 타구). 느림 0.5% ~ 빠름 ~4%.
    const tripleChance = clamp((speed - 50) * 0.04 + 0.9, 0.3, 4);
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
// opts.errorMult: 실책 확률 곱셈 (메인이 수비 측이고 golden_glove relic 보유 시 0.5).
function classifyOut(batter, bases, outs, defenseRating, opts = {}) {
  const { errorMult = 1 } = opts;
  const contact = batter.contact ?? 50;
  const power   = batter.power ?? 50;
  const speed   = batter.speed ?? 50;

  // 실책 출루(E) — 수비 낮을수록 + 컨택 높을수록 (강한 타구). 베이스라인 ~1.5%.
  const eChance = clamp(((contact - defenseRating) * 0.08 + 1.5) * errorMult, 0.1, 7);
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

// ─────── 대타(PH) / 대주자(PR) ───────

// 라인업 상태 — 타순 인덱스 + 벤치 + 교체 추적. 대타/대주자가 lineup/bench 를 직접 변형.
function makeLineupState(lineup, bench, side, isPlayerTeam, mainBenchEntry, track) {
  return {
    lineup,
    bench: [...bench],
    side,
    isPlayerTeam,
    mainBenchEntry,
    mainUsed: false,
    idx: 0,
    subbedSlots: new Set(),
    track,
  };
}

function entryBatterOVR(e) {
  const b = e?.batter;
  if (!b) return 0;
  return ((b.contact ?? 50) + (b.power ?? 50) + (b.eye ?? 50) + (b.speed ?? 50) + (b.defense ?? 50)) / 5;
}
function entrySpeed(e) { return e?.batter?.speed ?? 50; }

function bestBenchBat(bench) {
  let best = null, bestOvr = -1;
  for (const e of bench) {
    const o = entryBatterOVR(e);
    if (o > bestOvr) { bestOvr = o; best = e; }
  }
  return best;
}
function fastestBench(bench) {
  let best = null, bestSp = -1;
  for (const e of bench) {
    const s = entrySpeed(e);
    if (s > bestSp) { bestSp = s; best = e; }
  }
  return best;
}
function removeFromBench(ls, entry) {
  const i = ls.bench.indexOf(entry);
  if (i >= 0) ls.bench.splice(i, 1);
  if (ls.mainBenchEntry === entry) ls.mainBenchEntry = null;
}

// 타순에서 다음 타자 — 대타 굴림 후 반환.
function takeNextBatter(ls, ctx) {
  const n = ls.lineup.length;
  const slot = ls.idx % n;
  ls.idx++;
  maybePinchHit(ls, slot, ctx);
  return ls.lineup[slot];
}

// 대타 — 후반(7회+):
//   플레이어 팀: 벤치에 밀린 메인을 대타로 투입해 참여 보장.
//   그 외: 접전(3점차 이내)에서 약한 타순을 벤치 최고타자로 교체.
// 한 타순은 한 번만 교체 (재출장 없음). 메인이 선발이면 도중에 빼지 않음.
function maybePinchHit(ls, slot, ctx) {
  if (ctx.inning < 7) return;
  if (ls.subbedSlots.has(slot)) return;
  const cur = ls.lineup[slot];
  if (cur.isMain) return;

  if (ls.isPlayerTeam && ls.mainBenchEntry && !ls.mainUsed) {
    // 강타자를 일찍 빼지 않도록 — 약한 타순 우선, 단 8회부터는 데드라인으로 무조건 투입.
    const avg = lineupAvgOVR(ls.lineup);
    if (ctx.inning >= 8 || entryBatterOVR(cur) <= avg) {
      performSub(ls, slot, cur, ls.mainBenchEntry, ctx, "PH");
    }
    return;
  }
  if (Math.abs(ctx.leadDiff) > 3) return;
  const best = bestBenchBat(ls.bench);
  if (best && entryBatterOVR(best) >= entryBatterOVR(cur) + 5) {
    performSub(ls, slot, cur, best, ctx, "PH");
  }
}

function lineupAvgOVR(lineup) {
  if (!lineup.length) return 50;
  let s = 0;
  for (const e of lineup) s += entryBatterOVR(e);
  return s / lineup.length;
}

function performSub(ls, slot, cur, sub, ctx, type) {
  removeFromBench(ls, sub);
  ls.lineup[slot] = sub;
  ls.subbedSlots.add(slot);
  if (sub.isMain) {
    ls.mainUsed = true;
    if (ls.track) { ls.track.pinchHit = true; ls.track.batted = true; ls.track.slot = slot; }
  }
  ctx.events.push({
    inning: ctx.inning, type, role: "system",
    from: cur.name, to: sub.name,
    fromIsMain: !!cur.isMain, toIsMain: !!sub.isMain,
    sideIsPlayer: ls.isPlayerTeam, runsScored: 0,
  });
}

// 대주자 — 후반(7회+) 접전에서 베이스의 느린 주자를 빠른 벤치 주자로 교체.
//   플레이어 팀: 벤치 메인이 더 빠르면 메인 우선 투입.
//   메인 주자/이미 교체된 주자(_pr)는 건드리지 않음. 한 PA 당 1명만.
function maybePinchRun(ls, bases, ctx) {
  if (ctx.inning < 7 || Math.abs(ctx.leadDiff) > 3) return;
  for (let i = 0; i < 3; i++) {
    const r = bases[i];
    if (!r || r.isMain || r._pr) continue;
    let sub = null;
    if (ls.isPlayerTeam && ls.mainBenchEntry && !ls.mainUsed
        && entrySpeed(ls.mainBenchEntry) >= (r.speed ?? 50) + 8) {
      sub = ls.mainBenchEntry;
    } else {
      const cand = fastestBench(ls.bench);
      if (cand && entrySpeed(cand) >= (r.speed ?? 50) + 12) sub = cand;
    }
    if (!sub) continue;
    removeFromBench(ls, sub);
    const isMainSub = !!sub.isMain;
    if (isMainSub) {
      ls.mainUsed = true;
      if (ls.track) ls.track.pinchRun = true;
    }
    bases[i] = { isMain: isMainSub, speed: entrySpeed(sub), _pr: true };
    ctx.events.push({
      inning: ctx.inning, type: "PR", role: "system",
      from: r.name ?? "", to: sub.name,
      fromIsMain: false, toIsMain: isMainSub,
      sideIsPlayer: ls.isPlayerTeam, runsScored: 0,
    });
    return;
  }
}

// 한 경기 전체 시뮬레이션
// 양방향 선수: 부상 아니면 매 경기 타자로 라인업 + 선발 투수로 등판.
// opts.forcedRoles 가 주어지면 그대로 사용 (결승/PO 진입 모달에서 미리 굴린 결과 전달용).
export function simulateGame(league, gameDef, mainPlayer, opts = {}) {
  const home = getTeamById(league, gameDef.home);
  const away = getTeamById(league, gameDef.away);

  const playerTeam = mainPlayer && (home.isPlayerTeam ? home : away.isPlayerTeam ? away : null);
  const mainTeamSide = playerTeam === home ? "home" : (playerTeam === away ? "away" : null);
  const roles = opts.forcedRoles
    ? { bat: !!opts.forcedRoles.bat, pitch: !!opts.forcedRoles.pitch,
        pitchRole: opts.forcedRoles.pitchRole ?? (opts.forcedRoles.pitch ? "SP" : null) }
    : (mainPlayer && playerTeam ? decideRolesForGame(mainPlayer, playerTeam) : { bat: false, pitch: false, pitchRole: null });

  // 메인 참여 추적 — 선발/대타/대주자/구원 여부 (반환 객체 batStatus/pitchStatus 용).
  const mainTrack = { batted: false, started: false, pinchHit: false, pinchRun: false, pitched: false, slot: null };

  const homeBuilt = buildLineup(home, (playerTeam === home && roles.bat) ? mainPlayer : null, mainTrack);
  const awayBuilt = buildLineup(away, (playerTeam === away && roles.bat) ? mainPlayer : null, mainTrack);
  const homeLineup = homeBuilt.lineup;
  const awayLineup = awayBuilt.lineup;

  // 선발 투수 — 메인은 pitchRole "SP" 일 때만 선발.
  const homePitcher = pickStartingPitcher(home, (playerTeam === home && roles.pitchRole === "SP") ? mainPlayer : null);
  const awayPitcher = pickStartingPitcher(away, (playerTeam === away && roles.pitchRole === "SP") ? mainPlayer : null);
  // 메인 구원 등판 — pitchRole "RP" 면 해당 팀 불펜에 추가 후보로 주입.
  const mainReliefEntry = (roles.pitchRole === "RP" && mainPlayer) ? asReliefEntry(mainPlayer) : null;

  // 라인업 상태 (대타/대주자 교체 추적) — 양팀.
  const homeLS = makeLineupState(homeLineup, homeBuilt.bench, "home", !!home.isPlayerTeam, homeBuilt.mainBenchEntry, mainTrack);
  const awayLS = makeLineupState(awayLineup, awayBuilt.bench, "away", !!away.isPlayerTeam, awayBuilt.mainBenchEntry, mainTrack);

  const myBoxBatter = emptyStats();
  const myBoxPitcher = emptyStats();
  const events = []; // {role, type, desc}

  let homeScore = 0;
  let awayScore = 0;
  const homeInnings = [];
  const awayInnings = [];

  const rule = getStageRule(league.stage);
  const maxInning = rule.regulation + (rule.maxExtra === Infinity ? 999 : rule.maxExtra);
  // 수비팀 평균 defense — 실책(E) 굴림에 사용
  const homeDefense = teamDefenseRating(homeLineup);
  const awayDefense = teamDefenseRating(awayLineup);
  // 양팀 mound 상태 (현재 등판 + 사용한 투수 풀 + 메인 구원 후보)
  const homeMound = createMoundState(home, homePitcher, (playerTeam === home && mainReliefEntry) ? mainReliefEntry : null);
  const awayMound = createMoundState(away, awayPitcher, (playerTeam === away && mainReliefEntry) ? mainReliefEntry : null);
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
    const awayRuns = playHalfInning(awayLS, homeMound, myBoxBatter, myBoxPitcher, events,
       inning, [...initialBases], homeDefense, "home", () => ({ home: homeScore, away: awayScore }),
       mainTeamSide, mainPlayer, rule);
    awayScore += awayRuns;
    awayInnings.push(awayRuns);
    recordLead(leadHistory, inning, homeScore, awayScore, homeMound, awayMound);

    // 끝내기: 정규 마지막 이닝 이상 + 홈 리드면 9말(또는 그 이상 말) 생략
    if (inning >= rule.regulation && homeScore > awayScore) {
      homeInnings.push(null);
      break;
    }

    // home 공격 = away 수비. defending mound = awayMound, defSide = "away".
    const homeRuns = playHalfInning(homeLS, awayMound, myBoxBatter, myBoxPitcher, events,
       inning, [...initialBases], awayDefense, "away", () => ({ home: homeScore, away: awayScore }),
       mainTeamSide, mainPlayer, rule);
    const homeScoreBeforeBottom = homeScore;
    homeScore += homeRuns;
    homeInnings.push(homeRuns);
    recordLead(leadHistory, inning, homeScore, awayScore, homeMound, awayMound);

    // 끝내기(walkoff) 검출 — 정규 이닝 이상 bottom 에서 홈팀이 동점/뒤짐을 깨고 리드.
    // 메인이 홈팀 + 이번 half 마지막 메인 PA 가 결승점이면 walkoff 플래그.
    if (inning >= rule.regulation && homeScoreBeforeBottom <= awayScore && homeScore > awayScore && home.isPlayerTeam) {
      // 이번 half 마지막 메인 batter 이벤트를 찾아 walkoff 표시
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.inning !== inning) break;
        if (ev.role === "batter" && (ev.runsScored ?? 0) > 0) {
          ev.walkoff = true;
          break;
        }
      }
    }

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

  // 메인 등판 확정 — PA 1개 이상 잡았으면 등판한 것 (선발이든 구원이든).
  if ((myBoxPitcher.pa ?? 0) > 0) mainTrack.pitched = true;

  return {
    home: { team: home, score: homeScore, pitcher: homePitcher.name, innings: homeInnings },
    away: { team: away, score: awayScore, pitcher: awayPitcher.name, innings: awayInnings },
    winner: winner ? winner.name : null,
    coldGame,
    usedNpcPitcherIds,
    mainPlayer: (roles.bat || roles.pitch) ? {
      roles,
      // 메인 참여 형태 — UI 표시용.
      //   bat: "starter" | "pinchHit" | "pinchRun" | "none"
      //   pitch: "starter" | "relief" | "none"
      batStatus: mainTrack.pinchHit ? "pinchHit" : mainTrack.pinchRun ? "pinchRun" : mainTrack.started ? "starter" : "none",
      pitchStatus: mainTrack.pitched ? (roles.pitchRole === "RP" ? "relief" : "starter") : "none",
      batterBox: roles.bat ? myBoxBatter : null,
      // 구원 후보였지만 실제 등판 안 했으면(PA 0) 박스 미표시.
      pitcherBox: (roles.pitch && (myBoxPitcher.pa ?? 0) > 0) ? myBoxPitcher : null,
      events,
      hbpInjury: myBoxBatter?._hbpInjury ?? null,
      // 메인이 타석/대타로 선 경우의 1-indexed 타순 (3 → "3번")
      lineupSlot: mainTrack.slot != null ? mainTrack.slot + 1 : null,
      // 강판 판정은 선발 등판에만 의미 — myBoxPitcher.ipOuts < 27(9이닝) 이면 강판 OR 조기 종료.
      pitcherReplaced: roles.pitchRole === "SP" && (myBoxPitcher.ipOuts ?? 0) < 27 && !coldGame
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
// 실제 야구 현실 반영: 약체 선발도 시즌 등판은 한다 (5선발 로테이션).
// 포스트시즌은 라운드별 SP 깊이 제한 적용 (실제 야구의 단기 시리즈 패턴):
//   gateType="championship" (KS/WS, 아마추어 결승) → 1~3등 SP 만 등판
//   gateType="po_long"      (po/cs, 5-7전 시리즈)  → 1~4등 SP
//   gateType="po_short"     (wc/spo/ds, 단기)      → 1~5등 SP
//   gateType=null (일반 경기) → 비율 기반 (5선발 로테이션 시뮬)
function coachJudgment(player, team, options = {}) {
  if (!team || !Array.isArray(team.roster)) return 1;
  const mainOvr = pitcherOVR(player);
  if (!isFinite(mainOvr)) return 0.15;
  const sps = team.roster.filter(p =>
    p.role === "pitcher" && p.pos === "SP" && !p.injury && p.pitcher
  );
  if (sps.length === 0) return 1;
  const ovrs = sps.map(p => npcOverall(p)).filter(v => isFinite(v));
  if (ovrs.length === 0) return 1;

  // 포스트시즌 라운드 — rank cutoff. main 보다 OVR 높은 SP 수 + 1 = 메인의 rank.
  if (options.gateType) {
    const aboveCount = ovrs.filter(v => v > mainOvr).length;
    const rank = aboveCount + 1;
    const cutoff =
      options.gateType === "championship" ? 3
      : options.gateType === "po_long"    ? 4
      : options.gateType === "po_short"   ? 5
      : 99;
    return rank <= cutoff ? 1.0 : 0;
  }

  // 일반 시즌 경기 — 비율 기반.
  const avgSpOvr = ovrs.reduce((s, v) => s + v, 0) / ovrs.length;
  if (!isFinite(avgSpOvr) || avgSpOvr <= 0) return 1;
  const ratio = mainOvr / avgSpOvr;
  if (!isFinite(ratio)) return 0.15;
  if (ratio >= 1.10) return 1.00;  // 에이스 수준 — 무조건 등판
  if (ratio >= 0.95) return 0.90;  // 거의 동급 — 정상 등판
  if (ratio >= 0.80) return 0.70;  // 약간 약체 — 자주 등판
  if (ratio >= 0.65) return 0.45;  // 약체 — 절반 정도
  if (ratio >= PITCH_SKIP_RATIO) return 0.25;  // 더 약체 — 가끔
  return 0;                        // 리그 기준 이하 — 등판 안 함 (타자 올인 빌드 등)
}

// 컷오프 — 메인의 투구 OVR 이 팀 SP 평균의 이 비율 미만이면 등판 0.
// 타격 올인 빌드(예: MLB 에서 투구 70 vs 선발 평균 150)가 마운드에 끌려나가는 것 방지.
const PITCH_SKIP_RATIO = 0.50;

// 선발 탈락 시 불펜 등판 확률 — 휴식 충분할 때만, 낮게.
// "수준이하라 선발엔 못 들지만 불펜으로는 교체출장" 케이스.
function reliefChance(restGames) {
  if (restGames < 1) return 0;       // 직전 등판 — 연투 회피
  if (restGames === 1) return 0.08;
  return 0.14;                       // 2일+ 휴식
}

// UI 표시용 — 현재 출장 확률 (0~1). team 생략 시 코치판단 = 1.
// pitch 는 선발 + 구원 합산 추정.
export function appearanceChance(player, team = null) {
  if (player.injury) return { bat: 0, pitch: 0 };
  const restGames = player.gamesSinceLastPitch ?? 99;
  const judgment = coachJudgment(player, team);
  const startP = pitcherChanceByRest(restGames) * judgment;
  // 컷오프(judgment=0)면 구원도 0 — 마운드에 아예 안 올라감.
  const reliefP = judgment > 0 ? (1 - startP) * reliefChance(restGames) : 0;
  return { bat: 1, pitch: clamp(startP + reliefP, 0, 1) };
}

// options.gateType: "championship" | "po_long" | "po_short" | null
// 포스트시즌 진입 모달이 round 정보를 알기에 호출지가 결정해서 전달.
// 결승/PO 에서 cutoff 밖이면 선발 차단 (구원도 미적용 — 단기 시리즈 SP 깊이 보존).
// 반환: { bat, pitch, pitchRole } — pitchRole: "SP" | "RP" | null.
export function decideRolesForGame(player, team, options = {}) {
  if (player.injury) return { bat: false, pitch: false, pitchRole: null };
  const restGames = player.gamesSinceLastPitch ?? 99;
  const restChance = pitcherChanceByRest(restGames);
  const judgment = coachJudgment(player, team, options);
  let pitchRole = null;
  if (Math.random() < restChance * judgment) {
    pitchRole = "SP";                                                   // 선발 등판
  } else if (!options.gateType && judgment > 0 && Math.random() < reliefChance(restGames)) {
    pitchRole = "RP";                                                   // 선발 탈락 → 불펜 구원 (컷오프면 제외)
  }
  return { bat: true, pitch: pitchRole != null, pitchRole };
}

// 라인업 구성 — 팀 내 상대평가로 선발 9명 결정.
//   건강한 야수 + (있다면) 메인을 OVR 기준 한 풀에서 정렬해 상위 9명만 선발.
//   메인이 9위 밖이면 선발 제외 → bench 로 빠지고 후반 대타/대주자 후보가 된다.
//   부상자는 최후 충원용 (9명 못 채울 때만).
// 반환: { lineup, mainSlot, mainStarted, bench, mainBenchEntry }
function buildLineup(team, mainPlayerForBat, mainTrack = null) {
  const healthy = team.roster.filter(p => p.role === "batter" && !p.injury);
  const injured = team.roster.filter(p => p.role === "batter" && p.injury);

  const pool = healthy.map(p => ({ entry: p, ovr: npcOverall(p), isMain: false }));
  let mainOvr = null;
  if (mainPlayerForBat) {
    const b = mainPlayerForBat.batter;
    mainOvr = (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
    pool.push({ entry: null, ovr: mainOvr, isMain: true });
  }
  pool.sort((a, b) => b.ovr - a.ovr);

  let starters = pool.slice(0, 9);
  const benchPool = pool.slice(9);
  // 9명 미달 시 부상자로 강행 충원.
  if (starters.length < 9) {
    const fill = injured.map(p => ({ entry: p, ovr: npcOverall(p), isMain: false }));
    starters = [...starters, ...fill].slice(0, 9);
  }

  const npcStarters = starters.filter(x => !x.isMain).map(x => x.entry);
  const mainInStarters = starters.some(x => x.isMain);

  let lineup, mainSlot = null, mainStarted = false, mainBenchEntry = null;
  if (mainInStarters) {
    mainStarted = true;
    mainSlot = mainOvr > 60 ? 3 : mainOvr > 50 ? 4 : 6;
    mainSlot = Math.min(mainSlot, npcStarters.length);   // npcStarters 는 8명 — 안전 클램프
    lineup = [...npcStarters];
    lineup.splice(mainSlot, 0, asLineupEntry(mainPlayerForBat));
    lineup = lineup.slice(0, 9);
    if (mainTrack) { mainTrack.started = true; mainTrack.batted = true; mainTrack.slot = mainSlot; }
  } else {
    lineup = npcStarters.slice(0, 9);
    if (mainPlayerForBat) mainBenchEntry = asLineupEntry(mainPlayerForBat);
  }

  // 벤치 — 선발 못 든 건강 야수 (OVR desc). 메인 벤치 엔트리는 별도 전달.
  const bench = benchPool.filter(x => !x.isMain).map(x => x.entry);

  return { lineup, mainSlot, mainStarted, bench, mainBenchEntry };
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
// 메인 구원 등판용 엔트리 — pos RP, 중간계투(MR) 취급.
function asReliefEntry(mainPlayer) {
  return {
    id: -1,
    name: mainPlayer.name,
    role: "pitcher",
    pos: "RP",
    bullpenRole: "MR",
    isMain: true,
    pitcher: getEffectivePitcher(mainPlayer),
  };
}

// 마운드 상태 — 현재 등판 + 사용한 투수 목록 + 투수별 누적 (PA/허용 점수/잡은 outs).
// W/L/SV 결정용으로 currentByInning 도 추적.
function createMoundState(team, startingPitcher, mainReliever = null) {
  const usedIds = new Set([startingPitcher.id]);
  return {
    team,
    current: startingPitcher,
    usedIds,
    // 로스터 밖 구원 후보 (메인이 pitchRole RP 일 때). pickReliever 가 풀에 합산.
    extraRelievers: mainReliever ? [mainReliever] : [],
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
  // 강판 임계를 stamina(지구력) 용량에 연동 — 고스태미나 투수는 더 오래 던진다.
  //   capacity = simulateAtBat 와 동일식. stamina 50 에서 메인 30·NPC 25 (기존값과 일치).
  const stam = cur.pitcher?.stamina ?? cur.stamina ?? 50;
  const capacity = 18 + (stam - 50) * 0.18;
  if (cur.isMain) {
    // 메인 강판 — 후하게. PA (capacity+12)+ OR 허용 6점+ OR (PA (capacity+7)+ AND 허용 5점+).
    const pullPA = Math.round(capacity + 12);
    if (s.paFaced >= pullPA) return true;
    if (s.runsAllowed >= 6) return true;
    if (s.paFaced >= pullPA - 5 && s.runsAllowed >= 5) return true;
    return false;
  }
  // NPC 강판
  if (trigger === "midInning") {
    // 위기 — 1이닝에 5점 이상 줬으면 즉시 강판
    return s.runsAllowed >= 5 && s.paFaced - 0 >= 6;
  }
  // 이닝 시작 시 일반 강판 — PA (capacity+7)+ (stamina 50 → 25).
  if (s.paFaced >= Math.round(capacity + 7)) return true;
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

// 구원 투수 선택 — 상황별 역할 우선.
//   세이브 상황(승리 중 + 리드 1~3): 9회+ → 마무리(CL), 8회 → 셋업(SU)
//   그 외: 휴식 충분 + 중간계투(MR) 우선, SP 는 후순위, 마무리는 세이브 외엔 아껴둠.
// 후보 풀 = 팀 로스터 투수 + 메인 구원 후보(extraRelievers), 이미 등판(usedIds) 제외.
function pickReliever(mound, ctx = {}) {
  const pool = [
    ...mound.team.roster.filter(p => p.role === "pitcher" && !p.injury),
    ...(mound.extraRelievers ?? []),
  ].filter(p => !mound.usedIds.has(p.id));

  const save = !!ctx.isWinning && ctx.leadDiff >= 1 && ctx.leadDiff <= 3;
  let preferRole = null;
  if (save && (ctx.inning ?? 0) >= 9) preferRole = "CL";
  else if (save && ctx.inning === 8) preferRole = "SU";

  function score(p) {
    let s = 0;
    if ((p.gamesSinceLastPitch ?? 99) >= 1) s += 1000;       // 휴식 1게임+ 최우선
    if (preferRole && p.bullpenRole === preferRole) s += 500; // 상황 역할 매칭
    if (p.pos === "SP") s -= 300;                             // 선발은 구원으로 후순위
    else if (p.bullpenRole === "CL" && !save) s -= 200;       // 마무리는 세이브 외엔 아낌
    return s + npcOverall(p);
  }
  pool.sort((a, b) => score(b) - score(a));
  // 부상 없는 후보 전혀 없으면 부상자라도 강행 — fallback
  if (pool.length === 0) {
    const anyone = mound.team.roster.find(p => p.role === "pitcher");
    return anyone ?? mound.current;
  }
  return pool[0];
}

function tryReplace(mound, inning, leadDiff, isWinning, trigger, events) {
  if (!shouldReplacePitcher(mound, inning, leadDiff, isWinning, trigger)) return false;
  const newP = pickReliever(mound, { inning, leadDiff, isWinning });
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

function playHalfInning(ls, mound, myBox, myPbox, events,
                       inning, initialBases, defenseRating, defSide, getScores,
                       mainTeamSide = null, mainPlayer = null, rule = null) {
  let outs = 0;
  let runs = 0;
  let bases = initialBases ? [...initialBases] : [null, null, null];
  const regulation = rule?.regulation ?? 9;
  // 공격팀 리드 (양수=리드, 음수=뒤짐) — 대타/대주자 발동 판단용.
  function battingLeadDiff() {
    const sc = getScores();
    return defSide === "home" ? sc.away - sc.home : sc.home - sc.away;
  }

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

    // ─ 타석 ─ (대타 굴림 포함)
    const batter = takeNextBatter(ls, {
      inning, regulation, outs,
      leadDiff: battingLeadDiff(),
      runnersOn: bases.filter(Boolean).length,
      events,
    });
    const isMainBat = batter.isMain;
    const bStats = batter.batter ?? batter;

    // 회귀 효과 wiring:
    // - walkoff: 메인 batter + 9회+ + home bottom (defSide === "away") 시 inPlayHitChance 부스트.
    // - error:   메인 수비측 (defSide === mainTeamSide) 시 errorChance 감쇄.
    let walkoffMult = 1, walkoffAddPct = 0;
    if (isMainBat && mainPlayer && rule && inning >= rule.regulation && defSide === "away") {
      walkoffMult = effectMultiplier(mainPlayer, "walkoffChance");
      walkoffAddPct = effectAdd(mainPlayer, "walkoffChance", "flatAddPct");
    }
    let errorMult = 1;
    if (mainPlayer && mainTeamSide && defSide === mainTeamSide) {
      errorMult = effectMultiplier(mainPlayer, "errorChance");
    }
    // Phase 2: 좌/우 매치업 페널티 + 구종 선택.
    const handPenalty = handMatchupPenalty(batter.bats, pitcher.throws);
    const pitchType = pickPitch(pitcher);

    // 고압 상황도(leverage 0~1) — 투수 mental(클러치) 발동 강도.
    //   후반(7회+) × 점수 접전 × 득점권 주자. 평상시(초반/큰 점수차)엔 0 → 멘탈 무영향.
    const scLev = getScores();
    const margin = Math.abs(scLev.home - scLev.away);
    const lateness  = clamp((inning - 6) / 3, 0, 1);                  // 7회 0.33 → 9회 1.0
    const closeness = margin <= 1 ? 1 : margin === 2 ? 0.6 : margin === 3 ? 0.3 : 0;
    const risp      = (bases[1] || bases[2]) ? 0.25 : 0;             // 득점권 주자 가산
    const leverage  = clamp(lateness * (closeness + risp), 0, 1);
    // 현재 등판 투수가 이 타석 전까지 상대한 누적 타자수 — stamina(지구력) 감쇄용.
    const pitcherPA = getPstats(mound).paFaced;

    const raw = simulateAtBat(bStats, pStats, { walkoffMult, walkoffAddPct, handPenalty, leverage, pitcherPA });
    const resolvedType = raw.type === "OUT"
      ? classifyOut(bStats, bases, outs, defenseRating, { errorMult })
      : raw.type;

    // 만루 여부 — 만루 홈런 검출용. applyResult 호출 전 캡처.
    const basesLoadedBeforeAB = !!(bases[0] && bases[1] && bases[2]);

    // HBP 부상 굴림 — 메인은 myBox._hbpInjury 에 stash, NPC 는 즉시 injury 부여.
    // 메인은 컨디션 보정 적용 (낮은 컨디션 → 부상 확률 ↑).
    if (resolvedType === "HBP") {
      const mainCondMult = isMainBat && mainPlayer ? conditionInjuryMultiplier(mainPlayer.condition) : 1;
      const rate = isMainBat ? HBP_INJURY_RATE * MAIN_INJURY_LUCK * mainCondMult : HBP_INJURY_RATE;
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

    // ─ 대주자 굴림 ─ 출루 직후, 느린 주자를 빠른 벤치 주자로 교체 (후반 접전).
    maybePinchRun(ls, bases, { inning, leadDiff: battingLeadDiff(), events });

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
      events.push({ inning, type: resolvedType, role: "batter", runsScored: ab.runs, pitchType });
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
      events.push({ inning, type: resolvedType, role: "pitcher", runsScored: ab.runs, pitchType });
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
