// ═══════════════════════════════════════════════
//  JAM MARKET — server/middleware/validate.js
// ═══════════════════════════════════════════════
const { validationResult, body } = require('express-validator');

// Run this after validation rules to catch errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// Auth validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['farmer', 'customer', 'service_provider']).withMessage('Invalid role'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Product validation rules
const productRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid retail price is required'),
  body('wholesale_price').optional().isFloat({ min: 0 }).withMessage('Valid wholesale price required'),
  body('wholesale_min_quantity').optional().isInt({ min: 1 }).withMessage('Valid minimum quantity required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Valid quantity required'),
  body('delivery_type').optional().isIn(['own', 'third_party']).withMessage('Invalid delivery type'),
  body('shipping_company').optional({ nullable: true }).isString().withMessage('Invalid shipping company'),
  body('shipping_fee').optional().isFloat({ min: 0 }).withMessage('Valid shipping fee required'),
];

// Order validation rules
const orderRules = [
  body('product_id').isInt().withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('payment_method')
    .isIn(['paypal', 'wipay', 'bank_transfer', 'cash_on_delivery', 'cash'])
    .withMessage('Invalid payment method'),
];

// Message validation rules
const messageRules = [
  body('receiver_id').isInt().withMessage('Valid receiver ID required'),
  body('message').trim().notEmpty().withMessage('Message cannot be empty'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  productRules,
  orderRules,
  messageRules,
};