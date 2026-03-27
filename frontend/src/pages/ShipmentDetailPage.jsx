import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Badge, StatusBadge, Spinner, Modal, Select, Textarea, Input } from '../components/ui';
import { ArrowLeft, Upload, FileText, Trash2, CheckCircle, Clock, Download, MapPin, Share2, Copy, MessageCircle, Mail, Link2, Image as ImageIcon, Eye, X } from 'lucide-react';

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

  const fetch = () => {
    setLoading(true);
    api.get(`/shipments/${id}`).then(({ data }) => setShipment(data.data || data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
    api.get('/shipment-statuses').then(({ data }) => setStatuses(data.data || data)).catch(console.error);
  }, [id]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    await api.put(`/shipments/${id}/status`, statusForm);
    setShowStatusModal(false);
    fetch();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData();
    const fileInput = e.target.querySelector('input[type=file]');
    const nameInput = e.target.querySelector('input[name=name]');
    formData.append('document', fileInput.files[0]);
    formData.append('name', nameInput.value);
    try {
      await api.post(`/shipments/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUploadModal(false);
      fetch();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
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
          <p className="text-sm text-gray-500">{shipment.client?.name}</p>
        </div>
        <StatusBadge status={shipment.status?.slug} />
        {hasPermission('shipments.edit') && (
          <Button onClick={() => { setStatusForm({ status_id: shipment.status_id, comment: '', location: '' }); setShowStatusModal(true); }} variant="secondary">
            {t('shipments.update_status')}
          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Details */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t('shipments.details')}</h3></CardHeader>
          <CardBody>
            {infoRow(t('shipments.origin'), shipment.origin)}
            {infoRow(t('shipments.description'), shipment.description)}
            {infoRow(t('shipments.weight'), shipment.weight ? `${shipment.weight} kg` : '-')}
            {infoRow(t('shipments.cbm'), shipment.cbm || '-')}
            {infoRow(t('shipments.warehouse_entry'), formatDate(shipment.warehouse_entry_date))}
            {infoRow(t('shipments.arrival_date'), formatDate(shipment.arrival_date))}
            {infoRow(t('shipments.delivery_date'), formatDate(shipment.delivery_date))}
          </CardBody>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t('shipments.financials')}</h3></CardHeader>
          <CardBody>
            {infoRow(t('shipments.purchase_price'), formatMoney(shipment.purchase_price))}
            {infoRow(t('shipments.selling_price'), formatMoney(shipment.selling_price))}
            {infoRow(t('shipments.shipping_fee'), formatMoney(shipment.shipping_fee))}
            {infoRow(t('shipments.local_delivery_fee'), formatMoney(shipment.local_delivery_fee))}
            {infoRow(t('shipments.warehouse_fee'), formatMoney(shipment.warehouse_fee))}
            {infoRow(t('shipments.other_fees'), formatMoney(shipment.other_fees))}
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
              <span className={`text-sm font-bold ${shipment.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(shipment.balance)}</span>
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
        <CardBody className="p-0">
          {(!shipment.documents || shipment.documents.length === 0) ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">{t('shipments.no_documents')}</div>
          ) : (
            <div className="divide-y">
              {shipment.documents.map((d) => (
                <div key={d.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(d.created_at)}</p>
                    </div>
                  </div>
                  <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-primary-600">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

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

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title={t('shipments.upload_document')}>
        <form onSubmit={handleUpload} className="space-y-4">
          <Input label={t('shipments.document_name')} name="name" required />
          <Input label={t('shipments.file')} type="file" required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowUploadModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={uploading}>{t('common.upload')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
