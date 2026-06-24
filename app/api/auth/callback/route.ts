// Step 2: Epic redirects here after the user logs in
// Exchange the auth code for an access token, save to session, redirect to dashboard

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EPIC } from "@/lib/epic-config";
import { buildSessionCookie, COOKIE_NAME } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${appUrl}/?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?error=missing_params`);
  }

  // Verify state to prevent CSRF
  const store = await cookies();
  const savedState = store.get("oauth_state")?.value;
  const verifier = store.get("pkce_verifier")?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/?error=state_mismatch`);
  }

  // Exchange code for token
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.EPIC_REDIRECT_URI!,
    client_id: process.env.EPIC_CLIENT_ID!,
    code_verifier: verifier ?? "",
  });

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
    return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`);
  }

  const token = await tokenRes.json();
  console.log("Token response keys:", Object.keys(token));

  // Epic returns patient in token for patient-scoped tokens
  // Fall back to sub (patient FHIR ID) if patient field absent
  const patientId = token.patient ?? token.sub;
  if (!patientId) {
    return NextResponse.redirect(`${appUrl}/?error=no_patient_context`);
  }

  // Set cookie directly on the redirect response — cookies().set() doesn't
  // attach to NextResponse.redirect() in Next.js Route Handlers
  const response = NextResponse.redirect(`${appUrl}/dashboard`);
  const { value, options } = buildSessionCookie({
    accessToken: token.access_token,
    patientId,
    tokenType: token.token_type ?? "Bearer",
    expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
  });
  response.cookies.set(COOKIE_NAME, value, options);

  return response;
}
