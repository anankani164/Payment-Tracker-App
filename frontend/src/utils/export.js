/**
 * CSV + PDF (print) export helpers with zero dependencies.
 * PDF export opens a new window with a printable table and triggers window.print(),
 * so the user can choose "Save as PDF". This avoids app crashes / blank screens.
 */

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

  const w = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
  if (!w){ alert('Popup blocked. Please allow popups to export.'); return; }

  const style = `
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
      h1 { margin: 0 0 12px; font-size: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
      thead { background: #f8fafc; }
      tfoot td { font-weight: 600; }
      .muted { color: #64748b; font-size: 12px; margin: 6px 0 16px; }
      @media print {
        @page { size: A4 landscape; margin: 12mm; }
      }
    </style>
  `;

  const headerHtml = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const rowsHtml = rows.map(r => {
    return '<tr>' + headers.map(h => `<td>${escapeHtml(r[h])}</td>`).join('') + '</tr>';
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8">${style}<title>${escapeHtml(title)}</title></head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="muted">${new Date().toLocaleString()}</div>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>
          // Wait for render then print
          window.addEventListener('load', () => setTimeout(() => window.print(), 100));
        </script>
      </body>
    </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(v){
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
