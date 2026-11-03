"use client";

import { useMemo, useState } from "react";

type TimelineItem = {
  uid: string;
  time: number;
  attester: string;
  decoded: Record<string, unknown>;
};

const DEFAULT_SCHEMA = process.env.NEXT_PUBLIC_POV_SCHEMA_UID || "";
const GRAPHQL =
  process.env.NEXT_PUBLIC_EASSCAN_GRAPHQL ||
  "https://base-sepolia.easscan.org/graphql";

function normalizeRepo(input: string): string {
  let s = input.trim();
  const m = s.match(/github\.com\/([^/]+\/[^/#?]+)/);
  if (m) s = m[1]!;
  return s.replace(/\.git$/, "").replace(/\/$/, "");
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
      for (const e of arr) decoded[e.name] = e.value?.value;
    } catch {
      /* ignore */
    }
    const repoVal = String(decoded.repo || "");
    if (repoVal === repo || repoVal.includes(repo)) {
      out.push({
        uid: a.id,
        time: a.time,
        attester: a.attester,
        decoded,
      });
    }
  }
  return out;
}

export function VerifyClient() {
  const [repoInput, setRepoInput] = useState("ajocircle-dev/proof-of-vibe");
  const [schemaUid, setSchemaUid] = useState(DEFAULT_SCHEMA);
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const repo = useMemo(() => normalizeRepo(repoInput), [repoInput]);

  async function onVerify() {
    setError(null);
    setItems(null);
    if (!schemaUid) {
      setError(
        "Set a schema UID (register once with: pov register-schema), then paste it here.",
      );
      return;
    }
    setLoading(true);
    try {
      const list = await fetchTimeline(schemaUid, repo);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
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
        placeholder="0x…"
      />
      <button type="button" onClick={onVerify} disabled={loading}>
        {loading ? "Loading…" : "Verify"}
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
            {items.length} attestation{items.length === 1 ? "" : "s"} for {repo}
          </p>
          <ul className="timeline">
            {items.map((it) => {
              const commit = String(it.decoded.commitSha || "").slice(0, 10);
              const tool = String(it.decoded.agentTool || "?");
              const builder = String(it.decoded.builderName || "?");
              const when = new Date(it.time * 1000).toISOString();
              return (
                <li key={it.uid}>
                  <div>
                    <strong>{tool}</strong> · {builder}
                  </div>
                  <div className="meta">
                    {when} · commit {commit}…
                  </div>
                  <div className="meta">
                    <a
                      href={`https://base-sepolia.easscan.org/attestation/view/${it.uid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      view on easscan
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
