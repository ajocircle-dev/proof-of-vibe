"use client";

import { useEffect, useState } from "react";
import {
  computeLiveStats,
  fetchAllAttestations,
  streakDays,
  type LiveStats,
} from "../lib/eas-query";
import { DOGFOOD_REPO } from "../lib/constants";

export function LiveStatsBar() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllAttestations()
      .then((items) => {
        setStats(computeLiveStats(items));
        const dog = items.filter((it) =>
          String(it.decoded.repo || "").includes(DOGFOOD_REPO),
        );
        setStreak(streakDays(dog));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <p className="meta" role="alert">
        Could not load live counts: {error}
      </p>
    );
  }
  if (!stats) {
    return <p className="meta">Loading live counts from Base Sepolia…</p>;
  }

  return (
    <div className="stats-grid" aria-live="polite">
      <div className="stat">
        <div className="stat-n">{stats.totalAttestations}</div>
        <div className="stat-l">onchain attestations</div>
      </div>
      <div className="stat">
        <div className="stat-n">{stats.uniqueRepos}</div>
        <div className="stat-l">repos with a trail</div>
      </div>
      <div className="stat">
        <div className="stat-n">{stats.dogfoodAttestations}</div>
        <div className="stat-l">dogfood commits</div>
      </div>
      <div className="stat">
        <div className="stat-n">{streak}</div>
        <div className="stat-l">day streak (dogfood)</div>
      </div>
    </div>
  );
}
