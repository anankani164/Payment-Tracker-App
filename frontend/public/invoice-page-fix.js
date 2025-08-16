
/**
 * Invoice details page hotfix
 * - If totals show 0 but the payments table shows negative values, compute and replace.
 * - If there are no rows yet, leave untouched.
 */
(function(){
  function parseMoney(s){
    if (typeof s === 'number') return s;
    if (!s) return 0;
    const n = Number(String(s).replace(/[^\d\.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function isInvoicePage(){
    const path = location.pathname || '';
    return /invoice/i.test(path) || /invoice #/i.test(document.body.innerText || '');
  }
  function run(){
    if (!isInvoicePage()) return;
    const rows = Array.from(document.querySelectorAll('section,div')).find(s => /payments/i.test(s.textContent||''));
    const tableRows = Array.from(document.querySelectorAll('table tbody tr')).filter(r => r.querySelector('td'));
    let paid = 0;
    tableRows.forEach(r => {
      const tds = r.querySelectorAll('td');
      if (!tds.length) return;
      const amtText = (tds[1] || tds[2] || {}).textContent || ''; // try typical columns
      const amt = parseMoney(amtText);
      if (amt < 0) paid += Math.abs(amt);
    });
    // Try to read a total from any visible "Total" text
    let total = 0;
    const totalEl = Array.from(document.querySelectorAll('div, p, span, h3, h4')).find(n => (n.textContent||'').trim().toLowerCase().match(/^total\b/));
    if (totalEl){
      // Find a sibling number
      const numEl = totalEl.parentElement && Array.from(totalEl.parentElement.querySelectorAll('strong, b, h3, h4, p, span'))
        .find(n => /\d/.test(n.textContent||''));
      if (numEl) total = parseMoney(numEl.textContent);
    }
    if (!total){
      // fallback: if invoice ref appears in the page header with #id, try to read from statement link or elsewhere (skip; leave as 0)
    }
    const balance = (total || 0) - (paid || 0);
    function setByLabel(label, value){
      const el = Array.from(document.querySelectorAll('div, p, span, h4')).find(n => (n.textContent||'').trim().toLowerCase() === label);
      if (!el) return;
      const parent = el.closest('div') || el.parentElement;
      if (!parent) return;
      const numEl = Array.from(parent.querySelectorAll('strong, b, h3, h4, p, span')).find(n => /\d/.test(n.textContent||'')) || parent;
      numEl.textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(value).replace('GHS', 'GHS');
    }
    if (paid > 0) setByLabel('paid', paid);
    if (total > 0) setByLabel('total', total);
    if (total > 0 || paid > 0) setByLabel('balance', balance);
  }
  const kickoff = () => setTimeout(run, 50);
  document.addEventListener('DOMContentLoaded', kickoff);
  window.addEventListener('popstate', kickoff);
  window.addEventListener('hashchange', kickoff);
  const mo = new MutationObserver(kickoff);
  mo.observe(document.documentElement, {childList:true, subtree:true});
  let tries = 0; const iv = setInterval(() => { kickoff(); if (++tries > 25) clearInterval(iv); }, 200);
})();
