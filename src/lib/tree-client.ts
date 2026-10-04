import type { RatedItemInput } from "./validation";
import type { RenderedRatingItem } from "./tree";

// Hinweis: Dateiname "tree-client.ts" aus der ursprünglichen Baum-Version
// beibehalten (keine Importe im Projekt anfassen), Inhalt ist jetzt eine
// einfache flache Liste bewerteter Kategorien statt Baum-Utilities.

let clientIdCounter = 0;
export function newClientId(): string {
  clientIdCounter += 1;
  return `c${Date.now().toString(36)}${clientIdCounter}`;
}

/** Wandelt eine vom Server gerenderte (bereits gespeicherte) Bewertungsliste zurück
 * in das Formular-Eingabeformat, z.B. um eine vorhandene Einreichung zum Weiterbearbeiten zu laden. */
export function renderedToInput(items: RenderedRatingItem[]): RatedItemInput[] {
  return items.map((item) => ({
    clientId: newClientId(),
    categoryId: item.categoryId,
    customLabel: item.categoryId ? null : item.label,
    rating: item.rating,
    comment: item.comment,
  }));
}

export function cloneItems(items: RatedItemInput[]): RatedItemInput[] {
  return items.map((n) => ({ ...n }));
}

export function findItem(items: RatedItemInput[], clientId: string): RatedItemInput | null {
  return items.find((n) => n.clientId === clientId) ?? null;
}

/** Fügt eine Pool-Kategorie zur Auswahlliste hinzu (falls noch nicht enthalten). */
export function addCategoryItem(items: RatedItemInput[], categoryId: string): RatedItemInput[] {
  if (items.some((n) => n.categoryId === categoryId)) return items;
  return [
    ...items,
    { clientId: newClientId(), categoryId, customLabel: null, rating: null, comment: null },
  ];
}

/** Fügt eine eigene, frei benannte Kategorie zur Auswahlliste hinzu. */
export function addCustomItem(items: RatedItemInput[], label: string): RatedItemInput[] {
  const trimmed = label.trim();
  if (!trimmed) return items;
  return [
    ...items,
    { clientId: newClientId(), categoryId: null, customLabel: trimmed, rating: null, comment: null },
  ];
}

export function removeItem(items: RatedItemInput[], clientId: string): RatedItemInput[] {
  return items.filter((n) => n.clientId !== clientId);
}

export function updateItem(
  items: RatedItemInput[],
  clientId: string,
  patch: Partial<RatedItemInput>
): RatedItemInput[] {
  return items.map((n) => (n.clientId === clientId ? { ...n, ...patch } : n));
}

export function collectPlacedCategoryIds(items: RatedItemInput[]): Set<string> {
  const set = new Set<string>();
  for (const n of items) {
    if (n.categoryId) set.add(n.categoryId);
  }
  return set;
}
