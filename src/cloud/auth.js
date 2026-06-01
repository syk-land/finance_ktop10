// Firebase Auth — 익명 자동 로그인 + redirect 방식 Google 로그인.
//
// 전략:
//   - 앱 첫 진입 시 anon 로그인 자동 (uid 생성, 기기 종속).
//   - state.cloudUser = { uid, isAnonymous, displayName?, email? } 에 attach.
//   - onAuthStateChanged 리스너로 로그아웃/로그인 변화 추적.
//   - Google 연동은 redirect 방식 (popup 대신) — COOP 차단/팝업 차단 회피.
//     linkWithRedirect/signInWithRedirect → 페이지 전체 리로드 → getRedirectResult 로 복귀 후 결과 처리.

import {
  signInAnonymously, onAuthStateChanged, signOut as fbSignOut,
  GoogleAuthProvider, signInWithPopup, linkWithPopup,
  signInWithRedirect, linkWithRedirect, getRedirectResult,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { state } from "../state.js";
import { getFirebaseAuth, isFirebaseReady } from "./firebase.js";

// 리다이렉트 진행 의도 — sessionStorage 에 마킹.
// "link" 시도가 credential-already-in-use 로 실패하면 자동으로 signInWithRedirect 로 fallback.
const REDIRECT_INTENT_KEY = "ninthinning.authRedirectIntent";

export function initAuth() {
  if (!isFirebaseReady()) return;
  const auth = getFirebaseAuth();

  // 리다이렉트 복귀 처리 — 페이지 진입 시 한 번만.
  getRedirectResult(auth)
    .then(result => {
      if (result?.user) {
        sessionStorage.removeItem(REDIRECT_INTENT_KEY);
      }
    })
    .catch(e => {
      const intent = sessionStorage.getItem(REDIRECT_INTENT_KEY);
      // link 시도가 이미 다른 익명 uid 에 연결된 Google 계정으로 실패 → signInWithRedirect 로 자동 폴백.
      if (intent === "link" && (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use")) {
        sessionStorage.setItem(REDIRECT_INTENT_KEY, "signin");
        signInWithRedirect(auth, new GoogleAuthProvider()).catch(err => {
          console.error("[cloud] redirect signin fallback 실패", err);
          sessionStorage.removeItem(REDIRECT_INTENT_KEY);
        });
        return;
      }
      sessionStorage.removeItem(REDIRECT_INTENT_KEY);
      // user closed popup 등은 무해. 그 외만 로그.
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
        console.error("[cloud] getRedirectResult", e);
      }
    });

  onAuthStateChanged(auth, user => {
    if (user) {
      state.cloudUser = {
        uid:          user.uid,
        isAnonymous:  user.isAnonymous,
        displayName:  user.displayName ?? null,
        email:        user.email ?? null,
      };
    } else {
      state.cloudUser = null;
      // 자동 익명 로그인 — 사용자 의식 없이 cloud 사용 가능.
      signInAnonymously(auth).catch(e => {
        console.error("[cloud] 익명 로그인 실패", e);
      });
    }
  });
}

export function isSignedIn() {
  return !!state.cloudUser?.uid;
}

export function currentUid() {
  return state.cloudUser?.uid ?? null;
}

export function isAnonymousUser() {
  return !!state.cloudUser?.isAnonymous;
}

// 팝업 차단/환경 미지원 — redirect 폴백 대상.
function isPopupBlocked(e) {
  return e?.code === "auth/popup-blocked"
    || e?.code === "auth/operation-not-supported-in-environment"
    || e?.code === "auth/web-storage-unsupported";
}
// 사용자가 팝업을 닫음/중복 요청 — 에러 아님(조용히 무시).
function isUserCancel(e) {
  return e?.code === "auth/popup-closed-by-user"
    || e?.code === "auth/cancelled-popup-request"
    || e?.code === "auth/user-cancelled";
}

// 익명 → Google 계정 연동.
// 1차: popup 방식 (linkWithPopup) — 즉시 결과 반환. 서드파티 쿠키 차단 환경에서도
//      redirect 와 달리 로그인 상태 유실이 없다 (redirect 가 "갔다 와도 로그인 안 됨"의 원인).
// 폴백: 팝업 차단 시에만 linkWithRedirect 로 전환.
// 그 Google 계정이 이미 다른 익명 uid 에 연결돼 있으면 그 계정으로 signInWithPopup (익명 데이터 포기).
export async function linkAnonToGoogle() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "no_user" };

  const provider = new GoogleAuthProvider();
  if (!user.isAnonymous) {
    return { ok: true, user, alreadyLinked: true };
  }

  try {
    const result = await linkWithPopup(user, provider);
    return { ok: true, user: result.user, linked: true };
  } catch (e) {
    // 이미 다른 익명 uid 에 연결된 Google 계정 → 그 계정으로 로그인 (익명 데이터 포기).
    if (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use") {
      try {
        const r2 = await signInWithPopup(auth, provider);
        return { ok: true, user: r2.user, linked: true, switched: true };
      } catch (e2) {
        if (isPopupBlocked(e2)) return linkRedirectFallback(auth, user, provider);
        if (isUserCancel(e2)) return { ok: false, reason: "cancelled" };
        console.error("[cloud] signInWithPopup 폴백 실패", e2);
        return { ok: false, reason: "link_failed", code: e2.code, error: e2.message };
      }
    }
    if (isPopupBlocked(e)) return linkRedirectFallback(auth, user, provider);
    if (isUserCancel(e)) return { ok: false, reason: "cancelled" };
    console.error("[cloud] linkAnonToGoogle 실패", e);
    return { ok: false, reason: "link_failed", code: e.code, error: e.message };
  }
}

// 팝업이 막힌 환경에서만 쓰는 redirect 폴백. 결과는 initAuth 의 getRedirectResult 에서 처리.
async function linkRedirectFallback(auth, user, provider) {
  try {
    sessionStorage.setItem(REDIRECT_INTENT_KEY, "link");
    await linkWithRedirect(user, provider);
    return { ok: true, redirecting: true };
  } catch (e) {
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    console.error("[cloud] linkWithRedirect 폴백 실패", e);
    return { ok: false, reason: "link_failed", code: e.code, error: e.message };
  }
}

// Google 로그인 (link 실패 또는 다른 계정 진입). popup 우선, 차단 시 redirect 폴백.
// 익명 데이터는 잃음.
export async function signInWithGoogle() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  try {
    const r = await signInWithPopup(auth, provider);
    return { ok: true, user: r.user };
  } catch (e) {
    if (isPopupBlocked(e)) {
      try {
        sessionStorage.setItem(REDIRECT_INTENT_KEY, "signin");
        await signInWithRedirect(auth, provider);
        return { ok: true, redirecting: true };
      } catch (e2) {
        sessionStorage.removeItem(REDIRECT_INTENT_KEY);
        console.error("[cloud] signInWithRedirect 폴백 실패", e2);
        return { ok: false, reason: "signin_failed", code: e2.code, error: e2.message };
      }
    }
    if (isUserCancel(e)) return { ok: false, reason: "cancelled" };
    console.error("[cloud] signInWithGoogle 실패", e);
    return { ok: false, reason: "signin_failed", code: e.code, error: e.message };
  }
}

// 로그아웃 후 자동으로 익명 재로그인 (onAuthStateChanged 가 처리).
export async function signOutCloud() {
  if (!isFirebaseReady()) return false;
  const auth = getFirebaseAuth();
  try {
    await fbSignOut(auth);
    return true;
  } catch (e) {
    console.error("[cloud] signOut 실패", e);
    return false;
  }
}
