// 회귀(NewGame+) 상점 — 5탭 UI.
//
// 진입 경로:
//   1) 은퇴 패널의 "상점 보기" 버튼 (recordRun 이미 완료된 시점)
//   2) 메인 메뉴의 "회귀 상점" 버튼 (잔액/누적 > 0 일 때만 노출)
//
// 탭:
//   - talent  : 재능 슬롯 확장 (영구)
//   - cap     : stage cap 보너스 (영구, 그룹별 누적)
//   - start   : 시작 능력치 프리셋 (캐릭터당 1회)
//   - trait   : 특성 1~3장 (캐릭터당 1회)
//   - relic   : 유물 1~2개 (캐릭터당 1회)
//
// 효과 적용은 P3 (createPlayer 분기) 에서 다룬다 — 여기서는 메타만 갱신.

import { state } from "../state.js";
import { t } from "../i18n/index.js";
import {
  loadRegressionMeta, saveRegressionMeta,
  spendBalance, addBalance,
  purchasePermanent, setStartingStat, setTraits, setRelics,
  purchaseTrait, purchaseRelic, purchaseEquipment,
} from "../systems/regression.js";
import {
  TALENT_SLOTS_TIERS, STAT_KEYS, STAT_CAP_STEP, statCapCost,
  STARTING_STAT_PRESETS, TRAITS, RELICS, isTraitUnlocked, relicCost, relicEffectValue,
  EQUIPMENT_CATALOG, getEquipmentSpec,
} from "../data/shopCatalog.js";


let activeTab = "talent";
let routeRef = null;

export function renderShop(root, route) {
  routeRef = route;
  if (!state.regression) loadRegressionMeta();

  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "stack";

  wrap.appendChild(renderHeader());
  wrap.appendChild(renderTabBar());
  wrap.appendChild(renderTabContent());

  root.appendChild(wrap);
}

function renderHeader() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const top = document.createElement("div");
  top.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;";

  const title = document.createElement("h2");
  title.style.cssText = "margin:0; font-size:15px;";
  title.textContent = t("shop.title");
  top.appendChild(title);

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = t("shop.backToMenu");
  backBtn.style.cssText = "padding:6px 10px; font-size:11px;";
  backBtn.addEventListener("click", () => routeRef("menu"));
  top.appendChild(backBtn);

  panel.appendChild(top);

  // 잔액 / 누적 / 회귀 횟수
  const m = state.regression;
  const stats = document.createElement("div");
  stats.style.cssText = "display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; font-size:11px;";
  for (const [labelKey, val, color] of [
    ["shop.balance",     m.balance,     "var(--accent)"],
    ["shop.totalEarned", m.totalEarned, "var(--accent-2)"],
    ["shop.runs",        m.runs,        "var(--muted)"],
  ]) {
    const cell = document.createElement("div");
    cell.style.cssText = "background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:6px; text-align:center;";
    cell.innerHTML = `<div class="muted" style="font-size:10px;">${t(labelKey)}</div>
      <div style="font-weight:700; font-size:14px; color:${color};">${val}</div>`;
    stats.appendChild(cell);
  }
  panel.appendChild(stats);

  return panel;
}

function renderTabBar() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "6px";

  const row = document.createElement("div");
  row.style.cssText = "display:grid; grid-template-columns:repeat(6, 1fr); gap:3px;";

  const tabs = [
    { key: "talent", labelKey: "shop.tabTalent" },
    { key: "cap",    labelKey: "shop.tabCap" },
    { key: "start",  labelKey: "shop.tabStart" },
    { key: "trait",  labelKey: "shop.tabTrait" },
    { key: "relic",  labelKey: "shop.tabRelic" },
    { key: "equipment", labelKey: "shop.tabEquipment" },
  ];
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = t(tab.labelKey);
    btn.style.cssText = "padding:8px 2px; font-size:10px; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;";
    if (activeTab === tab.key) btn.classList.add("primary");
    btn.addEventListener("click", () => {
      activeTab = tab.key;
      renderShop(document.getElementById("view-root"), routeRef);
    });
    row.appendChild(btn);
  }
  panel.appendChild(row);
  return panel;
}

function renderTabContent() {
  if (activeTab === "talent") return renderTalentTab();
  if (activeTab === "cap")    return renderCapTab();
  if (activeTab === "start")  return renderStartTab();
  if (activeTab === "trait")  return renderTraitTab();
  if (activeTab === "relic")  return renderRelicTab();
  if (activeTab === "equipment") return renderEquipmentTab();
  return renderTalentTab();
}


// ── 재능 슬롯 탭 ──────────────────────────────────────────────────
function renderTalentTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;
  const owned = m.permanentPurchases.talentSlots;

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.talentDesc", { current: 1 + owned });
  panel.appendChild(desc);

  for (let i = 0; i < TALENT_SLOTS_TIERS.length; i++) {
    const tier = TALENT_SLOTS_TIERS[i];
    const isOwned = owned >= i + 1;
    const canBuy = !isOwned && (i === owned) && m.balance >= tier.cost;
    panel.appendChild(makeShopCard({
      title: t("shop.talentTierTitle", { n: tier.tier, total: tier.totalSlots }),
      desc: t("shop.talentTierDesc", { total: tier.totalSlots }),
      cost: tier.cost,
      state: isOwned ? "owned" : (i > owned ? "locked" : (canBuy ? "buyable" : "insufficient")),
      onClick: () => {
        const r = purchasePermanent("talentSlots");
        if (r.ok) renderShop(document.getElementById("view-root"), routeRef);
      },
    }));
  }
  return panel;
}

// ── stage cap 탭 ──────────────────────────────────────────────────
function renderCapTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.capDesc");
  panel.appendChild(desc);

  const statCaps = m.permanentPurchases.statCaps ?? {};
  const groups = [
    { label: t("shop.capGroupBatter"),  stats: ["contact", "power", "eye", "speed", "defense"] },
    { label: t("shop.capGroupPitcher"), stats: ["velocity", "control", "breaking", "stamina", "mental"] },
  ];
  for (const g of groups) {
    const header = document.createElement("div");
    header.style.cssText = "font-weight:700; font-size:12px; color:var(--accent-2); margin:8px 0 4px;";
    header.textContent = g.label;
    panel.appendChild(header);

    for (const stat of g.stats) {
      const owned = statCaps[stat] ?? 0;
      const bonus = owned * STAT_CAP_STEP;
      const cost = statCapCost(owned);
      const canBuy = m.balance >= cost;
      panel.appendChild(makeShopCard({
        title: t("shop.capStatTitle", { stat: t("stat." + stat), step: STAT_CAP_STEP }),
        desc: t("shop.capStatOwned", { bonus, count: owned }),
        cost,
        state: canBuy ? "buyable" : "insufficient",
        onClick: () => {
          const r = purchasePermanent("capBoost", { stat });
          if (r.ok) renderShop(document.getElementById("view-root"), routeRef);
        },
      }));
    }
  }
  return panel;
}

// ── 시작 능력치 탭 ───────────────────────────────────────────────
function renderStartTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.startDesc");
  panel.appendChild(desc);

  for (const key of Object.keys(STARTING_STAT_PRESETS)) {
    const preset = STARTING_STAT_PRESETS[key];
    const isSelected = m.loadout.startingStat === key;
    const canBuy = !isSelected && m.balance >= preset.cost;
    panel.appendChild(makeShopCard({
      title: t("shop.start." + key),
      desc: t("shop.startDescOf." + key),
      cost: preset.cost,
      state: isSelected ? "equipped" : (canBuy ? "buyable" : "insufficient"),
      onClick: () => {
        if (isSelected) {
          setStartingStat(null);
        } else {
          if (!spendBalance(preset.cost)) return;
          setStartingStat(key);
        }
        renderShop(document.getElementById("view-root"), routeRef);
      },
    }));
  }
  return panel;
}

// ── 특성 탭 ───────────────────────────────────────────────────────
function renderTraitTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.traitDesc", { equipped: m.loadout.traits.length });
  panel.appendChild(desc);

  for (const key of Object.keys(TRAITS)) {
    const tr = TRAITS[key];
    const owned = m.permanentPurchases.ownedTraits.includes(key);
    const equipped = m.loadout.traits.includes(key);
    const unlocked = isTraitUnlocked(key, m.unlockedItems);
    const capacity = m.loadout.traits.length < 3;
    const canBuy = !owned && unlocked && m.balance >= tr.cost;

    // state 흐름:
    //   미해금         → lockedAchievement
    //   장착 중        → equipped (클릭 시 해제)
    //   소유 + 미장착  → equippable (capacity OK 면 무료 장착) / full (capacity 0)
    //   미소유 + 해금  → buyable (클릭 시 구매+장착) / insufficient (잔액 부족)
    let cardState;
    if (!unlocked) cardState = "lockedAchievement";
    else if (equipped) cardState = "equipped";
    else if (owned) cardState = capacity ? "equippable" : "full";
    else if (canBuy) cardState = "buyable";
    else cardState = "insufficient";

    panel.appendChild(makeShopCard({
      title: t("trait." + key + ".name"),
      desc: t("trait." + key + ".desc") + (unlocked ? "" : " · " + t("shop.unlockReq", { req: t("unlock." + tr.unlock) })),
      cost: tr.cost,
      state: cardState,
      onClick: () => {
        if (equipped) {
          // 무료 해제
          const next = m.loadout.traits.filter(k => k !== key);
          setTraits(next);
        } else if (owned) {
          // 무료 장착
          if (!capacity) return;
          setTraits([...m.loadout.traits, key]);
        } else {
          // 구매 + 장착
          const r = purchaseTrait(key);
          if (!r.ok) return;
          if (capacity) setTraits([...m.loadout.traits, key]);
        }
        renderShop(document.getElementById("view-root"), routeRef);
      },
    }));
  }
  return panel;
}

// ── 유물 탭 ───────────────────────────────────────────────────────
function renderRelicTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.relicDesc", { equipped: m.loadout.relics.length });
  panel.appendChild(desc);

  for (const key of Object.keys(RELICS)) {
    const re = RELICS[key];
    const lvl = m.permanentPurchases.relicLevels?.[key] ?? 0;
    const owned = lvl >= 1;
    const equipped = m.loadout.relics.includes(key);
    const capacity = m.loadout.relics.length < 2;
    const cost = relicCost(key, lvl);            // 다음 레벨 구매 비용
    const canBuy = m.balance >= cost;
    const curStr = owned ? fmtRelicVal(key, relicEffectValue(key, lvl)) : null;
    const nextStr = fmtRelicVal(key, relicEffectValue(key, lvl + 1));

    // 효과 안내 — 현재(보유 시) → 다음 레벨
    const effLine = owned
      ? t("shop.relicLevelCur", { lvl, cur: curStr, next: nextStr })
      : t("shop.relicLevelBuy", { next: nextStr });

    const buyCard = makeShopCard({
      title: t("relic." + key + ".name") + (owned ? ` Lv.${lvl}` : ""),
      desc: t("relic." + key + ".desc") + " · " + effLine,
      cost,
      state: canBuy ? "buyable" : "insufficient",
      onClick: () => {
        const r = purchaseRelic(key);
        if (!r.ok) return;
        // 첫 구매 자동 장착은 purchaseRelic 코어에서 처리됨 (모든 경로 일관).
        renderShop(document.getElementById("view-root"), routeRef);
      },
    });
    panel.appendChild(buyCard);

    // 장착/해제 토글 (보유 시) — 캐릭터당 최대 2개.
    if (owned) {
      const eq = document.createElement("button");
      eq.type = "button";
      eq.style.cssText = "width:100%; margin:-4px 0 8px; padding:6px; font-size:11px;";
      eq.textContent = equipped ? t("shop.relicUnequip") : (capacity ? t("shop.relicEquip") : t("shop.relicEquipFull"));
      eq.className = equipped ? "primary" : "";
      eq.disabled = !equipped && !capacity;
      eq.addEventListener("click", () => {
        if (equipped) setRelics(m.loadout.relics.filter(k => k !== key));
        else if (capacity) setRelics([...m.loadout.relics, key]);
        else return;
        renderShop(document.getElementById("view-root"), routeRef);
      });
      panel.appendChild(eq);
    }
  }
  return panel;
}

// ── 장비 탭 ────────────────────────────────────────────────────────
function renderEquipmentTab() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.style.padding = "10px";

  const m = state.regression;
  const eq = m.permanentPurchases.equipment ?? { bat: 0, glove: 0, cleats: 0 };

  const desc = document.createElement("div");
  desc.className = "muted small";
  desc.style.cssText = "font-size:11px; margin-bottom:8px; line-height:1.4;";
  desc.textContent = t("shop.equipmentDesc");
  panel.appendChild(desc);

  const types = ["bat", "glove", "cleats"];
  for (const type of types) {
    const curLevel = eq[type] ?? 0;
    const catalog = EQUIPMENT_CATALOG[type];
    const currentSpec = getEquipmentSpec(type, curLevel);
    
    // 다음 등급 장비 정보
    const nextSpec = catalog.find(item => item.level === curLevel + 1);
    
    // 카드 구성
    const title = t(`shop.eqTitle.${type}`);
    let specDesc = "";
    
    if (curLevel > 0 && currentSpec) {
      specDesc += `${t("shop.current")}: ${t(currentSpec.nameKey)} (${formatStats(currentSpec.stats)})\n`;
    } else {
      specDesc += `${t("shop.current")}: ${t("shop.noEquipment")}\n`;
    }

    if (nextSpec) {
      specDesc += `${t("shop.nextUpgrade")}: ${t(nextSpec.nameKey)} (${formatStats(nextSpec.stats)})`;
      
      const isAffordable = m.balance >= nextSpec.cost;
      const cardState = isAffordable ? "buyable" : "insufficient";
      
      panel.appendChild(makeShopCard({
        title,
        desc: specDesc,
        cost: nextSpec.cost,
        state: cardState,
        onClick: () => {
          const res = purchaseEquipment(type);
          if (res.ok) {
            renderShop(document.getElementById("view-root"), routeRef);
          }
        }
      }));
    } else {
      specDesc += `${t("shop.maxLevelReached")}`;
      panel.appendChild(makeShopCard({
        title,
        desc: specDesc,
        cost: 0,
        state: "owned",
        onClick: null
      }));
    }
  }

  return panel;
}

function formatStats(stats) {
  if (!stats || Object.keys(stats).length === 0) return t("shop.noStatBuff");
  return Object.entries(stats)
    .map(([k, v]) => `${t("stat." + k)} +${v}`)
    .join(", ");
}


// 유물 효과값 표시 형식 — multiplier ×N / flatAddPct +N% / boost +N.
function fmtRelicVal(key, v) {
  const prop = RELICS[key]?.effect?.prop ?? "multiplier";
  if (prop === "flatAddPct") return `+${v}%`;
  if (prop === "boost")      return `+${v}`;
  return `×${v}`;
}

// ── 카드 컴포넌트 ────────────────────────────────────────────────
// state: "buyable" | "owned" | "equipped" | "equippable" | "insufficient" | "locked" | "lockedAchievement" | "full"
function makeShopCard({ title, desc, cost, state: cardState, onClick }) {
  const card = document.createElement("button");
  card.type = "button";

  const isDisabled = cardState === "locked" || cardState === "lockedAchievement" || cardState === "insufficient" || cardState === "full" || cardState === "owned";
  const highlighted = cardState === "owned" || cardState === "equipped" || cardState === "equippable";
  const accent = highlighted ? "var(--accent)" : "var(--border)";
  const opacity = isDisabled && !highlighted ? "0.55" : "1";

  card.style.cssText = `
    display:block; width:100%; padding:10px; margin-bottom:6px;
    background:var(--panel-2); border:1.5px solid ${accent}; border-radius:6px;
    text-align:left; color:inherit; font-family:inherit;
    cursor:${isDisabled ? "not-allowed" : "pointer"}; opacity:${opacity};
  `;
  card.disabled = isDisabled;

  const row = document.createElement("div");
  row.style.cssText = "display:flex; justify-content:space-between; align-items:flex-start; gap:8px;";

  const left = document.createElement("div");
  left.style.cssText = "flex:1; min-width:0;";
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-weight:700; font-size:13px; margin-bottom:2px; color:var(--accent);";
  titleEl.textContent = title;
  left.appendChild(titleEl);
  if (desc) {
    const descEl = document.createElement("div");
    descEl.style.cssText = "font-size:10.5px; color:var(--muted); line-height:1.4;";
    descEl.textContent = desc;
    left.appendChild(descEl);
  }
  row.appendChild(left);

  const right = document.createElement("div");
  right.style.cssText = "text-align:right; min-width:60px; font-size:11px; font-weight:700;";
  const statusLabel = {
    buyable: t("shop.cost", { cost }),
    owned:   t("shop.owned"),
    equipped: t("shop.equipped"),
    equippable: t("shop.equippable"),
    insufficient: t("shop.cost", { cost }),
    locked:  t("shop.lockedTier"),
    lockedAchievement: t("shop.lockedAchievement"),
    full:    t("shop.full"),
  }[cardState] ?? "";
  const statusColor = {
    buyable: "var(--accent)",
    owned: "var(--accent-2)",
    equipped: "var(--accent-2)",
    equippable: "var(--accent)",
    insufficient: "var(--danger, #c66)",
    locked: "var(--muted)",
    lockedAchievement: "var(--muted)",
    full: "var(--muted)",
  }[cardState] ?? "var(--muted)";
  right.style.color = statusColor;
  right.textContent = statusLabel;
  row.appendChild(right);

  card.appendChild(row);

  if (onClick && !isDisabled) {
    card.addEventListener("click", onClick);
  }
  return card;
}
