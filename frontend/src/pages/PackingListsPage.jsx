import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Modal, Textarea } from '../components/ui';
import { Plus, Search, Eye, Package, CheckCircle, FileText, Trash2, Edit3, Box, Settings2 } from 'lucide-react';
import ExportButtons from '../components/ui/ExportButtons';

export default function PackingListsPage() {
  const { t } = useTranslation();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

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
      fetchLists();
    } catch (err) { console.error(err); }
  };

  const columns = [
    { key: 'reference', label: t('packing_list.reference'), render: (row) => <span className="font-mono text-sm font-medium">{row.reference}</span> },
    { key: 'client', label: t('packing_list.client'), render: (row) => row.client?.name || '-' },
    { key: 'items_count', label: t('packing_list.items_count'), render: (row) => <span className="font-medium">{row.items_count || 0}</span> },
    { key: 'total_cbm', label: t('packing_list.total_cbm'), render: (row) => <span>{Number(row.total_cbm || 0).toFixed(4)} m³</span> },
    { key: 'total_amount', label: t('packing_list.total_amount'), render: (row) => <span className="font-medium">{formatMoney(row.total_amount)}</span> },
    { key: 'shipping_cost', label: t('packing_list.shipping_cost'), render: (row) => <span className="text-blue-600">{formatMoney(row.shipping_cost)}</span> },
    { key: 'status', label: t('packing_list.status'), render: (row) => statusBadge(row.status) },
    { key: 'created_at', label: t('packing_list.date'), render: (row) => formatDate(row.created_at) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600"><Eye className="w-4 h-4" /></button>
          {row.status === 'draft' && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Box className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('packing_list.title')}</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />{t('packing_list.create')}
        </Button>
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
              <ExportButtons columns={columns} data={lists} filename="packing-lists" />
            </div>
            <Table columns={columns} data={lists} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showCreate && <CreatePackingListModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchLists(); }} />}
      {showDetail && <PackingListDetailModal listId={showDetail.id} onClose={() => setShowDetail(null)} onRefresh={fetchLists} />}
    </div>
  );
}

// --- Create Packing List Modal ---
function CreatePackingListModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ client_id: '', price_per_cbm: '', notes: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } }).then(({ data }) => setClients(data.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/packing-lists', {
        client_id: form.client_id,
        price_per_cbm: form.price_per_cbm || 0,
        notes: form.notes || null,
      });
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('packing_list.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label={t('packing_list.client')} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} error={errors.client_id?.[0]} required>
          <option value="">{t('common.select')}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label={t('packing_list.price_per_cbm')} type="number" step="0.01" value={form.price_per_cbm} onChange={(e) => setForm({ ...form, price_per_cbm: e.target.value })} error={errors.price_per_cbm?.[0]} />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label={t('packing_list.items_total')} value={formatMoney(pl.total_amount)} className="text-gray-900 font-semibold" />
          <InfoCard label={t('packing_list.price_per_cbm')} value={formatMoney(pl.price_per_cbm)} />
          <InfoCard label={t('packing_list.shipping_cost')} value={formatMoney(pl.shipping_cost)} className="text-blue-600" />
          <InfoCard label={t('packing_list.grand_total')} value={formatMoney(Number(pl.total_amount || 0) + Number(pl.shipping_cost || 0))} className="text-green-700 font-bold text-lg" />
        </div>

        {isDraft && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowEditDetails(true)}>
              <Settings2 className="w-3.5 h-3.5 mr-1" />{t('packing_list.edit_details')}
            </Button>
          </div>
        )}

        {pl.notes && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <span className="font-medium">{t('packing_list.notes')}:</span> {pl.notes}
          </div>
        )}

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {t('packing_list.items')} ({pl.items?.length || 0})
            </h4>
            {isDraft && (
              <Button size="sm" onClick={() => setShowAddItem(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />{t('packing_list.add_item')}
              </Button>
            )}
          </div>

          {pl.items && pl.items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('packing_list.description')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.qty')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.dimensions')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.cbm')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.weight')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.unit_price')}</th>
                    <th className="px-3 py-2 text-right">{t('packing_list.total')}</th>
                    {isDraft && <th className="px-3 py-2 text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pl.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div>{item.description}</div>
                        {item.received_at && <div className="text-xs text-gray-400">{t('packing_list.received')}: {new Date(item.received_at).toLocaleDateString('fr-FR')}</div>}
                        {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">
                        {item.length && item.width && item.height ? `${item.length}×${item.width}×${item.height} cm` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(item.cbm || 0).toFixed(4)}
                        {item.quantity > 1 && <div className="text-xs text-gray-400">× {item.quantity} = {(Number(item.cbm || 0) * item.quantity).toFixed(4)}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{item.weight ? `${item.weight} kg` : '-'}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(item.total_price)}</td>
                      {isDraft && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditItem(item)} className="p-1 text-gray-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={isDraft ? 3 : 3} className="px-3 py-2 text-right">{t('packing_list.totals')}</td>
                    <td className="px-3 py-2 text-right font-mono">{Number(pl.total_cbm || 0).toFixed(4)}</td>
                    <td className="px-3 py-2 text-right">{Number(pl.total_weight || 0).toFixed(2)} kg</td>
                    <td className="px-3 py-2 text-right"></td>
                    <td className="px-3 py-2 text-right">{formatMoney(pl.total_amount)}</td>
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
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          {isDraft && pl.items?.length > 0 && (
            <Button variant="success" onClick={() => setShowFinalize(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />{t('packing_list.finalize')}
            </Button>
          )}
          {isFinalized && (
            <Button onClick={handleGenerateInvoice} disabled={actionLoading}>
              <FileText className="w-4 h-4 mr-2" />{t('packing_list.generate_invoice')}
            </Button>
          )}
        </div>
      </div>

      {showAddItem && (
        <ItemFormModal
          packingListId={listId}
          onClose={() => setShowAddItem(false)}
          onSaved={() => { setShowAddItem(false); fetchDetail(); }}
        />
      )}
      {editItem && (
        <ItemFormModal
          packingListId={listId}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchDetail(); }}
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
    unit_price: item?.unit_price || '',
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

  const totalPrice = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0);
  const totalCbm = (parseFloat(form.cbm) || 0) * (parseFloat(form.quantity) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (item) {
        await api.put(`/packing-lists/${packingListId}/items/${item.id}`, form);
      } else {
        await api.post(`/packing-lists/${packingListId}/items`, form);
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
          <Input label={t('packing_list.unit_price') + ' ($)'} type="number" step="0.01" min="0" value={form.unit_price} onChange={set('unit_price')} error={errors.unit_price?.[0]} required />
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
          <div className="flex items-end">
            <div className="bg-green-50 rounded-lg px-4 py-2 w-full text-center">
              <div className="text-xs text-green-600">{t('packing_list.total')}</div>
              <div className="text-lg font-bold text-green-700">${totalPrice.toFixed(2)}</div>
              {totalCbm > 0 && <div className="text-xs text-gray-500 mt-1">{t('packing_list.total_cbm')}: {totalCbm.toFixed(4)} m³</div>}
            </div>
          </div>
        </div>

        <Input label={t('packing_list.item_notes')} value={form.notes} onChange={set('notes')} />

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
  const grandTotal = Number(packingList.total_amount || 0) + shippingCost;

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

        <div className="grid grid-cols-2 gap-4">
          <InfoCard label={t('packing_list.shipping_cost')} value={`$${shippingCost.toFixed(2)}`} className="text-blue-600 font-semibold" />
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
        <Textarea
          label={t('packing_list.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            onClick={() => onSave({ price_per_cbm: pricePerCbm || 0, notes: notes || null })}
            disabled={loading}
          >
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
