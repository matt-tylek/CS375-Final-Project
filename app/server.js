const pg = require("pg");
const express = require("express");
const petAuth = require('./petAuth');
let axios = require("axios");
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require("../env.json");

const port = process.env.PORT || 3000;
const hostname = process.env.HOST || "localhost";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


petAuth.startTokenManager(config);

const Pool = pg.Pool;
const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port,
  ssl: config.ssl || false
});

const JWT_SECRET = process.env.JWT_SECRET || config.jwt_secret || crypto.randomBytes(32).toString('hex');
const BCRYPT_ROUNDS = 12;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }
}

async function getUserById(id) {
  if (!id) return null;
  const result = await pool.query('SELECT id, email FROM users WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  if (!email) return null;
  const result = await pool.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [normalizeEmail(email)]);
  return result.rows[0] || null;
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return header || null;
}

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
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

async function authenticateRequest(req, res, next) {
  try {
    ensureJwtSecret();
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

pool.connect()
  .then(function (client) {
    console.log(`✅ Connected to database: ${config.database} at ${config.host}`);
    client.release();
  })
  .catch(function (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your env.json configuration and ensure your RDS instance is accessible.');
  });

app.locals.pool = pool;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/pets', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const { type, distance, location } = req.query;
  const externalApiUrl = 'https://api.petfinder.com/v2/animals';

  try {
    const response = await axios.get(externalApiUrl, {
      params: {
          type: type, 
          location: location || '10001',
          distance: distance || 50,
          limit: 20
      },
      headers: {
          'Authorization': `Bearer ${accessToken}`
      }
    });
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching pets from Petfinder:', error.message);

    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

app.get('/api/pets/:id', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const petId = req.params.id;
  const externalApiUrl = `https://api.petfinder.com/v2/animals/${petId}`;
  try{
    const response = await axios.get(externalApiUrl,{headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

app.get('/api/types', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const externalApiUrl = 'https://api.petfinder.com/v2/types';
  try {
    const response = await axios.get(externalApiUrl, { headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet types from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

app.get('/api/types/:type', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const type = req.params.type;
  const externalApiUrl = `https://api.petfinder.com/v2/types/${type}`;
  try {
    const response = await axios.get(externalApiUrl, { headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet type from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

app.post('/api/register', async (req, res) => {
  const { email: rawEmail, password } = req.body || {};
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Invalid email or password (min 8 chars).' });
  }

  try {
    ensureJwtSecret();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    if (err.message === 'JWT secret not configured') {
      return res.status(500).json({ error: 'Server auth config missing.' });
    }
    res.status(500).json({ error: 'Unable to register user.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email: rawEmail, password } = req.body || {};
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  try {
    ensureJwtSecret();
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);
    if (err.message === 'JWT secret not configured') {
      return res.status(500).json({ error: 'Server auth config missing.' });
    }
    res.status(500).json({ error: 'Unable to login.' });
  }
});

app.get('/api/me', authenticateRequest, async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticateRequest, async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim().toLowerCase()}%` : null;
    let result;
    if (search) {
      result = await pool.query(
        'SELECT id, email FROM users WHERE id <> $1 AND LOWER(email) LIKE $2 ORDER BY email ASC LIMIT 50',
        [req.user.id, search]
      );
    } else {
      result = await pool.query(
        'SELECT id, email FROM users WHERE id <> $1 ORDER BY email ASC LIMIT 50',
        [req.user.id]
      );
    }
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Users list error:', err.message);
    res.status(500).json({ error: 'Unable to fetch users.' });
  }
});

app.get('/api/wishlist', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT pet_id, pet, created_at FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ items: result.rows.map((row) => ({ petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at })) });
  } catch (err) {
    console.error('Wishlist fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch wishlist.' });
  }
});

app.post('/api/wishlist', authenticateRequest, async (req, res) => {
  const { petId, pet } = req.body || {};
  if (!petId || !pet) {
    return res.status(400).json({ error: 'Missing pet data.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO wishlist_items (user_id, pet_id, pet)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, pet_id) DO UPDATE SET pet = EXCLUDED.pet
       RETURNING pet_id, pet, created_at`,
      [req.user.id, String(petId), JSON.stringify(pet)]
    );
    const row = result.rows[0];
    res.status(201).json({ item: { petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at } });
  } catch (err) {
    console.error('Wishlist add error:', err.message);
    res.status(500).json({ error: 'Unable to update wishlist.' });
  }
});

app.delete('/api/wishlist/:petId', authenticateRequest, async (req, res) => {
  const petId = req.params.petId;
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND pet_id = $2', [req.user.id, petId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Wishlist delete error:', err.message);
    res.status(500).json({ error: 'Unable to remove wishlist item.' });
  }
});

app.get('/api/starred', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT pet_id, pet, created_at FROM starred_animals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ items: result.rows.map((row) => ({ petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at })) });
  } catch (err) {
    console.error('Starred fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch starred animals.' });
  }
});

app.post('/api/starred', authenticateRequest, async (req, res) => {
  const { petId, pet } = req.body || {};
  if (!petId || !pet) {
    return res.status(400).json({ error: 'Missing pet data.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO starred_animals (user_id, pet_id, pet)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, pet_id) DO UPDATE SET pet = EXCLUDED.pet
       RETURNING pet_id, pet, created_at`,
      [req.user.id, String(petId), JSON.stringify(pet)]
    );
    const row = result.rows[0];
    res.status(201).json({ item: { petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at } });
  } catch (err) {
    console.error('Starred add error:', err.message);
    res.status(500).json({ error: 'Unable to update starred animals.' });
  }
});

app.delete('/api/starred/:petId', authenticateRequest, async (req, res) => {
  const petId = req.params.petId;
  try {
    await pool.query('DELETE FROM starred_animals WHERE user_id = $1 AND pet_id = $2', [req.user.id, petId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Starred delete error:', err.message);
    res.status(500).json({ error: 'Unable to remove starred animal.' });
  }
});

app.get('/api/chat/threads', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT other_id AS user_id, email, MAX(created_at) AS last_message_at
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id, created_at
         FROM messages
         WHERE sender_id = $1 OR recipient_id = $1
       ) m
       JOIN users u ON u.id = m.other_id
       GROUP BY other_id, email
       ORDER BY last_message_at DESC`,
      [req.user.id]
    );
    res.json({ threads: result.rows.map((row) => ({ userId: row.user_id, email: row.email, lastMessageAt: row.last_message_at })) });
  } catch (err) {
    console.error('Threads fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch chat threads.' });
  }
});

app.get('/api/messages/:userId', authenticateRequest, async (req, res) => {
  const otherId = parseInt(req.params.userId, 10);
  if (!otherId) {
    return res.status(400).json({ error: 'Recipient missing.' });
  }
  try {
    const otherUser = await getUserById(otherId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }
    const messages = await fetchConversation(req.user.id, otherId);
    res.json({ messages });
  } catch (err) {
    console.error('Messages fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch messages.' });
  }
});

app.get('/api/db/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('register', async (payload) => {
    try {
      let user;
      if (payload && typeof payload === 'object' && payload.token) {
        ensureJwtSecret();
        const decoded = jwt.verify(payload.token, JWT_SECRET);
        user = await getUserById(decoded.id);
      } else if (typeof payload === 'string') {
        user = await getUserByEmail(payload);
      }
      if (!user) {
        socket.emit('chat_error', 'User not found.');
        return;
      }
      socket.user = user;
      onlineUsers.set(user.id, socket.id);
      socket.emit('registered', { user });
    } catch (err) {
      console.error('Socket register error:', err.message);
      socket.emit('chat_error', 'Unable to register user.');
    }
  });

  socket.on('private_message', async ({ recipientId, to, message, sharedPet }) => {
    try {
      if (!socket.user) {
        socket.emit('chat_error', 'Authentication required.');
        return;
      }
      let targetId = parseInt(recipientId, 10);
      let recipient = null;
      if (targetId) {
        recipient = await getUserById(targetId);
      } else if (to) {
        recipient = await getUserByEmail(to);
        if (recipient) {
          targetId = recipient.id;
        }
      }
      if (!targetId) {
        socket.emit('chat_error', 'Recipient missing.');
        return;
      }
      if (!recipient) {
        recipient = await getUserById(targetId);
      }
      if (!recipient) {
        socket.emit('chat_error', 'Recipient not found.');
        return;
      }
      const text = typeof message === 'string' ? message.trim() : '';
      if (!text && !sharedPet) {
        socket.emit('chat_error', 'Message or pet required.');
        return;
      }
      const delivered = onlineUsers.has(targetId);
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, body, shared_pet, delivered)
         VALUES ($1, $2, $3, $4::jsonb, $5)
         RETURNING id, sender_id, recipient_id, body, shared_pet, created_at`,
        [socket.user.id, targetId, text, sharedPet ? JSON.stringify(sharedPet) : null, delivered]
      );
      const row = result.rows[0];
      const dto = {
        id: row.id,
        senderId: row.sender_id,
        senderEmail: socket.user.email,
        recipientId: row.recipient_id,
        recipientEmail: recipient.email,
        message: row.body,
        sharedPet: parseJsonField(row.shared_pet),
        createdAt: row.created_at
      };
      socket.emit('private_message', dto);
      if (delivered) {
        io.to(onlineUsers.get(targetId)).emit('private_message', dto);
      }
    } catch (err) {
      console.error('Socket message error:', err.message);
      socket.emit('chat_error', 'Unable to send message.');
    }
  });

  socket.on('get_history', async ({ recipientId, recipient }) => {
    try {
      if (!socket.user) {
        socket.emit('chat_error', 'Authentication required.');
        return;
      }
      let targetId = parseInt(recipientId, 10);
      if (!targetId && recipient) {
        const lookup = await getUserByEmail(recipient);
        if (lookup) {
          targetId = lookup.id;
        }
      }
      if (!targetId) {
        socket.emit('chat_error', 'Recipient missing.');
        return;
      }
      const targetUser = await getUserById(targetId);
      if (!targetUser) {
        socket.emit('chat_error', 'Recipient not found.');
        return;
      }
      const messages = await fetchConversation(socket.user.id, targetId);
      socket.emit('chat_history', { recipientId: targetId, messages });
    } catch (err) {
      console.error('Socket history error:', err.message);
      socket.emit('chat_error', 'Unable to load history.');
    }
  });

  socket.on('disconnect', () => {
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
    }
  });
});


server.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});
