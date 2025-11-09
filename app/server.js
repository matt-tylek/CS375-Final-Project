const pg = require("pg");
const express = require("express");
const petAuth = require('./petAuth');
let axios = require("axios");
const path = require('path');
const config = require("../env.json");

const port = process.env.PORT || 3000;
const hostname = process.env.HOST || "localhost";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//API Connection
petAuth.startTokenManager(config);

//DB Connection
const Pool = pg.Pool;
const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port,
  ssl: config.ssl || false
});

// Test database connection
pool.connect()
  .then(function (client) {
    console.log(`✅ Connected to database: ${config.database} at ${config.host}`);
    client.release();
  })
  .catch(function (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your env.json configuration and ensure your RDS instance is accessible.');
  });

// Make pool available for use in routes
app.locals.pool = pool;

app.use(express.static(path.join(__dirname, 'public')));

// GET Pet Listings - filter by Search/Location
// Returns filtered paginated list of pets
app.get('/api/pets', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const { type, distance, location } = req.query;
  const externalApiUrl = 'https://api.petfinder.com/v2/animals';

  try {
    const response = await axios.get(externalApiUrl, {
      params: {
          type: type, 
          location: location || '10001', // Default to NYC zip code if location is missing
          distance: distance || 50,
          limit: 20
      },
      headers: {
          'Authorization': `Bearer ${accessToken}`
      }
    });
    res.json(response.data);

  } catch (error) {
    console.error('Error fetching pets from Petfinder:', error.message);

    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

        // If the token is invalid (401), the auth service should handle the refresh
      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    // Handle network/connection errors
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

// GET Single Pet
app.get('/api/pets/:id', async (req, res) => {
  // Returns detailed info for one specific pet
  // reads pet ID from request params
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const petId = req.params.id;
  const externalApiUrl = `https://api.petfinder.com/v2/animals/${petId}`;
  try{
    const response = await axios.get(externalApiUrl,{headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    // Handle network/connection errors
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

// Get Pet Types
app.get('/api/types', async (req, res) => {
  // Returns list of supported animal types
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const externalApiUrl = 'https://api.petfinder.com/v2/types';
  try {
    const response = await axios.get(externalApiUrl, { headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet types from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    // Handle network/connection errors
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

// Get Pets by Single Pet Type
app.get('/api/types/:type', async (req, res) => {
  // Returns information on single animal type
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const type = req.params.type;
  const externalApiUrl = `https://api.petfinder.com/v2/types/${type}`;
  try {
    const response = await axios.get(externalApiUrl, { headers: {
      'Authorization': `Bearer ${accessToken}`
    }});
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pet type from Petfinder:', error.message);
    if (error.response) {
      console.error('Petfinder Status:', error.response.status);
      console.error('Petfinder Data:', error.response.data);

      if (error.response.status === 401) {
        return res.status(503).json({ 
          error: "External API token error. Retrying authentication.",
          detail: error.response.data
        });
      }

      return res.status(error.response.status).json(error.response.data);
    }

    // Handle network/connection errors
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
}
);

// DB Management - GET, POST, DELETE

// Test database connection endpoint
app.get('/api/db/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// --- Socket.IO setup ---
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

// Map username -> socket.id
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('New websocket connection:', socket.id);

  // Client tells us who
  socket.on('register', (username) => {
    if (!username) return;
    socket.username = username;
    onlineUsers.set(username, socket.id);
    console.log(`Registered user "${username}" with socket ${socket.id}`);
  });

  // Client sends a message
  socket.on('private_message', ({ to, message }) => {
    const from = socket.username;
    const targetSocketId = onlineUsers.get(to);

    if (!from) {
      socket.emit('chat_error', 'You must register a username first.');
      return;
    }

    if (!targetSocketId) {
      socket.emit('chat_error', `User "${to}" is not online.`);
      return;
    }

    io.to(targetSocketId).emit('private_message', { from, message });
  });

  // Cleanup
  socket.on('disconnect', () => {
    if (socket.username) {
      onlineUsers.delete(socket.username);
      console.log(`User "${socket.username}" disconnected.`);
    }
  });
});


server.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});
