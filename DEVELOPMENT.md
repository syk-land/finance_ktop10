# DEVELOPMENT.md — 개발 / 테스트 / 에셋 가이드

> 세션이 바뀌어도 이 문서(+ `.claude/handoff.md`)만 `git pull` 하면 그대로 이어갈 수 있게 정리.
> 진행 중 작업/결정사항은 `.claude/handoff.md`, 영속적인 개발·테스트 절차는 이 문서.

## 0. 한 줄 요약
빌드 없음 · Vanilla JS(ESM) · SVG 코드생성 · localStorage 세이브 · 정적 호스팅(Firebase) · i18n(ko/en).
`index.html` 정적 서빙만으로 동작. `main` 푸시 시 GitHub Actions → Firebase Hosting 자동 배포(https://baseball-alone.web.app).

---

## 0.1 개발 방식 — 왜 문서를 쓰나 (중요)

이 프로젝트는 **문서 주도(doc-driven) + 세션 인계(session handoff)** 방식으로 개발한다.

**왜 이래야 하나:**
- 실제 구현자(Claude Code)는 **세션마다 바뀌고, 이전 세션의 기억이 없다.** 다음 세션은 오직
  **`git pull` 로 받은 저장소 내용**만으로 상태를 파악한다 — 대화 맥락은 사라진다.
- 따라서 **저장소의 문서가 "공유된 뇌(single source of truth)"** 다. 코드는 *무엇을* 하는지 보여주지만,
  *왜 그렇게 했고 / 지금 어디까지 됐고 / 다음에 뭘 해야 하는지*는 문서에만 남는다.
- 문서가 코드와 어긋나면 다음 세션이 맥락을 다시 추론하다 시간을 버리거나 잘못된 가정을 한다.
  → **그래서 모든 커밋/푸시에 관련 문서 갱신을 포함한다.** (코드만 커밋 금지)

**커밋 전 점검:** "이 변경이 어느 문서에 반영돼야 하나?" → 해당 문서 변경을 같은 푸시에 포함.

**무엇을 어디에 적나:** (README "📖 문서 안내" 와 같은 표 — 여기는 *적는 사람* 관점)
| 문서 | 관점 | 적는 내용 |
|---|---|---|
| `README.md` | 플레이어/전체 | 게임 소개 + **버전 changelog**(무엇이 바뀌었나, 기능·밸런스) + 문서 안내 + 핵심 시스템/파일구조/로드맵 |
| `.claude/handoff.md` | 다음 세션 | **현재 진행 상황 + 결정 사항 + 다음 할 일 + 미해결 버그/백로그**(지금 어디까지, 다음 뭘) |
| `DEVELOPMENT.md` | 개발자 | 개발 방식·도구·의존성·**테스트 방법**·배포·**에셋 파이프라인**(어떻게 개발·검증하나) |
| `EVENTS.md` | 야구 컨텐츠 | 실제 야구 대비 **이벤트 갭 분석** + 구현 노트 + probe 사용법 + 변경 로그 |
| `assets/README.md` | 에셋 | 파일명·스펙 규약 + 생성 프롬프트 시트 (완료/TODO 구분) |
| 메모리(`~/.claude/.../memory/`) | 작업 방식 | 세션 간 유지할 사용자 선호·행동 규칙 (저장소 밖, 자동 로드) |

요약: **코드 = 무엇 / 문서 = 왜·상태·다음**. 둘이 항상 같이 움직여야 세션이 바뀌어도 끊김 없이 이어진다.

## 0.5 필요 도구 / 의존성 (다 적어둠)

**런타임 의존성: 없음.** 프레임워크/번들러/런타임 npm 패키지 0개 (Vanilla JS ESM). `index.html` 만으로 동작.

| 구분 | 항목 | 용도 / 비고 |
|---|---|---|
| **런타임(설치 X)** | Firebase SDK 10.13.0 | 클라우드 세이브/로그인. **CDN(gstatic) 직접 import** — 설치 없음. `firebaseConfig` 비면 자동 비활성. |
| **서버** | Python 3 | `python3 -m http.server` 정적 서빙 (ESM은 file:// 불가) |
| **시뮬 테스트** | Node ≥ 18 | `probe.mjs` / `probe-career.mjs` 실행 (ESM, 의존성 0) |
| **브라우저 테스트** | Playwright `1.60.0` | `npm install --no-save` (커밋 X). 헤드리스 Chromium 구동 |
| | Chromium 바이너리 | `npx playwright install chromium` (1회) |
| | apt 시스템 라이브러리 | chromium 구동용 (아래 목록, sudo 1회) |
| **이미지 가공** | Python **Pillow(PIL)** | Gemini 워터마크 제거 + WebP 축소 (`pip install pillow` 또는 시스템 PIL) |
| **배포 상태** | GitHub CLI `gh` | `gh run list` 로 Actions 확인 (선택) |
| **버전관리** | git | main 푸시 → 자동 배포 |

**에셋 생성(외부, 본인 PC)**: 이미지=Gemini(Imagen), BGM=MusicFX/Lyria(labs.google). 효과음=코드 합성(설치 X).

apt 시스템 라이브러리 (chromium):
```
libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2
libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1
libpango-1.0-0 libcairo2 libasound2t64
```

## 1. 실행

```bash
# 로컬 플레이 (ES Module 은 file:// 로 못 열림 — 반드시 HTTP 서버)
python3 -m http.server 8765
# → http://localhost:8765
```

---

## 2. 테스트

### 2.1 시뮬 회귀 (Node, 빠름 — 1순위)
```bash
node probe.mjs          # 단계별 단위 검증. 마지막에 "✅ 전체 통과" 여야 함
node probe-career.mjs   # 16세~38세 풀 커리어 시뮬. 분포 체크리스트 출력
```
기대치:
- `probe.mjs`: `[FAIL]` 0건, "✅ 전체 통과".
- `probe-career.mjs`: 프로 시즌 평균 **AVG .24~.27 / ERA 2~4** "✓ 현실 범위", OVR 곡선 정상.
- 밸런스/로직 변경 후엔 **항상 둘 다** 돌려 회귀 확인. `probe.mjs` 의 픽스처가 옛 기준을 검사하면 같이 갱신.

### 2.2 브라우저 검증 (Playwright — UI/흐름 확인)
이 환경은 외부 인터랙티브 사이트 인증서를 가로채고 구글 로그인이 불가하므로, **로컬 서버 + 오프라인 스텁**으로 검증한다.

**(1) 시스템 라이브러리 — 1회만** (chromium 구동에 필요. sudo 필요 → 사용자가 직접):
```bash
sudo apt-get install -y libnspr4 libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libpango-1.0-0 libcairo2 libasound2t64
```
(Ubuntu 24.04 는 `libasound2t64`. 구버전이면 `libasound2`.)

**(2) chromium 바이너리 — 1회**:
```bash
npx --yes playwright install chromium
```

**(3) 매 검증 시**:
```bash
python3 -m http.server 8765 &              # 서버
npm install --no-save playwright@1.60.0    # 모듈 (커밋 X — node_modules 는 .gitignore)
node ./_drive.mjs                          # 아래 드라이버
rm -rf node_modules package-lock.json      # 끝나면 정리
```

**드라이버 핵심 패턴** (`_drive.mjs`):
```js
import { chromium } from "playwright";
// Firebase 가 외부 CDN(gstatic) 의존 → 그대로면 모듈 로드 실패. 빈 스텁으로 가로채 오프라인 구동.
const STUBS = {
  "firebase-app.js":  "export function initializeApp(){return{};}",
  "firebase-auth.js": "export function getAuth(){return{};}\nexport function signInAnonymously(){return Promise.resolve({});}\nexport function onAuthStateChanged(){return ()=>{};}\nexport function signOut(){return Promise.resolve();}\nexport function GoogleAuthProvider(){}\nexport function signInWithRedirect(){return Promise.resolve();}\nexport function linkWithRedirect(){return Promise.resolve();}\nexport function getRedirectResult(){return Promise.resolve(null);}",
  "firebase-firestore.js": "export function getFirestore(){return{};}\nexport function doc(){return{};}\nexport function getDoc(){return Promise.resolve({exists:()=>false});}\nexport function setDoc(){return Promise.resolve();}\nexport function deleteDoc(){return Promise.resolve();}\nexport function serverTimestamp(){return 0;}",
};
const b = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, ignoreHTTPSErrors: true });
await ctx.route("**/firebasejs/**", r => {
  const u = r.request().url();
  const f = Object.keys(STUBS).find(x => u.endsWith(x));
  return r.fulfill({ status: 200, contentType: "text/javascript", body: f ? STUBS[f] : "export default {};" });
});
const page = await ctx.newPage();
page.on("pageerror", e => console.log("PAGEERR:", e.message));
await page.goto("http://localhost:8765/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
// ... 조작/스크린샷 ...
await page.screenshot({ path: "/tmp/shot.png" });
await b.close();
```
- 게임 내부 상태는 `window.__gameState`, 라우팅은 `window.__route(name)` 로 접근.
- 모바일 기준 뷰포트: **360×640**(작은 폰), **412×732**(일반). 한 화면 검증 시 `document.documentElement.scrollHeight <= innerHeight`.
- 오디오 unlock 은 첫 제스처 필요 → `page.click(...)` 한 번 후 효과음 동작.

---

## 3. 코드 구조 핵심 포인터
```
src/
├── main.js                  # 부트/라우팅(VIEWS), tick 루프, 오디오 unlock·이미지 preload, 뷰별 BGM
├── state.js                 # state + saveGame/loadGame/resetAllData
├── systems/
│   ├── player.js            # 능력치/훈련(applyTraining)/성장/getPlayerStatCap(player,stat)/overallScore·nationalTeamRating
│   ├── simulator.js         # 경기 시뮬 + 불펜/대타(PH)/대주자(PR)/라인업
│   ├── autoTrain.js         # 자동훈련 — 프리셋 "스탯별 목표 비중"
│   ├── career.js            # 드래프트/콜업(checkPromotion)/강등(checkDemotion)/MLB
│   ├── seasonEvents.js      # 올스타·국제대회 선발(rating 기반)
│   ├── offseason.js         # 휴식기/U-18
│   ├── regression.js        # 회귀(NewGame+) 메타·상점 구매(스탯캡/유물 레벨)
│   └── ...
├── assets/                  # ★ 에셋 레이어 (manifest/images/audio) — §5
├── views/                   # menu(시작+생성)/weekly/shop/settingsModal
├── data/                    # names/teams(MLB 30구단)/shopCatalog/tournaments
└── i18n/                    # ko.js / en.js / index.js
assets/                      # ★ 바이너리 에셋 (img/*.webp, audio/*.mp3) — §5
```

---

## 4. 배포 / git
- `main` 푸시 → GitHub Actions(`Deploy to Firebase Hosting on merge`) → 약 1분 후 라이브.
- 상태 확인: `gh run list --limit 5`. 사이트 도달: `curl -sk https://baseball-alone.web.app/` (이 환경은 `-k` 필요).
- **커밋/푸시는 사용자 명시 요청 시에만.** 커밋 메시지 Conventional(feat/fix/balance/docs/data...).
- `node_modules/`, `package-lock.json`, `gemini_images/`(대용량 원본) 는 .gitignore.

---

## 5. 에셋 파이프라인 (이미지 / 오디오)

### 5.1 원칙
파일이 없어도 게임은 정상 동작 — 이미지=폴백(SVG/로고), BGM=무음, 효과음=Web Audio 합성.
키→경로 등록은 `src/assets/manifest.js`. 새 에셋은 여기 추가하면 됨.

### 5.2 이미지 생성·가공 흐름
1. **생성**: 사용자 본인 로그인 Chrome 에서 **Gemini(Imagen)** 로 생성 (개발 샌드박스는 구글 로그인 불가).
   원본 PNG 를 `gemini_images/` 에 둔다 (커밋 안 함).
2. **워터마크 제거 + 웹 축소** (PIL): Gemini 우하단 ✦ 반짝이 워터마크 제거 후 WebP 로 축소.
```python
from PIL import Image, ImageFilter, ImageDraw
def heal(im):  # 우하단 워터마크 제거 (인접 텍스처 복사 + 페더 블러)
    im=im.convert('RGB'); w,h=im.size; B=190
    im.paste(im.crop((w-2*B,h-B,w-B,h)),(w-B,h-B))
    blur=im.filter(ImageFilter.GaussianBlur(18))
    mask=Image.new('L',(w,h),0); ImageDraw.Draw(mask).rectangle((w-B-10,h-B-10,w,h),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(55))
    return Image.composite(blur,im,mask)
im=heal(Image.open('gemini_images/원본.png'))
W=512  # 이벤트 컷 512 / 타이틀 640
im=im.resize((W, round(im.size[1]*W/im.size[0])), Image.LANCZOS)
im.save('assets/img/이름.webp','WEBP',quality=82,method=6)   # 각 ≤300KB 목표
```
3. **등록**: `assets/img/<이름>.webp` → `manifest.js` 의 IMAGES 키.

### 5.3 오디오
- **효과음**: 파일 불필요. `src/assets/audio.js` 가 합성 (`sfx("hit"|"homerun"|"strikeout"|"click"|"good"|"bad")`).
- **BGM**: **MusicFX/Lyria (labs.google)** 로 생성 → `assets/audio/bgm-menu.mp3`, `bgm-game.mp3` (루프, ≤1MB). 없으면 무음.
- 음소거/볼륨: 설정 모달(⚙) 사운드 섹션.

### 5.4 현재 에셋 상태 (2026-05-29)
- 이미지 9장 가공 완료 → `assets/img/*.webp` (title-hero + event-champion/hof/draft/intl/allstar/military/training/award). 매니페스트 등록됨.
- **title-hero 만 화면에 적용됨**(타이틀). 이벤트 컷 8장은 매니페스트엔 있으나 **각 이벤트 모달 wiring 미완** → 다음 작업.
- BGM 파일 아직 없음(무음).
- 미생성 이벤트 컷: **부상/토미존, 은퇴, 강등, FA/트레이드** (+휴식기 컷 옵션).

---

## 6. 자주 쓰는 명령
```bash
node probe.mjs && node probe-career.mjs          # 시뮬 회귀
python3 -m http.server 8765                      # 로컬 서버
npm install --no-save playwright@1.60.0          # 브라우저 검증용(임시)
gh run list --limit 5                            # 배포 상태
```
