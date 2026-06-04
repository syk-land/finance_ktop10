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

export const SKIN_COLORS = ["#ecc7a1", "#e6b889", "#f0c89b", "#e3b07a", "#eccfa9"];
export const HAIR_COLORS = ["#1a1a1a", "#2a1a0f", "#5a3a1d", "#b03030", "#d8a040"];
export const HAIR_STYLES = ["short", "curly", "neat", "long", "bald", "spiky"];
export const ACCESSORIES = ["none", "cap", "glasses", "helmet", "scar", "blush"];
export const EYES = ["calm", "sharp", "smile", "cool", "fierce", "blank", "dizzy"];
export const FACE_SHAPES = ["round", "square", "vshape"];

export function getFace(id) {
  if (typeof id === "string" && id.startsWith("f_")) {
    const parts = id.split("_");
    const skinIdx = parseInt(parts[1]) ?? 0;
    const hairIdx = parseInt(parts[2]) ?? 0;
    const styleIdx = parseInt(parts[3]) ?? 0;
    const accIdx = parseInt(parts[4]) ?? 0;
    const eyeIdx = parseInt(parts[5]) ?? 0;
    const shapeIdx = parseInt(parts[6]) ?? 0;

    const skin = SKIN_COLORS[skinIdx] ?? SKIN_COLORS[0];
    const hair = HAIR_COLORS[hairIdx] ?? HAIR_COLORS[0];
    const style = HAIR_STYLES[styleIdx] ?? HAIR_STYLES[0];
    const accessory = ACCESSORIES[accIdx] ?? "none";
    const eye = EYES[eyeIdx] ?? EYES[0];
    const shape = FACE_SHAPES[shapeIdx] ?? FACE_SHAPES[0];

    return {
      id,
      skin,
      hair,
      style,
      accessory: accessory === "none" ? null : accessory,
      eye,
      shape,
    };
  }
  const found = FACES.find(f => f.id === id) ?? FACES[0];
  return { ...found, shape: "round" };
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
  // 머리 뒷부분 (머리카락) — 액세서리가 헬멧이거나 헤어가 대머리(bald)면 생략
  if (face.accessory !== "helmet" && face.style !== "bald") {
    parent.appendChild(svgEl("ellipse", {
      cx: 50, cy: 42, rx: 32, ry: 32, fill: face.hair,
    }));
  }
  // 얼굴 (피부)
  if (face.shape === "square") {
    parent.appendChild(svgEl("rect", {
      x: 26, y: 24, width: 48, height: 56, rx: 8, ry: 8, fill: face.skin
    }));
  } else if (face.shape === "vshape") {
    parent.appendChild(svgEl("path", {
      d: "M 26 38 C 26 24, 74 24, 74 38 C 74 52, 60 74, 50 80 C 40 74, 26 52, 26 38 Z",
      fill: face.skin
    }));
  } else {
    // round (default)
    parent.appendChild(svgEl("ellipse", {
      cx: 50, cy: 52, rx: 24, ry: 28, fill: face.skin,
    }));
  }
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

  // 흉터 또는 볼터치
  if (face.accessory === "scar") {
    parent.appendChild(svgEl("path", {
      d: "M 29 64 L 35 70 M 35 64 L 29 70",
      stroke: "#b03030", "stroke-width": "2", fill: "none"
    }));
  } else if (face.accessory === "blush") {
    parent.appendChild(svgEl("ellipse", { cx: 33, cy: 68, rx: 3.5, ry: 2, fill: "rgba(244, 63, 94, 0.45)" }));
    parent.appendChild(svgEl("ellipse", { cx: 67, cy: 68, rx: 3.5, ry: 2, fill: "rgba(244, 63, 94, 0.45)" }));
  }
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
  } else if (face.style === "spiky") {
    parent.appendChild(svgEl("path", {
      d: "M 22 38 L 26 20 L 34 26 L 42 12 L 50 22 L 58 10 L 66 22 L 74 12 L 78 26 L 84 20 L 84 38 L 74 34 L 50 36 L 26 34 Z",
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
  } else if (face.eye === "blank") {
    parent.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 2.8, fill: "none", stroke: "#0e1116", "stroke-width": 1.2 }));
    parent.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 0.8, fill: "#0e1116" }));
    parent.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 2.8, fill: "none", stroke: "#0e1116", "stroke-width": 1.2 }));
    parent.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 0.8, fill: "#0e1116" }));
  } else if (face.eye === "dizzy") {
    parent.appendChild(svgEl("path", { d: `M 38 ${eyeY} Q 42 ${eyeY - 4} 46 ${eyeY} Q 42 ${eyeY + 4} 38 ${eyeY} Q 42 ${eyeY - 2} 44 ${eyeY}`, stroke: "#0e1116", "stroke-width": 1.5, fill: "none" }));
    parent.appendChild(svgEl("path", { d: `M 54 ${eyeY} Q 58 ${eyeY - 4} 62 ${eyeY} Q 58 ${eyeY + 4} 54 ${eyeY} Q 58 ${eyeY - 2} 60 ${eyeY}`, stroke: "#0e1116", "stroke-width": 1.5, fill: "none" }));
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
