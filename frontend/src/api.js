import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.68.68:8765/api',
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

// ── Batches ──
export const getBatches = (medicineId) =>
  API.get('/batches/', { params: medicineId ? { medicine_id: medicineId } : {} });
export const createBatch = (data) => API.post('/batches/', data);
export const updateBatch = (id, data) => API.put(`/batches/${id}`, data);
export const deleteBatch = (id) => API.delete(`/batches/${id}`);
export const getExpiringSoon = (days = 90) =>
  API.get('/analytics/expiring-soon', { params: { days } });

// ── Sales ──
export const recordSale = (data) => API.post('/sales/', data);
export const getSales = () => API.get('/sales/');
export const createSaleOrder = (data) => API.post('/sales/orders', data);
export const getSaleOrders = () => API.get('/sales/orders');
export const deleteSaleOrder = (id) => API.delete(`/sales/orders/${id}`);

// ── Analytics ──
export const getTopSelling = (limit = 20) =>
  API.get('/analytics/top-selling', { params: { limit } });
export const getProfitReport = (period = 'daily') =>
  API.get('/analytics/profit-report', { params: { period } });

// ── Search ──
export const searchMedicines = (q) => API.get('/search/', { params: { q } });

export default API;
