// 이미지 로더 — 바이너리 이미지 + 폴백.
//
// createImage(key, { fallback }) 는 <img> 를 감싼 컨테이너를 반환하고,
// 파일 로드 실패(미존재 포함) 시 fallback() 의 노드로 즉시 대체한다.
// → 에셋이 아직 없어도 기존 SVG 등으로 게임이 그대로 보인다.

import { IMAGES } from "./manifest.js";

export function createImage(key, opts = {}) {
  const { alt = "", fallback = null, className = "", style = "", imgStyle = "", onload = null } = opts;
  const wrap = document.createElement("div");
  if (className) wrap.className = className;
  if (style) wrap.style.cssText = style;

  const def = IMAGES[key];
  if (!def) {
    if (fallback) wrap.appendChild(fallback());
    return wrap;
  }

  const img = document.createElement("img");
  img.alt = alt;
  // imgStyle: <img> 전용 추가 스타일 (예: transform:scaleX(-1) 손방향 반전). 폴백 노드엔 미적용.
  img.style.cssText = "display:block; width:100%; height:auto;" + imgStyle;
  img.addEventListener("error", () => {
    wrap.innerHTML = "";
    if (fallback) wrap.appendChild(fallback());
  });
  if (onload) img.addEventListener("load", () => onload(img, wrap));
  img.src = def.src;
  wrap.appendChild(img);
  return wrap;
}

// preload=true 인 이미지를 백그라운드로 미리 받아둠 (없으면 조용히 실패).
export function preloadImages() {
  for (const k of Object.keys(IMAGES)) {
    if (!IMAGES[k].preload) continue;
    const im = new Image();
    im.src = IMAGES[k].src;
  }
}
