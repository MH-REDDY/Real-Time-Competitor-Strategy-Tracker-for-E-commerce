import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch (e) { return iso; }
};

const formatPrice = (v) => {
  if (v === null || v === undefined) return '—';
  try {
    const nf = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    return nf.format(Number(v));
  } catch (e) {
    return String(v);
  }
};

const AlertsBadge = ({ onClick }) => {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const { getAuthHeader } = useAuth();

  const load = async (limit = 5) => {
    setLoading(true);
    try {
      const res = await fetch(`/admin/alerts?limit=${limit}`, { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
      if (!res.ok) return;
      const docs = await res.json();
      setAlerts(docs || []);
      const unread = docs.filter(d => !d.status || d.status !== 'acknowledged').length;
      setCount(unread);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    // initial load and periodic refresh for badge count
    load(50);
    const t = setInterval(() => { if (mounted) load(5); }, 60000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const ack = async (id) => {
    try {
      const res = await fetch(`/admin/alerts/${id}/ack`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
      if (!res.ok) throw new Error('Ack failed');
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'acknowledged' } : a));
      setCount(c => Math.max(0, c - 1));
    } catch (e) {
      alert('Failed to acknowledge');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(5); }}
        aria-haspopup="true"
        aria-expanded={open}
        title="Alerts"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
          borderRadius: 8, transition: 'background 120ms ease', outline: 'none'
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Bell size={18} style={{ color: open ? '#111827' : '#374151', transition: 'color 120ms' }} />
          {count > 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: -6, right: -10, minWidth: 18, height: 18, padding: '0 6px', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: '#fff', borderRadius: 99, fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transform: 'translateZ(0)'
            }}>{count}</span>
          )}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Alerts" style={{
          position: 'absolute', right: 0, top: 42, width: 360, maxWidth: 'calc(100vw - 28px)', background: '#fff', borderRadius: 10,
          boxShadow: '0 12px 40px rgba(2,6,23,0.16)', zIndex: 9999, padding: 12, border: '1px solid #eef2f2'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 15 }}>Alerts</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => { load(5); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}>Refresh</button>
              <button onClick={() => { setOpen(false); onClick && onClick(); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>View all</button>
            </div>
          </div>

          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {loading && <div style={{ padding: 16, color: '#6b7280' }}>Loading...</div>}
            {!loading && alerts.length === 0 && <div style={{ padding: 12, color: '#6b7280' }}>No recent alerts.</div>}
            {!loading && alerts.map(a => (
              <div key={a._id} style={{ display: 'flex', gap: 12, padding: '10px 6px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.title || a.asin}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{a.asin} • {a.trigger_reason || ''}</div>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>
                    <strong style={{ fontWeight: 600 }}>Current:</strong> {formatPrice(a.current_price ?? a.old_price)}
                    <span style={{ marginLeft: 10 }} /><strong style={{ fontWeight: 600 }}>Scraped:</strong> {formatPrice(a.scraped_price ?? a.new_price)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 110 }}>
                  <div style={{ fontWeight: 700 }}>{a.percent_change != null ? `${Math.round(a.percent_change*10)/10}%` : '—'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{a.absolute_change ?? '—'}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>{a.triggered_at ? formatDate(a.triggered_at) : ''}</div>
                  <div style={{ marginTop: 6 }}>
                    {a.status !== 'acknowledged' ? (
                      <button onClick={() => ack(a._id)} style={{ border: 'none', background: '#0369a1', color: '#fff', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Acknowledge</button>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: 12 }}>Acknowledged</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsBadge;
