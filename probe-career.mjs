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
const { resetGameDateForNewSeason, advanceDate } = await import("./src/systems/tick.js");
const { getTeamPool } = await import("./src/data/teams.js");
const { checkFreeAgency, maybeTradeOffer, applyFreeAgencyDecision } = await import("./src/systems/career.js");
const { checkMilitaryTrigger } = await import("./src/systems/military.js");

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

// ─── 이벤트 발화 카운터 ────────────────────────────────────────
const eventCounter = {
  finalsAdvanced: 0,      // 토너먼트 결승 진출 (pendingFinal set)
  postseasonAdvanced: 0,  // PO 진출 (pendingPostseason set)
  all_star: 0,
  wbc: 0,
  olympics: 0,
  asian_games: 0,
  premier12: 0,
  faOffered: 0,           // FA 자격 발생 (yearsLeft===0)
  tradeOffered: 0,        // 트레이드 제안 (8% 굴림 성공)
  militaryEntered: 0,     // 군 입대 trigger
};
const eventLog = [];      // [year-stage-key 발생 시점 누적]
const fameTrack = [];     // 시즌별 fame trajectory

// 시즌 끝에 호출 — pendingFinal / pendingEvents / FA / 트레이드 / 군 입대 카운트 + 큐 정리.
function captureSeasonEvents(yearLabel) {
  // 1) pendingEvents 큐 (시즌 중 + 비시즌 국제대회 모두)
  if (state.pendingEvents) {
    for (const ev of state.pendingEvents) {
      if (eventCounter[ev.key] !== undefined) {
        eventCounter[ev.key]++;
        eventLog.push(`${yearLabel} ${ev.key}`);
      }
    }
    state.pendingEvents.length = 0;
  }
  // 2) 결승 진출
  if (state.pendingFinal) {
    eventCounter.finalsAdvanced++;
    eventLog.push(`${yearLabel} finals(${state.pendingFinal.tournamentKey})`);
    state.pendingFinal = null;
  }
  // 3) PO 진출 (probe 가 별도 처리하지만 카운트만)
  if (state.pendingPostseason) {
    eventCounter.postseasonAdvanced++;
    // pendingPostseason 은 probe 의 시즌 루프 안에서 직접 처리 — 여기선 비우지 않음
  }
  // 4) FA / 트레이드 — checkFreeAgency / maybeTradeOffer 직접 호출.
  //    probe 가 모달 처리 안 하므로 FA 발화 후 자동 stay 처리 (yearsLeft 4 재설정) — 다음 4년 후 다시 FA 가능.
  const fa = checkFreeAgency(state.player);
  if (fa) {
    eventCounter.faOffered++;
    eventLog.push(`${yearLabel} FA`);
    applyFreeAgencyDecision(state.player, "stay");
  } else if (maybeTradeOffer(state.player)) {
    eventCounter.tradeOffered++;
    eventLog.push(`${yearLabel} trade`);
  }
  // 5) 군 입대 trigger — 만 27세 도달 첫 시즌만 카운트.
  //    probe 가 입대 모달 처리 안 하므로 첫 발화 후 militaryExempt 임시 설정 (반복 검출 차단).
  if (!state.player.militaryExempt && !state.player._probeMilDone) {
    const mil = checkMilitaryTrigger(state.player);
    if (mil) {
      eventCounter.militaryEntered++;
      eventLog.push(`${yearLabel} military`);
      state.player._probeMilDone = true;
    }
  }
  // 6) fame trajectory 기록 (시즌별 최대치).
  fameTrack.push({ label: yearLabel, fame: state.player.fame ?? 0 });
}
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
    // 한 주 = 7일 캘린더 진행 (tick.js 의 advanceOneDay 우회). endWeek 의 checkScheduledEvents 가
    // 이 시점의 gameDate.month/day 로 trigger 검사하므로 advance 가 endWeek 보다 *먼저* 일어나야 함.
    if (state.gameDate) {
      for (let d = 0; d < 7; d++) advanceDate(state.gameDate);
    }
    const res = endWeek();
    if (res?.ok) totalGames = state.player.seasonStats.games ?? 0;
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
  captureSeasonEvents(`high-${yr}`);
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
    captureSeasonEvents(`univ-${yr}`);
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
    eventCounter.postseasonAdvanced++;
    eventLog.push(`${state.player.stage}-${state.player.age} PO`);
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

  captureSeasonEvents(`${state.player.stage}-${state.player.age}`);
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

// ─── 이벤트 발화 빈도 ───────────────────────────────────────
console.log("\n┌─ 시즌별 이벤트 발화 빈도 (22+ 시즌 누적) ─────────────");
const totalSeasons = seasonReports.length;
console.log(`총 시뮬 시즌: ${totalSeasons}`);
console.log("");
console.log(`  결승 진출 (토너먼트)     : ${eventCounter.finalsAdvanced} 회`);
console.log(`  포스트시즌 진출          : ${eventCounter.postseasonAdvanced} 회`);
console.log(`  올스타전                 : ${eventCounter.all_star} 회 (KBO/MLB 진입 후 매년 가능, fame 50+)`);
console.log(`  WBC (4년 주기, year%4==2): ${eventCounter.wbc} 회`);
console.log(`  올림픽 (4년, year%4==0)  : ${eventCounter.olympics} 회`);
console.log(`  아시안게임 (4년, %4==2)  : ${eventCounter.asian_games} 회`);
console.log(`  프리미어12 (4년, %4==3)  : ${eventCounter.premier12} 회`);
console.log(`  FA 자격 발생             : ${eventCounter.faOffered} 회 (계약 4년 만료마다)`);
console.log(`  트레이드 제안 (8%)       : ${eventCounter.tradeOffered} 회`);
console.log(`  군 입대 trigger          : ${eventCounter.militaryEntered} 회`);

// 의도된 빈도 (대략): 22 프로 시즌 + 명성 50+ 가정
console.log("\n┌─ 의도된 발화 빈도 vs 실제 ───────────────────────────");
const wbcExpected = Math.floor(proSeasons / 4) + (proSeasons >= 1 ? 1 : 0);
const olyExpected = Math.floor(proSeasons / 4);
const agExpected  = Math.floor(proSeasons / 4);
const p12Expected = Math.floor(proSeasons / 4);
const faExpected  = Math.floor(proSeasons / 4);  // 4년 마다
console.log(`  WBC          : 실제 ${eventCounter.wbc} / 기대 ~${wbcExpected} (4년 주기)`);
console.log(`  올림픽       : 실제 ${eventCounter.olympics} / 기대 ~${olyExpected}`);
console.log(`  아시안게임   : 실제 ${eventCounter.asian_games} / 기대 ~${agExpected}`);
console.log(`  프리미어12   : 실제 ${eventCounter.premier12} / 기대 ~${p12Expected} ${eventCounter.premier12 >= p12Expected/2 ? "✓ 개선 OK" : "⚠ 부족"}`);
console.log(`  FA           : 실제 ${eventCounter.faOffered} / 기대 ~${faExpected} (4년 계약 만료)`);

if (eventLog.length > 0) {
  console.log("\n┌─ 발생 시점 로그 (시간순) ─────────────────────────────");
  for (const e of eventLog) console.log(`  ${e}`);
}

// fame trajectory — 올림픽(70+) / 아시안게임(50+) / 올스타(50+) fame 임계 충족 여부.
if (fameTrack.length > 0) {
  const maxFame = Math.max(...fameTrack.map(f => f.fame));
  console.log(`\n┌─ Fame 추이 (이벤트 임계: 올스타/AG/P12 50+, WBC 60+, 올림픽 70+) ─`);
  console.log(`  최대 fame: ${maxFame}`);
  const samples = fameTrack.filter((_, i) => i % 3 === 0 || i === fameTrack.length - 1);
  for (const f of samples) console.log(`  ${f.label.padEnd(15)} fame=${f.fame}`);
  console.log(`  fame 50+ 시즌: ${fameTrack.filter(f => f.fame >= 50).length} / 60+ : ${fameTrack.filter(f => f.fame >= 60).length} / 70+ : ${fameTrack.filter(f => f.fame >= 70).length}`);
}
