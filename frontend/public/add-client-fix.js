(function() {
  function tweak() {
    try {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
      const match = candidates.find(b => (b.textContent || '').trim().toLowerCase() === 'add client');
      if (!match) return;
      // Remove any "full width" utility classes if present
      ['w-full', 'w-ful', 'w-screen'].forEach(c => match.classList.remove(c));
      // Apply inline styles so they win
      match.style.maxWidth = '18rem';
      match.style.width = 'auto';
      match.style.margin = '0 auto';
      match.style.display = 'block';
      match.style.borderRadius = '9999px';
      if (!match.dataset.addClient) match.dataset.addClient = 'true';
    } catch (e) { /* noop */ }
  }
  // Run now and after route changes (SPA)
  document.addEventListener('DOMContentLoaded', tweak);
  window.addEventListener('hashchange', tweak);
  window.addEventListener('popstate', tweak);
  // Also re-run a few times to catch lazy mounts
  let tries = 0;
  const iv = setInterval(() => {
    tweak(); 
    if (++tries > 20) clearInterval(iv);
  }, 200);
})();
