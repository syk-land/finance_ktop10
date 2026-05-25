// NPC 선수 생성 — 리그 풀
import { randomKoreanName } from "../data/names.js";
import { BATTER_STATS, PITCHER_STATS, emptyStats } from "./player.js";

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

// 박스-뮬러 변환 (대략 N(0,1))
function gauss() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function statFromGauss(base, sigma, weight = 1.0) {
  const v = base + gauss() * sigma;
  return Math.max(20, Math.min(150, Math.round(v * weight)));
}

// 팀 강도(strength)에 따라 평균 능력치 결정
function createBatter(strength, ageRange = [19, 35]) {
  const pos = POSITIONS_BATTER[Math.floor(Math.random() * POSITIONS_BATTER.length)];
  const w = POS_WEIGHTS[pos];
  const base = strength;
  const batter = {};
  for (const s of BATTER_STATS) {
    batter[s] = statFromGauss(base, 8, w[s] ?? 1.0);
  }
  return {
    id: _npcIdCounter++,
    name: randomKoreanName(),
    role: "batter",
    pos,
    age: rndInt(ageRange[0], ageRange[1]),
    batter,
    pitcher: null,
    seasonStats: emptyStats(),
  };
}

function createPitcher(strength, ageRange = [19, 35]) {
  const role = Math.random() < 0.5 ? "SP" : "RP";
  const base = strength;
  const pitcher = {};
  for (const s of PITCHER_STATS) {
    pitcher[s] = statFromGauss(base, 8);
  }
  return {
    id: _npcIdCounter++,
    name: randomKoreanName(),
    role: "pitcher",
    pos: role, // "SP" | "RP"
    age: rndInt(ageRange[0], ageRange[1]),
    batter: null,
    pitcher,
    seasonStats: emptyStats(),
  };
}

export function createRoster(strength, ageRange) {
  // 25명: 12명 야수 + 13명 투수
  const roster = [];
  for (let i = 0; i < 12; i++) roster.push(createBatter(strength, ageRange));
  for (let i = 0; i < 13; i++) roster.push(createPitcher(strength, ageRange));
  return roster;
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
