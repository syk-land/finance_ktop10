// 명예의 전당 헌액 판정 — 은퇴 시점에 호출.
// careerStats + championships + tournamentHistory + awards 를 종합해 점수 산출.
// 점수 임계: 300+ 헌액 / 200+ 준영구결번 / 그 외 일반은퇴.

// 카테고리 가중치는 KBO/MLB 명전 헌액 기준 대략 반영.
// - 타격: 통산 안타 3000 ≈ 헌액 (1점/30안타), HR 500 ≈ 헌액 (1점/3 HR)
// - 투구: 통산 200승 ≈ 헌액 (1점/2승), 2000K ≈ 헌액 (1점/10K)
// - 우승: ks/ws 1회 = +30 (큰 가중)
// - MVP·신인왕 등 시즌 수상도 보너스
export function computeHallOfFameScore(player) {
  const cs = player.careerStats ?? {};
  // 시즌 종료 후 careerStats 합산 전일 수도 있으니 seasonStats 도 합산
  const ss = player.seasonStats ?? {};
  const combine = (k) => (cs[k] ?? 0) + (ss[k] ?? 0);

  const breakdown = {};

  // 타격
  breakdown.hits   = Math.floor(combine("h") / 30);     // 3000안타 → 100점
  breakdown.hr     = Math.floor(combine("hr") / 3);     // 500홈런 → ~167점
  breakdown.rbi    = Math.floor(combine("rbi") / 50);   // 1500타점 → 30점
  breakdown.sb     = Math.floor(combine("sb") / 30);    // 300도루 → 10점

  // 투구
  breakdown.wins   = Math.floor(combine("w") / 2);      // 200승 → 100점
  breakdown.k      = Math.floor(combine("pK") / 10);    // 2000K → 200점
  breakdown.sv     = Math.floor(combine("sv") / 5);     // 350세이브 → 70점

  // 우승 — KBO 한국시리즈 / MLB 월드시리즈
  const championships = player.championships ?? [];
  breakdown.championships = championships.length * 30;

  // 대회 우승 — tournamentHistory champion (PO 챔피언 + HS 토너먼트 우승)
  const tHistory = player.tournamentHistory ?? [];
  const tChampions = tHistory.filter(r => r.result === "champion").length;
  breakdown.tournamentChampions = tChampions * 5;

  // 시즌 수상 — MVP 50, 신인왕 30, 타격왕/홈런왕/타점왕/방어율왕 등 각 10
  const awards = player.awards ?? [];
  let awardScore = 0;
  for (const a of awards) {
    if (a.key === "mvp" || a.key === "twoWayMvp") awardScore += 50;
    else if (a.key === "rookieOfYear")            awardScore += 30;
    else                                          awardScore += 10;
  }
  breakdown.awards = awardScore;

  // 마일스톤 — 큰 단경기 마일스톤 (퍼펙트/노히터 등)
  const milestones = player.milestones ?? [];
  let milestoneScore = 0;
  for (const m of milestones) {
    if (m.key === "perfectGame") milestoneScore += 20;
    else if (m.key === "noHitter") milestoneScore += 10;
    else if (m.key === "cycling") milestoneScore += 5;
  }
  breakdown.milestones = milestoneScore;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown };
}

// 헌액 등급 — "hof" 헌액 / "retiredJersey" 영구결번 / "regular" 일반은퇴
export function hofRank(score) {
  if (score >= 300) return "hof";
  if (score >= 200) return "retiredJersey";
  return "regular";
}
