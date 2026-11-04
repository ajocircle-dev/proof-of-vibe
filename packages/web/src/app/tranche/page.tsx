import type { Metadata } from "next";
import { TrancheClient } from "./tranche-client";

export const metadata: Metadata = {
  title: "Tranche evidence | Proof of Vibe",
  description:
    "Concept mock: commits attested on Base since the last Vibestarter-style tranche, from live EAS data.",
};

export default function TranchePage() {
  return (
    <main>
      <p className="meta"><a href="/">Proof of Vibe</a> / Tranche evidence</p>
      <div className="mock-label">
        Concept integration mock. Not an official Vibestarter feature.
      </div>
      <TrancheClient />
    </main>
  );
}
