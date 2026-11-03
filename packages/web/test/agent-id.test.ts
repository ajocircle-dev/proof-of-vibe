import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decodeAgentIdFromLogs,
  fakeRegisteredLog,
  fakeTransferMintLog,
} from "../src/lib/agent-id.ts";

const REG = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
const OWNER = "0x46CcE6B05177dcc1961aC1c0Ca0Db1EA95e2480a" as const;

describe("decodeAgentIdFromLogs", () => {
  it("reads Registered(agentId, agentURI, owner)", () => {
    const log = fakeRegisteredLog({
      registry: REG,
      owner: OWNER,
      agentId: 10554n,
      agentURI: "https://proof-of-vibe.pages.dev/.well-known/agent-registration.json",
    });
    assert.equal(decodeAgentIdFromLogs([log], REG), 10554n);
  });

  it("falls back to Transfer mint tokenId", () => {
    const log = fakeTransferMintLog({
      registry: REG,
      to: OWNER,
      tokenId: 42n,
    });
    assert.equal(decodeAgentIdFromLogs([log], REG), 42n);
  });

  it("prefers Registered over Transfer when both present", () => {
    const logs = [
      fakeTransferMintLog({ registry: REG, to: OWNER, tokenId: 1n }),
      fakeRegisteredLog({
        registry: REG,
        owner: OWNER,
        agentId: 99n,
        agentURI: "https://example.com/a.json",
      }),
    ];
    assert.equal(decodeAgentIdFromLogs(logs, REG), 99n);
  });

  it("returns null when no matching logs", () => {
    assert.equal(decodeAgentIdFromLogs([], REG), null);
  });
});
