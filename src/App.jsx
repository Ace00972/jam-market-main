import './App.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE = 'https://jam-market-main-1.onrender.com/api';

const SHIPPING_COMPANIES = [
  { value: 'knutsford', label: 'Knutsford Express', url: 'https://www.knutsfordexpress.com' },
  { value: 'zipmail',   label: 'Zipmail',            url: 'https://www.zipmail.com.jm' },
  { value: 'tara',      label: 'Tara Courier',       url: 'https://www.taracourier.com' },
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
  const [pricePreview, setPricePreview]       = useState(null);
  const [orderResult, setOrderResult]         = useState(null);

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

  useEffect(() => {
    if (!checkoutProduct || !checkoutQty) return;
    apiFetch(`/orders/price?product_id=${checkoutProduct.id}&quantity=${checkoutQty}`)
      .then(setPricePreview).catch(() => {});
  }, [checkoutProduct, checkoutQty]);

  // ── AUTH ──────────────────────────────────────
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

  // ── PRODUCTS ──────────────────────────────────
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

  // ── CHECKOUT ──────────────────────────────────
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
        body: JSON.stringify({
          product_id: checkoutProduct.id,
          quantity: checkoutQty,
          payment_method: checkoutPayment,
        }),
      });
      setOrderResult(order); setPage('orderSuccess');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── MESSAGES ──────────────────────────────────
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

  // ── HELPERS ───────────────────────────────────
  const isOwner = (product) => product.farmer_id === user?.id;

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

  const navTo = (p, cb) => { if (cb) cb(); setPage(p); setMenuOpen(false); };

  // ── DELIVERY SECTION (reusable for add/edit forms) ──
  const DeliveryFields = ({ product, onChange }) => (
    <div className="delivery-section">
      <label className="delivery-label">🚚 Delivery Method</label>
      <div className="delivery-options">
        <label className={`delivery-option ${product.delivery_type === 'own' ? 'selected' : ''}`}>
          <input type="radio" name="delivery_type" value="own"
            checked={product.delivery_type === 'own'}
            onChange={() => onChange({ ...product, delivery_type: 'own', shipping_company: '' })} />
          <div>
            <strong>My Own Delivery</strong>
            <span>I will handle delivery myself</span>
          </div>
        </label>
        <label className={`delivery-option ${product.delivery_type === 'third_party' ? 'selected' : ''}`}>
          <input type="radio" name="delivery_type" value="third_party"
            checked={product.delivery_type === 'third_party'}
            onChange={() => onChange({ ...product, delivery_type: 'third_party', shipping_fee: '0' })} />
          <div>
            <strong>Third Party Shipping</strong>
            <span>Customer arranges with shipping company</span>
          </div>
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
          {SHIPPING_COMPANIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      )}
    </div>
  );

  // ── UI ────────────────────────────────────────
  return (
    <div className="site-wrapper">

      {/* NAVIGATION */}
      <nav className="main-nav">
        <div className="logo" onClick={() => setPage('home')}>JAM MARKET</div>

        <ul className="nav-links desktop-nav">
          <li onClick={() => setPage('home')}>Home</li>
          <li onClick={() => { fetchProducts(); setPage('products'); }}>Marketplace</li>
          {isLoggedIn && <li onClick={() => setPage('messages')}>Messages</li>}
          {isLoggedIn && <li onClick={() => setPage('orders')}>My Orders</li>}
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
                    <div>
                      <strong>{user?.name}</strong>
                      <span>{user?.role}</span>
                      <span>{user?.location}</span>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item" onClick={() => { setPage('orders'); setProfileOpen(false); }}>📋 My Orders</button>
                  <button className="profile-dropdown-item" onClick={() => { setPage('messages'); setProfileOpen(false); }}>💬 Messages</button>
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
            {isLoggedIn && <li onClick={() => navTo('messages')}>💬 Messages</li>}
            {isLoggedIn && <li onClick={() => navTo('orders')}>📋 My Orders</li>}
            {!isLoggedIn && <li onClick={() => navTo('login')}>🔑 Login</li>}
            {!isLoggedIn && <li onClick={() => navTo('register')}>📝 Register</li>}
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

      <div className="page-content">

        {page === 'home' && (
          <div className="hero">
            <h1>Jamaica's Fresh<br />Farm Marketplace</h1>
            <p>Buy and sell local produce directly from farmers across the island.</p>
            <button onClick={() => setPage('login')}>Get Started</button>
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
                <button className="btn-alt" onClick={() => setPage('messages')}>Check Messages</button>
                <button className="btn-alt" onClick={() => setPage('orders')}>My Orders</button>
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
                <button onClick={() => setPage('addProduct')}>+ Add Product</button>
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
                          ? `🚗 Delivery: J${parseFloat(prod.shipping_fee).toLocaleString()}`
                          : '🚗 Free delivery'}
                    </p>
                  </div>
                );
              })}
              {!loading && filteredProducts.length === 0 && <p className="no-products">No products found.</p>}
            </div>
          </div>
        )}

        {isLoggedIn && user?.role === 'farmer' && page === 'addProduct' && (
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
                <div className="price-row">
                  <span>Retail price</span>
                  <strong>J${parseFloat(selectedProduct.price).toLocaleString()}</strong>
                </div>
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
                        ? `J${parseFloat(selectedProduct.shipping_fee).toLocaleString()} (own delivery)`
                        : 'Free (own delivery)'}
                  </strong>
                </div>
              </div>
              <p><strong>Seller:</strong> {selectedProduct.farmer_name}</p>
              <p><strong>Location:</strong> {selectedProduct.location}</p>
              <p><strong>In stock:</strong> {selectedProduct.quantity} units</p>

              {/* Third party shipping info box */}
              {selectedProduct.delivery_type === 'third_party' && getShippingCompany(selectedProduct.shipping_company) && (
                <div className="shipping-info-box">
                  <p>📦 This seller uses <strong>{getShippingCompany(selectedProduct.shipping_company).label}</strong> for delivery.</p>
                  <p>After placing your order, contact them directly to arrange shipping and get their rates:</p>
                  <a href={getShippingCompany(selectedProduct.shipping_company).url}
                    target="_blank" rel="noopener noreferrer"
                    className="shipping-link">
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
                  <button onClick={() => handleCheckout(selectedProduct)}>🛒 Buy Now</button>
                )}
                {isLoggedIn && !isOwner(selectedProduct) && (
                  <button className="btn-alt" onClick={() => handleStartChat({
                    id: selectedProduct.farmer_id, name: selectedProduct.farmer_name,
                  })}>💬 Message Seller</button>
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
                  <div className="price-row">
                    <span>Unit price</span>
                    <strong>J${parseFloat(pricePreview.unit_price).toLocaleString()}</strong>
                  </div>
                  <div className="price-row">
                    <span>Subtotal</span>
                    <strong>J${parseFloat(pricePreview.subtotal).toLocaleString()}</strong>
                  </div>
                  {checkoutProduct.delivery_type === 'own' && pricePreview.shipping_fee > 0 && (
                    <div className="price-row">
                      <span>🚗 Delivery fee</span>
                      <strong>J${parseFloat(pricePreview.shipping_fee).toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="price-row total">
                    <span>Total</span>
                    <strong>J${parseFloat(pricePreview.total_price).toLocaleString()}</strong>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className={checkoutQty >= (checkoutProduct.wholesale_min_quantity || 10) && checkoutProduct.wholesale_price ? 'wholesale-badge' : 'retail-badge'}>
                      {checkoutQty >= (checkoutProduct.wholesale_min_quantity || 10) && checkoutProduct.wholesale_price ? 'Wholesale price applied' : 'Retail price'}
                    </span>
                  </div>
                </div>
              )}

              {/* Third party shipping notice at checkout */}
              {checkoutProduct.delivery_type === 'third_party' && getShippingCompany(checkoutProduct.shipping_company) && (
                <div className="shipping-info-box">
                  <p>📦 This product ships via <strong>{getShippingCompany(checkoutProduct.shipping_company).label}</strong>.</p>
                  <p>After placing your order, contact them to arrange delivery and get shipping rates:</p>
                  <a href={getShippingCompany(checkoutProduct.shipping_company).url}
                    target="_blank" rel="noopener noreferrer"
                    className="shipping-link">
                    Visit {getShippingCompany(checkoutProduct.shipping_company).label} →
                  </a>
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted-text)', marginBottom: 8, display: 'block' }}>Payment Method</label>
                <div className="payment-options">
                  {[['paypal','💳 PayPal'],['bank_transfer','🏦 Bank Transfer'],['cash_on_delivery','💵 Cash on Delivery']].map(([val, label]) => (
                    <label key={val} className={`payment-option ${checkoutPayment === val ? 'selected' : ''}`}>
                      <input type="radio" name="payment" value={val}
                        checked={checkoutPayment === val} onChange={() => setCheckoutPayment(val)} />
                      <span>{label}</span>
                    </label>
                  ))}
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
                <div className="price-row"><span>Shipping</span><strong>J${parseFloat(orderResult.order.shipping_fee || 0).toLocaleString()}</strong></div>
                <div className="price-row total"><span>Total paid</span><strong>J${parseFloat(orderResult.order.total_price).toLocaleString()}</strong></div>
                <div className="price-row"><span>Payment method</span><strong>{checkoutPayment.toUpperCase()}</strong></div>
                <div className="price-row"><span>Transaction ID</span><strong style={{ fontSize: 12 }}>{orderResult.payment.transaction_id}</strong></div>
              </div>

              {/* Third party shipping reminder on success */}
              {orderResult.delivery_type === 'third_party' && getShippingCompany(orderResult.shipping_company) && (
                <div className="shipping-info-box" style={{ marginTop: 20 }}>
                  <p>📦 Don't forget to arrange delivery with <strong>{getShippingCompany(orderResult.shipping_company).label}</strong>!</p>
                  <a href={getShippingCompany(orderResult.shipping_company).url}
                    target="_blank" rel="noopener noreferrer"
                    className="shipping-link">
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

        {isLoggedIn && page === 'messages' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>Your Messages</h2>
              {loading && <p>Loading…</p>}
              {!loading && messages.length === 0 && <p>No messages yet.</p>}
              <ul className="messages-list">
                {messages.map(m => (
                  <li key={m.id}>
                    <button onClick={() => handleStartChat({
                      id: m.sender_id === user.id ? m.receiver_id : m.sender_id,
                      name: m.other_name,
                    })}>💬 Chat with {m.other_name}</button>
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

      </div>

      <footer className="site-footer">
        <p className="footer-contact">📧 contact@jammarket.com &nbsp;|&nbsp; 📞 (876) 555-0100</p>
        <p className="footer-copy">© {new Date().getFullYear()} Jam Market. All rights reserved.</p>
      </footer>

    </div>
  );
}

// ── ORDERS PAGE ───────────────────────────────
function OrdersPage({ user }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    apiFetch('/orders/mine')
      .then(setOrders)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
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
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 13 }}>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                    <button className="btn-danger" style={{ padding: '4px 12px', fontSize: 13 }}
                      onClick={() => cancelOrder(o.id)}>Cancel</button>
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