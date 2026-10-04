"use server";

import { eq, asc, desc, and, notExists } from "drizzle-orm";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { rounds, categories, roundCategories, settings, participants, submissions } from "@/db/schema";
import { checkAdminPassword, createAdminSession, destroyAdminSession, isAdminAuthenticated } from "@/lib/auth";
import { getRoundAggregation } from "@/lib/aggregation";
import { newId } from "@/lib/ids";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Nicht angemeldet.");
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  let valid: boolean;
  try {
    valid = checkAdminPassword(password);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Konfigurationsfehler." };
  }
  if (!valid) return { ok: false, error: "Falsches Passwort." };
  await createAdminSession();
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

export async function updateSettings(input: {
  projectName: string;
  consensusMaxIqr: number | null;
  maxRounds: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  await db
    .insert(settings)
    .values({
      id: 1,
      projectName: input.projectName,
      consensusMaxIqr: input.consensusMaxIqr,
      maxRounds: input.maxRounds,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        projectName: input.projectName,
        consensusMaxIqr: input.consensusMaxIqr,
        maxRounds: input.maxRounds,
        updatedAt: new Date(),
      },
    });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Runden
// ---------------------------------------------------------------------------

export async function updateRoundStatus(
  roundId: string,
  status: "draft" | "open" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  await db
    .update(rounds)
    .set({
      status,
      opensAt: status === "open" ? new Date() : undefined,
      closesAt: status === "closed" ? new Date() : undefined,
    })
    .where(eq(rounds.id, roundId));
  return { ok: true };
}

/**
 * Löscht eine Runde samt Einreichungen und Bewertungen (per FK-Cascade). Nur die neueste
 * Runde ist löschbar, damit die Nummerierung lückenlos bleibt und keine Folgerunde ihre
 * Ausgangsrunde verliert. Wird die einzige Runde gelöscht, legt das Dashboard beim nächsten
 * Aufruf eine frische Runde 1 an (seedIfEmpty).
 */
export async function deleteRound(roundId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  return db.transaction(async (tx) => {
    const [latest] = await tx.select({ id: rounds.id }).from(rounds).orderBy(desc(rounds.roundNumber)).limit(1);
    if (!latest || latest.id !== roundId) {
      return { ok: false, error: "Nur die neueste Runde kann gelöscht werden." };
    }
    await tx.delete(rounds).where(eq(rounds.id, roundId));
    // In dieser Runde neu aufgenommene Teilnehmer-Vorschläge gehören zu keinem Pool mehr.
    await tx.delete(categories).where(
      and(
        eq(categories.introducedInRoundId, roundId),
        notExists(tx.select().from(roundCategories).where(eq(roundCategories.categoryId, categories.id)))
      )
    );
    // Datensparsamkeit: Teilnehmende ohne verbleibende Einreichung entfernen.
    await tx
      .delete(participants)
      .where(notExists(tx.select().from(submissions).where(eq(submissions.participantId, participants.id))));
    return { ok: true };
  });
}

export interface CreateRoundInput {
  basedOnRoundId: string;
  title: string;
  note?: string;
  controversialCategoryIds: string[];
  promotedCustomLabels: string[]; // normalizedLabel-Werte aus der Aggregation der Vorrunde
}

export async function createNextRound(input: CreateRoundInput): Promise<{ ok: boolean; error?: string; roundId?: string }> {
  await requireAdmin();

  const baseRound = await db.query.rounds.findFirst({ where: eq(rounds.id, input.basedOnRoundId) });
  if (!baseRound) return { ok: false, error: "Ausgangsrunde nicht gefunden." };

  const projectSettings = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  const consensusMaxIqr = projectSettings?.consensusMaxIqr ?? 2;

  const aggregation = await getRoundAggregation(input.basedOnRoundId);

  const allRounds = await db.select({ roundNumber: rounds.roundNumber }).from(rounds);
  const nextRoundNumber = Math.max(0, ...allRounds.map((r) => r.roundNumber)) + 1;

  if (projectSettings?.maxRounds && nextRoundNumber > projectSettings.maxRounds) {
    return {
      ok: false,
      error: `Die konfigurierte maximale Rundenzahl (${projectSettings.maxRounds}) wäre überschritten. Bitte in den Einstellungen anpassen, falls gewünscht.`,
    };
  }

  const newRoundId = newId();

  // Vorherigen Pool übernehmen
  const prevLinks = await db
    .select({ categoryId: roundCategories.categoryId, sortOrder: roundCategories.sortOrder })
    .from(roundCategories)
    .where(eq(roundCategories.roundId, input.basedOnRoundId))
    .orderBy(asc(roundCategories.sortOrder));

  const newRoundCategoryRows: { roundId: string; categoryId: string; sortOrder: number }[] = prevLinks.map(
    (l, idx) => ({ roundId: newRoundId, categoryId: l.categoryId, sortOrder: idx })
  );

  // Ausgewählte Freitext-Vorschläge in den gemeinsamen Pool übernehmen
  const promotedDisplayLabels: string[] = [];
  for (const normalizedLabel of input.promotedCustomLabels) {
    const stat = aggregation.customCategories.find((c) => c.normalizedLabel === normalizedLabel);
    if (!stat) continue;
    const newCategoryId = newId();
    await db.insert(categories).values({
      id: newCategoryId,
      name: stat.displayLabel,
      isWhoIcps: false,
      suggestedParentId: null,
      sortOrder: newRoundCategoryRows.length,
      isActive: true,
      introducedInRoundId: newRoundId,
    });
    newRoundCategoryRows.push({
      roundId: newRoundId,
      categoryId: newCategoryId,
      sortOrder: newRoundCategoryRows.length,
    });
    promotedDisplayLabels.push(stat.displayLabel);
  }

  // Kompakte Rückmeldung (Zahlen + Text) aus der Vorrunde zusammenstellen.
  // Konsenskriterium nach RAND/UCLA: Konsens gilt als erreicht, wenn der
  // Interquartilsabstand (IQR) der 1-9-Bewertungen <= consensusMaxIqr ist.
  const items = aggregation.categoryStats
    .filter((c) => c.n > 0)
    .map((c) => {
      const isControversial =
        input.controversialCategoryIds.includes(c.categoryId) ||
        (c.iqr !== null && c.iqr > consensusMaxIqr);
      const statText = `Median-Bewertung: ${c.median} von 9 (IQR ${c.iqr}, Mittelwert ${c.mean}, ${c.n} Bewertung(en)).`;
      return { categoryName: c.categoryName, statText, isControversial };
    });

  const feedbackSummary = {
    generatedAt: new Date().toISOString(),
    items,
    newSuggestions: promotedDisplayLabels,
    note: input.note?.trim() || undefined,
  };

  await db.insert(rounds).values({
    id: newRoundId,
    roundNumber: nextRoundNumber,
    title: input.title.trim(),
    status: "draft",
    inviteToken: nanoid(24),
    feedbackSummary,
  });

  if (newRoundCategoryRows.length > 0) {
    await db.insert(roundCategories).values(newRoundCategoryRows);
  }

  return { ok: true, roundId: newRoundId };
}
