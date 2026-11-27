// Página pública do link do termo: abre o termo eletrônico pelo código do link; para assinar, pede o código de confirmação enviado ao e-mail da reserva.
(function () {
  "use strict";
  const caixa = document.getElementById("caixa");
  const t = (/[#&]t=([a-f0-9]{64})/.exec(location.hash) || [])[1] || "";
  const estado = (titulo, texto, ok) => { caixa.innerHTML = `<div class="estado ${ok ? "ok" : ""}">${ok ? `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg>` : ""}<h2></h2><p></p></div>`;
    caixa.querySelector("h2").textContent = titulo; caixa.querySelector("p").textContent = texto; };
  async function api(acao, dados){
    const url = window.ESTOQUE_API_URL; if (!url) throw new Error("Endereço do sistema não configurado.");
    const r = await fetch(url, {method:"POST", body:JSON.stringify(Object.assign({acao, t}, dados || {}))});
    let j; try { j = await r.json(); } catch(e){ throw new Error("Sem resposta do sistema. Verifique a internet e tente de novo."); }
    if (!j.ok) throw new Error(j.erro || "Não foi possível concluir.");
    return j;
  }
  if (!t) { estado("Link incompleto", "Abra o link exatamente como chegou no seu e-mail."); return; }
  api("termoVer").then(j => {
    caixa.innerHTML = "";
    window.TermoGourmet.montar(caixa, j.termo, { pedirCodigo: async () => (await api("termoCodigo")).msg, onAssinar: async a => { const r = await api("termoAssinar", a); estado("Termo assinado", r.msg || "Sua reserva foi atualizada.", true); window.scrollTo(0, 0); } });
  }).catch(e => estado("Não foi possível abrir o termo", e.message));
})();
