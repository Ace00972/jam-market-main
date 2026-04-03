// ═══════════════════════════════════════════════
//  JAM MARKET — server/controllers/agriController.js
// ═══════════════════════════════════════════════
const pool = require('../db');

const WEATHER_KEY = process.env.WEATHER_API_KEY;
const JAMAICA_PARISHES = [
  'Kingston', 'St. Andrew', 'St. Thomas', 'Portland',
  'St. Mary', 'St. Ann', 'Trelawny', 'St. James',
  'Hanover', 'Westmoreland', 'St. Elizabeth', 'Manchester',
  'Clarendon', 'St. Catherine'
];

// ── WEATHER ───────────────────────────────────
const getWeather = async (req, res) => {
  try {
    const location = req.query.location || 'Kingston,JM';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_KEY}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ message: data.message || 'Weather data unavailable' });
    }

    // Farming advice based on weather
    const temp = data.main.temp;
    const condition = data.weather[0].main.toLowerCase();
    let farmingAdvice = '';

    if (condition.includes('rain')) {
      farmingAdvice = '🌧️ Good day for transplanting seedlings. Avoid spraying pesticides as rain will wash them off.';
    } else if (condition.includes('clear') && temp > 32) {
      farmingAdvice = '☀️ Hot and dry — water crops in the early morning or late evening. Check soil moisture frequently.';
    } else if (condition.includes('cloud')) {
      farmingAdvice = '⛅ Good conditions for most farming activities. Ideal for applying fertilizers.';
    } else if (condition.includes('storm') || condition.includes('thunder')) {
      farmingAdvice = '⛈️ Stay safe! Secure any young plants or seedlings. Avoid working in fields during lightning.';
    } else {
      farmingAdvice = '🌱 Good farming conditions today. Check your crops for any signs of pest activity.';
    }

    res.json({
      location: data.name,
      country: data.sys.country,
      temperature: Math.round(temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed,
      farming_advice: farmingAdvice,
      parishes: JAMAICA_PARISHES,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FARMING TIPS ──────────────────────────────
const getFarmingTips = async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM farming_tips';
    const params = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);

    // Get unique categories
    const [categories] = await pool.query('SELECT DISTINCT category FROM farming_tips ORDER BY category');

    res.json({
      tips: rows,
      categories: categories.map(c => c.category),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PEST ALERTS ───────────────────────────────
const getPestAlerts = async (req, res) => {
  try {
    const { region } = req.query;
    let query = 'SELECT * FROM pest_alerts';
    const params = [];

    if (region) {
      query += ' WHERE region LIKE ?';
      params.push(`%${region}%`);
    }

    query += ' ORDER BY severity DESC, created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FARMERS MAP DATA ──────────────────────────
const getFarmersMap = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.location,
              COUNT(p.id) AS product_count,
              GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS products
       FROM users u
       JOIN products p ON p.farmer_id = u.id
       WHERE u.role = 'farmer' AND u.location IS NOT NULL
       GROUP BY u.id, u.name, u.location
       ORDER BY product_count DESC`
    );

    // Jamaica parish coordinates
    const parishCoords = {
      'Kingston':      { lat: 17.9970, lng: -76.7936 },
      'St. Andrew':    { lat: 18.0747, lng: -76.7980 },
      'St. Thomas':    { lat: 17.9274, lng: -76.3637 },
      'Portland':      { lat: 18.1734, lng: -76.4519 },
      'St. Mary':      { lat: 18.3122, lng: -76.9006 },
      'St. Ann':       { lat: 18.4397, lng: -77.2010 },
      'Trelawny':      { lat: 18.3519, lng: -77.6074 },
      'St. James':     { lat: 18.4762, lng: -77.9213 },
      'Hanover':       { lat: 18.4079, lng: -78.1327 },
      'Westmoreland':  { lat: 18.2286, lng: -78.1357 },
      'St. Elizabeth': { lat: 18.0469, lng: -77.7419 },
      'Manchester':    { lat: 18.0444, lng: -77.5042 },
      'Clarendon':     { lat: 17.9549, lng: -77.2399 },
      'St. Catherine': { lat: 17.9905, lng: -77.1041 },
      'Mandeville':    { lat: 18.0444, lng: -77.5042 },
    };

    const farmers = rows.map(f => {
      // Find matching parish
      const coordKey = Object.keys(parishCoords).find(k =>
        f.location?.toLowerCase().includes(k.toLowerCase())
      );
      const coords = coordKey ? parishCoords[coordKey] : { lat: 18.1096, lng: -77.2975 };

      // Add small random offset so markers don't overlap
      return {
        id: f.id,
        name: f.name,
        location: f.location,
        product_count: f.product_count,
        products: f.products,
        lat: coords.lat + (Math.random() - 0.5) * 0.05,
        lng: coords.lng + (Math.random() - 0.5) * 0.05,
      };
    });

    res.json(farmers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getWeather, getFarmingTips, getPestAlerts, getFarmersMap };