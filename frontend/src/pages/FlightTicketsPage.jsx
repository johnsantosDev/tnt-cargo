import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, Button, Input, Select, Table, Pagination, Badge, Spinner, Modal, Textarea } from '../components/ui';
import { Plus, Search, Download, Eye, Plane, Edit, Trash2, RotateCcw, Upload, Paperclip, MessageCircle } from 'lucide-react';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { sendViaWhatsApp } from '../utils/export';
import ExportButtons from '../components/ui/ExportButtons';
import toast from 'react-hot-toast';

const AIRLINES = [
  'Ethiopian Airlines', 'Kenya Airways', 'RwandAir', 'Air Tanzania',
  'Turkish Airlines', 'Emirates', 'Qatar Airways', 'Brussels Airlines',
  'Air France', 'KLM', 'South African Airways', 'EgyptAir',
  'FlySAA', 'ASKY Airlines', 'Congo Airways', 'Uganda Airlines',
  'British Airways', 'Lufthansa', 'Delta Air Lines', 'United Airlines',
  'Air China', 'China Southern', 'Fly Dubai', 'Air Arabia',
];

const AIRPORTS = [
  { code: 'FIH', city: 'Kinshasa', country: 'RDC' },
  { code: 'GOM', city: 'Goma', country: 'RDC' },
  { code: 'FBM', city: 'Lubumbashi', country: 'RDC' },
  { code: 'KIS', city: 'Kisangani', country: 'RDC' },
  { code: 'BKV', city: 'Bukavu', country: 'RDC' },
  { code: 'MDE', city: 'Mbuji-Mayi', country: 'RDC' },
  { code: 'NBO', city: 'Nairobi', country: 'Kenya' },
  { code: 'EBB', city: 'Entebbe', country: 'Uganda' },
  { code: 'KGL', city: 'Kigali', country: 'Rwanda' },
  { code: 'DAR', city: 'Dar es Salaam', country: 'Tanzania' },
  { code: 'JRO', city: 'Kilimandjaro', country: 'Tanzania' },
  { code: 'ADD', city: 'Addis-Abeba', country: 'Éthiopie' },
  { code: 'JNB', city: 'Johannesburg', country: 'Afrique du Sud' },
  { code: 'CPT', city: 'Le Cap', country: 'Afrique du Sud' },
  { code: 'CAI', city: 'Le Caire', country: 'Égypte' },
  { code: 'CMN', city: 'Casablanca', country: 'Maroc' },
  { code: 'ALG', city: 'Alger', country: 'Algérie' },
  { code: 'LOS', city: 'Lagos', country: 'Nigeria' },
  { code: 'ABJ', city: 'Abidjan', country: 'Côte d\'Ivoire' },
  { code: 'DKR', city: 'Dakar', country: 'Sénégal' },
  { code: 'DXB', city: 'Dubaï', country: 'EAU' },
  { code: 'DOH', city: 'Doha', country: 'Qatar' },
  { code: 'IST', city: 'Istanbul', country: 'Turquie' },
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'BRU', city: 'Bruxelles', country: 'Belgique' },
  { code: 'AMS', city: 'Amsterdam', country: 'Pays-Bas' },
  { code: 'LHR', city: 'Londres', country: 'Royaume-Uni' },
  { code: 'FRA', city: 'Francfort', country: 'Allemagne' },
  { code: 'JFK', city: 'New York', country: 'États-Unis' },
  { code: 'PEK', city: 'Pékin', country: 'Chine' },
  { code: 'PVG', city: 'Shanghai', country: 'Chine' },
  { code: 'CAN', city: 'Guangzhou', country: 'Chine' },
  { code: 'HKG', city: 'Hong Kong', country: 'Chine' },
  { code: 'SIN', city: 'Singapour', country: 'Singapour' },
  { code: 'BKK', city: 'Bangkok', country: 'Thaïlande' },
  { code: 'DEL', city: 'New Delhi', country: 'Inde' },
  { code: 'BOM', city: 'Mumbai', country: 'Inde' },
  { code: 'GRU', city: 'São Paulo', country: 'Brésil' },
];

export default function FlightTicketsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isManager = hasRole('admin') || hasRole('manager');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/flight-tickets', { params })
      .then(({ data }) => { setTickets(data.data); setMeta(data.meta || data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const fetchStats = useCallback(() => {
    api.get('/flight-tickets-stats').then(({ data }) => setStats(data)).catch(console.error);
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatMoney = (v, currency = 'USD') => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/flight-tickets/${id}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('flight_tickets.confirm_delete'))) return;
    try {
      await api.delete(`/flight-tickets/${id}`);
      fetchTickets();
      fetchStats();
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    }
  };

  const statusBadge = (status) => {
    const map = { reserved: 'yellow', confirmed: 'blue', paid: 'green', cancelled: 'gray', refunded: 'red' };
    const labels = {
      reserved: t('flight_tickets.status_reserved'),
      confirmed: t('flight_tickets.status_confirmed'),
      paid: t('flight_tickets.status_paid'),
      cancelled: t('flight_tickets.status_cancelled'),
      refunded: t('flight_tickets.status_refunded'),
    };
    return <Badge variant={map[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const columns = [
    { key: 'ticket_number', label: t('flight_tickets.ticket_no'), render: (row) => <span className="font-mono text-sm font-medium">{row.ticket_number}</span> },
    { key: 'passenger', label: t('flight_tickets.passenger'), render: (row) => row.passenger_name },
    { key: 'route', label: t('flight_tickets.route'), render: (row) => (
      <span className="text-sm">
        <span className="font-medium">{row.departure_airport}</span>
        <span className="text-gray-400 mx-1">→</span>
        <span className="font-medium">{row.arrival_airport}</span>
      </span>
    )},
    { key: 'airline', label: t('flight_tickets.airline'), render: (row) => row.airline },
    { key: 'departure', label: t('flight_tickets.departure'), render: (row) => formatDateTime(row.departure_date) },
    { key: 'class', label: t('flight_tickets.class'), render: (row) => {
      const classLabels = { economy: 'Éco', premium_economy: 'Éco+', business: 'Affaires', first: '1ère' };
      return <Badge variant="blue">{classLabels[row.travel_class] || row.travel_class}</Badge>;
    }},
    { key: 'total', label: t('flight_tickets.total'), render: (row) => <span className="font-medium">{formatMoney(row.total_price, row.currency)}</span> },
    { key: 'status', label: t('flight_tickets.status'), render: (row) => statusBadge(row.status) },
    {
      key: 'actions', label: '', render: (row) => (
        <div className="flex gap-1">
          <button onClick={() => setShowDetail(row)} className="p-1.5 text-gray-400 hover:text-primary-600" title={t('common.view')}><Eye className="w-4 h-4" /></button>
          <button onClick={() => setEditTicket(row)} className="p-1.5 text-gray-400 hover:text-blue-600" title={t('common.edit')}><Edit className="w-4 h-4" /></button>
          <button onClick={() => handleDownload(row.id)} className="p-1.5 text-gray-400 hover:text-green-600" title={t('flight_tickets.receipt')}><Download className="w-4 h-4" /></button>
          <button
            onClick={() => setWhatsappModal({
              phone: row.client?.phone || row.passenger_phone || '',
              fileName: `receipt-${row.id}.pdf`,
              getBlob: async () => { const r = await api.get(`/flight-tickets/${row.id}/receipt`, { responseType: 'blob' }); return r.data; },
            })}
            className="p-1.5 text-gray-400 hover:text-green-500"
            title="Envoyer via WhatsApp"
          ><MessageCircle className="w-4 h-4" /></button>
          {isManager && (
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600" title={t('common.delete')}><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          <Plane className="w-7 h-7 inline-block mr-2 text-primary-600" />
          {t('flight_tickets.title')}
        </h1>
        <Button onClick={() => { setEditTicket(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />{t('flight_tickets.create')}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">{t('flight_tickets.total_tickets')}</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_tickets || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-500">{t('flight_tickets.total_sales')}</div>
          <div className="text-2xl font-bold text-green-600">{formatMoney(stats.total_sales)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <div className="text-sm text-gray-500">{t('flight_tickets.collected')}</div>
          <div className="text-2xl font-bold text-indigo-600">{formatMoney(stats.total_collected)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-500">{t('flight_tickets.pending')}</div>
          <div className="text-2xl font-bold text-red-600">{formatMoney(stats.pending_payments)}</div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder={t('flight_tickets.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
            </div>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">{t('flight_tickets.all_statuses')}</option>
              <option value="reserved">{t('flight_tickets.status_reserved')}</option>
              <option value="confirmed">{t('flight_tickets.status_confirmed')}</option>
              <option value="paid">{t('flight_tickets.status_paid')}</option>
              <option value="cancelled">{t('flight_tickets.status_cancelled')}</option>
              <option value="refunded">{t('flight_tickets.status_refunded')}</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        {loading ? <Spinner /> : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
              <ExportButtons columns={columns} data={tickets} filename="billets-avion" />
            </div>
            <Table columns={columns} data={tickets} emptyMessage={t('flight_tickets.no_tickets')} />
            {meta.last_page > 1 && <div className="p-4 border-t"><Pagination meta={meta} onPageChange={setPage} /></div>}
          </>
        )}
      </Card>

      {showForm && (
        <TicketFormModal
          ticket={editTicket}
          onClose={() => { setShowForm(false); setEditTicket(null); }}
          onSaved={() => { setShowForm(false); setEditTicket(null); fetchTickets(); fetchStats(); }}
        />
      )}
      {showDetail && (
        <TicketDetailModal
          ticket={showDetail}
          onClose={() => setShowDetail(null)}
          onDownload={handleDownload}
          onWhatsApp={(ticket) => setWhatsappModal({
            phone: ticket.client?.phone || ticket.passenger_phone || '',
            fileName: `receipt-${ticket.id}.pdf`,
            getBlob: async () => { const r = await api.get(`/flight-tickets/${ticket.id}/receipt`, { responseType: 'blob' }); return r.data; },
          })}
          onEdit={(t) => { setShowDetail(null); setEditTicket(t); setShowForm(true); }}
        />
      )}
      {whatsappModal && (
        <WhatsAppSendModal
          phone={whatsappModal.phone}
          onClose={() => setWhatsappModal(null)}
          onSend={async (phone) => {
            try {
              const blob = await whatsappModal.getBlob();
              await sendViaWhatsApp(blob, whatsappModal.fileName, phone);
            } catch { toast.error(t('common.error')); }
            finally { setWhatsappModal(null); }
          }}
        />
      )}
    </div>
  );
}

/* ─── Client Searchable Select Component ─── */
function ClientSelect({ label, clients, clientId, clientName, onChange, error }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(() => !clientId && !!clientName);

  const filtered = query
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone?.toLowerCase().includes(query.toLowerCase()))
    : clients;

  const selected = clients.find(c => String(c.id) === String(clientId));

  if (isCustom) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          <button type="button" onClick={() => { setIsCustom(false); onChange('', ''); }}
            className="ml-2 text-xs text-primary-600 hover:underline">
            ← {t('flight_tickets.back_to_list')}
          </button>
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder={t('flight_tickets.custom_client_placeholder')}
          value={clientName}
          onChange={(e) => onChange('', e.target.value)}
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        className={`w-full rounded-lg border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
        placeholder={t('flight_tickets.search_client')}
        value={open ? query : (selected ? selected.name : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-400 italic"
            onMouseDown={(e) => { e.preventDefault(); onChange('', ''); setOpen(false); setQuery(''); }}
          >
            {t('flight_tickets.no_client')}
          </button>
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between"
              onMouseDown={(e) => { e.preventDefault(); onChange(c.id, ''); setOpen(false); setQuery(''); }}
            >
              <span className="font-medium">{c.name}</span>
              {c.phone && <span className="text-gray-400 text-xs">{c.phone}</span>}
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2 border-t border-gray-100 text-amber-700 font-medium"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              setIsCustom(true);
              onChange('', '');
            }}
          >
            <Plus className="w-4 h-4" />
            {t('flight_tickets.other_client')}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Airport Autocomplete Component ─── */
function AirportSelect({ label, value, onChange, error, required }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customAirport, setCustomAirport] = useState({ code: '', city: '', country: '' });
  const [results, setResults] = useState(AIRPORTS);

  useEffect(() => {
    if (!query) { setResults(AIRPORTS); return; }
    const q = query.toLowerCase();
    setResults(AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    ));
  }, [query]);

  // Check if value is a known airport
  const selected = AIRPORTS.find(a => a.code === value);

  // If value exists but not in list, it's custom (init only)
  const [initialized] = useState(() => {
    if (value && !AIRPORTS.find(a => a.code === value)) return true;
    return false;
  });
  if (initialized && !isCustom) setIsCustom(true);

  if (isCustom) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
          <button type="button" onClick={() => { setIsCustom(false); onChange({ code: '', city: '', country: '' }); }}
            className="ml-2 text-xs text-primary-600 hover:underline">
            ← {t('flight_tickets.back_to_list')}
          </button>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input type="text" placeholder={t('flight_tickets.airport_code')} value={customAirport.code}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onChange={(e) => { const v = e.target.value.toUpperCase(); setCustomAirport(p => ({ ...p, code: v })); onChange({ ...customAirport, code: v }); }} />
          <input type="text" placeholder={t('flight_tickets.city')} value={customAirport.city}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onChange={(e) => { setCustomAirport(p => ({ ...p, city: e.target.value })); onChange({ ...customAirport, city: e.target.value }); }} />
          <input type="text" placeholder={t('flight_tickets.country')} value={customAirport.country}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            onChange={(e) => { setCustomAirport(p => ({ ...p, country: e.target.value })); onChange({ ...customAirport, country: e.target.value }); }} />
        </div>
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        className={`w-full rounded-lg border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
        placeholder="Rechercher un aéroport..."
        value={open ? query : (selected ? `${selected.code} - ${selected.city} (${selected.country})` : '')}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.code}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(a);
                setOpen(false);
                setQuery('');
              }}
            >
              <span className="font-mono font-bold text-primary-600">{a.code}</span>
              <span>{a.city}</span>
              <span className="text-gray-400 text-xs">({a.country})</span>
            </button>
          ))}
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2 border-t border-gray-100 text-amber-700 font-medium"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              setIsCustom(true);
              setCustomAirport({ code: '', city: '', country: '' });
            }}
          >
            <Plus className="w-4 h-4" />
            {t('flight_tickets.other_airport')}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Ticket Form Modal ─── */
function TicketFormModal({ ticket, onClose, onSaved }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [customAirline, setCustomAirline] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [ticketFile, setTicketFile] = useState(null);
  const [form, setForm] = useState({
    client_id: ticket?.client_id || '',
    client_name: ticket?.client_name || '',
    passenger_name: ticket?.passenger_name || '',
    passenger_phone: ticket?.passenger_phone || '',
    passport_number: ticket?.passport_number || '',
    airline: ticket?.airline || '',
    flight_number: ticket?.flight_number || '',
    trip_type: ticket?.trip_type || 'one_way',
    departure_airport: ticket?.departure_airport || '',
    departure_city: ticket?.departure_city || '',
    departure_country: ticket?.departure_country || '',
    departure_date: ticket?.departure_date ? ticket.departure_date.slice(0, 16) : '',
    arrival_airport: ticket?.arrival_airport || '',
    arrival_city: ticket?.arrival_city || '',
    arrival_country: ticket?.arrival_country || '',
    arrival_date: ticket?.arrival_date ? ticket.arrival_date.slice(0, 16) : '',
    return_date: ticket?.return_date ? ticket.return_date.slice(0, 16) : '',
    travel_class: ticket?.travel_class || 'economy',
    ticket_price: ticket?.ticket_price || '',
    service_fee: ticket?.service_fee || '0',
    taxes: ticket?.taxes || '0',
    currency: ticket?.currency || 'USD',
    payment_method: ticket?.payment_method || '',
    amount_paid: ticket?.amount_paid || '0',
    notes: ticket?.notes || '',
  });

  // If editing and airline is not in list, it's custom (init only)
  const [airlineInit] = useState(() => {
    if (ticket?.airline && !AIRLINES.includes(ticket.airline)) return ticket.airline;
    return null;
  });
  if (airlineInit && !customAirline) {
    setCustomAirline(airlineInit);
    setForm(prev => ({ ...prev, airline: '__other__' }));
  }

  useEffect(() => {
    api.get('/clients', { params: { per_page: 200 } }).then(({ data }) => setClients(data.data)).catch(console.error);
  }, []);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const totalPrice = (parseFloat(form.ticket_price) || 0) + (parseFloat(form.service_fee) || 0) + (parseFloat(form.taxes) || 0);
  const balanceDue = totalPrice - (parseFloat(form.amount_paid) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const data = new FormData();
    // Build form data
    const submitForm = { ...form };
    if (submitForm.airline === '__other__') {
      submitForm.airline = customAirline;
    }

    Object.entries(submitForm).forEach(([key, value]) => {
      if (value !== null && value !== undefined) data.append(key, value);
    });

    if (paymentProofFile) data.append('payment_proof', paymentProofFile);
    if (ticketFile) data.append('ticket_file', ticketFile);

    try {
      if (ticket) {
        data.append('_method', 'PUT');
        await api.post(`/flight-tickets/${ticket.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/flight-tickets', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
      toast.success(t('common.saved'));
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={ticket ? t('flight_tickets.edit') : t('flight_tickets.create')} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1">

        {/* Passenger Info */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-600 px-2">{t('flight_tickets.passenger_info')}</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('flight_tickets.passenger_name')} value={form.passenger_name} onChange={(e) => setField('passenger_name', e.target.value)} error={errors.passenger_name?.[0]} required />
            <Input label={t('flight_tickets.phone')} value={form.passenger_phone} onChange={(e) => setField('passenger_phone', e.target.value)} />
            <Input label={t('flight_tickets.passport')} value={form.passport_number} onChange={(e) => setField('passport_number', e.target.value)} error={errors.passport_number?.[0]} />
            <ClientSelect
              label={t('flight_tickets.client_link')}
              clients={clients}
              clientId={form.client_id}
              clientName={form.client_name}
              onChange={(id, name) => { setField('client_id', id); setField('client_name', name); }}
              error={errors.client_id?.[0] || errors.client_name?.[0]}
            />
          </div>
        </fieldset>

        {/* Flight Details */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-600 px-2">{t('flight_tickets.flight_info')}</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select label={t('flight_tickets.airline')} value={form.airline} onChange={(e) => { setField('airline', e.target.value); if (e.target.value !== '__other__') setCustomAirline(''); }} error={errors.airline?.[0]} required>
                <option value="">{t('common.select')}</option>
                {AIRLINES.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="__other__">{t('flight_tickets.other_airline')}</option>
              </Select>
              {form.airline === '__other__' && (
                <Input className="mt-2" placeholder={t('flight_tickets.custom_airline_placeholder')} value={customAirline} onChange={(e) => setCustomAirline(e.target.value)} required />
              )}
            </div>
            <Input label={t('flight_tickets.flight_no')} value={form.flight_number} onChange={(e) => setField('flight_number', e.target.value)} placeholder="Ex: ET 807" />
            <Select label={t('flight_tickets.trip_type')} value={form.trip_type} onChange={(e) => setField('trip_type', e.target.value)} required>
              <option value="one_way">{t('flight_tickets.one_way')}</option>
              <option value="round_trip">{t('flight_tickets.round_trip')}</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Plane className="w-4 h-4" /> {t('flight_tickets.departure')}
              </h4>
              <AirportSelect
                label={t('flight_tickets.airport')}
                value={form.departure_airport}
                onChange={(a) => { setField('departure_airport', a.code); setField('departure_city', a.city); setField('departure_country', a.country); }}
                error={errors.departure_airport?.[0]}
                required
              />
              <Input label={t('flight_tickets.date_time')} type="datetime-local" value={form.departure_date} onChange={(e) => setField('departure_date', e.target.value)} error={errors.departure_date?.[0]} required />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Plane className="w-4 h-4 rotate-90" /> {t('flight_tickets.arrival')}
              </h4>
              <AirportSelect
                label={t('flight_tickets.airport')}
                value={form.arrival_airport}
                onChange={(a) => { setField('arrival_airport', a.code); setField('arrival_city', a.city); setField('arrival_country', a.country); }}
                error={errors.arrival_airport?.[0]}
                required
              />
              <Input label={t('flight_tickets.date_time')} type="datetime-local" value={form.arrival_date} onChange={(e) => setField('arrival_date', e.target.value)} />
            </div>
          </div>

          {form.trip_type === 'round_trip' && (
            <div className="mt-4">
              <Input label={t('flight_tickets.return_date')} type="datetime-local" value={form.return_date} onChange={(e) => setField('return_date', e.target.value)} error={errors.return_date?.[0]} required />
            </div>
          )}

          <div className="mt-4">
            <Select label={t('flight_tickets.class')} value={form.travel_class} onChange={(e) => setField('travel_class', e.target.value)} required>
              <option value="economy">{t('flight_tickets.economy')}</option>
              <option value="premium_economy">{t('flight_tickets.premium_economy')}</option>
              <option value="business">{t('flight_tickets.business')}</option>
              <option value="first">{t('flight_tickets.first_class')}</option>
            </Select>
          </div>
        </fieldset>

        {/* Pricing & Payment */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-600 px-2">{t('flight_tickets.pricing')}</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label={t('flight_tickets.ticket_price')} type="number" step="0.01" min="0" value={form.ticket_price} onChange={(e) => setField('ticket_price', e.target.value)} error={errors.ticket_price?.[0]} required />
            <Input label={t('flight_tickets.service_fee')} type="number" step="0.01" min="0" value={form.service_fee} onChange={(e) => setField('service_fee', e.target.value)} />
            <Input label={t('flight_tickets.taxes')} type="number" step="0.01" min="0" value={form.taxes} onChange={(e) => setField('taxes', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select label={t('flight_tickets.currency')} value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
              <option value="EUR">EUR</option>
              <option value="RWF">RWF</option>
              <option value="KES">KES</option>
              <option value="CNY">CNY</option>
            </Select>
            <Select label={t('flight_tickets.payment_method')} value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value)}>
              <option value="">{t('common.select')}</option>
              <option value="cash">{t('flight_tickets.cash')}</option>
              <option value="bank_transfer">{t('flight_tickets.bank_transfer')}</option>
              <option value="mobile_money">{t('flight_tickets.mobile_money')}</option>
              <option value="card">{t('flight_tickets.card')}</option>
              <option value="other">{t('flight_tickets.other')}</option>
            </Select>
            <Input label={t('flight_tickets.amount_paid')} type="number" step="0.01" min="0" value={form.amount_paid} onChange={(e) => setField('amount_paid', e.target.value)} />
          </div>

          {/* Price Summary */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span>{t('flight_tickets.ticket_price')}:</span><span>{(parseFloat(form.ticket_price) || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('flight_tickets.service_fee')}:</span><span>{(parseFloat(form.service_fee) || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>{t('flight_tickets.taxes')}:</span><span>{(parseFloat(form.taxes) || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>{t('flight_tickets.total')}:</span><span>{totalPrice.toFixed(2)} {form.currency}</span></div>
            <div className="flex justify-between text-green-600"><span>{t('flight_tickets.amount_paid')}:</span><span>{(parseFloat(form.amount_paid) || 0).toFixed(2)}</span></div>
            <div className={`flex justify-between font-medium ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>{t('flight_tickets.balance')}:</span><span>{balanceDue.toFixed(2)} {form.currency}</span>
            </div>
          </div>
        </fieldset>

        {/* File Attachments */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-600 px-2">{t('flight_tickets.attachments')}</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Upload className="w-4 h-4 inline mr-1" />
                {t('flight_tickets.payment_proof')}
              </label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setPaymentProofFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
              {ticket?.payment_proof_path && !paymentProofFile && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {t('flight_tickets.file_attached')}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Upload className="w-4 h-4 inline mr-1" />
                {t('flight_tickets.ticket_file')}
              </label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setTicketFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
              {ticket?.ticket_file_path && !ticketFile && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {t('flight_tickets.file_attached')}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Notes */}
        <Textarea label={t('flight_tickets.notes')} value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-white pb-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>
            <Plane className="w-4 h-4 mr-2" />
            {ticket ? t('common.save') : t('flight_tickets.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Ticket Detail Modal ─── */
function TicketDetailModal({ ticket, onClose, onDownload, onWhatsApp, onEdit }) {
  const { t } = useTranslation();
  const formatMoney = (v) => `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${ticket.currency}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '-';

  const statusBadge = (status) => {
    const map = { reserved: 'yellow', confirmed: 'blue', paid: 'green', cancelled: 'gray', refunded: 'red' };
    const labels = {
      reserved: t('flight_tickets.status_reserved'),
      confirmed: t('flight_tickets.status_confirmed'),
      paid: t('flight_tickets.status_paid'),
      cancelled: t('flight_tickets.status_cancelled'),
      refunded: t('flight_tickets.status_refunded'),
    };
    return <Badge variant={map[status] || 'gray'}>{labels[status] || status}</Badge>;
  };

  const classLabels = { economy: t('flight_tickets.economy'), premium_economy: t('flight_tickets.premium_economy'), business: t('flight_tickets.business'), first: t('flight_tickets.first_class') };
  const methodLabels = { cash: t('flight_tickets.cash'), bank_transfer: t('flight_tickets.bank_transfer'), mobile_money: t('flight_tickets.mobile_money'), card: t('flight_tickets.card'), other: t('flight_tickets.other') };

  return (
    <Modal isOpen onClose={onClose} title={`${t('flight_tickets.ticket')} ${ticket.ticket_number}`} size="lg">
      <div className="space-y-5">
        {/* Status & Actions row */}
        <div className="flex items-center justify-between">
          {statusBadge(ticket.status)}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => onEdit(ticket)}>
              <Edit className="w-4 h-4 mr-1" />{t('common.edit')}
            </Button>
            <button
              onClick={() => onWhatsApp(ticket)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg"
              title="Envoyer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />WhatsApp
            </button>
            <Button size="sm" onClick={() => onDownload(ticket.id)}>
              <Download className="w-4 h-4 mr-1" />{t('flight_tickets.receipt')}
            </Button>
          </div>
        </div>

        {/* Flight Route Visual */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{ticket.departure_airport}</div>
              <div className="text-sm text-gray-600">{ticket.departure_city}</div>
              <div className="text-xs text-gray-400">{ticket.departure_country}</div>
              <div className="text-xs text-gray-500 mt-1">{formatDateTime(ticket.departure_date)}</div>
            </div>
            <div className="flex-1 mx-4 flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">{ticket.airline}</div>
              <div className="w-full border-t-2 border-dashed border-blue-300 relative">
                <Plane className="w-5 h-5 text-blue-600 absolute -top-2.5 left-1/2 -translate-x-1/2" />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {ticket.trip_type === 'round_trip' ? t('flight_tickets.round_trip') : t('flight_tickets.one_way')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{ticket.arrival_airport}</div>
              <div className="text-sm text-gray-600">{ticket.arrival_city}</div>
              <div className="text-xs text-gray-400">{ticket.arrival_country}</div>
              {ticket.arrival_date && <div className="text-xs text-gray-500 mt-1">{formatDateTime(ticket.arrival_date)}</div>}
            </div>
          </div>
          {ticket.trip_type === 'round_trip' && ticket.return_date && (
            <div className="mt-3 pt-3 border-t border-blue-200 text-center text-sm text-gray-600">
              <RotateCcw className="w-4 h-4 inline mr-1" />
              {t('flight_tickets.return')}: {formatDateTime(ticket.return_date)}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><span className="text-gray-500">{t('flight_tickets.passenger')}:</span> <span className="font-medium">{ticket.passenger_name}</span></div>
          {ticket.passport_number && <div><span className="text-gray-500">{t('flight_tickets.passport')}:</span> <span className="font-medium">{ticket.passport_number}</span></div>}
          {ticket.passenger_phone && <div><span className="text-gray-500">{t('flight_tickets.phone')}:</span> <span className="font-medium">{ticket.passenger_phone}</span></div>}
          {ticket.passenger_email && <div><span className="text-gray-500">{t('flight_tickets.email')}:</span> <span className="font-medium">{ticket.passenger_email}</span></div>}
          {(ticket.client || ticket.client_name) && <div><span className="text-gray-500">{t('flight_tickets.client_link')}:</span> <span className="font-medium">{ticket.client?.name || ticket.client_name}</span></div>}
          {ticket.flight_number && <div><span className="text-gray-500">{t('flight_tickets.flight_no')}:</span> <span className="font-mono font-medium">{ticket.flight_number}</span></div>}
          <div><span className="text-gray-500">{t('flight_tickets.class')}:</span> <span className="font-medium">{classLabels[ticket.travel_class]}</span></div>
          {ticket.payment_method && <div><span className="text-gray-500">{t('flight_tickets.payment_method')}:</span> <span className="font-medium">{methodLabels[ticket.payment_method]}</span></div>}
        </div>

        {/* Pricing */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">{t('flight_tickets.ticket_price')}</span><span>{formatMoney(ticket.ticket_price)}</span></div>
          {ticket.service_fee > 0 && <div className="flex justify-between"><span className="text-gray-600">{t('flight_tickets.service_fee')}</span><span>{formatMoney(ticket.service_fee)}</span></div>}
          {ticket.taxes > 0 && <div className="flex justify-between"><span className="text-gray-600">{t('flight_tickets.taxes')}</span><span>{formatMoney(ticket.taxes)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-2 border-t"><span>{t('flight_tickets.total')}</span><span className="text-blue-700">{formatMoney(ticket.total_price)}</span></div>
          <div className="flex justify-between text-green-600 font-medium"><span>{t('flight_tickets.amount_paid')}</span><span>{formatMoney(ticket.amount_paid)}</span></div>
          {ticket.balance_due > 0 && (
            <div className="flex justify-between text-red-600 font-medium"><span>{t('flight_tickets.balance')}</span><span>{formatMoney(ticket.balance_due)}</span></div>
          )}
        </div>

        {ticket.notes && (
          <div className="bg-yellow-50 rounded-lg p-3 text-sm">
            <span className="font-medium text-yellow-800">{t('flight_tickets.notes')}:</span> {ticket.notes}
          </div>
        )}

        {/* Attached Files */}
        {(ticket.payment_proof_path || ticket.ticket_file_path) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-600">{t('flight_tickets.attachments')}</h4>
            <div className="flex flex-wrap gap-3">
              {ticket.payment_proof_path && (
                <a href={`${api.defaults.baseURL}/flight-tickets/${ticket.id}/proof`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-colors">
                  <Paperclip className="w-4 h-4" /> {t('flight_tickets.payment_proof')}
                </a>
              )}
              {ticket.ticket_file_path && (
                <a href={`${api.defaults.baseURL}/flight-tickets/${ticket.id}/ticket-file`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-primary-600 hover:bg-primary-50 transition-colors">
                  <Paperclip className="w-4 h-4" /> {t('flight_tickets.ticket_file')}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
