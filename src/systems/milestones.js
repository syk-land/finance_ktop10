// 마일스톤 자동 검출 — 단경기 + 통산
// 호출 시점: week.js 의 endWeek 에서 simulateGame 결과별로 1회씩.
// 결과: pushToast 로 알림, player.fame / pitcher.mental 보너스, player.milestones 에 기록.
//
// 단경기:
//   - cycling   사이클링 히트 (1B+2B+3B+HR 모두)
//   - grandSlam 만루 홈런 (simulator 가 batterBox.gs 로 카운트)
//   - perfectGame  퍼펙트 게임 (선발 9이닝 가정. pH+pBB+pHbp == 0)
//   - noHitter  노히트 노런 (pH == 0)
//   - shutout   완봉 (er == 0)
//
// 통산: 한 카테고리당 첫 도달 임계만 알림. player.milestones[].key 로 중복 방지.

import { pushToast } from "../state.js";
import { t } from "../i18n/index.js";
import { addFame, getPlayerStatCap } from "./player.js";
import { unlockItem } from "./regression.js";

// 도전과제 해금 — 중복 방지 + 신규 해금 시 토스트.
function tryUnlock(key) {
  if (unlockItem(key)) {
    pushToast(t("regression.unlocked", { name: t("unlock." + key) }), "good");
  }
}

const CAREER_THRESHOLDS = {
  h:  [100, 500, 1000, 2000, 3000],
  hr: [50, 100, 200, 500],
  pK: [100, 500, 1000, 2000],
  w:  [50, 100, 200, 300],
};

// 임계 값별 명성 보너스 — 큰 마일스톤일수록 보상 큼
function fameForThreshold(T) {
  if (T >= 2000) return 25;
  if (T >= 1000) return 20;
  if (T >= 500)  return 15;
  if (T >= 200)  return 10;
  if (T >= 100)  return 7;
  return 5;
}

export function detectMilestones(player, gameResult, gameDate) {
  if (!player || !gameResult?.mainPlayer) return;
  player.milestones = player.milestones ?? [];

  const main = gameResult.mainPlayer;
  if (main.batterBox && main.roles?.bat)   detectGameBattingMilestones(player, main, gameDate);
  if (main.pitcherBox && main.roles?.pitch) detectGamePitchingMilestones(player, main, gameDate);

  detectCareerMilestones(player, gameDate);
}

function detectGameBattingMilestones(player, main, gameDate) {
  const bbox = main.batterBox;
  const events = (main.events ?? []).filter(e => e.role === "batter");
  const types = new Set(events.map(e => e.type));

  if (types.has("1B") && types.has("2B") && types.has("3B") && types.has("HR")) {
    award(player, "cycling", { fame: 15, contact: 1 }, gameDate, { stack: true });
  }
  const gs = bbox.gs ?? 0;
  for (let i = 0; i < gs; i++) {
    award(player, "grandSlam", { fame: 5 }, gameDate, { stack: true });
  }
  // 끝내기 — simulator 가 결승점 PA 이벤트에 walkoff:true 부착.
  // walkoff HR 은 더 큰 보상. 첫 끝내기 시 회귀 도전과제 walkoff_one 해금.
  for (const ev of events) {
    if (!ev.walkoff) continue;
    if (ev.type === "HR") {
      award(player, "walkoffHR", { fame: 20, contact: 2 }, gameDate, { stack: true });
    } else {
      award(player, "walkoff", { fame: 10, contact: 1 }, gameDate, { stack: true });
    }
    tryUnlock("walkoff_one");
  }
}

function detectGamePitchingMilestones(player, main, gameDate) {
  const pbox = main.pitcherBox;
  const h   = pbox.pH   ?? 0;
  const bb  = pbox.pBB  ?? 0;
  const hbp = pbox.pHbp ?? 0;
  const er  = pbox.er   ?? 0;

  if (h === 0 && bb === 0 && hbp === 0) {
    award(player, "perfectGame", { fame: 50, control: 5 }, gameDate, { stack: true });
  } else if (h === 0) {
    award(player, "noHitter", { fame: 25, control: 3 }, gameDate, { stack: true });
  } else if (er === 0) {
    award(player, "shutout", { fame: 5, control: 1 }, gameDate, { stack: true });
  }
}

function detectCareerMilestones(player, gameDate) {
  const ss = player.seasonStats ?? {};
  const cs = player.careerStats ?? {};
  const combined = {
    h:  (ss.h  ?? 0) + (cs.h  ?? 0),
    hr: (ss.hr ?? 0) + (cs.hr ?? 0),
    pK: (ss.pK ?? 0) + (cs.pK ?? 0),
    w:  (ss.w  ?? 0) + (cs.w  ?? 0),
  };

  for (const [cat, thresholds] of Object.entries(CAREER_THRESHOLDS)) {
    const current = combined[cat] ?? 0;
    for (const T of thresholds) {
      if (current < T) continue;
      const key = `career_${cat}_${T}`;
      if (player.milestones.some(m => m.key === key)) continue;
      const bonus = { fame: fameForThreshold(T) };
      award(player, key, bonus, gameDate, {
        labelKey: `milestone.career.${cat}`,
        params: { n: T },
      });
    }
  }
}

function award(player, key, bonuses, gameDate, opts = {}) {
  const labelKey = opts.labelKey ?? `milestone.${key}`;
  const params = opts.params ?? {};
  pushToast(t(labelKey, params), "good");

  if (bonuses.fame)   addFame(player, bonuses.fame);
  if (bonuses.contact && player.batter) {
    const cap = getPlayerStatCap(player, "contact");
    player.batter.contact = Math.min(cap, (player.batter.contact ?? 0) + bonuses.contact);
  }
  if (bonuses.control && player.pitcher) {
    const cap = getPlayerStatCap(player, "control");
    player.pitcher.control = Math.min(cap, (player.pitcher.control ?? 0) + bonuses.control);
  }

  player.milestones.push({
    key,
    year: gameDate?.year ?? null,
    stage: player.stage,
    ...(opts.params ? { params: opts.params } : {}),
  });
}
