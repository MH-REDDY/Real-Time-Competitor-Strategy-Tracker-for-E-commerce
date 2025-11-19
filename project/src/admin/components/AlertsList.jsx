import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const formatPrice = (v) => {
	if (v === null || v === undefined) return '—';
	try {
		const nf = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
		return nf.format(Number(v));
	} catch (e) {
		return String(v);
	}
};

const AlertsList = () => {
	const { getAuthHeader } = useAuth();
	const [alerts, setAlerts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [settings, setSettings] = useState(null);
	const [expanded, setExpanded] = useState({});
	const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

	const load = async () => {
		setLoading(true);
		try {
			const res = await fetch('/admin/alerts?limit=200', { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
			if (!res.ok) throw new Error('Failed to load alerts');
			const data = await res.json();
			setAlerts(data || []);
		} catch (e) {
			setError(e.message || 'Error');
		} finally {
			setLoading(false);
		}
	};

	const loadSettings = async () => {
		try {
			const res = await fetch('/admin/alerts/settings', { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
			if (!res.ok) throw new Error('Failed');
			const data = await res.json();
			setSettings(data);
		} catch (_) {
			setSettings({ enabled: true, notify_channels: { slack: true, email: false }, threshold_percent: 20, threshold_absolute: 500, min_price_for_alert: 100, quiet_hours: null });
		}
	};

	useEffect(() => {
		load();
		loadSettings();
		const t = setInterval(() => { load(); loadSettings(); }, 60000);
		return () => clearInterval(t);
	}, []);

	const ack = async (id) => {
		try {
			const res = await fetch(`/admin/alerts/${id}/ack`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
			if (!res.ok) throw new Error('Ack failed');
			setAlerts(alerts.map(a => a._id === id ? { ...a, status: 'acknowledged' } : a));
			setToast({ show: true, message: 'Alert acknowledged', type: 'success' });
			setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
		} catch (e) {
			setToast({ show: true, message: 'Failed to acknowledge alert', type: 'error' });
			setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
		}
	};

	if (loading) return <div style={{ padding: 16 }}>Loading alerts...</div>;
	if (error) return <div style={{ color: 'red', padding: 16 }}>{error}</div>;

	const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

	return (
		<div style={{ padding: 16 }}>
			{toast.show && (
				<div style={{ position: 'fixed', right: 20, top: 84, zIndex: 2000 }}>
					<div style={{ padding: '10px 14px', borderRadius: 8, color: '#fff', background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : toast.type === 'warning' ? '#f59e0b' : '#374151', boxShadow: '0 8px 20px rgba(2,6,23,0.2)' }}>
						{toast.message}
					</div>
				</div>
			)}
			<h2>Alerts</h2>

			<div style={{ border: '1px solid #eee', padding: 14, marginBottom: 12, borderRadius: 8, background: '#fff' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
					<div>
						<h3 style={{ margin: 0 }}>Alert Rules & Delivery</h3>
						<div style={{ color: '#6b7280', marginTop: 6, maxWidth: 720 }}>
							Configure when the system should generate price alerts and how they are delivered. Changes apply immediately and affect future scrapes.
						</div>
					</div>
					<div>
						{settings && !settings.editing && (
							<button onClick={() => setSettings(s => ({ ...s, editing: true }))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff' }}>Edit rules</button>
						)}
					</div>
				</div>

				{settings ? (
					settings.editing ? (
						// edit form
						<div style={{ marginTop: 12 }}>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
								<div>
									<label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Percent threshold (percent change)</label>
									<input type="number" value={settings.threshold_percent ?? ''} onChange={e => setSettings(s => ({ ...s, threshold_percent: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e6e6e6' }} />
									<div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Alert when price changes by this percent or more.</div>
								</div>
								<div>
									<label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Absolute threshold (currency)</label>
									<input type="number" value={settings.threshold_absolute ?? ''} onChange={e => setSettings(s => ({ ...s, threshold_absolute: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e6e6e6' }} />
									<div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Alert when absolute price difference meets or exceeds this value.</div>
								</div>
								<div>
									<label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Min price to trigger</label>
									<input type="number" value={settings.min_price_for_alert ?? ''} onChange={e => setSettings(s => ({ ...s, min_price_for_alert: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e6e6e6' }} />
									<div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Ignore alerts for low-priced items below this threshold.</div>
								</div>
								<div>
									<label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Notify channels</label>
									<label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={Boolean(settings.notify_channels?.slack)} onChange={e => setSettings(s => ({ ...s, notify_channels: { ...s.notify_channels, slack: e.target.checked } }))} /> Slack</label>
									<label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginLeft: 12 }}><input type="checkbox" checked={Boolean(settings.notify_channels?.email)} onChange={e => setSettings(s => ({ ...s, notify_channels: { ...s.notify_channels, email: e.target.checked } }))} /> Email</label>
									<div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Choose how alerts are delivered to your team.</div>
								</div>
							</div>
							<div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
								<button onClick={async () => {
									try {
										const payload = {
											threshold_percent: Number(settings.threshold_percent || 0),
											threshold_absolute: Number(settings.threshold_absolute || 0),
											min_price_for_alert: Number(settings.min_price_for_alert || 0),
											notify_channels: { slack: Boolean(settings.notify_channels?.slack), email: Boolean(settings.notify_channels?.email) },
											quiet_hours: settings.quiet_hours || null
										};
										const res = await fetch('/admin/alerts/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(payload) });
										if (!res.ok) throw new Error('Save failed');
										const data = await res.json();
										setSettings(s => ({ ...s, editing: false, ...data.updated }));
										setToast({ show: true, message: 'Alert rules updated', type: 'success' });
										setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
									} catch (e) {
										console.error(e);
										setToast({ show: true, message: 'Failed to save settings', type: 'error' });
										setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
									}
								}} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0369a1', color: '#fff' }}>Save</button>
								<button onClick={() => { loadSettings(); setSettings(s => ({ ...s, editing: false })); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff' }}>Cancel</button>
							</div>
						</div>
					) : (
						// read-only view
						<div style={{ marginTop: 12 }}>
							<ul style={{ margin: 0 }}>
								<li>Percent threshold: <strong>{settings.threshold_percent}%</strong></li>
								<li>Absolute threshold: <strong>{settings.threshold_absolute}</strong></li>
								<li>Min price to trigger: <strong>{settings.min_price_for_alert}</strong></li>
								<li>Notifications: <strong>{settings.notify_channels?.slack ? 'Slack' : ''}{settings.notify_channels?.email ? (settings.notify_channels?.slack ? ', Email' : 'Email') : ''}</strong></li>
								<li>Quiet hours: <strong>{settings.quiet_hours ? `${settings.quiet_hours.start} → ${settings.quiet_hours.end}` : 'None'}</strong></li>
							</ul>
						</div>
					)
				) : (
					<div>Loading rules...</div>
				)}
			</div>

			<div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
				<button onClick={() => { load(); loadSettings(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff' }}>Refresh</button>
				<button style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0369a1', color: '#fff' }} onClick={async () => {
					try {
						const resp = await fetch('/admin/alerts/test-notify', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
						if (!resp.ok) throw new Error('Test notify failed');
						const data = await resp.json();
						if (data.notified) {
							setToast({ show: true, message: 'Test alert created and notification attempted (check Slack).', type: 'success' });
						} else {
							setToast({ show: true, message: 'Test alert created but notification not sent (check server logs).', type: 'warning' });
						}
						setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
						await load();
					} catch (e) {
						console.error(e);
						setToast({ show: true, message: 'Failed to create/send test alert', type: 'error' });
						setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
					}
				}}>Send Test Alert</button>
			</div>

			<div>
				<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
					<thead>
						<tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
							<th style={{ width: 140 }}>ASIN</th>
							<th style={{ width: '40%' , minWidth: 220}}>Title</th>
							<th style={{ width: 200 }}>Change</th>
							<th style={{ width: 180 }}>When</th>
							<th style={{ width: 120 }}>Status</th>
							<th style={{ width: 140 }}>Action</th>
						</tr>
					</thead>
					<tbody>
						{alerts.map(a => (
							<>
								<tr key={a._id} style={{ borderBottom: '1px solid #f6f6f6' }}>
									<td style={{ padding: '10px 6px', width: 140, verticalAlign: 'top' }}>{a.asin}</td>
									<td style={{ padding: '10px 6px', maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word', display: 'block' }}>{a.title}</td>
									<td style={{ padding: '10px 6px' }}>
										<div style={{ fontWeight: 700 }}>{a.percent_change != null ? `${Math.round(a.percent_change*10)/10}%` : '—'}</div>
										<div style={{ marginTop: 6, color: '#374151' }}><small><strong>Current:</strong> {formatPrice(a.current_price ?? a.old_price)}</small></div>
										<div style={{ color: '#374151' }}><small><strong>Scraped:</strong> {formatPrice(a.scraped_price ?? a.new_price)}</small></div>
									</td>
									<td style={{ padding: '10px 6px' }}>{a.triggered_at ? new Date(a.triggered_at).toLocaleString() : '—'}</td>
									<td style={{ padding: '10px 6px' }}>{a.status || 'open'}</td>
									<td style={{ padding: '10px 6px' }}>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
											<button onClick={() => toggleExpand(a._id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff', minWidth: 110 }}>{expanded[a._id] ? 'Hide details' : 'Show details'}</button>
											{a.status !== 'acknowledged' ? (
												<button style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0369a1', color: '#fff', minWidth: 110 }} onClick={() => ack(a._id)}>Acknowledge</button>
											) : (
												<span style={{ color: '#6b7280', fontSize: 13 }}>Acknowledged</span>
											)}
										</div>
									</td>
								</tr>
								{expanded[a._id] && (
									<tr key={`${a._id}-details`} style={{ background: '#fbfbfb' }}>
										<td colSpan={6} style={{ padding: 12 }}>
											<div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
												<div style={{ flex: '1 1 260px', minWidth: 180 }}>
													<strong>Trigger:</strong>
													<div>{a.trigger_reason || a.note || '—'}</div>
													<div style={{ marginTop: 8 }}><strong>Current:</strong> {formatPrice(a.current_price ?? a.old_price ?? null)}</div>
													<div><strong>Scraped:</strong> {formatPrice(a.scraped_price ?? a.new_price ?? null)}</div>
												</div>
												<div style={{ flex: '1 1 320px', minWidth: 220 }}>
													<strong>Raw data</strong>
													<pre style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto' }}>{JSON.stringify(a, null, 2)}</pre>
												</div>
											</div>
										</td>
										</tr>
								)}
							</>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default AlertsList;

