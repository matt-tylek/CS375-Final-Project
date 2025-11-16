const { getUserById, getUserByEmail, fetchConversation } = require('../db');

async function handleGetHistory(socket) {
  socket.on('get_history', async ({ recipientId, recipient }) => {
    try {
      if (!socket.user) return socket.emit('chat_error', 'Authentication required.');

      let targetId = parseInt(recipientId, 10);
      if (!targetId && recipient) {
        const lookup = await getUserByEmail(recipient);
        if (lookup) targetId = lookup.id;
      }

      if (!targetId) return socket.emit('chat_error', 'Recipient missing.');

      const targetUser = await getUserById(targetId);
      if (!targetUser) return socket.emit('chat_error', 'Recipient not found.');

      const messages = await fetchConversation(socket.user.id, targetId);
      socket.emit('chat_history', { recipientId: targetId, messages });

    } catch (err) {
      console.error('Socket history error:', err.message);
      socket.emit('chat_error', 'Unable to load history.');
    }
  });
}

module.exports = { handleGetHistory };
