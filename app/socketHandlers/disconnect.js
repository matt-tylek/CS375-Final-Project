function handleDisconnect(socket, onlineUsers) {
  socket.on('disconnect', () => {
    if (socket.user) onlineUsers.delete(socket.user.id);
  });
}

module.exports = { handleDisconnect };
