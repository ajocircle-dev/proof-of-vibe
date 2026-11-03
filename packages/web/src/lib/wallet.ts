import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  http,
  parseAbiParameters,
  type Hex,
  type Address,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  AGENT_REGISTRY_CAIP,
  BASE_SEPOLIA_PARAMS,
  CHAIN_ID,
  DEFAULT_RPC,
  EAS_ADDRESS,
  IDENTITY_REGISTRY,
  SCHEMA,
  SCHEMA_UID,
} from "./constants";
import { sha1ToBytes32 } from "./decode";
import { decodeAgentIdFromLogs } from "./agent-id";

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum || null;
}

export async function connectWallet(): Promise<Address> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No injected wallet found. Install MetaMask or another EIP-1193 wallet.",
    );
  }
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts[0]) throw new Error("Wallet returned no accounts");
  return accounts[0] as Address;
}

export async function ensureBaseSepolia(
  provider: EthereumProvider,
): Promise<void> {
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (parseInt(chainId, 16) === CHAIN_ID) return;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA_PARAMS.chainId }],
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      });
      return;
    }
    throw e;
  }
}

const easAbi = [
  {
    type: "function",
    name: "attest",
    stateMutability: "payable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "schema", type: "bytes32" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "recipient", type: "address" },
              { name: "expirationTime", type: "uint64" },
              { name: "revocable", type: "bool" },
              { name: "refUID", type: "bytes32" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

const registryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
] as const;

export type AttestInput = {
  repo: string;
  commitSha: string;
  treeSha: string;
  appUrl: string;
  agentId: bigint;
  agentTool: string;
  builderName: string;
  committedAt: bigint;
  sessionHash?: Hex;
  artifactHash?: Hex;
  refUid?: Hex;
};

function zeroBytes32(): Hex {
  return `0x${"0".repeat(64)}`;
}

export function encodeProofOfVibe(fields: AttestInput): Hex {
  return encodeAbiParameters(parseAbiParameters(SCHEMA), [
    fields.repo,
    sha1ToBytes32(fields.commitSha),
    sha1ToBytes32(fields.treeSha),
    fields.appUrl,
    AGENT_REGISTRY_CAIP,
    fields.agentId,
    fields.agentTool,
    fields.sessionHash || zeroBytes32(),
    fields.artifactHash || zeroBytes32(),
    fields.committedAt,
    fields.builderName,
  ]);
}

export async function attestWithWallet(
  fields: AttestInput,
): Promise<{ txHash: Hex }> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet");
  await ensureBaseSepolia(provider);
  const account = await connectWallet();
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(provider as never),
  });
  const data = encodeProofOfVibe(fields);
  const hash = await walletClient.writeContract({
    address: EAS_ADDRESS,
    abi: easAbi,
    functionName: "attest",
    args: [
      {
        schema: SCHEMA_UID,
        data: {
          recipient: account,
          expirationTime: 0n,
          revocable: true,
          refUID: fields.refUid || zeroBytes32(),
          data,
          value: 0n,
        },
      },
    ],
    account,
    chain: baseSepolia,
  });
  return { txHash: hash };
}

export async function registerAgentWithWallet(
  agentUri: string,
): Promise<{ txHash: Hex; agentId: bigint | null }> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet");
  await ensureBaseSepolia(provider);
  const account = await connectWallet();
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: custom(provider as never),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(DEFAULT_RPC),
  });
  const hash = await walletClient.writeContract({
    address: IDENTITY_REGISTRY,
    abi: registryAbi,
    functionName: "register",
    args: [agentUri],
    account,
    chain: baseSepolia,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const agentId = decodeAgentIdFromLogs(receipt.logs, IDENTITY_REGISTRY);
  return { txHash: hash, agentId };
}
