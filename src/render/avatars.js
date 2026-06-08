// 얼굴 아바타 6종 — SVG로 그림 (원펀맨/카툰 일러스트 풍으로 업그레이드)
import { svg, svgEl, group } from "./svg.js";

// 각 face의 정의: 머리색, 머리 스타일, 액세서리(헬멧/모자/안경), 표정
export const FACES = [
  { id: "f1", label: "스포츠컷",   skin: "#ecc7a1", hair: "#1a1a1a", style: "short",  accessory: null,    eye: "calm"   },
  { id: "f2", label: "헬멧",       skin: "#e6b889", hair: "#2a1a0f", style: "helmet", accessory: "helmet", eye: "sharp" },
  { id: "f3", label: "곱슬",       skin: "#f0c89b", hair: "#3a2517", style: "curly",  accessory: null,    eye: "smile"  },
  { id: "f4", label: "캡모자",     skin: "#e3b07a", hair: "#1a1a1a", style: "short",  accessory: "cap",   eye: "cool"   },
];

export const SKIN_COLORS = ["#ecc7a1", "#e6b889", "#f0c89b", "#e3b07a", "#eccfa9"];
export const HAIR_COLORS = ["#1a1a1a", "#2a1a0f", "#5a3a1d", "#b03030", "#d8a040"];
export const HAIR_STYLES = ["short", "curly", "neat", "spiky", "bald"]; // long 제거 (bald는 렌더링 생략)
export const ACCESSORIES = ["none", "cap", "helmet", "scar", "blush"]; // glasses 제거 (none은 렌더링 생략)
export const EYES = ["calm", "sharp", "smile", "cool", "fierce"]; // 5종으로 축소
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

// faceId → element (viewBox 0 0 100 100 기준 또는 크롭된 일러스트 이미지)
export function createFaceSVG(faceId, size = 80) {
  const isCustomFace = faceId && faceId.startsWith("f_");
  if (!isCustomFace) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `width:${size}px; height:${size}px; border-radius:50%; overflow:hidden; display:flex; justify-content:center; align-items:center; background:var(--panel-2); flex-shrink:0;`;
    
    const img = document.createElement("img");
    img.src = `assets/img/char-bat-${faceId.toLowerCase()}.webp`;
    img.style.cssText = "width:100%; height:100%; object-fit:cover; object-position:50% 12%; transform:scale(2.2); pointer-events:none;";
    wrap.appendChild(img);
    return wrap;
  }

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
  // 1. 머리 뒷부분 (머리카락 뒷머리)
  if (face.accessory !== "helmet" && face.style !== "bald") {
    // 기본 뒷머리
    parent.appendChild(svgEl("ellipse", {
      cx: 50, cy: 42, rx: 33, ry: 33, fill: face.hair,
      stroke: "#111", "stroke-width": "1.5"
    }));
    // 뒷머리 입체 음영
    parent.appendChild(svgEl("path", {
      d: "M 18 42 A 32 32 0 0 0 82 42 A 32 32 0 0 1 18 42 Z",
      fill: "rgba(0,0,0,0.18)"
    }));
  }

  // 2. 얼굴 (피부베이스 + 윤곽선)
  let facePath = null;
  if (face.shape === "square") {
    facePath = svgEl("rect", {
      x: 25, y: 24, width: 50, height: 56, rx: 10, ry: 10,
      fill: face.skin, stroke: "#111", "stroke-width": "1.8"
    });
  } else if (face.shape === "vshape") {
    facePath = svgEl("path", {
      d: "M 25 38 C 25 22, 75 22, 75 38 C 75 52, 62 76, 50 82 C 38 76, 25 52, 25 38 Z",
      fill: face.skin, stroke: "#111", "stroke-width": "1.8"
    });
  } else {
    // round (default)
    facePath = svgEl("ellipse", {
      cx: 50, cy: 52, rx: 25, ry: 29,
      fill: face.skin, stroke: "#111", "stroke-width": "1.8"
    });
  }
  parent.appendChild(facePath);

  // 얼굴 셀식 그림자 오버레이 (턱밑 쉐이딩 - 원펀맨 입체 드로잉 기법)
  if (face.shape === "square") {
    parent.appendChild(svgEl("path", {
      d: "M 26 65 L 26 73 Q 26 79 35 79 L 65 79 Q 74 79 74 73 L 74 65 Q 50 71 26 65 Z",
      fill: "rgba(0,0,0,0.08)"
    }));
  } else if (face.shape === "vshape") {
    parent.appendChild(svgEl("path", {
      d: "M 29 64 C 36 71, 44 76, 50 81 C 56 76, 64 71, 71 64 C 62 69, 38 69, 29 64 Z",
      fill: "rgba(0,0,0,0.08)"
    }));
  } else {
    parent.appendChild(svgEl("path", {
      d: "M 26 62 A 25 29 0 0 0 74 62 A 25 25 0 0 1 26 62 Z",
      fill: "rgba(0,0,0,0.08)"
    }));
  }

  // 3. 귀 (윤곽선 + 내이 음영 디테일)
  // 왼쪽 귀
  parent.appendChild(svgEl("ellipse", { cx: 23, cy: 54, rx: 4.5, ry: 6.5, fill: face.skin, stroke: "#111", "stroke-width": "1.5" }));
  parent.appendChild(svgEl("path", { d: "M 24 51 Q 22 54 24 57", stroke: "rgba(0,0,0,0.15)", "stroke-width": "1.2", fill: "none" }));
  // 오른쪽 귀
  parent.appendChild(svgEl("ellipse", { cx: 77, cy: 54, rx: 4.5, ry: 6.5, fill: face.skin, stroke: "#111", "stroke-width": "1.5" }));
  parent.appendChild(svgEl("path", { d: "M 76 51 Q 78 54 76 57", stroke: "rgba(0,0,0,0.15)", "stroke-width": "1.2", fill: "none" }));

  // 4. 머리 앞부분 (앞머리 및 헤어 스타일 입체화)
  drawHairFront(parent, face);

  // 5. 액세서리 (명암 디테일 보강)
  if (face.accessory === "helmet") drawHelmet(parent);
  else if (face.accessory === "cap") drawCap(parent, face.hair);

  // 6. 눈 (원펀맨/카툰풍 묘사)
  drawEyes(parent, face);

  // 7. 코 (카툰 코)
  parent.appendChild(svgEl("path", {
    d: "M 50 55 L 46 64 L 51 64 Z",
    fill: "rgba(0,0,0,0.15)",
  }));

  // 8. 입
  drawMouth(parent, face);

  // 9. 안경 (반짝이는 렌즈 효과)
  if (face.accessory === "glasses") drawGlasses(parent);

  // 10. 흉터 또는 볼터치
  if (face.accessory === "scar") {
    // 흉터 입체 라인
    parent.appendChild(svgEl("path", {
      d: "M 28 62 L 36 72 M 36 62 L 28 72",
      stroke: "#b03030", "stroke-width": "2.2", fill: "none", "stroke-linecap": "round"
    }));
  } else if (face.accessory === "blush") {
    parent.appendChild(svgEl("ellipse", { cx: 33, cy: 68, rx: 4, ry: 2.5, fill: "rgba(244, 63, 94, 0.45)" }));
    parent.appendChild(svgEl("ellipse", { cx: 67, cy: 68, rx: 4, ry: 2.5, fill: "rgba(244, 63, 94, 0.45)" }));
  }
}

function drawHairFront(parent, face) {
  if (face.accessory === "helmet") return;
  const c = face.hair;
  const g = group([], { stroke: "#111", "stroke-width": "1.5", "stroke-linejoin": "round" });
  
  if (face.style === "short") {
    // 짧은 스포츠컷
    g.appendChild(svgEl("path", {
      d: "M 23 38 C 24 24, 76 24, 77 38 C 70 30, 50 28, 48 30 C 46 32, 30 30, 23 38 Z",
      fill: c,
    }));
  } else if (face.style === "curly") {
    // 볼륨감 넘치는 곱슬
    for (let i = 0; i < 6; i++) {
      g.appendChild(svgEl("circle", {
        cx: 24 + i * 10.4, cy: 30 + (i % 2 === 0 ? 0 : 3), r: 8, fill: c
      }));
    }
    // 내부 디테일 라인
    g.appendChild(svgEl("path", {
      d: "M 28 34 Q 38 31 48 35 Q 58 31 68 34",
      stroke: "rgba(255,255,255,0.15)", "stroke-width": "1.5", fill: "none"
    }));
  } else if (face.style === "neat") {
    // 단정한 댄디컷
    g.appendChild(svgEl("path", {
      d: "M 23 40 Q 40 22 56 31 Q 61 24 77 38 L 77 43 Q 50 28 23 43 Z",
      fill: c,
    }));
  } else if (face.style === "long") {
    // 카툰 스타일 찰랑이는 장발
    g.appendChild(svgEl("path", {
      d: "M 21 38 Q 50 14 79 38 L 80 72 Q 72 58 50 62 Q 28 58 20 72 Z",
      fill: c,
    }));
  } else if (face.style === "spiky") {
    // 뾰족뾰족 원펀맨 사이타마(가발 썼을 때) 스타일 초사이언 헤어
    g.appendChild(svgEl("path", {
      d: "M 21 38 L 25 18 L 33 24 L 41 8 L 49 20 L 58 6 L 66 20 L 74 10 L 78 24 L 84 18 L 84 38 L 73 33 L 50 35 L 27 33 Z",
      fill: c,
    }));
  }

  // 대머리가 아닐 때, 모든 헤어에 카툰식 하이라이트(Angel Ring) 얹기
  if (face.style !== "bald") {
    parent.appendChild(g);
    // 흰색 반투명 하이라이트 선
    parent.appendChild(svgEl("path", {
      d: "M 32 28 Q 50 24 68 28",
      stroke: "rgba(255, 255, 255, 0.22)", "stroke-width": "2.2", fill: "none", "stroke-linecap": "round"
    }));
  }
}

function drawHelmet(parent) {
  // 헬멧 본체
  parent.appendChild(svgEl("path", {
    d: "M 17 50 Q 17 20 50 20 Q 83 20 83 50 L 83 54 L 17 54 Z",
    fill: "#264a8a", stroke: "#111", "stroke-width": "1.8"
  }));
  // 헬멧 빛 반사 하이라이트
  parent.appendChild(svgEl("path", {
    d: "M 24 35 Q 50 23 76 35 A 33 33 0 0 0 24 35 Z",
    fill: "rgba(255,255,255,0.12)"
  }));
  // 귀 보호대 귀퉁이
  parent.appendChild(svgEl("path", {
    d: "M 17 50 Q 17 57 25 61 L 31 65 L 31 56 Z",
    fill: "#203e75", stroke: "#111", "stroke-width": "1.5"
  }));
  // 로고 원판
  parent.appendChild(svgEl("circle", { cx: 50, cy: 34, r: 6.5, fill: "#ffb84e", stroke: "#111", "stroke-width": "1.2" }));
}

function drawCap(parent, hairColor) {
  // 모자 캡
  parent.appendChild(svgEl("path", {
    d: "M 21 42 Q 21 24 50 24 Q 79 24 79 42 L 79 46 L 21 46 Z",
    fill: "#b03030", stroke: "#111", "stroke-width": "1.8"
  }));
  // 모자 하이라이트
  parent.appendChild(svgEl("path", {
    d: "M 28 33 Q 50 26 72 33 A 28 28 0 0 0 28 33 Z",
    fill: "rgba(255,255,255,0.15)"
  }));
  // 챙
  parent.appendChild(svgEl("path", {
    d: "M 14 46 L 56 46 L 50 51 L 20 51 Z",
    fill: "#7a1f1f", stroke: "#111", "stroke-width": "1.5"
  }));
}

function drawEyes(parent, face) {
  const eyeY = 58;
  const g = group([], { fill: "#0e1116" });

  if (face.eye === "sharp") {
    g.appendChild(svgEl("path", { d: `M 37 ${eyeY} L 46 ${eyeY - 2} L 42 ${eyeY + 2.5} Z` }));
    g.appendChild(svgEl("path", { d: `M 54 ${eyeY - 2} L 63 ${eyeY} L 58 ${eyeY + 2.5} Z` }));
  } else if (face.eye === "smile") {
    g.appendChild(svgEl("path", { d: `M 37 ${eyeY} Q 42 ${eyeY - 4} 47 ${eyeY}`, stroke: "#0e1116", "stroke-width": "2.8", fill: "none", "stroke-linecap": "round" }));
    g.appendChild(svgEl("path", { d: `M 53 ${eyeY} Q 58 ${eyeY - 4} 63 ${eyeY}`, stroke: "#0e1116", "stroke-width": "2.8", fill: "none", "stroke-linecap": "round" }));
  } else if (face.eye === "cool") {
    // 쿨한 눈 (반쯤 감긴 카리스마 눈)
    g.appendChild(svgEl("rect", { x: 37, y: eyeY - 2, width: 9, height: 2.8, rx: 1 }));
    g.appendChild(svgEl("rect", { x: 54, y: eyeY - 2, width: 9, height: 2.8, rx: 1 }));
  } else if (face.eye === "fierce") {
    // 분노/도전적인 눈 (눈동자 + 화난 눈썹)
    g.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 2 }));
    g.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 2 }));
    g.appendChild(svgEl("rect", { x: 35, y: eyeY - 5, width: 11, height: 2.2, transform: `rotate(-12 40.5 ${eyeY - 4})` }));
    g.appendChild(svgEl("rect", { x: 54, y: eyeY - 5, width: 11, height: 2.2, transform: `rotate(12 59.5 ${eyeY - 4})` }));
  } else if (face.eye === "blank") {
    // 원펀맨 대머리 사이타마 특유의 "멍한 동그란 눈" (매우 귀엽고 유쾌한 비주얼)
    g.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 3.5, fill: "none", stroke: "#0e1116", "stroke-width": 1.6 }));
    g.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 1.0 }));
    g.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 3.5, fill: "none", stroke: "#0e1116", "stroke-width": 1.6 }));
    g.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 1.0 }));
  } else if (face.eye === "dizzy") {
    // 뱅글뱅글 눈
    g.appendChild(svgEl("path", { d: `M 37 ${eyeY} Q 42 ${eyeY - 5} 47 ${eyeY} Q 42 ${eyeY + 5} 37 ${eyeY} Q 42 ${eyeY - 3} 45 ${eyeY}`, stroke: "#0e1116", "stroke-width": 1.8, fill: "none" }));
    g.appendChild(svgEl("path", { d: `M 53 ${eyeY} Q 58 ${eyeY - 5} 63 ${eyeY} Q 58 ${eyeY + 5} 53 ${eyeY} Q 58 ${eyeY - 3} 61 ${eyeY}`, stroke: "#0e1116", "stroke-width": 1.8, fill: "none" }));
  } else {
    // calm (기본 동그란 순한 눈 + 눈동자 하이라이트 반점)
    g.appendChild(svgEl("circle", { cx: 42, cy: eyeY, r: 2.2 }));
    g.appendChild(svgEl("circle", { cx: 58, cy: eyeY, r: 2.2 }));
    // 눈동자 하이라이트
    g.appendChild(svgEl("circle", { cx: 41, cy: eyeY - 1, r: 0.7, fill: "#fff" }));
    g.appendChild(svgEl("circle", { cx: 57, cy: eyeY - 1, r: 0.7, fill: "#fff" }));
  }

  parent.appendChild(g);
}

function drawMouth(parent, face) {
  if (face.eye === "smile") {
    // 활짝 웃는 입
    parent.appendChild(svgEl("path", { d: "M 43 71 Q 50 78 57 71", stroke: "#0e1116", "stroke-width": "2.2", fill: "none", "stroke-linecap": "round" }));
  } else if (face.eye === "fierce") {
    // 굳게 다문 일자 입
    parent.appendChild(svgEl("rect", { x: 44, y: 72, width: 12, height: 2, rx: 0.5, fill: "#0e1116" }));
  } else if (face.eye === "blank") {
    // 멍한 입 (작은 물방울 입)
    parent.appendChild(svgEl("circle", { cx: 50, cy: 72, r: 2, fill: "none", stroke: "#0e1116", "stroke-width": "1.6" }));
  } else {
    // 일반 미소 입
    parent.appendChild(svgEl("path", { d: "M 44 71 Q 50 74 56 71", stroke: "#0e1116", "stroke-width": "1.8", fill: "none", "stroke-linecap": "round" }));
  }
}

function drawGlasses(parent) {
  const y = 58;
  const g = group([], { stroke: "#222", "stroke-width": "2.0", fill: "none" });
  
  // 반짝이는 반투명 렌즈 추가
  parent.appendChild(svgEl("circle", { cx: 42, cy: y, r: 6.5, fill: "rgba(255,255,255,0.22)", stroke: "#222", "stroke-width": "1.8" }));
  parent.appendChild(svgEl("circle", { cx: 58, cy: y, r: 6.5, fill: "rgba(255,255,255,0.22)", stroke: "#222", "stroke-width": "1.8" }));
  
  // 안경 다리 연결선
  g.appendChild(svgEl("line", { x1: 48.5, y1: y, x2: 51.5, y2: y }));
  g.appendChild(svgEl("line", { x1: 25, y1: y - 1, x2: 35.5, y2: y }));
  g.appendChild(svgEl("line", { x1: 64.5, y1: y, x2: 75, y2: y - 1 }));
  
  parent.appendChild(g);

  // 안경 렌즈 사선 하이라이트
  parent.appendChild(svgEl("line", { x1: 39, y1: y - 4, x2: 44, y2: y + 2, stroke: "#fff", "stroke-width": "1.2", "stroke-linecap": "round", opacity: 0.6 }));
  parent.appendChild(svgEl("line", { x1: 55, y1: y - 4, x2: 60, y2: y + 2, stroke: "#fff", "stroke-width": "1.2", "stroke-linecap": "round", opacity: 0.6 }));
}
