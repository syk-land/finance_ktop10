// Firebase 초기화 — modular SDK CDN (트리쉐이킹된 ESM).
//
// 사용 흐름:
//   1) main.js init() 에서 initFirebase() 호출
//   2) firebaseConfig.apiKey 가 비어있으면 false 반환 (cloud save 비활성)
//   3) ready 면 auth/db getter 로 다른 모듈이 사용
//
// config 가 없어도 SDK CDN 자체는 import 됨 (~30 KB gzipped). 사용자가
// Firebase Console 설정 후 firebaseConfig.js 만 채우면 즉시 활성.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

let app  = null;
let auth = null;
let db   = null;

export function initFirebase() {
  if (!firebaseConfig?.apiKey) {
    console.info("[cloud] firebaseConfig 비어있음 — cloud save 비활성 (localStorage 만 사용)");
    return false;
  }
  try {
    app  = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
    console.info("[cloud] Firebase 초기화 OK");
    return true;
  } catch (e) {
    console.error("[cloud] Firebase 초기화 실패", e);
    return false;
  }
}

export function getFirebaseAuth() { return auth; }
export function getFirebaseDb()   { return db; }
export function isFirebaseReady() { return !!app; }
