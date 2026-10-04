import { AdminNav } from "@/components/AdminNav";

// Wird bei Klicks sofort angezeigt, während die Seite auf dem Server geladen wird.
export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />
      <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Wird geladen">
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-100" />
        <div className="h-32 rounded-lg border border-slate-200 bg-slate-50" />
      </div>
    </main>
  );
}
