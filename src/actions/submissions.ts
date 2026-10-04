"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rounds, participants, submissions, ratings } from "@/db/schema";
import { submissionSchema, type SubmissionInput } from "@/lib/validation";
import { flattenItems } from "@/lib/tree";
import { newId } from "@/lib/ids";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitTree(input: SubmissionInput): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { token, participant, items } = parsed.data;

  if (items.length === 0) {
    return { ok: false, error: "Bitte mindestens eine Kategorie auswählen und bewerten, bevor du einreichst." };
  }

  const round = await db.query.rounds.findFirst({ where: eq(rounds.inviteToken, token) });
  if (!round) {
    return { ok: false, error: "Ungültiger Einladungslink." };
  }
  if (round.status !== "open") {
    return {
      ok: false,
      error:
        round.status === "draft"
          ? "Diese Runde wurde noch nicht freigeschaltet."
          : "Diese Runde ist bereits abgeschlossen. Einreichungen sind nicht mehr möglich.",
    };
  }

  const normalizedEmail = participant.email.trim().toLowerCase();

  // Upserts statt Lesen-dann-Schreiben: spart Roundtrips zur Datenbank.
  // Namen/Zusatzangaben werden dabei aktuell gehalten, falls sich etwas geändert hat.
  const participantFields = {
    name: participant.name.trim(),
    profession: participant.profession || null,
    institution: participant.institution || null,
  };
  const [{ id: participantId }] = await db
    .insert(participants)
    .values({ id: newId(), email: normalizedEmail, ...participantFields })
    .onConflictDoUpdate({ target: participants.email, set: participantFields })
    .returning({ id: participants.id });

  const now = new Date();
  const [{ id: submissionId }] = await db
    .insert(submissions)
    .values({ id: newId(), roundId: round.id, participantId, status: "submitted", submittedAt: now })
    .onConflictDoUpdate({
      target: [submissions.roundId, submissions.participantId],
      set: { status: "submitted", submittedAt: now, updatedAt: now },
    })
    .returning({ id: submissions.id });
  await db.delete(ratings).where(eq(ratings.submissionId, submissionId));

  const rows = flattenItems(items, submissionId);
  if (rows.length > 0) {
    await db.insert(ratings).values(rows);
  }

  return { ok: true };
}
