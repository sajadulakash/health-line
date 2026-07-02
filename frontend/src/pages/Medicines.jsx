import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { getMedicines, getBatches, getSales, updateMedicine, deleteMedicine, uploadMedicineImage, updateSellingPrice, getAlternatives, getMedicineNote, upsertMedicineNote, getAllMedicineNotes, API_BASE } from '../api';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiBox, FiX, FiEdit2, FiTrash2, FiCamera, FiSave, FiLayers, FiInfo } from 'react-icons/fi';

/* ─── Detail Modal ─────────────────────────────────────────── */
function MedicineModal({ medicine, onClose }) {
  const [batches, setBatches] = useState([]);
  const [soldMap, setSoldMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBatches(medicine.id), getSales()])
      .then(([bRes, sRes]) => {
        setBatches(bRes.data);
        const sm = {};
        sRes.data.forEach((s) => {
          if (s.batch_id != null) sm[s.batch_id] = (sm[s.batch_id] || 0) + (s.quantity_sold || 0);
        });
        setSoldMap(sm);
      })
      .catch(() => toast.error('Failed to load details'))
      .finally(() => setLoading(false));
  }, [medicine.id]);

  const totalStock = batches.reduce((a, b) => a + (b.quantity || 0), 0);
  const totalSold  = batches.reduce((a, b) => a + (soldMap[b.id] || 0), 0);

  const expiryColor = (dateStr) => {
    if (!dateStr) return '#94a3b8';
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (diff < 0) return '#dc2626';
    if (diff <= 90) return '#f59e0b';
    return '#16a34a';
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Top: image + info */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 200, minWidth: 200, height: 200, background: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
            {medicine.image_url
              ? <img src={`${API_BASE}${medicine.image_url}`} alt={medicine.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '💊'}
          </div>
          <div style={{ flex: 1, padding: '20px 24px', position: 'relative' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><FiX /></button>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{medicine.name}</h2>
            {medicine.brand && <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{medicine.brand}</div>}
            {medicine.generic_name && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Generic: </span>{medicine.generic_name}</div>}
            {medicine.category && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid #bfdbfe', marginBottom: 16 }}>{medicine.category}</span>}
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {[
                { label: 'Batches',       value: batches.length, color: '#6366f1' },
                { label: 'Current Stock', value: totalStock,     color: totalStock > 0 ? '#16a34a' : '#dc2626' },
                { label: 'Total Sold',    value: totalSold,      color: '#f59e0b' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 88 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{loading ? '…' : s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Batches Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: 12 }}>📦 Batch History</h3>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>Loading…</div>
          ) : batches.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>No batches stocked in yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Batch #', 'Current Qty', 'Total Sold', 'Purchase ৳', 'Unit Price ৳', 'Selling ৳', 'Expires'].map((h) => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const sold    = soldMap[b.id] || 0;
                  const expDiff = b.expiration_date ? Math.ceil((new Date(b.expiration_date) - new Date()) / 86400000) : null;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>#{b.batch_number}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: (b.quantity || 0) > 0 ? '#16a34a' : '#dc2626' }}>{b.quantity ?? 0}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f59e0b' }}>{sold}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{b.purchase_price}</td>
                      <td style={{ padding: '10px 12px', color: '#475569', fontWeight: 600 }}>{(b.initial_quantity || b.quantity) && b.purchase_price && Number(b.initial_quantity || b.quantity) > 0 ? (Number(b.purchase_price) / Number(b.initial_quantity || b.quantity)).toFixed(2) : '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{b.selling_price}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {b.expiration_date ? (
                          <span style={{ color: expiryColor(b.expiration_date), fontWeight: 600 }}>
                            {b.expiration_date}
                            {expDiff !== null && <span style={{ fontSize: '0.72rem', marginLeft: 6, opacity: 0.8 }}>({expDiff < 0 ? 'Expired' : `${expDiff}d left`})</span>}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Modal ───────────────────────────────────────────── */
function EditMedicineModal({ medicine, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: medicine.name || '',
    generic_name: medicine.generic_name || '',
    brand: medicine.brand || '',
    category: medicine.category || '',
    selling_price: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const originalNote = useRef(null); // track DB value to avoid blind overwrites
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    medicine.image_url ? `${API_BASE}${medicine.image_url}` : null
  );
  const fileRef = useRef();

  // Load current selling price from latest batch + note
  useEffect(() => {
    getBatches(medicine.id).then((r) => {
      if (r.data.length > 0) {
        setForm((f) => ({ ...f, selling_price: r.data[0].selling_price || '' }));
      }
    }).catch(() => {});
    getMedicineNote(medicine.id).then((r) => {
      const loaded = r.data.note || '';
      originalNote.current = loaded;
      setForm((f) => ({ ...f, note: loaded }));
    }).catch(() => {});
  }, [medicine.id]);

  const handleImage = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      setImagePreview(URL.createObjectURL(f));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      // Update medicine fields
      await updateMedicine(medicine.id, {
        name: form.name.trim(),
        generic_name: form.generic_name.trim() || null,
        brand: form.brand.trim() || null,
        category: form.category.trim() || null,
      });
      // Upload image if changed
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        await uploadMedicineImage(medicine.id, fd);
      }
      // Update selling price across all batches
      const sp = parseFloat(form.selling_price);
      if (!isNaN(sp) && sp >= 0) {
        await updateSellingPrice(medicine.id, sp);
      }
      // Save note only if it was changed
      if (form.note !== originalNote.current) {
        await upsertMedicineNote(medicine.id, form.note);
      }
      toast.success('Medicine updated!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    }
    setSaving(false);
  };

  const labelSt = { fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' };
  const inputSt = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', outline: 'none', background: '#f8fafc' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>✏️ Edit Medicine</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={20} /></button>
        </div>

        {/* Image */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ width: '100%', height: 160, borderRadius: 12, border: '2px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 16, overflow: 'hidden', position: 'relative' }}
        >
          {imagePreview
            ? <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ textAlign: 'center', color: '#94a3b8' }}><FiCamera size={28} /><div style={{ fontSize: '0.75rem', marginTop: 4 }}>Click to upload image</div></div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelSt}>Medicine Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Generic Name</label>
            <input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} style={inputSt} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Brand</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={inputSt} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputSt} />
            </div>
          </div>
          <div>
            <label style={labelSt}>Selling Price ৳ <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>(applies to all batches)</span></label>
            <input type="number" step="0.01" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} style={{ ...inputSt, fontWeight: 700, color: '#16a34a' }} />
          </div>
          <div>
            <label style={labelSt}>Short Note <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>(personal, per-user)</span></label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Add a short note…" rows={2} style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: saving ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <FiSave size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#f1f5f9', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */
export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);      // medicine being edited
  const [deleting, setDeleting] = useState(null);     // medicine pending delete confirm
  const [altMed, setAltMed] = useState(null);          // medicine to show alternatives for
  const [altList, setAltList] = useState([]);
  const [altLoading, setAltLoading] = useState(false);
  const [noteMap, setNoteMap] = useState({});  // { medicine_id: note_text }
  const [notePopup, setNotePopup] = useState(null); // medicine id whose note popup is open
  const [notePos, setNotePos] = useState({ top: 0, left: 0 }); // popup position

  // Filters
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');   // '' | 'out_of_stock' | 'low_stock'
  const [stockThreshold, setStockThreshold] = useState(100);
  const deferredThreshold = useDeferredValue(stockThreshold);

  const loadData = () =>
    Promise.all([getMedicines(), getBatches(), getAllMedicineNotes()])
      .then(([mRes, bRes, nRes]) => {
        setMedicines(mRes.data);
        const sm = {};
        bRes.data.forEach((b) => {
          if (b.medicine_id != null) {
            sm[b.medicine_id] = (sm[b.medicine_id] || 0) + (b.quantity || 0);
          }
        });
        setStockMap(sm);
        setNoteMap(nRes.data || {});
      })
      .catch(() => toast.error('Failed to load medicines'))
      .finally(() => setLoading(false));

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (med) => {
    try {
      await deleteMedicine(med.id);
      toast.success(`${med.name} deleted`);
      setDeleting(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  // Unique brand & category lists
  const brands = useMemo(() => {
    const s = new Set(medicines.map((m) => m.brand).filter(Boolean));
    return [...s].sort();
  }, [medicines]);

  const categories = useMemo(() => {
    const s = new Set(medicines.map((m) => m.category).filter(Boolean));
    return [...s].sort();
  }, [medicines]);

  // Filtered medicines
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return medicines.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.generic_name || '').toLowerCase().includes(q) ||
        (m.brand || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q);
      const matchBrand = !brandFilter || m.brand === brandFilter;
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      const stock = stockMap[m.id] || 0;
      const matchStock =
        !stockFilter ||
        (stockFilter === 'out_of_stock' && stock === 0) ||
        (stockFilter === 'low_stock' && stock < Number(deferredThreshold));
      return matchSearch && matchBrand && matchCategory && matchStock;
    });
  }, [medicines, search, brandFilter, categoryFilter, stockFilter, deferredThreshold, stockMap]);

  const clearFilters = () => { setSearch(''); setBrandFilter(''); setCategoryFilter(''); setStockFilter(''); setStockThreshold(100); };

  const openAlternatives = async (med) => {
    setAltMed(med);
    setAltList([]);
    setAltLoading(true);
    try {
      const res = await getAlternatives(med.id);
      // Also find from local medicines by generic name as fallback
      let alts = res.data || [];
      if (alts.length === 0 && med.generic_name) {
        alts = medicines.filter(
          (m) => m.id !== med.id && m.generic_name && m.generic_name.toLowerCase() === med.generic_name.toLowerCase()
        );
      }
      setAltList(alts);
    } catch {
      // Fallback: filter locally by generic name
      if (med.generic_name) {
        setAltList(medicines.filter(
          (m) => m.id !== med.id && m.generic_name && m.generic_name.toLowerCase() === med.generic_name.toLowerCase()
        ));
      }
    }
    setAltLoading(false);
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div onClick={() => notePopup && setNotePopup(null)}>
      {selected && <MedicineModal medicine={selected} onClose={() => setSelected(null)} />}
      {editing && <EditMedicineModal medicine={editing} onClose={() => setEditing(null)} onSaved={loadData} />}

      {/* Alternatives modal */}
      {altMed && (
        <div onClick={() => setAltMed(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 560, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔄 Alternatives for <span style={{ color: '#2563eb' }}>{altMed.name}</span>
              </h2>
              <button onClick={() => setAltMed(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={20} /></button>
            </div>
            {altMed.generic_name && (
              <div style={{ marginBottom: 14, fontSize: '0.85rem', color: '#64748b' }}>
                Generic: <strong style={{ color: '#475569' }}>{altMed.generic_name}</strong>
              </div>
            )}
            {altLoading ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>Loading…</div>
            ) : altList.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30, fontSize: '0.9rem' }}>
                {altMed.generic_name ? 'No alternative medicines found with the same generic name.' : 'No generic name set — cannot find alternatives.'}
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Medicine Name</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Brand</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Selling Price ৳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {altList.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{a.name}</td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{a.brand || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          {a.batches && a.batches.length > 0
                            ? `৳${parseFloat(a.batches[0].selling_price || 0).toFixed(2)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                  {altList.length} alternative(s) found
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleting && (
        <div onClick={() => setDeleting(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 30px', width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Delete Medicine?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 20 }}>
              <strong>{deleting.name}</strong> and all its batches will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleDelete(deleting)} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#dc2626', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                🗑️ Yes, Delete
              </button>
              <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: '#f1f5f9', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <h2>💊 Medicines</h2>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
          {filtered.length} of {medicines.length} medicines
        </span>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', alignItems: 'center' }}>
        <FiSearch size={15} style={{ color: '#64748b', flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, generic, brand, category…"
          style={{ flex: '1 1 200px', minWidth: 160, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}
        />
        <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />
        <FiFilter size={14} style={{ color: '#64748b', flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Filter:</span>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', background: '#fff', minWidth: 120 }}>
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', background: '#fff', minWidth: 130 }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.83rem', background: '#fff', minWidth: 140 }}>
          <option value="">All Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="low_stock">Low Stock (&lt; N)</option>
        </select>
        {stockFilter === 'low_stock' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>N =</span>
            <input
              type="number"
              min="1"
              value={stockThreshold}
              onChange={(e) => setStockThreshold(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
              style={{ width: 72, padding: '7px 8px', border: '1px solid #fbbf24', borderRadius: 6, fontSize: '0.85rem', outline: 'none', background: '#fffbeb', fontWeight: 700, color: '#92400e' }}
            />
          </div>
        )}
        {(search || brandFilter || categoryFilter || stockFilter) && (
          <button onClick={clearFilters} className="btn btn-outline btn-sm">✕ Clear</button>
        )}
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FiBox size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
          No medicines found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
          {filtered.map((m) => {
            const stock = stockMap[m.id] || 0;
            return (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.15)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Image */}
                <div style={{ width: '100%', height: 160, overflow: 'hidden', position: 'relative', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
                  {m.image_url
                    ? <img src={`${API_BASE}${m.image_url}`} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    : '💊'}
                  <span style={{ position: 'absolute', top: 8, right: 8, background: stock < 10 ? '#dc2626' : '#16a34a', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                    {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                  </span>
                </div>
                {/* Details */}
                <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.name}
                    {noteMap[m.id] && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notePopup === m.id) { setNotePopup(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setNotePos({ top: rect.bottom + 6, left: rect.left });
                          setNotePopup(m.id);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: notePopup === m.id ? '#ea580c' : '#fff7ed', color: notePopup === m.id ? '#fff' : '#ea580c', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <FiInfo size={22} />
                      </span>
                    )}
                  </div>
                  {m.brand && <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>{m.brand}</div>}
                  {m.generic_name && <div style={{ fontSize: '0.78rem', color: '#64748b' }}><span style={{ fontWeight: 600 }}>Generic: </span>{m.generic_name}</div>}
                  {m.category && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid #bfdbfe' }}>{m.category}</span>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openAlternatives(m); }}
                      style={{ flex: 1, padding: '7px 0', border: '1px solid #d9f99d', borderRadius: 8, background: '#f7fee7', color: '#65a30d', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      title="View alternatives"
                    >
                      <FiLayers size={13} /> Alt
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(m); }}
                      style={{ flex: 1, padding: '7px 0', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#2563eb', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      title="Edit medicine"
                    >
                      <FiEdit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleting(m); }}
                      style={{ flex: 1, padding: '7px 0', border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      title="Delete medicine"
                    >
                      <FiTrash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note popup - fixed position near the icon */}
      {notePopup && noteMap[notePopup] && (
        <>
          <div onClick={() => setNotePopup(null)} style={{ position: 'fixed', inset: 0, zIndex: 1199 }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: notePos.top, left: notePos.left, zIndex: 1200, background: 'rgba(15, 18, 24, 0.50)', color: '#fff', fontSize: '0.85rem', padding: '10px 16px', borderRadius: 10, whiteSpace: 'pre-wrap', minWidth: 200, maxWidth: 320, boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)', lineHeight: 1.5, fontWeight: 400, backdropFilter: 'blur(8px)' }}
          >
            {noteMap[notePopup]}
          </div>
        </>
      )}
    </div>
  );
}
