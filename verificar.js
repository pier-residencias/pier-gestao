// Página pública de verificação: confere o código de autenticidade do termo e, se a pessoa escolher o PDF, se ele é o original.
(function () {
  "use strict";
  const $ = s => document.querySelector(s), res = $("#res");
  const fData = d => String(d || "").slice(0, 10).split("-").reverse().join("/") + (String(d || "").length > 10 ? " " + String(d).slice(11, 16) : "");
  async function api(acao, dados){
    const url = window.ESTOQUE_API_URL; if (!url) throw new Error("Endereço do sistema não configurado.");
    const r = await fetch(url, {method:"POST", body:JSON.stringify(Object.assign({acao}, dados || {}))});
    let j; try { j = await r.json(); } catch(e){ throw new Error("Sem resposta do sistema. Verifique a internet e tente de novo."); }
    if (!j.ok) throw new Error(j.erro || "Não foi possível verificar.");
    return j;
  }
  function linha(dl, rot, val){ const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = rot; dd.textContent = val || "—"; dl.append(dt, dd); }
  async function verificar(){
    const c = $("#c").value.trim(); if (!c) return;
    res.className = "res ok"; res.textContent = "Verificando…";
    try {
      const t = (await api("termoVerificar", {c})).termo;
      res.innerHTML = `<b>✔ Termo encontrado e válido</b><dl></dl><div class="pdf"><p>Quer conferir se um PDF é o original, sem alteração? Escolha o arquivo:</p><input type="file" id="arq" accept="application/pdf,.pdf"><p class="selo" id="selo" role="status"></p></div>`;
      const dl = res.querySelector("dl");
      linha(dl, "Código", t.codigo); linha(dl, "Espaço", t.espaco); linha(dl, "Data da reserva", fData(t.data)); linha(dl, "Unidade", t.unidade);
      linha(dl, "Assinado por", t.nome); linha(dl, "Assinado em", fData(t.assinadoEm)); linha(dl, "Forma", t.via); linha(dl, "Validado pelo condomínio", t.validadoPor ? t.validadoPor + " em " + fData(t.validadoEm) : "ainda não"); linha(dl, "Situação da reserva", t.status);
      $("#arq").addEventListener("change", async ev => {
        const f = ev.target.files[0], selo = $("#selo"); if (!f) return;
        if (!t.shaPdf) { selo.className = "selo"; selo.textContent = "Este termo não tem a impressão digital do PDF guardada."; return; }
        selo.className = "selo"; selo.textContent = "Conferindo…";
        try {
          const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await f.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join("");
          if (h === t.shaPdf) { selo.className = "selo ok"; selo.textContent = t.validadoPor ? "✔ Este PDF é exatamente o termo original, com a assinatura do morador e do representante do condomínio." : "✔ Este PDF é exatamente o termo original guardado pela Administração."; }
          else if (t.shaPdfMorador && h === t.shaPdfMorador) { selo.className = "selo ok"; selo.textContent = "✔ Este PDF é o termo original assinado pelo morador (versão antes da assinatura do representante do condomínio)."; }
          else { selo.className = "selo err"; selo.textContent = "✖ Este PDF não é igual ao original: pode ter sido alterado ou é outro arquivo."; }
        } catch(e){ selo.className = "selo err"; selo.textContent = "Não foi possível ler o arquivo."; }
      });
    } catch(e){ res.className = "res err"; res.textContent = e.message; }
  }
  $("#f").addEventListener("submit", ev => { ev.preventDefault(); verificar(); });
  const c = (/[#&]c=([A-Za-z0-9-]{8,20})/.exec(location.hash) || [])[1];
  if (c) { $("#c").value = c.toUpperCase(); verificar(); }
})();
