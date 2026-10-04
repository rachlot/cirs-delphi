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
export function RatingRow({ item, poolMap, onRate, onCommentChange, onRemove }: Props) {
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
        <div className="grid grid-cols-9 gap-1">
          {SCALE.map((value) => {
            const selected = item.rating === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onRate(item.clientId, value)}
                aria-pressed={selected}
                className={`rounded-md border py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50"
                }`}
              >
                {value}
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
