import { useState, useEffect, useMemo } from 'react';
import { getMedicines, getBatches, createSaleOrder, createMedicine, createBatch, getAllMedicineNotes } from '../api';
import { toast } from 'react-toastify';
import {
  FiSearch, FiShoppingCart, FiTrash2, FiPlus,
  FiMinus, FiUser, FiPrinter, FiX, FiTag, FiInfo,
} from 'react-icons/fi';

const IMG_BASE = 'http://192.168.68.68:8765';

/* Pick lowest available batch number with stock > 0 (FIFO) */
const bestBatch = (batches) => {
  const available = batches.filter((b) => b.quantity > 0);
  if (!available.length) return null;
  return available.reduce((a, b) =>
    parseInt(a.batch_number) <= parseInt(b.batch_number) ? a : b
  );
};

/* ─── Bill HTML for print window ─── */
const billHtml = (bill) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill ${bill.billNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 420px; margin: auto; }
    .logo { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 14px; margin-bottom: 14px; }
    .logo h1 { font-size: 1.4rem; color: #2563eb; }
    .logo p { font-size: 0.78rem; color: #64748b; }
    .meta { font-size: 0.78rem; color: #64748b; margin-bottom: 14px; }
    .meta span { display: block; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 14px; }
    thead tr { border-bottom: 1px solid #e2e8f0; }
    th { padding: 6px 4px; text-align: left; color: #64748b; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; }
    th.r, td.r { text-align: right; }
    th.c, td.c { text-align: center; }
    td { padding: 7px 4px; border-bottom: 1px solid #f8fafc; }
    .totals { border-top: 2px dashed #e2e8f0; padding-top: 10px; font-size: 0.85rem; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; color: #475569; }
    .totals .payable { font-weight: 800; font-size: 1rem; color: #1e293b; border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; }
    .footer { text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 20px; border-top: 2px dashed #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="logo">
    <h1>💊 Health Line</h1>
    <p>Pharmacy Receipt</p>
  </div>
  <div class="meta">
    <span><strong>Bill No:</strong> ${bill.billNo}</span>
    <span><strong>Date:</strong> ${bill.date}</span>
    ${bill.customer ? `<span><strong>Customer:</strong> ${bill.customer}</span>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th class="c">Qty</th>
        <th class="r">Unit</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${bill.items.map((item) => `
        <tr>
          <td>
            <strong>${item.name}</strong>
            ${item.brand ? `<br><span style="color:#94a3b8;font-size:0.72rem">${item.brand}</span>` : ''}
          </td>
          <td class="c">${item.qty}</td>
          <td class="r">৳${item.unit_price.toFixed(2)}</td>
          <td class="r">৳${(item.qty * item.unit_price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>৳${bill.subtotal.toFixed(2)}</span></div>
    ${bill.discountAmount > 0 ? `<div class="row"><span>Discount (${bill.discountPct.toFixed(1)}%)</span><span style="color:#dc2626">−৳${bill.discountAmount.toFixed(2)}</span></div>` : ''}
    <div class="row payable"><span>Total Paid</span><span style="color:#2563eb">৳${bill.payable.toFixed(2)}</span></div>
  </div>
  <div class="footer">Thank you for your purchase!<br>Health Line Pharmacy</div>
  <script>window.onload = () => setTimeout(() => { window.print(); }, 300);</script>
</body>
</html>`;

/* ─── Placeholder image ─── */
const placeholder = (name) =>
  `https://placehold.co/80x80/f1f5f9/94a3b8?text=${encodeURIComponent((name || '?')[0].toUpperCase())}`;

export default function POS() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [customer, setCustomer] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [directPrice, setDirectPrice] = useState('');
  const [paying, setPaying] = useState(false);
  const [lastBill, setLastBill] = useState(null);
  const [noteMap, setNoteMap] = useState({});
  const [noteHover, setNoteHover] = useState(null);
  const [notePos, setNotePos] = useState({ top: 0, left: 0 });

  // ── Third Party modal ──
  const [tpOpen, setTpOpen] = useState(false);
  const [tpSaving, setTpSaving] = useState(false);
  const [tpMedId, setTpMedId] = useState(null);        // selected existing medicine id
  const [tpShowSug, setTpShowSug] = useState(false);    // show suggestion dropdown
  const [tp, setTp] = useState({
    medicine_name: '', source_shop: '',
    buy_price: '', buy_qty: '',
    sell_price: '', sell_qty: '', profit: '5',
  });

  const updateTp = (field, value) => {
    if (field === 'medicine_name') {
      setTpMedId(null);  // clear selection when user types
      setTpShowSug(true);
    }
    setTp((prev) => {
      const next = { ...prev, [field]: value };
      const totalPrice = parseFloat(next.buy_price) || 0;
      const qty = parseInt(next.buy_qty) || 1;
      const unitPrice = qty > 0 ? totalPrice / qty : 0;

      // Auto-calc selling price when buy_price, buy_qty, or profit changes
      if (field === 'buy_price' || field === 'profit' || field === 'buy_qty') {
        const pr = parseFloat(next.profit) || 0;
        next.sell_price = (unitPrice + pr).toFixed(2);
      }
      // If sell_price manually changed, recalc profit based on unit price
      if (field === 'sell_price') {
        const sp = parseFloat(value) || 0;
        next.profit = (sp - unitPrice).toFixed(2);
      }
      // Default sell_qty = buy_qty if not yet set
      if (field === 'buy_qty' && (!next.sell_qty || next.sell_qty === prev.buy_qty)) {
        next.sell_qty = value;
      }
      return next;
    });
  };

  const resetTp = () => {
    setTp({ medicine_name: '', source_shop: '', buy_price: '', buy_qty: '', sell_price: '', sell_qty: '', profit: '5' });
    setTpMedId(null);
    setTpShowSug(false);
    setTpOpen(false);
  };

  const handleTpConfirm = async () => {
    if (!tp.medicine_name.trim() || !tp.buy_price || !tp.buy_qty || !tp.sell_price || !tp.sell_qty) {
      toast.error('Please fill all required fields');
      return;
    }
    setTpSaving(true);
    try {
      // 1) Use selected medicine or find/create
      let medicine;
      if (tpMedId) {
        medicine = medicines.find((m) => m.id === tpMedId);
      }
      if (!medicine) {
        const freshMeds = await getMedicines().then((r) => r.data);
        const norm = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
        medicine = freshMeds.find((m) => norm(m.name) === norm(tp.medicine_name));
      }
      if (!medicine) {
        const res = await createMedicine({ name: tp.medicine_name.trim() });
        medicine = res.data;
      }

      // 2) Create a batch (Stock In) with buy qty — use special batch prefix "TP-"
      const batchNum = `TP-${Date.now().toString().slice(-6)}`;
      const batchRes = await createBatch({
        medicine_id: medicine.id,
        batch_number: batchNum,
        quantity: parseInt(tp.buy_qty),
        purchase_price: parseFloat(tp.buy_price),
        selling_price: parseFloat(tp.sell_price),
        expiration_date: null,
      });
      const newBatch = batchRes.data;

      // 3) Add to cart with sell qty
      const sellQty = Math.min(parseInt(tp.sell_qty), parseInt(tp.buy_qty));
      setCart((prev) => [
        ...prev,
        {
          batch_id: newBatch.id,
          medicine_id: medicine.id,
          name: medicine.name,
          brand: medicine.brand || '',
          generic_name: medicine.generic_name || '',
          unit_price: parseFloat(tp.sell_price),
          qty: sellQty,
          available: parseInt(tp.buy_qty),
          _thirdParty: true,
          _sourceShop: tp.source_shop,
        },
      ]);

      toast.success(`${medicine.name} added from ${tp.source_shop || 'third party'}!`);
      resetTp();
      loadData(); // refresh medicines/batches
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add third party item');
    }
    setTpSaving(false);
  };

  const loadData = () =>
    Promise.all([getMedicines(), getBatches(), getAllMedicineNotes()])
      .then(([mRes, bRes, nRes]) => {
        setMedicines(mRes.data);
        setBatches(bRes.data);
        setNoteMap(nRes.data || {});
      })
      .catch(() => toast.error('Failed to load products'));

  useEffect(() => { loadData(); }, []);

  /* ── Derived data ── */
  const batchByMed = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      if (!map[b.medicine_id]) map[b.medicine_id] = [];
      map[b.medicine_id].push(b);
    });
    return map;
  }, [batches]);

  const products = useMemo(() =>
    medicines
      .map((m) => {
        const batch = bestBatch(batchByMed[m.id] || []);
        if (!batch) return null;
        return {
          ...m,
          batch,
          sellingPrice: parseFloat(batch.selling_price) || 0,
          available: batch.quantity,
        };
      })
      .filter(Boolean),
    [medicines, batchByMed]
  );

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.generic_name || '').toLowerCase().includes(q);
      const matchCat = !category || p.category === category;
      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  /* ── Cart actions ── */
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.batch_id === product.batch.id);
      if (existing) {
        if (existing.qty >= product.available) {
          toast.warning('Maximum available stock reached');
          return prev;
        }
        return prev.map((c) =>
          c.batch_id === product.batch.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          batch_id: product.batch.id,
          medicine_id: product.id,
          name: product.name,
          brand: product.brand || '',
          generic_name: product.generic_name || '',
          unit_price: product.sellingPrice,
          qty: 1,
          available: product.available,
        },
      ];
    });
  };

  const setQty = (batch_id, newQty) => {
    if (newQty < 1) { removeFromCart(batch_id); return; }
    setCart((prev) =>
      prev.map((c) => {
        if (c.batch_id !== batch_id) return c;
        if (newQty > c.available) { toast.warning('Exceeds available stock'); return c; }
        return { ...c, qty: newQty };
      })
    );
  };

  const removeFromCart = (batch_id) =>
    setCart((prev) => prev.filter((c) => c.batch_id !== batch_id));

  /* ── Totals ── */
  const subtotal = cart.reduce((sum, c) => sum + c.qty * c.unit_price, 0);

  // Compute effective discount amount from percentage
  const pctVal = Math.min(Math.max(parseFloat(discountPct) || 0, 0), 100);
  const discountFromPct = subtotal * pctVal / 100;
  // If user set a direct price, the extra discount is subtotal - discountFromPct - directPrice
  const afterPct = subtotal - discountFromPct;
  const directVal = directPrice !== '' ? parseFloat(directPrice) : NaN;
  const extraDiscount = !isNaN(directVal) ? (afterPct - directVal) : 0;
  const totalDiscount = Math.max(Math.min(discountFromPct + extraDiscount, subtotal), 0);
  const payable = subtotal - totalDiscount;
  const effectivePct = subtotal > 0 ? (totalDiscount / subtotal * 100) : 0;

  // When discount % changes, clear direct price so it recalculates
  const handlePctChange = (val) => {
    setDiscountPct(val);
    setDirectPrice('');
  };

  // When direct price changes, auto-calculate effective %
  const handleDirectPriceChange = (val) => {
    setDirectPrice(val);
  };

  /* ── Payment ── */
  const handlePay = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    setPaying(true);

    try {
      // Distribute discount proportionally across items based on their share of subtotal
      const discountRatio = subtotal > 0 ? totalDiscount / subtotal : 0;
      await createSaleOrder({
        discount_pct: parseFloat(effectivePct.toFixed(2)),
        items: cart.map((item) => {
          const discountedUnitPrice = item.unit_price * (1 - discountRatio);
          return {
            batch_id: item.batch_id,
            quantity_sold: item.qty,
            sale_price: parseFloat(discountedUnitPrice.toFixed(2)),
          };
        }),
      });

      toast.success(`${cart.length} item(s) sold successfully!`);
      const bill = {
        items: cart,
        customer,
        subtotal,
        discountPct: effectivePct,
        discountAmount: totalDiscount,
        payable,
        date: new Date().toLocaleString(),
        billNo: `HL-${Date.now().toString().slice(-8)}`,
      };
      setLastBill(bill);
      setCart([]);
      setCustomer('');
      setDiscountPct('');
      setDirectPrice('');
      loadData(); // refresh stock
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process sale');
    }

    setPaying(false);
  };

  const printBill = (bill) => {
    const win = window.open('', '_blank', 'width=520,height=720');
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups'); return; }
    win.document.write(billHtml(bill));
    win.document.close();
  };

  /* ── Styles ── */
  const topInputStyle = {
    border: 'none', outline: 'none', padding: '10px 10px',
    fontSize: '0.875rem', width: '100%', background: 'transparent',
  };
  const iconBox = {
    display: 'flex', alignItems: 'center',
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9,
    padding: '0 12px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ ...iconBox, flex: '1 1 200px' }}>
          <FiSearch color="#94a3b8" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine, brand, generic…" style={topInputStyle} />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
              <FiX size={14} />
            </button>
          )}
        </div>

        <div style={{ ...iconBox, flex: '0 1 170px' }}>
          <FiTag color="#94a3b8" size={14} style={{ marginRight: 6 }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem', padding: '10px 0', cursor: 'pointer', flex: 1 }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ ...iconBox, flex: '1 1 180px' }}>
          <FiUser color="#94a3b8" size={15} />
          <input value={customer} onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer name (optional)" style={topInputStyle} />
        </div>

        <div style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, border: '1px solid #bfdbfe' }}>
          <FiShoppingCart size={14} />
          {cart.length} item{cart.length !== 1 ? 's' : ''} · ৳{payable.toFixed(2)}
        </div>

        {/* Third Party button */}
        <button
          onClick={() => setTpOpen(true)}
          style={{
            background: '#fef3c7', color: '#92400e', borderRadius: 9, padding: '10px 16px',
            fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0, border: '1px solid #fcd34d', cursor: 'pointer',
          }}
        >
          🏪 Third Party
        </button>
      </div>

      {/* ── Two-panel body ── */}
      <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>

        {/* LEFT: Product grid */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 80, fontSize: '0.9rem' }}>
              No in-stock medicines found
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 18 }}>
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.batch_id === p.batch.id);
                const lowStock = p.available < 10;
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      background: '#fff',
                      border: `1px solid ${inCart ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 14,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: inCart ? '0 0 0 3px #dbeafe' : '0 2px 8px rgba(0,0,0,0.06)',
                      transition: 'box-shadow 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.15)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = inCart ? '0 0 0 3px #dbeafe' : '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Image */}
                    <div style={{ width: '100%', height: 160, overflow: 'hidden', position: 'relative', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
                      {p.image_url
                        ? <img src={`${IMG_BASE}${p.image_url}`} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        : '💊'}
                      {/* Stock badge */}
                      <span style={{ position: 'absolute', top: 8, right: 8, background: lowStock ? '#dc2626' : '#16a34a', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
                        {p.available} in stock
                      </span>
                      {/* In-cart badge */}
                      {inCart && (
                        <span style={{ position: 'absolute', top: 8, left: 8, background: '#2563eb', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>
                          ×{inCart.qty} in cart
                        </span>
                      )}
                    </div>
                    {/* Details */}
                    <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {p.name}
                        {noteMap[p.id] && (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setNotePos({ top: rect.bottom + 6, left: rect.left });
                              setNoteHover(p.id);
                            }}
                            onMouseLeave={() => setNoteHover(null)}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: '#fff7ed', color: '#ea580c', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <FiInfo size={22} />
                          </span>
                        )}
                      </div>
                      {p.brand && <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>{p.brand}</div>}
                      {p.generic_name && <div style={{ fontSize: '0.78rem', color: '#64748b' }}><span style={{ fontWeight: 600 }}>Generic: </span>{p.generic_name}</div>}
                      {p.category && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid #bfdbfe' }}>{p.category}</span>
                        </div>
                      )}
                      <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>৳{p.sellingPrice.toFixed(2)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Click to add →</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Cart + Billing */}
        <div style={{ width: 330, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Cart header */}
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbff' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 7, color: '#1e293b' }}>
              <FiShoppingCart size={16} color="#2563eb" /> Cart
              {cart.length > 0 && (
                <span style={{ background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: '0.68rem', padding: '1px 8px', fontWeight: 700 }}>{cart.length}</span>
              )}
            </span>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                Clear all
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#cbd5e1', padding: '48px 20px', fontSize: '0.85rem' }}>
                <FiShoppingCart size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
                <div>Click a product to add it</div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.batch_id} style={{ padding: '10px 14px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    {item.brand && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.brand}</div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, marginTop: 3 }}>
                      ৳{item.unit_price.toFixed(2)} × {item.qty}
                      <span style={{ color: '#475569', fontWeight: 800, marginLeft: 6 }}>= ৳{(item.unit_price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => removeFromCart(item.batch_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: 0 }}>
                      <FiX size={14} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => setQty(item.batch_id, item.qty - 1)}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FiMinus size={10} />
                      </button>
                      <input
                        type="number" min="1" max={item.available}
                        value={item.qty}
                        onChange={(e) => setQty(item.batch_id, parseInt(e.target.value) || 1)}
                        style={{ width: 32, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: '0.82rem', padding: '2px 0', fontWeight: 700 }}
                      />
                      <button onClick={() => setQty(item.batch_id, item.qty + 1)}
                        style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FiPlus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing summary */}
          <div style={{ borderTop: '2px solid #f1f5f9', padding: '14px 16px', background: '#fafbff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, color: '#475569' }}>
              <span>{cart.reduce((s, c) => s + c.qty, 0)} item(s)</span>
              <span style={{ fontWeight: 600 }}>Subtotal: ৳{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount % */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', marginBottom: 6, color: '#475569' }}>
              <span>Discount %</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={discountPct}
                  onChange={(e) => handlePctChange(e.target.value)}
                  placeholder="0"
                  style={{ width: 60, padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>%</span>
                {discountFromPct > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: 4 }}>−৳{discountFromPct.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* After % discount line */}
            {discountFromPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6, color: '#64748b', paddingLeft: 8 }}>
                <span>After {pctVal}% discount</span>
                <span>৳{afterPct.toFixed(2)}</span>
              </div>
            )}

            {/* Direct total price */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', marginBottom: 6, color: '#475569' }}>
              <span>Direct Price ৳</span>
              <input
                type="number" min="0" max={afterPct} step="0.01"
                value={directPrice}
                onChange={(e) => handleDirectPriceChange(e.target.value)}
                placeholder={afterPct.toFixed(2)}
                style={{ width: 90, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', textAlign: 'right', outline: 'none' }}
              />
            </div>

            {/* Total discount summary */}
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 8, color: '#dc2626', background: '#fef2f2', padding: '5px 8px', borderRadius: 6 }}>
                <span>Total Discount ({effectivePct.toFixed(1)}%)</span>
                <span>−৳{totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', marginBottom: 14, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
              <span>Total Payable</span>
              <span style={{ color: '#2563eb' }}>৳{payable.toFixed(2)}</span>
            </div>
            <button
              onClick={handlePay}
              disabled={paying || cart.length === 0}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: 10,
                background: cart.length && !paying ? '#2563eb' : '#cbd5e1',
                color: '#fff', fontWeight: 800, fontSize: '1rem',
                cursor: cart.length && !paying ? 'pointer' : 'not-allowed',
                letterSpacing: '0.3px',
              }}
            >
              {paying ? '⏳ Processing…' : `💳  Pay  ৳${payable.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Third Party modal ── */}
      {tpOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '28px 30px', width: '100%', maxWidth: 460, boxShadow: '0 32px 100px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                🏪 Third Party Medicine
              </h2>
              <button onClick={resetTp} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Medicine Name with auto-suggest */}
              <div style={{ position: 'relative' }}>
                <label style={tpLabelStyle}>Medicine Name *</label>
                <input
                  value={tp.medicine_name}
                  onChange={(e) => updateTp('medicine_name', e.target.value)}
                  onFocus={() => tp.medicine_name && setTpShowSug(true)}
                  onBlur={() => setTimeout(() => setTpShowSug(false), 180)}
                  placeholder="e.g. Napa 500mg"
                  style={tpInputStyle}
                  autoComplete="off"
                />
                {tpMedId && (
                  <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600, marginTop: 2, display: 'block' }}>
                    ✓ Existing medicine selected — stock will be updated
                  </span>
                )}
                {tpShowSug && tp.medicine_name.trim().length >= 1 && (() => {
                  const q = tp.medicine_name.trim().toLowerCase();
                  const filtered = medicines.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
                  if (!filtered.length) return null;
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2,
                    }}>
                      {filtered.map((m) => (
                        <div
                          key={m.id}
                          onMouseDown={() => {
                            setTp((prev) => ({ ...prev, medicine_name: m.name }));
                            setTpMedId(m.id);
                            setTpShowSug(false);
                          }}
                          style={{
                            padding: '9px 14px', cursor: 'pointer', fontSize: '0.88rem',
                            borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                        >
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{m.name}</span>
                          {m.brand && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.brand}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Source Shop */}
              <div>
                <label style={tpLabelStyle}>Source Shop</label>
                <input value={tp.source_shop} onChange={(e) => updateTp('source_shop', e.target.value)} placeholder="e.g. Nearby Pharmacy" style={tpInputStyle} />
              </div>

              {/* Buy Price & Buy Qty */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={tpLabelStyle}>Total Purchase Price ৳ *</label>
                  <input type="number" step="0.01" min="0" value={tp.buy_price} onChange={(e) => updateTp('buy_price', e.target.value)} placeholder="0.00" style={tpInputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={tpLabelStyle}>Purchase Qty *</label>
                  <input type="number" min="1" value={tp.buy_qty} onChange={(e) => updateTp('buy_qty', e.target.value)} placeholder="1" style={tpInputStyle} />
                </div>
              </div>

              {/* Auto-calculated Unit Price */}
              {tp.buy_price && tp.buy_qty && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Unit Price: </span>
                  <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: '0.95rem' }}>
                    ৳{((parseFloat(tp.buy_price) || 0) / (parseInt(tp.buy_qty) || 1)).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 6 }}>(auto-calculated)</span>
                </div>
              )}

              {/* Profit & Sell Price */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={tpLabelStyle}>Profit / Unit ৳</label>
                  <input type="number" step="0.01" value={tp.profit} onChange={(e) => updateTp('profit', e.target.value)} placeholder="5" style={tpInputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={tpLabelStyle}>Selling Price ৳ *</label>
                  <input type="number" step="0.01" min="0" value={tp.sell_price} onChange={(e) => updateTp('sell_price', e.target.value)} placeholder="0.00" style={tpInputStyle} />
                </div>
              </div>

              {/* Sell Qty */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={tpLabelStyle}>Selling Qty *</label>
                  <input type="number" min="1" max={tp.buy_qty || 9999} value={tp.sell_qty} onChange={(e) => updateTp('sell_qty', e.target.value)} placeholder="1" style={tpInputStyle} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  {tp.buy_price && tp.sell_qty && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', width: '100%', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Total Profit</div>
                      <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>
                        ৳{((parseFloat(tp.profit) || 0) * (parseInt(tp.sell_qty) || 0)).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={handleTpConfirm}
                disabled={tpSaving}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: 10,
                  background: tpSaving ? '#cbd5e1' : '#2563eb', color: '#fff',
                  fontWeight: 800, fontSize: '0.92rem', cursor: tpSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {tpSaving ? '⏳ Adding…' : '✅ Add to Cart'}
              </button>
              <button
                onClick={resetTp}
                style={{
                  flex: 1, padding: '12px', border: 'none', borderRadius: 10,
                  background: '#f1f5f9', color: '#1e293b', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success bill modal ── */}
      {lastBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '28px 30px', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 100px rgba(0,0,0,0.3)' }}>
            {/* Modal header */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>✅</div>
              <h2 style={{ fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>Payment Successful</h2>
              <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                {lastBill.billNo} &nbsp;·&nbsp; {lastBill.date}
              </div>
              {lastBill.customer && (
                <div style={{ marginTop: 6, fontSize: '0.84rem', color: '#475569' }}>
                  Customer: <strong>{lastBill.customer}</strong>
                </div>
              )}
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '7px 8px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Product</th>
                  <th style={{ padding: '7px 4px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Unit ৳</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Total ৳</th>
                </tr>
              </thead>
              <tbody>
                {lastBill.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '7px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.brand && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.brand}</div>}
                    </td>
                    <td style={{ padding: '7px 4px', textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>৳{item.unit_price.toFixed(2)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>৳{(item.qty * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: '0.85rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 6 }}>
                <span>Subtotal</span><span>৳{lastBill.subtotal.toFixed(2)}</span>
              </div>
              {lastBill.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: 6 }}>
                  <span>Discount ({lastBill.discountPct.toFixed(1)}%)</span><span>−৳{lastBill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#1e293b', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <span>Amount Paid</span>
                <span style={{ color: '#2563eb' }}>৳{lastBill.payable.toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => printBill(lastBill)}
                style={{ flex: 1, padding: '11px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: '0.9rem' }}
              >
                <FiPrinter size={15} /> Download / Print
              </button>
              <button
                onClick={() => setLastBill(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note hover tooltip */}
      {noteHover && noteMap[noteHover] && (
        <div
          style={{ position: 'fixed', top: notePos.top, left: notePos.left, zIndex: 1200, background: 'rgba(36, 39, 44, 0.75)', color: '#fff', fontSize: '0.85rem', padding: '10px 16px', borderRadius: 10, whiteSpace: 'pre-wrap', minWidth: 200, maxWidth: 320, boxShadow: '0 6px 24px rgba(0,0,0,0.25)', lineHeight: 1.5, fontWeight: 400, backdropFilter: 'blur(8px)', pointerEvents: 'none' }}
        >
          {noteMap[noteHover]}
        </div>
      )}
    </div>
  );
}

const tpLabelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: 4 };
const tpInputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
