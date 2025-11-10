import React, { useEffect, useMemo, useState } from 'react';
import { styles } from '../styles/adminStyles';
import Modal from './Modal';

const initialForm = {
  asin: '',
  title: '',
  category: '',
  description: '',
  discount_percent: '',
  original_price: '',
  price: '',
  rating: '',
  scraped_at: '',
  url: '',
  availability: '',
  image_url: '',
  reviews_count: '',
};

const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const API_URL = '/api/products';

  const authHeader = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.title, p.asin, p.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [products, query]);

  const onAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setOpen(true);
  };

  const onEdit = (p) => {
    setEditingId(p._id);
    setForm({
      asin: p.asin || '',
      title: p.title || '',
      category: p.category || '',
      description: p.description || '',
      discount_percent: p.discount_percent ?? '',
      original_price: p.original_price ?? '',
      price: p.price ?? '',
      rating: p.rating ?? '',
      scraped_at: p.scraped_at ? new Date(p.scraped_at).toISOString().slice(0, 16) : '',
      url: p.url || '',
      availability: p.availability || '',
      image_url: p.image_url || '',
      reviews_count: p.reviews_count ?? '',
    });
    setOpen(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: { ...authHeader } });
      if (!res.ok) throw new Error('Delete failed');
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  };

  const parseNumber = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).toString().replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const parseDate = (v) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      asin: form.asin || undefined,
      title: form.title || undefined,
      category: form.category || undefined,
      description: form.description || undefined,
      discount_percent: parseNumber(form.discount_percent),
      original_price: parseNumber(form.original_price),
      price: parseNumber(form.price),
      rating: parseNumber(form.rating),
      scraped_at: parseDate(form.scraped_at),
      url: form.url || undefined,
      availability: form.availability || undefined,
      image_url: form.image_url || undefined,
      reviews_count: parseNumber(form.reviews_count),
    };
    try {
      const res = await fetch(editingId ? `${API_URL}/${editingId}` : API_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved = await res.json();
      if (editingId) {
        setProducts((prev) => prev.map((p) => (p._id === editingId ? saved : p)));
      } else {
        setProducts((prev) => [saved, ...prev]);
      }
      setOpen(false);
    } catch (e) {
      alert(e.message || 'Save failed');
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('Empty CSV');
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',');
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (cols[i] || '').trim()));
        return obj;
      });
      const mapped = rows.map((r) => ({
        asin: r.asin || r.id || r.sku || '',
        title: r.title || r.name || r.product || '',
        category: r.category || '',
        description: r.description || '',
        discount_percent: parseNumber(r.discount_percent),
        original_price: parseNumber(r.original_price),
        price: parseNumber(r.price),
        rating: parseNumber(r.rating),
        scraped_at: parseDate(r.scraped_at),
        url: r.url || '',
        availability: r.availability || '',
        image_url: r.image_url || r.image || '',
        reviews_count: parseNumber(r.reviews_count),
      }));
      const res = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(mapped),
      });
      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();
      if (Array.isArray(data.products)) setProducts((prev) => [...data.products, ...prev]);
      e.target.value = '';
    } catch (err) {
      alert(err.message || 'Import failed');
    }
  };

  return (
    <div style={styles.contentArea}>
      <div style={styles.contentHeader}>
        <div>
          <h1 style={styles.pageTitle}>Products (Inventory)</h1>
          <p style={styles.pageSubtitle}>Manage your product inventory</p>
        </div>
        <div style={styles.topActions}>
          <label style={styles.actionButton}>
            Import
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={onImport} />
          </label>
          <button style={{ ...styles.actionButton, ...styles.primaryButton }} onClick={onAdd}>
            Add New Product
          </button>
        </div>
      </div>

      <div style={{ ...styles.alertContainer, flexWrap: 'wrap' }}>
        <div style={{ ...styles.alertBox, ...styles.outOfStockAlert, minWidth: '200px', margin: '5px' }}>
          <span style={styles.alertIcon}>❌</span>
          <div>
            <p style={{ ...styles.alertText, fontWeight: 'bold' }}>Out of Stock</p>
            <p style={styles.alertText}>{products.filter((p) => String(p.availability || '').toLowerCase().includes('out of stock')).length} product(s) out of stock</p>
          </div>
        </div>
      </div>

      <div style={styles.searchInputContainer}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.tableHeaderCell}>Product</th>
              <th style={styles.tableHeaderCell}>ASIN</th>
              <th style={styles.tableHeaderCell}>Category</th>
              <th style={styles.tableHeaderCell}>Price</th>
              <th style={styles.tableHeaderCell}>Availability</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={styles.tableCell}>Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={styles.tableCell}>{error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={styles.tableCell}>No products found</td></tr>
            ) : (
              filtered.map((product) => (
                <tr key={product._id || product.asin || product.title} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <img
                      src={product.image_url || 'https://placehold.co/40x40/007bff/ffffff?text=P'}
                      alt={product.title}
                      style={styles.tableImage}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/40x40/ccc/000?text=NA';
                      }}
                    />
                    {product.title}
                  </td>
                  <td style={styles.tableCell}>{product.asin}</td>
                  <td style={styles.tableCell}>{product.category}</td>
                  <td style={styles.tableCell}>{
                    typeof product.price === 'number' ? product.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : (product.price || '-')
                  }</td>
                  <td style={styles.tableCell}>{product.availability || '-'}</td>
                  <td style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button style={{ ...styles.actionBtn, ...styles.editBtn }} onClick={() => onEdit(product)}>Edit</button>
                      <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={() => onDelete(product._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal title={editingId ? 'Edit Product' : 'Add New Product'} open={open} onClose={() => setOpen(false)} width={880}>
        <form onSubmit={onSubmit}>
          <div className="form-grid" style={styles.formGrid}>
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>Basic Info</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.inputLabel}>ASIN</label>
                  <input style={styles.input} placeholder="B0DV5HX4JZ" value={form.asin} onChange={(e) => setForm({ ...form, asin: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Category</label>
                  <input style={styles.input} placeholder="Smartphones / Audio / N/A" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.inputLabel}>Title</label>
                  <input style={styles.input} placeholder="Product name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.inputLabel}>Description</label>
                  <textarea style={styles.textarea} placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>Pricing & Ratings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.inputLabel}>Price</label>
                  <input type="number" step="0.01" style={styles.input} placeholder="2759" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Original Price</label>
                  <input type="number" step="0.01" style={styles.input} placeholder="8990" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Discount %</label>
                  <input type="number" step="0.01" style={styles.input} placeholder="69.31" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Rating</label>
                  <input type="number" min="0" max="5" step="0.1" style={styles.input} placeholder="4.2" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Reviews Count</label>
                  <input type="number" style={styles.input} placeholder="2155" value={form.reviews_count} onChange={(e) => setForm({ ...form, reviews_count: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>Meta</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={styles.inputLabel}>Availability</label>
                  <input style={styles.input} placeholder="In Stock / Out of Stock" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
                </div>
                <div>
                  <label style={styles.inputLabel}>Scraped At</label>
                  <input type="datetime-local" style={styles.input} value={form.scraped_at} onChange={(e) => setForm({ ...form, scraped_at: e.target.value })} />
                  <div style={styles.inputHelp}>Optional. When the product was scraped.</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.inputLabel}>URL</label>
                  <input type="url" style={styles.input} placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.inputLabel}>Image URL</label>
                  <input type="url" style={styles.input} placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.actionButton} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" style={{ ...styles.actionButton, ...styles.primaryButton }}>Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsView;
