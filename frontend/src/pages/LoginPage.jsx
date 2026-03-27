import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Package, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard/home');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-inter antialiased">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TNT Cargo</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {t('auth.brand_title')}
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            {t('auth.brand_desc')}
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-gray-500 text-sm">© 2026 TNT Cargo</p>
        </div>
        {/* Decorative */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gray-800 rounded-full opacity-50" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-gray-800 rounded-full opacity-30" />
        <div className="absolute bottom-1/3 -left-10 w-32 h-32 bg-gray-800 rounded-full opacity-40" />
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">TNT Cargo</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">{t('auth.welcome')}</h1>
            <p className="text-gray-500 mt-2">{t('auth.subtitle')}</p>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@tntcargo.com"
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('auth.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-input w-full pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.loading') : t('auth.login_btn')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            © 2026 TNT Cargo. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
