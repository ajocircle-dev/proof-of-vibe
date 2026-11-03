"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  /** Short display; defaults to truncated value. */
  display?: string;
  href?: string;
};

export function CopyRow({ label, value, display, href }: Props) {
  const [copied, setCopied] = useState(false);
  const shown = display || value;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="copy-row">
      <div className="copy-row-label">{label}</div>
      <div className="copy-row-body">
        {href ? (
          <a
            className="copy-row-value"
            href={href}
            target="_blank"
            rel="noreferrer"
            title={value}
          >
            {shown}
          </a>
        ) : (
          <code className="copy-row-value" title={value}>
            {shown}
          </code>
        )}
        <button
          type="button"
          className="copy-row-btn"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
