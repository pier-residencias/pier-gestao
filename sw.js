// Pier Gestão: service worker (11/2026). Permite instalar o aplicativo no Android e abrir sem internet.
// Arquivos do próprio site: busca sempre na internet primeiro (assim nada fica desatualizado) e guarda uma cópia;
// sem conexão, usa a última cópia. Os dados do sistema (planilha) não passam por aqui.
const CACHE = 'pier-app-v1';
const OFF = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet · Pier Gestão</title>' +
  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1117;color:#e9f0f5;font:16px system-ui,sans-serif;text-align:center;padding:24px}' +
  'a{display:inline-block;margin-top:18px;padding:12px 22px;border-radius:10px;background:#85bdd8;color:#102433;font-weight:700;text-decoration:none}</style></head>' +
  '<body><div><h1 style="font-size:22px">Sem internet</h1><p>O Pier Gestão precisa de conexão para abrir.<br>Confira o Wi-Fi ou os dados móveis e tente de novo.</p><a href="./">Tentar de novo</a></div></body></html>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return; // planilha, fontes e bibliotecas seguem direto
  const nav = r.mode === 'navigate';
  const u = new URL(r.url), chave = nav ? u.origin + u.pathname : r; // a página fica guardada sem os parâmetros do endereço
  e.respondWith((async () => {
    try {
      const resp = await fetch(r);
      if (resp.ok && resp.type === 'basic') { const c = await caches.open(CACHE); c.put(chave, resp.clone()).catch(() => {}); }
      return resp;
    } catch (err) {
      const c = await caches.open(CACHE);
      const salvo = (await c.match(chave)) || (nav ? await c.match(new URL('./', self.location).href) : null);
      if (salvo) return salvo;
      if (nav) return new Response(OFF, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
      throw err;
    }
  })());
});
