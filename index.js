/* -------------------------------------------------------------
 * 🧬 PROJECT 2100 - 포레저 스타일 통합 엔진 스크립트 (Forager Retro Engine)
 * ------------------------------------------------------------- */

// 1. 14개 지역별 6종 적 유닛 (총 84종) 몬스터 데이터베이스
const MONSTERS_DATABASE = {
  1: [
    { name: "눈보라 좀비 늑대", type: "normal", hp: 120, def: 8, atk: 15, img: "assets/monsters/m_1_1.png" },
    { name: "핵겨울 서리 슬라임", type: "normal", hp: 100, def: 12, atk: 12, img: "assets/monsters/m_1_2.png" },
    { name: "방사능 침식 노루", type: "normal", hp: 140, def: 5, atk: 18, img: "assets/monsters/m_1_3.png" },
    { name: "설산 돌가루 원혼", type: "normal", hp: 110, def: 15, atk: 14, img: "assets/monsters/m_1_4.png" },
    { name: "서리이빨 카이드 우두머리", type: "named", hp: 280, def: 20, atk: 28, img: "assets/monsters/m_1_named.png" },
    { name: "설원 폭군 카이드 키메라", type: "boss", hp: 550, def: 35, atk: 45, img: "assets/monsters/m_1_boss.png" }
  ],
  2: [
    { name: "냉각수 오염 돌연변이", type: "normal", hp: 160, def: 10, atk: 18, img: "assets/monsters/m_2_1.png" },
    { name: "원전 방출 슬러지", type: "normal", hp: 130, def: 8, atk: 22, img: "assets/monsters/m_2_2.png" },
    { name: "납차폐복 입은 구울", type: "normal", hp: 180, def: 15, atk: 16, img: "assets/monsters/m_2_3.png" },
    { name: "멜트다운 오염 서생원", type: "normal", hp: 110, def: 5, atk: 25, img: "assets/monsters/m_2_4.png" },
    { name: "노심 경비 좀비 대장", type: "named", hp: 320, def: 25, atk: 35, img: "assets/monsters/m_2_named.png" },
    { name: "임계초과 노심 융합체", type: "boss", hp: 650, def: 40, atk: 55, img: "assets/monsters/m_2_boss.png" }
  ],
  3: [
    { name: "오작동 나노 스파이더", type: "normal", hp: 140, def: 12, atk: 20, img: "assets/monsters/m_3_1.png" },
    { name: "버려진 순찰 드론", type: "normal", hp: 120, def: 18, atk: 18, img: "assets/monsters/m_3_2.png" },
    { name: "해킹된 보안 터렛", type: "normal", hp: 150, def: 22, atk: 24, img: "assets/monsters/m_3_3.png" },
    { name: "데이터 파편 유령", type: "normal", hp: 100, def: 5, atk: 30, img: "assets/monsters/m_3_4.png" },
    { name: "글리치 마스터 닌자", type: "named", hp: 300, def: 18, atk: 45, img: "assets/monsters/m_3_named.png" },
    { name: "메가시티 중앙 AI '제논'", type: "boss", hp: 700, def: 45, atk: 60, img: "assets/monsters/m_3_boss.png" }
  ],
  4: [
    { name: "낙진 오염 가고일", type: "normal", hp: 180, def: 20, atk: 22, img: "assets/monsters/m_4_1.png" },
    { name: "방사성 어둠 박쥐", type: "normal", hp: 110, def: 6, atk: 28, img: "assets/monsters/m_4_2.png" },
    { name: "오염된 혈액 점토체", type: "normal", hp: 200, def: 5, atk: 18, img: "assets/monsters/m_4_3.png" },
    { name: "핏빛 나노 구울", type: "normal", hp: 150, def: 12, atk: 24, img: "assets/monsters/m_4_4.png" },
    { name: "밤의 추적자 네스", type: "named", hp: 350, def: 20, atk: 40, img: "assets/monsters/m_4_named.png" },
    { name: "루마니아 흡혈귀 군주", type: "boss", hp: 750, def: 35, atk: 65, img: "assets/monsters/m_4_boss.png" }
  ],
  5: [
    { name: "모래 먼지 전갈 좀비", type: "normal", hp: 150, def: 18, atk: 20, img: "assets/monsters/m_5_1.png" },
    { name: "미라화된 방사선 해골", type: "normal", hp: 130, def: 10, atk: 24, img: "assets/monsters/m_5_2.png" },
    { name: "모래바람 딱정벌레", type: "normal", hp: 170, def: 15, atk: 18, img: "assets/monsters/m_5_3.png" },
    { name: "무덤 도굴 오염체", type: "normal", hp: 140, def: 14, atk: 22, img: "assets/monsters/m_5_4.png" },
    { name: "유적 방사능 대주술사", type: "named", hp: 380, def: 22, atk: 42, img: "assets/monsters/m_5_named.png" },
    { name: "미라 대장 아누비스", type: "boss", hp: 800, def: 42, atk: 70, img: "assets/monsters/m_5_boss.png" }
  ],
  6: [
    { name: "낙진 네온 위습", type: "normal", hp: 120, def: 5, atk: 26, img: "assets/monsters/m_6_1.png" },
    { name: "보랏빛 낙진 마녀", type: "normal", hp: 140, def: 8, atk: 28, img: "assets/monsters/m_6_2.png" },
    { name: "오염된 가시 덩굴손", type: "normal", hp: 190, def: 15, atk: 18, img: "assets/monsters/m_6_3.png" },
    { name: "변이 요정 군집체", type: "normal", hp: 130, def: 10, atk: 22, img: "assets/monsters/m_6_4.png" },
    { name: "숲의 파괴자 골리앗", type: "named", hp: 420, def: 30, atk: 38, img: "assets/monsters/m_6_named.png" },
    { name: "숲의 망령 대정령", type: "boss", hp: 850, def: 45, atk: 72, img: "assets/monsters/m_6_boss.png" }
  ],
  7: [
    { name: "메카 탄소 돌진황소", type: "normal", hp: 200, def: 25, atk: 24, img: "assets/monsters/m_7_1.png" },
    { name: "핵추진 사냥 맹견", type: "normal", hp: 130, def: 12, atk: 26, img: "assets/monsters/m_7_2.png" },
    { name: "기병대 오염 창병", type: "normal", hp: 160, def: 16, atk: 28, img: "assets/monsters/m_7_3.png" },
    { name: "방사성 청동 대머리수리", type: "normal", hp: 120, def: 10, atk: 30, img: "assets/monsters/m_7_4.png" },
    { name: "몽골 약탈 기병대장", type: "named", hp: 450, def: 28, atk: 45, img: "assets/monsters/m_7_named.png" },
    { name: "기갑 제국 칸 '바투'", type: "boss", hp: 900, def: 50, atk: 80, img: "assets/monsters/m_7_boss.png" }
  ],
  8: [
    { name: "화염 가스 폭탄충", type: "normal", hp: 110, def: 5, atk: 35, img: "assets/monsters/m_8_1.png" },
    { name: "마그마 등껍질 거북", type: "normal", hp: 220, def: 30, atk: 18, img: "assets/monsters/m_8_2.png" },
    { name: "방사능 불꽃 전갈", type: "normal", hp: 150, def: 14, atk: 28, img: "assets/monsters/m_8_3.png" },
    { name: "잿더미 유인 좀비", type: "normal", hp: 170, def: 10, atk: 25, img: "assets/monsters/m_8_4.png" },
    { name: "불타는 재앙의 전마", type: "named", hp: 460, def: 25, atk: 50, img: "assets/monsters/m_8_named.png" },
    { name: "대지 붕괴 주신 이프리트", type: "boss", hp: 950, def: 48, atk: 85, img: "assets/monsters/m_8_boss.png" }
  ],
  9: [
    { name: "변이 초음파 돌고래", type: "normal", hp: 150, def: 12, atk: 25, img: "assets/monsters/m_9_1.png" },
    { name: "산성 방출 거대 해파리", type: "normal", hp: 130, def: 8, atk: 30, img: "assets/monsters/m_9_2.png" },
    { name: "오염 심해 아귀", type: "normal", hp: 180, def: 18, atk: 26, img: "assets/monsters/m_9_3.png" },
    { name: "바다 침식 세이렌 좀비", type: "normal", hp: 160, def: 10, atk: 28, img: "assets/monsters/m_9_4.png" },
    { name: "지중해 심해 청소부", type: "named", hp: 480, def: 30, atk: 48, img: "assets/monsters/m_9_named.png" },
    { name: "바다의 종말 레비아탄", type: "boss", hp: 1000, def: 52, atk: 90, img: "assets/monsters/m_9_boss.png" }
  ],
  10: [
    { name: "오로라 빙하 좀비곰", type: "normal", hp: 240, def: 20, atk: 26, img: "assets/monsters/m_10_1.png" },
    { name: "EMP 방출 야생늑대", type: "normal", hp: 140, def: 12, atk: 28, img: "assets/monsters/m_10_2.png" },
    { name: "오로라 결정 광부좀비", type: "normal", hp: 160, def: 22, atk: 22, img: "assets/monsters/m_10_3.png" },
    { name: "의지 잃은 오딘 전사", type: "normal", hp: 180, def: 15, atk: 30, img: "assets/monsters/m_10_4.png" },
    { name: "버서커 족장 그림", type: "named", hp: 520, def: 28, atk: 55, img: "assets/monsters/m_10_named.png" },
    { name: "오로라 타락체 발키리", type: "boss", hp: 1100, def: 55, atk: 95, img: "assets/monsters/m_10_boss.png" }
  ],
  11: [
    { name: "오염된 삼두우 좀비", type: "normal", hp: 220, def: 18, atk: 25, img: "assets/monsters/m_11_1.png" },
    { name: "방사선 코브라 변이종", type: "normal", hp: 130, def: 10, atk: 32, img: "assets/monsters/m_11_2.png" },
    { name: "정신지배 오염 신도", type: "normal", hp: 150, def: 8, atk: 28, img: "assets/monsters/m_11_3.png" },
    { name: "카르마 낙진 정령", type: "normal", hp: 120, def: 25, atk: 24, img: "assets/monsters/m_11_4.png" },
    { name: "타락한 은둔 구루", type: "named", hp: 500, def: 32, atk: 52, img: "assets/monsters/m_11_named.png" },
    { name: "사성 오염체 브라만", type: "boss", hp: 1150, def: 58, atk: 100, img: "assets/monsters/m_11_boss.png" }
  ],
  12: [
    { name: "체르노빌 냉각수 오염물", type: "normal", hp: 170, def: 14, atk: 28, img: "assets/monsters/m_12_1.png" },
    { name: "노심 용해 피각종", type: "normal", hp: 190, def: 20, atk: 30, img: "assets/monsters/m_12_2.png" },
    { name: "맹독 방사선 고치좀비", type: "normal", hp: 140, def: 28, atk: 24, img: "assets/monsters/m_12_3.png" },
    { name: "방사능 침식 야생멧돼지", type: "normal", hp: 210, def: 16, atk: 26, img: "assets/monsters/m_12_4.png" },
    { name: "체르노빌 고공 습격자", type: "named", hp: 540, def: 35, atk: 60, img: "assets/monsters/m_12_named.png" },
    { name: "노심 파괴수 코어브레이커", type: "boss", hp: 1200, def: 60, atk: 110, img: "assets/monsters/m_12_boss.png" }
  ],
  13: [
    { name: "중성자 가드 방어드론", type: "normal", hp: 130, def: 30, atk: 22, img: "assets/monsters/m_13_1.png" },
    { name: "침입 감지 중형 터렛", type: "normal", hp: 180, def: 25, atk: 32, img: "assets/monsters/m_13_2.png" },
    { name: "나노 경화 보초병", type: "normal", hp: 200, def: 35, atk: 25, img: "assets/monsters/m_13_3.png" },
    { name: "오작동 궤도 청소차", type: "normal", hp: 150, def: 15, atk: 30, img: "assets/monsters/m_13_4.png" },
    { name: "벙커 연방 수호 부동병", type: "named", hp: 600, def: 40, atk: 58, img: "assets/monsters/m_13_named.png" },
    { name: "센트리 마스터 '아이언웰'", type: "boss", hp: 1300, def: 65, atk: 120, img: "assets/monsters/m_13_boss.png" }
  ],
  14: [
    { name: "에베레스트 예티", type: "normal", hp: 250, def: 22, atk: 32, img: "assets/monsters/m_14_1.png" },
    { name: "얼어붙은 조난자 좀비", type: "normal", hp: 190, def: 18, atk: 30, img: "assets/monsters/m_14_2.png" },
    { name: "고대 얼음정령", type: "normal", hp: 220, def: 35, atk: 28, img: "assets/monsters/m_14_3.png" },
    { name: "변이 스노우 레오파드", type: "normal", hp: 180, def: 15, atk: 38, img: "assets/monsters/m_14_4.png" },
    { name: "에베레스트 클라이머좀비", type: "named", hp: 650, def: 45, atk: 68, img: "assets/monsters/m_14_named.png" },
    { name: "최종 7성 재앙 보스 [빅풋]", type: "boss", hp: 1600, def: 75, atk: 140, img: "assets/monsters/m_14_boss.png" }
  ]
};

// 2. 지역 및 특성 칩셋 데이터
const TRAITS_DATA = {
  body_mutation: { id: "body_mutation", name: "신체 변이", category: "mutation", region: 1, radCost: 250, description: "기본 신체 파츠 성능 25% 향상" },
  energy_discharge: { id: "energy_discharge", name: "에너지 방출", category: "offense", region: 2, radCost: 250, description: "공격 시 20% 에너지 탄막 추가 및 방관 15%" },
  sensory_tech: { id: "sensory_tech", name: "감각 변이/테크", category: "mutation", region: 3, radCost: 250, description: "치명타 확률 20% 증가" },
  blood_absorption: { id: "blood_absorption", name: "혈액 흡수", category: "survival", region: 4, radCost: 250, description: "피해량의 25% 흡혈" },
  cellular_shield: { id: "cellular_shield", name: "세포 차폐", category: "survival", region: 5, radCost: 250, description: "턴 시작 시 피해 2회 무효화 및 면역" },
  fairy_magic: { id: "fairy_magic", name: "요정 마법", category: "control", region: 6, radCost: 250, description: "스킬 사용 시 AI 게이지 20% 충전" },
  power_overload: { id: "power_overload", name: "동력 과부하", category: "control", region: 7, radCost: 250, description: "속도 +5, 25% 확률로 턴 연속 획득" },
  thermal_control: { id: "thermal_control", name: "열에너지 제어", category: "offense", region: 8, radCost: 250, description: "스킬 시전 시 무한 중첩 화상 피해" },
  ultrasonic_disruption: { id: "ultrasonic_disruption", name: "초음파 정신 교란", category: "control", region: 9, radCost: 250, description: "스킬 시전 시 30% 확률로 적 혼란" },
  berserker_madness: { id: "berserker_madness", name: "버서커 광기", category: "mutation", region: 10, radCost: 250, description: "잃은 체력 10%당 공격력 8% 증가" },
  radiation_assimilation: { id: "radiation_assimilation", name: "오염 동화", category: "mutation", region: 11, radCost: 250, description: "보유 Rad 1000당 공격력 +10%" },
  meltdown_control: { id: "meltdown_control", name: "멜트다운 제어", category: "offense", region: 12, radCost: 250, description: "체력 30% 이하 시 공격력 +50%, 반사 20%" },
  hightech_engineering: { id: "hightech_engineering", name: "하이테크 공학", category: "survival", region: 13, radCost: 250, description: "턴 시작 시 최대 체력의 20% 보호막" }
};

const FUSION_DATA = {
  apocalypse_ragnarok: { id: "apocalypse_ragnarok", name: "아포칼립스 라그나로크", req: ["energy_discharge", "thermal_control", "meltdown_control"], description: "핵폭발 전개. 매 턴 적 전체 도트딜 및 50% 방관" },
  immortal_leviathan: { id: "immortal_leviathan", name: "이모탈 리바이어던", req: ["blood_absorption", "cellular_shield", "hightech_engineering"], description: "최대 체력 100% 상승 및 사망 시 3턴 무적 폭주" },
  chronos_fairy: { id: "chronos_fairy", name: "크로노스 페어리", req: ["fairy_magic", "power_overload", "ultrasonic_disruption"], description: "적 턴스킵 및 아군 스킬 쿨다운 삭제" },
  pandemonium_chaos: { id: "pandemonium_chaos", name: "판데모니움 카오스", req: ["body_mutation", "sensory_tech", "berserker_madness", "radiation_assimilation"], description: "올스탯 +30%, 피격 시 디버프 전염" }
};

const REGIONS_METADATA = {
  1: { name: "시베리아 대황무지", env: "지독한 혹한과 방사능이 섞인 땅", trait: "body_mutation", coords: { x: 30, y: 35 } },
  2: { name: "서유럽 원전 지대", env: "고농도 방사능 데드존 및 슬러지 지대", trait: "energy_discharge", coords: { x: 18, y: 45 } },
  3: { name: "동아시아 메가시티", env: "데이터 잔해와 오작동 보안 기계 구역", trait: "sensory_tech", coords: { x: 42, y: 48 } },
  4: { name: "루마니아", env: "피와 전력을 갈구하는 약탈자 지대", trait: "blood_absorption", coords: { x: 26, y: 42 } },
  5: { name: "이집트", env: "세포 변이로 썩지 않는 미라 무덤 유적", trait: "cellular_shield", coords: { x: 28, y: 55 } },
  6: { name: "영국", env: "푸르고 보랏빛 낙진이 가득한 요정 황무지", trait: "fairy_magic", coords: { x: 14, y: 38 } },
  7: { name: "몽골", env: "방사능 거대마와 신체를 결합한 기병대", trait: "power_overload", coords: { x: 36, y: 44 } },
  8: { name: "중동 유전지대", env: "유전 폭발로 100년째 불타오르는 화염 대지", trait: "thermal_control", coords: { x: 24, y: 50 } },
  9: { name: "그리스 지중해", env: "해수면 상승으로 잠긴 초음파 해양 괴물 구역", trait: "ultrasonic_disruption", coords: { x: 20, y: 50 } },
  10: { name: "북유럽 오로라숲", env: "EMP 폭풍과 버서커 세력이 지배하는 숲", trait: "berserker_madness", coords: { x: 19, y: 32 } },
  11: { name: "인도 오염 사원", env: "오염도가 극에 달한 삼두우 오염 숭배지", trait: "radiation_assimilation", coords: { x: 34, y: 56 } },
  12: { name: "체르노빌 수색지", env: "원전 폭발 중심부의 극위험 파밍 구역", trait: "meltdown_control", coords: { x: 23, y: 40 } },
  13: { name: "스위스 벙커", env: "인간성을 버린 기계 보초병 부대 수용소", trait: "hightech_engineering", coords: { x: 16, y: 44 } },
  14: { name: "에베레스트 산맥", env: "7성 거수 빅풋이 지배하는 세계의 끝", trait: "nemesis", coords: { x: 38, y: 53 } }
};

// 3. 10프레임 캐릭터 애니메이션 오프셋 데이터
const ANIMATION_METADATA = {
  idle: [
    { frame: 0, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 1, headOffset: {x: 0, y: 3, rotation: 0}, rArmOffset: {x: 66, y: 35, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 39 },
    { frame: 2, headOffset: {x: 0, y: 4, rotation: 0}, rArmOffset: {x: 66, y: 36, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 40 },
    { frame: 3, headOffset: {x: 0, y: 3, rotation: 0}, rArmOffset: {x: 66, y: 35, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 39 },
    { frame: 4, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 5, headOffset: {x: 0, y: 1, rotation: 0}, rArmOffset: {x: 66, y: 33, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 37 },
    { frame: 6, headOffset: {x: 0, y: 0, rotation: 0}, rArmOffset: {x: 66, y: 32, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 36 },
    { frame: 7, headOffset: {x: 0, y: 1, rotation: 0}, rArmOffset: {x: 66, y: 33, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 37 },
    { frame: 8, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 9, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 }
  ],
  run: [
    { frame: 0, headOffset: {x: 1, y: 1, rotation: -2}, rArmOffset: {x: 68, y: 34, rotation: 5}, legsOffset: {x: 39, y: 82, rotation: 10}, torsoY: 37 },
    { frame: 1, headOffset: {x: 2, y: 0, rotation: -4}, rArmOffset: {x: 70, y: 33, rotation: 10}, legsOffset: {x: 41, y: 82, rotation: 5}, torsoY: 38 },
    { frame: 2, headOffset: {x: 1, y: 1, rotation: -2}, rArmOffset: {x: 69, y: 34, rotation: 5}, legsOffset: {x: 43, y: 82, rotation: -5}, torsoY: 39 },
    { frame: 3, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 67, y: 35, rotation: 0}, legsOffset: {x: 45, y: 82, rotation: -10}, torsoY: 38 },
    { frame: 4, headOffset: {x: -1, y: 1, rotation: 2}, rArmOffset: {x: 65, y: 34, rotation: -5}, legsOffset: {x: 43, y: 82, rotation: -5}, torsoY: 37 },
    { frame: 5, headOffset: {x: -2, y: 0, rotation: 4}, rArmOffset: {x: 64, y: 33, rotation: -10}, legsOffset: {x: 41, y: 82, rotation: 5}, torsoY: 38 },
    { frame: 6, headOffset: {x: -1, y: 1, rotation: 2}, rArmOffset: {x: 65, y: 34, rotation: -5}, legsOffset: {x: 39, y: 82, rotation: 10}, torsoY: 39 },
    { frame: 7, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 35, rotation: 0}, legsOffset: {x: 40, y: 82, rotation: 5}, torsoY: 38 },
    { frame: 8, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 67, y: 35, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 9, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 67, y: 35, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 }
  ],
  attack: [
    { frame: 0, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 64, y: 35, rotation: -15}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 1, headOffset: {x: -1, y: 1, rotation: 2}, rArmOffset: {x: 62, y: 34, rotation: -30}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 2, headOffset: {x: -2, y: 0, rotation: 5}, rArmOffset: {x: 60, y: 32, rotation: -45}, legsOffset: {x: 41, y: 82, rotation: 0}, torsoY: 37 },
    { frame: 3, headOffset: {x: 1, y: 2, rotation: -5}, rArmOffset: {x: 70, y: 38, rotation: 15}, legsOffset: {x: 43, y: 82, rotation: 0}, torsoY: 39 },
    { frame: 4, headOffset: {x: 2, y: 3, rotation: -10}, rArmOffset: {x: 78, y: 40, rotation: 45}, legsOffset: {x: 44, y: 82, rotation: 0}, torsoY: 40 },
    { frame: 5, headOffset: {x: 3, y: 4, rotation: -12}, rArmOffset: {x: 82, y: 40, rotation: 0}, legsOffset: {x: 44, y: 82, rotation: 0}, torsoY: 40 },
    { frame: 6, headOffset: {x: 2, y: 3, rotation: -8}, rArmOffset: {x: 78, y: 38, rotation: -10}, legsOffset: {x: 43, y: 82, rotation: 0}, torsoY: 39 },
    { frame: 7, headOffset: {x: 1, y: 2, rotation: -3}, rArmOffset: {x: 72, y: 37, rotation: -15}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 8, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 68, y: 36, rotation: -5}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 9, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 }
  ],
  skill: [
    { frame: 0, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 64, y: 35, rotation: -15}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 1, headOffset: {x: -1, y: 1, rotation: 5}, rArmOffset: {x: 62, y: 32, rotation: -45}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 37 },
    { frame: 2, headOffset: {x: -2, y: 0, rotation: 10}, rArmOffset: {x: 60, y: 28, rotation: -90}, legsOffset: {x: 41, y: 82, rotation: 0}, torsoY: 36 },
    { frame: 3, headOffset: {x: 0, y: 1, rotation: 0}, rArmOffset: {x: 68, y: 40, rotation: -120}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 4, headOffset: {x: 2, y: 3, rotation: -15}, rArmOffset: {x: 74, y: 50, rotation: -180}, legsOffset: {x: 44, y: 82, rotation: 0}, torsoY: 40 },
    { frame: 5, headOffset: {x: 3, y: 4, rotation: -20}, rArmOffset: {x: 76, y: 55, rotation: -180}, legsOffset: {x: 44, y: 82, rotation: 0}, torsoY: 41 },
    { frame: 6, headOffset: {x: 2, y: 3, rotation: -15}, rArmOffset: {x: 74, y: 50, rotation: -135}, legsOffset: {x: 43, y: 82, rotation: 0}, torsoY: 40 },
    { frame: 7, headOffset: {x: 1, y: 2, rotation: -5}, rArmOffset: {x: 70, y: 42, rotation: -90}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 39 },
    { frame: 8, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 38, rotation: -45}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 },
    { frame: 9, headOffset: {x: 0, y: 2, rotation: 0}, rArmOffset: {x: 66, y: 34, rotation: 0}, legsOffset: {x: 42, y: 82, rotation: 0}, torsoY: 38 }
  ]
};

// 4. 게임 글로벌 상태값 (STATE)
const STATE = {
  gender: "female",
  unlockedRegion: 1,
  currentRad: 500,
  radCapacity: 1000,
  
  // 영구 훈련 능력치
  baseStats: {
    atk: 120,
    def: 30,
    traitPower: 0,
    maxHp: 1000,
    hp: 1000
  },
  
  // 전투 인게임 상태
  selectedRegion: 1,
  currentRound: 1, // 1~6라운드
  gameSpeed: 1,    // 1, 2, 4 배속
  renderMode: "illustration", // "illustration" 또는 "parts"
  currentMotion: "idle",
  currentFrame: 0,

  // 인벤토리 & 장비
  equipped: {
    weapon: null,
    armor: null,
    accessory: null
  },
  inventory: [], // 최대 20개 슬롯 가방
  
  // 특성
  ownedTraits: [],
  activeFusions: [],
  everestCleared: false,
  nemesisEvolved: false,
  activeAi: null,

  // 전투 데이터
  combatRunning: false,
  playerHp: 1000,
  monsterHps: [0, 0, 0],
  monsterMaxHps: [0, 0, 0],
  monsterParty: [],
  combatTimer: null,
  animTimer: null
};

// 5. 아이템 데이터베이스 및 제네레이터
const ITEM_NAMES = {
  weapon: ["조선 환도", "낙진 벌목용 도끼", "고주파 크리스탈 검", "전자기 중기관포", "용암 발사 런처"],
  armor: ["다포형 군복", "납 차폐 가죽 코트", "나노 카본 플레이트", "중성자 하드라이트 방패갑", "빅풋 예티 털외투"],
  accessory: ["방사선 계측 링", "전압 안정화 코일 목걸이", "초음파 공명 진동자", "네메시스 광학 고글", "핵융합 나노 코어"]
};

function generateRandomItem(regionLevel) {
  const slots = ["weapon", "armor", "accessory"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const namePool = ITEM_NAMES[slot];
  const name = namePool[Math.floor(Math.random() * namePool.length)] + ` (Lv.${regionLevel})`;

  const rarities = ["common", "rare", "epic", "legendary"];
  const randVal = Math.random();
  let rarity = "common";
  let rarityMult = 1.0;
  if (randVal > 0.95) { rarity = "legendary"; rarityMult = 2.5; }
  else if (randVal > 0.8) { rarity = "epic"; rarityMult = 1.8; }
  else if (randVal > 0.5) { rarity = "rare"; rarityMult = 1.3; }

  const baseVal = regionLevel * 10;
  const statVal = Math.floor(baseVal * rarityMult * (0.8 + Math.random() * 0.4));
  
  let effectText = "";
  let stats = { atk: 0, def: 0, traitPower: 0, maxHp: 0 };
  if (slot === "weapon") {
    stats.atk = statVal;
    effectText = `공격력 +${statVal}`;
  } else if (slot === "armor") {
    stats.def = Math.floor(statVal / 3) + 1;
    stats.maxHp = statVal * 8;
    effectText = `방어력 +${stats.def}, 체력 +${stats.maxHp}`;
  } else {
    stats.traitPower = Math.floor(statVal / 4) + 1;
    stats.maxHp = statVal * 5;
    effectText = `특성력 +${stats.traitPower}, 체력 +${stats.maxHp}`;
  }

  return {
    id: "item_" + Math.random().toString(36).substr(2, 9),
    name: name,
    slot: slot,
    rarity: rarity,
    stats: stats,
    effectText: effectText,
    desc: `유라시아 챕터 ${regionLevel} 환경 낙진 수색 중 수집된 특수 장비입니다.`,
    cost: Math.floor(regionLevel * 60 * rarityMult)
  };
}

// 6. DOM 요소들
const DOM = {
  // Screens
  screens: {
    start: document.getElementById("screen-start"),
    map: document.getElementById("screen-map"),
    battle: document.getElementById("screen-battle"),
    town: document.getElementById("screen-town")
  },
  
  // Map
  mapCanvas: document.getElementById("mapCanvas"),
  modalRegionInfo: document.getElementById("modal-region-info"),
  regionInfoTitle: document.getElementById("region-info-title"),
  regionInfoEnv: document.getElementById("region-info-env"),
  regionInfoTrait: document.getElementById("region-info-trait"),
  regionMonsterList: document.getElementById("region-monster-list"),
  btnStartBattle: document.getElementById("btn-start-battle"),

  // Battle
  battleRegionText: document.getElementById("battle-region-text"),
  battleProgressText: document.getElementById("battle-progress-text"),
  btnGameSpeed: document.getElementById("btn-game-speed"),
  battleAgentHp: document.getElementById("battleAgentHp"),
  battleAgentHpText: document.getElementById("battleAgentHpText"),
  battleAgentAvatar: document.getElementById("battleAgentAvatar"),
  battleConsole: document.getElementById("battleConsole"),
  overlayClear: document.getElementById("overlay-clear"),
  clearRewardInfo: document.getElementById("clear-reward-info"),
  btnGoTown: document.getElementById("btn-go-town"),
  battleStageContainer: document.getElementById("battleStageContainer"),
  battleScreenFlash: document.getElementById("battleScreenFlash"),

  // Modals
  inventoryGrid: document.getElementById("inventoryGrid"),
  modalItemInfo: document.getElementById("modal-item-info"),
  itemInfoName: document.getElementById("item-info-name"),
  itemInfoImg: document.getElementById("item-info-img"),
  itemInfoRarity: document.getElementById("item-info-rarity"),
  itemInfoEffects: document.getElementById("item-info-effects"),
  itemInfoDesc: document.getElementById("item-info-desc"),
  btnItemEquip: document.getElementById("btn-item-equip"),
  btnItemDiscard: document.getElementById("btn-item-discard"),
  btnItemSell: document.getElementById("btn-item-sell"),

  // Stats upgrade
  statAtk: document.getElementById("stat-val-atk"),
  statDef: document.getElementById("stat-val-def"),
  statTrait: document.getElementById("stat-val-trait"),
  statHp: document.getElementById("stat-val-hp"),
  costUpAtk: document.getElementById("cost-up-atk"),
  costUpDef: document.getElementById("cost-up-def"),
  costUpTrait: document.getElementById("cost-up-trait"),
  costUpHp: document.getElementById("cost-up-hp"),
  btnUpAtk: document.getElementById("btn-up-atk"),
  btnUpDef: document.getElementById("btn-up-def"),
  btnUpTrait: document.getElementById("btn-up-trait"),
  btnUpHp: document.getElementById("btn-up-hp"),

  // Traits
  modalTraitsGrid: document.getElementById("modalTraitsGrid"),
  modalFusionList: document.getElementById("modalFusionList"),
  modalTraitCount: document.getElementById("modal-trait-count"),
  modalFusionCount: document.getElementById("modal-fusion-count"),

  // Shop & Lab
  shopBuyGrid: document.getElementById("shopBuyGrid"),
  shopSellGrid: document.getElementById("shopSellGrid"),
  labTraitsGrid: document.getElementById("labTraitsGrid"),
  labFusionList: document.getElementById("labFusionList"),
  labNemesisStatus: document.getElementById("labNemesisStatus"),
  btnLabEvolveNemesis: document.getElementById("btnLabEvolveNemesis"),
  townRadValue: document.getElementById("town-rad-value")
};

// 7. 스크린 & 모달 제어
function showScreen(screenId) {
  Object.keys(DOM.screens).forEach(key => {
    if (key === screenId) {
      DOM.screens[key].classList.add("active");
    } else {
      DOM.screens[key].classList.remove("active");
    }
  });

  // 전투 퇴각 시 처리
  if (screenId !== "battle") {
    stopBattleLoop();
  } else {
    initBattleStage();
  }

  // 마을 정보 동기화
  if (screenId === "town") {
    DOM.townRadValue.textContent = STATE.currentRad;
  }
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
  if (modalId === "modal-inventory") renderInventory();
  if (modalId === "modal-stats") renderStatsWindow();
  if (modalId === "modal-traits") renderTraitsWindow();
  if (modalId === "modal-shop") renderShopWindow();
  if (modalId === "modal-trait-lab") renderTraitLab();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// 8. 능력치 산출 엔진 (영구강화 + 인벤토리 장비 합산)
function getDerivedStats() {
  const derived = {
    atk: STATE.baseStats.atk,
    def: STATE.baseStats.def,
    traitPower: STATE.baseStats.traitPower,
    maxHp: STATE.baseStats.maxHp
  };

  // 장착 중인 무기, 방어구, 특수장비 보너스 합산
  Object.values(STATE.equipped).forEach(item => {
    if (item) {
      derived.atk += item.stats.atk;
      derived.def += item.stats.def;
      derived.traitPower += item.stats.traitPower;
      derived.maxHp += item.stats.maxHp;
    }
  });

  // 오염 동화 특성 가중치: 보유 Rad 1000당 공격력 10% 증가
  if (STATE.ownedTraits.includes("radiation_assimilation")) {
    const scale = Math.floor(STATE.currentRad / 1000);
    derived.atk += Math.floor(STATE.baseStats.atk * 0.1 * scale);
  }

  // 판데모니움 카오스 융합: 올스탯 +30%
  if (STATE.activeFusions.includes("pandemonium_chaos")) {
    derived.atk = Math.floor(derived.atk * 1.3);
    derived.def = Math.floor(derived.def * 1.3);
    derived.traitPower = Math.floor(derived.traitPower * 1.3);
    derived.maxHp = Math.floor(derived.maxHp * 1.3);
  }

  // 이모탈 리바이어던 융합: 최대 체력 100% 영구 상승
  if (STATE.activeFusions.includes("immortal_leviathan")) {
    derived.maxHp = Math.floor(derived.maxHp * 2.0);
  }

  return derived;
}

// 9. 인벤토리 렌더링
function renderInventory() {
  const grid = DOM.inventoryGrid;
  grid.innerHTML = "";

  // 1) 상단 장착창 싱크
  const slots = ["weapon", "armor", "accessory"];
  slots.forEach(slot => {
    const slotBox = document.getElementById("slot-" + slot);
    const item = STATE.equipped[slot];
    if (item) {
      slotBox.className = `equip-slot-box rarity-${item.rarity}`;
      slotBox.innerHTML = `
        <span class="slot-placeholder">${slot.toUpperCase()}</span>
        <strong style="font-size: 0.72rem; text-align:center;">${item.name}</strong>
      `;
      slotBox.onclick = () => showItemInfoModal(item, true);
    } else {
      slotBox.className = "equip-slot-box";
      let label = "무기 빈칸";
      if (slot === "armor") label = "방어구 빈칸";
      if (slot === "accessory") label = "특수장비 빈칸";
      slotBox.innerHTML = `<span class="slot-placeholder">${label}</span>`;
      slotBox.onclick = null;
    }
  });

  // 2) 가방 그리드 렌더링 (5x4 = 20개 슬롯 채우기)
  for (let i = 0; i < 20; i++) {
    const slotEl = document.createElement("div");
    const item = STATE.inventory[i];
    if (item) {
      slotEl.className = `inv-slot rarity-${item.rarity}`;
      let icon = "item_weapon.png";
      if (item.slot === "armor") icon = "item_armor.png";
      if (item.slot === "accessory") icon = "item_accessory.png";
      
      slotEl.innerHTML = `<div class="item-icon-img" style="background-image: url('assets/ui/${icon}');"></div>`;
      slotEl.onclick = () => showItemInfoModal(item, false, i);
    } else {
      slotEl.className = "inv-slot empty";
    }
    grid.appendChild(slotEl);
  }
}

function showItemInfoModal(item, isEquipped, index = -1) {
  DOM.itemInfoName.textContent = item.name;
  DOM.itemInfoRarity.textContent = item.rarity.toUpperCase();
  DOM.itemInfoRarity.className = `item-rarity-badge rarity-${item.rarity}`;
  DOM.itemInfoEffects.textContent = item.effectText;
  DOM.itemInfoDesc.textContent = item.desc;
  
  let icon = "item_weapon.png";
  if (item.slot === "armor") icon = "item_armor.png";
  if (item.slot === "accessory") icon = "item_accessory.png";
  DOM.itemInfoImg.style.backgroundImage = `url('assets/ui/${icon}')`;

  // 액션 버튼 제어
  if (isEquipped) {
    DOM.btnItemEquip.textContent = "해제하기";
    DOM.btnItemEquip.onclick = () => {
      // 해제 후 가방으로 돌려놓기 (가방 남는 자리 있는지 검사)
      if (STATE.inventory.length >= 20) {
        alert("가방 공간이 부족합니다!");
        return;
      }
      STATE.equipped[item.slot] = null;
      STATE.inventory.push(item);
      closeModal("modal-item-info");
      renderInventory();
      writeBattleLog(`⚙️ 장비 해제: ${item.name}`, "system");
    };
  } else {
    DOM.btnItemEquip.textContent = "장착하기";
    DOM.btnItemEquip.onclick = () => {
      // 해당 슬롯 기존 장비는 가방으로 보내고 신규 장착
      const prevEquipped = STATE.equipped[item.slot];
      STATE.equipped[item.slot] = item;
      STATE.inventory.splice(index, 1);
      if (prevEquipped) {
        STATE.inventory.push(prevEquipped);
      }
      closeModal("modal-item-info");
      renderInventory();
      writeBattleLog(`🛡️ 장비 장착: ${item.name}`, "system");
    };
  }

  // 버리기 버튼
  DOM.btnItemDiscard.onclick = () => {
    if (confirm("정말 버리시겠습니까?")) {
      if (isEquipped) {
        STATE.equipped[item.slot] = null;
      } else {
        STATE.inventory.splice(index, 1);
      }
      closeModal("modal-item-info");
      renderInventory();
      writeBattleLog(`🗑️ 장비 파기: ${item.name}`, "warning");
    }
  };

  // 판매하기 대응 (상점이 켜져 있는 상황 대응)
  const isShopOpen = document.getElementById("modal-shop").classList.contains("active");
  if (isShopOpen && !isEquipped) {
    DOM.btnItemSell.style.display = "block";
    DOM.btnItemSell.textContent = `판매하기 (+${item.cost} Rad)`;
    DOM.btnItemSell.onclick = () => {
      STATE.currentRad += item.cost;
      STATE.inventory.splice(index, 1);
      closeModal("modal-item-info");
      renderInventory();
      renderShopWindow();
      DOM.townRadValue.textContent = STATE.currentRad;
      writeBattleLog(`💰 장비 판매: ${item.name} (+${item.cost} Rad)`, "system");
    };
  } else {
    DOM.btnItemSell.style.display = "none";
  }

  openModal("modal-item-info");
}

// 10. 능력치 강화 렌더링
function renderStatsWindow() {
  const stats = getDerivedStats();
  DOM.statAtk.textContent = stats.atk;
  DOM.statDef.textContent = stats.def;
  DOM.statTrait.textContent = stats.traitPower;
  DOM.statHp.textContent = `${STATE.baseStats.hp}/${stats.maxHp}`;

  // 강화 비용 공식: 해당 스탯 / 5 * 100
  const costAtk = Math.floor(STATE.baseStats.atk / 10) * 80;
  const costDef = Math.floor(STATE.baseStats.def) * 40;
  const costTrait = (STATE.baseStats.traitPower + 1) * 150;
  const costHp = Math.floor(STATE.baseStats.maxHp / 100) * 80;

  DOM.costUpAtk.textContent = `${costAtk} Rad`;
  DOM.costUpDef.textContent = `${costDef} Rad`;
  DOM.costUpTrait.textContent = `${costTrait} Rad`;
  DOM.costUpHp.textContent = `${costHp} Rad`;

  DOM.btnUpAtk.onclick = () => upgradeStat("atk", costAtk, 15);
  DOM.btnUpDef.onclick = () => upgradeStat("def", costDef, 4);
  DOM.btnUpTrait.onclick = () => upgradeStat("traitPower", costTrait, 1);
  DOM.btnUpHp.onclick = () => upgradeStat("maxHp", costHp, 150);
}

function upgradeStat(statName, cost, increaseAmount) {
  if (STATE.currentRad >= cost) {
    STATE.currentRad -= cost;
    STATE.baseStats[statName] += increaseAmount;
    if (statName === "maxHp") {
      // 체력 상승 시 현재 체력도 비율 증가
      STATE.baseStats.hp += increaseAmount;
    }
    renderStatsWindow();
    if (DOM.townRadValue) DOM.townRadValue.textContent = STATE.currentRad;
    writeBattleLog(`🔥 영구 신체 훈련 완료! [${statName}] 증가`, "system");
  } else {
    alert("소지한 Rad 광석이 부족합니다!");
  }
}

// 11. 특성 및 융합 상태창 렌더링
function renderTraitsWindow() {
  DOM.modalTraitCount.textContent = `${STATE.ownedTraits.length}/13`;
  DOM.modalFusionCount.textContent = `${STATE.activeFusions.length}/4`;

  const grid = DOM.modalTraitsGrid;
  grid.innerHTML = "";
  Object.values(TRAITS_DATA).forEach(trait => {
    const isAcquired = STATE.ownedTraits.includes(trait.id);
    const item = document.createElement("div");
    item.className = `trait-item-chip ${isAcquired ? 'acquired' : ''}`;
    item.innerHTML = `
      <span class="category">${trait.category}</span>
      <strong>${trait.name}</strong>
    `;
    grid.appendChild(item);
  });

  const fList = DOM.modalFusionList;
  fList.innerHTML = "";
  Object.values(FUSION_DATA).forEach(fusion => {
    const isActive = STATE.activeFusions.includes(fusion.id);
    const item = document.createElement("div");
    item.className = `fusion-item-chip ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <div class="f-title">${fusion.name}</div>
      <div>${fusion.description}</div>
    `;
    fList.appendChild(item);
  });
}

// 12. 마을 상점 시스템
let shopBuyItems = [];
function renderShopWindow() {
  // 상점 탭 전환
  const tabBuy = DOM.shopBuyGrid.parentNode;
  const tabSell = document.getElementById("panel-shop-sell");
  
  document.getElementById("tab-shop-buy").onclick = () => {
    tabBuy.style.display = "block";
    tabSell.style.display = "none";
    document.getElementById("tab-shop-buy").classList.add("active");
    document.getElementById("tab-shop-sell").classList.remove("active");
  };

  document.getElementById("tab-shop-sell").onclick = () => {
    tabBuy.style.display = "none";
    tabSell.style.display = "block";
    document.getElementById("tab-shop-buy").classList.remove("active");
    document.getElementById("tab-shop-sell").classList.add("active");
    renderShopSellGrid();
  };

  // 구매용 보급품 생성 (상점 열릴 때 1회 로드)
  if (shopBuyItems.length === 0) {
    refreshShopSupply();
  }

  const buyGrid = DOM.shopBuyGrid;
  buyGrid.innerHTML = "";
  shopBuyItems.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = `shop-item-card rarity-${item.rarity}`;
    let icon = "item_weapon.png";
    if (item.slot === "armor") icon = "item_armor.png";
    if (item.slot === "accessory") icon = "item_accessory.png";

    card.innerHTML = `
      <div class="item-image-large" style="width:50px; height:50px; background-image: url('assets/ui/${icon}')"></div>
      <div class="shop-item-info">
        <span class="shop-item-name">${item.name}</span>
        <span class="shop-item-cost">💰 가격: ${item.cost} Rad</span>
      </div>
    `;
    card.onclick = () => buyShopItem(item, i);
    buyGrid.appendChild(card);
  });
}

function refreshShopSupply() {
  shopBuyItems = [];
  // 현재 맵 해금된 지역 레벨 기준으로 아이템 4종 리스폰
  for (let i = 0; i < 4; i++) {
    shopBuyItems.push(generateRandomItem(STATE.unlockedRegion));
  }
}

function buyShopItem(item, index) {
  if (STATE.currentRad >= item.cost) {
    if (STATE.inventory.length >= 20) {
      alert("가방 가득 참!");
      return;
    }
    STATE.currentRad -= item.cost;
    STATE.inventory.push(item);
    shopBuyItems.splice(index, 1); // 상점에서 제거
    renderShopWindow();
    DOM.townRadValue.textContent = STATE.currentRad;
    writeBattleLog(`🏪 상점 보급 구매 성공: ${item.name}`, "system");
  } else {
    alert("Rad가 부족합니다!");
  }
}

function renderShopSellGrid() {
  const sellGrid = document.getElementById("shopSellGrid");
  sellGrid.innerHTML = "";
  for (let i = 0; i < 20; i++) {
    const slotEl = document.createElement("div");
    const item = STATE.inventory[i];
    if (item) {
      slotEl.className = `inv-slot rarity-${item.rarity}`;
      let icon = "item_weapon.png";
      if (item.slot === "armor") icon = "item_armor.png";
      if (item.slot === "accessory") icon = "item_accessory.png";
      slotEl.innerHTML = `<div class="item-icon-img" style="background-image: url('assets/ui/${icon}');"></div>`;
      // 클릭 시 판매 전용 상세 팝업
      slotEl.onclick = () => showItemInfoModal(item, false, i);
    } else {
      slotEl.className = "inv-slot empty";
    }
    sellGrid.appendChild(slotEl);
  }
}

// 13. 특성 진화소 개조 연구실 (마을)
function renderTraitLab() {
  // 13대 특성 칩셋 동적 렌더링
  const grid = DOM.labTraitsGrid;
  grid.innerHTML = "";

  Object.values(TRAITS_DATA).forEach(trait => {
    const isAcquired = STATE.ownedTraits.includes(trait.id);
    const chip = document.createElement("div");
    chip.className = `trait-item-chip ${isAcquired ? 'acquired' : ''}`;
    chip.innerHTML = `
      <span class="category">${trait.category}</span>
      <strong>${trait.name}</strong>
      <span style="font-size:0.6rem; opacity:0.8; margin-top:2px;">[${isAcquired ? '장착완료' : '250 Rad'}]</span>
    `;
    chip.onclick = () => toggleTraitLab(trait.id);
    grid.appendChild(chip);
  });

  // 융합 칩 출력 및 네메시스 승화 자격 실시간 갱신
  refreshFusions();
  const fList = DOM.labFusionList;
  fList.innerHTML = "";
  Object.values(FUSION_DATA).forEach(fusion => {
    const isActive = STATE.activeFusions.includes(fusion.id);
    const item = document.createElement("div");
    item.className = `fusion-item-chip ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <div class="f-title">${fusion.name}</div>
      <div>${fusion.description}</div>
    `;
    fList.appendChild(item);
  });

  // 네메시스
  const isEverest = STATE.everestCleared;
  const activeFusionsCount = STATE.activeFusions.length;
  // 네메시스 해금 조건: 에베레스트 클리어 및 융합 4종 전체 활성화
  const isUnlocked = isEverest && activeFusionsCount >= 4;

  if (STATE.nemesisEvolved) {
    DOM.labNemesisStatus.textContent = "⚡ 네메시스 주신 최종 승화 강림 완료 (몬스터화 면역)";
    document.getElementById("btnLabEvolveNemesis").textContent = "네메시스 승화 해제";
    document.getElementById("btnLabEvolveNemesis").disabled = false;
    document.getElementById("btnLabEvolveNemesis").classList.add("active");
  } else if (isUnlocked) {
    DOM.labNemesisStatus.textContent = "🔓 승화 강림 조건 달성! 최종 승화 준비 완료 (비용: 1200 Rad)";
    document.getElementById("btnLabEvolveNemesis").disabled = false;
    document.getElementById("btnLabEvolveNemesis").classList.remove("active");
  } else {
    DOM.labNemesisStatus.textContent = `🔒 잠김 (조건: 에베레스트 완파 + 융합 4종 전체 장착 [현재: ${activeFusionsCount}/4])`;
    document.getElementById("btnLabEvolveNemesis").disabled = true;
    document.getElementById("btnLabEvolveNemesis").classList.remove("active");
  }
}

function toggleTraitLab(id) {
  const trait = TRAITS_DATA[id];
  const idx = STATE.ownedTraits.indexOf(id);

  if (idx > -1) {
    // 장착 해제 및 Rad 복구
    STATE.ownedTraits.splice(idx, 1);
    STATE.currentRad += trait.radCost;
    writeBattleLog(`🧪 특성 복구 완료: ${trait.name} (+${trait.radCost} Rad)`, "system");
  } else {
    // 장착 시도
    if (STATE.currentRad >= trait.radCost) {
      STATE.ownedTraits.push(id);
      STATE.currentRad -= trait.radCost;
      writeBattleLog(`🧪 특성 장착 연구: ${trait.name} (-${trait.radCost} Rad)`, "system");
    } else {
      alert("Rad 광석이 부족합니다!");
    }
  }

  DOM.townRadValue.textContent = STATE.currentRad;
  renderTraitLab();
}

function refreshFusions() {
  STATE.activeFusions = [];
  Object.values(FUSION_DATA).forEach(fusion => {
    const hasReq = fusion.req.every(id => STATE.ownedTraits.includes(id));
    if (hasReq) {
      STATE.activeFusions.push(fusion.id);
    }
  });
}

// 네메시스 이벤트 바인딩
document.getElementById("btnLabEvolveNemesis").onclick = () => {
  if (STATE.nemesisEvolved) {
    STATE.nemesisEvolved = false;
    STATE.currentRad += 1200;
    writeBattleLog(`🌌 네메시스 주신 승화 해제 (+1200 Rad)`, "warning");
  } else {
    if (STATE.currentRad >= 1200) {
      STATE.nemesisEvolved = true;
      STATE.currentRad -= 1200;
      writeBattleLog(`⚡ 7성 주신 네메시스(Nemesis) 승화 강림 완료!`, "system");
    } else {
      alert("Rad 광석이 부족합니다!");
    }
  }
  DOM.townRadValue.textContent = STATE.currentRad;
  renderTraitLab();
};

// 14. 유라시아 전역 지도 거점 렌더링
function renderWorldMapPins() {
  const mapCanvas = DOM.mapCanvas;
  // 기존 핀 제거 후 신규 배치
  mapCanvas.querySelectorAll(".map-pin").forEach(el => el.remove());

  Object.entries(REGIONS_METADATA).forEach(([idStr, region]) => {
    const id = parseInt(idStr);
    const pin = document.createElement("div");
    
    let stateClass = "locked";
    if (id <= STATE.unlockedRegion) {
      stateClass = (id < STATE.unlockedRegion) ? "cleared" : "unlocked";
    }

    pin.className = `map-pin ${stateClass}`;
    pin.style.left = `${region.coords.x}%`;
    pin.style.top = `${region.coords.y}%`;
    pin.textContent = id;
    
    if (stateClass !== "locked") {
      pin.onclick = () => showRegionInfoModal(id);
    } else {
      pin.onclick = () => alert("이전 챕터를 격퇴하여 지도를 개방하십시오.");
    }

    mapCanvas.appendChild(pin);
  });
}

function showRegionInfoModal(regionId) {
  STATE.selectedRegion = regionId;
  const region = REGIONS_METADATA[regionId];
  
  DOM.regionInfoTitle.textContent = `${regionId}. ${region.name}`;
  DOM.regionInfoEnv.textContent = region.env;
  
  const traitDetails = TRAITS_DATA[region.trait];
  DOM.regionInfoTrait.textContent = traitDetails ? `${traitDetails.name} (${traitDetails.description})` : "네메시스 최종 구역";

  // 몬스터 목록 썸네일 노출
  const mList = DOM.regionMonsterList;
  mList.innerHTML = "";
  const monsters = MONSTERS_DATABASE[regionId] || MONSTERS_DATABASE[1];
  
  monsters.forEach(m => {
    const thumb = document.createElement("div");
    thumb.className = "monster-thumb";
    thumb.title = `${m.name} (HP: ${m.hp}, ATK: ${m.atk})`;
    thumb.style.backgroundImage = `url('${m.img}')`;
    
    // 로드 실패 시 폴백
    const imgLoader = new Image();
    imgLoader.src = m.img;
    imgLoader.onerror = () => {
      let fallback = "assets/monsters/m_1_1.png";
      if (m.type === "named") fallback = "assets/monsters/m_1_named.png";
      if (m.type === "boss") fallback = "assets/monsters/m_1_boss.png";
      thumb.style.backgroundImage = `url('${fallback}')`;
    };

    mList.appendChild(thumb);
  });

  // 전투 집입 바인딩
  DOM.btnStartBattle.onclick = () => {
    closeModal("modal-region-info");
    STATE.currentRound = 1;
    showScreen("battle");
  };

  openModal("modal-region-info");
}

// 15. 10프레임 애니메이션 루프 구동
function startAnimationLoop() {
  if (STATE.animTimer) clearInterval(STATE.animTimer);
  
  const tickDuration = 100 / STATE.gameSpeed; // 배속에 비례해 단축
  
  STATE.animTimer = setInterval(() => {
    // 0~9 프레임 순환
    STATE.currentFrame = (STATE.currentFrame + 1) % 10;
    
    // 모션별 애니메이션 분기
    const frames = ANIMATION_METADATA[STATE.currentMotion] || ANIMATION_METADATA.idle;
    const fData = frames[STATE.currentFrame] || frames[0];

    // 각 파츠 돔 갱신
    const pHead = document.getElementById("battle-head");
    const pTorso = document.getElementById("battle-torso");
    const pRArm = document.getElementById("battle-r-arm");
    const pLArm = document.getElementById("battle-l-arm");
    const pLegs = document.getElementById("battle-legs");

    if (pHead && pTorso && pRArm && pLArm && pLegs) {
      // 렌더링 모드 검사
      if (STATE.renderMode === "parts") {
        // 파츠 모드: 내부 피격 픽셀 드로잉 블록 노출 및 각도 변형
        pHead.className = "part drawn drawn-head";
        pTorso.className = "part drawn drawn-torso";
        pRArm.className = "part drawn drawn-arm";
        pLArm.className = "part drawn drawn-arm";
        pLegs.className = "part drawn drawn-legs";

        pHead.style.backgroundImage = "none";
        pTorso.style.backgroundImage = "none";
        pRArm.style.backgroundImage = "none";
        pLArm.style.backgroundImage = "none";
        pLegs.style.backgroundImage = "none";
        DOM.battleAgentAvatar.style.backgroundImage = "none";
        DOM.battleAgentAvatar.style.transform = "none";
      } else {
        // 일러스트 모드: 스킨 리소스를 캡쳐 오버레이하거나 트레이니 스킨 세팅
        pHead.className = "part";
        pTorso.className = "part";
        pRArm.className = "part";
        pLArm.className = "part";
        pLegs.className = "part";

        const genderSuffix = STATE.gender === "female" ? "female" : "male";
        let skinImg = `assets/agents/agent_${genderSuffix}_trainee_${STATE.selectedRegion}.png`;
        if (STATE.nemesisEvolved) skinImg = `assets/agents/agent_${genderSuffix}_nemesis.png`;
        else if (STATE.ownedTraits.length > 0) skinImg = `assets/agents/agent_${genderSuffix}_body_mutation.png`;

        // 요원 전체 뷰어의 background로 스킨 세팅 후, 각도 변환만 반영
        DOM.battleAgentAvatar.style.backgroundImage = `url('${skinImg}')`;
        DOM.battleAgentAvatar.style.backgroundSize = "contain";
        DOM.battleAgentAvatar.style.backgroundRepeat = "no-repeat";
        DOM.battleAgentAvatar.style.backgroundPosition = "bottom center";
        DOM.battleAgentAvatar.style.transform = `translateY(${fData.torsoY - 38}px)`;
      }

      // 오프셋 대입
      pHead.style.transform = `translate(${fData.headOffset.x}px, ${fData.headOffset.y}px) rotate(${fData.headOffset.rotation}deg)`;
      pRArm.style.transform = `translate(${fData.rArmOffset.x - 66}px, ${fData.rArmOffset.y - 34}px) rotate(${fData.rArmOffset.rotation}deg)`;
      pLegs.style.transform = `translate(${fData.legsOffset.x - 42}px, ${fData.legsOffset.y - 82}px) rotate(${fData.legsOffset.rotation}deg)`;
      pTorso.style.transform = `translateY(${fData.torsoY - 38}px)`;

      // 왼팔 80도 입체감 원근법 연출: Z-index=4, 회전/오프셋 대칭 반전
      pLArm.style.transform = `translate(${-(fData.rArmOffset.x - 66) - 10}px, ${fData.rArmOffset.y - 34}px) rotate(${-fData.rArmOffset.rotation}deg)`;
    }
  }, tickDuration);
}

// 16. 전투 엔진 및 라운드 루프
function initBattleStage() {
  STATE.combatRunning = true;
  STATE.currentMotion = "idle";
  STATE.currentFrame = 0;
  startAnimationLoop();

  // 대미지 수치 싱크
  const stats = getDerivedStats();
  STATE.playerHp = stats.maxHp;
  DOM.battleAgentHpText.textContent = `${STATE.playerHp}/${stats.maxHp}`;
  document.getElementById("battleAgentHp").style.width = "100%";
  document.getElementById("battleAgentWrapper").classList.remove("defeated");
  document.getElementById("battleAgentAvatar").classList.remove("defeated");

  // 몬스터 3마리 소환
  const regionNum = STATE.selectedRegion;
  const regionMonsters = MONSTERS_DATABASE[regionNum] || MONSTERS_DATABASE[1];
  
  STATE.monsterParty = [];
  for (let i = 0; i < 3; i++) {
    // 보스전(6라운드)의 경우 무조건 최종 보스를 스폰
    let monsterTemplate;
    if (STATE.currentRound === 6) {
      monsterTemplate = regionMonsters.find(m => m.type === "boss") || regionMonsters[5];
    } else if (STATE.currentRound >= 4) {
      monsterTemplate = regionMonsters.find(m => m.type === "named") || regionMonsters[4];
    } else {
      // 일반 잡몹 4종 중 무작위
      monsterTemplate = regionMonsters[Math.floor(Math.random() * 4)];
    }
    
    // 사본 주입
    const mInstance = JSON.parse(JSON.stringify(monsterTemplate));
    STATE.monsterParty.push(mInstance);
    STATE.monsterHps[i] = mInstance.hp;
    STATE.monsterMaxHps[i] = mInstance.hp;

    // 몬스터 UI 갱신
    document.getElementById(`monster-name-${i}`).textContent = `${mInstance.name} (Lv.${regionNum})`;
    const mAvatar = document.getElementById(`battleMonsterAvatar${i}`);
    mAvatar.style.backgroundImage = `url('${mInstance.img}')`;
    mAvatar.classList.remove("defeated");

    // 이미지 에러 폴백
    const imgLoader = new Image();
    imgLoader.src = mInstance.img;
    imgLoader.onerror = () => {
      let fallback = "assets/monsters/m_1_1.png";
      if (mInstance.type === "named") fallback = "assets/monsters/m_1_named.png";
      if (mInstance.type === "boss") fallback = "assets/monsters/m_1_boss.png";
      mAvatar.style.backgroundImage = `url('${fallback}')`;
    };

    document.getElementById(`battleMonsterHp${i}`).style.width = "100%";
  }

  DOM.battleRegionText.textContent = `지역 ${regionNum}: ${REGIONS_METADATA[regionNum].name}`;
  DOM.battleProgressText.textContent = `라운드 ${STATE.currentRound}/6 (챕터 클리어 조건: 6라운드 격파)`;
  DOM.battleConsole.innerHTML = `<div class="log-item system">⚔️ 라운드 ${STATE.currentRound}전투가 개시되었습니다! 자동 전투 진행 중...</div>`;

  // 자동 전투 타이머 가동
  startCombatTimer();
}

function startCombatTimer() {
  if (STATE.combatTimer) clearInterval(STATE.combatTimer);

  const turnDelay = 1200 / STATE.gameSpeed; // 배속에 비례해 속도 단축

  STATE.combatTimer = setInterval(() => {
    if (!STATE.combatRunning) return;
    executeCombatTurn();
  }, turnDelay);
}

function stopBattleLoop() {
  STATE.combatRunning = false;
  if (STATE.combatTimer) clearInterval(STATE.combatTimer);
  if (STATE.animTimer) clearInterval(STATE.animTimer);
}

// 전투 로그 기록
function writeBattleLog(msg, type = "combat") {
  const line = document.createElement("div");
  line.className = `log-item ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  DOM.battleConsole.appendChild(line);
  DOM.battleConsole.scrollTop = DOM.battleConsole.scrollHeight;
}

// 전투 턴 로직
function executeCombatTurn() {
  const stats = getDerivedStats();
  
  // 1) 살아 있는 몬스터 타겟 지정
  let targetIndex = -1;
  for (let i = 0; i < 3; i++) {
    if (STATE.monsterHps[i] > 0) {
      targetIndex = i;
      break;
    }
  }

  // 몬스터 전멸 시 승리 처리
  if (targetIndex === -1) {
    handleRoundVictory();
    return;
  }

  // 2) 아군 선공
  const isSkill = Math.random() < 0.3; // 30% 확률로 특수 스킬
  STATE.currentMotion = isSkill ? "skill" : "attack";
  
  setTimeout(() => {
    STATE.currentMotion = "idle";
  }, 350 / STATE.gameSpeed);

  const targetMonster = STATE.monsterParty[targetIndex];
  
  // 치명타율 연산 (기본 10% + 감각 변이/테크 20% + 무기 가중치 등)
  let critRate = 0.10;
  if (STATE.ownedTraits.includes("sensory_tech")) critRate += 0.20;
  const isCrit = Math.random() < critRate;

  // 대미지 공산식 적용
  let rawAtk = stats.atk;
  // 버서커 광기: 잃은 체력 10%당 공격력 8% 증가
  if (STATE.ownedTraits.includes("berserker_madness")) {
    const lostHpPct = (stats.maxHp - STATE.playerHp) / stats.maxHp;
    rawAtk += Math.floor(rawAtk * (lostHpPct * 0.8));
  }

  const skillMult = isSkill ? 1.8 : 1.0;
  let damage = calculateDamage(rawAtk, targetMonster.def, skillMult, isCrit);

  // 멜트다운 융합 추가 버프
  if (STATE.ownedTraits.includes("meltdown_control") && (STATE.playerHp / stats.maxHp <= 0.3)) {
    damage = Math.floor(damage * 1.5);
  }

  // 피격 연출
  triggerHitVFX(targetIndex, false);
  triggerProjectile(isSkill ? "skill" : "attack");

  STATE.monsterHps[targetIndex] = Math.max(0, STATE.monsterHps[targetIndex] - damage);
  document.getElementById(`battleMonsterHp${targetIndex}`).style.width = `${(STATE.monsterHps[targetIndex] / STATE.monsterMaxHps[targetIndex]) * 100}%`;

  if (isCrit) {
    writeBattleLog(`💥 치명타 작렬! 요원이 ${targetMonster.name}에게 ${damage}의 피해를 주었습니다.`, "warning");
  } else {
    writeBattleLog(`⚔️ 요원이 ${targetMonster.name}에게 ${damage}의 피해를 입혔습니다.`, "combat");
  }

  // 흡혈 기능
  if (STATE.ownedTraits.includes("blood_absorption")) {
    const heal = Math.floor(damage * 0.25);
    STATE.playerHp = Math.min(stats.maxHp, STATE.playerHp + heal);
    DOM.battleAgentHpText.textContent = `${STATE.playerHp}/${stats.maxHp}`;
    document.getElementById("battleAgentHp").style.width = `${(STATE.playerHp / stats.maxHp) * 100}%`;
    writeBattleLog(`🧬 혈액 흡수로 체력 ${heal} 회복!`, "system");
  }

  // 몬스터 급사 시 체크
  if (STATE.monsterHps[targetIndex] <= 0) {
    document.getElementById(`battleMonsterAvatar${targetIndex}`).classList.add("defeated");
    writeBattleLog(`💀 괴수 [${targetMonster.name}]이(가) 쓰러졌습니다!`, "system");
  }

  // 3) 생존 괴수의 역습
  setTimeout(() => {
    if (!STATE.combatRunning) return;
    
    // 생존 괴수 전수 반격
    for (let i = 0; i < 3; i++) {
      if (STATE.monsterHps[i] > 0 && STATE.playerHp > 0) {
        const monster = STATE.monsterParty[i];
        
        // 세포 차폐 면역 배리어 검사 (매 라운드 2회 배리어)
        if (STATE.ownedTraits.includes("cellular_shield") && Math.random() < 0.25) {
          writeBattleLog(`🛡️ 세포 차폐 배리어가 괴수의 물리 강습을 상쇄했습니다!`, "system");
          continue;
        }

        const mDamage = Math.max(5, Math.floor(monster.atk * 1.5 - stats.def));
        
        STATE.playerHp = Math.max(0, STATE.playerHp - mDamage);
        
        // 요원 피격 연출
        triggerHitVFX(-1, true);
        
        DOM.battleAgentHpText.textContent = `${STATE.playerHp}/${stats.maxHp}`;
        document.getElementById("battleAgentHp").style.width = `${(STATE.playerHp / stats.maxHp) * 100}%`;

        writeBattleLog(`💥 강습 피격: ${monster.name}이(가) 요원에게 ${mDamage}의 타격을 가했습니다.`, "damage");

        if (STATE.playerHp <= 0) {
          handlePlayerDefeat();
          break;
        }
      }
    }
  }, 400 / STATE.gameSpeed);
}

// 대미지 공식 연산
function calculateDamage(atk, def, multiplier, isCrit) {
  let baseDmg = (atk * multiplier) - def;
  const minDmg = atk * 0.1;
  if (baseDmg < minDmg) baseDmg = minDmg;
  
  if (isCrit) baseDmg *= 1.5;
  return Math.floor(baseDmg);
}

// VFX 제어
function triggerHitVFX(targetIndex, isPlayer) {
  if (isPlayer) {
    const agentWrapper = document.getElementById("battleAgentWrapper");
    agentWrapper.classList.add("hit-blink");
    setTimeout(() => agentWrapper.classList.remove("hit-blink"), 120);
    
    DOM.battleScreenFlash.style.opacity = "0.5";
    setTimeout(() => DOM.battleScreenFlash.style.opacity = "0", 80);
  } else {
    const mWrapper = document.getElementById(`battleMonsterWrapper${targetIndex}`);
    if (mWrapper) {
      mWrapper.classList.add("hit-blink");
      setTimeout(() => mWrapper.classList.remove("hit-blink"), 120);
    }
  }

  // 화면 흔들림
  DOM.battleStageContainer.classList.add("shake-anim");
  setTimeout(() => DOM.battleStageContainer.classList.remove("shake-anim"), 150);
}

// 투사체 트리거
function triggerProjectile(actionType) {
  let projEl = document.getElementById("effectSlash");
  if (actionType === "skill") {
    // 50% 확률로 화살 또는 회전 도끼 발사
    projEl = Math.random() < 0.5 ? document.getElementById("effectArrow") : document.getElementById("effectAxe");
  }
  
  projEl.style.top = `${30 + Math.random() * 40}%`; // 무작위 높이
  projEl.className = `battle-projectile ${projEl.id.replace("effect","").toLowerCase()} fire-right`;
  
  setTimeout(() => {
    projEl.className = `battle-projectile ${projEl.id.replace("effect","").toLowerCase()}`;
  }, 350 / STATE.gameSpeed);
}

// 라운드 승리
function handleRoundVictory() {
  writeBattleLog(`🏆 라운드 ${STATE.currentRound} 토벌 완료!`, "system");
  
  if (STATE.currentRound < 6) {
    // 다음 라운드 진입
    STATE.currentRound++;
    setTimeout(() => {
      if (STATE.combatRunning) initBattleStage();
    }, 800 / STATE.gameSpeed);
  } else {
    // 6라운드 최종 승리 -> 챕터 완료!
    stopBattleLoop();
    
    // Rad 보상 정산
    const radReward = STATE.selectedRegion * 150 + 200;
    STATE.currentRad += radReward;
    DOM.townRadValue.textContent = STATE.currentRad;

    // 아이템 드롭 생성 및 가방에 밀어넣기
    const dropItem = generateRandomItem(STATE.selectedRegion);
    let invFullMessage = "";
    if (STATE.inventory.length < 20) {
      STATE.inventory.push(dropItem);
    } else {
      invFullMessage = " (가방이 가득 차 전리품을 유실했습니다!)";
    }

    // 맵 진척도 갱신
    if (STATE.selectedRegion === STATE.unlockedRegion) {
      STATE.unlockedRegion = Math.min(14, STATE.unlockedRegion + 1);
      // 14챕터 최종 클리어 플래그
      if (STATE.selectedRegion === 14) {
        STATE.everestCleared = true;
      }
    }

    DOM.clearRewardInfo.textContent = `전리품 정산: +${radReward} Rad 광석 및 장비 [${dropItem.name}] 획득!${invFullMessage}`;
    DOM.overlayClear.style.display = "flex";
  }
}

// 요원 전멸
function handlePlayerDefeat() {
  writeBattleLog(`💀 요원이 침식되어 쓰러졌습니다! 전투 불능 상태.`, "warning");

  // 이모탈 리바이어던 영구 무적 부활
  if (STATE.activeFusions.includes("immortal_leviathan")) {
    const stats = getDerivedStats();
    STATE.playerHp = stats.maxHp;
    DOM.battleAgentHpText.textContent = `${STATE.playerHp}/${stats.maxHp}`;
    document.getElementById("battleAgentHp").style.width = "100%";
    writeBattleLog(`☄️ [이모탈 리바이어던] 영구 무적 주신 부활 발동!`, "system");
    return;
  }

  stopBattleLoop();
  document.getElementById("battleAgentAvatar").classList.add("defeated");

  setTimeout(() => {
    alert("시뮬레이션 전멸! 안전 구역 마을로 회송 조치됩니다.");
    showScreen("town");
  }, 1000);
}

// 17. 배속 및 조립 렌더링 모드 토글 바인딩
DOM.btnGameSpeed.onclick = () => {
  if (STATE.gameSpeed === 1) {
    STATE.gameSpeed = 2;
  } else if (STATE.gameSpeed === 2) {
    STATE.gameSpeed = 4;
  } else {
    STATE.gameSpeed = 1;
  }
  DOM.btnGameSpeed.textContent = `⚡ 배속: ${STATE.gameSpeed}x`;
  
  // 전투 진행 중이면 타이머 재가동
  if (STATE.combatRunning) {
    startCombatTimer();
    startAnimationLoop();
  }
};

// 렌더 모드 토글 버튼 추가 장착
const toggleRenderBtn = document.createElement("button");
toggleRenderBtn.id = "btn-render-mode";
toggleRenderBtn.className = "btn-forager btn-speed";
toggleRenderBtn.style.marginLeft = "10px";
toggleRenderBtn.textContent = "🎨 모드: 일러스트";
document.querySelector(".battle-info-left").parentNode.appendChild(toggleRenderBtn);

toggleRenderBtn.onclick = () => {
  if (STATE.renderMode === "illustration") {
    STATE.renderMode = "parts";
    toggleRenderBtn.textContent = "⚙️ 모드: 파츠조립";
    writeBattleLog("🤖 렌더러 모드 전환: 10프레임 정적 파츠 리깅 조립기", "system");
  } else {
    STATE.renderMode = "illustration";
    toggleRenderBtn.textContent = "🎨 모드: 일러스트";
    writeBattleLog("🎨 렌더러 모드 전환: 일러스트 캡쳐 2.5D 스웨잉", "system");
  }
  // 파츠 초기화
  const pHead = document.getElementById("battle-head");
  const pTorso = document.getElementById("battle-torso");
  const pRArm = document.getElementById("battle-r-arm");
  const pLArm = document.getElementById("battle-l-arm");
  const pLegs = document.getElementById("battle-legs");
  if (pHead && pTorso && pRArm && pLArm && pLegs) {
    pHead.style.transform = "none";
    pTorso.style.transform = "none";
    pRArm.style.transform = "none";
    pLArm.style.transform = "none";
    pLegs.style.transform = "none";
  }
};

// 18. 전체 이벤트 위임 및 초기화
function initGame() {
  // 첫 화면 시작
  document.getElementById("btn-game-start").onclick = () => {
    showScreen("map");
    renderWorldMapPins();
  };

  // 마을 거점 클릭 이벤트 바인딩
  document.getElementById("town-building-shop").onclick = () => openModal("modal-shop");
  document.getElementById("town-building-lab").onclick = () => openModal("modal-trait-lab");
  document.getElementById("town-building-travel").onclick = () => {
    showScreen("map");
    renderWorldMapPins();
  };

  // 클리어 창 -> 마을 이동
  DOM.btnGoTown.onclick = () => {
    DOM.overlayClear.style.display = "none";
    showScreen("town");
  };

  // 기본 가방 장비 2종 지원 초기 셋업
  STATE.inventory.push(generateRandomItem(1));
  STATE.inventory.push(generateRandomItem(1));
  
  // 디버깅 방사능 초기 셋업
  STATE.currentRad = 500;
  
  writeBattleLog("🧬 PROJECT 2100 시뮬레이션 시스템이 완전히 적재되었습니다.", "system");
}

window.onload = () => {
  initGame();
};
