import './App.css';
import React, { useState, useEffect, useCallback } from 'react';

// ─── API CLIENT ───────────────────────────────────────────────────────────────
const BASE = 'http://localhost:5000/api';

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

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  // --- STATE ---
  const [page, setPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null); // { id, name }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Restore session on page load
  useEffect(() => {
    const token = localStorage.getItem('jm_token');
    const savedUser = localStorage.getItem('jm_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch products whenever user logs in or visits marketplace
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/products');
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchProducts();
  }, [isLoggedIn, fetchProducts]);

  // Fetch inbox whenever messages page is opened
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/messages/inbox');
      // Shape: [{ id, sender_id, receiver_id, message, sent_at, other_name }]
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && page === 'messages') fetchInbox();
  }, [isLoggedIn, page, fetchInbox]);

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { email, password } = Object.fromEntries(new FormData(e.target));
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('jm_token', data.token);
      localStorage.setItem('jm_user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoggedIn(true);
      setPage('welcome');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { name, role, location, email, password } = Object.fromEntries(new FormData(e.target));
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, role, location, email, password }),
      });
      // Auto-login after register: get a token
      const loginData = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('jm_token', loginData.token);
      localStorage.setItem('jm_user', JSON.stringify(loginData.user));
      setUser(loginData.user);
      setIsLoggedIn(true);
      setPage('welcome');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const handleLogout = () => {
    localStorage.removeItem('jm_token');
    localStorage.removeItem('jm_user');
    setUser(null);
    setIsLoggedIn(false);
    setProducts([]);
    setMessages([]);
    setPage('home');
  };

  // --- PRODUCT CRUD ---
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', location: '' });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          quantity: 1, // you can add a quantity field to the form later
        }),
      });
      setNewProduct({ name: '', price: '', description: '', location: '' });
      await fetchProducts();
      setPage('products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    setError('');
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      setSelectedProduct(null);
      await fetchProducts();
      setPage('products');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/products/${selectedProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: selectedProduct.name,
          price: parseFloat(selectedProduct.price),
          description: selectedProduct.description,
          location: selectedProduct.location,
          quantity: selectedProduct.quantity ?? 1,
        }),
      });
      await fetchProducts();
      setSelectedProduct(null);
      setPage('products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SEARCH FILTER (local, backed by full product list from server) ---
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.farmer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // --- MESSAGING ---
  const [chatThread, setChatThread] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const fetchConversation = async (otherUserId) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/messages/${otherUserId}`);
      setChatThread(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (otherUser) => {
    // otherUser: { id, name }
    setChatUser(otherUser);
    await fetchConversation(otherUser.id);
    setPage('chat');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setError('');
    try {
      const sent = await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: chatUser.id, message: newMessage }),
      });
      setChatThread(prev => [...prev, { ...sent, sender_id: user.id }]);
      setNewMessage('');
    } catch (err) {
      setError(err.message);
    }
  };

  // --- HELPERS ---
  const isOwner = (product) => product.farmer_id === user?.id;

  // --- UI ---
  return (
    <div className="site-wrapper">

      {/* NAVIGATION */}
      <nav className="main-nav">
        <div className="logo" onClick={() => setPage('home')}>JAM MARKET</div>
        <ul className="nav-links">
          <li onClick={() => setPage('home')}>Home</li>
          <li onClick={() => { fetchProducts(); setPage('products'); }}>Marketplace</li>
          {isLoggedIn && <li onClick={() => setPage('messages')}>Messages</li>}
        </ul>
        <div className="auth-buttons">
          {!isLoggedIn ? (
            <>
              <button className="btn-login" onClick={() => setPage('login')}>Login</button>
              <button className="btn-login" onClick={() => setPage('register')}>Register</button>
            </>
          ) : (
            <button className="btn-login" onClick={handleLogout}>Logout</button>
          )}
        </div>
      </nav>

      {/* GLOBAL ERROR BANNER */}
      {error && (
        <div style={{
          background: 'var(--color-background-danger, #fee2e2)',
          color: 'var(--color-text-danger, #991b1b)',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >✕</button>
        </div>
      )}

      <div className="page-content">

        {/* HOME PAGE */}
        {page === 'home' && (
          <div className="hero">
            <h1>Jamaica's Fresh<br />Farm Marketplace</h1>
            <p>Buy and sell local produce directly from farmers across the island.</p>
            <button onClick={() => setPage('login')}>Get Started</button>
          </div>
        )}

        {/* LOGIN PAGE */}
        {page === 'login' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Account Login</h2>
              <input name="email" type="email" placeholder="Email address" required />
              <input name="password" type="password" placeholder="Password" required />
              <button type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Enter Market'}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('register')}>
                No account? Register
              </button>
            </form>
          </section>
        )}

        {/* REGISTER PAGE */}
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
              <input name="password" type="password" placeholder="Password" required />
              <button type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('login')}>
                Already registered? Login
              </button>
            </form>
          </section>
        )}

        {/* DASHBOARD / WELCOME PAGE */}
        {isLoggedIn && page === 'welcome' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h1>Welcome back, {user?.name}! 👋</h1>
              <p>You are logged in as a <strong>{user?.role}</strong>.</p>
              <div className="quick-stats">
                <div className="stat"><span>📍</span> {user?.location || 'Location not set'}</div>
              </div>
              <div className="welcome-actions">
                <button onClick={() => { fetchProducts(); setPage('products'); }}>Go to Marketplace</button>
                <button className="btn-alt" onClick={() => setPage('messages')}>Check Messages</button>
              </div>
            </div>
          </section>
        )}

        {/* MARKETPLACE PAGE */}
        {page === 'products' && (
          <div className="product-view">
            <h2>Marketplace</h2>
            <div className="market-controls">
              <input
                placeholder="Search products, sellers, locations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {isLoggedIn && user?.role === 'farmer' && (
                <button onClick={() => setPage('addProduct')}>+ Add Product</button>
              )}
            </div>
            {loading && <p style={{ textAlign: 'center', padding: 24 }}>Loading products…</p>}
            <div className="prod-grid">
              {filteredProducts.map(prod => (
                <div
                  className="prod-card"
                  key={prod.id}
                  onClick={() => { setSelectedProduct(prod); setPage('productDetails'); }}
                >
                  <h3>{prod.name}</h3>
                  <p>{prod.description}</p>
                  <p><strong>Price:</strong> ${prod.price}</p>
                  <p><strong>Seller:</strong> {prod.farmer_name}</p>
                  <p><strong>Location:</strong> {prod.location}</p>
                </div>
              ))}
              {!loading && filteredProducts.length === 0 && (
                <p className="no-products">No products found.</p>
              )}
            </div>
          </div>
        )}

        {/* ADD PRODUCT PAGE — farmers only */}
        {isLoggedIn && user?.role === 'farmer' && page === 'addProduct' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleAddProduct}>
              <h2>Add New Product</h2>
              <input
                placeholder="Product name"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
              <input
                placeholder="Price (JMD)"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                required
              />
              <input
                placeholder="Location"
                value={newProduct.location}
                onChange={e => setNewProduct({ ...newProduct, location: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Adding…' : 'Add Product'}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('products')}>Cancel</button>
            </form>
          </section>
        )}

        {/* PRODUCT DETAILS PAGE */}
        {selectedProduct && page === 'productDetails' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              <p><strong>Price:</strong> ${selectedProduct.price}</p>
              <p><strong>Seller:</strong> {selectedProduct.farmer_name}</p>
              <p><strong>Location:</strong> {selectedProduct.location}</p>
              <div className="product-detail-actions">
                {isLoggedIn && isOwner(selectedProduct) && (
                  <>
                    <button onClick={() => setPage('editProduct')}>Edit</button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteProduct(selectedProduct.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
                {isLoggedIn && !isOwner(selectedProduct) && (
                  <button onClick={() => handleStartChat({
                    id: selectedProduct.farmer_id,
                    name: selectedProduct.farmer_name,
                  })}>
                    Message Seller
                  </button>
                )}
                <button className="btn-alt" onClick={() => setPage('products')}>Back to Marketplace</button>
              </div>
            </div>
          </section>
        )}

        {/* EDIT PRODUCT PAGE */}
        {selectedProduct && page === 'editProduct' && (
          <section className="auth-container">
            <form className="auth-form" onSubmit={handleEditProduct}>
              <h2>Edit Product</h2>
              <input
                placeholder="Product name"
                value={selectedProduct.name}
                onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                required
              />
              <input
                placeholder="Price (JMD)"
                type="number"
                min="0"
                step="0.01"
                value={selectedProduct.price}
                onChange={e => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
                required
              />
              <input
                placeholder="Location"
                value={selectedProduct.location}
                onChange={e => setSelectedProduct({ ...selectedProduct, location: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={selectedProduct.description}
                onChange={e => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn-alt" onClick={() => setPage('products')}>Cancel</button>
            </form>
          </section>
        )}

        {/* MESSAGES INBOX PAGE */}
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
                    })}>
                      💬 Chat with {m.other_name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* CHAT PAGE */}
        {isLoggedIn && page === 'chat' && (
          <section className="welcome-screen">
            <div className="welcome-card">
              <h2>Chat with {chatUser?.name}</h2>
              {loading && <p>Loading messages…</p>}
              <div className="chat-thread">
                {chatThread.map((msg, idx) => (
                  <div
                    key={idx}
                    className="chat-message"
                    style={{
                      textAlign: msg.sender_id === user.id ? 'right' : 'left',
                    }}
                  >
                    <strong>{msg.sender_id === user.id ? 'You' : chatUser?.name}:</strong>{' '}
                    {msg.message}
                  </div>
                ))}
                {!loading && chatThread.length === 0 && (
                  <p style={{ color: 'var(--muted-text)', textAlign: 'center', margin: 'auto' }}>
                    No messages yet. Say hello!
                  </p>
                )}
              </div>
              <form className="chat-form" onSubmit={handleSendMessage}>
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message…"
                  required
                />
                <button type="submit">Send</button>
              </form>
              <div style={{ marginTop: 16 }}>
                <button className="btn-alt" onClick={() => setPage('messages')}>← Back to Messages</button>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* FOOTER */}
      <footer className="site-footer">
        <p className="footer-contact">📧 contact@jammarket.com &nbsp;|&nbsp; 📞 (876) 555-0100</p>
        <p className="footer-copy">© {new Date().getFullYear()} Jam Market. All rights reserved.</p>
      </footer>

    </div>
  );
}

export default App;