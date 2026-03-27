import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToPDF(columns, data, filename = 'export') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(filename, 14, 20);
  doc.setFontSize(10);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

  const headers = columns.filter(c => c.key !== 'actions').map(c => c.label);
  const rows = data.map(row =>
    columns.filter(c => c.key !== 'actions').map(col => {
      if (col.exportValue) return col.exportValue(row);
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return val.name || val.slug || JSON.stringify(val);
      return String(val);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
  });

  doc.save(`${filename}.pdf`);
}

export function exportToExcel(columns, data, filename = 'export') {
  const headers = columns.filter(c => c.key !== 'actions').map(c => c.label);
  const rows = data.map(row =>
    columns.filter(c => c.key !== 'actions').map(col => {
      if (col.exportValue) return col.exportValue(row);
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return val.name || val.slug || JSON.stringify(val);
      return val;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}
