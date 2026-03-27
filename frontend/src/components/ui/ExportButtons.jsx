import { FileDown, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../../utils/export';

export default function ExportButtons({ columns, data, filename = 'export' }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => exportToPDF(columns, data, filename)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
        title="Exporter PDF"
      >
        <FileDown className="w-3.5 h-3.5 text-red-500" />
        PDF
      </button>
      <button
        onClick={() => exportToExcel(columns, data, filename)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
        title="Exporter Excel"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
        Excel
      </button>
    </div>
  );
}
