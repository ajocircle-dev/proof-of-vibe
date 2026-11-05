"use client";

import {
  isAndroidUa,
  isMobileUa,
  xAndroidIntentUrl,
  xAppUrl,
  xIntentUrl,
} from "../lib/share";

export function ShareOnX({ text, label = "Share on X" }: { text: string; label?: string }) {
  const webUrl = xIntentUrl(text);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (!isMobileUa(ua)) return;

    e.preventDefault();
    const started = Date.now();
    // Android Intent opens the X app or falls back itself. iOS uses twitter:// then https.
    if (isAndroidUa(ua)) {
      window.location.href = xAndroidIntentUrl(text);
      return;
    }
    window.location.href = xAppUrl(text);
    window.setTimeout(() => {
      if (document.visibilityState === "visible" && Date.now() - started < 2000) {
        window.location.href = webUrl;
      }
    }, 600);
  }

  return (
    <a className="btn-x" href={webUrl} target="_blank" rel="noreferrer" onClick={onClick}>
      {label}
    </a>
  );
}
