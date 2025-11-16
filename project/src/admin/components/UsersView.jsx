import React, { useEffect, useMemo, useState } from 'react';
import { styles } from '../styles/adminStyles';
import { useAuth } from '../../context/AuthContext';

const API_BASE = '/admin';

const UsersView = () => {
  const { getAuthHeader } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2200);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((u) => {
      return (
        String(u.full_name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.role || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const stats = useMemo(() => {
    const total = (rows || []).length;
    const active = (rows || []).filter(u => u.is_active !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  const toggleActive = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}/toggle-active`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || 'Toggle failed');
      }
      await fetchUsers();
      showToast('Status updated', 'success');
    } catch (e) {
      showToast(e.message || 'Toggle failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { ...getAuthHeader() } });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || 'Delete failed');
      }
      await fetchUsers();
      showToast('User deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.contentArea}>
      <div style={styles.contentHeader}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSubtitle}>Manage registered users</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ ...styles.searchInputContainer, flex: '1 1 320px' }}>
          <span style={styles.searchIcon}>🔍</span>
          <input type="text" placeholder="Search users..." value={query} onChange={(e)=>setQuery(e.target.value)} style={styles.searchInput} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: '#f1f5f9' }}>Total: <b>{stats.total}</b></div>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: '#ecfeff' }}>Active: <b>{stats.active}</b></div>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: '#fee2e2' }}>Inactive: <b>{stats.inactive}</b></div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Name</th>
              <th style={styles.tableHeaderCell}>Email</th>
              <th style={styles.tableHeaderCell}>Role</th>
              <th style={styles.tableHeaderCell}>Active</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((u) => (
              <tr key={u._id} style={styles.tableRow}>
                <td style={styles.tableCell}>{u.full_name || '-'}</td>
                <td style={styles.tableCell}>{u.email || '-'}</td>
                <td style={styles.tableCell}>{u.role || 'user'}</td>
                <td style={styles.tableCell}>
                  <span style={{ padding: '4px 8px', borderRadius: 8, background: (u.is_active !== false) ? '#d1fae5' : '#fee2e2', color: (u.is_active !== false) ? '#065f46' : '#991b1b' }}>
                    {(u.is_active !== false) ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.actionButtons}>
                    <button style={{ ...styles.actionBtn, ...styles.editBtn, borderRadius: 8 }} onClick={()=>toggleActive(u._id)}>
                      {(u.is_active !== false) ? 'Deactivate' : 'Activate'}
                    </button>
                    <button style={{ ...styles.actionBtn, ...styles.deleteBtn, borderRadius: 8 }} onClick={()=>deleteUser(u._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr style={styles.tableRow}><td style={styles.tableCell} colSpan={5}>No users found.</td></tr>
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

export default UsersView;
