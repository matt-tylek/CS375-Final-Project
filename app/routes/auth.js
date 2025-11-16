const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateRequest, ensureJwtSecret, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
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

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

router.get('/me', authenticateRequest, async (req, res) => {
  res.json({ user: req.user });
});

router.get('/users', authenticateRequest, async (req, res) => {
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

module.exports = router;
