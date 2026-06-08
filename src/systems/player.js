// 주인공 캐릭터 시스템
// 능력치 스케일: 0~100
// 양방향(투타)이므로 batter + pitcher 능력치 모두 유지
//
// i18n: 라벨/메시지는 모두 i18n 키로만 보유. 사람이 읽는 텍스트는 t() 호출로 UI에서 조회.

import { pushLog, pushToast, state } from "../state.js";
import { t } from "../i18n/index.js";
import {
  capBonusForStat, maxCapBonus, STARTING_STAT_PRESETS,
  TRAITS as REGRESSION_TRAITS, RELICS as REGRESSION_RELICS,
  EQUIPMENT_CATALOG, getEquipmentSpec,
} from "../data/shopCatalog.js";
import { effectMultiplier, effectAdd, hasTraitFlag } from "./traitEffects.js";
import { assignPitches, decodeMainHand } from "./pitches.js";
import { unlockItem, loadRegressionMeta } from "./regression.js";


// severe 부상 회복 시 회귀 도전과제 해금 (severe_recovered).
function unlockSevereRecoveredIf(player, justHealedSeverity) {
  if (justHealedSeverity === "severe") {
    if (unlockItem("severe_recovered")) {
      pushToast(t("regression.unlocked", { name: t("unlock.severe_recovered") }), "good");
    }
  }
}

export const BATTER_STATS = ["contact", "power", "eye", "speed", "defense"];
export const PITCHER_STATS = ["velocity", "control", "breaking", "stamina", "mental"];

// stat key → 현재 locale 의 라벨 맵 (radar / 표시용). 매 호출마다 새로 만든다.
export function getStatLabels() {
  const out = {};
  for (const k of [...BATTER_STATS, ...PITCHER_STATS]) out[k] = t("stat." + k);
  return out;
}

// 재능 타입 — 훈련 효율에 영향. 라벨은 i18n 의 talent.<key>.
export const TALENTS = {
  contact:   { boost: { contact: 1.4, eye: 1.2 } },
  power:     { boost: { power: 1.4, contact: 1.2 } },
  speedster: { boost: { speed: 1.5, contact: 1.2 } },
  defender:  { boost: { defense: 1.5, speed: 1.2 } },
  all_round: { boost: { contact: 1.15, power: 1.15, eye: 1.15, speed: 1.15, defense: 1.15, velocity: 1.15, control: 1.15, breaking: 1.15, stamina: 1.15, mental: 1.15 } },
  fireball:  { boost: { velocity: 1.5, stamina: 1.2 } },
  finesse:   { boost: { control: 1.5, mental: 1.2 } },
  breakerz:  { boost: { breaking: 1.5, control: 1.2 } },
};

// 훈련 카탈로그. 라벨은 i18n 의 training.<key>.
export const TRAININGS = {
  // (참고) 일자별 stat 증가량 글로벌 계수는 TRAIN_GAIN_COEFF 로 통제.
  batting:        { stats: ["contact", "power"],     stamina: -18, injuryRisk: 0.008 },
  eye_drill:      { stats: ["eye", "contact"],       stamina: -12, injuryRisk: 0.004 },
  running:        { stats: ["speed"],                stamina: -16, injuryRisk: 0.010 },
  fielding:       { stats: ["defense"],              stamina: -14, injuryRisk: 0.006 },
  pitching:       { stats: ["velocity", "control"],  stamina: -20, injuryRisk: 0.012 },
  breaking_drill: { stats: ["breaking", "control"],  stamina: -16, injuryRisk: 0.008 },
  weight:         { stats: ["power", "stamina"],     stamina: -22, injuryRisk: 0.010 },
  mental:         { stats: ["mental", "control"],    stamina: -8,  injuryRisk: 0.002 },
};

// createPlayer: 다중 재능 + 회귀 로드아웃 지원.
//   talents: 배열 (없으면 [talent]). 모든 재능의 boost 가 시작값 가산 + 합산 boost 로 훈련 효율 적용.
//   startingStat: 회귀 상점 시작 능력치 프리셋 키 — STARTING_STAT_PRESETS lookup, batter/pitcher 가산.
//   traits / relics: 회귀 로드아웃 — player 에 attach (효과 wiring 은 P4).
// 호환: 옛 호출 `createPlayer({ name, talent, hand, faceId })` 그대로 동작.
export function createPlayer({
  name, talent, hand = "right", faceId = "f1",
  talents,
  startingStat = null,
  traits = [],
  relics = [],
  relicLevels = {},
  equipment = { bat: 0, glove: 0, cleats: 0 },
}) {
  const talentList = Array.isArray(talents) && talents.length > 0 ? [...talents] : [talent];
  // 시작 스탯: 평균(50) 살짝 위 — 16세 유망주가 동급 또래보다 약간 두각. 회귀 시스템으로 더 높은 값에서 시작하는 안도 지원.
  const baseBatter = { contact: 50, power: 44, eye: 50, speed: 52, defense: 50 };
  const basePitcher = { velocity: 50, control: 46, breaking: 42, stamina: 52, mental: 50 };
  const batter = { ...baseBatter };
  const pitcher = { ...basePitcher };
  // 재능들의 boost 합산 — 동일 stat 에 다중 적용 시 곱연산.
  const boostsCombined = {};
  for (const tKey of talentList) {
    const b = TALENTS[tKey]?.boost ?? {};
    for (const [stat, m] of Object.entries(b)) {
      boostsCombined[stat] = (boostsCombined[stat] ?? 1) * m;
    }
  }
  // 시작값 보정 — boost 1배 초과 stat 만 +8%
  for (const stat of BATTER_STATS) {
    if ((boostsCombined[stat] ?? 1) > 1) batter[stat] = Math.round(batter[stat] * 1.08);
    batter[stat] += rndInt(-4, 4);
  }
  for (const stat of PITCHER_STATS) {
    if ((boostsCombined[stat] ?? 1) > 1) pitcher[stat] = Math.round(pitcher[stat] * 1.08);
    pitcher[stat] += rndInt(-4, 4);
  }
  // 회귀 상점 시작 능력치 가산
  const preset = startingStat ? STARTING_STAT_PRESETS[startingStat] : null;
  if (preset) {
    for (const [stat, v] of Object.entries(preset.addBatter ?? {})) {
      if (batter[stat] !== undefined) batter[stat] += v;
    }
    for (const [stat, v] of Object.entries(preset.addPitcher ?? {})) {
      if (pitcher[stat] !== undefined) pitcher[stat] += v;
    }
  }
  const traitList = Array.isArray(traits) ? [...traits] : [];
  const relicList = Array.isArray(relics) ? [...relics] : [];
  // hand → throws/bats 디코딩 (Phase 2 좌/우 매치업용).
  const { throws: throws_, bats } = decodeMainHand(hand);

  return {
    name,
    talent: talentList[0],
    talents: talentList,
    hand,
    throws: throws_,
    bats,
    faceId,
    age: 16,
    grade: 1,
    stage: "high",
    teamName: null,
    batter,
    pitcher,
    pitches: assignPitches(pitcher),    // 메인 투수 stat 기반 구종 풀
    position: decideMainPosition(talentList[0], batter, pitcher),
    stamina: 100,
    maxStamina: 100,
    condition: 50,
    conditionTrend: 0,
    injury: null,
    gamesSinceLastPitch: 99,
    // legend_heir / startingFame add — 합산
    fame: pickStartingFame(traitList, relicList),
    money: 0,
    contract: null,
    careerHistory: [],
    seasonStats: emptyStats(),
    careerStats: emptyStats(),
    awards: [],
    startingStat: startingStat ?? null,
    traits: traitList,
    relics: relicList,
    relicLevels: { ...relicLevels },   // 장착 유물 레벨 — traitEffects 가 효과 스케일에 사용
    equipment: { ...equipment },       // 장착된 장비 레벨 스냅샷
  };
}

// createPlayer 진입 시점에는 player 가 아직 없어 effectAdd 못 부른다.
// traits/relics 키 목록만으로 startingFame add 합산.
function pickStartingFame(traitKeys, relicKeys) {
  let add = 0;
  for (const k of traitKeys ?? []) {
    const e = REGRESSION_TRAITS[k]?.effect;
    if (e?.kind === "startingFame" && typeof e.add === "number") add += e.add;
  }
  for (const k of relicKeys ?? []) {
    const e = REGRESSION_RELICS[k]?.effect;
    if (e?.kind === "startingFame" && typeof e.add === "number") add += e.add;
  }
  return add;
}

// 명성 가산 헬퍼 — stardom 의 fameGain ×1.5 자동 반영.
// 양수일 때만 multiplier 적용 (군 입대 등 음수 패널티는 그대로 깎임).
export function addFame(player, amount) {
  if (!player || !Number.isFinite(amount) || amount === 0) return 0;
  const m = amount > 0 ? effectMultiplier(player, "fameGain") : 1;
  const delta = Math.round(amount * m);
  player.fame = (player.fame ?? 0) + delta;
  return delta;
}

// 메인 캐릭터 수비 포지션 자동 결정 — 재능 + 시작 stat 기반.
// 한 번 결정되면 player.position 에 고정. 게임 흐름에 영향 X (단순 표시 + 미래 확장 hook).
function decideMainPosition(talentKey, batter, pitcher) {
  switch (talentKey) {
    case "speedster": return Math.random() < 0.5 ? "CF" : "SS";
    case "power":     return Math.random() < 0.5 ? "1B" : "RF";
    case "defender":  return ["C", "SS", "CF"][Math.floor(Math.random() * 3)];
    case "contact":   return Math.random() < 0.5 ? "2B" : "3B";
    case "fireball":
    case "finesse":
    case "breakerz":  return "DH";   // 투수형 — 타석 설 일 적음
    case "all_round":
    default:          return Math.random() < 0.5 ? "LF" : "3B";
  }
}

// 다중 재능 boost 합산 (곱연산). 옛 코드의 TALENTS[player.talent].boost 를 대체.
export function combinedTalentBoost(player) {
  const out = {};
  const list = Array.isArray(player?.talents) && player.talents.length > 0
    ? player.talents
    : [player?.talent].filter(Boolean);
  for (const tKey of list) {
    const b = TALENTS[tKey]?.boost;
    if (!b) continue;
    for (const [stat, m] of Object.entries(b)) {
      out[stat] = (out[stat] ?? 1) * m;
    }
  }
  return out;
}

export function emptyStats() {
  return {
    games: 0, pa: 0, ab: 0, h: 0, hr: 0, bb: 0, k: 0,
    r: 0, rbi: 0, tb: 0,
    // 신규: 타자 부가 통계
    hbp: 0,     // 사구로 출루
    sf: 0,      // 희생플라이 (타점 산입, AB 제외)
    sb: 0,      // 도루 성공
    cs: 0,      // 도루 실패
    dp: 0,      // 병살타 (타자가 친 게 병살로 처리)
    e: 0,       // 상대 실책 출루 (AB 산입, H 제외)
    pitchG: 0, ip: 0, ipOuts: 0, er: 0, pK: 0, pBB: 0, pH: 0, pHR: 0, w: 0, l: 0, sv: 0,
    // 신규: 투수 부가 통계
    pHbp: 0,    // 피사구
  };
}

// 나이별 훈련/경기 경험치 효율 배수.
// 30세 이후 급격히 감소 — 실제 야구에서 노장은 경험으로 stat 안 오름 (오히려 노화 감쇄가 우세).
// applyGameExperience 와 applyTraining 양쪽에서 사용.
export function ageMultiplier(age) {
  if (age <= 18) return 1.6;
  if (age <= 22) return 1.3;
  if (age <= 27) return 1.0;
  if (age <= 30) return 0.6;
  if (age <= 33) return 0.3;
  if (age <= 36) return 0.1;
  return 0.05;  // 37+ 거의 0 — 노장의 stat 변화는 ageUp 감쇄가 지배
}

// 주인공 stat 한계 — stage 별 (콜업할수록 잠금 해제). 절대 최대 300.
// 주인공 캡 = 같은 단계 NPC 캡 + 50 (NPC_STAT_CAP_BY_STAGE 와 동기). 평균(NPC cap×0.75)보다
// 충분히 위라 주인공이 성장하면 리그 평균을 넘어설 수 있다.
const PLAYER_STAT_CAP_BY_STAGE = {
  high:    150,   // NPC 100 + 50
  univ:    171,   // 121 + 50
  pro2:    219,   // 169 + 50
  pro1:    306,   // 256 + 50
  mlb_a:   219,   // 169 + 50
  mlb_aa:  275,   // 225 + 50
  mlb_aaa: 374,   // 324 + 50
  mlb:     450,   // 400 + 50
};
// 단계별 능력치 스케일 배수 — NPC 캡이 원래(고교100 기준) 대비 커진 비율(= origNpcCap/100).
// 능력치 표시값은 이 배수만큼 커졌지만, 시뮬레이터 타석공식·OVR 임계비교 등 "내부 계산" 은
// 이 값으로 나눠 원래 0~150 스케일에서 동작시킨다(공식/임계 재튜닝 불필요). 고교=1.0(불변).
const STAT_SCALE_BY_STAGE = {
  high: 1.0, univ: 1.1, pro2: 1.3, pro1: 1.6,
  mlb_a: 1.3, mlb_aa: 1.5, mlb_aaa: 1.8, mlb: 2.0,
};
export function statScale(stage) {
  // 결승/국제전 임시 단계("pro1_final" 등)는 베이스 단계 스케일로 매핑.
  const base = typeof stage === "string" ? stage.replace(/_final$/, "") : stage;
  return STAT_SCALE_BY_STAGE[base] ?? 1.0;
}

// stat 을 주면 해당 스탯의 캡(= stage base + 스탯별 영구 +5 보너스), 생략하면 stage base 만.
export function getPlayerStatCap(player, stat = null) {
  const base = PLAYER_STAT_CAP_BY_STAGE[player?.stage] ?? 150;
  const bonus = stat ? capBonusForStat(stat, state?.regression?.permanentPurchases?.statCaps) : 0;
  return base + bonus;
}
// 레이다/막대 그래프 공통 max — stage base + 전 스탯 중 최대 보너스.
// 캡이 큰 스탯에 맞춰 그래프 전체가 함께 커지도록 (한 축이라도 넘치지 않게).
export function getPlayerMaxStatCap(player) {
  const base = PLAYER_STAT_CAP_BY_STAGE[player?.stage] ?? 150;
  return base + maxCapBonus(state?.regression?.permanentPurchases?.statCaps);
}
// 호환용 (옛 코드/세이브) — 의미는 "기본 cap"
export const STAT_CAP = 150;

// 훈련 일자당 stat 증가 글로벌 계수.
// 밸런스 의도: 첫 인생(회귀 보너스 0) HS 1학년 동안 한 종목만 파도 "될지말지" 경계 수준.
//   - 단일 stat 종목(주루→speed) 1년: 최종 ~80대 초중반 (대주자 겨우 가능/불가 경계)
//   - 2-stat 종목(타격 등): 각 stat ~70 수준 (선발/대회 기여 어려움)
// 이전 0.8 은 1년 만에 speed 115+ 도달 → 너무 빠른 성장이라 하향.
// 0.25 기준: 주루만 1년 → speed ~82 (대주자 임계 ~83 경계, 될지말지), 그 외 stat 은 ~50 유지 →
// 단일종목 집중으로도 OVR ~55 라 HS 선발/대회 주전 진입 불가. 장기(22시즌) 피크는 cap 수렴이라 거의 유지.
const TRAIN_GAIN_COEFF = 0.25;

// 주인공 부상 면역 보정 — 훈련/HBP 부상 굴림에 곱해서 실효율 낮춤.
// 예: HBP 베이스 5% → 메인 실효 2% (5% × 0.4).
// 훈련은 prelim risk(0.002~0.012)이 매우 작으므로 0.4x 곱해도 체감 차이는 적음.
export const MAIN_INJURY_LUCK = 0.4;

// 첫 시즌 여부 — learner / past_life_notes 의 firstSeasonTrainBoost 적용 조건.
// HS 1학년 (age === 16, grade === 1, stage === "high", careerHistory 비어있음) 동안만.
function isFirstSeason(player) {
  return player.stage === "high"
      && player.grade === 1
      && (player.careerHistory?.length ?? 0) === 0;
}

// 단일 훈련 적용 (하루치)
// forcedStat: 자동훈련이 방향 기준으로 고른 능력치. 주어지면 tr.stats 대신 그 능력치 하나만 올린다.
//   (훈련 종목은 표시·체력소모·부상위험용으로만 쓰이고, 실제 상승 능력치는 방향이 결정.)
export function applyTraining(player, trainingKey, forcedStat = null) {
  if (player.injury) return { ok: false, reason: "injured" };
  if (player.stamina < 15) return { ok: false, reason: "lowStamina" };
  const tr = TRAININGS[trainingKey];
  if (!tr) return { ok: false, reason: "noTraining" };
  const mult = ageMultiplier(player.age);
  const talentBoost = combinedTalentBoost(player);
  const critical = Math.random() < 0.10;
  const critMult = critical ? 2.0 : 1.0;
  // 회귀 효과: 첫 시즌 훈련 효율 — learner / past_life_notes 합산 곱연산.
  const firstSeasonBoost = isFirstSeason(player)
    ? effectMultiplier(player, "firstSeasonTrainBoost")
    : 1;
  // 훈련 효율 배수 — mentor_letter (멘토의 편지). 모든 훈련 획득량에 곱연산.
  const trainEff = effectMultiplier(player, "trainEfficiency");

  // 핸드 타입별 훈련 효율 배수 (1.1x)
  let handMult = 1.0;
  if (player.hand === "right") {
    if (trainingKey === "batting" || trainingKey === "weight") {
      handMult = 1.1;
    }
  } else if (player.hand === "left") {
    if (trainingKey === "breaking_drill") {
      handMult = 1.1;
    }
  } else if (player.hand === "mixed") {
    if (trainingKey === "running") {
      handMult = 1.1;
    }
  } else if (player.hand === "lefty_rb") {
    if (trainingKey === "fielding" || trainingKey === "mental") {
      handMult = 1.1;
    }
  }

  const gained = {};
  const trainStats = forcedStat ? [forcedStat] : tr.stats;
  for (const stat of trainStats) {
    const base = (0.5 + Math.random() * 0.9) * TRAIN_GAIN_COEFF * firstSeasonBoost * trainEff * handMult;
    const boost = talentBoost[stat] ?? 1.0;
    const cap = getPlayerStatCap(player, stat);
    const target = player.batter[stat] !== undefined ? player.batter : player.pitcher;
    if (target[stat] === undefined) continue;
    const curr = target[stat];
    const diminish = Math.max(0.15, (cap - curr) / cap);
    const delta = +(base * boost * mult * diminish * critMult).toFixed(2);
    target[stat] = Math.min(cap, +(curr + delta).toFixed(1));
    gained[stat] = delta;
  }
  player.stamina = Math.max(0, player.stamina + tr.stamina);
  // 부상 체크 — 주인공은 MAIN_INJURY_LUCK(0.4x) + injuryChance 효과(steel_mental ×0.5) + 컨디션 보정.
  const lowStamina = player.stamina < 25 ? 0.02 : 0;
  const injuryMult = effectMultiplier(player, "injuryChance");  // 기본 1, steel_mental 0.5
  const condMult = conditionInjuryMultiplier(player.condition);
  if (Math.random() < (tr.injuryRisk + lowStamina) * MAIN_INJURY_LUCK * injuryMult * condMult) {
    applyInjury(player);
  }
  if (critical) {
    pushLog({
      msg: t("log.trainingCritical", { label: t("training." + trainingKey) }),
      kind: "good",
    });
  }
  return { ok: true, gained, trainingKey, critical };
}

export function applyWork(player) {
  if (player.injury) return { ok: false, reason: "injured" };
  if (player.stamina < 10) return { ok: false, reason: "lowStamina" };
  const fameBonus = 1 + player.fame / 100;
  const earned = Math.round((player.stage === "high" || player.stage === "univ" ? 8 : 50) * fameBonus * (0.8 + Math.random() * 0.5));
  player.money += earned;
  player.stamina = Math.max(0, player.stamina - 12);
  return { ok: true, earned };
}

export function applyRest(player) {
  const recover = 30 + Math.floor(Math.random() * 10);
  player.stamina = Math.min(player.maxStamina, player.stamina + recover);
  if (player.injury) {
    // 회귀 효과: prosthetic 의 injuryRecoverySpeed ×2 — 회복 가속.
    const recoverMult = effectMultiplier(player, "injuryRecoverySpeed");
    player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - 0.2 * recoverMult);
    if (player.injury.weeksLeft <= 0) {
      const healedSeverity = player.injury.severity;
      pushLog({
        msg: t("injury.recovered", { type: t("injury." + healedSeverity) }),
        kind: "good",
      });
      player.injury = null;
      unlockSevereRecoveredIf(player, healedSeverity);
    }
  }
  return { ok: true, recover };
}

// 부상 부위별 영향 stat — 영구 후유증(aftereffect) 적용 대상.
// 어깨/팔꿈치 = 투수, 손목 = 타자, 무릎/발목/햄스트링/허리 = 신체 일반.
const BODY_PART_STATS = {
  shoulder:  [["pitcher", "velocity"], ["pitcher", "stamina"]],
  elbow:     [["pitcher", "velocity"], ["pitcher", "breaking"]],
  wrist:     [["batter",  "contact"],  ["batter",  "power"]],
  knee:      [["batter",  "speed"],    ["batter",  "defense"]],
  ankle:     [["batter",  "speed"]],
  hamstring: [["batter",  "speed"],    ["pitcher", "stamina"]],
  back:      [["batter",  "power"],    ["pitcher", "stamina"]],
};
const BODY_PART_KEYS = Object.keys(BODY_PART_STATS);

function pickBodyPart() {
  return BODY_PART_KEYS[Math.floor(Math.random() * BODY_PART_KEYS.length)];
}

// 부상 객체 — { severity, bodyPart, weeksLeft, surgery, aftereffect, _isNew }
// 표시용 라벨은 t("injury." + severity), t("bodyPart." + bodyPart).
// _isNew 플래그: UI 가 한 번 토스트 띄운 후 false 로 끔.
// forceSeverity:
//   - 0~1 숫자(roll) → 분포 기반 severity 결정 (v0.4 + offseason 호출 호환)
//   - "minor"|"moderate"|"severe" 문자열 → 그대로 severity 사용 (v0.3 후반 패치 HBP 부상 호출 호환)
//   - null → Math.random() 굴림
// opts.bodyPart: 강제 부위 (생략 시 랜덤)
export function applyInjury(player, forceSeverity = null, opts = {}) {
  const WEEKS_BY_SEVERITY = { minor: 1, moderate: 3, severe: 8 };
  let severity, baseWeeks;
  if (typeof forceSeverity === "string" && WEEKS_BY_SEVERITY[forceSeverity] !== undefined) {
    severity = forceSeverity;
    baseWeeks = WEEKS_BY_SEVERITY[severity];
  } else {
    const roll = typeof forceSeverity === "number" ? forceSeverity : Math.random();
    if (roll < 0.65)      { severity = "minor";    baseWeeks = 1; }
    else if (roll < 0.92) { severity = "moderate"; baseWeeks = 3; }
    else                  { severity = "severe";   baseWeeks = 8; }
  }

  const bodyPart = opts.bodyPart ?? pickBodyPart();

  // 토미존 / 큰 수술 — severe + (어깨|팔꿈치) + 30%.
  // iron_arm trait 보유 시 토미존 확률 0 (severe 자체는 발생, 다만 수술 단계로 진행 안 함).
  let surgery = false;
  let weeksLeft = baseWeeks;
  if (severity === "severe"
      && (bodyPart === "shoulder" || bodyPart === "elbow")
      && !hasTraitFlag(player, "tjsBlock")
      && Math.random() < 0.30) {
    surgery = true;
    weeksLeft = 30;
  }

  // 영구 후유증 (aftereffect) 굴림
  const aftereffectChance =
    surgery ? 1.0
    : severity === "severe" ? 0.6
    : severity === "moderate" ? 0.3
    : 0;
  let aftereffect = null;
  if (Math.random() < aftereffectChance) {
    aftereffect = applyAftereffect(player, bodyPart, severity, surgery);
  }

  const injury = { severity, bodyPart, weeksLeft, surgery, aftereffect, _isNew: true };
  player.injury = injury;

  if (surgery) {
    pushLog({
      msg: t("injury.surgery", {
        part: t("bodyPart." + bodyPart),
        weeks: weeksLeft,
      }),
      kind: "bad",
    });
  } else {
    pushLog({
      msg: t("injury.detectedWithPart", {
        part: t("bodyPart." + bodyPart),
        type: t("injury." + severity),
        weeks: weeksLeft,
      }),
      kind: "bad",
    });
  }
}

// 부위에 따라 즉시 능력치 영구 감소. 회복 시점 이후로도 유지.
function applyAftereffect(player, bodyPart, severity, surgery) {
  const baseDelta = surgery ? 5 : severity === "severe" ? 3 : 1;
  const affected = [];
  for (const [group, stat] of BODY_PART_STATS[bodyPart]) {
    const target = player[group];
    if (target?.[stat] === undefined) continue;
    const before = target[stat];
    const after = Math.max(20, before - baseDelta);
    target[stat] = +after.toFixed(1);
    if (after !== before) affected.push({ group, stat, delta: +(after - before).toFixed(1) });
  }
  return { affected, surgery, severity };
}

// 주간 컨디션 변화 — 70 기준 발산. 호조/슬럼프 사이클.
// 회복 보너스: pitcher.stamina + pitcher.mental 평균 → 70 기준 ±N pp 보정.
// 스태미나 소모량(현재 stamina/maxStamina)도 회복에 영향 — 지친 상태에서는 컨디션 회복 둔화.
export function tickConditionWeekly(player) {
  // 컨디션 회복력 보정: stamina/mental 능력치 평균(50 기준) — 70 능력치라면 +2, 30이면 -2.
  const staminaAbil = player.pitcher?.stamina ?? 50;
  const mentalAbil  = player.pitcher?.mental  ?? 50;
  const abilBonus = ((staminaAbil + mentalAbil) / 2 - 50) / 10;  // ±5 정도
  // 현재 체력 소모 패널티: 체력 50 미만이면 회복 둔화.
  const fatiguePenalty = (player.stamina ?? 100) < 50 ? -2 : 0;
  // 70 기준 평균회귀 — 70 이상이면 떨어지는 쪽, 70 미만이면 올라가는 쪽으로 drift.
  const driftBase = player.condition >= 70 ? -1 : 1;

  if (player.conditionTrend > 0) {
    const delta = rndInt(2, 6) + Math.round(abilBonus * 0.3);
    player.condition = clamp(player.condition + delta, 0, 100);
    player.conditionTrend -= 1;
  } else if (player.conditionTrend < 0) {
    const delta = rndInt(2, 6) - Math.round(abilBonus * 0.3);
    player.condition = clamp(player.condition - Math.max(1, delta), 0, 100);
    player.conditionTrend += 1;
  } else {
    // 평균회귀(70 기준) + 작은 변동 + 능력치 회복 보너스 + 피로 패널티
    const drift = driftBase + Math.round(abilBonus * 0.4) + fatiguePenalty;
    player.condition = clamp(player.condition + drift + rndInt(-3, 3), 0, 100);
    // 8% 확률로 새 사이클 진입
    if (Math.random() < 0.08) {
      player.conditionTrend = Math.random() < 0.5 ? rndInt(1, 3) : -rndInt(1, 3);
    }
  }
  // 부상 회복 (주 단위). prosthetic 의 injuryRecoverySpeed ×2 적용.
  if (player.injury) {
    const recoverMult = effectMultiplier(player, "injuryRecoverySpeed");
    player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - 1 * recoverMult);
    if (player.injury.weeksLeft <= 0) {
      const healedSeverity = player.injury.severity;
      pushLog({
        msg: t("injury.returned", { type: t("injury." + healedSeverity) }),
        kind: "good",
      });
      player.injury = null;
      unlockSevereRecoveredIf(player, healedSeverity);
    }
  }
}

// 경기 출장 경험치 — 매 경기 후 능력치 소량 상승
// box 구조: batterBox(.pa, .h, .hr, .bb, .k, .tb), pitcherBox(.er, .pK, .pBB, .pH, .pHR)
// targets: 훈련 방향(프리셋)별 능력치 목표 맵 { contact:150, ... } (autoTrain.directionTargets).
//   양(+) 경험치가 이 목표를 넘겨 특정 능력치(컨택/멘탈 등)를 부풀리지 않게 클램프 — 밸런스/방향 유지.
//   null 이면(자동모드 OFF) 클램프 안 함(기존 동작). 음(-) 페널티는 목표와 무관하게 항상 적용.
export function applyGameExperience(player, mainPlayerResult, targets = null) {
  if (!mainPlayerResult) return { gained: {} };
  const gained = {};
  const ageMult = ageMultiplier(player.age);
  // 재능 부스트 — 훈련과 동일하게 경기 경험치에도 반영
  const talentBoost = combinedTalentBoost(player);

  function bump(group, stat, amount) {
    if (player[group][stat] === undefined) return;
    // 재능 부스트: 양수 경험치에만 적용 (페널티는 재능과 무관)
    const talent = amount > 0 ? (talentBoost[stat] ?? 1.0) : 1.0;
    // 경기 경험치 효율 축소 — 옛 ×1.5 는 매 시즌 stat +10~20 으로 노화 감쇄를 압도.
    // ×0.7 로 낮춰 30대 후반에 노화 감쇄가 우세해지도록 (실제 야구 곡선).
    const adj = amount * talent * ageMult * 0.7;
    const curr = player[group][stat];
    // 방향 목표 초과 시 양(+) 경험치 차단 (페널티는 통과).
    if (adj > 0 && targets) {
      const tgt = targets[stat];
      if (tgt != null && curr >= tgt) return;
    }
    const cap = getPlayerStatCap(player, stat);
    const diminish = Math.max(0.15, (cap - curr) / cap);
    const delta = +(adj * diminish).toFixed(3);
    player[group][stat] = Math.min(cap, +(curr + delta).toFixed(2));
    const key = `${group}.${stat}`;
    gained[key] = (gained[key] ?? 0) + delta;
  }

  // 타자 경험치
  const bbox = mainPlayerResult.batterBox;
  if (bbox && bbox.pa > 0) {
    // 출장 기본 보너스
    bump("batter", "contact", 0.10);
    bump("batter", "power", 0.05);
    bump("batter", "eye", 0.05);
    bump("batter", "speed", 0.05);
    bump("batter", "defense", 0.05);
    // 성적 보너스
    bump("batter", "contact", bbox.h * 0.10);
    bump("batter", "power", bbox.hr * 0.30);
    bump("batter", "power", (bbox.tb - bbox.h) * 0.05); // 장타 누적
    bump("batter", "eye", bbox.bb * 0.08);
    // 삼진 페널티 (작게)
    bump("batter", "eye", -bbox.k * 0.02);
    // 신규: 부가 통계 보너스/페널티
    bump("batter", "eye",   (bbox.hbp ?? 0) * 0.04); // 사구도 출루 — 선구 약간
    bump("batter", "power", (bbox.sf  ?? 0) * 0.10); // 희생플라이 = 깊은 외야 타구
    bump("batter", "speed", (bbox.sb  ?? 0) * 0.12); // 도루 성공
    bump("batter", "speed", -(bbox.cs ?? 0) * 0.06); // 도루 실패
    bump("batter", "speed", -(bbox.dp ?? 0) * 0.03); // 병살 — 발 느리다는 신호
  }

  // 투수 경험치
  const pbox = mainPlayerResult.pitcherBox;
  if (pbox) {
    // 등판 기본 보너스
    bump("pitcher", "velocity", 0.05);
    bump("pitcher", "control", 0.10);
    bump("pitcher", "breaking", 0.05);
    bump("pitcher", "stamina", 0.10);
    bump("pitcher", "mental", 0.05);
    // 성적 보너스
    bump("pitcher", "velocity", (pbox.pK ?? 0) * 0.04);
    bump("pitcher", "breaking", (pbox.pK ?? 0) * 0.03);
    bump("pitcher", "control", -((pbox.pBB ?? 0) * 0.02));
    bump("pitcher", "control", -((pbox.pHR ?? 0) * 0.05));
    bump("pitcher", "control", -((pbox.pHbp ?? 0) * 0.04)); // 피사구 — 제구 페널티
    // 호투 보너스
    const er = pbox.er ?? 0;
    if (er === 0) {
      bump("pitcher", "control", 0.30);
      bump("pitcher", "mental", 0.30);
    } else if (er <= 2) {
      bump("pitcher", "control", 0.10);
      bump("pitcher", "mental", 0.10);
    }
    if ((pbox.pK ?? 0) >= 9) {
      bump("pitcher", "velocity", 0.20);
      bump("pitcher", "breaking", 0.15);
    }
  }

  return { gained };
}

// 나이 진행 (시즌 종료 시) — 실제 야구 노화 곡선 반영.
// 24-29 피크 → 30-32 미세 → 33-35 점진 → 36-39 가속 → 40+ 급격.
// 한 시즌 stat 변화 기댓값: 30세 -0.1, 35세 -1.0, 38세 -2.3, 40세 -3.4.
export function ageUp(player) {
  player.age += 1;
  player.grade += 1;
  const age = player.age;
  // 회귀 효과: prime_extend 의 agingDelay — 노화 시작 +N년 시프트.
  const delay = effectAdd(player, "agingDelay", "years");
  if (age < 30 + delay) return;

  // 구간별 (확률, 최대 감쇄폭). delay 적용 시 임계 자체가 시프트.
  let declineChance, declineMax;
  if (age >= 40 + delay)      { declineChance = 0.85; declineMax = 6; }
  else if (age >= 38 + delay) { declineChance = 0.70; declineMax = 5; }
  else if (age >= 36 + delay) { declineChance = 0.50; declineMax = 4; }
  else if (age >= 33 + delay) { declineChance = 0.30; declineMax = 3; }
  else                        { declineChance = 0.10; declineMax = 2; }  // 30-32 + delay

  for (const stat of BATTER_STATS) {
    if (Math.random() < declineChance) {
      player.batter[stat] = Math.max(20, player.batter[stat] - rndInt(1, declineMax));
    }
  }
  for (const stat of PITCHER_STATS) {
    if (Math.random() < declineChance) {
      player.pitcher[stat] = Math.max(20, player.pitcher[stat] - rndInt(1, declineMax));
    }
  }
}

// 종합 평가 (스카우트 점수 대용)
export function overallScore(player) {
  const b = player.batter;
  const p = player.pitcher;
  const bat = (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
  const pit = (p.velocity + p.control + p.breaking + p.stamina + p.mental) / 5;
  return +((bat * 0.6 + pit * 0.4)).toFixed(1);
}

// 포지션(타자) / 투수 역할별 OVR — 각 스탯 평균.
export function roleOVRs(player) {
  const b = player.batter;
  const p = player.pitcher;
  return {
    bat: (b.contact + b.power + b.eye + b.speed + b.defense) / 5,
    pit: (p.velocity + p.control + p.breaking + p.stamina + p.mental) / 5,
  };
}

// 대표팀/올스타 선발 평가 — 실제 선발처럼 "강한 포지션" 기준 + 양방향 프리미엄.
//   - 순수 타자/투수(특화): 강한 쪽 OVR 으로 평가 (약한 쪽은 거의 영향 없음)
//   - 양방향(둘 다 준수): 약한 쪽의 25% 가산 → 유틸리티/오타니형 프리미엄
// overallScore(타×0.6+투×0.4 블렌드)와 달리 특화 선수를 불리하게 누르지 않음.
export function nationalTeamRating(player) {
  const { bat, pit } = roleOVRs(player);
  const hi = Math.max(bat, pit);
  const lo = Math.min(bat, pit);
  // 주인공 능력치는 캡과 무관하게 훈련 한계로 ~옛 스케일에 머무므로 정규화하지 않는다(고정 임계 그대로 유효).
  return +(hi + lo * 0.25).toFixed(1);
}

// 컨디션 70 을 기준으로 +/− 작용. cond=70 → modifier 0, cond=100 → +0.43, cond=0 → -1.0.
// 실제 게임 영향은 *0.3 곱연산으로 합산되므로 cond=100 시 +13%, cond=0 시 -30% 정도.
function conditionModifier(condition) {
  return (condition - 70) / 70;
}

export function getEquipmentStats(player) {
  const eq = player?.equipment ?? { bat: 0, glove: 0, cleats: 0 };
  const bonuses = {};
  for (const type of ["bat", "glove", "cleats"]) {
    const lvl = eq[type] ?? 0;
    const spec = getEquipmentSpec(type, lvl);
    if (spec && spec.stats) {
      for (const [stat, val] of Object.entries(spec.stats)) {
        bonuses[stat] = (bonuses[stat] ?? 0) + val;
      }
    }
  }
  return bonuses;
}

export function getEffectiveBatter(player) {
  const condMod = conditionModifier(player.condition);
  const fatigueMod = player.stamina < 50 ? -(50 - player.stamina) * 0.003 : 0;
  const injuryMod = player.injury ? -0.25 : 0;
  const total = 1 + condMod * 0.3 + fatigueMod + injuryMod;
  const out = {};
  const eqStats = getEquipmentStats(player);
  for (const stat of BATTER_STATS) {
    const base = player.batter[stat] + (eqStats[stat] ?? 0);
    out[stat] = base * total;
  }
  return out;
}

export function getEffectivePitcher(player) {
  const condMod = conditionModifier(player.condition);
  const fatigueMod = player.stamina < 50 ? -(50 - player.stamina) * 0.003 : 0;
  const injuryMod = player.injury ? -0.25 : 0;
  const total = 1 + condMod * 0.3 + fatigueMod + injuryMod;
  const out = {};
  const eqStats = getEquipmentStats(player);
  for (const stat of PITCHER_STATS) {
    const base = player.pitcher[stat] + (eqStats[stat] ?? 0);
    out[stat] = base * total;
  }
  return out;
}


// 컨디션에 따른 부상 확률 보정. <50 ×1.5, >80 ×0.7, 그 외 ×1.
export function conditionInjuryMultiplier(condition) {
  if (condition < 50) return 1.5;
  if (condition > 80) return 0.7;
  return 1.0;
}

function rndInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
