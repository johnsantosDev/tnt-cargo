import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Package, Globe, Shield, BarChart3, Search, ArrowRight, Truck,
  MapPin, Clock, CheckCircle, Phone, Mail, Plane, Ship,
  Users, Headphones, Star, ChevronRight, Warehouse, FileCheck,
  Eye, CreditCard, FileText, DollarSign, Menu, X, ChevronDown
} from 'lucide-react';

import LiveChat from '../components/LiveChat';

// High-quality logistics images from Unsplash
const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=1600&q=85&auto=format&fit=crop',
  seafreight: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80&auto=format&fit=crop',
  warehouse: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&q=80&auto=format&fit=crop',
  airfreight: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80&auto=format&fit=crop',
  port: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80&auto=format&fit=crop',
  container: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=900&q=80&auto=format&fit=crop',
  logistics: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=900&q=80&auto=format&fit=crop',
};

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function ScrollReveal({ children, className = '' }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

      {/* ── TOP BAR ────────────────────────────────────────────── */}
      <div className="bg-gray-950 text-gray-400 text-xs hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-9">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3 h-3 text-primary-400" /> +243 99 000 0000
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3 h-3 text-primary-400" /> contact@agencetntcargo.com
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">|</span>
            <button onClick={toggleLang} className="flex items-center gap-1.5 hover:text-white transition-colors font-medium">
              <Globe className="w-3 h-3" />
              {langLabel[i18n.language] || 'FR'}
            </button>
          </div>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/98 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white/95 backdrop-blur-sm border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                <img src="/favicon.png" alt="TNT Cargo" className="w-6 h-6 rounded" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">TNT Cargo</span>
                <span className="hidden sm:block text-[10px] text-gray-400 leading-none -mt-0.5">Logistics Internationale</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: '#routes', label: t('landing.nav_routes') },
                { href: '#features', label: t('landing.nav_services') },
                { href: '#gallery', label: 'Galerie' },
                { href: '#process', label: t('landing.nav_process') },
                { href: '#contact', label: t('landing.nav_contact') },
              ].map(link => (
                <a key={link.href} href={link.href}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button onClick={toggleLang}
                className="sm:hidden flex items-center gap-1 text-xs text-gray-500 px-2 py-1 border border-gray-200 rounded-md">
                <Globe className="w-3 h-3" />{langLabel[i18n.language] || 'FR'}
              </button>
              <a href="#contact"
                className="hidden sm:flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                {t('landing.nav_contact')} <ChevronRight className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setMobileMenuOpen(v => !v)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {[
              { href: '#routes', label: t('landing.nav_routes') },
              { href: '#features', label: t('landing.nav_services') },
              { href: '#gallery', label: 'Galerie' },
              { href: '#process', label: t('landing.nav_process') },
              { href: '#contact', label: t('landing.nav_contact') },
            ].map(link => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            src={IMAGES.hero}
            alt="Container ship logistics"
            className="w-full h-full object-cover object-center"
          />
          {/* Multi-layer overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/92 via-gray-900/75 to-gray-900/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-transparent" />
        </div>

        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white/90 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 animate-fade-in-up">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <Plane className="w-3.5 h-3.5 text-primary-300" />
              {t('landing.hero_badge')}
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6 animate-fade-in-up delay-100">
              {t('landing.hero_title')}
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-10 leading-relaxed animate-fade-in-up delay-200">
              {t('landing.hero_subtitle')}
            </p>

            {/* Tracking Form */}
            <form onSubmit={handleTrack} className="max-w-lg mb-12 animate-fade-in-up delay-300">
              <div className="flex rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <div className="flex-1 flex items-center bg-white/95 backdrop-blur-sm px-4">
                  <Search className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder={t('landing.tracking_placeholder')}
                    className="w-full py-4 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  />
                </div>
                <button type="submit"
                  className="px-6 bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition-colors flex items-center gap-2 shrink-0">
                  {t('landing.track')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 animate-fade-in-up delay-400">
              {[
                { value: '5K+', label: t('landing.stat_shipments') },
                { value: '500+', label: t('landing.stat_clients') },
                { value: '3', label: t('landing.stat_routes') },
                { value: '99%', label: t('landing.stat_satisfaction') },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/55 mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a href="#routes"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors animate-bounce">
          <ChevronDown className="w-5 h-5" />
        </a>
      </section>

      {/* ── PHOTO GALLERY STRIP ────────────────────────────────── */}
      <section id="gallery" className="py-0 bg-white overflow-hidden">
        <div className="flex gap-0">
          {[
            { img: IMAGES.seafreight, label: 'Fret Maritime', sub: 'Chine · Turquie → RDC' },
            { img: IMAGES.warehouse, label: 'Entrepôts', sub: 'Guangzhou · Dubai' },
            { img: IMAGES.airfreight, label: 'Fret Aérien', sub: 'Express 10–18 jours' },
            { img: IMAGES.container, label: 'Conteneurs', sub: 'FCL & LCL' },
          ].map((item, i) => (
            <div key={i} className="relative flex-1 h-56 sm:h-72 overflow-hidden group cursor-default">
              <img
                src={item.img}
                alt={item.label}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-white/60 text-xs mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROUTES ─────────────────────────────────────────────── */}
      <section id="routes" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">{t('landing.routes_label')}</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">{t('landing.routes_title')}</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg">{t('landing.routes_desc')}</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                from: 'Chine', fromCity: 'Guangzhou', to: 'RDC', cities: 'Goma · Lubumbashi · Kinshasa',
                icon: '🇨🇳', transport: Ship, days: '25-35',
                img: IMAGES.seafreight,
                accent: 'from-red-600 to-red-700', badge: 'bg-red-100 text-red-700',
              },
              {
                from: 'Dubaï', fromCity: 'Dubai', to: 'RDC', cities: 'Goma · Beni · Butembo',
                icon: '🇦🇪', transport: Plane, days: '10-18',
                img: IMAGES.airfreight,
                accent: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700',
              },
              {
                from: 'Turquie', fromCity: 'Istanbul', to: 'RDC', cities: 'Kinshasa · Bukavu · Bunia',
                icon: '🇹🇷', transport: Ship, days: '20-30',
                img: IMAGES.logistics,
                accent: 'from-blue-600 to-blue-700', badge: 'bg-blue-100 text-blue-700',
              }
            ].map((route, i) => (
              <div key={i} className="group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                {/* Image header */}
                <div className="relative h-48 overflow-hidden">
                  <img src={route.img} alt={route.from}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${route.accent} opacity-60`} />
                  <div className="absolute inset-0 flex items-end p-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{route.icon}</span>
                        <span className="text-2xl">🇨🇩</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{route.from} → {route.to}</h3>
                      <p className="text-white/75 text-sm">{route.fromCity}</p>
                    </div>
                    <span className={`ml-auto self-start mt-1 ${route.badge} text-xs font-bold px-2.5 py-1 rounded-full`}>
                      {route.days} {t('landing.days')}
                    </span>
                  </div>
                </div>
                {/* Card body */}
                <div className="bg-white p-5">
                  <p className="text-sm text-gray-500 mb-4">{route.cities}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <route.transport className="w-3.5 h-3.5 text-primary-500" />
                      {route.transport === Ship ? t('landing.by_sea') : t('landing.by_air')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Porte-à-porte
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-gray-400" /> Assuré
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL-WIDTH PORT BANNER ──────────────────────────────── */}
      <section className="relative h-80 overflow-hidden">
        <img src={IMAGES.port} alt="Port container terminal"
          className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/60 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-lg">
              <p className="text-primary-300 text-sm font-semibold uppercase tracking-widest mb-3">Infrastructure mondiale</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                Des ports de Chine jusqu'au cœur de l'Afrique
              </h2>
              <a href="#contact"
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
                Demander un devis <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-3">{t('landing.features_label')}</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{t('landing.features_title')}</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg">{t('landing.features_desc')}</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Truck, title: t('landing.feature_tracking'), desc: t('landing.feature_tracking_desc'), color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
              { icon: Shield, title: t('landing.feature_security'), desc: t('landing.feature_security_desc'), color: 'text-green-400 bg-green-500/10 border-green-500/20' },
              { icon: Globe, title: t('landing.feature_global'), desc: t('landing.feature_global_desc'), color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
              { icon: BarChart3, title: t('landing.feature_reports'), desc: t('landing.feature_reports_desc'), color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { icon: Users, title: t('landing.feature_clients'), desc: t('landing.feature_clients_desc'), color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
              { icon: CreditCard, title: t('landing.feature_payments'), desc: t('landing.feature_payments_desc'), color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
              { icon: FileText, title: t('landing.feature_documents'), desc: t('landing.feature_documents_desc'), color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              { icon: DollarSign, title: t('landing.feature_invoicing'), desc: t('landing.feature_invoicing_desc'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
            ].map((f, i) => (
              <div key={i}
                className="bg-white/5 border border-white/8 rounded-xl p-6 hover:bg-white/8 hover:-translate-y-1 transition-all duration-200 group">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border ${f.color} mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ────────────────────────────────────────────── */}
      <section id="process" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">{t('landing.process_label')}</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">{t('landing.process_title')}</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg">{t('landing.process_desc')}</p>
          </ScrollReveal>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: '01', icon: Package, title: t('landing.step_purchase'), desc: t('landing.step_purchase_desc'), color: 'bg-blue-50 text-blue-600 border-blue-100' },
                { step: '02', icon: Warehouse, title: t('landing.step_warehouse'), desc: t('landing.step_warehouse_desc'), color: 'bg-amber-50 text-amber-600 border-amber-100' },
                { step: '03', icon: Ship, title: t('landing.step_transit'), desc: t('landing.step_transit_desc'), color: 'bg-primary-50 text-primary-600 border-primary-100' },
                { step: '04', icon: CheckCircle, title: t('landing.step_delivery'), desc: t('landing.step_delivery_desc'), color: 'bg-green-50 text-green-600 border-green-100' }
              ].map((s, i) => (
                <div key={i} className="text-center relative group">
                  <div className={`inline-flex items-center justify-center w-20 h-20 border-2 ${s.color} rounded-2xl mb-5 shadow-sm relative z-10 group-hover:scale-105 transition-transform`}>
                    <s.icon className="w-8 h-8" />
                  </div>
                  <div className="inline-flex items-center justify-center w-6 h-6 bg-gray-900 text-white text-xs font-bold rounded-full mb-3">{s.step}</div>
                  <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WAREHOUSE SPLIT SECTION ─────────────────────────────── */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image side */}
            <div className="relative h-80 lg:h-auto overflow-hidden">
              <img src={IMAGES.warehouse} alt="Warehouse China"
                className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-950/30 to-transparent" />
            </div>
            {/* Content side */}
            <div className="px-10 py-16 lg:py-20 flex flex-col justify-center">
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-4">Entrepôts & Stockage</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5">
                Vos marchandises en sécurité dans nos entrepôts
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                Nous disposons d'entrepôts partenaires à Guangzhou, Dubai et Istanbul pour regrouper, vérifier et préparer vos colis avant expédition vers la RDC.
              </p>
              <ul className="space-y-3">
                {[
                  'Vérification et contrôle qualité',
                  'Consolidation de commandes multiples',
                  'Emballage professionnel sécurisé',
                  'Suivi en temps réel du stockage',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST ──────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest mb-3">{t('landing.trust_label')}</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">{t('landing.trust_title')}</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Headphones, title: t('landing.trust_support'), desc: t('landing.trust_support_desc'), color: 'bg-primary-600', stat: '24/7' },
              { icon: FileCheck, title: t('landing.trust_transparent'), desc: t('landing.trust_transparent_desc'), color: 'bg-green-600', stat: '100%' },
              { icon: Star, title: t('landing.trust_experience'), desc: t('landing.trust_experience_desc'), color: 'bg-amber-500', stat: '5★' },
            ].map((item, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-gray-100 shadow-xs hover:shadow-lg transition-all duration-300 group">
                <div className="p-8">
                  <div className={`inline-flex items-center justify-center w-12 h-12 ${item.color} text-white rounded-xl mb-5 shadow-sm`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <p className="text-4xl font-black text-gray-900 mb-1">{item.stat}</p>
                  <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.airfreight} alt="Air cargo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gray-950/88" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
          <p className="text-primary-400 text-sm font-semibold uppercase tracking-widest mb-4">Commençons</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight">{t('landing.cta_title')}</h2>
          <p className="text-gray-400 text-xl mb-10 max-w-xl mx-auto">{t('landing.cta_desc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#contact"
              className="flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-lg">
              {t('landing.nav_contact')} <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#routes"
              className="flex items-center gap-2 border border-white/20 text-white text-sm font-medium px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
              {t('landing.cta_routes')}
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer id="contact" className="bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <img src="/favicon.png" alt="TNT Cargo" className="w-6 h-6 rounded" />
                </div>
                <span className="text-base font-bold text-white">TNT Cargo</span>
              </div>
              <p className="text-sm leading-relaxed">{t('landing.footer_about')}</p>
              <div className="flex gap-3 mt-5">
                {['🇨🇳', '🇦🇪', '🇹🇷', '🇨🇩'].map((flag, i) => (
                  <span key={i} className="text-xl">{flag}</span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('landing.footer_links')}</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#routes" className="hover:text-white transition-colors">{t('landing.nav_routes')}</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">{t('landing.nav_services')}</a></li>
                <li><a href="#gallery" className="hover:text-white transition-colors">Galerie</a></li>
                <li><a href="#process" className="hover:text-white transition-colors">{t('landing.nav_process')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('landing.footer_routes')}</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Ship className="w-3.5 h-3.5 text-primary-400" /> 🇨🇳 Chine → RDC</li>
                <li className="flex items-center gap-2"><Plane className="w-3.5 h-3.5 text-primary-400" /> 🇦🇪 Dubaï → RDC</li>
                <li className="flex items-center gap-2"><Ship className="w-3.5 h-3.5 text-primary-400" /> 🇹🇷 Turquie → RDC</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-5 uppercase tracking-wider">{t('landing.footer_contact')}</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <span>Goma, Nord-Kivu, RDC</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary-400 shrink-0" />
                  <a href="tel:+243990000000" className="hover:text-white transition-colors">+243 99 000 0000</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-primary-400 shrink-0" />
                  <a href="mailto:contact@agencetntcargo.com" className="hover:text-white transition-colors break-all">contact@agencetntcargo.com</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} TNT Cargo. {t('landing.rights')}</p>
            <p className="text-gray-500">Powered by <span className="text-gray-400 font-medium">Primetek Africa</span></p>
          </div>
        </div>
      </footer>

      {/* Live Chat Widget */}
      <LiveChat />
    </div>
  );
}
