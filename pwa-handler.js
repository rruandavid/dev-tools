/**
 * DEV TOOLS - PWA Handler
 * Registra Service Worker, banner de instalação e indicador offline
 */

(function () {
  const INSTALL_DISMISSED_KEY = 'devtools-pwa-install-dismissed';
  const DISMISS_DAYS = 7;

  function isPwaInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
  }

  function wasInstallDismissed() {
    try {
      const raw = localStorage.getItem(INSTALL_DISMISSED_KEY);
      if (!raw) return false;
      const t = parseInt(raw, 10);
      return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  function setInstallDismissed() {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch (e) {}
  }

  function showToast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log('[PWA]', message);
    }
  }

  // --- Service Worker ---
  if ('serviceWorker' in navigator) {
    const swUrl = document.querySelector('script[src*="pwa-handler"]')
      ? new URL('service-worker.js', document.baseURI || window.location.href).href
      : 'service-worker.js';

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: './' }).then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showToast('Nova versão disponível. Recarregue a página.', 'info');
            }
          });
        });
      }).catch((err) => console.warn('SW register failed:', err));
    });
  }

  // --- Indicador Offline ---
  function setOfflineIndicator(offline) {
    let el = document.getElementById('pwa-offline-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pwa-offline-indicator';
      el.className = 'pwa-offline-indicator';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    el.textContent = offline ? '📶 Offline' : '';
    el.setAttribute('data-visible', offline ? 'true' : 'false');
  }

  window.addEventListener('online', () => setOfflineIndicator(false));
  window.addEventListener('offline', () => setOfflineIndicator(true));
  setOfflineIndicator(!navigator.onLine);

  // --- Banner de Instalação ---
  function createInstallBanner() {
    if (isPwaInstalled() || wasInstallDismissed()) return null;

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.setAttribute('aria-label', 'Instalar aplicativo');
    banner.innerHTML = `
      <div class="pwa-install-banner__content">
        <span class="pwa-install-banner__icon">🛠️</span>
        <div class="pwa-install-banner__text">
          <strong>Instalar DEV TOOLS</strong>
          <span>Use offline como app</span>
        </div>
        <div class="pwa-install-banner__actions">
          <button type="button" class="pwa-install-banner__btn pwa-install-banner__btn--install">Instalar</button>
          <button type="button" class="pwa-install-banner__btn pwa-install-banner__btn--dismiss">Agora não</button>
          <button type="button" class="pwa-install-banner__close" aria-label="Fechar">✕</button>
        </div>
      </div>
    `;

    function hide() {
      banner.setAttribute('data-visible', 'false');
      setInstallDismissed();
    }

    function doInstall() {
      if (!deferredPrompt) {
        hide();
        return;
      }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') showToast('App instalado!', 'success');
        deferredPrompt = null;
        hide();
      });
    }

    banner.querySelector('.pwa-install-banner__btn--install').addEventListener('click', doInstall);
    banner.querySelector('.pwa-install-banner__btn--dismiss').addEventListener('click', hide);
    banner.querySelector('.pwa-install-banner__close').addEventListener('click', hide);

    return banner;
  }

  function showInstallBannerWhenEligible() {
    const banner = createInstallBanner();
    if (!banner) return;

    document.body.appendChild(banner);

    const show = () => {
      if (isPwaInstalled() || wasInstallDismissed()) return;
      banner.setAttribute('data-visible', 'true');
    };

    setTimeout(show, 2000);
  }

  window.addEventListener('load', showInstallBannerWhenEligible);
})();
