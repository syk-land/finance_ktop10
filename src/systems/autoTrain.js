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
import { getPlayerStatCap, BATTER_STATS, PITCHER_STATS } from "./player.js";

// equalize 프리셋(밸런스)의 공통 목표값 = 대상 스탯 중 최저 cap.
// 주력/수비 cap 150, 나머지 200 이면 → 150. 대상 능력치를 같은 값으로 수렴시킨다.
// stats 미지정이면 전 스탯(양방향 밸런스), 지정 시 그 부분집합(타자/투수 밸런스)만.
function equalizeTarget(player, stats = [...BATTER_STATS, ...PITCHER_STATS]) {
  let min = Infinity;
  for (const stat of stats) {
    const cap = getPlayerStatCap(player, stat);
    if (isFinite(cap) && cap > 0 && cap < min) min = cap;
  }
  return isFinite(min) ? min : 150;
}

// 스탯 순서: 컨택 파워 선구 주력 | 구속 제구 변화 스태
function W(contact, power, eye, speed, velocity, control, breaking, stamina) {
  return { contact, power, eye, speed, velocity, control, breaking, stamina };
}

export const AUTO_PRESETS = {
  //                  컨택  파워  선구  주력  구속  제구  변화  스태
  slugger:         { statWeights: W(0.75, 1.00, 0.75, 0.55, 0, 0, 0, 0) },                   // 거포
  contact_speed:   { statWeights: W(1.00, 0.50, 0.90, 1.00, 0, 0, 0, 0) },                   // 교타/주루
  batter_balance:  { statWeights: W(1, 1, 1, 1, 0, 0, 0, 0), equalize: true, equalizeStats: BATTER_STATS },   // 타자 밸런스
  fireballer:      { statWeights: W(0, 0, 0, 0, 1.00, 0.60, 0.50, 0.85) },                   // 강속구
  breaking:        { statWeights: W(0, 0, 0, 0, 0.50, 1.00, 1.00, 0.80) },                   // 변화구
  pitcher_balance: { statWeights: W(0, 0, 0, 0, 1, 1, 1, 1), equalize: true, equalizeStats: PITCHER_STATS },  // 투수 밸런스
  two_way:         { statWeights: W(1, 1, 1, 1, 1, 1, 1, 1), equalize: true },               // 올밸런스
};

// Helper to resolve preset key safely (maps deprecated keys dynamically)
function getPreset(presetKey) {
  if (!presetKey) return null;
  let preset = AUTO_PRESETS[presetKey];
  if (!preset) {
    const deprecatedPresets = {
      contact: "contact_speed",
      speedster: "contact_speed",
      defender: "contact_speed",
      finesse: "breaking",
      recovery: "two_way"
    };
    const resolvedKey = deprecatedPresets[presetKey] ?? "two_way";
    preset = AUTO_PRESETS[resolvedKey];
  }
  return preset;
}

// 프리셋의 최고 비중 스탯 키 (동률이면 스탯 순서상 첫 번째). 안내 메시지/캡 판정용.
export function topWeightStat(presetKey) {
  const preset = getPreset(presetKey);
  if (!preset) return null;
  let best = null, bestW = -1;
  for (const [stat, w] of Object.entries(preset.statWeights)) {
    if (w > bestW) { bestW = w; best = stat; }
  }
  return best;
}

// 밸런스(equalize) 방향에서 대상 능력치를 매주 "평균값으로 재분배"한다 — 총합 보존.
//   훈련·경기경험·보상(포스트시즌/결승/휴식기/군복무/마일스톤)이 어떤 능력치를 얼마나 올렸든,
//   대상 능력치 합을 그대로 둔 채 전부 평균으로 맞춰 → "모든 능력치가 같은 수치로" + 강함(총량)은 유지.
//   (능력치를 깎아 버리던 옛 밴드 방식과 달리, 솟은 능력치의 초과분을 낮은 능력치로 옮겨 손실 없음.)
//   cap 초과분은 미달 능력치로 1회 재분배. ⚠ 방향형/회복엔 적용 안 함(전환 시 능력치 깎임 방지).
//   presetKey 가 유효하지 않으면 fallback으로 처리.
export function clampStatsToDirection(player, presetKey) {
  const preset = getPreset(presetKey);
  if (!preset || !preset.equalize || !player) return;
  const stats = (preset.equalizeStats ?? ALL_STATS).filter(s => statValue(player, s) != null);
  if (stats.length === 0) return;
  const groupOf = s => (BATTER_STATS.includes(s) ? "batter" : "pitcher");

  let sum = 0;
  for (const s of stats) sum += player[groupOf(s)][s];
  let mean = sum / stats.length;

  // 1차: 평균으로 설정하되 각 cap 으로 클램프. cap 에 막혀 남은 합은 미달 능력치에 재분배.
  let remaining = sum;
  const capped = new Set();
  for (let pass = 0; pass < 3; pass++) {
    const free = stats.filter(s => !capped.has(s));
    if (free.length === 0) break;
    const target = remaining / free.length;
    let overflow = 0;
    let newlyCapped = false;
    for (const s of free) {
      const cap = getPlayerStatCap(player, s);
      if (isFinite(cap) && cap > 0 && target > cap) {
        player[groupOf(s)][s] = +cap.toFixed(1);
        capped.add(s);
        overflow += cap;
        newlyCapped = true;
      }
    }
    if (!newlyCapped) {
      for (const s of free) player[groupOf(s)][s] = +target.toFixed(1);
      break;
    }
    remaining -= overflow;
  }
}

// 현재 훈련 방향이 "더 올릴 게 없음" 인가 — 일시정지+방향변경 안내 트리거.
//   밸런스(equalize): 전 스탯이 공통 목표값(최저 cap) 도달.
//   그 외: 최고 비중 스탯이 자기 cap 도달.
export function isTrainDirectionMaxed(player, presetKey) {
  const preset = getPreset(presetKey);
  if (!preset || !player) return false;
  if (preset.equalize) {
    const stats = preset.equalizeStats ?? [...BATTER_STATS, ...PITCHER_STATS];
    const target = equalizeTarget(player, stats);
    return stats.every(s => {
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

// 능력치 → 표시용 대표 훈련. 자동훈련은 "어떤 능력치를 올릴지"를 방향(프리셋)으로 정하고,
// 그 능력치 하나만 올린다(아래 pickAutoAction). 실제 상승 능력치와 훈련 종목을 분리해 —
// 옛 방식의 "훈련 종목이 고정 2스탯을 동시에 올려 특정 능력치(컨택/제구/파워)만 솟던" 불균형 제거.
// 훈련 이름·체력소모·부상위험은 이 대표 훈련에서 가져온다(피드/로그 표시용).
const STAT_TRAINING = {
  contact:  "batting",
  power:    "weight",
  eye:      "eye_drill",
  speed:    "running",
  velocity: "pitching",
  control:  "breaking_drill",
  breaking: "breaking_drill",
  stamina:  "weight",
};

const ALL_STATS = [...BATTER_STATS, ...PITCHER_STATS];

// 경기 경험치(applyGameExperience) 클램프용 능력치 목표 맵 { contact:150, power:120, ... }.
//   - 방향형: 목표 = 비중 × cap → 경기를 잘 해도 비중 이상으로 특정 능력치가 솟지 않음(빌드 형태 유지).
//   - 밸런스(equalize): null 반환 → 경기경험은 막지 않고, 대신 clampStatsToDirection 이 매주 평균으로
//     재분배해 균형을 맞춘다(경기경험을 버리지 않고 보존).
// presetKey 없으면 null → 클램프 안 함(기존 동작).
export function directionTargets(player, presetKey) {
  const preset = getPreset(presetKey);
  if (!preset || !player) return null;
  if (preset.equalize) return null;
  const out = {};
  for (const stat of ALL_STATS) {
    const w = preset.statWeights[stat] ?? 0;
    const cap = getPlayerStatCap(player, stat);
    if (!isFinite(cap) || cap <= 0) continue;
    out[stat] = w * cap;
  }
  return out;
}

// 다음 한 칸의 행동 결정 — 방향의 목표 대비 가장 부족한 "능력치 하나"를 부족분 비례 추첨으로 선택.
//   - 밸런스(equalize): 목표 = 공통값(최저 cap). 항상 가장 낮은 능력치 쪽이 뽑혀 전 능력치가 같은 값으로 수렴.
//   - 방향형: 목표 = 비중×cap. 비중 높은 능력치일수록 목표가 높아 더 자주 뽑힘(빌드 형성). 비중 0 은 제외.
//   세션당 능력치 1개만 올리므로, 대상 능력치가 많은 양방향(10종)은 타자/투수 밸런스(5종)보다 능력치당 절반 속도로 오른다.
// 모든 목표 도달(또는 비중 0뿐) 이면 휴식.
export function pickAutoAction(presetKey, player) {
  if (player.injury) return { action: "rest" };
  if (player.stamina < 25) return { action: "rest" };
  const preset = getPreset(presetKey);
  if (!preset) return { action: "rest" };

  // restBias (회복 우선) — 일정 확률로 휴식
  if (preset.restBias && Math.random() < preset.restBias) return { action: "rest" };
  // 체력 50 미만이면 추가 휴식 확률
  if (player.stamina < 50 && Math.random() < 0.2) return { action: "rest" };

  const equalTarget = preset.equalize ? equalizeTarget(player, preset.equalizeStats) : null;
  const scored = [];
  let total = 0;
  for (const stat of ALL_STATS) {
    const w = preset.statWeights[stat] ?? 0;
    if (w <= 0) continue;
    const def = statDeficit(stat, player, w, equalTarget);
    if (def > 0) { scored.push([stat, def]); total += def; }
  }
  // 모든 목표 달성 — 더 키울 게 없음. 휴식.
  if (total <= 0.001) return { action: "rest" };

  // 부족분 비례 가중 추첨 → 가장 부족한 능력치일수록 자주 뽑힘
  let r = Math.random() * total;
  let chosen = scored[0][0];
  for (const [stat, def] of scored) {
    r -= def;
    if (r <= 0) { chosen = stat; break; }
  }
  return { action: "train", detail: STAT_TRAINING[chosen] ?? "batting", stat: chosen };
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
    const res = doDailyAction(pick.action, pick.detail, { stat: pick.stat });
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
