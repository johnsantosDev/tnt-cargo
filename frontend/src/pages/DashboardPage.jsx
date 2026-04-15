import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { KPICard, Card, CardHeader, CardBody, Spinner, StatusBadge } from '../components/ui';
import {
  DollarSign, Package, Users, TrendingUp,
  AlertTriangle, CreditCard, Banknote, ArrowRight,
  Clock, FileText, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366F1', '#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#059669'];

const REGIONS = ['Goma', 'Beni', 'Butembo', 'Lubumbashi', 'Kolwezi', 'Kinshasa', 'Bukavu', 'China', 'Dubai'];

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('manager');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [region, setRegion] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (region) params.append('region', region);
    api.get(`/dashboard?${params.toString()}`)
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, region]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!data) return null;

  const { kpis, charts, recent, alerts } = data;

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning');
    if (hour < 18) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="sm:flex sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500">{t('dashboard.welcome_desc')}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0 items-center">
          {isManager && (
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
              <option value="">{t('dashboard.all_regions')}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-xs border border-gray-200">
            {['day', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p ? 'bg-gray-900 text-white font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t(`dashboard.${p}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.revenue')} value={formatMoney(kpis.total_revenue)} icon={DollarSign} color="green" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.profit')} value={formatMoney(kpis.net_profit)} icon={TrendingUp} color="blue" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.active_shipments')} value={kpis.active_shipments} icon={Package} color="primary" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.total_debt')} value={formatMoney(kpis.total_debt)} icon={AlertTriangle} color="red" />
        </div>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.shipments')} value={kpis.total_shipments} icon={Package} color="purple" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.expenses')} value={formatMoney(kpis.total_expenses)} icon={CreditCard} color="yellow" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.total_clients')} value={kpis.total_clients} icon={Users} color="blue" />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <KPICard title={t('dashboard.pending_advances')} value={formatMoney(kpis.pending_cash_advances)} icon={Banknote} color="purple" />
        </div>
      </div>

      {/* Daily Stats */}
      {data.daily && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 sm:col-span-4">
            <KPICard title={t('dashboard.today_revenue')} value={formatMoney(data.daily.revenue)} icon={DollarSign} color="green" />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <KPICard title={t('dashboard.today_expenses')} value={formatMoney(data.daily.expenses)} icon={CreditCard} color="red" />
          </div>
          <div className="col-span-12 sm:col-span-4">
            <KPICard title={t('dashboard.today_shipments')} value={data.daily.shipments} icon={Package} color="blue" />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-800">{t('dashboard.revenue_chart')}</h3>
              </div>
            </CardHeader>
            <CardBody>
              {charts.revenue?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="total" fill="#1E40AF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <Activity className="w-10 h-10 mb-2" />
                  <p className="text-sm">{t('common.no_data')}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-800">{t('dashboard.shipments_chart')}</h3>
              </div>
            </CardHeader>
            <CardBody>
              {charts.shipments_by_status?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={charts.shipments_by_status}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {charts.shipments_by_status.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <Package className="w-10 h-10 mb-2" />
                  <p className="text-sm">{t('common.no_data')}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recent Shipments */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">{t('dashboard.recent_shipments')}</h3>
              </div>
              <button onClick={() => navigate('/dashboard/shipments')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
                {t('dashboard.view_all')} <ArrowRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {recent.shipments?.length > 0 ? recent.shipments.slice(0, 6).map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.tracking_number}</p>
                      <p className="text-xs text-gray-500">{s.client?.name}</p>
                    </div>
                    <StatusBadge status={s.status?.slug} />
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('common.no_data')}</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent Payments */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">{t('dashboard.recent_payments')}</h3>
              </div>
              <button onClick={() => navigate('/dashboard/payments')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
                {t('dashboard.view_all')} <ArrowRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {recent.payments?.length > 0 ? recent.payments.slice(0, 6).map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.reference}</p>
                      <p className="text-xs text-gray-500">{p.client?.name}</p>
                    </div>
                    <span className={`text-sm font-semibold ${p.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {p.type === 'income' ? '+' : '-'}{formatMoney(p.amount)}
                    </span>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">{t('common.no_data')}</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Alerts */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800">{t('dashboard.overdue_alerts')}</h3>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {alerts.overdue_advances?.length > 0 ? alerts.overdue_advances.slice(0, 3).map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.reference}</p>
                      <p className="text-xs text-gray-500">{a.client?.name}</p>
                    </div>
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{t('cash_advances.overdue')}</span>
                  </div>
                )) : null}
                {alerts.unpaid_invoices?.length > 0 ? alerts.unpaid_invoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{inv.client?.name}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{t('invoices.overdue')}</span>
                  </div>
                )) : null}
                {(!alerts.overdue_advances?.length && !alerts.unpaid_invoices?.length) && (
                  <div className="px-5 py-8 text-center text-green-500 text-sm">
                    ✓ {t('dashboard.no_alerts')}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
