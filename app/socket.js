const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { ensureJwtSecret, JWT_SECRET } = require('./middleware/auth');
const { getUserById, getUserByEmail, fetchConversation, parseJsonField, pool } = require('./db');

function setupSocket(server) {
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

  return io;
}

module.exports = setupSocket;
