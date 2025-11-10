import React, { useEffect, useMemo, useState } from 'react';
import { styles } from '../styles/adminStyles';
import { useAuth } from '../../context/AuthContext';

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const { getAuthHeader } = useAuth();
  const API_URL = 'http://localhost:8000/api/admin/users';

  const authHeader = useMemo(() => ({ ...getAuthHeader() }), [getAuthHeader]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, { headers: { ...authHeader } });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.username, u.email, u.full_name, u.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users, query]);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: { ...authHeader } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Delete failed');
      }
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (e) {
      alert(e.message || 'Delete failed');
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

      <div style={styles.searchInputContainer}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search by name, username, email, role..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Username</th>
              <th style={styles.tableHeaderCell}>Email</th>
              <th style={styles.tableHeaderCell}>Full Name</th>
              <th style={styles.tableHeaderCell}>Role</th>
              <th style={styles.tableHeaderCell}>Created</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.tableCell}>Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={styles.tableCell}>{error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={styles.tableCell}>No users found</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u._id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{u.username}</td>
                  <td style={styles.tableCell}>{u.email}</td>
                  <td style={styles.tableCell}>{u.full_name || '-'}</td>
                  <td style={styles.tableCell}>{u.role || 'user'}</td>
                  <td style={styles.tableCell}>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                  <td style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button
                        style={{ ...styles.actionBtn, ...styles.deleteBtn, opacity: (u.role === 'admin') ? 0.6 : 1, cursor: (u.role === 'admin') ? 'not-allowed' : 'pointer' }}
                        disabled={u.role === 'admin'}
                        onClick={() => onDelete(u._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersView;
