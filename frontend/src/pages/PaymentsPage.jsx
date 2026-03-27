import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal } from '../components/ui';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    api.get('/payments', { params })
      .then(({ data }) => { setPayments(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await api.delete(`/payments/${id}`);
    fetchPayments();
  };

  const methodBadge = (m) => {
    const colors = { cash: 'green', mobile_money: 'blue', bank_transfer: 'purple', check: 'yellow' };
    const labels = { cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Virement', check: 'Chèque' };
    return <Badge variant={colors[m] || 'gray'}>{labels[m] || m}</Badge>;
  };

  const columns = [
    { key: 'reference', label: t('payments.reference'), render: (row) => <span className="font-mono text-sm">{row.reference}</span> },
    { key: 'client', label: t('payments.client'), render: (row) => row.client?.name || '-' },
    { key: 'shipment', label: t('payments.shipment'), render: (row) => row.shipment?.tracking_number || '-' },
    { key: 'amount', label: t('payments.amount'), render: (row) => <span className="font-medium text-green-600">{formatMoney(row.amount)}</span> },
    { key: 'method', label: t('payments.method'), render: (row) => methodBadge(row.payment_method) },
    { key: 'date', label: t('payments.date'), render: (row) => formatDate(row.payment_date) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          {hasPermission('payments.edit') && <button onClick={() => { setEditData(row); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>}
          {hasPermission('payments.delete') && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
        {hasPermission('payments.create') && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />{t('payments.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex-1 min-w-[200px]">
            <Input placeholder={t('payments.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <Table columns={columns} data={payments} emptyMessage={t('payments.no_payments')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination currentPage={meta.current_page} lastPage={meta.last_page} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <PaymentFormModal data={editData} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchPayments(); }} />}
    </div>
  );
}

function PaymentFormModal({ data, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [form, setForm] = useState({
    client_id: data?.client_id || '', shipment_id: data?.shipment_id || '',
    amount: data?.amount || '', payment_method: data?.payment_method || 'cash',
    payment_type: data?.payment_type || 'shipment', payment_date: data?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: data?.notes || ''
  });

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } }).then(({ data }) => setClients(data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.client_id) {
      api.get('/shipments', { params: { client_id: form.client_id, per_page: 100 } })
        .then(({ data }) => setShipments(data.data))
        .catch(console.error);
    }
  }, [form.client_id]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (data?.id) await api.put(`/payments/${data.id}`, form);
      else await api.post('/payments', form);
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('payments.edit') : t('payments.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label={t('payments.client')} value={form.client_id} onChange={set('client_id')} error={errors.client_id?.[0]} required>
          <option value="">{t('common.select')}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label={t('payments.shipment')} value={form.shipment_id} onChange={set('shipment_id')} error={errors.shipment_id?.[0]}>
          <option value="">{t('common.select')}</option>
          {shipments.map((s) => <option key={s.id} value={s.id}>{s.tracking_number} ({s.description})</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('payments.amount')} type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount?.[0]} required />
          <Select label={t('payments.method')} value={form.payment_method} onChange={set('payment_method')}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement bancaire</option>
            <option value="check">Chèque</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('payments.payment_type')} value={form.payment_type} onChange={set('payment_type')}>
            <option value="shipment">Expédition</option>
            <option value="advance">Acompte</option>
            <option value="debt">Remboursement dette</option>
          </Select>
          <Input label={t('payments.date')} type="date" value={form.payment_date} onChange={set('payment_date')} />
        </div>
        <Input label={t('common.notes')} value={form.notes} onChange={set('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{data ? t('common.save') : t('payments.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
