import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, LogOut, Settings, User } from 'lucide-react';

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdown = useRef(null);
  const trigger = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }) => { if (key === 'Escape') setDropdownOpen(false); };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleLogout = async () => {
    await logout();
    navigate('/dashboard/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 -mb-px">
          {/* Left: hamburger + search */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-600 lg:hidden"
              aria-controls="sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="relative hidden sm:block">
              <label htmlFor="header-search" className="sr-only">Search</label>
              <input
                id="header-search"
                className="form-input w-64 pl-9 bg-gray-50 focus:bg-white"
                type="search"
                placeholder={t('common.search') || 'Rechercher...'}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Mobile search toggle */}
            <button
              className="sm:hidden text-gray-400 hover:text-gray-500"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative text-gray-400 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200" />

            {/* Profile dropdown */}
            <div className="relative inline-flex">
              <button
                ref={trigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 group"
              >
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:flex items-center truncate">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 truncate">
                    {user?.name || 'User'}
                  </span>
                  <svg className="w-3 h-3 ml-1 text-gray-400 shrink-0" viewBox="0 0 12 12">
                    <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" fill="currentColor" />
                  </svg>
                </div>
              </button>

              {dropdownOpen && (
                <div
                  ref={dropdown}
                  className="origin-top-right absolute top-full right-0 mt-1 min-w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 z-10"
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <div className="text-sm font-medium text-gray-800">{user?.name}</div>
                    <div className="text-xs text-gray-500 italic">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/dashboard/settings'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    {t('nav.settings')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="sm:hidden px-4 pb-4">
          <div className="relative">
            <input
              className="form-input w-full pl-9"
              type="search"
              placeholder={t('common.search') || 'Rechercher...'}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
    </header>
  );
}
