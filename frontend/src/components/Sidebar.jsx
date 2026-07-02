import { NavLink } from 'react-router-dom';
import {
  FiHome, FiArrowDown, FiArrowUp,
  FiTrendingUp, FiAlertTriangle, FiPackage, FiShoppingBag, FiShoppingCart, FiTool,
} from 'react-icons/fi';

const links = [
  { to: '/', icon: <FiHome />, label: 'Dashboard' },
  { to: '/pos', icon: <FiShoppingBag />, label: 'POS' },
  { to: '/medicines', icon: <FiPackage />, label: 'Medicines' },
  { to: '/stock-in', icon: <FiArrowDown />, label: 'Stock In' },
  { to: '/stock-out', icon: <FiArrowUp />, label: 'Stock Out' },
  { to: '/tp-sales', icon: <FiShoppingCart />, label: 'TP Sales' },
  { to: '/top-selling', icon: <FiTrendingUp />, label: 'Top Selling' },
  { to: '/expiring-soon', icon: <FiAlertTriangle />, label: 'Expiring Soon' },
  { to: '/fix-batch-count', icon: <FiTool />, label: 'Fix Strip Count' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>💊 Health Line</h1>
        <span>Pharmacy Inventory</span>
      </div>
      <nav>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            {l.icon} {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
