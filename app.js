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
  os:[], colab:[], oFiltro:"aberto", fotos:new Map(), dem:[], prev:[], dFiltro:"aberto", nfArq:[], nfAnexo:null, nfLida:null,
  iPer:{tipo:"", modo:"mes", mes:mesDe(), dia:hoje()}, mesesCarregados:[],
  setores:["Manutenção"], setor:"Manutenção", empTodos:[], locais:{}, pend:null, adm:false
};
const setorDe = x => (x && x.setor) || "Manutenção";
const SETORES_PERM = [["Manutenção","setor_manutencao"],["Limpeza","setor_limpeza"]];
const setoresDasPerms = p => { const l = SETORES_PERM.filter(x => p && p[x[1]]).map(x => x[0]); return l.length ? l : ["Manutenção"]; };
const doSetor = x => setorDe(x) === S.setor;
const can = p => !!(S.perms && S.perms[p]);
const ABAS_PERM = {painel:["painel"], demandas:["dem_ver","dem_executar","dem_delegar"], os:["os_ver","os_abrir","os_atender","os_gerenciar"], registrar:["registrar_saida","registrar_entrada","registrar_troca","registrar_emprestimo"], itens:["itens_ver"], historico:["historico_ver"], emprestimos:["devolver","registrar_emprestimo"], dashboard:["dashboard"], usuarios:["usuarios"], pendencias:["pendencias"], cotacoes:["pendencias"], acessos:["acessos"]};
// Se o navegador ainda estiver com a página antiga guardada, o menu Administração não existe nela:
// o resto do sistema continua funcionando normalmente.
const TEM_ADM = !!(document.getElementById("tab-adm") && document.getElementById("adm-menu") && document.getElementById("t-pendencias"));
if (!TEM_ADM) delete ABAS_PERM.pendencias;
if (!TEM_ADM || !document.getElementById("t-acessos")) delete ABAS_PERM.acessos;
// O que aparece depende de como a pessoa entrou: Manutenção (tudo do estoque, OS e demandas),
// Limpeza (só o estoque da limpeza) ou Administração (só o menu Administração).
const ABAS_ADM = ["pendencias","cotacoes","usuarios","acessos"];
const ABAS_LIMPEZA = ["painel","registrar","itens","historico","os"];
const TIPOS_LIMPEZA = ["saida","entrada"];
const modo = () => S.adm ? "Administração" : S.setor;
const abaNoModo = t => S.adm ? ABAS_ADM.includes(t) : S.setor === "Limpeza" ? ABAS_LIMPEZA.includes(t) : !ABAS_ADM.includes(t);
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
async function api(acao, extra){
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
  if (r.dados) { S.mesesCarregados = meses; aplicar(r.dados); }
  return r;
}
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
setInterval(() => { if (document.visibilityState==="visible" && $("#modal").hidden && S.token) { atualizar(true); if (S.tab==="pendencias" && TEM_ADM) carregarPend(); } }, 45000);
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
function encerrarLocal(msg){ S.token = ""; S.perms = {}; S.rel = null; S.eq = null; S.pend = null; apagarSessao(); abrirMenuAdm(false); fecharMenu(); mostrarLogin(msg); renderMenu(); }
function sair(msg){
  const tk = S.token;
  if (tk && API) { try { fetch(API, {method:"POST", body:JSON.stringify({acao:"sair", token:tk}), redirect:"follow", keepalive:true}).catch(()=>{}); } catch(e){} }
  encerrarLocal(msg);
}
$("#l-esqueci").addEventListener("click", () => {
  const box = $("#l-esqueci-box"); box.hidden = !box.hidden; $("#l-esqueci").setAttribute("aria-expanded", box.hidden ? "false" : "true");
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
    const rEntrar = await api("entrar", {usuario, senha, registro:{motivo:"login", entrada:setorEscolhido, aparelho:aparelho()}});
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
      guardar(); $("#login").hidden = true; renderMe(); setTab(aba); atualizar(); convidar();
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
    guardar(); $("#login").hidden = true; renderMe(); setTab(podeAba(S.tab) ? S.tab : primeiraAba()); atualizar(); convidar();
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
const TELAS_LOG = ["historico","dashboard","usuarios","pendencias","acessos","cotacoes"];
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
  if (t==="usuarios") carregarEquipe();
  if (t==="pendencias") carregarPend();
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
  {t:"painel", rot:"Painel", ico:'<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>'},
  {g:"Estoque", ico:'<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM4 8.5l8 4.5 8-4.5M12 13v7"/>', itens:[
    {t:"registrar", rot:"Registrar movimentação"}, {t:"itens", rot:"Itens", b:"b-itens"}, {t:"historico", rot:"Histórico"}, {t:"emprestimos", rot:"Empréstimos", b:"b-emp"}]},
  {g:"Manutenção e serviços", ico:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.3-.3-2.4z"/>', itens:[
    {t:"os", rot:"Ordens de serviço (OS)", b:"b-os"}, {t:"demandas", rot:"Demandas", b:"b-dem"}]},
  {g:"Gestão", ico:'<path d="M5 19V11M10 19V6M15 19v-5M20 19V9"/>', itens:[{t:"dashboard", rot:"Dashboard"}]},
  {g:"Pendências e compras", ico:'<path d="M8 5h11M8 12h11M8 19h11M4 5h.01M4 12h.01M4 19h.01"/>', itens:[
    {t:"pendencias", rot:"Controle de pendências", b:"b-adm"}, {t:"pendencias", acao:"nova", rot:"Incluir pendência"}, {t:"cotacoes", rot:"Cotações"}]},
  {g:"Equipe", ico:'<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3.5 5.5"/>', itens:[
    {t:"usuarios", rot:"Usuários e permissões"}, {t:"acessos", rot:"Histórico de acessos"}]}
];
const MENU_ICO = d => `<svg viewBox="0 0 24 24" aria-hidden="true" class="side-ico">${d}</svg>`;
let menuAbertos = null;
try { const x = JSON.parse(localStorage.getItem("menu-abertos") || "null"); if (Array.isArray(x)) menuAbertos = new Set(x); } catch(e){}
const menuGuardar = () => { try { localStorage.setItem("menu-abertos", JSON.stringify([...menuAbertos])); } catch(e){} };
const menuLogado = () => !!S.token && !!$("#login") && $("#login").hidden;
const itemPode = it => (TEM_ADM || !ABAS_ADM.includes(it.t)) && podeAba(it.t) && !!$("#t-" + it.t);
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
function fecharModal(){ $("#modal").hidden = true; $("#modal-box").innerHTML = ""; $("#modal-box").onclick = null; $("#modal-box").classList.remove("largo"); }
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
  renderAvisoDem();
  renderOsRef();
  renderPicked();
}

// ---------- permissões na tela ----------
function aplicarPermissoes(){
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
  const v = u ? Object.assign({senha:""}, u) : {usuario:"", nome:"", senha:gerarSenha(), perfil:(E.perfis.find(p => !p.fixo)||E.perfis[0]).nome, ativo:true, telefone:""};
  const eu = u && u.usuario === S.usuario;
  $("#modal-box").innerHTML = `
    <h3>${u ? "Editar colaborador" : "Novo colaborador"}</h3>
    <form class="form" id="f-u" novalidate autocomplete="off">
      <div class="field full"><label for="u-nome">Nome do colaborador <span class="req">*</span></label><input class="input" id="u-nome" value="${esc(v.nome)}" placeholder="Ex.: João da Silva"></div>
      <div class="field"><label for="u-usuario">Usuário (para entrar) <span class="req">*</span></label><input class="input mono" id="u-usuario" value="${esc(v.usuario)}" autocapitalize="none" spellcheck="false" placeholder="Ex.: joao"></div>
      <div class="field"><label for="u-senha">${u ? "Nova senha" : 'Senha <span class="req">*</span>'}</label><div class="actions" style="flex-wrap:nowrap"><input class="input mono" id="u-senha" value="${esc(v.senha)}" autocomplete="new-password" placeholder="${u ? "Em branco: mantém a atual" : ""}"><button class="btn small" type="button" id="u-gerar">Gerar</button></div><span class="hint">${u ? "Só preencha para trocar. A senha atual não aparece: fica guardada como código." : "Mínimo de 6 caracteres. Anote antes de salvar: depois ela não aparece mais."}</span></div>
      <div class="field"><label for="u-perfil">Perfil</label><select class="input" id="u-perfil">${E.perfis.map(p => `<option ${p.nome===v.perfil?"selected":""}>${esc(p.nome)}</option>`).join("")}</select></div>
      <div class="field"><label for="u-tel">WhatsApp (com DDD)</label><input class="input num" id="u-tel" inputmode="tel" value="${esc(v.telefone ? fTel(v.telefone) : "")}" placeholder="(21) 99999-9999"></div>
      <div class="field"><label for="u-ativo">Situação</label><select class="input" id="u-ativo" ${eu?"disabled":""}><option value="1" ${v.ativo?"selected":""}>Ativo: pode entrar</option><option value="0" ${v.ativo?"":"selected"}>Bloqueado: não entra mais</option></select></div>
      ${u ? `<div class="field full u-acesso"><span class="lbl-campo">Acesso</span><div class="actions">
        <span class="hint">${u.bloqueado ? "Login bloqueado por senhas erradas." : u.sessoes ? `Conectado em ${u.sessoes} ${u.sessoes===1?"aparelho":"aparelhos"}.` : "Nenhum acesso aberto."}</span>
        ${u.bloqueado ? `<button class="btn small" type="button" id="u-liberar">Liberar o login</button>` : ""}
        ${u.sessoes && !eu ? `<button class="btn small" type="button" id="u-encerrar">Encerrar acessos abertos</button>` : ""}
      </div><span class="hint">Trocar a senha ou bloquear o login também encerra os acessos abertos.</span></div>` : ""}
      <p class="hint full">A senha definida aqui é <b>provisória</b>: ao entrar com ela, a pessoa é convidada a criar a própria senha${u && u.provisoria ? " (esta pessoa ainda não criou a dela)" : ""}. Passe o usuário e a senha para o colaborador. O nome aparece no histórico em cada lançamento que ele fizer. O WhatsApp serve para avisar quando uma demanda for delegada a ele.</p>
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
    const nu = {nome:$("#u-nome").value.trim(), usuario:$("#u-usuario").value.trim().toLowerCase(), senha:$("#u-senha").value.trim(), perfil:$("#u-perfil").value, ativo:$("#u-ativo").value==="1", telefone:$("#u-tel").value.replace(/\D/g,"")};
    if (!nu.nome) { msg.textContent = "Informe o nome do colaborador."; return; }
    if (!/^[a-z0-9._@-]{2,40}$/.test(nu.usuario)) { msg.textContent = "Usuário: só letras minúsculas, números, ponto ou traço, sem espaços."; return; }
    if (!u && !nu.senha) { msg.textContent = "Defina a senha do novo login."; return; }
    if (nu.senha && nu.senha.length < 6) { msg.textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
    if (nu.telefone && nu.telefone.length < 10) { msg.textContent = "WhatsApp incompleto: informe o DDD e o número."; return; }
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

function renderOS(){
  const q = norm($("#o-busca").value), cat = $("#o-cat").value, f = S.oFiltro;
  const cats = [...new Set(S.os.map(o => o.categoria).filter(Boolean))].sort((x,y)=>x.localeCompare(y,"pt-BR"));
  const sel = $("#o-cat"), cur = sel.value;
  sel.innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option ${c===cur?"selected":""}>${esc(c)}</option>`).join("");
  $("#dl-local").innerHTML = [...new Set(S.os.map(o=>o.local).concat(S.movs.map(m=>m.destino)).filter(Boolean).map(s=>String(s).trim()))].sort().slice(0,300).map(v=>`<option value="${esc(v)}">`).join("");
  $$("#o-filtros .chip").forEach(c => { if (c.dataset.f==="minhas") c.hidden = !can("os_atender") && !can("os_gerenciar"); });
  const list = S.os.filter(o => {
    if (f==="aberto" && osEncerrada(o)) return false;
    if (f==="minhas" && (osEncerrada(o) || o.responsavelUsuario !== S.usuario)) return false;
    if (f==="atrasadas" && !osAtrasada(o)) return false;
    if (f==="concluidas" && o.status!=="Concluída") return false;
    if (f==="canceladas" && o.status!=="Cancelada") return false;
    if (cat && o.categoria!==cat) return false;
    if (q && !norm([o.numero,o.titulo,o.local,o.categoria,o.responsavel,o.solicitante,o.abertaPor,o.descricao].join(" ")).includes(q)) return false;
    return true;
  }).sort((x,y) => osEncerrada(x)||osEncerrada(y) ? String(y.concluidaEm||y.abertaEm).localeCompare(String(x.concluidaEm||x.abertaEm)) : ordemOS(x,y));
  const vazio = {aberto:"Nenhuma OS em aberto.", minhas:"Nenhuma OS em aberto com você.", atrasadas:"Nenhuma OS atrasada.", concluidas:"Nenhuma OS concluída nos últimos 90 dias.", canceladas:"Nenhuma OS cancelada nos últimos 90 dias.", todas:"Nenhuma OS registrada ainda."}[f];
  $("#o-body").innerHTML = list.length ? list.map(o => `<tr class="click" data-os="${esc(o.id)}" tabindex="0">
    <td class="mono" style="white-space:nowrap">${esc(o.numero)}</td>
    <td><b>${esc(o.titulo)}</b><span class="sub">${esc([o.categoria, o.solicitante ? "pedido por "+o.solicitante : ""].filter(Boolean).join(" · "))}</span></td>
    <td class="hide-s">${esc(o.local)}</td>
    <td>${prioPill(o.prioridade)}</td>
    <td>${statusPill(o)}</td>
    <td class="hide-s num" style="white-space:nowrap">${osEncerrada(o) ? '<span class="muted">'+fData(o.concluidaEm)+'</span>' : fData(o.prazo)}</td>
    <td class="hide-m">${esc(o.responsavel || "—")}</td></tr>`).join("")
    : `<tr><td colspan="7"><div class="empty">${q||cat ? "Nenhuma OS com esses filtros." : vazio}${f==="aberto" && can("os_abrir") ? ` <button class="link" type="button" id="p-os-nova">Abrir uma OS</button>` : ""}</div></td></tr>`;
}
$("#o-busca").addEventListener("input", renderOS);
$("#o-cat").addEventListener("change", renderOS);
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
      <div class="field"><label for="os-solic">Quem pediu</label><input class="input" id="os-solic" value="${esc(v.solicitante||"")}" placeholder="Ex.: Portaria, Síndico, Apto 302"></div>
      ${comResp ? `<div class="field"><label for="os-resp">Responsável</label><select class="input" id="os-resp"><option value="">Sem responsável por enquanto</option>${S.colab.map(c=>`<option value="${esc(c.usuario)}">${esc(c.nome)}</option>`).join("")}</select></div>` : ""}`;
}
function lerCamposOS(msg){
  const v = {titulo:$("#os-titulo").value.trim(), local:$("#os-local").value.trim(), categoria:$("#os-cat").value, prioridade:$("#os-prio").value, prazo:$("#os-prazo").value, descricao:$("#os-desc").value.trim(), solicitante:$("#os-solic").value.trim()};
  if (!v.titulo) { msg.className="hint err"; msg.textContent = "Descreva o serviço em poucas palavras."; return null; }
  if (!v.local) { msg.className="hint err"; msg.textContent = "Informe o local."; return null; }
  return v;
}
function ligarPrazo(prio="#os-prio", prazo="#os-prazo"){
  let mexeu = false;
  $(prazo).addEventListener("input", () => { mexeu = true; });
  $(prio).addEventListener("change", () => { if (!mexeu) $(prazo).value = prazoPara($(prio).value); });
}

function novaOS(){
  if (!can("os_abrir")) return;
  $("#modal-box").innerHTML = `
    <h3>Abrir ordem de serviço</h3>
    <form class="form" id="f-os" novalidate autocomplete="off">
      ${camposOS({}, can("os_gerenciar"))}
      <div class="field full"><label for="os-fotos">Fotos do problema (antes)</label><input class="input" type="file" id="os-fotos" accept="image/*" multiple><span class="hint">Até 8 fotos. Elas são reduzidas antes do envio.</span></div>
      <div class="full actions"><button class="btn primary" type="submit" id="os-ok">Abrir OS</button><button class="btn" type="button" id="os-no">Cancelar</button><span class="hint" id="os-msg"></span></div>
    </form>`;
  $("#modal").hidden = false; $("#os-titulo").focus();
  $("#os-no").onclick = fecharModal;
  ligarPrazo();
  $("#f-os").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#os-msg"), v = lerCamposOS(msg); if (!v) return;
    if ($("#os-resp") && $("#os-resp").value) v.responsavelUsuario = $("#os-resp").value;
    v.setor = osAmb();
    const arquivos = [...$("#os-fotos").files].slice(0, 8);
    const r = await enviar($("#os-ok"), msg, "osAbrir", {os:v});
    if (!r) return;
    if (arquivos.length) { $("#os-ok").disabled = true; await enviarFotos(r.osId, "antes", arquivos, msg); }
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
    <td><b>${esc(p.titulo)}</b><span class="sub">${esc([p.local, p.categoria].filter(Boolean).join(" · "))}</span></td>
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
function renderNfAnexo(){
  const lista = $("#m-nf-lista"); if (!lista) return;
  if (S.nfArq.length) {
    const L = S.nfLida;
    lista.innerHTML = S.nfArq.map((f,i) => `<span class="nf-chip">${f.type==="application/pdf" ? "PDF" : "Foto"} · ${esc(f.name.length>28 ? f.name.slice(0,25)+"…" : f.name)} <button type="button" class="link small-link" data-nfx="${i}" aria-label="Tirar ${esc(f.name)}">tirar</button></span>`).join("")
      + (L && L.arquivo && S.nfArq.includes(L.arquivo) ? (L.lendo ? `<span class="nf-chip"><span class="spin" aria-hidden="true"></span> ${L.foto ? `Lendo a foto da nota… <span id="nf-prog">${L.prog||""}</span>` : "Lendo os itens da nota…"}</span>`
        : L.erro ? `<span class="nf-chip">${esc(L.erro)}</span>`
        : `<button type="button" class="btn primary small" id="m-nf-ler">Conferir e registrar ${L.dados.itens.length} ${L.dados.itens.length===1?"item":"itens"} da nota${L.dados.numero ? " " + esc(L.dados.numero) : ""}</button>`) : "");
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
  S.nfArq = S.nfArq.concat(novos.filter(f => f !== grande)).slice(0, 4);
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
  if (S.nfLida && !S.nfArq.includes(S.nfLida.arquivo)) S.nfLida = null;
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
  if (dados) {
    if (dados.fornecedor && !$("#m-forn").value.trim()) $("#m-forn").value = dados.fornecedor;
    if (dados.numero && !$("#m-nf").value.trim()) $("#m-nf").value = dados.numero;
  }
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
  if (dados) {
    if (dados.fornecedor && !$("#m-forn").value.trim()) $("#m-forn").value = dados.fornecedor;
    if (dados.numero && !$("#m-nf").value.trim()) $("#m-nf").value = dados.numero;
  }
  renderNfAnexo();
  if (dados && dados.itens.length && $("#modal").hidden && S.tab === "registrar") abrirLote();
}
const mapaNF = { ler(){ try { return JSON.parse(localStorage.getItem("nf-mapa")||"{}"); } catch(e){ return {}; } },
  gravar(m){ try { localStorage.setItem("nf-mapa", JSON.stringify(m)); } catch(e){} } };
const chaveProduto = (forn, it) => norm(forn).replace(/[^a-z0-9]/g,"") + "|" + (it.codigo && it.codigo.length >= 6 ? it.codigo : norm(it.descricao));
const fValorNF = v => { let t = (Number(v)||0).toFixed(4).replace(/0{1,2}$/, ""); return t.replace(".", ","); };
const seloLote = st => ({
  lembrado:'<span class="pill s-ok selo">Já cadastrado · escolhido antes</span>',
  ok:'<span class="pill s-ok selo">Já cadastrado</span>',
  manual:'<span class="pill s-ok selo">Escolhido</span>',
  confira:'<span class="pill s-baixo selo">Confira o item</span>',
  novo:'<span class="pill st-aberta selo">Item novo · será cadastrado</span>',
  escolha:'<span class="pill s-zero selo">Escolha o item</span>'}[st] || "");
// para um item novo, copia categoria, tipo e local do item mais parecido (ou do local mais comum)
function dadosDeItemNovo(desc){
  const todos = itensArr(), sug = LeitorNF.sugerir(desc, todos, 1)[0];
  const conta = {}; todos.forEach(i => { if (i.local) conta[i.local] = (conta[i.local]||0) + 1; });
  const localComum = Object.keys(conta).sort((a,b) => conta[b] - conta[a])[0] || "";
  return sug && sug.nota >= 0.2 ? {categoria: sug.it.categoria || "", tipoItem: sug.it.tipoItem || "Consumível", local: sug.it.local || localComum} : {categoria:"", tipoItem:"Consumível", local: localComum};
}
const nomeDeNota = d => { const s = String(d||"").toLowerCase().replace(/\s+/g," ").trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
function abrirLote(){
  const L = S.nfLida; if (!L || !L.dados) return;
  const N = L.dados, todos = itensArr(), mapa = mapaNF.ler(), podeNovo = can("itens_cadastrar");
  const forn = $("#m-forn").value.trim() || N.fornecedor, nf = $("#m-nf").value.trim() || N.numero;
  const linhas = N.itens.map((it, i) => {
    const sug = LeitorNF.sugerir(it.descricao, todos, 5);
    const lembrado = mapa[chaveProduto(forn, it)];
    let sel = "", st = "escolha";
    const folga = sug.length > 1 ? sug[0].nota - sug[1].nota : 1;
    if (lembrado && S.itens.has(lembrado)) { sel = lembrado; st = "lembrado"; }
    else if (sug.length && folga >= 0.08 && (sug[0].nota >= 0.5 || (sug[0].cobre === 1 && sug[0].nota >= 0.35))) { sel = sug[0].it.id; st = "ok"; }
    else if (sug.length && sug[0].nota >= 0.35) { sel = sug[0].it.id; st = "confira"; }
    else if (podeNovo) { sel = "__novo"; st = "novo"; }
    const opt = i2 => `<option value="${esc(i2.id)}" ${i2.id===sel?"selected":""}>${esc((i2.codigo?i2.codigo+" · ":"") + i2.nome)} (${fNum(i2.qtd)} ${esc(i2.unidade||"")})</option>`;
    const sugIds = new Set(sug.map(x => x.it.id)); if (lembrado) sugIds.add(lembrado);
    const topo = [...sugIds].map(id => S.itens.get(id)).filter(Boolean);
    return `<div class="lote-item" data-i="${i}">
      <label class="lote-top"><input type="checkbox" data-k="usar" checked> <span><b>${esc(it.descricao)}</b> ${seloLote(st)}${it.incerto ? '<span class="pill s-baixo">Confira qtd e valor</span>' : ""}<span class="sub">${it.codigo ? "cód. " + esc(it.codigo) + " · " : ""}${fNum(it.qtd)} ${esc(it.unidade)} × ${fBRL(it.valorUnit)} = ${fBRL(it.valorTotal)}</span></span></label>
      <div class="lote-campos">
        <div class="field"><label for="lt-it-${i}">Item do estoque</label><select class="input" id="lt-it-${i}" data-k="item">
          <option value="" ${sel===""?"selected":""}>Escolha o item do estoque…</option>
          ${topo.length ? `<optgroup label="Mais parecidos">${topo.map(opt).join("")}</optgroup>` : ""}
          ${podeNovo ? `<option value="__novo" ${sel==="__novo"?"selected":""}>+ Cadastrar como item novo: ${esc(nomeDeNota(it.descricao))}</option>` : ""}
          <optgroup label="Todos os itens">${todos.filter(x => !sugIds.has(x.id)).map(opt).join("")}</optgroup>
        </select></div>
        <div class="field lote-nome" ${sel==="__novo" ? "" : "hidden"}><label for="lt-n-${i}">Nome do item novo</label><input class="input" id="lt-n-${i}" data-k="nome" value="${esc(nomeDeNota(it.descricao))}"></div>
        <div class="field"><label for="lt-q-${i}">Quantidade</label><input class="input num" id="lt-q-${i}" data-k="qtd" inputmode="decimal" value="${esc(String(Math.round(it.qtd*1000)/1000).replace(".", ","))}"></div>
        <div class="field"><label for="lt-v-${i}">Valor unitário (R$)</label><input class="input num" id="lt-v-${i}" data-k="valor" inputmode="decimal" value="${esc(fValorNF(it.valorUnit))}"></div>
      </div>
      <span class="hint lote-st"></span>
    </div>`;
  }).join("");
  const soma = N.itens.reduce((t, it) => t + (Number(it.valorTotal)||0), 0);
  // nota já lançada antes? (procura nas entradas carregadas: mês atual e o do histórico)
  const fornCurto = norm(forn).replace(/[^a-z0-9]/g, "").slice(0, 12);
  const jaLancadas = nf ? S.movs.filter(m => m.tipo === "entrada" && !m.estornado && String(m.nf).replace(/^0+/, "") === String(nf).replace(/^0+/, "") && (!fornCurto || norm(m.fornecedor).replace(/[^a-z0-9]/g, "").slice(0, 12) === fornCurto)) : [];
  $("#modal-box").innerHTML = `
    <h3>Conferir a nota${nf ? " " + esc(nf) : ""}</h3>
    <p class="muted" style="margin:-6px 0 14px">${esc([forn, N.data ? "emitida em " + fData(N.data) : "", N.valorTotal != null ? "total " + fBRL(N.valorTotal) : ""].filter(Boolean).join(" · "))}. O sistema já preencheu tudo: confira as linhas marcadas em amarelo e clique em Finalizar.</p>
    ${N.foto ? `<div class="notice">Estes itens foram lidos da <b>foto</b> da nota. Confira nomes, quantidades e valores com a nota antes de finalizar.${N.valorTotal != null && Math.abs(N.itens.reduce((t, it) => t + (Number(it.valorTotal)||0), 0) - N.valorTotal) > 0.05 ? " A soma dos itens não bate com o total da nota: pode ter faltado algum item." : ""}</div>` : ""}
    ${jaLancadas.length ? `<div class="notice warn"><b>Atenção: esta nota já foi lançada.</b> Há ${jaLancadas.length} ${jaLancadas.length===1?"entrada":"entradas"} da nota ${esc(nf)} registrada${jaLancadas.length===1?"":"s"} em ${esc(fData(jaLancadas[0].data))} por ${esc(jaLancadas[0].registradoPor||"—")}. Finalizar de novo vai somar as quantidades outra vez no estoque.</div>` : ""}
    <form class="form" id="f-lote" novalidate autocomplete="off">
      <div class="field"><label for="lt-forn">Fornecedor</label><input class="input" id="lt-forn" value="${esc(forn)}" list="dl-forn"></div>
      <div class="field"><label for="lt-nf">Nota fiscal</label><input class="input" id="lt-nf" value="${esc(nf)}"></div>
      <div class="field"><label for="lt-data">Data da entrada</label><input class="input" type="date" id="lt-data" value="${esc(N.data || $("#m-data").value || hoje())}"></div>
      <div class="field"><label for="lt-rec">Quem recebeu</label><input class="input" id="lt-rec" value="${esc($("#m-recebeu").value.trim() || S.nome)}" list="dl-resp"></div>
      <div class="full lote">${linhas}</div>
      <p class="hint full">${N.itens.length===1 ? "1 item lido" : N.itens.length + " itens lidos"}, somando ${fBRL(soma)}${N.valorTotal != null && Math.abs(soma - N.valorTotal) > 0.05 ? ` · o total da nota é ${fBRL(N.valorTotal)} (pode haver frete ou desconto)` : ""}. A nota fica anexada em cada entrada.</p>
      <div class="full actions"><button class="btn primary" type="submit" id="lt-ok">Finalizar</button><button class="btn" type="button" id="lt-no">Cancelar</button><span class="hint" id="lt-msg"></span></div>
    </form>`;
  $("#modal-box").classList.add("largo");
  $("#modal").hidden = false;
  $("#lt-no").onclick = fecharModal;
  const contar = () => {
    const vivos = $$("#f-lote .lote-item").filter(el => { const c = $("[data-k=usar]", el); return c.checked && !c.disabled; });
    const novos = vivos.filter(el => $("[data-k=item]", el).value === "__novo").length, n = vivos.length;
    $("#lt-ok").textContent = n ? `Finalizar: registrar ${n} ${n===1?"entrada":"entradas"}${novos ? ` e cadastrar ${novos} ${novos===1?"item novo":"itens novos"}` : ""}` : "Nenhum item marcado";
    $("#lt-ok").disabled = !n;
  };
  $$("#f-lote [data-k=item]").forEach(sel => sel.addEventListener("change", () => {
    const top = sel.closest(".lote-item").querySelector(".selo"), st = sel.value === "__novo" ? "novo" : sel.value ? "manual" : "escolha";
    if (top) top.outerHTML = seloLote(st);
    const nm = sel.closest(".lote-item").querySelector(".lote-nome"); if (nm) nm.hidden = sel.value !== "__novo";
    contar();
  }));
  $$("#f-lote [data-k=usar]").forEach(c => c.addEventListener("change", () => { c.closest(".lote-item").classList.toggle("off", !c.checked); contar(); }));
  contar();
  const registrados = [];
  $("#f-lote").addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#lt-msg"); msg.className = "hint err";
    const fornecedor = $("#lt-forn").value.trim(), numero = $("#lt-nf").value.trim(), data = $("#lt-data").value || hoje(), receb = $("#lt-rec").value.trim();
    const filas = $$("#f-lote .lote-item").map(el => ({el, it: N.itens[Number(el.dataset.i)], usar: $("[data-k=usar]", el), sel: $("[data-k=item]", el).value, nome: ($("[data-k=nome]", el)||{}).value, qtd: pQtd($("[data-k=qtd]", el).value), valor: $("[data-k=valor]", el).value.trim()}))
      .filter(f => f.usar.checked && !f.usar.disabled);
    const falta = filas.find(f => !f.sel); if (falta) { msg.textContent = `Escolha o item do estoque para "${falta.it.descricao}".`; $("[data-k=item]", falta.el).focus(); return; }
    const semQtd = filas.find(f => !(f.qtd > 0)); if (semQtd) { msg.textContent = `Quantidade inválida em "${semQtd.it.descricao}".`; return; }
    const valRuim = filas.find(f => f.valor && !Number.isFinite(pQtd(f.valor))); if (valRuim) { msg.textContent = `Valor inválido em "${valRuim.it.descricao}".`; return; }
    const btn = $("#lt-ok"); btn.disabled = true; $("#lt-no").disabled = true;
    S.ocupado = true; renderSync();
    try {
      // a nota vai para o Drive uma vez só e fica ligada a todas as entradas
      $("#m-forn").value = fornecedor; $("#m-nf").value = numero;
      let ids = [];
      if (S.nfArq.length) { ids = await enviarNF(S.nfArq, numero, fornecedor, msg); if (!ids) return; S.nfAnexo = {chave: chaveNF(), ids}; S.nfArq = []; S.nfLida = null; renderNfAnexo(); }
      else if (nfAnexoValido()) ids = S.nfAnexo.ids;
      const mapa = mapaNF.ler(); let feitas = 0;
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
          }
          const mov = {tipo:"entrada", itemId, qtd:f.qtd, data, fornecedor, nf:numero, valorUnit: f.valor ? pQtd(f.valor) : "", responsavel:receb, obs:`Na nota: ${f.it.descricao}`};
          if (ids.length) mov.nfFotos = ids.join(",");
          await api("registrar", {mov});
          const itR = S.itens.get(itemId) || {};
          registrados.push({itemId, nome: itR.nome || f.nome || nomeDeNota(f.it.descricao), codigo: itR.codigo || "", unidade: itR.unidade || "", estoque: itR.qtd, qtd: f.qtd, valor: mov.valorUnit, novo: f.sel === "__novo", descricao: f.it.descricao});
          mapa[chaveProduto(fornecedor, f.it)] = itemId;
          f.usar.disabled = true; f.el.classList.add("feito"); st.className = "hint lote-st ok"; st.textContent = "Registrado.";
          feitas++;
        } catch(e){
          st.className = "hint lote-st err"; st.textContent = e.message || "Não foi possível registrar.";
          msg.className = "hint err"; msg.textContent = `${feitas} de ${filas.length} registradas. Corrija o item marcado e clique de novo para registrar o que falta.`;
          mapaNF.gravar(mapa); contar(); return;
        }
      }
      mapaNF.gravar(mapa);
      fecharModal();
      const nNovos = registrados.filter(r => r.novo).length;
      toast(`Nota ${numero} finalizada: ${registrados.length} ${registrados.length===1?"entrada registrada":"entradas registradas"}${nNovos ? ` e ${nNovos} ${nNovos===1?"item novo cadastrado":"itens novos cadastrados"}` : ""}.`);
      mostrarResumoNota({numero, fornecedor, data, receb, ids, itens: registrados, valorTotal: N.valorTotal});
    } finally { if ($("#lt-no")) $("#lt-no").disabled = false; S.ocupado = false; renderSync(); if ($("#lt-ok")) contar(); }
  });
}

// depois de finalizar a nota, a tela Registrar mostra o que entrou e fica limpa para a próxima
function mostrarResumoNota(R){
  S.nfArq = []; S.nfLida = null; S.nfAnexo = null;
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
// etapa que falta: {tipo:"inclusao"|"conclusao", etapa:"gerente"|"sindico"}
const pdEtapa = p => pdAguardando(p) ? {tipo:"inclusao", etapa: p.aprovacao === "Aguardando gerente" ? "gerente" : "sindico"}
  : pdConclPend(p) ? {tipo:"conclusao", etapa: String(p.conclGerente||"").trim() ? "sindico" : "gerente"} : null;
const pdPossoAprovar = e => !!e && (e.etapa === "gerente" ? (ehGerente() || ehSindico()) : ehSindico());
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
  PD.carregando = true;
  try { const r = await api("pendencias"); PD.versao = Number(r.pendVersao) || 0; if (!PD.salvando) S.pend = r.pendencias || []; renderPend(); }
  catch(e){ if (!S.pend) $("#pd-body").innerHTML = `<div class="notice crit">${esc(e.message)}</div>`; toast(e.message, true); }
  finally { PD.carregando = false; }
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
  const quem = e.etapa === "gerente" ? "gerente" : "síndico";
  const selo = e.tipo === "inclusao" ? `Aguardando aprovação do ${quem}` : `Conclusão em ${fData(p.conclData)} aguardando ${quem}`;
  let b = "";
  if (pdPossoAprovar(e)) {
    const rot = e.etapa === "sindico" ? "Aprovar (síndico)" : ehGerente() ? "Aprovar (gerente)" : "Aprovar em nome do gerente";
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
  const dica = pdEl("span", {class:"hint", text: pdV2() ? "A pendência só fica concluída depois da aprovação do gerente e do síndico." : ""});
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
const CT_ST = ["Em cotação","Aguardando gerente","Aguardando síndico","Aprovada","Cancelada"];
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
  const vis = CT.lista.filter(c => (!CT.st || c.status === CT.st) && (!q || norm([c.numero, c.finalidade, c.pendNumero, c.vencedor, c.dados.fornecedores.map(f => f.empresa).join(" ")].join(" ")).includes(q)));
  const aguardam = CT.lista.filter(c => (c.status === "Aguardando gerente" && (ehGerente() || ehSindico())) || (c.status === "Aguardando síndico" && ehSindico())).length;
  $("#ct-resumo").innerHTML = CT_ST.map(s => { const n = CT.lista.filter(c => c.status === s).length; return `<button type="button" class="pd-stat ${s.startsWith("Aguardando") && n ? "aprov" : ""}" data-ctst="${esc(s)}" aria-pressed="${CT.st === s}"><b>${n}</b><span>${esc(s.toLowerCase())}</span></button>`; }).join("")
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
  let h = `<ul class="pd-aprov-info">${linha("Gerente:", c.aprovGerente, c.status === "Aguardando gerente" ? "aguardando" : "—")}${linha("Síndico:", c.aprovSindico, c.status === "Aguardando síndico" ? "aguardando" : "—")}</ul><div class="actions" style="margin-top:10px">`;
  if (c.status === "Em cotação") h += `<button type="button" class="btn primary" data-op="enviar">Enviar para aprovação</button><button type="button" class="btn" data-op="cancelar">Cancelar cotação</button>`;
  if (c.status === "Aguardando gerente" && (ehGerente() || ehSindico())) h += `<button type="button" class="btn primary" data-op="aprovar">${ehGerente() ? "Aprovar (gerente)" : "Aprovar em nome do gerente"}</button>`;
  if (c.status === "Aguardando síndico" && ehSindico()) h += `<button type="button" class="btn primary" data-op="aprovar">Aprovar (síndico)</button>`;
  if (c.status.startsWith("Aguardando") && (ehGerente() || ehSindico())) h += `<input class="input" id="ct-motivo" placeholder="Motivo da devolução (opcional)" style="max-width:280px"><button type="button" class="btn" data-op="recusar">Devolver para ajustes</button>`;
  if (c.status === "Cancelada") h += `<button type="button" class="btn" data-op="reabrir">Reabrir</button>`;
  if (c.status === "Aprovada") h += `<span class="hint">Aprovada. O mapa final é salvo no Drive na aprovação do síndico.</span>`;
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
  api("entrar", {registro:{motivo:"retorno", entrada:S.adm ? "Administração" : S.setor, aparelho:aparelho()}}).then(() => { if (S.adm && !(TEM_ADM && podeAdm())) S.adm = false; if (!S.adm && !setoresReais().length && TEM_ADM && podeAdm()) S.adm = true; aplicarPermissoes(); renderMe(); setTab(podeAba(S.tab) ? S.tab : primeiraAba()); atualizar(); }).catch(e => { if (S.token) mostrarLogin(e.message); });
} else {
  mostrarLogin("");
}
})();
