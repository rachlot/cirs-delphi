"use server";

import { getRoundByToken, getExistingSubmission } from "@/lib/round-data";
import type { ExistingSubmission } from "@/lib/round-data";
import { z } from "zod";

const lookupSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export async function lookupExistingSubmission(
  token: string,
  email: string
): Promise<ExistingSubmission | null> {
  const parsed = lookupSchema.safeParse({ token, email });
  if (!parsed.success) return null;
  const round = await getRoundByToken(parsed.data.token);
  if (!round) return null;
  return await getExistingSubmission(round.id, parsed.data.email);
}
