// 오디오 매니저 — 효과음(Web Audio 합성) + BGM(파일).
//
// 설계:
//   - 효과음: 파일 0. Web Audio 로 즉석 합성 (타격/홈런/삼진/클릭/성공/실패).
//   - BGM:   파일 기반(manifest.BGM). 파일 없으면 무음. 뷰별 곡 + 루프.
//   - 모바일 자동재생 정책: 오디오는 첫 사용자 제스처 전엔 잠김 →
//     initAudioUnlock() 이 첫 pointerdown/keydown 에 컨텍스트 resume + 대기 BGM 재생.
//   - 음소거/볼륨: systems/settings.js (muted / bgmVolume / sfxVolume).

import { getSetting } from "../systems/settings.js";
import { BGM } from "./manifest.js";

let ctx = null;
let unlocked = false;
let currentBgm = null;        // { key, el }
const bgmCache = {};          // key -> HTMLAudioElement

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const isMuted = () => !!getSetting("muted");
const sfxVol  = () => clamp01(getSetting("sfxVolume") ?? 0.6);
const bgmVol  = () => clamp01(getSetting("bgmVolume") ?? 0.4);

// 첫 사용자 제스처에 오디오 unlock (모바일/브라우저 자동재생 정책 우회).
export function initAudioUnlock() {
  const handler = () => {
    unlocked = true;
    const c = audioCtx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
    if (currentBgm && !isMuted()) currentBgm.el.play().catch(() => {});
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("pointerdown", handler);
  window.addEventListener("keydown", handler);
}

// ── 효과음 (Web Audio 합성) ───────────────────────────────────────
function whiteNoise(c, dur) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export function sfx(name) {
  if (isMuted()) return;
  const c = audioCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});  // 첫 제스처 직후에도 울리도록
  const t = c.currentTime;
  const vol = sfxVol();
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(c.destination);

  const tone = (freq, dur, type = "sine", peak = 0.3, delay = 0) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t + delay);
    const env = c.createGain();
    o.connect(env); env.connect(out);
    env.gain.setValueAtTime(0.0001, t + delay);
    env.gain.exponentialRampToValueAtTime(peak * vol, t + delay + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
    o.start(t + delay); o.stop(t + delay + dur + 0.02);
  };
  const crack = (dur, peak = 0.4) => {
    const src = whiteNoise(c, dur);
    const env = c.createGain();
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500;
    src.connect(hp); hp.connect(env); env.connect(out);
    env.gain.setValueAtTime(peak * vol, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t); src.stop(t + dur + 0.02);
  };

  switch (name) {
    case "click":     tone(660, 0.05, "square", 0.12); break;
    case "hit":       crack(0.10, 0.45); tone(200, 0.10, "triangle", 0.18); break;       // 배트 타격
    case "homerun":   crack(0.12, 0.4); tone(330, 0.5, "sawtooth", 0.28); tone(523, 0.5, "sawtooth", 0.18, 0.04); break;
    case "strikeout": tone(180, 0.22, "square", 0.22); tone(120, 0.25, "square", 0.18, 0.06); break;
    case "good":      tone(880, 0.12, "sine", 0.22); tone(1320, 0.14, "sine", 0.16, 0.08); break;
    case "bad":       tone(160, 0.3, "sawtooth", 0.22); break;
    default:          tone(440, 0.07, "sine", 0.18);
  }
}

// ── BGM (파일) ────────────────────────────────────────────────────
export function playBgm(key) {
  const def = BGM[key];
  if (!def) { stopBgm(); return; }
  if (currentBgm?.key === key) return;        // 이미 재생 중
  stopBgm();
  let el = bgmCache[key];
  if (!el) {
    el = new Audio(def.src);
    el.loop = !!def.loop;
    el.addEventListener("error", () => {});   // 파일 없으면 무음
    bgmCache[key] = el;
  }
  el.volume = bgmVol();
  currentBgm = { key, el };
  if (unlocked && !isMuted()) el.play().catch(() => {});  // 아니면 unlock 시 재생
}

export function stopBgm() {
  if (!currentBgm) return;
  try { currentBgm.el.pause(); currentBgm.el.currentTime = 0; } catch (_) {}
  currentBgm = null;
}

// 설정(음소거/볼륨) 변경 시 호출 — 현재 BGM 에 즉시 반영.
export function applyAudioSettings() {
  if (!currentBgm) return;
  currentBgm.el.volume = bgmVol();
  if (isMuted()) {
    try { currentBgm.el.pause(); } catch (_) {}
  } else if (unlocked) {
    currentBgm.el.play().catch(() => {});
  }
}
