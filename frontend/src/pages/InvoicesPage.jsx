import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal } from '../components/ui';
import { Plus, Search, Download, FileText, Eye, MessageCircle, Trash2 } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { sendViaWhatsApp } from '../utils/export';
import ExportButtons from '../components/ui/ExportButtons';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { hasPermission, hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('manager');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/invoices', { params })
      .then(({ data }) => { setInvoices(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const handleWhatsAppSend = async (phone) => {
    if (!whatsappModal) return;
    try {
      const blob = await whatsappModal.getBlob();
      await sendViaWhatsApp(blob, whatsappModal.fileName, phone);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setWhatsappModal(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await api.delete(`/invoices/${id}`);
      if (showDetail?.id === id) setShowDetail(null);
      fetchInvoices();
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };

  const statusBadge = (status) => {
    const map = { draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', cancelled: 'red' };
    const labels = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' };
    return <Badge variant={map[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const columns = [
    { key: 'invoice_number', label: t('invoices.number'), render: (row) => <span className="font-mono text-sm font-medium">{row.invoice_number}</span> },
    { key: 'client', label: t('invoices.client'), render: (row) => row.client?.name || '-' },
    { key: 'total', label: t('invoices.total'), render: (row) => <span className="font-medium">{formatMoney(row.total)}</span> },
    { key: 'amount_paid', label: t('invoices.paid'), render: (row) => <span className="text-green-600">{formatMoney(row.amount_paid)}</span> },
    { key: 'balance', label: t('invoices.balance'), render: (row) => {
      const bal = (row.total || 0) - (row.amount_paid || 0);
      return <span className={bal > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{formatMoney(bal)}</span>;
    }},
    { key: 'date', label: t('invoices.date'), render: (row) => formatDate(row.issue_date) },
    { key: 'due_date', label: t('invoices.due_date'), render: (row) => formatDate(row.due_date) },
    { key: 'status', label: t('invoices.status'), render: (row) => statusBadge(row.status) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
          <button onClick={() => handleDownload(row.id)} className="p-1.5 text-gray-400 hover:text-green-600" title={t('common.download')}><Download className="w-4 h-4" /></button>
          <button
            onClick={() => setWhatsappModal({
              phone: row.client?.phone || '',
              fileName: `facture-${row.id}.pdf`,
              getBlob: async () => { const r = await api.get(`/invoices/${row.id}/pdf`, { responseType: 'blob' }); return r.data; },
            })}
            className="p-1.5 text-gray-400 hover:text-green-500"
            title="Envoyer via WhatsApp"
          ><MessageCircle className="w-4 h-4" /></button>
          {isManager && (
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600" title={t('common.delete')}>
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
        <h1 className="text-2xl font-bold text-gray-900">{t('invoices.title')}</h1>
        {hasPermission('invoices.create') && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />{t('invoices.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('invoices.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('invoices.all_statuses')}</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={invoices} filename="factures" />
            </div>
            <Table columns={columns} data={invoices} emptyMessage={t('invoices.no_invoices')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <InvoiceFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchInvoices(); }} />}
      {showDetail && (
        <InvoiceDetailModal
          invoice={showDetail}
          onClose={() => setShowDetail(null)}
          onDownload={handleDownload}
          onWhatsApp={(invoice) => setWhatsappModal({
            phone: invoice.client?.phone || '',
            fileName: `facture-${invoice.id}.pdf`,
            getBlob: async () => { const r = await api.get(`/invoices/${invoice.id}/pdf`, { responseType: 'blob' }); return r.data; },
          })}
        />
      )}
      {whatsappModal && <WhatsAppSendModal phone={whatsappModal.phone} onClose={() => setWhatsappModal(null)} onSend={handleWhatsAppSend} />}
    </div>
  );
}

function InvoiceFormModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState('');

  useEffect(() => {
    api.get('/shipments', { params: { per_page: 100 } }).then(({ data }) => setShipments(data.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setLoading(true);
    setErrors({});
    try {
      await api.post(`/invoices/from-shipment/${selectedShipment}`);
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('invoices.generate')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label={t('invoices.select_shipment')} value={selectedShipment} onChange={(e) => setSelectedShipment(e.target.value)} error={errors.shipment_id?.[0]} required>
          <option value="">{t('common.select')}</option>
          {shipments.map((s) => <option key={s.id} value={s.id}>{s.tracking_number} - {s.client?.name}</option>)}
        </Select>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}><FileText className="w-4 h-4 mr-2" />{t('invoices.generate')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailModal({ invoice, onClose, onDownload, onWhatsApp }) {
  const { t } = useTranslation();
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  return (
    <Modal isOpen onClose={onClose} title={`Facture ${invoice.invoice_number}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Client:</span> <span className="font-medium">{invoice.client?.name}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(invoice.issue_date)}</span></div>
          <div><span className="text-gray-500">Échéance:</span> <span className="font-medium">{formatDate(invoice.due_date)}</span></div>
          <div><span className="text-gray-500">Statut:</span> <span className="font-medium">{invoice.status}</span></div>
        </div>

        {invoice.items && invoice.items.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Qté</th>
                  <th className="px-4 py-2 text-right">Prix</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(item.unit_price)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right">{formatMoney(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <button
            onClick={() => onWhatsApp(invoice)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg font-medium"
            title="Envoyer via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />WhatsApp
          </button>
          <Button onClick={() => onDownload(invoice.id)}><Download className="w-4 h-4 mr-2" />{t('invoices.download')}</Button>
        </div>
      </div>
    </Modal>
  );
}
