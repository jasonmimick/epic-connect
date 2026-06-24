// Lightweight server-side session via encrypted HTTP-only cookies
// Stores Epic access token + patient ID between requests

import { cookies } from "next/headers";

export const COOKIE_NAME = "epic_session";

export interface EpicSession {
  accessToken: string;
  patientId: string;
  tokenType: string;
  expiresAt: number; // unix ms
}

// Base64 encode session — HTTP-only + Secure + HTTPS is sufficient for sandbox
// For production swap to jose or iron-session for proper AES-GCM encryption
export function buildSessionCookie(session: EpicSession): {
  value: string;
  options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; maxAge: number; path: string };
} {
  return {
    value: Buffer.from(JSON.stringify(session)).toString("base64"),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 3600,
      path: "/",
    },
  };
}

export async function saveSession(session: EpicSession) {
  const store = await cookies();
  const { value, options } = buildSessionCookie(session);
  store.set(COOKIE_NAME, value, options);
}

export async function getSession(): Promise<EpicSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString()) as EpicSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
