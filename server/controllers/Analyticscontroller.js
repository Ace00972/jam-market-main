// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/analyticsController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

// ── FARMER SALES SUMMARY ──────────────────────
const getFarmerAnalytics = async (req, res) => {
  try {
    // Total revenue
    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(o.total_price), 0) AS total_revenue,
              COUNT(o.id) AS total_orders,
              COALESCE(SUM(o.quantity), 0) AS total_units_sold
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE p.farmer_id = ? AND o.status != 'cancelled'`,
      [req.user.id]
    );

    // Sales by product
    const [byProduct] = await pool.query(
      `SELECT p.name, SUM(o.quantity) AS units_sold,
              SUM(o.total_price) AS revenue
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE p.farmer_id = ? AND o.status != 'cancelled'
       GROUP BY p.id, p.name
       ORDER BY revenue DESC LIMIT 10`,
      [req.user.id]
    );

    // Sales by month (last 6 months)
    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, '%b %Y') AS month,
              DATE_FORMAT(o.created_at, '%Y-%m') AS month_key,
              SUM(o.total_price) AS revenue,
              COUNT(o.id) AS orders
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE p.farmer_id = ?
         AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         AND o.status != 'cancelled'
       GROUP BY month_key, month
       ORDER BY month_key ASC`,
      [req.user.id]
    );

    // Orders by status
    const [byStatus] = await pool.query(
      `SELECT o.status, COUNT(*) AS count
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE p.farmer_id = ?
       GROUP BY o.status`,
      [req.user.id]
    );

    // Active products count
    const [[productCount]] = await pool.query(
      'SELECT COUNT(*) AS count FROM products WHERE farmer_id = ?',
      [req.user.id]
    );

    res.json({
      summary: {
        total_revenue: parseFloat(revenue.total_revenue),
        total_orders: revenue.total_orders,
        total_units_sold: revenue.total_units_sold,
        active_products: productCount.count,
      },
      by_product: byProduct,
      by_month: byMonth,
      by_status: byStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PRODUCE VOLUME BY AREA ────────────────────
const getProduceByArea = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.location, p.name AS product_name,
              SUM(o.quantity) AS total_sold,
              COUNT(DISTINCT p.farmer_id) AS farmers,
              AVG(p.price) AS avg_price
       FROM products p
       LEFT JOIN orders o ON o.product_id = p.id AND o.status != 'cancelled'
       WHERE p.location IS NOT NULL
       GROUP BY p.location, p.name
       ORDER BY total_sold DESC`
    );

    // Group by location
    const byLocation = {};
    rows.forEach(r => {
      if (!byLocation[r.location]) {
        byLocation[r.location] = { location: r.location, products: [], total_sold: 0, farmers: r.farmers };
      }
      byLocation[r.location].products.push({
        name: r.product_name,
        total_sold: r.total_sold || 0,
        avg_price: parseFloat(r.avg_price || 0),
      });
      byLocation[r.location].total_sold += r.total_sold || 0;
    });

    res.json(Object.values(byLocation).sort((a, b) => b.total_sold - a.total_sold));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SMART PRICE SUGGESTION ────────────────────
const getPriceSuggestion = async (req, res) => {
  try {
    const { product_name, location } = req.query;
    if (!product_name) return res.status(400).json({ message: 'product_name required' });

    // Get historical prices from price_history table
    const [history] = await pool.query(
      `SELECT price, location, recorded_at FROM price_history
       WHERE product_name LIKE ? ORDER BY recorded_at DESC LIMIT 50`,
      [`%${product_name}%`]
    );

    // Get current market prices from products table
    const [market] = await pool.query(
      `SELECT p.price, p.location, p.name, u.name AS farmer_name
       FROM products p JOIN users u ON p.farmer_id = u.id
       WHERE p.name LIKE ?
       ORDER BY p.created_at DESC LIMIT 20`,
      [`%${product_name}%`]
    );

    if (market.length === 0 && history.length === 0) {
      return res.json({
        suggested_price: null,
        message: 'No price data available for this product yet',
        market_prices: [],
        history: [],
      });
    }

    const allPrices = [
      ...market.map(m => parseFloat(m.price)),
      ...history.map(h => parseFloat(h.price)),
    ];

    const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);

    // Location-specific average
    let locationAvg = null;
    if (location) {
      const locationPrices = [
        ...market.filter(m => m.location?.toLowerCase().includes(location.toLowerCase())).map(m => parseFloat(m.price)),
        ...history.filter(h => h.location?.toLowerCase().includes(location.toLowerCase())).map(h => parseFloat(h.price)),
      ];
      if (locationPrices.length > 0) {
        locationAvg = locationPrices.reduce((a, b) => a + b, 0) / locationPrices.length;
      }
    }

    res.json({
      suggested_price: Math.round(locationAvg || avg),
      market_average: Math.round(avg),
      location_average: locationAvg ? Math.round(locationAvg) : null,
      min_price: Math.round(min),
      max_price: Math.round(max),
      data_points: allPrices.length,
      market_prices: market.slice(0, 10),
      price_chart: history.slice(0, 12).reverse(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── RECORD PRICE HISTORY ──────────────────────
const recordPrice = async (req, res) => {
  try {
    const { product_name, price, location } = req.body;
    if (!product_name || !price) return res.status(400).json({ message: 'product_name and price required' });

    await pool.query(
      'INSERT INTO price_history (product_name, price, location, farmer_id) VALUES (?,?,?,?)',
      [product_name, price, location || null, req.user.id]
    );

    res.status(201).json({ message: 'Price recorded' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getFarmerAnalytics, getProduceByArea, getPriceSuggestion, recordPrice };