"use client";

import { useEffect, useMemo, useState } from "react";

type TimelineItem = {
  uid: string;
  time: number;
  attester: string;
  txid: string;
  decoded: Record<string, unknown>;
};

type AgentCard = {
  name?: string;
  description?: string;
  image?: string;
  active?: boolean;
  registrations?: Array<{ agentId: number; agentRegistry: string }>;
  tokenUri: string;
};


/** easscan packs uint256 as { type: "BigNumber", hex: "0x..." }. */
function unwrapDecoded(value: unknown): unknown {
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

const DEFAULT_SCHEMA =
  process.env.NEXT_PUBLIC_POV_SCHEMA_UID ||
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c";
const GRAPHQL =
  process.env.NEXT_PUBLIC_EASSCAN_GRAPHQL ||
  "https://base-sepolia.easscan.org/graphql";
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const DEFAULT_AGENT_ID = 10554;
const DEFAULT_RPC =
  process.env.NEXT_PUBLIC_POV_RPC_URL || "https://sepolia.base.org";

function normalizeRepo(input: string): string {
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
  // easscan sometimes returns { type: "BigNumber", hex: "0x..." } style as stringified
  return hex.replace(/0+$/, "").slice(0, 40) || hex.slice(0, 40);
}

function shortSha(sha: string): string {
  return sha ? sha.slice(0, 7) : "?";
}

async function fetchTimeline(
  schemaUid: string,
  repo: string,
): Promise<TimelineItem[]> {
  const query = `
    query($schemaId: String!) {
      attestations(
        where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
        orderBy: [{ time: desc }]
        take: 100
      ) {
        id
        attester
        time
        txid
        decodedDataJson
      }
    }
  `;
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { schemaId: schemaUid } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  const out: TimelineItem[] = [];
  for (const a of body.data?.attestations || []) {
    let decoded: Record<string, unknown> = {};
    try {
      const arr = JSON.parse(a.decodedDataJson) as Array<{
        name: string;
        value: { value: unknown };
      }>;
      for (const e of arr) decoded[e.name] = unwrapDecoded(e.value?.value);
    } catch {
      /* ignore */
    }
    const repoVal = String(decoded.repo || "");
    if (repoVal === repo || repoVal.includes(repo)) {
      out.push({
        uid: a.id,
        time: a.time,
        attester: a.attester,
        txid: a.txid || "",
        decoded,
      });
    }
  }
  return out;
}

function decodeAbiString(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length < 128) return "";
  const strLen = parseInt(h.slice(64, 128), 16);
  const strHex = h.slice(128, 128 + strLen * 2);
  let out = "";
  for (let i = 0; i < strHex.length; i += 2) {
    out += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16));
  }
  return out;
}

async function readTokenUri(agentId: number): Promise<string> {
  // tokenURI(uint256) selector = 0xc87b56dd
  const data =
    "0xc87b56dd" + BigInt(agentId).toString(16).padStart(64, "0");
  const res = await fetch(DEFAULT_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: IDENTITY_REGISTRY, data }, "latest"],
    }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return decodeAbiString(String(body.result || ""));
}

async function loadAgentCard(agentId: number): Promise<AgentCard | null> {
  const tokenUri = await readTokenUri(agentId);
  if (!tokenUri) return null;
  let card: Omit<AgentCard, "tokenUri"> = {};
  if (tokenUri.startsWith("data:application/json")) {
    const b64 = tokenUri.split(",")[1] || "";
    card = JSON.parse(atob(b64));
  } else {
    const res = await fetch(tokenUri);
    if (res.ok) card = await res.json();
  }
  return { ...card, tokenUri };
}

async function checkGithubCommit(
  repo: string,
  sha: string,
): Promise<"ok" | "missing" | "unknown"> {
  if (!repo || !sha || sha.length < 7) return "unknown";
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits/${sha}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (res.status === 200) return "ok";
    if (res.status === 404) return "missing";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function readQuery(): { repo: string; uid: string; schema: string } {
  if (typeof window === "undefined") {
    return {
      repo: "ajocircle-dev/proof-of-vibe",
      uid: "",
      schema: DEFAULT_SCHEMA,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    repo: sp.get("repo") || "ajocircle-dev/proof-of-vibe",
    uid: (sp.get("uid") || sp.get("attestation") || "").toLowerCase(),
    schema: sp.get("schema") || DEFAULT_SCHEMA,
  };
}

export function VerifyClient() {
  const initial = useMemo(() => readQuery(), []);
  const [repoInput, setRepoInput] = useState(initial.repo);
  const [schemaUid, setSchemaUid] = useState(initial.schema);
  const [highlightUid, setHighlightUid] = useState(initial.uid);
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [ghStatus, setGhStatus] = useState<
    Record<string, "ok" | "missing" | "unknown" | "checking">
  >({});

  const repo = useMemo(() => normalizeRepo(repoInput), [repoInput]);

  async function onVerify(nextRepo = repo, nextSchema = schemaUid) {
    setError(null);
    setItems(null);
    setGhStatus({});
    if (!nextSchema) {
      setError(
        "Set a schema UID (register once with: pov register-schema), then paste it here.",
      );
      return;
    }
    setLoading(true);
    try {
      const list = await fetchTimeline(nextSchema, nextRepo);
      setItems(list);
      // Cross-check attested commits against GitHub (best effort).
      for (const it of list) {
        const sha = bytes32ToGitSha(it.decoded.commitSha);
        if (!sha) continue;
        setGhStatus((s) => ({ ...s, [sha]: "checking" }));
        const status = await checkGithubCommit(nextRepo, sha);
        setGhStatus((s) => ({ ...s, [sha]: status }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void onVerify(initial.repo, initial.schema);
    loadAgentCard(DEFAULT_AGENT_ID)
      .then(setAgentCard)
      .catch((e) =>
        setAgentError(e instanceof Error ? e.message : String(e)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!highlightUid || !items) return;
    const el = document.getElementById(`att-${highlightUid}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightUid, items]);

  return (
    <>
      <section className="card agent-card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          ERC-8004 agent card
        </h2>
        {agentError && (
          <p className="meta" style={{ color: "#f0a0a0" }}>
            Could not load tokenURI: {agentError}
          </p>
        )}
        {!agentCard && !agentError && (
          <p className="meta">Loading agent card from IdentityRegistry…</p>
        )}
        {agentCard && (
          <div>
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong>{agentCard.name || "unnamed"}</strong>
              {agentCard.active === false ? " (inactive)" : ""}
            </p>
            <p className="meta" style={{ margin: "0 0 0.5rem" }}>
              {agentCard.description || "No description on tokenURI."}
            </p>
            <p className="meta" style={{ margin: 0 }}>
              agentId {DEFAULT_AGENT_ID} ·{" "}
              <a
                href={`https://sepolia.basescan.org/token/${IDENTITY_REGISTRY}?a=${DEFAULT_AGENT_ID}`}
                target="_blank"
                rel="noreferrer"
              >
                registry
              </a>
              {" · "}
              <a href={agentCard.tokenUri} target="_blank" rel="noreferrer">
                tokenURI
              </a>
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <label htmlFor="repo">GitHub repo or URL</label>
        <input
          id="repo"
          type="text"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/name"
        />
        <label htmlFor="schema" style={{ marginTop: "0.75rem" }}>
          EAS schema UID
        </label>
        <input
          id="schema"
          type="text"
          value={schemaUid}
          onChange={(e) => setSchemaUid(e.target.value)}
          placeholder="0x..."
        />
        <label htmlFor="uid" style={{ marginTop: "0.75rem" }}>
          Highlight attestation UID (optional)
        </label>
        <input
          id="uid"
          type="text"
          value={highlightUid}
          onChange={(e) => setHighlightUid(e.target.value.toLowerCase())}
          placeholder="0x..."
        />
        <button
          type="button"
          onClick={() => onVerify()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Verify"}
        </button>

        {error && (
          <p style={{ color: "#f0a0a0", marginTop: "1rem" }} role="alert">
            {error}
          </p>
        )}

        {items && items.length === 0 && (
          <p className="meta" style={{ marginTop: "1rem" }}>
            No attestations found for <strong>{repo}</strong> yet. Dogfood with{" "}
            <code>pov attest</code> after the schema is registered.
          </p>
        )}

        {items && items.length > 0 && (
          <>
            <p className="meta" style={{ marginTop: "1rem" }}>
              {items.length} attestation{items.length === 1 ? "" : "s"} for{" "}
              {repo}
            </p>
            <ul className="timeline">
              {items.map((it) => {
                const commit = bytes32ToGitSha(it.decoded.commitSha);
                const tree = bytes32ToGitSha(it.decoded.treeSha);
                const tool = String(it.decoded.agentTool || "?");
                const builder = String(it.decoded.builderName || "?");
                const agentId = String(it.decoded.agentId ?? "?");
                const when = new Date(it.time * 1000).toISOString();
                const whenLocal = new Date(it.time * 1000).toLocaleString(
                  undefined,
                  { timeZone: "Africa/Lagos" },
                );
                const highlighted =
                  highlightUid &&
                  it.uid.toLowerCase() === highlightUid.toLowerCase();
                const gh = ghStatus[commit];
                return (
                  <li
                    key={it.uid}
                    id={`att-${it.uid.toLowerCase()}`}
                    className={highlighted ? "highlight" : undefined}
                  >
                    <div>
                      <strong>{tool}</strong> · {builder} · agent {agentId}
                    </div>
                    <div className="meta">
                      {whenLocal} WAT ({when})
                    </div>
                    <div className="meta">
                      commit{" "}
                      {commit ? (
                        <a
                          href={`https://github.com/${repo}/commit/${commit}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortSha(commit)}
                        </a>
                      ) : (
                        "?"
                      )}
                      {tree ? (
                        <>
                          {" "}
                          · tree{" "}
                          <a
                            href={`https://github.com/${repo}/tree/${tree}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortSha(tree)}
                          </a>
                        </>
                      ) : null}
                      {gh === "ok" && (
                        <>
                          {" "}
                          <span className="pill ok">in GitHub</span>
                        </>
                      )}
                      {gh === "missing" && (
                        <>
                          {" "}
                          <span className="pill bad">not in GitHub</span>
                        </>
                      )}
                      {gh === "checking" && (
                        <>
                          {" "}
                          <span className="pill">checking GitHub...</span>
                        </>
                      )}
                    </div>
                    <div className="meta links">
                      <a
                        href={`https://base-sepolia.easscan.org/attestation/view/${it.uid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        easscan
                      </a>
                      {it.txid ? (
                        <>
                          {" · "}
                          <a
                            href={`https://sepolia.basescan.org/tx/${it.txid}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            basescan tx
                          </a>
                        </>
                      ) : null}
                      {" · "}
                      <span className="mono" title={it.uid}>
                        uid {it.uid.slice(0, 10)}...
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
