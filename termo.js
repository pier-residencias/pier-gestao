// Termo de Responsabilidade para Reserva e Uso do Espaço Gourmet (eletrônico, revisão 04): 8 etapas.
// 1 identificação · 2 a 7 itens do termo (cada um precisa de "Sim, concordo") · 8 assinatura eletrônica (nome digitado + declaração).
// Usado na tela da Administração (app.js) e na página pública do link (assinar.html). Os itens vêm do servidor.
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const fData = d => String(d || "").split("-").reverse().join("/");
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  // "Limites de utilização: texto…" → rótulo em negrito
  const rotulo = t => { const m = /^([^:]{3,30}):\s(.*)$/.exec(t); return m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(t); };
  const foneOk = s => String(s || "").replace(/\D/g, "").length >= 10;
  const emailOk = s => /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(String(s || "").trim());

  function montar(el, d, op){
    const r = d.reserva, secs = d.eletronico || [], total = secs.reduce((n, s) => n + s.itens.length, 0), ETAPAS = secs.length + 2;
    let n = 0;
    const itensHTML = secs.map((s, i) => `<section class="tge-passo" data-passo="${i + 1}" hidden>
        <div class="tge-eb">Etapa ${String(i + 2).padStart(2, "0")}</div><h4>${esc(s.titulo)}</h4>
        <p class="tge-mut">Selecione uma resposta para cada pergunta.${/brinquedo/i.test(s.titulo) ? " As regras são obrigatórias mesmo que você não pretenda usar brinquedos ou equipamentos similares." : ""}</p>
        ${/mapa/i.test(s.titulo) ? `<figure class="tg-mapa"><img src="data:image/jpeg;base64,${d.mapa}" alt="Mapa: salão, copa, WC e área externa frontal demarcados em azul"><figcaption>Somente as áreas demarcadas em azul no entorno do salão podem ser utilizadas.</figcaption></figure>` : ""}
        ${s.itens.map((it, k) => { n++; const tx = it.textos || [it.texto]; return `<fieldset class="tge-q${it.destaque ? " tge-dest" : ""}" data-ref="${esc(it.ref)}"><legend><span class="tge-n">${i + 2}.${String.fromCharCode(97 + k)})</span> ${esc(it.titulo)}</legend><ul class="tge-lista">${tx.map(t => `<li>${rotulo(t)}</li>`).join("")}</ul>
          <div class="tge-op"><label class="tge-ch"><input type="radio" name="tge${n}" value="sim"> Sim, concordo com todos</label><label class="tge-ch nao"><input type="radio" name="tge${n}" value="nao"> Não concordo</label></div></fieldset>`; }).join("")}
      </section>`).join("");
    el.innerHTML = `<div class="tg tge">
      <div class="tge-cab"><div class="tge-eb">Condomínio Pier Residências · Administração</div>
        <h3>Termo de Responsabilidade para Reserva e Uso do Espaço Gourmet</h3>
        <p class="tge-mut">Leia atentamente cada condição e manifeste sua concordância individual, marcando uma opção em cada pergunta.</p>
        <div class="tge-imp"><b>Importante:</b> qualquer discordância impede a conclusão da reserva.</div></div>
      <div class="tge-st"><div class="tge-st-l"><b class="tge-etapa"></b><span class="tge-cont"></span></div><div class="tge-bar"><span></span></div><p class="tge-gmsg" role="status"></p></div>
      <section class="tge-passo" data-passo="0">
        <div class="tge-eb">Etapa 01</div><h4>Identificação do morador e do evento</h4><p class="tge-mut">Confira os dados da reserva. Nome, telefone e e-mail são obrigatórios.</p>
        <div class="tge-grid">
          <label class="tge-f tge-full">Nome completo de quem reserva<input class="tg-in" id="tge-nome" maxlength="80" autocomplete="name" value="${esc(r.solicitante || "")}"></label>
          <label class="tge-f">Bloco / apartamento<input class="tg-in" value="${esc([r.bloco, r.unidade].filter(Boolean).join(" / ") || "—")}" readonly></label>
          <label class="tge-f">Condição<input class="tg-in" value="${esc((r.condicao || "Morador(a)") + (r.alugado ? " · unidade alugada" : ""))}" readonly></label>
          <label class="tge-f">Telefone / celular<input class="tg-in" id="tge-fone" type="tel" maxlength="30" autocomplete="tel" value="${esc(d.telefone || "")}"></label>
          <label class="tge-f">E-mail<input class="tg-in" id="tge-email" type="email" maxlength="120" autocomplete="email" value="${esc(d.email || "")}"></label>
          <label class="tge-f">Data da reserva<input class="tg-in" value="${esc(fData(r.data))}" readonly></label>
        </div>
        <p class="tge-mut tge-peq">${esc(r.espaco)} · ${esc(r.horario || "")} · valor ${esc(r.valorTxt)}</p>
      </section>
      ${itensHTML}
      <section class="tge-passo" data-passo="${ETAPAS - 1}" hidden>
        <div class="tge-eb">Etapa ${String(ETAPAS).padStart(2, "0")}</div><h4>Assinatura eletrônica</h4>
        <p>Ao assinar, declaro que li e compreendi todos os itens e que as respostas representam minha livre manifestação de concordância com as condições do termo.</p>
        <label class="tge-f">Nome de quem assina (do cadastro da reserva)<input class="tg-in" id="tge-ass" maxlength="80" autocomplete="off" readonly></label>
        <div class="tge-f">Faça sua assinatura no quadro (com o dedo ou o mouse)
          <div class="tg-quadro"><canvas aria-label="Quadro de assinatura"></canvas><span class="tg-linha">Assine acima da linha</span></div>
          <button type="button" class="tg-limpar">Limpar assinatura</button></div>
        <label class="tg-aceite"><input type="checkbox" id="tge-dec"> <span>Confirmo que sou o(a) morador(a) identificado(a), concordo em registrar minha assinatura por meio eletrônico e assumo as obrigações declaradas.</span></label>
        ${op.pedirCodigo ? `<div class="tge-otp"><b>Código de confirmação</b><p class="tge-mut">Para confirmar que é você, enviamos um código de 6 dígitos para o e-mail cadastrado na reserva.</p>
          <div class="tge-otp-l"><button type="button" class="tge-bt" id="tge-pcod">Enviar código para o meu e-mail</button><input class="tg-in" id="tge-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Código de 6 dígitos"></div>
          <p class="tge-mut tge-peq" id="tge-cmsg" role="status"></p></div>` : ""}
        <div class="tge-imp">O Pier Gestão registra o nome digitado, cada resposta, a data/hora${op.pedirCodigo ? " e a confirmação do código" : ""}. O termo assinado recebe um <b>código de autenticidade</b>, fica guardado pela Administração e uma cópia em PDF vai para o seu e-mail.</div>
      </section>
      <div class="tge-nav"><button type="button" class="tge-bt tge-volta">Voltar</button><span class="tge-lmsg" role="status"></span><button type="button" class="tge-bt pri tge-seg">Continuar</button><button type="button" class="tg-ok tge-fim" hidden>Assinar termo</button></div>
      <p class="tg-msg" role="status"></p></div>`;
    const $ = s => el.querySelector(s), $$ = s => [...el.querySelectorAll(s)];
    const passos = $$(".tge-passo"), qs = $$(".tge-q"), nome = $("#tge-nome"), email = $("#tge-email"), fone = $("#tge-fone"), ass = $("#tge-ass"), dec = $("#tge-dec");
    const resp = q => (q.querySelector("input:checked") || {}).value || "";
    let passo = 0;
    const idOk = () => nome.value.trim().split(/\s+/).length >= 2 && foneOk(fone.value) && emailOk(email.value);
    const cod = $("#tge-cod"), cv = $("canvas"), ctx = cv.getContext("2d");
    let tinta = 0, desenhando = false, ult = null, cvPronto = false;
    // quadro de assinatura (nítido em celular: usa a densidade da tela); só ganha tamanho quando a etapa 8 aparece
    const ajustar = () => { const w = cv.clientWidth, h = cv.clientHeight; if (!w) return; const k = window.devicePixelRatio || 1; cv.width = Math.round(w * k); cv.height = Math.round(h * k); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#10233a"; tinta = 0; cvPronto = true; };
    const pt = e => { const b = cv.getBoundingClientRect(); return {x:e.clientX - b.left, y:e.clientY - b.top}; };
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => { if (!cvPronto) ajustar(); desenhando = true; ult = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener("pointermove", e => { if (!desenhando) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(ult.x, ult.y); ctx.lineTo(p.x, p.y); ctx.stroke(); tinta += Math.hypot(p.x - ult.x, p.y - ult.y); ult = p; e.preventDefault(); });
    const fimTraco = () => { if (desenhando) { desenhando = false; atualizar(); } };
    cv.addEventListener("pointerup", fimTraco); cv.addEventListener("pointercancel", fimTraco); cv.addEventListener("pointerleave", fimTraco);
    $(".tg-limpar").addEventListener("click", () => { ajustar(); atualizar(); });
    const assOk = () => !!norm(ass.value) && norm(ass.value) === norm(nome.value) && tinta > 60 && dec.checked && (!cod || /^\d{6}$/.test(cod.value.trim()));
    function atualizar(){
      const sim = qs.filter(q => resp(q) === "sim").length, nao = qs.filter(q => resp(q) === "nao").length;
      const atual = passos[passo], doPasso = [...atual.querySelectorAll(".tge-q")];
      $(".tge-etapa").textContent = `Etapa ${passo + 1} de ${ETAPAS}`; $(".tge-cont").textContent = `${sim} de ${total} respostas`;
      $(".tge-bar span").style.width = (100 * sim / total) + "%";
      const g = $(".tge-gmsg"); g.className = "tge-gmsg " + (nao ? "err" : sim === total ? "ok" : "");
      g.textContent = nao ? `Reserva não autorizada: ${nao} item(ns) com discordância. Revise as respostas para continuar.` : sim === total ? "Todas as regras aceitas. Siga para a assinatura." : `Faltam ${total - sim} respostas obrigatórias.`;
      qs.forEach(q => q.classList.toggle("nao", resp(q) === "nao"));
      $(".tge-seg").disabled = passo === 0 ? !idOk() : !doPasso.every(q => resp(q) === "sim");
      $(".tge-fim").disabled = !(idOk() && sim === total && assOk());
      const l = $(".tge-lmsg");
      l.textContent = passo === 0 && !idOk() ? (nome.value.trim().split(/\s+/).length < 2 ? "Informe o nome completo." : !foneOk(fone.value) ? "Informe o telefone com DDD." : "Informe um e-mail válido.")
        : doPasso.some(q => resp(q) === "nao") ? "Não é possível avançar enquanto houver discordância nesta etapa."
        : passo === ETAPAS - 1 && ass.value && norm(ass.value) !== norm(nome.value) ? "A assinatura deve ser o mesmo nome completo da etapa 1."
        : passo === ETAPAS - 1 && ass.value && tinta <= 60 ? "Faça sua assinatura no quadro."
        : passo === ETAPAS - 1 && cod && ass.value && dec.checked && !/^\d{6}$/.test(cod.value.trim()) ? "Digite o código de 6 dígitos enviado ao seu e-mail." : "";
    }
    function mostrar(p, inicio){
      passo = p; passos.forEach((s, i) => { s.hidden = i !== p; });
      $(".tge-volta").hidden = p === 0; $(".tge-seg").hidden = p === ETAPAS - 1; $(".tge-fim").hidden = p !== ETAPAS - 1;
      atualizar(); if (inicio) return;
      el.scrollIntoView({block:"start"});
      const box = el.closest("#modal-box"); if (box) box.scrollTop = 0;
      if (p === ETAPAS - 1) { ass.value = nome.value.trim(); atualizar(); if (!cvPronto || !tinta) requestAnimationFrame(ajustar); }
    }
    el.addEventListener("input", atualizar); el.addEventListener("change", atualizar);
    $(".tge-volta").addEventListener("click", () => mostrar(Math.max(0, passo - 1)));
    $(".tge-seg").addEventListener("click", () => { if (!$(".tge-seg").disabled) mostrar(Math.min(ETAPAS - 1, passo + 1)); });
    const ok = $(".tge-fim"), msg = $(".tg-msg");
    if (op.pedirCodigo) $("#tge-pcod").addEventListener("click", async () => {
      const b = $("#tge-pcod"), m = $("#tge-cmsg"); b.disabled = true; m.className = "tge-mut tge-peq"; m.textContent = "Enviando…";
      try { m.textContent = await op.pedirCodigo(); b.textContent = "Reenviar código"; cod.focus(); setTimeout(() => { b.disabled = false; }, 60000); }
      catch(e){ m.className = "tge-mut tge-peq err"; m.textContent = (e && e.message) || "Não foi possível enviar o código."; b.disabled = false; }
    });
    ok.addEventListener("click", async () => {
      if (ok.disabled) return; ok.disabled = true; msg.className = "tg-msg"; msg.textContent = "Registrando a assinatura…";
      const respostas = {}; qs.forEach(q => { respostas[q.dataset.ref] = resp(q); });
      try { await op.onAssinar({modo:"eletronico", nome:nome.value.trim(), email:email.value.trim(), telefone:fone.value.trim(), respostas, assinaturaNome:ass.value.trim(), assinatura:cv.toDataURL("image/png"), consentimento:dec.checked, codigo:cod ? cod.value.trim() : "", ua:navigator.userAgent.slice(0, 200)}); }
      catch(e){ msg.className = "tg-msg err"; msg.textContent = (e && e.message) || "Não foi possível registrar. Tente de novo."; ok.disabled = false; }
    });
    mostrar(0, true);
  }
  window.TermoGourmet = { montar };
})();
