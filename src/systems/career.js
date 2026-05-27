// 커리어 분기 (Phase 1: 고교 1→2→3 학년만 처리)
// Phase 3에서 드래프트/콜업/해외진출 확장

import { state, pushLog } from "../state.js";
import { createLeague, ageUpLeague } from "./league.js";
import { createSeason } from "./week.js";
import { getTeamPool } from "../data/teams.js";
import { t, getLocale } from "../i18n/index.js";
import { resetGameDateForNewSeason } from "./tick.js";
import { overallScore } from "./player.js";

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
    const pool = getTeamPool(promotion, getLocale());
    const pick = pickTeamForStage(pool, player);
    player.stage = promotion;
    player.teamName = pick.name;
    player.gamesSinceLastPitch = 99;
    player.injury = null;
    resetGameDateForNewSeason(state.gameDate);
    state.league = createLeague(promotion, player.teamName);
    state.season = createSeason(promotion);
    pushLog({
      msg: t("log.promoted", { stage: t("stage." + promotion), team: player.teamName }),
      kind: "good",
    });
    return { ended: false, promoted: true };
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
  pushLog({
    msg: t("log.seasonStart", { team: player.teamName, grade: player.grade }),
    kind: "info",
  });
  return { ended: false };
}

// 진로 종합 점수 — 능력치 평균 + 최고 능력치 보정 + 명성
// 한 카테고리가 매우 뛰어나면 가산점 (양방향 슈퍼스타 보정)
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

// MLB 오퍼 산출 — 점수 임계별로 어느 강도의 팀에서 오퍼가 오는지 분기.
// 반환: 오퍼 팀 배열 (가능한 한 다양화). 점수 미달 시 빈 배열.
//
// 점수 임계 / 오퍼 출처:
//   130+  → 상위 3팀 모두
//   115+  → 상위 10팀 중 랜덤 3팀
//   100+  → 11~20위 중 랜덤 2팀
//    85+  → 21~30위 중 랜덤 1팀
export function getMLBOffers(player) {
  const score = compositeScore(player);
  if (score < 85) return [];
  const pool = getTeamPool("mlb", getLocale());
  if (!pool || pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => b.strength - a.strength);
  if (score >= 130) return sorted.slice(0, 3);
  if (score >= 115) return pickRandom(sorted.slice(0, 10), 3);
  if (score >= 100) return pickRandom(sorted.slice(10, 20), 2);
  return pickRandom(sorted.slice(20), 1);
}

// MLB 입단 시작 stage — 점수에 따라 마이너 단계에서 시작
export function determineMLBStartStage(score) {
  if (score >= 130) return "mlb";
  if (score >= 115) return "mlb_aaa";
  if (score >= 100) return "mlb_aa";
  return "mlb_a";
}

// KBO 드래프트 결과 — 점수 기반 1군 / 2군 / 미지명 분기.
// round / signingBonus 는 라이브 모달용. signingBonus 단위는 만원.
export function kboDraft(player) {
  const score = compositeScore(player);
  let stage = null, round = null, signingBonus = 0;
  if (score >= 100)     { stage = "pro1"; round = 1; signingBonus = 50000; }
  else if (score >= 90) { stage = "pro1"; round = 2; signingBonus = 30000; }
  else if (score >= 80) { stage = "pro1"; round = 3; signingBonus = 18000; }
  else if (score >= 70) { stage = "pro1"; round = 4 + Math.floor(Math.random() * 2); signingBonus = 10000; }
  else if (score >= 55) { stage = "pro2"; round = 6 + Math.floor(Math.random() * 3); signingBonus = 5000; }
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
  if (player.contract.yearsLeft > 0) return null;
  if (player.stage === "high" || player.stage === "univ" || player.stage === "retire") return null;
  const score = compositeScore(player);
  // FA 오퍼: compositeScore + fame 으로 결정. 점수 낮으면 잔류 권장 (오퍼 없음).
  const pool = getTeamPool(player.stage, getLocale());
  if (!pool || pool.length === 0) return { offers: [], canStay: true };
  const sorted = [...pool].filter(t => t.name !== player.teamName)
                          .sort((a, b) => b.strength - a.strength);
  let offers;
  if (score >= 120) offers = sorted.slice(0, 3);
  else if (score >= 100) offers = pickRandom(sorted.slice(0, Math.min(8, sorted.length)), 2);
  else if (score >= 80)  offers = pickRandom(sorted, 1);
  else offers = [];
  return { offers, canStay: true, score };
}

// FA 결정 적용 — stay: 같은 팀 4년 재계약 / leave: 새 팀 4년 계약.
// 새 팀은 같은 stage 의 다른 팀. 명성/계약금 보너스도 같이 부여.
export function applyFreeAgencyDecision(player, decision, newTeamName = null) {
  if (decision === "stay") {
    player.contract = { yearsLeft: 4 };
    player.fame = (player.fame ?? 0) + 5;  // 잔류 — 작은 명성 보너스
    return { stayed: true, teamName: player.teamName };
  }
  // leave — 새 팀 이적
  player.teamName = newTeamName ?? player.teamName;
  player.contract = { yearsLeft: 4 };
  player.fame = (player.fame ?? 0) + 12;  // 이적 — 큰 명성 보너스
  // 새 팀으로 league 재구성. 메인 stage 동일.
  state.league = createLeague(player.stage, player.teamName);
  return { stayed: false, teamName: player.teamName };
}

// 콜업 사다리 — 시즌 종료 시 능력치가 임계 넘으면 다음 단계로 자동 승격
const PROMOTION_LADDER = {
  pro2:    { next: "pro1",    minScore: 80  },
  mlb_a:   { next: "mlb_aa",  minScore: 90  },
  mlb_aa:  { next: "mlb_aaa", minScore: 105 },
  mlb_aaa: { next: "mlb",     minScore: 120 },
};

export function checkPromotion(player) {
  const rule = PROMOTION_LADDER[player.stage];
  if (!rule) return null;
  return compositeScore(player) >= rule.minScore ? rule.next : null;
}
