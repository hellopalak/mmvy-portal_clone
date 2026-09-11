const { query } = require('./db');

async function getUser(portalId) {
  const result = await query(
    `SELECT portal_id, full_name, address, income, caste_category, mobile_number, updated_at
     FROM portal_users
     WHERE portal_id = $1`,
    [portalId]
  );
  return result.rows[0] || null;
}

async function updateUser(portalId, patch) {
  const allowed = ['full_name', 'address', 'income', 'caste_category', 'mobile_number'];
  const entries = Object.entries(patch).filter(([key, value]) => allowed.includes(key) && value !== undefined);

  if (!entries.length) {
    const error = new Error('At least one supported field is required.');
    error.status = 400;
    throw error;
  }

  const setParts = [];
  const values = [portalId];

  for (const [key, value] of entries) {
    values.push(value);
    setParts.push(`${key} = $${values.length}`);
  }

  setParts.push('updated_at = CURRENT_TIMESTAMP');

  const result = await query(
    `UPDATE portal_users
     SET ${setParts.join(', ')}
     WHERE portal_id = $1
     RETURNING portal_id, full_name, address, income, caste_category, mobile_number, updated_at`,
    values
  );

  if (!result.rows[0]) {
    const error = new Error('Portal user not found.');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function listUsers() {
  const result = await query(
    `SELECT portal_id, full_name, address, income, caste_category, mobile_number, updated_at
     FROM portal_users
     ORDER BY portal_id`
  );
  return result.rows;
}

module.exports = { getUser, updateUser, listUsers };
