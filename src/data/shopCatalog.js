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

// ── 2. stage cap 보너스 (영구·누적) ────────────────────────────────
// 그룹별 각 tier 가 누적되어 적용된다. 예: amateur tier 2 까지 구매 = +30 cap.
// 그룹 → 적용 stage:
//   amateur: high, univ
//   kbo:     pro1, pro2
//   mlb:     mlb_a, mlb_aa, mlb_aaa, mlb
export const CAP_BOOST_GROUPS = ["amateur", "kbo", "mlb"];

export const CAP_BOOST_STAGE_MAP = {
  amateur: ["high", "univ"],
  kbo:     ["pro1", "pro2"],
  mlb:     ["mlb_a", "mlb_aa", "mlb_aaa", "mlb"],
};

export const CAP_BOOST_TIERS = {
  amateur: [
    { tier: 1, cost:  200, add: 10 },
    { tier: 2, cost:  400, add: 20 },
    { tier: 3, cost:  700, add: 30 },
  ],
  kbo: [
    { tier: 1, cost:  500, add: 10 },
    { tier: 2, cost: 1000, add: 20 },
    { tier: 3, cost: 1700, add: 30 },
  ],
  mlb: [
    { tier: 1, cost:  800, add: 10 },
    { tier: 2, cost: 1500, add: 20 },
    { tier: 3, cost: 2500, add: 30 },
  ],
};

// 현재 누적 보너스 (player stage 기준) — getPlayerStatCap 가 호출.
// permanentPurchases.capBoosts[group] = 0~3 (구매한 tier 개수).
export function capBonusForStage(stage, capBoosts) {
  if (!stage || !capBoosts) return 0;
  for (const group of CAP_BOOST_GROUPS) {
    if (!CAP_BOOST_STAGE_MAP[group].includes(stage)) continue;
    const owned = capBoosts[group] ?? 0;
    let sum = 0;
    for (let i = 0; i < owned; i++) sum += CAP_BOOST_TIERS[group][i].add;
    return sum;
  }
  return 0;
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
export function nextCapBoostTier(group, ownedCount) {
  return CAP_BOOST_TIERS[group]?.[ownedCount] ?? null;
}

// 특성 해금 여부 — unlock === "default" 거나 unlockedItems 가 가지고 있으면 true
export function isTraitUnlocked(traitKey, unlockedItems) {
  const tr = TRAITS[traitKey];
  if (!tr) return false;
  if (tr.unlock === "default") return true;
  return (unlockedItems ?? []).includes(tr.unlock);
}
