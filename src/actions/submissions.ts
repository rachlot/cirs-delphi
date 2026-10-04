"use server";

import { eq, and } from "drizzle-orm";
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

  let existingParticipant = await db.query.participants.findFirst({
    where: eq(participants.email, normalizedEmail),
  });

  if (!existingParticipant) {
    const id = newId();
    await db.insert(participants).values({
      id,
      name: participant.name.trim(),
      email: normalizedEmail,
      profession: participant.profession || null,
      institution: participant.institution || null,
    });
    existingParticipant = {
      id,
      name: participant.name.trim(),
      email: normalizedEmail,
      profession: participant.profession || null,
      institution: participant.institution || null,
      createdAt: new Date(),
    };
  } else {
    // Namen/Zusatzangaben aktuell halten, falls sich etwas geändert hat
    await db
      .update(participants)
      .set({
        name: participant.name.trim(),
        profession: participant.profession || null,
        institution: participant.institution || null,
      })
      .where(eq(participants.id, existingParticipant.id));
  }

  const existingSubmission = await db.query.submissions.findFirst({
    where: and(eq(submissions.roundId, round.id), eq(submissions.participantId, existingParticipant.id)),
  });

  let submissionId: string;
  if (existingSubmission) {
    submissionId = existingSubmission.id;
    await db
      .update(submissions)
      .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(submissions.id, submissionId));
    await db.delete(ratings).where(eq(ratings.submissionId, submissionId));
  } else {
    submissionId = newId();
    await db.insert(submissions).values({
      id: submissionId,
      roundId: round.id,
      participantId: existingParticipant.id,
      status: "submitted",
      submittedAt: new Date(),
    });
  }

  const rows = flattenItems(items, submissionId);
  if (rows.length > 0) {
    await db.insert(ratings).values(rows);
  }

  return { ok: true };
}
