export function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, ...props }) {
  const base = 'btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white',
    secondary: 'bg-white border-gray-200 hover:border-gray-300 text-gray-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-green-500 text-white hover:bg-green-600',
    outline: 'bg-white border-gray-200 hover:border-gray-300 text-gray-600',
    ghost: 'border-transparent shadow-none text-gray-600 hover:text-gray-800 hover:bg-gray-100',
    primary_brand: 'bg-primary-600 text-white hover:bg-primary-700',
  };
  const sizes = {
    xs: '!text-xs !px-2 !py-0.5 gap-1',
    sm: '!px-2 !py-1 gap-1.5',
    md: 'gap-2',
    lg: '!px-4 !py-3 gap-2',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white shadow-xs rounded-xl ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function Badge({ children, color = 'gray', className = '' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100/60 text-blue-600',
    green: 'bg-green-100/60 text-green-600',
    red: 'bg-red-100/60 text-red-600',
    yellow: 'bg-yellow-100/60 text-yellow-600',
    purple: 'bg-violet-100/60 text-violet-600',
    indigo: 'bg-indigo-100/60 text-indigo-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
      <input
        className={`form-input w-full ${error ? '!border-red-300' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], error, className = '', children, ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
      <select
        className={`form-select w-full ${error ? '!border-red-300' : ''}`}
        {...props}
      >
        {children || options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
      <textarea
        className={`form-textarea w-full ${error ? '!border-red-300' : ''}`}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-lg w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead className="text-xs font-semibold uppercase text-gray-500 bg-gray-50 border-t border-b border-gray-100">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap text-left">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-sm">Aucune donnée</div>
      )}
    </div>
  );
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <span className="text-sm text-gray-500">
        {meta.from}-{meta.to} sur {meta.total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page === 1}
          className="inline-flex items-center justify-center leading-5 px-2.5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="sr-only">Previous</span>
          <svg className="fill-current" width="14" height="14" viewBox="0 0 16 16"><path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z"/></svg>
        </button>
        {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => {
          const page = i + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`inline-flex items-center justify-center leading-5 px-3.5 py-2 text-sm rounded-lg border transition-colors ${meta.current_page === page ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page === meta.last_page}
          className="inline-flex items-center justify-center leading-5 px-2.5 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="sr-only">Next</span>
          <svg className="fill-current" width="14" height="14" viewBox="0 0 16 16"><path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z"/></svg>
        </button>
      </div>
    </div>
  );
}

export function KPICard({ title, value, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-violet-50 text-violet-600',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
          <div className="text-2xl font-bold text-gray-800">{value}</div>
          {trend !== undefined && trend !== null && (
            <div className={`text-sm font-medium mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{Math.abs(trend)}%
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function StatusBadge({ status, statusMap }) {
  const mapping = statusMap || {
    purchased: { label: 'Acheté', color: 'indigo' },
    warehouse: { label: 'Entrepôt', color: 'yellow' },
    'in-transit': { label: 'En transit', color: 'blue' },
    customs: { label: 'Douane', color: 'red' },
    arrived: { label: 'Arrivé', color: 'green' },
    delivered: { label: 'Livré', color: 'green' },
    active: { label: 'Active', color: 'blue' },
    paid: { label: 'Payé', color: 'green' },
    overdue: { label: 'En retard', color: 'red' },
    defaulted: { label: 'Défaillant', color: 'red' },
    pending: { label: 'En attente', color: 'yellow' },
    completed: { label: 'Complété', color: 'green' },
    cancelled: { label: 'Annulé', color: 'gray' },
    draft: { label: 'Brouillon', color: 'gray' },
    sent: { label: 'Envoyé', color: 'blue' },
    partial: { label: 'Partiel', color: 'yellow' },
    approved: { label: 'Approuvé', color: 'green' },
    rejected: { label: 'Rejeté', color: 'red' },
  };
  const info = mapping[status] || { label: status, color: 'gray' };
  return <Badge color={info.color}>{info.label}</Badge>;
}

export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex justify-center py-8">
      <div className={`${sizes[size]} border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
    </div>
  );
}
