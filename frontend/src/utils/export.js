export function formatMoney(value, currency='GHS'){
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value) || 0;
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function exportCSV(filename, headers, rows){
  const headerLine = headers.join(',');
  const bodyLines = rows.map(row => headers.map(h => {
    let v = row[h];
    if (v === null || v === undefined) v = '';
    v = String(v);
    if (v.includes('"')) v = v.replace(/"/g, '""');
    if (/[",\n]/.test(v)) v = `"${v}"`;
    return v;
  }).join(',')).join('\n');

  const csv = headerLine + '\n' + bodyLines;
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

export async function exportPDF(filename, headers, rows, options={}){
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const orientation = options.orientation || 'landscape';
  const doc = new jsPDF({ orientation });

  const title = options.title || filename.replace(/\.pdf$/i, '');
  doc.setFontSize(14);
  doc.text(title, 14, 14);

  const head = [headers];
  const moneyCols = new Set(options.money || []);
  const body = rows.map(r => headers.map(h => moneyCols.has(h) ? formatMoney(r[h]) : (r[h] ?? '')));

  autoTable(doc, {
    startY: 20,
    head,
    body,
    styles: { fontSize: 9 }
  });

  doc.save(filename);
}
