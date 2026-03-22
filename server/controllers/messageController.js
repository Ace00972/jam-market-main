// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/messageController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const sendMessage = async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) return res.status(400).json({ message: 'receiver_id and message required' });

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?,?,?)',
      [req.user.id, receiver_id, message]
    );
    res.status(201).json({
      id: result.insertId,
      sender_id: req.user.id,
      receiver_id,
      message,
      sent_at: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const other = req.params.userId;
    const [rows] = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
       ORDER BY sent_at ASC`,
      [req.user.id, other, other, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInbox = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.name AS other_name
       FROM messages m
       JOIN users u ON u.id = IF(m.sender_id=?, m.receiver_id, m.sender_id)
       WHERE m.id IN (
         SELECT MAX(id) FROM messages
         WHERE sender_id=? OR receiver_id=?
         GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
       )
       ORDER BY m.sent_at DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendMessage, getConversation, getInbox };