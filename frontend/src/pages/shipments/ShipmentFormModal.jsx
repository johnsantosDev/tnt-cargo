import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Modal, Input, Select, Textarea, Button } from '../../components/ui';
import SearchableSelect from '../../components/ui/SearchableSelect';

export default function ShipmentFormModal({ editId, statuses, onClose, onSaved }) {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    client_id: '', container_code: '', origin: 'china', destination: 'Goma', description: '', weight: '', volume: '',
    shipping_cost: '', customs_fee: '', other_fees: '',
    notes: '', status_id: '', estimated_arrival: '', cargo_type: 'sea', flight_reference: ''
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
          container_code: s.package_type === 'sea' ? (s.container_code || '') : '',
          origin: s.origin || 'china',
          destination: s.destination || 'Goma',
          description: s.description || '',
          weight: s.weight || '',
          volume: s.volume || '',
          shipping_cost: s.shipping_cost || '',
          customs_fee: s.customs_fee || '',
          other_fees: s.other_fees || '',
          notes: s.special_instructions || '',
          status_id: s.status_id || '',
          estimated_arrival: s.estimated_arrival?.split('T')[0] || '',
          cargo_type: s.package_type || 'sea',
          flight_reference: s.package_type === 'air' ? (s.container_code || '') : '',
        });
      });
    }
  }, [editId]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setArrival = (weeks, months = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    d.setMonth(d.getMonth() + months);
    setForm(prev => ({ ...prev, estimated_arrival: d.toISOString().split('T')[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = { ...form, special_instructions: form.notes, package_type: form.cargo_type };
      payload.container_code = form.cargo_type === 'sea' ? form.container_code : form.flight_reference;
      delete payload.notes;
      delete payload.cargo_type;
      delete payload.flight_reference;
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
    <Modal isOpen onClose={onClose} title={editId ? t('shipments.edit') : t('shipments.create')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label={t('shipments.client')}
            value={form.client_id}
            onChange={set('client_id')}
            options={clients.map(c => ({ value: c.id, label: c.name }))}
            error={errors.client_id?.[0]}
            required
            placeholder={t('common.select')}
          />
          <Select label={t('shipments.origin')} value={form.origin} onChange={set('origin')} error={errors.origin?.[0]}>
            <option value="china">Chine</option>
            <option value="dubai">Dubaï</option>
            <option value="turkey">Turquie</option>
            <option value="other">Autre</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t('shipments.cargo_type')} value={form.cargo_type} onChange={set('cargo_type')}>
            <option value="sea">{t('shipments.cargo_sea')}</option>
            <option value="air">{t('shipments.cargo_air')}</option>
          </Select>
          {form.cargo_type === 'sea' ? (
            <Input label={t('shipments.container_code')} value={form.container_code} onChange={set('container_code')} error={errors.container_code?.[0]} placeholder="Ex: CNTR-2026-001" />
          ) : (
            <Input label={t('shipments.flight_reference')} value={form.flight_reference} onChange={set('flight_reference')} placeholder="Ex: TK-1920" />
          )}
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

        {/* Estimated Arrival with Quick Presets */}
        <div>
          <Input label={t('shipments.estimated_arrival')} type="date" value={form.estimated_arrival} onChange={set('estimated_arrival')} error={errors.estimated_arrival?.[0]} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {arrivalPresets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setArrival(p.weeks, p.months || 0)}
                className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
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
