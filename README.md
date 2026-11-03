# Proof of Vibe

Onchain provenance trail for AI-built apps.

Each commit (or release) can get an [EAS](https://attest.org) attestation on **Base Sepolia**. The attestation names the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent that helped write the code, the commit and tree hashes, a hash of the agent session, and the builder. A small CLI and GitHub Action post the attestations. A public verify page turns them into a timeline.

Builder: **bosso**. Network: **Base Sepolia (84532) only**. No mainnet funds.

Live verify page: https://proof-of-vibe.pages.dev

## Honesty limit

An attestation is a **signed claim by the builder**, not cryptographic proof that an agent wrote the code. Session and artifact hashes are commitments the builder can reveal later. Say this plainly when you share a badge.

## Architecture

```
git repo  --(pov CLI / GH Action)-->  EAS.attest() on Base Sepolia
                                         |
                                         v
                              base-sepolia.easscan.org GraphQL
                                         |
                                         v
                         Next.js verify page (Cloudflare Pages)
```

- EAS predeploy: `0x4200000000000000000000000000000000000021`
- SchemaRegistry: `0x4200000000000000000000000000000000000020`
- ERC-8004 IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

## Schema (ProofOfVibe v1)

```
string repo,bytes32 commitSha,bytes32 treeSha,string appUrl,string agentRegistry,uint256 agentId,string agentTool,bytes32 sessionHash,bytes32 artifactHash,uint64 committedAt,string builderName
```

Deterministic schema UID (keccak256 of encodePacked schema + zero resolver + revocable):

```
0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c
```

`refUID` chains attestations for the same repo into a timeline. `commitSha` / `treeSha` are git SHA-1 values left-aligned in `bytes32`.

Onchain `register` still needs a funded Base Sepolia burner. Until then attestations cannot be posted, but the UID is fixed.

## Quick start

```bash
npm install
npm test

# Configure this repo
npx tsx packages/cli/src/index.ts init \
  --repo ajocircle-dev/proof-of-vibe \
  --app-url https://proof-of-vibe.pages.dev \
  --agent-tool Codex

# Fund a testnet burner (no-account faucet only), then:
npx tsx packages/cli/src/index.ts register-schema
export POV_SCHEMA_UID=0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c

npx tsx packages/cli/src/index.ts attest --session optional-session-id
npx tsx packages/cli/src/index.ts verify ajocircle-dev/proof-of-vibe
```

Private key: set `POV_PRIVATE_KEY`, or keep a chmod 600 file at `.secrets/burner.key` (gitignored). Never commit keys.

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `packages/cli` | `pov` CLI: init, attest, verify, register-schema |
| `packages/action` | Composite GitHub Action |
| `packages/web` | Static Next.js verify page |
| `.secrets/` | Local burner key only (gitignored, chmod 600) |

## Verify page

```bash
npm run web:build
npx -p node@22 -p wrangler wrangler pages deploy packages/web/out \
  --project-name proof-of-vibe --branch main
```

## GitHub Action

Store a **testnet-only** burner as `POV_PRIVATE_KEY` and the schema UID as `POV_SCHEMA_UID`. See `.github/workflows/attest.yml`.

## Status

Day 1 complete on Base Sepolia:
- Schema registered: `0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c`
- ERC-8004 agent `bosso-codex` agentId **10554**
- First dogfood attestation for commit `40acea7`: see easscan
- Burner funded via [openfaucet.org](https://openfaucet.org) (no-login PoW)

## License

MIT
