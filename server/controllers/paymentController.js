// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/paymentController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

// ── WIPAY SANDBOX ─────────────────────────────
const initiateWiPay = async (req, res) => {
  try {
    const { order_id } = req.body;
    const [[order]] = await pool.query(
      `SELECT o.*, p.name AS product_name, p.price, p.wholesale_price, p.wholesale_min_quantity
       FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.id = ? AND o.customer_id = ?`,
      [order_id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const wipayData = {
      account_number: process.env.WIPAY_ACCOUNT || '1000000',
      avs: '0',
      card_number: '',
      currency: 'JMD',
      environment: 'sandbox',
      fee_structure: 'merchant_absorb',
      method: 'credit_card',
      order_id: order.id.toString(),
      origin: process.env.WIPAY_ORIGIN || 'JAM_MARKET',
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      total: order.total_price.toString(),
    };

    res.json({ gateway: 'wipay', url: 'https://sandbox.wipayfinancial.com/v1/gateway', data: wipayData, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PAYPAL SANDBOX ────────────────────────────
const initiatePayPal = async (req, res) => {
  try {
    const { order_id } = req.body;
    const [[order]] = await pool.query(
      `SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.id = ? AND o.customer_id = ?`,
      [order_id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const paypalUrl = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${
      process.env.PAYPAL_SANDBOX_EMAIL || 'sb-seller@jammarket.com'
    }&item_name=${encodeURIComponent(order.product_name)}&amount=${
      order.total_price
    }&currency_code=USD&return=${encodeURIComponent(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`
    )}&cancel_return=${encodeURIComponent(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`
    )}&custom=${order.id}`;

    res.json({ gateway: 'paypal', url: paypalUrl, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── BANK TRANSFER ─────────────────────────────
const initiateBankTransfer = async (req, res) => {
  try {
    const { order_id } = req.body;
    const [[order]] = await pool.query(
      `SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.id = ? AND o.customer_id = ?`,
      [order_id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const transaction_id = `BANK_${Date.now()}_${order.id}`;

    await pool.query(
      'UPDATE orders SET payment_status=?, payment_method=?, transaction_id=?, status=? WHERE id=?',
      ['pending', 'bank_transfer', transaction_id, 'pending', order_id]
    );

    res.json({
      message: 'Bank transfer initiated',
      transaction_id,
      order_id,
      gateway: 'bank_transfer',
      bank_details: {
        bank_name: process.env.BANK_NAME || 'National Commercial Bank (NCB)',
        account_name: process.env.BANK_ACCOUNT_NAME || 'Jam Market Ltd',
        account_number: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
        routing_number: process.env.BANK_ROUTING || '021000021',
        reference: `ORDER-${order.id}`,
        amount: order.total_price,
        currency: 'JMD',
      },
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── CASH ON DELIVERY ──────────────────────────
const initiateCashOnDelivery = async (req, res) => {
  try {
    const { order_id } = req.body;
    const [[order]] = await pool.query(
      `SELECT o.*, p.name AS product_name FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.id = ? AND o.customer_id = ?`,
      [order_id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const transaction_id = `COD_${Date.now()}_${order.id}`;

    await pool.query(
      'UPDATE orders SET payment_status=?, payment_method=?, transaction_id=?, status=? WHERE id=?',
      ['unpaid', 'cash_on_delivery', transaction_id, 'confirmed', order_id]
    );

    res.json({
      message: 'Cash on delivery confirmed',
      transaction_id,
      order_id,
      gateway: 'cash_on_delivery',
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PAYMENT CALLBACK (both gateways) ─────────
const paymentCallback = async (req, res) => {
  try {
    const { order_id, transaction_id, status, gateway } = req.body;
    if (status === 'success' || status === 'APPROVED') {
      await pool.query(
        'UPDATE orders SET payment_status=?, payment_method=?, transaction_id=?, status=? WHERE id=?',
        ['paid', gateway, transaction_id || 'SANDBOX_' + Date.now(), 'confirmed', order_id]
      );
      res.json({ message: 'Payment confirmed', order_id });
    } else {
      await pool.query('UPDATE orders SET payment_status=? WHERE id=?', ['failed', order_id]);
      res.json({ message: 'Payment failed', order_id });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SIMULATE PAYMENT (for testing) ───────────
const simulatePayment = async (req, res) => {
  try {
    const { order_id, gateway } = req.body;
    const [[order]] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND customer_id = ?',
      [order_id, req.user.id]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const transaction_id = `${gateway.toUpperCase()}_SANDBOX_${Date.now()}`;
    await pool.query(
      'UPDATE orders SET payment_status=?, payment_method=?, transaction_id=?, status=? WHERE id=?',
      ['paid', gateway, transaction_id, 'pending', order_id]
    );

    res.json({ message: 'Payment simulated successfully', transaction_id, order_id, gateway });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { initiateWiPay, initiatePayPal, initiateBankTransfer, initiateCashOnDelivery, paymentCallback, simulatePayment };