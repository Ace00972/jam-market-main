// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/admin.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const pool = require('../db');
const {
  getAllUsers, updateUserRole, deleteUser,
  getPestAlerts, addPestAlert, deletePestAlert,
  getFarmingTips, addFarmingTip, deleteFarmingTip,
  getAnnouncements, addAnnouncement, deleteAnnouncement,
} = require('../controllers/adminController');

// ── ADMIN MIDDLEWARE ──────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const [[user]] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.is_admin)
      return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const router = Router();

// Users
router.get('/users',                protect, requireAdmin, getAllUsers);
router.patch('/users/:id/role',     protect, requireAdmin, updateUserRole);
router.delete('/users/:id',         protect, requireAdmin, deleteUser);

// Pest Alerts
router.get('/pest-alerts',          protect, requireAdmin, getPestAlerts);
router.post('/pest-alerts',         protect, requireAdmin, addPestAlert);
router.delete('/pest-alerts/:id',   protect, requireAdmin, deletePestAlert);

// Farming Tips
router.get('/farming-tips',         protect, requireAdmin, getFarmingTips);
router.post('/farming-tips',        protect, requireAdmin, addFarmingTip);
router.delete('/farming-tips/:id',  protect, requireAdmin, deleteFarmingTip);

// Announcements
router.get('/announcements',        protect, requireAdmin, getAnnouncements);
router.post('/announcements',       protect, requireAdmin, addAnnouncement);
router.delete('/announcements/:id', protect, requireAdmin, deleteAnnouncement);

module.exports = router;