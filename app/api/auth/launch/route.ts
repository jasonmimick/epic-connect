// Step 1: Build the Epic OAuth URL and redirect the user there
// Stores PKCE verifier + state in cookies so /callback can verify them

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EPIC, EPIC_SCOPES } from "@/lib/epic-config";
import { generatePKCE } from "@/lib/pkce";

export async function GET() {
  const clientId = process.env.EPIC_CLIENT_ID;
  const redirectUri = process.env.EPIC_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "EPIC_CLIENT_ID and EPIC_REDIRECT_URI must be set in .env.local" },
      { status: 500 }
    );
  }

  const { verifier, challenge } = await generatePKCE();
  const state = crypto.randomUUID();

  // Store verifier + state in short-lived cookies — verified in /callback
  const store = await cookies();
  store.set("pkce_verifier", verifier, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" });
  store.set("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 300, path: "/" });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: EPIC_SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${EPIC.authUrl}?${params.toString()}`);
}
