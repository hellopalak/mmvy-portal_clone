require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Pool } = require('pg');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN },
});

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Add more portal_users column names here when the demo needs them.
const UPDATABLE_FIELDS = [
  'address',
  'income',
  'caste_category',
  'mobile_number',
];

io.on('connection', (socket) => {
  socket.on('profile:subscribe', (portalId) => {
    socket.join(`profile:${portalId}`);
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Server and database are available.' });
  } catch (error) {
    console.error(error.message);
    res.status(503).json({ success: false, message: 'Database is unavailable.' });
  }
});

// Get all details for one user.
app.get('/api/users/:portalId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portal_users WHERE portal_id = $1',
      [req.params.portalId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      message: 'User details retrieved successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not get user details.',
    });
  }
});

// Update one or more allowed fields for one user.
app.post('/api/users/:portalId', async (req, res) => {
  const changes = Object.entries(req.body || {}).filter(([field]) =>
    UPDATABLE_FIELDS.includes(field),
  );

  if (changes.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Send at least one allowed field to update.',
    });
  }

  const setValues = changes.map(([field], index) => `${field} = $${index + 1}`);
  const values = changes.map(([, value]) => value);
  values.push(req.params.portalId);

  try {
    const result = await pool.query(
      `UPDATE portal_users
       SET ${setValues.join(', ')}
       WHERE porta = $${values.length}
       RETURNING *`,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const updatedUser = result.rows[0];
    io.to(`profile:${req.params.portalId}`).emit('user:updated', updatedUser);

    return res.json({
      success: true,
      message: 'User details updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not update user details.',
    });
  }
});

server.listen(PORT, () => {
  console.log(`Portal API is running on http://localhost:${PORT}`);
});
