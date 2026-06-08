// 커리어 분기 (Phase 1: 고교 1→2→3 학년만 처리)
// Phase 3에서 드래프트/콜업/해외진출 확장

import { state, pushLog } from "../state.js";
import { createLeague, ageUpLeague } from "./league.js";
import { createSeason } from "./week.js";
import { getTeamPool } from "../data/teams.js";
import { t, getLocale } from "../i18n/index.js";
import { resetGameDateForNewSeason } from "./tick.js";
import { overallScore, addFame, nationalTeamRating, roleOVRs } from "./player.js";
import { effectAdd } from "./traitEffects.js";

export function startHighSchoolCareer(playerName, talent, schoolName) {
  // 학교가 명시 안되면 현재 locale의 고교 풀에서 무작위 배정
  if (!schoolName) {
    const pool = getTeamPool("high", getLocale());
    schoolName = pool[Math.floor(Math.random() * pool.length)].name;
  }
  state.player.teamName = schoolName;
  state.player.stage = "high";
  state.league = createLeague("high", schoolName);
  state.season = createSeason("high");
  pushLog({ msg: t("log.careerStart", { school: schoolName }), kind: "good" });
}

// 시즌 종료 후 다음 시즌 시작 (Phase 1: 고교 내에서만)
// 호출 시점: advanceToNextSeason() 직후 (player.grade는 이미 +1 된 상태)
export function transitionAfterSeason() {
  const { player } = state;

  // 3학년 시즌까지 끝난 후엔 ageUp으로 grade=4가 됨 → 진로 선택 대기
  if (player.stage === "high" && player.grade > 3) {
    pushLog({ msg: t("log.graduation"), kind: "info" });
    state.season.finished = true;
    state.career = { awaitingPath: true };
    return { awaitingPath: true };
  }

  // 대학 4학년 시즌까지 끝난 후엔 졸업 → 다시 진로 선택 (프로/실업)
  if (player.stage === "univ" && player.grade > 4) {
    pushLog({ msg: t("log.graduation"), kind: "info" });
    state.season.finished = true;
    state.career = { awaitingPath: true, fromStage: "univ" };
    return { awaitingPath: true };
  }

  // 콜업 체크 (KBO 2군 → 1군 / MLB 마이너 각 단계 → 다음 단계)
  const promotion = checkPromotion(player);
  if (promotion) {
    const fromStage = player.stage;
    const pool = getTeamPool(promotion, getLocale());
    player.stage = promotion;
    player.teamName = teamForStageKeeping(pool, player);   // 같은 구단 풀이면 팀 유지 (2군→1군 등)
    player.gamesSinceLastPitch = 99;
    player.injury = null;
    resetGameDateForNewSeason(state.gameDate);
    state.league = createLeague(promotion, player.teamName);
    state.season = createSeason(promotion);
    pushLog({
      msg: t("log.promoted", { stage: t("stage." + promotion), team: player.teamName }),
      kind: "good",
    });
    return { ended: false, promoted: true, fromStage, toStage: promotion };
  }

  // 강등 체크 (노쇠 등으로 유지 임계 미달) — 콜업이 아닐 때만. 한 단계 하향 후 모달로 은퇴 선택 제공.
  const demotion = checkDemotion(player);
  if (demotion) {
    const fromStage = player.stage;
    const pool = getTeamPool(demotion, getLocale());
    player.stage = demotion;
    player.teamName = teamForStageKeeping(pool, player);   // 같은 구단 풀이면 팀 유지 (1군→2군 등)
    player.gamesSinceLastPitch = 99;
    player.injury = null;
    resetGameDateForNewSeason(state.gameDate);
    state.league = createLeague(demotion, player.teamName);
    state.season = createSeason(demotion);
    pushLog({
      msg: t("log.demoted", { stage: t("stage." + demotion), team: player.teamName }),
      kind: "bad",
    });
    return { ended: false, demoted: true, fromStage, toStage: demotion };
  }

  // 강제 은퇴(방출) — 최하위 단계 평균 이하 또는 연령 한계. 콜업/강등이 아닐 때만 도달.
  if (checkForcedRetirement(player)) {
    state.career = { ended: true, reason: "forcedRetire" };
    pushLog({ msg: t("log.forcedRetire"), kind: "bad" });
    return { ended: true, forcedRetire: true };
  }

  // 다음 학년 시작 — 캘린더도 3월 1일로 리셋 (year +1)
  resetGameDateForNewSeason(state.gameDate);
  // NPC 풀 carry-over: 나이 +1, 성장/노화, 졸업/은퇴, 신인 합류
  if (state.league && state.league.stage === player.stage) {
    ageUpLeague(state.league);
  } else {
    state.league = createLeague(player.stage, player.teamName);
  }
  state.season = createSeason(player.stage);
  // 고교/대학은 "{grade}학년", 프로·MLB 는 학년 개념이 없으므로 "만N세 시즌" (17학년 오표기 방지).
  const startMsg = (player.stage === "high" || player.stage === "univ")
    ? t("log.seasonStart", { team: player.teamName, grade: player.grade })
    : t("log.seasonStartPro", { team: player.teamName, age: player.age });
  pushLog({ msg: startMsg, kind: "info" });
  return { ended: false };
}

// 진로 종합 점수 — 능력치 평균 + 최고 능력치 보정 + 명성.
// FA 오퍼 강도, 드래프트 라운드, 메뉴 표시용. 명성이 영향 줄 수 있음 (의도).
// 콜업/MLB 진입 단계/MLB 오퍼는 promotionScore (실력만) 사용.
export function compositeScore(player) {
  const b = player.batter;
  const p = player.pitcher;
  const stats = [
    b.contact, b.power, b.eye, b.speed, b.defense,
    p.velocity, p.control, p.breaking, p.stamina, p.mental,
  ];
  const avg = stats.reduce((a, c) => a + c, 0) / stats.length;
  const max = Math.max(...stats);
  return avg + Math.max(0, max - 100) * 0.5 + (player.fame ?? 0) * 0.2;
}

// 실력 점수 — 능력치 평균만. fame, max bonus 제외.
// 콜업 사다리, MLB 진입 시작 단계, MLB 오퍼, 드래프트 stage 결정에 사용.
// 명성 높지만 실력 낮은 캐릭터가 메이저 직행하던 문제 해소.
export function promotionScore(player) {
  const b = player.batter;
  const p = player.pitcher;
  const stats = [
    b.contact, b.power, b.eye, b.speed, b.defense,
    p.velocity, p.control, p.breaking, p.stamina, p.mental,
  ];
  return stats.reduce((a, c) => a + c, 0) / stats.length;
}

// MLB 오퍼 산출 — 실력 점수(promotionScore) 임계별로 어느 강도의 팀에서 오퍼가 오는지.
// 반환: 매번 다른 오퍼 팀 배열 (풀 확대 + 랜덤). 점수 미달 시 빈 배열.
//
// 임계 / 오퍼 출처:
//   180+  → 상위 8팀 중 랜덤 3팀 (메이저 직행급)
//   145+  → 상위 12팀 중 랜덤 3팀
//   120+  → 8~20위 중 랜덤 2팀
//   100+  → 15~30위 중 랜덤 1팀
//   < 100 → 빈 배열 (오퍼 없음)
// 팀 명성 — strength 에서 도출(주인공 fame 스케일에 맞춤, 계수 4는 튜닝값).
// 명성 높은(강한) 팀은 명성 낮은 선수를 드래프트/영입하지 않는다(아래 게이트).
export function teamFame(team) {
  return Math.round((team?.strength ?? 60) * 4);
}

export function getMLBOffers(player) {
  const score = nationalTeamRating(player);
  if (score < 110) return [];                       // 자격 — 역할기반 rating 110+
  const pool = getTeamPool("mlb", getLocale());
  if (!pool || pool.length === 0) return [];
  // 팀 명성 > 주인공 명성이면 오퍼 안 함(콧대 높은 명문은 무명을 안 부름).
  const pfame = player.fame ?? 0;
  const sorted = [...pool].filter(t => teamFame(t) <= pfame).sort((a, b) => b.strength - a.strength);
  if (sorted.length === 0) return [];
  // 풀 크기에 비례한 구간 (MLB 풀이 작아도 동작) — rating 높을수록 상위팀.
  const n = sorted.length;
  if (score >= 165) return pickRandom(sorted.slice(0, Math.max(1, Math.ceil(n * 0.4))), 3);  // 상위권 강팀
  if (score >= 145) return pickRandom(sorted.slice(0, Math.max(1, Math.ceil(n * 0.6))), 3);
  if (score >= 128) return pickRandom(sorted.slice(Math.floor(n * 0.3)), 2);                 // 중위권
  return pickRandom(sorted.slice(Math.floor(n * 0.5)), 1);                                   // 하위권 1팀
}

// KBO→MLB 도전 자격 (실제 규정 모델):
//   해외 FA(9시즌+): 자유계약으로 MLB 직행 가능(구단 동의 불필요).
//   포스팅(7~8시즌): 구단 포스팅으로 도전(구단 동의는 단순화 — 항상 허용). 실력(getMLBOffers)에 따라 관심 구단.
//   KBO 1군(pro1) 에서만. offers 비면(저실력) 관심 구단 없음 → 도전 불가.
//   서비스 연수: player.kboSeasons (advanceToNextSeason 에서 KBO 시즌마다 누적).
export const MLB_POSTING_SEASONS = 7;
export const MLB_FA_SEASONS = 9;
export function checkMLBChallenge(player) {
  if (!player || player.stage !== "pro1") return null;
  // +1: 방금 끝난 시즌은 휴식기 후 advanceToNextSeason 에서 kboSeasons 에 더해진다. 이 체크는 그 전에
  // 일어나므로 방금 끝난 시즌을 포함해 판정(7시즌째 휴식기에 포스팅, 9시즌째에 해외FA).
  const seasons = (player.kboSeasons ?? 0) + 1;
  let type = null;
  if (seasons >= MLB_FA_SEASONS) type = "fa";
  else if (seasons >= MLB_POSTING_SEASONS) type = "posting";
  if (!type) return null;
  return { type, offers: getMLBOffers(player), kboSeasons: seasons };
}

// MLB 입단 시작 stage — promotionScore 에 따라 마이너 단계에서 시작.
// determineMLBStartStage 는 호출자가 이미 점수 계산했을 수 있어 score 직접 받음.
// 명성 영향 받지 않도록 호출지에서 promotionScore(player) 결과를 넘겨야 함.
// score 인자 = nationalTeamRating(player) 결과를 호출지에서 넘김.
export function determineMLBStartStage(score) {
  if (score >= 165) return "mlb";       // 메이저 직행 — 특출난 수준 (HS/대학 졸업으론 사실상 불가)
  if (score >= 145) return "mlb_aaa";
  if (score >= 128) return "mlb_aa";
  return "mlb_a";
}

// KBO 드래프트 결과 — 실력 점수(promotionScore) 기반 1군 / 2군 / 미지명 분기.
// round / signingBonus 는 라이브 모달용. signingBonus 단위는 만원.
//
// 회귀 효과 draftRound (calling_card 유물): round 가 N 칸 좋아짐 (숫자 감소). 1라운드 미만은 없으니 1 이 하한.
// 2군 round 도 동일하게 좋아져 1군 진입 가능 (round 1~2 면 자동 1군 승격).
export function kboDraft(player) {
  const score = nationalTeamRating(player);
  const ss = player.seasonStats ?? {};
  
  let batterPenalty = 0;
  let hasBatterStats = false;
  if ((ss.ab ?? 0) >= 40) {
    hasBatterStats = true;
    const obpNum = (ss.h ?? 0) + (ss.bb ?? 0) + (ss.hbp ?? 0);
    const obpDen = (ss.ab ?? 0) + (ss.bb ?? 0) + (ss.hbp ?? 0) + (ss.sf ?? 0);
    const obp = obpDen > 0 ? obpNum / obpDen : 0;
    const slg = ss.ab > 0 ? (ss.tb ?? 0) / ss.ab : 0;
    const ops = obp + slg;
    
    if (ops < 0.550) batterPenalty = 30;
    else if (ops < 0.650) batterPenalty = 15;
  }

  let pitcherPenalty = 0;
  let hasPitcherStats = false;
  if ((ss.pitchG ?? 0) >= 5 && (ss.ip ?? 0) >= 5) {
    hasPitcherStats = true;
    const era = (ss.er ?? 0) * 9 / ss.ip;
    
    if (era > 7.00) pitcherPenalty = 30;
    else if (era > 5.50) pitcherPenalty = 15;
  }

  // 이도류인 경우 두 포지션 중 성적이 더 좋은 쪽(감점이 더 작은 쪽)의 페널티를 따릅니다.
  let penalty = 0;
  if (hasBatterStats && hasPitcherStats) {
    penalty = Math.min(batterPenalty, pitcherPenalty);
  } else if (hasBatterStats) {
    penalty = batterPenalty;
  } else if (hasPitcherStats) {
    penalty = pitcherPenalty;
  }

  const finalScore = Math.max(0, score - penalty);
  
  let stage = null, round = null, signingBonus = 0;
  // 역할기반 rating(특출=강한쪽 / 쓸만=양방향). HS 졸업 rating: 무회귀 ~92, 풀투자 ~118.
  // 현실 반영: 신인은 거의 전원 2군 시작, 특출난 즉시전력만 1군 직행 → 2군서 콜업(138)으로 승격.
  if (finalScore >= 128)      { stage = "pro1"; round = 1; signingBonus = 50000; }  // 초특급 즉시전력 (매우 드묾)
  else if (finalScore >= 114) { stage = "pro1"; round = 2; signingBonus = 30000; }  // 특출 — 1군 직행 (풀투자급)
  else if (finalScore >= 100) { stage = "pro2"; round = 1; signingBonus = 18000; }  // 상위 지명 — 곧 콜업 후보
  else if (finalScore >= 86)  { stage = "pro2"; round = 3 + Math.floor(Math.random() * 2); signingBonus = 10000; }
  else if (finalScore >= 76)  { stage = "pro2"; round = 6 + Math.floor(Math.random() * 3); signingBonus = 5000; }

  // calling_card: round 가 좋아짐 (N 칸 감소). 1 라운드가 하한.
  const roundBoost = effectAdd(player, "draftRound", "boost");
  if (stage && round !== null && roundBoost > 0) {
    round = Math.max(1, round - roundBoost);
    // 2군이 round 1~2 로 들어오면 1군 진입 — 명함의 "한 단계 위" 의미
    if (stage === "pro2" && round <= 3) {
      stage = "pro1";
      signingBonus = Math.max(signingBonus, 10000);
    }
  }

  return {
    picked: stage != null,
    stage,
    round,
    signingBonus,
  };
}

function pickRandom(pool, n) {
  const arr = [...pool];
  const out = [];
  while (out.length < n && arr.length > 0) {
    const i = Math.floor(Math.random() * arr.length);
    out.push(arr.splice(i, 1)[0]);
  }
  return out;
}

// 진로 자격 판정 — 4 옵션: univ / kbo / mlb / retire
//   univ:   고교 졸업 시만 (대학 졸업자는 프로/은퇴)
//   kbo:    무조건 가능 (드래프트 결과는 별개 — 미지명 가능성 있음)
//   mlb:    MLB 오퍼가 있어야 가능
//   retire: 무조건 가능
export function eligibleCareerPaths(player) {
  const score = compositeScore(player);
  const mlbOffers = getMLBOffers(player);
  return {
    univ:   player.stage === "high",
    kbo:    true,
    mlb:    mlbOffers.length > 0,
    retire: true,
    score,
    mlbOffers,
  };
}

// 진로 선택 → stage 전환. 새 league + season 생성.
// targetStage: "univ" | "mlb" | "mlb_aaa" | "mlb_aa" | "mlb_a" | "pro1" | "pro2" | "retire"
// teamNameOverride: MLB 오퍼 수락 시 특정 팀 이름 직접 지정
export function transitionToStage(targetStage, teamNameOverride = null) {
  const { player } = state;
  if (targetStage === "retire") {
    state.career = { ended: true, reason: "retired" };
    pushLog({ msg: t("log.retired"), kind: "info" });
    return;
  }

  let chosenTeamName;
  if (teamNameOverride) {
    chosenTeamName = teamNameOverride;
  } else {
    const pool = getTeamPool(targetStage, getLocale());
    const pick = pickTeamForStage(pool, player);
    chosenTeamName = pick.name;
  }

  player.stage = targetStage;
  player.grade = 1;
  player.teamName = chosenTeamName;
  player.gamesSinceLastPitch = 99;
  player.injury = null;
  // 프로/MLB 진입 시 4년 계약. 학생(univ) 진학은 계약 없음.
  if (targetStage !== "univ" && targetStage !== "retire") {
    player.contract = { yearsLeft: 4 };
  }

  resetGameDateForNewSeason(state.gameDate);
  state.league = createLeague(targetStage, player.teamName);
  state.season = createSeason(targetStage);
  state.career = null;

  pushLog({
    msg: t("log.stageTransition", { stage: t("stage." + targetStage), team: player.teamName }),
    kind: "good",
  });
}

// 단계 이동 시 팀 결정 — 현재 팀이 새 단계의 팀 풀에 있으면 그대로 유지(같은 구단),
// 없으면(다른 리그로 이동 등) 새로 배정. KBO 2군↔1군 / MLB 마이너↔메이저는 같은 풀이라 구단 유지.
function teamForStageKeeping(pool, player) {
  const same = pool.find(t => t.name === player.teamName);
  return (same ?? pickTeamForStage(pool, player)).name;
}

function pickTeamForStage(pool, player) {
  const score = compositeScore(player);
  const sorted = [...pool].sort((a, b) => b.strength - a.strength);
  if (sorted.length === 0) throw new Error("empty team pool");
  if (score >= 100) return sorted[0];
  if (score >= 85)  return sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
  if (score >= 70)  return sorted[Math.floor(Math.random() * Math.ceil(sorted.length / 2))];
  return sorted[Math.floor(Math.random() * sorted.length)];
}

// FA 자격 — 프로 진입 후 계약 4년 만료. yearsLeft === 0 일 때 발동.
// 휴식기 직전 weekly.js 가 호출해 state.pendingFA 세팅.
export function checkFreeAgency(player) {
  if (!player.contract) return null;
  // 휴식기 진입(이 체크) 후 advanceToNextSeason 에서 yearsLeft 가 1 줄어든다. 즉 방금 끝난 시즌이
  // 계약 마지막 해(yearsLeft===1)면 이번 휴식기에 FA. (예전 ===0 은 +1시즌 늦게 발동하던 버그.)
  if (player.contract.yearsLeft > 1) return null;
  if (player.stage === "high" || player.stage === "univ" || player.stage === "retire") return null;
  const score = compositeScore(player);
  // FA 오퍼: compositeScore + fame 으로 결정. 점수 낮으면 잔류 권장 (오퍼 없음).
  const pool = getTeamPool(player.stage, getLocale());
  if (!pool || pool.length === 0) return { offers: [], canStay: true };
  // 팀 명성 > 주인공 명성이면 오퍼 제외(명문은 무명을 영입하지 않음).
  const pfame = player.fame ?? 0;
  const sorted = [...pool].filter(t => t.name !== player.teamName && teamFame(t) <= pfame)
                          .sort((a, b) => b.strength - a.strength);
  // 오퍼 수 제한 없음 — 점수가 높을수록 관심 구단이 늘고, 최상위는 전 구단이 오퍼.
  // 모달은 max-height+스크롤이라 오퍼가 많아도 표시 가능.
  let offers;
  const n = sorted.length;
  if (score >= 120)      offers = sorted;                                          // 전체 구단
  else if (score >= 100) offers = sorted.slice(0, Math.max(4, Math.ceil(n / 2)));  // 상위 절반(최소 4)
  else if (score >= 80)  offers = pickRandom(sorted, Math.min(3, n));              // 3팀
  else offers = [];
  return { offers, canStay: true, score };
}

// FA 결정 적용 — stay: 같은 팀 4년 재계약 / leave: 새 팀 4년 계약.
// 새 팀은 같은 stage 의 다른 팀. 명성/계약금 보너스도 같이 부여.
export function applyFreeAgencyDecision(player, decision, newTeamName = null) {
  // _faJustResolved: 이번 휴식기에 새로 4년 계약을 맺었으니, 같은 휴식기의 advanceToNextSeason
  // 에서 yearsLeft 를 깎지 않게 한다(재계약이 즉시 3년으로 줄던 버그 방지). advanceToNextSeason 에서 소비·해제.
  if (decision === "stay") {
    player.contract = { yearsLeft: 4 };
    player._faJustResolved = true;
    addFame(player, 5);  // 잔류 — 작은 명성 보너스
    return { stayed: true, teamName: player.teamName };
  }
  // leave — 새 팀 이적
  player.teamName = newTeamName ?? player.teamName;
  player.contract = { yearsLeft: 4 };
  player._faJustResolved = true;
  addFame(player, 12);  // 이적 — 큰 명성 보너스
  // 새 팀으로 league 재구성. 메인 stage 동일.
  state.league = createLeague(player.stage, player.teamName);
  return { stayed: false, teamName: player.teamName };
}

// 트레이드 동의권 임계 명성 — 이 값 미만이면 선수 동의 없이 구단이 일방 트레이드(자동 이적).
// 이 값 이상(어지간한 스타)이면 트레이드 모달로 수락/거절을 직접 선택.
export const TRADE_CONSENT_FAME = 50;

// 트레이드 굴림 — 휴식기 진입 시 낮은 확률로 다른 팀이 제안.
// 조건: 프로/MLB + 계약 잔여 1년 이상 (계약 중 트레이드만, 만료는 FA 분기).
// 8% 확률로 한 팀이 제안. 명성이 임계 이상이면 거절 가능(선수 동의권).
// 수락 시 계약 yearsLeft 그대로 인수 + 팀 변경.
export function maybeTradeOffer(player) {
  if (!player.contract || player.contract.yearsLeft <= 0) return null;
  if (player.stage === "high" || player.stage === "univ" || player.stage === "retire") return null;
  if (Math.random() > 0.08) return null;

  const pool = getTeamPool(player.stage, getLocale());
  if (!pool || pool.length < 2) return null;
  const candidates = pool.filter(t => t.name !== player.teamName);
  if (candidates.length === 0) return null;
  const fromTeam = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    fromTeam: fromTeam.name,
    yearsLeft: player.contract.yearsLeft,
  };
}

// 트레이드 수락 — 새 팀 이적, 계약 잔여 인수, 명성 +5, league 재구성.
export function applyTradeAccept(player, newTeamName) {
  player.teamName = newTeamName;
  // contract.yearsLeft 그대로 유지 — 계약 인수
  state.league = createLeague(player.stage, player.teamName);
  addFame(player, 5);
}

// 콜업 사다리 — AND 조건: (OVR 임계 만족) AND (성적 임계 만족)
const PROMOTION_LADDER = {
  pro2:    { next: "pro1",    minOVR: 138, minOPS: 0.900, maxERA: 3.00 },
  mlb_a:   { next: "mlb_aa",  minOVR: 130, minOPS: 0.850, maxERA: 3.50 },
  mlb_aa:  { next: "mlb_aaa", minOVR: 145, minOPS: 0.880, maxERA: 3.20 },
  mlb_aaa: { next: "mlb",     minOVR: 160, minOPS: 0.900, maxERA: 2.80 },
};

// 강등 사다리 — 유지 임계 OVR 미달 시 강등 (콜업 OVR과의 hysteresis 유지)
const DEMOTION_LADDER = {
  pro1:    { down: "pro2",    minKeepOVR: 118 },
  mlb:     { down: "mlb_aaa", minKeepOVR: 140 },
  mlb_aaa: { down: "mlb_aa",  minKeepOVR: 125 },
  mlb_aa:  { down: "mlb_a",   minKeepOVR: 110 },
};

export function checkDemotion(player) {
  const rule = DEMOTION_LADDER[player.stage];
  if (!rule) return null;
  const { bat, pit } = roleOVRs(player);
  const belowKeep = bat < rule.minKeepOVR && pit < rule.minKeepOVR;
  return belowKeep ? rule.down : null;
}

export function checkPromotion(player) {
  const rule = PROMOTION_LADDER[player.stage];
  if (!rule) return null;

  const { bat, pit } = roleOVRs(player);
  const ovrOk = bat >= rule.minOVR || pit >= rule.minOVR;
  if (!ovrOk) return null;

  const ss = player.seasonStats;
  if (!ss) return null;

  let statsOk = false;

  // 타자 성적 만족 여부 판정 (최소 50타수)
  if ((ss.ab ?? 0) >= 50) {
    const obpNum = (ss.h ?? 0) + (ss.bb ?? 0) + (ss.hbp ?? 0);
    const obpDen = (ss.ab ?? 0) + (ss.bb ?? 0) + (ss.hbp ?? 0) + (ss.sf ?? 0);
    const obp = obpDen > 0 ? obpNum / obpDen : 0;
    const slg = ss.ab > 0 ? (ss.tb ?? 0) / ss.ab : 0;
    const ops = obp + slg;
    if (ops >= rule.minOPS) statsOk = true;
  }

  // 투수 성적 만족 여부 판정 (최소 5경기, 1이닝 이상)
  if (!statsOk && (ss.pitchG ?? 0) >= 5 && (ss.ip ?? 0) >= 1) {
    const era = (ss.er ?? 0) * 9 / ss.ip;
    if (era <= rule.maxERA) statsOk = true;
  }

  return statsOk ? rule.next : null;
}

// 강제 은퇴(방출) — 최하위 단계(pro2/mlb_a)에서 노쇠로 기량이 떨어진 베테랑이 더 받아줄 팀이 없어 은퇴.
//   ★ 어린 유망주(2군에서 성장 중)는 제외 — 만 34세 이상 + 해당 단계 floor 미만일 때만.
//   + 연령 한계: 만 41세 이상은 기량과 무관히 현역 마감(NPC 도 40 전후 은퇴).
const FORCED_RETIRE_FLOOR = { pro2: 90, mlb_a: 100 };
const FORCED_RETIRE_MIN_AGE = 34;
export function checkForcedRetirement(player) {
  if (!player) return false;
  if (player.stage === "high" || player.stage === "univ" || player.stage === "retire") return false;
  const age = player.age ?? 0;
  if (age >= 41) return true;
  const floor = FORCED_RETIRE_FLOOR[player.stage];
  return floor != null && age >= FORCED_RETIRE_MIN_AGE && nationalTeamRating(player) < floor;
}
