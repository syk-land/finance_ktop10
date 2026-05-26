// 주 단위 턴 진행
// 한 주: 5칸 평일 (각각 train/work/rest 선택) + 주말 자동 경기 시뮬레이션
// 시즌 종료 시 다음 학년/단계 분기

import { state, pushLog } from "../state.js";
import {
  applyTraining, applyWork, applyRest, tickConditionWeekly, ageUp, overallScore, applyGameExperience,
} from "./player.js";
import { simulateGame } from "./simulator.js";
import { getPlayerTeam, standings } from "./league.js";
import { t } from "../i18n/index.js";
import { checkFinalAdvance } from "./finals.js";
import { evaluateAndApplySeasonAwards } from "./awards.js";
import { checkScheduledEvents } from "./seasonEvents.js";

export function createSeason(stage) {
  return {
    stage,
    weekIndex: 0,
    dayIndex: 0,        // 0..4 (월~금)
    weekActions: [],    // [{day, action, detail}]
    weekResults: [],    // 주말 경기 결과
    seasonResults: [],  // 시즌 전체 경기 결과
    finished: false,
  };
}

// 평일 한 칸(하루) 행동 적용. reason은 i18n 키 (reason.<key>).
export function doDailyAction(action, detail) {
  const { player, season } = state;
  if (!season || season.finished) return { ok: false, reason: "noSeason" };
  if (season.dayIndex >= 5) return { ok: false, reason: "weekendPending" };

  let res;
  if (action === "train") {
    res = applyTraining(player, detail);
  } else if (action === "work") {
    res = applyWork(player);
  } else if (action === "rest") {
    res = applyRest(player);
  } else {
    return { ok: false, reason: "invalidAction" };
  }
  if (!res.ok) return res;

  season.weekActions.push({ day: season.dayIndex, action, detail, result: res });
  season.dayIndex++;
  return { ok: true, result: res };
}

// 한 주가 끝나면 주말 경기 진행
export function endWeek() {
  const { player, league, season } = state;
  if (season.dayIndex < 5) return { ok: false, reason: "midweek" };

  // 주말 컨디션/부상 갱신 + 체력 회복
  tickConditionWeekly(player);
  player.stamina = Math.min(player.maxStamina, player.stamina + 50);

  // 이번 주 일정
  const games = league.schedule[season.weekIndex] ?? [];
  const results = [];
  for (const g of games) {
    const r = simulateGame(league, g, player);
    results.push(r);
    // 투수 등판 휴식 카운터 (출장 여부와 무관하게 매 경기 진행)
    if (r.mainPlayer?.roles?.pitch) {
      player.gamesSinceLastPitch = 0;
    } else {
      player.gamesSinceLastPitch = (player.gamesSinceLastPitch ?? 99) + 1;
    }
    if (r.mainPlayer && (r.mainPlayer.roles?.bat || r.mainPlayer.roles?.pitch)) {
      mergeSeasonStats(player, r.mainPlayer);
      applyGameExperience(player, r.mainPlayer);
      player.seasonStats.games++;
    }
  }
  season.weekResults = results;
  season.seasonResults.push(...results);
  season.weekIndex++;
  season.dayIndex = 0;
  season.weekActions = [];

  // 토너먼트 결승 진출 체크 — 이미 pendingFinal 이 있으면 그대로
  if (!state.pendingFinal) {
    const adv = checkFinalAdvance(player, league, season, state.gameDate);
    if (adv) state.pendingFinal = adv;
  }

  // 시즌 중 이벤트 (올스타/올림픽/WBC 등 — 현재는 카탈로그 비어있음, 인프라만)
  checkScheduledEvents(player, state.gameDate);

  // 시즌 종료 체크
  if (season.weekIndex >= league.weeksPerSeason) {
    season.finished = true;
    // 시즌 수상 판정 — player.awards 에 누적, season.awardsThisSeason 에 키 배열 저장
    const wonKeys = evaluateAndApplySeasonAwards(player, league, state.gameDate);
    season.awardsThisSeason = wonKeys;
    pushLog({
      msg: t("log.seasonEnd", { stage: t("stage." + league.stage), grade: player.grade }),
      kind: "info",
    });
  }
  return { ok: true, results };
}

function mergeSeasonStats(player, mainPlayer) {
  const ss = player.seasonStats;
  if (mainPlayer.batterBox) {
    const box = mainPlayer.batterBox;
    ss.pa += box.pa; ss.ab += box.ab; ss.h += box.h; ss.hr += box.hr;
    ss.bb += box.bb; ss.k += box.k; ss.tb += box.tb;
    // 신규 부가 통계
    ss.hbp = (ss.hbp ?? 0) + (box.hbp ?? 0);
    ss.sf  = (ss.sf  ?? 0) + (box.sf  ?? 0);
    ss.sb  = (ss.sb  ?? 0) + (box.sb  ?? 0);
    ss.cs  = (ss.cs  ?? 0) + (box.cs  ?? 0);
    ss.dp  = (ss.dp  ?? 0) + (box.dp  ?? 0);
    ss.e   = (ss.e   ?? 0) + (box.e   ?? 0);
  }
  if (mainPlayer.pitcherBox) {
    const box = mainPlayer.pitcherBox;
    ss.pitchG++;
    ss.ip += 9;        // 단순화: 선발 9이닝
    ss.er += box.er ?? 0;
    ss.pK += box.pK ?? 0;
    ss.pBB += box.pBB ?? 0;
    ss.pH += box.pH ?? 0;
    ss.pHR += box.pHR ?? 0;
    ss.pHbp = (ss.pHbp ?? 0) + (box.pHbp ?? 0);
  }
}

// 시즌 → 다음 시즌으로 진급 (Phase 1: 단순히 학년/나이만 증가, 같은 팀 유지)
export function advanceToNextSeason() {
  const { player, league } = state;
  // 누적 통계로 합산
  Object.keys(player.seasonStats).forEach(k => {
    player.careerStats[k] = (player.careerStats[k] ?? 0) + (player.seasonStats[k] ?? 0);
  });
  // 시즌 기록 보관 (간단)
  player.careerHistory.push({
    age: player.age,
    grade: player.grade,
    stage: player.stage,
    teamName: player.teamName,
    overall: overallScore(player),
    stats: { ...player.seasonStats },
    teamRecord: getPlayerTeam(league)?.record ? { ...getPlayerTeam(league).record } : null,
    standings: standings(league).slice(0, 5).map(t => ({ name: t.name, w: t.record.w, l: t.record.l })),
  });
  // 리셋
  player.seasonStats = emptyStatsLike(player.seasonStats);
  ageUp(player);
  return { stage: player.stage, grade: player.grade };
}

function emptyStatsLike(s) {
  const out = {};
  for (const k of Object.keys(s)) out[k] = 0;
  return out;
}
