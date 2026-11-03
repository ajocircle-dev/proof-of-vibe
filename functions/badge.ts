/**
 * Cloudflare Pages Function: GET /badge?repo=owner/name
 * Returns a live SVG badge with attested commit count from easscan GraphQL.
 */

const SCHEMA_UID =
  "0x7a968c34610d29ed20dc07212a27244646f52089cb1fa7c4f902f6b2bde8818c";
const GRAPHQL = "https://base-sepolia.easscan.org/graphql";
const DEFAULT_REPO = "ajocircle-dev/proof-of-vibe";

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRepo(input: string): string {
  let s = input.trim();
  const m = s.match(/github\.com\/([^/]+\/[^/#?]+)/);
  if (m) s = m[1]!;
  return s.replace(/\.git$/, "").replace(/\/$/, "");
}

function badgeSvg(count: number): string {
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
</svg>`;
}

async function countForRepo(repo: string): Promise<number> {
  const query = `
    query($schemaId: String!) {
      attestations(
        where: { schemaId: { equals: $schemaId }, revoked: { equals: false } }
        orderBy: [{ time: desc }]
        take: 200
      ) { decodedDataJson }
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
  const body = (await res.json()) as {
    data?: { attestations?: Array<{ decodedDataJson: string }> };
  };
  let n = 0;
  for (const a of body.data?.attestations || []) {
    try {
      const arr = JSON.parse(a.decodedDataJson) as Array<{
        name: string;
        value: { value: unknown };
      }>;
      const decoded: Record<string, unknown> = {};
      for (const e of arr) decoded[e.name] = e.value?.value;
      const repoVal = String(decoded.repo || "");
      if (repoVal === repo || repoVal.includes(repo)) n++;
    } catch {
      /* ignore */
    }
  }
  return n;
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const repo = normalizeRepo(url.searchParams.get("repo") || DEFAULT_REPO);
  try {
    const count = await countForRepo(repo);
    return new Response(badgeSvg(count), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(badgeSvg(0).replace(
      "0 attested commits",
      "error",
    ), {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "x-pov-error": msg.slice(0, 120),
        "cache-control": "no-store",
      },
    });
  }
};
