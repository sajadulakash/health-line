import { useState, useEffect, useRef } from 'react';
import { getSaleOrders, createSaleOrder, deleteSaleOrder, updateSaleOrder, getBatches, getMedicines } from '../api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiSearch, FiX, FiShoppingCart, FiEdit2 } from 'react-icons/fi';

const emptyRow = () => ({
  key: Date.now() + Math.random(),
  // search state
  searchQuery: '',
  showSuggestions: false,
  // selected
  selectedMedicine: null,  // { id, name, brand }
  batch_id: '',
  // sale fields
  quantity_sold: '',
  sale_price: '',
});

const DRAFT_KEY = 'stockout_draft';

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        rows: parsed.rows.map((r) => ({ ...r, showSuggestions: false })),
      };
    }
  } catch {}
  return { rows: [emptyRow()] };
};

/* ── Build an edit row from an existing sale item ── */
const initEditRow = (item, batches, medicineList) => {
  const batch = batches.find((b) => b.id === item.batch_id);
  const med = batch ? medicineList.find((m) => m.id === batch.medicine_id) : null;
  return {
    key: Date.now() + Math.random(),
    locked: true,
    batch_id: item.batch_id,
    medicine_name: med?.name || '—',
    brand: med?.brand || '',
    batch_number: batch?.batch_number || '?',
    unit_selling_price: Number(batch?.selling_price ?? 0),
    quantity_sold: String(item.quantity_sold || ''),
    sale_price: String(item.sale_price || ''),
    // unused in locked rows
    searchQuery: '',
    showSuggestions: false,
    selectedMedicine: null,
  };
};

/* ── Read-only medicine/batch row with editable qty & price ── */
function LockedEditRow({ row, index, onUpdate, onRemove }) {
  const inputStyle = { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', width: '100%' };
  return (
    <tr>
      <td style={{ color: '#94a3b8', fontWeight: 600, padding: '8px 12px' }}>{index + 1}</td>
      <td style={{ padding: '8px 8px', minWidth: 180 }}>
        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{row.medicine_name}</span>
        {row.brand && <span style={{ color: '#2563eb', marginLeft: 6, fontSize: '0.75rem' }}>{row.brand}</span>}
      </td>
      <td style={{ padding: '8px 8px', fontSize: '0.85rem', color: '#475569' }}>#{row.batch_number}</td>
      <td style={{ padding: '8px 8px', width: 110 }}>
        <input
          type="number" min="1"
          value={row.quantity_sold}
          onChange={(e) => {
            const qty = e.target.value;
            const total = qty && row.unit_selling_price > 0 ? (Number(qty) * row.unit_selling_price).toFixed(2) : '';
            onUpdate({ quantity_sold: qty, sale_price: total });
          }}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px 8px', width: 130 }}>
        <input
          type="number" step="0.01"
          value={row.sale_price}
          onChange={(e) => onUpdate({ sale_price: e.target.value })}
          style={inputStyle}
        />
      </td>
      <td style={{ padding: '8px 8px', width: 40, textAlign: 'center' }}>
        <button type="button" onClick={onRemove}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
          <FiTrash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

/* ── Inline search+batch picker for one row ── */
function BatchPicker({ row, index, batches, medicineList, onUpdate, onRemove, canRemove }) {
  const wrapRef = useRef(null);
  const inputBoxRef = useRef(null);
  const [dropPos, setDropPos] = useState(null);

  const openDropdown = () => {
    if (inputBoxRef.current) {
      const r = inputBoxRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    onUpdate({ showSuggestions: true });
  };

  // medicines that have stock (in-stock batches)
  const inStockMedIds = new Set(batches.filter((b) => b.quantity > 0).map((b) => b.medicine_id));

  const suggestions = row.searchQuery.trim()
    ? medicineList.filter(
        (m) =>
          inStockMedIds.has(m.id) &&
          (m.name.toLowerCase().includes(row.searchQuery.toLowerCase()) ||
            (m.brand || '').toLowerCase().includes(row.searchQuery.toLowerCase()) ||
            (m.generic_name || '').toLowerCase().includes(row.searchQuery.toLowerCase()))
      )
    : [];

  const batchesForMed = row.selectedMedicine
    ? batches.filter((b) => b.medicine_id === row.selectedMedicine.id && b.quantity > 0)
    : [];

  const selectMedicine = (m) => {
    onUpdate({ searchQuery: m.name, showSuggestions: false, selectedMedicine: m, batch_id: '', sale_price: '' });
  };

  const clearMedicine = () => {
    onUpdate({ searchQuery: '', showSuggestions: false, selectedMedicine: null, batch_id: '', sale_price: '' });
  };

  const handleBatchSelect = (batchId) => {
    const batch = batches.find((b) => b.id === Number(batchId));
    const unitPrice = Number(batch?.selling_price ?? 0);
    const qty = Number(row.quantity_sold) || 0;
    const total = qty > 0 && unitPrice > 0 ? (qty * unitPrice).toFixed(2) : '';
    onUpdate({ batch_id: batchId, sale_price: total });
  };

  // close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        onUpdate({ showSuggestions: false });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputStyle = { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', width: '100%' };

  return (
    <tr>
      <td style={{ color: '#94a3b8', fontWeight: 600, padding: '8px 12px' }}>{index + 1}</td>

      {/* Medicine search */}
      <td style={{ padding: '8px 8px', minWidth: 220 }}>
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <div ref={inputBoxRef} style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
            <FiSearch size={13} style={{ margin: '0 8px', color: '#94a3b8', flexShrink: 0 }} />
            <input
              value={row.searchQuery}
              onChange={(e) => { openDropdown(); onUpdate({ searchQuery: e.target.value, showSuggestions: true, selectedMedicine: null, batch_id: '', sale_price: '' }); }}
              onFocus={openDropdown}
              placeholder="Search medicine…"
              style={{ flex: 1, border: 'none', outline: 'none', padding: '7px 0', fontSize: '0.85rem' }}
            />
            {row.searchQuery && (
              <button type="button" onClick={clearMedicine} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 8px' }}>
                <FiX size={13} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown — fixed so it escapes overflow:auto parents */}
          {row.showSuggestions && suggestions.length > 0 && dropPos && (
            <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
              {suggestions.map((m) => (
                <div
                  key={m.id}
                  onMouseDown={() => selectMedicine(m)}
                  style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{m.name}</span>
                  {m.brand && <span style={{ color: '#2563eb', marginLeft: 6, fontSize: '0.78rem' }}>{m.brand}</span>}
                  {m.generic_name && <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: '0.75rem' }}>({m.generic_name})</span>}
                </div>
              ))}
            </div>
          )}
          {row.showSuggestions && row.searchQuery.trim() && suggestions.length === 0 && dropPos && (
            <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: '0.83rem', color: '#94a3b8' }}>
              No in-stock medicine found
            </div>
          )}
        </div>
      </td>

      {/* Batch selector — shown only after medicine selected */}
      <td style={{ padding: '8px 8px', minWidth: 200 }}>
        {row.selectedMedicine ? (
          <select
            value={row.batch_id}
            onChange={(e) => handleBatchSelect(e.target.value)}
            required
            style={{ ...inputStyle }}
          >
            <option value="">Select batch…</option>
            {batchesForMed.map((b) => (
              <option key={b.id} value={b.id}>
                Batch #{b.batch_number} — Qty: {b.quantity} — ৳{b.selling_price}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: '0.8rem', paddingLeft: 6 }}>Search medicine first</span>
        )}
      </td>

      {/* Qty */}
      <td style={{ padding: '8px 8px', width: 110 }}>
        <input
          type="number" min="1"
          value={row.quantity_sold}
          onChange={(e) => {
            const qty = e.target.value;
            const batch = batches.find((b) => b.id === Number(row.batch_id));
            const unitPrice = Number(batch?.selling_price ?? 0);
            const total = qty && unitPrice > 0 ? (Number(qty) * unitPrice).toFixed(2) : '';
            onUpdate({ quantity_sold: qty, sale_price: total });
          }}
          required
          disabled={!row.batch_id}
          style={{ ...inputStyle, opacity: row.batch_id ? 1 : 0.4 }}
        />
      </td>

      {/* Total price */}
      <td style={{ padding: '8px 8px', width: 130 }}>
        <input
          type="number" step="0.01"
          value={row.sale_price}
          onChange={(e) => onUpdate({ sale_price: e.target.value })}
          required
          disabled={!row.batch_id}
          style={{ ...inputStyle, opacity: row.batch_id ? 1 : 0.4 }}
        />
      </td>

      {/* Remove */}
      <td style={{ padding: '8px 8px', width: 40, textAlign: 'center' }}>
        <button
          type="button" onClick={onRemove} disabled={!canRemove}
          style={{ border: 'none', background: 'none', cursor: canRemove ? 'pointer' : 'not-allowed', color: canRemove ? '#dc2626' : '#cbd5e1' }}
        >
          <FiTrash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

export default function StockOut() {
  const [orders, setOrders] = useState([]);
  const [batches, setBatches] = useState([]);
  const [medicineList, setMedicineList] = useState([]);
  const [medicineMap, setMedicineMap] = useState({});
  const [rows, setRows] = useState(() => loadDraft().rows);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingOrder, setEditingOrder] = useState(null);
  const [editRows, setEditRows] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Persist draft on every change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ rows }));
  }, [rows]);

  const load = () => {
    Promise.all([getSaleOrders(), getBatches(), getMedicines()])
      .then(([oRes, bRes, mRes]) => {
        setOrders(oRes.data);
        setBatches(bRes.data);
        setMedicineList(mRes.data);
        const map = {};
        mRes.data.forEach((m) => (map[m.id] = m.name));
        setMedicineMap(map);
      })
      .catch(() => toast.error('Failed to load'));
  };

  useEffect(load, []);

  const updateRow = (index, updates) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Delete this sale order and restore inventory?')) return;
    try {
      await deleteSaleOrder(orderId);
      toast.success('Sale order deleted — inventory restored');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete sale order');
    }
  };

  const handleEditStart = (order) => {
    setEditRows(order.items.map((item) => initEditRow(item, batches, medicineList)));
    setEditingOrder(order);
  };

  const handleEditCancel = () => {
    setEditingOrder(null);
    setEditRows([]);
  };

  const updateEditRow = (index, updates) =>
    setEditRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));

  const addEditRow = () => setEditRows((prev) => [...prev, emptyRow()]);
  const removeEditRow = (index) => setEditRows((prev) => prev.filter((_, i) => i !== index));

  const handleSaveEdit = async () => {
    if (editRows.length === 0) { toast.error('Add at least one item'); return; }
    if (editRows.some((r) => !r.batch_id || !r.quantity_sold || !r.sale_price)) {
      toast.error('Please complete all rows — medicine, batch, quantity, and price');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateSaleOrder(editingOrder.id, {
        items: editRows.map((row) => ({
          batch_id: Number(row.batch_id),
          quantity_sold: Number(row.quantity_sold),
          sale_price: Number(row.sale_price),
        })),
      });
      toast.success('Sale order updated — inventory adjusted');
      setEditingOrder(null);
      setEditRows([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update sale order');
    }
    setEditSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rows.some((r) => !r.batch_id || !r.quantity_sold || !r.sale_price)) {
      toast.error('Please complete all rows — medicine, batch, quantity, and price');
      return;
    }

    setSubmitting(true);
    try {
      await createSaleOrder({
        items: rows.map((row) => ({
          batch_id: Number(row.batch_id),
          quantity_sold: Number(row.quantity_sold),
          sale_price: Number(row.sale_price),
        })),
      });
      toast.success(`${rows.length} item(s) sold!`);
      localStorage.removeItem(DRAFT_KEY);
      setRows([emptyRow()]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record sale');
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="page-header">
        <h2>🛒 Stock Out</h2>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
            New Stock Out Entry
          </h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
            <FiPlus /> Add Row
          </button>
        </div>
          <form onSubmit={handleSubmit}>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', width: 40 }}>#</th>
                    <th style={{ padding: '9px 8px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Medicine *</th>
                    <th style={{ padding: '9px 8px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Batch *</th>
                    <th style={{ padding: '9px 8px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', width: 110 }}>Qty Sold *</th>
                    <th style={{ padding: '9px 8px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', width: 130 }}>Total Price ৳ *</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <BatchPicker
                      key={row.key}
                      row={row}
                      index={i}
                      batches={batches}
                      medicineList={medicineList}
                      onUpdate={(updates) => updateRow(i, updates)}
                      onRemove={() => removeRow(i)}
                      canRemove={rows.length > 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{rows.length} item(s)</span>
              <div className="form-actions" style={{ margin: 0 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : `Record ${rows.length} Sale(s)`}
                </button>
              </div>
            </div>
          </form>
        </div>

      {/* Sales History — grouped by sale order */}
      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, color: '#475569' }}>Stock-Out History</h3>

      {(() => {
        if (orders.length === 0)
          return <div className="empty-state">No stock-out records yet.</div>;

        return orders.map((order) => {
          const items = order.items || [];
          const totalQty = items.reduce((s, i) => s + (i.quantity_sold || 0), 0);
          const totalRevenue = items.reduce((s, i) => s + (parseFloat(i.sale_price) || 0), 0);
          const orderDate = order.created_at
            ? new Date(order.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
            : '';
          const orderTime = order.created_at
            ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          // ── Edit mode ──
          if (editingOrder?.id === order.id) {
            const editQty = editRows.reduce((s, r) => s + (Number(r.quantity_sold) || 0), 0);
            const editTotal = editRows.reduce((s, r) => s + (Number(r.quantity_sold) || 0) * (Number(r.sale_price) || 0), 0);
            const thStyle = { padding: '9px 8px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' };
            return (
              <div key={order.id} className="card" style={{ marginBottom: 14, border: '2px solid #2563eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <FiShoppingCart style={{ color: '#2563eb' }} />
                  <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.95rem' }}>
                    Editing Sale #{order.order_number || order.id}
                  </span>
                  <span className="badge badge-success">{editRows.length} item(s)</span>
                  {orderDate && (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{orderDate} {orderTime}</span>
                  )}
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto' }}>
                    {editQty} unit(s) · ৳{editTotal.toFixed(2)}
                  </span>
                </div>
                <div className="table-container">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#eff6ff' }}>
                        <th style={{ ...thStyle, width: 40 }}>#</th>
                        <th style={thStyle}>Medicine</th>
                        <th style={thStyle}>Batch #</th>
                        <th style={{ ...thStyle, width: 110 }}>Qty Sold *</th>
                        <th style={{ ...thStyle, width: 130 }}>Total Price ৳ *</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editRows.map((row, i) =>
                        row.locked ? (
                          <LockedEditRow
                            key={row.key}
                            row={row}
                            index={i}
                            onUpdate={(u) => updateEditRow(i, u)}
                            onRemove={() => removeEditRow(i)}
                          />
                        ) : (
                          <BatchPicker
                            key={row.key}
                            row={row}
                            index={i}
                            batches={batches}
                            medicineList={medicineList}
                            onUpdate={(u) => updateEditRow(i, u)}
                            onRemove={() => removeEditRow(i)}
                            canRemove={true}
                          />
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addEditRow}>
                    <FiPlus /> Add Row
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-outline" onClick={handleEditCancel}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={editSubmitting}>
                      {editSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // ── Read-only mode ──
          return (
            <div key={order.id} className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <FiShoppingCart style={{ color: '#2563eb' }} />
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.95rem' }}>
                  Sale #{order.order_number || order.id}
                </span>
                <span className="badge badge-success">{items.length} item(s)</span>
                {orderDate && (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{orderDate} {orderTime}</span>
                )}
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 'auto' }}>
                  {totalQty} unit(s) · ৳{totalRevenue.toFixed(2)}
                </span>
                <button
                  onClick={() => handleEditStart(order)}
                  style={{
                    border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb',
                    borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <FiEdit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDeleteOrder(order.id)}
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
                      <th>Medicine</th>
                      <th>Brand</th>
                      <th>Batch #</th>
                      <th>Qty Sold</th>
                      <th>Total Price ৳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => {
                      const batch = batches.find((b) => b.id === s.batch_id);
                      const med = batch ? medicineList.find((m) => m.id === batch.medicine_id) : null;
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>{med?.name || (batch ? (medicineMap[batch.medicine_id] || '—') : '—')}</td>
                          <td>{med?.brand || '—'}</td>
                          <td>{batch ? `#${batch.batch_number}` : '—'}</td>
                          <td>{s.quantity_sold}</td>
                          <td>{s.sale_price}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        });
      })()}
    </>
  );
}

