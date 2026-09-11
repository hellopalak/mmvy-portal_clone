# MMVY Department Backend

Independent departmental backend simulator for the existing MMVY frontend and MahaSetu interoperability middleware.

## Responsibilities

MMVY owns its own data in Neon PostgreSQL. The backend:
- serves the MMVY frontend
- reads and updates `portal_users`
- emits live Socket.IO updates to the frontend
- publishes database CDC events on `mmvy_cdc_channel`
- exposes explicit integration APIs for MahaSetu

## Setup

1. Create `.env` from `.env.example`.
2. Put the existing Neon PostgreSQL connection string in `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Apply `database/schema.sql` to the existing Neon database.
5. Apply `database/seed.sql` if seed records are needed.
6. Start with `npm run dev`.

Default backend port: 4000.
Default frontend origin: http://localhost:5173.

## Integration topology

MMVY Frontend
→ MMVY Backend
→ Neon PostgreSQL

Neon PostgreSQL
→ mmvy_cdc_channel
→ MahaSetu CDC Listener

MahaSetu
→ MMVY integration API
→ MMVY Backend
→ Neon PostgreSQL

## Frontend compatibility

The supplied frontend already expects:
- `VITE_API_URL=http://localhost:4000`
- `GET /api/users/:portalId`
- Socket.IO at the same backend origin
- `profile:subscribe`
- `user:updated`

The frontend currently contains a comparison typo in its Socket.IO handler: it checks `updatedUser.porta`; the database/API field is `portal_id`. Change that comparison to `updatedUser.portal_id`.
