import './App.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE = 'https://jam-market-main-1.onrender.com/api';

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
  const profileRef                            = useRef(null);
  const [newProduct, setNewProduct]           = useState({
    name: '', price: '', wholesale_price: '', wholesale_min_quantity: '10',
    description: '', location: '', quantity: '1', shipping_fee: '0'
  });

  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutQty, setCheckoutQty]         = useState(1);
  const [checkoutPayment, setCheckoutPayment] = useState('paypal');
  const [pricePreview, setPricePreview]       = useState(null);
  const [orderResult, setOrderResult]         = useState(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Restore session
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
    setProfileOpen(false); setPage('home');
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
          shipping_fee: parseFloat(newProduct.shipping_fee) || 0,
        }),
      });
      setNewProduct({ name: '', price: '', wholesale_price: '', wholesale_min_quantity: '10', description: '', location: '', quantity: '1', shipping_fee: '0' });
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
          shipping_fee: parseFloat(selectedProduct.shipping_fee) || 0,
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
        body: JSON.stringify({ product_id: checkoutProduct.id, quantity: checkoutQty, payment_method: checkoutPayment }),
      });
      const payment = await apiFetch('/payments/simulate', {
        method: 'POST',
        body: JSON.stringify({ order_id: order.id, gateway: checkoutPayment }),
      });
      setOrderResult({ order, payment }); setPage('orderSuccess'); await fetchProducts();
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

  // ── UI ────────────────────────────────────────
  return (
    <div className="site-wrapper">

      {/* NAVIGATION */}
      <nav className="main-nav">
        <div className="logo" onClick={() => setPage('home')}>JAM MARKET</div>
        <ul className="nav-links">
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
            /* Profile icon dropdown */
            <div className="profile-wrapper" ref={profileRef}>
              <button className="profile-icon-btn" onClick={() => setProfileOpen(o => !o)}>
                <div className="profile-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
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
                  <button className="profile-dropdown-item" onClick={() => { setPage('orders'); setProfileOpen(false); }}>
                    📋 My Orders
                  </button>
                  <button className="profile-dropdown-item" onClick={() => { setPage('messages'); setProfileOpen(false); }}>
                    💬 Messages
                  </button>
                  <div className="profile-dropdown-divider" />
                  <button className="profile-dropdown-item danger" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

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
                    {prod.shipping_fee > 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                        🚚 Shipping: J${parseFloat(prod.shipping_fee).toLocaleString()}
                      </p>
                    )}
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
              <input placeholder="Shipping & handling fee (JMD)" type="number" min="0" step="0.01"
                value={newProduct.shipping_fee}
                onChange={e => setNewProduct({ ...newProduct, shipping_fee: e.target.value })} />
              <input placeholder="Location" value={newProduct.location}
                onChange={e => setNewProduct({ ...newProduct, location: e.target.value })} required />
              <textarea placeholder="Description" value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} required />
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
                {selectedProduct.shipping_fee > 0 && (
                  <div className="price-row">
                    <span>🚚 Shipping & handling</span>
                    <strong>J${parseFloat(selectedProduct.shipping_fee).toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <p><strong>Seller:</strong> {selectedProduct.farmer_name}</p>
              <p><strong>Location:</strong> {selectedProduct.location}</p>
              <p><strong>In stock:</strong> {selectedProduct.quantity} units</p>
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

        {selectedProduct && page === 'editProduct' && (
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
              <input placeholder="Shipping & handling fee (JMD)" type="number" min="0" step="0.01"
                value={selectedProduct.shipping_fee || '0'}
                onChange={e => setSelectedProduct({ ...selectedProduct, shipping_fee: e.target.value })} />
              <input placeholder="Location" value={selectedProduct.location}
                onChange={e => setSelectedProduct({ ...selectedProduct, location: e.target.value })} required />
              <textarea placeholder="Description" value={selectedProduct.description}
                onChange={e => setSelectedProduct({ ...selectedProduct, description: e.target.value })} required />
              <button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" className="btn-alt" onClick={() => setPage('products')}>Cancel</button>
            </form>
          </section>
        )}

        {/* CHECKOUT */}
        {isLoggedIn && checkoutProduct && page === 'checkout' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handlePlaceOrder}>
              <h2>Checkout</h2>
              <div className="checkout-product">
                <strong>{checkoutProduct.name}</strong>
                <span>Seller: {checkoutProduct.farmer_name}</span>
              </div>
              <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-green)' }}>Quantity</label>
              <input type="number" min="1" max={checkoutProduct.quantity}
                value={checkoutQty}
                onChange={e => setCheckoutQty(parseInt(e.target.value) || 1)} required />

              {pricePreview && (
                <div className="price-preview">
                  <div className="price-row">
                    <span>Price type</span>
                    <strong className={pricePreview.price_type === 'wholesale' ? 'wholesale-badge' : 'retail-badge'}>
                      {pricePreview.price_type === 'wholesale' ? '🏷 Wholesale' : '🛒 Retail'}
                    </strong>
                  </div>
                  <div className="price-row">
                    <span>Unit price</span>
                    <strong>J${parseFloat(pricePreview.unit_price).toLocaleString()}</strong>
                  </div>
                  <div className="price-row">
                    <span>Subtotal ({checkoutQty} units)</span>
                    <strong>J${parseFloat(pricePreview.subtotal).toLocaleString()}</strong>
                  </div>
                  <div className="price-row">
                    <span>🚚 Shipping & handling</span>
                    <strong>J${parseFloat(pricePreview.shipping_fee).toLocaleString()}</strong>
                  </div>
                  <div className="price-row">
                    <span>Tax</span>
                    <strong style={{ color: 'var(--muted-text)', fontSize: 13 }}>
                      {pricePreview.tax_rate > 0
                        ? `J${parseFloat(pricePreview.tax_amount).toLocaleString()} (${(pricePreview.tax_rate * 100).toFixed(0)}%)`
                        : '— (not yet applied)'}
                    </strong>
                  </div>
                  <div className="price-row total">
                    <span>Total</span>
                    <strong>J${parseFloat(pricePreview.total_price).toLocaleString()}</strong>
                  </div>
                  {pricePreview.price_type === 'retail' && pricePreview.wholesale_price && (
                    <p style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 6 }}>
                      💡 Order {pricePreview.wholesale_min_quantity}+ units to get wholesale price of J${parseFloat(pricePreview.wholesale_price).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-green)' }}>Payment Method</label>
              <div className="payment-options">
                {[['paypal','💳 PayPal (Sandbox)'],['wipay','🇯🇲 WiPay (Sandbox)'],['cash','💵 Cash on Delivery']].map(([val, label]) => (
                  <label key={val} className={`payment-option ${checkoutPayment === val ? 'selected' : ''}`}>
                    <input type="radio" name="payment" value={val}
                      checked={checkoutPayment === val} onChange={() => setCheckoutPayment(val)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button type="submit" disabled={loading}>
                {loading ? 'Processing…' : `Pay J$${pricePreview ? parseFloat(pricePreview.total_price).toLocaleString() : '...'}`}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('productDetails')}>Cancel</button>
            </form>
          </section>
        )}

        {/* ORDER SUCCESS */}
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
                <div className="price-row"><span>Tax</span><strong>— (not yet applied)</strong></div>
                <div className="price-row total"><span>Total paid</span><strong>J${parseFloat(orderResult.order.total_price).toLocaleString()}</strong></div>
                <div className="price-row"><span>Payment method</span><strong>{checkoutPayment.toUpperCase()}</strong></div>
                <div className="price-row"><span>Transaction ID</span><strong style={{ fontSize: 12 }}>{orderResult.payment.transaction_id}</strong></div>
              </div>
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
        <table className="order-table">
          <thead>
            <tr>
              <th>#</th><th>Product</th><th>Qty</th><th>Total</th>
              <th>Payment</th><th>Status</th>
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
                    onClick={() => cancelOrder(o.id)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;