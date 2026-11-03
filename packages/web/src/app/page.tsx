import { LiveStatsBar } from "../components/live-stats";
import { ShareBadge } from "../components/share-badge";
import { VerifyClient } from "./verify-client";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="badge">Base Sepolia · EAS · ERC-8004</p>
        <h1>Proof of Vibe</h1>
        <p className="lead">
          Onchain provenance for AI-built commits. Attest a repo once, share a
          live badge, and grow a public trail judges can verify in seconds.
        </p>
        <p className="cta-row">
          <a className="btn-primary-link" href="/attest/">
            Attest your repo
          </a>
          <a className="btn-link" href="#verify">
            Verify a timeline
          </a>
          <a className="btn-link" href="#share">
            Get a badge
          </a>
        </p>
        <LiveStatsBar />
      </section>

      <div className="warn">
        An attestation is a signed claim by the builder, not cryptographic proof
        that an agent wrote the code. Counts below are read live from Base
        Sepolia via easscan GraphQL. No invented traction.
      </div>

      <section className="card why">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Why it matters for AI-built code
        </h2>
        <ul className="why-list">
          <li>
            <strong>Named agent.</strong> Each attestation can point at an
            ERC-8004 agent id plus the tool and builder.
          </li>
          <li>
            <strong>Commit + tree pinned.</strong> Git SHA-1 values are packed
            onchain so anyone can cross-check GitHub.
          </li>
          <li>
            <strong>Reason to return.</strong> Per-repo timelines and streaks
            grow as you keep shipping attested commits.
          </li>
        </ul>
      </section>

      <VerifyClient />

      <div style={{ height: "1rem" }} />
      <ShareBadge initialRepo="ajocircle-dev/proof-of-vibe" />

      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>How it works</h2>
        <ol className="steps">
          <li>Register the ProofOfVibe v1 EAS schema once on Base Sepolia.</li>
          <li>
            Attest from the web wallet flow, the <code>pov</code> CLI, or the
            GitHub Action after each commit (you pay testnet gas).
          </li>
          <li>
            Share the live badge and verify page so others can audit the trail.
          </li>
        </ol>
        <p className="meta">
          Builder: bosso · Repo:{" "}
          <a href="https://github.com/ajocircle-dev/proof-of-vibe">
            ajocircle-dev/proof-of-vibe
          </a>
          {" · "}
          <a href="/attest/">Start attesting</a>
        </p>
      </section>

      <p className="footer">
        Network: Base Sepolia (84532). IdentityRegistry:{" "}
        <code>0x8004A818…D9e</code>. No mainnet funds are used.
      </p>
    </main>
  );
}
