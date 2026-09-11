# MMVY Shared Portal: simple end-to-end documentation

## 1. What this project does

This is a working prototype for the **Mukhyamantri Medhavi Vidyarthi Yojana (MMVY)**. It stores one user profile in PostgreSQL and lets three consumers use that same record:

```text
React browser portal ──┐
Partner portal ────────┼──> Express API ──> PostgreSQL
API Setu client ───────┘       :3000          users
                                              applications
                                              portal_access_events
```

The data is not copied between portals. `source_portal` on each application records whether it was submitted by `MMVY` or `SERVICE_PORTAL`.

## 2. Main parts of the code

| Location | Responsibility |
| --- | --- |
| `client/` | React 18 + Vite single-page UI, normally served on `http://localhost:5173` during development. |
| `client/src/api.js` | Browser API helper. It calls the backend and turns non-2xx responses into errors. |
| `server/server.js` | Express server, input handling, validation, API routes and PostgreSQL queries. |
| `db/schema.sql` | Tables, ID sequences, database constraints, indexes and update-time triggers. |
| `docker-compose.yml` | Optional local PostgreSQL 16 container. |
| `.env` | Local server configuration and secrets; do not commit its real values. |

The backend does **not** serve the React application. In development, Vite proxies `/api` and `/api-setu` from port 5173 to the Express server on port 3000.

## 3. End-to-end user flows

### Submit an MMVY application

1. The user opens **New MMVY Application** in the React UI.
2. The UI checks `GET /api/health`.
3. It sends the profile and application form to `POST /api/applications`.
4. The server validates the required fields and consent, then starts a PostgreSQL transaction.
5. It creates a user ID (`MMVY-00010001`, for example) when no existing `userId` is supplied, saves the profile, creates an application ID (`APP-00050001`), and commits both records together.
6. The server returns both IDs and the complete stored profile. The UI opens the Profile screen.

If an existing `userId` is supplied, the server uses that record and creates another application for it. Supplied profile fields are also updated, so the form should be filled with the current, correct profile values.

### View or change a profile

1. **My Profile** calls `GET /api/users/:userId`.
2. The response contains the user record and all of that user's applications, newest first.
3. **Update Information** sends `PATCH /api/mmvy/users/:userId` with the fields from the edit form.
4. PostgreSQL's trigger updates `users.updated_at` automatically.

### Partner portal

1. The partner enters an MMVY user ID.
2. The UI calls `GET /api/partner/users/:userId`.
3. The server reads the same `users` and `applications` records and writes a `PROFILE_LOOKUP` event to `portal_access_events`.
4. A partner application uses `POST /api/partner/applications`; it is saved in the same `applications` table with `source_portal = SERVICE_PORTAL`.

### API Setu lookup

An external consumer calls `GET /api-setu/users/:userId` with the `x-api-setu-key` header. The server returns a restricted sharing view and records a `SHARED_PROFILE_LOOKUP` access event. The sharing view omits bank fields, Aadhaar last four digits, and each application's `extra_details`.

## 4. Backend API

Base URL in local development: `http://localhost:3000`

| Method | Route | Access in current code | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Tests the server-to-database connection. |
| `GET` | `/api/users` | Public | Lists every complete user record and its applications. Intended for the internal dashboard. |
| `GET` | `/api/mmvy/users` | Public | Alias of `GET /api/users`. |
| `GET` | `/api/users/:userId` | Public | Gets one complete profile and applications. |
| `PATCH` | `/api/users/:userId` | Public | Updates supplied profile fields. |
| `PATCH` | `/api/mmvy/users/:userId` | Public | Alias of the profile-update route used by the UI. |
| `POST` | `/api/applications` | Public | Creates or updates a user profile and inserts an MMVY application atomically. |
| `GET` | `/api/partner/users/:userId` | Public | Reads a complete shared profile and records a partner lookup event. |
| `POST` | `/api/partner/applications` | Public | Creates an application marked `SERVICE_PORTAL`. |
| `GET` | `/api-setu/users/:userId` | `x-api-setu-key` when configured | Returns the restricted shared view and records an API Setu lookup. |

`GET /api/users/:userId` has no `/api/mmvy` alias in the current server code.

### Common response shapes

```json
// GET /api/users
{ "count": 1, "data": [{ "user_id": "MMVY-00010001", "applications": [] }] }

// GET /api/users/:userId and partner lookup
{ "data": { "user_id": "MMVY-00010001", "applications": [] } }

// POST application
{
  "message": "Application submitted successfully.",
  "userId": "MMVY-00010001",
  "applicationId": "APP-00050001",
  "data": { "user_id": "MMVY-00010001", "applications": [] }
}

// Errors
{ "error": "Description of the problem" }
```

The partner response also includes `source: "COMMON_POSTGRESQL_DATA_STORE"`. The API Setu response also includes `source`, `fetchedAt`, and `data`.

### Create-application request body

The browser sends this shape. Profile keys may use the documented camelCase names; the server also accepts the database-style snake_case names.

```json
{
  "userId": "MMVY-00010001",
  "profile": {
    "firstName": "Asha",
    "lastName": "Verma",
    "mobile": "9876543210",
    "addressLine1": "House 10, Ward 2",
    "state": "Madhya Pradesh",
    "pincode": "462001",
    "bankName": "Example Bank"
  },
  "application": {
    "applicationType": "FRESH",
    "academicYear": "2026-27",
    "schemeName": "Mukhyamantri Medhavi Vidyarthi Yojana",
    "instituteName": "Example College",
    "courseName": "B.Tech",
    "consentGiven": true
  }
}
```

Omit `userId` for a new person. An unknown supplied `userId` is created unchanged by the current code; a production system should not trust a client-provided identifier this way. On a new profile, `firstName`, `mobile`, and `addressLine1` are mandatory. On every application, `academicYear`, `instituteName`, `courseName`, and `consentGiven: true` are mandatory. The server accepts further application fields such as `instituteCode`, `admissionDate`, `qualifyingPercentage`, `familyAnnualIncome`, and an object in `extraDetails`.

### Profile fields accepted by `PATCH`

`firstName`, `lastName`, `dateOfBirth`, `gender`, `mobile`, `email`, `guardianName`, `category`, `domicileState`, `aadhaarLast4`, `addressLine1`, `addressLine2`, `villageOrWard`, `city`, `district`, `state`, `pincode`, `bankName`, `bankAccountNumber`, and `ifscCode`.

Blank strings are stored as `null`; unsupported fields are ignored. Database rules reject an invalid mobile number, a non-six-digit pincode, invalid Aadhaar last four digits, percentages outside 0–100, or negative income.

### Useful local tests (PowerShell)

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/users

Invoke-RestMethod -Method Get `
  -Uri 'http://localhost:3000/api-setu/users/MMVY-00010001' `
  -Headers @{ 'x-api-setu-key' = 'your-local-api-setu-key' }
```

## 5. Database model

| Table | Stores | Important details |
| --- | --- | --- |
| `users` | Canonical identity, contact, address and bank profile | `user_id` is the stable shared identifier. |
| `applications` | MMVY and partner applications | References `users.user_id`; has portal source, type, status, consent and JSON `extra_details`. |
| `portal_access_events` | Partner and API Setu lookup audit entries | Records consumer, event type, time and optional JSON metadata. |

Sequences generate the numeric part of the IDs. `applications.user_id` is a foreign key to `users.user_id`, and database triggers refresh `updated_at` after updates.

## 6. Run the full project locally

1. Ensure PostgreSQL is available, either through your local PostgreSQL installation or Docker Desktop.
2. Configure `.env` with these keys. `DATABASE_URL` must point to the same database and credentials that you initialise:

   ```env
   PORT=3000
   DATABASE_URL=postgresql://mmvy_user:your-password@localhost:5432/mmvy_portal
   CORS_ORIGIN=http://localhost:5173
   API_SETU_KEY=use-a-long-random-local-key
   ```

3. Initialise the schema once. With Docker, run `docker compose up -d`; the schema is loaded automatically into a new project volume. With a local PostgreSQL installation, create the database and run `db/schema.sql` (or run `node db/init.js` after setting `DATABASE_URL`). The initializer is safe to rerun: it creates missing ID sequences and synchronizes them above existing IDs.
4. In one terminal, install and run the API:

   ```powershell
   npm install
   npm run server:dev
   ```

5. In a second terminal, install and run the UI:

   ```powershell
   npm --prefix client install
   npm run client:dev
   ```

6. Open `http://localhost:5173`. For a deployable client bundle, run `npm run client:build`; configure `VITE_API_URL` when the API is on a different origin.

## 7. Important prototype limits

- There is no login, session, role check, rate limit, or ownership check. The dashboard and full-profile routes currently expose sensitive personal and bank data to anyone who can reach the API.
- CORS controls which browsers can call the API; it is not authentication. If `CORS_ORIGIN` is empty, all origins are allowed by this server.
- If `API_SETU_KEY` is empty, the API Setu middleware permits the lookup without a header. Set a real key outside local demos.
- The API Setu view hides some fields, but still returns personally identifiable information. Use TLS, authentication/authorisation, encryption at rest, consent policy, and audit-retention controls before any real deployment.
- The code supports application creation and profile updates only. It has no document upload, deletion, status-update workflow, or production authentication.
