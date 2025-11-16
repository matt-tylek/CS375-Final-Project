const express = require('express');
const { pool, getUserById, fetchConversation } = require('../db');
const { authenticateRequest } = require('../middleware/auth');

const router = express.Router();

router.get('/chat/threads', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT other_id AS user_id, email, MAX(created_at) AS last_message_at
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id, created_at
         FROM messages
         WHERE sender_id = $1 OR recipient_id = $1
       ) m
       JOIN users u ON u.id = m.other_id
       GROUP BY other_id, email
       ORDER BY last_message_at DESC`,
      [req.user.id]
    );
    res.json({ threads: result.rows.map((row) => ({ userId: row.user_id, email: row.email, lastMessageAt: row.last_message_at })) });
  } catch (err) {
    console.error('Threads fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch chat threads.' });
  }
});

router.get('/messages/:userId', authenticateRequest, async (req, res) => {
  const otherId = parseInt(req.params.userId, 10);
  if (!otherId) {
    return res.status(400).json({ error: 'Recipient missing.' });
  }
  try {
    const otherUser = await getUserById(otherId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Recipient not found.' });
    }
    const messages = await fetchConversation(req.user.id, otherId);
    res.json({ messages });
  } catch (err) {
    console.error('Messages fetch error:', err.message);
    res.status(500).json({ error: 'Unable to fetch messages.' });
  }
});

module.exports = router;
