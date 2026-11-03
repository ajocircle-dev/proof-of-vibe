"use client";

import { useMemo, useState } from "react";
import { APP_URL } from "../lib/constants";
import { markdownBadge } from "../lib/badge-svg";
import { normalizeRepo } from "../lib/decode";

export function ShareBadge({ initialRepo }: { initialRepo: string }) {
  const [repoInput, setRepoInput] = useState(initialRepo);
  const [copied, setCopied] = useState<"md" | "link" | null>(null);
  const repo = useMemo(() => normalizeRepo(repoInput), [repoInput]);
  const badgeUrl = `${APP_URL}/badge?repo=${encodeURIComponent(repo)}`;
  const verifyUrl = `${APP_URL}/?repo=${encodeURIComponent(repo)}`;
  const md = markdownBadge(repo, APP_URL);

  async function copy(kind: "md" | "link", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="card" id="share">
      <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Shareable badge</h2>
      <p className="meta">
        Live SVG from easscan GraphQL. Come back to watch the attested commit
        streak grow for any public repo.
      </p>
      <label htmlFor="badge-repo">GitHub repo</label>
      <input
        id="badge-repo"
        type="text"
        value={repoInput}
        onChange={(e) => setRepoInput(e.target.value)}
        placeholder="owner/name"
      />
      <p style={{ margin: "0.85rem 0" }}>
        <a href={badgeUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeUrl} alt={`Proof of Vibe badge for ${repo}`} height={20} />
        </a>
      </p>
      <label>Markdown</label>
      <pre className="snippet snippet-scroll">{md}</pre>
      <div className="btn-row">
        <button type="button" onClick={() => copy("md", md)}>
          {copied === "md" ? "Copied" : "Copy Markdown"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => copy("link", verifyUrl)}
        >
          {copied === "link" ? "Copied" : "Copy verify link"}
        </button>
        <a className="btn-link" href={verifyUrl}>
          Open verify page
        </a>
      </div>
    </section>
  );
}
