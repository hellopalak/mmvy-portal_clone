# MMVY Department Backend — Integration Contract

## System role

This service simulates the existing MMVY departmental backend. It owns the `portal_users` data stored in the MMVY Neon PostgreSQL database.

MahaSetu is a separate interoperability middleware system.

## Data ownership

MMVY owns:
- portal user records
- MMVY legacy identifiers
- MMVY-specific values and status

MahaSetu owns:
- global identity mapping
- UARN
- cross-department application/task state
- citizen consent
- semantic normalization

## Frontend boundary

MMVY frontend uses:
- `GET /api/users/:portalId`
- `PATCH /api/users/:portalId`

The Socket.IO event `user:updated` is emitted to subscribers of the relevant profile room after a successful update.

## MahaSetu integration boundary

MahaSetu reads an MMVY beneficiary through:
- `GET /api/integration/beneficiaries/:portalId`

MahaSetu can perform an authorized downstream MMVY update through:
- `PATCH /api/integration/beneficiaries/:portalId`

The integration endpoints return:
- `department_name`
- `legacy_id`
- `data`

## Event integration

The `portal_users` table publishes INSERT/UPDATE/DELETE events on:
- `mmvy_cdc_channel`

The payload contains:
- `operation`
- `old_data`
- `new_data`

MahaSetu can connect to the same Neon PostgreSQL database and LISTEN on this channel using its CDC listener configuration.

## Important

The current service is a prototype departmental simulator. Authentication/authorization for the integration endpoints is intentionally not implemented in this package. Do not expose these endpoints publicly without adding service-to-service authentication.
