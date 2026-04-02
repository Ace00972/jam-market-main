// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/paymentInfo.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { getPaymentInfo, savePaymentInfo } = require('../controllers/paymentinfoController');

const router = Router();
router.get('/my',          protect, requireRole('farmer'), getPaymentInfo);
router.get('/:farmerId',   getPaymentInfo);
router.post('/',           protect, requireRole('farmer'), savePaymentInfo);

module.exports = router;