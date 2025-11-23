const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { getUserById } = require('../db');

const SESSION_COOKIE_NAME = 'pf_session';
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  maxAge: 60 * 60 * 1000 // 1 hour
};

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }
}

function extractToken(req) {
  if (req && req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return header || null;
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

module.exports = {
  authenticateRequest,
  ensureJwtSecret,
  extractToken,
  JWT_SECRET,
  SESSION_COOKIE_NAME,
  sessionCookieOptions
};
