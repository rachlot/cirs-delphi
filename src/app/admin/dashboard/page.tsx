import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/db";
import { rounds, submissions, settings } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { AdminNav } from "@/components/AdminNav";
import { seedIfEmpty } from "@/db/seed-data";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf (nicht sichtbar)",
  open: "Offen für Einreichungen",
  closed: "Abgeschlossen",
};

export default async function AdminDashboardPage() {
  await requireAdminPage();

  // Runden inkl. Einreichungszahl in einer Abfrage, Einstellungen parallel dazu.
  const loadRounds = () =>
    db
      .select({
        id: rounds.id,
        roundNumber: rounds.roundNumber,
        title: rounds.title,
        status: rounds.status,
        submittedCount: sql<number>`count(${submissions.id}) filter (where ${submissions.status} = 'submitted')`.mapWith(Number),
      })
      .from(rounds)
      .leftJoin(submissions, eq(submissions.roundId, rounds.id))
      .groupBy(rounds.id)
      .orderBy(rounds.roundNumber);

  let [allRounds, projectSettings] = await Promise.all([
    loadRounds(),
    db.query.settings.findFirst({ where: eq(settings.id, 1) }),
  ]);

  // Frisch bereitgestellte Datenbank: Runde 1 und Seed-Taxonomie beim ersten Aufruf anlegen.
  if (allRounds.length === 0 && (await seedIfEmpty()) > 0) {
    [allRounds, projectSettings] = await Promise.all([
      loadRounds(),
      db.query.settings.findFirst({ where: eq(settings.id, 1) }),
    ]);
  }

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
                <td className="px-4 py-2">{r.submittedCount}</td>
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
