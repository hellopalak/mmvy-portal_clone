const { connectListener } = require('./db');

const CDC_CHANNEL = process.env.CDC_CHANNEL || 'mmvy_cdc_channel';

async function startCdcPublisher() {
  // The database trigger publishes to this channel. This listener exists
  // so the MMVY backend can observe and log departmental change events.
  // MahaSetu can independently LISTEN to the same channel.
  const client = await connectListener();
  await client.query(`LISTEN ${CDC_CHANNEL}`);

  client.on('notification', (message) => {
    try {
      const event = JSON.parse(message.payload);
      console.info('[MMVY CDC]', JSON.stringify({
        department_name: 'MMVY',
        ...event
      }));
    } catch {
      console.warn('[MMVY CDC] Received non-JSON payload.');
    }
  });

  client.on('error', (error) => {
    console.error('[MMVY CDC] Listener error:', error.message);
  });

  console.info(`MMVY CDC listener active on "${CDC_CHANNEL}".`);
  return client;
}

module.exports = { startCdcPublisher, CDC_CHANNEL };
