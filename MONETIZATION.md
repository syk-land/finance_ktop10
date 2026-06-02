# 게임 모네타이즈(광고) 설정 가이드

이 게임은 **GameMonetize.com SDK** 로 수익화합니다 — 웹(HTML5) 게임 전용 광고 네트워크로, **전면(인터스티셜)·보상형 광고**를 지원합니다.
(이전의 Google AdSense 디스플레이 방식은 게임 모달 광고가 정책상 부적합해 GameMonetize 로 교체함.)

현재 GameMonetize 게임 ID = `zk9dnevoky8n3c7r7immy2e4xxbamx4b` (등록 완료, `index.html` `SDK_OPTIONS.gameId` 에 입력됨).

---

## 1. 광고 노출 시점 (이미 구현됨)

| 시점 | 트리거 위치 |
|---|---|
| 게임 시작(앱 진입) | `src/main.js` `init()` → `showInterstitialAd()` |
| 3시즌마다 새 시즌 시작 (고교 졸업 / 진로 선택 / 일반 시즌 전환 모두 포함) | `src/systems/week.js` `advanceToNextSeason()` 말미 → `maybeShowSeasonAd(careerHistory.length)` |
| 은퇴 | `src/views/weekly.js` 시즌종료/강등 은퇴 버튼 → `showInterstitialAd()` |

`advanceToNextSeason()` 이 시즌 카운트(`careerHistory.length`)를 증가시키는 유일한 지점이라 여기서 호출 — 일반 "다음 연차 진행", 진로 선택(`chooseCareerPath` → univ/kbo/mlb), 군입대 후 복귀 등 모든 경로에서 자동 발화. 주기 조정: `src/systems/ads.js` 의 `SEASON_AD_INTERVAL`(기본 3).
광고 동안 BGM 은 자동 일시정지/복귀(`main.js __adPause/__adResume` ← SDK `SDK_GAME_PAUSE/START`).

---

## 2. 채워야 할 정보 (단 1개)

### (A) GameMonetize 게임 등록
1. https://gamemonetize.com 가입(퍼블리셔).
2. 게임 등록(URL/zip 업로드) → 심사 통과 후 **gameId** 발급.

### (B) gameId 교체 (완료)

| 파일 | 항목 | 값 |
|---|---|---|
| `index.html` (head SDK_OPTIONS) | `gameId` | `"zk9dnevoky8n3c7r7immy2e4xxbamx4b"` |

> SDK 스크립트(`https://api.gamemonetize.com/sdk.js`)는 이미 로드됩니다. 게임 ID 변경 시 한 줄만 교체하면 됩니다.

---

## 3. 동작 방식

- `showInterstitialAd()` → `window.sdk.showBanner()` 호출. **GameMonetize 의 `showBanner()` 가 전면 광고**입니다(네이밍 주의 — 배너 아님).
- SDK 가 광고 전체화면 UI 를 직접 띄우므로, 게임 쪽엔 별도 광고 모달이 없습니다(가벼움).
- 광고 시작 시 `SDK_GAME_PAUSE`, 종료 시 `SDK_GAME_START` 이벤트 → BGM 일시정지/복귀.

### 보상형 광고(선택)
`src/systems/ads.js` 의 `showRewardedAd()` 골격 있음. 보상 지급은 `index.html` 의 `SDK_OPTIONS.onEvent` 에서 `SDK_REWARDED_WATCH_COMPLETE` 처리로 확장하면 됩니다(예: 광고 시청 시 회귀 포인트/리롤 지급).

---

## 4. 배포 / 주의

- GameMonetize 는 보통 **그들의 플랫폼/승인된 도메인**에서 광고가 채워집니다. 자체 호스팅(Firebase) 배포 시 도메인 등록·정책 확인 필요.
- 광고 빈도(시작+3시즌+은퇴)는 과하면 이탈↑ — 실데이터 보고 `SEASON_AD_INTERVAL`·시작광고 on/off 조정 권장.
- 로컬/미승인 상태에선 광고가 안 채워질 수 있음(정상). gameId·승인 후 실기 확인.

---

## 5. 배포 번들

`ninthinning-web.zip` = 실행에 필요한 파일만(index.html, src/, styles/, assets/) 상대경로 보존. 정적 호스팅 업로드 또는 GameMonetize 업로드용.
(빌드: 저장소 루트에서 `index.html`+`src`+`styles`+`assets` 묶음. `.md`/probe/원본 제외.)
