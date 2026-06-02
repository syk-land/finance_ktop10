// i18n — locale management, t(key, params), formatGameDate
//
// 사용법:
//   import { t, setLocale, getLocale, formatGameDate } from "./i18n/index.js";
//   t("stat.contact")              -> "컨택" | "Contact"
//   t("log.seasonStart", { team: "북일고", grade: 2 })
//
// state.locale 은 main 진입 시 loadLocaleFromStorage 로 복원되며,
// setLocale 호출 시 localStorage에 별도 키(LOCALE_KEY)로 영속화한다.
// 게임 세이브와는 독립적으로 저장 — 어떤 세이브를 불러와도 사용자 언어 선택은 유지.

import { state } from "../state.js";
import { ko } from "./ko.js";
import { en } from "./en.js";

export const SUPPORTED_LOCALES = ["ko", "en"];
export const DEFAULT_LOCALE = "en";   // 기본 영어 (글로벌 릴리스)

const TABLES = { ko, en };
const LOCALE_KEY = "ninthinning.locale.v1";

const MONTH_ABBR = {
  ko: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
};

const WEEKDAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];

export function getLocale() {
  return state.locale ?? DEFAULT_LOCALE;
}

export function setLocale(loc) {
  if (!SUPPORTED_LOCALES.includes(loc)) return false;
  state.locale = loc;
  try { localStorage.setItem(LOCALE_KEY, loc); } catch (_) {}
  // index.html title sync
  if (typeof document !== "undefined") {
    document.title = t("app.title");
    document.documentElement.setAttribute("lang", loc);
  }
  return true;
}

export function toggleLocale() {
  setLocale(getLocale() === "ko" ? "en" : "ko");
}

export function loadLocaleFromStorage() {
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    if (SUPPORTED_LOCALES.includes(v)) {
      state.locale = v;
    } else {
      state.locale = DEFAULT_LOCALE;
    }
  } catch (_) {
    state.locale = DEFAULT_LOCALE;
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", state.locale);
  }
}

function lookup(table, key) {
  const parts = key.split(".");
  let cur = table;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(str, params) {
  if (!params || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export function t(key, params) {
  const loc = getLocale();
  let v = lookup(TABLES[loc], key);
  if (v === undefined) v = lookup(TABLES[DEFAULT_LOCALE], key);
  if (v === undefined) return key;
  if (typeof v === "string") return interpolate(v, params);
  return v;
}

// 게임 날짜 포맷팅 — locale별 패턴
export function formatGameDate(d) {
  if (!d) return "";
  const loc = getLocale();
  const weekday = t("weekday." + WEEKDAY_KEYS[d.dayOfWeek]);
  const monthIdx = Math.max(0, Math.min(11, (d.month ?? 1) - 1));
  return t("dateFormat", {
    month: d.month,
    dayOfMonth: d.dayOfMonth,
    monthAbbr: MONTH_ABBR[loc][monthIdx],
    weekday,
  });
}

// 토글 버튼에 보여줄 라벨 (현재 locale에서 "다른 언어" 라벨)
export function localeToggleLabel() {
  return t("nav.localeToggle");
}
