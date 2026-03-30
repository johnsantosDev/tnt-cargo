import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardBody, Button, Input, Select, Pagination, Badge, Modal, Textarea } from '../components/ui';
import SearchableSelect from '../components/ui/SearchableSelect';
import { Plus, Search, Eye, Package, CheckCircle, FileText, Trash2, Edit3, Box, Settings2, Truck, DollarSign } from 'lucide-react';
import ExportButtons from '../components/ui/ExportButtons';

export default function PackingListsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [selectedPLs, setSelectedPLs] = useState([]);
  const [showCreateShipmentFromPLs, setShowCreateShipmentFromPLs] = useState(false);
  const [shipmentLoading, setShipmentLoading] = useState(false);

  const fetchLists = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/packing-lists', { params })
      .then(({ data }) => { setLists(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const statusBadge = (status) => {
    const map = { draft: 'yellow', finalized: 'blue', shipped: 'green' };
    return <Badge color={map[status] || 'gray'}>{t(`packing_list.status_${status}`)}</Badge>;
  };

  const handleDelete = async (id) => {
    if (!confirm(t('packing_list.confirm_delete'))) return;
    try {
      await api.delete(`/packing-lists/${id}`);
      setSelectedPLs(prev => prev.filter(plId => plId !== id));
      fetchLists();
    } catch (err) { console.error(err); }
  };

  const toggleSelectPL = (id) => {
    setSelectedPLs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (checked) => {
    setSelectedPLs(checked ? lists.map(l => l.id) : []);
  };

  const handleCreateShipmentFromPLs = async (data) => {
    setShipmentLoading(true);
    try {
      const { data: res } = await api.post('/packing-lists/create-shipment-from-lists', {
        ...data,
        packing_list_ids: selectedPLs,
      });
      setSelectedPLs([]);
      setShowCreateShipmentFromPLs(false);
      fetchLists();
      navigate(`/dashboard/shipments/${res.shipment.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally { setShipmentLoading(false); }
  };

  const selectedListsData = lists.filter(l => selectedPLs.includes(l.id));

  const exportColumns = [
    { key: 'reference', label: t('packing_list.reference') },
    { key: 'client', label: t('packing_list.client'), render: (row) => row.client?.name || '-' },
    { key: 'items_count', label: t('packing_list.items_count') },
    { key: 'total_cbm', label: t('packing_list.total_cbm'), render: (row) => Number(row.total_cbm || 0).toFixed(4) },
    { key: 'shipping_cost', label: t('packing_list.shipping_cost'), render: (row) => formatMoney(row.shipping_cost) },
    { key: 'grand_total', label: t('packing_list.grand_total'), render: (row) => formatMoney(Number(row.total_amount || 0) + Number(row.shipping_cost || 0) + Number(row.additional_fees || 0)) },
    { key: 'status', label: t('packing_list.status'), render: (row) => row.status },
    { key: 'created_at', label: t('packing_list.date'), render: (row) => formatDate(row.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('packing_list.title')}</h1>
        </div>
        <div className="flex gap-2">
          {selectedPLs.length > 0 && (
            <Button variant="outline" onClick={() => setShowCreateShipmentFromPLs(true)}>
              <Truck className="w-4 h-4 mr-2" />{t('packing_list.create_shipment_selected')} ({selectedPLs.length})
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />{t('packing_list.create')}
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('packing_list.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('packing_list.all_statuses')}</option>
              <option value="draft">{t('packing_list.status_draft')}</option>
              <option value="finalized">{t('packing_list.status_finalized')}</option>
              <option value="shipped">{t('packing_list.status_shipped')}</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-gray-400">{t('common.loading')}...</div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={exportColumns} data={lists} filename="packing-lists" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={lists.length > 0 && selectedPLs.length === lists.length}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">{t('packing_list.reference')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.client')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.items_count')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.total_cbm')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.shipping_cost')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.grand_total')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.status')}</th>
                    <th className="px-4 py-3 text-left">{t('packing_list.date')}</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {lists.map((row) => {
                    const isSelected = selectedPLs.includes(row.id);
                    const grandTotal = Number(row.total_amount || 0) + Number(row.shipping_cost || 0) + Number(row.additional_fees || 0);
                    return (
                      <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPL(row.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-sm font-medium">{row.reference}</span>
                          {row.items && row.items.length > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]" title={row.items.map(i => i.description).join(', ')}>
                              {row.items.map(i => i.description).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.client?.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium">{row.items_count || row.items?.length || 0}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{Number(row.total_cbm || 0).toFixed(4)} m³</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-blue-600">{formatMoney(row.shipping_cost)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-green-700">{formatMoney(grandTotal)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{statusBadge(row.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
                            {row.status === 'draft' && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lists.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">Aucune donnée</div>
              )}
            </div>
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {/* Selection summary bar */}
      {selectedPLs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm">
            <span className="font-bold">{selectedPLs.length}</span> liste(s) sélectionnée(s)
            {selectedListsData.length > 0 && (
              <span className="ml-2 text-gray-300">
                — {selectedListsData.reduce((s, l) => s + (l.items_count || l.items?.length || 0), 0)} articles,{' '}
                {formatMoney(selectedListsData.reduce((s, l) => s + Number(l.total_amount || 0) + Number(l.shipping_cost || 0) + Number(l.additional_fees || 0), 0))}
              </span>
            )}
          </span>
          <Button size="sm" onClick={() => setShowCreateShipmentFromPLs(true)}>
            <Truck className="w-4 h-4 mr-1" />{t('packing_list.create_shipment_selected')}
          </Button>
          <button onClick={() => setSelectedPLs([])} className="text-gray-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      {showCreate && <CreatePackingListModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchLists(); }} />}
      {showDetail && <PackingListDetailModal listId={showDetail.id} onClose={() => setShowDetail(null)} onRefresh={fetchLists} />}
      {showCreateShipmentFromPLs && (
        <CreateShipmentFromPLsModal
          packingLists={selectedListsData}
          onClose={() => setShowCreateShipmentFromPLs(false)}
          onSubmit={handleCreateShipmentFromPLs}
          loading={shipmentLoading}
        />
      )}
    </div>
  );
}

// --- Create Packing List Modal ---
function CreatePackingListModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ client_id: '', price_per_cbm: '', cbm_count: '', additional_fees: '', fees_description: '', notes: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } }).then(({ data }) => setClients(data.data)).catch(console.error);
  }, []);

  const pricePerCbm = parseFloat(form.price_per_cbm) || 0;
  const cbmCount = parseFloat(form.cbm_count) || 0;
  const shippingCost = pricePerCbm * cbmCount;
  const additionalFees = parseFloat(form.additional_fees) || 0;
  const estimatedTotal = shippingCost + additionalFees;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/packing-lists', {
        client_id: form.client_id,
        price_per_cbm: form.price_per_cbm || 0,
        cbm_count: form.cbm_count || 0,
        additional_fees: form.additional_fees || 0,
        fees_description: form.fees_description || null,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SearchableSelect
          label={t('packing_list.client')}
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          options={clientOptions}
          error={errors.client_id?.[0]}
          placeholder={t('common.select')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('packing_list.price_per_cbm') + ' ($)'} type="number" step="0.01" min="0" value={form.price_per_cbm} onChange={(e) => setForm({ ...form, price_per_cbm: e.target.value })} error={errors.price_per_cbm?.[0]} />
          <Input label={t('packing_list.cbm_count') + ' (m³)'} type="number" step="0.0001" min="0" value={form.cbm_count} onChange={(e) => setForm({ ...form, cbm_count: e.target.value })} />
        </div>

        {/* Price calculation display */}
        {pricePerCbm > 0 && cbmCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-800 uppercase mb-1">{t('packing_list.price_calculation')}</div>
            <div className="text-sm text-blue-900 font-medium">
              {cbmCount.toFixed(2)} CBM × ${pricePerCbm.toFixed(2)}/CBM = <span className="font-bold">${shippingCost.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Input label={t('packing_list.additional_fees') + ' ($)'} type="number" step="0.01" min="0" value={form.additional_fees} onChange={(e) => setForm({ ...form, additional_fees: e.target.value })} error={errors.additional_fees?.[0]} placeholder="0.00" />

        <Input label={t('packing_list.fees_description')} value={form.fees_description} onChange={(e) => setForm({ ...form, fees_description: e.target.value })} placeholder={t('packing_list.fees_description_placeholder')} />

        {/* Estimated total */}
        {estimatedTotal > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('packing_list.shipping_cost')}</span>
              <span className="font-medium">${shippingCost.toFixed(2)}</span>
            </div>
            {additionalFees > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">{t('packing_list.additional_fees')}</span>
                <span className="font-medium">${additionalFees.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-1 pt-1 border-t border-green-200">
              <span className="font-semibold text-green-800">{t('packing_list.estimated_total')}</span>
              <span className="font-bold text-green-800">${estimatedTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Textarea label={t('packing_list.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? t('common.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Packing List Detail Modal ---
function PackingListDetailModal({ listId, onClose, onRefresh }) {
  const { t } = useTranslation();
  const [pl, setPl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    api.get(`/packing-lists/${listId}`)
      .then(({ data }) => setPl(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const handleDeleteItem = async (itemId) => {
    if (!confirm(t('packing_list.confirm_delete_item'))) return;
    try {
      await api.delete(`/packing-lists/${listId}/items/${itemId}`);
      fetchDetail();
      onRefresh();
    } catch (err) { console.error(err); }
  };

  const handleFinalize = async (data) => {
    setActionLoading(true);
    try {
      await api.post(`/packing-lists/${listId}/finalize`, data);
      fetchDetail();
      onRefresh();
      setShowFinalize(false);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleGenerateInvoice = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/packing-lists/${listId}/invoice`);
      alert(t('packing_list.invoice_generated') + ': ' + data.invoice.invoice_number);
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally { setActionLoading(false); }
  };

  const handleCreateShipment = async (data) => {
    setActionLoading(true);
    try {
      const { data: res } = await api.post(`/packing-lists/${listId}/shipment`, data);
      alert(t('packing_list.shipment_created') + ': ' + res.shipment.tracking_number);
      fetchDetail();
      onRefresh();
      setShowCreateShipment(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally { setActionLoading(false); }
  };

  const handleEditDetails = async (data) => {
    setActionLoading(true);
    try {
      await api.put(`/packing-lists/${listId}`, data);
      fetchDetail();
      onRefresh();
      setShowEditDetails(false);
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  if (loading || !pl) {
    return (
      <Modal isOpen onClose={onClose} title={t('packing_list.detail')} size="xl">
        <div className="py-12 text-center text-gray-400">{t('common.loading')}...</div>
      </Modal>
    );
  }

  const isDraft = pl.status === 'draft';
  const isFinalized = pl.status === 'finalized';

  return (
    <Modal isOpen onClose={onClose} title={`${t('packing_list.detail')} - ${pl.reference}`} size="xl">
      <div className="space-y-6">
        {/* Header info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label={t('packing_list.client')} value={pl.client?.name} />
          <InfoCard label={t('packing_list.status')} value={
            <Badge color={isDraft ? 'yellow' : isFinalized ? 'blue' : 'green'}>
              {t(`packing_list.status_${pl.status}`)}
            </Badge>
          } />
          <InfoCard label={t('packing_list.total_cbm')} value={`${Number(pl.total_cbm || 0).toFixed(4)} m³`} />
          <InfoCard label={t('packing_list.total_weight')} value={`${Number(pl.total_weight || 0).toFixed(2)} kg`} />
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <InfoCard label={t('packing_list.items_total')} value={formatMoney(pl.total_amount)} className="text-gray-900 font-semibold" />
          <InfoCard label={t('packing_list.price_per_cbm')} value={formatMoney(pl.price_per_cbm)} />
          <InfoCard label={t('packing_list.shipping_cost')} value={formatMoney(pl.shipping_cost)} className="text-blue-600" />
          <InfoCard label={t('packing_list.additional_fees')} value={formatMoney(pl.additional_fees)} className="text-orange-600" />
          <InfoCard label={t('packing_list.grand_total')} value={formatMoney(Number(pl.total_amount || 0) + Number(pl.shipping_cost || 0) + Number(pl.additional_fees || 0))} className="text-green-700 font-bold text-lg" />
        </div>

        {isDraft && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowEditDetails(true)}>
              <Settings2 className="w-3.5 h-3.5 mr-1" />{t('packing_list.edit_details')}
            </Button>
          </div>
        )}

        {(pl.notes || pl.fees_description) && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
            {pl.fees_description && <div><span className="font-medium">{t('packing_list.fees_description')}:</span> {pl.fees_description}</div>}
            {pl.notes && <div><span className="font-medium">{t('packing_list.notes')}:</span> {pl.notes}</div>}
          </div>
        )}

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t('packing_list.items')} ({pl.items?.length || 0})
            </h4>
            <div className="flex gap-2">
              {isDraft && (
                <Button size="sm" onClick={() => setShowAddItem(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />{t('packing_list.add_item')}
                </Button>
              )}
            </div>
          </div>

          {pl.items && pl.items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('packing_list.description')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.qty')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.cbm')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.weight')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.total')}</th>
                    <th className="px-3 py-2 text-left">{t('packing_list.cbm_breakdown')}</th>
                    {isDraft && <th className="px-3 py-2 text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pl.items.map((item) => {
                    const itemTotalCbm = Number(item.cbm || 0) * Number(item.quantity || 1);
                    const itemTotal = Number(item.total_price || 0);
                    const perCbm = itemTotalCbm > 0 ? (itemTotal / itemTotalCbm) : 0;
                    return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div>{item.description}</div>
                        {item.length && item.width && item.height && <div className="text-xs text-gray-400">{item.length}×{item.width}×{item.height} cm</div>}
                        {item.received_at && <div className="text-xs text-gray-400">{t('packing_list.received')}: {new Date(item.received_at).toLocaleDateString('fr-FR')}</div>}
                        {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(item.cbm || 0).toFixed(4)}
                        {item.quantity > 1 && <div className="text-xs text-gray-400">× {item.quantity} = {itemTotalCbm.toFixed(4)}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{item.weight ? `${item.weight} kg` : '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(itemTotal)}</td>
                      <td className="px-3 py-2 text-left text-xs text-gray-500">
                        {itemTotalCbm > 0 && itemTotal > 0 && (
                          <span>{itemTotalCbm.toFixed(2)} CBM × ${perCbm.toFixed(2)}/CBM = ${itemTotal.toFixed(2)}</span>
                        )}
                      </td>
                      {isDraft && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditItem(item)} className="p-1 text-gray-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );})}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2 text-right" colSpan={2}>{t('packing_list.totals')}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(pl.total_cbm || 0).toFixed(4)} m³</td>
                    <td className="px-3 py-2 text-right">{Number(pl.total_weight || 0).toFixed(2)} kg</td>
                    <td className="px-3 py-2 text-right">{formatMoney(pl.total_amount)}</td>
                    <td></td>
                    {isDraft && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>{t('packing_list.no_items')}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          {isDraft && pl.items?.length > 0 && (
            <Button variant="success" onClick={() => setShowFinalize(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />{t('packing_list.finalize')}
            </Button>
          )}
          {isFinalized && !pl.shipment_id && (
            <Button variant="outline" onClick={() => setShowCreateShipment(true)} disabled={actionLoading}>
              <Truck className="w-4 h-4 mr-2" />{t('packing_list.create_shipment')}
            </Button>
          )}
          {isFinalized && (
            <Button onClick={handleGenerateInvoice} disabled={actionLoading}>
              <FileText className="w-4 h-4 mr-2" />{t('packing_list.generate_invoice')}
            </Button>
          )}
          {pl.shipment_id && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              <Truck className="w-4 h-4" />
              {t('packing_list.linked_shipment')}: <span className="font-mono font-medium">{pl.shipment?.tracking_number || `#${pl.shipment_id}`}</span>
            </div>
          )}
        </div>
      </div>

      {showAddItem && (
        <ItemFormModal
          packingListId={listId}
          onClose={() => setShowAddItem(false)}
          onSaved={() => { setShowAddItem(false); fetchDetail(); onRefresh(); }}
        />
      )}
      {editItem && (
        <ItemFormModal
          packingListId={listId}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchDetail(); onRefresh(); }}
        />
      )}
      {showFinalize && (
        <FinalizeModal
          packingList={pl}
          onClose={() => setShowFinalize(false)}
          onFinalize={handleFinalize}
          loading={actionLoading}
        />
      )}
      {showEditDetails && (
        <EditDetailsModal
          packingList={pl}
          onClose={() => setShowEditDetails(false)}
          onSave={handleEditDetails}
          loading={actionLoading}
        />
      )}
      {showCreateShipment && (
        <CreateShipmentModal
          packingList={pl}
          onClose={() => setShowCreateShipment(false)}
          onSubmit={handleCreateShipment}
          loading={actionLoading}
        />
      )}
    </Modal>
  );
}

// --- Info Card ---
function InfoCard({ label, value, className = '' }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm ${className}`}>{value}</div>
    </div>
  );
}

// --- Item Form Modal (Add/Edit) ---
function ItemFormModal({ packingListId, item = null, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    description: item?.description || '',
    quantity: item?.quantity || 1,
    weight: item?.weight || '',
    length: item?.length || '',
    width: item?.width || '',
    height: item?.height || '',
    cbm: item?.cbm || '',
    amount: item ? String(Number(item.total_price || 0)) : '',
    notes: item?.notes || '',
    received_at: item?.received_at ? item.received_at.split('T')[0] : new Date().toISOString().split('T')[0],
  });

  // Auto-calculate CBM from dimensions
  const prevDimsRef = useRef({ length: form.length, width: form.width, height: form.height });
  useEffect(() => {
    const prev = prevDimsRef.current;
    if (prev.length === form.length && prev.width === form.width && prev.height === form.height) return;
    prevDimsRef.current = { length: form.length, width: form.width, height: form.height };
    if (form.length && form.width && form.height) {
      const cbm = (parseFloat(form.length) * parseFloat(form.width) * parseFloat(form.height)) / 1000000;
      setForm(prev => ({ ...prev, cbm: cbm.toFixed(4) }));
    }
  }, [form.length, form.width, form.height]);

  const totalCbm = (parseFloat(form.cbm) || 0) * (parseFloat(form.quantity) || 1);
  const amount = parseFloat(form.amount) || 0;
  const pricePerCbmCalc = totalCbm > 0 ? (amount / totalCbm) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const qty = parseFloat(form.quantity) || 1;
      const payload = {
        ...form,
        unit_price: qty > 0 ? (amount / qty).toFixed(2) : '0',
      };
      delete payload.amount;
      if (item) {
        await api.put(`/packing-lists/${packingListId}/items/${item.id}`, payload);
      } else {
        await api.post(`/packing-lists/${packingListId}/items`, payload);
      }
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal isOpen onClose={onClose} title={item ? t('packing_list.edit_item') : t('packing_list.add_item')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('packing_list.description')} value={form.description} onChange={set('description')} error={errors.description?.[0]} required />

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('packing_list.qty')} type="number" min="1" value={form.quantity} onChange={set('quantity')} error={errors.quantity?.[0]} required />
          <Input label={t('packing_list.amount') + ' ($)'} type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} required />
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <label className="block text-sm font-medium text-blue-700 mb-2">{t('packing_list.dimensions_section')}</label>
          <div className="grid grid-cols-3 gap-3">
            <Input label={t('packing_list.length_cm')} type="number" step="0.01" min="0" value={form.length} onChange={set('length')} />
            <Input label={t('packing_list.width_cm')} type="number" step="0.01" min="0" value={form.width} onChange={set('width')} />
            <Input label={t('packing_list.height_cm')} type="number" step="0.01" min="0" value={form.height} onChange={set('height')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('packing_list.cbm') + ' (m³)'} type="number" step="0.0001" min="0" value={form.cbm} onChange={set('cbm')} error={errors.cbm?.[0]} />
          <Input label={t('packing_list.weight') + ' (kg)'} type="number" step="0.01" min="0" value={form.weight} onChange={set('weight')} error={errors.weight?.[0]} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('packing_list.received_at')} type="date" value={form.received_at} onChange={set('received_at')} />
          <Input label={t('packing_list.item_notes')} value={form.notes} onChange={set('notes')} />
        </div>

        {/* Summary card with CBM price breakdown */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-green-800 uppercase mb-2">{t('packing_list.price_summary')}</div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">{t('packing_list.amount')}</span><span className="font-semibold">${amount.toFixed(2)}</span></div>
          {totalCbm > 0 && amount > 0 && (
            <div className="mt-2 pt-2 border-t border-green-200 text-sm text-gray-600">
              <span>{totalCbm.toFixed(4)} CBM × ${pricePerCbmCalc.toFixed(2)}/CBM = </span>
              <span className="font-bold text-green-800">${amount.toFixed(2)}</span>
            </div>
          )}
          {totalCbm > 0 && <div className="text-xs text-gray-500 mt-1">{t('packing_list.total_cbm')}: {totalCbm.toFixed(4)} m³</div>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={loading}>{loading ? t('common.saving') : (item ? t('common.update') : t('packing_list.add_item'))}</Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Finalize Modal ---
function FinalizeModal({ packingList, onClose, onFinalize, loading }) {
  const { t } = useTranslation();
  const [pricePerCbm, setPricePerCbm] = useState(packingList.price_per_cbm || '');
  const [shipments, setShipments] = useState([]);
  const [shipmentId, setShipmentId] = useState('');

  useEffect(() => {
    api.get('/shipments', { params: { per_page: 100, client_id: packingList.client_id } })
      .then(({ data }) => setShipments(data.data))
      .catch(console.error);
  }, [packingList.client_id]);

  const totalCbm = Number(packingList.total_cbm || 0);
  const shippingCost = totalCbm * (parseFloat(pricePerCbm) || 0);
  const additionalFees = Number(packingList.additional_fees || 0);
  const grandTotal = Number(packingList.total_amount || 0) + shippingCost + additionalFees;

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.finalize')} size="md">
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {t('packing_list.finalize_warning')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InfoCard label={t('packing_list.total_cbm')} value={`${totalCbm.toFixed(4)} m³`} />
          <InfoCard label={t('packing_list.items_total')} value={`$${Number(packingList.total_amount || 0).toFixed(2)}`} />
        </div>

        <Input
          label={t('packing_list.price_per_cbm') + ' ($)'}
          type="number" step="0.01" min="0"
          value={pricePerCbm}
          onChange={(e) => setPricePerCbm(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-4">
          <InfoCard label={t('packing_list.shipping_cost')} value={`$${shippingCost.toFixed(2)}`} className="text-blue-600 font-semibold" />
          <InfoCard label={t('packing_list.additional_fees')} value={`$${additionalFees.toFixed(2)}`} className="text-orange-600 font-semibold" />
          <InfoCard label={t('packing_list.grand_total')} value={`$${grandTotal.toFixed(2)}`} className="text-green-700 font-bold text-lg" />
        </div>

        <Select label={t('packing_list.link_shipment')} value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
          <option value="">{t('packing_list.no_shipment')}</option>
          {shipments.map((s) => <option key={s.id} value={s.id}>{s.tracking_number} - {s.client?.name}</option>)}
        </Select>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="success"
            onClick={() => onFinalize({ price_per_cbm: pricePerCbm || 0, shipment_id: shipmentId || null })}
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? t('common.saving') : t('packing_list.confirm_finalize')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Edit Details Modal (price, notes) ---
function EditDetailsModal({ packingList, onClose, onSave, loading }) {
  const { t } = useTranslation();
  const [pricePerCbm, setPricePerCbm] = useState(packingList.price_per_cbm || '');
  const [additionalFees, setAdditionalFees] = useState(packingList.additional_fees || '');
  const [feesDescription, setFeesDescription] = useState(packingList.fees_description || '');
  const [notes, setNotes] = useState(packingList.notes || '');

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.edit_details')} size="md">
      <div className="space-y-4">
        <Input
          label={t('packing_list.price_per_cbm') + ' ($)'}
          type="number" step="0.01" min="0"
          value={pricePerCbm}
          onChange={(e) => setPricePerCbm(e.target.value)}
        />
        <Input
          label={t('packing_list.additional_fees') + ' ($)'}
          type="number" step="0.01" min="0"
          value={additionalFees}
          onChange={(e) => setAdditionalFees(e.target.value)}
          placeholder="0.00"
        />
        <Input
          label={t('packing_list.fees_description')}
          value={feesDescription}
          onChange={(e) => setFeesDescription(e.target.value)}
          placeholder={t('packing_list.fees_description_placeholder')}
        />
        <Textarea
          label={t('packing_list.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            onClick={() => onSave({ price_per_cbm: pricePerCbm || 0, additional_fees: additionalFees || 0, fees_description: feesDescription || null, notes: notes || null })}
            disabled={loading}
          >
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Create Shipment Modal ---
function CreateShipmentModal({ packingList, onClose, onSubmit, loading }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    origin: 'china',
    destination: 'Goma',
    cargo_type: 'sea',
    container_code: '',
    flight_reference: '',
    estimated_arrival: '',
    special_instructions: '',
  });
  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const arrivalPresets = [
    { label: '1 sem', weeks: 1 },
    { label: '2 sem', weeks: 2 },
    { label: '3 sem', weeks: 3 },
    { label: '1 mois', weeks: 0, months: 1 },
    { label: '1m 1s', weeks: 1, months: 1 },
    { label: '1m 2s', weeks: 2, months: 1 },
    { label: '1m 3s', weeks: 3, months: 1 },
    { label: '2 mois', weeks: 0, months: 2 },
  ];

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.create_shipment')} size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium mb-2">{t('packing_list.shipment_from_pl')}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-500">{t('packing_list.items_count')}:</span> <span className="font-medium">{packingList.items?.length || 0}</span></div>
            <div><span className="text-gray-500">{t('packing_list.total_cbm')}:</span> <span className="font-medium">{Number(packingList.total_cbm || 0).toFixed(2)} m³</span></div>
            <div><span className="text-gray-500">{t('packing_list.grand_total')}:</span> <span className="font-medium">{formatMoney(Number(packingList.total_amount || 0) + Number(packingList.shipping_cost || 0) + Number(packingList.additional_fees || 0))}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label={t('shipments.origin')} value={form.origin} onChange={set('origin')}>
            <option value="china">Chine</option>
            <option value="dubai">Dubaï</option>
            <option value="turkey">Turquie</option>
            <option value="other">Autre</option>
          </Select>
          <Select label={t('shipments.destination')} value={form.destination} onChange={set('destination')}>
            <option value="Goma">Goma</option>
            <option value="Lubumbashi">Lubumbashi</option>
            <option value="Kinshasa">Kinshasa</option>
            <option value="Beni">Beni</option>
            <option value="Butembo">Butembo</option>
            <option value="Bunia">Bunia</option>
            <option value="Bukavu">Bukavu</option>
            <option value="Autre">Autre</option>
          </Select>
        </div>

        <div>
          <Select label={t('shipments.cargo_type')} value={form.cargo_type} onChange={set('cargo_type')}>
            <option value="sea">{t('shipments.cargo_sea')}</option>
            <option value="air">{t('shipments.cargo_air')}</option>
          </Select>
        </div>

        {form.cargo_type === 'sea' ? (
          <Input label={t('shipments.container_code')} value={form.container_code} onChange={set('container_code')} placeholder="Ex: CNTR-2026-001" />
        ) : (
          <Input label={t('shipments.flight_reference')} value={form.flight_reference} onChange={set('flight_reference')} placeholder="Ex: TK-1920" />
        )}

        <div>
          <Input label={t('shipments.estimated_arrival')} type="date" value={form.estimated_arrival} onChange={set('estimated_arrival')} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {arrivalPresets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + (p.weeks || 0) * 7);
                  d.setMonth(d.getMonth() + (p.months || 0));
                  setForm(prev => ({ ...prev, estimated_arrival: d.toISOString().split('T')[0] }));
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea label={t('shipments.notes')} value={form.special_instructions} onChange={set('special_instructions')} rows={2} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading}>
            <Truck className="w-4 h-4 mr-2" />
            {loading ? t('common.saving') : t('packing_list.create_shipment')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Create Shipment From Selected Packing Lists Modal ---
function CreateShipmentFromPLsModal({ packingLists, onClose, onSubmit, loading }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    origin: 'china',
    destination: 'Goma',
    cargo_type: 'sea',
    container_code: '',
    flight_reference: '',
    estimated_arrival: '',
    special_instructions: '',
  });
  const set = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;

  const totalCbm = packingLists.reduce((s, pl) => s + Number(pl.total_cbm || 0), 0);
  const totalWeight = packingLists.reduce((s, pl) => s + Number(pl.total_weight || 0), 0);
  const totalAmount = packingLists.reduce((s, pl) => s + Number(pl.total_amount || 0), 0);
  const totalShipping = packingLists.reduce((s, pl) => s + Number(pl.shipping_cost || 0), 0);
  const totalFees = packingLists.reduce((s, pl) => s + Number(pl.additional_fees || 0), 0);
  const grandTotal = totalAmount + totalShipping + totalFees;
  const totalItems = packingLists.reduce((s, pl) => s + Number(pl.items_count || pl.items?.length || 0), 0);

  const arrivalPresets = [
    { label: '1 sem', weeks: 1 },
    { label: '2 sem', weeks: 2 },
    { label: '3 sem', weeks: 3 },
    { label: '1 mois', weeks: 0, months: 1 },
    { label: '1m 1s', weeks: 1, months: 1 },
    { label: '1m 2s', weeks: 2, months: 1 },
    { label: '1m 3s', weeks: 3, months: 1 },
    { label: '2 mois', weeks: 0, months: 2 },
  ];

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.create_shipment_selected')} size="lg">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium mb-2">{t('packing_list.selected_items_summary')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-gray-500">{t('packing_list.lists')}:</span> <span className="font-medium">{packingLists.length}</span></div>
            <div><span className="text-gray-500">{t('packing_list.items_count')}:</span> <span className="font-medium">{totalItems}</span></div>
            <div><span className="text-gray-500">{t('packing_list.total_cbm')}:</span> <span className="font-medium">{totalCbm.toFixed(4)} m³</span></div>
            <div><span className="text-gray-500">{t('packing_list.total_weight')}:</span> <span className="font-medium">{totalWeight.toFixed(2)} kg</span></div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200 grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-gray-500">{t('packing_list.total_amount')}:</span> <span className="font-medium">{formatMoney(totalAmount)}</span></div>
            <div><span className="text-gray-500">{t('packing_list.shipping_cost')}:</span> <span className="font-medium">{formatMoney(totalShipping)}</span></div>
            <div><span className="text-gray-500 font-semibold">{t('packing_list.grand_total')}:</span> <span className="font-bold text-blue-700">{formatMoney(grandTotal)}</span></div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left">{t('packing_list.reference')}</th>
                <th className="px-2 py-1.5 text-left">{t('packing_list.client')}</th>
                <th className="px-2 py-1.5 text-right">{t('packing_list.items_count')}</th>
                <th className="px-2 py-1.5 text-right">{t('packing_list.total_weight')}</th>
                <th className="px-2 py-1.5 text-right">{t('packing_list.total_cbm')}</th>
                <th className="px-2 py-1.5 text-right">{t('packing_list.grand_total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {packingLists.map(pl => (
                <tr key={pl.id}>
                  <td className="px-2 py-1.5">
                    <div className="font-mono font-medium">{pl.reference}</div>
                    {pl.items && pl.items.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate" title={pl.items.map(i => i.description).join(', ')}>
                        {pl.items.map(i => i.description).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{pl.client?.name || '-'}</td>
                  <td className="px-2 py-1.5 text-right">{pl.items_count || pl.items?.length || 0}</td>
                  <td className="px-2 py-1.5 text-right">{Number(pl.total_weight || 0).toFixed(2)} kg</td>
                  <td className="px-2 py-1.5 text-right font-mono">{Number(pl.total_cbm || 0).toFixed(4)}</td>
                  <td className="px-2 py-1.5 text-right">{formatMoney(Number(pl.total_amount || 0) + Number(pl.shipping_cost || 0) + Number(pl.additional_fees || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label={t('shipments.origin')} value={form.origin} onChange={set('origin')}>
            <option value="china">Chine</option>
            <option value="dubai">Dubaï</option>
            <option value="turkey">Turquie</option>
            <option value="other">Autre</option>
          </Select>
          <Select label={t('shipments.destination')} value={form.destination} onChange={set('destination')}>
            <option value="Goma">Goma</option>
            <option value="Lubumbashi">Lubumbashi</option>
            <option value="Kinshasa">Kinshasa</option>
            <option value="Beni">Beni</option>
            <option value="Butembo">Butembo</option>
            <option value="Bunia">Bunia</option>
            <option value="Bukavu">Bukavu</option>
            <option value="Autre">Autre</option>
          </Select>
        </div>

        <div>
          <Select label={t('shipments.cargo_type')} value={form.cargo_type} onChange={set('cargo_type')}>
            <option value="sea">{t('shipments.cargo_sea')}</option>
            <option value="air">{t('shipments.cargo_air')}</option>
          </Select>
        </div>

        {form.cargo_type === 'sea' ? (
          <Input label={t('shipments.container_code')} value={form.container_code} onChange={set('container_code')} placeholder="Ex: CNTR-2026-001" />
        ) : (
          <Input label={t('shipments.flight_reference')} value={form.flight_reference} onChange={set('flight_reference')} placeholder="Ex: TK-1920" />
        )}

        <div>
          <Input label={t('shipments.estimated_arrival')} type="date" value={form.estimated_arrival} onChange={set('estimated_arrival')} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {arrivalPresets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + (p.weeks || 0) * 7);
                  d.setMonth(d.getMonth() + (p.months || 0));
                  setForm(prev => ({ ...prev, estimated_arrival: d.toISOString().split('T')[0] }));
                }}
                className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea label={t('shipments.notes')} value={form.special_instructions} onChange={set('special_instructions')} rows={2} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading}>
            <Truck className="w-4 h-4 mr-2" />
            {loading ? t('common.saving') : t('packing_list.create_shipment')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
