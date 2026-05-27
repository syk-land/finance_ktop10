// 한국어 문자열 테이블
export const ko = {
  app: {
    title: "나혼자만 자동야구",
    logo: "나혼자만 자동야구",
    version: "v0.3 · Phase 1+α",
  },

  nav: {
    topbarFormat: "{name} · {team} · {grade}학년 · {age}세",
    teamPlaceholder: "-",
    localeToggle: "EN",   // 현재 KO일 때 토글 버튼은 다른 언어 라벨 노출
  },

  dateFormat: "{month}월 {dayOfMonth}일 ({weekday})",
  weekday: { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" },

  common: {
    dash: "-",
    age: "{age}세",
    grade: "{grade}학년",
    yearSlash: "{year}년차 / 시즌 {week}주차",
    weeks: "{weeks}주",
    weeksLeft: "({weeks}주)",
    percent: "{value}%",
    actionFail: "행동 실패: {reason}",
    returnToMenu: "메인 메뉴로",
    cancel: "취소",
    confirm: "확인",
  },

  stage: {
    high:    "고교야구",
    univ:    "대학야구",
    pro2:    "KBO 2군",
    pro1:    "KBO 1군",
    japan:   "일본 프로야구",
    mlb:     "MLB",
    mlb_aaa: "MLB AAA",
    mlb_aa:  "MLB AA",
    mlb_a:   "MLB 싱글A",
  },

  stat: {
    contact: "컨택", power: "파워", eye: "선구안", speed: "주력", defense: "수비",
    velocity: "구속", control: "제구", breaking: "변화구", stamina: "스태미나", mental: "멘탈",
  },

  talent: {
    contact: "컨택형",
    power: "파워형",
    speedster: "주루형",
    defender: "수비형",
    all_round: "만능형",
    fireball: "강속구형",
    finesse: "제구형",
    breakerz: "변화구형",
  },

  training: {
    batting: "타격 훈련",
    eye_drill: "선구안 훈련",
    running: "주루 훈련",
    fielding: "수비 훈련",
    pitching: "투구 훈련",
    breaking_drill: "변화구 훈련",
    weight: "웨이트",
    mental: "멘탈 훈련",
  },

  // 훈련 라벨에서 " 훈련" 접미사를 제거한 짧은 형태 (이번 주 일정 셀)
  trainingShort: {
    batting: "타격",
    eye_drill: "선구안",
    running: "주루",
    fielding: "수비",
    pitching: "투구",
    breaking_drill: "변화구",
    weight: "웨이트",
    mental: "멘탈",
  },

  action: { train: "훈련", work: "일/아르바이트", rest: "휴식" },

  // 시즌 종료 후 휴식기 — 카테고리 선택 → 이벤트 제안 yes/no → 결과
  offseason: {
    title: "휴식기 — {grade}학년 종료",
    pickHint: "다음 시즌까지 어떻게 보낼까?",
    proposalTitle: "특별한 일이 생겼다!",
    btnYes: "도전한다",
    btnNo: "거절한다",
    btnContinue: "다음 연차 진행하기",
    summary: "이번 휴식기 결과",
    sectionBase: "기본 효과",
    sectionEvent: "이벤트 결과",
    noChange: "변화 없음",
    fame: "명성",
    skipped: "특별 이벤트를 거절했다.",

    // 옵션 카테고리
    intense:        { label: "특훈",       desc: "혹독한 단련. 큰 보상을 노리지만 위험도 크다." },
    camp:           { label: "전지훈련",   desc: "캠프에서 능력치를 골고루 끌어올린다." },
    regular:        { label: "일반훈련",   desc: "팀 훈련을 충실히. 안정적인 성장." },
    rest:           { label: "휴식",       desc: "푹 쉬며 체력과 멘탈을 회복한다." },
    youth_worldcup: { label: "청소년 대표팀 차출", desc: "U-18 야구 월드컵 출전 기회. 큰 무대에서 시험받는다." },

    // 굴림 결과 헤더 (대성공 / 무난 / 실패)
    outcome: {
      great: "대성공!",
      ok:    "그래도 도움이 됐다.",
      bad:   "잘못된 선택이었나 보다…",
    },

    // 이벤트 — label, desc, great/ok/bad 결과 텍스트
    event: {
      // ── 특훈 ──
      mad_scientist_pitch: {
        label: "미치광이 과학자의 투구폼 개조",
        desc:  "수상한 박사가 투구폼을 분석해 고쳐주겠다고 한다.",
        great: "알맞은 투구폼으로 개조에 성공!",
        ok:    "개조엔 실패했지만 훈련은 성공!",
        bad:   "폼이 망가져버렸다…",
      },
      mad_scientist_bat: {
        label: "미치광이 과학자의 타격폼 개조",
        desc:  "박사가 이번엔 스윙을 손보겠다고 한다.",
        great: "완벽한 스윙을 찾았다!",
        ok:    "어색하지만 훈련은 성공!",
        bad:   "스윙이 흐트러졌다…",
      },
      secret_pitch: {
        label: "비밀 구종 전수",
        desc:  "선배가 자신만의 비밀 구종을 가르쳐주겠다고 한다.",
        great: "새 비밀 구종 완성!",
        ok:    "감만 잡았지만 도움은 됐다.",
        bad:   "팔에 무리가 갔다…",
      },
      extreme_drill: {
        label: "극한 드릴 도전",
        desc:  "한계까지 몰아붙이는 살인 훈련에 도전할 기회.",
        great: "한계를 돌파했다!",
        ok:    "버텨낸 끝에 조금 성장.",
        bad:   "몸이 망가졌다…",
      },
      new_form: {
        label: "새 폼 시도",
        desc:  "코치가 새 폼을 권한다. 받아들일까?",
        great: "새 폼이 완벽하게 맞았다!",
        ok:    "익숙해지는 데 시간이 걸렸다.",
        bad:   "원래 폼만 못해졌다…",
      },

      // ── 전지훈련 ──
      foreign_coach: {
        label: "외국인 코치의 특별 강습",
        desc:  "유명한 외국인 코치가 단기 강습을 제안한다.",
        great: "코치와 통했다. 타격이 진화했다!",
        ok:    "그럭저럭 가르침을 받았다.",
        bad:   "스타일이 맞지 않았다…",
      },
      mentor_pitcher: {
        label: "전설의 멘토를 만나다",
        desc:  "은퇴한 전설이 며칠간 봐주겠다고 한다.",
        great: "비기를 전수받았다!",
        ok:    "짧지만 도움이 됐다.",
        bad:   "가르침이 어려워 멘탈만 흔들렸다…",
      },
      team_chemistry: {
        label: "팀과의 합숙",
        desc:  "동료들과 같이 합숙하며 캠프를 보낸다.",
        great: "팀과 완벽한 호흡!",
        ok:    "친해졌다.",
        bad:   "마찰이 있었다…",
      },
      tough_camp: {
        label: "험지 캠프 도전",
        desc:  "거친 환경의 캠프에 참가할 기회.",
        great: "강도 높은 캠프를 견뎌냈다!",
        ok:    "무사히 마쳤다.",
        bad:   "캠프 중 부상을 입었다…",
      },
      unfamiliar_env: {
        label: "낯선 환경에서의 훈련",
        desc:  "전혀 다른 곳에서 적응 훈련.",
        great: "새 환경에 빠르게 적응!",
        ok:    "그럭저럭 보냈다.",
        bad:   "향수병에 시달렸다…",
      },

      // ── 일반훈련 ──
      new_technique: {
        label: "새 기술 연습",
        desc:  "익숙하지 않은 기술을 집중 연습한다.",
        great: "새 기술 마스터!",
        ok:    "기본기 정리.",
        bad:   "익히기 어려웠다…",
      },
      rival: {
        label: "라이벌과의 경쟁",
        desc:  "라이벌이 1대1 훈련 대결을 신청한다.",
        great: "라이벌을 압도했다!",
        ok:    "자극은 받았다.",
        bad:   "자신감을 잃었다…",
      },
      coach_advice: {
        label: "코치의 깊이 있는 조언",
        desc:  "팀 코치가 시간을 내서 깊이 봐주겠다고 한다.",
        great: "결정적 깨달음을 얻었다!",
        ok:    "도움이 됐다.",
        bad:   "머리만 복잡해졌다…",
      },
      routine_drill: {
        label: "기본기 반복 훈련",
        desc:  "단조롭지만 기본기를 다시 다지는 훈련.",
        great: "반복 속에서 안정감을 얻었다!",
        ok:    "평범하게 보냈다.",
        bad:   "권태에 빠졌다…",
      },
      night_training: {
        label: "야간 추가 훈련",
        desc:  "낮 훈련 후 야간에 추가로 운동할까?",
        great: "야간 훈련의 효과를 봤다!",
        ok:    "그럭저럭 보냈다.",
        bad:   "페이스가 망가졌다…",
      },

      // ── 휴식 ──
      confession: {
        label: "고백을 받았다",
        desc:  "응원해주던 사람이 사귀자고 한다.",
        great: "응원자가 생겨 자신감이 붙었다!",
        ok:    "좋은 추억이 됐다.",
        bad:   "너무 놀아서 컨디션이 망가졌다…",
      },
      family_time: {
        label: "가족과의 시간",
        desc:  "오랜만에 가족과 시간을 보낸다.",
        great: "따뜻한 위로를 받았다!",
        ok:    "편한 시간이었다.",
        bad:   "잔소리만 들었다…",
      },
      hobby: {
        label: "새 취미 발견",
        desc:  "예전부터 관심 있던 일에 도전한다.",
        great: "새 영감을 얻었다!",
        ok:    "즐겁게 보냈다.",
        bad:   "시간만 낭비했다…",
      },
      short_trip: {
        label: "짧은 여행",
        desc:  "가까운 곳으로 짧게 여행을 다녀온다.",
        great: "마음이 새로워졌다!",
        ok:    "적당히 쉬었다.",
        bad:   "컨디션이 망가졌다…",
      },
      quiet_rest: {
        label: "조용한 휴식",
        desc:  "아무것도 하지 않고 푹 쉰다.",
        great: "푹 쉬었더니 기운이 가득!",
        ok:    "평범한 휴식.",
        bad:   "게을러져 버렸다…",
      },

      // ── 청소년 세계대회 ──
      worldcup_run: {
        label: "U-18 야구 월드컵 출전",
        desc:  "청소년 대표팀에 차출되어 세계 무대에 선다.",
        great: "결승을 제패하고 우승을 차지했다!",
        ok:    "본선까지 진출. 좋은 경험이 됐다.",
        bad:   "예선 탈락. 큰 좌절을 맛봤다…",
      },
    },
  },

  // 한국 고교야구 대회 (tournaments.js)
  tournament: {
    weekly_first:  "전반기 주말리그",
    emart_cup:     "현무기",
    gold_lion:     "백호기",
    weekly_second: "후반기 주말리그",
    blue_dragon:   "청룡기",
    president_cup: "대통령배",
    phoenix_cup:   "주작기",
  },

  // 대회 결과
  result: {
    champion:   "우승",
    runner:     "준우승",
    eliminated: "본선 탈락",
  },

  // 시즌 수상 (awards.js)
  award: {
    battingTitle: "타격왕",
    hrKing:       "홈런왕",
    rbiKing:      "타점왕",
    kKing:        "탈삼진왕",
    eraTitle:     "평균자책점왕",
    rookie:       "신인왕",
    mvp:          "최우수선수상 (MVP)",
    twoWayMvp:    "양방향 MVP",
  },

  // 타석 결과 (simulator → events.type)
  event: {
    K:   "삼진",
    BB:  "볼넷",
    HBP: "사구",
    "1B": "단타",
    "2B": "2루타",
    "3B": "3루타",
    HR:  "홈런",
    OUT: "범타",
    E:   "실책 출루",
    DP:  "병살타",
    SF:  "희생플라이",
    SB:  "도루",
    CS:  "도루실패",
    PIT_CHANGE: "투수 교체",
    COLD_GAME: "콜드게임 종료",
  },

  toast: {
    mainReplaced: "강판됐다",
  },

  hand: {
    right: "우투우타",
    left: "좌투좌타",
    mixed: "우투좌타",
    lefty_rb: "좌투우타",
  },

  face: {
    f1: "스포츠컷",
    f2: "헬멧",
    f3: "곱슬",
    f4: "캡모자",
    f5: "안경",
    f6: "장발",
  },

  preset: {
    slugger: { label: "슬러거",       desc: "장타 극대화. 타격·웨이트 중심." },
    contact: { label: "컨택 히터",    desc: "정교한 방망이. 타격·선구안 중심." },
    speedster: { label: "호타준족",   desc: "주력 + 타격. 발 빠른 호타준족형." },
    defender: { label: "수비 명인",   desc: "수비·주루 위주. 견고한 야수." },
    fireballer: { label: "파이어볼러", desc: "구속·파워. 강속구 투수." },
    finesse: { label: "제구파 투수",  desc: "제구·변화구. 두뇌형 투수." },
    two_way: { label: "양방향 (밸런스)", desc: "투타 균형. 모든 종목을 골고루." },
    recovery: { label: "회복 우선",   desc: "체력/부상 회복 위주. 가벼운 훈련만." },
  },

  injury: {
    minor: "근육통",
    moderate: "염좌",
    severe: "인대 손상",
    detected: "{type} 부상! ({weeks}주 예상)",
    recovered: "{type} 부상이 회복됐다.",
    returned:  "{type} 부상에서 복귀했다.",
    inProgress: "부상 중 ({type}, {weeks}주)",
    restOnly: "부상 중에는 휴식만 가능합니다.",
  },

  reason: {
    injured: "부상중",
    lowStamina: "체력부족",
    noTraining: "없는 훈련",
    noSeason: "시즌없음",
    weekendPending: "주말경기대기",
    midweek: "아직주중",
    invalidAction: "잘못된행동",
  },

  log: {
    careerStart: "{school} 야구부 입단! 고교 1학년 시작.",
    graduation: "졸업 — 진로를 선택하세요",
    seasonStart: "{team} {grade}학년 시즌 시작.",
    seasonEnd: "{stage} {grade}학년 시즌 종료",
    trainingCritical: "{label} 대성공! 효과 2배",
    stageTransition: "{stage} {team} 입단!",
    retired: "야구 인생을 마감합니다.",
    promoted: "{stage} {team} 콜업!",
  },

  // 진로 선택 (career.js)
  careerPath: {
    title: "진로 선택",
    desc: "졸업합니다. 다음 단계를 선택하세요.",
    univLabel:   "대학 진학",
    univDesc:    "대학 야구로 기량을 다듬는다.",
    kboLabel:    "KBO 드래프트",
    kboDesc:     "능력치에 따라 1군 또는 2군 지명. 미지명 가능.",
    mlbLabel:    "MLB 입단",
    mlbDesc:     "오퍼가 있어야 가능.",
    mlbOffer:    "오퍼: {teams}",
    retireLabel: "은퇴",
    retireDesc:  "야구 인생을 마감한다.",
    locked:      "오퍼 없음",
    yourScore:   "종합 점수: {score}",

    mlbOfferTitle: "MLB 오퍼",
    mlbOfferDesc:  "다음 팀에서 오퍼가 왔습니다. 하나를 선택하거나 거절하세요.",
    mlbReject:     "거절 (KBO 드래프트로)",
    teamStrength:  "팀 전력: {strength}",

    draftPicked:    "{stage} 지명!",
    draftUndrafted: "드래프트 미지명 — 야구 인생을 마감합니다.",
  },

  menu: {
    continueTitle: "이어하기",
    continueHint: "이전에 저장된 게임이 있습니다.",
    continueBtn: "이어하기",
    deleteSave: "세이브 삭제",
    confirmDelete: "정말 세이브를 삭제할까요?",
    newGameTitle: "새 게임 — 캐릭터 생성",
    fieldName: "이름",
    fieldFace: "얼굴 선택",
    fieldHand: "타격/투구 손 (자세 변경)",
    fieldTalent: "재능 타입 (훈련 효율에 영향)",
    fieldTalentDist: "재능 분포 (훈련 효율 배수)",
    namePlaceholder: "예: 심용기",
    defaultName: "주인공",
    previewMeta: "{talent} · 16세 · 고교 1학년",
    startBtn: "게임 시작",
  },

  weekly: {
    scheduleTitle: "{week}주차 일정",
    yearLabel: "{year}년",
    todayChoice: "오늘의 선택 — {day}일차",
    trainingDirection: "훈련 방향 — {day}일차",
    trainingDirectionTitle: "훈련 방향",
    seasonBatter: "타자 성적",
    seasonPitcher: "투수 성적",
    statsTitle: "능력치",
    lastWeekTitle: "지난 주 경기 결과",
    standingsTitle: "리그 순위",
    seasonStatsTitle: "시즌 성적",
    seasonEndTitle: "{grade}학년 시즌 종료",
    careerHigh: "커리어 하이",
    autoModeIndicator: "현재 훈련: {label}",
    noGamesYet: "아직 경기가 없습니다",
    activeTournament: "대회: {labels}",

    finalAdvance: "{tournament} 결승 진출!",
    finalAdvanceDesc: "상대팀: {opponent}. 경기를 진행할까요?",
    btnStartFinal: "경기 시작",
    btnAcceptReward: "보너스 수령",
    finalLiveTitle: "{tournament} 결승전",
    finalChampion: "{tournament} 우승!",
    finalRunner:   "{tournament} 준우승",
    finalScore: "{my} : {opp}",
    rewardChampion: "능력치 +3 / 명성 +25",
    rewardRunner:   "멘탈 +5 / 명성 +10",
    finalLoss: "{tournament} 탈락",
    tournamentRecords: "대회 성적",
    mvpBadge: "MVP",
    mvpAwarded: "{tournament} MVP 수상!",
    noTournamentsYet: "기록 없음",
    awardsTitle: "시즌 수상",
    noAwards: "수상 없음",
    careerTotalsTitle: "통산 기록",
    careerAwardsTitle: "통산 수상",

    valGame: "경기",
    valTraining: "훈련({short})",
    valWork: "일",
    valRest: "휴식",
    valPicking: "선택중",

    btnPlay: "▶  재생",
    btnPause: "⏸  일시정지",
    btnReplay: "▶ POV 재생",

    btnAutoOpen: "자동 훈련 — 프리셋 선택",
    btnAutoClose: "자동 훈련 닫기",
    autoBannerLead: "자동 모드",
    autoBannerBody: "{label} 진행 중",
    btnChangePreset: "프리셋 변경",
    btnAutoOff: "자동 해제",
    autoPanelHint: "프리셋을 선택하면 남은 {days}일을 자동 진행합니다.",
    autoToggleOn: "{label} 자동 모드 ON",
    autoDays: "{days}일 진행",
    autoCrits: "대성공 {count}회",
    autoInjury: "부상 발생",

    weekendTitle: "주말 — 경기 진행",
    weekendDescPlain: "이번 주 평일이 모두 끝났습니다. 주말 경기를 자동 시뮬레이션합니다.",
    weekendDescAuto: "자동 모드 (<strong style=\"color:var(--accent-2)\">{label}</strong>) 활성. 경기 진행 후 다음 주 평일도 자동으로 채워집니다.<br>프리셋 변경/해제는 아래 버튼으로 가능합니다.",
    weekendBtn: "주말 경기 진행",
    weekendBtnAuto: "주말 경기 진행 + 다음 주 자동 진행",
    weekendAutoSummary: "자동 진행 {days}일",

    catBatter: "타자 훈련",
    catPitcher: "투수 훈련",
    catBatterShort: "타자",
    catPitcherShort: "투수",
    pickSub: "{cat} — 종목을 선택하세요.",
    btnRest: "휴식",
    btnRestSub: "체력 +30~40",
    staminaCost: "체력 {value}",

    infoAge: "나이",
    infoTalent: "재능",
    infoOverall: "종합",
    infoStamina: "체력",
    infoCondition: "컨디션",
    infoWeek: "주차",
    infoInjury: "부상",
    infoBatOvr: "타자 종합",
    infoPitOvr: "투수 종합",
    staminaVal: "{cur} / {max}",
    injuryVal: "{type} ({weeks}주)",
    weekVal: "{cur} / {max}",

    batterHeader: "타자 <span style=\"color:var(--accent); font-size:12px\">출장률 {pct}%</span>",
    pitcherHeader: "투수 <span style=\"color:var(--accent-2); font-size:12px\">등판률 {pct}%{rest}</span>",
    pitcherRestNote: " · 다음 경기 휴식",

    statPa: "타석",
    statH: "안타",
    statHr: "홈런",
    statK: "삼진",
    statSb: "도루",
    statHbp: "사구",
    statR: "득점",
    statRbi: "타점",
    statW: "승",
    statL: "패",
    statSv: "세이브",
    statG: "경기",
    statBa: "타율",
    statOps: "OPS",
    statPitchG: "투수 등판",
    statIp: "이닝",
    statEra: "ERA",
    statKK: "K",
    teamRecord: "팀 성적",
    teamRecordVal: "{w}승 {l}패",

    batLabel: "[타]",
    pitLabel: "[투]",
    batterRecap: "{pa}타석 {h}안타 {hr}홈런 {k}삼진",
    batterRecapExtra: "{hbp}사구 {sb}도루 {sf}희타 {dp}병살",
    pitcherRecap: "9이닝 {er}자책 {k}K {bb}BB {h}피안타",

    standingsHead: { rank: "#", team: "팀", w: "W", l: "L", t: "T", pct: "승률" },

    seasonEndGraduation: "고교 졸업! (Phase 1에서는 여기까지) Phase 3에서 드래프트/대학/프로 분기가 추가됩니다.",
    seasonEndFinalNote: "고교 3학년 시즌까지 마쳤습니다. 졸업으로 넘어갑니다.",
    btnGraduate: "졸업",
    btnNextSeason: "{grade}학년 시즌 시작",

    titleWithTeamGrade: "{name} — {team} {grade}학년",
  },
};
