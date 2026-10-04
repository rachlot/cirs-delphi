import Link from "next/link";
import { adminLogout } from "@/actions/admin";

export function AdminNav() {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-slate-800">
          CIRS-Delphi · Organisation
        </Link>
        <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-teal-700">
          Runden
        </Link>
        <Link href="/admin/einstellungen" className="text-sm text-slate-500 hover:text-teal-700">
          Einstellungen
        </Link>
      </div>
      <form action={adminLogout}>
        <button type="submit" className="text-sm text-slate-400 hover:text-slate-600">
          Abmelden
        </button>
      </form>
    </div>
  );
}
