import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/db";
import { rounds } from "@/db/schema";
import { getRoundAggregation } from "@/lib/aggregation";
import { AdminNav } from "@/components/AdminNav";
import { RoundStatusControls } from "@/components/RoundStatusControls";
import { InviteLinkBox } from "@/components/InviteLinkBox";
import { AggregationView } from "@/components/AggregationView";

export default async function RoundDetailPage({ params }: { params: Promise<{ roundId: string }> }) {
  await requireAdminPage();
  const { roundId } = await params;

  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round) notFound();

  const aggregation = await getRoundAggregation(roundId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/runde/${round.inviteToken}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminNav />

      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-800">
          Runde {round.roundNumber}: {round.title}
        </h1>
      </div>
      <div className="mb-4">
        <RoundStatusControls roundId={round.id} status={round.status} />
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 p-4">
        <p className="mb-1.5 text-sm font-medium text-slate-700">Einladungslink für Teilnehmende</p>
        <InviteLinkBox url={inviteUrl} />
        <p className="mt-1.5 text-xs text-slate-400">
          Der Link funktioniert erst, sobald die Runde auf „Offen“ gesetzt ist.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href={`/api/admin/export/csv?roundId=${round.id}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ CSV-Export (Rohdaten)
        </a>
        <a
          href={`/api/admin/export/json?roundId=${round.id}`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇ JSON-Export (alle Bewertungen)
        </a>
        <Link
          href={`/admin/runden/neu?basedOn=${round.id}`}
          className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          Nächste Runde aus dieser Auswertung erstellen →
        </Link>
      </div>

      <h2 className="mb-3 text-base font-semibold text-slate-800">Auswertungsansicht</h2>
      <AggregationView aggregation={aggregation} />
    </main>
  );
}
