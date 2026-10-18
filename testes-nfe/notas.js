// Gera PDFs de DANFE FICTÍCIOS (fornecedor, números e produtos inventados) para os testes de tela.
"use strict";
const caminho = n => { for (const p of [n, "/opt/npm-tools/node_modules/" + n]) { try { return require(p); } catch (e) {} } throw new Error("Instale o pacote " + n); };
const { PDFDocument, StandardFonts } = caminho("pdf-lib");

const FORNECEDOR = "LOJA FICTICIA DE MATERIAIS TESTE LTDA";
const br = (n, casas) => { const [i, d] = n.toFixed(casas).split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : ""); };
const numeroNF = n => String(n).padStart(9, "0").replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");

// nota: {numero, fornecedor, data:"AAAA-MM-DD", itens:[{codigo, desc, un, qtd, vu}]}
async function gerarNota(nota) {
  const pdf = await PDFDocument.create();
  const pag = pdf.addPage([595, 842]);
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const t = (s, x, y, tam) => pag.drawText(String(s), { x, y, size: tam || 8, font: f });
  const forn = nota.fornecedor || FORNECEDOR;
  const [aa, mm, dd] = (nota.data || "2026-10-15").split("-");
  t(`RECEBEMOS DE ${forn} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, 30, 800, 7);
  if (nota.numero) t(`NF-e   Nº ${numeroNF(nota.numero)}   SÉRIE 1`, 420, 780);
  t("DANFE", 270, 760, 10);
  t(`EMISSÃO: ${dd}/${mm}/${aa}`, 30, 740);
  const total = nota.itens.reduce((s, i) => s + Math.round(i.qtd * i.vu * 100) / 100, 0);
  t(`VALOR TOTAL: R$ ${br(total, 2)}`, 300, 740);
  t("DADOS DOS PRODUTOS / SERVIÇOS", 30, 700);
  const col = [30, 80, 300, 345, 375, 405, 430, 480, 535];
  ["CÓDIGO", "DESCRIÇÃO DO PRODUTO", "NCM", "CST", "CFOP", "UN", "QUANT", "V.UNIT", "V.TOTAL"].forEach((h, k) => t(h, col[k], 686, 6));
  nota.itens.forEach((it, k) => {
    const y = 670 - k * 14;
    const vt = Math.round(it.qtd * it.vu * 100) / 100;
    [it.codigo || String(100200 + k), it.desc, "48114100", "060", "5102", it.un || "UN", br(it.qtd, 4), br(it.vu, 4), br(vt, 2)].forEach((v, j) => t(v, col[j], y, 7));
  });
  t("DADOS ADICIONAIS", 30, 670 - nota.itens.length * 14 - 20);
  t("Documento fictício gerado para teste local. Sem valor fiscal.", 30, 670 - nota.itens.length * 14 - 34, 6);
  return Buffer.from(await pdf.save());
}
module.exports = { gerarNota, FORNECEDOR };
