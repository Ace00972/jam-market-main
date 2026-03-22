// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/payment.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect } = require('../middleware/auth');
const {
  initiateWiPay,
  initiatePayPal,
  paymentCallback,
  simulatePayment,
} = require('../controllers/paymentController');

const router = Router();

router.post('/wipay',    protect, initiateWiPay);
router.post('/paypal',   protect, initiatePayPal);
router.post('/callback', paymentCallback);
router.post('/simulate', protect, simulatePayment);

module.exports = router;