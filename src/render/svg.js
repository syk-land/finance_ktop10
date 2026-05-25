// SVG 생성 헬퍼
export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c) el.appendChild(c);
  }
  return el;
}

export function svg(width, height, viewBox) {
  return svgEl("svg", {
    width, height,
    viewBox: viewBox ?? `0 0 ${width} ${height}`,
    xmlns: SVG_NS,
  });
}

export function group(children, attrs = {}) {
  return svgEl("g", attrs, children);
}
