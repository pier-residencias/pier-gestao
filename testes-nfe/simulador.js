// Simulador LOCAL do Apps Script, só para testes: roda o apps-script/Codigo.gs desta branch
// sobre uma planilha falsa em memória, com dados EXCLUSIVAMENTE fictícios.
// Não acessa o Google, a planilha oficial nem a homologação. Nada sai deste computador.
//
// Uso: node testes-nfe/simulador.js [porta]   (padrão 8795)
//   POST /          → doPost (o mesmo que o site chama)
//   GET  /          → doGet
//   POST /controle  → comandos dos testes: {cmd:"reiniciar"|"semear"|"falhar"|"pedidos"|"foto"|"estado", ...}
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), http = require("http"), crypto = require("crypto");
const D = require("./dados-ficticios");
const CODIGO = path.join(__dirname, "..", "apps-script", "Codigo.gs");

// ---------- planilha falsa ----------
function Sheet(name, rows) { this.name = name; this.rows = rows; }
Sheet.prototype.getName = function () { return this.name; };
Sheet.prototype.getLastRow = function () { let n = this.rows.length; while (n > 0 && this.rows[n - 1].every(v => v === "" || v == null)) n--; return n; };
Sheet.prototype.getLastColumn = function () { return this.rows[0] ? this.rows[0].length : 0; };
Sheet.prototype.getMaxRows = function () { return Math.max(this.rows.length, 1000); };
Sheet.prototype.deleteRow = function (r) { this.rows.splice(r - 1, 1); };
Sheet.prototype.getDataRange = function () { return this.getRange(1, 1, Math.max(this.rows.length, 1), Math.max(this.getLastColumn(), 1)); };
["setFrozenRows", "setFrozenColumns", "setColumnWidth", "setColumnWidths", "autoResizeColumns", "setTabColor"].forEach(k => { Sheet.prototype[k] = function () { return this; }; });
Sheet.prototype.hideSheet = function () { return this; };
Sheet.prototype.insertRowAfter = function (r) { this.rows.splice(r, 0, new Array(this.getLastColumn()).fill("")); };
Sheet.prototype.getProtections = function () { return []; };
Sheet.prototype.protect = function () { return { setDescription() { return this; }, getEditors() { return []; }, removeEditors() {}, canDomainEdit() { return false; }, setDomainEdit() {} }; };
Sheet.prototype.getRange = function (r, c, nr, nc) {
  nr = nr || 1; nc = nc || 1; const sh = this;
  const self = {
    setNumberFormat() { return self; }, setFontWeight() { return self; }, setBackground() { return self; }, setFontColor() { return self; },
    setFontStyle() { return self; }, setDataValidation() { return self; }, setWrap() { return self; }, setHorizontalAlignment() { return self; },
    setNumberFormats() { return self; }, getNumberFormats() { return Array.from({ length: nr }, () => new Array(nc).fill("General")); },
    setValue(v) { self.setValues([[v]]); return self; },
    getValue() { return self.getValues()[0][0]; },
    clearContent() { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ""; } return self; },
    getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => row[c - 1 + j] === undefined ? "" : row[c - 1 + j])); } return out; },
    setValues(v) {
      v.forEach((row, i) => {
        while (sh.rows.length < r + i) sh.rows.push(new Array(Math.max(sh.getLastColumn(), row.length)).fill(""));
        row.forEach((x, j) => { sh.rows[r - 1 + i][c - 1 + j] = x; });
      });
      return self;
    }
  };
  return self;
};

function criarAmbiente(cenario) {
  const sheets = {}, props = { PEND_SEMEADA: "2026-01-01" }; // impede a carga da lista de pendências embutida (tem nomes reais)
  const files = {}; let fid = 0;
  const pasta = id => { const f = { getId: () => id, isTrashed: () => false, getName: () => "Pasta de teste " + id, createFolder: () => pasta("PASTA" + (++fid) + "xxxxxxxxxx"),
    createFile: b => { const nid = "ARQTESTE" + (++fid) + "abcdefghij"; files[nid] = { id: nid, blob: b, parents: [id] }; return { getId: () => nid, setSharing() {}, getUrl: () => "" }; },
    getFiles: () => { const l = Object.values(files); let i = 0; return { hasNext: () => i < l.length, next: () => { i++; return compart({}); } }; } }; return compart(f); };
  const compart = o => Object.assign(o, { getSharingAccess: () => "PRIVATE", setSharing() {}, getEditors: () => [], getViewers: () => [] });
  const raiz = pasta("RAIZTESTE000001");
  const sb = b => Array.from(b).map(v => v > 127 ? v - 256 : v), bb = x => typeof x === "string" ? Buffer.from(x, "utf8") : Buffer.from(x.map(v => v & 255));
  const fmt = (d, tz, f) => {
    const s = new Date(d.getTime() - 3 * 3600e3).toISOString();
    if (f === "yyyy-MM-dd") return s.slice(0, 10);
    if (f === "yyyy-MM-dd HH:mm") return s.slice(0, 10) + " " + s.slice(11, 16);
    if (f === "yyyy-MM-dd HH:mm:ss") return s.slice(0, 10) + " " + s.slice(11, 19);
    if (f === "dd/MM/yyyy HH:mm") return s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) + " " + s.slice(11, 16);
    if (f === "dd/MM/yyyy") return s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4);
    return s.slice(0, 19).replace("T", " ");
  };
  const unicos = () => [...new Set(Object.values(sheets))];
  const ctx = {
    console,
    SpreadsheetApp: {
      getActive: () => ({ getId: () => "PLANILHA-DE-TESTE-LOCAL", getName: () => "PLANILHA DE TESTE LOCAL (fictícia)", getOwner: () => ({ getEmail: () => "dono@teste.invalid" }),
        getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n, [])), getSheets: () => unicos(),
        deleteSheet: sh => Object.keys(sheets).forEach(k => { if (sheets[k] === sh) delete sheets[k]; }) }),
      flush() {}, newDataValidation: () => ({ requireValueInList() { return this; }, setAllowInvalid() { return this; }, build() { return 1; } }),
      ProtectionType: { SHEET: "SHEET" }
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {}, hasLock: () => true }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => k in props ? props[k] : null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; }, getProperties: () => Object.assign({}, props), getKeys: () => Object.keys(props) }) },
    DriveApp: {
      getFolderById: id => { if (!/^PASTA|^RAIZ/.test(id)) throw new Error("não encontrado"); return pasta(id); },
      getRootFolder: () => raiz,
      getFileById: id => {
        if (id === "PLANILHA-DE-TESTE-LOCAL") return compart({ getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return raiz; } }; } });
        const f = files[id]; if (!f) throw new Error("não encontrado");
        return compart({ getName: () => "arquivo-" + id, isTrashed: () => false, setTrashed() {}, getParents: () => { let i = 0; return { hasNext: () => i < f.parents.length, next: () => ({ getId: () => f.parents[i++] }) }; }, getBlob: () => ({ getContentType: () => f.blob.mime, getBytes: () => f.blob.bytes }) });
      },
      Access: { PRIVATE: "PRIVATE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" }, Permission: { NONE: "NONE", VIEW: "VIEW" }
    },
    Utilities: {
      formatDate: fmt, getUuid: () => crypto.randomUUID(), sleep() {},
      base64Decode: s => Buffer.from(s, "base64"), base64Encode: b => Buffer.from(b).toString("base64"),
      newBlob: (x, mime, name) => typeof x === "string" && !mime ? { getBytes: () => sb(Buffer.from(x, "utf8")) } : { bytes: x, mime, name, setName() { return this; } },
      computeHmacSha256Signature: (v, k) => sb(crypto.createHmac("sha256", bb(k)).update(bb(v)).digest()),
      computeDigest: (a, v) => sb(crypto.createHash("sha256").update(bb(v)).digest()),
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "UTF-8" }
    },
    Session: { getScriptTimeZone: () => "America/Sao_Paulo" },
    Logger: { log() {} },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create() {} }), everyHours: () => ({ create() {} }), everyDays: () => ({ atHour: () => ({ create() {} }) }) }) }), getProjectTriggers: () => [], deleteTrigger() {} }
  };
  // abas de base que uma planilha real já tem (só cabeçalhos e perfis; nenhum dado)
  const P = ["Perfil", "Ver painel", "Ver itens", "Ver histórico", "Ver dashboard", "Saída", "Entrada", "Troca", "Empréstimo", "Devolução", "Cadastrar itens", "Editar itens", "Estornar", "Exportar", "Usuários"];
  sheets.Itens = new Sheet("Itens", [["ID", "Código", "Item", "Categoria", "Tipo", "Unidade", "Local", "Estoque", "Mínimo", "Observação", "Criado em", "Atualizado em"]]);
  sheets.Movimentacoes = new Sheet("Movimentacoes", [["ID", "Data", "Tipo", "ID do item", "Código", "Item", "Quantidade", "Unidade", "Efeito no estoque", "Responsável", "Destino", "OS / motivo", "Peça retirada", "Fornecedor", "NF", "Valor unitário", "Devolver até", "Estado na devolução", "Observação", "Registrado por", "Criado em", "Estornado", "Estorno de", "ID do empréstimo"]]);
  sheets.Emprestimos = new Sheet("Emprestimos", [["ID", "ID do item", "Código", "Item", "Quantidade", "Unidade", "Com quem", "Onde", "Saiu em", "Devolver até", "Registrado por", "Criado em", "ID da movimentação"]]);
  sheets.Config = new Sheet("Config", [["Configuração", "Valor", "Para que serve"]]);
  sheets.Usuarios = new Sheet("Usuarios", [["Usuário", "Nome", "Senha", "Perfil", "Ativo"]]);
  sheets.Perfis = new Sheet("Perfis", [P, ["Administração"].concat(P.slice(1).map(() => "Sim")),
    ["Manutenção", "Sim", "Sim", "Sim", "Não", "Sim", "Sim", "Sim", "Sim", "Sim", "Não", "Não", "Não", "Não", "Não"]]);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CODIGO, "utf8"), ctx);
  ctx.autorizar();
  // contas fictícias: administração (pode cadastrar item novo) e manutenção
  const U = sheets.Usuarios, HU = U.rows[0], cu = n => HU.indexOf(n);
  const conta = (u, nome, p, perfil) => { const r = new Array(HU.length).fill(""); r[cu("Usuário")] = u; r[cu("Nome")] = nome; r[cu("Senha")] = p; r[cu("Perfil")] = perfil; r[cu("Ativo")] = "Sim"; return r; };
  U.rows.splice(1);
  U.rows.push(conta("teste.adm", "Pessoa de Teste Adm", "Teste#Adm2026", "Administração"), conta("teste.manut", "Pessoa de Teste Manut", "Teste#Man2026", "Manutenção"),
    conta("teste.saida", "Pessoa de Teste Saida", "Teste#Sai2026", "Teste Somente Saída"));
  // perfil fictício só de saída (para o teste de permissões), gravado pela própria função do Codigo.gs
  ctx.salvarPerfil({ nome: "Teste Somente Saída", perms: { painel: true, itens_ver: true, historico_ver: true, registrar_saida: true, setor_manutencao: true } });
  ctx.autorizar(); // converte as senhas de teste em hash e confere as abas
  // materiais fictícios do cenário
  const I = sheets.Itens, HI = I.rows[0], ci = n => HI.indexOf(n);
  I.rows.splice(1);
  (D.ESTOQUES[cenario] || D.ESTOQUES.E1).forEach(it => {
    const r = new Array(HI.length).fill("");
    const set = (col, v) => { if (ci(col) >= 0) r[ci(col)] = v; };
    set("ID", it.id); set("Código", it.codigo); set("Item", it.nome); set("Categoria", it.categoria); set("Tipo", it.tipoItem); set("Unidade", it.unidade);
    set("Local", it.local); set("Estoque", it.qtd); set("Mínimo", 0); set("Observação", it.obs || ""); set("Setor", it.setor); set("Criado em", "2026-10-01 08:00"); set("Atualizado em", "2026-10-01 08:00");
    I.rows.push(r);
  });
  // a planilha fictícia começa sem movimentações: os testes semeiam o que precisam
  sheets.Movimentacoes.rows.splice(1);
  if (typeof ctx.atualizarRetrato === "function") try { ctx.atualizarRetrato(); } catch (e) {}
  return { ctx, sheets, props, files };
}

let amb = criarAmbiente("E1");
let pedidos = [], falhas = {};
function doPost(corpo) {
  let req = {}; try { req = JSON.parse(corpo); } catch (e) {}
  pedidos.push(req);
  if (falhas.registrarNa && req.acao === "registrar") {
    const n = pedidos.filter(p => p.acao === "registrar").length;
    if (n === falhas.registrarNa) return JSON.stringify({ ok: false, erro: "Falha simulada no registro (teste)." });
  }
  if (falhas.nfEnviar && req.acao === "nfEnviar") return JSON.stringify({ ok: false, erro: "Falha simulada no envio da nota (teste)." });
  if (falhas.leituraExtra && req.acao === "dados" && Array.isArray(req.meses) && req.meses.length && !req.meses.includes(amb.ctx.hoje().slice(0, 7)))
    return JSON.stringify({ ok: false, erro: "Falha simulada na leitura (teste)." });
  return amb.ctx.doPost({ postData: { contents: corpo } }).s;
}
function semear(m) {
  // entrada já existente na planilha (para os testes de nota repetida)
  const M = amb.sheets.Movimentacoes, H = M.rows[0], c = n => H.indexOf(n);
  const it = amb.ctx.linhas(amb.ctx.tabela("itens")).find(i => i.id === m.itemId) || {};
  const r = new Array(H.length).fill("");
  const set = (col, v) => { if (c(col) >= 0) r[c(col)] = v; };
  set("ID", "Msemeada" + (M.rows.length)); set("Data", m.data); set("Tipo", "Entrada"); set("ID do item", m.itemId); set("Código", it.codigo || ""); set("Item", it.nome || "");
  set("Quantidade", m.qtd); set("Unidade", it.unidade || "un"); set("Efeito no estoque", m.estornado ? 0 : m.qtd); set("Fornecedor", m.fornecedor); set("NF", m.nf);
  set("Observação", m.obs || ""); set("Registrado por", "Pessoa de Teste Adm"); set("Criado em", m.data + " 09:00"); set("Estornado", m.estornado ? "sim" : ""); set("Setor", it.setor || "Manutenção");
  M.rows.push(r);
}
function controle(c) {
  if (c.cmd === "reiniciar") { amb = criarAmbiente(c.cenario || "E1"); pedidos = []; falhas = {}; return { ok: true }; }
  if (c.cmd === "semear") { (c.movs || []).forEach(semear); return { ok: true }; }
  if (c.cmd === "falhar") { falhas = c.falhas || {}; return { ok: true }; }
  if (c.cmd === "pedidos") return { ok: true, pedidos };
  if (c.cmd === "estado") return { ok: true, itens: amb.ctx.linhas(amb.ctx.tabela("itens")), movs: amb.ctx.linhas(amb.ctx.tabela("movs")) };
  return { ok: false, erro: "comando desconhecido" };
}

if (require.main === module) {
  const porta = Number(process.argv[2] || 8795);
  http.createServer((q, s) => {
    let b = ""; q.on("data", x => b += x);
    q.on("end", () => {
      s.setHeader("access-control-allow-origin", "*");
      let out;
      try {
        if (q.method === "GET") out = amb.ctx.doGet().s;
        else if (q.method === "POST" && q.url.startsWith("/controle")) out = JSON.stringify(controle(JSON.parse(b || "{}")));
        else if (q.method === "POST") {
          // atraso simulado só na leitura extra (meses fora do mês atual), para testar o limite de tempo da tela
          let req = {}; try { req = JSON.parse(b); } catch (e) {}
          const extra = req.acao === "dados" && Array.isArray(req.meses) && req.meses.length && !req.meses.includes(amb.ctx.hoje().slice(0, 7));
          if (falhas.atrasoLeitura && extra) { const espera = falhas.atrasoLeitura; return setTimeout(() => { s.writeHead(200, { "content-type": "application/json" }); s.end(doPost(b)); }, espera); }
          out = doPost(b);
        }
        else { s.writeHead(204); return s.end(); }
      } catch (e) { out = JSON.stringify({ ok: false, erro: "simulador: " + e.message }); }
      s.writeHead(200, { "content-type": "application/json" }); s.end(out);
    });
  }).listen(porta, "127.0.0.1", () => console.log("simulador pronto em http://127.0.0.1:" + porta));
}
module.exports = { criarAmbiente };
