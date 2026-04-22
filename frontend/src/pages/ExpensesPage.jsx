import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal, Textarea } from '../components/ui';
import { Plus, Search, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import ExportButtons from '../components/ui/ExportButtons';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchExpenses = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/expenses', { params })
      .then(({ data }) => { setExpenses(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const formatMoney = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  const handleApprove = async (id) => {
    await api.post(`/expenses/${id}/approve`);
    fetchExpenses();
  };
  const handleReject = async (id) => {
    await api.post(`/expenses/${id}/reject`);
    fetchExpenses();
  };
  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
      toast.success(t('common.deleted'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const statusBadge = (status) => {
    const map = { pending: 'yellow', approved: 'green', rejected: 'red' };
    const labels = { pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté' };
    return <Badge variant={map[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const columns = [
    { key: 'reference', label: t('expenses.reference'), render: (row) => <span className="font-mono text-sm">{row.reference}</span> },
    { key: 'category', label: t('expenses.category') },
    { key: 'description', label: t('expenses.description'), render: (row) => <span className="truncate max-w-[200px] block">{row.description}</span> },
    { key: 'amount', label: t('expenses.amount'), render: (row) => <span className="font-medium">{formatMoney(row.amount)}</span> },
    { key: 'date', label: t('expenses.date'), render: (row) => formatDate(row.expense_date) },
    { key: 'status', label: t('expenses.status'), render: (row) => statusBadge(row.status) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          {row.status === 'pending' && hasPermission('expenses.approve') && (
            <>
              <button onClick={() => handleApprove(row.id)} className="p-1.5 text-gray-400 hover:text-green-600" title="Approuver"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => handleReject(row.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Rejeter"><XCircle className="w-4 h-4" /></button>
            </>
          )}
          {hasPermission('expenses.edit') && <button onClick={() => { setEditData(row); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>}
          {hasPermission('expenses.delete') && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('expenses.title')}</h1>
        {hasPermission('expenses.create') && (
          <Button onClick={() => { setEditData(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />{t('expenses.create')}
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('expenses.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('expenses.all_statuses')}</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={expenses} filename="depenses" />
            </div>
            <Table columns={columns} data={expenses} emptyMessage={t('expenses.no_expenses')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <ExpenseFormModal data={editData} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchExpenses(); }} />}
    </div>
  );
}

function ExpenseFormModal({ data, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    category: data?.category || '', description: data?.description || '',
    amount: data?.amount || '', expense_date: data?.expense_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: data?.notes || ''
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (data?.id) await api.put(`/expenses/${data.id}`, form);
      else await api.post('/expenses', form);
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('expenses.edit') : t('expenses.create')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label={t('expenses.category')} value={form.category} onChange={set('category')} error={errors.category?.[0]} required>
          <option value="">{t('common.select')}</option>
          <option value="transport">Transport</option>
          <option value="warehouse">Entrepôt</option>
          <option value="customs">Douane</option>
          <option value="salary">Salaire</option>
          <option value="office">Bureau</option>
          <option value="communication">Communication</option>
          <option value="other">Autre</option>
        </Select>
        <Textarea label={t('expenses.description')} value={form.description} onChange={set('description')} error={errors.description?.[0]} rows={2} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('expenses.amount')} type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount?.[0]} required />
          <Input label={t('expenses.date')} type="date" value={form.expense_date} onChange={set('expense_date')} />
        </div>
        <Textarea label={t('common.notes')} value={form.notes} onChange={set('notes')} rows={2} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{data ? t('common.save') : t('expenses.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
