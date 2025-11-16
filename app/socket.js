const { Server } = require('socket.io');
const { handleRegister } = require('./socketHandlers/register');
const { handlePrivateMessage } = require('./socketHandlers/privateMessage');
const { handleGetHistory } = require('./socketHandlers/getHistory');
const { handleDisconnect } = require('./socketHandlers/disconnect');

function setupSocket(server) {
  const io = new Server(server);
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    handleRegister(socket, onlineUsers, io);
    handlePrivateMessage(socket, onlineUsers, io);
    handleGetHistory(socket);
    handleDisconnect(socket, onlineUsers);
  });

  return io;
}

module.exports = setupSocket;