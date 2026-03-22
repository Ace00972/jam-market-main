// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/orderController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const placeOrder = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) return res.status(400).json({ message: 'product_id and quantity required' });

    const [[product]] = await pool.query('SELECT * FROM products WHERE id=?', [product_id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.quantity < quantity) return res.status(400).json({ message: 'Not enough stock' });

    const total_price = parseFloat(product.price) * quantity;

    const [result] = await pool.query(
      'INSERT INTO orders (customer_id, product_id, quantity, total_price, status) VALUES (?,?,?,?,?)',
      [req.user.id, product_id, quantity, total_price, 'pending']
    );
    await pool.query('UPDATE products SET quantity = quantity - ? WHERE id=?', [quantity, product_id]);

    res.status(201).json({ id: result.insertId, total_price, status: 'pending' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'farmer') {
      query = `SELECT o.*, p.name AS product_name, u.name AS customer_name
               FROM orders o
               JOIN products p ON o.product_id = p.id
               JOIN users u ON o.customer_id = u.id
               WHERE p.farmer_id = ?
               ORDER BY o.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT o.*, p.name AS product_name, u.name AS farmer_name
               FROM orders o
               JOIN products p ON o.product_id = p.id
               JOIN users u ON p.farmer_id = u.id
               WHERE o.customer_id = ?
               ORDER BY o.created_at DESC`;
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
      `UPDATE orders o
       JOIN products p ON o.product_id = p.id
       SET o.status = ?
       WHERE o.id = ? AND p.farmer_id = ?`,
      [status, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Order not found or not yours' });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { placeOrder, getMyOrders, updateOrderStatus };