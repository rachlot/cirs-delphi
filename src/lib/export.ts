import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { rounds, submissions, ratings, categories, participants } from "@/db/schema";
import { buildRatingList } from "./tree";

interface CsvRow {
  teilnehmerName: string;
  teilnehmerEmail: string;
  berufsgruppe: string;
  einrichtung: string;
  runde: number;
  rundentitel: string;
  eingereichtAm: string;
  kategorie: string;
  bewertung: number;
  eigeneKategorie: "ja" | "nein";
  kommentar: string;
}

async function getScopedRounds(roundId?: string) {
  if (roundId) {
    const r = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
    return r ? [r] : [];
  }
  return await db.select().from(rounds).orderBy(rounds.roundNumber);
}

export async function buildCsvRows(roundId?: string): Promise<CsvRow[]> {
  const scopedRounds = await getScopedRounds(roundId);
  if (scopedRounds.length === 0) return [];
  const roundById = new Map(scopedRounds.map((r) => [r.id, r]));

  const subRows = await db
    .select()
    .from(submissions)
    .where(
      roundId
        ? eq(submissions.roundId, roundId)
        : inArray(submissions.roundId, scopedRounds.map((r) => r.id))
    );
  const submittedSubs = subRows.filter((s) => s.status === "submitted");
  if (submittedSubs.length === 0) return [];

  const participantIds = Array.from(new Set(submittedSubs.map((s) => s.participantId)));
  const participantRows = await db.select().from(participants).where(inArray(participants.id, participantIds));
  const participantById = new Map(participantRows.map((p) => [p.id, p]));

  const subIds = submittedSubs.map((s) => s.id);
  const ratingRows = await db.select().from(ratings).where(inArray(ratings.submissionId, subIds));

  const categoryIds = Array.from(new Set(ratingRows.map((n) => n.categoryId).filter((v): v is string => !!v)));
  const categoryRows = categoryIds.length
    ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
    : [];
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  function labelFor(row: (typeof ratingRows)[number]): string {
    if (row.categoryId) return categoryById.get(row.categoryId)?.name ?? "(unbekannte Kategorie)";
    return row.customLabel ?? "(unbenannt)";
  }

  const rows: CsvRow[] = [];
  for (const row of ratingRows) {
    const submission = submittedSubs.find((s) => s.id === row.submissionId);
    if (!submission) continue;
    const participant = participantById.get(submission.participantId);
    const round = roundById.get(submission.roundId);

    rows.push({
      teilnehmerName: participant?.name ?? "",
      teilnehmerEmail: participant?.email ?? "",
      berufsgruppe: participant?.profession ?? "",
      einrichtung: participant?.institution ?? "",
      runde: round?.roundNumber ?? 0,
      rundentitel: round?.title ?? "",
      eingereichtAm: submission.submittedAt ? submission.submittedAt.toISOString() : "",
      kategorie: labelFor(row),
      bewertung: row.rating,
      eigeneKategorie: row.isCustom ? "ja" : "nein",
      kommentar: row.comment ?? "",
    });
  }

  return rows;
}

export interface JsonSubmissionExport {
  participant: { name: string; email: string; profession: string | null; institution: string | null };
  round: { number: number; title: string };
  submittedAt: string | null;
  items: ReturnType<typeof buildRatingList>;
}

export async function buildJsonExport(roundId?: string): Promise<JsonSubmissionExport[]> {
  const scopedRounds = await getScopedRounds(roundId);
  if (scopedRounds.length === 0) return [];
  const roundById = new Map(scopedRounds.map((r) => [r.id, r]));

  const subRows = await db
    .select()
    .from(submissions)
    .where(
      roundId
        ? eq(submissions.roundId, roundId)
        : inArray(submissions.roundId, scopedRounds.map((r) => r.id))
    );
  const submittedSubs = subRows.filter((s) => s.status === "submitted");
  if (submittedSubs.length === 0) return [];

  const participantIds = Array.from(new Set(submittedSubs.map((s) => s.participantId)));
  const participantRows = await db.select().from(participants).where(inArray(participants.id, participantIds));
  const participantById = new Map(participantRows.map((p) => [p.id, p]));

  const subIds = submittedSubs.map((s) => s.id);
  const allRatingRows = await db.select().from(ratings).where(inArray(ratings.submissionId, subIds));

  const categoryIds = Array.from(new Set(allRatingRows.map((n) => n.categoryId).filter((v): v is string => !!v)));
  const categoryRows = categoryIds.length
    ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
    : [];
  const categoryLookup = new Map(categoryRows.map((c) => [c.id, { name: c.name, isWhoIcps: c.isWhoIcps }]));

  const ratingsBySubmission = new Map<string, typeof allRatingRows>();
  for (const n of allRatingRows) {
    const list = ratingsBySubmission.get(n.submissionId) ?? [];
    list.push(n);
    ratingsBySubmission.set(n.submissionId, list);
  }

  return submittedSubs.map((s) => {
    const participant = participantById.get(s.participantId);
    const round = roundById.get(s.roundId);
    const rows = ratingsBySubmission.get(s.id) ?? [];
    return {
      participant: {
        name: participant?.name ?? "",
        email: participant?.email ?? "",
        profession: participant?.profession ?? null,
        institution: participant?.institution ?? null,
      },
      round: { number: round?.roundNumber ?? 0, title: round?.title ?? "" },
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      items: buildRatingList(rows, categoryLookup),
    };
  });
}
