import jsPDF from 'jspdf';
import 'jspdf-autotable';
export function downloadCSV(filename, rows){
  if(!Array.isArray(rows) || rows.length===0) return alert('No data to export');
  const header = Object.keys(rows[0]);
  const csv = [ header.join(','), ...rows.map(r=> header.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(',')) ].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
export function downloadPDF(title, rows){
  if(!Array.isArray(rows) || rows.length===0) return alert('No data to export');
  const doc = new jsPDF();
  doc.text(title, 14, 14);
  const head = [Object.keys(rows[0])];
  const body = rows.map(r=> Object.values(r));
  doc.autoTable({ head, body, startY: 20, styles: { fontSize: 9 } });
  doc.save(`${title.replace(/\s+/g,'_')}.pdf`);
}
