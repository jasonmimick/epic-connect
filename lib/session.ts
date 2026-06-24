// Lightweight server-side session via encrypted HTTP-only cookies
// Stores Epic access token + patient ID between requests

import { cookies } from "next/headers";

export const COOKIE_NAME = "epic_session";
const SESSION_SECRET = process.env.SESSION_SECRET!;

export interface EpicSession {
  accessToken: string;
  patientId: string;
  tokenType: string;
  expiresAt: number; // unix ms
}

// XOR-encrypt with secret — simple enough for a dev/sandbox context
// For production: use jose or iron-session for proper AES-GCM encryption
function encrypt(data: string, secret: string): string {
  const key = secret.repeat(Math.ceil(data.length / secret.length)).slice(0, data.length);
  return Buffer.from(
    data.split("").map((c, i) => c.charCodeAt(0) ^ key.charCodeAt(i)).join(",")
  ).toString("base64");
}

function decrypt(encrypted: string, secret: string): string {
  const nums = Buffer.from(encrypted, "base64").toString().split(",").map(Number);
  const key = secret.repeat(Math.ceil(nums.length / secret.length)).slice(0, nums.length);
  return nums.map((n, i) => String.fromCharCode(n ^ key.charCodeAt(i))).join("");
}

export function buildSessionCookie(session: EpicSession): {
  value: string;
  options: { httpOnly: boolean; secure: boolean; sameSite: "lax"; maxAge: number; path: string };
} {
  const encrypted = encrypt(JSON.stringify(session), SESSION_SECRET);
  return {
    value: encrypted,
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
    return JSON.parse(decrypt(raw, SESSION_SECRET)) as EpicSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
