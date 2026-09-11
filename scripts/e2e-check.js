const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { getNeonDatabaseUrl, neonConnectionOptions } = require('../db/neon');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const apiUrl = new URL(process.env.E2E_API_URL || 'http://127.0.0.1:3000');
getNeonDatabaseUrl();

if (process.env.E2E_ALLOW_NEON_WRITE !== 'true') {
  throw new Error('Set E2E_ALLOW_NEON_WRITE=true to run this test. It creates and removes a temporary record in Neon.');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, options = {}) {
  const response = await fetch(new URL(pathname, apiUrl), {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${pathname} failed: ${body.error || response.status}`);
  return body;
}

async function run() {
  const database = new Client(neonConnectionOptions());
  let userId;
  try {
    await database.connect();

    const health = await request('/api/health');
    assert(health.ok === true, 'Health route did not report ok.');

    const created = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        profile: {
          firstName: 'E2E Test', lastName: 'Citizen', dateOfBirth: '2002-05-15',
          mobile: '9876543211', addressLine1: 'E2E Test Address', state: 'Madhya Pradesh'
        },
        application: {
          applicationType: 'FRESH', academicYear: '2026-27',
          schemeName: 'Mukhyamantri Medhavi Vidyarthi Yojana', instituteName: 'E2E Test College',
          courseName: 'B.Tech', qualifyingPercentage: '0', familyAnnualIncome: '0', consentGiven: true
        }
      })
    });
    userId = created.userId;
    assert(/^MMVY-\d{8}$/.test(userId), 'The application did not return an MMVY user ID.');
    assert(/^APP-\d{8}$/.test(created.applicationId), 'The application did not return an application ID.');

    const stored = await database.query(`
      SELECT u.user_id, a.application_id, a.qualifying_percentage, a.family_annual_income, a.status, a.consent_given
      FROM mmvy_users u
      JOIN mmvy_applications a ON a.user_id = u.user_id
      WHERE u.user_id = $1`, [userId]);
    assert(stored.rowCount === 1, 'The submitted profile and application were not stored in PostgreSQL.');
    assert(Number(stored.rows[0].qualifying_percentage) === 0, 'The qualifying percentage was not stored.');
    assert(Number(stored.rows[0].family_annual_income) === 0, 'The family income was not stored.');
    assert(stored.rows[0].consent_given === true && stored.rows[0].status === 'SUBMITTED', 'Application defaults were not stored.');

    const users = await request('/api/users');
    assert(users.data.some((user) => user.user_id === userId), 'The users list did not include the created user.');

    const mmvyUsers = await request('/api/mmvy/users');
    assert(mmvyUsers.data.some((user) => user.user_id === userId), 'The MMVY users-list alias did not include the created user.');

    const profile = await request(`/api/users/${encodeURIComponent(userId)}`);
    assert(profile.data.user_id === userId && profile.data.applications.length === 1, 'Profile lookup did not return the created application.');

    const partnerCreated = await request('/api/partner/applications', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        profile: { city: 'E2E Test City' },
        application: {
          applicationType: 'FRESH', academicYear: '2026-27', schemeName: 'Partner Education Support',
          instituteName: 'E2E Partner College', courseName: 'BCA', consentGiven: true
        }
      })
    });
    assert(partnerCreated.userId === userId && /^APP-\d{8}$/.test(partnerCreated.applicationId), 'Partner application was not created for the existing user.');

    const profileWithPartnerApplication = await request(`/api/users/${encodeURIComponent(userId)}`);
    assert(profileWithPartnerApplication.data.applications.length === 2, 'Profile did not return both MMVY and partner applications.');

    const partner = await request(`/api/partner/users/${encodeURIComponent(userId)}`);
    assert(partner.source === 'COMMON_POSTGRESQL_DATA_STORE', 'Partner portal did not use the common data store.');

    const apiSetu = await request(`/api-setu/users/${encodeURIComponent(userId)}`, {
      headers: { 'x-api-setu-key': process.env.API_SETU_KEY || '' }
    });
    assert(apiSetu.data.user_id === userId, 'API Setu lookup did not return the shared user.');

    await request(`/api/mmvy/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ addressLine1: 'Final E2E Test Address' })
    });
    await request(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ district: 'E2E Test District' })
    });

    const updated = await database.query(
      `SELECT u.address_line1, u.district, COUNT(a.application_id)::int AS application_count
       FROM mmvy_users u
       LEFT JOIN mmvy_applications a ON a.user_id = u.user_id
       WHERE u.user_id = $1
       GROUP BY u.user_id`, [userId]
    );
    assert(updated.rows[0].address_line1 === 'Final E2E Test Address', 'The profile update was not stored.');
    assert(updated.rows[0].district === 'E2E Test District', 'The profile-update alias was not stored.');
    assert(updated.rows[0].application_count === 2, 'Both applications were not stored in Neon.');

    const accessEvents = await database.query(
      'SELECT COUNT(*)::int AS count FROM mmvy_portal_access_events WHERE user_id = $1', [userId]
    );
    assert(accessEvents.rows[0].count === 2, 'Partner and API Setu access events were not stored.');

    console.log('End-to-end check passed: all API routes read and write user profiles, MMVY applications, partner applications, and audit events in Neon.');
  } finally {
    if (userId) {
      await database.query('DELETE FROM mmvy_portal_access_events WHERE user_id = $1', [userId]);
      await database.query('DELETE FROM mmvy_applications WHERE user_id = $1', [userId]);
      await database.query('DELETE FROM mmvy_users WHERE user_id = $1', [userId]);
    }
    await database.end();
  }
}

run().catch((error) => {
  console.error(`End-to-end check failed: ${error.message}`);
  process.exitCode = 1;
});
