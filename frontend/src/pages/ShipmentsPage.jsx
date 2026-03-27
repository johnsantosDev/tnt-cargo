import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Input, Select, Table, Pagination, StatusBadge, Spinner, Modal, Badge } from '../components/ui';
import { Plus, Search, Filter, Eye, FileText, Upload, X } from 'lucide-react';
import ShipmentFormModal from './shipments/ShipmentFormModal';

export default function ShipmentsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchShipments = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/shipments', { params })
      .then(({ data }) => { setShipments(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    api.get('/shipment-statuses').then(({ data }) => setStatuses(data.data || data)).catch(console.error);
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchShipments();
  };

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const columns = [
    { key: 'tracking_number', label: t('shipments.tracking_number'), render: (row) => <span className="font-mono text-sm font-medium text-primary-700">{row.tracking_number}</span> },
    { key: 'client', label: t('shipments.client'), render: (row) => row.client?.name || '-' },
    { key: 'origin', label: t('shipments.origin'), render: (row) => <span className="capitalize">{row.origin}</span> },
    { key: 'destination', label: t('shipments.destination') },
    { key: 'description', label: t('shipments.description'), render: (row) => <span className="truncate max-w-[200px] block">{row.description}</span> },
    { key: 'total_cost', label: t('shipments.total_cost'), render: (row) => formatMoney(row.total_cost) },
    { key: 'balance', label: t('shipments.balance'), render: (row) => <span className={row.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{formatMoney(row.balance)}</span> },
    { key: 'status', label: t('shipments.status'), render: (row) => <StatusBadge status={row.status?.slug} /> },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => navigate(`/dashboard/shipments/${row.id}`)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('shipments.title')}</h1>
        {hasPermission('shipments.create') && (
          <Button onClick={() => { setEditId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />{t('shipments.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('shipments.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('shipments.all_statuses')}</option>
              {statuses.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
            </Select>
            <Button type="submit" variant="secondary"><Filter className="w-4 h-4 mr-1" />{t('common.filter')}</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <Table columns={columns} data={shipments} emptyMessage={t('shipments.no_shipments')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && (
        <ShipmentFormModal
          editId={editId}
          statuses={statuses}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchShipments(); }}
        />
      )}
    </div>
  );
}
