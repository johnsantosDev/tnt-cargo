import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardHeader, CardBody, Badge, Spinner, Button } from '../components/ui';
import { ArrowLeft, Download, CreditCard, FileText, Image as ImageIcon, Eye, X } from 'lucide-react';

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewProof, setPreviewProof] = useState(false);
  const [proofUrl, setProofUrl] = useState(null);

  useEffect(() => {
    api.get(`/payments/${id}`)
      .then(({ data }) => setPayment(data.data || data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (payment?.proof_path) {
      api.get(`/payments/${id}/proof`, { responseType: 'blob' })
        .then(res => setProofUrl(URL.createObjectURL(res.data)))
        .catch(() => {});
    }
    return () => { if (proofUrl) URL.revokeObjectURL(proofUrl); };
  }, [payment?.proof_path]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const methodBadge = (m) => {
    const colors = { cash: 'green', mobile_money: 'blue', bank_transfer: 'purple', check: 'yellow' };
    const labels = { cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Virement', check: 'Chèque' };
    return <Badge variant={colors[m] || 'gray'}>{labels[m] || m}</Badge>;
  };

  const typeBadge = (t) => {
    const colors = { income: 'green', expense: 'red', refund: 'yellow' };
    const labels = { income: 'Revenu', expense: 'Dépense', refund: 'Remboursement' };
    return <Badge variant={colors[t] || 'gray'}>{labels[t] || t}</Badge>;
  };

  if (loading) return <Spinner />;
  if (!payment) return null;

  const infoRow = (label, value) => (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/payments')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{payment.reference}</h1>
          <p className="text-sm text-gray-500">{payment.client?.name}</p>
        </div>
        {methodBadge(payment.method)}
        <Button variant="secondary" onClick={async () => {
          const res = await api.get(`/payments/${id}/pdf`, { responseType: 'blob' });
          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `recu-${payment.client?.name || ''}-${payment.reference}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          <Download className="w-4 h-4 mr-2" />PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold">{t('payments.details') || 'Détails du paiement'}</h3></CardHeader>
          <CardBody>
            {infoRow(t('payments.reference'), payment.reference)}
            {infoRow(t('payments.client'), payment.client?.name || '-')}
            {infoRow(t('payments.amount'), <span className="text-green-600 font-bold">{formatMoney(payment.amount)}</span>)}
            {infoRow(t('payments.method'), methodBadge(payment.method))}
            {infoRow(t('payments.payment_type'), typeBadge(payment.type))}
            {infoRow(t('payments.date'), formatDate(payment.payment_date))}
            {payment.bank_reference && infoRow('Réf. bancaire', payment.bank_reference)}
            {infoRow(t('payments.status') || 'Statut', <Badge variant={payment.status === 'completed' ? 'green' : 'yellow'}>{payment.status}</Badge>)}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {payment.shipment && (
            <Card>
              <CardHeader><h3 className="font-semibold">{t('payments.shipment')}</h3></CardHeader>
              <CardBody>
                {infoRow(t('shipments.tracking_number'), (
                  <button onClick={() => navigate(`/dashboard/shipments/${payment.shipment.id}`)} className="text-primary-600 hover:underline font-mono">
                    {payment.shipment.tracking_number}
                  </button>
                ))}
                {infoRow(t('shipments.destination'), payment.shipment.destination)}
                {infoRow(t('shipments.total_cost'), formatMoney(payment.shipment.total_cost))}
                {infoRow(t('shipments.balance'), formatMoney(payment.shipment.balance_due))}
              </CardBody>
            </Card>
          )}

          {proofUrl && (
            <Card>
              <CardHeader><h3 className="font-semibold">Preuve de paiement</h3></CardHeader>
              <CardBody>
                <div className="relative group cursor-pointer" onClick={() => setPreviewProof(true)}>
                  {payment.proof_type?.startsWith('image/') ? (
                    <img src={proofUrl} alt="Preuve" className="w-full max-h-60 object-contain rounded-lg" />
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Preuve de paiement (PDF)</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {payment.notes && (
            <Card>
              <CardHeader><h3 className="font-semibold">{t('common.notes')}</h3></CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">{payment.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Proof preview modal */}
      {previewProof && proofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewProof(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative max-w-4xl max-h-[90vh] z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewProof(false)} className="absolute -top-3 -right-3 z-20 p-2 bg-white rounded-full shadow-lg text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
            {payment.proof_type?.startsWith('image/') ? (
              <img src={proofUrl} alt="Preuve" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            ) : (
              <iframe src={proofUrl} className="w-[800px] h-[85vh] rounded-xl shadow-2xl bg-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
