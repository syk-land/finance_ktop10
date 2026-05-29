// 영어 팀 풀 (locale === "en" 일 때 사용)
// 한국어 teams.js 와 동일한 stage/strength 분포를 유지.
// 실존 구단명과 헷갈리지 않도록 가공된 가상 이름 사용.

export const HIGH_SCHOOL_TEAMS_EN = [
  { name: "Lincoln HS",    region: "Westfield",  strength: 60 },
  { name: "Roosevelt HS",  region: "Hillcrest",  strength: 65 },
  { name: "Jefferson HS",  region: "Riverside",  strength: 58 },
  { name: "Washington HS", region: "Bayview",    strength: 62 },
  { name: "Kennedy HS",    region: "Northport",  strength: 55 },
  { name: "Edison HS",     region: "Eastlake",   strength: 52 },
  { name: "Madison HS",    region: "Greenfield", strength: 60 },
  { name: "Wilson HS",     region: "Lakewood",   strength: 50 },
  { name: "Franklin HS",   region: "Brookhaven", strength: 53 },
  { name: "Adams HS",      region: "Maplewood",  strength: 48 },
  { name: "Hamilton HS",   region: "Ridgewood",  strength: 52 },
  { name: "Hoover HS",     region: "Sunridge",   strength: 46 },
];

export const PRO_TEAMS_EN = [
  { name: "Seattle Pioneers",    region: "Seattle",     strength: 78 },
  { name: "Houston Outlaws",     region: "Houston",     strength: 75 },
  { name: "Denver Stallions",    region: "Denver",      strength: 73 },
  { name: "Atlanta Thunder",     region: "Atlanta",     strength: 71 },
  { name: "Miami Wave",          region: "Miami",       strength: 70 },
  { name: "Brooklyn Bandits",    region: "New York",    strength: 76 },
  { name: "Phoenix Sun",         region: "Phoenix",     strength: 68 },
  { name: "Detroit Foxes",       region: "Detroit",     strength: 72 },
  { name: "Minneapolis Frost",   region: "Minneapolis", strength: 69 },
  { name: "Chicago Bulldogs",    region: "Chicago",     strength: 67 },
];

export const UNIV_TEAMS_EN = [
  { name: "Pacific State U",   region: "Westfield",   strength: 70 },
  { name: "Northern Tech",     region: "Highland",    strength: 72 },
  { name: "Central U",         region: "Midtown",     strength: 69 },
  { name: "Eastern College",   region: "Eastlake",    strength: 65 },
  { name: "Coastal U",         region: "Bayview",     strength: 68 },
  { name: "Mountain State",    region: "Ridgewood",   strength: 66 },
  { name: "River City U",      region: "Riverside",   strength: 64 },
  { name: "Capital U",         region: "Capital",     strength: 62 },
];

// All 30 MLB clubs (AL/NL, 6 divisions). strength ≈ overall competitiveness (70–88).
export const MLB_TEAMS_EN = [
  { name: "NY Yankees",            region: "New York",      strength: 84 },
  { name: "Baltimore Orioles",     region: "Baltimore",     strength: 82 },
  { name: "Toronto Blue Jays",     region: "Toronto",       strength: 79 },
  { name: "Tampa Bay Rays",        region: "Tampa Bay",     strength: 79 },
  { name: "Boston Red Sox",        region: "Boston",        strength: 78 },
  { name: "Cleveland Guardians",   region: "Cleveland",     strength: 78 },
  { name: "Minnesota Twins",       region: "Minnesota",     strength: 77 },
  { name: "Detroit Tigers",        region: "Detroit",       strength: 74 },
  { name: "Kansas City Royals",    region: "Kansas City",   strength: 74 },
  { name: "Chicago White Sox",     region: "Chicago",       strength: 70 },
  { name: "Houston Astros",        region: "Houston",       strength: 85 },
  { name: "Texas Rangers",         region: "Texas",         strength: 80 },
  { name: "Seattle Mariners",      region: "Seattle",       strength: 80 },
  { name: "LA Angels",             region: "Los Angeles",   strength: 73 },
  { name: "Oakland Athletics",     region: "Oakland",       strength: 70 },
  { name: "Atlanta Braves",        region: "Atlanta",       strength: 86 },
  { name: "Philadelphia Phillies", region: "Philadelphia",  strength: 83 },
  { name: "NY Mets",               region: "New York",      strength: 80 },
  { name: "Miami Marlins",         region: "Miami",         strength: 72 },
  { name: "Washington Nationals",  region: "Washington",    strength: 71 },
  { name: "Chicago Cubs",          region: "Chicago",       strength: 78 },
  { name: "Milwaukee Brewers",     region: "Milwaukee",     strength: 79 },
  { name: "St. Louis Cardinals",   region: "St. Louis",     strength: 77 },
  { name: "Cincinnati Reds",       region: "Cincinnati",    strength: 75 },
  { name: "Pittsburgh Pirates",    region: "Pittsburgh",    strength: 72 },
  { name: "LA Dodgers",            region: "Los Angeles",   strength: 88 },
  { name: "San Diego Padres",      region: "San Diego",     strength: 81 },
  { name: "SF Giants",             region: "San Francisco", strength: 77 },
  { name: "Arizona Diamondbacks",  region: "Arizona",       strength: 78 },
  { name: "Colorado Rockies",      region: "Colorado",      strength: 71 },
];
