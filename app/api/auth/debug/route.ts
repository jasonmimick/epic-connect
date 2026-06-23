import { NextResponse } from "next/server";
import { EPIC, EPIC_SCOPES } from "@/lib/epic-config";

export async function GET() {
  const clientId = process.env.EPIC_CLIENT_ID;
  const redirectUri = process.env.EPIC_REDIRECT_URI;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId ?? "NOT SET",
    redirect_uri: redirectUri ?? "NOT SET",
    scope: EPIC_SCOPES,
    state: "debug-state",
    code_challenge: "debug-challenge",
    code_challenge_method: "S256",
  });

  return NextResponse.json({
    clientId,
    redirectUri,
    authUrl: `${EPIC.authUrl}?${params.toString()}`,
    scopes: EPIC_SCOPES.split(" "),
    scopeCount: EPIC_SCOPES.split(" ").length,
  });
}
