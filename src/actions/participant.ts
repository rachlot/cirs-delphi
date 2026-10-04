"use server";

import { getRoundByToken, getExistingSubmission, getPreviousOwnRatings } from "@/lib/round-data";
import type { ExistingSubmission } from "@/lib/round-data";
import { z } from "zod";

const lookupSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export interface ParticipantLookup {
  submission: ExistingSubmission | null;
  previousRatings: Record<string, number>; // eigene Bewertungen der Vorrunde, categoryId -> 1-9
}

export async function lookupExistingSubmission(token: string, email: string): Promise<ParticipantLookup> {
  const empty: ParticipantLookup = { submission: null, previousRatings: {} };
  const parsed = lookupSchema.safeParse({ token, email });
  if (!parsed.success) return empty;
  const round = await getRoundByToken(parsed.data.token);
  if (!round) return empty;
  const [submission, previousRatings] = await Promise.all([
    getExistingSubmission(round.id, parsed.data.email),
    getPreviousOwnRatings(round, parsed.data.email),
  ]);
  return { submission, previousRatings };
}
