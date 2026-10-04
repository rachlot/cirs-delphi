import { newId } from "./ids";
import type { RatedItemInput } from "./validation";

// Hinweis: Dieses Modul hieß ursprünglich "tree.ts" (verschachtelte Baumstruktur).
// Auf Wunsch des Auftraggebers wurde das Datenmodell auf eine flache Liste
// bewerteter Kategorien vereinfacht (kein Eltern-Kind-Verhältnis mehr). Der
// Dateiname bleibt unverändert, um Importe im restlichen Projekt nicht anfassen
// zu müssen; der Inhalt ist jetzt rein flach.

export interface FlatRatingToInsert {
  id: string;
  submissionId: string;
  categoryId: string | null;
  isCustom: boolean;
  customLabel: string | null;
  rating: number;
  position: number;
  comment: string | null;
}

/**
 * Wandelt die flache Bewertungsliste aus dem Formular in Zeilen zum Einfügen
 * in die `ratings`-Tabelle um.
 */
export function flattenItems(items: RatedItemInput[], submissionId: string): FlatRatingToInsert[] {
  return items.map((item, index) => {
    if (item.rating === null) {
      throw new Error("Jede Auswahl muss vor dem Absenden bewertet sein (1-9).");
    }
    return {
      id: newId(),
      submissionId,
      categoryId: item.categoryId,
      isCustom: !item.categoryId,
      customLabel: item.categoryId ? null : item.customLabel,
      rating: item.rating,
      position: index,
      comment: item.comment && item.comment.trim().length > 0 ? item.comment.trim() : null,
    };
  });
}

export interface DbRatingRow {
  id: string;
  categoryId: string | null;
  isCustom: boolean;
  customLabel: string | null;
  rating: number;
  position: number;
  comment: string | null;
}

export interface RenderedRatingItem {
  id: string;
  label: string;
  categoryId: string | null;
  isCustom: boolean;
  isWhoIcps: boolean;
  rating: number;
  comment: string | null;
}

/**
 * Baut aus den flachen DB-Zeilen die Anzeige-/Editor-Liste auf (z.B. für den
 * JSON-Export oder um eine vorhandene Einreichung wieder in den Editor zu laden).
 */
export function buildRatingList(
  rows: DbRatingRow[],
  categoryLookup: Map<string, { name: string; isWhoIcps: boolean }>
): RenderedRatingItem[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  return sorted.map((row) => {
    const category = row.categoryId ? categoryLookup.get(row.categoryId) : undefined;
    return {
      id: row.id,
      label: category?.name ?? row.customLabel ?? "(unbenannt)",
      categoryId: row.categoryId,
      isCustom: row.isCustom,
      isWhoIcps: category?.isWhoIcps ?? false,
      rating: row.rating,
      comment: row.comment,
    };
  });
}
