const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { neonConnectionOptions } = require('../db/neon');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool(neonConnectionOptions());

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('This origin is not allowed to call this API.'));
  }
}));
app.use(express.json({ limit: '1mb' }));

const profileFields = [
  'first_name', 'last_name', 'date_of_birth', 'gender', 'mobile', 'email', 'guardian_name',
  'category', 'domicile_state', 'aadhaar_last4', 'address_line1', 'address_line2',
  'village_or_ward', 'city', 'district', 'state', 'pincode', 'bank_name',
  'bank_account_number', 'ifsc_code'
];

const apiNameMap = {
  firstName: 'first_name', lastName: 'last_name', dateOfBirth: 'date_of_birth',
  guardianName: 'guardian_name', domicileState: 'domicile_state', aadhaarLast4: 'aadhaar_last4',
  addressLine1: 'address_line1', addressLine2: 'address_line2', villageOrWard: 'village_or_ward',
  bankName: 'bank_name', bankAccountNumber: 'bank_account_number', ifscCode: 'ifsc_code'
};

function cleanValue(value) {
  if (typeof value !== 'string') return value ?? null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normaliseProfile(body = {}) {
  const input = body.profile && typeof body.profile === 'object' ? body.profile : body;
  const normalised = {};
  for (const [key, value] of Object.entries(input)) {
    const dbKey = apiNameMap[key] || key;
    if (profileFields.includes(dbKey)) normalised[dbKey] = cleanValue(value);
  }
  return normalised;
}

function assertNewProfile(profile) {
  const missing = ['first_name', 'mobile', 'address_line1'].filter((field) => !profile[field]);
  if (missing.length) {
    const readable = missing.map((field) => field.replaceAll('_', ' ')).join(', ');
    const error = new Error(`Required profile fields missing: ${readable}.`);
    error.status = 400;
    throw error;
  }
}

function assertApplication(application = {}) {
  const required = ['academicYear', 'instituteName', 'courseName'];
  const missing = required.filter((field) => !cleanValue(application[field]));
  if (missing.length) {
    const error = new Error(`Required application fields missing: ${missing.join(', ')}.`);
    error.status = 400;
    throw error;
  }
  if (application.consentGiven !== true) {
    const error = new Error('Consent is required before an application can be submitted.');
    error.status = 400;
    throw error;
  }
}

async function nextReference(client, kind) {
  const sequence = kind === 'user' ? 'mmvy_shared_user_ref_seq' : 'mmvy_shared_application_ref_seq';
  const prefix = kind === 'user' ? 'MMVY-' : 'APP-';
  const result = await client.query(`SELECT nextval('${sequence}') AS value`);
  return `${prefix}${String(result.rows[0].value).padStart(8, '0')}`;
}

async function saveProfile(client, profile, requestedUserId) {
  if (requestedUserId) {
    const current = await client.query('SELECT user_id FROM mmvy_users WHERE user_id = $1', [requestedUserId]);
    if (current.rowCount) {
      const supplied = profileFields.filter((field) => Object.prototype.hasOwnProperty.call(profile, field));
      if (supplied.length) {
        const assignments = [...supplied.map((field, index) => `${field} = $${index + 2}`), 'updated_at = NOW()'];
        await client.query(
          `UPDATE mmvy_users SET ${assignments.join(', ')} WHERE user_id = $1`,
          [requestedUserId, ...supplied.map((field) => profile[field])]
        );
      }
      return requestedUserId;
    }

    const error = new Error('The supplied MMVY User ID was not found. Leave it blank to create a new user.');
    error.status = 404;
    throw error;
  }

  assertNewProfile(profile);
  const userId = await nextReference(client, 'user');
  const columns = ['user_id', ...profileFields];
  const values = [userId, ...profileFields.map((field) => profile[field] ?? null)];
  const markers = columns.map((_, index) => `$${index + 1}`);
  await client.query(
    `INSERT INTO mmvy_users (${columns.join(', ')}) VALUES (${markers.join(', ')})`,
    values
  );
  return userId;
}

async function getUser(userId, sharedView = false) {
  const fullColumns = 'u.*';
  const sharedColumns = `u.user_id, u.first_name, u.last_name, u.date_of_birth, u.gender, u.mobile,
    u.email, u.guardian_name, u.category, u.domicile_state, u.address_line1, u.address_line2,
    u.village_or_ward, u.city, u.district, u.state, u.pincode, u.created_at, u.updated_at`;
  const result = await pool.query(
    `SELECT ${sharedView ? sharedColumns : fullColumns},
      COALESCE((SELECT jsonb_agg(
        CASE WHEN $2::boolean THEN (to_jsonb(a) - 'extra_details') ELSE to_jsonb(a) END
        ORDER BY a.submitted_at DESC
      ) FROM mmvy_applications a WHERE a.user_id = u.user_id), '[]'::jsonb) AS applications
     FROM mmvy_users u WHERE u.user_id = $1`,
    [userId, sharedView]
  );
  return result.rows[0] || null;
}

async function recordAccess(userId, consumer, eventType, metadata = {}) {
  await pool.query(
    'INSERT INTO mmvy_portal_access_events (user_id, consumer, event_type, metadata) VALUES ($1, $2, $3, $4)',
    [userId, consumer, eventType, metadata]
  );
}

function requireApiSetuKey(req, res, next) {
  const configuredKey = process.env.API_SETU_KEY;
  if (!configuredKey || req.get('x-api-setu-key') === configuredKey) return next();
  return res.status(401).json({ error: 'Missing or invalid x-api-setu-key.' });
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'mmvy-shared-portal' });
  } catch (error) { next(error); }
});

async function listUsers(_req, res, next) {
  try {
    const result = await pool.query(`
      SELECT u.*, COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.submitted_at DESC)
        FROM mmvy_applications a WHERE a.user_id = u.user_id), '[]'::jsonb) AS applications
      FROM mmvy_users u ORDER BY u.updated_at DESC`);
    res.json({ count: result.rowCount, data: result.rows });
  } catch (error) { next(error); }
}

app.get('/api/users', listUsers);

app.get('/api/mmvy/users', listUsers);

app.get('/api/users/:userId', async (req, res, next) => {
  try {
    const data = await getUser(req.params.userId);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    return res.json({ data });
  } catch (error) { return next(error); }
});

async function updateUser(req, res, next) {
  try {
    const profile = normaliseProfile(req.body);
    const supplied = profileFields.filter((field) => Object.prototype.hasOwnProperty.call(profile, field));
    if (!supplied.length) return res.status(400).json({ error: 'No supported profile fields were supplied.' });
    const assignments = [...supplied.map((field, index) => `${field} = $${index + 2}`), 'updated_at = NOW()'];
    const result = await pool.query(
      `UPDATE mmvy_users SET ${assignments.join(', ')} WHERE user_id = $1 RETURNING *`,
      [req.params.userId, ...supplied.map((field) => profile[field])]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: 'User profile updated.', data: result.rows[0] });
  } catch (error) { return next(error); }
}

app.patch('/api/users/:userId', updateUser);
app.patch('/api/mmvy/users/:userId', updateUser);

async function createApplication(req, res, next, sourcePortal) {
  let client;
  try {
    // Connecting inside try/catch is important: when PostgreSQL is stopped, the
    // browser now receives a useful response instead of leaving Submit disabled.
    client = await pool.connect();
    const profile = normaliseProfile(req.body);
    const application = req.body.application || {};
    assertApplication(application);
    await client.query('BEGIN');
    const userId = await saveProfile(client, profile, req.body.userId || req.body.user_id);
    const applicationId = await nextReference(client, 'application');
    const extraDetails = application.extraDetails && typeof application.extraDetails === 'object'
      ? application.extraDetails : {};
    const values = [
      applicationId, userId, sourcePortal,
      cleanValue(application.applicationType)?.toUpperCase() || 'FRESH',
      cleanValue(application.schemeName) || 'Mukhyamantri Medhavi Vidyarthi Yojana',
      cleanValue(application.academicYear), cleanValue(application.instituteName), cleanValue(application.instituteCode),
      cleanValue(application.instituteType), cleanValue(application.courseName), cleanValue(application.courseType),
      cleanValue(application.admissionDate), cleanValue(application.qualifyingExam), cleanValue(application.qualifyingPercentage),
      cleanValue(application.familyAnnualIncome), true, JSON.stringify(extraDetails)
    ];
    const result = await client.query(`
      INSERT INTO mmvy_applications (
        application_id, user_id, source_portal, application_type, scheme_name, academic_year,
        institute_name, institute_code, institute_type, course_name, course_type, admission_date,
        qualifying_exam, qualifying_percentage, family_annual_income, consent_given, extra_details
      ) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, values);
    await client.query('COMMIT');
    const user = await getUser(userId);
    return res.status(201).json({
      message: 'Application submitted successfully.',
      userId,
      applicationId: result.rows[0].application_id,
      data: user
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    return next(error);
  } finally {
    client?.release();
  }
}

app.post('/api/applications', (req, res, next) => createApplication(req, res, next, 'MMVY'));
app.post('/api/partner/applications', (req, res, next) => createApplication(req, res, next, 'SERVICE_PORTAL'));

app.get('/api/partner/users/:userId', async (req, res, next) => {
  try {
    const data = await getUser(req.params.userId);
    if (!data) return res.status(404).json({ error: 'User not found in the common MMVY data store.' });
    await recordAccess(req.params.userId, 'SERVICE_PORTAL', 'PROFILE_LOOKUP');
    return res.json({ source: 'COMMON_POSTGRESQL_DATA_STORE', data });
  } catch (error) { return next(error); }
});

app.get('/api-setu/users/:userId', requireApiSetuKey, async (req, res, next) => {
  try {
    const data = await getUser(req.params.userId, true);
    if (!data) return res.status(404).json({ error: 'User not found.' });
    await recordAccess(req.params.userId, 'API_SETU', 'SHARED_PROFILE_LOOKUP');
    return res.json({
      source: 'MMVY_SHARED_POSTGRESQL',
      fetchedAt: new Date().toISOString(),
      data
    });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === '28P01') {
    return res.status(503).json({
      error: 'Neon PostgreSQL login failed. Verify DATABASE_URL in .env, then restart the Node server.',
      code: 'POSTGRES_LOGIN_FAILED'
    });
  }
  if (error.code === '3D000') {
    return res.status(503).json({
      error: 'The configured Neon database was not found. Verify DATABASE_URL and run npm run db:init, then restart the Node server.',
      code: 'DATABASE_NOT_FOUND'
    });
  }
  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01'].includes(error.code)) {
    return res.status(503).json({
      error: 'Neon PostgreSQL is unavailable. Verify DATABASE_URL and network access, then restart the Node server.',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  const status = error.status || (error.code === '23505' ? 409 : ['23502', '23514', '22P02'].includes(error.code) ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Server error. Check the server log.' : error.message });
});

app.listen(port, () => {
  console.log(`MMVY shared portal running at http://localhost:${port}`);
});
