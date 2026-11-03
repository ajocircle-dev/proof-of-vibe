/** Public GitHub API helpers (no auth, rate-limited). */

export type GithubCommit = {
  sha: string;
  treeSha: string;
  committedAt: number;
  message: string;
  htmlUrl: string;
};

export async function fetchLatestCommit(repo: string): Promise<GithubCommit> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits?per_page=1`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API ${res.status}: could not load commits for ${repo}`,
    );
  }
  const arr = (await res.json()) as Array<{
    sha: string;
    html_url: string;
    commit: {
      message: string;
      tree: { sha: string };
      committer?: { date?: string };
      author?: { date?: string };
    };
  }>;
  const c = arr[0];
  if (!c) throw new Error(`No commits found for ${repo}`);
  const date =
    c.commit.committer?.date || c.commit.author?.date || new Date().toISOString();
  return {
    sha: c.sha,
    treeSha: c.commit.tree.sha,
    committedAt: Math.floor(new Date(date).getTime() / 1000),
    message: c.commit.message.split("\n")[0] || "",
    htmlUrl: c.html_url,
  };
}

export async function fetchCommit(
  repo: string,
  sha: string,
): Promise<GithubCommit> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits/${sha}`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: commit ${sha} not found`);
  }
  const c = (await res.json()) as {
    sha: string;
    html_url: string;
    commit: {
      message: string;
      tree: { sha: string };
      committer?: { date?: string };
      author?: { date?: string };
    };
  };
  const date =
    c.commit.committer?.date || c.commit.author?.date || new Date().toISOString();
  return {
    sha: c.sha,
    treeSha: c.commit.tree.sha,
    committedAt: Math.floor(new Date(date).getTime() / 1000),
    message: c.commit.message.split("\n")[0] || "",
    htmlUrl: c.html_url,
  };
}
