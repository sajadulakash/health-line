import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getMedicines, createMedicine, updateMedicine, createBatch, getBatches, updateBatch, correctBatchQuantity, deleteBatch, uploadMedicineImage, API_BASE } from '../api';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiPackage, FiCamera, FiEdit2, FiSave, FiX, FiMaximize2 } from 'react-icons/fi';

const noScroll = (e) => e.target.blur();

/* ── Auto-suggest input with word-wrap ── */
function AutoSuggest({ value, onChange, suggestions, placeholder, required, style }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const wrapRef = useRef(null);

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const updateDropPos = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    autoResize(e.target);
    if (val.trim().length > 0) {
      const lower = val.toLowerCase();
      const matches = suggestions.filter((s) => s.toLowerCase().startsWith(lower) && s.toLowerCase() !== lower);
      setFiltered(matches.slice(0, 8));
      setOpen(matches.length > 0);
      updateDropPos();
    } else {
      setOpen(false);
    }
  };

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    if (ref.current) { ref.current.value = val; autoResize(ref.current); }
  };

  // Auto-resize when value changes programmatically (e.g. auto-fill)
  useEffect(() => {
    if (ref.current) autoResize(ref.current);
  }, [value]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onScroll = () => { if (open) updateDropPos(); };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={(e) => { updateDropPos(); if (filtered.length > 0 && value.trim()) setOpen(true); }}
        placeholder={placeholder}
        required={required}
        rows={1}
        style={{ ...style, resize: 'none', overflow: 'hidden', wordWrap: 'break-word', overflowWrap: 'break-word', fontFamily: 'inherit' }}
      />
      {open && ReactDOM.createPortal(
        <ul style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
          maxHeight: 160, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {filtered.map((s, idx) => (
            <li
              key={idx}
              onMouseDown={() => pick(s)}
              style={{
                padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem',
                background: 'transparent', borderBottom: '1px solid #f1f5f9',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {s}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

const emptyRow = () => ({
  key: Date.now() + Math.random(),
  medicine_name: '',
  generic_name: '',
  brand: '',
  category: '',
  image_url: '',
  strip_size: '',
  quantity: '',
  purchase_price: '',
  selling_price: '',
  expiration_date: '',
});

const IMG_BASE = API_BASE;

const DRAFT_KEY = 'stockin_draft';

const loadDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [emptyRow()];
};

export default function StockIn() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [nextBatchNum, setNextBatchNum] = useState(1);
  const [rows, setRows] = useState(loadDraft);
  const [submitting, setSubmitting] = useState(false);
  const imageFilesRef = useRef({}); // { rowKey: File }
  const [imagePreviews, setImagePreviews] = useState({}); // { rowKey: dataURL }
  const [selectedRow, setSelectedRow] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // URL string for image preview modal

  // Persist draft on every rows change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rows));
  }, [rows]);

  const load = () => {
    Promise.all([getMedicines(), getBatches()])
      .then(([mRes, bRes]) => {
        setMedicines(mRes.data);
        setBatches(bRes.data);
        const nums = bRes.data
          .map((b) => parseInt(b.batch_number))
          .filter((n) => !isNaN(n));
        setNextBatchNum(nums.length > 0 ? Math.max(...nums) + 1 : 1);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const updateRow = (i, updates) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  const handleNameChange = (i, val) => {
    if (!val.trim()) {
      updateRow(i, {
        medicine_name: '',
        generic_name: '',
        brand: '',
        category: '',
        image_url: '',
        strip_size: '',
        selling_price: '',
      });
      return;
    }

    const found = medicines.find((m) => m.name.toLowerCase() === val.toLowerCase());
    const updates = {
      medicine_name: val,
      generic_name: found ? (found.generic_name || '') : rows[i].generic_name,
      brand: found ? (found.brand || '') : rows[i].brand,
      category: found ? (found.category || '') : rows[i].category,
      image_url: found ? (found.image_url || '') : rows[i].image_url,
      strip_size: found ? (found.strip_size ?? '') : rows[i].strip_size,
    };
    if (found) {
      const medBatches = batches.filter((b) => b.medicine_id === found.id && b.selling_price);
      if (medBatches.length > 0) {
        updates.selling_price = medBatches[medBatches.length - 1].selling_price;
      }
    }
    updateRow(i, updates);
  };

  const handleImageChange = (rowKey, file) => {
    if (!file) return;
    imageFilesRef.current[rowKey] = file;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreviews((prev) => ({ ...prev, [rowKey]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleImagePaste = (rowKey, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const file = item.getAsFile();
        if (file) handleImageChange(rowKey, file);
        return;
      }
    }
  };

  const handleImageDrop = (rowKey, e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) handleImageChange(rowKey, file);
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) => {
    if (rows.length > 1) setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = rows.some(
      (r) => !r.medicine_name.trim() || !r.quantity || !r.purchase_price || !r.selling_price
    );
    if (invalid) {
      toast.error('Please fill all required fields for every row');
      return;
    }

    setSubmitting(true);
    let success = 0;
    let fail = 0;
    const batchNum = String(nextBatchNum);

    // Refresh medicine list before submitting to avoid duplicates
    const freshMeds = await getMedicines().then((r) => r.data).catch(() => medicines);

    // Normalize: collapse whitespace, trim
    const norm = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

    for (const row of rows) {
      try {
        let medicine = freshMeds.find(
          (m) => norm(m.name) === norm(row.medicine_name)
        );
        const stripVal = row.strip_size !== '' && row.strip_size != null ? Number(row.strip_size) : null;
        if (!medicine) {
          const res = await createMedicine({
            name: row.medicine_name.trim().replace(/\s+/g, ' '),
            generic_name: row.generic_name?.trim() || null,
            brand: row.brand?.trim() || null,
            category: row.category?.trim() || null,
            strip_size: stripVal,
          });
          medicine = res.data;
          freshMeds.push(medicine); // prevent duplicate creation within same session
        } else if (stripVal != null && stripVal !== medicine.strip_size) {
          // Fill in / update the strip size on an existing medicine
          try {
            await updateMedicine(medicine.id, { strip_size: stripVal });
            medicine.strip_size = stripVal;
          } catch { /* non-critical */ }
        }

        await createBatch({
          medicine_id: medicine.id,
          batch_number: batchNum,
          quantity: Number(row.quantity),
          purchase_price: Number(row.purchase_price),
          selling_price: Number(row.selling_price),
          expiration_date: row.expiration_date || null,
        });

        // Upload image if one was selected for this row
        const imgFile = imageFilesRef.current[row.key];
        if (imgFile) {
          const fd = new FormData();
          fd.append('file', imgFile);
          try { await uploadMedicineImage(medicine.id, fd); } catch { /* image upload is non-critical */ }
        }

        success++;
      } catch {
        fail++;
      }
    }

    setSubmitting(false);
    if (success > 0) toast.success(`Batch #${batchNum}: ${success} item(s) stocked in!`);
    if (fail > 0) toast.error(`${fail} item(s) failed to save`);
    if (fail === 0) {
      localStorage.removeItem(DRAFT_KEY);
      imageFilesRef.current = {};
      setImagePreviews({});
      setRows([emptyRow()]);
      load();
    }
  };

  // Group batches by batch_number for history
  const grouped = batches.reduce((acc, b) => {
    const key = b.batch_number || '?';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return nb - na;
    return b.localeCompare(a);
  });

  const medicineMap = medicines.reduce((acc, m) => { acc[m.id] = m; return acc; }, {});

  const inputStyle = { padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box' };

  // Real-time total purchase price for the new stock entry (sum of all rows)
  const newEntryTotal = rows.reduce((sum, r) => sum + (parseFloat(r.purchase_price) || 0), 0);

  // Unique suggestion lists from existing medicines
  const nameList = [...new Set(medicines.map((m) => m.name).filter(Boolean))];
  const genericList = [...new Set(medicines.map((m) => m.generic_name).filter(Boolean))];
  const brandList = [...new Set(medicines.map((m) => m.brand).filter(Boolean))];
  const categoryList = [...new Set(medicines.map((m) => m.category).filter(Boolean))];

  // ── Editing existing batches ──
  const [editingBatch, setEditingBatch] = useState(null); // batchNumber string being edited
  const [editRows, setEditRows] = useState([]); // rows for the batch being edited
  const [addRows, setAddRows] = useState([]); // new rows to add to existing batch
  const [savingEdit, setSavingEdit] = useState(false);

  const startEditing = (batchNum) => {
    const batchItems = grouped[batchNum].map((b) => {
      const med = medicineMap[b.medicine_id];
      return {
        id: b.id,
        medicine_id: b.medicine_id,
        medicine_name: med?.name || '',
        generic_name: med?.generic_name || '',
        brand: med?.brand || '',
        category: med?.category || '',
        quantity: b.initial_quantity ?? b.quantity,
        purchase_price: b.purchase_price,
        selling_price: b.selling_price,
        expiration_date: b.expiration_date || '',
        _deleted: false,
      };
    });
    setEditRows(batchItems);
    setAddRows([]);
    setEditingBatch(batchNum);
  };

  const cancelEditing = () => {
    setEditingBatch(null);
    setEditRows([]);
    setAddRows([]);
  };

  const updateEditRow = (i, updates) =>
    setEditRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  const toggleDeleteRow = (i) =>
    setEditRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, _deleted: !r._deleted } : r)));

  const addNewRowToExisting = () =>
    setAddRows((prev) => [...prev, { ...emptyRow(), _isNew: true }]);

  const updateAddRow = (i, updates) =>
    setAddRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  const removeAddRow = (i) =>
    setAddRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleAddRowNameChange = (i, val) => {
    const found = medicines.find((m) => m.name.toLowerCase() === val.toLowerCase());
    updateAddRow(i, {
      medicine_name: val,
      generic_name: found ? (found.generic_name || '') : addRows[i].generic_name,
      brand: found ? (found.brand || '') : addRows[i].brand,
      category: found ? (found.category || '') : addRows[i].category,
      image_url: found ? (found.image_url || '') : addRows[i].image_url,
    });
  };

  const handleEditRowNameChange = (i, val) => {
    const found = medicines.find((m) => m.name.toLowerCase() === val.toLowerCase());
    updateEditRow(i, {
      medicine_name: val,
      generic_name: found ? (found.generic_name || '') : editRows[i].generic_name,
      brand: found ? (found.brand || '') : editRows[i].brand,
      category: found ? (found.category || '') : editRows[i].category,
    });
  };

  const saveEdits = async () => {
    setSavingEdit(true);
    let ok = 0, fail = 0;

    // 1) Delete marked rows
    for (const row of editRows.filter((r) => r._deleted)) {
      try { await deleteBatch(row.id); ok++; } catch { fail++; }
    }

    // 2) Update changed rows
    for (const row of editRows.filter((r) => !r._deleted)) {
      try {
        // Update medicine details if changed
        await updateMedicine(row.medicine_id, {
          name: (row.medicine_name || '').trim() || undefined,
          generic_name: (row.generic_name || '').trim() || null,
          brand: (row.brand || '').trim() || null,
          category: (row.category || '').trim() || null,
        });
        // Use delta-based correction for quantity changes
        await correctBatchQuantity(row.id, Number(row.quantity));
        await updateBatch(row.id, {
          purchase_price: Number(row.purchase_price),
          selling_price: Number(row.selling_price),
          expiration_date: row.expiration_date || null,
        });
        // Upload image if one was added for this existing row
        const editImgFile = imageFilesRef.current[`edit_${row.id}`];
        if (editImgFile) {
          const fd = new FormData();
          fd.append('file', editImgFile);
          try { await uploadMedicineImage(row.medicine_id, fd); } catch { /* non-critical */ }
        }
        ok++;
      } catch (err) {
        const detail = err?.response?.data?.detail;
        if (detail) toast.error(`${row.medicine_name}: ${detail}`);
        fail++;
      }
    }

    // 3) Add new rows to this batch
    const freshMeds = await getMedicines().then((r) => r.data).catch(() => medicines);
    for (const row of addRows) {
      if (!row.medicine_name?.trim() || !row.quantity || !row.purchase_price || !row.selling_price) continue;
      try {
        let medicine = freshMeds.find((m) => m.name.toLowerCase() === row.medicine_name.trim().toLowerCase());
        if (!medicine) {
          const res = await createMedicine({
            name: row.medicine_name.trim(),
            generic_name: row.generic_name || null,
            brand: row.brand || null,
            category: row.category || null,
          });
          medicine = res.data;
          freshMeds.push(medicine);
        }
        await createBatch({
          medicine_id: medicine.id,
          batch_number: editingBatch,
          quantity: Number(row.quantity),
          purchase_price: Number(row.purchase_price),
          selling_price: Number(row.selling_price),
          expiration_date: row.expiration_date || null,
        });
        // Upload image if one was added for this new row
        const addImgFile = imageFilesRef.current[row.key];
        if (addImgFile) {
          const fd = new FormData();
          fd.append('file', addImgFile);
          try { await uploadMedicineImage(medicine.id, fd); } catch { /* non-critical */ }
        }
        ok++;
      } catch { fail++; }
    }

    setSavingEdit(false);
    if (ok > 0) toast.success(`Batch #${editingBatch} updated!`);
    if (fail > 0) toast.error(`${fail} operation(s) failed`);
    cancelEditing();
    load();
  };

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h2>📦 Stock In</h2>
        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: '0.9rem', border: '1px solid #bfdbfe' }}>
          Next: Batch #{nextBatchNum}
        </span>
      </div>

      {/* New Stock Entry Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
            New Stock Entry&nbsp;—&nbsp;
            <span style={{ color: '#2563eb' }}>Batch #{nextBatchNum}</span>
          </h3>
          <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
            <FiPlus /> Add Row
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="table-container">
            <table style={{ tableLayout: 'auto', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>#</th>
                  <th style={{ width: 60 }}>Image</th>
                  <th>Medicine Name *</th>
                  <th>Generic Name</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th style={{ width: 80 }}>Strip (units)</th>
                  <th style={{ width: 70 }}>Qty *</th>
                  <th style={{ width: 110 }}>Total Purchase ৳ *</th>
                  <th style={{ width: 100 }}>Per Unit Price ৳</th>
                  <th style={{ width: 110 }}>Per Unit Selling ৳ *</th>
                  <th style={{ width: 130 }}>Expiry Date</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.key}
                    onClick={() => setSelectedRow(row.key)}
                    onPasteCapture={(e) => handleImagePaste(row.key, e)}
                    style={{
                      background: selectedRow === row.key ? '#eff6ff' : undefined,
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                        <label
                          onDrop={(e) => handleImageDrop(row.key, e)}
                          onDragOver={(e) => e.preventDefault()}
                          title="Click to browse, or paste anywhere in this row"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44, borderRadius: 8,
                            border: imagePreviews[row.key] || row.image_url ? '2px solid #22c55e' : '2px dashed #cbd5e1', cursor: 'pointer',
                            overflow: 'hidden', background: '#f8fafc',
                          }}
                        >
                          {imagePreviews[row.key] ? (
                            <img src={imagePreviews[row.key]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : row.image_url ? (
                            <img src={`${IMG_BASE}${row.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FiCamera size={16} color="#94a3b8" />
                          )}
                          <input
                            type="file" accept="image/*"
                            onChange={(e) => handleImageChange(row.key, e.target.files[0])}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {(imagePreviews[row.key] || row.image_url) && (
                          <button
                            type="button"
                            title="Preview image"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(imagePreviews[row.key] || `${IMG_BASE}${row.image_url}`);
                            }}
                            style={{
                              position: 'absolute', top: -4, right: -4,
                              width: 18, height: 18, borderRadius: 4,
                              background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: 0, zIndex: 2,
                            }}
                          >
                            <FiMaximize2 size={10} color="#fff" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <AutoSuggest
                        value={row.medicine_name}
                        onChange={(val) => handleNameChange(i, val)}
                        suggestions={nameList}
                        placeholder="Medicine name…"
                        required
                        style={{ ...inputStyle, width: '100%', minWidth: 140 }}
                      />
                    </td>
                    <td>
                      <AutoSuggest
                        value={row.generic_name}
                        onChange={(val) => updateRow(i, { generic_name: val })}
                        suggestions={genericList}
                        placeholder="Generic name…"
                        style={{ ...inputStyle, width: '100%', minWidth: 100 }}
                      />
                    </td>
                    <td>
                      <AutoSuggest
                        value={row.brand}
                        onChange={(val) => updateRow(i, { brand: val })}
                        suggestions={brandList}
                        placeholder="Brand…"
                        style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                      />
                    </td>
                    <td>
                      <AutoSuggest
                        value={row.category}
                        onChange={(val) => updateRow(i, { category: val })}
                        suggestions={categoryList}
                        placeholder="Category…"
                        style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                      />
                    </td>
                    <td>
                      <input type="number" min="1" value={row.strip_size} onChange={(e) => updateRow(i, { strip_size: e.target.value })} onWheel={noScroll} placeholder="e.g. 10" style={{ ...inputStyle, width: 70 }} />
                    </td>
                    <td>
                      <input type="number" min="1" value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 65 }} />
                    </td>
                    <td>
                      <input type="number" step="0.01" min="0" value={row.purchase_price} onChange={(e) => updateRow(i, { purchase_price: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 95 }} />
                    </td>
                    <td>
                      <input
                        readOnly
                        value={
                          row.quantity && row.purchase_price && Number(row.quantity) > 0
                            ? (Number(row.purchase_price) / Number(row.quantity)).toFixed(2)
                            : ''
                        }
                        placeholder="auto"
                        style={{ ...inputStyle, width: 85, background: '#f1f5f9', color: '#475569', cursor: 'default' }}
                      />
                    </td>
                    <td>
                      <input type="number" step="0.01" min="0" value={row.selling_price} onChange={(e) => updateRow(i, { selling_price: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 95 }} />
                    </td>
                    <td>
                      <input type="date" value={row.expiration_date} onChange={(e) => updateRow(i, { expiration_date: e.target.value })} style={inputStyle} />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        style={{ border: 'none', background: 'none', cursor: rows.length === 1 ? 'not-allowed' : 'pointer', color: rows.length === 1 ? '#cbd5e1' : '#dc2626' }}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.83rem', color: '#64748b' }}>{rows.length} item(s) — all will share Batch #{nextBatchNum}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '4px 16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>Total Purchase:</span>
                <span style={{ fontSize: '1.05rem', color: '#166534', fontWeight: 800 }}>৳ {newEntryTotal.toFixed(2)}</span>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : `✅ Confirm Stock In — Batch #${nextBatchNum}`}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* History */}
      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, color: '#475569' }}>Stock-In History</h3>

      {sortedKeys.length === 0 ? (
        <div className="empty-state">No stock entries yet.</div>
      ) : (
        sortedKeys.map((bNum) => {
          const isEditing = editingBatch === bNum;

          // Total purchase price for this batch — live while editing, saved values otherwise
          const batchTotal = isEditing
            ? editRows.filter((r) => !r._deleted).reduce((s, r) => s + (parseFloat(r.purchase_price) || 0), 0)
              + addRows.reduce((s, r) => s + (parseFloat(r.purchase_price) || 0), 0)
            : grouped[bNum].reduce((s, b) => s + (parseFloat(b.purchase_price) || 0), 0);

          // Date the batch was added — earliest created_at in the group.
          // Pre-migration batches have no date, so nothing is shown for them.
          const batchDate = grouped[bNum].map((b) => b.created_at).filter(Boolean).sort()[0];
          const batchDateLabel = batchDate
            ? new Date(batchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : null;

          return (
            <div key={bNum} className="card" style={{ marginBottom: 14, border: isEditing ? '2px solid #2563eb' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <FiPackage style={{ color: '#2563eb' }} />
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.95rem' }}>Batch #{bNum}</span>
                <span className="badge badge-success">{grouped[bNum].length} item(s)</span>
                {batchDateLabel && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📅 Added {batchDateLabel}
                  </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {isEditing ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={saveEdits} disabled={savingEdit} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                        <FiSave size={13} /> {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEditing} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                        <FiX size={13} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => startEditing(bNum)} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                      <FiEdit2 size={13} /> Edit Batch
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {isEditing && <th style={{ width: 60 }}>Image</th>}
                      {!isEditing && <th style={{ width: 50 }}>Img</th>}
                      <th>Medicine</th>
                      <th>Brand</th>
                      <th>Generic</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Total Purchase ৳</th>
                      <th>Per Unit Price ৳</th>
                      <th>Per Unit Selling ৳</th>
                      <th>Expires</th>
                      {isEditing && <th style={{ width: 40 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isEditing ? (
                      <>
                        {editRows.map((row, i) => {
                          const editMed = medicineMap[row.medicine_id];
                          const existingImg = editMed?.image_url;
                          return (
                          <tr key={row.id} onClick={() => setSelectedRow(`edit_${row.id}`)} onPasteCapture={(e) => handleImagePaste(`edit_${row.id}`, e)} style={{ opacity: row._deleted ? 0.35 : 1, textDecoration: row._deleted ? 'line-through' : 'none', background: selectedRow === `edit_${row.id}` ? '#eff6ff' : undefined, transition: 'background 0.15s' }}>

                            <td>
                              <label
                                onDrop={(e) => handleImageDrop(`edit_${row.id}`, e)}
                                onDragOver={(e) => e.preventDefault()}
                                title="Click to browse or paste in row"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 40, height: 40, borderRadius: 8,
                                  border: imagePreviews[`edit_${row.id}`] || existingImg ? '2px solid #22c55e' : '2px dashed #cbd5e1', cursor: 'pointer',
                                  overflow: 'hidden', background: '#f8fafc', flexShrink: 0,
                                }}
                              >
                                {imagePreviews[`edit_${row.id}`] ? (
                                  <img src={imagePreviews[`edit_${row.id}`]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : existingImg ? (
                                  <img src={`${IMG_BASE}${existingImg}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <FiCamera size={14} color="#94a3b8" />
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleImageChange(`edit_${row.id}`, e.target.files[0])} style={{ display: 'none' }} />
                              </label>
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.medicine_name}
                                onChange={(val) => handleEditRowNameChange(i, val)}
                                suggestions={nameList}
                                placeholder="Medicine…"
                                style={{ ...inputStyle, width: '100%', minWidth: 130, fontWeight: 600 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.brand || ''}
                                onChange={(val) => updateEditRow(i, { brand: val })}
                                suggestions={brandList}
                                placeholder="Brand…"
                                style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.generic_name || ''}
                                onChange={(val) => updateEditRow(i, { generic_name: val })}
                                suggestions={genericList}
                                placeholder="Generic…"
                                style={{ ...inputStyle, width: '100%', minWidth: 90 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.category || ''}
                                onChange={(val) => updateEditRow(i, { category: val })}
                                suggestions={categoryList}
                                placeholder="Category…"
                                style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                              />
                            </td>
                            <td>
                              <input type="number" min="0" value={row.quantity} onChange={(e) => updateEditRow(i, { quantity: e.target.value })} onWheel={noScroll} disabled={row._deleted} style={{ ...inputStyle, width: 65 }} />
                            </td>
                            <td>
                              <input type="number" step="0.01" min="0" value={row.purchase_price} onChange={(e) => updateEditRow(i, { purchase_price: e.target.value })} onWheel={noScroll} disabled={row._deleted} style={{ ...inputStyle, width: 95 }} />
                            </td>
                            <td style={{ color: '#475569' }}>
                              {row.quantity && row.purchase_price && Number(row.quantity) > 0
                                ? (Number(row.purchase_price) / Number(row.quantity)).toFixed(2)
                                : '—'}
                            </td>
                            <td>
                              <input type="number" step="0.01" min="0" value={row.selling_price} onChange={(e) => updateEditRow(i, { selling_price: e.target.value })} onWheel={noScroll} disabled={row._deleted} style={{ ...inputStyle, width: 95 }} />
                            </td>
                            <td>
                              <input type="date" value={row.expiration_date} onChange={(e) => updateEditRow(i, { expiration_date: e.target.value })} disabled={row._deleted} style={inputStyle} />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => toggleDeleteRow(i)}
                                title={row._deleted ? 'Undo delete' : 'Mark for deletion'}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: row._deleted ? '#2563eb' : '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                {row._deleted ? 'Undo' : <FiTrash2 size={15} />}
                              </button>
                            </td>
                          </tr>
                          );
                        })}

                        {/* New rows being added to this batch */}
                        {addRows.map((row, i) => (
                          <tr key={row.key} onClick={() => setSelectedRow(row.key)} onPasteCapture={(e) => handleImagePaste(row.key, e)} style={{ background: selectedRow === row.key ? '#eff6ff' : '#f0fdf4', transition: 'background 0.15s' }}>
                            <td>
                              <label
                                onDrop={(e) => handleImageDrop(row.key, e)}
                                onDragOver={(e) => e.preventDefault()}
                                title="Click to browse or paste in row"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: 40, height: 40, borderRadius: 8,
                                  border: imagePreviews[row.key] || row.image_url ? '2px solid #22c55e' : '2px dashed #cbd5e1', cursor: 'pointer',
                                  overflow: 'hidden', background: '#f8fafc', flexShrink: 0,
                                }}
                              >
                                {imagePreviews[row.key] ? (
                                  <img src={imagePreviews[row.key]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : row.image_url ? (
                                  <img src={`${IMG_BASE}${row.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <FiCamera size={14} color="#94a3b8" />
                                )}
                                <input type="file" accept="image/*" onChange={(e) => handleImageChange(row.key, e.target.files[0])} style={{ display: 'none' }} />
                              </label>
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.medicine_name}
                                onChange={(val) => handleAddRowNameChange(i, val)}
                                suggestions={nameList}
                                placeholder="Medicine…"
                                required
                                style={{ ...inputStyle, width: '100%', minWidth: 130 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.brand}
                                onChange={(val) => updateAddRow(i, { brand: val })}
                                suggestions={brandList}
                                placeholder="Brand…"
                                style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.generic_name}
                                onChange={(val) => updateAddRow(i, { generic_name: val })}
                                suggestions={genericList}
                                placeholder="Generic…"
                                style={{ ...inputStyle, width: '100%', minWidth: 90 }}
                              />
                            </td>
                            <td>
                              <AutoSuggest
                                value={row.category}
                                onChange={(val) => updateAddRow(i, { category: val })}
                                suggestions={categoryList}
                                placeholder="Category…"
                                style={{ ...inputStyle, width: '100%', minWidth: 80 }}
                              />
                            </td>
                            <td>
                              <input type="number" min="1" value={row.quantity} onChange={(e) => updateAddRow(i, { quantity: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 65 }} />
                            </td>
                            <td>
                              <input type="number" step="0.01" min="0" value={row.purchase_price} onChange={(e) => updateAddRow(i, { purchase_price: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 95 }} />
                            </td>
                            <td style={{ color: '#475569' }}>
                              {row.quantity && row.purchase_price && Number(row.quantity) > 0
                                ? (Number(row.purchase_price) / Number(row.quantity)).toFixed(2)
                                : '—'}
                            </td>
                            <td>
                              <input type="number" step="0.01" min="0" value={row.selling_price} onChange={(e) => updateAddRow(i, { selling_price: e.target.value })} onWheel={noScroll} required style={{ ...inputStyle, width: 95 }} />
                            </td>
                            <td>
                              <input type="date" value={row.expiration_date} onChange={(e) => updateAddRow(i, { expiration_date: e.target.value })} style={inputStyle} />
                            </td>
                            <td>
                              <button type="button" onClick={() => removeAddRow(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>
                                <FiTrash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      grouped[bNum].map((b) => {
                        const med = medicineMap[b.medicine_id];
                        const origQty = b.initial_quantity ?? b.quantity;
                        return (
                          <tr key={b.id}>
                            <td>
                              <div style={{
                                width: 32, height: 32, borderRadius: 6,
                                border: med?.image_url ? '2px solid #22c55e' : '2px dashed #e2e8f0',
                                overflow: 'hidden', background: '#f8fafc',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {med?.image_url
                                  ? <img src={`${IMG_BASE}${med.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <FiCamera size={12} color="#cbd5e1" />}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{med?.name || `#${b.medicine_id}`}</td>
                            <td>{med?.brand || '—'}</td>
                            <td>{med?.generic_name || '—'}</td>
                            <td>{med?.category || '—'}</td>
                            <td>{origQty}</td>
                            <td>{b.purchase_price}</td>
                            <td style={{ color: '#475569' }}>
                              {origQty && b.purchase_price && Number(origQty) > 0
                                ? (Number(b.purchase_price) / Number(origQty)).toFixed(2)
                                : '—'}
                            </td>
                            <td>{b.selling_price}</td>
                            <td>{b.expiration_date || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700, background: '#f8fafc' }}>
                      <td colSpan={6} style={{ textAlign: 'right', color: '#475569' }}>Batch Total Purchase:</td>
                      <td style={{ color: '#166534', fontWeight: 800 }}>৳ {batchTotal.toFixed(2)}</td>
                      <td colSpan={isEditing ? 4 : 3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {isEditing && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addNewRowToExisting} style={{ fontSize: '0.8rem' }}>
                    <FiPlus size={13} /> Add Medicine to Batch #{bNum}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
      {/* ── Image Preview Modal ── */}
      {previewImage && ReactDOM.createPortal(
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', background: '#fff', borderRadius: 12,
              padding: 8, maxWidth: '90vw', maxHeight: '90vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute', top: -10, right: -10,
                width: 28, height: 28, borderRadius: '50%',
                background: '#ef4444', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              <FiX size={14} color="#fff" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              style={{ display: 'block', maxWidth: '85vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
