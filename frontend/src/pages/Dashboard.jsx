import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getMedicines, getBatches, getProfitReport, getInventoryValue } from '../api';
import { FiChevronDown, FiChevronUp, FiCalendar, FiSearch, FiX } from 'react-icons/fi';

// Native <input type="date"> follows the browser locale (often mm/dd/yyyy).
// react-datepicker lets us force dd/mm/yyyy. State stays ISO (yyyy-mm-dd) for
// the API; these helpers convert to/from Date in LOCAL time (no UTC day shift).
const toISO = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const PERIODS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
];

function ProfitSection({ period, label }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    getProfitReport(period)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const fmt = (v) => `৳${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="card" style={{ marginBottom: 16, padding: 20, color: '#94a3b8' }}>Loading {label}…</div>;
  if (!data) return null;

  // Filter orders by medicine name search (monthly only)
  const allOrders = data.orders || [];
  const query = searchQuery.trim().toLowerCase();
  const orders = period === 'monthly' && query
    ? allOrders.filter((o) => (o.items || []).some((it) => it.medicine_name.toLowerCase().includes(query)))
    : allOrders;

  const filteredTotals = period === 'monthly' && query
    ? orders.reduce((acc, o) => ({ buying: acc.buying + o.total_buying, selling: acc.selling + o.total_selling, profit: acc.profit + o.profit }), { buying: 0, selling: 0, profit: 0 })
    : { buying: data.total_buying, selling: data.total_selling, profit: data.total_profit };

  const profitColor = filteredTotals.profit >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Medicine search — monthly only */}
      {period === 'monthly' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FiSearch size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by medicine name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', outline: 'none', background: '#f8fafc' }}
          />
          {searchQuery && (
            <button
              onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      )}

      {/* Summary row — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {label}
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>({orders.length} order{orders.length !== 1 ? 's' : ''}){query && ' — filtered'}</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Buying</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmt(filteredTotals.buying)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Selling</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmt(filteredTotals.selling)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Profit</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: profitColor }}>{fmt(filteredTotals.profit)}</div>
          </div>
          <span style={{ color: '#94a3b8', marginLeft: 4 }}>{expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</span>
        </div>
      </div>

      {/* Expanded — order-by-order details */}
      {expanded && (
        <div style={{ marginTop: 16 }}>
          {orders.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No orders recorded for this period.</div>
          ) : (
            orders.map((order) => {
              const items = order.items || [];
              const orderDate = order.created_at
                ? new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={order.order_id} style={{ marginBottom: 14, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Order header */}
                  <div style={{ background: '#f8fafc', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                      Sale #{order.order_number || order.order_id}
                      <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.78rem' }}>{orderDate}</span>
                      <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.78rem' }}>({items.length} item{items.length !== 1 ? 's' : ''})</span>
                      {order.discount_pct > 0 && (
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>
                          {order.discount_pct}% off
                        </span>
                      )}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: order.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                      Profit: {fmt(order.profit)}
                    </span>
                  </div>
                  {/* Items table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={thStyle}>Medicine</th>
                        <th style={thStyle}>Batch</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Buy ৳</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Sell ৳</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Profit ৳</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle}>
                            {it.medicine_name}
                            {it.brand ? <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}> — {it.brand}</span> : ''}
                          </td>
                          <td style={tdStyle}>{it.batch_number || '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{it.quantity}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(it.total_buying)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(it.total_selling)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: it.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(it.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                        <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', color: '#64748b' }}>Totals</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(order.total_buying)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(order.total_selling)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: order.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(order.profit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 };
const tdStyle = { padding: '7px 10px' };

/* ─── Custom Date Range Section ─────────────────────────────── */
function CustomRangeSection() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [applied, setApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleApply = () => {
    if (!from || !to) return;
    setLoading(true);
    setApplied(true);
    getProfitReport('custom', from, to)
      .then((res) => { setData(res.data); setExpanded(false); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  const fmt = (v) => `৳${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const allOrders = data?.orders || [];
  const query = searchQuery.trim().toLowerCase();
  const orders = query
    ? allOrders.filter((o) => (o.items || []).some((it) => it.medicine_name.toLowerCase().includes(query)))
    : allOrders;
  const filteredTotals = query
    ? orders.reduce((acc, o) => ({ buying: acc.buying + o.total_buying, selling: acc.selling + o.total_selling, profit: acc.profit + o.profit }), { buying: 0, selling: 0, profit: 0 })
    : { buying: data?.total_buying || 0, selling: data?.total_selling || 0, profit: data?.total_profit || 0 };
  const profitColor = filteredTotals.profit >= 0 ? '#16a34a' : '#dc2626';
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {/* Header with date pickers */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: applied && data ? 14 : 0 }}>
        <FiCalendar size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>Custom Range</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4, flexWrap: 'wrap' }}>
          <DatePicker
            selected={fromISO(from)}
            onChange={(d) => setFrom(toISO(d))}
            maxDate={fromISO(to)}
            dateFormat="dd/MM/yyyy"
            className="dp-input"
            wrapperClassName="dp-wrapper"
          />
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>to</span>
          <DatePicker
            selected={fromISO(to)}
            onChange={(d) => setTo(toISO(d))}
            minDate={fromISO(from)}
            maxDate={fromISO(today)}
            dateFormat="dd/MM/yyyy"
            className="dp-input"
            wrapperClassName="dp-wrapper"
          />
          <button
            onClick={handleApply}
            disabled={loading || !from || !to}
            style={{ padding: '7px 18px', border: 'none', borderRadius: 6, background: loading ? '#cbd5e1' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.83rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Results */}
      {applied && data && (
        <>
          {/* Medicine search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <FiSearch size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by medicine name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', outline: 'none', background: '#f8fafc' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex' }}
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <div
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
              {fmtDate(from)} — {fmtDate(to)}
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>({orders.length} order{orders.length !== 1 ? 's' : ''}){query && ' — filtered'}</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Buying</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmt(filteredTotals.buying)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Selling</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{fmt(filteredTotals.selling)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Profit</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: profitColor }}>{fmt(filteredTotals.profit)}</div>
              </div>
              <span style={{ color: '#94a3b8', marginLeft: 4 }}>{expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}</span>
            </div>
          </div>

          {expanded && (
            <div style={{ marginTop: 16 }}>
              {orders.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No orders in this date range.</div>
              ) : (
                orders.map((order) => {
                  const items = order.items || [];
                  const orderDate = order.created_at
                    ? new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div key={order.order_id} style={{ marginBottom: 14, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                          Sale #{order.order_number || order.order_id}
                          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.78rem' }}>{orderDate}</span>
                          <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 8, fontSize: '0.78rem' }}>({items.length} item{items.length !== 1 ? 's' : ''})</span>
                          {order.discount_pct > 0 && (
                            <span style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 10 }}>{order.discount_pct}% off</span>
                          )}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: order.profit >= 0 ? '#16a34a' : '#dc2626' }}>Profit: {fmt(order.profit)}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={thStyle}>Medicine</th>
                            <th style={thStyle}>Batch</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Buy ৳</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Sell ৳</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>Profit ৳</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={tdStyle}>{it.medicine_name}{it.brand ? <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}> — {it.brand}</span> : ''}</td>
                              <td style={tdStyle}>{it.batch_number || '—'}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>{it.quantity}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(it.total_buying)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(it.total_selling)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: it.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(it.profit)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                            <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', color: '#64748b' }}>Totals</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(order.total_buying)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(order.total_selling)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: order.profit >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(order.profit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ medicines: 0, batches: 0, inventoryValue: 0 });

  useEffect(() => {
    Promise.all([getMedicines(), getBatches(), getInventoryValue()])
      .then(([m, b, iv]) => {
        const activeBatches = b.data.filter((batch) => batch.quantity > 0);
        const uniqueBatchNums = new Set(activeBatches.map((batch) => batch.batch_number));
        setStats({
          medicines: m.data.length,
          batches: uniqueBatchNums.size,
          inventoryValue: iv.data.inventory_value || 0,
        });
      })
      .catch(() => { });
  }, []);

  const fmtCurrency = (v) => `৳${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Medicines</div>
          <div className="value">{stats.medicines}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Batches</div>
          <div className="value">{stats.batches}</div>
        </div>
        <div className="stat-card">
          <div className="label">Current Inventory Value</div>
          <div className="value" style={{ fontSize: '1.5rem' }}>{fmtCurrency(stats.inventoryValue)}</div>
        </div>
      </div>

      {/* Profit Sections */}
      <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 14, color: '#334155' }}>📊 Profit Overview</h3>
      {PERIODS.map((p) => (
        <ProfitSection key={p.key} period={p.key} label={p.label} />
      ))}
      {<CustomRangeSection />}
    </>
  );
}
