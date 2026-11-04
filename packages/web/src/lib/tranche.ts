/**
 * Tranche window logic for the Vibestarter concept integration mock.
 * Model: funds release in tranches every `trancheDays` days. Before each
 * tranche, holders get a `challengeHours` challenge window.
 */
import type { TimelineItem } from "./eas-query";

export const TRANCHE_DAYS = 30;
export const CHALLENGE_HOURS = 72;
export const DEFAULT_LOOKBACK_DAYS = Number(process.env.NEXT_PUBLIC_POV_TRANCHE_LOOKBACK_DAYS || 28);

export type TranchePhase = "building" | "challenge" | "due";

export type TrancheWindow = {
  startMs: number;
  nextTrancheMs: number;
  challengeOpensMs: number;
  phase: TranchePhase;
  /** ms until the next phase boundary (0 when due). */
  msToBoundary: number;
  /** 0..1 progress from start to next tranche. */
  progress: number;
};

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function computeTrancheWindow(
  startMs: number,
  nowMs: number,
  trancheDays = TRANCHE_DAYS,
  challengeHours = CHALLENGE_HOURS,
): TrancheWindow {
  const nextTrancheMs = startMs + trancheDays * DAY;
  const challengeOpensMs = nextTrancheMs - challengeHours * HOUR;
  let phase: TranchePhase;
  let msToBoundary: number;
  if (nowMs < challengeOpensMs) {
    phase = "building";
    msToBoundary = challengeOpensMs - nowMs;
  } else if (nowMs < nextTrancheMs) {
    phase = "challenge";
    msToBoundary = nextTrancheMs - nowMs;
  } else {
    phase = "due";
    msToBoundary = 0;
  }
  const span = nextTrancheMs - startMs;
  const progress = Math.min(1, Math.max(0, (nowMs - startMs) / span));
  return { startMs, nextTrancheMs, challengeOpensMs, phase, msToBoundary, progress };
}

export function defaultStartMs(nowMs: number, lookbackDays = DEFAULT_LOOKBACK_DAYS): number {
  const d = new Date(nowMs - lookbackDays * DAY);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Parse YYYY-MM-DD (UTC midnight). Returns null when invalid. */
export function parseStartDate(input: string | null | undefined): number | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const ms = Date.parse(`${input}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

export function toDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Attestations with time (seconds) at or after startMs, newest first. */
export function attestedSince(items: TimelineItem[], startMs: number): TimelineItem[] {
  return items
    .filter((it) => it.time * 1000 >= startMs)
    .sort((a, b) => b.time - a.time);
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0h";
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export type AgentGroup = { agentId: string; tools: string[]; count: number };

/** Group attestations by agentId, listing distinct tools in first-seen order. */
export function groupAgents(items: TimelineItem[]): AgentGroup[] {
  const map = new Map<string, AgentGroup>();
  for (const it of items) {
    const id = String(it.decoded.agentId ?? "0");
    const tool = String(it.decoded.agentTool || "unknown");
    let g = map.get(id);
    if (!g) { g = { agentId: id, tools: [], count: 0 }; map.set(id, g); }
    g.count++;
    if (!g.tools.includes(tool)) g.tools.push(tool);
  }
  return [...map.values()];
}

export function formatAgentGroup(g: AgentGroup, name?: string): string {
  return `#${g.agentId}${name ? ` ${name}` : ""} (${g.tools.join(", ")})`;
}
