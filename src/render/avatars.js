// 얼굴 아바타 6종 — SVG로 그림
import { svg, svgEl, group } from "./svg.js";

// 각 face의 정의: 머리색, 머리 스타일, 액세서리(헬멧/모자/안경), 표정
export const FACES = [
  { id: "f1", label: "스포츠컷",   skin: "#ecc7a1", hair: "#1a1a1a", style: "short",  accessory: null,    eye: "calm"   },
  { id: "f2", label: "헬멧",       skin: "#e6b889", hair: "#2a1a0f", style: "helmet", accessory: "helmet", eye: "sharp" },
  { id: "f3", label: "곱슬",       skin: "#f0c89b", hair: "#3a2517", style: "curly",  accessory: null,    eye: "smile"  },
  { id: "f4", label: "캡모자",     skin: "#e3b07a", hair: "#1a1a1a", style: "short",  accessory: "cap",   eye: "cool"   },
  { id: "f5", label: "안경",       skin: "#eccfa9", hair: "#222",    style: "neat",   accessory: "glasses", eye: "calm" },
  { id: "f6", label: "장발",       skin: "#e7bc8a", hair: "#5a3a1d", style: "long",   accessory: null,    eye: "fierce" },
];

export function getFace(id) {
  return FACES.find(f => f.id === id) ?? FACES[0];
}

// faceId → SVG element (viewBox 0 0 100 100 기준)
export function createFaceSVG(faceId, size = 80) {
  const face = getFace(faceId);
  const root = svg(size, size, "0 0 100 100");
  root.appendChild(svgEl("rect", { x: 0, y: 0, width: 100, height: 100, fill: "transparent" }));
  drawFace(root, face);
  return root;
}

// 캐릭터 몸에 합성할 때 호출 — group 반환
export function createFaceGroup(faceId) {
  const face = getFace(faceId);
  const g = group([]);
  drawFace(g, face);
  return g;
}

function drawFace(parent, face) {
  // 머리 뒷부분 (머리카락) — 액세서리가 헬멧이면 생략
  if (face.accessory !== "helmet") {
    parent.appendChild(svgEl("ellipse", {
      cx: 50, cy: 42, rx: 32, ry: 32, fill: face.hair,
    }));
  }
  // 얼굴 (피부)
  parent.appendChild(svgEl("ellipse", {
    cx: 50, cy: 52, rx: 24, ry: 28, fill: face.skin,
  }));
  // 귀
  parent.appendChild(svgEl("ellipse", { cx: 25, cy: 54, rx: 4, ry: 6, fill: face.skin }));
  parent.appendChild(svgEl("ellipse", { cx: 75, cy: 54, rx: 4, ry: 6, fill: face.skin }));

  // 머리 앞부분 (스타일별)
  drawHairFront(parent, face);

  // 액세서리
  if (face.accessory === "helmet") drawHelmet(parent);
  else if (face.accessory === "cap") drawCap(parent, face.hair);

  // 눈
  drawEyes(parent, face);

  // 코
  parent.appendChild(svgEl("path", {
    d: "M 50 56 L 47 64 L 53 64 Z",
    fill: "rgba(0,0,0,0.15)",
  }));

  // 입
  drawMouth(parent, face);

  // 안경
  if (face.accessory === "glasses") drawGlasses(parent);
}

function drawHairFront(parent, face) {
  if (face.accessory === "helmet") return;
  const c = face.hair;
  if (face.style === "short") {
    parent.appendChild(svgEl("path", {
      d: "M 25 38 Q 50 18 75 38 Q 70 30 50 28 Q 30 30 25 38 Z",
      fill: c,
    }));
  } else if (face.style === "curly") {
    for (let i = 0; i < 6; i++) {
      parent.appendChild(svgEl("circle", {
        cx: 25 + i * 10, cy: 32 + (i % 2 === 0 ? 0 : 4), r: 7, fill: c,
      }));
    }
  } else if (face.style === "neat") {
    parent.appendChild(svgEl("path", {
      d: "M 24 40 Q 40 24 56 32 Q 60 26 76 38 L 76 44 Q 50 30 24 44 Z",
      fill: c,
    }));
  } else if (face.style === "long") {
    parent.appendChild(svgEl("path", {
      d: "M 22 38 Q 50 16 78 38 L 78 70 Q 70 56 50 60 Q 30 56 22 70 Z",
      fill: c,
    }));
  }
}

function drawHelmet(parent) {
  parent.appendChild(svgEl("path", {
    d: "M 18 50 Q 18 22 50 22 Q 82 22 82 50 L 82 54 L 18 54 Z",
    fill: "#264a8a",
    stroke: "#13284f",
    "stroke-width": "1.5",
  }));
  // 헬멧 어택 보호대
  parent.appendChild(svgEl("path", {
    d: "M 18 50 Q 18 56 26 60 L 32 64 L 32 56 Z",
    fill: "#264a8a",
  }));
  // 로고
  parent.appendChild(svgEl("circle", { cx: 50, cy: 36, r: 6, fill: "#ffb84e" }));
}

function drawCap(parent, accentColor) {
  parent.appendChild(svgEl("path", {
    d: "M 22 42 Q 22 26 50 26 Q 78 26 78 42 L 78 46 L 22 46 Z",
    fill: "#b03030",
  }));
  // 챙
  parent.appendChild(svgEl("path", {
    d: "M 16 46 L 56 46 L 50 50 L 22 50 Z",
    fill: "#7a1f1f",
  }));
}

function drawEyes(parent, face) {
  const eyeY = 58;
  if (face.eye === "sharp") {
    parent.appendChild(svgEl("path", { d: `M 38 ${eyeY} L 46 ${eyeY - 1} L 42 ${eyeY + 2} Z`, fill: "#0e1116" }));
    parent.appendChild(svgEl("path", { d: `M 54 ${eyeY - 1} L 62 ${eyeY} L 58 ${eyeY + 2} Z`, fill: "#0e1116" }));
  } else if (face.eye === "smile") {
    parent.appendChild(svgEl("path", { d: `M 38 ${eyeY} Q 42 ${eyeY - 3} 46 ${eyeY}`, stroke: "#0e1116", "stroke-width": "2", fill: "none" }));
    parent.appendChild(svgEl("path", { d: `M 54 ${eyeY} Q 58 ${eyeY - 3} 62 ${eyeY}`, stroke: "#0e1116", "stroke-width": "2", fill: "none" }));
  } else if (face.eye === "cool") {
    parent.appendChild(svgEl("rect", { x: 38, y: eyeY - 1, width: 8, height: 2, fill: "#0e1116" }));
    parent.appendChild(svgEl("rect", { x: 54, y: eyeY - 1, width: 8, height: 2, fill: "#0e1116" }));
  } else if (face.eye === "fierce") {
    parent.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 1.8, fill: "#0e1116" }));
    parent.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 1.8, fill: "#0e1116" }));
    // 눈썹
    parent.appendChild(svgEl("rect", { x: 36, y: eyeY - 5, width: 10, height: 2, fill: "#0e1116", transform: `rotate(-10 41 ${eyeY - 4})` }));
    parent.appendChild(svgEl("rect", { x: 54, y: eyeY - 5, width: 10, height: 2, fill: "#0e1116", transform: `rotate(10 59 ${eyeY - 4})` }));
  } else {
    // calm
    parent.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 1.6, fill: "#0e1116" }));
    parent.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 1.6, fill: "#0e1116" }));
  }
}

function drawMouth(parent, face) {
  if (face.eye === "smile") {
    parent.appendChild(svgEl("path", { d: "M 44 72 Q 50 78 56 72", stroke: "#0e1116", "stroke-width": "1.8", fill: "none" }));
  } else if (face.eye === "fierce") {
    parent.appendChild(svgEl("rect", { x: 44, y: 72, width: 12, height: 1.8, fill: "#0e1116" }));
  } else {
    parent.appendChild(svgEl("path", { d: "M 45 72 Q 50 74 55 72", stroke: "#0e1116", "stroke-width": "1.5", fill: "none" }));
  }
}

function drawGlasses(parent) {
  const y = 58;
  parent.appendChild(svgEl("circle", { cx: 42, cy: y, r: 6, fill: "none", stroke: "#222", "stroke-width": "1.6" }));
  parent.appendChild(svgEl("circle", { cx: 58, cy: y, r: 6, fill: "none", stroke: "#222", "stroke-width": "1.6" }));
  parent.appendChild(svgEl("line", { x1: 48, y1: y, x2: 52, y2: y, stroke: "#222", "stroke-width": "1.4" }));
}
