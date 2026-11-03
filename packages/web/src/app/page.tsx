import { VerifyClient } from "./verify-client";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="badge">Base Sepolia · EAS · ERC-8004</p>
        <h1>Proof of Vibe</h1>
        <p>
          Onchain provenance for AI-built apps. Each commit can carry an EAS
          attestation naming the ERC-8004 agent, the commit and tree hashes, a
          session commitment, and the builder. Verify any repo timeline below.
        </p>
        <p className="meta">
          <a href="/badge.svg">
            <img
              src="/badge.svg"
              alt="Proof of Vibe attestation badge"
              height={20}
            />
          </a>
        </p>
      </section>

      <div className="warn">
        An attestation is a signed claim by the builder, not cryptographic proof
        that an agent wrote the code. Treat session and artifact hashes as
        commitments the builder can reveal later.
      </div>

      <VerifyClient />

      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>How it works</h2>
        <ol
          style={{
            color: "var(--muted)",
            lineHeight: 1.6,
            paddingLeft: "1.2rem",
          }}
        >
          <li>Register the ProofOfVibe v1 EAS schema once on Base Sepolia.</li>
          <li>
            Run <code>pov attest</code> (or the GitHub Action) after each
            commit.
          </li>
          <li>
            Open this page with a GitHub repo (optional{" "}
            <code>?uid=0x...</code>) to see the attested timeline.
          </li>
        </ol>
        <p className="meta">
          Builder: bosso · Repo:{" "}
          <a href="https://github.com/ajocircle-dev/proof-of-vibe">
            ajocircle-dev/proof-of-vibe
          </a>
        </p>
      </section>

      <p className="footer">
        Network: Base Sepolia (84532). IdentityRegistry:{" "}
        <code>0x8004A818…D9e</code>. No mainnet funds are used.
      </p>
    </main>
  );
}
