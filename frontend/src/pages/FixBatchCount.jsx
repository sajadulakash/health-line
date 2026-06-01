import { useEffect, useState, useCallback } from 'react';
import { getMedicines, getBatches, fixBatchCount } from '../api';
import { toast } from 'react-toastify';
import { FiSearch, FiCheck, FiX, FiEdit2 } from 'react-icons/fi';

export default function FixBatchCount() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMedicines(), getBatches()])
      .then(([mRes, bRes]) => {
        setMedicines(mRes.data);
        setBatches(bRes.data);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build a medicine lookup map
  const medMap = {};
  medicines.forEach((m) => (medMap[m.id] = m));

  // Build flat rows: each batch with its medicine info
  const rows = batches
    .map((b) => ({
      ...b,
      medicineName: medMap[b.medicine_id]?.name || `#${b.medicine_id}`,
      genericName: medMap[b.medicine_id]?.generic_name || '',
    }))
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.medicineName.toLowerCase().includes(q) ||
        (r.batch_number || '').toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q)
      );
    });

  const startEdit = (batch) => {
    setEditingId(batch.id);
    setEditValue(String(batch.quantity ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (batchId) => {
    const qty = parseInt(editValue, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('Enter a valid non-negative quantity');
      return;
    }
    setSaving(true);
    try {
      const { data } = await fixBatchCount(batchId, qty);
      // Update local state
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, quantity: data.quantity } : b))
      );
      toast.success('Quantity updated!');
      cancelEdit();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e, batchId) => {
    if (e.key === 'Enter') saveEdit(batchId);
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <>
      <div className="page-header">
        <h2>🔧 Fix Batch Count</h2>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <FiSearch />
        <input
          id="fix-batch-search"
          type="text"
          placeholder="Search by medicine name, generic name, or batch number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          {search ? 'No matches found' : 'No batches available'}
        </div>
      ) : (
        <div className="card table-container">
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Generic Name</th>
                <th>Batch #</th>
                <th>Current Qty</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.medicineName}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {r.genericName || '—'}
                  </td>
                  <td>{r.batch_number || '—'}</td>
                  <td>
                    {editingId === r.id ? (
                      <input
                        id={`edit-qty-${r.id}`}
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, r.id)}
                        autoFocus
                        style={{
                          width: 90,
                          padding: '5px 8px',
                          border: '2px solid var(--primary)',
                          borderRadius: 6,
                          fontSize: '0.9rem',
                          outline: 'none',
                          background: '#eff6ff',
                        }}
                      />
                    ) : (
                      <span
                        className={`badge ${
                          (r.quantity ?? 0) === 0
                            ? 'badge-danger'
                            : (r.quantity ?? 0) <= 10
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                        style={{ fontSize: '0.82rem', minWidth: 40, textAlign: 'center', display: 'inline-block' }}
                      >
                        {r.quantity ?? 0}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === r.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          id={`save-qty-${r.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => saveEdit(r.id)}
                          disabled={saving}
                          title="Save"
                        >
                          <FiCheck />
                        </button>
                        <button
                          id={`cancel-qty-${r.id}`}
                          className="btn btn-outline btn-sm"
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Cancel"
                        >
                          <FiX />
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`edit-qty-${r.id}`}
                        className="btn btn-outline btn-sm"
                        onClick={() => startEdit(r)}
                        title="Edit quantity"
                      >
                        <FiEdit2 /> Fix
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: '0.8rem', color: '#94a3b8' }}>
        Showing {rows.length} batch{rows.length !== 1 ? 'es' : ''}
        {search ? ` matching "${search}"` : ''}
      </p>
    </>
  );
}
