import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSchemaUid } from "../src/eas.js";
import { SCHEMA_UID } from "../src/constants.js";

describe("computeSchemaUid", () => {
  it("matches the pinned ProofOfVibe v1 UID", () => {
    assert.equal(computeSchemaUid().toLowerCase(), SCHEMA_UID.toLowerCase());
  });
});
