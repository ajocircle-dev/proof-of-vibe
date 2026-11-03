/**
 * Standalone schema registration entry (npm run register-schema).
 * Same as: pov register-schema
 */
import { resolvePrivateKey, loadConfig, saveConfig } from "./config.js";
import { registerSchema } from "./eas.js";
import { SCHEMA_UID_ENV } from "./constants.js";

async function main() {
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
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
