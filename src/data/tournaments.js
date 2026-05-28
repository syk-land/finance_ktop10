// 한국 고교/대학 야구 대회 일정 (기준: 실제 2026년 일정 기반)
//
// type:
//   "regular"    — 주말리그/권역리그 (전국 모든 팀 권역별 리그전)
//   "tournament" — 단일 토너먼트 (참가 자격 다름)
//
// eligibility — i18n 으로 표시할 참가 조건 키
//
// 게임 캘린더는 30일/달로 단순화되어 있어 실제 일정과 정확히 일치하진 않지만
// 시즌 시작(3월)~종료(8월 말) 범위에서 같은 순서/길이로 진행.

export const HIGH_SCHOOL_TOURNAMENTS = [
  {
    key: "weekly_first",
    start: [3, 7],
    end:   [4, 25],
    type:  "regular",
  },
  {
    key: "emart_cup",
    start: [3, 25],
    end:   [4, 13],
    type:  "tournament",
  },
  {
    key: "gold_lion",
    start: [5, 2],
    end:   [5, 16],
    type:  "tournament",
  },
  {
    key: "weekly_second",
    start: [5, 23],
    end:   [6, 21],
    type:  "regular",
  },
  {
    key: "blue_dragon",
    start: [6, 27],
    end:   [7, 11],
    type:  "tournament",
  },
  {
    key: "president_cup",
    start: [7, 18],
    end:   [7, 30],
    type:  "tournament",
  },
  {
    key: "phoenix_cup",
    start: [8, 6],
    end:   [8, 29],
    type:  "tournament",
  },
];

// 한국 대학야구 대회 일정 (KUSF U-리그 + KBSA 주관 전국대회)
// 게임 캘린더는 22주(약 5개월) 시즌이라 실제 추계(10월) 까지 못 가지만 명칭은 유지.
export const UNIV_TOURNAMENTS = [
  {
    key: "univ_uleague_first",
    start: [3, 7],
    end:   [5, 30],
    type:  "regular",
  },
  {
    key: "president_cup_univ",
    start: [6, 6],
    end:   [6, 27],
    type:  "tournament",
  },
  {
    key: "chairman_cup_univ",
    start: [7, 4],
    end:   [7, 22],
    type:  "tournament",
  },
  {
    key: "autumn_champ_univ",
    start: [7, 29],
    end:   [8, 15],
    type:  "tournament",
  },
];

// stage 별 대회 풀
export function getTournamentPool(stage) {
  if (stage === "high") return HIGH_SCHOOL_TOURNAMENTS;
  if (stage === "univ") return UNIV_TOURNAMENTS;
  return [];
}

// 현재 캘린더 시점에 진행 중인 대회들 반환 (여러 개 동시 진행 가능 — 주말리그 + 토너먼트 병행)
export function getActiveTournaments(stage, gameDate) {
  if (!gameDate) return [];
  const pool = getTournamentPool(stage);
  if (pool.length === 0) return [];
  const m = gameDate.month;
  const d = gameDate.dayOfMonth;
  return pool.filter(tn => withinRange(m, d, tn.start, tn.end));
}

// (m, d) 가 [sm,sd]..[em,ed] 사이인지
function withinRange(m, d, start, end) {
  const cur = m * 100 + d;
  const s = start[0] * 100 + start[1];
  const e = end[0]   * 100 + end[1];
  return cur >= s && cur <= e;
}
