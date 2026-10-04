"use client";

import { useState } from "react";
import { participantSchema, type ParticipantInput } from "@/lib/validation";

export function ParticipantIdentifyForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (data: ParticipantInput) => void;
  submitting?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [institution, setInstitution] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = participantSchema.safeParse({ name, email, profession, institution });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte Angaben prüfen.");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-slate-800">Bevor es losgeht</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bitte gib Name und E-Mail-Adresse an. So können wir deine Einschätzung über die Runden hinweg
          zuordnen. Deine Angaben werden nur für die Auswertung dieses Delphi-Verfahrens verwendet.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">E-Mail *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Berufsgruppe / Fachbereich (optional)</label>
        <input
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Einrichtung (optional)</label>
        <input
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? "Wird geladen …" : "Weiter zur Bewertung"}
      </button>
    </form>
  );
}
