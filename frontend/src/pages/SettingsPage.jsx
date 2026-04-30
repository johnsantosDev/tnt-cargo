import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal, Textarea } from '../components/ui';
import { Settings, Users, Shield, Clock, Plus, Edit2, Trash2, Save, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { hasPermission, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const canManageUsers = hasRole('admin') || hasRole('manager');
  const isAdmin = hasRole('admin');
  const canManageRoles = isAdmin;

  const tabs = [
    { key: 'general', label: t('settings.general'), icon: Settings },
    { key: 'account', label: t('settings.my_account') || 'Mon compte', icon: KeyRound },
    ...(canManageUsers ? [{ key: 'users', label: t('settings.users'), icon: Users }] : []),
    ...(canManageRoles ? [{ key: 'roles', label: t('settings.roles'), icon: Shield }] : []),
    { key: 'audit', label: t('settings.audit_logs'), icon: Clock }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${activeTab === key ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'account' && <MyAccountSettings />}
      {activeTab === 'users' && canManageUsers && <UsersSettings isAdmin={isAdmin} />}
      {activeTab === 'roles' && canManageRoles && <RolesSettings />}
      {activeTab === 'audit' && <AuditLogs />}
    </div>
  );
}

function GeneralSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings(data.data || data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of settings) {
        await api.put(`/settings/${s.id}`, { value: s.value });
      }
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error(t('common.error'));
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  const groups = {};
  settings.forEach((s) => {
    const group = s.group || 'general';
    if (!groups[group]) groups[group] = [];
    groups[group].push(s);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([group, items]) => (
        <Card key={group}>
          <CardHeader><h3 className="font-semibold capitalize">{group}</h3></CardHeader>
          <CardBody className="space-y-4">
            {items.map((s) => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-700 sm:w-1/3">{s.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                <Input value={s.value || ''} onChange={(e) => updateSetting(s.key, e.target.value)} className="sm:w-2/3" />
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}><Save className="w-4 h-4 mr-2" />{t('settings.save')}</Button>
      </div>
    </div>
  );
}

function MyAccountSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.put('/change-password', form);
      toast.success(t('settings.password_changed') || 'Mot de passe modifié avec succès.');
      setForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader><h3 className="font-semibold">{t('settings.change_password') || 'Changer le mot de passe'}</h3></CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input label={t('settings.current_password') || 'Mot de passe actuel'} type="password" value={form.current_password} onChange={set('current_password')} error={errors.current_password?.[0]} required />
          <Input label={t('settings.new_password') || 'Nouveau mot de passe'} type="password" value={form.password} onChange={set('password')} error={errors.password?.[0]} required />
          <Input label={t('settings.password_confirmation')} type="password" value={form.password_confirmation} onChange={set('password_confirmation')} required />
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={loading}><Save className="w-4 h-4 mr-2" />{t('settings.save')}</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function UsersSettings({ isAdmin }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/settings/users', { params: { page } })
      .then(({ data }) => { setUsers(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    api.get('/settings/roles').then(({ data }) => setRoles(data.data || data)).catch(console.error);
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    await api.delete(`/settings/users/${id}`);
    fetchUsers();
  };

  const columns = [
    { key: 'name', label: t('settings.user_name'), render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', label: t('settings.user_email') },
    { key: 'phone', label: t('settings.phone') },
    { key: 'roles', label: t('settings.role'), render: (row) => row.roles?.map((r) => <Badge key={r.id} variant="blue">{r.name}</Badge>) },
    { key: 'is_active', label: t('settings.active'), render: (row) => <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Actif' : 'Inactif'}</Badge> },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditData(row); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>
          {isAdmin && (
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditData(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />{t('settings.add_user')}
        </Button>
      </div>
      <Card>
        {loading ? <Spinner /> : (
          <>
            <Table columns={columns} data={users} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && <UserFormModal isAdmin={isAdmin} data={editData} roles={roles} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchUsers(); }} />}
    </div>
  );
}

function UserFormModal({ isAdmin, data, roles, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: data?.name || '', email: data?.email || '', phone: data?.phone || '',
    password: '', password_confirmation: '', role: data?.roles?.[0]?.name || 'agent',
    is_active: data?.is_active ?? true, region: data?.region || ''
  });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const payload = { ...form };
    if (!payload.password) { delete payload.password; delete payload.password_confirmation; }
    if (!isAdmin) {
      delete payload.role;
    }
    try {
      if (data?.id) await api.put(`/settings/users/${data.id}`, payload);
      else await api.post('/settings/users', payload);
      onSaved();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={data ? t('settings.edit_user') : t('settings.add_user')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('settings.user_name')} value={form.name} onChange={set('name')} error={errors.name?.[0]} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('settings.user_email')} type="email" value={form.email} onChange={set('email')} error={errors.email?.[0]} required />
          <Input label={t('settings.phone')} value={form.phone} onChange={set('phone')} error={errors.phone?.[0]} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('settings.password')} type="password" value={form.password} onChange={set('password')} error={errors.password?.[0]} required={!data} placeholder={data ? 'Laisser vide pour ne pas changer' : ''} />
          <Input label={t('settings.password_confirmation')} type="password" value={form.password_confirmation} onChange={set('password_confirmation')} required={!data} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {isAdmin ? (
            <Select label={t('settings.role')} value={form.role} onChange={set('role')}>
              {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </Select>
          ) : (
            <Input label={t('settings.role')} value={form.role} disabled />
          )}
          <Select label={t('settings.active')} value={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'true' }))}>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </Select>
        </div>
        <Select label={t('settings.region')} value={form.region} onChange={set('region')} error={errors.region?.[0]}>
          <option value="">{t('dashboard.all_regions') || 'Toutes les régions'}</option>
          {['Goma','Beni','Butembo','Lubumbashi','Kolwezi','Kinshasa','Bukavu','China','Dubai'].map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{data ? t('common.save') : t('settings.add_user')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RolesSettings() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/roles').then(({ data }) => setRoles(data.data || data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader>
            <h3 className="font-semibold capitalize">{role.name}</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {role.permissions?.map((p) => (
                <Badge key={p.id} variant="blue">{p.name}</Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function AuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get('/settings/audit-logs', { params: { page, per_page: 20 } })
      .then(({ data }) => { setLogs(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const formatDate = (d) => d ? new Date(d).toLocaleString('fr-FR') : '-';

  const columns = [
    { key: 'user', label: t('settings.user'), render: (row) => row.user?.name || 'Système' },
    { key: 'action', label: t('settings.action'), render: (row) => <Badge variant={row.action === 'delete' ? 'red' : row.action === 'create' ? 'green' : 'blue'}>{row.action}</Badge> },
    { key: 'model', label: t('settings.model'), render: (row) => `${row.model_type?.split('\\').pop() || '?'} #${row.model_id || '?'}` },
    { key: 'description', label: t('settings.description'), render: (row) => <span className="text-sm truncate max-w-[300px] block">{row.description}</span> },
    { key: 'ip', label: 'IP', render: (row) => <span className="font-mono text-xs">{row.ip_address}</span> },
    { key: 'date', label: t('settings.date'), render: (row) => formatDate(row.created_at) }
  ];

  return (
    <Card>
      {loading ? <Spinner /> : (
        <>
          <Table columns={columns} data={logs} />
          {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
        </>
      )}
    </Card>
  );
}
