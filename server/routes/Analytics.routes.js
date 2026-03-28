// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/analytics.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { getFarmerAnalytics, getProduceByArea, getPriceSuggestion, recordPrice } = require('../controllers/Analyticscontroller');

const router = Router();
router.get('/farmer',      protect, requireRole('farmer'), getFarmerAnalytics);
router.get('/produce',     getProduceByArea);
router.get('/price-suggest', protect, getPriceSuggestion);
router.post('/price-record', protect, requireRole('farmer'), recordPrice);

module.exports = router;