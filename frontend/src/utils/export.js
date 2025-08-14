/**
 * Export helpers using jsPDF + autoTable (no pop-ups).
 * Requires: npm install jspdf jspdf-autotable
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function downloadCSV(filename, rows){
  if (!Array.isArray(rows) || rows.length === 0){
    alert('No data to export'); return;
  }
  const headers = Object.keys(rows[0]);
  const escapeCell = v => {
    const s = (v==null?'':String(v));
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escapeCell(r[h])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadPDF(title, rows){
  if (!Array.isArray(rows) || rows.length === 0){
    alert('No data to export'); return;
  }
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF('l', 'pt', 'a4'); // landscape
  doc.setFontSize(14);
  doc.text(title, 40, 32);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 40, 48);

  const body = rows.map(r => headers.map(h => (r[h] ?? '')));
  doc.autoTable({
    startY: 60,
    head: [headers],
    body,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [231, 236, 255], textColor: 0 },
    margin: { left: 40, right: 40 }
  });
  doc.save(`${title.replace(/\s+/g,'_').toLowerCase()}.pdf`);
}
