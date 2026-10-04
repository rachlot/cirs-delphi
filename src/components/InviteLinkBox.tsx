"use client";

import { useState } from "react";

export function InviteLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API evtl. nicht verfügbar (z.B. kein HTTPS) – Nutzer:in kann den Link manuell markieren
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-600"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {copied ? "Kopiert!" : "Kopieren"}
      </button>
    </div>
  );
}
