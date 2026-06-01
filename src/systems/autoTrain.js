// 자동훈련 — 선수 타입 프리셋
//
// 각 프리셋은 "스탯별 목표 비중"(0~1)을 가진다. 목표치 = 비중 × 해당 stat cap.
// 트레이너는 매 일자, 목표 대비 가장 부족한 스탯을 키우는 훈련을 (부족분 비례로) 고른다.
//   - 비중대로 빌드가 형성됨 (예: 슬러거는 파워가 가장 높고 투수 스탯은 안 키움)
//   - 목표(비중×cap)에 닿으면 그 스탯은 더 키우지 않음 → 다른 스탯으로 전환
//     (경기 경험으로 솟은 스탯도 목표 초과면 자동 제외 — 멘탈만 솟는 문제 방지)
//   - 비중 0 = 그 스탯을 올리는 훈련은 안 함
// 라벨/설명은 i18n 의 preset.<key>.{label,desc} 에서 조회. 여기엔 비중 데이터만.

import { state } from "../state.js";
import { doDailyAction } from "./week.js";
import { TRAININGS, getPlayerStatCap, BATTER_STATS, PITCHER_STATS } from "./player.js";
import { effectMultiplier } from "./traitEffects.js";

// equalize 프리셋(밸런스)의 공통 목표값 = 전 스탯 중 최저 cap.
// 주력/수비 cap 150, 나머지 200 이면 → 150. 모든 능력치를 같은 값으로 수렴시킨다.
function equalizeTarget(player) {
  let min = Infinity;
  for (const stat of [...BATTER_STATS, ...PITCHER_STATS]) {
    const cap = getPlayerStatCap(player, stat);
    if (isFinite(cap) && cap > 0 && cap < min) min = cap;
  }
  return isFinite(min) ? min : 150;
}

// 스탯 순서: 컨택 파워 선구 주력 수비 | 구속 제구 변화 스태 멘탈
function W(contact, power, eye, speed, defense, velocity, control, breaking, stamina, mental) {
  return { contact, power, eye, speed, defense, velocity, control, breaking, stamina, mental };
}

export const AUTO_PRESETS = {
  //                  컨택  파워  선구  주력  수비  구속  제구  변화  스태  멘탈
  slugger:    { statWeights: W(0.75, 1.00, 0.75, 0.55, 0.55, 0, 0, 0, 0, 0) },          // 거포 — 파워 최우선
  contact:    { statWeights: W(1.00, 0.55, 0.90, 0.70, 0.65, 0, 0, 0, 0, 0) },          // 교타자 — 컨택/선구
  speedster:  { statWeights: W(0.80, 0.65, 0.70, 1.00, 0.75, 0, 0, 0, 0, 0) },          // 호타준족 — 주력 중심 호타
  defender:   { statWeights: W(0.60, 0.45, 0.60, 0.85, 1.00, 0, 0, 0, 0, 0) },          // 수비형 — 수비/주력
  fireballer: { statWeights: W(0, 0, 0, 0, 0, 1.00, 0.65, 0.70, 0.85, 0.60) },          // 파워피처 — 구속/스태미나
  finesse:    { statWeights: W(0, 0, 0, 0, 0, 0.60, 1.00, 0.90, 0.70, 0.85) },          // 기교파 — 제구/변화구/멘탈
  two_way:    { statWeights: W(1, 1, 1, 1, 1, 1, 1, 1, 1, 1), equalize: true },          // 밸런스 — 전 스탯 같은 값(최저 cap)으로
  recovery:   { statWeights: W(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5), restBias: 0.6 }, // 회복 우선
};

// 프리셋의 최고 비중 스탯 키 (동률이면 스탯 순서상 첫 번째). 안내 메시지/캡 판정용.
export function topWeightStat(presetKey) {
  const preset = AUTO_PRESETS[presetKey];
  if (!preset) return null;
  let best = null, bestW = -1;
  for (const [stat, w] of Object.entries(preset.statWeights)) {
    if (w > bestW) { bestW = w; best = stat; }
  }
  return best;
}

// 현재 훈련 방향이 "더 올릴 게 없음" 인가 — 일시정지+방향변경 안내 트리거.
//   밸런스(equalize): 전 스탯이 공통 목표값(최저 cap) 도달.
//   그 외: 최고 비중 스탯이 자기 cap 도달.
export function isTrainDirectionMaxed(player, presetKey) {
  const preset = AUTO_PRESETS[presetKey];
  if (!preset || !player) return false;
  if (preset.equalize) {
    const target = equalizeTarget(player);
    return [...BATTER_STATS, ...PITCHER_STATS].every(s => {
      const v = statValue(player, s);
      return v != null && v >= target;
    });
  }
  const stat = topWeightStat(presetKey);
  if (!stat) return false;
  const v = statValue(player, stat);
  const cap = getPlayerStatCap(player, stat);
  return v != null && isFinite(cap) && v >= cap;
}

function statValue(player, stat) {
  if (player.batter[stat] !== undefined) return player.batter[stat];
  if (player.pitcher[stat] !== undefined) return player.pitcher[stat];
  return null;
}

// 목표 대비 부족분 (0~1). 이미 목표 도달이면 0.
//   기본: 목표 = 비중 × cap.
//   equalTarget 지정(밸런스): 목표 = min(공통목표값, 해당 cap) → 전 스탯 같은 값으로 수렴.
function statDeficit(stat, player, weight, equalTarget = null) {
  if (!weight || weight <= 0) return 0;
  const v = statValue(player, stat);
  if (v == null) return 0;
  const cap = getPlayerStatCap(player, stat);
  if (!isFinite(cap) || cap <= 0) return 0;
  const target = equalTarget != null ? Math.min(equalTarget, cap) : weight * cap;
  if (v >= target) return 0;
  return (target - v) / cap;
}

// 한 종목이 올리는 스탯들의 (목표 대비) 부족분 합 = 점수.
// 단, 이미 목표 달성했거나 비중 0 인 스탯을 또 올리는 종목은 "누수"로 감점 —
// 예: 슬러거가 파워(목표 100) 때문에 웨이트(파워+스태미나)를 쓰면 스태미나(목표 0)가 딸려 오르는 것을
//     억제하고, 대신 batting(파워+컨택) 처럼 원하는 스탯만 올리는 종목을 선호하게.
const LEAK_PENALTY = 0.4;
function trainingScore(trKey, preset, player) {
  const tr = TRAININGS[trKey];
  if (!tr) return 0;
  const equalTarget = preset.equalize ? equalizeTarget(player) : null;
  let s = 0;
  for (const stat of tr.stats) {
    const w = preset.statWeights[stat] ?? 0;
    const def = statDeficit(stat, player, w, equalTarget);
    if (def > 0) {
      s += def;
    } else {
      // 목표 달성/비중0 스탯을 또 올림 → 남은 캡 여유에 비례해 감점.
      const v = statValue(player, stat);
      const cap = getPlayerStatCap(player, stat);
      if (v != null && cap > 0) s -= LEAK_PENALTY * Math.max(0, (cap - v) / cap);
    }
  }
  return Math.max(0, s);
}

// 다음 한 칸의 행동 결정 — 목표 비중 대비 부족분에 비례한 가중 추첨.
// 모든 목표 도달(또는 비중 0뿐) 이면 휴식. mentor_letter 는 부족분을 곱으로 강조.
export function pickAutoAction(presetKey, player) {
  if (player.injury) return { action: "rest" };
  if (player.stamina < 25) return { action: "rest" };
  const preset = AUTO_PRESETS[presetKey];
  if (!preset) return { action: "rest" };

  // restBias (회복 우선) — 일정 확률로 휴식
  if (preset.restBias && Math.random() < preset.restBias) return { action: "rest" };
  // 체력 50 미만이면 추가 휴식 확률
  if (player.stamina < 50 && Math.random() < 0.2) return { action: "rest" };

  const boost = effectMultiplier(player, "autoTrainDeficitBoost");  // mentor_letter
  const scored = Object.keys(TRAININGS).map(k => [k, trainingScore(k, preset, player) * boost]);
  const total = scored.reduce((a, [, w]) => a + w, 0);
  // 모든 목표 달성 — 더 키울 게 없음. 휴식.
  if (total <= 0.001) return { action: "rest" };

  // 부족분 비례 가중 추첨 → 목표 비중대로 자연 분배
  let r = Math.random() * total;
  for (const [k, w] of scored) {
    r -= w;
    if (r <= 0) return { action: "train", detail: k };
  }
  // 폴백 — 점수 최고
  let best = scored[0];
  for (const e of scored) if (e[1] > best[1]) best = e;
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
