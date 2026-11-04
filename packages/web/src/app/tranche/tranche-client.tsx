"use client";

import { useEffect, useMemo, useState } from "react";
import { DOGFOOD_REPO, SCHEMA_UID } from "../../lib/constants";
import { bytes32ToGitSha, normalizeRepo, shortSha } from "../../lib/decode";
import { fetchTimeline, type TimelineItem } from "../../lib/eas-query";
import {
  attestedSince,
  CHALLENGE_HOURS,
  computeTrancheWindow,
  formatAgentGroup,
  groupAgents,
  defaultStartMs,
  formatDuration,
  parseStartDate,
  toDateInput,
  TRANCHE_DAYS,
} from "../../lib/tranche";
import { badgeLink, shareText } from "../../lib/share";
import { ShareOnX } from "../../components/share-x";
import { loadAgentCard } from "../verify-client";

function readQuery() {
  if (typeof window === "undefined") return { repo: DOGFOOD_REPO, since: null as string | null };
  const sp = new URLSearchParams(window.location.search);
  return { repo: sp.get("repo") || DOGFOOD_REPO, since: sp.get("since") };
}

const PHASE_LABEL = {
  building: "Building. Challenge window not open yet",
  challenge: "Holder challenge window open",
  due: "Tranche due. Window closed",
} as const;

export function TrancheClient() {
  const [repoInput, setRepoInput] = useState(DOGFOOD_REPO);
  const [startInput, setStartInput] = useState("");
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [names, setNames] = useState<Record<string, string>>({});
  const repo = useMemo(() => normalizeRepo(repoInput), [repoInput]);

  useEffect(() => {
    if (!items) return;
    for (const g of groupAgents(items)) {
      const id = Number(g.agentId);
      if (!id || names[g.agentId]) continue;
      loadAgentCard(id)
        .then((c) => { if (c?.name) setNames((n) => ({ ...n, [g.agentId]: c.name! })); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    const q = readQuery();
    setRepoInput(q.repo);
    const parsed = parseStartDate(q.since);
    setStartInput(toDateInput(parsed ?? defaultStartMs(Date.now())));
    void load(q.repo);
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(r: string) {
    setError(null);
    setItems(null);
    try {
      setItems(await fetchTimeline(SCHEMA_UID, normalizeRepo(r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }

  function apply() {
    const url = new URL(window.location.href);
    url.searchParams.set("repo", repo);
    if (startInput) url.searchParams.set("since", startInput);
    window.history.replaceState(null, "", url.toString());
    void load(repo);
  }

  const startMs = parseStartDate(startInput) ?? defaultStartMs(now);
  const win = computeTrancheWindow(startMs, now);
  const since = items ? attestedSince(items, startMs) : [];
  const groups = groupAgents(since);
  const agents = groups.map((g) => formatAgentGroup(g, names[g.agentId]));
  const challengePct = (CHALLENGE_HOURS * 3_600_000) / (TRANCHE_DAYS * 86_400_000);

  return (
    <>
      <section className="card tranche-head">
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.35rem" }}>Tranche evidence</h1>
        <p className="meta" style={{ marginTop: 0 }}>
          Raise-page style panel. Commits attested on Base since the last tranche,
          read live from EAS. Model: {TRANCHE_DAYS}-day tranches with a {CHALLENGE_HOURS}h
          holder challenge window before each release.
        </p>
        <div className="tranche-form">
          <div>
            <label htmlFor="t-repo">GitHub repo</label>
            <input id="t-repo" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} placeholder="owner/name" />
          </div>
          <div>
            <label htmlFor="t-start">Last tranche date (UTC)</label>
            <input id="t-start" type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
          </div>
          <button type="button" onClick={apply}>Load evidence</button>
        </div>
      </section>

      <section className="card">
        <div className="tranche-stats">
          <div><span className="stat-num">{items ? since.length : "..."}</span><span className="stat-label">commits attested since tranche</span></div>
          <div><span className="stat-num">{items ? items.length : "..."}</span><span className="stat-label">all-time attestations</span></div>
          <div><span className="stat-num">{formatDuration(win.msToBoundary)}</span><span className="stat-label">{win.phase === "building" ? "until challenge window" : win.phase === "challenge" ? "left in challenge window" : "tranche due"}</span></div>
        </div>
        <p className={`phase phase-${win.phase}`}>{PHASE_LABEL[win.phase]}</p>
        <div className="tl-bar" aria-label="Tranche timeline">
          <div className="tl-fill" style={{ width: `${win.progress * 100}%` }} />
          <div className="tl-challenge" style={{ width: `${challengePct * 100}%` }} />
        </div>
        <div className="tl-legend">
          <span>{toDateInput(win.startMs)} last tranche</span>
          <span>{toDateInput(win.challengeOpensMs)} 72h window</span>
          <span>{toDateInput(win.nextTrancheMs)} next</span>
        </div>
        <p className="meta">Countdown is an illustration from the date you pick. Agents in this period: {agents.length ? agents.join(", ") : "none yet"}.</p>
        <div className="btn-row">
          <ShareOnX text={shareText(repo, "tranche")} />
          <a className="btn-link" href={`/?repo=${encodeURIComponent(repo)}`}>Full timeline</a>
          <a className="btn-link" href={badgeLink(repo)} target="_blank" rel="noreferrer">Badge</a>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Commits since {toDateInput(startMs)}</h2>
        {error && <p className="warn">Could not load EAS data: {error}</p>}
        {!items && <p className="meta">Loading from base-sepolia.easscan.org...</p>}
        {items && since.length === 0 && (
          <p className="meta">No attested commits for {repo} since this date. Pick an earlier date or <a href="/attest/">attest one</a>.</p>
        )}
        <ul className="tranche-list">
          {since.map((it) => {
            const sha = bytes32ToGitSha(it.decoded.commitSha);
            return (
              <li key={it.uid}>
                <div className="tr-row1">
                  <a href={`https://github.com/${repo}/commit/${sha}`} target="_blank" rel="noreferrer"><code>{shortSha(sha)}</code></a>
                  <span className="meta">{new Date(it.time * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC</span>
                </div>
                <div className="tr-row2 meta">
                  Agent: {String(it.decoded.agentTool || "unknown")} #{String(it.decoded.agentId ?? "0")}
                  {" · "}
                  <a href={`https://base-sepolia.easscan.org/attestation/view/${it.uid}`} target="_blank" rel="noreferrer">easscan</a>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
