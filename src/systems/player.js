// 주인공 캐릭터 시스템
// 능력치 스케일: 0~100
// 양방향(투타)이므로 batter + pitcher 능력치 모두 유지

import { pushLog } from "../state.js";

export const BATTER_STATS = ["contact", "power", "eye", "speed", "defense"];
export const PITCHER_STATS = ["velocity", "control", "breaking", "stamina", "mental"];

export const STAT_LABELS = {
  contact: "컨택", power: "파워", eye: "선구안", speed: "주력", defense: "수비",
  velocity: "구속", control: "제구", breaking: "변화구", stamina: "스태미나", mental: "멘탈",
};

// 재능 타입 — 훈련 효율에 영향
export const TALENTS = {
  contact:   { label: "컨택형",    boost: { contact: 1.4, eye: 1.2 } },
  power:     { label: "파워형",    boost: { power: 1.4, contact: 0.9 } },
  speedster: { label: "주루형",    boost: { speed: 1.5, defense: 1.2 } },
  defender:  { label: "수비형",    boost: { defense: 1.5, contact: 1.1 } },
  all_round: { label: "만능형",    boost: { contact: 1.15, power: 1.15, eye: 1.15, speed: 1.15, defense: 1.15, velocity: 1.15, control: 1.15, breaking: 1.15, stamina: 1.15, mental: 1.15 } },
  fireball:  { label: "강속구형",  boost: { velocity: 1.5, stamina: 1.2 } },
  finesse:   { label: "제구형",    boost: { control: 1.5, mental: 1.2 } },
  breakerz:  { label: "변화구형",  boost: { breaking: 1.5, control: 1.2 } },
};

export const TRAININGS = {
  batting:   { label: "타격 훈련",  stats: ["contact", "power"],     stamina: -18, injuryRisk: 0.008 },
  eye_drill: { label: "선구안 훈련", stats: ["eye", "contact"],       stamina: -12, injuryRisk: 0.004 },
  running:   { label: "주루 훈련",  stats: ["speed"],                stamina: -16, injuryRisk: 0.010 },
  fielding:  { label: "수비 훈련",  stats: ["defense"],              stamina: -14, injuryRisk: 0.006 },
  pitching:  { label: "투구 훈련",  stats: ["velocity", "control"],  stamina: -20, injuryRisk: 0.012 },
  breaking_drill: { label: "변화구 훈련", stats: ["breaking", "control"], stamina: -16, injuryRisk: 0.008 },
  weight:    { label: "웨이트",     stats: ["power", "stamina"],     stamina: -22, injuryRisk: 0.010 },
  mental:    { label: "멘탈 훈련",  stats: ["mental", "control"],    stamina: -8,  injuryRisk: 0.002 },
};

export const ACTIONS = {
  train: { label: "훈련" },
  work:  { label: "일/아르바이트" },
  rest:  { label: "휴식" },
};

export function createPlayer({ name, talent, hand = "right", faceId = "f1" }) {
  const baseBatter = { contact: 35, power: 30, eye: 35, speed: 40, defense: 38 };
  const basePitcher = { velocity: 35, control: 32, breaking: 28, stamina: 40, mental: 38 };
  // 재능에 따라 시작값 살짝 보정
  const boosts = TALENTS[talent].boost;
  const batter = { ...baseBatter };
  const pitcher = { ...basePitcher };
  for (const stat of BATTER_STATS) {
    if (boosts[stat]) batter[stat] = Math.round(batter[stat] * 1.08);
    batter[stat] += rndInt(-4, 4);
  }
  for (const stat of PITCHER_STATS) {
    if (boosts[stat]) pitcher[stat] = Math.round(pitcher[stat] * 1.08);
    pitcher[stat] += rndInt(-4, 4);
  }
  return {
    name,
    talent,
    hand,
    faceId,
    age: 16,
    grade: 1,
    stage: "high",
    teamName: null,
    batter,
    pitcher,
    stamina: 100,
    maxStamina: 100,
    condition: 50,           // 0~100, 50 평균
    conditionTrend: 0,       // 호조/슬럼프 잔여 주
    injury: null,            // {type, weeksLeft, severity}
    gamesSinceLastPitch: 99, // 투수 등판 휴식 카운터
    fame: 0,
    money: 0,
    careerHistory: [],
    seasonStats: emptyStats(),
    careerStats: emptyStats(),
  };
}

export function emptyStats() {
  return {
    games: 0, pa: 0, ab: 0, h: 0, hr: 0, bb: 0, k: 0,
    r: 0, rbi: 0, sb: 0, tb: 0,
    pitchG: 0, ip: 0, er: 0, pK: 0, pBB: 0, pH: 0, pHR: 0, w: 0, l: 0, sv: 0,
  };
}

// 나이별 훈련 효율 배수
export function ageMultiplier(age) {
  if (age <= 18) return 1.6;
  if (age <= 22) return 1.3;
  if (age <= 27) return 1.0;
  if (age <= 31) return 0.7;
  if (age <= 35) return 0.4;
  return 0.2;
}

export const STAT_CAP = 150;

// 단일 훈련 적용 (하루치)
export function applyTraining(player, trainingKey) {
  if (player.injury) return { ok: false, reason: "부상중" };
  if (player.stamina < 15) return { ok: false, reason: "체력부족" };
  const t = TRAININGS[trainingKey];
  if (!t) return { ok: false, reason: "없는 훈련" };
  const mult = ageMultiplier(player.age);
  const talentBoost = TALENTS[player.talent].boost;
  const critical = Math.random() < 0.10;
  const critMult = critical ? 2.0 : 1.0;
  const gained = {};
  for (const stat of t.stats) {
    const base = (0.5 + Math.random() * 0.9) * 2.0;
    const boost = talentBoost[stat] ?? 1.0;
    const cap = STAT_CAP;
    const target = player.batter[stat] !== undefined ? player.batter : player.pitcher;
    if (target[stat] === undefined) continue;
    const curr = target[stat];
    const diminish = Math.max(0.15, (cap - curr) / cap);
    const delta = +(base * boost * mult * diminish * critMult).toFixed(2);
    target[stat] = Math.min(cap, +(curr + delta).toFixed(1));
    gained[stat] = delta;
  }
  player.stamina = Math.max(0, player.stamina + t.stamina);
  // 부상 체크
  const lowStamina = player.stamina < 25 ? 0.02 : 0;
  if (Math.random() < t.injuryRisk + lowStamina) {
    applyInjury(player);
  }
  if (critical) {
    pushLog({ msg: `${t.label} 대성공! 효과 2배`, kind: "good" });
  }
  return { ok: true, gained, label: t.label, critical };
}

export function applyWork(player) {
  if (player.injury) return { ok: false, reason: "부상중" };
  if (player.stamina < 10) return { ok: false, reason: "체력부족" };
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
    player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - 0.2);
    if (player.injury.weeksLeft <= 0) {
      pushLog({ msg: `${player.injury.type} 부상이 회복됐다.`, kind: "good" });
      player.injury = null;
    }
  }
  return { ok: true, recover };
}

export function applyInjury(player, forceSeverity = null) {
  const roll = forceSeverity ?? Math.random();
  let injury;
  if (roll < 0.65) injury = { type: "근육통", weeksLeft: 1, severity: "minor" };
  else if (roll < 0.92) injury = { type: "염좌", weeksLeft: 3, severity: "moderate" };
  else injury = { type: "인대 손상", weeksLeft: 8, severity: "severe" };
  player.injury = injury;
  pushLog({ msg: `${injury.type} 부상! (${injury.weeksLeft}주 예상)`, kind: "bad" });
}

// 주간 컨디션 변화 — 호조/슬럼프 사이클
export function tickConditionWeekly(player) {
  if (player.conditionTrend > 0) {
    player.condition = clamp(player.condition + rndInt(2, 6), 0, 100);
    player.conditionTrend -= 1;
  } else if (player.conditionTrend < 0) {
    player.condition = clamp(player.condition - rndInt(2, 6), 0, 100);
    player.conditionTrend += 1;
  } else {
    // 평균회귀 + 작은 변동
    const drift = player.condition > 60 ? -1 : player.condition < 40 ? 1 : 0;
    player.condition = clamp(player.condition + drift + rndInt(-4, 4), 0, 100);
    // 5% 확률로 새 사이클 진입
    if (Math.random() < 0.08) {
      player.conditionTrend = Math.random() < 0.5 ? rndInt(1, 3) : -rndInt(1, 3);
    }
  }
  // 부상 회복 (주 단위)
  if (player.injury) {
    player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - 1);
    if (player.injury.weeksLeft <= 0) {
      pushLog({ msg: `${player.injury.type} 부상에서 복귀했다.`, kind: "good" });
      player.injury = null;
    }
  }
}

// 경기 출장 경험치 — 매 경기 후 능력치 소량 상승
// box 구조: batterBox(.pa, .h, .hr, .bb, .k, .tb), pitcherBox(.er, .pK, .pBB, .pH, .pHR)
export function applyGameExperience(player, mainPlayerResult) {
  if (!mainPlayerResult) return { gained: {} };
  const gained = {};
  const ageMult = ageMultiplier(player.age);

  function bump(group, stat, amount) {
    if (player[group][stat] === undefined) return;
    const adj = amount * ageMult * 1.5;
    const cap = STAT_CAP;
    const curr = player[group][stat];
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

// 나이 진행 (시즌 종료 시)
export function ageUp(player) {
  player.age += 1;
  player.grade += 1;
  // 노화로 인한 능력 자연 감소 (28세 이후 점진적)
  if (player.age >= 28) {
    const declineChance = (player.age - 28) * 0.05;
    for (const stat of BATTER_STATS) {
      if (Math.random() < declineChance) {
        player.batter[stat] = Math.max(20, player.batter[stat] - rndInt(0, 3));
      }
    }
    for (const stat of PITCHER_STATS) {
      if (Math.random() < declineChance) {
        player.pitcher[stat] = Math.max(20, player.pitcher[stat] - rndInt(0, 3));
      }
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

export function getEffectiveBatter(player) {
  const condMod = (player.condition - 50) / 100; // -0.5 ~ +0.5
  const fatigueMod = player.stamina < 50 ? -(50 - player.stamina) * 0.003 : 0;
  const injuryMod = player.injury ? -0.25 : 0;
  const total = 1 + condMod * 0.3 + fatigueMod + injuryMod;
  const out = {};
  for (const stat of BATTER_STATS) out[stat] = player.batter[stat] * total;
  return out;
}

export function getEffectivePitcher(player) {
  const condMod = (player.condition - 50) / 100;
  const fatigueMod = player.stamina < 50 ? -(50 - player.stamina) * 0.003 : 0;
  const injuryMod = player.injury ? -0.25 : 0;
  const total = 1 + condMod * 0.3 + fatigueMod + injuryMod;
  const out = {};
  for (const stat of PITCHER_STATS) out[stat] = player.pitcher[stat] * total;
  return out;
}

function rndInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
