export function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toCSV(rows){
  if(!rows || rows.length===0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v)=> '"' + String(v??'').replace(/"/g,'""') + '"';
  const head = headers.map(escape).join(',');
  const body = rows.map(r=> headers.map(h=> escape(r[h])).join(',')).join('\n');
  return head + '\n' + body;
}

export async function downloadPDF(title, rows){
  // Simple printable window (quick win). For real PDFs use jsPDF.
  const w = window.open('', '_blank');
  const style = '<style>body{font-family:Arial} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px} th{background:#f3f4f6}</style>';
  const table = '<table>' +
    '<thead><tr>' + Object.keys(rows[0]||{}).map(k=>'<th>'+k+'</th>').join('') + '</tr></thead>' +
    '<tbody>' + rows.map(r=> '<tr>'+ Object.values(r).map(v=>'<td>'+ (v??'') +'</td>').join('') +'</tr>').join('') + '</tbody>' +
  '</table>';
  w.document.write('<h2>'+title+'</h2>' + style + table);
  w.document.close();
  w.focus();
  w.print();
}
