// 시즌 수상 판정 — 메인 캐릭터의 시즌 통계 + 팀 순위 기반.
//
// 호출 시점: endWeek 에서 season.finished=true 처리 직후.
// 결과는 player.awards 에 push (year, grade, stage, key).
//
// 임계치는 본 게임의 시즌 분량(약 25주 × 메인 출장)에 맞춰 조정.
// 실제 야구 통계와 1:1 매칭하지 않고 게임 컨텍스트에서 의미 있는 수치로.

import { standings, getPlayerTeam } from "./league.js";

// 카테고리 키 → i18n 의 award.<key> 로 라벨 조회
const THRESHOLDS = {
  battingTitle:  { minAB: 30, avg: 0.380 },
  hrKing:        { hr: 10 },
  rbiKing:       { rbi: 30 },
  kKing:         { pK: 30 },
  eraTitle:      { minIP: 30, eraMax: 1.80 },
  rookie:        { gradeMax: 1, minAB: 20, avg: 0.300 },
  // 능력치 기반 — 게임 내 수비 통계(에러 등)가 없어 batter.speed 로 대체 (수비 능력치 삭제로 대체)
  goldenGlove:   { minGames: 10, speedMin: 70 },
};

export function evaluateAndApplySeasonAwards(player, league, gameDate) {
  if (!player) return [];
  player.awards = player.awards ?? [];
  const won = computeAwards(player, league);
  for (const key of won) {
    player.awards.push({
      year: gameDate?.year ?? null,
      grade: player.grade,
      stage: player.stage,
      key,
    });
  }
  return won;
}

function computeAwards(player, league) {
  const ss = player.seasonStats ?? {};
  const result = [];

  const ab = ss.ab ?? 0;
  const h = ss.h ?? 0;
  const avg = ab > 0 ? h / ab : 0;
  const ip = ss.ip ?? 0;
  const er = ss.er ?? 0;
  const era = ip > 0 ? (er * 9 / ip) : null;

  // 단일 카테고리 수상
  if (ab >= THRESHOLDS.battingTitle.minAB && avg >= THRESHOLDS.battingTitle.avg) {
    result.push("battingTitle");
  }
  if ((ss.hr ?? 0) >= THRESHOLDS.hrKing.hr) {
    result.push("hrKing");
  }
  if ((ss.rbi ?? 0) >= THRESHOLDS.rbiKing.rbi) {
    result.push("rbiKing");
  }
  if ((ss.pK ?? 0) >= THRESHOLDS.kKing.pK) {
    result.push("kKing");
  }
  if (era !== null && ip >= THRESHOLDS.eraTitle.minIP && era <= THRESHOLDS.eraTitle.eraMax) {
    result.push("eraTitle");
  }

  // 골든글러브 — 일정 게임 이상 출장 + 주력 능력치 임계
  const games = ss.games ?? 0;
  const speed = player.batter?.speed ?? 0;
  if (games >= THRESHOLDS.goldenGlove.minGames && speed >= THRESHOLDS.goldenGlove.speedMin) {
    result.push("goldenGlove");
  }

  // 신인왕 — 1학년이거나 같은 stage 첫 시즌(향후 univ/pro 진입 시 신인왕)
  const isRookie = isFirstSeasonInStage(player);
  if (isRookie && ab >= THRESHOLDS.rookie.minAB && avg >= THRESHOLDS.rookie.avg) {
    result.push("rookie");
  }

  // 양방향 MVP — 타격왕 + 평균자책점왕 동시 (오타니상)
  if (result.includes("battingTitle") && result.includes("eraTitle")) {
    result.push("twoWayMvp");
  }

  // MVP — 한 카테고리 이상 수상 + 팀 1~2위
  const teamRank = getTeamRank(league, getPlayerTeam(league));
  const hasMajor = ["battingTitle", "hrKing", "rbiKing", "kKing", "eraTitle"].some(k => result.includes(k));
  if (hasMajor && teamRank >= 1 && teamRank <= 2) {
    result.push("mvp");
  }

  return result;
}

function getTeamRank(league, team) {
  if (!league || !team) return 99;
  const st = standings(league);
  const idx = st.findIndex(t => t.name === team.name);
  return idx >= 0 ? idx + 1 : 99;
}

function isFirstSeasonInStage(player) {
  // careerHistory 에 현재 stage 의 시즌이 1개 이하면 신인 (이번 시즌 끝나면 1개가 됨)
  const prior = (player.careerHistory ?? []).filter(h => h.stage === player.stage).length;
  return prior === 0;
}
