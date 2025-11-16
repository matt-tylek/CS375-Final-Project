const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/db/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
