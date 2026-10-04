import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roundStatusEnum = pgEnum("round_status", [
  "draft", // wird von der Organisator:in vorbereitet, für Teilnehmende noch nicht sichtbar
  "open", // aktiv, Teilnehmende können einreichen
  "closed", // beendet, keine neuen Einreichungen mehr möglich
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft", // Zwischenspeicherung, noch nicht final abgeschickt
  "submitted", // final eingereicht
]);

// ---------------------------------------------------------------------------
// Globale Projekteinstellungen (Singleton-Zeile, id = 1)
// ---------------------------------------------------------------------------

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  projectName: text("project_name").notNull().default("CIRS-Kategorien Delphi-Verfahren"),
  // Konsenskriterium nach RAND/UCLA-Logik: Konsens gilt als erreicht, wenn der
  // Interquartilsabstand (IQR) der 1-9-Bewertungen einer Kategorie <= diesem Wert ist.
  // Je kleiner, desto strenger. Üblich: 2-3 auf einer 1-9-Skala.
  consensusMaxIqr: real("consensus_max_iqr"),
  maxRounds: integer("max_rounds"), // z.B. 5
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Kategorien: gemeinsamer, von der Organisator:in kuratierter Pool
// (Seed-Taxonomie aus Abschnitt 8 + im Lauf der Runden freigegebene Vorschläge)
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // App-seitig generierte UUID
  name: text("name").notNull(),
  isWhoIcps: boolean("is_who_icps").notNull().default(false),
  // Rein informativer Hinweis für die Pool-Darstellung (Gruppierung wie im Seed-Baum);
  // schränkt die freie Zuordnung im Editor NICHT ein.
  suggestedParentId: text("suggested_parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  // Runde, in der die Kategorie neu in den gemeinsamen Pool aufgenommen wurde (null = Seed/Runde 1 Start)
  introducedInRoundId: text("introduced_in_round_id"),
  // Falls aus einem Teilnehmer-Freitextvorschlag übernommen: Referenz zum ursprünglichen Knoten
  promotedFromNodeId: text("promoted_from_node_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ one }) => ({
  suggestedParent: one(categories, {
    fields: [categories.suggestedParentId],
    references: [categories.id],
  }),
}));

// ---------------------------------------------------------------------------
// Runden
// ---------------------------------------------------------------------------

export const rounds = pgTable("rounds", {
  id: text("id").primaryKey(),
  roundNumber: integer("round_number").notNull(),
  title: text("title").notNull(),
  status: roundStatusEnum("status").notNull().default("draft"),
  inviteToken: text("invite_token").notNull(),
  // Kompakte Rückmeldung aus der Vorrunde (Zahlen + Text), die Teilnehmenden dieser Runde angezeigt wird.
  // Struktur: { generatedAt, items: [{ categoryName, statText, isControversial }], newSuggestions: [...] }
  feedbackSummary: jsonb("feedback_summary"),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roundNumberIdx: uniqueIndex("rounds_round_number_idx").on(table.roundNumber),
  inviteTokenIdx: uniqueIndex("rounds_invite_token_idx").on(table.inviteToken),
}));

// Welche Kategorien in welcher Runde im Pool zur Verfügung stehen
export const roundCategories = pgTable("round_categories", {
  roundId: text("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.roundId, table.categoryId] }),
}));

export const roundsRelations = relations(rounds, ({ many }) => ({
  roundCategories: many(roundCategories),
  submissions: many(submissions),
}));

// ---------------------------------------------------------------------------
// Teilnehmende
// ---------------------------------------------------------------------------

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  profession: text("profession"), // Berufsgruppe/Fachbereich (optional)
  institution: text("institution"), // Einrichtung (optional)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("participants_email_idx").on(table.email),
}));

// ---------------------------------------------------------------------------
// Einreichungen (eine je Teilnehmer:in und Runde)
// ---------------------------------------------------------------------------

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull().references(() => rounds.id, { onDelete: "cascade" }),
  participantId: text("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  status: submissionStatusEnum("status").notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roundParticipantIdx: uniqueIndex("submissions_round_participant_idx").on(table.roundId, table.participantId),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  round: one(rounds, { fields: [submissions.roundId], references: [rounds.id] }),
  participant: one(participants, { fields: [submissions.participantId], references: [participants.id] }),
  ratings: many(ratings),
}));

// ---------------------------------------------------------------------------
// Bewertungen je Einreichung: pro ausgewählter Kategorie (Pool- oder eigene
// Freitext-Kategorie) eine Wichtigkeits-/Sicherheitsbewertung (1-9, RAND/UCLA-
// Skala) plus optionaler Kommentar. Bewusst FLACH gehalten, keine Baum-/
// Eltern-Kind-Hierarchie mehr (auf Wunsch des Auftraggebers vereinfacht: nur
// Hauptkategorien, einfache Auswahl + Bewertung statt freier Baum-Editor).
// ---------------------------------------------------------------------------

export const ratings = pgTable("ratings", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id), // gesetzt, wenn Pool-Kategorie bewertet wurde
  isCustom: boolean("is_custom").notNull().default(false),
  customLabel: text("custom_label"), // gesetzt, wenn Freitext-Kategorie (nur in eigener Einreichung sichtbar)
  rating: integer("rating").notNull(), // 1-9 (RAND/UCLA-Skala): Wichtigkeit/Sicherheitsrelevanz
  comment: text("comment"), // optionaler Kommentar zu dieser Bewertung
  position: integer("position").notNull().default(0), // Reihenfolge in der persönlichen Auswahl-Liste
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ratingsRelations = relations(ratings, ({ one }) => ({
  submission: one(submissions, { fields: [ratings.submissionId], references: [submissions.id] }),
  category: one(categories, { fields: [ratings.categoryId], references: [categories.id] }),
}));
