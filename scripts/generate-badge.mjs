#!/usr/bin/env node
/**
 * Build-time badge: query easscan for Proof of Vibe attestations and write
 * packages/web/public/badge.svg (static, works on Cloudflare Pages).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_UID =
  process.env.POV_SCHEMA_UID ||
  process.env.NEXT_PUBLIC_POV_SCHEMA_UID ||
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c";
const REPO = process.env.POV_REPO || "ajocircle-dev/proof-of-vibe";
const GRAPHQL =
  process.env.POV_EASSCAN_GRAPHQL ||
  "https://base-sepolia.easscan.org/graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../packages/web/public/badge.svg");

async function countAttestations() {
  const query = `
    query($schemaId: String!) {
      attestations(
        where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
        orderBy: [{ time: desc }]
        take: 200
      ) {
        id
        decodedDataJson
      }
    }
  `;
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { schemaId: SCHEMA_UID },
    }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  let n = 0;
  for (const a of body.data?.attestations || []) {
    try {
      const arr = JSON.parse(a.decodedDataJson);
      const decoded = {};
      for (const e of arr) decoded[e.name] = e.value?.value;
      const repoVal = String(decoded.repo || "");
      if (repoVal === REPO || repoVal.includes(REPO)) n++;
    } catch {
      /* ignore */
    }
  }
  return n;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgFor(count) {
  const label = "Proof of Vibe";
  const message = `${count} attested commit${count === 1 ? "" : "s"}`;
  const labelWidth = 92;
  const msgWidth = Math.max(118, 8 * message.length + 20);
  const total = labelWidth + msgWidth;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(message)}">
  <title>${escapeXml(label)}: ${escapeXml(message)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${msgWidth}" height="20" fill="#3dd68c"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelWidth + msgWidth / 2}" y="14">${escapeXml(message)}</text>
  </g>
</svg>
`;
}

const count = await countAttestations();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svgFor(count));
console.log(`Wrote ${outPath} (count=${count})`);
