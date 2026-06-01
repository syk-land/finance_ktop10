// 주 단위 턴 진행
// 한 주: 5칸 평일 (각각 train/work/rest 선택) + 주말 자동 경기 시뮬레이션
// 시즌 종료 시 다음 학년/단계 분기

import { state, pushLog, pushToast } from "../state.js";
import {
  applyTraining, applyWork, applyRest, tickConditionWeekly, ageUp, overallScore, applyGameExperience, applyInjury,
} from "./player.js";
import { simulateGame } from "./simulator.js";
import { getPlayerTeam, standings } from "./league.js";
import { t } from "../i18n/index.js";
import { checkFinalAdvance } from "./finals.js";
import { evaluateAndApplySeasonAwards } from "./awards.js";
import { checkScheduledEvents, checkOffseasonEvents } from "./seasonEvents.js";
import { detectMilestones } from "./milestones.js";
import { checkPostseasonAdvance } from "./postseason.js";

export function createSeason(stage) {
  return {
    stage,
    weekIndex: 0,
    dayIndex: 0,        // 0..4 (월~금)
    weekActions: [],    // [{day, action, detail}]
    weekResults: [],    // 주말 경기 결과 (슬림 — UI 표시용 필드만)
    // seasonResults 제거됨 — read 하는 곳이 없는 데드 코드였고 매주 push 로 NPC roster 가 누적되어 3+ MB 폭증 원인.
    finished: false,
  };
}

// 한 게임 result 에서 UI 가 실제 쓰는 필드만 추려 저장 — team.roster / 옛 lineup 등 큰 객체 제외.
// renderLastWeekBody 가 사용하는 필드: team.name/isPlayerTeam, score, mainPlayer.{roles,batterBox,pitcherBox,events,lineupSlot}.
function slimGameResult(r) {
  return {
    home: { team: { name: r.home?.team?.name, isPlayerTeam: !!r.home?.team?.isPlayerTeam }, score: r.home?.score ?? 0 },
    away: { team: { name: r.away?.team?.name, isPlayerTeam: !!r.away?.team?.isPlayerTeam }, score: r.away?.score ?? 0 },
    mainPlayer: r.mainPlayer ? {
      roles: r.mainPlayer.roles,
      batterBox: r.mainPlayer.batterBox,
      pitcherBox: r.mainPlayer.pitcherBox,
      events: r.mainPlayer.events,
      lineupSlot: r.mainPlayer.lineupSlot,
    } : null,
  };
}

// 평일 한 칸(하루) 행동 적용. reason은 i18n 키 (reason.<key>).
export function doDailyAction(action, detail) {
  const { player, season } = state;
  if (!season || season.finished) return { ok: false, reason: "noSeason" };
  if (season.dayIndex >= 5) return { ok: false, reason: "weekendPending" };

  let res;
  if (action === "train") {
    res = applyTraining(player, detail);
  } else if (action === "work") {
    res = applyWork(player);
  } else if (action === "rest") {
    res = applyRest(player);
  } else {
    return { ok: false, reason: "invalidAction" };
  }
  if (!res.ok) return res;

  season.weekActions.push({ day: season.dayIndex, action, detail, result: res });
  season.dayIndex++;
  return { ok: true, result: res };
}

// 한 주가 끝나면 주말 경기 진행
export function endWeek() {
  const { player, league, season } = state;
  if (season.dayIndex < 5) return { ok: false, reason: "midweek" };

  // 주말 컨디션/부상 갱신 + 체력 회복
  tickConditionWeekly(player);
  player.stamina = Math.min(player.maxStamina, player.stamina + 50);

  // NPC 부상 카운터 감소 — 게임 시뮬레이션 *전에* 처리해서, 이번 주에 새로
  // 발생한 부상은 다음 주 endWeek 부터 깎이도록.
  // NPC pitcher 휴식 카운터도 같이 ++ (이전 게임에 던졌으면 이번 주 휴식 1회).
  for (const team of league?.teams ?? []) {
    for (const np of team.roster ?? []) {
      if (np.injury) {
        np.injury.weeksLeft = Math.max(0, np.injury.weeksLeft - 1);
        if (np.injury.weeksLeft <= 0) np.injury = null;
      }
      if (np.role === "pitcher") {
        np.gamesSinceLastPitch = (np.gamesSinceLastPitch ?? 99) + 1;
      }
    }
  }

  // 이번 주 일정
  const games = league.schedule[season.weekIndex] ?? [];
  const results = [];
  for (const g of games) {
    const r = simulateGame(league, g, player);
    results.push(r);
    // 투수 등판 휴식 카운터 (출장 여부와 무관하게 매 경기 진행)
    if (r.mainPlayer?.roles?.pitch) {
      player.gamesSinceLastPitch = 0;
    } else {
      player.gamesSinceLastPitch = (player.gamesSinceLastPitch ?? 99) + 1;
    }
    if (r.mainPlayer && (r.mainPlayer.roles?.bat || r.mainPlayer.roles?.pitch)) {
      mergeSeasonStats(player, r.mainPlayer);
      applyGameExperience(player, r.mainPlayer);
      player.seasonStats.games++;

      // 투수 등판 시 자기 팀의 승/패를 누적 — 마일스톤(통산 N승)·통산 통계용
      if (r.mainPlayer.roles?.pitch && r.winner) {
        const myTeam = r.home.team.isPlayerTeam ? r.home.team : r.away.team.isPlayerTeam ? r.away.team : null;
        if (myTeam) {
          if (r.winner === myTeam.name) player.seasonStats.w = (player.seasonStats.w ?? 0) + 1;
          else                          player.seasonStats.l = (player.seasonStats.l ?? 0) + 1;
        }
      }

      // 마일스톤 검출 (단경기 + 통산)
      detectMilestones(player, r, state.gameDate);
    }
    // HBP 부상 후처리 — simulator 가 메인의 hbpInjury 만 부착, NPC 는 직접 적용 완료.
    // v0.4 의 부위/후유증/토미존 로직은 applyInjury 내부에서 자동 처리됨.
    if (r.mainPlayer?.hbpInjury && !player.injury) {
      const sev = r.mainPlayer.hbpInjury.severity;
      applyInjury(player, sev);
      pushToast(t("toast.hbpInjury", { type: t("injury." + sev) }), "bad");
    }
    // 메인 강판 표시는 결승 라이브 모달의 PIT_CHANGE 이벤트로만 노출 — 일반 시즌은 토스트 없음.
    // 등판한 NPC pitcher 휴식 카운터 0 으로 reset.
    if (r.usedNpcPitcherIds) {
      const usedSet = new Set(r.usedNpcPitcherIds);
      for (const team of league?.teams ?? []) {
        for (const np of team.roster ?? []) {
          if (np.role === "pitcher" && usedSet.has(np.id)) {
            np.gamesSinceLastPitch = 0;
          }
        }
      }
    }
  }
  // 슬림화된 결과만 저장 — team.roster / 큰 객체 제외. seasonResults 누적은 제거 (read 없음).
  season.weekResults = results.map(slimGameResult);
  season.weekIndex++;
  season.dayIndex = 0;
  season.weekActions = [];

  // 토너먼트 결승 진출 체크 — 이미 pendingFinal 이 있으면 그대로
  if (!state.pendingFinal) {
    const adv = checkFinalAdvance(player, league, season, state.gameDate);
    if (adv) state.pendingFinal = adv;
  }

  // 시즌 중 이벤트 (올스타/올림픽/WBC 등 — 현재는 카탈로그 비어있음, 인프라만)
  checkScheduledEvents(player, state.gameDate);

  // 시즌 종료 체크
  if (season.weekIndex >= league.weeksPerSeason) {
    season.finished = true;
    // 시즌 수상 판정 — player.awards 에 누적, season.awardsThisSeason 에 키 배열 저장
    const wonKeys = evaluateAndApplySeasonAwards(player, league, state.gameDate);
    season.awardsThisSeason = wonKeys;
    pushLog({
      msg: t("log.seasonEnd", { stage: t("stage." + league.stage), grade: player.grade }),
      kind: "info",
    });
    // 포스트시즌 진출 체크 — pro1/mlb 한정
    if (!state.pendingPostseason) {
      const ps = checkPostseasonAdvance(player, league);
      if (ps) state.pendingPostseason = ps;
    }
    // 비시즌 국제대회 체크 — 9월 AG / 11월 P12 가 시뮬 캘린더 한계로 시즌 중에 발화 못함.
    checkOffseasonEvents(player, state.gameDate?.year);
  }
  return { ok: true, results };
}

export function mergeSeasonStats(player, mainPlayer) {
  const ss = player.seasonStats;
  if (mainPlayer.batterBox) {
    const box = mainPlayer.batterBox;
    ss.pa += box.pa; ss.ab += box.ab; ss.h += box.h; ss.hr += box.hr;
    ss.bb += box.bb; ss.k += box.k; ss.tb += box.tb;
    ss.r   = (ss.r   ?? 0) + (box.r   ?? 0);
    ss.rbi = (ss.rbi ?? 0) + (box.rbi ?? 0);
    // 신규 부가 통계
    ss.hbp = (ss.hbp ?? 0) + (box.hbp ?? 0);
    ss.sf  = (ss.sf  ?? 0) + (box.sf  ?? 0);
    ss.sb  = (ss.sb  ?? 0) + (box.sb  ?? 0);
    ss.cs  = (ss.cs  ?? 0) + (box.cs  ?? 0);
    ss.dp  = (ss.dp  ?? 0) + (box.dp  ?? 0);
    ss.e   = (ss.e   ?? 0) + (box.e   ?? 0);
  }
  if (mainPlayer.pitcherBox) {
    const box = mainPlayer.pitcherBox;
    ss.pitchG++;
    // outs 단위 누적 → ip 는 ipOuts/3 합산. 강판되면 ipOuts < 27.
    ss.ipOuts = (ss.ipOuts ?? 0) + (box.ipOuts ?? 27);
    ss.ip = ss.ipOuts / 3;
    ss.er += box.er ?? 0;
    ss.pK += box.pK ?? 0;
    ss.pBB += box.pBB ?? 0;
    ss.pH += box.pH ?? 0;
    ss.pHR += box.pHR ?? 0;
    ss.pHbp = (ss.pHbp ?? 0) + (box.pHbp ?? 0);
    ss.w  = (ss.w  ?? 0) + (box.w  ?? 0);
    ss.l  = (ss.l  ?? 0) + (box.l  ?? 0);
    ss.sv = (ss.sv ?? 0) + (box.sv ?? 0);
  }
}

// 시즌 → 다음 시즌으로 진급 (Phase 1: 단순히 학년/나이만 증가, 같은 팀 유지)
export function advanceToNextSeason() {
  const { player, league } = state;
  // 누적 통계로 합산
  Object.keys(player.seasonStats).forEach(k => {
    player.careerStats[k] = (player.careerStats[k] ?? 0) + (player.seasonStats[k] ?? 0);
  });
  // 시즌 기록 보관 (간단)
  player.careerHistory.push({
    age: player.age,
    grade: player.grade,
    stage: player.stage,
    teamName: player.teamName,
    overall: overallScore(player),
    stats: { ...player.seasonStats },
    teamRecord: getPlayerTeam(league)?.record ? { ...getPlayerTeam(league).record } : null,
    standings: standings(league).slice(0, 5).map(t => ({ name: t.name, w: t.record.w, l: t.record.l })),
  });
  // 리셋
  player.seasonStats = emptyStatsLike(player.seasonStats);
  // KBO 서비스 연수 — 포스팅(7시즌)/해외FA(9시즌) 자격용. KBO(1군/2군) 시즌만 누적.
  if (player.stage === "pro1" || player.stage === "pro2") {
    player.kboSeasons = (player.kboSeasons ?? 0) + 1;
  }
  ageUp(player);
  // 계약 연차 감소 (프로/MLB 단계만). 0 도달 시 transitionAfterSeason 다음 endWeek 에서 FA 모달.
  if (player.contract && player.contract.yearsLeft > 0) {
    player.contract.yearsLeft -= 1;
  }
  return { stage: player.stage, grade: player.grade };
}

function emptyStatsLike(s) {
  const out = {};
  for (const k of Object.keys(s)) out[k] = 0;
  return out;
}
