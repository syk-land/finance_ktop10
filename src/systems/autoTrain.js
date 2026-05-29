// 자동훈련 — 선수 타입 프리셋
// 각 프리셋은 훈련 종목별 가중치를 가짐. 매 일자 가중치 랜덤 추첨.
// 체력 부족/부상 시 자동으로 휴식으로 대체.

import { state } from "../state.js";
import { doDailyAction } from "./week.js";
import { TRAININGS, getPlayerStatCap } from "./player.js";
import { effectMultiplier } from "./traitEffects.js";

// focusStats: 가장 부족한 stat 타게팅 시 대상 stat 화이트리스트 (null=모든 stat)
// 라벨/설명은 i18n 의 preset.<key>.{label,desc} 에서 조회. 여기엔 가중치 같은 데이터만.
export const AUTO_PRESETS = {
  slugger: {
    weights: { batting: 4, weight: 3, eye_drill: 1, fielding: 0.5, running: 0.5 },
    focusStats: ["contact", "power", "eye"],
  },
  contact: {
    weights: { batting: 3, eye_drill: 3, running: 1, fielding: 1 },
    focusStats: ["contact", "eye", "power"],
  },
  speedster: {
    weights: { running: 3, batting: 2, fielding: 2, eye_drill: 1 },
    focusStats: ["speed", "contact", "defense"],
  },
  defender: {
    weights: { fielding: 4, running: 2, batting: 1, eye_drill: 1 },
    focusStats: ["defense", "speed", "contact"],
  },
  fireballer: {
    weights: { pitching: 4, weight: 2, mental: 1, breaking_drill: 0.5 },
    focusStats: ["velocity", "stamina", "control"],
  },
  finesse: {
    weights: { pitching: 2, breaking_drill: 3, mental: 3 },
    focusStats: ["control", "breaking", "mental"],
  },
  two_way: {
    weights: {
      batting: 1.5, eye_drill: 1.5, fielding: 1.5, running: 1.5,
      pitching: 1.5, breaking_drill: 1.5, mental: 1.5, weight: 1.5,
    },
    focusStats: null, // 모든 stat 균등
  },
  recovery: {
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

// 훈련 부족도 (0~1) — stage cap 기준 평균 잔여 비율.
// cap=251, stat=199 → 잔여 = (251-199)/251 ≈ 0.207.
// training 의 stats 가 여러 개면 평균 사용 — 한 stat 만 cap 도달하면 다른 stat 잔여만 반영.
// 전부 cap 도달이면 0 → 가중치 추첨에서 자동 제외.
function deficitFor(trainingKey, player) {
  const tr = TRAININGS[trainingKey];
  if (!tr) return 0;
  let sum = 0;
  let count = 0;
  for (const s of tr.stats) {
    const v = statValue(player, s);
    if (v === null) continue;
    const cap = getPlayerStatCap(player, s);
    if (!isFinite(cap) || cap <= 0) continue;
    sum += Math.max(0, (cap - v) / cap);
    count++;
  }
  if (count === 0) return 0;
  return sum / count;
}

// cap 에 거의 닿은 stat — findLowestStatTraining 에서 제외.
function isStatNearCap(stat, player) {
  const v = statValue(player, stat);
  if (v === null) return true;
  const cap = getPlayerStatCap(player, stat);
  return v >= cap - 0.5;
}

// 프리셋의 focusStats(없으면 전 stat) 중 가장 낮은 stat 의 훈련 반환.
// cap 도달 stat 은 제외 — "캡에 닿으면 다른 훈련" 보장.
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
      if (isStatNearCap(s, player)) continue;  // cap 도달은 제외
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
//   1) 50% 확률로 focus 내 최저 stat 직접 타게팅 (cap 도달 stat 자동 제외)
//   2) 나머지 50%는 deficit 곱셈 가중치 추첨 — cap 도달 training 은 weight 0
// mentor_letter 유물의 autoTrainDeficitBoost 는 deficit 자체에 곱셈 (효과 증폭).
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

  // 1) 가장 부족한 stat 타게팅 (cap 도달 stat 제외)
  if (Math.random() < TARGET_LOWEST_PROB) {
    const target = findLowestStatTraining(presetKey, player);
    if (target) return { action: "train", detail: target };
  }

  // 2) deficit 곱셈 가중치 추첨. cap 도달이면 weight 0 → 절대 안 뽑힘.
  // mentor_letter: deficit 자체에 곱하면 부족도가 더 강조됨 (기존 가산 → 곱셈으로 단순화).
  const boost = effectMultiplier(player, "autoTrainDeficitBoost");
  const entries = Object.entries(preset.weights);
  const adjusted = entries.map(([k, w]) => {
    const d = deficitFor(k, player) * boost;
    return [k, w * d];
  });
  const total = adjusted.reduce((a, [, w]) => a + w, 0);
  // 모든 training 의 stat 이 cap 도달 — 더 훈련할 게 없음. 휴식.
  if (total <= 0.001) return { action: "rest" };
  let r = Math.random() * total;
  for (const [k, w] of adjusted) {
    r -= w;
    if (r <= 0) return { action: "train", detail: k };
  }
  // 폴백 — 가중치 가장 높은 것
  let best = adjusted[0];
  for (const e of adjusted) if (e[1] > best[1]) best = e;
  return { action: "train", detail: best[0] };
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
