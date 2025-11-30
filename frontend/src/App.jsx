import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [customTotal, setCustomTotal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [billSummary, setBillSummary] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [recentBills, setRecentBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [activePage, setActivePage] = useState('billing'); // billing, inventory, history, analytics
  const [analytics, setAnalytics] = useState({
    today: null,
    monthly: null,
    bestSelling: [],
  });
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [printableBill, setPrintableBill] = useState(null);
  const profileMenuRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    loadProducts();
    loadRecentBills();
    loadAnalytics();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const billTotal = useMemo(() => {
    if (customTotal !== '') {
      return Number(customTotal) || 0;
    }
    return billItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [billItems, customTotal]);

  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  }

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

  const productStats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(
      (product) => Number(product.stock) > 0 && Number(product.stock) < 10
    ).length;
    const outOfStock = products.filter(
      (product) => Number(product.stock) === 0
    ).length;
    const cartQuantity = billItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return { totalProducts, lowStock, outOfStock, cartQuantity };
  }, [products, billItems]);

  const isAdmin = Boolean(session?.token);

  function toggleProfileMenu() {
    setProfileOpen((prev) => !prev);
    setAuthError(null);
  }

  function buildPrintableBill(source) {
    if (!source) return null;
    if (source.bill && source.items) {
      return {
        id: source.bill.id,
        customer_name: source.bill.customer_name,
        total: source.bill.total,
        created_at: source.bill.created_at,
        items: source.items,
      };
    }
    return source;
  }

  function openPrintPreview(billData) {
    const normalized = buildPrintableBill(billData);
    if (!normalized) return;
    setPrintableBill(normalized);
  }

  function closePrintPreview() {
    setPrintableBill(null);
  }

  function handlePrintInvoice() {
    if (!printableBill) return;
    window.print();
  }

  function persistSession(nextSession) {
    setSession(nextSession);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to login.');
      }

      persistSession({ token: data.token, admin: data.admin });
      setAuthError(null);
      setCredentials({ username: '', password: '' });
      setProfileOpen(false);
      showFeedback('success', `Welcome back, ${data.admin.username}!`);
    } catch (error) {
      console.error(error);
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    persistSession(null);
    setCredentials({ username: '', password: '' });
    setProfileOpen(false);
    showFeedback('success', 'Logged out.');
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentBills() {
    try {
      const response = await fetch(`${API_URL}/bills`);
      if (!response.ok) {
        throw new Error('Failed to load bills');
      }
      const data = await response.json();
      setRecentBills(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadAnalytics() {
    try {
      const [todayRes, monthlyRes, bestSellingRes] = await Promise.all([
        fetch(`${API_URL}/analytics/today`),
        fetch(`${API_URL}/analytics/monthly`),
        fetch(`${API_URL}/analytics/best-selling`),
      ]);
      
      const [today, monthly, bestSelling] = await Promise.all([
        todayRes.ok ? todayRes.json() : null,
        monthlyRes.ok ? monthlyRes.json() : null,
        bestSellingRes.ok ? bestSellingRes.json() : [],
      ]);
      
      setAnalytics({ today, monthly, bestSelling });
    } catch (error) {
      console.error('Failed to load analytics', error);
    }
  }

  async function handleImageUpload(file) {
    if (!file) return null;

    if (!session?.token) {
      showFeedback('error', 'Admin login required to upload images.');
      return null;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const response = await fetch(`${API_URL}/upload/product-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      return `${API_URL.replace('/api', '')}${data.imageUrl}`;
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    const { name, price, stock } = newProduct;

    if (!name || price === '' || stock === '') {
      return showFeedback('error', 'All product fields are required.');
    }

    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to manage products.');
    }

    try {
      let finalImageUrl = null;

      // Upload image if file is selected
      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      };

      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: Number(stock),
          image_url: finalImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to save product');
      }

      const created = await response.json();
      setProducts((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewProduct({ name: '', price: '', stock: '' });
      setImageFile(null);
      showFeedback('success', `${created.name} added to inventory.`);
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to manage products.');
    }

    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            `Delete ${product.name} from inventory? This action cannot be undone.`
          );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to delete product');
      }

      setProducts((prev) => prev.filter((item) => item.id !== productId));
      showFeedback('success', `${product.name} removed from inventory.`);
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    }
  }

  async function handleDeleteBill(billId) {
    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to delete bills.');
    }

    const bill = recentBills.find((item) => item.id === billId);
    if (!bill) {
      return;
    }

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(
            `Delete bill for ${bill.customer_name}? This action cannot be undone.`
          );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/bills/${billId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to delete bill');
      }

      setRecentBills((prev) => prev.filter((item) => item.id !== billId));
      showFeedback('success', 'Bill deleted successfully.');
      await loadAnalytics();
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    }
  }

  async function handleCreateBill(event) {
    event.preventDefault();

    if (!customerName.trim()) {
      return showFeedback('error', 'Customer name is required.');
    }

    if (billItems.length === 0) {
      return showFeedback('error', 'Add at least one product to the bill.');
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          paymentMode: paymentMode,
          customTotal: customTotal !== '' ? Number(customTotal) : null,
          items: billItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unable to create bill');
      }

      const result = await response.json();
      setBillSummary(result);
      await loadRecentBills();
      await loadAnalytics();
      setCustomerName('');
      setBillItems([]);
      setPaymentMode('cash');
      setCustomTotal('');
      showFeedback('success', 'Bill created successfully.');
      await loadProducts();
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function stockLabel(stock) {
    if (stock === 0) return 'Out of stock';
    if (stock < 10) return `${stock} item${stock === 1 ? '' : 's'} left`;
    return `${stock} in stock`;
  }

  return (
    <div className="app-shell">
      <header className="hero" style={{ background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)', borderRadius: '0', marginBottom: '0', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <nav className="top-bar" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: '0', color: '#f9fafb', fontWeight: '600', background: 'linear-gradient(90deg, #818cf8 0%, #c7d2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pet Shop Billing</h1>
          </div>
          <div className="right-controls" style={{ gap: '12px', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.1)', padding: '4px', borderRadius: '10px' }}>
              <button 
                onClick={() => setActivePage('billing')}
                style={{ 
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: activePage === 'billing' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                  color: activePage === 'billing' ? '#fff' : '#d1d5db',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>☰</span> Billing
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setActivePage('inventory')}
                  style={{ 
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activePage === 'inventory' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                    color: activePage === 'inventory' ? '#fff' : '#d1d5db',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>▦</span> Inventory
                </button>
              )}
              <button 
                onClick={() => setActivePage('history')}
                style={{ 
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: activePage === 'history' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                  color: activePage === 'history' ? '#fff' : '#d1d5db',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>◰</span> History
              </button>
              <button 
                onClick={() => setActivePage('analytics')}
                style={{ 
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: 'none',
                  background: activePage === 'analytics' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                  color: activePage === 'analytics' ? '#fff' : '#d1d5db',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>◧</span> Analytics
              </button>
            </div>
            <div style={{ width: '300px' }}>
              <input
                type="text"
                placeholder="⚲ Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #4b5563',
                  background: 'rgba(31, 41, 55, 0.7)',
                  color: '#f9fafb',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            <div
              className={`profile ${profileOpen ? 'open' : ''}`}
              ref={profileMenuRef}
            >
              <button
                type="button"
                className="profile-toggle"
                onClick={toggleProfileMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  color: '#f9fafb',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <span style={{ 
                  fontSize: '1.1rem',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  ◉
                </span>
                <span className="profile-label">
                  {isAdmin && session?.admin
                    ? session.admin.username
                    : 'Admin'}
                </span>
                <span className="chevron" style={{ fontSize: '0.7rem' }}>{profileOpen ? '▲' : '▼'}</span>
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  {isAdmin && session?.admin ? (
                    <div className="profile-actions">
                      <p className="muted">Signed in as</p>
                      <strong>{session.admin.username}</strong>
                      <button
                        type="button"
                        className="ghost"
                        onClick={handleLogout}
                      >
                        Log out
                      </button>
                    </div>
                  ) : (
                    <form className="login-form" onSubmit={handleLogin}>
                      <label>
                        Username
                        <input
                          type="text"
                          value={credentials.username}
                          autoComplete="username"
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                          placeholder="admin"
                          disabled={authLoading}
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={credentials.password}
                          autoComplete="current-password"
                          onChange={(e) =>
                            setCredentials((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="••••••••"
                          disabled={authLoading}
                        />
                      </label>
                      {authError && <p className="error-text">{authError}</p>}
                      <button
                        type="submit"
                        className="primary"
                        disabled={authLoading}
                      >
                        {authLoading ? 'Signing in…' : 'Login'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {feedback && (
        <div className={`feedback ${feedback.type}`}>{feedback.message}</div>
      )}

      {activePage === 'billing' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '24px' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Create Bill</h2>
              <p className="muted">Select products and quantities to build invoice</p>
            </div>
          </div>

          <form className="form" onSubmit={handleCreateBill}>
            <label>
              Customer Name
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </label>

            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Image</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stock</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((product) => 
                      searchQuery === '' || 
                      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      product.id.toString() === searchQuery
                    )
                    .map((product) => {
                      const itemInBill = billItems.find(item => item.productId === product.id);
                      const qtyInBill = itemInBill ? itemInBill.quantity : 0;
                      
                      return (
                        <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 8px' }}>P{product.id}</td>
                          <td style={{ padding: '12px 8px' }}>
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>No img</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <strong>{product.name}</strong>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {formatCurrency(product.price)}
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={product.stock === 0 ? 'danger' : product.stock < 10 ? 'warn' : ''}>
                              {product.stock}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (qtyInBill > 0) {
                                    const updated = billItems.map(item => 
                                      item.productId === product.id 
                                        ? { ...item, quantity: item.quantity - 1 }
                                        : item
                                    ).filter(item => item.quantity > 0);
                                    setBillItems(updated);
                                    setCustomTotal('');
                                  }
                                }}
                                disabled={qtyInBill === 0}
                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', cursor: qtyInBill === 0 ? 'not-allowed' : 'pointer' }}
                              >
                                −
                              </button>
                              <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: 'bold' }}>
                                {qtyInBill}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (product.stock === 0) {
                                    showFeedback('error', `${product.name} is out of stock.`);
                                    return;
                                  }
                                  if (qtyInBill >= product.stock) {
                                    showFeedback('error', `Only ${product.stock} item(s) available.`);
                                    return;
                                  }
                                  
                                  if (qtyInBill === 0) {
                                    setBillItems([...billItems, {
                                      productId: product.id,
                                      name: product.name,
                                      image_url: product.image_url,
                                      price: Number(product.price),
                                      quantity: 1,
                                    }]);
                                  } else {
                                    const updated = billItems.map(item => 
                                      item.productId === product.id 
                                        ? { ...item, quantity: item.quantity + 1 }
                                        : item
                                    );
                                    setBillItems(updated);
                                  }
                                  setCustomTotal('');
                                }}
                                disabled={product.stock === 0}
                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', cursor: product.stock === 0 ? 'not-allowed' : 'pointer' }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3>Bill Summary</h3>
              {billItems.length === 0 ? (
                <p className="muted">No items added yet</p>
              ) : (
                <div>
                  {billItems.map((item) => (
                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{item.name} x{item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid rgba(255,255,255,0.1)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <span>Total:</span>
                    <span style={{ color: '#22c55e' }}>{formatCurrency(billTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <label>
              Custom Amount (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={customTotal}
                onChange={(e) => setCustomTotal(e.target.value)}
                onWheel={(e) => e.target.blur()}
                placeholder="Leave empty to use calculated total"
              />
            </label>

            <label>
              Payment Mode
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </label>

            <button type="submit" className="primary" disabled={submitting || billItems.length === 0}>
              {submitting ? 'Creating bill…' : 'Create bill'}
            </button>
          </form>

          {billSummary && (
            <div className="summary" style={{ marginTop: '24px', padding: '20px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <h3>✅ Bill Created Successfully!</h3>
              <p>
                <strong>{billSummary.bill.customer_name}</strong> · {new Date(billSummary.bill.created_at).toLocaleString()}
              </p>
              <p className="total" style={{ fontSize: '1.5rem', color: '#22c55e', margin: '12px 0' }}>
                Total: {formatCurrency(billSummary.bill.total)}
              </p>
              <button
                type="button"
                className="secondary"
                onClick={() => openPrintPreview(billSummary)}
              >
                Print Invoice
              </button>
            </div>
          )}
        </section>
      </main>
      )}

      {activePage === 'inventory' && isAdmin && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
        <section className="panel inventory-panel">
          <div className="panel-head">
            <div>
              <h2>Inventory</h2>
              <p className="muted">Real-time stock insights</p>
            </div>
            <button className="ghost" onClick={loadProducts} disabled={loading}>
              ↻
            </button>
          </div>
          {loading ? (
            <p className="muted">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="muted">No products yet. Add your first item below.</p>
          ) : (
            <ul className="product-list">
              {products
                .filter((product) => 
                  searchQuery === '' || 
                  product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  product.id.toString() === searchQuery
                )
                .map((product) => (
                <li key={product.id} className="product-card">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h3>P{product.id} - {product.name}</h3>
                      <p className="muted">{formatCurrency(product.price)}</p>
                    </div>
                  </div>
                  <div className="product-meta">
                    <span
                      className={`stock ${product.stock === 0 ? 'danger' : product.stock < 10 ? 'warn' : ''}`}
                    >
                      {stockLabel(Number(product.stock))}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="form" onSubmit={handleAddProduct}>
            <h3>Add product</h3>
            {!isAdmin && (
              <p className="muted note">
                Admin login required to add or edit inventory items.
              </p>
            )}
            <div className="form-grid">
              <label>
                Name
                <input
                  type="text"
                  value={newProduct.name}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Puppy food"
                  title={!isAdmin ? 'Admin login required' : undefined}
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  onWheel={(e) => e.target.blur()}
                  placeholder="350"
                  title={!isAdmin ? 'Admin login required' : undefined}
                />
              </label>
              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  value={newProduct.stock}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      stock: e.target.value,
                    }))
                  }
                  onWheel={(e) => e.target.blur()}
                  placeholder="25"
                  title={!isAdmin ? 'Admin login required' : undefined}
                />
              </label>
              <label>
                Product Image
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isAdmin || uploadingImage}
                  onChange={(e) => setImageFile(e.target.files[0])}
                  title={!isAdmin ? 'Admin login required' : undefined}
                />
                {imageFile && <p className="muted">Selected: {imageFile.name}</p>}
                {uploadingImage && <p className="muted">Uploading image...</p>}
              </label>
            </div>
            <button
              type="submit"
              className="primary"
              disabled={!isAdmin}
              title={!isAdmin ? 'Admin login required' : undefined}
            >
              Save product
            </button>
          </form>
        </section>
      </main>
      )}

      {activePage === 'history' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Bill History</h2>
              <p className="muted">View all previous bills and transactions</p>
            </div>
            <button className="ghost" onClick={loadRecentBills}>
              ↻ Refresh
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </div>

          {recentBills.length === 0 ? (
            <p className="muted">No bills yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {recentBills
                .filter((bill) => 
                  customerSearchQuery === '' || 
                  bill.customer_name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                )
                .map((bill) => (
                <article key={bill.id} style={{ 
                  padding: '20px', 
                  background: '#f9fafb', 
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '1.2rem', color: '#111827' }}>{bill.customer_name}</strong>
                      <p className="muted" style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                        {new Date(bill.created_at).toLocaleString()}
                      </p>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        padding: '4px 10px', 
                        borderRadius: '6px',
                        background: bill.payment_mode === 'cash' ? '#d1fae5' : '#dbeafe',
                        color: bill.payment_mode === 'cash' ? '#065f46' : '#1e40af',
                        display: 'inline-block',
                        marginTop: '6px',
                        fontWeight: '500'
                      }}>
                        {bill.payment_mode === 'cash' ? 'Cash' : 'Online'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                        {formatCurrency(bill.total)}
                      </span>
                      {bill.items && bill.items.length > 0 && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => openPrintPreview(bill)}
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          Print
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() => handleDeleteBill(bill.id)}
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {bill.items && bill.items.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ fontWeight: '600', marginBottom: '10px', color: '#374151', fontSize: '0.9rem' }}>Products Purchased:</p>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {bill.items.map((item) => (
                          <div key={item.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.9rem'
                          }}>
                            <span style={{ color: '#374151' }}>
                              <strong>{item.productname || item.productName}</strong> × {item.quantity}
                            </span>
                            <span style={{ color: '#6b7280' }}>
                              {formatCurrency(item.price)} each = <strong style={{ color: '#111827' }}>{formatCurrency(item.price * item.quantity)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      )}

      {activePage === 'analytics' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Analytics Dashboard</h2>
              <p className="muted">Sales insights and performance metrics</p>
            </div>
            <button className="ghost" onClick={loadAnalytics}>
              ↻ Refresh
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <article style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p className="muted" style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>Today's Collection</p>
              <strong style={{ fontSize: '1.8rem', display: 'block', color: '#111827' }}>{formatCurrency(analytics.today?.total_amount || 0)}</strong>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{analytics.today?.total_bills || 0} bills</span>
              <div style={{ fontSize: '0.8rem', marginTop: '8px', color: '#6b7280' }}>
                <div>Cash: {formatCurrency(analytics.today?.cash_amount || 0)}</div>
                <div>Online: {formatCurrency(analytics.today?.online_amount || 0)}</div>
              </div>
            </article>
            
            <article style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <p className="muted" style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>Monthly Collection</p>
              <strong style={{ fontSize: '1.8rem', display: 'block', color: '#111827' }}>{formatCurrency(analytics.monthly?.total_amount || 0)}</strong>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{analytics.monthly?.total_bills || 0} bills</span>
              <div style={{ fontSize: '0.8rem', marginTop: '8px', color: '#6b7280' }}>
                <div>Cash: {formatCurrency(analytics.monthly?.cash_amount || 0)}</div>
                <div>Online: {formatCurrency(analytics.monthly?.online_amount || 0)}</div>
              </div>
            </article>
          </div>

          <div>
            <h3>Best Selling Products</h3>
            {analytics.bestSelling.length === 0 ? (
              <p className="muted">No sales data available yet.</p>
            ) : (
              <ul className="product-list">
                {analytics.bestSelling.map((product) => (
                  <li key={product.id} className="product-card">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {product.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div>
                        <h3>P{product.id} - {product.name}</h3>
                        <p className="muted">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                    <div className="product-meta">
                      <div>
                        <div><strong>{product.total_quantity}</strong> units sold</div>
                        <div><strong>{product.times_sold}</strong> orders</div>
                        <div>Revenue: <strong>{formatCurrency(product.total_revenue)}</strong></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      )}

      {printableBill && (
        <div className="print-overlay">
          <div className="print-card print-target" ref={printRef}>
            <header className="print-header">
              <div>
                <p className="eyebrow">WhiskerWorks</p>
                <h2>Invoice</h2>
              </div>
              <div className="invoice-meta">
                <p>
                  <strong>Invoice #</strong> {printableBill.id}
                </p>
                <p>
                  <strong>Date</strong> {formatDateTime(printableBill.created_at)}
                </p>
              </div>
            </header>

            <section className="invoice-section">
              <p>
                <strong>Bill to:</strong> {printableBill.customer_name}
              </p>
              <p>
                <strong>Store:</strong> WhiskerWorks Pet Supplies, Bengaluru
              </p>
            </section>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {printableBill.items?.map((item) => {
                  const lineTotal =
                    Number(item.price || 0) * Number(item.quantity || 0);
                  return (
                    <tr key={item.id || item.productId}>
                      <td>{item.productName || item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="invoice-summary">
              <span>Total due</span>
              <strong>{formatCurrency(printableBill.total)}</strong>
            </div>

            <p className="muted">
              Thank you for shopping with us! Please contact us for any
              questions regarding this invoice.
            </p>
          </div>
          <div className="print-controls no-print">
            <button type="button" className="secondary" onClick={handlePrintInvoice}>
              Print invoice
            </button>
            <button type="button" className="ghost" onClick={closePrintPreview}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
