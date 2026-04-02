// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/order.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { orderRules, validate } = require('../middleware/validate');
const {
  placeOrder,
  getMyOrders,
  updateOrderStatus,
  getPrice,
  cancelOrder,
  getUnreadOrderCount,
  markOrdersAsRead,
} = require('../controllers/orderController');

const router = Router();
router.get('/price',         protect, getPrice);
router.get('/unread-count',  protect, requireRole('farmer'), getUnreadOrderCount);
router.patch('/mark-read',   protect, requireRole('farmer'), markOrdersAsRead);
router.post('/',             protect, requireRole('customer'), orderRules, validate, placeOrder);
router.get('/mine',          protect, getMyOrders);
router.patch('/:id/status',  protect, requireRole('farmer'), updateOrderStatus);
router.delete('/:id',        protect, cancelOrder);

module.exports = router;