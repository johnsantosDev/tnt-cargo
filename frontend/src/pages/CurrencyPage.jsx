import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardBody, Input, Select, Spinner } from '../components/ui';
import { RefreshCw, ArrowRightLeft, TrendingUp } from 'lucide-react';

const CURRENCIES = [
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', flag: '🇨🇩' },
];

// Fallback rates (USD-based) used when API is unavailable
const FALLBACK_RATES = {
  USD: 1,
  CNY: 7.24,
  AED: 3.67,
  TRY: 38.5,
  EUR: 0.92,
  CDF: 2845,
};

export default function CurrencyPage() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('CNY');
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const filtered = {};
      CURRENCIES.forEach(c => {
        filtered[c.code] = data.rates[c.code];
      });
      setRates(filtered);
      setLastUpdated(new Date());
    } catch {
      setRates(FALLBACK_RATES);
      setLastUpdated(new Date());
      setError(t('currency.api_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = (targetCode) => {
    if (!rates) return 0;
    const fromRate = rates[fromCurrency];
    const toRate = rates[targetCode];
    if (!fromRate || !toRate) return 0;
    return (amount / fromRate) * toRate;
  };

  const formatNumber = (num) => {
    if (num >= 1000) return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const otherCurrencies = CURRENCIES.filter(c => c.code !== fromCurrency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('currency.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('currency.subtitle')}</p>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('currency.refresh')}
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary-600" />
            {t('currency.converter')}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('currency.amount')}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('currency.from_currency')}</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-3">
              {t('currency.last_updated')}: {lastUpdated.toLocaleString('fr-FR')}
            </p>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherCurrencies.map(c => {
            const converted = convert(c.code);
            const rate = rates ? (rates[c.code] / rates[fromCurrency]) : 0;
            return (
              <Card key={c.code}>
                <CardBody>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{c.flag}</span>
                    <div>
                      <p className="font-bold text-gray-900">{c.code}</p>
                      <p className="text-xs text-gray-500">{c.name}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {c.symbol} {formatNumber(converted)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      1 {fromCurrency} = {formatNumber(rate)} {c.code}
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick reference table */}
      {rates && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              {t('currency.rates_table')}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500"></th>
                    {CURRENCIES.map(c => (
                      <th key={c.code} className="text-right py-2 px-3 font-medium text-gray-500">
                        {c.flag} {c.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CURRENCIES.map(from => (
                    <tr key={from.code} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {from.flag} 1 {from.code}
                      </td>
                      {CURRENCIES.map(to => {
                        const val = (rates[to.code] / rates[from.code]);
                        return (
                          <td key={to.code} className={`text-right py-2 px-3 ${from.code === to.code ? 'text-gray-300' : 'text-gray-700'}`}>
                            {from.code === to.code ? '—' : formatNumber(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
