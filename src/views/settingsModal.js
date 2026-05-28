// 전역 설정 모달 — topbar 의 ⚙ 버튼이 토글.
// 내용: 배속 / 일시정지 (게임 중일 때만 활성) + 언어 토글.
//
// 어디서든 호출 가능: openSettingsModal(route). closeSettingsModal() 로 닫음.
// 모달 외부 클릭 또는 X 버튼으로도 닫힘.

import { state } from "../state.js";
import { t, toggleLocale, localeToggleLabel } from "../i18n/index.js";

const SPEEDS = [
  { label: "0.5x", ms: 1000 },
  { label: "1x",   ms: 500 },
  { label: "2x",   ms: 250 },
  { label: "4x",   ms: 125 },
];

let backdrop = null;

export function openSettingsModal(route) {
  if (backdrop) return;  // 중복 방지

  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "340px";

  // 닫기 (X)
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closeSettingsModal);
  dialog.appendChild(closeBtn);

  const h = document.createElement("h2");
  h.style.cssText = "margin:0 0 14px;";
  h.textContent = t("settingsModal.title");
  dialog.appendChild(h);

  // 1) 게임 진행 — 일시정지 + 배속. 게임 중일 때만 활성, 그 외엔 disabled.
  const gameActive = state.view === "weekly" && !!state.season && !!state.player;

  const gameSection = document.createElement("section");
  gameSection.style.marginBottom = "16px";

  const gameTitle = document.createElement("div");
  gameTitle.className = "muted small";
  gameTitle.style.cssText = "font-size:11px; margin-bottom:8px; font-weight:700;";
  gameTitle.textContent = t("settingsModal.gameControl");
  gameSection.appendChild(gameTitle);

  // 일시정지/재생
  const pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.className = "primary";
  pauseBtn.textContent = state.paused ? t("weekly.btnPlay") : t("weekly.btnPause");
  pauseBtn.style.cssText = "width:100%; padding:12px; font-size:14px; font-weight:700; margin-bottom:8px;";
  pauseBtn.disabled = !gameActive;
  if (!gameActive) pauseBtn.style.opacity = "0.5";
  pauseBtn.addEventListener("click", () => {
    if (!gameActive) return;
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? t("weekly.btnPlay") : t("weekly.btnPause");
  });
  gameSection.appendChild(pauseBtn);

  // 배속 4종
  const speedWrap = document.createElement("div");
  speedWrap.style.cssText = "display:grid; grid-template-columns:repeat(4,1fr); gap:4px;";
  for (const sp of SPEEDS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = sp.label;
    b.style.cssText = "padding:10px 0; font-size:12px; font-weight:700; min-width:0;";
    if (state.tickSpeed === sp.ms) b.classList.add("primary");
    b.disabled = !gameActive;
    if (!gameActive) b.style.opacity = "0.5";
    b.addEventListener("click", () => {
      if (!gameActive) return;
      state.tickSpeed = sp.ms;
      for (const x of speedWrap.children) x.classList.remove("primary");
      b.classList.add("primary");
    });
    speedWrap.appendChild(b);
  }
  gameSection.appendChild(speedWrap);

  if (!gameActive) {
    const hint = document.createElement("div");
    hint.className = "muted small";
    hint.style.cssText = "font-size:10.5px; margin-top:6px; line-height:1.4;";
    hint.textContent = t("settingsModal.gameInactiveHint");
    gameSection.appendChild(hint);
  }

  dialog.appendChild(gameSection);

  // 2) 언어 토글
  const langSection = document.createElement("section");
  const langTitle = document.createElement("div");
  langTitle.className = "muted small";
  langTitle.style.cssText = "font-size:11px; margin-bottom:8px; font-weight:700;";
  langTitle.textContent = t("settingsModal.language");
  langSection.appendChild(langTitle);

  const langBtn = document.createElement("button");
  langBtn.type = "button";
  langBtn.textContent = localeToggleLabel();
  langBtn.style.cssText = "width:100%; padding:12px; font-size:14px;";
  langBtn.addEventListener("click", () => {
    toggleLocale();
    // 현재 뷰 재렌더 + chrome 갱신. 모달은 닫음.
    closeSettingsModal();
    route(state.view ?? "menu");
  });
  langSection.appendChild(langBtn);

  dialog.appendChild(langSection);

  backdrop.appendChild(dialog);

  // 외부 클릭 → 닫기
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) closeSettingsModal();
  });

  document.body.appendChild(backdrop);
}

export function closeSettingsModal() {
  if (backdrop) {
    backdrop.remove();
    backdrop = null;
  }
}
