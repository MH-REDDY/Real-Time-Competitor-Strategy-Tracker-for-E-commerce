import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';

const AlertSettings = () => {
  const { getAuthHeader } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/admin/alerts/settings', { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setSettings(data);
      } catch (e) {
        // defaults
        setSettings({ enabled: true, notify_channels: { slack: true, email: false }, threshold_percent: 20, threshold_absolute: 500, min_price_for_alert: 100, quiet_hours: null });
      }
    };
    load();
  }, [getAuthHeader]);

  if (!settings) return <div>Loading...</div>;

  const updateField = (path, value) => {
    const parts = path.split('.');
    const copy = { ...settings };
    let cur = copy;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]] = { ...cur[parts[i]] };
    }
    cur[parts[parts.length - 1]] = value;
    setSettings(copy);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/admin/alerts/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(settings) });
      if (!res.ok) throw new Error('Save failed');
      setMessage('Settings saved');
    } catch (e) {
      setMessage('Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2>Alert Settings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label>Enabled</label>
          <div>
            <input type="checkbox" checked={!!settings.enabled} onChange={e => updateField('enabled', e.target.checked)} /> Enabled
          </div>
        </div>

        <div>
          <label>Notify via Slack</label>
          <div>
            <input type="checkbox" checked={!!settings.notify_channels?.slack} onChange={e => updateField('notify_channels.slack', e.target.checked)} /> Slack
          </div>
        </div>

        <div>
          <label>Notify via Email</label>
          <div>
            <input type="checkbox" checked={!!settings.notify_channels?.email} onChange={e => updateField('notify_channels.email', e.target.checked)} /> Email
          </div>
        </div>

        <div>
          <label>Min price for alert</label>
          <div>
            <input type="number" min={0} step={1} value={settings.min_price_for_alert ?? ''} onChange={e => updateField('min_price_for_alert', e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label>Threshold Percent (%)</label>
          <div>
            <input type="number" min={0} step={0.1} value={settings.threshold_percent ?? ''} onChange={e => updateField('threshold_percent', e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label>Threshold Absolute (currency)</label>
          <div>
            <input type="number" min={0} step={1} value={settings.threshold_absolute ?? ''} onChange={e => updateField('threshold_absolute', e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Quiet hours (optional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="start (HH:MM)" value={settings.quiet_hours?.start || ''} onChange={e => updateField('quiet_hours.start', e.target.value)} />
            <input placeholder="end (HH:MM)" value={settings.quiet_hours?.end || ''} onChange={e => updateField('quiet_hours.end', e.target.value)} />
          </div>
          <small>Leave blank to disable quiet hours.</small>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        <span style={{ marginLeft: 12 }}>{message}</span>
      </div>
    </div>
  );
};

export default AlertSettings;
