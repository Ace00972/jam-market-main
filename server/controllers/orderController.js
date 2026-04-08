// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/orderController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const TAX_RATE = 0.15; // 15% GCT (Jamaica standard)

const placeOrder = async (req, res) => {
  try {
    const { product_id, quantity, payment_method } = req.body;

    // Get product with farmer payment info
    const [[product]] = await pool.query(
      `SELECT p.*, fpi.bank_name, fpi.paypal_email, fpi.cashapp_tag, fpi.other_payment
       FROM products p
       LEFT JOIN farmer_payment_info fpi ON fpi.farmer_id = p.farmer_id
       WHERE p.id = ?`,
      [product_id]
    );

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // ── CHECK SOLD OUT ────────────────────────
    if (product.sold_out || product.quantity <= 0)
      return res.status(400).json({ message: 'This product is currently sold out' });

    if (product.quantity < quantity)
      return res.status(400).json({ message: 'Not enough stock available' });

    // ── CHECK FARMER PAYMENT INFO ─────────────
    const hasPaymentInfo = product.bank_name || product.paypal_email ||
                           product.cashapp_tag || product.other_payment;

    if (!hasPaymentInfo)
      return res.status(400).json({
        message: 'This farmer has not set up payment information yet. Please contact them directly or try again later.'
      });

    // ── CHECK PAYMENT METHOD AVAILABILITY ─────
    if (payment_method === 'bank_transfer' && !product.bank_name)
      return res.status(400).json({
        message: 'Bank transfer is not available for this product. Please choose another payment method.'
      });

    if (payment_method === 'paypal' && !product.paypal_email)
      return res.status(400).json({
        message: 'PayPal is not available for this product. Please choose another payment method.'
      });

    // ── CALCULATE PRICE ───────────────────────
    let unit_price = parseFloat(product.price);
    let price_type = 'retail';
    if (product.wholesale_price && product.wholesale_min_quantity && quantity >= product.wholesale_min_quantity) {
      unit_price = parseFloat(product.wholesale_price);
      price_type = 'wholesale';
    }

    const subtotal     = unit_price * quantity;
    const shipping_fee = product.delivery_type === 'own' ? (parseFloat(product.shipping_fee) || 0) : 0;
    const tax_amount   = (subtotal + shipping_fee) * TAX_RATE;
    const total_price  = subtotal + shipping_fee + tax_amount;

    const payment_status = 'unpaid';
    const order_status   = payment_method === 'cash_on_delivery' ? 'confirmed' : 'pending';
    const transaction_id = `${(payment_method || 'unknown').toUpperCase()}_${Date.now()}_${product_id}`;

    const [result] = await pool.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_price, status, payment_method, payment_status, transaction_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, product_id, quantity, total_price, order_status, payment_method || 'pending', payment_status, transaction_id]
    );

    // ── UPDATE STOCK ──────────────────────────
    const newQuantity = product.quantity - quantity;
    const isSoldOut   = newQuantity <= 0 ? 1 : 0;

    await pool.query(
      'UPDATE products SET quantity = ?, sold_out = ? WHERE id = ?',
      [newQuantity, isSoldOut, product_id]
    );

    // ── SOLD OUT NOTIFICATION ─────────────────
    // If product is now sold out, mark a special notification for farmer
    if (isSoldOut) {
      // Insert a system message to farmer about sold out product
      await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message, is_read)
         VALUES (?, ?, ?, 0)`,
        [
          req.user.id,
          product.farmer_id,
          `🚨 SOLD OUT ALERT: Your product "${product.name}" is now out of stock! Please update the quantity to restock it.`,
        ]
      );
    }

    // ── BANK DETAILS ──────────────────────────
    const bank_details = payment_method === 'bank_transfer' ? {
      bank_name:      product.bank_name,
      account_name:   product.account_name,
      account_number: product.account_number,
      bank_branch:    product.bank_branch,
      reference:      `ORDER-${result.insertId}`,
    } : null;

    res.status(201).json({
      order: {
        id: result.insertId, subtotal, shipping_fee,
        tax_amount, tax_rate: TAX_RATE, total_price,
        unit_price, price_type, status: order_status, payment_status,
      },
      payment: { transaction_id },
      delivery_type:    product.delivery_type,
      shipping_company: product.shipping_company,
      bank_details,
      sold_out: isSoldOut === 1,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'farmer') {
      query = `SELECT o.*, p.name AS product_name, p.delivery_type, p.shipping_company,
               u.name AS customer_name
               FROM orders o JOIN products p ON o.product_id = p.id
               JOIN users u ON o.customer_id = u.id
               WHERE p.farmer_id = ? ORDER BY o.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT o.*, p.name AS product_name, p.delivery_type, p.shipping_company,
               u.name AS farmer_name
               FROM orders o JOIN products p ON o.product_id = p.id
               JOIN users u ON p.farmer_id = u.id
               WHERE o.customer_id = ? ORDER BY o.created_at DESC`;
      params = [req.user.id];
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const [result] = await pool.query(
      `UPDATE orders o JOIN products p ON o.product_id = p.id
       SET o.status = ? WHERE o.id = ? AND p.farmer_id = ?`,
      [status, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Order not found or not yours' });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPrice = async (req, res) => {
  try {
    const { product_id, quantity } = req.query;

    const [[product]] = await pool.query(
      `SELECT p.*, fpi.bank_name, fpi.paypal_email, fpi.cashapp_tag, fpi.other_payment
       FROM products p
       LEFT JOIN farmer_payment_info fpi ON fpi.farmer_id = p.farmer_id
       WHERE p.id = ?`,
      [product_id]
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let unit_price = parseFloat(product.price);
    let price_type = 'retail';
    if (product.wholesale_price && product.wholesale_min_quantity && quantity >= product.wholesale_min_quantity) {
      unit_price = parseFloat(product.wholesale_price);
      price_type = 'wholesale';
    }

    const subtotal     = unit_price * quantity;
    const shipping_fee = product.delivery_type === 'own' ? (parseFloat(product.shipping_fee) || 0) : 0;
    const tax_amount   = (subtotal + shipping_fee) * TAX_RATE;
    const total_price  = subtotal + shipping_fee + tax_amount;

    // Available payment methods based on farmer's setup
    const available_payments = [];
    if (product.paypal_email)  available_payments.push('paypal');
    if (product.bank_name)     available_payments.push('bank_transfer');
    available_payments.push('cash_on_delivery'); // Always available

    res.json({
      unit_price, price_type, subtotal, shipping_fee,
      tax_amount, tax_rate: TAX_RATE, total_price,
      retail_price: product.price,
      wholesale_price: product.wholesale_price,
      wholesale_min_quantity: product.wholesale_min_quantity,
      delivery_type: product.delivery_type,
      shipping_company: product.shipping_company,
      sold_out: product.sold_out || product.quantity <= 0,
      available_payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'customer') {
      // Restore stock when order cancelled
      const [[order]] = await pool.query(
        'SELECT * FROM orders WHERE id=? AND customer_id=? AND status="pending"',
        [req.params.id, req.user.id]
      );
      if (order) {
        await pool.query(
          'UPDATE products SET quantity = quantity + ?, sold_out = 0 WHERE id = ?',
          [order.quantity, order.product_id]
        );
      }
      [result] = await pool.query(
        'DELETE FROM orders WHERE id=? AND customer_id=? AND status="pending"',
        [req.params.id, req.user.id]
      );
    } else if (req.user.role === 'farmer') {
      [result] = await pool.query(
        `DELETE o FROM orders o JOIN products p ON o.product_id = p.id
         WHERE o.id=? AND p.farmer_id=?`,
        [req.params.id, req.user.id]
      );
    }
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Order not found or cannot be cancelled' });
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── UNREAD ORDER COUNT ────────────────────────
const getUnreadOrderCount = async (req, res) => {
  try {
    const [[result]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE p.farmer_id = ? AND o.is_read = 0`,
      [req.user.id]
    );
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── MARK ALL ORDERS AS READ ───────────────────
const markOrdersAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE orders o JOIN products p ON o.product_id = p.id
       SET o.is_read = 1 WHERE p.farmer_id = ? AND o.is_read = 0`,
      [req.user.id]
    );
    res.json({ message: 'Orders marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeOrder, getMyOrders, updateOrderStatus, getPrice, cancelOrder, getUnreadOrderCount, markOrdersAsRead };