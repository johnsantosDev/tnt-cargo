import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card, CardHeader, CardBody, Button, Select, Spinner, Input } from '../components/ui';
import { Download, TrendingUp, Package, AlertTriangle, Banknote, FileText, FileSpreadsheet, Calendar, Plane } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366F1', '#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('financial');
  const [period, setPeriod] = useState('month');
  const [groupBy, setGroupBy] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(() => {
    setLoading(true);
    const params = useCustomDates && startDate && endDate
      ? { start_date: startDate, end_date: endDate, group_by: groupBy }
      : { period, group_by: groupBy };
    api.get(`/reports/${activeTab}`, { params })
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, period, groupBy, startDate, endDate, useCustomDates]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const tabs = [
    { key: 'financial', label: t('reports.financial'), icon: TrendingUp },
    { key: 'shipments', label: t('reports.shipments'), icon: Package },
    { key: 'debts', label: t('reports.debts'), icon: AlertTriangle },
    { key: 'cash-advances', label: t('reports.cash_advances'), icon: Banknote },
    { key: 'flight-tickets', label: t('reports.flight_tickets'), icon: Plane }
  ];

  const handleExport = async (format) => {
    try {
      const params = useCustomDates && startDate && endDate
        ? { start_date: startDate, end_date: endDate, export: format }
        : { period, export: format };
      const response = await api.get(`/reports/${activeTab}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport-${activeTab}-${period}.${format === 'excel' ? 'xlsx' : format}`);
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
            onClick={() => setActiveTab(key)}
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
