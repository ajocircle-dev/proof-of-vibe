import type { Metadata } from "next";
import "./globals.css";

const DESC =
  "Vibestarter proves an agent built your app at launch. Proof of Vibe proves you kept building it, commit by commit, on Base.";

export const metadata: Metadata = {
  metadataBase: new URL("https://proof-of-vibe.pages.dev"),
  title: "Proof of Vibe",
  description: DESC,
  openGraph: {
    title: "Proof of Vibe",
    description: DESC,
    url: "https://proof-of-vibe.pages.dev",
    siteName: "Proof of Vibe",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Proof of Vibe: per-commit proof on Base" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Proof of Vibe",
    description: DESC,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
