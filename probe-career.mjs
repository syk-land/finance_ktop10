// probe-career.mjs — 실제 야구선수 인생 시뮬레이션.
//
// 고교 입학 → 졸업 → 진로 → 프로 → 군 입대 → 은퇴까지 자동 진행.
// 각 시즌 종료 시점에 시즌 성적 + 실제 야구 통계와 비교.

globalThis.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = v; },
  removeItem(k) { delete this._s[k]; },
};
globalThis.document = { title: "", documentElement: { setAttribute() {} } };
globalThis.window = { localStorage: globalThis.localStorage };

const { state } = await import("./src/state.js");
const { setLocale } = await import("./src/i18n/index.js");
const { createLeague, getPlayerTeam, standings } = await import("./src/systems/league.js");
const { createSeason, endWeek, advanceToNextSeason } = await import("./src/systems/week.js");
const { autoFillWeek } = await import("./src/systems/autoTrain.js");
const { startHighSchoolCareer, transitionAfterSeason, transitionToStage, eligibleCareerPaths, compositeScore, kboDraft, determineMLBStartStage } = await import("./src/systems/career.js");
const { checkPostseasonAdvance, simulatePostseasonGame, applyRoundReward, advanceToNextRound, pushPostseasonRecord } = await import("./src/systems/postseason.js");
const { overallScore } = await import("./src/systems/player.js");
const { resetGameDateForNewSeason } = await import("./src/systems/tick.js");
const { getTeamPool } = await import("./src/data/teams.js");

setLocale("ko");

state.gameDate = { year: 2026, month: 3, dayOfMonth: 1 };
state.player = {
  name: "김야구",
  age: 17, grade: 1, talent: "contact",
  fame: 0, stamina: 100, maxStamina: 100,
  condition: 50, conditionTrend: 0,  // ← getEffectiveBatter/Pitcher 가 참조
  // 평균 이상 재능 — 드래프트 받을 정도
  batter:  { contact: 75, power: 65, eye: 70, speed: 60, defense: 65 },
  pitcher: { velocity: 78, control: 72, breaking: 65, stamina: 75, mental: 65 },
  stage: "high", teamName: null,
  gamesSinceLastPitch: 99, injury: null,
  seasonStats: emptyStats(),
  careerStats: {}, careerHistory: [], processedEvents: {},
};

function emptyStats() {
  return {
    pa: 0, ab: 0, h: 0, hr: 0, bb: 0, k: 0, tb: 0, r: 0, rbi: 0,
    hbp: 0, sf: 0, sb: 0, cs: 0, dp: 0, e: 0, games: 0,
    pitchG: 0, ip: 0, ipOuts: 0, er: 0, pK: 0, pBB: 0, pH: 0, pHR: 0, pHbp: 0,
    w: 0, l: 0, sv: 0,
  };
}

const highTeam = getTeamPool("high", "ko")[0].name;
startHighSchoolCareer("김야구", "contact", highTeam);
state.player.seasonStats = emptyStats();

const seasonReports = [];
const peakStats = {
  batter:  { contact: 0, power: 0, eye: 0, speed: 0, defense: 0 },
  pitcher: { velocity: 0, control: 0, breaking: 0, stamina: 0, mental: 0 },
};
function updatePeak() {
  for (const k in peakStats.batter)  peakStats.batter[k]  = Math.max(peakStats.batter[k],  state.player.batter[k]);
  for (const k in peakStats.pitcher) peakStats.pitcher[k] = Math.max(peakStats.pitcher[k], state.player.pitcher[k]);
}

function runOneSeason(stage) {
  const weeks = state.league.weeksPerSeason;
  let totalGames = 0;
  let injuredWeeks = 0;
  for (let w = 0; w < weeks; w++) {
    if (state.player.injury) injuredWeeks++;
    autoFillWeek("balanced");
    const res = endWeek();
    if (res?.ok) {
      // 한 주 평균 1~3게임. 메인 출장만 카운트.
      totalGames = state.player.seasonStats.games ?? 0;
    }
    if (state.season.finished) break;
  }
  updatePeak();
  return { totalGames, injuredWeeks };
}

function fmtStats(p) {
  const ss = p.seasonStats;
  const avg = ss.ab > 0 ? (ss.h / ss.ab).toFixed(3) : ".000";
  const obp = (ss.pa - (ss.sf ?? 0)) > 0
    ? ((ss.h + ss.bb + (ss.hbp ?? 0)) / (ss.ab + ss.bb + (ss.hbp ?? 0) + (ss.sf ?? 0))).toFixed(3)
    : ".000";
  const slg = ss.ab > 0 ? (ss.tb / ss.ab).toFixed(3) : ".000";
  const ip = ss.ipOuts > 0 ? (ss.ipOuts / 3) : (ss.ip ?? 0);
  const era = ip > 0 ? ((ss.er ?? 0) * 9 / ip).toFixed(2) : "0.00";
  const k9  = ip > 0 ? ((ss.pK ?? 0) * 9 / ip).toFixed(1) : "0.0";
  return {
    avg, obp, slg, hr: ss.hr, rbi: ss.rbi, r: ss.r, sb: ss.sb,
    games: ss.games, pa: ss.pa, ab: ss.ab, h: ss.h, k: ss.k,
    pitchG: ss.pitchG, ip: ip.toFixed(1), era, k9,
    w: ss.w, l: ss.l, sv: ss.sv,
  };
}

function summarize(label, p) {
  const s = fmtStats(p);
  console.log(`${label.padEnd(20)} G ${String(s.games).padStart(3)} | AVG ${s.avg} HR ${String(s.hr).padStart(2)} RBI ${String(s.rbi).padStart(3)} R ${String(s.r).padStart(3)} SB ${String(s.sb).padStart(2)} | IP ${s.ip.padStart(5)} ERA ${s.era} K/9 ${s.k9} W-L ${s.w}-${s.l}`);
}

// ─── 고교 3시즌 ───────────────────────────────────────────────
console.log("\n┌─ 고교 3년 ─────────────────────────────────────────────────");
for (let yr = 1; yr <= 3; yr++) {
  const r = runOneSeason("high");
  summarize(`고교 ${yr}학년`, state.player);
  seasonReports.push({ stage: "high", year: yr, stats: fmtStats(state.player), ovr: overallScore(state.player), injuredWeeks: r.injuredWeeks });
  advanceToNextSeason();
  const tr = transitionAfterSeason();
  if (tr.awaitingPath) break;
  state.player.seasonStats = emptyStats();
}

// ─── 진로 선택 ────────────────────────────────────────────────
const elig = eligibleCareerPaths(state.player);
const cscore = compositeScore(state.player);
console.log(`\n진로 종합 점수: ${cscore.toFixed(1)} / 자격: univ=${elig.univ} kbo=${elig.kbo} mlb=${elig.mlb}`);
const draft = kboDraft(state.player);
if (draft.picked) {
  console.log(`KBO 드래프트: ${draft.round}라운드, 계약금 ${draft.signingBonus}만원, 시작 단계 ${draft.stage}`);
  transitionToStage(draft.stage);
} else {
  console.log("KBO 미지명 — 대학 진학");
  transitionToStage("univ");
  // 대학 4년
  console.log("\n┌─ 대학 4년 ─────────────────────────────────────────────────");
  for (let yr = 1; yr <= 4; yr++) {
    state.player.seasonStats = emptyStats();
    const r = runOneSeason("univ");
    summarize(`대학 ${yr}학년`, state.player);
    seasonReports.push({ stage: "univ", year: yr, stats: fmtStats(state.player), ovr: overallScore(state.player) });
    advanceToNextSeason();
    const tr = transitionAfterSeason();
    if (tr.awaitingPath) break;
  }
  const elig2 = eligibleCareerPaths(state.player);
  const draft2 = kboDraft(state.player);
  console.log(`\n대학 졸업 후 점수 ${compositeScore(state.player).toFixed(1)} / KBO 자격: ${draft2.picked ? draft2.stage : "미지명"}`);
  if (elig2.mlb) {
    transitionToStage("mlb_aaa");
  } else if (draft2.picked) {
    transitionToStage(draft2.stage);
  } else {
    transitionToStage("pro2");
  }
}

// ─── 프로 커리어 — 은퇴 (만 38세) 또는 군입대까지 ──────────────
console.log("\n┌─ 프로 커리어 ──────────────────────────────────────────────");
let proSeasons = 0;
while (state.player.age < 39 && proSeasons < 20) {
  state.player.seasonStats = emptyStats();
  const ovrBefore = overallScore(state.player);
  const r = runOneSeason(state.player.stage);
  const ovrAfter = overallScore(state.player);
  summarize(`${state.player.stage} 만${state.player.age}세 OVR ${ovrBefore.toFixed(0)}→${ovrAfter.toFixed(0)}`, state.player);
  seasonReports.push({
    stage: state.player.stage, age: state.player.age,
    stats: fmtStats(state.player), ovr: overallScore(state.player),
    teamName: state.player.teamName,
  });

  // 포스트시즌 진출 굴림
  const ps = checkPostseasonAdvance(state.player, state.league);
  if (ps) {
    let currentPs = ps;
    let stillAlive = true;
    while (stillAlive) {
      const psGame = simulatePostseasonGame(state.player, state.league, currentPs.opponent, currentPs.stage);
      if (!psGame) break;
      const my = psGame.home.team.isPlayerTeam ? psGame.home : psGame.away;
      const opp = my === psGame.home ? psGame.away : psGame.home;
      const won = psGame.winner === my.team.name;
      currentPs.completedRounds = currentPs.completedRounds ?? [];
      currentPs.completedRounds.push({ round: currentPs.round, won, scoreMy: my.score, scoreOpp: opp.score });
      applyRoundReward(state.player, currentPs.round, won);
      const isFinal = currentPs.round === "ks" || currentPs.round === "ws";
      if (won && !isFinal) {
        advanceToNextRound(currentPs);
      } else {
        pushPostseasonRecord(state.player, currentPs.stage, currentPs.round, won && isFinal);
        stillAlive = false;
      }
    }
    const last = currentPs.completedRounds.at(-1);
    console.log(`  └─ PO: ${currentPs.completedRounds.map(r => r.round + (r.won?"W":"L")).join(" → ")}`);
  }

  proSeasons++;
  advanceToNextSeason();
  const tr = transitionAfterSeason();
  if (tr.ended) break;
}

// ─── 최종 리포트 ──────────────────────────────────────────────
console.log("\n┌─ 커리어 합산 vs 실제 야구 비교 ──────────────────────────");
const cs = state.player.careerStats;
const careerIp = cs.ipOuts > 0 ? cs.ipOuts / 3 : (cs.ip ?? 0);
const careerAvg = cs.ab > 0 ? (cs.h / cs.ab).toFixed(3) : ".000";
const careerEra = careerIp > 0 ? ((cs.er ?? 0) * 9 / careerIp).toFixed(2) : "—";

console.log(`이름: ${state.player.name}`);
console.log(`최종 단계: ${state.player.stage} (만 ${state.player.age}세, ${state.player.teamName})`);
console.log(`커리어 시즌 수: ${state.player.careerHistory.length}`);
console.log(`통산 G ${cs.games ?? 0} / AVG ${careerAvg} / HR ${cs.hr ?? 0} / RBI ${cs.rbi ?? 0} / R ${cs.r ?? 0} / SB ${cs.sb ?? 0}`);
console.log(`통산 IP ${careerIp.toFixed(1)} / ERA ${careerEra} / K ${cs.pK ?? 0} / W-L ${cs.w ?? 0}-${cs.l ?? 0} / SV ${cs.sv ?? 0}`);

console.log(`\n┌─ 커리어 피크 능력치 (시즌 종료 시점 기준 최고치) ─────────`);
const pb = peakStats.batter, pp = peakStats.pitcher;
const fb = state.player.batter, fp = state.player.pitcher;
console.log(`            contact  power    eye    speed defense | velo  ctrl  break stam  ment`);
console.log(`피크 stat : ${[pb.contact,pb.power,pb.eye,pb.speed,pb.defense].map(v=>String(v.toFixed(0)).padStart(7)).join("")} |${[pp.velocity,pp.control,pp.breaking,pp.stamina,pp.mental].map(v=>String(v.toFixed(0)).padStart(6)).join("")}`);
console.log(`최종 stat : ${[fb.contact,fb.power,fb.eye,fb.speed,fb.defense].map(v=>String(v.toFixed(0)).padStart(7)).join("")} |${[fp.velocity,fp.control,fp.breaking,fp.stamina,fp.mental].map(v=>String(v.toFixed(0)).padStart(6)).join("")}`);
const peakBatAvg = (pb.contact+pb.power+pb.eye+pb.speed+pb.defense)/5;
const peakPitAvg = (pp.velocity+pp.control+pp.breaking+pp.stamina+pp.mental)/5;
console.log(`피크 평균 : 타 ${peakBatAvg.toFixed(1)} / 투 ${peakPitAvg.toFixed(1)} (stage cap pro1=160)`);

console.log(`\n포스트시즌 기록 (${(state.player.tournamentHistory ?? []).filter(t => t.tournamentKey.startsWith("kbo_") || t.tournamentKey.startsWith("mlb_")).length}회 진출):`);
for (const r of (state.player.tournamentHistory ?? [])) {
  if (r.tournamentKey.startsWith("kbo_") || r.tournamentKey.startsWith("mlb_")) {
    console.log(`  ${r.year} ${r.tournamentKey} ${r.result}`);
  }
}

const champ = (state.player.championships ?? []);
console.log(`\n우승: ${champ.length > 0 ? champ.map(c => `${c.year} ${c.round}`).join(", ") : "없음"}`);

console.log("\n┌─ 현실 비교 체크 ───────────────────────────────────────────");
// 실제 KBO 평균: G 144, AVG .265, ERA 4.50
// MLB 평균: G 162, AVG .248, ERA 4.30
// 이 코드베이스는 weeksPerSeason 26 * gamesPerWeek 3 = 78 게임 (실제의 ~50%)
const proSeasonSamples = seasonReports.filter(r => ["pro1","pro2","mlb","mlb_a","mlb_aa","mlb_aaa"].includes(r.stage));
if (proSeasonSamples.length > 0) {
  const avgG = proSeasonSamples.reduce((a,b) => a + (b.stats.games ?? 0), 0) / proSeasonSamples.length;
  const realKboG = 144, simKboG = 78;
  console.log(`프로 시즌 평균 출장: ${avgG.toFixed(1)} G (시뮬 시즌 ${simKboG}G — 실제 KBO ${realKboG}G 의 ${(simKboG/realKboG*100).toFixed(0)}%)`);
  const avgs = proSeasonSamples.map(r => parseFloat(r.stats.avg)).filter(v => v > 0);
  if (avgs.length > 0) {
    const meanAvg = avgs.reduce((a,b)=>a+b,0)/avgs.length;
    console.log(`프로 시즌 평균 AVG: .${(meanAvg*1000).toFixed(0)} (실제 KBO ~.265 / MLB ~.248) ${meanAvg > 0.18 && meanAvg < 0.40 ? "✓ 현실 범위" : "⚠ 비현실"}`);
  }
  const eras = proSeasonSamples.map(r => parseFloat(r.stats.era)).filter(v => v > 0 && v < 99);
  if (eras.length > 0) {
    const meanEra = eras.reduce((a,b)=>a+b,0)/eras.length;
    console.log(`프로 시즌 평균 ERA: ${meanEra.toFixed(2)} (실제 KBO ~4.50 / MLB ~4.30) ${meanEra > 1.5 && meanEra < 8.5 ? "✓ 현실 범위" : "⚠ 비현실"}`);
  }
  const totalHR = proSeasonSamples.reduce((a,b) => a + (b.stats.hr ?? 0), 0);
  console.log(`프로 통산 HR: ${totalHR} (커리어 ~${proSeasonSamples.length}시즌)`);
}

const milYears = (state.player.careerHistory ?? []).filter(h => h.stage === "military").length;
console.log(`군 입대: ${milYears > 0 ? `${milYears}시즌 복무` : "면제 또는 미해당"}`);
