// Step 2: Epic redirects here after the user logs in
// Exchange the auth code for an access token, save to session, redirect to dashboard

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EPIC } from "@/lib/epic-config";
import { saveSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_params", req.url));
  }

  // Verify state to prevent CSRF
  const store = await cookies();
  const savedState = store.get("oauth_state")?.value;
  const verifier = store.get("pkce_verifier")?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/?error=state_mismatch", req.url));
  }

  // Exchange code for token
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.EPIC_REDIRECT_URI!,
    client_id: process.env.EPIC_CLIENT_ID!,
    code_verifier: verifier ?? "",
  });

  // Confidential clients also send client_secret via Basic auth
  const credentials = Buffer.from(
    `${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch(EPIC.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Token exchange failed:", err);
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
  }

  const token = await tokenRes.json();

  // Epic returns the patient ID in the token response for patient-scoped tokens
  const patientId = token.patient;
  if (!patientId) {
    return NextResponse.redirect(new URL("/?error=no_patient_context", req.url));
  }

  await saveSession({
    accessToken: token.access_token,
    patientId,
    tokenType: token.token_type ?? "Bearer",
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  });

  // Clean up PKCE cookies
  store.delete("pkce_verifier");
  store.delete("oauth_state");

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
