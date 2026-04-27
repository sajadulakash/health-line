import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import TopSelling from './pages/TopSelling';
import ExpiringSoon from './pages/ExpiringSoon';
import POS from './pages/POS';
import TPSales from './pages/TPSales';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/stock-in" element={<StockIn />} />
          <Route path="/stock-out" element={<StockOut />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/top-selling" element={<TopSelling />} />
          <Route path="/expiring-soon" element={<ExpiringSoon />} />
          <Route path="/tp-sales" element={<TPSales />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
