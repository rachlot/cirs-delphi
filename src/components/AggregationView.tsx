import type { RoundAggregation } from "@/lib/aggregation";

export function AggregationView({ aggregation }: { aggregation: RoundAggregation }) {
  const {
    participantCount,
    consensusMaxIqr,
    categoryStats,
    customCategories,
    commentsByCategoryId,
    commentsByCustomLabel,
  } = aggregation;

  const ratedCategories = categoryStats.filter((c) => c.n > 0);
  const unratedCategories = categoryStats.filter((c) => c.n === 0);

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <strong>{participantCount}</strong> Einreichung(en) in dieser Runde · Konsenskriterium: IQR ≤{" "}
        <strong>{consensusMaxIqr}</strong> (RAND/UCLA, 1-9-Skala)
        {aggregation.overallConsensusPercent !== null && (
          <>
            {" "}
            · Konsens erreicht bei <strong>{aggregation.overallConsensusPercent}%</strong> der bewerteten
            Kategorien
          </>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Bewertung je Kategorie (Median, Interquartilsabstand)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Kategorie</th>
                <th className="px-3 py-2">n</th>
                <th className="px-3 py-2">Median</th>
                <th className="px-3 py-2">Mittelwert</th>
                <th className="px-3 py-2">Q1–Q3</th>
                <th className="px-3 py-2">IQR</th>
                <th className="px-3 py-2">Konsens</th>
              </tr>
            </thead>
            <tbody>
              {ratedCategories.map((c) => (
                <tr key={c.categoryId} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-medium">
                    {c.categoryName}
                    {c.isWhoIcps && (
                      <span className="ml-1.5 rounded bg-teal-50 px-1 py-0.5 text-[10px] font-medium text-teal-700">
                        WHO ICPS
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{c.n}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{c.median}</td>
                  <td className="px-3 py-2 text-slate-600">{c.mean}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {c.q1} – {c.q3}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{c.iqr}</td>
                  <td className="px-3 py-2">
                    {c.consensusReached === null ? (
                      "–"
                    ) : c.consensusReached ? (
                      <span className="font-medium text-green-700">Konsens</span>
                    ) : (
                      <span className="font-medium text-amber-700">kontrovers</span>
                    )}
                  </td>
                </tr>
              ))}
              {ratedCategories.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Noch keine Einreichungen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {unratedCategories.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {unratedCategories.length} Kategorie(n) wurden von niemandem bewertet:{" "}
            {unratedCategories.map((c) => c.categoryName).join(", ")}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Neu vorgeschlagene (eigene) Kategorien der Teilnehmenden
        </h2>
        {customCategories.length === 0 ? (
          <p className="text-sm text-slate-400">Keine eigenen Kategorien wurden in dieser Runde vorgeschlagen.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Vorschlag</th>
                  <th className="px-3 py-2">n</th>
                  <th className="px-3 py-2">Median</th>
                  <th className="px-3 py-2">IQR</th>
                  <th className="px-3 py-2">Vorgeschlagen von</th>
                </tr>
              </thead>
              <tbody>
                {customCategories.map((c) => (
                  <tr key={c.normalizedLabel} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{c.displayLabel}</td>
                    <td className="px-3 py-2">{c.n}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{c.median}</td>
                    <td className="px-3 py-2 text-slate-600">{c.iqr}</td>
                    <td className="px-3 py-2 text-slate-600">{c.submitters.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Kommentare gebündelt nach Kategorie</h2>
        <div className="space-y-3">
          {ratedCategories
            .filter((c) => commentsByCategoryId[c.categoryId]?.length)
            .map((c) => (
              <div key={c.categoryId} className="rounded-md border border-slate-200 p-3">
                <p className="mb-1.5 text-sm font-medium text-slate-800">{c.categoryName}</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {commentsByCategoryId[c.categoryId].map((entry, i) => (
                    <li key={i}>
                      <span className="font-medium">{entry.participantName}:</span> {entry.comment}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {customCategories
            .filter((c) => commentsByCustomLabel[c.normalizedLabel]?.length)
            .map((c) => (
              <div key={c.normalizedLabel} className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
                <p className="mb-1.5 text-sm font-medium text-slate-800">{c.displayLabel} (eigene Kategorie)</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  {commentsByCustomLabel[c.normalizedLabel].map((entry, i) => (
                    <li key={i}>
                      <span className="font-medium">{entry.participantName}:</span> {entry.comment}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {Object.keys(commentsByCategoryId).length === 0 && Object.keys(commentsByCustomLabel).length === 0 && (
            <p className="text-sm text-slate-400">Keine Kommentare in dieser Runde.</p>
          )}
        </div>
      </section>
    </div>
  );
}
