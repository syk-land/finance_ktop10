// 회귀(NewGame+) 상점 카탈로그 — 5탭의 모든 구매 가능 항목.
//
// 영구 / 재구매 분류:
//   - 재능 슬롯, stage cap 보너스: 영구 누적 (`permanentPurchases`)
//   - 시작 능력치 / 특성 / 유물: 캐릭터당 1회 재구매 (`loadout`)
//
// 효과 스펙(`effect.kind`)은 후속 phase 에서 wiring 시 분기 키로 사용한다.
// 같은 kind 를 특성/유물이 공유하면 곱연산(multiplier) 또는 가산(add/flatAddPct)으로 합쳐진다.

// ── 1. 재능 슬롯 (영구) ────────────────────────────────────────────
// 현재 캐릭터는 기본 talent 1개. tier 1 구매로 슬롯 +1 (총 2재능), tier 2 로 +1 (총 3재능).
// 보유한 모든 재능의 boost 곱이 자동훈련/경기경험치에 합산 적용된다.
export const TALENT_SLOTS_TIERS = [
  { tier: 1, cost:  500, totalSlots: 2 },
  { tier: 2, cost: 1500, totalSlots: 3 },
];

// ── 2. 스탯별 cap 보너스 (영구·누적·전 stage 공통) ──────────────────
// 스탯 하나당 1회 구매 = 캡 +5. 상한 없음, 구매할수록 가격 점증.
// permanentPurchases.statCaps[stat] = 구매 횟수 (0,1,2,...). 보너스 = 횟수 × STAT_CAP_STEP.
// 전 stage 공통으로 적용 (stage base cap 위에 가산).
export const STAT_KEYS = [
  "contact", "power", "eye", "speed", "defense",
  "velocity", "control", "breaking", "stamina", "mental",
];
export const STAT_CAP_STEP = 5;

// 해당 스탯의 다음 +5 구매 비용 — owned(기구매 횟수)에 따라 점증.
export function statCapCost(owned) {
  return 150 + 50 * (owned ?? 0);
}

// 특정 스탯의 누적 캡 보너스 (구매 횟수 × 5).
export function capBonusForStat(stat, statCaps) {
  if (!stat || !statCaps) return 0;
  return (statCaps[stat] ?? 0) * STAT_CAP_STEP;
}

// 전 스탯 중 최대 캡 보너스 — 레이다/그래프 공통 max 산정용.
export function maxCapBonus(statCaps) {
  if (!statCaps) return 0;
  let mx = 0;
  for (const k of STAT_KEYS) mx = Math.max(mx, (statCaps[k] ?? 0) * STAT_CAP_STEP);
  return mx;
}

// ── 3. 시작 능력치 프리셋 (재구매·캐릭터당 1) ────────────────────────
// 적용 시점: createPlayer 호출 직후 (i.e. 메뉴에서 캐릭터 생성 → 시작 스탯 가산).
//   balanced       : 타자5종 + 투수5종 = 10종 각 +5
//   battingFocus   : 타자5종(contact/power/eye/speed/defense) 각 +10
//   pitchingFocus  : 투수5종(velocity/control/breaking/stamina/mental) 각 +10
export const STARTING_STAT_PRESETS = {
  balanced: {
    cost: 300,
    addBatter:  { contact: 5, power: 5, eye: 5, speed: 5, defense: 5 },
    addPitcher: { velocity: 5, control: 5, breaking: 5, stamina: 5, mental: 5 },
  },
  battingFocus: {
    cost: 400,
    addBatter:  { contact: 10, power: 10, eye: 10, speed: 10, defense: 10 },
    addPitcher: {},
  },
  pitchingFocus: {
    cost: 400,
    addBatter:  {},
    addPitcher: { velocity: 10, control: 10, breaking: 10, stamina: 10, mental: 10 },
  },
};

// ── 4. 특성 (재구매·1~3장 장착) ────────────────────────────────────
// unlock: "default" 면 기본 해금. 그 외는 도전과제 키 — unlockedItems 에 그 키가 있어야 구매 가능.
//   walkoff_one       : 끝내기 1회 (milestones.walkoff 또는 walkoffHR 감지)
//   championship_one  : 우승 1회 (player.championships >= 1)
//   hof_inducted      : 명예의 전당 헌액 (`hallOfFame.rank === "inducted"`)
//   severe_recovered  : severe 부상 회복 (applyInjury 회복 시점 hook)
export const TRAITS = {
  steel_mental:  { cost: 200, unlock: "default",        effect: { kind: "injuryChance",          multiplier: 0.5 } },
  learner:       { cost: 150, unlock: "default",        effect: { kind: "firstSeasonTrainBoost", multiplier: 2.0 } },
  stardom:       { cost: 200, unlock: "default",        effect: { kind: "fameGain",              multiplier: 1.5 } },
  clutch:        { cost: 200, unlock: "walkoff_one",    effect: { kind: "walkoffChance",         multiplier: 2.0 } },
  big_game:      { cost: 250, unlock: "championship_one", effect: { kind: "finalsReward",        multiplier: 1.5 } },
  prime_extend:  { cost: 300, unlock: "hof_inducted",   effect: { kind: "agingDelay",            years: 3 } },
  legend_heir:   { cost: 300, unlock: "hof_inducted",   effect: { kind: "startingFame",          add: 50 } },
  iron_arm:      { cost: 350, unlock: "severe_recovered", effect: { kind: "tjsBlock" } },  // severe 부상 시 토미존 확률 0
};

// ── 5. 유물 (재구매·1~2개 장착) ────────────────────────────────────
export const RELICS = {
  past_life_notes: { cost: 100, effect: { kind: "firstSeasonTrainBoost",    multiplier: 2.0 } },
  lucky_bat:       { cost:  80, effect: { kind: "walkoffChance",            flatAddPct: 5 } },
  calling_card:    { cost: 150, effect: { kind: "draftRound",               boost: 1 } },
  mentor_letter:   { cost: 100, effect: { kind: "autoTrainDeficitBoost",    multiplier: 1.5 } },
  prosthetic:      { cost: 120, effect: { kind: "injuryRecoverySpeed",      multiplier: 2.0 } },
  golden_glove:    { cost: 150, effect: { kind: "errorChance",              multiplier: 0.5 } },
};

// ── 헬퍼 ───────────────────────────────────────────────────────────
// 다음 tier (구매 가능한) — 이미 max tier 면 null
export function nextTalentSlotTier(currentTotal) {
  return TALENT_SLOTS_TIERS.find(t => t.totalSlots > currentTotal) ?? null;
}

// 특성 해금 여부 — unlock === "default" 거나 unlockedItems 가 가지고 있으면 true
export function isTraitUnlocked(traitKey, unlockedItems) {
  const tr = TRAITS[traitKey];
  if (!tr) return false;
  if (tr.unlock === "default") return true;
  return (unlockedItems ?? []).includes(tr.unlock);
}
