// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/messageController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

// ── SEND MESSAGE ──────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message)
      return res.status(400).json({ message: 'receiver_id and message required' });

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message, is_read) VALUES (?,?,?,0)',
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

// ── GET CONVERSATION ──────────────────────────
const getConversation = async (req, res) => {
  try {
    const other = req.params.userId;

    // Mark messages as read when opening conversation
    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [other, req.user.id]
    );

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

// ── GET INBOX ─────────────────────────────────
const getInbox = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.name AS other_name, u.role AS other_role,
              SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
       FROM messages m
       JOIN users u ON u.id = IF(m.sender_id=?, m.receiver_id, m.sender_id)
       WHERE m.id IN (
         SELECT MAX(id) FROM messages
         WHERE sender_id=? OR receiver_id=?
         GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
       )
       GROUP BY m.id, u.name, u.role
       ORDER BY m.sent_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── UNREAD MESSAGE COUNT ───────────────────────
const getUnreadMessageCount = async (req, res) => {
  try {
    const [[result]] = await pool.query(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET ASSIGNED SERVICE PROVIDER ─────────────
const getMyServiceProvider = async (req, res) => {
  try {
    // Get user's assigned provider
    const [[user]] = await pool.query(
      `SELECT u.assigned_provider_id, sp.id, sp.name, sp.email, sp.location
       FROM users u
       LEFT JOIN users sp ON sp.id = u.assigned_provider_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user || !user.assigned_provider_id) {
      // Auto assign a service provider (round robin)
      const [providers] = await pool.query(
        `SELECT u.id, u.name, u.email, u.location,
                COUNT(assigned.id) AS assigned_count
         FROM users u
         LEFT JOIN users assigned ON assigned.assigned_provider_id = u.id
         WHERE u.role = 'service_provider'
         GROUP BY u.id
         ORDER BY assigned_count ASC
         LIMIT 1`
      );

      if (providers.length === 0) {
        return res.json({ provider: null });
      }

      const provider = providers[0];

      // Assign this provider to the user
      await pool.query(
        'UPDATE users SET assigned_provider_id = ? WHERE id = ?',
        [provider.id, req.user.id]
      );

      return res.json({
        provider: {
          id: provider.id,
          name: provider.name,
          location: provider.location,
        }
      });
    }

    res.json({
      provider: {
        id: user.id,
        name: user.name,
        location: user.location,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadMessageCount,
  getMyServiceProvider,
};