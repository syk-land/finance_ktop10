// Project 2100 - Core Game Engine
// Manages state, combat loop, progression, shop upgrades, evolution tree, and local storage.

const REGIONS_DATA = window.REGIONS_DATA = {
  1: { name: "시베리아 대황무지", desc: "혹한의 땅. 거대 변이 괴수들이 지배하는 야생 환경.", rewardChar: "시베리아 생존자", rewardTrait: "신체 변이 트리", rewardAI: "ursa", aiName: "우르사 (대지 붕괴)" },
  2: { name: "서유럽 원전 지대", desc: "대지 전체가 초고농도 방사능으로 뒤덮인 데드존.", rewardChar: "원전 방출자", rewardTrait: "에너지 방출 트리", rewardAI: "meltdown", aiName: "멜트다운 (핵 레이저)" },
  3: { name: "동아시아 메가시티", desc: "양자 컴퓨터의 전자파가 뒤엉킨 IT 폐허 구역.", rewardChar: "테크 스캐빈저", rewardTrait: "감각 변이/테크 트리", rewardAI: "glitch", aiName: "글리치 (시스템 오버로드)" },
  4: { name: "루마니아", desc: "타 생명체의 피와 전력을 갈구하는 약탈자 영토.", rewardChar: "흡혈 변이종", rewardTrait: "혈액 흡수 트리", rewardAI: "nosferatu", aiName: "노스페라투 (블러드 페스트)" },
  5: { name: "이집트", desc: "세포 변이로 썩지 않는 방사능 미라들이 출몰하는 무덤.", rewardChar: "무덤 파수꾼", rewardTrait: "세포 차폐 트리", rewardAI: "anubis", aiName: "아누비스 (낙진 모래폭풍)" },
  6: { name: "영국", desc: "방사능 가루를 날리는 페어리 변이종 서식지.", rewardChar: "방사능 마법사", rewardTrait: "요정 마법 트리", rewardAI: "pixie", aiName: "픽시 (푸른 마법 대폭발)" },
  7: { name: "몽골", desc: "방사능 거대마와 신체를 소형 핵발전기에 결합한 메카 기병대.", rewardChar: "핵추진 기병", rewardTrait: "동력 과부하 트리", rewardAI: "khan", aiName: "칸 (철기병 일제 돌격)" },
  8: { name: "중동", desc: "용암 변이 생물들이 서식하는 불타오르는 화염 대지.", rewardChar: "화염 변이체", rewardTrait: "열에너지 제어 트리", rewardAI: "ifrit", aiName: "이프리트 (지옥 불바다)" },
  9: { name: "그리스", desc: "강력한 초음파 환각을 쏘는 해양 변이종들이 지배하는 해상 구역.", rewardChar: "심해 잠수사", rewardTrait: "초음파 정신 교란 트리", rewardAI: "siren", aiName: "사이렌 (멸망의 공명)" },
  10: { name: "북유럽", desc: "고통을 잊고 도끼로 싸우는 버서커 부족 세력.", rewardChar: "오로라 버서커", rewardTrait: "버서커 광기 트리", rewardAI: "valkyrie", aiName: "발키리 (발할라의 격노)" },
  11: { name: "인도", desc: "머리가 여러 개 달린 변이 소를 숭배하는 광신도 구역.", rewardChar: "오염의 사제", rewardTrait: "오염 동화 트리", rewardAI: "brahma", aiName: "브라흐마 (정화의 광륜)" },
  12: { name: "우크라이나", desc: "체르노빌 원전 유적. 초고난도 파밍 및 괴수 득실.", rewardChar: "원전 수색대원", rewardTrait: "멜트다운 제어 트리", rewardAI: "core_breaker", aiName: "코어 브레이커 (인류 멸망 전조)" },
  13: { name: "스위스", desc: "알프스 지하 벙커. 무인 로봇군으로 구역 통제.", rewardChar: "벙커 엔지니어", rewardTrait: "하이테크 공학 트리", rewardAI: "defender", aiName: "디펜더 (절대 방어 벙커)" },
  14: { name: "에베레스트", desc: "방사능을 전신 흡수한 최종 괴물 빅풋 서식지.", rewardChar: "인류의 구원자", rewardTrait: "네메시스 트리", rewardAI: "bigfoot", aiName: "최종 레이드 보스" }
};

const LOOT_POOL = [
  "고농도 방사능 원광", "폐회로 양자 보드", "오염된 괴수의 심장", "티타늄 합금 기어",
  "액체 플라즈마 연료", "변이 융합 DNA 샘플", "방쇄 차폐 나노 섬유", "유라시아 전술 위성 칩",
  "안전 격리 캡슐 잠금장치", "초전도 플라스마 코일", "오염된 늑대의 발톱", "핵분열 연료봉 폐기물",
  "보조 AI 데이터 메모리", "독성 촉수 점액 분비샘", "전자기 펄스 유도 장치", "나노 로봇 혈청 백신",
  "알프스 지하 벙커 키카드", "최종 보스 빅풋의 털"
];

const ITEMS_DATA = window.ITEMS_DATA = {
  weapons: {
    "scrap_sword": { name: "고철 진동검", desc: "진동 격파로 130% 물리 피해.", price: 0, stat: { atk: 5 } },
    "bio_claw": { name: "생체 발톱", desc: "110% 피해 및 3턴간 출혈 디버프.", price: 200, stat: { atk: 8, spd: 2 } },
    "nuclear_gun": { name: "핵 슬러그 총", desc: "180% 광역 에너지 피해. 행동 속도 저하.", price: 600, stat: { atk: 15, spd: -2 } }
  },
  armors: {
    "ragged_clothes": { name: "누더기 옷", desc: "기본적인 가죽 가리개.", price: 0, stat: { def: 1 } },
    "basic_hazmat": { name: "방사능 차폐 hazmat", desc: "물리 방어 +3, 방사능 소지량 +1000.", price: 150, stat: { def: 3, cap: 1000 } },
    "armored_hazmat": { name: "장갑 특수 방호복", desc: "물리 방어 +8, 방사능 소지량 +2000.", price: 400, stat: { def: 8, cap: 2000 } },
    "heavy_power_armor": { name: "중장갑 파워 아머", desc: "물리 방어 +18, 속도 -3, 소지량 +5000.", price: 900, stat: { def: 18, spd: -3, cap: 5000 } }
  },
  cores: {
    "basic_core": { name: "구형 납 축전지", desc: "방사능 화폐 최대 소지량 5000.", price: 0, cap: 5000 },
    "mini_fission_core": { name: "소형 핵 분열 코어", desc: "방사능 화폐 최대 소지량 10000.", price: 250, cap: 10000 },
    "fury_generator": { name: "과충전 제네레이터", desc: "최대 소지량 25000, 공격력 +5.", price: 650, cap: 25000, stat: { atk: 5 } },
    "super_tokamak": { name: "휴대용 초소형 토카막", desc: "최대 소지량 100000, 속도 +4.", price: 1200, cap: 100000, stat: { spd: 4 } }
  },
  ais: {
    "gpt": { name: "지피티 (Chat-GPT)", desc: "[범용] 액티브 스킬 데미지 15% 상시 증가. 궁극기: 프롬프트 최적화.", price: 0 },
    "claude": { name: "클로드 (Claude)", desc: "[안정] 전투 시작 시 20% 보호막, 영구 사망(몬스터화) 확률 20% 경감.", price: 300 },
    "gemini": { name: "제미나이 (Gemini)", desc: "[탐색] 적 방어력 20% 상시 무시. 궁극기: 멀티모달 스캔.", price: 500 },
    "siri": { name: "시리 (Siri)", desc: "[확률] 15% 확률로 적 스킬 오독(팀킬 유도 또는 턴 스킵). 궁극기: 잘 이해하지 못했어요.", price: 400 },
    "grok": { name: "그록 (Grok)", desc: "[호전] 방어 15% 감소, 치명타 25% 상승, 적 전체 도발. 궁극기: 필터 없는 폭주.", price: 450 }
  }
};

const TRAITS_DATA = window.TRAITS_DATA = {
  // Basic Tiers
  "body_str": { name: "근근한 완력", desc: "공격력 +4 증가.", cost: 30 },
  "body_vit": { name: "방사능 피막", desc: "체력 +30 증가.", cost: 30 },
  "body_spd": { name: "신경 과부하", desc: "행동 속도 +2 증가.", cost: 30 },
  
  // Mutations
  "mut_claw": { name: "플라즈마 클로 장착", desc: "생체 발톱 파츠 획득, 평타 데미지 +10%.", cost: 100, mutation: "claw_purple" },
  "mut_wings": { name: "낙진 차폐 깃털", desc: "방어력 +3, 속도 +1, 날개 파츠 획득.", cost: 100, mutation: "wings_stitched" },
  "mut_tentacles": { name: "독성 촉수 다발", desc: "행동 속도 +3, 촉수 파츠 획득.", cost: 100, mutation: "tentacles_toxic" },
  
  // Stage 5 Hybrid Fusion (Requires region clears to be unlocked!)
  "plasma_beast": { name: "플라즈마 거수 (5단계)", desc: "[시베리아 + 서유럽] 광역 물리+에너지 복합 데미지 공격 해금.", cost: 250, req: ["1", "2"] },
  "quantum_destroyer": { name: "양자 파괴자 (5단계)", desc: "[서유럽 + 동아시아] 전자기 유도탄 해금, 기계 속성 적 무력화.", cost: 250, req: ["2", "3"] },
  "nano_vampire": { name: "나노 흡혈귀 (5단계)", desc: "[동아시아 + 루마니아] 흡혈 시마다 아군 보조 AI 쿨타임 2턴 감소.", cost: 250, req: ["3", "4"] },
  "undead_immortal": { name: "불멸의 언데드 (5단계)", desc: "[루마니아 + 이집트] 사망 시 1회 부활 (소지 방사능량에 비례해 체력 회복).", cost: 250, req: ["4", "5"] },
  "ash_lord": { name: "잿더미 군주 (5단계)", desc: "[이집트 + 중동] 피격 시 오염 폭발로 무한 중첩 화상 유발.", cost: 250, req: ["5", "8"] },
  "lava_tsunami": { name: "용암 해일 (5단계)", desc: "[중동 + 그리스] 광역 화상 부여 및 화상 대상 1턴 혼란(팀킬).", cost: 250, req: ["8", "9"] },
  "illusion_goblin": { name: "환각의 도깨비 (5단계)", desc: "[그리스 + 영국] 분신 3마리 생성, 분신 소멸 시 적 전체 기절.", cost: 250, req: ["9", "6"] },
  "aurora_sprite": { name: "오로라 정령 (5단계)", desc: "[영국 + 북유럽] 스킬 사용 시 쿨타임 대신 공격력 50% 영구 증폭.", cost: 250, req: ["6", "10"] },
  "steel_raider": { name: "강철 약탈자 (5단계)", desc: "[북유럽 + 몽골] 적 1회 행동 시 3회 연속 턴 획득.", cost: 250, req: ["10", "7"] },
  "mechanic_titan": { name: "메카닉 타이탄 (5단계)", desc: "[몽골 + 시베리아] 상태이상 면역 및 적 방어력 80% 무시.", cost: 250, req: ["7", "1"] },

  // Stage 6 Advanced Super (Requires Stage 5 hybrids!)
  "leviathan": { name: "리바이어던 (6단계)", desc: "[거수+타이탄] 적 전체 짓밟기, 적 타격 시 소지 한계치 무한 확장.", cost: 600, reqTraits: ["plasma_beast", "mechanic_titan"] },
  "death_star": { name: "데스 스타 (6단계)", desc: "[양자+정령] 보조 AI의 궁극기 쿨타임 완전 삭제 및 자동 연사.", cost: 600, reqTraits: ["quantum_destroyer", "aurora_sprite"] },
  "nosferatu_lord": { name: "노스페라투 군주 (6단계)", desc: "[흡혈귀+언데드] 사망 시 3턴간 '무적 방사능 유령' 상태로 지속 공격.", cost: 600, reqTraits: ["nano_vampire", "undead_immortal"] },
  "ragnarok": { name: "라그나로크 (6단계)", desc: "[잿더미+해일] 맵 배경을 핵폭발 상태로 고정, 적에게 매초 고정 도트딜.", cost: 600, reqTraits: ["ash_lord", "lava_tsunami"] },
  "cosmic_fairy": { name: "코스믹 페어리 (6단계)", desc: "[도깨비+정령] 적 보스 쿨타임 강제 최대화, 아군 쿨타임 영구 삭제.", cost: 600, reqTraits: ["illusion_goblin", "aurora_sprite"] },

  // Stage 7 Ultimate
  "nemesis": { name: "네메시스 : 아포칼립스의 신 (7단계)", desc: "영구 사망(몬스터화) 리스크 0%. 사망 시 멸망의 주신 각성, 적 전멸 및 대 보스 핵폭탄 딜.", cost: 1200, reqTraits: ["leviathan", "death_star", "nosferatu_lord", "ragnarok", "cosmic_fairy"] }
};

class GameEngine {
  constructor() {
    this.defaultState = {
      character: {
        name: "생존자 2100",
        level: 1,
        xp: 0,
        xpNeeded: 100,
        hp: 100,
        maxHp: 100,
        baseAtk: 10,
        baseDef: 2,
        baseSpd: 10,
        headPart: 1,
        bodyPart: 1,
        weapon: "scrap_sword",
        armor: "ragged_clothes",
        core: "basic_core",
        ai: "gpt",
        activeMutations: [],
        evolutionTier: 1,
        evolvedTraits: [],
        spriteSheetConfig: {
          enabled: true,
          url: "/player_sprite.png",
          cols: 10,
          rows: 4,
          frameInterval: 250,
          currentFrame: 0,
          currentState: "idle",
          mappings: {
            idle: { row: 0, frames: 10 },
            walk: { row: 1, frames: 10 },
            attack: { row: 2, frames: 10 },
            special_attack: { row: 3, frames: 10 }
          }
        }
      },
      currentRegionId: 1,
      unlockedRegions: [1, 2, 3], // Starting regions A, B, C
      completedRegions: [],
      selectionOrder: [], // Track region choice sequence for level scaling
      monsterizedBosses: {}, // regionId -> custom boss config
      resources: {
        radiation: 150 // Start cash
      },
      inventory: {
        weapons: ["scrap_sword"],
        armors: ["ragged_clothes"],
        cores: ["basic_core"],
        ais: ["gpt"],
        collectedLoots: []
      },
      currentExploration: null, // null or exploration state
      logs: ["프로젝트 2100 시뮬레이터가 구동되었습니다."]
    };

    this.state = JSON.parse(JSON.stringify(this.defaultState));
    this.combatState = null;
    this.combatInterval = null;
    this.combatSpeed = 1; // 1, 2, 4, 999 (instant)
    this.autoCombat = true;
  }

  loadGame() {
    try {
      const saved = localStorage.getItem("project2100_save");
      if (saved) {
        this.state = JSON.parse(saved);
        // Ensure starting regions are always unlocked if empty
        if (!this.state.unlockedRegions || this.state.unlockedRegions.length === 0) {
          this.state.unlockedRegions = [1, 2, 3];
        }
        if (!this.state.inventory.collectedLoots) {
          this.state.inventory.collectedLoots = [];
        }
        if (!this.state.character.spriteSheetConfig) {
          this.state.character.spriteSheetConfig = JSON.parse(JSON.stringify(this.defaultState.character.spriteSheetConfig));
        }
        this.addLog("저장된 게임 데이터를 성공적으로 불렀습니다.");
        return true;
      }
    } catch (e) {
      console.error("Save load failed", e);
    }
    this.state = JSON.parse(JSON.stringify(this.defaultState));
    return false;
  }

  saveGame() {
    try {
      localStorage.setItem("project2100_save", JSON.stringify(this.state));
    } catch (e) {
      console.error("Save write failed", e);
    }
  }

  resetGame() {
    this.state = JSON.parse(JSON.stringify(this.defaultState));
    this.saveGame();
    this.addLog("게임 데이터를 완전히 초기화했습니다.");
  }

  addLog(msg) {
    const time = new Date().toLocaleTimeString();
    this.state.logs.push(`[${time}] ${msg}`);
    if (this.state.logs.length > 50) this.state.logs.shift();
    if (window.UI) window.UI.updateLogs();
  }

  // Calculate Character Stats dynamically based on Level, Gear, and Evolved Traits
  getStats() {
    const c = this.state.character;
    
    // Level scaling: +5% HP, +5% Atk, +2% Def per level
    let hpMultiplier = 1 + (c.level - 1) * 0.08;
    let atkMultiplier = 1 + (c.level - 1) * 0.06;
    
    let maxHp = Math.floor(c.maxHp * hpMultiplier);
    let atk = Math.floor(c.baseAtk * atkMultiplier);
    let def = Math.floor(c.baseDef + (c.level - 1) * 0.3);
    let spd = c.baseSpd;
    let radCapacity = 5000;

    // Apply Gear
    if (c.weapon && ITEMS_DATA.weapons[c.weapon]) {
      const w = ITEMS_DATA.weapons[c.weapon];
      if (w.stat.atk) atk += w.stat.atk;
      if (w.stat.spd) spd += w.stat.spd;
    }
    if (c.armor && ITEMS_DATA.armors[c.armor]) {
      const a = ITEMS_DATA.armors[c.armor];
      if (a.stat.def) def += a.stat.def;
      if (a.stat.spd) spd += a.stat.spd;
      if (a.stat.cap) radCapacity += a.stat.cap;
    }
    if (c.core && ITEMS_DATA.cores[c.core]) {
      const co = ITEMS_DATA.cores[c.core];
      radCapacity = co.cap;
      if (co.stat) {
        if (co.stat.atk) atk += co.stat.atk;
        if (co.stat.spd) spd += co.stat.spd;
      }
    }

    // Apply Trait Bonuses
    c.evolvedTraits.forEach(traitId => {
      const t = TRAITS_DATA[traitId];
      if (t) {
        if (traitId === "body_str") atk += 4;
        if (traitId === "body_vit") maxHp += 30;
        if (traitId === "body_spd") spd += 2;
        if (traitId === "mut_wings") {
          def += 3;
          spd += 1;
        }
        if (traitId === "mut_tentacles") spd += 3;
      }
    });

    // Special: Grok debuffs defense, buffs crit
    if (c.ai === "grok") {
      def = Math.max(0, Math.floor(def * 0.85));
    }

    return { maxHp, atk, def, spd, radCapacity };
  }

  // Calculate monsterization (영구 사망) probability on death
  getMonsterizationProb(currentRad) {
    const { radCapacity } = this.getStats();
    if (this.state.character.evolvedTraits.includes("nemesis")) {
      return 0; // 7th tier Nemesis: 0% risk
    }

    let p = 0;
    if (currentRad <= radCapacity) {
      // Exponential scaling up to 30% at capacity limit
      p = ((Math.exp(currentRad / radCapacity) - 1) / (Math.exp(1) - 1)) * 30;
    } else {
      // Escalating fast over 100% capacity
      const excessRatio = (currentRad - radCapacity) / radCapacity;
      p = 30 + 70 * (1 - Math.exp(-2 * excessRatio));
    }

    // Claude AI provides a 20% relative reduction
    if (this.state.character.ai === "claude") {
      p = p * 0.8;
    }

    return Math.min(100, Math.max(0, Math.floor(p)));
  }

  // Evolve character trait
  buyUpgrade(type, itemId) {
    const item = ITEMS_DATA[type][itemId];
    if (!item) return false;
    
    if (this.state.resources.radiation >= item.price) {
      this.state.resources.radiation -= item.price;
      
      if (!this.state.inventory[type].includes(itemId)) {
        this.state.inventory[type].push(itemId);
      }
      
      // Auto-equip
      const slotMap = { weapons: "weapon", armors: "armor", cores: "core", ais: "ai" };
      this.state.character[slotMap[type]] = itemId;
      
      this.addLog(`${item.name} 장비를 구매하여 장착했습니다.`);
      this.saveGame();
      if (window.sfx) window.sfx.playEvolve();
      return true;
    }
    return false;
  }

  equipItem(type, itemId) {
    if (this.state.inventory[type] && this.state.inventory[type].includes(itemId)) {
      const slotMap = { weapons: "weapon", armors: "armor", cores: "core", ais: "ai" };
      this.state.character[slotMap[type]] = itemId;
      this.addLog(`${ITEMS_DATA[type][itemId].name}(으)로 장비를 교체했습니다.`);
      this.saveGame();
      if (window.sfx) window.sfx.playClick();
      return true;
    }
    return false;
  }

  buyTrait(traitId) {
    const t = TRAITS_DATA[traitId];
    if (!t) return false;
    
    // Check prerequisites
    if (t.req) {
      // Check region clears
      const hasReqRegions = t.req.every(rNum => this.state.completedRegions.includes(parseInt(rNum)));
      if (!hasReqRegions) {
        this.addLog("이 특성을 융합하기 위한 지역 완파 보상이 부족합니다.");
        return false;
      }
    }
    if (t.reqTraits) {
      const hasReqTraits = t.reqTraits.every(trId => this.state.character.evolvedTraits.includes(trId));
      if (!hasReqTraits) {
        this.addLog("선행 특성 노드가 개방되어야 합니다.");
        return false;
      }
    }

    if (this.state.resources.radiation >= t.cost && !this.state.character.evolvedTraits.includes(traitId)) {
      this.state.resources.radiation -= t.cost;
      this.state.character.evolvedTraits.push(traitId);
      
      // If trait has visual mutation modification
      if (t.mutation && !this.state.character.activeMutations.includes(t.mutation)) {
        this.state.character.activeMutations.push(t.mutation);
      }

      // Check if it's a hybrid fusion trait to update player sprite skin
      const hybridUrls = {
        plasma_beast: "/plasma_beast_sprite.png",
        quantum_destroyer: "/quantum_destroyer_sprite.png",
        nano_vampire: "/nano_vampire_sprite.png",
        undead_immortal: "/undead_immortal_sprite.png",
        ash_lord: "/ash_lord_sprite.png",
        lava_tsunami: "/lava_tsunami_sprite.png",
        illusion_goblin: "/illusion_goblin_sprite.png",
        aurora_sprite: "/aurora_sprite_sprite.png",
        steel_raider: "/steel_raider_sprite.png",
        mechanic_titan: "/mechanic_titan_sprite.png"
      };

      if (hybridUrls[traitId] && this.state.character.spriteSheetConfig) {
        this.state.character.spriteSheetConfig.url = hybridUrls[traitId];
        this.state.character.spriteSheetConfig.rows = 4;
        this.state.character.spriteSheetConfig.transparentUrl = null;
        this.state.character.spriteSheetConfig.cols = 10;
        this.state.character.spriteSheetConfig.mappings = {
          idle: { row: 0, frames: 10 },
          walk: { row: 1, frames: 10 },
          attack: { row: 2, frames: 10 },
          special_attack: { row: 3, frames: 10 }
        };
      }

      // Handle Tier upgrades
      if (t.reqTraits) {
        this.state.character.evolutionTier = Math.max(this.state.character.evolutionTier, 5);
      }
      if (traitId === "nemesis") {
        this.state.character.evolutionTier = 7;
      } else if (this.state.character.evolutionTier < 5 && this.state.character.evolvedTraits.length >= 6) {
        this.state.character.evolutionTier = 4;
      } else if (this.state.character.evolutionTier < 4 && this.state.character.evolvedTraits.length >= 3) {
        this.state.character.evolutionTier = 3;
      } else if (this.state.character.evolutionTier < 3 && this.state.character.evolvedTraits.length >= 1) {
        this.state.character.evolutionTier = 2;
      }

      this.addLog(`신체 개조 특성 [${t.name}]을 진화시켰습니다.`);
      this.saveGame();
      if (window.sfx) window.sfx.playEvolve();
      return true;
    }
    return false;
  }

  // World Map region selection and enemy level scaling
  enterRegion(regionId) {
    if (this.state.currentExploration) return;
    
    // Add to selectionOrder if new
    if (!this.state.selectionOrder.includes(regionId)) {
      this.state.selectionOrder.push(regionId);
    }
    
    const scaleIndex = this.state.selectionOrder.indexOf(regionId);
    const enemyLevel = 1 + scaleIndex * 10;
    
    const isCompleted = this.state.completedRegions.includes(regionId);
    this.state.currentExploration = {
      regionId: regionId,
      chapter: 1,
      round: isCompleted ? 10 : 1,
      battle: 1, // 1 to 10. 10th battle in round is Boss.
      enemyLevel: enemyLevel,
      radGathered: 0,
      charCurrentHp: this.getStats().maxHp
    };

    this.addLog(`${REGIONS_DATA[regionId].name} 지역 탐험을 시작합니다. (적 추정 레벨: ${enemyLevel})`);
    this.saveGame();
    if (window.sfx) window.sfx.playClick();
    this.startBattle();
  }

  // Setup Combat States
  startBattle() {
    if (!this.state.currentExploration) return;
    
    const exp = this.state.currentExploration;
    const stats = this.getStats();
    
    // Check if this region has a custom monsterized boss registered, and it's the final round boss
    const isBossFight = exp.battle === 10;
    let enemy = null;
    
    if (isBossFight && this.state.monsterizedBosses[exp.regionId]) {
      // Spawn our custom monsterized boss!
      const bossConfig = this.state.monsterizedBosses[exp.regionId];
      enemy = {
        name: `타락한 변종 [${bossConfig.name}]`,
        level: bossConfig.level,
        hp: bossConfig.hp,
        maxHp: bossConfig.maxHp,
        atk: bossConfig.atk,
        def: bossConfig.def,
        spd: bossConfig.spd,
        type: "custom_boss",
        config: bossConfig, // Visual config
        actionMeter: 0
      };
      this.addLog(`⚠️ 긴급 경보: 과거 몬스터화되었던 아군 [${bossConfig.name}]이 네임드 보스로 등장합니다!`);
    } else if (isBossFight) {
      // Standard regional boss
      const regionName = REGIONS_DATA[exp.regionId].name;
      const multiplier = 1 + exp.enemyLevel * 0.15;
      
      // Everest boss Bigfoot
      const isEverest = exp.regionId === 14;
      enemy = {
        name: isEverest ? "아포칼립스 거수 [빅풋]" : `${regionName} 수호 괴수`,
        level: exp.enemyLevel + 5,
        hp: Math.floor((isEverest ? 1500 : 300) * multiplier),
        maxHp: Math.floor((isEverest ? 1500 : 300) * multiplier),
        atk: Math.floor((isEverest ? 45 : 16) * multiplier),
        def: Math.floor((isEverest ? 15 : 6) * multiplier),
        spd: 9 + Math.floor(exp.enemyLevel * 0.1),
        type: isEverest ? "boss_bigfoot" : "bear",
        actionMeter: 0
      };
      this.addLog(`⚔️ 보스전 돌입: ${enemy.name} (Lv.${enemy.level})`);
    } else {
      // Normal fight (9 rounds of sequence)
      const enemyTypes = ["wolf", "drone", "mummy"];
      const randType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const multiplier = 1 + exp.enemyLevel * 0.08;
      
      let baseHp = 35;
      let baseAtk = 4;
      let baseDef = 1;
      let baseSpd = 7;
      
      if (randType === "drone") {
        baseHp = 25; baseAtk = 6; baseDef = 3; baseSpd = 11;
      } else if (randType === "mummy") {
        baseHp = 50; baseAtk = 3; baseDef = 1; baseSpd = 5;
      }

      enemy = {
        name: `오염된 변종 (${randType === "wolf" ? "늑대" : randType === "drone" ? "경비 기계" : "미라"})`,
        level: exp.enemyLevel,
        hp: Math.floor(baseHp * multiplier),
        maxHp: Math.floor(baseHp * multiplier),
        atk: Math.floor(baseAtk * multiplier),
        def: Math.floor(baseDef * (1 + exp.enemyLevel * 0.03)),
        spd: baseSpd + Math.floor(exp.enemyLevel * 0.05),
        type: randType,
        actionMeter: 0
      };
    }

    // Initialize Combat state
    this.combatState = {
      player: {
        name: this.state.character.name,
        hp: exp.charCurrentHp,
        maxHp: stats.maxHp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
        actionMeter: 0,
        skillCooldown: 0,
        aiUltimateCharge: 20, // starts at 20%
        aiUltimateCooldown: 0,
        shield: 0,
        buffs: {},
        debuffs: {},
        invincibleTurns: 0,
        revived: false,
        ghostTurns: 0
      },
      enemy: enemy,
      combatLog: [],
      speed: this.combatSpeed,
      isFinished: false,
      winner: null
    };

    // Apply Claude AI starting shield
    if (this.state.character.ai === "claude") {
      this.combatState.player.shield = Math.floor(stats.maxHp * 0.2);
      this.addCombatLog("🛡️ [클로드 안정 가이드라인] 시작 배리어 활성화!");
    }

    if (window.UI) {
      window.UI.initCombatScreen();
    }

    this.runCombatLoop();
  }

  addCombatLog(msg) {
    if (this.combatState) {
      this.combatState.combatLog.push(msg);
      if (this.combatState.combatLog.length > 30) this.combatState.combatLog.shift();
      if (window.UI) window.UI.updateCombatLog();
    }
  }

  // The actual action tick loop
  runCombatLoop() {
    if (this.combatInterval) clearInterval(this.combatInterval);
    if (this.combatSpeed === 999) {
      // Instant calculation
      while (!this.combatState.isFinished) {
        this.tickCombat();
      }
      this.finishBattle();
    } else {
      // Animated calculation
      const intervalMs = 200 / this.combatSpeed;
      this.combatInterval = setInterval(() => {
        this.tickCombat();
        if (this.combatState.isFinished) {
          clearInterval(this.combatInterval);
          this.finishBattle();
        }
      }, intervalMs);
    }
  }

  pauseCombat() {
    if (this.combatInterval) {
      clearInterval(this.combatInterval);
      this.combatInterval = null;
      this.addLog("⏸️ 전투가 일시정지되었습니다.");
    }
  }

  resumeCombat() {
    if (this.combatState && !this.combatState.isFinished && !this.combatInterval) {
      this.addLog("▶️ 전투가 재개되었습니다.");
      this.runCombatLoop();
    }
  }

  setCombatSpeed(speed) {
    this.combatSpeed = speed;
    if (this.combatState) {
      this.combatState.speed = speed;
    }
    if (window.UI) window.UI.updateSpeedControls();
    // Restart loop with new speed if fighting
    if (this.combatState && !this.combatState.isFinished) {
      this.runCombatLoop();
    }
  }

  tickCombat() {
    if (!this.combatState || this.combatState.isFinished) return;

    const p = this.combatState.player;
    const e = this.combatState.enemy;

    // Apply ticking buffs/debuffs
    // Increment action meters
    p.actionMeter += p.spd * 0.4;
    e.actionMeter += e.spd * 0.4;

    // Trigger AI automatic actions or updates
    if (p.actionMeter >= 100) {
      p.actionMeter -= 100;
      this.triggerPlayerTurn();
    }

    if (e.actionMeter >= 100 && !this.combatState.isFinished) {
      e.actionMeter -= 100;
      this.triggerEnemyTurn();
    }

    // Check Siri Passive skip
    if (this.state.character.ai === "siri" && Math.random() < 0.02 && !this.combatState.isFinished) {
      e.actionMeter = 0;
      this.addCombatLog("🤖 [시리: 잘 이해하지 못했어요] 적의 명령 입력을 잘못 전달하여 한 턴 정지!");
      if (window.sfx) window.sfx.playAlarm();
    }

    if (window.UI && this.combatSpeed !== 999) {
      window.UI.renderCombatArena();
    }
  }

  triggerPlayerTurn() {
    const p = this.combatState.player;
    const e = this.combatState.enemy;
    const c = this.state.character;

    // Reduce cooldowns
    if (p.skillCooldown > 0) p.skillCooldown--;
    if (p.aiUltimateCooldown > 0) p.aiUltimateCooldown--;
    
    // Ghost form check
    if (p.ghostTurns > 0) {
      p.ghostTurns--;
      if (p.ghostTurns === 0) {
        this.playerKilled();
        return;
      }
    }

    // Charge AI Ultimate
    p.aiUltimateCharge = Math.min(100, p.aiUltimateCharge + 12);

    // Auto-cast Skills if auto combat is active
    let skillUsed = false;
    
    // Steel Raider active (extra action turns)
    let turns = 1;
    if (c.evolvedTraits.includes("steel_raider")) {
      if (Math.random() < 0.4) {
        turns = 3;
        this.addCombatLog("⚡ [강철 약탈자] 초속 행동 3연속 턴 획득!");
      }
    }

    for (let t = 0; t < turns; t++) {
      if (e.hp <= 0) break;

      // Check for skill usage
      if (p.skillCooldown === 0) {
        this.usePlayerSkill();
        skillUsed = true;
      } else {
        // Basic attack
        this.executePlayerAttack();
      }
      
      // Auto-cast AI Ultimate
      if (this.autoCombat && p.aiUltimateCharge >= 100 && p.aiUltimateCooldown === 0) {
        this.useAiUltimate();
      }
    }
  }

  executePlayerAttack() {
    const p = this.combatState.player;
    const e = this.combatState.enemy;
    const c = this.state.character;

    let dmg = p.atk;

    // Gemini Passive: Ignores 20% def
    let defToApply = e.def;
    if (c.ai === "gemini") {
      defToApply = Math.floor(defToApply * 0.8);
    }
    // Mechanic Titan ignores 80% def
    if (c.evolvedTraits.includes("mechanic_titan")) {
      defToApply = Math.floor(defToApply * 0.2);
    }

    // Calculate final damage
    let finalDmg = Math.max(1, dmg - defToApply);
    
    // Critical roll (Grok buffs crit)
    let isCrit = false;
    let critChance = c.ai === "grok" ? 0.25 : 0.05;
    if (Math.random() < critChance) {
      isCrit = true;
      finalDmg = Math.floor(finalDmg * 1.5);
    }

    e.hp = Math.max(0, e.hp - finalDmg);
    
    // SFX
    if (window.sfx && this.combatSpeed !== 999) {
      if (c.weapon === "nuclear_gun") window.sfx.playShoot();
      else window.sfx.playSlash();
    }

    // Combat logs
    const critText = isCrit ? "💥 치명타!" : "⚔️";
    const weaponActionText = c.weapon === "scrap_sword" ? "진동검으로 벱니다" : c.weapon === "bio_claw" ? "발톱으로 할큅니다" : "핵추진 유탄을 쏩니다";
    this.addCombatLog(`${critText} 아군이 ${weaponActionText}. [적 HP -${finalDmg}] (남은 HP: ${e.hp}/${e.maxHp})`);
    
    if (window.UI && this.combatSpeed !== 999) {
      window.UI.spawnTextEffect(false, `-${finalDmg}`, isCrit ? "#ffeb3b" : "#ffffff");
      window.UI.triggerActionAnimation("player", "attack");
      window.UI.triggerActionAnimation("enemy", "hit");
    }

    // Apply bleeding from bio_claw
    if (c.weapon === "bio_claw" && Math.random() < 0.4) {
      const bleedDmg = Math.max(1, Math.floor(p.atk * 0.2));
      e.hp = Math.max(0, e.hp - bleedDmg);
      this.addCombatLog(`🩸 출혈 유발! 적이 추가 생체 대미지를 입습니다. [-${bleedDmg}]`);
    }

    // Ash Lord passive burn counter
    if (c.evolvedTraits.includes("ash_lord") && Math.random() < 0.3) {
      const burnDmg = 5;
      e.hp = Math.max(0, e.hp - burnDmg);
      this.addCombatLog(`🔥 [잿더미 군주] 낙진 화상 대미지 누적! [-${burnDmg}]`);
    }

    this.checkCombatVictory();
  }

  usePlayerSkill() {
    const p = this.combatState.player;
    const e = this.combatState.enemy;
    const c = this.state.character;

    // Determine skill based on highest evolution/traits
    let skillName = "레이저 참격";
    let dmgMultiplier = 1.3;
    let cd = 3;

    if (c.evolvedTraits.includes("plasma_beast")) {
      skillName = "☢️ 플라즈마 대붕괴";
      dmgMultiplier = 2.2;
      cd = 4;
    } else if (c.evolvedTraits.includes("quantum_destroyer")) {
      skillName = "⚡ 양자 파쇄 유도탄";
      dmgMultiplier = 1.8;
      cd = 4;
    } else if (c.evolvedTraits.includes("nano_vampire")) {
      skillName = "🩸 나노 피 가로채기";
      dmgMultiplier = 1.5;
      cd = 4;
    }

    // Apply skill damage
    let dmg = Math.floor(p.atk * dmgMultiplier);
    
    // GPT AI buffs active skill damage by 15%
    if (c.ai === "gpt") {
      dmg = Math.floor(dmg * 1.15);
    }

    let finalDmg = Math.max(1, dmg - e.def);
    e.hp = Math.max(0, e.hp - finalDmg);

    p.skillCooldown = cd;
    
    // Aurora Sprite special: no cooldown, but permanent +50% Atk
    if (c.evolvedTraits.includes("aurora_sprite")) {
      p.skillCooldown = 0;
      p.atk = Math.floor(p.atk * 1.5);
      this.addCombatLog("✨ [오로라 정령] 쿨타임 무시 및 공격력 50% 영구 증폭!");
    }

    this.addCombatLog(`🔥 스킬 발동! [${skillName}]! 적에게 대미지를 가합니다. [적 HP -${finalDmg}]`);
    
    if (window.sfx && this.combatSpeed !== 999) {
      window.sfx.playLaser();
    }

    if (window.UI && this.combatSpeed !== 999) {
      window.UI.spawnTextEffect(false, `-${finalDmg}`, "#d000ff");
      window.UI.triggerActionAnimation("player", "skill");
      window.UI.triggerActionAnimation("enemy", "hit");
      window.UI.spawnLaserEffect();
    }

    // Vampiric drain
    if (c.evolvedTraits.includes("nano_vampire")) {
      const healAmt = Math.floor(finalDmg * 0.4);
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      p.aiUltimateCharge = Math.min(100, p.aiUltimateCharge + 20); // reduces AI cooldown / charges
      this.addCombatLog(`🩸 나노 흡혈 활성화! [체력 +${healAmt}] 회복하고 보조 AI를 가속합니다.`);
      if (window.sfx && this.combatSpeed !== 999) window.sfx.playHeal();
    }

    // Quantum Destroyer stun against mechanical units
    if (c.evolvedTraits.includes("quantum_destroyer") && e.type === "drone") {
      e.actionMeter = Math.max(0, e.actionMeter - 50);
      this.addCombatLog("⚡ EMP 과부하! 경비 드론의 행동 속도 게이지가 대폭 감소합니다.");
    }

    this.checkCombatVictory();
  }

  useAiUltimate() {
    const p = this.combatState.player;
    const e = this.combatState.enemy;
    const c = this.state.character;

    p.aiUltimateCharge = 0;
    p.aiUltimateCooldown = 4; // 4 turns cooldown

    let dmg = Math.floor(p.atk * 1.8);
    let stun = false;
    let effectText = "";

    // Specific AI Ultimate mechanics
    const activeAi = c.ai;
    if (activeAi === "gpt") {
      effectText = "[지피티 프롬프트 오버클럭] 전역 데미지 폭증!";
      dmg = Math.floor(dmg * 1.4);
      e.def = Math.max(0, e.def - 5); // reduce enemy defense permanently
    } else if (activeAi === "claude") {
      effectText = "[클로드 절대 헌장 보호막] 대량 배리어 주사!";
      p.shield += Math.floor(p.maxHp * 0.4);
      dmg = 0;
    } else if (activeAi === "gemini") {
      effectText = "[제미나이 멀티모달 스캔 탄막]";
      dmg = Math.floor(dmg * 2.2); // ignores defense basically
      dmg = dmg - Math.floor(e.def * 0.2);
    } else if (activeAi === "siri") {
      effectText = "[시리 잘 알아듣지 못한 오인 사격]";
      if (Math.random() < 0.6) {
        stun = true;
        dmg = Math.floor(dmg * 2.0);
      } else {
        // self harm
        const selfHarm = Math.floor(p.maxHp * 0.15);
        p.hp = Math.max(1, p.hp - selfHarm);
        this.addCombatLog(`⚠️ 시리가 명령을 잘못 읽어 아군에게 낙진 대미지를 쐈습니다! [아군 HP -${selfHarm}]`);
        dmg = 0;
      }
    } else if (activeAi === "grok") {
      effectText = "[그록 필터 없는 불꽃포]";
      dmg = Math.floor(dmg * 2.8);
      p.def = Math.max(0, p.def - 3); // lowers defense
    } else if (activeAi === "ursa") {
      effectText = "[우르사의 대지 붕괴 충격파]";
      dmg = Math.floor(p.atk * 1.5);
      stun = true;
    } else if (activeAi === "meltdown") {
      effectText = "[멜트다운 체르노빌 핵 레이저]";
      dmg = Math.floor(p.atk * 3.2);
    } else if (activeAi === "glitch") {
      effectText = "[글리치 시스템 오버로드 비축액]";
      dmg = Math.floor(p.atk * 2.0);
      if (e.type === "drone") {
        dmg *= 2;
        stun = true;
      }
    } else if (activeAi === "nosferatu") {
      effectText = "[노스페라투 블러드 페스트 역병]";
      dmg = Math.floor(p.atk * 1.6);
      const lifesteal = Math.floor(dmg * 0.8);
      p.hp = Math.min(p.maxHp, p.hp + lifesteal);
    } else if (activeAi === "anubis") {
      effectText = "[아누비스 모래 낙진 포위]";
      dmg = Math.floor(p.atk * 2.5);
    } else if (activeAi === "pixie") {
      effectText = "[픽시 푸른 마법 대폭발]";
      dmg = Math.floor(p.atk * (1.5 + Math.random() * 2.5));
    } else if (activeAi === "khan") {
      effectText = "[칸 철기병 일제 돌격 기마대]";
      dmg = Math.floor(p.atk * 2.2);
      e.actionMeter = 0;
    } else if (activeAi === "valkyrie") {
      effectText = "[발키리 발할라 오버드라이브]";
      p.atk = Math.floor(p.atk * 1.5);
      p.spd += 5;
      dmg = 0;
    } else if (activeAi === "brahma") {
      effectText = "[브라흐마 정화의 창조 가호]";
      p.hp = p.maxHp;
      p.shield += 50;
      dmg = 0;
    } else if (activeAi === "core_breaker") {
      effectText = "[코어 브레이커 인류 멸망 전조 대진동]";
      dmg = Math.floor(p.atk * 4.5);
      p.hp = Math.max(1, p.hp - Math.floor(p.hp * 0.2));
    } else if (activeAi === "defender") {
      effectText = "[디펜더 절대 방어 쉘터 가동]";
      p.invincibleTurns = 2;
      dmg = 0;
    }

    this.addCombatLog(`🤖 AI 지원 궁극기: ${effectText}`);
    
    if (dmg > 0) {
      const finalDmg = Math.max(1, dmg - e.def);
      e.hp = Math.max(0, e.hp - finalDmg);
      this.addCombatLog(`💥 AI 기술이 적에게 큰 손상을 입힙니다. [적 HP -${finalDmg}]`);
      if (window.UI && this.combatSpeed !== 999) {
        window.UI.spawnTextEffect(false, `-${finalDmg}`, "#ff0055");
        window.UI.triggerActionAnimation("enemy", "hit");
        window.UI.spawnExplosionEffect();
      }
    }
    
    if (stun) {
      e.actionMeter = 0;
      this.addCombatLog("💫 적이 충격으로 기절하여 행동 지연 상태가 됩니다!");
    }

    if (window.sfx && this.combatSpeed !== 999) {
      window.sfx.playHit();
    }

    this.checkCombatVictory();
  }

  triggerEnemyTurn() {
    const p = this.combatState.player;
    const e = this.combatState.enemy;

    if (e.hp <= 0) return;

    // Determine damage
    let dmg = e.atk;
    
    // Normal attack logic
    let finalDmg = Math.max(1, dmg - p.def);

    // Apply shield absorption
    if (p.shield > 0) {
      if (p.shield >= finalDmg) {
        p.shield -= finalDmg;
        this.addCombatLog(`🛡️ 아군의 장갑 쉴드가 대미지를 전부 흡수합니다. [쉴드 남음: ${p.shield}]`);
        finalDmg = 0;
      } else {
        finalDmg -= p.shield;
        this.addCombatLog(`🛡️ 아군의 장갑 쉴드가 깨지며 ${p.shield} 대미지를 감소시킵니다.`);
        p.shield = 0;
      }
    }

    if (p.invincibleTurns > 0) {
      p.invincibleTurns--;
      finalDmg = 0;
      this.addCombatLog("🛡️ [절대 방어] 상태이므로 데미지를 무효화합니다!");
    }

    if (finalDmg > 0) {
      p.hp = Math.max(0, p.hp - finalDmg);
      this.addCombatLog(`⚠️ 적 [${e.name}]의 공격! 아군이 대미지를 입습니다. [아군 HP -${finalDmg}] (남은 HP: ${p.hp}/${p.maxHp})`);
      if (window.sfx && this.combatSpeed !== 999) {
        window.sfx.playHit();
      }
      if (window.UI && this.combatSpeed !== 999) {
        window.UI.spawnTextEffect(true, `-${finalDmg}`, "#ff0055");
        window.UI.triggerActionAnimation("enemy", "attack");
        window.UI.triggerActionAnimation("player", "hit");
        window.UI.spawnBloodEffect();
      }
    }

    this.checkCombatVictory();
  }

  checkCombatVictory() {
    if (this.combatState.isFinished) return;

    const p = this.combatState.player;
    const e = this.combatState.enemy;

    if (e.hp <= 0) {
      this.combatState.isFinished = true;
      this.combatState.winner = "player";
    } else if (p.hp <= 0) {
      // 5th stage Undead revive check
      if (this.state.character.evolvedTraits.includes("undead_immortal") && !p.revived) {
        p.revived = true;
        // Revive HP scales with current radiation cash!
        const reviveHp = Math.min(p.maxHp, Math.floor(p.maxHp * 0.2) + Math.floor(this.state.currentExploration.radGathered * 0.5));
        p.hp = reviveHp;
        this.addCombatLog(`🧟 [불멸의 언데드] 소지한 방사능 연료를 태워 아군이 부활합니다! [체력 +${reviveHp}]`);
        if (window.sfx && this.combatSpeed !== 999) window.sfx.playHeal();
        return;
      }

      // 6th stage Nosferatu invincibility check
      if (this.state.character.evolvedTraits.includes("nosferatu_lord") && p.ghostTurns === 0) {
        p.hp = 1;
        p.ghostTurns = 3;
        this.addCombatLog("👻 [노스페라투 군주] 사망 직전 무적 방사능 유령 상태로 3턴간 폭주합니다!");
        return;
      }

      this.combatState.isFinished = true;
      this.combatState.winner = "enemy";
    }
  }

  finishBattle() {
    if (this.combatInterval) clearInterval(this.combatInterval);
    
    const exp = this.state.currentExploration;
    const winner = this.combatState.winner;
    
    if (winner === "player") {
      this.handleVictory();
    } else {
      this.handleDefeat();
    }
  }

  handleVictory() {
    const exp = this.state.currentExploration;
    
    // Earn radiation based on enemy level
    let radEarned = Math.floor(10 * (1 + exp.enemyLevel * 0.15) * (1 + Math.random() * 0.5));
    if (exp.battle === 10) radEarned *= 3.5; // Boss bonus!
    
    exp.radGathered += radEarned;
    
    // Carry over HP
    exp.charCurrentHp = this.combatState.player.hp;
    
    this.addLog(`🎉 전투 승리! 방사능 재화 +${radEarned} 획득. (챕터 누적: ${exp.radGathered})`);
    
    // Earn character XP after each battle victory (real-time level up!)
    const xpGained = Math.floor((15 + exp.enemyLevel * 1.5) * (exp.battle === 10 ? 3.5 : 1));
    this.gainXP(xpGained);

    // Roll for random loot drop (35% chance, 100% for bosses)
    const dropChance = exp.battle === 10 ? 1.0 : 0.35;
    if (Math.random() < dropChance) {
      let item = "";
      if (exp.regionId === 14 && exp.battle === 10) {
        item = "최종 보스 빅풋의 털";
      } else {
        const pool = LOOT_POOL.filter(n => n !== "최종 보스 빅풋의 털");
        item = pool[Math.floor(Math.random() * pool.length)];
      }

      if (!this.state.inventory.collectedLoots.includes(item)) {
        this.state.inventory.collectedLoots.push(item);
        this.addLog(`🎁 전리품 획득! [${item}] 아이템이 인벤토리에 추가되었습니다.`);
      }
    }

    if (window.sfx) window.sfx.playVictory();

    // Trigger enemy death slide animation for runner-style combat
    if (window.UI) {
      window.UI.triggerEnemyDeathSlide();
    }

    // Check progress
    if (exp.battle === 10) {
      // Round cleared! Move to next round
      if (exp.round === 10) {
        // Complete region chapter clear!
        this.clearChapter();
      } else {
        exp.round++;
        exp.battle = 1;
        this.addLog(`챕터 라운드 통과! 라운드 ${exp.round}/10으로 진입합니다.`);
        this.saveGame();
        if (window.UI) {
          setTimeout(() => {
            if (this.state.currentExploration) this.startBattle();
          }, 2000 / this.combatSpeed);
        } else {
          this.startBattle();
        }
      }
    } else {
      exp.battle++;
      this.saveGame();
      if (window.UI) {
        // Immediately start next battle after short delay or prompt
        setTimeout(() => {
          if (this.state.currentExploration) this.startBattle();
        }, 1200 / this.combatSpeed);
      } else {
        this.startBattle();
      }
    }
  }

  clearChapter() {
    const exp = this.state.currentExploration;
    const regionId = exp.regionId;
    
    // Add radiation gathered to global resource
    this.state.resources.radiation += exp.radGathered;
    
    // Check if region was fully cleared
    if (!this.state.completedRegions.includes(regionId)) {
      this.state.completedRegions.push(regionId);
      
      // Unlock clear rewards!
      const reward = REGIONS_DATA[regionId];
      if (reward) {
        this.addLog(`⭐ 대성공! ${reward.name} 정복 완료.`);
        this.addLog(`🔓 보상 해금: 신체 훈련 특성 [${reward.rewardTrait}] 해금!`);
        this.addLog(`🔓 보상 해금: 동맹 보조 AI [${reward.aiName}] 해금!`);
        
        // Push unlocked AI to shop/inventory
        if (reward.rewardAI && !this.state.inventory.ais.includes(reward.rewardAI)) {
          this.state.inventory.ais.push(reward.rewardAI);
        }

        // Unlock next region logic (Unlock next adjacent indexes)
        const nextRegId = regionId + 1;
        if (nextRegId <= 14 && !this.state.unlockedRegions.includes(nextRegId)) {
          this.state.unlockedRegions.push(nextRegId);
          this.addLog(`🗺️ 새로운 탐험 지역 해금: ${REGIONS_DATA[nextRegId].name}`);
        }
      }
    }

    // Earn character XP
    const xpGained = 150 + exp.enemyLevel * 15;
    this.gainXP(xpGained);

    // If custom boss was defeated, clear it from region
    if (this.state.monsterizedBosses[regionId]) {
      this.addLog(`💀 정화 성공: 아군 보스 변종 [${this.state.monsterizedBosses[regionId].name}]을 격퇴하여 해탈시켰습니다.`);
      delete this.state.monsterizedBosses[regionId];
    }

    const radGathered = exp.radGathered;
    this.state.currentExploration = null;
    this.combatState = null;
    this.saveGame();

    if (window.UI) {
      window.UI.showBattleResultOverlay(true, true, radGathered);
    }
  }

  handleDefeat() {
    const exp = this.state.currentExploration;
    const radCarried = exp.radGathered;
    
    // Trigger Permadeath/Monsterization check!
    const permadeathChance = this.getMonsterizationProb(radCarried);
    const roll = Math.random() * 100;
    
    if (roll < permadeathChance) {
      // MONSTERIZATION!
      this.triggerMonsterization(radCarried);
    } else {
      // Normal fail: Keep character, restart current chapter (round)
      this.addLog(`💀 아군 전멸... 다행히 방사능 안정 장치 덕분에 영구 몬스터화를 모면했습니다.`);
      this.addLog(`해당 챕터를 재시작합니다.`);
      
      this.saveGame();
      
      if (window.sfx) window.sfx.playDefeat();
      if (window.UI) window.UI.showBattleResultOverlay(false, false);
    }
  }

  restartCurrentChapter() {
    const exp = this.state.currentExploration;
    if (!exp) return;
    
    // Reset chapter progress
    exp.battle = 1;
    exp.radGathered = 0;
    exp.charCurrentHp = this.getStats().maxHp;
    
    this.combatState = null;
    this.addLog(`🔄 챕터 재도전을 시작합니다. (라운드 ${exp.round}, 전투 1/10)`);
    this.saveGame();
    
    this.startBattle();
    if (window.UI) {
      window.UI.initCombatScreen();
      window.UI.updateAll();
    }
  }

  triggerMonsterization(radCarried) {
    const exp = this.state.currentExploration;
    const regionId = exp.regionId;
    const c = this.state.character;
    const stats = this.getStats();

    // Create customized monsterized boss data
    const bossConfig = {
      name: c.name,
      level: c.level,
      hp: stats.maxHp * 5, // boss scaling
      maxHp: stats.maxHp * 5,
      atk: Math.floor(stats.atk * 1.4),
      def: Math.floor(stats.def * 1.8),
      spd: stats.spd,
      headPart: c.headPart,
      bodyPart: c.bodyPart,
      activeMutations: [...c.activeMutations],
      weapon: c.weapon,
      traits: [...c.evolvedTraits]
    };

    // Save boss config to region
    this.state.monsterizedBosses[regionId] = bossConfig;

    this.addLog(`🚨 재앙 발생! 소지 방사능 과다 오염(${radCarried} Rad)으로 인해 [${c.name}]이 자아를 잃고 몬스터화되었습니다!`);
    this.addLog(`⚠️ [${c.name}]은(는) 이제 ${REGIONS_DATA[regionId].name}의 특별 네임드 보스로 아군을 노리게 됩니다.`);
    
    const playerName = c.name;

    // Character is wiped! Reset character config
    this.recruitNewCharacter();
    
    this.state.currentExploration = null;
    this.combatState = null;
    this.saveGame();

    if (window.sfx) window.sfx.playDefeat();
    if (window.UI) window.UI.showBattleResultOverlay(false, true, radCarried, playerName); // Failed & Monsterized
  }

  recruitNewCharacter(customName, originId) {
    let newName = customName;
    
    if (!newName) {
      const prefixes = ["정찰병", "척후병", "생존병", "돌격병", "방사기", "추적자"];
      const suffixes = ["알파", "베타", "감마", "델타", "제타", "오메가"];
      newName = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }
    
    let baseHp = 100;
    let baseAtk = 10;
    let baseDef = 2;
    let baseSpd = 10;
    let originName = "낙진 황무지";

    if (originId === 1) { // Siberia
      baseHp = 120;
      baseAtk = 11;
      originName = "시베리아 대황무지";
    } else if (originId === 2) { // W. Europe
      baseAtk = 14;
      baseDef = 1;
      originName = "서유럽 원전 지대";
    } else if (originId === 3) { // E. Asia
      baseSpd = 12;
      baseDef = 3;
      originName = "동아시아 메가시티";
    }
    
    let spriteUrl = "/player_sprite.png";
    if (originId === 1) {
      spriteUrl = "/plasma_beast_sprite.png";
    } else if (originId === 2) {
      spriteUrl = "/quantum_destroyer_sprite.png";
    } else if (originId === 3) {
      spriteUrl = "/nano_vampire_sprite.png";
    }

    const isOriginChar = originId === 1 || originId === 2 || originId === 3;

    // Reset player details to Level 1
    this.state.character = {
      name: newName,
      level: 1,
      xp: 0,
      xpNeeded: 100,
      hp: baseHp,
      maxHp: baseHp,
      baseAtk: baseAtk,
      baseDef: baseDef,
      baseSpd: baseSpd,
      headPart: Math.floor(Math.random() * 6) + 1,
      bodyPart: Math.floor(Math.random() * 2) + 1,
      weapon: "scrap_sword",
      armor: "ragged_clothes",
      core: "basic_core",
      ai: "gpt",
      activeMutations: [],
      evolutionTier: 1,
      evolvedTraits: [],
      spriteSheetConfig: {
        enabled: true,
        url: spriteUrl,
        cols: 10,
        rows: isOriginChar ? 4 : 3,
        frameInterval: 250,
        currentFrame: 0,
        currentState: "idle",
        mappings: isOriginChar ? {
          idle: { row: 0, frames: 10 },
          walk: { row: 1, frames: 10 },
          attack: { row: 2, frames: 10 },
          special_attack: { row: 3, frames: 10 }
        } : {
          idle: { row: 0, frames: 10 },
          walk: { row: 1, frames: 10 },
          attack: { row: 2, frames: 10 }
        }
      }
    };

    this.addLog(`👤 요원 [${newName}]이(가) 기원 구역 [${originName}]에서 새로 임무를 시작합니다.`);
  }

  gainXP(amt) {
    const c = this.state.character;
    c.xp += amt;
    this.addLog(`XP +${amt} 획득.`);
    
    let leveledUp = false;
    while (c.xp >= c.xpNeeded) {
      c.xp -= c.xpNeeded;
      c.level++;
      c.xpNeeded = Math.floor(100 * Math.pow(1.25, c.level - 1));
      leveledUp = true;
      
      this.addLog(`⭐ 레벨 업! 요원이 Lv.${c.level}에 도달했습니다!`);
      if (window.sfx) window.sfx.playLevelUp();
      
      // Floating level up text effect on combat stage if active!
      if (window.UI) {
        window.UI.spawnTextEffect(true, "LEVEL UP! ⭐", "var(--yellow)");
      }
    }
    
    if (window.UI) {
      window.UI.updateSidebar();
      window.UI.updateGlobalHeader();
    }
  }
}

window.Game = new GameEngine();
