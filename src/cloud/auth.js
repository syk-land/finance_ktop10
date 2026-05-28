// Firebase Auth — 익명 자동 로그인.
//
// 전략:
//   - 앱 첫 진입 시 anon 로그인 자동 (uid 생성, 기기 종속).
//   - state.cloudUser = { uid, isAnonymous, displayName?, email? } 에 attach.
//   - onAuthStateChanged 리스너로 로그아웃/로그인 변화 추적.
//   - Phase D 에서 Google linking 추가 시 같은 uid 유지하면서 영구 계정으로 업그레이드.

import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { state } from "../state.js";
import { getFirebaseAuth, isFirebaseReady } from "./firebase.js";

export function initAuth() {
  if (!isFirebaseReady()) return;
  const auth = getFirebaseAuth();

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
