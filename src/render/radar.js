// 레이더 차트 — 재능 타입의 능력치 boost 시각화
import { svg, svgEl, group } from "./svg.js";

// values: { axisName: value0to1, ... } (max=1.5 정도)
// labels: 순서대로 표시할 키 배열
export function createRadarSVG(values, labels, opts = {}) {
  const size = opts.size ?? 260;
  const margin = opts.margin ?? 36;
  const radius = (size - margin * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const n = labels.length;

  const root = svg(size, size, `0 0 ${size} ${size}`);

  // 그리드 (4단계)
  for (let g = 1; g <= 4; g++) {
    const r = (radius * g) / 4;
    const pts = polygonPoints(cx, cy, r, n);
    root.appendChild(svgEl("polygon", {
      points: pts,
      fill: g === 4 ? "rgba(78,164,255,0.04)" : "none",
      stroke: g === 4 ? "#3a4a5e" : "#2a3340",
      "stroke-width": g === 4 ? "1.4" : "0.8",
    }));
  }

  // 축 라인
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    root.appendChild(svgEl("line", {
      x1: cx, y1: cy, x2: x, y2: y,
      stroke: "#2a3340", "stroke-width": "0.8",
    }));
  }

  // 데이터 polygon — opts.min/max로 스케일링
  const minVal = opts.min ?? 0.5;
  const maxVal = opts.max ?? 1.5;
  const dataPoints = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const v = values[labels[i]] ?? minVal;
    const ratio = Math.max(0, Math.min(1, (v - minVal) / (maxVal - minVal)));
    const r = radius * ratio;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    dataPoints.push([x, y]);
  }
  root.appendChild(svgEl("polygon", {
    points: dataPoints.map(p => p.join(",")).join(" "),
    fill: "rgba(255,184,78,0.25)",
    stroke: "#ffb84e",
    "stroke-width": "2",
    "stroke-linejoin": "round",
  }));
  for (const [x, y] of dataPoints) {
    root.appendChild(svgEl("circle", { cx: x, cy: y, r: 2.5, fill: "#ffb84e" }));
  }

  // 라벨
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    const x = cx + Math.cos(angle) * (radius + 16);
    const y = cy + Math.sin(angle) * (radius + 16);
    const txt = svgEl("text", {
      x, y: y + 4,
      "text-anchor": "middle",
      fill: "#8b949e",
      "font-size": "11",
      "font-family": "system-ui, sans-serif",
    });
    txt.textContent = opts.labelMap?.[labels[i]] ?? labels[i];
    root.appendChild(txt);
  }

  return root;
}

function polygonPoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    pts.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return pts.join(" ");
}
