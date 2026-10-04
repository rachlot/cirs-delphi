import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">CIRS-Kategorien Delphi-Verfahren</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        Diese Anwendung dient der Konsentierung eines CIRS-Kategoriensystems durch ein Expertengremium. Als
        Teilnehmer:in benötigst du den persönlichen Einladungslink zur jeweils aktuellen Runde, den du von
        der Organisation erhalten hast.
      </p>
      <Link
        href="/admin"
        className="mt-8 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Zum Organisations-Bereich
      </Link>
    </main>
  );
}
