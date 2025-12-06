const zipcodes = require('zipcodes');

const localZipDataFallback = {
    "19104": { lat: 39.9575, lon: -75.2104 }, // West Philly
    "10001": { lat: 40.7505, lon: -73.9934 }, // Manhattan
    "19380": { lat: 39.9701, lon: -75.6033 }, // West Chester, PA
};

const EARTH_RADIUS_METERS = 6371000;

function getCoordsFromZip(zipcode) {
    const location = zipcodes.lookup(zipcode);

    if (!location) {
        throw new Error(`Coordinates not found for zip code: ${zipcode}`);
    }

    return { 
        lat: location.latitude, 
        lon: location.longitude 
    };
}

function haversine(point1, point2) {
    const degToRad = (deg) => deg * (Math.PI / 180);

    const lat1 = degToRad(point1.lat);
    const lon1 = degToRad(point1.lon);
    const lat2 = degToRad(point2.lat);
    const lon2 = degToRad(point2.lon);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c; // Distance in meters
}

function calculateDistanceInMiles(point1, point2) {
    const distanceInMeters = haversine(point1, point2);
    
    const MILES_PER_METER = 0.000621371;
    
    return distanceInMeters * MILES_PER_METER;
}

module.exports = {
    getCoordsFromZip,
    calculateDistanceInMiles
};