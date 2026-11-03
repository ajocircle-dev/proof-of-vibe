import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { badgeSvg, markdownBadge } from "../src/lib/badge-svg.ts";

describe("badgeSvg", () => {
  it("embeds the count", () => {
    const svg = badgeSvg({ count: 5 });
    assert.match(svg, /5 attested commits/);
    assert.match(svg, /Proof of Vibe/);
  });
});

describe("markdownBadge", () => {
  it("points at live badge and verify", () => {
    const md = markdownBadge(
      "ajocircle-dev/proof-of-vibe",
      "https://proof-of-vibe.pages.dev",
    );
    assert.match(md, /badge\?repo=/);
    assert.match(md, /\?repo=/);
  });
});
