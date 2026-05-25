// 리그/시즌/일정 생성
import { STAGE_INFO } from "../data/teams.js";
import { createRoster } from "./npc.js";

let _teamIdCounter = 1;

// 주인공 stage에 맞는 리그 구성
export function createLeague(stage, playerTeamName) {
  const info = STAGE_INFO[stage];
  if (!info) throw new Error(`unknown stage ${stage}`);
  const teamTemplates = info.teams.length > 0 ? info.teams : fallbackTeams(stage);
  const ageRange = stage === "high" ? [16, 18] : stage === "univ" ? [19, 22] : [19, 38];

  const teams = teamTemplates.map(t => ({
    id: _teamIdCounter++,
    name: t.name,
    region: t.region,
    strength: t.strength,
    roster: createRoster(t.strength, ageRange),
    record: { w: 0, l: 0, t: 0 },
    isPlayerTeam: t.name === playerTeamName,
  }));
  return {
    stage,
    label: info.label,
    teams,
    schedule: buildSchedule(teams, info.weeksPerSeason, info.gamesPerWeek),
    weeksPerSeason: info.weeksPerSeason,
    gamesPerWeek: info.gamesPerWeek,
  };
}

function fallbackTeams(stage) {
  // 일본/MLB 분기용 임시 풀
  if (stage === "japan") return [
    { name: "도쿄 자이언츠", region: "도쿄", strength: 80 },
    { name: "한신 타이거스", region: "오사카", strength: 78 },
    { name: "히로시마 카프", region: "히로시마", strength: 75 },
    { name: "요코하마 베이스타스", region: "요코하마", strength: 73 },
    { name: "주니치 드래곤스", region: "나고야", strength: 72 },
    { name: "야쿠르트 스왈로즈", region: "도쿄", strength: 70 },
  ];
  if (stage === "mlb") return [
    { name: "LA Dodgers", region: "LA", strength: 85 },
    { name: "NY Yankees", region: "NY", strength: 84 },
    { name: "Boston Red Sox", region: "Boston", strength: 80 },
    { name: "Chicago Cubs", region: "Chicago", strength: 78 },
    { name: "SF Giants", region: "SF", strength: 76 },
    { name: "Atlanta Braves", region: "Atlanta", strength: 79 },
  ];
  return [];
}

// 매주 각 팀이 1~3경기 — 단순 로테이션
function buildSchedule(teams, weeks, gamesPerWeek) {
  const schedule = [];
  for (let w = 0; w < weeks; w++) {
    const games = [];
    const pool = [...teams];
    shuffle(pool);
    // 짝 만들기
    for (let i = 0; i + 1 < pool.length; i += 2) {
      games.push({ home: pool[i].id, away: pool[i + 1].id });
    }
    // gamesPerWeek가 더 많으면 추가 짝
    while (games.length < (teams.length / 2) * gamesPerWeek) {
      const a = pool[Math.floor(Math.random() * pool.length)];
      let b = pool[Math.floor(Math.random() * pool.length)];
      while (b.id === a.id) b = pool[Math.floor(Math.random() * pool.length)];
      games.push({ home: a.id, away: b.id });
    }
    schedule.push(games);
  }
  return schedule;
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
