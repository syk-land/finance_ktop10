export const companiesData = [
  {
    id: "samsung",
    name: "삼성전자",
    ticker: "005930",
    industry: "반도체 및 전자장비",
    marketCap: "약 418.5조 원",
    description: "글로벌 IT 및 반도체 리딩 기업으로, 메모리 반도체, 스마트폰, TV 분야 등에서 세계 시장을 선도하고 있으며 최근 AI 반도체(HBM) 및 파운드리 경쟁력 강화에 집중하고 있습니다.",
    logoText: "SEC",
    financials: [
      { year: 2023, revenue: 258.9, operatingProfit: 6.6, netProfit: 15.4, debtRatio: 26.2, roe: 4.1 },
      { year: 2024, revenue: 302.5, operatingProfit: 29.2, netProfit: 23.8, debtRatio: 28.5, roe: 7.2 },
      { year: 2025, revenue: 315.4, operatingProfit: 35.8, netProfit: 28.1, debtRatio: 29.1, roe: 8.8 }
    ],
    aiAnalysis: {
      rating: "A+",
      growth: "양호",
      financialHealth: "최우수",
      metrics: {
        stability: 95,
        profitability: 82,
        growthPotential: 88
      },
      brief: "삼성전자는 2023년 메모리 업황 둔화로 일시적인 이익 정체를 겪었으나, 2024년과 2025년에 걸쳐 고성능 메모리(HBM) 수요 폭증 및 업황 회복세에 힘입어 매출과 영업이익 모두 큰 폭으로 반등했습니다. 부채비율은 20%대를 유지하며 재무안정성은 대한민국 최상위 수준을 자랑합니다. 차세대 파운드리 미세공정 수율 확보 및 HBM의 글로벌 빅테크 공급선 다변화 성공 여부가 향후 밸류에이션 팽창의 핵심 열쇠가 될 것입니다."
    },
    news: [
      {
        title: "삼성전자, 5세대 HBM3E 글로벌 빅테크 고객사 품질 테스트 통과 본격 공급",
        source: "연합뉴스",
        time: "1시간 전",
        sentiment: "positive",
        summary: "삼성전자가 고대역폭 메모리 5세대 모델의 납품 적격 승인을 획득하여 3분기부터 대규모 출하를 시작합니다. 이는 엔비디아를 비롯한 빅테크 기업들의 AI 칩셋 병목현상을 완화하는 마일스톤입니다. 증권가에서는 이에 따른 하반기 영업이익 개선을 크게 전망하고 있습니다."
      },
      {
        title: "파운드리 2나노 공정 수율 극대화 전략 가동... 대만 TSMC 추격 고삐",
        source: "매일경제",
        time: "5시간 전",
        sentiment: "positive",
        summary: "삼성전자가 미국 연구개발 거점을 중심으로 2나노 이하 첨단 미세공정 수율 안정화 로드맵을 공개했습니다. GAA(Gate-All-Around) 3세대 공정 조기 도입으로 모바일 에이전트 AI 칩 물량을 대거 수주하겠다는 목표입니다. 장기적 성장을 위한 필수 투자로 해석됩니다."
      },
      {
        title: "스마트폰 시장 점유율 1위 방어했지만 중저가 라인업에서 중국계 거센 추격",
        source: "한국경제",
        time: "1일 전",
        sentiment: "neutral",
        summary: "갤럭시 S26 시리즈의 글로벌 흥행 성공으로 프리미엄 1위 자리를 수성했으나, 인도 및 동남아 시장 등에서 화웨이, 샤오미 등 중국 업체들의 중저가 가성비 전략에 의해 점유율 마진 압박을 받고 있습니다. 차별화된 온디바이스 AI 기능의 보급이 돌파구가 될 예정입니다."
      },
      {
        title: "글로벌 경기 둔화 우려에 따른 IT 하드웨어 수요 회복 지연 리스크 잔존",
        source: "금융신문",
        time: "2일 전",
        sentiment: "negative",
        summary: "미국 연준의 금리 변동성 및 거시경제 둔화 우려로 소비자 가전(TV, 가전제품) 부문의 수요 회복 속도가 정체되고 있습니다. 원자재 및 물류비 상승 압박과 맞물려 완제품(DX) 부문의 단기 영업마진율이 다소 위축될 위험성이 지적됩니다."
      }
    ]
  },
  {
    id: "skhynix",
    name: "SK하이닉스",
    ticker: "000660",
    industry: "반도체 및 전자장비",
    marketCap: "약 132.8조 원",
    description: "세계 2위의 메모리 반도체 제조 기업으로, 인공지능향 초고성능 메모리(HBM) 시장에서 압도적인 기술 우위를 달성하며 AI 인프라 붐의 최대 수혜주로 평가받고 있습니다.",
    logoText: "SKH",
    financials: [
      { year: 2023, revenue: 32.8, operatingProfit: -7.7, netProfit: -9.1, debtRatio: 87.4, roe: -16.2 },
      { year: 2024, revenue: 58.4, operatingProfit: 16.2, netProfit: 12.5, debtRatio: 65.2, roe: 21.5 },
      { year: 2025, revenue: 68.2, operatingProfit: 21.4, netProfit: 17.8, debtRatio: 52.1, roe: 24.1 }
    ],
    aiAnalysis: {
      rating: "A",
      growth: "최우수",
      financialHealth: "양호",
      metrics: {
        stability: 78,
        profitability: 92,
        growthPotential: 96
      },
      brief: "SK하이닉스는 2023년 대규모 적자 충격에서 완전히 벗어나, HBM3 및 HBM3E 독점적 선점 효과를 기반으로 역사적인 수익성 반등을 기록했습니다. 2024~2025년 영업이익률은 30%에 근접하며 업계 최고 수준을 마크했습니다. 설비투자 집행에 따른 차입금 관리가 이슈였으나 이익 누적으로 부채비율은 52%선까지 개선되었습니다. AI GPU 제조사들과의 전략적 얼라이언스 강화가 지속적인 경쟁 우위의 핵심 동력입니다."
    },
    news: [
      {
        title: "SK하이닉스, 차세대 HBM4 12단 제품 내년 상반기 양산 발표 '리더십 굳히기'",
        source: "한국경제",
        time: "2시간 전",
        sentiment: "positive",
        summary: "SK하이닉스가 6세대 HBM인 HBM4 12단 제품의 양산 일정을 당초 계획보다 조율하여 내년 초로 앞당깁니다. 어드밴스드 MR-MUF 공정 고도화를 적용하여 압도적인 방열 및 대역폭 성능을 입증하며 시장 독점 지배력을 한층 더 견고히 하겠다는 복안입니다."
      },
      {
        title: "용인 반도체 클러스터 1기 팹 착공 가동... 중장기 생산량 2배 확대 기반 구축",
        source: "동아일보",
        time: "8시간 전",
        sentiment: "positive",
        summary: "용인 클러스터의 부지 조성과 1라인 팹 건설이 차질 없이 진행되며 대량 양산 기반을 선제적으로 다지고 있습니다. 이를 통해 향후 급증하는 고성능 메모리와 eSSD 수요에 맞춰 탄력적인 CAPA 운영이 가능해질 예정입니다."
      },
      {
        title: "미국 바이든 행정부 인디애나 첨단 패키징 공장 보조금 지원 심사 최종 단계 돌입",
        source: "서울경제",
        time: "18시간 전",
        sentiment: "positive",
        summary: "미국 인디애나주에 예정된 40억 달러 규모의 차세대 첨단 패키징 R&D 및 제조 기지에 대한 미 러스트벨트 보조금 지급 협상이 가속화되고 있습니다. 미국 현지 생성형 AI 고객사와의 긴밀한 밀착 대응력 및 공급 안정성이 향상될 것으로 평가됩니다."
      },
      {
        title: "메모리 편중 구조에 따른 낸드(NAND) 부문의 가변적 수익성 및 가격 변동성 우려",
        source: "비즈인포",
        time: "3일 전",
        sentiment: "negative",
        summary: "D램 부문의 독보적인 고마진 성과와 대조적으로, 일반 소비자용 낸드 플래시 및 솔리드스테이트드라이브(SSD) 부문의 단가 회복세가 완만하여 마진 확보 속도가 더딘 점이 부담 요인입니다. 낸드 부문의 재고 조정 가속화 노력이 요구됩니다."
      }
    ]
  },
  {
    id: "hyundai",
    name: "현대자동차",
    ticker: "005380",
    industry: "자동차 제조",
    marketCap: "약 57.6조 원",
    description: "글로벌 완성차 판매 Top 3 브랜드로, 제네시스 등 고부가가치 차량과 전기차(EV), 하이브리드(HEV) 등 유연한 파워트레인 전략으로 사상 최대 실적을 달성 중입니다.",
    logoText: "HYU",
    financials: [
      { year: 2023, revenue: 162.7, operatingProfit: 15.1, netProfit: 12.3, debtRatio: 58.4, roe: 14.8 },
      { year: 2024, revenue: 171.2, operatingProfit: 16.5, netProfit: 13.9, debtRatio: 56.1, roe: 15.2 },
      { year: 2025, revenue: 178.6, operatingProfit: 17.8, netProfit: 14.6, debtRatio: 53.8, roe: 14.5 }
    ],
    aiAnalysis: {
      rating: "A+",
      growth: "안정적",
      financialHealth: "최우수",
      metrics: {
        stability: 92,
        profitability: 89,
        growthPotential: 84
      },
      brief: "현대자동차는 전기차 캐즘(대중화 전 일시적 수요 정체) 국면 속에서 뛰어난 상품성의 하이브리드 라인업을 앞세워 믹스 개선과 글로벌 판매 증가세를 이어나갔습니다. 미국 및 유럽 시장 내 고마진 SUV와 제네시스 판매 비중 확대로 10%에 달하는 고정 영업이익률을 달성했으며, 주주환원율(밸류업 프로그램) 확대 및 조지아 메타플랜트 공장 본격 양산 가시화가 핵심 모멘텀입니다."
    },
    news: [
      {
        title: "하이브리드(HEV) 판매 급증에 힘입어 분기 영업이익 역대 최고치 경신 예고",
        source: "머니투데이",
        time: "30분 전",
        sentiment: "positive",
        summary: "현대차의 자체 개발 2세대 하이브리드 시스템이 탑재된 산타페와 투싼이 북미 시장을 휩쓸며, 전기차 일시적 정체기를 완벽히 방어하고 있습니다. 대당 마진이 내연기관을 웃돌아 이익 가이던스 상향 가능성이 대두됩니다."
      },
      {
        title: "미국 조지아 HMGMA(메타플랜트) 가동률 80% 달성... 미국 현지 현지 생산 관세 해소",
        source: "조선일보",
        time: "4시간 전",
        sentiment: "positive",
        summary: "조지아주 전기차/하이브리드 신공장이 조기 안정화 단계에 접어들어 생산 능력을 빠르게 올리고 있습니다. 인플레이션감축법(IRA)에 대응하는 세제 혜택과 동시에 생산 최적화를 통한 코스트 절감 효과를 동시에 노립니다."
      },
      {
        title: "인도법인(HMI) 현지 증시 IPO 대흥행... 30억 달러 투자 재원 확보로 신흥시장 정조준",
        source: "파이낸셜뉴스",
        time: "1일 전",
        sentiment: "positive",
        summary: "현대차 인도법인의 성공적인 기업공개로 대규모 투자자금을 현지에서 성공적으로 조달했습니다. 이 자금은 인도 현지 전기차 공장 신설 및 동남아, 중동 아시아 거점 수출 기지화 투자에 전액 투입될 것으로 보입니다."
      },
      {
        title: "트럼프 2기 출범 시 미국 완성차 관세 인상 및 무역 장벽 리스크 대비 태세 강화",
        source: "글로벌비즈",
        time: "3일 전",
        sentiment: "negative",
        summary: "미국 통상 규제 정책 변화 가능성에 따라 한국 공장에서의 수출 물량 관세 리스크가 핵심 리스크로 거론됩니다. 사측은 이에 대응하여 현지 알라바마 및 조지아 공장의 내연기관/전기차 유연 혼류 생산 체계를 다각도로 구축 중입니다."
      }
    ]
  },
  {
    id: "samsungbiologics",
    name: "삼성바이오로직스",
    ticker: "207940",
    industry: "바이오 및 제약",
    marketCap: "약 68.2조 원",
    description: "세계 최대 규모의 바이오의약품 위탁개발생산(CDMO) 기업으로, 압도적인 생산 능력(CAPA)과 글로벌 규제 기관 승인 역량으로 초대형 제약사들과의 장기 계약을 지속 확보하고 있습니다.",
    logoText: "SBL",
    financials: [
      { year: 2023, revenue: 3.7, operatingProfit: 1.1, netProfit: 0.9, debtRatio: 59.1, roe: 9.7 },
      { year: 2024, revenue: 4.4, operatingProfit: 1.3, netProfit: 1.1, debtRatio: 52.8, roe: 10.5 },
      { year: 2025, revenue: 5.1, operatingProfit: 1.6, netProfit: 1.3, debtRatio: 47.5, roe: 11.2 }
    ],
    aiAnalysis: {
      rating: "A",
      growth: "고성장",
      financialHealth: "최우수",
      metrics: {
        stability: 91,
        profitability: 85,
        growthPotential: 90
      },
      brief: "삼성바이오로직스는 글로벌 생물보안법(Biosecure Act) 입법화로 인한 미국/유럽 내 중국 CDMO 기피 현상의 수혜를 고스란히 입고 있습니다. 1~4공장 풀 가동과 함께 5공장의 조기 완공 로드맵이 가동되고 있으며, 화이자와 로슈 등 20대 글로벌 제약사 중 16곳 이상을 장기 파트너로 유치하였습니다. 영업이익률 30% 이상의 초고마진 구조가 탄탄한 밸류에이션의 원천입니다."
    },
    news: [
      {
        title: "미국 생물보안법 통과 수혜 본격화... 하반기 글로벌 제약사 신규 대형 수주 러시",
        source: "매일경제",
        time: "3시간 전",
        sentiment: "positive",
        summary: "미 의회가 통과시킨 생물보안법의 영향으로 글로벌 빅파마들이 중국 우시바이오 등에서 이탈해 삼바와 접촉하고 있습니다. 이미 연간 누적 수주액은 3.5조 원을 상회하며 역대 최대 실적을 가뿐히 넘어설 전망입니다."
      },
      {
        title: "송도 5공장 내년 4월 가동 본격 선언... 세계 1위 CDMO 생산 격차 대폭 확대",
        source: "인천일보",
        time: "7시간 전",
        sentiment: "positive",
        summary: "삼성바이오로직스가 건설 중인 5공장의 완공 시점을 예정을 앞당겨 선언했습니다. 5공장이 완공되면 당사의 총 생산능력은 78만 4,000리터로 전 세계 압도적 1위 자리를 수년 이상 격차로 벌리며 경쟁사를 초토화할 수 있습니다."
      },
      {
        title: "항체약물접합체(ADC) 전용 생산 공장 준수 검사 완료... 차세대 모달리티 포트폴리오 가동",
        source: "바이오타임즈",
        time: "1일 전",
        sentiment: "positive",
        summary: "기존 항체의약품 생산을 넘어 암세포만 정밀 타격하는 차세대 ADC 신약 위탁 생산 시설 승인을 획득했습니다. 신규 암 치료제 위탁 생산 선제 주문 수주를 도모하며 미래 먹거리 확장에 박차를 가하고 있습니다."
      },
      {
        title: "바이오시밀러(에피스) 미국 내 특허 합의 소송비용 증가로 단기 판관비 상승 부담",
        source: "경제뉴스",
        time: "4일 전",
        sentiment: "negative",
        summary: "자회사 삼성바이오에피스의 자가면역질환 바이오시밀러 미국 조기 진출을 위한 오리지널 제약사와의 특허 소송 및 합의비용이 일시적으로 발생했습니다. 이로 인해 분기 판매관리비가 일부 상승하여 마진율이 소폭 제한되었습니다."
      }
    ]
  },
  {
    id: "kia",
    name: "기아",
    ticker: "000270",
    industry: "자동차 제조",
    marketCap: "약 48.9조 원",
    description: "혁신적인 디자인과 글로벌 시장을 주도하는 SUV(스포티지, 텔루라이드), 전기차(EV3, EV9) 경쟁력을 기반으로 현대차그룹 영업이익률 극대화에 기여하고 있습니다.",
    logoText: "KIA",
    financials: [
      { year: 2023, revenue: 99.8, operatingProfit: 11.6, netProfit: 8.8, debtRatio: 46.5, roe: 18.2 },
      { year: 2024, revenue: 104.5, operatingProfit: 12.1, netProfit: 9.3, debtRatio: 43.1, roe: 17.5 },
      { year: 2025, revenue: 109.2, operatingProfit: 13.0, netProfit: 10.1, debtRatio: 39.8, roe: 17.1 }
    ],
    aiAnalysis: {
      rating: "A+",
      growth: "안정적",
      financialHealth: "최우수",
      metrics: {
        stability: 94,
        profitability: 91,
        growthPotential: 81
      },
      brief: "기아는 영업이익률 11~12%를 넘나들며 글로벌 완성차 제조사 중 도요타 등과 함께 최상위 이익률 그룹에 랭크되어 있습니다. 고마진 대형 RV 중심의 믹스 개선 및 하이브리드 파워트레인의 북미 전역 히트가 주효했습니다. 자사주 전량 소각 등 주주 가치 극대화 정책을 적극 펼쳐 주식 시장에서의 저평가 매력을 해소하는 대표적인 밸류업 수혜주입니다."
    },
    news: [
      {
        title: "기아, 보급형 컴팩트 SUV 'EV3' 유럽 출시하자마자 올해의 차 최종 후보 노미네이트",
        source: "오토헤럴드",
        time: "2시간 전",
        sentiment: "positive",
        summary: "기아가 내놓은 대중화 타겟 소형 전기차 EV3가 가격경쟁력과 뛰어난 주행거리 편의성을 바탕으로 유럽 전역에서 품귀 현상을 빚고 있습니다. 캐즘 우려를 소형화 대중성으로 타개하는 전략이 성공적이라는 평가입니다."
      },
      {
        title: "올해 자사주 5천억 규모 매입 및 100% 전량 소각 선언... 적극적 주주환원 주가 폭등",
        source: "한국금융",
        time: "6시간 전",
        sentiment: "positive",
        summary: "기아가 실주주 가치 제고를 위해 자사주 매입 후 즉시 소각 계획을 발표했습니다. 배당성향 30%선 준수 약속과 맞물려 주주환원 강도가 완성차 제조사 중 최고 수준으로 강화되었습니다."
      },
      {
        title: "북미 시장 텔루라이드 및 쏘렌토 RV 라인업 품귀 현상... 미국 딜러 인센티브 역대 최저",
        source: "서울와이어",
        time: "20시간 전",
        sentiment: "positive",
        summary: "북미 딜러들에게 지급되던 인센티브(할인 비용)가 사상 최저치로 관리되며 견고한 제값 받기 판매가 실현되고 있습니다. 대형 SUV와 패밀리카 인기가 견조하여 내년까지 안정적 이익 흐름이 예견됩니다."
      },
      {
        title: "글로벌 고금리 장기화에 따른 모빌리티 리스 및 할부 금융 금리 상승으로 수요 이탈 가능성",
        source: "데일리금융",
        time: "2일 전",
        sentiment: "negative",
        summary: "글로벌 고금리 여파가 리스 할부 시장금리에 전가되면서 일반 실수요자들의 할부 구매 월 부담액이 증가하고 있습니다. 이로 인해 잠재적 신규 계약 유보자들이 늘어날 수 있다는 보수적 관측이 고개를 들고 있습니다."
      }
    ]
  },
  {
    id: "celltrion",
    name: "셀트리온",
    ticker: "068270",
    industry: "바이오 및 제약",
    marketCap: "약 36.4조 원",
    description: "세계 최초로 항체 바이오시밀러(램시마 등) 개발에 성공한 종합 바이오제약 기업으로, 셀트리온헬스케어 합병 완료 이후 통합 법인으로서 글로벌 유통 시너지를 극대화하고 있습니다.",
    logoText: "CEL",
    financials: [
      { year: 2023, revenue: 2.1, operatingProfit: 0.6, netProfit: 0.5, debtRatio: 38.2, roe: 7.8 },
      { year: 2024, revenue: 3.5, operatingProfit: 0.7, netProfit: 0.6, debtRatio: 35.4, roe: 6.2 },
      { year: 2025, revenue: 4.1, operatingProfit: 1.1, netProfit: 0.9, debtRatio: 32.1, roe: 8.5 }
    ],
    aiAnalysis: {
      rating: "B+",
      growth: "양호",
      financialHealth: "최우수",
      metrics: {
        stability: 90,
        profitability: 74,
        growthPotential: 83
      },
      brief: "셀트리온은 바이오시밀러 양대 법인 합병에 따른 회계적 일시적 무형자산 상각 및 재고 원가율 이슈가 2024년을 기점으로 순차적으로 해소되며, 2025년에 영업이익 정상화 궤도에 복귀했습니다. 특히 자가면역질환 치료제 '짐펜트라(램시마SC)'가 미국 신약 지위 승인 후 초대형 처방약급여관리업체(PBM) 등재에 연속 성공하여 처방량이 폭증한 것이 실적 성장을 본격 견인하고 있습니다."
    },
    news: [
      {
        title: "피하주사제형 신약 '짐펜트라' 미국 대형 PBM 처방집 전면 추가 완료... 대박 시동",
        source: "연합뉴스",
        time: "40분 전",
        sentiment: "positive",
        summary: "셀트리온의 짐펜트라가 미국 처방 시장의 80%를 지배하는 주요 PBM사들의 처방 리스트에 등재 완료되었습니다. 환자 직접 투약 편의성을 무기로 타겟 자가면역 질환 시장 점유율 10% 이상 조기 달성이 무난할 것으로 예상됩니다."
      },
      {
        title: "램시마·유플라이마 등 핵심 품목 유럽 시장 점유율 50% 육반... 안정적 현금 창출",
        source: "데일리팜",
        time: "5시간 전",
        sentiment: "positive",
        summary: "자가면역질환 치료 시밀러 라인업이 유럽 주요 대형 입찰에서 승리하며 과반에 달하는 시장 지배력을 수성하고 있습니다. 든든한 현금 흐름을 토대로 차세대 신약 파이프라인(임상 3상) 연구개발에 집중적인 재투자가 이뤄지는 선순환 구조입니다."
      },
      {
        title: "자가면역질환 스텔라라 시밀러 'CT-P43' 글로벌 품목 승인 신청 획득 개시",
        source: "약업신문",
        time: "1일 전",
        sentiment: "positive",
        summary: "셀트리온이 개발한 인터루킨 억제제 시밀러의 글로벌 시판 승인이 임박했습니다. 타겟 시장 규모가 크고 오리지널 특허 만료 시점에 맞춰 즉시 출격이 대기되어 있어, 2026년부터 강력한 추가 실적 파이프로 자리매김할 예정입니다."
      },
      {
        title: "합병 과정에서 인식된 영업권 및 무형자산 매각 손실 회계 처리로 당기순이익 일시 하락",
        source: "증권가찌라시",
        time: "3일 전",
        sentiment: "negative",
        summary: "과거 양 사 합병 과정에서 승계된 일부 장부상 영업권 및 판매 판권 무형자산에 대한 보수적 손상 검사 손실이 반영되었습니다. 비현금성 지출이지만 일시적으로 당기 순이익 지표가 위축되게 보이는 착시 효과가 발생했습니다."
      }
    ]
  },
  {
    id: "kbfg",
    name: "KB금융지주",
    ticker: "105560",
    industry: "금융업 및 은행",
    marketCap: "약 32.5조 원",
    description: "대한민국 최대 규모의 금융 그룹으로, 다각화된 포트폴리오(은행, 증권, 카드, 손해보험)를 기반으로 고금리 장기화에 따른 이자이익과 수수료이익의 안정적 균형을 유지하고 있습니다.",
    logoText: "KBF",
    financials: [
      { year: 2023, revenue: 76.5, operatingProfit: 6.2, netProfit: 4.6, debtRatio: 850.4, roe: 9.1 },
      { year: 2024, revenue: 81.2, operatingProfit: 6.5, netProfit: 4.9, debtRatio: 880.2, roe: 9.5 },
      { year: 2025, revenue: 84.6, operatingProfit: 6.9, netProfit: 5.2, debtRatio: 875.1, roe: 9.8 }
    ],
    aiAnalysis: {
      rating: "A",
      growth: "안정적",
      financialHealth: "최우수",
      metrics: {
        stability: 98,
        profitability: 78,
        growthPotential: 72
      },
      brief: "KB금융은 전통 금융사 특성상 레버리지가 높아 부채비율은 800%대에 이르나, BIS 자기자본비율 및 연체율 통제 수준은 최고 수준으로 탄탄합니다. 견조한 NIM(순이자마진) 유지와 비은행 계열사의 실적 호조가 방어벽 역할을 담당합니다. 또한 밸류업 공시 가이드라인에 부합하는 적극적 분기 배당 확대, 주주환원 강화를 실천하며 코리아 디스카운트 해소에 앞장서고 있습니다."
    },
    news: [
      {
        title: "은행권 밸류업 1위 선언... 보통주자본비율(CET1) 연계한 총주주환원율 40% 도달 목표",
        source: "금융일보",
        time: "1시간 전",
        sentiment: "positive",
        summary: "KB금융이 선제적인 자본관리 체계를 도입해 보통주자본비율이 13%를 초과하는 잉여 자본을 전액 주주환원에 투입하는 파격적 정책을 발표했습니다. 배당 예측 가능성이 높아지며 외국인 매수세가 집중되고 있습니다."
      },
      {
        title: "비은행 부문(증권 및 손보) 호실적 이어지며 역대급 포트폴리오 다각화 완성 입증",
        source: "매일경제",
        time: "4시간 전",
        sentiment: "positive",
        summary: "은행 부문의 대출 성장률이 정책 가계대출 억제책으로 다소 정체된 반면, KB증권의 주식 수수료 수입 증가와 KB손해보험의 보험손익 성장 덕에 전체 그룹 실적은 오히려 성장세를 이어갔습니다."
      },
      {
        title: "홍콩 ELS 손실 보상 및 충당금 적립 리스크 완전 털어냈다... 잠재 불확실성 제거",
        source: "연합인포맥스",
        time: "20시간 전",
        sentiment: "positive",
        summary: "상반기 실적을 억누르던 홍콩 H지수 ELS 판매 보상 충당금 적립 절차가 100% 최종 완료되었습니다. 추가 비용 리스크 소멸로 향후 하반기부터 순수 이익 증가분이 오롯이 재무제표에 반영됩니다."
      },
      {
        title: "정부 및 금융당국의 가계부채 억제를 위한 주택담보대출 규제 압박으로 성장 정체 우려",
        source: "중앙일보",
        time: "2일 전",
        sentiment: "negative",
        summary: "스트레스 DSR 규제 단계적 강화와 함께 가계부채 급증 억제를 위한 금융당국의 가산금리 인상 압박이 이어지고 있어 핵심 수익원인 여신 포트폴리오의 볼륨 증가 속도가 당분간 억제될 공산이 큽니다."
      }
    ]
  },
  {
    id: "posco",
    name: "POSCO홀딩스",
    ticker: "005490",
    industry: "지주회사 및 철강/이차전지",
    marketCap: "약 30.1조 원",
    description: "철강(포스코) 산업을 근간으로 친환경 철강 기술 전환을 선도하는 동시에 리튬, 니켈 등 이차전지 풀 밸류체인을 소유한 이차전지 소재 공급 핵심 그룹입니다.",
    logoText: "POS",
    financials: [
      { year: 2023, revenue: 77.1, operatingProfit: 3.5, netProfit: 1.8, debtRatio: 72.5, roe: 3.2 },
      { year: 2024, revenue: 79.8, operatingProfit: 4.1, netProfit: 2.3, debtRatio: 68.4, roe: 4.1 },
      { year: 2025, revenue: 82.5, operatingProfit: 4.9, netProfit: 3.1, debtRatio: 65.1, roe: 5.5 }
    ],
    aiAnalysis: {
      rating: "B",
      growth: "정체 후 회복",
      financialHealth: "양호",
      metrics: {
        stability: 87,
        profitability: 60,
        growthPotential: 86
      },
      brief: "POSCO홀딩스는 중국발 글로벌 철강 공급 과잉에 따른 시황 약세와 전기차용 이차전지 시장 캐즘 영향이 겹쳐 실적이 다소 정체기를 겪었습니다. 그러나 아르헨티나 리튬 염호 상업화 및 필바라 리튬 광산 지분 활용 등으로 리튬 가격이 바닥을 치는 2025년을 기점으로 친환경 소재 부문의 매출 기여가 가시화되고 있습니다. 저평가된 PBR 매력과 원자재 시황의 순환 사이클 진입이 기대 요인입니다."
    },
    news: [
      {
        title: "아르헨티나 '옴브레 무에르토' 염호 1단계 수산화리튬 본격 양산 돌입... 매출 인식 시작",
        source: "헤럴드경제",
        time: "3시간 전",
        sentiment: "positive",
        summary: "POSCO홀딩스가 자체 소유한 아르헨티나 리튬 염호에서 이차전지용 고순도 수산화리튬의 상업 생산이 성공적으로 개시되었습니다. 해외 리튬 공급 원재료 내재화가 본격 매출과 수익성 증대로 결실을 맺는 첫 단추입니다."
      },
      {
        title: "수소환원제철 '하이렉스(HyREX)' 시험 공장 완공... 친환경 그린스틸 글로벌 연대 추진",
        source: "철강신문",
        time: "6시간 전",
        sentiment: "positive",
        summary: "탄소 배출을 획기적으로 줄이는 수소환원제철 실증 플랜트가 준공되었습니다. 탄소 국경세 도입을 예고한 유럽 시장으로의 수출 규제를 돌파하는 미래 친환경 메탈 테크놀로지 리더십 확보의 기반입니다."
      },
      {
        title: "유럽 완성차 기업 이차전지 양극재 추가 공급 계약 합의... 장기 계약 안전성 제고",
        source: "파이낸셜뉴스",
        time: "1일 전",
        sentiment: "positive",
        summary: "포스코퓨처엠 등 계열사를 주축으로 글로벌 완성차 OEM과의 친환경 배터리용 핵심 소재 대량 납품 계약이 타결되었습니다. 이를 통해 단기 캐즘 극복 및 장기 가동률 안정성이 한층 보강될 것으로 기대됩니다."
      },
      {
        title: "중국발 저가 철강재 무차별 덤핑 수출 지속에 따른 열연 및 후판 스프레드 축소 압박",
        source: "조선비즈",
        time: "4일 전",
        sentiment: "negative",
        summary: "중국 내수 경기 침체로 갈 곳 잃은 중국산 덤핑 강재가 대량 유입되면서 국산 철강재의 가격 인상 억제 압력으로 연결되고 있습니다. 이에 따른 제철 부문의 제품 스프레드 축소로 분기 마진율 방어가 녹록지 않은 실정입니다."
      }
    ]
  },
  {
    id: "naver",
    name: "NAVER",
    ticker: "035420",
    industry: "인터넷 서비스",
    marketCap: "약 28.5조 원",
    description: "국내 1위 포털 사이트 검색엔진 플랫폼으로, 검색 광고 외에 커머스(네이버 쇼핑), 핀테크(네이버페이), 웹툰, 그리고 독자적인 생성형 AI(하이퍼클로바X) 클라우드 비즈니스를 전개합니다.",
    logoText: "NAV",
    financials: [
      { year: 2023, revenue: 9.6, operatingProfit: 1.48, netProfit: 0.98, debtRatio: 42.1, roe: 8.2 },
      { year: 2024, revenue: 10.5, operatingProfit: 1.76, netProfit: 1.25, debtRatio: 39.5, roe: 9.8 },
      { year: 2025, revenue: 11.2, operatingProfit: 1.95, netProfit: 1.42, debtRatio: 37.8, roe: 10.4 }
    ],
    aiAnalysis: {
      rating: "A",
      growth: "양호",
      financialHealth: "최우수",
      metrics: {
        stability: 95,
        profitability: 80,
        growthPotential: 82
      },
      brief: "네이버는 커머스 수수료 개편 및 타겟 광고 알고리즘 고도화에 힘입어 불황 속에서도 매출 10조 원 시대를 견고히 다졌습니다. 비용 효율화 기조를 통해 10%대 중후반의 견고한 영업이익률을 회복하였으며, 자체 생성형 AI인 하이퍼클로바X를 공공 및 기업용(B2B) 클라우드 보안 환경에 이식하는 B2B 솔루션 부문이 신성장 동력으로 작용 중입니다."
    },
    news: [
      {
        title: "B2B 특화 '하이퍼클로바X' 엔터프라이즈 전용 보안 클라우드 금융권 대거 수주",
        source: "IT데일리",
        time: "2시간 전",
        sentiment: "positive",
        summary: "네이버가 주도하는 국산 거대언어모델(LLM)이 데이터 유출에 극히 민감한 시중 은행 및 공공기관의 B2B 사내 시스템에 온프레미스 방식으로 성공적으로 안착하고 있습니다. 해외 거대 빅테크 모델 대비 한글 특화 및 주권 AI 강점이 주효했습니다."
      },
      {
        title: "네이버플러스 멤버십 제휴 확장 효과... 쇼핑 거래액 및 유료 구독 유치 수 극대화",
        source: "한국경제",
        time: "5시간 전",
        sentiment: "positive",
        summary: "멤버십 혜택 다양화(배달 앱 무료 연계 및 타사 서비스 결합)로 이탈 없는 충성 고객 락인(Lock-in)에 성공했습니다. 이와 연동되어 네이버페이 거래액 및 스마트스토어 입점 판매자의 광고 집행 매출이 동반 우상향 흐름입니다."
      },
      {
        title: "글로벌 웹툰 엔터테인먼트(미국 증시 상장) 흑자 전환 본격 안착으로 글로벌 콘텐츠 영향력 입증",
        source: "매일경제",
        time: "1일 전",
        sentiment: "positive",
        summary: "미국 나스닥에 상장한 네이버웹툰 지주사가 3개 분기 연속 흑자를 달성하며 상장 초기 비용 리스크를 해소했습니다. 글로벌 영상 IP(지식재산권) 제작과의 결합 성과로 2차 저작권 로열티 수익이 누적 확대되고 있습니다."
      },
      {
        title: "인스타그램 및 유튜브 쇼핑 등 글로벌 SNS 플랫폼의 커머스 영역 잠식 속도 가속화 우려",
        source: "디지털투데이",
        time: "3일 전",
        sentiment: "negative",
        summary: "국내 온라인 쇼핑 채널 다양화 및 유튜브 등 동영상 플랫폼의 쇼핑 기능 직접 연동으로 인해 국내 1위 온라인 커머스 플랫폼인 네이버 쇼핑 부문의 트래픽과 신규 유저 유입 성장세가 다소 둔화되는 조짐이 감지되어 대응책이 요구됩니다."
      }
    ]
  },
  {
    id: "lgchem",
    name: "LG화학",
    ticker: "051910",
    industry: "화학 및 이차전지 소재",
    marketCap: "약 26.2조 원",
    description: "석유화학 분야의 기초소재 사업을 중심으로 친환경 생분해 소재 및 양극재 등 첨단 이차전지 소재 부문으로 비즈니스를 대대적으로 재편하고 있는 글로벌 대표 화학 기업입니다.",
    logoText: "LGC",
    financials: [
      { year: 2023, revenue: 55.2, operatingProfit: 2.5, netProfit: 1.6, debtRatio: 82.1, roe: 4.8 },
      { year: 2024, revenue: 53.8, operatingProfit: 2.2, netProfit: 1.3, debtRatio: 85.4, roe: 3.5 },
      { year: 2025, revenue: 57.5, operatingProfit: 2.9, netProfit: 1.9, debtRatio: 81.2, roe: 4.9 }
    ],
    aiAnalysis: {
      rating: "B",
      growth: "정체 후 회복",
      financialHealth: "양호",
      metrics: {
        stability: 84,
        profitability: 62,
        growthPotential: 88
      },
      brief: "LG화학은 한동안 에틸렌 등 범용 석유화학 제품의 중국 자급률 상승에 따른 업황 침체와 자회사 LG에너지솔루션의 배터리 셀 캐즘 영향이 중첩되며 실적 보릿고개를 넘었습니다. 그러나 고부가가치 스페셜티 화학 제품(POE 등) 비중 다변화와 함께 청주/미국 양극재 공장 신설 및 가동 본격화로 첨단소재 부문 수익 비중이 전체 이익 성장의 마중물이 되고 있습니다."
    },
    news: [
      {
        title: "미국 테네시 양극재 공장 시험 양산 성공 개시... 북미 공급망 핵심 전초기지 완성",
        source: "연합뉴스",
        time: "3시간 전",
        sentiment: "positive",
        summary: "LG화학이 미국 최대 규모로 조성 중인 테네시주 양극재 공장이 성공적으로 초도 가동을 완료해 시운전 계약 물량 생산에 착수했습니다. IRA 세액 공제 확보 및 미국 완성차 3사로의 조기 납품 대응력을 극대화하는 성과입니다."
      },
      {
        title: "친환경 생분해 플라스틱(PBAT) 글로벌 포장재 제조 기업과 대규모 독점 장기 공급 계약 체결",
        source: "화학일보",
        time: "8시간 전",
        sentiment: "positive",
        summary: "탄소 배출 저감 트렌드에 힘입어 독자 기술로 개발된 옥수수 기반 생분해 친환경 수지(PBAT) 공급 물량이 전부 완판되며 고마진 스페셜티 화학 부문의 매출 기여도가 본격적으로 증대되고 있습니다."
      },
      {
        title: "미래 항암 신약 파이프라인(임상 2상) 글로벌 임상 가속화 투자 및 혁신 신약 비전 제시",
        source: "메디컬타임즈",
        time: "1일 전",
        sentiment: "positive",
        summary: "생명과학본부의 아베오(AVEO) 제약사 인수 합병 이후, 신장암 신약의 적응증 확대 글로벌 임상이 속도를 내고 있습니다. 화학 및 이차전지에 이어 혁신 신약을 제3의 성장 동력으로 육성하는 성과가 차츰 두각을 나타냅니다."
      },
      {
        title: "석유화학 한계 기업 및 범용 제품 라인 매각/구조조정 지연으로 석화 부문 고정비 부담 지속",
        source: "서울경제",
        time: "3일 전",
        sentiment: "negative",
        summary: "중국발 공급 과잉에 시달리는 범용 납사분해시설(NCC) 부문 지분 매각 및 구조조정 작업이 해외 원자재 바이어들과의 이견으로 협상이 공전되고 있습니다. 이에 따른 기존 범용 라인의 비효율적 운영과 고정비 부담이 석유화학 부문 마진 반등의 발목을 잡고 있습니다."
      }
    ]
  }
];
