import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Modal, Input, Select, Textarea, Button } from '../../components/ui';

export default function ShipmentFormModal({ editId, statuses, onClose, onSaved }) {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    client_id: '', origin: 'china', destination: 'Goma', description: '', weight: '', volume: '',
    shipping_cost: '', customs_fee: '', other_fees: '',
    notes: '', status_id: ''
  });

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } })
      .then(({ data }) => setClients(data.data))
      .catch(console.error);

    if (editId) {
      api.get(`/shipments/${editId}`).then(({ data }) => {
        const s = data.data || data;
        setForm({
          client_id: s.client_id || '',
          origin: s.origin || 'china',
          destination: s.destination || 'Goma',
          description: s.description || '',
          weight: s.weight || '',
          volume: s.volume || '',
          shipping_cost: s.shipping_cost || '',
          customs_fee: s.customs_fee || '',
          other_fees: s.other_fees || '',
          notes: s.special_instructions || '',
          status_id: s.status_id || ''
        });
      });
    }
  }, [editId]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = { ...form, special_instructions: form.notes };
      delete payload.notes;
      if (!editId) delete payload.status_id;
      if (editId) {
        await api.put(`/shipments/${editId}`, payload);
      } else {
        await api.post('/shipments', payload);
      }
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={editId ? t('shipments.edit') : t('shipments.create')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t('shipments.client')} value={form.client_id} onChange={set('client_id')} error={errors.client_id?.[0]} required>
            <option value="">{t('common.select')}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={t('shipments.origin')} value={form.origin} onChange={set('origin')} error={errors.origin?.[0]}>
            <option value="china">Chine</option>
            <option value="dubai">Dubaï</option>
            <option value="turkey">Turquie</option>
            <option value="other">Autre</option>
          </Select>
        </div>

        <Select label={t('shipments.destination')} value={form.destination} onChange={set('destination')} error={errors.destination?.[0]}>
          <option value="Goma">Goma</option>
          <option value="Lubumbashi">Lubumbashi</option>
          <option value="Kinshasa">Kinshasa</option>
          <option value="Beni">Beni</option>
          <option value="Butembo">Butembo</option>
          <option value="Bunia">Bunia</option>
          <option value="Bukavu">Bukavu</option>
          <option value="Autre">Autre</option>
        </Select>

        <Textarea label={t('shipments.description')} value={form.description} onChange={set('description')} error={errors.description?.[0]} rows={2} required />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label={t('shipments.weight')} type="number" step="0.01" value={form.weight} onChange={set('weight')} error={errors.weight?.[0]} />
          <Input label={t('shipments.cbm')} type="number" step="0.01" value={form.volume} onChange={set('volume')} error={errors.volume?.[0]} />
          {editId && (
            <Select label={t('shipments.status')} value={form.status_id} onChange={set('status_id')}>
              <option value="">{t('common.select')}</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label={t('shipments.shipping_fee')} type="number" step="0.01" value={form.shipping_cost} onChange={set('shipping_cost')} error={errors.shipping_cost?.[0]} />
          <Input label={t('shipments.customs_fee')} type="number" step="0.01" value={form.customs_fee} onChange={set('customs_fee')} error={errors.customs_fee?.[0]} />
          <Input label={t('shipments.other_fees')} type="number" step="0.01" value={form.other_fees} onChange={set('other_fees')} error={errors.other_fees?.[0]} />
        </div>

        <Textarea label={t('shipments.notes')} value={form.notes} onChange={set('notes')} rows={2} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{editId ? t('common.save') : t('shipments.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
