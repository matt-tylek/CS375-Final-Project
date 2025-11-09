/**
 * Test script to verify AWS RDS/Aurora PostgreSQL connection
 * Run this before starting your main application: node test-db-connection.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Check if env.json exists
const envPath = path.join(__dirname, 'env.json');
if (!fs.existsSync(envPath)) {
  console.error(' Error: env.json file not found!');
  process.exit(1);
}

const config = require('./env.json');

// Validate required fields
const requiredFields = ['user', 'host', 'database', 'password', 'port'];
const missingFields = requiredFields.filter(field => !config[field]);

if (missingFields.length > 0) {
  console.error('Error: Missing required fields in env.json:');
  missingFields.forEach(field => console.error(`  - ${field}`));
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port,
  ssl: config.ssl !== undefined ? config.ssl : false,
  connectionTimeoutMillis: 5000, // 5 second timeout
});

console.log('Attempting to connect to database...');
console.log(`   Host: ${config.host}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Port: ${config.port}`);
console.log('');

pool.query('SELECT NOW() as current_time, version() as pg_version, current_database() as db_name')
  .then((result) => {
    console.log(' SUCCESS: Database connection established!');
    console.log('');
    console.log('Database Information:');
    console.log(`   Database Name: ${result.rows[0].db_name}`);
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    console.log('');
    console.log(' Your database is ready to use!');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FAILED: Could not connect to database');
    console.error('');
    console.error('Error Details:');
    console.error(`   ${error.message}`);

    pool.end();
    process.exit(1);
  });

