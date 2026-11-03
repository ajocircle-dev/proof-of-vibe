import { AttestForm } from "../../components/attest-form";
import { ActionSnippet } from "../../components/action-snippet";

export default function AttestPage() {
  return (
    <main>
      <section className="hero">
        <p className="badge">Base Sepolia · your wallet · your gas</p>
        <h1>Attest your repo</h1>
        <p>
          Point at a public GitHub repo, connect an injected wallet, and post an
          EAS attestation on Base Sepolia. Come back to grow the attested commit
          streak and share a live badge.
        </p>
        <p className="meta">
          <a href="/">← Back to landing / verify</a>
        </p>
      </section>
      <AttestForm />
      <div style={{ height: "1rem" }} />
      <ActionSnippet />
      <p className="footer">
        Testnet only. Schema UID pinned in the README. Builder dogfood: bosso.
      </p>
    </main>
  );
}
