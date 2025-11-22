const crypto = require('crypto');
const config = require('../env.json');

const JWT_SECRET = process.env.JWT_SECRET || config.jwt_secret || crypto.randomBytes(32).toString('hex');
const stripe_secret_key = process.env.STRIPE_SECRET_KEY || config.stripe_secret_key;

module.exports = { config, JWT_SECRET, stripe_secret_key};
