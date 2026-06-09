// 전역 설정 모달 — topbar 의 ⚙ 버튼이 토글.
// 내용: 배속 / 일시정지 (게임 중일 때만 활성) + 언어 토글.
//
// 어디서든 호출 가능: openSettingsModal(route). closeSettingsModal() 로 닫음.
// 모달 외부 클릭 또는 X 버튼으로도 닫힘.

import { state } from "../state.js";
import { t, toggleLocale, localeToggleLabel } from "../i18n/index.js";
import { setSetting, getSetting } from "../systems/settings.js";
import { applyAudioSettings, sfx } from "../assets/audio.js";

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

  // 1) 게임 진행 — 배속만. 일시정지/재생은 topbar 의 ⏸/▶ 아이콘으로 분리됨.
  const gameActive = state.view === "weekly" && !!state.season && !!state.player;

  const gameSection = document.createElement("section");
  gameSection.style.marginBottom = "16px";

  const gameTitle = document.createElement("div");
  gameTitle.className = "muted small";
  gameTitle.style.cssText = "font-size:11px; margin-bottom:8px; font-weight:700;";
  gameTitle.textContent = t("settingsModal.speed");
  gameSection.appendChild(gameTitle);

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

  // 2) 결승 모달 자동 띄우기 토글
  const finalsSection = document.createElement("section");
  finalsSection.style.marginBottom = "16px";
  const finalsRow = document.createElement("div");
  finalsRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";
  const finalsLabel = document.createElement("div");
  finalsLabel.style.cssText = "flex:1; min-width:0;";
  const finalsLabelTitle = document.createElement("div");
  finalsLabelTitle.style.cssText = "font-weight:700; font-size:13px;";
  finalsLabelTitle.textContent = t("settingsModal.finalsModalTitle");
  finalsLabel.appendChild(finalsLabelTitle);
  const finalsLabelDesc = document.createElement("div");
  finalsLabelDesc.className = "muted small";
  finalsLabelDesc.style.cssText = "font-size:11px; line-height:1.4;";
  finalsLabelDesc.textContent = t("settingsModal.finalsModalDesc");
  finalsLabel.appendChild(finalsLabelDesc);
  finalsRow.appendChild(finalsLabel);

  const finalsBtn = document.createElement("button");
  finalsBtn.type = "button";
  const isSkip = !!getSetting("skipFinalsModal");
  finalsBtn.textContent = isSkip ? t("settingsModal.toggleOn") : t("settingsModal.toggleOff");
  finalsBtn.className = isSkip ? "primary" : "";
  finalsBtn.style.cssText = "padding:8px 14px; font-size:12px; font-weight:700; flex-shrink:0;";
  finalsBtn.addEventListener("click", () => {
    const next = !getSetting("skipFinalsModal");
    setSetting("skipFinalsModal", next);
    finalsBtn.textContent = next ? t("settingsModal.toggleOn") : t("settingsModal.toggleOff");
    finalsBtn.className = next ? "primary" : "";
  });
  finalsRow.appendChild(finalsBtn);
  finalsSection.appendChild(finalsRow);
  dialog.appendChild(finalsSection);

  // 2.5) 사운드 — 음소거 토글 + 효과음/BGM 볼륨
  const audioSection = document.createElement("section");
  audioSection.style.marginBottom = "16px";

  const audioRow = document.createElement("div");
  audioRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;";
  const audioLabel = document.createElement("div");
  audioLabel.style.cssText = "font-weight:700; font-size:13px;";
  audioLabel.textContent = t("settingsModal.soundTitle");
  audioRow.appendChild(audioLabel);

  const muteBtn = document.createElement("button");
  muteBtn.type = "button";
  const syncMute = () => {
    const m = !!getSetting("muted");
    muteBtn.textContent = m ? t("settingsModal.soundMuted") : t("settingsModal.soundOn");
    muteBtn.className = m ? "" : "primary";
  };
  muteBtn.style.cssText = "padding:8px 14px; font-size:12px; font-weight:700; flex-shrink:0;";
  syncMute();
  muteBtn.addEventListener("click", () => {
    setSetting("muted", !getSetting("muted"));
    syncMute();
    applyAudioSettings();
    
    // 탑바의 mute-toggle 버튼 텍스트/라벨 동기화
    const muteToggle = document.getElementById("mute-toggle");
    if (muteToggle) {
      const isMutedVal = !!getSetting("muted");
      const volVal = getSetting("sfxVolume") ?? 0.5;
      const isReallyMuted = isMutedVal || volVal <= 0;
      muteToggle.textContent = isReallyMuted ? "🔇" : "🔊";
      muteToggle.setAttribute("aria-label", isReallyMuted ? t("settingsModal.soundMuted") : t("settingsModal.soundOn"));
    }

    if (!getSetting("muted")) sfx("click");
  });
  audioRow.appendChild(muteBtn);
  audioSection.appendChild(audioRow);

  // 볼륨 슬라이더 (BGM / 효과음)
  const mkVol = (key, labelKey, onChange) => {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:6px;";
    const lab = document.createElement("span");
    lab.className = "muted small";
    lab.style.cssText = "font-size:11px; width:64px; flex-shrink:0;";
    lab.textContent = t(labelKey);
    const rng = document.createElement("input");
    rng.type = "range"; rng.min = "0"; rng.max = "100"; rng.step = "5";
    rng.value = String(Math.round((getSetting(key) ?? 0.5) * 100));
    rng.style.cssText = "flex:1; min-width:0;";
    rng.addEventListener("input", () => {
      setSetting(key, Number(rng.value) / 100);
      onChange?.();

      // 볼륨 조절 시에도 탑바 mute-toggle 상태 업데이트
      const muteToggle = document.getElementById("mute-toggle");
      if (muteToggle) {
        const isMutedVal = !!getSetting("muted");
        const volVal = getSetting("sfxVolume") ?? 0.5;
        const isReallyMuted = isMutedVal || volVal <= 0;
        muteToggle.textContent = isReallyMuted ? "🔇" : "🔊";
        muteToggle.setAttribute("aria-label", isReallyMuted ? t("settingsModal.soundMuted") : t("settingsModal.soundOn"));
      }
    });
    wrap.appendChild(lab);
    wrap.appendChild(rng);
    return wrap;
  };
  audioSection.appendChild(mkVol("bgmVolume", "settingsModal.soundBgm", () => applyAudioSettings()));
  audioSection.appendChild(mkVol("sfxVolume", "settingsModal.soundSfx", () => sfx("click")));

  dialog.appendChild(audioSection);

  // 2) 언어 토글 (작게 변경)
  const langSection = document.createElement("section");
  langSection.style.marginBottom = "16px";
  const langRow = document.createElement("div");
  langRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";

  const langTitle = document.createElement("div");
  langTitle.style.cssText = "font-weight:700; font-size:13px;";
  langTitle.textContent = t("settingsModal.language");
  langRow.appendChild(langTitle);

  const langBtn = document.createElement("button");
  langBtn.type = "button";
  langBtn.textContent = localeToggleLabel();
  // 언어 변경 버튼을 훨씬 작고 깔끔하게 스타일링
  langBtn.style.cssText = "padding:5px 10px; font-size:11px; font-weight:700; flex-shrink:0; font-family:inherit;";
  langBtn.addEventListener("click", () => {
    toggleLocale();
    // 현재 뷰 재렌더 + chrome 갱신. 모달은 닫음.
    closeSettingsModal();
    route(state.view ?? "menu");
  });
  langRow.appendChild(langBtn);
  langSection.appendChild(langRow);
  dialog.appendChild(langSection);

  // 3) 설정창 하단 확인(닫기) 버튼 추가
  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "primary";
  confirmBtn.textContent = t("weekly.confirmBtn") || "Confirm";
  confirmBtn.style.cssText = "width:100%; padding:10px; font-size:13px; font-weight:700; margin-top:20px; border-radius:6px; font-family:inherit;";
  confirmBtn.addEventListener("click", closeSettingsModal);
  dialog.appendChild(confirmBtn);

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
