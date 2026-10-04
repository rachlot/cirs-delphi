"use client";

import { useMemo, useState } from "react";
import type { PoolCategory, FeedbackSummary } from "@/lib/round-data";
import type { RatedItemInput } from "@/lib/validation";
import {
  addCategoryItem,
  addCustomItem,
  collectPlacedCategoryIds,
  getPreselected,
  removeItem,
  updateItem,
  withPreselected,
} from "@/lib/tree-client";
import { CategoryPool } from "./CategoryPool";
import { RatingRow } from "./TreeNodeView";
import { FeedbackPanel } from "./FeedbackPanel";

export interface RatingEditorProps {
  pool: PoolCategory[];
  feedback: FeedbackSummary | null;
  roundNumber: number;
  initialItems?: RatedItemInput[];
  previousRatings?: Record<string, number>;
  disabled?: boolean;
  onSubmit: (items: RatedItemInput[]) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Einfaches Klick-Auswahl-Formular: Hauptkategorien aus dem Pool anklicken
 * (oder eigene ergänzen), dann jede ausgewählte Kategorie auf einer 1-9-Skala
 * (RAND/UCLA-Standard) bewerten und optional kommentieren. Ersetzt den
 * früheren Drag-&-Drop-Baum-Editor (bewusst vereinfacht, keine Hierarchie mehr).
 */
export function RatingEditor({
  pool,
  feedback,
  roundNumber,
  initialItems,
  previousRatings = {},
  disabled,
  onSubmit,
}: RatingEditorProps) {
  const preselected = useMemo(() => getPreselected(feedback, pool), [feedback, pool]);
  const [items, setItems] = useState<RatedItemInput[]>(() =>
    initialItems ?? withPreselected([], preselected.keys())
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  const poolMap = useMemo(() => {
    const m = new Map<string, { name: string; isWhoIcps: boolean }>();
    for (const c of pool) m.set(c.id, { name: c.name, isWhoIcps: c.isWhoIcps });
    return m;
  }, [pool]);

  const placedCategoryIds = useMemo(() => collectPlacedCategoryIds(items), [items]);
  const unratedCount = items.filter((i) => i.rating === null).length;

  function handleAddFromPool(categoryId: string) {
    setItems((prev) => addCategoryItem(prev, categoryId));
  }

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customLabel.trim()) return;
    setItems((prev) => addCustomItem(prev, customLabel));
    setCustomLabel("");
  }

  function handleRemove(clientId: string) {
    setItems((prev) => removeItem(prev, clientId));
  }

  function handleRate(clientId: string, rating: number) {
    setItems((prev) => updateItem(prev, clientId, { rating }));
  }

  function handleCommentChange(clientId: string, comment: string) {
    setItems((prev) => updateItem(prev, clientId, { comment: comment.trim() || null }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await onSubmit(items);
      setResult(res);
      if (res.ok && typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (disabled) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Diese Runde ist abgeschlossen. Einreichungen sind nicht mehr möglich.
      </p>
    );
  }

  const canSubmit = items.length > 0 && unratedCount === 0;

  return (
    <div>
      {feedback && <FeedbackPanel feedback={feedback} roundNumber={roundNumber} />}

      {result?.ok && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Danke! Deine Bewertungen wurden gespeichert. Du kannst sie bis zum Ende dieser Runde jederzeit über
          denselben Link erneut öffnen und anpassen.
        </div>
      )}
      {result && !result.ok && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {result.error ?? "Beim Speichern ist ein Fehler aufgetreten."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:max-h-[70vh]">
          <CategoryPool pool={pool} placedCategoryIds={placedCategoryIds} onAdd={handleAddFromPool} />

          <form onSubmit={handleAddCustom} className="mt-3 flex flex-col gap-1.5 border-t border-slate-200 pt-3">
            <label className="text-xs font-medium text-slate-500">Eigene Kategorie ergänzen</label>
            <div className="flex gap-1.5">
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="z.B. Übergabefehler …"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Eigene Kategorien sind nur in deiner eigenen Einreichung sichtbar und werden erst nach Prüfung
              durch die Organisation in den gemeinsamen Pool übernommen.
            </p>
          </form>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Meine Bewertungen</h2>
            <span className="text-xs text-slate-400">
              {items.length === 0 ? "Noch leer" : `${items.length} ausgewählt${unratedCount > 0 ? ` · ${unratedCount} noch ohne Bewertung` : ""}`}
            </span>
          </div>

          {preselected.size > 0 && (
            <p className="mb-2 text-xs text-slate-500">
              Die Kategorien aus Runde {roundNumber - 1} sind vorausgewählt und können abgewählt werden.{" "}
              <span className="rounded border border-amber-400 bg-amber-50 px-1 text-amber-800">Orange</span>{" "}
              = Median der Gruppe, <span className="text-sky-600">●</span> = deine Bewertung in Runde{" "}
              {roundNumber - 1}.
            </p>
          )}

          {items.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
              Kategorien links anklicken, um sie hier zu bewerten.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <RatingRow
                  key={item.clientId}
                  item={item}
                  poolMap={poolMap}
                  previous={
                    item.categoryId && (preselected.has(item.categoryId) || item.categoryId in previousRatings)
                      ? {
                          roundNumber: roundNumber - 1,
                          median: preselected.get(item.categoryId) ?? null,
                          ownRating: previousRatings[item.categoryId] ?? null,
                        }
                      : undefined
                  }
                  onRate={handleRate}
                  onCommentChange={handleCommentChange}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={handleSubmit}
              title={!canSubmit && items.length > 0 ? "Bitte alle ausgewählten Kategorien bewerten" : undefined}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Wird gespeichert …" : "Einreichung speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
