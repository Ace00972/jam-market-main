// ═════════════════════════════════
//  JAM MARKET — server/index.js  
// ═════════════════════════════════
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
require('dotenv').config();

const authRoutes        = require('./routes/auth.routes');
const productRoutes     = require('./routes/product.routes');
const orderRoutes       = require('./routes/order.routes');
const messageRoutes     = require('./routes/message.routes');
const paymentRoutes     = require('./routes/payment.routes');
const paymentInfoRoutes = require('./routes/paymentInfo.routes');
const analyticsRoutes   = require('./routes/analytics.routes');
const agriRoutes        = require('./routes/agri.routes');
const adminRoutes       = require('./routes/admin.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── SECURITY MIDDLEWARE ───────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// ── RATE LIMITING ─────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again later' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// ── ROUTES ────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/messages',     messageRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/payment-info', paymentInfoRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/agri',         agriRoutes);
app.use('/api/admin',        adminRoutes);

// ── GLOBAL ERROR HANDLER ──────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Jam Market API running on http://localhost:${PORT}`);
});