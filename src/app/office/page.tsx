"use client";

import dynamic from "next/dynamic";

const OfficeGame = dynamic(() => import("@/components/OfficeGame"), { ssr: false });

export default function OfficePage() {
  return (
    <div>
      <h1>Office floor (global)</h1>
      <p className="muted">
        Every agent across all active tasks. Run reviews from any task to watch the team work.
      </p>
      <OfficeGame scope={{ type: "global" }} />
    </div>
  );
}
