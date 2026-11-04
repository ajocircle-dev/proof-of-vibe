import { LiveStatsBar } from "../components/live-stats";
import { ShareBadge } from "../components/share-badge";
import { VerifyClient } from "./verify-client";
import { ShareOnX } from "../components/share-x";
import { DOGFOOD_REPO } from "../lib/constants";
import { shareText } from "../lib/share";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="badge">Built for Vibestarter Vibeathon 02 · Base Sepolia · EAS · ERC-8004</p>
        <h1>Proof of Vibe</h1>
        <p className="lead pitch">
          Vibestarter proves an agent built your app at launch. Proof of Vibe
          proves you kept building it, commit by commit, on Base.
        </p>
        <p className="meta hero-sub">
          Every push signs an EAS attestation: repo, commit, agent. Backers get a
          live trail to check before each tranche.
        </p>
        <p className="cta-row">
          <a className="btn-primary-link" href="/attest/">
            Attest your repo
          </a>
          <a className="btn-link" href="/tranche/">
            Tranche evidence
          </a>
          <a className="btn-link" href="#share">
            Add your badge
          </a>
          <ShareOnX text={shareText(DOGFOOD_REPO, "landing")} />
        </p>
        <LiveStatsBar />
      </section>

      <div className="warn">
        An attestation is a signed claim by the builder, not cryptographic proof
        that an agent wrote the code. Counts are read live from Base Sepolia via
        easscan GraphQL.
      </div>

      <section className="card why">
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          Launch capsule, then continuous proof
        </h2>
        <ul className="why-list">
          <li>
            <strong>At launch.</strong> Vibestarter seals an Origin Capsule:
            founder, ERC-8004 agent, build artifact.
          </li>
          <li>
            <strong>After launch.</strong> Proof of Vibe attests each commit on
            Base, tied to the same agent id.
          </li>
          <li>
            <strong>Before each tranche.</strong> Holders open the{" "}
            <a href="/tranche/">tranche panel</a> during the 72h challenge window
            and see what shipped.
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
