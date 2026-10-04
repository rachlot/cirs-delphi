// Wird sofort angezeigt, während die Runde auf dem Server geladen wird.
export default function RoundLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Wird geladen">
        <div className="h-6 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-48 rounded-lg border border-slate-200 bg-slate-50" />
      </div>
    </main>
  );
}
