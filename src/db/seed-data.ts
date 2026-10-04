import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { categories, rounds, roundCategories, settings } from "./schema";
import { SEED_TAXONOMY } from "./taxonomy-seed-data";

// Beliebige feste Zahl: serialisiert parallele Seed-Aufrufe über einen Postgres-Advisory-Lock.
const SEED_LOCK_ID = 4711;

/**
 * Legt Einstellungen, Runde 1 und die Seed-Taxonomie an, falls noch keine Runde existiert.
 * Wird vom CLI-Skript (`npm run db:seed`) und beim Aufruf des Admin-Dashboards verwendet,
 * damit eine frisch bereitgestellte Datenbank (z.B. Netlify Database) ohne manuellen
 * Seed-Schritt startklar ist. Gibt die Anzahl angelegter Kategorien zurück (0 = übersprungen).
 */
export async function seedIfEmpty(): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SEED_LOCK_ID})`);

    const existingRounds = await tx.select({ id: rounds.id }).from(rounds).limit(1);
    if (existingRounds.length > 0) return 0;

    await tx
      .insert(settings)
      .values({
        id: 1,
        projectName: "CIRS-Kategorien Delphi-Verfahren",
        consensusMaxIqr: 2,
        maxRounds: 5,
      })
      .onConflictDoNothing();

    const round1Id = randomUUID();
    await tx.insert(rounds).values({
      id: round1Id,
      roundNumber: 1,
      title: "Runde 1 – Ausgangsrunde",
      status: "draft",
      inviteToken: nanoid(24),
    });

    // Nach dem Löschen aller Runden existieren die Kategorien noch: per Name wiederverwenden,
    // statt sie doppelt anzulegen.
    const existingByName = new Map(
      (await tx.select({ id: categories.id, name: categories.name }).from(categories)).map((c) => [c.name, c.id])
    );
    const categoryRows = SEED_TAXONOMY.map((main, index) => ({
      id: existingByName.get(main.name) ?? randomUUID(),
      name: main.name,
      isWhoIcps: !!main.whoIcps,
      suggestedParentId: null,
      sortOrder: index,
      isActive: true,
      introducedInRoundId: null,
    }));
    const newRows = categoryRows.filter((c) => !existingByName.has(c.name));
    if (newRows.length > 0) await tx.insert(categories).values(newRows);
    await tx.insert(roundCategories).values(
      categoryRows.map((c) => ({ roundId: round1Id, categoryId: c.id, sortOrder: c.sortOrder }))
    );

    return categoryRows.length;
  });
}
