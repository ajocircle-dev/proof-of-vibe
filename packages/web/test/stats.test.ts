import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeLiveStats,
  filterByRepo,
  streakDays,
  type TimelineItem,
} from "../src/lib/eas-query.ts";

function item(
  repo: string,
  time: number,
  commit = "aa",
): TimelineItem {
  return {
    uid: `0x${time}`,
    time,
    attester: "0x1",
    txid: "0x2",
    decoded: { repo, commitSha: commit },
  };
}

describe("computeLiveStats", () => {
  it("counts unique repos and dogfood", () => {
    const items = [
      item("ajocircle-dev/proof-of-vibe", 100),
      item("ajocircle-dev/proof-of-vibe", 200),
      item("other/repo", 150),
    ];
    const s = computeLiveStats(items);
    assert.equal(s.totalAttestations, 3);
    assert.equal(s.uniqueRepos, 2);
    assert.equal(s.dogfoodAttestations, 2);
  });
});

describe("streakDays", () => {
  it("counts consecutive UTC days from latest", () => {
    const day = 86400;
    const base = Date.UTC(2026, 10, 3) / 1000;
    const items = [
      item("r", base),
      item("r", base - day),
      item("r", base - 2 * day),
      item("r", base - 5 * day),
    ];
    assert.equal(streakDays(items), 3);
  });
});

describe("filterByRepo", () => {
  it("filters", () => {
    const items = [item("a/b", 1), item("c/d", 2)];
    assert.equal(filterByRepo(items, "a/b").length, 1);
  });
});
