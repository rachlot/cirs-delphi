"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRound } from "@/actions/admin";

export function DeleteRoundButton({ roundId, roundNumber }: { roundId: string; roundNumber: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function remove() {
    if (
      !window.confirm(
        `Runde ${roundNumber} mit allen Einreichungen und Bewertungen löschen? Das lässt sich nicht rückgängig machen.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteRound(roundId);
      if (!result.ok) {
        setError(result.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Wird gelöscht …" : "Runde löschen"}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
