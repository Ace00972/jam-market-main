// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/order.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { placeOrder, getMyOrders, updateOrderStatus } = require('../controllers/orderController');

const router = Router();
router.post('/',            protect, requireRole('customer'), placeOrder);
router.get('/mine',         protect, getMyOrders);
router.patch('/:id/status', protect, requireRole('farmer'),  updateOrderStatus);

module.exports = router;