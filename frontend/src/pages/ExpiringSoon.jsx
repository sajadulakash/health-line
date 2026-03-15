import { useEffect, useState } from 'react';
import { getExpiringSoon, getMedicines } from '../api';
import { toast } from 'react-toastify';

export default function ExpiringSoon() {
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState({});
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  const load = (d) => {
    setLoading(true);
    Promise.all([getExpiringSoon(d), getMedicines()])
      .then(([bRes, mRes]) => {
        setBatches(bRes.data);
        const map = {};
        mRes.data.forEach((m) => (map[m.id] = m.name));
        setMedicines(map);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(days), [days]);

  const expiryBadge = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="badge badge-danger">Expired</span>;
    if (diff <= 30) return <span className="badge badge-danger">{diff}d left</span>;
    if (diff <= 90) return <span className="badge badge-warning">{diff}d left</span>;
    return <span className="badge badge-success">{diff}d left</span>;
  };

  return (
    <>
      <div className="page-header">
        <h2>⚠️ Expiring Soon</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Within:</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : batches.length === 0 ? (
        <div className="empty-state">No batches expiring within {days} days 🎉</div>
      ) : (
        <div className="card table-container">
          <table>
            <thead>
              <tr><th>Medicine</th><th>Batch #</th><th>Qty</th><th>Expires</th><th>Status</th></tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{medicines[b.medicine_id] || b.medicine_id}</td>
                  <td>{b.batch_number || '—'}</td>
                  <td>{b.quantity}</td>
                  <td>{b.expiration_date}</td>
                  <td>{expiryBadge(b.expiration_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
