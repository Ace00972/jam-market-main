// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/adminController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

// ── GET ALL USERS ─────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, location, is_admin, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── UPDATE USER ROLE ──────────────────────────
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['farmer', 'customer', 'service_provider'];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role' });
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE USER ───────────────────────────────
const deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ message: 'You cannot delete your own account' });
    await pool.query('DELETE FROM messages WHERE sender_id=? OR receiver_id=?', [req.params.id, req.params.id]);
    await pool.query('DELETE FROM orders WHERE customer_id=?', [req.params.id]);
    await pool.query('DELETE FROM products WHERE farmer_id=?', [req.params.id]);
    await pool.query('UPDATE users SET assigned_provider_id=NULL WHERE assigned_provider_id=?', [req.params.id]);
    await pool.query('DELETE FROM farmer_payment_info WHERE farmer_id=?', [req.params.id]);
    const [result] = await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PEST ALERTS ───────────────────────────────
const getPestAlerts = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pest_alerts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addPestAlert = async (req, res) => {
  try {
    const { title, description, region, severity } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description required' });
    const [result] = await pool.query(
      'INSERT INTO pest_alerts (title, description, region, severity) VALUES (?,?,?,?)',
      [title, description, region || null, severity || 'medium']
    );
    res.status(201).json({ id: result.insertId, message: 'Pest alert added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deletePestAlert = async (req, res) => {
  try {
    await pool.query('DELETE FROM pest_alerts WHERE id=?', [req.params.id]);
    res.json({ message: 'Pest alert deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── FARMING TIPS ──────────────────────────────
const getFarmingTips = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM farming_tips ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addFarmingTip = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
    const [result] = await pool.query(
      'INSERT INTO farming_tips (title, content, category) VALUES (?,?,?)',
      [title, content, category || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Farming tip added' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteFarmingTip = async (req, res) => {
  try {
    await pool.query('DELETE FROM farming_tips WHERE id=?', [req.params.id]);
    res.json({ message: 'Farming tip deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── ANNOUNCEMENTS ─────────────────────────────
const getAnnouncements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS created_by_name FROM announcements a
       JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message required' });
    const [result] = await pool.query(
      'INSERT INTO announcements (title, message, created_by) VALUES (?,?,?)',
      [title, message, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Announcement sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id=?', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getAllUsers, updateUserRole, deleteUser,
  getPestAlerts, addPestAlert, deletePestAlert,
  getFarmingTips, addFarmingTip, deleteFarmingTip,
  getAnnouncements, addAnnouncement, deleteAnnouncement,
};