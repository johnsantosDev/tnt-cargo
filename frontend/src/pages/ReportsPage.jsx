import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Card, CardHeader, CardBody, Button, Select, Spinner, Input } from '../components/ui';
import { Download, TrendingUp, Package, AlertTriangle, Banknote, FileText, FileSpreadsheet, Calendar, Plane, ArrowRightLeft, Container } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366F1', '#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];
const REGIONS = ['Goma', 'Beni', 'Butembo', 'Lubumbashi', 'Kolwezi', 'Kinshasa', 'Bukavu', 'China', 'Dubai'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('manager');
  const [activeTab, setActiveTab] = useState('financial');
  const [period, setPeriod] = useState('month');
  const [groupBy, setGroupBy] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [region, setRegion] = useState('');
  // Containers-tab specific filters
  const [selectedContainer, setSelectedContainer] = useState('');
  const [detailedContainer, setDetailedContainer] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(() => {
    setLoading(true);
    const params = useCustomDates && startDate && endDate
      ? { start_date: startDate, end_date: endDate, group_by: groupBy }
      : { period, group_by: groupBy };
    if (region) params.region = region;
    if (activeTab === 'containers') {
      if (selectedContainer) params.container_code = selectedContainer;
      if (detailedContainer) params.detailed = 1;
    }
    api.get(`/reports/${activeTab}`, { params })
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, period, groupBy, startDate, endDate, useCustomDates, region, selectedContainer, detailedContainer]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleTabChange = (key) => {
    // Reset container-specific filters when leaving the tab so they don't leak
    // into a follow-up containers visit with stale state.
    if (activeTab === 'containers' && key !== 'containers') {
      setSelectedContainer('');
      setDetailedContainer(false);
    }
    setActiveTab(key);
  };

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const tabs = [
    { key: 'financial', label: t('reports.financial'), icon: TrendingUp },
    { key: 'shipments', label: t('reports.shipments'), icon: Package },
    { key: 'debts', label: t('reports.debts'), icon: AlertTriangle },
    { key: 'cash-advances', label: t('reports.cash_advances'), icon: Banknote },
    { key: 'flight-tickets', label: t('reports.flight_tickets'), icon: Plane },
    { key: 'transfers', label: t('reports.transfers'), icon: ArrowRightLeft },
    { key: 'containers', label: t('reports.containers'), icon: Package }
  ];

  const handleExport = async (format) => {
    try {
      const params = useCustomDates && startDate && endDate
        ? { start_date: startDate, end_date: endDate, export: format }
        : { period, export: format };
      if (region) params.region = region;
      if (activeTab === 'containers') {
        if (selectedContainer) params.container_code = selectedContainer;
        if (detailedContainer) params.detailed = 1;
      }
      const response = await api.get(`/reports/${activeTab}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const slug = activeTab === 'containers' && selectedContainer
        ? `container-${selectedContainer.replace(/[^A-Za-z0-9]/g, '_')}`
        : `${activeTab}-${period}`;
      link.setAttribute('download', `rapport-${slug}.${format === 'excel' ? 'xlsx' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t('reports.all_regions')}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          )}
          {!useCustomDates && (
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="week">{t('dashboard.week')}</option>
              <option value="month">{t('dashboard.month')}</option>
              <option value="year">{t('dashboard.year')}</option>
            </Select>
          )}
          {activeTab === 'financial' && (
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'daily', label: 'Jour' },
                { key: 'weekly', label: 'Semaine' },
                { key: 'monthly', label: 'Mois' },
                { key: 'yearly', label: 'Année' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGroupBy(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${groupBy === key ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {useCustomDates && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              <span className="text-gray-400">—</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </>
          )}
          <button onClick={() => setUseCustomDates(!useCustomDates)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 border border-gray-300 rounded-md hover:border-indigo-300 transition-colors">
            <Calendar className="w-4 h-4" />
            {useCustomDates ? t('dashboard.month') : t('reports.start_date')}
          </button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')}>
            <FileText className="w-4 h-4 mr-1" />PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === key ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {activeTab === 'financial' && <FinancialReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'shipments' && <ShipmentsReport data={data} t={t} />}
          {activeTab === 'debts' && <DebtsReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'cash-advances' && <CashAdvancesReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'flight-tickets' && <FlightTicketsReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'transfers' && <TransfersReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'containers' && (
            <ContainersReport
              data={data}
              formatMoney={formatMoney}
              t={t}
              selectedContainer={selectedContainer}
              onContainerChange={setSelectedContainer}
              detailed={detailedContainer}
              onDetailedChange={setDetailedContainer}
            />
          )}
        </>
      )}
    </div>
  );
}

function FinancialReport({ data, formatMoney, t }) {
  if (!data) return null;
  const { summary, chart } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t('reports.total_revenue'), value: formatMoney(summary?.total_revenue), color: 'text-green-600' },
          { label: t('reports.total_expenses'), value: formatMoney(summary?.total_expenses), color: 'text-red-600' },
          { label: t('reports.net_profit'), value: formatMoney(summary?.net_profit), color: 'text-blue-600' },
          { label: t('reports.margin'), value: `${summary?.margin || 0}%`, color: 'text-purple-600' },
          { label: t('reports.flight_ticket_revenue'), value: formatMoney(summary?.flight_ticket_revenue), color: 'text-indigo-600' }
        ].map((item, i) => (
          <Card key={i}><CardBody className="text-center"><p className="text-sm text-gray-500">{item.label}</p><p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p></CardBody></Card>
        ))}
      </div>
      <Card>
        <CardHeader><h3 className="font-semibold">{t('reports.revenue_vs_expenses')}</h3></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}

function ShipmentsReport({ data, t }) {
  if (!data) return null;
  const { summary, by_status, by_origin } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('reports.total_shipments'), value: summary?.total || 0 },
          { label: t('reports.delivered'), value: summary?.delivered || 0 },
          { label: t('reports.in_transit'), value: summary?.in_transit || 0 }
        ].map((item, i) => (
          <Card key={i}><CardBody className="text-center"><p className="text-sm text-gray-500">{item.label}</p><p className="text-2xl font-bold mt-1">{item.value}</p></CardBody></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.by_status')}</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={by_status || []} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="name" label>
                  {(by_status || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.by_origin')}</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={by_origin || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="origin" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function DebtsReport({ data, formatMoney, t }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.total_debt')}</p><p className="text-2xl font-bold mt-1 text-red-600">{formatMoney(data.total_debt)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.clients_with_debt')}</p><p className="text-2xl font-bold mt-1">{data.clients_count || 0}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.avg_debt')}</p><p className="text-2xl font-bold mt-1">{formatMoney(data.avg_debt)}</p></CardBody></Card>
      </div>
      <Card>
        <CardHeader><h3 className="font-semibold">{t('reports.top_debtors')}</h3></CardHeader>
        <CardBody className="p-0">
          <div className="divide-y">
            {(data.top_debtors || []).map((d, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.phone}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{formatMoney(d.total_debt)}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function CashAdvancesReport({ data, formatMoney, t }) {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.total_advanced')}</p><p className="text-2xl font-bold mt-1">{formatMoney(data.total_advanced)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.total_recovered')}</p><p className="text-2xl font-bold mt-1 text-green-600">{formatMoney(data.total_recovered)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.outstanding')}</p><p className="text-2xl font-bold mt-1 text-red-600">{formatMoney(data.outstanding)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.overdue_count')}</p><p className="text-2xl font-bold mt-1 text-amber-600">{data.overdue_count || 0}</p></CardBody></Card>
      </div>
      <Card>
        <CardHeader><h3 className="font-semibold">{t('reports.advances_trend')}</h3></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="advanced" name="Avancé" stroke="#6366F1" strokeWidth={2} />
              <Line type="monotone" dataKey="recovered" name="Récupéré" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}

function FlightTicketsReport({ data, formatMoney, t }) {
  if (!data) return null;
  const { summary, by_airline, by_route, trend, recent_tickets } = data;
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.ft_ticket_count')}</p><p className="text-2xl font-bold mt-1">{summary?.ticket_count || 0}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.ft_total_sales')}</p><p className="text-2xl font-bold mt-1 text-green-600">{formatMoney(summary?.total_sales)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.ft_collected')}</p><p className="text-2xl font-bold mt-1 text-blue-600">{formatMoney(summary?.total_collected)}</p></CardBody></Card>
        <Card><CardBody className="text-center"><p className="text-sm text-gray-500">{t('reports.ft_pending')}</p><p className="text-2xl font-bold mt-1 text-red-600">{formatMoney(summary?.total_pending)}</p></CardBody></Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader><h3 className="font-semibold">{t('reports.ft_sales_trend')}</h3></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="sales" name={t('reports.ft_total_sales')} stroke="#6366F1" strokeWidth={2} />
              <Line type="monotone" dataKey="collected" name={t('reports.ft_collected')} stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* By Airline & By Route */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.ft_by_airline')}</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={by_airline || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="total" name={t('reports.ft_total_sales')} fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.ft_by_route')}</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={by_route || []} cx="50%" cy="50%" outerRadius={100} dataKey="count" nameKey="name" label={({ name, count }) => `${name} (${count})`}>
                  {(by_route || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader><h3 className="font-semibold">{t('reports.ft_recent_tickets')}</h3></CardHeader>
        <CardBody className="p-0">
          <div className="divide-y">
            {(recent_tickets || []).map((tk) => (
              <div key={tk.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{tk.passenger_name}</p>
                  <p className="text-xs text-gray-500">{tk.airline} · {tk.departure_airport} → {tk.arrival_airport}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatMoney(tk.total_price)}</p>
                  {tk.balance_due > 0 && <p className="text-xs text-red-500">Solde: {formatMoney(tk.balance_due)}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function TransfersReport({ data, formatMoney, t }) {
  if (!data) return null;
  const { summary, by_status, by_region, trend } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t('reports.total_revenue'), value: formatMoney(summary?.total_amount), color: 'text-green-600' },
          { label: t('common.total'), value: summary?.total_count, color: 'text-blue-600' },
          { label: t('transfers.status_completed'), value: summary?.completed, color: 'text-emerald-600' },
          { label: t('transfers.status_pending'), value: summary?.pending, color: 'text-yellow-600' },
          { label: t('transfers.status_approved'), value: summary?.approved, color: 'text-indigo-600' },
        ].map((item, i) => (
          <Card key={i}><CardBody className="text-center"><p className="text-sm text-gray-500">{item.label}</p><p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p></CardBody></Card>
        ))}
      </div>
      {trend?.length > 0 && (
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.transfers')}</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="total" fill="#6366F1" radius={[6, 6, 0, 0]} name={t('reports.total_revenue')} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {by_status?.length > 0 && (
          <Card>
            <CardHeader><h3 className="font-semibold">{t('reports.by_status')}</h3></CardHeader>
            <CardBody className="p-0">
              <div className="divide-y">
                {by_status.map((s, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{s.status?.replace('_', ' ')}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">{s.count} — </span>
                      <span className="text-sm font-bold">{formatMoney(s.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
        {by_region?.length > 0 && (
          <Card>
            <CardHeader><h3 className="font-semibold">{t('reports.region')}</h3></CardHeader>
            <CardBody className="p-0">
              <div className="divide-y">
                {by_region.map((r, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{r.region}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">{r.count} — </span>
                      <span className="text-sm font-bold">{formatMoney(r.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function ContainersReport({ data, formatMoney, t, selectedContainer, onContainerChange, detailed, onDetailedChange }) {
  if (!data) return null;
  const { summary, containers, containers_list, shipments, linked_expenses } = data;
  const isDetail = !!selectedContainer;
  const linkedExpenses = linked_expenses || [];
  const linkedExpensesTotal = linkedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const paymentBadge = (status) => {
    const map = {
      paid: 'bg-emerald-100 text-emerald-700',
      partial: 'bg-amber-100 text-amber-700',
      unpaid: 'bg-red-100 text-red-700',
      unbilled: 'bg-gray-100 text-gray-600',
    };
    const labels = {
      paid: t('reports.payment_paid'),
      partial: t('reports.payment_partial'),
      unpaid: t('reports.payment_unpaid'),
      unbilled: t('reports.payment_unbilled'),
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('reports.select_container')}</label>
              <Select value={selectedContainer} onChange={(e) => onContainerChange(e.target.value)}>
                <option value="">{t('reports.all_containers')}</option>
                {(containers_list || []).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </Select>
            </div>
            <label className="inline-flex items-center gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detailed}
                onChange={(e) => onDetailedChange(e.target.checked)}
                disabled={!selectedContainer}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{t('reports.detailed_report')}</span>
              <span className="text-xs text-gray-400">({t('reports.detailed_report_hint')})</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isDetail
          ? [
              { label: t('reports.total_billed'), value: formatMoney(summary?.total_billed), color: 'text-blue-600' },
              { label: t('reports.total_revenue'), value: formatMoney(summary?.total_revenue), color: 'text-green-600' },
              { label: t('reports.total_outstanding'), value: formatMoney(summary?.total_outstanding), color: 'text-red-600' },
              { label: t('reports.total_expenses'), value: formatMoney(summary?.total_expenses), color: 'text-amber-600' },
              { label: t('reports.net_profit'), value: formatMoney(summary?.total_profit), color: 'text-purple-600' },
            ].map((item, i) => (
              <Card key={i}><CardBody className="text-center"><p className="text-sm text-gray-500">{item.label}</p><p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p></CardBody></Card>
            ))
          : [
              { label: t('reports.total_containers'), value: summary?.total_containers, color: 'text-blue-600' },
              { label: t('reports.total_revenue'), value: formatMoney(summary?.total_revenue), color: 'text-green-600' },
              { label: t('reports.total_expenses'), value: formatMoney(summary?.total_expenses), color: 'text-red-600' },
              { label: t('reports.net_profit'), value: formatMoney(summary?.total_profit), color: 'text-purple-600' },
            ].map((item, i) => (
              <Card key={i}><CardBody className="text-center"><p className="text-sm text-gray-500">{item.label}</p><p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p></CardBody></Card>
            ))}
      </div>

      {/* Detail view: shipments-in-container */}
      {isDetail ? (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">
              {t('reports.container')} <span className="font-mono text-indigo-600">{selectedContainer}</span>
              <span className="ml-2 text-sm text-gray-500">({(shipments || []).length} {t('reports.total_shipments').toLowerCase()})</span>
            </h3>
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('shipments.tracking_number')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('shipments.client')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('shipments.status')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('shipments.weight')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">CBM</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('reports.total_billed')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('invoices.paid')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('invoices.balance')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('invoices.number')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('reports.payment_status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(shipments || []).map((s) => (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-medium">{s.tracking_number}</div>
                        <div className="text-xs text-gray-400">{s.origin} → {s.destination}</div>
                      </td>
                      <td className="px-4 py-3">{s.client || '—'}</td>
                      <td className="px-4 py-3">{s.status || '—'}</td>
                      <td className="px-4 py-3 text-right">{Number(s.weight || 0).toFixed(2)} kg</td>
                      <td className="px-4 py-3 text-right">{Number(s.volume || 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatMoney(s.total_cost)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatMoney(s.amount_paid)}</td>
                      <td className={`px-4 py-3 text-right ${s.balance_due > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{formatMoney(s.balance_due)}</td>
                      <td className="px-4 py-3">
                        {s.invoice ? (
                          <div>
                            <div className="font-mono text-xs">{s.invoice.invoice_number}</div>
                            <div className="text-xs text-gray-400">{s.invoice.status}</div>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {paymentBadge(s.payment_status)}
                        {s.last_payment_date && <div className="text-xs text-gray-400 mt-1">{new Date(s.last_payment_date).toLocaleDateString('fr-FR')}</div>}
                      </td>
                    </tr>
                    {s.invoice && (
                      <tr className="bg-blue-50/40">
                        <td colSpan={10} className="px-4 py-2">
                          <div className="text-xs font-semibold text-blue-700 mb-1.5">
                            {t('reports.invoice_breakdown')} — <span className="font-mono">{s.invoice.invoice_number}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span><span className="text-gray-500">{t('reports.expedition_fees')}:</span> <span className="font-medium">{formatMoney(s.invoice.subtotal)}</span></span>
                            <span><span className="text-gray-500">{t('invoices.magerwa')}:</span> <span className={`font-medium ${s.invoice.magerwa_price > 0 ? '' : 'text-gray-400'}`}>{formatMoney(s.invoice.magerwa_price)}</span></span>
                            <span>
                              <span className="text-gray-500">{t('invoices.auxiliary_fee')}:</span> <span className={`font-medium ${s.invoice.auxiliary_fees_total > 0 ? '' : 'text-gray-400'}`}>{formatMoney(s.invoice.auxiliary_fees_total)}</span>
                              {Array.isArray(s.invoice.auxiliary_fees) && s.invoice.auxiliary_fees.length > 0 && (
                                <span className="text-gray-400"> ({s.invoice.auxiliary_fees.map((f) => `${f.label}: ${formatMoney(f.amount)}`).join(', ')})</span>
                              )}
                            </span>
                            {s.invoice.cash_advance_amount > 0 && (
                              <span><span className="text-gray-500">{t('invoices.cash_advance')}:</span> <span className="font-medium text-orange-700">-{formatMoney(s.invoice.cash_advance_amount)}</span></span>
                            )}
                            <span className="ml-auto"><span className="text-gray-500">Total:</span> <span className="font-bold text-blue-700">{formatMoney(s.invoice.total)}</span></span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {detailed && s.packing_lists && s.packing_lists.length > 0 && (
                      <tr className="bg-indigo-50/40">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="text-xs font-semibold text-indigo-700 mb-2">
                            {t('reports.packing_lists')} ({s.packing_lists.length})
                          </div>
                          <div className="space-y-1.5">
                            {s.packing_lists.map((pl) => (
                              <div key={pl.id} className="text-xs bg-white border border-indigo-100 rounded px-3 py-1.5 space-y-1">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-mono font-semibold text-indigo-700">{pl.reference}</span>
                                  <span className="text-gray-500">{pl.parcel_count} colis · {Number(pl.total_cbm).toFixed(4)} CBM · {Number(pl.total_weight).toFixed(2)} kg</span>
                                  {pl.price_per_cbm > 0 && <span className="text-gray-500">· ${Number(pl.price_per_cbm).toFixed(2)}/CBM</span>}
                                  <span className="text-gray-500">· {pl.item_count} {t('packing_list.items_count').toLowerCase()}</span>
                                  <span className="text-gray-700">· {t('packing_list.shipping_cost')}: {formatMoney(pl.shipping_cost)}</span>
                                  {pl.additional_fees > 0 && <span className="text-gray-700">+ {formatMoney(pl.additional_fees)} {t('packing_list.additional_fees') || 'divers'}</span>}
                                  <span className="text-gray-700">· {t('packing_list.total_amount')}: {formatMoney(pl.total_amount)}</span>
                                  <span className="ml-auto text-gray-400 capitalize">{pl.status}</span>
                                </div>
                                {pl.notes && (
                                  <div className="text-[11px] text-gray-600 italic border-l-2 border-indigo-200 pl-2">
                                    <span className="font-medium not-italic text-gray-500">{t('packing_list.notes')}:</span> {pl.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {(!shipments || shipments.length === 0) && (
                  <tr><td colSpan={10} className="px-5 py-8 text-center text-gray-400">{t('common.no_data')}</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
          {linkedExpenses.length > 0 && (
            <>
              <CardHeader>
                <h3 className="font-semibold">
                  {t('reports.container_linked_expenses')}
                  <span className="ml-2 text-sm text-gray-500">({linkedExpenses.length})</span>
                </h3>
              </CardHeader>
              <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t('expenses.reference')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t('expenses.category')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t('expenses.description')}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t('expenses.date')}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">{t('expenses.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {linkedExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{e.reference}</td>
                        <td className="px-4 py-3">{e.category}</td>
                        <td className="px-4 py-3">{e.description}</td>
                        <td className="px-4 py-3">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">{formatMoney(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="px-4 py-3 text-right">{t('common.total')}</td>
                      <td className="px-4 py-3 text-right text-red-700">{formatMoney(linkedExpensesTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardBody>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader><h3 className="font-semibold">{t('reports.containers')}</h3></CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">{t('shipments.container_code')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('reports.total_shipments')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('reports.total_revenue')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('reports.total_expenses')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('reports.net_profit')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('reports.margin')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">{t('shipments.weight')}</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">CBM</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(containers || []).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium font-mono text-xs">{c.container_code}</td>
                    <td className="px-5 py-3 text-right">{c.shipment_count}</td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium">{formatMoney(c.revenue)}</td>
                    <td className="px-5 py-3 text-right text-red-600">{formatMoney(c.expenses)}</td>
                    <td className="px-5 py-3 text-right font-bold">{formatMoney(c.profit)}</td>
                    <td className="px-5 py-3 text-right">{c.margin}%</td>
                    <td className="px-5 py-3 text-right">{Number(c.total_weight || 0).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">{Number(c.total_cbm || 0).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onContainerChange(c.container_code)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {t('reports.view_detail')}
                      </button>
                    </td>
                  </tr>
                ))}
                {(!containers || containers.length === 0) && (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">{t('common.no_data')}</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
