/**
 * src/utils/export.js
 * CSV export (no deps)
 * PDF export via lazy-loaded jsPDF + autotable (from esm.sh CDN to avoid adding npm deps).
 */

export function exportCSV(filename, headers, rows){
  const csv = [headers.join(',')].concat(
    rows.map(r => headers.map(h => {
      const val = r[h] ?? '';
      const s = (''+val).replace(/"/g,'""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.csv') ? filename : (filename + '.csv');
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

export async function exportPDF(filename, headers, rows, opts={}){
  try{
    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1');
    const autoTable = (await import('https://esm.sh/jspdf-autotable@3.8.2')).default;
    const doc = new jsPDF({ orientation: opts.orientation || 'p', unit:'pt', format:'a4' });
    const body = rows.map(r => headers.map(h => r[h] ?? ''));
    doc.setFontSize(12);
    if (opts.title) doc.text(opts.title, 40, 40);
    autoTable(doc, {
      startY: opts.title ? 60 : 40,
      head: [headers],
      body,
      styles:{ fontSize:10, cellPadding:6 },
      headStyles:{ fillColor:[43,89,255] }
    });
    doc.save(filename.endsWith('.pdf') ? filename : (filename + '.pdf'));
  }catch(err){
    console.error('PDF export failed, falling back to CSV', err);
    exportCSV(filename.replace(/\.pdf$/i,''), headers, rows);
  }
}
