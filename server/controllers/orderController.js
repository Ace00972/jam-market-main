// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/orderController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const TAX_RATE = 0; // set to 0.15 for 15% GCT when ready

const placeOrder = async (req, res) => {
  try {
    const { product_id, quantity, payment_method } = req.body;

    const [[product]] = await pool.query('SELECT * FROM products WHERE id=?', [product_id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.quantity < quantity) return res.status(400).json({ message: 'Not enough stock' });

    let unit_price = parseFloat(product.price);
    let price_type = 'retail';
    if (product.wholesale_price && product.wholesale_min_quantity && quantity >= product.wholesale_min_quantity) {
      unit_price = parseFloat(product.wholesale_price);
      price_type = 'wholesale';
    }

    const subtotal     = unit_price * quantity;
    const shipping_fee = product.delivery_type === 'own' ? (parseFloat(product.shipping_fee) || 0) : 0;
    const tax_amount   = subtotal * TAX_RATE;
    const total_price  = subtotal + shipping_fee + tax_amount;

    const [result] = await pool.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_price, status, payment_method, payment_status)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, product_id, quantity, total_price, 'pending', payment_method || 'pending', 'unpaid']
    );

    await pool.query('UPDATE products SET quantity = quantity - ? WHERE id=?', [quantity, product_id]);

    res.status(201).json({
      order: {
        id: result.insertId, subtotal, shipping_fee, tax_amount, total_price,
        unit_price, price_type, status: 'pending', payment_status: 'unpaid',
      },
      payment: {
        transaction_id: `TXN-${Date.now()}-${result.insertId}`,
      },
      delivery_type: product.delivery_type,
      shipping_company: product.shipping_company,
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

    const [[product]] = await pool.query('SELECT * FROM products WHERE id=?', [product_id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let unit_price = parseFloat(product.price);
    let price_type = 'retail';
    if (product.wholesale_price && product.wholesale_min_quantity && quantity >= product.wholesale_min_quantity) {
      unit_price = parseFloat(product.wholesale_price);
      price_type = 'wholesale';
    }

    const subtotal     = unit_price * quantity;
    const shipping_fee = product.delivery_type === 'own' ? (parseFloat(product.shipping_fee) || 0) : 0;
    const tax_amount   = subtotal * TAX_RATE;
    const total_price  = subtotal + shipping_fee + tax_amount;

    res.json({
      unit_price, price_type, subtotal, shipping_fee,
      tax_amount, tax_rate: TAX_RATE, total_price,
      retail_price: product.price,
      wholesale_price: product.wholesale_price,
      wholesale_min_quantity: product.wholesale_min_quantity,
      delivery_type: product.delivery_type,
      shipping_company: product.shipping_company,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cancelOrder = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'customer') {
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

module.exports = { placeOrder, getMyOrders, updateOrderStatus, getPrice, cancelOrder };