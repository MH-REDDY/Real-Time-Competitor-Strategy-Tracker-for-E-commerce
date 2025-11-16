import React, { useEffect, useState, useRef } from 'react';
import { styles } from '../styles/adminStyles';

// Use Vite proxy to backend (8001)
const API_URL = '/api';

const formatDate = (d) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch (e) {
    return String(d);
  }
};

const CompareView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [jobProgress, setJobProgress] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  // Read Vite-exposed API key for the frontend if present (dev only).
  // To expose a key to the client set VITE_API_KEY in project/.env (not recommended for production).
  const CLIENT_API_KEY = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_KEY : null;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/compare`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRows(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load compare data. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const headers = {};
      if (CLIENT_API_KEY) headers['x-api-key'] = CLIENT_API_KEY;
      
      const res = await fetch(`${API_URL}/scrape`, { method: 'POST', headers });
      
      if (!res.ok) {
        const json = await res.json();
        // Check if this is the "manual scraper" response
        if (json.status === 'info' && json.message && json.message.includes('manually')) {
          setToast({ type: 'info', text: 'Note: Scraper is a manual script. Using existing database data.' });
          await fetchData(); // Refresh with existing data
          setRefreshing(false);
          return;
        }
        throw new Error(json.message || 'Scrape failed');
      }
      
      const json = await res.json();
      
      // Check if this is the manual scraper info response
      if (json.status === 'info') {
        setToast({ type: 'info', text: 'Using existing database data (scraper is manual)' });
        await fetchData();
        setRefreshing(false);
        return;
      }
      
      let jobId = json.job_id || json.jobId;
      
      if (!jobId) {
        throw new Error('No job id available');
      }
      
      setCurrentJobId(jobId);

      // poll for job status
      let status = 'pending';
      const poll = async () => {
        try {
          const sres = await fetch(`${API_URL}/scrape/status/${jobId}`, { headers });
          if (!sres.ok) throw new Error('Status fetch failed');
          const sjson = await sres.json();
          status = sjson.status;
          if (sjson.progress != null) {
            setJobProgress(Number(sjson.progress));
          }
          if (status === 'completed') {
            // done — refresh data
            await fetchData();
            setToast({ type: 'success', text: `Scrape ${jobId} completed` });
            setRefreshing(false);
            setCurrentJobId(null);
            setJobProgress(100);
            return;
          }
          if (status === 'failed') {
            console.error('Scrape job failed', sjson.error);
            setToast({ type: 'error', text: `Scrape ${jobId} failed` });
            setRefreshing(false);
            setCurrentJobId(null);
            return;
          }
        } catch (e) {
          console.error('Polling error', e);
          setToast({ type: 'error', text: 'Error checking job status' });
          setRefreshing(false);
          setCurrentJobId(null);
          return;
        }

        // continue polling
        setTimeout(poll, 2500);
      };

      // start polling
      poll();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', text: 'Scrape failed — check server logs' });
      setRefreshing(false);
    }
  };

  // toast helper
  useEffect(() => {
    if (!toast) return undefined;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(toastTimer.current);
  }, [toast]);

  const showSpinner = () => (
    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'white', borderRadius: '50%', marginRight: 8, animation: 'spin 1s linear infinite' }} />
  );

  // compute last scraped from rows
  const lastScraped = React.useMemo(() => {
    if (!rows || rows.length === 0) return null;
    let max = null;
    rows.forEach(r => {
      if (!r.scraped_at) return;
      const d = new Date(r.scraped_at);
      if (!max || d > max) max = d;
    });
    return max;
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const q = String(filterText || '').trim().toLowerCase();
    const list = rows || [];
    if (!q) return list;
    return list.filter(r => (String(r.title || '').toLowerCase().includes(q) || String(r.asin || '').toLowerCase().includes(q)));
  }, [rows, filterText]);

  const pageSize = 20; // fixed page size
  const totalPages = Math.max(1, Math.ceil((filteredRows || []).length / pageSize));
  const pageIndex = Math.max(1, Math.min(page, totalPages));
  const paginatedRows = React.useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return (filteredRows || []).slice(start, start + pageSize);
  }, [filteredRows, pageIndex]);

  const downloadCSV = () => {
    const rowsToExport = filteredRows || [];
    if (!rowsToExport.length) {
      setToast({ type: 'error', text: 'No rows to download' });
      return;
    }
    const headers = ['asin','title','price','original_price','discount_percent','availability','category','url','scraped_at','image_url'];
    const csv = [headers.join(',')];
    for (const r of rowsToExport) {
      const vals = headers.map(h => {
        const v = r[h] != null ? String(r[h]) : '';
        // escape quotes
        return `"${v.replace(/"/g, '""')}"`;
      });
      csv.push(vals.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'_')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast({ type: 'success', text: 'CSV download started' });
  };

  return (
    <div style={styles.contentArea}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={styles.contentHeader}>
        <div>
          <h1 style={{ ...styles.pageTitle, marginBottom: 6 }}>🔁 Compare</h1>
          <p style={{ ...styles.pageSubtitle, fontSize: 13, color: '#6b7280', marginTop: 0 }}>Latest scraped product prices from Amazon</p>
        </div>
        <div style={styles.topActions}>
          <div style={{ marginRight: 12 }}>
            <input
              placeholder="Search product title or ASIN"
              value={filterText}
              onChange={(e) => { setFilterText(e.target.value); setPage(1); }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', minWidth: 220 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 8 }}>
            {/* compact view toggle + download (subtle) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '2px', borderRadius: 8, background: 'transparent' }}>
              <button onClick={() => setViewMode('cards')} aria-pressed={viewMode === 'cards'} style={{ padding: '4px 6px', borderRadius: 6, border: viewMode === 'cards' ? '1px solid rgba(17,24,39,0.12)' : '1px solid #eee', background: viewMode === 'cards' ? '#111827' : '#fff', color: viewMode === 'cards' ? '#fff' : '#374151', fontSize: 12 }}>Cards</button>
              <button onClick={() => setViewMode('table')} aria-pressed={viewMode === 'table'} style={{ padding: '4px 6px', borderRadius: 6, border: viewMode === 'table' ? '1px solid rgba(17,24,39,0.12)' : '1px solid #eee', background: viewMode === 'table' ? '#111827' : '#fff', color: viewMode === 'table' ? '#fff' : '#374151', fontSize: 12 }}>Table</button>
            </div>
            <button onClick={downloadCSV} aria-label="Download CSV" title="Download CSV" style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
          {lastScraped && (
            <div style={{ marginRight: 12, alignSelf: 'center' }}>
              <span style={{ background: '#f3f4f6', color: '#111827', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                Last scraped: {formatDate(lastScraped)}
              </span>
            </div>
          )}
          <button
            onClick={fetchData}
            style={styles.actionButton}
            disabled={loading || refreshing}
          >
            {loading ? 'Loading...' : 'Reload'}
          </button>
          <button
            onClick={doRefresh}
            style={{ ...styles.actionButton, ...styles.primaryButton, display: 'flex', alignItems: 'center' }}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                {showSpinner()}Scraping..
              </>
            ) : (
              'Refresh (live data)'
            )}
          </button>
        </div>
      </div>

      <div>
        {viewMode === 'cards' ? (
          <>
            {/* Card-style list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {paginatedRows.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', color: '#6b7280' }}>No data found.</div>
              )}
              {paginatedRows.map((r, idx) => (
                <div key={r.asin || idx} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 12, background: '#ffffff', boxShadow: '0 4px 10px rgba(2,6,23,0.04)', alignItems: 'center' }}>
                  <div style={{ flex: '0 0 80px' }}>
                    <img src={r.image_url || r.image || ''} alt={r.title || 'product'} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #eef2ff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{r.title || '-'}</div>
                        <div style={{ color: '#6b7280', fontFamily: 'monospace', marginTop: 6 }}>{r.asin}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{r.price != null ? `₹${r.price}` : '-'}</div>
                        <div style={{ color: '#6b7280', fontSize: 13 }}>{r.original_price != null ? `₹${r.original_price}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
                      <div style={{ color: r.discount_percent != null ? '#16a34a' : '#6b7280', fontWeight: 600 }}>{r.discount_percent != null ? `${r.discount_percent}%` : '-'}</div>
                      <div style={{ color: '#374151' }}>{r.availability || '-'}</div>
                      <div style={{ color: '#9ca3af' }}>{formatDate(r.scraped_at)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.tableHeaderCell}>Product</th>
                    <th style={styles.tableHeaderCell}>ASIN</th>
                    <th style={styles.tableHeaderCell}>Price</th>
                    <th style={styles.tableHeaderCell}>Original</th>
                    <th style={styles.tableHeaderCell}>Discount %</th>
                    <th style={styles.tableHeaderCell}>Availability</th>
                    <th style={styles.tableHeaderCell}>Scraped At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 && (
                    <tr style={styles.tableRow}>
                      <td style={styles.tableCell} colSpan={7}>No data found.</td>
                    </tr>
                  )}
                  {paginatedRows.map((r) => (
                    <tr key={r.asin} style={styles.tableRow}>
                      <td style={styles.tableCell}>{r.title || '-'}</td>
                      <td style={styles.tableCell}>{r.asin}</td>
                      <td style={styles.tableCell}>{r.price != null ? `₹${r.price}` : '-'}</td>
                      <td style={styles.tableCell}>{r.original_price != null ? `₹${r.original_price}` : '-'}</td>
                      <td style={styles.tableCell}>{r.discount_percent != null ? `${r.discount_percent}%` : '-'}</td>
                      <td style={styles.tableCell}>{r.availability || '-'}</td>
                      <td style={styles.tableCell}>{formatDate(r.scraped_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* pagination controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ color: '#6b7280' }}>{(filteredRows || []).length} items</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button disabled={pageIndex <= 1} onClick={() => setPage(p => Math.max(1, p-1))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}>Prev</button>
            <div style={{ color: '#374151' }}>Page {pageIndex} / {totalPages}</div>
            <button disabled={pageIndex >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}>Next</button>
          </div>
        </div>
      </div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          <div style={{ minWidth: 220, background: toast.type === 'success' ? '#16a34a' : '#dc2626', color: 'white', padding: '10px 14px', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
            <strong style={{ display: 'block', fontSize: 13 }}>{toast.type === 'success' ? 'Success' : 'Error'}</strong>
            <div style={{ fontSize: 13 }}>{toast.text}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareView;
