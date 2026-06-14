import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI Review Task System",
  description: "AI agent team that reviews UI — specialist reviewers + QA, with a 2D office view.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            🧪 UI Review <span className="brand-dim">Task System</span>
          </Link>
          <nav className="topnav">
            <Link href="/">Dashboard</Link>
            <Link href="/office">Office (global)</Link>
            <Link href="/settings/mcp">MCP Config</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
