# 게임 모네타이즈(광고) 설정 가이드

이 게임은 **Google AdSense 전면(인터스티셜) 광고**로 수익화하도록 골격이 들어가 있습니다.
현재는 **placeholder ID** 라 광고가 표시되지 않습니다(빈 모달 + 닫기/계속만). 아래 정보를 채우면 활성화됩니다.

---

## 1. 광고 노출 시점 (이미 구현됨)

| 시점 | 트리거 위치 |
|---|---|
| 게임 시작(앱 진입) | `src/main.js` `init()` |
| 3시즌마다 새 시즌 시작 (고교 졸업 후 첫 프로시즌 등) | `src/views/weekly.js` 휴식기→다음시즌 (`maybeShowSeasonAd`) |
| 은퇴 | `src/views/weekly.js` 시즌종료/강등 은퇴 버튼 |

주기 조정: `src/systems/ads.js` 의 `SEASON_AD_INTERVAL`(기본 3).

---

## 2. 채워야 할 정보 (발급 후 교체)

### (A) AdSense 가입·승인
1. https://adsense.google.com 가입.
2. 사이트 등록 — 배포 도메인(예: `https://baseball-alone.web.app`) 추가 후 **심사 통과** 대기.
3. 승인되면 **퍼블리셔 ID**(`ca-pub-XXXXXXXXXXXXXXXX`) 발급.
4. **광고 단위** 생성(디스플레이 광고 권장) → **광고 슬롯 ID**(10자리 숫자) 발급.

### (B) 코드에 ID 2곳 교체

| 파일 | 항목 | 현재(placeholder) | 넣을 값 |
|---|---|---|---|
| `index.html` (head) | 로더 script `client=` | `ca-pub-XXXXXXXXXXXXXXXX` | 본인 퍼블리셔 ID |
| `src/systems/ads.js` | `AD_CLIENT` | `"ca-pub-XXXXXXXXXXXXXXXX"` | 본인 퍼블리셔 ID |
| `src/systems/ads.js` | `AD_SLOT_INTERSTITIAL` | `"0000000000"` | 광고 슬롯 ID |

> 퍼블리셔 ID는 index.html·ads.js **양쪽 동일하게**, 슬롯 ID는 ads.js 에만.

### (C) ads.txt (권장)
사이트 루트(배포 public 루트)에 `ads.txt` 생성 — 수익 보호용. AdSense가 안내하는 형식:
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
(`pub-` 뒤 숫자 = 본인 퍼블리셔 ID 의 숫자부분.)

---

## 3. 정책 주의 (운영 전 확인)

- **모달(팝업) 안의 AdSense 디스플레이 광고는 정책 제약**이 있을 수 있습니다. 현재 구현은 트리거/노출 골격이며, 실제 운영 시 다음을 권장:
  - **AdSense 자동 광고 > 비네트(Vignette)** — 페이지 전환 사이 전면 광고(자동 관리, 정책 안전).
  - 또는 게임용 **보상형/전면 광고 SDK**(예: Google AdMob — 단, 웹이 아닌 앱 래핑 필요).
- 클릭 유도/오클릭 유발 배치 금지(정책 위반 시 계정 정지).

---

## 4. 배포

- **웹(현재 구조)**: Firebase Hosting — `firebase deploy --only hosting`. 배포 루트는 저장소 루트(`firebase.json` public=".").
- **모바일 앱 + AdMob**(선택): Capacitor/Cordova 로 래핑해야 AdMob(앱 전용) 사용 가능 — 별도 작업.

---

## 5. 배포 번들

`ninthinning-web.zip` = 실행에 필요한 파일만(index.html, src/, styles/, assets/) 상대경로 보존. 정적 호스팅에 그대로 업로드하거나 압축 해제 후 배포.
(빌드: 저장소 루트에서 `index.html`+`src`+`styles`+`assets` 묶음. `.md`/probe/원본은 제외.)
