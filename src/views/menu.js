// 메인 메뉴 + 캐릭터 생성 (이미지/레이더/캐릭터 자세 포함)
//
// i18n: 사용자 표시 문자열은 모두 t() 호출.
// 캐릭터 이름은 사용자 입력 그대로 저장 (locale 토글해도 변경되지 않음).

import { state, hasSave, loadGame, deleteSave, saveGame, resetState, resetAllData, getLocalSavedAt } from "../state.js";
import { createPlayer, TALENTS } from "../systems/player.js";
import { startHighSchoolCareer } from "../systems/career.js";
import { consumeLoadoutForCharacter, loadRegressionMeta } from "../systems/regression.js";
import { saveToCloud, loadFromCloud, getCloudSaveMeta, deleteFromCloud } from "../cloud/cloudSave.js";
import { isSignedIn, isAnonymousUser, linkAnonToGoogle, signOutCloud } from "../cloud/auth.js";
import {
  FACES, createFaceSVG,
  SKIN_COLORS, HAIR_COLORS, HAIR_STYLES, ACCESSORIES, EYES, FACE_SHAPES,
} from "../render/avatars.js";
import { createCharacterSVG } from "../render/character.js";
import { createGameDate } from "../systems/tick.js";
import { t, getLocale } from "../i18n/index.js";
import { randomName } from "../data/names.js";
import { createImage } from "../assets/images.js";
import { sfx } from "../assets/audio.js";
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

// 시작(타이틀/로딩) 화면 — 앱 진입 첫 화면.
//   1) 최초 1회 짧은 로딩 연출 → 2) 타이틀 메뉴 (이어하기/새 게임 + 로그인/클라우드/상점/데이터초기화)
//   캐릭터 생성 화면(renderMenu)은 깔끔하게 생성만 담당하도록 분리.
let startLoadingDone = false;
export function renderStart(root, route) {
  root.innerHTML = "";

  if (startLoadingDone) {
    buildStartMenu(root, route);
    return;
  }
  // 로딩 연출 (1회) — 로고 + 스피너, 잠시 후 타이틀 메뉴로 전환.
  const wrap = document.createElement("div");
  wrap.className = "stack";
  root.appendChild(wrap);
  buildLoadingPhase(wrap);
  setTimeout(() => {
    startLoadingDone = true;
    if (state.view === "start") { root.innerHTML = ""; buildStartMenu(root, route); }
  }, 900);
}

function ensureSpinnerStyle() {
  if (document.getElementById("spin-style")) return;
  const s = document.createElement("style");
  s.id = "spin-style";
  s.textContent =
    "@keyframes nir-spin{to{transform:rotate(360deg)}}" +
    "@keyframes nir-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
    "@keyframes nir-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}";
  document.head.appendChild(s);
}

function buildLoadingPhase(wrap) {
  ensureSpinnerStyle();
  const box = document.createElement("div");
  box.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; min-height:60vh;";

  const title = document.createElement("div");
  title.textContent = t("app.logo");
  title.style.cssText = "font-size:30px; font-weight:800; color:var(--accent); letter-spacing:1px; animation:nir-fade .5s ease;";
  box.appendChild(title);

  const spin = document.createElement("div");
  spin.style.cssText = "width:34px; height:34px; border:3px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:nir-spin .8s linear infinite;";
  box.appendChild(spin);

  const txt = document.createElement("div");
  txt.className = "muted small";
  txt.textContent = t("menu.loading");
  box.appendChild(txt);

  wrap.appendChild(box);
}

function buildStartMenu(root, route) {
  ensureSpinnerStyle();

  // 풀스크린 컨테이너 — 배경 이미지 + 하단 버튼, view-root 를 정확히 채워 무스크롤.
  const screen = document.createElement("div");
  screen.className = "start-screen";

  // 1) 배경 이미지 (없으면 그라데이션 폴백). object-fit:cover 로 전면.
  const bg = createImage("titleHero", {
    alt: t("app.logo"),
    className: "start-bg",
    // createImage 가 인라인으로 height:auto 를 주므로 imgStyle 로 height:100%+cover 를 덮어씀(인라인 우선).
    imgStyle: "height:100%; object-fit:cover;",
    fallback: () => {
      const d = document.createElement("div");
      d.style.cssText = "position:absolute; inset:0; background:radial-gradient(120% 80% at 50% 0%, #1b2940 0%, #0e1116 70%);";
      return d;
    },
  });
  screen.appendChild(bg);

  // 2) 하단 가독성 오버레이
  const overlay = document.createElement("div");
  overlay.className = "start-overlay";
  screen.appendChild(overlay);

  // 3) 상단 타이틀
  const title = document.createElement("div");
  title.className = "start-title";
  title.style.animation = "nir-fade .4s ease";
  const logo = document.createElement("div");
  logo.className = "logo-text";
  logo.textContent = t("app.logo");
  title.appendChild(logo);
  const tag = document.createElement("div");
  tag.className = "tagline";
  tag.textContent = t("menu.tagline");
  title.appendChild(tag);
  screen.appendChild(title);

  // 4) 하단 액션 묶음
  const actions = document.createElement("div");
  actions.className = "start-actions";

  // 로그인 상태 (로그인 시)
  if (isSignedIn()) actions.appendChild(renderAuthPanel(route));

  // 이어하기 + 새 게임 (없으면 게임 시작)
  actions.appendChild(renderStartButtons(route));

  // 클라우드 저장 + 불러오기 (로그인 시)
  if (isSignedIn()) actions.appendChild(renderCloudPanel(route));

  // 명예의 전당 박물관 진입
  actions.appendChild(renderHallOfFameMuseumPanel(route));

  // 회귀 상점 진입 (적립 있을 때)
  const m = state.regression;
  if (m && (m.totalEarned > 0 || m.balance > 0 || m.runs > 0)) {
    actions.appendChild(renderShopEntryPanel(route));
  }
  // 데이터 초기화 (작은 링크)
  actions.appendChild(renderResetPanel(route));

  screen.appendChild(actions);
  root.appendChild(screen);
}

// 시작 버튼 패널 — 세이브 있으면 이어하기 + 새 게임, 없으면 게임 시작.
function renderStartButtons(route) {
  const startPanel = document.createElement("section");
  startPanel.className = "panel";
  startPanel.style.padding = "12px";
  if (hasSave()) {
    const cont = button(t("menu.continueBtn"), "primary", () => {
      sfx("good");
      if (loadGame()) { resetWeeklyCarousel(); route("weekly"); }
      else alert(t("cloud.loadFailed"));   // 세이브 손상 등으로 로드 실패 시 안내
    });
    cont.style.cssText = "width:100%; padding:13px; font-size:16px; font-weight:700; margin-bottom:8px;";
    startPanel.appendChild(cont);
    const localTs = getLocalSavedAt();
    if (localTs) {
      const when = document.createElement("div");
      when.className = "muted small";
      when.style.cssText = "text-align:center; font-size:11px; margin-bottom:10px;";
      when.textContent = t("menu.lastSavedAt", { when: relativeTime(localTs) });
      startPanel.appendChild(when);
    }
    const fresh = button(t("menu.newGameBtn"), "", () => { sfx("click"); route("menu"); });
    fresh.style.cssText = "width:100%; padding:10px; font-size:13px;";
    startPanel.appendChild(fresh);
  } else {
    const startBtn = button(t("menu.startBtn"), "primary", () => { sfx("click"); route("menu"); });
    startBtn.style.cssText = "width:100%; padding:13px; font-size:16px; font-weight:700;";
    startPanel.appendChild(startBtn);
  }

  return startPanel;
}

export function renderMenu(root, route) {
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  // 시작 화면으로 돌아가기 (작은 링크)
  const back = button("← " + t("menu.backToStart"), "", () => route("start"));
  back.style.cssText = "align-self:flex-start; background:none; border:none; color:var(--muted); font-size:12px; padding:2px 0; cursor:pointer;";
  wrap.appendChild(back);

  wrap.appendChild(renderCreatePanel(route));
  root.appendChild(wrap);
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
      // popup 우선 — 성공 시 즉시 결과 반환되므로 여기서 리로드해 로그인 상태 반영.
      // 팝업이 막힌 환경에서만 redirect 폴백(result.redirecting)이라 페이지가 리로드된다.
      const result = await linkAnonToGoogle();
      if (result.redirecting) return;          // redirect 폴백 — 페이지 전환 대기.
      if (result.ok) {                          // popup 연동/로그인 성공.
        location.reload();
        return;
      }
      linkBtn.disabled = false;
      linkBtn.textContent = t("auth.linkGoogle");
      if (result.reason !== "cancelled") alert(t("auth.linkFailed"));   // 사용자가 닫은 경우는 조용히.
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

// 클라우드 저장 + 불러오기 패널 — 로그인 시 시작화면에 항상 노출.
//   저장: 로컬 세이브가 있을 때만 활성 (saveGame → saveToCloud, 1 write).
//   불러오기: 클라우드 → 로컬 덮어쓰기 후 새로고침. 로컬이 60초+ 더 새것이면 confirm.
function renderCloudPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  // 익명(미로그인) 상태에서는 클라우드 저장 비활성 — 익명 uid 는 기기 종속이라 다른 기기에서 못 불러옴.
  // Google 로그인해야 기기 간 동기화가 되므로 저장 자체를 막는다.
  const anon = isAnonymousUser();

  const row = document.createElement("div");
  row.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:8px;";

  // ☁️ 저장
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "primary";
  saveBtn.textContent = t("cloud.saveBtn");
  saveBtn.style.cssText = "padding:10px 8px; font-size:12px; font-weight:700;";
  saveBtn.disabled = !hasSave() || anon;
  saveBtn.addEventListener("click", async () => {
    if (anon) { alert(t("cloud.signInToSave")); return; }
    if (!hasSave()) { alert(t("cloud.noLocalSave")); return; }
    saveBtn.disabled = true;
    saveBtn.textContent = t("cloud.saving");
    saveGame();
    const r = await saveToCloud();
    if (r.ok) {
      cloudMetaCache = null;   // 메타 캐시 무효화 — 다음 비교가 최신 반영
      saveBtn.textContent = t("cloud.saveSuccess");
      setTimeout(() => { saveBtn.textContent = t("cloud.saveBtn"); saveBtn.disabled = false; }, 1600);
    } else {
      saveBtn.textContent = t("cloud.saveBtn");
      saveBtn.disabled = false;
      const reasonMap = {
        no_local_save: t("cloud.noLocalSave"),
        firebase_not_ready: t("cloud.notReady"),
        not_signed_in: t("cloud.notSignedIn"),
      };
      alert(reasonMap[r.reason] ?? t("cloud.saveFailed"));
    }
  });
  row.appendChild(saveBtn);

  // ☁️ 불러오기
  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.textContent = t("cloud.loadBtn");
  loadBtn.style.cssText = "padding:10px 8px; font-size:12px; font-weight:700;";
  loadBtn.addEventListener("click", async () => {
    // 로컬이 클라우드보다 명백히 더 새것이면(60초+) 덮어쓰기 confirm.
    const meta = cloudMetaCache ?? await getCloudSaveMeta();
    cloudMetaCache = meta;
    const localTs = getLocalSavedAt();
    if (meta?.exists && localTs && meta.clientLastSaved && localTs > meta.clientLastSaved + 60000) {
      if (!confirm(t("cloud.confirmOverwriteLocal"))) return;
    }
    loadBtn.disabled = true;
    loadBtn.textContent = t("cloud.loading");
    const result = await loadFromCloud();
    if (result.ok) {
      // 클라우드 → 로컬 기록 후, 새로고침만 하지 말고 바로 게임으로 진입.
      if (loadGame()) { resetWeeklyCarousel(); route("weekly"); }
      else location.reload();   // 로드 실패 시에만 새로고침 폴백
    } else {
      loadBtn.disabled = false;
      loadBtn.textContent = t("cloud.loadBtn");
      const reasonMap = {
        not_found: t("cloud.notFound"),
        firebase_not_ready: t("cloud.notReady"),
        not_signed_in: t("cloud.notSignedIn"),
      };
      alert(reasonMap[result.reason] ?? t("cloud.loadFailed"));
    }
  });
  row.appendChild(loadBtn);

  panel.appendChild(row);

  // 익명이면 안내 — Google 로그인해야 기기 간 동기화/저장 가능.
  if (anon) {
    const hint = document.createElement("div");
    hint.className = "muted small";
    hint.style.cssText = "margin-top:6px; font-size:10.5px; line-height:1.3;";
    hint.textContent = t("cloud.signInHint");
    panel.appendChild(hint);
  }
  return panel;
}

// 전체 데이터 초기화 — 세이브/회귀/설정 전부 삭제 (locale 유지).
// 로그인 상태면 클라우드 문서도 삭제. 되돌릴 수 없으므로 danger confirm 모달 경유.
function renderResetPanel(route) {
  // 한 화면 절약 — 별도 패널/설명 없이 컴팩트한 텍스트 버튼만 (확인 모달에 설명 포함).
  const wrap = document.createElement("div");
  wrap.style.cssText = "text-align:center; margin-top:2px;";

  const btn = button(t("menu.resetAll"), "", () => {
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
  btn.style.cssText = "background:none; border:none; color:var(--muted); font-size:11px; text-decoration:underline; opacity:0.7; padding:2px;";
  wrap.appendChild(btn);

  return wrap;
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

function renderHallOfFameMuseumPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const row = document.createElement("div");
  row.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px;";

  const left = document.createElement("div");
  left.style.cssText = "flex:1; min-width:0;";
  const title = document.createElement("div");
  title.style.cssText = "font-weight:700; font-size:13px; color:var(--accent-2); margin-bottom:2px;";
  title.textContent = t("hof.museumTitle") || "명예의 전당 박물관";
  left.appendChild(title);
  const sub = document.createElement("div");
  sub.className = "muted small";
  sub.style.cssText = "font-size:11px;";
  sub.textContent = t("hof.museumDesc") || "은퇴한 전설적인 선수들의 명예로운 아카이브";
  left.appendChild(sub);
  row.appendChild(left);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.type = "button";
  btn.textContent = t("hof.enterMuseum") || "입장";
  btn.style.cssText = "padding:10px 12px; font-size:12px; font-weight:700; flex-shrink:0;";
  btn.addEventListener("click", () => route("hallofamemuseum"));
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
  panel.style.padding = "10px";          // 한 화면 절약 — 기본 패널 패딩 축소
  const h = panel.querySelector("h2");
  if (h) h.style.cssText = "margin:0 0 2px; font-size:14px;";

  // 안드로이드 portrait(~412px) 기준 — 세로 stack
  // 순서: 이름 → 얼굴 → 자세 → 재능 → 캐릭터 미리보기 → 시작
  const col = document.createElement("div");
  col.className = "stack";
  col.style.gap = "4px"; // 한 화면 안에 들어오도록 간격 축소

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
      equipment: loadout.equipment,
    });
    startHighSchoolCareer(name, draft.talent, null);
    state.gameDate = createGameDate();
    state.autoMode = "two_way";
    state.paused = true;
    resetWeeklyCarousel();
    saveGame();
    route("weekly");
  });
  startBtn.style.marginTop = "4px";
  startBtn.style.width = "100%";
  startBtn.style.padding = "9px";
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
  card.style.padding = "3px";
  card.style.textAlign = "center";

  // 캐릭터 일러스트(얼굴별 타자 그림) — 없으면 기존 파라메트릭 SVG 폴백.
  //   좌타(hand=left/mixed)는 img 만 scaleX(-1) 반전(폴백 SVG 는 내부에서 손방향 처리하므로 미적용).
  //   idle 미세 흔들림(nir-idle)은 wrap 에만 적용 → flip 과 충돌 없음.
  ensureSpinnerStyle();
  const battingLeft = draft.hand === "left" || draft.hand === "mixed";
  // 높이 70px 고정 — 생성 화면 1스크린 맞춤(이전 96px도 살짝 넘쳐 더 축소). width:auto 로 비율 보존.
  const presetKey = mapCustomToPreset(draft.faceId).toUpperCase();
  const charImg = createImage("charBat" + presetKey, {
    style: "animation:nir-idle 3.2s ease-in-out infinite;",
    imgStyle: `height:70px; width:auto; margin:0 auto;${battingLeft ? " transform:scaleX(-1);" : ""}`,
    fallback: () => createCharacterSVG(draft.faceId, draft.hand, { w: 60, h: 72 }, draft.talent),
  });
  card.appendChild(charImg);

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
  // 최초 진입 시 언어에 맞는 평범한 이름을 랜덤으로 미리 채워둠 (사용자가 지우고 바꿔도 됨).
  if (!draft.name) draft.name = randomName(getLocale());
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

function syncPresetToCustom(faceId) {
  if (faceId === "f1") return [0, 0, 0, 0, 0, 0];
  if (faceId === "f2") return [1, 1, 1, 3, 1, 0];
  if (faceId === "f3") return [2, 3, 1, 0, 2, 0];
  if (faceId === "f4") return [3, 0, 0, 1, 3, 0];
  if (faceId === "f5") return [4, 0, 2, 2, 0, 0];
  if (faceId === "f6") return [1, 2, 3, 0, 4, 0];
  if (faceId.startsWith("f_")) {
    const p = faceId.split("_");
    return [
      parseInt(p[1]) || 0,
      parseInt(p[2]) || 0,
      parseInt(p[3]) || 0,
      parseInt(p[4]) || 0,
      parseInt(p[5]) || 0,
      parseInt(p[6]) || 0
    ];
  }
  return [0, 0, 0, 0, 0, 0];
}

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

function renderFaceGallery() {
  const wrap = document.createElement("div");
  wrap.appendChild(label(t("menu.fieldFace")));

  // 1) 6개 프리셋 얼굴 그리드
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(6, minmax(0, 1fr))";
  row.style.gap = "4px";
  row.style.marginBottom = "8px";

  const isCustom = draft.faceId.startsWith("f_");
  const customParts = syncPresetToCustom(draft.faceId);

  for (const face of FACES) {
    const cell = document.createElement("div");
    cell.style.background = "var(--panel-2)";
    cell.style.border = "1.5px solid var(--border)";
    cell.style.borderRadius = "6px";
    cell.style.padding = "2px 1px";
    cell.style.cursor = "pointer";
    cell.style.transition = "border-color 120ms";
    cell.style.textAlign = "center";
    cell.style.minWidth = "0";
    if (!isCustom && draft.faceId === face.id) {
      cell.style.borderColor = "var(--accent)";
    }

    const svgWrap = document.createElement("div");
    svgWrap.style.display = "flex";
    svgWrap.style.justifyContent = "center";
    svgWrap.appendChild(createFaceSVG(face.id, 32));
    cell.appendChild(svgWrap);

    const lbl = document.createElement("div");
    lbl.className = "small muted";
    lbl.style.marginTop = "2px";
    lbl.style.fontSize = "9px";
    lbl.style.lineHeight = "1.1";
    lbl.style.overflow = "hidden";
    lbl.style.textOverflow = "ellipsis";
    lbl.style.whiteSpace = "nowrap";
    lbl.textContent = t("face." + face.id);
    cell.appendChild(lbl);

    cell.addEventListener("click", () => {
      draft.faceId = face.id;
      refreshPreview();
      // 프리셋에 맞는 인덱스로 강제 싱크
      const newCustom = syncPresetToCustom(face.id);
      rebuildCustomUI(newCustom);
    });
    row.appendChild(cell);
  }
  wrap.appendChild(row);

  // 2) 세부 커스터마이징 조절판 영역
  const customSection = document.createElement("div");
  customSection.id = "custom-face-editor";
  customSection.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:6px;";
  wrap.appendChild(customSection);

  function rebuildCustomUI(parts) {
    customSection.innerHTML = "";
    
    // 파츠 타입별 타이틀과 렌더링 루프
    const partTypes = [
      { name: t("custom.skin"), options: SKIN_COLORS, current: parts[0], colorType: true, idx: 0 },
      { name: t("custom.hairColor"), options: HAIR_COLORS, current: parts[1], colorType: true, idx: 1 },
      { name: t("custom.hairStyle"), options: HAIR_STYLES, current: parts[2], transPrefix: "custom.style.", idx: 2 },
      { name: t("custom.accessory"), options: ACCESSORIES, current: parts[3], transPrefix: "custom.acc.", idx: 3 },
      { name: t("custom.eye"), options: EYES, current: parts[4], transPrefix: "custom.eye.", idx: 4 },
      { name: t("custom.shape"), options: FACE_SHAPES, current: parts[5], transPrefix: "custom.shape.", idx: 5 }
    ];

    for (const pt of partTypes) {
      const rowDiv = document.createElement("div");
      rowDiv.style.cssText = "display:flex; align-items:center; gap:6px;";
      
      const pTitle = document.createElement("div");
      pTitle.style.cssText = "font-size:10px; font-weight:700; width:52px; color:var(--accent-2); flex-shrink:0;";
      pTitle.textContent = pt.name;
      rowDiv.appendChild(pTitle);

      const optRow = document.createElement("div");
      optRow.style.cssText = "display:flex; gap:3px; flex-wrap:wrap; flex:1;";

      pt.options.forEach((opt, oIdx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        
        if (pt.colorType) {
          // 컬러 파츠는 색상 칩 형태로
          btn.style.cssText = `width:16px; height:16px; border-radius:50%; background:${opt}; border:1.5px solid ${pt.current === oIdx ? "var(--accent)" : "var(--border)"}; padding:0; min-width:0; cursor:pointer;`;
        } else {
          // 텍스트 파츠는 작게 버튼으로
          btn.textContent = t(pt.transPrefix + opt);
          btn.style.cssText = "padding:2px 5px; font-size:9.5px; min-width:0; line-height:1.2;";
          if (pt.current === oIdx) btn.classList.add("primary");
        }

        btn.addEventListener("click", () => {
          parts[pt.idx] = oIdx;
          const newFaceId = `f_${parts[0]}_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}`;
          draft.faceId = newFaceId;
          refreshPreview();
          // 프리셋 얼굴 하이라이트 초기화
          for (const el of row.children) {
            el.style.borderColor = "var(--border)";
          }
          rebuildCustomUI(parts);
        });
        optRow.appendChild(btn);
      });
      rowDiv.appendChild(optRow);
      customSection.appendChild(rowDiv);
    }
  }

  rebuildCustomUI(customParts);
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
    btn.style.padding = "6px 2px";
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
