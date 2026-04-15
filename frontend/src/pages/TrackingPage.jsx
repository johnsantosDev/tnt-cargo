import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Package, CheckCircle, Clock, MapPin, ArrowLeft, AlertCircle, Truck, Warehouse, Anchor, Box, CircleDot, Plane } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TrackingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { trackingNumber, shareToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState(trackingNumber || '');

  useEffect(() => {
    if (trackingNumber || shareToken) {
      setLoading(true);
      setError(false);
      const url = shareToken ? `/track/share/${shareToken}` : `/track/${trackingNumber}`;
      api.get(url)
        .then(({ data }) => setData(data))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [trackingNumber, shareToken]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/tracking/${searchInput.trim()}`);
    }
  };

  const shipment = data?.shipment;
  const timeline = data?.timeline || [];
  const allStatuses = data?.all_statuses || [];

  const getStatusIcon = (slug) => {
    const icons = {
      'pending': CircleDot, 'warehouse': Warehouse, 'in-transit': Plane,
      'customs': Box, 'arrived': Anchor, 'delivered': CheckCircle, 'cancelled': AlertCircle
    };
    return icons[slug] || CircleDot;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            <span className="text-lg font-bold text-gray-900">TNT Cargo</span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />{t('tracking.back')}
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Bar - hidden when accessed via share token */}
        {!shareToken && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">{t('tracking.title')}</h1>
          <form onSubmit={handleSearch}>
            <div className="flex bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="flex items-center pl-4 text-gray-400">
                <Package className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('tracking.placeholder')}
                className="flex-1 px-4 py-4 text-base outline-none border-none focus:ring-0"
              />
              <button type="submit" className="px-8 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors">
                {t('tracking.search')}
              </button>
            </div>
          </form>
        </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-4">{t('tracking.loading')}</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-sm">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('tracking.not_found')}</h2>
            <p className="text-gray-500">{t('tracking.not_found_desc')}</p>
          </div>
        )}

        {!loading && !error && shipment && (
          <div className="space-y-6">
            {/* Shipment Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-primary-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-80">{t('tracking.tracking_number')}</p>
                    <h2 className="text-2xl font-bold font-mono mt-1">{shipment.tracking_number}</h2>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <QRCodeSVG value={window.location.href} size={72} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 mb-4">{shipment.description}</p>
                
                {/* Route visualization */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Plane className="w-5 h-5 text-primary-600" />
                    </div>
                    <p className="text-xs text-gray-500">{t('tracking.origin')}</p>
                    <p className="font-semibold text-gray-900 capitalize">{shipment.origin}</p>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="h-0.5 flex-1 bg-primary-300" />
                    <Truck className="w-5 h-5 text-primary-500 mx-2 shrink-0" />
                    <div className="h-0.5 flex-1 bg-primary-300" />
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500">{t('tracking.destination')}</p>
                    <p className="font-semibold text-gray-900">{shipment.destination}</p>
                  </div>
                </div>

                {/* Current Status Banner */}
                <div className="mt-4 p-4 rounded-xl bg-primary-50 border border-primary-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-primary-600 font-medium uppercase">{t('tracking.current_status')}</p>
                    <p className="text-lg font-bold text-primary-800">{shipment.current_status?.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Progress Bar */}
            {allStatuses.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-6">{t('tracking.progress')}</h3>
                <div className="relative">
                  {/* Background line */}
                  <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded" />
                  {/* Active line */}
                  {(() => {
                    const currentIdx = allStatuses.findIndex(s => s.id === shipment.current_status?.id);
                    const pct = currentIdx >= 0 ? (currentIdx / Math.max(allStatuses.length - 1, 1)) * 100 : 0;
                    return <div className="absolute top-5 left-5 h-1 bg-green-500 rounded transition-all" style={{ width: `calc(${pct}% - 20px)` }} />;
                  })()}
                  <div className="flex justify-between relative">
                    {allStatuses.map((s, i) => {
                      const currentIdx = allStatuses.findIndex(ss => ss.id === shipment.current_status?.id);
                      const isPast = i < currentIdx;
                      const isCurrent = i === currentIdx;
                      const Icon = getStatusIcon(s.slug);
                      return (
                        <div key={s.id} className="flex flex-col items-center" style={{ width: `${100 / allStatuses.length}%` }}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                            isCurrent ? 'bg-primary-600 border-primary-600 text-white scale-110 shadow-lg shadow-primary-200' :
                            isPast ? 'bg-green-500 border-green-500 text-white' :
                            'bg-white border-gray-300 text-gray-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className={`text-xs mt-2 text-center leading-tight ${
                            isCurrent ? 'font-bold text-primary-700' :
                            isPast ? 'font-medium text-green-700' :
                            'text-gray-400'
                          }`}>{s.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Location Timeline - DHL Style */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                {t('tracking.timeline')}
              </h3>

              {timeline.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">{t('tracking.no_updates')}</p>
              ) : (
                <div className="relative">
                  {timeline.map((entry, i) => {
                    const isFirst = i === 0;
                    const isLast = i === timeline.length - 1;
                    return (
                      <div key={i} className="relative flex gap-4 pb-0">
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
                        <div className={`flex-1 pb-6 ${isFirst ? '' : ''}`}>
                          <div className={`rounded-xl p-4 ${isFirst ? 'bg-primary-50 border border-primary-100' : 'bg-gray-50'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className={`font-semibold ${isFirst ? 'text-primary-800' : 'text-gray-800'}`}>
                                  {entry.status}
                                </p>
                                {entry.location && (
                                  <p className={`text-sm mt-1 flex items-center gap-1 ${isFirst ? 'text-primary-600' : 'text-gray-500'}`}>
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {entry.location}
                                  </p>
                                )}
                                {entry.comment && (
                                  <p className="text-sm text-gray-500 mt-1">{entry.comment}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-xs font-medium ${isFirst ? 'text-primary-600' : 'text-gray-500'}`}>
                                  {formatDate(entry.date)}
                                </p>
                                <p className={`text-xs ${isFirst ? 'text-primary-500' : 'text-gray-400'}`}>
                                  {formatTime(entry.date)}
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
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('tracking.shipment_info')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.client')}</span><span className="font-medium">{shipment.client_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.origin')}</span><span className="font-medium capitalize">{shipment.origin}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.destination')}</span><span className="font-medium">{shipment.destination}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('tracking.dates')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.created')}</span><span className="font-medium">{formatDate(shipment.created_at)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.estimated_arrival')}</span><span className="font-medium">{shipment.estimated_arrival ? formatDate(shipment.estimated_arrival) : '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{t('tracking.arrival')}</span><span className="font-medium">{shipment.actual_arrival ? formatDate(shipment.actual_arrival) : '-'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !shipment && !trackingNumber && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <Package className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('tracking.enter_number')}</h2>
            <p className="text-gray-500 max-w-md mx-auto">{t('tracking.enter_number_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
