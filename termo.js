// Termo do Espaço Gourmet: leitura obrigatória até o fim, aceite e assinatura com o dedo/mouse.
// Usado na tela da Administração (app.js) e na página pública do link (assinar.html).
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fData = d => String(d || "").split("-").reverse().join("/");
  function texto(d, nome){
    const r = d.reserva, rep = s => s.replace(/\{NOME\}/g, `<u>${esc(nome || r.solicitante)}</u>`).replace(/\{BLOCO\}/g, `<u>${esc(r.bloco || "—")}</u>`).replace(/\{UNIDADE\}/g, `<u>${esc(r.unidade || "—")}</u>`)
      .replace(/\{DATA\}/g, `<u>${esc(fData(r.data))}</u>`).replace(/\{VALOR\}/g, esc(r.valorTxt)).replace(/\{VALOR_EXT\}/g, esc(r.valorExt));
    return d.termo.map(l => l === "@mapa" ? `<figure class="tg-mapa"><img src="data:image/jpeg;base64,${d.mapa}" alt="Mapa: áreas disponíveis para os participantes do evento, marcadas em azul"><figcaption>Áreas disponíveis marcadas em azul</figcaption></figure>`
      : /^# /.test(l) ? `<h4>${esc(l.slice(2))}</h4>` : /^! /.test(l) ? `<p class="tg-dec">${rep(esc(l.slice(2)))}</p>`
      : /^[a-h]\. /.test(l) ? `<p class="tg-sub">${rep(esc(l))}</p>` : /^\d+\. /.test(l) ? `<p class="tg-item">${rep(esc(l))}</p>` : `<p>${rep(esc(l))}</p>`).join("");
  }
  function montar(el, d, op){
    const r = d.reserva;
    el.innerHTML = `<div class="tg">
      <div class="tg-cab"><h3>Termo de responsabilidade para reserva e uso do Espaço Gourmet</h3>
        <div class="tg-res"><span><b>Data</b>${esc(fData(r.data))}</span><span><b>Espaço</b>${esc(r.espaco)}</span><span><b>Solicitante</b>${esc(r.solicitante)}</span><span><b>Bloco / unidade</b>${esc((r.bloco || "—") + " / " + (r.unidade || "—"))}</span><span><b>Valor</b>${esc(r.valorTxt)}</span></div></div>
      <ol class="tg-passos"><li class="on" data-p="1">Ler as regras</li><li data-p="2">Assinar</li><li data-p="3">Confirmar</li></ol>
      <div class="tg-ler"><div class="tg-barra"><span></span></div><div class="tg-texto" tabindex="0" aria-label="Texto do termo. Role até o fim para continuar.">${texto(d, r.solicitante)}<p class="tg-rod">${esc(d.rodape)}</p></div>
        <p class="tg-aviso" role="status">Role o texto até o fim para continuar.</p></div>
      <label class="tg-aceite"><input type="checkbox" disabled> <span>Li e concordo com todas as regras do termo, inclusive a penalidade de R$ 1.500,00 em caso de descumprimento.</span></label>
      <div class="tg-ass"><label class="tg-lab" for="tg-nome">Nome completo de quem assina</label><input class="tg-in" id="tg-nome" maxlength="80" value="${esc(r.solicitante)}" disabled>
        <div class="tg-lab">Assinatura <span>(com o dedo ou o mouse)</span></div>
        <div class="tg-quadro"><canvas aria-label="Quadro de assinatura"></canvas><span class="tg-linha">Assine acima da linha</span></div>
        <button type="button" class="tg-limpar" disabled>Limpar assinatura</button></div>
      <button type="button" class="tg-ok" disabled>Assinar e confirmar a reserva</button>
      <p class="tg-msg" role="status"></p></div>`;
    const $ = s => el.querySelector(s), caixa = $(".tg-texto"), barra = $(".tg-barra span"), chk = $(".tg-aceite input"), nome = $("#tg-nome"), cv = $("canvas"), ok = $(".tg-ok"), msg = $(".tg-msg");
    let lido = false, tinta = 0, desenhando = false, ult = null;
    const passo = n => el.querySelectorAll(".tg-passos li").forEach(li => li.classList.toggle("on", +li.dataset.p <= n));
    const pronto = () => { const tudo = lido && chk.checked && tinta > 60 && nome.value.trim().length >= 3; ok.disabled = !tudo; passo(tudo ? 3 : lido && chk.checked ? 2 : 1); };
    const rolar = () => { const p = Math.min(1, (caixa.scrollTop + caixa.clientHeight) / caixa.scrollHeight); barra.style.width = Math.round(p * 100) + "%";
      if (!lido && caixa.scrollTop + caixa.clientHeight >= caixa.scrollHeight - 24) { lido = true; chk.disabled = false; $(".tg-aviso").textContent = "✓ Leitura concluída. Marque que concorda e assine."; $(".tg-aviso").classList.add("ok"); pronto(); } };
    caixa.addEventListener("scroll", rolar); setTimeout(rolar, 300);
    chk.addEventListener("change", () => { const on = chk.checked; nome.disabled = !on; $(".tg-limpar").disabled = !on; el.querySelector(".tg-ass").classList.toggle("on", on); pronto(); if (on) $(".tg-ass").scrollIntoView({block:"nearest", behavior:"smooth"}); });
    nome.addEventListener("input", pronto);
    // quadro de assinatura (nítido em celular: usa a densidade da tela)
    const ctx = cv.getContext("2d");
    const ajustar = () => { const w = cv.clientWidth, h = cv.clientHeight, k = window.devicePixelRatio || 1; cv.width = Math.round(w * k); cv.height = Math.round(h * k); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#10233a"; tinta = 0; pronto(); };
    requestAnimationFrame(ajustar);
    const pt = e => { const b = cv.getBoundingClientRect(); return {x:e.clientX - b.left, y:e.clientY - b.top}; };
    cv.addEventListener("pointerdown", e => { if (!chk.checked) return; desenhando = true; ult = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener("pointermove", e => { if (!desenhando) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(ult.x, ult.y); ctx.lineTo(p.x, p.y); ctx.stroke(); tinta += Math.hypot(p.x - ult.x, p.y - ult.y); ult = p; e.preventDefault(); });
    const fim = () => { if (desenhando) { desenhando = false; pronto(); } };
    cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim); cv.addEventListener("pointerleave", fim);
    cv.style.touchAction = "none";
    $(".tg-limpar").addEventListener("click", ajustar);
    ok.addEventListener("click", async () => {
      if (ok.disabled) return; ok.disabled = true; msg.className = "tg-msg"; msg.textContent = "Enviando a assinatura…";
      try { await op.onAssinar({nome:nome.value.trim(), assinatura:cv.toDataURL("image/png"), lido:true, aceite:true, ua:navigator.userAgent.slice(0, 200)}); }
      catch(e){ msg.className = "tg-msg err"; msg.textContent = (e && e.message) || "Não foi possível enviar. Tente de novo."; ok.disabled = false; }
    });
  }
  window.TermoGourmet = { montar };
})();
