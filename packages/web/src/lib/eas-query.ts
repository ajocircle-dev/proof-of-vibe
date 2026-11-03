import {
  DOGFOOD_REPO,
  EASSCAN_GRAPHQL,
  SCHEMA_UID,
} from "./constants";
import { bytes32ToGitSha, normalizeRepo, parseDecodedJson } from "./decode";

export type TimelineItem = {
  uid: string;
  time: number;
  attester: string;
  txid: string;
  decoded: Record<string, unknown>;
};

export type LiveStats = {
  totalAttestations: number;
  uniqueRepos: number;
  dogfoodAttestations: number;
  latestCommitSha: string | null;
  latestTime: number | null;
};

export async function fetchAllAttestations(
  schemaUid: string = SCHEMA_UID,
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
        time
        txid
        decodedDataJson
      }
    }
  `;
  const res = await fetch(graphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { schemaId: schemaUid } }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  const out: TimelineItem[] = [];
  for (const a of body.data?.attestations || []) {
    out.push({
      uid: a.id,
      time: a.time,
      attester: a.attester,
      txid: a.txid || "",
      decoded: parseDecodedJson(a.decodedDataJson),
    });
  }
  return out;
}

export function filterByRepo(
  items: TimelineItem[],
  repo: string,
): TimelineItem[] {
  const r = normalizeRepo(repo);
  return items.filter((it) => {
    const repoVal = String(it.decoded.repo || "");
    return repoVal === r || repoVal.includes(r);
  });
}

export async function fetchTimeline(
  schemaUid: string,
  repo: string,
): Promise<TimelineItem[]> {
  const all = await fetchAllAttestations(schemaUid);
  return filterByRepo(all, repo);
}

export function computeLiveStats(items: TimelineItem[]): LiveStats {
  const repos = new Set<string>();
  let dogfood = 0;
  let latestCommitSha: string | null = null;
  let latestTime: number | null = null;
  for (const it of items) {
    const repoVal = normalizeRepo(String(it.decoded.repo || ""));
    if (repoVal) repos.add(repoVal);
    if (repoVal === DOGFOOD_REPO || repoVal.includes(DOGFOOD_REPO)) {
      dogfood++;
    }
    if (latestTime === null || it.time > latestTime) {
      latestTime = it.time;
      latestCommitSha = bytes32ToGitSha(it.decoded.commitSha) || null;
    }
  }
  return {
    totalAttestations: items.length,
    uniqueRepos: repos.size,
    dogfoodAttestations: dogfood,
    latestCommitSha,
    latestTime,
  };
}

export function streakDays(items: TimelineItem[]): number {
  if (items.length === 0) return 0;
  const days = new Set(
    items.map((it) =>
      new Date(it.time * 1000).toISOString().slice(0, 10),
    ),
  );
  const sorted = [...days].sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]!);
    const cur = new Date(sorted[i]!);
    const diff = (prev.getTime() - cur.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
