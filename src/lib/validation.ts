import { z } from "zod";

export const participantSchema = z.object({
  name: z.string().trim().min(2, "Bitte Namen angeben").max(200),
  email: z.string().trim().email("Bitte gültige E-Mail-Adresse angeben").max(320),
  profession: z.string().trim().max(200).optional().or(z.literal("")),
  institution: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

// Eine bewertete Kategorie in der (bewusst FLACHEN) Auswahlliste der Teilnehmer:in.
// Entweder categoryId (aus dem Pool angeklickt) ODER customLabel (selbst ergänzte
// Kategorie, nur in der eigenen Einreichung sichtbar) muss gesetzt sein.
// Keine Baum-/Eltern-Kind-Struktur mehr (auf Wunsch des Auftraggebers vereinfacht).
export interface RatedItemInput {
  clientId: string; // clientseitige Kennung, nur für die Listendarstellung relevant
  categoryId: string | null;
  customLabel: string | null;
  rating: number | null; // 1-9 (RAND/UCLA-Skala); null solange noch nicht bewertet
  comment: string | null;
}

const ratedItemSchema: z.ZodType<RatedItemInput> = z
  .object({
    clientId: z.string().min(1),
    categoryId: z.string().nullable(),
    customLabel: z.string().trim().max(300).nullable(),
    rating: z
      .number()
      .int("Bewertung muss eine ganze Zahl sein")
      .min(1, "Bewertung muss zwischen 1 und 9 liegen")
      .max(9, "Bewertung muss zwischen 1 und 9 liegen"),
    comment: z.string().trim().max(4000).nullable(),
  })
  .refine((n) => (n.categoryId ? !n.customLabel : !!n.customLabel), {
    message: "Entweder categoryId oder customLabel muss gesetzt sein (nicht beides, nicht keines).",
  });

export const submissionSchema = z.object({
  token: z.string().min(1),
  participant: participantSchema,
  items: z.array(ratedItemSchema).min(1, "Bitte mindestens eine Kategorie auswählen und bewerten."),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
