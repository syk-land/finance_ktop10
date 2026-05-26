// 실시간 진행 — 매 tick 마다 1일 자동 진행
// 평일: autoMode에 따라 훈련/휴식 자동
// 주말 종료: 경기 자동 시뮬
// 시즌 종료: 자동 일시정지 (사용자가 다음 학년 진입 결정)

import { state } from "../state.js";
import { pickAutoAction } from "./autoTrain.js";
import { doDailyAction, endWeek } from "./week.js";

// 캘린더 헬퍼 — 30일 = 1개월로 단순화
const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;

// 실제 연도 매핑: 1학년 = 2027년 → 고3 = 2029년 (WBSC U-18 야구 월드컵 격년 홀수년 개최 가정)
// 시즌은 3월 시작 — 한국 고교야구 정규 일정에 맞춤.
export const START_YEAR = 2027;
export const SEASON_START_MONTH = 3;

export function createGameDate() {
  return {
    year: START_YEAR,
    day: 1,
    month: SEASON_START_MONTH,
    dayOfMonth: 1,
    dayOfWeek: 0,  // 0=월, ..., 6=일
  };
}

// 시즌 시작 시점으로 캘린더 리셋 — 다음 학년 진입 시 호출.
export function resetGameDateForNewSeason(d) {
  if (!d) return;
  d.year += 1;
  d.month = SEASON_START_MONTH;
  d.dayOfMonth = 1;
  d.day = 1;
  d.dayOfWeek = 0;
}

// 날짜 포맷은 i18n/index.js 의 formatGameDate 로 이동. 호환을 위해 재수출.
export { formatGameDate } from "../i18n/index.js";

function advanceDate(d) {
  d.day += 1;
  d.dayOfWeek = (d.dayOfWeek + 1) % DAYS_PER_WEEK;
  d.dayOfMonth += 1;
  if (d.dayOfMonth > DAYS_PER_MONTH) {
    d.dayOfMonth = 1;
    d.month += 1;
    if (d.month > 12) { d.month = 1; d.year += 1; }
  }
}

// 한 칸(1일) 진행. 반환: 시즌 종료 시 true
export function advanceOneDay() {
  const { season, player } = state;
  if (!season || !player) return false;
  if (season.finished) return true;

  // 평일이면 자동 행동
  if (season.dayIndex < 5) {
    let pick;
    if (state.autoMode) {
      pick = pickAutoAction(state.autoMode, player);
    } else {
      // 자동 모드 OFF: 부상이면 휴식, 아니면 가벼운 휴식
      pick = { action: "rest" };
    }
    doDailyAction(pick.action, pick.detail);
    if (state.gameDate) advanceDate(state.gameDate);
    return false;
  }

  // 평일 끝 → 주말 경기 + endWeek
  endWeek();
  // 주말은 2일이지만 단순히 endWeek 한 번으로 처리, 캘린더는 +2일
  if (state.gameDate) {
    advanceDate(state.gameDate);
    advanceDate(state.gameDate);
  }
  return !!season.finished;
}
