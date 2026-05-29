// Firestore cloud save — 사용자 트리거 명시적 저장/불러오기.
//
// 모델:
//   - 단일 doc: saves/{uid}
//   - payload: localStorage SAVE_KEY 의 직렬화 내용을 그대로 저장 (단순)
//   - clientLastSaved: 충돌 비교용 (로컬 timestamp)
//   - serverLastSaved: serverTimestamp() — 서버 시각 (참고용, 신뢰 기준)
//
// 비용:
//   - 사용자가 ☁️ 저장 버튼 누를 때만 1 write
//   - 사용자가 ☁️ 불러오기 버튼 누를 때만 1 read
//   - hasCloudSave 체크가 필요하면 read 1회 추가 — UI 가 load 시도 직전에 한 번만.

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state } from "../state.js";
import { getFirebaseDb, isFirebaseReady } from "./firebase.js";
import { currentUid, isSignedIn } from "./auth.js";

const LOCAL_SAVE_KEY = "ninthinning.save.v1";

// Firestore 는 array 안에 array 가 직접 들어가는 nested array 를 거부함.
// league.schedule = [[game,game,...], [game,...]] (주차별 게임 배열) 가 대표적.
// 저장 전 schedule 의 각 week 를 { games: [...] } 객체로 감싸 nested-array 회피.
// _scheduleObj 마커 플래그로 round-trip 시 복원.
function sanitizeForCloud(payload) {
  const copy = JSON.parse(JSON.stringify(payload));
  if (copy.league && Array.isArray(copy.league.schedule)) {
    copy.league.schedule = copy.league.schedule.map(week => ({ games: Array.isArray(week) ? week : [] }));
    copy.league._scheduleObj = true;
  }
  return copy;
}

function restoreFromCloud(payload) {
  if (payload?.league?._scheduleObj && Array.isArray(payload.league.schedule)) {
    payload.league.schedule = payload.league.schedule.map(w => Array.isArray(w?.games) ? w.games : []);
    delete payload.league._scheduleObj;
  }
  return payload;
}

function saveDocRef() {
  const db = getFirebaseDb();
  const uid = currentUid();
  if (!db || !uid) return null;
  return doc(db, "saves", uid);
}

// ☁️ 저장 — 현재 localStorage payload 를 그대로 Firestore 에 write.
// 호출 전 saveGame() 로 최신 상태가 localStorage 에 반영되어 있어야 함.
// 반환: { ok: true } | { ok: false, reason: string }
export async function saveToCloud() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  if (!isSignedIn())      return { ok: false, reason: "not_signed_in" };
  const ref = saveDocRef();
  if (!ref) return { ok: false, reason: "no_ref" };

  const raw = localStorage.getItem(LOCAL_SAVE_KEY);
  if (!raw) return { ok: false, reason: "no_local_save" };

  try {
    const payload = sanitizeForCloud(JSON.parse(raw));
    await setDoc(ref, {
      payload,
      clientLastSaved: Date.now(),
      serverLastSaved: serverTimestamp(),
      version: payload.saveVersion ?? 2,
    });
    return { ok: true };
  } catch (e) {
    console.error("[cloud] saveToCloud 실패", e);
    return { ok: false, reason: "write_failed", error: e.message };
  }
}

// ☁️ 불러오기 — Firestore 에서 read → localStorage 에 덮어쓰기.
// 호출 후 loadGame() 또는 페이지 새로고침으로 state 에 반영.
// 반환: { ok: true, clientLastSaved } | { ok: false, reason: string }
export async function loadFromCloud() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  if (!isSignedIn())      return { ok: false, reason: "not_signed_in" };
  const ref = saveDocRef();
  if (!ref) return { ok: false, reason: "no_ref" };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ok: false, reason: "not_found" };
    const data = snap.data();
    if (!data?.payload) return { ok: false, reason: "invalid_doc" };
    const restored = restoreFromCloud(data.payload);
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(restored));
    return { ok: true, clientLastSaved: data.clientLastSaved ?? null };
  } catch (e) {
    console.error("[cloud] loadFromCloud 실패", e);
    return { ok: false, reason: "read_failed", error: e.message };
  }
}

// 클라우드 세이브 메타데이터만 (payload 불필요) — 충돌 비교용.
// 반환: { exists, clientLastSaved } | null (에러).
// 1 read. 호출 빈도: 메뉴 진입 시 1회.
export async function getCloudSaveMeta() {
  if (!isFirebaseReady() || !isSignedIn()) return null;
  const ref = saveDocRef();
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return { exists: false, clientLastSaved: null };
    const data = snap.data();
    return {
      exists: true,
      clientLastSaved: data?.clientLastSaved ?? null,
    };
  } catch (e) {
    console.error("[cloud] getCloudSaveMeta 실패", e);
    return null;
  }
}

// ☁️ 삭제 — Firestore 의 saves/{uid} 문서 제거 (전체 데이터 초기화용).
// 되돌릴 수 없음. 미로그인/firebase 미준비/문서 없음은 모두 graceful 처리.
// 반환: { ok: true } | { ok: false, reason: string }
export async function deleteFromCloud() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  if (!isSignedIn())      return { ok: false, reason: "not_signed_in" };
  const ref = saveDocRef();
  if (!ref) return { ok: false, reason: "no_ref" };
  try {
    await deleteDoc(ref);
    return { ok: true };
  } catch (e) {
    console.error("[cloud] deleteFromCloud 실패", e);
    return { ok: false, reason: "delete_failed", error: e.message };
  }
}

// 존재 여부만 — 옛 API 호환용.
export async function hasCloudSave() {
  const m = await getCloudSaveMeta();
  return !!m?.exists;
}
