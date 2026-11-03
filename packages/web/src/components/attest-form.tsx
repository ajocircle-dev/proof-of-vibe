"use client";

import { useState } from "react";
import {
  APP_URL,
  DEFAULT_AGENT_ID,
  FAUCET_URL,
  IDENTITY_REGISTRY,
  SCHEMA_UID,
} from "../lib/constants";
import { normalizeRepo } from "../lib/decode";
import { fetchCommit, fetchLatestCommit } from "../lib/github";
import {
  attestWithWallet,
  connectWallet,
  ensureBaseSepolia,
  getInjectedProvider,
  registerAgentWithWallet,
} from "../lib/wallet";
import { fetchTimeline } from "../lib/eas-query";

type Step = "form" | "signing" | "done" | "error";

export function AttestForm() {
  const [repoInput, setRepoInput] = useState("");
  const [commitInput, setCommitInput] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [agentTool, setAgentTool] = useState("Codex");
  const [agentId, setAgentId] = useState(String(DEFAULT_AGENT_ID));
  const [agentUri, setAgentUri] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    sha: string;
    treeSha: string;
    committedAt: number;
    message: string;
    htmlUrl: string;
  } | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repo = normalizeRepo(repoInput);

  async function onConnect() {
    setError(null);
    try {
      const provider = getInjectedProvider();
      if (!provider) {
        throw new Error(
          "No browser wallet detected. Install MetaMask (or another EIP-1193 wallet), then retry.",
        );
      }
      await ensureBaseSepolia(provider);
      const addr = await connectWallet();
      setAddress(addr);
      setStatus(`Connected ${addr.slice(0, 6)}…${addr.slice(-4)} on Base Sepolia`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onLoadLatest() {
    setError(null);
    setPreview(null);
    if (!repo) {
      setError("Enter a GitHub repo as owner/name");
      return;
    }
    try {
      setStatus("Fetching latest commit from GitHub…");
      const c = await fetchLatestCommit(repo);
      setCommitInput(c.sha);
      setPreview(c);
      setStatus(`Loaded ${c.sha.slice(0, 7)}: ${c.message}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    }
  }

  async function onLoadCommit() {
    setError(null);
    if (!repo || !commitInput.trim()) {
      setError("Enter repo and commit SHA");
      return;
    }
    try {
      setStatus("Fetching commit…");
      const c = await fetchCommit(repo, commitInput.trim());
      setCommitInput(c.sha);
      setPreview(c);
      setStatus(`Loaded ${c.sha.slice(0, 7)}: ${c.message}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    }
  }

  async function onRegisterAgent() {
    setError(null);
    if (!agentUri.trim()) {
      setError("Paste an agentURI (HTTPS URL to your agent-registration.json)");
      return;
    }
    try {
      setStep("signing");
      setStatus("Confirm register() in your wallet (you pay testnet gas)…");
      const { txHash: hash, agentId: newId } = await registerAgentWithWallet(
        agentUri.trim(),
      );
      setTxHash(hash);
      if (newId != null) {
        setAgentId(newId.toString());
        setStatus(
          `Registered agentId ${newId.toString()}. Tx ${hash.slice(0, 10)}… Auto-filled below.`,
        );
      } else {
        setStatus(
          `Register tx confirmed (${hash.slice(0, 10)}…). Could not decode agentId from logs; check basescan and paste it below.`,
        );
      }
      setStep("form");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onAttest() {
    setError(null);
    setTxHash(null);
    if (!repo) {
      setError("Enter a GitHub repo");
      return;
    }
    if (!builderName.trim()) {
      setError("Enter your builder name");
      return;
    }
    let commit = preview;
    try {
      if (!commit) {
        if (commitInput.trim()) {
          commit = await fetchCommit(repo, commitInput.trim());
        } else {
          commit = await fetchLatestCommit(repo);
        }
        setPreview(commit);
        setCommitInput(commit.sha);
      }
      let refUid: `0x${string}` | undefined;
      try {
        const timeline = await fetchTimeline(SCHEMA_UID, repo);
        if (timeline[0]?.uid) refUid = timeline[0].uid as `0x${string}`;
      } catch {
        /* optional chain */
      }
      setStep("signing");
      setStatus(
        "Confirm EAS.attest in your wallet. You pay Base Sepolia gas. We never sponsor stranger txs.",
      );
      if (!address) await onConnect();
      const { txHash: hash } = await attestWithWallet({
        repo,
        commitSha: commit.sha,
        treeSha: commit.treeSha,
        appUrl: APP_URL,
        agentId: BigInt(agentId || "0"),
        agentTool: agentTool.trim() || "Codex",
        builderName: builderName.trim(),
        committedAt: BigInt(commit.committedAt),
        refUid,
      });
      setTxHash(hash);
      setStep("done");
      setStatus("Attestation submitted.");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="card" id="attest">
      <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
        Attest your repo (one click path)
      </h2>
      <p className="meta">
        Connect your own browser wallet on Base Sepolia. You sign and you pay
        test gas. Proof of Vibe never sends gas for strangers.
      </p>

      <div className="warn" style={{ marginTop: "0.75rem" }}>
        Need test ETH? Use the no-account faucet:{" "}
        <a href={FAUCET_URL} target="_blank" rel="noreferrer">
          openfaucet.org/base-sepolia
        </a>
        . An attestation is a signed claim by you, not proof an agent wrote the
        code.
      </div>

      <div className="btn-row" style={{ marginTop: "0.75rem" }}>
        <button type="button" onClick={onConnect}>
          {address ? "Wallet connected" : "Connect wallet"}
        </button>
        {address && (
          <span className="meta mono">
            {address.slice(0, 8)}…{address.slice(-6)}
          </span>
        )}
      </div>

      <label htmlFor="att-repo" style={{ marginTop: "0.85rem" }}>
        GitHub repo (owner/name or URL)
      </label>
      <input
        id="att-repo"
        type="text"
        value={repoInput}
        onChange={(e) => setRepoInput(e.target.value)}
        placeholder="owner/name"
      />

      <label htmlFor="att-commit" style={{ marginTop: "0.75rem" }}>
        Commit SHA (optional: leave blank and load latest)
      </label>
      <input
        id="att-commit"
        type="text"
        value={commitInput}
        onChange={(e) => {
          setCommitInput(e.target.value);
          setPreview(null);
        }}
        placeholder="40-char SHA or short SHA"
      />
      <div className="btn-row">
        <button type="button" className="btn-secondary" onClick={onLoadLatest}>
          Load latest commit
        </button>
        <button type="button" className="btn-secondary" onClick={onLoadCommit}>
          Resolve commit
        </button>
      </div>
      {preview && (
        <p className="meta" style={{ marginTop: "0.5rem" }}>
          Preview:{" "}
          <a href={preview.htmlUrl} target="_blank" rel="noreferrer">
            {preview.sha.slice(0, 7)}
          </a>{" "}
          · tree {preview.treeSha.slice(0, 7)} · {preview.message}
        </p>
      )}

      <label htmlFor="att-builder" style={{ marginTop: "0.75rem" }}>
        Builder name
      </label>
      <input
        id="att-builder"
        type="text"
        value={builderName}
        onChange={(e) => setBuilderName(e.target.value)}
        placeholder="your name or handle"
      />

      <label htmlFor="att-tool" style={{ marginTop: "0.75rem" }}>
        Agent tool
      </label>
      <input
        id="att-tool"
        type="text"
        value={agentTool}
        onChange={(e) => setAgentTool(e.target.value)}
        placeholder="Codex"
      />

      <label htmlFor="att-agent" style={{ marginTop: "0.75rem" }}>
        ERC-8004 agent id (0 if none)
      </label>
      <input
        id="att-agent"
        type="text"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="10554"
      />
      <p className="meta">
        Registry{" "}
        <a
          href={`https://sepolia.basescan.org/address/${IDENTITY_REGISTRY}`}
          target="_blank"
          rel="noreferrer"
        >
          {IDENTITY_REGISTRY.slice(0, 10)}…
        </a>
        . Optional: register a new agent with your own agentURI, then paste the
        new id.
      </p>
      <label htmlFor="att-uri">New agentURI (optional register)</label>
      <input
        id="att-uri"
        type="text"
        value={agentUri}
        onChange={(e) => setAgentUri(e.target.value)}
        placeholder="https://…/agent-registration.json"
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={onRegisterAgent}
        disabled={step === "signing"}
      >
        Register agent (your gas)
      </button>

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={onAttest}
          disabled={step === "signing"}
        >
          {step === "signing" ? "Waiting for wallet…" : "Attest this commit"}
        </button>
        <a className="btn-link" href={`/?repo=${encodeURIComponent(repo || "ajocircle-dev/proof-of-vibe")}`}>
          View timeline
        </a>
      </div>

      {status && (
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          {status}
        </p>
      )}
      {error && (
        <p style={{ color: "#f0a0a0", marginTop: "0.75rem" }} role="alert">
          {error}
        </p>
      )}
      {txHash && (
        <p className="meta" style={{ marginTop: "0.5rem" }}>
          Tx:{" "}
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            basescan
          </a>
        </p>
      )}
      {step === "done" && (
        <p className="ok-line">
          Done. After easscan indexes (often under a minute), refresh the verify
          timeline for {repo}.
        </p>
      )}
    </section>
  );
}
