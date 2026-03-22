// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/auth.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const { registerRules, loginRules, validate } = require('../middleware/validate');

const router = Router();
router.post('/register', registerRules, validate, register);
router.post('/login',    loginRules,    validate, login);

module.exports = router;