import axios from 'axios';

// Backend host — configured via VITE_API_URL. If unset, use the same hostname
// that served the frontend and the backend's fixed port.
const defaultApiBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8765`
    : 'http://localhost:8765';

export const API_BASE = import.meta.env.VITE_API_URL || defaultApiBase;

const API = axios.create({
  baseURL: `${API_BASE}/api`,
});

// ── Medicines ──
export const getMedicines = () => API.get('/medicines/');
export const getMedicine = (id) => API.get(`/medicines/${id}`);
export const createMedicine = (data) => API.post('/medicines/', data);
export const updateMedicine = (id, data) => API.put(`/medicines/${id}`, data);
export const deleteMedicine = (id) => API.delete(`/medicines/${id}`);
export const uploadMedicineImage = (id, formData) =>
  API.post(`/medicines/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getAlternatives = (id) => API.get(`/medicines/${id}/alternatives`);
export const updateSellingPrice = (id, price) =>
  API.put(`/medicines/${id}/selling-price`, { selling_price: price });
export const getMedicineNote = (id) => API.get(`/medicines/${id}/note`);
export const upsertMedicineNote = (id, note) =>
  API.put(`/medicines/${id}/note`, { note });
export const getAllMedicineNotes = () => API.get('/medicines/notes/all');
// { medicine_id: total_stock } — summed server-side, no row limit
export const getMedicineStock = () => API.get('/medicines/stock/all');
// { medicine_id: selling_price } from each medicine's newest batch — no row limit
export const getLatestSellingPrices = () => API.get('/medicines/selling-price/latest');

// ── Batches ──
export const getBatches = (medicineId) =>
  API.get('/batches/', { params: medicineId ? { medicine_id: medicineId } : {} });
// Every batch with quantity > 0 — no row limit (used by POS)
export const getInStockBatches = () =>
  API.get('/batches/', { params: { in_stock: true } });
export const createBatch = (data) => API.post('/batches/', data);
export const updateBatch = (id, data) => API.put(`/batches/${id}`, data);
export const correctBatchQuantity = (id, newInitialQuantity) =>
  API.patch(`/batches/${id}/correct-quantity`, { new_initial_quantity: newInitialQuantity });
export const deleteBatch = (id) => API.delete(`/batches/${id}`);
export const fixBatchCount = (id, quantity) =>
  API.patch(`/batches/${id}/fix-count`, { quantity });
export const getExpiringSoon = (days = 90) =>
  API.get('/analytics/expiring-soon', { params: { days } });

// ── Sales ──
export const recordSale = (data) => API.post('/sales/', data);
export const getSales = () => API.get('/sales/');
export const createSaleOrder = (data) => API.post('/sales/orders', data);
export const getSaleOrders = () => API.get('/sales/orders');
export const deleteSaleOrder = (id) => API.delete(`/sales/orders/${id}`);
export const updateSaleOrder = (id, data) => API.put(`/sales/orders/${id}`, data);

// ── Analytics ──
export const getTopSelling = (limit = 20) =>
  API.get('/analytics/top-selling', { params: { limit } });
export const getProfitReport = (period = 'daily', startDate = null, endDate = null) =>
  API.get('/analytics/profit-report', { params: { period, ...(startDate && { start_date: startDate }), ...(endDate && { end_date: endDate }) } });
export const getInventoryValue = () => API.get('/analytics/inventory-value');

// ── Search ──
export const searchMedicines = (q) => API.get('/search/', { params: { q } });

// ── Third Party Sales ──
export const createThirdPartySale = (data) => API.post('/third-party-sales/', data);
export const getThirdPartySales = () => API.get('/third-party-sales/');
export const deleteThirdPartySale = (id) => API.delete(`/third-party-sales/${id}`);

export default API;
