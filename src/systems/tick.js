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

export function createGameDate() {
  return {
    year: 1,
    day: 1,        // 누적 일자 (시즌 내)
    month: 1,
    dayOfMonth: 1,
    dayOfWeek: 0,  // 0=월, ..., 6=일
  };
}

export function formatGameDate(d) {
  if (!d) return "";
  const wd = ["월", "화", "수", "목", "금", "토", "일"][d.dayOfWeek];
  return `${d.month}월 ${d.dayOfMonth}일 (${wd})`;
}

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
