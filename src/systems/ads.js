// 전면(인터스티셜) 광고 — 시작 / 3시즌마다 새 시즌 / 은퇴 시점에 노출.
//
// ⚠ 설정: 아래 AD_CLIENT 를 본인 Google AdSense 퍼블리셔 ID(ca-pub-...)로,
//   AD_SLOT_INTERSTITIAL 을 발급받은 광고 단위 ID로 교체하세요.
//   index.html <head> 의 adsbygoogle 로더 script 의 client 값도 동일하게 교체.
//   placeholder 상태에선 광고가 표시되지 않습니다(콘솔 경고 정상) — 모달 자체는 정상 동작.
//
// 정책 주의: AdSense 디스플레이 광고를 모달에 띄우는 건 정책상 제약이 있을 수 있습니다.
//   실제 운영 시 AdSense '비네트(Vignette)' 광고나 게임용 보상형 광고 SDK 사용을 권장.
//   여기서는 트리거/노출 골격만 제공합니다.

import { t } from "../i18n/index.js";

const AD_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
const AD_SLOT_INTERSTITIAL = "0000000000";

// 시즌 광고 주기 — 매 N시즌(새 시즌 시작 시) 1회. 고교 3시즌 → 졸업 후 새 시즌에 첫 노출.
const SEASON_AD_INTERVAL = 3;

// 새 시즌 시작 시 호출 — 시즌 수가 주기 배수면 광고. seasonCount = 진행한 시즌 수(careerHistory.length).
export function maybeShowSeasonAd(seasonCount, onClose) {
  if (seasonCount > 0 && seasonCount % SEASON_AD_INTERVAL === 0) {
    showInterstitialAd(onClose);
    return true;
  }
  onClose?.();
  return false;
}

// 전면 광고 모달 — AdSense 광고 + "계속" 버튼. 닫으면 onClose.
export function showInterstitialAd(onClose) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.dataset.modal = "ad";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.cssText = "position:relative; max-width:360px; text-align:center;";

  const label = document.createElement("div");
  label.className = "muted small";
  label.style.cssText = "font-size:10px; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:8px;";
  label.textContent = t("ads.label");
  dialog.appendChild(label);

  // AdSense 광고 단위
  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.cssText = "display:block; width:100%; min-height:250px; background:var(--panel-2); border-radius:6px;";
  ad.setAttribute("data-ad-client", AD_CLIENT);
  ad.setAttribute("data-ad-slot", AD_SLOT_INTERSTITIAL);
  ad.setAttribute("data-ad-format", "auto");
  ad.setAttribute("data-full-width-responsive", "true");
  dialog.appendChild(ad);

  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    onClose?.();
  };

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.type = "button";
  btn.style.cssText = "width:100%; padding:12px; font-weight:700; margin-top:12px;";
  btn.textContent = t("ads.continueBtn");
  btn.addEventListener("pointerdown", e => { e.preventDefault(); finish(); });
  dialog.appendChild(btn);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  // ※ 광고는 전이(시즌 진행/은퇴 등)가 끝난 뒤 비-게이팅 오버레이로 띄운다.
  //   ×/뒤로가기로 닫혀도(onClose 미호출) 게임 흐름은 이미 진행됐으므로 멈추지 않는다.

  // 광고 요청 (placeholder ID 면 미표시)
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
}
