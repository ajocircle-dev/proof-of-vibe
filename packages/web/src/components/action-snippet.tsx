"use client";

import { useState } from "react";
import { CopyRow } from "./copy-row";

const SCHEMA_UID =
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c";
const WORKFLOW_URL =
  "https://github.com/ajocircle-dev/proof-of-vibe/blob/main/.github/workflows/attest.yml";
const FAUCET_URL = "https://openfaucet.org/base-sepolia";

const POV_JSON = `{
  "repo": "OWNER/NAME",
  "appUrl": "https://proof-of-vibe.pages.dev",
  "agentRegistry": "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e",
  "agentId": "0",
  "agentTool": "Codex",
  "builderName": "you",
  "schemaUid": "${SCHEMA_UID}",
  "chainId": 84532
}
`;

const SETUP_NOTES = `Proof of Vibe GitHub Action setup (Base Sepolia only)

1. Create a Base Sepolia burner (test ETH only). Never use a mainnet key.
2. Fund it at ${FAUCET_URL} (no account).
3. Repo Settings → Secrets and variables → Actions:
   - POV_PRIVATE_KEY = your burner private key
   - POV_SCHEMA_UID = ${SCHEMA_UID}
4. Optional repo variable: POV_AGENT_ID (your ERC-8004 agent id).
5. Copy the workflow from:
   ${WORKFLOW_URL}
6. Add a .pov.json (see sample on the attest page).
7. Push to main. You pay testnet gas. Proof of Vibe never sponsors stranger txs.
`;

function truncateMid(s: string, head = 10, tail = 8): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function ActionSnippet() {
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(SETUP_NOTES);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="card" id="action">
      <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
        Add the GitHub Action to your repo
      </h2>
      <p className="meta" style={{ marginTop: 0 }}>
        Short setup. You pay Base Sepolia gas from your own burner.
      </p>

      <ol className="steps action-steps">
        <li>
          Create a Base Sepolia-only burner wallet. Never use a mainnet key.
        </li>
        <li>
          Fund it at{" "}
          <a href={FAUCET_URL} target="_blank" rel="noreferrer">
            openfaucet.org/base-sepolia
          </a>{" "}
          (no account needed).
        </li>
        <li>
          In GitHub repo Settings, add Action secrets named below.
        </li>
        <li>
          Copy{" "}
          <a href={WORKFLOW_URL} target="_blank" rel="noreferrer">
            attest.yml
          </a>{" "}
          into <code>.github/workflows/</code>, and add a <code>.pov.json</code>.
        </li>
        <li>Push to main. Each push attests HEAD with your burner.</li>
      </ol>

      <div className="copy-stack" aria-label="Copyable setup values">
        <CopyRow label="Secret name" value="POV_PRIVATE_KEY" />
        <CopyRow label="Secret name" value="POV_SCHEMA_UID" />
        <CopyRow
          label="Schema UID (secret value)"
          value={SCHEMA_UID}
          display={truncateMid(SCHEMA_UID, 12, 10)}
        />
        <CopyRow
          label="Optional variable"
          value="POV_AGENT_ID"
          display="POV_AGENT_ID"
        />
        <CopyRow
          label="Workflow file"
          value={WORKFLOW_URL}
          display="github.com/…/attest.yml"
          href={WORKFLOW_URL}
        />
      </div>

      <label className="snippet-label">Sample .pov.json</label>
      <pre className="snippet snippet-scroll">{POV_JSON}</pre>
      <div className="btn-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(POV_JSON);
          }}
        >
          Copy .pov.json
        </button>
        <button type="button" onClick={copyAll}>
          {copiedAll ? "Copied" : "Copy setup notes"}
        </button>
      </div>
    </section>
  );
}
