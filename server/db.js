// ════════════════════════════════
//  JAM MARKET — server/db.js
// ════════════════════════════════
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'gondola.proxy.rlwy.net',
  port:               process.env.DB_PORT     || 26263, 
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || 'zRTMsmsDrhMVWZjHPZeVOZjgPFvQwECu',
  database:           process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit:    10,
});

module.exports = pool;