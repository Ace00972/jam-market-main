// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/productController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const getAllProducts = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS farmer_name
       FROM products p
       JOIN users u ON p.farmer_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, wholesale_price, wholesale_min_quantity, quantity, location } = req.body;

    const [result] = await pool.query(
      `INSERT INTO products 
       (farmer_id, name, description, price, wholesale_price, wholesale_min_quantity, quantity, location) 
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, name, description || '', price, wholesale_price || null, wholesale_min_quantity || 10, quantity || 1, location || null]
    );
    res.status(201).json({ id: result.insertId, name, price, wholesale_price, description, location, farmer_id: req.user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, wholesale_price, wholesale_min_quantity, quantity, location } = req.body;
    const [result] = await pool.query(
      `UPDATE products 
       SET name=?, description=?, price=?, wholesale_price=?, wholesale_min_quantity=?, quantity=?, location=? 
       WHERE id=? AND farmer_id=?`,
      [name, description, price, wholesale_price || null, wholesale_min_quantity || 10, quantity, location, req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Product not found or not yours' });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM products WHERE id=? AND farmer_id=?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Product not found or not yours' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllProducts, createProduct, updateProduct, deleteProduct };