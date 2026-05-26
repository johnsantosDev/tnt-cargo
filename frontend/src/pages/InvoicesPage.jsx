import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal } from '../components/ui';
import { Plus, Search, Download, FileText, Eye, MessageCircle, Trash2, DollarSign } from 'lucide-react';
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
  const [showPay, setShowPay] = useState(null);
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

      // Some backends return a JSON error with status 200 if a renderer fails;
      // detect that by sniffing the blob content-type.
      const ct = response.data?.type || '';
      if (ct.includes('application/json') || ct.includes('text/html')) {
        const text = await response.data.text();
        let msg = text;
        try { msg = JSON.parse(text).message || text; } catch (_) { /* keep raw text */ }
        toast.error(msg || t('common.error'));
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Axios returns the body as a Blob when responseType is 'blob'; convert it to read the server message.
      let msg = err.response?.data;
      if (msg instanceof Blob) {
        try {
          const text = await msg.text();
          try { msg = JSON.parse(text).message || text; } catch (_) { msg = text; }
        } catch (_) { msg = null; }
      } else if (msg && typeof msg === 'object') {
        msg = msg.message;
      }
      toast.error(msg || t('common.error'));
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
          {row.status !== 'paid' && row.status !== 'cancelled' && hasPermission('payments.create') && (
            <button onClick={() => setShowPay(row)} className="p-1.5 text-gray-400 hover:text-green-600" title="Payer cette facture"><DollarSign className="w-4 h-4" /></button>
          )}
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
      {showPay && <InvoicePayModal invoice={showPay} onClose={() => setShowPay(null)} onSaved={() => { setShowPay(null); fetchInvoices(); }} />}
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

// Helper to parse numbers that may use comma as decimal separator (e.g. "137,48")
function parseLocaleNumber(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/\s+/g, '').replace(',', '.');
  return parseFloat(s);
}

function InvoiceFormModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shipments, setShipments] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState('');
  const [magerwa, setMagerwa] = useState('');
  const [auxFees, setAuxFees] = useState([{ label: '', amount: '' }]);
  const [cashAdvanceId, setCashAdvanceId] = useState('');
  const [cashAdvanceAmount, setCashAdvanceAmount] = useState('');
  const [advances, setAdvances] = useState([]);
  const [markPaid, setMarkPaid] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [payment, setPayment] = useState({
    amount: '',
    method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    bank_reference: '',
    notes: '',
  });

  const shipmentObj = shipments.find((s) => String(s.id) === String(selectedShipment));

  const expeditionFees = useMemo(() => {
    if (!shipmentObj) return 0;
    const plCargo = Number(shipmentObj.pl_cargo_subtotal || 0);
    const plFreight = Number(shipmentObj.pl_freight_subtotal || 0);
    const shipping = (plCargo > 0 || plFreight > 0)
      ? plCargo + plFreight
      : Number(shipmentObj.shipping_cost || 0);
    const customs = Number(shipmentObj.customs_fee || 0);
    const warehouse = Number(shipmentObj.warehouse_fee || 0);
    const other = Number(shipmentObj.other_fees || 0);
    const insurance = Number(shipmentObj.insurance_amount || 0);
    const lines = (shipmentObj.calculation_lines || []).reduce(
      (s, l) => s + Number(l?.amount || 0),
      0
    );
    return shipping + customs + warehouse + other + insurance + lines;
  }, [shipmentObj]);

  const magerwaNum = useMemo(() => Number(magerwa) || 0, [magerwa]);
  const auxTotal = useMemo(
    () => auxFees.reduce((s, f) => s + (Number(f.amount) || 0), 0),
    [auxFees]
  );
  const cashAdvanceNum = useMemo(
    () => (cashAdvanceAmount === '' ? 0 : Number(cashAdvanceAmount) || 0),
    [cashAdvanceAmount]
  );
  const expectedTotal = Math.max(
    0,
    expeditionFees + magerwaNum + auxTotal - cashAdvanceNum
  );
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    api.get('/shipments', { params: { per_page: 100 } }).then(({ data }) => setShipments(data.data)).catch(console.error);
    // preload invoices so we can detect shipments that already have an invoice
    api.get('/invoices', { params: { per_page: 500 } }).then(({ data }) => setExistingInvoices(data.data || [])).catch(() => setExistingInvoices([]));
  }, []);

  useEffect(() => {
    if (!shipmentObj?.client_id) {
      setAdvances([]);
      return;
    }
    api.get('/cash-advances', { params: { client_id: shipmentObj.client_id, per_page: 100 } })
      .then(({ data }) => setAdvances(data.data || []))
      .catch(console.error);
  }, [shipmentObj?.client_id]);

  useEffect(() => {
    if (markPaid && !amountTouched) {
      setPayment((p) => ({
        ...p,
        amount: expectedTotal > 0 ? expectedTotal.toFixed(2) : '',
      }));
    }
    if (!markPaid) {
      setAmountTouched(false);
    }
  }, [markPaid, amountTouched, expectedTotal]);

  const setPay = (f) => (e) => setPayment((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setLoading(true);
    setErrors({});
    try {
      const auxiliary_fees = auxFees
        .filter((f) => f.label?.trim() && f.amount !== '' && !Number.isNaN(parseFloat(f.amount)))
        .map((f) => ({ label: f.label.trim(), amount: parseFloat(f.amount) }));

      if (markPaid && (!payment.amount || parseLocaleNumber(payment.amount) <= 0)) {
        setErrors({ payment_amount: ['Veuillez saisir le montant du paiement.'] });
        setLoading(false);
        return;
      }

      if (markPaid && expectedTotal > 0) {
        const paidNum = parseLocaleNumber(payment.amount) || 0;
        const paidStr = paidNum.toFixed(2);
        const expectedStr = expectedTotal.toFixed(2);
        // If the rounded-to-cent display values match, treat as equal (avoids floating-point noise like 137.48000000000002).
        const isMatch = paidStr === expectedStr;
        if (!isMatch && parseFloat(paidStr) < parseFloat(expectedStr)) {
          setErrors({
            payment_amount: [
              `Le montant payé doit être au moins égal au total (${formatMoney(expectedTotal)}).`,
            ],
          });
          setLoading(false);
          return;
        }
      }

      if (markPaid && proofFile) {
        const formData = new FormData();
        formData.append('magerwa_price', magerwa === '' ? '0' : magerwa);
        auxiliary_fees.forEach((f, i) => {
          formData.append(`auxiliary_fees[${i}][label]`, f.label);
          formData.append(`auxiliary_fees[${i}][amount]`, String(f.amount));
        });
        if (cashAdvanceId) formData.append('cash_advance_id', cashAdvanceId);
        if (cashAdvanceAmount !== '') formData.append('cash_advance_amount', cashAdvanceAmount);
        formData.append('mark_paid', '1');
        // normalize decimal comma to dot before sending
        formData.append('payment_amount', String(parseLocaleNumber(payment.amount) || 0));
        formData.append('payment_method', payment.method);
        formData.append('payment_date', payment.payment_date);
        if (payment.bank_reference) formData.append('payment_bank_reference', payment.bank_reference);
        if (payment.notes) formData.append('payment_notes', payment.notes);
        formData.append('proof', proofFile);
        await api.post(`/invoices/from-shipment/${selectedShipment}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          magerwa_price: magerwa === '' ? 0 : parseFloat(magerwa),
          auxiliary_fees: auxiliary_fees.length ? auxiliary_fees : null,
          cash_advance_id: cashAdvanceId || null,
          cash_advance_amount: cashAdvanceAmount === '' ? undefined : parseFloat(cashAdvanceAmount),
        };
        if (markPaid) {
          payload.mark_paid = true;
          payload.payment_amount = parseLocaleNumber(payment.amount);
          payload.payment_method = payment.method;
          payload.payment_date = payment.payment_date;
          if (payment.bank_reference) payload.payment_bank_reference = payment.bank_reference;
          if (payment.notes) payload.payment_notes = payment.notes;
        }
        await api.post(`/invoices/from-shipment/${selectedShipment}`, payload);
      }

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
        <Select label={t('invoices.select_shipment')} value={selectedShipment} onChange={(e) => {
          const val = e.target.value;
          setSelectedShipment(val);
          // if this shipment already has an invoice, show immediate error
          const hasInvoice = existingInvoices.some(inv => String(inv.shipment?.id) === String(val));
          if (hasInvoice) {
            setErrors((prev) => ({ ...prev, shipment_id: ['Cet enregistrement existe déjà (valeur unique en doublon).'] }));
          } else {
            setErrors((prev) => {
              const copy = { ...prev };
              delete copy.shipment_id;
              return copy;
            });
          }
        }} error={errors.shipment_id?.[0]} required>
          <option value="">{t('common.select')}</option>
          {shipments.map((s) => <option key={s.id} value={s.id}>{s.tracking_number} - {s.client?.name}{s.container_code ? ` (${s.container_code})` : ''}</option>)}
        </Select>
        {shipmentObj && (
          <div className="-mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
            Cette facture est pour l'expédition <strong>{shipmentObj.tracking_number}</strong> du client <strong>{shipmentObj.client?.name || '—'}</strong>
            {shipmentObj.container_code ? <> dans le conteneur <strong>{shipmentObj.container_code}</strong></> : ' (aucun conteneur lié)'}.
          </div>
        )}
        <Input label={t('invoices.magerwa') + ' ($)'} type="number" step="0.01" min="0" value={magerwa} onChange={(e) => setMagerwa(e.target.value)} />
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">{t('invoices.auxiliary_fee')}</div>
          {auxFees.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <Input className="flex-1" placeholder={t('invoices.description')} value={row.label} onChange={(e) => setAuxFees((p) => p.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))} />
              <Input type="number" step="0.01" className="w-28" placeholder="$" value={row.amount} onChange={(e) => setAuxFees((p) => p.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))} />
              <button type="button" className="text-red-500 px-2" onClick={() => setAuxFees((p) => p.filter((_, i) => i !== idx))}>×</button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={() => setAuxFees((p) => [...p, { label: '', amount: '' }])}>{t('invoices.add_auxiliary_fee')}</Button>
        </div>
        <Select label={t('invoices.select_cash_advance')} value={cashAdvanceId} onChange={(e) => { setCashAdvanceId(e.target.value); setCashAdvanceAmount(''); }}>
          <option value="">{t('invoices.no_cash_advance')}</option>
          {advances.map((a) => (
            <option key={a.id} value={a.id}>{a.reference} — {t('invoices.balance')}: ${Number(a.balance || 0).toFixed(2)}</option>
          ))}
        </Select>
        <Input label={t('invoices.cash_advance') + ' ($)'} type="number" step="0.01" min="0" value={cashAdvanceAmount} onChange={(e) => setCashAdvanceAmount(e.target.value)} placeholder={t('invoices.optional_amount')} />

        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm font-medium text-gray-800">Le client a déjà payé (enregistrer le paiement maintenant)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">Décochez pour enregistrer comme brouillon.</p>
        </div>

        {markPaid && (
          <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Montant payé ($)"
                  type="number"
                  step="0.01"
                  min={expectedTotal > 0 ? expectedTotal.toFixed(2) : '0.01'}
                  value={payment.amount}
                  onChange={(e) => { setAmountTouched(true); setPay('amount')(e); }}
                  error={errors.payment_amount?.[0]}
                  required={markPaid}
                />
                {expectedTotal > 0 && (
                  <div className="mt-2 text-xs text-gray-700 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Frais d'expédition</span>
                      <span>{formatMoney(expeditionFees)}</span>
                    </div>
                    {magerwaNum > 0 && (
                      <div className="flex justify-between">
                        <span>Magerwa</span>
                        <span>{formatMoney(magerwaNum)}</span>
                      </div>
                    )}
                    {auxFees
                      .filter((f) => f.label?.trim() && Number(f.amount) > 0)
                      .map((f, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{f.label}</span>
                          <span>{formatMoney(Number(f.amount))}</span>
                        </div>
                      ))}
                    {cashAdvanceNum > 0 && (
                      <div className="flex justify-between text-orange-700">
                        <span>Avance déduite</span>
                        <span>-{formatMoney(cashAdvanceNum)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-green-300 pt-1 mt-1">
                      <span>Total à payer</span>
                      <span>{formatMoney(expectedTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
              <Select label="Mode de paiement" value={payment.method} onChange={setPay('method')} error={errors.payment_method?.[0]}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Virement bancaire</option>
                <option value="check">Chèque</option>
                <option value="other">Autre</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date du paiement" type="date" value={payment.payment_date} onChange={setPay('payment_date')} error={errors.payment_date?.[0]} required={markPaid} />
              <Input label="Référence bancaire (optionnel)" value={payment.bank_reference} onChange={setPay('bank_reference')} placeholder="Ex: TRF-2026-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preuve de paiement (optionnel)</label>
              <input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
              <p className="mt-1 text-xs text-gray-400">Image ou PDF, max 10 Mo</p>
            </div>
            <Input label="Notes de paiement (optionnel)" value={payment.notes} onChange={setPay('notes')} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}><FileText className="w-4 h-4 mr-2" />{t('invoices.generate')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoicePayModal({ invoice, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [proofFile, setProofFile] = useState(null);
  const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
  const [form, setForm] = useState({
    amount: balance > 0 ? balance.toFixed(2) : '',
    method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    bank_reference: '',
    notes: '',
  });

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const formData = new FormData();
      // normalize decimal comma to dot before sending
      formData.append('payment_amount', String(parseLocaleNumber(form.amount) || 0));
      formData.append('payment_method', form.method);
      formData.append('payment_date', form.payment_date);
      if (form.bank_reference) formData.append('payment_bank_reference', form.bank_reference);
      if (form.notes) formData.append('payment_notes', form.notes);
      if (proofFile) formData.append('proof', proofFile);

      await api.post(`/invoices/${invoice.id}/pay`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Payer ${invoice.invoice_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg flex justify-between text-sm">
          <span className="text-gray-600">Solde dû:</span>
          <span className="font-bold text-red-600">{formatMoney(balance)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant ($)" type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} error={errors.payment_amount?.[0]} required />
          <Select label="Mode de paiement" value={form.method} onChange={set('method')} error={errors.payment_method?.[0]}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Virement bancaire</option>
            <option value="check">Chèque</option>
            <option value="other">Autre</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date du paiement" type="date" value={form.payment_date} onChange={set('payment_date')} error={errors.payment_date?.[0]} required />
          <Input label="Référence bancaire (optionnel)" value={form.bank_reference} onChange={set('bank_reference')} placeholder="Ex: TRF-2026-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preuve de paiement (optionnel)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          <p className="mt-1 text-xs text-gray-400">Image ou PDF, max 10 Mo</p>
        </div>
        <Input label="Notes (optionnel)" value={form.notes} onChange={set('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}><DollarSign className="w-4 h-4 mr-2" />Enregistrer le paiement</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailModal({ invoice: invoiceProp, onClose, onDownload, onWhatsApp }) {
  const { t } = useTranslation();
  const [invoice, setInvoice] = useState(invoiceProp);
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  useEffect(() => {
    api.get(`/invoices/${invoiceProp.id}`).then(({ data }) => setInvoice(data.data ?? data)).catch(console.error);
  }, [invoiceProp.id]);

  return (
    <Modal isOpen onClose={onClose} title={`Facture ${invoice.invoice_number}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Client:</span> <span className="font-medium">{invoice.client?.name}</span></div>
          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(invoice.issue_date)}</span></div>
          <div><span className="text-gray-500">Échéance:</span> <span className="font-medium">{formatDate(invoice.due_date)}</span></div>
          <div><span className="text-gray-500">Statut:</span> <span className="font-medium">{invoice.status}</span></div>
        </div>

        {Number(invoice.magerwa_price || 0) > 0 && (
          <div className="text-sm text-gray-700">{t('invoices.magerwa')}: <span className="font-medium">{formatMoney(invoice.magerwa_price)}</span></div>
        )}
        {(invoice.auxiliary_fees || []).length > 0 && (
          <div className="text-sm space-y-1">
            <div className="text-gray-500">{t('invoices.auxiliary_fee')}</div>
            {invoice.auxiliary_fees.map((f, i) => (
              <div key={i}>{f.label}: {formatMoney(f.amount)}</div>
            ))}
          </div>
        )}
        {Number(invoice.cash_advance_amount || 0) > 0 && (
          <div className="text-sm text-orange-700">
            {t('invoices.cash_advance')}: -{formatMoney(invoice.cash_advance_amount)}
            {invoice.cash_advance?.reference && <span className="text-gray-500"> ({invoice.cash_advance.reference})</span>}
          </div>
        )}

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
                  <td colSpan="3" className="px-4 py-2 text-right">{t('invoices.subtotal')}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(invoice.subtotal)}</td>
                </tr>
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
