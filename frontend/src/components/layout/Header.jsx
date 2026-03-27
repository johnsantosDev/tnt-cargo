import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Search, Bell, Menu, LogOut, Settings, User, Globe, X, Sun, Moon } from 'lucide-react';

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdown = useRef(null);
  const trigger = useRef(null);
  const notifRef = useRef(null);
  const notifTrigger = useRef(null);
  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (dropdown.current && dropdownOpen && !dropdown.current.contains(target) && !trigger.current.contains(target)) setDropdownOpen(false);
      if (notifRef.current && notifOpen && !notifRef.current.contains(target) && !notifTrigger.current.contains(target)) setNotifOpen(false);
      if (searchRef.current && searchResults && !searchRef.current.contains(target)) setSearchResults(null);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }) => {
      if (key === 'Escape') { setDropdownOpen(false); setNotifOpen(false); setSearchResults(null); }
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // Fetch notifications (audit logs)
  const fetchNotifications = useCallback(() => {
    api.get('/settings/audit-logs', { params: { per_page: 10 } })
      .then(({ data }) => setNotifications(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Search functionality
  const handleSearch = async (query) => {
    if (!query || query.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const [shipmentsRes, clientsRes, paymentsRes] = await Promise.all([
        api.get('/shipments', { params: { search: query, per_page: 5 } }),
        api.get('/clients', { params: { search: query, per_page: 5 } }),
        api.get('/payments', { params: { search: query, per_page: 5 } }),
      ]);
      setSearchResults({
        shipments: shipmentsRes.data.data || [],
        clients: clientsRes.data.data || [],
        payments: paymentsRes.data.data || [],
      });
    } catch { setSearchResults(null); }
    finally { setSearchLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    await logout();
    navigate('/dashboard/login');
  };

  const toggleLang = () => {
    const langs = ['fr', 'en', 'zh'];
    const current = langs.indexOf(i18n.language);
    i18n.changeLanguage(langs[(current + 1) % langs.length]);
  };

  const langLabel = { fr: 'FR', en: 'EN', zh: '中' };

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  const actionLabels = {
    created: 'Créé', updated: 'Modifié', deleted: 'Supprimé',
    payment_added: 'Paiement ajouté', status_changed: 'Statut changé',
    approved: 'Approuvé', rejected: 'Rejeté',
  };

  const hasResults = searchResults && (searchResults.shipments.length > 0 || searchResults.clients.length > 0 || searchResults.payments.length > 0);

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
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
            <div className="relative hidden sm:block" ref={searchRef}>
              <label htmlFor="header-search" className="sr-only">Search</label>
              <input
                id="header-search"
                className="form-input w-64 pl-9 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 rounded-lg border border-gray-200 text-sm py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:focus:bg-gray-600 dark:placeholder-gray-400"
                type="search"
                placeholder={t('common.search') || 'Rechercher...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              {/* Search results dropdown */}
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 mt-1 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                  {searchLoading ? (
                    <div className="p-4 text-center text-sm text-gray-400">Recherche...</div>
                  ) : hasResults ? (
                    <div className="py-2">
                      {searchResults.shipments.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Expéditions</div>
                          {searchResults.shipments.map(s => (
                            <button key={s.id} onClick={() => { navigate(`/dashboard/shipments/${s.id}`); setSearchQuery(''); setSearchResults(null); }}
                              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 text-left">
                              <span className="text-sm font-mono text-primary-600">{s.tracking_number}</span>
                              <span className="text-xs text-gray-400">{s.client?.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.clients.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Clients</div>
                          {searchResults.clients.map(c => (
                            <button key={c.id} onClick={() => { navigate(`/dashboard/clients`); setSearchQuery(''); setSearchResults(null); }}
                              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 text-left">
                              <span className="text-sm font-medium">{c.name}</span>
                              <span className="text-xs text-gray-400">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.payments.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">Paiements</div>
                          {searchResults.payments.map(p => (
                            <button key={p.id} onClick={() => { navigate(`/dashboard/payments/${p.id}`); setSearchQuery(''); setSearchResults(null); }}
                              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 text-left">
                              <span className="text-sm font-mono text-primary-600">{p.reference}</span>
                              <span className="text-xs text-gray-400">{p.client?.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1 px-3 pb-1">
                        <button
                          onClick={() => { navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`); setSearchQuery(''); setSearchResults(null); }}
                          className="w-full text-center py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          Voir tous les résultats →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-400">Aucun résultat</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Mobile search toggle */}
            <button
              className="sm:hidden text-gray-400 hover:text-gray-500 p-1.5"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Changer de langue"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-bold">{langLabel[i18n.language] || 'FR'}</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-yellow-400 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                ref={notifTrigger}
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
                className="relative text-gray-400 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {notifOpen && (
                <div ref={notifRef} className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Activité récente</h3>
                    <span className="text-xs text-gray-400">{notifications.length} actions</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">Aucune activité</div>
                    ) : notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">
                              <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-primary-50 text-primary-700 mr-1.5">
                                {actionLabels[n.action] || n.action}
                              </span>
                              {n.model_type?.split('\\').pop()}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {n.user?.name || 'Système'} · {formatTimeAgo(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <button
                      onClick={() => { setNotifOpen(false); navigate('/dashboard/settings'); }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Voir tout →
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                  className="origin-top-right absolute top-full right-0 mt-1 min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1.5 z-10"
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
              className="form-input w-full pl-9 rounded-lg border border-gray-200 text-sm py-2"
              type="search"
              placeholder={t('common.search') || 'Rechercher...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
    </header>
  );
}
