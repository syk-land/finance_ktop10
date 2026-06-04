// 3등신 캐릭터 (배팅 자세) — 손잡이별 자세 변경
import { svg, svgEl, group } from "./svg.js";
import { createFaceGroup } from "./avatars.js";

// hand: "right" (우투우타) | "left" (좌투좌타) | "mixed" (우투좌타)
// 표기 규칙:
//   우투우타: 오른손 배트, 오른쪽 타석 → 캐릭터는 화면 오른쪽으로 자세
//   좌투좌타: 왼쪽 타석 → 화면 왼쪽으로 자세 (mirror)
//   우투좌타: 좌타 자세지만 글러브가 오른손 (배지로 표시)
export function createCharacterSVG(faceId, hand = "right", size = { w: 180, h: 240 }, talent = "all_round") {
  const root = svg(size.w, size.h, "0 0 180 240");

  // 배경 (홈플레이트 느낌)
  root.appendChild(svgEl("ellipse", {
    cx: 90, cy: 226, rx: 60, ry: 8,
    fill: "rgba(255,255,255,0.05)",
  }));
  // 흙
  root.appendChild(svgEl("rect", {
    x: 0, y: 220, width: 180, height: 20,
    fill: "url(#dirtGrad)",
  }));

  // 그래디언트
  const defs = svgEl("defs", {}, []);
  const grad = svgEl("linearGradient", { id: "dirtGrad", x1: "0%", y1: "0%", x2: "0%", y2: "100%" });
  grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "rgba(120,80,40,0.0)" }));
  grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "rgba(120,80,40,0.25)" }));
  defs.appendChild(grad);
  root.appendChild(defs);

  const charGroup = drawCharacterBody(faceId, hand, talent);
  root.appendChild(charGroup);

  // 손잡이 라벨
  const label = svgEl("text", {
    x: 90, y: 22,
    "text-anchor": "middle",
    fill: "#8b949e",
    "font-size": "13",
    "font-family": "monospace",
  });
  label.textContent = handLabel(hand);
  root.appendChild(label);

  return root;
}

function handLabel(hand) {
  if (hand === "right") return "우투우타";
  if (hand === "left") return "좌투좌타";
  if (hand === "mixed") return "우투좌타";
  if (hand === "lefty_rb") return "좌투우타";
  return hand;
}

function drawCharacterBody(faceId, hand, talent = "all_round") {
  // 좌타 = 화면 기준 mirror (캐릭터 머리/몸은 그대로지만 배트 위치/자세 좌우 반전)
  const battingLeft = hand === "left" || hand === "mixed";
  const g = group([], { transform: `translate(90 30)` });

  // 재능타입에 따른 체형 수치 분기 (기본값 = all_round)
  let shW = 28;     // shoulder half-width
  let waistW = 26;  // waist half-width
  let legW = 22;    // outer leg half-width
  
  if (talent === "power") {
    // 벌크업 체형 (우람한 파워형)
    shW = 34;
    waistW = 31;
    legW = 27;
  } else if (talent === "speedster" || talent === "finesse" || talent === "breakerz") {
    // 슬림하고 날렵한 체형
    shW = 23;
    waistW = 21;
    legW = 18;
  }

  // 머리 (얼굴) — 0,0 기준으로 위치
  const head = group([], { transform: "translate(-22 0) scale(0.44)" });
  // createFaceGroup은 0~100 좌표계, scale 0.44로 ~44px
  head.appendChild(createFaceGroup(faceId));
  g.appendChild(head);

  // 목
  g.appendChild(svgEl("rect", {
    x: -4, y: 44, width: 8, height: 8, fill: "#e6b889", rx: 2,
  }));

  // 유니폼 (몸통)
  const bodyColor = "#e8edf3";
  const bodyAccent = "#4ea4ff";
  g.appendChild(svgEl("path", {
    // 어깨 ~ 허리 사다리꼴
    d: `M -${shW} 52 Q -${shW} 48 -${waistW} 48 L ${waistW} 48 Q ${shW} 48 ${shW} 52 L ${waistW} 110 L -${waistW} 110 Z`,
    fill: bodyColor,
    stroke: "#bcc5d1",
    "stroke-width": "1.2",
  }));
  // 등번호
  const num = svgEl("text", {
    x: 0, y: 90,
    "text-anchor": "middle",
    fill: bodyAccent,
    "font-size": "26",
    "font-weight": "bold",
    "font-family": "system-ui, sans-serif",
  });
  num.textContent = "1";
  g.appendChild(num);

  // 벨트
  g.appendChild(svgEl("rect", {
    x: -waistW, y: 108, width: waistW * 2, height: 6, fill: "#1a1a1a",
  }));

  // 바지
  g.appendChild(svgEl("path", {
    d: `M -${waistW-2} 114 L -${legW} 168 L -6 168 L -4 130 L 4 130 L 6 168 L ${legW} 168 L ${waistW-2} 114 Z`,
    fill: "#bfc5d0",
  }));

  // 신발/스파이크 (체형 너비 연동)
  const footX = Math.round(legW * 0.65);
  g.appendChild(svgEl("ellipse", { cx: -footX, cy: 174, rx: 11, ry: 5, fill: "#1a1a1a" }));
  g.appendChild(svgEl("ellipse", { cx: footX, cy: 174, rx: 11, ry: 5, fill: "#1a1a1a" }));

  // 팔 + 배트 자세
  // 기본: 우타 자세 (오른쪽에 배트, 양손이 어깨 위)
  // 어깨 너비(shW) 변화에 따라 팔 위치 가로 오프셋 이동
  const dx = shW - 28;
  const armsTransform = battingLeft 
    ? `scale(-1 1) translate(${dx} 0)` 
    : `translate(${dx} 0)`;
  const armsG = group([], { transform: armsTransform });

  // 뒷팔 (어깨에서 살짝 뒤로)
  armsG.appendChild(svgEl("path", {
    d: "M 22 56 L 38 50 L 44 70 L 30 76 Z",
    fill: "#e6b889",
    stroke: "#c89866",
    "stroke-width": "0.8",
  }));
  // 앞팔
  armsG.appendChild(svgEl("path", {
    d: "M -18 56 L -10 70 L 4 82 L 14 76 L 12 64 L 0 58 Z",
    fill: "#e6b889",
    stroke: "#c89866",
    "stroke-width": "0.8",
  }));

  // 배트 (오른쪽 어깨 뒤에서 위로 올라감)
  armsG.appendChild(svgEl("line", {
    x1: 38, y1: 56,
    x2: 78, y2: -2,
    stroke: "#8a5a2a",
    "stroke-width": "5",
    "stroke-linecap": "round",
  }));
  // 배트 끝 굵게
  armsG.appendChild(svgEl("circle", { cx: 78, cy: -2, r: 5, fill: "#8a5a2a" }));
  // 그립
  armsG.appendChild(svgEl("rect", {
    x: 30, y: 50, width: 12, height: 6,
    fill: "#3a2517",
    transform: "rotate(-30 36 53)",
  }));

  g.appendChild(armsG);

  // 글러브 배지 (투타 손이 다를 때 — 던지는 손을 표시)
  // 우투좌타: 좌타 자세 + R 글러브 배지 → 좌측에 배지 (좌타 자세 mirror 했으므로 화면 오른쪽)
  // 좌투우타: 우타 자세 + L 글러브 배지 → 화면 왼쪽
  if (hand === "mixed" || hand === "lefty_rb") {
    const throwHand = hand === "mixed" ? "R" : "L";
    const badgeX = hand === "mixed" ? 36 : -36;
    const badge = group([], { transform: `translate(${badgeX} 130)` });
    badge.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 13, fill: "#3a2517", stroke: "#5a3a1d", "stroke-width": "1.5" }));
    const txt = svgEl("text", {
      x: 0, y: 4, "text-anchor": "middle",
      fill: "#e8edf3", "font-size": "10", "font-weight": "bold",
    });
    txt.textContent = throwHand;
    badge.appendChild(txt);
    g.appendChild(badge);
  }

  return g;
}
