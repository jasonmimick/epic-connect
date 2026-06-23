// FHIR R4 client — wraps Epic's API with the patient's access token

import { EPIC } from "./epic-config";

export interface FhirBundle {
  resourceType: "Bundle";
  total?: number;
  entry?: Array<{ resource: FhirResource }>;
}

export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export async function fetchFhirResource(
  resourceType: string,
  accessToken: string,
  patientId: string,
  params: Record<string, string> = {}
): Promise<FhirBundle | FhirResource | null> {
  const url = new URL(`${EPIC.fhirBase}/${resourceType}`);

  // Patient-scoped resources need the patient filter
  if (resourceType !== "Patient") {
    url.searchParams.set("patient", patientId);
  }

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/fhir+json",
    },
    next: { revalidate: 0 }, // always fresh — no caching patient data
  });

  if (!res.ok) {
    console.error(`FHIR ${resourceType} error: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json();
}

export async function fetchPatient(
  accessToken: string,
  patientId: string
): Promise<FhirResource | null> {
  const res = await fetch(`${EPIC.fhirBase}/Patient/${patientId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/fhir+json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) return null;
  return res.json();
}

// Fetch all standard patient resources in parallel
export async function fetchAllPatientData(accessToken: string, patientId: string) {
  const resources = [
    "Condition",
    "MedicationRequest",
    "AllergyIntolerance",
    "Immunization",
    "Observation",
    "DiagnosticReport",
    "Encounter",
    "Procedure",
    "DocumentReference",
    "CarePlan",
    "Goal",
    "Device",
    "Coverage",
    "ServiceRequest",
    "Appointment",
    "Communication",
  ];

  const [patient, ...results] = await Promise.all([
    fetchPatient(accessToken, patientId),
    ...resources.map((r) => fetchFhirResource(r, accessToken, patientId)),
  ]);

  return {
    Patient: patient,
    ...Object.fromEntries(resources.map((r, i) => [r, results[i]])),
  };
}

// Pull display name from a FHIR HumanName array
export function getPatientName(patient: FhirResource | null): string {
  if (!patient) return "Unknown";
  const names = patient.name as Array<{ use?: string; text?: string; given?: string[]; family?: string }> | undefined;
  if (!names?.length) return "Unknown";
  const official = names.find((n) => n.use === "official") ?? names[0];
  if (official.text) return official.text;
  return [
    ...(official.given ?? []),
    official.family,
  ].filter(Boolean).join(" ");
}

// Count entries in a FHIR Bundle
export function bundleCount(bundle: FhirBundle | FhirResource | null): number {
  if (!bundle || bundle.resourceType !== "Bundle") return 0;
  return (bundle as FhirBundle).total ?? (bundle as FhirBundle).entry?.length ?? 0;
}

// Extract entries from a FHIR Bundle
export function bundleEntries(bundle: FhirBundle | FhirResource | null): FhirResource[] {
  if (!bundle || bundle.resourceType !== "Bundle") return [];
  return ((bundle as FhirBundle).entry ?? []).map((e) => e.resource);
}
