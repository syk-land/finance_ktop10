// 자동훈련 — 선수 타입 프리셋
// 각 프리셋은 훈련 종목별 가중치를 가짐. 매 일자 가중치 랜덤 추첨.
// 체력 부족/부상 시 자동으로 휴식으로 대체.

import { state } from "../state.js";
import { doDailyAction } from "./week.js";
import { TRAININGS } from "./player.js";

// focusStats: 가장 부족한 stat 타게팅 시 대상 stat 화이트리스트 (null=모든 stat)
export const AUTO_PRESETS = {
  slugger: {
    label: "슬러거",
    desc: "장타 극대화. 타격·웨이트 중심.",
    weights: { batting: 4, weight: 3, eye_drill: 1, fielding: 0.5, running: 0.5 },
    focusStats: ["contact", "power", "eye"],
  },
  contact: {
    label: "컨택 히터",
    desc: "정교한 방망이. 타격·선구안 중심.",
    weights: { batting: 3, eye_drill: 3, running: 1, fielding: 1 },
    focusStats: ["contact", "eye", "power"],
  },
  speedster: {
    label: "호타준족",
    desc: "주력 + 타격. 발 빠른 호타준족형.",
    weights: { running: 3, batting: 2, fielding: 2, eye_drill: 1 },
    focusStats: ["speed", "contact", "defense"],
  },
  defender: {
    label: "수비 명인",
    desc: "수비·주루 위주. 견고한 야수.",
    weights: { fielding: 4, running: 2, batting: 1, eye_drill: 1 },
    focusStats: ["defense", "speed", "contact"],
  },
  fireballer: {
    label: "파이어볼러",
    desc: "구속·파워. 강속구 투수.",
    weights: { pitching: 4, weight: 2, mental: 1, breaking_drill: 0.5 },
    focusStats: ["velocity", "stamina", "control"],
  },
  finesse: {
    label: "제구파 투수",
    desc: "제구·변화구. 두뇌형 투수.",
    weights: { pitching: 2, breaking_drill: 3, mental: 3 },
    focusStats: ["control", "breaking", "mental"],
  },
  two_way: {
    label: "양방향 (밸런스)",
    desc: "투타 균형. 모든 종목을 골고루.",
    weights: {
      batting: 1.5, eye_drill: 1.5, fielding: 1.5, running: 1.5,
      pitching: 1.5, breaking_drill: 1.5, mental: 1.5, weight: 1.5,
    },
    focusStats: null, // 모든 stat 균등
  },
  recovery: {
    label: "회복 우선",
    desc: "체력/부상 회복 위주. 가벼운 훈련만.",
    weights: { eye_drill: 1, mental: 1 },
    restBias: 0.6,
    focusStats: null,
  },
};

function statValue(player, stat) {
  if (player.batter[stat] !== undefined) return player.batter[stat];
  if (player.pitcher[stat] !== undefined) return player.pitcher[stat];
  return null;
}

// 훈련이 영향을 주는 stat들 중 가장 낮은 값 — 부족도 계산용
function trainingStatMin(trainingKey, player) {
  const t = TRAININGS[trainingKey];
  if (!t) return 95;
  let min = 95;
  for (const s of t.stats) {
    const v = statValue(player, s);
    if (v !== null && v < min) min = v;
  }
  return min;
}

// 부족도 (0~1) — 100을 기준점으로
function deficitFor(trainingKey, player) {
  const minV = trainingStatMin(trainingKey, player);
  return Math.max(0, (100 - minV) / 100);
}

// 프리셋의 focusStats(없으면 전 stat) 중 가장 낮은 stat의 훈련 반환
function findLowestStatTraining(presetKey, player) {
  const preset = AUTO_PRESETS[presetKey];
  if (!preset) return null;
  const trainings = Object.keys(preset.weights);
  const focus = preset.focusStats; // null이면 모든 stat 대상

  const statToTrainings = {};
  for (const trKey of trainings) {
    const t = TRAININGS[trKey];
    if (!t) continue;
    for (const s of t.stats) {
      if (statValue(player, s) === null) continue;
      if (focus && !focus.includes(s)) continue;
      if (!statToTrainings[s]) statToTrainings[s] = [];
      statToTrainings[s].push(trKey);
    }
  }
  let lowestStat = null;
  let lowestVal = 9999;
  for (const s of Object.keys(statToTrainings)) {
    const v = statValue(player, s);
    if (v < lowestVal) { lowestVal = v; lowestStat = s; }
  }
  if (!lowestStat) return null;
  const candidates = statToTrainings[lowestStat];
  candidates.sort((a, b) => (preset.weights[b] ?? 0) - (preset.weights[a] ?? 0));
  return candidates[0];
}

// 다음 한 칸의 행동 결정
//   1) 50% 확률로 focus 내 최저 stat 직접 타게팅
//   2) 나머지 50%는 부족도 보정된 가중치 추첨
const DEFICIT_SCALE = 3.0;
const TARGET_LOWEST_PROB = 0.5;

export function pickAutoAction(presetKey, player) {
  if (player.injury) return { action: "rest" };
  if (player.stamina < 25) return { action: "rest" };
  const preset = AUTO_PRESETS[presetKey];
  if (!preset) return { action: "rest" };

  // restBias 처리
  if (preset.restBias && Math.random() < preset.restBias) {
    return { action: "rest" };
  }
  // 체력 50 미만일 때 추가 휴식 확률
  if (player.stamina < 50 && Math.random() < 0.2) {
    return { action: "rest" };
  }

  // 1) 가장 부족한 stat 타게팅
  if (Math.random() < TARGET_LOWEST_PROB) {
    const target = findLowestStatTraining(presetKey, player);
    if (target) return { action: "train", detail: target };
  }

  // 2) 부족도 보정된 가중치 추첨
  const entries = Object.entries(preset.weights);
  const adjusted = entries.map(([k, w]) => {
    const d = deficitFor(k, player);
    return [k, w * (1 + d * DEFICIT_SCALE)];
  });
  const total = adjusted.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of adjusted) {
    r -= w;
    if (r <= 0) return { action: "train", detail: k };
  }
  return { action: "train", detail: adjusted[0][0] };
}

// 남은 평일 자동 진행
export function autoFillWeek(presetKey) {
  const days = [];
  let crits = 0;
  let injuriesBefore = state.player.injury ? 1 : 0;
  let newInjury = false;
  let safetyLimit = 10; // 무한 루프 방지
  while (state.season.dayIndex < 5 && safetyLimit-- > 0) {
    const pick = pickAutoAction(presetKey, state.player);
    const res = doDailyAction(pick.action, pick.detail);
    if (!res.ok) break;
    days.push({ pick, res });
    if (res.result?.critical) crits++;
    // 새 부상 감지
    if (state.player.injury && !injuriesBefore) {
      newInjury = true;
      injuriesBefore = 1;
    }
  }
  return { days, crits, newInjury };
}
