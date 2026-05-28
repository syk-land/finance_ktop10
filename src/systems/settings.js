// 게임 메타 설정 (locale 외) — localStorage 별도 키로 영속화.
//
// 캐릭터 세이브와 독립. 회귀 메타와도 독립. 게임 진행 무관한 사용자 선호.
//
// 현재 항목:
//   skipFinalsModal: 결승 진출 시 모달 자동 안 띄움. 자동 시뮬+보상 적용+토스트만.

import { state } from "../state.js";

const KEY = "ninthinning.settings.v1";

const DEFAULTS = {
  skipFinalsModal: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    state.settings = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (_) {
    state.settings = { ...DEFAULTS };
  }
  return state.settings;
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error("settings save failed", e);
  }
}

export function setSetting(key, value) {
  if (!state.settings) state.settings = { ...DEFAULTS };
  state.settings[key] = value;
  saveSettings();
}

export function getSetting(key) {
  return state.settings?.[key] ?? DEFAULTS[key];
}
