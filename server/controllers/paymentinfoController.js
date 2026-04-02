// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/paymentInfoController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

// ── GET FARMER PAYMENT INFO ───────────────────
const getPaymentInfo = async (req, res) => {
  try {
    const farmerId = req.params.farmerId || req.user.id;
    const [[info]] = await pool.query(
      'SELECT * FROM farmer_payment_info WHERE farmer_id = ?',
      [farmerId]
    );
    res.json(info || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── SAVE FARMER PAYMENT INFO ──────────────────
const savePaymentInfo = async (req, res) => {
  try {
    const {
      bank_name, account_name, account_number,
      bank_branch, paypal_email, cashapp_tag, other_payment
    } = req.body;

    // Upsert — insert or update if exists
    await pool.query(
      `INSERT INTO farmer_payment_info
       (farmer_id, bank_name, account_name, account_number, bank_branch, paypal_email, cashapp_tag, other_payment)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         bank_name=VALUES(bank_name),
         account_name=VALUES(account_name),
         account_number=VALUES(account_number),
         bank_branch=VALUES(bank_branch),
         paypal_email=VALUES(paypal_email),
         cashapp_tag=VALUES(cashapp_tag),
         other_payment=VALUES(other_payment)`,
      [
        req.user.id, bank_name || null, account_name || null,
        account_number || null, bank_branch || null,
        paypal_email || null, cashapp_tag || null, other_payment || null
      ]
    );

    res.json({ message: 'Payment info saved successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPaymentInfo, savePaymentInfo };