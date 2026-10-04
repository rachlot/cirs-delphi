import { NextRequest, NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";
import { isAdminAuthenticated } from "@/lib/auth";
import { buildCsvRows } from "@/lib/export";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const roundId = req.nextUrl.searchParams.get("roundId") ?? undefined;
  const rows = await buildCsvRows(roundId);

  const csv = stringify(rows, {
    header: true,
    columns: [
      { key: "teilnehmerName", header: "Teilnehmer_Name" },
      { key: "teilnehmerEmail", header: "Teilnehmer_Email" },
      { key: "berufsgruppe", header: "Berufsgruppe" },
      { key: "einrichtung", header: "Einrichtung" },
      { key: "runde", header: "Runde" },
      { key: "rundentitel", header: "Rundentitel" },
      { key: "eingereichtAm", header: "Eingereicht_am" },
      { key: "kategorie", header: "Kategorie" },
      { key: "bewertung", header: "Bewertung_1_bis_9" },
      { key: "eigeneKategorie", header: "Eigene_Kategorie" },
      { key: "kommentar", header: "Kommentar" },
    ],
  });

  // BOM für korrekte Umlaut-Darstellung in Excel
  const bom = "﻿";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cirs-delphi-export${roundId ? "" : "-alle-runden"}.csv"`,
    },
  });
}
