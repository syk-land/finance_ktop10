# 🧬 [통합 마스터 설계서] 프로젝트 2100 시스템 및 캐릭터 조립 규격

본 문서는 프로젝트 2100의 핵심 기획 사양, 10프레임 기반 캐주얼 캐릭터 조립(하이브리드) 애니메이션 사양, 그리고 누락 없는 핵심 게임 시스템의 구현용 Javascript 코드 스펙을 하나로 완벽하게 통합한 최종 설계서입니다.

---

## 1. ⚙️ 애니메이션 및 캐릭터 파츠 조립 규격 (최신 기준)

횡스크롤 캐주얼 아트 콘셉트와 **[GEMINI.md](file:///D:/workspace/newfolder/GEMINI.md)의 최신 룰(0.5, 0.6, 0.7)**을 준수하는 리소스 및 런타임 렌더링 규격입니다.

### A. 캐릭터 파츠 구조 및 AI 이미지 생성 방식
- **생성 방식**: 동작 프레임 단위의 전체 시트 생성을 지양하고, **단일 고화질 파츠 세트(머리, 몸통, 손, 발 1장씩)**만 AI로 생성하여 사용합니다.
- **리소스 포맷**: 게임 내 모든 그래픽 리소스(게임 디자인, 일러스트, 아이콘 등)는 **SVG(벡터) 방식을 일절 배제**하고, 단일 고화질 **비트맵 일러스트(PNG/JPG)** 형태로 제작하여 엔진에 올립니다.
- **듀얼 뷰 (Dual View) 대응**: 전투 씬에서는 **우향 80도 하이브리드 뷰 (Cheated 80-degree Side View)**, 로비/비전투 씬에서는 **정면 (Front View)** 조립 구도를 사용합니다.
- **전투 씬 (Cheated 80-degree Side View)**: 요원은 오른쪽을 바라보고 달리되, 카메라(화면 앞쪽) 쪽으로 약 10~15도 각도를 살짝 비틀어 양쪽 눈과 입체적인 어깨 곡선이 매력적으로 노출되는 하이브리드 뷰를 적용합니다. 전면에 오른팔이 노출되고, Z-index 4의 왼팔은 몸통 뒤로 반가려지게 배치합니다.
- **비전투 씬 (Front View)**: 요원은 정면을 보며, 좌우 대칭인 양팔과 양다리를 명확히 조립 및 노출시킵니다.

#### 파츠별 상세 해상도 (Pixel Size) 가이드라인
모든 리소스는 비트맵(PNG/JPG)으로 아래 규격에 맞게 제작되며, 이미지 크롭 시 피벗 위치 설정 규칙을 엄격히 따릅니다:
- **성별별 에셋 분리**: 요원의 기본 파츠(머리, 몸통, 손, 다리)는 여성형(Female)과 남성형(Male)으로 각각 독립된 파츠 세트를 생성하여 관리합니다. 파일명에 `female`과 `male`을 명시하여 구분합니다.
- **전체 요원 캔버스 (Agent Canvas)**: `512 x 512 px` (조립 오프셋 기준좌표계 원점 `0, 0`은 발바닥 중앙 아래)
- **머리 (Head)**: `256 x 256 px` (피벗: 목 접합부 중앙 아래. 맨얼굴/대머리 기본 외에 **[피격/스킬 표정]** 바리에이션 포함)
- **몸통 (Torso)**: `256 x 256 px` (피벗: 골반 중앙 아래. 의복이나 갑옷 장비가 없는 민무늬 맨몸 상태를 기본으로 함)
- **오른손 / 무기 (Right Hand / Weapon)**: `256 x 256 px` (피벗: 손잡이 또는 총기 방아쇠 위치. 무기를 쥐지 않은 맨손 상태를 기본으로 하며 스킨이나 무기 장착 시 해당 노드에 오버레이/대체함)
- **왼손 / 왼팔 (Left Hand / Arm)**: `256 x 256 px` (피벗: 어깨/팔 접합부 위치. 양손 연출이나 보조 무기 장착 시 해당 노드에 조립함)
- **다리 / 발 (Legs / Feet)**: `128 x 128 px` (피벗: 발바닥 중앙 아래. 바지나 신발이 없는 맨다리와 맨발 상태. **[전투용 앞다리/뒷다리]** 분리 생성)
- **정면 뷰 파츠 (Front View Parts)**: 정면 머리(표정 포함) 및 몸통(`256 x 256 px`), 정면 양팔(`256 x 256 px`), 정면 양다리(`128 x 128 px`)를 독립적으로 생성하여 로비용 에셋 세트로 구성함
- **등 / 날개 (Back / Wings)**: `512 x 512 px` (피벗: 등 중앙 척추 결합 부위)
- **아이콘 및 UI 에셋**: `128 x 128 px` (로비 파티 및 대표 요원 포트레이트용 초상화 포함)
- **VFX 및 시스템 에셋**: `128 x 128 px` 또는 `256 x 256 px` (보호막 이펙트, 전자기 투사체, 넉백 및 피격 마스크 이펙트 텍스처)
- **적(몬스터/보스) 에셋**: 일반 몬스터(`256 x 256 px`), 지역 보스(`512 x 512 px` - 14지역 빅풋 포함) 각 14종
- **재화 및 아이템 아이콘**: `128 x 128 px` (Rad 광석 재화, 13대 고유 특성 칩 디자인 카드 에셋)
- **게임 타이틀 및 결과 화면**: 타이틀 키 비주얼 일러스트(`1024 x 512 px`), 승리(Victory)/패배(Defeat) 엠블럼 에셋

### B. 런타임 10프레임 피벗 제어 방식
실시간 물리 연산 대신, 성능과 일관성을 지키기 위해 **10프레임 규격의 정적 키프레임 위치 배열**을 이용하여 각 파츠(머리, 몸통, 손, 발)의 상대 좌표(`x, y`)와 회전각(`rotation`)을 매핑하여 런타임 조립을 수행합니다.

#### 10프레임 전수 애니메이션 메타데이터 JSON
애니메이션 종류별 0~9프레임의 상세 오프셋 및 회전각(`deg`) 전수 명세입니다:
```json
{
  "idle": [
    { "frame": 0, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 1, "headOffset": {"x": 0, "y": -43, "rotation": 0}, "rArmOffset": {"x": 6, "y": -25, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": -1 },
    { "frame": 2, "headOffset": {"x": 0, "y": -44, "rotation": 0}, "rArmOffset": {"x": 6, "y": -24, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": -2 },
    { "frame": 3, "headOffset": {"x": 0, "y": -43, "rotation": 0}, "rArmOffset": {"x": 6, "y": -25, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": -1 },
    { "frame": 4, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 5, "headOffset": {"x": 0, "y": -41, "rotation": 0}, "rArmOffset": {"x": 6, "y": -27, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 1 },
    { "frame": 6, "headOffset": {"x": 0, "y": -40, "rotation": 0}, "rArmOffset": {"x": 6, "y": -28, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 2 },
    { "frame": 7, "headOffset": {"x": 0, "y": -41, "rotation": 0}, "rArmOffset": {"x": 6, "y": -27, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 1 },
    { "frame": 8, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 9, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 }
  ],
  "run": [
    { "frame": 0, "headOffset": {"x": 1, "y": -41, "rotation": -2}, "rArmOffset": {"x": 8, "y": -24, "rotation": 5}, "legsOffset": {"x": -3, "y": 0, "rotation": 10}, "torsoY": -1 },
    { "frame": 1, "headOffset": {"x": 2, "y": -40, "rotation": -4}, "rArmOffset": {"x": 10, "y": -23, "rotation": 10}, "legsOffset": {"x": -1, "y": 0, "rotation": 5}, "torsoY": 0 },
    { "frame": 2, "headOffset": {"x": 1, "y": -41, "rotation": -2}, "rArmOffset": {"x": 9, "y": -24, "rotation": 5}, "legsOffset": {"x": 1, "y": 0, "rotation": -5}, "torsoY": 1 },
    { "frame": 3, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 7, "y": -25, "rotation": 0}, "legsOffset": {"x": 3, "y": 0, "rotation": -10}, "torsoY": 0 },
    { "frame": 4, "headOffset": {"x": -1, "y": -41, "rotation": 2}, "rArmOffset": {"x": 5, "y": -24, "rotation": -5}, "legsOffset": {"x": 1, "y": 0, "rotation": -5}, "torsoY": -1 },
    { "frame": 5, "headOffset": {"x": -2, "y": -40, "rotation": 4}, "rArmOffset": {"x": 4, "y": -23, "rotation": -10}, "legsOffset": {"x": -1, "y": 0, "rotation": 5}, "torsoY": 0 },
    { "frame": 6, "headOffset": {"x": -1, "y": -41, "rotation": 2}, "rArmOffset": {"x": 5, "y": -24, "rotation": -5}, "legsOffset": {"x": -3, "y": 0, "rotation": 10}, "torsoY": 1 },
    { "frame": 7, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -25, "rotation": 0}, "legsOffset": {"x": -2, "y": 0, "rotation": 5}, "torsoY": 0 },
    { "frame": 8, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 7, "y": -25, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 9, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 7, "y": -25, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 }
  ],
  "attack": [
    { "frame": 0, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 4, "y": -25, "rotation": -15}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 1, "headOffset": {"x": -1, "y": -41, "rotation": 2}, "rArmOffset": {"x": 2, "y": -24, "rotation": -30}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 2, "headOffset": {"x": -2, "y": -40, "rotation": 5}, "rArmOffset": {"x": 0, "y": -22, "rotation": -45}, "legsOffset": {"x": -1, "y": 0, "rotation": 0}, "torsoY": -1 },
    { "frame": 3, "headOffset": {"x": 1, "y": -42, "rotation": -5}, "rArmOffset": {"x": 10, "y": -28, "rotation": 15}, "legsOffset": {"x": 1, "y": 0, "rotation": 0}, "torsoY": 1 },
    { "frame": 4, "headOffset": {"x": 2, "y": -43, "rotation": -10}, "rArmOffset": {"x": 18, "y": -30, "rotation": 45}, "legsOffset": {"x": 2, "y": 0, "rotation": 0}, "torsoY": 2 },
    { "frame": 5, "headOffset": {"x": 3, "y": -44, "rotation": -12}, "rArmOffset": {"x": 22, "y": -30, "rotation": 0}, "legsOffset": {"x": 2, "y": 0, "rotation": 0}, "torsoY": 2 },
    { "frame": 6, "headOffset": {"x": 2, "y": -43, "rotation": -8}, "rArmOffset": {"x": 18, "y": -28, "rotation": -10}, "legsOffset": {"x": 1, "y": 0, "rotation": 0}, "torsoY": 1 },
    { "frame": 7, "headOffset": {"x": 1, "y": -42, "rotation": -3}, "rArmOffset": {"x": 12, "y": -27, "rotation": -15}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 8, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 8, "y": -26, "rotation": -5}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 9, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 }
  ],
  "skill": [
    { "frame": 0, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 4, "y": -25, "rotation": -15}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 1, "headOffset": {"x": -1, "y": -41, "rotation": 5}, "rArmOffset": {"x": 2, "y": -22, "rotation": -45}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": -1 },
    { "frame": 2, "headOffset": {"x": -2, "y": -40, "rotation": 10}, "rArmOffset": {"x": 0, "y": -18, "rotation": -90}, "legsOffset": {"x": -1, "y": 0, "rotation": 0}, "torsoY": -2 },
    { "frame": 3, "headOffset": {"x": 0, "y": -41, "rotation": 0}, "rArmOffset": {"x": 8, "y": -30, "rotation": -120}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 4, "headOffset": {"x": 2, "y": -43, "rotation": -15}, "rArmOffset": {"x": 14, "y": -40, "rotation": -180}, "legsOffset": {"x": 2, "y": 0, "rotation": 0}, "torsoY": 2 },
    { "frame": 5, "headOffset": {"x": 3, "y": -44, "rotation": -20}, "rArmOffset": {"x": 16, "y": -45, "rotation": -180}, "legsOffset": {"x": 2, "y": 0, "rotation": 0}, "torsoY": 3 },
    { "frame": 6, "headOffset": {"x": 2, "y": -43, "rotation": -15}, "rArmOffset": {"x": 14, "y": -40, "rotation": -135}, "legsOffset": {"x": 1, "y": 0, "rotation": 0}, "torsoY": 2 },
    { "frame": 7, "headOffset": {"x": 1, "y": -42, "rotation": -5}, "rArmOffset": {"x": 10, "y": -32, "rotation": -90}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 1 },
    { "frame": 8, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -28, "rotation": -45}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 },
    { "frame": 9, "headOffset": {"x": 0, "y": -42, "rotation": 0}, "rArmOffset": {"x": 6, "y": -26, "rotation": 0}, "legsOffset": {"x": 0, "y": 0, "rotation": 0}, "torsoY": 0 }
  ]
}
```

### C. AI 일러스트 스타일 가이드 및 프롬프트 규격
AI 이미지 생성 시 일관된 아트 스타일과 규격을 보장하기 위한 가이드라인입니다.

#### 1. 스타일 핵심 정의 요소
| 구분 | 정의 요소 | 권장 규격 / 키워드 | 목적 |
| :--- | :--- | :--- | :--- |
| **아트 스타일** | 캐주얼 2D 카툰 렌더링 | `cute 2D cartoon game asset`, `chibi SD style`, `cell-shaded` | 아기자기하고 발랄한 캐주얼 느낌 구현 |
| **선화(Outline)** | 선명한 아웃라인 | `thick outlines`, `clean vector-like lines` | 파츠별 경계 구분 및 시인성 확보 |
| **렌더링 조건** | 투명 단일 에셋화 | `transparent background`, `isolated asset` | 런타임 조립 시 배경 제거 및 크롭 용이성 |
| **색감 및 조명** | 고채도 플랫 라이팅 | `vibrant colors`, `flat shading`, `no harsh shadows` | 프레임 변화 시 광원 어색함 방지 |
| **구도 및 비율** | 2.5등신 SD 비율 | `2.5 head chibi proportion`, `right-facing profile` | 횡스크롤 및 Facing Right 룰 준수 |
| **재질/디자인 통일** | 캐주얼 인체 피부톤 통일 | `flat peach skin tone`, `smooth flesh texture` | 모든 파츠가 한 명의 귀여운 인간 캐릭터 부품으로 연동되게 함 |

#### 2. 파츠별 단수(Single) 조립 규정 및 팔(Arm) 스펙
- **몸통 (Torso)**: 머리, 사지 찌꺼기가 전혀 없는 **독립된 1개의 맨몸 몸체 블록**으로 생성.
- **오른손 / 무기 (Right Hand / Weapon)**: 단순 주먹이 아닌, **어깨부터 손끝까지 이어지는 1개의 맨팔(single bare arm and hand)** 형태로 생성하여 어색함 제거.
- **다리 / 발 (Legs / Feet)**: 두 다리가 한 장에 겹치지 않는 **독립된 1개의 외다리 부품**으로 생성하여 코드에서 개별 제어.

#### 3. 공통 AI 생성 프롬프트 템플릿
[전투용 우향 템플릿]
```text
cute 2D cartoon human chibi style agent body part, [생성할 단일 파츠명], flat peach skin tone, smooth flesh texture, right-facing profile, isolated on plain white background, cell shaded, thick outlines --no [배제할 타 파츠명], no background, shadows
```

[비전투용 정면 템플릿]
```text
cute 2D cartoon human chibi style agent body part, [생성할 단일 파츠명], flat peach skin tone, smooth flesh texture, front view, orthographic projection, T-pose, isolated on plain white background, cell shaded, thick outlines --no [배제할 타 파츠명], no background, shadows
```

### D. VFX 및 파티클 연출 트리거 규격
인게임 전투의 타격감과 시인성을 확보하기 위한 VFX 작동 표준 명세입니다:

#### 1. 공통 피드백 연출 (Common Feedback)
- **피격 틴트 (Hit Tint)**: 모든 캐릭터는 피격 시 즉시 `0.15초` 동안 전신 스프라이트를 단색 빨강색(`#FF0000`)으로 마스킹 및 불투명도 100% 처리하여 깜빡이게 합니다.
- **넉백 (Knockback)**: 피격 대상은 타격 방향의 반대 방향으로 `6px` 즉시 이동(밀려남)한 후, 0.2초에 걸쳐 원래 위치로 탄성 복귀(Elastic Ease-Out)합니다.
- **크리티컬 피드백**: 아군이 치명타(Critical)를 가했을 때, 피격 위치에 거칠고 불규칙한 노란색/백색 픽셀 스파크 파티클 15개를 방사형으로 방출하며, `0.1초` 동안 화면을 4px 반경으로 무작위 흔듭니다(Camera Shake).

#### 2. 지역 특성별 전용 VFX 사양
- **`energy_discharge` (에너지 방출)**: 오른손 무기 총구 위치에서 청백색 전자기 스파크 파티클이 적을 향해 선형 펄스로 전개되며 폭발.
- **`thermal_control` (열에너지 제어)**: 적중 시 적 발밑에서 붉은 용암 용솟음 불꽃 파티클이 치솟고, 화상 상태이상 지속 시간 동안 대상 스프라이트 전체에 투명도 30%의 주황색 아지랑이 효과를 오버레이.
- **`meltdown_control` (멜트다운 제어)**: 요원의 HP가 30% 이하로 하락 시, 캐릭터 테두리에 `2px` 두께의 붉은 네온 글로우(Glow) 효과를 실시간 펄스 형태로 가동.
- **`cellular_shield` (세포 차폐)**: 보호막 발동 시, 요원 전면에 파란색 육각형 벌집 모양 배리어 실루엣이 나타났다가 디졸브(Fade-out)됨.

---

## 2. 🗺️ 14개 지역별 환경 및 해금 특성/아이템 매핑 테이블

| 지역 번호 및 이름 | 환경 및 아포칼립스 설정 | 완파 보상 (캐릭터 / 보조 AI / 특성) | 장착 스킨 파츠 듀얼 뷰 조립 매핑 [전투: 우향 / 로비: 정면] |
| :---: | :--- | :--- | :--- |
| **1. 시베리아 대황무지** | 지독한 핵겨울과 방사능이 결합된 혹한의 땅 | 시베리아 생존자 / 우르사 / **신체 변이** | <ul><li>**[전투] 카이드 가시 키메라 클로**: 오른손(집게)+어깨가시</li><li>**[정면] 카이드 가시 키메라 클로**: 양팔(대칭형 집게)+양어깨가시</li></ul> |
| **2. 서유럽 원전 지대** | 원자력 발전소들의 폭발로 고농도 방사능 데드존 | 원전 방출자 / 멜트다운 / **에너지 방출** | <ul><li>**[전투] 초고전압 아크 캐논**: 오른손 전용 장착</li><li>**[정면] 초고전압 아크 캐논**: 오른손/왼손 대칭 선택 장착</li></ul> |
| **3. 동아시아 메가시티**| IT 문명의 폐허. 데이터 잔해 및 자율 로봇 밀집 | 테크 스캐빈저 / glitch / **감각 변이/테크** | <ul><li>**[전투] 열화상 퀀텀 스캔 바이저**: 우향용 눈 오버레이 고글</li><li>**[정면] 열화상 퀀텀 스캔 바이저**: 정면용 대칭형 눈 오버레이 고글</li></ul> |
| **4. 루마니아** | 혈액이 오염되어 피와 전력을 갈구하는 약탈자 구역 | 흡혈 변이종 / nosferatu / **혈액 흡수** | <ul><li>**[전투] 블러드 나노 사이폰 윙**: 우향용 등 날개 1쌍(원근법)</li><li>**[정면] 블러드 나노 사이폰 윙**: 정면용 좌우 대칭 등 날개 1쌍</li></ul> |
| **5. 이집트** | 세포 변이로 썩지 않는 방사능 미라 무덤 유적 | 무덤 파수꾼 / anubis / **세포 차폐** | <ul><li>**[전투] 육각 기하학 나노 그리드 베일**: 우향용 얼굴 오버레이 베일</li><li>**[정면] 육각 기하학 나노 그리드 베일**: 정면용 대칭형 얼굴 베일</li></ul> |
| **6. 영국** | 푸르고 보랏빛 낙진이 가득한 판타지풍 요정 황무지 | 방사능 마법사 / pixie / **요정 마법** | <ul><li>**[전투] 엘프식 에테르 튜너**: 우향용 귀 오버레이 모듈</li><li>**[정면] 엘프식 에테르 튜너**: 정면용 대칭 귀 모듈</li></ul> |
| **7. 몽골** | 방사능 거대마와 신체를 결합한 메카닉 기병대 영토 | 핵추진 기병 / khan / **동력 과부하** | <ul><li>**[전투] 오버드라이브 카본 외골격**: 우향용 다리+추진기</li><li>**[정면] 오버드라이브 카본 외골격**: 정면용 양다리 추진기</li></ul> |
| **8. 중동** | 유전 폭발로 100년째 불타오르는 화염 대지 | 화염 변이체 / ifrit / **열에너지 제어** | <ul><li>**[전투] 오버히트 마그마 서멀 가드**: 우향용 다리/발 장갑</li><li>**[정면] 오버히트 마그마 서멀 가드**: 정면용 양발 장갑</li></ul> |
| **9. 그리스** | 해수면 상승으로 잠긴 지중해. 초음파 해양 변이종 | 심해 잠수사 / siren / **초음파 정신 교란** | <ul><li>**[전투] 소리굽쇠 진동 메카 테일**: 우향용 측면 꼬리</li><li>**[정면] 소리굽쇠 진동 메카 테일**: 정면용 중앙 꼬리</li></ul> |
| **10. 북유럽** | EMP가 상시 발생하는 숲. 버서커 부족 세력 | 오로라 버서커 / valkyrie / **버서커 광기** | <ul><li>**[전투] 오로라 결정질 가시 견갑**: 우향용 어깨 오버레이</li><li>**[정면] 오로라 결정질 가시 견갑**: 정면용 양어깨 오버레이</li></ul> |
| **11. 인도** | 오염도가 극에 달해 머리 여러 개의 변이 소 숭배지 | 오염의 사제 / brahma / **오염 동화** | <ul><li>**[전투] 래디에이션 스파인 굴뚝**: 우향용 척추형 배기관</li><li>**[정면] 래디에이션 스파인 굴뚝**: 정면용 중앙 척추 배기관</li></ul> |
| **12. 우크라이나** | 초고난도 파밍이 가능한 체르노빌 원전 유적 | 원전 수색대원 / core_breaker / **멜트다운 제어** | <ul><li>**[전투] 임계점 핵융합 라디에이터**: 우향용 투구 대체</li><li>**[정면] 임계점 핵융합 라디에이터**: 정면용 투구 대체</li></ul> |
| **13. 스위스** | 순수 인간성을 유지하며 무인 로봇군으로 통제하는 벙커 | 벙커 엔지니어 / defender / **하이테크 공학** | <ul><li>**[전투] 중성자 하드라이트 아머 코어**: 우향용 몸통/가슴 대체</li><li>**[정면] 중성자 하드라이트 아머 코어**: 정면용 가슴 아머 코어</li></ul> |
| **14. 에베레스트** | 최종 보스 거수 [빅풋] 레이드 구역 | 인류의 구원자 / 보스 빅풋 / **네메시스** | <ul><li>**[전투] 네메시스 승화 스킨**: 전신 우향 순백 외형 스킨 세트</li><li>**[정면] 네메시스 승화 스킨**: 전신 정면 순백 외형 스킨 세트</li></ul> |

---

## 3. 💾 완성형 핵심 게임 시스템 Javascript 구현 스펙

기존 코드에 누락되었던 **인도(11), 우크라이나(12), 스위스(13)**의 특성 데이터 및 융합 공식, 에베레스트 완파 선행 조건 체크가 추가된 **`nemesis` 해금 판정**, 몬스터화 확률 공식, 보조 AI 궁극기 시전 및 10프레임 런타임 조립 모션 처리를 담은 핵심 스크립트 스펙입니다.

```javascript
/**
 * ============================================================================
 * 🧬 PROJECT 2100 캐릭터 특성 (TRAITS) & 시스템 구현 스펙
 * ============================================================================
 */

// 1. 13대 고유 특성 및 6단계 초월/융합, 7단계 네메시스 데이터 정의
const TRAITS_DATA = {
  // --- 5단계: 지역별 13대 고유 특성 ---
  body_mutation: {
    id: "body_mutation",
    name: "신체 변이",
    category: "mutation",
    radCost: 250,
    bonus: { mutationPower: 0.25 },
    description: "기본 신체 파츠의 성능 25% 향상 및 외형 모듈 3종 해금"
  },
  energy_discharge: {
    id: "energy_discharge",
    name: "에너지 방출",
    category: "offense",
    radCost: 250,
    bonus: { extraDamageRate: 0.20, defensePenetration: 0.15 },
    description: "아군 공격 시 20%의 에너지 탄막 피해 추가 및 방어 관통 15%"
  },
  sensory_tech: {
    id: "sensory_tech",
    name: "감각 변이/테크",
    category: "mutation",
    radCost: 250,
    bonus: { critRate: 0.20 },
    description: "적 취약점 노출을 통해 아군 전체 치명타 확률 20% 증가"
  },
  blood_absorption: {
    id: "blood_absorption",
    name: "혈액 흡수",
    category: "survival",
    radCost: 250,
    bonus: { lifeSteal: 0.25 },
    description: "가한 물리 피해의 25%만큼 자신의 체력 즉시 흡수"
  },
  cellular_shield: {
    id: "cellular_shield",
    name: "세포 차폐",
    category: "survival",
    radCost: 250,
    bonus: { immuneToDot: true, startShieldHits: 2 },
    description: "매 턴 시작 시 대미지 2회 무효화 배리어 및 독성/화상 면역"
  },
  fairy_magic: {
    id: "fairy_magic",
    name: "요정 마법",
    category: "control",
    radCost: 250,
    bonus: { aiGaugeCharge: 0.20 },
    description: "아군 액티브 스킬 시전 시 보조 AI 궁극기 게이지 20% 충전"
  },
  power_overload: {
    id: "power_overload",
    name: "동력 과부하",
    category: "control",
    radCost: 250,
    bonus: { speed: 5, extraTurnChance: 0.25 },
    description: "행동 속도 +5 한계 돌파, 적보다 빠를 시 25% 확률로 연속 턴"
  },
  thermal_control: {
    id: "thermal_control",
    name: "열에너지 제어",
    category: "offense",
    radCost: 250,
    bonus: { burnOnSkill: true, burnDamage: 6 },
    description: "액티브 스킬 시전 시 무한 중첩되는 화상(초당 대미지 6) 부여"
  },
  ultrasonic_disruption: {
    id: "ultrasonic_disruption",
    name: "초음파 정신 교란",
    category: "control",
    radCost: 250,
    bonus: { confusionChance: 0.30 },
    description: "스킬 사용 시 30% 확률로 적에게 1턴간 혼란(팀킬 유도) 부여"
  },
  berserker_madness: {
    id: "berserker_madness",
    name: "버서커 광기",
    category: "mutation",
    radCost: 250,
    bonus: { lowHpBuff: true },
    description: "잃은 체력 10%당 공격력 8% 및 행동 속도 4%씩 증가"
  },
  // [추가 구현] 11. 인도 - 오염 동화 특성
  radiation_assimilation: {
    id: "radiation_assimilation",
    name: "오염 동화",
    category: "mutation",
    radCost: 250,
    bonus: { radScaleBuff: true },
    description: "보유한 방사능(Rad) 1,000당 아군 전체 공방 +2% 상시 버프"
  },
  // [추가 구현] 12. 우크라이나 - 멜트다운 제어 특성
  meltdown_control: {
    id: "meltdown_control",
    name: "멜트다운 제어",
    category: "offense",
    radCost: 250,
    bonus: { lowHpReflect: true },
    description: "체력 30% 이하일 때 공격력 +50% 및 피해 반사 20% 활성화"
  },
  // [추가 구현] 13. 스위스 - 하이테크 공학 특성
  hightech_engineering: {
    id: "hightech_engineering",
    name: "하이테크 공학",
    category: "survival",
    radCost: 250,
    bonus: { startTurnShieldRate: 0.20 },
    description: "아군 턴 시작 시 전체에 최대 체력의 20% 보호막 아머 적용"
  },

  // --- 6단계: 카테고리 내부 통합형 상위 초월 특성 (융합 조건 정의) ---
  apocalypse_ragnarok: {
    id: "apocalypse_ragnarok",
    name: "아포칼립스 라그나로크",
    category: "offense_trans",
    radCost: 600,
    reqTraits: ["energy_discharge", "thermal_control", "meltdown_control"],
    description: "영구 핵폭발 필드 전개. 매 턴 전체 적 고정 도트딜 및 50% 방관"
  },
  immortal_leviathan: {
    id: "immortal_leviathan",
    name: "이모탈 리바이어던",
    category: "survival_trans",
    radCost: 600,
    reqTraits: ["blood_absorption", "cellular_shield", "hightech_engineering"],
    description: "최대 체력 100% 영구 상승. 사망 시 3턴간 '무적 유령' 상태로 폭주"
  },
  chronos_fairy: {
    id: "chronos_fairy",
    name: "크로노스 페어리",
    category: "control_trans",
    radCost: 600,
    reqTraits: ["fairy_magic", "power_overload", "ultrasonic_disruption"],
    description: "아군 스킬 쿨타임 삭제(매 턴 연사) 및 적 보스 스킬 쿨타임 강제 락인"
  },
  pandemonium_chaos: {
    id: "pandemonium_chaos",
    name: "판데모니움 카오스",
    category: "mutation_trans",
    radCost: 600,
    reqTraits: ["body_mutation", "sensory_tech", "berserker_madness", "radiation_assimilation"],
    description: "ALL 스탯 +30%, 피격 시 무작위 상태이상 적 전체 전염"
  },

  // --- 6단계 하이브리드: 카테고리 교차 융합 특성 ---
  armored_destroyer: {
    id: "armored_destroyer",
    name: "아머드 디스트로이어",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["offense", 2], ["survival", 2]],
    description: "액티브 스킬 피해의 30%를 배리어로 전환 (배리어 유지 시 공격력 +25%)"
  },
  thunder_claymore: {
    id: "thunder_claymore",
    name: "썬더 클레이모어",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["offense", 2], ["control", 2]],
    description: "평타 기절 확률 20%. 기절 대상 타격 시 100% 치명타 및 공격 속도 +30%"
  },
  hybrid_nova: {
    id: "hybrid_nova",
    name: "하이브리드 노바",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["offense", 2], ["mutation", 2]],
    description: "변이 파츠 스탯 2배 증가. 공격 시 20% 확률로 광역 오염 대폭발"
  },
  chrono_barrier: {
    id: "chrono_barrier",
    name: "크로노 배리어",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["survival", 2], ["control", 2]],
    description: "배리어 파괴 시 아군 행동 게이지 50% 즉시 충전 및 1턴간 절대 무적"
  },
  nosferatu_chimera: {
    id: "nosferatu_chimera",
    name: "노스페라투 키메라",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["survival", 2], ["mutation", 2]],
    description: "치명상 피격 시 1회 부활. 아군 전체 영구 피흡 15% 및 최대 HP +20%"
  },
  cosmic_glitch: {
    id: "cosmic_glitch",
    name: "코스믹 글리치",
    category: "hybrid",
    radCost: 600,
    reqCombinations: [["control", 2], ["mutation", 2]],
    description: "시작 시 분신 2개 생성. 보스 스킬 시전 시 40% 확률로 오독 강제 취소"
  },

  // --- 7단계: 최종 통합체 (네메시스) ---
  nemesis: {
    id: "nemesis",
    name: "네메시스",
    category: "ultimate",
    radCost: 1200,
    description: "몬스터화 확률 0%. 사망 시 절대 주신 부활, 화면 내 적 즉사 및 보스 파멸 딜"
  }
};

/**
 * 2. 캐릭터의 진화 등급 (Tier 1~7) 판정 함수
 * @param {Array<string>} ownedTraitIds - 캐릭터가 보유한 특성 ID 목록
 * @param {Array<number>} clearedRegions - 완파한 지역 번호 목록
 */
function checkEvolutionTier(ownedTraitIds, clearedRegions = []) {
  // 네메시스 해금 검사 (14번 에베레스트 완파 및 6단계 전체 보유 여부)
  const required6Tiers = [
    "apocalypse_ragnarok", "immortal_leviathan", "chronos_fairy", "pandemonium_chaos",
    "armored_destroyer", "thunder_claymore", "hybrid_nova", "chrono_barrier", "nosferatu_chimera", "cosmic_glitch"
  ];
  const hasAll6Tiers = required6Tiers.every(id => ownedTraitIds.includes(id));
  const isEverestCleared = clearedRegions.includes(14);

  if (ownedTraitIds.includes("nemesis") && hasAll6Tiers && isEverestCleared) {
    return 7; // Tier 7 네메시스
  }
  
  // 6단계 초월/융합 보유 시 6성
  const has6Tier = ownedTraitIds.some(id => required6Tiers.includes(id));
  if (has6Tier) return 6;

  // 13대 고유 특성 보유 시 5성
  const has5Tier = ownedTraitIds.some(id => {
    const t = TRAITS_DATA[id];
    return t && t.radCost === 250;
  });
  if (has5Tier) return 5;

  const count = ownedTraitIds.length;
  if (count >= 6) return 4;
  if (count >= 3) return 3;
  if (count >= 1) return 2;
  return 1;
}

/**
 * 3. 방사능 영구 사망 (몬스터화) 판정 계산기
 * @param {number} currentRad - 현재 소지한 방사능 재화량
 * @param {number} radCapacity - 캐릭터의 최대 방사능 수용한계치
 * @param {boolean} hasClaude - 안정형 보조 AI '클로드' 장착 여부
 * @returns {number} 0~1 사이의 몬스터화 발생 확률값
 */
function calculateMonsterizationProbability(currentRad, radCapacity, hasClaude = false) {
  let prob = 0;
  const ratio = currentRad / radCapacity;

  if (ratio <= 1.0) {
    // 수용한계치 이하: 지수 비례 최대 30%
    prob = ((Math.exp(ratio) - 1) / (Math.exp(1) - 1)) * 0.30;
  } else {
    // 수용한계치 초과: 30% + 70% 가중치
    const excess = ratio - 1.0;
    prob = 0.30 + 0.70 * (1 - Math.exp(-2.0 * excess));
  }

  // 보조 AI 클로드 장착 시 사망 리스크 상시 20% 경감 적용
  if (hasClaude) {
    prob = Math.max(0, prob - 0.20);
  }

  return prob;
}

/**
 * 4. 자동 턴제 전투 데미지 계산 공식 엔진
 * @param {Object} attacker - 공격자 객체 (atk 스탯, 특성 버프 등 포함)
 * @param {Object} defender - 방어자 객체 (def 스탯, 버프 등 포함)
 * @param {number} skillMultiplier - 스킬 고유 배율 (예: 일반공격 1.0, 스킬공격 1.5)
 * @param {boolean} isCrit - 치명타 발생 여부
 * @returns {number} 최종 연산된 데미지 정수값
 */
function calculateDamage(attacker, defender, skillMultiplier = 1.0, isCrit = false) {
  // 1. 공격자 관통 효율 계산 (네메시스 및 특성 버프 반영)
  const pen = attacker.traits && attacker.traits.includes("nemesis") ? 1.0 : (attacker.defensePenetration || 0);
  const effectiveDef = defender.def * (1 - pen);

  // 2. 기본 데미지 산출 (방어력 감쇄식)
  let baseDmg = (attacker.atk * skillMultiplier) - effectiveDef;

  // 3. 최소 데미지 보장제 (방어력이 공격력보다 극도로 높아도 기본 공격력의 10% 피해 보장)
  const minDmg = attacker.atk * 0.10;
  if (baseDmg < minDmg) {
    baseDmg = minDmg;
  }

  // 4. 피해 증가율(extraDamageRate) 추가 변환 적용
  const dmgAmp = 1 + (attacker.extraDamageRate || 0);
  let finalDmg = baseDmg * dmgAmp;

  // 5. 치명타 배율 적용 (기본 1.5배)
  if (isCrit) {
    finalDmg *= 1.5;
  }

  return Math.floor(finalDmg);
}

/**
 * 5. 상태 이상 (기절, 화상, 혼란) 메커니즘 엔진
 * @param {Object} target - 상태이상을 적용받을 대상 객체
 * @param {string} effectType - 상태이상 유형 ('stun', 'burn', 'confusion')
 * @param {number} duration - 지속 턴 수
 */
function applyStatusEffect(target, effectType, duration = 1) {
  // 세포 차폐(cellular_shield) 특성 또는 네메시스 권능이 활성화된 상태라면 디버프 면역 작동
  const hasImmunity = (target.traits && target.traits.includes("cellular_shield")) || 
                      (target.traits && target.traits.includes("nemesis"));
                      
  if (hasImmunity && (effectType === "burn" || effectType === "confusion")) {
    console.log(`${target.name}은 상태이상 면역 패시브로 디버프를 차단했습니다.`);
    return;
  }

  if (!target.statusEffects) {
    target.statusEffects = {};
  }

  target.statusEffects[effectType] = {
    duration: duration,
    tick: () => {
      if (effectType === "burn") {
        // 화상: 매 턴 지속 피해 6 적용
        const burnDmg = 6;
        target.hp = Math.max(0, target.hp - burnDmg);
        console.log(`${target.name}이 화상으로 인해 ${burnDmg}의 지속 피해를 입었습니다.`);
      }
      if (effectType === "stun") {
        // 기절: 행동 정지 및 턴 스킵 플래그 활성화
        target.skipTurn = true;
        console.log(`${target.name}이 기절하여 행동하지 못합니다.`);
      }
      if (effectType === "confusion") {
        // 혼란: 50% 확률로 아군을 공격하는 행동 유도
        if (Math.random() <= 0.50) {
          target.targetTeamkill = true;
          console.log(`${target.name}이 아군을 적으로 오인하여 혼란에 빠졌습니다.`);
        }
      }
    }
  };
}

/**
 * 6. 거점 안전쉘터 상점 및 Rad 재화 경제 시스템 연산
 * @param {string} actionType - 동작 분류 ('levelup', 'evolve_normal', 'evolve_trans', 'evolve_nemesis', 'battle_reward')
 * @param {number} param - 현재 레벨 또는 클리어 라운드 수
 * @returns {number} 소모 및 획득에 따른 수치 변화값
 */
function calculateRadEconomy(actionType, param = 1) {
  switch (actionType) {
    case "levelup":
      // 요원 레벨업 비용: 필요 Rad = 현재 레벨 * 100
      return param * 100;
    case "evolve_normal":
      // 5단계 일반 지역 고유 특성 진화 비용
      return 250;
    case "evolve_trans":
      // 6단계 상위 초월 및 교차 융합 특성 진화 비용
      return 600;
    case "evolve_nemesis":
      // 7단계 최종 네메시스 진화 비용
      return 1200;
    case "battle_reward":
      // 전투 라운드 완료 보상: 기본 50 Rad * 클리어 라운드 + (보스전 여부에 따른 가중치 200~500)
      const baseReward = 50 * param;
      const isBossRound = param % 10 === 0;
      const bossBonus = isBossRound ? (200 + Math.floor(Math.random() * 301)) : 0;
      return baseReward + bossBonus;
    default:
      return 0;
  }
}

/**
 * 7. 보조 AI 브랜드 오마주 스킬 트리거 구조
 */
const SUPPORT_AI = {
  chat_gpt: {
    name: "지피티",
    trigger: "onBattleStart",
    execute: (party) => {
      // 아군 주 특성을 자동 스캔하여 스킬 피해 15% 증가 버프 부여
      party.forEach(agent => {
        agent.skillDamageMultiplier += 0.15;
      });
    }
  },
  claude: {
    name: "클로드",
    trigger: "onAgentLowHp",
    execute: (agent) => {
      // 아군 HP가 30% 이하일 때 쉴드 자동 생성
      if (agent.hp / agent.maxHp <= 0.30) {
        agent.shield += agent.maxHp * 0.25;
      }
    }
  },
  gemini: {
    name: "제미나이",
    trigger: "onAttack",
    execute: (attacker, target) => {
      // 타격 시 적 방어력 20% 영구 무시/관통 적용
      attacker.tempIgnoreDefense += 0.20;
    }
  },
  siri: {
    name: "시리",
    trigger: "onTurnStart",
    execute: (boss, party) => {
      // 매 턴 시작 시 15% 확률로 보스 턴 스킵 및 디버프 유도
      if (Math.random() <= 0.15) {
        boss.skipTurn = true;
        boss.confused = true;
      }
    }
  },
  grok: {
    name: "그록",
    trigger: "onBattleStart",
    execute: (party) => {
      // 아군 방어력 15% 감하, 치명타율 25% 폭증, 도발 적용
      party.forEach(agent => {
        agent.defenseMultiplier -= 0.15;
        agent.critRate += 0.25;
        agent.taunt = true;
      });
    }
  }
};

/**
 * 8. 런타임 10프레임 파츠 렌더링/위치 조립 갱신 엔진
 * @param {Object} agent - 요원 객체 (머리, 몸통, 오른손, 발 스프라이트 포함)
 * @param {number} frameIndex - 10프레임 범위의 인덱스 (0~9)
 * @param {Object} pivotTable - 10프레임 기준 오프셋 맵 데이터
 */
function updateAgentAnimation(agent, frameIndex, pivotTable) {
  const frameData = pivotTable[frameIndex];
  if (!frameData) return;

  // A. [최신 0.5 룰 반영]: 캐릭터는 Facing Right(우측 고정) 상태
  agent.bodySprite.scale.x = 1.0; 

  // B. 몸통(중심) 기준 각 파츠 조립 위치와 피벗 세팅
  // 머리 파츠 조립 (y축 오프셋 적용)
  agent.headSprite.x = agent.bodySprite.x + frameData.headOffset.x;
  agent.headSprite.y = agent.bodySprite.y + frameData.headOffset.y;
  
  // 오른팔/오른손 조립 (Z-Index 전면 노출)
  agent.rArmSprite.x = agent.bodySprite.x + frameData.rArmOffset.x;
  agent.rArmSprite.y = agent.bodySprite.y + frameData.rArmOffset.y;
  agent.rArmSprite.zIndex = 14; 

  // 다리/발 조립 (Z-Index 바닥 위치)
  agent.legsSprite.x = agent.bodySprite.x + frameData.legsOffset.x;
  agent.legsSprite.y = agent.bodySprite.y + frameData.legsOffset.y;
  agent.legsSprite.zIndex = 9;

  // C. [최신 0.5 룰 반영]: 뷰 모드(전투용 우향 / 로비용 정면)에 따른 왼팔 렌더링 제어
  if (agent.viewMode === "front") {
    // 로비 정면 뷰: 왼팔을 대칭 위치에 온전히 노출 (오른팔과 동등한 Z-index)
    if (agent.lArmSprite) {
      agent.lArmSprite.visible = true;
      agent.lArmSprite.zIndex = 14; 
      agent.lArmSprite.x = agent.bodySprite.x - 12; // 정면 대칭 오프셋
      agent.lArmSprite.y = agent.bodySprite.y + frameData.torsoY;
    }
  } else {
    // 전투 횡스크롤 우향 뷰: 왼팔을 몸통 뒤로 배치하여 입체감 연출
    if (agent.lArmSprite) {
      agent.lArmSprite.visible = true; 
      agent.lArmSprite.zIndex = 4; // 몸체(10)보다 뒤쪽으로 배치
      agent.lArmSprite.x = agent.bodySprite.x - 6; // 대칭 배치를 위한 기본 오프셋
      agent.lArmSprite.y = agent.bodySprite.y + frameData.torsoY;
    }
  }
}
```

---

## 4. 🚀 변경 파일 및 마스터 관리 원칙

1. **단일 관리 규칙**: 이제 캐릭터 사양, 화풍 규칙, 기획과 Javascript 스켈레톤의 마스터 스펙은 오직 이 문서 `docs/project_2100_integrated_spec.md`에서만 단일 관리 및 버전 보관됩니다.
2. **사이드이펙트 방지**: 기존의 개별 도트 사양서, 벡터 기획서, 특성 매핑 가이드라인은 완전 폐기되었으므로 절대 참조하지 마십시오.
3. **산출물 및 에셋 보관 원칙**: 프로젝트와 관련된 모든 설계 문서, 보고서, 이미지 리소스 등의 산출물은 프로젝트 루트 산출물 폴더(`/docs/` 또는 하위 폴더) 내에 생성 및 관리해야 합니다.
