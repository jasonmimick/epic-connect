// Server component — fetches all Epic data on the server using the stored session token
// Nothing touches the client except rendering

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  fetchAllPatientData,
  getPatientName,
  bundleEntries,
  bundleCount,
  type FhirResource,
} from "@/lib/fhir-client";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/");

  const data = await fetchAllPatientData(session.accessToken, session.patientId);
  const patient = data.Patient as FhirResource | null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-sm font-bold">
            C
          </div>
          <span className="font-semibold">ChartKeep</span>
          <span className="text-gray-600 text-sm">/ Epic Connect</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{getPatientName(patient)}</span>
          <a
            href="/api/auth/logout"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Disconnect
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Patient summary card */}
        <PatientCard patient={patient} />

        {/* Resource grid — one card per FHIR resource type */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Health Records
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data)
              .filter(([key]) => key !== "Patient")
              .map(([resourceType, bundle]) => (
                <ResourceCard
                  key={resourceType}
                  resourceType={resourceType}
                  bundle={bundle}
                />
              ))}
          </div>
        </div>

        {/* Raw FHIR dump — the "GOD view" */}
        <RawViewer data={data} />
      </main>
    </div>
  );
}

function PatientCard({ patient }: { patient: FhirResource | null }) {
  if (!patient) return null;

  const name = patient.name as Array<{ given?: string[]; family?: string }> | undefined;
  const officialName = name?.[0];
  const dob = patient.birthDate as string | undefined;
  const gender = patient.gender as string | undefined;
  const ids = patient.identifier as Array<{ system?: string; value?: string }> | undefined;
  const mrn = ids?.find((i) => i.system?.includes("MRN") || i.system?.includes("mrn"))?.value
    ?? ids?.[0]?.value;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {officialName?.given?.join(" ")} {officialName?.family}
          </h1>
          <div className="flex gap-4 text-sm text-gray-400">
            {dob && <span>DOB: {dob}</span>}
            {gender && <span className="capitalize">{gender}</span>}
            {mrn && <span>MRN: {mrn}</span>}
          </div>
        </div>
        <div className="text-xs bg-green-950 text-green-400 border border-green-900 px-3 py-1 rounded-full">
          Connected
        </div>
      </div>
    </div>
  );
}

function ResourceCard({
  resourceType,
  bundle,
}: {
  resourceType: string;
  bundle: unknown;
}) {
  const count = bundleCount(bundle as Parameters<typeof bundleCount>[0]);
  const entries = bundleEntries(bundle as Parameters<typeof bundleEntries>[0]);
  const hasData = count > 0;

  return (
    <div
      className={`border rounded-xl p-4 space-y-3 ${
        hasData
          ? "border-gray-700 bg-gray-900"
          : "border-gray-800 bg-gray-900/50 opacity-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{resourceType}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            hasData
              ? "bg-blue-950 text-blue-400 border border-blue-900"
              : "bg-gray-800 text-gray-600"
          }`}
        >
          {count}
        </span>
      </div>

      {hasData && (
        <ul className="space-y-1">
          {entries.slice(0, 3).map((entry, i) => (
            <li key={i} className="text-xs text-gray-400 truncate">
              {summarizeResource(resourceType, entry)}
            </li>
          ))}
          {entries.length > 3 && (
            <li className="text-xs text-gray-600">+{entries.length - 3} more</li>
          )}
        </ul>
      )}

      {!hasData && (
        <p className="text-xs text-gray-600">No records found</p>
      )}
    </div>
  );
}

function RawViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <details className="border border-gray-800 rounded-xl overflow-hidden">
      <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-400 hover:text-white bg-gray-900 list-none flex items-center justify-between">
        <span>Raw FHIR Data</span>
        <span className="text-xs text-gray-600">click to expand</span>
      </summary>
      <pre className="p-5 text-xs text-green-400 font-mono overflow-auto max-h-96 bg-gray-950">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

// Best-effort one-liner summary for common resource types
function summarizeResource(resourceType: string, resource: FhirResource): string {
  try {
    switch (resourceType) {
      case "Condition": {
        const code = resource.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        return code?.text ?? code?.coding?.[0]?.display ?? resource.id;
      }
      case "MedicationRequest": {
        const med = resource.medicationCodeableConcept as { text?: string } | undefined;
        return med?.text ?? resource.id;
      }
      case "AllergyIntolerance": {
        const sub = resource.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        return sub?.text ?? sub?.coding?.[0]?.display ?? resource.id;
      }
      case "Observation": {
        const code = resource.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        const val = resource.valueQuantity as { value?: number; unit?: string } | undefined;
        const label = code?.text ?? code?.coding?.[0]?.display ?? "Observation";
        return val ? `${label}: ${val.value} ${val.unit ?? ""}`.trim() : label;
      }
      case "Immunization": {
        const vax = resource.vaccineCode as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        return vax?.text ?? vax?.coding?.[0]?.display ?? resource.id;
      }
      case "Encounter": {
        const type = resource.type as Array<{ text?: string }> | undefined;
        const date = resource.period as { start?: string } | undefined;
        return `${type?.[0]?.text ?? "Encounter"} — ${date?.start?.slice(0, 10) ?? ""}`;
      }
      case "Procedure": {
        const code = resource.code as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        return code?.text ?? code?.coding?.[0]?.display ?? resource.id;
      }
      case "DiagnosticReport": {
        const code = resource.code as { text?: string } | undefined;
        return code?.text ?? resource.id;
      }
      case "DocumentReference": {
        const type = resource.type as { text?: string; coding?: Array<{ display?: string }> } | undefined;
        return type?.text ?? type?.coding?.[0]?.display ?? resource.id;
      }
      default:
        return resource.id ?? resourceType;
    }
  } catch {
    return resource.id ?? resourceType;
  }
}
