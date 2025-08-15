/**
 * src/utils/export.js
 * CSV export and high-quality PDF export (jsPDF + autoTable via CDN).
 */

export function formatMoney(value, prefix = 'GHS ') {
  const n = Number(value || 0);
  const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return prefix + formatted;
}

export function exportCSV(filename, headers, rows){
  const safe = (s) => {
    const v = String(s ?? '');
    const needs = /[",\n]/.test(v);
    return needs ? `"${v.replace(/"/g,'""')}"` : v;
  };
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => safe(r[h])).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : (filename + '.csv');
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

/**
 * exportPDF
 * filename: string
 * headers:  array of column names
 * rows:     array of objects (keys must match headers)
 * opts:     { title?: string, money?: string[] }
 */
export async function exportPDF(filename, headers, rows, opts = {}){
  try{
    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
    const autoTable = (await import('https://esm.sh/jspdf-autotable@3.8.2')).default;

    // Format money values and set alignment
    const moneyHeaders = Array.isArray(opts.money) ? new Set(opts.money) : new Set();
    const body = rows.map(r => headers.map(h => {
      const val = r[h];
      if (moneyHeaders.has(h)) return formatMoney(val);
      return val ?? '';
    }));

    const doc = new jsPDF({ orientation: opts.orientation || 'p', unit:'pt', format:'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(43, 89, 255);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16);
    doc.text(opts.title || 'Report', 40, 35);
    doc.setFontSize(10);
    const stamp = new Date().toLocaleString();
    const stampWidth = doc.getTextWidth(stamp);
    doc.text(stamp, pageW - 40 - stampWidth, 35);

    // Table
    doc.setTextColor(15, 23, 42);
    autoTable(doc, {
      startY: 72,
      head: [headers],
      body,
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [43, 89, 255], textColor: 255 },
      columnStyles: Object.fromEntries(headers.map((h, idx) => [
        idx,
        moneyHeaders.has(h) ? { halign:'right' } : {}
      ])),
      didDrawPage: (data) => {
        // Footer page number
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.setTextColor(107,114,128);
        doc.text(str, pageW - 40 - doc.getTextWidth(str), doc.internal.pageSize.getHeight() - 20);
      }
    });

    doc.save(filename.endsWith('.pdf') ? filename : (filename + '.pdf'));
  }catch(err){
    console.error('PDF export failed, falling back to CSV', err);
    exportCSV(filename.replace(/\.pdf$/i,''), headers, rows);
  }
}
