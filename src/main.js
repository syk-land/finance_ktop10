// 부트스트랩 + 뷰 라우터
import { state, loadGame, hasSave, saveGame } from "./state.js";
import { renderMenu } from "./views/menu.js";
import { renderWeekly } from "./views/weekly.js";
import { advanceOneDay } from "./systems/tick.js";

const VIEWS = {
  menu: renderMenu,
  weekly: renderWeekly,
};

function getRoot() {
  return document.getElementById("view-root");
}

function updateTopbar() {
  const el = document.getElementById("topbar-info");
  if (!el) return;
  if (state.player) {
    const p = state.player;
    el.innerHTML = `<strong>${p.name}</strong> · ${p.teamName ?? "-"} · ${p.grade}학년 · ${p.age}세`;
  } else {
    el.innerHTML = "";
  }
}

function updateFooter() {
  const el = document.getElementById("footer-status");
  if (!el) return;
  if (state.log && state.log.length > 0) {
    const recent = state.log[0];
    el.textContent = recent.msg;
  } else {
    el.textContent = "";
  }
}

export function route(name) {
  state.view = name;
  const fn = VIEWS[name] ?? VIEWS.menu;
  const root = getRoot();
  fn(root, route);
  updateTopbar();
  updateFooter();
  window.scrollTo({ top: 0, behavior: "instant" });
}

// 실시간 진행 루프
let tickTimer = null;
let saveCounter = 0;

function scheduleTick() {
  if (tickTimer) clearTimeout(tickTimer);
  tickTimer = setTimeout(runTick, state.tickSpeed ?? 500);
}

function runTick() {
  // 게임 진행 가능 조건
  if (state.view !== "weekly" || !state.player || !state.season) {
    scheduleTick();
    return;
  }
  if (state.paused) {
    scheduleTick();
    return;
  }
  // 시즌 종료 시 자동 일시정지
  if (state.season.finished) {
    state.paused = true;
    route("weekly");
    scheduleTick();
    return;
  }
  advanceOneDay();
  // 화면 갱신
  route("weekly");
  // 시즌 종료 직후 자동 일시정지
  if (state.season.finished) {
    state.paused = true;
  }
  // 주기적으로 저장 (10일마다)
  saveCounter++;
  if (saveCounter >= 10) {
    saveCounter = 0;
    saveGame();
  }
  scheduleTick();
}

// 초기 진입
function init() {
  route("menu");
  scheduleTick();
}

document.addEventListener("DOMContentLoaded", init);

// 디버그용 노출
window.__gameState = state;
window.__route = route;
