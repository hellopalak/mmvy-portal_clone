const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });

const apiUrl = new URL(process.env.E2E_API_URL || 'http://127.0.0.1:3000');
const databaseUrl = new URL(process.env.DATABASE_URL);
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);

if (!localHosts.has(apiUrl.hostname) || !localHosts.has(databaseUrl.hostname)) {
  throw new Error('The end-to-end check only runs against a local API and local database.');
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

function nextNotification(listener) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      listener.off('notification', onNotification);
      reject(new Error('Timed out waiting for a cdc_channel notification.'));
    }, 5_000);
    const onNotification = (notification) => {
      clearTimeout(timeout);
      resolve(JSON.parse(notification.payload));
    };
    listener.once('notification', onNotification);
  });
}

function assertCdcPayload(payload, operation) {
  assert(payload.operation === operation, `Expected CDC operation ${operation}.`);
  assert(payload.department_name === 'dept_1', 'Expected CDC department_name to be dept_1.');
  assert(payload.new_data && typeof payload.new_data.id === 'number', 'CDC new_data.id is missing.');
  for (const key of ['name', 'address', 'income', 'mobile_number', 'date_of_birth']) {
    assert(Object.prototype.hasOwnProperty.call(payload.new_data, key), `CDC new_data.${key} is missing.`);
  }
  if (operation === 'UPDATE') {
    assert(payload.old_data && typeof payload.old_data.id === 'number', 'CDC old_data.id is missing.');
  }
}

async function run() {
  const listener = new Client({ connectionString: process.env.DATABASE_URL });
  let userId;
  try {
    await listener.connect();
    await listener.query('LISTEN cdc_channel');

    const health = await request('/api/health');
    assert(health.ok === true, 'Health route did not report ok.');

    const insertNotification = nextNotification(listener);
    const created = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        profile: {
          firstName: 'CDC Test', lastName: 'Citizen', dateOfBirth: '2002-05-15',
          mobile: '9876543211', addressLine1: 'CDC Test Address', state: 'Madhya Pradesh'
        },
        application: {
          applicationType: 'FRESH', academicYear: '2026-27',
          schemeName: 'Mukhyamantri Medhavi Vidyarthi Yojana', instituteName: 'CDC Test College',
          courseName: 'B.Tech', familyAnnualIncome: '250000', consentGiven: true
        }
      })
    });
    userId = created.userId;
    assert(/^MMVY-\d{8}$/.test(userId), 'The application did not return an MMVY user ID.');
    assert(/^APP-\d{8}$/.test(created.applicationId), 'The application did not return an application ID.');
    assertCdcPayload(await insertNotification, 'INSERT');

    const profile = await request(`/api/users/${encodeURIComponent(userId)}`);
    assert(profile.data.user_id === userId && profile.data.applications.length === 1, 'Profile lookup did not return the created application.');

    const partner = await request(`/api/partner/users/${encodeURIComponent(userId)}`);
    assert(partner.source === 'COMMON_POSTGRESQL_DATA_STORE', 'Partner portal did not use the common data store.');

    const apiSetu = await request(`/api-setu/users/${encodeURIComponent(userId)}`, {
      headers: { 'x-api-setu-key': process.env.API_SETU_KEY || '' }
    });
    assert(apiSetu.data.user_id === userId, 'API Setu lookup did not return the shared user.');

    const updateNotification = nextNotification(listener);
    await request(`/api/mmvy/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ addressLine1: 'Final CDC Test Address' })
    });
    const updatePayload = await updateNotification;
    assertCdcPayload(updatePayload, 'UPDATE');
    assert(updatePayload.old_data.address === 'CDC Test Address', 'CDC old_data.address is incorrect.');
    assert(updatePayload.new_data.address === 'Final CDC Test Address', 'CDC new_data.address is incorrect.');
    assert(Number(updatePayload.new_data.income) === 250000, 'CDC income is incorrect.');

    console.log('End-to-end check passed: application, profile, partner portal, API Setu, update, and CDC payload all work.');
  } finally {
    if (userId) {
      await listener.query('DELETE FROM portal_access_events WHERE user_id = $1', [userId]);
      await listener.query('DELETE FROM applications WHERE user_id = $1', [userId]);
      await listener.query('DELETE FROM users WHERE user_id = $1', [userId]);
    }
    await listener.end();
  }
}

run().catch((error) => {
  console.error(`End-to-end check failed: ${error.message}`);
  process.exitCode = 1;
});
