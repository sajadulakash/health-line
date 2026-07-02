import { useEffect, useState, useCallback } from 'react';
import { getMedicines, updateMedicine } from '../api';
import { toast } from 'react-toastify';
import { FiSearch, FiCheck, FiX, FiEdit2 } from 'react-icons/fi';

export default function FixBatchCount() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getMedicines()
      .then((res) => setMedicines(res.data))
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = medicines.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.generic_name || '').toLowerCase().includes(q) ||
      (m.brand || '').toLowerCase().includes(q)
    );
  });

  const startEdit = (med) => {
    setEditingId(med.id);
    setEditValue(med.strip_size != null ? String(med.strip_size) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (medId) => {
    // Empty input clears the strip size (back to NULL)
    let stripSize = null;
    if (editValue.trim() !== '') {
      const n = parseInt(editValue, 10);
      if (isNaN(n) || n < 1) {
        toast.error('Enter a strip size of 1 or more (or leave empty to clear)');
        return;
      }
      stripSize = n;
    }
    setSaving(true);
    try {
      const { data } = await updateMedicine(medId, { strip_size: stripSize });
      setMedicines((prev) =>
        prev.map((m) => (m.id === medId ? { ...m, strip_size: data.strip_size } : m))
      );
      toast.success('Strip size updated!');
      cancelEdit();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e, medId) => {
    if (e.key === 'Enter') saveEdit(medId);
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <>
      <div className="page-header">
        <h2>🔧 Fix Strip Count</h2>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <FiSearch />
        <input
          id="fix-strip-search"
          type="text"
          placeholder="Search by medicine name, generic name, or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          {search ? 'No matches found' : 'No medicines available'}
        </div>
      ) : (
        <div className="card table-container">
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Generic Name</th>
                <th>Brand</th>
                <th>Strip Size (units/strip)</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {m.generic_name || '—'}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {m.brand || '—'}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <input
                        id={`edit-strip-${m.id}`}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="empty = none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, m.id)}
                        autoFocus
                        style={{
                          width: 110,
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
                        className={`badge ${m.strip_size != null ? 'badge-success' : 'badge-warning'}`}
                        style={{ fontSize: '0.82rem', minWidth: 40, textAlign: 'center', display: 'inline-block' }}
                      >
                        {m.strip_size != null ? m.strip_size : '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          id={`save-strip-${m.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => saveEdit(m.id)}
                          disabled={saving}
                          title="Save"
                        >
                          <FiCheck />
                        </button>
                        <button
                          id={`cancel-strip-${m.id}`}
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
                        id={`edit-strip-btn-${m.id}`}
                        className="btn btn-outline btn-sm"
                        onClick={() => startEdit(m)}
                        title="Edit strip size"
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
        Showing {rows.length} medicine{rows.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}. Editing updates the strip size directly on the
        medicine. Leave the field empty to clear it (no strip size).
      </p>
    </>
  );
}
