const SAVE_KEY = "baseballalone.save.v1";

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
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function pushLog(entry) {
  state.log.unshift({ time: Date.now(), ...entry });
  if (state.log.length > 200) state.log.length = 200;
}

export function saveGame() {
  try {
    const payload = {
      player: state.player,
      league: state.league,
      season: state.season,
      career: state.career,
      log: state.log.slice(0, 50),
      autoMode: state.autoMode,
      paused: state.paused,
      tickSpeed: state.tickSpeed,
      gameDate: state.gameDate,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, data);
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
}
