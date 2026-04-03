// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/admin.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const { getAllUsers, updateUserRole } = require('../controllers/adminController');
const pool = require('../db');

// ── ADMIN MIDDLEWARE ──────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const [[user]] = await pool.query(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user || !user.is_admin)
      return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const router = Router();
router.get('/users',             protect, requireAdmin, getAllUsers);
router.patch('/users/:id/role',  protect, requireAdmin, updateUserRole);

module.exports = router;