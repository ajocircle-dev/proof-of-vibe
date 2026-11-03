"use client";

import { useState } from "react";

const WORKFLOW = `name: Proof of Vibe attest
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  attest:
    runs-on: ubuntu-latest
    # Skip on forks; set secrets on your own repo only.
    if: github.event.repository.fork == false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Check secrets
        id: prep
        env:
          POV_PRIVATE_KEY: \${{ secrets.POV_PRIVATE_KEY }}
          POV_SCHEMA_UID: \${{ secrets.POV_SCHEMA_UID }}
        run: |
          if [ -z "\$POV_PRIVATE_KEY" ] || [ -z "\$POV_SCHEMA_UID" ]; then
            echo "ready=false" >> "\$GITHUB_OUTPUT"
          else
            echo "ready=true" >> "\$GITHUB_OUTPUT"
          fi
      - uses: actions/checkout@v4
        if: steps.prep.outputs.ready == 'true'
        with:
          repository: ajocircle-dev/proof-of-vibe
          path: pov
      - name: Attest HEAD of this repo
        if: steps.prep.outputs.ready == 'true'
        env:
          POV_PRIVATE_KEY: \${{ secrets.POV_PRIVATE_KEY }}
          POV_SCHEMA_UID: \${{ secrets.POV_SCHEMA_UID }}
        run: |
          cd pov && npm install
          npx --yes tsx packages/cli/src/index.ts init \\
            --repo "\${{ github.repository }}" \\
            --app-url "https://proof-of-vibe.pages.dev" \\
            --agent-id "\${{ vars.POV_AGENT_ID || '0' }}" \\
            --agent-tool Codex
          # Point .pov.json schema from secret, then attest the calling repo HEAD
          # Prefer cloning this Action into your monorepo; dogfood uses in-repo workflow.
          echo "Prefer copying packages/action + .github/workflows/attest.yml from ajocircle-dev/proof-of-vibe"
`;

const SIMPLE = `# .github/workflows/pov-attest.yml
# 1. Create a Base Sepolia burner (test ETH only). Never use a mainnet key.
# 2. Fund it via https://openfaucet.org/base-sepolia (no account).
# 3. Repo Settings → Secrets: POV_PRIVATE_KEY, POV_SCHEMA_UID=
#    0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c
# 4. Optional variable POV_AGENT_ID (your ERC-8004 agent id).
# 5. Copy the dogfood workflow from:
#    https://github.com/ajocircle-dev/proof-of-vibe/blob/main/.github/workflows/attest.yml
# 6. Add a .pov.json with your repo, appUrl, agentId, builderName (see that repo).
# You pay gas from YOUR burner. Proof of Vibe never sponsors stranger txs.
`;

export function ActionSnippet() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(SIMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <section className="card" id="action">
      <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
        Add the GitHub Action to your repo
      </h2>
      <ol className="steps">
        <li>Create a Base Sepolia-only burner wallet (never a mainnet key).</li>
        <li>
          Fund it at{" "}
          <a
            href="https://openfaucet.org/base-sepolia"
            target="_blank"
            rel="noreferrer"
          >
            openfaucet.org/base-sepolia
          </a>{" "}
          (no account).
        </li>
        <li>
          Add secrets <code>POV_PRIVATE_KEY</code> and{" "}
          <code>POV_SCHEMA_UID</code> (schema UID in the README).
        </li>
        <li>
          Copy{" "}
          <a
            href="https://github.com/ajocircle-dev/proof-of-vibe/blob/main/.github/workflows/attest.yml"
            target="_blank"
            rel="noreferrer"
          >
            attest.yml
          </a>{" "}
          and a <code>.pov.json</code> into your repo (or use this monorepo as a
          template).
        </li>
        <li>Push to main. Each push attests HEAD; you pay the testnet gas.</li>
      </ol>
      <pre className="snippet">{SIMPLE}</pre>
      <button type="button" onClick={copy}>
        {copied ? "Copied" : "Copy setup notes"}
      </button>
      {/* keep WORKFLOW referenced so tree-shaking does not drop intent docs */}
      <span style={{ display: "none" }}>{WORKFLOW.length}</span>
    </section>
  );
}
