# epic-connect — Agent Handoff

## What This Is

A Next.js app that does SMART on FHIR OAuth against Epic's sandbox, pulls all available patient FHIR data, and displays it in a dashboard. It is the Epic integration bridge for the CareHub portfolio (Pruva, Chartkeep).

**Live:** https://epic-connect-rho.vercel.app  
**Repo:** https://github.com/jasonmimick/epic-connect  
**Vercel project:** `jason-mimicks-projects/epic-connect`  
**Status: FULLY WORKING END TO END as of 2026-06-24**

---

## It Works

The full OAuth → dashboard flow is confirmed working:

1. User visits https://epic-connect-rho.vercel.app
2. Clicks "Connect with Epic MyChart"
3. Logs in with a sandbox test patient
4. Grants consent on Epic's screen
5. Lands on `/dashboard` showing all FHIR data

Confirmed with test patient `fhircamila / epicepic1` — dashboard showed 7 conditions, 38 observations, 4 diagnostic reports, 13 document references, etc.

---

## Epic App Registration

Registered at https://fhir.epic.com  
**Status: Test/Sandbox mode** (must NOT be in Draft — was a major blocker)

| Field | Value |
|---|---|
| Audience | Patient |
| Auto client distribution | USCDI v3 |
| Confidential client | Yes |
| Scopes | All patient/* scopes selected |

**Registered redirect URIs:**
- `http://localhost:3000/api/auth/callback`
- `https://epic-connect.vercel.app/api/auth/callback`
- `https://epic-connect-rho.vercel.app/api/auth/callback`

**Client IDs:**
- Non-Production: `473579e8-4c7a-4f72-8eb9-05059bdd7a84` ← use this for sandbox/fhir.epic.com
- Production: `8e68d7d9-3bcc-432c-8559-699c35798a6d` ← for live customer Epic instances only

**Credentials:** in `.env.local` (gitignored) and Vercel env vars.

---

## Sandbox Test Patients

All passwords: `epicepic1`

| Name | Username |
|---|---|
| Camila Lopez | `fhircamila` |
| Derrick Lin | `fhirderrick` |
| Jason Argonaut | `fhirjason` |
| Jessica Argonaut | `fhirjessica` |

---

## Architecture

```
app/
  page.tsx                    # Landing — Connect button + test creds
  dashboard/page.tsx          # Server component — fetches all FHIR data, renders dashboard
  api/auth/launch/route.ts    # Builds Epic OAuth URL, stores PKCE + state cookies, redirects
  api/auth/callback/route.ts  # Exchanges code for token, sets session cookie, JS-redirects to /dashboard
  api/auth/logout/route.ts    # Clears session cookie
  api/auth/debug/route.ts     # GET /api/auth/debug — shows clientId, redirectUri, scopes in use
  api/fhir/route.ts           # Proxy: client requests ?resource=X, server fetches from Epic
lib/
  epic-config.ts              # Sandbox URLs, scopes (no launch/patient), test patient creds
  pkce.ts                     # PKCE code challenge (SHA-256, base64url)
  session.ts                  # HTTP-only cookie session — plain base64 JSON encoding
  fhir-client.ts              # Fetches 16 FHIR resource types in parallel from Epic
```

---

## Key Technical Decisions & Why

### No `launch/patient` scope
Epic's sandbox returns "The request is invalid" if `launch/patient` is included in standalone patient launch. This scope is for EHR launch only (launched from inside Epic's UI). For standalone patient launch, omit it — Epic automatically returns `patient` in the token response when a patient authenticates with MyChart credentials.

### Session cookie is plain base64 JSON
Originally used XOR "encryption" which created comma-separated number strings. Epic access tokens are long JWTs (500+ chars) — XOR inflated these to 5000+ chars, silently exceeding the 4KB cookie limit. Cookie was dropped on every request. Base64 is ~33% overhead — well within limits. HTTP-only + Secure + HTTPS is sufficient protection.

### Callback returns 200 HTML + JS redirect (not 307)
`NextResponse.redirect()` with `Set-Cookie` is unreliable — some browsers/CDNs drop cookies on redirect responses. Instead the callback returns a 200 HTML page with `<script>window.location.replace('/dashboard')</script>`. Cookie is set on the 200 response, browser stores it, then navigates to dashboard.

### `req.nextUrl.origin` for redirects
Never use `NEXT_PUBLIC_APP_URL` for internal redirects. Always use `req.nextUrl.origin` — ensures redirects stay on the same domain regardless of which Vercel alias the user entered from.

---

## Vercel Setup

**GitHub auto-deploy is active.** Push to `main` → Vercel deploys automatically. Never run `vercel --prod` manually.

**Env vars (production):**
- `EPIC_CLIENT_ID` = `473579e8-4c7a-4f72-8eb9-05059bdd7a84`
- `EPIC_CLIENT_SECRET` = sandbox client secret (in Vercel dashboard)
- `EPIC_REDIRECT_URI` = `https://epic-connect-rho.vercel.app/api/auth/callback`
- `SESSION_SECRET` = `change-this-to-a-real-secret-in-prod` (unused now but harmless)
- `NEXT_PUBLIC_APP_URL` = `https://epic-connect.vercel.app` (unused now but harmless)

**Important:** `epic-connect.vercel.app` and `epic-connect-rho.vercel.app` are DIFFERENT Vercel projects. Our app is always at `epic-connect-rho.vercel.app`.

---

## Local Dev

```bash
cd /Users/jason/business/epic-connect
npm run dev   # starts on :3000
```

`.env.local` has all credentials. Debug endpoint: `http://localhost:3000/api/auth/debug`

---

## What's Next

The dashboard works and pulls real Epic patient data. The logical next steps:

1. **Push FHIR data to Chartkeep SaaS** — after OAuth, POST the FHIR bundles to Chartkeep's `/api/ingest` endpoint. epic-connect becomes the Epic data source, Chartkeep becomes the destination.

2. **Backend System Epic app** — register a separate app at fhir.epic.com with Audience: Backend System for bulk/population-level queries (system-to-system JWT, no user login). Needed for Pruva's payer-side data access.

3. **Add to Pruva** — wire the same SMART on FHIR flow into Pruva so patients can pull their Epic records directly into their Pruva health card.

4. **EHR launch** — register a separate Clinician/Admin audience app for launching from inside Epic's UI (requires `launch` scope, not `launch/patient`).

---

## Business Context

epic-connect is part of the CareHub portfolio:
- **Pruva** — FHIR compliance SaaS for health insurers (pruva-poc.vercel.app)
- **Chartkeep** — personal health vault, local-first + SaaS (chartkeep-green.vercel.app)
- **Cairn** — AI service mesh / LLM governance (cairnlabs.io)
- **epic-connect** — this repo, Epic OAuth bridge

All products under `/Users/jason/business/`. Portfolio CLAUDE.md at `/Users/jason/business/CLAUDE.md`.
