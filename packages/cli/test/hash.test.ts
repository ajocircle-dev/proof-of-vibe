import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  hashSession,
  hashArtifactDir,
  sha256File,
  zeroBytes32,
} from "../src/hash.js";
import { sha1ToBytes32 } from "../src/git.js";
import { encodeSchemaData } from "../src/eas.js";
import { SCHEMA } from "../src/constants.js";

describe("sha1ToBytes32", () => {
  it("left-aligns a 40-char SHA-1", () => {
    const sha = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    const b = sha1ToBytes32(sha);
    assert.equal(b.length, 66);
    assert.equal(b, ("0x" + sha + "0".repeat(24)) as `0x${string}`);
  });
  it("rejects short input", () => {
    assert.throws(() => sha1ToBytes32("abc"));
  });
});

describe("hashSession", () => {
  it("is deterministic keccak256", () => {
    const a = hashSession("session-1");
    const b = hashSession("session-1");
    const c = hashSession("session-2");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 66);
  });
});

describe("artifact hashing", () => {
  it("hashes a file and a directory", () => {
    const dir = join(tmpdir(), `pov-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, "a.txt");
    writeFileSync(f, "hello vibe");
    const fileHash = sha256File(f);
    const dirHash = hashArtifactDir(dir);
    assert.equal(fileHash.length, 66);
    assert.equal(dirHash.length, 66);
    assert.equal(zeroBytes32(), ("0x" + "0".repeat(64)) as `0x${string}`);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("schema encode", () => {
  it("encodes ProofOfVibe v1 fields", () => {
    const data = encodeSchemaData({
      repo: "ajocircle-dev/proof-of-vibe",
      commitSha: sha1ToBytes32("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      treeSha: sha1ToBytes32("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
      appUrl: "https://proof-of-vibe.pages.dev",
      agentRegistry: "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
      agentId: 1n,
      agentTool: "Codex",
      sessionHash: hashSession("demo"),
      artifactHash: zeroBytes32(),
      committedAt: 1730000000n,
      builderName: "bosso",
    });
    assert.ok(data.startsWith("0x"));
    assert.ok(data.length > 10);
    assert.ok(SCHEMA.includes("builderName"));
  });
});
