// ═══════════════════════════════════════════════
//  JAM MARKET — server/routes/product.routes.js
// ═══════════════════════════════════════════════
const { Router } = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { productRules, validate } = require('../middleware/validate');
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = Router();
router.get('/',       getAllProducts);
router.post('/',      protect, requireRole('farmer'), productRules, validate, createProduct);
router.put('/:id',    protect, requireRole('farmer'), productRules, validate, updateProduct);
router.delete('/:id', protect, requireRole('farmer'), deleteProduct);

module.exports = router;