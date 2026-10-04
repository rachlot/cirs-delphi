"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRoundStatus } from "@/actions/admin";

const STATUS_ORDER = ["draft", "open", "closed"] as const;
type Status = (typeof STATUS_ORDER)[number];

const LABELS: Record<Status, string> = {
  draft: "Entwurf",
  open: "Offen",
  closed: "Abgeschlossen",
};

export function RoundStatusControls({ roundId, status }: { roundId: string; status: Status }) {
  const [current, setCurrent] = useState<Status>(status);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: Status) {
    if (next === "closed" && !window.confirm("Runde wirklich abschließen? Danach sind keine Einreichungen mehr möglich.")) {
      return;
    }
    startTransition(async () => {
      await updateRoundStatus(roundId, next);
      setCurrent(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending || s === current}
          onClick={() => change(s)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            s === current
              ? "bg-teal-600 text-white"
              : "border border-slate-300 text-slate-600 hover:bg-slate-50"
          } disabled:opacity-60`}
        >
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}
