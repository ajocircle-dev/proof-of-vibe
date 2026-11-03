# Proof of Vibe

[![Proof of Vibe](https://proof-of-vibe.pages.dev/badge?repo=ajocircle-dev/proof-of-vibe)](https://proof-of-vibe.pages.dev/?repo=ajocircle-dev/proof-of-vibe)

Onchain provenance trail for AI-built apps.

Each commit can get an [EAS](https://attest.org) attestation on **Base Sepolia**. The attestation names the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent that helped write the code, the commit and tree hashes, a hash of the agent session, and the builder. A CLI, GitHub Action, and browser wallet flow post attestations. A public verify page turns them into a timeline with a live shareable badge.

Builder: **bosso**. Network: **Base Sepolia (84532) only**. No mainnet funds. We never pay gas for strangers.

## Live links

- App (landing + verify): https://proof-of-vibe.pages.dev
- Attest onboarding: https://proof-of-vibe.pages.dev/attest/
- Live badge (any repo): https://proof-of-vibe.pages.dev/badge?repo=owner/name
- Repo: https://github.com/ajocircle-dev/proof-of-vibe

## Honesty limit

An attestation is a **signed claim by the builder**, not cryptographic proof that an agent wrote the code. Session and artifact hashes are commitments the builder can reveal later. Live counts on the site come from easscan GraphQL only.

## Why it exists

AI-built commits move fast. Reviewers still ask: which agent, which tree, which builder, and can I see the trail grow over time? Proof of Vibe answers that with one small job done well: attest, badge, verify, repeat.

## Architecture

```
git repo  --(wallet / CLI / GH Action)-->  EAS.attest() on Base Sepolia
                                              |
                                              v
                                   base-sepolia.easscan.org GraphQL
                                              |
                    +-------------------------+-------------------------+
                    v                                                   v
         verify timeline + streak                              /badge?repo= SVG
```

- EAS predeploy: `0x4200000000000000000000000000000000000021`
- SchemaRegistry: `0x4200000000000000000000000000000000000020`
- ERC-8004 IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Agent (dogfood): `bosso-codex` agentId **10554**

## Schema (ProofOfVibe v1)

```
string repo,bytes32 commitSha,bytes32 treeSha,string appUrl,string agentRegistry,uint256 agentId,string agentTool,bytes32 sessionHash,bytes32 artifactHash,uint64 committedAt,string builderName
```

Schema UID:

```
0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c
```

## Demo flow (about 2 minutes)

1. Open https://proof-of-vibe.pages.dev and read the live counts (real onchain numbers).
2. Scroll the dogfood timeline; click easscan / basescan / GitHub links.
3. Copy the Markdown badge or open `/badge?repo=ajocircle-dev/proof-of-vibe`.
4. Go to `/attest/`, connect a Base Sepolia wallet (faucet: https://openfaucet.org/base-sepolia), load a public repo commit, and attest with your own gas.
5. Optional: add the GitHub Action using the setup notes on that page.

## Quick start (CLI)

```bash
npm install
npm test

npx tsx packages/cli/src/index.ts init \
  --repo ajocircle-dev/proof-of-vibe \
  --app-url https://proof-of-vibe.pages.dev \
  --agent-id 10554 \
  --agent-tool Codex

# Fund a testnet burner (no-account faucet only), then:
npx tsx packages/cli/src/index.ts register-schema
export POV_SCHEMA_UID=0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c

npx tsx packages/cli/src/index.ts attest --session optional-session-id
npx tsx packages/cli/src/index.ts verify ajocircle-dev/proof-of-vibe
```

Private key: set `POV_PRIVATE_KEY`, or keep chmod 600 at `.secrets/burner.key` (gitignored). Never commit keys.

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `packages/cli` | `pov` CLI: init, attest, verify, register-schema |
| `packages/action` | Composite GitHub Action |
| `packages/web` | Static Next.js landing, verify, wallet attest |
| `functions/badge.ts` | Cloudflare Pages Function: live `/badge?repo=` |
| `scripts/generate-badge.mjs` | Build-time static `badge.svg` fallback |
| `.secrets/` | Local burner key only (gitignored) |

## Deploy web

```bash
npm run web:build
npx wrangler pages deploy --project-name proof-of-vibe --branch main
```

`wrangler.toml` points `pages_build_output_dir` at `packages/web/out` and picks up `functions/`.

## GitHub Action

Store a **testnet-only** burner as `POV_PRIVATE_KEY` and the schema UID as `POV_SCHEMA_UID`. See `.github/workflows/attest.yml`. Forks skip cleanly. You pay your own gas.

## Status

- Schema registered on Base Sepolia
- ERC-8004 agent `bosso-codex` agentId **10554**
- Wallet onboarding at `/attest/`
- Live per-repo badge Function
- Auto-attest Action on `main`

## License

MIT
