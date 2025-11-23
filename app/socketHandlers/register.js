const jwt = require('jsonwebtoken');
const { ensureJwtSecret, JWT_SECRET, SESSION_COOKIE_NAME } = require('../middleware/auth');
const { getUserById, getUserByEmail } = require('../db');

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (!rawKey) return acc;
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawVal.join('=') || '');
    acc[key] = value;
    return acc;
  }, {});
}

function extractTokenFromSocket(socket) {
  const cookieHeader = socket.handshake?.headers?.cookie;
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

async function handleRegister(socket, onlineUsers, io) {
  socket.on('register', async (payload) => {
    try {
      let user;

      if (payload && typeof payload === 'object' && payload.token) {
        ensureJwtSecret();
        const decoded = jwt.verify(payload.token, JWT_SECRET);
        user = await getUserById(decoded.id);
      } else if (typeof payload === 'string') {
        user = await getUserByEmail(payload);
      } else {
        const cookieToken = extractTokenFromSocket(socket);
        if (cookieToken) {
          ensureJwtSecret();
          const decoded = jwt.verify(cookieToken, JWT_SECRET);
          user = await getUserById(decoded.id);
        }
      }

      if (!user) {
        return socket.emit('chat_error', 'User not found.');
      }

      socket.user = user;
      onlineUsers.set(user.id, socket.id);

      socket.emit('registered', { user });
    } catch (err) {
      console.error('Socket register error:', err.message);
      socket.emit('chat_error', 'Unable to register user.');
    }
  });
}

module.exports = { handleRegister };
