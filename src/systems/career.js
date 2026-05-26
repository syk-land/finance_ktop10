// 커리어 분기 (Phase 1: 고교 1→2→3 학년만 처리)
// Phase 3에서 드래프트/콜업/해외진출 확장

import { state, pushLog } from "../state.js";
import { createLeague } from "./league.js";
import { createSeason } from "./week.js";
import { getTeamPool } from "../data/teams.js";
import { t, getLocale } from "../i18n/index.js";
import { resetGameDateForNewSeason } from "./tick.js";

export function startHighSchoolCareer(playerName, talent, schoolName) {
  // 학교가 명시 안되면 현재 locale의 고교 풀에서 무작위 배정
  if (!schoolName) {
    const pool = getTeamPool("high", getLocale());
    schoolName = pool[Math.floor(Math.random() * pool.length)].name;
  }
  state.player.teamName = schoolName;
  state.player.stage = "high";
  state.league = createLeague("high", schoolName);
  state.season = createSeason("high");
  pushLog({ msg: t("log.careerStart", { school: schoolName }), kind: "good" });
}

// 시즌 종료 후 다음 시즌 시작 (Phase 1: 고교 내에서만)
// 호출 시점: advanceToNextSeason() 직후 (player.grade는 이미 +1 된 상태)
export function transitionAfterSeason() {
  const { player } = state;

  // 3학년 시즌까지 끝난 후엔 ageUp으로 grade=4가 됨 → 졸업
  if (player.stage === "high" && player.grade > 3) {
    pushLog({ msg: t("log.graduation"), kind: "info" });
    state.season.finished = true;
    state.career = { ended: true, reason: "graduation_phase1" };
    return { ended: true };
  }

  // 다음 학년 시작 — 캘린더도 3월 1일로 리셋 (year +1)
  resetGameDateForNewSeason(state.gameDate);
  state.league = createLeague(player.stage, player.teamName);
  state.season = createSeason(player.stage);
  pushLog({
    msg: t("log.seasonStart", { team: player.teamName, grade: player.grade }),
    kind: "info",
  });
  return { ended: false };
}
