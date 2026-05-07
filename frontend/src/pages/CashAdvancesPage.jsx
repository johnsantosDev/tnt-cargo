import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal, Textarea } from '../components/ui';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Plus, Search, DollarSign, Edit2, Eye, Printer, MessageCircle, Trash2 } from 'lucide-react';
import { exportCashAdvanceInvoice, sendViaWhatsApp } from '../utils/export';
import ExportButtons from '../components/ui/ExportButtons';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import toast from 'react-hot-toast';

export default function CashAdvancesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);

  const fetchAdvances = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/cash-advances', { params })
      .then(({ data }) => { setAdvances(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const statusBadge = (status) => {
    const map = { pending: 'yellow', partial: 'blue', paid: 'green', overdue: 'red' };
    const labels = { pending: 'En cours', partial: 'Partiel', paid: 'Payé', overdue: 'En retard' };
    return <Badge variant={map[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await api.delete(`/cash-advances/${id}`);
      if (showDetail?.id === id) setShowDetail(null);
      if (showPayment?.id === id) setShowPayment(null);
      fetchAdvances();
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };
  

  const columns = [
    { key: 'reference', label: t('cash_advances.reference'), render: (row) => <span className="font-mono text-sm">{row.reference}</span> },
    { key: 'client', label: t('cash_advances.client'), render: (row) => row.client?.name || '-' },
    { key: 'supplier_reference', label: t('cash_advances.supplier_reference') },
    { key: 'amount', label: t('cash_advances.amount'), render: (row) => formatMoney(row.amount) },
    { key: 'total_due', label: t('cash_advances.total_due'), render: (row) => <span className="font-medium">{formatMoney(row.total_due)}</span> },
    { key: 'balance', label: t('cash_advances.balance'), render: (row) => <span className={row.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{formatMoney(row.balance)}</span> },
    { key: 'due_date', label: t('cash_advances.due_date'), render: (row) => formatDate(row.due_date) },
    { key: 'status', label: t('cash_advances.status'), render: (row) => statusBadge(row.status) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
          {row.status !== 'paid' && hasPermission('cash_advances.edit') && (
            <button onClick={() => setShowPayment(row)} className="p-1.5 text-gray-400 hover:text-green-600" title="Ajouter paiement"><DollarSign className="w-4 h-4" /></button>
          )}
          {hasPermission('cash_advances.delete') && (
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title={t('common.delete')}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('cash_advances.title')}</h1>
        {hasPermission('cash_advances.create') && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />{t('cash_advances.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('cash_advances.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('cash_advances.all_statuses')}</option>
              <option value="pending">En cours</option>
              <option value="partial">Partiel</option>
              <option value="paid">Payé</option>
              <option value="overdue">En retard</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={advances} filename="avances" />
            </div>
            <Table columns={columns} data={advances} emptyMessage={t('cash_advances.no_advances')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <CashAdvanceFormModal data={editData} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchAdvances(); }} />}
      {showDetail && <CashAdvanceDetailModal advance={showDetail} onClose={() => setShowDetail(null)} onWhatsApp={setWhatsappModal} />}
      {showPayment && <AddPaymentModal advance={showPayment} onClose={() => setShowPayment(null)} onSaved={() => { setShowPayment(null); fetchAdvances(); }} />}
      {whatsappModal && (
        <WhatsAppSendModal
          phone={whatsappModal.phone}
          onClose={() => setWhatsappModal(null)}
          onSend={async (phone) => {
            try {
              const blob = await whatsappModal.getBlob();
              await sendViaWhatsApp(blob, whatsappModal.fileName, phone);
            } catch {
              toast.error(t('common.error'));
            } finally {
              setWhatsappModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

function CashAdvanceFormModal({ data, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: data?.client_id || '', supplier_reference: data?.supplier_reference || '',
    amount: data?.amount || '', interest_rate: data?.interest_rate || '0',
    commission_rate: data?.commission_rate || '0',
    issue_date: data?.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: data?.due_date?.split('T')[0] || '',
    notes: data?.notes || ''
  });

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } }).then(({ data }) => setClients(data.data)).catch(console.error);
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (data?.id) await api.put(`/cash-advances/${data.id}`, form);
      else await api.post('/cash-advances', form);
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('cash_advances.edit') : t('cash_advances.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SearchableSelect
          label={t('cash_advances.client')}
          value={form.client_id}
          onChange={set('client_id')}
          options={clients.map(c => ({ value: c.id, label: c.name }))}
          error={errors.client_id?.[0]}
          placeholder={t('common.select')}
        />
        <Input label={t('cash_advances.supplier_reference')} value={form.supplier_reference} onChange={set('supplier_reference')} error={errors.supplier_reference?.[0]} required />
        <Input label={t('cash_advances.amount')} type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount?.[0]} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date d'émission" type="date" value={form.issue_date} onChange={set('issue_date')} error={errors.issue_date?.[0]} required />
          <Input label={t('cash_advances.due_date')} type="date" value={form.due_date} onChange={set('due_date')} error={errors.due_date?.[0]} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('cash_advances.interest_rate')} type="number" step="0.01" value={form.interest_rate} onChange={set('interest_rate')} />
          <Input label={t('cash_advances.commission_rate')} type="number" step="0.01" value={form.commission_rate} onChange={set('commission_rate')} />
        </div>
        {Number(form.amount) > 0 && (() => {
          const amt = Number(form.amount) || 0;
          const intAmt = amt * (Number(form.interest_rate) || 0) / 100;
          const comAmt = amt * (Number(form.commission_rate) || 0) / 100;
          const total = amt + intAmt + comAmt;
          return (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
              <p className="text-xs font-semibold text-blue-800 uppercase mb-2">{t('cash_advances.summary_preview')}</p>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('cash_advances.amount_given')}</span><span>{formatMoney(amt)}</span></div>
              {intAmt > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">{t('cash_advances.interest_amount')} ({form.interest_rate}%)</span><span>{formatMoney(intAmt)}</span></div>}
              {comAmt > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">{t('cash_advances.commission_amount')} ({form.commission_rate}%)</span><span>{formatMoney(comAmt)}</span></div>}
              <div className="flex justify-between text-sm font-bold border-t border-blue-300 pt-1 mt-1"><span>{t('cash_advances.total_to_repay')}</span><span className="text-blue-800">{formatMoney(total)}</span></div>
            </div>
          );
        })()}
        <Textarea label={t('common.notes')} value={form.notes} onChange={set('notes')} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{data ? t('common.save') : t('cash_advances.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CashAdvanceDetailModal({ advance: initialAdvance, onClose, onWhatsApp }) {
  const { t } = useTranslation();
  const [advance, setAdvance] = useState(initialAdvance);
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
  const row = (l, v) => <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">{l}</span><span className="text-sm font-medium">{v}</span></div>;
  const methodLabels = { cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Virement', check: 'Chèque', other: 'Autre' };

  useEffect(() => {
    api.get(`/cash-advances/${initialAdvance.id}`)
      .then(({ data }) => setAdvance(data.data || data))
      .catch(console.error);
  }, [initialAdvance.id]);

  return (
    <Modal isOpen onClose={onClose} title={advance.reference} size="lg">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => exportCashAdvanceInvoice(advance, t)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Printer className="w-4 h-4" />{t('cash_advances.print_invoice')}
          </button>
          <button
            onClick={() => onWhatsApp({
              phone: advance.client?.phone || '',
              fileName: `avance-${advance.reference}.pdf`,
              getBlob: async () => exportCashAdvanceInvoice(advance, t, { returnBlob: true }),
            })}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
            title="Envoyer via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />WhatsApp
          </button>
        </div>
        <div className="space-y-1">
          {row(t('cash_advances.client'), advance.client?.name)}
          {row(t('cash_advances.supplier_reference'), advance.supplier_reference)}
          {row(t('cash_advances.amount_given'), formatMoney(advance.amount))}
          {(() => {
            const intAmt = Number(advance.amount) * Number(advance.interest_rate) / 100;
            const comAmt = Number(advance.amount) * Number(advance.commission_rate) / 100;
            return (
              <>
                {Number(advance.interest_rate) > 0 && row(t('cash_advances.interest_amount') + ` (${advance.interest_rate}%)`, formatMoney(intAmt))}
                {Number(advance.commission_rate) > 0 && row(t('cash_advances.commission_amount') + ` (${advance.commission_rate}%)`, formatMoney(comAmt))}
              </>
            );
          })()}
          {row(t('cash_advances.total_to_repay'), <span className="font-bold text-primary-700">{formatMoney(advance.total_due)}</span>)}
          {row(t('cash_advances.paid'), formatMoney(advance.total_paid))}
          {row(t('cash_advances.balance'), <span className={Number(advance.balance) > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatMoney(advance.balance)}</span>)}
          {row(t('cash_advances.issue_date'), formatDate(advance.issue_date))}
          {row(t('cash_advances.due_date'), formatDate(advance.due_date))}
        </div>
        {(advance.advance_payments || advance.payments || []).length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">{t('cash_advances.payments_history')}</h4>
            <div className="border rounded-lg divide-y">
              {(advance.advance_payments || advance.payments || []).map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm">{formatDate(p.payment_date)}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{methodLabels[p.method] || p.method}</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{formatMoney(p.amount)}</span>
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 mt-1">{p.notes}</p>}
                  {p.evidence_path && (
                    <button
                      onClick={async () => {
                        const res = await api.get(`/cash-advance-payments/${p.id}/evidence`, { responseType: 'blob' });
                        const url = URL.createObjectURL(res.data);
                        window.open(url);
                      }}
                      className="mt-1 text-xs text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />Voir la preuve
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddPaymentModal({ advance, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [form, setForm] = useState({
    amount: '', method: 'cash',
    payment_date: new Date().toISOString().split('T')[0], notes: ''
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => { if (val !== '' && val !== null) formData.append(key, val); });
      if (evidenceFile) formData.append('evidence', evidenceFile);
      await api.post(`/cash-advances/${advance.id}/payments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('cash_advances.add_payment')}>
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">{t('cash_advances.balance')}: <span className="font-bold text-red-600">{formatMoney(advance.balance)}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('cash_advances.payment_amount')} type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount?.[0]} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Mode de paiement" value={form.method} onChange={set('method')} error={errors.method?.[0]}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement</option>
            <option value="check">Chèque</option>
          </Select>
          <Input label={t('payments.date')} type="date" value={form.payment_date} onChange={set('payment_date')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preuve / Justificatif (optionnel)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setEvidenceFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          <p className="mt-1 text-xs text-gray-400">Image ou PDF, max 10 Mo</p>
        </div>
        <Input label={t('common.notes')} value={form.notes} onChange={set('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{t('cash_advances.add_payment')}</Button>
        </div>
      </form>
    </Modal>
  );
}
