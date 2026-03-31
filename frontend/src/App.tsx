import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import StoresPage from './pages/StoresPage';
import CustomersPage from './pages/CustomersPage';
import BarcodePage from './pages/BarcodePage';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="inventory" element={<ProtectedRoute roles={['admin', 'inventory_manager']}><InventoryPage /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute roles={['admin', 'inventory_manager']}><ProductsPage /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute roles={['admin', 'inventory_manager']}><ReportsPage /></ProtectedRoute>} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="barcodes" element={<BarcodePage />} />
          <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
          <Route path="stores" element={<ProtectedRoute roles={['admin']}><StoresPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
