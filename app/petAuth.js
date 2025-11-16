const axios = require('axios');

const TOKEN_URL = 'https://api.petfinder.com/v2/oauth2/token';

let tokenData = {
    accessToken: null,
    expiresIn: 0,
    expirationTime: 0
};

async function generateNewToken(config) {
    const { api_key, api_secret } = config;

    console.log('Generating new Petfinder access token');

    try {
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
       
        return null; 
    }
}

function startTokenManager(config) {
    generateNewToken(config); 

    const refreshInterval = 30 * 60 * 1000;

    setInterval(() => {
        generateNewToken(config);
    }, refreshInterval);
    
    console.log(`Token refresh scheduled every ${refreshInterval / 60000} minutes.`);
}

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
