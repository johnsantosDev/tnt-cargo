import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToPDF(columns, data, filename = 'export') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('TNT Cargo System', 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(filename, 14, 26);
  doc.setFontSize(9);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);

  // Separator line
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(14, 35, pageWidth - 14, 35);

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
    startY: 40,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    didDrawPage: () => {
      // Footer on every page
      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.text('TNT Cargo System', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Logistique internationale — Goma, RDC', pageWidth / 2, pageHeight - 8, { align: 'center' });
    },
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

 
