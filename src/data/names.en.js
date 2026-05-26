// 영어 이름 풀 (locale === "en" 일 때 사용)
// 실존 인물과 우연한 일치는 의도된 것이 아님.

export const EN_FIRST = [
  "Mike", "Chris", "John", "David", "James", "Robert", "William", "Joseph",
  "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Donald",
  "Steven", "Paul", "Andrew", "Kenneth", "Joshua", "Kevin", "Brian", "Edward",
  "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary",
  "Nicholas", "Eric", "Stephen", "Jonathan", "Justin", "Scott", "Brandon",
  "Frank", "Benjamin", "Gregory", "Tyler", "Aaron", "Henry", "Jose",
  "Adam", "Nathan", "Zachary", "Carlos", "Juan", "Logan", "Caleb", "Connor",
  "Hunter", "Wyatt", "Dylan", "Owen", "Ethan", "Mason", "Carter", "Liam",
];

export const EN_LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Hill", "Flores", "Green", "Adams",
  "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
  "Roberts", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz",
  "Edwards", "Collins", "Reyes", "Stewart", "Morris",
];

export function randomEnglishName(rng = Math.random) {
  const f = EN_FIRST[Math.floor(rng() * EN_FIRST.length)];
  const l = EN_LAST[Math.floor(rng() * EN_LAST.length)];
  return `${f} ${l}`;
}
