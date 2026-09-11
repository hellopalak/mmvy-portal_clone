# Run MMVY Portal with PostgreSQL and pgAdmin

This guide uses a locally installed PostgreSQL server. pgAdmin is a database-management application; PostgreSQL itself must be installed and running.

For the full request flow, API reference, and security notes, read [END_TO_END_DOCUMENTATION.md](END_TO_END_DOCUMENTATION.md).

## 1. Create the database

1. Open pgAdmin 4 and connect to your PostgreSQL server.
2. Open **Tools -> Query Tool** for the default `postgres` database.
3. Run the following SQL once, replacing the password with your own:

   ```sql
   CREATE ROLE mmvy_user WITH LOGIN PASSWORD 'ChooseAStrongPassword';
   CREATE DATABASE mmvy_portal OWNER mmvy_user;
   ```

   If either object already exists, do not create it again. To change an existing role password, run:

   ```sql
   ALTER ROLE mmvy_user WITH LOGIN PASSWORD 'ChooseAStrongPassword';
   ```

4. Select the `mmvy_portal` database in pgAdmin, open Query Tool, paste all of [`db/schema.sql`](db/schema.sql), and execute it. The expected tables are `users`, `applications`, and `portal_access_events`.

## 2. Configure the server

In the project root, create or update `.env`. The password must exactly match the role password above.

```env
PORT=3000
DATABASE_URL=postgresql://mmvy_user:ChooseAStrongPassword@localhost:5432/mmvy_portal
CORS_ORIGIN=http://localhost:5173
API_SETU_KEY=use-a-long-random-local-key
```

If the database password contains URL-reserved characters such as `@`, `:`, `/`, or `#`, URL-encode it in `DATABASE_URL`.

## 3. Start the API and web app

Open two terminals in this project folder.

```powershell
# Terminal 1: Express API at http://localhost:3000
npm install
npm run server:dev
```

```powershell
# Terminal 2: React/Vite web app at http://localhost:5173
npm --prefix client install
npm run client:dev
```

Open `http://localhost:5173` in a browser. Port 3000 is the API only; it does not serve the React website.

## 4. Quick verification

Run these in PowerShell after both PostgreSQL and the API are running:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/users
```

The health call should return `ok: true`. Then submit a New MMVY Application in the browser. The site shows a generated `MMVY-...` user ID and `APP-...` application ID; save both identifiers.

## 5. View records in pgAdmin

In pgAdmin, open Query Tool for `mmvy_portal` and run:

```sql
SELECT
  u.user_id,
  u.first_name,
  u.last_name,
  u.mobile,
  a.application_id,
  a.source_portal,
  a.institute_name,
  a.course_name,
  a.status,
  a.submitted_at
FROM users AS u
LEFT JOIN applications AS a ON a.user_id = u.user_id
ORDER BY u.updated_at DESC, a.submitted_at DESC;
```

## Troubleshooting

- **PostgreSQL login failed:** make the `mmvy_user` password in pgAdmin match `DATABASE_URL`, then restart the API.
- **Database not found:** create `mmvy_portal`, run `db/schema.sql` inside that database, then restart the API.
- **Database unavailable:** start the PostgreSQL service and check host, port, user, password, and database name.
- **API server is not running:** start the first terminal command above.
- **Browser UI is missing:** start the Vite command in the second terminal and use port 5173, not port 3000.
