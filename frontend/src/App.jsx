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
    image_url: '' // Add image_url to the state
  });
  const [billItems, setBillItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [customTotal, setCustomTotal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [billSummary, setBillSummary] = useState(null);
  const [recentBills, setRecentBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [activePage, setActivePage] = useState('billing'); // billing, inventory, history, analytics, low-stock
  const [analytics, setAnalytics] = useState({
    today: null,
    monthly: null,
    bestSelling: [],
  });
  const [stockUpdates, setStockUpdates] = useState([]);
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [printableBill, setPrintableBill] = useState(null);
  const [stockUpdateModal, setStockUpdateModal] = useState({
    isOpen: false,
    productId: null,
    productName: '',
    currentStock: 0,
    newStock: ''
  });
  const [pdfDownload, setPdfDownload] = useState({
    isGenerating: false,
    type: null // 'daily' or 'monthly'
  });
  const [monthlyReportParams, setMonthlyReportParams] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [showMonthlySelector, setShowMonthlySelector] = useState(false);
  const profileMenuRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    loadProducts();
    loadRecentBills();
    loadAnalytics();
    loadStockUpdates();
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
    // Redirect to billing page when logging out
    setActivePage('billing');
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

  async function loadStockUpdates() {
    if (!isAdmin || !session?.token) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/stock-updates`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load stock updates');
      }
      
      const data = await response.json();
      setStockUpdates(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    const { name, price, stock, image_url } = newProduct;

    if (!name || price === '' || stock === '') {
      return showFeedback('error', 'All product fields are required.');
    }

    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to manage products.');
    }

    try {
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
          image_url: image_url || null, // Use the image_url directly
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
      setNewProduct({ name: '', price: '', stock: '', image_url: '' }); // Reset image_url as well
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

  async function handleUpdateStock(productId, currentStock, productName) {
    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to update stock.');
    }

    // Open the custom modal instead of using prompt
    setStockUpdateModal({
      isOpen: true,
      productId,
      productName: productName || '',
      currentStock,
      newStock: currentStock.toString()
    });
  }

  async function submitStockUpdate() {
    const { productId, newStock } = stockUpdateModal;
    
    const stockValue = parseInt(newStock);
    
    if (isNaN(stockValue) || stockValue < 0) {
      showFeedback('error', 'Please enter a valid non-negative number for stock.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ stock: stockValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to update stock');
      }

      const updatedProduct = await response.json();
      
      // Update the product in the local state
      setProducts(prev => prev.map(product => 
        product.id === productId ? updatedProduct : product
      ));
      
      // Close the modal
      setStockUpdateModal({
        isOpen: false,
        productId: null,
        productName: '',
        currentStock: 0,
        newStock: ''
      });
      
      showFeedback('success', `Stock updated to ${stockValue} for ${updatedProduct.name}.`);
    } catch (error) {
      console.error(error);
      showFeedback('error', error.message);
    }
  }

  // Generate PDF for analytics data
  async function generateAnalyticsPDF(type) {
    if (!isAdmin || !session?.token) {
      return showFeedback('error', 'Admin login required to download analytics.');
    }

    // For monthly reports, show selector first
    if (type === 'monthly' && !showMonthlySelector) {
      setShowMonthlySelector(true);
      return;
    }

    setPdfDownload({ isGenerating: true, type });
    
    try {
      // Load detailed analytics data based on type
      let reportData;
      
      if (type === 'daily') {
        const response = await fetch(`${API_URL}/analytics/daily-sales`);
        if (!response.ok) throw new Error('Failed to fetch daily sales data');
        reportData = await response.json();
      } else {
        // For monthly reports, use selected parameters
        const queryParams = new URLSearchParams({
          month: monthlyReportParams.month,
          year: monthlyReportParams.year
        });
        const response = await fetch(`${API_URL}/analytics/monthly-sales?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch monthly sales data');
        reportData = await response.json();
      }
      
      // Create a printable HTML structure
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pet Shop ${type === 'daily' ? 'Daily' : 'Monthly'} Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #22c55e; padding-bottom: 15px; }
            .section { margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #f9fafb; }
            .card-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #111827; }
            .amount { font-size: 28px; font-weight: bold; color: #22c55e; margin: 10px 0; }
            .bills { font-size: 16px; color: #666; margin: 5px 0; }
            .payment-details { margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; }
            .product-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .product-table th { background: #f1f5f9; padding: 12px; text-align: left; border: 1px solid #ddd; }
            .product-table td { padding: 10px; border: 1px solid #ddd; }
            .product-table tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
            h1, h2, h3 { color: #111827; }
            .highlight { background: #dcfce7; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pet Shop ${type === 'daily' ? 'Daily' : 'Monthly'} Sales Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            ${type === 'daily' ? 
              `<p>Report for: ${reportData.date ? new Date(reportData.date).toLocaleDateString() : 'Today'}</p>` : 
              `<p>Report for: ${reportData.month}/${reportData.year}</p>`}
          </div>
          
          <div class="section">
            <h2>Sales Summary</h2>
            <div class="grid">
              <div class="card">
                <div class="card-title">Total Collection</div>
                <div class="amount">${formatCurrency(reportData.summary?.total_amount || 0)}</div>
                <div class="bills">${reportData.summary?.total_bills || 0} bills processed</div>
                <div class="payment-details">
                  <p><strong>Payment Methods:</strong></p>
                  <p>Cash: ${formatCurrency(reportData.summary?.cash_amount || 0)}</p>
                  <p>Online: ${formatCurrency(reportData.summary?.online_amount || 0)}</p>
                </div>
              </div>
              
              <div class="card">
                <div class="card-title">Products Sold</div>
                <div class="amount">${reportData.products?.reduce((sum, product) => sum + (product.quantity_sold || 0), 0) || 0} items</div>
                <div class="bills">${reportData.products?.length || 0} different products</div>
                <div class="payment-details">
                  <p><strong>Top Product:</strong></p>
                  ${reportData.products && reportData.products.length > 0 ? 
                    `<p>${reportData.products[0].name} (${reportData.products[0].quantity_sold} units)</p>` : 
                    '<p>No products sold</p>'
                  }
                </div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Detailed Product Sales</h2>
            ${reportData.products && reportData.products.length > 0 ? `
              <table class="product-table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th>Quantity Sold</th>
                    <th>Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.products.map(product => `
                    <tr>
                      <td>P${product.id}</td>
                      <td>${product.name}</td>
                      <td class="highlight">${product.quantity_sold}</td>
                      <td>${formatCurrency(product.revenue)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <p>No products sold during this period.</p>
            `}
          </div>
          
          <div class="footer">
            <p>Report generated by Pet Shop Billing System</p>
            <p>This report includes all sales data for ${type === 'daily' ? 
              (reportData.date ? new Date(reportData.date).toLocaleDateString() : 'today') : 
              `${reportData.month}/${reportData.year}`}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              // Optionally close the window after printing
              // window.close();
            }
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      showFeedback('success', `${type === 'daily' ? 'Daily' : 'Monthly'} sales report generated successfully.`);
      
      // Reset monthly selector state
      if (type === 'monthly') {
        setShowMonthlySelector(false);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      showFeedback('error', `Failed to generate ${type} sales report.`);
    } finally {
      setPdfDownload({ isGenerating: false, type: null });
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

    // Make customer name optional
    // if (!customerName.trim()) {
    //   return showFeedback('error', 'Customer name is required.');
    // }

    if (billItems.length === 0) {
      return showFeedback('error', 'Add at least one product to the bill.');
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Allow empty customer name
          customerName: customerName.trim() || 'Anonymous Customer',
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
              {isAdmin && (
                <button 
                  onClick={() => setActivePage('low-stock')}
                  style={{ 
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activePage === 'low-stock' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                    color: activePage === 'low-stock' ? '#fff' : '#d1d5db',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>⚠</span> Low Stock
                </button>
              )}
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
              Customer Name (Optional)
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name (optional)"
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
                                      price: product.price,
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
                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', cursor: 'pointer' }}
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

            <label>
              Custom Total (Optional)
              <input
                type="number"
                value={customTotal}
                onChange={(e) => setCustomTotal(e.target.value)}
                placeholder="Enter custom total (optional)"
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

            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating bill...' : 'Create Bill'}
            </button>
          </form>
        </section>

        {billSummary && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Bill Summary</h2>
                <p className="muted">Review and confirm the bill details</p>
              </div>
              <button className="ghost" onClick={() => setBillSummary(null)}>
                <span style={{ fontSize: '1rem' }}>🗑</span> Clear
              </button>
            </div>

            <div className="bill-summary">
              <div className="bill-summary-item">
                <strong>Customer Name:</strong>
                <span>{billSummary.customer_name}</span>
              </div>
              <div className="bill-summary-item">
                <strong>Total Amount:</strong>
                <span>{formatCurrency(billSummary.total)}</span>
              </div>
              <div className="bill-summary-item">
                <strong>Payment Mode:</strong>
                <span>{billSummary.payment_mode}</span>
              </div>
              <div className="bill-summary-item">
                <strong>Items:</strong>
                <ul>
                  {billSummary.items.map((item) => (
                    <li key={item.product_id}>
                      <strong>P{item.product_id}</strong> - {item.name} (Qty: {item.quantity})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bill-summary-item">
                <strong>Date:</strong>
                <span>{formatDateTime(billSummary.created_at)}</span>
              </div>
            </div>

            <button className="primary" onClick={() => openPrintPreview(billSummary)}>
              <span style={{ fontSize: '1rem' }}>⎙</span> Print Invoice
            </button>
          </section>
        )}
      </main>
      )}

      {activePage === 'inventory' && isAdmin && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Inventory Management</h2>
                <p className="muted">Add, update, or delete products</p>
              </div>
              <button className="ghost" onClick={loadProducts}>
                <span style={{ fontSize: '1rem' }}>↻</span> Refresh
              </button>
            </div>

            <form className="form" onSubmit={handleAddProduct}>
              <label>
                Product Name
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </label>

              <label>
                Price
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="Enter product price"
                />
              </label>

              <label>
                Stock
                <input
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="Enter product stock"
                />
              </label>

              <label>
                Image URL (Optional)
                <input
                  type="text"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  placeholder="Enter image URL (optional)"
                />
              </label>

              <button type="submit">
                <span style={{ fontSize: '1rem' }}>+</span> Add Product
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Image</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stock</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
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
                            onClick={() => handleUpdateStock(product.id, product.stock, product.name)}
                            style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '1rem' }}>+</span> Update Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '1rem' }}>🗑</span> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {activePage === 'history' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Bill History</h2>
                <p className="muted">Recently created bills</p>
              </div>
              <button className="ghost" onClick={loadRecentBills}>
                <span style={{ fontSize: '1rem' }}>↻</span> Refresh
              </button>
            </div>
            
            {recentBills.length === 0 ? (
              <p className="muted">No bills created yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Customer Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Total Amount</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Payment Mode</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.map((bill) => (
                      <tr key={bill.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px' }}>B{bill.id}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <strong>{bill.customer_name}</strong>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {formatCurrency(bill.total)}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {bill.payment_mode}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {formatDateTime(bill.created_at)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => openPrintPreview(bill)}
                              style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', cursor: 'pointer' }}
                            >
                              <span style={{ fontSize: '1rem' }}>⎙</span> Print Invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBill(bill.id)}
                              style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <span style={{ fontSize: '1rem' }}>🗑</span> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {activePage === 'analytics' && isAdmin && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Analytics</h2>
                <p className="muted">Sales and inventory insights</p>
              </div>
              <button className="ghost" onClick={loadAnalytics}>
                <span style={{ fontSize: '1rem' }}>↻</span> Refresh
              </button>
            </div>

            <div className="analytics">
              <div className="analytics-section">
                <h3>Today's Sales</h3>
                <div className="analytics-card">
                  <div className="analytics-card-title">Total Collection</div>
                  <div className="analytics-card-amount">{formatCurrency(analytics.today?.total_amount || 0)}</div>
                  <div className="analytics-card-bills">{analytics.today?.total_bills || 0} bills processed</div>
                  <div className="analytics-card-payment-details">
                    <p><strong>Payment Methods:</strong></p>
                    <p>Cash: {formatCurrency(analytics.today?.cash_amount || 0)}</p>
                    <p>Online: {formatCurrency(analytics.today?.online_amount || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="analytics-section">
                <h3>Monthly Sales</h3>
                <div className="analytics-card">
                  <div className="analytics-card-title">Total Collection</div>
                  <div className="analytics-card-amount">{formatCurrency(analytics.monthly?.total_amount || 0)}</div>
                  <div className="analytics-card-bills">{analytics.monthly?.total_bills || 0} bills processed</div>
                  <div className="analytics-card-payment-details">
                    <p><strong>Payment Methods:</strong></p>
                    <p>Cash: {formatCurrency(analytics.monthly?.cash_amount || 0)}</p>
                    <p>Online: {formatCurrency(analytics.monthly?.online_amount || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="analytics-section">
                <h3>Best Selling Products</h3>
                <div className="analytics-card">
                  <div className="analytics-card-title">Top Products</div>
                  <div className="analytics-card-products">
                    {analytics.bestSelling.map((product) => (
                      <div key={product.id} className="analytics-card-product">
                        <strong>P{product.id}</strong> - {product.name} ({product.quantity_sold} units)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-actions">
              <button className="primary" onClick={() => generateAnalyticsPDF('daily')}>
                <span style={{ fontSize: '1rem' }}>⎙</span> Generate Daily Report
              </button>
              <button className="primary" onClick={() => generateAnalyticsPDF('monthly')}>
                <span style={{ fontSize: '1rem' }}>⎙</span> Generate Monthly Report
              </button>
            </div>
          </section>
        </main>
      )}

      {activePage === 'low-stock' && isAdmin && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Low Stock Products</h2>
                <p className="muted">Products with low stock levels</p>
              </div>
              <button className="ghost" onClick={loadProducts}>
                <span style={{ fontSize: '1rem' }}>↻</span> Refresh
              </button>
            </div>
            
            {products.filter(product => product.stock < 10).length === 0 ? (
              <p className="muted">No products with low stock levels.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Image</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Product Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Price</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Stock</th>
                      <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products
                      .filter(product => product.stock < 10)
                      .map((product) => (
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
                                onClick={() => handleUpdateStock(product.id, product.stock, product.name)}
                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', color: '#22c55e', cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '1rem' }}>+</span> Update Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product.id)}
                                style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '1rem' }}>🗑</span> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {activePage === 'stock-updates' && isAdmin && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', width: '100%' }}>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Stock Update History</h2>
                <p className="muted">Recently updated stock quantities</p>
              </div>
              <button className="ghost" onClick={loadStockUpdates}>
                <span style={{ fontSize: '1rem' }}>↻</span> Refresh
              </button>
            </div>
            
            {stockUpdates.length === 0 ? (
              <p className="muted">No stock updates recorded yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Product</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Old Stock</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>New Stock</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Change</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Updated By</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockUpdates.map((update) => {
                      const change = update.new_stock - update.old_stock;
                      const isIncrease = change > 0;
                      
                      return (
                        <tr key={update.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <strong>P{update.product_id}</strong> - {update.product_name}
                          </td>
                          <td style={{ padding: '12px 8px' }}>{update.old_stock}</td>
                          <td style={{ padding: '12px 8px' }}>{update.new_stock}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              color: isIncrease ? '#22c55e' : '#ef4444',
                              fontWeight: 'bold'
                            }}>
                              {isIncrease ? '+' : ''}{change}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px' }}>{update.updated_by}</td>
                          <td style={{ padding: '12px 8px' }}>
                            {new Date(update.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {stockUpdateModal.isOpen && (
        <div className="modal-overlay" onClick={() => setStockUpdateModal({ isOpen: false, productId: null, productName: '', currentStock: 0, newStock: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Update Stock for {stockUpdateModal.productName}</h2>
            <p>Current Stock: {stockUpdateModal.currentStock}</p>
            <label>
              New Stock
              <input
                type="number"
                value={stockUpdateModal.newStock}
                onChange={(e) => setStockUpdateModal({ ...stockUpdateModal, newStock: e.target.value })}
                placeholder="Enter new stock quantity"
              />
            </label>
            <button className="primary" onClick={submitStockUpdate}>
              <span style={{ fontSize: '1rem' }}>+</span> Update Stock
            </button>
          </div>
        </div>
      )}

      {printableBill && (
        <div className="print-preview" ref={printRef}>
          <div className="print-header">
            <h1>Pet Shop Invoice</h1>
            <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
          <div className="print-body">
            <div className="print-section">
              <h2>Bill Details</h2>
              <div className="print-item">
                <strong>ID:</strong>
                <span>B{printableBill.id}</span>
              </div>
              <div className="print-item">
                <strong>Customer Name:</strong>
                <span>{printableBill.customer_name}</span>
              </div>
              <div className="print-item">
                <strong>Total Amount:</strong>
                <span>{formatCurrency(printableBill.total)}</span>
              </div>
              <div className="print-item">
                <strong>Payment Mode:</strong>
                <span>{printableBill.payment_mode}</span>
              </div>
              <div className="print-item">
                <strong>Date:</strong>
                <span>{formatDateTime(printableBill.created_at)}</span>
              </div>
            </div>
            <div className="print-section">
              <h2>Items</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Quantity</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printableBill.items.map((item) => (
                    <tr key={item.product_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 8px' }}>P{item.product_id}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <strong>{item.name}</strong>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {formatCurrency(item.price)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="print-footer">
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      )}

      {pdfDownload.isGenerating && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Generating {pdfDownload.type === 'daily' ? 'Daily' : 'Monthly'} Sales Report</h2>
            <p>Please wait while we prepare your report...</p>
          </div>
        </div>
      )}

      {showMonthlySelector && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Select Month and Year for Monthly Sales Report</h2>
            <label>
              Month
              <select
                value={monthlyReportParams.month}
                onChange={(e) => setMonthlyReportParams({ ...monthlyReportParams, month: parseInt(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
            <label>
              Year
              <select
                value={monthlyReportParams.year}
                onChange={(e) => setMonthlyReportParams({ ...monthlyReportParams, year: parseInt(e.target.value) })}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={new Date().getFullYear() - i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={() => generateAnalyticsPDF('monthly')}>
              <span style={{ fontSize: '1rem' }}>⎙</span> Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
