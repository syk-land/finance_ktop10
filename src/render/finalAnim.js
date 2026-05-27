// 결승전 시각화 — POV 씬 + 다이아몬드 오버레이.
//
// 사용 패턴:
//   const scene = createPOVScene("bat");
//   container.appendChild(scene.el);
//   await scene.playPitch({ type: "HR" });
//   scene.el.remove();
//
// mode "bat" = 정면 투수 + 등 뒤 타자(내 시점). 메인이 batter일 때.
// mode "pit" = 정면 타자 + 등 뒤 투수(내 시점). 메인이 pitcher일 때.

import { svgEl } from "./svg.js";
import { t } from "../i18n/index.js";
import { state } from "../state.js";

const W = 320, H = 220;
const ZONE = { x: 130, y: 95, w: 60, h: 65 };

// 결과별 시각화 스펙
const PLAYBOOK = {
  K:    { swing: false, ballEnd: "zone",     accent: "#ff5050" },
  BB:   { swing: false, ballEnd: "wide",     accent: "#5aff87" },
  "1B": { swing: true,  ballEnd: "forward",  accent: "#5aff87" },
  "2B": { swing: true,  ballEnd: "side-mid", accent: "#5aff87" },
  "3B": { swing: true,  ballEnd: "deep",     accent: "#5aff87" },
  HR:   { swing: true,  ballEnd: "homerun",  accent: "#ffb84e", firework: true },
  OUT:  { swing: true,  ballEnd: "side-roll",accent: "#888888" },
};

// 정면 투수 (bat 모드 상단)
function pitcherFront() {
  return svgEl("g", { transform: "translate(160, 38)" }, [
    svgEl("ellipse", { cx: 0, cy: 28, rx: 20, ry: 26, fill: "#3a4a5e" }),
    svgEl("ellipse", { cx: -14, cy: 22, rx: 6, ry: 8, fill: "#3a4a5e" }),
    svgEl("ellipse", { cx: 14, cy: 22, rx: 6, ry: 8, fill: "#3a4a5e" }),
    svgEl("circle",  { cx: 0, cy: 0, r: 10, fill: "#e6c9a8" }),
    svgEl("path",    { d: "M -10,-3 Q 0,-15 10,-3 Z", fill: "#1e4a8e" }),
    svgEl("rect",    { x: -12, y: -2, width: 24, height: 2.2, fill: "#1e4a8e" }),
    svgEl("circle",  { cx: -18, cy: 20, r: 6.5, fill: "#5a3a1e" }),
  ]);
}

// 정면 타자 (pit 모드 상단)
function batterFront() {
  return svgEl("g", { transform: "translate(160, 38)" }, [
    svgEl("ellipse", { cx: 0, cy: 30, rx: 18, ry: 24, fill: "#6e3a3a" }),
    svgEl("ellipse", { cx: 16, cy: 18, rx: 5, ry: 7, fill: "#6e3a3a", transform: "rotate(-30 16 18)" }),
    svgEl("circle",  { cx: 0, cy: 0, r: 10, fill: "#e6c9a8" }),
    svgEl("path",    { d: "M -10,-3 Q 0,-15 10,-3 Z", fill: "#2a2a2a" }),
    svgEl("rect",    { x: -12, y: -2, width: 24, height: 2.2, fill: "#2a2a2a" }),
    svgEl("rect",    { x: 14, y: -22, width: 2.5, height: 36, fill: "#8a5a2a", transform: "rotate(18 14 -22)" }),
  ]);
}

// 타자 등 뒤 (bat 모드 하단)
function batterBack(swingRef) {
  const bat = svgEl("rect", {
    x: 14, y: -32, width: 3, height: 36, fill: "rgba(0,0,0,0.55)",
    transform: "rotate(20 14 -32)",
  });
  swingRef.bat = bat;
  return svgEl("g", { transform: "translate(160, 195)" }, [
    svgEl("ellipse", { cx: 0, cy: -8, rx: 17, ry: 13, fill: "rgba(0,0,0,0.55)" }),
    svgEl("ellipse", { cx: 0, cy: -28, rx: 8, ry: 7, fill: "rgba(0,0,0,0.65)" }),
    bat,
  ]);
}

// 투수 등 뒤 (pit 모드 하단)
function pitcherBack() {
  return svgEl("g", { transform: "translate(160, 195)" }, [
    svgEl("ellipse", { cx: 0, cy: -8, rx: 17, ry: 13, fill: "rgba(0,0,0,0.55)" }),
    svgEl("ellipse", { cx: 0, cy: -28, rx: 8, ry: 7, fill: "rgba(0,0,0,0.65)" }),
    svgEl("circle", { cx: -14, cy: -10, r: 5.5, fill: "rgba(0,0,0,0.55)" }),
  ]);
}

// 스트라이크 존 (9칸 격자)
function strikeZone() {
  const g = svgEl("g", {});
  g.appendChild(svgEl("rect", {
    x: ZONE.x, y: ZONE.y, width: ZONE.w, height: ZONE.h,
    fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.4)", "stroke-width": 1,
  }));
  for (let i = 1; i < 3; i++) {
    g.appendChild(svgEl("line", {
      x1: ZONE.x + (ZONE.w / 3) * i, y1: ZONE.y,
      x2: ZONE.x + (ZONE.w / 3) * i, y2: ZONE.y + ZONE.h,
      stroke: "rgba(255,255,255,0.18)",
    }));
    g.appendChild(svgEl("line", {
      x1: ZONE.x, y1: ZONE.y + (ZONE.h / 3) * i,
      x2: ZONE.x + ZONE.w, y2: ZONE.y + (ZONE.h / 3) * i,
      stroke: "rgba(255,255,255,0.18)",
    }));
  }
  return g;
}

function ballEl() {
  return svgEl("circle", {
    r: 4, fill: "#ffffff", stroke: "#cc3030", "stroke-width": 1,
    style: "filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));",
  });
}

function makeBackground(svg) {
  // 마운드 살짝 + 홈플레이트
  svg.appendChild(svgEl("ellipse", { cx: 160, cy: 80, rx: 55, ry: 14, fill: "rgba(180,140,80,0.12)" }));
  svg.appendChild(svgEl("ellipse", { cx: 160, cy: 190, rx: 95, ry: 16, fill: "rgba(255,255,255,0.05)" }));
  svg.appendChild(svgEl("polygon", { points: "140,188 180,188 180,193 160,202 140,193", fill: "rgba(255,255,255,0.85)" }));
}

export function createPOVScene(mode = "bat") {
  const svg = svgEl("svg", {
    width: "100%", height: "200", viewBox: `0 0 ${W} ${H}`,
  });
  svg.style.cssText = "display:block; max-width:340px; margin:0 auto; background:linear-gradient(180deg, #142030 0%, #1a2a3d 70%, #0e1116 100%); border-radius:6px; border:1px solid var(--border);";

  makeBackground(svg);

  const swingRef = { bat: null };

  if (mode === "bat") {
    svg.appendChild(pitcherFront());
    svg.appendChild(strikeZone());
    svg.appendChild(batterBack(swingRef));
  } else {
    svg.appendChild(pitcherBack());
    svg.appendChild(strikeZone());
    svg.appendChild(batterFront());
  }

  const ball = ballEl();
  ball.setAttribute("cx", "160");
  ball.setAttribute("cy", "58");
  ball.style.opacity = "0";
  svg.appendChild(ball);

  const labelHost = svgEl("g", {});
  svg.appendChild(labelHost);

  return {
    el: svg,
    playPitch(event) {
      return playPitchSequence({ svg, ball, labelHost, swingRef, event, mode });
    },
  };
}

function pickEndPoint(spec) {
  const cx = ZONE.x + ZONE.w / 2;
  const cy = ZONE.y + ZONE.h / 2;
  const jitter = (n) => (Math.random() - 0.5) * n;

  let contact = { x: cx + jitter(30), y: cy + jitter(28) };
  let final = { ...contact, r: 5, opacity: 1 };

  switch (spec.ballEnd) {
    case "zone":
      // 그대로 박힘
      break;
    case "wide":
      contact = {
        x: cx + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 18),
        y: cy + jitter(40),
      };
      final = { ...contact, r: 5, opacity: 1 };
      break;
    case "forward":
      // 단타: 컨택 후 외야(앞=위)로 라인드라이브, 좌/중/우 어딘가에 떨어짐
      final = { x: cx + jitter(140), y: 25 + Math.random() * 25, r: 5, opacity: 0.4 };
      break;
    case "side-mid":
      final = { x: Math.random() < 0.5 ? -30 : W + 30, y: contact.y - 15, r: 5, opacity: 0.5 };
      break;
    case "deep":
      final = { x: cx + jitter(160), y: 5 + Math.random() * 15, r: 6, opacity: 0.3 };
      break;
    case "homerun":
      // 홈런: 앞으로 크게 솟구치며 화면 위로 사라짐
      final = { x: cx + jitter(80), y: -55, r: 11, opacity: 0.15 };
      break;
    case "side-roll": {
      // 범타: 컨택 후 좌/우 옆으로 굴러나감 (낮게)
      const left = Math.random() < 0.5;
      final = { x: left ? -10 : W + 10, y: contact.y + 18 + Math.random() * 22, r: 3, opacity: 0.35 };
      break;
    }
  }
  return { contact, final };
}

function playPitchSequence({ svg, ball, labelHost, swingRef, event, mode }) {
  const spec = PLAYBOOK[event.type] ?? PLAYBOOK.OUT;
  const { contact, final } = pickEndPoint(spec);

  // 시작: 투수 손 부근 (bat) 또는 타자 부근에서 멀어짐 (pit)
  const start = mode === "bat"
    ? { x: 160, y: 58, r: 3 }
    : { x: 160, y: 58, r: 3 };

  ball.style.opacity = "1";
  ball.setAttribute("cx", start.x);
  ball.setAttribute("cy", start.y);
  ball.setAttribute("r", start.r);

  return animateBall(ball, start, { x: contact.x, y: contact.y, r: 5 }, 380)
    .then(() => {
      // 스윙 (있으면) + 결과 라벨
      if (spec.swing && swingRef.bat) {
        swingBat(swingRef.bat);
      }
      showLabel(labelHost, t("event." + event.type), spec.accent);
      // 컨택 직후 후속 비행
      return animateBall(ball, { x: contact.x, y: contact.y, r: 5 }, final, 700);
    })
    .then(() => {
      // 홈런이면 공이 멀어진 뒤 폭죽 + 라벨 유지 길게
      if (spec.firework) {
        spawnFireworks(svg);
        return waitMs(900);
      }
      return waitMs(220);
    })
    .then(() => {
      ball.style.opacity = "0";
      hideLabel(labelHost);
    });
}

// 홈런 폭죽 — 화면에 여러 위치에서 색색의 점들이 방사형으로 퍼지며 페이드
function spawnFireworks(svg) {
  const colors = ["#ff5050", "#ffb84e", "#5aff87", "#5ad6ff", "#ff80d0", "#ffff80"];
  const bursts = [
    { x: 80,  y: 70, count: 14 },
    { x: 240, y: 80, count: 14 },
    { x: 160, y: 50, count: 16 },
  ];
  const layer = svgEl("g", { "pointer-events": "none" });
  svg.appendChild(layer);

  const particles = [];
  for (const burst of bursts) {
    for (let i = 0; i < burst.count; i++) {
      const angle = (Math.PI * 2 * i) / burst.count + Math.random() * 0.4;
      const speed = 50 + Math.random() * 60;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dot = svgEl("circle", {
        cx: burst.x, cy: burst.y, r: 2.5, fill: color, opacity: 1,
      });
      layer.appendChild(dot);
      particles.push({
        el: dot, x: burst.x, y: burst.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
    // 중앙 플래시
    const flash = svgEl("circle", {
      cx: burst.x, cy: burst.y, r: 6, fill: "#ffffff", opacity: 0.9,
    });
    layer.appendChild(flash);
    particles.push({ el: flash, flash: true, t: 0 });
  }

  const t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    const p = Math.min(1, t / 0.9);
    for (const pt of particles) {
      if (pt.flash) {
        const r = 6 + t * 40;
        const op = Math.max(0, 0.9 - t * 1.6);
        pt.el.setAttribute("r", r.toFixed(1));
        pt.el.setAttribute("opacity", op.toFixed(2));
      } else {
        const x = pt.x + pt.vx * t;
        const y = pt.y + pt.vy * t + 60 * t * t; // 중력
        const op = Math.max(0, 1 - p);
        pt.el.setAttribute("cx", x.toFixed(1));
        pt.el.setAttribute("cy", y.toFixed(1));
        pt.el.setAttribute("opacity", op.toFixed(2));
      }
    }
    if (p < 1) requestAnimationFrame(frame);
    else layer.remove();
  }
  requestAnimationFrame(frame);
}

function animateBall(ball, from, to, duration) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const fromR = from.r ?? +ball.getAttribute("r");
    const toR = to.r ?? fromR;
    const fromOp = +ball.style.opacity || 1;
    const toOp = to.opacity ?? 1;
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const x = from.x + (to.x - from.x) * p;
      const y = from.y + (to.y - from.y) * p;
      const r = fromR + (toR - fromR) * p;
      const op = fromOp + (toOp - fromOp) * p;
      ball.setAttribute("cx", x.toFixed(1));
      ball.setAttribute("cy", y.toFixed(1));
      ball.setAttribute("r", r.toFixed(1));
      ball.style.opacity = op.toFixed(2);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function swingBat(bat) {
  // 짧은 회전 애니메이션 (rotate 20 → -60 → 20)
  const baseTransform = "rotate({deg} 14 -32)";
  const start = 20, mid = -70, end = 20;
  const dur1 = 120, dur2 = 180;
  const t0 = performance.now();
  function frame(now) {
    const t = now - t0;
    if (t < dur1) {
      const p = t / dur1;
      const deg = start + (mid - start) * p;
      bat.setAttribute("transform", baseTransform.replace("{deg}", deg.toFixed(1)));
      requestAnimationFrame(frame);
    } else if (t < dur1 + dur2) {
      const p = (t - dur1) / dur2;
      const deg = mid + (end - mid) * p;
      bat.setAttribute("transform", baseTransform.replace("{deg}", deg.toFixed(1)));
      requestAnimationFrame(frame);
    } else {
      bat.setAttribute("transform", baseTransform.replace("{deg}", String(end)));
    }
  }
  requestAnimationFrame(frame);
}

function showLabel(host, text, color) {
  while (host.firstChild) host.removeChild(host.firstChild);
  const g = svgEl("g", {});
  g.appendChild(svgEl("rect", {
    x: 60, y: 95, width: 200, height: 38, rx: 5,
    fill: "rgba(0,0,0,0.72)", stroke: color, "stroke-width": 1,
  }));
  const txt = svgEl("text", {
    x: 160, y: 122, "text-anchor": "middle", "font-size": 22, "font-weight": "800",
    fill: color, "letter-spacing": "2px",
  });
  txt.textContent = text;
  g.appendChild(txt);
  g.style.opacity = "0";
  g.style.transition = "opacity 140ms";
  host.appendChild(g);
  requestAnimationFrame(() => { g.style.opacity = "1"; });
}

function hideLabel(host) {
  const g = host.firstChild;
  if (g) g.style.opacity = "0";
}

function waitMs(ms) {
  // state.tickSpeed (1x=500ms) 에 비례 — 4x면 0.25배 속도.
  const mult = (state.tickSpeed ?? 500) / 500;
  return new Promise(r => setTimeout(r, ms * mult));
}

// 다이아몬드 위 점수 펄스 (메인 이벤트 없는 이닝의 득점용)
export function pulseDiamondHome(diamondSvg) {
  if (!diamondSvg) return;
  const ring = svgEl("circle", {
    cx: 50, cy: 88, r: 5, fill: "none",
    stroke: "var(--accent-2)", "stroke-width": 2, opacity: "0.9",
  });
  diamondSvg.appendChild(ring);
  const t0 = performance.now();
  function frame(now) {
    const t = now - t0;
    const p = Math.min(1, t / 700);
    ring.setAttribute("r", (5 + p * 22).toFixed(1));
    ring.setAttribute("opacity", (0.9 * (1 - p)).toFixed(2));
    if (p < 1) requestAnimationFrame(frame);
    else ring.remove();
  }
  requestAnimationFrame(frame);
}
