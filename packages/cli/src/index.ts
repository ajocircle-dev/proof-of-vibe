#!/usr/bin/env node
/**
 * pov: Proof of Vibe CLI
 * Attest and verify AI-built commit provenance on Base Sepolia via EAS.
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  AGENT_REGISTRY_CAIP,
  BUILDER_NAME_DEFAULT,
  SCHEMA_UID_ENV,
} from "./constants.js";
import { loadConfig, saveConfig, resolvePrivateKey } from "./config.js";
import { detectGithubRepo, getHeadCommit, sha1ToBytes32 } from "./git.js";
import { hashArtifactDir, hashSession, sha256File, zeroBytes32 } from "./hash.js";
import {
  attestOnchain,
  findLatestUid,
  getSigner,
  queryTimeline,
} from "./eas.js";

function usage(): never {
  console.log(`pov: Proof of Vibe CLI (Base Sepolia)

Usage:
  pov init [--repo owner/name] [--app-url URL] [--agent-id N] [--agent-tool NAME]
  pov attest [--session ID] [--artifact PATH] [--schema-uid UID]
  pov verify <owner/name|url>
  pov register-schema

Env:
  POV_PRIVATE_KEY   testnet burner key (or .secrets/burner.key)
  POV_SCHEMA_UID    schema UID after registration
  POV_RPC_URL       optional RPC override
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = { _: "" };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      rest.push(a);
    }
  }
  out._rest = rest.join(" ");
  return out;
}

async function cmdInit(args: Record<string, string | boolean>) {
  const detected = detectGithubRepo();
  const repo = String(args.repo || detected || "");
  if (!repo) {
    console.error("Could not detect GitHub repo. Pass --repo owner/name");
    process.exit(1);
  }
  const cfg = {
    repo,
    appUrl: String(args["app-url"] || ""),
    agentRegistry: AGENT_REGISTRY_CAIP,
    agentId: String(args["agent-id"] || "0"),
    agentTool: String(args["agent-tool"] || "Codex"),
    builderName: String(args["builder-name"] || BUILDER_NAME_DEFAULT),
    schemaUid: process.env[SCHEMA_UID_ENV],
    chainId: 84532,
  };
  const path = saveConfig(cfg);
  console.log(`Wrote ${path}`);
  console.log(JSON.stringify(cfg, null, 2));
}

async function cmdAttest(args: Record<string, string | boolean>) {
  const cfg = loadConfig();
  if (!cfg) {
    console.error("No .pov.json. Run: pov init");
    process.exit(1);
  }
  const schemaUid = String(
    args["schema-uid"] || cfg.schemaUid || process.env[SCHEMA_UID_ENV] || "",
  );
  if (!schemaUid) {
    console.error(
      `No schema UID. Register with: pov register-schema  (or set ${SCHEMA_UID_ENV})`,
    );
    process.exit(1);
  }

  const privateKey = resolvePrivateKey();
  const signer = getSigner(privateKey);
  const head = getHeadCommit();
  const sessionRaw = args.session ? String(args.session) : "";
  const sessionHash = sessionRaw ? hashSession(sessionRaw) : zeroBytes32();

  let artifactHash = zeroBytes32();
  if (args.artifact) {
    const p = resolve(String(args.artifact));
    if (!existsSync(p)) {
      console.error(`Artifact path not found: ${p}`);
      process.exit(1);
    }
    const st = await import("node:fs").then((m) => m.statSync(p));
    artifactHash = st.isDirectory() ? hashArtifactDir(p) : sha256File(p);
  }

  let refUid: string | undefined;
  try {
    refUid = await findLatestUid(schemaUid, cfg.repo);
  } catch (e) {
    console.warn(
      `Could not query previous UID (continuing with no ref): ${(e as Error).message}`,
    );
  }

  const fields = {
    repo: cfg.repo,
    commitSha: sha1ToBytes32(head.commitSha),
    treeSha: sha1ToBytes32(head.treeSha),
    appUrl: cfg.appUrl,
    agentRegistry: cfg.agentRegistry,
    agentId: BigInt(cfg.agentId),
    agentTool: cfg.agentTool,
    sessionHash,
    artifactHash,
    committedAt: BigInt(head.committedAt),
    builderName: cfg.builderName,
  };

  console.log(`Attesting ${cfg.repo}@${head.commitSha.slice(0, 7)} ...`);
  console.log(`  tree=${head.treeSha.slice(0, 7)} tool=${cfg.agentTool} builder=${cfg.builderName}`);

  const result = await attestOnchain({
    privateKey,
    schemaUid,
    fields,
    recipient: await signer.getAddress(),
    refUid,
  });

  console.log(`OK uid=${result.uid}`);
  if (result.txHash) console.log(`tx=${result.txHash}`);
  console.log(
    `explorer=https://base-sepolia.easscan.org/attestation/view/${result.uid}`,
  );
}

async function cmdVerify(target: string) {
  const cfg = loadConfig();
  const schemaUid =
    cfg?.schemaUid || process.env[SCHEMA_UID_ENV] || "";
  if (!schemaUid) {
    console.error(`Set ${SCHEMA_UID_ENV} or run pov init after schema registration`);
    process.exit(1);
  }
  let repo = target.trim();
  const urlMatch = repo.match(/github\.com\/([^/]+\/[^/#?]+)/);
  if (urlMatch) repo = urlMatch[1]!.replace(/\.git$/, "");
  repo = repo.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const items = await queryTimeline(schemaUid, repo);
  if (items.length === 0) {
    console.log(`No attestations found for ${repo}`);
    process.exit(0);
  }
  console.log(`Proof of Vibe timeline for ${repo} (${items.length}):\n`);
  for (const it of items) {
    const commit = String(it.decoded.commitSha || "").slice(0, 10);
    const tool = String(it.decoded.agentTool || "?");
    const builder = String(it.decoded.builderName || "?");
    const when = new Date(it.time * 1000).toISOString();
    console.log(
      `- ${when}  commit=${commit}  tool=${tool}  builder=${builder}  uid=${it.uid.slice(0, 10)}...`,
    );
    console.log(
      `  https://base-sepolia.easscan.org/attestation/view/${it.uid}`,
    );
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") usage();
  const cmd = argv[0]!;
  const args = parseArgs(argv.slice(1));

  if (cmd === "init") await cmdInit(args);
  else if (cmd === "attest") await cmdAttest(args);
  else if (cmd === "verify") {
    const target = String(args._rest || "");
    if (!target) usage();
    await cmdVerify(target);
  } else if (cmd === "register-schema") {
    const { registerSchema } = await import("./eas.js");
    const key = resolvePrivateKey();
    console.log("Registering ProofOfVibe v1 schema on Base Sepolia...");
    const uid = await registerSchema(key);
    console.log(`SCHEMA_UID=${uid}`);
    console.log(`export ${SCHEMA_UID_ENV}=${uid}`);
    const cfg = loadConfig();
    if (cfg) {
      cfg.schemaUid = uid;
      saveConfig(cfg);
      console.log("Updated .pov.json with schemaUid");
    }
  } else {
    usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
