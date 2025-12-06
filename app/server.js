const express = require("express");
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const petAuth = require('./petAuth');
const { config } = require('./config');
const setupSocket = require('./socket');

const petsRouter = require('./routes/pets');
const authRouter = require('./routes/auth');
const savedRouter = require('./routes/saved');
const chatRouter = require('./routes/chat');
const dbRouter = require('./routes/db');

const port = process.env.PORT || 3000;
const hostname = process.env.HOST || "localhost";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', petsRouter);
app.use('/api', authRouter);
app.use('/api', savedRouter);
app.use('/api', chatRouter);
app.use('/api', dbRouter);

const server = http.createServer(app);
setupSocket(server);

server.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});
