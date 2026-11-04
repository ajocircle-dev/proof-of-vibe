import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attestedSince,
  computeTrancheWindow,
  defaultStartMs,
  formatDuration,
  parseStartDate,
} from "../src/lib/tranche.ts";
import { xIntentUrl } from "../src/lib/share.ts";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const start = Date.parse("2026-10-01T00:00:00Z");

describe("tranche window", () => {
  it("is building before the 72h challenge window", () => {
    const w = computeTrancheWindow(start, start + 10 * DAY);
    assert.equal(w.phase, "building");
    assert.equal(w.nextTrancheMs, start + 30 * DAY);
    assert.equal(w.challengeOpensMs, start + 30 * DAY - 72 * HOUR);
    assert.equal(w.msToBoundary, 17 * DAY);
  });
  it("enters challenge exactly at 72h before tranche", () => {
    const w = computeTrancheWindow(start, start + 27 * DAY);
    assert.equal(w.phase, "challenge");
    assert.equal(w.msToBoundary, 72 * HOUR);
  });
  it("is due at and after the tranche time", () => {
    const w = computeTrancheWindow(start, start + 30 * DAY);
    assert.equal(w.phase, "due");
    assert.equal(w.msToBoundary, 0);
    assert.equal(w.progress, 1);
  });
  it("clamps progress before start", () => {
    assert.equal(computeTrancheWindow(start, start - DAY).progress, 0);
  });
  it("respects custom durations", () => {
    const w = computeTrancheWindow(start, start + 5 * DAY, 7, 24);
    assert.equal(w.phase, "building");
    assert.equal(w.challengeOpensMs, start + 6 * DAY);
  });
});

describe("tranche helpers", () => {
  it("parses YYYY-MM-DD and rejects junk", () => {
    assert.equal(parseStartDate("2026-10-01"), start);
    assert.equal(parseStartDate("10/01/2026"), null);
    assert.equal(parseStartDate(""), null);
    assert.equal(parseStartDate(null), null);
  });
  it("default start is N days back at UTC midnight", () => {
    const now = Date.parse("2026-11-04T15:30:00Z");
    assert.equal(defaultStartMs(now, 30), Date.parse("2026-10-05T00:00:00Z"));
    assert.equal(defaultStartMs(now), Date.parse("2026-10-07T00:00:00Z"));
  });
  it("filters attestations since start, newest first", () => {
    const s = start / 1000;
    const items = [s - 10, s, s + 100, s + 50].map((t) => ({
      uid: `0x${t}`, time: t, attester: "0x1", txid: "0x2", decoded: {},
    }));
    const out = attestedSince(items, start);
    assert.deepEqual(out.map((i) => i.time), [s + 100, s + 50, s]);
  });
  it("formats durations", () => {
    assert.equal(formatDuration(0), "0h");
    assert.equal(formatDuration(2 * DAY + 3 * HOUR), "2d 3h");
    assert.equal(formatDuration(5 * HOUR + 7 * 60_000), "5h 7m");
  });
  it("builds an encoded X intent url", () => {
    const u = xIntentUrl("a b&c\nhttps://x.y/?repo=o/n");
    assert.ok(u.startsWith("https://x.com/intent/post?text="));
    assert.ok(!u.slice(31).includes(" "));
    assert.ok(u.includes("%26"));
  });
});

import { formatAgentGroup, groupAgents } from "../src/lib/tranche.ts";
describe("groupAgents", () => {
  it("dedupes by agentId and lists tools", () => {
    const mk = (agentId: string, agentTool: string) => ({ uid: "0x", time: 1, attester: "0x1", txid: "0x2", decoded: { agentId, agentTool } });
    const g = groupAgents([mk("10554", "Codex"), mk("10554", "Playwright"), mk("10554", "Codex"), mk("7", "Cursor")]);
    assert.equal(g.length, 2);
    assert.deepEqual(g[0], { agentId: "10554", tools: ["Codex", "Playwright"], count: 3 });
    assert.equal(formatAgentGroup(g[0]!, "bosso-codex"), "#10554 bosso-codex (Codex, Playwright)");
    assert.equal(formatAgentGroup(g[1]!), "#7 (Cursor)");
  });
});
