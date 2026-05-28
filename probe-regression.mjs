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
  resetRegressionMeta,
} = await import("./src/systems/regression.js");
const { capBonusForStage } = await import("./src/data/shopCatalog.js");

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

console.log("\n" + (process.exitCode ? "❌ 일부 실패" : "✅ 전체 통과"));
