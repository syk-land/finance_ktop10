// 홈런 더비 미니게임 뷰
//
// 특징:
//   - HTML5/SVG/CSS를 활용한 실시간 타이밍 타격 게임
//   - 직관적이고 중독성 있는 게임플레이 (사용자 조작 필수)
//   - 최고 기록 저장 및 갱신 기능 (로컬스토리지 연동)
//   - 다국어 지원 (ko/en)

import { state } from "../state.js";
import { t } from "../i18n/index.js";
import { createImage } from "../assets/images.js";
import { sfx } from "../assets/audio.js";
import { svgEl } from "../render/svg.js";

const W = 320, H = 220;
const ZONE = { x: 130, y: 95, w: 60, h: 65 };

// 게임 상태 변수
let gameScore = 0;
let gameOuts = 0;
let highScore = 0;
let gameActive = false;

let pitchActive = false;
let pitchStartTime = 0;
let pitchDuration = 1000; // ms
let pitchSpeed = 145; // km/h
let pitchType = "fastball"; // fastball, slider, curve
let swingTriggered = false;

let animFrameId = null;
let nextPitchTimeout = null;

// DOM 요소 참조
let viewContainer = null;
let overlaySvg = null;
let ballNode = null;
let fgImgNode = null;
let feedbackNode = null;
let scoreNode = null;
let outsNode = null;
let statusTextNode = null;

// 헬퍼: 버튼 생성
function button(text, cls = "", onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn " + cls;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

// 1. 진입 메인 뷰 렌더러
export function renderHomerunDerby(root, route) {
  root.innerHTML = "";
  
  // 상태 초기화
  highScore = parseInt(localStorage.getItem("homerunderby_highscore") || "0", 10);
  gameActive = false;
  clearTimeoutsAndFrames();

  const wrap = document.createElement("div");
  wrap.className = "stack";
  wrap.style.cssText = "padding: 16px; align-items: center; max-width: 412px; margin: 0 auto; min-height: 100%; justify-content: center;";

  // 카드 레이아웃
  const card = document.createElement("div");
  card.className = "panel";
  card.style.cssText = "width: 100%; padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow); border-radius: var(--radius); border: 1px solid var(--border);";

  // 제목 및 소개
  const title = document.createElement("h2");
  title.className = "logo";
  title.style.cssText = "font-size: 26px; color: var(--accent-2); margin: 0;";
  title.textContent = t("homerunDerby.title");
  card.appendChild(title);

  const tagline = document.createElement("p");
  tagline.className = "muted";
  tagline.style.cssText = "font-size: 14px; margin: 0;";
  tagline.textContent = t("homerunDerby.tagline");
  card.appendChild(tagline);

  // 최고 점수 표시
  const record = document.createElement("div");
  record.style.cssText = "font-size: 18px; font-weight: 700; color: var(--accent); margin: 10px 0;";
  record.textContent = t("homerunDerby.highScore", { score: highScore });
  card.appendChild(record);

  // 액션 버튼
  const startBtn = button(t("homerunDerby.startBtn"), "primary", () => {
    sfx("good");
    startGame(root, route);
  });
  startBtn.style.padding = "14px";
  startBtn.style.fontSize = "16px";
  card.appendChild(startBtn);

  const backBtn = button("← " + t("common.returnToMenu"), "", () => {
    sfx("click");
    route("start");
  });
  card.appendChild(backBtn);

  wrap.appendChild(card);
  root.appendChild(wrap);
}

// 2. 게임 시작
function startGame(root, route) {
  gameScore = 0;
  gameOuts = 0;
  gameActive = true;
  clearTimeoutsAndFrames();

  root.innerHTML = "";
  
  const wrap = document.createElement("div");
  wrap.className = "stack";
  wrap.style.cssText = "padding: 12px; gap: 12px; align-items: center; max-width: 412px; margin: 0 auto; height: 100%; justify-content: flex-start;";
  viewContainer = wrap;

  // 헤더: 현재 점수 및 아웃카운트
  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; width: 100%; padding: 8px 16px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); font-size: 15px; font-weight: 700;";
  
  scoreNode = document.createElement("span");
  scoreNode.style.color = "var(--accent-2)";
  scoreNode.textContent = t("homerunDerby.score", { score: gameScore });
  header.appendChild(scoreNode);

  outsNode = document.createElement("span");
  outsNode.style.color = "var(--bad)";
  outsNode.textContent = t("homerunDerby.outs", { outs: gameOuts });
  header.appendChild(outsNode);

  wrap.appendChild(header);

  // 중앙: 게임 애니메이션 영역 (320x220 박스)
  const gameArea = buildPlayArea();
  wrap.appendChild(gameArea);

  // 상태 메시지 텍스트
  statusTextNode = document.createElement("div");
  statusTextNode.style.cssText = "font-size: 13px; color: var(--muted); text-align: center; min-height: 18px; margin-top: 4px;";
  statusTextNode.textContent = "";
  wrap.appendChild(statusTextNode);

  // 하단: 타격(Swing) 및 조작 가이드 영역
  const controls = document.createElement("div");
  controls.style.cssText = "width: 100%; display: flex; flex-direction: column; gap: 12px; align-items: center; margin-top: 8px;";

  const swingBtn = document.createElement("button");
  swingBtn.type = "button";
  swingBtn.className = "btn primary";
  swingBtn.style.cssText = "width: 100%; padding: 18px; font-size: 20px; font-weight: 900; background: linear-gradient(135deg, #ffb84e 0%, #ff8e4e 100%); border: none; color: #000; box-shadow: 0 4px 15px rgba(255,142,78,0.4); border-radius: var(--radius); cursor: pointer;";
  swingBtn.textContent = t("homerunDerby.swingBtn");
  
  // 전체 터치 및 버튼 터치 모두 타격 트리거
  swingBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // 중복 발화 방지
    triggerSwing();
  });
  controls.appendChild(swingBtn);

  // 포기/나가기 버튼
  const exitBtn = button(t("common.returnToMenu"), "", () => {
    sfx("click");
    gameActive = false;
    clearTimeoutsAndFrames();
    route("start");
  });
  exitBtn.style.cssText = "width: 100%; padding: 8px; font-size: 12px; color: var(--muted); margin-top: 8px;";
  controls.appendChild(exitBtn);

  wrap.appendChild(controls);
  root.appendChild(wrap);

  // 화면 아무 데나 터치해도 타격 가능하도록 설정
  gameArea.addEventListener("click", () => {
    triggerSwing();
  });

  // 1.5초 후 첫 투구 던지기
  statusTextNode.textContent = "Get ready...";
  nextPitchTimeout = setTimeout(throwPitch, 1500);
}

// 3. 투구 던지기 로직
function throwPitch() {
  if (!gameActive) return;

  // 상태 리셋
  pitchActive = true;
  swingTriggered = false;
  
  // 전경 소품(방망이) 원위치 복구
  if (fgImgNode) {
    fgImgNode.style.transition = "none";
    fgImgNode.style.transform = "translateX(-50%) rotate(0deg)";
  }

  // 피드백 텍스트 제거
  if (feedbackNode) {
    feedbackNode.textContent = "";
    feedbackNode.style.opacity = "0";
  }

  // 구질 및 구속 결정
  const rand = Math.random();
  if (rand < 0.4) {
    pitchType = "fastball";
    pitchSpeed = Math.floor(140 + Math.random() * 15); // 140 ~ 155
    pitchDuration = 900 + Math.random() * 100; // 900 ~ 1000ms
  } else if (rand < 0.75) {
    pitchType = "slider";
    pitchSpeed = Math.floor(130 + Math.random() * 10); // 130 ~ 140
    pitchDuration = 1100 + Math.random() * 120; // 1100 ~ 1220ms
  } else {
    pitchType = "curve";
    pitchSpeed = Math.floor(118 + Math.random() * 10); // 118 ~ 128
    pitchDuration = 1350 + Math.random() * 150; // 1350 ~ 1500ms
  }

  // 공 그래픽 리셋
  ballNode.style.opacity = "1";
  ballNode.setAttribute("cx", "160");
  ballNode.setAttribute("cy", "58");
  ballNode.setAttribute("r", "3");

  const typeLabel = pitchType.toUpperCase();
  statusTextNode.textContent = `${typeLabel} - ${pitchSpeed}km/h`;

  // 피치 타임 시작
  pitchStartTime = Date.now();
  
  // 프레임 업데이트 루프 시작
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(updatePitchFrame);

  // 미타격 시 스트라이크 아웃 타임아웃 배정 (지연 고려 1.15배)
  nextPitchTimeout = setTimeout(() => {
    evaluateSwing(-1); // 미타격 스트라이크
  }, pitchDuration * 1.15);
}

// 4. 투구 궤적 애니메이션 업데이트
function updatePitchFrame() {
  if (!pitchActive || !gameActive) return;

  const elapsed = Date.now() - pitchStartTime;
  const p = Math.min(1.0, elapsed / pitchDuration);

  // 공의 궤적 계산
  let cx = 160;
  let cy = 58 + (195 - 58) * p;
  let r = 3 + (15 - 3) * p;

  // 구질별 무브먼트 구현
  if (pitchType === "slider" && p > 0.4) {
    // 횡방향 꺾임
    const curveProgress = (p - 0.4) / 0.6;
    cx = 160 - 24 * Math.sin(curveProgress * Math.PI / 2);
  } else if (pitchType === "curve" && p > 0.3) {
    // 하향 및 횡방향 복합
    const curveProgress = (p - 0.3) / 0.7;
    cx = 160 + 15 * Math.sin(curveProgress * Math.PI / 2);
    cy += 14 * Math.sin(curveProgress * Math.PI / 2);
  }

  ballNode.setAttribute("cx", cx.toString());
  ballNode.setAttribute("cy", cy.toString());
  ballNode.setAttribute("r", r.toString());

  if (p < 1.0) {
    animFrameId = requestAnimationFrame(updatePitchFrame);
  }
}

// 5. 타격(스윙) 트리거
function triggerSwing() {
  if (!gameActive || !pitchActive || swingTriggered) return;
  swingTriggered = true;

  // 방망이 회전 연출
  if (fgImgNode) {
    fgImgNode.style.transition = "transform 140ms cubic-bezier(0.1, 0.8, 0.3, 1)";
    fgImgNode.style.transform = "translateX(-50%) rotate(-85deg)";
  }

  // 타격 판정 진행
  const elapsed = Date.now() - pitchStartTime;
  const p = elapsed / pitchDuration;
  
  if (nextPitchTimeout) clearTimeout(nextPitchTimeout);
  evaluateSwing(p);
}

// 6. 타이밍 판정 및 결과 연출
function evaluateSwing(p) {
  pitchActive = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);

  let result = "MISS";
  let labelText = "";
  let color = "var(--text)";
  let isOut = false;
  let isHomerun = false;
  let isHit = false;

  if (p < 0) {
    // 미타격 (스트라이크)
    result = "STRIKE";
    labelText = t("homerunDerby.miss");
    color = "var(--bad)";
    isOut = true;
    sfx("strikeout");
  } else {
    // 타이밍 평가
    // Perfect zone: 0.81 ~ 0.88
    if (p >= 0.81 && p <= 0.88) {
      result = "PERFECT";
      labelText = t("homerunDerby.perfect");
      color = "var(--accent-2)";
      isHomerun = true;
      sfx("homerun");
      sfx("crowd");
    } else if ((p >= 0.73 && p < 0.81) || (p > 0.88 && p <= 0.94)) {
      result = "GOOD";
      labelText = t("homerunDerby.good");
      color = "var(--accent)";
      isHit = true;
      sfx("hit");
    } else if ((p >= 0.58 && p < 0.73) || (p > 0.94 && p <= 1.04)) {
      isOut = true;
      sfx("out");
      if (p < 0.73) {
        result = "EARLY";
        labelText = t("homerunDerby.early");
        color = "var(--warn)";
      } else {
        result = "LATE";
        labelText = t("homerunDerby.late");
        color = "var(--warn)";
      }
    } else {
      // 헛스윙
      result = "STRIKE";
      labelText = t("homerunDerby.miss");
      color = "var(--bad)";
      isOut = true;
      sfx("strikeout");
    }
  }

  // 피드백 텍스트 연출
  showFeedback(labelText, color);

  // 공의 최종 발사/낙하 비행 애니메이션 연출
  animateBallResult(result, p);

  // 결과 반영
  if (isHomerun) {
    gameScore++;
    scoreNode.textContent = t("homerunDerby.score", { score: gameScore });
  } else if (isOut) {
    gameOuts++;
    outsNode.textContent = t("homerunDerby.outs", { outs: gameOuts });
  }

  // 다음 진행 판단
  if (gameOuts >= 10) {
    // 게임 오버
    gameActive = false;
    nextPitchTimeout = setTimeout(endGame, 2000);
  } else {
    // 2.2초 후 다음 공 투구
    nextPitchTimeout = setTimeout(throwPitch, 2200);
  }
}

// 7. 피드백 연출
function showFeedback(text, color) {
  if (!feedbackNode) return;
  feedbackNode.textContent = text;
  feedbackNode.style.color = color;
  feedbackNode.style.opacity = "1";
  feedbackNode.style.transform = "translate(-50%, -50%) scale(1.18)";
  
  setTimeout(() => {
    if (feedbackNode) {
      feedbackNode.style.transition = "transform 300ms ease, opacity 300ms ease";
      feedbackNode.style.transform = "translate(-50%, -50%) scale(1.0)";
    }
  }, 100);
}

// 8. 결과별 야구공 비행 시각화
function animateBallResult(result, p) {
  if (!ballNode) return;
  
  const cx = parseFloat(ballNode.getAttribute("cx"));
  const cy = parseFloat(ballNode.getAttribute("cy"));
  
  let targetX = cx;
  let targetY = cy;
  let finalOpacity = "0";
  let duration = 800; // ms

  if (result === "PERFECT") {
    // 홈런: 엄청 빠르게 화면 밖 위로 날아가며 커짐
    targetX = cx + (Math.random() - 0.5) * 80;
    targetY = -80;
    ballNode.setAttribute("r", "20");
    duration = 900;
  } else if (result === "GOOD") {
    // 안타: 외야 좌우 공간으로 비행
    targetX = cx + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 80);
    targetY = 20 + Math.random() * 30;
    ballNode.setAttribute("r", "6");
    duration = 750;
  } else if (result === "EARLY" || result === "LATE") {
    // 내야 범타: 땅볼로 굴러 좌우 아웃
    targetX = result === "EARLY" ? -20 : W + 20;
    targetY = cy + 20 + Math.random() * 30;
    ballNode.setAttribute("r", "4");
    duration = 600;
  } else {
    // 헛스윙/스트라이크: 미트 꽂힘
    targetX = cx;
    targetY = cy + 10;
    finalOpacity = "0.7";
    duration = 200;
  }

  // 간단한 CSS Transition 효과 부여
  ballNode.style.transition = `cx ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), cy ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), r ${duration}ms ease, opacity ${duration}ms ease`;
  
  setTimeout(() => {
    if (ballNode) {
      ballNode.setAttribute("cx", targetX.toString());
      ballNode.setAttribute("cy", targetY.toString());
      ballNode.style.opacity = finalOpacity;
    }
  }, 20);

  // 비행 완료 후 초기화 (다음 피치를 위해 transition 제거)
  setTimeout(() => {
    if (ballNode) {
      ballNode.style.transition = "none";
    }
  }, duration + 50);
}

// 9. 게임오버 정산
function endGame() {
  clearTimeoutsAndFrames();
  
  const isNewRecord = gameScore > highScore;
  if (isNewRecord) {
    highScore = gameScore;
    localStorage.setItem("homerunderby_highscore", highScore.toString());
  }

  viewContainer.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.style.cssText = "width: 100%; padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--border); border-radius: var(--radius); animation: nir-fade 300ms ease;";

  const h = document.createElement("h3");
  h.className = "logo";
  h.style.color = "var(--bad)";
  h.style.fontSize = "24px";
  h.textContent = t("homerunDerby.gameOver");
  panel.appendChild(h);

  // 점수 출력
  const score = document.createElement("div");
  score.style.cssText = "font-size: 20px; font-weight: 900; margin: 8px 0;";
  score.textContent = t("homerunDerby.finalScore", { score: gameScore });
  panel.appendChild(score);

  if (isNewRecord) {
    const recordText = document.createElement("div");
    recordText.style.cssText = "font-size: 16px; font-weight: 700; color: var(--accent-2); animation: nir-idle 1.5s ease infinite; margin-bottom: 8px;";
    recordText.textContent = t("homerunDerby.newRecord");
    panel.appendChild(recordText);
  }

  // 최고 점수 표시
  const rec = document.createElement("div");
  rec.className = "muted";
  rec.style.cssText = "font-size: 14px; margin-bottom: 12px;";
  rec.textContent = t("homerunDerby.highScore", { score: highScore });
  panel.appendChild(rec);

  // 액션 버튼
  const retryBtn = button(t("homerunDerby.restartBtn"), "primary", () => {
    sfx("good");
    startGame(viewContainer.parentElement, state.viewRoute);
  });
  retryBtn.style.padding = "12px";
  panel.appendChild(retryBtn);

  const exitBtn = button(t("homerunDerby.backToMenu"), "", () => {
    sfx("click");
    renderHomerunDerby(viewContainer.parentElement, state.viewRoute);
  });
  panel.appendChild(exitBtn);

  viewContainer.appendChild(panel);
}

// 10. 타이머 및 애니메이션 프레임 정리
function clearTimeoutsAndFrames() {
  if (nextPitchTimeout) clearTimeout(nextPitchTimeout);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  nextPitchTimeout = null;
  animFrameId = null;
}

// 11. POV 레이아웃 및 그래픽 빌드
function buildPlayArea() {
  const container = document.createElement("div");
  container.style.cssText = "position:relative; width:100%; max-width:340px; height:200px; margin:0 auto; border-radius:6px; overflow:hidden; border:1px solid var(--border); background:linear-gradient(180deg,#142030 0%,#1a2a3d 70%,#0e1116 100%); cursor:pointer;";

  const svg = svgEl("svg", { width: "100%", height: "100%", viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "position:absolute; inset:0; display:block; z-index:1;";

  // 가상 마운드 및 홈플레이트
  const bgGroup = svgEl("g", {});
  bgGroup.appendChild(svgEl("ellipse", { cx: 160, cy: 80, rx: 55, ry: 14, fill: "rgba(180,140,80,0.12)" }));
  bgGroup.appendChild(svgEl("ellipse", { cx: 160, cy: 190, rx: 95, ry: 16, fill: "rgba(255,255,255,0.05)" }));
  bgGroup.appendChild(svgEl("polygon", { points: "140,188 180,188 180,193 160,202 140,193", fill: "rgba(255,255,255,0.85)" }));
  svg.appendChild(bgGroup);

  // 투수
  const pitcher = svgEl("g", { transform: "translate(160, 38)" }, [
    svgEl("ellipse", { cx: 0, cy: 28, rx: 20, ry: 26, fill: "#3a4a5e" }),
    svgEl("circle",  { cx: 0, cy: 0, r: 10, fill: "#e6c9a8" }),
    svgEl("path",    { d: "M -10,-3 Q 0,-15 10,-3 Z", fill: "#1e4a8e" }),
  ]);
  svg.appendChild(pitcher);

  // 스트라이크존
  const zone = svgEl("g", {});
  zone.appendChild(svgEl("rect", {
    x: ZONE.x, y: ZONE.y, width: ZONE.w, height: ZONE.h,
    fill: "rgba(255,255,255,0.03)", stroke: "rgba(255,255,255,0.35)", "stroke-width": 1
  }));
  svg.appendChild(zone);

  // 야구공
  ballNode = svgEl("circle", {
    r: 4, fill: "#ffffff", stroke: "#cc3030", "stroke-width": 1,
    style: "filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));"
  });
  ballNode.setAttribute("cx", "160");
  ballNode.setAttribute("cy", "58");
  ballNode.style.opacity = "0";
  svg.appendChild(ballNode);

  // 배경 이미지 (실제 이미지 로드 시 위 SVG 임시 그래픽 숨김)
  const bgImg = createImage("povBgBat", {
    style: "position:absolute; inset:0; z-index:0;",
    imgStyle: "width:100%; height:100%; object-fit:cover;",
    onload: () => { bgGroup.style.display = "none"; pitcher.style.display = "none"; }
  });

  // 전경 소품 (방망이 든 손)
  fgImgNode = createImage("povFgBat", {
    style: "position:absolute; left:50%; bottom:-2%; height:50%; aspect-ratio:1/1; width:auto; z-index:2; will-change:transform; transform-origin:50% 100%; transform:translateX(-50%);",
    imgStyle: "height:100%; width:100%; object-fit:contain;"
  });

  // 피드백 텍스트 오버레이 (PERFECT 등 중앙 플로팅 텍스트)
  feedbackNode = document.createElement("div");
  feedbackNode.style.cssText = "position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); z-index:4; font-size:24px; font-weight:900; text-shadow:0 2px 8px rgba(0,0,0,0.9); opacity:0; transition:none; pointer-events:none; white-space:nowrap; text-align:center;";

  container.appendChild(bgImg);
  container.appendChild(svg);
  container.appendChild(fgImgNode);
  container.appendChild(feedbackNode);

  return container;
}
