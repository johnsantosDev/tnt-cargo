import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Spinner, Modal, Select, Textarea, Input } from '../components/ui';
import { ArrowLeft, Upload, FileText, Trash2, CheckCircle, Clock, Download, MapPin, Share2, Copy, MessageCircle, Mail, Link2, Image as ImageIcon, Eye, X, Box, DollarSign } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { sendViaWhatsApp } from '../utils/export';
import toast from 'react-hot-toast';

export default function ShipmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status_id: '', comment: '', location: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadName, setUploadName] = useState('');
  const [docUrls, setDocUrls] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const [packingLists, setPackingLists] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [completing, setCompleting] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get(`/shipments/${id}`).then(({ data }) => setShipment(data.data || data)).catch(console.error).finally(() => setLoading(false));
  };

  const loadDocUrl = useCallback(async (doc) => {
    if (docUrls[doc.id]) return;
    try {
      const res = await api.get(`/shipments/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setDocUrls(prev => ({ ...prev, [doc.id]: url }));
    } catch (e) { console.error(e); }
  }, [docUrls]);

  useEffect(() => {
    if (shipment?.documents) {
      shipment.documents.forEach(d => {
        if (d.file_type?.startsWith('image/')) loadDocUrl(d);
      });
    }
  }, [shipment?.documents]);

  useEffect(() => {
    return () => { Object.values(docUrls).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    fetch();
    api.get('/shipment-statuses').then(({ data }) => setStatuses(data.data || data)).catch(console.error);
    api.get(`/shipments/${id}/packing-lists`).then(({ data }) => setPackingLists(data)).catch(console.error);
  }, [id]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const openWhatsAppModal = (payload) => setWhatsappModal(payload);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/shipments/${id}/status`, statusForm);
      setShowStatusModal(false);
      fetch();
      toast.success(t('common.saved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleCompleteShipment = async () => {
    setCompleting(true);
    try {
      await api.post(`/shipments/${id}/complete`, { completion_note: completionNote });
      setShowCompleteModal(false);
      setCompletionNote('');
      fetch();
      toast.success(t('shipment_completion.completed'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setCompleting(false);
    }
  };

  const downloadCompletionPdf = async () => {
    try {
      const { data } = await api.get(`/shipments/${id}/completion-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `shipment-completion-${shipment.tracking_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t('common.error'));
    }
  };


  if (loading) return <Spinner />;
  if (!shipment) return null;

  const infoRow = (label, value) => (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/shipments')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{shipment.tracking_number}</h1>
          <p className="text-sm text-gray-500">{shipment.client?.name}{shipment.container_code ? ` — ${shipment.container_code}` : ''}</p>
        </div>
        <StatusBadge status={shipment.status?.slug} />
        {hasPermission('shipments.edit') && (
          <Button onClick={() => { setStatusForm({ status_id: shipment.status_id, comment: '', location: '' }); setShowStatusModal(true); }} variant="secondary">
            {t('shipments.update_status')}
          </Button>
        )}
        {hasPermission('shipments.edit') && shipment.status?.slug !== 'delivered' && (
          <Button onClick={() => setShowCompleteModal(true)} variant="primary">
            <CheckCircle className="w-4 h-4 mr-1" /> {t('shipment_completion.complete')}
          </Button>
        )}
        {shipment.completed_at && (
          <div className="flex items-center gap-2">
            <Button onClick={downloadCompletionPdf} variant="secondary">
              <Download className="w-4 h-4 mr-1" /> {t('shipment_completion.download_doc')}
            </Button>
            <button
              onClick={() => openWhatsAppModal({
                phone: shipment.client?.phone || '',
                fileName: `shipment-completion-${shipment.tracking_number}.pdf`,
                getBlob: async () => { const r = await api.get(`/shipments/${id}/completion-pdf`, { responseType: 'blob' }); return r.data; },
              })}
              className="inline-flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              title="Envoyer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader><h3 className="font-semibold">{t('shipments.timeline')}</h3></CardHeader>
        <CardBody>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {statuses.map((s, i) => {
              const isCurrent = shipment.status?.id === s.id;
              const isPast = statuses.findIndex((ss) => ss.id === shipment.status?.id) >= i;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm ${isCurrent ? 'bg-primary-100 text-primary-800 font-semibold' : isPast ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                    {isPast ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {s.name}
                  </div>
                  {i < statuses.length - 1 && <div className={`w-8 h-0.5 mx-1 ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Share Link */}
      {shipment.share_token && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary-600" />
              {t('shipments.share_tracking')}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <Link2 className="w-5 h-5 text-gray-400 shrink-0" />
              <code className="flex-1 text-sm text-gray-700 break-all select-all">{`${window.location.origin}/t/${shipment.share_token}`}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/t/${shipment.share_token}`); }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title={t('shipments.copy_link')}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const phone = shipment.client?.phone?.replace(/[^0-9]/g, '') || '';
                  const clientName = shipment.client?.name || '';
                  const msg = encodeURIComponent(`Bonjour ${clientName}, ${t('shipments.share_message')}\n${window.location.origin}/t/${shipment.share_token}\n— TNT Cargo`);
                  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  const email = shipment.client?.email || '';
                  const clientName = shipment.client?.name || '';
                  const subject = encodeURIComponent(`TNT Cargo — ${t('shipments.share_subject')} ${shipment.tracking_number}`);
                  const body = encodeURIComponent(`Bonjour ${clientName},\n\n${t('shipments.share_message')}\n${window.location.origin}/t/${shipment.share_token}\n\nCordialement,\nTNT Cargo`);
                  window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Details */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t('shipments.details')}</h3></CardHeader>
          <CardBody>
            {infoRow(t('shipments.container_code'), shipment.container_code || '-')}
            {infoRow(t('shipments.origin'), shipment.origin)}
            {infoRow(t('shipments.description'), shipment.description)}
            {infoRow(t('shipments.weight'), shipment.weight ? `${shipment.weight} kg` : '-')}
            {infoRow(t('shipments.cbm'), shipment.volume ? `${shipment.volume} m³` : '-')}
            {infoRow(t('shipments.warehouse_entry'), formatDate(shipment.warehouse_entry_date))}
            {infoRow(t('shipments.estimated_arrival'), formatDate(shipment.estimated_arrival))}
            {infoRow(t('shipments.actual_arrival'), formatDate(shipment.actual_arrival))}
          </CardBody>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('shipments.financials')}</h3>
              {shipment.balance_due > 0 && (
                <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                  <DollarSign className="w-3.5 h-3.5 mr-1" />{t('payments.record_payment')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {infoRow(t('shipments.shipping_cost'), formatMoney(shipment.shipping_cost))}
            {infoRow(t('shipments.customs_fee'), formatMoney(shipment.customs_fee))}
            {infoRow(t('shipments.warehouse_fee'), formatMoney(shipment.warehouse_fee))}
            {infoRow(t('shipments.other_fees'), formatMoney(shipment.other_fees))}
            {shipment.insurance_amount > 0 && infoRow(t('shipments.insurance_amount'), formatMoney(shipment.insurance_amount))}
            <div className="flex justify-between py-2 mt-2 border-t-2 border-gray-200">
              <span className="text-sm font-bold text-gray-700">{t('shipments.total_cost')}</span>
              <span className="text-sm font-bold text-gray-900">{formatMoney(shipment.total_cost)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-gray-700">{t('shipments.paid')}</span>
              <span className="text-sm font-bold text-green-600">{formatMoney(shipment.amount_paid)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-gray-700">{t('shipments.balance')}</span>
              <span className={`text-sm font-bold ${shipment.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(shipment.balance_due)}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* History - DHL Style Timeline */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            {t('shipments.history')}
          </h3>
        </CardHeader>
        <CardBody>
          {(!shipment.history || shipment.history.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('common.no_data')}</p>
          ) : (
            <div className="relative">
              {shipment.history.map((h, i) => {
                const isFirst = i === 0;
                const isLast = i === shipment.history.length - 1;
                const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={h.id} className="relative flex gap-4 pb-0">
                    {/* Vertical line + dot */}
                    <div className="flex flex-col items-center w-10 shrink-0">
                      <div className={`w-4 h-4 rounded-full border-2 z-10 shrink-0 ${
                        isFirst ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'
                      }`}>
                        {isFirst && <div className="w-1.5 h-1.5 bg-white rounded-full m-0.5 mx-auto mt-[3px]" />}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${isFirst ? 'bg-primary-300' : 'bg-gray-200'}`} />}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className={`rounded-xl p-4 ${isFirst ? 'bg-primary-50 border border-primary-100' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className={`font-semibold ${isFirst ? 'text-primary-800' : 'text-gray-800'}`}>
                              {h.status?.name || h.action}
                            </p>
                            {h.location && (
                              <p className={`text-sm mt-1 flex items-center gap-1 ${isFirst ? 'text-primary-600' : 'text-gray-500'}`}>
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {h.location}
                              </p>
                            )}
                            {h.comment && (
                              <p className="text-sm text-gray-500 mt-1">{h.comment}</p>
                            )}
                            {h.user && (
                              <p className="text-xs text-gray-400 mt-1">par {h.user.name}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-medium ${isFirst ? 'text-primary-600' : 'text-gray-500'}`}>
                              {formatDate(h.created_at)}
                            </p>
                            <p className={`text-xs ${isFirst ? 'text-primary-500' : 'text-gray-400'}`}>
                              {formatTime(h.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Packing Lists */}
      {packingLists.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold">{t('packing_list.title')}</h3>
            </div>
          </CardHeader>
          <CardBody>
            {packingLists.map((pl) => (
              <div key={pl.id} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-primary-700">{pl.reference}</span>
                    <Badge color={pl.status === 'draft' ? 'yellow' : pl.status === 'finalized' ? 'blue' : 'green'}>
                      {t(`packing_list.status_${pl.status}`)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('packing_list.total_cbm')}: <span className="font-mono font-medium">{Number(pl.total_cbm || 0).toFixed(4)} m³</span>
                    <span className="mx-2">|</span>
                    {t('packing_list.shipping_cost')}: <span className="font-medium text-blue-600">{formatMoney(pl.shipping_cost)}</span>
                  </div>
                </div>
                {pl.items && pl.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">{t('packing_list.description')}</th>
                          <th className="px-3 py-2 text-right">{t('packing_list.qty')}</th>
                          <th className="px-3 py-2 text-right">{t('packing_list.cbm')}</th>
                          <th className="px-3 py-2 text-right">{t('packing_list.weight')}</th>
                          <th className="px-3 py-2 text-right">{t('packing_list.unit_price')}</th>
                          <th className="px-3 py-2 text-right">{t('packing_list.total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pl.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono">{Number(item.cbm || 0).toFixed(4)}</td>
                            <td className="px-3 py-2 text-right">{item.weight ? `${item.weight} kg` : '-'}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatMoney(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                          <td colSpan="2" className="px-3 py-2 text-right">{t('packing_list.totals')}</td>
                          <td className="px-3 py-2 text-right font-mono">{Number(pl.total_cbm || 0).toFixed(4)}</td>
                          <td className="px-3 py-2 text-right">{Number(pl.total_weight || 0).toFixed(2)} kg</td>
                          <td className="px-3 py-2 text-right"></td>
                          <td className="px-3 py-2 text-right">{formatMoney(pl.total_amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Documents */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-semibold">{t('shipments.documents')}</h3>
          {hasPermission('shipments.edit') && (
            <Button size="sm" variant="secondary" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-1" />{t('shipments.upload_document')}
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {(!shipment.documents || shipment.documents.length === 0) ? (
            <div className="py-8 text-center text-sm text-gray-400">{t('shipments.no_documents')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shipment.documents.map((d) => {
                const isImage = d.file_type?.startsWith('image/');
                const blobUrl = docUrls[d.id];
                return (
                  <div key={d.id} className="border border-gray-200 rounded-xl overflow-hidden group">
                    {isImage ? (
                      <div className="relative h-40 bg-gray-100">
                        {blobUrl ? (
                          <img src={blobUrl} alt={d.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => setPreviewDoc(d)} className="p-2 bg-white rounded-full shadow-lg">
                            <Eye className="w-5 h-5 text-gray-700" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 bg-gray-50 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(d.created_at)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={async () => {
                            const res = await api.get(`/shipments/documents/${d.id}/download`, { responseType: 'blob' });
                            const url = URL.createObjectURL(res.data);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = d.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openWhatsAppModal({
                            phone: shipment.client?.phone || '',
                            fileName: d.name,
                            getBlob: async () => { const r = await api.get(`/shipments/documents/${d.id}/download`, { responseType: 'blob' }); return r.data; },
                          })}
                          className="p-1.5 text-gray-400 hover:text-green-600"
                          title="Envoyer via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {hasPermission('shipments.edit') && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(t('common.confirm_delete'))) return;
                              try {
                                await api.delete(`/shipments/documents/${d.id}`);
                                fetch();
                                toast.success(t('common.deleted'));
                              } catch { toast.error(t('common.error')); }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-w-4xl max-h-[90vh] z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewDoc(null)} className="absolute -top-3 -right-3 z-20 p-2 bg-white rounded-full shadow-lg text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
            {docUrls[previewDoc.id] ? (
              <img src={docUrls[previewDoc.id]} alt={previewDoc.name} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            ) : (
              <div className="bg-white rounded-xl p-20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title={t('shipments.update_status')}>
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <Select label={t('shipments.status')} value={statusForm.status_id} onChange={(e) => setStatusForm((p) => ({ ...p, status_id: e.target.value }))}>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label={t('shipments.location')} value={statusForm.location} onChange={(e) => setStatusForm((p) => ({ ...p, location: e.target.value }))} placeholder={t('shipments.location_placeholder')} />
          <Textarea label={t('common.notes')} value={statusForm.comment} onChange={(e) => setStatusForm((p) => ({ ...p, comment: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowStatusModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal - Multi-file with Preview */}
      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); setUploadFiles([]); }} title={t('shipments.upload_document')}>
        <div className="space-y-4">
          <Input label={t('shipments.document_name')} value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder={t('shipments.document_name_optional')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shipments.files')}</label>

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
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => document.getElementById('multi-file-input').click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('shipments.drop_files')}</p>
              <input
                id="multi-file-input"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => setUploadFiles(prev => [...prev, ...Array.from(e.target.files)])}
              />
            </div>
          </div>
          {uploadFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {uploadFiles.map((file, i) => (
                <div key={i} className="relative border rounded-lg p-2 flex items-center gap-2">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-12 h-12 rounded object-cover shrink-0" />
                  ) : (
                    <FileText className="w-12 h-12 text-gray-300 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setShowUploadModal(false); setUploadFiles([]); }}>{t('common.cancel')}</Button>
            <Button
              loading={uploading}
              disabled={uploadFiles.length === 0}
              onClick={async () => {
                setUploading(true);
                const formData = new FormData();
                uploadFiles.forEach(f => formData.append('documents[]', f));
                if (uploadName) formData.append('name', uploadName);
                try {
                  await api.post(`/shipments/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setUploadName('');
                  fetch();
                  toast.success(t('common.saved'));
                } catch (err) { toast.error(t('common.error')); }
                finally { setUploading(false); }
              }}
            >
              {t('common.upload')} ({uploadFiles.length})
            </Button>
          </div>
        </div>
      </Modal>

      {showPaymentModal && shipment && (
        <RecordPaymentModal
          shipment={shipment}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => { setShowPaymentModal(false); fetch(); }}
        />
      )}

      {showCompleteModal && (
        <Modal isOpen title={t('shipment_completion.complete')} onClose={() => setShowCompleteModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{t('shipment_completion.warning')}</p>
            <Textarea
              label={t('shipment_completion.completion_note')}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCompleteShipment} disabled={completing}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {completing ? t('common.loading') : t('shipment_completion.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Record Payment Modal (inline, pre-filled with shipment data) ---
function RecordPaymentModal({ shipment, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    client_id: shipment.client_id || '',
    shipment_id: shipment.id,
    amount: '',
    method: 'cash',
    type: 'income',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
    bank_reference: '',
  });

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => { if (val !== '' && val !== null) formData.append(key, val); });
      if (proofFile) formData.append('proof', proofFile);
      await api.post('/payments', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('payments.record_payment')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Shipment summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">{t('shipments.tracking')}:</span> <span className="font-mono font-medium">{shipment.tracking_number}</span></div>
            <div><span className="text-gray-500">{t('payments.client')}:</span> <span className="font-medium">{shipment.client?.name}</span></div>
            <div><span className="text-gray-500">{t('shipments.total_cost')}:</span> <span className="font-medium">{formatMoney(shipment.total_cost)}</span></div>
            <div><span className="text-gray-500">{t('shipments.balance')}:</span> <span className="font-bold text-red-600">{formatMoney(shipment.balance_due)}</span></div>
          </div>
        </div>

        <Input
          label={t('payments.amount') + ' ($)'}
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount?.[0]}
          required
          placeholder={Number(shipment.balance_due || 0).toFixed(2)}
        />

        <div className="flex gap-2 flex-wrap">
          {[
            { label: '25%', factor: 0.25 },
            { label: '50%', factor: 0.5 },
            { label: '75%', factor: 0.75 },
            { label: '100%', factor: 1 },
          ].map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, amount: (Number(shipment.balance_due || 0) * p.factor).toFixed(2) }))}
              className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
            >
              {p.label} ({formatMoney(Number(shipment.balance_due || 0) * p.factor)})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label={t('payments.method')} value={form.method} onChange={set('method')} error={errors.method?.[0]}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement bancaire</option>
            <option value="check">Chèque</option>
          </Select>
          <Input label={t('payments.date')} type="date" value={form.payment_date} onChange={set('payment_date')} />
        </div>

        <Input label="Référence bancaire (optionnel)" value={form.bank_reference} onChange={set('bank_reference')} placeholder="Ex: TRF-2026-001" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preuve de paiement (optionnel)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
        </div>

        <Input label={t('common.notes')} value={form.notes} onChange={set('notes')} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading}>
            <DollarSign className="w-4 h-4 mr-1" />
            {loading ? t('common.saving') : t('payments.record_payment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
