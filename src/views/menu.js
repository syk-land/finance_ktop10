// 메인 메뉴 + 캐릭터 생성 (이미지/레이더/캐릭터 자세 포함)
import { state, hasSave, loadGame, deleteSave, saveGame, resetState } from "../state.js";
import { createPlayer, TALENTS, STAT_LABELS, BATTER_STATS, PITCHER_STATS } from "../systems/player.js";
import { startHighSchoolCareer } from "../systems/career.js";
import { FACES, createFaceSVG } from "../render/avatars.js";
import { createCharacterSVG } from "../render/character.js";
import { createRadarSVG } from "../render/radar.js";
import { createGameDate } from "../systems/tick.js";

// 신규 게임 입력 상태 (라이브 갱신용)
const draft = {
  name: "심용기",
  talent: "all_round",
  hand: "right",
  faceId: "f1",
};

export function renderMenu(root, route) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  if (hasSave()) {
    wrap.appendChild(renderLoadPanel(route));
  }

  wrap.appendChild(renderCreatePanel(route));

  root.appendChild(wrap);
}

function renderLoadPanel(route) {
  const panel = panelEl("이어하기");
  const t = document.createElement("p");
  t.className = "muted small";
  t.style.margin = "0";
  t.textContent = "이전에 저장된 게임이 있습니다.";
  panel.appendChild(t);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.marginTop = "10px";

  const loadBtn = button("이어하기", "primary", () => {
    if (loadGame()) route("weekly");
  });
  const delBtn = button("세이브 삭제", "danger", () => {
    if (confirm("정말 세이브를 삭제할까요?")) {
      deleteSave();
      route("menu");
    }
  });
  row.appendChild(loadBtn);
  row.appendChild(delBtn);
  panel.appendChild(row);
  return panel;
}

function renderCreatePanel(route) {
  const panel = panelEl("새 게임 — 캐릭터 생성");

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "minmax(0, 1fr) minmax(0, 1.2fr)";
  grid.style.gap = "20px";
  grid.style.alignItems = "start";

  // 왼쪽: 캐릭터 미리보기
  const previewCol = document.createElement("div");
  previewCol.id = "preview-col";
  previewCol.appendChild(renderPreview());

  // 오른쪽: 입력 폼
  const formCol = document.createElement("div");
  formCol.className = "stack";
  formCol.appendChild(renderNameField());
  formCol.appendChild(renderFaceGallery());
  formCol.appendChild(renderHandField());
  formCol.appendChild(renderTalentField());
  formCol.appendChild(renderRadar());

  const startBtn = button("게임 시작", "primary", () => {
    const name = draft.name.trim() || "주인공";
    resetState();
    state.player = createPlayer({
      name,
      talent: draft.talent,
      hand: draft.hand,
      faceId: draft.faceId,
    });
    startHighSchoolCareer(name, draft.talent, null);
    state.gameDate = createGameDate();
    state.paused = true; // 사용자가 재생 누를 때까지 대기
    saveGame();
    route("weekly");
  });
  startBtn.style.marginTop = "8px";
  formCol.appendChild(startBtn);

  grid.appendChild(previewCol);
  grid.appendChild(formCol);
  panel.appendChild(grid);
  return panel;
}

function refreshPreview() {
  const col = document.getElementById("preview-col");
  if (!col) return;
  col.innerHTML = "";
  col.appendChild(renderPreview());
}

function refreshRadar() {
  const slot = document.getElementById("talent-radar");
  if (!slot) return;
  slot.innerHTML = "";
  slot.appendChild(buildRadar());
}

function renderPreview() {
  const card = document.createElement("div");
  card.style.background = "var(--panel-2)";
  card.style.border = "1px solid var(--border)";
  card.style.borderRadius = "8px";
  card.style.padding = "12px";
  card.style.textAlign = "center";

  const charSVG = createCharacterSVG(draft.faceId, draft.hand, { w: 220, h: 280 });
  card.appendChild(charSVG);

  const name = document.createElement("div");
  name.style.marginTop = "8px";
  name.style.fontSize = "16px";
  name.style.fontWeight = "600";
  name.textContent = draft.name || "주인공";
  card.appendChild(name);

  const meta = document.createElement("div");
  meta.className = "muted small";
  meta.style.marginTop = "4px";
  meta.textContent = `${TALENTS[draft.talent].label} · 16세 · 고교 1학년`;
  card.appendChild(meta);

  return card;
}

function renderNameField() {
  const wrap = document.createElement("div");
  wrap.appendChild(label("이름"));
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "예: 심용기";
  input.value = draft.name;
  input.style.width = "100%";
  input.addEventListener("input", e => {
    draft.name = e.target.value;
    refreshPreview();
  });
  wrap.appendChild(input);
  return wrap;
}

function renderFaceGallery() {
  const wrap = document.createElement("div");
  wrap.appendChild(label("얼굴 선택"));

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(6, 1fr)";
  row.style.gap = "6px";

  for (const face of FACES) {
    const cell = document.createElement("div");
    cell.style.background = "var(--panel-2)";
    cell.style.border = "1.5px solid var(--border)";
    cell.style.borderRadius = "8px";
    cell.style.padding = "4px";
    cell.style.cursor = "pointer";
    cell.style.transition = "border-color 120ms";
    cell.style.textAlign = "center";
    if (draft.faceId === face.id) cell.style.borderColor = "var(--accent)";

    cell.appendChild(createFaceSVG(face.id, 56));

    const lbl = document.createElement("div");
    lbl.className = "small muted";
    lbl.style.marginTop = "2px";
    lbl.textContent = face.label;
    cell.appendChild(lbl);

    cell.addEventListener("click", () => {
      draft.faceId = face.id;
      refreshPreview();
      // 갤러리 테두리 갱신
      const all = row.querySelectorAll("div");
      for (const el of row.children) {
        el.style.borderColor = "var(--border)";
      }
      cell.style.borderColor = "var(--accent)";
    });
    row.appendChild(cell);
  }
  wrap.appendChild(row);
  return wrap;
}

function renderHandField() {
  const wrap = document.createElement("div");
  wrap.appendChild(label("타격/투구 손 (자세 변경)"));
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  const options = [
    ["right", "우투우타"],
    ["left", "좌투좌타"],
    ["mixed", "우투좌타"],
    ["lefty_rb", "좌투우타"],
  ];
  for (const [val, lbl] of options) {
    const btn = document.createElement("button");
    btn.textContent = lbl;
    btn.style.flex = "1";
    if (draft.hand === val) btn.classList.add("primary");
    btn.addEventListener("click", () => {
      draft.hand = val;
      // 모든 버튼 갱신
      for (const b of row.children) b.classList.remove("primary");
      btn.classList.add("primary");
      refreshPreview();
    });
    row.appendChild(btn);
  }
  wrap.appendChild(row);
  return wrap;
}

function renderTalentField() {
  const wrap = document.createElement("div");
  wrap.appendChild(label("재능 타입 (훈련 효율에 영향)"));
  const select = document.createElement("select");
  select.style.width = "100%";
  for (const [key, t] of Object.entries(TALENTS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${t.label} — ${describeBoost(t.boost)}`;
    select.appendChild(opt);
  }
  select.value = draft.talent;
  select.addEventListener("change", e => {
    draft.talent = e.target.value;
    refreshPreview();
    refreshRadar();
  });
  wrap.appendChild(select);
  return wrap;
}

function describeBoost(boost) {
  const ups = Object.entries(boost)
    .filter(([, v]) => v > 1.0)
    .map(([k, v]) => `${STAT_LABELS[k] ?? k} ×${v}`)
    .join(", ");
  return ups;
}

function renderRadar() {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "8px";
  const lbl = label("재능 분포 (훈련 효율 배수)");
  wrap.appendChild(lbl);

  const slot = document.createElement("div");
  slot.id = "talent-radar";
  slot.style.display = "flex";
  slot.style.justifyContent = "center";
  slot.style.background = "var(--panel-2)";
  slot.style.border = "1px solid var(--border)";
  slot.style.borderRadius = "8px";
  slot.style.padding = "8px";
  slot.appendChild(buildRadar());
  wrap.appendChild(slot);
  return wrap;
}

function buildRadar() {
  // 10개 능력치 합쳐서 표시 (타자 5 + 투수 5)
  const labels = [...BATTER_STATS, ...PITCHER_STATS];
  const boost = TALENTS[draft.talent].boost;
  const values = {};
  for (const k of labels) {
    values[k] = boost[k] ?? 1.0;
  }
  return createRadarSVG(values, labels, { size: 260, labelMap: STAT_LABELS });
}

// ─────── 헬퍼 ───────
function panelEl(title) {
  const p = document.createElement("section");
  p.className = "panel";
  const h = document.createElement("h2");
  h.textContent = title;
  p.appendChild(h);
  return p;
}
function label(s) {
  const l = document.createElement("label");
  l.textContent = s;
  return l;
}
function button(t, cls = "", onClick) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = t;
  b.addEventListener("click", onClick);
  return b;
}
