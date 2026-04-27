import { useState, useEffect } from 'react';
import { getThirdPartySales, deleteThirdPartySale } from '../api';
import { toast } from 'react-toastify';
import { FiShoppingBag, FiTrash2 } from 'react-icons/fi';

export default function TPSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const loadData = () => {
    setLoading(true);
    getThirdPartySales()
      .then((res) => setSales(res.data))
      .catch(() => toast.error('Failed to load third party sales'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteThirdPartySale(id);
      toast.success('Third party sale deleted');
      setDeleting(null);
      loadData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const fmt = (v) => `৳${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const totalBuying = sales.reduce((s, tp) => s + (parseFloat(tp.buying_price) || 0), 0);
  const totalSelling = sales.reduce((s, tp) => s + (parseFloat(tp.sale_price) || 0), 0);
  const totalProfit = totalSelling - totalBuying;

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h2>🏪 Third Party Sales</h2>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
          {sales.length} sale(s)
        </span>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="label">Total Buying</div>
          <div className="value" style={{ fontSize: '1.4rem' }}>{fmt(totalBuying)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Selling</div>
          <div className="value" style={{ fontSize: '1.4rem' }}>{fmt(totalSelling)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Profit</div>
          <div className="value" style={{ fontSize: '1.4rem', color: totalProfit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(totalProfit)}</div>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="empty-state">No third party sales recorded yet.</div>
      ) : (
        sales.map((tp) => {
          const profit = (parseFloat(tp.sale_price) || 0) - (parseFloat(tp.buying_price) || 0);
          const date = tp.date
            ? new Date(tp.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
            : '';
          const time = tp.date
            ? new Date(tp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div key={tp.id} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <FiShoppingBag style={{ color: '#92400e' }} />
                <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                  TP Sale #{tp.id}
                </span>
                {tp.source_shop && (
                  <span className="badge badge-warning">{tp.source_shop}</span>
                )}
                {date && (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{date} {time}</span>
                )}
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto', fontWeight: 600 }}>
                  Profit: <span style={{ color: profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(profit)}</span>
                </span>
                <button
                  onClick={() => setDeleting(tp)}
                  style={{
                    border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                    borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <FiTrash2 size={13} /> Delete
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Source Shop</th>
                      <th>Buying Price ৳</th>
                      <th>Selling Price ৳</th>
                      <th>Profit ৳</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{tp.source_shop || '—'}</td>
                      <td>{fmt(tp.buying_price)}</td>
                      <td>{fmt(tp.sale_price)}</td>
                      <td style={{ fontWeight: 700, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(profit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <div onClick={() => setDeleting(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 30px', width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Delete TP Sale?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 20 }}>
              TP Sale <strong>#{deleting.id}</strong>{deleting.source_shop ? ` from ${deleting.source_shop}` : ''} will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDelete(deleting.id)} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                🗑️ Yes, Delete
              </button>
              <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#f1f5f9', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
