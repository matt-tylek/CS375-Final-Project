const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { getUserById } = require('../db');

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }
}

function extractToken(req) {
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
  JWT_SECRET
};
