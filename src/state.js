const SAVE_KEY = "baseballalone.save.v1";
const SAVE_VERSION = 2;

export const state = {
  player: null,
  league: null,
  season: null,
  career: null,
  log: [],
  view: "menu",
  autoMode: null,        // null | preset key
  paused: true,          // true면 시간 정지
  tickSpeed: 500,        // ms / 1일
  gameDate: null,        // { year, day, month, dayOfMonth, dayOfWeek }
  locale: "ko",          // "ko" | "en" — i18n/index.js 에서 별도 localStorage 키로 영속화
  offseason: null,       // null | { randomEventKey, selected, outcomeKind, changes[] } — 시즌 종료 후 휴식기 단계
  pendingFinal: null,    // null | { tournamentKey, opponent, status, result, processedWeek } — 토너먼트 결승전 대기
  pendingToasts: [],     // [{msg, kind}] — UI 매 렌더에서 꺼내 표시
  pendingEvents: [],     // [{key, type, handlerKey, year}] — 시즌 중 이벤트 큐 (seasonEvents.js)
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function pushLog(entry) {
  state.log.unshift({ time: Date.now(), ...entry });
  if (state.log.length > 200) state.log.length = 200;
}

// 토스트 큐 — UI 가 매 렌더에서 꺼내 띄움.
export function pushToast(msg, kind = "good") {
  if (!state.pendingToasts) state.pendingToasts = [];
  state.pendingToasts.push({ msg, kind });
}

export function saveGame() {
  try {
    const payload = {
      version: SAVE_VERSION,
      player: state.player,
      league: state.league,
      season: state.season,
      career: state.career,
      log: state.log.slice(0, 50),
      autoMode: state.autoMode,
      paused: state.paused,
      tickSpeed: state.tickSpeed,
      gameDate: state.gameDate,
      offseason: state.offseason,
      pendingFinal: state.pendingFinal,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}

// 옛 세이브 구조 → 현재 구조로 변환. version 누락(v1) 인 데이터를 SAVE_VERSION 으로 끌어올린다.
function migrateSave(data) {
  if (data.version === SAVE_VERSION) return data;

  // gameDate.year: 옛 형식은 1,2,3… 같은 학년 카운터. 현재는 실제 연도(2027~)
  if (data.gameDate && typeof data.gameDate.year === "number" && data.gameDate.year < 100) {
    data.gameDate.year = 2027 + (data.gameDate.year - 1);
  }
  // gameDate.month: 옛 시즌은 1월 시작. 시즌 진행 중이라면 그대로, 새 시즌부터 3월 시작 (transitionAfterSeason)
  // 미진행 신규는 createGameDate 가 3월로 만듦.

  // offseason: 옛 구조 { selected, outcomeKind, eventKey, changes } → 새 구조 { selectedCategory, ... }
  if (data.offseason && data.offseason.selectedCategory === undefined && data.offseason.selected !== undefined) {
    data.offseason = null; // 호환 안 되는 옛 휴식기 진행은 reset
  }

  // injury: 옛 구조엔 { type: "근육통" } 같이 type 만. 새 구조는 severity 사용
  if (data.player?.injury && !data.player.injury.severity) {
    data.player.injury.severity = "minor";
  }

  data.version = SAVE_VERSION;
  return data;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = migrateSave(JSON.parse(raw));
    Object.assign(state, data);
    // 이어하기/새로고침으로 들어올 때는 항상 일시정지 — 사용자가 ▶ 누를 때까지 대기
    state.paused = true;
    return true;
  } catch (e) {
    console.error("load failed", e);
    return false;
  }
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function resetState() {
  state.player = null;
  state.league = null;
  state.season = null;
  state.career = null;
  state.log = [];
  state.view = "menu";
  state.autoMode = null;
  state.paused = true;
  state.tickSpeed = 500;
  state.gameDate = null;
  state.offseason = null;
  state.pendingFinal = null;
  state.pendingToasts = [];
  state.pendingEvents = [];
  // locale 은 게임 리셋과 무관하게 사용자 선택을 유지
}
