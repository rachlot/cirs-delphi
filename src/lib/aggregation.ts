import { eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { submissions, ratings, categories, participants, roundCategories, settings } from "@/db/schema";

// ---------------------------------------------------------------------------
// Konsens-Statistik nach der RAND/UCLA Appropriateness Method: pro Kategorie
// wird der Median und der Interquartilsabstand (IQR) der 1-9-Bewertungen
// berechnet. Konsens gilt (konfigurierbar über settings.consensusMaxIqr) als
// erreicht, wenn IQR <= diesem Schwellenwert ist - NICHT über eine einfache
// Häufigkeits-/Übereinstimmungsprozentzahl wie in einer früheren Version.
// Quelle: RAND/UCLA Appropriateness Method User's Manual,
// https://www.rand.org/content/dam/rand/pubs/tools/TLA3000/TLA3082-1/RAND_TLA3082-1.pdf
// ---------------------------------------------------------------------------

const DEFAULT_CONSENSUS_MAX_IQR = 2;

/** Lineare Interpolation (wie z.B. numpy/Excel PERCENTILE.INC-Standard) auf einer sortierten Liste. */
function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return NaN;
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lower = sortedValues[base];
  const upper = sortedValues[base + 1];
  return upper !== undefined ? lower + rest * (upper - lower) : lower;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface RatingSummary {
  n: number;
  ratings: number[];
  median: number | null;
  mean: number | null;
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  consensusReached: boolean | null;
}

function summarize(values: number[], consensusMaxIqr: number): RatingSummary {
  if (values.length === 0) {
    return { n: 0, ratings: [], median: null, mean: null, q1: null, q3: null, iqr: null, consensusReached: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const median = round2(quantile(sorted, 0.5));
  const q1 = round2(quantile(sorted, 0.25));
  const q3 = round2(quantile(sorted, 0.75));
  const iqr = round2(q3 - q1);
  const mean = round2(sorted.reduce((sum, v) => sum + v, 0) / sorted.length);
  return {
    n: sorted.length,
    ratings: sorted,
    median,
    mean,
    q1,
    q3,
    iqr,
    consensusReached: iqr <= consensusMaxIqr,
  };
}

export interface CategoryRatingStat extends RatingSummary {
  categoryId: string;
  categoryName: string;
  isWhoIcps: boolean;
}

export interface CustomCategoryStat extends RatingSummary {
  normalizedLabel: string;
  displayLabel: string;
  submitters: string[];
}

export interface CommentEntry {
  participantName: string;
  participantEmail: string;
  comment: string;
}

export interface RoundAggregation {
  participantCount: number;
  consensusMaxIqr: number;
  categoryStats: CategoryRatingStat[];
  customCategories: CustomCategoryStat[];
  commentsByCategoryId: Record<string, CommentEntry[]>;
  commentsByCustomLabel: Record<string, CommentEntry[]>;
  overallConsensusPercent: number | null; // Anteil bewerteter Kategorien mit erreichtem Konsens (IQR <= Schwellenwert)
}

export async function getRoundAggregation(roundId: string): Promise<RoundAggregation> {
  const projectSettings = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  const consensusMaxIqr = projectSettings?.consensusMaxIqr ?? DEFAULT_CONSENSUS_MAX_IQR;

  const subRows = await db
    .select({
      id: submissions.id,
      participantId: submissions.participantId,
    })
    .from(submissions)
    .where(eq(submissions.roundId, roundId));

  const submittedSubIds = subRows.map((s) => s.id);
  const participantCount = submittedSubIds.length;

  const poolCats = await getPoolCategoriesForRound(roundId);

  if (submittedSubIds.length === 0) {
    return {
      participantCount: 0,
      consensusMaxIqr,
      categoryStats: poolCats.map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        isWhoIcps: c.isWhoIcps,
        ...summarize([], consensusMaxIqr),
      })),
      customCategories: [],
      commentsByCategoryId: {},
      commentsByCustomLabel: {},
      overallConsensusPercent: null,
    };
  }

  const ratingRows = await db.select().from(ratings).where(inArray(ratings.submissionId, submittedSubIds));

  const participantIdBySubmission = new Map(subRows.map((s) => [s.id, s.participantId]));
  const participantIds = Array.from(new Set(subRows.map((s) => s.participantId)));
  const participantRows = participantIds.length
    ? await db.select().from(participants).where(inArray(participants.id, participantIds))
    : [];
  const participantById = new Map(participantRows.map((p) => [p.id, p]));

  const ratingsByCategoryId = new Map<string, number[]>(); // categoryId -> alle 1-9 Bewertungen
  const customMap = new Map<
    string,
    { normalizedLabel: string; displayLabel: string; ratingValues: number[]; submitters: string[] }
  >();
  const commentsByCategoryId: Record<string, CommentEntry[]> = {};
  const commentsByCustomLabel: Record<string, CommentEntry[]> = {};

  for (const row of ratingRows) {
    const participantId = participantIdBySubmission.get(row.submissionId);
    const participant = participantId ? participantById.get(participantId) : undefined;

    if (row.categoryId) {
      const list = ratingsByCategoryId.get(row.categoryId) ?? [];
      list.push(row.rating);
      ratingsByCategoryId.set(row.categoryId, list);

      if (row.comment && participant) {
        const list2 = commentsByCategoryId[row.categoryId] ?? [];
        list2.push({ participantName: participant.name, participantEmail: participant.email, comment: row.comment });
        commentsByCategoryId[row.categoryId] = list2;
      }
    } else if (row.customLabel) {
      const normalized = row.customLabel.trim().toLowerCase();
      const stat = customMap.get(normalized) ?? {
        normalizedLabel: normalized,
        displayLabel: row.customLabel.trim(),
        ratingValues: [],
        submitters: [],
      };
      stat.ratingValues.push(row.rating);
      if (participant && !stat.submitters.includes(participant.name)) stat.submitters.push(participant.name);
      customMap.set(normalized, stat);

      if (row.comment && participant) {
        const list2 = commentsByCustomLabel[normalized] ?? [];
        list2.push({ participantName: participant.name, participantEmail: participant.email, comment: row.comment });
        commentsByCustomLabel[normalized] = list2;
      }
    }
  }

  const categoryStats: CategoryRatingStat[] = poolCats.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    isWhoIcps: c.isWhoIcps,
    ...summarize(ratingsByCategoryId.get(c.id) ?? [], consensusMaxIqr),
  }));

  const ratedStats = categoryStats.filter((c) => c.n > 0 && c.consensusReached !== null);
  const overallConsensusPercent =
    ratedStats.length > 0
      ? round2((ratedStats.filter((c) => c.consensusReached).length / ratedStats.length) * 100)
      : null;

  const customCategories: CustomCategoryStat[] = Array.from(customMap.values())
    .map((stat) => ({
      normalizedLabel: stat.normalizedLabel,
      displayLabel: stat.displayLabel,
      submitters: stat.submitters,
      ...summarize(stat.ratingValues, consensusMaxIqr),
    }))
    .sort((a, b) => b.n - a.n);

  return {
    participantCount,
    consensusMaxIqr,
    categoryStats,
    customCategories,
    commentsByCategoryId,
    commentsByCustomLabel,
    overallConsensusPercent,
  };
}

async function getPoolCategoriesForRound(roundId: string) {
  // Wichtig: Reihenfolge kommt aus round_categories.sort_order, NICHT aus der IN-Klausel
  // (eine WHERE id IN (...)-Abfrage ohne ORDER BY liefert in Postgres eine beliebige
  // Zeilenreihenfolge zurück - das war die Ursache für die falsche Sortierung).
  const links = await db
    .select({ categoryId: roundCategories.categoryId, sortOrder: roundCategories.sortOrder })
    .from(roundCategories)
    .where(eq(roundCategories.roundId, roundId))
    .orderBy(asc(roundCategories.sortOrder));
  const orderedIds = links.map((l) => l.categoryId);
  if (orderedIds.length === 0) return [];
  const rows = await db.select().from(categories).where(inArray(categories.id, orderedIds));
  const rowById = new Map(rows.map((r) => [r.id, r]));
  return orderedIds.map((id) => rowById.get(id)).filter((r): r is typeof rows[number] => !!r);
}
