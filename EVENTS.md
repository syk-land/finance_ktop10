# 이벤트 갭 분석 — 실제 야구 대비 미구현 항목

> 본 문서는 `v0.4` 시점(2026-05) 코드베이스 기준으로 갱신됨. 시간이 지나면 일부 항목은 이미 구현됐을 수 있으므로 작업 전 코드 확인 필수.

## TL;DR

- v0.4 에서 #2~#8 묶음을 한꺼번에 도입 — **마일스톤·HBP 부상·골든글러브·시즌 중 이벤트·부상 부위·드래프트 모달·군 입대·포스트시즌·멘토/라이벌**.
- 새 시스템: `milestones.js`, `military.js`, `postseason.js`, `relations.js`.
- 사용자 요구로 **국제대회 우승 → 병역 면제** + **시즌 휴식기 자동 대체(`intl_tournament` 카테고리 강제)** 통합.
- 남은 큰 갭: **포스트시즌 시리즈제(5전3승/7전4승)**, **FA/트레이드**, **NPC 리그 풀의 시즌 단위 진화**, **POV 시각화** (Phase 2).

---

## 1. 현재 구현 인벤토리

| 레이어 | 위치 | 보유 항목 | 비고 |
|---|---|---|---|
| 타석 결과 | `simulator.js:simulateAtBat` + `classifyOut` | K · BB · HBP · 1B · 2B · 3B · HR · OUT · E · SF · DP (11종) | v0.3 확장 |
| 베이스러닝 | `simulator.js:attemptSteal` + `applyResult` | 도루 시도 (SB/CS), 베이스 주자 객체 추적 | v0.3 — 1루→2루만 |
| 동점/연장 | `STAGE_RULES` | 리그별 무승부/승부치기 규정 | 잘 구현됨 |
| 부상 | `player.js:applyInjury` | minor(1주)/moderate(3주)/severe(8주) | 부위 구분 없음, 자동 회복 |
| 컨디션 | `tickConditionWeekly` | 호조/슬럼프 사이클 | 이벤트 트리거 미연결 |
| 시즌 수상 | `awards.js` | 타격왕/홈런왕/RBI/K/ERA/신인/MVP/양방향MVP | 골든글러브·실버슬러거 X |
| 토너먼트 결승 | `finals.js` | 고교 7개 대회 결승 모달 + MVP | 라이브 로그 + 보상 |
| 휴식기 이벤트 | `offseason.js` | 4 카테고리 + 20 이벤트 + U-18 | great/ok/bad 굴림 |
| 시즌 중 이벤트 | `seasonEvents.js` | **인프라만 존재, 카탈로그 0개** | `SEASON_EVENTS = []` |
| 진로 분기 | `career.js` | 대학/KBO 드래프트/MLB/은퇴 | 모달 없이 텍스트 |

---

## 2. 실제 야구 대비 갭

### A. 경기 안 (v0.3 에서 부분 해소)

| 실제 야구 | 게임 상태 | 영향 |
|---|---|---|
| ~~사구 (HBP)~~ | ✅ v0.3 추가 | 출루만 — 부상 트리거 연결은 미구현 |
| ~~도루 시도 / 캐치~~ | ✅ v0.3 추가 (1루→2루만) | 3루 도루 / 더블 스틸은 미구현 |
| ~~희생 플라이~~ | ✅ v0.3 추가 | 희생 번트는 미구현 |
| ~~병살타~~ | ✅ v0.3 추가 | 삼중살은 미구현 |
| ~~실책 (E)~~ | ✅ v0.3 추가 (출루 변형) | 송구실책·포구실책 구분 X |
| 폭투 / 포일 / 보크 | 없음 | 제구 낮은 투수의 약점 표현 불가 |
| 견제사 / 야수선택 | 없음 | 베이스 디테일 부재 |
| 만루홈런 | HR로 통합 | 별도 검출 → 마일스톤 토스트 가능 |
| 끝내기 | 점수만 비교 | 극적 효과 / 토스트 / 명성 보너스 없음 |
| 노히트노런 / 퍼펙트 | 없음 | 박스스코어로 검출만 추가하면 됨 |
| 사이클링 히트 | 없음 | `events[]` 4종 보유 검출만 |
| 완봉 / 완투 | 없음 | ER=0 + 9이닝 자동 선발이므로 인식만 |
| HBP → 부상 | 없음 | HBP 발생 시 1~3% 확률로 minor 부상 |

### B. 시즌 중 (인프라만 있고 비어있음)

| 실제 야구 | 적용 stage | 발동 시점 | 메커니즘 |
|---|---|---|---|
| 올스타전 (KBO/MLB) | pro1, mlb | 7월 중순, 명성 임계 | modal — break + 성적/명성 보너스 |
| 골든글러브 | pro1 | 12월 시상식 | season end 후 award (defense 임계) |
| 한국시리즈 / 와일드카드 | pro1 | 시즌 종료 후 | `finals.js` 패턴 재사용 |
| 디비전/리그/월드 시리즈 | mlb | 10월 | `finals.js` + 다단계 시리즈 |
| 신인 드래프트 (지명) | high→pro 진입 | 9월 | `career.js:kboDraft` 결과를 **모달**로 |
| 트레이드 데드라인 | pro1, mlb | 7월 31일 | 이벤트 발동 (yes/no) |
| WBC | pro1, mlb | 3-4년 주기 (시즌 전 3월) | U-18 패턴 그대로 |
| 올림픽 / 아시안게임 / 프리미어12 | pro1, mlb | 4년 주기 | U-18 `worldcup_run` 패턴 |
| **군 입대** (상무/경찰청) | pro1, pro2 | 만 27세 전후 | **2시즌 시뮬레이션 — 한국 프로의 핵심 분기** |
| FA / 옵트아웃 | pro1, mlb | 4-5년차+ | offer 모달 (MLB offer 패턴) |
| 부상자 명단 (IL) | 전 stage | severe 이상 | injury → IL 명명 + 자리 비움 |
| 슬럼프 / 입스(yips) | 전 stage | condition 장기 저조 | 모달 + 회복 미니이벤트 |

### C. 휴식기 (이미 풍부, 일부 보강)

| 실제 야구 | 게임 상태 |
|---|---|
| 마무리 캠프 / 스프링캠프 | `camp` 카테고리로 추상화 — 별도 분리 가치 낮음 |
| **토미존 수술 / 재활** | severe 부상 후 **시즌 통째 결장** 이벤트 가치 큼 |
| 결혼 / 출산 | `confession` 하나로 추상화 |
| 광고 / CF 촬영 | `fame` 활용처 부재 |
| 자선 / 봉사 / 모교 방문 | 없음 |
| 군 입대 결정 | 없음 (B와 연결) |

### D. 캐릭터 라이프 (NPC 측면)

| 실제 야구 | 게임 상태 |
|---|---|
| 멘토 NPC (커리어 내내) | 휴식기 이벤트 1회성으로만 등장 |
| 라이벌 NPC | 휴식기 `rival` 이벤트 1회성 |
| 가족 / 코치 사망 | 없음 — 멘탈/명성 동기 부여 가능 |
| 동료 부상 / 동료 이적 | 없음 — 팀 분위기 변동 |

### E. 마일스톤 / 기록 (검출만 추가하면 큰 효과)

| 마일스톤 | 검출 위치 | 비용 |
|---|---|---|
| 통산 1000/2000/3000 안타 | `careerStats.h` 누적 트리거 | 매우 낮음 |
| 통산 100/200/500 홈런 | 동일 | 매우 낮음 |
| 통산 100/200/300승 | `careerStats.w` (현재 미집계) | 낮음 |
| 통산 1000/2000/3000 K | 동일 | 매우 낮음 |
| 시즌 30-30 / 40-40 | 시즌 stats | 낮음 |
| 연속 안타 / 연속 출장 | 새 추적 변수 필요 | 중간 |
| 한 경기 사이클링 | `events[]` 스캔 | 매우 낮음 |
| 노히트노런 / 퍼펙트 | `pitcherBox.pH===0` 검출 | 매우 낮음 |
| 완봉 / 완투 | `er===0` + 9이닝 | 매우 낮음 |

> **참고**: ~~`careerStats.w/l/sv` 가 `week.js:mergeSeasonStats` 에서 누적 안 됨~~ → v0.3 후반 패치에서 simulator 가 결승투수 결정 + mergeSeasonStats 누적까지 완료.

---

## 3. 우선순위 권장 (v0.4 + v0.3 후반 패치 통합)

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

### 다음 작업 권장 (2-3개 묶음)

**D안 — "포스트시즌 폴리시"**
- #11 시리즈제 (KBO/MLB 라운드별 N전제)
- #12 시즌 중 이벤트 라이브 모달 (현재 토스트만)
- #14 끝내기 마일스톤

**E안 — "커리어 분기 확장"**
- #10 FA / 트레이드
- #15 명예의 전당 엔딩

### 즉시 가능 (1-2시간 작업)

- **세이브 마이그레이션 보강** — v0.4 신규 필드(`militaryExempt`, `pendingTournament`, `milestones`) 들이 옛 세이브에 없을 때 기본값 세팅

---

## 2.5. 차후 개발 — 회귀 시스템 (Regression / NewGame+)

> 사용자가 직접 설계 예정. 본 섹션은 인터페이스 메모.

**컨셉**: 은퇴/사망/엔딩 후 다시 16세부터 시작. 이전 커리어 성과에 비례해 초기 능력치를 더 가져가거나 특수 능력이 생김.

**현재 코드 준비 상태**:
- `createPlayer` base 스탯이 44~52 ("평균 살짝 위") — 회귀 보너스 적재 자리 확보
- `careerStats`, `careerHistory`, `championships`, `tournamentHistory`, `awards` 가 누적 상태로 보존됨
- 은퇴 분기 (`career.js:transitionToStage("retire")`) 존재

**구현 시 고려할 훅 포인트**:
1. **저장 키 분리**: 현재 saveGame 은 단일 슬롯. 회귀 시 이전 커리어를 별도 슬롯(`legacy:<n>`)에 보관, 신규 게임 메인 슬롯 사용
2. **회귀 보너스 산출**: 이전 커리어의 `careerStats.h / hr / w / k` + `championships.length` + `tournamentHistory champion 횟수` 로 점수 산출
3. **시작 스탯 부스트**: `createPlayer` 호출 시 회귀 슬롯이 있으면 base 스탯에 +N 가산. 점수 임계별로 +5~+30
4. **특수 능력 (talent 슬롯 확장)**: 현재 talent 는 단일 (contact/power/etc.). 회귀 후엔 base 재능에 추가로 보조 재능 1~2개 (예: "역전 본능", "결승전 특화")
5. **UI**: 메인 메뉴에 "회귀하기" 옵션 + 이전 커리어 요약 + 부스트 미리보기

**잠재적 충돌 영역**:
- `i18n` setLocale 가 옛 세이브 키와 회귀 슬롯 양쪽에 적용되도록 (현재 단일 키)
- 회귀 횟수 N+1 의 부스트 누적 룰 (선형/체감)

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

---

## 6. 변경 로그

- 2026-05-26 v0.2 (`05b3a42`) 기준 초안 작성
- 2026-05-26 v0.3 — #1 타석 결과 확장 완료, 우선순위 표 갱신, 다음 작업 묶음 A/B/C 안 추가
- 2026-05-27 v0.3 후반 패치 — R/RBI 정식 추적, HBP→부상 트리거 + 메인 면역 + NPC 부상 시스템, 투수 교체 + bullpen 휴식, W/L/SV 결승투수, 콜드게임 (5회 10점 / 7회 7점), 결승 모달 실시간 점수, 세이브 키 `version` → `saveVersion`
- 2026-05-27 v0.3 후반 패치 #2 — 코치판단(D안) 출장(약체 메인 NPC SP에 마운드 양보), 결승 상대 NPC cap 누락 버그 fix(OVR 134→91 정상화 — 결승 압살 진짜 원인), HS 토너먼트 stage 가드(진로분기 후 HS 결승 진출 X), 결승 모달 일시정지+배속 컨트롤, 결승 알림 모달 메인 출장 표시, 성적기반 결승 보상(`performanceMultiplier` 0.3~1.0), 상태카드 OVR 합쳐 표시, 레이더/막대 그래프 동적 cap, HS 시즌 25→26주(주작기 결승 시즌 내), Firebase Hosting + GitHub Actions 자동 배포
- 2026-05-27 v0.4 — #2~#9 한 묶음 완료. 새 시스템 4개(`milestones`, `military`, `postseason`, `relations`). 사용자 요구로 국제대회 → 병역 면제 + 시즌 휴식기 대체(`intl_tournament`) 통합. 우선순위 표를 #10 이후로 갱신, 다음 묶음 D/E 안 제시.
- 2026-05-27 v0.5 — 잔여 이벤트 5건 일괄 완료. #14 끝내기(walkoff) 검출, #11 PO 시리즈제 (KBO wc 단판/spo 3전2승/po 5전3승/ks 7전4승, MLB wc 3전2승/ds 5전3승/cs·ws 7전4승), #15 명예의 전당 (`hallOfFame.js` — 헌액/영구결번/일반은퇴 3단계), #12 WBC/올림픽/아시안게임/프리미어12 라이브 모달 전환 (handlerKey `intlTournamentLive`), #10 FA 시스템 (4년 계약 + 만료 시 잔류/이적 모달). #13 일본 진출은 보류. 차후: #16 트레이드, 회귀 시스템 (섹션 2.5 메모).
- 2026-05-27 v0.5.1 — #13 일본 프로야구 영구 삭제 (stage/cap/팀풀/i18n/aged range/simulator 전수). #16 트레이드 시스템 (`career.js:maybeTradeOffer` 8% 확률 + `applyTradeAccept`, 휴식기 진입 시 FA 다음 단계). 차후 작업 = 회귀 시스템 (섹션 2.5) 뿐.
