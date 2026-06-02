// 주간 행동 선택 화면
//
// i18n: 사용자 표시 문자열은 모두 t() 호출. 데이터(team.name, player.name)는 생성 시점
// locale 의 풀에서 뽑힌 식별자라 그대로 표시한다 (locale 토글해도 변경되지 않음).

import { state, saveGame, pushToast } from "../state.js";
import {
  BATTER_STATS, PITCHER_STATS, TALENTS, overallScore, nationalTeamRating, getStatLabels, getPlayerStatCap, getPlayerMaxStatCap, applyGameExperience,
} from "../systems/player.js";
import { advanceToNextSeason, mergeSeasonStats } from "../systems/week.js";
import { transitionAfterSeason, transitionToStage, eligibleCareerPaths, kboDraft, determineMLBStartStage, compositeScore, checkFreeAgency, applyFreeAgencyDecision, maybeTradeOffer, applyTradeAccept, checkMLBChallenge, TRADE_CONSENT_FAME } from "../systems/career.js";
import { getPlayerTeam, standings } from "../systems/league.js";
import { createFaceSVG } from "../render/avatars.js";
import { AUTO_PRESETS, autoFillWeek, topWeightStat, isTrainDirectionMaxed } from "../systems/autoTrain.js";
import { teamAvgOvr } from "../systems/npc.js";
import { showInterstitialAd, maybeShowSeasonAd } from "../systems/ads.js";
import { CATEGORY_KEYS, applyCategoryAndPickEvent, applyEventChoice, getAvailableCategories, isTournamentEvent } from "../systems/offseason.js";
import { appearanceChance, batterOVR, pitcherOVR, decideRolesForGame } from "../systems/simulator.js";
import { createRadarSVG } from "../render/radar.js";
import { formatGameDate, t, getLocale } from "../i18n/index.js";
import { getActiveTournaments } from "../data/tournaments.js";
import { simulateFinal, applyFinalReward } from "../systems/finals.js";
import { createPOVScene, pulseDiamondHome } from "../render/finalAnim.js";
import { sfx } from "../assets/audio.js";
import { createImage } from "../assets/images.js";

// 이벤트 컷 삽입 헬퍼 — 에셋 있으면 일러스트, 없으면(파일 X) 아무것도 안 그림.
function eventCut(key) {
  // 세로로 긴 이벤트 이미지가 모달을 넘기지 않도록 높이 상한 + 가운데 크롭(object-fit cover).
  return createImage(key, {
    style: "max-width:300px; max-height:180px; margin:0 auto 10px; border-radius:8px; overflow:hidden;",
    imgStyle: "max-height:180px; object-fit:cover;",
  });
}
import { randomName } from "../data/names.js";
import { getTeamPool } from "../data/teams.js";
import { checkMilitaryTrigger, applyMilitaryService, MILITARY_OPTIONS } from "../systems/military.js";
import { simulatePostseasonGame, applyRoundReward, advanceToNextRound, pushPostseasonRecord, recordSeriesGame, isSeriesClinched, seriesWinner, winsToClinch } from "../systems/postseason.js";
import { nextPendingEvent, clearPendingEvent, simulateAllStarGame, applyAllStarReward, simulateIntlTournamentGame, applyIntlTournamentReward, simulateIntlBracket } from "../systems/seasonEvents.js";
import { computeHallOfFameScore, hofRank } from "../systems/hallOfFame.js";
import { recordRun, loadRegressionMeta, unlockItem } from "../systems/regression.js";
import { saveToCloud, getCloudSaveMeta } from "../cloud/cloudSave.js";
import { isSignedIn, isAnonymousUser } from "../cloud/auth.js";

export function renderWeekly(root, route, opts = {}) {
  const { player, league, season } = state;
  if (!player || !league || !season) {
    route("menu"); return;
  }
  if (season.finished) {
    // 결승 모달이 살아있으면 시즌 종료 화면 진입 미룸 — 사용자에게 *시즌 종료 후 결승* 으로
    // 보이는 위화감 제거. 결승 처리 끝나면 다음 route("weekly") 호출 시 이 분기 통과해서
    // renderSeasonEnd 진입.
    if (state.pendingFinal) {
      showFinalModalIfNeeded(route);
      return;
    }
    // PO 진행 중이면 — "정규시즌 종료" 화면 대신 "포스트시즌 진행 중" 안내.
    // PO 도 시즌의 일부 — PO 끝나야 진짜 시즌 종합 화면 진입.
    if (state.pendingPostseason) {
      renderPostseasonStandby(root, route);
      showPostseasonModalIfNeeded(route);
      return;
    }
    renderSeasonEnd(root, route);
    // pendingToasts 큐 처리 — 시즌 종료 시점에 쌓인 토스트(수상/탈락 등)를
    // 여기서 비워야 다음 시즌 첫 렌더로 밀리지 않는다.
    drainPendingToasts();
    showSeasonEventModalIfNeeded(route);
    return;
  }

  // 훈련 방향의 최고비중 스탯이 cap 도달 → 일시정지 + 방향 변경 안내(자동모드, 방향당 1회).
  if (state.autoMode && !state.paused && !state.trainSwitchAcked
      && isTrainDirectionMaxed(player, state.autoMode)) {
    state.paused = true;
    state.trainSwitchAcked = true;
    openTrainSwitchModal(route);
  }

  // tick 자동 호출 시 schedule panel 자체를 보존(이벤트 리스너 유지) — 클릭 안정.
  // 일시정지/배속은 상단 ⚙ 설정 모달로 분리됨 (전역).
  let preservedSchedule = null;
  if (opts.fromTick) {
    const sched = root.querySelector("[data-keep='schedule']");
    if (sched) {
      preservedSchedule = sched;
      sched.remove();
      updateSchedulePanel(preservedSchedule);
    }
  }

  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  // 1) 헤더 카드 (단독, 전체 폭, 컴팩트)
  wrap.appendChild(renderHeaderInfo(player, league, season));

  // 2) 합쳐진 "주차 일정" 카드 — 보존된 element 가 있으면 그대로 재사용
  wrap.appendChild(preservedSchedule ?? renderSchedulePanel(route));

  // 3) 메인 carousel — 훈련방향 / 시즌성적 / 능력치 / 경기결과 / 리그순위
  wrap.appendChild(renderWeeklyCarousel(route, player, league, season));

  root.appendChild(wrap);

  // 새 부상 발생 시 토스트 (한 번만)
  showInjuryToastIfNeeded();

  // pendingToasts 큐 처리 (탈락 알림 등)
  drainPendingToasts();

  // 토너먼트 결승 진출 — 모달 발동 (한 번만)
  showFinalModalIfNeeded(route);
  // 시즌 중 이벤트 모달 (올스타전 등) — pendingEvents 큐 첫 항목
  showSeasonEventModalIfNeeded(route);
}

// 토너먼트 결승 모달 — state.pendingFinal 이 있고 아직 모달 안 띄웠으면 발동
// 시즌 중 발생 시 자동 일시정지(사용자가 ▶ 다시 누를 때까지 시즌 멈춤)
function showFinalModalIfNeeded(route) {
  const f = state.pendingFinal;
  if (!f) return;
  // 이미 결승 모달이 떠 있으면 중복 생성 방지 — DOM 존재로 판정.
  // (예전 모듈 플래그 _finalModalShown 은 완료 콜백 미실행 시 true 로 고착되어,
  //  pendingFinal 이 있는데도 모달이 영영 안 떠 시즌 종료 화면으로 못 넘어가고
  //  "마지막 주에서 멈춤" 되는 원인이었음. DOM 기반은 항상 self-heal.)
  if (document.querySelector("[data-modal='final']")) return;

  // 설정 — skipFinalsModal ON 이면 모달 띄우지 않고 자동 시뮬+보상+토스트만.
  if (state.settings?.skipFinalsModal) {
    const result = f.result ?? simulateFinal(state.player, state.league, f.opponent);
    const reward = applyFinalReward(state.player, result, f.tournamentKey);
    const my = result.home?.team?.isPlayerTeam ? result.home : result.away;
    const won = result.winner && result.winner === my.team.name;
    const kind = won ? "good" : "info";
    const msg = won
      ? t("weekly.finalsAutoWin", { tournament: t("tournament." + f.tournamentKey) })
      : t("weekly.finalsAutoLose", { tournament: t("tournament." + f.tournamentKey) });
    pushToast(msg, kind);
    if (reward?.mvp) {
      pushToast(t("weekly.mvpAwarded", { tournament: t("tournament." + f.tournamentKey) }), "good");
    }
    state.pendingFinal = null;
    saveGame();
    return;
  }

  // 결승 진출 시 시즌 일시정지 — 직전 상태를 보존했다가 결승 종료 후 복원해서 자동 진행 이어감
  if (f._wasPaused == null) f._wasPaused = state.paused;
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.modal = "final";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  function rerender() {
    dialog.innerHTML = "";
    if (f.status === "announce") buildFinalAnnounce(dialog, f, rerender);
    else if (f.status === "playing") buildFinalPlaying(dialog, f, rerender);
    else buildFinalResult(dialog, f, () => {
      // 보너스 수령 + 기록 누적 (tournamentKey 전달)
      const reward = applyFinalReward(state.player, f.result, f.tournamentKey);
      if (reward.mvp) {
        pushToast(t("weekly.mvpAwarded", { tournament: t("tournament." + f.tournamentKey) }), "good");
      }
      const restorePaused = f._wasPaused ?? false;
      state.pendingFinal = null;
      state.paused = restorePaused;
      saveGame();
      backdrop.remove();
      route("weekly");
    });
  }
  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// phase 1 — 결승 진출 알림
function buildFinalAnnounce(dialog, final, rerender) {
  const h = document.createElement("h2");
  h.textContent = t("weekly.finalAdvance", { tournament: t("tournament." + final.tournamentKey) });
  dialog.appendChild(h);

  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.margin = "0 0 8px";
  desc.style.lineHeight = "1.5";
  desc.textContent = t("weekly.finalAdvanceDesc", { opponent: final.opponent.name });
  dialog.appendChild(desc);

  // 출전 여부 — 진입 시점에 한 번 굴려서 stash. 이후 시뮬에 그대로 forcedRoles 로 전달.
  // 1) 투수 출전 굴림 → 출전이면 표시 = "투수"
  // 2) 미출전이면 player.position 으로 출전 + "투수 미출전" 부가 표시
  const myTeam = getPlayerTeam(state.league);
  if (!final.rolesPreroll) {
    // 아마추어/대학 결승 — championship 분기 (팀 SP 1~3등만 등판).
    final.rolesPreroll = decideRolesForGame(state.player, myTeam, { gateType: "championship" });
    saveGame();
  }
  const roles = final.rolesPreroll;
  const lineup = document.createElement("div");
  lineup.className = "small";
  lineup.style.margin = "0 0 14px";
  lineup.style.lineHeight = "1.5";
  lineup.style.padding = "6px 10px";
  lineup.style.background = "var(--panel-2)";
  lineup.style.border = "1px solid var(--border)";
  lineup.style.borderRadius = "6px";
  lineup.appendChild(renderRoleLine(state.player, roles));
  dialog.appendChild(lineup);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = t("weekly.btnStartFinal");
  btn.style.width = "100%";
  btn.style.padding = "12px";
  btn.style.fontWeight = "700";
  btn.addEventListener("pointerdown", e => {
    e.preventDefault();
    // 미리 굴린 roles 를 시뮬에 전달 — UI 표시와 실제 결과 일치 보장.
    final.result = simulateFinal(state.player, state.league, final.opponent, final.rolesPreroll);
    final.status = "playing";
    saveGame();
    rerender();
  });
  dialog.appendChild(btn);
}

// 결승/PO 출전 라인 — roles 에 따라 표시 분기.
// 투수 등판   → "포지션: 투수"
// 야수 출전   → "포지션: {player.position} · 투수 미출전"
// 결장        → "결장"
function renderRoleLine(player, roles) {
  const box = document.createElement("div");
  if (!roles?.bat && !roles?.pitch) {
    box.textContent = t("weekly.finalRoleAbsent");
    box.style.fontWeight = "700";
    return box;
  }
  if (roles.pitch) {
    box.textContent = t("weekly.finalRolePitch");
    box.style.fontWeight = "700";
    return box;
  }
  // 타자만 — position 라벨 표시
  const posLabel = player.position ? t("position." + player.position) : "";
  box.textContent = t("weekly.finalRoleBat", { pos: posLabel });
  box.style.fontWeight = "700";
  return box;
}

// phase 2 — 라이브 진행: 다이아몬드 SVG + 라인 스코어 + 이닝별 점수 라이브 + 메인 이벤트 로그
function buildFinalPlaying(dialog, final, rerender) {
  playLiveGame(dialog, final.result, {
    titleText: t("weekly.finalLiveTitle", { tournament: t("tournament." + final.tournamentKey) }),
    onComplete: () => {
      final.status = "result";
      saveGame();
      rerender();
    },
  });
}

// 라이브 경기 렌더링 helper — 결승/포스트시즌/올스타 공용.
//   dialog: 모달 dialog DOM (기존 자식 제거 후 채움)
//   result: simulateGame 결과 객체 (home/away/innings/mainPlayer.events 필요)
//   opts.titleText: 모달 상단 제목 텍스트
//   opts.onComplete: 라이브 진행 끝나면 호출 (외부 status 전환 + rerender)
function playLiveGame(dialog, result, opts) {
  const home = result.home;
  const away = result.away;
  const my = home.team.isPlayerTeam ? home : away;
  const opp = my === home ? away : home;
  const isHome = my === home;

  // 1) 제목 + 우측 [스킵] 버튼 — 라이브 진행 즉시 종료 (cancelled = true → onComplete).
  const titleRow = document.createElement("div");
  titleRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px; margin:0 0 8px;";
  const h = document.createElement("h2");
  h.style.cssText = "margin:0; font-size:15px;";
  h.textContent = opts.titleText;
  titleRow.appendChild(h);

  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.textContent = t("weekly.btnSkipLive");
  skipBtn.style.cssText = "padding:6px 10px; font-size:11px; flex-shrink:0;";
  skipBtn.addEventListener("click", () => {
    cancelled = true;       // playHalf 다음 cancelled 체크에서 빠짐 → onComplete 호출.
    skipBtn.disabled = true;
    skipBtn.textContent = t("weekly.btnSkippedLive");
  });
  titleRow.appendChild(skipBtn);

  dialog.appendChild(titleRow);

  // 2) 시각화 영역 — 평소 다이아몬드, 메인 캐릭터 타석/등판 시 POV 씬으로 swap
  const fieldWrap = document.createElement("div");
  fieldWrap.style.display = "flex";
  fieldWrap.style.justifyContent = "center";
  fieldWrap.style.alignItems = "center";
  fieldWrap.style.marginBottom = "8px";
  fieldWrap.style.minHeight = "204px";
  let diamondNode = createDiamondSVG();
  fieldWrap.appendChild(diamondNode);
  dialog.appendChild(fieldWrap);

  // 3) 점수판 (양 팀 점수 라이브)
  const scoreBox = document.createElement("div");
  scoreBox.style.display = "flex";
  scoreBox.style.justifyContent = "space-around";
  scoreBox.style.alignItems = "center";
  scoreBox.style.margin = "0 0 10px";
  scoreBox.style.fontVariantNumeric = "tabular-nums";

  const myCol = document.createElement("div");
  myCol.style.textAlign = "center";
  const myName = document.createElement("div");
  myName.style.color = "var(--accent)";
  myName.style.fontSize = "11px";
  myName.style.fontWeight = "700";
  myName.textContent = my.team.name;
  const myScore = document.createElement("div");
  myScore.dataset.live = "myScore";
  myScore.style.fontSize = "28px";
  myScore.style.fontWeight = "800";
  myScore.style.color = "var(--accent)";
  myScore.textContent = "0";
  myCol.appendChild(myName);
  myCol.appendChild(myScore);

  const inningTag = document.createElement("div");
  inningTag.dataset.live = "inning";
  inningTag.style.fontSize = "13px";
  inningTag.style.color = "var(--muted)";
  inningTag.style.fontWeight = "700";
  inningTag.textContent = "—";

  const oppCol = document.createElement("div");
  oppCol.style.textAlign = "center";
  const oppName = document.createElement("div");
  oppName.style.color = "var(--muted)";
  oppName.style.fontSize = "11px";
  oppName.style.fontWeight = "700";
  oppName.textContent = opp.team.name;
  const oppScore = document.createElement("div");
  oppScore.dataset.live = "oppScore";
  oppScore.style.fontSize = "28px";
  oppScore.style.fontWeight = "800";
  oppScore.style.color = "var(--muted)";
  oppScore.textContent = "0";
  oppCol.appendChild(oppName);
  oppCol.appendChild(oppScore);

  scoreBox.appendChild(myCol);
  scoreBox.appendChild(inningTag);
  scoreBox.appendChild(oppCol);
  dialog.appendChild(scoreBox);

  // 4) 라인 스코어 — 1~9이닝 + R
  const lineScore = renderLineScoreTable(my, opp);
  lineScore.dataset.live = "lineScore";
  dialog.appendChild(lineScore);

  // 5) 메인 캐릭터 이벤트 로그 — 5줄 고정 (그 이상은 스크롤).
  //    line-height 18px × 5줄 + padding(8+8) + border(1+1) = 106px.
  const logBox = document.createElement("div");
  logBox.style.background = "var(--panel-2)";
  logBox.style.border = "1px solid var(--border)";
  logBox.style.borderRadius = "6px";
  logBox.style.padding = "8px 10px";
  logBox.style.height = "108px";
  logBox.style.overflowY = "auto";
  logBox.style.fontSize = "11px";
  logBox.style.lineHeight = "18px";
  logBox.style.margin = "8px 0";
  dialog.appendChild(logBox);

  // 6) 라이브 컨트롤 — 일시정지 + 배속. tickSpeed 토글로 라이브 속도도 동기화됨.
  const ctrlRow = document.createElement("div");
  ctrlRow.style.display = "flex";
  ctrlRow.style.gap = "4px";
  ctrlRow.style.justifyContent = "center";
  ctrlRow.style.alignItems = "center";
  ctrlRow.style.margin = "0 0 8px";
  const pauseState = { paused: false };
  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = pauseState.paused ? t("weekly.btnPlay") : t("weekly.btnPause");
  pauseBtn.style.padding = "4px 12px";
  pauseBtn.style.fontSize = "12px";
  pauseBtn.style.fontWeight = "700";
  pauseBtn.style.minWidth = "60px";
  pauseBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    pauseState.paused = !pauseState.paused;
    pauseBtn.textContent = pauseState.paused ? t("weekly.btnPlay") : t("weekly.btnPause");
  });
  ctrlRow.appendChild(pauseBtn);
  for (const sp of [{lbl: "0.5x", ms: 1000}, {lbl: "1x", ms: 500}, {lbl: "2x", ms: 250}, {lbl: "4x", ms: 125}]) {
    const b = document.createElement("button");
    b.textContent = sp.lbl;
    b.style.padding = "4px 8px";
    b.style.fontSize = "12px";
    b.style.minWidth = "0";
    if (state.tickSpeed === sp.ms) b.classList.add("primary");
    b.addEventListener("pointerdown", e => {
      e.preventDefault();
      state.tickSpeed = sp.ms;
      saveGame();
      // 다른 속도 버튼 primary 클래스 갱신
      for (const c of ctrlRow.children) if (c !== pauseBtn) c.classList.remove("primary");
      b.classList.add("primary");
    });
    ctrlRow.appendChild(b);
  }
  dialog.appendChild(ctrlRow);

  // 라이브 진행: half-inning 단위 async 루프.
  //   - 그 half에 메인 이벤트가 있으면 POV 씬으로 swap → 각 이벤트마다 1.6s 시각화 + 텍스트 로그
  //   - 메인 이벤트 없으면 다이아몬드 그대로, 점수만 빠르게 갱신
  //   - 득점한 half는 다이아몬드 홈베이스 펄스
  //
  // 옛 세이브 호환: 캐시된 옛 simulator 결과는 innings 가 없을 수 있음 → fallback 빈 배열.
  const myInns = (isHome ? home.innings : away.innings) ?? [];
  const oppInns = (isHome ? away.innings : home.innings) ?? [];
  const totalInnings = Math.max(myInns.length, oppInns.length, 9);
  const allEvents = result.mainPlayer?.events ?? [];

  let myRun = 0, oppRun = 0;
  let cancelled = false;

  // 메인 이벤트의 half 분류:
  //   role=batter → 자기팀 공격 = isHome ? "bottom" : "top"
  //   role=pitcher → 자기팀 수비 = isHome ? "top" : "bottom"
  function eventHalf(ev) {
    if (ev.type === "PIT_CHANGE") {
      // sideIsPlayer=true: 메인측 마운드 교체 = 메인이 수비하는 half
      // sideIsPlayer=false: 상대 마운드 교체 = 메인이 공격하는 half
      return ev.sideIsPlayer ? (isHome ? "top" : "bottom") : (isHome ? "bottom" : "top");
    }
    if (ev.type === "PH" || ev.type === "PR") {
      // 대타/대주자는 공격 측 액션 — sideIsPlayer=true 면 메인이 공격하는 half
      return ev.sideIsPlayer ? (isHome ? "bottom" : "top") : (isHome ? "top" : "bottom");
    }
    if (ev.role === "batter") return isHome ? "bottom" : "top";
    return isHome ? "top" : "bottom";
  }
  function eventsForHalf(inning, half) {
    return allEvents.filter(ev => ev.inning === inning + 1 && eventHalf(ev) === half);
  }
  function runsForHalf(inning, half) {
    // half="top" = 원정팀 득점, half="bottom" = 홈팀 득점
    const isMyHalf = (half === "top") === !isHome;
    const arr = isMyHalf ? myInns : oppInns;
    return arr[inning] ?? 0;
  }
  function applyRuns(inning, half) {
    const runs = runsForHalf(inning, half);
    const isMyHalf = (half === "top") === !isHome;
    if (isMyHalf) {
      myRun += runs;
      myScore.textContent = String(myRun);
      highlight(myScore);
    } else {
      oppRun += runs;
      oppScore.textContent = String(oppRun);
      highlight(oppScore);
    }
    updateLineScoreCell(lineScore, isMyHalf ? "my" : "opp", inning, runs);
    if (runs > 0) pulseDiamondHome(diamondNode);
  }
  // 메인 PA 한 건이 만든 점수를 즉시 반영. half 끝 일괄 반영분에서는 빼서 중복 방지.
  function addInstantRuns(half, n) {
    if (!n) return;
    const isMyHalf = (half === "top") === !isHome;
    if (isMyHalf) {
      myRun += n;
      myScore.textContent = String(myRun);
      highlight(myScore);
    } else {
      oppRun += n;
      oppScore.textContent = String(oppRun);
      highlight(oppScore);
    }
    if (diamondNode) pulseDiamondHome(diamondNode);
  }
  function swapField(node) {
    while (fieldWrap.firstChild) fieldWrap.removeChild(fieldWrap.firstChild);
    fieldWrap.appendChild(node);
    diamondNode = node;
  }
  function appendEventLog(ev) {
    // 효과음은 POV playPitch(finalAnim playResultSfx) 에서 투구·컨택 타이밍에 맞춰 재생 — 여기선 중복 방지로 제거.
    const row = document.createElement("div");
    if (ev.type === "PIT_CHANGE") {
      const fromC = ev.fromIsMain ? "var(--accent-2)" : "inherit";
      const toC = ev.toIsMain ? "var(--accent-2)" : "inherit";
      row.innerHTML = `<span style="color:var(--muted); font-weight:700">[${ev.inning}] ${t("event.PIT_CHANGE")}</span> ${t("event.pitOut")} <span style="color:${fromC}">${ev.from}</span> / ${t("event.pitIn")} <span style="color:${toC}">${ev.to}</span>`;
    } else if (ev.type === "PH" || ev.type === "PR") {
      const arrow = ev.from ? `${ev.from} → ` : "";
      row.innerHTML = `<span style="color:var(--muted); font-weight:700">[${ev.inning}] ${t("event." + ev.type)}</span> ${arrow}<span style="color:${ev.toIsMain ? "var(--accent)" : "inherit"}">${ev.to}</span>`;
    } else if (ev.type === "COLD_GAME") {
      row.innerHTML = `<span style="color:var(--accent); font-weight:700">[${ev.inning}] ${t("event.COLD_GAME")}</span>`;
    } else {
      const roleColor = ev.role === "batter" ? "var(--accent)" : "var(--accent-2)";
      const roleLbl = ev.role === "batter" ? t("weekly.batLabel") : t("weekly.pitLabel");
      const runSuffix = (ev.runsScored ?? 0) > 0 ? ` <span style="color:var(--good); font-weight:700">+${ev.runsScored}</span>` : "";
      // 구종 표시 (Phase 2) — 타석/투구 결과에 어떤 구종이 사용됐는지.
      const pitchSuffix = ev.pitchType
        ? ` <span class="muted small" style="opacity:0.7">[${t("pitch." + ev.pitchType)}]</span>`
        : "";
      row.innerHTML = `<span style="color:${roleColor}; font-weight:700">[${ev.inning}] ${roleLbl}</span> ${t("event." + ev.type)}${pitchSuffix}${runSuffix}`;
    }
    logBox.appendChild(row);
    logBox.scrollTop = logBox.scrollHeight;
  }
  // 이닝/공수 전환 시 시각적 구분선 — 로그가 비어있을 때(첫 half) 는 생략.
  // 직전 줄이 이미 구분선이면 중복 방지 (이벤트 없는 half 가 연속되면 -------- 가 겹침).
  function appendDivider() {
    if (!logBox.firstChild) return;
    if (logBox.lastElementChild?.dataset.divider) return;
    const row = document.createElement("div");
    row.dataset.divider = "1";
    row.style.color = "var(--muted)";
    row.style.opacity = "0.5";
    row.style.letterSpacing = "1px";
    row.textContent = "-----------------------";
    logBox.appendChild(row);
    logBox.scrollTop = logBox.scrollHeight;
  }
  // 결승 모달 딜레이를 state.tickSpeed (1x=500ms) 에 비례. 4x면 모달도 0.25배 속도.
  // 50ms 폴링으로 cancelled / paused 즉시 감지 — 스킵 버튼 누르면 곧바로 빠짐.
  function waitMs(ms) {
    const mult = (state.tickSpeed ?? 500) / 500;
    const total = ms * mult;
    return new Promise(r => {
      let elapsed = 0;
      function step() {
        if (cancelled) return r();
        if (pauseState.paused) {
          // 일시정지 중엔 elapsed 안 증가
          setTimeout(step, 50);
          return;
        }
        if (elapsed >= total) return r();
        const delta = Math.min(50, total - elapsed);
        elapsed += delta;
        setTimeout(step, delta);
      }
      step();
    });
  }

  // scene.playPitch 진행 도중에도 cancelled 시 즉시 빠짐. race 패턴.
  function playPitchCancellable(scene, opts) {
    return Promise.race([
      scene.playPitch(opts),
      new Promise(r => {
        function check() {
          if (cancelled) return r();
          setTimeout(check, 50);
        }
        check();
      }),
    ]);
  }

  async function playHalf(inning, half) {
    if (cancelled) return;
    appendDivider();
    inningTag.textContent = `${inning + 1}${half === "top" ? "회초" : "회말"}`;
    const evs = eventsForHalf(inning, half);
    // 이 half 의 메인 이벤트들이 만든 점수의 합 — half 끝 일괄 반영분에서 빼야 함.
    let mainRunsThisHalf = 0;
    if (evs.length > 0) {
      // role 별 mode (한 half 내에선 동일 role 로 통일됨)
      const mainEvs = evs.filter(e => e.role === "batter" || e.role === "pitcher");
      const mode = mainEvs[0]?.role === "batter" ? "bat" : "pit";
      const scene = createPOVScene(mode);
      swapField(scene.el);
      for (const ev of evs) {
        if (cancelled) return;
        if (ev.role === "system") {
          // 투수 교체 / 콜드게임 — 로그만, 시각화 X
          appendEventLog(ev);
          await waitMs(360);
          continue;
        }
        await playPitchCancellable(scene, ev);
        if (cancelled) return;
        appendEventLog(ev);
        // 메인 PA 의 점수 즉시 반영
        if (ev.runsScored > 0) {
          mainRunsThisHalf += ev.runsScored;
          addInstantRuns(half, ev.runsScored);
          updateLineScoreCellAdd(lineScore, ((half === "top") === !isHome) ? "my" : "opp", inning, ev.runsScored);
        }
        await waitMs(180);
      }
      swapField(createDiamondSVG());
      // 이 half 의 마지막 메인 batter 결과로 다이아몬드 베이스 표시 + 탑뷰 타구 궤적 (Phase 2).
      const lastBat = [...evs].reverse().find(e => e.role === "batter");
      if (lastBat) {
        animateBallTrajectory(diamondNode, lastBat.type);
        updateDiamondBases(diamondNode, basesAfterMainPA(lastBat.type));
        // 궤적 + 베이스 표시를 잠시 보여줌 (다음 half 의 새 다이아몬드로 자동 리셋).
        await waitMs(700);
      }
    } else {
      await waitMs(360);
    }
    // half 끝 — NPC 가 만든 잔여 점수만 반영 (메인 PA 점수는 위에서 이미 반영).
    const totalHalfRuns = runsForHalf(inning, half);
    const remaining = Math.max(0, totalHalfRuns - mainRunsThisHalf);
    if (remaining > 0) addInstantRuns(half, remaining);
    // 라인 스코어는 항상 최종 점수로 동기화 (이미 메인 반영분은 increment 됐으니 전체 - 메인 만큼 추가)
    if (remaining > 0) {
      updateLineScoreCellAdd(lineScore, ((half === "top") === !isHome) ? "my" : "opp", inning, remaining);
    } else if (totalHalfRuns === 0 && mainRunsThisHalf === 0) {
      updateLineScoreCell(lineScore, ((half === "top") === !isHome) ? "my" : "opp", inning, 0);
    }
    await waitMs(280);
  }

  (async function runGame() {
    for (let i = 0; i < totalInnings; i++) {
      if (cancelled) break;
      await playHalf(i, "top");
      if (cancelled) break;
      const skipBottom = i === totalInnings - 1 && (myInns[i] === null || oppInns[i] === null);
      if (!skipBottom) {
        await playHalf(i, "bottom");
      }
      if (cancelled) break;
      // 콜드게임 이벤트가 있으면 그 이닝 마지막 후 게임 종료
      const cold = allEvents.find(e => e.type === "COLD_GAME" && e.inning === i + 1);
      if (cold) {
        appendEventLog(cold);
        break;
      }
    }
    // cancelled 든 정상 종료든 onComplete 호출 — result phase 로 전환.
    opts.onComplete?.();
  })();
}

// 다이아몬드 SVG (정적)
function createDiamondSVG() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100");
  svg.setAttribute("height", "100");
  svg.setAttribute("viewBox", "0 0 100 100");
  // overflow visible — HR 의 담장 너머 궤적이 잘리지 않도록.
  svg.setAttribute("style", "overflow:visible;");
  svg.innerHTML = `
    <polygon points="50,12 88,50 50,88 12,50" fill="#1a2a3d" stroke="var(--accent)" stroke-width="1.5"/>
    <polygon points="50,38 62,50 50,62 38,50" fill="none" stroke="#2c4565" stroke-width="1"/>
    <circle data-base="1" cx="88" cy="50" r="4" fill="var(--accent-2)" />
    <circle data-base="2" cx="50" cy="12" r="4" fill="var(--accent-2)" />
    <circle data-base="3" cx="12" cy="50" r="4" fill="var(--accent-2)" />
    <circle cx="50" cy="88" r="4" fill="white" />
    <circle data-ball cx="50" cy="88" r="2.4" fill="#ffe14a" stroke="#000" stroke-width="0.4" opacity="0" />
  `;
  return svg;
}

// 다이아몬드에 메인 출루 위치 표시 — bases: [b1, b2, b3] boolean.
function updateDiamondBases(svg, bases) {
  if (!svg) return;
  for (let i = 0; i < 3; i++) {
    const base = svg.querySelector(`[data-base="${i + 1}"]`);
    if (!base) continue;
    if (bases[i]) {
      base.setAttribute("fill", "var(--good)");
      base.setAttribute("r", "5.5");
    } else {
      base.setAttribute("fill", "var(--accent-2)");
      base.setAttribute("r", "4");
    }
  }
}

// 메인 PA 결과 type → 메인의 베이스 위치. 부정확 단순화 (NPC 주자 추적 X).
function basesAfterMainPA(type) {
  if (type === "BB" || type === "HBP" || type === "1B" || type === "E") return [true, false, false];
  if (type === "2B") return [false, true, false];
  if (type === "3B") return [false, false, true];
  // HR / OUT / K / DP / SF — 베이스 비움
  return [false, false, false];
}

// 결과 type 별 타구 궤적 — 다이아몬드 viewBox 100×100 기준. cubic bezier 4 점.
// 좌/우 무작위 (lr ∈ {-1, 1}). 홈베이스(50,88) 에서 출발.
function trajectoryForType(type) {
  const home = [50, 88];
  const lr = Math.random() < 0.5 ? -1 : 1;
  const m = (dx, y) => [50 + dx * lr, y];
  switch (type) {
    case "1B":  return [home, m(18, 65), m(28, 50), m(35, 42)];   // 외야 얕은
    case "2B":  return [home, m(25, 55), m(35, 35), m(42, 22)];   // 중간
    case "3B":  return [home, m(28, 48), m(40, 22), m(46, 8)];    // 깊은
    case "HR":  return [home, m(28, 40), m(50, 8),  m(62, -8)];   // 담장 너머
    case "E":   return [home, m(10, 75), m(15, 65), m(20, 60)];   // 내야 짧음
    case "DP":  return [home, m(12, 78), m(18, 72), m(22, 68)];
    case "SF":  return [home, m(15, 55), m(20, 35), m(25, 25)];   // 얕은 외야 (희생타)
    case "OUT": return [home, m(15, 70), m(20, 55), m(22, 50)];   // 평범 아웃
    case "K":
    case "BB":
    case "HBP": return null;                                       // 타구 없음
    default:    return null;
  }
}

// 다이아몬드 위에서 결과 type 의 타구 궤적 애니메이션. ~700ms.
function animateBallTrajectory(svg, type) {
  if (!svg) return;
  const ball = svg.querySelector("[data-ball]");
  if (!ball) return;
  const traj = trajectoryForType(type);
  if (!traj) {
    ball.setAttribute("opacity", "0");
    return;
  }
  const [P0, P1, P2, P3] = traj;
  ball.setAttribute("opacity", "1");
  ball.setAttribute("cx", P0[0]);
  ball.setAttribute("cy", P0[1]);

  const duration = 700;
  const t0 = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const u = 1 - t;
    const x = u*u*u * P0[0] + 3*u*u*t * P1[0] + 3*u*t*t * P2[0] + t*t*t * P3[0];
    const y = u*u*u * P0[1] + 3*u*u*t * P1[1] + 3*u*t*t * P2[1] + t*t*t * P3[1];
    ball.setAttribute("cx", x.toFixed(2));
    ball.setAttribute("cy", y.toFixed(2));
    if (t < 1) requestAnimationFrame(frame);
    else if (type === "HR") {
      // 담장 너머 — 페이드아웃
      ball.setAttribute("opacity", "0.4");
    }
  }
  requestAnimationFrame(frame);
}

// 라인 스코어 테이블 — 정규 9칸 + 연장 칸 동적 추가 + R
function renderLineScoreTable(my, opp) {
  const totalCols = Math.max((my.innings ?? []).length, (opp.innings ?? []).length, 9);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "10px";
  table.style.fontVariantNumeric = "tabular-nums";
  table.style.textAlign = "center";

  const headRow = document.createElement("tr");
  const headCells = [`<th style="text-align:left; padding:2px 4px;"></th>`];
  for (let i = 0; i < totalCols; i++) {
    const extra = i >= 9;
    headCells.push(`<th style="padding:2px 3px; color:${extra ? "var(--accent-2)" : "var(--muted)"}">${i + 1}</th>`);
  }
  headCells.push(`<th style="padding:2px 6px; color:var(--accent-2); border-left:1px solid var(--border)">R</th>`);
  headRow.innerHTML = headCells.join("");
  const thead = document.createElement("thead");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const side of ["opp", "my"]) {  // 원정 위, 홈 아래 — UI 단순화: opp 먼저
    const tr = document.createElement("tr");
    tr.dataset.side = side;
    const teamName = side === "my" ? my.team.name : opp.team.name;
    const teamColor = side === "my" ? "var(--accent)" : "var(--muted)";
    let row = `<td style="text-align:left; padding:3px 4px; color:${teamColor}; font-weight:700">${truncate(teamName, 6)}</td>`;
    for (let i = 0; i < totalCols; i++) {
      row += `<td data-cell="${side}-${i}" style="padding:2px 3px; color:var(--muted)">-</td>`;
    }
    row += `<td data-cell="${side}-R" style="padding:2px 6px; color:${teamColor}; font-weight:700; border-left:1px solid var(--border)">0</td>`;
    tr.innerHTML = row;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function updateLineScoreCell(table, side, inningIdx, runs) {
  const cell = table.querySelector(`[data-cell='${side}-${inningIdx}']`);
  if (cell) {
    cell.textContent = String(runs);
    if (runs > 0) cell.style.color = "var(--text)";
  }
  // R 누적
  const rCell = table.querySelector(`[data-cell='${side}-R']`);
  if (rCell) rCell.textContent = String((+rCell.textContent || 0) + runs);
}

// 라인 스코어 칸에 +N 만 누적 — 실시간 메인 PA 점수 반영용.
function updateLineScoreCellAdd(table, side, inningIdx, runs) {
  const cell = table.querySelector(`[data-cell='${side}-${inningIdx}']`);
  if (cell) {
    const cur = cell.textContent === "-" || cell.textContent === "" ? 0 : (+cell.textContent || 0);
    cell.textContent = String(cur + runs);
    if (cur + runs > 0) cell.style.color = "var(--text)";
  }
  const rCell = table.querySelector(`[data-cell='${side}-R']`);
  if (rCell) rCell.textContent = String((+rCell.textContent || 0) + runs);
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function highlight(el) {
  el.style.transition = "transform 200ms";
  el.style.transform = "scale(1.2)";
  setTimeout(() => { el.style.transform = "scale(1)"; }, 200);
}

// phase 3 — 결과 + 보너스
function buildFinalResult(dialog, final, onClose) {
  const result = final.result;
  const home = result.home;
  const away = result.away;
  const my = home.team.isPlayerTeam ? home : away;
  const opp = my === home ? away : home;
  const won = result.winner === my.team.name;
  const color = won ? "var(--good)" : "var(--accent-2)";

  const h = document.createElement("h2");
  h.style.color = color;
  h.textContent = t(won ? "weekly.finalChampion" : "weekly.finalRunner", {
    tournament: t("tournament." + final.tournamentKey),
  });
  dialog.appendChild(h);

  if (won) dialog.appendChild(eventCut("eventChampion"));   // 우승 컷

  // 점수
  const score = document.createElement("div");
  score.style.fontSize = "20px";
  score.style.fontWeight = "800";
  score.style.textAlign = "center";
  score.style.margin = "8px 0 12px";
  score.style.fontVariantNumeric = "tabular-nums";
  score.textContent = t("weekly.finalScore", { my: my.score, opp: opp.score });
  dialog.appendChild(score);

  // 메인 캐릭터 박스 스코어
  const mp = result.mainPlayer;
  if (mp?.batterBox?.pa > 0) {
    const b = mp.batterBox;
    const line = document.createElement("div");
    line.className = "muted small";
    line.style.marginBottom = "4px";
    line.innerHTML = `<span style="color:var(--accent)">${t("weekly.batLabel")}</span> ${t("weekly.batterRecap", { pa: b.pa, h: b.h, hr: b.hr, k: b.k })}`;
    dialog.appendChild(line);
    if ((b.hbp ?? 0) + (b.sb ?? 0) + (b.sf ?? 0) + (b.dp ?? 0) > 0) {
      const extra = document.createElement("div");
      extra.className = "muted small";
      extra.style.marginBottom = "4px";
      extra.style.fontSize = "11px";
      extra.style.opacity = "0.75";
      extra.textContent = t("weekly.batterRecapExtra", {
        hbp: b.hbp ?? 0, sb: b.sb ?? 0, sf: b.sf ?? 0, dp: b.dp ?? 0,
      });
      dialog.appendChild(extra);
    }
  }
  if (mp?.pitcherBox) {
    const p = mp.pitcherBox;
    const line = document.createElement("div");
    line.className = "muted small";
    line.style.marginBottom = "10px";
    line.innerHTML = `<span style="color:var(--accent-2)">${t("weekly.pitLabel")}</span> ${t("weekly.pitcherRecap", { er: p.er ?? 0, k: p.pK ?? 0, bb: p.pBB ?? 0, h: p.pH ?? 0 })}`;
    dialog.appendChild(line);
  }

  // 보상 — applyFinalReward 가 changes 반환하므로 미리 적용 (단, onClose 안에서도 적용. 충돌 피하려 여기선 미적용)
  // → onClose 클릭 시점에 한 번만 적용. 미리보기 없이 단순 표시.
  const rewardHint = document.createElement("div");
  rewardHint.className = "muted small";
  rewardHint.style.fontSize = "11px";
  rewardHint.style.marginBottom = "10px";
  rewardHint.textContent = won ? t("weekly.rewardChampion") : t("weekly.rewardRunner");
  dialog.appendChild(rewardHint);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = t("weekly.btnAcceptReward");
  btn.style.width = "100%";
  btn.style.padding = "12px";
  btn.style.fontWeight = "700";
  btn.addEventListener("pointerdown", e => { e.preventDefault(); onClose(); });
  dialog.appendChild(btn);
}

// 평일 carousel 슬라이드 인덱스 (module-level, 재렌더 사이 유지)
let weeklyCarouselIdx = 0;

// 게임 진입 시 carousel 을 항상 첫 슬라이드로 리셋
export function resetWeeklyCarousel() {
  weeklyCarouselIdx = 0;
  seasonEndCarouselIdx = 0;
}

function renderWeeklyCarousel(route, player, league, season) {
  const slides = [
    {
      title: t("weekly.trainingDirectionTitle"),
      render: () => renderTrainingDirectionBody(route),
    },
    {
      title: t("weekly.seasonStatsTitle"),
      render: () => renderSeasonBody(player),
    },
    {
      title: t("weekly.statsTitle"),
      render: () => renderAttributesBody(player),
    },
    {
      title: t("weekly.lastWeekTitle"),
      render: () => renderLastWeekBody(season.weekResults ?? []),
    },
    {
      title: t("weekly.standingsTitle"),
      render: () => renderStandingsBody(league),
    },
  ];
  if (weeklyCarouselIdx >= slides.length) weeklyCarouselIdx = 0;
  return renderCarousel(slides, {
    get: () => weeklyCarouselIdx,
    set: i => { weeklyCarouselIdx = i; },
  });
}

// ─── Carousel 헬퍼 ────────────────────────────────────────────────
// slides: [{ title, render: () => Element }]
// idxRef: { get, set } — 외부 보존 (module-level 또는 state)
function renderCarousel(slides, idxRef) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "12px";

  // 헤더: [‹] 제목 (n/m) [›]
  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.gap = "8px";
  head.style.marginBottom = "10px";

  const prev = document.createElement("button");
  prev.textContent = "‹";
  prev.style.padding = "4px 10px";
  prev.style.fontSize = "16px";
  prev.style.fontWeight = "700";
  prev.style.minWidth = "0";
  prev.style.lineHeight = "1";

  const title = document.createElement("div");
  title.style.flex = "1";
  title.style.textAlign = "center";
  title.style.fontSize = "14px";
  title.style.fontWeight = "700";
  title.style.color = "var(--accent-2)";

  const dot = document.createElement("div");
  dot.className = "muted small";
  dot.style.fontSize = "11px";
  dot.style.minWidth = "32px";
  dot.style.textAlign = "right";

  const next = document.createElement("button");
  next.textContent = "›";
  next.style.padding = "4px 10px";
  next.style.fontSize = "16px";
  next.style.fontWeight = "700";
  next.style.minWidth = "0";
  next.style.lineHeight = "1";

  head.appendChild(prev);
  head.appendChild(title);
  head.appendChild(dot);
  head.appendChild(next);
  panel.appendChild(head);

  const content = document.createElement("div");
  panel.appendChild(content);

  function update() {
    const i = idxRef.get();
    title.textContent = slides[i].title;
    dot.textContent = `${i + 1} / ${slides.length}`;
    content.innerHTML = "";
    content.appendChild(slides[i].render());
  }

  prev.addEventListener("pointerdown", e => {
    e.preventDefault();
    idxRef.set((idxRef.get() - 1 + slides.length) % slides.length);
    update();
  });
  next.addEventListener("pointerdown", e => {
    e.preventDefault();
    idxRef.set((idxRef.get() + 1) % slides.length);
    update();
  });

  update();
  return panel;
}

// 합쳐진 "주차 일정" 패널 — 제목 + 대회 inline + 요일 스트립.
// 일시정지/배속은 상단 ⚙ 설정 모달로 분리됨 (settingsModal.js).
// dataset.keep="schedule" 로 마킹해서 tick 자동 호출 시 element 자체를 보존(클릭 미스 방지).
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function renderSchedulePanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.dataset.keep = "schedule";

  // 상단 한 줄: [제목 N주차 일정] ───── [재생] [속도 토글 1:1 카드]
  const topLine = document.createElement("div");
  topLine.style.display = "flex";
  topLine.style.alignItems = "center";
  topLine.style.gap = "6px";
  topLine.style.flexWrap = "wrap";
  topLine.style.marginBottom = "8px";

  // 제목 — 좌측 끝. marginRight: auto 로 나머지 컨트롤을 우측으로 밀어냄.
  // 제목 + 옆에 작게 대회 이름 inline (예: "3주차 일정  (전반기 주말리그)")
  const h = document.createElement("h2");
  h.dataset.tb = "title";
  h.textContent = t("weekly.scheduleTitle", { week: state.season.weekIndex + 1 });
  h.style.margin = "0";
  h.style.fontSize = "15px";
  h.style.color = "var(--accent-2)";
  h.style.flex = "0 0 auto";
  h.style.whiteSpace = "nowrap";

  const tourInline = document.createElement("span");
  tourInline.dataset.tb = "tournament-inline";
  tourInline.style.fontSize = "11px";
  tourInline.style.marginLeft = "6px";
  tourInline.style.marginRight = "auto";   // 나머지 컨트롤은 우측
  tourInline.style.color = "var(--good)";
  tourInline.style.fontWeight = "500";
  tourInline.textContent = formatInlineTournaments();

  // pause/speed 컨트롤은 별도 settings panel 로 분리됨. 여기는 제목 + 대회 inline 만.
  topLine.appendChild(h);
  topLine.appendChild(tourInline);
  panel.appendChild(topLine);

  // 현재 활성 자동 프리셋 표시 (한 줄, 작게)
  const autoLine = document.createElement("div");
  autoLine.dataset.tb = "auto-mode";
  autoLine.className = "muted small";
  autoLine.style.fontSize = "11px";
  autoLine.style.marginBottom = "8px";
  autoLine.style.color = "var(--accent-2)";
  autoLine.textContent = state.autoMode
    ? t("weekly.autoModeIndicator", { label: t("preset." + state.autoMode + ".label") })
    : "";
  panel.appendChild(autoLine);

  // 요일 스트립 (월~일 7칸) — 날짜 라인 제거하여 카드 높이 절약
  const strip = document.createElement("div");
  strip.className = "daystrip";
  strip.dataset.tb = "strip";
  for (let i = 0; i < 7; i++) {
    const cell = document.createElement("div");
    cell.className = "daycell";
    cell.dataset.tbDay = String(i);
    if (i >= 5) cell.classList.add("weekend");
    if (i < 5 && i < state.season.dayIndex) cell.classList.add("done");

    const lbl = document.createElement("div");
    lbl.className = "label";
    lbl.textContent = t("weekday." + DAY_KEYS[i]);
    const val = document.createElement("div");
    val.className = "val";
    val.dataset.tbVal = String(i);
    val.textContent = computeDayValText(i);

    cell.appendChild(lbl);
    cell.appendChild(val);
    strip.appendChild(cell);
  }
  panel.appendChild(strip);
  return panel;
}

// 일정 카드 제목 옆에 표시할 대회 — 진행 중 대회를 "(이름)" 으로 inline 표시
function formatInlineTournaments() {
  if (!state.player || !state.gameDate) return "";
  const list = getActiveTournaments(state.player.stage, state.gameDate);
  if (list.length === 0) return "";
  return list.map(tn => `(${t("tournament." + tn.key)})`).join(" ");
}

function computeDayValText(i) {
  const season = state.season;
  if (i >= 5) return t("weekly.valGame");
  const a = season.weekActions[i];
  if (a) {
    // 훈련은 "훈련(X)" 대신 종목 짧은 라벨만 (예: "웨이트", "타격")
    if (a.action === "train") return t("trainingShort." + a.detail) || a.detail;
    if (a.action === "work") return t("weekly.valWork");
    return t("weekly.valRest");
  }
  return i === season.dayIndex ? t("weekly.valPicking") : t("common.dash");
}

// 기존 element 의 텍스트/active 클래스만 갱신 — element 자체는 보존되어 클릭 미스 방지
function updateSchedulePanel(el) {
  if (!state.season) return;
  const title = el.querySelector("[data-tb='title']");
  if (title) title.textContent = t("weekly.scheduleTitle", { week: state.season.weekIndex + 1 });

  const pauseBtn = el.querySelector("[data-tb='pause']");
  if (pauseBtn) pauseBtn.textContent = state.paused ? t("weekly.btnPlay") : t("weekly.btnPause");

  const autoLine = el.querySelector("[data-tb='auto-mode']");
  if (autoLine) {
    autoLine.textContent = state.autoMode
      ? t("weekly.autoModeIndicator", { label: t("preset." + state.autoMode + ".label") })
      : "";
  }

  const tourInline = el.querySelector("[data-tb='tournament-inline']");
  if (tourInline) tourInline.textContent = formatInlineTournaments();

  const speedBtns = el.querySelectorAll("[data-tb-speed]");
  for (const b of speedBtns) {
    if (+b.dataset.tbSpeed === state.tickSpeed) b.classList.add("primary");
    else b.classList.remove("primary");
  }

  for (let i = 0; i < 7; i++) {
    const cell = el.querySelector(`[data-tb-day='${i}']`);
    const val = el.querySelector(`[data-tb-val='${i}']`);
    if (cell && i < 5) {
      if (i < state.season.dayIndex) cell.classList.add("done");
      else cell.classList.remove("done");
    }
    if (val) val.textContent = computeDayValText(i);
  }
}

function renderHeaderInfo(player, league, season) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  // 타이틀 줄: avatar 36px + 이름/팀/학년 한 줄
  const titleRow = document.createElement("div");
  titleRow.style.display = "flex";
  titleRow.style.alignItems = "center";
  titleRow.style.gap = "8px";
  titleRow.style.marginBottom = "8px";

  const avatar = document.createElement("div");
  avatar.style.width = "36px";
  avatar.style.height = "36px";
  avatar.style.borderRadius = "50%";
  avatar.style.background = "var(--panel-2)";
  avatar.style.border = "2px solid var(--accent)";
  avatar.style.overflow = "hidden";
  avatar.style.flexShrink = "0";
  avatar.appendChild(createFaceSVG(player.faceId ?? "f1", 32));
  titleRow.appendChild(avatar);

  const h = document.createElement("div");
  h.style.fontSize = "13px";
  h.style.fontWeight = "700";
  h.style.lineHeight = "1.2";
  h.style.minWidth = "0";
  h.style.overflow = "hidden";
  h.style.textOverflow = "ellipsis";
  // 고교/대학은 "{team} {grade}학년", 프로/MLB 는 "{team} {등급라벨}"
  const isSchoolStage = player.stage === "high" || player.stage === "univ";
  h.textContent = isSchoolStage
    ? t("weekly.titleWithTeamGrade", {
        name: player.name,
        team: player.teamName,
        grade: player.grade,
      })
    : t("weekly.titleWithTeamLevel", {
        name: player.name,
        team: player.teamName,
        level: t("stageShort." + player.stage),
      });
  titleRow.appendChild(h);

  panel.appendChild(titleRow);

  // 정보 grid — 3-col × 2줄 (부상 시 3줄)
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  grid.style.gap = "6px 8px";

  grid.appendChild(infoBlock(t("weekly.infoAge"), t("common.age", { age: player.age }), null, "sm"));
  grid.appendChild(infoBlock(t("weekly.infoTalent"), t("talent." + player.talent), null, "sm"));
  // 종합 셀 하나에 타자 / 투수 OVR 합쳐 표시 — "타 35.2 / 투 30.1" 형식
  grid.appendChild(infoBlock(
    t("weekly.infoOverall"),
    t("weekly.batPitOvrVal", {
      bat: batterOVR(player).toFixed(1),
      pit: pitcherOVR(player).toFixed(1),
    }),
    null,
    "sm",
  ));
  grid.appendChild(infoBlock(
    t("weekly.infoStamina"),
    t("weekly.staminaVal", { cur: Math.round(player.stamina), max: player.maxStamina }),
    player.stamina < 30 ? "warn" : null,
    "sm",
  ));
  grid.appendChild(infoBlock(
    t("weekly.infoCondition"),
    `${Math.round(player.condition)}`,
    player.condition > 70 ? "good" : player.condition < 30 ? "bad" : null,
    "sm",
  ));
  const activeTournamentNames = getActiveTournaments(state.player.stage, state.gameDate)
    .map(tn => t("tournament." + tn.key))
    .join(" · ");
  grid.appendChild(infoBlock(
    t("weekly.infoWeek"),
    t("weekly.weekVal", { cur: season.weekIndex + 1, max: league.weeksPerSeason }),
    null,
    "sm",
    activeTournamentNames || null,
  ));
  if (player.injury) {
    grid.appendChild(infoBlock(
      t("weekly.infoInjury"),
      t("weekly.injuryVal", {
        type: t("injury." + player.injury.severity),
        weeks: player.injury.weeksLeft,
      }),
      "bad",
      "sm",
    ));
  }
  panel.appendChild(grid);
  return panel;
}

function infoBlock(label, value, tone, size = "md", sub = null) {
  const d = document.createElement("div");
  d.style.minWidth = size === "sm" ? "0" : "100px";

  const l = document.createElement("div");
  l.textContent = label;
  l.style.color = "var(--muted)";
  l.style.lineHeight = "1.2";
  l.style.fontSize = size === "sm" ? "10px" : "12px";

  const v = document.createElement("div");
  v.textContent = value;
  v.style.lineHeight = "1.2";
  v.style.fontWeight = "700";
  v.style.fontVariantNumeric = "tabular-nums";
  v.style.fontSize = size === "sm" ? "13px" : "18px";

  if (tone === "warn") v.style.color = "var(--warn)";
  if (tone === "bad") v.style.color = "var(--bad)";
  if (tone === "good") v.style.color = "var(--good)";

  d.appendChild(l);
  d.appendChild(v);

  if (sub) {
    const s = document.createElement("div");
    s.textContent = sub;
    s.style.color = "var(--accent-2)";
    s.style.fontSize = "10px";
    s.style.lineHeight = "1.2";
    s.style.marginTop = "1px";
    s.style.whiteSpace = "nowrap";
    s.style.overflow = "hidden";
    s.style.textOverflow = "ellipsis";
    d.appendChild(s);
  }
  return d;
}

// ─── Carousel slide body 함수들 (panel 없이 컨텐츠만) ──────────────
function renderTrainingDirectionBody(route) {
  const wrap = document.createElement("div");
  wrap.appendChild(renderAutoPanel(route));
  if (state.player.injury) {
    const n = document.createElement("div");
    n.className = "notice bad";
    n.style.marginTop = "10px";
    n.textContent = t("injury.inProgress", {
      type: t("injury." + state.player.injury.severity),
      weeks: state.player.injury.weeksLeft,
    });
    wrap.appendChild(n);
  }
  return wrap;
}

function renderSeasonBody(player) {
  const wrap = document.createElement("div");
  const s = player.seasonStats;
  const ba = s.ab > 0 ? (s.h / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  const obp = (s.ab + s.bb) > 0 ? ((s.h + s.bb) / (s.ab + s.bb)).toFixed(3).replace(/^0/, "") : ".---";
  const slg = s.ab > 0 ? (s.tb / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  // IP — outs 단위 누적 (ipOuts) 우선. 없으면 ip 값(이닝) 그대로.
  const totalOuts = s.ipOuts ?? Math.round((s.ip ?? 0) * 3);
  const ipDisplay = totalOuts > 0 ? `${Math.floor(totalOuts / 3)}.${totalOuts % 3}` : "-";
  const ipForEra = totalOuts / 3;
  const era = ipForEra > 0 ? ((s.er / ipForEra) * 9).toFixed(2) : "-";
  const ops = s.ab > 0 ? (parseFloat("0" + obp) + parseFloat("0" + slg)).toFixed(3) : "-";

  const batCard = statBlock(t("weekly.seasonBatter"), "var(--accent)");
  batCard.body.appendChild(infoBlock(t("weekly.statG"),   s.games,    null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statPa"),  s.pa,       null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statH"),   s.h,        null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statHr"),  s.hr,       null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statR"),   s.r   ?? 0, null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statRbi"), s.rbi ?? 0, null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statBa"),  ba,         null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statOps"), ops,        null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statSb"),  s.sb  ?? 0, null, "sm"));
  batCard.body.appendChild(infoBlock(t("weekly.statHbp"), s.hbp ?? 0, null, "sm"));
  batCard.root.style.marginBottom = "8px";
  wrap.appendChild(batCard.root);

  const pitCard = statBlock(t("weekly.seasonPitcher"), "var(--accent-2)");
  pitCard.body.appendChild(infoBlock(t("weekly.statPitchG"), s.pitchG,    null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statIp"),    ipDisplay,    null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statEra"),   era,          null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statKK"),    s.pK,         null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statW"),     s.w  ?? 0,    null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statL"),     s.l  ?? 0,    null, "sm"));
  pitCard.body.appendChild(infoBlock(t("weekly.statSv"),    s.sv ?? 0,    null, "sm"));
  wrap.appendChild(pitCard.root);

  // 이번 시즌의 대회 기록
  wrap.appendChild(renderSeasonTournaments(player));

  return wrap;
}

// 이번 시즌(현재 year) 의 대회 기록을 카드 형태로 — 각 토너먼트별 결과 + MVP 뱃지
function renderSeasonTournaments(player) {
  const wrap = document.createElement("div");
  wrap.style.background = "var(--panel-2)";
  wrap.style.border = "1px solid var(--border)";
  wrap.style.borderTop = "3px solid var(--good)";
  wrap.style.borderRadius = "8px";
  wrap.style.padding = "8px";
  wrap.style.marginTop = "8px";

  const h = document.createElement("h4");
  h.textContent = t("weekly.tournamentRecords");
  h.style.margin = "0 0 6px";
  h.style.fontSize = "11px";
  h.style.fontWeight = "700";
  h.style.letterSpacing = "0.3px";
  h.style.color = "var(--good)";
  wrap.appendChild(h);

  const year = state.gameDate?.year;
  const records = (player.tournamentHistory ?? []).filter(r => r.year === year);
  if (records.length === 0) {
    const none = document.createElement("div");
    none.className = "muted small";
    none.style.fontSize = "11px";
    none.textContent = t("weekly.noTournamentsYet");
    wrap.appendChild(none);
    return wrap;
  }
  for (const r of records) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.padding = "3px 0";
    row.style.fontSize = "12px";

    const name = document.createElement("span");
    name.textContent = t("tournament." + r.tournamentKey);
    row.appendChild(name);

    const result = document.createElement("span");
    const resultColor = r.result === "champion" ? "var(--good)"
                      : r.result === "runner"   ? "var(--accent-2)"
                      : "var(--muted)";
    result.style.color = resultColor;
    result.style.fontWeight = "700";
    result.textContent = t("result." + r.result);
    if (r.mvp) {
      result.textContent += "  ★ " + t("weekly.mvpBadge");
    }
    row.appendChild(result);

    wrap.appendChild(row);
  }
  return wrap;
}

function renderLastWeekBody(results) {
  const wrap = document.createElement("div");
  if (!results || results.length === 0) {
    const none = document.createElement("div");
    none.className = "muted small";
    none.style.padding = "20px 0";
    none.style.textAlign = "center";
    none.textContent = t("weekly.noGamesYet");
    wrap.appendChild(none);
    return wrap;
  }
  for (const r of results) {
    const line = document.createElement("div");
    line.style.padding = "6px 0";
    line.style.borderBottom = "1px solid var(--border)";
    line.style.fontSize = "13px";
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
        const batEvents = (mp.events ?? [])
          .filter(e => e.role === "batter")
          .map(e => t("event." + e.type))
          .join(" / ");
        const b = mp.batterBox;
        const bLine = document.createElement("div");
        bLine.className = "muted small";
        const recap = t("weekly.batterRecap", { pa: b.pa, h: b.h, hr: b.hr, k: b.k });
        bLine.innerHTML = `<span style="color:var(--accent)">${t("weekly.batLabel")}</span> ${recap}${batEvents ? ` — ${batEvents}` : ""}`;
        detail.appendChild(bLine);
        if ((b.hbp ?? 0) + (b.sb ?? 0) + (b.sf ?? 0) + (b.dp ?? 0) > 0) {
          const bLineExtra = document.createElement("div");
          bLineExtra.className = "muted small";
          bLineExtra.style.fontSize = "10.5px";
          bLineExtra.style.opacity = "0.7";
          bLineExtra.style.paddingLeft = "26px";
          bLineExtra.textContent = t("weekly.batterRecapExtra", {
            hbp: b.hbp ?? 0, sb: b.sb ?? 0, sf: b.sf ?? 0, dp: b.dp ?? 0,
          });
          detail.appendChild(bLineExtra);
        }
      }
      if (mp.pitcherBox) {
        const p = mp.pitcherBox;
        const pLine = document.createElement("div");
        pLine.className = "muted small";
        const recap = t("weekly.pitcherRecap", {
          er: p.er ?? 0, k: p.pK ?? 0, bb: p.pBB ?? 0, h: p.pH ?? 0,
        });
        pLine.innerHTML = `<span style="color:var(--accent-2)">${t("weekly.pitLabel")}</span> ${recap}`;
        detail.appendChild(pLine);
      }
      // POV 재생 버튼 (이벤트가 있을 때만)
      if ((mp.events ?? []).length > 0) {
        const playBtn = document.createElement("button");
        playBtn.style.cssText = "margin-top:5px; align-self:flex-start; padding:4px 10px; font-size:11px; background:var(--panel-2); border:1px solid var(--accent); color:var(--accent); border-radius:4px; cursor:pointer;";
        playBtn.textContent = t("weekly.btnReplay");
        playBtn.addEventListener("pointerdown", e => {
          e.preventDefault();
          openGameReplayModal(r);
        });
        detail.appendChild(playBtn);
      }
      line.appendChild(detail);
    }
    wrap.appendChild(line);
  }
  return wrap;
}

// 일반 경기 POV 미리보기 모달 — 메인 캐릭터 이벤트만 순차 재생.
// 결승 모달의 라인스코어/점수판은 생략, POV 씬 + 짧은 텍스트 로그만.
function openGameReplayModal(gameResult) {
  const events = gameResult.mainPlayer?.events ?? [];
  if (events.length === 0) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  // 헤더
  const header = document.createElement("div");
  header.style.cssText = "margin-bottom:8px; font-size:13px; font-weight:700; text-align:center;";
  const my = gameResult.home.team.isPlayerTeam ? gameResult.home : gameResult.away;
  const opp = my === gameResult.home ? gameResult.away : gameResult.home;
  header.textContent = `${my.team.name} ${my.score} : ${opp.score} ${opp.team.name}`;
  dialog.appendChild(header);

  // POV 씬 컨테이너 — role 별 mode 가 다를 수 있으므로 동적 swap
  const sceneWrap = document.createElement("div");
  sceneWrap.style.cssText = "display:flex; justify-content:center; margin-bottom:8px; min-height:200px;";
  dialog.appendChild(sceneWrap);

  // 이벤트 로그 — 누적
  const logBox = document.createElement("div");
  logBox.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:6px 10px; max-height:100px; overflow-y:auto; font-size:11px; line-height:1.4; margin-bottom:10px;";
  dialog.appendChild(logBox);

  // 닫기 버튼
  const closeBtn = document.createElement("button");
  closeBtn.textContent = t("common.close") || "닫기";
  closeBtn.style.cssText = "width:100%; padding:8px; font-size:13px;";
  closeBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    cancelled = true;
    backdrop.remove();
  });
  dialog.appendChild(closeBtn);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  let cancelled = false;
  let currentScene = null;
  let currentMode = null;

  (async function run() {
    for (const ev of events) {
      if (cancelled) return;
      // 교체/대타/대주자 등 시스템 이벤트는 POV 투구 없이 로그만.
      if (ev.role === "system") {
        const row = document.createElement("div");
        const lbl = t("event." + ev.type) || ev.type;
        let detail;
        if (ev.type === "PIT_CHANGE") {
          detail = `${t("event.pitOut")} ${ev.from} / ${t("event.pitIn")} ${ev.to}`;
        } else {
          const arrow = ev.from ? `${ev.from} → ` : "";
          detail = ev.to ? `${arrow}${ev.to}` : "";
        }
        row.innerHTML = `<span style="color:var(--muted); font-weight:700">[${ev.inning}] ${lbl}</span> ${detail}`;
        logBox.appendChild(row);
        logBox.scrollTop = logBox.scrollHeight;
        await new Promise(r => setTimeout(r, 120));
        continue;
      }
      const mode = ev.role === "batter" ? "bat" : "pit";
      if (mode !== currentMode) {
        currentScene = createPOVScene(mode);
        while (sceneWrap.firstChild) sceneWrap.removeChild(sceneWrap.firstChild);
        sceneWrap.appendChild(currentScene.el);
        currentMode = mode;
      }
      await currentScene.playPitch(ev);
      if (cancelled) return;
      const row = document.createElement("div");
      const roleColor = ev.role === "batter" ? "var(--accent)" : "var(--accent-2)";
      const roleLbl = ev.role === "batter" ? t("weekly.batLabel") : t("weekly.pitLabel");
      row.innerHTML = `<span style="color:${roleColor}; font-weight:700">[${ev.inning}] ${roleLbl}</span> ${t("event." + ev.type)}`;
      logBox.appendChild(row);
      logBox.scrollTop = logBox.scrollHeight;
      await new Promise(r => setTimeout(r, 150));
    }
  })();
}

function renderStandingsBody(league) {
  const wrap = document.createElement("div");
  const head = t("weekly.standingsHead");
  const table = document.createElement("table");
  table.style.fontSize = "12px";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>${head.rank}</th><th>${head.team}</th><th>${head.w}</th><th>${head.l}</th><th>${head.t}</th><th>${head.pct}</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const sorted = standings(league);
  sorted.forEach((tm, i) => {
    const tr = document.createElement("tr");
    if (tm.isPlayerTeam) tr.className = "me";
    const total = tm.record.w + tm.record.l;
    const pct = total > 0 ? (tm.record.w / total).toFixed(3).replace(/^0/, "") : ".---";
    tr.innerHTML = `<td>${i + 1}</td><td>${tm.name}</td><td class="num">${tm.record.w}</td><td class="num">${tm.record.l}</td><td class="num">${tm.record.t}</td><td class="num">${pct}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// 시즌 종료 화면용 — 능력치 (레이더 + 막대 그래프) body
function renderAttributesBody(player) {
  const wrap = document.createElement("div");
  const chances = appearanceChance(player, getPlayerTeam(state.league));
  const statLabels = getStatLabels();

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "8px";
  row.style.alignItems = "flex-start";

  const radarBox = document.createElement("div");
  radarBox.style.flex = "0 0 auto";
  const labels = [...BATTER_STATS, ...PITCHER_STATS];
  const values = {};
  for (const s of BATTER_STATS) values[s] = player.batter[s];
  for (const s of PITCHER_STATS) values[s] = player.pitcher[s];
  // 그래프 max — stage base cap + 스탯별 영구 캡 보너스 반영해 동적 조정.
  // 레이다는 전 축 공통 max 라서 가장 큰 스탯 캡(getPlayerMaxStatCap)에 맞춤 — 한 축도 안 넘치게.
  // 막대는 각 스탯의 개별 캡으로 채움률 표시.
  const radarMax = getPlayerMaxStatCap(player);
  radarBox.appendChild(createRadarSVG(values, labels, {
    size: 160, min: 0, max: radarMax, labelMap: statLabels,
  }));
  row.appendChild(radarBox);

  const barsCol = document.createElement("div");
  barsCol.style.flex = "1 1 0";
  barsCol.style.minWidth = "0";
  barsCol.style.display = "flex";
  barsCol.style.flexDirection = "column";
  barsCol.style.gap = "3px";
  for (const s of BATTER_STATS) {
    barsCol.appendChild(statBarRow(statLabels[s], player.batter[s], "var(--accent)", getPlayerStatCap(player, s)));
  }
  for (const s of PITCHER_STATS) {
    barsCol.appendChild(statBarRow(statLabels[s], player.pitcher[s], "var(--accent-2)", getPlayerStatCap(player, s)));
  }
  row.appendChild(barsCol);
  wrap.appendChild(row);
  return wrap;
}

function renderAutoPanel(route) {
  // 능력치 카드와 동일하게 — 외곽 컨테이너/안내 텍스트 없이 grid 자체만 panel에 추가됨
  // 안드로이드 portrait (~360px) 에서는 auto-fit 으로 wrap 되어 4개씩 2줄로, 데스크탑(>~1000px) 에선 8개 한 줄로.
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(78px, 1fr))";
  grid.style.gap = "6px";

  for (const key of Object.keys(AUTO_PRESETS)) {
    const active = state.autoMode === key;
    const card = document.createElement("div");
    card.style.background = active ? "rgba(255,184,78,0.12)" : "var(--panel)";
    card.style.border = active ? "1.5px solid var(--accent-2)" : "1px solid var(--border)";
    card.style.borderRadius = "6px";
    card.style.padding = "8px 6px";
    card.style.cursor = "pointer";
    card.style.transition = "border-color 120ms, background 120ms";
    card.style.minWidth = "0";

    const lbl = document.createElement("div");
    lbl.style.fontWeight = "700";
    lbl.style.fontSize = "12px";
    lbl.style.lineHeight = "1.2";
    lbl.style.color = active ? "var(--accent-2)" : "var(--text)";
    lbl.textContent = t("preset." + key + ".label");
    const desc = document.createElement("div");
    desc.className = "muted small";
    desc.style.marginTop = "4px";
    desc.style.lineHeight = "1.3";
    desc.style.fontSize = "10.5px";
    desc.textContent = t("preset." + key + ".desc");

    card.appendChild(lbl);
    card.appendChild(desc);

    card.addEventListener("mouseenter", () => {
      if (!active) card.style.borderColor = "var(--accent-2)";
    });
    card.addEventListener("mouseleave", () => {
      if (!active) card.style.borderColor = "var(--border)";
    });
    card.addEventListener("click", () => {
      state.autoMode = key;
      state.trainSwitchAcked = false;   // 방향 바꾸면 새 방향의 cap 도달 안내 재활성화
      const summary = autoFillWeek(key);
      saveGame();
      route("weekly");
      const msgs = [t("weekly.autoToggleOn", { label: t("preset." + key + ".label") })];
      if (summary.days.length > 0) msgs.push(t("weekly.autoDays", { days: summary.days.length }));
      if (summary.crits > 0) msgs.push(t("weekly.autoCrits", { count: summary.crits }));
      if (summary.newInjury) msgs.push(t("weekly.autoInjury"));
      showCriticalToast(msgs.join(" · "));
    });
    grid.appendChild(card);
  }
  return grid;
}

// 토스트 — kind = "good" (긍정) | "bad" (부정) | "info" (중립)
function showToast(msg, kind = "good") {
  const colors = {
    good: { bg: "#3fb950", shadow: "rgba(63,185,80,0.4)" },
    bad:  { bg: "#f85149", shadow: "rgba(248,81,73,0.4)" },
    info: { bg: "#4ea4ff", shadow: "rgba(78,164,255,0.4)" },
  };
  const c = colors[kind] ?? colors.good;
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: c.bg,
    color: "#08111c",
    padding: "12px 20px",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "14px",
    maxWidth: "92vw",
    boxShadow: `0 6px 20px ${c.shadow}, 0 0 30px ${c.shadow}`,
    zIndex: "1000",
    transition: "opacity 400ms, transform 400ms",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = "translateX(-50%) translateY(6px)";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(-10px)";
  }, 1800);
  setTimeout(() => el.remove(), 2300);
}

// 부상 토스트 — applyInjury 에서 set 한 _isNew 플래그를 감지해 한 번만 띄움.
// 부위/수술/후유증 정보가 있으면 우선 노출.
function showInjuryToastIfNeeded() {
  const inj = state.player?.injury;
  if (!inj?._isNew) return;

  if (inj.surgery) {
    showInjuryModal(t("injury.surgery", { weeks: inj.weeksLeft }));   // 큰 부상(수술)은 컷 모달
  } else if (inj.bodyPart) {
    showToast(t("injury.detectedWithPart", {
      part: t("bodyPart." + inj.bodyPart),
      type: t("injury." + inj.severity),
      weeks: inj.weeksLeft,
    }), "bad");
  } else {
    showToast(t("injury.detected", {
      type: t("injury." + inj.severity),
      weeks: inj.weeksLeft,
    }), "bad");
  }

  if (inj.aftereffect && inj.aftereffect.affected?.length > 0) {
    setTimeout(() => showToast(t("injury.aftereffect"), "bad"), 600);
  }
  inj._isNew = false;
}

// 큰 부상(수술) 컷 모달 — eventInjury 일러스트 + 메시지.
function showInjuryModal(msg) {
  sfx("bad");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "340px";
  const h = document.createElement("h2");
  h.style.color = "var(--bad)";
  h.textContent = t("injury.modalTitle");
  dialog.appendChild(h);
  dialog.appendChild(eventCut("eventInjury"));
  const p = document.createElement("p");
  p.className = "muted small";
  p.style.cssText = "margin:0 0 14px; line-height:1.5;";
  p.textContent = msg;
  dialog.appendChild(p);
  const btn = document.createElement("button");
  btn.className = "primary";
  btn.style.cssText = "width:100%; padding:11px; font-weight:700;";
  btn.textContent = t("common.confirm");
  btn.addEventListener("pointerdown", e => { e.preventDefault(); backdrop.remove(); });
  dialog.appendChild(btn);
  backdrop.appendChild(dialog);
  backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

// pendingToasts 큐를 소비 — 여러 개면 시간 차로 띄움.
function drainPendingToasts() {
  const queue = state.pendingToasts ?? [];
  if (queue.length === 0) return;
  queue.forEach((toast, idx) => {
    setTimeout(() => showToast(toast.msg, toast.kind), idx * 300);
  });
  state.pendingToasts = [];
}

// 호환: 옛 이름 그대로 호출하는 곳을 위해 별칭
function showCriticalToast(msg) { showToast(msg, "good"); }

// 능력치 1개 행 — 라벨 + 막대 그래프 + 수치. STAT_CAP(150) 기준.
function statBarRow(label, value, color, max = 150) {
  const row = document.createElement("div");
  row.className = "stat-row";

  const n = document.createElement("div");
  n.className = "stat-name";
  n.textContent = label;

  const bar = document.createElement("div");
  bar.className = "stat-bar";
  const fill = document.createElement("div");
  fill.className = "stat-fill";
  fill.style.background = color;
  fill.style.width = `${Math.min(100, (value / max) * 100)}%`;
  bar.appendChild(fill);

  const v = document.createElement("div");
  v.className = "stat-val";
  v.style.color = color;
  v.style.fontWeight = "600";
  // 소수 1자리 — 훈련 1회 +0.2 같은 작은 증가도 보이게 (정수 반올림은 누적돼야 변함).
  v.textContent = (Math.round(value * 10) / 10).toFixed(1);

  row.appendChild(n);
  row.appendChild(bar);
  row.appendChild(v);
  return row;
}

// 시즌성적 좌/우 컬럼 — 컬러 상단 보더 + 패널2 배경으로 영역 시각 구분
function statBlock(title, accent) {
  const root = document.createElement("div");
  root.style.flex = "1 1 180px";
  root.style.minWidth = "160px";
  root.style.background = "var(--panel-2)";
  root.style.border = "1px solid var(--border)";
  root.style.borderTop = `3px solid ${accent}`;
  root.style.borderRadius = "8px";
  root.style.padding = "8px";

  const h = document.createElement("h4");
  h.textContent = title;
  h.style.margin = "0 0 6px";
  h.style.color = accent;
  h.style.fontSize = "11px";
  h.style.fontWeight = "700";
  h.style.letterSpacing = "0.3px";
  root.appendChild(h);

  // 컴팩트 grid — 안드로이드 폭 기준 3-col 로 강제 (6칸 → 2줄 / 4칸 → 1.x 줄)
  const body = document.createElement("div");
  body.style.display = "grid";
  body.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  body.style.gap = "6px 8px";
  root.appendChild(body);

  return { root, body };
}

// (구) renderLastWeekResults / renderStandings — carousel slide body 로 대체됨.

// ─────────────── 시즌 종료 + 휴식기 ───────────────
// 시즌 종료 carousel 인덱스
let seasonEndCarouselIdx = 0;

// 리그(단계)별 경쟁 수준 가중치 — 커리어 하이 판정용.
// 같은 기록이면 상위 리그가 채택되고, 상위 리그의 다소 낮은 기록도 가중 환산 시 하위 리그를 이길 수 있다.
const CAREER_HIGH_LEAGUE_WEIGHT = {
  high:    1,
  univ:    2,
  pro2:    3,   // KBO 2군
  mlb_a:   4,   // 싱글A
  mlb_aa:  5,   // AA
  pro1:    6,   // KBO 1군
  mlb_aaa: 7,   // AAA
  mlb:     9,   // 메이저
};
function careerHighLeagueWeight(stage) {
  return CAREER_HIGH_LEAGUE_WEIGHT[stage] ?? 1;
}

// 커리어 하이 grid — careerHistory + 현재 시즌의 stat별 최고 기록.
// 각 기록은 "원본 수치 × 리그 가중치"(ERA 는 ÷ 가중치, 낮을수록 우수)로 비교해
// 최고인 시즌을 채택하고, 그 시즌의 원본 수치 + 소속 리그 라벨을 함께 표시한다.
function renderCareerHighGrid(player) {
  const seasons = [
    ...(player.careerHistory ?? []).map(h => ({ stats: h.stats ?? {}, stage: h.stage })),
    { stats: player.seasonStats ?? {}, stage: player.stage },
  ];

  // higher-better: value × weight 최대인 시즌 채택. valid(s) 로 자격 거른다.
  function bestHigh(getValue, valid = () => true) {
    let bestScore = -Infinity, bestVal = 0, bestStage = null;
    for (const s of seasons) {
      if (!valid(s.stats)) continue;
      const v = getValue(s.stats);
      if (v == null) continue;
      const score = v * careerHighLeagueWeight(s.stage);
      if (score > bestScore) { bestScore = score; bestVal = v; bestStage = s.stage; }
    }
    return { val: bestVal, stage: bestStage };
  }
  // lower-better (ERA): value ÷ weight 최소인 시즌 채택.
  function bestLow(getValue, valid) {
    let bestScore = Infinity, bestVal = null, bestStage = null;
    for (const s of seasons) {
      if (!valid(s.stats)) continue;
      const v = getValue(s.stats);
      if (v == null) continue;
      const score = v / careerHighLeagueWeight(s.stage);
      if (score < bestScore) { bestScore = score; bestVal = v; bestStage = s.stage; }
    }
    return { val: bestVal, stage: bestStage };
  }

  const stageLabel = stage => (stage ? t("stage." + stage) : null);

  const ba  = bestHigh(s => (s.ab > 0 ? s.h / s.ab : null), s => s.ab > 0);
  const hr  = bestHigh(s => s.hr ?? 0);
  const h   = bestHigh(s => s.h ?? 0);
  const era = bestLow(s => (s.ip > 0 ? (s.er / s.ip) * 9 : null), s => s.ip > 0);
  const kk  = bestHigh(s => s.pK ?? 0);
  const ip  = bestHigh(s => s.ip ?? 0);
  const pa  = bestHigh(s => s.pa ?? 0);
  const g   = bestHigh(s => s.games ?? 0);

  const baStr  = ba.val > 0  ? ba.val.toFixed(3).replace(/^0/, "") : ".---";
  const eraStr = era.val == null ? "-" : era.val.toFixed(2);

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  grid.style.gap = "6px 8px";

  // 기록이 없으면(0/null) 리그 라벨 생략.
  grid.appendChild(infoBlock(t("weekly.statBa"), baStr, null, "sm", ba.val > 0 ? stageLabel(ba.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statHr"), hr.val, null, "sm", hr.val > 0 ? stageLabel(hr.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statH"),  h.val,  null, "sm", h.val > 0 ? stageLabel(h.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statEra"), eraStr, null, "sm", era.val != null ? stageLabel(era.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statKK"),  kk.val, null, "sm", kk.val > 0 ? stageLabel(kk.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statIp"),  ip.val.toFixed(1), null, "sm", ip.val > 0 ? stageLabel(ip.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statPa"),  pa.val, null, "sm", pa.val > 0 ? stageLabel(pa.stage) : null));
  grid.appendChild(infoBlock(t("weekly.statG"),   g.val,  null, "sm", g.val > 0 ? stageLabel(g.stage) : null));

  return grid;
}

// 통산 기록 슬라이드 — 누적 stat (시즌 종료 시점에 시즌 결과 합산 후 표시되도록 시즌 시점 stats + 누적 추가)
// ─── 리그 그룹 (통산 기록·우승/준우승 분리 단위 — B안) ────────────────
// 실제 야구처럼 KBO·MLB 통산은 분리. 마이너(2군/AAA 이하)도 별도.
const LEAGUE_GROUPS = ["high", "univ", "kbo1", "kbo2", "mlbMajor", "mlbMinor"];

function leagueGroupOfStage(stage) {
  switch (stage) {
    case "high": return "high";
    case "univ": return "univ";
    case "pro1": return "kbo1";
    case "pro2": return "kbo2";
    case "mlb":  return "mlbMajor";
    case "mlb_a": case "mlb_aa": case "mlb_aaa": return "mlbMinor";
    default: return null;
  }
}

// 대회 키 → 리그 그룹. HS 토너먼트 / 대학(_univ) / KBO PO(kbo_) / MLB PO(mlb_).
function leagueGroupOfTournament(key) {
  if (!key) return null;
  if (key.startsWith("kbo_")) return "kbo1";
  if (key.startsWith("mlb_")) return "mlbMajor";
  if (key.startsWith("univ_") || key.endsWith("_univ")) return "univ";
  return "high";
}

function renderCareerTotalsBody(player) {
  // 리그별 분리 집계. careerHistory 의 시즌별 stats 를 리그 그룹으로 묶고,
  // 아직 careerStats/careerHistory 에 안 들어간 현재 시즌(seasonStats)은 현재 stage 그룹에 더해 미리 반영.
  const groups = {};
  const ensure = g => (groups[g] ??= { games: 0, ab: 0, h: 0, hr: 0, pK: 0, ipOuts: 0, er: 0 });
  const addStats = (g, s) => {
    if (!g || !s) return;
    const a = ensure(g);
    a.games += s.games ?? 0;
    a.ab += s.ab ?? 0;
    a.h  += s.h  ?? 0;
    a.hr += s.hr ?? 0;
    a.pK += s.pK ?? 0;
    a.ipOuts += s.ipOuts ?? Math.round((s.ip ?? 0) * 3);
    a.er += s.er ?? 0;
  };
  for (const h of (player.careerHistory ?? [])) addStats(leagueGroupOfStage(h.stage), h.stats);
  addStats(leagueGroupOfStage(player.stage), player.seasonStats);

  const played = LEAGUE_GROUPS.filter(g => groups[g] && (groups[g].games > 0 || groups[g].ipOuts > 0));

  const wrap = document.createElement("div");
  if (played.length === 0) {
    const none = document.createElement("div");
    none.className = "muted small";
    none.style.cssText = "padding:4px 2px; font-size:11px;";
    none.textContent = t("weekly.careerNoGames");
    wrap.appendChild(none);
    return wrap;
  }

  const table = document.createElement("table");
  table.style.cssText = "width:100%; border-collapse:collapse; font-size:11px;";
  const thead = document.createElement("tr");
  for (const [label, alignNum] of [
    [t("weekly.ctLeague"), false], [t("weekly.ctG"), true], [t("weekly.ctAvg"), true],
    [t("weekly.ctHr"), true], [t("weekly.ctIp"), true], [t("weekly.ctEra"), true], [t("weekly.ctK"), true],
  ]) {
    const th = document.createElement("th");
    th.textContent = label;
    th.style.cssText = `padding:3px 4px; font-size:10px; color:var(--muted); text-align:${alignNum ? "right" : "left"};`;
    thead.appendChild(th);
  }
  table.appendChild(thead);

  for (const g of played) {
    const a = groups[g];
    const ba = a.ab > 0 ? (a.h / a.ab).toFixed(3).replace(/^0/, "") : ".---";
    const ip = a.ipOuts / 3;
    const era = ip > 0 ? ((a.er / ip) * 9).toFixed(2) : "-";
    const tr = document.createElement("tr");
    const cells = [
      [t("leagueGroup." + g), false],
      [String(a.games), true],
      [ba, true],
      [String(a.hr), true],
      [ip >= 1 ? ip.toFixed(0) : (ip > 0 ? ip.toFixed(1) : "-"), true],
      [era, true],
      [a.pK > 0 ? String(a.pK) : "-", true],
    ];
    for (const [val, alignNum] of cells) {
      const td = document.createElement("td");
      td.textContent = val;
      td.style.cssText = `padding:4px; border-top:1px solid var(--border); text-align:${alignNum ? "right" : "left"};${alignNum ? "" : " font-weight:600;"}`;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  wrap.appendChild(table);
  return wrap;
}

// 리그별 우승·준우승 — tournamentHistory(champion/runner)를 리그 그룹으로 집계.
function renderLeagueTitlesBody(player) {
  const wrap = document.createElement("div");
  const tally = {};   // group -> { champion, runner }
  for (const r of (player.tournamentHistory ?? [])) {
    if (r.result !== "champion" && r.result !== "runner") continue;
    const g = leagueGroupOfTournament(r.tournamentKey);
    if (!g) continue;
    (tally[g] ??= { champion: 0, runner: 0 })[r.result]++;
  }
  const played = LEAGUE_GROUPS.filter(g => tally[g]);
  if (played.length === 0) {
    const none = document.createElement("div");
    none.className = "muted small";
    none.style.cssText = "padding:4px 2px; font-size:11px;";
    none.textContent = t("weekly.noTournamentsYet");
    wrap.appendChild(none);
    return wrap;
  }
  for (const g of played) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:5px 2px; border-bottom:1px solid var(--border); font-size:12px;";
    const name = document.createElement("span");
    name.style.fontWeight = "600";
    name.textContent = t("leagueGroup." + g);
    row.appendChild(name);
    const rec = document.createElement("span");
    const parts = [];
    if (tally[g].champion > 0) parts.push(`<span style="color:var(--good); font-weight:700;">${t("result.champion")} ×${tally[g].champion}</span>`);
    if (tally[g].runner > 0)   parts.push(`<span style="color:var(--accent-2); font-weight:700;">${t("result.runner")} ×${tally[g].runner}</span>`);
    rec.innerHTML = parts.join(" · ");
    row.appendChild(rec);
    wrap.appendChild(row);
  }
  return wrap;
}

// 시즌 수상 슬라이드 — 이번 시즌 수상 + 통산 수상 카운트
function renderAwardsBody(player, season) {
  const wrap = document.createElement("div");

  // 이번 시즌
  const seasonWon = season?.awardsThisSeason ?? [];
  if (seasonWon.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.style.padding = "4px 2px";
    empty.textContent = t("weekly.noAwards");
    wrap.appendChild(empty);
  } else {
    wrap.appendChild(eventCut("eventAward"));   // 시상 컷 (수상 있을 때)
    for (const key of seasonWon) {
      const row = document.createElement("div");
      row.style.cssText = "padding:7px 10px; background:var(--panel-2); border-left:3px solid var(--accent-2); border-radius:4px; margin-bottom:5px; font-weight:600; font-size:13px;";
      row.textContent = t("award." + key);
      wrap.appendChild(row);
    }
  }

  // 통산 수상 (이번 시즌 포함)
  const careerAwards = player.awards ?? [];
  if (careerAwards.length > 0) {
    const title = document.createElement("h3");
    title.style.cssText = "margin:12px 0 6px; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px;";
    title.textContent = t("weekly.careerAwardsTitle");
    wrap.appendChild(title);

    const counts = {};
    for (const a of careerAwards) counts[a.key] = (counts[a.key] ?? 0) + 1;
    const order = ["mvp", "twoWayMvp", "rookie", "battingTitle", "hrKing", "rbiKing", "kKing", "eraTitle"];
    const sortedKeys = Object.keys(counts).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const key of sortedKeys) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; padding:4px 8px; font-size:12px; border-bottom:1px solid var(--border);";
      row.innerHTML = `<span>${t("award." + key)}</span><span style="font-weight:700; color:var(--accent-2)">×${counts[key]}</span>`;
      wrap.appendChild(row);
    }
  }

  // 리그별 우승·준우승 (시즌 종료 화면)
  const titles = document.createElement("h3");
  titles.style.cssText = "margin:12px 0 6px; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px;";
  titles.textContent = t("weekly.leagueTitlesTitle");
  wrap.appendChild(titles);
  wrap.appendChild(renderLeagueTitlesBody(player));

  return wrap;
}

function renderSeasonEnd(root, route) {
  root.innerHTML = "";
  const { player, league } = state;
  const wrap = document.createElement("div");
  wrap.className = "stack";

  // 1) 시즌 종료 헤더 카드 — 제목 + 해당 시즌 1줄 요약
  const headerPanel = document.createElement("section");
  headerPanel.className = "panel";
  headerPanel.style.padding = "10px 12px";

  const h = document.createElement("h2");
  h.style.margin = "0 0 4px";
  h.style.fontSize = "15px";
  // 고교/대학은 "{grade}학년 시즌 종료", 프로·MLB 는 학년 개념이 없으니 "만N세 시즌 종료" (12학년 오표기 방지).
  const isAmateurEnd = player.stage === "high" || player.stage === "univ";
  h.textContent = isAmateurEnd
    ? t("weekly.seasonEndTitle", { grade: player.grade })
    : t("weekly.seasonEndTitlePro", { age: player.age });
  headerPanel.appendChild(h);

  const s = player.seasonStats;
  const ba = s.ab > 0 ? (s.h / s.ab).toFixed(3).replace(/^0/, "") : ".---";
  const era = s.ip > 0 ? ((s.er / s.ip) * 9).toFixed(2) : "-";
  const team = getPlayerTeam(league);
  const summary = document.createElement("div");
  summary.className = "muted small";
  summary.style.fontSize = "11px";
  summary.textContent = `${s.games} ${t("weekly.statG")} · ${t("weekly.statBa")} ${ba} · ${s.hr} ${t("weekly.statHr")} · ${t("weekly.statEra")} ${era}`
    + (team ? ` · ${t("weekly.teamRecordVal", { w: team.record.w, l: team.record.l })}` : "");
  headerPanel.appendChild(summary);
  wrap.appendChild(headerPanel);

  // 2) 커리어 하이 카드 (별도 패널)
  const careerPanel = document.createElement("section");
  careerPanel.className = "panel";
  careerPanel.style.padding = "10px 12px";
  const careerTitle = document.createElement("h3");
  careerTitle.style.margin = "0 0 8px";
  careerTitle.style.fontSize = "12px";
  careerTitle.style.color = "var(--accent-2)";
  careerTitle.style.textTransform = "uppercase";
  careerTitle.style.letterSpacing = "0.5px";
  careerTitle.textContent = t("weekly.careerHigh");
  careerPanel.appendChild(careerTitle);
  careerPanel.appendChild(renderCareerHighGrid(player));
  wrap.appendChild(careerPanel);

  // 2) Carousel — 시즌 성적 / 시즌 수상 / 통산 기록 / 리그 순위 / 능력치
  const slides = [
    { title: t("weekly.seasonStatsTitle"),   render: () => renderSeasonBody(player) },
    { title: t("weekly.awardsTitle"),        render: () => renderAwardsBody(player, state.season) },
    { title: t("weekly.careerTotalsTitle"),  render: () => renderCareerTotalsBody(player) },
    { title: t("weekly.standingsTitle"),     render: () => renderStandingsBody(league) },
    { title: t("weekly.statsTitle"),         render: () => renderAttributesBody(player) },
  ];
  if (seasonEndCarouselIdx >= slides.length) seasonEndCarouselIdx = 0;
  wrap.appendChild(renderCarousel(slides, {
    get: () => seasonEndCarouselIdx,
    set: i => { seasonEndCarouselIdx = i; },
  }));

  // 3) 진행 버튼 분기
  const isGraduation = (player.stage === "high" && player.grade >= 3)
                     || (player.stage === "univ" && player.grade >= 4);
  if (state.career?.ended) {
    wrap.appendChild(renderCareerEndedPanel(route));
  } else if (isGraduation) {
    wrap.appendChild(renderCareerPathPanel(route));
  } else {
    // "확인" 버튼 → 휴식기 모달. 클라우드 저장 가능하면 위에 ☁️ 버튼도 함께.
    const btnPanel = document.createElement("section");
    btnPanel.className = "panel";
    btnPanel.style.padding = "10px";

    // ☁️ 시즌 종료 마다 클라우드 저장 — 영구 백업. Google 로그인(비익명)일 때만 (익명은 기기 종속이라 동기화 불가).
    if (isSignedIn() && !isAnonymousUser()) {
      const cloudBtn = document.createElement("button");
      cloudBtn.type = "button";
      cloudBtn.textContent = t("cloud.saveBtn");
      cloudBtn.style.cssText = "width:100%; padding:10px; margin-bottom:8px; font-size:13px;";
      cloudBtn.addEventListener("click", async () => {
        cloudBtn.disabled = true;
        cloudBtn.textContent = t("cloud.saving");
        saveGame();
        const r = await saveToCloud();
        cloudBtn.disabled = false;
        if (r.ok) {
          cloudBtn.textContent = t("cloud.saveSuccess");
          pushToast(t("cloud.saveSuccess"), "good");
        } else {
          cloudBtn.textContent = t("cloud.saveBtn");
          pushToast(t("cloud.saveFailed"), "bad");
        }
      });
      btnPanel.appendChild(cloudBtn);
    }

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = t("common.confirm");
    btn.style.width = "100%";
    btn.style.padding = "12px";
    btn.style.fontSize = "15px";
    btn.style.fontWeight = "700";
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      // 휴식기 진입 흐름:
      //   0) KBO→MLB 도전 (포스팅 7시즌 / 해외FA 9시즌, 실력 충족 시 오퍼). 거절 시 ↓ 기존 흐름.
      //   1) FA 자격 (계약 만료) 있으면 FA 모달 → 휴식기.
      //   2) FA 없으면 트레이드 굴림 (8% 확률). 제안 시 트레이드 모달 → 휴식기.
      //   3) 둘 다 없으면 바로 휴식기.
      const continueOffseason = () => {
        const fa = checkFreeAgency(state.player);
        if (fa) {
          showFreeAgencyModal(fa, route, () => showOffseasonModal(route));
          return;
        }
        const trade = maybeTradeOffer(state.player);
        if (trade) {
          // 명성 임계 미만이면 선수 동의권 없음 — 구단이 일방 트레이드(자동 이적), 모달 생략.
          if ((state.player.fame ?? 0) < TRADE_CONSENT_FAME) {
            applyTradeAccept(state.player, trade.fromTeam);
            pushToast(t("trade.autoResult", { team: trade.fromTeam }), "info");
            showOffseasonModal(route);
          } else {
            showTradeModal(trade, route, () => showOffseasonModal(route));
          }
          return;
        }
        showOffseasonModal(route);
      };
      const mlb = checkMLBChallenge(state.player);
      if (mlb && mlb.offers.length > 0) {
        showMLBChallengeModal(mlb, route, continueOffseason);
        return;
      }
      continueOffseason();
    });
    btnPanel.appendChild(btn);

    // 은퇴 버튼 — 어느 시즌 종료에서도 가능. confirm 후 transitionToStage("retire") → 다음 렌더에서 careerEndedPanel.
    const retireBtn = document.createElement("button");
    retireBtn.type = "button";
    retireBtn.textContent = t("careerPath.retireLabel");
    retireBtn.style.cssText = "width:100%; padding:10px; margin-top:8px; font-size:12px; opacity:0.7;";
    retireBtn.addEventListener("click", () => {
      if (!confirm(t("careerPath.confirmRetire"))) return;
      transitionToStage("retire");
      route("weekly");
      showInterstitialAd();   // 은퇴 시점 전면 광고
    });
    btnPanel.appendChild(retireBtn);

    wrap.appendChild(btnPanel);
  }

  root.appendChild(wrap);
}

// ─── FA 모달 ──────────────────────────────────────────────────────
// 프로/MLB 계약 4년 만료 후 시즌 종료 시점에 호출.
// 선택지: 잔류 (4년 재계약, +5 fame) / 오퍼 중 하나 수락 (이적, +12 fame, 팀 변경).
function showFreeAgencyModal(fa, route, onClose) {
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "360px";

  const h = document.createElement("h2");
  h.textContent = t("fa.title");
  dialog.appendChild(h);

  dialog.appendChild(eventCut("eventFa"));   // FA 계약 컷

  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.cssText = "margin:0 0 12px; line-height:1.5;";
  desc.textContent = t("fa.desc", { team: state.player.teamName });
  dialog.appendChild(desc);

  function finish() {
    state.paused = false;
    saveGame();
    backdrop.remove();
    onClose?.();
  }

  // 잔류 버튼
  const stayBtn = document.createElement("button");
  stayBtn.style.cssText = "width:100%; padding:10px; margin-bottom:6px; font-weight:700;";
  stayBtn.textContent = t("fa.btnStay", { team: state.player.teamName });
  stayBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!confirm(t("fa.confirmStay", { team: state.player.teamName }))) return;
    applyFreeAgencyDecision(state.player, "stay");
    pushToast(t("fa.stayResult", { team: state.player.teamName }), "good");
    finish();
  });
  dialog.appendChild(stayBtn);

  // 오퍼 리스트
  if (fa.offers && fa.offers.length > 0) {
    const offerHeader = document.createElement("div");
    offerHeader.style.cssText = "margin-top:8px; font-size:11px; color:var(--muted); font-weight:700;";
    offerHeader.textContent = t("fa.offersTitle");
    dialog.appendChild(offerHeader);
    for (const offer of fa.offers) {
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:10px; margin-top:4px; font-weight:700;";
      btn.textContent = t("fa.btnLeave", { team: offer.name });
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        if (!confirm(t("fa.confirmLeave", { team: offer.name }))) return;
        const res = applyFreeAgencyDecision(state.player, "leave", offer.name);
        pushToast(t("fa.leaveResult", { team: res.teamName }), "good");
        finish();
      });
      dialog.appendChild(btn);
    }
  } else {
    const noOffers = document.createElement("div");
    noOffers.className = "muted small";
    noOffers.style.cssText = "margin-top:8px; font-size:11px;";
    noOffers.textContent = t("fa.noOffers");
    dialog.appendChild(noOffers);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// ─── 트레이드 모달 ────────────────────────────────────────────────
// 휴식기 진입 시 8% 확률로 발동 (FA 자격 없을 때만). 수락 시 새 팀 + 계약 인수.
function showTradeModal(trade, route, onClose) {
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "360px";

  const h = document.createElement("h2");
  h.textContent = t("trade.title");
  dialog.appendChild(h);

  dialog.appendChild(eventCut("eventTrade"));   // 트레이드 컷

  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.cssText = "margin:0 0 14px; line-height:1.5;";
  desc.textContent = t("trade.desc", {
    fromTeam: trade.fromTeam,
    currentTeam: state.player.teamName,
    years: trade.yearsLeft,
  });
  dialog.appendChild(desc);

  function finish() {
    state.paused = false;
    saveGame();
    backdrop.remove();
    onClose?.();
  }

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "primary";
  acceptBtn.style.cssText = "width:100%; padding:10px; margin-bottom:6px; font-weight:700;";
  acceptBtn.textContent = t("trade.btnAccept", { team: trade.fromTeam });
  acceptBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!confirm(t("trade.confirmAccept", { team: trade.fromTeam }))) return;
    applyTradeAccept(state.player, trade.fromTeam);
    pushToast(t("trade.acceptResult", { team: trade.fromTeam }), "good");
    finish();
  });
  dialog.appendChild(acceptBtn);

  const declineBtn = document.createElement("button");
  declineBtn.style.cssText = "width:100%; padding:10px; font-weight:700;";
  declineBtn.textContent = t("trade.btnDecline");
  declineBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    pushToast(t("trade.declineResult"), "info");
    finish();
  });
  dialog.appendChild(declineBtn);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// ─── 콜업 모달 ────────────────────────────────────────────────────
// 시즌 종료 후 콜업(승격) 직후 표시 — 이전엔 로그만이라 모르고 지나감.
function showPromotionModal(toStage) {
  state.paused = true;
  saveGame();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "340px";

  const h = document.createElement("h2");
  h.style.color = "var(--good)";
  h.textContent = t("promotion.title");
  dialog.appendChild(h);

  const p = document.createElement("p");
  p.className = "muted small";
  p.style.cssText = "margin:0 0 14px; line-height:1.5;";
  p.textContent = t("promotion.desc", { stage: t("stage." + toStage), team: state.player.teamName });
  dialog.appendChild(p);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.style.cssText = "width:100%; padding:11px; font-weight:700;";
  btn.textContent = t("common.confirm");
  btn.addEventListener("click", () => { state.paused = false; saveGame(); backdrop.remove(); });
  dialog.appendChild(btn);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// ─── 강등 모달 ────────────────────────────────────────────────────
// 노쇠 등으로 한 단계 강등된 직후 표시 (이미 하위 단계로 전이됨).
// [계속] = 강등 수용하고 하위 단계에서 진행 / [은퇴] = 커리어 종료.
function showDemotionModal(fromStage, toStage, route) {
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "360px";

  const h = document.createElement("h2");
  h.textContent = t("demotion.title");
  dialog.appendChild(h);

  dialog.appendChild(eventCut("eventDemote"));   // 강등 컷

  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.cssText = "margin:0 0 14px; line-height:1.5;";
  desc.textContent = t("demotion.desc", {
    from: t("stage." + fromStage),
    to: t("stage." + toStage),
    team: state.player.teamName,
  });
  dialog.appendChild(desc);

  const continueBtn = document.createElement("button");
  continueBtn.className = "primary";
  continueBtn.style.cssText = "width:100%; padding:10px; margin-bottom:6px; font-weight:700;";
  continueBtn.textContent = t("demotion.btnContinue");
  continueBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    state.paused = false;
    saveGame();
    backdrop.remove();
    route("weekly");
  });
  dialog.appendChild(continueBtn);

  const retireBtn = document.createElement("button");
  retireBtn.className = "danger";
  retireBtn.style.cssText = "width:100%; padding:10px; font-weight:700;";
  retireBtn.textContent = t("demotion.btnRetire");
  retireBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!confirm(t("careerPath.confirmRetire"))) return;
    transitionToStage("retire");
    saveGame();
    backdrop.remove();
    route("weekly");
    showInterstitialAd();   // 은퇴 시점 전면 광고
  });
  dialog.appendChild(retireBtn);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// ─── 휴식기 모달 ──────────────────────────────────────────────────
// 시즌 종료 후 "확인" 클릭 시 띄움. 내부에서 카테고리 → 이벤트 → 결과 phase 진행.
// "다음 연차 진행하기" 클릭 시 모달 닫고 다음 시즌으로.
function showOffseasonModal(route) {
  if (!state.offseason) {
    state.offseason = {
      selectedCategory: null,
      baseChanges: null,
      eventKey: null,
      decided: false,
      outcomeKind: null,
      eventChanges: null,
    };
    saveGame();
  }

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  function rerender() {
    dialog.innerHTML = "";
    const off = state.offseason;
    if (off.selectedCategory == null) {
      buildOffseasonPickPhase(dialog, rerender);
    } else if (off.decided === false) {
      buildOffseasonProposalPhase(dialog, rerender);
    } else {
      buildOffseasonResultPhase(dialog, rerender, () => {
        // "다음 연차 진행하기" — autoMode 는 이전 시즌 설정 그대로 유지
        advanceToNextSeason();
        // 군 입대 트리거 — pro1/pro2, 만 27세, 미완료. 면제면 토스트 후 false.
        // ageUp 은 transitionAfterSeason 안에서가 아니라 advanceToNextSeason 안에서 일어남.
        const needsMilitary = checkMilitaryTrigger(state.player);
        const proceedAfterMilitary = () => {
          const tr = transitionAfterSeason();
          state.offseason = null;
          saveGame();
          backdrop.remove();
          route("weekly");
          // 콜업 시 — 안내 모달 (이전엔 로그만이라 모르고 지나감).
          if (tr?.promoted) showPromotionModal(tr.toStage);
          // 강등 시 — 안내 + 은퇴 선택 모달 (이미 하위 단계로 전이된 상태).
          if (tr?.demoted) showDemotionModal(tr.fromStage, tr.toStage, route);
          // 광고 — 새 시즌 시작마다 누적 3시즌 주기로 전면 광고 (고교 졸업 후 첫 프로시즌 등).
          maybeShowSeasonAd(state.player?.careerHistory?.length ?? 0);
        };
        if (needsMilitary) {
          openMilitaryModal(state.player, proceedAfterMilitary);
        } else {
          proceedAfterMilitary();
        }
      });
    }
  }

  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

function buildOffseasonPickPhase(dialog, rerender) {
  const h = document.createElement("h2");
  // 아마추어(고교/대학)는 "{grade}학년 종료", 프로/MLB 는 학년 개념이 없으므로 "만N세 시즌 종료".
  const isAmateur = state.player.stage === "high" || state.player.stage === "univ";
  h.textContent = isAmateur
    ? t("offseason.title", { grade: state.player.grade })
    : t("offseason.titlePro", { age: state.player.age });
  dialog.appendChild(h);

  const hint = document.createElement("p");
  hint.className = "muted small";
  hint.style.margin = "0 0 12px";
  hint.textContent = t("offseason.pickHint");
  dialog.appendChild(hint);

  const accents = {
    intense:        "var(--bad)",
    camp:           "var(--accent-2)",
    regular:        "var(--accent)",
    rest:           "var(--good)",
    youth_worldcup: "var(--accent-2)",
  };
  for (const key of getAvailableCategories(state.player)) {
    const accent = accents[key] ?? "var(--accent)";
    const card = document.createElement("div");
    card.style.background = "var(--panel-2)";
    card.style.border = "1px solid var(--border)";
    card.style.borderLeft = `3px solid ${accent}`;
    card.style.borderRadius = "8px";
    card.style.padding = "10px";
    card.style.marginBottom = "6px";
    card.style.cursor = "pointer";

    const lbl = document.createElement("div");
    lbl.style.fontWeight = "700";
    lbl.style.fontSize = "13px";
    lbl.style.color = accent;
    lbl.textContent = t("offseason." + key + ".label");
    const desc = document.createElement("div");
    desc.className = "muted small";
    desc.style.marginTop = "3px";
    desc.style.fontSize = "11px";
    desc.textContent = t("offseason." + key + ".desc");
    card.appendChild(lbl);
    card.appendChild(desc);

    card.addEventListener("pointerdown", e => {
      e.preventDefault();
      const { baseChanges, eventKey } = applyCategoryAndPickEvent(state.player, key);
      state.offseason.selectedCategory = key;
      state.offseason.baseChanges = baseChanges;
      state.offseason.eventKey = eventKey;
      state.offseason.decided = false;
      saveGame();
      rerender();
    });
    dialog.appendChild(card);
  }
}

function buildOffseasonProposalPhase(dialog, rerender) {
  const off = state.offseason;
  const evKey = off.eventKey;

  // 국제대회 자동 진행 — 시즌 중 라이브 모달에서 이미 참가 결정.
  // yes/no 선택 단계를 건너뛰고 바로 실제 브래킷 시뮬 → 메달 등수로 결과(great/ok/bad) 결정.
  if (off.selectedCategory === "intl_tournament") {
    const bracket = simulateIntlBracket(state.player);  // 실패 시 null → 난수 폴백
    const { outcomeKind, changes } = applyEventChoice(state.player, evKey, bracket?.outcomeKind ?? null);
    off.decided = true;
    off.outcomeKind = outcomeKind;
    off.eventChanges = changes;
    off.bracket = bracket;   // 라운드별 스코어/메달 — result phase 에서 표시
    saveGame();
    // rerender 즉시 호출 — result phase 로 이동.
    rerender();
    return;
  }

  const h = document.createElement("h2");
  h.textContent = t("offseason.proposalTitle");
  dialog.appendChild(h);

  const evBox = document.createElement("div");
  evBox.style.background = "var(--panel-2)";
  evBox.style.border = "1px solid var(--accent-2)";
  evBox.style.borderRadius = "8px";
  evBox.style.padding = "10px";
  evBox.style.marginBottom = "12px";
  const evLbl = document.createElement("div");
  evLbl.style.fontWeight = "700";
  evLbl.style.fontSize = "14px";
  evLbl.style.color = "var(--accent-2)";
  evLbl.textContent = t("offseason.event." + evKey + ".label");
  const evDesc = document.createElement("div");
  evDesc.className = "muted small";
  evDesc.style.marginTop = "5px";
  evDesc.style.lineHeight = "1.4";
  evDesc.textContent = t("offseason.event." + evKey + ".desc");
  evBox.appendChild(evLbl);
  evBox.appendChild(evDesc);
  dialog.appendChild(evBox);

  const btnRow = document.createElement("div");
  btnRow.style.display = "grid";
  btnRow.style.gridTemplateColumns = "1fr 1fr";
  btnRow.style.gap = "6px";

  const yesBtn = document.createElement("button");
  yesBtn.className = "primary";
  yesBtn.textContent = t("offseason.btnYes");
  yesBtn.style.padding = "10px";
  yesBtn.style.fontSize = "13px";
  yesBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    // 청소년 세계대회 등 토너먼트 이벤트는 실제 브래킷 시뮬로 결과 결정.
    const bracket = isTournamentEvent(evKey) ? simulateIntlBracket(state.player) : null;
    const { outcomeKind, changes } = applyEventChoice(state.player, evKey, bracket?.outcomeKind ?? null);
    state.offseason.decided = true;
    state.offseason.outcomeKind = outcomeKind;
    state.offseason.eventChanges = changes;
    state.offseason.bracket = bracket;
    saveGame();
    rerender();
  });

  const noBtn = document.createElement("button");
  noBtn.textContent = t("offseason.btnNo");
  noBtn.style.padding = "10px";
  noBtn.style.fontSize = "13px";
  noBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    state.offseason.decided = "skipped";
    state.offseason.eventChanges = [];
    saveGame();
    rerender();
  });

  btnRow.appendChild(yesBtn);
  btnRow.appendChild(noBtn);
  dialog.appendChild(btnRow);
}

function buildOffseasonResultPhase(dialog, rerender, onContinue) {
  const off = state.offseason;

  const h = document.createElement("h2");
  h.textContent = t("offseason.summary");
  dialog.appendChild(h);

  const choice = document.createElement("div");
  choice.className = "muted small";
  choice.style.margin = "0 0 8px";
  choice.style.fontSize = "11px";
  choice.textContent = t("offseason." + off.selectedCategory + ".label")
    + (off.eventKey ? `  ·  ${t("offseason.event." + off.eventKey + ".label")}` : "");
  dialog.appendChild(choice);

  // 특훈/전지훈련 컷
  if (off.selectedCategory === "intense" || off.selectedCategory === "camp") {
    dialog.appendChild(eventCut("eventTraining"));
  }

  if (off.decided === true && off.eventKey) {
    const out = off.outcomeKind;
    const color = out === "great" ? "var(--good)" : out === "bad" ? "var(--bad)" : "var(--muted)";

    const evBox = document.createElement("div");
    evBox.style.background = "var(--panel-2)";
    evBox.style.border = "1px solid var(--border)";
    evBox.style.borderLeft = `3px solid ${color}`;
    evBox.style.borderRadius = "6px";
    evBox.style.padding = "8px 10px";
    evBox.style.marginBottom = "10px";

    const outLine = document.createElement("div");
    outLine.style.fontWeight = "700";
    outLine.style.fontSize = "13px";
    outLine.style.color = color;
    outLine.textContent = t("offseason.outcome." + out);
    evBox.appendChild(outLine);

    const flavorLine = document.createElement("div");
    flavorLine.style.marginTop = "4px";
    flavorLine.style.fontSize = "12px";
    flavorLine.style.lineHeight = "1.4";
    flavorLine.textContent = t("offseason.event." + off.eventKey + "." + out);
    evBox.appendChild(flavorLine);

    dialog.appendChild(evBox);
  } else if (off.decided === "skipped") {
    const skip = document.createElement("div");
    skip.className = "muted small";
    skip.style.marginBottom = "10px";
    skip.style.fontSize = "12px";
    skip.textContent = t("offseason.skipped");
    dialog.appendChild(skip);
  }

  // 국제대회 브래킷 결과 — 라운드별 스코어 + 메달.
  if (off.bracket && Array.isArray(off.bracket.rounds)) {
    const b = off.bracket;
    const medalColor = { gold: "var(--accent-2)", silver: "#c0c0c0", bronze: "#cd7f32", none: "var(--muted)" }[b.placement] ?? "var(--muted)";
    const card = document.createElement("div");
    card.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:8px 10px; margin-bottom:10px;";
    const medal = document.createElement("div");
    medal.style.cssText = `font-weight:700; font-size:13px; margin-bottom:5px; color:${medalColor};`;
    medal.textContent = t("seasonEvent.medal." + b.placement);
    card.appendChild(medal);
    for (const r of b.rounds) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; font-size:11px; padding:2px 0;";
      const name = document.createElement("span");
      name.className = "muted";
      name.textContent = t("seasonEvent.round." + r.round);
      const score = document.createElement("span");
      score.style.cssText = `font-weight:700; color:${r.won ? "var(--good)" : "var(--bad)"};`;
      score.textContent = `${r.my}-${r.opp} ${t("seasonEvent.round." + (r.won ? "win" : "loss"))}`;
      row.appendChild(name);
      row.appendChild(score);
      card.appendChild(row);
    }
    dialog.appendChild(card);
  }

  const allChanges = [...(off.baseChanges ?? []), ...(off.eventChanges ?? [])];
  if (allChanges.length === 0) {
    const none = document.createElement("div");
    none.className = "muted small";
    none.style.fontSize = "12px";
    none.textContent = t("offseason.noChange");
    dialog.appendChild(none);
  } else {
    const changesWrap = document.createElement("div");
    changesWrap.style.maxHeight = "180px";
    changesWrap.style.overflowY = "auto";
    for (const c of allChanges) changesWrap.appendChild(renderChangeRow(c));
    dialog.appendChild(changesWrap);
  }

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = t("offseason.btnContinue");
  btn.style.width = "100%";
  btn.style.padding = "12px";
  btn.style.marginTop = "12px";
  btn.style.fontWeight = "700";
  btn.addEventListener("pointerdown", e => {
    e.preventDefault();
    onContinue();
  });
  dialog.appendChild(btn);
}

function renderCareerEndedPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "14px";

  // 명예의 전당 헌액 판정 — careerStats + championships + awards + milestones 종합 점수
  const { computeHallOfFameScore, hofRank } = state._hofImport ?? {};
  // 모듈 import 는 파일 상단에서 처리하므로 직접 호출.
  const hof = _computeHofForState();
  const rank = _hofRank(hof.total);

  // 회귀 점수 적립 — 캐릭터당 1회. recordRun 이 멱등이 아니므로 player 플래그로 가드.
  if (!state.regression) loadRegressionMeta();
  if (!state.player.regressionScored) {
    recordRun(hof.total);
    state.player.regressionScored = true;
    // 명예의 전당 헌액 시 회귀 도전과제 해금. rank === "hof" 만 (300+ 점수).
    if (rank === "hof") {
      if (unlockItem("hof_inducted")) {
        pushToast(t("regression.unlocked", { name: t("unlock.hof_inducted") }), "good");
      }
    }
  }

  const title = document.createElement("h3");
  title.style.cssText = "margin:0 0 8px; font-size:15px; color:var(--accent-2);";
  title.textContent = t("hof." + rank + "Title");
  panel.appendChild(title);

  // 명예의 전당 헌액(hof)이면 헌액 컷, 그 외 등급은 일반 은퇴 컷.
  panel.appendChild(eventCut(rank === "hof" ? "eventHof" : "eventRetire"));

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "margin-bottom:10px; font-size:11px; line-height:1.5;";
  desc.textContent = t("hof." + rank + "Desc", { score: hof.total, name: state.player.name });
  panel.appendChild(desc);

  // 점수 breakdown — 큰 항목만 노출 (>0)
  const breakdownBox = document.createElement("div");
  breakdownBox.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:8px; margin-bottom:10px; font-size:11px;";
  const breakdownTitle = document.createElement("div");
  breakdownTitle.style.cssText = "font-weight:700; margin-bottom:4px; color:var(--accent-2);";
  breakdownTitle.textContent = t("hof.breakdownTitle", { score: hof.total });
  breakdownBox.appendChild(breakdownTitle);
  for (const [k, v] of Object.entries(hof.breakdown)) {
    if (!v) continue;
    const row = document.createElement("div");
    row.style.cssText = "display:flex; justify-content:space-between; padding:2px 0;";
    row.innerHTML = `<span class="muted">${t("hof.cat." + k)}</span><span style="font-weight:700">+${v}</span>`;
    breakdownBox.appendChild(row);
  }
  panel.appendChild(breakdownBox);

  // 회귀 점수 + 누적 잔액 박스
  const regressionBox = document.createElement("div");
  regressionBox.style.cssText = "background:var(--panel-2); border:1px solid var(--accent); border-radius:6px; padding:10px; margin-bottom:10px; font-size:12px; text-align:center;";
  const earnLine = document.createElement("div");
  earnLine.style.cssText = "font-weight:700; color:var(--accent); margin-bottom:4px;";
  earnLine.textContent = t("regression.scoreEarned", { score: hof.total });
  regressionBox.appendChild(earnLine);
  const balLine = document.createElement("div");
  balLine.className = "muted small";
  balLine.style.cssText = "font-size:11px;";
  balLine.textContent = t("regression.runBalance", { balance: state.regression?.balance ?? 0 });
  regressionBox.appendChild(balLine);
  panel.appendChild(regressionBox);

  // ☁️ 클라우드 저장 — Google 로그인(비익명)일 때만 노출 (익명 uid 는 기기 종속이라 동기화 불가).
  // 은퇴 시점 = 캐릭터 종료 + 회귀 메타 적립. 영구 메타 보호 위해 cloud 백업이 유용.
  if (isSignedIn() && !isAnonymousUser()) {
    const cloudBtn = document.createElement("button");
    cloudBtn.type = "button";
    cloudBtn.textContent = t("cloud.saveBtn");
    cloudBtn.style.cssText = "width:100%; padding:10px; margin-bottom:8px;";
    cloudBtn.addEventListener("click", async () => {
      // 충돌 확인: 클라우드가 로컬보다 명백히 더 새것이면 (60초+) confirm 모달.
      // 다른 기기에서 더 진행한 세이브를 실수로 덮어쓰지 않도록.
      const meta = await getCloudSaveMeta();
      const localTs = Date.now();   // 지금 저장하면 lastSaved = now
      if (meta?.exists && meta.clientLastSaved && meta.clientLastSaved > localTs + 60000) {
        if (!confirm(t("cloud.confirmOverwriteCloud"))) return;
      }
      cloudBtn.disabled = true;
      cloudBtn.textContent = t("cloud.saving");
      saveGame();
      const r = await saveToCloud();
      cloudBtn.disabled = false;
      if (r.ok) {
        cloudBtn.textContent = t("cloud.saveSuccess");
        pushToast(t("cloud.saveSuccess"), "good");
      } else {
        cloudBtn.textContent = t("cloud.saveBtn");
        pushToast(t("cloud.saveFailed"), "bad");
      }
    });
    panel.appendChild(cloudBtn);
  }

  // 상점 진입 + 메뉴로 (가로 2버튼)
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:8px;";

  const shopBtn = document.createElement("button");
  shopBtn.className = "primary";
  shopBtn.textContent = t("regression.enterShop");
  shopBtn.style.cssText = "padding:10px; font-weight:700;";
  shopBtn.addEventListener("click", () => route("shop"));
  btnRow.appendChild(shopBtn);

  const menuBtn = document.createElement("button");
  menuBtn.textContent = t("common.returnToMenu");
  menuBtn.style.cssText = "padding:10px;";
  menuBtn.addEventListener("click", () => route("menu"));
  btnRow.appendChild(menuBtn);

  panel.appendChild(btnRow);
  return panel;
}

function _computeHofForState() {
  return computeHallOfFameScore(state.player);
}
function _hofRank(score) {
  return hofRank(score);
}

// 진로 선택 패널 — 졸업 시 표시. 카드 4개: 프로1군 / 프로2군 / 대학 / 은퇴.
function renderCareerPathPanel(route) {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "12px";

  const title = document.createElement("h3");
  title.style.cssText = "margin:0 0 6px; font-size:14px; color:var(--accent-2);";
  title.textContent = t("careerPath.title");
  panel.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "margin-bottom:8px; font-size:11px;";
  desc.textContent = t("careerPath.desc");
  panel.appendChild(desc);

  const eligible = eligibleCareerPaths(state.player);
  const scoreLine = document.createElement("div");
  scoreLine.className = "muted small";
  scoreLine.style.cssText = "margin-bottom:10px; font-size:11px;";
  scoreLine.textContent = t("careerPath.yourScore", { score: eligible.score.toFixed(0) });
  panel.appendChild(scoreLine);

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:8px;";

  const options = [
    { key: "univ",   labelKey: "univLabel",   descKey: "univDesc",   enabled: eligible.univ },
    { key: "kbo",    labelKey: "kboLabel",    descKey: "kboDesc",    enabled: eligible.kbo },
    { key: "mlb",    labelKey: "mlbLabel",    descKey: "mlbDesc",    enabled: eligible.mlb },
    { key: "retire", labelKey: "retireLabel", descKey: "retireDesc", enabled: eligible.retire },
  ];

  for (const opt of options) {
    const card = document.createElement("button");
    card.style.cssText = `
      display:block; padding:10px; text-align:left;
      background:var(--panel-2); border:1px solid var(--border); border-radius:6px;
      cursor:${opt.enabled ? "pointer" : "not-allowed"};
      opacity:${opt.enabled ? "1" : "0.45"};
      width:100%; color:inherit; font-family:inherit;
    `;
    card.disabled = !opt.enabled;

    const lbl = document.createElement("div");
    lbl.style.cssText = "font-weight:700; font-size:13px; margin-bottom:3px; color:var(--accent);";
    lbl.textContent = t("careerPath." + opt.labelKey);
    card.appendChild(lbl);

    const d = document.createElement("div");
    d.style.cssText = "font-size:10px; color:var(--muted); line-height:1.3;";
    if (opt.key === "mlb" && opt.enabled) {
      const offerNames = eligible.mlbOffers.map(o => o.name).join(", ");
      d.textContent = t("careerPath.mlbOffer", { teams: offerNames });
    } else {
      d.textContent = opt.enabled ? t("careerPath." + opt.descKey) : t("careerPath.locked");
    }
    card.appendChild(d);

    if (opt.enabled) {
      card.addEventListener("pointerdown", e => {
        e.preventDefault();
        chooseCareerPath(opt.key, eligible, route);
      });
    }
    grid.appendChild(card);
  }
  panel.appendChild(grid);
  return panel;
}

// 진로 카드 선택 처리:
//   univ   → 그대로 univ stage 진입
//   kbo    → 드래프트 → 1군/2군/미지명 분기. 미지명이면 은퇴 toast + retire.
//   mlb    → 오퍼 팀 선택 모달 → 수락 시 시작 stage 결정 (마이너 단계)
//   retire → 은퇴
function chooseCareerPath(key, eligible, route) {
  const proceed = (stage, teamOverride = null) => {
    advanceToNextSeason();
    transitionToStage(stage, teamOverride);
    state.offseason = null;
    state.paused = true;
    saveGame();
    route("weekly");
  };

  if (key === "univ" || key === "retire") {
    proceed(key === "univ" ? "univ" : "retire");
    return;
  }
  if (key === "kbo") {
    openDraftLiveModal(state.player, (draft) => {
      if (!draft.picked) proceed("retire");
      else               proceed(draft.stage, draft.teamName);
    });
    return;
  }
  if (key === "mlb") {
    openMLBOfferModal(eligible.mlbOffers, (chosenTeam) => {
      if (!chosenTeam) {
        // 거절 → KBO 드래프트 라이브 모달로 fallback
        openDraftLiveModal(state.player, (draft) => {
          if (!draft.picked) proceed("retire");
          else               proceed(draft.stage, draft.teamName);
        });
      } else {
        const startStage = determineMLBStartStage(nationalTeamRating(state.player));
        proceed(startStage, chosenTeam.name);
      }
    });
  }
}

// KBO 드래프트 라이브 모달 — 라운드별 픽 라인 누적 → 본인 호명 → 결과 카드.
// onClose 콜백에 { picked, stage, round, signingBonus, teamName } 전달.
function openDraftLiveModal(player, onClose) {
  const draft = kboDraft(player);
  const locale = getLocale();
  const teamPool = getTeamPool("pro1", locale);
  const teamNames = teamPool.map(t => t.name);
  const myTeamName = draft.picked
    ? teamNames[Math.floor(Math.random() * teamNames.length)]
    : null;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  let status = "announce";
  const linesContainer = document.createElement("div");
  linesContainer.style.cssText = "max-height:220px; overflow-y:auto; padding:8px; background:var(--panel-2); border:1px solid var(--border); border-radius:6px; font-size:11px; line-height:1.7; margin:12px 0;";

  function rerender() {
    dialog.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = t("careerPath.draftTitle");
    dialog.appendChild(h);

    if (status === "announce") {
      const desc = document.createElement("p");
      desc.className = "muted small";
      desc.style.margin = "0 0 14px";
      desc.style.lineHeight = "1.5";
      desc.textContent = t("careerPath.draftAnnounceDesc");
      dialog.appendChild(desc);

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("careerPath.draftStartBtn");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        status = "picking";
        rerender();
        startPicking();
      });
      dialog.appendChild(btn);
    } else if (status === "picking") {
      dialog.appendChild(linesContainer);
    } else {
      dialog.appendChild(linesContainer);
      const title = document.createElement("h3");
      title.style.cssText = "margin:12px 0 4px; color:var(--accent); font-size:14px;";
      title.textContent = draft.picked
        ? t("careerPath.draftPickedTitle", { round: draft.round })
        : t("careerPath.draftUndraftedTitle");
      dialog.appendChild(title);

      const desc = document.createElement("p");
      desc.className = "muted small";
      desc.style.margin = "0 0 14px";
      desc.style.lineHeight = "1.5";
      desc.textContent = draft.picked
        ? t("careerPath.draftPickedDesc", {
            team: myTeamName,
            stage: t("stage." + draft.stage),
            bonus: draft.signingBonus.toLocaleString(),
          })
        : t("careerPath.draftUndraftedDesc");
      dialog.appendChild(desc);

      if (draft.picked) dialog.appendChild(eventCut("eventDraft"));   // 입단 컷

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = draft.picked ? t("careerPath.draftResultBtn") : t("careerPath.draftRetireBtn");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        backdrop.remove();
        onClose({ ...draft, teamName: myTeamName });
      });
      dialog.appendChild(btn);
    }
  }

  function addLine(html, highlight = false) {
    const line = document.createElement("div");
    if (highlight) line.style.cssText = "color:var(--accent); font-weight:700; padding:4px 0; border-top:1px solid var(--accent); border-bottom:1px solid var(--accent); margin:4px 0;";
    line.innerHTML = html;
    linesContainer.appendChild(line);
    linesContainer.scrollTop = linesContainer.scrollHeight;
  }

  function startPicking() {
    const maxRound = draft.picked ? draft.round : 10;
    let r = 1;
    function step() {
      if (r > maxRound) {
        status = "result";
        rerender();
        return;
      }
      const isMyRound = (r === maxRound && draft.picked);
      if (isMyRound) {
        addLine(t("careerPath.draftMyPickLine", { round: r, team: myTeamName }), true);
      } else {
        const others = teamNames.filter(n => n !== myTeamName);
        const otherTeam = others[Math.floor(Math.random() * others.length)];
        const fakeName = randomName(locale);
        addLine(t("careerPath.draftRoundLine", { round: r, team: otherTeam, name: fakeName }));
      }
      r++;
      setTimeout(step, 600);
    }
    step();
  }

  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// KBO→MLB 도전 모달 — 포스팅(7시즌)/해외FA(9시즌). 팀 수락 시 MLB 이적, 거절 시 KBO 잔류(onDecline).
function showMLBChallengeModal(challenge, route, onDecline) {
  state.paused = true;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "340px";

  const h = document.createElement("h2");
  h.textContent = t("mlbChallenge.title");
  dialog.appendChild(h);

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "margin:0 0 12px; line-height:1.5;";
  desc.textContent = t(challenge.type === "fa" ? "mlbChallenge.descFa" : "mlbChallenge.descPosting",
    { seasons: challenge.kboSeasons });
  dialog.appendChild(desc);

  for (const team of challenge.offers) {
    const btn = document.createElement("button");
    btn.style.cssText = "display:block; width:100%; padding:10px; margin-bottom:6px; text-align:left; background:var(--panel-2); border:1px solid var(--accent); color:inherit; font-family:inherit; cursor:pointer; border-radius:6px;";
    btn.innerHTML = `<div style="font-weight:700; color:var(--accent); font-size:13px">${team.name}</div><div style="font-size:10px; color:var(--muted); margin-top:2px">${t("careerPath.teamAvgOvr", { ovr: teamAvgOvr(team.strength, "mlb") })}</div>`;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (!confirm(t("mlbChallenge.confirm", { team: team.name }))) return;
      backdrop.remove();
      // 진로선택과 동일: advanceToNextSeason() 후 MLB stage 로 전이.
      advanceToNextSeason();
      const startStage = determineMLBStartStage(nationalTeamRating(state.player));
      transitionToStage(startStage, team.name);
      state.offseason = null;
      state.paused = true;
      saveGame();
      route("weekly");
    });
    dialog.appendChild(btn);
  }

  const reject = document.createElement("button");
  reject.className = "danger";
  reject.style.cssText = "width:100%; margin-top:8px; padding:10px;";
  reject.textContent = t("mlbChallenge.reject");
  reject.addEventListener("pointerdown", e => {
    e.preventDefault();
    backdrop.remove();
    onDecline();
  });
  dialog.appendChild(reject);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// 훈련 방향 점검 모달 — 최고비중 스탯 cap 도달 시. 변경=훈련방향 탭 이동(일시정지 유지) / 유지=닫기.
function openTrainSwitchModal(route) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "320px";

  const h = document.createElement("h2");
  h.textContent = t("trainSwitch.title");
  dialog.appendChild(h);

  const stat = topWeightStat(state.autoMode);
  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.cssText = "margin:0 0 14px; line-height:1.5;";
  desc.textContent = t("trainSwitch.desc", {
    label: t("preset." + state.autoMode + ".label"),
    stat: stat ? t("stat." + stat) : "",
  });
  dialog.appendChild(desc);

  const change = document.createElement("button");
  change.className = "primary";
  change.style.cssText = "width:100%; padding:10px; margin-bottom:6px; font-weight:700;";
  change.textContent = t("trainSwitch.btnChange");
  change.addEventListener("pointerdown", e => {
    e.preventDefault();
    backdrop.remove();
    weeklyCarouselIdx = 0;          // 훈련방향 탭(슬라이드 0)
    route("weekly");                 // 일시정지 유지한 채 이동
  });
  dialog.appendChild(change);

  const keep = document.createElement("button");
  keep.style.cssText = "width:100%; padding:10px;";
  keep.textContent = t("trainSwitch.btnKeep");
  keep.addEventListener("pointerdown", e => {
    e.preventDefault();
    backdrop.remove();               // 그대로(일시정지 유지, 재생은 사용자가)
  });
  dialog.appendChild(keep);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// MLB 오퍼 모달 — 팀 목록 + 수락(팀 선택)/거절. 거절 시 onChoose(null).
function openMLBOfferModal(offers, onChoose) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "340px";

  const h = document.createElement("h2");
  h.textContent = t("careerPath.mlbOfferTitle");
  dialog.appendChild(h);

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.margin = "0 0 12px";
  desc.textContent = t("careerPath.mlbOfferDesc");
  dialog.appendChild(desc);

  function pick(team) {
    backdrop.remove();
    onChoose(team);
  }

  for (const team of offers) {
    const btn = document.createElement("button");
    btn.style.cssText = "display:block; width:100%; padding:10px; margin-bottom:6px; text-align:left; background:var(--panel-2); border:1px solid var(--accent); color:inherit; font-family:inherit; cursor:pointer; border-radius:6px;";
    btn.innerHTML = `<div style="font-weight:700; color:var(--accent); font-size:13px">${team.name}</div><div style="font-size:10px; color:var(--muted); margin-top:2px">${t("careerPath.teamAvgOvr", { ovr: teamAvgOvr(team.strength, "mlb") })}</div>`;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (!confirm(t("careerPath.confirmMlb", { team: team.name }))) return;
      pick(team);
    });
    dialog.appendChild(btn);
  }

  const reject = document.createElement("button");
  reject.className = "danger";
  reject.style.cssText = "width:100%; margin-top:8px; padding:10px;";
  reject.textContent = t("careerPath.mlbReject");
  reject.addEventListener("pointerdown", e => { e.preventDefault(); pick(null); });
  dialog.appendChild(reject);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// 포스트시즌 모달 — 시즌 종료 시 pro1/mlb 진출 자격이 있으면 발동.
// PO 진행 중 — 시즌 종합 화면 대신 표시되는 대기 화면.
// 정규시즌 종료 라벨 + 포스트시즌 진행 안내. 실제 동작은 위에 뜨는 PO 모달.
function renderPostseasonStandby(root, route) {
  root.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.cssText = "padding:20px; text-align:center;";
  const h = document.createElement("h2");
  h.style.cssText = "margin:0 0 8px;";
  h.textContent = t("postseason.standbyTitle");
  panel.appendChild(h);
  const sub = document.createElement("p");
  sub.className = "muted small";
  sub.style.cssText = "margin:0; line-height:1.5;";
  sub.textContent = t("postseason.standbyDesc");
  panel.appendChild(sub);
  root.appendChild(panel);
}

// PO 라운드 → coachJudgment gateType 매핑.
// KS/WS    = championship (1~3등 SP)
// po/cs    = po_long      (1~4등 SP)
// wc/spo/ds = po_short    (1~5등 SP)
function gateTypeForRound(round) {
  if (round === "ks" || round === "ws") return "championship";
  if (round === "po" || round === "cs") return "po_long";
  return "po_short";
}

// skipFinalsModal ON 시 — 시리즈/라운드 전부 자동 시뮬 + 보상 적용. 토스트만 알림.
function autoRunPostseason(ps) {
  const player = state.player;
  const league = state.league;
  const myTeam = getPlayerTeam(league);
  let safety = 50;  // 무한 루프 가드
  while (ps && safety-- > 0) {
    // 매 게임마다 roles 새로 굴림 (수동 모달과 일관). round 별 gateType 적용.
    const roles = decideRolesForGame(player, myTeam, { gateType: gateTypeForRound(ps.round) });
    const result = simulatePostseasonGame(player, league, ps.opponent, ps.stage, roles);
    // 무승부(연장 후 동점) — 시리즈는 승부가 나야 하므로 미집계하고 재경기. (무승부가 상대 승으로 잡히던 버그 방지)
    if (!result || result.winner == null) continue;
    if (result?.mainPlayer && (result.mainPlayer.roles?.bat || result.mainPlayer.roles?.pitch)) {
      mergeSeasonStats(player, result.mainPlayer);
      applyGameExperience(player, result.mainPlayer);
      player.seasonStats.games = (player.seasonStats.games ?? 0) + 1;
    }
    const myEntry = result.home.team.isPlayerTeam ? result.home : result.away;
    const oppEntry = myEntry === result.home ? result.away : result.home;
    const won = result.winner === myEntry.team.name;
    recordSeriesGame(ps, won, myEntry.score, oppEntry.score);

    if (isSeriesClinched(ps)) {
      const winner = seriesWinner(ps);
      const myWonSeries = winner === "my";
      const isFinalRound = (ps.round === "ks" || ps.round === "ws");
      applyRoundReward(player, ps.round, myWonSeries);
      ps.completedRounds = ps.completedRounds ?? [];
      ps.completedRounds.push({
        round: ps.round,
        won: myWonSeries,
        scoreMy: ps.seriesWins.my, scoreOpp: ps.seriesWins.opp,
        seriesWins: { ...ps.seriesWins },
      });

      // 토스트 — 라운드 결과
      const label = t("postseason.title." + ps.round);
      const resultLabel = myWonSeries
        ? t("postseason.winLabel")
        : t("postseason.loseLabel");
      pushToast(`${label} ${resultLabel} ${ps.seriesWins.my}-${ps.seriesWins.opp}`, myWonSeries ? "good" : "bad");

      // 시리즈 종료 — 다음 라운드 또는 포스트시즌 종료
      if (myWonSeries && !isFinalRound) {
        advanceToNextRound(ps);
        continue;
      }
      // 포스트시즌 종료
      pushPostseasonRecord(player, ps.stage, ps.round, myWonSeries && isFinalRound);
      return;
    }
    // 시리즈 진행중 — 다음 게임 루프
  }
}

// announce → result 반복 (라운드별). 우승 시 다음 라운드, 패배 시 종료.
let _postseasonModalShown = false;
function showPostseasonModalIfNeeded(route) {
  const ps = state.pendingPostseason;
  if (!ps || _postseasonModalShown) return;
  _postseasonModalShown = true;

  // skipFinalsModal ON → 모든 시리즈/라운드 자동 시뮬 + 보상 적용 후 모달 없이 종료.
  if (state.settings?.skipFinalsModal) {
    autoRunPostseason(ps);
    state.pendingPostseason = null;
    _postseasonModalShown = false;
    saveGame();
    route("weekly");
    return;
  }

  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  // 시리즈의 다음 게임 시뮬레이션 + status="playing" 으로 전환.
  // 시즌 통계 누적도 같이 처리. 진입 시 미리 굴린 ps.rolesPreroll 를 시뮬에 전달.
  function playNextSeriesGame(ps) {
    ps.result = simulatePostseasonGame(state.player, state.league, ps.opponent, ps.stage, ps.rolesPreroll);
    if (ps.result?.mainPlayer && (ps.result.mainPlayer.roles?.bat || ps.result.mainPlayer.roles?.pitch)) {
      mergeSeasonStats(state.player, ps.result.mainPlayer);
      applyGameExperience(state.player, ps.result.mainPlayer);
      state.player.seasonStats.games = (state.player.seasonStats.games ?? 0) + 1;
    }
    ps.status = "playing";
    saveGame();
  }

  function rerender() {
    dialog.innerHTML = "";
    // playing 단계는 playLiveGame 이 자체 제목 + 라이브 UI 를 통째로 빌드함 — 외부 h2 생략.
    if (ps.status !== "playing") {
      const h = document.createElement("h2");
      h.textContent = t("postseason.title." + ps.round);
      dialog.appendChild(h);
    }

    if (ps.status === "announce") {
      const desc = document.createElement("p");
      desc.className = "muted small";
      desc.style.margin = "0 0 8px";
      desc.style.lineHeight = "1.5";
      const lengthLabel = ps.seriesLength > 1
        ? t("postseason.seriesIntro", { len: ps.seriesLength, wins: winsToClinch(ps.seriesLength) })
        : t("postseason.singleGame");
      desc.innerHTML = `${t("postseason.announceDesc", { opponent: ps.opponent.name })}<br>${lengthLabel}`;
      dialog.appendChild(desc);

      // 다음 게임 출전 굴림 — 매 게임마다 새로 (휴식일수/컨디션 반영). round 별 gateType 적용.
      const myTeam = getPlayerTeam(state.league);
      ps.rolesPreroll = decideRolesForGame(state.player, myTeam, { gateType: gateTypeForRound(ps.round) });
      const roleBox = document.createElement("div");
      roleBox.className = "small";
      roleBox.style.cssText = "margin:0 0 12px; padding:6px 10px; background:var(--panel-2); border:1px solid var(--border); border-radius:6px; line-height:1.5;";
      roleBox.appendChild(renderRoleLine(state.player, ps.rolesPreroll));
      dialog.appendChild(roleBox);

      // 지난 라운드 누적 결과
      if (ps.completedRounds && ps.completedRounds.length > 0) {
        const box = document.createElement("div");
        box.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:8px; margin-bottom:12px; font-size:11px;";
        for (const r of ps.completedRounds) {
          const line = document.createElement("div");
          line.style.padding = "2px 0";
          line.style.color = r.won ? "var(--good)" : "var(--bad)";
          // 시리즈 시 시리즈 점수 표시 (seriesWins), 아니면 한 게임 점수
          const tail = r.seriesWins ? `${r.seriesWins.my}-${r.seriesWins.opp}` : `${r.scoreMy}-${r.scoreOpp}`;
          line.textContent = `${t("postseason.title." + r.round)} — ${r.won ? "W" : "L"} ${tail}`;
          box.appendChild(line);
        }
        dialog.appendChild(box);
      }

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("postseason.btnPlay");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        playNextSeriesGame(ps);
        rerender();
      });
      dialog.appendChild(btn);
    } else if (ps.status === "playing") {
      // 라이브 진행 — 결승 모달과 동일 라이브 UI 재사용.
      const gameNum = (ps.seriesGames?.length ?? 0) + 1;
      const titleText = ps.seriesLength > 1
        ? t("postseason.gameNTitle", { round: t("postseason.title." + ps.round), n: gameNum, total: ps.seriesLength })
        : t("postseason.title." + ps.round);
      playLiveGame(dialog, ps.result, {
        titleText,
        onComplete: () => {
          ps.status = "result";
          saveGame();
          rerender();
        },
      });
      return;  // dialog 자체 빌드 완료 — 아래 result 분기로 떨어지면 안 됨
    } else if (ps.status === "result") {
      const r = ps.result;
      const myEntry  = r.home.team.isPlayerTeam ? r.home : r.away;
      const oppEntry = myEntry === r.home ? r.away : r.home;
      const won = r.winner === myEntry.team.name;

      // 한 게임 결과 누적 (시리즈 단위). 한 번만 처리.
      if (!ps._gameProcessed) {
        recordSeriesGame(ps, won, myEntry.score, oppEntry.score);
        ps._gameProcessed = true;
      }

      // 결과 카드 — 게임 점수 + 시리즈 누적 점수
      const resCard = document.createElement("div");
      resCard.style.cssText = `background:var(--panel-2); border:1px solid var(--${won ? "good" : "bad"}); border-radius:8px; padding:14px; margin-bottom:12px; text-align:center;`;
      const title = document.createElement("div");
      title.style.cssText = `font-size:22px; font-weight:800; color:var(--${won ? "good" : "bad"}); margin-bottom:6px;`;
      title.textContent = won ? t("postseason.winLabel") : t("postseason.loseLabel");
      resCard.appendChild(title);
      const score = document.createElement("div");
      score.style.cssText = "font-size:18px; font-weight:700;";
      score.textContent = `${myEntry.team.name} ${myEntry.score} — ${oppEntry.score} ${oppEntry.team.name}`;
      resCard.appendChild(score);
      if (ps.seriesLength > 1) {
        const sLine = document.createElement("div");
        sLine.style.cssText = "margin-top:6px; font-size:12px; color:var(--muted); font-weight:700;";
        sLine.textContent = t("postseason.seriesScore", { my: ps.seriesWins.my, opp: ps.seriesWins.opp });
        resCard.appendChild(sLine);
      }
      dialog.appendChild(resCard);

      const clinched = isSeriesClinched(ps);
      const winner = seriesWinner(ps);  // "my" | "opp" | null
      const myWonSeries = winner === "my";
      const isFinalRound = (ps.round === "ks" || ps.round === "ws");

      // 시리즈가 끝나면 보상 부여 + completedRounds 누적
      if (clinched && !ps._roundProcessed) {
        const changes = applyRoundReward(state.player, ps.round, myWonSeries);
        ps.completedRounds = ps.completedRounds ?? [];
        ps.completedRounds.push({
          round: ps.round,
          won: myWonSeries,
          scoreMy: ps.seriesWins.my, scoreOpp: ps.seriesWins.opp,
          seriesWins: { ...ps.seriesWins },
        });
        ps._roundProcessed = true;
        ps._lastChanges = changes;
      }
      const changes = ps._lastChanges ?? [];
      const fameChange = changes.find(c => c.group === "meta" && c.stat === "fame");
      if (fameChange) {
        const reward = document.createElement("div");
        reward.style.cssText = "background:var(--panel-2); border-radius:6px; padding:8px; margin-bottom:12px; font-size:11px;";
        const header = document.createElement("div");
        header.style.cssText = "font-size:11px; color:var(--accent-2); font-weight:700; margin-bottom:4px;";
        header.textContent = t("postseason.rewardTitle");
        reward.appendChild(header);
        const line = document.createElement("div");
        line.textContent = `${t("offseason.fame")}: +${fameChange.delta}`;
        reward.appendChild(line);
        dialog.appendChild(reward);
      }

      // 다음 버튼 — 시리즈 진행중 / 시리즈 끝 + 우승 → 다음 라운드 / 시리즈 끝 + 탈락 → 종료
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      if (!clinched) {
        btn.textContent = t("postseason.btnNextGame");
        btn.addEventListener("pointerdown", e => {
          e.preventDefault();
          ps._gameProcessed = false;  // 다음 게임 처리 가능하게 reset
          playNextSeriesGame(ps);
          rerender();
        });
      } else if (myWonSeries && !isFinalRound) {
        btn.textContent = t("postseason.btnNextRound");
        btn.addEventListener("pointerdown", e => {
          e.preventDefault();
          advanceToNextRound(ps);
          ps._gameProcessed = false;
          ps._roundProcessed = false;
          ps._lastChanges = null;
          saveGame();
          rerender();
        });
      } else {
        btn.textContent = t("postseason.btnEnd");
        btn.addEventListener("pointerdown", e => {
          e.preventDefault();
          pushPostseasonRecord(state.player, ps.stage, ps.round, myWonSeries && isFinalRound);
          state.pendingPostseason = null;
          _postseasonModalShown = false;
          saveGame();
          backdrop.remove();
          route("weekly");
        });
      }
      dialog.appendChild(btn);
    }
  }

  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// 시즌 중 이벤트(올스타전 등) 모달 — pendingEvents 큐 첫 항목 처리.
// 현재는 all_star 만 모달 핸들링. 다른 modal-type 이벤트도 같은 패턴으로 추가 가능.
function showSeasonEventModalIfNeeded(route) {
  const ev = nextPendingEvent();
  // 이미 시즌 이벤트 모달이 떠 있으면 중복 생성 방지 — DOM 존재 기반(닫기/뒤로가기로 닫으면 다음 렌더에 재출현, 플래그 고착 없음).
  if (!ev || document.querySelector("[data-modal='seasonEvent']")) return;

  // 라이브 모달 자동 진행 설정 (skipFinalsModal) — 결승/PO 와 통합. ON 이면 모달 안 띄우고 자동 시뮬+보상+토스트.
  if (state.settings?.skipFinalsModal) {
    if (ev.handlerKey === "allStarLive") {
      applyAllStarReward(state.player);
      pushToast(t("weekly.allStarAutoDone"), "good");
      clearPendingEvent();
      saveGame();
      return;
    }
    if (ev.handlerKey === "intlTournamentLive") {
      applyIntlTournamentReward(state.player, ev.key, ev.year);
      pushToast(t("weekly.intlTournamentAutoDone", { tournament: t("seasonEvent." + ev.key) }), "good");
      clearPendingEvent();
      saveGame();
      return;
    }
  }

  if (ev.handlerKey === "allStarLive") {
    showAllStarModal(route);
  } else if (ev.handlerKey === "intlTournamentLive") {
    showIntlTournamentModal(ev, route);
  } else {
    clearPendingEvent();
  }
}

// 올스타전 라이브 모달 — 결승 모달 패턴 재사용 (playLiveGame).
// announce → playing(라이브) → result. result 에서 보상 부여.
function showAllStarModal(route) {
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.modal = "seasonEvent";   // DOM 기반 중복방지 마커
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  const data = { status: "announce", result: null, _rewardApplied: false };

  function rerender() {
    dialog.innerHTML = "";
    // playing 상태는 playLiveGame 이 전체 dialog 를 채움 — 외부 h2 생략.
    if (data.status !== "playing") {
      const h = document.createElement("h2");
      h.textContent = t("seasonEvent.allStarTitle");
      dialog.appendChild(h);
    }
    if (data.status === "announce") {
      const desc = document.createElement("p");
      desc.className = "muted small";
      desc.style.cssText = "margin:0 0 12px; line-height:1.5;";
      desc.textContent = t("seasonEvent.allStarAnnounceDesc");
      dialog.appendChild(desc);
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("seasonEvent.allStarBtnPlay");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        data.result = simulateAllStarGame(state.player, state.league);
        if (!data.result) {
          // 시뮬 실패 — 보상만 부여하고 종료
          applyAllStarReward(state.player);
          clearPendingEvent();
          state.paused = false;
          saveGame();
          backdrop.remove();
          route("weekly");
          return;
        }
        data.status = "playing";
        saveGame();
        rerender();
      });
      dialog.appendChild(btn);
    } else if (data.status === "playing") {
      playLiveGame(dialog, data.result, {
        titleText: t("seasonEvent.allStarTitle"),
        onComplete: () => {
          data.status = "result";
          saveGame();
          rerender();
        },
      });
      return;
    } else if (data.status === "result") {
      const r = data.result;
      const myEntry  = r.home.team.isPlayerTeam ? r.home : r.away;
      const oppEntry = myEntry === r.home ? r.away : r.home;
      const won = r.winner === myEntry.team.name;

      dialog.appendChild(eventCut("eventAllstar"));   // 올스타 컷

      const resCard = document.createElement("div");
      resCard.style.cssText = `background:var(--panel-2); border:1px solid var(--${won ? "good" : "muted"}); border-radius:8px; padding:14px; margin-bottom:12px; text-align:center;`;
      const score = document.createElement("div");
      score.style.cssText = "font-size:18px; font-weight:700;";
      score.textContent = `${myEntry.team.name} ${myEntry.score} — ${oppEntry.score} ${oppEntry.team.name}`;
      resCard.appendChild(score);
      dialog.appendChild(resCard);

      if (!data._rewardApplied) {
        applyAllStarReward(state.player);
        data._rewardApplied = true;
      }
      const reward = document.createElement("div");
      reward.style.cssText = "background:var(--panel-2); border-radius:6px; padding:8px; margin-bottom:12px; font-size:11px;";
      reward.textContent = t("seasonEvent.allStarReward");
      dialog.appendChild(reward);

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("seasonEvent.allStarBtnEnd");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        clearPendingEvent();
        state.paused = false;
        saveGame();
        backdrop.remove();
        route("weekly");
      });
      dialog.appendChild(btn);
    }
  }

  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// 국제대회 (WBC/올림픽/아시안게임/프리미어12) 라이브 모달 — 올스타와 동일 패턴.
// 이벤트별 제목/설명만 i18n 으로 분기.
function showIntlTournamentModal(ev, route) {
  state.paused = true;
  saveGame();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.modal = "seasonEvent";   // DOM 기반 중복방지 마커
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "360px";

  const data = { status: "announce", result: null, _rewardApplied: false };
  const titleKey = `seasonEvent.${ev.key}Title`;        // e.g. seasonEvent.wbcTitle
  const descKey  = `seasonEvent.${ev.key}AnnounceDesc`;  // e.g. seasonEvent.wbcAnnounceDesc

  function rerender() {
    dialog.innerHTML = "";
    if (data.status !== "playing") {
      const h = document.createElement("h2");
      h.textContent = t(titleKey);
      dialog.appendChild(h);
    }
    if (data.status === "announce") {
      const desc = document.createElement("p");
      desc.className = "muted small";
      desc.style.cssText = "margin:0 0 12px; line-height:1.5;";
      desc.textContent = t(descKey);
      dialog.appendChild(desc);
      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("seasonEvent.intlBtnPlay");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        data.result = simulateIntlTournamentGame(state.player, state.league);
        if (!data.result) {
          // 시뮬 실패 폴백 — 보상만 부여 후 종료
          applyIntlTournamentReward(state.player, ev.key, ev.year ?? state.gameDate?.year);
          clearPendingEvent();
          state.paused = false;
          saveGame();
          backdrop.remove();
          route("weekly");
          return;
        }
        data.status = "playing";
        saveGame();
        rerender();
      });
      dialog.appendChild(btn);
    } else if (data.status === "playing") {
      playLiveGame(dialog, data.result, {
        titleText: t(titleKey),
        onComplete: () => {
          data.status = "result";
          saveGame();
          rerender();
        },
      });
      return;
    } else if (data.status === "result") {
      const r = data.result;
      const myEntry  = r.home.team.isPlayerTeam ? r.home : r.away;
      const oppEntry = myEntry === r.home ? r.away : r.home;

      dialog.appendChild(eventCut("eventIntl"));   // 국제대회 컷

      const resCard = document.createElement("div");
      resCard.style.cssText = "background:var(--panel-2); border:1px solid var(--accent-2); border-radius:8px; padding:14px; margin-bottom:12px; text-align:center;";
      const score = document.createElement("div");
      score.style.cssText = "font-size:18px; font-weight:700;";
      score.textContent = `${myEntry.team.name} ${myEntry.score} — ${oppEntry.score} ${oppEntry.team.name}`;
      resCard.appendChild(score);
      dialog.appendChild(resCard);

      if (!data._rewardApplied) {
        applyIntlTournamentReward(state.player, ev.key, ev.year ?? state.gameDate?.year);
        data._rewardApplied = true;
      }
      const reward = document.createElement("div");
      reward.style.cssText = "background:var(--panel-2); border-radius:6px; padding:8px; margin-bottom:12px; font-size:11px;";
      reward.textContent = t(`seasonEvent.${ev.key}Reward`);
      dialog.appendChild(reward);

      const btn = document.createElement("button");
      btn.className = "primary";
      btn.style.cssText = "width:100%; padding:12px; font-weight:700;";
      btn.textContent = t("seasonEvent.intlBtnEnd");
      btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        clearPendingEvent();
        state.paused = false;
        saveGame();
        backdrop.remove();
        route("weekly");
      });
      dialog.appendChild(btn);
    }
  }

  rerender();
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// 군 입대 모달 — 27세 + pro1/pro2 + 면제 자격 없음일 때 발동.
// 옵션 선택 시 applyMilitaryService 호출 + 다음 시즌 진행 callback.
function openMilitaryModal(player, onClose) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  // 닫기 금지 — 선택 없이 닫으면 시즌이 이미 진행된 상태에서 휴식기 모달이 재노출돼 이중 진행 위험.
  backdrop.dataset.noDismiss = "1";
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.position = "relative";
  dialog.style.maxWidth = "340px";

  const h = document.createElement("h2");
  h.textContent = t("military.title");
  dialog.appendChild(h);

  dialog.appendChild(eventCut("eventMilitary"));   // 군 입대 컷

  const desc = document.createElement("p");
  desc.className = "muted small";
  desc.style.margin = "0 0 14px";
  desc.style.lineHeight = "1.5";
  desc.textContent = t("military.desc");
  dialog.appendChild(desc);

  for (const key of Object.keys(MILITARY_OPTIONS)) {
    const btn = document.createElement("button");
    btn.style.cssText = "display:block; width:100%; padding:10px; margin-bottom:6px; text-align:left; background:var(--panel-2); border:1px solid var(--border); color:inherit; font-family:inherit; cursor:pointer; border-radius:6px;";
    btn.innerHTML = `
      <div style="font-weight:700; color:var(--accent); font-size:13px">${t("military.option." + key)}</div>
      <div style="font-size:10px; color:var(--muted); margin-top:3px; line-height:1.4">${t("military.optionDesc." + key)}</div>
    `;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      applyMilitaryService(player, key);
      backdrop.remove();
      onClose();
    });
    dialog.appendChild(btn);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

// (옛 renderOffseasonPick / Proposal / Result / offseasonCategoryCard 는 휴식기 모달로 대체됨 — 제거)

// 능력치 변경 1행 렌더 (휴식기 결과 표시용)
function renderChangeRow(c) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.justifyContent = "space-between";
  row.style.alignItems = "center";
  row.style.padding = "3px 0";
  row.style.fontSize = "13px";

  let labelText;
  let color;
  if (c.group === "meta" && c.stat === "fame") {
    labelText = t("offseason.fame");
    color = "var(--accent-2)";
  } else if (c.group === "batter") {
    labelText = `${t("weekly.catBatterShort")} ${t("stat." + c.stat)}`;
    color = "var(--accent)";
  } else if (c.group === "pitcher") {
    labelText = `${t("weekly.catPitcherShort")} ${t("stat." + c.stat)}`;
    color = "var(--accent-2)";
  } else {
    labelText = c.stat;
    color = "var(--muted)";
  }

  const name = document.createElement("span");
  name.textContent = labelText;
  name.style.color = color;

  const delta = document.createElement("span");
  const d = c.delta;
  delta.textContent = d > 0 ? `+${d}` : `${d}`;
  delta.style.color = d > 0 ? "var(--good)" : d < 0 ? "var(--bad)" : "var(--muted)";
  delta.style.fontWeight = "700";
  delta.style.fontVariantNumeric = "tabular-nums";

  row.appendChild(name);
  row.appendChild(delta);
  return row;
}
