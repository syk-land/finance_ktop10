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

import { BATTER_STATS, PITCHER_STATS, applyInjury, overallScore, addFame } from "./player.js";
import { state } from "../state.js";

const STAT_CAP = 150;
const STAT_MIN = 20;
const OUTCOME_WEIGHTS = { great: 0.20, ok: 0.70, bad: 0.10 };

// ─── 헬퍼 ─────────────────────────────────────────────────────────
function bump(player, group, stat, delta) {
  if (player[group] == null || player[group][stat] === undefined) return null;
  const before = player[group][stat];
  const after = Math.max(STAT_MIN, Math.min(STAT_CAP, before + delta));
  player[group][stat] = +after.toFixed(1);
  return { group, stat, delta: +(after - before).toFixed(1) };
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
      // 특훈 base — 랜덤 stat 1개 +3
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      const c = bump(player, group, s, +3);
      return c ? [c] : [];
    },
    pool: ["mad_scientist_pitch", "mad_scientist_bat", "secret_pitch", "extreme_drill", "new_form"],
  },
  camp: {
    base(player) {
      // 전지훈련 base — 모든 stat +1
      return bumpAllBoth(player, +1);
    },
    pool: ["foreign_coach", "mentor_pitcher", "team_chemistry", "tough_camp", "unfamiliar_env"],
  },
  regular: {
    base(player) {
      // 일반훈련 base — 랜덤 타자 1 + 랜덤 투수 1 stat +2
      const ch = [];
      const sb = randStat("batter");  const c1 = bump(player, "batter",  sb, +2); if (c1) ch.push(c1);
      const sp = randStat("pitcher"); const c2 = bump(player, "pitcher", sp, +2); if (c2) ch.push(c2);
      return ch;
    },
    pool: ["new_technique", "rival", "coach_advice", "routine_drill", "night_training"],
  },
  rest: {
    base(player) {
      // 휴식 base — 투수 스태미나/멘탈 +3
      const ch = [];
      const c1 = bump(player, "pitcher", "stamina", +3); if (c1) ch.push(c1);
      const c2 = bump(player, "pitcher", "mental",  +3); if (c2) ch.push(c2);
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
      const c1 = bump(player, "pitcher", "mental", +3); if (c1) ch.push(c1);
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
      const c1 = bump(player, "pitcher", "mental", +3); if (c1) ch.push(c1);
      ch.push(fameBump(player, +10));
      return ch;
    },
    pool: ["olympic_run", "asian_games_run", "wbc_run", "premier12_run"],
  },
};

// 항상 노출되는 기본 카테고리. (youth_worldcup 같은 조건부는 getAvailableCategories 에서 추가)
export const CATEGORY_KEYS = ["intense", "camp", "regular", "rest"];

// 청소년 세계대회 차출 기준 — 학년 무관, 종합 능력치 기준
// 1학년이라도 종합 60 이상이면 차출 (높은 잠재력 = 조기 발탁)
const YOUTH_WORLDCUP_OVR_THRESHOLD = 60;

// ─── 이벤트 정의 — 각 이벤트는 great/ok/bad 3 단계 효과 ───────────
// 이벤트 라벨/설명/결과 텍스트는 i18n. 여기엔 효과만.
export const EVENTS = {
  // ── 특훈 ──
  mad_scientist_pitch: {
    category: "intense",
    great: (p) => bumpMany(p, [["pitcher","velocity",+12],["pitcher","breaking",+6]]),
    ok:    (p) => bumpMany(p, [["pitcher","velocity",+3]]),
    bad:   (p) => bumpMany(p, [["pitcher","velocity",-3],["pitcher","control",-2]]),
  },
  mad_scientist_bat: {
    category: "intense",
    great: (p) => bumpMany(p, [["batter","contact",+12],["batter","power",+6]]),
    ok:    (p) => bumpMany(p, [["batter","contact",+3]]),
    bad:   (p) => bumpMany(p, [["batter","contact",-3],["batter","power",-2]]),
  },
  secret_pitch: {
    category: "intense",
    great: (p) => bumpMany(p, [["pitcher","breaking",+12],["pitcher","control",+5]]),
    ok:    (p) => bumpMany(p, [["pitcher","breaking",+3]]),
    bad:   (p) => { applyInjury(p, 0.70); return bumpMany(p, [["pitcher","stamina",-3]]); },
  },
  extreme_drill: {
    category: "intense",
    great: (p) => bumpAllBoth(p, +3),
    ok:    (p) => bumpAllBoth(p, +1),
    bad:   (p) => bumpAllBoth(p, -2),
  },
  new_form: {
    category: "intense",
    great: (p) => {
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      return bumpMany(p, [[group, s, +10]]);
    },
    ok: (p) => bumpMany(p, [["pitcher","mental",+2]]),
    bad: (p) => {
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      return bumpMany(p, [[group, s, -4]]);
    },
  },

  // ── 전지훈련 ──
  foreign_coach: {
    category: "camp",
    great: (p) => bumpAll(p, "batter", +4),
    ok:    (p) => bumpAll(p, "batter", +1),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  mentor_pitcher: {
    category: "camp",
    great: (p) => bumpMany(p, [["pitcher","mental",+8],["pitcher","control",+6],["pitcher","breaking",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","mental",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },
  team_chemistry: {
    category: "camp",
    great: (p) => [...bumpAllBoth(p, +2), fameBump(p, +5)],
    ok:    (p) => [fameBump(p, +2)],
    bad:   (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  tough_camp: {
    category: "camp",
    great: (p) => bumpMany(p, [["pitcher","stamina",+8],["batter","speed",+5]]),
    ok:    (p) => bumpMany(p, [["pitcher","stamina",+2]]),
    bad:   (p) => { applyInjury(p, 0.80); return bumpMany(p, [["batter","speed",-3]]); },
  },
  unfamiliar_env: {
    category: "camp",
    great: (p) => bumpMany(p, [["pitcher","mental",+6],["batter","eye",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","mental",+1]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-4]]),
  },

  // ── 일반훈련 ──
  new_technique: {
    category: "regular",
    great: (p) => {
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      return bumpMany(p, [[group, s, +8]]);
    },
    ok: (p) => {
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      return bumpMany(p, [[group, s, +2]]);
    },
    bad: (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },
  rival: {
    category: "regular",
    great: (p) => bumpMany(p, [["pitcher","mental",+6],["batter","contact",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","mental",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  coach_advice: {
    category: "regular",
    great: (p) => bumpMany(p, [["pitcher","control",+7],["batter","eye",+7]]),
    ok:    (p) => bumpMany(p, [["pitcher","control",+2],["batter","eye",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },
  routine_drill: {
    category: "regular",
    great: (p) => bumpMany(p, [["pitcher","stamina",+5],["batter","defense",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","stamina",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  night_training: {
    category: "regular",
    great: (p) => bumpMany(p, [["batter","power",+6],["pitcher","velocity",+5]]),
    ok:    (p) => bumpMany(p, [["batter","power",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","stamina",-3]]),
  },

  // ── 휴식 ──
  confession: {
    category: "rest",
    great: (p) => {
      const ch = bumpMany(p, [["pitcher","mental",+8]]);
      const group = Math.random() < 0.5 ? "batter" : "pitcher";
      const s = randStat(group);
      return [...ch, ...bumpMany(p, [[group, s, +5]])];
    },
    ok:  (p) => bumpMany(p, [["pitcher","mental",+3]]),
    bad: (p) => bumpAllBoth(p, -2),
  },
  family_time: {
    category: "rest",
    great: (p) => bumpMany(p, [["pitcher","mental",+6],["batter","eye",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","mental",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },
  hobby: {
    category: "rest",
    great: (p) => [...bumpMany(p, [["pitcher","mental",+5]]), fameBump(p, +5)],
    ok:    (p) => [fameBump(p, +2)],
    bad:   (p) => bumpAllBoth(p, -1),
  },
  short_trip: {
    category: "rest",
    great: (p) => bumpMany(p, [["pitcher","mental",+5],["pitcher","stamina",+3],["batter","eye",+3]]),
    ok:    (p) => bumpMany(p, [["pitcher","stamina",+2]]),
    bad:   (p) => bumpMany(p, [["pitcher","stamina",-3]]),
  },
  quiet_rest: {
    category: "rest",
    great: (p) => bumpMany(p, [["pitcher","stamina",+6],["pitcher","mental",+4]]),
    ok:    (p) => bumpMany(p, [["pitcher","stamina",+2]]),
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
    bad: (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  // 아시안게임: 금메달이면 병역 면제. great=금(면제) / ok=은·동 / bad=4위 이하.
  asian_games_run: {
    category: "intl_tournament",
    great: (p) => {
      p.militaryExempt = { reason: "asian_games_gold", year: state.gameDate?.year ?? null };
      return [...bumpAllBoth(p, +3), fameBump(p, +25)];
    },
    ok:  (p) => [...bumpMany(p, [["batter","eye",+2],["pitcher","mental",+3]]), fameBump(p, +10)],
    bad: (p) => bumpMany(p, [["pitcher","mental",-3]]),
  },
  // WBC: 면제 X, 명성/멘탈 위주
  wbc_run: {
    category: "intl_tournament",
    great: (p) => [...bumpAllBoth(p, +3), fameBump(p, +20)],
    ok:    (p) => [fameBump(p, +8), ...bumpMany(p, [["pitcher","mental",+2]])],
    bad:   (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },
  // 프리미어12: 면제 X
  premier12_run: {
    category: "intl_tournament",
    great: (p) => [...bumpAllBoth(p, +2), fameBump(p, +15)],
    ok:    (p) => [fameBump(p, +6), ...bumpMany(p, [["pitcher","mental",+1]])],
    bad:   (p) => bumpMany(p, [["pitcher","mental",-2]]),
  },

  // ── 청소년 세계대회 (youth_worldcup) — 고3 시즌 종료 후에만 노출 ──
  worldcup_run: {
    category: "youth_worldcup",
    // 우승 — 모든 능력치 + 큰 명성
    great: (p) => {
      const ch = [];
      for (const c of bumpAll(p, "batter",  +4)) ch.push(c);
      for (const c of bumpAll(p, "pitcher", +3)) ch.push(c);
      ch.push(fameBump(p, +15));
      return ch;
    },
    // 본선 진출
    ok: (p) => {
      const ch = [];
      const c1 = bump(p, "pitcher", "mental", +5); if (c1) ch.push(c1);
      const c2 = bump(p, "batter",  "eye",    +3); if (c2) ch.push(c2);
      ch.push(fameBump(p, +6));
      return ch;
    },
    // 예선 탈락
    bad: (p) => {
      const ch = [];
      const c1 = bump(p, "pitcher", "mental",  -4); if (c1) ch.push(c1);
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

  const list = [...CATEGORY_KEYS];
  const year = state.gameDate?.year;
  const isWorldCupYear = year != null && year % 2 === 1;
  if (
    player.stage === "high"
    && overallScore(player) >= YOUTH_WORLDCUP_OVR_THRESHOLD
    && isWorldCupYear
  ) {
    list.push("youth_worldcup");
  }
  return list;
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
    eventKey = cat.pool[Math.floor(Math.random() * cat.pool.length)];
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

export function applyEventChoice(player, eventKey) {
  const ev = EVENTS[eventKey];
  if (!ev) return { outcomeKind: "ok", changes: [] };
  const outcomeKind = rollEventOutcome();
  const changes = (ev[outcomeKind](player)) ?? [];
  return { outcomeKind, changes };
}
