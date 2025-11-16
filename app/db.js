const pg = require('pg');
const { config } = require('./config');

const Pool = pg.Pool;
const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port,
  ssl: config.ssl || false
});

pool.connect()
  .then((client) => {
    console.log(`✅ Connected to database: ${config.database} at ${config.host}`);
    client.release();
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your env.json configuration and ensure your RDS instance is accessible.');
  });

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

async function getUserById(id) {
  if (!id) return null;
  const result = await pool.query('SELECT id, email FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  if (!email) return null;
  const result = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

function formatMessageRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderEmail: row.sender_email,
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    message: row.body,
    sharedPet: parseJsonField(row.shared_pet),
    createdAt: row.created_at
  };
}

async function fetchConversation(userId, otherId) {
  const result = await pool.query(
    `SELECT m.id, m.sender_id, s.email AS sender_email, m.recipient_id, r.email AS recipient_email, m.body, m.shared_pet, m.created_at
     FROM messages m
     JOIN users s ON s.id = m.sender_id
     JOIN users r ON r.id = m.recipient_id
     WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
     ORDER BY m.created_at ASC`,
    [userId, otherId]
  );
  return result.rows.map(formatMessageRow);
}

module.exports = {
  pool,
  parseJsonField,
  getUserById,
  getUserByEmail,
  fetchConversation
};
