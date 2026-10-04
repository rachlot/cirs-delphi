import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/db";
import { rounds, settings } from "@/db/schema";
import { getRoundAggregation } from "@/lib/aggregation";
import { AdminNav } from "@/components/AdminNav";
import { CreateRoundForm } from "@/components/CreateRoundForm";

export default async function CreateRoundPage({
  searchParams,
}: {
  searchParams: Promise<{ basedOn?: string }>;
}) {
  await requireAdminPage();
  const { basedOn } = await searchParams;

  if (!basedOn) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <AdminNav />
        <p className="text-sm text-red-600">
          Bitte über „Nächste Runde erstellen“ auf einer Runden-Detailseite aufrufen.
        </p>
      </main>
    );
  }

  const baseRound = await db.query.rounds.findFirst({ where: eq(rounds.id, basedOn) });
  if (!baseRound) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <AdminNav />
        <p className="text-sm text-red-600">Ausgangsrunde nicht gefunden.</p>
      </main>
    );
  }

  const aggregation = await getRoundAggregation(basedOn);
  const projectSettings = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  const consensusMaxIqr = projectSettings?.consensusMaxIqr ?? 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <AdminNav />
      <h1 className="mb-1 text-lg font-semibold text-slate-800">Neue Runde erstellen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Basierend auf Runde {baseRound.roundNumber} ({baseRound.title}). Der Kategorien-Pool dieser Runde
        wird vollständig übernommen; optional kannst du zusätzlich ausgewählte eigene Vorschläge aufnehmen.
      </p>
      <CreateRoundForm
        basedOnRoundId={basedOn}
        suggestedTitle={`Runde ${baseRound.roundNumber + 1}`}
        categoryStats={aggregation.categoryStats}
        customCategories={aggregation.customCategories}
        consensusMaxIqr={consensusMaxIqr}
      />
    </main>
  );
}
