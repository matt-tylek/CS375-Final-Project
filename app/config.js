const crypto = require('crypto');
const config = require('../env.json');

const JWT_SECRET = process.env.JWT_SECRET || config.jwt_secret || crypto.randomBytes(32).toString('hex');

module.exports = { config, JWT_SECRET };
