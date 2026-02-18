(() => {
  const mountAlbaBadge = () => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    const existing = splash.querySelector('#logo, #logo-her');
    if (existing) {
      if (existing.tagName === 'IMG') {
        existing.setAttribute('src', '/static/alba-icon-192-v2.png');
        existing.setAttribute('alt', 'alba');
        existing.style.borderRadius = '9999px';
        existing.style.objectFit = 'cover';
      }
    }

    splash.querySelectorAll('*').forEach((el) => {
      if ((el.textContent || '').trim() === 'OI' && el.children.length === 0) {
        el.textContent = '';
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAlbaBadge, { once: true });
  } else {
    mountAlbaBadge();
  }
})();
