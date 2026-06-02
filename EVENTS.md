# 이벤트 갭 분석 — 실제 야구 대비 미구현 항목

> 본 문서는 `v0.5.1` 시점(2026-05) 코드베이스 기준으로 갱신됨. 시간이 지나면 일부 항목은 이미 구현됐을 수 있으므로 작업 전 코드 확인 필수.

## TL;DR

- **v0.5.1 기준 — Phase 1 메커니즘은 모두 완료.** 우선순위 #1~#16 중 #13(일본 진출, 영구 제외) 외 전 항목 ✅.
- 새 시스템 누적: `milestones.js`, `military.js`, `postseason.js`(시리즈제), `hallOfFame.js`, 시즌 이벤트 라이브 모달 (올스타·WBC·올림픽·아시안게임·프리미어12), FA·트레이드 시스템.
- 사용자 요구로 **국제대회 메달 → 병역 면제** + **시즌 휴식기 자동 대체(`intl_tournament` 카테고리 강제)** 통합.
- v0.5 balance pass: NPC cap·매치업 공식·노화 곡선·5선발 로테이션 등 8건 재조정 → 시즌 ERA·AVG 가 실제 KBO·MLB 분포에 일치.
- **유일하게 남은 차후 작업**: 회귀 시스템 (`§3.5` — 사용자 직접 설계).
- 검증 스크립트 동봉: `probe.mjs` (4 stage 단위 검증) + `probe-career.mjs` (22시즌 풀 커리어 시뮬). **§6 참고**.

---

## 1. 현재 구현 인벤토리

| 레이어 | 위치 | 보유 항목 | 비고 |
|---|---|---|---|
| 타석 결과 | `simulator.js:simulateAtBat` + `classifyOut` | K · BB · HBP · 1B · 2B · 3B · HR · OUT · E · SF · DP (11종) | v0.3 확장, v0.5 매치업 압축(softDiff) |
| 베이스러닝 | `simulator.js:attemptSteal` + `applyResult` | 도루 시도 (SB/CS), 베이스 주자 객체 추적 | v0.3 — 1루→2루만 |
| 동점/연장 | `STAGE_RULES` | 리그별 무승부/승부치기 규정 | high/univ/pro1/pro2/mlb 분기 |
| 부상 | `player.js:applyInjury` | minor/moderate/severe + bodyPart(7부위) + surgery + aftereffect | v0.4 부위·토미존 |
| NPC 부상 | `simulator`+`npc.js` | 라인업/릴리버 자동 제외, 주 단위 카운터 감소 | v0.3 후반 패치 |
| 컨디션 | `tickConditionWeekly` | 호조/슬럼프 사이클 | 이벤트 트리거 미연결 |
| 시즌 수상 | `awards.js` | 타격왕/홈런왕/RBI/K/ERA/신인/MVP/양방향MVP/골든글러브 | v0.4 완비 |
| 토너먼트 결승 | `finals.js` | 고교 7개 대회 결승 모달 + MVP | 라이브 로그 + 일시정지/배속 + POV |
| 휴식기 이벤트 | `offseason.js` | 5 카테고리 + 20+ 이벤트 + U-18 (`intl_tournament`) | great/ok/bad 굴림 |
| 시즌 중 이벤트 | `seasonEvents.js` | 올스타·WBC·올림픽·아시안게임·프리미어12 — 모두 **라이브 모달** | `intlTournamentLive` 공용 |
| 진로 분기 | `career.js` | 대학/KBO 드래프트(라이브 모달)/MLB(오퍼 모달)/은퇴 | 드래프트 라운드 누적 라이브 |
| 마일스톤 | `milestones.js` | 사이클링/만루HR/퍼펙트/노히트/완봉/끝내기/통산 안타·HR·K·W | 단경기+통산 자동 검출 |
| 군 입대 | `military.js` | 상무/경찰/사회복무 3옵션 + 면제 자격(올림픽/아시안게임 메달) | 2시즌 시뮬 |
| 포스트시즌 | `postseason.js` | KBO(wc단판/spo3전2/po5전3/ks7전4) · MLB(wc3전2/ds5전3/cs·ws7전4) | 시리즈 + 라이브 모달 |
| 명예의 전당 | `hallOfFame.js` | 통산 점수 300/200 임계 → 헌액/영구결번/일반은퇴 | 은퇴 엔딩 |
| 계약 / FA | `career.js`+`player.contract` | 4년 계약 + 만료 시 잔류/이적 모달 (오퍼 임계: score 80/100/120) | v0.5 |
| 트레이드 | `career.js:maybeTradeOffer` | 휴식기 진입 시 8% 확률 NPC 제안, 수락/거절 | v0.5.1 |

---

## 2. 실제 야구 대비 갭

### A. 경기 안 — 거의 완료

| 실제 야구 | 게임 상태 |
|---|---|
| 사구 (HBP) | ✅ v0.3 — 출루 + v0.3 후반 부상 트리거 (5% × MAIN_INJURY_LUCK 0.4) |
| 도루 시도 / 캐치 | ✅ v0.3 — 1루→2루만 (3루 도루 / 더블 스틸 미구현) |
| 희생 플라이 | ✅ v0.3 — 희생 번트 미구현 |
| 병살타 | ✅ v0.3 — 삼중살 미구현 |
| 실책 (E) | ✅ v0.3 — 출루 변형 (송구·포구 구분 X) |
| 만루홈런 | ✅ v0.4 `milestones.grandSlam` |
| **끝내기** | ✅ v0.5 — simulator 가 `walkoff:true` 부착, `milestones.walkoff/walkoffHR` 검출 |
| 노히트노런 / 퍼펙트 / 완봉 | ✅ v0.4 — `milestones.js` 검출 |
| 사이클링 히트 | ✅ v0.4 |
| 미구현 — 폭투/포일/보크 | 제구 페널티는 BB/HBP 로 흡수 |
| 미구현 — 견제사/야수선택 | 베이스 디테일 부재 |

### B. 시즌 중 — 완비

| 실제 야구 | 게임 상태 |
|---|---|
| 올스타전 | ✅ v0.4 → v0.4 후반 라이브 모달 (`allStarLive`) |
| 골든글러브·MVP·신인왕·타격왕·홈런왕·RBI·K·ERA | ✅ v0.4 `awards.js` |
| 한국시리즈 / 와일드카드 / 준PO / PO | ✅ v0.4 단판 → v0.5 시리즈제 (`postseason.js`) |
| 디비전 / 챔피언십 / 월드시리즈 | ✅ v0.5 시리즈제 |
| 신인 드래프트 (라이브 라운드 호명) | ✅ v0.4 `weekly.openDraftLiveModal` |
| WBC / 올림픽 / 아시안게임 / 프리미어12 | ✅ v0.5 라이브 모달 (`intlTournamentLive`) |
| 군 입대 (상무/경찰/사회복무 + 면제) | ✅ v0.4 `military.js` |
| FA | ✅ v0.5 — 4년 계약 + 잔류/이적 모달 |
| 트레이드 | ✅ v0.5.1 — 휴식기 진입 시 8% 확률 NPC 제안 |
| 부상자 명단 (IL) | severe 부상은 weeksLeft 로 자동 결장. 별도 IL 명명 X |
| 슬럼프 / 입스 | `condition` 사이클 있으나 이벤트 트리거 미연결 |

### C. 휴식기 (이미 풍부)

| 실제 야구 | 게임 상태 |
|---|---|
| 캠프 (스프링/마무리) | `camp` 카테고리로 추상화 |
| 토미존 수술 | ✅ v0.4 — severe + 어깨/팔꿈치 30% 굴림 → weeksLeft 30 (시즌 아웃) |
| 부상 후유증 (aftereffect) | ✅ v0.4 — 부위별 영구 stat 감쇄 |
| 결혼/출산/광고/봉사 | `confession`/`fame` 활용처 부재 — 가치 낮음 |

### D. 캐릭터 라이프 — 사용자 결정으로 단순화

| 실제 야구 | 게임 상태 |
|---|---|
| 멘토 / 라이벌 NPC | 영구 NPC 시스템 (`relations.js`)은 v0.4 도입 후 v0.4.x 에서 제거 — 휴식기 이벤트 (`mentor_pitcher` / `rival`)는 1회성으로 존속 |
| 가족 / 코치 사망 / 동료 부상·이적 | 미구현. 가치 낮음 — 회귀 시스템에서 부수 효과로 도입 가능 |

### E. 마일스톤 — 완비

`milestones.js` 가 단경기 + 통산 양쪽 모두 자동 검출:
- 단경기: 사이클링, 만루HR, 퍼펙트, 노히트, 완봉, **끝내기 (안타/HR 별도)**
- 통산 임계 (`CAREER_THRESHOLDS`): 안타 100/500/1000/2000/3000, HR 50/100/200/500, K 100/500/1000/2000, W 50/100/200/300

---

## 3. 우선순위 표 (v0.5.1 — 모두 완료)

| 순위 | 작업 | 상태 | 비고 |
|---|---|---|---|
| ~~1~~ | ~~타석 결과 확장 (HBP/도루/희생타/병살/실책)~~ | ✅ v0.3 완료 | — |
| ~~1a~~ | ~~R / RBI 정식 추적~~ | ✅ v0.3 후반 패치 완료 | `applyResult` 가 `scoredRunners`/`rbi` 반환 |
| ~~1b~~ | ~~투수 교체 + W/L/SV~~ | ✅ v0.3 후반 패치 완료 | mound state + 결승투수 결정 + bullpen 휴식 |
| ~~1c~~ | ~~NPC 부상 시스템~~ | ✅ v0.3 후반 패치 완료 | NPC injury 필드 + 라인업 자동 제외 |
| ~~1d~~ | ~~콜드게임 (mercy rule)~~ | ✅ v0.3 후반 패치 완료 | 한국 고교/대학 5회 10점 / 7회 7점, 결승전 미적용 |
| ~~1e~~ | ~~결승 모달 실시간 점수~~ | ✅ v0.3 후반 패치 완료 | `events.runsScored` + 메인 PA 즉시 반영 |
| ~~1f~~ | ~~코치판단 출장~~ | ✅ v0.3 후반 패치 #2 완료 | 약체 메인 → NPC SP 에 마운드 양보 (OVR 비율 감쇄) |
| ~~2~~ | ~~마일스톤 자동 검출 + 토스트~~ | ✅ v0.4 완료 | `milestones.js` |
| ~~3~~ | ~~시즌 중 이벤트 카탈로그~~ (올스타·WBC·올림픽·아시안게임·프리미어12) | ✅ v0.4 완료 | `seasonEvents.js` SEASON_EVENTS 5개 |
| ~~4~~ | ~~군 입대~~ + 국제대회 면제 연동 | ✅ v0.4 완료 | `military.js`, offseason `intl_tournament` |
| ~~5~~ | ~~포스트시즌~~ (KBO wc·spo·po·ks / MLB wc·ds·cs·ws) | ✅ v0.4 (단판) | `postseason.js` — 시리즈제는 미구현 |
| ~~6~~ | ~~부상 부위 + 후유증 + 토미존~~ | ✅ v0.4 완료 | `applyInjury` 확장, 7부위 |
| ~~6a~~ | ~~HBP → 부상 트리거~~ | ✅ v0.3 후반 패치 완료 | HBP 5% 부상 굴림, 메인 0.4x |
| ~~7~~ | ~~드래프트 라이브 모달~~ | ✅ v0.4 완료 | `weekly.js:openDraftLiveModal` |
| ~~8~~ | ~~멘토/라이벌 영구 NPC~~ | ✅ v0.4 완료 | `relations.js` — 휴식기 이벤트 연동은 추가 작업 |
| ~~9~~ | ~~골든글러브~~ | ✅ v0.4 완료 | `awards.js` |
| ~~10~~ | ~~FA 이벤트화~~ | ✅ 완료 | 4년 계약 + 만료 시 잔류/이적 모달. 트레이드는 차후 분리 |
| ~~11~~ | ~~포스트시즌 시리즈제 (3/5/7전제)~~ | ✅ 완료 | `postseason.js` seriesLength + recordSeriesGame |
| ~~12~~ | ~~시즌 중 이벤트 라이브 모달~~ | ✅ 완료 | WBC/올림픽/아시안게임/프리미어12 modal 전환 |
| ~~13~~ | ~~일본 프로야구 진출 경로~~ | 영구 제외 | 사용자 결정 — 코드/i18n/팀풀에서 완전 삭제 |
| ~~14~~ | ~~끝내기(walkoff) 마일스톤~~ | ✅ 완료 | simulator 가 walkoff:true 부착 + milestones 검출 |
| ~~15~~ | ~~명예의 전당 헌액~~ | ✅ 완료 | `hallOfFame.js` — 점수 300/200 임계로 헌액/영구결번/일반 |
| ~~16~~ | ~~트레이드 이벤트화~~ | ✅ 완료 | 휴식기 진입 시 8% 확률 NPC 트레이드 제안, 수락/거절 모달 |

### 다음 작업 권장

**유일한 차후 작업** — 회귀 시스템 (`§3.5` 참고). 사용자가 직접 설계 예정.

### 즉시 가능 (1-2시간 작업)

- **세이브 마이그레이션 보강** — v0.5 신규 필드(`contract`, `tournamentHistory`(PO), `milestones`) 들이 옛 세이브에 없을 때 기본값 세팅
- **컨디션 슬럼프 → 이벤트 트리거** — `tickConditionWeekly` 가 장기 저조 시 회복 미니이벤트 띄우기

---

## 3.5. 회귀 시스템 (Regression / NewGame+) — v0.6 구현 완료

> 2026-05-28 설계 확정 → 같은 날 5 phase 일괄 구현 완료.
> P1 (메타 영속화 + 상점 카탈로그) / P2 (은퇴 모달 + 5탭 UI) / P3 (createPlayer 자동 반영) /
> P4a-b (14 효과 wiring) / P5 (도전과제 4종 해금).

**TL;DR**: 은퇴 시 누적된 메타 점수로 5탭 상점에서 강화 구매 → 다음 캐릭터 빌드. 영구 누적(재능 슬롯·stage cap) + 캐릭터 한정 재구매(시작 능력치·특성·유물) 하이브리드.

### 점수 산정

`hallOfFame.js:computeHallOfFameScore` 의 `total` 을 그대로 회귀 점수로 사용. 통산 H/HR/RBI/SB/W/K/SV + 우승 30점 + 대회우승 5점 + MVP 50/신인왕 30 + 큰 마일스톤. 풀 22시즌 컨택형 캐릭터 ~400~500점, 짧은 커리어 100~200점.

### 저장 — localStorage 별도 키

캐릭터 세이브(`ninthinning.save.v*`)와 독립. 회귀 메타는 `ninthinning.regression.v1`:

```js
{
  balance: 0,                  // 사용 가능 점수 (영구 누적)
  totalEarned: 0,              // 평생 누적 (통계용)
  runs: 0,                     // 회귀 횟수
  permanentPurchases: {        // 영구 탭 구매 내역
    talentSlots: 0,            // 0~2 (총 1~3 재능)
    capBoosts: { amateur: 0, kbo: 0, mlb: 0 },  // 각 0~3 (+10/+20/+30)
  },
  unlockedItems: [],           // 도전과제 해금된 특성/유물 키
  loadout: {                   // 다음 캐릭터에 적용될 재구매 탭 선택
    startingStat: null,        // "balanced" | "battingFocus" | "pitchingFocus"
    traits: [],                // 장착 특성 키 (최대 3)
    relics: [],                // 장착 유물 키 (최대 2)
  },
}
```

### 상점 5탭

| 탭 | 영구성 | 항목 / 가격 |
|---|---|---|
| **재능 슬롯** | 영구 | +1 (500점, 총 2재능) → +2 (1500점, 총 3재능). 효과 boost 합산 |
| **stage cap** | 영구·누적 | 아마추어(HS+대학) 200/400/700, KBO(pro1+pro2) 500/1000/1700, MLB(mlb_a~mlb) 800/1500/2500. 각 +10/+20/+30 |
| **시작 능력치** | 재구매·캐릭터당 1 | 균형(10종 +5) 300 / 타격 집중(5종 +10) 400 / 투구 집중(5종 +10) 400 |
| **특성** | 재구매·1~3장 장착 | 8종 (아래) |
| **유물** | 재구매·1~2개 장착 | 6종 (아래) |

**특성 카탈로그** (가격 / 해금 조건):
- 강철멘탈: 부상 확률 ×0.5 (200, 기본 해금)
- 학습자: 첫 시즌 훈련 효율 ×2 (150, 기본)
- 스타성: 명성 획득 ×1.5 (200, 기본)
- 클러치: 9회+ 끝내기 확률 ×2 (200, 끝내기 1회 해금)
- 빅게임: 결승/PO 보상 ×1.5 (250, 우승 1회 해금)
- 전성기 연장: 노화 시작 +3년 (300, HoF 헌액 해금)
- 전설의 후계자: 시작 명성 +50 (300, HoF 헌액 해금)
- 철완: severe 부상 시 토미존 확률 0 (350, severe 부상 회복 해금)

**유물 카탈로그** (가격):
- 전생의 노트: 첫 시즌 훈련 ×2 (100)
- 행운의 배트: 끝내기 확률 +5%p (80)
- 명함: 신인 드래프트 라운드 +1 (150)
- 멘토의 편지: 자동훈련 부족도 보정 ×1.5 (100)
- 의수: 부상 회복 ×2 (120)
- 황금 글러브: 실책 확률 ×0.5 (150)

### 구현 순서

1. `src/systems/regression.js` — 점수 계산 (HoF 점수 래퍼) + localStorage 영속화 + 상태 로드/세이브
2. `src/data/shopCatalog.js` — 위 카탈로그 코드화
3. 은퇴 모달 (`hallOfFame` 결과 패널)에 "점수 N 획득" + "상점 보기" 버튼
4. `src/views/shop.js` — 5탭 UI + 구매/장착 액션
5. 캐릭터 생성 (`menu.js` + `player.js:createPlayer`) — 영구 효과 자동 적용 + 재능 슬롯 N개 지원 + 시작 능력치 가산
6. 특성/유물 효과 wiring — `player.js` (부상/훈련/노화), `simulator.js` (끝내기/실책), `career.js` (드래프트/명성), `finals.js` (보상 배율)
7. 도전과제 해금 검출 — `milestones.js` / `hallOfFame.js` / `applyInjury` 회복 시점에 `unlockedItems` push
8. `probe-regression.mjs` — 회귀 1회 시뮬 (HoF 점수 → 영구 구매 → 다음 캐릭터 시작값 검증)
9. i18n KO/EN — `shop.*`, `trait.*`, `relic.*`, `regression.*` 키 풀

### 잠재적 충돌 영역

- 재능 슬롯 확장 시 `TALENTS[player.talent].boost` 가 단일 객체 가정 — 다중 재능은 배열로 저장하고 `boost` 가산 합치는 헬퍼 필요
- stage cap 상향이 `getPlayerStatCap` 만 통과하는지, `applyGameExperience` / `agedDecline` 등 다른 cap 참조 없는지 점검
- 영구 cap 보너스가 적용된 상태에서 NPC cap (`getNpcStatCap`) 은 그대로 둘지 — 그대로 두면 메인이 절대 강해지는 방향. 의도된 보상으로 OK
- ~~`mental` cap 초과 버그 (probe-career에서 183 관측) 회귀 시스템과 별개로 우선 패치 필요~~ → v0.6.1 fix: `milestones.js award` 의 `Math.min(300, ...)` 하드코딩 → `getPlayerStatCap(player)` 로 교체. probe-career 검증 mental 피크 251 → 228 (cap 250 이내)

---

## 4. 구현 메모

### 시즌 중 이벤트 추가 패턴 (인프라 재사용)

`seasonEvents.js` 에 이미 다음 흐름이 준비되어 있음:

1. `SEASON_EVENTS` 카탈로그에 `{ key, type, handlerKey, trigger }` 추가
2. `endWeek` → `checkScheduledEvents` 가 자동 호출됨
3. `state.pendingEvents` 큐에 적재
4. UI 측에서 `nextPendingEvent` → 모달/토스트 처리 → `clearPendingEvent`
5. `player.processedEvents[year-key]` 로 중복 방지

**예시 — 올스타전**:

```js
{
  key: "all_star",
  type: "modal",
  handlerKey: "showAllStarModal",
  trigger(player, gameDate) {
    return (player.stage === "pro1" || player.stage === "mlb")
      && gameDate.month === 7
      && gameDate.dayOfMonth >= 10 && gameDate.dayOfMonth <= 16
      && (player.fame ?? 0) >= 50;
  },
}
```

### 타석 결과 확장 — v0.3 구현 노트

`simulator.js` 가 다음과 같이 재구성됨:

- 베이스 표현: `[bool, bool, bool]` → `[runner|null, runner|null, runner|null]`. `runner = {isMain, speed}` — 도루 굴림과 메인 캐릭터 통계 추적용.
- `simulateAtBat` 은 K/BB/HBP/1B/2B/3B/HR/OUT 만 반환.
- OUT 은 `classifyOut(batter, bases, outs, defenseRating)` 로 E/SF/DP/OUT 로 분기 (상황 의존).
- 매 이닝 반복 시작 시 `attemptSteal(bases, pitcher)` 로 1루→2루 도루 시도. 성공 시 베이스 이동, 실패 시 아웃 +1.
- 자책점: `E` 출루는 비자책 (단순화 — 후속 실점 추적은 안 함).

### 검출만 추가하면 되는 마일스톤

`week.js:endWeek` 의 game 루프 직후, 또는 `applyGameExperience` 시점에 다음 체크 한 번에 가능:

- 사이클링: `events.filter(e => e.role==="batter" && e.type)` 중 1B/2B/3B/HR 모두 포함
- 노히트노런: `pbox.pH === 0`
- 퍼펙트: `pbox.pH === 0 && pbox.pBB === 0 && pbox.pHbp === 0`
- 완봉: `pbox.er === 0` 이고 선발 그대로 끝까지
- 통산 임계: `careerStats.h` 가 1000/2000/3000 을 이번 경기에서 처음 넘어선 순간

### HBP → 부상 — v0.3 후반 패치 구현 노트

`simulator.js:playHalfInning` 의 HBP 분기 직후 부상 굴림. 메인은 `HBP_INJURY_RATE × MAIN_INJURY_LUCK` = 5% × 0.4 = 2%. NPC 는 베이스 5%.

- `rollHbpSeverity()` — minor 65% / moderate 27% / severe 8% (기존 `applyInjury` 와 같은 분포)
- 메인: `myBox._hbpInjury = {severity, weeksLeft}` → simulateGame 결과의 `mainPlayer.hbpInjury` 에 attached → `week.js` 가 `applyInjury(player, severity)` 호출
- NPC: 라인업 entry 가 그대로 NPC 객체이므로 `batter.injury = {...}` 직접 적용

### 투수 교체 — v0.3 후반 패치 구현 노트

- `createMoundState(team, startingPitcher)` — `current`, `usedIds:Set`, `pitcherStats:Map(id → {paFaced, runsAllowed, outsRecorded})`
- `shouldReplacePitcher` 굴림: 이닝 시작 + PA 직후
  - 메인: PA 30+ / 허용 6점+ / (PA 25+ AND 허용 5점+) 중 하나
  - NPC: PA 25+ / 허용 6점+ / 7회+ 리드 3점 이내 시 클로저 등판
- `pickReliever`: 휴식 1게임+ → RP 우선 → OVR 순. 후보 없으면 부상자라도 강행 fallback
- 메인 강판 시 simulator 결과 `mainPlayer.pitcherReplaced = true` → week.js 가 토스트 발사
- `myPbox.ipOuts` 가 outs 단위 누적 (강판되면 27 미만) → mergeSeasonStats 에서 `ss.ipOuts += box.ipOuts`, `ss.ip = ss.ipOuts / 3`. 표시는 `floor(ipOuts/3).${ipOuts%3}` 분수
- NPC pitcher entity 에 `gamesSinceLastPitch` 필드 (`npc.js`). `endWeek` 가 매주 ++ + 사용한 NPC ID set 으로 reset

### W / L / SV (결승투수) — v0.3 후반 패치 구현 노트

- `recordLead(history, ...)` 가 매 half-inning 후 lead 변경 시점 + 양팀 등판 투수 기록
- 게임 종료 시 마지막 lead 항목 → winning/losing pitcher
- SV: winning team 마지막 등판이 winningPitcher 와 다르고 + outsRecorded ≥ 3 + 리드 3점 이내
- 메인이 결승투수면 `myPbox.w/l/sv++` 누적

### 콜드게임 — v0.3 후반 패치 구현 노트

`STAGE_RULES` 에 `mercyRule: [{afterInning, diff}, ...]` 옵션:

```js
high:        { ..., mercyRule: [{afterInning: 5, diff: 10}, {afterInning: 7, diff: 7}] },
high_final:  { ..., mercyRule: null },
univ:        { ..., mercyRule: [{afterInning: 5, diff: 10}, {afterInning: 7, diff: 7}] },
univ_final:  { ..., mercyRule: null },
// 그 외 pro1/pro2/mlb: null
```

- 이닝 종료 후 `isMercyTriggered(rule.mercyRule, inning, homeScore, awayScore)` 체크 → 임계 초과 시 즉시 break
- events 에 `COLD_GAME` 이벤트 push
- 결과 객체에 `coldGame: true` 플래그
- 결승 모달 라이브 로그가 이 이벤트를 `[N] 콜드게임 종료` 로 표시 + 그 시점 runGame 루프 break

### 결승 모달 실시간 점수 — v0.3 후반 패치 구현 노트

- simulator `events.push` 에 `runsScored` 첨부 (해당 PA 의 ab.runs)
- weekly.js `playHalf` 가 메인 이벤트 시각화 직후 `addInstantRuns(half, ev.runsScored)` 호출 → 점수 + 라인스코어 즉시 갱신
- half 끝 일괄 반영분에서 메인 PA 점수 합 (`mainRunsThisHalf`) 을 빼서 중복 방지
- 라이브 로그에 `+N` 형식으로 메인 PA 활약 강조 (`<span style="color:var(--good)">+N</span>`)

---

## 5. 비대상 (현 시점에서 추가 가치 낮음)

- 등번호 변경, 안티팬, 음주운전 같은 사건성 이벤트
- 추가 고교 대회 (현재 7개로 충분)
- 사운드/연출은 Phase 4 폴리시 단계 — 본 문서는 메커니즘 중심
- 폭투 / 보크 — 제구 페널티는 BB/HBP 로 이미 어느 정도 표현됨
- 3루 도루 / 더블 스틸 — 1루 도루로 충분한 게임플레이 깊이 확보됨
- 일본 프로야구 진출 (영구 제외, 사용자 결정)

---

## 6. 검증 — probe 스크립트 (시뮬 돌려보기)

코드 변경 후 회귀 검증은 두 스크립트로 진행:

### `probe.mjs` — 단위 검증 (1초 내)

4 stage(고교/대학/KBO/MLB) 별로 새 기능 호출 가능 여부를 확인. NPC stat cap, 등급 라벨, 올스타 트리거, PO 상대 OVR, tournamentHistory 누적, i18n 키 lookup 등 30+ 항목.

```bash
node probe.mjs
```

기대 결과: 마지막 줄에 `✅ 전체 통과`. 한 줄이라도 `[FAIL]` 이면 회귀 발생 — 직전 변경을 의심.

### `probe-career.mjs` — 22시즌 풀 커리어 시뮬

고교 1학년 → 졸업 → KBO 드래프트 → 만 38세 은퇴까지 자동 시뮬. 시즌별로 OVR 곡선·AVG·HR·ERA·PO 진출·시리즈 결과를 출력하고, 통산 합산을 실제 KBO/MLB 분포와 비교.

```bash
node probe-career.mjs
```

**현실 비교 체크리스트**:
- 시즌 평균 AVG `.232` ≈ 실제 KBO `.265` (약체 약 `.220`)
- 시즌 평균 ERA `5.69` ≈ 실제 `4.50` (약체 `5.50~6.50`)
- OVR 곡선 — 데뷔 ~75, 32~34세 피크, 36세부터 노화 감소
- 시즌 IP 150~280 (실제 SP 150~180)
- PO 시리즈 결과 표시 (`wcW → spoL` 등 라운드별 누적)
- **커리어 피크 능력치 dump** — 시즌별 stat 최고치 누적 + 최종 stat. cap 대비 도달률로 회귀 보상 강도(특히 시작 능력치 +N) 가늠 가능. 첫 컨택형 캐릭터 기준 contact ~145(cap 91%) / 나머지 50~60%

값이 크게 어긋나면 balance 회귀 의심 — `simulator.js:simulateAtBat` 의 계수 `softDiff`/`pitcherChanceByRest`/`ageUp` 노화 곡선·`applyGameExperience` ageMult 등을 점검.

### Node 런타임 준비

저장소에 `package.json` 의 `"type": "module"` 설정만 있고 외부 의존성 없음. 시스템에 Node ≥18 만 있으면 위 두 명령어 즉시 실행 가능. WSL 환경에서 임시 노드 필요 시:

```bash
curl -fsSL https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz -o /tmp/node.tar.xz
mkdir -p /tmp/node && tar -xJf /tmp/node.tar.xz -C /tmp/node --strip-components=1
/tmp/node/bin/node probe.mjs
```

---

## 7. 변경 로그

- 2026-05-26 v0.2 (`05b3a42`) 기준 초안 작성
- 2026-05-26 v0.3 — #1 타석 결과 확장 완료, 우선순위 표 갱신, 다음 작업 묶음 A/B/C 안 추가
- 2026-05-27 v0.3 후반 패치 — R/RBI 정식 추적, HBP→부상 트리거 + 메인 면역 + NPC 부상 시스템, 투수 교체 + bullpen 휴식, W/L/SV 결승투수, 콜드게임 (5회 10점 / 7회 7점), 결승 모달 실시간 점수, 세이브 키 `version` → `saveVersion`
- 2026-05-27 v0.3 후반 패치 #2 — 코치판단(D안) 출장(약체 메인 NPC SP에 마운드 양보), 결승 상대 NPC cap 누락 버그 fix(OVR 134→91 정상화 — 결승 압살 진짜 원인), HS 토너먼트 stage 가드(진로분기 후 HS 결승 진출 X), 결승 모달 일시정지+배속 컨트롤, 결승 알림 모달 메인 출장 표시, 성적기반 결승 보상(`performanceMultiplier` 0.3~1.0), 상태카드 OVR 합쳐 표시, 레이더/막대 그래프 동적 cap, HS 시즌 25→26주(주작기 결승 시즌 내), Firebase Hosting + GitHub Actions 자동 배포
- 2026-05-27 v0.4 — #2~#9 한 묶음 완료. 새 시스템 4개(`milestones`, `military`, `postseason`, `relations`). 사용자 요구로 국제대회 → 병역 면제 + 시즌 휴식기 대체(`intl_tournament`) 통합. 우선순위 표를 #10 이후로 갱신, 다음 묶음 D/E 안 제시.
- 2026-05-27 v0.5 — 잔여 이벤트 5건 일괄 완료. #14 끝내기(walkoff) 검출, #11 PO 시리즈제 (KBO wc 단판/spo 3전2승/po 5전3승/ks 7전4승, MLB wc 3전2승/ds 5전3승/cs·ws 7전4승), #15 명예의 전당 (`hallOfFame.js` — 헌액/영구결번/일반은퇴 3단계), #12 WBC/올림픽/아시안게임/프리미어12 라이브 모달 전환 (handlerKey `intlTournamentLive`), #10 FA 시스템 (4년 계약 + 만료 시 잔류/이적 모달). #13 일본 진출은 보류. 차후: #16 트레이드, 회귀 시스템 (섹션 2.5 메모).
- 2026-05-27 v0.5.1 — #13 일본 프로야구 영구 삭제 (stage/cap/팀풀/i18n/aged range/simulator 전수). #16 트레이드 시스템 (`career.js:maybeTradeOffer` 8% 확률 + `applyTradeAccept`, 휴식기 진입 시 FA 다음 단계). 차후 작업 = 회귀 시스템 (섹션 3.5) 뿐.
- 2026-05-27 v0.5.2 — 문서 전수 정리. TL;DR/인벤토리/갭 표를 v0.5.1 기준으로 재작성. §6 신규 — probe 스크립트 사용법 + 현실 비교 체크리스트 + Node 런타임 임시 설치 가이드. 섹션 번호 재정렬 (§3.5 회귀 시스템 / §6 검증 / §7 변경 로그).
- 2026-05-28 v0.5.3 — §3.5 회귀 시스템 설계 확정 (구현 대기). 점수 = HoF 점수 재활용, 5탭 상점 (재능 슬롯·stage cap = 영구 / 시작 능력치·특성·유물 = 캐릭터 한정 재구매), 도전과제 해금. 카탈로그 + 저장 스키마 + 구현 순서 + 충돌 영역 명시. `probe-career.mjs` 에 피크/최종 stat dump 추가 (회귀 보상 강도 가늠용). probe 검증 결과: 첫 컨택형 캐릭터 contact ~145(cap 91%), 나머지 50~60%, mental cap 초과 버그(183) 별도 발견.
- 2026-05-28 v0.6.1 — 11 commits 후속 보강. ① **컨디션 시스템 재설계** — 평균회귀 기준 50→70, pitcher.stamina+mental 능력치 평균 회복 보너스, 부상 확률 컨디션 보정(<50 ×1.5 / >80 ×0.7) 훈련+HBP 둘 다. 경기 modifier (cond-50)/100 → (cond-70)/70. ② **결승/PO 출전 표시 정리** — 진입 모달이 decideRolesForGame 미리 굴려 stash → forcedRoles 로 시뮬에 전달 (UI vs 실제 결과 일치). "포지션: 투수" / "포지션: {pos} · 투수 미출전" / 결장 3분기. ③ **라운드별 SP 깊이 제한** (실제 야구 단기 시리즈 패턴) — KS/WS=1~3등, po/cs=1~4등, wc/spo/ds=1~5등. coachJudgment gateType cutoff. ④ **PO 를 시즌의 일부로** — pendingPostseason 살아있는 동안 renderPostseasonStandby ("포스트시즌 진행 중") 화면 + PO 모달 오버레이. PO 끝나야 시즌 종합 진입. ⑤ **autoRunPostseason** — skipFinalsModal ON 시 PO 모달까지 자동 시뮬. ⑥ **상점 구매/장착 분리** — permanentPurchases.ownedTraits/ownedRelics 영구 보존, purchaseTrait/Relic 신규 (미소유시만 차감), setTraits/Relics 는 장착만 (무료). 옛 세이브 자동 owned 승계. ⑦ **autoTrain cap 인식** — deficitFor 를 cap 기준 평균 잔여로 재작성. cap 도달 stat 자동 제외 (사용자 케이스 mental 250: 점유율 1.9%). 가중치 추첨 w*deficit 곱셈. 전부 cap 도달 시 자동 휴식. ⑧ **fix(offseason)** STAT_CAP=150 하드코딩 제거 → 단계별. ⑨ **fix(postseason)** 같은 팀 매치 차단. ⑩ **fix(milestones)** Math.min(300, ...) 하드코딩 → cap 동적 — mental 251 cap 초과 버그 해소 (§3.5 알려진 버그). ⑪ **fix(auth)** popup → redirect 방식 (COOP / popup-blocked 회피). ⑫ **fix(i18n)** position.P 방어 추가. 모든 probe + brower verify (48건) 통과.
- 2026-05-28 v0.6 — 거대 일괄 patch. ① **회귀(NewGame+) P1~P5 완료** — 5탭 상점(`shop.js`) + 14 효과 wiring (`traitEffects.js` + 각 시스템) + 도전과제 4종 해금. `probe-regression.mjs` 13 섹션 89 OK. ② **Cloud Save Phase A~D** — Firebase Anonymous Auth + Google linking, Firestore `saves/{uid}` 단일 doc, 사용자 명시 트리거만 (1인생 ~5-10 writes), `firestore.rules` 본인만 접근, 로컬/클라우드 timestamp 충돌 모달. ③ **Phase 2 시각화** — 구종 5종 + 좌/우 매치업 페널티 + 메인 라인업 슬롯 + 수비 포지션 + 다이아몬드 cubic bezier 타구 궤적 + 베이스 점 + 스킵 버튼. ④ **UI 리팩토링** — topbar `⚙ 설정` 모달 + ⏸/▶ 분리, 결승 모달 라이브 로그 5줄 고정, 라이브 모달 자동스킵 토글 (결승/PO/올스타/국제대회 통합), 결승 시즌종료 우선, 국제대회 휴식기 자동 진행, 결승 모달 출장 boolean 표시, 모든 시즌 종료 화면에 [은퇴] 버튼. ⑤ **저장 시스템 보강** — `season.seasonResults` 누적 제거 (3.7 MB 폭증 근본 fix), `weekResults` slim, Firestore nested-array 변환, quota 진단/응급 슬림화, `pendingEvents` 저장 추가. ⑥ **대학야구 4개 대회** + finals.js univ stage 지원. ⑦ **게임 이름 변경** — "나혼자만 자동야구" → "9회말 환생 / Ninth Inning Rebirth", localStorage 키 `baseballalone.*` → `ninthinning.*`. ⑧ **비시즌 국제대회 통합 fix** — 시뮬 캘린더가 26주 (9월 초 종료) 라 11월 프리미어12 가 영원히 발화 X 였음. `checkOffseasonEvents(player, year)` 신설 — 시즌 종료 직후 year %4 기준 AG/P12 직접 큐 적재. processedEvents 가드로 시즌 중 발화한 경우 중복 없음. ⑨ **probe-career 진단 강화** — tick.js advanceDate export + probe 가 매 주 endWeek 직전 캘린더 advance (이전엔 우회로 month 3 그대로). 이벤트 발화 카운터 (10 항목) + fame trajectory + 의도 vs 실제 비교 표. 22시즌 시뮬에서 *모든 이벤트가 의도된 4년 주기/임계로 정확히 발화함* 코드 레벨 확인.
- 2026-05-29 능력치 영향도 감사 (코드 미변경, 문서 정리) — 시뮬레이터 전수 조사: **10개 능력치 중 8개**(contact/power/eye/speed/defense·velocity/control/breaking)만 at-bat 결과에 직접 작용. **멘탈·투수 스태미나(능력치)는 직접 영향 없음** (컨디션 회복 + `pitcherOVR` 집계만 — 종합점수·대표팀 선발·등판확률 왜곡). 멘탈은 휴식기/대표팀/군/결승/마일스톤 등 비-투구 누적으로 타자형에서 캡까지 폭주 → 레이더 100+ 튐. 미해결 버그(이슈 B) + 설계 3안(클램프만 / 멘탈 클러치 역할 부여 / 멘탈+스태미나 실질화)은 `개발 문서` "미해결 버그/설계 이슈" 에 정리. 별건: BGM 안드로이드 백그라운드 미정지(이슈 A)도 동일 문서. (cf. v0.5.3·v0.6.1 의 "mental cap 초과 버그" 는 *상한 초과* 버그였고 해소됨 — 이번은 *상한 내 폭주 + 무영향* 이라는 별개 설계 이슈.)
