const geocoder = require('node-geocoder');

// Configure the Geocoder to use Nominatim 
const options = {
    provider: 'openstreetmap', 
    httpAdapter: 'https',
    userAgent: 'PetFinder', 
    formatter: null
};

const localZipData = {
    "19104": { lat: 39.9575, lon: -75.2104 }, // West Philly
    "10001": { lat: 40.7505, lon: -73.9934 }, // Manhattan
    "19380": { lat: 39.9701, lon: -75.6033 }, // West Chester, PA
};

//const geo = geocoder(options); 

async function getCoordsFromZip(zipcode) {
    if (localZipData[zipcode]) {
        console.log(`[Local Geo] Using cached coordinates for ${zipcode}`);
        return localZipData[zipcode];
    }
    // const res = await geo.geocode(zipcode);
    // if (res.length === 0) {
    //     throw new Error(`Coordinates not found for zip code: ${zipcode}`);
    // }
    // return { lat: res[0].latitude, lon: res[0].longitude };
}

function calculateDistanceInMiles(point1, point2) {s
    const distanceInMeters = haversine(point1, point2);
    
    const MILES_PER_METER = 0.000621371;
    
    return distanceInMeters * MILES_PER_METER;
}

module.exports = {
    getCoordsFromZip,
    calculateDistanceInMiles
};