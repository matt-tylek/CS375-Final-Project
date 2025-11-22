const express = require('express');
const axios = require('axios');
const petAuth = require('../petAuth');

const price_cache = {};

const router = express.Router();

router.get('/pets', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const { type, distance, location } = req.query;
  const externalApiUrl = 'https://api.petfinder.com/v2/animals';

  try {
    const response = await axios.get(externalApiUrl, {
      params: {
        type,
        location: location || '10001',
        distance: distance || 50,
        limit: 20
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching pets from Petfinder:', error.message);
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
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

router.get('/pets/:id', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const petId = req.params.id;
  const externalApiUrl = `https://api.petfinder.com/v2/animals/${petId}`;
  try {
    const response = await axios.get(externalApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    console.log('Fetched pet data:', response.data);
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
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

router.get('/types', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const externalApiUrl = 'https://api.petfinder.com/v2/types';
  try {
    const response = await axios.get(externalApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
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
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

router.get('/types/:type', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const type = req.params.type;
  const externalApiUrl = `https://api.petfinder.com/v2/types/${type}`;
  try {
    const response = await axios.get(externalApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
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
    res.status(500).json({ error: "Internal Server Error during Petfinder request." });
  }
});

router.get('/price/pets/:id', (req, res) => {
  // fetch price from cache using petid. If not found, generate random price between $500 and $5000
  const petId = req.params.id;
  const price = price_cache[petId] || (Math.floor(Math.random() * (5000 -  500 + 1)) + 500);
  price_cache[petId] = price;
  res.json({"price":price});
})

module.exports = router;
