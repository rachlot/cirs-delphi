import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/db";
import { rounds, submissions, settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminNav } from "@/components/AdminNav";
import { seedIfEmpty } from "@/db/seed-data";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf (nicht sichtbar)",
  open: "Offen für Einreichungen",
  closed: "Abgeschlossen",
};

export default async function AdminDashboardPage() {
  await requireAdminPage();
  // Frisch bereitgestellte Datenbank: Runde 1 und Seed-Taxonomie beim ersten Aufruf anlegen.
  await seedIfEmpty();

  const allRounds = await db.select().from(rounds).orderBy(rounds.roundNumber);
  const projectSettings = await db.query.settings.findFirst({ where: eq(settings.id, 1) });

  const counts = await Promise.all(
    allRounds.map(async (r) => {
      const subs = await db.select().from(submissions).where(eq(submissions.roundId, r.id));
      return { roundId: r.id, count: subs.filter((s) => s.status === "submitted").length };
    })
  );
  const countByRoundId = new Map(counts.map((c) => [c.roundId, c.count]));

  const latestRound = allRounds[allRounds.length - 1];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">
          {projectSettings?.projectName ?? "CIRS-Kategorien Delphi-Verfahren"}
        </h1>
        {latestRound && (
          <Link
            href={`/admin/runden/neu?basedOn=${latestRound.id}`}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            + Neue Runde anlegen
          </Link>
        )}
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Konsenskriterium: IQR ≤ {projectSettings?.consensusMaxIqr ?? "–"} (RAND/UCLA, 1-9-Skala) · Maximale
        Rundenzahl: {projectSettings?.maxRounds ?? "unbegrenzt"}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Runde</th>
              <th className="px-4 py-2">Titel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Einreichungen</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allRounds.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{r.roundNumber}</td>
                <td className="px-4 py-2">{r.title}</td>
                <td className="px-4 py-2">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="px-4 py-2">{countByRoundId.get(r.id) ?? 0}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/runden/${r.id}`} className="text-teal-700 hover:underline">
                    Öffnen →
                  </Link>
                </td>
              </tr>
            ))}
            {allRounds.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Noch keine Runde angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
