import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Globe, Shield, BarChart3, Search, ArrowRight, Truck,
  MapPin, Clock, CheckCircle, Phone, Mail, Plane, Ship,
  Users, Headphones, Star, ChevronRight, Warehouse, FileCheck,
  Box, Zap, Eye, CreditCard, FileText, DollarSign, UserCheck
} from 'lucide-react';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState('');

  const handleTrack = (e) => {
    e.preventDefault();
    if (tracking.trim()) navigate(`/tracking/${tracking.trim()}`);
  };

  const toggleLang = () => {
    const langs = ['fr', 'en', 'zh'];
    const current = langs.indexOf(i18n.language);
    i18n.changeLanguage(langs[(current + 1) % langs.length]);
  };
  const langLabel = { fr: 'FR', en: 'EN', zh: '中文' };

  return (
    <div className="min-h-screen bg-white font-inter antialiased">
      {/* Top Bar */}
      <div className="bg-gray-900 text-gray-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> +243 99 000 0000</span>
            <span className="hidden sm:flex items-center gap-1.5"><Mail className="w-3 h-3" /> contact@tntcargo.com</span>
          </div>
          <button onClick={toggleLang} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Globe className="w-3 h-3" />
            {langLabel[i18n.language] || 'FR'}
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">TNT Cargo</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a href="#routes" className="hover:text-gray-900 transition-colors">{t('landing.nav_routes')}</a>
              <a href="#features" className="hover:text-gray-900 transition-colors">{t('landing.nav_services')}</a>
              <a href="#process" className="hover:text-gray-900 transition-colors">{t('landing.nav_process')}</a>
              <a href="#contact" className="hover:text-gray-900 transition-colors">{t('landing.nav_contact')}</a>
            </nav>
            <Link to="/dashboard/login" className="btn bg-gray-900 text-gray-100 hover:bg-gray-800">
              {t('landing.login')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-primary-50/30" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <Plane className="w-3.5 h-3.5" />
                {t('landing.hero_badge')}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
                {t('landing.hero_title')}
              </h1>
              <p className="text-lg text-gray-500 max-w-lg mb-8 leading-relaxed">
                {t('landing.hero_subtitle')}
              </p>

              {/* Tracking Form */}
              <form onSubmit={handleTrack} className="max-w-lg mb-10">
                <div className="flex rounded-lg shadow-sm border border-gray-200 bg-white overflow-hidden">
                  <div className="flex-1 flex items-center px-4">
                    <Search className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                    <input
                      type="text"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder={t('landing.tracking_placeholder')}
                      className="w-full py-3 text-sm outline-none bg-transparent placeholder-gray-400"
                    />
                  </div>
                  <button type="submit" className="px-6 bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 shrink-0">
                    {t('landing.track')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { value: '5K+', label: t('landing.stat_shipments') },
                  { value: '500+', label: t('landing.stat_clients') },
                  { value: '3', label: t('landing.stat_routes') },
                  { value: '99%', label: t('landing.stat_satisfaction') },
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main visual card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 relative z-10">
                  {/* Map representation */}
                  <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-8 mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #1E40AF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <div className="relative flex items-center justify-between">
                      <div className="text-center">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 mx-auto">
                          <span className="text-2xl">🇨🇳</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700">Chine</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center px-2">
                        <div className="flex items-center gap-1">
                          <div className="h-0.5 w-8 bg-primary-300 rounded" />
                          <Plane className="w-5 h-5 text-primary-600 -rotate-12" />
                          <div className="h-0.5 w-8 bg-primary-300 rounded" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 mx-auto">
                          <span className="text-2xl">🇦🇪</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700">Dubaï</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center px-2">
                        <div className="flex items-center gap-1">
                          <div className="h-0.5 w-8 bg-primary-300 rounded" />
                          <Ship className="w-5 h-5 text-primary-600" />
                          <div className="h-0.5 w-8 bg-primary-300 rounded" />
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2 mx-auto">
                          <span className="text-2xl">🇨🇩</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700">RDC</p>
                      </div>
                    </div>
                  </div>

                  {/* Mini tracking preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">TNT-2024-0847</p>
                        <p className="text-xs text-green-600">{t('landing.stat_satisfaction')}</p>
                      </div>
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Livré</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">TNT-2024-0912</p>
                        <p className="text-xs text-blue-600">Dubaï → Kinshasa</p>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">En transit</span>
                    </div>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Eye className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Suivi en direct</p>
                      <p className="text-[10px] text-gray-500">24/7 tracking</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Sécurisé</p>
                      <p className="text-[10px] text-gray-500">100% fiable</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Routes */}
      <section id="routes" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">{t('landing.routes_label')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.routes_title')}</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">{t('landing.routes_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { from: 'Chine', fromCity: 'Guangzhou', to: 'RDC', cities: 'Goma, Lubumbashi, Kinshasa...', icon: '🇨🇳', flag2: '🇨🇩', transport: Ship, days: '25-35', accent: 'text-red-600', accentBg: 'bg-red-50', accentBorder: 'border-red-100' },
              { from: 'Dubaï', fromCity: 'Dubai', to: 'RDC', cities: 'Goma, Beni, Butembo...', icon: '🇦🇪', flag2: '🇨🇩', transport: Plane, days: '10-18', accent: 'text-amber-600', accentBg: 'bg-amber-50', accentBorder: 'border-amber-100' },
              { from: 'Turquie', fromCity: 'Istanbul', to: 'RDC', cities: 'Kinshasa, Bukavu, Bunia...', icon: '🇹🇷', flag2: '🇨🇩', transport: Ship, days: '20-30', accent: 'text-blue-600', accentBg: 'bg-blue-50', accentBorder: 'border-blue-100' }
            ].map((route, i) => (
              <div key={i} className={`bg-white rounded-xl shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow group`}>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-4xl">{route.icon}</span>
                  <span className={`${route.accentBg} ${route.accent} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                    {route.days} {t('landing.days')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{route.from} → {route.to}</h3>
                <p className="text-sm text-gray-500 mb-1">{route.fromCity}</p>
                <p className="text-xs text-gray-400 mb-3">{route.cities}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <route.transport className="w-4 h-4" />
                  <span>{route.transport === Ship ? t('landing.by_sea') : t('landing.by_air')}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Porte-à-porte</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Assuré</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">{t('landing.features_label')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.features_title')}</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">{t('landing.features_desc')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: t('landing.feature_tracking'), desc: t('landing.feature_tracking_desc'), color: 'bg-blue-50 text-blue-600' },
              { icon: Shield, title: t('landing.feature_security'), desc: t('landing.feature_security_desc'), color: 'bg-green-50 text-green-600' },
              { icon: Globe, title: t('landing.feature_global'), desc: t('landing.feature_global_desc'), color: 'bg-violet-50 text-violet-600' },
              { icon: BarChart3, title: t('landing.feature_reports'), desc: t('landing.feature_reports_desc'), color: 'bg-amber-50 text-amber-600' },
              { icon: Users, title: t('landing.feature_clients'), desc: t('landing.feature_clients_desc'), color: 'bg-cyan-50 text-cyan-600' },
              { icon: CreditCard, title: t('landing.feature_payments'), desc: t('landing.feature_payments_desc'), color: 'bg-pink-50 text-pink-600' },
              { icon: FileText, title: t('landing.feature_documents'), desc: t('landing.feature_documents_desc'), color: 'bg-indigo-50 text-indigo-600' },
              { icon: DollarSign, title: t('landing.feature_invoicing'), desc: t('landing.feature_invoicing_desc'), color: 'bg-emerald-50 text-emerald-600' }
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-xl shadow-xs p-6 border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${f.color} mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">{t('landing.process_label')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.process_title')}</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">{t('landing.process_desc')}</p>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gray-200" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: '01', icon: Package, title: t('landing.step_purchase'), desc: t('landing.step_purchase_desc') },
                { step: '02', icon: Warehouse, title: t('landing.step_warehouse'), desc: t('landing.step_warehouse_desc') },
                { step: '03', icon: Ship, title: t('landing.step_transit'), desc: t('landing.step_transit_desc') },
                { step: '04', icon: CheckCircle, title: t('landing.step_delivery'), desc: t('landing.step_delivery_desc') }
              ].map((s, i) => (
                <div key={i} className="text-center relative">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white border-2 border-gray-100 text-primary-600 rounded-2xl mb-4 shadow-xs relative z-10">
                    <s.icon className="w-8 h-8" />
                  </div>
                  <span className="inline-block bg-gray-900 text-white text-xs font-semibold w-6 h-6 leading-6 rounded-full mb-3">{s.step}</span>
                  <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Why Us */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">{t('landing.trust_label')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t('landing.trust_title')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Headphones, title: t('landing.trust_support'), desc: t('landing.trust_support_desc') },
              { icon: FileCheck, title: t('landing.trust_transparent'), desc: t('landing.trust_transparent_desc') },
              { icon: Star, title: t('landing.trust_experience'), desc: t('landing.trust_experience_desc') },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow">
                <div className="shrink-0 w-11 h-11 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.cta_title')}</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">{t('landing.cta_desc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/dashboard/login" className="btn bg-white text-gray-900 hover:bg-gray-100 !px-8 !py-3 font-semibold text-sm">
              {t('landing.cta_start')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#routes" className="btn border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white !px-8 !py-3 text-sm">
              {t('landing.cta_routes')}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold text-white">TNT Cargo</span>
              </div>
              <p className="text-sm leading-relaxed">{t('landing.footer_about')}</p>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{t('landing.footer_links')}</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#routes" className="hover:text-white transition-colors">{t('landing.nav_routes')}</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">{t('landing.nav_services')}</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">{t('landing.nav_process')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{t('landing.footer_routes')}</h4>
              <ul className="space-y-2.5 text-sm">
                <li>🇨🇳 Chine → RDC</li>
                <li>🇦🇪 Dubaï → RDC</li>
                <li>🇹🇷 Turquie → RDC</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">{t('landing.footer_contact')}</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> Goma, Nord-Kivu, RDC</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> +243 99 000 0000</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> contact@tntcargo.com</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} TNT Cargo. {t('landing.rights')}</p>
            <p className="flex items-center gap-1">{t('landing.made_with')} <span className="text-red-500">&#9829;</span> {t('landing.in_goma')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
