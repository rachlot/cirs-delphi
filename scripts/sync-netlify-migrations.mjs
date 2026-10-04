// Netlify Database spielt Migrationen aus netlify/database/migrations/ automatisch ein.
// drizzle-kit erzeugt sie unter drizzle/ (inkl. Journal für die lokale Entwicklung);
// dieses Skript spiegelt die SQL-Dateien dorthin. Läuft automatisch nach `npm run db:generate`.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";

const target = "netlify/database/migrations";
mkdirSync(target, { recursive: true });
for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql"))) {
  copyFileSync(`drizzle/${file}`, `${target}/${file}`);
}
