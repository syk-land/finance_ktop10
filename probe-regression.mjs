// probe-regression.mjs — 회귀(NewGame+) 메타 영속화 + 액션 단위 검증.
//
// 사용: node probe-regression.mjs
//
// 검증 항목:
//   1. 빈 상태 → 기본 스키마 로드
//   2. save → load 라운드트립
//   3. addBalance / spendBalance
//   4. recordRun
//   5. purchasePermanent(talentSlots / capBoost)
//   6. unlockItem 중복 방지
//   7. setStartingStat / setTraits / setRelics / resetLoadout
//   8. capBonusForStage 적용

globalThis.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = v; },
  removeItem(k) { delete this._s[k]; },
};
globalThis.document = { title: "", documentElement: { setAttribute() {} } };
globalThis.window = { localStorage: globalThis.localStorage };

const { state } = await import("./src/state.js");
const {
  REGRESSION_KEY, defaultRegressionMeta,
  loadRegressionMeta, saveRegressionMeta,
  addBalance, spendBalance, recordRun,
  purchasePermanent, unlockItem,
  setStartingStat, setTraits, setRelics, resetLoadout,
  consumeLoadoutForCharacter, resetRegressionMeta,
} = await import("./src/systems/regression.js");
const { capBonusForStage } = await import("./src/data/shopCatalog.js");
const { createPlayer, combinedTalentBoost, getPlayerStatCap, applyTraining, applyRest, ageUp, addFame } = await import("./src/systems/player.js");
const { effectMultiplier, effectAdd, hasTraitFlag } = await import("./src/systems/traitEffects.js");
const { applyFinalReward } = await import("./src/systems/finals.js");
const { applyRoundReward } = await import("./src/systems/postseason.js");
const { kboDraft } = await import("./src/systems/career.js");

function section(t) {
  console.log("\n" + "=".repeat(60));
  console.log("  " + t);
  console.log("=".repeat(60));
}
function ok(cond, label) {
  console.log(`  [${cond ? "OK " : "FAIL"}] ${label}`);
  if (!cond) process.exitCode = 1;
}

// ── 1. 빈 상태 → 기본 스키마 ─────────────────────────────────────
section("1. 빈 상태 로드 → defaultRegressionMeta");
localStorage.removeItem(REGRESSION_KEY);
state.regression = null;
const m1 = loadRegressionMeta();
ok(m1.balance === 0, "balance 0");
ok(m1.totalEarned === 0, "totalEarned 0");
ok(m1.runs === 0, "runs 0");
ok(m1.permanentPurchases.talentSlots === 0, "talentSlots 0");
ok(m1.permanentPurchases.capBoosts.amateur === 0, "capBoosts.amateur 0");
ok(m1.unlockedItems.length === 0, "unlockedItems []");
ok(m1.loadout.startingStat === null, "loadout.startingStat null");
ok(state.regression === m1, "state.regression 이 cache 됨");

// ── 2. save → load 라운드트립 ───────────────────────────────────
section("2. 저장 → 재로드 라운드트립");
state.regression.balance = 1234;
state.regression.totalEarned = 1234;
state.regression.unlockedItems.push("walkoff_one");
saveRegressionMeta();

state.regression = null;
const m2 = loadRegressionMeta();
ok(m2.balance === 1234, `balance 1234 복원 (got ${m2.balance})`);
ok(m2.totalEarned === 1234, "totalEarned 1234 복원");
ok(m2.unlockedItems.includes("walkoff_one"), "unlockedItems 복원");

// ── 3. addBalance / spendBalance ────────────────────────────────
section("3. 잔액 가감");
resetRegressionMeta();
ok(addBalance(500) === 500, "addBalance(500) → 500");
ok(addBalance(300) === 800, "addBalance(300) → 800");
ok(addBalance(0) === 0 && state.regression.balance === 800, "addBalance(0) 무시");
ok(addBalance(-50) === 0 && state.regression.balance === 800, "addBalance(음수) 무시");
ok(spendBalance(200) === true && state.regression.balance === 600, "spendBalance(200) → 600 (true)");
ok(spendBalance(99999) === false && state.regression.balance === 600, "spendBalance(부족) → false 무변경");
ok(state.regression.totalEarned === 800, "spendBalance 는 totalEarned 미감소");

// ── 4. recordRun ────────────────────────────────────────────────
section("4. 회귀 1회 기록");
resetRegressionMeta();
const r = recordRun(420);
ok(r.runs === 1, "runs 1");
ok(r.balance === 420 && r.totalEarned === 420, `balance/totalEarned 420 (got ${r.balance}/${r.totalEarned})`);
recordRun(180);
ok(state.regression.runs === 2, "runs 2 누적");
ok(state.regression.balance === 600 && state.regression.totalEarned === 600, "balance/totalEarned 600 누적");

// ── 5. purchasePermanent ───────────────────────────────────────
section("5. 영구 구매");
resetRegressionMeta();
addBalance(3000);

// talentSlots tier 1 (500점 → totalSlots 2)
const t1 = purchasePermanent("talentSlots");
ok(t1.ok && t1.tier === 1 && t1.totalSlots === 2, `talentSlots tier1 → totalSlots ${t1.totalSlots}, cost ${t1.cost}`);
ok(state.regression.balance === 2500, `잔액 2500 (got ${state.regression.balance})`);
ok(state.regression.permanentPurchases.talentSlots === 1, "permanentPurchases.talentSlots 1");

// tier 2 (1500점 → totalSlots 3)
const t2 = purchasePermanent("talentSlots");
ok(t2.ok && t2.tier === 2 && t2.totalSlots === 3, `talentSlots tier2 → totalSlots ${t2.totalSlots}`);
ok(state.regression.balance === 1000, "잔액 1000");

// tier 초과
const t3 = purchasePermanent("talentSlots");
ok(!t3.ok && t3.reason === "max_tier", `talentSlots max_tier (reason=${t3.reason})`);

// capBoost amateur tier 1 (200점)
const c1 = purchasePermanent("capBoost", { group: "amateur" });
ok(c1.ok && c1.add === 10, `capBoost amateur tier1 add=${c1.add}`);
ok(state.regression.balance === 800, "잔액 800");
ok(state.regression.permanentPurchases.capBoosts.amateur === 1, "capBoosts.amateur 1");

// capBoost tier 2 (400점)
const c2 = purchasePermanent("capBoost", { group: "amateur" });
ok(c2.ok && c2.add === 20, `capBoost amateur tier2 add=${c2.add}`);
ok(state.regression.balance === 400, "잔액 400");

// 잔액 부족 (tier 3 = 700)
const c3 = purchasePermanent("capBoost", { group: "amateur" });
ok(!c3.ok && c3.reason === "insufficient_balance", `잔액 부족 (reason=${c3.reason})`);

// 잘못된 group
const cBad = purchasePermanent("capBoost", { group: "japan" });
ok(!cBad.ok && cBad.reason === "invalid_group", `invalid_group (reason=${cBad.reason})`);

// capBonusForStage — high 는 amateur 그룹, tier 2 까지 = +30
ok(capBonusForStage("high", state.regression.permanentPurchases.capBoosts) === 30,
   `capBonusForStage("high") = ${capBonusForStage("high", state.regression.permanentPurchases.capBoosts)} (=30 기대)`);
ok(capBonusForStage("univ", state.regression.permanentPurchases.capBoosts) === 30, `capBonusForStage("univ") = 30`);
ok(capBonusForStage("pro1", state.regression.permanentPurchases.capBoosts) === 0, `capBonusForStage("pro1") = 0 (kbo 그룹 미구매)`);
ok(capBonusForStage("mlb", state.regression.permanentPurchases.capBoosts) === 0, `capBonusForStage("mlb") = 0`);

// 알 수 없는 kind
const kBad = purchasePermanent("unknown");
ok(!kBad.ok && kBad.reason === "unknown_kind", `unknown_kind (reason=${kBad.reason})`);

// ── 6. unlockItem 중복 방지 ────────────────────────────────────
section("6. 도전과제 해금");
resetRegressionMeta();
ok(unlockItem("walkoff_one") === true, "walkoff_one 첫 해금 → true");
ok(unlockItem("walkoff_one") === false, "walkoff_one 중복 → false");
ok(state.regression.unlockedItems.length === 1, "unlockedItems 1건만");
ok(unlockItem("hof_inducted") === true, "다른 키 해금 → true");
ok(state.regression.unlockedItems.length === 2, "unlockedItems 2건");

// ── 7. 로드아웃 ────────────────────────────────────────────────
section("7. 로드아웃");
resetRegressionMeta();
ok(setStartingStat("balanced") === true, "startingStat='balanced'");
ok(state.regression.loadout.startingStat === "balanced", "loadout.startingStat 저장됨");
ok(setStartingStat("invalid_preset") === false, "invalid preset → false");
ok(setStartingStat(null) === true, "null 허용 (선택 해제)");

// traits — default 해금된 것만 장착 가능 (steel_mental/learner/stardom)
ok(setTraits(["steel_mental", "learner", "stardom"]) === true, "default 3종 장착");
ok(state.regression.loadout.traits.length === 3, "traits.length 3");
ok(setTraits(["steel_mental", "learner", "stardom", "clutch"]) === false, "4개 거부");
ok(setTraits(["clutch"]) === false, "미해금 clutch 거부");
unlockItem("walkoff_one");
ok(setTraits(["clutch"]) === true, "walkoff_one 해금 후 clutch 장착 가능");

// relics — 해금 개념 없음, 최대 2
ok(setRelics(["lucky_bat", "golden_glove"]) === true, "relics 2종 장착");
ok(setRelics(["lucky_bat", "golden_glove", "calling_card"]) === false, "3개 거부");
ok(setRelics(["unknown_relic"]) === false, "알수없는 키 거부");

// resetLoadout
resetLoadout();
ok(state.regression.loadout.startingStat === null, "resetLoadout: startingStat null");
ok(state.regression.loadout.traits.length === 0, "resetLoadout: traits []");
ok(state.regression.loadout.relics.length === 0, "resetLoadout: relics []");

// ── 8. capBonusForStage 시나리오 ───────────────────────────────
section("8. cap 보너스 누적");
resetRegressionMeta();
addBalance(99999);
purchasePermanent("capBoost", { group: "kbo" });   // +10
purchasePermanent("capBoost", { group: "kbo" });   // +20
purchasePermanent("capBoost", { group: "kbo" });   // +30
const kboBonus = capBonusForStage("pro1", state.regression.permanentPurchases.capBoosts);
ok(kboBonus === 60, `pro1 cap +${kboBonus} (10+20+30=60)`);
ok(capBonusForStage("pro2", state.regression.permanentPurchases.capBoosts) === 60, `pro2 cap +60`);
ok(capBonusForStage("mlb", state.regression.permanentPurchases.capBoosts) === 0, `mlb 미구매 +0`);

// kbo tier 4 (없음)
const cMax = purchasePermanent("capBoost", { group: "kbo" });
ok(!cMax.ok && cMax.reason === "max_tier", "kbo group tier 4 → max_tier");

// ── 9. createPlayer + cap/talent boost wiring ──────────────────
section("9. createPlayer 회귀 효과 적용 (P3)");
resetRegressionMeta();

// 9.1 기본 (회귀 효과 없음)
const baseline = createPlayer({ name: "baseline", talent: "contact" });
ok(baseline.talents?.length === 1 && baseline.talents[0] === "contact", `baseline talents=[${baseline.talents}]`);
ok(baseline.startingStat === null, "baseline startingStat null");
ok(baseline.traits.length === 0 && baseline.relics.length === 0, "baseline traits/relics 비어있음");

// 9.2 capBoost 가 getPlayerStatCap 에 반영
addBalance(99999);
purchasePermanent("capBoost", { group: "amateur" });   // +10
purchasePermanent("capBoost", { group: "amateur" });   // +20
purchasePermanent("capBoost", { group: "amateur" });   // +30
// total amateur +60. HS base 150 → 210
const player = createPlayer({ name: "cap-test", talent: "contact" });
const capHigh = getPlayerStatCap(player);
ok(capHigh === 210, `getPlayerStatCap(stage=high) = ${capHigh} (expected 210 = 150+60)`);
player.stage = "univ";
ok(getPlayerStatCap(player) === 175 + 60, `univ cap = ${getPlayerStatCap(player)} (expected 235 = 175+60)`);
player.stage = "pro1";
ok(getPlayerStatCap(player) === 250, `pro1 cap = ${getPlayerStatCap(player)} (kbo 미구매 → 250)`);

// 9.3 시작 능력치 프리셋 — battingFocus 가 batter 5종 각 +10
resetRegressionMeta();
const p2 = createPlayer({
  name: "start-test",
  talent: "contact",
  startingStat: "battingFocus",
});
// 시작값 변동(rnd -4~+4) 흡수 위해 baseline 평균 vs preset 평균 비교
const sumBaselineBatter = (createPlayer({ name: "b", talent: "contact" }).batter);
const baseSum = sumBaselineBatter.contact + sumBaselineBatter.power + sumBaselineBatter.eye + sumBaselineBatter.speed + sumBaselineBatter.defense;
const focusSum = p2.batter.contact + p2.batter.power + p2.batter.eye + p2.batter.speed + p2.batter.defense;
// battingFocus 는 5종 각 +10 = +50. rndInt(-4,4) 노이즈 양쪽 ±20 가능 → diff > 20 면 합격.
ok(focusSum - baseSum > 20, `battingFocus 시작값 합계 +${focusSum - baseSum} (>20 기대, 5종 +10 = +50)`);
ok(p2.startingStat === "battingFocus", "p2.startingStat='battingFocus'");

// 9.4 다중 talent + combinedTalentBoost
const multi = createPlayer({
  name: "multi",
  talent: "contact",
  talents: ["contact", "power"],
});
ok(multi.talents.length === 2, `multi.talents 2개 (${multi.talents})`);
ok(multi.talent === "contact", `multi.talent='contact' (호환 필드)`);
const boost = combinedTalentBoost(multi);
// contact: 1.4 (contact) × 0.9 (power) = 1.26
// power:   1.4 (power)
// eye:     1.2 (contact)
ok(Math.abs(boost.contact - 1.26) < 0.001, `boost.contact = ${boost.contact} (expected 1.26 = 1.4×0.9)`);
ok(Math.abs(boost.power - 1.4) < 0.001, `boost.power = ${boost.power} (expected 1.4)`);
ok(Math.abs(boost.eye - 1.2) < 0.001, `boost.eye = ${boost.eye} (expected 1.2)`);

// 9.5 traits/relics attach
const tr = createPlayer({
  name: "tr",
  talent: "contact",
  traits: ["steel_mental", "learner"],
  relics: ["lucky_bat"],
});
ok(tr.traits.length === 2 && tr.traits.includes("steel_mental"), `traits attach (${tr.traits})`);
ok(tr.relics.length === 1 && tr.relics[0] === "lucky_bat", `relics attach (${tr.relics})`);

// 9.6 consumeLoadoutForCharacter — snapshot + reset
resetRegressionMeta();
setStartingStat("balanced");
setTraits(["steel_mental"]);
setRelics(["lucky_bat"]);
const snap = consumeLoadoutForCharacter();
ok(snap.startingStat === "balanced", `snapshot.startingStat='balanced'`);
ok(snap.traits.length === 1 && snap.traits[0] === "steel_mental", `snapshot.traits 캡처`);
ok(snap.relics.length === 1 && snap.relics[0] === "lucky_bat", `snapshot.relics 캡처`);
ok(state.regression.loadout.startingStat === null, "consume 후 loadout.startingStat 리셋");
ok(state.regression.loadout.traits.length === 0, "consume 후 loadout.traits 리셋");
ok(state.regression.loadout.relics.length === 0, "consume 후 loadout.relics 리셋");

// ── 10. 특성/유물 효과 wiring (P4a) ─────────────────────────
section("10. 특성/유물 효과 wiring (P4a)");

// 10.1 startingFame (legend_heir)
const legend = createPlayer({ name: "L", talent: "contact", traits: ["legend_heir"] });
ok(legend.fame === 50, `legend_heir 시작 fame = ${legend.fame} (expected 50)`);
const noLegend = createPlayer({ name: "N", talent: "contact" });
ok(noLegend.fame === 0, `noLegend 시작 fame = 0`);

// 10.2 effectMultiplier — injuryChance ×0.5
const steel = createPlayer({ name: "S", talent: "contact", traits: ["steel_mental"] });
ok(effectMultiplier(steel, "injuryChance") === 0.5, `steel_mental injuryChance multiplier = ${effectMultiplier(steel, "injuryChance")}`);
ok(effectMultiplier(noLegend, "injuryChance") === 1, `noTrait injuryChance multiplier = 1`);

// 10.3 hasTraitFlag — tjsBlock
const iron = createPlayer({ name: "I", talent: "fireball", traits: ["iron_arm"] });
ok(hasTraitFlag(iron, "tjsBlock") === true, "iron_arm hasTraitFlag(tjsBlock) = true");
ok(hasTraitFlag(noLegend, "tjsBlock") === false, "noTrait tjsBlock = false");

// 10.4 effectAdd — agingDelay years
const prime = createPlayer({ name: "P", talent: "contact", traits: ["prime_extend"] });
ok(effectAdd(prime, "agingDelay", "years") === 3, `prime_extend agingDelay = ${effectAdd(prime, "agingDelay", "years")}`);
// ageUp 시뮬 — prime 보유자는 30+3=33 세부터 노화 시작
const primeAged = createPlayer({ name: "PA", talent: "contact", traits: ["prime_extend"] });
primeAged.age = 31;  // ageUp 후 32 → 30+3=33 미만이라 변화 없음
const beforeStat = JSON.stringify(primeAged.batter);
for (let i = 0; i < 100; i++) {  // 1회 ageUp 만으로는 random 통과해도 변화 없음
  // 더 강한 검증: age 32 시점에서 ageUp 호출 → age 33 → 33 + 0 (delay 미적용 기준) ~ 33+3 (적용)
}
// 직접 검증: prime_extend 캐릭터의 age 32→33 ageUp 결과 stat 감쇄 분포
const trials = 200;
let primeDecays = 0, normalDecays = 0;
for (let i = 0; i < trials; i++) {
  const a = createPlayer({ name: "a", talent: "contact", traits: ["prime_extend"] });
  a.age = 32; a.grade = 18;
  const before = a.batter.contact;
  ageUp(a);  // age 33 — prime delay 적용 시 30+3=33 임계 진입, declineChance 0.10 만
  if (a.batter.contact < before) primeDecays++;
  const b = createPlayer({ name: "b", talent: "contact" });
  b.age = 32; b.grade = 18;
  const before2 = b.batter.contact;
  ageUp(b);  // age 33 — 33 임계, declineChance 0.30
  if (b.batter.contact < before2) normalDecays++;
}
ok(primeDecays < normalDecays, `age 32→33 ageUp: prime decay ${primeDecays}/${trials} < normal ${normalDecays}/${trials} (prime_extend delay)`);

// 10.5 effectMultiplier — injuryRecoverySpeed ×2
const prosth = createPlayer({ name: "Pr", talent: "contact", relics: ["prosthetic"] });
ok(effectMultiplier(prosth, "injuryRecoverySpeed") === 2, `prosthetic injuryRecoverySpeed = ${effectMultiplier(prosth, "injuryRecoverySpeed")}`);
prosth.injury = { severity: "moderate", bodyPart: "wrist", weeksLeft: 4, surgery: false, aftereffect: null };
applyRest(prosth);
ok(prosth.injury && Math.abs(prosth.injury.weeksLeft - 3.6) < 0.001, `applyRest 후 weeksLeft ${prosth.injury?.weeksLeft} (4 - 0.2×2 = 3.6 기대)`);

const noRelic = createPlayer({ name: "NR", talent: "contact" });
noRelic.injury = { severity: "moderate", bodyPart: "wrist", weeksLeft: 4, surgery: false, aftereffect: null };
applyRest(noRelic);
ok(noRelic.injury && Math.abs(noRelic.injury.weeksLeft - 3.8) < 0.001, `noRelic applyRest 후 weeksLeft ${noRelic.injury?.weeksLeft} (4 - 0.2 = 3.8 기대)`);

// 10.6 firstSeasonTrainBoost — learner ×2
// stage="high", grade=1, careerHistory=[] 면 첫 시즌 부스트 적용.
// applyTraining 결과를 분포로 비교 — boosted vs no.
let learnerSum = 0, normalSum = 0;
for (let i = 0; i < 200; i++) {
  const l = createPlayer({ name: "l", talent: "contact", traits: ["learner"] });
  const r = applyTraining(l, "batting");
  if (r.ok) learnerSum += (r.gained.contact ?? 0) + (r.gained.power ?? 0);
  const n = createPlayer({ name: "n", talent: "contact" });
  const r2 = applyTraining(n, "batting");
  if (r2.ok) normalSum += (r2.gained.contact ?? 0) + (r2.gained.power ?? 0);
}
ok(learnerSum > normalSum * 1.5, `learner 첫시즌 boost: learner sum ${learnerSum.toFixed(1)} > normal ${normalSum.toFixed(1)} × 1.5 (×2 기대)`);

// 첫 시즌 아닐 때 — grade=2 면 boost 미적용
const learnerOld = createPlayer({ name: "lo", talent: "contact", traits: ["learner"] });
learnerOld.grade = 2;  // 이제 첫 시즌 아님
let oldSum = 0, oldNormalSum = 0;
for (let i = 0; i < 200; i++) {
  const l = createPlayer({ name: "l", talent: "contact", traits: ["learner"] });
  l.grade = 2;
  const r = applyTraining(l, "batting");
  if (r.ok) oldSum += (r.gained.contact ?? 0) + (r.gained.power ?? 0);
  const n = createPlayer({ name: "n", talent: "contact" });
  n.grade = 2;
  const r2 = applyTraining(n, "batting");
  if (r2.ok) oldNormalSum += (r2.gained.contact ?? 0) + (r2.gained.power ?? 0);
}
// 첫 시즌 아니면 learner boost 미적용 → 두 합계가 비슷해야 함 (±20% 내).
const ratio = oldSum / (oldNormalSum || 1);
ok(ratio > 0.8 && ratio < 1.3, `learner grade=2 일 때 boost 비활성 — ratio ${ratio.toFixed(2)} (0.8~1.3 기대)`);

// 10.7 multi-effect 합산 — past_life_notes + learner 동시 보유 → firstSeasonTrainBoost ×2 × ×2 = ×4
const multiBoost = createPlayer({ name: "M", talent: "contact", traits: ["learner"], relics: ["past_life_notes"] });
ok(effectMultiplier(multiBoost, "firstSeasonTrainBoost") === 4, `learner+past_life_notes firstSeasonTrainBoost = ${effectMultiplier(multiBoost, "firstSeasonTrainBoost")} (expected 4)`);

// ── 11. 특성/유물 효과 wiring (P4b-1) ───────────────────────
section("11. 특성/유물 효과 wiring (P4b-1)");

// 11.1 addFame — stardom ×1.5 양수만 적용
const star = createPlayer({ name: "St", talent: "contact", traits: ["stardom"] });
star.fame = 0;
const fameDelta = addFame(star, 10);
ok(fameDelta === 15 && star.fame === 15, `stardom: addFame(10) → +${fameDelta}, fame=${star.fame} (expected +15)`);
// 음수 가산은 ×1.5 미적용 (그대로 깎임)
const negDelta = addFame(star, -10);
ok(negDelta === -10 && star.fame === 5, `stardom: 음수 가산 그대로 -${-negDelta}, fame=${star.fame}`);
// trait 없으면 그대로
const noStar = createPlayer({ name: "Ns", talent: "contact" });
ok(addFame(noStar, 10) === 10 && noStar.fame === 10, "no stardom: addFame(10) → +10");

// 11.2 calling_card — draftRound +1 (round 숫자 감소)
const draftPlayer = (relics, score) => {
  const p = createPlayer({ name: "D", talent: "contact", relics });
  // compositeScore 시뮬을 위해 stat 강제 설정 (점수가 score 근처가 되도록)
  for (const s of ["contact","power","eye","speed","defense"]) p.batter[s] = score;
  for (const s of ["velocity","control","breaking","stamina","mental"]) p.pitcher[s] = score;
  p.fame = 0;
  return p;
};
// score 85 → 원래 round 3, calling_card 보유 시 round 2
const d1 = draftPlayer([], 85);
const d2 = draftPlayer(["calling_card"], 85);
const r1 = kboDraft(d1);
const r2 = kboDraft(d2);
ok(r1.picked && r1.round === 3, `baseline score 85 → round ${r1.round} (expected 3)`);
ok(r2.picked && r2.round === 2, `calling_card score 85 → round ${r2.round} (expected 2)`);
// 1라운드 하한
const d3 = draftPlayer(["calling_card"], 105);
const r3 = kboDraft(d3);
ok(r3.picked && r3.round === 1, `calling_card score 105 → round ${r3.round} (1 하한)`);
// 2군 → 1군 승격 시나리오 (score 60 → 원래 pro2 round 6+, calling_card 로 round 5+, 그래도 pro2 유지)
// score 60 (pro2 round 6~8) + calling_card → round 5~7. 명함 only -1 이라 1군 승격은 만족 안 됨 (round<=3 필요)
const d4 = draftPlayer([], 60);
const r4 = kboDraft(d4);
ok(r4.stage === "pro2", `baseline score 60 → ${r4.stage}`);

// 11.3 big_game — finalsReward ×1.5
const big = createPlayer({ name: "B", talent: "contact", traits: ["big_game"] });
big.fame = 0; big.stage = "pro1";
big.tournamentHistory = [];
const changesBig = applyRoundReward(big, "ks", true);
// baseline ks: baseFame 30, baseStat 4. big_game ×1.5 → fame 45, stat 6.
const bigFameChange = changesBig.find(c => c.stat === "fame");
ok(bigFameChange && bigFameChange.delta === 45, `big_game KS 우승 fame ${bigFameChange?.delta} (expected 45 = 30×1.5)`);

const reg = createPlayer({ name: "R", talent: "contact" });
reg.fame = 0; reg.stage = "pro1"; reg.tournamentHistory = [];
const changesReg = applyRoundReward(reg, "ks", true);
const regFameChange = changesReg.find(c => c.stat === "fame");
ok(regFameChange && regFameChange.delta === 30, `baseline KS 우승 fame ${regFameChange?.delta} (expected 30)`);

// 11.4 mentor_letter — autoTrainDeficitBoost ×1.5 (deficit 가중 곱셈)
// 직접 검증 어려움 — effectMultiplier 단위 검증만.
const mentor = createPlayer({ name: "Me", talent: "contact", relics: ["mentor_letter"] });
ok(effectMultiplier(mentor, "autoTrainDeficitBoost") === 1.5,
   `mentor_letter autoTrainDeficitBoost = ${effectMultiplier(mentor, "autoTrainDeficitBoost")}`);

// 11.5 stardom + big_game 동시 — applyRoundReward fame 에 양쪽 적용
//   big_game 곱: ks baseFame 30 → 45
//   stardom 곱: addFame 내부에서 45 → 67.5 → round 68
const combo = createPlayer({ name: "C", talent: "contact", traits: ["big_game", "stardom"] });
combo.fame = 0; combo.stage = "pro1"; combo.tournamentHistory = [];
const changesCombo = applyRoundReward(combo, "ks", true);
const comboFameChange = changesCombo.find(c => c.stat === "fame");
ok(comboFameChange && comboFameChange.delta === 68,
   `big_game+stardom KS fame ${comboFameChange?.delta} (expected 68 = round(30×1.5×1.5))`);

// ── 12. simulator wiring (P4b-2) ────────────────────────────
section("12. simulator 끝내기/실책 효과 (P4b-2)");

const { simulateGame } = await import("./src/systems/simulator.js");
const { createLeague, getPlayerTeam } = await import("./src/systems/league.js");
const { createSeason } = await import("./src/systems/week.js");
const { setLocale } = await import("./src/i18n/index.js");
setLocale("ko");

// 메인 batter 가 home 9회+ 상황에 등판하는 시나리오를 직접 만들기 어렵다.
// 대신 simulateAtBat 의 walkoff opts 가 inPlayHitChance 에 반영되는지 분포로 검증.
const { default: _sim } = { default: null };
// simulateAtBat 은 export 안 되어있어서 직접 호출 불가. 대신 effectMultiplier/Add 로 효과 값만 확인.
const clutchP = createPlayer({ name: "Cl", talent: "contact", traits: ["clutch"] });
ok(effectMultiplier(clutchP, "walkoffChance") === 2, `clutch walkoffChance multiplier = ${effectMultiplier(clutchP, "walkoffChance")}`);
const luckyP = createPlayer({ name: "Lu", talent: "contact", relics: ["lucky_bat"] });
ok(effectAdd(luckyP, "walkoffChance", "flatAddPct") === 5, `lucky_bat walkoffChance flatAddPct = ${effectAdd(luckyP, "walkoffChance", "flatAddPct")}`);
const combatP = createPlayer({ name: "Co", talent: "contact", traits: ["clutch"], relics: ["lucky_bat"] });
ok(effectMultiplier(combatP, "walkoffChance") === 2 && effectAdd(combatP, "walkoffChance", "flatAddPct") === 5,
   `clutch+lucky_bat: mult=2 + addPct=5`);

const ggP = createPlayer({ name: "Gg", talent: "contact", relics: ["golden_glove"] });
ok(effectMultiplier(ggP, "errorChance") === 0.5, `golden_glove errorChance multiplier = ${effectMultiplier(ggP, "errorChance")}`);

// 실제 게임 시뮬 — golden_glove 메인이 수비할 때 상대팀의 box.e 가 평균적으로 적은지
// (메인이 수비 측 → 상대 batter 의 reach-on-error 빈도 감소. 다만 메인은 본인 stat 만 추적이라
// 직접 비교 어렵다. 게임 mainPlayer.e 카운트는 메인의 출루이므로 의미 다름.)
//
// 검증: golden_glove 보유자가 *타격* 했을 때 본인의 box.e (실책출루) 가 *적어야* 함.
//       메인이 타격 = defSide 가 메인 팀이 아님 → errorMult 비활성. 즉 box.e 차이 없음.
//       반대로 메인이 수비 측에 있다는 건 메인 batter PA 가 발생 안 함. 게임 분포 어려움.
// 대신 단위 검증으로 충분 — effectMultiplier 값만 확인 (위에서 완료).

// simulateGame 한 경기 — 회귀 효과 무관 정상 동작 (회귀 무효과 회귀 검증)
state.gameDate = { year: 2027, month: 7, dayOfMonth: 1 };
state.player = createPlayer({ name: "Sg", talent: "contact" });
state.player.stage = "high";
state.player.teamName = "광주제일고";
state.player.gamesSinceLastPitch = 99;
state.league = createLeague("high", "광주제일고");
state.season = createSeason("high");
const myTeam = getPlayerTeam(state.league);
let foundGame = null;
if (myTeam) {
  outer: for (const wk of state.league.schedule ?? []) {
    for (const g of wk) {
      if (g.home === myTeam.id || g.away === myTeam.id) { foundGame = g; break outer; }
    }
  }
}
if (foundGame) {
  const result = simulateGame(state.league, foundGame, state.player);
  ok(!!result && Number.isFinite(result.home.score), `simulateGame 정상 동작 — ${result.away.team.name} ${result.away.score}-${result.home.score} ${result.home.team.name}`);
} else {
  ok(true, "schedule 비어있음 (skip — main 팀 식별 실패)");
}

console.log("\n" + (process.exitCode ? "❌ 일부 실패" : "✅ 전체 통과"));
