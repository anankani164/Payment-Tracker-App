import { BRAND } from './brand';

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
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => safe(r[h])).join(','))).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : (filename + '.csv');
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

export async function exportPDF(filename, headers, rows, opts = {}){
  try{
    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
    const autoTable = (await import('https://esm.sh/jspdf-autotable@3.8.2')).default;

    const moneyHeaders = Array.isArray(opts.money) ? new Set(opts.money) : new Set();
    const body = rows.map(r => headers.map(h => moneyHeaders.has(h) ? formatMoney(r[h]) : (r[h] ?? '')));

    const doc = new jsPDF({ orientation: opts.orientation || 'p', unit:'pt', format:'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const brandColor = BRAND?.primary || '#2b59ff';
    const [r,g,b] = brandColor.startsWith('#')
      ? [parseInt(brandColor.slice(1,3),16), parseInt(brandColor.slice(3,5),16), parseInt(brandColor.slice(5,7),16)]
      : [43,89,255];

    // Clean header bar (no logo per request)
    doc.setFillColor(r,g,b);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16);
    doc.text(opts.title || 'Report', 40, 40);
    doc.setFontSize(10);
    const stamp = new Date().toLocaleString();
    const stampW = doc.getTextWidth(stamp);
    doc.text(stamp, pageW - 40 - stampW, 40);

    autoTable(doc, {
      startY: 80, head: [headers], body,
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [r,g,b], textColor: 255 },
      columnStyles: Object.fromEntries(headers.map((h, i) => [i, moneyHeaders.has(h) ? { halign:'right' } : {}])),
      didDrawPage: () => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9); doc.setTextColor(107,114,128);
        doc.text(str, pageW - 40 - doc.getTextWidth(str), pageH - 20);
      }
    });

    doc.save(filename.endsWith('.pdf') ? filename : (filename + '.pdf'));
  }catch(err){
    console.error('PDF export failed, falling back to CSV', err);
    exportCSV(filename.replace(/\.pdf$/i,''), headers, rows);
  }
}
