/**
 * Decode a newly registered ERC-8004 agentId from a tx receipt's logs.
 * Prefers Registered(agentId, agentURI, owner); falls back to ERC-721 Transfer
 * from the zero address (mint), where tokenId is the agentId.
 */
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiItem,
  parseAbiParameters,
  type Hex,
  type Log,
} from "viem";

const REGISTERED = parseAbiItem(
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
);
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

const ZERO =
  "0x0000000000000000000000000000000000000000" as const;

export type ReceiptLog = { address: Hex; topics: Hex[] | [Hex, ...Hex[]]; data: Hex };

export function decodeAgentIdFromLogs(
  logs: readonly ReceiptLog[],
  registryAddress?: string,
): bigint | null {
  const reg = registryAddress?.toLowerCase();

  for (const log of logs) {
    if (reg && log.address.toLowerCase() !== reg) continue;
    try {
      const decoded = decodeEventLog({
        abi: [REGISTERED],
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName === "Registered") {
        return decoded.args.agentId as bigint;
      }
    } catch {
      /* not Registered */
    }
  }

  for (const log of logs) {
    if (reg && log.address.toLowerCase() !== reg) continue;
    try {
      const decoded = decodeEventLog({
        abi: [TRANSFER],
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (
        decoded.eventName === "Transfer" &&
        String(decoded.args.from).toLowerCase() === ZERO
      ) {
        return decoded.args.tokenId as bigint;
      }
    } catch {
      /* not Transfer */
    }
  }

  return null;
}

/** Test helper: Transfer mint log. */
export function fakeTransferMintLog(opts: {
  registry: Hex;
  to: Hex;
  tokenId: bigint;
}): ReceiptLog {
  const topics = encodeEventTopics({
    abi: [TRANSFER],
    eventName: "Transfer",
    args: {
      from: ZERO,
      to: opts.to,
      tokenId: opts.tokenId,
    },
  });
  return {
    address: opts.registry,
    topics: topics as [Hex, ...Hex[]],
    data: "0x",
  };
}

/** Test helper: Registered event log. */
export function fakeRegisteredLog(opts: {
  registry: Hex;
  owner: Hex;
  agentId: bigint;
  agentURI: string;
}): ReceiptLog {
  const topics = encodeEventTopics({
    abi: [REGISTERED],
    eventName: "Registered",
    args: {
      agentId: opts.agentId,
      owner: opts.owner,
    },
  });
  const data = encodeAbiParameters(parseAbiParameters("string"), [
    opts.agentURI,
  ]);
  return {
    address: opts.registry,
    topics: topics as [Hex, ...Hex[]],
    data,
  };
}
