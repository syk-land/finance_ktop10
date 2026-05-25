// 리그 단계별 팀 템플릿
// stage 값: "high" | "univ" | "pro2" | "pro1" | "japan" | "mlb"

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

export const STAGE_INFO = {
  high:  { label: "고교야구",   teams: HIGH_SCHOOL_TEAMS, weeksPerSeason: 22, gamesPerWeek: 1 },
  univ:  { label: "대학야구",   teams: UNIV_TEAMS,        weeksPerSeason: 22, gamesPerWeek: 1 },
  pro2:  { label: "퓨처스리그", teams: PRO_TEAMS,         weeksPerSeason: 26, gamesPerWeek: 3 },
  pro1:  { label: "1군",        teams: PRO_TEAMS,         weeksPerSeason: 26, gamesPerWeek: 3 },
  japan: { label: "일본 프로야구", teams: [],              weeksPerSeason: 26, gamesPerWeek: 3 },
  mlb:   { label: "메이저리그", teams: [],                weeksPerSeason: 26, gamesPerWeek: 3 },
};
