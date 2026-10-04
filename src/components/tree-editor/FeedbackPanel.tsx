"use client";

import { useState } from "react";
import type { FeedbackSummary } from "@/lib/round-data";

export function FeedbackPanel({ feedback, roundNumber }: { feedback: FeedbackSummary; roundNumber: number }) {
  const [open, setOpen] = useState(true);
  const controversial = feedback.items.filter((i) => i.isControversial);
  const agreed = feedback.items.filter((i) => !i.isControversial);

  return (
    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-teal-900">
          Rückmeldung aus Runde {roundNumber - 1}
        </span>
        <span className="text-teal-700">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4 text-sm text-slate-700">
          {feedback.note && <p className="text-slate-600">{feedback.note}</p>}

          {agreed.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-800">Breite Zustimmung</p>
              <ul className="list-inside list-disc space-y-0.5">
                {agreed.map((item, i) => (
                  <li key={i}>
                    <span className="font-medium">{item.categoryName}:</span> {item.statText}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {controversial.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-amber-800">Noch kontrovers</p>
              <ul className="list-inside list-disc space-y-0.5">
                {controversial.map((item, i) => (
                  <li key={i}>
                    <span className="font-medium">{item.categoryName}:</span> {item.statText}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.newSuggestions.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-slate-800">Neu in den Pool aufgenommen</p>
              <ul className="list-inside list-disc space-y-0.5">
                {feedback.newSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
