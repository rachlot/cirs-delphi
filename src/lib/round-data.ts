import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { rounds, categories, roundCategories, participants, ratings } from "@/db/schema";
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

export interface FeedbackSummary {
  generatedAt: string;
  items: FeedbackSummaryItem[];
  newSuggestions: string[];
  note?: string;
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
  const links = await db
    .select({
      categoryId: roundCategories.categoryId,
      sortOrder: roundCategories.sortOrder,
    })
    .from(roundCategories)
    .where(eq(roundCategories.roundId, round.id));

  const categoryIds = links.map((l) => l.categoryId);
  const cats = categoryIds.length
    ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
    : [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const pool: PoolCategory[] = links
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((l) => {
      const c = catMap.get(l.categoryId)!;
      return {
        id: c.id,
        name: c.name,
        isWhoIcps: c.isWhoIcps,
        suggestedParentId: c.suggestedParentId,
      };
    })
    .filter(Boolean);

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
  const participant = await db.query.participants.findFirst({
    where: eq(participants.email, normalizedEmail),
  });
  if (!participant) return null;

  const submission = await db.query.submissions.findFirst({
    where: (s, { and, eq }) => and(eq(s.roundId, roundId), eq(s.participantId, participant.id)),
  });
  if (!submission) return null;

  const rows = await db.select().from(ratings).where(eq(ratings.submissionId, submission.id));
  const categoryIds = rows.map((n) => n.categoryId).filter((v): v is string => !!v);
  const cats = categoryIds.length
    ? await db.select().from(categories).where(inArray(categories.id, categoryIds))
    : [];
  const catLookup = new Map(cats.map((c) => [c.id, { name: c.name, isWhoIcps: c.isWhoIcps }]));

  const items = buildRatingList(
    rows.map((n) => ({
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
