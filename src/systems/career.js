// 커리어 분기 (Phase 1: 고교 1→2→3 학년만 처리)
// Phase 3에서 드래프트/콜업/해외진출 확장

import { state, pushLog } from "../state.js";
import { createLeague } from "./league.js";
import { createSeason } from "./week.js";
import { HIGH_SCHOOL_TEAMS } from "../data/teams.js";

export function startHighSchoolCareer(playerName, talent, schoolName) {
  // 학교가 명시 안되면 적당히 약체 배정
  if (!schoolName) {
    schoolName = HIGH_SCHOOL_TEAMS[Math.floor(Math.random() * HIGH_SCHOOL_TEAMS.length)].name;
  }
  state.player.teamName = schoolName;
  state.player.stage = "high";
  state.league = createLeague("high", schoolName);
  state.season = createSeason("high");
  pushLog({ msg: `${schoolName} 야구부 입단! 고교 1학년 시작.`, kind: "good" });
}

// 시즌 종료 후 다음 시즌 시작 (Phase 1: 고교 내에서만)
// 호출 시점: advanceToNextSeason() 직후 (player.grade는 이미 +1 된 상태)
export function transitionAfterSeason() {
  const { player } = state;

  // 3학년 시즌까지 끝난 후엔 ageUp으로 grade=4가 됨 → 졸업
  if (player.stage === "high" && player.grade > 3) {
    pushLog({ msg: `고교 졸업 — Phase 3에서 진로 분기 예정`, kind: "info" });
    state.season.finished = true;
    state.career = { ended: true, reason: "graduation_phase1" };
    return { ended: true };
  }

  // 다음 학년 시작
  state.league = createLeague(player.stage, player.teamName);
  state.season = createSeason(player.stage);
  pushLog({ msg: `${player.teamName} ${player.grade}학년 시즌 시작.`, kind: "info" });
  return { ended: false };
}
