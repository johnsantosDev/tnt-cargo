import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardBody, Badge, Spinner, StatusBadge } from '../components/ui';
import { Search, Package, Users, CreditCard, Receipt, Banknote, FileText } from 'lucide-react';

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const [shipments, clients, payments, expenses, cashAdvances, invoices] = await Promise.all([
        api.get('/shipments', { params: { search: q, per_page: 20 } }),
        api.get('/clients', { params: { search: q, per_page: 20 } }),
        api.get('/payments', { params: { search: q, per_page: 20 } }),
        api.get('/expenses', { params: { search: q, per_page: 20 } }),
        api.get('/cash-advances', { params: { search: q, per_page: 20 } }),
        api.get('/invoices', { params: { search: q, per_page: 20 } }),
      ]);
      setResults({
        shipments: shipments.data.data || [],
        clients: clients.data.data || [],
        payments: payments.data.data || [],
        expenses: expenses.data.data || [],
        cashAdvances: cashAdvances.data.data || [],
        invoices: invoices.data.data || [],
      });
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); performSearch(q); }
  }, [searchParams, performSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const totalResults = results
    ? results.shipments.length + results.clients.length + results.payments.length +
      results.expenses.length + results.cashAdvances.length + results.invoices.length
    : 0;

  const sections = [
    {
      key: 'shipments', icon: Package, label: t('nav.shipments'), color: 'text-blue-600 bg-blue-50',
      data: results?.shipments || [],
      render: (item) => (
        <div key={item.id} onClick={() => navigate(`/dashboard/shipments/${item.id}`)}
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <div>
            <p className="text-sm font-mono font-medium text-primary-600">{item.tracking_number}</p>
            <p className="text-xs text-gray-500">{item.client?.name} &middot; {item.origin} → {item.destination}</p>
          </div>
          <StatusBadge status={item.status?.slug} />
        </div>
      ),
    },
    {
      key: 'clients', icon: Users, label: t('nav.clients'), color: 'text-green-600 bg-green-50',
      data: results?.clients || [],
      render: (item) => (
        <div key={item.id} onClick={() => navigate('/dashboard/clients')}
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-500">{item.phone} &middot; {item.email}</p>
          </div>
          <Badge color={item.type === 'vip' ? 'purple' : 'gray'}>{item.type}</Badge>
        </div>
      ),
    },
    {
      key: 'payments', icon: CreditCard, label: t('nav.payments'), color: 'text-purple-600 bg-purple-50',
      data: results?.payments || [],
      render: (item) => (
        <div key={item.id} onClick={() => navigate(`/dashboard/payments/${item.id}`)}
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <div>
            <p className="text-sm font-mono font-medium text-primary-600">{item.reference}</p>
            <p className="text-xs text-gray-500">{item.client?.name}</p>
          </div>
          <span className={`text-sm font-semibold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {item.type === 'income' ? '+' : '-'}{formatMoney(item.amount)}
          </span>
        </div>
      ),
    },
    {
      key: 'expenses', icon: Receipt, label: t('nav.expenses'), color: 'text-amber-600 bg-amber-50',
      data: results?.expenses || [],
      render: (item) => (
        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-mono font-medium">{item.reference}</p>
            <p className="text-xs text-gray-500">{item.category} &middot; {item.description}</p>
          </div>
          <span className="text-sm font-semibold text-gray-800">{formatMoney(item.amount)}</span>
        </div>
      ),
    },
    {
      key: 'cashAdvances', icon: Banknote, label: t('nav.cash_advances'), color: 'text-indigo-600 bg-indigo-50',
      data: results?.cashAdvances || [],
      render: (item) => (
        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-mono font-medium">{item.reference}</p>
            <p className="text-xs text-gray-500">{item.client?.name}</p>
          </div>
          <span className="text-sm font-semibold text-gray-800">{formatMoney(item.amount)}</span>
        </div>
      ),
    },
    {
      key: 'invoices', icon: FileText, label: t('nav.invoices'), color: 'text-cyan-600 bg-cyan-50',
      data: results?.invoices || [],
      render: (item) => (
        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-mono font-medium">{item.invoice_number}</p>
            <p className="text-xs text-gray-500">{item.client?.name}</p>
          </div>
          <span className="text-sm font-semibold text-gray-800">{formatMoney(item.total)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('common.search')}</h1>
        <p className="text-sm text-gray-500">Recherchez dans toutes les données</p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par numéro de suivi, nom, référence..."
            className="form-input w-full pl-11 py-3 text-base rounded-xl"
            autoFocus
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </form>

      {loading && <Spinner />}

      {results && !loading && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{totalResults} résultat{totalResults !== 1 ? 's' : ''} trouvé{totalResults !== 1 ? 's' : ''}</p>

          {sections.filter(s => s.data.length > 0).map((section) => (
            <Card key={section.key}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${section.color}`}>
                  <section.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">{section.label}</h3>
                <Badge color="gray">{section.data.length}</Badge>
              </div>
              <div className="divide-y divide-gray-100">
                {section.data.map(section.render)}
              </div>
            </Card>
          ))}

          {totalResults === 0 && (
            <div className="py-16 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun résultat pour "{query}"</p>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="py-16 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Entrez au moins 2 caractères pour rechercher</p>
        </div>
      )}
    </div>
  );
}
