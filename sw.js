// Pier Gestão: service worker mínimo (11/2026). Permite instalar o aplicativo no Android.
// Não guarda nada em cache: tudo continua vindo da internet. Sem conexão, mostra um aviso em vez da tela do navegador.
const OFF = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet · Pier Gestão</title>' +
  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1117;color:#e9f0f5;font:16px system-ui,sans-serif;text-align:center;padding:24px}' +
  'a{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:10px;background:#85bdd8;color:#102433;font-weight:700;text-decoration:none}</style></head>' +
  '<body><div><h1 style="font-size:22px">Sem internet</h1><p>O Pier Gestão precisa de conexão para abrir.<br>Confira o Wi-Fi ou os dados móveis e tente de novo.</p><a href="./">Tentar de novo</a></div></body></html>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.mode !== 'navigate' || new URL(r.url).origin !== self.location.origin) return; // o resto segue direto, sem passar por aqui
  e.respondWith(fetch(r).catch(() => new Response(OFF, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
