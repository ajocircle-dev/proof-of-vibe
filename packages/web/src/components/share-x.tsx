import { xIntentUrl } from "../lib/share";

export function ShareOnX({ text, label = "Share on X" }: { text: string; label?: string }) {
  return (
    <a className="btn-x" href={xIntentUrl(text)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
