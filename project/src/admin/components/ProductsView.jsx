import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { styles } from '../styles/adminStyles';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';

const API_BASE = '/api';

const emptyForm = {
  asin: '',
  category: '',
  description: '',
  discount_percent: '',
  original_price: '',
  price: '',
  rating: '',
  scraped_at: '',
  title: '',
  url: '',
  availability: '',
  image_url: '',
  reviews_count: ''
};

const localStyles = {
  priceTop: { fontWeight: 700, fontSize: 15 },
  priceBottom: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  deltaBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  deltaPos: { background: '#fee2e2', color: '#b91c1c' },
  deltaNeg: { background: '#ecfdf5', color: '#065f46' },
  actionGroup: { display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' },
  // full height variant to ensure vertical centering inside table cell
  actionGroupFull: { display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', height: '100%' },
  smallMuted: { fontSize: 12, color: '#6b7280' }
};
const ProductsView = () => {
  const { getAuthHeader } = useAuth();
  const [rows, setRows] = useState([]);
  const [scrapedMap, setScrapedMap] = useState({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingAsin, setEditingAsin] = useState(null);
  const fileRef = useRef(null);
  const [toast, setToast] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const headers = {};
      const apiKey = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_KEY : null;
      if (apiKey) headers['x-api-key'] = apiKey;
      // Fetch admin products (inventory) and compare (scraped) data in parallel
      const [prodRes, compareRes] = await Promise.all([
        fetch(`${API_BASE}/products`, { headers }),
        fetch(`${API_BASE}/compare`, { headers })
      ]);
      if (!prodRes.ok) throw new Error('Failed to load products');
      if (!compareRes.ok) throw new Error('Failed to load compare/scraped data');
      const prodData = await prodRes.json();
      const compareData = await compareRes.json();
      setRows(Array.isArray(prodData) ? prodData : []);
      const map = {};
      (Array.isArray(compareData) ? compareData : []).forEach((c) => {
        if (c && c.asin) {
          map[c.asin] = c.scraped || {
            price: c.price,
            original_price: c.original_price,
            discount_percent: c.discount_percent,
            rating: c.rating,
            reviews_count: c.reviews_count,
            scraped_at: c.scraped_at
          };
        }
      });
      setScrapedMap(map);
    } catch (e) {
      console.error(e);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = rows || [];
    if (!q) return base;
    return base.filter(r =>
      String(r.title || '').toLowerCase().includes(q) ||
      String(r.asin || '').toLowerCase().includes(q) ||
      String(r.category || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  

  const showToast = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2200);
  };

  const stockStats = useMemo(() => {
    let inStock = 0, outOfStock = 0;
    (rows||[]).forEach(r => {
      const avail = String(r.availability||'').toLowerCase();
      if (avail.includes('in')) inStock += 1;
      else outOfStock += 1;
    });
    return { inStock, outOfStock };
  }, [rows]);

  const openAdd = () => {
    setEditingAsin(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingAsin(r.asin);
    setForm({
      asin: r.asin || '',
      category: r.category || '',
      description: r.description || '',
      discount_percent: r.discount_percent ?? '',
      original_price: r.original_price ?? '',
      price: r.price ?? '',
      rating: r.rating ?? '',
      scraped_at: r.scraped_at ? r.scraped_at.replace('Z', '') : '',
      title: r.title || '',
      url: r.url || '',
      availability: r.availability || '',
      image_url: r.image_url || '',
      reviews_count: r.reviews_count ?? ''
    });
    setIsModalOpen(true);
  };

  const saveForm = async () => {
    const body = { ...form };
    // cast numerics
    ['discount_percent','original_price','price','rating','reviews_count'].forEach(k => {
      if (body[k] === '' || body[k] === null) { delete body[k]; return; }
      const n = Number(body[k]);
      if (!Number.isNaN(n)) body[k] = n;
    });
    // datetime to ISO
    if (body.scraped_at) {
      try { body.scraped_at = new Date(body.scraped_at).toISOString(); } catch {}
    }
    const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
    const url = editingAsin ? `${API_BASE}/products/${encodeURIComponent(editingAsin)}` : `${API_BASE}/products`;
    const method = editingAsin ? 'PUT' : 'POST';
    setLoading(true);
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Save failed');
      }
      setIsModalOpen(false);
      await fetchProducts();
      showToast(editingAsin ? 'Product updated' : 'Product created', 'success');
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const doDelete = async (asin) => {
    if (!window.confirm(`Delete product ${asin}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/${encodeURIComponent(asin)}`, { method: 'DELETE', headers: getAuthHeader() });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Delete failed');
      }
      await fetchProducts();
      showToast('Product deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onImportClick = () => fileRef.current?.click();
  const onImportFile = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error('Import file must be a JSON array');
      const res = await fetch(`${API_BASE}/products/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(json)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Import failed');
      }
      await fetchProducts();
      showToast('Import completed', 'success');
    } catch (e) {
      showToast(e.message || 'Import failed', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
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
          <input ref={fileRef} type="file" accept="application/json" onChange={onImportFile} style={{ display: 'none' }} />
          <button style={{ ...styles.actionButton, borderRadius: 8 }} onClick={onImportClick} disabled={loading}>Import</button>
          <button style={{ ...styles.actionButton, ...styles.primaryButton, borderRadius: 8, boxShadow: '0 6px 14px rgba(0, 120, 255, 0.25)' }} onClick={openAdd} disabled={loading}>
            Add New Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ flex: '1 1 280px', padding: '8px 10px', borderRadius: 10, background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', boxShadow: '0 4px 12px rgba(16,185,129,0.1)', border: '1px solid #a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <CheckCircle2 size={16} color="#065f46" />
            <div style={{ fontSize: 11, color: '#065f46', opacity: 0.9 }}>In Stock</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#065f46' }}>{stockStats.inStock}</div>
            <div style={{ fontSize: 11, color: '#065f46', opacity: 0.8 }}>available</div>
          </div>
        </div>
        <div style={{ flex: '1 1 280px', padding: '8px 10px', borderRadius: 10, background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', boxShadow: '0 4px 12px rgba(239,68,68,0.08)', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <AlertTriangle size={16} color="#991b1b" />
            <div style={{ fontSize: 11, color: '#991b1b', opacity: 0.9 }}>Out of Stock</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#991b1b' }}>{stockStats.outOfStock}</div>
            <div style={{ fontSize: 11, color: '#991b1b', opacity: 0.8 }}>restock</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ ...styles.searchInputContainer, flex: '1 1 280px', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ marginRight: 8, color: '#9ca3af' }} />
          <input type="text" placeholder="Search products..." style={styles.searchInput} value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: '#f1f5f9' }}>Total: <b>{rows.length}</b></div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={{ ...styles.tableHeaderCell, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>Title</th>
              <th style={styles.tableHeaderCell}>ASIN</th>
              <th style={styles.tableHeaderCell}>Category</th>
              <th style={styles.tableHeaderCell}>Price</th>
              <th style={styles.tableHeaderCell}>Δ</th>
              <th style={styles.tableHeaderCell}>Rating</th>
              <th style={styles.tableHeaderCell}>Availability</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((r) => (
              <tr key={r.asin} style={styles.tableRow}>
                <td style={{ ...styles.tableCell, position: 'sticky', left: 0, background: '#fff' }}>
                  <img
                    src={r.image_url || ''}
                    alt={r.title || 'product'}
                    style={styles.tableImage}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40/ccc/000?text=NA'; }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{r.title}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{(() => { try { return (r.url && /^https?:\/\//.test(r.url)) ? new URL(r.url).hostname : ''; } catch { return ''; } })()}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>{r.asin}</td>
                <td style={styles.tableCell}>
                  {r.category ? (
                    <span style={{ padding: '4px 8px', background: '#eef2ff', color: '#3730a3', borderRadius: 999, fontSize: 12 }}>{r.category}</span>
                  ) : '-' }
                </td>
                <td style={styles.tableCell}>
                  <div>
                    {r.price != null ? (
                      <div style={localStyles.priceTop}>
                        ₹{r.price}
                        {r.original_price ? (
                          <span style={{ marginLeft: 8, color: '#94a3b8', textDecoration: 'line-through', fontWeight: 400 }}>₹{r.original_price}</span>
                        ) : null}
                      </div>
                    ) : '-'}
                    {scrapedMap[r.asin] ? (
                      <div style={localStyles.priceBottom}>
                        Scraped: <b>₹{scrapedMap[r.asin].price ?? '—'}</b>
                        {scrapedMap[r.asin].scraped_at ? (
                          <span style={{ marginLeft: 8 }}>{new Date(scrapedMap[r.asin].scraped_at).toLocaleString()}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  {/* delta badge */}
                  {(() => {
                    const s = scrapedMap[r.asin];
                    const adminPrice = typeof r.price === 'number' ? r.price : (r.price ? Number(r.price) : null);
                    const scrapedPrice = s ? (typeof s.price === 'number' ? s.price : (s.price ? Number(s.price) : null)) : null;
                    const delta = (adminPrice != null && scrapedPrice != null) ? (adminPrice - scrapedPrice) : null;
                    if (delta == null) return <div style={localStyles.smallMuted}>-</div>;
                    const isPos = delta > 0;
                    return (
                      <div>
                        <span style={{ ...localStyles.deltaBadge, ...(isPos ? localStyles.deltaPos : localStyles.deltaNeg), display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {delta === 0 ? '—' : (
                            isPos ? (
                              <><ArrowUp size={14} /><span>₹{Math.abs(delta)}</span></>
                            ) : (
                              <><ArrowDown size={14} /><span>₹{Math.abs(delta)}</span></>
                            )
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td style={styles.tableCell}>
                  {r.rating != null ? (
                    <span style={{ background: '#fff7ed', color: '#9a3412', padding: '4px 8px', borderRadius: 8 }}>
                      {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(Math.max(0, 5-Math.round(r.rating)))}
                      <span style={{ marginLeft: 6 }}>{r.rating.toFixed ? r.rating.toFixed(1) : r.rating}</span>
                    </span>
                  ) : '-' }
                </td>
                <td style={styles.tableCell}>
                  {r.availability ? (
                    <span style={{ padding: '4px 8px', borderRadius: 8, color: r.availability.toLowerCase().includes('in') ? '#065f46' : '#991b1b', background: r.availability.toLowerCase().includes('in') ? '#d1fae5' : '#fee2e2' }}>{r.availability}</span>
                  ) : '-' }
                </td>
                <td style={{ ...styles.tableCell, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {scrapedMap[r.asin] ? (
                    (() => {
                      const s = scrapedMap[r.asin];
                      const scrapedPrice = typeof s.price === 'number' ? s.price : (s.price ? Number(s.price) : null);
                      return (
                        <>
                          <button style={{ ...styles.actionBtn, ...styles.primaryButton }} onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm('Apply scraped price to this product?')) return;
                              try {
                                setLoading(true);
                                const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
                                const body = { price: scrapedPrice };
                                const res = await fetch(`${API_BASE}/products/${encodeURIComponent(r.asin)}`, { method: 'PUT', headers, body: JSON.stringify(body) });
                                if (!res.ok) {
                                  const j = await res.json().catch(()=>({}));
                                  throw new Error(j.detail || 'Failed to apply scraped price');
                                }
                                await fetchProducts();
                                showToast('Applied scraped price', 'success');
                              } catch (err) {
                                showToast(err.message || 'Apply failed', 'error');
                              } finally {
                                setLoading(false);
                              }
                            }}>Apply</button>
                          <button style={{ ...styles.actionBtn }} onClick={() => openEdit(r)}>Edit</button>
                          <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={()=>doDelete(r.asin)}>Delete</button>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <button style={{ ...styles.actionBtn, ...styles.editBtn }} onClick={()=>openEdit(r)}>Edit</button>
                      <button style={{ ...styles.actionBtn, ...styles.deleteBtn }} onClick={()=>doDelete(r.asin)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {(!filtered || filtered.length === 0) && (
              <tr style={styles.tableRow}><td style={styles.tableCell} colSpan={8}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={editingAsin ? 'Edit Product' : 'Add New Product'} open={isModalOpen} onClose={()=>setIsModalOpen(false)} width={880}>
        <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>ASIN<input value={form.asin} onChange={(e)=>setForm(f=>({ ...f, asin: e.target.value }))} disabled={!!editingAsin} style={styles.searchInput} /></label>
          <label>Title<input value={form.title} onChange={(e)=>setForm(f=>({ ...f, title: e.target.value }))} style={styles.searchInput} /></label>
          <label>Category<input value={form.category} onChange={(e)=>setForm(f=>({ ...f, category: e.target.value }))} style={styles.searchInput} /></label>
          <label>URL<input value={form.url} onChange={(e)=>setForm(f=>({ ...f, url: e.target.value }))} style={styles.searchInput} /></label>
          <label>Image URL<input value={form.image_url} onChange={(e)=>setForm(f=>({ ...f, image_url: e.target.value }))} style={styles.searchInput} /></label>
          <label>Availability<input value={form.availability} onChange={(e)=>setForm(f=>({ ...f, availability: e.target.value }))} style={styles.searchInput} /></label>
          <label>Price<input type="number" value={form.price} onChange={(e)=>setForm(f=>({ ...f, price: e.target.value }))} style={styles.searchInput} /></label>
          <label>Original Price<input type="number" value={form.original_price} onChange={(e)=>setForm(f=>({ ...f, original_price: e.target.value }))} style={styles.searchInput} /></label>
          <label>Discount %<input type="number" value={form.discount_percent} onChange={(e)=>setForm(f=>({ ...f, discount_percent: e.target.value }))} style={styles.searchInput} /></label>
          <label>Rating<input type="number" value={form.rating} onChange={(e)=>setForm(f=>({ ...f, rating: e.target.value }))} style={styles.searchInput} /></label>
          <label>Reviews Count<input type="number" value={form.reviews_count} onChange={(e)=>setForm(f=>({ ...f, reviews_count: e.target.value }))} style={styles.searchInput} /></label>
          <label style={{ gridColumn: '1 / -1' }}>Description<textarea value={form.description} onChange={(e)=>setForm(f=>({ ...f, description: e.target.value }))} style={{ ...styles.searchInput, minHeight: 80 }} /></label>
          <label>Scraped At<input type="datetime-local" value={form.scraped_at} onChange={(e)=>setForm(f=>({ ...f, scraped_at: e.target.value }))} style={styles.searchInput} /></label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={()=>setIsModalOpen(false)} style={styles.actionButton}>Cancel</button>
          <button onClick={saveForm} style={{ ...styles.actionButton, ...styles.primaryButton }} disabled={loading}>{editingAsin ? 'Update' : 'Create'}</button>
        </div>
      </Modal>

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

export default ProductsView;
