import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  EAS_ADDRESS,
  SCHEMA,
  SCHEMA_UID,
  SCHEMA_REGISTRY_ADDRESS,
  DEFAULT_RPC,
  EASSCAN_GRAPHQL,
} from "./constants.js";
import { zeroBytes32 } from "./hash.js";

export type AttestFields = {
  repo: string;
  commitSha: Hex;
  treeSha: Hex;
  appUrl: string;
  agentRegistry: string;
  agentId: bigint;
  agentTool: string;
  sessionHash: Hex;
  artifactHash: Hex;
  committedAt: bigint;
  builderName: string;
};

const schemaRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schema", type: "string" },
      { name: "resolver", type: "address" },
      { name: "revocable", type: "bool" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getSchema",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "resolver", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "schema", type: "string" },
        ],
      },
    ],
  },
] as const;

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

/** keccak256(abi.encodePacked(schema, resolver, revocable)) matching SchemaRegistry. */
export function computeSchemaUid(
  schema = SCHEMA,
  resolver: Address = "0x0000000000000000000000000000000000000000",
  revocable = true,
): Hex {
  const packed = new Uint8Array([
    ...toBytes(schema),
    ...toBytes(resolver),
    revocable ? 1 : 0,
  ]);
  return keccak256(packed);
}

export function encodeSchemaData(fields: AttestFields): Hex {
  return encodeAbiParameters(parseAbiParameters(SCHEMA), [
    fields.repo,
    fields.commitSha,
    fields.treeSha,
    fields.appUrl,
    fields.agentRegistry,
    fields.agentId,
    fields.agentTool,
    fields.sessionHash,
    fields.artifactHash,
    fields.committedAt,
    fields.builderName,
  ]);
}

function clients(privateKey: Hex, rpc = DEFAULT_RPC) {
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpc);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
  });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  });
  return { account, publicClient, walletClient };
}

export function getSigner(privateKey: string): {
  getAddress: () => Promise<string>;
} {
  const addr = privateKeyToAccount(privateKey as Hex).address;
  return { getAddress: async () => addr };
}

export async function registerSchema(
  privateKey: string,
  rpc = DEFAULT_RPC,
): Promise<string> {
  const uid = computeSchemaUid();
  if (uid.toLowerCase() !== SCHEMA_UID.toLowerCase()) {
    console.warn(
      `Computed UID ${uid} differs from pinned SCHEMA_UID ${SCHEMA_UID}`,
    );
  }

  const { account, publicClient, walletClient } = clients(
    privateKey as Hex,
    rpc,
  );

  // Already registered?
  try {
    const existing = await publicClient.readContract({
      address: SCHEMA_REGISTRY_ADDRESS,
      abi: schemaRegistryAbi,
      functionName: "getSchema",
      args: [uid],
    });
    if (existing && existing.schema && existing.schema.length > 0) {
      console.log("Schema already registered onchain.");
      return uid;
    }
  } catch {
    // continue to register
  }

  try {
    const hash = await walletClient.writeContract({
      address: SCHEMA_REGISTRY_ADDRESS,
      abi: schemaRegistryAbi,
      functionName: "register",
      args: [SCHEMA, "0x0000000000000000000000000000000000000000", true],
      account,
      chain: baseSepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`register tx=${hash}`);
    return uid;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("AlreadyExists") || msg.includes("0x23369fa6")) {
      console.log("Schema AlreadyExists; using computed UID.");
      return uid;
    }
    throw e;
  }
}

export async function attestOnchain(opts: {
  privateKey: string;
  schemaUid: string;
  fields: AttestFields;
  recipient: string;
  refUid?: string;
  rpc?: string;
}): Promise<{ uid: string; txHash: string }> {
  const { account, publicClient, walletClient } = clients(
    opts.privateKey as Hex,
    opts.rpc || DEFAULT_RPC,
  );
  const data = encodeSchemaData(opts.fields);
  const hash = await walletClient.writeContract({
    address: EAS_ADDRESS,
    abi: easAbi,
    functionName: "attest",
    args: [
      {
        schema: opts.schemaUid as Hex,
        data: {
          recipient: opts.recipient as Address,
          expirationTime: 0n,
          revocable: true,
          refUID: (opts.refUid || zeroBytes32()) as Hex,
          data,
          value: 0n,
        },
      },
    ],
    account,
    chain: baseSepolia,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === EAS_ADDRESS.toLowerCase()) {
      if (log.data && log.data.length >= 66) {
        const attUid = `0x${log.data.slice(2, 66)}`;
        return { uid: attUid, txHash: hash };
      }
    }
  }
  return { uid: "", txHash: hash };
}


function unwrapDecoded(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "hex" in (value as { hex?: string }) &&
    (value as { type?: string }).type === "BigNumber"
  ) {
    try {
      return BigInt((value as { hex: string }).hex).toString();
    } catch {
      return value;
    }
  }
  return value;
}

export type TimelineItem = {
  uid: string;
  attester: string;
  recipient: string;
  time: number;
  txid: string;
  decoded: Record<string, unknown>;
  refUID: string;
};

export async function queryTimeline(
  schemaUid: string,
  repo: string,
  graphqlUrl = EASSCAN_GRAPHQL,
): Promise<TimelineItem[]> {
  const query = `
    query($schemaId: String!) {
      attestations(
        where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
        orderBy: [{ time: desc }]
        take: 200
      ) {
        id
        attester
        recipient
        time
        txid
        refUID
        decodedDataJson
      }
    }
  `;
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { schemaId: schemaUid },
    }),
  });
  if (!res.ok) {
    throw new Error(`easscan GraphQL HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: {
      attestations?: Array<{
        id: string;
        attester: string;
        recipient: string;
        time: number;
        txid: string;
        refUID: string;
        decodedDataJson: string;
      }>;
    };
    errors?: unknown;
  };
  if (body.errors) {
    throw new Error(`easscan GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  const items: TimelineItem[] = [];
  for (const a of body.data?.attestations || []) {
    let decoded: Record<string, unknown> = {};
    try {
      const arr = JSON.parse(a.decodedDataJson) as Array<{
        name: string;
        value: { value: unknown };
      }>;
      for (const entry of arr) {
        decoded[entry.name] = unwrapDecoded(entry.value?.value);
      }
    } catch {
      decoded = { raw: a.decodedDataJson };
    }
    const repoVal = String(decoded.repo || "");
    if (
      repoVal === repo ||
      repoVal.endsWith("/" + repo) ||
      repoVal.includes(repo)
    ) {
      items.push({
        uid: a.id,
        attester: a.attester,
        recipient: a.recipient,
        time: a.time,
        txid: a.txid,
        refUID: a.refUID,
        decoded,
      });
    }
  }
  return items;
}

export async function findLatestUid(
  schemaUid: string,
  repo: string,
): Promise<string | undefined> {
  const items = await queryTimeline(schemaUid, repo);
  return items[0]?.uid;
}
