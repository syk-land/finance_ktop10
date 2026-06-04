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
// 유물 — 저가·저효과로 시작해, 재구매할 때마다 레벨업(효과·가격 점증). 캐릭터당 최대 2개 장착.
//   effect.base   : Lv.1 효과값
//   effect.perLevel: 레벨당 증감 (errorChance 처럼 낮을수록 강한 건 음수)
//   effect.prop   : 적용 방식 — "multiplier" | "flatAddPct" | "boost"
//   effect.min/max: 효과값 한계 (선택)
//   cost / costGrowth: Lv.1 가격 / 레벨당 가격 증가분
export const RELICS = {
  past_life_notes: { cost: 60,  costGrowth: 50, effect: { kind: "firstSeasonTrainBoost", prop: "multiplier", base: 1.3, perLevel: 0.25 } },
  lucky_bat:       { cost: 50,  costGrowth: 40, effect: { kind: "walkoffChance",          prop: "flatAddPct", base: 3,   perLevel: 2 } },
  calling_card:    { cost: 100, costGrowth: 90, effect: { kind: "draftRound",             prop: "boost",      base: 1,   perLevel: 1 } },
  mentor_letter:   { cost: 60,  costGrowth: 50, effect: { kind: "trainEfficiency",        prop: "multiplier", base: 1.2, perLevel: 0.2 } },
  prosthetic:      { cost: 70,  costGrowth: 60, effect: { kind: "injuryRecoverySpeed",    prop: "multiplier", base: 1.4, perLevel: 0.3 } },
  golden_glove:    { cost: 90,  costGrowth: 70, effect: { kind: "errorChance",            prop: "multiplier", base: 0.7, perLevel: -0.08, min: 0.3 } },
};

// 다음 레벨(currentLevel→+1) 구매 비용. currentLevel 0 = 첫 구매.
export function relicCost(key, currentLevel = 0) {
  const r = RELICS[key];
  if (!r) return Infinity;
  return r.cost + (r.costGrowth ?? 0) * currentLevel;
}
// 레벨 반영 효과값.
export function relicEffectValue(key, level = 1) {
  const r = RELICS[key];
  if (!r) return null;
  const e = r.effect;
  const L = Math.max(1, level);
  let v = e.base + (e.perLevel ?? 0) * (L - 1);
  if (e.min != null) v = Math.max(e.min, v);
  if (e.max != null) v = Math.min(e.max, v);
  return +v.toFixed(2);
}
// player.relics 효과 계산용 — 레벨 반영된 정규화 effect 객체 ({kind, [prop]: value}).
export function relicResolvedEffect(key, level = 1) {
  const r = RELICS[key];
  if (!r) return null;
  return { kind: r.effect.kind, [r.effect.prop ?? "multiplier"]: relicEffectValue(key, level) };
}

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

// ── 6. 장비 상점 카탈로그 (은퇴/회귀 영구 업그레이드) ──────────────────
export const EQUIPMENT_CATALOG = {
  bat: [
    { level: 0, nameKey: "equipment.bat.lvl0", cost: 0, stats: {} },
    { level: 1, nameKey: "equipment.bat.lvl1", cost: 300, stats: { contact: 3, power: 2 } },
    { level: 2, nameKey: "equipment.bat.lvl2", cost: 800, stats: { contact: 6, power: 5 } },
    { level: 3, nameKey: "equipment.bat.lvl3", cost: 2000, stats: { contact: 12, power: 10, eye: 5 } },
  ],
  glove: [
    { level: 0, nameKey: "equipment.glove.lvl0", cost: 0, stats: {} },
    { level: 1, nameKey: "equipment.glove.lvl1", cost: 300, stats: { defense: 3, control: 2 } },
    { level: 2, nameKey: "equipment.glove.lvl2", cost: 800, stats: { defense: 6, control: 5, breaking: 3 } },
    { level: 3, nameKey: "equipment.glove.lvl3", cost: 2000, stats: { defense: 12, control: 10, breaking: 8, mental: 5 } },
  ],
  cleats: [
    { level: 0, nameKey: "equipment.cleats.lvl0", cost: 0, stats: {} },
    { level: 1, nameKey: "equipment.cleats.lvl1", cost: 300, stats: { speed: 3, stamina: 2 } },
    { level: 2, nameKey: "equipment.cleats.lvl2", cost: 800, stats: { speed: 7, stamina: 5, velocity: 2 } },
    { level: 3, nameKey: "equipment.cleats.lvl3", cost: 2000, stats: { speed: 15, stamina: 10, velocity: 5 } },
  ]
};

export function getEquipmentSpec(type, level) {
  const list = EQUIPMENT_CATALOG[type];
  if (!list) return null;
  return list.find(item => item.level === level) || list[0];
}

