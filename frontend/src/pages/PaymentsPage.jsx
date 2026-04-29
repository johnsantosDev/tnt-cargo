import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal } from '../components/ui';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Plus, Search, Edit2, Trash2, Download, Eye, MessageCircle } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { sendViaWhatsApp } from '../utils/export';
import ExportButtons from '../components/ui/ExportButtons';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);

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
    try {
      await api.delete(`/payments/${id}`);
      fetchPayments();
      toast.success(t('common.deleted'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const methodBadge = (m) => {
    const colors = { cash: 'green', mobile_money: 'blue', bank_transfer: 'purple', check: 'yellow' };
    const labels = { cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Virement', check: 'Chèque' };
    return <Badge variant={colors[m] || 'gray'}>{labels[m] || m}</Badge>;
  };

  const columns = [
    { key: 'reference', label: t('payments.reference'), render: (row) => <button onClick={() => navigate(`/dashboard/payments/${row.id}`)} className="font-mono text-sm text-primary-700 hover:text-primary-900 hover:underline">{row.reference}</button> },
    { key: 'client', label: t('payments.client'), render: (row) => row.client?.name || '-', exportValue: (row) => row.client?.name || '-' },
    { key: 'shipment', label: t('payments.shipment'), render: (row) => row.shipment?.tracking_number || '-', exportValue: (row) => row.shipment?.tracking_number || '-' },
    { key: 'amount', label: t('payments.amount'), render: (row) => <span className="font-medium text-green-600">{formatMoney(row.amount)}</span>, exportValue: (row) => formatMoney(row.amount) },
    { key: 'method', label: t('payments.method'), render: (row) => methodBadge(row.method), exportValue: (row) => ({ cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Virement', check: 'Chèque' }[row.method] || row.method) },
    { key: 'date', label: t('payments.date'), render: (row) => formatDate(row.payment_date), exportValue: (row) => formatDate(row.payment_date) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => navigate(`/dashboard/payments/${row.id}`)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
          <button
            onClick={async () => {
              const res = await api.get(`/payments/${row.id}/pdf`, { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `recu-${row.client?.name || ''}-${row.reference}.pdf`);
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
            }}
            className="p-1.5 text-gray-400 hover:text-green-600"
            title="PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWhatsappModal({
              phone: row.client?.phone || '',
              fileName: `recu-${row.client?.name || ''}-${row.reference}.pdf`,
              getBlob: async () => { const r = await api.get(`/payments/${row.id}/pdf`, { responseType: 'blob' }); return r.data; },
            })}
            className="p-1.5 text-gray-400 hover:text-green-500"
            title="Envoyer via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
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
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={payments} filename="paiements" />
            </div>
            <Table columns={columns} data={payments} emptyMessage={t('payments.no_payments')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <PaymentFormModal data={editData} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchPayments(); }} />}
      {whatsappModal && (
        <WhatsAppSendModal
          phone={whatsappModal.phone}
          onClose={() => setWhatsappModal(null)}
          onSend={async (phone) => {
            try {
              const blob = await whatsappModal.getBlob();
              await sendViaWhatsApp(blob, whatsappModal.fileName, phone);
            } catch { toast.error(t('common.error')); }
            finally { setWhatsappModal(null); }
          }}
        />
      )}
    </div>
  );
}

function PaymentFormModal({ data, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    client_id: data?.client_id || '', shipment_id: data?.shipment_id || '',
    amount: data?.amount || '', method: data?.method || 'cash',
    type: data?.type || 'income', payment_date: data?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: data?.notes || '', bank_reference: data?.bank_reference || ''
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
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => { if (val !== '' && val !== null) formData.append(key, val); });
      if (proofFile) formData.append('proof', proofFile);

      if (data?.id) {
        formData.append('_method', 'PUT');
        await api.post(`/payments/${data.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/payments', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('payments.edit') : t('payments.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SearchableSelect
          label={t('payments.client')}
          value={form.client_id}
          onChange={set('client_id')}
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          error={errors.client_id?.[0]}
          placeholder={t('common.select')}
        />
        <SearchableSelect
          label={`${t('payments.shipment')} (Expédition)`}
          value={form.shipment_id}
          onChange={set('shipment_id')}
          options={shipments.map(s => ({ value: s.id, label: `${s.tracking_number} — ${s.destination || ''} ($${Number(s.balance_due || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })})` }))}
          error={errors.shipment_id?.[0]}
          placeholder={t('common.select')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('payments.amount')} type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount?.[0]} required />
          <Select label={t('payments.method')} value={form.method} onChange={set('method')} error={errors.method?.[0]}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement bancaire</option>
            <option value="check">Chèque</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('payments.payment_type')} value={form.type} onChange={set('type')} error={errors.type?.[0]}>
            <option value="income">Revenu</option>
            <option value="expense">Dépense</option>
            <option value="refund">Remboursement</option>
          </Select>
          <Input label={t('payments.date')} type="date" value={form.payment_date} onChange={set('payment_date')} />
        </div>
        <Input label="Référence bancaire (optionnel)" value={form.bank_reference} onChange={set('bank_reference')} placeholder="Ex: TRF-2026-001" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preuve de paiement (optionnel)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          <p className="mt-1 text-xs text-gray-400">Image ou PDF, max 10 Mo</p>
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
