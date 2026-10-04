"use client";

import { useState } from "react";
import type { RatedItemInput } from "@/lib/validation";

export interface PoolLookupEntry {
  name: string;
  isWhoIcps: boolean;
}

interface Props {
  item: RatedItemInput;
  poolMap: Map<string, PoolLookupEntry>;
  // Gesetzt bei Kategorien aus der Vorrunde: Gruppen-Median und eigene Bewertung werden markiert.
  previous?: { roundNumber: number; median: number | null; ownRating: number | null };
  onRate: (clientId: string, rating: number) => void;
  onCommentChange: (clientId: string, comment: string) => void;
  onRemove: (clientId: string) => void;
}

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Eine Zeile der (flachen) persönlichen Auswahlliste: Kategorie-Label +
 * 1-9-Bewertungsskala (RAND/UCLA-Standard: Wichtigkeit/Sicherheitsrelevanz)
 * + optionaler Kommentar + Entfernen. Ersetzt die frühere Baum-Knoten-Ansicht
 * (kein Drag & Drop, keine Eltern-Kind-Beziehung mehr).
 */
/** Skalenwerte, die den Median markieren: bei x,5 beide Nachbarn. */
function medianValues(median: number | null): number[] {
  if (median === null) return [];
  return Number.isInteger(median) ? [median] : [Math.floor(median), Math.ceil(median)];
}

function formatMedian(median: number): string {
  return median.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export function RatingRow({ item, poolMap, previous, onRate, onCommentChange, onRemove }: Props) {
  const medianMarks = medianValues(previous?.median ?? null);
  const category = item.categoryId ? poolMap.get(item.categoryId) : undefined;
  const isWhoIcps = !!category?.isWhoIcps;
  const label = item.categoryId ? category?.name ?? "(unbekannte Kategorie)" : item.customLabel ?? "";
  const [commentOpen, setCommentOpen] = useState(!!item.comment);

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {isWhoIcps && (
          <span className="rounded bg-teal-50 px-1 py-0.5 text-[10px] font-medium leading-none text-teal-700">
            WHO ICPS
          </span>
        )}
        {previous && (
          <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium leading-none text-slate-600">
            aus Runde {previous.roundNumber}
          </span>
        )}
        {!item.categoryId && (
          <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium leading-none text-amber-700">
            eigene Kategorie
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="Kommentar hinzufügen/bearbeiten"
            onClick={() => setCommentOpen((v) => !v)}
            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          >
            💬
          </button>
          <button
            type="button"
            title="Entfernen"
            onClick={() => onRemove(item.clientId)}
            className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>1 · niedrige Wichtigkeit / Sicherheitsrelevanz</span>
          <span>9 · sehr hohe Wichtigkeit / Sicherheitsrelevanz</span>
        </div>
        {previous && (previous.median !== null || previous.ownRating !== null) && (
          <p className="mb-1 flex flex-wrap gap-x-3 text-[11px]">
            {previous.median !== null && (
              <span className="text-amber-700">
                Median Runde {previous.roundNumber}: {formatMedian(previous.median)}
              </span>
            )}
            {previous.ownRating !== null && (
              <span className="text-sky-700">
                <span className="text-sky-600">●</span> Deine Bewertung Runde {previous.roundNumber}:{" "}
                {previous.ownRating}
              </span>
            )}
          </p>
        )}
        <div className="grid grid-cols-9 gap-1">
          {SCALE.map((value) => {
            const selected = item.rating === value;
            const isMedian = medianMarks.includes(value);
            const isOwnPrevious = previous?.ownRating === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onRate(item.clientId, value)}
                aria-pressed={selected}
                title={
                  previous && (isMedian || isOwnPrevious)
                    ? [isMedian && "Median", isOwnPrevious && "deine Bewertung"]
                        .filter(Boolean)
                        .join(" · ") + ` Runde ${previous.roundNumber}`
                    : undefined
                }
                className={`relative rounded-md border py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? `border-teal-600 bg-teal-600 text-white${isMedian ? " ring-2 ring-amber-400 ring-offset-1" : ""}`
                    : isMedian
                      ? "border-amber-400 bg-amber-50 text-amber-800 hover:border-teal-400 hover:bg-teal-50"
                      : "border-slate-300 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50"
                }`}
              >
                {value}
                {isOwnPrevious && (
                  <span
                    aria-hidden
                    className={`absolute right-1 top-0.5 text-[8px] leading-none ${selected ? "text-white" : "text-sky-600"}`}
                  >
                    ●
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {item.rating === null && (
          <p className="mt-1 text-[11px] text-amber-600">Bitte bewerten, bevor du einreichst.</p>
        )}
      </div>

      {commentOpen && (
        <div className="mt-2">
          <textarea
            defaultValue={item.comment ?? ""}
            onBlur={(e) => onCommentChange(item.clientId, e.target.value)}
            placeholder="Begründung, Unschärfe, Umbenennungsvorschlag, Abgrenzungsproblem …"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      )}
    </li>
  );
}
