/**
 * DEV TOOLS - Service Worker
 * Estratégia: Cache First (offline-first)
 * Versão: dev-tools-v1
 */

const CACHE_NAME = 'dev-tools-v1';

// Base path (raiz ou subpath ex: /dev-tools/)
const BASE = self.location.pathname.replace(/\/[^/]*$/, '') || '';
const PREFIX = BASE + (BASE.endsWith('/') ? '' : '/');

const PRECACHE_URLS = [
  PREFIX,
  PREFIX + 'index.html',
  PREFIX + 'styles.css',
  PREFIX + 'app.js',
  PREFIX + 'favicon.svg',
  PREFIX + 'js/historyManager.js',
  PREFIX + 'vendor/sql-formatter.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
].map((u) => (u.startsWith('http') ? u : self.location.origin + u));

// Instalação: pré-cache dos recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))).catch((err) => {
        console.warn('SW precache falha em algum recurso:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache First, fallback para network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Só cachear mesma origem + CDN do qrcode
  const sameOrigin = url.origin === self.location.origin;
  const isQrcodeCdn = url.href.startsWith('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/');
  if (!sameOrigin && !isQrcodeCdn) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // Fallback para index.html em navegação (SPA)
          if (event.request.mode === 'navigate') {
            const indexReq = PRECACHE_URLS.find((u) => u.endsWith('index.html') || u.endsWith('/'));
            return indexReq ? cache.match(indexReq) : cache.match(event.request.url);
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      });
    })
  );
});
