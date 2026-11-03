/** Base Sepolia (84532) constants for Proof of Vibe. */

export const CHAIN_ID = 84532;
export const CHAIN_NAME = "base-sepolia";

/** OP Stack EAS predeploys (same on Base mainnet and Base Sepolia). */
export const EAS_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
export const SCHEMA_REGISTRY_ADDRESS =
  "0x4200000000000000000000000000000000000020" as const;

/** ERC-8004 IdentityRegistry on Base Sepolia. */
export const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

export const AGENT_REGISTRY_CAIP =
  `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY}` as const;

/**
 * ProofOfVibe v1 schema string.
 * Register once via SchemaRegistry.register(schema, zeroAddress, true).
 */
export const SCHEMA =
  "string repo,bytes32 commitSha,bytes32 treeSha,string appUrl,string agentRegistry,uint256 agentId,string agentTool,bytes32 sessionHash,bytes32 artifactHash,uint64 committedAt,string builderName";

/**
 * Deterministic UID = keccak256(abi.encodePacked(schema, resolver=0, revocable=true)).
 * Confirmed via eth_call simulate on Base Sepolia SchemaRegistry.
 * Onchain register still required before attestations index on easscan.
 */
export const SCHEMA_UID =
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c" as const;

export const DEFAULT_RPC =
  process.env.POV_RPC_URL || "https://sepolia.base.org";

export const EASSCAN_GRAPHQL =
  process.env.POV_EASSCAN_GRAPHQL ||
  "https://base-sepolia.easscan.org/graphql";

export const BUILDER_NAME_DEFAULT = "bosso";

/** Override with POV_SCHEMA_UID or .pov.json; defaults to SCHEMA_UID. */
export const SCHEMA_UID_ENV = "POV_SCHEMA_UID";
