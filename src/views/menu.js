// 메인 메뉴 + 캐릭터 생성 (이미지/레이더/캐릭터 자세 포함)
//
// i18n: 사용자 표시 문자열은 모두 t() 호출.
// 캐릭터 이름은 사용자 입력 그대로 저장 (locale 토글해도 변경되지 않음).

import { state, hasSave, loadGame, deleteSave, saveGame, resetState, resetAllData, getLocalSavedAt } from "../state.js";
import { createPlayer, TALENTS } from "../systems/player.js";
import { startHighSchoolCareer } from "../systems/career.js";
import { consumeLoadoutForCharacter, loadRegressionMeta } from "../systems/regression.js";
import { loadFromCloud, getCloudSaveMeta, deleteFromCloud } from "../cloud/cloudSave.js";
import { isSignedIn, isAnonymousUser, linkAnonToGoogle, signOutCloud } from "../cloud/auth.js";
import { FACES, createFaceSVG } from "../render/avatars.js";
import { createCharacterSVG } from "../render/character.js";
import { createGameDate } from "../systems/tick.js";
import { t, getLocale } from "../i18n/index.js";
import { resetWeeklyCarousel } from "./weekly.js";

// 신규 게임 입력 상태 (라이브 갱신용)
// talents: 회귀 talentSlots 확장 시 추가 슬롯 키 — 첫번째는 draft.talent, 그 외는 talents[1..N].
const draft = {
  name: "",
  talent: "all_round",
  talents: ["all_round"],
  hand: "right",
  faceId: "f1",
};

// 회귀 메타 기준 현재 총 재능 슬롯 수 (기본 1 + 영구 구매 N).
function totalTalentSlots() {
  if (!state.regression) loadRegressionMeta();
  return 1 + (state.regression?.permanentPurchases?.talentSlots ?? 0);
}

// draft.talents 배열을 슬롯 수에 맞게 정규화 (부족 시 첫 항목 복제 / 초과 시 자르기).
function syncDraftTalents() {
  const n = totalTalentSlots();
  const list = [...draft.talents];
  // 첫번째는 draft.talent 와 항상 동기화
  list[0] = draft.talent;
  while (list.length < n) list.push(draft.talent);
  list.length = n;
  draft.talents = list;
}

// 이어하기 모달 — 한 번 닫으면 다시 안 뜸 (페이지 새로고침으로 리셋)
let loadModalDismissed = false;

// 클라우드 세이브 메타 캐시 — 세션당 1회 조회로 read 절감.
// null: 미조회 / undefined: 조회중 / { exists, clientLastSaved }
let cloudMetaCache = null;

// 상대 시간 ("3분 전", "어제", "2일 전") — 충돌 모달 표시용.
function relativeTime(ts) {
  if (!ts) return t("menu.unknownTime");
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1)  return t("menu.justNow");
  if (min < 60) return t("menu.minAgo", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24)  return t("menu.hourAgo", { n: hr });
  const day = Math.floor(hr / 24);
  return t("menu.dayAgo", { n: day });
}

export function renderMenu(root, route) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";
  // Google 계정 연동 / 로그인 상태 표시 — Firebase 활성일 때만.
  if (isSignedIn()) {
    wrap.appendChild(renderAuthPanel(route));
  }
  // 회귀 메타가 1회 이상 적립된 경우만 상점 진입 노출
  const m = state.regression;
  if (m && (m.totalEarned > 0 || m.balance > 0 || m.runs > 0)) {
    wrap.appendChild(renderShopEntryPanel(route));
  }
  // 로컬 세이브가 없고 클라우드 인증되어 있으면 ☁️ 클라우드 로드 패널 — 새 기기에서 이어할 수 있게.
  if (!hasSave() && isSignedIn()) {
    wrap.appendChild(renderCloudLoadPanel(route));
  }
  wrap.appendChild(renderCreatePanel(route));
  wrap.appendChild(renderResetPanel(route));
  root.appendChild(wrap);

  // 세이브가 있으면 모달 오버레이로 이어하기 노출
  if (hasSave() && !loadModalDismissed) {
    root.appendChild(renderLoadModal(route));
  }
}

function renderAuthPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const row = document.createElement("div");
  row.style.cssText = "display:flex; align-items:center; gap:8px;";

  const left = document.createElement("div");
  left.style.cssText = "flex:1; min-width:0;";

  const user = state.cloudUser;
  const isAnon = isAnonymousUser();

  const title = document.createElement("div");
  title.style.cssText = "font-weight:700; font-size:13px; margin-bottom:2px;";
  title.textContent = isAnon ? t("auth.anonymousTitle") : (user?.displayName ?? user?.email ?? t("auth.signedInTitle"));
  if (!isAnon) title.style.color = "var(--accent)";
  left.appendChild(title);

  const sub = document.createElement("div");
  sub.className = "muted small";
  sub.style.cssText = "font-size:11px;";
  sub.textContent = isAnon ? t("auth.anonymousDesc") : (user?.email ?? "");
  left.appendChild(sub);

  row.appendChild(left);

  if (isAnon) {
    const linkBtn = document.createElement("button");
    linkBtn.type = "button";
    linkBtn.className = "primary";
    linkBtn.textContent = t("auth.linkGoogle");
    linkBtn.style.cssText = "padding:8px 12px; font-size:12px; font-weight:700; flex-shrink:0;";
    linkBtn.addEventListener("click", async () => {
      linkBtn.disabled = true;
      linkBtn.textContent = t("auth.linking");
      // redirect 방식 — 정상이면 페이지 전체 리로드. 결과 분기는 initAuth/getRedirectResult 에서.
      // credential-already-in-use 폴백도 initAuth 안에서 자동 처리.
      const result = await linkAnonToGoogle();
      if (result.ok && result.alreadyLinked) {
        location.reload();
        return;
      }
      // redirect 성공이면 여기 도달 안 함. 실패 시에만.
      linkBtn.disabled = false;
      linkBtn.textContent = t("auth.linkGoogle");
      alert(t("auth.linkFailed"));
    });
    row.appendChild(linkBtn);
  } else {
    const signOutBtn = document.createElement("button");
    signOutBtn.type = "button";
    signOutBtn.textContent = t("auth.signOut");
    signOutBtn.style.cssText = "padding:8px 10px; font-size:11px; flex-shrink:0;";
    signOutBtn.addEventListener("click", async () => {
      if (!confirm(t("auth.confirmSignOut"))) return;
      signOutBtn.disabled = true;
      await signOutCloud();
      location.reload();
    });
    row.appendChild(signOutBtn);
  }

  panel.appendChild(row);
  return panel;
}

function renderCloudLoadPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const row = document.createElement("div");
  row.style.cssText = "display:flex; align-items:center; gap:8px;";

  const label = document.createElement("div");
  label.className = "muted small";
  label.style.cssText = "flex:1; font-size:11px;";
  label.textContent = t("cloud.loadBtn");
  row.appendChild(label);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "primary";
  btn.textContent = t("cloud.loadBtn");
  btn.style.cssText = "padding:8px 12px; font-size:12px; font-weight:700;";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = t("cloud.loading");
    const result = await loadFromCloud();
    if (result.ok) {
      location.reload();
    } else {
      btn.disabled = false;
      btn.textContent = t("cloud.loadBtn");
      const reasonMap = {
        not_found: t("cloud.notFound"),
        firebase_not_ready: t("cloud.notReady"),
        not_signed_in: t("cloud.notSignedIn"),
      };
      alert(reasonMap[result.reason] ?? t("cloud.loadFailed"));
    }
  });
  row.appendChild(btn);

  panel.appendChild(row);
  return panel;
}

// 전체 데이터 초기화 — 세이브/회귀/설정 전부 삭제 (locale 유지).
// 로그인 상태면 클라우드 문서도 삭제. 되돌릴 수 없으므로 danger confirm 모달 경유.
function renderResetPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("menu.resetAllDesc");
  panel.appendChild(desc);

  const btn = button(t("menu.resetAll"), "danger", () => {
    const cloudIncluded = isSignedIn();
    showConfirmModal({
      title: t("menu.resetAll"),
      message: cloudIncluded ? t("menu.confirmResetAllCloud") : t("menu.confirmResetAll"),
      confirmLabel: t("menu.resetAll"),
      cancelLabel: t("common.cancel"),
      danger: true,
      onConfirm: async () => {
        // 클라우드 문서 먼저 삭제 시도 — 실패해도 로컬 초기화는 진행.
        if (cloudIncluded) {
          const r = await deleteFromCloud();
          if (!r.ok && r.reason !== "not_found") {
            console.warn("[reset] cloud delete failed:", r.reason);
          }
        }
        resetAllData();
        location.reload();
      },
    });
  });
  btn.style.width = "100%";
  btn.style.padding = "10px";
  btn.style.fontSize = "13px";
  panel.appendChild(btn);

  return panel;
}

function renderShopEntryPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;

  const row = document.createElement("div");
  row.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";

  const left = document.createElement("div");
  left.style.cssText = "flex:1; min-width:0;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:700; font-size:13px; color:var(--accent); margin-bottom:2px;";
  title.textContent = t("shop.title");
  left.appendChild(title);
  const sub = document.createElement("div");
  sub.className = "muted small";
  sub.style.cssText = "font-size:11px;";
  sub.textContent = t("regression.menuBalance", { balance: m.balance, runs: m.runs });
  left.appendChild(sub);
  row.appendChild(left);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.type = "button";
  btn.textContent = t("regression.enterShop");
  btn.style.cssText = "padding:10px 12px; font-size:12px; font-weight:700; flex-shrink:0;";
  btn.addEventListener("click", () => route("shop"));
  row.appendChild(btn);

  panel.appendChild(row);
  return panel;
}

function renderLoadModal(route) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";

  // 닫기 버튼 (X)
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => {
    loadModalDismissed = true;
    backdrop.remove();
  });
  dialog.appendChild(closeBtn);

  const h = document.createElement("h2");
  h.textContent = t("menu.continueTitle");
  dialog.appendChild(h);

  const hint = document.createElement("p");
  hint.className = "muted small";
  hint.style.margin = "0 0 14px";
  hint.textContent = t("menu.continueHint");
  dialog.appendChild(hint);

  // 로컬 세이브 timestamp + 클라우드 비교 영역 (Phase C)
  const localSavedAt = getLocalSavedAt();
  const compareBox = document.createElement("div");
  compareBox.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:8px; margin-bottom:8px; font-size:11px; line-height:1.5;";

  const localLine = document.createElement("div");
  localLine.innerHTML = `<span class="muted">💾 ${t("menu.localSave")}:</span> <strong>${relativeTime(localSavedAt)}</strong>`;
  compareBox.appendChild(localLine);

  const cloudLine = document.createElement("div");
  cloudLine.dataset.tb = "cloud-line";
  cloudLine.innerHTML = `<span class="muted">☁️ ${t("menu.cloudSave")}:</span> <span class="muted">${t("cloud.loading")}</span>`;
  compareBox.appendChild(cloudLine);

  dialog.appendChild(compareBox);

  // 비동기 조회 — 1 read.
  if (isSignedIn()) {
    (cloudMetaCache !== null
      ? Promise.resolve(cloudMetaCache)
      : getCloudSaveMeta().then(m => { cloudMetaCache = m; return m; }))
      .then(m => {
        if (!m || !m.exists) {
          cloudLine.innerHTML = `<span class="muted">☁️ ${t("menu.cloudSave")}:</span> <span class="muted">${t("cloud.notFound")}</span>`;
          return;
        }
        const cloudWhen = relativeTime(m.clientLastSaved);
        let badge = "";
        if (localSavedAt && m.clientLastSaved) {
          if (m.clientLastSaved > localSavedAt + 60000) {
            badge = ` <span style="color:var(--good);">· ${t("menu.cloudNewer")}</span>`;
          } else if (localSavedAt > m.clientLastSaved + 60000) {
            badge = ` <span style="color:var(--accent);">· ${t("menu.localNewer")}</span>`;
          }
        }
        cloudLine.innerHTML = `<span class="muted">☁️ ${t("menu.cloudSave")}:</span> <strong>${cloudWhen}</strong>${badge}`;
      });
  } else {
    cloudLine.innerHTML = `<span class="muted">☁️ ${t("menu.cloudSave")}:</span> <span class="muted">${t("cloud.notSignedIn")}</span>`;
  }

  const loadBtn = button(t("menu.continueBtn"), "primary", () => {
    if (loadGame()) {
      loadModalDismissed = true;
      resetWeeklyCarousel();
      route("weekly");
    }
  });
  loadBtn.style.width = "100%";
  loadBtn.style.padding = "12px";
  loadBtn.style.fontSize = "15px";
  loadBtn.style.marginBottom = "8px";
  dialog.appendChild(loadBtn);

  // ☁️ 클라우드에서 불러오기 — Firebase 로그인 상태일 때만 노출.
  // 로컬 세이브를 덮어쓸 수 있으니 확인 모달.
  if (isSignedIn()) {
    const cloudBtn = button(t("cloud.loadBtn"), "", async () => {
      // 로컬이 클라우드보다 명백히 더 새것이면 (60초 이상) confirm.
      const meta = cloudMetaCache ?? await getCloudSaveMeta();
      const localTs = getLocalSavedAt();
      if (meta?.exists && localTs && meta.clientLastSaved && localTs > meta.clientLastSaved + 60000) {
        if (!confirm(t("cloud.confirmOverwriteLocal"))) return;
      }
      cloudBtn.disabled = true;
      cloudBtn.textContent = t("cloud.loading");
      const result = await loadFromCloud();
      if (result.ok) {
        location.reload();
      } else {
        cloudBtn.disabled = false;
        cloudBtn.textContent = t("cloud.loadBtn");
        const reasonMap = {
          not_found:    t("cloud.notFound"),
          not_signed_in: t("cloud.notSignedIn"),
          firebase_not_ready: t("cloud.notReady"),
        };
        alert(reasonMap[result.reason] ?? t("cloud.loadFailed"));
      }
    });
    cloudBtn.style.width = "100%";
    cloudBtn.style.padding = "10px";
    cloudBtn.style.fontSize = "13px";
    cloudBtn.style.marginBottom = "8px";
    dialog.appendChild(cloudBtn);
  }

  const delBtn = button(t("menu.deleteSave"), "danger", () => {
    showConfirmModal({
      title: t("menu.deleteSave"),
      message: t("menu.confirmDelete"),
      confirmLabel: t("menu.deleteSave"),
      cancelLabel: t("common.cancel"),
      danger: true,
      onConfirm: () => {
        deleteSave();
        loadModalDismissed = true;
        route("menu");
      },
    });
  });
  delBtn.style.width = "100%";
  delBtn.style.padding = "10px";
  delBtn.style.fontSize = "13px";
  dialog.appendChild(delBtn);

  backdrop.appendChild(dialog);

  // backdrop 클릭 시 닫기 (다이얼로그 내부 클릭은 통과)
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) {
      loadModalDismissed = true;
      backdrop.remove();
    }
  });

  return backdrop;
}

// 재사용 가능한 confirm 모달 — body 에 직접 append (다른 모달 위에 겹쳐 노출).
// 확인 클릭 시 onConfirm 실행 후 자기 자신만 제거 (배경 모달은 유지).
function showConfirmModal({ title, message, confirmLabel, cancelLabel, danger, onConfirm }) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";

  const h = document.createElement("h2");
  h.textContent = title;
  dialog.appendChild(h);

  if (message) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.style.margin = "0 0 14px";
    p.style.lineHeight = "1.4";
    p.textContent = message;
    dialog.appendChild(p);
  }

  const btnRow = document.createElement("div");
  btnRow.style.display = "grid";
  btnRow.style.gridTemplateColumns = "1fr 1fr";
  btnRow.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = cancelLabel ?? t("common.cancel");
  cancelBtn.style.padding = "12px";
  cancelBtn.style.fontSize = "14px";
  cancelBtn.addEventListener("click", () => backdrop.remove());

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = danger ? "danger" : "primary";
  confirmBtn.textContent = confirmLabel ?? t("common.confirm");
  confirmBtn.style.padding = "12px";
  confirmBtn.style.fontSize = "14px";
  confirmBtn.style.fontWeight = "700";
  confirmBtn.addEventListener("click", () => {
    backdrop.remove();
    onConfirm?.();
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  dialog.appendChild(btnRow);
  backdrop.appendChild(dialog);

  // backdrop 클릭 시 취소
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) backdrop.remove();
  });

  document.body.appendChild(backdrop);
}

function renderCreatePanel(route) {
  const panel = panelEl(t("menu.newGameTitle"));

  // 안드로이드 portrait(~412px) 기준 — 세로 stack
  // 순서: 이름 → 얼굴 → 자세 → 재능 → 캐릭터 미리보기 → 시작
  const col = document.createElement("div");
  col.className = "stack";
  col.style.gap = "8px"; // 한 화면 안에 들어오도록 간격 축소

  col.appendChild(renderNameField());
  col.appendChild(renderFaceGallery());
  col.appendChild(renderHandField());
  col.appendChild(renderTalentField());

  // 캐릭터 미리보기 (선택 결과를 한 눈에 — refreshPreview 가 갱신)
  const previewWrap = document.createElement("div");
  previewWrap.id = "preview-col";
  previewWrap.appendChild(renderPreview());
  col.appendChild(previewWrap);

  // 시작 버튼 (가로 100%)
  const startBtn = button(t("menu.startBtn"), "primary", () => {
    const name = draft.name.trim() || t("menu.defaultName");
    syncDraftTalents();
    // 회귀 로드아웃 — 캐릭터당 1회용. 생성 직전 snapshot 뜨고 resetLoadout 실행.
    const loadout = state.regression
      ? consumeLoadoutForCharacter()
      : { startingStat: null, traits: [], relics: [] };
    resetState();
    state.player = createPlayer({
      name,
      talent: draft.talent,
      talents: draft.talents,
      hand: draft.hand,
      faceId: draft.faceId,
      startingStat: loadout.startingStat,
      traits: loadout.traits,
      relics: loadout.relics,
      relicLevels: loadout.relicLevels,
    });
    startHighSchoolCareer(name, draft.talent, null);
    state.gameDate = createGameDate();
    state.autoMode = "two_way";
    state.paused = true;
    resetWeeklyCarousel();
    saveGame();
    route("weekly");
  });
  startBtn.style.marginTop = "8px";
  startBtn.style.width = "100%";
  startBtn.style.padding = "12px";
  startBtn.style.fontSize = "15px";
  col.appendChild(startBtn);

  panel.appendChild(col);
  return panel;
}

function refreshPreview() {
  const col = document.getElementById("preview-col");
  if (!col) return;
  col.innerHTML = "";
  col.appendChild(renderPreview());
}

function renderPreview() {
  const card = document.createElement("div");
  card.style.background = "var(--panel-2)";
  card.style.border = "1px solid var(--border)";
  card.style.borderRadius = "8px";
  card.style.padding = "8px";
  card.style.textAlign = "center";

  // 안드로이드 폭에 맞게 캐릭터 SVG 작게
  const charSVG = createCharacterSVG(draft.faceId, draft.hand, { w: 160, h: 200 });
  card.appendChild(charSVG);

  const name = document.createElement("div");
  name.style.marginTop = "4px";
  name.style.fontSize = "14px";
  name.style.fontWeight = "600";
  name.textContent = draft.name || t("menu.defaultName");
  card.appendChild(name);

  const meta = document.createElement("div");
  meta.className = "muted small";
  meta.style.marginTop = "2px";
  meta.style.fontSize = "11px";
  meta.textContent = t("menu.previewMeta", { talent: t("talent." + draft.talent) });
  card.appendChild(meta);

  return card;
}

function renderNameField() {
  const wrap = document.createElement("div");
  wrap.appendChild(label(t("menu.fieldName")));
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = t("menu.namePlaceholder");
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
  wrap.appendChild(label(t("menu.fieldFace")));

  // 6개 한 줄 (모바일 폭 ~360px 기준 카드당 ~55px)
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
  row.style.gap = "4px";

  for (const face of FACES) {
    const cell = document.createElement("div");
    cell.style.background = "var(--panel-2)";
    cell.style.border = "1.5px solid var(--border)";
    cell.style.borderRadius = "6px";
    cell.style.padding = "3px 2px";
    cell.style.cursor = "pointer";
    cell.style.transition = "border-color 120ms";
    cell.style.textAlign = "center";
    cell.style.minWidth = "0";
    if (draft.faceId === face.id) cell.style.borderColor = "var(--accent)";

    const svgWrap = document.createElement("div");
    svgWrap.style.display = "flex";
    svgWrap.style.justifyContent = "center";
    svgWrap.appendChild(createFaceSVG(face.id, 44));
    cell.appendChild(svgWrap);

    const lbl = document.createElement("div");
    lbl.className = "small muted";
    lbl.style.marginTop = "2px";
    lbl.style.fontSize = "10px";
    lbl.style.lineHeight = "1.1";
    lbl.style.overflow = "hidden";
    lbl.style.textOverflow = "ellipsis";
    lbl.style.whiteSpace = "nowrap";
    lbl.textContent = t("face." + face.id);
    cell.appendChild(lbl);

    cell.addEventListener("click", () => {
      draft.faceId = face.id;
      refreshPreview();
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
  wrap.appendChild(label(t("menu.fieldHand")));
  // 4개 한 줄 — 안드로이드 폭 (~360px) 에서도 4 cols 가능하도록 폰트/패딩 축소
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  row.style.gap = "4px";
  const handKeys = ["right", "left", "mixed", "lefty_rb"];
  for (const val of handKeys) {
    const btn = document.createElement("button");
    btn.textContent = t("hand." + val);
    btn.style.fontSize = "12px";
    btn.style.padding = "8px 2px";
    btn.style.minWidth = "0";
    btn.style.whiteSpace = "nowrap";
    if (draft.hand === val) btn.classList.add("primary");
    btn.addEventListener("click", () => {
      draft.hand = val;
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
  syncDraftTalents();
  const slots = totalTalentSlots();

  const wrap = document.createElement("div");
  wrap.appendChild(label(t("menu.fieldTalent")));

  // 1번째 select — 기존 draft.talent 와 연동
  wrap.appendChild(makeTalentSelect(0));

  // 회귀 상점으로 슬롯 확장된 경우 추가 select 표시 (2..N)
  if (slots > 1) {
    const hint = document.createElement("div");
    hint.className = "muted small";
    hint.style.cssText = "font-size:10.5px; margin:4px 0 2px;";
    hint.textContent = t("menu.extraTalentHint", { n: slots });
    wrap.appendChild(hint);
    for (let i = 1; i < slots; i++) {
      wrap.appendChild(makeTalentSelect(i));
    }
  }
  return wrap;
}

function makeTalentSelect(slotIdx) {
  const select = document.createElement("select");
  select.style.cssText = "width:100%; margin-top:" + (slotIdx === 0 ? "0" : "4px") + ";";
  for (const [key, talent] of Object.entries(TALENTS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${t("talent." + key)} — ${describeBoost(talent.boost)}`;
    select.appendChild(opt);
  }
  select.value = draft.talents[slotIdx] ?? draft.talent;
  select.addEventListener("change", e => {
    draft.talents[slotIdx] = e.target.value;
    if (slotIdx === 0) draft.talent = e.target.value;
    refreshPreview();
  });
  return select;
}

function describeBoost(boost) {
  return Object.entries(boost)
    .filter(([, v]) => v > 1.0)
    .map(([k, v]) => `${t("stat." + k)} ×${v}`)
    .join(", ");
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
function button(text, cls = "", onClick) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}
