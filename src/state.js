const SAVE_KEY = "ninthinning.save.v1";
const SAVE_VERSION = 2;

export const state = {
  player: null,
  league: null,
  season: null,
  career: null,
  log: [],
  view: "menu",
  autoMode: null,        // null | preset key
  paused: true,          // true면 시간 정지
  tickSpeed: 500,        // ms / 1일
  gameDate: null,        // { year, day, month, dayOfMonth, dayOfWeek }
  locale: "ko",          // "ko" | "en" — i18n/index.js 에서 별도 localStorage 키로 영속화
  offseason: null,       // null | { randomEventKey, selected, outcomeKind, changes[] } — 시즌 종료 후 휴식기 단계
  pendingFinal: null,    // null | { tournamentKey, opponent, status, result, processedWeek } — 토너먼트 결승전 대기
  pendingPostseason: null, // null | { bracket, round, opponent, status, completedRounds[] } — 포스트시즌(pro1/mlb)
  pendingToasts: [],     // [{msg, kind}] — UI 매 렌더에서 꺼내 표시
  pendingEvents: [],     // [{key, type, handlerKey, year}] — 시즌 중 이벤트 큐 (seasonEvents.js)
  regression: null,      // 회귀(NewGame+) 메타 — systems/regression.js 가 별도 localStorage 키로 영속화
  cloudUser: null,       // Firebase Auth 사용자 — { uid, isAnonymous, displayName?, email? }. null 이면 미로그인/비활성.
  settings: null,        // 게임 메타 설정 — systems/settings.js 가 별도 localStorage 키로 영속화
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function pushLog(entry) {
  state.log.unshift({ time: Date.now(), ...entry });
  if (state.log.length > 100) state.log.length = 100;   // 옛 200 → 100 절반.
}

// 토스트 큐 — UI 가 매 렌더에서 꺼내 띄움.
export function pushToast(msg, kind = "good") {
  if (!state.pendingToasts) state.pendingToasts = [];
  state.pendingToasts.push({ msg, kind });
}

export function saveGame() {
  try {
    const payload = {
      saveVersion: SAVE_VERSION,
      lastSaved: Date.now(),   // 클라우드와의 timestamp 비교용 (Phase C)
      player: state.player,
      league: state.league,
      season: state.season,
      career: state.career,
      log: state.log.slice(0, 30),    // 옛 50 → 30 절약
      autoMode: state.autoMode,
      paused: state.paused,
      tickSpeed: state.tickSpeed,
      gameDate: state.gameDate,
      offseason: state.offseason,
      pendingFinal: state.pendingFinal,
      pendingPostseason: state.pendingPostseason,
      // 시즌 중 이벤트 모달 대기 큐 (올스타·WBC·올림픽·AG·프리미어12).
      // 트리거된 뒤 처리 전 새로고침되면 모달이 사라져 보상 누락이라 반드시 저장.
      pendingEvents: state.pendingEvents,
    };
    const serialized = JSON.stringify(payload);
    // 진단 로그 — 1 MB 넘으면 필드별 사이즈 breakdown 출력. 사용자가 큰 필드 식별 가능.
    if (serialized.length > 1_000_000) {
      console.warn(`[save] payload ${(serialized.length / 1024).toFixed(0)} KB (1 MB 초과)`);
      const breakdown = {};
      for (const k of Object.keys(payload)) {
        try {
          const s = JSON.stringify(payload[k]);
          breakdown[k] = s == null ? 0 : (s.length / 1024);
        } catch (_) { breakdown[k] = -1; }
      }
      console.table(breakdown);
      // league.teams 가 가장 크면 팀별 + roster 별 추가 breakdown
      if (payload.league?.teams && (breakdown.league ?? 0) > 200) {
        console.log("[save] league.teams 상세:");
        for (const tm of payload.league.teams) {
          const teamSize = JSON.stringify(tm).length / 1024;
          const rosterSize = JSON.stringify(tm.roster ?? []).length / 1024;
          console.log(`  ${tm.name}: ${teamSize.toFixed(1)} KB (roster ${rosterSize.toFixed(1)} KB, ${(tm.roster ?? []).length} 명)`);
        }
      }
    }
    localStorage.setItem(SAVE_KEY, serialized);
    return true;
  } catch (e) {
    console.error("save failed", e);
    if (e.name === "QuotaExceededError" || e.code === 22) {
      // 응급 — 가장 큰 휘발성 필드 비우고 재시도
      try {
        state.log = state.log.slice(0, 10);
        if (state.player?.tournamentHistory?.length > 30) {
          state.player.tournamentHistory = state.player.tournamentHistory.slice(-30);
        }
        const retry = JSON.stringify({
          saveVersion: SAVE_VERSION, lastSaved: Date.now(),
          player: state.player, league: state.league, season: state.season,
          career: state.career, log: state.log, autoMode: state.autoMode,
          paused: state.paused, tickSpeed: state.tickSpeed, gameDate: state.gameDate,
          offseason: state.offseason, pendingFinal: state.pendingFinal,
          pendingPostseason: state.pendingPostseason, pendingEvents: state.pendingEvents,
        });
        localStorage.setItem(SAVE_KEY, retry);
        console.warn(`[save] quota 응급 슬림화 후 재저장 OK — ${(retry.length / 1024).toFixed(0)} KB`);
        return true;
      } catch (e2) {
        console.error("save retry also failed", e2);
        return false;
      }
    }
    return false;
  }
}

// 옛 세이브 구조 → 현재 구조로 변환. saveVersion 누락(또는 옛 data.version) 인 데이터를 SAVE_VERSION 으로 끌어올린다.
function migrateSave(data) {
  // 옛 키(`version`) 흡수 — 사용자가 v0.3 이전 세이브에서 이어할 때.
  if (data.saveVersion === undefined && data.version !== undefined) {
    data.saveVersion = data.version;
    delete data.version;
  }
  if (data.saveVersion === SAVE_VERSION) return data;

  // gameDate.year: 옛 형식은 1,2,3… 같은 학년 카운터. 현재는 실제 연도(2027~)
  if (data.gameDate && typeof data.gameDate.year === "number" && data.gameDate.year < 100) {
    data.gameDate.year = 2027 + (data.gameDate.year - 1);
  }
  // gameDate.month: 옛 시즌은 1월 시작. 시즌 진행 중이라면 그대로, 새 시즌부터 3월 시작 (transitionAfterSeason)
  // 미진행 신규는 createGameDate 가 3월로 만듦.

  // offseason: 옛 구조 { selected, outcomeKind, eventKey, changes } → 새 구조 { selectedCategory, ... }
  if (data.offseason && data.offseason.selectedCategory === undefined && data.offseason.selected !== undefined) {
    data.offseason = null; // 호환 안 되는 옛 휴식기 진행은 reset
  }

  // injury: 옛 구조엔 { type: "근육통" } 같이 type 만. 새 구조는 severity 사용
  if (data.player?.injury && !data.player.injury.severity) {
    data.player.injury.severity = "minor";
  }
  // injury: 옛 구조엔 bodyPart 없음. 옛 부상은 표시 시 detected 로 폴백되니 그대로 둬도 됨.

  // NPC injury / gamesSinceLastPitch 호환 — 옛 NPC entity 에는 없었음.
  for (const team of data.league?.teams ?? []) {
    for (const np of team.roster ?? []) {
      if (np.injury === undefined) np.injury = null;
      if (np.role === "pitcher" && np.gamesSinceLastPitch === undefined) {
        np.gamesSinceLastPitch = 99;
      }
    }
  }

  data.saveVersion = SAVE_VERSION;
  return data;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = migrateSave(JSON.parse(raw));
    Object.assign(state, data);
    // 이어하기/새로고침으로 들어올 때는 항상 일시정지 — 사용자가 ▶ 누를 때까지 대기
    state.paused = true;
    return true;
  } catch (e) {
    console.error("load failed", e);
    return false;
  }
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

// 로컬 세이브의 lastSaved 만 빠르게 조회 (전체 파싱 회피).
// 충돌 비교 모달이 클라우드 timestamp 와 비교하는 용도.
export function getLocalSavedAt() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return typeof data.lastSaved === "number" ? data.lastSaved : null;
  } catch (_) {
    return null;
  }
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function resetState() {
  state.player = null;
  state.league = null;
  state.season = null;
  state.career = null;
  state.log = [];
  state.view = "menu";
  state.autoMode = null;
  state.paused = true;
  state.tickSpeed = 500;
  state.gameDate = null;
  state.offseason = null;
  state.pendingFinal = null;
  state.pendingPostseason = null;
  state.pendingToasts = [];
  state.pendingEvents = [];
  // locale 은 게임 리셋과 무관하게 사용자 선택을 유지
}

// 전체 데이터 초기화 — 세이브/회귀/설정 등 ninthinning.* localStorage 키를 모두 제거.
// locale (ninthinning.locale.v1) 은 UI 선호이므로 keepLocale 옵션으로 보존 (기본 true).
// 클라우드(Firestore) 문서 삭제는 별도(cloudSave.deleteFromCloud) — 호출 측에서 처리.
const LOCALE_KEY = "ninthinning.locale.v1";
export function resetAllData({ keepLocale = true } = {}) {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("ninthinning.")) continue;
    if (keepLocale && k === LOCALE_KEY) continue;
    toRemove.push(k);
  }
  for (const k of toRemove) localStorage.removeItem(k);
  resetState();
  // 별도 키로 영속화되는 메타도 메모리에서 비워 다음 로드가 기본값을 다시 만들게 함.
  state.regression = null;
  state.settings = null;
}
