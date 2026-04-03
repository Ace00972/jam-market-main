// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/authController.js
// ═══════════════════════════════════════════════
const pool   = require('../db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'All fields required' });

    // Service provider cannot self register
    const validRoles = ['farmer', 'customer'];
    if (!validRoles.includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, location) VALUES (?,?,?,?,?)',
      [name, email, hash, role, location || null]
    );

    res.status(201).json({ id: result.insertId, name, email, role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        location: user.location,
        is_admin: user.is_admin || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login };