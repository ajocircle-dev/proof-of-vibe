/** Helpers for easscan decoded fields and git SHA packing. */

export function unwrapDecoded(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "hex" in (value as { hex?: string }) &&
    (value as { type?: string }).type === "BigNumber"
  ) {
    try {
      return BigInt((value as { hex: string }).hex).toString();
    } catch {
      return value;
    }
  }
  return value;
}

export function normalizeRepo(input: string): string {
  let s = input.trim();
  const m = s.match(/github\.com\/([^/]+\/[^/#?]+)/);
  if (m) s = m[1]!;
  return s.replace(/\.git$/, "").replace(/\/$/, "");
}

/** Left-aligned git SHA-1 inside bytes32 (or already a short hex). */
export function bytes32ToGitSha(value: unknown): string {
  const raw = String(value || "");
  if (!raw) return "";
  const hex = (raw.startsWith("0x") ? raw.slice(2) : raw).toLowerCase();
  if (/^[0-9a-f]{40}/.test(hex)) return hex.slice(0, 40);
  return hex.replace(/0+$/, "").slice(0, 40) || hex.slice(0, 40);
}

export function sha1ToBytes32(sha: string): `0x${string}` {
  const hex = sha.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error(`Expected 40-char git SHA-1, got: ${sha}`);
  }
  return `0x${hex}${"0".repeat(24)}`;
}

export function shortSha(sha: string): string {
  return sha ? sha.slice(0, 7) : "?";
}

export function parseDecodedJson(
  decodedDataJson: string,
): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  try {
    const arr = JSON.parse(decodedDataJson) as Array<{
      name: string;
      value: { value: unknown };
    }>;
    for (const e of arr) decoded[e.name] = unwrapDecoded(e.value?.value);
  } catch {
    /* ignore */
  }
  return decoded;
}
