# 🧬 HD-2D 캐릭터 하이브리드 애니메이션 최종 사양서

본 문서는 에이전트 캐릭터의 HD-2D 그래픽 구현을 위한 **"수작업 픽셀 소체 + 관절 소켓 오버레이 파츠" 하이브리드 방식**의 최종 기술 규격입니다.

---

## 1. ⚙️ 애니메이션 구동 구조

| 구분 | 프레임 바이 프레임 (본체 소체) | 관절 소켓 오버레이 (특성 파츠) |
| :--- | :--- | :--- |
| **적용 범위** | 에이전트 기본 맨몸(속옷 차림) | 13종 변종 파츠, 무기 및 장비 |
| **구현 방식** | 수작업 도트 52프레임 애니메이션 | 프레임별 **소켓 픽셀 좌표**에 실시간 바인딩 |
| **렌더링 룰** | **Facing Right (우측 방향 고정)**, **왼팔 생략** | 몸체 각도 및 동작에 동기화 |
| **성별 대응** | **남성(Male) / 여성(Female) 소체 개별 제작** | 공용 파츠 렌더링 시 성별별 소켓 좌표계 적용 |

---

## 🎨 2. 마스터 스타일 프롬프트 규격 (성별 이원화)

### A. 뼈대용 베이스 캐릭터 소체 (속옷 차림 본체)
- **남성형 소체 (Male Base Body)**
  ```text
  [HD-2D style, Octopath Traveler style, detailed 16-bit pixel art sprite, male sci-fi agent base body, athletic build, wearing futuristic simple dark grey boxer briefs, no armor, no mutations, no weapons, bare hands, full body, facing right, right profile view, clean outlines, solid white background]
  ```
- **여성형 소체 (Female Base Body)**
  ```text
  [HD-2D style, Octopath Traveler style, detailed 16-bit pixel art sprite, female sci-fi agent base body, slender build, wearing futuristic simple dark grey sports bra and shorts, no armor, no mutations, no weapons, bare hands, full body, facing right, right profile view, clean outlines, solid white background]
  ```

### B. 오버레이용 특성 파츠 (장비 단독 - 남녀 공용)
```text
[HD-2D style, Octopath Traveler style, detailed 16-bit pixel art sprite, isolated single game item asset, no character body, dramatic glow effects, clean outlines, solid white background]
```

---

## ⚙️ 3. 성별별 파츠 조립용 소켓(Socket) 좌표계
발바닥 중앙 `(0,0)` 기준 픽셀 오프셋. 체형 차이에 맞춰 소켓 위치가 이원화 적용됩니다.

### A. 남성 소체 전용 소켓 좌표계 (Male Socket)
| 소켓명 (Socket) | 대상 부위 | 장착 예시 파츠 | 남성 소체 기준 좌표 (`x, y`) | 특징 |
| :--- | :--- | :--- | :---: | :--- |
| **`socket_head`** | 머리/귀/눈/얼굴 | 핵융합 라디에이터, 퀀텀 바이저 | `(3, -45)` | 여성 소체 대비 키가 커서 y축 상향 |
| **`socket_chest`** | 가슴/몸통 | 하드라이트 아머 코어 | `(0, -30)` | 벌크업된 흉갑 위치에 맞춤 |
| **`socket_back`** | 등/날개/척추 | 나노 사이폰 윙, 스파인 굴뚝 | `(-7, -30)` | 상체가 두터워 x축 뒤쪽 이동 |
| **`socket_r_arm`** | 오른팔 | 초고전압 아크 캐논 (무기 장착) | `(5, -28)` | 어깨 너비 확장으로 인해 외측 이동 |
| **`socket_tail`** | 꼬리 | 소리굽쇠 진동 메카 테일 | `(-9, -13)` | 골반 위치 기준 고정 |
| **`socket_legs`** | 다리/추진기 | 오버드라이브 카본 외골격 | `(0, -11)` | 굵은 허벅지 라인 정렬 |

### B. 여성 소체 전용 소켓 좌표계 (Female Socket)
| 소켓명 (Socket) | 대상 부위 | 장착 예시 파츠 | 여성 소체 기준 좌표 (`x, y`) | 특징 |
| :--- | :--- | :--- | :---: | :--- |
| **`socket_head`** | 머리/귀/눈/얼굴 | 핵융합 라디에이터, 퀀텀 바이저 | `(2, -42)` | 남성보다 작고 아담한 체형 기준 |
| **`socket_chest`** | 가슴/몸통 | 하드라이트 아머 코어 | `(0, -28)` | 슬림한 가슴 라인 흉갑 장착점 |
| **`socket_back`** | 등/날개/척추 | 나노 사이폰 윙, 스파인 굴뚝 | `(-6, -28)` | 좁은 상체 두께에 맞게 밀착 |
| **`socket_r_arm`** | 오른팔 | 초고전압 아크 캐논 (무기 장착) | `(4, -26)` | 좁은 어깨 축 기준 정렬 |
| **`socket_tail`** | 꼬리 | 소리굽쇠 진동 메카 테일 | `(-8, -12)` | 골반 척추 하단 연동 |
| **`socket_legs`** | 다리/추진기 | 오버드라이브 카본 외골격 | `(0, -10)` | 얇은 다리 뼈대 라인 정렬 |

---

## 🎬 4. 소체 애니메이션 프레임 명세 (총 52 프레임)

남/여 소체 공통으로 모든 모션 프레임은 **맨손(Bare Hands, No Weapons)** 상태로 제작되며, 현재 여성 소체는 모든 시트 생성이 완료되었습니다.

| 동작 (Animation) | 프레임 범위 | 프레임 수 | 연출 특징 | 파츠 오버레이 연동 제어 / 생성 결과 (여성) |
| :--- | :---: | :---: | :--- | :--- |
| **Base (대기 정지)** | 1 | 1 | 기본 정지 소체 | [hd2d_female_base.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_base.jpg) (완료) |
| **Idle (대기 루프)** | `F00 ~ F07` | 8 | 호흡 시 가슴 높이 미세 변화 (`y` ±1px) | [hd2d_female_idle_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_idle_sheet.jpg) (완료) |
| **Run (달리기)** | `F08 ~ F15` | 8 | 하체 교차 및 상체 끄덕임 연동 | [hd2d_female_run_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_run_sheet.jpg) (완료) |
| **Attack (일반공격)**| `F16 ~ F25` | 10 | **오른손(팔)을 정면으로 곧게 드는 동작** (무기 없음) | [hd2d_female_attack_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_attack_sheet.jpg) (완료 - 무기 배제 재작업 완료) |
| **Skill (스킬공격)** | `F26 ~ F39` | 14 | **양손(양팔)을 머리 위로 수직으로 드는 동작** (무기 없음) | [hd2d_female_skill_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_skill_sheet.jpg) (완료) |
| **Hurt (피격)** | `F40 ~ F43` | 4 | 피격 충격으로 몸이 뒤로 크게 젖혀짐 | [hd2d_female_hurt_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_hurt_sheet.jpg) (완료) |
| **Die (사망)** | `F44 ~ F51` | 8 | 바닥으로 무너지며 스러지는 정지 페이드아웃 | [hd2d_female_die_sheet.jpg](file:///D:/workspace/newfolder/docs/hd2d_female_die_sheet.jpg) (완료) |

---

## 🛠️ 5. 무기 및 파츠 실시간 동기화 (Socket Binding) 연동 규격

오버레이 무기 에셋을 소체의 손 움직임에 정확히 동기화하기 위한 렌더링 규격입니다.

### A. 무기 에셋 기준점 (Pivot) 설정 규칙
- 무기 스프라이트 단독 생성 시, 이미지의 원점(Pivot)은 반드시 **칼자루 중심(Grip Center)** 혹은 **총기 방아쇠/손잡이(Trigger/Handle)** 위치와 완벽히 일치해야 합니다.
- 이 기준점 기준으로 회전(Rotation)을 적용해야 관절 동작 시 무기가 손 밖으로 탈조되는 현상이 방지됩니다.

### B. 프레임별 메타데이터 연동 예시
소체 프레임 재생 시 바인딩할 데이터 예시입니다.
```json
{
  "Attack_F16": { "handX": 12, "handY": -26, "weaponRot": 0.0 },
  "Attack_F17": { "handX": 14, "handY": -28, "weaponRot": -0.15 },
  "Attack_F18": { "handX": 15, "handY": -25, "weaponRot": 0.1 }
}
```

### C. 실시간 렌더링 갱신 의사코드
엔진 프레임 루프 내에서 무기 위치와 회전을 동적 매핑하는 처리 방식입니다.
```javascript
function updateWeaponOverlay(agentSprite, weaponSprite, currentFrameName) {
  const meta = frameData[currentFrameName];
  if (!meta) return;

  // 1. 무기 손잡이를 회전 피벗으로 설정
  weaponSprite.pivot.set(weaponGripX, weaponGripY);

  // 2. 소체 기준 소켓 좌표 오프셋 위치로 무기 정렬
  weaponSprite.x = agentSprite.x + meta.handX;
  weaponSprite.y = agentSprite.y + meta.handY;

  // 3. 소체 손의 회전각 동기화
  weaponSprite.rotation = meta.weaponRot;
}
```

### D. Z-Index 레이어 관리 규격
- **왼손 장비(무기 등)**: 소체 왼팔(Left Arm) 레이어(또는 횡스크롤 상 뒤쪽 왼손 부근) 바로 위에 렌더링하여 손바닥 위에 자연스럽게 얹히도록 연출합니다.
- **가슴/등 장비**: 상체/골반 레이어 사이에 끼워 넣어 자연스럽게 옷을 입은 듯한 원근감을 확보합니다.

---

## 📏 6. 에셋 종류별 규격 및 물리 크기 (Pixel Resolution) 가이드라인

베이스 소체의 표준 캔버스 크기를 **`256 x 256 px`**로 기준했을 때, 부착되는 각 파츠 에셋의 최적 제작 해상도 명세입니다.

| 장비/파츠 대분류 | 표준 물리 규격 (Pixel Size) | 레이어 순서 (Z-Index) | 물리적 배치 위치 및 특징 |
| :--- | :---: | :---: | :--- |
| **1. 베이스 소체 (Body)** | `256 x 256 px` | `Z: 10` | 전체 파츠 조립의 기본 캔버스 원점축 |
| **2. 주무기 (Weapons)** | `128 x 128 px` 또는 `128 x 64 px` | `Z: 14` | 소체 오른손(`socket_r_arm`)에 부착. 칼자루/방아쇠에 피벗 세팅 필수 |
| **3. 머리/귀/얼굴 파츠** | `64 x 64 px` | `Z: 12` | `socket_head` 부착. 소체 머리 외곽 경계선에 조립 |
| **4. 가슴/몸통 아머** | `64 x 64 px` | `Z: 11` | `socket_chest` 부착. 소체 상체 흉갑 부위에 밀착 장착 |
| **5. 등/날개/배기구** | `256 x 256 px` 또는 `256 x 128 px` | `Z: 5` (소체 뒤로 은폐) | `socket_back` 부착. 소체 뒤쪽 레이어로 몸통에 완전히 가려지게 배치 |
| **6. 다리 외골격/서멀 가드** | `64 x 128 px` 또는 `64 x 64 px` | `Z: 9` (소체 바로 밑) | `socket_legs` 부착. 소체 하체 뼈대 라인과 일치하도록 세팅 |
| **7. 꼬리 파츠** | `128 x 64 px` | `Z: 6` (소체 뒤쪽) | `socket_tail` 부착. 골반뼈 뒤쪽 노드에서 돌출 연출 |

---

## 📦 7. 이미지 에셋 제작 대상 및 종류 리스트

프로젝트 2100의 애니메이션 모드 구동을 위해 순차적으로 제작해야 할 전체 에셋 목록입니다.

### A. 기본 무기 (Weapons) - 총 3종
1. **`scrap_sword` (고철 진동검)**: 손잡이가 뚜렷한 메카닉 진동 격발 단검 (Pivot: Grip Center). ➡️ [hd2d_weapon_scrap_sword.jpg](file:///D:/workspace/newfolder/docs/hd2d_weapon_scrap_sword.jpg) (완료)
2. **`bio_claw` (생체 발톱)**: 손등 and 양손 부위에 얹히는 괴수형 3가닥 융합 발톱 (Pivot: Wrist). ➡️ [hd2d_weapon_bio_claw.jpg](file:///D:/workspace/newfolder/docs/hd2d_weapon_bio_claw.jpg) (완료)
3. **`nuclear_gun` (핵 슬러그 총)**: 개리슨형 대구경 전술 유탄 총기 (Pivot: Trigger/Handle). ➡️ [hd2d_weapon_nuclear_gun.jpg](file:///D:/workspace/newfolder/docs/hd2d_weapon_nuclear_gun.jpg) (완료)

### B. 방어구 스킨 (Armors) - 총 4종
1. **`ragged_clothes` (누더기 옷)**: 소체에 직접 매핑되는 가죽 패치 조각 스킨.
2. **`basic_hazmat` (방사능 차폐 hazmat)**: 반투명 황색 전면 방호 흉갑 및 후드 세트.
3. **`armored_hazmat` (장갑 특수 방호복)**: 두터운 중형 금속 가드 플레이트 보강형 방호 아머.
4. **`heavy_power_armor` (중장갑 파워 아머)**: 중장갑 파츠가 전신을 뒤덮는 묵직한 하이테크 외골격 슈트. ➡️ [hd2d_armor_power_armor.jpg](file:///D:/workspace/newfolder/docs/hd2d_armor_power_armor.jpg) (완료)

### C. 13종 변종/진화 특성 파츠 (Traits) - Z-Index 바인딩 포함
1. **오른팔 (`socket_r_arm`)**: `energy_discharge` (초고전압 아크 캐논 기계포)
2. **다리/발 (`socket_legs`)**: `thermal_control` (현무암 마그마 플레이트)
3. **머리/투구 (`socket_head`)**: `meltdown_control` (원형 부유 황금 후광 라디에이터)
4. **등/날개 (`socket_back`)**: `blood_absorption` (붉은 나비 점막 나노 사이폰 윙) ➡️ [hd2d_trait_blood_wing.jpg](file:///D:/workspace/newfolder/docs/hd2d_trait_blood_wing.jpg) (완료)
5. **얼굴/피부 (`socket_head`)**: `cellular_shield` (청색 투명 기하학 나노 베일)
6. **가슴/몸통 (`socket_chest`)**: `hightech_engineering` (황색 중성자 아머 코어)
7. **귀/머리 (`socket_head`)**: `fairy_magic` (연보라 룬 문자 에테르 안테나)
8. **다리/추진기 (`socket_legs`)**: `power_overload` (블랙 카본 추진 외골격 프레임)
9. **꼬리 (`socket_tail`)**: `ultrasonic_disruption` (3단 마디 메탈 소리굽쇠 꼬리)
10. **양손 (`socket_r_arm`)**: `body_mutation` (보랏빛 괴수형 융합 키메라 클로)
11. **눈/바이저 (`socket_head`)**: `sensory_tech` (적색 홀로그래픽 전술 모노 바이저)
12. **어깨 (`socket_chest`)**: `berserker_madness` (녹색 결정질 화산유리 가시 견갑)
13. **목/척추 (`socket_back`)**: `radiation_assimilation` (녹색 여과 배기 포트 스파인)

---

## 🔗 8. 화풍 일관성 및 시드(Seed) 제어 규칙

성별별 기준 이미지(시드)를 다음 파츠/동작 시트에 연결 참조하여 화풍 불일치 문제를 차단하는 규칙입니다.

1. **소체 시드(Seed) 고정 법칙**: 
   - 여성 베이스 소체로 성공 확정된 `hd2d_female_base.jpg` 이미지의 고유 Seed 번호를 추출하여, 이후 모든 여성 동작 시트(`idle_sheet`, `run_sheet` 등) 생성 프롬프트에 `--seed [번호]` 형식으로 강제 귀속시킵니다.
2. **스타일 레퍼런스(sref) 활용**:
   - 미드저니/달리 등 참조 렌더러 사용 시, 베이스 소체 이미지 경로를 `--sref [image_url]` 파라미터로 필수 귀속해 픽셀 밀도와 아웃라인 두께의 편차를 5% 미만으로 강제 통제합니다.

---

## ✂️ 9. 도트 리소스 후처리 및 텍스처 아틀라스 팩킹 체크리스트

생성된 결과물을 실제 게임 엔진에 업로드하기 위해 가공하는 후처리 공정 표준입니다.

- [ ] **단색 배경 투명화**: 배경인 흰색(#FFFFFF)을 알파 마스크로 완전히 제거(누끼)했는가?
- [ ] **안티앨리어싱 제거**: 픽셀 경계부가 번져 흐려진 부분을 포토샵 연필 도구(1px) 등으로 지워 선명한 단색 격자로 복원했는가?
- [ ] **피벗 일치화**: 무기 손잡이, 다리 관절의 회전 원점을 스프라이트 중심점(또는 지정된 픽셀 오프셋)으로 크롭(Crop)했는가?
- [ ] **아틀라스 팩킹**: 개별 시트 이미지들을 하나의 아틀라스 파일(`.png`)로 결합하고 영역 좌표(`.json`)를 생성했는가?

---

## 📝 10. 즉시 실행 가능한 완성형 프롬프트 라이브러리 (전수 명세)

API 리셋 즉시 즉각적인 복사/붙여넣기로 고품질 에셋을 일관되게 생성할 수 있는 완성형 지시문 목록입니다.

### A. 성별 소체 Base 프롬프트 (총 2종)

#### 1. 여성 소체 - Base (정지 상태)
```text
A standalone HD-2D game asset of a female sci-fi agent base body, full body, facing right, right profile view. She is wearing futuristic sleek dark grey simple athletic undergarments (sports bra and shorts), with no armor, no weapons, and no enhancements. Detailed 16-bit pixel art sprite, Octopath Traveler style, clean outlines, solid white background, Spine 2D animation ready.
```

#### 2. 남성 소체 - Base (정지 상태)
```text
A standalone HD-2D game asset of a male sci-fi agent base body, full body, facing right, right profile view. He is wearing futuristic simple dark grey boxer briefs, with no armor, no weapons, and no enhancements. Detailed 16-bit pixel art sprite, Octopath Traveler style, clean outlines, solid white background, Spine 2D animation ready.
```