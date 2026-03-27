import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({ label, value, onChange, options, error, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref}>
      {label && <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`form-select w-full text-left flex items-center justify-between ${error ? '!border-red-300' : ''}`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected ? selected.label : (placeholder || 'Sélectionner...')}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="flex-1 text-sm bg-transparent outline-none"
                  autoFocus
                />
                {query && <button type="button" onClick={() => setQuery('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Aucun résultat</div>
              ) : filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange({ target: { value: opt.value } }); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors ${String(opt.value) === String(value) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
