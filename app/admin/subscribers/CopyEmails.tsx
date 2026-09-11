"use client";

import { useState } from "react";

export function CopyEmails({ emails }: { emails: string[] }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { try { navigator.clipboard.writeText(emails.join(", ")); setDone(true); setTimeout(() => setDone(false), 1800); } catch {} }}
      className="dc-btn dc-btn-solid"
    >
      {done ? "✓ Copied" : `Copy all (${emails.length})`}
    </button>
  );
}
