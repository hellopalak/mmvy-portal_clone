# MMVY Shared Portal

This is a runnable learning-project implementation with one PostgreSQL source of truth shared by three interfaces. The repository is now split into a React frontend and a Node/Express API backend.

For a concise walkthrough of the complete browser-to-database flow, request bodies, API responses, database model, local setup, and current security limits, see [END_TO_END_DOCUMENTATION.md](END_TO_END_DOCUMENTATION.md).

For the partner-specific UI flow and endpoints, see [PARTNER_PORTAL.md](PARTNER_PORTAL.md).

## Project structure

| Folder | Responsibility |
| --- | --- |
| `client/` | React + Vite frontend: pages, reusable components, styles and browser API client |
| `server/` | Express API and PostgreSQL integration; it does not render HTML |
| `db/` | Shared PostgreSQL schema |

| Interface | What it does | Data source |
| --- | --- | --- |
| MMVY portal | Applies for MMVY, views profile and updates profile | `users` + `applications` |
| Partner / second portal | Looks up the same MMVY profile and can create its own application | the same tables, marked `SERVICE_PORTAL` |
| API Setu | Returns shareable user data by `userId` | the same tables, no duplicate data |

The common fields are `user_id`, identity/contact, address, guardian/category, bank details and academic/application details. `source_portal` keeps the submitting portal traceable while preserving a single shared user record.

## Run locally

For a step-by-step **VS Code + pgAdmin** setup without Docker, follow [RUN_WITH_PGADMIN.md](RUN_WITH_PGADMIN.md).

1. Install Node.js 20+ and Docker Desktop.
2. Create or edit `.env`. Keep `DATABASE_URL` consistent with `docker-compose.yml`, set `CORS_ORIGIN=http://localhost:5173` for direct browser calls, and set a proper `API_SETU_KEY`. The required keys and a safe local example are in [END_TO_END_DOCUMENTATION.md](END_TO_END_DOCUMENTATION.md#6-run-the-full-project-locally).
3. Start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

4. Install the API and frontend packages. Start each service in a separate terminal:

   ```powershell
    npm install
    npm --prefix client install
    npm run server:dev
    npm run client:dev
    ```

5. Open `http://localhost:5173`. Vite proxies `/api` and `/api-setu` calls to the Express API at `http://localhost:3000`.

For a production frontend bundle, run `npm run client:build`. Serve the generated `client/dist/` directory with a static web server, and set `VITE_API_URL` to the API origin if it is on another host.

To reset a local development database, stop the stack and remove only this project's named volume, then start it again:

```powershell
docker compose down -v
docker compose up -d
```

## User-facing flow

1. Select **New Application** from the MMVY homepage.
2. Complete the personal, address/bank and academic details, consent and submit.
3. Save the generated `MMVY-...` User ID. Use **My Profile** to display all stored data or update permitted profile fields.
4. Use **Partner Portal** with that user ID. It reads the same canonical profile; no copy is created.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | database/server health check |
| GET | `/api/users` | all users with all applications |
| GET | `/api/users/:userId` | one full profile with applications |
| PATCH | `/api/users/:userId` | update supplied user fields |
| GET | `/api/mmvy/users` | MMVY alias for all users |
| PATCH | `/api/mmvy/users/:userId` | MMVY alias for profile update |
| POST | `/api/applications` | atomic MMVY user + application submission |
| GET | `/api/partner/users/:userId` | second portal read from shared store |
| POST | `/api/partner/applications` | second portal application, marked `SERVICE_PORTAL` |
| GET | `/api-setu/users/:userId` | API Setu data lookup; send `x-api-setu-key` |

### Example profile update

```powershell
Invoke-RestMethod -Method Patch `
  -Uri 'http://localhost:3000/api/mmvy/users/MMVY-00010001' `
  -ContentType 'application/json' `
  -Body '{"addressLine1":"House 50, Sagar","district":"Sagar","pincode":"470001"}'
```

### Example API Setu lookup

```powershell
Invoke-RestMethod -Method Get `
  -Uri 'http://localhost:3000/api-setu/users/MMVY-00010001' `
  -Headers @{ 'x-api-setu-key' = 'replace-with-a-long-random-key' }
```

## Deployment note

This is an end-to-end prototype. Before real public deployment, add real authentication and role-based authorization; use TLS; encrypt bank/identity data at rest; restrict `/api/users`; and implement consent/audit retention rules appropriate to the governing department.
