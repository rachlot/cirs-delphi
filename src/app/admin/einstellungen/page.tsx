import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { AdminNav } from "@/components/AdminNav";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  await requireAdminPage();
  const current = await db.query.settings.findFirst({ where: eq(settings.id, 1) });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <AdminNav />
      <h1 className="mb-4 text-lg font-semibold text-slate-800">Einstellungen</h1>
      <SettingsForm
        initial={{
          projectName: current?.projectName ?? "CIRS-Kategorien Delphi-Verfahren",
          consensusMaxIqr: current?.consensusMaxIqr ?? 2,
          maxRounds: current?.maxRounds ?? 5,
        }}
      />
    </main>
  );
}
