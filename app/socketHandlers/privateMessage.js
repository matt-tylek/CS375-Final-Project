const { getUserById, getUserByEmail, parseJsonField, pool } = require('../db');

async function handlePrivateMessage(socket, onlineUsers, io) {
  socket.on('private_message', async ({ recipientId, to, message, sharedPet }) => {
    try {
      if (!socket.user) return socket.emit('chat_error', 'Authentication required.');

      let targetId = parseInt(recipientId, 10);
      let recipient = null;

      if (targetId) {
        recipient = await getUserById(targetId);
      } else if (to) {
        recipient = await getUserByEmail(to);
        if (recipient) targetId = recipient.id;
      }

      if (!targetId) return socket.emit('chat_error', 'Recipient missing.');
      if (!recipient) recipient = await getUserById(targetId);
      if (!recipient) return socket.emit('chat_error', 'Recipient not found.');

      const text = typeof message === 'string' ? message.trim() : '';
      if (!text && !sharedPet) return socket.emit('chat_error', 'Message or pet required.');

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
      if (delivered) io.to(onlineUsers.get(targetId)).emit('private_message', dto);

    } catch (err) {
      console.error('Socket message error:', err.message);
      socket.emit('chat_error', 'Unable to send message.');
    }
  });
}

module.exports = { handlePrivateMessage };
