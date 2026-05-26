// 시즌 중 (in-season) 이벤트 일반화 메커니즘
//
// 사용 케이스:
//   - 청소년 세계대회 (현재는 휴식기 카테고리지만, 시즌 중으로 이동 가능)
//   - 프로 시즌 중 올스타전 (7월)
//   - 올림픽 (4년 주기, 시즌 중단)
//   - WBC (3-4년 주기, 시즌 전 또는 중)
//
// 흐름:
//   1. 매 주 endWeek 후 checkScheduledEvents 호출
//   2. 트리거 만족하는 이벤트가 있으면 state.pendingEvents 큐에 추가
//   3. UI 가 pendingEvents 첫 항목을 처리 (모달 또는 토스트) → 처리 후 큐에서 제거
//
// 이벤트 정의 (data/seasonEvents.js 또는 여기 inline):
//   {
//     key: "all_star",
//     trigger: (player, gameDate) => boolean,
//     type: "modal" | "toast",
//     handlerKey: "showAllStarModal",     // UI 가 이 key 로 적절한 핸들러 dispatch
//   }
//
// 같은 이벤트 중복 발동 방지: player.processedEvents[year-key] = true.

import { state } from "../state.js";

// 등록된 이벤트 카탈로그. 향후 새 이벤트 추가 시 여기에 push.
// trigger 함수가 true 반환하면 그 주에 발동.
export const SEASON_EVENTS = [
  // 예시 — 실제 활성 이벤트는 추후 청소년 세계대회/올림픽/WBC 등 추가
  // {
  //   key: "u18_worldcup_inseason",
  //   type: "modal",
  //   handlerKey: "showU18WorldCupModal",
  //   trigger(player, gameDate) {
  //     return player.stage === "high"
  //       && gameDate.month === 9
  //       && gameDate.year % 2 === 1
  //       && overallScore(player) >= 60;
  //   },
  // },
];

// 매 endWeek 후 호출 — 발동 조건 만족하는 이벤트를 pendingEvents 큐에 추가.
// 같은 이벤트는 같은 연도에 한 번만 발동.
export function checkScheduledEvents(player, gameDate) {
  if (!player || !gameDate) return;
  player.processedEvents = player.processedEvents ?? {};
  if (!state.pendingEvents) state.pendingEvents = [];

  for (const ev of SEASON_EVENTS) {
    const seasonKey = `${gameDate.year}-${ev.key}`;
    if (player.processedEvents[seasonKey]) continue;
    if (!ev.trigger(player, gameDate)) continue;
    player.processedEvents[seasonKey] = true;
    state.pendingEvents.push({
      key: ev.key,
      type: ev.type,
      handlerKey: ev.handlerKey,
      year: gameDate.year,
    });
  }
}

// UI 가 큐에서 첫 이벤트 꺼냄. 처리는 UI 측의 핸들러 매핑이 담당.
export function nextPendingEvent() {
  if (!state.pendingEvents || state.pendingEvents.length === 0) return null;
  return state.pendingEvents[0];
}

export function clearPendingEvent() {
  if (state.pendingEvents && state.pendingEvents.length > 0) {
    state.pendingEvents.shift();
  }
}
