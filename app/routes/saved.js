const express = require('express');
const { pool, parseJsonField } = require('../db');
const { authenticateRequest } = require('../middleware/auth');

const router = express.Router();

router.get('/wishlist', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT pet_id, pet, created_at FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ items: result.rows.map((row) => ({ petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at })) });
  } catch (err) {
    console.error('Wishlist fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch wishlist.' });
  }
});

router.post('/wishlist', authenticateRequest, async (req, res) => {
  const { petId, pet } = req.body || {};
  if (!petId || !pet) {
    return res.status(400).json({ error: 'Missing pet data.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO wishlist_items (user_id, pet_id, pet)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, pet_id) DO UPDATE SET pet = EXCLUDED.pet
       RETURNING pet_id, pet, created_at`,
      [req.user.id, String(petId), JSON.stringify(pet)]
    );
    const row = result.rows[0];
    res.status(201).json({ item: { petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at } });
  } catch (err) {
    console.error('Wishlist add error:', err.message);
    res.status(500).json({ error: 'Unable to update wishlist.' });
  }
});

router.delete('/wishlist/:petId', authenticateRequest, async (req, res) => {
  const petId = req.params.petId;
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND pet_id = $2', [req.user.id, petId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Wishlist delete error:', err.message);
    res.status(500).json({ error: 'Unable to remove wishlist item.' });
  }
});

router.get('/starred', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT pet_id, pet, created_at FROM starred_animals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ items: result.rows.map((row) => ({ petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at })) });
  } catch (err) {
    console.error('Starred fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch starred animals.' });
  }
});

router.post('/starred', authenticateRequest, async (req, res) => {
  const { petId, pet } = req.body || {};
  if (!petId || !pet) {
    return res.status(400).json({ error: 'Missing pet data.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO starred_animals (user_id, pet_id, pet)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, pet_id) DO UPDATE SET pet = EXCLUDED.pet
       RETURNING pet_id, pet, created_at`,
      [req.user.id, String(petId), JSON.stringify(pet)]
    );
    const row = result.rows[0];
    res.status(201).json({ item: { petId: row.pet_id, pet: parseJsonField(row.pet), createdAt: row.created_at } });
  } catch (err) {
    console.error('Starred add error:', err.message);
    res.status(500).json({ error: 'Unable to update starred animals.' });
  }
});

router.delete('/starred/:petId', authenticateRequest, async (req, res) => {
  const petId = req.params.petId;
  try {
    await pool.query('DELETE FROM starred_animals WHERE user_id = $1 AND pet_id = $2', [req.user.id, petId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Starred delete error:', err.message);
    res.status(500).json({ error: 'Unable to remove starred animal.' });
  }
});

module.exports = router;
