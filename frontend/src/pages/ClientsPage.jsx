import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal, Textarea } from '../components/ui';
import { Plus, Search, Filter, Edit2, Trash2, Eye } from 'lucide-react';
import ExportButtons from '../components/ui/ExportButtons';

export default function ClientsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDetail, setShowDetail] = useState(null);

  const fetchClients = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    api.get('/clients', { params })
      .then(({ data }) => { setClients(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, typeFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await api.delete(`/clients/${id}`);
    fetchClients();
  };

  const typeBadge = (type) => {
    const colors = { vip: 'yellow', regular: 'blue', new: 'green' };
    return <Badge variant={colors[type] || 'gray'}>{type?.toUpperCase()}</Badge>;
  };

  const columns = [
    { key: 'name', label: t('clients.name'), render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'phone', label: t('clients.phone') },
    { key: 'email', label: t('clients.email'), render: (row) => row.email || '-' },
    { key: 'company', label: t('clients.company'), render: (row) => row.company || '-' },
    { key: 'type', label: t('clients.type'), render: (row) => typeBadge(row.type) },
    { key: 'shipment_count', label: t('clients.shipments'), render: (row) => row.shipment_count || 0 },
    { key: 'total_debt', label: t('clients.total_debt'), render: (row) => <span className={row.total_debt > 0 ? 'text-red-600 font-medium' : ''}>{formatMoney(row.total_debt)}</span> },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
          {hasPermission('clients.edit') && <button onClick={() => { setEditData(row); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>}
          {hasPermission('clients.delete') && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('clients.title')}</h1>
        {hasPermission('clients.create') && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />{t('clients.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('clients.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">{t('clients.all_types')}</option>
              <option value="vip">VIP</option>
              <option value="regular">Régulier</option>
              <option value="new">Nouveau</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={clients} filename="clients" />
            </div>
            <Table columns={columns} data={clients} emptyMessage={t('clients.no_clients')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <ClientFormModal data={editData} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchClients(); }} />}
      {showDetail && <ClientDetailModal client={showDetail} onClose={() => setShowDetail(null)} />}
    </div>
  );
}

function ClientFormModal({ data, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: data?.name || '', email: data?.email || '', phone: data?.phone || '',
    company: data?.company || '', type: data?.type || 'new', address: data?.address || '', notes: data?.notes || ''
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (data?.id) await api.put(`/clients/${data.id}`, form);
      else await api.post('/clients', form);
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('clients.edit') : t('clients.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('clients.name')} value={form.name} onChange={set('name')} error={errors.name?.[0]} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('clients.phone')} value={form.phone} onChange={set('phone')} error={errors.phone?.[0]} required />
          <Input label={t('clients.email')} type="email" value={form.email} onChange={set('email')} error={errors.email?.[0]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('clients.company')} value={form.company} onChange={set('company')} />
          <Select label={t('clients.type')} value={form.type} onChange={set('type')}>
            <option value="new">Nouveau</option>
            <option value="regular">Régulier</option>
            <option value="vip">VIP</option>
          </Select>
        </div>
        <Textarea label={t('clients.address')} value={form.address} onChange={set('address')} rows={2} />
        <Textarea label={t('common.notes')} value={form.notes} onChange={set('notes')} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{data ? t('common.save') : t('clients.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientDetailModal({ client, onClose }) {
  const { t } = useTranslation();
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const row = (l, v) => <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">{l}</span><span className="text-sm font-medium">{v}</span></div>;

  return (
    <Modal isOpen onClose={onClose} title={client.name}>
      <div className="space-y-1">
        {row(t('clients.phone'), client.phone)}
        {row(t('clients.email'), client.email || '-')}
        {row(t('clients.company'), client.company || '-')}
        {row(t('clients.type'), client.type?.toUpperCase())}
        {row(t('clients.shipments'), client.shipment_count || 0)}
        {row(t('clients.total_spent'), formatMoney(client.total_spent))}
        {row(t('clients.total_debt'), formatMoney(client.total_debt))}
        {client.address && row(t('clients.address'), client.address)}
        {client.notes && row(t('common.notes'), client.notes)}
      </div>
    </Modal>
  );
}
