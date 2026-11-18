// Página pública de instalação do aplicativo (Android). Sem login e sem dados do sistema.
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const url = new URL("instalar.html", location.href).href;
  $("endereco").textContent = url;
  try { const qr = qrcode(0, "M"); qr.addData(url); qr.make(); $("qr").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { $("qr").textContent = url; }

  const ua = navigator.userAgent || "";
  const android = /Android/i.test(ua), iphone = /iPhone|iPad|iPod/i.test(ua);
  const instalado = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});

  if (instalado) { $("box-instalado").hidden = false; $("box-qr").hidden = true; $("sub").textContent = "Tudo pronto."; return; }
  if (iphone) { $("box-iphone").hidden = false; $("sub").textContent = "Este aplicativo é para celulares Android."; return; }
  if (!android) return; // computador: fica só o QR Code

  // no Android, o botão vem primeiro; o QR fica embaixo para passar a um colega
  $("sub").textContent = "Toque no botão para instalar no seu celular.";
  const box = $("box-android"); box.hidden = false; box.parentNode.insertBefore(box, $("box-qr"));
  let pedido = null;
  const btn = $("instalar"), estado = $("estado");
  const semBotao = () => { if (!pedido) estado.innerHTML = "Se o botão não ativar, toque nos três pontinhos <b>⋮</b> do Chrome e escolha <b>“Instalar app”</b>."; };
  const t = setTimeout(semBotao, 4000);
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); pedido = e; clearTimeout(t);
    btn.disabled = false; estado.textContent = "Pronto para instalar.";
  });
  btn.addEventListener("click", async () => {
    if (!pedido) { semBotao(); return; }
    pedido.prompt();
    const r = await pedido.userChoice.catch(() => ({}));
    pedido = null; btn.disabled = true;
    estado.textContent = r.outcome === "accepted" ? "Instalando… o ícone Pier Gestão vai aparecer na tela inicial." : "Instalação cancelada. Recarregue a página para tentar de novo.";
  });
  addEventListener("appinstalled", () => { estado.textContent = "Aplicativo instalado. Abra pelo ícone Pier Gestão na tela inicial."; btn.disabled = true; });
})();
