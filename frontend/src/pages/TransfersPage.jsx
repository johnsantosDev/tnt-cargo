import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Card, CardHeader, CardBody, Spinner, Badge, Pagination, Modal } from '../components/ui';
import { ArrowRightLeft, Plus, Search, Check, X, Download, Eye, Upload, FileText, CheckCircle, MessageCircle, Trash2 } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { sendViaWhatsApp } from '../utils/export';
import toast from 'react-hot-toast';

const REGIONS = ['Goma', 'Beni', 'Butembo', 'Lubumbashi', 'Kolwezi', 'Kinshasa', 'Bukavu', 'China', 'Dubai'];

const STATUS_COLORS = {
  pending_approval: 'yellow',
  approved: 'blue',
  rejected: 'red',
  completed: 'green',
  cancelled: 'gray',
};

export default function TransfersPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('manager');

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showComplete, setShowComplete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(null);

  // Client search
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);

  const [form, setForm] = useState({
    client_id: '', client_name: '', client_phone: '', amount: '', currency: 'USD',
    transfer_fee: '50', origin_region: '', destination_region: '', notes: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');

  // Fetch clients for searchable dropdown
  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } })
      .then(({ data }) => setClients(data.data || []))
      .catch(console.error);
  }, []);

  // Close client dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredClients = clients.filter((c) =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 20);

  const selectClient = (client) => {
    setForm({ ...form, client_id: client.id, client_name: client.name, client_phone: client.phone || '' });
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const fetchTransfers = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/transfers', { params })
      .then(({ data }) => {
        setTransfers(data.data || []);
        setMeta(data.meta || data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransfers();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (docFile) formData.append('document', docFile);
      await api.post('/transfers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowCreate(false);
      setForm({ client_id: '', client_name: '', client_phone: '', amount: '', currency: 'USD', transfer_fee: '50', origin_region: '', destination_region: '', notes: '' });
      setDocFile(null);
      setClientSearch('');
      fetchTransfers();
      toast.success(t('transfers.created_success'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === 'complete') {
      setShowComplete(transfers.find((t) => t.id === id) || { id });
      setCompleteNotes('');
      return;
    }
    const confirmMsg = t(`transfers.confirm_${action}`);
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.post(`/transfers/${id}/${action}`);
      fetchTransfers();
      if (showDetail?.id === id) {
        const { data } = await api.get(`/transfers/${id}`);
        setShowDetail(data.data || data);
      }
      toast.success(t(`transfers.${action}ed_success`) || t('common.success'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleComplete = async () => {
    if (!showComplete) return;
    setSaving(true);
    try {
      await api.post(`/transfers/${showComplete.id}/complete`, { notes: completeNotes || undefined });
      setShowComplete(null);
      setCompleteNotes('');
      fetchTransfers();
      if (showDetail?.id === showComplete.id) {
        const { data } = await api.get(`/transfers/${showComplete.id}`);
        setShowDetail(data.data || data);
      }
      toast.success(t('transfers.completed_success'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await api.delete(`/transfers/${id}`);
      if (showDetail?.id === id) {
        setShowDetail(null);
      }
      fetchTransfers();
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };

  const downloadReceipt = async (id) => {
    try {
      const { data } = await api.get(`/transfers/${id}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `transfer-receipt-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const downloadCompletion = async (id) => {
    try {
      const { data } = await api.get(`/transfers/${id}/completion-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `transfer-completion-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatMoney = (v, cur = 'USD') => `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${cur}`;

  const openWhatsAppModal = (payload) => setWhatsappModal(payload);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('transfers.title')}</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> {t('transfers.create')}
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('transfers.search_placeholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
              <option value="">{t('transfers.all_statuses')}</option>
              <option value="pending_approval">{t('transfers.status_pending')}</option>
              <option value="approved">{t('transfers.status_approved')}</option>
              <option value="completed">{t('transfers.status_completed')}</option>
              <option value="rejected">{t('transfers.status_rejected')}</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* List */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">{t('transfers.no_transfers')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('transfers.reference')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('transfers.client_name')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('transfers.amount')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('transfers.destination_region')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('transfers.status')}</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800">{tr.reference}</td>
                      <td className="px-5 py-3 text-gray-600">{tr.client_name || tr.client?.name}</td>
                      <td className="px-5 py-3 text-gray-800 font-medium">{formatMoney(tr.amount, tr.currency)}</td>
                      <td className="px-5 py-3 text-gray-600">{tr.destination_region}</td>
                      <td className="px-5 py-3">
                        <Badge color={STATUS_COLORS[tr.status] || 'gray'}>{t(`transfers.status_${tr.status === 'pending_approval' ? 'pending' : tr.status}`)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setShowDetail(tr)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" title={t('common.view')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => downloadReceipt(tr.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title={t('transfers.receipt')}>
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openWhatsAppModal({
                              phone: tr.client_phone || tr.client?.phone || '',
                              fileName: `transfer-receipt-${tr.id}.pdf`,
                              getBlob: async () => { const r = await api.get(`/transfers/${tr.id}/receipt`, { responseType: 'blob' }); return r.data; },
                            })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50"
                            title="Envoyer via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {isManager && tr.status === 'pending_approval' && (
                            <>
                              <button onClick={() => handleAction(tr.id, 'approve')} className="p-1.5 rounded-lg text-green-500 hover:text-green-700 hover:bg-green-50" title={t('transfers.approve')}>
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleAction(tr.id, 'reject')} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50" title={t('transfers.reject')}>
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {tr.status === 'approved' && (
                            <button onClick={() => handleAction(tr.id, 'complete')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors" title={t('transfers.complete')}>
                              <CheckCircle className="w-3.5 h-3.5" /> {t('transfers.complete') || 'Compléter'}
                            </button>
                          )}
                          {tr.status === 'completed' && (
                            <>
                              <button onClick={() => downloadCompletion(tr.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors" title={t('transfers.completion_doc')}>
                                <Download className="w-3.5 h-3.5" /> {t('transfers.completion_doc') || 'Accusé'}
                              </button>
                              <button
                                onClick={() => openWhatsAppModal({
                                  phone: tr.client_phone || tr.client?.phone || '',
                                  fileName: `transfer-completion-${tr.id}.pdf`,
                                  getBlob: async () => { const r = await api.get(`/transfers/${tr.id}/completion-pdf`, { responseType: 'blob' }); return r.data; },
                                })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors"
                                title="Envoyer via WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </button>
                            </>
                          )}
                          <button onClick={() => handleDelete(tr.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title={t('common.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      {/* Create Modal */}
      {showCreate && (
        <Modal isOpen title={t('transfers.create')} onClose={() => setShowCreate(false)} size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div ref={clientDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.client_name')}</label>
                <input
                  type="text"
                  required
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    setForm({ ...form, client_id: '', client_name: e.target.value, client_phone: '' });
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder={t('transfers.search_client_placeholder') || 'Rechercher un client...'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between items-center"
                      >
                        <span className="font-medium text-gray-800">{c.name}</span>
                        {c.phone && <span className="text-gray-400 text-xs">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.client_phone')}</label>
                <input type="text" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.amount')}</label>
                <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.currency')}</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.transfer_fee')} <span className="text-gray-400 font-normal text-xs">(par défaut $50)</span></label>
                <input type="number" step="0.01" min="0" value={form.transfer_fee} onChange={(e) => setForm({ ...form, transfer_fee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex items-end">
                <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <span className="text-gray-500 text-xs block">{t('transfers.total_charged')}</span>
                  <span className="font-bold text-gray-800">
                    {Number((parseFloat(form.amount) || 0) + (parseFloat(form.transfer_fee) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {form.currency}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.origin_region')}</label>
                <select required value={form.origin_region} onChange={(e) => setForm({ ...form, origin_region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">{t('common.select')}</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.destination_region')}</label>
                <select required value={form.destination_region} onChange={(e) => setForm({ ...form, destination_region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">{t('common.select')}</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.notes')}</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Upload className="w-4 h-4 inline mr-1" />
                {t('transfers.document') || 'Document (PDF, Image)'}
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDocFile(e.target.files[0] || null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {docFile && <p className="text-xs text-gray-500 mt-1"><FileText className="w-3 h-3 inline mr-1" />{docFile.name}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal isOpen title={`${t('transfers.reference')}: ${showDetail.reference}`} onClose={() => setShowDetail(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">{t('transfers.transfer_code')}:</span> <span className="font-medium">{showDetail.transfer_code}</span></div>
              <div><span className="text-gray-500">{t('transfers.status')}:</span> <Badge color={STATUS_COLORS[showDetail.status] || 'gray'}>{t(`transfers.status_${showDetail.status === 'pending_approval' ? 'pending' : showDetail.status}`)}</Badge></div>
              <div><span className="text-gray-500">{t('transfers.client_name')}:</span> <span className="font-medium">{showDetail.client_name || showDetail.client?.name}</span></div>
              <div><span className="text-gray-500">{t('transfers.client_phone')}:</span> <span className="font-medium">{showDetail.client_phone}</span></div>
              <div><span className="text-gray-500">{t('transfers.amount')}:</span> <span className="font-bold">{formatMoney(showDetail.amount, showDetail.currency)}</span></div>
              {showDetail.transfer_fee > 0 && (
                <div><span className="text-gray-500">{t('transfers.transfer_fee')}:</span> <span className="font-medium text-amber-700">{formatMoney(showDetail.transfer_fee, showDetail.currency)}</span></div>
              )}
              {showDetail.transfer_fee > 0 && (
                <div><span className="text-gray-500">{t('transfers.total_charged')}:</span> <span className="font-bold text-gray-900">{formatMoney((parseFloat(showDetail.amount) || 0) + (parseFloat(showDetail.transfer_fee) || 0), showDetail.currency)}</span></div>
              )}
              <div><span className="text-gray-500">{t('transfers.origin_region')}:</span> <span className="font-medium">{showDetail.origin_region}</span></div>
              <div><span className="text-gray-500">{t('transfers.destination_region')}:</span> <span className="font-medium">{showDetail.destination_region}</span></div>
              <div><span className="text-gray-500">{t('transfers.created_at')}:</span> <span className="font-medium">{new Date(showDetail.created_at).toLocaleDateString()}</span></div>
              {showDetail.approver && (
                <div><span className="text-gray-500">{t('transfers.approved_by')}:</span> <span className="font-medium">{showDetail.approver.name}</span></div>
              )}
              {showDetail.completer && (
                <div><span className="text-gray-500">{t('transfers.completed_by')}:</span> <span className="font-medium">{showDetail.completer.name}</span></div>
              )}
            </div>
            {showDetail.notes && (
              <div className="text-sm"><span className="text-gray-500">{t('transfers.notes')}:</span> <p className="mt-1 text-gray-700">{showDetail.notes}</p></div>
            )}
            {showDetail.document_path && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">{t('transfers.document_attached')}</span>
                <button onClick={async () => {
                  try {
                    const { data } = await api.get(`/transfers/${showDetail.id}/document`, { responseType: 'blob' });
                    const url = URL.createObjectURL(data);
                    const a = window.document.createElement('a'); a.href = url; a.download = `transfer-doc-${showDetail.reference}`; a.click(); URL.revokeObjectURL(url);
                  } catch { toast.error(t('common.error')); }
                }} className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium underline">
                  {t('common.download')}
                </button>
                <button
                  onClick={() => openWhatsAppModal({
                    phone: showDetail.client_phone || showDetail.client?.phone || '',
                    fileName: `transfer-doc-${showDetail.reference}`,
                    getBlob: async () => { const r = await api.get(`/transfers/${showDetail.id}/document`, { responseType: 'blob' }); return r.data; },
                  })}
                  className="text-green-600 hover:text-green-700 text-xs font-medium underline"
                >
                  WhatsApp
                </button>
              </div>
            )}

            {/* Signed Document Upload - Only for completed transfers */}
            {showDetail.status === 'completed' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-800 text-sm">{t('transfers.upload_signed')}</span>
                </div>
                <p className="text-xs text-amber-700">{t('transfers.upload_signed_desc')}</p>
                {showDetail.signed_document_path ? (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-800 font-medium">{t('transfers.signed_uploaded')}</span>
                    <button onClick={async () => {
                      try {
                        const { data } = await api.get(`/transfers/${showDetail.id}/signed-document`, { responseType: 'blob' });
                        const url = URL.createObjectURL(data);
                        const a = window.document.createElement('a'); a.href = url; a.download = `signed-completion-${showDetail.reference}`; a.click(); URL.revokeObjectURL(url);
                      } catch { toast.error(t('common.error')); }
                    }} className="ml-auto text-green-600 hover:text-green-800 text-xs font-medium underline">
                      {t('transfers.download_signed')}
                    </button>
                    <button
                      onClick={() => openWhatsAppModal({
                        phone: showDetail.client_phone || showDetail.client?.phone || '',
                        fileName: `signed-completion-${showDetail.reference}`,
                        getBlob: async () => { const r = await api.get(`/transfers/${showDetail.id}/signed-document`, { responseType: 'blob' }); return r.data; },
                      })}
                      className="text-green-600 hover:text-green-700 text-xs font-medium underline"
                    >
                      WhatsApp
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const fd = new FormData();
                        fd.append('signed_document', file);
                        const { data } = await api.post(`/transfers/${showDetail.id}/signed-document`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                        setShowDetail(data.transfer || { ...showDetail, signed_document_path: true });
                        fetchTransfers();
                        toast.success(t('transfers.signed_upload_success'));
                      } catch (err) {
                        toast.error(err.response?.data?.message || t('common.error'));
                      }
                    }}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t">
              <button onClick={() => downloadReceipt(showDetail.id)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200">
                <Download className="w-4 h-4" /> {t('transfers.receipt')}
              </button>
              <button
                onClick={() => openWhatsAppModal({
                  phone: showDetail.client_phone || showDetail.client?.phone || '',
                  fileName: `transfer-receipt-${showDetail.id}.pdf`,
                  getBlob: async () => { const r = await api.get(`/transfers/${showDetail.id}/receipt`, { responseType: 'blob' }); return r.data; },
                })}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              {showDetail.status === 'approved' && (
                <button onClick={() => { setShowDetail(null); handleAction(showDetail.id, 'complete'); }} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium">
                  <CheckCircle className="w-4 h-4" /> {t('transfers.complete')}
                </button>
              )}
              {showDetail.status === 'completed' && (
                <>
                  <button onClick={() => downloadCompletion(showDetail.id)} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg border border-green-200">
                    <Download className="w-4 h-4" /> {t('transfers.completion_doc')}
                  </button>
                  <button
                    onClick={() => openWhatsAppModal({
                      phone: showDetail.client_phone || showDetail.client?.phone || '',
                      fileName: `transfer-completion-${showDetail.id}.pdf`,
                      getBlob: async () => { const r = await api.get(`/transfers/${showDetail.id}/completion-pdf`, { responseType: 'blob' }); return r.data; },
                    })}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Transfer Modal */}
      {showComplete && (
        <Modal isOpen title={t('transfers.complete_transfer')} onClose={() => setShowComplete(null)}>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">{t('transfers.confirm_complete_title')}</span>
              </div>
              <p className="text-sm text-green-700">
                {t('transfers.confirm_complete_desc')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">{t('transfers.reference')}:</span> <span className="font-medium">{showComplete.reference}</span></div>
              <div><span className="text-gray-500">{t('transfers.amount')}:</span> <span className="font-bold">{formatMoney(showComplete.amount, showComplete.currency)}</span></div>
              {showComplete.transfer_fee > 0 && (
                <div><span className="text-gray-500">{t('transfers.transfer_fee')}:</span> <span className="font-medium text-amber-700">{formatMoney(showComplete.transfer_fee, showComplete.currency)}</span></div>
              )}
              <div><span className="text-gray-500">{t('transfers.client_name')}:</span> <span className="font-medium">{showComplete.client_name || showComplete.client?.name}</span></div>
              <div><span className="text-gray-500">{t('transfers.destination_region')}:</span> <span className="font-medium">{showComplete.destination_region}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.completion_notes')}</label>
              <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3}
                placeholder={t('transfers.completion_notes_placeholder')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowComplete(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('common.cancel')}</button>
              <button type="button" onClick={handleComplete} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> {saving ? t('common.loading') : t('transfers.confirm_complete_btn')}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
