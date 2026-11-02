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
