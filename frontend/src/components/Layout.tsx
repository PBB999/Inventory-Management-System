import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList,
  BarChart3, Users, Store, LogOut, Zap, Bell, AlertTriangle, UserCircle, ScanLine,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getInitials } from '../utils/helpers';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/pos', label: 'POS Terminal', icon: ShoppingCart },
  { to: '/barcodes', label: 'Barcodes', icon: ScanLine },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'inventory_manager'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['admin', 'inventory_manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'inventory_manager'] },
  { to: '/stores', label: 'Stores', icon: Store, roles: ['admin'] },
  { to: '/customers', label: 'Customers', icon: UserCircle },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: alertsData } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: () => api.get('/inventory/low-stock').then(r => r.data),
    refetchInterval: 60000,
  });
  const lowStockCount = alertsData?.data?.length || 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm leading-none">RetailOS</p>
              <p className="text-slate-500 text-xs mt-0.5">POS System</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={16} />
              {label}
              {label === 'Inventory' && lowStockCount > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-full border border-amber-500/30">
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center text-brand-400 text-xs font-semibold">
              {getInitials(user?.name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            {lowStockCount > 0 && (
              <button className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors">
                <AlertTriangle size={13} />
                {lowStockCount} low stock alerts
              </button>
            )}
            <button className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors relative">
              <Bell size={15} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
