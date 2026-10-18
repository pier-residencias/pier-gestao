// Testes de tela da conferência de NF-e: o site desta branch no Chromium, com o Apps Script SIMULADO
// (testes-nfe/simulador.js) e notas fiscais FICTÍCIAS. Nenhuma chamada sai deste computador.
// Uso: node testes-nfe/tela.test.js            (sobe o simulador e o servidor do site sozinho)
"use strict";
const fs = require("fs"), path = require("path"), http = require("http"), { spawn } = require("child_process");
const caminho = n => { for (const p of [n, "/opt/npm-tools/node_modules/" + n]) { try { return require(p); } catch (e) {} } throw new Error("Instale o pacote " + n); };
const { chromium } = caminho("playwright");
const { gerarNota, FORNECEDOR } = require("./notas");
const D = require("./dados-ficticios");

const RAIZ = path.join(__dirname, "..");
const PDFJS = (() => { for (const p of [path.join(RAIZ, "node_modules/pdfjs-dist/build"), "/opt/npm-tools/node_modules/pdfjs-dist/build"]) if (fs.existsSync(path.join(p, "pdf.min.mjs"))) return p; throw new Error("Instale pdfjs-dist (só para os testes)"); })();
const P_SIM = 8795, P_SITE = 8796, SITE = `http://127.0.0.1:${P_SITE}/`;
const API_TESTE = "https://script.google.com/macros/s/TESTE-LOCAL-FICTICIO/exec";
const SAIDA = path.join(__dirname, "resultados");
fs.mkdirSync(SAIDA, { recursive: true });
const HOJE = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10), MES = HOJE.slice(0, 7);
const mesMenos = k => { let [y, m] = MES.split("-").map(Number); m -= k; while (m < 1) { m += 12; y--; } return y + "-" + String(m).padStart(2, "0"); };

let ok = 0, falhas = 0; const log = [];
const ver = (c, id, t, det) => { c ? ok++ : falhas++; const l = `${c ? "ok    " : "FALHOU"} ${id.padEnd(5)} ${t}${c || !det ? "" : "  → " + det}`; log.push(l); console.log(l); };
const titulo = t => { log.push("\n" + t); console.log("\n" + t); };

// ---------- servidores locais ----------
function servirSite() {
  const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json" };
  return http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split("?")[0]);
    let arq = u.startsWith("/__pdfjs/") ? path.join(PDFJS, u.slice(9)) : path.join(RAIZ, u === "/" ? "index.html" : u);
    if (!arq.startsWith(RAIZ) && !arq.startsWith(PDFJS)) { s.writeHead(403); return s.end(); }
    fs.readFile(arq, (e, b) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": tipos[path.extname(arq)] || "application/octet-stream" }); s.end(b); });
  }).listen(P_SITE, "127.0.0.1");
}
const controle = async c => (await (await fetch(`http://127.0.0.1:${P_SIM}/controle`, { method: "POST", body: JSON.stringify(c) })).json());

(async () => {
  const sim = spawn(process.execPath, [path.join(__dirname, "simulador.js"), String(P_SIM)], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise(ok => sim.stdout.on("data", d => { if (/pronto/.test(String(d))) ok(); }));
  const site = servirSite();
  const browser = await chromium.launch();
  const externos = [], errosPagina = [];
  let pagina = null;

  async function novaPagina(opc) {
    opc = opc || {};
    if (pagina) await pagina.context().close();
    const ctx = await browser.newContext({ viewport: opc.viewport || { width: 1280, height: 900 } });
    if (opc.relogio) await ctx.clock.install();
    if (opc.memoria) await ctx.addInitScript(m => { if (!sessionStorage.getItem("mem-ok")) { Object.keys(m).forEach(k => localStorage.setItem(k, m[k])); sessionStorage.setItem("mem-ok", "1"); } }, opc.memoria);
    await ctx.route("**/*", async route => {
      const u = route.request().url();
      if (u.startsWith(SITE)) {
        if (/\/config\.js(\?|$)/.test(u)) return route.fulfill({ contentType: "text/javascript", body: `window.ESTOQUE_API_URL = ${JSON.stringify(API_TESTE)};` });
        return route.continue();
      }
      if (u.startsWith("https://script.google.com/")) {
        const r = route.request();
        const resp = await fetch(`http://127.0.0.1:${P_SIM}/`, { method: r.method(), body: r.method() === "POST" ? r.postData() : undefined });
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: await resp.text() });
      }
      if (u === "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js")
        return route.fulfill({ contentType: "text/javascript", body: `import(${JSON.stringify(SITE + "__pdfjs/pdf.min.mjs")}).then(m => { m.GlobalWorkerOptions.workerPort = new Worker(${JSON.stringify(SITE + "__pdfjs/pdf.worker.min.mjs")}, {type:"module"}); window.pdfjsLib = m; });` });
      if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return route.abort();
      externos.push(u); return route.abort();
    });
    const p = await ctx.newPage();
    p.on("pageerror", e => errosPagina.push(e.message));
    p.on("dialog", d => d.dismiss());
    pagina = p;
    return p;
  }
  async function entrar(p, usuario, senha) {
    await p.goto(SITE);
    await p.waitForSelector("#l-usuario", { state: "visible" });
    await p.selectOption("#l-setor", "Manutenção");
    await p.fill("#l-usuario", usuario || "teste.adm"); await p.fill("#l-senha", senha || "Teste#Adm2026");
    await p.click("#l-entrar");
    await p.waitForSelector("#login", { state: "hidden", timeout: 20000 });
    await p.waitForSelector('[data-tab="registrar"]:not([hidden])', { timeout: 20000 });
  }
  async function abrirNota(p, nota) {
    await p.click('[data-tab="registrar"]');
    await p.click('[data-tipo="entrada"]');
    const buf = await gerarNota(nota);
    await p.setInputFiles("#m-nf-arq", { name: `nota-ficticia-${nota.numero || "sem-numero"}.pdf`, mimeType: "application/pdf", buffer: buf });
    await p.waitForSelector("#f-lote", { timeout: 30000 });
    await p.waitForFunction(() => !/Conferindo/.test((document.querySelector("#lt-rep") || {}).textContent || ""), null, { timeout: 30000 });
  }
  const linha = (p, i) => p.locator(`#f-lote .lote-item[data-i="${i}"]`);
  const estadoLinha = async (p, i) => p.evaluate(i => {
    const el = document.querySelector(`#f-lote .lote-item[data-i="${i}"]`);
    const sel = el.querySelector("[data-k=item]");
    return { selo: (el.querySelector(".selo-box") || {}).textContent || "", sel: sel.value, selTexto: sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : "",
      usar: el.querySelector("[data-k=usar]").checked, alerta: el.querySelector("[data-k=alerta]").textContent, memo: (el.querySelector(".lote-memo") || {}).textContent || "",
      classes: el.className, car: [...el.querySelectorAll(".lote-top .car")].map(c => c.textContent),
      opcoes: [...sel.querySelectorAll('optgroup[label="Mais parecidos"] option')].map(o => o.value + "=" + o.textContent) };
  }, i);
  const mensagens = new Set();
  const pend = async p => { const l = await p.evaluate(() => [...document.querySelectorAll("#lt-pend li")].map(li => li.textContent)); l.forEach(m => mensagens.add(m.replace(/\d+/g, "N"))); return l; };
  const botao = p => p.evaluate(() => ({ texto: document.querySelector("#lt-ok").textContent, desab: document.querySelector("#lt-ok").disabled }));
  async function finalizarEConfirmar(p) {
    await p.click("#lt-ok");
    await p.waitForSelector("#lt-rev:not([hidden])");
    const rev = await p.evaluate(() => [...document.querySelectorAll("#lt-rev li")].map(li => li.textContent.replace(/\s+/g, " ").trim()));
    await p.click("#lt-ok");
    await p.waitForSelector("#m-resumo:not([hidden])", { timeout: 60000 });
    return rev;
  }
  const pedidos = async () => (await controle({ cmd: "pedidos" })).pedidos;
  const estado = async () => controle({ cmd: "estado" });
  const qtdItem = async id => (await estado()).itens.find(i => i.id === id).qtd;

  try {
    // ================= 1. associação na tela (estoque E1) =================
    titulo("1. Associação das linhas na tela (estoque E1)");
    await controle({ cmd: "reiniciar", cenario: "E1" });
    let p = await novaPagina();
    await entrar(p);
    const notaA = { numero: 4321, data: HOJE, itens: [
      { desc: "FITA CREPE 48X50M", un: "RL", qtd: 4, vu: 12.5 },
      { desc: "PARAFUSO 8MM", un: "UN", qtd: 50, vu: 0.2 },
      { desc: "DISJUNTOR 32A", un: "UN", qtd: 2, vu: 25 },
      { desc: "LAMPADA LED 15W", un: "UN", qtd: 6, vu: 14 },
      { desc: "LAMP LED BULBO 12W", un: "UN", qtd: 10, vu: 11 },
      { desc: "FITA CREPE", un: "RL", qtd: 3, vu: 9 },
      { desc: "REGISTRO 1/2\"", un: "UN", qtd: 1, vu: 40 },
      { desc: "CABO FLEX 2,5MM²", un: "M", qtd: 100, vu: 2.1 }
    ] };
    await abrirNota(p, notaA);
    const esp = [["Já cadastrado", "t2"], ["Item novo", "__novo"], ["Item novo", "__novo"], ["Item novo", "__novo"], ["Já cadastrado", "t6"], ["Confira o item", ""], ["Item novo", "__novo"], ["Já cadastrado", "t7"]];
    for (let i = 0; i < esp.length; i++) {
      const e = await estadoLinha(p, i);
      ver(e.selo.startsWith(esp[i][0]) && e.sel === esp[i][1], "U1." + (i + 1), `"${notaA.itens[i].desc}" → ${e.selo} / ${e.sel || "(nada)"} · medidas lidas: ${e.car.join(", ") || "nenhuma"}`, `esperado ${esp[i][0]} / ${esp[i][1] || "(nada)"}`);
    }
    let e = await estadoLinha(p, 1);
    ver(e.opcoes.some(o => /^t3=.*medida diferente/.test(o)), "U1.9", `parafuso 6 mm aparece na lista marcado "medida diferente", sem estar selecionado`);
    e = await estadoLinha(p, 0);
    ver(/No estoque: Fita crepe 48mm/.test(e.alerta) && /48 mm/.test(e.alerta), "U1.10", `conferência da linha mostra o material e a medida no estoque: "${e.alerta.trim()}"`);
    let pd = await pend(p);
    ver(pd.some(x => /Linha 6: escolha o material/.test(x)) && (await botao(p)).desab, "U1.11", `linha "Confira" sem pré-seleção bloqueia o Finalizar: ${pd.join(" | ")}`);
    await p.screenshot({ path: path.join(SAIDA, "01-conferencia-inicial.png"), fullPage: true });

    // R-8: escolher à mão um material com medida diferente pede confirmação
    titulo("2. Escolha manual com medida diferente (R-8)");
    await p.selectOption('#f-lote .lote-item[data-i="1"] [data-k=item]', "t3");
    e = await estadoLinha(p, 1);
    ver(e.selo.startsWith("Medida diferente") && /8 mm.*na nota.*6 mm.*no estoque/.test(e.alerta) && /st-medida/.test(e.classes), "U2.1", `parafuso 8 mm → "Parafuso 6mm": ${e.selo}; "${e.alerta.replace(/\s+/g, " ").trim().slice(0, 120)}"`);
    pd = await pend(p);
    ver(pd.some(x => /Linha 2: medida diferente/.test(x)), "U2.2", `pendência criada: "${pd.find(x => /Linha 2/.test(x))}"`);
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=confConflito]');
    pd = await pend(p);
    ver(!pd.some(x => /Linha 2/.test(x)), "U2.3", "com \"Confirmo: o material é este mesmo\", a pendência da linha 2 sai");
    await p.selectOption('#f-lote .lote-item[data-i="1"] [data-k=item]', "__novo");
    e = await estadoLinha(p, 1);
    ver(e.selo.startsWith("Item novo") && !(await pend(p)).some(x => /Linha 2/.test(x)), "U2.4", "voltar para \"item novo\" desfaz o conflito");

    // linha "Confira": a pessoa escolhe; depois revisão final e registro
    titulo("3. Confira resolvido, revisão final e registro");
    await p.selectOption('#f-lote .lote-item[data-i="5"] [data-k=item]', "t1");
    pd = await pend(p);
    ver(!pd.length && !(await botao(p)).desab, "U3.1", `sem pendências depois da escolha; botão "${(await botao(p)).texto}"`);
    await p.click("#lt-ok");
    await p.waitForSelector("#lt-rev:not([hidden])");
    const rev = await p.evaluate(() => [...document.querySelectorAll("#lt-rev li")].map(li => li.textContent.replace(/\s+/g, " ").trim()));
    ver(rev.length === 8 && /FITA CREPE 48X50M.*48 mm.*50 m.*na nota: 4 RL.*Fita crepe 48mm.*\+4 rolo.*estoque 10 → 14/.test(rev[0]), "U3.2", `revisão mostra produto da nota, medidas, material, unidade e quantidade: "${rev[0]}"`);
    ver(/Item novo:.*Parafuso 8mm.*\+50 un/i.test(rev[1]), "U3.3", `item novo na revisão: "${rev[1]}"`);
    ver(/Confirmar e registrar 8 entradas e cadastrar 4 itens novos/.test((await botao(p)).texto), "U3.4", `botão de confirmação: "${(await botao(p)).texto}"`);
    await p.screenshot({ path: path.join(SAIDA, "02-revisao-final.png"), fullPage: true });
    // mudar algo sai da revisão
    await p.fill('#f-lote .lote-item[data-i="0"] [data-k=qtd]', "5");
    ver(await p.locator("#lt-rev").isHidden() && (await botao(p)).texto === "Finalizar", "U3.5", "alterar uma quantidade fecha a revisão (precisa revisar de novo)");
    await p.fill('#f-lote .lote-item[data-i="0"] [data-k=qtd]', "4");
    await pedidos(); const antes = (await pedidos()).length;
    await finalizarEConfirmar(p);
    const st = await estado();
    const ent = st.movs.filter(m => m.tipo === "entrada" && String(m.nf) === "4321");
    ver(ent.length === 8 && (await qtdItem("t2")) === 14 && (await qtdItem("t6")) === 20 && (await qtdItem("t1")) === 13 && (await qtdItem("t7")) === 110, "U3.6", `8 entradas gravadas no simulador; saldos: fita 48 mm 10→14, LED 12 W 10→20, fita 24 mm 10→13, cabo 10→110`);
    ver(st.itens.length === D.ESTOQUES.E1.length + 4 && ["Parafuso 8mm", "Disjuntor 32a", "Lampada led 15w", "Registro 1/2\""].every(n => st.itens.some(i => i.nome === n)), "U3.7", "4 itens novos cadastrados com o nome da nota");
    // T32: o que vai para o Apps Script é igual ao de antes (mesmas ações e campos)
    const regs = (await pedidos()).slice(antes).filter(x => x.acao === "registrar").map(x => x.mov);
    const campos = new Set(regs.map(m => Object.keys(m).sort().join(",")));
    ver(regs.length === 8 && campos.size === 1 && [...campos][0] === "data,fornecedor,itemId,nf,nfFotos,obs,qtd,responsavel,tipo,valorUnit" && regs.every(m => /^Na nota: [^·]+$/.test(m.obs)), "T32", `pedidos "registrar" com os mesmos campos de antes: ${[...campos][0]}; observação só "Na nota: …"`);
    const acoes = [...new Set((await pedidos()).slice(antes).map(x => x.acao))].sort();
    ver(JSON.stringify(acoes) === JSON.stringify(["dados", "nfEnviar", "registrar", "salvarItem"].filter(a => acoes.includes("dados") || a !== "dados")), "T32b", `ações enviadas na finalização: ${acoes.join(", ")} (as mesmas de antes: anexo da nota, item novo e entradas)`);
    // memória: o que foi gravado
    const mem = await p.evaluate(() => ({ v2: JSON.parse(localStorage.getItem("nf-mapa-v2") || "{}"), v1: localStorage.getItem("nf-mapa") }));
    const porDesc = d => Object.values(mem.v2).find(x => x.descNota === d) || {};
    ver(porDesc("FITA CREPE 48X50M").origem === "auto" && porDesc("FITA CREPE").origem === "pessoa" && porDesc("FITA CREPE").itemId === "t1" && porDesc("LAMPADA LED 15W").origem === "auto" && mem.v1 === null, "U3.8",
      `memória nova: automática para "Já cadastrado" sem mudança, "pessoa" para o "Confira" resolvido; a memória antiga não é escrita`);
    ver(Object.values(mem.v2).every(x => x.itemId && x.quando === HOJE && x.carItem !== undefined && !("token" in x) && !("usuario" in x)), "U3.9", "cada lembrança guarda material, data e medida; nenhum usuário, sessão ou senha");

    // ================= 4. duas linhas no mesmo material =================
    titulo("4. Duas linhas da nota no mesmo material (T22)");
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 5001, data: HOJE, itens: [{ desc: "FITA CREPE 24X50M", un: "RL", qtd: 2, vu: 9 }, { desc: "FITA CREPE 24MM X 50M", un: "RL", qtd: 3, vu: 9.5 }, { desc: "LUVA DE RASPA", un: "PAR", qtd: 5, vu: 7 }] });
    let e0 = await estadoLinha(p, 0), e1 = await estadoLinha(p, 1);
    ver(e0.sel === "t1" && e1.sel === "t1" && /linha 2 desta nota também/.test(e0.alerta) && /linha 1 desta nota também/.test(e1.alerta), "T22.1", "as duas linhas apontam para a fita 24 mm e as duas avisam");
    pd = await pend(p);
    ver(pd.some(x => /Linha 2: mesmo material da linha 1/.test(x)) && (await botao(p)).desab, "T22.2", `Finalizar bloqueado: "${pd.join(" | ")}"`);
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=mesmo]');
    ver(!(await pend(p)).length, "T22.3", "\"São o mesmo material\" libera");
    await p.uncheck('#f-lote .lote-item[data-i="1"] [data-k=mesmo]');
    await p.selectOption('#f-lote .lote-item[data-i="1"] [data-k=item]', "t2");
    e1 = await estadoLinha(p, 1);
    ver(e1.selo.startsWith("Medida diferente") && !(await pend(p)).some(x => /mesmo material/.test(x)), "T22.4", "trocar o material de uma das linhas também tira o aviso (e mostra a medida diferente da troca)");
    await p.selectOption('#f-lote .lote-item[data-i="1"] [data-k=item]', "t1");
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=mesmo]');
    await finalizarEConfirmar(p);
    const mem22 = await p.evaluate(() => JSON.parse(localStorage.getItem("nf-mapa-v2") || "{}"));
    ver((await qtdItem("t1")) === 15 && !Object.values(mem22).some(x => x.descNota === "FITA CREPE 24MM X 50M"), "T22.5", "registradas as duas (10+2+3 = 15) e a exceção confirmada não vira memória");

    // ================= 5. memória local =================
    titulo("5. Memória local (T16–T21)");
    await controle({ cmd: "reiniciar", cenario: "E1" });
    const chave = d => "lojaficticiademateriaistesteltda|" + d.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const memAntiga = { [chave("FITA CREPE 48X50M")]: "t1", [chave("LAMPADA LED 9W")]: "t5" };
    const memNova = { [chave("FITA CREPE 24X50M")]: { itemId: "t1", origem: "pessoa", quando: "2026-10-02", vezes: 3, forn: FORNECEDOR, descNota: "FITA CREPE 24X50M", nomeItem: "Fita crepe 24mm", carItem: "medida:24 mm" },
      [chave("FITA CREPE")]: { itemId: "t2", origem: "auto", quando: "2026-10-03", vezes: 1, forn: FORNECEDOR, descNota: "FITA CREPE", nomeItem: "Fita crepe 48mm", carItem: "medida:48 mm" },
      [chave("PARAFUSO 6MM")]: { itemId: "t999", origem: "pessoa", quando: "2026-10-04", vezes: 2, forn: FORNECEDOR, descNota: "PARAFUSO 6MM", nomeItem: "Parafuso antigo", carItem: "medida:6 mm" } };
    p = await novaPagina({ memoria: { "nf-mapa": JSON.stringify(memAntiga), "nf-mapa-v2": JSON.stringify(memNova) } });
    await entrar(p);
    await abrirNota(p, { numero: 6001, data: HOJE, itens: [{ codigo: "M1", desc: "FITA CREPE 48X50M", un: "RL", qtd: 1, vu: 12 }, { codigo: "M2", desc: "FITA CREPE 24X50M", un: "RL", qtd: 1, vu: 9 }, { codigo: "M3", desc: "FITA CREPE", un: "RL", qtd: 1, vu: 9 }, { codigo: "M4", desc: "PARAFUSO 6MM", un: "UN", qtd: 10, vu: 0.2 }, { codigo: "M5", desc: "LAMPADA LED 9W", un: "UN", qtd: 2, vu: 8 }] });
    e = await estadoLinha(p, 0);
    ver(e.sel === "t2" && /Escolha anterior ignorada: medida diferente/.test(e.memo), "T16", `memória antiga errada (48 mm → 24 mm) ignorada: "${e.memo.trim()}"; escolhido ${e.sel}`);
    e = await estadoLinha(p, 1);
    ver(e.sel === "t1" && e.selo.startsWith("Escolhido antes") && /Escolhido antes em 02\/10\/2026/.test(e.memo), "T17", `memória nova de pessoa, compatível: ${e.selo} · "${e.memo.trim()}"`);
    e = await estadoLinha(p, 2);
    ver(e.sel === "" && e.selo.startsWith("Confira") && /^t2=/.test(e.opcoes[0]) && /Sugestão de uma nota anterior/.test(e.memo), "T18", "memória automática: sugerida no topo da lista, sem pré-seleção");
    e = await estadoLinha(p, 3);
    ver(e.sel === "t3" && /Escolha anterior ignorada: o material foi excluído/.test(e.memo), "T19", `memória para material excluído ignorada; regra escolhe o parafuso 6 mm (${e.selo})`);
    e = await estadoLinha(p, 4);
    ver(e.sel === "t5" && e.selo.startsWith("Já cadastrado") && /Escolha antiga deste computador/.test(e.memo), "T16b", "memória antiga certa nunca vira \"Escolhido antes\": só dica, a regra decide");
    await p.click('#f-lote .lote-item[data-i="1"] [data-k=esquecer]');
    e = await estadoLinha(p, 1);
    const memDepois = await p.evaluate(() => ({ v2: JSON.parse(localStorage.getItem("nf-mapa-v2") || "{}"), v1: JSON.parse(localStorage.getItem("nf-mapa") || "{}") }));
    ver(e.selo.startsWith("Já cadastrado") && !Object.values(memDepois.v2).some(x => x.descNota === "FITA CREPE 24X50M") && Object.keys(memDepois.v1).length === 2, "T21a", "\"Esquecer esta escolha\" apaga só aquela lembrança; a linha volta para as regras; memória antiga intacta");
    await p.click("#lt-no");
    // janela "Escolhas lembradas"
    await p.waitForSelector("#m-nf-mem:not([hidden])");
    const txtBtn = await p.textContent("#m-nf-mem");
    await p.click("#m-nf-mem");
    await p.waitForSelector("#mem-todas");
    const linhasMem = await p.locator("#modal-box tbody tr").count();
    await p.screenshot({ path: path.join(SAIDA, "05-escolhas-lembradas.png") });
    await p.click("#mem-todas"); await p.click("#mem-sim");
    let mm = await p.evaluate(() => [localStorage.getItem("nf-mapa-v2"), localStorage.getItem("nf-mapa")]);
    ver(/\(4\)/.test(txtBtn) && linhasMem === 2 && mm[0] === null && mm[1] !== null, "T21b", `"${txtBtn}"; lista com ${linhasMem} lembranças novas; "Esquecer todas" apaga as novas e mantém as antigas sem a segunda confirmação`);
    await p.click("#m-nf-mem"); await p.click("#mem-todas"); await p.check("#mem-antigas"); await p.click("#mem-sim");
    mm = await p.evaluate(() => [localStorage.getItem("nf-mapa-v2"), localStorage.getItem("nf-mapa")]);
    ver(mm[0] === null && mm[1] === null && await p.locator("#m-nf-mem").isHidden(), "T21c", "com a caixa \"Apagar também as escolhas antigas\", a memória antiga sai; o link some");

    // ================= 6. notas repetidas =================
    titulo("6. Notas repetidas (T23–T30)");
    const notaR = { numero: 7001, data: HOJE, itens: [{ desc: "FITA CREPE 24X50M", un: "RL", qtd: 2, vu: 9 }, { desc: "LUVA DE RASPA", un: "PAR", qtd: 4, vu: 7 }] };
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "semear", movs: [{ itemId: "t1", qtd: 2, data: HOJE, fornecedor: FORNECEDOR, nf: "7001", obs: "Na nota: FITA CREPE 24X50M" }] });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, notaR);
    let rep = await p.textContent("#lt-rep");
    pd = await pend(p);
    ver(/Esta nota já foi lançada/.test(rep) && pd.some(x => /já foi lançada/.test(x)) && (await botao(p)).desab, "T23", `nota lançada no mês atual: bloco vermelho e Finalizar bloqueado`);
    e = await estadoLinha(p, 0); e1 = await estadoLinha(p, 1);
    ver(!e.usar && /já foi lançada em/.test(e.alerta) && e1.usar, "T23b", "a linha que já entrou vem desmarcada; a outra continua marcada");
    await p.screenshot({ path: path.join(SAIDA, "06-nota-repetida.png"), fullPage: true });
    await p.check("#lt-rep-ok");
    await p.fill("#lt-rep-num", "7002"); await p.fill("#lt-rep-mot", "segunda entrega da mesma nota");
    const b1 = (await botao(p)).desab;
    await p.fill("#lt-rep-num", "7001"); await p.fill("#lt-rep-mot", "curto");
    const b2 = (await botao(p)).desab;
    await p.uncheck("#lt-rep-ok"); await p.fill("#lt-rep-mot", "segunda entrega da mesma nota").catch(() => {});
    const b3 = (await botao(p)).desab;
    await p.check("#lt-rep-ok"); await p.fill("#lt-rep-num", "7001"); await p.fill("#lt-rep-mot", "segunda entrega da mesma nota");
    const b4 = (await botao(p)).desab;
    ver(b1 && b2 && b3 && !b4, "T27a", "bloqueado com número errado, com motivo curto e sem a caixa marcada; liberado com tudo certo");
    const antesR = (await pedidos()).length;
    await finalizarEConfirmar(p);
    const regR = (await pedidos()).slice(antesR).filter(x => x.acao === "registrar").map(x => x.mov);
    ver(regR.length === 1 && regR[0].obs === "Na nota: LUVA DE RASPA · Nota já lançada antes, confirmado: segunda entrega da mesma nota", "T27b", `só a linha marcada entrou, com o motivo na observação: "${regR[0] && regR[0].obs}"`);

    // T24: lançada há 3 meses (fora dos meses carregados): a leitura extra encontra
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "semear", movs: [{ itemId: "t9", qtd: 4, data: mesMenos(3) + "-10", fornecedor: FORNECEDOR, nf: "7100", obs: "Na nota: LUVA DE RASPA" }] });
    p = await novaPagina(); await entrar(p);
    const antes24 = (await pedidos()).length;
    await abrirNota(p, { numero: 7100, data: mesMenos(3) + "-08", itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 4, vu: 7 }] });
    rep = await p.textContent("#lt-rep");
    const leitura = (await pedidos()).slice(antes24).find(x => x.acao === "dados" && x.meses.includes(mesMenos(3)));
    ver(/Esta nota já foi lançada/.test(rep) && !!leitura && (await botao(p)).desab, "T24", `nota de ${mesMenos(3)} achada pela leitura extra (meses pedidos: ${leitura ? leitura.meses.join(", ") : "nenhum"})`);
    const telaHist = await p.evaluate(() => document.querySelector("#h-mes") ? document.querySelector("#h-mes").value : "");
    ver(telaHist === MES, "T24b", "a leitura extra não troca o mês que a tela mostra");

    // T25: mesmo número, outro fornecedor → aviso amarelo, sem bloqueio
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "semear", movs: [{ itemId: "t9", qtd: 1, data: HOJE, fornecedor: "OUTRA LOJA FICTICIA SA", nf: "7200", obs: "Na nota: LUVA" }] });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 7200, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    rep = await p.textContent("#lt-rep");
    ver(/outro fornecedor/.test(rep) && !(await pend(p)).length && !(await botao(p)).desab, "T25", "mesmo número de outro fornecedor: aviso amarelo, sem bloqueio");

    // T26: entrada anterior estornada → não bloqueia
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "semear", movs: [{ itemId: "t9", qtd: 1, data: HOJE, fornecedor: FORNECEDOR, nf: "7300", obs: "Na nota: LUVA DE RASPA", estornado: true }] });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 7300, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    ver(!/já foi lançada/.test(await p.textContent("#lt-rep")) && (await estadoLinha(p, 0)).usar && !(await pend(p)).length, "T26", "nota com entrada estornada: sem bloqueio, linha marcada");

    // T28: falha na linha 3 de 5, página recarregada, retomada
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { registrarNa: 3 } });
    const nota28 = { numero: 7400, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }, { desc: "VASSOURA PIACAVA", un: "UN", qtd: 2, vu: 15 }, { desc: "BUCHA NYLON 8 MM", un: "UN", qtd: 30, vu: 0.1 }, { desc: "SILICONE INCOLOR 280 G", un: "UN", qtd: 2, vu: 18 }, { desc: "AGUA SANITARIA 1 LITRO", un: "UN", qtd: 6, vu: 4 }] };
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, nota28);
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])"); await p.click("#lt-ok");
    await p.waitForFunction(() => /registradas\. Corrija/.test(document.querySelector("#lt-msg").textContent), null, { timeout: 60000 });
    const msg28 = await p.textContent("#lt-msg");
    ver(/^2 de 5 registradas/.test(msg28), "T28a", `falha simulada na 3ª: "${msg28}"`);
    await controle({ cmd: "falhar", falhas: {} });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, nota28);
    const us = []; for (let i = 0; i < 5; i++) us.push((await estadoLinha(p, i)).usar);
    ver(JSON.stringify(us) === "[false,false,true,true,true]" && /já foi lançada/.test(await p.textContent("#lt-rep")), "T28b", `página recarregada: linhas 1 e 2 vêm desmarcadas ("Já lançada"), 3 a 5 marcadas; nota bloqueada até confirmar`);
    await p.check("#lt-rep-ok"); await p.fill("#lt-rep-num", "7400"); await p.fill("#lt-rep-mot", "continuação do lançamento interrompido");
    await finalizarEConfirmar(p);
    const st28 = (await estado()).movs.filter(m => String(m.nf) === "7400");
    const porItem = st28.reduce((a, m) => (a[m.itemId] = (a[m.itemId] || 0) + 1, a), {});
    ver(st28.length === 5 && Object.values(porItem).every(n => n === 1), "T28c", `cada uma das 5 linhas entrou exatamente uma vez (${JSON.stringify(porItem)})`);

    // T29: a leitura extra falha → não libera em silêncio
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { leituraExtra: true } });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 7500, data: mesMenos(2) + "-05", itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    rep = await p.textContent("#lt-rep");
    ver(/Não foi possível conferir/.test(rep) && (await botao(p)).desab, "T29a", "falha na leitura: aviso vermelho e Finalizar bloqueado");
    await controle({ cmd: "falhar", falhas: {} });
    await p.click("#lt-rep-tentar");
    await p.waitForFunction(() => !/Conferindo|Não foi possível/.test(document.querySelector("#lt-rep").textContent), null, { timeout: 30000 });
    ver(!(await botao(p)).desab, "T29b", "\"Tentar de novo\" com a leitura funcionando libera");

    // T30: nota sem número
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 0, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    pd = await pend(p);
    ver(pd.includes("Informe o número da nota fiscal.") && (await botao(p)).desab, "T30a", "sem número: Finalizar bloqueado");
    await p.fill("#lt-nf", "7600"); await p.locator("#lt-nf").blur();
    await p.waitForFunction(() => !/Conferindo/.test(document.querySelector("#lt-rep").textContent) && !document.querySelector("#lt-ok").disabled, null, { timeout: 30000 });
    ver(true, "T30b", "com o número digitado, confere a repetição e libera");

    // ================= 7. perfil sem cadastro de item, desempenho, celular =================
    titulo("7. Perfil sem permissão de cadastrar item, desempenho e tela de celular");
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p, "teste.manut", "Teste#Man2026");
    await abrirNota(p, { numero: 7700, data: HOJE, itens: [{ desc: "PARAFUSO 8MM", un: "UN", qtd: 10, vu: 0.2 }] });
    e = await estadoLinha(p, 0);
    ver(e.sel === "" && e.selo.startsWith("Escolha o item") && !e.opcoes.some(o => o.startsWith("__novo")) && (await botao(p)).desab, "U7.1", "sem permissão de cadastrar: \"Escolha o item\", sem pré-seleção do parafuso 6 mm");
    const tempo = await p.evaluate(() => {
      const itens = []; for (let k = 0; k < 300; k++) itens.push({ id: "g" + k, nome: ["Fita crepe", "Parafuso", "Lâmpada LED", "Disjuntor", "Cabo flexível", "Registro"][k % 6] + " " + (k % 50 + 1) + ["mm", "mm", "W", "A", "mm²", "\""][k % 6], codigo: "", obs: "" });
      const t0 = performance.now();
      for (let k = 0; k < 30; k++) LeitorNF.classificar({ descricao: ["FITA CREPE 24X50M", "PARAFUSO 8MM", "LAMPADA LED 15W", "DISJUNTOR 32A", "CABO FLEX 4MM2", "REGISTRO 1/2\""][k % 6] + " " + k }, itens, { podeNovo: true });
      return performance.now() - t0;
    });
    ver(tempo < 200, "T33", `no navegador: 30 linhas × 300 materiais em ${tempo.toFixed(0)} ms (limite 200 ms)`);
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina({ viewport: { width: 390, height: 844 } }); await entrar(p);
    await abrirNota(p, { numero: 7800, data: HOJE, itens: notaA.itens.slice(0, 4) });
    const largura = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, tela: window.innerWidth }));
    await p.screenshot({ path: path.join(SAIDA, "07-celular.png"), fullPage: true });
    ver(largura.doc <= largura.tela + 1, "U7.2", `celular (390 px): sem rolagem lateral (${largura.doc} px)`);


    // ================= 9. revisão A3 =================
    titulo("9. Revisão A3: cancelamentos, tentativas após falha, limites e especificações");
    const notaC = { numero: 8001, data: HOJE, itens: [{ desc: "FITA CREPE 24X50M", un: "RL", qtd: 2, vu: 9 }, { desc: "FITA CREPE 24MM X 50M", un: "RL", qtd: 3, vu: 9.5 }, { desc: "PARAFUSO 8MM", un: "UN", qtd: 20, vu: 0.2 }] };
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    const base = (await pedidos()).length, movs0 = (await estado()).movs.length;
    await abrirNota(p, notaC);
    await p.click("#lt-no");
    const fechou1 = await p.locator("#modal").isHidden();
    await p.click("#m-nf-ler"); await p.waitForSelector("#f-lote"); await p.keyboard.press("Escape");
    const fechou2 = await p.locator("#modal").isHidden();
    await p.click("#m-nf-ler"); await p.waitForSelector("#f-lote"); await p.mouse.click(5, 5);
    const fechou3 = await p.locator("#modal").isHidden();
    await p.click("#m-nf-ler"); await p.waitForSelector("#f-lote");
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=mesmo]');
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])");
    await p.click("#lt-voltar");
    const voltou = await p.locator("#lt-rev").isHidden() && (await botao(p)).texto === "Finalizar";
    await p.click("#lt-no");
    const semGravar = (await pedidos()).slice(base).filter(x => ["registrar", "salvarItem", "nfEnviar"].includes(x.acao)).length === 0 && (await estado()).movs.length === movs0;
    const memVazia = await p.evaluate(() => localStorage.getItem("nf-mapa-v2") === null);
    ver(fechou1 && fechou2 && fechou3 && voltou && semGravar && memVazia, "A3.1", "Cancelar, Esc, clique fora e \"Voltar e corrigir\": nada gravado na planilha, nada enviado, memória intacta");
    // fechar com a conferência de repetição ainda em andamento
    await controle({ cmd: "falhar", falhas: { atrasoLeitura: 3000 } });
    p = await novaPagina(); await entrar(p);
    await p.click('[data-tab="registrar"]'); await p.click('[data-tipo="entrada"]');
    await p.setInputFiles("#m-nf-arq", { name: "nota-ficticia-8002.pdf", mimeType: "application/pdf", buffer: await gerarNota({ numero: 8002, data: mesMenos(2) + "-03", itens: notaC.itens.slice(0, 1) }) });
    await p.waitForSelector("#f-lote");
    const conferindo = /Conferindo/.test(await p.textContent("#lt-rep"));
    await p.click("#lt-no"); await p.waitForTimeout(3800);
    ver(conferindo && await p.locator("#modal").isHidden() && (await pedidos()).slice(base).filter(x => ["registrar", "salvarItem"].includes(x.acao)).length === 0 && !errosPagina.length, "A3.2", "fechar durante \"Conferindo…\": a resposta que chega depois é ignorada, sem erro e sem gravação");
    await controle({ cmd: "falhar", falhas: {} });
    // nota repetida: "Fechar sem lançar" não grava
    await controle({ cmd: "semear", movs: [{ itemId: "t1", qtd: 2, data: HOJE, fornecedor: FORNECEDOR, nf: "8003", obs: "Na nota: FITA CREPE 24X50M" }] });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8003, data: HOJE, itens: notaC.itens.slice(0, 1) });
    await p.click("#lt-rep-fechar");
    ver(await p.locator("#modal").isHidden() && (await pedidos()).slice(base).filter(x => x.acao === "registrar").length === 0, "A3.3", "nota repetida → \"Fechar sem lançar\": nada gravado");

    // clique duplo na confirmação: cada linha entra uma vez só
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8100, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }, { desc: "VASSOURA PIACAVA", un: "UN", qtd: 1, vu: 15 }, { desc: "BUCHA NYLON 8 MM", un: "UN", qtd: 10, vu: 0.1 }] });
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])");
    const b0 = (await pedidos()).length;
    await p.evaluate(() => { const b = document.querySelector("#lt-ok"); b.click(); b.click(); document.querySelector("#f-lote").requestSubmit(); });
    await p.waitForSelector("#m-resumo:not([hidden])", { timeout: 60000 });
    ver((await pedidos()).slice(b0).filter(x => x.acao === "registrar").length === 3 && (await estado()).movs.filter(m => String(m.nf) === "8100").length === 3, "A3.4", "clique duplo / envio repetido em \"Confirmar e registrar\": 3 linhas, 3 entradas (nenhuma em dobro)");
    // "Lançar outra nota" volta à tela de registro limpa
    await p.click("#rs-outra");
    ver(await p.locator("#f-mov").isVisible() && (await p.inputValue("#m-nf")) === "", "A3.5", "\"Lançar outra nota\" volta para o formulário limpo");

    // confirmação de medida diferente vale só para o material confirmado
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, notaC);
    await p.selectOption('#f-lote .lote-item[data-i="2"] [data-k=item]', "t3");
    await p.check('#f-lote .lote-item[data-i="2"] [data-k=confConflito]');
    const okConf = !(await pend(p)).some(x => /Linha 3: medida/.test(x));
    await p.selectOption('#f-lote .lote-item[data-i="2"] [data-k=item]', "t1");
    const pedeDeNovo = (await pend(p)).some(x => /Linha 3: medida diferente/.test(x)) && !(await p.isChecked('#f-lote .lote-item[data-i="2"] [data-k=confConflito]'));
    ver(okConf && pedeDeNovo, "A3.6", "trocar para outro material com medida diferente exige nova confirmação (a anterior não vale)");
    // saldo previsto acumulado
    await p.selectOption('#f-lote .lote-item[data-i="2"] [data-k=item]', "__novo");
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=mesmo]');
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])");
    const revC = await p.evaluate(() => [...document.querySelectorAll("#lt-rev li")].map(li => li.textContent.replace(/\s+/g, " ").trim()));
    ver(/estoque 10 → 12/.test(revC[0]) && /estoque 12 → 15/.test(revC[1]) && /mesmo material de outra linha/.test(revC[1]) && /estoque novo: 0 → 20/.test(revC[2]), "A3.7", `saldo previsto acumulado: "${(revC[0].match(/estoque [^·]*/) || [""])[0]}" e "${(revC[1].match(/estoque [^·]*/) || [""])[0]}"; item novo "${(revC[2].match(/estoque [^·]*/) || [""])[0]}"`);
    await p.screenshot({ path: path.join(SAIDA, "09-revisao-saldo-acumulado.png") });
    await p.locator("#lt-rev").screenshot({ path: path.join(SAIDA, "09b-revisao-detalhe.png") });

    // falha depois de cadastrar o item novo: a nova tentativa não cadastra outro
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { registrarNa: 1 } });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8200, data: HOJE, itens: [{ desc: "PARAFUSO 8MM", un: "UN", qtd: 20, vu: 0.2 }, { desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])"); await p.click("#lt-ok");
    await p.waitForFunction(() => /registradas\. Corrija/.test(document.querySelector("#lt-msg").textContent), null, { timeout: 60000 });
    const msgF = await p.textContent("#lt-msg");
    await controle({ cmd: "falhar", falhas: {} });
    await finalizarEConfirmar(p);
    const st8200 = await estado();
    ver(/^0 de 2 registradas/.test(msgF) && st8200.itens.filter(i => i.nome === "Parafuso 8mm").length === 1 && st8200.movs.filter(m => String(m.nf) === "8200").length === 2, "A3.8", `falha logo depois de cadastrar o item novo ("${msgF.slice(0, 22)}…"): na nova tentativa, 1 item "Parafuso 8mm" só e 2 entradas`);
    const resumo8200 = await p.textContent("#m-resumo");
    ver(/1 item novo cadastrado/.test(resumo8200), "A3.9", "o resumo final ainda conta o item novo criado na primeira tentativa");

    // falha no envio do anexo: nenhuma entrada é gravada; a nova tentativa funciona
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { nfEnviar: true } });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8300, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] });
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])"); await p.click("#lt-ok");
    await p.waitForFunction(() => /Falha simulada no envio/.test(document.querySelector("#lt-msg").textContent), null, { timeout: 30000 });
    const nada = (await pedidos()).filter(x => x.acao === "registrar").length === 0 && !(await botao(p)).desab;
    await controle({ cmd: "falhar", falhas: {} });
    await finalizarEConfirmar(p);
    ver(nada && (await estado()).movs.filter(m => String(m.nf) === "8300").length === 1, "A3.10", "falha no envio da nota: a mensagem aparece, nada é registrado; a nova tentativa registra 1 entrada");

    // depois de uma falha no meio, mudar a data reconfere a nota sem contar as entradas da própria tela
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { registrarNa: 2 } });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8400, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }, { desc: "VASSOURA PIACAVA", un: "UN", qtd: 1, vu: 15 }, { desc: "BUCHA NYLON 8 MM", un: "UN", qtd: 10, vu: 0.1 }] });
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])"); await p.click("#lt-ok");
    await p.waitForFunction(() => /registradas\. Corrija/.test(document.querySelector("#lt-msg").textContent), null, { timeout: 60000 });
    await controle({ cmd: "falhar", falhas: {} });
    await p.fill("#lt-data", mesMenos(1) + "-28"); await p.locator("#lt-data").dispatchEvent("change");
    await p.waitForFunction(() => !/Conferindo/.test(document.querySelector("#lt-rep").textContent), null, { timeout: 30000 });
    const repProprio = await p.textContent("#lt-rep");
    ver(!/já foi lançada/.test(repProprio) && !(await botao(p)).desab, "A3.11", "a entrada que a própria tela acabou de gravar não conta como nota repetida");
    await finalizarEConfirmar(p);
    ver((await estado()).movs.filter(m => String(m.nf) === "8400").length === 3, "A3.12", "as 3 linhas entraram, cada uma uma vez");

    // limite de tempo da leitura extra (relógio do navegador adiantado; sem esperar 45 s de verdade)
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "falhar", falhas: { atrasoLeitura: 15000 } });
    p = await novaPagina({ relogio: true }); await entrar(p);
    await p.click('[data-tab="registrar"]'); await p.click('[data-tipo="entrada"]');
    await p.setInputFiles("#m-nf-arq", { name: "nota-ficticia-8500.pdf", mimeType: "application/pdf", buffer: await gerarNota({ numero: 8500, data: mesMenos(2) + "-03", itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }] }) });
    await p.waitForSelector("#f-lote");
    await p.waitForFunction(() => /Conferindo/.test(document.querySelector("#lt-rep").textContent));
    const pConf = await pend(p);
    await p.clock.fastForward(46000);
    await p.waitForFunction(() => /Não foi possível conferir/.test(document.querySelector("#lt-rep").textContent), null, { timeout: 10000 });
    const pFalha = await pend(p);
    ver(pConf.some(x => /Aguarde: conferindo/.test(x)) && pFalha.some(x => /Não foi possível conferir/.test(x)) && /demorou demais/.test(await p.textContent("#lt-rep")) && (await botao(p)).desab, "A3.13", "sem resposta em 45 s: \"A planilha demorou demais para responder\", Finalizar bloqueado com \"Tentar de novo\"");
    await controle({ cmd: "falhar", falhas: {} });
    await p.waitForTimeout(15500);

    // mensagens de quantidade, valor e nenhuma linha marcada
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8550, data: HOJE, itens: [{ desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }, { desc: "VASSOURA PIACAVA", un: "UN", qtd: 1, vu: 15 }] });
    await p.fill('#f-lote .lote-item[data-i="0"] [data-k=qtd]', "0");
    await p.fill('#f-lote .lote-item[data-i="1"] [data-k=valor]', "abc");
    const pQV = await pend(p);
    await p.uncheck('#f-lote .lote-item[data-i="0"] [data-k=usar]'); await p.uncheck('#f-lote .lote-item[data-i="1"] [data-k=usar]');
    const pNada = await pend(p), bNada = await botao(p);
    ver(pQV.includes("Linha 1: quantidade inválida.") && pQV.includes("Linha 2: valor inválido.") && pNada.includes("Nenhuma linha marcada.") && bNada.desab && bNada.texto === "Nenhum item marcado", "A3.19", "quantidade inválida, valor inválido e nenhuma linha marcada travam o Finalizar com a mensagem certa");

    // permissões: perfil sem entrada não vê a entrada nem as escolhas lembradas
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina({ memoria: { "nf-mapa": JSON.stringify({ "x|y": "t1" }) } }); await entrar(p, "teste.saida", "Teste#Sai2026");
    await p.click('[data-tab="registrar"]');
    ver(await p.locator('[data-tipo="entrada"]').isHidden() && await p.locator('[data-tipo="saida"]').isVisible() && await p.locator("#m-nf-mem").isHidden(), "A3.14", "perfil só de saída: sem botão de entrada e sem o link de escolhas lembradas");

    // especificação diferente (grão, modelo) e marca 3M na tela
    await controle({ cmd: "reiniciar", cenario: "E4" });
    p = await novaPagina(); await entrar(p);
    await abrirNota(p, { numero: 8600, data: HOJE, itens: [{ desc: "LIXA D AGUA GRAO 80", un: "FL", qtd: 10, vu: 2 }, { desc: "FITA ISOLANTE 3M 19MM X 20M", un: "RL", qtd: 2, vu: 12 }, { desc: "TRENA 3M", un: "UN", qtd: 1, vu: 20 }] });
    e = await estadoLinha(p, 0);
    ver(e.sel === "w5" && e.opcoes.some(o => /^w4=.*confira o número/.test(o)), "A3.15", "lixa grão 80 → \"Lixa d'água 80\"; a de 120 aparece marcada \"confira o número\"");
    await p.selectOption('#f-lote .lote-item[data-i="0"] [data-k=item]', "w4");
    e = await estadoLinha(p, 0);
    ver(/Confira a especificação: a nota tem 80 e o material tem 120/.test(e.alerta), "A3.16", `escolher a lixa 120 mostra: "${(e.alerta.match(/Confira a especificação[^.]*\)/) || [""])[0]}"`);
    e = await estadoLinha(p, 1);
    const e2 = await estadoLinha(p, 2);
    ver(e.sel === "w1" && e.car.join(",") === "19 mm,20 m" && e2.sel === "w2" && e2.car.join(",") === "3 m", "A3.17", `"FITA ISOLANTE 3M 19MM X 20M" → medidas ${e.car.join(", ")} (3M é a marca); "TRENA 3M" → ${e2.car.join(", ")}`);

    // celular: os estados principais sem rolagem lateral
    await controle({ cmd: "reiniciar", cenario: "E1" });
    await controle({ cmd: "semear", movs: [{ itemId: "t9", qtd: 1, data: HOJE, fornecedor: FORNECEDOR, nf: "8700", obs: "Na nota: LUVA DE RASPA" }] });
    p = await novaPagina({ viewport: { width: 390, height: 844 }, memoria: { "nf-mapa": JSON.stringify({ "lojaficticiademateriaistesteltda|fita crepe": "t2" }) } }); await entrar(p);
    await abrirNota(p, { numero: 8700, data: HOJE, itens: [{ codigo: "C1", desc: "LUVA DE RASPA", un: "PAR", qtd: 1, vu: 7 }, { codigo: "C2", desc: "PARAFUSO 8MM", un: "UN", qtd: 10, vu: 0.2 }, { codigo: "C3", desc: "FITA CREPE", un: "RL", qtd: 1, vu: 9 }] });
    const larg = async () => p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.querySelector("#modal-box").scrollWidth) <= window.innerWidth + 1);
    const l1 = await larg(); await p.screenshot({ path: path.join(SAIDA, "10-celular-repetida.png") });
    await p.selectOption('#f-lote .lote-item[data-i="1"] [data-k=item]', "t3");
    await p.locator('#f-lote .lote-item[data-i="1"]').scrollIntoViewIfNeeded();
    const l2 = await larg(); await p.screenshot({ path: path.join(SAIDA, "11-celular-medida-diferente.png") });
    await p.check('#f-lote .lote-item[data-i="1"] [data-k=confConflito]');
    await p.selectOption('#f-lote .lote-item[data-i="2"] [data-k=item]', "t2");
    await p.check("#lt-rep-ok"); await p.fill("#lt-rep-num", "8700"); await p.fill("#lt-rep-mot", "teste de tela no celular");
    await p.click("#lt-ok"); await p.waitForSelector("#lt-rev:not([hidden])");
    const l3 = await larg(); await p.locator("#lt-rev").screenshot({ path: path.join(SAIDA, "12-celular-revisao.png") });
    await p.click("#lt-no"); await p.click("#m-nf-mem"); await p.waitForSelector("#mem-todas");
    const l4 = await larg(); await p.screenshot({ path: path.join(SAIDA, "13-celular-escolhas-lembradas.png") });
    ver(l1 && l2 && l3 && l4, "A3.18", "celular (390 px): nota repetida, medida diferente, revisão final e escolhas lembradas sem rolagem lateral");
    await p.click("#mem-fechar");

    // ================= 8. demais recursos do site =================
    titulo("8. Regressão: demais recursos do site");
    await controle({ cmd: "reiniciar", cenario: "E1" });
    p = await novaPagina(); await entrar(p);
    const abas = ["painel", "itens", "historico", "emprestimos", "dashboard", "registrar"];
    const vistas = [];
    for (const a of abas) { const b = p.locator(`[data-tab="${a}"]`); if (await b.isVisible()) { await b.click(); await p.waitForTimeout(150); vistas.push(a); } }
    ver(vistas.length >= 5, "R1", `abas abertas sem erro: ${vistas.join(", ")}`);
    // saída simples (fora da nota)
    await p.click('[data-tab="registrar"]'); await p.click('[data-tipo="saida"]');
    await p.fill("#m-busca", "Luva"); await p.click('#m-lista [data-id="t9"]');
    await p.fill("#m-qtd", "1"); await p.fill("#m-resp", "Pessoa de Teste"); await p.fill("#m-destino", "Almoxarifado de teste");
    await p.click("#m-enviar");
    await p.waitForFunction(() => /Salvo|registrad/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(500);
    ver((await qtdItem("t9")) === 9, "R2", `saída comum pelo formulário: luva 10 → ${await qtdItem("t9")}`);
    // entrada manual (sem nota) continua igual: usa o formulário normal, não a conferência
    await p.click('[data-tipo="entrada"]');
    await p.fill("#m-busca", "Água"); await p.click('#m-lista [data-id="t12"]');
    await p.fill("#m-qtd", "2"); await p.fill("#m-forn", "Loja ficticia balcao");
    await p.click("#m-enviar");
    await p.waitForTimeout(1500);
    ver(await p.locator("#f-lote").count() === 0 && (await qtdItem("t12")) === 12, "R3", `entrada sem nota usa o formulário normal: água sanitária 10 → ${await qtdItem("t12")}`);
    ver(!errosPagina.length, "R4", `nenhum erro de JavaScript em todos os testes${errosPagina.length ? ": " + errosPagina.slice(0, 3).join(" | ") : ""}`);
    log.push("\nMensagens de pendência mostradas ao colaborador (números trocados por N):\n  - " + [...mensagens].sort().join("\n  - "));
    ver(!externos.length, "T35", `nenhuma chamada a endereço externo (bloqueadas: ${externos.length})${externos.length ? ": " + externos.slice(0, 3).join(", ") : ""}`);
  } catch (err) {
    falhas++; const l = "ERRO NO TESTE: " + (err && err.stack || err); log.push(l); console.log(l);
    if (pagina) await pagina.screenshot({ path: path.join(SAIDA, "erro.png"), fullPage: true }).catch(() => {});
  } finally {
    await browser.close(); site.close(); sim.kill();
    log.push(`\n${ok} ok · ${falhas} falhas`); console.log(`\n${ok} ok · ${falhas} falhas`);
    fs.writeFileSync(path.join(SAIDA, "tela.txt"), log.join("\n") + "\n");
    process.exitCode = falhas ? 1 : 0;
  }
})();
