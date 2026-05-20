/**
 * Try to share a file via the Web Share API (mobile-first).
 * Falls back to downloading the file and opening a WhatsApp chat on desktop.
 *
 * @param {Blob} blob        – the file blob to share
 * @param {string} fileName  – desired file name (e.g. "facture-12.pdf")
 * @param {string} phone     – WhatsApp phone number (any format; digits are extracted)
 */
export async function sendViaWhatsApp(blob, fileName, phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Mobile: use native Web Share API so the OS share sheet opens and the
    // user can pick WhatsApp directly with the file already attached.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // user cancelled
        // fall through to deep-link fallback
      }
    }
    // Deep-link fallback for mobile when Web Share is unavailable
    if (cleanPhone) {
      window.location.href = `whatsapp://send?phone=${cleanPhone}`;
    }
    return;
  }

  // Desktop / Web: open WhatsApp Web with the phone number
  // The user will need to manually attach the downloaded file
  if (cleanPhone) {
    const text = encodeURIComponent(
      `Bonjour, veuillez trouver ci-joint le document : ${fileName}`
    );
    const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${text}`;
    window.open(whatsappWebUrl, '_blank');
  }
}

export async function exportToPDF(columns, data, filename = 'export') {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
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
      doc.text('Logistique internationale — RDC', pageWidth / 2, pageHeight - 8, { align: 'center' });
    },
  });

  doc.save(`${filename}.pdf`);
}

export async function exportToExcel(columns, data, filename = 'export') {
  const [XLSX, { saveAs }] = await Promise.all([
    import('xlsx'),
    import('file-saver'),
  ]);
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

export async function exportCashAdvanceInvoice(advance, t, { returnBlob = false } = {}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const fm = (v) => `$${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  const fd = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('TNT Cargo System', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Logistique internationale — RDC', 14, 27);

  // Invoice title
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(t('cash_advances.invoice_title'), pw - 14, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(advance.reference, pw - 14, 27, { align: 'right' });

  // Line
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.7);
  doc.line(14, 32, pw - 14, 32);

  // Client & dates info
  let y = 42;
  doc.setFontSize(10);
  doc.setTextColor(50);

  const fdt = (d) => d ? new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';
  const info = [
    [t('cash_advances.client'), advance.client?.name || '-'],
    [t('cash_advances.supplier_reference'), advance.supplier_reference || '-'],
    [t('cash_advances.issue_date'), fd(advance.issue_date)],
    [t('cash_advances.due_date'), fd(advance.due_date)],
    ['Créée le', fdt(advance.created_at)],
    ['Créée par', advance.creator?.name || advance.creator?.email || '—'],
  ];
  info.forEach(([label, val]) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(val, 70, y);
    y += 7;
  });

  y += 5;

  // Financial breakdown table
  const amt = Number(advance.amount) || 0;
  const intRate = Number(advance.interest_rate) || 0;
  const comRate = Number(advance.commission_rate) || 0;
  const intAmt = amt * intRate / 100;
  const comAmt = amt * comRate / 100;
  const totalDue = Number(advance.total_due) || (amt + intAmt + comAmt);
  const totalPaid = Number(advance.total_paid) || 0;
  const balance = advance.balance != null ? Number(advance.balance) : (totalDue - totalPaid);

  const rows = [
    [t('cash_advances.amount_given'), fm(amt)],
  ];
  if (intRate > 0) rows.push([`${t('cash_advances.interest_amount')} (${intRate}%)`, fm(intAmt)]);
  if (comRate > 0) rows.push([`${t('cash_advances.commission_amount')} (${comRate}%)`, fm(comAmt)]);

  autoTable(doc, {
    startY: y,
    head: [[t('cash_advances.description_col'), t('cash_advances.amount_col')]],
    body: rows,
    foot: [
      [t('cash_advances.total_to_repay'), fm(totalDue)],
      [t('cash_advances.paid'), fm(totalPaid)],
      [t('cash_advances.balance'), fm(balance)],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 245, 255], textColor: [30, 30, 30], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // Status-aware notes block
  {
    const isPaid = advance.status === 'paid' || balance <= 0;
    const isOverdue = advance.status === 'overdue';
    const isPartial = advance.status === 'partial' || (totalPaid > 0 && balance > 0);

    let noticeLines = [];
    let noticeColor = [50, 50, 50];

    if (isPaid) {
      noticeColor = [5, 150, 105]; // green
      noticeLines = [
        'Cette avance a été intégralement remboursée. Aucun solde restant n\'est dû.',
        'Nous vous remercions pour votre paiement et votre collaboration.',
        'Ce document fait office de confirmation de règlement.',
      ];
    } else if (isOverdue) {
      noticeColor = [220, 38, 38]; // red
      noticeLines = [
        'Nous vous rappelons que vous avez une dette envers la société TNT.',
        'Cette dette est échue. Veuillez procéder au règlement immédiatement.',
        'Nous comptons sur votre collaboration pour régulariser la situation dans les plus brefs délais.',
      ];
    } else if (isPartial) {
      noticeColor = [217, 119, 6]; // amber
      noticeLines = [
        `Paiement partiel reçu. Solde restant: ${fm(balance)}.`,
        'Le solde devra être réglé avant la date d\'échéance indiquée.',
        'Merci pour votre collaboration.',
      ];
    } else {
      noticeLines = [
        'Nous vous rappelons que vous avez une dette envers la société TNT.',
        'Nous vous informons que le paiement de cette dette devra être effectué immédiatement après le retrait / la réception de vos marchandises.',
        'Nous comptons sur votre collaboration pour régulariser la situation dans les plus brefs délais.',
      ];
    }

    let fY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...noticeColor);
    doc.text(`${t('common.notes')}:`, 14, fY);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60);
    fY += 6;
    noticeLines.forEach((line) => {
      const split = doc.splitTextToSize(line, pw - 28);
      doc.text(split, 14, fY);
      fY += split.length * 5;
    });

    if (advance.notes && !isPaid) {
      fY += 4;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(50);
      doc.text('Notes additionnelles:', 14, fY);
      doc.setFont(undefined, 'normal');
      const split = doc.splitTextToSize(advance.notes, pw - 28);
      doc.text(split, 14, fY + 6);
    }
  }

  // Footer
  const creatorName = advance.creator?.name || advance.creator?.email || '—';
  const printedAt = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('TNT Cargo System', pw / 2, ph - 18, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Logistique internationale — RDC', pw / 2, ph - 14, { align: 'center' });
  doc.text(`Créée par ${creatorName} — Imprimée le ${printedAt}`, pw / 2, ph - 9, { align: 'center' });

  if (returnBlob) {
    return doc.output('blob');
  }
  doc.save(`avance-${advance.reference}.pdf`);
}
