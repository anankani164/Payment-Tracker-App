/* v2 add-client fix: non-destructive, robust finder */
(function(){
  function isClientsRoute() {
    try {
      return /client/i.test(location.pathname);
    } catch { return true; }
  }
  function looksLikeAddClient(el) {
    if (!el) return false;
    const txt = (el.textContent || "").replace(/\s+/g,' ').trim().toLowerCase();
    // match various phrasings
    return /(add|new)\s+(client|customer)/.test(txt) || /add\s*client/.test(txt) || /new\s*client/.test(txt);
  }
  function applyFix(btn){
    if (!btn) return;
    try {
      // Remove only the "full width" utilities; keep everything else
      ['w-full','w-screen'].forEach(c => btn.classList && btn.classList.remove(c));
      // Tag for CSS
      if (!btn.classList.contains('btn-add-client')) btn.classList.add('btn-add-client');
      // As a backstop, set inline width (but avoid changing padding/layout)
      btn.style.width = 'auto';
      btn.style.maxWidth = '18rem';
    } catch {}
  }
  function findAndFix(){
    if (!isClientsRoute()) return;
    const nodes = Array.from(document.querySelectorAll('button, a[role="button"], a, [data-testid]'));
    // Prefer exact label matches first
    let target = nodes.find(n => looksLikeAddClient(n));
    if (!target){
      // Try heuristics: look for a primary-looking button inside a header/toolbar area
      const headers = Array.from(document.querySelectorAll('header, .toolbar, .actions, .page-actions, .page-header, .header, .nav'));
      for (const h of headers){
        const candidate = Array.from(h.querySelectorAll('button, a')).find(looksLikeAddClient);
        if (candidate){ target = candidate; break; }
      }
    }
    if (target) applyFix(target);
  }
  // Run on load and after SPA navigations/renders
  const run = () => setTimeout(findAndFix, 0);
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('hashchange', run);
  window.addEventListener('popstate', run);
  // Observe DOM changes for React renders
  const ro = new MutationObserver(run);
  ro.observe(document.documentElement || document.body, { childList:true, subtree:true });
  // Try a few intervals as a fallback
  let tries = 0;
  const iv = setInterval(() => { run(); if (++tries > 25) clearInterval(iv); }, 200);
})();
