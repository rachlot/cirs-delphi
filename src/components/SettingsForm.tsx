"use client";

import { useState } from "react";
import { updateSettings } from "@/actions/admin";

export function SettingsForm({
  initial,
}: {
  initial: { projectName: string; consensusMaxIqr: number | null; maxRounds: number | null };
}) {
  const [projectName, setProjectName] = useState(initial.projectName);
  const [maxIqr, setMaxIqr] = useState(initial.consensusMaxIqr?.toString() ?? "");
  const [maxRounds, setMaxRounds] = useState(initial.maxRounds?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings({
        projectName,
        consensusMaxIqr: maxIqr.trim() ? Number(maxIqr) : null,
        maxRounds: maxRounds.trim() ? Number(maxRounds) : null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Projektname</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Konsenskriterium (maximaler Interquartilsabstand, IQR)
        </label>
        <input
          type="number"
          min={0}
          max={8}
          step="0.5"
          value={maxIqr}
          onChange={(e) => setMaxIqr(e.target.value)}
          placeholder="z.B. 2"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Nach der RAND/UCLA Appropriateness Method gilt Konsens als erreicht, wenn der
          Interquartilsabstand (IQR) der 1–9-Bewertungen einer Kategorie kleiner oder gleich diesem Wert
          ist (üblich: 2–3). Kategorien mit einem höheren IQR werden bei der Rundenerstellung automatisch
          als „kontrovers“ vorgeschlagen. Das Erreichen des Kriteriums beendet das Verfahren nicht
          automatisch – die Entscheidung bleibt bei der Organisation.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Maximale Rundenzahl</label>
        <input
          type="number"
          min={1}
          value={maxRounds}
          onChange={(e) => setMaxRounds(e.target.value)}
          placeholder="z.B. 5 (leer = unbegrenzt)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      {saved && <p className="text-sm text-green-700">Gespeichert.</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? "Wird gespeichert …" : "Speichern"}
      </button>
    </form>
  );
}
