// T31 — a leitura da nota (PDF e foto) continua exatamente igual à versão em produção (main).
// Compara o nfe.js desta branch com o da main: (1) o trecho de leitura é idêntico, byte a byte;
// (2) as funções antigas dão o mesmo resultado nas mesmas entradas fictícias.
// Uso: node testes-nfe/regressao.test.js [caminho do nfe.js antigo]   (sem argumento: git show origin/main:nfe.js)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), { execSync } = require("child_process");
const RAIZ = path.join(__dirname, "..");
const antigo = process.argv[2] ? fs.readFileSync(process.argv[2], "utf8") : execSync("git show origin/main:nfe.js", { cwd: RAIZ, encoding: "utf8" });
const novo = fs.readFileSync(path.join(RAIZ, "nfe.js"), "utf8");
const carregar = src => { const c = {}; vm.createContext(c); vm.runInContext(src, c); return c.LeitorNF; };
const A = carregar(antigo), N = carregar(novo);
let ok = 0, falhas = 0;
const ver = (c, id, t, det) => { c ? ok++ : falhas++; console.log(`${c ? "ok    " : "FALHOU"} ${id.padEnd(5)} ${t}${c || !det ? "" : "  → " + det}`); };

// (1) o código de leitura não mudou: tudo antes do bloco novo é igual ao arquivo antigo (sem a linha de exportação)
const corte = novo.indexOf("  // ---------- características do produto");
const fimAntigo = antigo.indexOf("  raiz.LeitorNF = {");
ver(corte > 0 && fimAntigo > 0 && novo.slice(0, corte) === antigo.slice(0, fimAntigo), "T31a", `trecho de leitura (${novo.slice(0, corte).split("\n").length} linhas: montarLinhas, lerDanfe, foto, sugerir, parecido, cobertura) idêntico ao da main`);
ver(Object.keys(A).every(k => typeof N[k] === typeof A[k]), "T31b", `todas as funções antigas continuam exportadas: ${Object.keys(A).join(", ")}`);

// (2) mesmas saídas nas mesmas entradas (notas fictícias)
const pdfLinhas = [
  "RECEBEMOS DE LOJA FICTICIA DE MATERIAIS TESTE LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL",
  "NF-e  Nº 000.012.345  SÉRIE 1", "EMISSÃO: 10/10/2026  VALOR TOTAL: R$ 1.234,56",
  "CHAVE DE ACESSO 3326 1012 3456 7800 0199 5500 1000 0123 4510 0000 0012",
  "DADOS DOS PRODUTOS / SERVIÇOS", "CÓDIGO  DESCRIÇÃO DO PRODUTO  NCM  CST  CFOP  UN  QUANT  V.UNIT  V.TOTAL",
  "100200  FITA CREPE 48X50M  48114100  060  5102  RL  4,0000  12,5000  50,00",
  "100201  PARAFUSO SEXTAVADO 8MM X 40MM ZINCADO  73181500  060  5102  UN  50  0,2000  10,00",
  "100202  CABO FLEXIVEL 2,5MM 100M AZUL  85444900  060  5102  RL  1,0000  210,0000  210,00",
  "PARA USO GERAL",
  "100203  LAMPADA LED 12W BIVOLT E27  85395000  060  5102  UN  10,0000  11,0000  110,00",
  "DADOS ADICIONAIS"
];
const fotoLinhas = [
  "LOJA FICTICIA DE MATERIAIS TESTE LTDA", "DANFE  000.012.346", "10/10/2026",
  "| 100200 FITA CREPE 48X5OM 48114100 060 5102 RL 4,0000 12,5000 50,00 |",
  "1OO201 PARAFUSO 8MM 73181500 060 5102 UN 50 0,2000 1000",
  "[100202 DISJUNTOR 32A 85362000 060 5102 UN 2 25,0000 50,00",
  "CARGA TRIBUTARIA APROXIMADA", "DADOS ADICIONAIS"
];
const casos = [
  ["lerDanfe", () => JSON.stringify(A.lerDanfe(pdfLinhas)), () => JSON.stringify(N.lerDanfe(pdfLinhas))],
  ["lerFotoDanfe", () => JSON.stringify(A.lerFotoDanfe(fotoLinhas)), () => JSON.stringify(N.lerFotoDanfe(fotoLinhas))],
  ["numerosDaLinha", () => JSON.stringify(fotoLinhas.map(A.numerosDaLinha)), () => JSON.stringify(fotoLinhas.map(N.numerosDaLinha))],
  ["descricaoDaLinha", () => JSON.stringify(fotoLinhas.map(A.descricaoDaLinha)), () => JSON.stringify(fotoLinhas.map(N.descricaoDaLinha))],
  ["montarLinhas", () => JSON.stringify(A.montarLinhas([[{ str: "100200", transform: [8, 0, 0, 8, 30, 600], width: 24 }, { str: "FITA CREPE", transform: [8, 0, 0, 8, 80, 600], width: 40 }, { str: "4,0000", transform: [8, 0, 0, 8, 430, 600.5], width: 22 }]])),
    () => JSON.stringify(N.montarLinhas([[{ str: "100200", transform: [8, 0, 0, 8, 30, 600], width: 24 }, { str: "FITA CREPE", transform: [8, 0, 0, 8, 80, 600], width: 40 }, { str: "4,0000", transform: [8, 0, 0, 8, 430, 600.5], width: 22 }]]))],
  ["parecido/cobertura", () => JSON.stringify([["FITA CREPE 48X50M", "Fita crepe 24mm"], ["PARAFUSO 8MM", "Parafuso 6mm"], ["LAMP LED", "Lâmpada LED 9W"]].map(([a, b]) => [A.parecido(a, b), A.cobertura(a, b)])),
    () => JSON.stringify([["FITA CREPE 48X50M", "Fita crepe 24mm"], ["PARAFUSO 8MM", "Parafuso 6mm"], ["LAMP LED", "Lâmpada LED 9W"]].map(([a, b]) => [N.parecido(a, b), N.cobertura(a, b)]))],
  ["sugerir (usado para copiar a categoria do item novo)", () => JSON.stringify(A.sugerir("FITA CREPE 48X50M", require("./dados-ficticios").ESTOQUES.E1, 5).map(s => [s.it.id, s.nota])),
    () => JSON.stringify(N.sugerir("FITA CREPE 48X50M", require("./dados-ficticios").ESTOQUES.E1, 5).map(s => [s.it.id, s.nota]))]
];
casos.forEach(([nome, a, b], k) => { const x = a(), y = b(); ver(x === y, "T31" + String.fromCharCode(99 + k), `${nome}: mesmo resultado (${x.length} caracteres)`, `antes ${x.slice(0, 120)} · agora ${y.slice(0, 120)}`); });
const lidos = N.lerDanfe(pdfLinhas);
ver(lidos.numero === "12345" && lidos.itens.length === 4 && lidos.itens[1].descricao === "PARAFUSO SEXTAVADO 8MM X 40MM ZINCADO" && lidos.itens[2].descricao === "CABO FLEXIVEL 2,5MM 100M AZUL PARA USO GERAL", "T31j", `PDF fictício lido: nota ${lidos.numero}, ${lidos.itens.length} itens, descrição quebrada em duas linhas juntada`);
console.log(`\n${ok} ok · ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
