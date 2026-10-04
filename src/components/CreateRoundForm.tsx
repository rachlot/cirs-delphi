"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNextRound } from "@/actions/admin";
import type { CategoryRatingStat, CustomCategoryStat } from "@/lib/aggregation";

export function CreateRoundForm({
  basedOnRoundId,
  suggestedTitle,
  categoryStats,
  customCategories,
  consensusMaxIqr,
}: {
  basedOnRoundId: string;
  suggestedTitle: string;
  categoryStats: CategoryRatingStat[];
  customCategories: CustomCategoryStat[];
  consensusMaxIqr: number;
}) {
  const [title, setTitle] = useState(suggestedTitle);
  const [note, setNote] = useState("");
  const [controversial, setControversial] = useState<Set<string>>(
    () =>
      new Set(
        categoryStats.filter((c) => c.iqr !== null && c.iqr > consensusMaxIqr).map((c) => c.categoryId)
      )
  );
  const [promoted, setPromoted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSet(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await createNextRound({
        basedOnRoundId,
        title,
        note,
        controversialCategoryIds: Array.from(controversial),
        promotedCustomLabels: Array.from(promoted),
      });
      if (res.ok && res.roundId) {
        router.push(`/admin/runden/${res.roundId}`);
      } else {
        setError(res.error ?? "Fehler beim Anlegen der Runde.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const ratedStats = categoryStats.filter((c) => c.n > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Titel der neuen Runde</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Zusätzlicher Hinweistext an Teilnehmende (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="z.B. Hinweise zum weiteren Vorgehen, Dank für die Beteiligung, offene Fragen …"
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Rückmeldung an Teilnehmende: als „kontrovers“ markieren
        </h2>
        <p className="mb-2 text-xs text-slate-400">
          Vorbelegt sind Kategorien mit einem Interquartilsabstand (IQR) größer als das Konsenskriterium
          ({consensusMaxIqr}). Du kannst die Auswahl anpassen.
        </p>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-3">
          {ratedStats.map((c) => (
            <label key={c.categoryId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={controversial.has(c.categoryId)}
                onChange={() => toggle(controversial, setControversial, c.categoryId)}
              />
              <span className="flex-1">{c.categoryName}</span>
              <span className="text-xs text-slate-400">
                Median {c.median}/9 · IQR {c.iqr} · n={c.n}
              </span>
            </label>
          ))}
          {ratedStats.length === 0 && <p className="text-sm text-slate-400">Keine Daten aus der Vorrunde.</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Eigene Kategorie-Vorschläge in den gemeinsamen Pool übernehmen
        </h2>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-3">
          {customCategories.map((c) => (
            <label key={c.normalizedLabel} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promoted.has(c.normalizedLabel)}
                onChange={() => toggle(promoted, setPromoted, c.normalizedLabel)}
              />
              <span className="flex-1">{c.displayLabel}</span>
              <span className="text-xs text-slate-400">
                {c.n}× vorgeschlagen, Median {c.median}/9 ({c.submitters.join(", ")})
              </span>
            </label>
          ))}
          {customCategories.length === 0 && (
            <p className="text-sm text-slate-400">Keine eigenen Vorschläge aus der Vorrunde.</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? "Wird angelegt …" : "Runde anlegen (als Entwurf)"}
      </button>
    </form>
  );
}
