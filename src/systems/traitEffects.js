// 회귀(NewGame+) 특성/유물 효과 합산 헬퍼.
//
// player.traits / player.relics 에 attach 된 키들의 effect 를 모아 합산값을 반환한다.
// 동일 kind 가 여러 항목에 걸쳐 있으면:
//   - multiplier: 곱연산
//   - add / flatAddPct / boost / years: 가산
//   - flag (multiplier/add 없음, 효과 존재 자체로 의미): 하나라도 있으면 true
//
// 사용 측은 trait 시스템을 모르더라도 kind 키만 알면 효과를 적용할 수 있다.

import { TRAITS, RELICS } from "../data/shopCatalog.js";

function collectEffects(player) {
  const out = [];
  for (const k of player?.traits ?? []) {
    const e = TRAITS[k]?.effect;
    if (e) out.push(e);
  }
  for (const k of player?.relics ?? []) {
    const e = RELICS[k]?.effect;
    if (e) out.push(e);
  }
  return out;
}

// 곱연산 합산 (없으면 1)
export function effectMultiplier(player, kind) {
  let m = 1;
  for (const e of collectEffects(player)) {
    if (e.kind === kind && typeof e.multiplier === "number") {
      m *= e.multiplier;
    }
  }
  return m;
}

// 특정 prop (add / flatAddPct / boost / years) 가산 합산 (없으면 0)
export function effectAdd(player, kind, prop = "add") {
  let s = 0;
  for (const e of collectEffects(player)) {
    if (e.kind === kind && typeof e[prop] === "number") {
      s += e[prop];
    }
  }
  return s;
}

// flag 형 — 해당 kind 의 효과가 player 에 활성되어 있는지
export function hasTraitFlag(player, kind) {
  for (const e of collectEffects(player)) {
    if (e.kind === kind) return true;
  }
  return false;
}
