const jwt = require('jsonwebtoken');
const { ensureJwtSecret, JWT_SECRET } = require('../middleware/auth');
const { getUserById, getUserByEmail } = require('../db');

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
