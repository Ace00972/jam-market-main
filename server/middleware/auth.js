// ══════════════════════════════════════════════
//  JAM MARKET — server/middleware/auth.js
// ══════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Usage: requireRole('farmer')  or  requireRole(['farmer','customer'])
const requireRole = (roles) => (req, res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user.role))
    return res.status(403).json({ message: 'Access forbidden' });
  next();
};

module.exports = { protect, requireRole };