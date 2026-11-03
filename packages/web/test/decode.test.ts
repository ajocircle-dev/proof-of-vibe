import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bytes32ToGitSha,
  normalizeRepo,
  sha1ToBytes32,
  unwrapDecoded,
} from "../src/lib/decode.ts";

describe("normalizeRepo", () => {
  it("parses github URLs", () => {
    assert.equal(
      normalizeRepo("https://github.com/ajocircle-dev/proof-of-vibe.git"),
      "ajocircle-dev/proof-of-vibe",
    );
  });
});

describe("sha packing", () => {
  it("round-trips", () => {
    const sha = "40acea7f926c6d872c465defdf969acf20091586";
    assert.equal(bytes32ToGitSha(sha1ToBytes32(sha)), sha);
  });
});

describe("unwrapDecoded", () => {
  it("unwraps easscan BigNumber", () => {
    assert.equal(
      unwrapDecoded({ type: "BigNumber", hex: "0x293a" }),
      "10554",
    );
  });
});
