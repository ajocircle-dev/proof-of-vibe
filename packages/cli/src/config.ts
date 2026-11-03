import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_REGISTRY_CAIP,
  BUILDER_NAME_DEFAULT,
  SCHEMA_UID,
  SCHEMA_UID_ENV,
} from "./constants.js";

export type PovConfig = {
  repo: string;
  appUrl: string;
  agentRegistry: string;
  agentId: string;
  agentTool: string;
  builderName: string;
  schemaUid?: string;
  chainId: number;
};

const CONFIG_NAME = ".pov.json";

export function configPath(cwd = process.cwd()): string {
  return resolve(cwd, CONFIG_NAME);
}

export function loadConfig(cwd = process.cwd()): PovConfig | null {
  const path = configPath(cwd);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<PovConfig>;
  return {
    repo: raw.repo || "",
    appUrl: raw.appUrl || "",
    agentRegistry: raw.agentRegistry || AGENT_REGISTRY_CAIP,
    agentId: raw.agentId || "0",
    agentTool: raw.agentTool || "Codex",
    builderName: raw.builderName || BUILDER_NAME_DEFAULT,
    schemaUid:
      raw.schemaUid || process.env[SCHEMA_UID_ENV] || SCHEMA_UID,
    chainId: raw.chainId || 84532,
  };
}

export function saveConfig(cfg: PovConfig, cwd = process.cwd()): string {
  const path = configPath(cwd);
  writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
  return path;
}

export function resolvePrivateKey(): `0x${string}` {
  if (process.env.POV_PRIVATE_KEY) {
    const k = process.env.POV_PRIVATE_KEY.trim();
    return (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
  }
  const candidates = [
    resolve(process.cwd(), ".secrets/burner.key"),
    resolve(process.cwd(), "../../.secrets/burner.key"),
    resolve(process.cwd(), "../../../.secrets/burner.key"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const k = readFileSync(p, "utf8").trim();
      return (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
    }
  }
  throw new Error(
    "No private key. Set POV_PRIVATE_KEY or place a key in .secrets/burner.key",
  );
}
