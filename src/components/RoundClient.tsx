"use client";

import { useState } from "react";
import type { RoundWithPool } from "@/lib/round-data";
import type { ParticipantInput, RatedItemInput } from "@/lib/validation";
import { ParticipantIdentifyForm } from "./ParticipantIdentifyForm";
import { RatingEditor } from "./tree-editor/TreeEditor";
import { lookupExistingSubmission } from "@/actions/participant";
import { renderedToInput } from "@/lib/tree-client";
import { submitTree } from "@/actions/submissions";

export function RoundClient({ round }: { round: RoundWithPool }) {
  const [participant, setParticipant] = useState<ParticipantInput | null>(null);
  const [initialItems, setInitialItems] = useState<RatedItemInput[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function handleIdentify(data: ParticipantInput) {
    setLoading(true);
    try {
      const existing = await lookupExistingSubmission(round.inviteToken, data.email);
      if (existing) {
        setInitialItems(renderedToInput(existing.items));
      } else {
        setInitialItems([]);
      }
      setParticipant(data);
    } finally {
      setLoading(false);
    }
  }

  if (round.status === "draft") {
    return (
      <p className="mx-auto max-w-md rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Diese Runde wurde noch nicht freigeschaltet. Bitte wende dich an die Organisation, falls du diesen
        Link erhalten hast, obwohl die Runde noch nicht gestartet ist.
      </p>
    );
  }

  if (!participant) {
    return <ParticipantIdentifyForm onSubmit={handleIdentify} submitting={loading} />;
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-slate-800">{round.title}</h1>
        <p className="text-sm text-slate-500">
          Angemeldet als {participant.name} ({participant.email})
        </p>
      </div>
      <RatingEditor
        pool={round.pool}
        feedback={round.feedbackSummary}
        roundNumber={round.roundNumber}
        initialItems={initialItems}
        disabled={round.status !== "open"}
        onSubmit={(items) => submitTree({ token: round.inviteToken, participant, items })}
      />
    </div>
  );
}
