// 부트스트랩 + 뷰 라우터
//
// i18n: 초기 진입 시 loadLocaleFromStorage 로 사용자 언어 복원, 토글 버튼으로 즉시 전환.
// 로케일 변경 시 모든 정적 chrome (logo/title/footer)와 현재 뷰를 재렌더한다.

import { state, loadGame, hasSave, saveGame } from "./state.js";
import { renderMenu, renderStart } from "./views/menu.js";
import { renderWeekly } from "./views/weekly.js";
import { renderShop } from "./views/shop.js";
import { advanceOneDay } from "./systems/tick.js";
import { loadRegressionMeta } from "./systems/regression.js";
import { loadSettings } from "./systems/settings.js";
import { initFirebase } from "./cloud/firebase.js";
import { initAuth } from "./cloud/auth.js";
import {
  t, loadLocaleFromStorage,
} from "./i18n/index.js";
import { openSettingsModal } from "./views/settingsModal.js";

const VIEWS = {
  start: renderStart,
  menu: renderMenu,
  weekly: renderWeekly,
  shop: renderShop,
};

function getRoot() {
  return document.getElementById("view-root");
}

// 정적 chrome (topbar 로고, 토글 버튼 라벨, footer 버전, document.title) 동기화
function updateChrome() {
  const logo = document.getElementById("logo-text");
  if (logo) logo.textContent = t("app.logo");
  const version = document.getElementById("version-text");
  if (version) version.textContent = t("app.version");
  const toggle = document.getElementById("locale-toggle");
  if (toggle) {
    toggle.textContent = "⚙";
    toggle.setAttribute("aria-label", t("settingsModal.title"));
  }
  const pauseToggle = document.getElementById("pause-toggle");
  if (pauseToggle) {
    const gameActive = state.view === "weekly" && !!state.season && !!state.player;
    pauseToggle.disabled = !gameActive;
    pauseToggle.style.opacity = gameActive ? "1" : "0.4";
    pauseToggle.textContent = state.paused ? "▶" : "⏸";
    pauseToggle.setAttribute("aria-label", state.paused ? t("weekly.btnPlay") : t("weekly.btnPause"));
  }
  document.title = t("app.title");
}

function updateTopbar() {
  const el = document.getElementById("topbar-info");
  if (!el) return;
  if (state.player) {
    const p = state.player;
    // 단계별 level 라벨 — 고교/대학은 "{grade}학년", 프로·MLB 는 stageShort (1군/2군/A/AA/AAA/메이저).
    let level;
    if (p.stage === "high" || p.stage === "univ") {
      level = t("nav.gradeLabel", { grade: p.grade });
    } else if (p.stage === "retire") {
      level = t("nav.retiredLabel");
    } else {
      level = t("stageShort." + p.stage);
    }
    el.innerHTML = t("nav.topbarFormat", {
      name: `<strong>${escapeHtml(p.name)}</strong>`,
      team: escapeHtml(p.teamName ?? t("nav.teamPlaceholder")),
      level,
      age: p.age,
    });
  } else {
    el.innerHTML = "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function route(name, opts = {}) {
  // 같은 뷰 재렌더(매 tick, 자동훈련 등)에서는 스크롤 위치 유지.
  // 뷰가 실제로 바뀌었을 때만 상단으로 리셋.
  const isViewChange = state.view !== name;
  state.view = name;
  const fn = VIEWS[name] ?? VIEWS.menu;
  const root = getRoot();
  fn(root, route, opts);
  updateChrome();
  updateTopbar();
  updateFooter();
  if (isViewChange) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
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
  // tick 자동 진행 시엔 fromTick 옵션으로 호출 — 타임바(일시정지/속도) 보존
  route("weekly", { fromTick: true });
  if (state.season.finished) {
    state.paused = true;
  }
  saveCounter++;
  if (saveCounter >= 10) {
    saveCounter = 0;
    saveGame();
  }
  scheduleTick();
}

function wireSettingsButton() {
  const btn = document.getElementById("locale-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => openSettingsModal(route));
}

function wirePauseButton() {
  const btn = document.getElementById("pause-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    state.paused = !state.paused;
    updateChrome();
  });
}

// "맨 위로" floating 버튼 — 스크롤이 일정 임계 이상이면 표시.
function setupScrollTopButton() {
  const btn = document.createElement("button");
  btn.className = "scroll-top";
  btn.type = "button";
  btn.textContent = "↑";
  btn.setAttribute("aria-label", "Scroll to top");
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.body.appendChild(btn);

  const THRESHOLD = 200;
  let ticking = false;
  function update() {
    if (window.scrollY > THRESHOLD) btn.classList.add("visible");
    else btn.classList.remove("visible");
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  // 초기 상태 갱신
  update();
}

// 초기 진입
function init() {
  loadLocaleFromStorage();
  loadSettings();
  loadRegressionMeta();
  // Firebase Auth/Firestore 부팅 — firebaseConfig 비어있으면 silently 스킵.
  if (initFirebase()) {
    initAuth();
  }
  updateChrome();
  wireSettingsButton();
  wirePauseButton();
  setupScrollTopButton();
  route("start");
  scheduleTick();
}

document.addEventListener("DOMContentLoaded", init);

// 디버그용 노출
window.__gameState = state;
window.__route = route;
