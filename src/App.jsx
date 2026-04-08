import './App.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE = 'https://jam-market-main-1.onrender.com/api';
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const SHIPPING_COMPANIES = [
  { value: 'knutsford', label: 'Knutsford Express', url: 'https://www.knutsfordexpress.com/courier/our-courier-service/' },
  { value: 'zipmail',   label: 'Zipmail',            url: 'https://jamaicapost.gov.jm/products/zipmail/' },
  { value: 'tara',      label: 'Tara Courier',       url: 'https://taracan.com/' },
  { value: 'jamex',     label: 'JAMEX',              url: 'https://www.jamex.com.jm' },
];

function getShippingCompany(key) {
  return SHIPPING_COMPANIES.find(c => c.value === key) || null;
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('jm_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── WEEK 4 COMPONENTS ─────────────────────────

// Weather Widget
function WeatherWidget({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(location || 'Kingston');

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/agri/weather?location=${encodeURIComponent(selectedLocation + ',JM')}`);
      setWeather(data);
    } catch (err) {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  const parishes = [
    'Kingston','St. Andrew','St. Thomas','Portland','St. Mary','St. Ann',
    'Trelawny','St. James','Hanover','Westmoreland','St. Elizabeth',
    'Manchester','Clarendon','St. Catherine'
  ];

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <h3>🌤️ Weather for Farming</h3>
        <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
          {parishes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {loading && <p className="weather-loading">Loading weather…</p>}
      {weather && !loading && (
        <>
          <div className="weather-main">
            <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt={weather.condition} />
            <div className="weather-temp">
              <span className="temp-big">{weather.temperature}°C</span>
              <span className="temp-feels">Feels like {weather.feels_like}°C</span>
            </div>
            <div className="weather-details">
              <p>💧 Humidity: {weather.humidity}%</p>
              <p>💨 Wind: {weather.wind_speed} m/s</p>
              <p style={{ textTransform: 'capitalize' }}>☁️ {weather.condition}</p>
            </div>
          </div>
          <div className="weather-advice">
            <p>{weather.farming_advice}</p>
          </div>
        </>
      )}
      {!weather && !loading && (
        <p style={{ color: 'var(--muted-text)', textAlign: 'center' }}>Weather data unavailable for this location.</p>
      )}
    </div>
  );
}

// Analytics Dashboard (Farmer)
function AnalyticsDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('revenue');

  useEffect(() => {
    apiFetch('/analytics/farmer')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner" />
      <p>Loading your dashboard…</p>
    </div>
  );

  if (!data) return (
    <div className="dash-empty">
      <div className="dash-empty-icon">📊</div>
      <h3>No data yet</h3>
      <p>Start selling to see your analytics here!</p>
    </div>
  );

  const maxRevenue = Math.max(...(data.by_month.map(m => parseFloat(m.revenue)) || [1]), 1);
  const maxOrders  = Math.max(...(data.by_month.map(m => parseInt(m.orders)) || [1]), 1);

  const statusColors = {
    pending: '#f59e0b', confirmed: '#3b82f6',
    shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444'
  };

  return (
    <div className="dash-wrapper">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Performance Overview</h2>
          <p className="dash-subtitle">Welcome back, {user?.name} 👋</p>
        </div>
        <div className="dash-date">
          {new Date().toLocaleDateString('en-JM', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: 'linear-gradient(135deg, #1b4332, #2d6a4f)' }}>💰</div>
          <div className="dash-kpi-content">
            <span className="dash-kpi-label">Total Revenue</span>
            <span className="dash-kpi-value">J${data.summary.total_revenue.toLocaleString()}</span>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>📦</div>
          <div className="dash-kpi-content">
            <span className="dash-kpi-label">Total Orders</span>
            <span className="dash-kpi-value">{data.summary.total_orders}</span>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>🧺</div>
          <div className="dash-kpi-content">
            <span className="dash-kpi-label">Units Sold</span>
            <span className="dash-kpi-value">{data.summary.total_units_sold}</span>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}>🌱</div>
          <div className="dash-kpi-content">
            <span className="dash-kpi-label">Active Products</span>
            <span className="dash-kpi-value">{data.summary.active_products}</span>
          </div>
        </div>
      </div>

      <div className="dash-grid-2">
        {/* Chart */}
        {data.by_month.length > 0 && (
          <div className="dash-card dash-chart-card">
            <div className="dash-card-header">
              <h3>Growth Overview</h3>
              <div className="dash-chart-toggle">
                <button className={activeChart === 'revenue' ? 'active' : ''} onClick={() => setActiveChart('revenue')}>Revenue</button>
                <button className={activeChart === 'orders' ? 'active' : ''} onClick={() => setActiveChart('orders')}>Orders</button>
              </div>
            </div>
            <div className="dash-bar-chart">
              {data.by_month.map((m, i) => {
                const val = activeChart === 'revenue' ? parseFloat(m.revenue) : parseInt(m.orders);
                const max = activeChart === 'revenue' ? maxRevenue : maxOrders;
                const pct = Math.max(6, (val / max) * 100);
                return (
                  <div key={i} className="dash-bar-col">
                    <div className="dash-bar-track">
                      <div className="dash-bar" style={{ height: `${pct}%` }}>
                        <span className="dash-bar-tooltip">
                          {activeChart === 'revenue' ? `J$${val.toLocaleString()}` : `${val} orders`}
                        </span>
                      </div>
                    </div>
                    <span className="dash-bar-label">{m.month.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Status donut-style */}
        {data.by_status.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Orders by Status</h3>
            </div>
            <div className="dash-status-list">
              {data.by_status.map((s, i) => {
                const total = data.by_status.reduce((acc, x) => acc + parseInt(x.count), 0);
                const pct = Math.round((parseInt(s.count) / total) * 100);
                return (
                  <div key={i} className="dash-status-row">
                    <div className="dash-status-info">
                      <span className="dash-status-dot" style={{ background: statusColors[s.status] || '#999' }} />
                      <span className="dash-status-name">{s.status}</span>
                    </div>
                    <div className="dash-status-bar-track">
                      <div className="dash-status-bar-fill"
                        style={{ width: `${pct}%`, background: statusColors[s.status] || '#999' }} />
                    </div>
                    <span className="dash-status-count">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      {data.by_product.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>Top Products</h3>
            <span className="dash-card-sub">By revenue</span>
          </div>
          <div className="dash-products-table">
            <div className="dash-products-header">
              <span>#</span><span>Product</span><span>Units</span><span>Revenue</span>
            </div>
            {data.by_product.slice(0, 5).map((p, i) => (
              <div key={i} className="dash-products-row">
                <span className="dash-rank">{i + 1}</span>
                <span className="dash-product-name">{p.name}</span>
                <span className="dash-product-units">{p.units_sold || 0}</span>
                <span className="dash-product-rev">J${parseFloat(p.revenue || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Smart Price Tool
function SmartPriceTool({ userLocation }) {
  const [productName, setProductName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/analytics/price-suggest?product_name=${encodeURIComponent(productName)}&location=${encodeURIComponent(userLocation || '')}`);
      setResult(data);
    } catch (err) {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxPrice = result ? result.max_price : 1;

  return (
    <div className="smart-price-tool">
      <h3>💡 Smart Price Suggestion Tool</h3>
      <p style={{ color: 'var(--muted-text)', fontSize: 14, marginBottom: 16 }}>
        Enter a product name to get a price suggestion based on market data
      </p>
      <form onSubmit={handleSearch} className="price-search-form">
        <input
          placeholder="e.g. Yam, Tomato, Watermelon..."
          value={productName}
          onChange={e => setProductName(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : '🔍 Get Price'}
        </button>
      </form>

      {result && (
        <div className="price-result">
          {result.suggested_price ? (
            <>
              <div className="suggested-price-box">
                <span className="suggested-label">Suggested Price</span>
                <span className="suggested-value">J${result.suggested_price.toLocaleString()}</span>
                {result.location_average && (
                  <span className="suggested-note">Based on {userLocation} market data</span>
                )}
              </div>

              <div className="price-range">
                <div className="range-item">
                  <span>Market Average</span>
                  <strong>J${result.market_average?.toLocaleString()}</strong>
                </div>
                <div className="range-item">
                  <span>Min Price</span>
                  <strong>J${result.min_price?.toLocaleString()}</strong>
                </div>
                <div className="range-item">
                  <span>Max Price</span>
                  <strong>J${result.max_price?.toLocaleString()}</strong>
                </div>
                <div className="range-item">
                  <span>Data Points</span>
                  <strong>{result.data_points}</strong>
                </div>
              </div>

              {/* Price range bar */}
              <div className="price-bar-container">
                <div className="price-bar-track">
                  <div className="price-bar-fill" style={{
                    left: `${(result.min_price / maxPrice) * 100}%`,
                    width: `${((result.max_price - result.min_price) / maxPrice) * 100}%`
                  }} />
                  <div className="price-bar-marker" style={{
                    left: `${(result.suggested_price / maxPrice) * 100}%`
                  }} title={`Suggested: J$${result.suggested_price}`} />
                </div>
                <div className="price-bar-labels">
                  <span>J${result.min_price?.toLocaleString()}</span>
                  <span>J${result.max_price?.toLocaleString()}</span>
                </div>
              </div>

              {/* Current market listings */}
              {result.market_prices?.length > 0 && (
                <div className="market-listings">
                  <h4>Current Market Listings</h4>
                  {result.market_prices.slice(0, 5).map((p, i) => (
                    <div key={i} className="market-listing-row">
                      <span>{p.name}</span>
                      <span>{p.location || 'N/A'}</span>
                      <strong>J${parseFloat(p.price).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--muted-text)', textAlign: 'center', padding: 20 }}>
              {result.message || 'No price data found for this product yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Produce Volume by Area
function ProduceByArea() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/analytics/produce')
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 20 }}>Loading produce data…</p>;

  return (
    <div className="produce-by-area">
      <h3>🗺️ Produce Volume by Area</h3>
      {data.length === 0 ? (
        <p style={{ color: 'var(--muted-text)', textAlign: 'center' }}>No produce data available yet.</p>
      ) : (
        <div className="area-grid">
          {data.slice(0, 8).map((area, i) => (
            <div key={i} className="area-card">
              <div className="area-header">
                <span className="area-name">📍 {area.location}</span>
                <span className="area-farmers">{area.farmers} farmer{area.farmers !== 1 ? 's' : ''}</span>
              </div>
              <div className="area-products">
                {area.products.slice(0, 3).map((p, j) => (
                  <div key={j} className="area-product-row">
                    <span>{p.name}</span>
                    <span>{p.total_sold} sold</span>
                  </div>
                ))}
              </div>
              <div className="area-total">Total sold: <strong>{area.total_sold}</strong></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Farming Tips Page
function FarmingTipsPage() {
  const [tips, setTips] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedCategory ? `/agri/tips?category=${encodeURIComponent(selectedCategory)}` : '/agri/tips';
      const data = await apiFetch(url);
      setTips(data.tips);
      setCategories(data.categories);
    } catch (err) {
      setTips([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchTips(); }, [fetchTips]);

  const categoryIcons = {
    'Planting': '🌱',
    'Pest Control': '🐛',
    'Water Management': '💧',
    'Soil Health': '🌍',
    'Business': '💰',
    'Post-Harvest': '📦',
  };

  return (
    <div className="product-view">
      <h2>🌾 Farming Tips & Guides</h2>
      <div className="tips-categories">
        <button
          className={!selectedCategory ? 'category-btn active' : 'category-btn'}
          onClick={() => setSelectedCategory('')}>All</button>
        {categories.map(c => (
          <button key={c}
            className={selectedCategory === c ? 'category-btn active' : 'category-btn'}
            onClick={() => setSelectedCategory(c)}>
            {categoryIcons[c] || '📌'} {c}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 20 }}>Loading tips…</p>}
      <div className="tips-grid">
        {tips.map(tip => (
          <div key={tip.id} className={`tip-card ${expanded === tip.id ? 'expanded' : ''}`}
            onClick={() => setExpanded(expanded === tip.id ? null : tip.id)}>
            <div className="tip-header">
              <span className="tip-category">{categoryIcons[tip.category] || '📌'} {tip.category}</span>
              <span className="tip-toggle">{expanded === tip.id ? '▲' : '▼'}</span>
            </div>
            <h3 className="tip-title">{tip.title}</h3>
            {expanded === tip.id && (
              <p className="tip-content">{tip.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pest Alerts Page
function PestAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/agri/pest-alerts')
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const severityColor = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };
  const severityIcon  = { high: '🔴', medium: '🟡', low: '🟢' };

  return (
    <div className="product-view">
      <h2>⚠️ Pest & Disease Alerts</h2>
      <p style={{ color: 'var(--muted-text)', marginBottom: 24 }}>
        Stay informed about pest and disease outbreaks affecting crops across Jamaica.
      </p>
      {loading && <p style={{ textAlign: 'center' }}>Loading alerts…</p>}
      <div className="alerts-list">
        {alerts.map(alert => (
          <div key={alert.id} className="alert-card"
            style={{ borderLeft: `4px solid ${severityColor[alert.severity] || '#999'}` }}>
            <div className="alert-header">
              <span className="alert-severity">
                {severityIcon[alert.severity]} {alert.severity?.toUpperCase()} ALERT
              </span>
              <span className="alert-region">📍 {alert.region || 'Island Wide'}</span>
            </div>
            <h3 className="alert-title">{alert.title}</h3>
            <p className="alert-desc">{alert.description}</p>
            <span className="alert-date">
              {new Date(alert.created_at).toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        ))}
        {!loading && alerts.length === 0 && (
          <p style={{ color: 'var(--muted-text)', textAlign: 'center' }}>No active pest alerts at this time. ✅</p>
        )}
      </div>
    </div>
  );
}

// GPS Farmers Map
function FarmersMapPage() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    apiFetch('/agri/farmers-map')
      .then(setFarmers)
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !farmers.length) return;

    const initMap = () => {
      if (!mapRef.current || mapInstance.current) return;

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 18.1096, lng: -77.2975 },
        zoom: 9,
        mapTypeId: 'roadmap',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      // Add markers
      farmers.forEach(farmer => {
        const marker = new window.google.maps.Marker({
          position: { lat: farmer.lat, lng: farmer.lng },
          map: mapInstance.current,
          title: farmer.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="#1b4332" stroke="white" stroke-width="2"/>
                <text x="18" y="23" text-anchor="middle" font-size="16" fill="white">🌱</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(36, 36),
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: DM Sans, sans-serif; padding: 8px; max-width: 200px;">
              <strong style="color: #1b4332; font-size: 15px;">${farmer.name}</strong><br>
              <span style="color: #5a7a68; font-size: 13px;">📍 ${farmer.location}</span><br>
              <span style="font-size: 13px;">🌿 ${farmer.product_count} product${farmer.product_count !== 1 ? 's' : ''}</span><br>
              <span style="font-size: 12px; color: #5a7a68;">${farmer.products}</span>
            </div>
          `,
        });

        marker.addListener('click', () => {
          markersRef.current.forEach(({ iw }) => iw.close());
          infoWindow.open(mapInstance.current, marker);
          setSelected(farmer);
        });

        markersRef.current.push({ marker, iw: infoWindow });
      });
    };

    if (window.google?.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [farmers, loading]);

  return (
    <div className="product-view">
      <h2>🗺️ Farmers Near You</h2>
      <p style={{ color: 'var(--muted-text)', marginBottom: 16 }}>
        Discover farmers across Jamaica. Click a marker to see their products.
      </p>
      {loading && <p style={{ textAlign: 'center' }}>Loading farmer locations…</p>}

      <div className="map-container">
        <div ref={mapRef} className="google-map" />
        {selected && (
          <div className="map-selected-card">
            <button className="map-close" onClick={() => setSelected(null)}>✕</button>
            <strong>{selected.name}</strong>
            <p>📍 {selected.location}</p>
            <p>🌿 {selected.product_count} product{selected.product_count !== 1 ? 's' : ''}</p>
            <p style={{ fontSize: 13, color: 'var(--muted-text)' }}>{selected.products}</p>
          </div>
        )}
      </div>

      <div className="farmers-list-below">
        <h3>All Farmers ({farmers.length})</h3>
        <div className="farmers-grid">
          {farmers.map(f => (
            <div key={f.id} className="farmer-card"
              onClick={() => setSelected(f)}
              style={{ cursor: 'pointer', border: selected?.id === f.id ? '2px solid var(--primary-green)' : '' }}>
              <div className="farmer-avatar">{f.name.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{f.name}</strong>
                <p>📍 {f.location}</p>
                <p>🌿 {f.product_count} products</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Agricultural Hub Page
function AgriHubPage({ user }) {
  const [tab, setTab] = useState('weather');

  return (
    <div className="product-view">
      <h2>🌿 Agricultural Hub</h2>
      <div className="hub-tabs">
        {[
          ['weather', '🌤️ Weather'],
          ['tips', '🌾 Farming Tips'],
          ['alerts', '⚠️ Pest Alerts'],
        ].map(([key, label]) => (
          <button key={key}
            className={tab === key ? 'hub-tab active' : 'hub-tab'}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'weather' && <WeatherWidget location={user?.location} />}
      {tab === 'tips' && <FarmingTipsPage />}
      {tab === 'alerts' && <PestAlertsPage />}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────
function App() {
  const [page, setPage]                       = useState('home');
  const [isLoggedIn, setIsLoggedIn]           = useState(false);
  const [user, setUser]                       = useState(null);
  const [products, setProducts]               = useState([]);
  const [search, setSearch]                   = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [messages, setMessages]               = useState([]);
  const [chatUser, setChatUser]               = useState(null);
  const [chatThread, setChatThread]           = useState([]);
  const [newMessage, setNewMessage]           = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [showWholesale, setShowWholesale]     = useState(false);
  const [profileOpen, setProfileOpen]         = useState(false);
  const [menuOpen, setMenuOpen]               = useState(false);
  const profileRef                            = useRef(null);
  const [newProduct, setNewProduct]           = useState({
    name: '', price: '', wholesale_price: '', wholesale_min_quantity: '10',
    description: '', location: '', quantity: '1', shipping_fee: '0',
    delivery_type: 'own', shipping_company: ''
  });
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutQty, setCheckoutQty]         = useState(1);
  const [checkoutPayment, setCheckoutPayment] = useState('paypal');
  const [pricePreview, setPricePreview]         = useState(null);
  const [availablePayments, setAvailablePayments] = useState([]);
  const [orderResult, setOrderResult]         = useState(null);
  const [newOrderCount, setNewOrderCount]       = useState(0);
  const [unreadMsgCount, setUnreadMsgCount]     = useState(0);
  const [myProvider, setMyProvider]             = useState(null);
  const [farmerPaymentInfo, setFarmerPaymentInfo]   = useState(null);
  const [myPaymentInfo, setMyPaymentInfo]           = useState(null);
  const [paymentInfoLoaded, setPaymentInfoLoaded]   = useState(false);
  const [announcements, setAnnouncements]         = useState([]);
  const [showAnnouncement, setShowAnnouncement]   = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [page]);

  useEffect(() => {
    const token = localStorage.getItem('jm_token');
    const savedUser = localStorage.getItem('jm_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await apiFetch('/products'); setProducts(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isLoggedIn) fetchProducts(); }, [isLoggedIn, fetchProducts]);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try { const data = await apiFetch('/messages/inbox'); setMessages(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isLoggedIn && page === 'messages') fetchInbox();
  }, [isLoggedIn, page, fetchInbox]);

  // ── NEW ORDER NOTIFICATIONS ────────────────────
  const fetchNewOrderCount = useCallback(async () => {
    if (!isLoggedIn || user?.role !== 'farmer') return;
    try {
      const data = await apiFetch('/orders/unread-count');
      setNewOrderCount(data.count);
    } catch (_) {}
  }, [isLoggedIn, user]);

  // Poll every 30 seconds for new orders
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'farmer') return;
    fetchNewOrderCount();
    const interval = setInterval(fetchNewOrderCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, user, fetchNewOrderCount]);

  // Mark orders as read when farmer visits orders page
  const markOrdersRead = useCallback(async () => {
    if (!isLoggedIn || user?.role !== 'farmer') return;
    try {
      await apiFetch('/orders/mark-read', { method: 'PATCH' });
      setNewOrderCount(0);
    } catch (_) {}
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!checkoutProduct || !checkoutQty) return;
    apiFetch(`/orders/price?product_id=${checkoutProduct.id}&quantity=${checkoutQty}`)
      .then(data => {
        setPricePreview(data);
        if (data.available_payments) {
          setAvailablePayments(data.available_payments);
          // Default to first available payment
          if (data.available_payments.length > 0 && !data.available_payments.includes(checkoutPayment)) {
            setCheckoutPayment(data.available_payments[0]);
          }
        }
      }).catch(() => {});
  }, [checkoutProduct, checkoutQty]);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { email, password } = Object.fromEntries(new FormData(e.target));
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('jm_token', data.token);
      localStorage.setItem('jm_user', JSON.stringify(data.user));
      setUser(data.user); setIsLoggedIn(true); setPage('welcome');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { name, role, location, email, password } = Object.fromEntries(new FormData(e.target));
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, role, location, email, password }) });
      const loginData = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('jm_token', loginData.token);
      localStorage.setItem('jm_user', JSON.stringify(loginData.user));
      setUser(loginData.user); setIsLoggedIn(true); setPage('welcome');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('jm_token'); localStorage.removeItem('jm_user');
    setUser(null); setIsLoggedIn(false); setProducts([]); setMessages([]);
    setProfileOpen(false); setMenuOpen(false); setPage('home');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          wholesale_price: newProduct.wholesale_price ? parseFloat(newProduct.wholesale_price) : undefined,
          wholesale_min_quantity: parseInt(newProduct.wholesale_min_quantity) || 10,
          quantity: parseInt(newProduct.quantity) || 1,
          shipping_fee: newProduct.delivery_type === 'own' ? (parseFloat(newProduct.shipping_fee) || 0) : 0,
          delivery_type: newProduct.delivery_type,
          shipping_company: newProduct.delivery_type === 'third_party' ? newProduct.shipping_company : null,
        }),
      });
      // Record price history
      try {
        await apiFetch('/analytics/price-record', {
          method: 'POST',
          body: JSON.stringify({ product_name: newProduct.name, price: parseFloat(newProduct.price), location: newProduct.location }),
        });
      } catch (_) {}
      setNewProduct({ name: '', price: '', wholesale_price: '', wholesale_min_quantity: '10', description: '', location: '', quantity: '1', shipping_fee: '0', delivery_type: 'own', shipping_company: '' });
      await fetchProducts(); setPage('products');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      setSelectedProduct(null); await fetchProducts(); setPage('products');
    } catch (err) { setError(err.message); }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await apiFetch(`/products/${selectedProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: selectedProduct.name,
          price: parseFloat(selectedProduct.price),
          wholesale_price: selectedProduct.wholesale_price ? parseFloat(selectedProduct.wholesale_price) : undefined,
          wholesale_min_quantity: parseInt(selectedProduct.wholesale_min_quantity) || 10,
          description: selectedProduct.description,
          location: selectedProduct.location,
          quantity: parseInt(selectedProduct.quantity) || 1,
          shipping_fee: selectedProduct.delivery_type === 'own' ? (parseFloat(selectedProduct.shipping_fee) || 0) : 0,
          delivery_type: selectedProduct.delivery_type || 'own',
          shipping_company: selectedProduct.delivery_type === 'third_party' ? selectedProduct.shipping_company : null,
        }),
      });
      await fetchProducts(); setSelectedProduct(null); setPage('products');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCheckout = (product) => {
    setCheckoutProduct(product); setCheckoutQty(1);
    setCheckoutPayment('paypal'); setPricePreview(null);
    setOrderResult(null); setPage('checkout');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ product_id: checkoutProduct.id, quantity: checkoutQty, payment_method: checkoutPayment }),
      });
      setOrderResult(order); setPage('orderSuccess');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleStartChat = async (otherUser) => {
    setChatUser(otherUser); setLoading(true);
    try { const data = await apiFetch(`/messages/${otherUser.id}`); setChatThread(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
    setPage('chat');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault(); if (!newMessage.trim()) return;
    try {
      const sent = await apiFetch('/messages', { method: 'POST', body: JSON.stringify({ receiver_id: chatUser.id, message: newMessage }) });
      setChatThread(prev => [...prev, { ...sent, sender_id: user.id }]); setNewMessage('');
    } catch (err) { setError(err.message); }
  };

  const isOwner = (product) => product.farmer_id === user?.id;
  const isAdmin = () => user?.is_admin === 1 || user?.is_admin === true;

  const getDisplayPrice = (product) => {
    if (showWholesale && product.wholesale_price)
      return { price: product.wholesale_price, label: 'Wholesale' };
    return { price: product.price, label: 'Retail' };
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.farmer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── MESSAGE NOTIFICATIONS ────────────────────
  const fetchUnreadMsgCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await apiFetch('/messages/unread-count');
      setUnreadMsgCount(data.count);
    } catch (_) {}
  }, [isLoggedIn]);

  // Poll every 30 seconds for new messages
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchUnreadMsgCount();
    const interval = setInterval(fetchUnreadMsgCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchUnreadMsgCount]);

  // Reset message count when visiting messages page
  useEffect(() => {
    if (isLoggedIn && page === 'messages') setUnreadMsgCount(0);
  }, [isLoggedIn, page]);

  // ── SERVICE PROVIDER ──────────────────────────
  const fetchMyProvider = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await apiFetch('/messages/my-provider');
      setMyProvider(data.provider);
    } catch (_) {}
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) fetchMyProvider();
  }, [isLoggedIn, fetchMyProvider]);

  // ── ANNOUNCEMENTS ─────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch('/admin/announcements')
      .then(data => {
        if (data.length > 0) {
          setAnnouncements(data);
          setShowAnnouncement(true);
        }
      }).catch(() => {});
  }, [isLoggedIn]);

  // ── MY OWN PAYMENT INFO (for farmers) ───────────
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'farmer') return;
    apiFetch('/payment-info/my')
      .then(data => { setMyPaymentInfo(data); })
      .catch(() => { setMyPaymentInfo(null); })
      .finally(() => setPaymentInfoLoaded(true));
  }, [isLoggedIn, user]);

  // ── FARMER PAYMENT INFO ───────────────────────
  const fetchFarmerPaymentInfo = useCallback(async (farmerId) => {
    try {
      const data = await apiFetch(`/payment-info/${farmerId}`);
      setFarmerPaymentInfo(data);
    } catch (_) { setFarmerPaymentInfo(null); }
  }, []);

  useEffect(() => {
    if (selectedProduct?.farmer_id) {
      fetchFarmerPaymentInfo(selectedProduct.farmer_id);
    }
  }, [selectedProduct, fetchFarmerPaymentInfo]);

  const navTo = (p, cb) => { if (cb) cb(); setPage(p); setMenuOpen(false); };

  const DeliveryFields = ({ product, onChange }) => (
    <div className="delivery-section">
      <label className="delivery-label">🚚 Delivery Method</label>
      <div className="delivery-options">
        <label className={`delivery-option ${product.delivery_type === 'own' ? 'selected' : ''}`}>
          <input type="radio" name="delivery_type" value="own"
            checked={product.delivery_type === 'own'}
            onChange={() => onChange({ ...product, delivery_type: 'own', shipping_company: '' })} />
          <div><strong>My Own Delivery</strong><span>I will handle delivery myself</span></div>
        </label>
        <label className={`delivery-option ${product.delivery_type === 'third_party' ? 'selected' : ''}`}>
          <input type="radio" name="delivery_type" value="third_party"
            checked={product.delivery_type === 'third_party'}
            onChange={() => onChange({ ...product, delivery_type: 'third_party', shipping_fee: '0' })} />
          <div><strong>Third Party Shipping</strong><span>Customer arranges with shipping company</span></div>
        </label>
      </div>
      {product.delivery_type === 'own' && (
        <input placeholder="Your delivery/shipping fee (JMD)" type="number" min="0" step="0.01"
          value={product.shipping_fee}
          onChange={e => onChange({ ...product, shipping_fee: e.target.value })} />
      )}
      {product.delivery_type === 'third_party' && (
        <select value={product.shipping_company}
          onChange={e => onChange({ ...product, shipping_company: e.target.value })} required>
          <option value="">Select a shipping company</option>
          {SHIPPING_COMPANIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div className="site-wrapper">

      {/* NAVIGATION */}
      <nav className="main-nav">
        <div className="logo" onClick={() => setPage('home')}>JAM MARKET</div>
        <ul className="nav-links desktop-nav">
          <li onClick={() => setPage('home')}>Home</li>
          <li onClick={() => { fetchProducts(); setPage('products'); }}>Marketplace</li>
          {isLoggedIn && <li onClick={() => setPage('agriHub')}>🌿 Agri Hub</li>}
          {isLoggedIn && isAdmin() && <li onClick={() => setPage('adminPanel')} style={{ color: 'var(--jamaica-gold)' }}>⚙️ Admin</li>}
          {isLoggedIn && <li onClick={() => setPage('farmersMap')}>🗺️ Map</li>}
          {isLoggedIn && (
            <li onClick={() => { setPage('messages'); setUnreadMsgCount(0); }} className="nav-orders-item">
              Messages
              {unreadMsgCount > 0 && <span className="nav-badge">{unreadMsgCount}</span>}
            </li>
          )}
          {isLoggedIn && (
            <li onClick={() => { setPage('orders'); if(user?.role === 'farmer') markOrdersRead(); }} className="nav-orders-item">
              My Orders
              {user?.role === 'farmer' && newOrderCount > 0 && (
                <span className="nav-badge">{newOrderCount}</span>
              )}
            </li>
          )}
        </ul>
        <div className="auth-buttons">
          {!isLoggedIn ? (
            <>
              <button className="btn-login" onClick={() => setPage('login')}>Login</button>
              <button className="btn-login" onClick={() => setPage('register')}>Register</button>
            </>
          ) : (
            <div className="profile-wrapper" ref={profileRef}>
              <button className="profile-icon-btn" onClick={() => setProfileOpen(o => !o)}>
                <div className="profile-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <span className="profile-name">{user?.name}</span>
                <span className="profile-caret">{profileOpen ? '▲' : '▼'}</span>
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-avatar large">{user?.name?.charAt(0).toUpperCase()}</div>
                    <div><strong>{user?.name}</strong><span>{user?.role}</span><span>{user?.location}</span></div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  {user?.role === 'farmer' && (
                    <button className="profile-dropdown-item" onClick={() => { setPage('analytics'); setProfileOpen(false); }}>
                      📊 Analytics Dashboard
                    </button>
                  )}
                  <button className="profile-dropdown-item" onClick={() => { setPage('smartPrice'); setProfileOpen(false); }}>
                    💡 Smart Price Tool
                  </button>
                  <button className="profile-dropdown-item" onClick={() => { setPage('agriHub'); setProfileOpen(false); }}>
                    🌿 Agricultural Hub
                  </button>
                  <button className="profile-dropdown-item" onClick={() => { setPage('farmersMap'); setProfileOpen(false); }}>
                    🗺️ Farmers Map
                  </button>
                  <div className="profile-dropdown-divider" />
                  {myProvider && (
                    <button className="profile-dropdown-item" onClick={() => {
                      handleStartChat({ id: myProvider.id, name: myProvider.name + ' (Support)' });
                      setPage('supportChat');
                      setProfileOpen(false);
                    }}>
                      🎧 Support Chat
                    </button>
                  )}
                  <button className="profile-dropdown-item" onClick={() => { setPage('orders'); setProfileOpen(false); if(user?.role === 'farmer') markOrdersRead(); }}>
                    📋 My Orders
                    {newOrderCount > 0 && user?.role === 'farmer' && (
                      <span className="dropdown-badge">{newOrderCount}</span>
                    )}
                  </button>
                  <button className="profile-dropdown-item" onClick={() => { setPage('messages'); setProfileOpen(false); setUnreadMsgCount(0); }}>
                    💬 Messages
                    {unreadMsgCount > 0 && <span className="dropdown-badge">{unreadMsgCount}</span>}
                  </button>
                  {user?.role === 'farmer' && (
                    <button className="profile-dropdown-item" onClick={() => { setPage('paymentSettings'); setProfileOpen(false); }}>
                      💳 Payment Settings
                    </button>
                  )}

                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          )}
          <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
              <span></span><span></span><span></span>
            </span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu">
          <ul className="mobile-nav-links">
            <li onClick={() => navTo('home')}>🏠 Home</li>
            <li onClick={() => navTo('products', fetchProducts)}>🛒 Marketplace</li>
            {isLoggedIn && <li onClick={() => navTo('agriHub')}>🌿 Agri Hub</li>}
            {isLoggedIn && <li onClick={() => navTo('farmersMap')}>🗺️ Farmers Map</li>}
            {isLoggedIn && <li onClick={() => navTo('smartPrice')}>💡 Smart Price</li>}
            {isLoggedIn && user?.role === 'farmer' && <li onClick={() => navTo('analytics')}>📊 Analytics</li>}
            {isLoggedIn && (
              <li onClick={() => { navTo('messages'); setUnreadMsgCount(0); }} className="mobile-orders-item">
                💬 Messages
                {unreadMsgCount > 0 && <span className="mobile-badge">{unreadMsgCount}</span>}
              </li>
            )}
            {isLoggedIn && (
              <li onClick={() => { navTo('orders'); if(user?.role === 'farmer') markOrdersRead(); }} className="mobile-orders-item">
                📋 My Orders
                {user?.role === 'farmer' && newOrderCount > 0 && (
                  <span className="mobile-badge">{newOrderCount}</span>
                )}
              </li>
            )}
            {!isLoggedIn && <li onClick={() => navTo('login')}>🔑 Login</li>}
            {!isLoggedIn && <li onClick={() => navTo('register')}>📝 Register</li>}
            {isLoggedIn && myProvider && (
              <li onClick={() => navTo('supportChat')}>🎧 Support Chat</li>
            )}
            {isLoggedIn && user?.role === 'farmer' && (
              <li onClick={() => navTo('paymentSettings')}>💳 Payment Settings</li>
            )}
            {isLoggedIn && isAdmin() && (
              <li onClick={() => navTo('adminPanel')}>⚙️ Admin Panel</li>
            )}
            {isLoggedIn && <li className="mobile-logout" onClick={handleLogout}>🚪 Logout</li>}
          </ul>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')} className="error-close">✕</button>
        </div>
      )}

      {/* ANNOUNCEMENTS BANNER */}
      {isLoggedIn && showAnnouncement && announcements.length > 0 && (
        <div className="announcement-banner">
          <span className="announcement-icon">📢</span>
          <div className="announcement-content">
            <strong>{announcements[0].title}</strong>
            <p>{announcements[0].message}</p>
          </div>
          <button className="announcement-close" onClick={() => setShowAnnouncement(false)}>✕</button>
        </div>
      )}

      <div className="page-content">

        {page === 'home' && (
          <div className="hero">
            <h1>Jamaica's Smart<br />Farm Marketplace</h1>
            <p>Buy and sell local produce directly from farmers. Get smart pricing, weather updates, and farming insights.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setPage('login')}>Get Started</button>
              <button style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.5)' }}
                onClick={() => { fetchProducts(); setPage('products'); }}>Browse Market</button>
            </div>
            {/* Feature pills */}
            <div className="hero-features">
              <span>🌤️ Live Weather</span>
              <span>💡 Smart Pricing</span>
              <span>🗺️ Farmer Map</span>
              <span>📊 Analytics</span>
              <span>⚠️ Pest Alerts</span>
            </div>
          </div>
        )}

        {page === 'login' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Account Login</h2>
              <input name="email" type="email" placeholder="Email address" required />
              <input name="password" type="password" placeholder="Password" required />
              <button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Enter Market'}</button>
              <button type="button" className="btn-alt" onClick={() => setPage('register')}>No account? Register</button>
            </form>
          </section>
        )}

        {page === 'register' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleRegister}>
              <h2>Create Account</h2>
              <input name="name" placeholder="Full name" required />
              <select name="role" required>
                <option value="">Select your role</option>
                <option value="farmer">Farmer (Seller)</option>
                <option value="customer">Customer (Buyer)</option>
                <option value="service_provider">Service Provider</option>
              </select>
              <input name="location" placeholder="Your location (parish)" required />
              <input name="email" type="email" placeholder="Email address" required />
              <input name="password" type="password" placeholder="Password (min 6 characters)" required />
              <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Account'}</button>
              <button type="button" className="btn-alt" onClick={() => setPage('login')}>Already registered? Login</button>
            </form>
          </section>
        )}

        {isLoggedIn && page === 'welcome' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h1>Welcome back, {user?.name}! 👋</h1>
              <p>You are logged in as a <strong>{user?.role}</strong>.</p>
              <div className="quick-stats">
                <div className="stat"><span>📍</span>{user?.location || 'Location not set'}</div>
              </div>
              <div className="welcome-actions">
                <button onClick={() => { fetchProducts(); setPage('products'); }}>Go to Marketplace</button>
                <button className="btn-alt" onClick={() => setPage('agriHub')}>🌿 Agri Hub</button>
                {user?.role === 'farmer' && (
                  <button className="btn-alt" onClick={() => setPage('analytics')}>📊 Analytics</button>
                )}
                <button className="btn-alt" onClick={() => setPage('farmersMap')}>🗺️ Farmers Map</button>
              </div>
            </div>
          </section>
        )}

        {page === 'products' && (
          <div className="product-view">
            <h2>Marketplace</h2>
            <div className="market-controls">
              <input placeholder="Search products, sellers, locations…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <div className="price-toggle">
                <button className={!showWholesale ? 'toggle-active' : 'toggle-inactive'}
                  onClick={() => setShowWholesale(false)}>Retail</button>
                <button className={showWholesale ? 'toggle-active' : 'toggle-inactive'}
                  onClick={() => setShowWholesale(true)}>Wholesale</button>
              </div>
              {isLoggedIn && user?.role === 'farmer' && (
                <button onClick={() => {
                  if (!myPaymentInfo || (!myPaymentInfo.bank_name && !myPaymentInfo.paypal_email && !myPaymentInfo.cashapp_tag && !myPaymentInfo.other_payment)) {
                    if (window.confirm('⚠️ You need to set up your Payment Settings before adding products so customers know how to pay you. Go to Payment Settings now?')) {
                      setPage('paymentSettings');
                    }
                  } else {
                    setPage('addProduct');
                  }
                }}>+ Add Product</button>
              )}
            </div>
            {loading && <p style={{ textAlign: 'center', padding: 24 }}>Loading products…</p>}
            <div className="prod-grid">
              {filteredProducts.map(prod => {
                const { price, label } = getDisplayPrice(prod);
                return (
                  <div className="prod-card" key={prod.id}
                    onClick={() => { setSelectedProduct(prod); setPage('productDetails'); }}>
                    <h3>{prod.name}</h3>
                    <p>{prod.description}</p>
                    <div className="price-badge">
                      <span className="price-label">{label}</span>
                      <span className="price-value">J${parseFloat(price).toLocaleString()}</span>
                    </div>
                    {prod.wholesale_price && (
                      <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: 4 }}>
                        Wholesale: J${parseFloat(prod.wholesale_price).toLocaleString()} (min {prod.wholesale_min_quantity} units)
                      </p>
                    )}
                    <p><strong>Seller:</strong> {prod.farmer_name}</p>
                    <p><strong>Location:</strong> {prod.location}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: 4 }}>
                      {prod.delivery_type === 'third_party'
                        ? `📦 Ships via ${getShippingCompany(prod.shipping_company)?.label || 'third party'}`
                        : prod.shipping_fee > 0
                          ? `🚗 Delivery: J$${parseFloat(prod.shipping_fee).toLocaleString()}`
                          : '🚗 Free delivery'}
                    </p>
                    {(prod.sold_out || prod.quantity <= 0) && (
                      <div className="sold-out-badge">🚫 Sold Out</div>
                    )}
                  </div>
                );
              })}
              {!loading && filteredProducts.length === 0 && <p className="no-products">No products found.</p>}
            </div>
          </div>
        )}

        {isLoggedIn && user?.role === 'farmer' && page === 'addProduct' && 
         paymentInfoLoaded && (!myPaymentInfo || (!myPaymentInfo.bank_name && !myPaymentInfo.paypal_email && !myPaymentInfo.cashapp_tag && !myPaymentInfo.other_payment)) && (
          <section className="auth-container">
            <div className="auth-form" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
              <h2 style={{ color: 'var(--primary-green)' }}>Payment Setup Required</h2>
              <p style={{ color: 'var(--muted-text)', marginBottom: 24 }}>
                You need to set up at least one payment method before adding products.
                This lets customers know how to pay you!
              </p>
              <button onClick={() => setPage('paymentSettings')}>Go to Payment Settings</button>
              <button className="btn-alt" style={{ marginTop: 10 }} onClick={() => setPage('products')}>Back to Marketplace</button>
            </div>
          </section>
        )}

        {isLoggedIn && user?.role === 'farmer' && page === 'addProduct' && 
         paymentInfoLoaded && myPaymentInfo && (myPaymentInfo.bank_name || myPaymentInfo.paypal_email || myPaymentInfo.cashapp_tag || myPaymentInfo.other_payment) && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleAddProduct}>
              <h2>Add New Product</h2>
              <input placeholder="Product name" value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
              <input placeholder="Retail price (JMD)" type="number" min="0" step="0.01"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
              <input placeholder="Wholesale price (JMD) — optional" type="number" min="0" step="0.01"
                value={newProduct.wholesale_price}
                onChange={e => setNewProduct({ ...newProduct, wholesale_price: e.target.value })} />
              <input placeholder="Min quantity for wholesale (default 10)" type="number" min="1"
                value={newProduct.wholesale_min_quantity}
                onChange={e => setNewProduct({ ...newProduct, wholesale_min_quantity: e.target.value })} />
              <input placeholder="Stock quantity" type="number" min="1"
                value={newProduct.quantity}
                onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} required />
              <input placeholder="Location" value={newProduct.location}
                onChange={e => setNewProduct({ ...newProduct, location: e.target.value })} required />
              <textarea placeholder="Description" value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} required />
              <DeliveryFields product={newProduct} onChange={setNewProduct} />
              <button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Product'}</button>
              <button type="button" className="btn-alt" onClick={() => setPage('products')}>Cancel</button>
            </form>
          </section>
        )}

        {selectedProduct && page === 'productDetails' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              <div className="price-breakdown">
                <div className="price-row"><span>Retail price</span><strong>J${parseFloat(selectedProduct.price).toLocaleString()}</strong></div>
                {selectedProduct.wholesale_price && (
                  <div className="price-row wholesale">
                    <span>Wholesale (min {selectedProduct.wholesale_min_quantity} units)</span>
                    <strong>J${parseFloat(selectedProduct.wholesale_price).toLocaleString()}</strong>
                  </div>
                )}
                <div className="price-row">
                  <span>🚚 Delivery</span>
                  <strong>
                    {selectedProduct.delivery_type === 'third_party'
                      ? `${getShippingCompany(selectedProduct.shipping_company)?.label || 'Third party'}`
                      : selectedProduct.shipping_fee > 0
                        ? `J$${parseFloat(selectedProduct.shipping_fee).toLocaleString()} (own delivery)`
                        : 'Free (own delivery)'}
                  </strong>
                </div>
              </div>
              <p><strong>Seller:</strong> {selectedProduct.farmer_name}</p>
              <p><strong>Location:</strong> {selectedProduct.location}</p>
              <p><strong>In stock:</strong> {selectedProduct.quantity} units</p>
              {selectedProduct.delivery_type === 'third_party' && getShippingCompany(selectedProduct.shipping_company) && (
                <div className="shipping-info-box">
                  <p>📦 This seller uses <strong>{getShippingCompany(selectedProduct.shipping_company).label}</strong> for delivery.</p>
                  <p>After placing your order, contact them directly to arrange shipping and get their rates:</p>
                  <a href={getShippingCompany(selectedProduct.shipping_company).url} target="_blank" rel="noopener noreferrer" className="shipping-link">
                    Visit {getShippingCompany(selectedProduct.shipping_company).label} →
                  </a>
                </div>
              )}
              <div className="product-detail-actions">
                {isLoggedIn && isOwner(selectedProduct) && (
                  <>
                    <button onClick={() => setPage('editProduct')}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeleteProduct(selectedProduct.id)}>Delete</button>
                  </>
                )}
                {isLoggedIn && !isOwner(selectedProduct) && user?.role === 'customer' && (
                  selectedProduct.sold_out || selectedProduct.quantity <= 0
                    ? <button disabled className="btn-sold-out">🚫 Sold Out</button>
                    : <button onClick={() => handleCheckout(selectedProduct)}>🛒 Buy Now</button>
                )}
                {isLoggedIn && !isOwner(selectedProduct) && (
                  <button className="btn-alt" onClick={() => handleStartChat({ id: selectedProduct.farmer_id, name: selectedProduct.farmer_name })}>💬 Message Seller</button>
                )}
                <button className="btn-alt" onClick={() => setPage('products')}>Back</button>
              </div>
            </div>
          </section>
        )}

        {isLoggedIn && selectedProduct && page === 'editProduct' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleEditProduct}>
              <h2>Edit Product</h2>
              <input placeholder="Product name" value={selectedProduct.name}
                onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })} required />
              <input placeholder="Retail price (JMD)" type="number" min="0" step="0.01"
                value={selectedProduct.price}
                onChange={e => setSelectedProduct({ ...selectedProduct, price: e.target.value })} required />
              <input placeholder="Wholesale price (JMD) — optional" type="number" min="0" step="0.01"
                value={selectedProduct.wholesale_price || ''}
                onChange={e => setSelectedProduct({ ...selectedProduct, wholesale_price: e.target.value })} />
              <input placeholder="Min quantity for wholesale" type="number" min="1"
                value={selectedProduct.wholesale_min_quantity || 10}
                onChange={e => setSelectedProduct({ ...selectedProduct, wholesale_min_quantity: e.target.value })} />
              <input placeholder="Stock quantity" type="number" min="0"
                value={selectedProduct.quantity}
                onChange={e => setSelectedProduct({ ...selectedProduct, quantity: e.target.value })} required />
              <input placeholder="Location" value={selectedProduct.location}
                onChange={e => setSelectedProduct({ ...selectedProduct, location: e.target.value })} required />
              <textarea placeholder="Description" value={selectedProduct.description}
                onChange={e => setSelectedProduct({ ...selectedProduct, description: e.target.value })} required />
              <DeliveryFields product={{ ...selectedProduct, delivery_type: selectedProduct.delivery_type || 'own', shipping_company: selectedProduct.shipping_company || '' }}
                onChange={setSelectedProduct} />
              <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" className="btn-alt" onClick={() => setPage('productDetails')}>Cancel</button>
            </form>
          </section>
        )}

        {isLoggedIn && checkoutProduct && page === 'checkout' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handlePlaceOrder}>
              <h2>Checkout</h2>
              <div className="checkout-product">
                <strong>{checkoutProduct.name}</strong>
                <span>Seller: {checkoutProduct.farmer_name} · {checkoutProduct.location}</span>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-text)', marginBottom: 6, display: 'block' }}>Quantity</label>
                <input type="number" min="1" max={checkoutProduct.quantity}
                  value={checkoutQty} onChange={e => setCheckoutQty(parseInt(e.target.value) || 1)} required />
              </div>
              {pricePreview && (
                <div className="price-preview">
                  <div className="price-row"><span>Unit price</span><strong>J${parseFloat(pricePreview.unit_price).toLocaleString()}</strong></div>
                  <div className="price-row"><span>Subtotal</span><strong>J${parseFloat(pricePreview.subtotal).toLocaleString()}</strong></div>
                  {checkoutProduct.delivery_type === 'own' && pricePreview.shipping_fee > 0 && (
                    <div className="price-row"><span>🚗 Delivery fee</span><strong>J${parseFloat(pricePreview.shipping_fee).toLocaleString()}</strong></div>
                  )}
                  <div className="price-row"><span>🧾 GCT (15%)</span><strong>J${parseFloat(pricePreview.tax_amount || 0).toLocaleString()}</strong></div>
                  <div className="price-row total"><span>Total (incl. GCT)</span><strong>J${parseFloat(pricePreview.total_price).toLocaleString()}</strong></div>
                  <div style={{ marginTop: 8 }}>
                    <span className={checkoutQty >= (checkoutProduct.wholesale_min_quantity || 10) && checkoutProduct.wholesale_price ? 'wholesale-badge' : 'retail-badge'}>
                      {checkoutQty >= (checkoutProduct.wholesale_min_quantity || 10) && checkoutProduct.wholesale_price ? 'Wholesale price applied' : 'Retail price'}
                    </span>
                  </div>
                </div>
              )}
              {checkoutProduct.delivery_type === 'third_party' && getShippingCompany(checkoutProduct.shipping_company) && (
                <div className="shipping-info-box">
                  <p>📦 This product ships via <strong>{getShippingCompany(checkoutProduct.shipping_company).label}</strong>.</p>
                  <p>After placing your order, contact them to arrange delivery and get shipping rates:</p>
                  <a href={getShippingCompany(checkoutProduct.shipping_company).url} target="_blank" rel="noopener noreferrer" className="shipping-link">
                    Visit {getShippingCompany(checkoutProduct.shipping_company).label} →
                  </a>
                </div>
              )}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-text)', marginBottom: 8, display: 'block' }}>Payment Method</label>
                <div className="payment-options">
                  {[['paypal','💳 PayPal'],['bank_transfer','🏦 Bank Transfer'],['cash_on_delivery','💵 Cash on Delivery']].map(([val, label]) => {
                    const isAvailable = availablePayments.length === 0 || availablePayments.includes(val);
                    return (
                      <label key={val} className={`payment-option ${checkoutPayment === val ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                        style={{ opacity: isAvailable ? 1 : 0.4, cursor: isAvailable ? 'pointer' : 'not-allowed' }}>
                        <input type="radio" name="payment" value={val}
                          checked={checkoutPayment === val}
                          disabled={!isAvailable}
                          onChange={() => isAvailable && setCheckoutPayment(val)} />
                        <span>{label} {!isAvailable && '(not available)'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Processing…' : `Pay J$${pricePreview ? parseFloat(pricePreview.total_price).toLocaleString() : '...'}`}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('productDetails')}>Cancel</button>
            </form>
          </section>
        )}

        {page === 'orderSuccess' && orderResult && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2>Order Placed!</h2>
              <p>Your payment was processed successfully.</p>
              <div className="price-preview" style={{ marginTop: 20 }}>
                <div className="price-row"><span>Order ID</span><strong>#{orderResult.order.id}</strong></div>
                <div className="price-row"><span>Subtotal</span><strong>J${parseFloat(orderResult.order.subtotal || orderResult.order.total_price).toLocaleString()}</strong></div>
                <div className="price-row"><span>🚗 Shipping</span><strong>J${parseFloat(orderResult.order.shipping_fee || 0).toLocaleString()}</strong></div>
                <div className="price-row"><span>🧾 GCT (15%)</span><strong>J${parseFloat(orderResult.order.tax_amount || 0).toLocaleString()}</strong></div>
                <div className="price-row total"><span>Total paid</span><strong>J${parseFloat(orderResult.order.total_price).toLocaleString()}</strong></div>
                <div className="price-row"><span>Payment method</span><strong>{checkoutPayment.replace(/_/g, ' ').toUpperCase()}</strong></div>
                <div className="price-row"><span>Transaction ID</span><strong style={{ fontSize: 12 }}>{orderResult.payment.transaction_id}</strong></div>
              </div>
              {/* Show farmer real payment info */}
              {checkoutPayment === 'bank_transfer' && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>🏦 <strong>Bank Transfer Details</strong></p>
                  {farmerPaymentInfo?.bank_name ? (
                    <>
                      <p>Bank: <strong>{farmerPaymentInfo.bank_name}</strong></p>
                      <p>Account Name: <strong>{farmerPaymentInfo.account_name}</strong></p>
                      <p>Account Number: <strong>{farmerPaymentInfo.account_number}</strong></p>
                      {farmerPaymentInfo.bank_branch && <p>Branch: <strong>{farmerPaymentInfo.bank_branch}</strong></p>}
                      <p>Reference: <strong>ORDER-{orderResult.order.id}</strong></p>
                      <p style={{ color: '#c0392b', fontWeight: 600 }}>⚠️ Use ORDER-{orderResult.order.id} as your reference!</p>
                    </>
                  ) : (
                    <p>Please contact the farmer directly for bank transfer details.</p>
                  )}
                </div>
              )}

              {checkoutPayment === 'paypal' && farmerPaymentInfo?.paypal_email && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>💳 <strong>PayPal Payment</strong></p>
                  <p>Send payment to: <strong>{farmerPaymentInfo.paypal_email}</strong></p>
                  <p>Amount: <strong>J${parseFloat(orderResult.order.total_price).toLocaleString()}</strong></p>
                  <p>Reference: <strong>ORDER-{orderResult.order.id}</strong></p>
                </div>
              )}

              {farmerPaymentInfo?.cashapp_tag && checkoutPayment === 'cash_on_delivery' && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>💵 <strong>CashApp Option Available</strong></p>
                  <p>CashApp tag: <strong>{farmerPaymentInfo.cashapp_tag}</strong></p>
                </div>
              )}

              {farmerPaymentInfo?.other_payment && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>📝 <strong>Payment Instructions from Farmer</strong></p>
                  <p>{farmerPaymentInfo.other_payment}</p>
                </div>
              )}
              {checkoutPayment === 'cash_on_delivery' && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>💵 <strong>Cash on Delivery</strong></p>
                  <p>Please have <strong>J${parseFloat(orderResult.order.total_price).toLocaleString()}</strong> ready when your order arrives.</p>
                </div>
              )}
              {orderResult.delivery_type === 'third_party' && getShippingCompany(orderResult.shipping_company) && (
                <div className="shipping-info-box" style={{ marginTop: 16 }}>
                  <p>📦 Don't forget to arrange delivery with <strong>{getShippingCompany(orderResult.shipping_company).label}</strong>!</p>
                  <a href={getShippingCompany(orderResult.shipping_company).url} target="_blank" rel="noopener noreferrer" className="shipping-link">
                    Visit {getShippingCompany(orderResult.shipping_company).label} →
                  </a>
                </div>
              )}
              <div className="welcome-actions" style={{ marginTop: 24 }}>
                <button onClick={() => setPage('orders')}>View My Orders</button>
                <button className="btn-alt" onClick={() => { fetchProducts(); setPage('products'); }}>Back to Marketplace</button>
              </div>
            </div>
          </section>
        )}

        {isLoggedIn && page === 'orders' && <OrdersPage user={user} />}

        {/* ADMIN PANEL */}
        {isLoggedIn && isAdmin() && page === 'adminPanel' && <AdminPanel />}

        {/* PAYMENT SETTINGS PAGE */}
        {isLoggedIn && user?.role === 'farmer' && page === 'paymentSettings' && (
          <PaymentSettingsPage user={user} />
        )}

        {/* SUPPORT CHAT PAGE */}
        {isLoggedIn && page === 'supportChat' && myProvider && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <div className="support-chat-header">
                <div className="support-avatar-large">🎧</div>
                <div>
                  <h2>Support Chat</h2>
                  <p style={{ color: 'var(--muted-text)', fontSize: 14 }}>
                    {myProvider.name} — Your dedicated support agent
                  </p>
                </div>
              </div>
              <div className="chat-thread">
                {chatThread.map((msg, idx) => (
                  <div key={idx} className="chat-message"
                    style={{
                      alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                      background: msg.sender_id === user.id ? 'var(--primary-green)' : 'var(--white)',
                      color: msg.sender_id === user.id ? 'white' : 'var(--dark-text)',
                    }}>
                    <strong style={{ color: msg.sender_id === user.id ? 'rgba(255,255,255,0.8)' : 'var(--primary-green)' }}>
                      {msg.sender_id === user.id ? 'You' : myProvider.name}
                    </strong>
                    {msg.message}
                  </div>
                ))}
                {chatThread.length === 0 && (
                  <p style={{ color: 'var(--muted-text)', textAlign: 'center', margin: 'auto' }}>
                    👋 Say hello to your support agent!
                  </p>
                )}
              </div>
              <form className="chat-form" onSubmit={handleSendMessage}>
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message…" required />
                <button type="submit">Send</button>
              </form>
              <div style={{ marginTop: 16 }}>
                <button className="btn-alt" onClick={() => setPage('messages')}>← Back</button>
              </div>
            </div>
          </section>
        )}

        {isLoggedIn && page === 'analytics' && user?.role === 'farmer' && <AnalyticsDashboard user={user} />}

        {isLoggedIn && page === 'smartPrice' && (
          <div className="product-view">
            <SmartPriceTool userLocation={user?.location} />
            <div style={{ marginTop: 40 }}><ProduceByArea /></div>
          </div>
        )}

        {isLoggedIn && page === 'agriHub' && <AgriHubPage user={user} />}

        {isLoggedIn && page === 'farmersMap' && <FarmersMapPage />}

        {isLoggedIn && page === 'messages' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>Your Messages</h2>

              {/* Permanent Support Chat */}
              {myProvider && (
                <div className="support-chat-banner" onClick={() => handleStartChat({ id: myProvider.id, name: myProvider.name + ' (Support)' })}>
                  <div className="support-avatar">🎧</div>
                  <div className="support-info">
                    <strong>Support — {myProvider.name}</strong>
                    <span>Your dedicated support agent • Click to chat</span>
                  </div>
                  <div className="support-online">● Online</div>
                </div>
              )}

              {loading && <p>Loading…</p>}
              {!loading && messages.length === 0 && <p style={{ color: 'var(--muted-text)', marginTop: 16 }}>No other messages yet.</p>}
              <ul className="messages-list" style={{ marginTop: 16 }}>
                {messages.filter(m => {
                  const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
                  return !myProvider || otherId !== myProvider.id;
                }).map(m => (
                  <li key={m.id}>
                    <button onClick={() => handleStartChat({
                      id: m.sender_id === user.id ? m.receiver_id : m.sender_id,
                      name: m.other_name,
                    })}>
                      💬 Chat with {m.other_name}
                      {m.unread_count > 0 && <span className="msg-unread-dot">{m.unread_count}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {isLoggedIn && page === 'chat' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>Chat with {chatUser?.name}</h2>
              <div className="chat-thread">
                {chatThread.map((msg, idx) => (
                  <div key={idx} className="chat-message"
                    style={{
                      alignSelf: msg.sender_id === user.id ? 'flex-end' : 'flex-start',
                      background: msg.sender_id === user.id ? 'var(--primary-green)' : 'var(--white)',
                      color: msg.sender_id === user.id ? 'white' : 'var(--dark-text)',
                    }}>
                    <strong style={{ color: msg.sender_id === user.id ? 'rgba(255,255,255,0.8)' : 'var(--primary-green)' }}>
                      {msg.sender_id === user.id ? 'You' : chatUser?.name}
                    </strong>
                    {msg.message}
                  </div>
                ))}
                {chatThread.length === 0 && (
                  <p style={{ color: 'var(--muted-text)', textAlign: 'center', margin: 'auto' }}>No messages yet. Say hello!</p>
                )}
              </div>
              <form className="chat-form" onSubmit={handleSendMessage}>
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message…" required />
                <button type="submit">Send</button>
              </form>
              <div style={{ marginTop: 16 }}>
                <button className="btn-alt" onClick={() => setPage('messages')}>← Back</button>
              </div>
            </div>
          </section>
        )}

      </div>

      <footer className="site-footer">
        <p className="footer-contact">📧 contact@jammarket.com &nbsp;|&nbsp; 📞 (876) 555-0100</p>
        <p className="footer-copy">© {new Date().getFullYear()} Jam Market. All rights reserved.</p>
      </footer>

    </div>
  );
}


// ── PAYMENT SETTINGS PAGE ────────────────────
function PaymentSettingsPage({ user }) {
  const [info, setInfo]       = useState({
    bank_name: '', account_name: '', account_number: '',
    bank_branch: '', paypal_email: '', cashapp_tag: '', other_payment: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    apiFetch('/payment-info/my')
      .then(data => { if (data) setInfo({ ...info, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    try {
      await apiFetch('/payment-info', { method: 'POST', body: JSON.stringify(info) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="product-view"><p>Loading payment settings…</p></div>;

  return (
    <div className="product-view">
      <h2>💳 Payment Settings</h2>
      <p style={{ color: 'var(--muted-text)', marginBottom: 24 }}>
        Set your payment details so customers know how to pay you.
        Only filled in options will be shown to customers at checkout.
      </p>
      <form onSubmit={handleSave} className="payment-settings-form">

        {/* Bank Transfer */}
        <div className="payment-settings-section">
          <h3>🏦 Bank Transfer</h3>
          <input placeholder="Bank name (e.g. NCB, Scotiabank)"
            value={info.bank_name || ''}
            onChange={e => setInfo({ ...info, bank_name: e.target.value })} />
          <input placeholder="Account holder name"
            value={info.account_name || ''}
            onChange={e => setInfo({ ...info, account_name: e.target.value })} />
          <input placeholder="Account number"
            value={info.account_number || ''}
            onChange={e => setInfo({ ...info, account_number: e.target.value })} />
          <input placeholder="Branch (optional)"
            value={info.bank_branch || ''}
            onChange={e => setInfo({ ...info, bank_branch: e.target.value })} />
        </div>

        {/* PayPal */}
        <div className="payment-settings-section">
          <h3>💳 PayPal</h3>
          <input placeholder="Your PayPal email address" type="email"
            value={info.paypal_email || ''}
            onChange={e => setInfo({ ...info, paypal_email: e.target.value })} />
        </div>

        {/* CashApp */}
        <div className="payment-settings-section">
          <h3>💵 CashApp</h3>
          <input placeholder="Your CashApp tag (e.g. $YourName)"
            value={info.cashapp_tag || ''}
            onChange={e => setInfo({ ...info, cashapp_tag: e.target.value })} />
        </div>

        {/* Other */}
        <div className="payment-settings-section">
          <h3>📝 Other Payment Instructions</h3>
          <textarea placeholder="Any other payment instructions for customers…"
            value={info.other_payment || ''}
            onChange={e => setInfo({ ...info, other_payment: e.target.value })} />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : saved ? '✅ Saved!' : 'Save Payment Info'}
        </button>
      </form>
    </div>
  );
}


// ── ADMIN PANEL ───────────────────────────────
function AdminPanel() {
  const [tab, setTab]               = useState('users');
  const [users, setUsers]           = useState([]);
  const [pestAlerts, setPestAlerts] = useState([]);
  const [tips, setTips]             = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [saved, setSaved]           = useState(null);
  const [error, setError]           = useState('');

  const [newAlert, setNewAlert]     = useState({ title: '', description: '', region: '', severity: 'medium' });
  const [newTip, setNewTip]         = useState({ title: '', content: '', category: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/admin/users'),
      apiFetch('/admin/pest-alerts'),
      apiFetch('/admin/farming-tips'),
      apiFetch('/admin/announcements'),
    ]).then(([u, p, t, a]) => {
      setUsers(u); setPestAlerts(p); setTips(t); setAnnouncements(a);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiFetch(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSaved(userId); setTimeout(() => setSaved(null), 2000);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone!`)) return;
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) { setError(err.message); }
  };

  const handleAddPestAlert = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/admin/pest-alerts', { method: 'POST', body: JSON.stringify(newAlert) });
      setPestAlerts([{ id: data.id, ...newAlert, created_at: new Date() }, ...pestAlerts]);
      setNewAlert({ title: '', description: '', region: '', severity: 'medium' });
    } catch (err) { setError(err.message); }
  };

  const handleDeletePestAlert = async (id) => {
    if (!window.confirm('Delete this pest alert?')) return;
    try {
      await apiFetch(`/admin/pest-alerts/${id}`, { method: 'DELETE' });
      setPestAlerts(pestAlerts.filter(a => a.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleAddTip = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/admin/farming-tips', { method: 'POST', body: JSON.stringify(newTip) });
      setTips([{ id: data.id, ...newTip, created_at: new Date() }, ...tips]);
      setNewTip({ title: '', content: '', category: '' });
    } catch (err) { setError(err.message); }
  };

  const handleDeleteTip = async (id) => {
    if (!window.confirm('Delete this farming tip?')) return;
    try {
      await apiFetch(`/admin/farming-tips/${id}`, { method: 'DELETE' });
      setTips(tips.filter(t => t.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(newAnnouncement) });
      setAnnouncements([{ id: data.id, ...newAnnouncement, created_at: new Date() }, ...announcements]);
      setNewAnnouncement({ title: '', message: '' });
    } catch (err) { setError(err.message); }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (err) { setError(err.message); }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors   = { farmer: '#1b4332', customer: '#1d4ed8', service_provider: '#7c3aed' };
  const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

  const navTabs = [
    { key: 'users',         icon: '👥', label: 'Users',        count: users.length },
    { key: 'pestAlerts',    icon: '⚠️', label: 'Pest Alerts',  count: pestAlerts.length },
    { key: 'tips',          icon: '🌾', label: 'Farming Tips', count: tips.length },
    { key: 'announcements', icon: '📢', label: 'Announcements',count: announcements.length },
  ];

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-spinner" />
      <p>Loading admin panel…</p>
    </div>
  );

  return (
    <div className="admin-dash-wrapper">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">⚙️</div>
          <div>
            <strong>Admin Panel</strong>
            <span>Jam Market</span>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="admin-sidebar-stats">
          <div className="admin-sidebar-stat">
            <span>{users.length}</span><p>Users</p>
          </div>
          <div className="admin-sidebar-stat">
            <span>{users.filter(u => u.role === 'farmer').length}</span><p>Farmers</p>
          </div>
          <div className="admin-sidebar-stat">
            <span>{users.filter(u => u.role === 'service_provider').length}</span><p>Support</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {navTabs.map(t => (
            <button key={t.key}
              className={`admin-nav-item ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span className="admin-nav-label">{t.label}</span>
              <span className="admin-nav-count">{t.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {error && (
          <div className="admin-error">
            ⚠️ {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>User Management</h2>
              <input className="admin-search" placeholder="🔍 Search users…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Location</th>
                    <th>Role</th><th>Change Role</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <strong>{u.name}</strong>
                            {u.is_admin === 1 && <span className="admin-badge">Admin</span>}
                          </div>
                        </div>
                      </td>
                      <td className="admin-td-muted">{u.email}</td>
                      <td className="admin-td-muted">{u.location || '—'}</td>
                      <td>
                        <span className="admin-role-pill" style={{ background: roleColors[u.role] + '20', color: roleColors[u.role], border: `1px solid ${roleColors[u.role]}40` }}>
                          {u.role === 'service_provider' ? '🎧 Support' : u.role === 'farmer' ? '👨‍🌾 Farmer' : '🛒 Customer'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-role-change">
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="admin-select">
                            <option value="farmer">👨‍🌾 Farmer</option>
                            <option value="customer">🛒 Customer</option>
                            <option value="service_provider">🎧 Support</option>
                          </select>
                          {saved === u.id && <span className="admin-saved">✅</span>}
                        </div>
                      </td>
                      <td>
                        {u.is_admin !== 1 && (
                          <button className="admin-delete-btn" onClick={() => handleDeleteUser(u.id, u.name)}>
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PEST ALERTS */}
        {tab === 'pestAlerts' && (
          <div className="admin-section">
            <div className="admin-section-header"><h2>Pest & Disease Alerts</h2></div>
            <div className="admin-form-panel">
              <h3>➕ New Alert</h3>
              <form onSubmit={handleAddPestAlert} className="admin-form-grid">
                <input placeholder="Alert title" value={newAlert.title}
                  onChange={e => setNewAlert({ ...newAlert, title: e.target.value })} required />
                <input placeholder="Region (e.g. Manchester, St. Ann)" value={newAlert.region}
                  onChange={e => setNewAlert({ ...newAlert, region: e.target.value })} />
                <select value={newAlert.severity} onChange={e => setNewAlert({ ...newAlert, severity: e.target.value })}
                  className="admin-select">
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <button type="submit" className="admin-submit-btn">Add Alert</button>
                <textarea placeholder="Description" value={newAlert.description}
                  onChange={e => setNewAlert({ ...newAlert, description: e.target.value })}
                  required style={{ gridColumn: '1 / -1' }} />
              </form>
            </div>
            <div className="admin-content-list">
              {pestAlerts.map(a => (
                <div key={a.id} className="admin-content-card" style={{ borderLeft: `4px solid ${severityColors[a.severity] || '#999'}` }}>
                  <div className="admin-content-info">
                    <div className="admin-content-title">{a.title}</div>
                    <div className="admin-content-meta">📍 {a.region || 'Island Wide'} • <span style={{ color: severityColors[a.severity], fontWeight: 600 }}>{a.severity?.toUpperCase()}</span></div>
                    <div className="admin-content-desc">{a.description}</div>
                  </div>
                  <button className="admin-delete-btn" onClick={() => handleDeletePestAlert(a.id)}>🗑️</button>
                </div>
              ))}
              {pestAlerts.length === 0 && <p className="admin-empty">No pest alerts yet.</p>}
            </div>
          </div>
        )}

        {/* FARMING TIPS */}
        {tab === 'tips' && (
          <div className="admin-section">
            <div className="admin-section-header"><h2>Farming Tips</h2></div>
            <div className="admin-form-panel">
              <h3>➕ New Tip</h3>
              <form onSubmit={handleAddTip} className="admin-form-grid">
                <input placeholder="Tip title" value={newTip.title}
                  onChange={e => setNewTip({ ...newTip, title: e.target.value })} required />
                <input placeholder="Category (e.g. Planting, Pest Control)" value={newTip.category}
                  onChange={e => setNewTip({ ...newTip, category: e.target.value })} />
                <button type="submit" className="admin-submit-btn">Add Tip</button>
                <textarea placeholder="Tip content" value={newTip.content}
                  onChange={e => setNewTip({ ...newTip, content: e.target.value })}
                  required style={{ gridColumn: '1 / -1' }} />
              </form>
            </div>
            <div className="admin-content-list">
              {tips.map(t => (
                <div key={t.id} className="admin-content-card" style={{ borderLeft: '4px solid #1b4332' }}>
                  <div className="admin-content-info">
                    <div className="admin-content-title">{t.title}</div>
                    <div className="admin-content-meta">📌 {t.category || 'General'}</div>
                    <div className="admin-content-desc">{t.content?.substring(0, 120)}…</div>
                  </div>
                  <button className="admin-delete-btn" onClick={() => handleDeleteTip(t.id)}>🗑️</button>
                </div>
              ))}
              {tips.length === 0 && <p className="admin-empty">No farming tips yet.</p>}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {tab === 'announcements' && (
          <div className="admin-section">
            <div className="admin-section-header"><h2>Announcements</h2></div>
            <div className="admin-form-panel announcement-panel">
              <h3>📢 Send Announcement</h3>
              <p style={{ color: 'var(--muted-text)', fontSize: 13, marginBottom: 12 }}>
                Shown to all users as a banner when they log in.
              </p>
              <form onSubmit={handleAddAnnouncement} className="admin-form-grid">
                <input placeholder="Announcement title" value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} required />
                <button type="submit" className="admin-submit-btn">📢 Send</button>
                <textarea placeholder="Announcement message" value={newAnnouncement.message}
                  onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  required style={{ gridColumn: '1 / -1' }} />
              </form>
            </div>
            <div className="admin-content-list">
              {announcements.map(a => (
                <div key={a.id} className="admin-content-card announcement-card">
                  <div className="admin-content-info">
                    <div className="admin-content-title">📢 {a.title}</div>
                    <div className="admin-content-meta">
                      {new Date(a.created_at).toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="admin-content-desc">{a.message}</div>
                  </div>
                  <button className="admin-delete-btn" onClick={() => handleDeleteAnnouncement(a.id)}>🗑️</button>
                </div>
              ))}
              {announcements.length === 0 && <p className="admin-empty">No announcements yet.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── ORDERS PAGE ───────────────────────────────
function OrdersPage({ user }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    apiFetch('/orders/mine').then(setOrders).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    } catch (err) { setError(err.message); }
  };

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await apiFetch(`/orders/${id}`, { method: 'DELETE' });
      setOrders(orders.filter(o => o.id !== id));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="product-view">
      <h2>My Orders</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading orders…</p>}
      {!loading && orders.length === 0 && <p style={{ color: 'var(--muted-text)' }}>No orders yet.</p>}
      {orders.length > 0 && (
        <div className="order-table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Qty</th><th>Total</th>
                <th>Payment</th><th>Status</th><th>Delivery</th>
                {user?.role === 'farmer' && <th>Customer</th>}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.product_name}</td>
                  <td>{o.quantity}</td>
                  <td>J${parseFloat(o.total_price).toLocaleString()}</td>
                  <td><span className={`status-badge ${o.payment_status}`}>{o.payment_status}</span></td>
                  <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
                  <td>
                    {o.delivery_type === 'third_party' && getShippingCompany(o.shipping_company)
                      ? <a href={getShippingCompany(o.shipping_company).url} target="_blank" rel="noopener noreferrer" className="shipping-link-small">
                          📦 {getShippingCompany(o.shipping_company).label}
                        </a>
                      : <span>🚗 Own</span>}
                  </td>
                  {user?.role === 'farmer' && <td>{o.customer_name}</td>}
                  <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {user?.role === 'farmer' && (
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ padding: '4px 8px', fontSize: 13 }}>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                    <button className="btn-danger" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => cancelOrder(o.id)}>Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;