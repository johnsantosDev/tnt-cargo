import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, CreditCard, Receipt,
  Banknote, FileText, BarChart3, Settings, LogOut,
  Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { key: 'shipments', path: '/dashboard/shipments', icon: Package, permission: 'view_shipments' },
  { key: 'clients', path: '/dashboard/clients', icon: Users, permission: 'view_clients' },
  { key: 'payments', path: '/dashboard/payments', icon: CreditCard, permission: 'view_payments' },
  { key: 'expenses', path: '/dashboard/expenses', icon: Receipt, permission: 'view_expenses' },
  { key: 'cash_advances', path: '/dashboard/cash-advances', icon: Banknote, permission: 'view_cash_advances' },
  { key: 'invoices', path: '/dashboard/invoices', icon: FileText, permission: 'view_invoices' },
  { key: 'reports', path: '/dashboard/reports', icon: BarChart3, permission: 'view_reports' },
  { key: 'settings', path: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { t } = useTranslation();
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebar = useRef(null);
  const trigger = useRef(null);

  // Close on outside click
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // Close on Escape
  useEffect(() => {
    const keyHandler = ({ key }) => { if (key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // Toggle body class for sidebar-expanded variant
  useEffect(() => {
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  const handleLogout = async () => {
    await logout();
    navigate('/dashboard/login');
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        ref={trigger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-white rounded-lg shadow-sm border border-gray-200"
        aria-controls="sidebar"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col fixed z-50 left-0 top-0 lg:static lg:left-auto lg:top-auto h-screen no-scrollbar w-64 sidebar-expanded:!w-64 lg:w-20 2xl:sidebar-expanded:!w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-64 lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="TNT Cargo" className="w-8 h-8 rounded-lg shrink-0" />
            <span className="text-base font-bold text-gray-800 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">TNT Cargo</span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            if (item.permission && !hasPermission(item.permission) && item.permission !== 'view_dashboard') return null;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.key === 'dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 whitespace-nowrap">
                  {t(`nav.${item.key}`)}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-3 space-y-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200 whitespace-nowrap">
              {t('nav.logout')}
            </span>
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Expand/collapse toggle */}
        <div className="py-3 px-3 hidden lg:block 2xl:hidden">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {sidebarExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
}
