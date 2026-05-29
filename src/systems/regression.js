// 회귀(NewGame+) 메타 영속화 + 액션.
//
// 캐릭터 세이브(ninthinning.save.v1)와 독립된 별도 localStorage 키에
// 영구 누적 데이터를 저장한다. 캐릭터 리셋/삭제와 무관하게 보존되어야 한다.
//
// 점수 산정: hallOfFame.computeHallOfFameScore 의 total 을 그대로 사용 — 은퇴 시
// recordRun(score) 호출이 balance / totalEarned / runs 를 업데이트.
//
// 영구 / 재구매 분류:
//   permanentPurchases  : 재능 슬롯, stage cap (영구 누적)
//   unlockedItems       : 도전과제 키 (영구)
//   loadout             : 다음 캐릭터에 적용될 1회용 선택 (시작능력치/특성/유물)
//                          → 캐릭터 생성 시 read, 생성 직후 reset

import { state } from "../state.js";
import {
  TALENT_SLOTS_TIERS, STAT_KEYS, STAT_CAP_STEP, statCapCost,
  STARTING_STAT_PRESETS, TRAITS, RELICS, isTraitUnlocked,
} from "../data/shopCatalog.js";

export const REGRESSION_KEY = "ninthinning.regression.v1";

// 기본 스키마. 새 사용자/로드 실패 시 모두 이 값으로 시작.
export function defaultRegressionMeta() {
  return {
    balance: 0,
    totalEarned: 0,
    runs: 0,
    permanentPurchases: {
      talentSlots: 0,                              // 0~2 (추가 슬롯 수. 총 1+N 재능)
      statCaps: {},                                // 스탯별 +5 캡 구매 횟수 { contact:N, ... } — 전 stage 공통
      ownedTraits: [],                              // 영구 소유 trait 키 — 장착/해제와 무관, 한 번 사면 보존
      ownedRelics: [],                              // 영구 소유 relic 키
    },
    unlockedItems: [],                              // 도전과제 해금 키
    loadout: {
      startingStat: null,                           // "balanced" | "battingFocus" | "pitchingFocus"
      traits: [],                                   // 최대 3 — 장착 trait 키
      relics: [],                                   // 최대 2 — 장착 relic 키
    },
  };
}

// 일부 필드 누락된 옛 메타를 현재 스키마로 끌어올림. 향후 v2 마이그레이션 hook 의 자리.
function migrateMeta(data) {
  const base = defaultRegressionMeta();
  const out = { ...base, ...(data ?? {}) };
  out.permanentPurchases = { ...base.permanentPurchases, ...(data?.permanentPurchases ?? {}) };
  // 스탯별 캡 — 옛 그룹형(capBoosts {amateur,kbo,mlb})은 스키마가 달라 폐기, statCaps 만 승계.
  out.permanentPurchases.statCaps = { ...(data?.permanentPurchases?.statCaps ?? {}) };
  delete out.permanentPurchases.capBoosts;
  out.permanentPurchases.ownedTraits = Array.isArray(data?.permanentPurchases?.ownedTraits)
    ? [...data.permanentPurchases.ownedTraits] : [];
  out.permanentPurchases.ownedRelics = Array.isArray(data?.permanentPurchases?.ownedRelics)
    ? [...data.permanentPurchases.ownedRelics] : [];
  out.unlockedItems = Array.isArray(data?.unlockedItems) ? [...data.unlockedItems] : [];
  out.loadout = { ...base.loadout, ...(data?.loadout ?? {}) };
  out.loadout.traits = Array.isArray(data?.loadout?.traits) ? [...data.loadout.traits] : [];
  out.loadout.relics = Array.isArray(data?.loadout?.relics) ? [...data.loadout.relics] : [];
  // 옛 세이브 자동 승계 — 이미 장착되어 있던 trait/relic 은 영구 소유로 간주.
  for (const k of out.loadout.traits) {
    if (!out.permanentPurchases.ownedTraits.includes(k)) out.permanentPurchases.ownedTraits.push(k);
  }
  for (const k of out.loadout.relics) {
    if (!out.permanentPurchases.ownedRelics.includes(k)) out.permanentPurchases.ownedRelics.push(k);
  }
  return out;
}

export function loadRegressionMeta() {
  try {
    const raw = localStorage.getItem(REGRESSION_KEY);
    if (!raw) {
      state.regression = defaultRegressionMeta();
      return state.regression;
    }
    state.regression = migrateMeta(JSON.parse(raw));
    return state.regression;
  } catch (e) {
    console.error("regression load failed", e);
    state.regression = defaultRegressionMeta();
    return state.regression;
  }
}

export function saveRegressionMeta() {
  try {
    if (!state.regression) state.regression = defaultRegressionMeta();
    localStorage.setItem(REGRESSION_KEY, JSON.stringify(state.regression));
    return true;
  } catch (e) {
    console.error("regression save failed", e);
    return false;
  }
}

function ensureMeta() {
  if (!state.regression) state.regression = defaultRegressionMeta();
  return state.regression;
}

// ── 잔액 조작 ──────────────────────────────────────────────────────
export function addBalance(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const m = ensureMeta();
  m.balance += amount;
  m.totalEarned += amount;
  saveRegressionMeta();
  return m.balance;
}

// 차감 가능하면 차감 후 true, 부족하면 false (잔액 무변경).
export function spendBalance(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const m = ensureMeta();
  if (m.balance < amount) return false;
  m.balance -= amount;
  saveRegressionMeta();
  return true;
}

// 회귀 1회 기록 — 은퇴 시 HoF 점수를 balance/totalEarned 에 추가하고 runs++.
export function recordRun(score) {
  const m = ensureMeta();
  m.runs += 1;
  if (Number.isFinite(score) && score > 0) {
    m.balance += score;
    m.totalEarned += score;
  }
  saveRegressionMeta();
  return m;
}

// ── 영구 구매 ──────────────────────────────────────────────────────
// kind: "talentSlots" | "capBoost"
// talentSlots: payload 없음 — 다음 tier 자동 구매
// capBoost:    payload = { stat: "contact"|...|"mental" } — 해당 스탯 캡 +5 (상한 없음, 가격 점증)
// 성공 시 { ok: true, ... }, 실패 시 { ok: false, reason: "..." }.
export function purchasePermanent(kind, payload = {}) {
  const m = ensureMeta();
  if (kind === "talentSlots") {
    const current = m.permanentPurchases.talentSlots;
    const next = TALENT_SLOTS_TIERS[current];   // 0 이면 첫 tier (totalSlots:2), 1 이면 두 번째 (totalSlots:3)
    if (!next) return { ok: false, reason: "max_tier" };
    if (m.balance < next.cost) return { ok: false, reason: "insufficient_balance" };
    m.balance -= next.cost;
    m.permanentPurchases.talentSlots = current + 1;
    saveRegressionMeta();
    return { ok: true, kind, tier: next.tier, cost: next.cost, totalSlots: next.totalSlots };
  }
  if (kind === "capBoost") {
    const stat = payload.stat;
    if (!STAT_KEYS.includes(stat)) return { ok: false, reason: "invalid_stat" };
    if (!m.permanentPurchases.statCaps) m.permanentPurchases.statCaps = {};
    const owned = m.permanentPurchases.statCaps[stat] ?? 0;
    const cost = statCapCost(owned);
    if (m.balance < cost) return { ok: false, reason: "insufficient_balance" };
    m.balance -= cost;
    m.permanentPurchases.statCaps[stat] = owned + 1;
    saveRegressionMeta();
    return { ok: true, kind, stat, cost, add: STAT_CAP_STEP, owned: owned + 1 };
  }
  return { ok: false, reason: "unknown_kind" };
}

// ── 도전과제 해금 ─────────────────────────────────────────────────
// 중복 방지. 신규 해금 시 true, 이미 해금된 키면 false.
export function unlockItem(key) {
  if (!key) return false;
  const m = ensureMeta();
  if (m.unlockedItems.includes(key)) return false;
  m.unlockedItems.push(key);
  saveRegressionMeta();
  return true;
}

// ── 로드아웃 ──────────────────────────────────────────────────────
// 캐릭터 생성 직전 사용자가 상점에서 고른 1회용 선택 — startingStat / traits / relics.
// 캐릭터 생성 시 read 한 뒤 즉시 resetLoadout() 호출 (캐릭터당 1회 효과).
export function setStartingStat(presetKey) {
  const m = ensureMeta();
  if (presetKey !== null && !STARTING_STAT_PRESETS[presetKey]) return false;
  m.loadout.startingStat = presetKey;
  saveRegressionMeta();
  return true;
}

// 장착만 담당 — 포인트 차감 없음. 이미 소유한(ownedTraits) 항목만 장착 가능.
export function setTraits(traitKeys) {
  const m = ensureMeta();
  if (!Array.isArray(traitKeys)) return false;
  if (traitKeys.length > 3) return false;
  for (const k of traitKeys) {
    if (!TRAITS[k]) return false;
    if (!isTraitUnlocked(k, m.unlockedItems)) return false;
    if (!m.permanentPurchases.ownedTraits.includes(k)) return false;
  }
  m.loadout.traits = [...traitKeys];
  saveRegressionMeta();
  return true;
}

// 장착만 담당 — 포인트 차감 없음. 이미 소유한(ownedRelics) 항목만 장착 가능.
export function setRelics(relicKeys) {
  const m = ensureMeta();
  if (!Array.isArray(relicKeys)) return false;
  if (relicKeys.length > 2) return false;
  for (const k of relicKeys) {
    if (!RELICS[k]) return false;
    if (!m.permanentPurchases.ownedRelics.includes(k)) return false;
  }
  m.loadout.relics = [...relicKeys];
  saveRegressionMeta();
  return true;
}

// trait 구매 — 미소유시 비용 차감 + ownedTraits 등록. 소유 중이면 no-op.
export function purchaseTrait(key) {
  const m = ensureMeta();
  if (!TRAITS[key]) return { ok: false, reason: "invalid" };
  if (!isTraitUnlocked(key, m.unlockedItems)) return { ok: false, reason: "locked" };
  if (m.permanentPurchases.ownedTraits.includes(key)) return { ok: false, reason: "owned" };
  const cost = TRAITS[key].cost;
  if (m.balance < cost) return { ok: false, reason: "insufficient_balance" };
  m.balance -= cost;
  m.permanentPurchases.ownedTraits.push(key);
  saveRegressionMeta();
  return { ok: true, key, cost };
}

// relic 구매 — 미소유시 비용 차감 + ownedRelics 등록. 소유 중이면 no-op.
export function purchaseRelic(key) {
  const m = ensureMeta();
  if (!RELICS[key]) return { ok: false, reason: "invalid" };
  if (m.permanentPurchases.ownedRelics.includes(key)) return { ok: false, reason: "owned" };
  const cost = RELICS[key].cost;
  if (m.balance < cost) return { ok: false, reason: "insufficient_balance" };
  m.balance -= cost;
  m.permanentPurchases.ownedRelics.push(key);
  saveRegressionMeta();
  return { ok: true, key, cost };
}

export function resetLoadout() {
  const m = ensureMeta();
  m.loadout = { startingStat: null, traits: [], relics: [] };
  saveRegressionMeta();
}

// 캐릭터 생성 직전 호출 — 현재 loadout snapshot 을 반환하고 즉시 reset.
// 1회용 효과 (시작 능력치/특성/유물) 가 캐릭터당 1번만 적용되도록 보장.
export function consumeLoadoutForCharacter() {
  const m = ensureMeta();
  const snapshot = {
    startingStat: m.loadout.startingStat,
    traits: [...m.loadout.traits],
    relics: [...m.loadout.relics],
  };
  resetLoadout();
  return snapshot;
}

// 디버그/probe 용 — 전체 메타 초기화.
export function resetRegressionMeta() {
  state.regression = defaultRegressionMeta();
  saveRegressionMeta();
  return state.regression;
}
