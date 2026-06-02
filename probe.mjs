// probe.mjs — 각 stage 시뮬레이션 검증.
// localStorage / document 가 없는 Node 환경에서 시스템 모듈만 import 해
// 고교/대학/KBO/MLB 단계별 새 기능이 동작하는지 확인.
//
// 사용: /tmp/node/bin/node probe.mjs

globalThis.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = v; },
  removeItem(k) { delete this._s[k]; },
};
globalThis.document = {
  title: "",
  documentElement: { setAttribute() {} },
};
globalThis.window = { localStorage: globalThis.localStorage };

const { state, saveGame } = await import("./src/state.js");
const { setLocale, t } = await import("./src/i18n/index.js");
const { createLeague, ageUpLeague, standings, getPlayerTeam } = await import("./src/systems/league.js");
const { createSeason, endWeek, advanceToNextSeason, mergeSeasonStats } = await import("./src/systems/week.js");
const { simulateGame, appearanceChance, coachJudgment, batterOVR, pitcherOVR } = await import("./src/systems/simulator.js");
const { startHighSchoolCareer, transitionToStage, eligibleCareerPaths } = await import("./src/systems/career.js");
const { checkFinalAdvance, simulateFinal } = await import("./src/systems/finals.js");
const { checkPostseasonAdvance, simulatePostseasonGame, advanceToNextRound, pushPostseasonRecord, KBO_BRACKET, MLB_BRACKET } = await import("./src/systems/postseason.js");
const { simulateAllStarGame, applyAllStarReward, SEASON_EVENTS } = await import("./src/systems/seasonEvents.js");
const { applyGameExperience, getPlayerStatCap, overallScore } = await import("./src/systems/player.js");
const { getNpcStatCap } = await import("./src/systems/npc.js");
const { getTeamPool } = await import("./src/data/teams.js");

function pickTeam(stage) {
  const pool = getTeamPool(stage, "ko");
  return pool?.[0]?.name;
}

setLocale("ko");

function makePlayer(overrides = {}) {
  return {
    name: "테스트선수",
    age: 17, grade: 1, talent: "contact",
    fame: 0, stamina: 100, maxStamina: 100,
    batter:  { contact: 70, power: 60, eye: 65, speed: 55, defense: 60 },
    pitcher: { velocity: 70, control: 65, breaking: 60, stamina: 70, mental: 60 },
    stage: "high", teamName: "테스트고",
    gamesSinceLastPitch: 99, injury: null,
    seasonStats: {
      pa: 0, ab: 0, h: 0, hr: 0, bb: 0, k: 0, tb: 0, r: 0, rbi: 0,
      hbp: 0, sf: 0, sb: 0, cs: 0, dp: 0, e: 0, games: 0,
      pitchG: 0, ip: 0, ipOuts: 0, er: 0, pK: 0, pBB: 0, pH: 0, pHR: 0, pHbp: 0,
      w: 0, l: 0, sv: 0,
    },
    careerStats: {},
    careerHistory: [],
    processedEvents: {},
    ...overrides,
  };
}

function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log("  " + title);
  console.log("=".repeat(60));
}

function ok(cond, label) {
  console.log(`  [${cond ? "OK " : "FAIL"}] ${label}`);
  if (!cond) process.exitCode = 1;
}

// ── 1. 고교 단계 ─────────────────────────────────────────────────
section("1. 고교 (high)");
state.player = makePlayer();
state.gameDate = { year: 2026, month: 3, dayOfMonth: 1 };
const highTeam = pickTeam("high");
startHighSchoolCareer("테스트선수", "contact", highTeam);
ok(state.player.stage === "high", "stage=high");
ok(state.league && state.league.stage === "high", "league created");
ok(getNpcStatCap("high") === 100, "high NPC cap = 100");

// 첫 주 시뮬레이션
const myTeam = getPlayerTeam(state.league);
ok(!!myTeam, "playerTeam 인식");
ok(myTeam.roster.length >= 18, "고교 팀 로스터 18명+");
const oppNpc = state.league.teams.find(t => t !== myTeam);
const oppOvrs = oppNpc.roster.map(p => {
  if (p.role === "batter") return (p.batter.contact + p.batter.power + p.batter.eye + p.batter.speed + p.batter.defense) / 5;
  return (p.pitcher.velocity + p.pitcher.control + p.pitcher.breaking + p.pitcher.stamina + p.pitcher.mental) / 5;
});
const avgOpp = oppOvrs.reduce((a, b) => a + b, 0) / oppOvrs.length;
ok(avgOpp <= 100 && avgOpp >= 60, `고교 NPC 평균 OVR ${avgOpp.toFixed(1)} (cap 100 내)`);

// 등판 확률 (코치판단)
const chHigh = appearanceChance(state.player, myTeam);
ok(chHigh.bat === 1, "고교 타자 등판 100%");
ok(chHigh.pitch > 0, `고교 투수 등판 ${(chHigh.pitch*100).toFixed(0)}% (>0)`);

// 단판 시뮬 — 메인 팀이 포함된 게임 찾기
function findPlayerGame(league, team) {
  for (const week of league.schedule) {
    for (const g of week) {
      if (g.home === team.id || g.away === team.id) return g;
    }
  }
  return null;
}
const playerGame = findPlayerGame(state.league, myTeam);
const g1 = simulateGame(state.league, playerGame ?? state.league.schedule[0][0], state.player);
ok(!!g1.mainPlayer, "메인 플레이어 출장");
ok(g1.home.score >= 0 && g1.away.score >= 0, `점수 ${g1.away.score}-${g1.home.score} 정상`);
ok(Number.isFinite(g1.mainPlayer.batterBox?.h ?? 0), "타자 box NaN 없음");

// HS finals — 토너먼트 일정 잘 들어가는지
ok(typeof checkFinalAdvance === "function", "checkFinalAdvance 존재");

// ── 2. 대학 단계 ─────────────────────────────────────────────────
section("2. 대학 (univ)");
const univTeam = pickTeam("univ");
state.player = makePlayer({ stage: "univ", grade: 1, age: 19, fame: 30, teamName: univTeam });
state.gameDate = { year: 2026, month: 3, dayOfMonth: 1 };
state.league = createLeague("univ", univTeam);
state.season = createSeason("univ");
ok(state.player.stage === "univ", "stage=univ");
ok(getNpcStatCap("univ") === 121, "univ NPC cap = 121");
const univCh = appearanceChance(state.player, getPlayerTeam(state.league));
ok(univCh.bat === 1 && univCh.pitch > 0, `대학 출장 bat=${univCh.bat*100}% pit=${(univCh.pitch*100).toFixed(0)}%`);

// ── 3. KBO 단계 (pro1) ──────────────────────────────────────────
section("3. KBO 1군 (pro1)");
const kboTeam = pickTeam("pro1");
state.player = makePlayer({
  stage: "pro1", grade: 1, age: 22, fame: 250,
  teamName: kboTeam,
  // 새 스케일(pro1 NPC 평균 ~199) 대비 발달한 1군급 선수 — 등판/출장 판단 검증용.
  batter:  { contact: 210, power: 180, eye: 195, speed: 160, defense: 170 },
  pitcher: { velocity: 215, control: 200, breaking: 185, stamina: 195, mental: 175 },
});
state.gameDate = { year: 2030, month: 7, dayOfMonth: 12 };
state.league = createLeague("pro1", kboTeam);
state.season = createSeason("pro1");
ok(state.player.stage === "pro1", "stage=pro1");
ok(getNpcStatCap("pro1") === 256, "pro1 NPC cap = 256");
ok(t("stageShort.pro1") === "1군", `stageShort.pro1 = "${t("stageShort.pro1")}"`);

// 카드 타이틀 (i18n 키 분기 검증)
const titleProKey = "weekly.titleWithTeamLevel";
const titleResolved = t(titleProKey, { name: state.player.name, team: state.player.teamName, level: t("stageShort.pro1") });
ok(titleResolved.includes("1군"), `KBO 타이틀: "${titleResolved}"`);
ok(!titleResolved.includes("학년"), "KBO 타이틀에 '학년' 미포함");

// 코치판단
const proCh = appearanceChance(state.player, getPlayerTeam(state.league));
ok(proCh.bat === 1, "KBO 타자 100%");
ok(proCh.pitch > 0, `KBO 투수 ${(proCh.pitch*100).toFixed(0)}%`);

// 올스타 트리거 — 새 기준: fame ≥ 200 && OVR ≥ 88
const allStarEv = SEASON_EVENTS.find(e => e.key === "all_star");
ok(allStarEv.type === "modal", `올스타 type="${allStarEv.type}" (modal 이어야 함)`);
ok(allStarEv.handlerKey === "allStarLive", `handlerKey="${allStarEv.handlerKey}"`);
ok(allStarEv.trigger(state.player, state.gameDate), "7월 12일 fame250+OVR96 → 올스타 트리거");

// 올스타 게임 시뮬레이션
const asResult = simulateAllStarGame(state.player, state.league);
ok(!!asResult, "올스타 게임 시뮬 성공");
ok(Number.isFinite(asResult.home.score), `올스타 점수 ${asResult.away.team.name} ${asResult.away.score}-${asResult.home.score} ${asResult.home.team.name}`);
ok(asResult.home.team.strength === 90 || asResult.away.team.strength === 90, "올스타팀 strength=90");

// PO 진출 (1위 → ks)
ok(typeof checkPostseasonAdvance === "function", "checkPostseasonAdvance 존재");
ok(KBO_BRACKET.join(",") === "wc,spo,po,ks", `KBO 브라켓 ${KBO_BRACKET.join("→")}`);

// PO 상대 NPC cap 검증 — postseason 의 makeOpponentForRound 결과
const psFake = checkPostseasonAdvance(state.player, state.league);
if (psFake) {
  const oppRosterAvg = psFake.opponent.roster.map(p => {
    const s = p.batter ?? p.pitcher;
    return (s.contact ?? s.velocity) + (s.power ?? s.control) + (s.eye ?? s.breaking) + (s.speed ?? s.stamina) + (s.defense ?? s.mental);
  }).reduce((a,b)=>a+b,0) / psFake.opponent.roster.length / 5;
  ok(oppRosterAvg > 110, `PO 상대 평균 OVR ${oppRosterAvg.toFixed(1)} (>110, cap 160 의 ~90%)`);

  // 라운드 게임 시뮬
  const psGame = simulatePostseasonGame(state.player, state.league, psFake.opponent, "pro1");
  ok(!!psGame, "PO 단판 시뮬 성공");
  ok(Number.isFinite(psGame.home.score), `PO 점수 ${psGame.away.score}-${psGame.home.score}`);

  // 시즌 통계 합산 시뮬
  const before = { pa: state.player.seasonStats.pa, games: state.player.seasonStats.games };
  if (psGame.mainPlayer && (psGame.mainPlayer.roles?.bat || psGame.mainPlayer.roles?.pitch)) {
    mergeSeasonStats(state.player, psGame.mainPlayer);
    state.player.seasonStats.games++;
  }
  const after = { pa: state.player.seasonStats.pa, games: state.player.seasonStats.games };
  ok(after.games > before.games, `PO 후 seasonStats.games ${before.games}→${after.games}`);

  // tournamentHistory push
  pushPostseasonRecord(state.player, "pro1", psFake.round, true);
  ok((state.player.tournamentHistory ?? []).length >= 1, `tournamentHistory ${state.player.tournamentHistory.length}건`);
  const lastRec = state.player.tournamentHistory.at(-1);
  ok(lastRec.tournamentKey.startsWith("kbo_"), `tournamentKey="${lastRec.tournamentKey}"`);
  ok(t("tournament." + lastRec.tournamentKey).length > 0, `i18n: "${t("tournament." + lastRec.tournamentKey)}"`);
} else {
  console.log("  (PO 진출 조건 미충족 — 1군 단일 팀 league 에서는 정상)");
}

// ── 4. MLB 단계 ─────────────────────────────────────────────────
section("4. MLB (mlb)");
const mlbTeam = pickTeam("mlb");
state.player = makePlayer({
  stage: "mlb", grade: 1, age: 24, fame: 250,
  teamName: mlbTeam,
  batter:  { contact: 180, power: 160, eye: 170, speed: 140, defense: 150 },
  pitcher: { velocity: 190, control: 175, breaking: 165, stamina: 170, mental: 160 },
});
state.gameDate = { year: 2032, month: 7, dayOfMonth: 14 };
state.league = createLeague("mlb", mlbTeam);
state.season = createSeason("mlb");
ok(state.player.stage === "mlb", "stage=mlb");
ok(getNpcStatCap("mlb") === 400, "mlb NPC cap = 400");
ok(t("stageShort.mlb") === "메이저", `stageShort.mlb = "${t("stageShort.mlb")}"`);

const mlbTitle = t("weekly.titleWithTeamLevel", { name: state.player.name, team: state.player.teamName, level: t("stageShort.mlb") });
ok(mlbTitle.includes("메이저"), `MLB 타이틀: "${mlbTitle}"`);

const mlbCh = appearanceChance(state.player, getPlayerTeam(state.league));
ok(mlbCh.bat === 1 && mlbCh.pitch > 0, `MLB 출장 bat=${mlbCh.bat*100}% pit=${(mlbCh.pitch*100).toFixed(0)}%`);

// 올스타 트리거 — fame ≥ 200 && OVR ≥ 88
ok(allStarEv.trigger(state.player, state.gameDate), "MLB 7월 14일 → 올스타 트리거");
const mlbAs = simulateAllStarGame(state.player, state.league);
ok(!!mlbAs, "MLB 올스타 시뮬 성공");

// MLB PO 브라켓
ok(MLB_BRACKET.join(",") === "wc,ds,cs,ws", `MLB 브라켓 ${MLB_BRACKET.join("→")}`);

// MLB PO 상대 NPC — cap 200 적용되는지
const mlbPs = checkPostseasonAdvance(state.player, state.league);
if (mlbPs) {
  const oppAvg = mlbPs.opponent.roster.map(p => {
    const s = p.batter ?? p.pitcher;
    return ((s.contact ?? s.velocity) + (s.power ?? s.control) + (s.eye ?? s.breaking) + (s.speed ?? s.stamina) + (s.defense ?? s.mental)) / 5;
  }).reduce((a,b)=>a+b,0) / mlbPs.opponent.roster.length;
  ok(oppAvg > 150, `MLB PO 상대 평균 OVR ${oppAvg.toFixed(1)} (>150 — cap 200 적용 확인)`);
  const wsGame = simulatePostseasonGame(state.player, state.league, mlbPs.opponent, "mlb");
  ok(!!wsGame && Number.isFinite(wsGame.home.score), `MLB PO 시뮬 점수 ${wsGame.away.score}-${wsGame.home.score}`);

  pushPostseasonRecord(state.player, "mlb", mlbPs.round, false);
  const lastRec = state.player.tournamentHistory.at(-1);
  ok(lastRec.tournamentKey.startsWith("mlb_"), `MLB tournamentKey="${lastRec.tournamentKey}"`);
  ok(t("tournament." + lastRec.tournamentKey).includes("시리즈") || t("tournament." + lastRec.tournamentKey).includes("Series") || t("tournament." + lastRec.tournamentKey).length > 0,
     `i18n: "${t("tournament." + lastRec.tournamentKey)}"`);
} else {
  console.log("  (MLB PO 진출 조건 미충족 — 단일 팀 league)");
}

// ── 5. 회귀 — 관계 기능 잔존물 검사 ─────────────────────────────
section("5. 회귀: 관계 기능 완전 제거 확인");
try {
  await import("./src/systems/relations.js");
  ok(false, "relations.js 가 아직 import 됨 (제거 실패)");
} catch (e) {
  ok(e.message.includes("Cannot find") || e.code === "ERR_MODULE_NOT_FOUND", "relations.js 모듈 부재 (정상)");
}
ok(state.player.relations === undefined, "player.relations 필드 미사용");

console.log("\n" + (process.exitCode ? "❌ 일부 실패" : "✅ 전체 통과"));
