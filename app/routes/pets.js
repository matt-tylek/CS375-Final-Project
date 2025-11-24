const express = require('express');
const axios = require('axios');
const petAuth = require('../petAuth');
const {stripe_secret_key} = require('../config');
const Stripe = require('stripe');
const stripe = new Stripe(stripe_secret_key);
const { getCoordsFromZip, calculateDistanceInMiles } = require('./utils');
const { pool } = require('../db');


const price_cache = {};

const router = express.Router();

function normalizePet(dbPet) {
    const uniqueId = `CUSTOM-${dbPet.id}`; 
    
    return {
        id: uniqueId,
        organization_id: 'CUSTOM_USER_LISTING',
        url: `/pet/custom/${dbPet.id}`, 
        type: dbPet.species,
        species: dbPet.species,
        
        breeds: {
            primary: dbPet.primary_breed,
            secondary: dbPet.secondary_breed,
            mixed: dbPet.mixed_breed,
            unknown: !dbPet.primary_breed && !dbPet.secondary_breed
        },
        
        age: dbPet.age,
        gender: dbPet.gender,
        size: dbPet.size,
        coat: dbPet.coat,
        
        attributes: {
            spayed_neutered: dbPet.is_spayed_neutered,
            house_trained: dbPet.is_house_trained,
            declawed: dbPet.is_declawed,
            special_needs: dbPet.is_special_needs,
            shots_current: dbPet.is_shots_current
        },
        
        environment: {
            children: dbPet.good_with_children,
            dogs: dbPet.good_with_dogs,
            cats: dbPet.good_with_cats
        },
        
        name: dbPet.name,
        description: dbPet.description,
        
        photos: [{
            small: dbPet.primary_photo_url,
            medium: dbPet.primary_photo_url,
            large: dbPet.primary_photo_url,
            full: dbPet.primary_photo_url
        }],
        
        contact: {
            email: dbPet.contact_email,
            phone: dbPet.contact_phone,
            address: {
                address1: dbPet.contact_address1,
                city: dbPet.city,
                state: dbPet.state_code,
                postcode: dbPet.zipcode
            }
        },
        
        status: dbPet.status,
        published_at: dbPet.published_at,
    };
}


router.get('/pets', async (req, res) => {
  const accessToken = petAuth.getAccessToken();
  if (!accessToken) {
    return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
  }

  const { type, distance, location } = req.query;
  const externalApiUrl = 'https://api.petfinder.com/v2/animals';
  const zip = location || '10001';
  const searchDistance = parseFloat(distance);

  const shouldFilterByDistance = !isNaN(searchDistance) && searchDistance > 0;

  let userCoords = null;
  try {
    userCoords = await getCoordsFromZip(zip);
  } catch (error) {
    console.warn(`Geocoding failed for zip ${zip}:`, error.message);
  }

  const externalApiCall = axios.get(externalApiUrl, {
        params: {
            type,
            location: zip,
            distance: distance || 50,
            limit: 20
        },
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

  const dbQuery = await pool.query(
      `SELECT * FROM user_pet_listings 
        WHERE type = $1 AND status = 'adoptable'`,
      [type]
  );

  try {
    const [petfinderResponse, dbResponse] = await Promise.all([externalApiCall, dbQuery]);

    const externalPets = petfinderResponse.data.animals;
    const customPets = dbResponse.rows; 

    const filteredCustomPets = customPets.filter(pet => {
      if (!shouldFilterByDistance || userCoords === null) {
            return true;
      }

      if (!pet.latitude || !pet.longitude) {
        return false; 
      }
      
      const petCoords = { lat: pet.latitude, lon: pet.longitude };
      
      const calculatedDistance = calculateDistanceInMiles(userCoords, petCoords);
      return calculatedDistance <= searchDistance;
    });

    const normalizedCustomPets = filteredCustomPets.map(pet => normalizePet(pet));
  
    const allPets = [...normalizedCustomPets, ...externalPets];

    res.json({ pets: allPets }); 
  } catch (error) {
    console.error('Error fetching pets:', error.message);
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

router.post('/user/pets', async (req, res) => {
  const petData = req.body;

  if (!/^\d{5}$/.test(petData.zipcode)) {
    return res.status(400).json({ error: "Zip code format is invalid." });
  }
  
  let latitude = null;
  let longitude = null;
  
  try {
    const coords = await getCoordsFromZip(petData.zipcode);
    latitude = coords.lat;
    longitude = coords.lon;
  } catch (error) {
    console.error('Geocoding failed for new listing:', error.message);
    return res.status(400).json({ error: "Invalid location. Please check the zip code." });
  }

  try {
  
    const queryText = `
        INSERT INTO user_pet_listings (
          name, species, type, primary_breed, mixed_breed, age, gender, size, coat, description,
          is_spayed_neutered, is_house_trained, is_declawed, is_special_needs, is_shots_current,
          good_with_children, good_with_dogs, good_with_cats, city, state_code, zipcode, latitude, 
          longitude, contact_email, contact_phone, primary_photo_url
        ) 
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        RETURNING id;`; 
        
    const queryValues = [
      petData.name,               
      petData.species,            
      petData.type,                
      petData.primary_breed,      
      petData.mixed_breed,        
      petData.age,              
      petData.gender,        
      petData.size,             
      petData.coat,                
      petData.description,        
      
      petData.is_spayed_neutered,  
      petData.is_house_trained,   
      petData.is_declawed,        
      petData.is_special_needs,   
      petData.is_shots_current,   
      
      petData.good_with_children,  
      petData.good_with_dogs,     
      petData.good_with_cats,     
      
      petData.city,               
      petData.state_code,          
      petData.zipcode,            
      
      latitude,                   
      longitude,                 
      
      petData.contact_email,      
      petData.contact_phone,      
      petData.primary_photo_url   
    ];
    
    const result = await pool.query(queryText, queryValues);
    
    res.status(201).json({ 
        message: "Pet listing created successfully", 
        id: result.rows[0].id 
    });

  } catch (dbError) {
    console.error('Database insertion error:', dbError);
    res.status(500).json({ error: "Failed to save pet listing to the database." });
  }
});

router.get('/pets/:id', async (req, res) => {
    const petId = req.params.id;

    if (petId.startsWith('CUSTOM-')) {

      const customDbId = petId.replace('CUSTOM-', '');
      try {
        const dbResponse = await pool.query(
          `SELECT * FROM user_pet_listings WHERE id = $1`,
          [customDbId]
        );

        const customPet = dbResponse.rows[0];

        if (customPet) {
          const normalizedPet = normalizePet(customPet); 
          return res.json({ animal: normalizedPet }); 
        } else {
          return res.status(404).json({ error: "Custom pet not found." });
        }

      } catch (error) {
        console.error('Error fetching custom pet from DB:', error.message);
        return res.status(500).json({ error: "Internal Server Error accessing custom pet data." });
      }
    }

    const accessToken = petAuth.getAccessToken();
    if (!accessToken) {
      return res.status(503).json({ error: "Service unavailable, waiting for Petfinder token." });
    }

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
          
        if (error.response.status === 404) {
              return res.status(404).json({ error: "External pet not found." });
        }
        if (error.response.status === 401) {
          return res.status(503).json({
            error: "External API token error. Retrying authentication.",
            detail: error.response.data
          });
        } 
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


const getBaseUrl = (req) => {
  if (req.headers.origin) return req.headers.origin; // sent by browser
  const protocol = req.protocol || 'http';           // 'http' in dev, 'https' in prod behind load balancer
  const host = req.get('host');                      // includes host:port
  return `${protocol}://${host}`;
};


router.post('/checkout/mark-sold/:id', (req, res) => {
  const petId = req.params.id;
  price_cache[petId] = "SOLD";
  console.log(`Pet ${petId} marked as SOLD`);
  res.json({ success: true });
});



router.get('/checkout/pets/:id', async (req, res) => {
  const petId = req.params.id;
  const price = price_cache[petId];
  const baseUrl = getBaseUrl(req);

  if (!price) {
    return res.status(404).json({ error: "Price not found for the specified pet." });
  }

  if (price == "SOLD") {
    return res.status(400).json({"error": "Pet already sold."});
  };


  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Adoption Fee for Pet ID: ${petId}`,
          },
          unit_amount: price * 100,
        },
        quantity: 1,
      },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/pet.html?petId=${petId}&status=success`,
      cancel_url: `${baseUrl}/pet.html?petId=${petId}&status=cancel`,
    });
    res.json({id: session.id});
  } catch (error) {
    res.status(500).json({error: "Failed to create checkout session"});
  }
});

module.exports = router;


