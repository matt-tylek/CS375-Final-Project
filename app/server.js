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

//API Connection
petAuth.startTokenManager(config);

//DB Connection
//const env = require("../env.json");
//const Pool = pg.Pool;
//const pool = new Pool(env);
//pool.connect().then(function () {
//console.log(`Connected to database ${env.database}`);
//});

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
app.get('api/pets/:id', (req, res) => {
  // Returns detailed info for one specific pet
  // reads pet ID from request params
});

// Get Pet Types
app.get('/api/types', (req, res) => {
  // Returns list of supported animal types
});

// Get Pets by Single Pet Type
app.get('/api/types', (req, res) => {
  // Returns information on single animal type
});

// DB Management - GET, POST, DELETE

app.listen(port, hostname, () => {
  console.log(`Listening at: http://${hostname}:${port}`);
});