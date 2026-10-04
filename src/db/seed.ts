import "dotenv/config";
import { seedIfEmpty } from "./seed-data";

async function main() {
  console.log("Seed: prüfe vorhandene Daten ...");
  const created = await seedIfEmpty();
  if (created === 0) {
    console.log("Es existieren bereits Runden. Seed wird übersprungen, um Daten nicht zu duplizieren.");
    console.log("Falls du wirklich neu seeden willst: Datenbank leeren und erneut ausführen.");
  } else {
    console.log(`Fertig: ${created} Kategorien angelegt und Runde 1 (Status: draft) zugeordnet.`);
    console.log(
      "Aktiviere Runde 1 im Admin-Bereich (Status auf 'open' setzen), um den Einladungslink freizuschalten."
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
