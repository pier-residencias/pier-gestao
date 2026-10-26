(() => {
"use strict";
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hoje = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
const mesDe = iso => (iso||hoje()).slice(0,7);
const fData = iso => { if(!iso) return "—"; const p = String(iso).slice(0,10).split("-"); return p.length===3 ? p[2]+"/"+p[1]+"/"+p[0] : String(iso); };
const fNum = n => (Number(n)||0).toLocaleString("pt-BR",{maximumFractionDigits:3});
const fBRL = n => (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const pQtd = s => { const t = String(s??"").trim(); if(!t) return NaN; return t.includes(",") ? Number(t.replace(/\./g,"").replace(",",".")) : Number(t); };
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const nomeMes = ym => { const [y,m] = ym.split("-"); return MESES[+m-1]+" de "+y; };
const TIPOS = {
  entrada:{nome:"Entrada", verbo:"Registrar entrada"},
  saida:{nome:"Saída", verbo:"Registrar saída"},
  troca:{nome:"Troca", verbo:"Registrar troca"},
  emprestimo:{nome:"Empréstimo", verbo:"Registrar empréstimo"},
  devolucao:{nome:"Devolução"}, ajuste:{nome:"Ajuste"}, estorno:{nome:"Estorno"}
};
const pill = t => `<span class="pill p-${esc(t)}">${esc(TIPOS[t]?.nome||t)}</span>`;
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const API = (window.ESTOQUE_API_URL || "").trim();

// ---------- estado ----------
const S = {
  usuario:"", nome:"", token:"", perfil:"", perms:{}, rel:null, eq:null, dashPreset:"mes", itens:new Map(), emprestimos:[], movs:[],
  tab:"painel", tipo:"saida", picked:null, iStatus:"", hTipo:"", histMes:mesDe(), ocupado:false, ultima:null,
  os:[], colab:[], oFiltro:"aberto", fotos:new Map(), dem:[], prev:[], dFiltro:"aberto", nfArq:[], nfAnexo:null, nfLida:null, nfAuto:null,
  iPer:{tipo:"", modo:"mes", mes:mesDe(), dia:hoje()}, mesesCarregados:[],
  setores:["Manutenção"], setor:"Manutenção", empTodos:[], locais:{}, pend:null, adm:false
};
const setorDe = x => (x && x.setor) || "Manutenção";
const SETORES_PERM = [["Manutenção","setor_manutencao"],["Limpeza","setor_limpeza"]];
const setoresDasPerms = p => { const l = SETORES_PERM.filter(x => p && p[x[1]]).map(x => x[0]); return l.length ? l : ["Manutenção"]; };
const doSetor = x => setorDe(x) === S.setor;
const can = p => !!(S.perms && S.perms[p]);
const ABAS_PERM = {painel:["painel"], demandas:["dem_ver","dem_executar","dem_delegar"], os:["os_ver","os_abrir","os_atender","os_gerenciar"], registrar:["registrar_saida","registrar_entrada","registrar_troca","registrar_emprestimo"], itens:["itens_ver"], historico:["historico_ver"], emprestimos:["devolver","registrar_emprestimo"], dashboard:["dashboard"], indicadores:["dashboard"], categorias:["itens_ver"], prestadores:["os_ver","os_abrir","os_atender","os_gerenciar","dem_ver","dem_executar","dem_delegar"], equipe:["os_gerenciar","dem_delegar"], minhaequipe:["os_gerenciar","dem_delegar"], usuarios:["usuarios"], inicio:["pendencias","usuarios","acessos"], pendencias:["pendencias"], pdpainel:["pendencias"], rondas:["ronda_ver","ronda_fazer"], unidades:["un_ver","un_editar"], uncadastro:["un_ver","un_editar"], unconfig:["un_editar"], medlanc:["med_lancar"], medidores:["med_ver","med_lancar"], medrel:["med_ver","med_lancar"], esreservas:["espacos"], fornecedores:["pendencias"], esvistorias:["espacos"], esespacos:["espacos"], cotacoes:["pendencias"], acessos:["acessos"]};
// Se o navegador ainda estiver com a página antiga guardada, o menu Administração não existe nela:
// o resto do sistema continua funcionando normalmente.
const TEM_ADM = !!(document.getElementById("tab-adm") && document.getElementById("adm-menu") && document.getElementById("t-pendencias"));
if (!TEM_ADM) delete ABAS_PERM.pendencias;
if (!TEM_ADM || !document.getElementById("t-pdpainel")) delete ABAS_PERM.pdpainel;
if (!TEM_ADM || !document.getElementById("t-inicio")) delete ABAS_PERM.inicio;
if (!TEM_ADM || !document.getElementById("t-rondas")) delete ABAS_PERM.rondas;
if (!TEM_ADM || !document.getElementById("t-unidades")) { delete ABAS_PERM.unidades; delete ABAS_PERM.uncadastro; delete ABAS_PERM.unconfig; }
if (!TEM_ADM || !document.getElementById("t-fornecedores")) delete ABAS_PERM.fornecedores;
if (!TEM_ADM || !document.getElementById("t-esreservas")) { delete ABAS_PERM.esreservas; delete ABAS_PERM.esvistorias; delete ABAS_PERM.esespacos; }
if (!TEM_ADM || !document.getElementById("t-medlanc")) { delete ABAS_PERM.medlanc; delete ABAS_PERM.medidores; delete ABAS_PERM.medrel; }
if (!document.getElementById("t-indicadores")) delete ABAS_PERM.indicadores;
if (!TEM_ADM || !document.getElementById("t-acessos")) delete ABAS_PERM.acessos;
// O que aparece depende de como a pessoa entrou: Manutenção (tudo do estoque, OS e demandas),
// Limpeza (só o estoque da limpeza) ou Administração (só o menu Administração).
// "inicio" primeiro: é a tela que abre ao entrar pela Administração
const ABAS_ADM = ["inicio","pendencias","pdpainel","cotacoes","rondas","unidades","uncadastro","unconfig","medlanc","medidores","medrel","esreservas","esvistorias","esespacos","fornecedores","usuarios","acessos"];
const TIPOS_LIMPEZA = ["saida","entrada"];
const modo = () => S.adm ? "Administração" : S.setor;
// Mesmo menu nos três setores (pedido de 24/10/2026); cada pessoa vê só o que o perfil permite.
// O setor escolhido decide a página inicial (Home da Administração ou Painel do setor) e qual estoque e quais OS aparecem.
// No setor Limpeza não há demandas nem empréstimos.
// Prestadores de serviço: só no setor Manutenção (pedido de 24/10/2026).
// Pendências e compras (controle de pendências e cotações) só no setor Administração (pedidos de 24/10/2026).
// Ronda: só no setor Administração (pedido de 24/10/2026)
// Unidades e moradores: só no setor Administração (pedido de 24/10/2026; dados pessoais)
// Central de medições (água, energia e gás): só no setor Administração (pedido de 24/10/2026)
const SO_ADM = ["inicio","pdpainel","pendencias","cotacoes","rondas","unidades","uncadastro","unconfig","medlanc","medidores","medrel","esreservas","esvistorias","esespacos","fornecedores"], FORA_LIMPEZA = ["demandas","emprestimos","minhaequipe"], SO_MANUT = ["prestadores"];
const naManut = () => !S.adm && S.setor !== "Limpeza";
const abaNoModo = t => t === "painel" ? !S.adm : SO_ADM.includes(t) ? S.adm : SO_MANUT.includes(t) ? naManut() : !(!S.adm && S.setor === "Limpeza" && FORA_LIMPEZA.includes(t));
const ehSindico = () => norm(S.perfil).includes("sindico");
const ehGerente = () => norm(S.perfil).includes("gerente");
// OS por ambiente: a Limpeza vê as OS da Limpeza; a Manutenção, as da Manutenção (inclui jardinagem e as antigas, sem setor)
const osAmb = () => S.setor === "Limpeza" ? "Limpeza" : "Manutenção";
const osDoAmb = o => (o.setor === "Limpeza" ? "Limpeza" : "Manutenção") === osAmb();
const setoresReais = () => SETORES_PERM.filter(x => can(x[1])).map(x => x[0]);
const podeAdm = () => ABAS_ADM.some(t => (ABAS_PERM[t]||[]).some(can));
const podeAba = t => (ABAS_PERM[t]||[]).some(can) && abaNoModo(t);
const primeiraAba = () => (S.adm ? ABAS_ADM.find(podeAba) : Object.keys(ABAS_PERM).find(podeAba)) || "painel";
const movsDoMes = ym => S.movs.filter(m => String(m.data).slice(0,7) === ym && doSetor(m));

// descrição curta do aparelho, para o histórico de acessos
function aparelho(){
  const ua = navigator.userAgent || "";
  const tipo = /iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computador";
  const so = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [tipo, so, nav].filter(Boolean).join(" · ");
}

// ---------- sessão salva no aparelho ----------
// o aparelho guarda só o código da sessão (nunca a senha); a sessão vence no servidor
const guardar = () => { try { localStorage.setItem("estoque-sessao", JSON.stringify({usuario:S.usuario, token:S.token})); } catch(e){} };
const lerSessao = () => { try { return JSON.parse(localStorage.getItem("estoque-sessao")||"null"); } catch(e){ return null; } };
const apagarSessao = () => { try { localStorage.removeItem("estoque-sessao"); } catch(e){} };

// ---------- comunicação com a planilha ----------
// opc.soLer: só lê (ex.: meses extras para conferir nota repetida) sem trocar o que a tela mostra
async function api(acao, extra, opc){
  if (!API) throw {paraUsuario:true, message:"O endereço da planilha ainda não foi configurado (arquivo config.js)."};
  const meses = [...new Set([mesDe(), S.histMes].concat(S.iPer.tipo && S.iPer.tipo !== "cad" ? [perMes()] : []))];
  const corpo = Object.assign({acao, token:S.token, meses}, extra||{});
  let r;
  try {
    const resp = await fetch(API, {method:"POST", body:JSON.stringify(corpo), redirect:"follow"});
    r = await resp.json();
  } catch(e){
    throw {paraUsuario:true, message:"Sem conexão com a planilha. Verifique a internet e tente de novo."};
  }
  if (!r.ok) {
    if ((r.codigo === "senha" || r.codigo === "sessao") && !(acao === "entrar" && extra && extra.senha !== undefined)) { encerrarLocal(r.erro || "Sua sessão terminou. Entre de novo."); }
    throw {paraUsuario:true, message:r.erro || "Não foi possível concluir."};
  }
  if (r.token) { S.token = r.token; guardar(); }
  if (r.perms) { S.perms = r.perms; aplicarPermissoes(); }
  if (r.perfil) S.perfil = r.perfil;
  if (r.nome) S.nome = r.nome;
  // na entrada, os dados que vêm junto são aplicados depois de escolhido o setor (entradaDados); "soLer" só consulta
  if (r.dados && acao !== "entrar" && !(opc && opc.soLer)) { S.mesesCarregados = meses; aplicar(r.dados); }
  if (r.dados) r._meses = meses;
  return r;
}
// Apps Script novo: a entrada já traz os dados e as pendências (uma ida só à planilha). Com o antigo, busca como antes.
function entradaPend(r){ if (r && Array.isArray(r.pendencias)) { PD.versao = Number(r.pendVersao) || 0; S.pend = r.pendencias; PD.recebidoEm = Date.now(); } }
function entradaDados(r){ if (r && r.dados) { S.mesesCarregados = r._meses; aplicar(r.dados); renderSync(); } else atualizar(); }
const pedirPend = adm => adm || S.tab === "pendencias" || S.tab === "pdpainel" || S.tab === "inicio";
function aplicar(d){
  S.itens = new Map((d.itens||[]).map(i => [i.id, i]));
  S.empTodos = d.emprestimos || [];
  S.setores = d.setores && d.setores.length ? d.setores : ["Manutenção"];
  if (!S.setores.includes(S.setor)) { let salvo = ""; try { salvo = localStorage.getItem("estoque-setor") || ""; } catch(e){} S.setor = S.setores.includes(salvo) ? salvo : S.setores[0]; }
  S.emprestimos = S.empTodos.filter(doSetor);
  S.locais = d.locais || {};
  renderSetorSel();
  S.movs = d.movs || [];
  S.osTodas = d.os || [];
  S.os = S.osTodas.filter(osDoAmb);
  S.colab = d.colaboradores || [];
  S.dem = d.demandas || [];
  S.prev = d.preventivas || [];
  S.prest = Array.isArray(d.prestadores) ? d.prestadores : undefined; // Apps Script anterior não manda
  S.ultima = new Date();
  renderAll(); renderSugestoes();
}
async function atualizar(silencioso){
  if (S.ocupado || !S.token) return;
  S.ocupado = true; renderSync();
  try { await api("dados"); }
  catch(e){ if (!silencioso) toast(e.message, true); }
  finally { S.ocupado = false; renderSync(); }
}
function renderSync(){
  const el = $("#sync"); if (!el) return;
  el.innerHTML = S.ocupado ? `<span class="spin" aria-hidden="true"></span> Atualizando…` : S.ultima ? `Atualizado às ${S.ultima.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}` : "";
}
setInterval(() => { if (document.visibilityState==="visible" && $("#modal").hidden && S.token) { atualizar(true); if ((S.tab==="pendencias" || S.tab==="pdpainel" || S.tab==="inicio") && TEM_ADM) carregarPend(); if (S.tab==="rondas" && TEM_ADM && !RD.sujo) carregarRondas(true); } }, 45000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState==="visible" && S.token && (!S.ultima || Date.now()-S.ultima > 20000)) atualizar(true); });

// ---------- avisos ----------
let toastT;
function toast(msg, err){ const t = $("#toast"); t.textContent = msg; t.className = "toast"+(err?" err":""); t.hidden = false; clearTimeout(toastT); toastT = setTimeout(()=>t.hidden=true, Math.max(err?5500:3000, String(msg).length*55)); }
function renderNotices(){
  $("#notices").innerHTML = API ? "" : `<div class="notice crit">O endereço da planilha ainda não foi configurado. Coloque o link do App da Web do Apps Script no arquivo <b>config.js</b>.</div>`;
}

// ---------- entrada ----------
function mostrarLogin(msg){
  $("#login").hidden = false;
  try { const s0 = localStorage.getItem("estoque-entrada") || localStorage.getItem("estoque-setor"); if (s0 && [...$("#l-setor").options].some(o => o.value === s0)) $("#l-setor").value = s0; } catch(e){}
  $("#l-usuario").value = S.usuario || "";
  $("#l-senha").value = "";
  $("#l-msg").textContent = msg || ""; $("#l-msg").className = msg ? "hint err" : "hint";
  ($("#l-usuario").value ? $("#l-senha") : $("#l-usuario")).focus();
}
// sair encerra a sessão também no servidor: o código guardado no aparelho deixa de valer
function encerrarLocal(msg){ S.token = ""; S.perms = {}; S.rel = null; S.eq = null; S.pend = null; unLimparMemoria(); mdLimpar(); esLimpar(); FO.lista = null; fecharModal(); apagarSessao(); abrirMenuAdm(false); fecharMenu(); mostrarLogin(msg); renderMenu(); }
function sair(msg){
  const tk = S.token;
  if (tk && API) { try { fetch(API, {method:"POST", body:JSON.stringify({acao:"sair", token:tk}), redirect:"follow", keepalive:true}).catch(()=>{}); } catch(e){} }
  encerrarLocal(msg);
}
$("#l-esqueci").addEventListener("click", () => {
  const box = $("#l-esqueci-box"); box.hidden = !box.hidden; $("#l-esqueci").setAttribute("aria-expanded", box.hidden ? "false" : "true");
  if (!box.hidden && !$("#l-usuario").value.trim()) $("#l-usuario").focus();
});
// esqueci a senha: código pelo e-mail cadastrado; a própria pessoa cria a nova senha e já entra
function redefMsg(t, err){ const m = $("#r-msg"); m.textContent = t || ""; m.className = "hint" + (err ? " err" : ""); }
async function redefChamar(btn, acao, extra, ok){
  btn.disabled = true;
  try { ok(await api(acao, extra)); } catch(e){ redefMsg(e.message, true); } finally { btn.disabled = false; }
}
$("#r-enviar").addEventListener("click", () => {
  const usuario = $("#l-usuario").value.trim().toLowerCase();
  if (!usuario) { redefMsg("Digite o seu usuário no campo Usuário, acima.", true); $("#l-usuario").focus(); return; }
  redefMsg("Enviando…");
  redefChamar($("#r-enviar"), "esqueciSenha", {usuario, registro:{aparelho:aparelho()}}, r => {
    redefMsg(r.msg); $("#r-passo2").hidden = false; $("#r-enviar").textContent = "Reenviar código"; $("#r-codigo").focus();
  });
});
$("#r-ok").addEventListener("click", () => {
  const usuario = $("#l-usuario").value.trim().toLowerCase(), codigo = $("#r-codigo").value.replace(/\D/g, ""), nova = $("#r-nova").value.trim();
  if (!usuario) { redefMsg("Digite o seu usuário no campo Usuário, acima.", true); $("#l-usuario").focus(); return; }
  if (codigo.length !== 6) { redefMsg("Digite o código de 6 números que chegou no seu e-mail.", true); $("#r-codigo").focus(); return; }
  if (nova.length < 6) { redefMsg("A nova senha precisa ter pelo menos 6 caracteres.", true); $("#r-nova").focus(); return; }
  if (nova !== $("#r-conf").value.trim()) { redefMsg("As duas senhas não são iguais.", true); $("#r-conf").focus(); return; }
  redefMsg("Salvando…");
  redefChamar($("#r-ok"), "redefinirSenha", {usuario, codigo, nova, registro:{aparelho:aparelho()}}, () => {
    $("#l-senha").value = nova;
    ["#r-codigo", "#r-nova", "#r-conf"].forEach(s => { $(s).value = ""; });
    $("#r-passo2").hidden = true; $("#r-enviar").textContent = "Enviar código por e-mail"; redefMsg("");
    $("#l-esqueci-box").hidden = true; $("#l-esqueci").setAttribute("aria-expanded", "false");
    $("#l-entrar").click();
  });
});
// Enter dentro do quadro "Esqueci minha senha" não envia o formulário de entrada
$("#l-esqueci-box").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  ($("#r-passo2").hidden ? $("#r-enviar") : $("#r-ok")).click();
});
// trocar a própria senha (convite depois da senha provisória, ou pelo botão "Trocar senha" no topo)
function abrirMinhaSenha(o){
  o = o || {};
  const prov = !!o.provisoria;
  $("#modal-box").innerHTML = `<h3>${prov ? "Crie a sua senha" : "Trocar minha senha"}</h3>
    ${prov ? `<p class="hint" style="margin:-6px 0 12px">Você entrou com uma senha provisória, criada pela Administração. Crie agora uma senha só sua.</p>` : ""}
    <form class="form" id="f-senha" novalidate autocomplete="off">
      ${prov && o.atual ? "" : `<div class="field full"><label for="ms-atual">Senha atual</label><input class="input" id="ms-atual" type="password" autocomplete="current-password"></div>`}
      <div class="field full"><label for="ms-nova">Nova senha</label><input class="input" id="ms-nova" type="password" autocomplete="new-password"><span class="hint">Pelo menos 6 caracteres. Não use o seu usuário nem a mesma tecla repetida.</span></div>
      <div class="field full"><label for="ms-conf">Repita a nova senha</label><input class="input" id="ms-conf" type="password" autocomplete="new-password"></div>
      <label class="pd-chk full"><input type="checkbox" id="ms-ver"> Mostrar as senhas</label>
      <div class="full actions"><button class="btn primary" type="submit" id="ms-ok">Salvar minha senha</button><button class="btn" type="button" id="ms-no">${prov ? "Agora não" : "Cancelar"}</button><span class="hint" id="ms-msg"></span></div>
    </form>`;
  $("#modal").hidden = false;
  ($("#ms-atual") || $("#ms-nova")).focus();
  $("#ms-no").onclick = () => { fecharModal(); if (prov) toast("Tudo bem. Você será convidado de novo na próxima entrada."); };
  $("#ms-ver").onchange = e => $$("#f-senha input[type=password], #f-senha input[data-senha]").forEach(i => { i.dataset.senha = "1"; i.type = e.target.checked ? "text" : "password"; });
  $("#f-senha").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#ms-msg"); msg.className = "hint err";
    const atual = $("#ms-atual") ? $("#ms-atual").value.trim() : String(o.atual || ""), nova = $("#ms-nova").value.trim(), conf = $("#ms-conf").value.trim();
    if (!atual) { msg.textContent = "Informe a senha atual."; $("#ms-atual").focus(); return; }
    if (nova.length < 6) { msg.textContent = "A nova senha precisa ter pelo menos 6 caracteres."; $("#ms-nova").focus(); return; }
    if (nova !== conf) { msg.textContent = "As duas senhas novas não são iguais."; $("#ms-conf").focus(); return; }
    if (nova === atual) { msg.textContent = "A nova senha precisa ser diferente da atual."; $("#ms-nova").focus(); return; }
    const ok = $("#ms-ok"); ok.disabled = true; msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> Salvando…`;
    try {
      const r = await api("trocarSenha", {atual, nova});
      fecharModal(); toast(r.msg || "Senha trocada.");
    } catch(e){ ok.disabled = false; msg.className = "hint err"; msg.textContent = e.message; }
  });
}
$("#f-login").addEventListener("submit", async ev => {
  ev.preventDefault();
  const usuario = $("#l-usuario").value.trim().toLowerCase(), senha = $("#l-senha").value.trim(), msg = $("#l-msg");
  if (!usuario) { msg.textContent = "Informe seu usuário."; msg.className = "hint err"; return; }
  if (!senha) { msg.textContent = "Informe a senha."; msg.className = "hint err"; return; }
  const btn = $("#l-entrar"); btn.disabled = true; msg.className = "hint"; msg.textContent = "Entrando…";
  S.usuario = usuario; S.token = "";
  const setorEscolhido = $("#l-setor").value;
  $("#l-senha").value = "";
  try {
    const rEntrar = await api("entrar", {usuario, senha, registro:{motivo:"login", entrada:setorEscolhido, aparelho:aparelho()}, comDados:true, comPend:pedirPend(setorEscolhido === "Administração")});
    entradaPend(rEntrar);
    // senha provisória (criada pela Administração): convida a pessoa a criar a própria; a senha digitada fica só na memória desta janela
    const convidar = () => { if (rEntrar && rEntrar.senhaProvisoria) setTimeout(() => abrirMinhaSenha({provisoria:true, atual:senha}), 400); };
    const permitidos = setoresDasPerms(S.perms);
    try { localStorage.setItem("estoque-entrada", setorEscolhido); } catch(e){}
    // Entrada pela Administração: abre direto o menu Administração; o estoque fica no setor de sempre
    if (setorEscolhido === "Administração") {
      const aba = ABAS_ADM.find(t => (ABAS_PERM[t]||[]).some(can));
      if (!aba) {
        sair(""); $("#l-usuario").value = usuario;
        msg.className = "hint err";
        msg.textContent = `Este login não tem acesso à Administração. Escolha ${permitidos.join(" ou ")}.`;
        return;
      }
      let salvo = ""; try { salvo = localStorage.getItem("estoque-setor") || ""; } catch(e){}
      S.setor = permitidos.includes(salvo) ? salvo : permitidos[0]; S.setores = permitidos;
      S.adm = true; aplicarPermissoes();
      guardar(); $("#login").hidden = true; renderMe(); setTab(aba); entradaDados(rEntrar); convidar();
      return;
    }
    if (!setoresReais().length) {
      const soAdm = podeAdm();
      sair(""); $("#l-usuario").value = usuario;
      msg.className = "hint err";
      msg.textContent = soAdm ? "Este login entra pela opção Administração, no campo Setor." : "Este login não tem acesso a nenhum setor.";
      return;
    }
    if (!permitidos.includes(setorEscolhido)) {
      sair(""); $("#l-usuario").value = usuario;
      msg.className = "hint err";
      msg.textContent = `Este login não tem acesso ao setor ${setorEscolhido}. Escolha ${permitidos.join(" ou ")}.`;
      return;
    }
    S.setor = setorEscolhido; S.setores = permitidos; S.adm = false; aplicarPermissoes();
    try { localStorage.setItem("estoque-setor", setorEscolhido); } catch(e){}
    guardar(); $("#login").hidden = true; renderMe(); setTab(podeAba(S.tab) ? S.tab : primeiraAba()); entradaDados(rEntrar); convidar();
  } catch(e){ S.token = ""; msg.className = "hint err"; msg.textContent = e.message; $("#l-senha").focus(); }
  finally { btn.disabled = false; }
});

function iniciais(n){ const p = String(n||"").replace(/\(.*?\)/g,"").trim().split(/\s+/).filter(Boolean); return ((p[0]||"?")[0] + (p.length > 1 ? p[p.length-1][0] : "")).toUpperCase(); }
function renderMe(){
  $("#me").innerHTML = `<div class="me-box">
      <div class="me-user"><span class="avatar" aria-hidden="true">${esc(iniciais(S.nome))}</span>
        <div class="me-dados"><div class="who">${esc(S.nome)}</div><div class="me-linha"><span class="role ${can("usuarios")?"adm":""}">${esc(S.perfil||"")}</span><button class="sair" id="b-senha" type="button">Trocar senha</button><button class="sair" id="b-sair" type="button">Sair</button></div></div>
      </div>
    </div>
    <div class="sync" id="sync"></div>`;
  renderSetorSel(); renderMenu();
  $("#b-sair").onclick = () => sair("");
  $("#b-senha").onclick = () => abrirMinhaSenha();
  renderSync();
}

// ---------- abas ----------
// log de segurança: telas sensíveis e exportações ficam na Auditoria (no máximo 1 registro por tela a cada 30 min)
const TELAS_LOG = ["historico","dashboard","usuarios","pendencias","acessos","cotacoes","rondas","unidades","uncadastro","unconfig"];
const telasVistas = new Map();
function registrarTela(tela, detalhe){
  if (!S.token) return;
  const k = tela + "|" + (detalhe || ""), agoraMs = Date.now();
  if (!tela.startsWith("exportar_") && agoraMs - (telasVistas.get(k) || 0) < 30*60*1000) return;
  telasVistas.set(k, agoraMs);
  api("visao", Object.assign({tela}, detalhe ? {detalhe} : {})).catch(() => {});
}
function setTab(t){
  if (S.token && !podeAba(t)) t = primeiraAba();
  if (S.token && t !== S.tab && TELAS_LOG.includes(t)) registrarTela(t);
  if (S.token && t !== S.tab && t === "pdpainel") registrarTela("pendencias", "Dashboard");
  if (S.token && t !== S.tab && t === "indicadores") registrarTela("dashboard", "Indicadores de manutenção");
  if (t !== "indicadores" && document.body.classList.contains("ind-apres")) indApresentacao(false);
  S.tab = t;
  $$("nav.tabs [role=tablist] > button[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab===t ? "true":"false"));
  if (TEM_ADM) {
    $("#tab-adm").classList.toggle("on", ABAS_ADM.includes(t));
    $$("#adm-menu [data-adm-tab]").forEach(b => { if (b.dataset.admTab===t && !b.dataset.admAcao) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
  }
  $$("main > section").forEach(s => s.hidden = s.id !== "t-"+t);
  renderMenu(); fecharMenu();
  renderSetorSel();
  renderAll();
  if (t==="dashboard") carregarDashboard();
  if (t==="indicadores") { if (IND.dados) renderInd(); if (!IND.dados || Date.now() - IND.carregadoEm > 120000) carregarInd(); }
  if (t==="usuarios") carregarEquipe();
  if (t==="pendencias") carregarPend();
  if (t==="pdpainel") { renderPdPainel(); carregarPend(); }
  if (t==="rondas") { renderRondas(); carregarRondas(true); }
  if (t==="unidades" || t==="uncadastro" || t==="unconfig") { renderUnidadesTudo(); carregarUnidades(); }
  if (t==="medlanc" || t==="medidores" || t==="medrel") { renderMedTudo(); carregarMed(); }
  if (t==="esreservas" || t==="esvistorias" || t==="esespacos") { renderEspTudo(); carregarEsp(); }
  if (t==="fornecedores") { renderForn(); carregarForn(); }
  if (t==="inicio") { renderInicio(); if (can("pendencias")) carregarPend(); }
  if (t==="acessos") carregarAcessos();
  if (t==="cotacoes") { renderCot(); carregarCot(); }
  window.scrollTo({top:0});
  try{ history.replaceState(null,"","#"+t); }catch(e){}
}
$$("nav.tabs [role=tablist] > button[data-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));

// ---------- menu Administração ----------
function abrirMenuAdm(abrir){
  if (!TEM_ADM) return;
  const btn = $("#tab-adm"), menu = $("#adm-menu");
  if (!abrir) { if (!menu.hidden) { menu.hidden = true; btn.setAttribute("aria-expanded","false"); } return; }
  const nav = $("nav.tabs").getBoundingClientRect(), r = btn.getBoundingClientRect();
  menu.hidden = false;
  const w = menu.offsetWidth;
  menu.style.left = Math.max(16, Math.min(r.right - nav.left - w, nav.width - w - 16)) + "px";
  btn.setAttribute("aria-expanded","true");
  const first = menu.querySelector("button:not([hidden])"); if (first) first.focus();
}
if (TEM_ADM) {
$("#tab-adm").addEventListener("click", e => { e.stopPropagation(); abrirMenuAdm($("#adm-menu").hidden); });
$("#adm-menu").addEventListener("click", e => { const b = e.target.closest("[data-adm-tab]"); if (!b) return; abrirMenuAdm(false); if (S.tab !== b.dataset.admTab) setTab(b.dataset.admTab); if (b.dataset.admAcao === "nova") pdAbrirNova(); });
$("#adm-menu").addEventListener("keydown", e => {
  const items = $$("#adm-menu button:not([hidden])"), i = items.indexOf(document.activeElement);
  if (e.key==="ArrowDown") { e.preventDefault(); items[(i+1)%items.length].focus(); }
  else if (e.key==="ArrowUp") { e.preventDefault(); items[(i-1+items.length)%items.length].focus(); }
  else if (e.key==="Escape" || e.key==="Tab") { abrirMenuAdm(false); if (e.key==="Escape") $("#tab-adm").focus(); }
});
document.addEventListener("click", e => { if (!e.target.closest("#adm-menu") && !e.target.closest("#tab-adm")) abrirMenuAdm(false); });
window.addEventListener("resize", () => abrirMenuAdm(false));
$("nav.tabs .tabscroll").addEventListener("scroll", () => abrirMenuAdm(false), {passive:true});
}
$$(".kpi").forEach(k => k.addEventListener("click", () => {
  if (k.dataset.filter) { S.iStatus = k.dataset.filter; syncChips("#i-status","s",S.iStatus); }
  setTab(k.dataset.go);
}));
function syncChips(sel, key, val){ $$(sel+" .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset[key]===val ? "true":"false")); }
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go2]"); if (!g) return;
  if (g.dataset.f) { S.iStatus = g.dataset.f; syncChips("#i-status","s",S.iStatus); }
  setTab(g.dataset.go2);
});

// ---------- itens ----------
function statusItem(it){
  const q = Number(it.qtd)||0, m = Number(it.minimo)||0;
  if (q <= 0) return "zero";
  if (m > 0 && q <= m) return "baixo";   // chegou no mínimo: hora de repor
  return "ok";
}
const precisaRepor = i => statusItem(i)!=="ok";
const stPill = s => s==="zero" ? `<span class="pill s-zero">Zerado</span>` : s==="baixo" ? `<span class="pill s-baixo">Repor</span>` : `<span class="pill s-ok">OK</span>`;
const itensArr = () => [...S.itens.values()].filter(doSetor).sort((a,b) => String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
function proxCodigo(){
  const pre = S.setor === "Limpeza" ? "LIM-" : "MAN-";
  let max = 0;
  for (const it of S.itens.values()) {
    const c = String(it.codigo||"");
    if (pre !== "MAN-" && !c.toUpperCase().startsWith(pre)) continue;
    const m = /(\d+)\s*$/.exec(c); if (m) max = Math.max(max, +m[1]);
  }
  return pre + String(max+1).padStart(pre === "MAN-" ? 4 : 3, "0");
}
// seletor de setor (Manutenção | Limpeza): aparece para quem vê mais de um
function modosDisponiveis(){ return S.setores.filter(x => setoresReais().includes(x)).concat(TEM_ADM && podeAdm() ? ["Administração"] : []); }
// ícones e descrições dos setores no seletor do cabeçalho
const SETOR_INFO = {
  "Manutenção": {cls:"man", desc:"Estoque, OS e demandas", ico:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.3-.3-2.4z"/>'},
  "Limpeza": {cls:"lim", desc:"Materiais de limpeza", ico:'<path d="M12 3.5c3 3.6 5.5 6.7 5.5 9.7a5.5 5.5 0 0 1-11 0c0-3 2.5-6.1 5.5-9.7z"/>'},
  "Administração": {cls:"adm", desc:"Pendências, equipe e acessos", ico:'<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>'}
};
const icoSetor = s => `<svg viewBox="0 0 24 24" aria-hidden="true" class="ico">${(SETOR_INFO[s]||SETOR_INFO["Manutenção"]).ico}</svg>`;
function renderSetorSel(){
  renderMenuSetor();
  const el = $("#me-setor");
  if (el) {
    const atual = modo(), modos = modosDisponiveis(), info = SETOR_INFO[atual] || SETOR_INFO["Manutenção"];
    const varios = modos.filter(x => x !== atual).length > 0;
    const descAdm = !ehSindico() && (can("usuarios") || can("acessos")) ? SETOR_INFO["Administração"].desc : "Pendências";
    el.innerHTML = `<span class="setor-lbl" id="setor-lbl">Setor</span>
      <button type="button" class="setor-btn ${info.cls}" id="setor-btn" aria-labelledby="setor-lbl setor-btn" ${varios ? `aria-haspopup="true" aria-expanded="false" aria-controls="setor-menu"` : "disabled"}>
        ${icoSetor(atual)}<span>${esc(atual)}</span>${varios ? `<span class="car" aria-hidden="true">▾</span>` : ""}</button>
      ${varios ? `<div class="setor-menu" id="setor-menu" role="menu" aria-label="Trocar de setor" hidden>
        <div class="mh">Trocar de setor</div>
        ${modos.map(x => { const i = SETOR_INFO[x] || SETOR_INFO["Manutenção"]; return `<button type="button" role="menuitemradio" aria-checked="${x===atual}" class="${i.cls}" data-setor="${esc(x)}">${icoSetor(x)}<span class="t"><b>${esc(x)}</b><span>${esc(x==="Administração" ? descAdm : i.desc)}</span></span>${x===atual ? `<span class="ok" aria-hidden="true">✓</span>` : ""}</button>`; }).join("")}
      </div>` : ""}`;
  }
  $$(".setor-nome").forEach(n => n.textContent = S.setores.length > 1 ? " · " + S.setor : "");
}
// ---------- menu lateral ----------
// Os itens seguem as mesmas permissões e o mesmo setor das abas (podeAba); o contador de cada item é o da aba.
const MENU = [
  // Home: na Administração abre o Início; nos outros setores, o Painel do setor. Dashboard (pendências) só na Administração.
  {t:"painel", rot:"Home", ico:'<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>'},
  {t:"inicio", rot:"Home", ico:'<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>'},
  {t:"pdpainel", rot:"Dashboard", ico:'<path d="M4 20h16M6.5 16.5V11M11 16.5V6.5M15.5 16.5v-4M20 16.5V8.5"/>'},
  {g:"Estoque", ico:'<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM4 8.5l8 4.5 8-4.5M12 13v7"/>', itens:[
    {t:"itens", rot:"Materiais", b:"b-itens"}, {t:"categorias", rot:"Categorias de materiais"}, {t:"registrar", rot:"Registrar movimentação"}, {t:"historico", rot:"Histórico"}, {t:"emprestimos", rot:"Empréstimos", b:"b-emp"}]},
  {g:"Manutenção e rotinas", ico:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.3-.3-2.4z"/>', itens:[
    {t:"indicadores", rot:"Indicadores"}, {t:"os", acao:"osnova", perm:"os_abrir", rot:"Abrir OS"}, {t:"demandas", acao:"preventiva", perm:"dem_delegar", rot:"Manutenção preventiva"}, {t:"rondas", rot:"Ronda", b:"b-ronda"}, {t:"prestadores", rot:"Prestadores de serviço", b:"b-prest"},
    {t:"os", rot:"Ordens de serviço (OS)", b:"b-os"}, {t:"demandas", rot:"Demandas", b:"b-dem"}]},
  {g:"Pendências e compras", ico:'<path d="M8 5h11M8 12h11M8 19h11M4 5h.01M4 12h.01M4 19h.01"/>', itens:[
    {t:"pendencias", rot:"Controle de pendências", b:"b-adm"}, {t:"pendencias", acao:"nova", rot:"Incluir pendência"}, {t:"cotacoes", rot:"Cotações"}, {t:"fornecedores", rot:"Fornecedores"}]},
  {g:"Unidades", ico:'<path d="M5 21V4h10v17M15 9h4v12M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1M3 21h18"/>', itens:[
    {t:"unidades", rot:"Lista de unidades"}, {t:"uncadastro", rot:"Atualização cadastral"}, {t:"unconfig", rot:"Configurações"}]},
  {g:"Central de medições", ico:'<path d="M3 7.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 12.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 17.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>', itens:[
    {t:"medlanc", rot:"Sinalizar consumo"}, {t:"medidores", rot:"Meus medidores"}, {t:"medrel", rot:"Relatórios"}]},
  {g:"Espaços", ico:'<path d="M4 21V5a1 1 0 0 1 1-1h9v17M14 8h5v13M3 21h18M10 12v1"/>', itens:[
    {t:"esvistorias", rot:"Checklist"}, {t:"esreservas", rot:"Reservas", b:"b-esp"}, {t:"esespacos", rot:"Espaços"}]},
  {g:"Administração", ico:'<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3.5 5.5"/>', itens:[
    {t:"usuarios", rot:"Usuários"}, {t:"equipe", rot:"Equipe"}, {t:"minhaequipe", rot:"Minha equipe"}, {t:"acessos", rot:"Histórico de acessos"}]},
  {g:"Gestão", ico:'<path d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>', itens:[{t:"dashboard", rot:"Dashboard do estoque"}]}
];
const MENU_ICO = d => `<svg viewBox="0 0 24 24" aria-hidden="true" class="side-ico">${d}</svg>`;
let menuAbertos = null;
try { const x = JSON.parse(localStorage.getItem("menu-abertos") || "null"); if (Array.isArray(x)) menuAbertos = new Set(x); } catch(e){}
const menuGuardar = () => { try { localStorage.setItem("menu-abertos", JSON.stringify([...menuAbertos])); } catch(e){} };
const menuLogado = () => !!S.token && !!$("#login") && $("#login").hidden;
const itemPode = it => (TEM_ADM || !ABAS_ADM.includes(it.t)) && podeAba(it.t) && !!$("#t-" + it.t) && (!it.perm || can(it.perm));
function renderMenu(){
  const side = $("#side"); if (!side) return;
  const logado = menuLogado();
  side.hidden = !logado; $("#menu-btn").hidden = !logado;
  document.body.classList.toggle("com-menu", logado);
  if (!logado) return;
  // grupo da tela atual sempre aberto; os outros como a pessoa deixou
  const grupoAtual = MENU.find(m => m.itens && m.itens.some(i => i.t === S.tab && !i.acao));
  if (!menuAbertos) menuAbertos = new Set(grupoAtual ? [grupoAtual.g] : []);
  if (grupoAtual && !menuAbertos.has(grupoAtual.g) && menuGrupoAtual !== grupoAtual.g) { menuAbertos.add(grupoAtual.g); menuGuardar(); }
  menuGrupoAtual = grupoAtual ? grupoAtual.g : "";
  const item = (it, sub) => `<button type="button" class="side-item ${sub ? "sub" : ""}" data-mtab="${it.t}"${it.acao ? ` data-macao="${it.acao}"` : ""} ${it.t === S.tab && !it.acao ? 'aria-current="page"' : ""}>${sub ? "" : MENU_ICO(it.ico)}<span class="side-rot">${esc(it.rot)}</span>${it.b ? `<span class="badge side-b" data-b="${it.b}" hidden></span>` : ""}</button>`;
  $("#side-nav").innerHTML = MENU.map((m, k) => {
    if (!m.itens) return itemPode(m) ? item(m, false) : "";
    const vis = m.itens.filter(itemPode); if (!vis.length) return "";
    const aberto = menuAbertos.has(m.g), ativo = m === grupoAtual;
    return `<div class="side-grupo ${ativo ? "ativo" : ""}"><button type="button" class="side-item side-g" data-grupo="${esc(m.g)}" aria-expanded="${aberto}" aria-controls="side-g${k}">${MENU_ICO(m.ico)}<span class="side-rot">${esc(m.g)}</span><span class="badge side-b side-gb" hidden></span><svg class="side-car" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="side-sub" id="side-g${k}" ${aberto ? "" : "hidden"}>${vis.map(i => item(i, true)).join("")}</div></div>`;
  }).join("");
  menuBadges(); renderMenuSetor();
}
let menuGrupoAtual = "";
// contadores: copiados das abas (OS em aberto, empréstimos, demandas novas, pendências novas e aprovações)
function menuBadges(){
  $$("#side-nav .side-b[data-b]").forEach(b => {
    const o = document.getElementById(b.dataset.b);
    const n = o ? Number(o.textContent) || 0 : 0, mostrar = !!o && !o.hidden && n > 0 && b.dataset.b !== "b-itens";
    b.textContent = n; b.hidden = !mostrar; b.classList.toggle("alert", !!o && (o.classList.contains("alert") || b.dataset.b === "b-adm" || b.dataset.b === "b-dem"));
  });
  // grupo fechado mostra a soma dos alertas de dentro, para nada passar despercebido
  $$("#side-nav .side-grupo").forEach(g => {
    const gb = g.querySelector(".side-gb"), sub = g.querySelector(".side-sub");
    const n = [...g.querySelectorAll(".side-sub .side-b.alert:not([hidden])")].reduce((s, b) => s + (Number(b.textContent) || 0), 0);
    gb.textContent = n; gb.hidden = !n || !sub.hidden; gb.classList.add("alert");
  });
}
// troca de setor no fim do menu
function renderMenuSetor(){
  const el = $("#side-setor"); if (!el || !menuLogado()) return;
  const atual = modo(), modos = modosDisponiveis(), info = SETOR_INFO[atual] || SETOR_INFO["Manutenção"];
  const varios = modos.some(x => x !== atual);
  const aberto = el.dataset.aberto === "1" && varios;
  el.innerHTML = `<span class="side-lbl" id="side-setor-lbl">Setor</span>
    <button type="button" class="side-item side-setor-btn ${info.cls}" id="side-setor-btn" aria-labelledby="side-setor-lbl side-setor-btn" ${varios ? `aria-expanded="${aberto}" aria-controls="side-setores"` : "disabled"}>${icoSetor(atual)}<span class="side-rot">${esc(atual)}</span>${varios ? `<svg class="side-car" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>` : ""}</button>
    ${varios ? `<div class="side-sub side-setores" id="side-setores" role="group" aria-label="Trocar de setor" ${aberto ? "" : "hidden"}>${modos.map(x => { const i = SETOR_INFO[x] || SETOR_INFO["Manutenção"];
      return `<button type="button" class="side-item sub ${i.cls}" data-msetor="${esc(x)}" aria-pressed="${x === atual}">${icoSetor(x)}<span class="side-rot"><b>${esc(x)}</b><small>${esc(x === "Administração" && (ehSindico() || !(can("usuarios") || can("acessos"))) ? "Pendências" : i.desc)}</small></span></button>`; }).join("")}</div>` : ""}`;
}
function abrirMenu(){ const s = $("#side"); if (!s || s.hidden) return; s.classList.add("aberto"); $("#side-fundo").hidden = false; $("#menu-btn").setAttribute("aria-expanded", "true"); document.body.classList.add("menu-aberto"); const a = s.querySelector('[aria-current="page"]') || s.querySelector(".side-item"); if (a) a.focus(); }
function fecharMenu(){ const s = $("#side"); if (!s || !s.classList.contains("aberto")) return; s.classList.remove("aberto"); $("#side-fundo").hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-aberto"); }
if ($("#side")) {
  $("#menu-btn").addEventListener("click", abrirMenu);
  $("#side-x").addEventListener("click", () => { fecharMenu(); $("#menu-btn").focus(); });
  $("#side-fundo").addEventListener("click", fecharMenu);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#side").classList.contains("aberto")) { fecharMenu(); $("#menu-btn").focus(); } });
  $("#side").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.grupo) {
      const g = b.dataset.grupo, abrir = b.getAttribute("aria-expanded") !== "true";
      if (abrir) menuAbertos.add(g); else menuAbertos.delete(g); menuGuardar();
      b.setAttribute("aria-expanded", String(abrir)); b.nextElementSibling.hidden = !abrir; menuBadges(); return;
    }
    if (b.id === "side-setor-btn") { const el = $("#side-setor"); el.dataset.aberto = el.dataset.aberto === "1" ? "" : "1"; renderMenuSetor(); const f = $("#side-setores button[aria-pressed=false]"); if (f && el.dataset.aberto) f.focus(); return; }
    if (b.dataset.msetor) { $("#side-setor").dataset.aberto = ""; if (b.dataset.msetor !== modo()) { mudarModo(b.dataset.msetor); toast(`Setor ${modo()}.`); } else renderMenuSetor(); fecharMenu(); return; }
    if (b.dataset.mtab) {
      const t = b.dataset.mtab;
      if (S.tab !== t) setTab(t); else fecharMenu();
      if (b.dataset.macao === "nova" && t === "pendencias") pdAbrirNova();
      if (b.dataset.macao === "osnova") novaOS();
      if (b.dataset.macao === "preventiva") { const pv = $("#pv-box"); if (pv && !pv.hidden) setTimeout(() => pv.scrollIntoView({behavior:"smooth", block:"start"}), 60); }
    }
  });
  // contadores das abas mudam o tempo todo: o menu acompanha
  new MutationObserver(() => menuBadges()).observe($("nav.tabs"), {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["hidden","class"]});
  // ao passar para tela de computador com a gaveta aberta, fecha a gaveta
  matchMedia("(min-width:1024px)").addEventListener("change", e => { if (e.matches) fecharMenu(); });
}
function mudarModo(x){
  if (x === modo()) return;
  if (x === "Administração") { if (!TEM_ADM || !podeAdm()) return; S.adm = true; }
  else { if (!S.setores.includes(x)) return; S.adm = false; mudarSetor(x); }
  try { localStorage.setItem("estoque-entrada", x); } catch(e){}
  aplicarPermissoes(); renderSetorSel();
  setTab(podeAba(S.tab) ? S.tab : primeiraAba()); renderMenu();
}
function mudarSetor(x){
  if (x === S.setor || !S.setores.includes(x)) return;
  S.setor = x; try { localStorage.setItem("estoque-setor", x); } catch(e){}
  S.emprestimos = S.empTodos.filter(doSetor);
  S.os = (S.osTodas || []).filter(osDoAmb);
  S.picked = null; S.iStatus = ""; syncChips("#i-status","s",S.iStatus); $("#i-cat").value = "";
  renderSetorSel(); renderAll(); renderSugestoes();
}
function abrirMenuSetor(abrir){
  const m = $("#setor-menu"), b = $("#setor-btn"); if (!m || !b) return;
  m.hidden = !abrir; b.setAttribute("aria-expanded", abrir ? "true" : "false");
  if (abrir) { const f = m.querySelector('[aria-checked="false"]') || m.querySelector("button"); if (f) f.focus(); }
}
document.addEventListener("click", e => {
  const item = e.target.closest("#me-setor [data-setor]");
  if (item) { abrirMenuSetor(false); if (item.dataset.setor !== modo()) { mudarModo(item.dataset.setor); toast(`Setor ${modo()}.`); } return; }
  if (e.target.closest("#setor-btn")) { abrirMenuSetor($("#setor-menu") && $("#setor-menu").hidden); return; }
  if (!e.target.closest("#setor-menu")) abrirMenuSetor(false);
});
document.addEventListener("keydown", e => {
  const m = $("#setor-menu"); if (!m || m.hidden) return;
  const itens = $$("#setor-menu button"), i = itens.indexOf(document.activeElement);
  if (e.key === "ArrowDown") { e.preventDefault(); itens[(i+1) % itens.length].focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); itens[(i-1+itens.length) % itens.length].focus(); }
  else if (e.key === "Escape") { abrirMenuSetor(false); $("#setor-btn").focus(); }
  else if (e.key === "Tab") abrirMenuSetor(false);
});
const ordMov = (a,b) => String(b.data||"").localeCompare(String(a.data||"")) || String(b.criadoEm||"").localeCompare(String(a.criadoEm||""));
const sinal = m => (Number(m.delta)>0?"+":Number(m.delta)<0?"−":"");

// ---------- painel ----------
function renderPainel(){
  const arr = itensArr();
  const cats = new Set(arr.map(i=>i.categoria).filter(Boolean));
  $("#k-itens").textContent = arr.length;
  $("#k-itens-sub").textContent = arr.length ? `${cats.size} categoria${cats.size===1?"":"s"}` : "nenhum item ainda";
  $("#dl-cat").innerHTML = [...cats].sort().map(c=>`<option value="${esc(c)}">`).join("");
  const baixos = arr.filter(precisaRepor);
  const zerados = baixos.filter(i => statusItem(i)==="zero").length;
  $("#k-baixo").textContent = baixos.length;
  $("#k-baixo-sub").textContent = baixos.length ? `${zerados} zerado${zerados===1?"":"s"}` : "tudo em ordem";
  $("#k-baixo-box").classList.toggle("crit", baixos.length>0);
  const atras = S.emprestimos.filter(e => e.previsao && e.previsao < hoje()).length;
  $("#k-emp").textContent = S.emprestimos.length;
  $("#k-emp-sub").textContent = atras ? `${atras} atrasado${atras===1?"":"s"}` : "nenhum atrasado";
  $("#k-emp-box").classList.toggle("warn", atras>0);
  const doMes = movsDoMes(mesDe());
  const saidas = doMes.filter(m => (m.tipo==="saida"||m.tipo==="troca") && !m.estornado);
  $("#k-saidas").textContent = saidas.length;
  $("#k-saidas-sub").textContent = "retiradas e trocas em " + MESES[new Date().getMonth()];
  $("#b-itens").textContent = arr.length;
  const abertas = osAbertas(), osAtras = abertas.filter(osAtrasada);
  $("#k-os").textContent = abertas.length;
  $("#k-os-sub").textContent = osAtras.length ? `${osAtras.length} atrasada${osAtras.length===1?"":"s"}` : `${abertas.filter(o=>o.status==="Em andamento").length} em andamento`;
  $("#k-os-box").classList.toggle("crit", osAtras.length>0);
  const bo = $("#b-os"); bo.textContent = abertas.length; bo.classList.toggle("alert", osAtras.length>0);
  const lista = [...abertas].sort(ordemOS).slice(0,6);
  $("#p-os").innerHTML = lista.length ? lista.map(o => `
    <button class="row row-btn" data-os="${esc(o.id)}" type="button"><div>${prioPill(o.prioridade)}</div>
      <div><div class="t"><span class="mono muted">${esc(o.numero)}</span> ${esc(o.titulo)}</div><div class="d">${esc([o.local, o.responsavel||"sem responsável"].filter(Boolean).join(" · "))}</div></div>
      <div class="r">${statusPill(o)}<div class="d">${osAtrasada(o) ? `<span class="atras">venceu ${fData(o.prazo)}</span>` : "prazo "+fData(o.prazo)}</div></div></button>`).join("")
    + (abertas.length>6 ? `<div class="empty"><button class="link" data-go2="os">Ver todas as ${abertas.length}</button></div>`:"")
    : `<div class="empty">Nenhuma OS em aberto.${can("os_abrir") ? ` <button class="link" type="button" id="p-os-nova">Abrir uma OS</button>` : ""}</div>`;
  const be = $("#b-emp"); be.textContent = S.emprestimos.length; be.classList.toggle("alert", atras>0);
  renderPainelDem();

  const ult = doMes.filter(m => m.obs !== "Importação de inventário").sort(ordMov).slice(0,10);
  $("#p-ultimas").innerHTML = ult.length ? ult.map(m => `
    <div class="row"><div>${pill(m.tipo)}</div>
      <div><div class="t ${m.estornado?"struck":""}">${esc(m.itemNome)}</div><div class="d">${esc(descMov(m))}</div></div>
      <div class="r"><div class="num">${sinal(m)}${fNum(Math.abs(m.qtd))} ${esc(m.unidade||"")}</div><div class="d">${fData(m.data)}</div></div></div>`).join("")
    : `<div class="empty">Nenhuma movimentação neste mês. Use a aba <button class="link" data-go2="registrar">Registrar</button> quando alguém retirar, comprar, trocar ou emprestar um item.</div>`;

  const comp = [...baixos].sort((a,b) => ((a.qtd||0)-(a.minimo||0)) - ((b.qtd||0)-(b.minimo||0))).slice(0,8);
  $("#p-comprar").innerHTML = comp.length ? comp.map(i => `
    <div class="row"><div>${stPill(statusItem(i))}</div>
      <div><div class="t">${esc(i.nome)}</div><div class="d"><span class="mono">${esc(i.codigo||"")}</span>${i.local?" · "+esc(i.local):""}</div></div>
      <div class="r num">${fNum(i.qtd)} / ${fNum(i.minimo)} ${esc(i.unidade||"")}</div></div>`).join("")
    + (baixos.length>8 ? `<div class="empty"><button class="link" data-go2="itens" data-f="baixo">Ver todos os ${baixos.length}</button></div>`:"")
    : `<div class="empty">${arr.length ? "Nenhum item no estoque mínimo ou abaixo dele." : "Quando os itens forem cadastrados com estoque mínimo, os que precisam de reposição aparecem aqui."}</div>`;

  const cont = {};
  for (const m of saidas) { const k = String(m.destino||"Sem destino").trim(); cont[k] = (cont[k]||0)+1; }
  const top = Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = top.length ? top[0][1] : 1;
  $("#p-destinos").innerHTML = top.length ? top.map(([k,v]) => `
    <div class="bar"><span class="n" title="${esc(k)}">${esc(k)}</span><span class="track"><span class="fill" style="width:${Math.max(4,v/max*100)}%;display:block"></span></span><span class="v">${v}</span></div>`).join("")
    : `<div class="empty">As saídas e trocas do mês aparecem aqui agrupadas por destino.</div>`;
}
function descMov(m){
  const p = [];
  if (m.tipo==="entrada") { if (m.fornecedor) p.push(m.fornecedor); if (m.nf) p.push("NF "+m.nf); }
  else if (m.tipo==="devolucao") { p.push("devolvido por "+(m.responsavel||"—")); if (m.estadoDevolucao) p.push(String(m.estadoDevolucao).toLowerCase()); }
  else if (m.tipo==="ajuste") { p.push(m.motivo || "ajuste de inventário"); }
  else if (m.tipo==="estorno") { p.push("correção de lançamento"); if (m.motivo) p.push(m.motivo); }
  else { if (m.os) p.push(m.os); if (m.responsavel) p.push(m.responsavel); if (m.destino) p.push("→ "+m.destino); if (m.tipo==="troca" && m.velhoDestino) p.push("peça velha: "+String(m.velhoDestino).toLowerCase()); }
  if (m.estornado) p.push("estornado");
  return p.join(" · ");
}

// ---------- tela de itens ----------
// filtro por data na tela de itens
const perMes = () => S.iPer.modo === "dia" ? String(S.iPer.dia || hoje()).slice(0,7) : (S.iPer.mes || mesDe());
const naData = d => { const x = String(d || ""); return S.iPer.modo === "dia" ? x.slice(0,10) === S.iPer.dia : x.slice(0,7) === S.iPer.mes; };
const descPer = () => S.iPer.modo === "dia" ? fData(S.iPer.dia) : nomeMes(S.iPer.mes || mesDe());
function resumoPeriodo(){
  const por = {};
  S.movs.forEach(m => {
    if (m.estornado || m.tipo === "estorno" || !naData(m.data)) return;
    const r = por[m.itemId] = por[m.itemId] || {ent:0, sai:0, emp:0, dev:0, aj:0, n:0};
    const q = Number(m.qtd) || 0; r.n++;
    if (m.tipo === "entrada") r.ent += q;
    else if (m.tipo === "saida" || m.tipo === "troca") r.sai += q;
    else if (m.tipo === "emprestimo") r.emp += q;
    else if (m.tipo === "devolucao") r.dev += q;
    else if (m.tipo === "ajuste") r.aj++;
  });
  return por;
}
function renderPerFiltro(){
  const t = S.iPer.tipo, on = !!t;
  $("#i-per-modo").hidden = !on; $("#i-per-limpar").hidden = !on;
  $("#i-per-mes").hidden = !on || S.iPer.modo !== "mes"; $("#i-per-dia").hidden = !on || S.iPer.modo !== "dia";
  $("#i-per-mes").value = S.iPer.mes; $("#i-per-dia").value = S.iPer.dia;
  syncChips("#i-per-modo", "m", S.iPer.modo);
  $("#i-th-per").hidden = !on;
}
function mudouPer(){
  renderPerFiltro(); renderItens();
  if (S.iPer.tipo && S.iPer.tipo !== "cad" && !S.mesesCarregados.includes(perMes())) atualizar();
}
$("#i-per-tipo").addEventListener("change", () => { S.iPer.tipo = $("#i-per-tipo").value; mudouPer(); });
$$("#i-per-modo .chip").forEach(c => c.addEventListener("click", () => { S.iPer.modo = c.dataset.m; mudouPer(); }));
$("#i-per-mes").addEventListener("change", () => { S.iPer.mes = $("#i-per-mes").value || mesDe(); mudouPer(); });
$("#i-per-dia").addEventListener("change", () => { S.iPer.dia = $("#i-per-dia").value || hoje(); mudouPer(); });
$("#i-per-limpar").addEventListener("click", () => { S.iPer.tipo = ""; $("#i-per-tipo").value = ""; mudouPer(); });
renderPerFiltro();

function renderItens(){
  const q = norm($("#i-busca").value), cat = $("#i-cat").value;
  const all = itensArr();
  const pt = S.iPer.tipo, per = pt ? resumoPeriodo() : null;
  const carregando = pt && pt !== "cad" && !S.mesesCarregados.includes(perMes());
  const cats = [...new Set(all.map(i=>i.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const sel = $("#i-cat"), cur = sel.value;
  sel.innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c=>`<option ${c===cur?"selected":""}>${esc(c)}</option>`).join("");
  const list = all.filter(i => {
    if (cat && i.categoria!==cat) return false;
    const st = statusItem(i);
    if (S.iStatus==="baixo" && st==="ok") return false;
    if (S.iStatus==="zero" && st!=="zero") return false;
    if (q && !norm([i.nome,i.codigo,i.local,i.categoria].join(" ")).includes(q)) return false;
    if (pt === "cad" && !naData(i.criadoEm)) return false;
    if (pt === "ent" && !(per[i.id] && per[i.id].ent > 0)) return false;
    if (pt === "sai" && !(per[i.id] && per[i.id].sai > 0)) return false;
    if (pt === "mov" && !per[i.id]) return false;
    return true;
  });
  if (pt === "cad") list.sort((a,b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  else if (pt) { const k = pt === "ent" ? "ent" : pt === "sai" ? "sai" : "n"; list.sort((a,b) => (per[b.id][k] - per[a.id][k]) || String(a.nome).localeCompare(String(b.nome),"pt-BR")); }
  const colPer = i => {
    if (pt === "cad") return `<span class="muted">${fDataHora(i.criadoEm)}</span>`;
    const r = per[i.id] || {}, u = esc(i.unidade||""), p = [];
    if (r.ent) p.push(`<span class="per-ent">+${fNum(r.ent)} ${u} entrada</span>`);
    if (r.sai) p.push(`<span class="per-sai">−${fNum(r.sai)} ${u} saída</span>`);
    if (r.emp) p.push(`${fNum(r.emp)} ${u} emprestado`);
    if (r.dev) p.push(`${fNum(r.dev)} ${u} devolvido`);
    if (r.aj) p.push(`${r.aj} ajuste${r.aj===1?"":"s"}`);
    return p.join("<br>") || "—";
  };
  $("#i-count").textContent = all.length ? `${list.length} de ${all.length} itens` + (pt ? ` · ${descPer()}` : "") : "";
  $("#i-body").innerHTML = list.length ? list.map(i => `
    <tr><td class="mono">${esc(i.codigo||"—")}</td>
    <td><b>${esc(i.nome)}</b><span class="sub">${esc(i.tipoItem||"")}</span></td>
    ${pt ? `<td class="per-cel">${colPer(i)}</td>` : ""}
    <td class="hide-m">${esc(i.categoria||"—")}</td>
    <td class="hide-s">${esc(i.local||"—")}</td>
    <td class="n"><b>${fNum(i.qtd)}</b> <span class="muted">${esc(i.unidade||"")}</span></td>
    <td class="n hide-s">${Number(i.minimo)>0?fNum(i.minimo):"—"}</td>
    <td>${stPill(statusItem(i))}</td>
    <td class="n"><button class="btn small" data-item="${esc(i.id)}">${can("itens_editar")?"Editar":"Ver"}</button></td></tr>`).join("")
    : `<tr><td colspan="9"><div class="empty">${carregando ? `<span class="spin" aria-hidden="true"></span> Buscando as movimentações de ${esc(descPer())}…` : pt && all.length ? `Nenhum item ${{cad:"cadastrado", ent:"com entrada", sai:"com saída ou troca", mov:"com movimento"}[pt]} em ${esc(descPer())}.` : all.length ? "Nenhum item com esses filtros." : (S.ultima ? "Nenhum item cadastrado ainda. Cadastre o primeiro em <b>Novo item</b>." : "Carregando os itens da planilha…")}</div></td></tr>`;
}
$("#i-busca").addEventListener("input", renderItens);
$("#i-cat").addEventListener("change", renderItens);
$$("#i-status .chip").forEach(c => c.addEventListener("click", () => { S.iStatus = c.dataset.s; syncChips("#i-status","s",S.iStatus); renderItens(); }));
$("#i-body").addEventListener("click", e => { const b = e.target.closest("[data-item]"); if (b) abrirItem(b.dataset.item); });
$("#i-novo").addEventListener("click", () => abrirItem(null));

// ---------- janelas ----------
function fecharModal(){ $("#modal").hidden = true; $("#modal-box").innerHTML = ""; $("#modal-box").onclick = null; $("#modal-box").classList.remove("largo", "ao"); }
$("#modal").addEventListener("click", e => { if (e.target.id==="modal") fecharModal(); });
document.addEventListener("keydown", e => { if (e.key==="Escape" && !$("#modal").hidden) fecharModal(); });
async function enviar(btn, msgEl, acao, extra, aoConcluir){
  if (btn) btn.disabled = true;
  if (msgEl) { msgEl.className = "hint"; msgEl.innerHTML = `<span class="spin" aria-hidden="true"></span> Salvando…`; }
  S.ocupado = true; renderSync();
  try {
    const r = await api(acao, extra);
    if (aoConcluir) aoConcluir(r);
    toast(r.msg || "Salvo.");
    return r;
  } catch(e){
    if (msgEl) { msgEl.className = "hint err"; msgEl.textContent = e.message || "Não foi possível salvar."; } else toast(e.message, true);
    return null;
  } finally { if (btn) btn.disabled = false; S.ocupado = false; renderSync(); }
}

function abrirItem(id, depois){
  const it = id ? S.itens.get(id) : null;
  const novo = !it, edit = novo ? can("itens_cadastrar") : can("itens_editar");
  const limpeza = (it ? setorDe(it) : S.setor) === "Limpeza";
  const v = it || {codigo:proxCodigo(), nome:"", categoria:"", tipoItem:limpeza ? "Produto químico" : "Consumível", unidade:"un", local:"", qtd:"", minimo:"", obs:"", setor:S.setor};
  const ro = edit ? "" : "disabled";
  const unidades = ["un","pç","par","m","m²","kg","g","L","ml","cx","pct","rolo","galão","bombona","fardo","lata","jogo"];
  if (v.unidade && !unidades.includes(v.unidade)) unidades.push(v.unidade);
  const tipos = limpeza ? ["Produto químico","Descartável","Utensílio","EPI","Consumível"] : ["Consumível","Ferramenta","Peça de reposição","Equipamento","EPI"];
  if (v.tipoItem && !tipos.includes(v.tipoItem)) tipos.push(v.tipoItem);
  const numTxt = x => x===""||x==null ? "" : esc(String(x).replace(".",","));
  $("#modal-box").innerHTML = `
    <h3>${novo ? "Novo item" : edit ? "Editar item" : "Detalhes do item"}</h3>
    <form class="form" id="f-item" novalidate autocomplete="off">
      ${S.setores.length > 1 ? `<div class="field full"><label for="it-setor">Setor</label><select class="input" id="it-setor" ${ro}>${S.setores.map(x => `<option ${x===setorDe(v)?"selected":""}>${esc(x)}</option>`).join("")}</select></div>` : ""}
      <div class="field"><label for="it-cod">Código</label><input class="input mono" id="it-cod" value="${esc(v.codigo)}" ${ro}></div>
      <div class="field"><label for="it-tipo">Tipo</label><select class="input" id="it-tipo" ${ro}>${tipos.map(o=>`<option ${o===v.tipoItem?"selected":""}>${esc(o)}</option>`).join("")}</select></div>
      <div class="field full"><label for="it-nome">Nome do item <span class="req">*</span></label><input class="input" id="it-nome" value="${esc(v.nome)}" placeholder="Ex.: Lâmpada LED tubular 18W" ${ro}></div>
      <div class="field"><label for="it-cat">Categoria</label><input class="input" id="it-cat" value="${esc(v.categoria)}" list="dl-cat" placeholder="Ex.: Elétrica" ${ro}></div>
      <div class="field"><label for="it-local">Local de guarda</label><input class="input" id="it-local" value="${esc(v.local)}" placeholder="Ex.: Prateleira A3" ${ro}></div>
      <div class="field"><label for="it-qtd">${novo?"Quantidade atual":"Estoque atual"}</label><input class="input num" id="it-qtd" inputmode="decimal" value="${numTxt(v.qtd)}" placeholder="0" ${ro}></div>
      <div class="field"><label for="it-un">Unidade</label><select class="input" id="it-un" ${ro}>${unidades.map(u=>`<option ${u===v.unidade?"selected":""}>${esc(u)}</option>`).join("")}</select></div>
      <div class="field"><label for="it-min">Estoque mínimo</label><input class="input num" id="it-min" inputmode="decimal" value="${Number(v.minimo)>0?numTxt(v.minimo):""}" placeholder="Avisa quando ficar abaixo" ${ro}></div>
      <div class="field" id="it-motivo-box" hidden><label for="it-motivo">Motivo da mudança no estoque <span class="req">*</span></label><input class="input" id="it-motivo" placeholder="Ex.: contagem do inventário"></div>
      <div class="field full"><label for="it-obs">Observação</label><textarea class="input" id="it-obs" ${ro}>${esc(v.obs||"")}</textarea></div>
      <div class="full actions">
        ${edit ? `<button class="btn primary" type="submit" id="it-salvar">${novo?"Cadastrar item":"Salvar alterações"}</button>`:""}
        <button class="btn" type="button" id="it-fechar">${edit?"Cancelar":"Fechar"}</button>
        ${!novo && edit ? `<button class="btn danger" type="button" id="it-del" style="margin-left:auto">Excluir item</button>`:""}
        <span class="hint" id="it-msg"></span>
      </div>
      <div class="full confirm" id="it-conf" hidden>
        <span>Excluir <b>${esc(v.nome)}</b> do cadastro? O histórico de movimentações continua guardado.</span>
        <div class="actions"><button class="btn danger" type="button" id="it-del-ok">Sim, excluir</button><button class="btn" type="button" id="it-del-no">Manter item</button></div>
      </div>
    </form>`;
  $("#modal").hidden = false;
  (edit ? $("#it-nome") : $("#it-fechar")).focus();
  $("#it-fechar").onclick = fecharModal;
  if (!novo && edit) {
    const orig = Number(it.qtd)||0;
    $("#it-qtd").addEventListener("input", () => { const q = pQtd($("#it-qtd").value); $("#it-motivo-box").hidden = !(Number.isFinite(q) && q !== orig); });
    $("#it-del").onclick = () => { $("#it-conf").hidden = false; };
    $("#it-del-no").onclick = () => { $("#it-conf").hidden = true; };
    $("#it-del-ok").onclick = () => enviar($("#it-del-ok"), $("#it-msg"), "excluirItem", {id:it.id}, fecharModal);
  }
  $("#f-item").addEventListener("submit", async ev => {
    ev.preventDefault(); if (!edit) return;
    const msg = $("#it-msg"); msg.className = "hint err";
    const nome = $("#it-nome").value.trim();
    if (!nome) { msg.textContent = "Informe o nome do item."; return; }
    const qtdTxt = $("#it-qtd").value.trim(), qtd = qtdTxt==="" ? 0 : pQtd(qtdTxt);
    if (!Number.isFinite(qtd) || qtd < 0) { msg.textContent = "Quantidade inválida."; return; }
    const minTxt = $("#it-min").value.trim(), minimo = minTxt==="" ? 0 : pQtd(minTxt);
    if (!Number.isFinite(minimo) || minimo < 0) { msg.textContent = "Estoque mínimo inválido."; return; }
    const codigo = $("#it-cod").value.trim();
    const dup = codigo && [...S.itens.values()].find(x => x.codigo===codigo && x.id!==(it&&it.id));
    if (dup) { msg.textContent = `O código ${codigo} já é usado por "${dup.nome}".`; return; }
    let motivo = "";
    if (!novo && qtd !== (Number(it.qtd)||0)) { motivo = $("#it-motivo").value.trim(); if (!motivo) { msg.textContent = "Explique o motivo da mudança no estoque."; return; } }
    const item = { id: it ? it.id : "", codigo, nome, categoria:$("#it-cat").value.trim(), tipoItem:$("#it-tipo").value, unidade:$("#it-un").value, local:$("#it-local").value.trim(), qtd, minimo, obs:$("#it-obs").value.trim(), setor: $("#it-setor") ? $("#it-setor").value : setorDe(v) };
    const antes = new Set(S.itens.keys());
    await enviar($("#it-salvar"), msg, "salvarItem", {item, motivo}, () => {
      fecharModal();
      if (depois) { const novoId = [...S.itens.keys()].find(k => !antes.has(k)); if (novoId) depois(novoId); }
    });
  });
}

// ---------- registrar ----------
function setTipo(t){
  if (typeof fecharResumoNota === "function" && $("#m-resumo") && !$("#m-resumo").hidden) fecharResumoNota();
  S.tipo = t;
  $$("#seg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tipo===t?"true":"false"));
  $$("#f-mov [data-for]").forEach(f => f.hidden = !f.dataset.for.split(" ").includes(t));
  if (!podeAba("os")) $("#m-osref-box").hidden = true;
  $("#m-enviar").textContent = TIPOS[t].verbo;
  $("#m-resp-lbl").innerHTML = (t==="emprestimo" ? "Com quem fica" : t==="troca" ? "Quem fez a troca" : "Quem retirou") + ' <span class="req">*</span>';
  $("#m-destino-lbl").innerHTML = (t==="troca" ? "Onde foi instalada (local ou equipamento)" : t==="emprestimo" ? "Onde vai ser usada" : "Destino (setor, local ou equipamento)") + ' <span class="req">*</span>';
  $("#m-msg").textContent = ""; $("#m-msg").className = "hint";
  renderPicked();
}
$$("#seg button").forEach(b => b.addEventListener("click", () => setTipo(b.dataset.tipo)));

let comboHl = -1, comboRes = [];
function renderCombo(){
  const q = norm($("#m-busca").value), box = $("#m-lista");
  if (!q) { box.hidden = true; $("#m-busca").setAttribute("aria-expanded","false"); return; }
  comboRes = itensArr().filter(i => norm(i.nome+" "+(i.codigo||"")+" "+(i.categoria||"")).includes(q)).slice(0,30);
  box.innerHTML = comboRes.length ? comboRes.map((i,k) => `<button type="button" role="option" data-id="${esc(i.id)}" class="${k===comboHl?"hl":""}"><span class="mono muted">${esc(i.codigo||"")}</span><span>${esc(i.nome)}</span><span class="num muted">${fNum(i.qtd)} ${esc(i.unidade||"")}</span></button>`).join("")
    : `<div class="empty" style="padding:10px 12px">Nenhum item encontrado. <button type="button" class="link" id="m-novo2">Cadastrar “${esc($("#m-busca").value.trim())}”</button></div>`;
  box.hidden = false; $("#m-busca").setAttribute("aria-expanded","true");
}
$("#m-busca").addEventListener("input", () => { comboHl = -1; renderCombo(); });
$("#m-busca").addEventListener("keydown", e => {
  if ($("#m-lista").hidden) return;
  if (e.key==="ArrowDown") { e.preventDefault(); comboHl = Math.min(comboRes.length-1, comboHl+1); renderCombo(); }
  else if (e.key==="ArrowUp") { e.preventDefault(); comboHl = Math.max(0, comboHl-1); renderCombo(); }
  else if (e.key==="Enter") { e.preventDefault(); const it = comboRes[comboHl<0?0:comboHl]; if (it) pick(it.id); }
  else if (e.key==="Escape") { $("#m-lista").hidden = true; }
});
$("#m-lista").addEventListener("click", e => {
  const b = e.target.closest("[data-id]"); if (b) { pick(b.dataset.id); return; }
  if (e.target.id==="m-novo2") novoDoRegistro($("#m-busca").value.trim());
});
document.addEventListener("click", e => { if (!e.target.closest(".combo")) $("#m-lista").hidden = true; });
function pick(id){ S.picked = id; $("#m-busca").value = ""; $("#m-lista").hidden = true; renderPicked(); $("#m-qtd").focus(); }
function renderPicked(){
  const it = S.picked && S.itens.get(S.picked), box = $("#m-picked");
  if (!it) { box.hidden = true; $("#m-busca").hidden = false; return; }
  $("#m-busca").hidden = true; box.hidden = false;
  box.innerHTML = `<span><span class="mono muted">${esc(it.codigo||"")}</span> <b>${esc(it.nome)}</b></span><span class="num">Em estoque: <b>${fNum(it.qtd)} ${esc(it.unidade||"")}</b> ${stPill(statusItem(it))} <button type="button" class="link" id="m-trocar" style="margin-left:8px">Trocar item</button></span>`;
  $("#m-trocar").onclick = () => { S.picked = null; renderPicked(); $("#m-busca").focus(); };
}
function novoDoRegistro(nome){ if (!can("itens_cadastrar")) return; abrirItem(null, id => pick(id)); if (nome) $("#it-nome").value = nome; }
$("#m-novo").addEventListener("click", () => novoDoRegistro(""));

$("#f-mov").addEventListener("submit", async ev => {
  ev.preventDefault();
  const msg = $("#m-msg"); msg.className = "hint err";
  const it = S.picked && S.itens.get(S.picked);
  if (!it) { msg.textContent = "Escolha o item."; return; }
  const qtd = pQtd($("#m-qtd").value || "1");
  if (!Number.isFinite(qtd) || qtd <= 0) { msg.textContent = "Informe uma quantidade maior que zero."; return; }
  const t = S.tipo, data = $("#m-data").value || hoje();
  const resp = $("#m-resp").value.trim(), destino = $("#m-destino").value.trim();
  if (t!=="entrada") {
    if (!resp) { msg.textContent = t==="emprestimo" ? "Informe com quem a ferramenta vai ficar." : "Informe quem retirou."; return; }
    if (!destino) { msg.textContent = "Informe o destino."; return; }
    if (qtd > (Number(it.qtd)||0)) { msg.textContent = `Estoque insuficiente: há ${fNum(it.qtd)} ${it.unidade||""}. Se a contagem estiver errada, a administração pode ajustar o item.`; return; }
  }
  if (t==="troca" && !$("#m-velho").value) { msg.textContent = "Informe o que foi feito com a peça retirada."; return; }
  const valorTxt = $("#m-valor").value.trim(), valor = valorTxt ? pQtd(valorTxt) : "";
  if (t==="entrada" && valorTxt && !Number.isFinite(valor)) { msg.textContent = "Valor unitário inválido."; return; }
  const mov = { tipo:t, itemId:it.id, qtd, data, obs:$("#m-obs").value.trim() };
  if (t==="entrada") Object.assign(mov, { fornecedor:$("#m-forn").value.trim(), nf:$("#m-nf").value.trim(), valorUnit:valor, responsavel:$("#m-recebeu").value.trim() });
  if (t==="entrada" && S.nfArq.length) {
    if (S.nfLida && S.nfLida.lendo) { msg.textContent = "Aguarde: a nota anexada ainda está sendo lida."; return; }
    const dv = divergenciaNF(mov.nf);
    if (dv) { msg.textContent = `O campo Nota fiscal ${dv.campo ? `diz ${dv.campo}` : "está vazio"}, mas a nota anexada é a ${dv.doc}. Corrija o campo ou use “Conferir e registrar”, onde dá para confirmar um número diferente.`; return; }
  }
  let nfIds = [];
  if (t==="entrada") {
    if (S.nfArq.length) {
      const btn = $("#m-enviar"); btn.disabled = true;
      try { nfIds = await enviarNF(S.nfArq, mov.nf, mov.fornecedor, msg); }
      finally { btn.disabled = false; }
      if (!nfIds) return;
    } else if (nfAnexoValido()) nfIds = S.nfAnexo.ids;
    if (nfIds.length) mov.nfFotos = nfIds.join(",");
  } else Object.assign(mov, { responsavel:resp, destino, motivo: t==="emprestimo" ? "" : $("#m-os").value.trim() });
  if (t==="troca") mov.velhoDestino = $("#m-velho").value;
  if (t==="emprestimo") mov.previsao = $("#m-prev").value || "";
  if ((t==="saida" || t==="troca") && $("#m-osref").value) mov.os = $("#m-osref").value;
  const r = await enviar($("#m-enviar"), msg, "registrar", {mov});
  if (r) {
    // numa entrada, a nota e o fornecedor ficam preenchidos para lançar os outros itens da mesma compra
    S.nfAnexo = t==="entrada" && nfIds.length && mov.nf ? {chave:chaveNF(), ids:nfIds} : (t==="entrada" ? null : S.nfAnexo);
    S.nfArq = []; renderNfAnexo();
    ["m-qtd","m-obs","m-os","m-valor","m-prev"].concat(t==="entrada" && mov.nf ? [] : ["m-nf"]).forEach(id => $("#"+id).value = "");
    $("#m-velho").value = ""; msg.textContent = "";
    S.picked = null; renderPicked(); $("#m-busca").focus();
  }
});
function renderLocaisRapidos(){
  const box = $("#m-locais"); if (!box) return;
  const locais = S.locais[S.setor] || [], edita = can("itens_editar");
  box.innerHTML = (locais.length ? locais.map(l => `<button type="button" class="chip" data-local="${esc(l)}">${esc(l)}</button>`).join("") : "")
    + (edita ? `<button type="button" class="link small-link" id="m-locais-ed">${locais.length ? "editar lista" : "criar lista de locais"}</button>` : "");
  box.hidden = !locais.length && !edita;
  const ed = $("#m-locais-ed"); if (ed) ed.onclick = abrirLocais;
}
document.addEventListener("click", e => { const b = e.target.closest("#m-locais [data-local]"); if (b) { $("#m-destino").value = b.dataset.local; $$("#m-locais .chip").forEach(c => c.setAttribute("aria-pressed", c === b ? "true" : "false")); } });
function abrirLocais(){
  const lista = (S.locais[S.setor] || []).join("\n");
  $("#modal-box").innerHTML = `
    <h3>Locais de retirada · ${esc(S.setor)}</h3>
    <form class="form" id="f-loc" novalidate>
      <div class="field full"><label for="loc-txt">Um local por linha</label><textarea class="input" id="loc-txt" rows="12" placeholder="Bloco 1&#10;Portaria&#10;Salão de festas">${esc(lista)}</textarea>
        <span class="hint">Eles aparecem como botões no campo Destino, em Registrar, para a equipe só tocar. Dá para digitar outro local quando precisar.</span></div>
      <div class="full actions"><button class="btn primary" type="submit" id="loc-ok">Salvar lista</button><button class="btn" type="button" id="loc-no">Cancelar</button><span class="hint" id="loc-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#loc-txt").focus();
  $("#loc-no").onclick = fecharModal;
  $("#f-loc").addEventListener("submit", ev => {
    ev.preventDefault();
    const locais = $("#loc-txt").value.split("\n").map(x => x.trim()).filter(Boolean);
    enviar($("#loc-ok"), $("#loc-msg"), "salvarLocais", {setor: S.setor, locais}, () => { fecharModal(); renderSugestoes(); });
  });
}
function renderSugestoes(){
  const uniq = arr => [...new Set(arr.filter(Boolean).map(s=>String(s).trim()))].sort((a,b)=>a.localeCompare(b,"pt-BR")).slice(0,200);
  $("#dl-resp").innerHTML = uniq(S.movs.map(m=>m.responsavel)).map(v=>`<option value="${esc(v)}">`).join("");
  const locais = S.locais[S.setor] || [];
  $("#dl-dest").innerHTML = [...new Set(locais.concat(uniq(S.movs.filter(doSetor).map(m=>m.destino))))].map(v=>`<option value="${esc(v)}">`).join("");
  renderLocaisRapidos();
  $("#dl-forn").innerHTML = uniq(S.movs.map(m=>m.fornecedor)).map(v=>`<option value="${esc(v)}">`).join("");
}

// ---------- histórico ----------
function renderHist(){
  const q = norm($("#h-busca").value);
  const all = movsDoMes(S.histMes).sort(ordMov);
  const list = all.filter(m => {
    if (S.hTipo && m.tipo!==S.hTipo && !(S.hTipo==="ajuste" && m.tipo==="estorno")) return false;
    if (q && !norm([m.itemNome,m.itemCodigo,m.responsavel,m.destino,m.motivo,m.fornecedor,m.nf,m.obs,m.registradoPor].join(" ")).includes(q)) return false;
    return true;
  });
  const val = all.filter(m=>!m.estornado);
  const c = t => val.filter(m=>m.tipo===t).length;
  const gasto = val.filter(m=>m.tipo==="entrada" && m.valorUnit!=="" && Number.isFinite(Number(m.valorUnit))).reduce((s,m)=>s+Number(m.valorUnit)*Number(m.qtd),0);
  $("#h-sum").innerHTML = `<span>${nomeMes(S.histMes)}</span><span><b>${c("saida")}</b> saídas</span><span><b>${c("entrada")}</b> entradas</span><span><b>${c("troca")}</b> trocas</span><span><b>${c("emprestimo")}</b> empréstimos</span><span>Compras: <b>${fBRL(gasto)}</b></span>`;
  $("#h-csv").hidden = !can("exportar");
  const admin = can("historico_estornar");
  $("#h-body").innerHTML = list.length ? list.map(m => `
    <tr class="${m.estornado?"struck":""}"><td class="num" style="white-space:nowrap">${fData(m.data)}</td>
    <td>${pill(m.tipo)}</td>
    <td><b>${esc(m.itemNome)}</b><span class="sub mono">${esc(m.itemCodigo||"")}</span></td>
    <td class="n">${sinal(m)}${fNum(m.qtd)} <span class="muted">${esc(m.unidade||"")}</span></td>
    <td>${esc(m.tipo==="entrada" ? [m.fornecedor, m.nf?"NF "+m.nf:"", m.valorUnit!==""&&m.valorUnit!=null?fBRL(m.valorUnit)+"/un":""].filter(Boolean).join(" · ") : m.destino || "")}${m.nfFotos ? ` <button type="button" class="link small-link" data-nfver="${esc(m.id)}">ver nota</button>` : ""}
      <span class="sub">${esc([m.os, m.motivo, m.tipo==="troca"&&m.velhoDestino?"Peça velha: "+m.velhoDestino:"", m.tipo==="emprestimo"&&m.previsao?"Devolver até "+fData(m.previsao):"", m.estadoDevolucao||"", m.obs].filter(Boolean).join(" · "))}</span></td>
    <td class="hide-s">${esc(m.responsavel||"—")}</td>
    <td class="hide-m">${esc(m.registradoPor||"—")}</td>
    <td class="n">${admin && !m.estornado && m.tipo!=="estorno" ? `<button class="btn small" data-est="${esc(m.id)}">Estornar</button>`:""}</td></tr>`).join("")
    : `<tr><td colspan="8"><div class="empty">${all.length ? "Nada encontrado com esses filtros." : "Nenhuma movimentação registrada em "+nomeMes(S.histMes)+"."}</div></td></tr>`;
}
$("#h-mes").value = S.histMes;
$("#h-mes").addEventListener("change", () => { S.histMes = $("#h-mes").value || mesDe(); renderHist(); atualizar(); });
$("#h-busca").addEventListener("input", renderHist);
$$("#h-tipos .chip").forEach(c => c.addEventListener("click", () => { S.hTipo = c.dataset.t; syncChips("#h-tipos","t",S.hTipo); renderHist(); }));
$("#h-body").addEventListener("click", e => {
  const n = e.target.closest("[data-nfver]"); if (n) { const m = S.movs.find(x => x.id === n.dataset.nfver); if (m) abrirNF(m); return; }
  const b = e.target.closest("[data-est]"); if (b) abrirEstorno(b.dataset.est);
});

function abrirEstorno(id){
  const m = S.movs.find(x=>x.id===id); if (!m) return;
  const d = Number(m.delta)||0;
  $("#modal-box").innerHTML = `
    <h3>Estornar lançamento</h3>
    <p>${pill(m.tipo)} <b>${fNum(m.qtd)} ${esc(m.unidade||"")}</b> de <b>${esc(m.itemNome)}</b> em ${fData(m.data)}${m.responsavel?" · "+esc(m.responsavel):""}</p>
    <p class="muted">${d===0 ? "O estoque não muda; o lançamento fica no histórico riscado." : `O lançamento fica no histórico riscado e o estoque ${d>0?"diminui":"aumenta"} ${fNum(Math.abs(d))}.`}</p>
    <form class="form" id="f-est" novalidate>
      <div class="field full"><label for="es-motivo">Motivo <span class="req">*</span></label><input class="input" id="es-motivo" placeholder="Ex.: lançado em duplicidade"></div>
      <div class="full actions"><button class="btn primary" type="submit" id="es-ok">Confirmar estorno</button><button class="btn" type="button" id="es-no">Cancelar</button><span class="hint" id="es-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#es-motivo").focus();
  $("#es-no").onclick = fecharModal;
  $("#f-est").addEventListener("submit", ev => {
    ev.preventDefault();
    const motivo = $("#es-motivo").value.trim();
    if (!motivo) { $("#es-msg").textContent = "Informe o motivo."; $("#es-msg").className="hint err"; return; }
    enviar($("#es-ok"), $("#es-msg"), "estornar", {movId:m.id, motivo}, fecharModal);
  });
}

$("#h-csv").addEventListener("click", () => {
  const list = movsDoMes(S.histMes).sort(ordMov);
  const cols = ["Data","Tipo","Código","Item","Quantidade","Unidade","Efeito no estoque","Responsável","Destino","OS / motivo","Peça retirada","Fornecedor","NF","Valor unitário","Previsão devolução","Estado na devolução","Observação","Registrado por","Estornado","Nota fiscal (link)"];
  const cell = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const n = v => v===""||v==null ? "" : String(v).replace(".",",");
  const lines = [cols.join(";")].concat(list.map(m => [fData(m.data), TIPOS[m.tipo]?.nome||m.tipo, m.itemCodigo, m.itemNome, n(m.qtd), m.unidade, n(m.delta), m.responsavel, m.destino, m.motivo, m.velhoDestino, m.fornecedor, m.nf, n(m.valorUnit), m.previsao?fData(m.previsao):"", m.estadoDevolucao, m.obs, m.registradoPor, m.estornado?"sim":"", String(m.nfFotos||"").split(/\s+/).filter(Boolean).join(" ")].map(cell).join(";")));
  const blob = new Blob(["﻿"+lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
  registrarTela("exportar_movs", S.histMes);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `movimentacoes-${S.histMes}.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});

// ---------- empréstimos ----------
function renderEmp(){
  const list = [...S.emprestimos].sort((a,b)=>String(a.previsao||"9999").localeCompare(String(b.previsao||"9999")));
  $("#e-body").innerHTML = list.length ? list.map(e => {
    const atras = e.previsao && e.previsao < hoje();
    return `<tr><td><b>${esc(e.itemNome)}</b><span class="sub mono">${esc(e.itemCodigo||"")}</span></td>
      <td class="n">${fNum(e.qtd)} <span class="muted">${esc(e.unidade||"")}</span></td>
      <td>${esc(e.responsavel)}</td><td class="hide-s">${esc(e.destino||"—")}</td>
      <td class="num">${fData(e.data)}</td>
      <td>${e.previsao ? (atras ? `<span class="pill s-zero">Atrasado · ${fData(e.previsao)}</span>` : `<span class="num">${fData(e.previsao)}</span>`) : `<span class="muted">sem data</span>`}</td>
      <td class="n">${can("devolver")?`<button class="btn small" data-dev="${esc(e.id)}">Registrar devolução</button>`:""}</td></tr>`;
  }).join("") : `<tr><td colspan="7"><div class="empty">Nenhuma ferramenta emprestada no momento. Empréstimos registrados na aba Registrar aparecem aqui até serem devolvidos.</div></td></tr>`;
}
$("#e-body").addEventListener("click", e => { const b = e.target.closest("[data-dev]"); if (b) abrirDevolucao(b.dataset.dev); });
function abrirDevolucao(id){
  const e = S.emprestimos.find(x=>x.id===id); if (!e) return;
  $("#modal-box").innerHTML = `
    <h3>Registrar devolução</h3>
    <p><b>${fNum(e.qtd)} ${esc(e.unidade||"")}</b> de <b>${esc(e.itemNome)}</b> · com ${esc(e.responsavel)} desde ${fData(e.data)}</p>
    <form class="form" id="f-dev" novalidate>
      <div class="field"><label for="dv-estado">Como voltou</label><select class="input" id="dv-estado"><option>Em bom estado</option><option>Danificada</option><option>Não voltou (perdida)</option></select></div>
      <div class="field"><label for="dv-data">Data da devolução</label><input class="input" id="dv-data" type="date" value="${hoje()}"></div>
      <div class="field full"><label for="dv-obs">Observação</label><input class="input" id="dv-obs" placeholder="Opcional"></div>
      <p class="hint full" id="dv-hint">A quantidade volta para o estoque.</p>
      <div class="full actions"><button class="btn primary" type="submit" id="dv-ok">Confirmar devolução</button><button class="btn" type="button" id="dv-no">Cancelar</button><span class="hint" id="dv-msg"></span></div>
    </form>`;
  $("#modal").hidden = false;
  $("#dv-no").onclick = fecharModal;
  $("#dv-estado").addEventListener("change", () => { const v = $("#dv-estado").value; $("#dv-hint").textContent = v.startsWith("Não voltou") ? "A ferramenta sai do estoque de vez e o caso fica registrado no histórico." : v==="Danificada" ? "A quantidade volta para o estoque. Avalie se precisa de conserto." : "A quantidade volta para o estoque."; });
  $("#f-dev").addEventListener("submit", ev => {
    ev.preventDefault();
    enviar($("#dv-ok"), $("#dv-msg"), "devolver", {emprestimoId:e.id, estado:$("#dv-estado").value, data:$("#dv-data").value||hoje(), obs:$("#dv-obs").value.trim()}, fecharModal);
  });
}

function renderAll(){
  renderPainel();
  if (S.tab==="itens") renderItens();
  if (S.tab==="historico") renderHist();
  if (S.tab==="emprestimos") renderEmp();
  if (S.tab==="dashboard") renderDash();
  if (S.tab==="os") renderOS();
  if (S.tab==="demandas") renderDem();
  if (S.tab==="pendencias") renderPend();
  if (S.tab==="categorias") renderCategorias();
  if (S.tab==="equipe") renderEquipeDir();
  if (S.tab==="minhaequipe") renderMinhaEquipe();
  if (S.tab==="prestadores") renderPrest();
  // pendências da ronda: carrega uma vez ao entrar na Administração (contador do menu)
  if (S.adm && TEM_ADM && S.token && podeAba("rondas") && !RD.lista && !RD.carregando && !RD.erro) carregarRondas(true);
  renderPrestBadge();
  renderAvisoDem();
  renderOsRef();
  renderPicked();
}

// ---------- permissões na tela ----------
function aplicarPermissoes(){
  renderMemBtn();
  $$("nav.tabs [role=tablist] > button[data-tab]").forEach(b => b.hidden = !podeAba(b.dataset.tab) || (TEM_ADM && ABAS_ADM.includes(b.dataset.tab)));
  if (TEM_ADM) {
    $$("#adm-menu [data-adm-tab]").forEach(b => b.hidden = !podeAba(b.dataset.admTab));
    const g = $('#adm-menu [data-grupo="equipe"]'); if (g) g.hidden = !podeAba("usuarios") && !podeAba("acessos");
    $("#tab-adm").hidden = !ABAS_ADM.some(podeAba);
    if ($("#tab-adm").hidden) abrirMenuAdm(false);
  }
  const tipos = {saida:"registrar_saida", entrada:"registrar_entrada", troca:"registrar_troca", emprestimo:"registrar_emprestimo"};
  const tipoOk = k => can(tipos[k]) && (S.setor !== "Limpeza" || TIPOS_LIMPEZA.includes(k));
  $$("#seg button").forEach(b => b.hidden = !tipoOk(b.dataset.tipo));
  if (!tipoOk(S.tipo)) { const t = Object.keys(tipos).find(tipoOk); if (t) setTipo(t); }
  $("#i-novo").hidden = !can("itens_cadastrar");
  $("#i-importar").hidden = !can("itens_editar");
  $("#o-nova").hidden = !can("os_abrir");
  $("#dm-nova").hidden = !can("dem_delegar");
  $("#pv-box").hidden = !can("dem_delegar");
  renderMenu();
  $("#k-dem-box").hidden = $("#p-dem-box").hidden = !podeAba("demandas");
  $("#k-os-box").hidden = $("#p-os-box").hidden = !podeAba("os");
  $("#m-osref-box").hidden = !podeAba("os") || !["saida","troca"].includes(S.tipo);
  $("#m-novo").closest(".hint").hidden = !can("itens_cadastrar");
  $$(".kpi[data-go]").forEach(k => { k.disabled = !podeAba(k.dataset.go); if (!k.id || !/^k-(dem|os)-box$/.test(k.id)) k.hidden = !podeAba(k.dataset.go); });
}

// ---------- dica flutuante dos gráficos ----------
const tipEl = document.createElement("div"); tipEl.className = "viz-tip"; tipEl.hidden = true; tipEl.setAttribute("role","status"); document.body.appendChild(tipEl);
function mostrarTip(alvo, x, y){
  let d; try { d = JSON.parse(alvo.dataset.tip); } catch(e){ return; }
  tipEl.textContent = "";
  const t = document.createElement("div"); t.className = "viz-tip-t"; t.textContent = d.t; tipEl.appendChild(t);
  (d.r||[]).forEach(([rot, val, cor]) => {
    const l = document.createElement("div"); l.className = "viz-tip-r";
    if (cor) { const k = document.createElement("span"); k.className = "viz-key"; k.style.background = `var(${cor})`; l.appendChild(k); }
    const v = document.createElement("b"); v.textContent = val; l.appendChild(v);
    const s = document.createElement("span"); s.textContent = rot; l.appendChild(s);
    tipEl.appendChild(l);
  });
  tipEl.hidden = false;
  const r = tipEl.getBoundingClientRect(), W = document.documentElement.clientWidth;
  tipEl.style.left = Math.max(8, Math.min(W - r.width - 8, x + 14)) + "px";
  tipEl.style.top = Math.max(8, y - r.height - 12) + "px";
}
document.addEventListener("pointermove", e => { const a = e.target.closest("[data-tip]"); if (a) mostrarTip(a, e.clientX, e.clientY); else tipEl.hidden = true; });
document.addEventListener("focusin", e => { const a = e.target.closest("[data-tip]"); if (a) { const b = a.getBoundingClientRect(); mostrarTip(a, b.left + b.width/2, b.top); } });
document.addEventListener("focusout", () => { tipEl.hidden = true; });
document.addEventListener("scroll", () => { tipEl.hidden = true; }, {passive:true});
const tipAttr = (t, r) => esc(JSON.stringify({t, r}));

// barras horizontais (uma série): rótulo, barra e valor na ponta
function barras(sel, linhas, vazio){
  const el = $(sel);
  if (!linhas.length) { el.innerHTML = `<div class="empty">${esc(vazio)}</div>`; return; }
  const max = Math.max(...linhas.map(l => l.v)) || 1;
  el.innerHTML = linhas.map(l => `<div class="hb" tabindex="0" data-tip="${tipAttr(l.rotulo, l.tip || [[l.unid||"", l.txt]])}">
    <span class="hb-l" title="${esc(l.rotulo)}">${esc(l.rotulo)}</span>
    <span class="hb-t"><span class="hb-f" style="width:${Math.max(1.5, l.v/max*100)}%"></span></span>
    <span class="hb-v num">${esc(l.txt)}</span></div>`).join("");
}
function topN(mapa, n){ return Object.entries(mapa).sort((a,b) => b[1].v - a[1].v || a[0].localeCompare(b[0],"pt-BR")).slice(0, n); }
function niceMax(v){ if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1,2,2.5,5,10]) if (m*p >= v) return m*p; return 10*p; }

// ---------- dashboard ----------
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
function periodo(preset){
  const h = new Date(), y = h.getFullYear(), m = h.getMonth();
  switch (preset) {
    case "mesPassado": return [iso(new Date(y, m-1, 1)), iso(new Date(y, m, 0))];
    case "3m": return [iso(new Date(y, m-2, 1)), iso(h)];
    case "6m": return [iso(new Date(y, m-5, 1)), iso(h)];
    case "ano": return [iso(new Date(y, 0, 1)), iso(h)];
    case "pers": return [$("#d-de").value || iso(new Date(y, m, 1)), $("#d-ate").value || iso(h)];
    default: return [iso(new Date(y, m, 1)), iso(h)];
  }
}
let dashTok = 0;
async function carregarDashboard(){
  if (!can("dashboard") || !S.token) return;
  const [de, ate] = periodo(S.dashPreset);
  if (S.dashPreset !== "pers") { $("#d-de").value = de; $("#d-ate").value = ate; }
  const tok = ++dashTok;
  $("#t-dashboard").classList.add("carregando");
  try {
    const r = await api("relatorio", {de, ate});
    if (tok === dashTok) { S.rel = r.relatorio; renderDash(); }
  } catch(e){ toast(e.message, true); }
  finally { if (tok === dashTok) $("#t-dashboard").classList.remove("carregando"); }
}
$$("#d-presets .chip").forEach(c => c.addEventListener("click", () => {
  S.dashPreset = c.dataset.p; syncChips("#d-presets","p",S.dashPreset);
  $("#d-pers").hidden = S.dashPreset !== "pers";
  carregarDashboard();
}));
["#d-de","#d-ate"].forEach(s => $(s).addEventListener("change", () => { if (S.dashPreset === "pers") carregarDashboard(); }));

function renderDash(){
  const R0 = S.rel;
  const R = R0 && Object.assign({}, R0, {itens: R0.itens.filter(doSetor), movs: R0.movs.filter(doSetor), emprestimos: R0.emprestimos.filter(doSetor)});
  if (!R) { $("#d-resumo").textContent = "Carregando os dados do período…"; return; }
  const diasPer = Math.round((new Date(R.ate) - new Date(R.de)) / 864e5) + 1;
  $("#d-resumo").textContent = `De ${fData(R.de)} a ${fData(R.ate)} · ${diasPer} dia${diasPer===1?"":"s"}`;
  const movs = R.movs.filter(m => !m.estornado && m.tipo !== "estorno");
  const itens = R.itens, porId = new Map(itens.map(i => [i.id, i]));
  const ret = movs.filter(m => m.tipo==="saida" || m.tipo==="troca");
  const ent = movs.filter(m => m.tipo==="entrada");
  const emp = movs.filter(m => m.tipo==="emprestimo");
  const gasto = ent.reduce((s,m) => s + (m.valorUnit!=="" && m.valorUnit!=null ? Number(m.valorUnit)*Number(m.qtd) : 0), 0);
  const uRet = ret.reduce((s,m) => s + Number(m.qtd||0), 0);
  const atras = R.emprestimos.filter(e => e.previsao && e.previsao < hoje());
  const baixos = itens.filter(precisaRepor);
  let valorEst = 0, comPreco = 0;
  itens.forEach(i => { const p = R.preco[i.id]; if (p) { comPreco++; valorEst += p * (Number(i.qtd)||0); } });
  const mexidos = new Set(movs.map(m => m.itemId));
  const parados = itens.filter(i => Number(i.qtd) > 0 && !mexidos.has(i.id));

  const kpi = (lbl, val, sub, cls) => `<div class="kpi static ${cls||""}"><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
  $("#d-kpis").innerHTML = [
    kpi("Retiradas", ret.length, `${fNum(uRet)} unidade${uRet===1?"":"s"} · saídas e trocas`),
    kpi("Compras", fBRL(gasto), `${ent.length} entrada${ent.length===1?"":"s"} registrada${ent.length===1?"":"s"}`),
    kpi("Empréstimos", emp.length, `${R.emprestimos.length} em aberto agora${atras.length?` · ${atras.length} atrasado${atras.length===1?"":"s"}`:""}`, atras.length?"warn":""),
    kpi("Para repor", baixos.length, `${baixos.filter(i=>statusItem(i)==="zero").length} zerados hoje`, baixos.length?"crit":""),
    kpi("Valor estimado do estoque", fBRL(valorEst), `${comPreco} de ${itens.length} itens com preço de compra`),
    kpi("Itens parados", parados.length, "com estoque e sem movimento no período")
  ].join("");

  graficoMeses(ret, ent, R.de, R.ate);
  renderDashOS(R);
  renderDashDem(R);
  // OS e demandas são da manutenção do prédio; no setor Limpeza o dashboard mostra só o estoque
  if (S.setor !== "Manutenção") { $("#d-os-bloco").hidden = true; $("#d-dem-bloco").hidden = true; }

  const somar = (lista, chave, valor) => { const o = {}; lista.forEach(m => { const k = String(chave(m)||"").trim() || "Não informado"; o[k] = o[k] || {v:0, n:0, u:0}; o[k].v += valor(m); o[k].n++; o[k].u += Number(m.qtd||0); }); return o; };
  const un = i => (porId.get(i)||{}).unidade || "";
  // itens mais retirados (unidades)
  const porItem = {}; ret.forEach(m => { const k = m.itemNome; porItem[k] = porItem[k] || {v:0, n:0, unid: m.unidade}; porItem[k].v += Number(m.qtd||0); porItem[k].n++; });
  barras("#d-itens", topN(porItem, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:`${fNum(o.v)} ${o.unid||""}`.trim(), tip:[["unidades retiradas", fNum(o.v)+" "+(o.unid||"")], ["retiradas", String(o.n)]]})), "Nenhuma retirada no período.");
  const dest = somar(ret, m => m.destino, () => 1);
  barras("#d-destinos", topN(dest, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["retiradas", String(o.v)]]})), "Nenhuma retirada no período.");
  const resp = somar(ret.concat(emp), m => m.responsavel, () => 1);
  barras("#d-colab", topN(resp, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["retiradas e empréstimos", String(o.v)]]})), "Ninguém retirou itens no período.");
  const cat = somar(ret, m => (porId.get(m.itemId)||{}).categoria, m => Number(m.qtd||0));
  barras("#d-cat", topN(cat, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:`${fNum(o.v)} un.`, tip:[["unidades retiradas", fNum(o.v)], ["retiradas", String(o.n)]]})), "Nenhuma retirada no período.");
  const forn = somar(ent, m => m.fornecedor, m => (m.valorUnit!==""&&m.valorUnit!=null) ? Number(m.valorUnit)*Number(m.qtd) : 0);
  barras("#d-forn", topN(forn, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:fBRL(o.v), tip:[["em compras", fBRL(o.v)], ["entradas", String(o.n)]]})), "Nenhuma compra registrada no período.");
  const troc = somar(movs.filter(m => m.tipo==="troca"), m => m.velhoDestino, () => 1);
  barras("#d-trocas", topN(troc, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["peças", String(o.v)]]})), "Nenhuma troca no período.");
  const quem = somar(R.movs, m => m.registradoPor, () => 1);
  barras("#d-usuarios", topN(quem, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["lançamentos", String(o.v)]]})), "Nenhum lançamento no período.");

  // empréstimos em aberto
  const dias = d => Math.max(0, Math.round((new Date(hoje()) - new Date(d)) / 864e5));
  const abertos = [...R.emprestimos].sort((a,b) => String(a.data).localeCompare(String(b.data)));
  $("#d-emp").innerHTML = abertos.length ? abertos.map(e => `<tr><td><b>${esc(e.itemNome)}</b><span class="sub mono">${esc(e.itemCodigo||"")}</span></td><td>${esc(e.responsavel)}</td><td class="n">${dias(e.data)} dia${dias(e.data)===1?"":"s"}</td><td>${e.previsao ? (e.previsao < hoje() ? `<span class="pill s-zero">Atrasado · ${fData(e.previsao)}</span>` : fData(e.previsao)) : '<span class="muted">sem data</span>'}</td></tr>`).join("")
    : `<tr><td colspan="4"><div class="empty">Nenhuma ferramenta fora do almoxarifado agora.</div></td></tr>`;
  // estoque crítico
  $("#d-crit").innerHTML = baixos.length ? baixos.sort((a,b) => (Number(a.qtd)-Number(a.minimo)) - (Number(b.qtd)-Number(b.minimo))).map(i => `<tr><td><b>${esc(i.nome)}</b><span class="sub mono">${esc(i.codigo||"")}</span></td><td class="n">${fNum(i.qtd)} / ${fNum(i.minimo)} ${esc(i.unidade||"")}</td><td>${stPill(statusItem(i))}</td></tr>`).join("")
    : `<tr><td colspan="3"><div class="empty">Nenhum item no mínimo ou abaixo dele. Defina o estoque mínimo dos itens para receber esse alerta.</div></td></tr>`;
  // parados
  const par = parados.sort((a,b) => String(R.ultimo[a.id]||"").localeCompare(String(R.ultimo[b.id]||"")) || Number(b.qtd)-Number(a.qtd)).slice(0, 15);
  $("#d-parados").innerHTML = par.length ? par.map(i => `<tr><td><b>${esc(i.nome)}</b><span class="sub mono">${esc(i.codigo||"")}</span></td><td class="n">${fNum(i.qtd)} ${esc(i.unidade||"")}</td><td>${R.ultimo[i.id] ? fData(R.ultimo[i.id]) : '<span class="muted">nunca</span>'}</td></tr>`).join("")
    + (parados.length > 15 ? `<tr><td colspan="3"><div class="empty">Mais ${parados.length-15} itens parados no período.</div></td></tr>` : "")
    : `<tr><td colspan="3"><div class="empty">Todos os itens com estoque tiveram movimento no período.</div></td></tr>`;

  // consumo detalhado por item
  const det = {};
  movs.forEach(m => {
    const d = det[m.itemId] = det[m.itemId] || {id:m.itemId, nome:m.itemNome, codigo:m.itemCodigo, unidade:m.unidade, saida:0, troca:0, entrada:0, emp:0, gasto:0};
    if (m.tipo==="saida") d.saida += Number(m.qtd||0);
    if (m.tipo==="troca") d.troca += Number(m.qtd||0);
    if (m.tipo==="emprestimo") d.emp += Number(m.qtd||0);
    if (m.tipo==="entrada") { d.entrada += Number(m.qtd||0); if (m.valorUnit!==""&&m.valorUnit!=null) d.gasto += Number(m.valorUnit)*Number(m.qtd); }
  });
  S.detalhe = Object.values(det).map(d => Object.assign(d, {cat:(porId.get(d.id)||{}).categoria||"", estoque:(porId.get(d.id)||{}).qtd, ultimo:R.ultimo[d.id]||""}))
    .sort((a,b) => (b.saida+b.troca) - (a.saida+a.troca) || b.entrada - a.entrada);
  $("#d-csv").hidden = !can("exportar");
  const lim = S.detTodos ? S.detalhe.length : 25;
  $("#d-mais").hidden = S.detalhe.length <= 25;
  $("#d-mais").textContent = S.detTodos ? "Mostrar só os 25 primeiros" : `Mostrar todos os ${S.detalhe.length} itens`;
  $("#d-det").innerHTML = S.detalhe.length ? S.detalhe.slice(0, lim).map(d => `<tr><td class="mono">${esc(d.codigo||"")}</td><td><b>${esc(d.nome)}</b><span class="sub">${esc(d.cat)}</span></td>
    <td class="n">${d.saida?fNum(d.saida):"—"}</td><td class="n">${d.troca?fNum(d.troca):"—"}</td><td class="n">${d.emp?fNum(d.emp):"—"}</td><td class="n">${d.entrada?fNum(d.entrada):"—"}</td>
    <td class="n">${d.gasto?fBRL(d.gasto):"—"}</td><td class="n">${d.estoque===undefined?'<span class="muted">excluído</span>':fNum(d.estoque)+" "+esc(d.unidade||"")}</td></tr>`).join("")
    : `<tr><td colspan="8"><div class="empty">Nenhuma movimentação no período escolhido.</div></td></tr>`;
}

// colunas agrupadas: retiradas x entradas por dia (períodos curtos) ou por mês
function graficoMeses(ret, ent, de, ate){
  const box = $("#d-meses"), dias = Math.round((new Date(ate) - new Date(de)) / 864e5) + 1;
  const porDia = dias <= 35, buckets = [];
  if (porDia) { for (let d = new Date(de+"T12:00:00"); iso(d) <= ate; d.setDate(d.getDate()+1)) buckets.push({k:iso(d), r:`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`}); }
  else { let d = new Date(de.slice(0,7)+"-01T12:00:00"); while (iso(d).slice(0,7) <= ate.slice(0,7)) { buckets.push({k:iso(d).slice(0,7), r:MESES[d.getMonth()].slice(0,3)+"/"+String(d.getFullYear()).slice(2)}); d.setMonth(d.getMonth()+1); } }
  const chave = m => porDia ? String(m.data).slice(0,10) : String(m.data).slice(0,7);
  buckets.forEach(b => { b.a = ret.filter(m => chave(m)===b.k).length; b.b = ent.filter(m => chave(m)===b.k).length; });
  $("#d-meses-tit").textContent = porDia ? "Retiradas e entradas por dia" : "Retiradas e entradas por mês";
  if (!buckets.some(b => b.a || b.b)) { box.innerHTML = `<div class="empty">Nenhuma retirada ou entrada no período.</div>`; return; }
  const W = Math.max(300, box.clientWidth || 640), H = 230, padL = 34, padR = 8, padT = 12, padB = 26;
  const max = niceMax(Math.max(...buckets.map(b => Math.max(b.a, b.b))));
  const iw = W - padL - padR, ih = H - padT - padB, bw = iw / buckets.length;
  const barW = Math.max(2, Math.min(24, (bw - 6) / 2));
  const y = v => padT + ih - (v/max)*ih;
  const ticks = [0, max/4, max/2, max*3/4, max].filter(t => Number.isInteger(t));
  const passo = Math.ceil(buckets.length / Math.floor(iw / 44));
  const col = (x, v, cor) => { if (!v) return ""; const h = (v/max)*ih, r = Math.min(4, h, barW/2); const yt = padT+ih-h;
    return `<path d="M${x},${padT+ih} V${yt+r} Q${x},${yt} ${x+r},${yt} H${x+barW-r} Q${x+barW},${yt} ${x+barW},${yt+r} V${padT+ih} Z" fill="var(${cor})"/>`; };
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc($("#d-meses-tit").textContent)}">`;
  ticks.forEach(t => { svg += `<line x1="${padL}" x2="${W-padR}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${padL-6}" y="${y(t)+4}" text-anchor="end" class="ax">${t}</text>`; });
  buckets.forEach((b, i) => {
    const cx = padL + i*bw + bw/2;
    svg += col(cx - barW - 1, b.a, "--s1") + col(cx + 1, b.b, "--s2");
    if (i % passo === 0) svg += `<text x="${cx}" y="${H-8}" text-anchor="middle" class="ax">${esc(b.r)}</text>`;
    svg += `<rect x="${padL+i*bw}" y="${padT}" width="${bw}" height="${ih}" fill="transparent" tabindex="0" data-tip="${tipAttr(porDia ? fData(b.k) : b.r, [["retiradas", String(b.a), "--s1"], ["entradas", String(b.b), "--s2"]])}"/>`;
  });
  svg += `<line x1="${padL}" x2="${W-padR}" y1="${padT+ih}" y2="${padT+ih}" class="base"/></svg>`;
  box.innerHTML = svg;
}
let resizeT; window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (S.tab==="dashboard" && S.rel) renderDash(); }, 200); });

$("#d-mais").addEventListener("click", () => { S.detTodos = !S.detTodos; renderDash(); });
$("#d-csv").addEventListener("click", () => {
  const R = S.rel; if (!R || !S.detalhe) return;
  const cell = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const n = v => v ? String(v).replace(".",",") : "0";
  const linhas = [["Código","Item","Categoria","Saídas","Trocas","Empréstimos","Entradas","Compras (R$)","Estoque atual","Unidade","Último movimento"].join(";")]
    .concat(S.detalhe.map(d => [d.codigo, d.nome, d.cat, n(d.saida), n(d.troca), n(d.emp), n(d.entrada), n(Math.round(d.gasto*100)/100), d.estoque===undefined?"":n(d.estoque), d.unidade, d.ultimo?fData(d.ultimo):""].map(cell).join(";")));
  const blob = new Blob(["﻿"+linhas.join("\r\n")], {type:"text/csv;charset=utf-8"});
  registrarTela("exportar_consumo", R.de + " a " + R.ate);
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `consumo-por-item-${R.de}-a-${R.ate}.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});

// ---------- usuários e permissões ----------
async function carregarEquipe(){
  if (!can("usuarios")) return;
  try { const r = await api("usuarios"); S.eq = r.equipe; renderEquipe(); }
  catch(e){ toast(e.message, true); }
}
function renderEquipe(){
  const E = S.eq;
  if (!E) { $("#q-usuarios").innerHTML = `<tr><td colspan="7"><div class="empty">Carregando…</div></td></tr>`; return; }
  const us = [...E.usuarios].sort((a,b) => (b.ativo - a.ativo) || String(a.nome).localeCompare(String(b.nome),"pt-BR"));
  $("#q-usuarios").innerHTML = us.map(u => `<tr class="${u.ativo?"":"inativo"}">
    <td><b>${esc(u.nome||"—")}</b>${u.usuario===S.usuario?' <span class="muted">(você)</span>':""}${u.provisoria ? ' <span class="pill p-ajuste" title="Ainda não criou a própria senha">senha provisória</span>' : ""}</td>
    <td class="mono">${esc(u.usuario)}</td>
    <td>${esc(u.perfil)}</td>
    <td>${u.ativo ? '<span class="pill s-ok">Ativo</span>' : '<span class="pill p-ajuste">Bloqueado</span>'}</td>
    <td class="hide-m num" style="white-space:nowrap">${u.telefone ? esc(fTel(u.telefone)) : '<span class="muted">—</span>'}</td>
    <td class="hide-s">${u.bloqueado ? '<span class="pill s-zero">Bloqueado por tentativas</span>' : u.sessoes ? `<span class="pill s-ok">${u.sessoes} ${u.sessoes===1?"aparelho conectado":"aparelhos conectados"}</span>` : '<span class="muted">Sem acesso aberto</span>'}</td>
    <td class="n"><button class="btn small" data-u="${esc(u.usuario)}">Editar</button></td></tr>`).join("");
  // matriz de permissões
  const grupos = [...new Set(E.permissoes.map(p => p.grupo))];
  $("#q-matriz").innerHTML = `<thead><tr><th>Permissão</th>${E.perfis.map(p => `<th class="c">${esc(p.nome)}<div>${p.fixo ? '<span class="muted">acesso total</span>' : `<button class="link small-link" data-perfil="${esc(p.nome)}" type="button">editar</button>`}</div></th>`).join("")}</tr></thead><tbody>`
    + grupos.map(g => `<tr class="grp"><td colspan="${E.perfis.length+1}">${esc(g)}</td></tr>` + E.permissoes.filter(p => p.grupo===g).map(p => `<tr><td>${esc(p.descricao)}</td>${E.perfis.map(f => `<td class="c">${f.perms[p.chave] ? '<span class="sim" aria-label="sim">✓</span>' : '<span class="nao" aria-label="não">—</span>'}</td>`).join("")}</tr>`).join("")).join("") + `</tbody>`;
}
$("#q-usuarios").addEventListener("click", e => {
  const b = e.target.closest("[data-u]"); if (b) abrirUsuario(b.dataset.u);
});
$("#q-novo-u").addEventListener("click", () => abrirUsuario(null));
$("#q-matriz").addEventListener("click", e => { const b = e.target.closest("[data-perfil]"); if (b) abrirPerfil(b.dataset.perfil); });
$("#q-novo-p").addEventListener("click", () => abrirPerfil(null));

// senha de 8 números, sorteada com o gerador seguro do navegador
const gerarSenha = () => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(10000000 + a[0] % 90000000); } catch(e){ return String(Math.floor(10000000 + Math.random()*90000000)); } };
function abrirUsuario(usuario){
  const E = S.eq; if (!E) return;
  const u = usuario ? E.usuarios.find(x => x.usuario===usuario) : null;
  const v = u ? Object.assign({senha:""}, u) : {usuario:"", nome:"", senha:gerarSenha(), perfil:(E.perfis.find(p => !p.fixo)||E.perfis[0]).nome, ativo:true, telefone:"", email:""};
  const eu = u && u.usuario === S.usuario;
  $("#modal-box").innerHTML = `
    <h3>${u ? "Editar colaborador" : "Novo colaborador"}</h3>
    <form class="form" id="f-u" novalidate autocomplete="off">
      <div class="field full"><label for="u-nome">Nome do colaborador <span class="req">*</span></label><input class="input" id="u-nome" value="${esc(v.nome)}" placeholder="Ex.: João da Silva"></div>
      <div class="field"><label for="u-usuario">Usuário (para entrar) <span class="req">*</span></label><input class="input mono" id="u-usuario" value="${esc(v.usuario)}" autocapitalize="none" spellcheck="false" placeholder="Ex.: joao"></div>
      <div class="field"><label for="u-senha">${u ? "Nova senha" : 'Senha <span class="req">*</span>'}</label><div class="actions" style="flex-wrap:nowrap"><input class="input mono" id="u-senha" value="${esc(v.senha)}" autocomplete="new-password" placeholder="${u ? "Em branco: mantém a atual" : ""}"><button class="btn small" type="button" id="u-gerar">Gerar</button></div><span class="hint">${u ? "Só preencha para trocar. A senha atual não aparece: fica guardada como código." : "Mínimo de 6 caracteres. Anote antes de salvar: depois ela não aparece mais."}</span></div>
      <div class="field"><label for="u-perfil">Perfil</label><select class="input" id="u-perfil">${E.perfis.map(p => `<option ${p.nome===v.perfil?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div>
      <div class="field"><label for="u-email">E-mail</label><input class="input" id="u-email" type="email" autocapitalize="none" spellcheck="false" value="${esc(v.email || "")}" placeholder="Para redefinir a senha"></div>
      <div class="field"><label for="u-tel">WhatsApp (com DDD)</label><input class="input num" id="u-tel" inputmode="tel" value="${esc(v.telefone ? fTel(v.telefone) : "")}" placeholder="(21) 99999-9999"></div>
      <div class="field"><label for="u-ativo">Situação</label><select class="input" id="u-ativo" ${eu?"disabled":""}><option value="1" ${v.ativo?"selected":""}>Ativo: pode entrar</option><option value="0" ${v.ativo?"":"selected"}>Bloqueado: não entra mais</option></select></div>
      ${u ? `<div class="field full u-acesso"><span class="lbl-campo">Acesso</span><div class="actions">
        <span class="hint">${u.bloqueado ? "Login bloqueado por senhas erradas." : u.sessoes ? `Conectado em ${u.sessoes} ${u.sessoes===1?"aparelho":"aparelhos"}.` : "Nenhum acesso aberto."}</span>
        ${u.bloqueado ? `<button class="btn small" type="button" id="u-liberar">Liberar o login</button>` : ""}
        ${u.sessoes && !eu ? `<button class="btn small" type="button" id="u-encerrar">Encerrar acessos abertos</button>` : ""}
      </div><span class="hint">Trocar a senha ou bloquear o login também encerra os acessos abertos.</span></div>` : ""}
      <p class="hint full">A senha definida aqui é <b>provisória</b>: ao entrar com ela, a pessoa é convidada a criar a própria senha${u && u.provisoria ? " (esta pessoa ainda não criou a dela)" : ""}. Passe o usuário e a senha para o colaborador. O nome aparece no histórico em cada lançamento que ele fizer. O WhatsApp serve para avisar quando uma demanda for delegada a ele. O e-mail permite que a própria pessoa redefina a senha em "Esqueci minha senha".</p>
      <div class="full actions"><button class="btn primary" type="submit" id="u-ok">${u ? "Salvar" : "Criar login"}</button><button class="btn" type="button" id="u-no">Cancelar</button><span class="hint" id="u-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#u-nome").focus();
  $("#u-no").onclick = fecharModal;
  $("#u-gerar").onclick = () => { $("#u-senha").value = gerarSenha(); };
  const acesso = (op, btn) => enviar(btn, $("#u-msg"), "acessoUsuario", {usuario: u.usuario, op}, r => { S.eq = r.equipe; renderEquipe(); toast(r.msg); abrirUsuario(u.usuario); });
  if ($("#u-liberar")) $("#u-liberar").onclick = () => acesso("liberar", $("#u-liberar"));
  if ($("#u-encerrar")) $("#u-encerrar").onclick = () => acesso("encerrar", $("#u-encerrar"));
  $("#u-nome").addEventListener("input", () => {
    if (u || $("#u-usuario").dataset.mexeu) return;
    $("#u-usuario").value = norm($("#u-nome").value.trim().split(/\s+/)[0] || "").replace(/[^a-z0-9]/g, "");
  });
  $("#u-usuario").addEventListener("input", () => { $("#u-usuario").dataset.mexeu = "1"; });
  $("#f-u").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#u-msg"); msg.className = "hint err";
    const nu = {nome:$("#u-nome").value.trim(), usuario:$("#u-usuario").value.trim().toLowerCase(), senha:$("#u-senha").value.trim(), perfil:$("#u-perfil").value, ativo:$("#u-ativo").value==="1", telefone:$("#u-tel").value.replace(/\D/g,""), email:$("#u-email").value.trim().toLowerCase()};
    if (!nu.nome) { msg.textContent = "Informe o nome do colaborador."; return; }
    if (!/^[a-z0-9._@-]{2,40}$/.test(nu.usuario)) { msg.textContent = "Usuário: só letras minúsculas, números, ponto ou traço, sem espaços."; return; }
    if (!u && !nu.senha) { msg.textContent = "Defina a senha do novo login."; return; }
    if (nu.senha && nu.senha.length < 6) { msg.textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
    if (nu.telefone && nu.telefone.length < 10) { msg.textContent = "WhatsApp incompleto: informe o DDD e o número."; return; }
    if (nu.email && !/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(nu.email)) { msg.textContent = "E-mail inválido."; return; }
    await enviar($("#u-ok"), msg, "salvarUsuario", {original: u ? u.usuario : "", u: nu}, r => {
      S.eq = r.equipe; fecharModal(); renderEquipe();
      if (eu) { S.usuario = nu.usuario; guardar(); api("entrar").then(renderMe).catch(()=>{}); }
    });
  });
}
function abrirPerfil(nome){
  const E = S.eq; if (!E) return;
  const p = nome ? E.perfis.find(x => x.nome===nome) : null;
  const perms = p ? p.perms : {painel:true, itens_ver:true};
  const grupos = [...new Set(E.permissoes.map(x => x.grupo))];
  const emUso = p ? E.usuarios.filter(u => u.perfil===p.nome).length : 0;
  $("#modal-box").innerHTML = `
    <h3>${p ? "Editar perfil" : "Novo perfil"}</h3>
    <form id="f-p" novalidate autocomplete="off" class="stack" style="gap:14px">
      <div class="field"><label for="p-nome">Nome do perfil <span class="req">*</span></label><input class="input" id="p-nome" value="${esc(p ? p.nome : "")}" placeholder="Ex.: Portaria, Jardinagem, Supervisão"></div>
      <div class="perm-grupos">${grupos.map(g => `<fieldset class="perm-g"><legend>${esc(g)}</legend>${E.permissoes.filter(x => x.grupo===g).map(x => `<label class="perm"><input type="checkbox" data-k="${esc(x.chave)}" ${perms[x.chave]?"checked":""}> ${esc(x.descricao)}</label>`).join("")}</fieldset>`).join("")}</div>
      ${p ? `<p class="hint">${emUso} colaborador${emUso===1?"":"es"} com este perfil. A mudança vale a partir do próximo acesso de cada um.</p>` : ""}
      <div class="actions"><button class="btn primary" type="submit" id="p-ok">${p ? "Salvar permissões" : "Criar perfil"}</button><button class="btn" type="button" id="p-no">Cancelar</button>
        ${p ? `<button class="btn danger" type="button" id="p-del" style="margin-left:auto">Excluir perfil</button>` : ""}<span class="hint" id="p-msg"></span></div>
      <div class="confirm" id="p-conf" hidden><span>Excluir o perfil <b>${esc(p ? p.nome : "")}</b>?</span><div class="actions"><button class="btn danger" type="button" id="p-del-ok">Sim, excluir</button><button class="btn" type="button" id="p-del-no">Manter</button></div></div>
    </form>`;
  $("#modal").hidden = false; $("#p-nome").focus();
  $("#p-no").onclick = fecharModal;
  const depois = r => { S.eq = r.equipe; fecharModal(); renderEquipe(); if (p && p.nome === S.perfil) api("entrar").then(() => { renderMe(); setTab(S.tab); }).catch(()=>{}); };
  if (p) {
    $("#p-del").onclick = () => { $("#p-conf").hidden = false; };
    $("#p-del-no").onclick = () => { $("#p-conf").hidden = true; };
    $("#p-del-ok").onclick = () => enviar($("#p-del-ok"), $("#p-msg"), "excluirPerfil", {nome:p.nome}, depois);
  }
  $("#f-p").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#p-msg"); msg.className = "hint err";
    const nn = $("#p-nome").value.trim();
    if (!nn) { msg.textContent = "Informe o nome do perfil."; return; }
    const sel = {}; $$("#f-p [data-k]").forEach(c => { sel[c.dataset.k] = c.checked; });
    await enviar($("#p-ok"), msg, "salvarPerfil", {original: p ? p.nome : "", nome:nn, perms:sel}, depois);
  });
}

// ---------- ordens de serviço ----------
const OS_CATEGORIAS = ["Elétrica","Hidráulica","Iluminação","Pintura","Alvenaria e acabamento","Serralheria","Marcenaria","Piscina","Jardinagem","Portões e acessos","Equipamentos","Limpeza","Outros"];
const OS_PRAZO = {Urgente:0, Alta:2, Normal:7, Baixa:15};
const osEncerrada = o => o.status==="Concluída" || o.status==="Cancelada";
const osAbertas = () => S.os.filter(o => !osEncerrada(o));
const osAtrasada = o => !osEncerrada(o) && o.prazo && o.prazo < hoje();
const PRIO_ORD = {Urgente:0, Alta:1, Normal:2, Baixa:3};
const ordemOS = (a,b) => (osAtrasada(b) - osAtrasada(a)) || ((PRIO_ORD[a.prioridade]??2) - (PRIO_ORD[b.prioridade]??2)) || String(a.prazo).localeCompare(String(b.prazo)) || String(a.numero).localeCompare(String(b.numero));
const prioPill = p => `<span class="pill prio-${esc(norm(p||"Normal"))}">${esc(p||"Normal")}</span>`;
function statusPill(o){
  if (osAtrasada(o)) return `<span class="pill s-zero">${esc(o.status)} · atrasada</span>`;
  const cls = {"Aberta":"st-aberta","Em andamento":"st-andamento","Concluída":"s-ok","Cancelada":"p-ajuste"}[o.status] || "p-ajuste";
  return `<span class="pill ${cls}">${esc(o.status)}</span>`;
}
const dt = s => s ? new Date(String(s).replace(" ","T")) : null;
const fDataHora = s => s ? fData(s) + (String(s).length > 10 ? " " + String(s).slice(11,16) : "") : "—";
function osDireitos(o){
  const ger = can("os_gerenciar"), livre = !o.responsavelUsuario, minha = o.responsavelUsuario === S.usuario;
  return {ger, livre, minha, enc: osEncerrada(o), atender: ger || (can("os_atender") && (minha || livre)), abriu: o.abertaPorUsuario === S.usuario};
}
function prazoPara(prio){ const d = new Date(); d.setDate(d.getDate() + (OS_PRAZO[prio] ?? 7)); return iso(d); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-os]"); if (b) { abrirOS(b.dataset.os); return; }
  if (e.target.id === "p-os-nova") novaOS();
});

// tipo da OS: as antigas (sem tipo) contam como corretivas
const osTipo = o => o.tipo === "Preventiva" ? "Preventiva" : "Corretiva";
const OS_TIPOS_F = [["Corretiva","Corretivas","verm",'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.3-.3-2.4z"/>'],
  ["Preventiva","Preventivas","azul",'<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4"/>'],
  ["agendada","Agendadas","roxo",'<path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>'],
  ["equip","Com equipamento","cinza",'<path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/>']];
const osPassaTipo = (o, t) => !t ? true : t === "equip" ? !!String(o.equipamento || "").trim() : t === "agendada" ? !!o.agendadaPara && !osEncerrada(o) : osTipo(o) === t;
function renderOS(){
  const q = norm($("#o-busca").value), cat = $("#o-cat").value, prio = $("#o-prio").value, resp = $("#o-resp").value, f = S.oFiltro, tp = S.oTipo || "";
  const cats = [...new Set(S.os.map(o => o.categoria).filter(Boolean))].sort((x,y)=>x.localeCompare(y,"pt-BR"));
  $("#o-cat").innerHTML = `<option value="">Todos</option>` + cats.map(c => `<option ${c===cat?"selected":""}>${esc(c)}</option>`).join("");
  const resps = [...new Set(S.os.map(o => o.responsavel).filter(Boolean))].sort((x,y)=>x.localeCompare(y,"pt-BR"));
  $("#o-resp").innerHTML = `<option value="">Todos</option><option value="-" ${resp==="-"?"selected":""}>Sem responsável</option>` + resps.map(c => `<option ${c===resp?"selected":""}>${esc(c)}</option>`).join("");
  const nf = [cat, prio, resp].filter(Boolean).length; $("#o-fn").textContent = nf; $("#o-fn").hidden = !nf;
  if ($("#dl-equip")) $("#dl-equip").innerHTML = [...new Set(S.os.map(o => String(o.equipamento||"").trim()).filter(Boolean))].sort((x,y)=>x.localeCompare(y,"pt-BR")).map(v=>`<option value="${esc(v)}">`).join("");
  $("#dl-local").innerHTML = [...new Set(S.os.map(o=>o.local).concat(S.movs.map(m=>m.destino)).filter(Boolean).map(s=>String(s).trim()))].sort().slice(0,300).map(v=>`<option value="${esc(v)}">`).join("");
  $$("#o-filtros .chip").forEach(c => { if (c.dataset.f==="minhas") c.hidden = !can("os_atender") && !can("os_gerenciar"); });
  const passaSt = o => !(f==="aberto" && osEncerrada(o)) && !(f==="minhas" && (osEncerrada(o) || o.responsavelUsuario !== S.usuario)) && !(f==="atrasadas" && !osAtrasada(o))
    && !(f==="concluidas" && o.status!=="Concluída") && !(f==="canceladas" && o.status!=="Cancelada");
  const passaF = o => (!cat || o.categoria===cat) && (!prio || o.prioridade===prio) && (!resp || (resp==="-" ? !o.responsavel : o.responsavel===resp))
    && (!q || norm([o.numero,o.titulo,o.local,o.categoria,o.atividade,o.responsavel,o.solicitante,o.abertaPor,o.descricao,o.equipamento,o.unidadeSolic].join(" ")).includes(q));
  const base = S.os.filter(o => passaSt(o) && passaF(o));
  $("#o-tipos").innerHTML = OS_TIPOS_F.map(([k, rot, cor, ico]) => `<button type="button" class="os-tp ${cor} ${tp===k?"on":""}" data-tp="${k}" aria-pressed="${tp===k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${rot} <span class="os-tp-n">${base.filter(o => osPassaTipo(o, k)).length}</span></button>`).join("");
  const list = base.filter(o => osPassaTipo(o, tp))
    .sort((x,y) => osEncerrada(x)||osEncerrada(y) ? String(y.concluidaEm||y.abertaEm).localeCompare(String(x.concluidaEm||x.abertaEm)) : ordemOS(x,y));
  const vazio = {aberto:"Não há OS em aberto.", minhas:"Nenhuma OS em aberto com você.", atrasadas:"Nenhuma OS atrasada.", concluidas:"Nenhuma OS concluída nos últimos 90 dias.", canceladas:"Nenhuma OS cancelada nos últimos 90 dias.", todas:"Nenhuma OS registrada ainda."}[f];
  const tpIco = o => { const t = OS_TIPOS_F.find(x => x[0] === osTipo(o)); return `<span class="os-card-ico ${t[2]}" title="${esc(osTipo(o))}"><svg viewBox="0 0 24 24" aria-hidden="true">${t[3]}</svg></span>`; };
  $("#o-body").innerHTML = list.length ? list.map(o => `<article class="os-card click ${osAtrasada(o)?"os-atr":""}" data-os="${esc(o.id)}" tabindex="0">
      ${tpIco(o)}
      <div class="os-card-c">
        <div class="os-card-t"><span class="mono muted">${esc(o.numero)}</span>${statusPill(o)}${prioPill(o.prioridade)}${o.agendadaPara && !osEncerrada(o) ? `<span class="pill os-ag">Agendada ${fData(o.agendadaPara).slice(0,5)}${o.periodo && o.periodo !== "Dia todo" ? " · " + esc(o.periodo.toLowerCase()) : ""}</span>` : ""}</div>
        <b class="os-card-tit">${esc(o.titulo)}</b>
        <div class="os-card-m"><span>📍 ${esc(o.local || "—")}</span>${o.equipamento ? `<span>⚙ ${esc(o.equipamento)}</span>` : ""}${o.categoria ? `<span>${esc(o.categoria)}${o.atividade ? " › " + esc(o.atividade) : ""}</span>` : ""}${o.solicitante ? `<span>pedido por ${esc(o.solicitante)}</span>` : ""}</div>
      </div>
      <div class="os-card-r"><span class="${osAtrasada(o)?"atras":""}">${osEncerrada(o) ? `${o.status === "Cancelada" ? "Cancelada" : "Concluída"} ${fData(o.concluidaEm)}` : `Prazo ${fData(o.prazo)}${osAtrasada(o) ? " · atrasada" : ""}`}</span><span class="muted">${esc(o.responsavel || "Sem responsável")}</span></div>
    </article>`).join("")
    : `<div class="os-vazio"><span class="os-vazio-i" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 13h4l2 3h4l2-3h4M5 13l2-7h10l2 7v6H5z"/></svg></span><b>Nenhuma OS encontrada</b><span class="muted">${q || cat || prio || resp || tp ? "Nenhuma OS com esses filtros." : vazio}</span>${f==="aberto" && can("os_abrir") ? `<button class="btn primary" type="button" id="p-os-nova">+ Abrir OS</button>` : ""}</div>`;
}
$("#o-busca").addEventListener("input", renderOS);
["#o-cat","#o-prio","#o-resp"].forEach(id => $(id).addEventListener("change", renderOS));
$("#o-filtrar").addEventListener("click", () => { const p = $("#o-fpainel"); p.hidden = !p.hidden; $("#o-filtrar").setAttribute("aria-expanded", String(!p.hidden)); });
$("#o-limpar").addEventListener("click", () => { $("#o-cat").value = ""; $("#o-prio").value = ""; $("#o-resp").value = ""; S.oTipo = ""; renderOS(); });
$("#o-tipos").addEventListener("click", e => { const b = e.target.closest("[data-tp]"); if (b) { S.oTipo = S.oTipo === b.dataset.tp ? "" : b.dataset.tp; renderOS(); } });
$$("#o-filtros .chip").forEach(c => c.addEventListener("click", () => { S.oFiltro = c.dataset.f; syncChips("#o-filtros","f",S.oFiltro); renderOS(); }));
$("#o-nova").addEventListener("click", () => novaOS());
$("#o-body").addEventListener("keydown", e => { if (e.key==="Enter" && e.target.dataset.os) abrirOS(e.target.dataset.os); });

function camposOS(v, comResp){
  const cats = OS_CATEGORIAS.includes(v.categoria) || !v.categoria ? OS_CATEGORIAS : [v.categoria, ...OS_CATEGORIAS];
  return `
      <div class="field full"><label for="os-titulo">Serviço <span class="req">*</span></label><input class="input" id="os-titulo" value="${esc(v.titulo||"")}" placeholder="Ex.: Lâmpada queimada no hall do 3º andar" maxlength="120"></div>
      <div class="field"><label for="os-local">Local <span class="req">*</span></label><input class="input" id="os-local" value="${esc(v.local||"")}" list="dl-local" placeholder="Ex.: Bloco B, Piscina, Portaria"></div>
      <div class="field"><label for="os-cat">Categoria</label><select class="input" id="os-cat"><option value="">Selecione</option>${cats.map(c=>`<option ${c===v.categoria?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
      <div class="field"><label for="os-prio">Prioridade</label><select class="input" id="os-prio">${["Urgente","Alta","Normal","Baixa"].map(p=>`<option ${p===(v.prioridade||"Normal")?"selected":""}>${p}</option>`).join("")}</select></div>
      <div class="field"><label for="os-prazo">Prazo</label><input class="input" type="date" id="os-prazo" value="${esc(v.prazo || prazoPara(v.prioridade||"Normal"))}"></div>
      <div class="field full"><label for="os-desc">Descrição</label><textarea class="input" id="os-desc" placeholder="O que está acontecendo, desde quando, detalhes que ajudam no atendimento" maxlength="3000">${esc(v.descricao||"")}</textarea></div>
      <div class="field"><label for="os-equip">Equipamento <span class="muted">(opcional)</span></label><input class="input" id="os-equip" value="${esc(v.equipamento||"")}" list="dl-equip" maxlength="80" placeholder="Ex.: Bomba da piscina, Portão 2"></div>
      <div class="field"><label for="os-solic">Quem pediu</label><input class="input" id="os-solic" value="${esc(v.solicitante||"")}" placeholder="Ex.: Portaria, Síndico, Apto 302"></div>
      ${comResp ? `<div class="field"><label for="os-resp">Responsável</label><select class="input" id="os-resp"><option value="">Sem responsável por enquanto</option>${S.colab.map(c=>`<option value="${esc(c.usuario)}">${esc(c.nome)}</option>`).join("")}</select></div>` : ""}`;
}
function lerCamposOS(msg){
  const v = {titulo:$("#os-titulo").value.trim(), local:$("#os-local").value.trim(), categoria:$("#os-cat").value, prioridade:$("#os-prio").value, prazo:$("#os-prazo").value, descricao:$("#os-desc").value.trim(), solicitante:$("#os-solic").value.trim()};
  if ($("#os-equip")) v.equipamento = $("#os-equip").value.trim();
  if (!v.titulo) { msg.className="hint err"; msg.textContent = "Descreva o serviço em poucas palavras."; return null; }
  if (!v.local) { msg.className="hint err"; msg.textContent = "Informe o local."; return null; }
  return v;
}
function ligarPrazo(prio="#os-prio", prazo="#os-prazo"){
  let mexeu = false;
  $(prazo).addEventListener("input", () => { mexeu = true; });
  $(prio).addEventListener("change", () => { if (!mexeu) $(prazo).value = prazoPara($(prio).value); });
}

// grupos de atividades e as atividades de cada um (tela "Abrir OS")
const OS_ATIVIDADES = {
  "Elétrica":["Troca de lâmpada ou reator","Tomada ou interruptor","Disjuntor ou quadro elétrico","Fiação","Outra"],
  "Hidráulica":["Vazamento","Entupimento","Registro ou válvula","Bomba","Caixa d'água","Outra"],
  "Iluminação":["Lâmpada queimada","Luminária danificada","Sensor de presença","Iluminação externa","Outra"],
  "Pintura":["Retoque","Pintura completa","Demarcação de piso","Outra"],
  "Alvenaria e acabamento":["Reboco ou trinca","Revestimento ou azulejo","Piso","Forro","Impermeabilização","Outra"],
  "Serralheria":["Portão ou grade","Corrimão","Solda","Fechadura","Outra"],
  "Marcenaria":["Porta","Móvel","Dobradiça ou fechadura","Outra"],
  "Piscina":["Tratamento da água","Bomba ou filtro","Limpeza","Revestimento","Outra"],
  "Jardinagem":["Poda","Corte de grama","Irrigação","Plantio","Outra"],
  "Portões e acessos":["Portão automático","Interfone","Controle de acesso ou tag","Cancela","Outra"],
  "Equipamentos":["Elevador","Gerador","Ar-condicionado","Academia","Câmeras (CFTV)","Outra"],
  "Limpeza":["Limpeza pesada","Remoção de entulho","Dedetização","Outra"],
  "Outros":["Outra"]
};
const osTog = (id, rot, liga) => `<label class="ao-tog"><input type="checkbox" id="${id}" ${liga ? "checked" : ""}><span class="ao-sw" aria-hidden="true"></span><span>${rot}</span></label>`;
function novaOS(){
  if (!can("os_abrir")) return;
  const ger = can("os_gerenciar"), fotos = [];
  const grupos = Object.keys(OS_ATIVIDADES);
  $("#modal-box").classList.add("largo", "ao");
  $("#modal-box").innerHTML = `
    <div class="ao-cab"><h3><span class="ao-mais" aria-hidden="true">+</span> Abrir ordem de serviço</h3><span class="muted">Crie uma nova OS preventiva ou corretiva</span></div>
    <form id="f-os" novalidate autocomplete="off">
      <section class="ao-sec"><h4><span class="ao-i" aria-hidden="true">i</span> Informações básicas</h4>
        ${osTog("ao-outra", "Essa OS foi solicitada por outra pessoa")}
        <div class="field ao-solic" hidden><label for="os-solic">Quem pediu</label><input class="input" id="os-solic" maxlength="120" placeholder="Ex.: Portaria, Síndico, morador do 302"></div>
        <div class="form">
          <div class="field"><label for="ao-tipo">Tipo de OS <span class="req">*</span></label><select class="input" id="ao-tipo"><option>Corretiva</option><option>Preventiva</option></select></div>
          <div class="field"><label for="os-prio">Prioridade <span class="req">*</span></label><select class="input" id="os-prio">${["Urgente","Alta","Normal","Baixa"].map(p => `<option ${p === "Normal" ? "selected" : ""}>${p}</option>`).join("")}</select></div>
          <div class="field"><label for="os-equip">Equipamentos (tag)</label><input class="input" id="os-equip" list="dl-equip" maxlength="80" placeholder="Pesquisar equipamento…"></div>
          <div class="field"><label for="os-local">Local <span class="req">*</span></label><input class="input" id="os-local" list="dl-local" maxlength="120" placeholder="Ex.: Bloco B, Piscina, Portaria"><span class="hint">Escolha da lista ou digite o local.</span></div>
          <div class="field"><label for="os-cat">Grupo de atividades <span class="req">*</span></label><select class="input" id="os-cat"><option value="">Selecione o grupo de atividades</option>${grupos.map(g => `<option>${esc(g)}</option>`).join("")}</select></div>
          <div class="field"><label for="ao-ativ">Atividade <span class="req">*</span></label><select class="input" id="ao-ativ" disabled><option value="">Selecione primeiro o grupo de atividades</option></select><input class="input ao-outra-ativ" id="ao-ativ-txt" maxlength="80" placeholder="Qual atividade?" hidden></div>
          <div class="field full"><label for="os-titulo">Título <span class="req">*</span></label><input class="input" id="os-titulo" maxlength="120" placeholder="Ex.: Vazamento no 5º andar"></div>
          <div class="field full"><label for="os-desc">Descrição <span class="req">*</span></label><textarea class="input" id="os-desc" rows="4" maxlength="3000" placeholder="Descreva detalhadamente o problema ou a manutenção necessária…"></textarea></div>
        </div>
      </section>
      <section class="ao-sec"><h4><span class="ao-cam" aria-hidden="true">📷</span> Fotos do problema <span class="req">*</span></h4>
        <p class="hint">Selecione várias fotos de uma vez. A prévia aparece abaixo. A primeira é a foto <b>Antes</b> (fica na comparação com o serviço pronto); as outras entram no histórico da abertura. Até 8 fotos.</p>
        <label class="ao-drop" id="ao-drop"><input type="file" id="os-fotos" accept="image/*" multiple hidden><span class="ao-drop-i" aria-hidden="true">🖼</span><b>Clique para selecionar uma ou mais fotos</b><span class="hint">Seleção múltipla. A primeira vira a foto Antes.</span></label>
        <div class="ao-prev" id="ao-prev"></div>
      </section>
      <details class="ao-sec ao-mais-d" open><summary><span class="ao-cfg" aria-hidden="true">☰</span> <b>Mais detalhes</b> <span class="muted">Agenda, prazo e atribuição</span></summary>
        ${osTog("ao-ag", "Agendar esta OS")}
        <p class="hint">Escolha o dia e o período. O atendimento fica marcado para essa data.</p>
        <div class="form ao-agenda" hidden><div class="field"><label for="ao-dia">Dia</label><input class="input" type="date" id="ao-dia" min="${hoje()}"></div>
          <div class="field"><label for="ao-per">Período</label><select class="input" id="ao-per"><option>Manhã</option><option>Tarde</option><option selected>Dia todo</option></select></div></div>
        <div class="form"><div class="field"><label for="os-prazo">Prazo</label><input class="input" type="date" id="os-prazo" value="${prazoPara("Normal")}"><span class="hint">Calculado pela prioridade; pode mudar.</span></div></div>
        <h4 class="ao-sub">Atribuição e solicitante</h4>
        <div class="form">
          ${ger ? `<div class="field"><label for="os-resp">Atribuir a <span class="muted">(opcional)</span></label><select class="input" id="os-resp"><option value="">Selecione um técnico…</option>${S.colab.map(c => `<option value="${esc(c.usuario)}">${esc(c.nome)}</option>`).join("")}</select><span class="hint">Se atribuída, a OS já vai para o técnico.</span></div>` : ""}
          <div class="field"><label for="ao-un">Solicitação de unidade? <span class="muted">(opcional)</span></label><select class="input" id="ao-un"><option>Não</option><option>Sim</option></select></div>
          <div class="field ao-unid" hidden><label for="ao-un-txt">Unidade</label><input class="input" id="ao-un-txt" maxlength="60" placeholder="Ex.: Bloco 2 · 302"></div>
        </div>
      </details>
      <div class="ao-acoes"><span class="hint" id="os-msg"></span><button class="btn" type="button" id="os-limpar">Limpar</button><button class="btn" type="button" id="os-no">Cancelar</button><button class="btn primary" type="submit" id="os-ok">Abrir ordem de serviço</button></div>
    </form>`;
  $("#modal").hidden = false; $("#ao-tipo").focus();
  $("#os-no").onclick = fecharModal;
  ligarPrazo();
  const vis = (sel, on) => { $(sel).hidden = !on; };
  $("#ao-outra").onchange = ev => { vis(".ao-solic", ev.target.checked); if (ev.target.checked) $("#os-solic").focus(); };
  $("#ao-ag").onchange = ev => { vis(".ao-agenda", ev.target.checked); if (ev.target.checked && !$("#ao-dia").value) $("#ao-dia").value = hoje(); };
  $("#ao-un").onchange = ev => vis(".ao-unid", ev.target.value === "Sim");
  $("#os-cat").onchange = () => { const g = $("#os-cat").value, a = $("#ao-ativ"); a.disabled = !g;
    a.innerHTML = g ? `<option value="">Selecione a atividade</option>` + OS_ATIVIDADES[g].map(x => `<option>${esc(x)}</option>`).join("") : `<option value="">Selecione primeiro o grupo de atividades</option>`; vis("#ao-ativ-txt", false); };
  $("#ao-ativ").onchange = () => { const o = $("#ao-ativ").value === "Outra"; vis("#ao-ativ-txt", o); if (o) $("#ao-ativ-txt").focus(); };
  const prever = () => {
    $("#ao-prev").innerHTML = fotos.map((f, i) => `<figure class="ao-ft"><img alt="Foto ${i + 1}" src="${URL.createObjectURL(f)}"><figcaption>${i === 0 ? "<b>Antes</b>" : "Foto " + (i + 1)}</figcaption><button type="button" class="ao-ft-x" data-ftx="${i}" aria-label="Tirar a foto ${i + 1}">×</button>${i ? `<button type="button" class="ao-ft-a" data-fta="${i}">Usar como Antes</button>` : ""}</figure>`).join("");
  };
  $("#os-fotos").onchange = ev => { const n = [...ev.target.files].filter(f => /^image\//.test(f.type)), cabe = 8 - fotos.length; ev.target.value = ""; if (n.length > cabe) toast("No máximo 8 fotos por OS.", true); fotos.push(...n.slice(0, cabe)); prever(); };
  $("#ao-prev").onclick = ev => { const x = ev.target.closest("[data-ftx]"), a = ev.target.closest("[data-fta]");
    if (x) { fotos.splice(+x.dataset.ftx, 1); prever(); } else if (a) { const [f] = fotos.splice(+a.dataset.fta, 1); fotos.unshift(f); prever(); } };
  $("#os-limpar").onclick = () => { fecharModal(); novaOS(); };
  $("#f-os").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#os-msg"), erro = t => { msg.className = "hint err"; msg.textContent = t; };
    const ativ = $("#ao-ativ").value === "Outra" ? $("#ao-ativ-txt").value.trim() : $("#ao-ativ").value;
    const v = {titulo:$("#os-titulo").value.trim(), local:$("#os-local").value.trim(), categoria:$("#os-cat").value, prioridade:$("#os-prio").value, prazo:$("#os-prazo").value,
      descricao:$("#os-desc").value.trim(), solicitante:$("#ao-outra").checked ? $("#os-solic").value.trim() : "", equipamento:$("#os-equip").value.trim(),
      tipo:$("#ao-tipo").value, atividade:ativ, agendadaPara:$("#ao-ag").checked ? $("#ao-dia").value : "", periodo:$("#ao-per").value, unidadeSolic:$("#ao-un").value === "Sim" ? $("#ao-un-txt").value.trim() : ""};
    if (!v.local) return erro("Informe o local.");
    if (!v.categoria) return erro("Escolha o grupo de atividades.");
    if (!v.atividade) return erro("Escolha a atividade.");
    if (!v.titulo) return erro("Dê um título à OS.");
    if (!v.descricao) return erro("Descreva o problema.");
    if (!fotos.length) return erro("Coloque ao menos uma foto do problema.");
    if ($("#ao-ag").checked && !v.agendadaPara) return erro("Escolha o dia do agendamento.");
    if ($("#ao-outra").checked && !v.solicitante) return erro("Informe quem pediu a OS.");
    if ($("#ao-un").value === "Sim" && !v.unidadeSolic) return erro("Informe a unidade que pediu.");
    if (v.unidadeSolic && !v.solicitante) v.solicitante = "Unidade " + v.unidadeSolic;
    if (ger && $("#os-resp").value) v.responsavelUsuario = $("#os-resp").value;
    v.setor = osAmb();
    const r = await enviar($("#os-ok"), msg, "osAbrir", {os:v});
    if (!r) return;
    $("#os-ok").disabled = true; await enviarFotos(r.osId, "antes", fotos, msg);
    fecharModal(); setTab("os"); abrirOS(r.osId);
  });
}

async function reduzirFoto(file, maxLado=1600, qualidade=0.82){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error("img")); i.src = url; });
    const k = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth*k); c.height = Math.round(img.naturalHeight*k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", qualidade).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}
async function enviarFotos(osId, fase, arquivos, msgEl){
  let ok = 0;
  for (let i = 0; i < arquivos.length; i++) {
    if (msgEl) { msgEl.className = "hint"; msgEl.innerHTML = `<span class="spin" aria-hidden="true"></span> Enviando foto ${i+1} de ${arquivos.length}…`; }
    try { const b64 = await reduzirFoto(arquivos[i]); await api("osFoto", {id:osId, fase, mime:"image/jpeg", b64}); ok++; }
    catch(e){ toast(e && e.message && e.message !== "img" ? e.message : `Não deu para ler a foto ${arquivos[i].name}.`, true); }
  }
  if (ok) toast(ok === 1 ? "Foto anexada." : `${ok} fotos anexadas.`);
  return ok;
}
async function carregarFoto(id){
  if (S.fotos.has(id)) return S.fotos.get(id);
  const p = api("osFotoVer", {fotoId:id}).then(r => `data:${r.foto.mime};base64,${r.foto.b64}`);
  S.fotos.set(id, p);
  p.catch(() => S.fotos.delete(id));
  return p;
}
function galeria(o, fase, d){
  const ids = String((fase==="antes" ? o.fotosAntes : o.fotosDepois) || "").split(",").filter(Boolean);
  const pode = fase==="antes" ? (d.atender || (d.abriu && can("os_abrir"))) && o.status!=="Cancelada" : d.atender && o.status!=="Cancelada";
  const remover = d.ger || (d.atender && !d.enc);
  return `<div class="fotos">${ids.map(id => `<div class="foto"><button type="button" class="foto-ver" data-foto="${esc(id)}" aria-label="Ampliar foto"><span class="spin" aria-hidden="true"></span></button>${remover?`<button type="button" class="foto-x" data-fx="${esc(id)}" data-fase="${fase}" aria-label="Tirar foto">×</button>`:""}</div>`).join("")}
    ${pode && ids.length < 8 ? `<label class="foto-add"><input type="file" accept="image/*" multiple data-up="${fase}" hidden><span>+ Foto</span></label>` : ""}
    ${!ids.length && !pode ? '<span class="muted">Sem fotos.</span>' : ""}</div>`;
}

function abrirOS(id){
  const o = S.os.find(x => x.id === id); if (!o) { toast("Esta OS não está mais na lista. Atualize a página.", true); return; }
  const d = osDireitos(o);
  const mats = o.materiais || [];
  const linhasAnd = String(o.andamento||"").split("\n").filter(Boolean).reverse();
  const dur = o.concluidaEm && o.abertaEm ? duracao(dt(o.abertaEm), dt(o.concluidaEm)) : "";
  const acoes = [];
  if (o.status==="Aberta" && d.atender) acoes.push(`<button class="btn primary" type="button" data-op="iniciar">Iniciar atendimento</button>`);
  if (!d.enc && d.atender) acoes.push(`<button class="btn ${o.status==="Em andamento"?"primary":""}" type="button" data-op="concluir">Concluir</button>`);
  if (!d.enc && (can("registrar_saida") || can("registrar_troca"))) acoes.push(`<button class="btn" type="button" data-op="material">Retirar material</button>`);
  if (!d.enc && d.ger) acoes.push(`<button class="btn" type="button" data-op="atribuir">${o.responsavelUsuario?"Trocar responsável":"Atribuir"}</button>`);
  if (!d.enc && d.ger && o.responsavelUsuario) acoes.push(`<button class="btn wa" type="button" data-op="whats">Avisar no WhatsApp</button>`);
  if (d.ger || (d.abriu && o.status==="Aberta")) acoes.push(`<button class="btn" type="button" data-op="editar">Editar</button>`);
  if (can("os_abrir") || can("os_atender") || d.ger) acoes.push(`<button class="btn" type="button" data-op="nota">Anotar</button>`);
  if (!d.enc && d.ger) acoes.push(`<button class="btn danger" type="button" data-op="cancelar">Cancelar OS</button>`);
  if (d.enc && d.ger) acoes.push(`<button class="btn" type="button" data-op="reabrir">Reabrir</button>`);
  $("#modal-box").innerHTML = `
    <div class="os-top"><span class="mono muted">${esc(o.numero)}</span>${statusPill(o)}${prioPill(o.prioridade)}</div>
    <h3 class="os-tit">${esc(o.titulo)}</h3>
    <dl class="os-info">
      <div><dt>Local</dt><dd>${esc(o.local||"—")}</dd></div>
      <div><dt>Categoria</dt><dd>${esc(o.categoria||"—")}</dd></div>
      ${o.equipamento ? `<div><dt>Equipamento</dt><dd>${esc(o.equipamento)}</dd></div>` : ""}
      ${o.tipo ? `<div><dt>Tipo</dt><dd>${esc(o.tipo)}</dd></div>` : ""}${o.atividade ? `<div><dt>Atividade</dt><dd>${esc(o.atividade)}</dd></div>` : ""}
      ${o.agendadaPara ? `<div><dt>Agendada</dt><dd>${fData(o.agendadaPara)} · ${esc(String(o.periodo || "").toLowerCase())}</dd></div>` : ""}${o.unidadeSolic ? `<div><dt>Unidade</dt><dd>${esc(o.unidadeSolic)}</dd></div>` : ""}
      <div><dt>Responsável</dt><dd>${esc(o.responsavel||"Sem responsável")}</dd></div>
      <div><dt>Prazo</dt><dd class="${osAtrasada(o)?"atras":""}">${fData(o.prazo)}${osAtrasada(o)?" · atrasada":""}</dd></div>
      <div><dt>Aberta</dt><dd>${fDataHora(o.abertaEm)} por ${esc(o.abertaPor||"—")}</dd></div>
      <div><dt>Quem pediu</dt><dd>${esc(o.solicitante||"—")}</dd></div>
      ${o.concluidaEm ? `<div><dt>${o.status==="Cancelada"?"Cancelada":"Concluída"}</dt><dd>${fDataHora(o.concluidaEm)}${o.concluidaPor?" por "+esc(o.concluidaPor):""}${dur&&o.status==="Concluída"?" · "+dur:""}</dd></div>` : ""}
    </dl>
    ${o.descricao ? `<p class="os-desc">${esc(o.descricao)}</p>` : ""}
    ${o.solucao ? `<div class="os-sol"><b>O que foi feito</b><p>${esc(o.solucao)}</p></div>` : ""}
    ${o.motivoCancelamento ? `<div class="os-sol canc"><b>Motivo do cancelamento</b><p>${esc(o.motivoCancelamento)}</p></div>` : ""}
    <div class="os-acoes actions">${acoes.join("")}</div>
    <div id="os-form"></div>
    <div class="os-grid">
      <section><h4>Fotos antes</h4>${galeria(o,"antes",d)}</section>
      <section><h4>Fotos depois</h4>${galeria(o,"depois",d)}</section>
    </div>
    <section><h4>Materiais retirados <span class="muted">(${mats.filter(m=>!m.estornado).length})</span></h4>
      ${mats.length ? `<div class="rows">${mats.map(m => `<div class="row"><div>${pill(m.tipo)}</div><div><div class="t ${m.estornado?"struck":""}">${esc(m.itemNome)}</div><div class="d">${fData(m.data)} · ${esc(m.registradoPor||"")}${m.estornado?" · estornado":""}</div></div><div class="r num">${fNum(m.qtd)} ${esc(m.unidade||"")}</div></div>`).join("")}</div>` : '<p class="muted">Nenhum material retirado por esta OS.</p>'}
    </section>
    <section><h4>Andamento</h4><ol class="timeline">${linhasAnd.map(l => { const [q, ...resto] = l.split(" · "); return `<li><span class="when">${esc(q)}</span> ${esc(resto.join(" · "))}</li>`; }).join("")}</ol></section>
    <div class="actions" style="margin-top:6px"><button class="btn" type="button" id="os-fechar">Fechar</button><span class="hint" id="os-msg"></span></div>`;
  $("#modal-box").classList.add("largo");
  $("#modal").hidden = false;
  $("#os-fechar").onclick = fecharModal;
  $$("#modal-box .foto-ver").forEach(async b => {
    try { const src = await carregarFoto(b.dataset.foto); b.innerHTML = `<img src="${src}" alt="Foto da ${esc(o.numero)}">`; }
    catch(e){ b.innerHTML = '<span class="muted">sem acesso</span>'; }
  });
  $("#modal-box").onclick = async e => {
    const v = e.target.closest(".foto-ver");
    if (v && v.querySelector("img")) { verFotoGrande(v.querySelector("img").src); return; }
    const x = e.target.closest("[data-fx]");
    if (x) { const r = await enviar(null, $("#os-msg"), "osFotoRemover", {id:o.id, fase:x.dataset.fase, fotoId:x.dataset.fx}); if (r) abrirOS(o.id); return; }
    const b = e.target.closest("[data-op]"); if (b) acaoOS(o, b.dataset.op);
  };
  $$("#modal-box [data-up]").forEach(inp => inp.addEventListener("change", async () => {
    const arquivos = [...inp.files]; if (!arquivos.length) return;
    await enviarFotos(o.id, inp.dataset.up, arquivos, $("#os-msg"));
    abrirOS(o.id);
  }));
}
function duracao(a, b){
  if (!a || !b) return "";
  const h = (b - a) / 36e5;
  if (h < 1) return "menos de 1 hora";
  if (h < 48) return `${Math.round(h)} hora${Math.round(h)===1?"":"s"}`;
  return `${Math.round(h/24)} dias`;
}
function verFotoGrande(src){
  const ov = document.createElement("div"); ov.className = "lightbox"; ov.tabIndex = -1;
  ov.innerHTML = `<img src="${src}" alt="Foto ampliada"><button type="button" class="btn">Fechar</button>`;
  const fechar = () => { ov.remove(); document.removeEventListener("keydown", esc2); };
  const esc2 = e => { if (e.key==="Escape") { e.stopPropagation(); fechar(); } };
  ov.addEventListener("click", fechar); document.addEventListener("keydown", esc2, true);
  document.body.appendChild(ov); ov.focus();
}
function formOS(html, onOk, rotulo){
  $("#os-form").innerHTML = `<form class="form os-subform" id="f-os2" novalidate>${html}<div class="full actions"><button class="btn primary" type="submit" id="os2-ok">${rotulo}</button><button class="btn" type="button" id="os2-no">Voltar</button><span class="hint" id="os2-msg"></span></div></form>`;
  $("#os2-no").onclick = () => { $("#os-form").innerHTML = ""; };
  $("#f-os2").addEventListener("submit", ev => { ev.preventDefault(); onOk($("#os2-msg")); });
  const f = $("#f-os2 input, #f-os2 textarea, #f-os2 select"); if (f) f.focus();
  $("#os-form").scrollIntoView({block:"nearest"});
}
function acaoOS(o, op){
  const depois = () => abrirOS(o.id);
  const atualizar = (msg, extra) => enviar($("#os2-ok") || null, msg, "osAtualizar", Object.assign({id:o.id, op}, extra), depois);
  if (op === "iniciar") { enviar(null, $("#os-msg"), "osAtualizar", {id:o.id, op}, depois); return; }
  if (op === "whats") { abrirWhats(o.responsavelUsuario, msgWhats("os", o)); return; }
  if (op === "material") {
    fecharModal(); if (S.setores.includes("Manutenção")) mudarSetor("Manutenção"); setTab("registrar");
    const t = can("registrar_saida") ? "saida" : "troca"; setTipo(t);
    renderOsRef(o.numero); $("#m-osref").value = o.numero;
    if (!$("#m-destino").value) $("#m-destino").value = o.local || "";
    if (!$("#m-resp").value) $("#m-resp").value = o.responsavel || S.nome;
    osRefHint(); $("#m-busca").focus();
    return;
  }
  if (op === "concluir") return formOS(`<div class="field full"><label for="os-sol">O que foi feito <span class="req">*</span></label><textarea class="input" id="os-sol" placeholder="Ex.: troquei o reator e a lâmpada tubular; testado e funcionando" maxlength="3000"></textarea></div>
      <div class="field full"><label for="os-fd">Fotos depois</label><input class="input" type="file" id="os-fd" accept="image/*" multiple></div>`, async msg => {
      const sol = $("#os-sol").value.trim(); if (!sol) { msg.className="hint err"; msg.textContent="Descreva o que foi feito."; return; }
      const arquivos = [...$("#os-fd").files].slice(0, 8);
      if (arquivos.length) { $("#os2-ok").disabled = true; await enviarFotos(o.id, "depois", arquivos, msg); }
      atualizar(msg, {solucao:sol});
    }, "Concluir OS");
  if (op === "cancelar") return formOS(`<div class="field full"><label for="os-mot">Motivo do cancelamento <span class="req">*</span></label><input class="input" id="os-mot" placeholder="Ex.: aberta em duplicidade, serviço feito por terceiro"></div>`, msg => {
      const m = $("#os-mot").value.trim(); if (!m) { msg.className="hint err"; msg.textContent="Informe o motivo."; return; }
      atualizar(msg, {motivo:m});
    }, "Cancelar OS");
  if (op === "reabrir") return formOS(`<div class="field full"><label for="os-mot">Por que reabrir?</label><input class="input" id="os-mot" placeholder="Ex.: o problema voltou"></div>`, msg => atualizar(msg, {motivo:$("#os-mot").value.trim()}), "Reabrir OS");
  if (op === "nota") return formOS(`<div class="field full"><label for="os-nota">Anotação <span class="req">*</span></label><textarea class="input" id="os-nota" placeholder="Ex.: aguardando peça; morador não estava em casa" maxlength="1000"></textarea></div>`, msg => {
      const n = $("#os-nota").value.trim(); if (!n) { msg.className="hint err"; msg.textContent="Escreva a anotação."; return; }
      atualizar(msg, {nota:n});
    }, "Salvar anotação");
  if (op === "atribuir") return formOS(`<div class="field full"><label for="os-r">Responsável</label><select class="input" id="os-r"><option value="">Sem responsável</option>${S.colab.map(c=>`<option value="${esc(c.usuario)}" ${c.usuario===o.responsavelUsuario?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></div>`, msg => atualizar(msg, {responsavelUsuario:$("#os-r").value}), "Salvar");
  if (op === "editar") { formOS(camposOS(o, false), msg => { const v = lerCamposOS(msg); if (v) atualizar(msg, {os:v}); }, "Salvar alterações"); ligarPrazo(); }
}

// vínculo com OS na tela Registrar
function renderOsRef(forcar){
  const sel = $("#m-osref"); if (!sel) return;
  const cur = forcar || sel.value;
  const lista = osAbertas().sort((a,b) => String(a.numero).localeCompare(String(b.numero)));
  const extra = cur && !lista.some(o => o.numero===cur) ? S.os.filter(o => o.numero===cur) : [];
  sel.innerHTML = `<option value="">Sem OS</option>` + extra.concat(lista).map(o => `<option value="${esc(o.numero)}">${esc(o.numero)} · ${esc(o.titulo.slice(0,60))}</option>`).join("");
  sel.value = cur && [...sel.options].some(op => op.value===cur) ? cur : "";
  osRefHint();
}
function osRefHint(){
  const o = S.os.find(x => x.numero === $("#m-osref").value);
  $("#m-osref-hint").innerHTML = o ? `Local: ${esc(o.local)} · <button type="button" class="link" data-os="${esc(o.id)}">ver a OS</button>` : "";
}
$("#m-osref").addEventListener("change", () => {
  const o = S.os.find(x => x.numero === $("#m-osref").value);
  if (o && !$("#m-destino").value) $("#m-destino").value = o.local || "";
  osRefHint();
});

// ---------- dashboard: ordens de serviço ----------
function renderDashOS(R){
  const bloco = $("#d-os-bloco");
  if (!R.os) { bloco.hidden = true; return; }
  bloco.hidden = false;
  const noPer = s => { const d = String(s||"").slice(0,10); return d && d >= R.de && d <= R.ate; };
  const abertasPer = R.os.filter(o => noPer(o.abertaEm));
  const conclPer = R.os.filter(o => o.status==="Concluída" && noPer(o.concluidaEm));
  const emAberto = R.os.filter(o => !osEncerrada(o));
  const atras = emAberto.filter(osAtrasada);
  const horas = conclPer.map(o => (dt(o.concluidaEm) - dt(o.abertaEm)) / 36e5).filter(h => h >= 0);
  const media = horas.length ? horas.reduce((s,h)=>s+h,0) / horas.length : null;
  const noPrazo = conclPer.filter(o => o.prazo && String(o.concluidaEm).slice(0,10) <= o.prazo).length;
  const fH = h => h === null ? "—" : h < 48 ? `${fNum(Math.round(h))} h` : `${fNum(Math.round(h/24*10)/10)} dias`;
  const kpi = (lbl, val, sub, cls) => `<div class="kpi static ${cls||""}"><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
  $("#d-os-kpis").innerHTML = [
    kpi("OS abertas", abertasPer.length, "no período"),
    kpi("OS concluídas", conclPer.length, "no período"),
    kpi("Em aberto agora", emAberto.length, `${emAberto.filter(o=>o.status==="Em andamento").length} em andamento`),
    kpi("Atrasadas agora", atras.length, "prazo vencido e ainda abertas", atras.length?"crit":""),
    kpi("Tempo médio até concluir", fH(media), horas.length ? (horas.length===1 ? "em 1 OS concluída" : `em ${horas.length} OS concluídas`) : "nenhuma OS concluída no período"),
    kpi("Concluídas no prazo", conclPer.length ? Math.round(noPrazo/conclPer.length*100)+"%" : "—", conclPer.length ? `${noPrazo} de ${conclPer.length}` : "nenhuma OS concluída no período")
  ].join("");
  const conta = (lista, chave) => { const m = {}; lista.forEach(o => { const k = String(chave(o)||"").trim() || "Não informado"; m[k] = m[k] || {v:0}; m[k].v++; }); return m; };
  barras("#d-os-cat", topN(conta(abertasPer, o=>o.categoria), 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["OS abertas", String(o.v)]]})), "Nenhuma OS aberta no período.");
  barras("#d-os-local", topN(conta(abertasPer, o=>o.local), 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["OS abertas", String(o.v)]]})), "Nenhuma OS aberta no período.");
  barras("#d-os-colab", topN(conta(conclPer, o=>o.responsavel||o.concluidaPor), 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["OS concluídas", String(o.v)]]})), "Nenhuma OS concluída no período.");
  const custo = {};
  R.os.forEach(o => {
    const v = (o.materiais||[]).filter(m => !m.estornado && (m.tipo==="saida"||m.tipo==="troca")).reduce((s,m) => s + (R.preco[m.itemId]||0) * Number(m.qtd||0), 0);
    if (v > 0) custo[o.numero + " · " + o.titulo] = {v};
  });
  barras("#d-os-custo", topN(custo, 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:fBRL(o.v), tip:[["em material", fBRL(o.v)]]})), "Sem custo calculado: registre entradas com valor para os itens usados nas OS.");
  $("#d-os-atras").innerHTML = atras.length ? atras.sort(ordemOS).map(o => `<tr class="click" data-os="${esc(o.id)}"><td class="mono">${esc(o.numero)}</td><td><b>${esc(o.titulo)}</b><span class="sub">${esc(o.local||"")}</span></td><td>${esc(o.responsavel||"—")}</td><td class="n">${Math.max(1, Math.round((new Date(hoje()) - new Date(o.prazo)) / 864e5))} d</td></tr>`).join("")
    : `<tr><td colspan="4"><div class="empty">Nenhuma OS atrasada.</div></td></tr>`;
}

// ---------- demandas ----------
const DEM_CATEGORIAS = OS_CATEGORIAS.filter(c => c !== "Outros").concat(["Vistoria","Compras e orçamentos","Outros"]);
const demEnc = d => d.status==="Concluída" || d.status==="Cancelada";
const demAbertas = () => S.dem.filter(d => !demEnc(d));
const demAtrasada = d => !demEnc(d) && d.prazo && d.prazo < hoje();
const demSemCiente = d => d.status==="Pendente" && d.responsavelUsuario && !d.cienteEm;
const minhasNovas = () => S.dem.filter(d => demSemCiente(d) && d.responsavelUsuario===S.usuario);
const ordemDem = (a,b) => (demAtrasada(b) - demAtrasada(a)) || ((PRIO_ORD[a.prioridade]??2) - (PRIO_ORD[b.prioridade]??2)) || String(a.prazo).localeCompare(String(b.prazo)) || String(a.numero).localeCompare(String(b.numero));
function demStatusPill(d){
  let txt = d.status, cls = {"Em andamento":"st-andamento","Concluída":"s-ok","Cancelada":"p-ajuste"}[d.status] || "st-aberta";
  if (d.status==="Pendente") {
    if (!d.responsavelUsuario) { txt = "Sem responsável"; cls = "p-ajuste"; }
    else if (!d.cienteEm) { txt = "Aguardando ciente"; cls = "st-ciente"; }
    else txt = "Ciente";
  }
  if (demAtrasada(d)) return `<span class="pill s-zero">${esc(txt)} · atrasada</span>`;
  return `<span class="pill ${cls}">${esc(txt)}</span>`;
}
function demDireitos(d){
  const del = can("dem_delegar"), livre = !d.responsavelUsuario, minha = d.responsavelUsuario === S.usuario;
  return {del, livre, minha, enc: demEnc(d), exec: del || (can("dem_executar") && (minha || livre))};
}
const descRep = (n, u) => { n = Number(n)||1; if (u==="semanas") return n===1?"toda semana":`a cada ${n} semanas`; if (u==="meses") return n===1?"todo mês":n===12?"todo ano":`a cada ${n} meses`; return n===1?"todo dia":`a cada ${n} dias`; };
const primeiroNome = s => String(s||"").trim().split(/\s+/)[0] || "";
const fTel = t => { const d = String(t||"").replace(/\D/g,"").replace(/^55(?=\d{10,11}$)/,""); return d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` : d; };

// aviso no WhatsApp: abre o app com a mensagem pronta para o responsável
const linkSistema = aba => location.origin + location.pathname + "#" + aba;
function msgWhats(tipo, x){
  const quem = primeiroNome(x.responsavel);
  const linhas = [
    `Olá${quem ? ", "+quem : ""}! ${tipo==="os" ? "Uma ordem de serviço foi atribuída a você" : "Você recebeu uma demanda"} no Pier Gestão:`,
    `*${x.numero} · ${x.titulo}*`,
    x.local ? `Local: ${x.local}` : "",
    `Prioridade: ${x.prioridade||"Normal"} · Prazo: ${fData(x.prazo)}`,
    x.descricao ? "\n" + String(x.descricao).split("\n\nPreventiva")[0].slice(0, 400) : "",
    "",
    tipo==="os" ? `Detalhes no sistema: ${linkSistema("os")}` : `Abra o sistema para ver os detalhes e dar o ciente: ${linkSistema("demandas")}`
  ];
  return linhas.filter((l,i) => l !== "" || i === 5).join("\n");
}
function abrirWhats(usuario, texto){
  const c = S.colab.find(x => x.usuario === usuario);
  let tel = String(c && c.telefone || "").replace(/\D/g,"");
  if (tel && tel.length <= 11) tel = "55" + tel;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  if (!tel) toast("Este colaborador não tem WhatsApp cadastrado. Escolha o contato no WhatsApp ou cadastre o número em Usuários.");
}
const temFone = usuario => { const c = S.colab.find(x => x.usuario === usuario); return !!(c && c.telefone); };

// destaque para quem recebeu demandas novas
function renderAvisoDem(){
  const el = $("#aviso-dem"); if (!el) return;
  const novas = S.token && can("dem_executar") && podeAba("demandas") ? minhasNovas().sort(ordemDem) : [];
  if (!novas.length) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="aviso-dem" role="status">
    <div class="aviso-txt"><b class="aviso-tit">${novas.length===1 ? "Você recebeu 1 demanda nova" : `Você recebeu ${novas.length} demandas novas`}</b>
      <span>Abra cada uma e confirme com <b>Dar ciente</b> para a administração saber que você viu.</span></div>
    <div class="aviso-lista">${novas.slice(0,4).map(d => `<button type="button" class="aviso-item" data-dem="${esc(d.id)}">${prioPill(d.prioridade)}<span class="ai-t"><span class="mono muted">${esc(d.numero)}</span> ${esc(d.titulo)}</span><span class="ai-p ${demAtrasada(d)?"atras":"muted"}">prazo ${fData(d.prazo)}</span></button>`).join("")}
      ${novas.length>4 ? `<button type="button" class="link" id="aviso-todas">Ver todas as ${novas.length}</button>` : ""}</div>
  </div>`;
  const t = $("#aviso-todas"); if (t) t.onclick = () => { S.dFiltro = "ciente"; syncChips("#dm-filtros","f",S.dFiltro); setTab("demandas"); };
}
document.addEventListener("click", e => { const b = e.target.closest("[data-dem]"); if (b) abrirDem(b.dataset.dem); });

function renderPainelDem(){
  if (!podeAba("demandas")) return;
  const abertas = demAbertas(), atras = abertas.filter(demAtrasada), semCiente = abertas.filter(demSemCiente);
  const delega = can("dem_delegar");
  const minhas = abertas.filter(d => d.responsavelUsuario === S.usuario);
  $("#k-dem").textContent = abertas.length;
  $("#k-dem-sub").textContent = atras.length ? `${atras.length} atrasada${atras.length===1?"":"s"}` : semCiente.length ? `${semCiente.length} aguardando ciente` : `${abertas.filter(d=>d.status==="Em andamento").length} em andamento`;
  $("#k-dem-box").classList.toggle("crit", atras.length>0);
  const b = $("#b-dem"), novas = minhasNovas().length;
  b.textContent = delega ? abertas.length : minhas.length;
  b.classList.toggle("alert", novas>0 || (delega && atras.length>0));
  // quem executa vê primeiro as suas
  const doPainel = delega ? abertas : abertas.filter(d => d.responsavelUsuario === S.usuario || !d.responsavelUsuario);
  const lista = [...doPainel].sort((x,y) => ((y.responsavelUsuario===S.usuario) - (x.responsavelUsuario===S.usuario)) || ordemDem(x,y)).slice(0,6);
  $("#p-dem-tit").textContent = delega ? "Demandas em aberto" : "Suas demandas";
  $("#p-dem").innerHTML = lista.length ? lista.map(d => `
    <button class="row row-btn" data-dem="${esc(d.id)}" type="button"><div>${prioPill(d.prioridade)}</div>
      <div><div class="t"><span class="mono muted">${esc(d.numero)}</span> ${esc(d.titulo)}</div><div class="d">${esc([d.local, d.responsavel||"sem responsável"].filter(Boolean).join(" · "))}</div></div>
      <div class="r">${demStatusPill(d)}<div class="d">${demAtrasada(d) ? `<span class="atras">venceu ${fData(d.prazo)}</span>` : "prazo "+fData(d.prazo)}</div></div></button>`).join("")
    + (doPainel.length>6 ? `<div class="empty"><button class="link" data-go2="demandas">Ver todas as ${doPainel.length}</button></div>`:"")
    : `<div class="empty">${delega ? "Nenhuma demanda em aberto." : "Nenhuma demanda em aberto com você."}${delega ? ` <button class="link" type="button" id="p-dem-nova">Criar uma demanda</button>` : ""}</div>`;
  const n = $("#p-dem-nova"); if (n) n.onclick = () => novaDem();
}

function renderDem(){
  const q = norm($("#dm-busca").value), f = S.dFiltro;
  const sel = $("#dm-resp"), cur = sel.value;
  const pessoas = [...new Map(S.dem.filter(d => d.responsavelUsuario).map(d => [d.responsavelUsuario, d.responsavel])).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1]),"pt-BR"));
  sel.innerHTML = `<option value="">Todos os responsáveis</option><option value="-" ${cur==="-"?"selected":""}>Sem responsável</option>` + pessoas.map(([u,n]) => `<option value="${esc(u)}" ${u===cur?"selected":""}>${esc(n)}</option>`).join("");
  sel.hidden = !(can("dem_ver") || can("dem_delegar"));
  $$("#dm-filtros .chip").forEach(c => { if (c.dataset.f==="minhas") c.hidden = !can("dem_executar"); });
  const resp = sel.hidden ? "" : sel.value;
  const list = S.dem.filter(d => {
    if (f==="aberto" && demEnc(d)) return false;
    if (f==="minhas" && (demEnc(d) || d.responsavelUsuario !== S.usuario)) return false;
    if (f==="ciente" && !demSemCiente(d)) return false;
    if (f==="atrasadas" && !demAtrasada(d)) return false;
    if (f==="concluidas" && d.status!=="Concluída") return false;
    if (f==="canceladas" && d.status!=="Cancelada") return false;
    if (resp==="-" && d.responsavelUsuario) return false;
    if (resp && resp!=="-" && d.responsavelUsuario!==resp) return false;
    if (q && !norm([d.numero,d.titulo,d.local,d.categoria,d.responsavel,d.criadaPor,d.descricao,d.os].join(" ")).includes(q)) return false;
    return true;
  }).sort((x,y) => demEnc(x)||demEnc(y) ? String(y.concluidaEm||y.criadaEm).localeCompare(String(x.concluidaEm||x.criadaEm)) : ordemDem(x,y));
  const vazio = {aberto:"Nenhuma demanda em aberto.", minhas:"Nenhuma demanda em aberto com você.", ciente:"Nenhuma demanda aguardando ciente.", atrasadas:"Nenhuma demanda atrasada.", concluidas:"Nenhuma demanda concluída nos últimos 90 dias.", canceladas:"Nenhuma demanda cancelada nos últimos 90 dias.", todas:"Nenhuma demanda registrada ainda."}[f];
  $("#dm-body").innerHTML = list.length ? list.map(d => `<tr class="click" data-dem="${esc(d.id)}" tabindex="0">
    <td class="mono">${esc(d.numero)}</td>
    <td><b>${esc(d.titulo)}</b><span class="sub">${esc([d.local, d.categoria, d.preventiva ? "preventiva" : "", d.os ? d.os : ""].filter(Boolean).join(" · "))}</span><span class="so-s">${prioPill(d.prioridade)} ${esc(d.responsavel||"")}</span></td>
    <td class="hide-s">${esc(d.responsavel || "—")}</td>
    <td class="hide-s">${prioPill(d.prioridade)}</td>
    <td>${demStatusPill(d)}</td>
    <td class="hide-s num" style="white-space:nowrap">${demEnc(d) ? '<span class="muted">'+fData(d.concluidaEm)+'</span>' : fData(d.prazo)}</td></tr>`).join("")
    : `<tr><td colspan="6"><div class="empty">${q||resp ? "Nenhuma demanda com esses filtros." : vazio}${f==="aberto" && can("dem_delegar") ? ` <button class="link" type="button" id="dm-vazio-nova">Criar uma demanda</button>` : ""}</div></td></tr>`;
  const n = $("#dm-vazio-nova"); if (n) n.onclick = () => novaDem();
  renderPrev();
}
$("#dm-busca").addEventListener("input", renderDem);
$("#dm-resp").addEventListener("change", renderDem);
$$("#dm-filtros .chip").forEach(c => c.addEventListener("click", () => { S.dFiltro = c.dataset.f; syncChips("#dm-filtros","f",S.dFiltro); renderDem(); }));
$("#dm-nova").addEventListener("click", () => novaDem());
$("#dm-body").addEventListener("keydown", e => { if (e.key==="Enter" && e.target.dataset.dem) abrirDem(e.target.dataset.dem); });

const opcoesColab = (sel, vazio) => `<option value="">${esc(vazio)}</option>` + S.colab.map(c => `<option value="${esc(c.usuario)}" ${c.usuario===sel?"selected":""}>${esc(c.nome)}</option>`).join("");
function camposDem(v, comResp){
  const cats = DEM_CATEGORIAS.includes(v.categoria) || !v.categoria ? DEM_CATEGORIAS : [v.categoria, ...DEM_CATEGORIAS];
  return `
      <div class="field full"><label for="dm-titulo">Demanda <span class="req">*</span></label><input class="input" id="dm-titulo" value="${esc(v.titulo||"")}" placeholder="Ex.: Trocar as lâmpadas queimadas do hall do Bloco B" maxlength="120"></div>
      ${comResp ? `<div class="field full"><label for="dm-r">Delegar para</label><select class="input" id="dm-r">${opcoesColab(v.responsavelUsuario||"", "Sem responsável (qualquer um da equipe pode pegar)")}</select></div>` : ""}
      <div class="field"><label for="dm-local">Local</label><input class="input" id="dm-local" value="${esc(v.local||"")}" list="dl-local" placeholder="Ex.: Bloco B, Piscina, Portaria"></div>
      <div class="field"><label for="dm-cat">Categoria</label><select class="input" id="dm-cat"><option value="">Selecione</option>${cats.map(c=>`<option ${c===v.categoria?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
      <div class="field"><label for="dm-prio">Prioridade</label><select class="input" id="dm-prio">${["Urgente","Alta","Normal","Baixa"].map(p=>`<option ${p===(v.prioridade||"Normal")?"selected":""}>${p}</option>`).join("")}</select></div>
      <div class="field"><label for="dm-prazo">Prazo</label><input class="input" type="date" id="dm-prazo" value="${esc(v.prazo || prazoPara(v.prioridade||"Normal"))}"></div>
      <div class="field full"><label for="dm-desc">Detalhes</label><textarea class="input" id="dm-desc" placeholder="O que precisa ser feito, materiais, horário combinado com morador…" maxlength="3000">${esc(v.descricao||"")}</textarea></div>`;
}
function lerCamposDem(msg){
  const v = {titulo:$("#dm-titulo").value.trim(), local:$("#dm-local").value.trim(), categoria:$("#dm-cat").value, prioridade:$("#dm-prio").value, prazo:$("#dm-prazo").value, descricao:$("#dm-desc").value.trim()};
  if (!v.titulo) { msg.className="hint err"; msg.textContent = "Descreva a demanda em poucas palavras."; return null; }
  return v;
}
function preencherLocais(){
  $("#dl-local").innerHTML = [...new Set(S.os.map(o=>o.local).concat(S.dem.map(d=>d.local), S.movs.map(m=>m.destino)).filter(Boolean).map(s=>String(s).trim()))].sort().slice(0,300).map(v=>`<option value="${esc(v)}">`).join("");
}

function novaDem(){
  if (!can("dem_delegar")) return;
  preencherLocais();
  $("#modal-box").innerHTML = `
    <h3>Nova demanda</h3>
    <form class="form" id="f-dm" novalidate autocomplete="off">
      ${camposDem({}, true)}
      <div class="full actions"><button class="btn primary" type="submit" id="dm-ok">Criar demanda</button><button class="btn" type="button" id="dm-no">Cancelar</button><span class="hint" id="dm-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#dm-titulo").focus();
  $("#dm-no").onclick = fecharModal;
  ligarPrazo("#dm-prio", "#dm-prazo");
  $("#f-dm").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#dm-msg"), v = lerCamposDem(msg); if (!v) return;
    if ($("#dm-r").value) v.responsavelUsuario = $("#dm-r").value;
    const r = await enviar($("#dm-ok"), msg, "demCriar", {dem:v});
    if (!r) return;
    fecharModal(); setTab("demandas"); abrirDem(r.demId, {avisar:!!v.responsavelUsuario});
  });
}

function abrirDem(id, opc){
  const d = S.dem.find(x => x.id === id); if (!d) { toast("Esta demanda não está mais na lista. Atualize a página.", true); return; }
  opc = opc || {};
  const dir = demDireitos(d);
  const linhasAnd = String(d.andamento||"").split("\n").filter(Boolean).reverse();
  const os = d.os ? S.os.find(o => o.numero === d.os) : null;
  const pv = d.preventiva ? S.prev.find(p => p.id === d.preventiva) : null;
  const acoes = [];
  if (dir.minha && d.status==="Pendente" && !d.cienteEm) acoes.push(`<button class="btn primary" type="button" data-dop="ciente">Dar ciente</button>`);
  if (d.status==="Pendente" && dir.exec) acoes.push(`<button class="btn ${dir.minha && !d.cienteEm ? "" : "primary"}" type="button" data-dop="iniciar">Iniciar</button>`);
  if (!dir.enc && dir.exec) acoes.push(`<button class="btn ${d.status==="Em andamento"?"primary":""}" type="button" data-dop="concluir">Concluir</button>`);
  const avisar = opc.avisar && dir.del && d.responsavelUsuario && !dir.enc;
  if (!dir.enc && dir.del && d.responsavelUsuario && !avisar) acoes.push(`<button class="btn wa" type="button" data-dop="whats">Avisar no WhatsApp</button>`);
  if (!dir.enc && dir.del) acoes.push(`<button class="btn" type="button" data-dop="atribuir">${d.responsavelUsuario ? "Delegar para outra pessoa" : "Delegar"}</button>`);
  if (!dir.enc && !d.os && can("os_abrir") && (dir.del || dir.minha)) acoes.push(`<button class="btn" type="button" data-dop="os">Abrir OS</button>`);
  if (dir.del) acoes.push(`<button class="btn" type="button" data-dop="editar">Editar</button>`);
  if (dir.del || dir.minha || dir.livre || can("dem_ver")) acoes.push(`<button class="btn" type="button" data-dop="nota">Anotar</button>`);
  if (!dir.enc && dir.del) acoes.push(`<button class="btn danger" type="button" data-dop="cancelar">Cancelar demanda</button>`);
  if (dir.enc && dir.del) acoes.push(`<button class="btn" type="button" data-dop="reabrir">Reabrir</button>`);
  const ciente = d.cienteEm ? fDataHora(d.cienteEm) : d.responsavelUsuario ? `<span class="${demEnc(d)?"":"atras"}">Ainda não</span>` : "—";
  $("#modal-box").innerHTML = `
    <div class="os-top"><span class="mono muted">${esc(d.numero)}</span>${demStatusPill(d)}${prioPill(d.prioridade)}${d.preventiva ? '<span class="pill p-ajuste">Preventiva</span>' : ""}</div>
    <h3 class="os-tit">${esc(d.titulo)}</h3>
    ${avisar ? `<div class="aviso-wa"><span>Avise ${esc(primeiroNome(d.responsavel))} pelo WhatsApp. A mensagem já vai pronta, com o link do sistema.${temFone(d.responsavelUsuario) ? "" : " <b>Sem número cadastrado:</b> você escolhe o contato no WhatsApp."}</span><button class="btn wa" type="button" data-dop="whats">Enviar no WhatsApp</button></div>` : ""}
    <dl class="os-info">
      <div><dt>Responsável</dt><dd>${esc(d.responsavel||"Sem responsável")}</dd></div>
      <div><dt>Ciente</dt><dd>${ciente}</dd></div>
      <div><dt>Prazo</dt><dd class="${demAtrasada(d)?"atras":""}">${fData(d.prazo)}${demAtrasada(d)?" · atrasada":""}</dd></div>
      <div><dt>Local</dt><dd>${esc(d.local||"—")}</dd></div>
      <div><dt>Categoria</dt><dd>${esc(d.categoria||"—")}</dd></div>
      <div><dt>Criada</dt><dd>${fDataHora(d.criadaEm)} por ${esc(d.criadaPor||"—")}</dd></div>
      ${d.preventiva ? `<div><dt>Preventiva</dt><dd>${pv ? `${esc(pv.numero)} · repete ${esc(descRep(pv.intervalo, pv.unidade))}` : "Sim"}</dd></div>` : ""}
      ${d.os ? `<div><dt>OS gerada</dt><dd>${os ? `<button class="link" type="button" data-os="${esc(os.id)}">${esc(d.os)}</button> · ${esc(os.status)}` : esc(d.os)}</dd></div>` : ""}
      ${d.concluidaEm ? `<div><dt>${d.status==="Cancelada"?"Cancelada":"Concluída"}</dt><dd>${fDataHora(d.concluidaEm)}${d.concluidaPor?" por "+esc(d.concluidaPor):""}</dd></div>` : ""}
    </dl>
    ${d.descricao ? `<p class="os-desc">${esc(d.descricao)}</p>` : ""}
    ${d.conclusao ? `<div class="os-sol"><b>O que foi feito</b><p>${esc(d.conclusao)}</p></div>` : ""}
    ${d.motivoCancelamento ? `<div class="os-sol canc"><b>Motivo do cancelamento</b><p>${esc(d.motivoCancelamento)}</p></div>` : ""}
    <div class="os-acoes actions">${acoes.join("")}</div>
    <div id="os-form"></div>
    <section><h4>Andamento</h4><ol class="timeline">${linhasAnd.map(l => { const [q, ...resto] = l.split(" · "); return `<li><span class="when">${esc(q)}</span> ${esc(resto.join(" · "))}</li>`; }).join("")}</ol></section>
    <div class="actions" style="margin-top:6px"><button class="btn" type="button" id="os-fechar">Fechar</button><span class="hint" id="os-msg"></span></div>`;
  $("#modal-box").classList.add("largo");
  $("#modal").hidden = false;
  $("#os-fechar").onclick = fecharModal;
  $("#modal-box").onclick = e => {
    if (e.target.closest("[data-os]")) return;
    const b = e.target.closest("[data-dop]"); if (b) acaoDem(d, b.dataset.dop);
  };
}
function acaoDem(d, op){
  const depois = () => abrirDem(d.id);
  const atualizar = (msg, extra, apos) => enviar($("#os2-ok") || null, msg, "demAtualizar", Object.assign({id:d.id, op}, extra), apos || depois);
  if (op === "ciente" || op === "iniciar") { enviar(null, $("#os-msg"), "demAtualizar", {id:d.id, op}, depois); return; }
  if (op === "whats") { abrirWhats(d.responsavelUsuario, msgWhats("dem", d)); return; }
  if (op === "os") return formOS(`<p class="full" style="margin:0">Abre uma OS com os mesmos dados desta demanda (serviço, local, prioridade e prazo). Os materiais retirados ficam ligados à OS.</p>`, msg => {
      atualizar(msg, {}, () => { const n = (S.dem.find(x => x.id===d.id)||{}).os; const o = n && S.os.find(x => x.numero===n); if (o) abrirOS(o.id); else depois(); });
    }, "Abrir OS");
  if (op === "concluir") return formOS(`<div class="field full"><label for="dm-sol">O que foi feito <span class="req">*</span></label><textarea class="input" id="dm-sol" placeholder="Ex.: troquei 4 lâmpadas; o reator de uma luminária também estava queimado" maxlength="3000"></textarea></div>`, msg => {
      const c = $("#dm-sol").value.trim(); if (!c) { msg.className="hint err"; msg.textContent="Descreva o que foi feito."; return; }
      atualizar(msg, {conclusao:c});
    }, "Concluir demanda");
  if (op === "cancelar") return formOS(`<div class="field full"><label for="dm-mot">Motivo do cancelamento <span class="req">*</span></label><input class="input" id="dm-mot" placeholder="Ex.: criada em duplicidade, não é mais necessária"></div>`, msg => {
      const m = $("#dm-mot").value.trim(); if (!m) { msg.className="hint err"; msg.textContent="Informe o motivo."; return; }
      atualizar(msg, {motivo:m});
    }, "Cancelar demanda");
  if (op === "reabrir") return formOS(`<div class="field full"><label for="dm-mot">Por que reabrir?</label><input class="input" id="dm-mot" placeholder="Ex.: o serviço não ficou bom"></div>`, msg => atualizar(msg, {motivo:$("#dm-mot").value.trim()}), "Reabrir demanda");
  if (op === "nota") return formOS(`<div class="field full"><label for="dm-nota">Anotação <span class="req">*</span></label><textarea class="input" id="dm-nota" placeholder="Ex.: aguardando o morador liberar o acesso" maxlength="1000"></textarea></div>`, msg => {
      const n = $("#dm-nota").value.trim(); if (!n) { msg.className="hint err"; msg.textContent="Escreva a anotação."; return; }
      atualizar(msg, {nota:n});
    }, "Salvar anotação");
  if (op === "atribuir") return formOS(`<div class="field full"><label for="dm-r2">Delegar para</label><select class="input" id="dm-r2">${opcoesColab(d.responsavelUsuario, "Sem responsável")}</select><span class="hint">A pessoa nova precisa dar o ciente de novo.</span></div>`, msg => {
      const u = $("#dm-r2").value;
      atualizar(msg, {responsavelUsuario:u}, () => abrirDem(d.id, {avisar:!!u}));
    }, "Salvar");
  if (op === "editar") { preencherLocais(); formOS(camposDem(d, false), msg => { const v = lerCamposDem(msg); if (v) atualizar(msg, {dem:v}); }, "Salvar alterações"); ligarPrazo("#dm-prio", "#dm-prazo"); }
}

// ---------- preventivas ----------
const FREQS = [["1-semanas","Toda semana"],["15-dias","A cada 15 dias"],["1-meses","Todo mês"],["2-meses","A cada 2 meses"],["3-meses","A cada 3 meses"],["6-meses","A cada 6 meses"],["12-meses","Todo ano"],["outra","Outra frequência"]];
function renderPrev(){
  if (!can("dem_delegar")) return;
  const lista = [...S.prev].sort((a,b) => (/^s/i.test(b.ativa) - /^s/i.test(a.ativa)) || String(a.proxima).localeCompare(String(b.proxima)));
  $("#pv-body").innerHTML = lista.length ? lista.map(p => { const ativa = /^s/i.test(p.ativa); return `<tr class="click ${ativa?"":"inativo"}" data-pv="${esc(p.id)}" tabindex="0">
    <td class="mono">${esc(p.numero)}</td>
    <td><b>${esc(p.titulo)}</b><span class="sub">${esc([p.local, p.categoria, ((S.prest || []).find(x => x.id === p.prestador) || {}).nome].filter(Boolean).join(" · "))}</span></td>
    <td>${esc(descRep(p.intervalo, p.unidade))}</td>
    <td class="hide-s">${esc(p.responsavel || "—")}</td>
    <td class="num" style="white-space:nowrap">${ativa ? fData(p.proxima) : '<span class="pill p-ajuste">Pausada</span>'}</td></tr>`; }).join("")
    : `<tr><td colspan="5"><div class="empty">Nenhuma preventiva cadastrada. Exemplos: testar o gerador toda semana, limpar a caixa d'água a cada 6 meses, revisar extintores todo mês.</div></td></tr>`;
}
$("#pv-body").addEventListener("click", e => { const r = e.target.closest("[data-pv]"); if (r) abrirPrev(r.dataset.pv); });
$("#pv-body").addEventListener("keydown", e => { if (e.key==="Enter" && e.target.dataset.pv) abrirPrev(e.target.dataset.pv); });
$("#pv-nova").addEventListener("click", () => abrirPrev(null));

function abrirPrev(id){
  if (!can("dem_delegar")) return;
  const p = id ? S.prev.find(x => x.id === id) : null;
  const v = p || {titulo:"", local:"", categoria:"", prioridade:"Normal", responsavelUsuario:"", intervalo:1, unidade:"meses", prazoDias:3, proxima:hoje(), descricao:"", ativa:"Sim"};
  const chave = `${Number(v.intervalo)||1}-${v.unidade||"meses"}`;
  const freq = FREQS.some(f => f[0]===chave) ? chave : "outra";
  const cats = DEM_CATEGORIAS.includes(v.categoria) || !v.categoria ? DEM_CATEGORIAS : [v.categoria, ...DEM_CATEGORIAS];
  preencherLocais();
  $("#modal-box").innerHTML = `
    <h3>${p ? "Preventiva " + esc(p.numero) : "Nova preventiva"}</h3>
    <form class="form" id="f-pv" novalidate autocomplete="off">
      <div class="field full"><label for="pv-titulo">Tarefa <span class="req">*</span></label><input class="input" id="pv-titulo" value="${esc(v.titulo)}" placeholder="Ex.: Testar o gerador" maxlength="120"></div>
      <div class="field"><label for="pv-freq">Repete</label><select class="input" id="pv-freq">${FREQS.map(f => `<option value="${f[0]}" ${f[0]===freq?"selected":""}>${f[1]}</option>`).join("")}</select></div>
      <div class="field" id="pv-outra" ${freq==="outra"?"":"hidden"}><label for="pv-n">A cada</label><div class="actions" style="flex-wrap:nowrap"><input class="input num" id="pv-n" inputmode="numeric" value="${esc(v.intervalo)}" style="max-width:5.5rem"><select class="input" id="pv-u">${["dias","semanas","meses"].map(u => `<option ${u===v.unidade?"selected":""}>${u}</option>`).join("")}</select></div></div>
      <div class="field"><label for="pv-prox">${p ? "Próxima data" : "Primeira data"}</label><input class="input" type="date" id="pv-prox" value="${esc(v.proxima || hoje())}"></div>
      <div class="field"><label for="pv-dias">Dias para fazer</label><input class="input num" id="pv-dias" inputmode="numeric" value="${esc(v.prazoDias)}"><span class="hint">O prazo de cada demanda é a data + esses dias.</span></div>
      <div class="field"><label for="pv-r">Responsável</label><select class="input" id="pv-r">${opcoesColab(v.responsavelUsuario, "Sem responsável")}</select></div>
      <div class="field"><label for="pv-prio">Prioridade</label><select class="input" id="pv-prio">${["Urgente","Alta","Normal","Baixa"].map(x=>`<option ${x===(v.prioridade||"Normal")?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label for="pv-local">Local</label><input class="input" id="pv-local" value="${esc(v.local)}" list="dl-local" placeholder="Ex.: Casa de máquinas"></div>
      ${Array.isArray(S.prest) ? `<div class="field"><label for="pv-prest">Prestador de serviço</label><select class="input" id="pv-prest"><option value="">Equipe própria</option>${S.prest.filter(x => prAtivo(x) || x.id === v.prestador).map(x => `<option value="${esc(x.id)}" ${x.id === v.prestador ? "selected" : ""}>${esc(x.nome)}${x.servico ? " · " + esc(x.servico) : ""}</option>`).join("")}</select></div>` : ""}
      <div class="field"><label for="pv-cat">Categoria</label><select class="input" id="pv-cat"><option value="">Selecione</option>${cats.map(c=>`<option ${c===v.categoria?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
      <div class="field full"><label for="pv-desc">Como fazer</label><textarea class="input" id="pv-desc" placeholder="Passo a passo, pontos para conferir, materiais" maxlength="3000">${esc(v.descricao)}</textarea></div>
      <label class="perm full"><input type="checkbox" id="pv-ativa" ${/^s/i.test(v.ativa)?"checked":""}> Ativa: criar as demandas nas datas (desmarque para pausar)</label>
      <div class="full actions"><button class="btn primary" type="submit" id="pv-ok">${p ? "Salvar" : "Criar preventiva"}</button><button class="btn" type="button" id="pv-no">Cancelar</button>
        ${p ? `<button class="btn danger" type="button" id="pv-del" style="margin-left:auto">Excluir</button>` : ""}<span class="hint" id="pv-msg"></span></div>
      <div class="confirm full" id="pv-conf" hidden><span>Excluir a preventiva <b>${esc(p ? p.numero : "")}</b>? As demandas que ela já criou continuam na lista.</span><div class="actions"><button class="btn danger" type="button" id="pv-del-ok">Sim, excluir</button><button class="btn" type="button" id="pv-del-no">Manter</button></div></div>
    </form>`;
  $("#modal").hidden = false; $("#pv-titulo").focus();
  $("#pv-no").onclick = fecharModal;
  $("#pv-freq").onchange = () => { $("#pv-outra").hidden = $("#pv-freq").value !== "outra"; };
  if (p) {
    $("#pv-del").onclick = () => { $("#pv-conf").hidden = false; };
    $("#pv-del-no").onclick = () => { $("#pv-conf").hidden = true; };
    $("#pv-del-ok").onclick = () => enviar($("#pv-del-ok"), $("#pv-msg"), "excluirPreventiva", {id:p.id}, fecharModal);
  }
  $("#f-pv").addEventListener("submit", ev => {
    ev.preventDefault();
    const msg = $("#pv-msg"); msg.className = "hint err";
    const f = $("#pv-freq").value;
    const [n, u] = f === "outra" ? [Math.round(pQtd($("#pv-n").value)), $("#pv-u").value] : [Number(f.split("-")[0]), f.split("-")[1]];
    const nv = {id: p ? p.id : "", titulo:$("#pv-titulo").value.trim(), intervalo:n, unidade:u, proxima:$("#pv-prox").value, prazoDias:$("#pv-dias").value.trim(),
      responsavelUsuario:$("#pv-r").value, prioridade:$("#pv-prio").value, local:$("#pv-local").value.trim(), categoria:$("#pv-cat").value, descricao:$("#pv-desc").value.trim(), ativa:$("#pv-ativa").checked};
    if ($("#pv-prest")) nv.prestador = $("#pv-prest").value;
    if (!nv.titulo) { msg.textContent = "Descreva a tarefa em poucas palavras."; return; }
    if (!(n >= 1 && n <= 365)) { msg.textContent = "Informe de quanto em quanto tempo a tarefa se repete."; return; }
    if (!nv.proxima) { msg.textContent = "Informe a data."; return; }
    enviar($("#pv-ok"), msg, "salvarPreventiva", {prev:nv}, fecharModal);
  });
}

// ---------- dashboard: demandas ----------
function renderDashDem(R){
  const bloco = $("#d-dem-bloco");
  if (!R.demandas) { bloco.hidden = true; return; }
  bloco.hidden = false;
  const noPer = s => { const x = String(s||"").slice(0,10); return x && x >= R.de && x <= R.ate; };
  const criadas = R.demandas.filter(d => noPer(d.criadaEm));
  const concl = R.demandas.filter(d => d.status==="Concluída" && noPer(d.concluidaEm));
  const abertas = R.demandas.filter(d => !demEnc(d));
  const atras = abertas.filter(demAtrasada);
  const semCiente = abertas.filter(demSemCiente);
  const hCiente = criadas.filter(d => d.cienteEm).map(d => (dt(d.cienteEm) - dt(d.criadaEm)) / 36e5).filter(h => h >= 0);
  const mCiente = hCiente.length ? hCiente.reduce((s,h)=>s+h,0) / hCiente.length : null;
  const noPrazo = concl.filter(d => d.prazo && String(d.concluidaEm).slice(0,10) <= d.prazo).length;
  const fH = h => h === null ? "—" : h < 1 ? "menos de 1 h" : h < 48 ? `${fNum(Math.round(h))} h` : `${fNum(Math.round(h/24*10)/10)} dias`;
  const kpi = (lbl, val, sub, cls) => `<div class="kpi static ${cls||""}"><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
  $("#d-dem-kpis").innerHTML = [
    kpi("Demandas criadas", criadas.length, `${criadas.filter(d=>d.preventiva).length} por preventiva`),
    kpi("Demandas concluídas", concl.length, "no período"),
    kpi("Em aberto agora", abertas.length, `${semCiente.length} aguardando ciente`, semCiente.length ? "warn" : ""),
    kpi("Atrasadas agora", atras.length, "prazo vencido e ainda abertas", atras.length?"crit":""),
    kpi("Tempo até o ciente", fH(mCiente), hCiente.length ? `média de ${hCiente.length} demanda${hCiente.length===1?"":"s"}` : "nenhum ciente no período"),
    kpi("Concluídas no prazo", concl.length ? Math.round(noPrazo/concl.length*100)+"%" : "—", concl.length ? `${noPrazo} de ${concl.length}` : "nenhuma concluída no período")
  ].join("");
  const conta = (lista, chave) => { const m = {}; lista.forEach(d => { const k = String(chave(d)||"").trim() || "Sem responsável"; m[k] = m[k] || {v:0}; m[k].v++; }); return m; };
  barras("#d-dem-resp", topN(conta(abertas, d=>d.responsavel), 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["em aberto", String(o.v)]]})), "Nenhuma demanda em aberto.");
  barras("#d-dem-colab", topN(conta(concl, d=>d.concluidaPor||d.responsavel), 10).map(([k,o]) => ({rotulo:k, v:o.v, txt:String(o.v), tip:[["concluídas", String(o.v)]]})), "Nenhuma demanda concluída no período.");
  $("#d-dem-atras").innerHTML = atras.length ? atras.sort(ordemDem).map(d => `<tr class="click" data-dem="${esc(d.id)}"><td class="mono">${esc(d.numero)}</td><td><b>${esc(d.titulo)}</b><span class="sub">${esc(d.local||"")}</span></td><td>${esc(d.responsavel||"—")}</td><td>${d.cienteEm ? fData(d.cienteEm) : d.responsavelUsuario ? '<span class="atras">não</span>' : "—"}</td><td class="n">${Math.max(1, Math.round((new Date(hoje()) - new Date(d.prazo)) / 864e5))} d</td></tr>`).join("")
    : `<tr><td colspan="5"><div class="empty">Nenhuma demanda atrasada.</div></td></tr>`;
}

// ---------- nota fiscal das compras ----------
const chaveNF = () => norm($("#m-forn").value.trim()) + "|" + norm($("#m-nf").value.trim());
const nfAnexoValido = () => !!(S.nfAnexo && S.nfAnexo.ids.length && S.nfAnexo.chave === chaveNF());
const idsNF = v => { const s = String(v||""), l = s.match(/\/d\/([A-Za-z0-9_-]{10,})/g); return l ? l.map(x => x.slice(3)) : s.split(/[\s,]+/).filter(x => /^[A-Za-z0-9_-]{10,}$/.test(x)); };
// Fornecedor e Nota fiscal preenchidos pelo PRÓPRIO SITE a partir de um documento (PDF ou foto da nota).
// Um campo continua "automático" só enquanto tiver exatamente o valor que o site colocou: o que a pessoa digita nunca é
// apagado nem trocado. O automático sai junto com o documento e é trocado quando outro documento é lido.
const nfNum = v => String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
const CAMPOS_AUTO = [["#m-forn", "forn", "fornecedor"], ["#m-nf", "nf", "numero"]];
function limparAutoNF(){
  if (!S.nfAuto) return;
  CAMPOS_AUTO.forEach(([id, k]) => { if (S.nfAuto[k] && $(id).value.trim() === S.nfAuto[k]) $(id).value = ""; });
  S.nfAuto = null;
}
function aplicarAutoNF(dados, origem){
  const ant = S.nfAuto || {}, novo = {origem, forn: "", nf: ""};
  CAMPOS_AUTO.forEach(([id, k, campo]) => {
    const atual = $(id).value.trim(), v = String((dados && dados[campo]) || "").trim();
    if (!atual || (ant[k] && atual === ant[k])) { $(id).value = v; novo[k] = v; }
  });
  S.nfAuto = novo;
}
// o documento lido que está anexado agora (só ele conta para comparar o número)
const docLidoAnexado = () => S.nfLida && S.nfLida.dados && !S.nfLida.lendo && S.nfArq.includes(S.nfLida.arquivo) ? S.nfLida : null;
// número digitado diferente do número do documento anexado (null quando não há o que comparar)
function divergenciaNF(campo){
  const d = docLidoAnexado(), doc = d ? String(d.dados.numero || "").trim() : "";
  if (!doc) return null;
  const v = String(campo ?? $("#m-nf").value).trim();
  return nfNum(v) === nfNum(doc) ? null : {doc, campo: v, foto: !!d.foto};
}
function renderNfAnexo(){
  const lista = $("#m-nf-lista"); if (!lista) return;
  if (S.nfArq.length) {
    const L = S.nfLida;
    lista.innerHTML = S.nfArq.map((f,i) => `<span class="nf-chip">${f.type==="application/pdf" ? "PDF" : "Foto"} · ${esc(f.name.length>28 ? f.name.slice(0,25)+"…" : f.name)} <button type="button" class="link small-link" data-nfx="${i}" aria-label="Tirar ${esc(f.name)}">tirar</button></span>`).join("")
      + (L && L.arquivo && S.nfArq.includes(L.arquivo) ? (L.lendo ? `<span class="nf-chip"><span class="spin" aria-hidden="true"></span> ${L.foto ? `Lendo a foto da nota… <span id="nf-prog">${L.prog||""}</span>` : "Lendo os itens da nota…"}</span>`
        : L.erro ? `<span class="nf-chip">${esc(L.erro)}</span>`
        : `<button type="button" class="btn primary small" id="m-nf-ler">Conferir e registrar ${L.dados.itens.length} ${L.dados.itens.length===1?"item":"itens"} da nota${L.dados.numero ? " " + esc(L.dados.numero) : ""}</button>`
          + ((dv => dv ? `<span class="nf-chip aviso" id="m-nf-div">Atenção: o campo Nota fiscal ${dv.campo ? `diz <b>${esc(dv.campo)}</b>` : "está vazio"}, mas a nota anexada é a <b>${esc(dv.doc)}</b>.</span>` : "")(divergenciaNF()))) : "");
    const b = $("#m-nf-ler"); if (b) b.onclick = () => abrirLote();
  } else if (nfAnexoValido()) {
    const n = S.nfAnexo.ids.length;
    lista.innerHTML = `<span class="nf-chip ok">A nota ${esc($("#m-nf").value.trim())} já anexada (${n} arquivo${n===1?"":"s"}) vai junto neste item <button type="button" class="link small-link" data-nfx="reuso">não usar</button></span>`;
  } else lista.innerHTML = "";
}
$("#m-nf-arq").addEventListener("change", () => {
  const novos = [...$("#m-nf-arq").files].filter(f => /^image\//.test(f.type) || f.type === "application/pdf");
  const grande = novos.find(f => f.type === "application/pdf" && f.size > 7*1024*1024);
  if (grande) toast(`O PDF ${grande.name} passa de 7 MB. Tire uma foto da nota no lugar.`, true);
  // uma nota por lançamento: um PDF sozinho, ou até 4 fotos da mesma nota. Nada é deixado de lado sem aviso.
  const aceitos = novos.filter(f => f !== grande), juntos = S.nfArq.concat(aceitos);
  const nPdf = juntos.filter(f => f.type === "application/pdf").length, nFoto = juntos.length - nPdf;
  const recusa = !aceitos.length ? "" : nPdf > 1 ? (S.nfArq.some(f => f.type === "application/pdf") ? "Já há um PDF anexado. Uma nota por vez: tire o anexo atual antes de anexar outra nota." : "Escolha um PDF só: cada lançamento recebe uma nota.")
    : nPdf && nFoto ? "PDF e fotos não vão juntos: anexe o PDF da nota ou as fotos dela, não os dois."
    : juntos.length > 4 ? "No máximo 4 fotos da mesma nota. Tire alguma antes de anexar outra." : "";
  if (recusa) toast(`${recusa} Nada foi anexado (${aceitos.map(f => f.name).join(", ")}).`, true);
  else S.nfArq = juntos;
  $("#m-nf-arq").value = ""; renderNfAnexo();
  lerNotaSeNovo();
});
// lê o PDF; sem PDF, lê as fotos (todas juntas, como páginas da mesma nota)
function lerNotaSeNovo(){
  const pdf = S.nfArq.find(f => f.type === "application/pdf");
  if (pdf) { if (!S.nfLida || S.nfLida.arquivo !== pdf) lerNotaPDF(pdf); return; }
  const fotos = S.nfArq.filter(f => /^image\//.test(f.type));
  const chave = fotos.map(f => f.name + ":" + f.size).join("|");
  if (fotos.length && (!S.nfLida || S.nfLida.chave !== chave)) lerNotaFoto(fotos, chave);
}
$("#m-nf-lista").addEventListener("click", e => {
  const b = e.target.closest("[data-nfx]"); if (!b) return;
  if (b.dataset.nfx === "reuso") S.nfAnexo = null; else S.nfArq.splice(Number(b.dataset.nfx), 1);
  if (S.nfLida && !S.nfArq.includes(S.nfLida.arquivo)) { S.nfLida = null; limparAutoNF(); }
  renderNfAnexo(); lerNotaSeNovo();
});
["#m-forn","#m-nf"].forEach(sel => $(sel).addEventListener("input", renderNfAnexo));
const lerBase64 = file => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => erro(new Error("ler")); r.readAsDataURL(file); });
async function enviarNF(arquivos, nf, fornecedor, msgEl){
  const ids = [];
  for (let i = 0; i < arquivos.length; i++) {
    const f = arquivos[i];
    msgEl.className = "hint"; msgEl.innerHTML = `<span class="spin" aria-hidden="true"></span> Enviando a nota fiscal${arquivos.length>1 ? ` (${i+1} de ${arquivos.length})` : ""}…`;
    try {
      const pdf = f.type === "application/pdf";
      const b64 = pdf ? await lerBase64(f) : await reduzirFoto(f, 2400, 0.85);
      const r = await api("nfEnviar", {mime: pdf ? "application/pdf" : "image/jpeg", b64, nf, fornecedor});
      ids.push(r.arquivo.id);
    } catch(e){
      msgEl.className = "hint err";
      msgEl.textContent = e && e.message && !["img","ler"].includes(e.message) ? e.message : `Não deu para ler o arquivo ${f.name}. Tente tirar a foto de novo.`;
      return null;
    }
  }
  return ids;
}
// ---------- leitura dos itens da nota (PDF da DANFE) ----------
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let pdfPronto = null;
function carregarPDFjs(){
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfPronto) pdfPronto = new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = PDFJS + "pdf.min.js";
    s.onload = () => { const t0 = Date.now(); (function esperar(){
      if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; ok(window.pdfjsLib); }
      else if (Date.now() - t0 > 8000) { pdfPronto = null; erro(new Error("leitor")); }
      else setTimeout(esperar, 50); })(); };
    s.onerror = () => { pdfPronto = null; erro(new Error("leitor")); };
    document.head.appendChild(s);
  });
  return pdfPronto;
}
async function lerNotaPDF(file){
  S.nfLida = {arquivo:file, lendo:true}; renderNfAnexo();
  let dados = null, erro = "";
  try {
    const lib = await carregarPDFjs();
    const doc = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise;
    const pags = [];
    for (let i = 1; i <= Math.min(doc.numPages, 10); i++) { const p = await doc.getPage(i); pags.push((await p.getTextContent()).items); }
    dados = LeitorNF.lerDanfe(LeitorNF.montarLinhas(pags));
    if (!dados.itens.length) erro = pags.some(p => p.length > 20) ? "Não encontrei a lista de produtos neste PDF. Lance os itens à mão." : "Este PDF é uma imagem, sem texto para ler. Lance os itens à mão.";
  } catch(e){ erro = e && e.message === "leitor" ? "Não deu para carregar o leitor de PDF. Verifique a internet." : "Não consegui ler este PDF. Lance os itens à mão."; }
  if (!S.nfLida || S.nfLida.arquivo !== file) return;
  S.nfLida = {arquivo:file, dados, erro};
  aplicarAutoNF(dados, file); // sem leitura: o automático de um documento anterior sai e os campos ficam para a pessoa
  renderNfAnexo();
  // a conferência abre sozinha, já preenchida
  if (dados && dados.itens.length && $("#modal").hidden && S.tab === "registrar") abrirLote();
}
// ---------- leitura da foto da nota (reconhecimento de texto no próprio navegador) ----------
const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let ocrPronto = null;
function carregarOCR(){
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!ocrPronto) ocrPronto = new Promise((ok, erro) => {
    const s = document.createElement("script"); s.src = TESS;
    s.onload = () => window.Tesseract ? ok(window.Tesseract) : (ocrPronto = null, erro(new Error("leitor")));
    s.onerror = () => { ocrPronto = null; erro(new Error("leitor")); };
    document.head.appendChild(s);
  });
  return ocrPronto;
}
const abrirImagem = file => new Promise((ok, erro) => {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 0); };
  img.onerror = () => { URL.revokeObjectURL(url); erro(new Error("img")); };
  img.src = url;
});
// ângulo da foto torta: o que deixa as linhas de texto mais "nítidas" na projeção horizontal
function anguloDoTexto(cinza, w, h, deLado){
  const k = Math.max(1, Math.round(Math.max(w, h) / 900)), sw = Math.floor(w / k), sh = Math.floor(h / k);
  const p = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) p[y*sw + x] = cinza[(y*k)*w + x*k];
  // tinta = mais escuro que a média da vizinhança (imagem integral)
  const I = new Float64Array((sw+1) * (sh+1));
  for (let y = 0; y < sh; y++) { let lin = 0; for (let x = 0; x < sw; x++) { lin += p[y*sw+x]; I[(y+1)*(sw+1)+x+1] = I[y*(sw+1)+x+1] + lin; } }
  const r = Math.max(4, Math.round(sw / 60)), xs = [], ys = [];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const x0 = Math.max(0, x-r), x1 = Math.min(sw, x+r+1), y0 = Math.max(0, y-r), y1 = Math.min(sh, y+r+1);
    const m = (I[y1*(sw+1)+x1] - I[y0*(sw+1)+x1] - I[y1*(sw+1)+x0] + I[y0*(sw+1)+x0]) / ((x1-x0)*(y1-y0));
    if (p[y*sw+x] < m - 12) { if (deLado) { xs.push(y - sh/2); ys.push(x - sw/2); } else { xs.push(x - sw/2); ys.push(y - sh/2); } }
  }
  if (xs.length < 200) return {a:0, nota:0};
  const D = Math.ceil(Math.hypot(sw, sh)) + 2;
  let melhor = 0, nota = -1;
  for (let g = -6; g <= 6.001; g += 0.25) {
    const a = g * Math.PI / 180, sn = Math.sin(a), cs = Math.cos(a), hist = new Float32Array(D);
    for (let i = 0; i < xs.length; i++) hist[Math.round(xs[i]*sn + ys[i]*cs + D/2)]++;
    let v = 0; for (let i = 1; i < D; i++) { const d = hist[i] - hist[i-1]; v += d*d; }
    if (v > nota) { nota = v; melhor = a; }
  }
  return {a:melhor, nota};
}
// prepara a foto: até 3000 px, tons de cinza, endireitada (e girada 90° quando pedido)
async function prepararFoto(file, giro){
  const img = await abrirImagem(file);
  // até 3000 px; foto pequena (ex.: reenviada pelo WhatsApp) é ampliada para as letras ficarem legíveis
  const s = Math.min(3, 3000 / Math.max(img.naturalWidth, img.naturalHeight));
  let w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(img, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), px = d.data, cinza = new Uint8ClampedArray(w*h);
  for (let i = 0, j = 0; j < cinza.length; i += 4, j++) { const g = (px[i]*299 + px[i+1]*587 + px[i+2]*114) / 1000; cinza[j] = g; px[i] = px[i+1] = px[i+2] = g; }
  x.putImageData(d, 0, 0);
  let base = c, cg = cinza;
  if (giro) {
    const r = document.createElement("canvas"); r.width = h; r.height = w;
    const rx = r.getContext("2d", {willReadFrequently: true});
    rx.translate(h/2, w/2); rx.rotate(giro * Math.PI / 180); rx.drawImage(c, -w/2, -h/2);
    base = r; [w, h] = [h, w];
    const rd = rx.getImageData(0, 0, w, h).data; cg = new Uint8ClampedArray(w*h);
    for (let i = 0, j = 0; j < cg.length; i += 4, j++) cg[j] = rd[i];
  }
  const {a, nota} = anguloDoTexto(cg, w, h);
  // linhas de texto mais marcadas na vertical = nota fotografada deitada
  const deitada = !giro && nota > 0 && anguloDoTexto(cg, w, h, true).nota > nota * 1.3;
  if (deitada || Math.abs(a) < 0.002) return {canvas:base, deitada};
  const o = document.createElement("canvas"); o.width = w; o.height = h;
  const ox = o.getContext("2d"); ox.fillStyle = "#fff"; ox.fillRect(0, 0, w, h);
  ox.translate(w/2, h/2); ox.rotate(a); ox.drawImage(base, -w/2, -h/2);
  return {canvas:o, deitada:false};
}
// linhas do resultado do OCR, com a posição de cada uma
function linhasDoOCR(data){
  if (data && Array.isArray(data.lines) && data.lines.length) return data.lines.map(l => ({text: l.text || "", bbox: l.bbox}));
  const out = [];
  ((data && data.blocks) || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => out.push({text: l.text || "", bbox: l.bbox}))));
  return out.filter(l => l.bbox);
}
function recorte(canvas, x0, y0, x1, y1, esc){
  x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
  x1 = Math.min(canvas.width, Math.round(x1)); y1 = Math.min(canvas.height, Math.round(y1));
  const e = esc || 1, c = document.createElement("canvas");
  c.width = Math.max(1, Math.round((x1 - x0) * e)); c.height = Math.max(1, Math.round((y1 - y0) * e));
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = "high";
  x.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
  return {canvas:c, x0, y0, e};
}
// segunda leitura, quando a página inteira não fechou: nota amassada ou curva embaralha as linhas.
// Lê a faixa da esquerda (código e descrição) e depois cada linha de produto sozinha, até a conta fechar.
async function lerLinhasDaFoto(canvas, linhas, rec, prog){
  const W = canvas.width, H = canvas.height, reg = LeitorNF.regiaoProdutos(linhas, H);
  const longas = linhas.filter(l => l.text.trim().length >= 10);
  const xs0 = longas.map(l => l.bbox.x0).sort((a, b) => a - b), xs1 = longas.map(l => l.bbox.x1).sort((a, b) => a - b);
  const px0 = xs0.length ? xs0[Math.floor(xs0.length * 0.05)] : 0, px1 = xs1.length ? xs1[Math.floor(xs1.length * 0.95)] : W, pw = Math.max(W * 0.5, px1 - px0);
  prog("lendo a lista de produtos");
  const fA = recorte(canvas, px0, reg.y0, px0 + pw * 0.55, reg.y1);
  const A = (await rec(fA.canvas, "6")).linhas.map(l => ({text: l.text, bbox: {x0: l.bbox.x0 + fA.x0, x1: l.bbox.x1 + fA.x0, y0: l.bbox.y0 + fA.y0, y1: l.bbox.y1 + fA.y0}}));
  const filas = [];
  A.forEach(l => { const d = LeitorNF.descricaoDaLinha(l.text); if (d && !filas.some(f => Math.abs(f.l.bbox.y0 - l.bbox.y0) < (l.bbox.y1 - l.bbox.y0) * 0.5)) filas.push({l, d}); });
  const itens = [];
  for (let i = 0; i < filas.length; i++) {
    const {l, d} = filas[i], y0 = l.bbox.y0, y1 = l.bbox.y1, h = Math.max(12, y1 - y0);
    prog(`conferindo produto ${i + 1} de ${filas.length}`);
    let melhor = null;
    const considera = n => { if (n && (!melhor || n.p < melhor.p)) melhor = n; };
    considera(LeitorNF.numerosDaLinha(l.text));
    linhas.forEach(o => { const c = (o.bbox.y0 + o.bbox.y1) / 2; if (c > y0 - h * 0.6 && c < y1 + h * 0.6) considera(LeitorNF.numerosDaLinha(o.text)); });
    for (const [a, b, e] of [[0.45, 0.82, 1], [0.50, 0.80, 1], [0.45, 0.82, 1.6], [0.50, 0.80, 1.6]]) {
      if (melhor && melhor.p <= 1) break;
      const r = recorte(canvas, px0 + pw * a, y0 - h / 2, px0 + pw * b, y1 + h / 2, e);
      considera(LeitorNF.numerosDaLinha((await rec(r.canvas, "7")).text));
    }
    itens.push(Object.assign({codigo: d.codigo, descricao: d.descricao, unidade: d.unidade || (melhor && melhor.unidade) || "UN"},
      melhor ? {qtd: melhor.qtd, valorUnit: melhor.valorUnit, valorTotal: melhor.valorTotal, incerto: melhor.p > 1} : {qtd: 1, valorUnit: 0, valorTotal: 0, incerto: true}));
  }
  return itens;
}
async function lerNotaFoto(fotos, chave){
  S.nfLida = {arquivo:fotos[0], chave, foto:true, lendo:true, prog:""}; renderNfAnexo();
  const vivo = () => S.nfLida && S.nfLida.chave === chave;
  const prog = t => { if (!vivo()) return; S.nfLida.prog = t; const el = $("#nf-prog"); if (el) el.textContent = t; };
  let dados = null, erro = "", worker = null;
  try {
    prog("preparando");
    const T = await carregarOCR();
    let etapa = 0, total = fotos.length;
    worker = await T.createWorker("por", 1, { logger: m => {
      if (m.status === "recognizing text" && etapa < total && !/^(lendo|conferindo)/.test(S.nfLida && S.nfLida.prog || "")) prog(Math.round(((etapa + (m.progress||0)) / total) * 100) + "%");
      else if (/load|initializ/i.test(m.status || "") && etapa === 0) prog("abrindo o leitor");
    }});
    await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
    let psmAtual = "6";
    const rec = async (canvas, psm) => {
      if (psm !== psmAtual) { await worker.setParameters({ tessedit_pageseg_mode: psm }); psmAtual = psm; }
      const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
      return { text: data.text || "", linhas: linhasDoOCR(data) };
    };
    const temItens = t => LeitorNF.lerFotoDanfe(t.split("\n")).itens.length > 0;
    const somaItens = l => l.reduce((t, it) => t + (Number(it.valorTotal) || 0), 0);
    const textos = [], itens = [];
    for (const f of fotos) {
      if (!vivo()) return;
      let r = await prepararFoto(f, 0), p1;
      if (!r.deitada) p1 = await rec(r.canvas, "6");
      else {
        // nota fotografada deitada: gira para um lado e, se não sair nada, para o outro
        r = await prepararFoto(f, 90); p1 = await rec(r.canvas, "6");
        if (!temItens(p1.text)) { const r2 = await prepararFoto(f, -90), p2 = await rec(r2.canvas, "6"); if (temItens(p2.text)) { r = r2; p1 = p2; } }
      }
      textos.push(p1.text); etapa++;
      const d1 = LeitorNF.lerFotoDanfe(p1.text.split("\n"));
      const fecha = d1.itens.length && d1.valorTotal != null && Math.abs(somaItens(d1.itens) - d1.valorTotal) <= 0.05 && !d1.itens.some(it => it.incerto);
      if (fecha || !p1.linhas.length || !vivo()) { itens.push(...d1.itens); continue; }
      const d2 = await lerLinhasDaFoto(r.canvas, p1.linhas, rec, prog); prog("");
      // a segunda leitura manda; o que só a primeira achou entra junto
      const fechou2 = d1.valorTotal != null && Math.abs(somaItens(d2) - d1.valorTotal) <= 0.05;
      const sobra = fechou2 ? [] : d1.itens.filter(a => !d2.some(b => (a.codigo && a.codigo === b.codigo) || LeitorNF.parecido(a.descricao, b.descricao) >= 0.5
        || (Math.abs(a.valorTotal - b.valorTotal) < 0.01 && a.qtd === b.qtd && LeitorNF.parecido(a.descricao, b.descricao) >= 0.2)));
      itens.push(...d2, ...(d2.length ? sobra : d1.itens));
    }
    dados = LeitorNF.lerFotoDanfe(textos.join("\n\n").split("\n"));
    dados.itens = itens;
    if (!dados.itens.length) erro = "Não consegui ler os itens nesta foto. Tire outra mais de perto, com a nota reta e bem iluminada, ou lance os itens à mão.";
  } catch(e){
    erro = e && e.message === "leitor" ? "Não deu para carregar o leitor de fotos. Verifique a internet." : e && e.message === "img" ? "Não consegui abrir esta foto. Tente tirar de novo." : "Não consegui ler esta foto. Lance os itens à mão.";
  } finally { if (worker) try { await worker.terminate(); } catch(e){} }
  if (!vivo()) return;
  S.nfLida = {arquivo:fotos[0], chave, foto:true, dados, erro};
  aplicarAutoNF(dados, chave);
  renderNfAnexo();
  if (dados && dados.itens.length && $("#modal").hidden && S.tab === "registrar") abrirLote();
}
// ---------- memória das escolhas da nota (só neste navegador) ----------
// "nf-mapa" é a memória antiga: nunca é apagada sozinha e agora só serve de dica (nunca pré-seleciona).
// "nf-mapa-v2" guarda também quem escolheu (pessoa ou automático), quando e a medida do material na época.
const MEM_ANTIGA = "nf-mapa", MEM_NOVA = "nf-mapa-v2", MEM_LIMITE = 2000;
const memNF = {
  ler(k){ try { const m = JSON.parse(localStorage.getItem(k) || "{}"); return m && typeof m === "object" && !Array.isArray(m) ? m : {}; } catch(e){ return {}; } },
  antiga(){ return memNF.ler(MEM_ANTIGA); },
  nova(){ const m = memNF.ler(MEM_NOVA); Object.keys(m).forEach(k => { if (!m[k] || typeof m[k] !== "object" || !m[k].itemId) delete m[k]; }); return m; },
  gravar(m){
    const ch = Object.keys(m);
    if (ch.length > MEM_LIMITE) ch.sort((a, b) => ((m[a].vezes||0) - (m[b].vezes||0)) || String(m[a].quando||"").localeCompare(String(m[b].quando||""))).slice(0, ch.length - MEM_LIMITE).forEach(k => delete m[k]);
    try { localStorage.setItem(MEM_NOVA, JSON.stringify(m)); } catch(e){}
  },
  esquecer(chave){ const m = memNF.nova(); delete m[chave]; memNF.gravar(m); },
  esquecerTodas(antigaTambem){ try { localStorage.removeItem(MEM_NOVA); if (antigaTambem) localStorage.removeItem(MEM_ANTIGA); } catch(e){} }
};
const chaveProduto = (forn, it) => norm(forn).replace(/[^a-z0-9]/g,"") + "|" + (it.codigo && it.codigo.length >= 6 ? it.codigo : norm(it.descricao));
const fValorNF = v => { let t = (Number(v)||0).toFixed(4).replace(/0{1,2}$/, ""); return t.replace(".", ","); };
const seloLote = st => ({
  lembrado:'<span class="pill s-ok selo">Escolhido antes</span>',
  ok:'<span class="pill s-ok selo">Já cadastrado</span>',
  manual:'<span class="pill s-ok selo">Escolhido</span>',
  confira:'<span class="pill s-baixo selo">Confira o item</span>',
  medida:'<span class="pill s-zero selo">Medida diferente</span>',
  novo:'<span class="pill st-aberta selo">Item novo · será cadastrado</span>',
  escolha:'<span class="pill s-zero selo">Escolha o item</span>',
  feito:'<span class="pill s-ok selo">Registrado</span>'}[st] || "");
// etiquetas das características (24 mm, 12 W…); as secundárias (comprimento do rolo, tensão) ficam mais claras
const carTags = lista => (lista && lista.length) ? `<span class="car-lista">${lista.map(f => `<span class="car${f.principal ? "" : " sec"}">${esc(f.rotulo)}</span>`).join("")}</span>` : "";
const nfNorm = v => String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
const fornCurto = s => norm(s).replace(/[^a-z0-9]/g, "").slice(0, 12);
const mesMais = (ym, k) => { let [y, m] = ym.split("-").map(Number); m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + "-" + String(m).padStart(2, "0"); };
// para um item novo, copia categoria, tipo e local do item mais parecido (ou do local mais comum)
function dadosDeItemNovo(desc){
  const todos = itensArr(), sug = LeitorNF.sugerir(desc, todos, 1)[0];
  const conta = {}; todos.forEach(i => { if (i.local) conta[i.local] = (conta[i.local]||0) + 1; });
  const localComum = Object.keys(conta).sort((a,b) => conta[b] - conta[a])[0] || "";
  return sug && sug.nota >= 0.2 ? {categoria: sug.it.categoria || "", tipoItem: sug.it.tipoItem || "Consumível", local: sug.it.local || localComum} : {categoria:"", tipoItem:"Consumível", local: localComum};
}
const nomeDeNota = d => { const s = String(d||"").toLowerCase().replace(/\s+/g," ").trim(); return s.charAt(0).toUpperCase() + s.slice(1); };

// ---------- conferência da nota ----------
// Cada linha passa pela memória e pela comparação de características (LeitorNF.classificar).
// Nada com dúvida entra sem uma escolha: "Confira" não vem pré-selecionado, medida diferente pede confirmação,
// duas linhas no mesmo material pedem confirmação e nota já lançada fica bloqueada até a confirmação com motivo.
function abrirLote(){
  const L = S.nfLida; if (!L || !L.dados) return;
  const N = L.dados, todos = itensArr(), podeNovo = can("itens_cadastrar");
  const mem2 = memNF.nova(), mem1 = memNF.antiga();
  const forn0 = $("#m-forn").value.trim() || N.fornecedor, nf0 = $("#m-nf").value.trim() || N.numero;
  // número e fornecedor do DOCUMENTO: o que a pessoa digitou vale, mas a diferença aparece e precisa ser resolvida
  const docNF = String(N.numero || "").trim(), docForn = String(N.fornecedor || "").trim();
  const div = {conf: false, par: ""};
  const linhas = N.itens.map((it, i) => {
    const chave = chaveProduto(forn0, it);
    const c = LeitorNF.classificar(it, todos, {podeNovo, memoria: mem2[chave] || null, antiga: typeof mem1[chave] === "string" ? mem1[chave] : ""});
    return {i, it, chave, c, st0: c.status, sel: c.sel, selInicial: c.sel, mexeu: false, usar: true, feito: false, confConflito: false, mesmo: false, jaLancada: null, cmp: null};
  });
  const rep = {estado: "", chave: "", movs: [], outroForn: [], erro: "", conf: {ok: false, num: "", mot: ""}};
  const proprias = {}; // entradas gravadas por esta conferência (depois de uma falha no meio, não contam como repetição)
  const assinaturaMov = m => [m.itemId, nfNorm(m.nf), String(m.data || "").slice(0, 10), Number(m.qtd), String(m.obs || "")].join("|");
  let revisando = false, enviando = false;

  const itemDe = id => S.itens.get(id) || todos.find(x => x.id === id) || null;
  const comparar = l => {
    if (!l.sel || l.sel === "__novo") return null;
    if (l.cmp && l.cmp.sel === l.sel) return l.cmp.r;
    const it = itemDe(l.sel); if (!it) return null;
    const ci = LeitorNF.caracteristicas(it.nome), sm = LeitorNF.semelhanca(l.c.caracteristicas.resto, ci.resto);
    l.cmp = {sel: l.sel, r: Object.assign({ci, numDif: sm.numDif, numNota: sm.numNota, numItem: sm.numItem}, LeitorNF.compararCaracteristicas(l.c.caracteristicas, ci))};
    return l.cmp.r;
  };
  const conflitoDe = l => { const r = comparar(l); return !!(r && r.resultado === "conflito"); };
  const estadoLinha = l => {
    if (l.feito) return "feito";
    if (!l.sel) return l.st0 === "confira" ? "confira" : "escolha";
    if (l.sel === "__novo") return "novo";
    if (conflitoDe(l)) return "medida";
    if (!l.mexeu && l.sel === l.selInicial) return l.st0;
    return "manual";
  };
  const vivas = () => linhas.filter(l => l.usar && !l.feito);
  // linhas marcadas que apontam para o mesmo material (a primeira de cada grupo não precisa confirmar)
  const duplicadas = () => {
    const g = {}; vivas().forEach(l => { if (l.sel && l.sel !== "__novo") (g[l.sel] = g[l.sel] || []).push(l); });
    const out = new Map(); Object.values(g).filter(x => x.length > 1).forEach(x => x.forEach((l, k) => out.set(l, {outras: x.filter(o => o !== l).map(o => o.i + 1), primeira: k === 0})));
    return out;
  };
  const rotCand = x => x.car === "conflito" ? " — medida diferente" : x.car === "incompleto" ? " — confira a medida" : x.numDif ? " — confira o número" : x.car === "compativel" ? " — mesma medida" : "";
  const difsTexto = difs => difs.map(d => d.falta
    ? (d.nota.length ? `a nota diz <b>${esc(d.nota.join(", "))}</b> e o nome do material não tem essa medida` : `o material tem <b>${esc(d.item.join(", "))}</b> e a nota não diz a medida`)
    : `<b>${esc(d.nota.join(", "))}</b> na nota, <b>${esc(d.item.join(", "))}</b> no estoque`).join("; ");
  const memoHTML = m => !m ? "" : m.tipo === "lembrado"
    ? `<p class="lote-memo">Escolhido antes${m.quando ? " em " + esc(fData(m.quando)) : ""} neste computador. <button type="button" class="link small-link" data-k="esquecer">Esquecer esta escolha</button></p>`
    : m.tipo === "dica" ? `<p class="lote-memo">${m.antiga ? "Escolha antiga deste computador" : "Sugestão de uma nota anterior"} no topo da lista: confira antes de usar.</p>`
    : `<p class="lote-memo aviso">Escolha anterior ignorada: ${esc(m.motivo)}.</p>`;

  function htmlLinha(l){
    const it = l.it, i = l.i, c = l.c;
    const sugIds = new Set(c.candidatos.map(x => x.it.id));
    const opt = (i2, rot) => `<option value="${esc(i2.id)}" ${i2.id===l.sel?"selected":""}>${esc((i2.codigo?i2.codigo+" · ":"") + i2.nome)} (${fNum(i2.qtd)} ${esc(i2.unidade||"")})${rot||""}</option>`;
    const st = estadoLinha(l);
    return `<div class="lote-item st-${st}${l.usar ? "" : " off"}${l.feito ? " feito" : ""}" data-i="${i}">
      <label class="lote-top"><input type="checkbox" data-k="usar" ${l.usar ? "checked" : ""} ${l.feito ? "disabled" : ""}> <span><span class="lote-n">${i+1}</span><b>${esc(it.descricao)}</b> <span class="selo-box">${seloLote(st)}</span>${it.incerto ? '<span class="pill s-baixo">Confira qtd e valor</span>' : ""}<span class="sub">${it.codigo ? "cód. " + esc(it.codigo) + " · " : ""}${fNum(it.qtd)} ${esc(it.unidade)} × ${fBRL(it.valorUnit)} = ${fBRL(it.valorTotal)}</span>${carTags(c.caracteristicas.lista)}</span></label>
      ${memoHTML(c.memoria)}
      <div class="lote-campos">
        <div class="field"><label for="lt-it-${i}">Item do estoque</label><select class="input" id="lt-it-${i}" data-k="item" ${l.feito ? "disabled" : ""}>
          <option value="" ${l.sel===""?"selected":""}>Escolha o item do estoque…</option>
          ${c.candidatos.length ? `<optgroup label="Mais parecidos">${c.candidatos.map(x => opt(x.it, rotCand(x))).join("")}</optgroup>` : ""}
          ${podeNovo ? `<option value="__novo" ${l.sel==="__novo"?"selected":""}>+ Cadastrar como item novo: ${esc(nomeDeNota(it.descricao))}</option>` : ""}
          <optgroup label="Todos os itens">${todos.filter(x => !sugIds.has(x.id)).map(x => opt(x)).join("")}</optgroup>
        </select></div>
        <div class="field lote-nome" ${l.sel==="__novo" ? "" : "hidden"}><label for="lt-n-${i}">Nome do item novo</label><input class="input" id="lt-n-${i}" data-k="nome" value="${esc(nomeDeNota(it.descricao))}"></div>
        <div class="field"><label for="lt-q-${i}">Quantidade</label><input class="input num" id="lt-q-${i}" data-k="qtd" inputmode="decimal" value="${esc(String(Math.round(it.qtd*1000)/1000).replace(".", ","))}"></div>
        <div class="field"><label for="lt-v-${i}">Valor unitário (R$)</label><input class="input num" id="lt-v-${i}" data-k="valor" inputmode="decimal" value="${esc(fValorNF(it.valorUnit))}"></div>
      </div>
      <div class="lote-alerta" data-k="alerta"></div>
      <span class="hint lote-st"></span>
    </div>`;
  }
  // a parte da linha que muda com as escolhas: material no estoque, medida diferente, mesmo material, já lançada
  function alertaLinha(l, dup){
    const partes = [];
    if (l.jaLancada && !l.feito) partes.push(`<div class="lote-aviso crit">Esta linha já foi lançada em ${esc(fData(l.jaLancada.data))} por ${esc(l.jaLancada.registradoPor || "—")} (+${fNum(l.jaLancada.qtd)} ${esc(l.jaLancada.unidade || "")}). Por isso ela veio desmarcada.</div>`);
    const r = comparar(l), it = l.sel && l.sel !== "__novo" ? itemDe(l.sel) : null;
    if (it && !l.feito) {
      partes.push(`<p class="lote-estoque">No estoque: <b>${esc(it.nome)}</b> ${carTags(r ? r.ci.lista : [])}<span class="muted"> · ${fNum(it.qtd)} ${esc(it.unidade || "")} agora</span></p>`);
      if (r && r.resultado === "conflito") partes.push(`<div class="lote-aviso crit"><b>Medida diferente:</b> ${difsTexto(r.difs.filter(d => !d.falta))}. Escolha outro material ou confirme. <label class="lote-conf"><input type="checkbox" data-k="confConflito" ${l.confConflito ? "checked" : ""}> Confirmo: o material é este mesmo</label></div>`);
      else if (r && r.resultado === "incompleto") partes.push(`<div class="lote-aviso warn">Confira a medida: ${difsTexto(r.difs)}.</div>`);
      if (r && r.resultado !== "conflito" && r.numDif) partes.push(`<div class="lote-aviso warn">Confira a especificação: a nota tem <b>${esc(r.numNota.join(", "))}</b> e o material tem <b>${esc(r.numItem.join(", "))}</b> (grão, modelo ou referência).</div>`);
    }
    if (dup && !l.feito) partes.push(`<div class="lote-aviso warn">A linha ${dup.outras.join(" e ")} desta nota também está neste material.${dup.primeira ? "" : ` Troque o material ou confirme. <label class="lote-conf"><input type="checkbox" data-k="mesmo" ${l.mesmo ? "checked" : ""}> São o mesmo material</label>`}</div>`);
    return partes.join("");
  }
  const repConfirmada = () => rep.conf.ok && nfNorm(rep.conf.num) === nfNorm($("#lt-nf").value) && rep.conf.mot.trim().length >= 10;
  // número da conferência diferente do número lido no documento: só passa usando o do documento ou confirmando o digitado
  const divNF = () => { const v = $("#lt-nf").value.trim(); return docNF && nfNorm(v) && nfNorm(v) !== nfNorm(docNF) ? {par: nfNorm(v) + "|" + nfNorm(docNF), v} : null; };
  const divResolvida = () => { const d = divNF(); return !d || (div.conf && div.par === d.par); };
  const divForn = () => { const v = $("#lt-forn").value.trim(); return docForn && v && fornCurto(v) !== fornCurto(docForn) ? v : ""; };
  function renderDiv(){
    const box = $("#lt-div"); if (!box) return;
    const d = divNF(), f = divForn();
    if (d && div.par !== d.par) div.conf = false;
    const html = (d ? `<div class="notice crit lote-div"><b>Número diferente do documento:</b> a conferência está com a nota <b>${esc(d.v)}</b>, mas o documento anexado é a nota <b>${esc(docNF)}</b>.
        ${N.foto ? "O número foi lido da foto e pode ter saído errado. " : ""}O que for finalizado entra com o número do campo “Nota fiscal”.
        <div class="actions"><button type="button" class="btn small" id="lt-div-usar">Usar ${esc(docNF)} (do documento)</button></div>
        <label class="lote-conf"><input type="checkbox" id="lt-div-ok" ${div.conf ? "checked" : ""}> Confirmo: o número correto é ${esc(d.v)}</label></div>` : "")
      + (f ? `<div class="notice warn lote-div">O fornecedor do campo (<b>${esc(f)}</b>) é diferente do que foi lido no documento (<b>${esc(docForn)}</b>). <button type="button" class="link small-link" id="lt-forn-usar">Usar o do documento</button></div>` : "");
    if (box.dataset.html === html) return;
    box.innerHTML = html; box.dataset.html = html;
    const u = $("#lt-div-usar"); if (u) u.onclick = () => { $("#lt-nf").value = docNF; div.conf = false; conferirRepeticao(); sairDaRevisao(); atualizarTudo(); };
    const c = $("#lt-div-ok"); if (c) c.onchange = () => { const d2 = divNF(); div.conf = c.checked && !!d2; div.par = d2 ? d2.par : ""; sairDaRevisao(); atualizarTudo(); };
    const fu = $("#lt-forn-usar"); if (fu) fu.onclick = () => { $("#lt-forn").value = docForn; conferirRepeticao(); sairDaRevisao(); atualizarTudo(); };
  }
  function pendencias(dups){
    const out = [];
    if (!nfNorm($("#lt-nf").value)) out.push("Informe o número da nota fiscal.");
    if (!divResolvida()) out.push(`O número da nota (${$("#lt-nf").value.trim()}) é diferente do documento anexado (${docNF}): use o do documento ou confirme o número digitado.`);
    if (rep.estado === "conferindo") out.push("Aguarde: conferindo se a nota já foi lançada…");
    if ((rep.estado === "repetida" || rep.estado === "falhou") && !repConfirmada()) out.push(rep.estado === "repetida" ? "Esta nota já foi lançada: confirme a nova entrega ou feche sem lançar." : "Não foi possível conferir se a nota já foi lançada: tente de novo ou confirme.");
    const v = vivas();
    if (!v.length) out.push("Nenhuma linha marcada.");
    v.forEach(l => {
      const el = linhaEl(l), n = l.i + 1;
      if (!l.sel) out.push(`Linha ${n}: escolha o material do estoque.`);
      else if (conflitoDe(l) && !l.confConflito) out.push(`Linha ${n}: medida diferente — escolha outro material ou confirme.`);
      const d = dups.get(l); if (d && !d.primeira && !l.mesmo) out.push(`Linha ${n}: mesmo material da linha ${d.outras.join(" e ")} — troque ou confirme.`);
      if (!(pQtd($("[data-k=qtd]", el).value) > 0)) out.push(`Linha ${n}: quantidade inválida.`);
      const vv = $("[data-k=valor]", el).value.trim(); if (vv && !Number.isFinite(pQtd(vv))) out.push(`Linha ${n}: valor inválido.`);
    });
    return out;
  }
  const linhaEl = l => $(`#f-lote .lote-item[data-i="${l.i}"]`);

  const soma = N.itens.reduce((t, it) => t + (Number(it.valorTotal)||0), 0);
  $("#modal-box").innerHTML = `
    <h3 id="lt-tit">Conferir a nota${nf0 ? " " + esc(nf0) : ""}</h3>
    <p class="muted" id="lt-sub" style="margin:-6px 0 10px">${esc([forn0, N.data ? "emitida em " + fData(N.data) : "", N.valorTotal != null ? "total " + fBRL(N.valorTotal) : ""].filter(Boolean).join(" · "))}.</p>
    <p class="lote-resumo" id="lt-resumo"></p>
    ${N.foto ? `<div class="notice">Estes itens foram lidos da <b>foto</b> da nota. Confira nomes, quantidades e valores com a nota antes de finalizar.${N.valorTotal != null && Math.abs(soma - N.valorTotal) > 0.05 ? " A soma dos itens não bate com o total da nota: pode ter faltado algum item." : ""}</div>` : ""}
    <div id="lt-rep"></div>
    <div id="lt-div"></div>
    <form class="form" id="f-lote" novalidate autocomplete="off">
      <div class="field"><label for="lt-forn">Fornecedor</label><input class="input" id="lt-forn" value="${esc(forn0)}" list="dl-forn"></div>
      <div class="field"><label for="lt-nf">Nota fiscal</label><input class="input" id="lt-nf" value="${esc(nf0)}" inputmode="numeric"></div>
      <div class="field"><label for="lt-data">Data da entrada</label><input class="input" type="date" id="lt-data" value="${esc(N.data || $("#m-data").value || hoje())}"></div>
      <div class="field"><label for="lt-rec">Quem recebeu</label><input class="input" id="lt-rec" value="${esc($("#m-recebeu").value.trim() || S.nome)}" list="dl-resp"></div>
      <div class="full lote">${linhas.map(htmlLinha).join("")}</div>
      <p class="hint full">${N.itens.length===1 ? "1 item lido" : N.itens.length + " itens lidos"}, somando ${fBRL(soma)}${N.valorTotal != null && Math.abs(soma - N.valorTotal) > 0.05 ? ` · o total da nota é ${fBRL(N.valorTotal)} (pode haver frete ou desconto)` : ""}. A nota fica anexada em cada entrada.</p>
      <div class="full lote-rev" id="lt-rev" hidden></div>
      <ul class="full lote-pend" id="lt-pend" hidden></ul>
      <div class="full actions"><button class="btn primary" type="submit" id="lt-ok">Finalizar</button><button class="btn" type="button" id="lt-voltar" hidden>Voltar e corrigir</button><button class="btn" type="button" id="lt-no">Cancelar</button><span class="hint" id="lt-msg"></span></div>
    </form>`;
  $("#modal-box").classList.add("largo");
  $("#modal").hidden = false;
  const form = $("#f-lote");
  $("#lt-no").onclick = fecharModal;

  // ----- nota já lançada? procura nos meses desde a emissão (até 6) sem mudar o que a tela mostra -----
  function mesesRep(){
    const atual = mesDe(), entrada = mesDe($("#lt-data").value || hoje());
    let ini = [N.data, $("#lt-data").value].filter(Boolean).map(d => mesDe(d)).sort()[0] || atual;
    const lim = mesMais(atual, -5); if (ini < lim) ini = lim; if (ini > atual) ini = atual;
    const out = []; for (let m = ini; m <= atual; m = mesMais(m, 1)) out.push(m);
    if (!out.includes(entrada)) out.push(entrada);
    return out;
  }
  function renderRep(){
    const box = $("#lt-rep"); if (!box) return;
    const nf = esc($("#lt-nf").value.trim());
    const campos = rotulo => `<div class="rep-conf">
        <label class="lote-conf"><input type="checkbox" id="lt-rep-ok" ${rep.conf.ok ? "checked" : ""}> ${rotulo}</label>
        <div class="rep-campos" ${rep.conf.ok ? "" : "hidden"}>
          <div class="field"><label for="lt-rep-num">Digite o número da nota para confirmar</label><input class="input" id="lt-rep-num" inputmode="numeric" autocomplete="off" value="${esc(rep.conf.num)}"></div>
          <div class="field"><label for="lt-rep-mot">Motivo (pelo menos 10 letras)</label><input class="input" id="lt-rep-mot" maxlength="150" autocomplete="off" value="${esc(rep.conf.mot)}" placeholder="Ex.: segunda entrega da mesma nota"></div>
        </div></div>`;
    if (rep.estado === "conferindo") box.innerHTML = `<div class="notice"><span class="spin" aria-hidden="true"></span> Conferindo se a nota ${nf} já foi lançada…</div>`;
    else if (rep.estado === "repetida") {
      const l = rep.movs.slice(0, 8).map(m => `<li>${esc(fData(m.data))} · ${esc(m.registradoPor || "—")} · ${esc(m.itemNome || m.item || (itemDe(m.itemId) || {}).nome || "material")} · +${fNum(m.qtd)} ${esc(m.unidade || "")}</li>`).join("");
      box.innerHTML = `<div class="notice crit lote-rep"><b>Esta nota já foi lançada.</b> ${rep.movs.length === 1 ? "Há 1 entrada" : `Há ${rep.movs.length} entradas`} da nota ${nf} no estoque:<ul>${l}${rep.movs.length > 8 ? `<li>e mais ${rep.movs.length - 8}</li>` : ""}</ul>
        Finalizar de novo soma as quantidades outra vez. Se for a continuação de um lançamento interrompido, escreva isso no motivo.
        ${campos("Esta é uma nova entrega desta nota: lançar mesmo assim")}
        <div class="actions"><button type="button" class="btn" id="lt-rep-fechar">Fechar sem lançar</button></div></div>`;
    } else if (rep.estado === "falhou") {
      box.innerHTML = `<div class="notice crit lote-rep"><b>Não foi possível conferir se a nota ${nf} já foi lançada.</b> ${esc(rep.erro || "")}
        <div class="actions"><button type="button" class="btn" id="lt-rep-tentar">Tentar de novo</button><button type="button" class="btn" id="lt-rep-fechar">Fechar sem lançar</button></div>
        ${campos("Lançar mesmo sem conferir")}</div>`;
    } else if (rep.estado === "ok" && rep.outroForn.length) {
      const m = rep.outroForn[0];
      box.innerHTML = `<div class="notice warn">A nota ${nf} também aparece para outro fornecedor (${esc(m.fornecedor || "—")}, em ${esc(fData(m.data))}). Números de nota se repetem entre fornecedores: confira se não é a mesma compra.</div>`;
    } else box.innerHTML = "";
    const f = $("#lt-rep-fechar"); if (f) f.onclick = fecharModal;
    const t = $("#lt-rep-tentar"); if (t) t.onclick = () => { rep.chave = ""; conferirRepeticao(); };
    const ok = $("#lt-rep-ok"); if (ok) ok.onchange = () => { rep.conf.ok = ok.checked; $(".rep-campos", box).hidden = !ok.checked; sairDaRevisao(); atualizarTudo(); };
    const num = $("#lt-rep-num"); if (num) num.oninput = () => { rep.conf.num = num.value; sairDaRevisao(); atualizarTudo(); };
    const mot = $("#lt-rep-mot"); if (mot) mot.oninput = () => { rep.conf.mot = mot.value; sairDaRevisao(); atualizarTudo(); };
  }
  async function conferirRepeticao(){
    const numero = nfNorm($("#lt-nf").value), fc = fornCurto($("#lt-forn").value), meses = mesesRep();
    const chave = numero + "|" + fc + "|" + meses.join(",");
    if (!numero) { rep.estado = ""; rep.chave = ""; renderRep(); atualizarTudo(); return; }
    if (chave === rep.chave) return;
    rep.chave = chave; rep.estado = "conferindo"; rep.movs = []; rep.outroForn = []; renderRep(); atualizarTudo();
    let movs = S.movs.slice();
    try {
      const falta = meses.filter(m => !S.mesesCarregados.includes(m));
      if (falta.length) {
        let relogio;
        const limite = new Promise((ok, erro) => { relogio = setTimeout(() => erro({message: "A planilha demorou demais para responder."}), 45000); });
        const r = await Promise.race([api("dados", {meses: falta}, {soLer: true}), limite]).finally(() => clearTimeout(relogio));
        movs = movs.concat((r.dados && r.dados.movs) || []);
      }
    } catch(e){
      if (rep.chave !== chave || !form.isConnected) return;
      rep.estado = "falhou"; rep.erro = e.message || ""; renderRep(); atualizarTudo(); return;
    }
    if (rep.chave !== chave || !form.isConnected) return;
    const vistos = new Set(); movs = movs.filter(m => { const k = m.id || JSON.stringify(m); if (vistos.has(k)) return false; vistos.add(k); return true; });
    const usar = Object.assign({}, proprias);
    const mesma = movs.filter(m => m.tipo === "entrada" && !m.estornado && nfNorm(m.nf) === numero)
      .filter(m => { const k = assinaturaMov(m); if (usar[k]) { usar[k]--; return false; } return true; });
    rep.movs = mesma.filter(m => !fc || fornCurto(m.fornecedor) === fc);
    rep.outroForn = mesma.filter(m => fc && fornCurto(m.fornecedor) !== fc);
    rep.estado = rep.movs.length ? "repetida" : "ok";
    // linha já lançada (pela observação "Na nota: …" gravada em cada entrada): vem desmarcada
    linhas.forEach(l => {
      const obs = "Na nota: " + l.it.descricao;
      const m = rep.movs.find(x => { const o = String(x.obs || ""); return o === obs || o.startsWith(obs + " · "); }) || null;
      if (m && !l.jaLancada && !l.feito) { l.usar = false; const el = linhaEl(l); if (el) { $("[data-k=usar]", el).checked = false; el.classList.add("off"); } }
      l.jaLancada = m;
    });
    renderRep(); atualizarTudo();
  }

  // ----- revisão final: produto da nota, material do estoque, medidas, unidade e quantidade -----
  function sairDaRevisao(){
    if (!revisando) return;
    revisando = false; $("#lt-rev").hidden = true; $("#lt-rev").innerHTML = ""; $("#lt-voltar").hidden = true;
  }
  function mostrarRevisao(){
    const v = vivas(), dups = duplicadas();
    const repTxt = rep.estado === "repetida" ? `<p class="lote-aviso crit">Nota já lançada antes: será registrada de novo, com o motivo “${esc(rep.conf.mot.trim())}”.</p>` : rep.estado === "falhou" ? `<p class="lote-aviso crit">Sem conferir se a nota já foi lançada, com o motivo “${esc(rep.conf.mot.trim())}”.</p>` : "";
    const saldo = {}; // saldo previsto acumulado: duas linhas no mesmo material somam em sequência
    const nfRev = $("#lt-nf").value.trim(), fornRev = $("#lt-forn").value.trim();
    const cabRev = `<p class="lote-rev-nota">Nota <b>${esc(nfRev)}</b>${fornRev ? ` · <b>${esc(fornRev)}</b>` : ""} · entrada em ${esc(fData($("#lt-data").value || hoje()))}</p>`
      + (divNF() ? `<p class="lote-aviso crit">Número confirmado diferente do documento anexado (${esc(docNF)}).</p>` : "");
    $("#lt-rev").innerHTML = `<h4>Confira antes de registrar</h4>${cabRev}${repTxt}<ol>${v.map(l => {
      const el = linhaEl(l), qtd = pQtd($("[data-k=qtd]", el).value), novo = l.sel === "__novo", it = novo ? null : itemDe(l.sel), r = comparar(l);
      const antes = it ? (l.sel in saldo ? saldo[l.sel] : (Number(it.qtd) || 0)) : 0, depois = antes + qtd; if (it) saldo[l.sel] = depois;
      const nome = novo ? (($("[data-k=nome]", el) || {}).value || "").trim() || nomeDeNota(l.it.descricao) : (it ? it.nome : "—");
      const un = novo ? String(l.it.unidade || "un").toLowerCase() : (it && it.unidade) || "";
      const avisos = [conflitoDe(l) ? "medida diferente confirmada" : "", (dups.get(l) && !dups.get(l).primeira) ? "mesmo material de outra linha" : "", r && r.numDif && !conflitoDe(l) ? "confira o número" : "", r && r.resultado === "incompleto" ? "a nota não confirma a medida" : ""].filter(Boolean);
      return `<li data-i="${l.i}"><div class="rev-nota"><span class="lote-n">${l.i+1}</span><b>${esc(l.it.descricao)}</b>${carTags(l.c.caracteristicas.lista)}<span class="sub">na nota: ${fNum(l.it.qtd)} ${esc(l.it.unidade || "")}</span></div>
        <div class="rev-item">→ ${novo ? "<b>Item novo:</b> " : ""}<b>${esc(nome)}</b>${carTags(novo ? l.c.caracteristicas.lista : (r ? r.ci.lista : []))}<span class="sub">entra: <b>+${fNum(qtd)} ${esc(un)}</b> · estoque ${it ? `${fNum(antes)} → <b>${fNum(depois)}</b>` : `novo: 0 → <b>${fNum(qtd)}</b>`}${avisos.length ? ` · <span class="rev-aviso">${esc(avisos.join(" · "))}</span>` : ""}</span></div></li>`;
    }).join("")}</ol>`;
    $("#lt-rev").hidden = false; $("#lt-voltar").hidden = false; revisando = true;
    $("#lt-rev").scrollIntoView({block: "nearest"});
  }
  $("#lt-voltar").onclick = () => { sairDaRevisao(); atualizarTudo(); };

  // ----- estado da tela: selos, avisos de cada linha, pendências e botão -----
  function atualizarTudo(){
    if (!form.isConnected) return;
    const nfV = $("#lt-nf").value.trim(), fornV = $("#lt-forn").value.trim();
    $("#lt-tit").textContent = "Conferir a nota" + (nfV ? " " + nfV : "");
    $("#lt-sub").textContent = [fornV, N.data ? "emitida em " + fData(N.data) : "", N.valorTotal != null ? "total " + fBRL(N.valorTotal) : ""].filter(Boolean).join(" · ") + ".";
    renderDiv();
    const dups = duplicadas();
    linhas.forEach(l => {
      const el = linhaEl(l); if (!el) return;
      const st = estadoLinha(l);
      ["confira","medida","escolha","ok","lembrado","manual","novo","feito"].forEach(s => el.classList.toggle("st-" + s, s === st));
      const box = $(".selo-box", el); if (box && box.dataset.st !== st) { box.innerHTML = seloLote(st); box.dataset.st = st; }
      const al = $("[data-k=alerta]", el), html = alertaLinha(l, dups.get(l));
      if (al.dataset.html !== html) { al.innerHTML = html; al.dataset.html = html; }
    });
    const pend = enviando ? [] : pendencias(dups), v = vivas();
    const ul = $("#lt-pend"); ul.innerHTML = pend.map(p => `<li>${esc(p)}</li>`).join(""); ul.hidden = !pend.length;
    const prontas = v.filter(l => l.sel && !(conflitoDe(l) && !l.confConflito)).length;
    const nDesm = linhas.filter(l => !l.usar && !l.feito).length, nFeitas = linhas.filter(l => l.feito).length;
    $("#lt-resumo").innerHTML = `${linhas.length} ${linhas.length===1?"linha":"linhas"} · <b>${prontas}</b> ${prontas===1?"pronta":"prontas"}${v.length - prontas ? ` · <b class="txt-warn">${v.length - prontas}</b> para conferir` : ""}${nDesm ? ` · ${nDesm} ${nDesm===1?"desmarcada":"desmarcadas"}` : ""}${nFeitas ? ` · ${nFeitas} ${nFeitas===1?"registrada":"registradas"}` : ""}`;
    const novos = v.filter(l => l.sel === "__novo").length, n = v.length, btn = $("#lt-ok");
    btn.textContent = !n ? "Nenhum item marcado" : revisando ? `Confirmar e registrar ${n} ${n===1?"entrada":"entradas"}${novos ? ` e cadastrar ${novos} ${novos===1?"item novo":"itens novos"}` : ""}` : "Finalizar";
    btn.disabled = enviando || !!pend.length;
  }

  // ----- eventos -----
  const linhaDoEvento = e => { const el = e.target.closest(".lote-item"); return el ? linhas[Number(el.dataset.i)] : null; };
  form.addEventListener("change", e => {
    const l = linhaDoEvento(e), k = e.target.dataset.k;
    if (l && k === "item") {
      l.sel = e.target.value; l.mexeu = true; l.confConflito = false; l.mesmo = false;
      const nm = $(".lote-nome", linhaEl(l)); if (nm) nm.hidden = l.sel !== "__novo";
    } else if (l && k === "usar") { l.usar = e.target.checked; linhaEl(l).classList.toggle("off", !l.usar); }
    else if (l && k === "confConflito") l.confConflito = e.target.checked;
    else if (l && k === "mesmo") l.mesmo = e.target.checked;
    else if (["lt-nf","lt-forn","lt-data"].includes(e.target.id)) conferirRepeticao();
    sairDaRevisao(); atualizarTudo();
  });
  let espera = null;
  form.addEventListener("input", e => {
    if (["lt-nf","lt-forn"].includes(e.target.id)) { clearTimeout(espera); espera = setTimeout(conferirRepeticao, 700); }
    if (e.target.matches("[data-k=qtd],[data-k=valor],[data-k=nome],#lt-nf,#lt-forn")) { sairDaRevisao(); atualizarTudo(); }
  });
  form.addEventListener("click", e => {
    const b = e.target.closest("[data-k=esquecer]"); if (!b) return;
    const l = linhaDoEvento(e); if (!l) return;
    memNF.esquecer(l.chave);
    const el = linhaEl(l), q = $("[data-k=qtd]", el).value, v = $("[data-k=valor]", el).value, nm = ($("[data-k=nome]", el) || {}).value;
    const ant = memNF.antiga()[l.chave];
    l.c = LeitorNF.classificar(l.it, todos, {podeNovo, memoria: null, antiga: typeof ant === "string" ? ant : ""});
    Object.assign(l, {st0: l.c.status, sel: l.c.sel, selInicial: l.c.sel, mexeu: false, confConflito: false, mesmo: false, cmp: null});
    el.outerHTML = htmlLinha(l);
    const el2 = linhaEl(l); $("[data-k=qtd]", el2).value = q; $("[data-k=valor]", el2).value = v; if (nm != null && $("[data-k=nome]", el2)) $("[data-k=nome]", el2).value = nm;
    renderMemBtn(); sairDaRevisao(); atualizarTudo();
  });

  const registrados = [];
  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#lt-msg"); msg.className = "hint err"; msg.textContent = "";
    if (enviando) return;
    const pend = pendencias(duplicadas());
    if (pend.length) { atualizarTudo(); return; }
    if (!revisando) { mostrarRevisao(); atualizarTudo(); return; }
    const fornecedor = $("#lt-forn").value.trim(), numero = $("#lt-nf").value.trim(), data = $("#lt-data").value || hoje(), receb = $("#lt-rec").value.trim();
    const motivo = rep.conf.mot.trim().replace(/\s+/g, " ").slice(0, 150);
    const extraObs = rep.estado === "repetida" ? ` · Nota já lançada antes, confirmado: ${motivo}` : rep.estado === "falhou" ? ` · Sem conferir se a nota já foi lançada, confirmado: ${motivo}` : "";
    const dups = duplicadas();
    const filas = vivas().map(l => { const el = linhaEl(l); return {l, el, it: l.it, sel: l.sel, nome: ($("[data-k=nome]", el)||{}).value, qtd: pQtd($("[data-k=qtd]", el).value), valor: $("[data-k=valor]", el).value.trim(), excecao: conflitoDe(l) || !!(dups.get(l) && !dups.get(l).primeira)}; });
    const btn = $("#lt-ok"); btn.disabled = true; $("#lt-no").disabled = true; $("#lt-voltar").hidden = true;
    enviando = true; S.ocupado = true; renderSync();
    try {
      // a nota vai para o Drive uma vez só e fica ligada a todas as entradas
      $("#m-forn").value = fornecedor; $("#m-nf").value = numero;
      let ids = [];
      if (S.nfArq.length) { ids = await enviarNF(S.nfArq, numero, fornecedor, msg); if (!ids) return; S.nfAnexo = {chave: chaveNF(), ids}; S.nfArq = []; S.nfLida = null; renderNfAnexo(); }
      else if (nfAnexoValido()) ids = S.nfAnexo.ids;
      const mapa = memNF.nova(); let feitas = 0;
      for (let k = 0; k < filas.length; k++) {
        const f = filas[k], st = $(".lote-st", f.el);
        msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> Registrando ${k+1} de ${filas.length}…`;
        try {
          let itemId = f.sel;
          if (itemId === "__novo") {
            const nome = String(f.nome || "").trim() || nomeDeNota(f.it.descricao);
            const base = dadosDeItemNovo(f.it.descricao);
            await api("salvarItem", {item:Object.assign(base, {codigo:"", setor:S.setor, nome, unidade:String(f.it.unidade||"un").toLowerCase(), qtd:0, minimo:0, obs:`Cadastrado pela nota ${numero}${fornecedor ? " (" + fornecedor + ")" : ""}${f.it.codigo ? " · cód. do fornecedor " + f.it.codigo : ""}`})});
            const novo = itensArr().filter(i => i.nome === nome).sort((a,b) => String(b.criadoEm).localeCompare(String(a.criadoEm)))[0];
            if (!novo) throw {message:"O item novo não apareceu na lista. Atualize a página."};
            itemId = novo.id;
            // se a entrada falhar depois daqui, a nova tentativa usa o item já cadastrado (não cadastra outro)
            f.l.sel = itemId; f.l.novoCriado = true;
            const se = $("[data-k=item]", f.el); se.add(new Option(nome + " (item novo, já cadastrado)", itemId)); se.value = itemId;
            const nm = $(".lote-nome", f.el); if (nm) nm.hidden = true;
          }
          const mov = {tipo:"entrada", itemId, qtd:f.qtd, data, fornecedor, nf:numero, valorUnit: f.valor ? pQtd(f.valor) : "", responsavel:receb, obs:`Na nota: ${f.it.descricao}${extraObs}`.slice(0, 300)}; // a planilha guarda até 300 letras
          if (ids.length) mov.nfFotos = ids.join(",");
          await api("registrar", {mov});
          proprias[assinaturaMov(mov)] = (proprias[assinaturaMov(mov)] || 0) + 1;
          const itR = S.itens.get(itemId) || {};
          registrados.push({itemId, nome: itR.nome || f.nome || nomeDeNota(f.it.descricao), codigo: itR.codigo || "", unidade: itR.unidade || "", estoque: itR.qtd, qtd: f.qtd, valor: mov.valorUnit, novo: f.sel === "__novo" || !!f.l.novoCriado, descricao: f.it.descricao});
          // memória: só a escolha de uma pessoa vira "Escolhido antes"; exceções confirmadas não viram regra
          if (!f.excecao) {
            const chave = chaveProduto(fornecedor, f.it), velha = mapa[chave];
            const auto = (f.l.st0 === "ok" || f.l.st0 === "novo") && !f.l.mexeu;
            const origem = velha && velha.itemId === itemId && velha.origem === "pessoa" ? "pessoa" : auto ? "auto" : "pessoa";
            mapa[chave] = {itemId, origem, quando: hoje(), vezes: (velha && velha.itemId === itemId ? (velha.vezes || 0) : 0) + 1, forn: fornecedor, descNota: f.it.descricao,
              nomeItem: itR.nome || "", carItem: LeitorNF.assinaturaCar(LeitorNF.caracteristicas(itR.nome || ""))};
          }
          f.l.feito = true; f.el.classList.add("feito"); $("[data-k=usar]", f.el).disabled = true; $("[data-k=item]", f.el).disabled = true;
          st.className = "hint lote-st ok"; st.textContent = "Registrado.";
          feitas++;
        } catch(e){
          st.className = "hint lote-st err"; st.textContent = e.message || "Não foi possível registrar.";
          msg.className = "hint err"; msg.textContent = `${feitas} de ${filas.length} registradas. Corrija o item marcado e clique de novo para registrar o que falta.`;
          memNF.gravar(mapa); renderMemBtn(); return;
        }
      }
      memNF.gravar(mapa); renderMemBtn();
      fecharModal();
      const nNovos = registrados.filter(r => r.novo).length;
      toast(`Nota ${numero} finalizada: ${registrados.length} ${registrados.length===1?"entrada registrada":"entradas registradas"}${nNovos ? ` e ${nNovos} ${nNovos===1?"item novo cadastrado":"itens novos cadastrados"}` : ""}.`);
      mostrarResumoNota({numero, fornecedor, data, receb, ids, itens: registrados, valorTotal: N.valorTotal});
    } finally {
      enviando = false; if ($("#lt-no")) $("#lt-no").disabled = false; S.ocupado = false; renderSync();
      if (form.isConnected) { sairDaRevisao(); atualizarTudo(); }
    }
  });
  atualizarTudo();
  conferirRepeticao();
}

// ---------- escolhas lembradas neste computador ----------
function renderMemBtn(){
  const b = $("#m-nf-mem"); if (!b) return;
  try {
    const n2 = Object.keys(memNF.nova()).length, n1 = Object.keys(memNF.antiga()).length;
    b.hidden = !(n1 + n2) || !can("registrar_entrada");
    b.textContent = `Escolhas lembradas neste computador (${n2 + n1})`;
  } catch(e){ b.hidden = true; } // chamado antes de a memória estar pronta (carregamento da página)
}
function abrirMemoriaNF(){
  const m2 = memNF.nova(), m1 = memNF.antiga(), ch2 = Object.keys(m2), ch1 = Object.keys(m1);
  const descDaChave = k => k.split("|").slice(1).join("|");
  const nomeItem = id => { const it = S.itens.get(id); return it ? it.nome : "(material não encontrado)"; };
  $("#modal-box").innerHTML = `
    <h3>Escolhas lembradas neste computador</h3>
    <p class="muted" style="margin:-6px 0 14px">Quando uma pessoa escolhe o material de uma linha da nota, este computador lembra a escolha para a próxima nota do mesmo fornecedor. Só as escolhas feitas por uma pessoa voltam prontas, e só se a medida ainda bater.</p>
    ${ch2.length ? `<div class="tablebox flat"><table><thead><tr><th>Na nota</th><th>Material</th><th class="hide-s">Origem</th><th class="hide-s">Data</th><th></th></tr></thead><tbody>${ch2.map(k => { const e = m2[k]; return `<tr data-ch="${esc(k)}"><td>${esc(e.descNota || descDaChave(k))}<span class="sub">${esc(e.forn || k.split("|")[0])}</span></td><td>${esc(nomeItem(e.itemId))}</td><td class="hide-s">${e.origem === "pessoa" ? "escolhida por uma pessoa" : "automática"}</td><td class="hide-s">${esc(fData(e.quando))}</td><td class="n"><button type="button" class="btn small" data-esq="${esc(k)}">Esquecer</button></td></tr>`; }).join("")}</tbody></table></div>`
      : `<p class="empty">Nenhuma escolha nova guardada.</p>`}
    ${ch1.length ? `<p class="hint">Há também ${ch1.length} ${ch1.length===1?"escolha antiga":"escolhas antigas"} (da versão anterior). Elas só aparecem como sugestão para conferir e nunca são usadas sozinhas.</p>` : ""}
    <div class="actions" id="mem-acoes">${ch2.length || ch1.length ? `<button type="button" class="btn" id="mem-todas">Esquecer todas…</button>` : ""}<button type="button" class="btn" id="mem-fechar">Fechar</button></div>
    <div class="notice warn" id="mem-conf" hidden>
      <p>Esquecer ${ch2.length} ${ch2.length===1?"escolha lembrada":"escolhas lembradas"} neste computador?</p>
      ${ch1.length ? `<label class="lote-conf"><input type="checkbox" id="mem-antigas"> Apagar também as ${ch1.length} ${ch1.length===1?"escolha antiga":"escolhas antigas"}</label>` : ""}
      <div class="actions"><button type="button" class="btn primary" id="mem-sim">Sim, esquecer</button><button type="button" class="btn" id="mem-nao">Cancelar</button></div>
    </div>`;
  $("#modal").hidden = false;
  $("#mem-fechar").onclick = fecharModal;
  $("#modal-box").onclick = e => { const b = e.target.closest("[data-esq]"); if (!b) return; memNF.esquecer(b.dataset.esq); renderMemBtn(); abrirMemoriaNF(); };
  const t = $("#mem-todas"); if (t) t.onclick = () => { $("#mem-conf").hidden = false; t.disabled = true; };
  const nao = $("#mem-nao"); if (nao) nao.onclick = () => { $("#mem-conf").hidden = true; if (t) t.disabled = false; };
  const sim = $("#mem-sim"); if (sim) sim.onclick = () => { memNF.esquecerTodas(!!($("#mem-antigas") && $("#mem-antigas").checked)); renderMemBtn(); fecharModal(); toast("Escolhas esquecidas neste computador."); };
}
if ($("#m-nf-mem")) $("#m-nf-mem").addEventListener("click", abrirMemoriaNF);
renderMemBtn();

// depois de finalizar a nota, a tela Registrar mostra o que entrou e fica limpa para a próxima
function mostrarResumoNota(R){
  S.nfArq = []; S.nfLida = null; S.nfAnexo = null; S.nfAuto = null;
  ["m-forn","m-nf","m-valor","m-qtd","m-obs","m-recebeu"].forEach(id => $("#"+id).value = "");
  S.picked = null; renderPicked(); renderNfAnexo();
  const soma = R.itens.reduce((t, r) => t + (r.valor !== "" && r.valor != null ? Number(r.valor) * Number(r.qtd) : 0), 0);
  const nNovos = R.itens.filter(r => r.novo).length;
  const box = $("#m-resumo");
  box.innerHTML = `
    <div class="resumo-top">
      <div><span class="pill s-ok">Nota finalizada</span>
        <h3>Nota ${esc(R.numero)}${R.fornecedor ? " · " + esc(R.fornecedor) : ""}</h3>
        <p class="muted">${esc(fData(R.data))} · recebida por ${esc(R.receb || "—")} · ${R.itens.length} ${R.itens.length===1?"entrada registrada":"entradas registradas"}${nNovos ? ` · ${nNovos} ${nNovos===1?"item novo cadastrado":"itens novos cadastrados"}` : ""}</p></div>
    </div>
    <div class="tablebox flat"><table>
      <thead><tr><th>Item</th><th class="n">Entrou</th><th class="n hide-s">Valor un.</th><th class="n">Estoque agora</th></tr></thead>
      <tbody>${R.itens.map(r => { const it = S.itens.get(r.itemId) || {}; return `<tr>
        <td><b>${esc(r.nome)}</b> ${r.novo ? '<span class="pill st-aberta">Novo</span>' : ""}<span class="sub">${esc([r.codigo, "na nota: " + r.descricao].filter(Boolean).join(" · "))}</span></td>
        <td class="n">+${fNum(r.qtd)} ${esc(r.unidade||"")}</td>
        <td class="n hide-s">${r.valor !== "" && r.valor != null ? fBRL(r.valor) : "—"}</td>
        <td class="n"><b>${fNum(it.qtd ?? r.estoque)}</b> ${esc(it.unidade || r.unidade || "")}</td></tr>`; }).join("")}</tbody>
    </table></div>
    <p class="hint">Total lançado: <b>${fBRL(soma)}</b>${R.valorTotal != null && Math.abs(soma - R.valorTotal) > 0.05 ? ` · total da nota: ${fBRL(R.valorTotal)}` : ""}. ${R.ids.length ? "A nota fiscal ficou anexada em cada entrada." : ""}</p>
    <div class="actions">
      <button class="btn primary" type="button" id="rs-outra">Lançar outra nota</button>
      ${R.ids.length && can("historico_ver") ? `<button class="btn" type="button" id="rs-nota">Ver a nota</button>` : ""}
      ${can("historico_ver") ? `<button class="btn" type="button" id="rs-hist">Ver no histórico</button>` : ""}
      ${nNovos && can("itens_editar") ? `<button class="btn" type="button" id="rs-itens">Completar os itens novos</button>` : ""}
    </div>`;
  box.hidden = false; $("#f-mov").hidden = true;
  window.scrollTo({top: box.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth"});
  $("#rs-outra").onclick = () => { fecharResumoNota(); setTipo("entrada"); $("#m-nf-arq").closest(".nf-btn").focus(); };
  const bn = $("#rs-nota"); if (bn) bn.onclick = () => abrirNF({nf: R.numero, fornecedor: R.fornecedor, data: R.data, itemNome: R.itens.length + (R.itens.length===1 ? " item" : " itens"), registradoPor: S.nome, nfFotos: R.ids.join(",")});
  const bh = $("#rs-hist"); if (bh) bh.onclick = () => { fecharResumoNota(); S.histMes = mesDe(R.data); $("#h-mes").value = S.histMes; $("#h-busca").value = R.numero; setTab("historico"); atualizar(true); };
  const bi = $("#rs-itens"); if (bi) bi.onclick = () => { const r = R.itens.find(x => x.novo); if (r) abrirItem(r.itemId); };
}
function fecharResumoNota(){ const box = $("#m-resumo"); if (box) { box.hidden = true; box.innerHTML = ""; } $("#f-mov").hidden = false; }

async function abrirNF(m){
  const ids = idsNF(m.nfFotos); if (!ids.length) return;
  $("#modal-box").innerHTML = `
    <h3>Nota fiscal${m.nf ? " " + esc(m.nf) : ""}</h3>
    <p class="muted" style="margin:-6px 0 14px">${esc([m.fornecedor, fData(m.data), m.itemNome, "registrada por " + (m.registradoPor||"—")].filter(Boolean).join(" · "))}</p>
    <div class="nf-ver">${ids.map(id => `<div class="nf-item" data-nfid="${esc(id)}"><span class="spin" aria-hidden="true"></span> Carregando…</div>`).join("")}</div>
    <div class="actions" style="margin-top:14px"><button class="btn" type="button" id="nf-fechar">Fechar</button></div>`;
  $("#modal-box").classList.add("largo");
  $("#modal").hidden = false; $("#nf-fechar").onclick = fecharModal;
  $$("#modal-box [data-nfid]").forEach(async el => {
    try {
      const r = await api("nfVer", {fotoId: el.dataset.nfid});
      const bytes = Uint8Array.from(atob(r.foto.b64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], {type: r.foto.mime}));
      if (r.foto.mime === "application/pdf") el.innerHTML = `<a class="btn" href="${url}" target="_blank" rel="noopener">Abrir o PDF da nota</a>`;
      else { el.innerHTML = `<button type="button" class="foto-ver nf-img" aria-label="Ampliar a nota"><img src="${url}" alt="Foto da nota fiscal"></button>`; el.querySelector("button").onclick = () => verFotoGrande(url); }
    } catch(e){ el.innerHTML = `<span class="muted">Não foi possível abrir este arquivo: ${esc(e.message||"")}</span>`; }
  });
}

// ---------- importação de inventário ----------
let xlsxPronto = null;
function carregarXLSX(){
  if (window.XLSX) return Promise.resolve();
  if (!xlsxPronto) xlsxPronto = new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = ok; s.onerror = () => { xlsxPronto = null; erro(new Error("Não foi possível carregar o leitor de planilhas. Verifique a internet.")); };
    document.head.appendChild(s);
  });
  return xlsxPronto;
}
const cab = s => norm(String(s ?? "")).replace(/[^a-z0-9]+/g, " ").trim();
// sugestão de categoria para os materiais de limpeza (dá para mudar depois em cada item)
function categoriaLimpeza(nome){
  const n = norm(nome);
  if (/luva|capa de chuva|bota|mascara|avental|oculos/.test(n)) return {categoria:"EPI", tipo:"EPI"};
  if (/saco de lixo|papel|copo|fitilho|guardanapo|toalha/.test(n)) return {categoria:"Descartáveis", tipo:"Descartável"};
  if (/dispenser|reservatorio|borrifador|balde|frasco/.test(n)) return {categoria:"Utensílios", tipo:"Utensílio"};
  if (/alcool|desinfet|detergente|essencia|floter|higidog|hipoclorito|inseticida|limp|lustra|oleo|pasta|peroxy|sabonete|bom ar|cloro|amaciante|cera|multiuso liquido/.test(n)) return {categoria:"Produtos químicos", tipo:"Produto químico"};
  return {categoria:"Utensílios", tipo:"Utensílio"};
}
function mapaColunas(row){
  const h = row.map(cab), achar = t => h.findIndex(t);
  const m = {
    codigo: achar(x => x.startsWith("codigo") || x === "cod" || x === "cod item"),
    nome: achar(x => ["item","nome","nome do item","descricao","material","produto"].includes(x)),
    espec: achar(x => x.startsWith("especifica")),
    categoria: achar(x => x === "categoria"),
    tipo: achar(x => x === "tipo" || x === "tipo do item"),
    unidade: achar(x => ["un","und","unid","unidade"].includes(x)),
    minimo: achar(x => x.includes("minimo")),
    local: achar(x => x.startsWith("localiza") || x === "local"),
    obs: achar(x => x.startsWith("observ")),
    conferir: achar(x => x === "conferir")
  };
  m.qtd = achar(x => x.startsWith("saldo"));
  if (m.qtd < 0) m.qtd = achar(x => (x.startsWith("qtd") || x.startsWith("quantidade") || x.startsWith("contagem") || x === "estoque" || x.startsWith("estoque atual")) && !x.includes("minimo"));
  return m;
}
function lerPlanilha(wb){
  let melhor = null;
  wb.SheetNames.forEach(nome => {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], {header:1, raw:true, defval:""});
    for (let i = 0; i < Math.min(25, linhas.length); i++) {
      const m = mapaColunas(linhas[i]);
      if (m.nome < 0 || m.qtd < 0) continue;
      const itens = [];
      const num = v => typeof v === "number" ? v : pQtd(String(v).trim());
      for (const r of linhas.slice(i+1)) {
        const base = String(r[m.nome] ?? "").trim();
        if (!base) continue;
        const espec = m.espec >= 0 ? String(r[m.espec] ?? "").trim() : "";
        let un = m.unidade >= 0 ? String(r[m.unidade] ?? "").trim().toLowerCase() : "";
        if (!un || /^\d+([.,]\d+)?$/.test(un)) un = "un";
        un = ({"unid.":"un","unid":"un","und":"un","unidade":"un","litro":"L","litros":"L","l":"L","caixa":"cx","pacote":"pct","pacotes":"pct","galao":"galão","peça":"pç","peca":"pç"})[un] || un;
        let cod = m.codigo >= 0 ? String(r[m.codigo] ?? "").trim() : "";
        if (S.setor === "Limpeza" && /^\d{1,4}$/.test(cod)) cod = "LIM-" + cod.padStart(3, "0");
        const q = r[m.qtd] === "" ? 0 : num(r[m.qtd]);
        const mn = m.minimo >= 0 && r[m.minimo] !== "" ? num(r[m.minimo]) : "";
        const conf = m.conferir >= 0 && /^s/i.test(String(r[m.conferir]).trim());
        const obs = [m.obs >= 0 ? String(r[m.obs] ?? "").trim() : "", conf ? "Conferir com a contagem física." : ""].filter(Boolean).join(" ");
        itens.push({
          codigo: cod,
          nome: espec ? `${base} – ${espec}` : base,
          categoria: m.categoria >= 0 ? String(r[m.categoria] ?? "").trim() : (S.setor === "Limpeza" ? categoriaLimpeza(base).categoria : ""),
          tipoItem: m.tipo >= 0 ? String(r[m.tipo] ?? "").trim() : (S.setor === "Limpeza" ? categoriaLimpeza(base).tipo : ""),
          unidade: un, qtd: q, minimo: Number.isFinite(mn) ? mn : "", 
          local: m.local >= 0 ? String(r[m.local] ?? "").trim() : "", obs
        });
      }
      if (!melhor || itens.length > melhor.itens.length) melhor = {aba:nome, itens};
      break;
    }
  });
  if (melhor) Object.assign(melhor, lerHistorico(wb, melhor.aba));
  return melhor;
}
// abas de histórico (Entradas / Retiradas) com Data, Item e Quantidade
function dataPlanilha(v){
  if (v instanceof Date && !isNaN(v)) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0,10); }
  const t = String(v ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return m[1]+"-"+m[2]+"-"+m[3];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t); if (m) return (m[3].length===2 ? "20"+m[3] : m[3]) + "-" + m[2].padStart(2,"0") + "-" + m[1].padStart(2,"0");
  return "";
}
function lerHistorico(wb, abaItens){
  const hist = [], abas = [];
  wb.SheetNames.forEach(nome => {
    if (nome === abaItens) return;
    const n = norm(nome), tipo = /entrad|compra/.test(n) ? "entrada" : /retirad|saida|consumo/.test(n) ? "saida" : "";
    if (!tipo) return;
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], {header:1, raw:true, defval:""});
    for (let i = 0; i < Math.min(15, linhas.length); i++) {
      const h = linhas[i].map(cab), achar = t => h.findIndex(t);
      const c = {data: achar(x => x === "data"), item: achar(x => x === "item" || x === "material"), qtd: achar(x => x.startsWith("quantidade") || x.startsWith("qtd")),
        forn: achar(x => x.startsWith("fornecedor")), resp: achar(x => /^(recebido|retirado|responsavel|quem)/.test(x)), dest: achar(x => /^(local|destino|setor)/.test(x)),
        obs: achar(x => x.startsWith("observ")), valor: achar(x => x.startsWith("valor"))};
      if (c.data < 0 || c.item < 0 || c.qtd < 0) continue;
      let n0 = 0;
      for (const r of linhas.slice(i+1)) {
        const nomeIt = String(r[c.item] ?? "").trim(), q = typeof r[c.qtd] === "number" ? r[c.qtd] : pQtd(r[c.qtd]), d = dataPlanilha(r[c.data]);
        if (!nomeIt || !(q > 0) || !d) continue;
        const obs = c.obs >= 0 ? String(r[c.obs] ?? "").trim() : "";
        const mv = c.valor >= 0 && r[c.valor] !== "" ? r[c.valor] : ((/R\$\s*([\d.]+,\d{2})/.exec(obs) || [])[1] || "");
        const fornNf = c.forn >= 0 ? String(r[c.forn] ?? "").trim() : "";
        const nf = (/\bNF\s*[:nº°]*\s*(\d+)/i.exec(fornNf) || [])[1] || "";
        hist.push({tipo, data:d, nome:nomeIt, qtd:q, fornecedor: fornNf.replace(/\s*[-–\/]?\s*NF\s*[:nº°]*\s*\d+/i, "").trim(), nf,
          responsavel: c.resp >= 0 ? String(r[c.resp] ?? "").trim() : "", destino: c.dest >= 0 ? String(r[c.dest] ?? "").trim() : "", obs,
          valorUnit: typeof mv === "number" ? String(mv).replace(".", ",") : String(mv)});
        n0++;
      }
      if (n0) abas.push(nome);
      break;
    }
  });
  return {hist, histAbas: abas};
}
function abrirImportacao(){
  if (!can("itens_editar")) return;
  const hojeBR = fData(hoje());
  $("#modal-box").innerHTML = `
    <h3>Importar inventário${S.setores.length > 1 ? " · " + esc(S.setor) : ""}</h3>
    <p class="muted">Envie a planilha da contagem (.xlsx ou .csv). O sistema procura as colunas de código, item, quantidade (de preferência "Saldo atual"), categoria, unidade, mínimo e local.</p>
    <form class="form" id="f-imp" novalidate>
      <div class="field full"><label for="imp-arq">Planilha</label><input class="input" type="file" id="imp-arq" accept=".xlsx,.xls,.csv"></div>
      <div class="field full"><label for="imp-mot">Motivo no histórico</label><input class="input" id="imp-mot" value="Inventário ${hojeBR}"></div>
      <div class="full" id="imp-prev"></div>
      <div class="full actions"><button class="btn primary" type="submit" id="imp-ok" disabled>Importar</button><button class="btn" type="button" id="imp-no">Cancelar</button><span class="hint" id="imp-msg"></span></div>
    </form>`;
  $("#modal").hidden = false;
  $("#imp-no").onclick = fecharModal;
  let lido = null;
  const prever = () => {
    if (!lido) return;
    const modo = ($("input[name=imp-modo]:checked") || {}).value || "atualizar";
    const porCod = new Map(itensArr().filter(i=>i.codigo).map(i => [String(i.codigo).toUpperCase(), i]));
    const codsArq = new Set(lido.itens.map(l => String(l.codigo).toUpperCase()).filter(Boolean));
    let novos = 0, mudam = 0, iguais = 0; const mud = [];
    lido.itens.forEach(l => {
      const it = l.codigo && porCod.get(String(l.codigo).toUpperCase());
      if (!it) { novos++; return; }
      if (Number(it.qtd) !== Number(l.qtd)) { mudam++; mud.push({l, it}); } else iguais++;
    });
    const saem = modo === "substituir" ? itensArr().filter(i => !codsArq.has(String(i.codigo).toUpperCase())) : [];
    const semCod = lido.itens.filter(l => !l.codigo).length;
    const duvidas = lido.itens.filter(l => /\(\?\)/.test(l.nome));
    $("#imp-prev").innerHTML = `
      <div class="imp-resumo"><span>Aba <b>${esc(lido.aba)}</b>: <b>${lido.itens.length}</b> itens</span><span><b>${novos}</b> novos</span><span><b>${mudam}</b> com quantidade diferente</span><span><b>${iguais}</b> iguais</span>${modo==="substituir"?`<span><b>${saem.length}</b> saem do cadastro</span>`:""}</div>
      <fieldset class="perm-g imp-modo"><legend>Itens que já estão no sistema e não aparecem na planilha</legend>
        <label class="perm"><input type="radio" name="imp-modo" value="atualizar" ${modo==="atualizar"?"checked":""}> Manter na lista (só atualizar e acrescentar)</label>
        <label class="perm"><input type="radio" name="imp-modo" value="substituir" ${modo==="substituir"?"checked":""}> Tirar da lista: a planilha passa a ser o cadastro completo</label>
      </fieldset>
      ${lido.hist && lido.hist.length ? (() => {
        const ent = lido.hist.filter(h => h.tipo === "entrada"), sai = lido.hist.filter(h => h.tipo === "saida");
        const nomes = new Set(lido.itens.map(l => norm(l.nome).replace(/\s+/g," ").trim()));
        const fora = lido.hist.filter(h => !nomes.has(norm(h.nome).replace(/\s+/g," ").trim())).length;
        const datas = lido.hist.map(h => h.data).sort();
        return `<label class="perm imp-hist"><input type="checkbox" id="imp-hist" checked> <span><b>Lançar também o histórico da planilha</b> (abas ${esc(lido.histAbas.join(" e "))}): ${ent.length} ${ent.length===1?"compra":"compras"}${sai.length ? ` e ${sai.length} ${sai.length===1?"retirada":"retiradas"}` : ""}, de ${fData(datas[0])} a ${fData(datas[datas.length-1])}, com data, fornecedor e valor. O saldo final de cada item continua igual ao da planilha.${fora ? ` ${fora} ${fora===1?"linha não corresponde":"linhas não correspondem"} a nenhum item e ${fora===1?"fica":"ficam"} de fora.` : ""}</span></label>`;
      })() : ""}
      ${semCod ? `<p class="hint">${semCod} itens sem código vão receber um código automático.</p>` : ""}
      ${duvidas.length ? `<p class="hint">${duvidas.length} itens têm "(?)" no nome, marcando leitura duvidosa. Dá para corrigir depois em Itens.</p>` : ""}
      ${modo==="substituir" && saem.length ? `<p class="notice warn">Vão sair da lista: ${esc(saem.slice(0,12).map(i=>i.nome).join(", "))}${saem.length>12?` e mais ${saem.length-12}`:""}. O histórico deles continua guardado e a planilha guarda uma cópia da lista atual.</p>` : ""}
      ${mud.length ? `<div class="tablebox flat imp-tab"><table><thead><tr><th>Código</th><th>Item</th><th class="n">No sistema</th><th class="n">Contado</th></tr></thead><tbody>${mud.slice(0,40).map(({l,it}) => `<tr><td class="mono">${esc(l.codigo)}</td><td>${esc(it.nome)}</td><td class="n">${fNum(it.qtd)}</td><td class="n"><b>${fNum(l.qtd)}</b></td></tr>`).join("")}</tbody></table></div>` : ""}`;
    $$("input[name=imp-modo]").forEach(r => r.addEventListener("change", prever));
    $("#imp-ok").disabled = false;
  };
  $("#imp-arq").addEventListener("change", async () => {
    const f = $("#imp-arq").files[0]; if (!f) return;
    const msg = $("#imp-msg"); msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> Lendo a planilha…`;
    $("#imp-ok").disabled = true; $("#imp-prev").innerHTML = "";
    try {
      await carregarXLSX();
      const buf = await f.arrayBuffer();
      lido = lerPlanilha(XLSX.read(buf, {type:"array"}));
      if (!lido || !lido.itens.length) { lido = null; msg.className = "hint err"; msg.textContent = "Não encontrei uma tabela com colunas de item e quantidade nessa planilha."; return; }
      // primeira importação com códigos diferentes: sugere substituir
      const atuais = new Set(itensArr().map(i => String(i.codigo).toUpperCase()));
      const comuns = lido.itens.filter(l => atuais.has(String(l.codigo).toUpperCase())).length;
      msg.textContent = "";
      $("#imp-prev").innerHTML = `<input type="radio" name="imp-modo" value="${comuns < lido.itens.length/2 ? "substituir" : "atualizar"}" checked hidden>`;
      prever();
    } catch(e){ lido = null; msg.className = "hint err"; msg.textContent = e.message || "Não foi possível ler a planilha."; }
  });
  $("#f-imp").addEventListener("submit", async ev => {
    ev.preventDefault(); if (!lido) return;
    const modo = ($("input[name=imp-modo]:checked") || {}).value || "atualizar";
    const comHist = lido.hist && lido.hist.length && $("#imp-hist") && $("#imp-hist").checked;
    const extraHist = comHist ? {historico: lido.hist, dataAjuste: lido.hist.map(h => h.data).sort()[0]} : {};
    await enviar($("#imp-ok"), $("#imp-msg"), "importarContagem", Object.assign({linhas: lido.itens, modo, motivo: $("#imp-mot").value.trim(), setor: S.setor}, extraHist), () => { fecharModal(); setTab("itens"); });
  });
}
$("#i-importar").addEventListener("click", abrirImportacao);

// ---------- histórico de acessos (menu Administração) ----------
const AC_TIPO = {login:"Entrou com senha", retorno:"Voltou ao sistema", falha:"Senha errada", bloqueado:"Login bloqueado"};
let acModo = "entradas";
let acTok = 0;
async function carregarAcessos(){
  if (!can("acessos")) return;
  const tok = ++acTok;
  $("#ac-body").innerHTML = `<tr><td colspan="6"><div class="empty"><span class="spin" aria-hidden="true"></span> Carregando…</div></td></tr>`;
  try {
    const dias = Number($("#ac-periodo").value)||0;
    if (acModo === "alteracoes" || acModo === "vistas") {
      const r = await api("auditoria", {dias});
      if (tok !== acTok) return;
      S.auditoria = r.auditoria || []; renderAuditoria(); return;
    }
    if (acModo === "seguranca") {
      const [ra, rb] = await Promise.all([api("auditoria", {dias}), api("acessos", {dias})]);
      if (tok !== acTok) return;
      S.auditoria = ra.auditoria || []; S.acessos = rb.acessos || []; renderSeguranca(); return;
    }
    const r = await api("acessos", {dias});
    if (tok !== acTok) return;
    S.acessos = r.acessos || []; renderAcessos();
  } catch(e){ if (tok === acTok) $("#ac-body").innerHTML = `<tr><td colspan="6"><div class="notice crit" style="margin:0">${esc(/desconhecida/i.test(e.message) ? "A planilha ainda está com o código anterior. Atualize o código do Apps Script para o histórico começar a ser gravado." : e.message)}</div></td></tr>`; }
}
// alterações gravadas na aba Auditoria: quem fez, o quê, quando; as negadas aparecem em vermelho
const AC_VISTA = a => a.acao === "Abriu tela" || a.acao === "Exportou planilha";
function renderAuditoria(){
  const vistas = acModo === "vistas";
  const L = (S.auditoria || []).filter(a => vistas ? AC_VISTA(a) : !AC_VISTA(a));
  const sel = $("#ac-pessoa"), cur = sel.value;
  const pessoas = [...new Map(L.filter(a => a.usuario).map(a => [a.usuario, a.nome || a.usuario])).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1]),"pt-BR"));
  sel.innerHTML = `<option value="">Todas as pessoas</option>` + pessoas.map(([u,n]) => `<option value="${esc(u)}">${esc(n)}${n!==u?" ("+esc(u)+")":""}</option>`).join("");
  sel.value = pessoas.some(p => p[0] === cur) ? cur : "";
  const q = norm($("#ac-busca").value.trim());
  const vis = L.filter(a => (!sel.value || a.usuario === sel.value) && (!q || norm([a.acao, a.detalhe, a.nome].join(" ")).includes(q)));
  const negadas = L.filter(a => a.resultado !== "OK").length;
  $("#ac-resumo").innerHTML = (vistas ? `<div class="ac-pessoa" aria-hidden="true"><b>${L.filter(a => a.acao === "Abriu tela").length} tela${L.filter(a => a.acao === "Abriu tela").length===1?"":"s"} aberta${L.filter(a => a.acao === "Abriu tela").length===1?"":"s"}</b><span>no período</span></div><div class="ac-pessoa" aria-hidden="true"><b>${L.filter(a => a.acao === "Exportou planilha").length} exportaç${L.filter(a => a.acao === "Exportou planilha").length===1?"ão":"ões"}</b><span>planilhas baixadas</span></div>`
      : `<div class="ac-pessoa" aria-hidden="true"><b>${L.length} alteraç${L.length===1?"ão":"ões"}</b><span>no período</span></div>`)
    + (negadas ? `<div class="ac-pessoa falha"><b>${negadas} negada${negadas===1?"":"s"}</b><span>tentativas sem permissão ou logins bloqueados</span></div>` : "");
  $("#ac-body").innerHTML = vis.length ? vis.map(a => `<tr class="${a.resultado!=="OK"?"ac-falha":""}">
      <td class="num" style="white-space:nowrap">${fData(a.quando)} <b>${esc(String(a.quando).slice(11,16))}</b></td>
      <td><b>${esc(a.nome || a.usuario || "—")}</b><span class="sub mono">${esc(a.usuario)}</span></td>
      <td class="hide-s">${esc(a.perfil || "—")}</td>
      <td>${esc(a.acao)}${a.resultado!=="OK" ? ` <span class="pill s-zero">${esc(a.resultado)}</span>` : ""}</td>
      <td colspan="2" class="ac-det">${esc(a.detalhe || "—")}</td></tr>`).join("")
    : `<tr><td colspan="6"><div class="empty">${L.length ? "Nada com esses filtros." : vistas ? "Nenhuma tela registrada neste período. O registro das telas abertas começa com a atualização do código da planilha." : "Nenhuma alteração registrada neste período. O registro começa com a atualização do código da planilha."}</div></td></tr>`;
}
// painel de segurança: senhas erradas, bloqueios, acessos negados, trocas de senha, mudanças em usuários e perfis, aparelho novo
const AC_SEG = {
  senha: ["Senha errada", "tentativas que não entraram"], bloqueio: ["Login bloqueado", "bloqueios por tentativas"],
  negado: ["Acesso negado", "ações ou telas sem permissão"], troca: ["Senha trocada", "pela pessoa ou pela Administração"],
  usuario: ["Usuários e perfis", "logins e permissões alterados"], aparelho: ["Aparelho novo", "entrada de um aparelho diferente"]
};
let acSegCat = "";
function eventosSeguranca(){
  const ev = [];
  const A = (S.acessos || []).slice().sort((a,b) => String(a.quando).localeCompare(String(b.quando)));
  const vistos = new Map();
  A.forEach(a => {
    if (a.motivo === "falha") ev.push({cat:"senha", quando:a.quando, usuario:a.usuario, nome:a.nome, det:"Senha errada" + (a.aparelho ? " · " + a.aparelho : "")});
    else if (a.motivo === "bloqueado") ev.push({cat:"bloqueio", quando:a.quando, usuario:a.usuario, nome:a.nome, det:"Tentou entrar com o login bloqueado" + (a.aparelho ? " · " + a.aparelho : "")});
    else if (a.motivo === "login" && a.aparelho) {
      const ap = vistos.get(a.usuario) || new Set();
      if (ap.size && !ap.has(a.aparelho)) ev.push({cat:"aparelho", quando:a.quando, usuario:a.usuario, nome:a.nome, det:"Entrou de um aparelho que não tinha usado no período: " + a.aparelho});
      ap.add(a.aparelho); vistos.set(a.usuario, ap);
    }
  });
  (S.auditoria || []).forEach(a => {
    const base = {quando:a.quando, usuario:a.usuario, nome:a.nome};
    if (a.acao === "Login bloqueado") ev.push(Object.assign({cat:"bloqueio", det:a.detalhe}, base));
    else if (a.resultado && a.resultado !== "OK") ev.push(Object.assign({cat:"negado", det:a.acao + ": " + a.detalhe}, base));
    else if (a.acao === "Trocou a própria senha" || (a.acao === "Usuário" && /senha trocada/.test(a.detalhe||""))) ev.push(Object.assign({cat:"troca", det:a.detalhe}, base));
    else if (["Usuário","Perfil","Excluiu perfil","Acessos de usuário"].includes(a.acao)) ev.push(Object.assign({cat:"usuario", det:a.acao + ": " + a.detalhe}, base));
  });
  return ev.sort((a,b) => String(b.quando).localeCompare(String(a.quando)));
}
function renderSeguranca(){
  const todos = eventosSeguranca();
  const sel = $("#ac-pessoa"), cur = sel.value;
  const pessoas = [...new Map(todos.filter(e => e.usuario).map(e => [e.usuario, e.nome || e.usuario])).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1]),"pt-BR"));
  sel.innerHTML = `<option value="">Todas as pessoas</option>` + pessoas.map(([u,n]) => `<option value="${esc(u)}">${esc(n)}${n!==u?" ("+esc(u)+")":""}</option>`).join("");
  sel.value = pessoas.some(p => p[0] === cur) ? cur : "";
  const q = norm($("#ac-busca").value.trim());
  const vis = todos.filter(e => (!acSegCat || e.cat === acSegCat) && (!sel.value || e.usuario === sel.value) && (!q || norm([e.det, e.nome, e.usuario].join(" ")).includes(q)));
  const grave = c => c === "bloqueio" || c === "negado" || c === "senha";
  $("#ac-resumo").innerHTML = Object.entries(AC_SEG).map(([c,[t,sub]]) => { const n = todos.filter(e => e.cat === c).length;
    return `<button type="button" class="ac-pessoa ${n && grave(c) ? "falha" : ""}" data-sc="${c}" aria-pressed="${acSegCat === c}"><b>${n} · ${esc(t)}</b><span>${esc(sub)}</span></button>`; }).join("");
  $("#ac-body").innerHTML = vis.length ? vis.map(e => `<tr class="${grave(e.cat) ? "ac-falha" : ""}">
      <td class="num" style="white-space:nowrap">${fData(e.quando)} <b>${esc(String(e.quando).slice(11,16))}</b></td>
      <td><b>${esc(e.nome || e.usuario || "—")}</b><span class="sub mono">${esc(e.usuario || "")}</span></td>
      <td><span class="pill ${grave(e.cat) ? "s-zero" : e.cat === "aparelho" ? "p-ajuste" : "s-ok"}">${esc(AC_SEG[e.cat][0])}</span></td>
      <td colspan="3" class="ac-det">${esc(e.det || "—")}</td></tr>`).join("")
    : `<tr><td colspan="6"><div class="empty">${todos.length ? "Nada com esses filtros." : "Nenhum evento de segurança neste período."}</div></td></tr>`;
}
function acTrocarModo(m){
  acModo = m; acSegCat = "";
  $$("#ac-modo button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
  const ent = m === "entradas";
  $("#ac-tipo").hidden = !ent; $("#ac-busca").hidden = ent;
  $("#ac-head").innerHTML = m === "seguranca" ? `<tr><th>Data e hora</th><th>Pessoa</th><th>Evento</th><th colspan="3">Detalhe</th></tr>`
    : !ent ? `<tr><th>Data e hora</th><th>Pessoa</th><th class="hide-s">Perfil</th><th>${m === "vistas" ? "O quê" : "Ação"}</th><th colspan="2">Detalhe</th></tr>`
    : `<tr><th>Data e hora</th><th>Pessoa</th><th class="hide-s">Perfil</th><th>Entrou por</th><th class="hide-m">Aparelho</th><th>Tipo</th></tr>`;
  $("#ac-desc").textContent = {
    alteracoes: "O que cada pessoa alterou no sistema, com data e hora. Tentativas sem permissão aparecem em vermelho.",
    vistas: "Quem abriu as telas sensíveis (Histórico, Dashboard, Usuários, Pendências, Histórico de acessos) e quem baixou planilhas.",
    seguranca: "Eventos de segurança: senhas erradas, bloqueios, acessos negados, trocas de senha, mudanças em usuários e perfis, entrada de aparelho novo."
  }[m] || "Cada entrada no sistema, com data, hora, setor escolhido e aparelho. Tentativas com senha errada aparecem em vermelho.";
  carregarAcessos();
}
function renderAcessos(){
  const L = S.acessos || [];
  const sel = $("#ac-pessoa"), cur = sel.value;
  const pessoas = [...new Map(L.map(a => [a.usuario, a.nome || a.usuario])).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1]),"pt-BR"));
  sel.innerHTML = `<option value="">Todas as pessoas</option>` + pessoas.map(([u,n]) => `<option value="${esc(u)}">${esc(n)}${n!==u?" ("+esc(u)+")":""}</option>`).join("");
  sel.value = pessoas.some(p => p[0] === cur) ? cur : "";
  const tipo = $("#ac-tipo").value;
  const vis = L.filter(a => (!sel.value || a.usuario === sel.value) && (!tipo || a.motivo === tipo));
  // resumo por pessoa: último acesso e quantas entradas no período
  const res = new Map();
  L.filter(a => a.motivo !== "falha").forEach(a => { const x = res.get(a.usuario) || {nome:a.nome||a.usuario, n:0, ultimo:""}; x.n++; if (a.quando > x.ultimo) x.ultimo = a.quando; res.set(a.usuario, x); });
  const falhas = L.filter(a => a.motivo === "falha").length;
  L.forEach(a => { if (a.motivo === "bloqueado") a._f = 1; });
  $("#ac-resumo").innerHTML = [...res.entries()].sort((a,b) => b[1].ultimo.localeCompare(a[1].ultimo)).map(([u,x]) =>
    `<button type="button" class="ac-pessoa" data-u="${esc(u)}" aria-pressed="${sel.value===u}"><b>${esc(x.nome)}</b><span>${x.n} acesso${x.n===1?"":"s"} · último ${fData(x.ultimo)} ${esc(String(x.ultimo).slice(11,16))}</span></button>`).join("")
    + (falhas ? `<button type="button" class="ac-pessoa falha" data-f="1" aria-pressed="${tipo==="falha"}"><b>${falhas} senha${falhas===1?"":"s"} errada${falhas===1?"":"s"}</b><span>tentativas que não entraram</span></button>` : "")
    + (L.some(a => a.motivo === "bloqueado") ? `<div class="ac-pessoa falha"><b>${L.filter(a => a.motivo === "bloqueado").length} bloqueada${L.filter(a => a.motivo === "bloqueado").length===1?"":"s"}</b><span>tentativas com o login bloqueado</span></div>` : "");
  $("#ac-body").innerHTML = vis.length ? vis.map(a => `<tr class="${a.motivo==="falha"||a.motivo==="bloqueado"?"ac-falha":""}">
      <td class="num" style="white-space:nowrap">${fData(a.quando)} <b>${esc(String(a.quando).slice(11,16))}</b></td>
      <td><b>${esc(a.nome || "—")}</b><span class="sub mono">${esc(a.usuario)}</span></td>
      <td class="hide-s">${esc(a.perfil || "—")}</td>
      <td>${esc(a.entrada || "—")}</td>
      <td class="hide-m">${esc(a.aparelho || "—")}</td>
      <td>${a.motivo==="bloqueado" ? `<span class="pill s-zero">Login bloqueado</span>` : a.motivo==="falha" ? `<span class="pill s-zero">Senha errada</span>` : a.motivo==="login" ? `<span class="pill s-ok">Entrou com senha</span>` : `<span class="pill p-ajuste">Voltou ao sistema</span>`}</td></tr>`).join("")
    : `<tr><td colspan="6"><div class="empty">${L.length ? "Nenhum acesso com esses filtros." : "Nenhum acesso registrado neste período. Os acessos passam a ser gravados a partir da atualização do código da planilha."}</div></td></tr>`;
}
const acRender = () => acModo === "seguranca" ? renderSeguranca() : acModo === "entradas" ? renderAcessos() : renderAuditoria();
$("#ac-pessoa").addEventListener("change", acRender);
$("#ac-tipo").addEventListener("change", renderAcessos);
$("#ac-busca").addEventListener("input", acRender);
$("#ac-modo").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b && b.dataset.m !== acModo) acTrocarModo(b.dataset.m); });
$("#ac-periodo").addEventListener("change", carregarAcessos);
$("#ac-atualizar").addEventListener("click", carregarAcessos);
$("#ac-resumo").addEventListener("click", e => {
  const b = e.target.closest("button.ac-pessoa"); if (!b) return;
  if (b.dataset.sc) { acSegCat = acSegCat === b.dataset.sc ? "" : b.dataset.sc; renderSeguranca(); return; }
  if (b.dataset.f) { $("#ac-tipo").value = $("#ac-tipo").value === "falha" ? "" : "falha"; $("#ac-pessoa").value = ""; }
  else { $("#ac-pessoa").value = $("#ac-pessoa").value === b.dataset.u ? "" : b.dataset.u; }
  renderAcessos();
});

// ---------- controle de pendências (menu Administração) ----------
// "nome" é o texto gravado na coluna Seção da planilha (não mudar sem migrar os dados); "rotulo" é o que a tela mostra.
// As antigas seções "aguardando entrega" e "aguardando síndico" foram unificadas em "Cotações e compras":
// um item que ainda traga um desses nomes aparece aqui, e não em "Outras demandas".
const PD_SECOES = [
  {nome:"Cotações e compras – a cotar", rotulo:"Cotações e compras", email:"COTAÇÕES E COMPRAS",
   antigas:["Cotações e compras – aguardando entrega", "Cotações e compras – aguardando síndico"]},
  {nome:"Governança / administração", email:"GOVERNANÇA / ADMINISTRAÇÃO"},
  {nome:"Manutenção / limpeza / jardinagem", email:"MANUTENÇÃO / LIMPEZA / JARDINAGEM"},
  {nome:"Outras demandas da administração", email:"OUTRAS DEMANDAS DA ADMINISTRAÇÃO"}
];
const PD_OUTRAS = PD_SECOES[PD_SECOES.length-1].nome;
const PD_STATUS = ["Pendente","A cotar","Em andamento","Aguardando entrega","Aguardando síndico","Concluído"];
const PD_CRIT = ["Alta","Média","Baixa"];
const PD_FREQ = ["Diária","Semanal","Quinzenal","Mensal","Bimestral","Trimestral","Semestral","Anual"];
const pdConst = p => p.tipo === "Constante";
const pdEhSub = p => !!p.pai || String(p.numero||"").includes(".");
const pdFilhos = pai => (S.pend||[]).filter(p => p.id !== pai.id && (p.pai === pai.id || (pai.numero && !p.pai && p.secao === pai.secao && String(p.numero).startsWith(pai.numero + "."))));
const pdTemNovos = () => !S.pend || !S.pend.length || ("tipo" in S.pend[0]);
const fDia = iso => iso ? fData(iso).slice(0,5) : "—";
const pdTemCrit = () => !S.pend || !S.pend.length || ("criticidade" in S.pend[0]);
const pdNova = p => p.origem === "Síndico" && !p.vistaEm;
const PD = { novas:false, rows:new Map(), secs:new Map(), timers:new Map(), fila:Promise.resolve(), salvando:0, q:"", st:"", crit:"", cst:false, resp:"", hide:false, late:false, aprov:false, ord:"", versao:0, recolhidas:new Set(), carregando:false };
try { const f = JSON.parse(localStorage.getItem("pd-filtros")||"{}"); ["q","st","crit","resp","hide","ord"].forEach(k => { if (k in f) PD[k] = f[k]; }); } catch(e){}
try { PD.recolhidas = new Set(JSON.parse(localStorage.getItem("pd-recolhidas")||"[]")); } catch(e){}
const pdGuardarFiltros = () => { try { localStorage.setItem("pd-filtros", JSON.stringify({q:PD.q, st:PD.st, crit:PD.crit, resp:PD.resp, hide:PD.hide, ord:PD.ord})); } catch(e){} };
const pdGuardarRecolhidas = () => { try { localStorage.setItem("pd-recolhidas", JSON.stringify([...PD.recolhidas])); } catch(e){} };
// responsáveis sugeridos (o campo continua aceitando outro nome)
const PD_RESP_PADRAO = ["Gerência","Supervisor","Auxiliar","Síndico","Fornecedor","Manutenção","Limpeza","Jardinagem","Piscina"];
// menu suspenso do setor responsável; um nome antigo, digitado antes do menu, continua aparecendo como opção
const pdRespOpcoes = atual => {
  const lista = PD_RESP_PADRAO.slice().sort((a,b) => a.localeCompare(b,"pt-BR"));
  atual = String(atual||"").trim();
  if (atual && !lista.includes(atual)) lista.push(atual);
  return `<option value="">Sem responsável</option>` + lista.map(r => `<option value="${esc(r)}" ${r === atual ? "selected" : ""}>${esc(r)}</option>`).join("");
};
// formas de ordenar a lista dentro de cada seção (subitens sempre logo abaixo do item principal)
const PD_ORD = [["","Número (padrão)"],["alfa","Ordem alfabética (A–Z)"],["crit","Criticidade (alta primeiro)"],["venc","Vencimento (mais próximo primeiro)"],["novas","Data de criação (mais recentes)"],["antigas","Data de criação (mais antigas)"]];
// versão 2 do Apps Script: aprovações, atualização de prazo, prazo inicial alterável pelo síndico e aviso por e-mail
const pdV2 = () => PD.versao >= 2;
// versão 3: criar OS para a equipe a partir da pendência
const pdV3 = () => PD.versao >= 3;
const PD_OS_PRIO = ["Urgente","Alta","Normal","Baixa"];
// sugestão da OS a partir do responsável e da criticidade da pendência
const pdOSPadrao = (resp, crit) => ({
  setor: resp === "Limpeza" ? "Limpeza" : "Manutenção",
  categoria: ({Jardinagem:"Jardinagem", Piscina:"Piscina", Limpeza:"Limpeza"})[resp] || "",
  prioridade: ({Alta:"Alta", "Média":"Normal", Baixa:"Baixa"})[crit] || "Normal"
});
// campos da OS (equipe, categoria, local, prioridade, prazo); "cls" marca os campos para mostrar/esconder juntos
function pdCamposOS(d, cls){
  return `<div class="field ${cls}"><label for="no-setor">Equipe</label><select class="input" id="no-setor"><option value="Manutenção" ${d.setor!=="Limpeza"?"selected":""}>Manutenção (inclui jardinagem)</option><option value="Limpeza" ${d.setor==="Limpeza"?"selected":""}>Limpeza</option></select></div>
    <div class="field ${cls}"><label for="no-cat">Categoria</label><select class="input" id="no-cat"><option value="">Escolha</option>${OS_CATEGORIAS.map(c => `<option ${c===d.categoria?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
    <div class="field full ${cls}"><label for="no-local">Local do serviço <span class="req">*</span></label><input class="input" id="no-local" placeholder="Ex.: Piscina, Bloco 3, Garagem" value="${esc(d.local||"")}"></div>
    <div class="field ${cls}"><label for="no-prio">Prioridade da OS</label><select class="input" id="no-prio">${PD_OS_PRIO.map(x => `<option ${x===d.prioridade?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="field ${cls}"><label for="no-prazo">Prazo da OS</label><input class="input" id="no-prazo" type="date" value="${esc(d.prazo||"")}"><span class="hint">Em branco: o prazo da pendência ou o padrão da prioridade.</span></div>`;
}
function pdLerOS(msg){
  const local = $("#no-local").value.trim();
  if (!local) { msg.className = "hint err"; msg.textContent = "Informe o local do serviço da OS."; $("#no-local").focus(); return null; }
  return {setor:$("#no-setor").value, categoria:$("#no-cat").value, local, prioridade:$("#no-prio").value, prazo:$("#no-prazo").value};
}
// criar OS a partir de uma pendência já existente
function pdAbrirOS(id){
  const p = pdAchar(id); if (!p) return;
  const d = Object.assign(pdOSPadrao(String(p.responsavel||"").trim(), p.criticidade), {prazo: pdPrazoEf(p) || ""});
  $("#modal-box").innerHTML = `<h3>Criar OS para a equipe</h3>
    <p class="hint" style="margin:-6px 0 12px">Pendência <b>${esc(p.numero||"")} · ${esc(p.titulo||"")}</b>. A OS aparece na tela de OS do ambiente da equipe.</p>
    <form class="form-pend" id="f-pdos" novalidate autocomplete="off">
      ${pdCamposOS(d, "")}
      <div class="field full"><label for="no-desc">Descrição para a equipe</label><textarea class="input" id="no-desc" rows="3">${esc(p.obs||"")}</textarea></div>
      <div class="full actions"><button class="btn primary" type="submit" id="no-ok">Criar OS</button><button class="btn" type="button" id="no-no">Cancelar</button><span class="hint" id="no-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#no-local").focus();
  $("#no-no").onclick = fecharModal;
  $("#f-pdos").addEventListener("submit", ev => {
    ev.preventDefault();
    const msg = $("#no-msg"), os = pdLerOS(msg); if (!os) return;
    os.descricao = $("#no-desc").value.trim();
    const ok = $("#no-ok"); ok.disabled = true; msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> Criando a OS…`;
    pdEnviar("pendSalvar", {pend:{id, criarOS:os}}).then(res => {
      if (!res) { ok.disabled = false; msg.className = "hint err"; msg.textContent = "Não foi possível criar a OS. Tente de novo."; return; }
      fecharModal();
    });
  });
}
const pdAguardando = p => !!p && (p.aprovacao === "Aguardando gerente" || p.aprovacao === "Aguardando síndico");
const pdConclPend = p => !!p && !!String(p.conclPedida||"").trim() && p.status !== "Concluído";
// etapa que falta: {tipo:"inclusao"|"conclusao", etapa:"gerente"|"sindico"|"ambos"}
// inclusão: gerente e depois síndico; conclusão: gerente e síndico, cada um a sua parte, em qualquer ordem
const pdEtapa = p => {
  if (pdAguardando(p)) return {tipo:"inclusao", etapa: p.aprovacao === "Aguardando gerente" ? "gerente" : "sindico"};
  if (!pdConclPend(p)) return null;
  const g = !!String(p.conclGerente||"").trim(), s = !!String(p.conclSindico||"").trim();
  return {tipo:"conclusao", etapa: !g && !s ? "ambos" : g ? "sindico" : "gerente"};
};
const pdPossoAprovar = e => !!e && (e.tipo === "conclusao"
  ? (ehSindico() && e.etapa !== "gerente") || (ehGerente() && e.etapa !== "sindico")
  : e.etapa === "gerente" ? (ehGerente() || ehSindico()) : ehSindico());
const pdPrazoEf = p => (!pdConst(p) && p.prazoAtualizado) || p.prazo;
const pdMarca = x => { x = String(x||""); const [q, ...quem] = x.split(" · "); return q ? fData(q) + (q.length > 10 ? " " + q.slice(11,16) : "") + (quem.length ? " · " + quem.join(" · ") : "") : ""; };
// data de criação: a coluna "Incluída em" ou, nas pendências antigas, o instante guardado no próprio ID
const pdCriado = p => {
  if (p.criadaEm) { const t = Date.parse(String(p.criadaEm).replace(" ", "T") + (String(p.criadaEm).length <= 16 ? ":00" : "") + "-03:00"); if (!isNaN(t)) return t; }
  const m = /^pd([0-9a-z]{8})/.exec(String(p.id||"")); return m ? parseInt(m[1], 36) : 0;
};
const pdRotulo = s => s.rotulo || s.nome;
const pdSecaoDe = p => { const s = PD_SECOES.find(s => s.nome === p.secao || (s.antigas||[]).includes(p.secao)); return s ? s.nome : PD_OUTRAS; };
const pdAtrasada = p => { const d = pdPrazoEf(p); return d && p.status !== "Concluído" && d < hoje(); };
// prazo inicial de pendência pontual fica bloqueado depois de definido; com o Apps Script novo, o síndico pode alterar
// (a tarefa constante usa o prazo como próxima execução)
const pdPrazoFixo = p => !!(p && p.prazo && !pdConst(p)) && !(pdV2() && ehSindico());
const pdTemConcl = () => !S.pend || !S.pend.length || ("concluidoEm" in S.pend[0]);
const PD_CADEADO = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" fill-opacity=".15"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';
const pdDias = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
function pdConfirmarPrazo(id, valor){
  const r = PD.rows.get(id); if (!r) return;
  const velho = r.el.querySelector(".pd-conf[data-prazo]"); if (velho) velho.remove();
  const antes = (pdAchar(id) || {}).prazo || "";
  const txt = !antes ? ["Definir o prazo inicial para ", pdEl("b", {text:fData(valor)}), "? Depois de salvo, só o síndico pode alterar."]
    : valor ? ["Alterar o prazo inicial de ", pdEl("b", {text:fData(antes)}), " para ", pdEl("b", {text:fData(valor)}), "?"]
    : ["Retirar o prazo inicial (", pdEl("b", {text:fData(antes)}), ")?"];
  const box = pdEl("div", {class:"pd-conf", "data-prazo":"1"}, [pdEl("span", {}, txt)]);
  const sim = pdEl("button", {class:"btn small primary", type:"button", text: !antes ? "Bloquear prazo inicial" : valor ? "Alterar prazo inicial" : "Retirar prazo inicial"});
  const nao = pdEl("button", {class:"btn small", type:"button", text:"Cancelar"});
  sim.onclick = () => { box.remove(); pdSalvar(id, {prazo:valor}); };
  nao.onclick = () => { box.remove(); r.f.prazo.value = antes; };
  box.append(sim, nao); r.el.append(box);
}
const pdLista = () => (S.pend || []).slice().sort((a,b) => (Number(a.ordem)||9e9) - (Number(b.ordem)||9e9));
const pdAchar = id => (S.pend || []).find(p => p.id === id);
const pdEl = (tag, attrs={}, kids=[]) => { const n = document.createElement(tag); for (const [k,v] of Object.entries(attrs)) { if (k==="class") n.className = v; else if (k==="text") n.textContent = v; else n.setAttribute(k, v); } for (const x of [].concat(kids)) if (x != null) n.append(x); return n; };
const pdAuto = t => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };

async function carregarPend(){
  if (!TEM_ADM || !can("pendencias") || PD.carregando) return;
  // acabou de chegar junto com a entrada: não busca de novo
  if (PD.recebidoEm && Date.now() - PD.recebidoEm < 10000 && S.pend) { PD.recebidoEm = 0; renderPend(); return; }
  PD.carregando = true;
  try { const r = await api("pendencias"); PD.versao = Number(r.pendVersao) || 0; if (!PD.salvando) S.pend = r.pendencias || []; renderPend(); }
  catch(e){ if (!S.pend) $("#pd-body").innerHTML = `<div class="notice crit">${esc(e.message)}</div>`; toast(e.message, true); }
  finally { PD.carregando = false; }
}
// ---------- painel de pendências: cartões com os números do controle e gráfico dos últimos 12 meses ----------
// Tudo calculado na tela a partir das pendências já carregadas (não muda nada no Apps Script).
const PP_ICO = {
  total:'<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  ok:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  mes:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',
  andamento:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/>',
  pendente:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>',
  alta:'<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17h.01"/>',
  atraso:'<circle cx="12" cy="13.5" r="7"/><path d="M12 10.5V14l2.2 1.6M9.5 3h5M12 3v3.5"/>',
  aprov:'<path d="M12 3 5 6v5.5c0 4.2 3 7.6 7 9.5 4-1.9 7-5.3 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  nova:'<path d="m12 4 2.5 5.1 5.5.8-4 3.9.9 5.5L12 16.7l-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
  cst:'<path d="M4 11a8 8 0 0 1 14-4.6L20 8.5M20 4v4.5h-4.5M20 13a8 8 0 0 1-14 4.6L4 15.5M4 20v-4.5h4.5"/>'
};
const ppMes = ms => { if (!ms) return ""; const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const ppPlural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
function ppIr(f){
  // abre o Controle de pendências já filtrado pelo cartão escolhido
  Object.assign(PD, {q:"", st:f.st || "", crit:f.crit || "", resp:"", late:!!f.late, novas:!!f.novas, cst:!!f.cst, aprov:!!f.aprov, hide:!!f.crit});
  pdGuardarFiltros(); setTab("pendencias");
}
function renderPdPainel(){
  const sec = $("#t-pdpainel"), box = $("#pp-cards"); if (!sec || !box || sec.hidden) return;
  if (!S.pend) { box.innerHTML = `<div class="empty">Carregando pendências…</div>`; return; }
  const all = pdLista(), pont = all.filter(p => !pdConst(p)), cst = all.filter(pdConst);
  const n = s => pont.filter(p => p.status === s).length, pct = x => pont.length ? Math.round(x / pont.length * 100) : 0;
  const mes = hoje().slice(0, 7), feitas = n("Concluído");
  const feitasMes = pont.filter(p => p.status === "Concluído" && String(p.concluidoEm || "").slice(0, 7) === mes).length;
  const novasMes = pont.filter(p => ppMes(pdCriado(p)) === mes).length;
  const atrasadas = all.filter(pdAtrasada).length, cstVenc = cst.filter(pdAtrasada).length;
  const cards = [
    {k:"total", cor:"azul", rot:"Total de pendências", v:pont.length, sub: cst.length ? "+ " + ppPlural(cst.length, "tarefa constante", "tarefas constantes") : "", ir:{}},
    {k:"ok", cor:"verde", rot:"Concluídas", v:feitas, sub:`${pct(feitas)}% do total`, ir:{st:"Concluído"}},
    {k:"mes", cor:"teal", rot:"Concluídas este mês", v:feitasMes, sub:ppPlural(novasMes, "incluída este mês", "incluídas este mês"), ir:{st:"Concluído"}},
    {k:"andamento", cor:"info", rot:"Em andamento", v:n("Em andamento"), sub:`${pct(n("Em andamento"))}% do total`, ir:{st:"Em andamento"}},
    {k:"pendente", cor:"ambar", rot:"Pendentes", v:n("Pendente"), sub:`${pct(n("Pendente"))}% do total`, ir:{st:"Pendente"}}
  ];
  if (pdTemCrit()) cards.push({k:"alta", cor:"vermelho", rot:"Alta criticidade em aberto", v:all.filter(p => p.criticidade === "Alta" && p.status !== "Concluído").length, sub:"criticidade alta, ainda não concluídas", ir:{crit:"Alta"}});
  cards.push({k:"atraso", cor:"vermelho", rot:"Atrasadas", v:atrasadas, sub: atrasadas ? "com o prazo vencido" : "nenhuma com o prazo vencido", ir:{late:true}});
  if (pdV2()) { const ag = all.filter(pdEtapa).length; cards.push({k:"aprov", cor:"roxo", rot:"Aguardando aprovação", v:ag, sub:"inclusão ou conclusão", ir:{aprov:true}}); }
  if (!ehSindico()) cards.push({k:"nova", cor:"laranja", rot:"Novas do síndico", v:all.filter(pdNova).length, sub:"ainda não vistas", ir:{novas:true}});
  if (cst.length) cards.push({k:"cst", cor:"teal", rot:"Tarefas constantes", v:cst.length, sub: cstVenc ? ppPlural(cstVenc, "vencida", "vencidas") : "todas em dia", ir:{cst:true}});
  box.innerHTML = cards.map((c, i) => `<button type="button" class="pp-card" data-i="${i}" title="Ver na lista">
      <span class="pp-txt"><span class="pp-rot">${esc(c.rot)}</span><b class="pp-v num">${c.v}</b>${c.sub ? `<span class="pp-sub ${c.k === "ok" ? "ok" : ""}">${esc(c.sub)}</span>` : ""}</span>
      <span class="pp-ico ${c.cor}"><svg viewBox="0 0 24 24" aria-hidden="true">${PP_ICO[c.k]}</svg></span></button>`).join("");
  $$("#pp-cards .pp-card").forEach(b => b.onclick = () => ppIr(cards[+b.dataset.i].ir));
  ppGrafico();
}
function ppSeries(){
  const hojeD = new Date(), meses = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - i, 1); meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); }
  const pont = pdLista().filter(p => !pdConst(p));
  const criada = new Map(pont.map(p => [p.id, ppMes(pdCriado(p))]));
  const fim = p => p.status === "Concluído" ? String(p.concluidoEm || "").slice(0, 7) : "";
  return { meses, series: [
    {k:"inc", rot:"Incluídas", v: meses.map(m => pont.filter(p => criada.get(p.id) === m).length)},
    {k:"con", rot:"Concluídas", v: meses.map(m => pont.filter(p => fim(p) === m).length)},
    // em aberto no fim do mês: incluída até o mês e ainda não concluída nele (as concluídas sem data não contam)
    {k:"abe", rot:"Em aberto no fim do mês", v: meses.map(m => pont.filter(p => { const c = criada.get(p.id); if (c && c > m) return false; if (p.status !== "Concluído") return true; const f = fim(p); return !!f && f > m; }).length)}
  ]};
}
const PP_MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const ppRotMes = (m, i) => { const [a, mm] = m.split("-"); const r = PP_MESES[+mm - 1]; return i === 0 || mm === "01" ? `${r}/${a.slice(2)}` : r; };
function ppGrafico(){
  const el = $("#pp-graf"); if (!el || !S.pend || $("#t-pdpainel").hidden) return;
  const { meses, series } = ppSeries();
  const W = Math.max(300, Math.round(el.clientWidth || 600)), H = W < 560 ? 220 : 280;
  const pl = 34, pr = 12, pt = 12, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(1, ...series.flatMap(s => s.v));
  const passo = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5 / 50) * 50;
  const top = Math.ceil(max / passo) * passo;
  const x = i => pl + (iw * (i + .5)) / meses.length, y = v => pt + ih - (ih * v) / top;
  let g = "";
  for (let v = 0; v <= top; v += passo) g += `<line class="pp-grade" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="pp-eixo" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const pulo = W < 420 ? 2 : 1;
  meses.forEach((m, i) => { if (i % pulo === (meses.length - 1) % pulo) g += `<text class="pp-eixo" x="${x(i)}" y="${H - 9}" text-anchor="middle">${ppRotMes(m, i)}</text>`; });
  series.forEach(s => {
    g += `<polyline class="pp-linha ${s.k}" points="${s.v.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`;
    g += s.v.map((v, i) => `<circle class="pp-pto ${s.k}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5"><title>${ppRotMes(meses[i], 0)} · ${s.rot}: ${v}</title></circle>`).join("");
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pendências incluídas, concluídas e em aberto nos últimos 12 meses">${g}</svg>`;
  $("#pp-leg").innerHTML = series.map(s => `<span><i class="${s.k}"></i>${esc(s.rot)}</span>`).join("");
  $("#pp-tab").innerHTML = `<div class="tablebox"><table><thead><tr><th>Mês</th>${series.map(s => `<th class="num">${esc(s.rot)}</th>`).join("")}</tr></thead><tbody>${meses.map((m, i) => `<tr><td>${ppRotMes(m, 0)}</td>${series.map(s => `<td class="num">${s.v[i]}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
let ppRedim;
addEventListener("resize", () => { clearTimeout(ppRedim); ppRedim = setTimeout(() => { if (S.tab === "pdpainel") ppGrafico(); }, 150); });
if ($("#pp-abrir")) $("#pp-abrir").addEventListener("click", () => ppIr({}));
// ---------- Início (Administração): saudação, o que precisa de atenção, atalhos e últimas alterações ----------
const IN_ICO = {
  aprov: PP_ICO.aprov, nova: PP_ICO.nova, atraso: PP_ICO.atraso, alta: PP_ICO.alta,
  incluir:'<path d="M12 5v14M5 12h14"/>', lista: PP_ICO.total,
  dash:'<path d="M4 20h16M6.5 16.5V11M11 16.5V6.5M15.5 16.5v-4M20 16.5V8.5"/>',
  cot:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
  usu:'<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  hist:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>'
};
const inSvg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
function renderInicio(){
  const sec = $("#t-inicio"); if (!sec || sec.hidden) return;
  const h = new Date().getHours(), primeiro = String(S.nome || "").replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] || "";
  const dataLonga = new Date().toLocaleDateString("pt-BR", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
  $("#in-ola").textContent = (h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite") + (primeiro && !/^administra/i.test(primeiro) ? ", " + primeiro : "") + "!";
  $("#in-data").textContent = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);
  // atalhos: só o que a pessoa pode abrir
  const at = [
    {t:"pendencias", acao:"nova", ico:"incluir", rot:"Incluir pendência", d:"Registrar uma pendência nova"},
    {t:"pendencias", ico:"lista", rot:"Controle de pendências", d:"Situação, responsável e prazo"},
    {t:"pdpainel", ico:"dash", rot:"Dashboard", d:"Números e gráfico de 12 meses"},
    {t:"cotacoes", ico:"cot", rot:"Cotações", d:"Mapas, fornecedores e aprovação"},
    {t:"usuarios", ico:"usu", rot:"Usuários e permissões", d:"Logins, perfis e acessos"},
    {t:"acessos", ico:"hist", rot:"Histórico de acessos", d:"Entradas, alterações e segurança"}
  ].filter(a => podeAba(a.t) && $("#t-" + a.t));
  $("#in-atalhos").innerHTML = at.map(a => `<button type="button" class="in-atalho" data-t="${a.t}"${a.acao ? ` data-acao="${a.acao}"` : ""}><span class="in-aico">${inSvg(IN_ICO[a.ico])}</span><span><b>${esc(a.rot)}</b><small>${esc(a.d)}</small></span></button>`).join("");
  $$("#in-atalhos .in-atalho").forEach(b => b.onclick = () => { setTab(b.dataset.t); if (b.dataset.acao === "nova") pdAbrirNova(); });
  const temPend = can("pendencias");
  $("#in-pend-box").hidden = !temPend;
  if (!temPend) return;
  if (!S.pend) { $("#in-atencao").innerHTML = `<div class="empty">Carregando pendências…</div>`; $("#in-ult").innerHTML = ""; return; }
  const all = pdLista();
  const minhas = pdV2() ? all.filter(p => pdPossoAprovar(pdEtapa(p))).length : 0;
  const cards = [];
  if (ehGerente() || ehSindico()) cards.push({k:"aprov", cor:"roxo", rot:"Aguardando sua aprovação", v:minhas, ir:{aprov:true}});
  if (!ehSindico()) cards.push({k:"nova", cor:"laranja", rot:"Novas do síndico", v:all.filter(pdNova).length, ir:{novas:true}});
  cards.push({k:"atraso", cor:"vermelho", rot:"Atrasadas", v:all.filter(pdAtrasada).length, ir:{late:true}});
  if (pdTemCrit()) cards.push({k:"alta", cor:"vermelho", rot:"Alta criticidade em aberto", v:all.filter(p => p.criticidade === "Alta" && p.status !== "Concluído").length, ir:{crit:"Alta"}});
  const tudoOk = cards.every(c => !c.v);
  $("#in-atencao").innerHTML = cards.map((c, i) => `<button type="button" class="in-card ${c.v ? "" : "zero"}" data-i="${i}"><span class="pp-ico ${c.cor}">${inSvg(IN_ICO[c.k])}</span><span><b class="num">${c.v}</b><small>${esc(c.rot)}</small></span></button>`).join("")
    + (tudoOk ? `<p class="in-ok">Nada precisando de atenção agora.</p>` : "");
  $$("#in-atencao .in-card").forEach(b => b.onclick = () => ppIr(cards[+b.dataset.i].ir));
  // últimas pendências alteradas
  const ult = all.filter(p => p.atualizadoEm).sort((a, b) => String(b.atualizadoEm).localeCompare(String(a.atualizadoEm))).slice(0, 6);
  $("#in-ult").innerHTML = ult.length ? ult.map(p => `<li><button type="button" class="in-item" data-id="${esc(p.id)}"><span class="in-num">${esc(p.numero || "–")}</span><span class="in-tit">${esc(p.titulo || "")}</span><span class="pd-mini" data-s="${esc(p.status || "")}">${esc(p.status || "")}</span><small>${esc(fData(p.atualizadoEm))} ${esc(String(p.atualizadoEm).slice(11, 16))}${p.atualizadoPor ? " · " + esc(p.atualizadoPor) : ""}</small></button></li>`).join("")
    : `<li class="empty">Nenhuma alteração registrada ainda.</li>`;
  $$("#in-ult .in-item").forEach(b => b.onclick = () => {
    ppIr({}); const id = b.dataset.id;
    setTimeout(() => { const t = document.getElementById("pdt-" + id); if (t) { t.scrollIntoView({block:"center"}); t.focus({preventScroll:true}); } }, 60);
  });
}
// gravações uma de cada vez, na ordem em que foram feitas
function pdEnviar(acao, extra, aoConcluir){
  PD.salvando++;
  S.ocupado = true; renderSync();
  const p = PD.fila.then(async () => {
    try {
      const r = await api(acao, extra);
      if (aoConcluir) aoConcluir(r);
      if (r && r.pendencias) PD.versao = Number(r.pendVersao) || 0;
      if (PD.salvando === 1) { S.pend = r.pendencias || S.pend; }
      toast(r.msg || "Salvo.");
      return r;
    } catch(e){ toast(e.message, true); if (PD.salvando === 1) setTimeout(carregarPend, 300); return null; }
    finally { PD.salvando--; if (!PD.salvando) { S.ocupado = false; renderSync(); renderPend(); } }
  });
  PD.fila = p.catch(() => null);
  return p;
}
function pdSalvar(id, patch){
  const p = pdAchar(id); if (p) Object.assign(p, patch);
  return pdEnviar("pendSalvar", {pend:Object.assign({id}, patch)});
}
function pdSalvarDepois(id, campo, valor){
  const k = id + ":" + campo; clearTimeout(PD.timers.get(k));
  const p = pdAchar(id); if (p) p[campo] = valor;
  PD.timers.set(k, setTimeout(() => { PD.timers.delete(k); pdSalvar(id, {[campo]:valor}); }, 800));
}

function pdFiltros(){
  const fs = $("#pd-fs");
  if (!fs.options.length) fs.innerHTML = `<option value="">Todas as situações</option>` + PD_STATUS.map(s => `<option>${esc(s)}</option>`).join("");
  fs.value = PD.st;
  const fc = $("#pd-fc");
  if (!fc.options.length) fc.innerHTML = `<option value="">Todas as criticidades</option>` + PD_CRIT.map(s => `<option>${esc(s)}</option>`).join("") + `<option value="__sem">Sem criticidade</option>`;
  fc.value = PD.crit;
  const resps = [...new Set(PD_RESP_PADRAO.concat(pdLista().map(p => (p.responsavel||"").trim())).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const dl = $("#pd-resps");
  if (dl && dl.options.length !== resps.length) dl.innerHTML = resps.map(r => `<option value="${esc(r)}"></option>`).join("");
  const fo = $("#pd-ord");
  if (fo) { if (!fo.options.length) fo.innerHTML = PD_ORD.map(([v,t]) => `<option value="${v}">Ordenar: ${esc(t)}</option>`).join(""); fo.value = PD_ORD.some(o => o[0] === PD.ord) ? PD.ord : ""; }
  const fr = $("#pd-fr");
  fr.innerHTML = `<option value="">Todos os responsáveis</option><option value="__sem">Sem responsável</option>` + resps.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join("");
  fr.value = [...fr.options].some(o => o.value === PD.resp) ? PD.resp : "";
  if (document.activeElement !== $("#pd-q")) $("#pd-q").value = PD.q;
  $("#pd-hide").checked = PD.hide;
}
function pdPassa(p){
  if (PD.crit === "__sem" && p.criticidade) return false;
  if (PD.crit && PD.crit !== "__sem" && p.criticidade !== PD.crit) return false;
  if (PD.hide && p.status === "Concluído" && !pdConst(p)) return false;
  if (PD.st && p.status !== PD.st) return false;
  const r = (p.responsavel||"").trim();
  if (PD.resp === "__sem" && r) return false;
  if (PD.resp && PD.resp !== "__sem" && r !== PD.resp) return false;
  if (PD.late && !pdAtrasada(p)) return false;
  if (PD.novas && !pdNova(p)) return false;
  if (PD.cst && !pdConst(p)) return false;
  if (PD.aprov && !pdEtapa(p)) return false;
  if (PD.q && !norm([p.numero, p.titulo, p.obs, p.responsavel].join(" ")).includes(norm(PD.q))) return false;
  return true;
}
function pdResumo(){
  const all = pdLista(), pont = all.filter(p => !pdConst(p)), n = s => pont.filter(p => p.status === s).length;
  const feitas = n("Concluído"), atrasadas = all.filter(pdAtrasada).length, constantes = all.length - pont.length;
  const itens = [
    // sem os contadores "aguardando entrega", "aguardando síndico" e "a cotar" (pedido de 22/10/2026);
    // essas situações continuam no filtro "Todas as situações" e na própria pendência
    {l:"pendências", v:pont.length, st:""}, {l:"em andamento", v:n("Em andamento"), st:"Em andamento"},
    {l:"pendentes", v:n("Pendente"), st:"Pendente"},
    {l:"concluídas", v:feitas, st:"Concluído"}, {l:"atrasadas", v:atrasadas, st:"", late:true}
  ];
  const altas = all.filter(p => p.criticidade === "Alta" && p.status !== "Concluído").length;
  if (pdTemCrit()) itens.splice(1, 0, {l:"alta criticidade em aberto", v:altas, st:"", crit:"Alta"});
  if (constantes) itens.push({l: constantes === 1 ? "tarefa constante" : "tarefas constantes", v:constantes, st:"", cst:true});
  const aguardam = pdV2() ? all.filter(pdEtapa).length : 0;
  if (PD.aprov && !aguardam) PD.aprov = false;
  if (aguardam) itens.splice(1, 0, {l:"aguardando aprovação", v:aguardam, st:"", aprov:true});
  const novas = all.filter(pdNova).length;
  if (PD.novas && !novas) PD.novas = false;
  if (novas && !ehSindico()) itens.unshift({l: novas === 1 ? "nova do síndico" : "novas do síndico", v:novas, st:"", novas:true});
  const marcado = it => it.aprov ? PD.aprov : it.cst ? PD.cst : it.novas ? PD.novas : it.late ? PD.late : it.crit ? (PD.crit === it.crit && PD.hide && !PD.st) : (!PD.late && !PD.novas && !PD.cst && !PD.aprov && PD.st === it.st && (it.st || (it.l === "pendências" && !PD.crit)));
  $("#pd-stats").innerHTML = itens.map((it,i) => `<button type="button" class="pd-stat ${it.late?"late":""} ${it.novas?"nova":""} ${it.crit?"alta":""} ${it.cst?"cst":""} ${it.aprov?"aprov":""}" data-i="${i}" aria-pressed="${marcado(it) ? "true" : "false"}"><b>${it.v}</b><span>${esc(it.l)}</span></button>`).join("");
  $$("#pd-stats .pd-stat").forEach(b => b.onclick = () => { const it = itens[+b.dataset.i]; PD.st = it.st; PD.late = !!it.late; PD.novas = !!it.novas; PD.cst = !!it.cst; PD.aprov = !!it.aprov; PD.crit = it.crit || ""; if (it.crit) PD.hide = true; if (it.st === "Concluído" || it.novas || it.aprov) PD.hide = false; pdGuardarFiltros(); renderPend(); });
  const pct = pont.length ? Math.round(feitas/pont.length*100) : 0;
  $("#pd-bar").style.width = pct + "%";
  $("#pd-prog").textContent = all.length ? `${feitas} de ${pont.length} concluídas (${pct}%)` + (constantes ? ` · ${constantes} tarefa${constantes===1?"":"s"} constante${constantes===1?"":"s"} à parte` : "") + (PD.late ? " · mostrando só as atrasadas" : PD.aprov ? " · mostrando só as que aguardam aprovação" : PD.novas ? " · mostrando só as novas do síndico" : PD.cst ? " · mostrando só as tarefas constantes" : "") : "Nenhuma pendência cadastrada";
}
function pdLinha(id){
  const f = {};
  f.num = pdEl("div", {class:"pd-num"});
  f.tit = pdEl("textarea", {class:"pd-tit", rows:"1", "aria-label":"Pendência", id:"pdt-"+id});
  f.obs = pdEl("textarea", {class:"pd-obs", rows:"1", placeholder:"Adicionar observação", "aria-label":"Observação", id:"pdo-"+id});
  f.meta = pdEl("div", {class:"pd-meta"});
  f.st = pdEl("select", {class:"input pd-st", "aria-label":"Situação", id:"pds-"+id});
  f.st.innerHTML = PD_STATUS.map(s => `<option>${esc(s)}</option>`).join("");
  f.resp = pdEl("select", {class:"input pd-resp", "aria-label":"Responsável", id:"pdr-"+id});
  f.prazo = pdEl("input", {class:"input pd-prazo", type:"date", "aria-label":"Prazo", id:"pdp-"+id});
  f.prazoFixo = pdEl("div", {class:"pd-prazo-fixo", hidden:""});
  f.prazo2 = pdEl("input", {class:"input pd-prazo2", type:"date", "aria-label":"Atualização de prazo", id:"pdu-"+id});
  f.lblPrazo2 = pdEl("div", {class:"pd-lbl pd-lbl2", text:"Atualização de prazo"});
  f.concl = pdEl("input", {class:"input pd-concl", type:"date", "aria-label":"Concluída em", id:"pdk-"+id});
  f.lblConcl = pdEl("div", {class:"pd-lbl", text:"Concluída em"});
  f.crit = pdEl("select", {class:"input pd-crit", "aria-label":"Criticidade", id:"pdc-"+id});
  f.crit.innerHTML = `<option value="">Criticidade</option>` + ["Baixa","Média","Alta"].map(s => `<option>${esc(s)}</option>`).join("");
  f.crit.addEventListener("change", () => { f.crit.dataset.c = f.crit.value; pdSalvar(id, {criticidade:f.crit.value}); });
  f.del = pdEl("button", {class:"pd-del", type:"button", title:"Excluir pendência", "aria-label":"Excluir pendência", text:"×"});
  f.cst = pdEl("div", {class:"pd-cst", hidden:""});
  f.lblSt = pdEl("div", {class:"pd-lbl", text:"Situação"});
  f.lblPrazo = pdEl("div", {class:"pd-lbl", text:"Prazo inicial"});
  f.tit.addEventListener("input", () => { pdAuto(f.tit); if (f.tit.value.trim()) pdSalvarDepois(id, "titulo", f.tit.value.trim()); });
  f.obs.addEventListener("input", () => { pdAuto(f.obs); pdSalvarDepois(id, "obs", f.obs.value); });
  f.st.addEventListener("change", () => {
    const p = pdAchar(id);
    // concluir exige a data de conclusão (e, com o Apps Script novo, vira um pedido para o gerente e o síndico aprovarem)
    if (p && f.st.value === "Concluído" && p.status !== "Concluído") {
      f.st.value = PD_STATUS.includes(p.status) ? p.status : "Pendente"; f.st.dataset.s = f.st.value;
      pdPedirConclusao(id); return;
    }
    f.st.dataset.s = f.st.value;
    if (p && pdTemConcl() && f.st.value !== "Concluído") p.concluidoEm = "";
    pdSalvar(id, {status:f.st.value});
  });
  f.resp.addEventListener("change", () => { f.resp.dataset.v = f.resp.value; pdSalvar(id, {responsavel:f.resp.value}); });
  f.prazo.addEventListener("change", () => {
    const p = pdAchar(id) || {};
    if (pdConst(p)) { pdSalvar(id, {prazo:f.prazo.value}); return; }
    if (f.prazo.value || p.prazo) pdConfirmarPrazo(id, f.prazo.value);
  });
  f.prazo2.addEventListener("change", () => pdSalvar(id, {prazoAtualizado:f.prazo2.value}));
  f.concl.addEventListener("change", () => {
    const v = f.concl.value, p = pdAchar(id) || {};
    if (v && v > hoje()) { toast("A data de conclusão não pode ser depois de hoje.", true); f.concl.value = p.concluidoEm || ""; return; }
    if (p.status !== "Concluído") { f.concl.value = ""; if (v) pdPedirConclusao(id, v); return; }
    if (!v) { toast("A data de conclusão é obrigatória.", true); f.concl.value = p.concluidoEm || ""; return; }
    pdSalvar(id, {concluidoEm: v});
  });
  f.del.addEventListener("click", () => pdConfirmar(id));
  const el = pdEl("div", {class:"pd-row"}, [
    f.num, pdEl("div", {class:"pd-main"}, [f.tit, f.obs, f.meta]),
    pdEl("div", {class:"c-st"}, [f.lblSt, f.st, f.cst]),
    pdEl("div", {class:"c-crit"}, [pdEl("div", {class:"pd-lbl", text:"Criticidade"}), f.crit]),
    pdEl("div", {class:"c-resp"}, [pdEl("div", {class:"pd-lbl", text:"Responsável"}), f.resp]),
    pdEl("div", {class:"c-prazo"}, [f.lblPrazo, f.prazo, f.prazoFixo, f.lblPrazo2, f.prazo2]),
    pdEl("div", {class:"c-concl"}, [f.lblConcl, f.concl]),
    pdEl("div", {class:"c-del"}, [f.del])
  ]);
  const r = {el, f}; PD.rows.set(id, r); return r;
}
const pdPor = (inp, v) => { if (document.activeElement !== inp && inp.value !== v) inp.value = v; };
function pdAtualizar(p){
  const r = PD.rows.get(p.id) || pdLinha(p.id), f = r.f;
  f.num.textContent = p.numero || "—";
  pdPor(f.tit, p.titulo||""); pdPor(f.obs, p.obs||"");
  if (document.activeElement !== f.resp) {
    const rv = String(p.responsavel||"").trim();
    if (f.resp.dataset.o !== rv) { f.resp.innerHTML = pdRespOpcoes(rv); f.resp.dataset.o = rv; }
    f.resp.value = rv; f.resp.dataset.v = rv;
  }
  if (pdPrazoFixo(p)) {
    f.prazo.hidden = true; f.prazoFixo.hidden = false;
    const ass = p.prazo + "|" + (p.prazoDefinidoEm||"") + "|" + (p.prazoDefinidoPor||"");
    if (f.prazoFixo.dataset.a !== ass) {
      f.prazoFixo.dataset.a = ass;
      f.prazoFixo.innerHTML = PD_CADEADO + `<span>${esc(fData(p.prazo))}</span>`;
      f.prazoFixo.title = "Prazo inicial bloqueado" + (p.prazoDefinidoEm ? ` desde ${fData(p.prazoDefinidoEm)}` : "") + (p.prazoDefinidoPor ? ` por ${p.prazoDefinidoPor}` : "") + (pdV2() ? ". Só o síndico pode alterar; use a Atualização de prazo." : ". Correção só direto na planilha.");
    }
  } else {
    f.prazoFixo.hidden = true; f.prazo.hidden = false;
    if (!r.el.querySelector(".pd-conf[data-prazo]")) pdPor(f.prazo, p.prazo||"");
  }
  pdPor(f.concl, p.concluidoEm||"");
  f.concl.dataset.cheio = p.concluidoEm ? "1" : "";
  // com o Apps Script novo, a data de uma pendência já concluída só é corrigida pelo gerente ou pelo síndico
  f.concl.disabled = pdV2() && p.status === "Concluído" && !(ehGerente() || ehSindico());
  pdPor(f.prazo2, p.prazoAtualizado||"");
  f.prazo2.dataset.cheio = p.prazoAtualizado ? "1" : "";
  if (document.activeElement !== f.st) { f.st.value = PD_STATUS.includes(p.status) ? p.status : "Pendente"; f.st.dataset.s = f.st.value; }
  if (document.activeElement !== f.crit) { f.crit.value = PD_CRIT.includes(p.criticidade) ? p.criticidade : ""; f.crit.dataset.c = f.crit.value; }
  f.crit.disabled = !pdTemCrit();
  const cst = pdConst(p), sub = pdEhSub(p);
  r.el.classList.toggle("alta", p.criticidade === "Alta" && (cst || p.status !== "Concluído"));
  f.st.hidden = cst; f.cst.hidden = !cst;
  f.lblSt.textContent = cst ? "Tarefa constante" : "Situação";
  f.lblPrazo.textContent = cst ? "Próxima execução" : "Prazo inicial";
  f.concl.hidden = cst || !pdTemConcl(); f.lblConcl.hidden = f.concl.hidden;
  f.prazo.title = cst ? "Próxima execução" : "Prazo inicial";
  f.prazo2.hidden = cst || !pdV2(); f.lblPrazo2.hidden = f.prazo2.hidden;
  if (cst) {
    const ass = [p.frequencia, p.ultimaVez, p.prazo, pdAtrasada(p)].join("|");
    if (f.cst.dataset.a !== ass) {
      f.cst.dataset.a = ass;
      f.cst.innerHTML = `<span class="pd-cst-pill ${pdAtrasada(p) ? "venc" : ""}">${esc(p.frequencia || "Mensal")}${pdAtrasada(p) ? " · vencida" : ""}</span><button type="button" class="btn small pd-feito" data-feito="${esc(p.id)}">✓ Feito hoje</button>`;
    }
  }
  const nova = pdNova(p);
  const quando = p.atualizadoEm ? `Atualizado em ${fData(p.atualizadoEm)} ${String(p.atualizadoEm).slice(11,16)}${p.atualizadoPor ? " por "+p.atualizadoPor : ""}` : "";
  const fimPrazo = !cst && p.status === "Concluído" && p.concluidoEm && p.prazo ? pdDias(p.prazo, p.concluidoEm) : null;
  const etapa = pdV2() ? pdEtapa(p) : null;
  const assinatura = [nova, p.criadaPor, quando, ehSindico(), ehGerente(), cst, p.ultimaVez, sub, pdTemNovos(), fimPrazo, etapa && etapa.tipo, etapa && etapa.etapa, p.conclData, p.os, p.osStatus, pdV3(), p.cotNumero, p.cotStatus].join("|");
  if (f.meta.dataset.a !== assinatura) {
    f.meta.dataset.a = assinatura;
    f.meta.innerHTML = (nova ? `<span class="pd-nova-pill">Nova do síndico</span>${ehSindico() ? "" : `<button type="button" class="btn small pd-ciente" data-ciente="${esc(p.id)}">Ciente</button>`}` : "")
      + (etapa ? pdAprovHtml(p, etapa) : "")
      + (p.cotNumero ? `<button type="button" class="pd-ospill pd-cotpill" data-cot="${esc(p.cotId)}" title="Abrir a cotação desta pendência">${esc(p.cotNumero)} · ${esc(p.cotStatus)}</button>` : "")
      + (p.os ? `<span class="pd-ospill ${p.osStatus === "Concluída" ? "ok" : p.osStatus === "Cancelada" ? "canc" : ""}" title="OS criada a partir desta pendência">${esc(p.os)}${p.osSetor ? " · " + esc(p.osSetor) : ""}${p.osStatus ? " · " + esc(p.osStatus) : ""}</span>` : "")
      + (fimPrazo !== null ? `<span class="pd-fim ${fimPrazo > 0 ? "atraso" : "ok"}">${fimPrazo > 0 ? `Concluída ${fimPrazo} dia${fimPrazo===1?"":"s"} após o prazo` : "Concluída no prazo"}</span>` : "")
      + (cst ? `<span class="pd-ult">Última execução: <b>${p.ultimaVez ? fDia(p.ultimaVez) : "ainda não registrada"}</b></span>` : "")
      + `<span>${p.criadaPor && p.criadaPor !== "undefined" && p.origem && p.origem !== "undefined" ? "Incluída por " + esc(p.criadaPor) + " · " : ""}${esc(quando)}</span>`
      + (pdTemNovos() ? `<span class="pd-acoes">${sub ? "" : `<button type="button" class="link" data-sub="${esc(p.id)}">+ subitem</button>`}<button type="button" class="link" data-editar="${esc(p.id)}">editar</button>${pdV3() && (!p.os || p.osStatus === "Cancelada") ? `<button type="button" class="link" data-os="${esc(p.id)}">+ OS</button>` : ""}${"cotId" in p && !p.cotNumero && !pdConst(p) && p.status !== "Concluído" ? `<button type="button" class="link" data-novacot="${esc(p.id)}">+ Cotação</button>` : ""}</span>` : "");
  }
  r.el.classList.toggle("nova", nova);
  r.el.classList.toggle("done", p.status === "Concluído" && !cst);
  r.el.classList.toggle("late", !!pdAtrasada(p));
  r.el.classList.toggle("sub", sub);
  r.el.classList.toggle("constante", cst);
  r.el.classList.toggle("aguardando", !!etapa);
  return r.el;
}
// selo da aprovação que falta e os botões de quem pode aprovar esta etapa
function pdAprovHtml(p, e){
  const quem = e.etapa === "ambos" ? "gerente e síndico" : e.etapa === "gerente" ? "gerente" : "síndico";
  const selo = e.tipo === "inclusao" ? `Aguardando aprovação do ${quem}` : `Conclusão em ${fData(p.conclData)} aguardando ${quem}`;
  let b = "";
  if (pdPossoAprovar(e)) {
    const rot = e.tipo === "conclusao" ? (ehSindico() && e.etapa !== "gerente" ? "Aprovar conclusão (síndico)" : "Aprovar conclusão (gerente)")
      : e.etapa === "sindico" ? "Aprovar (síndico)" : ehGerente() ? "Aprovar (gerente)" : "Aprovar em nome do gerente";
    b += `<button type="button" class="btn small primary pd-aprovar" data-aprovar="${e.tipo}" data-id="${esc(p.id)}">${rot}</button>`;
  }
  if (e.tipo === "conclusao" && (ehGerente() || ehSindico())) b += `<button type="button" class="btn small pd-recusar" data-recusar="${esc(p.id)}">Recusar conclusão</button>`;
  return `<span class="pd-aprov ${e.tipo === "conclusao" ? "concl" : ""}">${esc(selo)}</span>${b}`;
}
// concluir: pede a data (obrigatória); com o Apps Script novo, o pedido vai para o gerente e o síndico aprovarem
function pdPedirConclusao(id, sugestao){
  const r = PD.rows.get(id), p = pdAchar(id); if (!r || !p) return;
  if (pdV2() && pdAguardando(p)) { toast("Esta pendência ainda aguarda a aprovação de inclusão (gerente e síndico). A conclusão só pode ser pedida depois.", true); return; }
  if (pdV2() && pdConclPend(p)) { toast("A conclusão desta pendência já foi pedida e aguarda aprovação.", true); return; }
  const velho = r.el.querySelector(".pd-conf[data-concl]"); if (velho) velho.remove();
  const data = pdEl("input", {class:"input", type:"date", max:hoje(), "aria-label":"Data de conclusão", id:"pdcc-"+id});
  if (sugestao) data.value = sugestao;
  const box = pdEl("div", {class:"pd-conf", "data-concl":"1"}, [pdEl("label", {for:"pdcc-"+id}, [pdEl("b", {text:"Data de conclusão"}), " (obrigatória)"]), data]);
  const sim = pdEl("button", {class:"btn small primary", type:"button", text: pdV2() ? "Pedir conclusão" : "Concluir"});
  const nao = pdEl("button", {class:"btn small", type:"button", text:"Cancelar"});
  const dica = pdEl("span", {class:"hint", text: pdV2() ? "A pendência só fica concluída depois da aprovação do gerente e do síndico (em qualquer ordem)." : ""});
  sim.onclick = () => {
    const d = data.value;
    if (!d) { toast("Informe a data de conclusão.", true); data.focus(); return; }
    if (d > hoje()) { toast("A data de conclusão não pode ser depois de hoje.", true); data.focus(); return; }
    box.remove();
    if (pdV2()) pdEnviar("pendSalvar", {pend:{id, status:"Concluído", concluidoEm:d}});
    else pdSalvar(id, {status:"Concluído", concluidoEm:d});
  };
  nao.onclick = () => box.remove();
  box.append(sim, nao, dica); r.el.append(box); data.focus();
}
function pdConfirmar(id){
  const r = PD.rows.get(id); if (!r || r.el.querySelector(".pd-conf")) return;
  const p = pdAchar(id) || {};
  const nf = pdEhSub(p) ? 0 : pdFilhos(p).length;
  const box = pdEl("div", {class:"pd-conf"}, [pdEl("span", {text:`Excluir "${String(p.titulo||"esta pendência").slice(0,60)}"${nf ? ` e ${nf === 1 ? "o seu subitem" : `os seus ${nf} subitens`}` : ""}?`})]);
  const sim = pdEl("button", {class:"btn small danger", type:"button", text:"Sim, excluir"});
  const nao = pdEl("button", {class:"btn small", type:"button", text:"Manter"});
  sim.onclick = () => { sim.disabled = true; pdEnviar("pendExcluir", {id}).then(res => { if (!res) box.remove(); }); };
  nao.onclick = () => box.remove();
  box.append(sim, nao); r.el.append(box);
}
function pdSecao(s){
  const ix = PD_SECOES.indexOf(s);
  const list = pdEl("div", {class:"pd-list", id:"pd-lista-"+ix}), cnt = pdEl("span", {class:"cnt"}), bar = pdEl("i");
  const add = pdEl("button", {class:"btn small", type:"button", text:"+ Adicionar item"});
  // o título é o botão de expandir/recolher a seção
  const tog = pdEl("button", {class:"pd-tog", type:"button", "aria-expanded":"true", "aria-controls":"pd-lista-"+ix, title:"Expandir ou recolher"}, [pdRotulo(s)]);
  const sec = pdEl("section", {class:"pd-sec"}, [pdEl("div", {class:"sh"}, [pdEl("h3", {}, [tog]), cnt, pdEl("span", {class:"sbar", "aria-hidden":"true"}, [bar]), add]), list]);
  tog.onclick = () => { if (PD.recolhidas.has(s.nome)) PD.recolhidas.delete(s.nome); else PD.recolhidas.add(s.nome); pdGuardarRecolhidas(); renderPend(); };
  add.onclick = () => { if (PD.recolhidas.delete(s.nome)) { pdGuardarRecolhidas(); renderPend(); } pdNovo(s.nome); };
  const o = {sec, list, cnt, bar, tog, vazio:pdEl("div", {class:"empty"})}; PD.secs.set(s.nome, o); return o;
}
// ordena os itens principais pelo critério escolhido; cada subitem continua logo abaixo do seu item principal
function pdOrdenar(lista){
  if (!PD.ord) return lista;
  const ids = new Set(lista.map(p => p.id)), filhos = new Map(), raiz = [];
  const paiDe = p => p.pai ? lista.find(x => x.id === p.pai) : lista.find(x => !pdEhSub(x) && x.numero && String(p.numero).startsWith(x.numero + "."));
  for (const p of lista) {
    const pai = pdEhSub(p) ? paiDe(p) : null;
    if (pai && ids.has(pai.id) && pai.id !== p.id) { if (!filhos.has(pai.id)) filhos.set(pai.id, []); filhos.get(pai.id).push(p); }
    else raiz.push(p);
  }
  const pos = new Map(lista.map((p,i) => [p.id, i]));
  const CR = {"Alta":0, "Média":1, "Baixa":2};
  const aberto = p => pdConst(p) || p.status !== "Concluído";
  const cmp = {
    alfa: (a,b) => String(a.titulo||"").trim().localeCompare(String(b.titulo||"").trim(), "pt-BR", {sensitivity:"base", numeric:true}),
    crit: (a,b) => (CR[a.criticidade] ?? 3) - (CR[b.criticidade] ?? 3),
    venc: (a,b) => (aberto(b) - aberto(a)) || ((pdPrazoEf(a) ? 0 : 1) - (pdPrazoEf(b) ? 0 : 1)) || String(pdPrazoEf(a)||"").localeCompare(String(pdPrazoEf(b)||"")),
    novas: (a,b) => pdCriado(b) - pdCriado(a),
    antigas: (a,b) => pdCriado(a) - pdCriado(b)
  }[PD.ord];
  if (!cmp) return lista;
  raiz.sort((a,b) => cmp(a,b) || pos.get(a.id) - pos.get(b.id));
  return raiz.flatMap(p => [p].concat(filhos.get(p.id) || []));
}
function pdNovo(secao){
  const o = PD.secs.get(secao); const ja = o.list.querySelector(".pd-new"); if (ja) { ja.querySelector("input").focus(); return; }
  const inp = pdEl("input", {class:"input", placeholder:"Descreva a nova pendência", "aria-label":"Nova pendência", id:"pdn-"+PD_SECOES.findIndex(s => s.nome === secao)});
  const ix = PD_SECOES.findIndex(s => s.nome === secao);
  const prz = pdEl("input", {class:"input", type:"date", id:"pdnp-"+ix, "aria-label":"Prazo inicial (fica bloqueado depois de salvo)"});
  const ok = pdEl("button", {class:"btn small primary", type:"submit", text:"Adicionar"});
  const cancelar = pdEl("button", {class:"btn small", type:"button", text:"Cancelar"});
  const form = pdEl("form", {class:"pd-new"}, [inp, pdEl("label", {class:"pd-new-prazo", for:"pdnp-"+ix}, [pdEl("span", {text:"Prazo inicial (fica bloqueado)"}), prz]), ok, cancelar]);
  cancelar.onclick = () => form.remove();
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const titulo = inp.value.trim(); if (!titulo) { inp.focus(); return; }
    ok.disabled = true;
    pdEnviar("pendSalvar", {pend:Object.assign({secao, titulo}, prz.value ? {prazo:prz.value} : {})}).then(res => { if (res) form.remove(); else ok.disabled = false; });
  });
  o.list.prepend(form); inp.focus();
}
function renderPend(){
  if (!TEM_ADM || !can("pendencias") || !S.pend) return;
  renderPdPainel(); renderInicio();
  pdFiltros(); pdResumo();
  const body = $("#pd-body");
  if (!PD.secs.size) { body.textContent = ""; PD_SECOES.forEach(s => body.append(pdSecao(s).sec)); }
  pdBadge();
  $("#pd-aviso").hidden = pdTemCrit() && pdTemNovos() && pdTemConcl();
  const av2 = $("#pd-aviso2"); if (av2) av2.hidden = pdV2() || !can("usuarios");
  const all = pdLista(), filtro = !!(PD.q || PD.st || PD.crit || PD.resp || PD.hide || PD.late || PD.novas || PD.cst || PD.aprov);
  for (const s of PD_SECOES) {
    const o = PD.secs.get(s.nome);
    const daSecao = all.filter(p => pdSecaoDe(p) === s.nome);
    const vis = pdOrdenar(daSecao).filter(pdPassa);
    // seção recolhida (a busca por texto mostra tudo, para nada ficar escondido)
    const recolhida = PD.recolhidas.has(s.nome) && !PD.q;
    o.sec.classList.toggle("recolhida", recolhida); o.list.hidden = recolhida; o.tog.setAttribute("aria-expanded", recolhida ? "false" : "true");
    const feitas = daSecao.filter(p => p.status === "Concluído").length;
    o.cnt.textContent = daSecao.length ? `${feitas}/${daSecao.length} concluídas` : "sem itens";
    o.bar.style.width = (daSecao.length ? feitas/daSecao.length*100 : 0) + "%";
    o.sec.hidden = filtro && !vis.length;
    const quero = vis.map(pdAtualizar);
    const agora = [...o.list.children].filter(c => c.classList.contains("pd-row"));
    if (!(agora.length === quero.length && agora.every((c,i) => c === quero[i]))) {
      const form = o.list.querySelector(".pd-new");
      o.list.textContent = ""; if (form) o.list.append(form); quero.forEach(w => o.list.append(w));
    }
    if (!quero.length) { o.vazio.textContent = s.nome === PD_OUTRAS ? "Inclua aqui as demandas que a administração já está tocando e que não estão na lista do síndico." : "Nenhum item."; if (!o.vazio.isConnected) o.list.append(o.vazio); }
    else if (o.vazio.isConnected) o.vazio.remove();
  }
  for (const id of [...PD.rows.keys()]) if (!pdAchar(id)) { PD.rows.get(id).el.remove(); PD.rows.delete(id); }
  const rb = $("#pd-recolher");
  if (rb) { const todas = PD_SECOES.every(s => PD.recolhidas.has(s.nome)); rb.textContent = todas ? "Expandir todas" : "Recolher todas"; rb.setAttribute("aria-pressed", todas ? "true" : "false"); }
  requestAnimationFrame(() => $$("#pd-body .pd-tit, #pd-body .pd-obs").forEach(pdAuto));
}
function pdBadge(){
  const b = $("#b-adm"); if (!b) return;
  const novas = S.pend && !ehSindico() ? S.pend.filter(pdNova).length : 0;
  const aprovar = S.pend && pdV2() ? S.pend.filter(p => pdPossoAprovar(pdEtapa(p))).length : 0;
  const n = novas + aprovar;
  b.textContent = n; b.hidden = !n;
  b.title = [novas ? `${novas} pendência${novas===1?"":"s"} nova${novas===1?"":"s"} do síndico` : "", aprovar ? `${aprovar} aguardando a sua aprovação` : ""].filter(Boolean).join(" · ");
}
// formulário único: incluir pendência, incluir subitem ou editar uma pendência
function pdAbrirNova(secaoPadrao){ pdAbrirForm({secao:secaoPadrao}); }
function pdAbrirForm(o){
  if (!TEM_ADM || !can("pendencias")) return;
  o = o || {};
  const ed = o.editar ? pdAchar(o.editar) : null;
  const pai = o.pai ? pdAchar(o.pai) : (ed && ed.pai ? pdAchar(ed.pai) : null);
  const ehSub = !!(o.pai || (ed && pdEhSub(ed)));
  const v = ed || {secao: pai ? pai.secao : (o.secao || (ehSindico() ? "" : PD_OUTRAS)), titulo:"", obs:"", criticidade: pai ? pai.criticidade || "" : "", prazo:"", responsavel:"", tipo:"", frequencia:"Mensal", status:"Pendente"};
  const novos = pdTemNovos();
  const titulo = ed ? (ehSub ? `Editar subitem ${esc(ed.numero||"")}` : `Editar pendência ${esc(ed.numero||"")}`) : pai ? "Incluir subitem" : "Incluir pendência";
  const execs = ed && pdConst(ed) ? String(ed.execucoes||"").split(";").map(s => s.trim()).filter(Boolean) : [];
  $("#modal-box").innerHTML = `<h3>${titulo}</h3>
    ${pai ? `<p class="hint" style="margin:-6px 0 12px">Subitem de <b>${esc(pai.numero||"")} · ${esc(pai.titulo)}</b></p>` : ""}
    <form class="form-pend" id="f-pend" novalidate autocomplete="off">
      ${ehSub ? "" : `<div class="field full"><label for="np-sec">Seção <span class="req">*</span></label>
        <select class="input" id="np-sec"><option value="">Escolha a seção</option>${PD_SECOES.map(s => `<option value="${esc(s.nome)}" ${s.nome===v.secao || (s.antigas||[]).includes(v.secao)?"selected":""}>${esc(pdRotulo(s))}</option>`).join("")}</select>
        ${ed && pdFilhos(ed).length ? `<span class="hint">Se mudar a seção, os subitens vão junto.</span>` : ""}</div>`}
      <div class="field full"><label for="np-tit">${ehSub ? "Subitem" : "Pendência"} <span class="req">*</span></label>
        <textarea class="input" id="np-tit" rows="2" placeholder="Ex.: Trocar a fechadura da porta do salão de festas">${esc(v.titulo||"")}</textarea></div>
      <div class="field full"><label for="np-obs">Detalhes</label>
        <textarea class="input" id="np-obs" rows="3" placeholder="Opcional: local, quem pediu, o que já foi feito">${esc(v.obs||"")}</textarea></div>
      ${novos ? `<div class="field full"><span class="lbl-campo">Tipo</span>
        <div class="seg2" role="radiogroup" aria-label="Tipo">
          <label><input type="radio" name="np-tipo" value="" ${pdConst(v)?"":"checked"}> <b>Pontual</b><span>Tem começo e fim: é concluída</span></label>
          <label><input type="radio" name="np-tipo" value="Constante" ${pdConst(v)?"checked":""}> <b>Tarefa constante</b><span>Rotina que se repete: registra cada execução</span></label>
        </div></div>
      <div class="field" id="np-freq-box"><label for="np-freq">Frequência</label><select class="input" id="np-freq">${PD_FREQ.map(f => `<option ${f===(v.frequencia||"Mensal")?"selected":""}>${f}</option>`).join("")}</select></div>` : ""}
      <div class="field"><label for="np-crit">Criticidade <span class="req">*</span></label>
        <select class="input" id="np-crit"><option value="">Escolha</option>${["Baixa","Média","Alta"].map(x => `<option ${x===v.criticidade?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field" id="np-st-box"><label for="np-st">Situação</label><select class="input" id="np-st">${PD_STATUS.map(x => `<option ${x===v.status?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label for="np-prazo" id="np-prazo-lbl">Prazo inicial</label><input class="input" id="np-prazo" type="date" value="${esc(v.prazo||"")}" ${ed && pdPrazoFixo(ed) ? "disabled" : ""}>
        <span class="hint" id="np-prazo-dica">${ed && pdPrazoFixo(ed) ? `Bloqueado${ed.prazoDefinidoEm ? " desde " + esc(fData(ed.prazoDefinidoEm)) : ""}${ed.prazoDefinidoPor ? " por " + esc(ed.prazoDefinidoPor) : ""}. ${pdV2() ? "Só o síndico pode alterar." : "Correção só direto na planilha."}` : ed && ed.prazo && pdV2() && ehSindico() ? "Bloqueado para os demais. Como síndico, você pode alterar." : pdV2() ? "Depois de salvo, só o síndico pode alterar." : "Depois de salvo, o prazo fica bloqueado."}</span></div>
      ${pdV2() ? `<div class="field" id="np-prazo2-box"><label for="np-prazo2">Atualização de prazo</label><input class="input" id="np-prazo2" type="date" value="${esc((ed && ed.prazoAtualizado)||"")}"><span class="hint">Nova data combinada. Pode ser alterada a qualquer momento.</span></div>` : ""}
      ${ed && pdTemConcl() ? `<div class="field" id="np-concl-box"><label for="np-concl">Concluída em</label><input class="input" id="np-concl" type="date" max="${hoje()}" value="${esc(ed.concluidoEm||(pdConclPend(ed) ? ed.conclData : "")||"")}" ${pdV2() && (pdConclPend(ed) || (ed.status === "Concluído" && !(ehGerente() || ehSindico()))) ? "disabled" : ""}><span class="hint">Obrigatória ao marcar como Concluído.${pdV2() ? " A conclusão passa pela aprovação do gerente e do síndico." : ""}</span></div>` : ""}
      <div class="field"><label for="np-resp">Responsável</label><select class="input" id="np-resp">${pdRespOpcoes(v.responsavel)}</select></div>
      ${!ed && pdV3() ? `<div class="field full"><label class="pd-chk pd-chk-os"><input type="checkbox" id="np-os"> Criar também uma OS para a equipe (Manutenção ou Limpeza)</label></div>${pdCamposOS(pdOSPadrao(v.responsavel, v.criticidade), "np-osf")}` : ""}
      ${ed && pdV2() ? pdAprovInfo(ed) : ""}
      ${execs.length ? `<div class="field full"><span class="lbl-campo">Últimas execuções</span><ul class="pd-execs">${execs.slice(0,8).map(x => `<li><b>${fData(x.slice(0,10))}</b> ${esc(x.slice(11))}</li>`).join("")}</ul></div>` : ""}
      ${ehSindico() && !ed ? `<p class="hint full">A administração recebe a pendência destacada como "Nova do síndico".</p>` : ""}
      ${!ed && pdV2() ? `<p class="hint full">A pendência nova fica aguardando a aprovação do gerente e, em seguida, do síndico. O setor escolhido em Responsável recebe um aviso por e-mail (sem responsável, não sai e-mail).</p>` : ""}
      <div class="full actions"><button class="btn primary" type="submit" id="np-ok">${ed ? "Salvar alterações" : pai ? "Incluir subitem" : "Incluir pendência"}</button><button class="btn" type="button" id="np-no">Cancelar</button><span class="hint" id="np-msg"></span></div>
    </form>`;
  $("#modal").hidden = false;
  const tipoSel = () => { const r = $('input[name="np-tipo"]:checked'); return r ? r.value : (ed ? ed.tipo || "" : ""); };
  const ajustaTipo = () => {
    const cst = tipoSel() === "Constante";
    if ($("#np-freq-box")) $("#np-freq-box").hidden = !cst;
    $("#np-st-box").hidden = cst || !ed;
    $("#np-prazo-lbl").textContent = cst ? (ed ? "Próxima execução" : "Primeira execução") : "Prazo inicial";
    if ($("#np-prazo2-box")) $("#np-prazo2-box").hidden = cst;
    const fixo = !!(ed && pdPrazoFixo(ed) && !cst);
    $("#np-prazo").disabled = fixo;
    $("#np-prazo-dica").hidden = cst;
    if ($("#np-concl-box")) $("#np-concl-box").hidden = cst;
  };
  $$('input[name="np-tipo"]').forEach(r => r.addEventListener("change", ajustaTipo));
  ajustaTipo();
  if ($("#np-os")) {
    const mostrar = () => $$(".np-osf").forEach(e => e.hidden = !$("#np-os").checked);
    $("#np-os").addEventListener("change", () => { mostrar(); if ($("#np-os").checked) $("#no-local").focus(); });
    mostrar();
    // a sugestão de equipe, categoria e prioridade acompanha o responsável e a criticidade, até a pessoa mexer nesses campos
    let mexeu = false; ["#no-setor","#no-cat","#no-prio"].forEach(s => $(s).addEventListener("change", () => { mexeu = true; }));
    const sugerir = () => { if (mexeu) return; const d = pdOSPadrao($("#np-resp").value, $("#np-crit").value); $("#no-setor").value = d.setor; $("#no-cat").value = d.categoria; $("#no-prio").value = d.prioridade; };
    $("#np-resp").addEventListener("change", sugerir); $("#np-crit").addEventListener("change", sugerir);
  }
  ($("#np-sec") && !$("#np-sec").value ? $("#np-sec") : $("#np-tit")).focus();
  $("#np-no").onclick = fecharModal;
  ["#np-sec","#np-tit","#np-crit"].forEach(s => { const e = $(s); if (e) e.addEventListener("input", () => { const m = $("#np-msg"); if (m.classList.contains("err")) { m.textContent = ""; m.className = "hint"; } }); });
  $("#f-pend").addEventListener("submit", ev => {
    ev.preventDefault();
    const msg = $("#np-msg"); msg.className = "hint err";
    const secao = $("#np-sec") ? $("#np-sec").value : v.secao, titulo = $("#np-tit").value.trim(), criticidade = $("#np-crit").value;
    if (!secao) { msg.textContent = "Escolha a seção."; $("#np-sec").focus(); return; }
    if (!titulo) { msg.textContent = ehSub ? "Descreva o subitem." : "Descreva a pendência."; $("#np-tit").focus(); return; }
    if (!criticidade && !(ed && !ed.criticidade && !pdTemCrit())) { if (pdTemCrit()) { msg.textContent = "Escolha a criticidade."; $("#np-crit").focus(); return; } }
    const dados = {titulo, obs:$("#np-obs").value.trim(), prazo:$("#np-prazo").value, responsavel:$("#np-resp").value.trim(), criticidade};
    if (novos) { dados.tipo = tipoSel(); if (dados.tipo === "Constante") dados.frequencia = $("#np-freq").value; }
    if ($("#np-prazo2-box") && !$("#np-prazo2-box").hidden) dados.prazoAtualizado = $("#np-prazo2").value;
    if (ed && !$("#np-st-box").hidden) dados.status = $("#np-st").value;
    if ($("#np-concl") && !$("#np-concl-box").hidden && !$("#np-concl").disabled) {
      const c = $("#np-concl").value, concluir = dados.status === "Concluído" && ed.status !== "Concluído";
      if (c && c > hoje()) { msg.textContent = "A data de conclusão não pode ser depois de hoje."; $("#np-concl").focus(); return; }
      if (concluir && pdV2() && pdAguardando(ed)) { msg.textContent = "Esta pendência ainda aguarda a aprovação de inclusão. A conclusão só pode ser pedida depois."; return; }
      if (concluir && !c) { msg.textContent = "Informe a data de conclusão."; $("#np-concl").focus(); return; }
      if (!concluir && ed.status === "Concluído" && dados.status === "Concluído" && !c) { msg.textContent = "A data de conclusão é obrigatória."; $("#np-concl").focus(); return; }
      if (c !== String(ed.concluidoEm || "") || concluir) { dados.concluidoEm = c; if (c && !dados.status) dados.status = "Concluído"; }
    } else if (ed && dados.status === "Concluído" && ed.status !== "Concluído") {
      msg.textContent = pdConclPend(ed) ? "A conclusão já foi pedida e aguarda aprovação." : "Informe a data de conclusão."; return;
    }
    let pend;
    if (ed) {
      pend = {id: ed.id};
      Object.keys(dados).forEach(k => { if (String(dados[k] ?? "") !== String(ed[k] ?? "")) pend[k] = dados[k]; });
      if (!ehSub && secao !== ed.secao) pend.secao = secao;
      if (Object.keys(pend).length === 1) { fecharModal(); return; }
    } else {
      pend = Object.assign(pai ? {pai: pai.id} : {secao}, dados);
      if ($("#np-os") && $("#np-os").checked) { const os = pdLerOS(msg); if (!os) return; pend.criarOS = os; }
    }
    const antes = new Set((S.pend||[]).map(p => p.id));
    const ok = $("#np-ok"); ok.disabled = true; msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> Salvando…`;
    pdEnviar("pendSalvar", {pend}).then(res => {
      if (!res) { ok.disabled = false; msg.className = "hint err"; msg.textContent = "Não foi possível salvar. Tente de novo."; return; }
      fecharModal();
      PD.q = ""; PD.st = ""; PD.crit = ""; PD.resp = ""; PD.late = false; PD.novas = false; PD.cst = false; PD.aprov = false; pdGuardarFiltros();
      if (S.tab !== "pendencias") setTab("pendencias"); else renderPend();
      const alvo = ed ? ed : (res.pendencias||[]).find(p => !antes.has(p.id));
      const r = alvo && PD.rows.get(alvo.id);
      if (r) { r.el.scrollIntoView({block:"center", behavior:"smooth"}); r.el.classList.remove("flash"); void r.el.offsetWidth; r.el.classList.add("flash"); }
    });
  });
}
// histórico das aprovações, no formulário de edição
function pdAprovInfo(p){
  const lin = (rot, val, falta) => `<li><span>${rot}</span> <b>${val ? esc(pdMarca(val)) : falta}</b></li>`;
  let h = `<div class="field full"><span class="lbl-campo">Aprovações</span><ul class="pd-aprov-info">`;
  if (p.criadaEm) h += lin("Incluída em", p.criadaEm + (p.criadaPor ? " · " + p.criadaPor : ""), "");
  if (!p.aprovacao) h += `<li>Pendência anterior ao processo de aprovação: já é válida.</li>`;
  else h += lin("Inclusão – gerente:", p.aprovGerente, "aguardando") + lin("Inclusão – síndico:", p.aprovSindico, "aguardando");
  if (String(p.conclPedida||"").trim()) h += lin("Conclusão pedida:", p.conclPedida + " · data informada " + fData(p.conclData), "") + lin("Conclusão – gerente:", p.conclGerente, "aguardando") + lin("Conclusão – síndico:", p.conclSindico, "aguardando");
  return h + `</ul></div>`;
}
function pdTextoEmail(){
  const all = pdLista(), L = ["Prezado Sr. Fernando,", "", "Segue o status atualizado das pendências:", ""];
  for (const s of PD_SECOES) {
    const daSecao = all.filter(p => pdSecaoDe(p) === s.nome); if (!daSecao.length) continue;
    L.push(s.email);
    for (const p of daSecao) {
      const sub = pdEhSub(p);
      let ln = (sub ? "    • " : p.numero ? p.numero + ". " : "• ") + String(p.titulo||"").trim() + " – " + (pdConst(p) ? `Tarefa constante (${String(p.frequencia||"Mensal").toLowerCase()})${p.ultimaVez ? ", última em " + fDia(p.ultimaVez) : ""}` : (p.status || "Pendente"));
      const x = [];
      if (p.criticidade) x.push("criticidade " + String(p.criticidade).toLowerCase());
      if (String(p.obs||"").trim()) x.push(String(p.obs).trim());
      if (p.prazo && (pdConst(p) || p.status !== "Concluído")) x.push((pdConst(p) ? "próxima " : "prazo inicial ") + fData(p.prazo).slice(0,5));
      if (!pdConst(p) && p.prazoAtualizado && p.status !== "Concluído") x.push("prazo atualizado " + fData(p.prazoAtualizado).slice(0,5));
      if (pdAguardando(p)) x.push("aguardando aprovação do " + (p.aprovacao === "Aguardando gerente" ? "gerente" : "síndico"));
      if (pdConclPend(p)) x.push("conclusão em " + fData(p.conclData).slice(0,5) + " aguardando aprovação");
      if (p.os) x.push(p.os + (p.osStatus ? " " + String(p.osStatus).toLowerCase() : ""));
      if (!pdConst(p) && p.status === "Concluído" && p.concluidoEm) x.push("concluída em " + fData(p.concluidoEm).slice(0,5));
      if (String(p.responsavel||"").trim()) x.push("resp.: " + String(p.responsavel).trim());
      if (x.length) ln += " (" + x.join("; ") + ")";
      L.push(ln);
    }
    L.push("");
  }
  L.push("Fico à disposição.", "", "Atenciosamente,", S.nome || "");
  return L.join("\n");
}
if (TEM_ADM) {
$("#pd-nova").addEventListener("click", () => pdAbrirNova());
$("#pd-body").addEventListener("click", e => {
  const b = e.target.closest("[data-ciente],[data-feito],[data-sub],[data-editar],[data-aprovar],[data-recusar],[data-os],[data-cot],[data-novacot]"); if (!b) return;
  if (b.dataset.cot) { const id = b.dataset.cot; CT.abrirDepois = () => { const c = (CT.lista || []).find(x => x.id === id); if (c) ctAbrir(c); }; setTab("cotacoes"); return; }
  if (b.dataset.novacot) { const p = pdAchar(b.dataset.novacot) || {}; CT.edit = null; CT.abrirDepois = () => ctNova({pendencia:p.id, finalidade:p.titulo, titulo:p.titulo}); setTab("cotacoes"); return; }
  if (b.dataset.os) { pdAbrirOS(b.dataset.os); return; }
  if (b.dataset.aprovar) { b.disabled = true; pdEnviar("pendSalvar", {pend:{id:b.dataset.id, aprovar:b.dataset.aprovar}}); }
  else if (b.dataset.recusar) { b.disabled = true; pdEnviar("pendSalvar", {pend:{id:b.dataset.recusar, recusarConclusao:true}}); }
  else if (b.dataset.ciente) { b.disabled = true; pdEnviar("pendSalvar", {pend:{id:b.dataset.ciente, ciente:true}}); }
  else if (b.dataset.feito) { b.disabled = true; pdEnviar("pendSalvar", {pend:{id:b.dataset.feito, feito:true, data:hoje()}}); }
  else if (b.dataset.sub) pdAbrirForm({pai:b.dataset.sub});
  else if (b.dataset.editar) pdAbrirForm({editar:b.dataset.editar});
});
$("#pd-q").addEventListener("input", e => { PD.q = e.target.value.trim(); PD.late = false; pdGuardarFiltros(); renderPend(); });
$("#pd-fs").addEventListener("change", e => { PD.st = e.target.value; PD.late = false; pdGuardarFiltros(); renderPend(); });
$("#pd-fc").addEventListener("change", e => { PD.crit = e.target.value; pdGuardarFiltros(); renderPend(); });
$("#pd-fr").addEventListener("change", e => { PD.resp = e.target.value; pdGuardarFiltros(); renderPend(); });
$("#pd-hide").addEventListener("change", e => { PD.hide = e.target.checked; pdGuardarFiltros(); renderPend(); });
if ($("#pd-ord")) $("#pd-ord").addEventListener("change", e => { PD.ord = e.target.value; pdGuardarFiltros(); renderPend(); });
if ($("#pd-recolher")) $("#pd-recolher").addEventListener("click", () => {
  const todas = PD_SECOES.every(s => PD.recolhidas.has(s.nome));
  PD.recolhidas = todas ? new Set() : new Set(PD_SECOES.map(s => s.nome)); pdGuardarRecolhidas(); renderPend();
});
$("#pd-mail").addEventListener("click", () => {
  if (!S.pend) return;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Texto para responder ao síndico</h3>
    <p class="hint" style="margin:-6px 0 12px">Mesma ordem e numeração do e-mail do Sr. Fernando. É só copiar e colar no corpo da resposta, sem anexo.</p>
    <textarea class="input" id="pd-email" readonly aria-label="Texto do e-mail"></textarea>
    <div class="actions" style="margin-top:12px;justify-content:flex-end"><button class="btn" type="button" id="pd-mail-x">Fechar</button><button class="btn primary" type="button" id="pd-mail-c">Copiar texto</button></div>`;
  const ta = $("#pd-email"); ta.value = pdTextoEmail();
  $("#modal").hidden = false;
  $("#pd-mail-x").onclick = fecharModal;
  $("#pd-mail-c").onclick = () => {
    const manual = () => { ta.focus(); ta.select(); toast("Texto selecionado. Copie com Ctrl+C."); };
    try { navigator.clipboard.writeText(ta.value).then(() => toast("Texto copiado."), manual); } catch(e){ manual(); }
  };
  $("#pd-mail-c").focus();
});
}

// ---------- cotações e mapa de cotação (menu Administração) ----------
// Cada cotação: fornecedores (colunas), itens com o preço de cada fornecedor, frete, desconto, referência de mercado,
// recomendação e aprovação do gerente e do síndico. O mapa sai no modelo do Pier (.xlsx) e para impressão.
const CT = { lista:null, pendOpcoes:[], ia:false, versao:0, edit:null, sujo:false, q:"", st:"", carregando:false, erro:"" };
const CT_ST = ["Em cotação","Aguardando aprovação","Aprovada","Cancelada"];
// "Aguardando gerente/síndico": cotações enviadas antes da aprovação ao mesmo tempo; contam como "Aguardando aprovação"
const ctAguarda = c => String(c.status || "").startsWith("Aguardando");
const ctStGrupo = c => ctAguarda(c) ? "Aguardando aprovação" : c.status;
const ctPossoAprovar = c => ctAguarda(c) && ((ehSindico() && !c.aprovSindico) || (ehGerente() && !c.aprovGerente));
const CT_CAMPOS = [
  ["empresa","Empresa"],["cnpj","CNPJ"],["telefone","Telefone"],["email","E-mail"],["contato","Contato"],
  ["modelo","Marca / modelo ofertado"],["atende","Atende à especificação?","sel",["","Sim","Parcial","Não"]],
  ["prazo","Prazo de entrega"],["pagamento","Condição de pagamento"],["validade","Validade da proposta"],["garantia","Garantia"],
  ["instalacao","Instalação inclusa?","sel",["","Sim","Não"]],["frete","Frete (R$)","num"],["desconto","Desconto (R$)","num"],["obs","Observação"]
];
const ctNum = v => { if (v === null || v === undefined) return null; let s = String(v).replace(/R\$|\s/g, ""); if (!s) return null; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const n = Number(s); return isFinite(n) && n >= 0 ? n : null; };
const ctFmtN = v => v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
const ctBRL = v => v === null || v === undefined || v === "" ? "—" : fBRL(v);
const ctEditavel = () => !!CT.edit && (!CT.edit.status || CT.edit.status === "Em cotação");
const ctVazia = () => ({ status:"Em cotação", finalidade:"", data:hoje(), solicitante:S.nome || "", pendencia:"",
  dados:{ especificacao:"", fornecedores:[ctFornVazio(), ctFornVazio(), ctFornVazio()], itens:[{descricao:"", unid:"un.", quant:1, precos:[null,null,null], ref:null, refFonte:""}],
          observacoes:"", recomendacao:{fornecedor:-1, justificativa:""} } });
function ctFornVazio(){ return {empresa:"", cnpj:"", telefone:"", email:"", contato:"", modelo:"", atende:"", prazo:"", pagamento:"", validade:"", garantia:"", instalacao:"", frete:null, desconto:null, obs:"", anexos:[]}; }
// totais por fornecedor (iguais ao servidor): itens + frete − desconto
function ctTotais(d){
  return d.fornecedores.map((f, i) => {
    let sub = 0, n = 0;
    d.itens.forEach(it => { const p = it.precos[i]; if (p !== null && p !== undefined) { sub += (Number(it.quant) || 0) * p; n++; } });
    return { subtotal: Math.round(sub*100)/100, total: Math.round((sub + (f.frete||0) - (f.desconto||0))*100)/100, completo: d.itens.length > 0 && n === d.itens.length, algum: n > 0 };
  });
}
// menor preço de cada item e menor total (só propostas que não dizem "Não atende")
function ctMelhores(d){
  const vale = i => d.fornecedores[i].atende !== "Não";
  const itens = d.itens.map(it => { let m = null; it.precos.forEach((p, i) => { if (p !== null && p !== undefined && vale(i) && (m === null || p < m)) m = p; }); return m; });
  const tot = ctTotais(d);
  const ordem = tot.map((t, i) => ({i, ...t})).filter(t => t.completo && vale(t.i)).sort((a, b) => a.total - b.total);
  return { itens, total: ordem.length ? ordem[0].total : null, ordem };
}
function ctSugestao(d){
  const m = ctMelhores(d);
  if (!m.ordem.length) return null;
  const a = m.ordem[0], b = m.ordem[1];
  const nome = i => d.fornecedores[i].empresa || `Empresa ${i+1}`;
  let txt = `Menor valor total entre as propostas completas que atendem à especificação: ${nome(a.i)}, ${fBRL(a.total)}`;
  if (b) { const eco = b.total - a.total; txt += `. Economia de ${fBRL(eco)} (${(eco / b.total * 100).toLocaleString("pt-BR", {maximumFractionDigits:1})}%) em relação à segunda opção, ${nome(b.i)} (${fBRL(b.total)})`; }
  return { fornecedor: a.i, justificativa: txt + "." };
}
function ctEconomia(d){
  const r = d.recomendacao.fornecedor; if (r < 0) return "";
  const tot = ctTotais(d), m = ctMelhores(d);
  const outros = m.ordem.filter(o => o.i !== r);
  if (!tot[r] || !tot[r].algum || !outros.length) return "";
  const prox = outros[0], dif = prox.total - tot[r].total;
  return dif >= 0 ? `Economia de ${fBRL(dif)} em relação à próxima opção (${d.fornecedores[prox.i].empresa || "Empresa " + (prox.i+1)}).`
    : `Atenção: custa ${fBRL(-dif)} a mais que ${d.fornecedores[prox.i].empresa || "Empresa " + (prox.i+1)}. Explique o motivo na justificativa.`;
}

async function carregarCot(){
  if (!TEM_ADM || !can("pendencias") || CT.carregando) return;
  CT.carregando = true;
  try {
    const r = await api("cotLista");
    CT.lista = r.cotacoes || []; CT.pendOpcoes = r.pendOpcoes || []; CT.ia = !!r.ia; CT.versao = Number(r.cotVersao) || 0; CT.erro = "";
    if (CT.abrirDepois) { const x = CT.abrirDepois; CT.abrirDepois = null; x(); }
  } catch(e){ CT.erro = /desconhecida/i.test(e.message) ? "Para usar as Cotações, a planilha precisa do código novo do Apps Script (colar e implantar uma nova versão)." : e.message; }
  finally { CT.carregando = false; renderCot(); }
}
function renderCot(){
  if (!TEM_ADM || !$("#t-cotacoes")) return;
  $("#ct-lista-box").hidden = !!CT.edit; $("#ct-editor").hidden = !CT.edit;
  if (CT.edit) return;
  const corpo = $("#ct-body");
  if (CT.erro) { corpo.innerHTML = `<tr><td colspan="7"><div class="notice crit" style="margin:0">${esc(CT.erro)}</div></td></tr>`; return; }
  if (!CT.lista) { corpo.innerHTML = `<tr><td colspan="7"><div class="empty"><span class="spin" aria-hidden="true"></span> Carregando…</div></td></tr>`; return; }
  const fs = $("#ct-fs"); if (!fs.options.length) fs.innerHTML = `<option value="">Todas as situações</option>` + CT_ST.map(s => `<option>${esc(s)}</option>`).join("");
  fs.value = CT.st;
  const q = norm(CT.q);
  const vis = CT.lista.filter(c => (!CT.st || ctStGrupo(c) === CT.st) && (!q || norm([c.numero, c.finalidade, c.pendNumero, c.vencedor, c.dados.fornecedores.map(f => f.empresa).join(" ")].join(" ")).includes(q)));
  const aguardam = CT.lista.filter(ctPossoAprovar).length;
  $("#ct-resumo").innerHTML = CT_ST.map(s => { const n = CT.lista.filter(c => ctStGrupo(c) === s).length; return `<button type="button" class="pd-stat ${s.startsWith("Aguardando") && n ? "aprov" : ""}" data-ctst="${esc(s)}" aria-pressed="${CT.st === s}"><b>${n}</b><span>${esc(s.toLowerCase())}</span></button>`; }).join("")
    + (aguardam ? `<span class="hint">${aguardam} aguardando a sua aprovação</span>` : "");
  corpo.innerHTML = vis.length ? vis.map(c => `<tr class="click" data-ct="${esc(c.id)}" tabindex="0">
      <td class="mono">${esc(c.numero)}</td>
      <td><b>${esc(c.finalidade)}</b>${c.pendNumero ? `<span class="sub">Pendência ${esc(c.pendNumero)}</span>` : ""}</td>
      <td class="hide-s num">${c.dados.fornecedores.filter(f => f.empresa).length}</td>
      <td class="hide-m">${esc(c.vencedor || "—")}</td>
      <td class="num">${c.valorVencedor ? esc(fBRL(c.valorVencedor)) : "—"}</td>
      <td><span class="ct-st" data-st="${esc(c.status)}">${esc(c.status)}</span></td>
      <td class="hide-s num">${esc(fData(c.data))}</td></tr>`).join("")
    : `<tr><td colspan="7"><div class="empty">${CT.lista.length ? "Nenhuma cotação com esses filtros." : "Nenhuma cotação ainda. Clique em \"+ Nova cotação\" ou em \"+ Cotação\" numa pendência."}</div></td></tr>`;
}
function ctAbrir(c){
  CT.edit = JSON.parse(JSON.stringify(c)); CT.sujo = false;
  const d = CT.edit.dados;
  d.itens.forEach(it => { while (it.precos.length < d.fornecedores.length) it.precos.push(null); });
  renderCot(); renderCotEditor(); window.scrollTo({top:0});
}
function ctNova(o){
  const c = ctVazia();
  if (o && o.pendencia) { c.pendencia = o.pendencia; c.finalidade = o.finalidade || ""; if (o.titulo) c.dados.itens[0].descricao = o.titulo; }
  ctAbrir(c); CT.sujo = true;
  const e = $("#ct-finalidade"); if (e) e.focus();
}
// editor: dados da cotação, fornecedores (colunas), itens e preços, recomendação, observações e aprovação
function renderCotEditor(){
  const c = CT.edit, d = c.dados, ed = ctEditavel(), dis = ed ? "" : "disabled";
  const nf = d.fornecedores.length, nomeF = i => d.fornecedores[i].empresa || `Empresa ${i+1}`;
  const pendSel = `<option value="">Sem pendência ligada</option>` + CT.pendOpcoes.concat(c.pendencia && !CT.pendOpcoes.some(p => p.id === c.pendencia) ? [{id:c.pendencia, numero:"", titulo:c.pendNumero || "pendência ligada", secao:""}] : [])
    .map(p => `<option value="${esc(p.id)}" ${p.id === c.pendencia ? "selected" : ""}>${esc((p.numero ? p.numero + " · " : "") + p.titulo + (p.secao ? " (" + p.secao + ")" : ""))}</option>`).join("");
  const celF = (f, i, [k, rot, tipo, ops]) => {
    if (tipo === "sel") return `<select class="input" data-s="${i}" data-k="${k}" aria-label="${esc(rot)} – ${esc(nomeF(i))}" ${dis}>${ops.map(o => `<option value="${o}" ${f[k]===o?"selected":""}>${o || "—"}</option>`).join("")}</select>`;
    const val = tipo === "num" ? ctFmtN(f[k]) : (f[k] || "");
    return `<input class="input ${tipo==="num"?"num":""}" data-s="${i}" data-k="${k}" ${tipo==="num"?'inputmode="decimal"':""} value="${esc(val)}" aria-label="${esc(rot)} – ${esc(nomeF(i))}" ${dis}>`;
  };
  const anexos = (f, i) => `<div class="ct-anx">${(f.anexos||[]).map(a => `<button type="button" class="link" data-anx="${esc(a.id)}" data-nome="${esc(a.nome)}">${esc(a.nome)}</button>${CT.ia && ed ? `<button type="button" class="btn small" data-ia="ler" data-s="${i}" data-anx2="${esc(a.id)}">Ler com IA</button>` : ""}`).join("")}
      ${ed ? `<label class="btn small ct-up">Anexar orçamento<input type="file" accept="application/pdf,image/*" data-up="${i}" hidden></label>` : ""}${!(f.anexos||[]).length && !ed ? "—" : ""}</div>`;
  const tot = ctTotais(d), m = ctMelhores(d);
  $("#ct-editor").innerHTML = `
    <div class="ct-topo">
      <button type="button" class="link" id="ct-voltar">← Cotações</button>
      <h2 class="sec">${c.numero ? esc(c.numero) : "Nova cotação"}</h2><span class="ct-st" data-st="${esc(c.status)}">${esc(c.status)}</span>
      <span class="hint" id="ct-sujo" ${CT.sujo ? "" : "hidden"}>Alterações não salvas</span>
      <div class="ct-acoes">
        ${ed ? `<button type="button" class="btn primary" id="ct-salvar">Salvar</button>` : ""}
        <button type="button" class="btn" id="ct-pedido">Pedido de cotação</button>
        <button type="button" class="btn" id="ct-xlsx">Baixar mapa (.xlsx)</button>
        <button type="button" class="btn" id="ct-print">Imprimir / PDF</button>
        ${c.id ? `<button type="button" class="btn" id="ct-drive">Salvar mapa no Drive</button>` : ""}
        ${c.mapaId ? `<button type="button" class="link" data-anx="${esc(c.mapaId)}" data-nome="Mapa ${esc(c.numero)}.xlsx">Mapa salvo em ${esc(fDataHora(c.mapaEm))}</button>` : ""}
      </div>
    </div>
    <div class="ct-sair" id="ct-sair" hidden><span>Há alterações não salvas.</span><button type="button" class="btn small primary" id="ct-sair-salvar">Salvar e voltar</button><button type="button" class="btn small" id="ct-sair-desc">Descartar</button><button type="button" class="btn small" id="ct-sair-no">Continuar editando</button></div>
    ${c.recusa && c.status === "Em cotação" ? `<div class="notice warn">Devolvida para ajustes: ${esc(pdMarca(c.recusa))}</div>` : ""}
    <div class="card ct-card"><h3>Dados da cotação</h3><div class="form-pend">
      <div class="field full"><label for="ct-finalidade">Finalidade da cotação <span class="req">*</span></label><input class="input" id="ct-finalidade" data-f="finalidade" value="${esc(c.finalidade)}" placeholder="Ex.: Ar-condicionado da academia" ${dis}></div>
      <div class="field"><label for="ct-data">Data da cotação</label><input class="input" type="date" id="ct-data" data-f="data" value="${esc(c.data)}" ${dis}></div>
      <div class="field"><label for="ct-solic">Solicitante / Responsável</label><input class="input" id="ct-solic" data-f="solicitante" value="${esc(c.solicitante)}" ${dis}></div>
      <div class="field full"><label for="ct-pend">Pendência de origem</label><select class="input" id="ct-pend" data-f="pendencia" ${dis}>${pendSel}</select></div>
      <div class="field full"><label for="ct-espec">Especificação técnica (o que precisa atender)</label><textarea class="input" id="ct-espec" data-f="especificacao" rows="2" placeholder="Ex.: 30.000 BTUs, inverter, só frio, 220V, com instalação" ${dis}>${esc(d.especificacao)}</textarea></div>
      <p class="hint full">Fornecedores consultados: <b id="ct-nforn">${d.fornecedores.filter(f => f.empresa).length}</b>${d.fornecedores.filter(f => f.empresa).length < 3 ? " · o recomendado é consultar pelo menos 3" : ""}</p>
    </div></div>
    <div class="card ct-card"><div class="ct-h"><h3>Dados dos fornecedores</h3>${ed && nf < 10 ? `<button type="button" class="btn small" id="ct-addf">+ Fornecedor</button>` : ""}</div>
      <div class="tablebox ct-scroll"><table class="ct-tab ct-forn"><thead><tr><th>Dados do fornecedor</th>${d.fornecedores.map((f, i) => `<th>${esc(nomeF(i))}${ed && nf > 1 ? ` <button type="button" class="pd-del" data-rmf="${i}" title="Tirar este fornecedor" aria-label="Tirar ${esc(nomeF(i))}">×</button>` : ""}</th>`).join("")}</tr></thead>
      <tbody>${CT_CAMPOS.map(cp => `<tr><th scope="row">${esc(cp[1])}</th>${d.fornecedores.map((f, i) => `<td>${celF(f, i, cp)}</td>`).join("")}</tr>`).join("")}
        <tr><th scope="row">Orçamentos anexados</th>${d.fornecedores.map((f, i) => `<td>${anexos(f, i)}</td>`).join("")}</tr></tbody></table></div>
      ${ed && !c.id ? `<p class="hint">Para anexar orçamentos, salve a cotação primeiro.</p>` : ""}
    </div>
    <div class="card ct-card"><div class="ct-h"><h3>Itens cotados</h3>${ed ? `<button type="button" class="btn small" id="ct-addi">+ Item</button>` : ""}${CT.ia && ed && c.id ? `<button type="button" class="btn small" data-ia="referencia">Pesquisar preço de referência com IA</button>` : ""}</div>
      <div class="tablebox ct-scroll"><table class="ct-tab ct-itens"><thead>
        <tr><th rowspan="2">Item</th><th rowspan="2">Descrição</th><th rowspan="2">Unid.</th><th rowspan="2">Quant.</th>${d.fornecedores.map((f, i) => `<th colspan="2">${esc(nomeF(i))}</th>`).join("")}<th colspan="2">Referência de mercado</th>${ed ? "<th rowspan='2'></th>" : ""}</tr>
        <tr>${d.fornecedores.map(() => `<th>Preço unit. (R$)</th><th>Preço total (R$)</th>`).join("")}<th>Preço unit. (R$)</th><th>Fonte</th></tr></thead>
      <tbody>${d.itens.map((it, j) => `<tr>
          <td class="num">${j+1}</td>
          <td><input class="input" data-i="${j}" data-k="descricao" value="${esc(it.descricao)}" aria-label="Descrição do item ${j+1}" ${dis}></td>
          <td><input class="input ct-un" data-i="${j}" data-k="unid" value="${esc(it.unid)}" aria-label="Unidade do item ${j+1}" ${dis}></td>
          <td><input class="input num ct-q" data-i="${j}" data-k="quant" inputmode="decimal" value="${esc(ctFmtN(it.quant).replace(/,00$/, ""))}" aria-label="Quantidade do item ${j+1}" ${dis}></td>
          ${d.fornecedores.map((f, i) => `<td><input class="input num ct-p" data-i="${j}" data-p="${i}" inputmode="decimal" value="${esc(ctFmtN(it.precos[i]))}" aria-label="Preço unitário de ${esc(nomeF(i))}, item ${j+1}" ${dis}></td><td class="num ct-lt" id="ct-lt-${j}-${i}"></td>`).join("")}
          <td><input class="input num" data-i="${j}" data-k="ref" inputmode="decimal" value="${esc(ctFmtN(it.ref))}" aria-label="Preço de referência, item ${j+1}" ${dis}></td>
          <td><input class="input" data-i="${j}" data-k="refFonte" value="${esc(it.refFonte)}" placeholder="site ou loja" aria-label="Fonte da referência, item ${j+1}" ${dis}></td>
          ${ed ? `<td>${d.itens.length > 1 ? `<button type="button" class="pd-del" data-rmi="${j}" title="Tirar este item" aria-label="Tirar o item ${j+1}">×</button>` : ""}</td>` : ""}</tr>`).join("")}</tbody>
      <tfoot>
        <tr><th colspan="4">Subtotal dos itens (R$)</th>${d.fornecedores.map((f, i) => `<td></td><td class="num" id="ct-sub-${i}"></td>`).join("")}<td colspan="${ed ? 3 : 2}"></td></tr>
        <tr><th colspan="4">Frete (R$)</th>${d.fornecedores.map((f, i) => `<td></td><td class="num" id="ct-fr-${i}"></td>`).join("")}<td colspan="${ed ? 3 : 2}"></td></tr>
        <tr><th colspan="4">Desconto (R$)</th>${d.fornecedores.map((f, i) => `<td></td><td class="num" id="ct-de-${i}"></td>`).join("")}<td colspan="${ed ? 3 : 2}"></td></tr>
        <tr class="ct-total"><th colspan="4">VALOR TOTAL DA PROPOSTA (R$)</th>${d.fornecedores.map((f, i) => `<td></td><td class="num" id="ct-tt-${i}"></td>`).join("")}<td colspan="${ed ? 3 : 2}"></td></tr>
      </tfoot></table></div>
      <p class="hint">Em verde: o menor preço de cada item e o menor total, entre as propostas que não estão marcadas como "Não atende". Frete e desconto entram nos dados do fornecedor.</p>
    </div>
    <div class="card ct-card"><div class="ct-h"><h3>Análise e recomendação</h3>${ed ? `<button type="button" class="btn small" id="ct-sugerir">Sugerir pelo menor total</button>` : ""}${CT.ia && ed && c.id ? `<button type="button" class="btn small" data-ia="comparar">Comparar com IA</button>` : ""}</div>
      <div class="form-pend">
        <div class="field"><label for="ct-venc">Fornecedor recomendado</label><select class="input" id="ct-venc" data-f="vencedor" ${dis}><option value="-1">Escolha</option>${d.fornecedores.map((f, i) => `<option value="${i}" ${d.recomendacao.fornecedor === i ? "selected" : ""}>${esc(nomeF(i))}</option>`).join("")}</select></div>
        <div class="field"><span class="lbl-campo">Valor total recomendado</span><div class="ct-valor" id="ct-vrec">—</div><span class="hint" id="ct-eco"></span></div>
        <div class="field full"><label for="ct-just">Justificativa</label><textarea class="input" id="ct-just" data-f="justificativa" rows="3" placeholder="Por que este fornecedor: preço, prazo, garantia, especificação…" ${dis}>${esc(d.recomendacao.justificativa)}</textarea></div>
      </div></div>
    <div class="card ct-card"><h3>Observações</h3><textarea class="input" id="ct-obs" data-f="observacoes" rows="3" placeholder="Ex.: modelos não são idênticos; confirmar valor final com o fornecedor" ${dis}>${esc(d.observacoes)}</textarea></div>
    ${c.id ? `<div class="card ct-card"><h3>Aprovação</h3>${ctAprovHtml(c)}</div>` : ""}`;
  ctRecalcular();
}
function ctAprovHtml(c){
  const linha = (rot, v, falta) => `<li><span>${rot}</span> <b>${v ? esc(pdMarca(v)) : falta}</b></li>`;
  const ag = ctAguarda(c);
  let h = `<ul class="pd-aprov-info">${linha("Gerente:", c.aprovGerente, ag ? "aguardando" : "—")}${linha("Síndico:", c.aprovSindico, ag ? "aguardando" : "—")}</ul>${ag ? `<p class="hint">Enviada ao gerente e ao síndico ao mesmo tempo. Cada um aprova com o próprio login, em qualquer ordem; fica aprovada quando os dois aprovarem.</p>` : ""}<div class="actions" style="margin-top:10px">`;
  if (c.status === "Em cotação") h += `<button type="button" class="btn primary" data-op="enviar">Enviar para aprovação</button><button type="button" class="btn" data-op="cancelar">Cancelar cotação</button>`;
  if (ag && ehSindico() && !c.aprovSindico) h += `<button type="button" class="btn primary" data-op="aprovar">Aprovar (síndico)</button>`;
  else if (ag && ehGerente() && !c.aprovGerente) h += `<button type="button" class="btn primary" data-op="aprovar">Aprovar (gerente)</button>`;
  else if (ag && (ehSindico() || ehGerente())) h += `<span class="hint">Você já aprovou. Falta a aprovação do ${c.aprovGerente ? "síndico" : "gerente"}.</span>`;
  if (c.status.startsWith("Aguardando") && (ehGerente() || ehSindico())) h += `<input class="input" id="ct-motivo" placeholder="Motivo da devolução (opcional)" style="max-width:280px"><button type="button" class="btn" data-op="recusar">Devolver para ajustes</button>`;
  if (c.status === "Cancelada") h += `<button type="button" class="btn" data-op="reabrir">Reabrir</button>`;
  if (c.status === "Aprovada") h += `<span class="hint">Aprovada pelo gerente e pelo síndico. O mapa final é salvo no Drive na última aprovação.</span>`;
  return h + `<span class="hint" id="ct-op-msg"></span></div>`;
}
function ctRecalcular(){
  const d = CT.edit.dados, tot = ctTotais(d), m = ctMelhores(d);
  d.itens.forEach((it, j) => d.fornecedores.forEach((f, i) => {
    const el = $(`#ct-lt-${j}-${i}`); if (!el) return;
    const p = it.precos[i];
    el.textContent = p === null || p === undefined ? "" : ctFmtN((Number(it.quant)||0) * p);
    const best = p !== null && p !== undefined && m.itens[j] !== null && p === m.itens[j] && f.atende !== "Não";
    el.classList.toggle("ct-best", best);
    const inp = el.previousElementSibling && el.previousElementSibling.querySelector("input"); if (inp) inp.classList.toggle("ct-best", best);
  }));
  d.fornecedores.forEach((f, i) => {
    const t = tot[i], set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set(`#ct-sub-${i}`, t.algum ? ctFmtN(t.subtotal) : ""); set(`#ct-fr-${i}`, f.frete ? ctFmtN(f.frete) : "");
    set(`#ct-de-${i}`, f.desconto ? "− " + ctFmtN(f.desconto) : ""); set(`#ct-tt-${i}`, t.algum ? ctFmtN(t.total) + (t.completo ? "" : " *") : "");
    const tt = $(`#ct-tt-${i}`); if (tt) { tt.classList.toggle("ct-best", t.completo && m.total !== null && t.total === m.total && f.atende !== "Não"); tt.title = t.algum && !t.completo ? "Faltam preços de algum item" : ""; }
  });
  const r = d.recomendacao.fornecedor;
  if ($("#ct-vrec")) $("#ct-vrec").textContent = r >= 0 && tot[r] && tot[r].algum ? fBRL(tot[r].total) : "—";
  if ($("#ct-eco")) $("#ct-eco").textContent = ctEconomia(d);
  if ($("#ct-nforn")) $("#ct-nforn").textContent = d.fornecedores.filter(f => f.empresa).length;
  if ($("#ct-sujo")) $("#ct-sujo").hidden = !CT.sujo;
}
function ctMudou(){ CT.sujo = true; ctRecalcular(); }
function ctLerCampo(e){
  const d = CT.edit.dados, t = e.target;
  if (t.dataset.f) {
    const k = t.dataset.f;
    if (k === "especificacao" || k === "observacoes") d[k] = t.value;
    else if (k === "justificativa") d.recomendacao.justificativa = t.value;
    else if (k === "vencedor") d.recomendacao.fornecedor = Number(t.value);
    else CT.edit[k] = t.value;
  } else if (t.dataset.s !== undefined && t.dataset.k) {
    const f = d.fornecedores[+t.dataset.s], k = t.dataset.k;
    f[k] = (k === "frete" || k === "desconto") ? ctNum(t.value) : t.value;
    if (k === "empresa") { const th = $$("#ct-editor .ct-forn thead th")[+t.dataset.s + 1]; if (th && th.firstChild) th.firstChild.textContent = t.value || `Empresa ${+t.dataset.s+1}`; }
  } else if (t.dataset.i !== undefined) {
    const it = d.itens[+t.dataset.i];
    if (t.dataset.p !== undefined) it.precos[+t.dataset.p] = ctNum(t.value);
    else if (t.dataset.k === "quant" || t.dataset.k === "ref") it[t.dataset.k] = ctNum(t.value);
    else it[t.dataset.k] = t.value;
  } else return;
  ctMudou();
}
// envia o que está na tela; o servidor devolve a cotação gravada (com os IDs dos fornecedores)
async function ctSalvar(quieto){
  const c = CT.edit;
  if (!String(c.finalidade || "").trim()) { toast("Informe a finalidade da cotação.", true); const e = $("#ct-finalidade"); if (e) e.focus(); return null; }
  const b = $("#ct-salvar"); if (b) b.disabled = true;
  try {
    const r = await api("cotSalvar", {cot:{id:c.id, finalidade:c.finalidade, data:c.data, solicitante:c.solicitante, pendencia:c.pendencia, dados:c.dados}});
    ctAtualizarDaResposta(r.cot); if (!quieto) toast(r.msg || "Salvo.");
    return r.cot;
  } catch(e){ toast(e.message, true); return null; }
  finally { if (b) b.disabled = false; }
}
function ctAtualizarDaResposta(cot){
  if (!cot) return;
  CT.lista = CT.lista || [];
  const i = CT.lista.findIndex(x => x.id === cot.id); if (i >= 0) CT.lista[i] = cot; else CT.lista.unshift(cot);
  if (CT.edit && (!CT.edit.id || CT.edit.id === cot.id)) ctAbrir(cot);
  if (S.pend) carregarPend();
}
async function ctOp(op){
  const c = CT.edit; if (!c || !c.id) return;
  if (op === "enviar" && CT.sujo && !(await ctSalvar(true))) return;
  const msg = $("#ct-op-msg");
  const r = await enviar(null, msg, "cotSalvar", {cot:{id:c.id}, op, motivo: op === "recusar" && $("#ct-motivo") ? $("#ct-motivo").value : ""});
  if (!r) return;
  ctAtualizarDaResposta(r.cot);
  if (op === "aprovar" && r.cot && r.cot.status === "Aprovada") ctSalvarMapaDrive(true);
}
async function ctAnexar(i, file){
  if (!file) return;
  let c = CT.edit;
  if (!c.id || CT.sujo) { c = await ctSalvar(true); if (!c) return; }
  const f = CT.edit.dados.fornecedores[i];
  if (!f || !f.id) { toast("Salve a cotação antes de anexar.", true); return; }
  if (file.size > 7 * 1024 * 1024 && file.type === "application/pdf") { toast("O PDF passa de 7 MB.", true); return; }
  toast("Enviando o orçamento…");
  try {
    const foto = /^image\//.test(file.type);
    const b64 = foto ? await reduzirFoto(file, 2000, 0.85) : await lerBase64(file);
    const r = await api("cotArquivo", {id:CT.edit.id, tipo:"orcamento", fornecedor:f.id, mime: foto ? "image/jpeg" : file.type, b64, nome:file.name});
    ctAtualizarDaResposta(r.cot); toast(r.msg || "Orçamento anexado.");
  } catch(e){ toast(e.message || "Não foi possível anexar.", true); }
}
async function ctBaixarArquivo(fileId, nome){
  try {
    const r = await api("cotVerArquivo", {id:CT.edit.id, fileId});
    const bin = atob(r.arquivo.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([u8], {type:r.arquivo.mime})); a.download = nome || "arquivo";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch(e){ toast(e.message, true); }
}

// ---- pedido de cotação (texto para WhatsApp ou e-mail) ----
function ctTextoPedido(c){
  const d = c.dados, L = ["Olá! Aqui é " + (c.solicitante || S.nome || "a administração") + ", do Pier Residências (condomínio residencial na Barra da Tijuca).", "", "Gostaríamos de uma cotação para:"];
  d.itens.filter(it => it.descricao).forEach((it, j) => L.push(`${j+1}. ${it.descricao} – ${String(ctFmtN(it.quant)).replace(/,00$/, "")} ${it.unid || "un."}`));
  if (String(d.especificacao || "").trim()) L.push("", "Especificação: " + d.especificacao.trim());
  L.push("", "Por favor, informe: preço unitário e total, frete, prazo de entrega, condição de pagamento, validade da proposta, garantia e se a instalação está inclusa.",
    "Se possível, envie a proposta em PDF com o CNPJ da empresa.", "", "Obrigado!");
  return L.join("\n");
}
function ctAbrirPedido(textoIA){
  const c = CT.edit, d = c.dados;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Pedido de cotação</h3>
    <p class="hint" style="margin:-6px 0 12px">Texto pronto para mandar aos fornecedores. Ajuste se quiser antes de enviar.</p>
    <textarea class="input" id="ct-ped-txt" rows="14" style="width:100%">${esc(textoIA || ctTextoPedido(c))}</textarea>
    <div class="actions" style="margin-top:12px;flex-wrap:wrap">
      <button class="btn primary" type="button" id="ct-ped-copiar">Copiar texto</button>
      ${d.fornecedores.filter(f => String(f.telefone||"").replace(/\D/g,"").length >= 10).map(f => `<button class="btn" type="button" data-wa="${esc(String(f.telefone).replace(/\D/g,""))}">WhatsApp: ${esc(f.empresa || "fornecedor")}</button>`).join("")}
      ${CT.ia && c.id ? `<button class="btn" type="button" id="ct-ped-ia">Escrever com IA</button>` : ""}
      <button class="btn" type="button" id="ct-ped-x">Fechar</button>
    </div>`;
  $("#modal").hidden = false;
  $("#ct-ped-x").onclick = fecharModal;
  $("#ct-ped-copiar").onclick = () => { const ta = $("#ct-ped-txt"); try { navigator.clipboard.writeText(ta.value).then(() => toast("Texto copiado."), () => { ta.select(); toast("Texto selecionado. Copie com Ctrl+C."); }); } catch(e){ ta.select(); } };
  $$("#modal-box [data-wa]").forEach(b => b.onclick = () => { let t = b.dataset.wa; if (t.length <= 11) t = "55" + t; window.open(`https://wa.me/${t}?text=${encodeURIComponent($("#ct-ped-txt").value)}`, "_blank", "noopener"); });
  if ($("#ct-ped-ia")) $("#ct-ped-ia").onclick = () => ctIA("pedido");
}

// ---- mapa de cotação no modelo do Pier (.xlsx gerado aqui mesmo, sem biblioteca externa) ----
// zip sem compressão (o .xlsx é um zip de arquivos XML)
function zipStore(arquivos){
  const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(), partes = [], central = []; let off = 0;
  for (const a of arquivos) {
    const nome = enc.encode(a.nome), d = typeof a.dados === "string" ? enc.encode(a.dados) : a.dados, cr = crc(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, cr, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nome.length, true);
    partes.push(new Uint8Array(h.buffer), nome, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, cr, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nome.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nome);
    off += 30 + nome.length + d.length;
  }
  const tamC = central.reduce((s, u) => s + u.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, arquivos.length, true); e.setUint16(10, arquivos.length, true); e.setUint32(12, tamC, true); e.setUint32(16, off, true);
  const tudo = partes.concat(central, [new Uint8Array(e.buffer)]), out = new Uint8Array(tudo.reduce((s, u) => s + u.length, 0));
  let p = 0; for (const u of tudo) { out.set(u, p); p += u.length; }
  return out;
}
// planilha de uma aba, com estilos (fonte, cor de fundo, borda, alinhamento, formato), mesclas, fórmulas, imagem e impressão
function xlsxMini(){
  const C = new Map(), merges = [], cols = {}, rows = {}; let img = null, area = null;
  const est = { fonts:['<font><sz val="10"/><name val="Calibri"/></font>'], fills:['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'],
    borders:['<border><left/><right/><top/><bottom/><diagonal/></border>'], numFmts:[], xfs:['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], idx:new Map() };
  const add = (lista, xml) => { let i = lista.indexOf(xml); if (i < 0) { lista.push(xml); i = lista.length - 1; } return i; };
  const x = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const L = n => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const BORDA = '<border><left style="thin"><color rgb="FFB7C4D1"/></left><right style="thin"><color rgb="FFB7C4D1"/></right><top style="thin"><color rgb="FFB7C4D1"/></top><bottom style="thin"><color rgb="FFB7C4D1"/></bottom><diagonal/></border>';
  function estilo(o){
    o = o || {}; const k = JSON.stringify(o); if (est.idx.has(k)) return est.idx.get(k);
    const f = add(est.fonts, `<font>${o.b ? "<b/>" : ""}${o.i ? "<i/>" : ""}<sz val="${o.size || 10}"/><color rgb="${o.cor || "FF1F2A37"}"/><name val="Calibri"/></font>`);
    const fi = o.fill ? add(est.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${o.fill}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const bo = o.borda === false ? 0 : add(est.borders, BORDA);
    let nf = 0; if (o.num) { let j = est.numFmts.indexOf(o.num); if (j < 0) { est.numFmts.push(o.num); j = est.numFmts.length - 1; } nf = 164 + j; }
    est.xfs.push(`<xf numFmtId="${nf}" fontId="${f}" fillId="${fi}" borderId="${bo}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${nf ? ' applyNumberFormat="1"' : ""}><alignment horizontal="${o.h || "left"}" vertical="center"${o.wrap === false ? "" : ' wrapText="1"'}/></xf>`);
    const i = est.xfs.length - 1; est.idx.set(k, i); return i;
  }
  const serial = d => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5;
  function celXml(r, c, at){
    const ref = L(c) + r, s = ` s="${at.s || 0}"`, v = at.v;
    if (v === undefined || v === null || v === "") return `<c r="${ref}"${s}/>`;
    if (v instanceof Date) return `<c r="${ref}"${s}><v>${serial(v)}</v></c>`;
    if (typeof v === "number") return isFinite(v) ? `<c r="${ref}"${s}><v>${v}</v></c>` : `<c r="${ref}"${s}/>`;
    if (typeof v === "object" && v.f) {
      const res = v.r;
      return typeof res === "number" ? `<c r="${ref}"${s}><f>${x(v.f)}</f><v>${res}</v></c>` : `<c r="${ref}"${s} t="str"><f>${x(v.f)}</f><v>${x(res === undefined || res === null ? "" : res)}</v></c>`;
    }
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  }
  return {
    L,
    cel(r, c, v, o){ const k = r + "," + c, at = C.get(k) || {}; if (v !== undefined) at.v = v; at.s = estilo(o); C.set(k, at); },
    merge(r1, c1, r2, c2){ merges.push(`${L(c1)}${r1}:${L(c2)}${r2}`); },
    col(c, w){ cols[c] = w; }, row(r, h){ rows[r] = h; },
    imagem(bytes, wPx, hPx){ img = {bytes, w:wPx, h:hPx}; },
    area(ref){ area = ref; },
    gerar(nomeAba){
      const nome = String(nomeAba || "Cotação").replace(/[\\/?*[\]:']/g, "-").slice(0, 31);
      const porLinha = new Map();
      for (const [k, at] of C) { const [r, c] = k.split(",").map(Number); if (!porLinha.has(r)) porLinha.set(r, []); porLinha.get(r).push([c, at]); }
      const linhasR = [...new Set([...porLinha.keys(), ...Object.keys(rows).map(Number)])].sort((a, b) => a - b);
      const dados = linhasR.map(r => `<row r="${r}"${rows[r] ? ` ht="${rows[r]}" customHeight="1"` : ""}>${(porLinha.get(r) || []).sort((a, b) => a[0] - b[0]).map(([c, at]) => celXml(r, c, at)).join("")}</row>`).join("");
      const colsXml = Object.keys(cols).length ? `<cols>${Object.keys(cols).map(Number).sort((a, b) => a - b).map(c => `<col min="${c}" max="${c}" width="${cols[c]}" customWidth="1"/>`).join("")}</cols>` : "";
      const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
      const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
      const sheet = `${XML}<worksheet ${NS}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>${colsXml}<sheetData>${dados}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>${img ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;
      const styles = `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${est.numFmts.length ? `<numFmts count="${est.numFmts.length}">${est.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${x(f)}"/>`).join("")}</numFmts>` : ""}<fonts count="${est.fonts.length}">${est.fonts.join("")}</fonts><fills count="${est.fills.length}">${est.fills.join("")}</fills><borders count="${est.borders.length}">${est.borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${est.xfs.length}">${est.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
      const nomeX = x(nome).replace(/'/g, "''");
      const wb = `${XML}<workbook ${NS}><bookViews><workbookView/></bookViews><sheets><sheet name="${x(nome)}" sheetId="1" r:id="rId1"/></sheets>${area ? `<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'${nomeX}'!${area.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2")}</definedName></definedNames>` : ""}</workbook>`;
      const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
      const arqs = [
        {nome:"[Content_Types].xml", dados:`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${img ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>`},
        {nome:"_rels/.rels", dados:`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
        {nome:"xl/workbook.xml", dados:wb},
        {nome:"xl/_rels/workbook.xml.rels", dados:`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`},
        {nome:"xl/styles.xml", dados:styles},
        {nome:"xl/worksheets/sheet1.xml", dados:sheet}
      ];
      if (img) {
        const cx = Math.round(img.w * 9525), cy = Math.round(img.h * 9525);
        arqs.push({nome:"xl/worksheets/_rels/sheet1.xml.rels", dados:`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`});
        arqs.push({nome:"xl/drawings/drawing1.xml", dados:`${XML}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo Pier"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`});
        arqs.push({nome:"xl/drawings/_rels/drawing1.xml.rels", dados:`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/image" Target="../media/image1.png"/></Relationships>`});
        arqs.push({nome:"xl/media/image1.png", dados:img.bytes});
      }
      return zipStore(arqs);
    }
  };
}
async function ctLogoBytes(){
  try { const r = await fetch("img/logo-claro.png"); if (!r.ok) return null; return new Uint8Array(await r.arrayBuffer()); } catch(e){ return null; }
}
async function ctGerarXlsx(c){
  const d = c.dados, nf = Math.max(d.fornecedores.length, 1), tot = ctTotais(d), m = ctMelhores(d);
  const W = xlsxMini(), L = W.L;
  const AZUL = "FF1F3A56", AZUL2 = "FF4A7296", CLARO = "FFDCE6EF", AMAR = "FFFFF6D9", VERDE = "FFC6EFCE", VERDE_T = "FF006100", BRANCO = "FFFFFFFF";
  const MOEDA = '"R$" #,##0.00';
  const colF = i => 5 + i * 2;                       // E, G, I… (duas colunas por fornecedor, como no modelo)
  const colRef = colF(nf), ult = colRef + 1;          // referência de mercado: preço e fonte
  W.col(1, 6); W.col(2, 44); W.col(3, 7); W.col(4, 8);
  for (let i = 0; i < nf; i++) { W.col(colF(i), 15); W.col(colF(i) + 1, 16); }
  W.col(colRef, 15); W.col(ult, 26);
  const cel = (r, k, v, o) => W.cel(r, k, v, o);
  const faixa = (r, c1, c2, v, o) => { if (c2 > c1) W.merge(r, c1, r, c2); for (let k = c1; k <= c2; k++) cel(r, k, k === c1 ? v : undefined, o); };
  const linhasTexto = (v, largura) => String(v === null || v === undefined ? "" : v).split("\n").reduce((s, l) => s + Math.max(1, Math.ceil(l.length / largura)), 0);
  // cabeçalho azul com o logo
  for (let r = 1; r <= 4; r++) { for (let k = 1; k <= ult; k++) cel(r, k, undefined, {fill:AZUL, borda:false}); W.row(r, 17); }
  W.merge(1, 4, 2, ult); cel(1, 4, "COTAÇÃO DE PREÇOS", {fill:AZUL, b:true, size:16, cor:BRANCO, h:"center", borda:false});
  W.merge(3, 4, 4, ult); cel(3, 4, "PIER RESIDÊNCIAS  |  Condomínio Residencial – Barra da Tijuca", {fill:AZUL, i:true, cor:BRANCO, h:"center", borda:false});
  const logo = await ctLogoBytes(); if (logo) W.imagem(logo, 200, 60);
  // dados da cotação
  let r = 6;
  const pend = c.pendNumero || ((CT.pendOpcoes.find(p => p.id === c.pendencia) || {}).titulo) || "—";
  [["Nº da cotação:", c.numero || "(ainda não salva)"], ["Finalidade da cotação:", c.finalidade], ["Data da cotação:", c.data ? new Date(c.data + "T12:00:00") : ""],
   ["Solicitante / Responsável:", c.solicitante], ["Pendência de origem:", pend], ["Nº de fornecedores consultados:", d.fornecedores.filter(f => f.empresa).length],
   ["Especificação técnica:", d.especificacao || "—"]].forEach(([rot, v]) => {
    faixa(r, 1, 3, rot, {b:true}); faixa(r, 4, ult, v, {fill:AMAR, b:true, num: v instanceof Date ? "dd/mm/yyyy" : undefined});
    if (rot.startsWith("Especificação")) W.row(r, Math.max(16, linhasTexto(v, 140) * 15)); r++; });
  // dados dos fornecedores
  r++;
  faixa(r, 1, 4, "Dados do Fornecedor", {fill:AZUL2, b:true, cor:BRANCO, h:"center"});
  d.fornecedores.forEach((f, i) => faixa(r, colF(i), colF(i) + 1, (f.empresa || `EMPRESA ${i+1}`).toUpperCase(), {fill:AZUL, b:true, cor:BRANCO, h:"center"}));
  r++;
  CT_CAMPOS.filter(x => x[0] !== "obs").concat([["anexos", "Orçamento anexado"], ["obs", "Observação"]]).forEach(([k, rot, tipo]) => {
    faixa(r, 1, 4, rot, {fill:CLARO, b:true});
    let alto = 1;
    d.fornecedores.forEach((f, i) => {
      let v = k === "anexos" ? (f.anexos || []).map(a => a.nome).join("\n") : f[k];
      if (tipo === "num") v = v ? Number(v) : null;
      const vazio = v === null || v === undefined || v === "";
      faixa(r, colF(i), colF(i) + 1, vazio ? "—" : v, {fill:AMAR, h:"center", num: tipo === "num" && !vazio ? MOEDA : undefined, b: k === "atende" && v === "Não", cor: k === "atende" && v === "Não" ? "FFB42318" : undefined});
      alto = Math.max(alto, linhasTexto(v, 30));
    });
    if (alto > 1) W.row(r, Math.min(90, 15 * alto + 2)); r++;
  });
  // itens cotados
  r++;
  faixa(r, 1, ult, "Itens Cotados", {fill:AZUL2, b:true, cor:BRANCO}); r++;
  const h1 = r, h2 = r + 1, hd = {fill:AZUL, b:true, cor:BRANCO, h:"center"};
  [["Item", 1], ["Descrição", 2], ["Unid.", 3], ["Quant.", 4]].forEach(([t, k]) => { W.merge(h1, k, h2, k); cel(h1, k, t, hd); cel(h2, k, undefined, hd); });
  d.fornecedores.forEach((f, i) => { faixa(h1, colF(i), colF(i) + 1, (f.empresa || `Empresa ${i+1}`).toUpperCase(), hd); cel(h2, colF(i), "Preço Unit. (R$)", hd); cel(h2, colF(i) + 1, "Preço Total (R$)", hd); });
  const hr = {fill:AZUL2, b:true, cor:BRANCO, h:"center"};
  faixa(h1, colRef, ult, "REFERÊNCIA DE MERCADO", hr); cel(h2, colRef, "Preço Unit. (R$)", hr); cel(h2, ult, "Fonte", hr);
  r = h2 + 1;
  const i0 = r;
  d.itens.forEach((it, j) => {
    const bg = j % 2 ? BRANCO : CLARO, q = Number(it.quant) || 0;
    cel(r, 1, j + 1, {fill:bg, h:"center"}); cel(r, 2, it.descricao, {fill:AMAR}); cel(r, 3, it.unid, {fill:AMAR, h:"center"}); cel(r, 4, q, {fill:AMAR, h:"center"});
    d.fornecedores.forEach((f, i) => {
      const p = it.precos[i], tem = p !== null && p !== undefined, best = tem && p === m.itens[j] && f.atende !== "Não";
      const est = {fill:best ? VERDE : AMAR, num:MOEDA, h:"right", b:best, cor:best ? VERDE_T : undefined};
      cel(r, colF(i), tem ? p : null, est);
      const U = L(colF(i)) + r;
      cel(r, colF(i) + 1, {f:`IF(${U}="","",D${r}*${U})`, r: tem ? Math.round(q * p * 100) / 100 : ""}, {fill:best ? VERDE : bg, num:MOEDA, h:"right", b:true, cor:best ? VERDE_T : undefined});
    });
    cel(r, colRef, it.ref === null || it.ref === undefined ? null : it.ref, {fill:AMAR, num:MOEDA, h:"right"}); cel(r, ult, it.refFonte || "", {fill:AMAR, size:9});
    const alto = Math.max(linhasTexto(it.descricao, 52), linhasTexto(it.refFonte, 30));
    if (alto > 1) W.row(r, Math.min(75, 15 * alto)); r++;
  });
  const i1 = r - 1, rs = r;
  [["Subtotal dos itens (R$)", i => ({f:`SUM(${L(colF(i)+1)}${i0}:${L(colF(i)+1)}${i1})`, r:tot[i].subtotal})], ["Frete (R$)", i => d.fornecedores[i].frete || 0], ["Desconto (R$)", i => d.fornecedores[i].desconto || 0]]
    .forEach(([rot, fn]) => { faixa(r, 1, 4, rot, {fill:CLARO, b:true, h:"right"}); d.fornecedores.forEach((f, i) => { cel(r, colF(i), "", {fill:CLARO}); cel(r, colF(i) + 1, fn(i), {fill:CLARO, num:MOEDA, h:"right"}); }); faixa(r, colRef, ult, "", {fill:CLARO}); r++; });
  faixa(r, 1, 4, "VALOR TOTAL DA PROPOSTA (R$)", {fill:AZUL, b:true, cor:BRANCO, h:"right"});
  d.fornecedores.forEach((f, i) => { const col = L(colF(i) + 1), best = tot[i].completo && m.total !== null && tot[i].total === m.total && f.atende !== "Não";
    cel(r, colF(i), "", {fill:AZUL}); cel(r, colF(i) + 1, {f:`${col}${rs}+${col}${rs+1}-${col}${rs+2}`, r:tot[i].total}, {fill:best ? VERDE : AZUL, num:MOEDA, b:true, cor:best ? VERDE_T : BRANCO, h:"right"}); });
  faixa(r, colRef, ult, "", {fill:AZUL}); r += 2;
  // análise e recomendação, observações e aprovações
  const ir = d.recomendacao.fornecedor;
  faixa(r, 1, ult, "Análise e recomendação", {fill:AZUL2, b:true, cor:BRANCO}); r++;
  [["Fornecedor recomendado:", ir >= 0 ? (d.fornecedores[ir].empresa || `Empresa ${ir+1}`) : "—"], ["Valor total recomendado:", ir >= 0 && tot[ir].algum ? tot[ir].total : "—"],
   ["Economia / comparação:", ctEconomia(d) || "—"], ["Justificativa:", d.recomendacao.justificativa || "—"]].forEach(([rot, v]) => {
    faixa(r, 1, 3, rot, {b:true, fill:CLARO}); faixa(r, 4, ult, v, {fill:AMAR, b:rot.startsWith("Fornecedor") || rot.startsWith("Valor"), num: typeof v === "number" ? MOEDA : undefined, h: typeof v === "number" ? "left" : undefined});
    const alto = linhasTexto(v, 150); if (alto > 1) W.row(r, Math.min(120, 15 * alto)); r++; });
  r++;
  faixa(r, 1, ult, "Observações", {fill:AZUL2, b:true, cor:BRANCO}); r++;
  const obs = d.observacoes || "—"; faixa(r, 1, ult, obs, {fill:AMAR}); W.row(r, Math.min(180, Math.max(16, linhasTexto(obs, 170) * 15))); r += 2;
  faixa(r, 1, ult, "Aprovações", {fill:AZUL2, b:true, cor:BRANCO}); r++;
  [["Situação:", c.status || "Em cotação"], ["Gerente:", c.aprovGerente ? pdMarca(c.aprovGerente) : "—"], ["Síndico:", c.aprovSindico ? pdMarca(c.aprovSindico) : "—"]]
    .forEach(([rot, v]) => { faixa(r, 1, 3, rot, {b:true, fill:CLARO}); faixa(r, 4, ult, v, {fill:AMAR}); r++; });
  r++;
  faixa(r, 1, ult, `Gerado pelo Pier Gestão em ${fDataHora(new Date(Date.now() - 3*3600e3).toISOString().slice(0, 16).replace("T", " "))}. Em verde: menor preço de cada item e menor total entre as propostas que atendem à especificação.`, {i:true, size:8, cor:"FF5B6B7B", borda:false});
  W.area(`A1:${L(ult)}${r}`);
  return W.gerar(c.numero || "Cotação");
}
// nome do arquivo sem acentos: alguns navegadores trocam por "download" um nome com "ç" ou "ã"
const ctNomeMapa = c => (`Mapa de cotacao ${c.numero || "nova"} - ${String(c.finalidade || "").slice(0, 50)}`).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/[\\/:*?"<>|]/g, "-") + ".xlsx";
async function ctBaixarXlsx(){
  const b = $("#ct-xlsx"); if (b) b.disabled = true;
  try {
    const buf = await ctGerarXlsx(CT.edit);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})); a.download = ctNomeMapa(CT.edit);
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    registrarTela("exportar_mapa", CT.edit.numero || "nova");
  } catch(e){ toast(e.message || "Não foi possível gerar o mapa.", true); }
  finally { if (b) b.disabled = false; }
}
async function ctSalvarMapaDrive(automatico){
  const c = CT.edit; if (!c || !c.id) return;
  if (CT.sujo && ctEditavel() && !(await ctSalvar(true))) return;
  const b = $("#ct-drive"); if (b) b.disabled = true;
  try {
    const u8 = await ctGerarXlsx(CT.edit);
    let bin = ""; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    const r = await api("cotArquivo", {id:c.id, tipo:"mapa", mime:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b64:btoa(bin)});
    ctAtualizarDaResposta(r.cot); toast(automatico ? "Cotação aprovada. Mapa final salvo no Drive." : (r.msg || "Mapa salvo no Drive."));
  } catch(e){ toast(e.message || "Não foi possível salvar o mapa no Drive.", true); }
  finally { if (b) b.disabled = false; }
}
// versão para imprimir ou salvar em PDF (mesmo conteúdo do mapa)
function ctImprimir(){
  const c = CT.edit, d = c.dados, tot = ctTotais(d), m = ctMelhores(d), nf = d.fornecedores.length;
  const nomeF = i => esc(d.fornecedores[i].empresa || `Empresa ${i+1}`);
  const v = x => x === null || x === undefined || x === "" ? "—" : esc(x);
  const linhasF = CT_CAMPOS.filter(x => x[0] !== "obs").concat([["anexos", "Orçamento anexado"], ["obs", "Observação"]]).map(([k, rot, tipo]) =>
    `<tr><th class="cl">${esc(rot)}</th>${d.fornecedores.map(f => `<td colspan="2" class="am c">${k === "anexos" ? v((f.anexos||[]).map(a => a.nome).join(", ")) : tipo === "num" ? (f[k] ? esc(fBRL(f[k])) : "—") : v(f[k])}</td>`).join("")}</tr>`).join("");
  const itens = d.itens.map((it, j) => `<tr><td class="c">${j+1}</td><td>${v(it.descricao)}</td><td class="c">${v(it.unid)}</td><td class="c">${v(ctFmtN(it.quant).replace(/,00$/, ""))}</td>${d.fornecedores.map((f, i) => { const p = it.precos[i], best = p !== null && p !== undefined && p === m.itens[j] && f.atende !== "Não"; return `<td class="n ${best ? "vd" : ""}">${p === null || p === undefined ? "" : esc(fBRL(p))}</td><td class="n b ${best ? "vd" : ""}">${p === null || p === undefined ? "" : esc(fBRL((Number(it.quant)||0) * p))}</td>`; }).join("")}<td class="n">${it.ref ? esc(fBRL(it.ref)) : ""}</td><td class="pq">${v(it.refFonte)}</td></tr>`).join("");
  const rod = (rot, fn, cls) => `<tr class="${cls||""}"><th colspan="4" class="d">${rot}</th>${d.fornecedores.map((f, i) => `<td></td><td class="n b ${fn.best && fn.best(i) ? "vd" : ""}">${fn(i)}</td>`).join("")}<td colspan="2"></td></tr>`;
  const totF = i => tot[i].algum ? esc(fBRL(tot[i].total)) : ""; totF.best = i => tot[i].completo && m.total !== null && tot[i].total === m.total && d.fornecedores[i].atende !== "Não";
  const ir = d.recomendacao.fornecedor;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(ctNomeMapa(c).replace(/\.xlsx$/, ""))}</title><style>
    @page{size:A4 landscape;margin:10mm} body{font:10px Calibri,Arial,sans-serif;color:#1f2a37;margin:0}
    table{border-collapse:collapse;width:100%;margin-bottom:8px} th,td{border:1px solid #b7c4d1;padding:3px 5px;vertical-align:middle;text-align:left}
    .cab{background:#1f3a56;color:#fff;text-align:center;padding:10px;margin-bottom:8px;position:relative} .cab h1{margin:0;font-size:18px} .cab p{margin:3px 0 0;font-style:italic}
    .cab img{position:absolute;left:10px;top:8px;height:40px}
    .az{background:#1f3a56;color:#fff;text-align:center} .az2{background:#4a7296;color:#fff;font-weight:700} .cl{background:#dce6ef;font-weight:700;white-space:nowrap}
    .am{background:#fff6d9} .c{text-align:center} .n{text-align:right;white-space:nowrap} .b{font-weight:700} .d{text-align:right} .vd{background:#c6efce;color:#006100;font-weight:700}
    .tt th,.tt td{background:#1f3a56;color:#fff} .tt td.vd{background:#c6efce;color:#006100} .pq{font-size:9px} .rod{font-size:8px;color:#5b6b7b;font-style:italic}
  </style></head><body>
    <div class="cab"><img src="${new URL("img/logo-claro.png", location.href).href}" alt=""><h1>COTAÇÃO DE PREÇOS</h1><p>PIER RESIDÊNCIAS | Condomínio Residencial – Barra da Tijuca</p></div>
    <table><tr><th class="cl" style="width:22%">Nº da cotação</th><td class="am b">${v(c.numero || "(ainda não salva)")}</td><th class="cl" style="width:18%">Data da cotação</th><td class="am b">${v(fData(c.data))}</td></tr>
      <tr><th class="cl">Finalidade da cotação</th><td class="am b">${v(c.finalidade)}</td><th class="cl">Solicitante / Responsável</th><td class="am b">${v(c.solicitante)}</td></tr>
      <tr><th class="cl">Pendência de origem</th><td class="am">${v(c.pendNumero)}</td><th class="cl">Fornecedores consultados</th><td class="am b">${d.fornecedores.filter(f => f.empresa).length}</td></tr>
      <tr><th class="cl">Especificação técnica</th><td class="am" colspan="3">${v(d.especificacao)}</td></tr></table>
    <table><tr><th class="az2" style="width:18%">Dados do Fornecedor</th>${d.fornecedores.map((f, i) => `<th colspan="2" class="az">${nomeF(i).toUpperCase()}</th>`).join("")}</tr>${linhasF}</table>
    <table><tr><th class="az" rowspan="2">Item</th><th class="az" rowspan="2">Descrição</th><th class="az" rowspan="2">Unid.</th><th class="az" rowspan="2">Quant.</th>${d.fornecedores.map((f, i) => `<th class="az" colspan="2">${nomeF(i).toUpperCase()}</th>`).join("")}<th class="az2 c" colspan="2">REFERÊNCIA DE MERCADO</th></tr>
      <tr>${d.fornecedores.map(() => `<th class="az">Preço Unit.</th><th class="az">Preço Total</th>`).join("")}<th class="az2 c">Preço Unit.</th><th class="az2 c">Fonte</th></tr>
      ${itens}
      ${rod("Subtotal dos itens", i => tot[i].algum ? esc(fBRL(tot[i].subtotal)) : "")}${rod("Frete", i => d.fornecedores[i].frete ? esc(fBRL(d.fornecedores[i].frete)) : "—")}${rod("Desconto", i => d.fornecedores[i].desconto ? "− " + esc(fBRL(d.fornecedores[i].desconto)) : "—")}
      ${rod("VALOR TOTAL DA PROPOSTA", totF, "tt")}</table>
    <table><tr><th class="az2" colspan="2">Análise e recomendação</th></tr>
      <tr><th class="cl" style="width:22%">Fornecedor recomendado</th><td class="am b">${ir >= 0 ? nomeF(ir) : "—"}</td></tr>
      <tr><th class="cl">Valor total recomendado</th><td class="am b">${ir >= 0 && tot[ir].algum ? esc(fBRL(tot[ir].total)) : "—"}</td></tr>
      <tr><th class="cl">Economia / comparação</th><td class="am">${v(ctEconomia(d))}</td></tr>
      <tr><th class="cl">Justificativa</th><td class="am">${v(d.recomendacao.justificativa)}</td></tr></table>
    <table><tr><th class="az2">Observações</th></tr><tr><td class="am" style="white-space:pre-wrap">${v(d.observacoes)}</td></tr></table>
    <table><tr><th class="az2" colspan="2">Aprovações</th></tr><tr><th class="cl" style="width:22%">Situação</th><td class="am">${v(c.status)}</td></tr>
      <tr><th class="cl">Gerente</th><td class="am">${c.aprovGerente ? esc(pdMarca(c.aprovGerente)) : "—"}</td></tr><tr><th class="cl">Síndico</th><td class="am">${c.aprovSindico ? esc(pdMarca(c.aprovSindico)) : "—"}</td></tr></table>
    <p class="rod">Gerado pelo Pier Gestão. Em verde: menor preço de cada item e menor total entre as propostas que atendem à especificação.</p>
  </body></html>`;
  let fr = $("#ct-print-frame");
  if (fr) fr.remove();
  fr = document.createElement("iframe"); fr.id = "ct-print-frame"; fr.setAttribute("aria-hidden", "true");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  fr.contentDocument.open(); fr.contentDocument.write(html); fr.contentDocument.close();
  const imprimir = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch(e){ toast("Não foi possível abrir a impressão.", true); } };
  const img = fr.contentDocument.querySelector("img");
  if (img && !img.complete) { img.onload = img.onerror = imprimir; } else setTimeout(imprimir, 100);
  return html;
}

// ---- ajuda da IA (só aparece quando a IA estiver ligada no Apps Script) ----
async function ctIA(tipo, extra){
  const c = CT.edit; if (!c) return;
  if (!c.id || CT.sujo) { if (!(await ctSalvar(true))) return; }
  toast("Consultando a IA… pode levar alguns segundos.");
  try {
    const r = await api("cotIA", Object.assign({tipo, id:CT.edit.id}, extra || {}));
    const d = CT.edit.dados;
    if (tipo === "pedido" && r.texto) { ctAbrirPedido(r.texto); return; }
    if (tipo === "ler" && r.fornecedor) {
      const i = extra.indice, f = d.fornecedores[i];
      Object.keys(r.fornecedor).forEach(k => { const val = r.fornecedor[k]; if (val !== null && val !== undefined && val !== "" && k in f && k !== "anexos" && k !== "id") f[k] = (k === "frete" || k === "desconto") ? ctNum(val) : String(val); });
      (r.itens || []).forEach(x => {
        const alvo = d.itens.find(it => it.descricao && x.descricao && (norm(it.descricao).includes(norm(x.descricao).slice(0, 18)) || norm(x.descricao).includes(norm(it.descricao).slice(0, 18))))
          || (d.itens.length === 1 && !d.itens[0].precos.some(p => p !== null) ? d.itens[0] : null);
        if (alvo) { alvo.precos[i] = ctNum(x.precoUnit); if (!alvo.descricao) alvo.descricao = x.descricao || ""; if (!alvo.quant && x.quant) alvo.quant = ctNum(x.quant); }
        else d.itens.push({descricao:x.descricao || "", unid:x.unid || "un.", quant:ctNum(x.quant) || 1, precos:d.fornecedores.map((_, k) => k === i ? ctNum(x.precoUnit) : null), ref:null, refFonte:""});
      });
      CT.sujo = true; renderCotEditor(); toast("Orçamento lido pela IA. Confira os valores e salve.");
    }
    if (tipo === "comparar" && r.recomendacao) {
      d.recomendacao.fornecedor = Number.isInteger(r.recomendacao.fornecedor) ? r.recomendacao.fornecedor : d.recomendacao.fornecedor;
      d.recomendacao.justificativa = r.recomendacao.justificativa || d.recomendacao.justificativa;
      if (r.alertas && r.alertas.length) d.observacoes = (d.observacoes ? d.observacoes + "\n" : "") + "Pontos levantados pela IA: " + r.alertas.join("; ");
      CT.sujo = true; renderCotEditor(); toast("Recomendação da IA preenchida. Confira e salve.");
    }
    if (tipo === "referencia" && r.itens) {
      r.itens.forEach(x => { const it = d.itens[x.indice]; if (it && x.preco) { it.ref = ctNum(x.preco); it.refFonte = String(x.fonte || "").slice(0, 300); } });
      CT.sujo = true; renderCotEditor(); toast("Preços de referência preenchidos pela IA. Confira e salve.");
    }
  } catch(e){ toast(e.message, true); }
}

// ---- importar um mapa de cotação já feito na planilha do Pier (.xlsx) ----
// Procura os campos pelos nomes (Finalidade, Dados do Fornecedor, Item, Preço Unit.), não por posição fixa,
// para aceitar mapas com mais fornecedores ou mais itens. Os preços entram como estão na planilha.
const CT_IMP_CAMPOS = {"empresa":"empresa", "cnpj":"cnpj", "telefone":"telefone", "e-mail":"email", "email":"email", "contato":"contato",
  "marca / modelo ofertado":"modelo", "marca/modelo":"modelo", "modelo":"modelo", "prazo de entrega":"prazo", "prazo":"prazo",
  "condicao de pagamento":"pagamento", "pagamento":"pagamento", "validade da proposta":"validade", "validade":"validade", "garantia":"garantia",
  "atende a especificacao?":"atende", "instalacao inclusa?":"instalacao", "frete (r$)":"frete", "frete":"frete", "desconto (r$)":"desconto", "desconto":"desconto", "observacao":"obs"};
const ctRot = v => norm(String(v === undefined || v === null ? "" : v)).replace(/\s+/g, " ").replace(/:\s*$/, "").trim();
function ctDataIso(v){
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(v || "").trim());
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(String(v || "")) ? String(v).slice(0, 10) : "";
}
// leitor de .xlsx do próprio site (zip + XML), sem biblioteca externa: valores das células de cada aba
async function xlsxLer(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(buf), td = new TextDecoder();
  let fim = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65600); i--) if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  if (fim < 0) throw {message:"Este arquivo não é uma planilha .xlsx válida."};
  const arqs = {}; let p = dv.getUint32(fim + 16, true);
  for (let k = 0, n = dv.getUint16(fim + 10, true); k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true);
    arqs[td.decode(u8.subarray(p + 46, p + 46 + ln))] = {metodo: dv.getUint16(p + 10, true), tam: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true)};
    p += 46 + ln + le + lc;
  }
  const ler = async nome => {
    const a = arqs[nome]; if (!a) return null;
    const ini = a.off + 30 + dv.getUint16(a.off + 26, true) + dv.getUint16(a.off + 28, true), d = u8.subarray(ini, ini + a.tam);
    if (a.metodo === 0) return td.decode(d);
    if (a.metodo !== 8 || typeof DecompressionStream === "undefined") throw {semLeitor:true};
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  };
  const xml = t => new DOMParser().parseFromString(t || "<x/>", "application/xml");
  const filhos = (el, nome) => [...el.getElementsByTagName("*")].filter(e => e.localName === nome);
  const wb = xml(await ler("xl/workbook.xml")), rels = xml(await ler("xl/_rels/workbook.xml.rels"));
  const alvo = {}; filhos(rels, "Relationship").forEach(r => { alvo[r.getAttribute("Id")] = r.getAttribute("Target"); });
  const ss = xml(await ler("xl/sharedStrings.xml"));
  const textos = filhos(ss, "si").map(si => filhos(si, "t").map(t => t.textContent).join(""));
  const col = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const abas = [];
  for (const sh of filhos(wb, "sheet")) {
    const rid = [...sh.attributes].find(a => a.localName === "id" && a.name !== "sheetId");
    let caminho = alvo[rid ? rid.value : ""] || ""; caminho = caminho.startsWith("/") ? caminho.slice(1) : "xl/" + caminho.replace(/^\.\//, "");
    const doc = xml(await ler(caminho)), cel = new Map(); let r1 = 0, c1 = 0;
    filhos(doc, "c").forEach(c => {
      const ref = c.getAttribute("r"); if (!ref) return;
      const r = Number(/\d+$/.exec(ref)[0]) - 1, k = col(ref), t = c.getAttribute("t");
      const v = filhos(c, "v")[0];
      let val;
      if (t === "s") val = v ? textos[Number(v.textContent)] : undefined;
      else if (t === "inlineStr") val = filhos(c, "t").map(x => x.textContent).join("");
      else if (t === "str" || t === "e") val = v ? v.textContent : undefined;
      else if (t === "b") val = v ? v.textContent === "1" : undefined;
      else val = v && v.textContent !== "" ? Number(v.textContent) : undefined;
      if (val === undefined || val === "") return;
      cel.set(r + "," + k, val); r1 = Math.max(r1, r); c1 = Math.max(c1, k);
    });
    abas.push({nome: sh.getAttribute("name"), folha: {val: (r, c) => cel.get(r + "," + c), r0: 0, r1, c0: 0, c1}});
  }
  return abas;
}
// mesma "folha" a partir da biblioteca de planilhas (só para navegadores antigos, sem leitor de zip)
function xlsxFolhaSheetJS(ws){
  if (!ws || !ws["!ref"]) return null;
  const R = XLSX.utils.decode_range(ws["!ref"]);
  return {val: (r, c) => { const x = ws[XLSX.utils.encode_cell({r, c})]; return x ? x.v : undefined; }, r0: R.s.r, r1: R.e.r, c0: R.s.c, c1: R.e.c};
}
function ctLerMapa(F){
  if (!F) return null;
  const R = {s:{r:F.r0, c:F.c0}, e:{r:F.r1, c:F.c1}};
  const val = (r, c) => F.val(r, c);
  const vazio = v => v === undefined || v === null || String(v).trim() === "";
  const achar = (rotulo, de) => { for (let r = de || R.s.r; r <= R.e.r; r++) for (let c = R.s.c; c <= Math.min(R.e.c, R.s.c + 3); c++) if (ctRot(val(r, c)) === rotulo) return {r, c}; return null; };
  const direita = p => { if (!p) return ""; for (let c = p.c + 1; c <= R.e.c; c++) if (!vazio(val(p.r, c))) return val(p.r, c); return ""; };
  const hd = achar("dados do fornecedor"); if (!hd) return null;
  // colunas dos fornecedores: cabeçalhos preenchidos à direita de "Dados do Fornecedor"
  const cols = []; for (let c = hd.c + 1; c <= R.e.c; c++) if (!vazio(val(hd.r, c))) cols.push(c);
  if (!cols.length) return null;
  const forn = cols.map(c => Object.assign(ctFornVazio(), {empresa: String(val(hd.r, c)).trim()}));
  const hi = achar("item", hd.r + 1);
  const fimForn = hi ? hi.r : R.e.r;
  for (let r = hd.r + 1; r < fimForn; r++) {
    const k = CT_IMP_CAMPOS[ctRot(val(r, hd.c))]; if (!k) continue;
    cols.forEach((c, i) => {
      const v = val(r, c); if (vazio(v)) return;
      if (k === "frete" || k === "desconto") forn[i][k] = typeof v === "number" ? v : ctNum(v);
      else if (k === "atende") forn[i][k] = ["Sim","Não","Parcial"].find(o => norm(o) === norm(v)) || "";
      else if (k === "instalacao") forn[i][k] = ["Sim","Não"].find(o => norm(o) === norm(v)) || "";
      else forn[i][k] = String(v).trim().slice(0, k === "pagamento" ? 160 : 120);
    });
  }
  // itens: a coluna do preço unitário de cada fornecedor fica embaixo do nome dele (linha de "Preço Unit.")
  const itens = [];
  let fimItens = R.e.r;
  if (hi) {
    const sub = hi.r + 1;
    const colU = cols.map(c => { for (let k = c; k <= Math.min(R.e.c, c + 1); k++) if (/unit/.test(ctRot(val(sub, k)))) return k; return c; });
    const cDesc = hi.c + 1, cUn = hi.c + 2, cQ = hi.c + 3;
    for (let r = sub + 1; r <= R.e.r; r++) {
      if (/^valor total/.test(ctRot(val(r, hi.c)))) { fimItens = r; break; }
      const desc = val(r, cDesc); if (vazio(desc)) continue;
      const q = val(r, cQ);
      itens.push({descricao: String(desc).trim().slice(0, 300), unid: vazio(val(r, cUn)) ? "un." : String(val(r, cUn)).trim().slice(0, 12),
        quant: typeof q === "number" ? q : ctNum(q), precos: colU.map(c => { const v = val(r, c); return vazio(v) ? null : typeof v === "number" ? v : ctNum(v); }), ref:null, refFonte:""});
    }
  }
  // observações depois do total (menos a legenda do modelo em branco)
  const obs = [];
  for (let r = fimItens + 1; r <= R.e.r; r++) {
    const a = val(r, R.s.c), b = val(r, R.s.c + 1);
    if (/^legenda/.test(ctRot(a))) break;
    const t = [vazio(a) ? "" : String(a).trim(), vazio(b) ? "" : String(b).trim()].filter(Boolean).join(" ");
    if (t) obs.push(t);
  }
  const usados = forn.filter((f, i) => itens.some(it => it.precos[i] !== null));
  if (!itens.length || !usados.length) return null;
  return { finalidade: String(direita(achar("finalidade da cotacao")) || "").trim().slice(0, 160), data: ctDataIso(direita(achar("data da cotacao"))) || hoje(),
    solicitante: String(direita(achar("solicitante / responsavel")) || "").trim().slice(0, 80),
    dados: { especificacao: "", fornecedores: forn, itens, observacoes: obs.join("\n").slice(0, 3000), recomendacao: {fornecedor:-1, justificativa:""} } };
}
async function ctImportar(file){
  if (!file) return;
  if (!/\.xlsx?$/i.test(file.name)) { toast("Escolha a planilha do mapa de cotação (.xlsx).", true); return; }
  toast("Lendo a planilha…");
  try {
    const buf = await file.arrayBuffer();
    let abas;
    try { abas = await xlsxLer(buf); }
    catch(e){
      if (!e || !e.semLeitor) throw e;
      await carregarXLSX();
      const wb = XLSX.read(buf, {type:"array"});
      abas = wb.SheetNames.map(n => ({nome:n, folha:xlsxFolhaSheetJS(wb.Sheets[n])}));
    }
    const mapas = abas.map(a => ({aba:a.nome, m:ctLerMapa(a.folha)})).filter(x => x.m);
    if (!mapas.length) { toast("Não encontrei um mapa de cotação preenchido nesta planilha (com fornecedores e preços).", true); return; }
    const usar = x => {
      const c = ctVazia();
      Object.assign(c, {finalidade: x.m.finalidade || x.aba, data: x.m.data, solicitante: x.m.solicitante || S.nome || ""});
      c.dados = x.m.dados;
      ctAbrir(c); CT.sujo = true; renderCotEditor();
      const nf = c.dados.fornecedores.length, ni = c.dados.itens.length;
      toast(`Planilha importada (aba ${x.aba}): ${nf} fornecedor${nf===1?"":"es"} e ${ni} ite${ni===1?"m":"ns"}. Os preços entraram como estão na planilha (frete já somado não foi separado). Confira, anexe os orçamentos e salve.`);
    };
    if (mapas.length === 1) { usar(mapas[0]); return; }
    $("#modal-box").innerHTML = `<h3>Qual aba importar?</h3><p class="hint" style="margin:-6px 0 12px">A planilha tem ${mapas.length} mapas preenchidos.</p>
      <div class="actions" style="flex-direction:column;align-items:stretch">${mapas.map((x, i) => `<button type="button" class="btn" data-aba="${i}"><b>${esc(x.aba)}</b> · ${esc(x.m.finalidade || "")} · ${x.m.dados.fornecedores.length} fornecedores</button>`).join("")}
      <button type="button" class="btn" id="ct-imp-x">Cancelar</button></div>`;
    $("#modal").hidden = false;
    $("#ct-imp-x").onclick = fecharModal;
    $$("#modal-box [data-aba]").forEach(b => b.onclick = () => { fecharModal(); usar(mapas[+b.dataset.aba]); });
  } catch(e){ toast(e.message || "Não foi possível ler a planilha.", true); }
}

if (TEM_ADM && $("#t-cotacoes")) {
  $("#ct-nova").addEventListener("click", () => ctNova());
  $("#ct-importar").addEventListener("click", () => $("#ct-imp-arq").click());
  $("#ct-imp-arq").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; ctImportar(f); });
  $("#ct-q").addEventListener("input", e => { CT.q = e.target.value; renderCot(); });
  $("#ct-fs").addEventListener("change", e => { CT.st = e.target.value; renderCot(); });
  $("#ct-resumo").addEventListener("click", e => { const b = e.target.closest("[data-ctst]"); if (!b) return; CT.st = CT.st === b.dataset.ctst ? "" : b.dataset.ctst; renderCot(); });
  $("#ct-body").addEventListener("click", e => { const tr = e.target.closest("tr[data-ct]"); if (!tr) return; const c = (CT.lista || []).find(x => x.id === tr.dataset.ct); if (c) ctAbrir(c); });
  $("#ct-body").addEventListener("keydown", e => { if (e.key === "Enter") { const tr = e.target.closest("tr[data-ct]"); if (tr) tr.click(); } });
  const ed = $("#ct-editor");
  ed.addEventListener("input", ctLerCampo);
  ed.addEventListener("change", e => {
    if (e.target.dataset.up !== undefined) { ctAnexar(+e.target.dataset.up, e.target.files[0]); e.target.value = ""; return; }
    if (e.target.tagName === "SELECT") ctLerCampo(e);
    // números ficam no formato brasileiro ao sair do campo
    if (e.target.classList.contains("num") && !e.target.classList.contains("ct-q")) { const n = ctNum(e.target.value); if (n !== null) e.target.value = ctFmtN(n); }
  });
  ed.addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    const d = CT.edit && CT.edit.dados;
    if (b.id === "ct-voltar") { if (CT.sujo && ctEditavel()) { $("#ct-sair").hidden = false; return; } CT.edit = null; renderCot(); return; }
    if (b.id === "ct-sair-no") { $("#ct-sair").hidden = true; return; }
    if (b.id === "ct-sair-desc") { CT.edit = null; CT.sujo = false; renderCot(); return; }
    if (b.id === "ct-sair-salvar") { if (await ctSalvar()) { CT.edit = null; renderCot(); } return; }
    if (b.id === "ct-salvar") { ctSalvar(); return; }
    if (b.id === "ct-pedido") { ctAbrirPedido(); return; }
    if (b.id === "ct-xlsx") { ctBaixarXlsx(); return; }
    if (b.id === "ct-print") { ctImprimir(); return; }
    if (b.id === "ct-drive") { ctSalvarMapaDrive(false); return; }
    if (b.id === "ct-addf") { d.fornecedores.push(ctFornVazio()); d.itens.forEach(it => it.precos.push(null)); CT.sujo = true; renderCotEditor(); return; }
    if (b.id === "ct-addi") { d.itens.push({descricao:"", unid:"un.", quant:1, precos:d.fornecedores.map(() => null), ref:null, refFonte:""}); CT.sujo = true; renderCotEditor(); const ins = $$("#ct-editor [data-k=descricao]"); if (ins.length) ins[ins.length-1].focus(); return; }
    if (b.dataset.rmf !== undefined) { const i = +b.dataset.rmf; d.fornecedores.splice(i, 1); d.itens.forEach(it => it.precos.splice(i, 1)); const r = d.recomendacao.fornecedor; d.recomendacao.fornecedor = r === i ? -1 : r > i ? r - 1 : r; CT.sujo = true; renderCotEditor(); return; }
    if (b.dataset.rmi !== undefined) { d.itens.splice(+b.dataset.rmi, 1); CT.sujo = true; renderCotEditor(); return; }
    if (b.id === "ct-sugerir") { const s = ctSugestao(d); if (!s) { toast("Preencha os preços de todos os itens de pelo menos um fornecedor.", true); return; } d.recomendacao = s; CT.sujo = true; renderCotEditor(); return; }
    if (b.dataset.anx) { ctBaixarArquivo(b.dataset.anx, b.dataset.nome); return; }
    if (b.dataset.op) { b.disabled = true; await ctOp(b.dataset.op); return; }
    if (b.dataset.ia) { b.disabled = true; await ctIA(b.dataset.ia, b.dataset.ia === "ler" ? {indice:+b.dataset.s, fileId:b.dataset.anx2} : null); b.disabled = false; return; }
  });
}

// ---------- indicadores da manutenção (OS e demandas): dashboard, lista, kanban, agenda e modo apresentação ----------
// Só para quem tem "Ver dashboard". Os dados vêm do mesmo relatório do Dashboard (por período), então funcionam
// mesmo com o Apps Script anterior; o campo Equipamento aparece quando o Apps Script novo estiver instalado.
const IND = { de:"", ate:"", preset:"mes", vista:"dash", f:{tipo:"", cat:"", exec:"", sol:"", local:"", equip:""}, drill:null, mes:"", tok:0, carregando:false, apres:false, timer:0 };
const IND_ST = { Aberta:"Aguardando", Pendente:"Aguardando", "Em andamento":"Em atendimento", "Concluída":"Finalizada", Cancelada:"Cancelada" };
const indMs = s => { const d = dt(s); return d && !isNaN(d) ? d.getTime() : 0; };
function indDur(ms){
  if (!(ms > 0)) return "—";
  const min = Math.round(ms / 6e4), h = Math.floor(min / 60), d = Math.floor(h / 24);
  return d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h ${min % 60}min` : `${min}min`;
}
// une OS e demandas num formato só
function indItens(){
  const R = IND.dados; if (!R) return [];
  const os = (R.os || []).filter(osDoAmb).map(o => ({
    id:o.id, tipo:"OS", numero:o.numero, titulo:o.titulo, st:IND_ST[o.status] || o.status, status:o.status, prioridade:o.prioridade || "Normal",
    categoria:o.categoria || "", local:String(o.local||"").trim(), equipamento:String(o.equipamento||"").trim(), solicitante:String(o.solicitante||o.abertaPor||"").trim(),
    executante:String(o.responsavel||o.concluidaPor||"").trim(), abertaEm:o.abertaEm, iniciadaEm:o.iniciadaEm, concluidaEm:o.concluidaEm, prazo:o.prazo }));
  // demandas só existem na manutenção
  const dem = osAmb() === "Manutenção" ? (R.demandas || []).map(d => ({
    id:d.id, tipo:d.preventiva ? "Preventiva" : "Demanda", numero:d.numero, titulo:d.titulo, st:IND_ST[d.status] || d.status, status:d.status, prioridade:d.prioridade || "Normal",
    categoria:d.categoria || "", local:String(d.local||"").trim(), equipamento:"", solicitante:String(d.criadaPor||"").trim(),
    executante:String(d.responsavel||d.concluidaPor||"").trim(), abertaEm:d.criadaEm, iniciadaEm:d.iniciadaEm, concluidaEm:d.concluidaEm, prazo:d.prazo })) : [];
  return os.concat(dem);
}
const indDia = s => String(s || "").slice(0, 10);
const indNoPeriodo = x => { const a = indDia(x.abertaEm); return a >= IND.de && a <= IND.ate; };
const indFimNoPeriodo = x => { const c = indDia(x.concluidaEm); return x.st === "Finalizada" && c >= IND.de && c <= IND.ate; };
const indAberto = x => x.st === "Aguardando" || x.st === "Em atendimento";
const indExpirada = x => !!x.prazo && x.st !== "Cancelada" && (x.st === "Finalizada" ? indDia(x.concluidaEm) > x.prazo : x.prazo < hoje());
function indPassaFiltros(x){
  const f = IND.f;
  if (f.tipo && x.tipo !== f.tipo) return false;
  if (f.cat && (x.categoria || "Sem categoria") !== f.cat) return false;
  if (f.exec && (x.executante || "Sem executante") !== f.exec) return false;
  if (f.sol && (x.solicitante || "—") !== f.sol) return false;
  if (f.local && x.local !== f.local) return false;
  if (f.equip && x.equipamento !== f.equip) return false;
  return true;
}
function indPeriodo(p){
  const h = new Date(), y = h.getFullYear(), m = h.getMonth(), d = h.getDate();
  if (p === "hoje") return [iso(h), iso(h)];
  if (p === "7") return [iso(new Date(y, m, d - 6)), iso(h)];
  if (p === "30") return [iso(new Date(y, m, d - 29)), iso(h)];
  return [iso(new Date(y, m, 1)), iso(h)];
}
async function carregarInd(){
  if (!can("dashboard") || !S.token || !$("#t-indicadores")) return;
  if (!IND.de) { [IND.de, IND.ate] = indPeriodo(IND.preset); $("#ind-de").value = IND.de; $("#ind-ate").value = IND.ate; }
  const tok = ++IND.tok; IND.carregando = true; $("#t-indicadores").classList.add("carregando");
  if (!IND.dados) $("#ind-kpis").innerHTML = `<div class="empty">Carregando os indicadores…</div>`;
  try {
    const r = await api("relatorio", {de:IND.de, ate:IND.ate});
    if (tok === IND.tok) { IND.dados = r.relatorio; IND.carregadoEm = new Date(); renderInd(); }
  } catch(e){ if (tok === IND.tok) { toast(e.message, true); if (!IND.dados) $("#ind-kpis").innerHTML = `<div class="notice crit">${esc(e.message)}</div>`; } }
  finally { if (tok === IND.tok) { IND.carregando = false; $("#t-indicadores").classList.remove("carregando"); } }
}
// opções dos filtros a partir dos dados carregados (mantém o que já estava escolhido)
function indOpcoes(itens){
  const preencher = (sel, rot, vals, cur) => {
    const el = $(sel); const lista = [...new Set(vals.filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR"));
    if (cur && !lista.includes(cur)) lista.unshift(cur);
    el.innerHTML = `<option value="">${rot}</option>` + lista.map(v => `<option ${v===cur?"selected":""}>${esc(v)}</option>`).join("");
  };
  preencher("#ind-cat", "Todas", itens.map(x => x.categoria || "Sem categoria"), IND.f.cat);
  preencher("#ind-exec", "Todos", itens.map(x => x.executante || "Sem executante"), IND.f.exec);
  preencher("#ind-sol", "Todos", itens.map(x => x.solicitante || "—"), IND.f.sol);
  preencher("#ind-local", "Todos", itens.map(x => x.local), IND.f.local);
  const eqs = itens.map(x => x.equipamento).filter(Boolean);
  preencher("#ind-equip", eqs.length ? "Todos" : "Nenhum equipamento informado ainda", eqs, IND.f.equip);
  $("#ind-equip").disabled = !eqs.length && !IND.f.equip;
}
function renderInd(){
  const sec = $("#t-indicadores"); if (!sec || sec.hidden) return;
  if (!IND.dados) return;
  const todos = indItens(); indOpcoes(todos);
  const itens = todos.filter(indPassaFiltros), base = itens.filter(indNoPeriodo);
  const dias = Math.round((new Date(IND.ate) - new Date(IND.de)) / 864e5) + 1;
  $("#ind-resumo").textContent = `${fData(IND.de)} a ${fData(IND.ate)} · ${dias} dia${dias===1?"":"s"}` + (IND.carregadoEm ? ` · atualizado às ${IND.carregadoEm.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}` : "");
  const abertasAgora = itens.filter(indAberto);
  $("#ind-n-lista").textContent = base.length;
  $("#ind-n-kanban").textContent = abertasAgora.length;
  $$("#ind-vistas [data-v]").forEach(b => b.setAttribute("aria-selected", b.dataset.v === IND.vista ? "true" : "false"));
  ["dash","lista","kanban","agenda"].forEach(v => { $("#ind-" + v).hidden = v !== IND.vista; });
  if (IND.vista === "dash") indDash(itens, base, abertasAgora);
  if (IND.vista === "lista") indLista(itens);
  if (IND.vista === "kanban") indKanban(itens);
  if (IND.vista === "agenda") indAgenda(itens);
}
function indDash(itens, base, abertasAgora){
  const fin = base.filter(x => x.st === "Finalizada"), validos = base.filter(x => x.st !== "Cancelada");
  const ag = base.filter(x => x.st === "Aguardando"), at = base.filter(x => x.st === "Em atendimento");
  const exp = base.filter(indExpirada), expAb = exp.filter(indAberto).length;
  const tempos = fin.map(x => indMs(x.concluidaEm) - indMs(x.abertaEm)).filter(v => v > 0);
  const exec = fin.map(x => indMs(x.concluidaEm) - indMs(x.iniciadaEm || x.abertaEm)).filter(v => v > 0);
  const media = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const taxa = validos.length ? Math.round(fin.length / validos.length * 100) : 0;
  const k = (cls, rot, v, sub, ir, ico) => `<button type="button" class="ind-kpi ${cls}" data-ir="${ir}"><span class="ind-kl">${rot}</span><b class="num">${v}</b><span class="ind-ks">${sub}</span><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg></button>`;
  $("#ind-kpis").innerHTML = [
    k("azul", "OS no período", base.length, `abertas agora: ${abertasAgora.length}`, "todas", '<path d="M4 8.5 12 4l8 4.5-8 4.5zM4 12.5l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5"/>'),
    k("verde", "Finalizadas", fin.length, `taxa ${taxa}%`, "Finalizada", '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>'),
    k("ambar", "Aguardando", ag.length, "na fila / agendadas", "Aguardando", '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>'),
    k("roxo", "Em atendimento", at.length, "em execução agora", "Em atendimento", '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.3-.3-2.4z"/>'),
    k("vermelho", "Expiradas", exp.length, exp.length ? `${expAb} em aberto · ${exp.length - expAb} concluída${exp.length - expAb === 1 ? "" : "s"} com atraso` : "nenhuma fora do prazo", "expiradas", '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17h.01"/>'),
    k("grafite", "Tempo médio", indDur(media(tempos)), exec.length ? `execução média ${indDur(media(exec))}` : "da abertura à conclusão", "Finalizada", '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 2M9 2h6"/>')
  ].join("");
  $$("#ind-kpis .ind-kpi").forEach(b => b.onclick = () => {
    const ir = b.dataset.ir;
    IND.drill = ir === "todas" ? null : ir === "expiradas" ? {rot:"Expiradas", fn:indExpirada} : {rot:ir, fn:x => x.st === ir};
    indIr("lista");
  });
  indGrafTempo(itens);
  const contar = (lista, chave, vazio) => { const m = {}; lista.forEach(x => { const c = x[chave] || vazio; m[c] = (m[c] || 0) + 1; }); return Object.entries(m).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0],"pt-BR")); };
  // barras clicáveis: o clique abre a Lista de OS só com aquele valor
  const hb = (sel, pares, rotCampo, chave, semValor, msgVazio) => {
    barras(sel, pares.slice(0, 10).map(([r, v]) => ({rotulo:r, v, txt:String(v), tip:[["", `${v} no período`]]})), msgVazio);
    $$(sel + " .hb").forEach((el, i) => {
      const val = pares[i][0]; el.classList.add("click"); el.setAttribute("role", "button");
      el.onclick = () => { IND.drill = {rot:`${rotCampo}: ${val}`, fn:x => indNoPeriodo(x) && (x[chave] || semValor) === val}; indIr("lista"); };
      el.onkeydown = e => { if (e.key === "Enter") el.click(); };
    });
  };
  hb("#ind-g-cat", contar(base, "categoria", "Sem categoria"), "Categoria", "categoria", "Sem categoria", "Nenhuma OS no período.");
  hb("#ind-g-exec", contar(base, "executante", "Sem executante"), "Executante", "executante", "Sem executante", "Nenhuma OS no período.");
  hb("#ind-g-local", contar(base, "local", "Sem local"), "Local", "local", "Sem local", "Nenhuma OS no período.");
  hb("#ind-g-prio", ["Urgente","Alta","Normal","Baixa"].map(p => [p, base.filter(x => x.prioridade === p).length]).filter(p => p[1]), "Prioridade", "prioridade", "Normal", "Nenhuma OS no período.");
  hb("#ind-g-tipo", contar(base, "tipo", "OS"), "Tipo", "tipo", "OS", "Nenhuma OS no período.");
  const eq = contar(base.filter(x => x.equipamento), "equipamento", "");
  $("#ind-p-equip").hidden = !eq.length;
  if (eq.length) hb("#ind-g-equip", eq, "Equipamento", "equipamento", "", "");
  // prazo das finalizadas
  const noPrazo = fin.filter(x => x.prazo && !indExpirada(x)).length, fora = fin.filter(indExpirada).length, semPrazo = fin.length - noPrazo - fora;
  barras("#ind-g-prazo", [["No prazo", noPrazo], ["Fora do prazo", fora], ["Sem prazo", semPrazo]].filter(p => p[1]).map(([r, v]) => ({rotulo:r, v, txt:String(v) + (fin.length ? ` (${Math.round(v / fin.length * 100)}%)` : "")})), "Nenhuma finalizada no período.");
}
// abertas x finalizadas ao longo do período (por dia, semana ou mês, conforme o tamanho do período)
function indGrafTempo(itens){
  const el = $("#ind-g-tempo"); if (!el) return;
  const de = new Date(IND.de + "T00:00"), ate = new Date(IND.ate + "T00:00"), dias = Math.round((ate - de) / 864e5) + 1;
  const passo = dias <= 31 ? "dia" : dias <= 180 ? "semana" : "mes";
  const chave = s => { const d = new Date(indDia(s) + "T00:00"); if (passo === "dia") return iso(d); if (passo === "mes") return iso(new Date(d.getFullYear(), d.getMonth(), 1)); const w = new Date(d); w.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(w); };
  const grupos = []; const vistos = new Set();
  for (let d = new Date(de); d <= ate; d.setDate(d.getDate() + 1)) { const c = chave(iso(d)); if (!vistos.has(c)) { vistos.add(c); grupos.push(c); } }
  const ab = grupos.map(g => itens.filter(x => indNoPeriodo(x) && chave(x.abertaEm) === g).length);
  const fi = grupos.map(g => itens.filter(x => indFimNoPeriodo(x) && chave(x.concluidaEm) === g).length);
  const rot = g => passo === "mes" ? PP_MESES[+g.slice(5, 7) - 1] + "/" + g.slice(2, 4) : g.slice(8, 10) + "/" + g.slice(5, 7);
  $("#ind-t-tempo").textContent = `Abertas e finalizadas por ${passo === "dia" ? "dia" : passo === "semana" ? "semana" : "mês"}`;
  const W = Math.max(300, Math.round(el.clientWidth || 600)), H = W < 560 ? 200 : 240, pl = 30, pr = 8, pt = 10, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(1, ...ab, ...fi), top = niceMax(max), n = grupos.length, gw = iw / n, bw = Math.max(2, Math.min(18, gw * .36));
  const y = v => pt + ih - ih * v / top;
  let g = "";
  for (let i = 0; i <= 4; i++) { const v = top * i / 4; g += `<line class="pp-grade" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="pp-eixo" x="${pl - 5}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  const pulo = Math.max(1, Math.ceil(n / Math.floor(iw / 44)));
  grupos.forEach((c, i) => {
    const cx = pl + gw * (i + .5);
    g += `<g class="ind-barra" data-g="${c}" tabindex="0" role="button" aria-label="${rot(c)}: ${ab[i]} abertas, ${fi[i]} finalizadas"><rect class="ind-alvo" x="${pl + gw * i}" y="${pt}" width="${gw}" height="${ih}"/>`
      + `<rect class="ind-b ab" x="${cx - bw - 1}" y="${y(ab[i])}" width="${bw}" height="${Math.max(0, pt + ih - y(ab[i]))}" rx="2"><title>${rot(c)} · abertas: ${ab[i]}</title></rect>`
      + `<rect class="ind-b fi" x="${cx + 1}" y="${y(fi[i])}" width="${bw}" height="${Math.max(0, pt + ih - y(fi[i]))}" rx="2"><title>${rot(c)} · finalizadas: ${fi[i]}</title></rect></g>`;
    if (i % pulo === 0) g += `<text class="pp-eixo" x="${cx}" y="${H - 9}" text-anchor="middle">${rot(c)}</text>`;
  });
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="OS abertas e finalizadas no período">${g}</svg>`;
  $$("#ind-g-tempo .ind-barra").forEach(b => { const ir = () => { const c = b.dataset.g; IND.drill = {rot:`${passo === "dia" ? "Dia" : passo === "semana" ? "Semana de" : "Mês"} ${rot(c)}`, fn:x => (indNoPeriodo(x) && chave(x.abertaEm) === c) || (indFimNoPeriodo(x) && chave(x.concluidaEm) === c)}; indIr("lista"); }; b.onclick = ir; b.onkeydown = e => { if (e.key === "Enter") ir(); }; });
}
const indPill = x => `<span class="pill ${{"Aguardando":"st-aberta","Em atendimento":"st-andamento","Finalizada":"s-ok","Cancelada":"p-ajuste"}[x.st] || "p-ajuste"}">${esc(x.st)}${indExpirada(x) && indAberto(x) ? " · expirada" : ""}</span>`;
const indTipo = x => `<span class="ind-tipo ${norm(x.tipo)}">${esc(x.tipo)}</span>`;
function indLista(itens){
  const d = IND.drill;
  const lista = (d ? itens.filter(x => (indNoPeriodo(x) || indFimNoPeriodo(x) || indAberto(x)) && d.fn(x)) : itens.filter(indNoPeriodo))
    .sort((a, b) => String(b.abertaEm).localeCompare(String(a.abertaEm)));
  $("#ind-drill").innerHTML = d ? `<span class="ind-chip">Mostrando: <b>${esc(d.rot)}</b><button type="button" id="ind-drill-x" aria-label="Tirar este filtro">×</button></span>` : `<span class="muted">OS e demandas abertas no período.</span>`;
  if (d) $("#ind-drill-x").onclick = () => { IND.drill = null; renderInd(); };
  $("#ind-l-body").innerHTML = lista.length ? lista.map(x => `<tr class="click" tabindex="0" data-ind="${esc(x.tipo === "OS" ? "os" : "dem")}:${esc(x.id)}">
    <td class="mono" style="white-space:nowrap">${esc(x.numero || "—")}</td><td>${indTipo(x)}</td>
    <td><b>${esc(x.titulo)}</b><span class="sub">${esc([x.categoria, x.equipamento].filter(Boolean).join(" · "))}</span></td>
    <td class="hide-s">${esc(x.local || "—")}</td><td class="hide-m">${esc(x.executante || "—")}</td><td>${indPill(x)}</td>
    <td class="hide-s num" style="white-space:nowrap">${fData(x.abertaEm)}</td>
    <td class="hide-s num ${indExpirada(x) ? "atras" : ""}" style="white-space:nowrap">${x.st === "Finalizada" ? fData(x.concluidaEm) : fData(x.prazo)}</td></tr>`).join("")
    : `<tr><td colspan="8"><div class="empty">Nenhuma OS com esses filtros.</div></td></tr>`;
}
function indKanban(itens){
  const cols = [
    {st:"Aguardando", rot:"Aguardando", sub:"na fila", l:itens.filter(x => x.st === "Aguardando")},
    {st:"Em atendimento", rot:"Em atendimento", sub:"em execução", l:itens.filter(x => x.st === "Em atendimento")},
    {st:"Finalizada", rot:"Finalizadas", sub:"no período", l:itens.filter(indFimNoPeriodo)}
  ];
  const ord = (a, b) => (indExpirada(b) - indExpirada(a)) || ((PRIO_ORD[a.prioridade] ?? 2) - (PRIO_ORD[b.prioridade] ?? 2)) || String(a.prazo || "9").localeCompare(String(b.prazo || "9"));
  $("#ind-kanban").innerHTML = `<p class="hint">Aguardando e Em atendimento mostram tudo o que está em aberto agora; Finalizadas, o que foi concluído no período. Toque num cartão para abrir.</p><div class="ind-kb">` + cols.map(c => {
    const l = c.st === "Finalizada" ? c.l.sort((a, b) => String(b.concluidaEm).localeCompare(String(a.concluidaEm))) : c.l.sort(ord);
    return `<section class="ind-col ${norm(c.st).replace(/\s+/g, "-")}"><h4>${esc(c.rot)} <span class="badge">${l.length}</span><small>${c.sub}</small></h4><div class="ind-cards">`
      + (l.slice(0, 60).map(x => `<button type="button" class="ind-kc prio-${norm(x.prioridade)} ${indExpirada(x) ? "exp" : ""}" data-ind="${x.tipo === "OS" ? "os" : "dem"}:${esc(x.id)}">
          <span class="ind-kc-top"><span class="mono">${esc(x.numero || "")}</span>${indTipo(x)}</span><b>${esc(x.titulo)}</b>
          <span class="ind-kc-meta">${esc([x.local, x.equipamento].filter(Boolean).join(" · ") || "—")}</span>
          <span class="ind-kc-meta">${esc(x.executante || "Sem executante")} · ${x.st === "Finalizada" ? "concluída " + fData(x.concluidaEm) : x.prazo ? (indExpirada(x) ? "expirou " : "prazo ") + fData(x.prazo) : "sem prazo"}</span></button>`).join("") || `<div class="empty">Nada aqui.</div>`)
      + (l.length > 60 ? `<p class="hint">+ ${l.length - 60} na Lista de OS</p>` : "") + `</div></section>`;
  }).join("") + `</div>`;
}
function indAgenda(itens){
  if (!IND.mes) IND.mes = hoje().slice(0, 7);
  const [y, m] = IND.mes.split("-").map(Number), primeiro = new Date(y, m - 1, 1), ultimo = new Date(y, m, 0);
  const ev = {};
  const por = (dia, e) => { (ev[dia] = ev[dia] || []).push(e); };
  itens.forEach(x => {
    if (x.st === "Cancelada") return;
    const dia = x.st === "Finalizada" ? indDia(x.concluidaEm) : x.prazo;
    if (dia && dia.slice(0, 7) === IND.mes) por(dia, {x, cls: x.st === "Finalizada" ? "fin" : indExpirada(x) ? "exp" : x.st === "Em atendimento" ? "at" : "ag"});
  });
  // preventivas programadas (próxima data), para quem gerencia demandas
  (S.prev || []).filter(p => String(p.ativa) !== "Não" && p.proxima && String(p.proxima).slice(0, 7) === IND.mes && p.proxima >= hoje())
    .filter(p => !IND.f.tipo || IND.f.tipo === "Preventiva").filter(p => !IND.f.cat || p.categoria === IND.f.cat)
    .forEach(p => por(String(p.proxima).slice(0, 10), {prev:p, cls:"prog"}));
  const nomeMes = primeiro.toLocaleDateString("pt-BR", {month:"long", year:"numeric"});
  let h = `<div class="ind-ag-top"><button type="button" class="btn small" data-mes="-1" aria-label="Mês anterior">‹</button><h4>${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}</h4><button type="button" class="btn small" data-mes="1" aria-label="Próximo mês">›</button><button type="button" class="btn small" data-mes="0">Hoje</button>
    <span class="ind-leg"><span><i class="ag"></i>Aguardando</span><span><i class="at"></i>Em atendimento</span><span><i class="exp"></i>Expirada</span><span><i class="fin"></i>Finalizada</span><span><i class="prog"></i>Preventiva programada</span></span></div>
    <div class="ind-cal"><div class="ind-sem">Seg</div><div class="ind-sem">Ter</div><div class="ind-sem">Qua</div><div class="ind-sem">Qui</div><div class="ind-sem">Sex</div><div class="ind-sem">Sáb</div><div class="ind-sem">Dom</div>`;
  for (let i = 0; i < (primeiro.getDay() + 6) % 7; i++) h += `<div class="ind-dia vazio" aria-hidden="true"></div>`;
  for (let d = 1; d <= ultimo.getDate(); d++) {
    const dia = iso(new Date(y, m - 1, d)), l = ev[dia] || [];
    h += `<div class="ind-dia ${dia === hoje() ? "hoje" : ""} ${l.length ? "" : "sem"}"><span class="ind-dn">${d}<small> ${["dom","seg","ter","qua","qui","sex","sáb"][new Date(y, m - 1, d).getDay()]}</small></span>`
      + l.slice(0, 4).map(e => e.prev ? `<span class="ind-ev prog" title="${esc(e.prev.titulo)}">${esc(e.prev.titulo)}</span>`
        : `<button type="button" class="ind-ev ${e.cls}" data-ind="${e.x.tipo === "OS" ? "os" : "dem"}:${esc(e.x.id)}" title="${esc((e.x.numero || "") + " " + e.x.titulo)}">${esc(e.x.numero ? e.x.numero.replace(/^OS-0*/, "OS ") + " " : "")}${esc(e.x.titulo)}</button>`).join("")
      + (l.length > 4 ? `<span class="ind-mais">+ ${l.length - 4}</span>` : "") + `</div>`;
  }
  $("#ind-agenda").innerHTML = h + `</div><p class="hint">Em aberto aparecem no dia do prazo; finalizadas, no dia em que foram concluídas. As finalizadas antigas só aparecem se estiverem dentro do período escolhido nos filtros.</p>`;
  $$("#ind-agenda [data-mes]").forEach(b => b.onclick = () => { const k = +b.dataset.mes; IND.mes = k ? iso(new Date(y, m - 1 + k, 1)).slice(0, 7) : hoje().slice(0, 7); indAgenda(itens); });
}
function indIr(v){ IND.vista = v; renderInd(); if (!IND.apres) { const t = $("#ind-vistas"); if (t) t.scrollIntoView({block:"nearest"}); } }
// abre a OS ou a demanda (se ela não estiver na lista do dia a dia, mostra um resumo)
function indAbrir(chave){
  const [tipo, id] = chave.split(":");
  if (tipo === "os" && S.os.some(o => o.id === id)) { abrirOS(id); return; }
  if (tipo === "dem" && S.dem.some(d => d.id === id)) { abrirDem(id); return; }
  const x = indItens().find(i => i.id === id); if (!x) return;
  $("#modal-box").innerHTML = `<div class="os-top"><span class="mono muted">${esc(x.numero || "")}</span>${indPill(x)}${prioPill(x.prioridade)}</div><h3 class="os-tit">${esc(x.titulo)}</h3>
    <dl class="os-info"><div><dt>Tipo</dt><dd>${esc(x.tipo)}</dd></div><div><dt>Local</dt><dd>${esc(x.local || "—")}</dd></div><div><dt>Categoria</dt><dd>${esc(x.categoria || "—")}</dd></div>
    ${x.equipamento ? `<div><dt>Equipamento</dt><dd>${esc(x.equipamento)}</dd></div>` : ""}<div><dt>Executante</dt><dd>${esc(x.executante || "—")}</dd></div><div><dt>Solicitante</dt><dd>${esc(x.solicitante || "—")}</dd></div>
    <div><dt>Aberta</dt><dd>${fDataHora(x.abertaEm)}</dd></div><div><dt>Prazo</dt><dd>${fData(x.prazo)}</dd></div>${x.concluidaEm ? `<div><dt>Encerrada</dt><dd>${fDataHora(x.concluidaEm)}</dd></div>` : ""}</dl>
    <p class="hint">Registro antigo: os detalhes completos ficam na aba ${x.tipo === "OS" ? "OS" : "Demandas"} da planilha.</p><div class="actions"><button class="btn" type="button" id="ind-res-x">Fechar</button></div>`;
  $("#modal").hidden = false; $("#ind-res-x").onclick = fecharModal; $("#ind-res-x").focus();
}
// modo apresentação: tela cheia, só os indicadores, atualiza sozinho a cada 2 minutos
function indApresentacao(ligar){
  IND.apres = ligar; document.body.classList.toggle("ind-apres", ligar);
  $("#ind-apres").textContent = ligar ? "Sair da apresentação" : "Modo apresentação";
  clearInterval(IND.timer);
  if (ligar) {
    IND.timer = setInterval(() => { if (S.tab === "indicadores" && document.visibilityState === "visible") carregarInd(); }, 120000);
    const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
  } else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  scrollTo({top:0}); setTimeout(renderInd, 80);
}
if ($("#t-indicadores")) {
  $("#ind-vistas").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) { if (b.dataset.v === "lista" && IND.vista !== "lista") IND.drill = null; indIr(b.dataset.v); } });
  $("#ind-presets").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; IND.preset = b.dataset.p; [IND.de, IND.ate] = indPeriodo(IND.preset); $("#ind-de").value = IND.de; $("#ind-ate").value = IND.ate; syncChips("#ind-presets", "p", IND.preset); carregarInd(); });
  const lerFiltros = () => { IND.f = {tipo:$("#ind-tipo").value, cat:$("#ind-cat").value, exec:$("#ind-exec").value, sol:$("#ind-sol").value, local:$("#ind-local").value, equip:$("#ind-equip").value}; };
  ["#ind-tipo","#ind-cat","#ind-exec","#ind-sol","#ind-local","#ind-equip"].forEach(s => $(s).addEventListener("change", () => { lerFiltros(); renderInd(); }));
  $("#ind-aplicar").addEventListener("click", () => {
    let de = $("#ind-de").value, ate = $("#ind-ate").value;
    if (!de || !ate) { toast("Informe as duas datas do período.", true); return; }
    if (de > ate) [de, ate] = [ate, de];
    IND.de = de; IND.ate = ate; IND.preset = ""; syncChips("#ind-presets", "p", ""); lerFiltros(); carregarInd();
  });
  $("#ind-limpar").addEventListener("click", () => { IND.f = {tipo:"", cat:"", exec:"", sol:"", local:"", equip:""}; $("#ind-tipo").value = ""; IND.drill = null; renderInd(); });
  $("#ind-atualizar").addEventListener("click", () => carregarInd());
  $("#ind-apres").addEventListener("click", () => indApresentacao(!IND.apres));
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && IND.apres) indApresentacao(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && IND.apres && $("#modal").hidden) indApresentacao(false); });
  $("#t-indicadores").addEventListener("click", e => { const b = e.target.closest("[data-ind]"); if (b) indAbrir(b.dataset.ind); });
  $("#t-indicadores").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset && e.target.dataset.ind) indAbrir(e.target.dataset.ind); });
  addEventListener("resize", () => { clearTimeout(IND.rz); IND.rz = setTimeout(() => { if (S.tab === "indicadores" && IND.vista === "dash" && IND.dados) indGrafTempo(indItens().filter(indPassaFiltros)); }, 150); });
}

// ---------- categorias de materiais: um cartão por categoria do estoque do setor; o clique abre Materiais filtrado ----------
function renderCategorias(){
  const box = $("#cat-cards"); if (!box || $("#t-categorias").hidden) return;
  const itens = [...S.itens.values()].filter(doSetor), por = {};
  itens.forEach(i => { const c = String(i.categoria || "").trim() || "Sem categoria"; const x = por[c] = por[c] || {n:0, repor:0, zero:0}; x.n++; const st = statusItem(i); if (st !== "ok") x.repor++; if (st === "zero") x.zero++; });
  const cats = Object.entries(por).sort((a, b) => a[0] === "Sem categoria" ? 1 : b[0] === "Sem categoria" ? -1 : a[0].localeCompare(b[0], "pt-BR"));
  $("#cat-resumo").textContent = `${cats.length} categoria${cats.length === 1 ? "" : "s"} · ${itens.length} materia${itens.length === 1 ? "l" : "is"} no estoque ${S.setor === "Limpeza" ? "da Limpeza" : "da Manutenção"}`;
  box.innerHTML = cats.length ? cats.map(([c, x]) => `<button type="button" class="cat-card" data-cat="${esc(c)}"><b>${esc(c)}</b><span class="cat-n num">${x.n}</span><small>materia${x.n === 1 ? "l" : "is"}</small>
      <span class="cat-st">${x.repor ? `<span class="pill s-baixo">${x.repor} para repor</span>` : `<span class="pill s-ok">tudo em dia</span>`}${x.zero ? `<span class="pill s-zero">${x.zero} zerado${x.zero === 1 ? "" : "s"}</span>` : ""}</span></button>`).join("")
    : `<div class="empty">Nenhum material cadastrado neste estoque.</div>`;
  $$("#cat-cards .cat-card").forEach(b => b.onclick = () => {
    const c = b.dataset.cat; setTab("itens");
    const sel = $("#i-cat"); renderItens();
    if (c !== "Sem categoria" && [...sel.options].some(o => o.value === c)) { sel.value = c; renderItens(); }
    else if (c === "Sem categoria") { sel.value = ""; $("#i-busca").value = ""; renderItens(); }
  });
}
// ---------- equipe: quem está ativo, contato e o que cada um tem em aberto ----------
const eqCarga = u => {
  const meu = x => x.responsavelUsuario ? x.responsavelUsuario === u.usuario : norm(x.responsavel || "") === norm(u.nome);
  const os = S.os.filter(o => !osEncerrada(o) && meu(o)), dem = S.dem.filter(d => !demEnc(d) && meu(d));
  return {os, dem, atras: os.filter(osAtrasada).length + dem.filter(demAtrasada).length};
};
function renderEquipeDir(){
  const box = $("#eq-body"); if (!box || $("#t-equipe").hidden) return;
  const q = norm($("#eq-busca").value);
  const lista = S.colab.filter(u => !q || norm([u.nome, u.usuario, u.telefone].join(" ")).includes(q)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  $("#eq-resumo").textContent = `${S.colab.length} pessoa${S.colab.length === 1 ? "" : "s"} ativa${S.colab.length === 1 ? "" : "s"} no sistema`;
  box.innerHTML = lista.length ? lista.map(u => { const c = eqCarga(u), tel = String(u.telefone || "").replace(/\D/g, "");
    return `<tr><td><span class="eq-pessoa"><span class="avatar" aria-hidden="true">${esc(iniciais(u.nome))}</span><span><b>${esc(u.nome)}</b><span class="sub mono">${esc(u.usuario)}</span></span></span></td>
      <td class="hide-s">${tel ? `<a href="https://wa.me/${tel.length <= 11 ? "55" + tel : tel}" target="_blank" rel="noopener">${esc(u.telefone)}</a>` : '<span class="muted">—</span>'}</td>
      <td class="num">${c.os.length}</td><td class="num">${c.dem.length}</td><td class="num ${c.atras ? "atras" : ""}">${c.atras}</td></tr>`; }).join("")
    : `<tr><td colspan="5"><div class="empty">${q ? "Ninguém com esse nome." : "Nenhuma pessoa ativa."}</div></td></tr>`;
}
// ---------- minha equipe: o que cada pessoa está fazendo agora (OS e demandas em aberto) ----------
function renderMinhaEquipe(){
  const box = $("#me-quadro"); if (!box || $("#t-minhaequipe").hidden) return;
  const ord = (a, b) => (b.atr - a.atr) || String(a.prazo || "9").localeCompare(String(b.prazo || "9"));
  // cada tarefa vai para a pessoa pelo login; se a OS antiga só tiver o nome, pelo nome
  const porNome = new Map(S.colab.map(u => [norm(u.nome), u.usuario]));
  const dono = x => x.responsavelUsuario || porNome.get(norm(x.responsavel || "")) || (String(x.responsavel || "").trim() ? "nome:" + String(x.responsavel).trim() : "");
  const tarefas = S.os.filter(o => !osEncerrada(o)).map(o => ({k:"os", id:o.id, num:o.numero, tit:o.titulo, prazo:o.prazo, atr:osAtrasada(o), st:o.status, local:o.local, dono:dono(o)}))
    .concat(osAmb() === "Manutenção" ? S.dem.filter(d => !demEnc(d)).map(d => ({k:"dem", id:d.id, num:d.numero, tit:d.titulo, prazo:d.prazo, atr:demAtrasada(d), st:d.status, local:d.local, dono:dono(d)})) : []);
  const grupos = new Map();
  tarefas.forEach(t => { if (!grupos.has(t.dono)) grupos.set(t.dono, []); grupos.get(t.dono).push(t); });
  grupos.forEach(l => l.sort(ord));
  const nomeDe = k => { const u = S.colab.find(c => c.usuario === k); return u ? u.nome : k.startsWith("nome:") ? k.slice(5) : k; };
  const pessoas = [...grupos.entries()].filter(([k]) => k).map(([k, l]) => ({nome:nomeDe(k), l})).sort((a, b) => b.l.length - a.l.length || a.nome.localeCompare(b.nome, "pt-BR"));
  const livres = S.colab.filter(u => !grupos.has(u.usuario));
  const sem = grupos.get("") || [];
  const card = (nome, sub, l, extra) => `<section class="me-col ${extra || ""}"><h4><span class="avatar" aria-hidden="true">${esc(iniciais(nome))}</span><span><b>${esc(nome)}</b><small>${esc(sub)}</small></span><span class="badge ${l.some(t => t.atr) ? "alert" : ""}">${l.length}</span></h4>
    <ul>${l.map(t => `<li><button type="button" class="me-t ${t.atr ? "atr" : ""}" data-me="${t.k}:${esc(t.id)}"><span class="mono">${esc(t.num || "")}</span> ${esc(t.tit)}<small>${esc(t.st)}${t.local ? " · " + esc(t.local) : ""} · ${t.prazo ? (t.atr ? "atrasada, prazo " : "prazo ") + fData(t.prazo) : "sem prazo"}</small></button></li>`).join("")}</ul></section>`;
  $("#me-resumo").textContent = `${tarefas.length} OS e demanda${tarefas.length === 1 ? "" : "s"} em aberto · ${pessoas.length} pessoa${pessoas.length === 1 ? "" : "s"} com tarefas` + (livres.length ? ` · ${livres.length} sem nada em aberto` : "");
  box.innerHTML = (sem.length ? card("Sem responsável", "esperando alguém assumir", sem, "sem") : "")
    + pessoas.map(x => { const a = x.l.filter(t => t.atr).length; return card(x.nome, `${x.l.length} em aberto${a ? ` · ${a} atrasada${a === 1 ? "" : "s"}` : ""}`, x.l); }).join("")
    + (livres.length ? `<section class="me-col livres"><h4><span><b>Sem nada em aberto</b><small>disponíveis para novas tarefas</small></span></h4><p>${livres.map(u => esc(u.nome)).join(" · ")}</p></section>` : "")
    || `<div class="empty">Nenhuma OS ou demanda em aberto.</div>`;
}
if ($("#t-minhaequipe")) $("#me-quadro").addEventListener("click", e => { const b = e.target.closest("[data-me]"); if (!b) return; const [k, id] = b.dataset.me.split(":"); if (k === "os") abrirOS(id); else abrirDem(id); });
if ($("#t-equipe")) $("#eq-busca").addEventListener("input", renderEquipeDir);

// ---------- prestadores de serviço (só no setor Manutenção) ----------
// Lista vem junto com os dados (Apps Script novo). Vê quem é da manutenção; cadastra quem gerencia OS ou distribui demandas.
const PR_FREQ = ["Semanal","Quinzenal","Mensal","Bimestral","Trimestral","Semestral","Anual","Sob demanda"];
const PR_DOCS = ["Contrato","ART","Certificado","Laudo","Seguro","Alvará","Proposta","Outro"];
const PR = { q:"", serv:"", f:"ativos" };
const prPodeEditar = () => can("os_gerenciar") || can("dem_delegar");
const prAtivo = p => !/^n/i.test(String(p.ativo || "Sim"));
const prDias = d => d ? Math.round((new Date(d + "T12:00") - new Date(hoje() + "T12:00")) / 864e5) : null;
// situação de uma data de vencimento: vencido, vence em até 30 dias ou ok
const prVenc = d => { const n = prDias(d); return n === null ? "" : n < 0 ? "vencido" : n <= 30 ? "vence" : "ok"; };
const prVisitaAtrasada = p => prAtivo(p) && p.proximaVisita && p.proximaVisita < hoje();
const prDocsAlerta = p => (p.docs || []).filter(d => d.validade && prVenc(d.validade) !== "ok");
const prAlertas = p => {
  if (!prAtivo(p)) return [];
  const a = [];
  const vc = prVenc(p.contratoFim);
  if (vc === "vencido") a.push({cls:"crit", txt:`Contrato vencido em ${fData(p.contratoFim)}`});
  else if (vc === "vence") a.push({cls:"warn", txt:`Contrato vence em ${fData(p.contratoFim)}`});
  if (prVisitaAtrasada(p)) a.push({cls:"crit", txt:`Visita atrasada (prevista ${fData(p.proximaVisita)})`});
  prDocsAlerta(p).forEach(d => a.push({cls: prVenc(d.validade) === "vencido" ? "crit" : "warn", txt:`${d.nome} ${prVenc(d.validade) === "vencido" ? "vencido" : "vence"} em ${fData(d.validade)}`}));
  return a;
};
const prTel = t => { const n = String(t || "").replace(/\D/g, ""); return n ? (n.length <= 11 ? "55" + n : n) : ""; };
const prContatos = p => [p.telefone ? `<a href="tel:+${prTel(p.telefone)}">${esc(p.telefone)}</a> · <a href="https://wa.me/${prTel(p.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : "", p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""].filter(Boolean).join(" · ");
const prPrevs = p => (S.prev || []).filter(v => v.prestador === p.id);
function renderPrestBadge(){
  const b = $("#b-prest"); if (!b) return;
  const n = (S.prest || []).filter(p => prAlertas(p).length).length;
  b.textContent = n; b.hidden = !n;
}
function renderPrest(){
  const sec = $("#t-prestadores"); if (!sec || sec.hidden) return;
  const novo = Array.isArray(S.prest);
  $("#pr-aviso").hidden = novo;
  $("#pr-novo").hidden = !novo || !prPodeEditar();
  $("#pr-baixar").hidden = $("#pr-importar").hidden = $("#pr-dica-plan").hidden = !novo || !prPodeEditar();
  if (!novo) { $("#pr-cards").innerHTML = ""; $("#pr-resumo").innerHTML = ""; return; }
  const todos = S.prest, ativos = todos.filter(prAtivo);
  const contr = ativos.filter(p => prVenc(p.contratoFim) && prVenc(p.contratoFim) !== "ok").length, vis = ativos.filter(prVisitaAtrasada).length, docs = ativos.filter(p => prDocsAlerta(p).length).length;
  $("#pr-resumo").innerHTML = [["ativos", ativos.length, `prestador${ativos.length === 1 ? "" : "es"} ativo${ativos.length === 1 ? "" : "s"}`, ""], ["atencao", ativos.filter(p => prAlertas(p).length).length, "precisam de atenção", "alerta"],
    ["contrato", contr, "contratos vencendo ou vencidos", contr ? "warn" : ""], ["visita", vis, "visitas atrasadas", vis ? "alerta" : ""], ["docs", docs, "com documento vencendo", docs ? "warn" : ""], ["inativos", todos.length - ativos.length, "inativos", ""]]
    .map(([k, n, rot, cls]) => `<button type="button" class="pd-stat ${cls}" data-f="${k}" aria-pressed="${PR.f === k}"><b>${n}</b><span>${rot}</span></button>`).join("");
  const servs = [...new Set(todos.map(p => p.servico).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#pr-serv").innerHTML = `<option value="">Todos os serviços</option>` + servs.map(s => `<option ${s === PR.serv ? "selected" : ""}>${esc(s)}</option>`).join("");
  const q = norm(PR.q);
  const lista = todos.filter(p => {
    if (PR.f === "inativos" ? prAtivo(p) : !prAtivo(p)) return false;
    if (PR.f === "atencao" && !prAlertas(p).length) return false;
    if (PR.f === "contrato" && !(prVenc(p.contratoFim) && prVenc(p.contratoFim) !== "ok")) return false;
    if (PR.f === "visita" && !prVisitaAtrasada(p)) return false;
    if (PR.f === "docs" && !prDocsAlerta(p).length) return false;
    if (PR.serv && p.servico !== PR.serv) return false;
    if (q && !norm([p.nome, p.servico, p.contato, p.telefone, p.email, p.cnpj].join(" ")).includes(q)) return false;
    return true;
  }).sort((a, b) => prAlertas(b).length - prAlertas(a).length || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  $("#pr-cards").innerHTML = lista.length ? lista.map(p => {
    const al = prAlertas(p), pv = prPrevs(p).length;
    return `<article class="pr-card ${al.some(a => a.cls === "crit") ? "crit" : al.length ? "warn" : ""} ${prAtivo(p) ? "" : "inativo"}">
      <button type="button" class="pr-abrir" data-pr="${esc(p.id)}"><span class="pr-top"><b>${esc(p.nome)}</b>${p.servico ? `<span class="pr-serv">${esc(p.servico)}</span>` : ""}</span>
        <span class="pr-lin">${esc(p.contato || "Sem contato")}${p.frequencia ? ` · visita ${esc(p.frequencia.toLowerCase())}` : ""}</span>
        <span class="pr-lin">${p.proximaVisita ? `Próxima visita: <b class="${prVisitaAtrasada(p) ? "atr" : ""}">${fData(p.proximaVisita)}</b>` : p.ultimaVisita ? `Última visita: ${fData(p.ultimaVisita)}` : "Nenhuma visita registrada"}</span>
        <span class="pr-lin">${p.contratoFim ? `Contrato até ${fData(p.contratoFim)}` : "Sem data de fim de contrato"}${(p.docs || []).length ? ` · ${(p.docs || []).length} documento${p.docs.length === 1 ? "" : "s"}` : ""}${pv ? ` · ${pv} preventiva${pv === 1 ? "" : "s"}` : ""}</span>
        ${al.length ? `<span class="pr-al">${al.map(a => `<span class="pill ${a.cls === "crit" ? "s-zero" : "s-baixo"}">${esc(a.txt)}</span>`).join("")}</span>` : ""}</button>
      ${p.telefone ? `<span class="pr-cont"><a class="btn small" href="tel:+${prTel(p.telefone)}">Ligar</a><a class="btn small wa" href="https://wa.me/${prTel(p.telefone)}" target="_blank" rel="noopener">WhatsApp</a></span>` : ""}
    </article>`; }).join("")
    : `<div class="empty">${todos.length ? "Nenhum prestador com esses filtros." : "Nenhum prestador cadastrado ainda." + (prPodeEditar() ? ` <button class="link" type="button" id="pr-novo2">Cadastrar o primeiro</button>` : "")}</div>`;
  if ($("#pr-novo2")) $("#pr-novo2").onclick = () => prForm(null);
}
function prDetalhe(id){
  const p = (S.prest || []).find(x => x.id === id); if (!p) { fecharModal(); return; }
  const ed = prPodeEditar(), al = prAlertas(p), pvs = prPrevs(p), vis = (p.visitas || []).slice().reverse().slice(0, 8);
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `
    <div class="os-top"><span class="pr-serv">${esc(p.servico || "Serviço não informado")}</span>${prAtivo(p) ? "" : `<span class="pill p-ajuste">Inativo</span>`}</div>
    <h3 class="os-tit">${esc(p.nome)}</h3>
    ${al.length ? `<p class="pr-al">${al.map(a => `<span class="pill ${a.cls === "crit" ? "s-zero" : "s-baixo"}">${esc(a.txt)}</span>`).join("")}</p>` : ""}
    <dl class="os-info">
      <div><dt>Contato</dt><dd>${esc(p.contato || "—")}</dd></div>
      <div><dt>Telefone / e-mail</dt><dd>${prContatos(p) || "—"}</dd></div>
      <div><dt>CNPJ</dt><dd class="mono">${esc(p.cnpj || "—")}</dd></div>
      <div><dt>Endereço</dt><dd>${esc(p.endereco || "—")}</dd></div>
      <div><dt>Contrato</dt><dd>${p.contratoInicio || p.contratoFim ? `${fData(p.contratoInicio)} a ${fData(p.contratoFim)}` : "—"}${p.valorMensal !== "" && p.valorMensal != null ? ` · ${fBRL(p.valorMensal)}/mês` : ""}</dd></div>
      <div><dt>Visitas</dt><dd>${esc(p.frequencia || "Frequência não informada")} · última ${fData(p.ultimaVisita)} · próxima <b class="${prVisitaAtrasada(p) ? "atr" : ""}">${fData(p.proximaVisita)}</b></dd></div>
    </dl>
    ${p.observacao ? `<p class="os-desc">${esc(p.observacao)}</p>` : ""}
    <div class="os-acoes actions">${ed ? `<button class="btn primary" type="button" id="pr-visita">Registrar visita</button><button class="btn" type="button" id="pr-editar">Editar</button>` : ""}<button class="btn" type="button" id="pr-fechar">Fechar</button></div>
    <div id="pr-sub"></div>
    <div class="os-grid">
      <section><h4>Documentos e certificados</h4>
        ${(p.docs || []).length ? `<ul class="pr-docs">${p.docs.map(d => `<li><button type="button" class="link" data-doc="${esc(d.id)}" data-nome="${esc(p.nome + " - " + d.nome)}">${esc(d.nome)}</button>
          ${d.validade ? `<span class="pill ${{vencido:"s-zero", vence:"s-baixo"}[prVenc(d.validade)] || "s-ok"}">validade ${fData(d.validade)}</span>` : `<span class="muted">sem validade</span>`}
          ${ed ? `<button type="button" class="link danger" data-docx="${esc(d.id)}">tirar</button>` : ""}</li>`).join("")}</ul>` : `<p class="muted">Nenhum documento anexado.</p>`}
        ${ed ? `<form class="pr-up" id="pr-up" novalidate><select class="input" id="pr-dtipo" aria-label="Tipo de documento">${PR_DOCS.map(d => `<option>${d}</option>`).join("")}</select>
          <input class="input" type="date" id="pr-dval" aria-label="Validade (opcional)" title="Validade (opcional)"><input class="input" type="file" id="pr-darq" accept="application/pdf,image/jpeg,image/png" aria-label="Arquivo">
          <button class="btn small" type="submit" id="pr-dok">Anexar</button><span class="hint" id="pr-dmsg">PDF ou foto, até 7 MB. A validade é opcional.</span></form>` : ""}
      </section>
      <section><h4>Preventivas que faz</h4>
        ${pvs.length ? `<ul class="pr-docs">${pvs.map(v => `<li><span class="mono">${esc(v.numero)}</span> ${esc(v.titulo)} <span class="muted">· próxima ${fData(v.proxima)}</span></li>`).join("")}</ul>`
          : `<p class="muted">Nenhuma preventiva ligada.${can("dem_delegar") ? " Escolha este prestador ao criar ou editar uma preventiva." : ""}</p>`}
        <h4>Últimas visitas</h4>
        ${vis.length ? `<ul class="pr-docs">${vis.map(v => `<li>${fData(v.data)} <span class="muted">· ${esc(v.por || "")}</span>${v.obs ? `<br><small>${esc(v.obs)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="muted">Nenhuma visita registrada.</p>`}
      </section>
    </div>`;
  $("#modal").hidden = false;
  $("#pr-fechar").onclick = fecharModal; $("#pr-fechar").focus();
  $$("#modal-box [data-doc]").forEach(b => b.onclick = () => prAbrirDoc(p.id, b.dataset.doc, b.dataset.nome));
  if (!ed) return;
  $("#pr-editar").onclick = () => prForm(p);
  $("#pr-visita").onclick = () => {
    $("#pr-sub").innerHTML = `<form class="form pr-visform" id="pr-vf" novalidate><div class="field"><label for="pr-vdata">Data da visita</label><input class="input" type="date" id="pr-vdata" value="${hoje()}" max="${hoje()}"></div>
      <div class="field"><label for="pr-vobs">O que foi feito (opcional)</label><input class="input" id="pr-vobs" maxlength="300" placeholder="Ex.: revisão mensal, troca de peça"></div>
      <div class="full actions"><button class="btn primary" type="submit" id="pr-vok">Registrar</button><button class="btn" type="button" id="pr-vno">Cancelar</button><span class="hint" id="pr-vmsg"></span></div></form>`;
    $("#pr-vno").onclick = () => { $("#pr-sub").innerHTML = ""; };
    $("#pr-vf").onsubmit = ev => { ev.preventDefault(); enviar($("#pr-vok"), $("#pr-vmsg"), "prestVisita", {id:p.id, data:$("#pr-vdata").value, obs:$("#pr-vobs").value.trim()}, () => prDetalhe(p.id)); };
    $("#pr-vdata").focus();
  };
  $$("#modal-box [data-docx]").forEach(b => b.onclick = () => { if (b.dataset.conf) enviar(b, null, "prestDocRemover", {id:p.id, docId:b.dataset.docx}, () => prDetalhe(p.id)); else { b.dataset.conf = "1"; b.textContent = "confirmar: tirar"; } });
  $("#pr-up").onsubmit = async ev => {
    ev.preventDefault();
    const f = $("#pr-darq").files[0], msg = $("#pr-dmsg");
    if (!f) { msg.className = "hint err"; msg.textContent = "Escolha o arquivo."; return; }
    if (f.size > 7 * 1024 * 1024) { msg.className = "hint err"; msg.textContent = "O arquivo passa de 7 MB."; return; }
    const mime = f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : "");
    if (!["application/pdf","image/jpeg","image/png"].includes(mime)) { msg.className = "hint err"; msg.textContent = "Envie em PDF ou foto (JPG ou PNG)."; return; }
    const b64 = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = erro; r.readAsDataURL(f); });
    enviar($("#pr-dok"), msg, "prestDoc", {id:p.id, nome:$("#pr-dtipo").value, validade:$("#pr-dval").value, mime, b64}, () => prDetalhe(p.id));
  };
}
async function prAbrirDoc(id, docId, nome){
  try {
    const r = await api("prestVerDoc", {id, docId});
    const bin = atob(r.arquivo.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const ext = {"application/pdf":".pdf","image/jpeg":".jpg","image/png":".png"}[r.arquivo.mime] || "";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([u8], {type:r.arquivo.mime}));
    // nome sem acentos: o Chrome troca nomes com acento por "download"
    a.download = String(nome || "documento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w .()-]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 100) + ext;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch(e){ toast(e.message, true); }
}
function prForm(p){
  if (!prPodeEditar()) return;
  const v = p || {nome:"", servico:"", contato:"", telefone:"", email:"", cnpj:"", endereco:"", contratoInicio:"", contratoFim:"", valorMensal:"", frequencia:"", ultimaVisita:"", proximaVisita:"", observacao:"", ativo:"Sim"};
  const servs = [...new Set((S.prest || []).map(x => x.servico).filter(Boolean).concat(["Elevadores","Bombas e hidráulica","Gerador","Piscina","Portões e interfones","CFTV e segurança","Incêndio e extintores","Ar-condicionado","Jardinagem","Dedetização","Limpeza de caixa d'água","Para-raios","Elétrica"]))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `
    <h3>${p ? "Editar prestador" : "Novo prestador de serviço"}</h3>
    <form class="form" id="f-pr" novalidate autocomplete="off">
      <div class="field full"><label for="pr-nome">Empresa ou prestador <span class="req">*</span></label><input class="input" id="pr-nome" value="${esc(v.nome)}" maxlength="120" placeholder="Ex.: Elevadores Rio Ltda"></div>
      <div class="field"><label for="pr-serv-in">Serviço</label><input class="input" id="pr-serv-in" value="${esc(v.servico)}" list="dl-prserv" maxlength="60" placeholder="Ex.: Elevadores"><datalist id="dl-prserv">${servs.map(s => `<option value="${esc(s)}">`).join("")}</datalist></div>
      <div class="field"><label for="pr-cont">Contato (pessoa)</label><input class="input" id="pr-cont" value="${esc(v.contato)}" maxlength="80"></div>
      <div class="field"><label for="pr-tel">Telefone / WhatsApp</label><input class="input" id="pr-tel" value="${esc(v.telefone)}" inputmode="tel" maxlength="30" placeholder="(21) 99999-9999"></div>
      <div class="field"><label for="pr-mail">E-mail</label><input class="input" id="pr-mail" type="email" value="${esc(v.email)}" maxlength="120"></div>
      <div class="field"><label for="pr-cnpj">CNPJ</label><input class="input" id="pr-cnpj" value="${esc(v.cnpj)}" inputmode="numeric" maxlength="20" placeholder="00.000.000/0000-00"></div>
      <div class="field"><label for="pr-end">Endereço</label><input class="input" id="pr-end" value="${esc(v.endereco)}" maxlength="200"></div>
      <h4 class="full pr-h">Contrato</h4>
      <div class="field"><label for="pr-ci">Início</label><input class="input" type="date" id="pr-ci" value="${esc(v.contratoInicio)}"></div>
      <div class="field"><label for="pr-cf">Fim (vencimento)</label><input class="input" type="date" id="pr-cf" value="${esc(v.contratoFim)}"><span class="hint">Avisa 30 dias antes de vencer.</span></div>
      <div class="field"><label for="pr-val">Valor mensal (R$)</label><input class="input num" id="pr-val" value="${v.valorMensal === "" || v.valorMensal == null ? "" : esc(String(v.valorMensal).replace(".", ","))}" inputmode="decimal" placeholder="0,00"></div>
      <h4 class="full pr-h">Visitas</h4>
      <div class="field"><label for="pr-freq">Frequência</label><select class="input" id="pr-freq"><option value="">Não informada</option>${PR_FREQ.map(f => `<option ${f === v.frequencia ? "selected" : ""}>${f}</option>`).join("")}</select></div>
      <div class="field"><label for="pr-ult">Última visita</label><input class="input" type="date" id="pr-ult" value="${esc(v.ultimaVisita)}" max="${hoje()}"></div>
      <div class="field"><label for="pr-prox">Próxima visita</label><input class="input" type="date" id="pr-prox" value="${esc(v.proximaVisita)}"><span class="hint">Em branco: calculada pela última visita e a frequência.</span></div>
      <div class="field full"><label for="pr-obs">Observação</label><textarea class="input" id="pr-obs" maxlength="1000" placeholder="Escopo do contrato, horários, quem acompanha a visita">${esc(v.observacao)}</textarea></div>
      ${p ? `<label class="perm full"><input type="checkbox" id="pr-ativo" ${prAtivo(v) ? "checked" : ""}> Ativo (desmarque se o condomínio não trabalha mais com este prestador)</label>` : ""}
      <div class="full actions"><button class="btn primary" type="submit" id="pr-ok">${p ? "Salvar" : "Cadastrar"}</button><button class="btn" type="button" id="pr-no">Cancelar</button><span class="hint" id="pr-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#pr-nome").focus();
  $("#pr-no").onclick = () => p ? prDetalhe(p.id) : fecharModal();
  $("#f-pr").addEventListener("submit", ev => {
    ev.preventDefault();
    const msg = $("#pr-msg"); msg.className = "hint err";
    const nv = {id: p ? p.id : "", nome:$("#pr-nome").value.trim(), servico:$("#pr-serv-in").value.trim(), contato:$("#pr-cont").value.trim(), telefone:$("#pr-tel").value.trim(),
      email:$("#pr-mail").value.trim(), cnpj:$("#pr-cnpj").value.trim(), endereco:$("#pr-end").value.trim(), contratoInicio:$("#pr-ci").value, contratoFim:$("#pr-cf").value,
      valorMensal:$("#pr-val").value.trim(), frequencia:$("#pr-freq").value, ultimaVisita:$("#pr-ult").value, proximaVisita:$("#pr-prox").value, observacao:$("#pr-obs").value.trim(),
      ativo: p ? $("#pr-ativo").checked : true};
    if (!nv.nome) { msg.textContent = "Informe o nome da empresa ou do prestador."; return; }
    if (nv.contratoInicio && nv.contratoFim && nv.contratoFim < nv.contratoInicio) { msg.textContent = "O fim do contrato não pode ser antes do início."; return; }
    enviar($("#pr-ok"), msg, "prestSalvar", {prest:nv}, () => {
      const salvo = (S.prest || []).find(x => p ? x.id === p.id : x.nome === nv.nome);
      if (salvo) prDetalhe(salvo.id); else fecharModal();
    });
  });
}
// ---- planilha de prestadores: baixar no modelo e importar de volta ----
const PR_COLS = [["nome","Empresa",34],["servico","Serviço",20],["contato","Contato",20],["telefone","Telefone",17],["email","E-mail",28],["cnpj","CNPJ",20],
  ["endereco","Endereço",34],["contratoInicio","Contrato início",14],["contratoFim","Contrato fim",14],["valorMensal","Valor mensal",14],
  ["frequencia","Frequência das visitas",20],["ultimaVisita","Última visita",14],["proximaVisita","Próxima visita",14],["observacao","Observação",40],["ativo","Ativo",8],["id","ID (não altere)",16]];
const PR_DATAS = ["contratoInicio","contratoFim","ultimaVisita","proximaVisita"];
function prBaixarPlanilha(){
  try {
    const X = xlsxMini(), cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", wrap:false};
    PR_COLS.forEach(([, rot, w], j) => { X.cel(1, j + 1, rot, cab); X.col(j + 1, w); });
    (S.prest || []).forEach((p, i) => PR_COLS.forEach(([k], j) => {
      let v = p[k];
      if (PR_DATAS.includes(k)) X.cel(i + 2, j + 1, v ? new Date(v + "T12:00") : "", {num:"dd/mm/yyyy", h:"center"});
      else if (k === "valorMensal") X.cel(i + 2, j + 1, v === "" || v == null ? "" : Number(v), {num:'"R$" #,##0.00', h:"right"});
      else if (k === "ativo") X.cel(i + 2, j + 1, prAtivo(p) ? "Sim" : "Não", {h:"center"});
      else X.cel(i + 2, j + 1, v == null ? "" : String(v), k === "id" ? {cor:"FF8A97A6"} : {});
    }));
    const buf = X.gerar("Prestadores");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    a.download = "Prestadores de servico - Pier " + hoje() + ".xlsx";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch(e){ toast(e.message || "Não foi possível gerar a planilha.", true); }
}
// data da planilha: número do Excel, dd/mm/aaaa ou aaaa-mm-dd
function prData(v){
  if (v === undefined || v === null || v === "") return "";
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.toISOString().slice(0, 10); }
  const s = String(v).trim(); let m;
  if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s))) { const a = m[3].length === 2 ? "20" + m[3] : m[3]; return `${a}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "?" + s;
}
async function prImportar(file){
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { toast("Escolha uma planilha .xlsx (no Excel: Salvar como → Pasta de Trabalho do Excel).", true); return; }
  let abas;
  try {
    const buf = await file.arrayBuffer();
    try { abas = await xlsxLer(buf); }
    catch(e){ if (!e || !e.semLeitor) throw e; await carregarXLSX(); const wb = XLSX.read(buf, {type:"array"}); abas = wb.SheetNames.map(n => ({nome:n, folha:xlsxFolhaSheetJS(wb.Sheets[n])})); }
  } catch(e){ toast(e.message || "Não foi possível ler a planilha.", true); return; }
  // acha a linha de títulos (com "Empresa") em qualquer aba e liga cada coluna ao campo pelo nome
  const porRot = new Map(PR_COLS.map(([k, rot]) => [norm(rot).replace(/\s*\(.*\)$/, ""), k]));
  [["empresa","nome"],["nome","nome"],["prestador","nome"],["servico","servico"],["tipo de servico","servico"],["telefone / whatsapp","telefone"],["whatsapp","telefone"],["email","email"],["e-mail","email"],["frequencia","frequencia"],["valor","valorMensal"],["observacoes","observacao"],["id","id"]].forEach(([a, b]) => porRot.set(a, b));
  let F = null, rCab = -1, mapa = {};
  for (const a of abas) {
    const f = a.folha; if (!f) continue;
    for (let r = f.r0; r <= Math.min(f.r1, f.r0 + 15) && rCab < 0; r++) {
      const m = {};
      for (let c = f.c0; c <= f.c1; c++) { const k = porRot.get(norm(String(f.val(r, c) ?? "")).replace(/\s*\(.*\)$/, "").trim()); if (k && !(k in m)) m[k] = c; }
      if ("nome" in m) { F = f; rCab = r; mapa = m; }
    }
    if (F) break;
  }
  if (!F) { toast('Não encontrei a coluna "Empresa" na planilha. Use "Baixar planilha" para ter o modelo.', true); return; }
  const lista = [];
  for (let r = rCab + 1; r <= F.r1; r++) {
    const l = {_linha: r + 1}; let tem = false;
    for (const [k, c] of Object.entries(mapa)) {
      let v = F.val(r, c); if (v === undefined || v === null || String(v).trim() === "") continue;
      if (PR_DATAS.includes(k)) v = prData(v);
      else if (k === "valorMensal") v = typeof v === "number" ? v : String(v).replace(/[R$\s]/g, "");
      else v = String(v).trim();
      l[k] = v; tem = true;
    }
    if (tem) lista.push(l);
  }
  if (!lista.length) { toast("A planilha não tem nenhuma linha preenchida abaixo dos títulos.", true); return; }
  // prévia: o que vai ser criado, atualizado ou tem problema
  const so = s => String(s || "").replace(/\D/g, ""), todos = S.prest || [];
  const linhasPrev = lista.map(l => {
    const atual = (l.id && todos.find(x => x.id === l.id)) || (so(l.cnpj) && todos.find(x => so(x.cnpj) === so(l.cnpj))) || (l.nome && todos.find(x => norm(x.nome) === norm(l.nome)));
    const prob = [];
    if (!l.nome && !atual) prob.push("sem o nome da empresa");
    PR_DATAS.forEach(k => { if (String(l[k] || "").startsWith("?")) prob.push(`data inválida em ${PR_COLS.find(c => c[0] === k)[1]}`); });
    if (l.frequencia && !PR_FREQ.some(f => norm(f) === norm(l.frequencia))) prob.push(`frequência "${l.frequencia}" não existe`);
    else if (l.frequencia) l.frequencia = PR_FREQ.find(f => norm(f) === norm(l.frequencia));
    return {l, atual, prob};
  });
  const validas = linhasPrev.filter(x => !x.prob.length);
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar planilha de prestadores</h3>
    <p class="muted">${linhasPrev.length} linha${linhasPrev.length === 1 ? "" : "s"} encontrada${linhasPrev.length === 1 ? "" : "s"}: ${validas.filter(x => !x.atual).length} nova${validas.filter(x => !x.atual).length === 1 ? "" : "s"}, ${validas.filter(x => x.atual).length} para atualizar${linhasPrev.length - validas.length ? `, <b class="atr">${linhasPrev.length - validas.length} com problema (não entram)</b>` : ""}. Células em branco mantêm o que já está cadastrado.</p>
    <div class="tablebox" style="max-height:50vh;overflow:auto"><table><thead><tr><th>Linha</th><th>Empresa</th><th>O que acontece</th></tr></thead><tbody>
      ${linhasPrev.map(x => `<tr><td class="num">${x.l._linha}</td><td>${esc(x.l.nome || (x.atual && x.atual.nome) || "—")}<span class="sub">${esc([x.l.servico, x.l.cnpj].filter(Boolean).join(" · "))}</span></td>
        <td>${x.prob.length ? `<span class="pill s-zero">${esc(x.prob.join("; "))}</span>` : x.atual ? `<span class="pill st-andamento">Atualizar</span>` : `<span class="pill s-ok">Novo</span>`}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="pr-imp-ok" ${validas.length ? "" : "disabled"}>Importar ${validas.length}</button><button class="btn" type="button" id="pr-imp-no">Cancelar</button><span class="hint" id="pr-imp-msg"></span></div>`;
  $("#modal").hidden = false;
  $("#pr-imp-no").onclick = fecharModal;
  $("#pr-imp-ok").onclick = () => enviar($("#pr-imp-ok"), $("#pr-imp-msg"), "prestImportar", {linhas: validas.map(x => x.l)}, r => {
    if (/com erro/.test(r.msg || "")) { $("#pr-imp-msg").className = "hint err"; $("#pr-imp-msg").textContent = r.msg; $("#pr-imp-ok").hidden = true; $("#pr-imp-no").textContent = "Fechar"; }
    else fecharModal();
  });
}
if ($("#t-prestadores")) {
  $("#pr-novo").addEventListener("click", () => prForm(null));
  $("#pr-baixar").addEventListener("click", prBaixarPlanilha);
  $("#pr-importar").addEventListener("click", () => $("#pr-imp-arq").click());
  $("#pr-imp-arq").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; prImportar(f); });
  $("#pr-busca").addEventListener("input", e => { PR.q = e.target.value; renderPrest(); });
  $("#pr-serv").addEventListener("change", e => { PR.serv = e.target.value; renderPrest(); });
  $("#pr-resumo").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; PR.f = PR.f === b.dataset.f && b.dataset.f !== "ativos" ? "ativos" : b.dataset.f; renderPrest(); });
  $("#pr-cards").addEventListener("click", e => { const b = e.target.closest("[data-pr]"); if (b) prDetalhe(b.dataset.pr); });
}

// ---------- ronda: modelo do "Checklist Consolidado de Vistorias Preventivas" (Revisão 01 - 09/09/2026) ----------
const RD_COD = [
  ["OK", "Conforme", "Item vistoriado e sem anormalidade visual."],
  ["P", "Pendente", "Não conforme sem risco imediato: acompanhar até resolver."],
  ["C", "Crítico", "Comunicar a Gerência de imediato; isolar/proteger o local por equipe competente."],
  ["NA", "Não se aplica", "Item inexistente ou não pertinente ao local, após confirmação."],
  ["NV", "Não verificado", "Registrar o motivo e programar retorno."]
];
// programação semanal otimizada (02): manhã Supervisor + Auxiliar nos blocos; tarde Auxiliar nas áreas comuns
const RD_PROG = {
  1: {dia:"Segunda", blocos:["Bloco 1","Bloco 2"], tempo:"30 min cada", tarde:"Piscina, jardins, chafariz, cascatas e áreas esportivas", foco:"Cobertura dos pavimentos + shafts/halls dos blocos", areas:[0,1,2]},
  2: {dia:"Terça", blocos:["Bloco 3"], tempo:"60 min", tarde:"Game House, Casa do Pirata, sala de jogos e convivência", foco:"Ambientes infantis e recreativos", areas:[3,5]},
  3: {dia:"Quarta", blocos:["Bloco 4"], tempo:"60 min", tarde:"Academia, hidromassagem, spa, sauna e áreas de apoio", foco:"Áreas molhadas e equipamentos aparentes", areas:[4,0]},
  4: {dia:"Quinta", blocos:["Bloco 5","Bloco 6"], tempo:"30 min cada", tarde:"Garagem, Portarias Norte/Sul e áreas técnicas do subsolo", foco:"Casa de bombas, elétrica, CFTV, acesso e drenagem", areas:[6,7]},
  5: {dia:"Sexta", blocos:["Bloco 7"], tempo:"60 min", tarde:"Salão Gourmet, guarderia náutica, perímetro, gradis, jardins frontais e pendências", foco:"Fechamento semanal e reinspeções", areas:[5,8,9]}
};
// rodízio mensal de aprofundamento (J)
const RD_RODIZIO = ["Prismas, shafts, drenagem, infiltrações, terraços e pontos de cobertura com histórico.",
  "Portarias, elétrica/fiação aparente, CFTV, interfonia, acessos, portões, cancelas e organização.",
  "Garagem, casa de bombas, salas técnicas, reservatórios, bombas, drenagem e áreas operacionais.",
  "Áreas de lazer, áreas molhadas, jardins, gradis, chafariz, cascatas e pendências recorrentes.",
  "Reinspeções, locais NV e prioridades definidas pela Gerência."];
// ficha semanal por bloco (L)
const RD_BLOCOS = ["Bloco 1","Bloco 2","Bloco 3","Bloco 4","Bloco 5","Bloco 6","Bloco 7"];
const RD_NIVEIS = ["Subsolo/garagem do bloco","Térreo/hall/acessos","1º pavimento","2º pavimento","3º pavimento","Escadarias/rotas de fuga","Prismas de ventilação","Terraço/cobertura","Áreas técnicas acessíveis"];
const RD_CATS = [["LIM","Limpeza"],["CON","Conservação/pintura"],["ELE","Elétrica/iluminação"],["HID","Hidráulica/drenagem"],["RES","Resíduos/lixeiras"],["SEG","Segurança/circulação"],["GAS","Shaft gás"],["SEL","Shaft elétrica"]];
// ficha diária das áreas comuns (M)
const RD_AREAS = ["Piscina/deck/hidromassagem/sauna","Jardins/chafariz/cascatas/áreas externas","Quadra/campinho/áreas esportivas","Game House/Casa do Pirata/sala de jogos",
  "Academia/áreas molhadas","Salão Gourmet/convivência","Portarias Norte/Sul","Garagem/mensageria/bicicletários","Guarderia náutica/perímetro/gradis","Pendências/reinspeções"];
// checklist-mestre consolidado (A a I)
const RD_CHECK = {
  A: {t:"Blocos, halls, pavimentos, escadarias e garagem vinculada", d:"Aplicar aos 7 blocos, registrando separadamente térreo, 1º, 2º e 3º pavimentos, escadarias, áreas de apoio e garagem do bloco.", locais:RD_BLOCOS, itens:[
    "Identificação do bloco, pavimento e ambiente registrada antes do início.",
    "Halls, corredores e circulações livres de objetos indevidos e obstruções.",
    "Pisos limpos, sem resíduos, manchas relevantes, peças soltas ou acúmulo de água.",
    "Paredes, pintura e revestimentos sem descascamentos, manchas, trincas aparentes ou danos.",
    "Tetos e forros sem infiltrações, placas soltas, fissuras aparentes ou sinais de umidade.",
    "Rodapés, batentes, portas, esquadrias, vidros e fechaduras conservados.",
    "Corrimãos, guarda-corpos, escadarias e rotas de fuga conservados e desobstruídos.",
    "Portas corta-fogo e portas de acesso íntegras, fechadas/desobstruídas e sem anormalidade aparente.",
    "Sinalização e iluminação de emergência presentes, acessíveis e visualmente íntegras.",
    "Extintores/equipamentos de incêndio presentes, acessíveis, sinalizados e sem danos aparentes.",
    "Luminárias funcionando, sem peças soltas, lâmpadas queimadas ou danos aparentes.",
    "Sensores de presença, interruptores, tomadas e respectivas tampas íntegros.",
    "Fios, cabos, eletrodutos, canaletas e caixas aparentes organizados, fixados e protegidos.",
    "Ausência de emendas improvisadas, fios expostos, cheiro de queimado, ruído elétrico ou aquecimento aparente.",
    "Quadros elétricos externos fechados, identificados e sem danos aparentes.",
    "Hidrômetros, registros, conexões e tubulações aparentes sem vazamentos ou danos visíveis.",
    "Abrigos de hidrômetros limpos, identificados, fechados e conservados.",
    "Lixeiras limpas, íntegras, sem transbordamento e com resíduos corretamente acondicionados.",
    "Ralos, grelhas e pontos de drenagem limpos, visíveis e sem obstrução.",
    "Elevadores sem ruídos, danos, mau funcionamento aparente ou reclamações pendentes relacionadas.",
    "Garagem vinculada ao bloco: piso, pintura, demarcações, sinalização, iluminação, ventilação e drenagem em ordem.",
    "Térreo do bloco: hall, acessos, lixeiras, apoios, espelhos/chafariz vinculados ao bloco quando existentes em ordem.",
    "Ausência de odores anormais, mofo, sinais de infestação ou materiais indevidos."]},
  B: {t:"Shafts de gás, elétrica e iluminação", d:"Verificação específica dos shafts por bloco/pavimento.", locais:RD_BLOCOS, itens:[
    "Shafts de gás e elétrica identificados por bloco/pavimento e acessíveis por ponto seguro.",
    "Portas, tampas, fechaduras e vedações dos shafts íntegras e fechadas.",
    "Identificação, sinalização e restrição de acesso visíveis e conservadas.",
    "Shaft de gás: tubulações, registros e conexões aparentes conservados, sem danos visíveis.",
    "Shaft de gás: ausência de odor de gás, indício de vazamento, corrosão relevante ou interferência indevida.",
    "Shaft elétrico/iluminação: cabos, caixas, componentes e eletrodutos aparentes fixados e organizados.",
    "Shaft elétrico/iluminação: ausência de fios expostos, emendas improvisadas, sobrecarga aparente ou aquecimento.",
    "Ventilação dos shafts livre, sem obstrução por objetos, resíduos ou materiais de terceiros.",
    "Ausência de infiltração, umidade, gotejamento ou mofo no interior/acesso dos shafts.",
    "Limpeza e organização adequadas; ausência de entulho, objetos guardados ou descarte irregular.",
    "Qualquer odor de gás, fio exposto ou aquecimento classificado como C e comunicado imediatamente."]},
  C: {t:"Prismas de ventilação", d:"Aplicar a todos os prismas cadastrados, apenas por acesso seguro e de forma visual.", locais:RD_BLOCOS, itens:[
    "Prismas cadastrados, identificados e vistoriados pelo ponto de acesso seguro.",
    "Limpeza geral; ausência de resíduos, entulho, objetos descartados e materiais soltos.",
    "Ausência de acúmulo de água, empoçamentos, gotejamentos e drenagem comprometida.",
    "Ralos, grelhas, calhas e pontos de drenagem visíveis e sem obstrução.",
    "Paredes, pintura e revestimentos sem danos aparentes, mofo ou umidade anormal.",
    "Tubulações e instalações aparentes sem vazamentos, corrosão relevante ou danos visíveis.",
    "Grades, telas, proteções, fechamentos e guarda-corpos íntegros.",
    "Ausência de objetos que prejudiquem ventilação, acesso ou ofereçam risco de queda.",
    "Ausência de vegetação invasiva, ninhos, pragas ou sinais de infestação.",
    "Pontos não acessados registrados como NV com motivo e retorno programado."]},
  D: {t:"Terraços, coberturas e áreas técnicas superiores", d:"Coberturas, terraços, casas de máquinas, reservatórios superiores e instalações técnicas existentes.", locais:RD_BLOCOS, itens:[
    "Pisos, revestimentos e impermeabilização aparente sem danos relevantes.",
    "Ausência de empoçamentos, infiltrações, umidade anormal ou sinais de falha de drenagem.",
    "Ralos, grelhas, calhas, drenos e condutores pluviais desobstruídos visualmente.",
    "Platibandas, muretas, guarda-corpos, fechamentos e gradis conservados.",
    "Portas, alçapões e acessos fechados, íntegros e com controle de acesso.",
    "Ausência de entulho, materiais soltos ou objetos sujeitos à ação do vento.",
    "Tubulações, suportes, antenas, equipamentos e instalações aparentes conservados.",
    "Casas de máquinas/compartimentos técnicos limpos, organizados e com acesso livre.",
    "Reservatórios superiores: tampas, fechamentos, acessos e tubulações aparentes íntegros.",
    "Barriletes, registros, bombas, válvulas, ventilação/exaustão, climatização e SPDA sem anormalidades aparentes.",
    "Quadros elétricos externos fechados, identificados e sem danos; cabos/canaletas protegidos.",
    "Iluminação, portas, pintura e conservação geral em ordem."]},
  E: {t:"Áreas técnicas do subsolo, garagem e casa de bombas", d:"Verificação externa e visual; não abrir painéis, reservatórios ou equipamentos nem realizar testes operacionais.", locais:["Subsolo e garagem","Casa de bombas","Salas técnicas"], itens:[
    "Casa de bombas e sistemas de recalque organizados, limpos e com acesso livre para manutenção.",
    "Bombas, motores, registros, válvulas, tubulações e conexões sem ruído, vazamento ou anormalidade visual perceptível.",
    "Cisternas e reservatórios inferiores com tampas, acessos e fechamentos íntegros; sem vazamentos aparentes.",
    "Barriletes, tubulações hidráulicas, registros e suportes conservados.",
    "Quadros e salas elétricas fechados, identificados e com condição externa regular.",
    "Gerador/área de apoio, quando existente, limpo, organizado e sem sinais aparentes de falha.",
    "Sistemas de ventilação/exaustão da garagem sem anormalidades perceptíveis.",
    "Sistemas de incêndio, bombas, tubulações, hidrantes e sinalizações com acesso livre e sem danos aparentes.",
    "Poços de drenagem, bombas de águas pluviais, ralos, canaletas e grelhas limpos/desobstruídos.",
    "Salas de telecomunicações, CFTV, controle de acesso, depósitos e almoxarifados organizados.",
    "Portas, fechaduras, iluminação, pintura, identificação e sinalização conservadas.",
    "Fiação aparente, eletrodutos, canaletas e suportes íntegros, organizados e sem improvisos.",
    "Ausência de vazamentos, infiltrações, odores anormais, materiais indevidos ou obstrução de acesso.",
    "Cadastro individual das salas técnicas e equipamentos atualizado."]},
  F: {t:"Portarias Norte e Sul", d:"Aplicar separadamente às duas portarias, incluindo ambiente interno, entorno, acessos e sistemas aparentes.", locais:["Portaria Norte","Portaria Sul"], itens:[
    "Pisos, paredes, rodapés, tetos, pintura, revestimentos, vidros e esquadrias limpos e conservados.",
    "Portas, fechaduras, bancadas, gavetas e mobiliário conservados e funcionais.",
    "Posto de trabalho organizado, sem caixas, fios soltos ou materiais indevidos.",
    "Banheiro/área de apoio limpos, com insumos e sem vazamentos aparentes.",
    "Iluminação, climatização e ventilação sem anormalidades perceptíveis.",
    "Computadores, monitores, telefones, interfonia, CFTV, controle de acesso e nobreaks sem anormalidades aparentes.",
    "Cabos, tomadas, canaletas, eletrodutos e caixas de passagem protegidos, fixados e organizados.",
    "Ausência de extensões improvisadas, sobrecarga, aquecimento, água próxima a equipamentos ou cheiro de queimado.",
    "Quadros elétricos fechados, identificados e sem danos externos aparentes.",
    "Portões, cancelas, portas, fechaduras, sensores, semáforos e sinalizações sem dano ou comportamento anormal visível.",
    "Calçadas, rampas, pisos, ralos e drenagem do entorno limpos, conservados e desobstruídos.",
    "Gradis, muros, fechamentos, jardins frontais e iluminação externa em ordem.",
    "Visibilidade, fluxo e segurança do acesso sem pontos de risco ou obstrução."]},
  G: {t:"Áreas externas, jardins, chafariz, cascatas e esportes", d:"Jardins frontais, gradis, perímetro, chafariz, cascatas, piscina, áreas esportivas, guarderia náutica e mobiliários externos.", locais:["Áreas externas"], itens:[
    "Perímetro, gradis, muros, cercas, portões e fechamentos conservados e sem pontos vulneráveis aparentes.",
    "Jardins, canteiros, palmeiras, horta/pomar e vegetação organizados, sem resíduos ou riscos de queda/obstrução.",
    "Calçadas, pisos externos, rampas e circulações limpos, íntegros e sem irregularidades perigosas.",
    "Ralos, grelhas, canaletas, drenagem externa e pontos de escoamento sem obstrução visível.",
    "Iluminação externa, postes, refletores, sensores e tomadas aparentes conservados.",
    "Chafariz, cascatas e espelhos d’água limpos, com nível/funcionamento aparente normal e sem vazamentos visíveis.",
    "Piscina, deck, hidromassagem, sauna e áreas molhadas com conservação, limpeza, sinalização e segurança aparentes em ordem.",
    "Quadra de areia, campinho, playground/Casa do Pirata externa e mobiliário com conservação e limpeza adequadas.",
    "Guarderia náutica, flutuantes/deck, acessos e áreas de apoio organizados e sem materiais indevidos.",
    "Bancos, mesas, ombrelones, lixeiras, placas e demais mobiliários íntegros, limpos e estáveis.",
    "Ausência de fezes de animais, descarte irregular, pragas, odores anormais ou acúmulo de água.",
    "Pendências recorrentes registradas para fechamento semanal."]},
  H: {t:"Áreas internas de lazer e convivência", d:"Game House, Casa do Pirata, sala de jogos, academia, áreas molhadas, salão gourmet e ambientes de apoio.", locais:["Áreas de lazer"], itens:[
    "Game House, Casa do Pirata, sala de jogos e áreas de convivência limpas e organizadas.",
    "Mobiliário, brinquedos, mesas, cadeiras, sinuca, jogos e acessórios íntegros e seguros.",
    "Pisos, paredes, pintura, rodapés, forros, portas e esquadrias conservados.",
    "Iluminação, tomadas, interruptores, climatização, televisores, consoles e equipamentos sem anormalidade aparente.",
    "Casa do Pirata: ausência de alimentos, calçados e objetos indevidos; regras de uso visíveis quando aplicável.",
    "Academia: limpeza, organização, equipamentos, estofados, cabos, pesos e acessórios sem dano aparente.",
    "Academia: ventilação/climatização, espelhos, bebedouro, sinalização e insumos em ordem.",
    "Hidromassagem, sauna, spa e áreas de apoio com limpeza, drenagem, revestimentos e portas em ordem.",
    "Salão Gourmet: mesas, cadeiras, bancadas, eletros, torneiras, ralos, banheiros e lixeiras em ordem.",
    "Ausência de vazamentos, odores, mofo, infestação, fios expostos ou equipamentos com aquecimento anormal.",
    "Regras de uso, horários, sinalizações e eventuais interdições visíveis e preservadas."]},
  I: {t:"Garagem, mensageria e áreas operacionais", d:"Garagem geral, acessos, mensageria, armários inteligentes, bicicletários, depósitos e circulações.", locais:["Garagem e mensageria"], itens:[
    "Pisos, pintura, demarcações de vagas, faixas, setas e sinalização conservados.",
    "Circulações de veículos e pedestres livres, sem materiais indevidos, obstruções ou descarte irregular.",
    "Iluminação, ventilação, sensores, espelhos, sinalização e comunicação visual em ordem.",
    "Ralos, grelhas, canaletas e drenagem sem obstrução, odor ou empoçamento relevante.",
    "Portões, cancelas, semáforos, leitores, TAGs e equipamentos de controle sem anormalidade aparente.",
    "Câmeras, CFTV, interfonia e infraestrutura aparente conservados e protegidos.",
    "Mensageria/armários inteligentes: limpeza, organização, funcionamento visual e ausência de encomendas esquecidas.",
    "Bicicletários e áreas de apoio organizados, sem itens abandonados ou fora do local permitido.",
    "Lixeiras, áreas de resíduos e pontos de coleta limpos, identificados e sem transbordamento.",
    "Sinais de infiltração, vazamento, umidade, fissuras, oxidação ou danos estruturais aparentes registrados com foto.",
    "Rotas de fuga, escadas, portas e equipamentos de incêndio acessíveis e desobstruídos."]}
};
// itens de cada ficha (chave fixa por posição: permite comparar reincidência entre semanas)
function rdModeloItens(tipo, secao){
  if (tipo === "bloco") return RD_NIVEIS.flatMap((n, i) => RD_CATS.map(([c, rot]) => ({k:`n${i}${c}`, g:n, r:rot, c:""})));
  if (tipo === "areas") return RD_AREAS.map((a, i) => ({k:`a${i}`, g:"", r:a, c:"", p:""}));
  const s = RD_CHECK[secao]; return s ? s.itens.map((t, i) => ({k:`${secao}${i + 1}`, g:`${secao} · ${s.t}`, r:t, c:""})) : [];
}

// ---------- ronda: telas (Hoje, Rondas, Pendências, Fechamento semanal) e a ficha ----------
// Só no setor Administração. Faz quem tem "Fazer ronda"; acompanha quem tem "Ver rondas".
const RD = { lista:null, vista:"hoje", edit:null, sujo:false, semana:"", pf:"abertas", carregando:false, fotos:new Map(), erro:"" };
const rdPodeFazer = () => can("ronda_fazer");
const rdTipoRot = {bloco:"Ficha do bloco", areas:"Áreas comuns", checklist:"Checklist"};
const rdSegunda = d => { const x = new Date((d || hoje()) + "T12:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
const rdSomar = (d, n) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return iso(x); };
const rdTitulo = r => r.tipo === "bloco" ? `Ficha do ${r.alvo}` : r.tipo === "areas" ? "Ficha diária das áreas comuns" : `Checklist ${(r.extras || {}).secao || ""} · ${(RD_CHECK[(r.extras || {}).secao] || {}).t || ""} — ${r.alvo}`;
const rdCodPill = c => c ? `<span class="rd-cod c-${esc(c)}">${esc(c)}</span>` : `<span class="rd-cod vazio">—</span>`;
const rdFlag = c => c === "P" || c === "C" || c === "NV";
const rdPend = () => (RD.lista || []).flatMap(r => r.itens.filter(i => i.c === "P" || i.c === "C").map(i => ({r, i})));
function rdBadge(){
  const b = $("#b-ronda"); if (!b) return;
  const ab = rdPend().filter(x => !x.i.res);
  b.textContent = ab.length; b.hidden = !ab.length;
  b.classList.toggle("alert", ab.some(x => x.i.c === "C"));
}
async function carregarRondas(silencioso){
  if (!TEM_ADM || !podeAba("rondas") || RD.carregando || !S.token) return;
  RD.carregando = true;
  try { const r = await api("rondas"); RD.lista = r.rondas || []; RD.erro = ""; }
  catch(e){ RD.erro = e.message; if (!silencioso) toast(e.message, true); }
  finally { RD.carregando = false; rdBadge(); renderRondas(); }
}
function rdTrocarLista(r){
  if (!RD.lista) RD.lista = [];
  const i = RD.lista.findIndex(x => x.id === r.id);
  if (i >= 0) RD.lista[i] = r; else RD.lista.unshift(r);
  rdBadge();
}
function renderRondas(){
  const sec = $("#t-rondas"); if (!sec || sec.hidden) return;
  const ed = !!RD.edit;
  $("#rd-lista-box").hidden = ed; $("#rd-editor").hidden = !ed;
  if (ed) { rdEditor(); return; }
  $$("#rd-vistas [data-v]").forEach(b => b.setAttribute("aria-selected", b.dataset.v === RD.vista ? "true" : "false"));
  const nAb = rdPend().filter(x => !x.i.res).length;
  $("#rd-n-pend").textContent = nAb; $("#rd-n-pend").hidden = !nAb;
  const box = $("#rd-corpo");
  if (RD.erro && !RD.lista) { box.innerHTML = `<div class="notice crit">${esc(RD.erro)}${/desconhecida/i.test(RD.erro) ? " A ronda precisa do Apps Script novo (colar o código e implantar uma nova versão)." : ""}</div>`; return; }
  if (!RD.lista) { box.innerHTML = `<div class="empty"><span class="spin" aria-hidden="true"></span> Carregando as rondas…</div>`; return; }
  ({hoje:rdHoje, rondas:rdHistorico, pend:rdPendencias, fech:rdFechamento})[RD.vista](box);
}
// ---- Hoje: roteiro do dia, rodízio do mês, fichas em andamento e outras fichas ----
function rdHoje(box){
  const h = new Date(), dow = h.getDay(), P = RD_PROG[dow], seg = rdSegunda(), sem = Math.min(5, Math.ceil(h.getDate() / 7));
  const daSemana = RD.lista.filter(r => r.data >= seg && r.data <= rdSomar(seg, 6));
  const deHoje = (tipo, alvo) => RD.lista.find(r => r.data === hoje() && r.tipo === tipo && r.alvo === alvo);
  const botao = (tipo, alvo, rot, extra) => {
    const r = deHoje(tipo, alvo);
    if (r) return `<button type="button" class="btn small ${r.status === "Concluída" ? "" : "primary"}" data-rd-abrir="${esc(r.id)}">${r.status === "Concluída" ? "✓ " + esc(r.numero) + " concluída" : "Continuar " + esc(r.numero)}</button>`;
    return rdPodeFazer() ? `<button type="button" class="btn small primary" data-rd-novo="${tipo}" data-alvo="${esc(alvo)}"${extra || ""}>${esc(rot)}</button>` : `<span class="muted">não feita</span>`;
  };
  const andamento = RD.lista.filter(r => r.status === "Em andamento");
  const blocosOk = new Set(daSemana.filter(r => r.tipo === "bloco" && r.status === "Concluída").map(r => r.alvo));
  const dataLonga = h.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"});
  box.innerHTML = `
    <div class="rd-grid">
      <section class="panel rd-hoje"><h3>Hoje · ${esc(dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1))}</h3>
        ${P ? `<div class="rd-turno"><b>Manhã</b> <span class="muted">Supervisor + Auxiliar · ${esc(P.tempo)}</span>
            <ul>${P.blocos.map(b => `<li><span>${esc(b)}</span>${botao("bloco", b, "Iniciar ficha")}</li>`).join("")}</ul></div>
          <div class="rd-turno"><b>Tarde</b> <span class="muted">Auxiliar · 1h</span><p>${esc(P.tarde)}</p>
            <ul><li><span>Ficha diária das áreas comuns</span>${botao("areas", "Áreas comuns", "Iniciar ficha", ` data-periodo="Tarde"`)}</li></ul></div>
          <p class="rd-foco"><b>Foco mínimo:</b> ${esc(P.foco)}</p>`
        : `<p class="muted">Sem roteiro programado para hoje (a programação vai de segunda a sexta). Se precisar, use as fichas ao lado.</p>`}
        <p class="rd-regra">Risco à segurança, vazamento, eletricidade exposta, rota de fuga obstruída ou ocorrência relevante prevalecem sobre o roteiro: registre como C e comunique a Gerência.</p>
      </section>
      <section class="panel"><h3>Rodízio do mês · ${sem}ª semana</h3><p>${esc(RD_RODIZIO[sem - 1])}</p>
        <h3 style="margin-top:14px">Blocos desta semana</h3>
        <div class="rd-chips">${RD_BLOCOS.map(b => `<span class="rd-chip ${blocosOk.has(b) ? "ok" : ""}">${blocosOk.has(b) ? "✓ " : ""}${esc(b.replace("Bloco ", "B"))}</span>`).join("")}</div>
        <p class="hint">Ficha do bloco concluída nesta semana (segunda a domingo).</p>
      </section>
      ${andamento.length ? `<section class="panel"><h3>Em andamento</h3><ul class="rd-lst">${andamento.map(r => `<li><button type="button" class="link" data-rd-abrir="${esc(r.id)}">${esc(r.numero)} · ${esc(rdTitulo(r))}</button><span class="muted">${fData(r.data)} · ${esc(r.responsaveis || "")}</span></li>`).join("")}</ul></section>` : ""}
      ${rdPodeFazer() ? `<section class="panel"><h3>Outras fichas</h3>
        <div class="rd-nova"><label class="field"><span>Ficha semanal do bloco</span><select class="input" id="rd-n-bloco">${RD_BLOCOS.map(b => `<option>${b}</option>`).join("")}</select></label><button type="button" class="btn" id="rd-n-bloco-ok">Iniciar</button></div>
        <div class="rd-nova"><label class="field"><span>Checklist-mestre</span><select class="input" id="rd-n-sec">${Object.entries(RD_CHECK).map(([k, s]) => `<option value="${k}">${k} · ${esc(s.t)}</option>`).join("")}</select></label>
          <label class="field"><span>Local</span><input class="input" id="rd-n-local" list="rd-dl-local" placeholder="Ex.: Bloco 3, Portaria Norte"></label><datalist id="rd-dl-local"></datalist><button type="button" class="btn" id="rd-n-sec-ok">Iniciar</button></div>
        <div class="rd-nova"><span>Ficha diária das áreas comuns (manhã ou extra)</span><button type="button" class="btn" data-rd-novo="areas" data-alvo="Áreas comuns" data-periodo="Manhã">Iniciar</button></div>
      </section>` : ""}
      <section class="panel"><h3>Códigos</h3><ul class="rd-legenda">${RD_COD.map(([c, rot, d]) => `<li>${rdCodPill(c)} <b>${esc(rot)}</b> <span class="muted">${esc(d)}</span></li>`).join("")}</ul>
        <p class="rd-regra"><b>Regra principal:</b> não registrar OK para local não observado. Sem acesso ou segurança para vistoriar, use NV, informe o motivo e programe o retorno.</p></section>
    </div>`;
  if (rdPodeFazer()) {
    const sec = $("#rd-n-sec"), dl = () => { $("#rd-dl-local").innerHTML = (RD_CHECK[sec.value].locais || []).map(l => `<option value="${esc(l)}">`).join(""); const lc = RD_CHECK[sec.value].locais; $("#rd-n-local").value = lc && lc.length === 1 ? lc[0] : ""; };
    sec.onchange = dl; dl();
    $("#rd-n-bloco-ok").onclick = () => rdIniciar("bloco", $("#rd-n-bloco").value);
    $("#rd-n-sec-ok").onclick = () => { const l = $("#rd-n-local").value.trim(); if (!l) { toast("Informe o local (ex.: Bloco 3, Portaria Norte).", true); $("#rd-n-local").focus(); return; } rdIniciar("checklist", l, {secao:sec.value}); };
  }
}
// ---- histórico ----
function rdHistorico(box){
  const lista = RD.lista;
  box.innerHTML = `<p class="hint">Rondas das últimas ${RD_DIAS_TELA} semanas e as mais antigas que ainda têm pendência aberta. As fichas completas ficam na aba Rondas da planilha.</p>
    <div class="tablebox"><table><thead><tr><th>Nº</th><th>Ficha</th><th class="hide-s">Data</th><th class="hide-m">Responsáveis</th><th>Resumo</th><th>Situação</th></tr></thead><tbody>
    ${lista.length ? lista.map(r => `<tr class="click" tabindex="0" data-rd-abrir="${esc(r.id)}"><td class="mono">${esc(r.numero)}</td><td><b>${esc(rdTitulo(r))}</b><span class="sub">${esc(rdTipoRot[r.tipo] || "")}</span></td>
      <td class="hide-s num">${fData(r.data)}</td><td class="hide-m">${esc(r.responsaveis || "—")}</td><td>${esc(r.resumo || "—")}</td>
      <td><span class="pill ${r.status === "Concluída" ? "s-ok" : "st-andamento"}">${esc(r.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="6"><div class="empty">Nenhuma ronda registrada ainda.</div></td></tr>`}</tbody></table></div>`;
}
const RD_DIAS_TELA = 8;
// ---- pendências (P e C) ----
function rdPendencias(box){
  const todas = rdPend(), ab = todas.filter(x => !x.i.res), res = todas.filter(x => x.i.res).sort((a, b) => String(b.i.res).localeCompare(String(a.i.res)));
  const reinc = rdReincidentes();
  const lista = RD.pf === "abertas" ? ab.sort((a, b) => (a.i.c === "C" ? 0 : 1) - (b.i.c === "C" ? 0 : 1) || String(a.r.data).localeCompare(String(b.r.data))) : res.slice(0, 60);
  box.innerHTML = `<div class="chips" role="group" aria-label="Mostrar"><button class="chip" type="button" data-pf="abertas" aria-pressed="${RD.pf === "abertas"}">Abertas (${ab.length})</button><button class="chip" type="button" data-pf="resolvidas" aria-pressed="${RD.pf !== "abertas"}">Resolvidas (${res.length})</button></div>
    <p class="hint">Itens marcados P (pendente) ou C (crítico) nas fichas. Ficam aqui até alguém confirmar a solução${RD.pf === "abertas" ? " — uma pendência encaminhada, mas não resolvida, continua aberta" : ""}.</p>
    <div class="rd-pend">${lista.length ? lista.map(({r, i}) => `<article class="rd-pi ${i.c === "C" ? "crit" : ""} ${i.res ? "res" : ""}">
      <div class="rd-pi-top">${rdCodPill(i.c)}<b>${esc(i.g ? i.g + " · " : "")}${esc(i.r)}</b>${reinc.has(r.tipo + "|" + r.alvo + "|" + i.k) && !i.res ? `<span class="pill s-baixo">reincidente</span>` : ""}</div>
      <p class="rd-pi-o">${esc(i.o || "")}</p>
      <p class="muted rd-pi-m"><button type="button" class="link" data-rd-abrir="${esc(r.id)}">${esc(r.numero)}</button> · ${esc(r.alvo)} · ${fData(r.data)} · ${esc(r.responsaveis || "")}${(i.f || []).length ? ` · ${i.f.map((f, j) => `<button type="button" class="link" data-rd-foto="${esc(f)}" data-rd="${esc(r.id)}">foto ${j + 1}</button>`).join(" ")}` : ""}</p>
      ${i.res ? `<p class="rd-pi-res">✓ Resolvida em ${esc(pdMarca(i.res))}: ${esc(i.ro || "")}</p>`
        : rdPodeFazer() ? `<form class="rd-resolver" data-rd="${esc(r.id)}" data-k="${esc(i.k)}"><input class="input" maxlength="300" placeholder="Como foi resolvida (ex.: OS-0012 concluída, reinspecionado hoje)" aria-label="Como foi resolvida"><button class="btn small" type="submit">Marcar como resolvida</button></form>` : ""}
    </article>`).join("") : `<div class="empty">${RD.pf === "abertas" ? "Nenhuma pendência aberta." : "Nenhuma pendência resolvida ainda."}</div>`}</div>`;
  $$("#rd-corpo [data-pf]").forEach(b => b.onclick = () => { RD.pf = b.dataset.pf; renderRondas(); });
  $$("#rd-corpo .rd-resolver").forEach(f => f.onsubmit = ev => {
    ev.preventDefault(); const inp = f.querySelector("input"), obs = inp.value.trim();
    if (!obs) { toast("Diga como foi resolvida.", true); inp.focus(); return; }
    enviar(f.querySelector("button"), null, "rondaResolver", {id:f.dataset.rd, k:f.dataset.k, obs}, r => { rdTrocarLista(r.ronda); renderRondas(); });
  });
}
// mesmo item (local + ficha) com P ou C em duas ou mais rondas nas últimas 4 semanas
function rdReincidentes(base){
  const corte = rdSomar(base || hoje(), -28), n = new Map();
  (RD.lista || []).filter(r => r.data >= corte && r.data <= (base ? rdSomar(base, 6) : hoje())).forEach(r => r.itens.forEach(i => { if (i.c === "P" || i.c === "C") { const k = r.tipo + "|" + r.alvo + "|" + i.k; n.set(k, (n.get(k) || 0) + 1); } }));
  return new Set([...n].filter(([, v]) => v >= 2).map(([k]) => k));
}
// ---- fechamento semanal (O) ----
function rdFechamento(box){
  if (!RD.semana) RD.semana = rdSegunda();
  const ini = RD.semana, fim = rdSomar(ini, 6);
  const da = RD.lista.filter(r => r.data >= ini && r.data <= fim), conc = da.filter(r => r.status === "Concluída");
  const blocos = new Set(conc.filter(r => r.tipo === "bloco").map(r => r.alvo));
  const nivRegs = new Set(conc.filter(r => r.tipo === "bloco").flatMap(r => r.itens.filter(i => i.c && i.c !== "NV").map(i => i.g)));
  const areasRegs = new Set(conc.filter(r => r.tipo === "areas").flatMap(r => r.itens.filter(i => i.c && i.c !== "NV" && i.c !== "NA").map(i => i.r)));
  const itens = da.flatMap(r => r.itens.map(i => ({r, i})));
  const novas = itens.filter(x => x.i.c === "P" || x.i.c === "C"), crit = novas.filter(x => x.i.c === "C");
  const resolvidas = rdPend().filter(x => x.i.res && String(x.i.res).slice(0, 10) >= ini && String(x.i.res).slice(0, 10) <= fim);
  const nv = itens.filter(x => x.i.c === "NV");
  const reinc = rdReincidentes(ini), reincL = rdPend().filter(x => x.r.data >= rdSomar(ini, -28) && x.r.data <= fim && reinc.has(x.r.tipo + "|" + x.r.alvo + "|" + x.i.k));
  const abertasC = rdPend().filter(x => !x.i.res && x.i.c === "C");
  const proxSem = Math.min(5, Math.ceil(new Date(rdSomar(ini, 7) + "T12:00").getDate() / 7));
  const osTem = Array.isArray(S.osTodas) && S.osTodas.length !== undefined && (can("os_ver") || can("os_gerenciar") || can("os_abrir"));
  const osConc = osTem ? S.osTodas.filter(o => o.status === "Concluída" && String(o.concluidaEm).slice(0, 10) >= ini && String(o.concluidaEm).slice(0, 10) <= fim).length : null;
  const osVenc = osTem ? S.osTodas.filter(o => !osEncerrada(o) && o.prazo && o.prazo < hoje()).length : null;
  const lin = (rot, val) => `<tr><th>${esc(rot)}</th><td>${val}</td></tr>`;
  const lista = (arr, f) => arr.length ? `<ul class="rd-fl">${arr.slice(0, 12).map(f).join("")}${arr.length > 12 ? `<li class="muted">+ ${arr.length - 12}</li>` : ""}</ul>` : `<span class="muted">nenhum</span>`;
  const desc = x => `<li>${rdCodPill(x.i.c)} ${esc(x.r.alvo)} · ${esc(x.i.g ? x.i.g + " · " : "")}${esc(x.i.r)}${x.i.o ? ` — <i>${esc(x.i.o)}</i>` : ""}</li>`;
  box.innerHTML = `<div class="rd-sem"><button type="button" class="btn small" data-sem="-7" aria-label="Semana anterior">‹</button><b>Semana de ${fData(ini)} a ${fData(fim)}</b><button type="button" class="btn small" data-sem="7" aria-label="Próxima semana" ${fim >= hoje() ? "disabled" : ""}>›</button></div>
    <div class="tablebox"><table class="rd-fech"><tbody>
      ${lin("Blocos vistoriados", `<div class="rd-chips">${RD_BLOCOS.map(b => `<span class="rd-chip ${blocos.has(b) ? "ok" : "falta"}">${blocos.has(b) ? "✓" : "✗"} ${esc(b.replace("Bloco ", "B"))}</span>`).join("")}</div>`)}
      ${lin("Pavimentos registrados", RD_NIVEIS.map(n => `<span class="rd-tag ${nivRegs.has(n) ? "ok" : ""}">${esc(n)}</span>`).join(" "))}
      ${lin("Áreas comuns vistoriadas", RD_AREAS.map(a => `<span class="rd-tag ${areasRegs.has(a) ? "ok" : ""}">${esc(a)}</span>`).join(" ") + `<br><span class="muted">${conc.filter(r => r.tipo === "areas").length} ficha(s) diária(s) concluída(s)</span>`)}
      ${lin("Ocorrências novas", `<b>${novas.length}</b> ${lista(novas, desc)}`)}
      ${lin("Ocorrências críticas", `<b class="${crit.length ? "atr" : ""}">${crit.length}</b>`)}
      ${lin("Pendências resolvidas na semana", `<b>${resolvidas.length}</b>`)}
      ${osTem ? lin("OS concluídas na semana", `<b>${osConc}</b>`) + lin("OS vencidas (agora)", `<b class="${osVenc ? "atr" : ""}">${osVenc}</b>`) : ""}
      ${lin("Locais NV e retorno programado", lista(nv, desc))}
      ${lin("Pendências reincidentes", lista(reincL.filter((x, j, a) => a.findIndex(y => y.r.alvo === x.r.alvo && y.i.k === x.i.k) === j), desc))}
      ${lin("Prioridades da semana seguinte", `${abertasC.length ? `<b class="atr">${abertasC.length} crítica(s) ainda aberta(s).</b> ` : ""}${nv.length ? `Retornar aos ${nv.length} local(is) NV. ` : ""}Rodízio: <i>${esc(RD_RODIZIO[proxSem - 1])}</i>`)}
    </tbody></table></div>
    <p class="hint">Uma ocorrência só é encerrada após confirmação da execução e, quando necessário, reinspeção. Pendência encaminhada, mas não resolvida, permanece aberta.</p>`;
  $$("#rd-corpo [data-sem]").forEach(b => b.onclick = () => { RD.semana = rdSomar(RD.semana, +b.dataset.sem); renderRondas(); });
}
// ---- iniciar, abrir, salvar e concluir ----
async function rdIniciar(tipo, alvo, extras){
  const ja = (RD.lista || []).find(r => r.status === "Em andamento" && r.tipo === tipo && r.alvo === alvo && r.data === hoje() && (tipo !== "checklist" || (r.extras || {}).secao === (extras || {}).secao));
  if (ja) { rdAbrir(ja.id); return; }
  const itens = rdModeloItens(tipo, (extras || {}).secao);
  if (!itens.length) return;
  try {
    const r = await api("rondaSalvar", {op:"salvar", ronda:{tipo, alvo, data:hoje(), responsaveis:S.nome, extras:extras || {}, itens}});
    rdTrocarLista(r.ronda); toast(r.msg); rdAbrir(r.ronda.id);
  } catch(e){ toast(e.message, true); }
}
function rdAbrir(id){
  const r = (RD.lista || []).find(x => x.id === id); if (!r) return;
  RD.edit = JSON.parse(JSON.stringify(r)); RD.sujo = false; renderRondas(); scrollTo({top:0});
}
function rdPayload(){
  const e = RD.edit;
  return {id:e.id, tipo:e.tipo, alvo:e.alvo, data:e.data, responsaveis:e.responsaveis, acesso:e.acesso, osRel:e.osRel, obs:e.obs, extras:e.extras || {},
    itens:e.itens.map(i => { const o = {k:i.k, g:i.g, r:i.r, c:i.c || "", o:i.o || ""}; if (i.p !== undefined) o.p = i.p; return o; })};
}
async function rdGravar(op, btn){
  const msg = $("#rd-msg");
  if (btn) btn.disabled = true;
  msg.className = "hint"; msg.innerHTML = `<span class="spin" aria-hidden="true"></span> ${op === "concluir" ? "Concluindo" : op === "reabrir" ? "Reabrindo" : "Salvando"}…`;
  try {
    const r = await api("rondaSalvar", {op, ronda: op === "reabrir" ? {id:RD.edit.id} : rdPayload()});
    rdTrocarLista(r.ronda); RD.edit = JSON.parse(JSON.stringify(r.ronda)); RD.sujo = false;
    toast(r.msg); rdEditor(); return true;
  } catch(e){ msg.className = "hint err"; msg.textContent = e.message; return false; }
  finally { if (btn) btn.disabled = false; }
}
function rdSair(){ RD.edit = null; RD.sujo = false; renderRondas(); scrollTo({top:0}); }
// ---- a ficha ----
function rdEditor(){
  const e = RD.edit, box = $("#rd-editor"), ed = e.status === "Em andamento" && rdPodeFazer();
  const feitos = e.itens.filter(i => i.c).length, tot = e.itens.length, dis = ed ? "" : "disabled";
  const x = e.extras || {};
  const segm = i => `<span class="rd-seg" role="group" aria-label="Código">${RD_COD.map(([c, rot]) => `<button type="button" class="c-${c}" data-k="${esc(i.k)}" data-c="${c}" aria-pressed="${i.c === c}" title="${esc(rot)}" ${dis}>${c}</button>`).join("")}</span>`;
  const detalhe = (i, comRot) => {
    if (!rdFlag(i.c) && !(i.f || []).length && !i.res) return "";
    const rotObs = i.c === "NV" ? "Motivo e retorno programado" : "O que foi visto (local exato)";
    return `<div class="rd-det ${i.c === "C" ? "crit" : ""}">${comRot ? `<b>${esc(i.g)} · ${esc(i.r)} — ${esc(i.c)}</b>` : ""}
      ${rdFlag(i.c) ? `<input class="input" data-o="${esc(i.k)}" value="${esc(i.o || "")}" maxlength="300" placeholder="${rotObs}${i.c === "C" ? " — comunique a Gerência agora" : ""}" aria-label="${rotObs}" ${dis}>` : ""}
      <span class="rd-fotos">${(i.f || []).map((f, j) => `<button type="button" class="link" data-rd-foto="${esc(f)}" data-rd="${esc(e.id)}">foto ${j + 1}</button>${ed ? `<button type="button" class="link danger" data-rd-fx="${esc(f)}" aria-label="Tirar a foto ${j + 1}">×</button>` : ""}`).join(" ")}
        ${ed && rdFlag(i.c) && (i.f || []).length < 3 ? `<label class="btn small rd-fadd">+ Foto<input type="file" accept="image/*" capture="environment" data-rd-up="${esc(i.k)}" hidden></label>` : ""}</span>
      ${i.res ? `<span class="rd-pi-res">✓ Resolvida em ${esc(pdMarca(i.res))}: ${esc(i.ro || "")}</span>` : ""}</div>`;
  };
  let corpo;
  if (e.tipo === "bloco") {
    corpo = `<div class="tablebox rd-gradebox"><table class="rd-grade"><thead><tr><th>Nível / ambiente</th>${RD_CATS.map(([c, rot]) => `<th title="${esc(rot)}">${c === "GAS" ? "Shaft gás" : c === "SEL" ? "Shaft elétr." : c}</th>`).join("")}${ed ? "<th></th>" : ""}</tr></thead><tbody>
      ${RD_NIVEIS.map((n, li) => `<tr><th>${esc(n)}</th>${RD_CATS.map(([c, rot]) => { const i = e.itens.find(z => z.k === `n${li}${c}`) || {k:`n${li}${c}`, c:""};
        return `<td data-lbl="${esc(rot)}"><select class="rd-sel c-${esc(i.c || "x")}" data-k="${esc(i.k)}" aria-label="${esc(n + " · " + rot)}" ${dis}><option value=""></option>${RD_COD.map(([cc]) => `<option ${cc === i.c ? "selected" : ""}>${cc}</option>`).join("")}</select></td>`; }).join("")}
        ${ed ? `<td class="rd-fill"><button type="button" class="link" data-fill="${li}" data-v="OK">OK nos vazios</button><button type="button" class="link" data-fill="${li}" data-v="NA">NA nos vazios</button></td>` : ""}</tr>`).join("")}
      </tbody></table></div>
      <p class="hint">LIM limpeza · CON conservação/pintura · ELE elétrica/iluminação · HID hidráulica/drenagem · RES resíduos/lixeiras · SEG segurança/circulação. P, C e NV pedem a descrição logo abaixo.</p>
      <div class="rd-dets">${e.itens.filter(i => rdFlag(i.c) || (i.f || []).length || i.res).map(i => detalhe(i, true)).join("") || ""}</div>`;
  } else {
    corpo = `<ol class="rd-itens">${e.itens.map(i => `<li class="rd-item c-${esc(i.c || "x")}"><div class="rd-item-top"><span class="rd-item-r">${esc(i.r)}</span>${segm(i)}</div>
      ${e.tipo === "areas" ? `<input class="input rd-pontos" data-p="${esc(i.k)}" value="${esc(i.p || "")}" maxlength="200" placeholder="Principais pontos verificados" aria-label="Principais pontos verificados em ${esc(i.r)}" ${dis}>` : ""}
      ${detalhe(i, false)}</li>`).join("")}</ol>`;
  }
  const secInfo = e.tipo === "checklist" ? RD_CHECK[x.secao] : null;
  const hojeP = RD_PROG[new Date(e.data + "T12:00").getDay()];
  box.innerHTML = `
    <div class="ct-top"><button type="button" class="link" id="rd-voltar">← Ronda</button><h2 class="sec">${esc(rdTitulo(e))}</h2><span class="pill ${e.status === "Concluída" ? "s-ok" : "st-andamento"}">${esc(e.numero)} · ${esc(e.status)}</span>
      <span class="ct-acoes">${ed ? `<button class="btn" type="button" id="rd-salvar">Salvar</button><button class="btn primary" type="button" id="rd-concluir">Concluir ronda</button>` : ""}${e.status === "Concluída" && rdPodeFazer() ? `<button class="btn" type="button" id="rd-reabrir">Reabrir para corrigir</button>` : ""}</span></div>
    <p class="hint" id="rd-msg">${RD.sujo ? "Alterações não salvas." : ""}</p>
    ${secInfo ? `<p class="muted">${esc(secInfo.d)}</p>` : ""}
    ${e.tipo === "areas" && hojeP ? `<p class="muted">Tema da tarde (${esc(hojeP.dia)}): ${esc(hojeP.tarde)}.</p>` : ""}
    <div class="card ct-card"><div class="form rd-cab">
      <div class="field"><label for="rd-data">Data</label><input class="input" type="date" id="rd-data" value="${esc(e.data)}" max="${hoje()}" ${dis}></div>
      <div class="field"><label for="rd-resp">Responsáveis</label><input class="input" id="rd-resp" value="${esc(e.responsaveis || "")}" maxlength="120" ${dis}></div>
      ${e.tipo === "areas" ? `<div class="field"><label for="rd-per">Período</label><select class="input" id="rd-per" ${dis}>${["Tarde","Manhã","Noite"].map(p => `<option ${p === (x.periodo || "Tarde") ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="field"><label for="rd-crit">Ronda crítica realizada?</label><select class="input" id="rd-crit" ${dis}>${["","Sim","Não"].map(p => `<option ${p === (x.critica || "") ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        <div class="field"><label for="rd-prio">Prioridade do dia</label><input class="input" id="rd-prio" value="${esc(x.prioridade || "")}" maxlength="200" ${dis}></div>` : ""}
      <div class="field"><label for="rd-acesso">Condições de acesso</label><input class="input" id="rd-acesso" value="${esc(e.acesso || "")}" maxlength="200" placeholder="Ex.: terraço do bloco trancado" ${dis}></div>
      <div class="field"><label for="rd-os">OS relacionadas</label><input class="input" id="rd-os" value="${esc(e.osRel || "")}" maxlength="120" placeholder="Ex.: OS-0012, OS-0015" ${dis}></div>
      <div class="field full"><label for="rd-obs">${e.tipo === "bloco" ? "Reinspeção / observações" : "Observações"}</label><textarea class="input" id="rd-obs" maxlength="1000" rows="2" ${dis}>${esc(e.obs || "")}</textarea></div>
      <p class="full hint">Início ${fDataHora(e.inicio)}${e.fim ? ` · fim ${fDataHora(e.fim)}` : ""}${e.criadaPor ? ` · iniciada por ${esc(e.criadaPor)}` : ""}</p>
    </div></div>
    <div class="rd-prog"><span class="track"><i style="width:${tot ? Math.round(feitos / tot * 100) : 0}%"></i></span><span>${feitos} de ${tot} itens com código${e.resumo ? " · " + esc(e.resumo) : ""}</span></div>
    <div class="card ct-card">${corpo}</div>
    ${ed ? `<div class="actions" style="margin-top:12px"><button class="btn" type="button" id="rd-salvar2">Salvar</button><button class="btn primary" type="button" id="rd-concluir2">Concluir ronda</button></div>` : ""}`;
  // eventos
  $("#rd-voltar").onclick = () => {
    if (!RD.sujo) { rdSair(); return; }
    const m = $("#rd-msg"); m.className = "hint err";
    m.innerHTML = `Há alterações não salvas. <button type="button" class="btn small primary" id="rd-sv-sair">Salvar e sair</button> <button type="button" class="btn small" id="rd-sem-sair">Sair sem salvar</button>`;
    $("#rd-sv-sair").onclick = async () => { if (await rdGravar("salvar")) rdSair(); };
    $("#rd-sem-sair").onclick = rdSair;
  };
  if ($("#rd-reabrir")) $("#rd-reabrir").onclick = ev => rdGravar("reabrir", ev.target);
  if (!ed) return;
  ["#rd-salvar","#rd-salvar2"].forEach(s => $(s).onclick = ev => rdGravar("salvar", ev.target));
  ["#rd-concluir","#rd-concluir2"].forEach(s => $(s).onclick = ev => rdGravar("concluir", ev.target));
  const marcar = () => { RD.sujo = true; const m = $("#rd-msg"); if (m && !m.querySelector("button")) { m.className = "hint"; m.textContent = "Alterações não salvas."; } };
  const cab = [["#rd-data","data"],["#rd-resp","responsaveis"],["#rd-acesso","acesso"],["#rd-os","osRel"],["#rd-obs","obs"]];
  cab.forEach(([s, k]) => $(s).addEventListener("input", ev => { e[k] = ev.target.value; marcar(); }));
  [["#rd-per","periodo"],["#rd-crit","critica"],["#rd-prio","prioridade"]].forEach(([s, k]) => { if ($(s)) $(s).addEventListener("input", ev => { e.extras = Object.assign({}, e.extras, {[k]: ev.target.value}); marcar(); }); });
  const item = k => e.itens.find(i => i.k === k);
  box.querySelectorAll(".rd-seg button").forEach(b => b.onclick = () => { const i = item(b.dataset.k); i.c = i.c === b.dataset.c ? "" : b.dataset.c; marcar(); rdEditorManterFoco(() => rdEditor(), `.rd-seg [data-k="${CSS.escape(i.k)}"][data-c="${b.dataset.c}"]`); });
  box.querySelectorAll(".rd-sel").forEach(s => s.onchange = () => { const i = item(s.dataset.k) || (e.itens.push({k:s.dataset.k, c:""}), item(s.dataset.k)); i.c = s.value; marcar(); rdEditorManterFoco(() => rdEditor(), `.rd-sel[data-k="${CSS.escape(i.k)}"]`); });
  box.querySelectorAll("[data-fill]").forEach(b => b.onclick = () => { const li = b.dataset.fill; e.itens.filter(i => i.k.startsWith(`n${li}`) && i.k.length === `n${li}`.length + 3 && !i.c).forEach(i => { i.c = b.dataset.v; }); marcar(); rdEditor(); });
  box.querySelectorAll("[data-o]").forEach(inp => inp.addEventListener("input", () => { item(inp.dataset.o).o = inp.value; marcar(); }));
  box.querySelectorAll("[data-p]").forEach(inp => inp.addEventListener("input", () => { item(inp.dataset.p).p = inp.value; marcar(); }));
  box.querySelectorAll("[data-rd-up]").forEach(inp => inp.addEventListener("change", async () => {
    const f = inp.files[0], k = inp.dataset.rdUp; inp.value = ""; if (!f) return;
    if (RD.sujo && !(await rdGravar("salvar"))) return;
    const m = $("#rd-msg"); m.className = "hint"; m.innerHTML = `<span class="spin" aria-hidden="true"></span> Enviando a foto…`;
    try { const b64 = await reduzirFoto(f); const r = await api("rondaFoto", {id:e.id, k, mime:"image/jpeg", b64}); rdTrocarLista(r.ronda); RD.edit = JSON.parse(JSON.stringify(r.ronda)); RD.sujo = false; toast(r.msg); rdEditor(); }
    catch(er){ m.className = "hint err"; m.textContent = er && er.message && er.message !== "img" ? er.message : "Não deu para ler a foto."; }
  }));
  box.querySelectorAll("[data-rd-fx]").forEach(b => b.onclick = async () => {
    if (!b.dataset.conf) { b.dataset.conf = "1"; b.textContent = "tirar?"; return; }
    if (RD.sujo && !(await rdGravar("salvar"))) return;
    try { const r = await api("rondaFotoRemover", {id:e.id, fotoId:b.dataset.rdFx}); rdTrocarLista(r.ronda); RD.edit = JSON.parse(JSON.stringify(r.ronda)); toast(r.msg); rdEditor(); } catch(er){ toast(er.message, true); }
  });
}
// redesenha a ficha mantendo a rolagem e o foco no controle que a pessoa estava usando
function rdEditorManterFoco(fn, sel){ const y = scrollY; fn(); scrollTo({top:y}); const el = sel && $("#rd-editor " + sel); if (el) el.focus({preventScroll:true}); }
async function rdVerFoto(rid, fid){
  $("#modal-box").innerHTML = `<div class="foto-grande"><span class="spin" aria-hidden="true"></span> Carregando a foto…</div><div class="actions"><button class="btn" type="button" id="rd-fz">Fechar</button></div>`;
  $("#modal").hidden = false; $("#rd-fz").onclick = fecharModal;
  try {
    if (!RD.fotos.has(fid)) RD.fotos.set(fid, api("rondaFotoVer", {id:rid, fotoId:fid}).then(r => `data:${r.foto.mime};base64,${r.foto.b64}`));
    const src = await RD.fotos.get(fid);
    const box = $("#modal-box .foto-grande"); if (box) box.innerHTML = `<img src="${src}" alt="Foto da ronda" style="max-width:100%;max-height:70vh;display:block;margin:auto">`;
  } catch(e){ RD.fotos.delete(fid); const box = $("#modal-box .foto-grande"); if (box) box.textContent = e.message; }
}
if ($("#t-rondas")) {
  $("#rd-vistas").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b) { RD.vista = b.dataset.v; renderRondas(); } });
  $("#t-rondas").addEventListener("click", ev => {
    const a = ev.target.closest("[data-rd-abrir]"); if (a) { rdAbrir(a.dataset.rdAbrir); return; }
    const n = ev.target.closest("[data-rd-novo]"); if (n) { rdIniciar(n.dataset.rdNovo, n.dataset.alvo, n.dataset.periodo ? {periodo:n.dataset.periodo} : {}); return; }
    const f = ev.target.closest("[data-rd-foto]"); if (f) { rdVerFoto(f.dataset.rd, f.dataset.rdFoto); return; }
  });
  $("#t-rondas").addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.rdAbrir && ev.target.tagName === "TR") rdAbrir(ev.target.dataset.rdAbrir); });
}

// ---------- unidades e moradores (só no setor Administração; dados pessoais) ----------
// Lista de unidades (com animais e veículos), atualização cadastral (ficha, controle e impressão) e configurações
// (blocos, andares, unidades e importação da planilha de cadastro). Os dados ficam só na planilha do Google.
const UN = { lista:null, blocos:[], carregando:false, erro:"", em:0, vista:"unidades", q:"", bloco:"", ocup:"", cad:"", cq:"", ed:null, edCad:true };
let CF = null; // estado da tela Configurações (só grava em "Salvar todas as alterações")
const unPode = () => can("un_editar");
const UN_OCUP = ["Ocupada","Em obra","Vazia"], UN_SIT = ["Proprietário","Alugado"], UN_VAGAS = ["1A","1B","2A","2B","3B","4B"];
const unNome = u => `${u.numero} · ${u.bloco}`;
const unBlocoCurto = b => String(b || "").replace(/\s*\(.*\)\s*$/, "");
const unMoradores = u => u.pessoas.filter(p => p.morador === "Sim").length;
const unTemCadastro = u => !!(String(u.proprietario || "").trim() || u.pessoas.length || u.pets.length || u.veiculos.length);
// atualização cadastral: em dia até 12 meses
const unCadSt = u => !u.cadastroEm ? "nunca" : String(u.cadastroEm).slice(0, 10) >= (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return iso(d); })() ? "ok" : "velha";
const UN_CAD_ROT = {ok:"Atualizada", velha:"Desatualizada", nunca:"Nunca atualizada"};
function unLimparMemoria(){ UN.lista = null; UN.blocos = []; UN.ed = null; UN.erro = ""; CF = null; }
async function carregarUnidades(forcar){
  if (!TEM_ADM || !S.token || UN.carregando) return;
  if (!(podeAba("unidades") || podeAba("uncadastro") || podeAba("unconfig"))) return;
  if (!forcar && UN.lista && Date.now() - UN.em < 60000) { renderUnidadesTudo(); return; }
  UN.carregando = true;
  try { const r = await api("unidades"); UN.lista = r.unidades || []; UN.blocos = r.blocos || []; UN.em = Date.now(); UN.erro = ""; }
  catch(e){ UN.erro = e.message; toast(e.message, true); }
  finally { UN.carregando = false; renderUnidadesTudo(); }
}
function renderUnidadesTudo(){ renderUnLista(); renderUnCad(); renderUnConfig(); }
const unAvisoNovo = () => /desconhecida/i.test(UN.erro) ? " O cadastro de unidades precisa do Apps Script novo (colar o código e implantar uma nova versão)." : "";
function unCarregando(box){
  if (UN.erro && !UN.lista) { box.innerHTML = `<div class="notice crit">${esc(UN.erro)}${unAvisoNovo()}</div>`; return true; }
  if (!UN.lista) { box.innerHTML = `<div class="empty"><span class="spin" aria-hidden="true"></span> Carregando as unidades…</div>`; return true; }
  return false;
}
// busca: número (ex.: 603) em todos os blocos, ou nome / placa / pet
function unBusca(u, q, vista){
  if (!q) return true;
  const n = norm(q).trim();
  if (/^\d+$/.test(n)) return String(u.numero).includes(n);
  if (vista === "veiculos") return u.veiculos.some(v => norm([v.placa, v.marca, v.modelo, v.cor].join(" ")).includes(n)) || norm(u.proprietario).includes(n);
  if (vista === "animais") return u.pets.some(p => norm(p.descricao).includes(n)) || norm(u.proprietario).includes(n);
  return norm([u.proprietario, u.bloco].concat(u.pessoas.map(p => p.nome)).join(" ")).includes(n);
}
// ---- Lista de unidades ----
function renderUnLista(){
  const sec = $("#t-unidades"); if (!sec || sec.hidden) return;
  const box = $("#ul-corpo"); if (unCarregando(box)) { $("#ul-cards").innerHTML = ""; return; }
  const L = UN.lista, tot = L.length, pct = n => tot ? Math.round(n / tot * 100) + "%" : "0%";
  const nO = L.filter(u => u.ocupacao === "Ocupada").length, nE = L.filter(u => u.ocupacao === "Em obra").length, nV = L.filter(u => u.ocupacao !== "Ocupada" && u.ocupacao !== "Em obra").length;
  const card = (k, rot, v, sub, cor, ico, subCls) => `<button type="button" class="pp-card ${UN.ocup === k ? "sel" : ""}" data-ocup="${k}"><span class="pp-txt"><span class="pp-rot">${rot}</span><b class="pp-v num">${v}</b><span class="pp-sub ${subCls || ""}">${sub}</span></span><span class="pp-ico ${cor}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg></span></button>`;
  $("#ul-cards").innerHTML = card("", "Total de Unidades", tot, `${UN.blocos.length} bloco${UN.blocos.length === 1 ? "" : "s"}`, "roxo", '<path d="M5 21V4h10v17M15 9h4v12M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1M3 21h18"/>')
    + card("Ocupada", "Ocupadas", nO, pct(nO), "verde", '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>', "ok")
    + card("Em obra", "Em Obra", nE, pct(nE), "laranja", '<path d="M4 17h16v2H4zM6 17a6 6 0 0 1 12 0M12 7V5M9.5 11.5 12 7l2.5 4.5"/>')
    + card("Vazia", "Vazias", nV, pct(nV), "cinza", '<path d="M6 21V4h9v17M15 6h3v15M12 12h.01M3 21h18"/>');
  $$("#ul-cards [data-ocup]").forEach(b => b.onclick = () => { UN.ocup = UN.ocup === b.dataset.ocup ? "" : b.dataset.ocup; renderUnLista(); });
  $$("#ul-vistas [data-v]").forEach(b => b.setAttribute("aria-selected", b.dataset.v === UN.vista ? "true" : "false"));
  const sel = $("#ul-bloco"); sel.innerHTML = `<option value="">Todos os blocos</option>` + UN.blocos.map(b => `<option ${b === UN.bloco ? "selected" : ""}>${esc(b)}</option>`).join("");
  const vis = L.filter(u => (!UN.bloco || u.bloco === UN.bloco) && (!UN.ocup || (UN.ocup === "Vazia" ? u.ocupacao !== "Ocupada" && u.ocupacao !== "Em obra" : u.ocupacao === UN.ocup)) && unBusca(u, UN.q, UN.vista));
  const ocPill = o => `<span class="pill ${o === "Ocupada" ? "s-ok" : o === "Em obra" ? "s-baixo" : "p-ajuste"}">${esc(o || "Vazia")}</span>`;
  let h;
  if (UN.vista === "animais") {
    const l = vis.flatMap(u => u.pets.map(p => ({u, p})));
    h = `<thead><tr><th>Bloco</th><th>Unidade</th><th>Pet</th><th class="hide-s">Proprietário</th></tr></thead><tbody>${l.length ? l.map(({u, p}) => `<tr class="click" tabindex="0" data-un="${esc(u.id)}"><td>${esc(unBlocoCurto(u.bloco))}</td><td class="mono">${esc(u.numero)}</td><td>${esc(p.descricao)}</td><td class="hide-s">${esc(u.proprietario || "—")}</td></tr>`).join("") : `<tr><td colspan="4"><div class="empty">Nenhum pet com esses filtros.</div></td></tr>`}</tbody>`;
    $("#ul-conta").textContent = `${l.length} pet${l.length === 1 ? "" : "s"}`;
  } else if (UN.vista === "veiculos") {
    const l = vis.flatMap(u => u.veiculos.map(v => ({u, v})));
    h = `<thead><tr><th>Bloco</th><th>Unidade</th><th>Placa</th><th>Veículo</th><th class="hide-s">Cor</th><th class="hide-s">Vaga</th><th class="hide-m">TAG</th></tr></thead><tbody>${l.length ? l.map(({u, v}) => `<tr class="click" tabindex="0" data-un="${esc(u.id)}"><td>${esc(unBlocoCurto(u.bloco))}</td><td class="mono">${esc(u.numero)}</td><td class="mono">${esc(v.placa || "—")}</td><td>${esc([v.marca, v.modelo].filter(Boolean).join(" ") || "—")}</td><td class="hide-s">${esc(v.cor || "—")}</td><td class="hide-s">${esc(v.vaga || "—")}</td><td class="hide-m">${esc(v.tag || "—")}</td></tr>`).join("") : `<tr><td colspan="7"><div class="empty">Nenhum veículo com esses filtros.</div></td></tr>`}</tbody>`;
    $("#ul-conta").textContent = `${l.length} veículo${l.length === 1 ? "" : "s"}`;
  } else {
    h = `<thead><tr><th>Bloco</th><th>Unidade</th><th class="hide-s">Situação</th><th>Ocupação</th><th>Proprietário</th><th class="hide-m num">Pessoas</th><th class="hide-m num">Pets</th><th class="hide-m num">Veículos</th></tr></thead><tbody>
      ${vis.length ? vis.map(u => `<tr class="click" tabindex="0" data-un="${esc(u.id)}"><td>${esc(unBlocoCurto(u.bloco))}<span class="sub hide-s">${esc(u.bloco.replace(/^\s*\d+\s*/, ""))}</span></td><td class="mono"><b>${esc(u.numero)}</b></td><td class="hide-s">${esc(u.situacao || "—")}</td><td>${ocPill(u.ocupacao)}</td>
        <td>${esc(u.proprietario || "—")}</td><td class="hide-m num">${u.pessoas.length}${u.pessoas.length ? `<span class="sub">${unMoradores(u)} morador${unMoradores(u) === 1 ? "" : "es"}</span>` : ""}</td><td class="hide-m num">${u.pets.length}</td><td class="hide-m num">${u.veiculos.length}</td></tr>`).join("")
        : `<tr><td colspan="8"><div class="empty">${L.length ? "Nenhuma unidade com esses filtros." : "Nenhuma unidade cadastrada. Use Unidades → Configurações para importar a planilha ou criar os blocos."}</div></td></tr>`}</tbody>`;
    $("#ul-conta").textContent = `${vis.length} de ${tot} unidades`;
  }
  box.innerHTML = `<div class="tablebox"><table>${h}</table></div>`;
}
// ficha da unidade (somente leitura), com atalhos para atualizar e imprimir
function unFicha(id){
  const u = (UN.lista || []).find(x => x.id === id); if (!u) return;
  registrarTela("unficha", `${unBlocoCurto(u.bloco)}-${u.numero}`);
  const sn = v => v ? esc(v) : "—";
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `
    <div class="os-top"><span class="mono muted">${esc(unBlocoCurto(u.bloco))} · ${esc(u.numero)}</span><span class="pill ${u.ocupacao === "Ocupada" ? "s-ok" : u.ocupacao === "Em obra" ? "s-baixo" : "p-ajuste"}">${esc(u.ocupacao || "Vazia")}</span>${u.situacao ? `<span class="pill st-andamento">${esc(u.situacao)}</span>` : ""}<span class="pill ${unCadSt(u) === "ok" ? "s-ok" : unCadSt(u) === "velha" ? "s-baixo" : "p-ajuste"}">${UN_CAD_ROT[unCadSt(u)]}</span></div>
    <h3 class="os-tit">Unidade ${esc(u.numero)} · Bloco ${esc(u.bloco)}</h3>
    <dl class="os-info"><div><dt>Proprietário</dt><dd>${sn(u.proprietario)}</dd></div><div><dt>Contatos</dt><dd class="un-pre">${sn(u.contatos)}</dd></div><div><dt>Identidades</dt><dd class="un-pre">${sn(u.identidade)}</dd></div>
      <div><dt>Atualização cadastral</dt><dd>${u.cadastroEm ? `${fDataHora(u.cadastroEm)} · ${esc(u.cadastroPor || "")}` : "nunca registrada"}</dd></div></dl>
    ${u.obs ? `<p class="os-desc">${esc(u.obs)}</p>` : ""}
    <h4>Pessoas e autorizações de acesso (${u.pessoas.length})</h4>
    <div class="tablebox flat"><table><thead><tr><th>Nome</th><th>Parentesco</th><th>Morador?</th><th class="hide-s">Facial</th><th class="hide-s">Barco</th><th class="hide-m">Contatos</th></tr></thead><tbody>
      ${u.pessoas.length ? u.pessoas.map(p => `<tr><td>${esc(p.nome)}</td><td>${sn(p.parentesco)}</td><td>${sn(p.morador)}</td><td class="hide-s">${sn(p.facial)}</td><td class="hide-s">${sn(p.barco)}</td><td class="hide-m un-pre">${sn(p.contatos)}</td></tr>`).join("") : `<tr><td colspan="6"><div class="empty">Nenhuma pessoa cadastrada.</div></td></tr>`}</tbody></table></div>
    <div class="os-grid"><section><h4>Pets (${u.pets.length})</h4>${u.pets.length ? `<ul class="pr-docs">${u.pets.map(p => `<li>${esc(p.descricao)}</li>`).join("")}</ul>` : `<p class="muted">Nenhum.</p>`}</section>
      <section><h4>Veículos (${u.veiculos.length})</h4>${u.veiculos.length ? `<ul class="pr-docs">${u.veiculos.map(v => `<li><b class="mono">${esc(v.placa || "sem placa")}</b> ${esc([v.marca, v.modelo, v.cor].filter(Boolean).join(" · "))}${v.vaga ? ` · vaga ${esc(v.vaga)}` : ""}${v.tag ? ` · TAG ${esc(v.tag)}` : ""}</li>`).join("")}</ul>` : `<p class="muted">Nenhum.</p>`}</section></div>
    <div class="actions" style="margin-top:12px">${unPode() ? `<button class="btn primary" type="button" id="un-f-ed">Atualizar cadastro</button>` : ""}<button class="btn" type="button" id="un-f-pr">Imprimir ficha</button><button class="btn" type="button" id="un-f-x">Fechar</button></div>`;
  $("#modal").hidden = false;
  $("#un-f-x").onclick = fecharModal; $("#un-f-x").focus();
  $("#un-f-pr").onclick = () => unImprimir(u);
  if ($("#un-f-ed")) $("#un-f-ed").onclick = () => { fecharModal(); unEditar(u.id); };
}
function unExportar(){
  if (!UN.lista) return;
  try {
    const X = xlsxMini(), cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", wrap:false};
    const vis = UN.lista.filter(u => (!UN.bloco || u.bloco === UN.bloco) && unBusca(u, UN.q, UN.vista));
    let cols, linhas;
    if (UN.vista === "animais") { cols = [["Bloco",22],["Unidade",10],["Pet",40],["Proprietário",34]]; linhas = vis.flatMap(u => u.pets.map(p => [u.bloco, u.numero, p.descricao, u.proprietario])); }
    else if (UN.vista === "veiculos") { cols = [["Bloco",22],["Unidade",10],["Vaga",8],["Marca",16],["Modelo",22],["Cor",12],["TAG",16],["Placa",12]]; linhas = vis.flatMap(u => u.veiculos.map(v => [u.bloco, u.numero, v.vaga, v.marca, v.modelo, v.cor, v.tag, v.placa])); }
    else { cols = [["Bloco",22],["Andar",8],["Unidade",10],["Situação",14],["Ocupação",12],["Proprietário",34],["Pessoas",9],["Moradores",11],["Pets",7],["Veículos",9],["Atualização cadastral",20]];
      linhas = vis.map(u => [u.bloco, u.andar, u.numero, u.situacao, u.ocupacao, u.proprietario, u.pessoas.length, unMoradores(u), u.pets.length, u.veiculos.length, u.cadastroEm ? fDataHora(u.cadastroEm) : "nunca"]); }
    cols.forEach(([rot, w], j) => { X.cel(1, j + 1, rot, cab); X.col(j + 1, w); });
    linhas.forEach((l, i) => l.forEach((v, j) => X.cel(i + 2, j + 1, typeof v === "number" ? v : String(v == null ? "" : v), typeof v === "number" ? {h:"center"} : {})));
    const buf = X.gerar(UN.vista === "animais" ? "Pets" : UN.vista === "veiculos" ? "Veiculos" : "Unidades");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    a.download = `${UN.vista === "animais" ? "Pets" : UN.vista === "veiculos" ? "Veiculos" : "Unidades"} - Pier ${hoje()}.xlsx`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    registrarTela("exportar_unidades", UN.vista);
  } catch(e){ toast(e.message || "Não foi possível gerar a planilha.", true); }
}
// ---- Atualização cadastral: controle e ficha de edição ----
function renderUnCad(){
  const sec = $("#t-uncadastro"); if (!sec || sec.hidden) return;
  const lb = $("#uc-lista-box"), ed = $("#uc-editor");
  if (UN.ed) { lb.hidden = true; ed.hidden = false; unEditor(); return; }
  lb.hidden = false; ed.hidden = true;
  const box = $("#uc-corpo"); if (unCarregando(box)) { $("#uc-cards").innerHTML = ""; return; }
  const L = UN.lista, n = k => L.filter(u => unCadSt(u) === k).length, tot = L.length;
  const card = (k, rot, v, sub, cor, ico) => `<button type="button" class="pp-card ${UN.cad === k ? "sel" : ""}" data-cad="${k}"><span class="pp-txt"><span class="pp-rot">${rot}</span><b class="pp-v num">${v}</b><span class="pp-sub">${sub}</span></span><span class="pp-ico ${cor}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg></span></button>`;
  $("#uc-cards").innerHTML = card("ok", "Atualizadas", n("ok"), `${tot ? Math.round(n("ok") / tot * 100) : 0}% · nos últimos 12 meses`, "verde", '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>')
    + card("velha", "Desatualizadas", n("velha"), "há mais de 12 meses", "ambar", '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/>')
    + card("nunca", "Nunca atualizadas", n("nunca"), "sem registro no sistema", "cinza", '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17h.01"/>');
  $$("#uc-cards [data-cad]").forEach(b => b.onclick = () => { UN.cad = UN.cad === b.dataset.cad ? "" : b.dataset.cad; renderUnCad(); });
  const sel = $("#uc-bloco"); sel.innerHTML = `<option value="">Todos os blocos</option>` + UN.blocos.map(b => `<option ${b === UN.bloco ? "selected" : ""}>${esc(b)}</option>`).join("");
  const vis = L.filter(u => (!UN.bloco || u.bloco === UN.bloco) && (!UN.cad || unCadSt(u) === UN.cad) && unBusca(u, UN.cq, "unidades"));
  box.innerHTML = `<div class="tablebox"><table><thead><tr><th>Bloco</th><th>Unidade</th><th>Proprietário</th><th>Atualização cadastral</th><th class="hide-s">Quando / quem</th><th></th></tr></thead><tbody>
    ${vis.length ? vis.map(u => `<tr><td>${esc(unBlocoCurto(u.bloco))}</td><td class="mono"><b>${esc(u.numero)}</b></td><td>${esc(u.proprietario || "—")}</td>
      <td><span class="pill ${unCadSt(u) === "ok" ? "s-ok" : unCadSt(u) === "velha" ? "s-baixo" : "p-ajuste"}">${UN_CAD_ROT[unCadSt(u)]}</span></td>
      <td class="hide-s">${u.cadastroEm ? `${fData(u.cadastroEm)} · ${esc(u.cadastroPor || "")}` : "—"}</td>
      <td class="un-acoes">${unPode() ? `<button type="button" class="btn small primary" data-un-ed="${esc(u.id)}">Atualizar</button>` : `<button type="button" class="btn small" data-un="${esc(u.id)}">Ver</button>`}<button type="button" class="btn small" data-un-pr="${esc(u.id)}">Imprimir</button></td></tr>`).join("")
      : `<tr><td colspan="6"><div class="empty">Nenhuma unidade com esses filtros.</div></td></tr>`}</tbody></table></div>`;
}
function unEditar(id){
  const u = (UN.lista || []).find(x => x.id === id); if (!u || !unPode()) return;
  UN.ed = JSON.parse(JSON.stringify(u)); UN.edCad = true;
  if (S.tab !== "uncadastro") setTab("uncadastro"); else renderUnCad();
  scrollTo({top:0});
}
function unEditor(){
  const u = UN.ed, box = $("#uc-editor");
  const pars = [...new Set((UN.lista || []).flatMap(x => x.pessoas.map(p => p.parentesco)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const vagas = [...new Set(UN_VAGAS.concat((UN.lista || []).flatMap(x => x.veiculos.map(v => v.vaga)).filter(Boolean)))].sort();
  const snSel = (k, i, v) => `<select class="input" data-pc="${k}" data-i="${i}" aria-label="${k}"><option value=""></option>${["Sim","Não"].map(x => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("")}</select>`;
  box.innerHTML = `
    <div class="ct-top"><button type="button" class="link" id="ue-voltar">← Atualização cadastral</button><h2 class="sec">Unidade ${esc(u.numero)} · Bloco ${esc(u.bloco)}</h2>
      <span class="ct-acoes"><button class="btn" type="button" id="ue-imprimir">Imprimir ficha</button><button class="btn primary" type="button" id="ue-salvar">Salvar</button></span></div>
    <p class="hint" id="ue-msg"></p>
    <div class="card ct-card"><h3>Unidade e proprietário</h3><div class="form">
      <div class="field"><label for="ue-sit">Situação</label><select class="input" id="ue-sit"><option value="">—</option>${UN_SIT.map(x => `<option ${x === u.situacao ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label for="ue-ocup">Ocupação</label><select class="input" id="ue-ocup">${UN_OCUP.map(x => `<option ${x === (u.ocupacao || "Vazia") ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field full"><label for="ue-prop">Proprietário</label><input class="input" id="ue-prop" value="${esc(u.proprietario || "")}" maxlength="200"></div>
      <div class="field"><label for="ue-cont">Contatos do proprietário</label><textarea class="input" id="ue-cont" rows="3" maxlength="600" placeholder="E-mail e telefones, um por linha">${esc(u.contatos || "")}</textarea></div>
      <div class="field"><label for="ue-ident">Identidades</label><textarea class="input" id="ue-ident" rows="3" maxlength="300">${esc(u.identidade || "")}</textarea></div>
      <div class="field full"><label for="ue-obs">Observação</label><textarea class="input" id="ue-obs" rows="2" maxlength="1000">${esc(u.obs || "")}</textarea></div>
    </div></div>
    <div class="card ct-card"><div class="ct-h"><h3>Moradores, residentes e autorizações de acesso</h3><button type="button" class="btn small" id="ue-add-p">+ Pessoa</button></div>
      <datalist id="ue-dl-par">${pars.map(p => `<option value="${esc(p)}">`).join("")}</datalist>
      <div class="un-linhas">${u.pessoas.map((p, i) => `<div class="un-linha un-lp"><label class="field"><span>Nome</span><input class="input" data-pc="nome" data-i="${i}" value="${esc(p.nome || "")}" maxlength="120"></label>
        <label class="field"><span>Parentesco / relação</span><input class="input" data-pc="parentesco" data-i="${i}" value="${esc(p.parentesco || "")}" list="ue-dl-par" maxlength="60"></label>
        <label class="field"><span>Morador?</span>${snSel("morador", i, p.morador)}</label><label class="field"><span>Facial</span>${snSel("facial", i, p.facial)}</label><label class="field"><span>Barco</span>${snSel("barco", i, p.barco)}</label>
        <label class="field un-larga"><span>Contatos</span><input class="input" data-pc="contatos" data-i="${i}" value="${esc(p.contatos || "")}" maxlength="300"></label>
        <button type="button" class="link danger un-x" data-rm="pessoas" data-i="${i}" aria-label="Tirar ${esc(p.nome || "esta pessoa")}">Tirar</button></div>`).join("") || `<p class="muted">Nenhuma pessoa. Use "+ Pessoa".</p>`}</div></div>
    <div class="os-grid">
      <div class="card ct-card"><div class="ct-h"><h3>Pets</h3><button type="button" class="btn small" id="ue-add-pet">+ Pet</button></div>
        <div class="un-linhas">${u.pets.map((p, i) => `<div class="un-linha"><label class="field un-larga"><span>Pet</span><input class="input" data-pt="descricao" data-i="${i}" value="${esc(p.descricao || "")}" maxlength="120" placeholder="Ex.: Cachorro (Mel)"></label><button type="button" class="link danger un-x" data-rm="pets" data-i="${i}">Tirar</button></div>`).join("") || `<p class="muted">Nenhum.</p>`}</div></div>
      <div class="card ct-card"><div class="ct-h"><h3>Veículos</h3><button type="button" class="btn small" id="ue-add-v">+ Veículo</button></div>
        <datalist id="ue-dl-vaga">${vagas.map(v => `<option value="${esc(v)}">`).join("")}</datalist>
        <div class="un-linhas">${u.veiculos.map((v, i) => `<div class="un-linha un-lv">${[["placa","Placa",10],["marca","Marca",40],["modelo","Modelo",60],["cor","Cor",30],["vaga","Vaga",10],["tag","TAG",40]].map(([k, rot, mx]) => `<label class="field"><span>${rot}</span><input class="input" data-vc="${k}" data-i="${i}" value="${esc(v[k] || "")}" maxlength="${mx}" ${k === "vaga" ? 'list="ue-dl-vaga"' : ""}></label>`).join("")}<button type="button" class="link danger un-x" data-rm="veiculos" data-i="${i}">Tirar</button></div>`).join("") || `<p class="muted">Nenhum.</p>`}</div></div>
    </div>
    <label class="perm un-conf"><input type="checkbox" id="ue-cad" ${UN.edCad ? "checked" : ""}> Cadastro conferido com o morador: registrar a <b>atualização cadastral</b> de hoje</label>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="ue-salvar2">Salvar</button><button class="btn" type="button" id="ue-cancelar">Cancelar</button></div>`;
  const ler = () => {
    u.situacao = $("#ue-sit").value; u.ocupacao = $("#ue-ocup").value; u.proprietario = $("#ue-prop").value.trim(); u.contatos = $("#ue-cont").value.trim();
    u.identidade = $("#ue-ident").value.trim(); u.obs = $("#ue-obs").value.trim(); UN.edCad = $("#ue-cad").checked;
    $$("#uc-editor [data-pc]").forEach(el => { u.pessoas[+el.dataset.i][el.dataset.pc] = el.value.trim(); });
    $$("#uc-editor [data-pt]").forEach(el => { u.pets[+el.dataset.i][el.dataset.pt] = el.value.trim(); });
    $$("#uc-editor [data-vc]").forEach(el => { u.veiculos[+el.dataset.i][el.dataset.vc] = el.value.trim(); });
  };
  const add = (k, obj) => { ler(); u[k].push(obj); unEditor(); const l = $$(`#uc-editor [data-i="${u[k].length - 1}"]`); if (l.length) l[0].focus(); };
  $("#ue-add-p").onclick = () => add("pessoas", {nome:"", parentesco:"", morador:"Sim", facial:"", barco:"", contatos:""});
  $("#ue-add-pet").onclick = () => add("pets", {descricao:""});
  $("#ue-add-v").onclick = () => add("veiculos", {placa:"", marca:"", modelo:"", cor:"", vaga:"", tag:""});
  $$("#uc-editor [data-rm]").forEach(b => b.onclick = () => { ler(); u[b.dataset.rm].splice(+b.dataset.i, 1); unEditor(); });
  const sair = () => { UN.ed = null; renderUnCad(); scrollTo({top:0}); };
  $("#ue-voltar").onclick = sair; $("#ue-cancelar").onclick = sair;
  $("#ue-imprimir").onclick = () => { ler(); unImprimir(u); };
  const salvar = async btn => {
    ler();
    const msg = $("#ue-msg");
    const semNome = u.pessoas.findIndex(p => !p.nome);
    if (semNome >= 0) { msg.className = "hint err"; msg.textContent = `Preencha o nome da pessoa ${semNome + 1} ou tire a linha.`; return; }
    const r = await enviar(btn, msg, "unSalvar", {unidade:u, cadastro:UN.edCad});
    if (r) { UN.ed = null; $("#uc-editor").innerHTML = ""; await carregarUnidades(true); scrollTo({top:0}); }
  };
  $("#ue-salvar").onclick = ev => salvar(ev.target); $("#ue-salvar2").onclick = ev => salvar(ev.target);
}
// ficha da unidade para o morador conferir, corrigir e assinar (impressão / PDF)
function unImprimir(u){
  registrarTela("imprimir_unidade", `${unBlocoCurto(u.bloco)}-${u.numero}`);
  const v = x => esc(x || ""), vazias = (n, cols) => Array.from({length:n}, () => `<tr>${"<td>&nbsp;</td>".repeat(cols)}</tr>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha cadastral - Unidade ${v(u.numero)} - Bloco ${v(unBlocoCurto(u.bloco))}</title><style>
    @page{size:A4;margin:12mm} body{font:11px Calibri,Arial,sans-serif;color:#1f2a37;margin:0}
    h1{font-size:16px;margin:0} .cab{border-bottom:3px solid #1f3a56;padding-bottom:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end}
    h2{font-size:12px;background:#1f3a56;color:#fff;padding:4px 6px;margin:12px 0 4px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #9fb0c2;padding:4px 5px;text-align:left;vertical-align:top}
    th{background:#eef3f7;font-size:10px} td{height:16px} .k{width:28%;background:#eef3f7;font-weight:bold} .assin{margin-top:28px;display:flex;gap:30px} .assin div{flex:1;border-top:1px solid #1f2a37;padding-top:3px;text-align:center}
    .nota{font-size:10px;color:#455}
  </style></head><body>
    <div class="cab"><div><h1>PIER RESIDÊNCIAS — FICHA DE ATUALIZAÇÃO CADASTRAL</h1><div>Bloco ${v(u.bloco)} · Unidade <b>${v(u.numero)}</b></div></div><div class="nota">Impresso em ${fData(hoje())}${u.cadastroEm ? `<br>Última atualização: ${fData(u.cadastroEm)}` : ""}</div></div>
    <p class="nota">Confira os dados abaixo. Corrija à caneta o que estiver errado, complete as linhas em branco e devolva assinada à Administração.</p>
    <h2>Unidade e proprietário</h2><table>
      <tr><td class="k">Situação</td><td>${v(u.situacao)} &nbsp; ( ) Proprietário &nbsp; ( ) Alugado</td></tr>
      <tr><td class="k">Proprietário</td><td>${v(u.proprietario)}</td></tr>
      <tr><td class="k">Contatos (e-mail e telefone)</td><td>${v(u.contatos).replace(/\n/g, "<br>")}</td></tr>
      <tr><td class="k">Identidades</td><td>${v(u.identidade).replace(/\n/g, "<br>")}</td></tr></table>
    <h2>Moradores, residentes e autorizações de acesso</h2><table><tr><th>Nome</th><th>Parentesco / relação</th><th>Morador?</th><th>Cadastro facial</th><th>Acesso barco?</th><th>Contatos</th></tr>
      ${u.pessoas.map(p => `<tr><td>${v(p.nome)}</td><td>${v(p.parentesco)}</td><td>${v(p.morador)}</td><td>${v(p.facial)}</td><td>${v(p.barco)}</td><td>${v(p.contatos)}</td></tr>`).join("")}${vazias(4, 6)}</table>
    <h2>Pets</h2><table><tr><th>Pet (espécie, nome, porte)</th></tr>${u.pets.map(p => `<tr><td>${v(p.descricao)}</td></tr>`).join("")}${vazias(2, 1)}</table>
    <h2>Veículos</h2><table><tr><th>Vaga</th><th>Marca</th><th>Modelo</th><th>Cor</th><th>TAG?</th><th>Placa</th></tr>${u.veiculos.map(x => `<tr><td>${v(x.vaga)}</td><td>${v(x.marca)}</td><td>${v(x.modelo)}</td><td>${v(x.cor)}</td><td>${v(x.tag)}</td><td>${v(x.placa)}</td></tr>`).join("")}${vazias(2, 6)}</table>
    <h2>Correções e observações</h2><table>${vazias(4, 1)}</table>
    <p class="nota">Declaro que as informações acima estão corretas e atualizadas. Os dados são de uso interno da Administração do condomínio.</p>
    <div class="assin"><div>Assinatura do proprietário / responsável</div><div>Data</div><div>Recebido pela Administração</div></div>
  </body></html>`;
  let fr = $("#un-print-frame"); if (fr) fr.remove();
  fr = document.createElement("iframe"); fr.id = "un-print-frame"; fr.setAttribute("aria-hidden", "true");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  fr.contentDocument.open(); fr.contentDocument.write(html); fr.contentDocument.close();
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch(e){ toast("Não foi possível abrir a impressão.", true); } }, 100);
  return html;
}
// ---- Configurações: blocos, andares e unidades ----
function cfDe(){
  const porB = new Map(UN.blocos.map(b => [b, []]));
  (UN.lista || []).forEach(u => { if (!porB.has(u.bloco)) porB.set(u.bloco, []); porB.get(u.bloco).push({id:u.id, numero:String(u.numero), andar:String(u.andar || ""), cad:unTemCadastro(u)}); });
  return { blocos:[...porB].map(([nome, unidades]) => ({nome, unidades, andaresExtra:[]})), sel:0, sujo:false, editando:-1 };
}
const cfAndarDe = n => String(Math.floor((Number(n) || 0) / 100) || "");
function renderUnConfig(){
  const sec = $("#t-unconfig"); if (!sec || sec.hidden) return;
  const box = $("#cf-corpo"); if (unCarregando(box)) return;
  if (!CF) CF = cfDe();
  $("#cf-salvar").disabled = !CF.sujo;
  const B = CF.blocos, b = B[CF.sel];
  const andares = b ? [...new Set(b.unidades.map(u => u.andar || cfAndarDe(u.numero)).concat(b.andaresExtra))].sort((x, y) => Number(x) - Number(y)) : [];
  box.innerHTML = `<div class="cf-grid">
    <section class="panel cf-blocos"><div class="ct-h"><h3>Blocos</h3><button type="button" class="btn small" id="cf-add-b" aria-label="Adicionar bloco">+</button></div>
      <ul>${B.map((x, i) => `<li class="${i === CF.sel ? "sel" : ""}">${CF.editando === i ? `<input class="input" id="cf-ren" value="${esc(x.nome)}" maxlength="60" aria-label="Nome do bloco"><button type="button" class="btn small" id="cf-ren-ok">OK</button>`
        : `<button type="button" class="cf-b" data-b="${i}">${esc(x.nome)}<small>${x.unidades.length} unidade${x.unidades.length === 1 ? "" : "s"}</small></button><button type="button" class="link" data-ren="${i}" aria-label="Renomear ${esc(x.nome)}">✎</button><button type="button" class="link danger" data-del-b="${i}" aria-label="Excluir ${esc(x.nome)}">🗑</button>`}</li>`).join("") || `<li class="muted">Nenhum bloco.</li>`}</ul></section>
    <section class="panel cf-unid">${b ? `<h3>${esc(b.nome)}</h3><button type="button" class="btn small" id="cf-add-a">+ Adicionar andar</button>
      <div class="cf-andares">${andares.map(a => { const us = b.unidades.filter(u => (u.andar || cfAndarDe(u.numero)) === a).sort((x, y) => (Number(x.numero) || 0) - (Number(y.numero) || 0));
        return `<div class="cf-andar"><div class="ct-h"><b>${a === "0" ? "Térreo" : esc(a) + "º andar"}</b><span><button type="button" class="btn small" data-add-u="${esc(a)}">+ Unidade</button><button type="button" class="link danger" data-del-a="${esc(a)}" aria-label="Excluir o ${esc(a)}º andar">🗑</button></span></div>
          <div class="cf-chips">${us.map(u => `<span class="cf-chip ${u.cad ? "cad" : ""}" title="${u.cad ? "Unidade com cadastro" : ""}">${esc(u.numero)}<button type="button" data-del-u="${esc(u.numero)}" aria-label="Tirar a unidade ${esc(u.numero)}">×</button></span>`).join("") || `<span class="muted">Nenhuma unidade neste andar.</span>`}
          ${CF.novoAndar === a ? `<span class="cf-nova"><input class="input" id="cf-nu" inputmode="numeric" maxlength="12" placeholder="Nº" aria-label="Número da unidade"><button type="button" class="btn small" id="cf-nu-ok">OK</button></span>` : ""}</div></div>`; }).join("") || `<p class="muted">Nenhum andar. Use "+ Adicionar andar".</p>`}</div>`
      : `<p class="muted">Crie um bloco com o "+" ao lado.</p>`}</section></div>`;
  const mexeu = () => { CF.sujo = true; renderUnConfig(); };
  $$("#cf-corpo [data-b]").forEach(x => x.onclick = () => { CF.sel = +x.dataset.b; CF.novoAndar = null; renderUnConfig(); });
  $("#cf-add-b").onclick = () => { const n = B.length + 1; B.push({nome:`${n}`, unidades:[], andaresExtra:[]}); CF.sel = B.length - 1; CF.editando = B.length - 1; mexeu(); const r = $("#cf-ren"); if (r) { r.focus(); r.select(); } };
  $$("#cf-corpo [data-ren]").forEach(x => x.onclick = () => { CF.editando = +x.dataset.ren; renderUnConfig(); $("#cf-ren").focus(); });
  if ($("#cf-ren")) { const ok = () => { const v = $("#cf-ren").value.trim(); if (!v) { toast("Dê um nome ao bloco.", true); return; } if (B.some((x, i) => i !== CF.editando && norm(x.nome) === norm(v))) { toast("Já existe um bloco com esse nome.", true); return; } B[CF.editando].nome = v; CF.editando = -1; mexeu(); };
    $("#cf-ren-ok").onclick = ok; $("#cf-ren").onkeydown = e => { if (e.key === "Enter") ok(); if (e.key === "Escape") { CF.editando = -1; renderUnConfig(); } }; }
  $$("#cf-corpo [data-del-b]").forEach(x => x.onclick = () => { const i = +x.dataset.delB; if (B[i].unidades.some(u => u.cad)) { toast("Este bloco tem unidades com cadastro. Limpe o cadastro delas antes de excluir o bloco.", true); return; }
    if (!x.dataset.conf) { x.dataset.conf = "1"; x.textContent = "excluir?"; return; } B.splice(i, 1); CF.sel = Math.max(0, Math.min(CF.sel, B.length - 1)); mexeu(); });
  if (!b) return;
  $("#cf-add-a").onclick = () => { const atuais = andares.map(Number); const prox = String(atuais.length ? Math.max(...atuais) + 1 : 1); b.andaresExtra.push(prox); CF.novoAndar = prox; mexeu(); const i = $("#cf-nu"); if (i) { i.value = String(Number(prox) * 100 + 1); i.focus(); i.select(); } };
  $$("#cf-corpo [data-add-u]").forEach(x => x.onclick = () => { const a = x.dataset.addU; CF.novoAndar = a; renderUnConfig(); const us = b.unidades.filter(u => (u.andar || cfAndarDe(u.numero)) === a).map(u => Number(u.numero) || 0); const i = $("#cf-nu"); i.value = String(us.length ? Math.max(...us) + 1 : Number(a) * 100 + 1); i.focus(); i.select(); });
  if ($("#cf-nu")) { const ok = () => { const n = $("#cf-nu").value.trim(); if (!n) return; if (b.unidades.some(u => u.numero === n)) { toast(`A unidade ${n} já existe neste bloco.`, true); return; } b.unidades.push({id:"", numero:n, andar:CF.novoAndar, cad:false}); CF.novoAndar = null; mexeu(); };
    $("#cf-nu-ok").onclick = ok; $("#cf-nu").onkeydown = e => { if (e.key === "Enter") ok(); if (e.key === "Escape") { CF.novoAndar = null; renderUnConfig(); } }; }
  $$("#cf-corpo [data-del-u]").forEach(x => x.onclick = () => { const i = b.unidades.findIndex(u => u.numero === x.dataset.delU); if (i < 0) return; if (b.unidades[i].cad) { toast(`A unidade ${b.unidades[i].numero} tem cadastro (proprietário, pessoas, pets ou veículos). Limpe o cadastro antes de tirar.`, true); return; } b.unidades.splice(i, 1); mexeu(); });
  $$("#cf-corpo [data-del-a]").forEach(x => x.onclick = () => { const a = x.dataset.delA, us = b.unidades.filter(u => (u.andar || cfAndarDe(u.numero)) === a);
    if (us.some(u => u.cad)) { toast("Este andar tem unidades com cadastro. Limpe o cadastro delas antes.", true); return; }
    b.unidades = b.unidades.filter(u => (u.andar || cfAndarDe(u.numero)) !== a); b.andaresExtra = b.andaresExtra.filter(z => z !== a); mexeu(); });
}
async function cfSalvar(btn){
  if (!CF || !CF.sujo) return;
  const r = await enviar(btn, $("#cf-msg"), "unConfig", {blocos: CF.blocos.map(b => ({nome:b.nome, unidades:b.unidades.map(u => ({id:u.id, numero:u.numero, andar:u.andar || cfAndarDe(u.numero)}))}))});
  $("#cf-msg").textContent = r ? "" : $("#cf-msg").textContent;
  if (r) { CF = null; await carregarUnidades(true); }
}
// importação da planilha de cadastro no modelo do Pier (aba com BLOCO / APTº / PROPRIETÁRIO / ... / VEÍCULOS)
async function unImportar(file){
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { toast("Escolha a planilha de cadastro em .xlsx.", true); return; }
  let abas;
  try {
    const buf = await file.arrayBuffer();
    try { abas = await xlsxLer(buf); }
    catch(e){ if (!e || !e.semLeitor) throw e; await carregarXLSX(); const wb = XLSX.read(buf, {type:"array"}); abas = wb.SheetNames.map(n => ({nome:n, folha:xlsxFolhaSheetJS(wb.Sheets[n])})); }
  } catch(e){ toast(e.message || "Não foi possível ler a planilha.", true); return; }
  let achou = null;
  for (const a of abas) { const r = unLerCadastro(a.folha); if (r && r.unidades.length && (!achou || r.unidades.length > achou.unidades.length)) achou = Object.assign(r, {aba:a.nome}); }
  if (!achou) { toast('Não encontrei a aba de cadastro (com as colunas BLOCO, APTº, PROPRIETÁRIO e CADASTROS DA UNIDADE).', true); return; }
  const U = achou.unidades, np = U.reduce((s, u) => s + u.pessoas.length, 0), nm = U.reduce((s, u) => s + u.pessoas.filter(p => p.morador === "Sim").length, 0);
  const npet = U.reduce((s, u) => s + u.pets.length, 0), nv = U.reduce((s, u) => s + u.veiculos.length, 0), blocos = [...new Set(U.map(u => u.bloco))];
  const atual = (UN.lista || []).length;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar a planilha de cadastro</h3>
    <p>Aba <b>${esc(achou.aba)}</b>: <b>${U.length}</b> unidades em <b>${blocos.length}</b> blocos, <b>${np}</b> pessoas (${nm} moradores), <b>${npet}</b> pets e <b>${nv}</b> veículos.</p>
    <div class="tablebox flat"><table><thead><tr><th>Bloco</th><th class="num">Unidades</th><th class="num">Pessoas</th><th class="num">Pets</th><th class="num">Veículos</th></tr></thead><tbody>
      ${blocos.map(b => { const l = U.filter(u => u.bloco === b); return `<tr><td>${esc(b)}</td><td class="num">${l.length}</td><td class="num">${l.reduce((s, u) => s + u.pessoas.length, 0)}</td><td class="num">${l.reduce((s, u) => s + u.pets.length, 0)}</td><td class="num">${l.reduce((s, u) => s + u.veiculos.length, 0)}</td></tr>`; }).join("")}</tbody></table></div>
    ${achou.avisos.length ? `<p class="hint err">${achou.avisos.slice(0, 5).map(esc).join("<br>")}${achou.avisos.length > 5 ? `<br>+ ${achou.avisos.length - 5} aviso(s)` : ""}</p>` : ""}
    <div class="notice warn">${atual ? `Isto <b>substitui o cadastro atual</b> (${atual} unidades) pelo da planilha. As unidades que já existiam mantêm a data da atualização cadastral e a marcação "Em obra".` : "O cadastro vai ser criado a partir da planilha."} A ocupação começa como <b>Ocupada</b> nas unidades com morador e <b>Vazia</b> nas outras.</div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="ui-ok">${atual ? "Substituir o cadastro" : "Importar"}</button><button class="btn" type="button" id="ui-no">Cancelar</button><span class="hint" id="ui-msg"></span></div>`;
  $("#modal").hidden = false; $("#ui-no").onclick = fecharModal;
  $("#ui-ok").onclick = () => enviar($("#ui-ok"), $("#ui-msg"), "unImportar", {unidades:U}, async () => { fecharModal(); CF = null; await carregarUnidades(true); });
}
function unLerCadastro(F){
  if (!F) return null;
  const t = (r, c) => { const v = F.val(r, c); return v === undefined || v === null ? "" : String(typeof v === "number" ? (Number.isInteger(v) ? v : v) : v).trim(); };
  const n = s => norm(s).replace(/\s+/g, " ").trim();
  let rc = -1, col = {};
  for (let r = F.r0; r <= Math.min(F.r1, F.r0 + 20) && rc < 0; r++) {
    const m = {};
    for (let c = F.c0; c <= F.c1; c++) {
      const h = n(t(r, c)); if (!h) continue;
      if (h === "bloco") m.bloco = c; else if (/^apt/.test(h)) m.apto = c; else if (/^proprietari/.test(h)) m.prop = c;
      else if (/^contatos \(e-?mail/.test(h)) m.contProp = c; else if (/^identidade/.test(h)) m.ident = c; else if (/^situacao/.test(h)) m.sit = c;
      else if (/^cadastros da unidade/.test(h)) m.nome = c; else if (/^parentesco/.test(h)) m.par = c; else if (/^morador/.test(h)) m.mor = c;
      else if (/^cadastro facial/.test(h)) m.fac = c; else if (/^acesso barco/.test(h)) m.bar = c; else if (h === "contatos") m.cont = c; else if (/^pets?$/.test(h)) m.pet = c;
    }
    if ("bloco" in m && "apto" in m && "nome" in m) { rc = r; col = m; }
  }
  if (rc < 0) return null;
  // subtítulos dos veículos (linha de baixo)
  let r0 = rc + 1;
  for (let c = F.c0; c <= F.c1; c++) { const h = n(t(rc + 1, c)); if (h === "vaga") col.vaga = c; else if (h === "marca") col.marca = c; else if (h === "modelo") col.modelo = c; else if (h === "cor") col.cor = c; else if (/^tag/.test(h)) col.tag = c; else if (h === "placa") col.placa = c; }
  if ("vaga" in col || "placa" in col) r0 = rc + 2;
  const g = (r, k) => k in col ? t(r, col[k]) : "";
  const sn = s => { const x = n(s); return !x ? "" : /^s/.test(x) ? "Sim" : /^n/.test(x) ? "Não" : ""; };
  const unidades = [], avisos = []; let blocoAtual = "", u = null;
  for (let r = r0; r <= F.r1; r++) {
    const b = g(r, "bloco"), ap = g(r, "apto");
    if (b) blocoAtual = b;
    if (ap) {
      if (!blocoAtual) { avisos.push(`Linha ${r + 1}: unidade ${ap} sem bloco (ignorada).`); u = null; continue; }
      const numero = String(ap).replace(/\.0+$/, "");
      if (unidades.some(x => x.bloco === blocoAtual && x.numero === numero)) avisos.push(`Linha ${r + 1}: a unidade ${numero} do bloco ${blocoAtual} aparece de novo (juntei os dados).`);
      u = unidades.find(x => x.bloco === blocoAtual && x.numero === numero);
      if (!u) { u = {bloco:blocoAtual, numero, andar:cfAndarDe(numero), situacao:"", proprietario:"", contatos:"", identidade:"", pessoas:[], pets:[], veiculos:[]}; unidades.push(u); }
    }
    if (!u) continue;
    const prop = g(r, "prop"); if (prop && !u.proprietario.split(" / ").includes(prop)) u.proprietario = u.proprietario ? u.proprietario + " / " + prop : prop;
    const cp = g(r, "contProp"); if (cp) u.contatos = u.contatos ? u.contatos + "\n" + cp : cp;
    const id = g(r, "ident"); if (id) u.identidade = u.identidade ? u.identidade + "\n" + id : id;
    const st = n(g(r, "sit")); if (st && !u.situacao) u.situacao = /alug/.test(st) ? "Alugado" : /propriet/.test(st) ? "Proprietário" : "";
    const nome = g(r, "nome"), cont = g(r, "cont");
    if (nome) u.pessoas.push({nome, parentesco:g(r, "par"), morador:sn(g(r, "mor")), facial:sn(g(r, "fac")), barco:sn(g(r, "bar")), contatos:cont});
    else if (cont && u.pessoas.length) { const p = u.pessoas[u.pessoas.length - 1]; p.contatos = p.contatos ? p.contatos + " / " + cont : cont; }
    const pet = g(r, "pet"); if (pet) u.pets.push({descricao:pet});
    const vc = {vaga:g(r, "vaga"), marca:g(r, "marca"), modelo:g(r, "modelo"), cor:g(r, "cor"), tag:g(r, "tag"), placa:g(r, "placa")};
    if (vc.placa || vc.marca || vc.modelo || vc.vaga) u.veiculos.push(vc);
  }
  return {unidades, avisos};
}
if ($("#t-unidades")) {
  $("#ul-vistas").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b) { UN.vista = b.dataset.v; renderUnLista(); } });
  $("#ul-q").addEventListener("input", ev => { UN.q = ev.target.value; renderUnLista(); });
  $("#ul-bloco").addEventListener("change", ev => { UN.bloco = ev.target.value; renderUnLista(); });
  $("#ul-exportar").addEventListener("click", unExportar);
  $("#uc-q").addEventListener("input", ev => { UN.cq = ev.target.value; renderUnCad(); });
  $("#uc-bloco").addEventListener("change", ev => { UN.bloco = ev.target.value; renderUnCad(); });
  $("#cf-salvar").addEventListener("click", ev => cfSalvar(ev.target));
  $("#cf-importar").addEventListener("click", () => $("#cf-arq").click());
  $("#cf-arq").addEventListener("change", ev => { const f = ev.target.files[0]; ev.target.value = ""; unImportar(f); });
  $("#cf-ocupadas").addEventListener("click", ev => enviar(ev.target, $("#cf-msg"), "unOcupadas", {}, async () => { $("#cf-msg").textContent = ""; CF = null; await carregarUnidades(true); }));
  document.addEventListener("click", ev => {
    const a = ev.target.closest("[data-un]"); if (a && a.closest("#t-unidades, #t-uncadastro")) { unFicha(a.dataset.un); return; }
    const e = ev.target.closest("[data-un-ed]"); if (e) { unEditar(e.dataset.unEd); return; }
    const p = ev.target.closest("[data-un-pr]"); if (p) { const u = (UN.lista || []).find(x => x.id === p.dataset.unPr); if (u) unImprimir(u); }
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.un && ev.target.tagName === "TR") unFicha(ev.target.dataset.un); });
}

// ---------- central de medições: água, energia e gás (só no setor Administração) ----------
// Sinalizar consumo (leituras do relógio e contas mensais), Meus medidores e Relatórios.
// Consumo = diferença entre duas leituras do mesmo medidor. Quando passam dias sem leitura, o consumo é dividido igualmente
// entre esses dias e fica no dia de cada leitura (a leitura de hoje mostra o que foi gasto desde a anterior).
const MD = { d:null, carregando:false, erro:"", em:0, cache:new Map(), vista:"dia", fMed:"", fPer:"30", rPer:"30", rTipo:"dia", rVis:{}, rSel:{} };
const MD_TIPOS = ["Água","Energia","Gás"], MD_UNID = ["m³","kWh","Litros"];
const MD_INFO = {
  "Água": {cor:"azul", un:"m³", ico:'<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>'},
  "Energia": {cor:"ambar", un:"kWh", ico:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>'},
  "Gás": {cor:"laranja", un:"m³", ico:'<path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8-1 2-2 3-3.5 3.5C11 8 10 5 8.5 3.5 8 7 6 9.5 6 15a6 6 0 0 0 6 6z"/>'}
};
const MD_CORES = ["#2563eb","#10b981","#f59e0b","#8b5cf6","#ef4444","#0d9488","#db2777","#64748b"];
const MD_PER = [["7","Últimos 7 dias"],["30","Últimos 30 dias"],["90","Últimos 90 dias"],["mes","Este mês"],["mesant","Mês passado"],["12m","Últimos 12 meses"],["ano","Este ano"]];
const mdIco = (tipo, cls) => `<span class="pp-ico ${(MD_INFO[tipo] || MD_INFO["Água"]).cor} ${cls || ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${(MD_INFO[tipo] || MD_INFO["Água"]).ico}</svg></span>`;
const mdLancar = () => can("med_lancar");
const mdMed = id => ((MD.d && MD.d.medidores) || []).find(m => m.id === id);
// número digitado no padrão brasileiro: "1.420" = mil quatrocentos e vinte; "1.050,5" e "1050,5" = mil e cinquenta e meio
const mdNum = v => { if (typeof v === "number") return v; const s = String(v ?? "").trim().replace(/\s/g, "").replace(/^R\$/i, ""); if (!s) return NaN; return Number(s.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s); };
const mdF = (n, d) => n === null || n === undefined || isNaN(n) ? "—" : Number(n).toLocaleString("pt-BR", {minimumFractionDigits:d ?? 0, maximumFractionDigits:d ?? 2});
const mdDiasEntre = (a, b) => Math.round((Date.parse(b + "T12:00:00") - Date.parse(a + "T12:00:00")) / 864e5);
const mdSomaDia = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return iso(x); };
const mdOrdem = l => l.slice().sort((a, b) => MD_TIPOS.indexOf(a.tipo) - MD_TIPOS.indexOf(b.tipo) || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
const mdRotMes = ym => { const [a, m] = String(ym).split("-"); return (PP_MESES[+m - 1] || m) + "/" + a; };
const mdNoves = m => "9".repeat(Number(m.casas) || 5);
function mdLimpar(){ MD.d = null; MD.erro = ""; MD.cache = new Map(); MD.rSel = {}; }
function mdAplicar(r){
  if (!r || !Array.isArray(r.medidores)) return false;
  MD.d = {medidores:r.medidores, leituras:(r.leituras || []).map(l => Object.assign({}, l, {leitura:Number(l.leitura)})), contas:r.contas || []};
  MD.em = Date.now(); MD.cache = new Map(); return true;
}
async function carregarMed(forcar){
  if (!TEM_ADM || !S.token || MD.carregando) return;
  if (!["medlanc","medidores","medrel"].some(podeAba)) return;
  if (!forcar && MD.d && Date.now() - MD.em < 60000) { renderMedTudo(); return; }
  MD.carregando = true;
  try { const r = await api("medicoes"); mdAplicar(r); MD.erro = ""; }
  catch(e){ MD.erro = e.message; toast(e.message, true); }
  finally { MD.carregando = false; renderMedTudo(); }
}
function renderMedTudo(){ renderMedLanc(); renderMedidores(); renderMedRel(); }
const mdAviso = () => /desconhecida/i.test(MD.erro) ? " A Central de medições precisa do Apps Script novo (colar o código e implantar uma nova versão)." : "";
function mdCarregando(box){
  if (MD.erro && !MD.d) { box.innerHTML = `<div class="notice crit">${esc(MD.erro)}${mdAviso()}</div>`; return true; }
  if (!MD.d) { box.innerHTML = `<div class="empty"><span class="spin" aria-hidden="true"></span> Carregando as medições…</div>`; return true; }
  return false;
}
// intervalos entre leituras de um medidor: {de, ate, dias, consumo, leitura}
function mdInt(m){
  const k = "i|" + m.id; if (MD.cache.has(k)) return MD.cache.get(k);
  const ls = MD.d.leituras.filter(l => l.medidor === m.id).sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
  const lim = Math.pow(10, Number(m.casas) || 0), out = [];
  for (let i = 1; i < ls.length; i++) {
    const a = ls[i - 1], b = ls[i]; let c = b.leitura - a.leitura;
    if (b.virada === "Sim" || c < 0) c += lim;
    out.push({de:a.data, ate:b.data, dias:Math.max(1, mdDiasEntre(a.data, b.data)), consumo:Math.round(c * 1000) / 1000, leitura:b});
  }
  const r = {ls, out}; MD.cache.set(k, r); return r;
}
// consumo de cada dia (rateado entre os dias sem leitura)
function mdDiario(m){
  const k = "d|" + m.id; if (MD.cache.has(k)) return MD.cache.get(k);
  const mp = new Map();
  mdInt(m).out.forEach(iv => { const per = iv.consumo / iv.dias; for (let j = 1; j <= iv.dias; j++) { const d = mdSomaDia(iv.de, j); mp.set(d, (mp.get(d) || 0) + per); } });
  MD.cache.set(k, mp); return mp;
}
function mdPref(m){
  const k = "p|" + m.id; if (MD.cache.has(k)) return MD.cache.get(k);
  const dias = [...mdDiario(m).keys()].sort(), cum = [0]; dias.forEach((d, i) => cum.push(cum[i] + mdDiario(m).get(d)));
  const r = {dias, cum}; MD.cache.set(k, r); return r;
}
const mdBusca = (l, x) => { let a = 0, b = l.length; while (a < b) { const h = (a + b) >> 1; if (l[h] < x) a = h + 1; else b = h; } return a; };
// soma do consumo dos dias de "de" a "ate" (inclusive) e quantos dias têm consumo calculado
const mdSomaFaixa = (m, de, ate) => { const P = mdPref(m), i = mdBusca(P.dias, de), j = mdBusca(P.dias, ate + "~"); return {s:j > i ? P.cum[j] - P.cum[i] : 0, n:Math.max(0, j - i)}; };
// ciclo da concessionária: começa no dia seguinte à última leitura marcada como "da concessionária" (as linhas verdes da planilha)
const mdCicloIni = (m, antesDe) => { const l = MD.d.leituras.filter(x => x.medidor === m.id && x.ciclo === "Sim" && x.data < antesDe).map(x => x.data).sort(); return l.length ? l[l.length - 1] : ""; };
const mdAcumCiclo = (m, ate) => { const ini = mdCicloIni(m, ate); return ini ? Object.assign(mdSomaFaixa(m, mdSomaDia(ini, 1), ate), {ini}) : null; };
const mdTemCiclo = m => MD.d.leituras.some(x => x.medidor === m.id && x.ciclo === "Sim");
const mdLim = m => m && m.limite !== "" && m.limite !== undefined && Number(m.limite) > 0 ? Number(m.limite) : 0;
const mdDiasAcima = (m, de, ate) => { const lim = mdLim(m); if (!lim) return 0; let n = 0; for (const [d, v] of mdDiario(m)) if (d >= de && d <= ate && v > lim + 1e-9) n++; return n; };
const mdMediaDia = (m, ate) => { const f = mdSomaFaixa(m, mdSomaDia(ate, -29), ate); return f.n ? f.s / f.n : 0; };
function mdPeriodo(k){
  const h = hoje(), d = new Date(h + "T12:00:00"), rot = (MD_PER.find(p => p[0] === k) || MD_PER[1])[1];
  if (/^\d+$/.test(k)) return {de:mdSomaDia(h, -(Number(k) - 1)), ate:h, rot};
  if (k === "mes") return {de:h.slice(0, 8) + "01", ate:h, rot};
  if (k === "mesant") return {de:iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), ate:iso(new Date(d.getFullYear(), d.getMonth(), 0)), rot};
  if (k === "12m") return {de:iso(new Date(d.getFullYear(), d.getMonth() - 11, 1)), ate:h, rot};
  if (k === "ano") return {de:h.slice(0, 4) + "-01-01", ate:h, rot};
  return mdPeriodo("30");
}
const mdDias = (de, ate) => { const o = []; for (let x = de; x <= ate && o.length < 4000; x = mdSomaDia(x, 1)) o.push(x); return o; };
const mdMeses = (de, ate) => { const o = []; let [y, m] = de.slice(0, 7).split("-").map(Number); const fim = ate.slice(0, 7); for (let i = 0; i < 240; i++) { const s = y + "-" + String(m).padStart(2, "0"); o.push(s); if (s >= fim) break; if (++m > 12) { m = 1; y++; } } return o; };
// unidade do relatório de um tipo: a dos medidores; litros viram m³ quando há os dois
function mdUnidade(meds, tipo){ const us = [...new Set(meds.map(m => m.unidade))]; return us.length === 1 ? us[0] : us.includes("m³") ? "m³" : us[0] || (MD_INFO[tipo] || {}).un || ""; }
const mdFator = (m, un) => m.unidade === un ? 1 : m.unidade === "Litros" && un === "m³" ? 1 / 1000 : m.unidade === "m³" && un === "Litros" ? 1000 : 1;
const mdMesSel = (m, ym) => mdSomaFaixa(m, ym + "-01", ym + "-31");

// ---- Sinalizar consumo ----
function renderMedLanc(){
  const sec = $("#t-medlanc"); if (!sec || sec.hidden) return;
  $$("#ml-vistas [data-v]").forEach(b => b.setAttribute("aria-selected", b.dataset.v === MD.vista ? "true" : "false"));
  ["#ml-novo","#ml-importar","#ml-modelo"].forEach(s => { $(s).hidden = !mdLancar(); });
  $("#ml-modelo").textContent = MD.vista === "mes" ? "Baixar modelo" : "Baixar planilha de controle";
  const box = $("#ml-corpo"); if (mdCarregando(box)) { $("#ml-conta").textContent = ""; return; }
  const meds = mdOrdem(MD.d.medidores);
  $("#ml-med").innerHTML = `<option value="">Todos</option>` + meds.map(m => `<option value="${esc(m.id)}" ${m.id === MD.fMed ? "selected" : ""}>${esc(m.tipo)} · ${esc(m.nome)}${m.ativo === "Não" ? " (inativo)" : ""}</option>`).join("");
  $("#ml-per").value = MD.fPer;
  if (!meds.length) { box.innerHTML = `<div class="empty">Nenhum medidor cadastrado. Cadastre em <b>Meus medidores</b> antes de lançar.</div>`; $("#ml-conta").textContent = ""; return; }
  const desde = MD.fPer === "todos" ? "" : mdSomaDia(hoje(), -(Number(MD.fPer) - 1));
  const acoes = (tipo, id) => mdLancar() ? `<td class="md-ac"><button type="button" class="md-ib" data-ml-ed="${tipo}:${esc(id)}" title="Corrigir" aria-label="Corrigir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg></button><button type="button" class="md-ib del" data-ml-del="${tipo}:${esc(id)}" title="Excluir" aria-label="Excluir"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/></svg></button></td>` : "";
  const thA = mdLancar() ? `<th>Ações</th>` : "";
  if (MD.vista === "dia") {
    const info = new Map(); meds.forEach(m => mdInt(m).out.forEach(iv => info.set(iv.leitura.id, iv)));
    const l = MD.d.leituras.filter(x => (!MD.fMed || x.medidor === MD.fMed) && (!desde || x.data >= desde)).sort((a, b) => b.data.localeCompare(a.data) || String(b.registradoEm || "").localeCompare(String(a.registradoEm || "")));
    $("#ml-conta").textContent = `${l.length} lançamento${l.length === 1 ? "" : "s"}`;
    // leitura anterior de cada leitura (mesmo medidor)
    const ant = new Map(); meds.forEach(m => { const ls = mdInt(m).ls; for (let i = 1; i < ls.length; i++) ant.set(ls[i].id, ls[i - 1]); });
    const st = (cls, txt, tit) => `<span class="md-st ${cls}"${tit ? ` title="${esc(tit)}"` : ""}>${txt}</span>`;
    box.innerHTML = `<div class="tablebox md-hist"><table><thead><tr><th>Data</th><th>Medidor</th><th class="hide-s">Tipo</th><th class="num">Leitura atual</th><th class="num hide-s">Leitura anterior</th><th class="num">Consumo</th><th>Status</th>${thA}</tr></thead><tbody>
      ${l.length ? l.map(x => { const m = mdMed(x.medidor) || {nome:"medidor excluído", tipo:"", unidade:""}, iv = info.get(x.id), a = ant.get(x.id), lim = mdLim(m);
        const dia = iv ? iv.consumo / iv.dias : 0, med = iv && m.id ? mdMediaDia(m, iv.de) : 0;
        const status = !iv ? st("cinza", "1ª leitura") : x.virada === "Sim" ? st("ambar", "Relógio virou")
          : lim && dia > lim ? st("verm", `Acima do limite`, `Limite de ${mdF(lim)} ${m.unidade}/dia (+${mdF(dia - lim, 2)})`)
          : med > 0 && dia > med * 2.5 ? st("ambar", "Acima da média", `Média de ${mdF(med, 2)} ${m.unidade}/dia`) : st("ok", "✓ Normal");
        return `<tr class="${x.ciclo === "Sim" ? "md-ciclo" : ""}"><td class="md-nw"><b>${fData(x.data)}</b></td>
          <td class="md-nw">${esc(m.nome)}${x.obs ? `<span class="sub" title="${esc(x.obs)}">${esc(x.obs.length > 40 ? x.obs.slice(0, 38) + "…" : x.obs)}</span>` : ""}</td>
          <td class="hide-s"><span class="md-tipo ${(MD_INFO[m.tipo] || {}).cor || ""}">${esc(m.tipo || "—")}</span></td>
          <td class="num"><b>${mdF(x.leitura, 2)}</b></td><td class="num hide-s muted">${a ? mdF(a.leitura, 2) : "—"}</td>
          <td class="num md-nw"><b>${iv ? `${mdF(iv.consumo, 2)} ${esc(m.unidade)}` : "—"}</b>${iv && iv.dias > 1 ? `<span class="sub">em ${iv.dias} dias</span>` : ""}</td>
          <td>${status}${x.ciclo === "Sim" ? st("conc", "Concessionária", "Dia da leitura da concessionária (fecha o ciclo)") : ""}</td>${acoes("l", x.id)}</tr>`; }).join("")
        : `<tr><td colspan="8"><div class="empty">Nenhuma leitura neste período.${mdLancar() ? ` Use <b>+ Novo lançamento</b>.` : ""}</div></td></tr>`}</tbody></table></div>`;
  } else {
    const l = MD.d.contas.filter(x => (!MD.fMed || x.medidor === MD.fMed) && (!desde || x.mes >= desde.slice(0, 7))).sort((a, b) => b.mes.localeCompare(a.mes));
    $("#ml-conta").textContent = `${l.length} lançamento${l.length === 1 ? "" : "s"}`;
    box.innerHTML = `<div class="tablebox"><table><thead><tr><th>Mês</th><th>Medidor</th><th class="num">Consumo da conta</th><th class="num">Valor</th><th class="num hide-s">Preço por unidade</th><th class="hide-m">Vencimento</th><th class="num hide-m">Pelas leituras</th>${thA}</tr></thead><tbody>
      ${l.length ? l.map(x => { const m = mdMed(x.medidor) || {nome:"medidor excluído", tipo:"", unidade:""}, pl = m.id ? mdMesSel(m, x.mes) : {n:0};
        const c = x.consumo === "" ? NaN : Number(x.consumo), v = x.valor === "" ? NaN : Number(x.valor);
        return `<tr><td>${mdRotMes(x.mes)}</td><td><span class="md-mn">${mdIco(m.tipo, "mini")}<span>${esc(m.nome)}<span class="sub">${esc(m.tipo)} · nº ${esc(m.numero || "")}</span></span></span></td>
          <td class="num">${isNaN(c) ? "—" : mdF(c, 2) + " " + esc(m.unidade)}</td><td class="num"><b>${isNaN(v) ? "—" : fBRL(v)}</b></td><td class="num hide-s">${!isNaN(c) && !isNaN(v) && c > 0 ? fBRL(v / c) + "/" + esc(m.unidade) : "—"}</td>
          <td class="hide-m">${x.vencimento ? fData(x.vencimento) : "—"}</td><td class="num hide-m">${pl.n ? mdF(pl.s, 2) + " " + esc(m.unidade) + `<span class="sub">${pl.n} dia${pl.n === 1 ? "" : "s"} com leitura</span>` : "—"}</td>${acoes("c", x.id)}</tr>`; }).join("")
        : `<tr><td colspan="8"><div class="empty">Nenhuma conta neste período.${mdLancar() ? ` Use <b>+ Novo lançamento</b> para lançar a conta do mês.` : ""}</div></td></tr>`}</tbody></table></div>`;
  }
}
// lançamento diário: a leitura de vários medidores de uma vez (deixa em branco o que não foi lido)
function mdNovaLeitura(o){
  if (!MD.d) return;
  o = o || {};
  const ed = o.id ? MD.d.leituras.find(x => x.id === o.id) : null;
  const meds = ed ? [mdMed(ed.medidor)].filter(Boolean) : mdOrdem(MD.d.medidores).filter(m => m.ativo !== "Não" && (!o.medidor || m.id === o.medidor));
  if (!meds.length) { toast("Cadastre um medidor ativo em Meus medidores.", true); return; }
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<div id="mdl-w"><h3>${ed ? "Corrigir leitura" : "Novo lançamento diário"}</h3>
    <p class="muted">${ed ? "" : "Digite o número que aparece no relógio de cada medidor. Deixe em branco os que não foram lidos. "}O consumo é a diferença para a leitura anterior.</p>
    <div class="field md-data"><label for="mdl-data">Data da leitura <span class="req">*</span></label><input class="input" type="date" id="mdl-data" max="${hoje()}" value="${ed ? esc(ed.data) : hoje()}"></div>
    <div class="md-ls">${meds.map((m, i) => `<div class="md-l">
      <div class="md-l-n">${mdIco(m.tipo, "mini")}<span><b>${esc(m.nome)}</b><span class="sub">${esc(m.tipo)} · nº ${esc(m.numero)}</span><span class="sub" data-ant="${i}"></span></span></div>
      <label class="field"><span>Leitura (${esc(m.unidade)})</span><input class="input num" inputmode="decimal" data-lt="${i}" value="${ed ? esc(String(ed.leitura).replace(".", ",")) : ""}" autocomplete="off" aria-label="Leitura de ${esc(m.nome)}"></label>
      <label class="field"><span>Observação</span><input class="input" data-ob="${i}" maxlength="200" value="${ed ? esc(ed.obs || "") : ""}" aria-label="Observação de ${esc(m.nome)}"></label>
      <div class="md-prev" data-prev="${i}" aria-live="polite"></div>
      <label class="md-vir" data-virbox="${i}" hidden><input type="checkbox" data-vir="${i}" ${ed && ed.virada === "Sim" ? "checked" : ""}> O relógio virou (passou de ${mdNoves(m)} e recomeçou do zero)</label>
      <label class="md-vir md-cic"><input type="checkbox" data-cic="${i}" ${ed && ed.ciclo === "Sim" ? "checked" : ""}> A concessionária leu o medidor neste dia (fecha o ciclo; o acumulado recomeça no dia seguinte)</label></div>`).join("")}</div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="mdl-ok">${ed ? "Salvar correção" : "Lançar"}</button><button class="btn" type="button" id="mdl-x">Cancelar</button><span class="hint" id="mdl-msg"></span></div></div>`;
  $("#modal").hidden = false;
  const ant = (m, data) => MD.d.leituras.filter(x => x.medidor === m.id && x.data < data && (!ed || x.id !== ed.id)).sort((a, b) => a.data < b.data ? -1 : 1).pop();
  const atualizar = () => {
    const data = $("#mdl-data").value || hoje();
    meds.forEach((m, i) => {
      const a = ant(m, data), v = mdNum($(`#modal-box [data-lt="${i}"]`).value), vb = $(`#modal-box [data-virbox="${i}"]`), pv = $(`#modal-box [data-prev="${i}"]`);
      $(`#modal-box [data-ant="${i}"]`).textContent = a ? `Anterior: ${fNum(a.leitura)} em ${fData(a.data)}` : "Primeira leitura deste medidor";
      const igual = MD.d.leituras.find(x => x.medidor === m.id && x.data === data && (!ed || x.id !== ed.id));
      let txt = "", cls = "";
      vb.hidden = true;
      if (!isNaN(v) && igual) { txt = `Já há leitura em ${fData(data)} (${fNum(igual.leitura)}). Corrija a que já existe.`; cls = "err"; }
      else if (!isNaN(v) && v >= Math.pow(10, Number(m.casas) || 0)) { txt = `O relógio tem ${m.casas} casas: confira o número.`; cls = "err"; }
      else if (!isNaN(v) && a) {
        let c = v - a.leitura;
        if (c < 0) { vb.hidden = false; if ($(`#modal-box [data-vir="${i}"]`).checked) c += Math.pow(10, Number(m.casas) || 0); }
        const dias = Math.max(1, mdDiasEntre(a.data, data));
        if (c < 0) { txt = "Menor que a leitura anterior. Confira o número ou marque se o relógio virou."; cls = "err"; }
        else {
          txt = `Consumo: <b>${mdF(c, 2)} ${esc(m.unidade)}</b>${dias > 1 ? ` em ${dias} dias (${mdF(c / dias, 2)}/dia)` : ""}`;
          const med = mdMediaDia(m, a.data), lim = mdLim(m);
          if (lim && c / dias > lim) { txt += ` · <span class="md-alto">acima do limite de ${mdF(lim)} ${esc(m.unidade)}/dia (+${mdF(c / dias - lim, 2)})</span>`; cls = "alto"; }
          else if (med > 0 && c / dias > med * 2.5) { txt += ` · <span class="md-alto">bem acima da média (${mdF(med, 2)}/dia)</span>`; cls = "alto"; }
          if (mdTemCiclo(m)) { const ac = mdAcumCiclo(m, data); if (ac) txt += ` · ciclo: ${mdF(ac.s + c, 2)} ${esc(m.unidade)} desde ${fData(ac.ini).slice(0, 5)}`; }
        }
      }
      pv.className = "md-prev " + cls; pv.innerHTML = txt;
    });
  };
  atualizar();
  $("#mdl-w").oninput = atualizar; $("#mdl-w").onchange = atualizar;
  $("#mdl-x").onclick = fecharModal;
  const primeiro = $('#modal-box [data-lt="0"]'); if (primeiro) primeiro.focus();
  $("#mdl-ok").onclick = () => {
    const data = $("#mdl-data").value, msg = $("#mdl-msg");
    if (!data) { msg.className = "hint err"; msg.textContent = "Informe a data da leitura."; return; }
    const leituras = [];
    for (let i = 0; i < meds.length; i++) {
      const t = $(`#modal-box [data-lt="${i}"]`).value.trim(); if (!t) continue;
      const v = mdNum(t); if (isNaN(v) || v < 0) { msg.className = "hint err"; msg.textContent = `Leitura inválida para ${meds[i].nome}.`; return; }
      leituras.push(Object.assign(ed ? {id:ed.id} : {}, {medidor:meds[i].id, data, leitura:v, virada:!$(`#modal-box [data-virbox="${i}"]`).hidden && $(`#modal-box [data-vir="${i}"]`).checked, ciclo:$(`#modal-box [data-cic="${i}"]`).checked, obs:$(`#modal-box [data-ob="${i}"]`).value}));
    }
    if (!leituras.length) { msg.className = "hint err"; msg.textContent = "Digite ao menos uma leitura."; return; }
    enviar($("#mdl-ok"), msg, "medLeituras", {leituras}, r => { mdAplicar(r); fecharModal(); renderMedTudo(); });
  };
}
const mdMesDe = s => { const t = String(s || "").trim(); let m = /^(\d{4})-(\d{1,2})/.exec(t); if (m) return m[1] + "-" + m[2].padStart(2, "0"); m = /^(\d{1,2})\/(\d{4})$/.exec(t); if (m) return m[2] + "-" + m[1].padStart(2, "0"); return ""; };
function mdMesAnterior(){ const d = new Date(hoje() + "T12:00:00"); return iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)).slice(0, 7); }
// lançamento mensal: a conta da concessionária (consumo e valor) de um medidor
function mdNovaConta(o){
  if (!MD.d) return;
  o = o || {};
  const ed = o.id ? MD.d.contas.find(x => x.id === o.id) : null;
  const meds = mdOrdem(MD.d.medidores).filter(m => m.ativo !== "Não" || (ed && m.id === ed.medidor));
  if (!meds.length) { toast("Cadastre um medidor ativo em Meus medidores.", true); return; }
  const sel = ed ? ed.medidor : o.medidor || (MD.fMed && meds.some(m => m.id === MD.fMed) ? MD.fMed : meds[0].id);
  const n = v => v === "" || v === undefined || v === null ? "" : esc(String(v).replace(".", ","));
  $("#modal-box").innerHTML = `<h3>${ed ? "Corrigir conta" : "Novo lançamento mensal"}</h3>
    <p class="muted">Dados da conta da concessionária: consumo faturado e valor do mês.</p>
    <form class="form" id="mdc-f" novalidate autocomplete="off">
      <div class="field full"><label for="mdc-med">Medidor <span class="req">*</span></label><select class="input" id="mdc-med">${meds.map(m => `<option value="${esc(m.id)}" ${m.id === sel ? "selected" : ""}>${esc(m.tipo)} · ${esc(m.nome)} (nº ${esc(m.numero)})</option>`).join("")}</select></div>
      <div class="field"><label for="mdc-mes">Mês de referência <span class="req">*</span></label><input class="input" type="month" id="mdc-mes" max="${hoje().slice(0, 7)}" value="${ed ? esc(ed.mes) : mdMesAnterior()}" placeholder="aaaa-mm"></div>
      <div class="field"><label for="mdc-venc">Vencimento</label><input class="input" type="date" id="mdc-venc" value="${ed ? esc(ed.vencimento || "") : ""}"></div>
      <div class="field"><label for="mdc-cons">Consumo da conta (<span id="mdc-un"></span>)</label><input class="input num" id="mdc-cons" inputmode="decimal" value="${ed ? n(ed.consumo) : ""}"></div>
      <div class="field"><label for="mdc-val">Valor da conta (R$)</label><input class="input num" id="mdc-val" inputmode="decimal" value="${ed ? n(ed.valor) : ""}" placeholder="0,00"></div>
      <div class="field full"><label for="mdc-obs">Observação</label><input class="input" id="mdc-obs" maxlength="200" value="${ed ? esc(ed.obs || "") : ""}"></div>
      <p class="hint full" id="mdc-prev"></p>
    </form>
    <div class="actions"><button class="btn primary" type="button" id="mdc-ok">${ed ? "Salvar correção" : "Lançar conta"}</button><button class="btn" type="button" id="mdc-x">Cancelar</button><span class="hint" id="mdc-msg"></span></div>`;
  $("#modal").hidden = false;
  const atualizar = () => {
    const m = mdMed($("#mdc-med").value), mes = mdMesDe($("#mdc-mes").value), c = mdNum($("#mdc-cons").value), v = mdNum($("#mdc-val").value);
    $("#mdc-un").textContent = m ? m.unidade : "";
    const p = [];
    if (!isNaN(c) && !isNaN(v) && c > 0) p.push(`Preço: <b>${fBRL(v / c)}</b> por ${esc(m.unidade)}`);
    if (m && mes) { const pl = mdMesSel(m, mes); p.push(pl.n ? `Pelas leituras: ${mdF(pl.s, 2)} ${esc(m.unidade)} em ${pl.n} dia${pl.n === 1 ? "" : "s"} de ${mdRotMes(mes)}` : `Sem leituras em ${mdRotMes(mes)}`); }
    $("#mdc-prev").innerHTML = p.join(" · ");
  };
  atualizar();
  $("#mdc-f").oninput = atualizar; $("#mdc-f").onchange = atualizar;
  $("#mdc-x").onclick = fecharModal; $("#mdc-mes").focus();
  $("#mdc-ok").onclick = () => {
    const msg = $("#mdc-msg"), mes = mdMesDe($("#mdc-mes").value), ct = $("#mdc-cons").value.trim(), vt = $("#mdc-val").value.trim();
    const erro = t => { msg.className = "hint err"; msg.textContent = t; };
    if (!mes) return erro("Informe o mês de referência.");
    if (!ct && !vt) return erro("Informe o consumo ou o valor da conta.");
    const c = ct ? mdNum(ct) : "", v = vt ? mdNum(vt) : "";
    if (ct && (isNaN(c) || c < 0)) return erro("Consumo inválido.");
    if (vt && (isNaN(v) || v < 0)) return erro("Valor inválido.");
    enviar($("#mdc-ok"), msg, "medContas", {conta:Object.assign(ed ? {id:ed.id} : {}, {medidor:$("#mdc-med").value, mes, consumo:c, valor:v, vencimento:$("#mdc-venc").value, obs:$("#mdc-obs").value})}, r => { mdAplicar(r); fecharModal(); renderMedTudo(); });
  };
}
function mdExcluir(btn){
  const [tipo, id] = btn.dataset.mlDel.split(":");
  if (!btn.dataset.conf) { const orig = btn.innerHTML; btn.dataset.conf = "1"; btn.textContent = "excluir?"; btn.classList.add("conf"); setTimeout(() => { if (btn.isConnected && btn.dataset.conf) { delete btn.dataset.conf; btn.innerHTML = orig; btn.classList.remove("conf"); } }, 4000); return; }
  enviar(btn, null, tipo === "l" ? "medLeituras" : "medContas", {op:"excluir", id}, r => { mdAplicar(r); renderMedTudo(); });
}

// ---- Meus medidores ----
function renderMedidores(){
  const sec = $("#t-medidores"); if (!sec || sec.hidden) return;
  $("#md-novo").hidden = !mdLancar();
  const box = $("#md-corpo"); if (mdCarregando(box)) return;
  const meds = mdOrdem(MD.d.medidores).sort((a, b) => (a.ativo === "Não") - (b.ativo === "Não"));
  $("#md-conta").textContent = meds.length ? `${meds.filter(m => m.ativo !== "Não").length} ativo${meds.filter(m => m.ativo !== "Não").length === 1 ? "" : "s"}${meds.some(m => m.ativo === "Não") ? ` · ${meds.filter(m => m.ativo === "Não").length} inativo(s)` : ""}` : "";
  if (!meds.length) { box.innerHTML = `<div class="empty">Nenhum medidor cadastrado ainda.${mdLancar() ? ` Clique em <b>+ Novo medidor</b> para cadastrar o primeiro (água, energia ou gás).` : ""}</div>`; return; }
  const h = hoje();
  box.innerHTML = `<div class="md-grid">${meds.map(m => {
    const it = mdInt(m), ult = it.ls[it.ls.length - 1], dias = ult ? mdDiasEntre(ult.data, h) : null, f30 = mdSomaFaixa(m, mdSomaDia(h, -29), h);
    const usa = it.ls.length || MD.d.contas.some(c => c.medidor === m.id), inat = m.ativo === "Não";
    return `<article class="panel md-card ${inat ? "inativo" : ""}"><div class="md-card-h">${mdIco(m.tipo)}<div><h3>${esc(m.nome)}</h3><span class="muted">${esc(m.tipo)}${m.local ? " · " + esc(m.local) : ""}</span></div>${inat ? `<span class="pill p-ajuste">Inativo</span>` : `<span class="md-st conc">Área comum</span>`}</div>
      <dl class="md-dl"><div><dt>Número</dt><dd class="mono">${esc(m.numero)}</dd></div><div><dt>Casas</dt><dd>${esc(m.casas)}</dd></div><div><dt>Unidade</dt><dd>${esc(m.unidade)}</dd></div>
        <div><dt>Última leitura</dt><dd>${ult ? `<b class="mono">${fNum(ult.leitura)}</b> em ${fData(ult.data)}${!inat && dias > 7 ? ` <span class="pill s-baixo">há ${dias} dias</span>` : ""}` : "nenhuma"}</dd></div>
        <div><dt>Consumo em 30 dias</dt><dd>${f30.n ? `<b>${mdF(f30.s, 2)} ${esc(m.unidade)}</b><span class="sub">${mdF(f30.s / f30.n, 2)}/dia</span>` : "—"}</dd></div>
        ${mdLim(m) ? `<div><dt>Limite diário</dt><dd>${mdF(mdLim(m))} ${esc(m.unidade)}/dia${(() => { const n = mdDiasAcima(m, mdSomaDia(h, -29), h); return n ? ` <span class="pill s-baixo">${n} dia${n === 1 ? "" : "s"} acima em 30 dias</span>` : ""; })()}</dd></div>` : ""}
        ${mdTemCiclo(m) || m.proxCiclo ? `<div><dt>Ciclo da concessionária</dt><dd>${(() => { const ac = mdAcumCiclo(m, mdSomaDia(h, 1)); return ac ? `<b>${mdF(ac.s, 2)} ${esc(m.unidade)}</b> desde ${fData(ac.ini)}` : "sem leitura da concessionária marcada"; })()}${m.proxCiclo && m.proxCiclo >= h ? `<span class="sub">próxima leitura prevista: ${fData(m.proxCiclo)} (${mdDiasEntre(h, m.proxCiclo) === 0 ? "hoje" : "em " + mdDiasEntre(h, m.proxCiclo) + " dia" + (mdDiasEntre(h, m.proxCiclo) === 1 ? "" : "s")})</span>` : ""}</dd></div>` : ""}</dl>
      ${m.obs ? `<p class="muted md-obs-t">${esc(m.obs)}</p>` : ""}
      <div class="md-card-a">${mdLancar() && !inat ? `<button type="button" class="btn small primary" data-md-ler="${esc(m.id)}">Lançar leitura</button>` : ""}<button type="button" class="btn small" data-md-rel="${esc(m.id)}">Ver no relatório</button>${mdLancar() ? `<button type="button" class="btn small" data-md-ed="${esc(m.id)}">Editar</button>` : ""}${mdLancar() && !usa ? `<button type="button" class="link danger" data-md-del="${esc(m.id)}">Excluir</button>` : ""}</div></article>`; }).join("")}</div>`;
}
function mdEditarMedidor(id){
  const m = id ? mdMed(id) : null;
  const v = m || {tipo:"", nome:"", numero:"", casas:5, unidade:"", limite:"", proxCiclo:"", local:"", obs:"", ativo:"Sim"};
  $("#modal-box").innerHTML = `<h3>${m ? "Editar medidor" : "Novo medidor"}</h3>
    <form class="form" id="mdm-f" novalidate autocomplete="off">
      <div class="field full"><label for="mdm-tipo">Tipo de concessionária <span class="req">*</span></label><select class="input" id="mdm-tipo"><option value="">Selecione…</option>${MD_TIPOS.map(t => `<option ${t === v.tipo ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field full"><label for="mdm-nome">Nome / identificação <span class="req">*</span></label><input class="input" id="mdm-nome" maxlength="60" value="${esc(v.nome)}" placeholder="Ex.: Guarita norte"><span class="hint">Como a equipe reconhece o medidor.</span></div>
      <div class="field full"><label for="mdm-num">Número do medidor <span class="req">*</span></label><input class="input mono" id="mdm-num" maxlength="40" value="${esc(v.numero)}" placeholder="Ex.: 123456789"><span class="hint">Número de série / registro do medidor (está na conta e no próprio relógio).</span></div>
      <div class="field"><label for="mdm-casas">Número de casas do medidor <span class="req">*</span></label><input class="input num" id="mdm-casas" type="number" min="3" max="12" step="1" value="${esc(v.casas)}"><span class="hint" id="mdm-casas-h"></span></div>
      <div class="field"><label for="mdm-un">Unidade de medida <span class="req">*</span></label><select class="input" id="mdm-un"><option value="">Selecione…</option>${[["m³","m³ (metro cúbico)"],["kWh","kWh (quilowatt-hora)"],["Litros","Litros"]].map(([k, r]) => `<option value="${k}" ${k === v.unidade ? "selected" : ""}>${r}</option>`).join("")}</select></div>
      <div class="field"><label for="mdm-lim">Limite diário (opcional)</label><input class="input num" id="mdm-lim" inputmode="decimal" value="${v.limite !== "" && v.limite !== undefined ? esc(String(v.limite).replace(".", ",")) : ""}" placeholder="Ex.: 70"><span class="hint">Consumo máximo esperado por dia. Os dias acima ficam destacados.</span></div>
      <div class="field"><label for="mdm-prox">Próxima leitura da concessionária</label><input class="input" type="date" id="mdm-prox" value="${esc(v.proxCiclo || "")}"><span class="hint">Data prevista da leitura da concessionária (ex.: Iguá), se souber.</span></div>
      <div class="field full"><label for="mdm-local">Local</label><input class="input" id="mdm-local" maxlength="80" value="${esc(v.local || "")}" placeholder="Ex.: caixa ao lado da portaria"></div>
      <div class="field full"><label for="mdm-obs">Observação</label><input class="input" id="mdm-obs" maxlength="300" value="${esc(v.obs || "")}"></div>
      ${m ? `<label class="field full md-chk"><input type="checkbox" id="mdm-ativo" ${v.ativo !== "Não" ? "checked" : ""}> Medidor ativo (desmarque se foi trocado ou desligado; o histórico continua nos relatórios)</label>` : ""}
    </form>
    <div class="actions"><button class="btn primary" type="button" id="mdm-ok">Salvar medidor</button><button class="btn" type="button" id="mdm-x">Cancelar</button><span class="hint" id="mdm-msg"></span></div>`;
  $("#modal").hidden = false;
  let unMexida = !!m;
  const casasH = () => { const c = Number($("#mdm-casas").value); $("#mdm-casas-h").textContent = c >= 3 && c <= 12 ? `Quantos números inteiros o relógio mostra (até ${"9".repeat(c)}). Serve para entender quando ele passa do máximo e recomeça do zero.` : "Entre 3 e 12."; };
  casasH(); $("#mdm-casas").oninput = casasH;
  $("#mdm-un").onchange = () => { unMexida = true; };
  $("#mdm-tipo").onchange = () => { const t = $("#mdm-tipo").value; if (!unMexida && MD_INFO[t]) $("#mdm-un").value = MD_INFO[t].un; };
  $("#mdm-x").onclick = fecharModal; $("#mdm-tipo").focus();
  $("#mdm-ok").onclick = () => {
    const msg = $("#mdm-msg"), erro = t => { msg.className = "hint err"; msg.textContent = t; };
    const lt = $("#mdm-lim").value.trim(), lim = lt ? mdNum(lt) : "";
    if (lt && !(lim > 0)) return erro("O limite diário deve ser um número maior que zero (ou deixe em branco).");
    const o = {tipo:$("#mdm-tipo").value, nome:$("#mdm-nome").value.trim(), numero:$("#mdm-num").value.trim(), casas:Number($("#mdm-casas").value), unidade:$("#mdm-un").value, limite:lim, proxCiclo:$("#mdm-prox").value, local:$("#mdm-local").value, obs:$("#mdm-obs").value, ativo:m ? $("#mdm-ativo").checked : true};
    if (!o.tipo) return erro("Escolha o tipo de concessionária.");
    if (!o.nome) return erro("Dê um nome ao medidor.");
    if (!o.numero) return erro("Informe o número do medidor.");
    if (!(Number.isInteger(o.casas) && o.casas >= 3 && o.casas <= 12)) return erro("O número de casas deve ficar entre 3 e 12.");
    if (!o.unidade) return erro("Escolha a unidade de medida.");
    if (m) o.id = m.id;
    enviar($("#mdm-ok"), msg, "medMedidor", {medidor:o}, r => { mdAplicar(r); fecharModal(); renderMedTudo(); });
  };
}

// ---- Relatórios ----
function mdRelDados(tipo, P, modo){
  const todos = mdOrdem(MD.d.medidores.filter(m => m.tipo === tipo));
  const selIds = (MD.rSel[tipo] || []).filter(id => todos.some(m => m.id === id));
  const meds = selIds.length ? todos.filter(m => selIds.includes(m.id)) : todos;
  const un = mdUnidade(meds, tipo), cor = m => MD_CORES[todos.indexOf(m) % MD_CORES.length];
  const dias = mdDias(P.de, P.ate), cats = modo === "mes" ? mdMeses(P.de, P.ate) : dias;
  const series = meds.map(m => {
    const mp = mdDiario(m), f = mdFator(m, un);
    const v = modo === "mes" ? cats.map(ym => { let s = 0, n = 0; for (const [d, x] of mp) if (d.slice(0, 7) === ym && d >= P.de && d <= P.ate) { s += x; n++; } return n ? s * f : null; })
      : cats.map(d => mp.has(d) ? mp.get(d) * f : null);
    return {m, cor:cor(m), v, nome:m.nome};
  });
  let total = 0; const comDado = new Set();
  meds.forEach(m => { const f = mdFator(m, un); for (const [d, x] of mdDiario(m)) if (d >= P.de && d <= P.ate) { total += x * f; comDado.add(d); } });
  const h = hoje(), janela = (de, ate) => { let s = 0; const ds = new Set(); meds.forEach(m => { const f = mdFator(m, un); for (const [d, x] of mdDiario(m)) if (d >= de && d <= ate) { s += x * f; ds.add(d); } }); return ds.size ? s / ds.size : null; };
  const ult14 = janela(mdSomaDia(h, -13), h), ant14 = janela(mdSomaDia(h, -27), mdSomaDia(h, -14));
  const ids = new Set(meds.map(m => m.id)), cs = MD.d.contas.filter(c => ids.has(c.medidor));
  const doPer = cs.filter(c => c.mes >= P.de.slice(0, 7) && c.mes <= P.ate.slice(0, 7));
  const soma = (l, k) => l.reduce((s, c) => s + (c[k] === "" || c[k] === undefined ? 0 : Number(c[k]) * (k === "consumo" ? mdFator(mdMed(c.medidor) || {}, un) : 1)), 0);
  const temV = l => l.some(c => c.valor !== "" && c.valor !== undefined);
  const ultMes = cs.length ? cs.map(c => c.mes).sort().pop() : "", ultL = cs.filter(c => c.mes === ultMes);
  const contasMes = ym => { const l = cs.filter(c => c.mes === ym); return l.length ? {consumo:l.some(c => c.consumo !== "") ? soma(l, "consumo") : null, valor:temV(l) ? soma(l, "valor") : null} : null; };
  const comCiclo = meds.filter(mdTemCiclo), ciclos = comCiclo.map(m => mdAcumCiclo(m, mdSomaDia(h, 1))).filter(Boolean);
  const ciclo = ciclos.length ? {s:ciclos.reduce((a, c, i) => a + c.s * mdFator(comCiclo[i], un), 0), ini:[...new Set(ciclos.map(c => c.ini))]} : null;
  const comLim = meds.filter(mdLim), limites = [...new Set(comLim.map(m => mdLim(m) * mdFator(m, un)))];
  const acima = comLim.length ? comLim.reduce((a, m) => a + mdDiasAcima(m, P.de, P.ate), 0) : null;
  const proxs = meds.map(m => m.proxCiclo).filter(d => d && d >= h).sort();
  return {tipo, todos, meds, selIds, un, cats, series, total, diasCom:comDado.size, ult14, ant14, ciclo, acima, limite:limites.length === 1 && comLim.length === meds.length ? limites[0] : 0, limTxt:comLim.map(m => `${m.nome}: ${mdF(mdLim(m))} ${m.unidade}/dia`).join(" · "), prox:proxs[0] || "", valorPer:temV(doPer) ? soma(doPer, "valor") : null, nContasPer:doPer.length,
    ultConta:ultMes ? {mes:ultMes, valor:temV(ultL) ? soma(ultL, "valor") : null, consumo:ultL.some(c => c.consumo !== "") ? soma(ultL, "consumo") : null} : null, contasMes, modo};
}
const mdPasso = max => { if (!(max > 0)) return 1; const raw = max / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
// gráfico em SVG (linhas por dia; barras por mês). Cores inline para servir também no PDF.
function mdGrafSvg(R, W){
  const H = W < 560 ? 230 : 300, pl = 62, pr = 14, pt = 14, pb = 40, iw = W - pl - pr, ih = H - pt - pb;
  const vals = R.series.flatMap(s => s.v).filter(v => v !== null), max = Math.max(0, ...vals, R.modo !== "mes" && R.limite ? R.limite * 1.05 : 0);
  const passo = mdPasso(max), top = Math.max(passo, Math.ceil(max / passo) * passo), dec = passo < 1 ? 2 : passo < 10 && passo % 1 ? 1 : 0;
  const n = R.cats.length, x = i => pl + iw * (i + .5) / n, y = v => pt + ih - ih * v / top;
  const rot = c => R.modo === "mes" ? mdRotMes(c) : fData(c).slice(0, 5);
  let g = "";
  for (let v = 0; v <= top + 1e-9; v += passo) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#d6dee8" stroke-width="1"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#5b6b7d">${mdF(v, dec)}</text>`;
  const cabe = Math.max(1, Math.floor(iw / (R.modo === "mes" ? 52 : 46))), pulo = Math.ceil(n / cabe);
  R.cats.forEach((c, i) => { if ((n - 1 - i) % pulo === 0) g += `<text x="${x(i).toFixed(1)}" y="${H - pb + 16}" text-anchor="middle" font-size="11" fill="#5b6b7d">${rot(c)}</text>`; });
  g += `<text transform="translate(14 ${pt + ih / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="#5b6b7d">Consumo (${esc(R.un)})</text>`;
  if (R.limite && R.modo !== "mes" && R.limite <= top) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(R.limite).toFixed(1)}" y2="${y(R.limite).toFixed(1)}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${W - pr}" y="${(y(R.limite) - 5).toFixed(1)}" text-anchor="end" font-size="11" fill="#dc2626">limite ${mdF(R.limite)} ${esc(R.un)}/dia</text>`;
  if (R.modo === "mes") {
    const gw = iw / n * .72, bw = gw / Math.max(1, R.series.length);
    R.series.forEach((s, k) => s.v.forEach((v, i) => { if (v === null) return; const x0 = x(i) - gw / 2 + k * bw, h = Math.max(0, ih * v / top);
      g += `<rect x="${x0.toFixed(1)}" y="${(pt + ih - h).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${s.cor}"><title>${mdRotMes(R.cats[i])} · ${esc(s.nome)}: ${mdF(v, 2)} ${esc(R.un)}</title></rect>`; }));
  } else {
    const pontos = n <= 62;
    R.series.forEach(s => {
      let d = "", aberto = false;
      s.v.forEach((v, i) => { if (v === null) { aberto = false; return; } d += (aberto ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); aberto = true; });
      g += `<path d="${d}" fill="none" stroke="${s.cor}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      g += s.v.map((v, i) => v === null ? "" : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${pontos ? 3.2 : 6}" fill="${pontos ? s.cor : "transparent"}" stroke="${pontos ? "#fff" : "none"}" stroke-width="1.2"><title>${fData(R.cats[i])} · ${esc(s.nome)}: ${mdF(v, 2)} ${esc(R.un)}</title></circle>`).join("");
    });
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Consumo ${R.modo === "mes" ? "mensal" : "diário"} de ${esc(R.tipo)}">${g}</svg>`;
}
function mdCards(R){
  const comp = R.ult14 !== null && R.ant14 ? (R.ult14 - R.ant14) / R.ant14 : null;
  const card = (rot, v, sub, cor, ico, subCls) => `<div class="pp-card md-kpi"><span class="pp-txt"><span class="pp-rot">${rot}</span><b class="pp-v num">${v}</b><span class="pp-sub ${subCls || ""}">${sub}</span></span><span class="pp-ico ${cor}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg></span></div>`;
  return card("Consumo no período", R.diasCom ? `${mdF(R.total, 2)} ${esc(R.un)}` : "—", R.valorPer !== null ? `${fBRL(R.valorPer)} em ${R.nContasPer} conta${R.nContasPer === 1 ? "" : "s"}` : "Sem valor informado", (MD_INFO[R.tipo] || {}).cor || "azul", (MD_INFO[R.tipo] || MD_INFO["Água"]).ico)
    + card("Média diária", R.diasCom ? `${mdF(R.total / R.diasCom, 2)} ${esc(R.un)}/dia` : "—", comp === null ? "Sem dados das 2 semanas anteriores para comparar" : `${comp > 0 ? "+" : ""}${mdF(comp * 100, 1)}% nas últimas 2 semanas, comparado às 2 anteriores`, "verde", '<path d="M4 18 9 12l4 3 7-8M15 7h5v5"/>', comp === null ? "" : comp > .1 ? "md-sobe" : comp < -.1 ? "ok" : "")
    + (R.ciclo ? card("Ciclo da concessionária", `${mdF(R.ciclo.s, 2)} ${esc(R.un)}`, `${R.ciclo.ini.length === 1 ? `desde ${fData(R.ciclo.ini[0])}` : "desde a última leitura de cada medidor"}${R.prox ? ` · próxima leitura: ${fData(R.prox)}` : ""}`, "teal", '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/>') : "")
    + (R.acima !== null ? card("Dias acima do limite", String(R.acima), `no período · ${esc(R.limTxt)}`, R.acima ? "vermelho" : "verde", '<path d="M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01"/>', R.acima ? "md-sobe" : "ok") : "")
    + card("Última conta", R.ultConta && R.ultConta.valor !== null ? fBRL(R.ultConta.valor) : "—", R.ultConta ? `${mdRotMes(R.ultConta.mes)}${R.ultConta.consumo !== null ? ` · ${mdF(R.ultConta.consumo, 2)} ${esc(R.un)}` : ""}${R.ultConta.consumo && R.ultConta.valor !== null ? ` · ${fBRL(R.ultConta.valor / R.ultConta.consumo)}/${esc(R.un)}` : ""}` : "Nenhuma conta lançada", "roxo", '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>');
}
// linhas da tabela (as mesmas no site, na planilha e no PDF)
function mdTabela(R){
  const cab = [R.modo === "mes" ? "Mês" : "Data"].concat(R.series.map(s => `${s.nome} (${R.un})`), R.series.length > 1 ? [`Total (${R.un})`] : [], R.modo === "mes" ? [`Conta: consumo (${R.un})`, "Conta: valor (R$)", `R$ por ${R.un}`] : []);
  const linhas = R.cats.map((c, i) => {
    const vs = R.series.map(s => s.v[i]), t = vs.some(v => v !== null) ? vs.reduce((a, v) => a + (v || 0), 0) : null;
    const l = [c].concat(vs, R.series.length > 1 ? [t] : []);
    if (R.modo === "mes") { const k = R.contasMes(c); l.push(k ? k.consumo : null, k ? k.valor : null, k && k.consumo && k.valor !== null ? k.valor / k.consumo : null); }
    return l;
  }).filter(l => l.slice(1).some(v => v !== null)).reverse();
  return {cab, linhas};
}
function renderMedRel(){
  const sec = $("#t-medrel"); if (!sec || sec.hidden) return;
  $("#mr-per").value = MD.rPer; $("#mr-tipo").value = MD.rTipo;
  const box = $("#mr-corpo"); if (mdCarregando(box)) return;
  const P = mdPeriodo(MD.rPer), tipos = MD_TIPOS.filter(t => MD.d.medidores.some(m => m.tipo === t));
  $("#mr-de").textContent = `${fData(P.de)} a ${fData(P.ate)}`;
  if (!tipos.length) { box.innerHTML = `<div class="empty">Nenhum medidor cadastrado ainda. Cadastre em <b>Meus medidores</b> e lance as leituras para ver os relatórios.</div>`; return; }
  const Rs = tipos.map(t => mdRelDados(t, P, MD.rTipo));
  box.innerHTML = Rs.map((R, k) => { const vis = MD.rVis[R.tipo] || "graf", info = MD_INFO[R.tipo], T = mdTabela(R);
    const fmtC = (v, j) => v === null ? "—" : j === 0 ? (R.modo === "mes" ? mdRotMes(v) : fData(v)) : /R\$/.test(T.cab[j]) ? fBRL(v) : mdF(v, 2);
    return `<section class="panel md-sec" data-tipo="${esc(R.tipo)}">
      <div class="md-sec-h"><h3 class="md-tit ${info.cor}"><svg viewBox="0 0 24 24" aria-hidden="true">${info.ico}</svg>${esc(R.tipo)}</h3>
        <div class="ind-vistas md-vis" role="tablist" aria-label="Mostrar ${esc(R.tipo)}"><button type="button" role="tab" data-mr-vis="graf" data-tipo="${esc(R.tipo)}" aria-selected="${vis === "graf"}">Gráficos</button><button type="button" role="tab" data-mr-vis="tab" data-tipo="${esc(R.tipo)}" aria-selected="${vis === "tab"}">Tabela</button></div></div>
      <div class="pp-cards md-cards">${mdCards(R)}</div>
      <div class="md-filtro"><span class="md-filtro-r">Medidores:</span><div class="md-chips"><button type="button" class="md-chip ${R.selIds.length ? "" : "on"}" data-mr-todos="${esc(R.tipo)}" aria-pressed="${!R.selIds.length}">Todos os medidores</button>${R.todos.map((m, i) => `<button type="button" class="md-chip ${R.selIds.includes(m.id) ? "on" : ""}" data-mr-m="${esc(m.id)}" data-tipo="${esc(R.tipo)}" aria-pressed="${R.selIds.includes(m.id)}"><i style="background:${MD_CORES[i % MD_CORES.length]}"></i>${esc(m.nome)} (${esc(m.numero)})${m.ativo === "Não" ? " · inativo" : ""}</button>`).join("")}</div></div>
      <div class="md-graf-box" ${vis === "tab" ? "hidden" : ""}><h4 class="md-graf-t">Consumo ${R.modo === "mes" ? "mensal" : "diário"} - ${esc(R.tipo)} (${esc(P.rot.toLowerCase())})</h4><p class="hint md-graf-s">${R.modo === "mes" ? "Soma das leituras de cada mês" : "Valores rateados quando há intervalo entre leituras"}</p>
        <div class="pp-leg">${R.series.map(s => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join("")}</div>
        <div class="md-graf" id="mr-g${k}">${R.diasCom ? "" : `<div class="empty">Sem leituras neste período.</div>`}</div></div>
      <div class="md-tab" ${vis === "graf" ? "hidden" : ""}>${T.linhas.length ? `<div class="tablebox"><table><thead><tr>${T.cab.map((c, j) => `<th class="${j ? "num" : ""}">${esc(c)}</th>`).join("")}</tr></thead><tbody>${T.linhas.map(l => `<tr>${l.map((v, j) => `<td class="${j ? "num" : ""}">${fmtC(v, j)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : `<div class="empty">Sem dados neste período.</div>`}</div>
    </section>`; }).join("");
  MD.ultRel = Rs;
  mdDesenhar();
}
function mdDesenhar(){
  (MD.ultRel || []).forEach((R, k) => { const el = $("#mr-g" + k); if (!el || !R.diasCom || el.closest("[hidden]")) return; el.innerHTML = mdGrafSvg(R, Math.max(300, Math.round(el.clientWidth || 700))); });
}
let mdResizeT;
window.addEventListener("resize", () => { clearTimeout(mdResizeT); mdResizeT = setTimeout(() => { if ($("#t-medrel") && !$("#t-medrel").hidden) mdDesenhar(); }, 200); });
function mdBaixar(buf, nome){
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function mdExcel(){
  if (!MD.ultRel || !MD.ultRel.length) { toast("Não há dados para exportar.", true); return; }
  try {
    const P = mdPeriodo(MD.rPer), X = xlsxMini(), cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", wrap:false}, tit = {b:true, wrap:false};
    let r = 1, larg = 1;
    X.cel(r, 1, `Central de medições — ${P.rot} (${fData(P.de)} a ${fData(P.ate)}) · ${MD.rTipo === "mes" ? "dados mensais" : "dados diários"}`, tit); r += 2;
    MD.ultRel.forEach(R => {
      const T = mdTabela(R); larg = Math.max(larg, T.cab.length);
      X.cel(r++, 1, R.tipo, tit);
      X.cel(r, 1, "Consumo no período"); X.cel(r++, 2, R.diasCom ? `${mdF(R.total, 2)} ${R.un}` : "—");
      X.cel(r, 1, "Média diária"); X.cel(r++, 2, R.diasCom ? `${mdF(R.total / R.diasCom, 2)} ${R.un}/dia` : "—");
      X.cel(r, 1, "Valor das contas no período"); X.cel(r++, 2, R.valorPer !== null ? fBRL(R.valorPer) : "sem valor informado");
      T.cab.forEach((c, j) => X.cel(r, j + 1, c, cab)); r++;
      T.linhas.slice().reverse().forEach(l => { l.forEach((v, j) => X.cel(r, j + 1, j === 0 ? (R.modo === "mes" ? mdRotMes(v) : fData(v)) : v === null ? "" : Math.round(v * 100) / 100, j ? {h:"right", num:/R\$/.test(T.cab[j]) ? '"R$" #,##0.00' : "#,##0.00"} : {})); r++; });
      r++;
    });
    for (let j = 1; j <= larg; j++) X.col(j, j === 1 ? 28 : 20);
    mdBaixar(X.gerar("Medicoes"), `Medicoes - Pier ${hoje()}.xlsx`);
    registrarTela("exportar_medicoes", P.rot);
  } catch(e){ toast(e.message || "Não foi possível gerar a planilha.", true); }
}
function mdPDF(){
  if (!MD.ultRel || !MD.ultRel.length) { toast("Não há dados para o relatório.", true); return; }
  const P = mdPeriodo(MD.rPer);
  registrarTela("imprimir_medicoes", P.rot);
  const tmp = document.createElement("div");
  const corpo = MD.ultRel.map(R => { const T = mdTabela(R), fmtC = (v, j) => v === null ? "—" : j === 0 ? (R.modo === "mes" ? mdRotMes(v) : fData(v)) : /R\$/.test(T.cab[j]) ? fBRL(v) : mdF(v, 2);
    tmp.innerHTML = mdCards(R);
    const kpis = [...tmp.querySelectorAll(".pp-card")].map(c => `<div class="k"><span>${esc(c.querySelector(".pp-rot").textContent)}</span><b>${esc(c.querySelector(".pp-v").textContent)}</b><small>${esc(c.querySelector(".pp-sub").textContent)}</small></div>`).join("");
    return `<h2>${esc(R.tipo)} <small>${esc(R.meds.map(m => m.nome).join(", "))}</small></h2><div class="kpis">${kpis}</div>
      ${R.diasCom ? `<div class="leg">${R.series.map(s => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join("")}</div>${mdGrafSvg(R, 700)}` : ""}
      ${T.linhas.length ? `<table><tr>${T.cab.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${T.linhas.map(l => `<tr>${l.map((v, j) => `<td class="${j ? "n" : ""}">${fmtC(v, j)}</td>`).join("")}</tr>`).join("")}</table>` : `<p>Sem dados neste período.</p>`}`; }).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de medições - ${esc(P.rot)}</title><style>
    @page{size:A4;margin:12mm} body{font:11px Calibri,Arial,sans-serif;color:#1f2a37;margin:0}
    h1{font-size:16px;margin:0} .cab{border-bottom:3px solid #1f3a56;padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end}
    h2{font-size:13px;background:#1f3a56;color:#fff;padding:5px 7px;margin:14px 0 6px;break-after:avoid} h2 small{font-weight:normal;opacity:.85}
    .kpis{display:flex;gap:8px;margin-bottom:6px} .k{flex:1;border:1px solid #c9d4df;border-radius:6px;padding:6px 8px} .k span,.k small{display:block;color:#4b5b6b} .k b{font-size:15px}
    .leg{display:flex;gap:14px;justify-content:center;font-size:10px;color:#4b5b6b} .leg i{display:inline-block;width:18px;height:8px;margin-right:4px;border-radius:2px}
    svg{display:block;margin:0 auto 6px;break-inside:avoid} table{border-collapse:collapse;width:100%;margin-bottom:6px} th,td{border:1px solid #c9d4df;padding:3px 5px;text-align:left} th{background:#eef3f7;font-size:10px} td.n{text-align:right}
    .nota{font-size:10px;color:#455}
  </style></head><body>
    <div class="cab"><div><h1>PIER RESIDÊNCIAS — RELATÓRIO DE MEDIÇÕES</h1><div>${esc(P.rot)} · ${fData(P.de)} a ${fData(P.ate)} · ${MD.rTipo === "mes" ? "dados mensais" : "dados diários"}</div></div><div class="nota">Emitido em ${fData(hoje())} por ${esc(S.nome || "")}</div></div>
    ${corpo}
    <p class="nota">Consumo calculado pela diferença entre as leituras dos relógios; quando há dias sem leitura, o consumo é dividido igualmente entre eles. Valores em R$ conforme as contas lançadas.</p>
  </body></html>`;
  let fr = $("#md-print-frame"); if (fr) fr.remove();
  fr = document.createElement("iframe"); fr.id = "md-print-frame"; fr.setAttribute("aria-hidden", "true");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  fr.contentDocument.open(); fr.contentDocument.write(html); fr.contentDocument.close();
  setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch(e){ toast("Não foi possível abrir a impressão.", true); } }, 100);
  return html;
}

// ---- Importar do Excel ----
function mdAcharMed(txt){
  const t = norm(String(txt ?? "")).replace(/\s+/g, " ").trim(); if (!t) return null;
  const sem = t.replace(/[\s.-]/g, ""), L = MD.d.medidores;
  return L.find(m => norm(m.numero).replace(/[\s.-]/g, "") === sem) || L.find(m => norm(m.nome).trim() === t) || L.find(m => norm(`${m.tipo} · ${m.nome}`) === t || norm(`${m.tipo} - ${m.nome}`) === t) || null;
}
function mdMesPlan(v){
  if (typeof v === "number" || v instanceof Date) { const d = dataPlanilha(v); return d ? d.slice(0, 7) : ""; }
  const t = norm(String(v ?? "")).trim(); if (!t) return "";
  let m = /^(\d{4})-(\d{1,2})/.exec(t); if (m) return m[1] + "-" + m[2].padStart(2, "0");
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t); if (m) return (m[3].length === 2 ? "20" + m[3] : m[3]) + "-" + m[2].padStart(2, "0");
  m = /^(\d{1,2})[/-](\d{4}|\d{2})$/.exec(t); if (m) return (m[2].length === 2 ? "20" + m[2] : m[2]) + "-" + m[1].padStart(2, "0");
  m = /^([a-z]{3})[a-z]*[/ -]*(\d{4}|\d{2})$/.exec(t); if (m) { const i = PP_MESES.indexOf(m[1]); if (i >= 0) return (m[2].length === 2 ? "20" + m[2] : m[2]) + "-" + String(i + 1).padStart(2, "0"); }
  return "";
}
function mdLerPlanilha(F){
  if (!F) return null;
  const t = (r, c) => { const v = F.val(r, c); return v === undefined || v === null ? "" : v; };
  const n = s => norm(String(s)).replace(/\s+/g, " ").trim();
  let rc = -1, col = {};
  for (let r = F.r0; r <= Math.min(F.r1, F.r0 + 15) && rc < 0; r++) {
    const m = {};
    for (let c = F.c0; c <= F.c1; c++) {
      const h = n(t(r, c)); if (!h) continue;
      if (/^venc/.test(h)) m.venc = c; else if (/^(mes|referencia|competencia)/.test(h)) m.mes = c; else if (/^data/.test(h)) m.data = c;
      else if (/^(medidor|n.? ?do medidor|numero do medidor|hidrometro|relogio)/.test(h)) m.med = c; else if (/^leitura/.test(h)) m.leit = c;
      else if (/^consumo/.test(h)) m.cons = c; else if (/^valor/.test(h)) m.val = c; else if (/^obs/.test(h)) m.obs = c;
    }
    if ("med" in m && (("data" in m && "leit" in m) || (("mes" in m || "data" in m) && ("cons" in m || "val" in m)))) { rc = r; col = m; }
  }
  if (rc < 0) return null;
  const leituras = [], contas = [], avisos = [], modoL = "leit" in col;
  for (let r = rc + 1; r <= F.r1; r++) {
    const medT = t(r, col.med), linha = r + 1;
    const vazia = !String(medT).trim() && (modoL ? String(t(r, col.leit)).trim() === "" : String(t(r, col.cons ?? -1)).trim() === "" && String(t(r, col.val ?? -1)).trim() === "");
    if (vazia) continue;
    const m = mdAcharMed(medT);
    if (!m) { avisos.push(`Linha ${linha}: medidor "${String(medT).trim() || "(vazio)"}" não cadastrado.`); continue; }
    const obs = "obs" in col ? String(t(r, col.obs)).trim() : "";
    if (modoL) {
      const lt = t(r, col.leit); if (String(lt).trim() === "") continue;
      const data = dataPlanilha(t(r, col.data)), v = mdNum(lt);
      if (!data) { avisos.push(`Linha ${linha}: data inválida.`); continue; }
      if (isNaN(v) || v < 0) { avisos.push(`Linha ${linha}: leitura inválida.`); continue; }
      leituras.push({_linha:linha, medidor:m.id, data, leitura:v, obs, _m:m});
    } else {
      const mes = "mes" in col ? mdMesPlan(t(r, col.mes)) : (dataPlanilha(t(r, col.data)) || "").slice(0, 7);
      if (!mes) { avisos.push(`Linha ${linha}: mês inválido.`); continue; }
      const c = "cons" in col ? t(r, col.cons) : "", v = "val" in col ? t(r, col.val) : "";
      const cn = String(c).trim() === "" ? "" : mdNum(c), vn = String(v).trim() === "" ? "" : mdNum(v);
      if ((cn !== "" && isNaN(cn)) || (vn !== "" && isNaN(vn))) { avisos.push(`Linha ${linha}: consumo ou valor inválido.`); continue; }
      contas.push({_linha:linha, medidor:m.id, mes, consumo:cn, valor:vn, vencimento:"venc" in col ? dataPlanilha(t(r, col.venc)) : "", obs, _m:m});
    }
  }
  return {leituras, contas, avisos};
}
// planilha no modelo do Pier (CONTROLE HIDRÔMETROS): linha com DIA e o nome de cada medidor; embaixo, LEITURA, DIFERENÇA, ACUMULADO PERÍODO...
// Lê só as colunas LEITURA (0 ou vazio = dia sem leitura). Onde o "acumulado período" recomeça, a leitura do dia anterior
// foi a da concessionária (as linhas verdes da planilha).
function mdLerGrade(F){
  if (!F) return null;
  const t = (r, c) => { const v = F.val(r, c); return v === undefined || v === null ? "" : v; };
  const n = s => norm(String(s)).replace(/\s+/g, " ").trim();
  for (let r = F.r0; r <= Math.min(F.r1 - 1, F.r0 + 20); r++) {
    let cd = -1; for (let c = F.c0; c <= F.c1; c++) { const h = n(t(r, c)); if (h === "dia" || h === "data") { cd = c; break; } }
    if (cd < 0) continue;
    const sub = r + 1, cols = [];
    for (let c = cd + 1; c <= F.c1; c++) if (/^leitura/.test(n(t(sub, c)))) cols.push(c);
    if (!cols.length) continue;
    let cObs = -1; for (let c = cd + 1; c <= F.c1; c++) if (/^observ/.test(n(t(r, c))) || /^observ/.test(n(t(sub, c)))) cObs = c;
    const blocos = cols.map((c, k) => {
      let nome = ""; for (let x = c; x > cd && !nome; x--) nome = String(t(r, x)).trim();
      const fim = k + 1 < cols.length ? cols[k + 1] : F.c1 + 1;
      let cAc = -1; for (let x = c + 1; x < fim; x++) if (/^acumulado periodo|^acum\.? ciclo/.test(n(t(sub, x)))) cAc = x;
      return {c, nome:nome || `Coluna ${k + 1}`, cAc, linhas:[]};
    });
    for (let rr = sub + 1; rr <= F.r1; rr++) {
      const data = dataPlanilha(t(rr, cd)); if (!data) continue;
      let obs = cObs >= 0 ? String(t(rr, cObs)).trim() : "";
      blocos.forEach(b => {
        const v = t(rr, b.c), num = typeof v === "number" ? v : mdNum(v);
        if (String(v).trim() === "" || !(num > 0)) return;
        b.linhas.push({_linha:rr + 1, data, leitura:num, obs, ac:b.cAc >= 0 ? mdNum(t(rr, b.cAc)) : NaN}); obs = "";
      });
    }
    blocos.forEach(b => {
      if (b.cAc >= 0) for (let i = 1; i < b.linhas.length; i++) { const a = b.linhas[i - 1], x = b.linhas[i]; if (!isNaN(a.ac) && !isNaN(x.ac) && x.ac < a.ac && mdDiasEntre(a.data, x.data) === 1) a.ciclo = true; }
      b.linhas.forEach(l => delete l.ac);
    });
    return {blocos:blocos.filter(b => b.linhas.length)};
  }
  return null;
}
// medidor com o mesmo nome (ou contido no nome da coluna: "GUARITA SUL - NAUTICA" → "Guarita sul") ou com o mesmo número
function mdAutoMed(nome){
  const t = norm(nome).replace(/\s+/g, " ").trim(), sem = t.replace(/[\s.-]/g, ""); if (!t) return null;
  const L = MD.d.medidores.filter(m => m.ativo !== "Não").concat(MD.d.medidores.filter(m => m.ativo === "Não"));
  return L.find(m => norm(m.nome).trim() === t) || L.find(m => norm(m.numero).replace(/[\s.-]/g, "") === sem)
    || L.filter(m => { const k = norm(m.nome).trim(); return k && (t.includes(k) || k.includes(t)); }).sort((a, b) => b.nome.length - a.nome.length)[0] || null;
}
// planilha de controle no mesmo modelo (dia a dia do ano, com leitura, diferença, acumulados e as leituras da concessionária em verde)
function mdControle(){
  if (!MD.d) return;
  try {
    const ano = hoje().slice(0, 4), de = ano + "-01-01", ate = ano + "-12-31", h = hoje();
    let meds = mdOrdem(MD.d.medidores).filter(m => (!MD.fMed || m.id === MD.fMed) && (m.ativo !== "Não" || MD.d.leituras.some(l => l.medidor === m.id && l.data >= de)));
    if (!meds.length) { toast("Nenhum medidor para exportar.", true); return; }
    const X = xlsxMini(), VERDE = "FF92D050", AZUL = "FFDDEBF7";
    const cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", h:"center"}, sub = {b:true, fill:"FFD9E1F2", h:"center", size:9};
    const blocos = meds.map(m => ({m, cols:["LEITURA", "DIFERENÇA"].concat(mdTemCiclo(m) ? ["ACUM. CICLO CONCESSIONÁRIA"] : [], mdLim(m) ? [`EXCEDENTE DE ${mdF(mdLim(m))}${m.unidade} DIÁRIO`] : [], ["ACUM. MÊS", "ACUM. ANO"])}));
    const ncol = 1 + blocos.reduce((a, b) => a + b.cols.length, 0) + 1;
    X.cel(1, 1, `CONTROLE DE MEDIÇÕES — PIER RESIDÊNCIAS — ${ano}`, {b:true, size:14, h:"center", borda:false}); X.merge(1, 1, 1, ncol);
    X.cel(3, 1, "LEITURA DA CONCESSIONÁRIA (fim/início do ciclo)", {fill:VERDE, b:true}); X.merge(3, 1, 3, 3);
    X.cel(4, 1, "INÍCIO DO MÊS", {fill:AZUL, b:true}); X.merge(4, 1, 4, 3);
    X.cel(6, 1, "DIA", cab); X.cel(7, 1, "", cab); X.merge(6, 1, 7, 1); X.col(1, 12);
    let c = 2;
    blocos.forEach(b => {
      b.c0 = c;
      X.cel(6, c, `${b.m.nome.toUpperCase()} (nº ${b.m.numero} · ${b.m.unidade})`, cab);
      for (let j = 1; j < b.cols.length; j++) X.cel(6, c + j, "", cab);
      X.merge(6, c, 6, c + b.cols.length - 1);
      b.cols.forEach((k, j) => { X.cel(7, c + j, k, sub); X.col(c + j, j === 0 ? 12 : 13); });
      c += b.cols.length;
    });
    X.cel(6, c, "OBSERVAÇÕES", cab); X.cel(7, c, "", cab); X.merge(6, c, 7, c); X.col(c, 36);
    X.row(7, 30);
    const porDia = new Map(); MD.d.leituras.forEach(l => { if (l.data >= de && l.data <= ate) porDia.set(l.medidor + "|" + l.data, l); });
    const ultDado = blocos.map(b => { const ls = mdInt(b.m).ls; return ls.length ? ls[ls.length - 1].data : ""; });
    const N2 = "#,##0.00", NL = "#,##0.0##";
    mdDias(de, ate).forEach((d, i) => {
      const r = 8 + i, l1 = d.slice(8) === "01", ciclos = [];
      const obs = [];
      blocos.forEach((b, k) => {
        const m = b.m, l = porDia.get(m.id + "|" + d), mp = mdDiario(m), passado = d <= (ultDado[k] || "") && d <= h;
        if (l && l.ciclo === "Sim") ciclos.push(k);
        if (l && l.obs) obs.push(blocos.length > 1 ? `${m.nome}: ${l.obs}` : l.obs);
        const est = l && l.ciclo === "Sim" ? {fill:VERDE, h:"right", num:NL} : {h:"right", num:NL};
        X.cel(r, b.c0, l ? l.leitura : "", est);
        const dif = mp.has(d) ? Math.round(mp.get(d) * 100) / 100 : null;
        let j = 1;
        X.cel(r, b.c0 + j++, passado && dif !== null ? dif : "", {h:"right", num:N2});
        if (mdTemCiclo(m)) { const ac = passado ? mdAcumCiclo(m, d) : null; X.cel(r, b.c0 + j++, ac && dif !== null ? Math.round(ac.s * 100) / 100 : "", {h:"right", num:N2}); }
        if (mdLim(m)) { const sobra = dif !== null && passado ? Math.round((mdLim(m) - dif) * 100) / 100 : ""; X.cel(r, b.c0 + j++, sobra, sobra !== "" && sobra < 0 ? {h:"right", num:N2, cor:"FFC00000", b:true} : {h:"right", num:N2}); }
        X.cel(r, b.c0 + j++, passado ? Math.round(mdSomaFaixa(m, d.slice(0, 8) + "01", d).s * 100) / 100 : "", {h:"right", num:N2});
        X.cel(r, b.c0 + j++, passado ? Math.round(mdSomaFaixa(m, de, d).s * 100) / 100 : "", {h:"right", num:N2});
      });
      X.cel(r, 1, fData(d), ciclos.length ? {fill:VERDE, h:"center"} : l1 ? {fill:AZUL, h:"center", b:true} : {h:"center"});
      X.cel(r, c, obs.join(" · "));
    });
    mdBaixar(X.gerar(ano), `Controle de medicoes ${ano} - Pier.xlsx`);
    registrarTela("exportar_medicoes", `Planilha de controle ${ano}`);
  } catch(e){ toast(e.message || "Não foi possível gerar a planilha.", true); }
}
async function mdImportar(file){
  if (!file || !MD.d) return;
  if (!/\.xlsx$/i.test(file.name)) { toast("Escolha uma planilha .xlsx.", true); return; }
  if (!MD.d.medidores.length) { toast("Cadastre os medidores em Meus medidores antes de importar.", true); return; }
  let abas;
  try {
    const buf = await file.arrayBuffer();
    try { abas = await xlsxLer(buf); }
    catch(e){ if (!e || !e.semLeitor) throw e; await carregarXLSX(); const wb = XLSX.read(buf, {type:"array"}); abas = wb.SheetNames.map(nm => ({nome:nm, folha:xlsxFolhaSheetJS(wb.Sheets[nm])})); }
  } catch(e){ toast(e.message || "Não foi possível ler a planilha.", true); return; }
  const L = [], C = [], A = [], usadas = [], G = [];
  abas.forEach(a => {
    const g = mdLerGrade(a.folha);
    if (g && g.blocos.length) { usadas.push(a.nome); g.blocos.forEach(b => { const ja = G.find(x => norm(x.nome) === norm(b.nome)); if (ja) ja.linhas.push(...b.linhas); else G.push(b); }); return; }
    const r = mdLerPlanilha(a.folha); if (!r) return; usadas.push(a.nome); r.leituras.forEach(x => L.push(x)); r.contas.forEach(x => C.push(x)); r.avisos.forEach(x => A.push(`${a.nome} · ${x}`));
  });
  if (!usadas.length) { toast("Não encontrei as colunas. Use a planilha de controle (DIA e LEITURA de cada medidor) ou o modelo: Data, Medidor e Leitura (diário) ou Mês, Medidor, Consumo e Valor (mensal).", true); return; }
  if (G.length) return mdImportarGrade(G, usadas);
  if (!L.length && !C.length) { toast(A.length ? A.slice(0, 3).join(" ") : "A planilha não tem lançamentos.", true); return; }
  const porMed = new Map(); L.concat(C).forEach(x => porMed.set(x._m.id, (porMed.get(x._m.id) || 0) + 1));
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar lançamentos</h3>
    <p>Aba${usadas.length > 1 ? "s" : ""} <b>${usadas.map(esc).join(", ")}</b>: <b>${L.length}</b> leitura${L.length === 1 ? "" : "s"} e <b>${C.length}</b> conta${C.length === 1 ? "" : "s"} mensa${C.length === 1 ? "l" : "is"}.</p>
    <div class="tablebox flat"><table><thead><tr><th>Medidor</th><th class="num">Linhas</th></tr></thead><tbody>${[...porMed].map(([id, q]) => { const m = mdMed(id); return `<tr><td>${esc(m.tipo)} · ${esc(m.nome)} (nº ${esc(m.numero)})</td><td class="num">${q}</td></tr>`; }).join("")}</tbody></table></div>
    ${A.length ? `<p class="hint err">${A.slice(0, 6).map(esc).join("<br>")}${A.length > 6 ? `<br>+ ${A.length - 6} aviso(s)` : ""}</p><p class="hint">As linhas com aviso ficam de fora.</p>` : ""}
    <div class="notice warn">As leituras são conferidas uma a uma: as que já estavam lançadas (mesmo medidor, data e número) são puladas; leituras menores que a anterior só entram quando a queda indica que o relógio virou. Contas do mesmo mês e medidor são atualizadas.</div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="mi-ok">Importar</button><button class="btn" type="button" id="mi-no">Cancelar</button><span class="hint" id="mi-msg"></span></div>`;
  $("#modal").hidden = false; $("#mi-no").onclick = fecharModal;
  const tira = x => { const o = Object.assign({}, x); delete o._m; return o; };
  $("#mi-ok").onclick = () => enviar($("#mi-ok"), $("#mi-msg"), "medImportar", {leituras:L.map(tira), contas:C.map(tira)}, r => { mdAplicar(r); fecharModal(); renderMedTudo(); });
}
// prévia da planilha de controle: cada coluna LEITURA vira um medidor (escolhido aqui; já vem o de mesmo nome)
function mdImportarGrade(G, usadas){
  const meds = mdOrdem(MD.d.medidores), fx = l => { const ds = l.map(x => x.data).sort(); return ds.length ? `${fData(ds[0])} a ${fData(ds[ds.length - 1])}` : "—"; };
  G.forEach(b => { b.sel = (mdAutoMed(b.nome) || {}).id || ""; });
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar a planilha de controle</h3>
    <p>Aba${usadas.length > 1 ? "s" : ""} <b>${usadas.map(esc).join(", ")}</b>. Confira o medidor de cada coluna de leitura (dias com 0 ou em branco ficam de fora):</p>
    <div class="tablebox flat"><table><thead><tr><th>Coluna da planilha</th><th class="num">Leituras</th><th class="hide-s">Período</th><th class="num hide-s">Da concessionária</th><th>Medidor no sistema</th></tr></thead><tbody>
      ${G.map((b, i) => `<tr><td><b>${esc(b.nome)}</b></td><td class="num">${b.linhas.length}</td><td class="hide-s">${fx(b.linhas)}</td><td class="num hide-s">${b.linhas.filter(x => x.ciclo).length || "—"}</td>
        <td><select class="input md-gsel" style="min-width:200px" data-gm="${i}" aria-label="Medidor da coluna ${esc(b.nome)}"><option value="">— não importar —</option>${meds.map(m => `<option value="${esc(m.id)}" ${m.id === b.sel ? "selected" : ""}>${esc(m.nome)} (${esc(m.tipo)} · nº ${esc(m.numero)})</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>
    <p class="hint">As leituras que já estão no sistema (mesmo medidor, data e número) são puladas. Os dias em verde da planilha (leitura da concessionária) são marcados para o acumulado do ciclo.</p>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="mi-ok">Importar</button><button class="btn" type="button" id="mi-no">Cancelar</button><span class="hint" id="mi-msg"></span></div>`;
  $("#modal").hidden = false; $("#mi-no").onclick = fecharModal;
  $$("#modal-box [data-gm]").forEach(s => s.onchange = () => { G[+s.dataset.gm].sel = s.value; });
  $("#mi-ok").onclick = () => {
    const usados = G.filter(b => b.sel), msg = $("#mi-msg");
    if (!usados.length) { msg.className = "hint err"; msg.textContent = "Escolha o medidor de ao menos uma coluna."; return; }
    if (new Set(usados.map(b => b.sel)).size < usados.length) { msg.className = "hint err"; msg.textContent = "Duas colunas estão com o mesmo medidor."; return; }
    const leituras = usados.flatMap(b => b.linhas.map(l => Object.assign({}, l, {medidor:b.sel})));
    enviar($("#mi-ok"), msg, "medImportar", {leituras}, r => { mdAplicar(r); fecharModal(); renderMedTudo(); });
  };
}
function mdModelo(){
  if (MD.vista !== "mes") return mdControle();
  if (!MD.d) return;
  try {
    const X = xlsxMini(), cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", wrap:false}, meds = mdOrdem(MD.d.medidores).filter(m => m.ativo !== "Não");
    if (MD.vista === "mes") {
      [["Mês",12],["Medidor",22],["Consumo",14],["Valor (R$)",14],["Vencimento",14],["Observação",30]].forEach(([c, w], j) => { X.cel(1, j + 1, c, cab); X.col(j + 1, w); });
      const mes = mdMesAnterior().split("-").reverse().join("/");
      meds.forEach((m, i) => { X.cel(i + 2, 1, mes); X.cel(i + 2, 2, m.numero); });
      mdBaixar(X.gerar("Contas"), "Modelo contas mensais - Pier.xlsx");
    } else {
      [["Data",12],["Medidor",22],["Leitura",14],["Observação",30]].forEach(([c, w], j) => { X.cel(1, j + 1, c, cab); X.col(j + 1, w); });
      meds.forEach((m, i) => { X.cel(i + 2, 1, fData(hoje())); X.cel(i + 2, 2, m.numero); });
      mdBaixar(X.gerar("Leituras"), "Modelo leituras - Pier.xlsx");
    }
  } catch(e){ toast(e.message || "Não foi possível gerar o modelo.", true); }
}
if ($("#t-medlanc")) {
  $("#ml-vistas").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b) { MD.vista = b.dataset.v; renderMedLanc(); } });
  $("#ml-med").addEventListener("change", ev => { MD.fMed = ev.target.value; renderMedLanc(); });
  $("#ml-per").addEventListener("change", ev => { MD.fPer = ev.target.value; renderMedLanc(); });
  $("#ml-novo").addEventListener("click", () => MD.vista === "mes" ? mdNovaConta({medidor:MD.fMed}) : mdNovaLeitura({medidor:MD.fMed}));
  $("#ml-importar").addEventListener("click", () => $("#ml-arq").click());
  $("#ml-arq").addEventListener("change", ev => { const f = ev.target.files[0]; ev.target.value = ""; mdImportar(f); });
  $("#ml-modelo").addEventListener("click", mdModelo);
  $("#md-novo").addEventListener("click", () => mdEditarMedidor(null));
  $("#mr-per").addEventListener("change", ev => { MD.rPer = ev.target.value; renderMedRel(); });
  $("#mr-tipo").addEventListener("change", ev => { MD.rTipo = ev.target.value; renderMedRel(); });
  $("#mr-excel").addEventListener("click", mdExcel);
  $("#mr-pdf").addEventListener("click", mdPDF);
  document.addEventListener("click", ev => {
    const el = ev.target.closest("[data-ml-ed],[data-ml-del],[data-md-ler],[data-md-ed],[data-md-del],[data-md-rel],[data-mr-vis],[data-mr-todos],[data-mr-m]");
    if (!el || !el.closest("#t-medlanc, #t-medidores, #t-medrel")) return;
    const d = el.dataset;
    if (d.mlEd) { const [tp, id] = d.mlEd.split(":"); if (tp === "l") mdNovaLeitura({id}); else mdNovaConta({id}); }
    else if (d.mlDel) mdExcluir(el);
    else if (d.mdLer) mdNovaLeitura({medidor:d.mdLer});
    else if (d.mdEd) mdEditarMedidor(d.mdEd);
    else if (d.mdDel) { if (!el.dataset.conf) { el.dataset.conf = "1"; el.textContent = "excluir?"; return; } enviar(el, null, "medMedidor", {op:"excluir", medidor:{id:d.mdDel}}, r => { mdAplicar(r); renderMedTudo(); }); }
    else if (d.mdRel) { const m = mdMed(d.mdRel); if (m) { MD.rSel[m.tipo] = [m.id]; setTab("medrel"); } }
    else if (d.mrVis) { MD.rVis[d.tipo] = d.mrVis; renderMedRel(); }
    else if (d.mrTodos) { MD.rSel[d.mrTodos] = []; renderMedRel(); }
    else if (d.mrM) { const s = new Set(MD.rSel[d.tipo] || []); if (s.has(d.mrM)) s.delete(d.mrM); else s.add(d.mrM); MD.rSel[d.tipo] = [...s]; renderMedRel(); }
  });
}

// ---------- espaços: reservas (lidas dos e-mails da administradora), checklist de entrega/devolução e cadastro (só Administração) ----------
const ES = { d:null, carregando:false, erro:"", em:0, vista:"proximas", fEsp:"", q:"" };
const ES_ITENS = ["Chaves entregues / devolvidas","Limpeza do salão e dos banheiros","Louças, copos e talheres (quantidade)","Geladeira e freezer","Fogão, forno e cooktop","Churrasqueira","Mesas e cadeiras","Ar-condicionado e ventiladores","Iluminação e tomadas","Som e TV","Lixo retirado","Paredes, piso, vidros e mobiliário sem danos"];
const ES_ST = ["Solicitada","Pré-reserva","Confirmada","Cancelada","Recusada","Realizada"];
const ES_COR = {"Solicitada":"ambar","Pré-reserva":"ambar","Confirmada":"ok","Cancelada":"cinza","Recusada":"verm","Realizada":"conc"};
const esAtiva = r => r.status !== "Cancelada" && r.status !== "Recusada";
const esValor = r => { if (r.valor !== "" && r.valor !== undefined && r.valor !== null) return Number(r.valor); const e = ES.d && ES.d.espacos.find(x => x.nome === r.espaco); return e && e.valor !== "" && e.valor !== undefined ? Number(e.valor) : null; };
const esUn = r => [r.bloco, r.unidade ? "Unid. " + r.unidade : ""].filter(Boolean).join(" · ") || "—";
const esDiaSem = d => ["dom","seg","ter","qua","qui","sex","sáb"][new Date(d + "T12:00:00").getDay()] || "";
const esVist = (r, fase) => ES.d.vistorias.find(v => v.reserva === r.id && v.fase === fase);
function esLimpar(){ ES.d = null; ES.erro = ""; }
function esAplicar(r){ if (!r || !Array.isArray(r.reservas)) return false; ES.d = {espacos:r.espacos || [], reservas:r.reservas, vistorias:r.vistorias || []}; ES.em = Date.now(); esBadge(); return true; }
async function carregarEsp(forcar){
  if (!TEM_ADM || !S.token || ES.carregando || !["esreservas","esvistorias","esespacos"].some(podeAba)) return;
  if (!forcar && ES.d && Date.now() - ES.em < 60000) { renderEspTudo(); return; }
  ES.carregando = true;
  try { esAplicar(await api("espacos")); ES.erro = ""; } catch(e){ ES.erro = e.message; toast(e.message, true); }
  finally { ES.carregando = false; renderEspTudo(); }
}
function renderEspTudo(){ renderEsReservas(); renderEsVistorias(); renderEsEspacos(); }
function esCarregando(box){
  if (ES.erro && !ES.d) { box.innerHTML = `<div class="notice crit">${esc(ES.erro)}${/desconhecida/i.test(ES.erro) ? " Os Espaços precisam do Apps Script novo (colar o código e implantar uma nova versão)." : ""}</div>`; return true; }
  if (!ES.d) { box.innerHTML = `<div class="empty"><span class="spin" aria-hidden="true"></span> Carregando…</div>`; return true; }
  return false;
}
// pré-reservas e solicitações ainda por confirmar (data de hoje em diante)
function esBadge(){ const b = $("#b-esp"); if (!b || !ES.d) return; const n = ES.d.reservas.filter(r => (r.status === "Pré-reserva" || r.status === "Solicitada") && r.data >= hoje()).length; b.textContent = n; b.hidden = !n; menuBadges(); }
// ---- Reservas ----
function renderEsReservas(){
  const sec = $("#t-esreservas"); if (!sec || sec.hidden) return;
  $$("#er-vistas [data-v]").forEach(b => b.setAttribute("aria-selected", b.dataset.v === ES.vista ? "true" : "false"));
  const box = $("#er-corpo"); if (esCarregando(box)) return;
  const h = hoje(), L = ES.d.reservas;
  $("#er-esp").innerHTML = `<option value="">Todos os espaços</option>` + ES.d.espacos.map(e => `<option ${e.nome === ES.fEsp ? "selected" : ""}>${esc(e.nome)}</option>`).join("");
  const pend = r => r.status === "Pré-reserva" || r.status === "Solicitada";
  const nV = {proximas:L.filter(r => r.data >= h && esAtiva(r)).length, pendentes:L.filter(r => pend(r) && r.data >= h).length};
  $$("#er-vistas [data-v]").forEach(b => { const n = nV[b.dataset.v]; b.querySelector(".badge") && (b.querySelector(".badge").textContent = n || "", b.querySelector(".badge").hidden = !n); });
  const q = norm(ES.q).trim();
  const vis = L.filter(r => (ES.vista === "proximas" ? r.data >= h && esAtiva(r) : ES.vista === "pendentes" ? pend(r) && r.data >= h : ES.vista === "passadas" ? r.data < h : true)
    && (!ES.fEsp || r.espaco === ES.fEsp) && (!q || norm([r.solicitacao, r.bloco, r.unidade, r.espaco, r.obs].join(" ")).includes(q)));
  if (ES.vista === "passadas" || ES.vista === "todas") vis.reverse();
  const conflito = r => esAtiva(r) && L.some(x => x !== r && esAtiva(x) && x.espaco === r.espaco && x.data === r.data);
  const soma = vis.filter(esAtiva).reduce((a, r) => a + (esValor(r) || 0), 0);
  $("#er-conta").textContent = `${vis.length} reserva${vis.length === 1 ? "" : "s"}${soma ? " · " + fBRL(soma) : ""}`;
  const vi = (r, f) => { const v = esVist(r, f); return v ? `<span class="md-st ${Number(v.problemas) ? "verm" : "ok"}" title="${esc(f)} feita em ${fDataHora(v.feitoEm)}">${f === "Entrega" ? "Entrega" : "Devolução"} ${Number(v.problemas) ? "· " + v.problemas + " problema(s)" : "✓"}</span>` : ""; };
  box.innerHTML = `<div class="tablebox md-hist"><table><thead><tr><th>Data</th><th>Espaço</th><th>Bloco / unidade</th><th class="hide-s">Solicitação</th><th class="num">Valor</th><th>Status</th><th class="hide-m">Checklist</th><th>Ações</th></tr></thead><tbody>
    ${vis.length ? vis.map(r => `<tr><td class="md-nw"><b>${fData(r.data)}</b><span class="sub">${esDiaSem(r.data)}${r.data === h ? " · hoje" : ""}</span></td><td>${esc(r.espaco)}</td><td>${esc(esUn(r))}</td>
      <td class="hide-s mono">${esc(r.solicitacao || "—")}<span class="sub">${esc(r.origem === "e-mail" ? "pelo e-mail" : r.origem === "colado" ? "e-mail colado" : "manual")}</span></td>
      <td class="num md-nw">${esValor(r) !== null ? fBRL(esValor(r)) : "—"}</td><td><span class="md-st ${ES_COR[r.status] || "cinza"}">${esc(r.status)}</span>${conflito(r) ? `<span class="md-st verm" title="Outra reserva ativa no mesmo espaço e dia">conflito de data</span>` : ""}</td>
      <td class="hide-m">${vi(r, "Entrega")}${vi(r, "Devolução")}${!esVist(r, "Entrega") && !esVist(r, "Devolução") ? "—" : ""}</td>
      <td class="md-ac">${pend(r) ? `<button type="button" class="btn small primary" data-er-conf="${esc(r.id)}">Confirmar</button>` : ""}${esAtiva(r) ? `<button type="button" class="btn small" data-er-vist="${esc(r.id)}">Checklist</button>` : ""}<button type="button" class="md-ib" data-er-ed="${esc(r.id)}" title="Editar" aria-label="Editar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg></button></td></tr>`).join("")
      : `<tr><td colspan="8"><div class="empty">Nenhuma reserva aqui. As reservas entram sozinhas pelos e-mails da administradora, ou use <b>Colar e-mail</b> / <b>+ Nova reserva</b>.</div></td></tr>`}</tbody></table></div>`;
}
function esEditar(id){
  const r = id ? ES.d.reservas.find(x => x.id === id) : null, v = r || {espaco:(ES.d.espacos[0] || {}).nome || "Espaço Gourmet", data:hoje(), status:"Confirmada"};
  $("#modal-box").innerHTML = `<h3>${r ? "Reserva" + (r.solicitacao ? " " + esc(r.solicitacao) : "") : "Nova reserva"}</h3>
    <form class="form" id="er-f" novalidate autocomplete="off">
      <div class="field"><label for="er-e">Espaço</label><input class="input" id="er-e" list="er-dl" value="${esc(v.espaco || "")}" maxlength="60"><datalist id="er-dl">${ES.d.espacos.map(e => `<option>${esc(e.nome)}</option>`).join("")}</datalist></div>
      <div class="field"><label for="er-d">Data <span class="req">*</span></label><input class="input" type="date" id="er-d" value="${esc(v.data || "")}"></div>
      <div class="field"><label for="er-b">Bloco</label><input class="input" id="er-b" value="${esc(v.bloco || "")}" maxlength="60" placeholder="Ex.: BL 06 - MYCONOS"></div>
      <div class="field"><label for="er-u">Unidade</label><input class="input" id="er-u" value="${esc(v.unidade || "")}" maxlength="20"></div>
      <div class="field"><label for="er-s">Nº da solicitação</label><input class="input mono" id="er-s" value="${esc(v.solicitacao || "")}" maxlength="20"></div>
      <div class="field"><label for="er-v">Valor (R$)</label><input class="input num" id="er-v" inputmode="decimal" value="${esValor(v) !== null ? esc(String(esValor(v)).replace(".", ",")) : ""}"></div>
      <div class="field"><label for="er-st">Status</label><select class="input" id="er-st">${ES_ST.map(s => `<option ${s === v.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field full"><label for="er-o">Observação</label><input class="input" id="er-o" value="${esc(v.obs || "")}" maxlength="300"></div>
    </form>
    <div class="actions"><button class="btn primary" type="button" id="er-ok">Salvar</button><button class="btn" type="button" id="er-x">Cancelar</button>${r ? `<button class="link danger" type="button" id="er-del">Excluir reserva</button>` : ""}<span class="hint" id="er-msg"></span></div>`;
  $("#modal").hidden = false; $("#er-x").onclick = fecharModal;
  const fim = x => { if (esAplicar(x)) { fecharModal(); renderEspTudo(); } };
  $("#er-ok").onclick = () => enviar($("#er-ok"), $("#er-msg"), "espReserva", {reserva:Object.assign(r ? {id:r.id} : {}, {espaco:$("#er-e").value, data:$("#er-d").value, bloco:$("#er-b").value, unidade:$("#er-u").value, solicitacao:$("#er-s").value, status:$("#er-st").value, obs:$("#er-o").value, valor:$("#er-v").value.trim() === "" ? "" : mdNum($("#er-v").value)})}, fim);
  if ($("#er-del")) $("#er-del").onclick = ev => { const b = ev.target; if (!b.dataset.conf) { b.dataset.conf = "1"; b.textContent = "Confirmar exclusão"; return; } enviar(b, $("#er-msg"), "espReserva", {op:"excluir", reserva:{id:r.id}}, fim); };
}
function esColar(){
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Colar e-mail de reserva</h3>
    <p class="muted">Abra o e-mail da reserva, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui.</p>
    <textarea class="input" id="ec-t" rows="9" placeholder="Reserva - PRÉ RESERVA ESPAÇO GOURMET&#10;Bloco: …&#10;Unidade: …&#10;Número da Solicitação: …"></textarea>
    <div id="ec-prev" class="hint" style="margin-top:8px"></div>
    <div class="actions" style="margin-top:12px"><button class="btn" type="button" id="ec-ler">Ler</button><button class="btn primary" type="button" id="ec-ok" disabled>Cadastrar</button><button class="btn" type="button" id="ec-x">Cancelar</button><span class="hint" id="ec-msg"></span></div>`;
  $("#modal").hidden = false; $("#ec-x").onclick = fecharModal; $("#ec-t").focus();
  $("#ec-t").oninput = () => { $("#ec-ok").disabled = true; $("#ec-prev").innerHTML = ""; };
  $("#ec-ler").onclick = async () => {
    const r = await enviar($("#ec-ler"), $("#ec-msg"), "espColar", {texto:$("#ec-t").value, previa:true});
    if (!r || !r.lida) return; $("#ec-msg").textContent = "";
    const x = r.lida, ja = ES.d.reservas.find(z => String(z.solicitacao) === x.solicitacao);
    $("#ec-prev").innerHTML = `<div class="notice">${ja ? `<b>Já cadastrada</b> (status atual: ${esc(ja.status)}) — vai ser atualizada.<br>` : ""}Solicitação <b>${esc(x.solicitacao)}</b> · <b>${esc(x.espaco)}</b> · ${x.data ? fData(x.data) : "sem data"} · ${esc([x.bloco, x.unidade && "Unid. " + x.unidade].filter(Boolean).join(" · "))} · status <b>${esc(x.status)}</b></div>`;
    $("#ec-ok").disabled = false;
  };
  $("#ec-ok").onclick = () => enviar($("#ec-ok"), $("#ec-msg"), "espColar", {texto:$("#ec-t").value}, x => { if (esAplicar(x)) { fecharModal(); renderEspTudo(); } });
}
// ---- Checklist (vistoria de entrega e devolução) ----
function renderEsVistorias(){
  const sec = $("#t-esvistorias"); if (!sec || sec.hidden) return;
  const box = $("#ev-corpo"); if (esCarregando(box)) return;
  const h = hoje(), ini = mdSomaDia(h, -7), fim = mdSomaDia(h, 2);
  const fazer = ES.d.reservas.filter(r => esAtiva(r) && r.status !== "Realizada" && r.data >= ini && r.data <= fim)
    .flatMap(r => [!esVist(r, "Entrega") ? {r, f:"Entrega"} : null, r.data <= h && !esVist(r, "Devolução") ? {r, f:"Devolução"} : null].filter(Boolean));
  const V = ES.d.vistorias, R = id => ES.d.reservas.find(x => x.id === id);
  box.innerHTML = `<h3 class="md-sub-t">Para fazer</h3>${fazer.length ? `<div class="es-fazer">${fazer.map(({r, f}) => `<div class="panel es-f"><div><b>${f === "Entrega" ? "Entrega" : "Devolução"}</b> · ${esc(r.espaco)}<span class="sub">${fData(r.data)} (${esDiaSem(r.data)}) · ${esc(esUn(r))}</span></div><button type="button" class="btn small primary" data-ev-fazer="${esc(r.id)}|${f}">Fazer checklist</button></div>`).join("")}</div>`
      : `<p class="muted">Nenhuma vistoria pendente para reservas de ${fData(ini)} a ${fData(fim)}.</p>`}
    <h3 class="md-sub-t">Vistorias feitas</h3>
    <div class="tablebox md-hist"><table><thead><tr><th>Data</th><th>Espaço</th><th>Fase</th><th class="hide-s">Reserva</th><th>Resultado</th><th class="hide-m">Feita por</th></tr></thead><tbody>
    ${V.length ? V.map(v => { const r = R(v.reserva); return `<tr class="click" tabindex="0" data-ev-ver="${esc(v.id)}"><td class="md-nw"><b>${fData(v.data)}</b></td><td>${esc(v.espaco)}</td><td>${esc(v.fase)}</td><td class="hide-s">${r ? `${fData(r.data)} · ${esc(esUn(r))}` : "avulsa"}</td>
      <td><span class="md-st ${Number(v.problemas) ? "verm" : "ok"}">${Number(v.problemas) ? v.problemas + " problema(s)" : "✓ Tudo OK"}</span></td><td class="hide-m">${esc(v.feitoPor)}<span class="sub">${fDataHora(v.feitoEm)}</span></td></tr>`; }).join("")
      : `<tr><td colspan="6"><div class="empty">Nenhuma vistoria ainda.</div></td></tr>`}</tbody></table></div>`;
}
function esVistoria(resId, fase){
  const r = resId ? ES.d.reservas.find(x => x.id === resId) : null;
  const esps = ES.d.espacos.filter(e => e.ativo !== "Não");
  const espNome = r ? r.espaco : (esps[0] || {}).nome || "";
  const itensDe = n => { const e = ES.d.espacos.find(x => x.nome === n); return e && e.itens.length ? e.itens : ES_ITENS; };
  const ent = r ? esVist(r, "Entrega") : null;
  $("#modal-box").classList.add("largo");
  const desenhar = (nome, fs) => {
    const itens = itensDe(nome), antes = fs === "Devolução" && ent ? new Map(ent.itens.map(x => [x.i, x])) : null;
    $("#ev-itens").innerHTML = itens.map((it, i) => { const a = antes && antes.get(it);
      return `<div class="es-it"><span class="es-it-n">${esc(it)}${a ? `<span class="sub">na entrega: ${esc(a.st)}${a.obs ? " — " + esc(a.obs) : ""}</span>` : ""}</span>
        <span class="es-seg" role="radiogroup" aria-label="${esc(it)}">${["OK","Problema","N/A"].map(st => `<label><input type="radio" name="ev${i}" value="${st}"><span>${st}</span></label>`).join("")}</span>
        <input class="input es-it-o" data-ev-o="${i}" maxlength="200" placeholder="O que foi encontrado" hidden></div>`; }).join("");
    $("#ev-itens").dataset.itens = JSON.stringify(itens);
  };
  $("#modal-box").innerHTML = `<h3>Checklist de ${fase === "Devolução" ? "devolução" : "entrega"}</h3>
    <p class="muted">${r ? `${esc(r.espaco)} · reserva de ${fData(r.data)} · ${esc(esUn(r))}${r.solicitacao ? " · solicitação " + esc(r.solicitacao) : ""}` : "Vistoria avulsa (sem reserva)"}</p>
    <div class="form">${r ? "" : `<div class="field"><label for="ev-e">Espaço</label><select class="input" id="ev-e">${esps.map(e => `<option>${esc(e.nome)}</option>`).join("")}</select></div>
      <div class="field"><label for="ev-f">Fase</label><select class="input" id="ev-f"><option>Entrega</option><option ${fase === "Devolução" ? "selected" : ""}>Devolução</option></select></div>`}
      <div class="field"><label for="ev-resp">Morador / responsável presente</label><input class="input" id="ev-resp" maxlength="80"></div></div>
    <div class="actions" style="margin:8px 0"><button type="button" class="btn small" id="ev-tudo">Marcar todos OK</button></div>
    <div id="ev-itens" class="es-its"></div>
    <div class="field full"><label for="ev-obs">Observação geral</label><textarea class="input" id="ev-obs" rows="2" maxlength="500"></textarea></div>
    <div class="actions"><button class="btn primary" type="button" id="ev-ok">Salvar checklist</button><button class="btn" type="button" id="ev-x">Cancelar</button><span class="hint" id="ev-msg"></span></div>`;
  $("#modal").hidden = false; $("#ev-x").onclick = fecharModal;
  desenhar(espNome, fase);
  if ($("#ev-e")) { $("#ev-e").onchange = () => desenhar($("#ev-e").value, $("#ev-f").value); $("#ev-f").onchange = () => desenhar($("#ev-e").value, $("#ev-f").value); }
  $("#ev-itens").onchange = ev => { const m = /^ev(\d+)$/.exec(ev.target.name || ""); if (m) { const o = $(`#ev-itens [data-ev-o="${m[1]}"]`); o.hidden = ev.target.value !== "Problema"; if (!o.hidden) o.focus(); } };
  $("#ev-tudo").onclick = () => $$("#ev-itens input[value=OK]").forEach(x => { x.checked = true; $(`#ev-itens [data-ev-o="${x.name.slice(2)}"]`).hidden = true; });
  $("#ev-ok").onclick = () => {
    const itens = JSON.parse($("#ev-itens").dataset.itens).map((it, i) => { const c = $(`#ev-itens input[name="ev${i}"]:checked`); return {i:it, st:c ? c.value : "", obs:c && c.value === "Problema" ? $(`#ev-itens [data-ev-o="${i}"]`).value : ""}; });
    enviar($("#ev-ok"), $("#ev-msg"), "espVistoria", {vistoria:{reserva:r ? r.id : "", espaco:r ? r.espaco : $("#ev-e").value, fase:r ? fase : $("#ev-f").value, itens, responsavel:$("#ev-resp").value, obs:$("#ev-obs").value}}, x => { if (esAplicar(x)) { fecharModal(); renderEspTudo(); } });
  };
}
function esVerVistoria(id){
  const v = ES.d.vistorias.find(x => x.id === id); if (!v) return;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Checklist de ${esc(v.fase.toLowerCase())} · ${esc(v.espaco)}</h3>
    <p class="muted">${fData(v.data)} · feito por ${esc(v.feitoPor)} (${fDataHora(v.feitoEm)})${v.responsavel ? " · responsável: " + esc(v.responsavel) : ""}</p>
    <div class="tablebox flat"><table><tbody>${v.itens.map(x => `<tr><td>${esc(x.i)}</td><td><span class="md-st ${x.st === "Problema" ? "verm" : x.st === "OK" ? "ok" : "cinza"}">${esc(x.st)}</span></td><td>${esc(x.obs || "")}</td></tr>`).join("")}</tbody></table></div>
    ${v.obs ? `<p>${esc(v.obs)}</p>` : ""}<div class="actions" style="margin-top:10px"><button class="btn" type="button" id="ev-fx">Fechar</button></div>`;
  $("#modal").hidden = false; $("#ev-fx").onclick = fecharModal;
}
// ---- Espaços ----
function renderEsEspacos(){
  const sec = $("#t-esespacos"); if (!sec || sec.hidden) return;
  const box = $("#ee-corpo"); if (esCarregando(box)) return;
  const h = hoje();
  box.innerHTML = ES.d.espacos.length ? `<div class="md-grid">${ES.d.espacos.map(e => { const prox = ES.d.reservas.filter(r => r.espaco === e.nome && esAtiva(r) && r.data >= h);
    return `<article class="panel md-card ${e.ativo === "Não" ? "inativo" : ""}"><div class="md-card-h"><span class="pp-ico laranja"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5a1 1 0 0 1 1-1h9v17M14 8h5v13M3 21h18M10 12v1"/></svg></span><div><h3>${esc(e.nome)}</h3><span class="muted">${[e.valor !== "" && e.valor !== undefined ? fBRL(e.valor) : "", e.capacidade && "até " + e.capacidade + " pessoas", e.horario].filter(Boolean).map(esc).join(" · ") || "&nbsp;"}</span></div>${e.ativo === "Não" ? `<span class="pill p-ajuste">Inativo</span>` : ""}</div>
      <dl class="md-dl"><div><dt>Próximas reservas</dt><dd><b>${prox.length}</b>${prox[0] ? ` · próxima em ${fData(prox[0].data)}` : ""}</dd></div><div><dt>Itens do checklist</dt><dd>${e.itens.length}</dd></div></dl>
      ${e.regras ? `<p class="muted md-obs-t es-regras">${esc(e.regras)}</p>` : ""}
      <div class="md-card-a"><button type="button" class="btn small" data-ee-ed="${esc(e.id)}">Editar</button></div></article>`; }).join("")}</div>`
    : `<div class="empty">Nenhum espaço cadastrado. Clique em <b>+ Novo espaço</b> (o Espaço Gourmet também é criado sozinho quando chega a primeira reserva).</div>`;
}
function esEspaco(id){
  const e = id ? ES.d.espacos.find(x => x.id === id) : null, v = e || {nome:"", capacidade:"", horario:"08:00 às 24:00", regras:"", itens:ES_ITENS, ativo:"Sim"};
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>${e ? "Editar espaço" : "Novo espaço"}</h3>
    <form class="form" id="ee-f" novalidate autocomplete="off">
      <div class="field"><label for="ee-n">Nome <span class="req">*</span></label><input class="input" id="ee-n" value="${esc(v.nome)}" maxlength="60" placeholder="Ex.: Espaço Gourmet"></div>
      <div class="field"><label for="ee-c">Capacidade (pessoas)</label><input class="input" id="ee-c" value="${esc(v.capacidade)}" maxlength="20"></div>
      <div class="field"><label for="ee-v">Valor da reserva (R$)</label><input class="input num" id="ee-v" inputmode="decimal" value="${v.valor !== "" && v.valor !== undefined ? esc(String(v.valor).replace(".", ",")) : ""}" placeholder="361,44"></div>
      <div class="field"><label for="ee-h">Horário de uso</label><input class="input" id="ee-h" value="${esc(v.horario)}" maxlength="60"></div>
      <div class="field full"><label for="ee-r">Regras</label><textarea class="input" id="ee-r" rows="4" maxlength="3000">${esc(v.regras)}</textarea></div>
      <div class="field full"><label for="ee-i">Itens do checklist (um por linha)</label><textarea class="input" id="ee-i" rows="8">${esc(v.itens.join("\n"))}</textarea></div>
      ${e ? `<label class="field full md-chk"><input type="checkbox" id="ee-a" ${v.ativo !== "Não" ? "checked" : ""}> Espaço ativo</label>` : ""}
    </form>
    <div class="actions"><button class="btn primary" type="button" id="ee-ok">Salvar</button><button class="btn" type="button" id="ee-x">Cancelar</button><span class="hint" id="ee-msg"></span></div>`;
  $("#modal").hidden = false; $("#ee-x").onclick = fecharModal; $("#ee-n").focus();
  $("#ee-ok").onclick = () => enviar($("#ee-ok"), $("#ee-msg"), "espEspaco", {espaco:Object.assign(e ? {id:e.id} : {}, {nome:$("#ee-n").value, valor:$("#ee-v").value.trim() === "" ? "" : mdNum($("#ee-v").value), capacidade:$("#ee-c").value, horario:$("#ee-h").value, regras:$("#ee-r").value, itens:$("#ee-i").value.split("\n").map(x => x.trim()).filter(Boolean), ativo:e ? $("#ee-a").checked : true})}, x => { if (esAplicar(x)) { fecharModal(); renderEspTudo(); } });
}
if ($("#t-esreservas")) {
  $("#er-vistas").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b) { ES.vista = b.dataset.v; renderEsReservas(); } });
  $("#er-esp").addEventListener("change", ev => { ES.fEsp = ev.target.value; renderEsReservas(); });
  $("#er-q").addEventListener("input", ev => { ES.q = ev.target.value; renderEsReservas(); });
  $("#er-nova").addEventListener("click", () => ES.d && esEditar(null));
  $("#er-colar").addEventListener("click", () => ES.d && esColar());
  $("#er-ler").addEventListener("click", ev => enviar(ev.target, null, "espEmails", {}, x => { esAplicar(x); renderEspTudo(); }));
  $("#ev-avulsa").addEventListener("click", () => ES.d && esVistoria("", "Entrega"));
  $("#ee-novo").addEventListener("click", () => ES.d && esEspaco(null));
  document.addEventListener("click", ev => {
    const el = ev.target.closest("[data-er-conf],[data-er-vist],[data-er-ed],[data-ev-fazer],[data-ev-ver],[data-ee-ed]");
    if (!el || !el.closest("#t-esreservas, #t-esvistorias, #t-esespacos")) return;
    const d = el.dataset;
    if (d.erConf) { const r = ES.d.reservas.find(x => x.id === d.erConf); enviar(el, null, "espReserva", {reserva:Object.assign({}, r, {status:"Confirmada"})}, x => { esAplicar(x); renderEspTudo(); }); }
    else if (d.erVist) { const r = ES.d.reservas.find(x => x.id === d.erVist); esVistoria(r.id, !esVist(r, "Entrega") ? "Entrega" : "Devolução"); }
    else if (d.erEd) esEditar(d.erEd);
    else if (d.evFazer) { const [id, f] = d.evFazer.split("|"); esVistoria(id, f); }
    else if (d.evVer) esVerVistoria(d.evVer);
    else if (d.eeEd) esEspaco(d.eeEd);
  });
}

// ---- PDF "Solicitações" do site da administradora: data, título (espaço), e linhas com bloco, unidade e status ----
const ES_MESES = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const esEspDoTitulo = t => { const e = String(t).replace(/pr[ée][\s-]*reserva|cancelamento( da| de)?|reserva/gi, "").replace(/^[\s:–-]+|[\s:–-]+$/g, "").trim().toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g, x => x.toLowerCase()); return e || "Espaço Gourmet"; };
const esBlocoLimpo = b => String(b).replace(/\s+/g, " ").trim().replace(/^(BL\s*\d+)\s*-\s*BL\s*\d+\s*-\s*/i, "$1 - ");
const esChave = x => [x.data, norm(x.espaco).replace(/\s+/g, " ").trim(), (/BL\s*0*(\d+)/i.exec(String(x.bloco || "")) || [, norm(x.bloco)])[1], String(x.unidade || "").replace(/\D/g, "").replace(/^0+/, "")].join("|");
function esLerBCF(linhas){
  let data = "", esp = "Espaço Gourmet", pre = true, mesP = null, diaP = null; const out = [];
  const fecha = () => { if (mesP && diaP) { data = `${mesP[1]}-${mesP[0]}-${diaP}`; mesP = diaP = null; } };
  linhas.forEach(l0 => {
    const l = String(l0).replace(/\s+/g, " ").trim(), n = norm(l);
    let m = /^(\d{1,2}) ([a-z]+)\/(\d{4})$/.exec(n);
    if (m) { const k = ES_MESES.indexOf(m[2]); if (k >= 0) data = `${m[3]}-${String(k + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`; return; }
    // o PDF do site separa o mês ("outubro/2026") do dia ("24 sábado")
    m = /^([a-z]+)\/(\d{4})$/.exec(n);
    if (m && ES_MESES.includes(m[1])) { mesP = [String(ES_MESES.indexOf(m[1]) + 1).padStart(2, "0"), m[2]]; fecha(); return; }
    m = /^(\d{1,2})\s+(domingo|segunda|terca|quarta|quinta|sexta|sabado)/.exec(n);
    if (m) { diaP = m[1].padStart(2, "0"); fecha(); return; }
    if (/^hora\b.*bloco.*unidade/.test(n)) return;
    m = /^(?:(\d{1,2}[:h]\d{2})\s+)?(bl\s*\d+.*?)\s+(\d{2,5})\s+(iniciada|confirmada|aprovada|cancelada|recusada|reprovada|finalizada|concluida|aguardando[a-z ]*?)(?:\s+(.*))?$/.exec(n);
    if (m && data) {
      const ini = n.indexOf(m[2]), bloco = esBlocoLimpo(l.slice(ini, ini + m[2].length).toUpperCase()), st = m[4];
      const status = /confirm|aprov/.test(st) ? "Confirmada" : /cancel/.test(st) ? "Cancelada" : /recus|reprov/.test(st) ? "Recusada" : /finaliz|conclu/.test(st) ? "Realizada" : pre ? "Pré-reserva" : "Solicitada";
      out.push({data, espaco:esp, hora:m[1] || "", bloco, unidade:m[3], status, obs:m[5] ? l.slice(l.length - m[5].length) : ""});
      return;
    }
    if (/reserva|espaco|salao|churrasq|quadra|piscina/.test(n) && !/^\d/.test(n)) { esp = esEspDoTitulo(l); pre = /pre[\s-]*reserva/.test(n); }
  });
  return out;
}
async function esImportarPDF(file){
  if (!file || !ES.d) return;
  if (!/\.pdf$/i.test(file.name)) { toast("Escolha o PDF de solicitações do site da administradora.", true); return; }
  let lista;
  try {
    const lib = await carregarPDFjs(), doc = await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise, pags = [];
    for (let i = 1; i <= Math.min(doc.numPages, 30); i++) { const pg = await doc.getPage(i); pags.push((await pg.getTextContent()).items); }
    lista = esLerBCF(LeitorNF.montarLinhas(pags));
  } catch(e){ toast("Não consegui ler este PDF.", true); return; }
  if (!lista.length) { toast("Não encontrei reservas neste PDF (datas e linhas com Bloco, Unidade e Status).", true); return; }
  const porChave = new Map(ES.d.reservas.map(r => [esChave(r), r]));
  const est = lista.map(x => { const r = porChave.get(esChave(x)); return {x, r, acao:!r ? "nova" : r.status === x.status || r.status === "Realizada" ? "igual" : "muda"}; });
  const n = k => est.filter(e => e.acao === k).length;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar reservas do PDF</h3>
    <p><b>${lista.length}</b> reserva${lista.length === 1 ? "" : "s"} de ${fData(lista[0].data)} a ${fData(lista[lista.length - 1].data)}: <b>${n("nova")}</b> nova${n("nova") === 1 ? "" : "s"}, <b>${n("muda")}</b> com status diferente e ${n("igual")} já em dia.</p>
    <div class="tablebox flat"><table><thead><tr><th>Data</th><th>Espaço</th><th>Bloco / unidade</th><th>Status no PDF</th><th>No sistema</th></tr></thead><tbody>
      ${est.map(({x, r, acao}) => `<tr><td class="md-nw">${fData(x.data)}</td><td>${esc(x.espaco)}</td><td>${esc(esUn(x))}</td><td><span class="md-st ${ES_COR[x.status] || "cinza"}">${esc(x.status)}</span></td><td>${acao === "nova" ? `<span class="md-st conc">nova</span>` : acao === "muda" ? `era ${esc(r.status)}` : "igual"}</td></tr>`).join("")}</tbody></table></div>
    <p class="hint">O PDF não traz o número da solicitação: a reserva é reconhecida pela data, espaço, bloco e unidade.</p>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="ep-ok" ${n("nova") + n("muda") ? "" : "disabled"}>Importar</button><button class="btn" type="button" id="ep-x">Cancelar</button><span class="hint" id="ep-msg"></span></div>`;
  $("#modal").hidden = false; $("#ep-x").onclick = fecharModal;
  $("#ep-ok").onclick = () => enviar($("#ep-ok"), $("#ep-msg"), "espImportar", {lista}, x => { if (esAplicar(x)) { fecharModal(); renderEspTudo(); } });
}
if ($("#t-esreservas")) {
  $("#er-pdf").addEventListener("click", () => $("#er-arq").click());
  $("#er-arq").addEventListener("change", ev => { const f = ev.target.files[0]; ev.target.value = ""; esImportarPDF(f); });
}

// ---------- fornecedores (Pendências e compras; só Administração) ----------
const FO = { lista:null, carregando:false, erro:"", em:0, q:"", cat:"", inativos:false };
async function carregarForn(forcar){
  if (!TEM_ADM || !S.token || FO.carregando || !podeAba("fornecedores")) return;
  if (!forcar && FO.lista && Date.now() - FO.em < 60000) { renderForn(); return; }
  FO.carregando = true;
  try { const r = await api("fornecedores"); FO.lista = r.fornecedores || []; FO.em = Date.now(); FO.erro = ""; }
  catch(e){ FO.erro = /desconhecida/i.test(e.message) ? "Os Fornecedores precisam do Apps Script novo (colar o código e implantar uma nova versão)." : e.message; }
  finally { FO.carregando = false; renderForn(); }
}
const foAplicar = r => { if (r && Array.isArray(r.fornecedores)) { FO.lista = r.fornecedores; FO.em = Date.now(); return true; } return false; };
function renderForn(){
  const sec = $("#t-fornecedores"); if (!sec || sec.hidden) return;
  const box = $("#fo-corpo");
  if (FO.erro && !FO.lista) { box.innerHTML = `<div class="notice crit">${esc(FO.erro)}</div>`; return; }
  if (!FO.lista) { box.innerHTML = `<div class="empty"><span class="spin" aria-hidden="true"></span> Carregando os fornecedores…</div>`; return; }
  const cats = [...new Set(FO.lista.map(f => f.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("#fo-cat").innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option ${c === FO.cat ? "selected" : ""}>${esc(c)}</option>`).join("");
  const q = norm(FO.q).trim(), qd = FO.q.replace(/\D/g, "");
  const vis = FO.lista.filter(f => (FO.inativos || f.ativo !== "Não") && (!FO.cat || f.categoria === FO.cat)
    && (!q || norm([f.nome, f.codigo, f.categoria, f.servicos, f.contato, f.email, f.obs, f.situacao].join(" ")).includes(q) || (qd.length >= 3 && String(f.cnpj).replace(/\D/g, "").includes(qd))));
  $("#fo-conta").textContent = `${vis.length} de ${FO.lista.length} fornecedor${FO.lista.length === 1 ? "" : "es"}`;
  box.innerHTML = `<div class="tablebox md-hist"><table><thead><tr><th>Empresa</th><th class="hide-s">Categoria</th><th>Contato</th><th class="hide-m">CNPJ</th><th class="num hide-s">Cotações</th><th class="hide-m">Última cotação</th><th>Ações</th></tr></thead><tbody>
    ${vis.length ? vis.map(f => `<tr class="${f.ativo === "Não" ? "md-inat" : ""}"><td><b>${esc(f.nome)}</b>${f.codigo ? ` <span class="muted mono">${esc(f.codigo)}</span>` : ""}${f.ativo === "Não" ? ` <span class="md-st cinza">inativo</span>` : ""}${f.situacao ? ` <span class="md-st ${/pendente/i.test(f.situacao) ? "ambar" : /n[ãa]o rec/i.test(f.situacao) ? "verm" : "ok"}">${esc(f.situacao)}</span>` : ""}${f.servicos || f.obs ? `<span class="sub">${esc((f.servicos || f.obs).length > 70 ? (f.servicos || f.obs).slice(0, 68) + "…" : (f.servicos || f.obs))}</span>` : ""}</td>
      <td class="hide-s">${f.categoria ? `<span class="md-tipo">${esc(f.categoria)}</span>` : "—"}</td>
      <td>${esc(f.contato || "")}${f.telefone ? `<span class="sub"><a href="tel:${esc(f.telefone.replace(/[^\d+]/g, ""))}">${esc(f.telefone)}</a></span>` : ""}${f.whatsapp ? `<span class="sub"><a href="https://wa.me/55${esc(String(f.whatsapp).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""))}" target="_blank" rel="noopener">WhatsApp ${esc(f.whatsapp)}</a></span>` : ""}${f.email ? `<span class="sub"><a href="mailto:${esc(f.email)}">${esc(f.email)}</a></span>` : ""}${!f.contato && !f.telefone && !f.email && !f.whatsapp ? "—" : ""}</td>
      <td class="hide-m mono">${esc(f.cnpj || "—")}</td>
      <td class="num hide-s">${f.cotacoes || 0}${f.vitorias ? `<span class="sub">${f.vitorias} vencida${f.vitorias === 1 ? "" : "s"}${f.valorGanho ? " · " + fBRL(f.valorGanho) : ""}</span>` : ""}</td>
      <td class="hide-m">${f.ultimaCot ? `${esc(f.ultimaCot.numero)} · ${fData(f.ultimaCot.data)}<span class="sub">${esc(f.ultimaCot.finalidade)}</span>` : "—"}</td>
      <td class="md-ac"><button type="button" class="md-ib" data-fo-ed="${esc(f.id)}" title="Editar" aria-label="Editar ${esc(f.nome)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg></button></td></tr>`).join("")
      : `<tr><td colspan="7"><div class="empty">${FO.lista.length ? "Nenhum fornecedor com esses filtros." : "Nenhum fornecedor cadastrado. Use <b>+ Novo fornecedor</b> ou <b>Trazer das cotações</b>."}</div></td></tr>`}</tbody></table></div>`;
}
function foEditar(id){
  const f = id ? FO.lista.find(x => x.id === id) : null, v = f || {nome:"", ativo:"Sim"};
  const cats = [...new Set(FO.lista.map(x => x.categoria).filter(Boolean).concat(["Materiais de construção","Elétrica","Hidráulica","Limpeza","Jardinagem","Ferragens","EPI","Escritório","Serviços"]))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const c = (k, rot, tam, extra) => `<div class="field ${extra || ""}"><label for="fo-${k}">${rot}</label><input class="input" id="fo-${k}" value="${esc(v[k] || "")}" maxlength="${tam}"${k === "categoria" ? ' list="fo-dl"' : k === "situacao" ? ' list="fo-dls"' : ""}></div>`;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>${f ? "Editar fornecedor" : "Novo fornecedor"}</h3>
    <form class="form" id="fo-f" novalidate autocomplete="off">
      ${c("nome", 'Fornecedor (empresa) <span class="req">*</span>', 100)}${c("codigo", "Código", 20)}${c("categoria", "Categoria", 60)}${c("cnpj", "CNPJ", 20)}
      <div class="field full"><label for="fo-servicos">Serviços / produtos</label><textarea class="input" id="fo-servicos" rows="2" maxlength="500">${esc(v.servicos || "")}</textarea></div><datalist id="fo-dl">${cats.map(x => `<option>${esc(x)}</option>`).join("")}</datalist>
      ${c("contato", "Contato (nome)", 80)}${c("telefone", "Telefone", 40)}${c("whatsapp", "WhatsApp", 40)}${c("email", "E-mail", 100)}${c("site", "Site", 120)}${c("instagram", "Instagram", 80)}
      ${c("situacao", "Situação", 40)}<datalist id="fo-dls"><option>Pendente de conferência</option><option>Conferido</option><option>Aprovado</option><option>Não recomendado</option></datalist>${c("fonte", "Fonte (de onde veio)", 120)}
      ${c("endereco", "Endereço", 200, "full")}${c("pagamento", "Condições de pagamento", 160, "full")}
      <div class="field full"><label for="fo-obs">Observação</label><textarea class="input" id="fo-obs" rows="2" maxlength="500">${esc(v.obs || "")}</textarea></div>
      ${f ? `<label class="field full md-chk"><input type="checkbox" id="fo-at" ${v.ativo !== "Não" ? "checked" : ""}> Fornecedor ativo</label>` : ""}
    </form>
    ${f && f.cotacoes ? `<p class="hint">Aparece em ${f.cotacoes} cotação(ões)${f.vitorias ? `, venceu ${f.vitorias}${f.valorGanho ? " (" + fBRL(f.valorGanho) + ")" : ""}` : ""}.</p>` : ""}
    <div class="actions"><button class="btn primary" type="button" id="fo-ok">Salvar</button><button class="btn" type="button" id="fo-x">Cancelar</button>${f ? `<button class="link danger" type="button" id="fo-del">Excluir</button>` : ""}<span class="hint" id="fo-msg"></span></div>`;
  $("#modal").hidden = false; $("#fo-x").onclick = fecharModal; $("#fo-nome").focus();
  const fim = r => { if (foAplicar(r)) { fecharModal(); renderForn(); } };
  $("#fo-ok").onclick = () => enviar($("#fo-ok"), $("#fo-msg"), "fornSalvar", {fornecedor:Object.assign(f ? {id:f.id} : {}, Object.fromEntries(["nome","codigo","cnpj","categoria","contato","telefone","whatsapp","email","site","instagram","situacao","fonte","endereco","pagamento"].map(k => [k, $("#fo-" + k).value])), {servicos:$("#fo-servicos").value, obs:$("#fo-obs").value, ativo:f ? $("#fo-at").checked : true})}, fim);
  if ($("#fo-del")) $("#fo-del").onclick = ev => { const b = ev.target; if (!b.dataset.conf) { b.dataset.conf = "1"; b.textContent = "Confirmar exclusão"; return; } enviar(b, $("#fo-msg"), "fornSalvar", {op:"excluir", fornecedor:{id:f.id}}, fim); };
}
// planilha de fornecedores: mesmas colunas da planilha do Pier (ID, Fornecedor, Categoria, Serviços / Produtos, …)
const FO_COLS = [["codigo","ID",10],["nome","Fornecedor",32],["categoria","Categoria",22],["servicos","Serviços / Produtos",40],["telefone","Telefone",16],["whatsapp","WhatsApp",16],["email","E-mail",30],["site","Site",28],
  ["contato","Contato",22],["endereco","Endereço",36],["instagram","Instagram",18],["situacao","Situação",20],["obs","Observações",36],["fonte","Fonte",20],["cnpj","CNPJ",20],["pagamento","Condições de pagamento",24],["ativo","Ativo",8]];
const FO_CAB = h => { const n = norm(h).replace(/\s+/g, " ").trim(); return /^(id|codigo)$/.test(n) ? "codigo" : /^(fornecedor|empresa|nome|razao social)/.test(n) ? "nome" : /^categoria/.test(n) ? "categoria" : /^servicos|^produtos/.test(n) ? "servicos"
  : /^telefone|^fone/.test(n) ? "telefone" : /^whats/.test(n) ? "whatsapp" : /^e-?mail/.test(n) ? "email" : /^site/.test(n) ? "site" : /^contato/.test(n) ? "contato" : /^endereco/.test(n) ? "endereco"
  : /^instagram/.test(n) ? "instagram" : /^situacao|^status/.test(n) ? "situacao" : /^observ/.test(n) ? "obs" : /^fonte|^origem/.test(n) ? "fonte" : /^cnpj|^cpf/.test(n) ? "cnpj" : /pagamento/.test(n) ? "pagamento" : /^ativo/.test(n) ? "ativo" : ""; };
function foExportar(){
  if (!FO.lista) return;
  try {
    const X = xlsxMini(), cab = {b:true, cor:"FFFFFFFF", fill:"FF1F4E79", wrap:false};
    FO_COLS.forEach(([, rot, w], j) => { X.cel(1, j + 1, rot, cab); X.col(j + 1, w); });
    FO.lista.forEach((f, i) => FO_COLS.forEach(([k], j) => X.cel(i + 2, j + 1, String(f[k] ?? ""))));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([X.gerar("Fornecedores")], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    a.download = `Fornecedores - Pier ${hoje()}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  } catch(e){ toast(e.message || "Não foi possível gerar a planilha.", true); }
}
async function foImportar(file){
  if (!file || !FO.lista) return;
  if (!/\.xlsx$/i.test(file.name)) { toast("Escolha a planilha de fornecedores em .xlsx.", true); return; }
  let abas;
  try { const buf = await file.arrayBuffer(); try { abas = await xlsxLer(buf); } catch(e){ if (!e || !e.semLeitor) throw e; await carregarXLSX(); const wb = XLSX.read(buf, {type:"array"}); abas = wb.SheetNames.map(n => ({nome:n, folha:xlsxFolhaSheetJS(wb.Sheets[n])})); } }
  catch(e){ toast(e.message || "Não foi possível ler a planilha.", true); return; }
  let lista = [], aba = "";
  for (const a of abas) {
    const F = a.folha; if (!F) continue;
    for (let r = F.r0; r <= Math.min(F.r1, F.r0 + 10) && !lista.length; r++) {
      const col = {}; for (let c = F.c0; c <= F.c1; c++) { const k = FO_CAB(F.val(r, c) ?? ""); if (k && !(k in col)) col[k] = c; }
      if (!("nome" in col) || Object.keys(col).length < 3) continue;
      for (let rr = r + 1; rr <= F.r1; rr++) {
        const o = {_linha:rr + 1}; Object.entries(col).forEach(([k, c]) => { const v = F.val(rr, c); o[k] = v === undefined || v === null ? "" : String(v).trim(); });
        if (o.nome) lista.push(o);
      }
      aba = a.nome;
    }
    if (lista.length) break;
  }
  if (!lista.length) { toast('Não encontrei a lista de fornecedores (precisa da coluna "Fornecedor" e de outras colunas, como Categoria e Telefone).', true); return; }
  const acha = o => FO.lista.find(f => (o.codigo && String(f.codigo).toUpperCase() === o.codigo.toUpperCase()) || (o.cnpj && String(f.cnpj).replace(/\D/g, "") && String(f.cnpj).replace(/\D/g, "") === o.cnpj.replace(/\D/g, "")) || norm(f.nome).trim() === norm(o.nome).trim());
  const nNovo = lista.filter(o => !acha(o)).length;
  $("#modal-box").classList.add("largo");
  $("#modal-box").innerHTML = `<h3>Importar fornecedores</h3>
    <p>Aba <b>${esc(aba)}</b>: <b>${lista.length}</b> fornecedor${lista.length === 1 ? "" : "es"} — <b>${nNovo}</b> nov${nNovo === 1 ? "o" : "os"} e <b>${lista.length - nNovo}</b> já cadastrad${lista.length - nNovo === 1 ? "o" : "os"} (vão ser atualizados; campos vazios na planilha não apagam o que já existe).</p>
    <div class="tablebox flat"><table><thead><tr><th>ID</th><th>Fornecedor</th><th class="hide-s">Categoria</th><th class="hide-s">Situação</th><th>No sistema</th></tr></thead><tbody>
      ${lista.map(o => `<tr><td class="mono">${esc(o.codigo || "—")}</td><td>${esc(o.nome)}</td><td class="hide-s">${esc(o.categoria || "")}</td><td class="hide-s">${esc(o.situacao || "")}</td><td>${acha(o) ? "atualiza" : `<span class="md-st conc">novo</span>`}</td></tr>`).join("")}</tbody></table></div>
    <div class="actions" style="margin-top:12px"><button class="btn primary" type="button" id="fi-ok">Importar</button><button class="btn" type="button" id="fi-x">Cancelar</button><span class="hint" id="fi-msg"></span></div>`;
  $("#modal").hidden = false; $("#fi-x").onclick = fecharModal;
  $("#fi-ok").onclick = () => enviar($("#fi-ok"), $("#fi-msg"), "fornImportar", {lista}, r => { if (foAplicar(r)) { fecharModal(); renderForn(); } });
}
if ($("#t-fornecedores")) {
  $("#fo-exp").addEventListener("click", foExportar);
  $("#fo-imp").addEventListener("click", () => $("#fo-arq").click());
  $("#fo-arq").addEventListener("change", ev => { const f = ev.target.files[0]; ev.target.value = ""; foImportar(f); });
  $("#fo-novo").addEventListener("click", () => FO.lista && foEditar(null));
  $("#fo-cot").addEventListener("click", ev => enviar(ev.target, null, "fornDasCotacoes", {}, r => { foAplicar(r); renderForn(); }));
  $("#fo-q").addEventListener("input", ev => { FO.q = ev.target.value; renderForn(); });
  $("#fo-cat").addEventListener("change", ev => { FO.cat = ev.target.value; renderForn(); });
  $("#fo-inat").addEventListener("change", ev => { FO.inativos = ev.target.checked; renderForn(); });
  $("#fo-corpo").addEventListener("click", ev => { const b = ev.target.closest("[data-fo-ed]"); if (b) foEditar(b.dataset.foEd); });
}

// ---------- início ----------
$("#m-data").value = hoje();
setTipo("saida");
renderNotices();
const ini = (location.hash||"").slice(1);
if (Object.keys(ABAS_PERM).includes(ini)) S.tab = ini;
renderAll();
const sess = lerSessao();
if (sess && sess.senha) apagarSessao(); // versão antiga guardava a senha no aparelho: apaga e pede para entrar de novo
if (sess && sess.token && sess.usuario) {
  S.usuario = sess.usuario || ""; S.token = sess.token;
  try { S.setor = localStorage.getItem("estoque-setor") || S.setor; S.adm = localStorage.getItem("estoque-entrada") === "Administração"; } catch(e){}
  api("entrar", {registro:{motivo:"retorno", entrada:S.adm ? "Administração" : S.setor, aparelho:aparelho()}, comDados:true, comPend:pedirPend(S.adm)}).then(r => { entradaPend(r); if (S.adm && !(TEM_ADM && podeAdm())) S.adm = false; if (!S.adm && !setoresReais().length && TEM_ADM && podeAdm()) S.adm = true; aplicarPermissoes(); renderMe(); setTab(podeAba(S.tab) ? S.tab : primeiraAba()); entradaDados(r); }).catch(e => { if (S.token) mostrarLogin(e.message); });
} else {
  mostrarLogin("");
}
})();
