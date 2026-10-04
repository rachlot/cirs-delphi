import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { buildJsonExport } from "@/lib/export";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const roundId = req.nextUrl.searchParams.get("roundId") ?? undefined;
  const data = await buildJsonExport(roundId);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cirs-delphi-export${roundId ? "" : "-alle-runden"}.json"`,
    },
  });
}
