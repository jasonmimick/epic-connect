// Thin proxy: client requests a resource type, server fetches from Epic using the stored token
// Keeps the access token server-side only — never exposed to the browser

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchFhirResource, fetchPatient } from "@/lib/fhir-client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const resource = req.nextUrl.searchParams.get("resource");
  if (!resource) {
    return NextResponse.json({ error: "resource param required" }, { status: 400 });
  }

  const data =
    resource === "Patient"
      ? await fetchPatient(session.accessToken, session.patientId)
      : await fetchFhirResource(resource, session.accessToken, session.patientId);

  if (!data) {
    return NextResponse.json({ error: `Failed to fetch ${resource}` }, { status: 502 });
  }

  return NextResponse.json(data);
}
