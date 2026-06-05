// 3등신 캐릭터 (배팅 자세) — 카툰 일러스트 하이브리드 오버레이 아바타 시스템
import { svg, svgEl, group } from "./svg.js";
import { createFaceGroup, getFace } from "./avatars.js";
import { IMAGES } from "../assets/manifest.js";

function mapCustomToPreset(faceId) {
  if (!faceId) return "f1";
  if (!faceId.startsWith("f_")) return faceId;
  const parts = faceId.split("_");
  const hairStyleIdx = parseInt(parts[3]) || 0; // hairStyle
  const accIdx = parseInt(parts[4]) || 0;       // accessory

  // ACCESSORIES = ["none", "cap", "glasses", "helmet", "scar", "blush"]
  // HAIR_STYLES = ["short", "curly", "neat", "long", "bald", "spiky"]
  if (accIdx === 3) return "f2"; // helmet -> f2
  if (accIdx === 1) return "f4"; // cap -> f4
  if (accIdx === 2) return "f5"; // glasses -> f5
  if (hairStyleIdx === 1) return "f3"; // curly -> f3
  if (hairStyleIdx === 3) return "f6"; // long -> f6
  return "f1"; // default -> f1
}

// hand: "right" (우투우타) | "left" (좌투좌타) | "mixed" (우투좌타)
export function createCharacterSVG(faceId, hand = "right", size = { w: 180, h: 240 }, talent = "all_round", equipment = { bat: 0, glove: 0, cleats: 0 }) {
  const root = svg(size.w, size.h, "0 0 180 240");

  // 배경 (홈플레이트 느낌)
  root.appendChild(svgEl("ellipse", {
    cx: 90, cy: 226, rx: 60, ry: 8,
    fill: "rgba(255,255,255,0.06)",
  }));
  // 흙
  root.appendChild(svgEl("rect", {
    x: 0, y: 220, width: 180, height: 20,
    fill: "url(#dirtGrad)",
  }));

  // 그래디언트 정의
  const defs = svgEl("defs", {}, []);
  
  // 흙바닥 그래디언트
  const grad = svgEl("linearGradient", { id: "dirtGrad", x1: "0%", y1: "0%", x2: "0%", y2: "100%" });
  grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "rgba(120,80,40,0.0)" }));
  grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "rgba(120,80,40,0.3)" }));
  defs.appendChild(grad);

  // 황금 장비용 리치 금색 그라데이션
  const goldGrad = svgEl("linearGradient", { id: "goldBatGrad", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
  goldGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#ffe680" }));
  goldGrad.appendChild(svgEl("stop", { offset: "40%", "stop-color": "#fbbf24" }));
  goldGrad.appendChild(svgEl("stop", { offset: "80%", "stop-color": "#d97706" }));
  goldGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#78350f" }));
  defs.appendChild(goldGrad);

  // 나무 배트용 우드 그라데이션
  const woodGrad = svgEl("linearGradient", { id: "woodBatGrad", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
  woodGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#b48a53" }));
  woodGrad.appendChild(svgEl("stop", { offset: "70%", "stop-color": "#8a5a2a" }));
  woodGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#5c3a17" }));
  defs.appendChild(woodGrad);

  // 실버 메탈릭 그라데이션
  const silverGrad = svgEl("linearGradient", { id: "silverGrad", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
  silverGrad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#f1f5f9" }));
  silverGrad.appendChild(svgEl("stop", { offset: "50%", "stop-color": "#cbd5e1" }));
  silverGrad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#64748b" }));
  defs.appendChild(silverGrad);

  root.appendChild(defs);

  // 발 밑 그림자
  root.appendChild(svgEl("ellipse", {
    cx: 90, cy: 206, rx: 42, ry: 6,
    fill: "rgba(0,0,0,0.35)",
  }));

  // 하이브리드 모드 선택: 일러스트 에셋이 존재하면 일러스트 이미지 뼈대 + 장비/안경 레이어 오버레이
  const presetKey = mapCustomToPreset(faceId);
  const imgDef = IMAGES["charBat" + presetKey.toUpperCase()];

  if (imgDef) {
    const battingLeft = hand === "left" || hand === "mixed";
    
    // 1. 고화질 카툰 일러스트 캐릭터 뼈대 (이미지 얹기)
    const mainImg = svgEl("image", {
      href: imgDef.src,
      x: 0,
      y: 10,
      width: 180,
      height: 240,
      transform: battingLeft ? "scale(-1 1) translate(-180 0)" : "",
    });
    root.appendChild(mainImg);
    
    // 2. 그 위에 안경, 장비(배트, 장갑, 스파이크, 배지)를 덮어씌워 얹기
    const overlay = drawEquipmentOverlay(faceId, hand, talent, equipment);
    root.appendChild(overlay);
  } else {
    // 폴백 모드: 에셋이 없을 땐 기존 전체 SVG 뼈대 그리기
    const charGroup = drawCharacterBody(faceId, hand, talent, equipment);
    root.appendChild(charGroup);
  }

  // 손잡이 라벨
  const label = svgEl("text", {
    x: 90, y: 22,
    "text-anchor": "middle",
    fill: "#8b949e",
    "font-size": "13",
    "font-weight": "bold",
    "font-family": "monospace",
  });
  label.textContent = handLabel(hand);
  root.appendChild(label);

  return root;
}

// 일러스트 뼈대 위에 안경, 헬멧, 장비 등을 정확히 겹쳐 덮어씌우는 오버레이 드로잉
function drawEquipmentOverlay(faceId, hand, talent, equipment) {
  const battingLeft = hand === "left" || hand === "mixed";
  const g = group([]);
  
  const transform = battingLeft 
    ? "scale(-1 1) translate(-180 0)" 
    : "";
  const innerG = group([], { transform });

  // 1. 신발 오버레이 (cleats)
  const cleatsLvl = equipment?.cleats ?? 0;
  if (cleatsLvl > 0) {
    let footColor = "#1a1a1a";
    let footDetail = "#333";
    if (cleatsLvl === 1) {
      footColor = "#3b82f6";
      footDetail = "#1d4ed8";
    } else if (cleatsLvl === 2) {
      footColor = "#ef4444";
      footDetail = "#b91c1c";
    } else if (cleatsLvl === 3) {
      footColor = "url(#goldBatGrad)";
      footDetail = "#fbbf24";
    }
    
    // 일러스트 발 위치에 스파이크 얹기 (x: 76, y: 204 / x: 104, y: 204)
    innerG.appendChild(svgEl("ellipse", { cx: 76, cy: 204, rx: 11.5, ry: 5.5, fill: footColor, stroke: "#111", "stroke-width": "1.8" }));
    innerG.appendChild(svgEl("line", { x1: 68, y1: 206, x2: 84, y2: 206, stroke: footDetail, "stroke-width": "2.2" }));
    
    innerG.appendChild(svgEl("ellipse", { cx: 104, cy: 204, rx: 11.5, ry: 5.5, fill: footColor, stroke: "#111", "stroke-width": "1.8" }));
    innerG.appendChild(svgEl("line", { x1: 96, y1: 206, x2: 112, y2: 206, stroke: footDetail, "stroke-width": "2.2" }));
  }

  // 2. 배팅 장갑 오버레이 (glove)
  const gloveLvl = equipment?.glove ?? 0;
  if (gloveLvl > 0) {
    let gloveColor = "#4ea4ff";
    let gloveBorder = "#1d4ed8";
    if (gloveLvl === 2) {
      gloveColor = "#1e293b";
      gloveBorder = "#0f172a";
    } else if (gloveLvl === 3) {
      gloveColor = "url(#goldBatGrad)";
      gloveBorder = "#b45309";
    }
    
    // 일러스트 손잡이 손 위치에 컬러 장갑 오버레이 (뒷손: 127,103 / 앞손: 99,109)
    innerG.appendChild(svgEl("circle", { cx: 127, cy: 103, r: 6.5, fill: gloveColor, stroke: gloveBorder, "stroke-width": "1.5" }));
    innerG.appendChild(svgEl("circle", { cx: 99, cy: 109, r: 6.5, fill: gloveColor, stroke: gloveBorder, "stroke-width": "1.5" }));
  }

  // 3. 배트 오버레이 (bat)
  const batLvl = equipment?.bat ?? 0;
  if (batLvl > 0) {
    let batColor = "url(#woodBatGrad)";
    let batTipColor = "#8a5a2a";
    let gripColor = "#3a2517";

    if (batLvl === 1) {
      batColor = "url(#silverGrad)";
      batTipColor = "#94a3b8";
      gripColor = "#1e293b";
    } else if (batLvl === 2) {
      batColor = "#1e293b";
      batTipColor = "#ef4444";
      gripColor = "#ef4444";
    } else if (batLvl === 3) {
      batColor = "url(#goldBatGrad)";
      batTipColor = "#fbbf24";
      gripColor = "#1e1b4b";
    }

    // 일러스트 배트 가림막 (128,86 -> 168,28)
    innerG.appendChild(svgEl("line", {
      x1: 128, y1: 86,
      x2: 168, y2: 28,
      stroke: batColor,
      "stroke-width": "6",
      "stroke-linecap": "round",
    }));
    innerG.appendChild(svgEl("line", {
      x1: 128, y1: 86,
      x2: 168, y2: 28,
      stroke: "#111",
      "stroke-width": "6",
      "stroke-linecap": "round",
      opacity: 0.15
    }));
    innerG.appendChild(svgEl("circle", { cx: 168, cy: 28, r: 5.5, fill: batTipColor, stroke: "#111", "stroke-width": "1.5" }));
    
    // 그립
    innerG.appendChild(svgEl("rect", {
      x: 120, y: 80, width: 12, height: 6.5,
      fill: gripColor,
      stroke: "#111",
      "stroke-width": "1.2",
      transform: "rotate(-30 126 83)",
    }));
  }

  // 4. 안경 오버레이 (glasses)
  const face = getFace(faceId);
  if (face.accessory === "glasses") {
    // 일러스트 얼굴 위치에 안경 오버레이
    const eyeY = 55.5;
    const leftLensX = 86.5;
    const rightLensX = 93.5;
    const radius = 6.5 * 0.44; // 약 2.8px
    
    innerG.appendChild(svgEl("circle", { cx: leftLensX, cy: eyeY, r: radius, fill: "rgba(255,255,255,0.22)", stroke: "#222", "stroke-width": "1.0" }));
    innerG.appendChild(svgEl("circle", { cx: rightLensX, cy: eyeY, r: radius, fill: "rgba(255,255,255,0.22)", stroke: "#222", "stroke-width": "1.0" }));
    
    innerG.appendChild(svgEl("line", { x1: leftLensX + radius, y1: eyeY, x2: rightLensX - radius, y2: eyeY, stroke: "#222", "stroke-width": "0.8" }));
    
    innerG.appendChild(svgEl("line", { x1: leftLensX - 1.2, y1: eyeY - 1.5, x2: leftLensX + 1.2, y2: eyeY + 1.5, stroke: "#fff", "stroke-width": "0.6", opacity: 0.7 }));
    innerG.appendChild(svgEl("line", { x1: rightLensX - 1.2, y1: eyeY - 1.5, x2: rightLensX + 1.2, y2: eyeY + 1.5, stroke: "#fff", "stroke-width": "0.6", opacity: 0.7 }));
  }

  // 5. 글러브 배지 오버레이
  if (hand === "mixed" || hand === "lefty_rb") {
    const throwHand = hand === "mixed" ? "R" : "L";
    const badgeX = hand === "mixed" ? 126 : 54;
    const badge = group([], { transform: `translate(${badgeX} 160)` });

    let badgeBg = "#3a2517";
    let badgeBorder = "#111";
    if (gloveLvl === 1) {
      badgeBg = "#4ea4ff";
      badgeBorder = "#1d4ed8";
    } else if (gloveLvl === 2) {
      badgeBg = "#1f2937";
      badgeBorder = "#4b5563";
    } else if (gloveLvl === 3) {
      badgeBg = "url(#goldBatGrad)";
      badgeBorder = "#b45309";
    }

    badge.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 13.5, fill: badgeBg, stroke: badgeBorder, "stroke-width": "1.8" }));
    badge.appendChild(svgEl("circle", { cx: -4, cy: -4, r: 4, fill: "rgba(255,255,255,0.18)" }));
    
    const txt = svgEl("text", {
      x: 0, y: 4, "text-anchor": "middle",
      fill: "#e8edf3", "font-size": "10", "font-weight": "900",
      stroke: "#111", "stroke-width": "1.5", "paint-order": "stroke fill"
    });
    txt.textContent = throwHand;
    badge.appendChild(txt);
    innerG.appendChild(badge);
  }

  g.appendChild(innerG);
  return g;
}

// 폴백 드로잉: 일러스트 에셋 로드 실패 시에만 그리는 기존 전체 카툰 SVG 뼈대
function drawCharacterBody(faceId, hand, talent = "all_round", equipment = { bat: 0, glove: 0, cleats: 0 }) {
  const battingLeft = hand === "left" || hand === "mixed";
  const g = group([], { transform: `translate(90 30)` });

  let shW = 28;     // shoulder half-width
  let waistW = 26;  // waist half-width
  let legW = 22;    // outer leg half-width
  
  if (talent === "power") {
    shW = 34;
    waistW = 31;
    legW = 27;
  } else if (talent === "speedster" || talent === "finesse" || talent === "breakerz") {
    shW = 23;
    waistW = 21;
    legW = 18;
  }

  // 1. 머리
  const head = group([], { transform: "translate(-22 0) scale(0.44)" });
  head.appendChild(createFaceGroup(faceId));
  g.appendChild(head);

  // 2. 목
  g.appendChild(svgEl("rect", {
    x: -4.5, y: 44, width: 9, height: 9, fill: "#e6b889", stroke: "#111", "stroke-width": "1.5", rx: 2
  }));
  g.appendChild(svgEl("path", {
    d: "M -4.5 44 L 4.5 44 L 4.5 49 L -4.5 44 Z", fill: "rgba(0,0,0,0.12)"
  }));

  // 3. 유니폼 몸통
  const bodyColor = "#e8edf3";
  const bodyAccent = "#4ea4ff";
  
  g.appendChild(svgEl("path", {
    d: `M -${shW} 52 Q -${shW} 48 -${waistW} 48 L ${waistW} 48 Q ${shW} 48 ${shW} 52 L ${waistW} 110 L -${waistW} 110 Z`,
    fill: bodyColor,
    stroke: "#111",
    "stroke-width": "1.8",
  }));
  
  g.appendChild(svgEl("path", {
    d: `M 0 48 L ${waistW} 48 Q ${shW} 48 ${shW} 52 L ${waistW} 110 L 0 110 Z`,
    fill: "rgba(0,0,0,0.06)",
  }));

  const num = svgEl("text", {
    x: 0, y: 92,
    "text-anchor": "middle",
    fill: bodyAccent,
    stroke: "#13284f",
    "stroke-width": "2",
    "paint-order": "stroke fill",
    "font-size": "28",
    "font-weight": "900",
    "font-family": "Impact, system-ui, sans-serif",
  });
  num.textContent = "1";
  g.appendChild(num);

  // 벨트
  g.appendChild(svgEl("rect", {
    x: -waistW, y: 108, width: waistW * 2, height: 6, fill: "#1a1a1a", stroke: "#111", "stroke-width": "1.2"
  }));
  g.appendChild(svgEl("rect", {
    x: -4, y: 107, width: 8, height: 8, fill: "#ffb84e", stroke: "#111", "stroke-width": "1"
  }));

  // 4. 바지
  g.appendChild(svgEl("path", {
    d: `M -${waistW-2} 114 L -${legW} 168 L -6 168 L -4 130 L 4 130 L 6 168 L ${legW} 168 L ${waistW-2} 114 Z`,
    fill: "#bfc5d0",
    stroke: "#111",
    "stroke-width": "1.8",
  }));
  g.appendChild(svgEl("path", {
    d: "M -4 130 L 4 130 L 6 168 L 0 168 Z",
    fill: "rgba(0,0,0,0.08)",
  }));

  // 5. 신발
  const cleatsLvl = equipment?.cleats ?? 0;
  let footColor = "#1a1a1a";
  let footDetail = "#333";
  
  if (cleatsLvl === 1) {
    footColor = "#3b82f6";
    footDetail = "#1d4ed8";
  } else if (cleatsLvl === 2) {
    footColor = "#ef4444";
    footDetail = "#b91c1c";
  } else if (cleatsLvl === 3) {
    footColor = "url(#goldBatGrad)";
    footDetail = "#fbbf24";
  }

  const footX = Math.round(legW * 0.65);
  g.appendChild(svgEl("ellipse", { cx: -footX, cy: 174, rx: 11.5, ry: 5.5, fill: footColor, stroke: "#111", "stroke-width": "1.8" }));
  g.appendChild(svgEl("line", { x1: -footX - 8, y1: 176, x2: -footX + 8, y2: 176, stroke: footDetail, "stroke-width": "2.2" }));
  g.appendChild(svgEl("ellipse", { cx: footX, cy: 174, rx: 11.5, ry: 5.5, fill: footColor, stroke: "#111", "stroke-width": "1.8" }));
  g.appendChild(svgEl("line", { x1: footX - 8, y1: 176, x2: footX + 8, y2: 176, stroke: footDetail, "stroke-width": "2.2" }));

  // 6. 팔 + 배트
  const dx = shW - 28;
  const armsTransform = battingLeft 
    ? `scale(-1 1) translate(${dx} 0)` 
    : `translate(${dx} 0)`;
  const armsG = group([], { transform: armsTransform });

  armsG.appendChild(svgEl("path", {
    d: "M 22 56 L 38 50 L 44 70 L 30 76 Z",
    fill: "#e6b889",
    stroke: "#111",
    "stroke-width": "1.8",
  }));
  armsG.appendChild(svgEl("path", {
    d: "M 30 76 L 44 70 L 41 60 Z",
    fill: "rgba(0,0,0,0.12)"
  }));

  armsG.appendChild(svgEl("path", {
    d: "M -18 56 L -10 70 L 4 82 L 14 76 L 12 64 L 0 58 Z",
    fill: "#e6b889",
    stroke: "#111",
    "stroke-width": "1.8",
  }));
  armsG.appendChild(svgEl("path", {
    d: "M 4 82 L 14 76 L 12 64 L 6 62 Z",
    fill: "rgba(0,0,0,0.12)"
  }));

  // 장갑
  const gloveLvl = equipment?.glove ?? 0;
  let gloveColor = "#e6b889"; 
  let gloveBorder = "#111";
  
  if (gloveLvl === 1) {
    gloveColor = "#4ea4ff";
    gloveBorder = "#1d4ed8";
  } else if (gloveLvl === 2) {
    gloveColor = "#1e293b";
    gloveBorder = "#0f172a";
  } else if (gloveLvl === 3) {
    gloveColor = "url(#goldBatGrad)";
    gloveBorder = "#b45309";
  }

  armsG.appendChild(svgEl("circle", { cx: 37, cy: 73, r: 6, fill: gloveColor, stroke: gloveBorder, "stroke-width": "1.5" }));
  armsG.appendChild(svgEl("circle", { cx: 9, cy: 79, r: 6, fill: gloveColor, stroke: gloveBorder, "stroke-width": "1.5" }));

  // 배트
  const batLvl = equipment?.bat ?? 0;
  let batColor = "url(#woodBatGrad)";
  let batTipColor = "#8a5a2a";
  let gripColor = "#3a2517";

  if (batLvl === 1) {
    batColor = "url(#silverGrad)";
    batTipColor = "#94a3b8";
    gripColor = "#1e293b";
  } else if (batLvl === 2) {
    batColor = "#1e293b";
    batTipColor = "#ef4444";
    gripColor = "#ef4444";
  } else if (batLvl === 3) {
    batColor = "url(#goldBatGrad)";
    batTipColor = "#fbbf24";
    gripColor = "#1e1b4b";
  }

  armsG.appendChild(svgEl("line", {
    x1: 38, y1: 56,
    x2: 78, y2: -2,
    stroke: batColor,
    "stroke-width": "5.5",
    "stroke-linecap": "round",
  }));
  armsG.appendChild(svgEl("line", {
    x1: 38, y1: 56,
    x2: 78, y2: -2,
    stroke: "#111",
    "stroke-width": "5.5",
    "stroke-linecap": "round",
    "paint-order": "stroke fill",
    opacity: 0.15
  }));

  armsG.appendChild(svgEl("circle", { cx: 78, cy: -2, r: 5.5, fill: batTipColor, stroke: "#111", "stroke-width": "1.5" }));
  
  armsG.appendChild(svgEl("rect", {
    x: 30, y: 50, width: 12, height: 6.5,
    fill: gripColor,
    stroke: "#111",
    "stroke-width": "1.2",
    transform: "rotate(-30 36 53)",
  }));

  g.appendChild(armsG);

  // 글러브 배지
  if (hand === "mixed" || hand === "lefty_rb") {
    const throwHand = hand === "mixed" ? "R" : "L";
    const badgeX = hand === "mixed" ? 36 : -36;
    const badge = group([], { transform: `translate(${badgeX} 130)` });

    let badgeBg = "#3a2517";
    let badgeBorder = "#111";
    if (gloveLvl === 1) {
      badgeBg = "#4ea4ff";
      badgeBorder = "#1d4ed8";
    } else if (gloveLvl === 2) {
      badgeBg = "#1f2937";
      badgeBorder = "#4b5563";
    } else if (gloveLvl === 3) {
      badgeBg = "url(#goldBatGrad)";
      badgeBorder = "#b45309";
    }

    badge.appendChild(svgEl("circle", { cx: 0, cy: 0, r: 13.5, fill: badgeBg, stroke: badgeBorder, "stroke-width": "1.8" }));
    badge.appendChild(svgEl("circle", { cx: -4, cy: -4, r: 4, fill: "rgba(255,255,255,0.18)" }));
    
    const txt = svgEl("text", {
      x: 0, y: 4, "text-anchor": "middle",
      fill: "#e8edf3", "font-size": "10", "font-weight": "900",
      stroke: "#111", "stroke-width": "1.5", "paint-order": "stroke fill"
    });
    txt.textContent = throwHand;
    badge.appendChild(txt);
    g.appendChild(badge);
  }

  return g;
}
