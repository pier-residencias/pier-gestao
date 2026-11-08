// Segurança (08/11/2026): sempre por HTTPS e nunca dentro de uma moldura de outro site (proteção contra "clickjacking")
(() => {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (location.protocol === 'http:' && !local) { location.replace('https://' + location.host + location.pathname + location.search + location.hash); return; }
  if (window.top !== window.self) {
    // dentro de moldura: esconde tudo e tenta abrir o site na janela inteira
    document.documentElement.style.display = 'none';
    try { window.top.location.replace(window.self.location.href); } catch (e) { /* o navegador pode impedir; o site continua escondido */ }
  }
})();
(() => {
  const root = document.documentElement;
  const button = document.getElementById('tema-alternar');
  function aplicar(tema) {
    root.dataset.theme = tema;
    if (button) {
      button.innerHTML = tema === 'dark' ? '☼ <span>Tema claro</span>' : '◐ <span>Tema escuro</span>';
      button.setAttribute('aria-label', tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = tema === 'dark' ? '#0c1117' : '#f2f5f7';
  }
  let tema = 'dark';
  try { tema = localStorage.getItem('pier-aparencia') === 'light' ? 'light' : 'dark'; } catch (_) {}
  aplicar(tema);
  if (button) button.onclick = () => {
    const novo = root.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicar(novo);
    try { localStorage.setItem('pier-aparencia', novo); } catch (_) {}
  };
})();
