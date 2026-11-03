/** Shared Base Sepolia constants for the Proof of Vibe web app. */

export const CHAIN_ID = 84532;
export const EAS_ADDRESS =
  "0x4200000000000000000000000000000000000021" as const;
export const SCHEMA_REGISTRY_ADDRESS =
  "0x4200000000000000000000000000000000000020" as const;
export const IDENTITY_REGISTRY =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
export const AGENT_REGISTRY_CAIP =
  `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY}` as const;

export const SCHEMA =
  "string repo,bytes32 commitSha,bytes32 treeSha,string appUrl,string agentRegistry,uint256 agentId,string agentTool,bytes32 sessionHash,bytes32 artifactHash,uint64 committedAt,string builderName";

export const SCHEMA_UID =
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c" as const;

export const DEFAULT_RPC =
  process.env.NEXT_PUBLIC_POV_RPC_URL || "https://sepolia.base.org";

export const EASSCAN_GRAPHQL =
  process.env.NEXT_PUBLIC_EASSCAN_GRAPHQL ||
  "https://base-sepolia.easscan.org/graphql";

export const APP_URL =
  process.env.NEXT_PUBLIC_POV_APP_URL || "https://proof-of-vibe.pages.dev";

export const DOGFOOD_REPO = "ajocircle-dev/proof-of-vibe";
export const DEFAULT_AGENT_ID = 10554;
export const FAUCET_URL = "https://openfaucet.org/base-sepolia";

export const BASE_SEPOLIA_PARAMS = {
  chainId: "0x14a34",
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
} as const;
