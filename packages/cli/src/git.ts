import { execFileSync } from "node:child_process";

function git(args: string[], cwd = process.cwd()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** 20-byte git SHA-1 as left-aligned bytes32 hex (64 hex chars + 0x). */
export function sha1ToBytes32(sha: string): `0x${string}` {
  const hex = sha.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error(`Expected 40-char git SHA-1, got: ${sha}`);
  }
  return (`0x${hex}${"0".repeat(24)}`) as `0x${string}`;
}

/** Inverse of sha1ToBytes32: recover the 40-char git SHA-1. */
export function bytes32ToGitSha(value: string): string {
  const hex = value.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{40}/.test(hex)) {
    throw new Error(`Expected left-aligned git SHA in bytes32, got: ${value}`);
  }
  return hex.slice(0, 40);
}

export function getHeadCommit(cwd = process.cwd()): {
  commitSha: string;
  treeSha: string;
  committedAt: number;
  subject: string;
} {
  const commitSha = git(["rev-parse", "HEAD"], cwd);
  const treeSha = git(["rev-parse", "HEAD^{tree}"], cwd);
  const committedAt = Number(git(["log", "-1", "--format=%ct"], cwd));
  const subject = git(["log", "-1", "--format=%s"], cwd);
  return { commitSha, treeSha, committedAt, subject };
}

export function detectGithubRepo(cwd = process.cwd()): string | null {
  try {
    const url = git(["remote", "get-url", "origin"], cwd);
    const m =
      url.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/) ||
      url.match(/github\.com\/([^/]+\/[^/.]+)/);
    return m ? m[1]!.replace(/\.git$/, "") : null;
  } catch {
    return null;
  }
}
