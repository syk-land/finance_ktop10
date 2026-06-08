// NPC 선수 생성 — 리그 풀
// 이름은 생성 시점의 locale 풀에서 뽑는다 (이후 locale 토글해도 NPC 이름은 유지).
import { randomName } from "../data/names.js";
import { BATTER_STATS, PITCHER_STATS, emptyStats } from "./player.js";
import { getLocale } from "../i18n/index.js";
import { assignPitches, rollNpcBats, rollNpcThrows } from "./pitches.js";

const POSITIONS_BATTER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
// 포지션별 능력치 가중치 (생성 시)
const POS_WEIGHTS = {
  C:  { contact: 1.0, power: 1.0, eye: 1.0, speed: 0.7, defense: 1.3 },
  "1B": { contact: 1.1, power: 1.2, eye: 1.0, speed: 0.8, defense: 1.0 },
  "2B": { contact: 1.1, power: 0.9, eye: 1.0, speed: 1.1, defense: 1.2 },
  "3B": { contact: 1.0, power: 1.2, eye: 1.0, speed: 0.9, defense: 1.1 },
  SS: { contact: 1.0, power: 0.9, eye: 1.0, speed: 1.2, defense: 1.3 },
  LF: { contact: 1.1, power: 1.1, eye: 1.0, speed: 1.0, defense: 0.95 },
  CF: { contact: 1.0, power: 1.0, eye: 1.0, speed: 1.3, defense: 1.2 },
  RF: { contact: 1.0, power: 1.2, eye: 1.0, speed: 1.0, defense: 1.0 },
  DH: { contact: 1.1, power: 1.3, eye: 1.1, speed: 0.7, defense: 0.5 },
};

let _npcIdCounter = 1;

// stage 별 NPC stat 한계 (이 cap 을 넘는 NPC 는 없음)
// 캡 스케일업 — 고교 제외, 각 단계 (캡−100)% 증가 = oldCap²/100 (예: mlb 200→400, aa 150→225, aaa 180→324).
// 첫회차 양방향+전지훈련 주인공이 30세 평균 ~200 에 도달 → NPC 평균(cap×0.75)도 그에 맞춰 상향.
const NPC_STAT_CAP_BY_STAGE = {
  high:    100,   // 고교 그대로
  univ:    121,   // 110²/100
  pro2:    169,   // 130²/100
  pro1:    256,   // 160²/100
  mlb_a:   169,   // 130²/100
  mlb_aa:  225,   // 150²/100
  mlb_aaa: 324,   // 180²/100
  mlb:     400,   // 200²/100
};
export function getNpcStatCap(stage) {
  return NPC_STAT_CAP_BY_STAGE[stage] ?? 150;
}

// 박스-뮬러 변환 (대략 N(0,1))
function gauss() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function statFromGauss(base, sigma, weight = 1.0, cap = 150) {
  const v = base + gauss() * sigma;
  return Math.max(20, Math.min(cap, Math.round(v * weight)));
}

// 팀 강도(strength) + stage cap 에 따라 평균 능력치 결정.
// 평균은 stage cap 의 약 75% — 옛 90% 는 메인 성장과 격차 너무 커 ERA 30 같은 비현실 결과.
// 75% 평균 + sigma 14 면 약체 NPC ~cap*0.6 ~ 강체 NPC ~cap*0.9 분포.
// 팀 strength 영향도 강화(0.3→0.6) — 강팀/약팀 격차 가시화.
function stageBase(strength, cap) {
  return cap * 0.88 + (strength - 60) * 0.6;
}

// 팀의 대략적 평균 능력치 (주인공 능력치와 같은 스케일) — 영입/오퍼 카드 표시용.
// stageBase 를 stage NPC cap 으로 산출 후 [20, cap] 클램프.
export function teamAvgOvr(strength, stage) {
  const cap = getNpcStatCap(stage);
  return Math.round(Math.max(20, Math.min(cap, stageBase(strength, cap))));
}

// MLB 계열 stage — 한글 버전이어도 영어 이름 사용
const MLB_STAGES = new Set(["mlb", "mlb_a", "mlb_aa", "mlb_aaa"]);
function nameLocaleForStage(stage) {
  return MLB_STAGES.has(stage) ? "en" : getLocale();
}

function createBatter(strength, ageRange = [19, 35], cap = 150, nameLocale = getLocale()) {
  const pos = POSITIONS_BATTER[Math.floor(Math.random() * POSITIONS_BATTER.length)];
  const w = POS_WEIGHTS[pos];
  const base = stageBase(strength, cap);
  const batter = {};
  for (const s of BATTER_STATS) {
    batter[s] = statFromGauss(base, 14, w[s] ?? 1.0, cap);
  }
  return {
    id: _npcIdCounter++,
    name: randomName(nameLocale),
    role: "batter",
    pos,
    age: rndInt(ageRange[0], ageRange[1]),
    bats: rollNpcBats(),                 // "L" | "R" | "S"
    batter,
    pitcher: null,
    seasonStats: emptyStats(),
    injury: null, // {weeksLeft, severity} 또는 null. week.js 가 매주 감소.
  };
}

function createPitcher(strength, ageRange = [19, 35], cap = 150, nameLocale = getLocale()) {
  const role = Math.random() < 0.5 ? "SP" : "RP";
  const base = stageBase(strength, cap);
  const pitcher = {};
  for (const s of PITCHER_STATS) {
    pitcher[s] = statFromGauss(base, 14, 1.0, cap);
  }
  return {
    id: _npcIdCounter++,
    name: randomName(nameLocale),
    role: "pitcher",
    pos: role, // "SP" | "RP"
    age: rndInt(ageRange[0], ageRange[1]),
    throws: rollNpcThrows(),             // "L" | "R"
    batter: null,
    pitcher,
    pitches: assignPitches(pitcher),     // { available, primary }
    seasonStats: emptyStats(),
    injury: null,
    gamesSinceLastPitch: 99,
  };
}

// 마이너/2군 NPC dummy 이름용 단축 라벨
const DUMMY_STAGE_LABEL = {
  pro2:    "2군",
  mlb_a:   "A",
  mlb_aa:  "AA",
  mlb_aaa: "AAA",
};
export function isDummyStage(stage) {
  return stage in DUMMY_STAGE_LABEL;
}
function dummyName(teamName, stage, role, idx) {
  const tag = DUMMY_STAGE_LABEL[stage] ?? stage;
  const r = role === "batter" ? "B" : "P";
  return `${teamName}-${tag}-${r}${idx + 1}`;
}

export function createRoster(strength, ageRange, opts = {}) {
  const { stage, teamName } = opts;
  const cap = getNpcStatCap(stage);
  const dummy = stage && teamName && isDummyStage(stage);
  // MLB 계열은 한글 버전이어도 영어 이름 강제
  const nameLoc = nameLocaleForStage(stage);
  // 25명: 12명 야수 + 13명 투수
  const roster = [];
  for (let i = 0; i < 12; i++) {
    const n = createBatter(strength, ageRange, cap, nameLoc);
    if (dummy) { n.isDummy = true; n.name = dummyName(teamName, stage, "batter", i); }
    roster.push(n);
  }
  for (let i = 0; i < 13; i++) {
    const n = createPitcher(strength, ageRange, cap, nameLoc);
    if (dummy) { n.isDummy = true; n.name = dummyName(teamName, stage, "pitcher", i); }
    roster.push(n);
  }
  assignBullpenRoles(roster);
  return roster;
}

// 불펜 구조 정리 — 실제 야구 투수 운용 모방.
//   1) SP 최소 5명 보장 (부족하면 RP 중 OVR 높은 순으로 선발 전환)
//   2) RP 중 OVR 최고 1명 = 마무리(CL), 다음 1~2명 = 셋업(SU), 나머지 = 중간계투(MR)
// bullpenRole 은 RP 에만 부여. pos 는 "SP"/"RP" 유지 (기존 필터와 호환).
// 매 시즌(ageUp) 후에도 재호출해 성장/은퇴 반영.
export function assignBullpenRoles(roster) {
  const pitchers = roster.filter(p => p.role === "pitcher");
  let sps = pitchers.filter(p => p.pos === "SP");
  if (sps.length < 5) {
    const promote = pitchers
      .filter(p => p.pos === "RP")
      .sort((a, b) => npcOverall(b) - npcOverall(a));
    for (const p of promote) {
      if (sps.length >= 5) break;
      p.pos = "SP";
      sps.push(p);
    }
  }
  for (const p of sps) delete p.bullpenRole;
  const rps = pitchers
    .filter(p => p.pos === "RP")
    .sort((a, b) => npcOverall(b) - npcOverall(a));
  rps.forEach((p, i) => {
    p.bullpenRole = i === 0 ? "CL" : i <= 2 ? "SU" : "MR";
  });
  return roster;
}

// 시즌당 능력치 변화 — NPC는 훈련 안 하므로 나이별 고정 변화로 단순화
function seasonStatChange(age) {
  if (age <= 18) return 4;
  if (age <= 22) return 2;
  if (age <= 27) return 0;
  if (age <= 31) return -1;
  if (age <= 35) return -3;
  return -5;
}

function growNPC(npc, cap = 150) {
  const delta = seasonStatChange(npc.age);
  const stats = npc.batter || npc.pitcher;
  if (!stats) return;
  for (const k of Object.keys(stats)) {
    const noise = (Math.random() - 0.5) * 4;
    stats[k] = Math.max(20, Math.min(cap, stats[k] + delta + noise));
  }
}

// stage 별 NPC 나이 범위 (생성 + ageUp 양쪽에서 사용)
export const STAGE_AGE_RANGE = {
  high:    [16, 18],
  univ:    [19, 22],
  pro2:    [19, 30],
  pro1:    [20, 38],
  mlb_a:   [18, 25],
  mlb_aa:  [20, 28],
  mlb_aaa: [22, 32],
  mlb:     [22, 40],
};
export function stageAgeRange(stage) {
  return STAGE_AGE_RANGE[stage] ?? [19, 35];
}

// 학년/시즌 진급 시 NPC 풀 업데이트: 나이+1, 능력치 성장/노화, 졸업/은퇴, 신인 합류
export function ageUpRoster(roster, stage, strength, teamName = null) {
  const ageRange = stageAgeRange(stage);
  const maxAge = ageRange[1];
  const cap = getNpcStatCap(stage);
  const dummy = teamName && isDummyStage(stage);

  for (const npc of roster) {
    npc.age += 1;
    growNPC(npc, cap);
    npc.seasonStats = emptyStats();
  }
  // 졸업/은퇴
  const remaining = roster.filter(p => p.age <= maxAge);

  // 신인 합류 — 빈 슬롯만큼 (야수 12 / 투수 13 유지)
  const currentBatters = remaining.filter(p => p.role === "batter").length;
  const currentPitchers = remaining.filter(p => p.role === "pitcher").length;
  for (let i = currentBatters; i < 12; i++) {
    const n = createBatter(strength, [ageRange[0], ageRange[0]], cap);
    if (dummy) { n.isDummy = true; n.name = dummyName(teamName, stage, "batter", i); }
    remaining.push(n);
  }
  for (let i = currentPitchers; i < 13; i++) {
    const n = createPitcher(strength, [ageRange[0], ageRange[0]], cap);
    if (dummy) { n.isDummy = true; n.name = dummyName(teamName, stage, "pitcher", i); }
    remaining.push(n);
  }
  assignBullpenRoles(remaining);
  return remaining;
}

// 단순 OVR (정렬용)
export function npcOverall(npc) {
  if (npc.role === "batter") {
    const b = npc.batter;
    return (b.contact + b.power + b.eye + b.speed + b.defense) / 5;
  } else {
    const p = npc.pitcher;
    return (p.velocity + p.control + p.breaking + p.stamina + p.mental) / 5;
  }
}

function rndInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
