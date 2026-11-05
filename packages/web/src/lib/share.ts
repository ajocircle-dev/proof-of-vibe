import { APP_URL } from "./constants";
import { normalizeRepo } from "./decode";

export function xIntentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

/** iOS / universal Twitter app scheme. Opens the X app when installed. */
export function xAppUrl(text: string): string {
  return `twitter://post?message=${encodeURIComponent(text)}`;
}

/**
 * Android Intent URL: opens com.twitter.android when installed,
 * otherwise falls back to the https intent page.
 */
export function xAndroidIntentUrl(text: string): string {
  const web = xIntentUrl(text);
  const path = `x.com/intent/post?text=${encodeURIComponent(text)}`;
  return `intent://${path}#Intent;scheme=https;package=com.twitter.android;S.browser_fallback_url=${encodeURIComponent(web)};end`;
}

export function isMobileUa(ua: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

export function isAndroidUa(ua: string): boolean {
  return /Android/i.test(ua);
}

export function verifyLink(repo: string): string {
  return `${APP_URL}/?repo=${encodeURIComponent(normalizeRepo(repo))}`;
}

export function badgeLink(repo: string): string {
  return `${APP_URL}/badge?repo=${encodeURIComponent(normalizeRepo(repo))}`;
}

export function trancheLink(repo: string): string {
  return `${APP_URL}/tranche/?repo=${encodeURIComponent(normalizeRepo(repo))}`;
}

export function shareText(repo: string, kind: "landing" | "verify" | "tranche"): string {
  const r = normalizeRepo(repo);
  if (kind === "tranche") {
    return `Tranche evidence for ${r}: every commit since the last tranche, attested on Base with EAS.\nVerify: ${trancheLink(r)}\nBadge: ${badgeLink(r)}\n#Vibeathon @vibestarterxyz`;
  }
  if (kind === "verify") {
    return `${r} is building in public on Base: per-commit EAS attestations linked to an ERC-8004 agent.\nVerify: ${verifyLink(r)}\nBadge: ${badgeLink(r)}\n#Vibeathon @vibestarterxyz`;
  }
  return `Vibestarter proves an agent built your app at launch. Proof of Vibe proves you kept building it, commit by commit, on Base.\nVerify: ${verifyLink(r)}\nBadge: ${badgeLink(r)}\n#Vibeathon @vibestarterxyz`;
}
