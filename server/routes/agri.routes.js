// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/agri.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { getWeather, getFarmingTips, getPestAlerts, getFarmersMap } = require('../controllers/agriController');

const router = Router();
router.get('/weather',      getWeather);
router.get('/tips',         getFarmingTips);
router.get('/pest-alerts',  getPestAlerts);
router.get('/farmers-map',  getFarmersMap);

module.exports = router;