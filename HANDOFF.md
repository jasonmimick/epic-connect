# epic-connect — Session Handoff

## What This Is

A standalone Next.js app that does SMART on FHIR OAuth against Epic's sandbox, pulls all available patient FHIR data, and displays it. Intended as the Epic integration bridge for ChartKeep and Pruva.

**Live:** https://epic-connect-rho.vercel.app  
**Repo:** https://github.com/jasonmimick/epic-connect  
**Vercel project:** jason-mimicks-projects/epic-connect

---

## What Was Built Today

### App structure
```
app/
  page.tsx                    # Landing page — "Connect with Epic MyChart" button + test creds
  dashboard/page.tsx          # Patient data dashboard — all FHIR resources + raw viewer
  api/auth/launch/route.ts    # Step 1: builds Epic OAuth URL + redirects
  api/auth/callback/route.ts  # Step 2: exchanges code for token, sets session, redirects
  api/auth/logout/route.ts    # Clears session cookie
  api/auth/debug/route.ts     # Debug: shows what client_id/redirect_uri/scopes are being sent
  api/fhir/route.ts           # FHIR proxy: fetches any resource from Epic using stored token
lib/
  epic-config.ts              # Sandbox URLs, scopes, test patient credentials
  pkce.ts                     # PKCE code challenge generation (required by Epic)
  session.ts                  # Encrypted HTTP-only cookie session
  fhir-client.ts              # FHIR R4 fetcher — 16 resource types in parallel
```

### Epic app registration
- Registered at https://fhir.epic.com
- Status: **Test/Sandbox mode** (not Draft — this was a blocker)
- Audience: **Patient** profile only
- Auto client distribution: **USCDI v3**
- Confidential client: **Yes**
- Registered redirect URIs:
  - `http://localhost:3000/api/auth/callback`
  - `https://epic-connect.vercel.app/api/auth/callback`
  - `https://epic-connect-rho.vercel.app/api/auth/callback`

### Credentials (in .env.local — gitignored)
- Non-Production Client ID: `473579e8-4c7a-4f72-8eb9-05059bdd7a84` ← use this for sandbox
- Production Client ID: `8e68d7d9-3bcc-432c-8559-699c35798a6d` ← for live customer Epic instances
- Sandbox Client Secret: in `.env.local`

### Vercel env vars set
- `EPIC_CLIENT_ID` = non-production client ID
- `EPIC_CLIENT_SECRET` = sandbox secret
- `EPIC_REDIRECT_URI` = `https://epic-connect-rho.vercel.app/api/auth/callback`
- `SESSION_SECRET` = `change-this-to-a-real-secret-in-prod`
- `NEXT_PUBLIC_APP_URL` = `https://epic-connect.vercel.app` (no longer used in code)

---

## Bugs Fixed Today

| Bug | Fix |
|---|---|
| `OAuth2 Error — something went wrong authorizing client` | App was in Draft status — had to fill in description + T&C URL + click "Ready for Sandbox" |
| Same OAuth error persisted | `launch/patient` scope causes Epic sandbox to reject the request — removed it |
| Wrong client ID on Vercel | Production client ID doesn't work with sandbox — swapped to non-production |
| Wrong redirect URI | `epic-connect.vercel.app` is a different Vercel project — URL is `epic-connect-rho.vercel.app` |
| Session cookie not sticking | `cookies().set()` doesn't attach to `NextResponse.redirect()` — fixed by returning 200 HTML + JS redirect |
| Dashboard redirects back to `/` | Above cookie fix — still confirming this works |

---

## Current State / What's Left

### Still unconfirmed
- Session cookie fix (200 + JS redirect) was just pushed — **not yet verified working end-to-end**
- Dashboard may not load if token doesn't contain `patient` field (we fall back to `sub` but this is unverified)

### Known issue
- Without `launch/patient` scope, Epic may not return the patient ID in the token response
- Fallback to `token.sub` is in place — need to verify this works with a real login

### Next session should
1. Confirm dashboard loads after login at https://epic-connect-rho.vercel.app
2. Check Vercel logs after a login attempt — look for `patientId:` in the callback log
3. If `no_patient_context` error appears, investigate using the `/userinfo` endpoint to get patient ID
4. Once dashboard loads, design the data push to ChartKeep's FastAPI backend

---

## Sandbox Test Patients

| Name | Username | Password |
|---|---|---|
| Camila Lopez | `fhircamila` | `epicepic1` |
| Derrick Lin | `fhirderrick` | `epicepic1` |
| Jason Argonaut | `fhirjason` | `epicepic1` |
| Jessica Argonaut | `fhirjessica` | `epicepic1` |

---

## Vercel Workflow

**Do not run `vercel --prod` manually.** GitHub auto-deploy is active.  
Push to `main` → Vercel deploys automatically to https://epic-connect-rho.vercel.app

---

## Bigger Picture

epic-connect is the Epic OAuth bridge for the CareHub portfolio. Next step is to pipe the fetched FHIR data into ChartKeep's local vault (FastAPI endpoint) or Pruva's FHIR lake. ChartKeep already ingests FHIR JSON — just needs an HTTP endpoint that accepts bundles.

Also: a separate **Backend System** Epic app registration is needed for bulk/platform-level access (population queries, system-to-system JWT, no user login). Register separately at fhir.epic.com when ready.
