import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminIndexPage() {
  const authed = await isAdminAuthenticated();
  redirect(authed ? "/admin/dashboard" : "/admin/login");
}
