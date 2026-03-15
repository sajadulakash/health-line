import { useEffect, useState, useMemo } from 'react';
import { getTopSelling } from '../api';
import { toast } from 'react-toastify';
import { FiFilter } from 'react-icons/fi';

export default function TopSelling() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');

  useEffect(() => {
    getTopSelling(100)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const brands = useMemo(() => [...new Set(data.map((d) => d.brand).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() =>
    brandFilter ? data.filter((d) => d.brand === brandFilter) : data,
    [data, brandFilter]
  );

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <h2>📈 Top Selling Products</h2>
        {/* Brand Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px' }}>
          <FiFilter size={14} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Brand:</span>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', background: 'transparent', color: '#1e293b', cursor: 'pointer', minWidth: 120 }}
          >
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          {brandFilter && (
            <button onClick={() => setBrandFilter('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem', padding: 0 }}>✕</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No sales data{brandFilter ? ` for brand "${brandFilter}"` : ''} yet.</div>
      ) : (
        <>
          <div className="card table-container">
            <table>
              <thead>
                <tr><th>#</th><th>Medicine</th><th>Brand</th><th>Category</th><th>Total Sold</th></tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.medicine_id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.brand || '—'}</td>
                    <td>{item.category || '—'}</td>
                    <td><strong>{item.total_sold}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
