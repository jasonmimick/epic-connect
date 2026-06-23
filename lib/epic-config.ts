// Epic FHIR sandbox endpoints — swap base URL for production
export const EPIC = {
  // Sandbox base — all Epic FHIR sandbox traffic goes here
  base: "https://fhir.epic.com/interconnect-fhir-oauth",

  // OAuth endpoints
  authUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
  tokenUrl: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",

  // FHIR R4 base
  fhirBase: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
};

// Every patient-facing scope Epic supports — "GOD mode"
// Epic will silently drop scopes the app isn't approved for; no error.
// Start minimal — Epic silently drops unapproved scopes but may reject unknown ones entirely
// Expand back once the basic flow works
export const EPIC_SCOPES = [
  "openid",
  "fhirUser",
  "patient/Patient.read",
  "patient/Observation.read",
  "patient/Condition.read",
  "patient/MedicationRequest.read",
  "patient/AllergyIntolerance.read",
  "patient/Immunization.read",
  "patient/Procedure.read",
  "patient/Encounter.read",
  "patient/DiagnosticReport.read",
  "patient/DocumentReference.read",
].join(" ");

// Epic sandbox test patients — use these to log in during OAuth
// https://fhir.epic.com/Documentation?docId=testpatients
export const TEST_PATIENTS = [
  { name: "Camila Lopez",       username: "fhircamila",  password: "epicepic1" },
  { name: "Derrick Lin",        username: "fhirderrick", password: "epicepic1" },
  { name: "Jason Argonaut",     username: "fhirjason",   password: "epicepic1" },
  { name: "Jessica Argonaut",   username: "fhirjessica", password: "epicepic1" },
];
