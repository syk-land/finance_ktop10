// 리그/시즌/일정 생성
import { getStageInfo } from "../data/teams.js";
import { createRoster, ageUpRoster, stageAgeRange } from "./npc.js";
import { getLocale } from "../i18n/index.js";

let _teamIdCounter = 1;

// 주인공 stage에 맞는 리그 구성. 현재 locale 의 팀 풀로 생성.
// league.stage 만 보존 — 표시용 라벨은 UI 에서 t('stage.' + league.stage).
export function createLeague(stage, playerTeamName) {
  const info = getStageInfo(stage, getLocale());
  if (!info) throw new Error(`unknown stage ${stage}`);
  const teamTemplates = info.teams.length > 0 ? info.teams : [];
  if (teamTemplates.length === 0) throw new Error(`no teams for stage ${stage}`);
  const ageRange = stageAgeRange(stage);

  const teams = teamTemplates.map(t => ({
    id: _teamIdCounter++,
    name: t.name,
    region: t.region,
    strength: t.strength,
    roster: createRoster(t.strength, ageRange, { stage, teamName: t.name }),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: t.name === playerTeamName,
  }));
  return {
    stage,
    teams,
    schedule: buildSchedule(teams, info.weeksPerSeason, info.gamesPerWeek),
    weeksPerSeason: info.weeksPerSeason,
    gamesPerWeek: info.gamesPerWeek,
  };
}

// 매 주 모든 팀이 정확히 gamesPerWeek 경기를 갖도록 라운드별로 짝지음.
// 라운드마다 팀을 셔플 + 짝 매칭 → 한 라운드에 모든 팀이 1경기씩 → gamesPerWeek 라운드 반복.
function buildSchedule(teams, weeks, gamesPerWeek) {
  const schedule = [];
  for (let w = 0; w < weeks; w++) {
    const games = [];
    for (let round = 0; round < gamesPerWeek; round++) {
      const pool = [...teams];
      shuffle(pool);
      for (let i = 0; i + 1 < pool.length; i += 2) {
        games.push({ home: pool[i].id, away: pool[i + 1].id });
      }
    }
    schedule.push(games);
  }
  return schedule;
}

// 학년/시즌 진급 시 league 갱신 — NPC 풀 carry-over + 일정 새로 생성
// (createLeague 통째로 재생성 대신 이걸 사용하면 NPC 가 시즌 단위로 성장/은퇴/신인 합류함)
export function ageUpLeague(league) {
  for (const team of league.teams) {
    team.roster = ageUpRoster(team.roster, league.stage, team.strength, team.name);
    team.record = { w: 0, l: 0, t: 0 };
  }
  league.schedule = buildSchedule(league.teams, league.weeksPerSeason, league.gamesPerWeek);
  return league;
}

export function getTeamById(league, id) {
  return league.teams.find(t => t.id === id);
}

export function getPlayerTeam(league) {
  return league.teams.find(t => t.isPlayerTeam);
}

export function standings(league) {
  return [...league.teams].sort((a, b) => {
    const aw = a.record.w - a.record.l;
    const bw = b.record.w - b.record.l;
    if (bw !== aw) return bw - aw;
    return b.record.w - a.record.w;
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
