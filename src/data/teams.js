// 리그 단계별 팀 템플릿
// stage 값: "high" | "univ" | "pro2" | "pro1" | "mlb"
//
// 영어 풀은 teams.en.js 에 정의. getStageInfo(stage, locale) 로 locale 분기.
// 캐릭터/리그 생성 시점의 locale로 풀이 결정되며, 이후 locale 토글해도 이미 생성된
// team.name 은 유지된다 (저장된 식별자처럼 취급).

import {
  HIGH_SCHOOL_TEAMS_EN, PRO_TEAMS_EN, UNIV_TEAMS_EN, MLB_TEAMS_EN,
} from "./teams.en.js";

// 고교는 실력 편차가 크고 평균은 프로보다 한참 낮음 (실제 고교 야구 평균)
export const HIGH_SCHOOL_TEAMS = [
  { name: "북일고", region: "충남", strength: 60 },
  { name: "덕수고", region: "서울", strength: 65 },
  { name: "광주일고", region: "광주", strength: 58 },
  { name: "경남고", region: "부산", strength: 62 },
  { name: "대구고", region: "대구", strength: 55 },
  { name: "서울고", region: "서울", strength: 52 },
  { name: "휘문고", region: "서울", strength: 60 },
  { name: "장충고", region: "서울", strength: 50 },
  { name: "마산용마고", region: "경남", strength: 53 },
  { name: "청주고", region: "충북", strength: 48 },
  { name: "야탑고", region: "경기", strength: 52 },
  { name: "성남고", region: "경기", strength: 46 },
];

export const PRO_TEAMS = [
  { name: "서울 챌린저스", region: "서울", strength: 78 },
  { name: "부산 다이노스", region: "부산", strength: 75 },
  { name: "대구 라이거스", region: "대구", strength: 73 },
  { name: "광주 호크스", region: "광주", strength: 71 },
  { name: "인천 마린스", region: "인천", strength: 70 },
  { name: "수원 위즈", region: "경기", strength: 76 },
  { name: "대전 이글스", region: "충남", strength: 68 },
  { name: "창원 유니콘스", region: "경남", strength: 72 },
  { name: "고양 자이언츠", region: "경기", strength: 69 },
  { name: "전주 베어스", region: "전북", strength: 67 },
];

export const UNIV_TEAMS = [
  { name: "한양대", region: "서울", strength: 70 },
  { name: "고려대", region: "서울", strength: 72 },
  { name: "연세대", region: "서울", strength: 69 },
  { name: "동국대", region: "서울", strength: 65 },
  { name: "중앙대", region: "서울", strength: 68 },
  { name: "성균관대", region: "경기", strength: 66 },
  { name: "단국대", region: "경기", strength: 64 },
  { name: "건국대", region: "서울", strength: 62 },
];

// MLB 30개 구단 (AL/NL 6개 디비전). strength 는 통산 경쟁력 대략치(70~88).
export const MLB_TEAMS = [
  { name: "뉴욕 양키스", region: "뉴욕", strength: 84 },
  { name: "볼티모어 오리올스", region: "볼티모어", strength: 82 },
  { name: "토론토 블루제이스", region: "토론토", strength: 79 },
  { name: "탬파베이 레이스", region: "탬파베이", strength: 79 },
  { name: "보스턴 레드삭스", region: "보스턴", strength: 78 },
  { name: "클리블랜드 가디언스", region: "클리블랜드", strength: 78 },
  { name: "미네소타 트윈스", region: "미네소타", strength: 77 },
  { name: "디트로이트 타이거스", region: "디트로이트", strength: 74 },
  { name: "캔자스시티 로열스", region: "캔자스시티", strength: 74 },
  { name: "시카고 화이트삭스", region: "시카고", strength: 70 },
  { name: "휴스턴 애스트로스", region: "휴스턴", strength: 85 },
  { name: "텍사스 레인저스", region: "텍사스", strength: 80 },
  { name: "시애틀 매리너스", region: "시애틀", strength: 80 },
  { name: "LA 에인절스", region: "로스앤젤레스", strength: 73 },
  { name: "오클랜드 애슬레틱스", region: "오클랜드", strength: 70 },
  { name: "애틀랜타 브레이브스", region: "애틀랜타", strength: 86 },
  { name: "필라델피아 필리스", region: "필라델피아", strength: 83 },
  { name: "뉴욕 메츠", region: "뉴욕", strength: 80 },
  { name: "마이애미 말린스", region: "마이애미", strength: 72 },
  { name: "워싱턴 내셔널스", region: "워싱턴", strength: 71 },
  { name: "시카고 컵스", region: "시카고", strength: 78 },
  { name: "밀워키 브루어스", region: "밀워키", strength: 79 },
  { name: "세인트루이스 카디널스", region: "세인트루이스", strength: 77 },
  { name: "신시내티 레즈", region: "신시내티", strength: 75 },
  { name: "피츠버그 파이리츠", region: "피츠버그", strength: 72 },
  { name: "LA 다저스", region: "로스앤젤레스", strength: 88 },
  { name: "샌디에이고 파드리스", region: "샌디에이고", strength: 81 },
  { name: "샌프란시스코 자이언츠", region: "샌프란시스코", strength: 77 },
  { name: "애리조나 다이아몬드백스", region: "애리조나", strength: 78 },
  { name: "콜로라도 로키스", region: "콜로라도", strength: 71 },
];

// stage 별 시즌 메타 (locale에 영향 없음)
// 고교: 실제 한국 고교야구 일정 (3월 ~ 8월 말, 약 26주). 주작기(phoenix_cup)가
// 8.6~8.29 라 시즌 26주(3.1 + 182일 = 8.29 경) 까지 가야 결승까지 시즌 안에 진행됨.
const STAGE_META = {
  high:    { weeksPerSeason: 26, gamesPerWeek: 1 },
  univ:    { weeksPerSeason: 22, gamesPerWeek: 2 },
  pro2:    { weeksPerSeason: 26, gamesPerWeek: 3 },
  pro1:    { weeksPerSeason: 26, gamesPerWeek: 3 },
  mlb:     { weeksPerSeason: 26, gamesPerWeek: 3 },
  mlb_aaa: { weeksPerSeason: 26, gamesPerWeek: 3 },
  mlb_aa:  { weeksPerSeason: 26, gamesPerWeek: 3 },
  mlb_a:   { weeksPerSeason: 26, gamesPerWeek: 3 },
};

// stage + locale → 팀 풀
// 마이너리그(mlb_aaa/aa/a) 는 MLB 30팀의 산하 팜으로 같은 팀 풀을 사용. NPC 는 dummy 이름 처리.
export function getTeamPool(stage, locale = "ko") {
  const isMlbBranch = stage === "mlb" || stage === "mlb_aaa" || stage === "mlb_aa" || stage === "mlb_a";
  if (locale === "en") {
    if (stage === "high")  return HIGH_SCHOOL_TEAMS_EN;
    if (stage === "univ")  return UNIV_TEAMS_EN;
    if (stage === "pro1" || stage === "pro2") return PRO_TEAMS_EN;
    if (isMlbBranch)       return MLB_TEAMS_EN;
    return [];
  }
  if (stage === "high")  return HIGH_SCHOOL_TEAMS;
  if (stage === "univ")  return UNIV_TEAMS;
  if (stage === "pro1" || stage === "pro2") return PRO_TEAMS;
  if (isMlbBranch)       return MLB_TEAMS;
  return [];
}

// stage 정보 = 메타 + 팀 풀. label은 i18n으로 처리 (UI에서 t('stage.<stage>')).
export function getStageInfo(stage, locale = "ko") {
  const meta = STAGE_META[stage];
  if (!meta) return null;
  return {
    stage,
    weeksPerSeason: meta.weeksPerSeason,
    gamesPerWeek: meta.gamesPerWeek,
    teams: getTeamPool(stage, locale),
  };
}
