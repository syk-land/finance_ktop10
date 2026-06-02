// Firebase Auth — 익명 자동 로그인 + redirect 방식 Google 로그인.
//
// 전략:
//   - 앱 첫 진입 시 anon 로그인 자동 (uid 생성, 기기 종속).
//   - state.cloudUser = { uid, isAnonymous, displayName?, email? } 에 attach.
//   - onAuthStateChanged 리스너로 로그아웃/로그인 변화 추적.
//   - Google 연동: 모바일은 redirect 우선(팝업 불안정·차단·COOP 회피), 데스크톱은 popup 우선
//     (리로드 없이 즉시 결과). authDomain 이 서빙 도메인과 일치(first-party)해 redirect 결과 유실 없음.
//     redirect 경로: linkWithRedirect/signInWithRedirect → 페이지 리로드 → getRedirectResult 로 복귀 후 처리.

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

// onAuthChange: 인증 상태(state.cloudUser)가 갱신될 때마다 호출되는 콜백.
//   첫 진입 시 익명 로그인은 네트워크 왕복이라 메뉴 최초 렌더보다 늦게 끝난다.
//   콜백으로 현재 뷰를 다시 그려야 로그인 카드가 새로고침 없이 바로 뜬다.
export function initAuth(onAuthChange) {
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
    onAuthChange?.(state.cloudUser);
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
// 모바일(안드로이드/iOS) — 팝업이 막히거나 깨지기 쉬워 redirect 를 우선한다.
// 데스크톱은 popup 이 리로드 없이 즉시 결과를 주므로 그대로 유지.
function prefersRedirect() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

// 익명 → Google 계정 연동.
// 모바일: redirect 우선 (linkWithRedirect) — 팝업 불안정 회피. 결과는 getRedirectResult 에서 처리.
// 데스크톱: popup 방식 (linkWithPopup) — 즉시 결과 반환, 리로드 없음. 팝업 차단 시 redirect 폴백.
// 그 Google 계정이 이미 다른 익명 uid 에 연결돼 있으면 그 계정으로 로그인 (익명 데이터 포기).
export async function linkAnonToGoogle() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "no_user" };

  const provider = new GoogleAuthProvider();
  if (!user.isAnonymous) {
    return { ok: true, user, alreadyLinked: true };
  }

  // 모바일: 팝업 불안정 → redirect 우선.
  if (prefersRedirect()) return linkViaRedirect(auth, user, provider);

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
        if (isPopupBlocked(e2)) return linkViaRedirect(auth, user, provider);
        if (isUserCancel(e2)) return { ok: false, reason: "cancelled" };
        console.error("[cloud] signInWithPopup 폴백 실패", e2);
        return { ok: false, reason: "link_failed", code: e2.code, error: e2.message };
      }
    }
    if (isPopupBlocked(e)) return linkViaRedirect(auth, user, provider);
    if (isUserCancel(e)) return { ok: false, reason: "cancelled" };
    console.error("[cloud] linkAnonToGoogle 실패", e);
    return { ok: false, reason: "link_failed", code: e.code, error: e.message };
  }
}

// redirect 로 연동 — 모바일 1차 경로이자 데스크톱 팝업 차단 시 폴백.
// 결과는 initAuth 의 getRedirectResult 에서 처리 (credential-already-in-use 면 signin 으로 자동 전환).
async function linkViaRedirect(auth, user, provider) {
  try {
    sessionStorage.setItem(REDIRECT_INTENT_KEY, "link");
    await linkWithRedirect(user, provider);
    return { ok: true, redirecting: true };
  } catch (e) {
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    console.error("[cloud] linkWithRedirect 실패", e);
    return { ok: false, reason: "link_failed", code: e.code, error: e.message };
  }
}

// redirect 로 로그인 — 모바일 1차 경로이자 데스크톱 팝업 차단 시 폴백. 익명 데이터는 잃음.
async function signInViaRedirect(auth, provider) {
  try {
    sessionStorage.setItem(REDIRECT_INTENT_KEY, "signin");
    await signInWithRedirect(auth, provider);
    return { ok: true, redirecting: true };
  } catch (e) {
    sessionStorage.removeItem(REDIRECT_INTENT_KEY);
    console.error("[cloud] signInWithRedirect 실패", e);
    return { ok: false, reason: "signin_failed", code: e.code, error: e.message };
  }
}

// Google 로그인 (link 실패 또는 다른 계정 진입). 모바일 redirect 우선, 데스크톱 popup 우선(차단 시 redirect).
// 익명 데이터는 잃음.
export async function signInWithGoogle() {
  if (!isFirebaseReady()) return { ok: false, reason: "firebase_not_ready" };
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  // 모바일: 팝업 불안정 → redirect 우선.
  if (prefersRedirect()) return signInViaRedirect(auth, provider);

  try {
    const r = await signInWithPopup(auth, provider);
    return { ok: true, user: r.user };
  } catch (e) {
    if (isPopupBlocked(e)) return signInViaRedirect(auth, provider);
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
