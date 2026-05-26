// 주인공 캐릭터 시스템
// 능력치 스케일: 0~100
// 양방향(투타)이므로 batter + pitcher 능력치 모두 유지
//
// i18n: 라벨/메시지는 모두 i18n 키로만 보유. 사람이 읽는 텍스트는 t() 호출로 UI에서 조회.

import { pushLog } from "../state.js";
import { t } from "../i18n/index.js";

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
  power:     { boost: { power: 1.4, contact: 0.9 } },
  speedster: { boost: { speed: 1.5, defense: 1.2 } },
  defender:  { boost: { defense: 1.5, contact: 1.1 } },
  all_round: { boost: { contact: 1.15, power: 1.15, eye: 1.15, speed: 1.15, defense: 1.15, velocity: 1.15, control: 1.15, breaking: 1.15, stamina: 1.15, mental: 1.15 } },
  fireball:  { boost: { velocity: 1.5, stamina: 1.2 } },
  finesse:   { boost: { control: 1.5, mental: 1.2 } },
  breakerz:  { boost: { breaking: 1.5, control: 1.2 } },
};

// 훈련 카탈로그. 라벨은 i18n 의 training.<key>.
export const TRAININGS = {
  batting:        { stats: ["contact", "power"],     stamina: -18, injuryRisk: 0.008 },
  eye_drill:      { stats: ["eye", "contact"],       stamina: -12, injuryRisk: 0.004 },
  running:        { stats: ["speed"],                stamina: -16, injuryRisk: 0.010 },
  fielding:       { stats: ["defense"],              stamina: -14, injuryRisk: 0.006 },
  pitching:       { stats: ["velocity", "control"],  stamina: -20, injuryRisk: 0.012 },
  breaking_drill: { stats: ["breaking", "control"],  stamina: -16, injuryRisk: 0.008 },
  weight:         { stats: ["power", "stamina"],     stamina: -22, injuryRisk: 0.010 },
  mental:         { stats: ["mental", "control"],    stamina: -8,  injuryRisk: 0.002 },
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
    awards: [],   // {year, grade, stage, key}
  };
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
    pitchG: 0, ip: 0, er: 0, pK: 0, pBB: 0, pH: 0, pHR: 0, w: 0, l: 0, sv: 0,
    // 신규: 투수 부가 통계
    pHbp: 0,    // 피사구
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

// 주인공 stat 한계 — stage 별 (콜업할수록 잠금 해제). 절대 최대 300.
const PLAYER_STAT_CAP_BY_STAGE = {
  high:    150,
  univ:    175,
  pro2:    200,
  pro1:    250,
  mlb_a:   200,
  mlb_aa:  250,
  mlb_aaa: 275,
  mlb:     300,
  japan:   250,
};
export function getPlayerStatCap(player) {
  return PLAYER_STAT_CAP_BY_STAGE[player?.stage] ?? 150;
}
// 호환용 (옛 코드/세이브) — 의미는 "기본 cap"
export const STAT_CAP = 150;

// 단일 훈련 적용 (하루치)
export function applyTraining(player, trainingKey) {
  if (player.injury) return { ok: false, reason: "injured" };
  if (player.stamina < 15) return { ok: false, reason: "lowStamina" };
  const tr = TRAININGS[trainingKey];
  if (!tr) return { ok: false, reason: "noTraining" };
  const mult = ageMultiplier(player.age);
  const talentBoost = TALENTS[player.talent].boost;
  const critical = Math.random() < 0.10;
  const critMult = critical ? 2.0 : 1.0;
  const gained = {};
  for (const stat of tr.stats) {
    const base = (0.5 + Math.random() * 0.9) * 2.0;
    const boost = talentBoost[stat] ?? 1.0;
    const cap = getPlayerStatCap(player);
    const target = player.batter[stat] !== undefined ? player.batter : player.pitcher;
    if (target[stat] === undefined) continue;
    const curr = target[stat];
    const diminish = Math.max(0.15, (cap - curr) / cap);
    const delta = +(base * boost * mult * diminish * critMult).toFixed(2);
    target[stat] = Math.min(cap, +(curr + delta).toFixed(1));
    gained[stat] = delta;
  }
  player.stamina = Math.max(0, player.stamina + tr.stamina);
  // 부상 체크
  const lowStamina = player.stamina < 25 ? 0.02 : 0;
  if (Math.random() < tr.injuryRisk + lowStamina) {
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
    player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - 0.2);
    if (player.injury.weeksLeft <= 0) {
      pushLog({
        msg: t("injury.recovered", { type: t("injury." + player.injury.severity) }),
        kind: "good",
      });
      player.injury = null;
    }
  }
  return { ok: true, recover };
}

// 부상 객체는 severity 키만 보유. 표시용 라벨은 t("injury." + severity).
// _isNew 플래그: UI 가 한 번 토스트 띄운 후 false 로 끔.
export function applyInjury(player, forceSeverity = null) {
  const roll = forceSeverity ?? Math.random();
  let injury;
  if (roll < 0.65) injury = { weeksLeft: 1, severity: "minor", _isNew: true };
  else if (roll < 0.92) injury = { weeksLeft: 3, severity: "moderate", _isNew: true };
  else injury = { weeksLeft: 8, severity: "severe", _isNew: true };
  player.injury = injury;
  pushLog({
    msg: t("injury.detected", {
      type: t("injury." + injury.severity),
      weeks: injury.weeksLeft,
    }),
    kind: "bad",
  });
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
      pushLog({
        msg: t("injury.returned", { type: t("injury." + player.injury.severity) }),
        kind: "good",
      });
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
    const cap = getPlayerStatCap(player);
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
