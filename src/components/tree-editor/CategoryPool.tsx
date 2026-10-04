"use client";

import { useMemo, useState } from "react";
import type { PoolCategory } from "@/lib/round-data";

function PoolChip({ category, onAdd }: { category: PoolCategory; onAdd: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(category.id)}
      className="group flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm hover:border-teal-500 hover:bg-teal-50 hover:shadow"
      title="Zu meiner Auswahl hinzufügen"
    >
      <span aria-hidden className="text-teal-600">+</span>
      <span>{category.name}</span>
      {category.isWhoIcps && (
        <span className="rounded bg-teal-50 px-1 py-0.5 text-[10px] font-medium leading-none text-teal-700">
          WHO ICPS
        </span>
      )}
    </button>
  );
}

export function CategoryPool({
  pool,
  placedCategoryIds,
  onAdd,
}: {
  pool: PoolCategory[];
  placedCategoryIds: Set<string>;
  onAdd: (categoryId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const available = useMemo(
    () => pool.filter((c) => !placedCategoryIds.has(c.id)),
    [pool, placedCategoryIds]
  );

  function matches(c: PoolCategory) {
    if (!query.trim()) return true;
    return c.name.toLowerCase().includes(query.trim().toLowerCase());
  }

  const visible = available.filter(matches);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Kategorien <span className="font-normal text-slate-400">({available.length} verfügbar)</span>
        </h2>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kategorie suchen …"
        className="mb-3 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      />
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visible.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((c) => (
              <PoolChip key={c.id} category={c} onAdd={onAdd} />
            ))}
          </div>
        ) : available.length === 0 ? (
          <p className="text-sm text-slate-400">
            Du hast bereits alle Kategorien in deine Auswahl übernommen. Du kannst sie unten jederzeit wieder
            entfernen.
          </p>
        ) : (
          <p className="text-sm text-slate-400">Keine Kategorie passt zur Suche.</p>
        )}
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-400">
        Klicke auf eine Kategorie, um sie in deine Auswahl rechts zu übernehmen und zu bewerten.
      </p>
    </div>
  );
}
