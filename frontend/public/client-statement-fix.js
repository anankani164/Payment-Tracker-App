
/**
 * Client Statement summary cards hotfix
 * - Reads the statement table amounts and populates the three summary cards:
 *   Total Invoiced, Total Paid, Balance.
 * - Non-destructive: does not touch data or React state.
 */
(function(){
  function parseMoney(s){
    if (typeof s === 'number') return s;
    if (!s) return 0;
    // Remove currency, commas, spaces; keep minus sign and decimals
    const n = Number(String(s).replace(/[^\d\.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function isStatementPage(){
    // crude check: url contains "clients" and we see a table header with "Running Balance"
    const urlOk = /client/i.test(location.pathname || '') || /statement/i.test(document.body.innerText || '');
    const ths = Array.from(document.querySelectorAll('th, td')).map(n => (n.textContent||'').trim().toLowerCase());
    const hasRB = ths.some(t => t.includes('running balance'));
    return urlOk && hasRB;
  }
  function run(){
    if (!isStatementPage()) return;
    const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelector('td'));
    if (!rows.length) return;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let balance = 0;
    rows.forEach(r => {
      const tds = r.querySelectorAll('td');
      if (tds.length < 6) return;
      const type = (tds[1].textContent || '').trim().toLowerCase();
      const amtText = (tds[5].textContent || '').trim(); // Amount column
      const amt = parseMoney(amtText);
      if (type.includes('invoice')) totalInvoiced += Math.abs(amt);
      else if (type.includes('payment')) totalPaid += Math.abs(amt);
      const rbText = (tds[6] ? tds[6].textContent : '').trim();
      if (rbText) balance = parseMoney(rbText);
    });
    // Fallback for balance if no RB column captured
    if (!balance) balance = totalInvoiced - totalPaid;
    // Find the three summary cards (they appear as boxes above the table)
    const cards = Array.from(document.querySelectorAll('.card, [class*="card"], .summary, .totals'))
      .filter(c => /total|balance|paid|invoic/i.test(c.textContent||''));
    // A simpler approach: find labels by text and write the following sibling number
    function setByLabel(label, value){
      const el = Array.from(document.querySelectorAll('div, p, span, h4')).find(n => (n.textContent||'').trim().toLowerCase().includes(label));
      if (!el) return;
      // Find a sibling/parent that holds the number
      const parent = el.closest('div') || el.parentElement;
      if (!parent) return;
      const numEl = Array.from(parent.querySelectorAll('strong, b, h3, h4, p, span')).find(n => /\d/.test(n.textContent||'')) || parent;
      numEl.textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value).replace('GHS', 'GHS');
    }
    setByLabel('total invoiced', totalInvoiced);
    setByLabel('total paid', totalPaid);
    setByLabel('balance', balance);
  }
  const kickoff = () => setTimeout(run, 50);
  document.addEventListener('DOMContentLoaded', kickoff);
  window.addEventListener('popstate', kickoff);
  window.addEventListener('hashchange', kickoff);
  const mo = new MutationObserver(kickoff);
  mo.observe(document.documentElement, {childList:true, subtree:true});
  let tries = 0; const iv = setInterval(() => { kickoff(); if (++tries > 25) clearInterval(iv); }, 200);
})();
