// 시즌 종료 후 휴식기 시스템 — 3단계 흐름.
//
// 흐름:
//   1) 카테고리 선택 (특훈 / 전지훈련 / 일반훈련 / 휴식)
//      → 카테고리 base 효과 즉시 적용 (예: 휴식 = 스태미나/멘탈 회복)
//   2) 카테고리 이벤트 풀에서 1개 랜덤 추출. "이벤트가 발생했다. 진행할까?" yes/no
//      → no 면 base 만으로 끝
//      → yes 면 굴림 (great 20% / ok 70% / bad 10%)
//   3) 결과: 굴림 결과 텍스트 + base + 이벤트 효과 합산 적용
//
// 표시 텍스트는 모두 i18n: offseason.<cat>, offseason.event.<key>.{label,desc,great,ok,bad}.

import { BATTER_STATS, PITCHER_STATS, applyInjury, nationalTeamRating, addFame, getPlayerStatCap } from "./player.js";
import { state } from "../state.js";

const STAT_MIN = 20;
const OUTCOME_WEIGHTS = { great: 0.20, ok: 0.70, bad: 0.10 };

// ─── 헬퍼 ─────────────────────────────────────────────────────────
export function getPlayerTalentCategory(player) {
  const batterTalents = ["slugger", "sprinter"];
  const pitcherTalents = ["fireballer", "tactician"];
  // all_round / 미분류 재능은 balanced 취급 (아래 hasBatter/hasPitcher 모두 false → balanced)

  // player.talent (primary) 를 항상 포함시켜 저장 데이터의 talents 배열 불일치를 방어.
  const primaryTalent = player?.talent;
  const talentArr = Array.isArray(player?.talents) && player.talents.length > 0
    ? player.talents
    : [];

  // 중복 제거: primary 를 앞에 놓되 이미 있으면 무시
  const talents = primaryTalent
    ? [primaryTalent, ...talentArr.filter(t => t !== primaryTalent)]
    : talentArr.length > 0
      ? talentArr
      : [];

  let hasBatter = false;
  let hasPitcher = false;

  for (const t of talents) {
    if (batterTalents.includes(t)) hasBatter = true;
    if (pitcherTalents.includes(t)) hasPitcher = true;
  }

  if (hasBatter && !hasPitcher) return "batter";
  if (hasPitcher && !hasBatter) return "pitcher";
  return "balanced";
}

function bump(player, group, stat, delta) {
  if (player[group] == null || player[group][stat] === undefined) return null;
  const cap = getPlayerStatCap(player, stat);
  const before = player[group][stat];
  const after = Math.max(STAT_MIN, Math.min(cap, before + delta));
  player[group][stat] = +after.toFixed(1);
  return { group, stat, delta: +(after - before).toFixed(1) };
}
function bumpCap(player, group, stat, delta) {
  if (player[group] == null || player[group][stat] === undefined) return null;
  player.offseasonCapBonuses = player.offseasonCapBonuses ?? {};
  const before = player.offseasonCapBonuses[stat] ?? 0;
  player.offseasonCapBonuses[stat] = before + delta;
  return { group: "cap", stat, delta, statType: group };
}
function maxStaminaBump(player, delta) {
  player.maxStamina = (player.maxStamina ?? 100) + delta;
  return { group: "meta", stat: "maxStamina", delta };
}
function staminaBump(player, delta) {
  const before = player.stamina;
  const after = Math.max(0, Math.min(player.maxStamina ?? 100, player.stamina + delta));
  player.stamina = after;
  return { group: "meta", stat: "stamina", delta: +(after - before).toFixed(1) };
}
function conditionBump(player, delta) {
  const before = player.condition ?? 50;
  const after = Math.max(0, Math.min(100, before + delta));
  player.condition = after;
  return { group: "meta", stat: "condition", delta: +(after - before).toFixed(1) };
}
function healInjury(player, weeks) {
  if (!player.injury) return null;
  const before = player.injury.weeksLeft;
  player.injury.weeksLeft = Math.max(0, player.injury.weeksLeft - weeks);
  const actual = before - player.injury.weeksLeft;
  if (player.injury.weeksLeft <= 0) player.injury = null;
  return { group: "meta", stat: "injuryHeal", delta: actual };
}
function bumpMany(player, list) {
  return list.map(([g, s, d]) => bump(player, g, s, d)).filter(Boolean);
}
function bumpAll(player, group, delta) {
  const stats = group === "batter" ? BATTER_STATS : PITCHER_STATS;
  return stats.map(s => bump(player, group, s, delta)).filter(Boolean);
}
function bumpAllBoth(player, delta) {
  return [...bumpAll(player, "batter", delta), ...bumpAll(player, "pitcher", delta)];
}
function randStat(group, rng = Math.random) {
  const arr = group === "batter" ? BATTER_STATS : PITCHER_STATS;
  return arr[Math.floor(rng() * arr.length)];
}
function fameBump(player, delta) {
  const actual = addFame(player, delta);
  return { group: "meta", stat: "fame", delta: actual };
}

// ─── 카테고리 ─────────────────────────────────────────────────────
// base: 카테고리 선택 즉시 적용되는 안정적 효과 (이벤트 yes/no 와 무관)
export const OFFSEASON_CATEGORIES = {
  intense: {
    base(player) {
      // 특훈 base — 핵심 능력치 중 하나 대폭 상승 (+5) 단, 체력 -30 소모
      const ch = [];
      const c1 = staminaBump(player, -30); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(player);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      const c2 = bump(player, group, s, +5); if (c2) ch.push(c2);
      return ch;
    },
    pool: ["mad_scientist_pitch", "mad_scientist_bat", "secret_pitch", "extreme_drill", "new_form"],
  },
  camp: {
    base(player) {
      // 전지훈련 base — 최대 체력 +2, 체력 +15, 모든 능력치 +1 (타자는 타자 +2, 투수는 투수 +2, 밸런스는 투타 +1)
      const ch = [];
      const c1 = maxStaminaBump(player, +2); if (c1) ch.push(c1);
      const c2 = staminaBump(player, +15); if (c2) ch.push(c2);
      const type = getPlayerTalentCategory(player);
      let stats = [];
      if (type === "batter") {
        stats = bumpAll(player, "batter", +2);
      } else if (type === "pitcher") {
        stats = bumpAll(player, "pitcher", +2);
      } else {
        stats = bumpAllBoth(player, +1);
      }
      return [...ch, ...stats];
    },
    pool: ["foreign_coach", "mentor_pitcher", "team_chemistry", "tough_camp", "unfamiliar_env"],
  },
  regular: {
    base(player) {
      // 일반훈련 base — 체력 -15, 컨디션 +10, 랜덤 타자 1 + 랜덤 투수 1 능력치 +2 (타자는 타자 랜덤 2, 투수는 투수 랜덤 2, 밸런스는 타자 1 + 투수 1)
      const ch = [];
      const c1 = staminaBump(player, -15); if (c1) ch.push(c1);
      const c2 = conditionBump(player, +10); if (c2) ch.push(c2);
      const type = getPlayerTalentCategory(player);
      if (type === "batter") {
        const sb1 = randStat("batter"); const c3 = bump(player, "batter", sb1, +2); if (c3) ch.push(c3);
        const sb2 = randStat("batter"); const c4 = bump(player, "batter", sb2, +2); if (c4) ch.push(c4);
      } else if (type === "pitcher") {
        const sp1 = randStat("pitcher"); const c3 = bump(player, "pitcher", sp1, +2); if (c3) ch.push(c3);
        const sp2 = randStat("pitcher"); const c4 = bump(player, "pitcher", sp2, +2); if (c4) ch.push(c4);
      } else {
        const sb = randStat("batter");  const c3 = bump(player, "batter",  sb, +2); if (c3) ch.push(c3);
        const sp = randStat("pitcher"); const c4 = bump(player, "pitcher", sp, +2); if (c4) ch.push(c4);
      }
      return ch;
    },
    pool: ["new_technique", "rival", "coach_advice", "routine_drill", "night_training"],
  },
  rest: {
    base(player) {
      // 휴식 base — 체력 +50, 컨디션 +15, 부상 회복 1주 단축, 멘탈 +3
      const ch = [];
      const c1 = staminaBump(player, +50); if (c1) ch.push(c1);
      const c2 = conditionBump(player, +15); if (c2) ch.push(c2);
      const c3 = healInjury(player, 1); if (c3) ch.push(c3);
      const c4 = bump(player, "pitcher", "control", +3); if (c4) ch.push(c4);
      return ch;
    },
    pool: ["confession", "family_time", "hobby", "short_trip", "quiet_rest"],
  },

  // 고3(grade=3) 시즌 종료 휴식기에서만 노출됨 — UI 에서 조건부로.
  // 청소년 세계대회 (WBSC U-18 야구 월드컵) — 대표팀 차출 시 큰 이벤트.
  youth_worldcup: {
    base(player) {
      // 대표팀 차출 자체로 멘탈 + 명성 보너스
      const ch = [];
      const c1 = bump(player, "pitcher", "control", +3); if (c1) ch.push(c1);
      ch.push(fameBump(player, +5));
      return ch;
    },
    pool: ["worldcup_run"],
  },

  // 프로 시즌 중 발동된 국제대회 차출 — 해당 시즌 휴식기를 자동으로 대체.
  // player.pendingTournament.key (olympics/asian_games/wbc/premier12) 에 따라
  // 이벤트가 결정된다. 메달/우승 굴림 결과로 병역 면제가 부여될 수 있다.
  intl_tournament: {
    base(player) {
      const ch = [];
      const c1 = bump(player, "pitcher", "control", +3); if (c1) ch.push(c1);
      ch.push(fameBump(player, +10));
      return ch;
    },
    pool: ["olympic_run", "asian_games_run", "wbc_run", "premier12_run"],
  },
};

// 항상 노출되는 기본 카테고리. (youth_worldcup 같은 조건부는 getAvailableCategories 에서 추가)
export const CATEGORY_KEYS = ["intense", "camp", "regular", "rest"];

// 청소년 세계대회(U-18 대표) 차출 기준 — 학년 무관, nationalTeamRating(강한 포지션+양방향) 기준.
// 현실 반영: U-18 국가대표는 전국 고교 최상위. 너프 후 고3 졸업 rating ~85-95 수준이므로,
// 90 이면 잘 큰 상위권 고교생만 차출 (첫 인생 평범한 1·2학년은 진입 불가).
const YOUTH_WORLDCUP_RATING_THRESHOLD = 90;

// ─── 이벤트 정의 — 각 이벤트는 great/ok/bad 3 단계 효과 ───────────
// 이벤트 라벨/설명/결과 텍스트는 i18n. 여기엔 효과만.
export const EVENTS = {
  // ── 특훈 ──
  mad_scientist_pitch: {
    category: "intense",
    great: (p) => {
      const ch = [];
      const c1 = bumpCap(p, "pitcher", "velocity", +2); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher","velocity",+12],["pitcher","breaking",+6]]);
      return [...ch, ...stats];
    },
    ok:    (p) => bumpMany(p, [["pitcher","velocity",+4]]),
    bad:   (p) => bumpMany(p, [["pitcher","velocity",-3],["pitcher","control",-2]]),
  },
  mad_scientist_bat: {
    category: "intense",
    great: (p) => {
      const ch = [];
      const c1 = bumpCap(p, "batter", "contact", +2); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["batter","contact",+12],["batter","power",+6]]);
      return [...ch, ...stats];
    },
    ok:    (p) => bumpMany(p, [["batter","contact",+4]]),
    bad:   (p) => bumpMany(p, [["batter","contact",-3],["batter","power",-2]]),
  },
  secret_pitch: {
    category: "intense",
    great: (p) => {
      const ch = [];
      const c1 = bumpCap(p, "pitcher", "breaking", +2); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher","breaking",+12],["pitcher","control",+5]]);
      return [...ch, ...stats];
    },
    ok:    (p) => bumpMany(p, [["pitcher","breaking",+4]]),
    bad:   (p) => { applyInjury(p, 0.70); return bumpMany(p, [["pitcher","stamina",-3]]); },
  },
  extreme_drill: {
    category: "intense",
    great: (p) => {
      const ch = [];
      const type = getPlayerTalentCategory(p);
      if (type === "batter") {
        const c1 = bumpCap(p, "batter", "contact", +2); if (c1) ch.push(c1);
        const c2 = bumpCap(p, "batter", "power", +2); if (c2) ch.push(c2);
        const stats = bumpAll(p, "batter", +6);
        return [...ch, ...c1 ? [c1] : [], ...c2 ? [c2] : [], ...stats];
      } else if (type === "pitcher") {
        const c1 = bumpCap(p, "pitcher", "control", +2); if (c1) ch.push(c1);
        const c2 = bumpCap(p, "pitcher", "stamina", +2); if (c2) ch.push(c2);
        const stats = bumpAll(p, "pitcher", +6);
        return [...ch, ...c1 ? [c1] : [], ...c2 ? [c2] : [], ...stats];
      } else {
        const c1 = bumpCap(p, "pitcher", "control", +2); if (c1) ch.push(c1);
        const c2 = bumpCap(p, "pitcher", "stamina", +2); if (c2) ch.push(c2);
        const stats = bumpAllBoth(p, +3);
        return [...ch, ...c1 ? [c1] : [], ...c2 ? [c2] : [], ...stats];
      }
    },
    ok: (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpAll(p, "batter", +2);
      if (type === "pitcher") return bumpAll(p, "pitcher", +2);
      return bumpAllBoth(p, +1);
    },
    bad: (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpAll(p, "batter", -4);
      if (type === "pitcher") return bumpAll(p, "pitcher", -4);
      return bumpAllBoth(p, -2);
    },
  },
  new_form: {
    category: "intense",
    great: (p) => {
      const type = getPlayerTalentCategory(p);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      const ch = [];
      const c1 = bumpCap(p, group, s, +2); if (c1) ch.push(c1);
      const stats = bumpMany(p, [[group, s, +10]]);
      return [...ch, ...stats];
    },
    ok: (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "contact", +3]]);
      return bumpMany(p, [["pitcher", "control", +3]]);
    },
    bad: (p) => {
      const type = getPlayerTalentCategory(p);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      return bumpMany(p, [[group, s, -4]]);
    },
  },

  // ── 전지훈련 ──
  foreign_coach: {
    category: "camp",
    great: (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +3); if (c1) ch.push(c1);
      const stats = bumpAll(p, "batter", +4);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +1); if (c1) ch.push(c1);
      const stats = bumpAll(p, "batter", +1);
      return [...ch, ...stats];
    },
    bad:   (p) => bumpMany(p, [["pitcher", "control", -3]]),
  },
  mentor_pitcher: {
    category: "camp",
    great: (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +3); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +8], ["pitcher", "control", +6], ["pitcher", "breaking", +4]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +1); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +3]]);
      return [...ch, ...stats];
    },
    bad:   (p) => bumpMany(p, [["pitcher", "control", -2]]),
  },
  team_chemistry: {
    category: "camp",
    great: (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +3); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpAll(p, "batter", +4);
      else if (type === "pitcher") stats = bumpAll(p, "pitcher", +4);
      else stats = bumpAllBoth(p, +2);
      const f = fameBump(p, +5);
      return [...ch, ...stats, f];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +1); if (c1) ch.push(c1);
      const f = fameBump(p, +2);
      return [...ch, f];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "contact", -3]]);
      return bumpMany(p, [["pitcher", "control", -3]]);
    },
  },
  tough_camp: {
    category: "camp",
    great: (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +5); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "speed", +8], ["batter", "speed", +5]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "stamina", +8], ["pitcher", "velocity", +5]]);
      else stats = bumpMany(p, [["pitcher", "stamina", +8], ["batter", "speed", +5]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +2); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "speed", +2]]);
      else stats = bumpMany(p, [["pitcher", "stamina", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      applyInjury(p, 0.80);
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "speed", -3]]);
      return bumpMany(p, [["pitcher", "stamina", -3]]);
    },
  },
  unfamiliar_env: {
    category: "camp",
    great: (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +3); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "eye", +6], ["batter", "contact", +4]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "control", +6], ["pitcher", "control", +4]]);
      else stats = bumpMany(p, [["pitcher", "control", +6], ["batter", "eye", +4]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = maxStaminaBump(p, +1); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "eye", +1]]);
      else stats = bumpMany(p, [["pitcher", "control", +1]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "eye", -4]]);
      return bumpMany(p, [["pitcher", "control", -4]]);
    },
  },

  // ── 일반훈련 ──
  new_technique: {
    category: "regular",
    great: (p) => {
      const type = getPlayerTalentCategory(p);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      const ch = [];
      const c1 = conditionBump(p, +15); if (c1) ch.push(c1);
      const stats = bumpMany(p, [[group, s, +8]]);
      return [...ch, ...stats];
    },
    ok: (p) => {
      const type = getPlayerTalentCategory(p);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      const ch = [];
      const c1 = conditionBump(p, +5); if (c1) ch.push(c1);
      const stats = bumpMany(p, [[group, s, +2]]);
      return [...ch, ...stats];
    },
    bad: (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "contact", -2]]);
      return bumpMany(p, [["pitcher", "control", -2]]);
    },
  },
  rival: {
    category: "regular",
    great: (p) => {
      const ch = [];
      const c1 = conditionBump(p, +15); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "contact", +6], ["batter", "power", +4]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "control", +6], ["pitcher", "control", +4]]);
      else stats = bumpMany(p, [["pitcher", "control", +6], ["batter", "contact", +4]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = conditionBump(p, +5); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "contact", +2]]);
      else stats = bumpMany(p, [["pitcher", "control", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "contact", -3]]);
      return bumpMany(p, [["pitcher", "control", -3]]);
    },
  },
  coach_advice: {
    category: "regular",
    great: (p) => {
      const ch = [];
      const c1 = conditionBump(p, +15); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "eye", +7], ["batter", "contact", +7]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "control", +7], ["pitcher", "breaking", +7]]);
      else stats = bumpMany(p, [["pitcher", "control", +7], ["batter", "eye", +7]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = conditionBump(p, +5); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "eye", +4]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "control", +4]]);
      else stats = bumpMany(p, [["pitcher", "control", +2], ["batter", "eye", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "eye", -2]]);
      return bumpMany(p, [["pitcher", "control", -2]]);
    },
  },
  routine_drill: {
    category: "regular",
    great: (p) => {
      const ch = [];
      const c1 = conditionBump(p, +20); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "speed", +5], ["batter", "speed", +4]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "stamina", +5], ["pitcher", "control", +4]]);
      else stats = bumpMany(p, [["pitcher", "stamina", +5], ["batter", "speed", +4]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = conditionBump(p, +5); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "speed", +2]]);
      else stats = bumpMany(p, [["pitcher", "stamina", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "speed", -3]]);
      return bumpMany(p, [["pitcher", "control", -3]]);
    },
  },
  night_training: {
    category: "regular",
    great: (p) => {
      const ch = [];
      const c1 = conditionBump(p, +15); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "power", +6], ["batter", "contact", +5]]);
      else if (type === "pitcher") stats = bumpMany(p, [["pitcher", "velocity", +6], ["pitcher", "control", +5]]);
      else stats = bumpMany(p, [["batter", "power", +6], ["pitcher", "velocity", +5]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = conditionBump(p, +5); if (c1) ch.push(c1);
      const type = getPlayerTalentCategory(p);
      let stats = [];
      if (type === "batter") stats = bumpMany(p, [["batter", "power", +2]]);
      else stats = bumpMany(p, [["pitcher", "velocity", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => {
      const type = getPlayerTalentCategory(p);
      if (type === "batter") return bumpMany(p, [["batter", "power", -3]]);
      return bumpMany(p, [["pitcher", "stamina", -3]]);
    },
  },

  // ── 휴식 ──
  confession: {
    category: "rest",
    great: (p) => {
      const ch = [];
      const c1 = healInjury(p, 99); if (c1) ch.push(c1);
      const c2 = bumpMany(p, [["pitcher", "control", +10]]);
      const type = getPlayerTalentCategory(p);
      const group = type === "batter" ? "batter" : (type === "pitcher" ? "pitcher" : (Math.random() < 0.5 ? "batter" : "pitcher"));
      const s = randStat(group);
      const stats = bumpMany(p, [[group, s, +5]]);
      return [...ch, ...c2, ...stats];
    },
    ok:  (p) => {
      const ch = [];
      const c1 = healInjury(p, 1); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +3]]);
      return [...ch, ...stats];
    },
    bad: (p) => bumpAllBoth(p, -2),
  },
  family_time: {
    category: "rest",
    great: (p) => {
      const ch = [];
      const c1 = healInjury(p, 99); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +8], ["batter", "eye", +4]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = healInjury(p, 1); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => bumpMany(p, [["pitcher", "control", -2]]),
  },
  hobby: {
    category: "rest",
    great: (p) => {
      const ch = [];
      const c1 = fameBump(p, +8);
      const stats = bumpMany(p, [["pitcher", "control", +8]]);
      return [c1, ...stats];
    },
    ok:    (p) => [fameBump(p, +3)],
    bad:   (p) => bumpAllBoth(p, -1),
  },
  short_trip: {
    category: "rest",
    great: (p) => {
      const ch = [];
      const c1 = conditionBump(p, +30); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "control", +8], ["pitcher", "stamina", +5], ["batter", "eye", +3]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = conditionBump(p, +10); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "stamina", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => bumpMany(p, [["pitcher", "stamina", -3]]),
  },
  quiet_rest: {
    category: "rest",
    great: (p) => {
      const ch = [];
      const c1 = staminaBump(p, +100); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "stamina", +8], ["pitcher", "control", +6]]);
      return [...ch, ...stats];
    },
    ok:    (p) => {
      const ch = [];
      const c1 = staminaBump(p, +20); if (c1) ch.push(c1);
      const stats = bumpMany(p, [["pitcher", "stamina", +2]]);
      return [...ch, ...stats];
    },
    bad:   (p) => bumpAllBoth(p, -1),
  },

  // ── 국제대회 (intl_tournament) — 시즌 중 차출된 경우 휴식기 자동 대체 ──
  // 올림픽: 동메달 이상이면 병역 면제. great=금 / ok=동(여전히 면제) / bad=4위 이하.
  olympic_run: {
    category: "intl_tournament",
    great: (p) => {
      p.militaryExempt = { reason: "olympics_gold", year: state.gameDate?.year ?? null };
      return [...bumpAllBoth(p, +4), fameBump(p, +30)];
    },
    ok: (p) => {
      p.militaryExempt = { reason: "olympics_bronze", year: state.gameDate?.year ?? null };
      return [...bumpAllBoth(p, +2), fameBump(p, +15)];
    },
    bad: (p) => bumpMany(p, [["pitcher", "control", -3]]),
  },
  // 아시안게임: 금메달이면 병역 면제. great=금(면제) / ok=은·동 / bad=4위 이하.
  asian_games_run: {
    category: "intl_tournament",
    great: (p) => {
      p.militaryExempt = { reason: "asian_games_gold", year: state.gameDate?.year ?? null };
      return [...bumpAllBoth(p, +3), fameBump(p, +25)];
    },
    ok:  (p) => [...bumpMany(p, [["batter", "eye", +2], ["pitcher", "control", +3]]), fameBump(p, +10)],
    bad: (p) => bumpMany(p, [["pitcher", "control", -3]]),
  },
  // WBC: 면제 X, 명성/멘탈 위주
  wbc_run: {
    category: "intl_tournament",
    great: (p) => [...bumpAllBoth(p, +3), fameBump(p, +20)],
    ok:    (p) => [fameBump(p, +8), ...bumpMany(p, [["pitcher", "control", +2]])],
    bad:   (p) => bumpMany(p, [["pitcher", "control", -2]]),
  },
  // 프리미어12: 면제 X
  premier12_run: {
    category: "intl_tournament",
    great: (p) => [...bumpAllBoth(p, +2), fameBump(p, +15)],
    ok:    (p) => [fameBump(p, +6), ...bumpMany(p, [["pitcher", "control", +1]])],
    bad:   (p) => bumpMany(p, [["pitcher", "control", -2]]),
  },

  // ── 청소년 세계대회 (youth_worldcup) — 고3 시즌 종료 후에만 노출 ──
  worldcup_run: {
    category: "youth_worldcup",
    // 우승 — 모든 능력치 + 큰 명성
    great: (p) => {
      const ch = [];
      for (const c of bumpAll(p, "batter", +4)) ch.push(c);
      for (const c of bumpAll(p, "pitcher", +3)) ch.push(c);
      ch.push(fameBump(p, +15));
      return ch;
    },
    // 본선 진출
    ok: (p) => {
      const ch = [];
      const c1 = bump(p, "pitcher", "control", +5); if (c1) ch.push(c1);
      const c2 = bump(p, "batter", "eye", +3); if (c2) ch.push(c2);
      ch.push(fameBump(p, +6));
      return ch;
    },
    // 예선 탈락
    bad: (p) => {
      const ch = [];
      const c1 = bump(p, "pitcher", "control", -4); if (c1) ch.push(c1);
      const c2 = bump(p, "pitcher", "stamina", -2); if (c2) ch.push(c2);
      return ch;
    },
  },
};

// 휴식기 카테고리 풀 — stage / 능력치 / 연도 조건에 따라 가용 카테고리 분기.
// 청소년 세계대회 (WBSC U-18 야구 월드컵):
//   - stage = "high"
//   - 종합 능력치 60 이상 (1학년이라도 잠재력 높으면 조기 발탁)
//   - 격년(홀수년) 개최 → year % 2 === 1
// 프로 단계에서 시즌 중 국제대회 차출 (pendingTournament) 이 있으면 그 카테고리만 노출.
export function getAvailableCategories(player) {
  // 시즌 중 차출된 국제대회가 있으면 다른 옵션 없이 강제 진행
  if (player.pendingTournament) {
    return ["intl_tournament"];
  }

  const year = state.gameDate?.year;
  const isWorldCupYear = year != null && year % 2 === 1;
  if (
    player.stage === "high"
    && nationalTeamRating(player) >= YOUTH_WORLDCUP_RATING_THRESHOLD
    && isWorldCupYear
  ) {
    return ["youth_worldcup"];
  }

  return [...CATEGORY_KEYS];
}

// pendingTournament.key → 해당 국제대회 이벤트 매핑
const TOURNAMENT_EVENT_MAP = {
  olympics:    "olympic_run",
  asian_games: "asian_games_run",
  wbc:         "wbc_run",
  premier12:   "premier12_run",
};

// ─── 굴림 + 적용 ─────────────────────────────────────────────────
// 카테고리 base 효과 적용 → eventKey 추출만 (yes/no 결정 전)
export function applyCategoryAndPickEvent(player, categoryKey) {
  const cat = OFFSEASON_CATEGORIES[categoryKey];
  if (!cat) return { baseChanges: [], eventKey: null };
  const baseChanges = cat.base(player) ?? [];

  let eventKey;
  if (categoryKey === "intl_tournament" && player.pendingTournament) {
    // 차출된 국제대회 종류에 맞는 이벤트 직접 매핑
    eventKey = TOURNAMENT_EVENT_MAP[player.pendingTournament.key] ?? "wbc_run";
    player.pendingTournament = null;
  } else {
    const type = getPlayerTalentCategory(player);
    let pool = [...cat.pool];
    if (type === "batter") {
      pool = pool.filter(e => e !== "mad_scientist_pitch" && e !== "secret_pitch" && e !== "mentor_pitcher");
    } else if (type === "pitcher") {
      pool = pool.filter(e => e !== "mad_scientist_bat" && e !== "foreign_coach");
    }
    eventKey = pool[Math.floor(Math.random() * pool.length)];
  }
  return { baseChanges, eventKey };
}

// 이벤트 yes — 굴림 후 효과 적용
export function rollEventOutcome(rng = Math.random) {
  const r = rng();
  let acc = 0;
  for (const kind of ["great", "ok", "bad"]) {
    acc += OUTCOME_WEIGHTS[kind];
    if (r < acc) return kind;
  }
  return "ok";
}

// forcedOutcome: 주어지면 난수 굴림 대신 그 결과(great/ok/bad)를 적용 —
//   국제대회/청소년월드컵은 실제 브래킷 시뮬 등수로 결정된 outcome 을 넘긴다.
export function applyEventChoice(player, eventKey, forcedOutcome = null) {
  const ev = EVENTS[eventKey];
  if (!ev) return { outcomeKind: "ok", changes: [] };
  const outcomeKind = (forcedOutcome === "great" || forcedOutcome === "ok" || forcedOutcome === "bad")
    ? forcedOutcome
    : rollEventOutcome();
  const changes = (ev[outcomeKind](player)) ?? [];
  return { outcomeKind, changes };
}

// 실제 토너먼트 시뮬로 결과를 정하는 이벤트(국제대회·청소년월드컵) 여부 —
// 휴식기 UI 가 난수 대신 브래킷 결과를 forcedOutcome 으로 넘길지 판단.
export function isTournamentEvent(eventKey) {
  const ev = EVENTS[eventKey];
  return !!ev && (ev.category === "intl_tournament" || ev.category === "youth_worldcup");
}
