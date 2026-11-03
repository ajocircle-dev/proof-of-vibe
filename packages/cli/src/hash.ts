import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { keccak256, toBytes, stringToBytes } from "viem";

/** keccak256 of a UTF-8 string (e.g. session id). Never posts the raw value. */
export function hashSession(sessionId: string): `0x${string}` {
  return keccak256(stringToBytes(sessionId));
}

/** sha256 of a single file, returned as 0x-prefixed hex. */
export function sha256File(path: string): `0x${string}` {
  const h = createHash("sha256");
  h.update(readFileSync(path));
  return (`0x${h.digest("hex")}`) as `0x${string}`;
}

/**
 * Deterministic sha256 over a directory tree (sorted paths + contents).
 * Skips node_modules, .git, dist, out, .next.
 */
export function hashArtifactDir(dir: string): `0x${string}` {
  const skip = new Set([
    "node_modules",
    ".git",
    "dist",
    "out",
    ".next",
    ".secrets",
  ]);
  const files: string[] = [];
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      if (skip.has(name)) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) files.push(p);
    }
  }
  walk(dir);
  files.sort();
  const h = createHash("sha256");
  for (const f of files) {
    const rel = relative(dir, f).replace(/\\/g, "/");
    h.update(rel);
    h.update("\0");
    h.update(readFileSync(f));
    h.update("\0");
  }
  return (`0x${h.digest("hex")}`) as `0x${string}`;
}

export function zeroBytes32(): `0x${string}` {
  return (`0x${"0".repeat(64)}`) as `0x${string}`;
}

export { toBytes, keccak256 };
