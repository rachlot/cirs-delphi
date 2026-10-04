import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rounds, categories, roundCategories, participants, ratings, submissions } from "@/db/schema";
import { buildRatingList, type RenderedRatingItem } from "./tree";

export interface PoolCategory {
  id: string;
  name: string;
  isWhoIcps: boolean;
  suggestedParentId: string | null;
}

export interface FeedbackSummaryItem {
  categoryName: string;
  statText: string;
  isControversial: boolean;
}

/** Kategorie aus der Vorrunde, die in dieser Runde bei allen vorausgewählt ist. */
export interface PreselectedCategory {
  categoryId: string;
  median: number | null; // Gruppen-Median der Vorrunde (1-9), null bei neu aufgenommenen Vorschlägen ohne Pool-Bewertung
  consensus?: boolean; // Konsens nach dem Kriterium der Vorrunde (IQR <= Schwellenwert); fehlt bei älteren Runden
}

export interface FeedbackSummary {
  generatedAt: string;
  items: FeedbackSummaryItem[];
  newSuggestions: string[];
  note?: string;
  // Fehlt bei Runden, die vor Einführung der Vorauswahl angelegt wurden.
  preselected?: PreselectedCategory[];
}

export interface RoundWithPool {
  id: string;
  roundNumber: number;
  title: string;
  status: "draft" | "open" | "closed";
  inviteToken: string;
  feedbackSummary: FeedbackSummary | null;
  pool: PoolCategory[];
}

export async function getRoundByToken(token: string): Promise<RoundWithPool | null> {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.inviteToken, token) });
  if (!round) return null;
  return await attachPool(round);
}

export async function getRoundById(roundId: string): Promise<RoundWithPool | null> {
  const round = await db.query.rounds.findFirst({ where: eq(rounds.id, roundId) });
  if (!round) return null;
  return await attachPool(round);
}

async function attachPool(round: typeof rounds.$inferSelect): Promise<RoundWithPool> {
  // Ein Join statt zwei Abfragen: die Funktionen laufen nicht in der Region der Datenbank,
  // jeder Roundtrip kostet spürbar Zeit.
  const pool: PoolCategory[] = await db
    .select({
      id: categories.id,
      name: categories.name,
      isWhoIcps: categories.isWhoIcps,
      suggestedParentId: categories.suggestedParentId,
    })
    .from(roundCategories)
    .innerJoin(categories, eq(categories.id, roundCategories.categoryId))
    .where(eq(roundCategories.roundId, round.id))
    .orderBy(asc(roundCategories.sortOrder));

  return {
    id: round.id,
    roundNumber: round.roundNumber,
    title: round.title,
    status: round.status,
    inviteToken: round.inviteToken,
    feedbackSummary: (round.feedbackSummary as FeedbackSummary | null) ?? null,
    pool,
  };
}

export interface ExistingSubmission {
  participant: {
    name: string;
    email: string;
    profession: string | null;
    institution: string | null;
  };
  items: RenderedRatingItem[];
}

export async function getExistingSubmission(
  roundId: string,
  email: string
): Promise<ExistingSubmission | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const [found] = await db
    .select({ participant: participants, submissionId: submissions.id })
    .from(participants)
    .innerJoin(
      submissions,
      and(eq(submissions.participantId, participants.id), eq(submissions.roundId, roundId))
    )
    .where(eq(participants.email, normalizedEmail))
    .limit(1);
  if (!found) return null;
  const { participant } = found;

  const rows = await db
    .select({ rating: ratings, category: { name: categories.name, isWhoIcps: categories.isWhoIcps } })
    .from(ratings)
    .leftJoin(categories, eq(categories.id, ratings.categoryId))
    .where(eq(ratings.submissionId, found.submissionId));
  const catLookup = new Map(
    rows.flatMap((r) => (r.rating.categoryId && r.category ? [[r.rating.categoryId, r.category] as const] : []))
  );

  const items = buildRatingList(
    rows.map(({ rating: n }) => ({
      id: n.id,
      categoryId: n.categoryId,
      isCustom: n.isCustom,
      customLabel: n.customLabel,
      rating: n.rating,
      position: n.position,
      comment: n.comment,
    })),
    catLookup
  );

  return {
    participant: {
      name: participant.name,
      email: participant.email,
      profession: participant.profession,
      institution: participant.institution,
    },
    items,
  };
}

/**
 * Eigene Bewertungen aus der Vorrunde (categoryId -> 1-9). Eigene Freitext-Kategorien
 * werden über den Namen der in den Pool übernommenen Kategorie zugeordnet.
 */
export async function getPreviousOwnRatings(round: RoundWithPool, email: string): Promise<Record<string, number>> {
  if (round.roundNumber <= 1) return {};
  const rows = await db
    .select({ categoryId: ratings.categoryId, customLabel: ratings.customLabel, rating: ratings.rating })
    .from(ratings)
    .innerJoin(submissions, eq(submissions.id, ratings.submissionId))
    .innerJoin(participants, eq(participants.id, submissions.participantId))
    .innerJoin(rounds, eq(rounds.id, submissions.roundId))
    .where(
      and(
        eq(rounds.roundNumber, round.roundNumber - 1),
        eq(participants.email, email.trim().toLowerCase()),
        eq(submissions.status, "submitted")
      )
    );

  const poolIdByName = new Map(round.pool.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const result: Record<string, number> = {};
  for (const row of rows) {
    const categoryId = row.categoryId ?? poolIdByName.get(row.customLabel?.trim().toLowerCase() ?? "");
    if (categoryId) result[categoryId] = row.rating;
  }
  return result;
}
