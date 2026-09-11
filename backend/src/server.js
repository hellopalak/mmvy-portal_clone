require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { pool } = require('./db');
const { getUser, updateUser, listUsers } = require('./portal.service');
const { startCdcPublisher, CDC_CHANNEL } = require('./integration');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
  },
});

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '50kb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'MMVY Department Backend',
    status: 'running',
    department: 'MMVY',
    cdc_channel: CDC_CHANNEL,
  });
});

app.get('/api/users', async (_req, res, next) => {
  try {
    res.json({ data: await listUsers() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/:portalId', async (req, res, next) => {
  try {
    const portalId = req.params.portalId.trim();
    if (!portalId) return res.status(400).json({ message: 'portalId is required.' });

    const user = await getUser(portalId);
    if (!user) return res.status(404).json({ message: 'Portal user not found.' });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:portalId', async (req, res, next) => {
  try {
    const portalId = req.params.portalId.trim();
    const user = await updateUser(portalId, req.body || {});

    // Frontend live-update channel.
    io.to(`profile:${portalId}`).emit('user:updated', user);

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// Explicit departmental integration boundary.
// MahaSetu can use this endpoint to read the current MMVY record.
app.get('/api/integration/beneficiaries/:portalId', async (req, res, next) => {
  try {
    const portalId = req.params.portalId.trim();
    const user = await getUser(portalId);
    if (!user) return res.status(404).json({ message: 'MMVY beneficiary not found.' });

    res.json({
      department_name: 'MMVY',
      legacy_id: user.portal_id,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// Explicit downstream update boundary.
// This is the API MahaSetu can call after its consent/workflow gate.
app.patch('/api/integration/beneficiaries/:portalId', async (req, res, next) => {
  try {
    const portalId = req.params.portalId.trim();
    const user = await updateUser(portalId, req.body || {});

    io.to(`profile:${portalId}`).emit('user:updated', user);

    res.json({
      department_name: 'MMVY',
      legacy_id: user.portal_id,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

io.on('connection', (socket) => {
  socket.on('profile:subscribe', (portalId) => {
    if (typeof portalId === 'string' && portalId.trim()) {
      socket.join(`profile:${portalId.trim()}`);
    }
  });

  socket.on('profile:unsubscribe', (portalId) => {
    if (typeof portalId === 'string' && portalId.trim()) {
      socket.leave(`profile:${portalId.trim()}`);
    }
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'MMVY endpoint not found.' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : 'Internal MMVY backend error.',
  });
});

async function start() {
  await pool.query('SELECT 1');
  await startCdcPublisher();

  const port = Number(process.env.PORT || 4000);
  server.listen(port, () => {
    console.info(`MMVY backend listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start MMVY backend:', error.message);
    process.exit(1);
  });
}

module.exports = { app, server, io };
