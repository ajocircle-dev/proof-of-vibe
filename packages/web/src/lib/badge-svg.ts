/** Pure SVG badge generator (browser + Pages Function). */

export function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function badgeSvg(opts: {
  count: number;
  label?: string;
}): string {
  const label = opts.label || "Proof of Vibe";
  const message = `${opts.count} attested commit${opts.count === 1 ? "" : "s"}`;
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

export function markdownBadge(repo: string, appUrl: string): string {
  const badge = `${appUrl}/badge?repo=${encodeURIComponent(repo)}`;
  const verify = `${appUrl}/?repo=${encodeURIComponent(repo)}`;
  return `[![Proof of Vibe](${badge})](${verify})`;
}
