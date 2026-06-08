// 3등신 캐릭터 (배팅 자세) — 100% 일러스트 이미지 레이어 중첩 기반 캐릭터 아바타 시스템
import { getFace, SKIN_COLORS, HAIR_COLORS } from "./avatars.js";
import { IMAGES } from "../assets/manifest.js";
import { t } from "../i18n/index.js";

function mapCustomToPreset(faceId) {
  if (!faceId) return "f1";
  if (!faceId.startsWith("f_")) return faceId;
  const parts = faceId.split("_");
  const hairStyleIdx = parseInt(parts[3]) || 0; // hairStyle
  const accIdx = parseInt(parts[4]) || 0;       // accessory

  // ACCESSORIES = ["none", "cap", "helmet", "scar", "blush"]
  // HAIR_STYLES = ["short", "curly", "neat", "spiky", "bald"]
  if (accIdx === 2) return "f2"; // helmet -> f2
  if (accIdx === 1) return "f4"; // cap -> f4
  if (hairStyleIdx === 1) return "f3"; // curly -> f3
  return "f1"; // default -> f1
}

function handLabel(hand) {
  return t("hand." + hand);
}

// hand: "right" (우투우타) | "left" (좌투좌타) | "mixed" (우투좌타)
// 반환: HTML div 컨테이너 (100% 투명 배경 WebP/PNG 일러스트 레이어 중첩 및 폴백 구조)
export function createCharacterSVG(faceId, hand = "right", size = { w: 180, h: 240 }, talent = "all_round", equipment = { bat: 0, glove: 0, cleats: 0 }) {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = size.w + "px";
  container.style.height = size.h + "px";
  container.style.overflow = "hidden";

  const presetKey = mapCustomToPreset(faceId);
  const isCustomFace = faceId && faceId.startsWith("f_");
  const battingLeft = hand === "left" || hand === "mixed";
  const pose = "bat"; // 타격자세 기본

  // 1. 커스텀이 아닌 기본 프리셋 얼굴인 경우:
  // 6종 전신 일러스트(f1~f6) 위에 장비 레이어만 심플하게 중첩
  if (!isCustomFace) {
    const bgImg = document.createElement("img");
    bgImg.src = `assets/img/char-${pose}-${presetKey.toLowerCase()}.webp`;
    bgImg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; pointer-events:none;";
    if (battingLeft) bgImg.style.transform = "scaleX(-1)";
    container.appendChild(bgImg);

    // 장비 레이어 얹기
    const eqLayers = [];
    if (equipment.cleats > 0) eqLayers.push(`assets/img/eq-cleats-lvl${equipment.cleats}-${pose}.webp`);
    if (equipment.glove > 0) eqLayers.push(`assets/img/eq-glove-lvl${equipment.glove}-${pose}.webp`);
    if (equipment.bat > 0) eqLayers.push(`assets/img/eq-bat-lvl${equipment.bat}-${pose}.webp`);

    eqLayers.forEach(src => {
      const eqImg = document.createElement("img");
      eqImg.src = src;
      eqImg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; pointer-events:none;";
      if (battingLeft) eqImg.style.transform = "scaleX(-1)";
      container.appendChild(eqImg);
    });

    // 최상단 손잡이 라벨링
    appendHandLabel(container, hand);
    return container;
  }

  // 2. 커스텀 얼굴(f_로 시작)인 경우:
  // 기획서대로 85장 레이어 부품 방식(WebP)으로 겹쳐 렌더링
  const face = getFace(faceId);
  const skinIdx = SKIN_COLORS.indexOf(face.skin) + 1;
  const hairColorIdx = HAIR_COLORS.indexOf(face.hair) + 1;
  
  const layers = [];
  
  // (0) 기본 완성형 일러스트 바탕 레이어 (몸통 및 기본 실루엣 유지용)
  layers.push(`assets/img/char-${pose}-${presetKey.toLowerCase()}.webp`);
  
  // (1) 뒷머리 레이어
  if (face.style !== "bald" && face.style !== "none") {
    layers.push(`assets/img/hair-back-${face.style}-color${hairColorIdx}.webp`);
  }
  // (3) 야구화 레이어
  if (equipment.cleats > 0) {
    layers.push(`assets/img/eq-cleats-lvl${equipment.cleats}-${pose}.webp`);
  }
  // (4) 얼굴형 레이어
  layers.push(`assets/img/head-${face.shape}-skin${skinIdx}.webp`);
  // (5) 눈모양 레이어
  layers.push(`assets/img/eye-${face.eye}.webp`);
  // (6) 코/입 공용 레이어
  layers.push(`assets/img/face-features.webp`);
  // (7) 앞머리 레이어
  if (face.style !== "bald" && face.style !== "none") {
    layers.push(`assets/img/hair-front-${face.style}-color${hairColorIdx}.webp`);
  }
  // (8) 액세서리 레이어
  if (face.accessory && face.accessory !== "none") {
    layers.push(`assets/img/acc-${face.accessory}.webp`);
  }
  // (9) 장비 레이어
  if (equipment.glove > 0) {
    layers.push(`assets/img/eq-glove-lvl${equipment.glove}-${pose}.webp`);
  }
  if (equipment.bat > 0) {
    layers.push(`assets/img/eq-bat-lvl${equipment.bat}-${pose}.webp`);
  }

  let hasError = false;

  // 부품 에셋이 아직 준비되지 않았을 때의 스마트 폴백
  function applyFallback() {
    container.innerHTML = "";
    const fallbackImg = document.createElement("img");
    const fallbackPreset = mapCustomToPreset(faceId);
    fallbackImg.src = `assets/img/char-${pose}-${fallbackPreset.toLowerCase()}.webp`;
    fallbackImg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; pointer-events:none;";
    if (battingLeft) fallbackImg.style.transform = "scaleX(-1)";
    container.appendChild(fallbackImg);

    // 폴백 상황에서도 실시간 장비는 최대한 같이 얹어줌
    const eqLayers = [];
    if (equipment.cleats > 0) eqLayers.push(`assets/img/eq-cleats-lvl${equipment.cleats}-${pose}.webp`);
    if (equipment.glove > 0) eqLayers.push(`assets/img/eq-glove-lvl${equipment.glove}-${pose}.webp`);
    if (equipment.bat > 0) eqLayers.push(`assets/img/eq-bat-lvl${equipment.bat}-${pose}.webp`);

    eqLayers.forEach(src => {
      const eqImg = document.createElement("img");
      eqImg.src = src;
      eqImg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; pointer-events:none;";
      if (battingLeft) eqImg.style.transform = "scaleX(-1)";
      eqImg.onerror = () => eqImg.remove(); // 장비 레이어 에셋 누락 시 무시
      container.appendChild(eqImg);
    });

    appendHandLabel(container, hand);
  }

  layers.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; pointer-events:none;";
    if (battingLeft) img.style.transform = "scaleX(-1)";
    
    img.addEventListener("error", () => {
      if (!hasError) {
        hasError = true;
        applyFallback(); // 레이어 리소스 에러 시 통이미지로 부드러운 폴백
      }
    });

    container.appendChild(img);
  });

  appendHandLabel(container, hand);
  return container;
}

function appendHandLabel(parent, hand) {
  const labelWrap = document.createElement("div");
  labelWrap.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; display:flex; justify-content:center;";
  const labelSpan = document.createElement("span");
  labelSpan.style.cssText = "margin-top:22px; color:#8b949e; font-size:13px; font-weight:bold; font-family:monospace;";
  labelSpan.textContent = handLabel(hand);
  labelWrap.appendChild(labelSpan);
  parent.appendChild(labelWrap);
}
