import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "cirs_admin_session";
const SESSION_HOURS = 12;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET ist nicht gesetzt. Bitte in der .env-Datei konfigurieren."
    );
  }
  return secret;
}

/**
 * Vergleicht zwei Strings in konstanter Zeit, um Timing-Angriffe auf das
 * Admin-Passwort zu erschweren.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function checkAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error(
      "ADMIN_PASSWORD ist nicht gesetzt. Bitte in der .env-Datei konfigurieren."
    );
  }
  return safeEqual(candidate, expected);
}

export async function createAdminSession(): Promise<void> {
  const token = jwt.sign({ role: "admin" }, getSecret(), {
    expiresIn: `${SESSION_HOURS}h`,
  });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdminPage(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    jwt.verify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
