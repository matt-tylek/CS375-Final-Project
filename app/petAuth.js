const axios = require('axios');

// External token endpoint
const TOKEN_URL = 'https://api.petfinder.com/v2/oauth2/token';

let tokenData = {
    accessToken: null,
    expiresIn: 0, // Time (in seconds) until expiration
    expirationTime: 0 // Timestamp when the token expires
};

/**
 * Sends POST request to the Petfinder API to obtain a new access token
 * @param {Object} config - The configuration object loaded from env.json
 */
async function generateNewToken(config) {
    const { api_key, api_secret } = config;

    console.log('Generating new Petfinder access token');

    try {
        // Sent as application/x-www-form-urlencoded
        const data = new URLSearchParams();
        data.append('grant_type', 'client_credentials');
        data.append('client_id', api_key);
        data.append('client_secret', api_secret);

        const response = await axios.post(TOKEN_URL, data.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        tokenData.accessToken = response.data.access_token;
        tokenData.expiresIn = response.data.expires_in;

        // Set the new expiration time & set it to refresh early (at 90% time) 
        tokenData.expirationTime = Date.now() + (response.data.expires_in * 1000 * 0.9);

        console.log('Petfinder token generated successfully.');
        console.log(`Token expires in ${Math.round(response.data.expires_in / 60)} minutes.`);

        return tokenData.accessToken;

    } catch (error) {
        console.error('Could not generate Petfinder access token!');
        if (error.response) {
            console.error('API Error Response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        // In a real app, you would stop the server or implement a retry mechanism here.
        return null; 
    }
}

/**
 * Schedules the token refresh and provides the current token.
 * @param {Object} config - The configuration object loaded from env.json.
 */
function startTokenManager(config) {
    // Generate the token immediately on startup
    generateNewToken(config); 

    // Schedule the token refresh
    const refreshInterval = 30 * 60 * 1000; // 30 minutes in milliseconds

    setInterval(() => {
        generateNewToken(config);
    }, refreshInterval);
    
    console.log(`Token refresh scheduled every ${refreshInterval / 60000} minutes.`);
}

/**
 * Returns the currently valid access token.
 */
function getAccessToken() {
    if (!tokenData.accessToken) {
        console.warn('Access token is not yet initialized or has failed to load.');
    }
    return tokenData.accessToken;
}

module.exports = {
    startTokenManager,
    getAccessToken
};
