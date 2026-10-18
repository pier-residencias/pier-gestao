// Testes de função da associação NF-e → material (sem navegador, sem rede, só dados fictícios).
// Uso: node testes-nfe/funcoes.test.js [caminho do nfe.js]
//   sem argumento: testa o nfe.js desta pasta-mãe (a correção);
//   com o nfe.js antigo: roda a mesma matriz com a regra antiga (linha de base).
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const D = require("./dados-ficticios");

const arquivo = process.argv[2] || path.join(__dirname, "..", "nfe.js");
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(arquivo, "utf8"), ctx);
const L = ctx.LeitorNF;
const NOVA = typeof L.classificar === "function";

// regra antiga (cópia fiel de abrirLote em app.js da main): usada só na linha de base
function regraAntiga(desc, itens, podeNovo) {
  const sug = L.sugerir(desc, itens, 5);
  let sel = "", st = "escolha";
  const folga = sug.length > 1 ? sug[0].nota - sug[1].nota : 1;
  if (sug.length && folga >= 0.08 && (sug[0].nota >= 0.5 || (sug[0].cobre === 1 && sug[0].nota >= 0.35))) { sel = sug[0].it.id; st = "ok"; }
  else if (sug.length && sug[0].nota >= 0.35) { sel = sug[0].it.id; st = "confira"; }
  else if (podeNovo) { sel = "__novo"; st = "novo"; }
  return { status: st, sel, candidatos: sug.map(s => ({ it: s.it, car: "?" })) };
}
const classificar = (desc, est, opc) => NOVA
  ? L.classificar({ descricao: desc, codigo: "" }, D.ESTOQUES[est], Object.assign({ podeNovo: true }, opc || {}))
  : regraAntiga(desc, D.ESTOQUES[est], true);

let ok = 0, falhas = 0;
const linhas = [];
const ver = (cond, id, texto, detalhe) => {
  cond ? ok++ : falhas++;
  linhas.push(`${cond ? "ok    " : "FALHOU"} ${id.padEnd(5)} ${texto}${cond || !detalhe ? "" : "  → " + detalhe}`);
};
const nomeDe = (est, id) => id === "__novo" ? "item novo" : id === "" ? "(nada selecionado)" : ((D.ESTOQUES[est].find(i => i.id === id) || {}).nome || id);
const conflitoPreSelecionado = (r) => NOVA && (r.status === "ok" || r.status === "lembrado") && r.candidatos.some(c => c.it.id === r.sel && c.car === "conflito");

console.log(`Arquivo testado: ${path.relative(process.cwd(), arquivo)} (${NOVA ? "regras novas" : "regra antiga — linha de base"})\n`);

// ---- 6.1 identificação e associação ----
linhas.push("6.1 Identificação e associação");
D.MATRIZ.forEach(c => {
  const r = classificar(c.desc, c.estoque);
  const okSt = c.st.includes(r.status), okSel = c.sel.includes(r.sel);
  const okConf = !NOVA || !c.conflito || c.conflito.every(id => { const x = r.candidatos.find(k => k.it.id === id); return !x || x.car === "conflito"; });
  ver(okSt && okSel && okConf && !conflitoPreSelecionado(r), c.id, `${c.estoque} "${c.desc}" → ${r.status} / ${nomeDe(c.estoque, r.sel)}`,
    `esperado ${c.st.join(" ou ")} / ${c.sel.map(s => nomeDe(c.estoque, s)).join(" ou ")}${okConf ? "" : "; o material com medida diferente não foi marcado como conflito"}`);
});

// ---- mesmo produto, escrita diferente ----
linhas.push("\nMesmo produto com medida escrita de outro jeito");
let acertos = 0, erradosAuto = 0;
D.ESCRITA_DIFERENTE.forEach(c => {
  const r = classificar(c.desc, c.estoque);
  const auto = r.status === "ok" || r.status === "lembrado";
  if (auto && r.sel === c.alvo) acertos++;
  const errado = auto && r.sel !== c.alvo;
  if (errado) erradosAuto++;
  // obrigatório: nunca escolher automaticamente o material errado; desejável: escolher o certo
  ver(!errado && (auto ? r.sel === c.alvo : r.status === "confira"), c.id, `"${c.desc}" → ${r.status} / ${nomeDe(c.estoque, r.sel)}`, `esperado ${nomeDe(c.estoque, c.alvo)} ou "Confira" sem pré-seleção`);
});
const taxa = acertos / D.ESCRITA_DIFERENTE.length;
ver(erradosAuto === 0, "D-ERR", `nenhuma escolha automática errada (${erradosAuto})`);
ver(taxa >= 0.9, "D-90", `pelo menos 90% viram "Já cadastrado" (${Math.round(taxa * 100)}%)`);

// ---- sem medida ou leitura incompleta ----
linhas.push("\nSem medida identificável ou leitura incompleta");
D.SEM_MEDIDA.forEach(c => {
  const r = classificar(c.desc, c.estoque);
  const okSt = c.st.includes(r.status), okSel = !c.sel || c.sel.includes(r.sel), okNunca = !c.nunca || !c.nunca.includes(r.sel);
  ver(okSt && okSel && okNunca && !conflitoPreSelecionado(r), c.id, `"${c.desc}" → ${r.status} / ${nomeDe(c.estoque, r.sel)}`, `esperado ${c.st.join(" ou ")}`);
});

if (NOVA) {
  // ---- leitura das características ----
  linhas.push("\nLeitura das características");
  D.CARACTERISTICAS.forEach(([t, esperado], k) => {
    const lidas = L.caracteristicas(t).lista.map(f => `${f.tipo}:${f.rotulo}${f.principal ? "*" : ""}`);
    const igual = JSON.stringify(lidas) === JSON.stringify(esperado);
    ver(igual, "C" + String(k + 1).padStart(2, "0"), `"${t}" → ${lidas.join(", ") || "(nenhuma)"}`, `esperado ${esperado.join(", ") || "(nenhuma)"}`);
  });

  // ---- 6.2 memória local (regras) ----
  linhas.push("\n6.2 Memória local (regras de uso)");
  const E1 = D.ESTOQUES.E1, car = n => L.assinaturaCar(L.caracteristicas(n));
  let r = L.classificar({ descricao: "FITA CREPE 48X50M" }, E1, { podeNovo: true, antiga: "t1" });
  ver(r.status !== "lembrado" && r.sel !== "t1" && r.memoria && r.memoria.tipo === "ignorada" && /medida diferente/.test(r.memoria.motivo), "T16", `memória antiga 48 mm → fita 24 mm: ignorada ("${r.memoria && r.memoria.motivo}"), escolha ${nomeDe("E1", r.sel)}`);
  r = L.classificar({ descricao: "FITA CREPE 24X50M" }, E1, { podeNovo: true, memoria: { itemId: "t1", origem: "pessoa", quando: "2026-10-01", vezes: 2, carItem: car("Fita crepe 24mm") } });
  ver(r.status === "lembrado" && r.sel === "t1", "T17", `memória v2 de pessoa, compatível → ${r.status} / ${nomeDe("E1", r.sel)}`);
  r = L.classificar({ descricao: "FITA CREPE" }, E1, { podeNovo: true, memoria: { itemId: "t1", origem: "auto", quando: "2026-10-01", vezes: 1, carItem: car("Fita crepe 24mm") } });
  ver(r.status !== "lembrado" && r.sel === "" && r.candidatos[0].it.id === "t1" && r.memoria.tipo === "dica", "T18", `memória v2 automática → ${r.status}, sem pré-seleção, sugerida no topo`);
  r = L.classificar({ descricao: "FITA CREPE 24X50M" }, E1, { podeNovo: true, memoria: { itemId: "t999", origem: "pessoa", quando: "2026-10-01", vezes: 3, carItem: "" } });
  ver(r.status !== "lembrado" && r.memoria.tipo === "ignorada" && /exclu/.test(r.memoria.motivo), "T19", `memória v2 para material excluído → ignorada ("${r.memoria.motivo}"), ${r.status} / ${nomeDe("E1", r.sel)}`);
  const renomeado = E1.map(i => i.id === "t1" ? Object.assign({}, i, { nome: "Fita crepe 48mm (antiga 24)" }) : i);
  r = L.classificar({ descricao: "FITA CREPE 24X50M" }, renomeado, { podeNovo: true, memoria: { itemId: "t1", origem: "pessoa", quando: "2026-10-01", vezes: 3, carItem: car("Fita crepe 24mm") } });
  ver(r.status !== "lembrado" && r.sel !== "t1" && r.memoria.tipo === "ignorada", "T20", `material renomeado de 24 para 48 mm → lembrança cai ("${r.memoria.motivo}")`);
  r = L.classificar({ descricao: "FITA CREPE 24X50M" }, E1, { podeNovo: true, antiga: "t1" });
  ver(r.status === "ok" && r.sel === "t1" && r.memoria.tipo === "dica", "T16b", `memória antiga correta → nunca "lembrado"; a regra decide (${r.status})`);
  r = L.classificar({ descricao: "LAMPADA LED 12W" }, E1, { podeNovo: true, antiga: "t13" });
  ver(r.status === "confira" && r.sel === "", "T16c", `memória antiga aponta outro material compatível → "Confira" sem pré-seleção (${r.status})`);

  // ---- código do fornecedor (R-4) ----
  const comCodigo = E1.map(i => i.id === "t6" ? Object.assign({}, i, { obs: "Cadastrado pela nota 1 · cód. do fornecedor 778899" }) : i);
  r = L.classificar({ descricao: "LAMP BULBO XPTO 12W", codigo: "778899" }, comCodigo, { podeNovo: true });
  ver(r.status === "ok" && r.sel === "t6", "R4a", `código do fornecedor igual → ${r.status} / ${nomeDe("E1", r.sel)}`);
  r = L.classificar({ descricao: "LAMP BULBO XPTO 15W", codigo: "778899" }, comCodigo, { podeNovo: true });
  ver(r.status !== "ok" && r.sel !== "t6", "R4b", `código igual mas potência diferente → não associa (${r.status})`);

  // ---- T33 desempenho ----
  const grande = [];
  for (let k = 0; k < 300; k++) grande.push(D.item("g" + k, ["Fita crepe", "Parafuso", "Lâmpada LED", "Disjuntor", "Cabo flexível", "Registro"][k % 6] + " " + (k % 50 + 1) + ["mm", "mm", "W", "A", "mm²", "\""][k % 6], "un"));
  const notas = []; for (let k = 0; k < 30; k++) notas.push({ descricao: ["FITA CREPE 24X50M", "PARAFUSO 8MM", "LAMPADA LED 15W", "DISJUNTOR 32A", "CABO FLEX 4MM2", "REGISTRO 1/2\""][k % 6] });
  const t0 = process.hrtime.bigint();
  notas.forEach(n => L.classificar(n, grande, { podeNovo: true }));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ver(ms < 200, "T33", `30 linhas × 300 materiais em ${ms.toFixed(0)} ms (limite 200 ms no Node; no navegador é medido no teste de tela)`);
}

console.log(linhas.join("\n"));
console.log(`\n${ok} ok · ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
