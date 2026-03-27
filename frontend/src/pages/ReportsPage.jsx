import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card, CardHeader, CardBody, Button, Select, Spinner } from '../components/ui';
import { Download, TrendingUp, Package, AlertTriangle, Banknote } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366F1', '#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6'];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('financial');
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/${activeTab}`, { params: { period } })
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, period]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const tabs = [
    { key: 'financial', label: t('reports.financial'), icon: TrendingUp },
    { key: 'shipments', label: t('reports.shipments'), icon: Package },
    { key: 'debts', label: t('reports.debts'), icon: AlertTriangle },
    { key: 'cash-advances', label: t('reports.cash_advances'), icon: Banknote }
  ];

  const handleExport = async () => {
    try {
      const response = await api.get(`/reports/${activeTab}`, { params: { period, export: 'csv' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport-${activeTab}-${period}.csv`);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <div className="flex gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="week">{t('dashboard.week')}</option>
            <option value="month">{t('dashboard.month')}</option>
            <option value="year">{t('dashboard.year')}</option>
          </Select>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />{t('reports.export')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${activeTab === key ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {activeTab === 'financial' && <FinancialReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'shipments' && <ShipmentsReport data={data} t={t} />}
          {activeTab === 'debts' && <DebtsReport data={data} formatMoney={formatMoney} t={t} />}
          {activeTab === 'cash-advances' && <CashAdvancesReport data={data} formatMoney={formatMoney} t={t} />}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('reports.total_revenue'), value: formatMoney(summary?.total_revenue), color: 'text-green-600' },
          { label: t('reports.total_expenses'), value: formatMoney(summary?.total_expenses), color: 'text-red-600' },
          { label: t('reports.net_profit'), value: formatMoney(summary?.net_profit), color: 'text-blue-600' },
          { label: t('reports.margin'), value: `${summary?.margin || 0}%`, color: 'text-purple-600' }
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
