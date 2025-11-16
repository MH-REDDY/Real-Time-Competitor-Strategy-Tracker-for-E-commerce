import React, { useEffect, useMemo, useState } from 'react';
import { styles } from '../styles/adminStyles';

const OrdersView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2200);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/admin/orders');
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((o) =>
      String(o.order_id || '').toLowerCase().includes(q) ||
      String(o.customer?.name || '').toLowerCase().includes(q) ||
      String(o.customer?.email || '').toLowerCase().includes(q) ||
      String(o.razorpay_payment_id || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const stats = useMemo(() => {
    const total = (rows || []).length;
    const completed = (rows || []).filter(o => String(o.payment_status || '').toLowerCase() === 'completed').length;
    return { total, completed };
  }, [rows]);

  const itemsCount = (o) => {
    const list = Array.isArray(o.items) ? o.items : [];
    const sum = list.reduce((acc, it) => acc + (Number(it.quantity || 1)), 0);
    return sum || (list.length || 0);
  };

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  return (
    <div style={styles.contentArea}>
      <div style={styles.contentHeader}>
        <div>
          <h1 style={styles.pageTitle}>Orders</h1>
          <p style={styles.pageSubtitle}>Recent orders from checkout</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', padding: '12px', borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <div style={{ fontSize: 12, color: '#3730a3', marginBottom: 4 }}>Total Orders</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3730a3' }}>{stats.total}</div>
        </div>
        <div style={{ flex: '1 1 240px', padding: '12px', borderRadius: 10, background: '#d1fae5', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: 12, color: '#065f46', marginBottom: 4 }}>Completed</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#065f46' }}>{stats.completed}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ ...styles.searchInputContainer, flex: '1 1 320px' }}>
          <span style={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search by order id, name, email..." value={query} onChange={(e)=>setQuery(e.target.value)} style={styles.searchInput} />
        </div>
        <button onClick={fetchOrders} style={{ ...styles.actionButton, borderRadius: 8 }}>Refresh</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Order ID</th>
              <th style={styles.tableHeaderCell}>Customer</th>
              <th style={styles.tableHeaderCell}>Items</th>
              <th style={styles.tableHeaderCell}>Subtotal</th>
              <th style={styles.tableHeaderCell}>Tax</th>
              <th style={styles.tableHeaderCell}>Total</th>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Created</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((o) => (
              <tr key={o._id} style={styles.tableRow}>
                <td style={styles.tableCell}>{o.order_id}</td>
                <td style={styles.tableCell}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{o.customer?.name || '-'}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{o.customer?.email || '-'}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>{itemsCount(o)}</td>
                <td style={styles.tableCell}>{fmt(o.subtotal)}</td>
                <td style={styles.tableCell}>{fmt(o.tax)}</td>
                <td style={styles.tableCell}>{fmt(o.total)}</td>
                <td style={styles.tableCell}>
                  <span style={{ padding: '4px 8px', borderRadius: 8, background: '#d1fae5', color: '#065f46' }}>{o.payment_status || 'completed'}</span>
                </td>
                <td style={styles.tableCell}>{(() => { try { return new Date(o.created_at).toLocaleString(); } catch { return String(o.created_at || '-'); } })()}</td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr style={styles.tableRow}><td style={styles.tableCell} colSpan={8}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, background: toast.tone === 'success' ? '#059669' : '#dc2626', color: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 60 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default OrdersView;
