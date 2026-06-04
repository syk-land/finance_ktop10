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
import { createImage } from "../assets/images.js";
import { sfx } from "../assets/audio.js";

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
  // 손방향: 타격 전경은 좌타(left/mixed), 투구 전경은 좌투(left/lefty_rb)에서 좌우반전.
  const hand = state.player?.hand ?? "right";
  const fgFlip = mode === "bat"
    ? (hand === "left" || hand === "mixed")
    : (hand === "left" || hand === "lefty_rb");

  // 컨테이너: 배경이미지(z0) < SVG 오버레이(z1) < 전경소품(z2). 그라데이션은 SVG 폴백용 배경.
  // width:100% 필수 — 자식이 전부 position:absolute 라 명시 너비 없으면 flex 부모에서 0 으로 붕괴.
  const container = document.createElement("div");
  container.style.cssText = "position:relative; width:100%; max-width:340px; height:200px; margin:0 auto; border-radius:6px; overflow:hidden; border:1px solid var(--border); background:linear-gradient(180deg,#142030 0%,#1a2a3d 70%,#0e1116 100%);";

  const svg = svgEl("svg", { width: "100%", height: "100%", viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "position:absolute; inset:0; display:block; z-index:1;";

  // ── SVG 폴백 레이어 (이미지 로드 성공 시 해당 그룹 display:none) ──
  const bgGroup = svgEl("g", {});
  makeBackground(bgGroup);
  svg.appendChild(bgGroup);

  const swingRef = { bat: null, fg: null, flip: fgFlip, mode };

  let opponentGroup, backGroup;
  if (mode === "bat") {
    opponentGroup = pitcherFront();      // 앞 = 상대 투수
    backGroup = batterBack(swingRef);    // 뒤 = 내 타자(방망이 → swingRef.bat)
  } else {
    opponentGroup = batterFront();       // 앞 = 상대 타자
    backGroup = pitcherBack();           // 뒤 = 내 투수 어깨
  }
  svg.appendChild(opponentGroup);
  svg.appendChild(strikeZone());
  svg.appendChild(backGroup);

  const ball = ballEl();
  ball.setAttribute("cx", "160");
  ball.setAttribute("cy", "58");
  ball.style.opacity = "0";
  svg.appendChild(ball);

  // ── 이미지 레이어 (있으면 위 SVG 폴백 숨김) ──
  const bgImg = createImage(mode === "bat" ? "povBgBat" : "povBgPitch", {
    style: "position:absolute; inset:0; z-index:0;",
    imgStyle: "width:100%; height:100%; object-fit:cover;",
    onload: () => { bgGroup.style.display = "none"; opponentGroup.style.display = "none"; },
  });
  // 전경 소품 — 1인칭 하단에 작게(높이 ~50%) 배치. 너무 크면 가운데 상대/공/결과글자를 가린다.
  const fgImg = createImage(mode === "bat" ? "povFgBat" : "povFgPitch", {
    style: `position:absolute; left:50%; bottom:-2%; height:50%; aspect-ratio:1/1; width:auto; z-index:2; will-change:transform; transform-origin:50% 100%; transform:translateX(-50%)${fgFlip ? " scaleX(-1)" : ""};`,
    imgStyle: "height:100%; width:100%; object-fit:contain;",
    onload: () => { backGroup.style.display = "none"; swingRef.fg = fgImg; },
  });

  // 최상단 오버레이(z3) — 결과 라벨/폭죽. 전경 소품 위에 떠야 "뭐 했는지" 글자가 안 가려진다.
  const overlaySvg = svgEl("svg", { width: "100%", height: "100%", viewBox: `0 0 ${W} ${H}` });
  overlaySvg.style.cssText = "position:absolute; inset:0; z-index:3; pointer-events:none;";
  const labelHost = svgEl("g", {});
  overlaySvg.appendChild(labelHost);

  container.appendChild(bgImg);
  container.appendChild(svg);
  container.appendChild(fgImg);
  container.appendChild(overlaySvg);

  return {
    el: container,
    playPitch(event) {
      return playPitchSequence({ svg, fxHost: overlaySvg, ball, labelHost, swingRef, event, mode });
    },
  };
}

// 전경 소품(HTML img wrap)의 기준 transform — 중앙정렬 + 좌우반전 유지(회전은 이 뒤에 덧붙임).
function fgBaseTransform(ref) {
  return `translateX(-50%)${ref.flip ? " scaleX(-1)" : ""}`;
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

// 결과별 효과음. 타격음 3종(홈런/안타/범타) + 홈런 함성. 삼진은 별도. 볼넷/사구는 무음.
function playResultSfx(type) {
  if (type === "HR") { sfx("homerun"); sfx("crowd"); }
  else if (type === "1B" || type === "2B" || type === "3B") sfx("hit");
  else if (type === "OUT" || type === "E" || type === "DP" || type === "SF") sfx("out");
  else if (type === "K") sfx("strikeout");
}

let isInteractiveActive = false;

function updateEventResult(event, finalResult) {
  event.type = finalResult;
  if (finalResult === "HR") {
    event.runsScored = Math.max(1, event.runsScored ?? 0);
    event.rbi = Math.max(1, event.rbi ?? 0);
  } else if (finalResult === "1B" || finalResult === "2B" || finalResult === "3B") {
    event.runsScored = event.runsScored ?? 0;
    event.rbi = event.rbi ?? 0;
  } else {
    event.runsScored = 0;
    event.rbi = 0;
  }
}

function playPitchSequence({ svg, fxHost, ball, labelHost, swingRef, event, mode }) {
  const isManual = state.settings?.manualPlay !== false; // 기본값 true
  if (isManual) {
    return playPitchSequenceManual({ svg, fxHost, ball, labelHost, swingRef, event, mode });
  }
  return playPitchSequenceAuto({ svg, fxHost, ball, labelHost, swingRef, event, mode });
}

function playPitchSequenceAuto({ svg, fxHost, ball, labelHost, swingRef, event, mode }) {
  const spec = PLAYBOOK[event.type] ?? PLAYBOOK.OUT;
  const { contact, final } = pickEndPoint(spec);

  const start = mode === "bat" ? { x: 160, y: 58, r: 3 } : { x: 160, y: 58, r: 3 };

  ball.style.opacity = "1";
  ball.setAttribute("cx", start.x);
  ball.setAttribute("cy", start.y);
  ball.setAttribute("r", start.r);

  sfx("pitch");
  if (mode === "pit" && swingRef.fg) throwPush(swingRef);

  return animateBall(ball, start, { x: contact.x, y: contact.y, r: 5 }, 380)
    .then(() => {
      if (spec.swing && mode === "bat" && (swingRef.fg || swingRef.bat)) {
        swingBat(swingRef);
      }
      playResultSfx(event.type);
      showLabel(labelHost, t("event." + event.type), spec.accent);
      return animateBall(ball, { x: contact.x, y: contact.y, r: 5 }, final, 700);
    })
    .then(() => {
      if (spec.firework) {
        spawnFireworks(fxHost ?? svg);
        return waitMs(900);
      }
      return waitMs(220);
    })
    .then(() => {
      ball.style.opacity = "0";
      hideLabel(labelHost);
    });
}

function showPreparationOverlay(container, mode) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute; inset:0; z-index:10; background:rgba(10, 15, 26, 0.88); backdrop-filter:blur(2px); display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; color:#ffffff; font-family:sans-serif; text-align:center; padding:16px; box-sizing:border-box;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:15px; font-weight:700; color:var(--accent); letter-spacing:0.5px; margin-bottom:2px;";
    title.textContent = mode === "bat" ? t("weekly.startBattingNotice") : t("weekly.startPitchingNotice");

    const desc = document.createElement("div");
    desc.style.cssText = "font-size:11px; color:var(--muted); max-width:240px; line-height:1.5; margin-bottom:8px;";
    desc.textContent = mode === "bat" 
      ? t("weekly.startBattingDesc")
      : t("weekly.startPitchingDesc");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t("weekly.confirmBtn");
    btn.style.cssText = "padding:6px 20px; font-size:12px; font-weight:700; border-radius:4px; cursor:pointer; background:var(--accent-2); color:#000000; border:none;";
    btn.classList.add("primary");
    
    btn.addEventListener("click", () => {
      sfx("click");
      overlay.remove();
      resolve();
    });

    overlay.appendChild(title);
    overlay.appendChild(desc);
    overlay.appendChild(btn);
    container.appendChild(overlay);
  });
}

function playPitchSequenceManual({ svg, fxHost, ball, labelHost, swingRef, event, mode }) {
  isInteractiveActive = true;

  const container = svg.parentElement;
  return showPreparationOverlay(container, mode).then(() => {
    const start = { x: 160, y: 58, r: 3 };
    ball.style.opacity = "1";
    ball.setAttribute("cx", start.x.toString());
    ball.setAttribute("cy", start.y.toString());
    ball.setAttribute("r", start.r.toString());

    if (mode === "bat") {
      // ────────────── 타자 모드 (직접 타격 조작) ──────────────
      const duration = 900; // 수동 조작용 여유 속도 (0.9초)
      showLabel(labelHost, t("homerunDerby.swingBtn") || "SWING!", "var(--accent)");

      sfx("pitch");
      const pitchStartTime = Date.now();
      let swingTriggered = false;
      let clickTime = 0;

      // 타격 애니메이션 루프 (수동 구동)
      const activeFrame = () => {
        if (!isInteractiveActive || swingTriggered) return;
        const elapsed = Date.now() - pitchStartTime;
        const p = Math.min(1.0, elapsed / duration);
        const cy = start.y + (195 - start.y) * p;
        const r = start.r + (15 - start.r) * p;
        ball.setAttribute("cy", cy.toFixed(1));
        ball.setAttribute("r", r.toFixed(1));
        if (p < 1.0) {
          requestAnimationFrame(activeFrame);
        }
      };
      requestAnimationFrame(activeFrame);

      return new Promise(resolve => {
        const onSwing = (e) => {
          if (swingTriggered) return;
          swingTriggered = true;
          clickTime = Date.now();
          svg.removeEventListener("click", onSwing);

          const elapsed = clickTime - pitchStartTime;
          const p = elapsed / duration;

          // 능력치 반영 타이밍 윈도우 계산
          const contactStat = state.player?.contact ?? 50;
          const powerStat = state.player?.power ?? 50;
          const perfectWin = 0.05 + (contactStat - 50) * 0.0003;
          const goodWin = 0.14 + (contactStat - 50) * 0.0006;

          let finalResult = "K";
          let feedbackText = t("homerunDerby.miss") || "MISS!";
          let feedbackColor = "var(--bad)";

          if (Math.abs(p - 0.82) <= perfectWin / 2) {
            finalResult = Math.random() < (powerStat / 140) ? "HR" : "3B";
            feedbackText = t("homerunDerby.perfect") || "PERFECT!";
            feedbackColor = "var(--accent-2)";
          } else if (Math.abs(p - 0.82) <= goodWin / 2) {
            finalResult = Math.random() < 0.5 ? "1B" : "2B";
            feedbackText = t("homerunDerby.good") || "GOOD!";
            feedbackColor = "var(--accent)";
          } else if (p >= 0.58 && p <= 1.04) {
            finalResult = "OUT";
            feedbackText = p < 0.82 ? (t("homerunDerby.early") || "EARLY") : (t("homerunDerby.late") || "LATE");
            feedbackColor = "var(--warn)";
          } else {
            finalResult = "K";
            feedbackText = t("homerunDerby.miss") || "MISS!";
            feedbackColor = "var(--bad)";
          }

          updateEventResult(event, finalResult);
          hideLabel(labelHost);
          showLabel(labelHost, feedbackText, feedbackColor);

          // 스윙 기동
          if (swingRef.fg) {
            swingRef.fg.style.transition = "transform 140ms ease-out";
            swingRef.fg.style.transform = fgBaseTransform(swingRef) + " rotate(-85deg)";
          } else if (swingRef.bat) {
            swingRef.bat.setAttribute("transform", "rotate(90 14 -32)");
          }

          playResultSfx(finalResult);
          const spec = PLAYBOOK[finalResult] ?? PLAYBOOK.OUT;
          const { contact, final } = pickEndPoint(spec);

          animateBall(ball, { x: 160, y: parseFloat(ball.getAttribute("cy")), r: parseFloat(ball.getAttribute("r")) }, final, 700)
            .then(() => {
              if (spec.firework) {
                spawnFireworks(fxHost ?? svg);
                return waitMs(900);
              }
              return waitMs(220);
            })
            .then(() => {
              ball.style.opacity = "0";
              hideLabel(labelHost);
              isInteractiveActive = false;
              resolve();
            });
        };

        svg.addEventListener("click", onSwing);

        // 미타격 스트라이크 타임아웃
        setTimeout(() => {
          if (swingTriggered) return;
          swingTriggered = true;
          svg.removeEventListener("click", onSwing);

          updateEventResult(event, "K");
          hideLabel(labelHost);
          showLabel(labelHost, t("homerunDerby.miss") || "MISS!", "var(--bad)");
          sfx("strikeout");

          waitMs(800).then(() => {
            ball.style.opacity = "0";
            hideLabel(labelHost);
            isInteractiveActive = false;
            resolve();
          });
        }, duration * 1.12);
      });

    } else {
      // ────────────── 투수 모드 (직접 타이밍 투구 조작) ──────────────
      const duration = 1000;
      
      // 타이밍 링 생성 및 오버레이 렌더
      const ring = svgEl("circle", {
        cx: 160, cy: ZONE.y + ZONE.h / 2, r: 60, fill: "none",
        stroke: "var(--accent-2)", "stroke-width": 3, opacity: 0.8,
        style: "transition: r 1000ms linear;"
      });
      svg.appendChild(ring);
      
      showLabel(labelHost, "RELEASE!", "var(--accent)");

      const pitchStartTime = Date.now();
      let releaseTriggered = false;
      let clickTime = 0;

      // 링 크기 축소 애니메이션 프레임
      const ringFrame = () => {
        if (!isInteractiveActive || releaseTriggered) return;
        const elapsed = Date.now() - pitchStartTime;
        const p = Math.min(1.0, elapsed / duration);
        const r = 60 - (60 - 15) * p;
        ring.setAttribute("r", r.toFixed(1));
        if (p < 1.0) {
          requestAnimationFrame(ringFrame);
        }
      };
      requestAnimationFrame(ringFrame);

      return new Promise(resolve => {
        const onRelease = () => {
          if (releaseTriggered) return;
          releaseTriggered = true;
          clickTime = Date.now();
          svg.removeEventListener("click", onRelease);
          ring.remove();

          const elapsed = clickTime - pitchStartTime;
          const p = elapsed / duration;

          const controlStat = state.player?.control ?? 50;
          const perfectWin = 0.05 + (controlStat - 50) * 0.0003;
          const groupWin = 0.14 + (controlStat - 50) * 0.0006;

          let finalResult = "1B";
          let feedbackText = "MEATBALL!";
          let feedbackColor = "var(--bad)";

          if (Math.abs(p - 0.82) <= perfectWin / 2) {
            finalResult = Math.random() < 0.65 ? "K" : "OUT";
            feedbackText = "PERFECT PITCH!";
            feedbackColor = "var(--accent-2)";
            sfx("good");
          } else if (Math.abs(p - 0.82) <= groupWin / 2) {
            finalResult = Math.random() < 0.65 ? "OUT" : "1B";
            feedbackText = "GOOD PITCH!";
            feedbackColor = "var(--accent)";
          } else if (p >= 0.58 && p <= 1.04) {
            finalResult = Math.random() < 0.5 ? "1B" : "2B";
            feedbackText = p < 0.82 ? "EARLY RELEASE!" : "LATE RELEASE!";
            feedbackColor = "var(--warn)";
          } else {
            finalResult = Math.random() < 0.4 ? "HR" : "1B";
            feedbackText = "MEATBALL!";
            feedbackColor = "var(--bad)";
          }

          updateEventResult(event, finalResult);
          hideLabel(labelHost);
          showLabel(labelHost, feedbackText, feedbackColor);

          // 투구 시작
          sfx("pitch");
          if (swingRef.fg) throwPush(swingRef);

          const spec = PLAYBOOK[finalResult] ?? PLAYBOOK.OUT;
          const { contact, final } = pickEndPoint(spec);

          animateBall(ball, start, { x: contact.x, y: contact.y, r: 5 }, 380)
            .then(() => {
              if (spec.swing && (swingRef.fg || swingRef.bat)) {
                swingBat(swingRef);
              }
              playResultSfx(finalResult);
              return animateBall(ball, { x: contact.x, y: contact.y, r: 5 }, final, 700);
            })
            .then(() => {
              if (spec.firework) {
                spawnFireworks(fxHost ?? svg);
                return waitMs(900);
              }
              return waitMs(220);
            })
            .then(() => {
              ball.style.opacity = "0";
              hideLabel(labelHost);
              isInteractiveActive = false;
              resolve();
            });
        };

        svg.addEventListener("click", onRelease);

        // 미조작 시 자동 실투
        setTimeout(() => {
          if (releaseTriggered) return;
          releaseTriggered = true;
          svg.removeEventListener("click", onRelease);
          ring.remove();

          const finalResult = Math.random() < 0.4 ? "HR" : "1B";
          updateEventResult(event, finalResult);
          hideLabel(labelHost);
          showLabel(labelHost, "MEATBALL!", "var(--bad)");

          sfx("pitch");
          if (swingRef.fg) throwPush(swingRef);

          const spec = PLAYBOOK[finalResult] ?? PLAYBOOK.OUT;
          const { contact, final } = pickEndPoint(spec);

          animateBall(ball, start, { x: contact.x, y: contact.y, r: 5 }, 380)
            .then(() => {
              if (spec.swing && (swingRef.fg || swingRef.bat)) {
                swingBat(swingRef);
              }
              playResultSfx(finalResult);
              return animateBall(ball, { x: contact.x, y: contact.y, r: 5 }, final, 700);
            })
            .then(() => {
              if (spec.firework) {
                spawnFireworks(fxHost ?? svg);
                return waitMs(900);
              }
              return waitMs(220);
            })
            .then(() => {
              ball.style.opacity = "0";
              hideLabel(labelHost);
              isInteractiveActive = false;
              resolve();
            });
        }, duration * 1.1);
      });
    }
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
    // t 자체에 speedMult 역수를 곱해 폭죽 전체 진행을 가속 (위치+불투명도 동기)
    const t = ((now - t0) / 1000) / speedMult();
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
  const dur = duration * speedMult();
  return new Promise(resolve => {
    const t0 = performance.now();
    const fromR = from.r ?? +ball.getAttribute("r");
    const toR = to.r ?? fromR;
    const fromOp = +ball.style.opacity || 1;
    const toOp = to.opacity ?? 1;
    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
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

// 전경 이미지(있으면) CSS 회전 스윙, 아니면 기존 SVG 방망이 rect 회전.
function swingBat(ref) {
  if (ref && ref.fg) { swingFgImage(ref); return; }
  const bat = ref && ref.bat ? ref.bat : ref;   // 하위호환: rect 직접 전달도 허용
  if (!bat || !bat.setAttribute) return;
  swingSvgBat(bat);
}

// 전경 방망이 이미지 — 손(하단)을 축으로 빠르게 회전했다 복귀(임팩트 잼).
function swingFgImage(ref) {
  const el = ref.fg;
  const base = fgBaseTransform(ref);
  const m = speedMult();
  el.style.transition = `transform ${Math.round(70 * m)}ms ease-in`;
  el.style.transform = `${base} rotate(30deg)`;
  setTimeout(() => {
    el.style.transition = `transform ${Math.round(170 * m)}ms ease-out`;
    el.style.transform = `${base} rotate(0deg)`;
  }, Math.round(80 * m));
}

// 투구 전경 팔 — 릴리스 순간 앞으로 살짝 밀었다 복귀.
function throwPush(ref) {
  const el = ref.fg;
  const base = fgBaseTransform(ref);
  const m = speedMult();
  el.style.transition = `transform ${Math.round(90 * m)}ms ease-out`;
  el.style.transform = `${base} translateY(6px) scale(1.04)`;
  setTimeout(() => {
    el.style.transition = `transform ${Math.round(200 * m)}ms ease-in`;
    el.style.transform = base;
  }, Math.round(100 * m));
}

function swingSvgBat(bat) {
  // 짧은 회전 애니메이션 (rotate 20 → -60 → 20). 속도 배율 적용.
  const baseTransform = "rotate({deg} 14 -32)";
  const start = 20, mid = -70, end = 20;
  const mult = speedMult();
  const dur1 = 120 * mult, dur2 = 180 * mult;
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

// state.tickSpeed (1x=500ms) 에 비례 — 4x면 0.25배. waitMs/animateBall/swingBat/폭죽 공통.
function speedMult() {
  if (isInteractiveActive) return 1.0;
  return (state.tickSpeed ?? 500) / 500;
}

function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms * speedMult()));
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
