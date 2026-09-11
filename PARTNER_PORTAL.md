# Partner Portal: what it does

## Purpose

The Partner Portal is a second interface connected to the same MMVY PostgreSQL database. It is not a separate database and does not copy a student's profile.

It lets a connected partner:

1. Look up an existing MMVY user by `userId`.
2. View that user's complete profile and submitted applications.
3. Submit an additional application for the user.

Partner-created applications are identifiable because their `source_portal` value is saved as `SERVICE_PORTAL`. MMVY-created applications use `MMVY` instead.

```text
Partner Portal UI
     |
     +-- GET  /api/partner/users/:userId
     |        reads the shared users + applications data
     |        writes an access-audit event
     |
     +-- POST /api/partner/applications
              writes an application with source_portal = SERVICE_PORTAL
              to the same PostgreSQL tables
```

## Code involved

| File | Role in the partner feature |
| --- | --- |
| `client/src/pages/PartnerPage.jsx` | Renders the lookup screen, displays the shared profile, and opens the partner application form. |
| `client/src/pages/ApplicationPage.jsx` | Reuses the normal application form. When its `source` is `SERVICE_PORTAL`, it sends to the partner create endpoint. |
| `client/src/App.jsx` | Selects `PartnerPage` when the current view is `partner`, and passes `SERVICE_PORTAL` when navigating to the partner form. |
| `client/src/api.js` | Calls the backend with `fetch`; `getProfile` URL-encodes the user ID. |
| `server/server.js` | Implements both partner routes and stores the audit entry. |
| `db/schema.sql` | Defines the shared `users`, `applications`, and `portal_access_events` tables. |

## User flow in the UI

1. A user opens **Shared Partner Portal**.
2. `PartnerPage.jsx` takes an MMVY user ID, for example `MMVY-00010001`.
3. It calls `GET /api/partner/users/MMVY-00010001` through `getProfile(userId, '/api/partner/users/')`.
4. On success, the response is saved in React's shared `profile` state and displayed by `ProfileDetails`.
5. Selecting **Create Partner Application** navigates to the existing `ApplicationPage` with `source = 'SERVICE_PORTAL'`.
6. On submit, the form first checks `/api/health`, then posts its profile and application data to `/api/partner/applications`.
7. The server saves the application and returns the generated application ID. The UI then shows the user's Profile page.

## Backend endpoints

Local API base URL: `http://localhost:3000`

### 1. Read a shared profile

```http
GET /api/partner/users/:userId
```

Example:

```http
GET /api/partner/users/MMVY-00010001
```

What the server does:

1. Loads the user from `users` and that user's applications from `applications`.
2. Returns `404` if the user does not exist.
3. Inserts an audit row into `portal_access_events` with:
   - `consumer = SERVICE_PORTAL`
   - `event_type = PROFILE_LOOKUP`
4. Returns the full profile and applications.

Success response:

```json
{
  "source": "COMMON_POSTGRESQL_DATA_STORE",
  "data": {
    "user_id": "MMVY-00010001",
    "first_name": "Asha",
    "mobile": "9876543210",
    "applications": [
      {
        "application_id": "APP-00050001",
        "source_portal": "MMVY",
        "status": "SUBMITTED"
      }
    ]
  }
}
```

If the ID is unknown, the response is:

```json
{ "error": "User not found in the common MMVY data store." }
```

### 2. Submit a partner application

```http
POST /api/partner/applications
Content-Type: application/json
```

This endpoint uses the same `createApplication` function as `POST /api/applications`. Its only difference is that the server calls it with `sourcePortal = 'SERVICE_PORTAL'`.

Example body for an existing user:

```json
{
  "userId": "MMVY-00010001",
  "profile": {
    "firstName": "Asha",
    "mobile": "9876543210",
    "addressLine1": "House 10, Ward 2"
  },
  "application": {
    "applicationType": "FRESH",
    "academicYear": "2026-27",
    "schemeName": "Partner Education Support",
    "instituteName": "Example College",
    "courseName": "B.Tech",
    "consentGiven": true
  }
}
```

Required values are `academicYear`, `instituteName`, `courseName`, and `consentGiven: true`. When creating a brand-new profile, `firstName`, `mobile`, and `addressLine1` are also required.

The server performs the following in one PostgreSQL transaction:

1. Finds the requested user; if found, it updates any supplied profile fields.
2. Otherwise, it creates a profile after validating its required fields.
3. Generates an `APP-...` reference.
4. Inserts the application with `source_portal = SERVICE_PORTAL` and default status `SUBMITTED`.
5. Commits both changes, or rolls them back if any step fails.

Success response:

```json
{
  "message": "Application submitted successfully.",
  "userId": "MMVY-00010001",
  "applicationId": "APP-00050002",
  "data": {
    "user_id": "MMVY-00010001",
    "applications": []
  }
}
```

## Shared data and audit trail

| Action | Reads/writes | Result |
| --- | --- | --- |
| Partner lookup | Reads `users` and `applications`; writes `portal_access_events` | Shows the shared profile and logs the lookup. |
| Partner submission for an existing user | Updates supplied `users` fields; inserts `applications` | The new application is marked `SERVICE_PORTAL`. |
| Partner submission for a new user | Inserts `users` and `applications` | Creates a shared profile and a partner-marked application. |

All applications remain visible in the normal MMVY profile because the profile query returns every application belonging to that `user_id`, ordered by newest submission first.

## Important current limitation

The partner endpoints currently have no partner login, role check, API key, or user-consent check beyond the application form's consent checkbox. In particular, the lookup route returns complete profile data, including sensitive data. Before exposing this to real partner organisations, add partner authentication, permissions scoped to the partner and user, TLS, rate limiting, and an audit-retention policy.

Also note that an unknown `userId` supplied to the submit endpoint is accepted as a new ID by the current code. A production implementation should generate IDs on the server and reject untrusted arbitrary IDs.
