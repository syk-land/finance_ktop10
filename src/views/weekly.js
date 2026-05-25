// 주간 행동 선택 화면
import { state, saveGame } from "../state.js";
import {
  BATTER_STATS, PITCHER_STATS, STAT_LABELS, TALENTS, TRAININGS, overallScore,
} from "../systems/player.js";
import { doDailyAction, endWeek, advanceToNextSeason } from "../systems/week.js";
import { transitionAfterSeason } from "../systems/career.js";
import { getPlayerTeam, standings } from "../systems/league.js";
import { createFaceSVG } from "../render/avatars.js";
import { AUTO_PRESETS, autoFillWeek } from "../systems/autoTrain.js";
import { appearanceChance } from "../systems/simulator.js";
import { createRadarSVG } from "../render/radar.js";
import { formatGameDate } from "../systems/tick.js";

export function renderWeekly(root, route) {
  const { player, league, season } = state;
  if (!player || !league || !season) {
    route("menu"); return;
  }
  if (season.finished) {
    renderSeasonEnd(root, route);
    return;
  }

  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  // 상단 상태 패널
  wrap.appendChild(renderHeaderInfo(player, league, season));

  // 시간 진행 바 (일시정지 / 속도 조절)
  wrap.appendChild(renderTimeBar(route));

  // 주차/요일 표시
  wrap.appendChild(renderWeekStrip(season));

  // 행동 영역 — 일시정지 상태에서만 활성
  if (state.paused) {
    if (season.dayIndex < 5) {
      wrap.appendChild(renderActions(route));
    } else {
      wrap.appendChild(renderWeekendButton(route));
    }
  }

  // 능력치 패널
  wrap.appendChild(renderStatsPanel(player));

  // 이번 주 결과 (있을 때만)
  if (season.weekResults && season.weekResults.length > 0) {
    wrap.appendChild(renderLastWeekResults(season.weekResults));
  }

  // 순위표
  wrap.appendChild(renderStandings(league));

  root.appendChild(wrap);
}

function renderTimeBar(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.display = "flex";
  panel.style.alignItems = "center";
  panel.style.justifyContent = "space-between";
  panel.style.gap = "12px";

  // 날짜 표시
  const dateBox = document.createElement("div");
  dateBox.style.display = "flex";
  dateBox.style.flexDirection = "column";
  const dateLine = document.createElement("div");
  dateLine.style.fontSize = "18px";
  dateLine.style.fontWeight = "600";
  dateLine.style.color = "var(--accent)";
  dateLine.textContent = state.gameDate ? formatGameDate(state.gameDate) : "-";
  const yearLine = document.createElement("div");
  yearLine.className = "muted small";
  yearLine.textContent = state.gameDate ? `${state.gameDate.year}년차 / 시즌 ${state.season.weekIndex + 1}주차` : "";
  dateBox.appendChild(dateLine);
  dateBox.appendChild(yearLine);

  // 컨트롤
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "8px";

  // 일시정지/재생 버튼
  const pauseBtn = document.createElement("button");
  pauseBtn.className = "primary";
  pauseBtn.textContent = state.paused ? "▶  재생" : "⏸  일시정지";
  pauseBtn.style.padding = "10px 18px";
  pauseBtn.style.fontSize = "15px";
  pauseBtn.style.fontWeight = "700";
  pauseBtn.addEventListener("click", () => {
    state.paused = !state.paused;
    route("weekly");
  });
  controls.appendChild(pauseBtn);

  // 속도 조절
  const speedWrap = document.createElement("div");
  speedWrap.style.display = "flex";
  speedWrap.style.gap = "4px";
  const speeds = [
    { label: "0.5x", ms: 1000 },
    { label: "1x",   ms: 500 },
    { label: "2x",   ms: 250 },
    { label: "4x",   ms: 125 },
  ];
  for (const sp of speeds) {
    const b = document.createElement("button");
    b.textContent = sp.label;
    b.style.padding = "6px 10px";
    b.style.fontSize = "12px";
    if (state.tickSpeed === sp.ms) b.classList.add("primary");
    b.addEventListener("click", () => {
      state.tickSpeed = sp.ms;
      route("weekly");
    });
    speedWrap.appendChild(b);
  }
  controls.appendChild(speedWrap);

  panel.appendChild(dateBox);
  panel.appendChild(controls);
  return panel;
}

function renderHeaderInfo(player, league, season) {
  const panel = document.createElement("section");
  panel.className = "panel";

  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.gap = "12px";
  titleRow.style.marginBottom = "12px";

  // 아바타
  const avatar = document.createElement("div");
  avatar.style.width = "56px";
  avatar.style.height = "56px";
  avatar.style.borderRadius = "50%";
  avatar.style.background = "var(--panel-2)";
  avatar.style.border = "2px solid var(--accent)";
  avatar.style.overflow = "hidden";
  avatar.style.flexShrink = "0";
  avatar.appendChild(createFaceSVG(player.faceId ?? "f1", 52));
  titleRow.appendChild(avatar);

  const h = document.createElement("h2");
  h.style.margin = "0";
  h.textContent = `${player.name} — ${player.teamName} ${player.grade}학년`;
  titleRow.appendChild(h);

  panel.appendChild(titleRow);

  const row = document.createElement("div");
  row.className = "row";

  row.appendChild(infoBlock("나이", `${player.age}세`));
  row.appendChild(infoBlock("재능", TALENTS[player.talent].label));
  row.appendChild(infoBlock("종합", overallScore(player).toFixed(1)));
  row.appendChild(infoBlock("체력", `${Math.round(player.stamina)} / ${player.maxStamina}`, player.stamina < 30 ? "warn" : null));
  row.appendChild(infoBlock("컨디션", `${Math.round(player.condition)}`, player.condition > 70 ? "good" : player.condition < 30 ? "bad" : null));
  row.appendChild(infoBlock("주차", `${season.weekIndex + 1} / ${league.weeksPerSeason}`));

  if (player.injury) {
    row.appendChild(infoBlock("부상", `${player.injury.type} (${player.injury.weeksLeft}주)`, "bad"));
  }
  panel.appendChild(row);
  return panel;
}

function infoBlock(label, value, tone) {
  const d = document.createElement("div");
  d.style.minWidth = "100px";
  const l = document.createElement("div");
  l.className = "muted small";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "big";
  v.textContent = value;
  if (tone === "warn") v.style.color = "var(--warn)";
  if (tone === "bad") v.style.color = "var(--bad)";
  if (tone === "good") v.style.color = "var(--good)";
  d.appendChild(l);
  d.appendChild(v);
  return d;
}

function renderWeekStrip(season) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h3");
  h.textContent = "이번 주 일정";
  panel.appendChild(h);

  const strip = document.createElement("div");
  strip.className = "daystrip";
  const labels = ["월", "화", "수", "목", "금", "토", "일"];
  for (let i = 0; i < 5; i++) {
    const cell = document.createElement("div");
    cell.className = "daycell";
    if (i < season.dayIndex) cell.classList.add("done");
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = labels[i];
    const valDiv = document.createElement("div");
    valDiv.className = "val";
    const a = season.weekActions[i];
    if (a) {
      valDiv.textContent = a.action === "train" ? `훈련(${TRAININGS[a.detail]?.label.replace(" 훈련", "") ?? a.detail})`
        : a.action === "work" ? "일"
        : "휴식";
    } else {
      valDiv.textContent = i === season.dayIndex ? "선택중" : "-";
    }
    cell.appendChild(labelDiv);
    cell.appendChild(valDiv);
    strip.appendChild(cell);
  }
  // 주말
  for (let i = 5; i < 7; i++) {
    const cell = document.createElement("div");
    cell.className = "daycell weekend";
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = labels[i];
    const valDiv = document.createElement("div");
    valDiv.className = "val";
    valDiv.textContent = "경기";
    cell.appendChild(labelDiv);
    cell.appendChild(valDiv);
    strip.appendChild(cell);
  }
  panel.appendChild(strip);
  return panel;
}

// view-local UI 상태 (재렌더 사이에 유지)
let selectedCategory = "batter"; // "batter" | "pitcher"
let showAutoPanel = false;

const BATTER_TRAININGS = ["batting", "eye_drill", "running", "fielding", "weight"];
const PITCHER_TRAININGS = ["pitching", "breaking_drill", "weight", "mental"];

function renderActions(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h3");
  h.textContent = `오늘의 선택 — ${state.season.dayIndex + 1}일차`;
  panel.appendChild(h);

  const injured = !!state.player.injury;

  // 자동 모드 활성 시 배너
  if (state.autoMode) {
    const banner = document.createElement("div");
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.justifyContent = "space-between";
    banner.style.padding = "10px 12px";
    banner.style.marginBottom = "10px";
    banner.style.background = "rgba(255,184,78,0.08)";
    banner.style.border = "1px solid var(--accent-2)";
    banner.style.borderRadius = "8px";

    const label = document.createElement("div");
    label.innerHTML = `<strong style="color:var(--accent-2)">자동 모드</strong> · ${AUTO_PRESETS[state.autoMode]?.label ?? state.autoMode} 진행 중`;
    label.style.fontSize = "13px";
    banner.appendChild(label);

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "6px";

    const changeBtn = document.createElement("button");
    changeBtn.textContent = "프리셋 변경";
    changeBtn.style.padding = "6px 12px";
    changeBtn.style.fontSize = "12px";
    changeBtn.addEventListener("click", () => {
      showAutoPanel = true;
      route("weekly");
    });
    const offBtn = document.createElement("button");
    offBtn.textContent = "자동 해제";
    offBtn.className = "danger";
    offBtn.style.padding = "6px 12px";
    offBtn.style.fontSize = "12px";
    offBtn.addEventListener("click", () => {
      state.autoMode = null;
      saveGame();
      route("weekly");
    });
    btnRow.appendChild(changeBtn);
    btnRow.appendChild(offBtn);
    banner.appendChild(btnRow);
    panel.appendChild(banner);
  }

  // 자동 훈련 토글 버튼 (자동 모드 비활성 시에만 표시)
  if (!state.autoMode) {
    const autoBtn = document.createElement("button");
    autoBtn.textContent = showAutoPanel ? "자동 훈련 닫기" : "자동 훈련 — 프리셋 선택";
    autoBtn.style.width = "100%";
    autoBtn.style.marginBottom = "10px";
    autoBtn.style.borderColor = "var(--accent-2)";
    autoBtn.style.color = "var(--accent-2)";
    autoBtn.addEventListener("click", () => {
      showAutoPanel = !showAutoPanel;
      route("weekly");
    });
    panel.appendChild(autoBtn);
  }

  if (showAutoPanel) {
    panel.appendChild(renderAutoPanel(route));
  }

  // 카테고리 토글
  const catRow = document.createElement("div");
  catRow.style.display = "grid";
  catRow.style.gridTemplateColumns = "1fr 1fr";
  catRow.style.gap = "8px";
  catRow.style.marginTop = "8px";

  const batBtn = bigToggleButton("타자 훈련", selectedCategory === "batter", () => {
    selectedCategory = "batter";
    route("weekly");
  });
  const pitBtn = bigToggleButton("투수 훈련", selectedCategory === "pitcher", () => {
    selectedCategory = "pitcher";
    route("weekly");
  });
  if (injured) {
    batBtn.disabled = true;
    pitBtn.disabled = true;
  }
  catRow.appendChild(batBtn);
  catRow.appendChild(pitBtn);
  panel.appendChild(catRow);

  // 하위 훈련 버튼 그리드
  const subWrap = document.createElement("div");
  subWrap.style.marginTop = "12px";
  subWrap.style.padding = "12px";
  subWrap.style.background = "var(--panel-2)";
  subWrap.style.border = "1px solid var(--border)";
  subWrap.style.borderRadius = "8px";

  const subTitle = document.createElement("div");
  subTitle.className = "muted small";
  subTitle.style.marginBottom = "8px";
  subTitle.textContent = injured
    ? "부상 중에는 휴식만 가능합니다."
    : `${selectedCategory === "batter" ? "타자" : "투수"} — 종목을 선택하세요.`;
  subWrap.appendChild(subTitle);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(120px, 1fr))";
  grid.style.gap = "8px";

  const items = selectedCategory === "batter" ? BATTER_TRAININGS : PITCHER_TRAININGS;
  for (const key of items) {
    const t = TRAININGS[key];
    const b = trainingButton(t.label, `체력 ${t.stamina}`, injured, () => {
      const res = doDailyAction("train", key);
      handleActionResult(res, route);
    });
    grid.appendChild(b);
  }

  // 휴식 — 항상 노출
  const restBtn = trainingButton("휴식", "체력 +30~40", false, () => {
    const res = doDailyAction("rest");
    handleActionResult(res, route);
  }, /*isRest=*/true);
  grid.appendChild(restBtn);

  subWrap.appendChild(grid);
  panel.appendChild(subWrap);

  // 부상 안내
  if (injured) {
    const n = document.createElement("div");
    n.className = "notice bad";
    n.textContent = `부상 중 (${state.player.injury.type}, ${state.player.injury.weeksLeft}주)`;
    n.style.marginTop = "10px";
    panel.appendChild(n);
  }

  return panel;
}

function renderAutoPanel(route) {
  const wrap = document.createElement("div");
  wrap.style.padding = "12px";
  wrap.style.background = "var(--panel-2)";
  wrap.style.border = "1px solid var(--accent-2)";
  wrap.style.borderRadius = "8px";
  wrap.style.marginBottom = "12px";

  const title = document.createElement("div");
  title.className = "muted small";
  title.style.marginBottom = "10px";
  const remaining = 5 - state.season.dayIndex;
  title.textContent = `프리셋을 선택하면 남은 ${remaining}일을 자동 진행합니다.`;
  wrap.appendChild(title);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(160px, 1fr))";
  grid.style.gap = "8px";

  for (const [key, preset] of Object.entries(AUTO_PRESETS)) {
    const card = document.createElement("div");
    card.style.background = "var(--panel)";
    card.style.border = "1px solid var(--border)";
    card.style.borderRadius = "6px";
    card.style.padding = "10px";
    card.style.cursor = "pointer";
    card.style.transition = "border-color 120ms, transform 80ms";

    const lbl = document.createElement("div");
    lbl.style.fontWeight = "600";
    lbl.style.fontSize = "14px";
    lbl.textContent = preset.label;
    const desc = document.createElement("div");
    desc.className = "muted small";
    desc.style.marginTop = "4px";
    desc.style.lineHeight = "1.4";
    desc.textContent = preset.desc;

    card.appendChild(lbl);
    card.appendChild(desc);

    card.addEventListener("mouseenter", () => {
      card.style.borderColor = "var(--accent-2)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.borderColor = "var(--border)";
    });
    card.addEventListener("click", () => {
      state.autoMode = key;
      const summary = autoFillWeek(key);
      saveGame();
      showAutoPanel = false;
      route("weekly");
      const msgs = [`${preset.label} 자동 모드 ON`];
      if (summary.days.length > 0) msgs.push(`${summary.days.length}일 진행`);
      if (summary.crits > 0) msgs.push(`대성공 ${summary.crits}회`);
      if (summary.newInjury) msgs.push("부상 발생");
      showCriticalToast(msgs.join(" · "));
    });
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
}

function bigToggleButton(label, active, onClick) {
  const b = document.createElement("button");
  b.textContent = label;
  if (active) b.classList.add("primary");
  b.style.padding = "14px 12px";
  b.style.fontSize = "15px";
  b.addEventListener("click", onClick);
  return b;
}

function trainingButton(label, sub, disabled, onClick, isRest = false) {
  const b = document.createElement("button");
  b.style.display = "flex";
  b.style.flexDirection = "column";
  b.style.alignItems = "center";
  b.style.gap = "2px";
  b.style.padding = "10px 6px";
  if (isRest) {
    b.style.borderColor = "var(--good)";
    b.style.color = "var(--good)";
  }
  if (disabled) b.disabled = true;

  const t = document.createElement("span");
  t.textContent = label;
  t.style.fontSize = "13px";
  t.style.fontWeight = "600";
  const s = document.createElement("span");
  s.textContent = sub;
  s.style.fontSize = "11px";
  s.style.color = "var(--muted)";

  b.appendChild(t);
  b.appendChild(s);
  b.addEventListener("click", onClick);
  return b;
}

function handleActionResult(res, route) {
  if (!res.ok) {
    alert(`행동 실패: ${res.reason}`);
    return;
  }
  saveGame();
  route("weekly");
  if (res.critical) {
    showCriticalToast(`${res.label} 대성공! 효과 2배`);
  }
}

function showCriticalToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#3fb950",
    color: "#08111c",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "15px",
    boxShadow: "0 6px 20px rgba(63,185,80,0.4), 0 0 30px rgba(63,185,80,0.3)",
    zIndex: "1000",
    transition: "opacity 400ms, transform 400ms",
    pointerEvents: "none",
  });
  document.body.appendChild(t);
  // 입장 애니메이션
  requestAnimationFrame(() => {
    t.style.transform = "translateX(-50%) translateY(6px)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(-10px)";
  }, 1800);
  setTimeout(() => t.remove(), 2300);
}

function renderWeekendButton(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h3");
  h.textContent = "주말 — 경기 진행";
  panel.appendChild(h);
  const desc = document.createElement("p");
  desc.className = "muted small";
  if (state.autoMode) {
    desc.innerHTML = `자동 모드 (<strong style="color:var(--accent-2)">${AUTO_PRESETS[state.autoMode]?.label}</strong>) 활성. 경기 진행 후 다음 주 평일도 자동으로 채워집니다.<br>프리셋 변경/해제는 아래 버튼으로 가능합니다.`;
  } else {
    desc.textContent = "이번 주 평일이 모두 끝났습니다. 주말 경기를 자동 시뮬레이션합니다.";
  }
  panel.appendChild(desc);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = state.autoMode ? "주말 경기 진행 + 다음 주 자동 진행" : "주말 경기 진행";
  btn.style.marginTop = "10px";
  btn.addEventListener("click", () => {
    const r = endWeek();
    if (!r.ok) { alert(r.reason); return; }

    // 자동 모드면 다음 주 평일 자동 채움 (시즌 종료 안 된 경우)
    let autoSummary = null;
    if (state.autoMode && state.season && !state.season.finished) {
      autoSummary = autoFillWeek(state.autoMode);
    }

    saveGame();
    route("weekly");

    if (autoSummary && (autoSummary.crits > 0 || autoSummary.newInjury)) {
      const msgs = [`자동 진행 ${autoSummary.days.length}일`];
      if (autoSummary.crits > 0) msgs.push(`대성공 ${autoSummary.crits}회`);
      if (autoSummary.newInjury) msgs.push("부상 발생");
      showCriticalToast(msgs.join(" · "));
    }
  });
  panel.appendChild(btn);

  // 자동 모드 활성 시 변경/해제 버튼
  if (state.autoMode) {
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "10px";

    const changeBtn = document.createElement("button");
    changeBtn.textContent = "프리셋 변경";
    changeBtn.addEventListener("click", () => {
      showAutoPanel = true;
      route("weekly");
    });
    const offBtn = document.createElement("button");
    offBtn.textContent = "자동 해제";
    offBtn.className = "danger";
    offBtn.addEventListener("click", () => {
      state.autoMode = null;
      saveGame();
      route("weekly");
    });
    btnRow.appendChild(changeBtn);
    btnRow.appendChild(offBtn);
    panel.appendChild(btnRow);

    // 자동 모드 + 주말 상태에서 프리셋 변경 패널도 표시 가능
    if (showAutoPanel) {
      panel.appendChild(renderAutoPanel(route));
    }
  }

  return panel;
}

function renderStatsPanel(player) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h2");
  h.textContent = "능력치";
  panel.appendChild(h);

  const chances = appearanceChance(player);

  // 10각 레이더 차트 (타자5 + 투수5)
  const radarWrap = document.createElement("div");
  radarWrap.style.display = "flex";
  radarWrap.style.gap = "16px";
  radarWrap.style.alignItems = "center";
  radarWrap.style.flexWrap = "wrap";

  const radarBox = document.createElement("div");
  radarBox.style.flex = "0 0 auto";

  const labels = [...BATTER_STATS, ...PITCHER_STATS];
  const values = {};
  for (const s of BATTER_STATS) values[s] = player.batter[s];
  for (const s of PITCHER_STATS) values[s] = player.pitcher[s];

  const radarSvg = createRadarSVG(values, labels, {
    size: 300,
    min: 0,
    max: 150,
    labelMap: STAT_LABELS,
  });
  radarBox.appendChild(radarSvg);
  radarWrap.appendChild(radarBox);

  // 우측: 수치 + 출장률
  const numsCol = document.createElement("div");
  numsCol.style.flex = "1 1 200px";
  numsCol.style.minWidth = "200px";

  const batH = document.createElement("h3");
  batH.innerHTML = `타자 <span style="color:var(--accent); font-size:12px">출장률 ${Math.round(chances.bat * 100)}%</span>`;
  numsCol.appendChild(batH);
  for (const s of BATTER_STATS) {
    numsCol.appendChild(miniStatRow(STAT_LABELS[s], player.batter[s], "var(--accent)"));
  }

  const pitH = document.createElement("h3");
  const restNote = player.gamesSinceLastPitch === 0 ? " · 다음 경기 휴식" : "";
  pitH.innerHTML = `투수 <span style="color:var(--accent-2); font-size:12px">등판률 ${Math.round(chances.pitch * 100)}%${restNote}</span>`;
  pitH.style.marginTop = "12px";
  numsCol.appendChild(pitH);
  for (const s of PITCHER_STATS) {
    numsCol.appendChild(miniStatRow(STAT_LABELS[s], player.pitcher[s], "var(--accent-2)"));
  }

  radarWrap.appendChild(numsCol);
  panel.appendChild(radarWrap);

  // 시즌 성적
  panel.appendChild(renderSeasonLine(player));
  return panel;
}

function miniStatRow(label, value, color = "var(--accent)") {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.justifyContent = "space-between";
  row.style.alignItems = "center";
  row.style.padding = "2px 0";
  row.style.fontSize = "12px";
  const n = document.createElement("span");
  n.className = "muted";
  n.textContent = label;
  const v = document.createElement("span");
  v.style.color = color;
  v.style.fontWeight = "600";
  v.style.fontVariantNumeric = "tabular-nums";
  v.textContent = Math.round(value);
  row.appendChild(n);
  row.appendChild(v);
  return row;
}

function statRow(label, value) {
  const row = document.createElement("div");
  row.className = "stat-row";
  const n = document.createElement("div");
  n.className = "stat-name"; n.textContent = label;
  const bar = document.createElement("div");
  bar.className = "stat-bar";
  const fill = document.createElement("div");
  fill.className = "stat-fill";
  fill.style.width = `${Math.min(100, value)}%`;
  bar.appendChild(fill);
  const v = document.createElement("div");
  v.className = "stat-val";
  v.textContent = Math.round(value);
  row.appendChild(n); row.appendChild(bar); row.appendChild(v);
  return row;
}

function renderSeasonLine(player) {
  const s = player.seasonStats;
  const ba = s.ab > 0 ? (s.h / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  const obp = (s.ab + s.bb) > 0 ? ((s.h + s.bb) / (s.ab + s.bb)).toFixed(3).replace(/^0/, "") : ".---";
  const slg = s.ab > 0 ? (s.tb / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  const era = s.ip > 0 ? ((s.er / s.ip) * 9).toFixed(2) : "-";

  const wrap = document.createElement("div");
  wrap.style.marginTop = "12px";
  const h = document.createElement("h3");
  h.textContent = "시즌 성적";
  wrap.appendChild(h);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(infoBlock("경기", s.games));
  row.appendChild(infoBlock("타석", s.pa));
  row.appendChild(infoBlock("안타", s.h));
  row.appendChild(infoBlock("홈런", s.hr));
  row.appendChild(infoBlock("타율", ba));
  row.appendChild(infoBlock("OPS", (s.ab > 0 ? (parseFloat("0" + obp) + parseFloat("0" + slg)).toFixed(3) : "-")));
  if (s.pitchG > 0) {
    row.appendChild(infoBlock("투수 등판", s.pitchG));
    row.appendChild(infoBlock("이닝", s.ip));
    row.appendChild(infoBlock("ERA", era));
    row.appendChild(infoBlock("K", s.pK));
  }
  wrap.appendChild(row);
  return wrap;
}

function renderLastWeekResults(results) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h2");
  h.textContent = "지난 주 경기 결과";
  panel.appendChild(h);

  for (const r of results) {
    const line = document.createElement("div");
    line.style.padding = "6px 0";
    line.style.borderBottom = "1px solid var(--border)";
    const isMyGame = !!r.mainPlayer;
    const text = `${r.away.team.name} ${r.away.score} : ${r.home.score} ${r.home.team.name}`;
    line.innerHTML = `<span class="${isMyGame ? "big" : ""}">${text}</span>`;
    if (isMyGame) {
      const mp = r.mainPlayer;
      const detail = document.createElement("div");
      detail.style.marginTop = "4px";
      detail.style.display = "flex";
      detail.style.flexDirection = "column";
      detail.style.gap = "2px";

      if (mp.batterBox && mp.batterBox.pa > 0) {
        const batEvents = (mp.events ?? []).filter(e => e.role === "batter").map(e => e.desc).join(" / ");
        const b = mp.batterBox;
        const bLine = document.createElement("div");
        bLine.className = "muted small";
        bLine.innerHTML = `<span style="color:var(--accent)">[타]</span> ${b.pa}타석 ${b.h}안타 ${b.hr}홈런 ${b.k}삼진${batEvents ? ` — ${batEvents}` : ""}`;
        detail.appendChild(bLine);
      }
      if (mp.pitcherBox) {
        const p = mp.pitcherBox;
        const pLine = document.createElement("div");
        pLine.className = "muted small";
        pLine.innerHTML = `<span style="color:var(--accent-2)">[투]</span> 9이닝 ${p.er ?? 0}자책 ${p.pK ?? 0}K ${p.pBB ?? 0}BB ${p.pH ?? 0}피안타`;
        detail.appendChild(pLine);
      }
      line.appendChild(detail);
    }
    panel.appendChild(line);
  }
  return panel;
}

function renderStandings(league) {
  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h2");
  h.textContent = "리그 순위";
  panel.appendChild(h);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>#</th><th>팀</th><th>W</th><th>L</th><th>T</th><th>승률</th></tr>";
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const sorted = standings(league);
  sorted.forEach((t, i) => {
    const tr = document.createElement("tr");
    if (t.isPlayerTeam) tr.className = "me";
    const total = t.record.w + t.record.l;
    const pct = total > 0 ? (t.record.w / total).toFixed(3).replace(/^0/, "") : ".---";
    tr.innerHTML = `<td>${i + 1}</td><td>${t.name}</td><td class="num">${t.record.w}</td><td class="num">${t.record.l}</td><td class="num">${t.record.t}</td><td class="num">${pct}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  panel.appendChild(table);
  return panel;
}

// ─────────────── 시즌 종료 ───────────────
function renderSeasonEnd(root, route) {
  root.innerHTML = "";
  const { player, league, season } = state;
  const wrap = document.createElement("div");
  wrap.className = "stack";

  const panel = document.createElement("section");
  panel.className = "panel";
  const h = document.createElement("h2");
  h.textContent = `${player.grade}학년 시즌 종료`;
  panel.appendChild(h);

  const s = player.seasonStats;
  const ba = s.ab > 0 ? (s.h / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  const era = s.ip > 0 ? ((s.er / s.ip) * 9).toFixed(2) : "-";

  const summary = document.createElement("div");
  summary.className = "row";
  summary.appendChild(infoBlock("경기", s.games));
  summary.appendChild(infoBlock("타율", ba));
  summary.appendChild(infoBlock("홈런", s.hr));
  summary.appendChild(infoBlock("ERA", era));
  summary.appendChild(infoBlock("종합", overallScore(player).toFixed(1)));

  const team = getPlayerTeam(league);
  if (team) summary.appendChild(infoBlock("팀 성적", `${team.record.w}승 ${team.record.l}패`));

  panel.appendChild(summary);

  // 순위표
  panel.appendChild(renderStandings(league));

  // 진행 버튼
  const isGraduation = player.stage === "high" && player.grade >= 3;

  if (state.career?.ended) {
    const note = document.createElement("div");
    note.className = "notice";
    note.textContent = "고교 졸업! (Phase 1에서는 여기까지) Phase 3에서 드래프트/대학/프로 분기가 추가됩니다.";
    panel.appendChild(note);
    const btn = document.createElement("button");
    btn.textContent = "메인 메뉴로";
    btn.addEventListener("click", () => route("menu"));
    panel.appendChild(btn);
  } else if (isGraduation) {
    const note = document.createElement("div");
    note.className = "notice";
    note.textContent = "고교 3학년 시즌까지 마쳤습니다. 졸업으로 넘어갑니다.";
    note.style.marginTop = "12px";
    panel.appendChild(note);
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "졸업";
    btn.style.marginTop = "12px";
    btn.addEventListener("click", () => {
      advanceToNextSeason();
      transitionAfterSeason(); // grade > 3 → career.ended 처리됨
      state.autoMode = null;
      showAutoPanel = false;
      saveGame();
      route("weekly");
    });
    panel.appendChild(btn);
  } else {
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = `${player.grade + 1}학년 시즌 시작`;
    btn.style.marginTop = "12px";
    btn.addEventListener("click", () => {
      advanceToNextSeason();
      transitionAfterSeason();
      // 학년 변경 시 자동 모드 해제 (사용자가 새 학년에서 다시 선택)
      state.autoMode = null;
      showAutoPanel = false;
      saveGame();
      route("weekly");
    });
    panel.appendChild(btn);
  }

  wrap.appendChild(panel);
  root.appendChild(wrap);
}
