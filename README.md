# 9회말 환생 (Ninth Inning Rebirth)

주인공이 고교야구부 1학년부터 은퇴까지를 경험하는 웹 기반 커리어 시뮬레이션 게임.
플레이어는 직접 경기를 조작하지 않고 **훈련 방향**과 **시간 흐름**만 통제하며,
주인공의 능력치·컨디션·부상에 따라 경기와 시즌이 자동으로 시뮬레이션된다.

## 무슨 게임인가

- **시점**: 고교 1학년(16세) 입학 ~ 은퇴
- **포지션**: 양방향 (타자 + 투수 동시 능력치)
- **조작 방식**: 직접 컨트롤 없음. 훈련 방침만 정하고 시간을 흘려보냄
- **자동 시뮬레이션**: 매 평일 자동 훈련, 매 주말 자동 경기 시뮬
- **일시정지 가능**: 언제든 멈춰서 프리셋 변경, 능력치 점검, 상태 확인

야구 매니저 + 인생 시뮬레이션 + 경기 자동 진행을 결합한 형태.

## 어떻게 개발했나

**Claude Code(Anthropic)** 와의 페어 프로그래밍으로 개발. 사용자가 아이디어 제공 ·
테스트 · 피드백을 담당하고, 코드 작성은 Claude Code가 담당하는 협업 방식.

### 기술 스택 결정

| 선택지 | 결정 | 이유 |
|---|---|---|
| 플랫폼 | **웹 (Static)** | 링크만 공유하면 누구나 플레이. 빌드/설치 불필요 |
| 언어 | **Vanilla JavaScript (ES Modules)** | 의존성 0, 학습/유지보수 부담 최소 |
| 그래픽 | **SVG (코드 생성)** | Claude Code가 그림 도구 없이 직접 그릴 수 있는 형태 |
| 상태 저장 | **localStorage** | 서버 불필요, 자동 세이브 |
| 빌드 | **없음** | `index.html` 정적 서빙만으로 동작 |
| 다국어 | **i18n 모듈 (KO/EN)** | 키 기반 문자열 테이블. UI 토글로 즉시 전환, 별도 localStorage 키로 영속화 |

외부 의존성 zero. 이미지 파일도 zero. 모든 시각 요소는 코드(SVG) 생성.

## 실행 방법

### 브라우저 (정상 플레이)

```bash
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765 접속
```

> ES Module은 `file://`로 직접 열면 CORS 에러로 동작하지 않음. 반드시 HTTP 서버 경유.

배포된 빌드: <https://baseball-alone.web.app> (main 푸시 시 GitHub Actions → Firebase Hosting 자동 배포).

### 시뮬레이션 돌려보기 (검증·밸런스 확인)

코드 변경 후 회귀·밸런스 확인용. Node ≥ 18 만 있으면 됨.

```bash
# 단위 검증 — 4 stage (고교/대학/KBO/MLB) 새 기능 호출 가능 여부, 30+ 항목
node probe.mjs

# 풀 커리어 시뮬 — 16세 입학 → 만 38세 은퇴까지 22시즌 자동 진행
# 시즌별 OVR/AVG/HR/ERA + PO 시리즈 결과 + 실제 KBO·MLB 분포 비교 체크리스트 출력
node probe-career.mjs
```

기대치:
- `probe.mjs` 마지막에 **`✅ 전체 통과`** — 한 줄이라도 `[FAIL]` 이면 직전 변경 의심
- `probe-career.mjs` — 통산 AVG `.230` 대, 시즌 ERA `4~6`, OVR 32~34세 피크 후 노화 감소

자세한 사용법·해석은 `EVENTS.md §6` 참고.

## 언어 / Language

기본 한국어, 영어 지원. 상단 헤더의 **KO / EN** 토글 버튼으로 즉시 전환되며,
선택한 언어는 `localStorage` (`ninthinning.locale.v1`)에 별도로 저장되어 다음 세션에도 유지된다.
세이브 데이터와 독립적이라 같은 캐릭터를 다른 언어로 이어서 플레이할 수 있다.

- **UI 라벨/메시지**: 토글 즉시 전환
- **데이터 (캐릭터 이름, 팀명, 지역명)**: 캐릭터 생성 시점의 언어 풀에서 뽑힌 식별자이며 토글로 바뀌지 않음 (예: 한국어로 만든 "심용기" 캐릭터는 영어 모드에서도 "심용기"로 유지)
- **로그 메시지**: 작성 시점의 언어로 동결 (시간순 기록의 정합성을 위해)

The game ships with Korean (KO) and English (EN). Use the **KO / EN** toggle in the
top-right corner — your choice is remembered across sessions and independent of the save file.
UI labels switch instantly; character/team names that were generated under one language remain
unchanged when you toggle to the other (they're treated as identifiers, not translations).

## 게임 흐름

1. **캐릭터 생성**: 이름 · 얼굴(6종) · 재능(8종, 회귀로 최대 3개) · 손잡이(4종)
2. **자동훈련 프리셋 선택**: 슬러거 / 컨택 히터 / 호타준족 / 수비 명인 / 파이어볼러 / 제구파 / 양방향 / 회복 우선
3. **재생 (▶)**: 매 500ms마다 1일 진행 (속도 조절 0.5x ~ 4x). topbar 의 ⏸/▶ 또는 ⚙ 설정 모달.
4. **자동 진행**: 평일 자동 훈련, 주말 자동 경기
5. **일시정지 (⏸)**: 멈춰서 프리셋 변경 / 상태 점검
6. **시즌 종료**: 자동 일시정지 → 휴식기 4 카테고리 → 다음 학년/시즌
7. **결승 진출 시**: 라이브 모달 (정면 POV + 다이아몬드 + 베지어 궤적 + 베이스 점). 자동스킵 옵션 가능 (설정)
8. **졸업**: 대학 / KBO 드래프트 / MLB 오퍼 / 은퇴 진로 분기
9. **22 시즌 후 은퇴**: HoF 점수 산정 → **회귀 점수 적립** → ☁️ 클라우드 백업 → 회귀 상점에서 영구/재구매 강화 구매 → 다음 캐릭터로 재시작 (NewGame+)

## Phase 1+α (구현 완료 + 확장)

Phase 1 핵심 + UX 보강 + 한국 고교야구 일정 기반 토너먼트/대회 시스템까지.

### 토너먼트 + 결승 라이브 시뮬 (신규)
한국 고교야구 정규 일정에 맞춘 7개 대회 (`src/data/tournaments.js`):

| 대회 | 기간 | 형식 |
|---|---|---|
| 전반기 주말리그 | 3.7 ~ 4.25 | 권역별 풀리그 |
| 현무기 | 3.25 ~ 4.13 | 토너먼트 |
| 백호기 | 5.2 ~ 5.16 | 토너먼트 |
| 후반기 주말리그 | 5.23 ~ 6.21 | 권역별 풀리그 |
| 청룡기 | 6.27 ~ 7.11 | 토너먼트 |
| 대통령배 | 7.18 ~ 7.30 | 토너먼트 |
| 주작기 | 8.6 ~ 8.29 | 토너먼트 |

- 일정 카드 제목 옆에 진행 중인 대회 inline 표시 — `(전반기 주말리그)` 같이
- 각 토너먼트 종료 주에 결승 진출 굴림 (팀 strength + 선수 OVR 기반 5~55%)
- **결승 진출 시 시즌 자동 일시정지 + 모달 발동** — 다이아몬드 SVG + 라인 스코어 (1~9이닝 + R) + 점수판 + 이벤트 라이브 로그
- 우승/준우승 보상 자동 적용 — 모든 능력치 +3, 명성 +25 / 멘탈 +5, 명성 +10
- **MVP 시스템** — 결승 우승 + 메인 캐릭터 호조건 (타자: 2안타 또는 1홈런 / 투수: 자책 1 이하 + 5K 이상) → 추가 멘탈/명성 보너스 + 토스트 알림
- 시즌별 대회 기록 (`player.tournamentHistory`) 누적 — 시즌 성적 carousel 슬라이드에 표시
- 결승 진출 실패 시도 토스트 알림 (`weekly.finalLoss`)

### 휴식기 — 4 카테고리 + 이벤트 풀
시즌 종료 후 모달로 진행 (`src/systems/offseason.js`):

1. **카테고리 선택** — 특훈 / 전지훈련 / 일반훈련 / 휴식 (+ 조건부 청소년 세계대회 차출)
   - 청소년 세계대회: `stage="high"` + 종합 60+ + **격년(홀수년)** (WBSC U-18 패턴)
2. **이벤트 제안** — 카테고리의 풀에서 1개 랜덤. "도전한다 / 거절한다" Yes/No
3. **굴림** (Yes 시): great 20% / ok 70% / bad 10% → 이벤트 효과 적용
4. **결과** + "다음 연차 진행하기" → 다음 시즌 (이전 autoMode 유지)

20개 이벤트 — "미치광이 과학자의 투구폼 개조", "전설의 멘토를 만나다", "고백을 받았다" 등 각각 great/ok/bad 결과 텍스트 + 능력치 변화 정의.

### 시즌 중 이벤트 일반화 메커니즘 (인프라)
`src/systems/seasonEvents.js` — 향후 프로 진출 시 올스타전 / 올림픽 / WBC 추가용 인프라.
- `SEASON_EVENTS` 카탈로그 + `trigger` 함수 + `state.pendingEvents` 큐
- `endWeek` 후 자동 체크, `processedEvents`로 중복 방지

### 타석 결과 확장 (v0.3)
박스스코어가 단조롭다는 문제 — `speed`·`defense`·`control` 능력치가 사실상 시뮬에 안 쓰이던 갭을 해소.

| 추가된 결과 | 트리거 | 영향받는 능력치 |
|---|---|---|
| 사구 (HBP) | `pitcher.control` 낮을수록 ~1% 베이스 | 제구 |
| 실책 출루 (E) | 수비팀 평균 defense vs 타자 contact | 수비, 컨택 |
| 희생플라이 (SF) | 3루 주자 + <2아웃 + 타자 power | 파워 |
| 병살타 (DP) | 1루 주자 + <2아웃 + 느린 speed | 주력(역방향) |
| 도루 시도 (SB/CS) | 타석 전 phase, 1루 주자 speed vs 투수 control | 주력, 제구 |

- 베이스 표현이 `boolean` 에서 `{isMain, speed}` 주자 객체로 바뀜 — 메인 캐릭터 도루 추적용
- 자책점은 E 출루분만 비자책으로 단순 분리
- 시즌 박스스코어에 SB / HBP 칸 추가
- 자세한 갭 분석/로드맵은 [`EVENTS.md`](./EVENTS.md) 참조

### 부상 / 투수 교체 / 콜드게임 / 실시간 점수 (v0.3 후반 패치)
타석 결과 확장 이후 시뮬레이터 깊이 보강 — 메인 캐릭터 활용감 + 실제 야구 운영의 핵심 메커니즘 추가.

**R / RBI 정식 추적**
- `applyResult` 가 `scoredRunners[]` / `rbi` 반환 → 메인 PA 결과별 R / RBI 정확히 누적
- HR 시 본인 R 인정. E·DP 는 RBI 없음. BB/HBP 는 만루 시 강제 1RBI
- 시즌 성적 카드 (`weekly.js renderSeasonBody`) 에 R / RBI 셀 노출

**HBP → 부상 트리거**
- HBP 발생 시 5% 부상 굴림 → severity (minor 65% / moderate 27% / severe 8%)
- 메인은 `MAIN_INJURY_LUCK = 0.4` 곱해 실효 2% — 훈련 부상도 같은 0.4x 적용
- 메인은 simulator → result.hbpInjury → week.js `applyInjury` 호출 (로그/토스트 발생). NPC 는 simulator 가 직접 `npc.injury = {...}` 적용

**NPC 부상 시스템**
- NPC entity 에 `injury: null` 필드 (`npc.js`)
- `buildLineup` / `pickStartingPitcher` / `pickReliever` 가 부상 NPC 제외, 후보 부족하면 부상자도 강행 fallback
- `endWeek` 가 게임 시뮬 전에 NPC 부상 카운터 -1 → 신규 부상은 다음 주부터 깎임 (즉시 회복 버그 방지)
- 실제 야구 IL률에 가깝게 매우 보수적 — 5시즌 검증 시 시즌당 ~10건 / 팀

**투수 교체 시스템**
- `createMoundState` 가 현재 등판 + 사용 ID + 투수별 PA·실점 누적 추적
- 이닝 시작 + PA 직후 강판 굴림. 메인은 PA 30+ / 허용 6점+ / (PA 25+ AND 허용 5점+) 중 하나면 강판. NPC 도 비슷 + 7회+ 리드 3점 이내 시 클로저 등판
- `pickReliever` 가 휴식 1게임+ → RP 우선 → OVR 순으로 선택. NPC pitcher 에 `gamesSinceLastPitch` 필드 추가 (`npc.js`), `endWeek` 가 카운터 ++ + 사용 ID reset
- 메인이 강판되면 result.pitcherReplaced 플래그 → "강판됐다" 토스트 발생
- 박스스코어 IP 가 동적 (outs 단위 누적 → `ipOuts/3.${%3}` 분수 표시). 5시즌 평균 IP ≈ 6.54 (완투는 73 등판 중 1회)

**W / L / SV (결승투수)**
- `recordLead` 가 매 half-inning 후 lead 변화 시점 + 그 시점의 양팀 등판 투수 기록
- 게임 종료 시 마지막 lead 항목 → winning/losing pitcher 결정. SV 는 winning team 의 마지막 등판 + 1이닝 이상 + 리드 3점 이내
- 메인이 결승투수면 `myPbox.w/l/sv++`. `mergeSeasonStats` 에서 누적
- 시즌 성적 카드에 W / L / SV 셀 추가

**콜드게임 (mercy rule)**
- `STAGE_RULES` 에 `mercyRule: [{afterInning, diff}, ...]` 옵션
- 한국 고교 일반 / 대학 일반: 5회 종료 10점차 / 7회 종료 7점차 → 즉시 종료
- 결승전 (`high_final`, `univ_final`) / 프로 / MLB: 미적용 (9회 완주 보장)
- 결과 객체에 `coldGame: true` + events 에 `COLD_GAME` 이벤트 → 결승 모달 라이브 로그에 `[N] 콜드게임 종료` 표시

**결승 모달 실시간 점수**
- simulator events 에 `runsScored` 첨부 → 메인 PA 시각화 직후 즉시 점수 + 라인스코어 갱신 (`addInstantRuns` / `updateLineScoreCellAdd`)
- half 끝 일괄 반영분에서 메인 PA 점수 합 빼서 중복 방지
- 투수 교체 / 콜드게임 이벤트도 라이브 로그에 노출 (`[N] 투수 교체 A → B`, `[N] 콜드게임 종료`)

**세이브 키 통일**
- `state.js` 의 저장 키 `version` → `saveVersion` (i18n `app.version` 과 이름 충돌 해소)
- `migrateSave` 가 옛 `data.version` 흡수 + NPC `injury`/`gamesSinceLastPitch` 누락 보정

### 코치판단 출장 / 결승 NPC fix / 결승 모달 컨트롤 (v0.3 후반 패치 #2)
v0.3 후반 패치 직후 검증 중 발견된 압살 / 출장 결정 / UI 누락 일괄.

**코치판단 (D안) — 메인 약체 시 자동 NPC SP 등판**
- `decideRolesForGame` / `appearanceChance` 가 team 인자 받도록 시그니처 확장
- `coachJudgment(player, team)` — 메인 pitcher OVR vs 팀 SP 평균 OVR 비율
  | ratio | pitch 곱 |
  |---|---|
  | ≥ 1.10 | ×1.00 |
  | 0.90~1.10 | ×0.70 |
  | 0.70~0.90 | ×0.30 |
  | < 0.70 | ×0.05 |
- 메인 OVR 35-40 (1학년) → ratio 0.40 → ×0.05 거의 등판 X. 약체 메인 강제 등판으로 결승 35:0 압살되던 원인 해소
- 모든 분기 `isFinite` 가드 — NaN/Infinity 발생 시 0.05 폴백

**결승 상대 NPC cap 누락 버그 fix**
- `finals.makeOpponentTeam` 의 `createRoster(finalStrength, [16,18])` 호출에 `{stage:"high"}` 옵션 누락 → `getNpcStatCap(undefined)` 가 default 150 폴백 → 결승 상대 NPC 가 일반 리그(cap 100) 의 **1.5배 강하게 생성**되던 버그
- 검증 (300 vs 25 NPC):
  - 일반 리그 OVR 평균 88.7
  - 옛 결승 상대 OVR 평균 134.8 (+46)
  - fix 후 결승 상대 OVR 평균 91.5 (+3)
- 메인 OVR 120 vs OVR 92 매치업 → 정상 메인 우세. ERA 1점대 메인이 결승만 10점 맞던 진짜 원인

**HS 토너먼트 stage 가드**
- `finals.checkFinalAdvance` 가 `player.stage === "high"` 가드. 진로 분기 후 MLB/KBO/대학 stage 면 HS 결승 진출 굴림 안 함
- 옛 incorrectstate: "LA Dodgers 1학년" 메인이 광주일고 주작기 결승 진출하던 문제

**상태카드 OVR 합쳐 표시**
- 종합 셀 하나에 `타 35.2 / 투 30.1` 형식. i18n `batPitOvrVal`

**레이더 + 막대 그래프 동적 cap**
- `getPlayerStatCap(player)` 를 `createRadarSVG` max + `statBarRow` 분모로 동적 적용 → HS 150 / 대학 175 / KBO 250 / MLB 300 자동 확장

**결승 모달 라이브 컨트롤**
- 모달 하단에 일시정지 토글 + 0.5x/1x/2x/4x 배속 버튼
- `waitMs` 가 `state.tickSpeed` 비례 + `pauseState.paused` 시 50ms 폴링으로 hold
- `finalAnim.js` 의 RAF 애니메이션도 `speedMult()` 적용 — `animateBall` duration, `swingBat` dur1/dur2, `spawnFireworks` 시간 모두 가속

**결승 알림 모달 메인 출장 표시**
- `buildFinalAnnounce` 에 `appearanceChance` 결과 패널 — `주인공 출장 — 타자 N% · 투수 N%`
- 코치판단 결과를 사전 노출 → 사용자가 출장 여부 예측 가능

**성적기반 보상 (`performanceMultiplier` 0.3~1.0)**
- 메인 결승 미출장 → ×0.3 (관전 보상)
- 부진 (3타석+ 무안타 / 3이닝+ 자책 5+) → ×0.5~0.7
- 평범 이상 → ×1.0
- 우승 stat bump +3 / 명성 +25 가 `perfMult` 곱해서 적용. MVP 보너스는 별도 (MVP 조건이 호조 보증이라 곱 안 함)

**HS 시즌 26주**
- 25주 → 26주. 주작기(`phoenix_cup`, 8.6~8.29) 가 시즌(3.1~) 안에 결승까지 진행. 시즌 종료 후 결승 발동되던 문제 해소

### UX/UI
- **carousel 네비게이션** (← 제목 →): 평일은 5 슬라이드 (훈련방향/시즌성적/능력치/지난경기/리그순위), 시즌종료는 3 슬라이드 (시즌성적/리그순위/능력치)
- **모달 시스템** — 이어하기 / 세이브 삭제 confirm / 결승전 / 휴식기 / 휴식기 이벤트
- **토스트 큐** — 부상 발생/MVP/결승 탈락/대성공 알림 자동 표시 (`pushToast(msg, kind)`)
- **안드로이드 portrait 폭 고정** (`max-width: 412px`) — 데스크탑에서도 같은 폭으로 표시
- **시즌 종료 화면** — 시즌 1줄 요약 → 커리어 하이 카드 → carousel (시즌성적/리그순위/능력치) → 확인 → 휴식기 모달
- **일정 카드** 통합 — 제목 + 대회 inline + 재생/속도 토글 + 현재 훈련 + 요일 스트립 (한 카드)
- **세이브 마이그레이션** — `SAVE_VERSION` 도입, 옛 데이터 자동 변환

### 시간 흐름
- 시즌 시작 = **3월 1일** (한국 고교 일정), 시즌 길이 **26주** (HS) / 22주 (대학) / 26주 (프로/MLB)
- 1학년 = **2027년** → 3학년 = **2029년** (WBSC U-18 격년 패턴)
- 주당 1경기 (권역 풀리그 단순화), 토너먼트 결승만 별도 모달

## 어디까지 개발됐나

### Phase 1 완료 ✓

- [x] 캐릭터 생성 (얼굴 6종, 재능 8종, 손잡이 4종, 양방향 포지션)
- [x] 능력치 시스템 (타자 5종 + 투수 5종, cap 150)
- [x] 나이별 성장 곡선 (18세 ×1.6 → 35세 ×0.4 → 노화 감소)
- [x] 재능 부스트 (만능형은 모든 stat, 그 외는 특화 stat에 ×1.4 등)
- [x] 8종 훈련 + 휴식 + 10% 대성공 확률
- [x] 자동훈련 프리셋 8종 (부족도 보정 + focusStats 타게팅)
- [x] 컨디션 (호조/슬럼프 사이클, 경기력 ±보정)
- [x] 부상 시스템 (경상 1주 / 중상 3주 / 인대 8주)
- [x] 경기 자동 시뮬레이션 (9이닝, 매치업 공식)
- [x] 양방향 출장 (타자 + 투수 동시) + 출장 확률 곡선
- [x] 투수 등판 휴식 (직전 등판 0%, 1경기 휴식 ×0.5)
- [x] 경기 경험치 (안타/홈런/삼진/호투별 능력치 보너스)
- [x] 12팀 고교 리그 + 22주 시즌 + 순위표
- [x] 학년 진급 (1→2→3) + 졸업 분기
- [x] 실시간 진행 (1일 자동 tick) + 일시정지 + 속도 조절 (0.5x ~ 4x)
- [x] SVG 그래픽 (얼굴 6종, 3등신 캐릭터, 10각 능력치 레이더)
- [x] 캐릭터 자세 (우투우타/좌투좌타/우투좌타/좌투우타)
- [x] localStorage 자동 세이브 + 이어하기

### v0.2 ~ v0.3 추가 ✓

- [x] 한국 고교야구 7개 대회 일정 + 토너먼트 결승 라이브 모달 + MVP 시스템
- [x] 휴식기 4 카테고리 + 20개 이벤트 + U-18 청소년 세계대회
- [x] 진로 분기 (대학 / KBO 드래프트 / MLB 오퍼 / 은퇴)
- [x] KBO 콜업 사다리 (2군 → 1군), MLB 마이너 콜업 (A → AA → AAA → MLB)
- [x] 시즌 수상 8종 (타격왕/홈런왕/RBI/K/ERA/신인/MVP/양방향MVP)
- [x] 시즌 중 이벤트 인프라 (`seasonEvents.js`, 카탈로그는 비어있음)
- [x] **타석 결과 확장** — HBP / E / SF / DP / SB / CS (v0.3)
- [x] **R / RBI 정식 추적** (v0.3 후반 패치)
- [x] **HBP → 부상 트리거** + 주인공 면역 (0.4x) + NPC 부상 시스템 (v0.3 후반 패치)
- [x] **투수 교체** — 스태미나/실점 기반 자동 교체, NPC bullpen 휴식 카운터, 메인 강판 토스트, IP outs 단위 동적 (v0.3 후반 패치)
- [x] **W / L / SV** — 결승투수 결정 + 시즌 누적 (v0.3 후반 패치)
- [x] **콜드게임** — 한국 고교/대학 일반 경기 5회 10점 / 7회 7점 (v0.3 후반 패치)
- [x] **결승 모달 실시간 점수** — 메인 PA 마다 즉시 점수 반영 + 투수 교체/콜드 라이브 로그 (v0.3 후반 패치)
- [x] **코치판단 출장** — 메인 약체일 때 NPC SP 우선 등판, 약체 메인 압살 게임 방지 (v0.3 후반 패치 #2)
- [x] **결승 상대 NPC cap 버그 fix** — 옛 cap 150 default → cap 100 정상화 (v0.3 후반 패치 #2)
- [x] **HS 토너먼트 stage 가드** — 진로 분기 후 HS 결승 진출 굴림 X (v0.3 후반 패치 #2)
- [x] **결승 모달 일시정지 + 배속 컨트롤** — 라이브 모달 안에서 직접 제어 (v0.3 후반 패치 #2)
- [x] **결승 알림 모달 출장 표시** — `appearanceChance` 패널로 메인 출장 사전 노출 (v0.3 후반 패치 #2)
- [x] **성적기반 결승 보상** — `performanceMultiplier`. 미출장/부진 시 보상 축소 (v0.3 후반 패치 #2)
- [x] **상태카드 OVR 분리** — "타 N / 투 N" 합쳐 표시 (v0.3 후반 패치 #2)
- [x] **레이더/막대 그래프 동적 cap** — stage 별 cap 자동 (HS 150 → MLB 300) (v0.3 후반 패치 #2)
- [x] **Firebase Hosting 자동 배포** — GitHub Actions main 푸시 시 자동 (v0.3 후반 패치 #2)

### v0.4 추가 ✓ — 야구 시뮬 깊이 + 커리어 분기

EVENTS.md 의 #2~#8 + 골든글러브를 한 묶음으로 도입. 이전 인프라(`seasonEvents.js` 큐, `finals.js` 결승 모달, `applyInjury`) 재사용 중심.

| 영역 | 작업 |
|---|---|
| **마일스톤** (`milestones.js`) | 단경기 사이클링·만루홈런·노히트·퍼펙트·완봉 + 통산 H/HR/K/W 임계(100~3000) 자동 검출. 명성·멘탈 보너스. |
| **HBP → 부상** (`simulator.js` + `week.js`) | 메인 사구 발생 시 2% 굴림(minor 75% / moderate 20% / severe 5%) → `applyInjury` + 토스트. |
| **부상 부위·후유증·토미존** (`player.js`) | injury = `{ severity, bodyPart, weeksLeft, surgery, aftereffect }`. severe + 어깨/팔꿈치 + 30% → 토미존(30주 + 영구 페널티). 부위별 영향 stat 매핑(어깨→velocity, 무릎→speed 등). |
| **수상 1종** | 골든글러브(`awards.js`) — 시즌 10경기+ & batter.defense ≥70. |
| **시즌 중 이벤트 카탈로그** (`seasonEvents.js`) | 올스타·WBC·올림픽·아시안게임·프리미어12. 명성 임계 + 4년 주기 등 트리거. 즉시 토스트 + 명성/능력치 보너스. |
| **드래프트 라이브 모달** (`career.js` + `weekly.js`) | KBO 신인 드래프트를 라운드별 라인 누적(600ms 간격) → 본인 호명 → 계약금 표시. 라운드/계약금은 compositeScore 임계로 결정. MLB 오퍼 거절 시 fallback. |
| **포스트시즌** (`postseason.js`) | KBO: wc → spo → po → ks / MLB: wc → ds → cs → ws. 단판 시뮬(단순화) + 라운드별 보상 + ks/ws 우승은 `player.championships` 누적. |
| **군 입대** (`military.js`) | pro1/pro2 + 만 27세 + 미완료 시 트리거. 상무/경찰청/사회복무 3옵션 (능력치 -3~-8% + 명성·멘탈 차등). 2시즌 자동 점프(`careerHistory` 에 군 복무 기록 push). |
| **국제대회 → 병역 면제 + 휴식기 대체** | 시즌 중 차출 이벤트(`canReplaceOffseason: true`) → `player.pendingTournament` 표식 → 그 시즌 휴식기 카테고리가 자동 `intl_tournament` 로 강제. 메달 굴림 결과 great/ok 시 `player.militaryExempt` 부여 (올림픽 동메달+, 아시안게임 금). 군 입대 트리거 시 자동 면제 토스트. |
| ~~**멘토/라이벌 영구 NPC** (`relations.js`)~~ | v0.4.x 에서 사용자 결정으로 제거. 휴식기 1회성 `mentor_pitcher` / `rival` 이벤트만 존속. |

### v0.5 추가 ✓ — 잔여 이벤트 일괄 완료 + 밸런스 재조정

| 영역 | 작업 |
|---|---|
| **끝내기 (walkoff) 마일스톤** | 9회+ home bottom 에서 동점/뒤짐을 깨면 마지막 메인 PA 에 `walkoff:true`. `milestones.walkoff/walkoffHR` (+10/+20 fame). |
| **포스트시즌 시리즈제** (`postseason.js`) | KBO: wc 단판/spo 3전2승/po 5전3승/ks 7전4승. MLB: wc 3전2승/ds 5전3승/cs·ws 7전4승. `seriesLength/seriesWins/recordSeriesGame/isSeriesClinched`. UI 가 시리즈 진행 중에는 "다음 경기", clinched 시 라운드 보상 + 다음 라운드/마침. |
| **명예의 전당** (`hallOfFame.js`) | 통산 H/HR/RBI/SB/W/K/SV + 우승 30점·대회우승 5점 + MVP 50/신인왕 30 + 큰 마일스톤 → 총점. 300+ 헌액 / 200+ 영구결번 / 그 외 일반은퇴. 은퇴 패널에 breakdown + 등급별 카피. |
| **시즌 중 이벤트 라이브 모달** | WBC·올림픽·아시안게임·프리미어12 모두 `type: "toast"` → `"modal"` (handlerKey `intlTournamentLive`). 양 팀 strength 95 국대급 단판 + `playLiveGame` UI 재사용. |
| **FA / 계약 시스템** | 프로/MLB 진입 시 4년 계약. 매 시즌 종료 yearsLeft-- . 0 도달 시 휴식기 진입 직전 FA 모달 — 잔류 (+5 명성) / 오퍼 수락 (+12 명성 + 새 팀). 오퍼 임계: compositeScore 80/100/120. |
| **트레이드** (v0.5.1) | 휴식기 진입 시 8% 확률 (FA 없을 때만). 다른 팀이 영입 제안 → 수락 (+5 명성, 계약 인수) / 거절. |
| **일본 진출 영구 삭제** (v0.5.1) | 사용자 결정. stage/cap/팀풀/i18n/시뮬 룰 전수 정리. |
| **밸런스 재조정** (v0.5) | coachJudgment 완화 (0.05 → 0.10~0.90 단계별), ageUp 노화 강화 (30+ 시작, 38+ 70%/-5), ageMultiplier 노장 감쇄, 훈련/경기 경험치 효율 축소, simulator 매치업 압축 (softDiff + 계수 0.4→0.28), 5선발 로테이션 모방. probe-career 22시즌 결과: AVG `.232` / ERA `5.69` / OVR 32~34세 피크. |

### v0.6 추가 ✓ — 회귀 시스템 + Cloud Save + Phase 2 시각화 + 게임 이름 변경

| 영역 | 작업 |
|---|---|
| **회귀(NewGame+) 시스템** (P1~P5) | `src/systems/regression.js` + `src/data/shopCatalog.js` + `src/views/shop.js`. 5탭 상점 (재능슬롯·stage cap·시작능력치·특성·유물). HoF 점수 = 회귀 잔액. 영구(재능 슬롯·stage cap) + 캐릭터당 1회 재구매(시작능력치·특성·유물) 하이브리드. 14 효과 wiring 완료 (steel_mental injuryChance ×0.5, iron_arm tjsBlock, legend_heir startingFame +50, prime_extend agingDelay +3yr, prosthetic injuryRecoverySpeed ×2, learner/past_life_notes firstSeasonTrainBoost ×2, stardom fameGain ×1.5, big_game finalsReward ×1.5, calling_card draftRound +1, mentor_letter autoTrainDeficitBoost ×1.5, clutch walkoffChance ×2, lucky_bat walkoffChance +5%p, golden_glove errorChance ×0.5). 도전과제 4종 해금 (walkoff_one / championship_one / hof_inducted / severe_recovered). |
| **Cloud Save** (Firebase) | Phase A 인프라 (`src/cloud/firebase.js` + `firebaseConfig.js` + `auth.js`, gstatic CDN modular SDK 10.13.0, 익명 자동 로그인). Phase B 저장/불러오기 (`cloudSave.js` saveToCloud/loadFromCloud, `saves/{uid}` 단일 doc). Phase C 충돌 처리 (이어하기 모달에 로컬/클라우드 timestamp 비교, 60초+ 차이 시 confirm). Phase D Google 계정 연동 (익명 → Google linkWithPopup, 다중 기기 동기화). Firestore rules — saves/{uid} 본인만 접근. 비용 절감: 사용자 명시 트리거만 (자동 저장 X) — 1인생 ~5-10 writes. |
| **Phase 2 — POV 시각화 + 경기 디테일** | 구종 시스템 (`pitches.js` — fastball/slider/curve/changeup/splitter, assignPitches/pickPitch). 좌/우 매치업 페널티 (decodeMainHand/rollNpc Bats/Throws, handMatchupPenalty contact -3). 메인 라인업 슬롯 + 수비 포지션 (decideMainPosition, mainPlayer.lineupSlot). 라이브 모달 [건너뛰기] 버튼 (cancelled flag + Promise.race). 다이아몬드 베이스에 메인 출루 점 표시. 다이아몬드 위 cubic bezier 타구 궤적 (결과별 종착점). 결승/PO/올스타/국제대회 모달의 정면 POV (기존 `finalAnim.js`) 와 합쳐 본격 시각화 완성. |
| **UI 리팩토링** | topbar 의 [⚙ 설정] 모달 통합 — 배속/언어/결승모달 토글 일괄. topbar 의 ⏸/▶ 아이콘 분리 (재생/일시정지 빠른 접근). 결승 모달 라이브 로그 5줄 고정 + 이닝/공수 전환 시 구분선. 결승 진출 알림의 출장 표시 `타자 출전 / 투수 출전` (boolean). topbar 의 stage 별 라벨 분기 (학년/1군/싱글A/AA/AAA/메이저). |
| **저장 시스템 보강** | localStorage 키 `baseballalone.*` → `ninthinning.*` (게임 이름 변경). `season.seasonResults` 누적 제거 (3.7 MB 폭증 근본 원인 — read 없는 데드 코드). `weekResults` slimGameResult 로 team.roster 제외. Firestore nested-array (`league.schedule` 2차원) 자동 변환/복원. saveGame 1MB 초과 시 진단 logger. QuotaExceededError 캐치 시 응급 슬림화 후 재시도. `pendingEvents` 큐 저장 추가. |
| **결승 모달 흐름 개선** | 시즌 종료와 동시에 결승 진출 시 *결승 모달 우선* (시즌 종료 화면 위에 덮이는 위화감 제거). 국제대회 휴식기 자동 진행 — yes/no 단계 skip (시즌 중 라이브 모달에서 이미 참가 결정). 모든 시즌 종료 화면에 [은퇴] 버튼 (confirm 후 HoF 판정 + 회귀 점수 적립). |
| **라이브 모달 자동스킵** (통합) | 설정 모달의 토글 1개로 *결승/PO/올스타/국제대회* 라이브 모달 모두 자동 진행. OFF 시 자동 시뮬+보상+토스트만 표시. |
| **비시즌 국제대회 fix** | 시뮬 캘린더가 30일/월 단순화 + 26주 시즌이라 9월 초 종료 — 시즌 중 trigger 인 *프리미어12 (11월)* 가 영원히 발화 X 였음. `checkOffseasonEvents` 신설 — 시즌 종료 직후 *year %4* 기준으로 AG/P12 직접 적재. 22시즌 시뮬에서 정확히 4년 주기 발화 확인. |
| **probe-career 검증 강화** | 캘린더 advance 우회 fix (advanceDate 호출) + 이벤트 발화 카운터 (결승/PO/올스타/WBC/올림픽/AG/P12/FA/트레이드/군입대) + fame trajectory. 의도된 발화 빈도 vs 실제 비교 표. 모든 시즌이벤트가 정확히 의도된 4년 주기/임계로 발화 확인. |
| **대학야구 4개 대회** | `tournaments.js` UNIV_TOURNAMENTS (U-리그/대통령기/회장기/추계 선수권) + getTournamentPool(stage) 디스패처. finals.js 가 univ stage 까지 결승 모달 지원. |
| **게임 이름** | "나혼자만 자동야구" → **"9회말 환생" / "Ninth Inning Rebirth"** |

### v0.6.1 추가 ✓ — 컨디션/포스트시즌/자동훈련/상점/auth 일괄 보강

| 영역 | 작업 |
|---|---|
| **컨디션 시스템 재설계** (`player.js`) | 평균회귀 기준 50→**70** (이상은 올라가고 이하는 떨어짐). pitcher.stamina + pitcher.mental 능력치 평균을 회복 보너스로(±5pp). 현재 stamina<50 시 회복 둔화(-2). 경기 능력치 modifier `(cond-50)/100` → `(cond-70)/70`. **부상 확률 컨디션 보정** — `conditionInjuryMultiplier`: <50 ×1.5, >80 ×0.7. 훈련 부상 + HBP 부상 양쪽 적용. |
| **결승/PO 출전 표시** (`weekly.js` + `simulator.js`) | 진입 모달이 `decideRolesForGame` 미리 굴려 stash → `simulateFinal`/`simulatePostseasonGame` 에 `forcedRoles` 로 전달(UI 와 시뮬 결과 일치 보장). 표시 분기: 투수 등판 → "포지션: 투수" / 야수만 → "포지션: {player.position} · 투수 미출전" / 결장. `decideRolesForGame` export, `appearanceChance` 의 거짓 표시(`pitch>0 → 출전`) 해소. |
| **라운드별 SP 깊이 제한** (실제 야구 패턴) | `coachJudgment` 에 `gateType` 옵션. KS/WS, 아마추어 결승 = championship (팀 SP 1~3등만). po/cs (5~7전) = po_long (1~4등). wc/spo/ds (단기/와카) = po_short (1~5등). cutoff 밖이면 pitch=false 강제 차단. 일반 시즌은 기존 비율 기반(5선발 로테). |
| **PO 를 시즌의 일부로** (`weekly.js`) | 정규시즌 종료(`season.finished=true`) 직후 `renderSeasonEnd` 진입하던 흐름이 PO 위에 덮이는 위화감. `pendingPostseason` 살아있는 동안에는 별도 `renderPostseasonStandby` ("포스트시즌 진행 중") 화면 + PO 모달 오버레이. PO 끝나야 비로소 시즌 종합 화면 진입. |
| **자동 진행 토글 PO 모달까지 적용** | `skipFinalsModal` ON 시 결승/올스타/국제대회 외 PO 모달까지 자동 시뮬. `autoRunPostseason(ps)` 추가 — 시리즈/라운드 전부 자동 시뮬 + 보상 적용 + 토스트만 알림. |
| **상점 트레이트/유물 영구 소유 분리** (`regression.js` + `shop.js`) | 장착-해제 토글 시 매번 비용 차감되던 UX 버그. `permanentPurchases.ownedTraits/ownedRelics` 추가(영구 보존). `purchaseTrait/purchaseRelic` 신규 — 미소유 시에만 차감. `setTraits/setRelics` 는 장착만 담당. 카드 흐름: 미소유→구매+장착 / 소유미장착→무료장착 / 소유장착→무료해제. 옛 세이브의 `loadout.traits/relics` 자동 owned 승계. `shop.equippable` i18n 키 + 카드 상태 추가. |
| **autoTrain cap 인식** (`autoTrain.js`) | mental 251(cap 도달) 인데도 멘탈 훈련 골랐던 문제. `deficitFor` 를 cap 기준 평균 잔여 비율로 재작성 — cap 도달 stat 은 0 기여. `findLowestStatTraining` cap 근처 stat 자동 제외. 가중치 추첨을 `w * deficit` 곱셈으로 (cap 도달 weight 0). 모든 stat cap 도달 시 자동 휴식. 사용자 케이스 검증 시 mental 점유율 1.9%. |
| **fix(offseason)** | 비시즌 이벤트(국제대회 우승 등) `STAT_CAP=150` 하드코딩 → `getPlayerStatCap(player)` — MLB 단계에서도 정상 cap 까지 보너스 적용. |
| **fix(postseason)** | `makeOpponentForRound` 에서 본인 팀 풀 제외 + 폴백 — LAD vs LAD 같은 자기 매치 차단. |
| **fix(milestones) — mental 251 알려진 버그** | `award` 의 `Math.min(300, mental + N)` 하드코딩 → `getPlayerStatCap(player)`. probe-career 검증 결과 mental 피크 **251 → 228** (cap 250 이내). |
| **fix(auth) — Google 로그인 redirect** | `linkWithPopup`/`signInWithPopup` → `linkWithRedirect`/`signInWithRedirect`. COOP `window.closed/close` 차단 + popup-blocked 에러 회피. `initAuth` 가 `getRedirectResult` 처리. `credential-already-in-use` 폴백을 sessionStorage 마킹으로 자동 처리(confirm 다이얼로그 제거). |
| **fix(i18n) — position.P 키** | 방어 차원 추가 (ko: "투수", en: "P"). 현재 사용 경로 없지만 `t("position.P")` 호출 시 fallback 위험 제거. |

### 검증 체크리스트 (수동 시나리오)

**자동 검증** (회귀·밸런스): `node probe.mjs` + `node probe-career.mjs` — 실행 방법 §시뮬레이션 돌려보기 참고.

**수동 시나리오** (브라우저 UX 확인):

- [ ] **단경기 마일스톤** — 노히트/완봉/사이클링/끝내기 토스트
- [ ] **통산 마일스톤** — 1~3시즌 진행 후 통산 100안타·50홈런·100K 등 임계 도달 시 토스트
- [ ] **HBP 부상** — 시즌 중 사구 발생 후 가끔 부상 토스트 (부위 + 후유증 표시)
- [ ] **토미존** — severe + 어깨/팔꿈치 + 30% 트리거
- [ ] **골든글러브** — 수비형 캐릭터로 1시즌 끝까지 진행 → 시즌 종료 carousel 수상 슬라이드
- [ ] **드래프트 라이브** — 졸업 시 KBO 선택 → 라운드 라인 누적 → 본인 호명 → 계약금
- [ ] **시즌 중 대표팀 라이브 모달** — KBO 1군 + 명성 50+ → 7월 올스타 / WBC / 올림픽 등 모두 라이브 모달
- [ ] **국제대회 휴식기 대체** — 올림픽(year %4==0)/아시안게임(year %4==2) → 휴식기 `intl_tournament` 강제 → 메달 시 면제 토스트
- [ ] **군 입대** — pro1/pro2 + 만 27세 → 모달 (또는 면제 토스트)
- [ ] **포스트시즌 시리즈** — pro1/mlb 시즌 종료 + 순위권 → 라운드별 시리즈 (예: `7전 4선승제, 현재 2-1`) 진행
- [ ] **명예의 전당** — 은퇴 시 점수 breakdown + 헌액/영구결번/일반 등급별 카피
- [ ] **FA** — 계약 만료 (4시즌) 시즌 종료 → FA 모달 → 잔류/이적 선택
- [ ] **트레이드** — 휴식기 진입 시 8% 확률 → 수락/거절 모달
- [ ] **i18n 토글** — 위 모든 알림/모달 텍스트가 KO ↔ EN 즉시 전환

### 알려진 한계

- NPC 풀은 학년 진급 시 새로 생성 (시즌 사이 NPC 자체 성장/은퇴 미구현)
- 부상 회복은 주 단위 자동 (가속/치료 액션 없음). 토미존 후 재활 미니이벤트 X
- 일반 시즌 경기는 라이브 모달 없음 — 결승/PO/올스타/국제대회만 라이브
- 다이아몬드 *수비수 이동 애니메이션* 및 *NPC 주자 추적* 미구현 — 메인 출루 위치만 점으로 표시
- 컨디션 슬럼프 사이클은 능력치에만 영향, 이벤트 트리거 미연결 (사용자 결정으로 보류)
- 수비 포지션이 *수비 stat 분리 효과* 까지 가지진 않음 — 라벨링 + golden_glove relic 연계만
- **시뮬 캘린더 30일/월 + 26주 시즌** 단순화 — 실제 KBO 6.5개월 대비 압축. 11월 프리미어12 / 10월 추계 대학선수권 등 *시즌 외 시기 이벤트* 는 시즌 종료 직후 `checkOffseasonEvents` 로 별도 트리거
- **FA 자격 4년 계약 만료** 마다 발화 — 실제 KBO 의 *9시즌 등록일수* 와 다름. 게임 흐름 단순화로 의도된 선택
- **신인 드래프트 시기 통합** — 실제는 9월 지명 → 1월 계약 → 4월 데뷔 3단계, 시뮬은 졸업 시점 한 동작. 의도된 게임적 허용

## 핵심 시스템

| 영역 | 내용 |
|---|---|
| 능력치 | 양방향 (타자 5종 + 투수 5종), stage 별 cap (HS 150 → MLB 300) |
| 재능 타입 | 컨택/파워/주루/수비/만능 / 강속구/제구/변화구 |
| 성장 곡선 | 나이별 훈련/경험 효율 (18세 ×1.6 → 27세 ×1.0 → 30세 ×0.6 → 37세 ×0.05) |
| 노화 감쇄 | 30+ 시즌 종료 시 stat 자연 감소 (33+ 30%/-3, 38+ 70%/-5, 40+ 85%/-6) |
| 컨디션 | 호조/슬럼프 사이클, 경기력 보정 |
| 부상 | minor/moderate/severe + bodyPart 7부위 + surgery + aftereffect (토미존) |
| 자동훈련 | 프리셋 가중치 + 부족도 보정 + focusStats 타게팅 |
| 경기 시뮬 | 매치업 공식 (`softDiff` 격차 평탄화 + K/BB/HR/in-play 분기) + 5선발 로테이션 + 코치판단 |
| 출장 확률 | 타자: 부상만 아니면 100% / 투수: 휴식 × 코치판단 (메인 OVR vs 팀 SP 평균) |
| 경기 경험치 | 성적별 능력치 보너스 + 나이 감쇄 + cap diminish (curr / cap) |
| 시즌 통계 | 타율/OPS/ERA + RBI/R/SB/CS/HBP/SF/DP/E + W/L/SV/IP/K/BB |
| 계약 / FA / 트레이드 | 4년 계약 + 만료 시 FA 모달 + 휴식기 8% 트레이드 제안 |
| 명예의 전당 | 통산 점수 300/200 임계로 헌액/영구결번/일반은퇴 |
| 회귀 (NewGame+) | HoF 점수 = 잔액 → 5탭 상점 (재능슬롯·cap·시작능력치·특성·유물). 14 효과 + 도전과제 4종 |
| 구종 / 좌우 매치업 | 5 구종 보유/주력 (`pitches.js`) + 같은 손 페널티 contact -3 |
| 라이브 시각화 | 정면 POV (bat/pit 모드) + 다이아몬드 베지어 타구 궤적 + 베이스 점 + 스킵 |
| 저장 | localStorage (자동) + Firebase Firestore (사용자 명시 트리거만) + 익명/Google Auth |

## 파일 구조

```
ninthinning/
├── index.html
├── styles/main.css
├── firebase.json            # Firebase Hosting + Firestore rules 설정
├── firestore.rules          # saves/{uid} 본인만 접근
├── src/
│   ├── main.js              # 부트스트랩 + tick loop + 설정 모달 와이어링
│   ├── state.js             # 전역 상태 + 세이브 (locale/regression/settings/cloudUser 슬롯)
│   ├── i18n/
│   │   ├── index.js         # t() / setLocale / formatGameDate
│   │   ├── ko.js            # 한국어 문자열 테이블
│   │   └── en.js            # 영어 문자열 테이블
│   ├── data/
│   │   ├── names.js         # 한국 이름 풀 + randomName(locale) 디스패처
│   │   ├── names.en.js      # 영어 이름 풀
│   │   ├── teams.js         # 한국 팀 풀
│   │   ├── teams.en.js      # 영어 팀 풀 (고교/대학/프로/MLB)
│   │   ├── tournaments.js   # HS 7개 + 대학 4개 대회 일정
│   │   └── shopCatalog.js   # 회귀 상점 5탭 카탈로그 (재능슬롯/cap/시작능력치/특성/유물)
│   ├── systems/
│   │   ├── player.js        # 능력치·훈련·성장·부상 + 다중 재능 + 회귀 효과 wiring
│   │   ├── npc.js           # NPC 풀 생성 (bats/throws/pitches 부여)
│   │   ├── league.js        # 리그/일정/순위
│   │   ├── simulator.js     # 경기 자동 시뮬 (매치업·코치판단·구종·좌우·walkoff·error)
│   │   ├── pitches.js       # 구종 시스템 + 좌/우 매치업 페널티
│   │   ├── week.js          # 주 단위 진행 (slimGameResult 로 weekResults 슬림화)
│   │   ├── career.js        # 진로 분기 + FA + 트레이드 + 드래프트 (calling_card boost)
│   │   ├── autoTrain.js     # 자동훈련 프리셋 (mentor_letter deficit boost)
│   │   ├── awards.js        # 시즌 수상 (MVP/타격왕/홈런왕/골든글러브 등)
│   │   ├── finals.js        # HS/대학 토너먼트 결승 모달 (big_game reward mult)
│   │   ├── postseason.js    # KBO/MLB 포스트시즌 + 시리즈제 (big_game + championship_one 해금)
│   │   ├── seasonEvents.js  # 올스타·WBC·올림픽·AG·프리미어12 라이브 모달
│   │   ├── military.js      # 군 입대 (상무/경찰/사회복무)
│   │   ├── offseason.js     # 휴식기 5 카테고리 + 20+ 이벤트 (intl 자동진행)
│   │   ├── milestones.js    # 단경기·통산 마일스톤 (walkoff_one 해금)
│   │   ├── hallOfFame.js    # 은퇴 시 헌액 점수 + 등급 (hof_inducted 해금)
│   │   ├── tick.js          # 실시간 1일 진행
│   │   ├── regression.js    # 회귀(NewGame+) 메타 영속화 + 상점 액션
│   │   ├── traitEffects.js  # 회귀 trait/relic 효과 합산 헬퍼
│   │   └── settings.js      # 게임 메타 설정 (skipFinalsModal 등)
│   ├── cloud/
│   │   ├── firebase.js      # Firebase SDK init (gstatic CDN 10.13.0)
│   │   ├── firebaseConfig.js  # Web App config (사용자 채움)
│   │   ├── auth.js          # 익명 자동 + Google linkWithPopup + signOut
│   │   └── cloudSave.js     # saveToCloud / loadFromCloud (Firestore saves/{uid})
│   ├── views/
│   │   ├── menu.js          # 캐릭터 생성 + 회귀 상점 진입 + ☁️ 패널 + Auth 패널
│   │   ├── weekly.js        # 메인 게임 화면 + 라이브 모달 + 결승/PO 모달
│   │   ├── shop.js          # 회귀 상점 5탭 UI
│   │   └── settingsModal.js # 전역 설정 모달 (배속/언어/결승토글)
│   └── render/
│       ├── svg.js           # SVG 헬퍼
│       ├── avatars.js       # 얼굴 6종
│       ├── character.js     # 3등신 캐릭터 (자세별)
│       ├── radar.js         # 레이더 차트
│       └── finalAnim.js     # 정면 POV 씬 (bat/pit 모드) + 결과별 PLAYBOOK
├── probe.mjs                # 4 stage 단위 검증
├── probe-career.mjs         # 22시즌 풀 커리어 시뮬
├── probe-regression.mjs     # 회귀 시스템 89 항목 검증 (13 섹션)
└── assets/                  # 추후 이미지 교체 슬롯
```

## i18n 아키텍처

핵심 규칙은 **"시스템 레이어는 키만, UI 레이어가 t()로 라벨 해결"**.

- **`src/i18n/{ko,en}.js`** — 도메인별로 네임스페이스가 나뉜 플랫한 문자열 테이블. 키는 dot-notation (`stat.contact`, `weekly.btnPlay`, `preset.slugger.label`). 템플릿 변수는 `{name}` 형태.
- **`src/i18n/index.js`** — `t(key, params)`, `setLocale`, `toggleLocale`, `formatGameDate`. `state.locale` 을 SoT로 삼고 별도 localStorage 키(`ninthinning.locale.v1`)에 영속화.
- **시스템 레이어 (`src/systems/*`)** — 라벨/문자열 보유 금지. 데이터 객체는 키만 가지며, 로그 메시지는 t() 호출로 생성. 예외: 로그 엔트리는 작성 시점에 즉시 t()로 렌더되어 텍스트로 동결됨.
- **데이터 레이어 (`src/data/*`)** — 이름/팀 풀은 locale별 파일로 분리. `getTeamPool(stage, locale)`, `randomName(locale)` 헬퍼로 디스패치.
- **UI 레이어 (`src/views/*`)** — 모든 사용자 표시 문자열은 `t()` 호출. 토글 시 `route(state.view)` 재호출로 즉시 재렌더.

### 데이터의 "동결" vs "동적" 분류

| 범주 | 정책 | 이유 |
|---|---|---|
| UI 라벨, 버튼, 패널 제목 | **동적** (매 렌더 t()) | 토글 즉시 반영되어야 자연스러움 |
| 캐릭터 이름, 팀 이름, 지역명 | **동결** (생성 시점 locale의 풀에서 결정) | 식별자 성격 — 토글로 바뀌면 혼란 |
| 로그 메시지 (state.log[]) | **동결** (작성 시점 t() 결과를 문자열로 저장) | 시간순 기록의 정합성 |
| 부상 종류, 재능 타입, 훈련 종류 등 enum 표시 | **동적** (severity/key 저장 → 표시 시 t()) | 시스템 상태이므로 현재 언어로 보여야 함 |
| 날짜 포맷 | **동적** (`formatGameDate(d)`가 현재 locale로 렌더) | `3월 15일 (수)` ↔ `Mar 15 (Wed)` |

### 새 언어 추가 방법

1. `src/i18n/<locale>.js` 작성 — `ko.js` 구조 그대로 모든 키를 채운다. 누락 시 `DEFAULT_LOCALE` (한국어) 로 폴백.
2. `src/i18n/index.js` 의 `SUPPORTED_LOCALES`, `MONTH_ABBR`, `TABLES` 에 추가.
3. (선택) 이름/팀 풀이 별도로 필요하면 `src/data/names.<locale>.js`, `src/data/teams.<locale>.js` 작성 후 `data/{names,teams}.js` 의 디스패처에 분기 추가.
4. 토글 UX는 현재 KO ↔ EN 2언어 가정 — 3개 이상 지원하려면 `toggleLocale()` 을 셀렉터로 교체.

## 앞으로 할 일 (로드맵)

> 이벤트 시스템 단위의 세부 갭 분석/우선순위는 [`EVENTS.md`](./EVENTS.md) 에 별도 문서로 정리.

### Phase 1 완료 — 남은 차후 작업

EVENTS.md #2~#16 는 v0.5.1 까지 모두 완료 (단, #13 일본 진출은 영구 제외).
v0.6 에서 회귀(NewGame+) + Cloud Save + Phase 2 시각화 일괄 완료.

| 영역 | 상태 |
|---|---|
| ~~**회귀 시스템 (NewGame+)**~~ | ✅ v0.6 완료 (5탭 상점 + 14 효과 wiring + 도전과제 4종) |
| ~~**Phase 2 본격**~~ | ✅ v0.6 완료 (구종/좌우/타순/포지션/베지어 궤적/주자/스킵) |
| ~~**Cloud Save**~~ | ✅ v0.6 완료 (Firebase Anonymous + Google linking, 사용자 명시 트리거) |
| **세이브 마이그레이션 보강** | 보류 — 개발 단계 (옛 세이브 호환 불필요). 정식 출시 시 재검토 |
| **컨디션 슬럼프 → 이벤트** | 보류 (사용자 결정) |
| **수비수 이동 애니메이션 / NPC 주자 추적** | 가치 대비 작업량 큼 — 보류 |
| **일반 시즌 경기 라이브 모달 토글** | 가치 모호 — 보류 |

### Phase 2 — POV 시각화 + 경기 디테일 (v0.6 완료)

- [x] 타석 POV (정면 투수 SVG + 날아오는 공 + 타이밍) — `finalAnim.js`
- [x] 투구 POV (정면 타자 SVG + 코스 격자 + 던지는 공) — `finalAnim.js`
- [x] 탑뷰 야구장 SVG + 공 궤적(베지어) — v0.6 (수비수 이동은 미구현)
- [x] 주자 베이스 점 표시 (메인 위치만, NPC 주자 추적 X) — v0.6
- [x] 스킵 버튼 — v0.6
- [x] 타순 자동 결정 (메인 OVR 기반 3/4/6번) — v0.6 (수동 조정 UI 미구현)
- [x] 상황별 결과 — HBP/E/SF/DP/SB/CS + 끝내기·만루홈런 특수 검출 모두 v0.5 까지 완료
- [x] 좌/우 상성 (`pitches.handMatchupPenalty` contact -3) — v0.6
- [x] 구종 시스템 (직구/슬라이더/커브/체인지업/포크 — `pitches.js`) — v0.6
- [x] 수비 위치 부여 (메인 `decideMainPosition`, NPC `POS_WEIGHTS`) — v0.6 (포지션별 *수비 stat 분리 효과* 는 미구현)

### Phase 3 — 커리어 깊이

- [x] 졸업 후 진로 분기 (대학 / KBO / MLB / 은퇴) — v0.2
- [x] 신인 드래프트 (1~10라운드, 계약금, 라이브 모달) — v0.4
- [ ] 대학 1~4학년 시즌
- [~] 프로 1·2군 콜업 시스템 — 콜업만 구현, 강등 미구현
- [x] **FA** (4년 계약 + 잔류/이적 모달) — v0.5
- [x] **트레이드** (휴식기 진입 시 8% 확률 NPC 제안) — v0.5.1
- [x] 해외 진출 — MLB (KBO → MLB 오퍼 / 마이너 단계 진입 + 콜업 사다리) — v0.2
- [~] NPC 시즌 단위 성장 / 은퇴 / 신인 합류 — 리그 NPC 풀은 여전히 학년 진급 시 재생성
- [x] 시즌 수상 (9종) — v0.2 8종 + v0.4 골든글러브
- [x] 통산 기록 마일스톤 (1000안타·500홈런·노히트 등) — v0.4
- [x] 군 입대 (상무/경찰청/사회복무) + 국제대회 면제 — v0.4
- [x] **포스트시즌 시리즈제** (KBO/MLB 라운드별 N전제) — v0.5
- [x] 시즌 중 국제대회 라이브 모달 (올스타·WBC·올림픽·아시안게임·프리미어12) — v0.5
- [x] **명예의 전당 헌액 판정** (은퇴 엔딩, 점수 300/200 임계) — v0.5
- [x] **회귀(NewGame+) 시스템** (5탭 상점 + 14 효과 + 도전과제 4종) — v0.6
- [ ] 사브레메트릭스 (BABIP, OPS+, WAR 표시)

### Phase 4 — 폴리시

- [ ] 일기/뉴스 헤드라인 자동 생성 (매주)
- [ ] 도전과제 (Achievement) 시스템
- [ ] 날씨 시스템 (경기 영향)
- [ ] 사운드/효과음
- [ ] 시즌 통째로 스킵 자동 진행
- [ ] 커리어 통계 그래프 (능력치/성적 추이 시각화)

### 개선 후보 (Phase 무관)

- [ ] 이미지 에셋 교체 슬롯 활용 (SVG → 실사/일러스트)
- [ ] 자동 모드 ON 상태로 학년 진급 시 새 프리셋 자동 추천
- [x] 부상 부위 구분 (어깨/팔꿈치/무릎/발목/햄스트링/허리/손목) — v0.4
- [x] 시뮬레이션 공식 튜닝 (밸런스 패치) — v0.5 (probe-career 22시즌 검증)

## 라이선스

개인 프로젝트 (private). 외부 배포 미정.
