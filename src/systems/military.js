// 군 입대 시스템 — 한국 프로(pro1/pro2) 단계에서 만 27세 도달 시 트리거.
//
// 흐름:
//   1. 시즌 종료 후 휴식기 종료 시점에 checkMilitaryTrigger() 호출
//   2. player.militaryExempt 가 있으면 자동 면제 + 토스트, 다음 시즌 진행
//   3. 없으면 모달로 옵션 선택 (상무 / 경찰청 / 사회복무)
//   4. 선택 시 applyMilitaryService() — 2시즌 분량의 페널티 + careerHistory 에 2시즌 기록
//
// 면제 자격은 offseason.js 의 olympic_run / asian_games_run 이벤트에서
// 결과 굴림(great/ok) 시 player.militaryExempt = { reason, year } 부여.

import { state, pushLog, pushToast } from "../state.js";
import { t, getLocale } from "../i18n/index.js";
import { BATTER_STATS, PITCHER_STATS, getPlayerStatCap, addFame } from "./player.js";

const MILITARY_AGE = 27;
const MILITARY_SEASONS = 2;

export const MILITARY_OPTIONS = {
  // 상무 — 1군 수준 훈련. 페널티 가벼움.
  sangmu: {
    statMult: 0.97,
    fameDelta: +5,
    mentalDelta: +5,
  },
  // 경찰청 — 상무와 유사
  police: {
    statMult: 0.97,
    fameDelta: +3,
    mentalDelta: +5,
  },
  // 사회복무요원 — 훈련 부족. 페널티 크고 명성 감소.
  public_service: {
    statMult: 0.92,
    fameDelta: -5,
    mentalDelta: +3,
  },
};

// 트리거 여부 — true 면 외부(UI)에서 모달을 띄워야 함.
// 면제 자격이 있으면 여기서 즉시 자동 처리하고 false 반환.
export function checkMilitaryTrigger(player) {
  if (!player) return false;
  // 영어 버전은 한국 특화 요소(병역) 제거 — 군 복무 트리거 없음.
  if (getLocale() === "en") return false;
  if (player.militaryDone) return false;
  if (player.age < MILITARY_AGE) return false;
  if (player.stage !== "pro1" && player.stage !== "pro2") return false;

  if (player.militaryExempt) {
    player.militaryDone = true;
    const reason = t("military.reason." + player.militaryExempt.reason);
    pushToast(t("military.exempt", { reason }), "good");
    pushLog({ msg: t("military.exempt", { reason }), kind: "good" });
    return false;
  }
  return true;
}

// 옵션 선택 적용 — 2시즌 분량의 페널티 + careerHistory 에 군 복무 시즌 기록.
// 시즌/리그 전환은 외부 UI 가 transitionAfterSeason 흐름으로 처리.
export function applyMilitaryService(player, optionKey) {
  const opt = MILITARY_OPTIONS[optionKey];
  if (!opt) return null;

  const STAT_MIN = 20;
  for (const s of BATTER_STATS) {
    if (player.batter[s] === undefined) continue;
    const cap = getPlayerStatCap(player, s);
    const after = Math.max(STAT_MIN, Math.min(cap, player.batter[s] * opt.statMult));
    player.batter[s] = +after.toFixed(1);
  }
  for (const s of PITCHER_STATS) {
    if (player.pitcher[s] === undefined) continue;
    const cap = getPlayerStatCap(player, s);
    const after = Math.max(STAT_MIN, Math.min(cap, player.pitcher[s] * opt.statMult));
    player.pitcher[s] = +after.toFixed(1);
  }
  addFame(player, opt.fameDelta);
  if (player.pitcher.mental !== undefined) {
    player.pitcher.mental = Math.min(getPlayerStatCap(player, "mental"), +(player.pitcher.mental + opt.mentalDelta).toFixed(1));
  }

  // careerHistory 에 군 복무 시즌 2개 push (통계는 비어있음)
  player.careerHistory = player.careerHistory ?? [];
  for (let i = 0; i < MILITARY_SEASONS; i++) {
    player.careerHistory.push({
      age: player.age + i,
      grade: player.grade + i,
      stage: "military",
      teamName: t("military.option." + optionKey),
      overall: 0,
      stats: {},
      teamRecord: null,
      standings: [],
      military: true,
      optionKey,
    });
  }

  player.age += MILITARY_SEASONS;
  player.grade += MILITARY_SEASONS;
  // 군 복무 기간만큼 캘린더 연도 경과 처리 (2년 복무 중 1년은 transitionAfterSeason -> resetGameDateForNewSeason 에서 더해지므로, 1년을 더함)
  if (state.gameDate) {
    state.gameDate.year += (MILITARY_SEASONS - 1);
  }
  // 상무/경찰 복무 기간(퓨처스 리그)도 KBO 서비스 연수로 인정 — 포스팅/해외FA 자격에 반영.
  if (player.stage === "pro1" || player.stage === "pro2") {
    player.kboSeasons = (player.kboSeasons ?? 0) + MILITARY_SEASONS;
  }
  player.militaryDone = true;
  player.militaryRecord = {
    option: optionKey,
    startYear: state.gameDate?.year ?? null,
    seasons: MILITARY_SEASONS,
  };

  pushLog({
    msg: t("military.completed", { option: t("military.option." + optionKey) }),
    kind: "info",
  });
  return { option: optionKey, seasons: MILITARY_SEASONS };
}
