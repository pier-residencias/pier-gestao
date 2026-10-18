// Leitura da DANFE (nota fiscal eletrônica em PDF) para preencher as entradas.
// Funciona com o PDF que a loja envia, que já traz o texto; foto de nota não tem texto para ler.
(function (raiz) {
  "use strict";
  const NUM = "\\d{1,3}(?:\\.\\d{3})*,\\d{2,10}";
  // quantidade: algumas lojas escrevem sem casas decimais ("8" em vez de "8,0000")
  const QTD = "\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,10})?";
  const UNIDADES = "UN|UND|UNID|PC|PCS|PCT|PT|CX|M|MT|MTS|M2|M3|KG|G|GR|L|LT|ML|RL|RLO|SC|SACO|GL|GALAO|JG|KIT|PAR|BD|BL|FD|TB|CJ|CT|LATA|LT|FR|BR|BARRA|DZ|CENTO|MIL|TON";
  const numBR = s => Number(String(s).replace(/\./g, "").replace(",", "."));

  // junta os pedaços de texto do PDF em linhas, na ordem da página; colunas separadas por dois espaços
  function montarLinhas(paginas) {
    const linhas = [];
    paginas.forEach(itens => {
      const pedacos = itens.filter(i => i && typeof i.str === "string" && i.str.trim() !== "")
        .map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, h: Math.abs(i.transform[3]) || Math.abs(i.transform[0]) || 8 }));
      pedacos.sort((a, b) => b.y - a.y || a.x - b.x);
      const grupos = [];
      pedacos.forEach(p => {
        const g = grupos.find(g => Math.abs(g.y - p.y) <= Math.max(2, p.h * 0.35));
        if (g) g.itens.push(p); else grupos.push({ y: p.y, itens: [p] });
      });
      grupos.sort((a, b) => b.y - a.y);
      grupos.forEach(g => {
        g.itens.sort((a, b) => a.x - b.x);
        let txt = "", fim = null;
        g.itens.forEach(p => {
          if (fim === null) txt = p.s;
          else {
            const vao = p.x - fim, letra = p.h * 0.5;
            txt += vao > letra * 1.6 ? "  " + p.s : vao > letra * 0.15 ? " " + p.s : p.s;
          }
          fim = p.x + p.w;
        });
        linhas.push(txt.replace(/\s+$/, ""));
      });
      linhas.push("");
    });
    return linhas;
  }

  function limparDescricao(s) {
    return String(s).replace(/\s{2,}/g, " ").replace(/[\s$*#]+$/g, "").replace(/^[\s\-–]+/, "").trim();
  }

  function lerDanfe(linhas) {
    const texto = linhas.join("\n");
    const um = (re, t) => { const m = re.exec(t === undefined ? texto : t); return m ? m[1].trim() : ""; };
    const out = { fornecedor: "", numero: "", data: "", valorTotal: null, chave: "", itens: [] };

    out.fornecedor = um(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i).replace(/\s{2,}/g, " ");
    if (!out.fornecedor) {
      // nome do emitente na linha de baixo do canhoto
      const i = linhas.findIndex(l => /RECEBEMOS DE/i.test(l));
      const prox = i >= 0 ? (linhas[i + 1] || "").split(/\s{2,}/)[0].trim() : "";
      if (prox && /[a-z]{3}/i.test(prox) && !/^(N[º°o]|DATA|S[ÉE]RIE|DANFE)/i.test(prox)) out.fornecedor = prox;
    }
    if (!out.fornecedor) {
      const i = linhas.findIndex(l => /IDENTIFICA[CÇ][AÃ]O DO EMITENTE/i.test(l));
      if (i >= 0) out.fornecedor = (linhas.slice(i + 1, i + 4).map(l => l.split(/\s{2,}/)[0].trim()).filter(Boolean)[0] || "");
    }
    const n = um(/N[º°o]\.?\s*:?\s*(\d{1,3}(?:\.\d{3})+|\d{3,9})\b/);
    out.numero = n ? String(Number(n.replace(/\./g, ""))) : "";
    const d = um(/EMISS[ÃA]O:\s*(\d{2}\/\d{2}\/\d{4})/i) || um(/DATA (?:DA|DE) EMISS[ÃA]O[\s\S]{0,400}?(\d{2}\/\d{2}\/\d{4})/i);
    if (d) { const [dd, mm, aa] = d.split("/"); out.data = aa + "-" + mm + "-" + dd; }
    const vt = um(/VALOR TOTAL:\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i) || um(/VALOR TOTAL DA NOTA[^\n]*\n[^\n]*?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/im);
    if (vt) out.valorTotal = numBR(vt);
    const ch = /((?:\d{4}\s?){11})/.exec(texto.replace(/[^\d\s]/g, " ").replace(/ {2,}/g, " "));
    if (ch) out.chave = ch[1].replace(/\s/g, "");

    // tabela de produtos: entre "DADOS DO(S) PRODUTO(S)" e "DADOS ADICIONAIS" (ou cálculo do ISSQN)
    let ini = linhas.findIndex(l => /DADOS DOS? PRODUTOS?/i.test(l));
    if (ini < 0) ini = 0;
    let fim = linhas.findIndex((l, i) => i > ini && /DADOS ADICIONAIS|C[AÁ]LCULO DO ISSQN|INFORMA[CÇ][OÕ]ES COMPLEMENTARES/i.test(l));
    if (fim < 0) fim = linhas.length;
    const reCompleta = new RegExp("^\\s*(\\S+)\\s+(.+?)\\s+(\\d{8})\\s+(\\d{3,4})\\s+(\\d{4})\\s+([A-Za-z][A-Za-z0-9]{0,5})\\s+(" + QTD + ")\\s+(" + NUM + ")\\s+(" + NUM + ")");
    const reSimples = new RegExp("^\\s*(?:(\\d{3,14})\\s+)?(.+?)\\s+(" + UNIDADES + ")\\s+(" + NUM + ")\\s+(" + NUM + ")\\s+(" + NUM + ")", "i");
    const cabecalho = /DESCRI[CÇ][AÃ]O|C[OÓ]DIGO|QUANT|UNIT[AÁ]RIO|PROD\.|CSOSN|AL[IÍ]QUOTAS|NCM/i;
    let ultimo = null;
    for (let i = ini + 1; i < fim; i++) {
      const l = linhas[i];
      if (!l.trim()) { ultimo = null; continue; }
      let m = reCompleta.exec(l), item = null;
      if (m) item = { codigo: m[1], descricao: m[2], unidade: m[6], qtd: numBR(m[7]), valorUnit: numBR(m[8]), valorTotal: numBR(m[9]) };
      else if ((m = reSimples.exec(l))) item = { codigo: m[1] || "", descricao: m[2].replace(/\s+\d{8}(\s+\d{3,4}){0,2}\s*$/, ""), unidade: m[3].toUpperCase(), qtd: numBR(m[4]), valorUnit: numBR(m[5]), valorTotal: numBR(m[6]) };
      if (item && item.qtd > 0) {
        item.descricao = limparDescricao(item.descricao);
        out.itens.push(item); ultimo = item; continue;
      }
      // descrição que quebrou para a linha de baixo
      const resto = l.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (ultimo && resto.length === 1 && !cabecalho.test(l) && !/\d,\d{2}/.test(l) && resto[0].length < 80) {
        ultimo.descricao = limparDescricao(ultimo.descricao + " " + resto[0]);
      } else ultimo = null;
    }
    return out;
  }

  // ---------- foto da nota (texto vindo do reconhecimento de caracteres) ----------
  // o OCR troca letras por números ("O"→0, "S"→5), perde vírgulas ("800" = 8,00) e lê as bordas
  // da tabela como "|" ou "[". Por isso cada linha é aceita quando quantidade × unitário = total.
  const TROCA = { O: "0", o: "0", Q: "0", D: "0", l: "1", I: "1", i: "1", "!": "1", "|": "1", S: "5", s: "5", B: "8", Z: "2", z: "2", g: "9", q: "9" };
  const reUnidade = new RegExp("^(?:" + UNIDADES + ")$", "i");
  function digitos(tok) {
    const t = String(tok).replace(/[.,;:]+$/, "").replace(/^[.,]+/, "");
    if (!t || !/\d/.test(t)) return null;
    const f = t.replace(/[OoQDlIi!|SsBZzgq]/g, c => TROCA[c]);
    return /^\d+(?:[.,]\d+)*$/.test(f) ? f : null;
  }
  // valores possíveis de um número lido: com separador decimal, ou sem a vírgula que sumiu
  function candidatos(f, qtd) {
    const m = /^(.*?)[.,](\d{1,4})$/.exec(f);
    if (m) {
      const v = Number(m[1].replace(/[.,]/g, "") + "." + m[2]);
      return [{ v, p: 0 }];
    }
    const n = Number(f);
    // preço na DANFE sempre tem centavos: sem vírgula, o mais provável é que ela tenha sumido
    if (!qtd) return f.length >= 3 ? [{ v: n / 100, p: 1 }, { v: n, p: 2 }] : [{ v: n, p: 2 }];
    const out = [{ v: n, p: 0 }];
    if (f.length >= 3) out.push({ v: n / 100, p: 1 });
    if (f.length >= 4) out.push({ v: n / 1000, p: 2 }, { v: n / 10000, p: 2 });
    return out;
  }
  const tokensFoto = linha => String(linha || "").replace(/[\[\]{}()“”"'‘’`~«»_—–=*®©°¢$^]+/g, " ").replace(/\|/g, " | ").replace(/\s+/g, " ").trim().split(" ").filter(t => t && t !== "|");
  // código e descrição: entre o código do produto e o NCM (8 dígitos); fim = posição da unidade (ou fim da linha)
  function descricaoFoto(toks, fim) {
    let ini = 0, codigo = "";
    const c0 = toks.length ? digitos(toks[0].replace(/\.$/, "")) : null;
    if (c0 && /^\d{3,14}$/.test(c0)) { codigo = c0; ini = 1; }
    let fimDesc = fim;
    for (let k = fim - 1; k > ini; k--) {
      const f = digitos(toks[k].replace(/^[^\dOoSsIl]+/, ""));
      if (f && /^\d{7,9}$/.test(f.replace(/[.,]/g, ""))) { fimDesc = k; break; }
    }
    if (fimDesc === fim) { // sem NCM legível: tira CST/CFOP do fim
      while (fimDesc - 1 > ini && digitos(toks[fimDesc - 1]) && /^\d{3,4}$/.test(digitos(toks[fimDesc - 1]))) fimDesc--;
    }
    const palavras = toks.slice(ini, fimDesc);
    while (palavras.length && palavras[0].length === 1 && !/\d/.test(palavras[0])) palavras.shift();
    // descrição em maiúsculas: palavras com minúsculas no fim são lixo do OCR (ex.: "sa0s", "eo")
    const maiusc = palavras.filter(w => /[A-Z]{2}/.test(w)).length >= Math.max(1, palavras.length / 2);
    while (palavras.length > 1) {
      const w = palavras[palavras.length - 1];
      if ((w.length === 1 && !/\d/.test(w)) || (maiusc && /[a-z]/.test(w)) || /^[^A-Za-z0-9]+$/.test(w)) palavras.pop(); else break;
    }
    // borda da tabela lida como "I" grudado na primeira palavra ("ICARTUCHO")
    if (palavras.length && /^[Il|][BCFHJKPQVWXYZ][A-Z]{2,}/.test(palavras[0])) palavras[0] = palavras[0].slice(1);
    const descricao = limparDescricao(palavras.join(" ").replace(/^[^A-Za-z0-9À-ú]+/, ""));
    return /[A-Za-zÀ-ú]{3}/.test(descricao) ? { codigo, descricao } : null;
  }
  // quantidade, unitário e total a partir dos números lidos (p = quanto foi preciso "adivinhar")
  function numerosFoto(nums, janelas) {
    let melhor = null;
    for (let a = 0; a + 2 < nums.length && a < janelas; a++) {
      candidatos(nums[a], true).forEach(q => candidatos(nums[a + 1]).forEach(vu => candidatos(nums[a + 2]).forEach(vt => {
        if (q.v <= 0 || vu.v <= 0 || vt.v <= 0) return;
        if (Math.abs(q.v * vu.v - vt.v) > 0.006 + q.v * 0.005) return;
        const p = q.p + vu.p + vt.p + a * 0.5;
        if (!melhor || p < melhor.p) melhor = { p, qtd: q.v, valorUnit: vu.v, valorTotal: vt.v };
      })));
    }
    if (!melhor) {
      // quantidade ilegível: unitário e total seguidos, e a quantidade sai da divisão
      for (let a = 0; a + 1 < nums.length && a < janelas + 1; a++) {
        candidatos(nums[a]).forEach(vu => candidatos(nums[a + 1]).forEach(vt => {
          if (vu.v <= 0 || vt.v <= 0) return;
          const q = vt.v / vu.v, r = Math.round(q);
          if (r < 1 || r > 999 || Math.abs(q - r) > 0.001) return;
          const p = 3 + vu.p + vt.p + a * 0.5;
          if (!melhor || p < melhor.p) melhor = { p, qtd: r, valorUnit: vu.v, valorTotal: vt.v };
        }));
      }
    }
    if (!melhor) {
      // unitário ilegível: quantidade inteira antes do total com centavos
      const k = nums.findIndex(f => /[.,]\d{2}$/.test(f) && candidatos(f)[0].v > 0);
      if (k > 0) {
        const vt = candidatos(nums[k])[0].v;
        for (let j = k - 1; j >= 0 && j >= k - 3; j--) {
          if (!/^\d{1,3}$/.test(nums[j]) || Number(nums[j]) < 1) continue;
          const vu = vt / Number(nums[j]);
          if (Math.abs(vu * 100 - Math.round(vu * 100)) < 1e-6) { melhor = { p: 5, qtd: Number(nums[j]), valorUnit: vu, valorTotal: vt }; break; }
        }
      }
    }
    return melhor;
  }
  function numerosDeToks(toks, desde) {
    const nums = [];
    for (let k = desde; k < toks.length && nums.length < 8; k++) {
      const f = digitos(toks[k]);
      if (f) nums.push(f); else if (toks[k].length > 3) break;
    }
    return nums;
  }
  // números de uma linha de produto recortada da foto (com ou sem a unidade legível)
  function numerosDaLinha(texto) {
    const toks = tokensFoto(texto);
    let u = -1; toks.forEach((t, k) => { if (reUnidade.test(t)) u = k; });
    const nums = u >= 0 ? numerosDeToks(toks, u + 1) : toks.map(digitos).filter(f => f && !/^\d{5,}$/.test(f)).slice(0, 8);
    const m = nums.length >= 2 ? numerosFoto(nums, u >= 0 ? 2 : 6) : null;
    // sem a unidade como âncora, só vale a conta exata (quantidade × unitário = total)
    if (!m || (u < 0 && m.p > 1)) return null;
    return Object.assign(m, { unidade: u >= 0 ? toks[u].toUpperCase() : "" });
  }
  // linha da faixa esquerda: código + descrição (+ unidade, se couber)
  function descricaoDaLinha(texto) {
    if (/CARGA TRIBUT|FONTE DA|FCP|RETIDO/i.test(texto)) return null;
    const toks = tokensFoto(texto);
    while (toks.length && !/[A-Za-z0-9]/.test(toks[0])) toks.shift(); // lixo antes do código (", 65352")
    // a unidade vem logo depois do CFOP/CST (números); "BR" no meio da descrição não conta
    let u = toks.length; toks.forEach((t, k) => { if (k > 1 && u === toks.length && reUnidade.test(t) && /^\d{3,9}$/.test(digitos(toks[k - 1]) || "")) u = k; });
    const d = descricaoFoto(toks, u);
    return d && d.codigo ? Object.assign(d, { unidade: u < toks.length ? toks[u].toUpperCase() : "" }) : null;
  }
  function linhaDeProdutoFoto(linha) {
    const toks = tokensFoto(linha);
    for (let u = 1; u < toks.length - 1; u++) {
      if (!reUnidade.test(toks[u])) continue;
      const nums = numerosDeToks(toks, u + 1).slice(0, 5);
      if (nums.length < 2) continue;
      const d = descricaoFoto(toks, u);
      if (!d) continue;
      const melhor = numerosFoto(nums, 2);
      let item;
      if (melhor) item = { qtd: melhor.qtd, valorUnit: melhor.valorUnit, valorTotal: melhor.valorTotal, incerto: melhor.p > 1, p: melhor.p };
      else {
        // não fechou a conta: aproveita o que der e marca para conferir
        const dec = nums.map(f => candidatos(f)[0]).map((c, k) => /[.,]\d{2}$/.test(nums[k]) ? c.v : null);
        const q = /^\d{1,4}$/.test(nums[0]) ? Number(nums[0]) : (dec[0] || 1);
        const vt = dec[2] != null ? dec[2] : null;
        const vu = dec[1] != null ? dec[1] : vt != null && q ? vt / q : 0;
        item = { qtd: q || 1, valorUnit: vu || 0, valorTotal: vt != null ? vt : (q || 1) * (vu || 0), incerto: true, p: 9 };
      }
      return Object.assign({ codigo: d.codigo, descricao: d.descricao, unidade: toks[u].toUpperCase() }, item);
    }
    return null;
  }
  // faixa da tabela de produtos na foto, pelas linhas (com posição) da leitura da página inteira
  function regiaoProdutos(linhasBox, altura) {
    const alt = linhasBox.map(l => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b)[Math.floor(linhasBox.length / 2)] || 30;
    const marcos = linhasBox.filter(l => /CARGA TRIBUT|FONTE DA CARGA/i.test(l.text) || linhaDeProdutoFoto(l.text) || descricaoDaLinha(l.text) && /\d{7,8}/.test(l.text));
    const cab = linhasBox.filter(l => /DADOS DOS PRODUTOS|DESCRI[CÇ][AÃ]O DOS PRODUTOS|C[OÓ]D\.? ?PRODUTO/i.test(l.text));
    let y0 = marcos.length ? Math.min(...marcos.map(l => l.bbox.y0)) - alt * 1.5 : cab.length ? cab[0].bbox.y1 : altura * 0.35;
    if (cab.length && cab[cab.length - 1].bbox.y1 < y0 + alt * 3) y0 = Math.min(y0, cab[cab.length - 1].bbox.y1);
    const fimL = linhasBox.filter(l => l.bbox.y0 > y0 + alt && /ISSQN|DADOS ADICIONAIS|INFORMA[CÇ][OÕ]ES COMPLEMENTARES/i.test(l.text));
    const y1 = fimL.length ? Math.min(...fimL.map(l => l.bbox.y0)) : altura;
    return { y0: Math.max(0, Math.round(y0)), y1: Math.round(y1), alt };
  }
  function lerFotoDanfe(linhas) {
    linhas = linhas.map(l => String(l || "").replace(/\s+/g, " ").trim());
    const out = lerDanfe(linhas.map(l => l)); // cabeçalho com as mesmas regras do PDF
    out.foto = true;
    const texto = linhas.join("\n");
    // fornecedor: a primeira razão social (termina em LTDA, S/A, EIRELI, ME, EPP)
    const forn = linhas.slice(0, 25).map(l => /^(.*?\b(?:LTDA|EIRELI|S\/A|S\.A|EPP)\b\.?)/i.exec(l.replace(/^[^A-Za-z0-9]+/, "")))
      .filter(m => m && /[A-Za-z]{3}/.test(m[1]) && !/RECEBEMOS|PRODUTOS/i.test(m[1])).map(m => m[1].replace(/\s{2,}/g, " ").trim())
      .sort((a, b) => (/^[A-Z0-9]/.test(b) - /^[A-Z0-9]/.test(a)) || b.length - a.length)[0];
    if (forn && (!out.fornecedor || /RECEBEMOS|PRODUTOS/i.test(out.fornecedor))) out.fornecedor = forn;
    if (!out.numero) { const m = /\b(\d{3}\.\d{3}\.\d{3})\b/.exec(texto); if (m) out.numero = String(Number(m[1].replace(/\./g, ""))); }
    if (!out.data) { const m = /\b(\d{2})\/(\d{2})\/(20\d{2})\b/.exec(texto); if (m) out.data = m[3] + "-" + m[2] + "-" + m[1]; }
    const fim = linhas.findIndex(l => /DADOS ADICIONAIS|C[AÁ]LCULO DO ISSQN|INFORMA[CÇ][OÕ]ES COMPLEMENTARES/i.test(l));
    out.itens = [];
    linhas.slice(0, fim > 0 ? fim : linhas.length).forEach(l => {
      if (/CARGA TRIBUT|FCP|FATURA|VALOR (DO|TOTAL)|BASE DE C/i.test(l)) return;
      const it = linhaDeProdutoFoto(l);
      if (it) out.itens.push(it);
    });
    return out;
  }

  // sugere os itens do estoque mais parecidos com a descrição da nota
  const PARADAS = new Set(["de", "da", "do", "das", "dos", "p", "para", "com", "c", "e", "em", "un", "und", "pc", "cx", "kit"]);
  function fichas(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2")
      .split(/[^a-z0-9]+/).filter(t => t && !PARADAS.has(t));
  }
  function parecido(desc, nome) {
    const a = fichas(desc), b = fichas(nome);
    if (!a.length || !b.length) return 0;
    let pontos = 0;
    a.forEach(t => {
      let melhor = 0;
      b.forEach(u => {
        if (t === u) melhor = 1;
        else if (t.length >= 3 && u.length >= 3 && (u.startsWith(t) || t.startsWith(u))) melhor = Math.max(melhor, 0.75);
        else if (t.length >= 4 && u.length >= 4 && t.slice(0, 4) === u.slice(0, 4)) melhor = Math.max(melhor, 0.5);
      });
      pontos += /^\d+$/.test(t) ? melhor * 0.6 : melhor;
    });
    const peso = a.reduce((s, t) => s + (/^\d+$/.test(t) ? 0.6 : 1), 0);
    return pontos / Math.max(peso, Math.min(b.length, 4) * 0.8);
  }
  // quanto do nome do item do estoque aparece na descrição da nota (1 = todas as palavras)
  function cobertura(desc, nome) {
    const a = fichas(desc), b = fichas(nome).filter(t => t.length >= 2);
    if (!b.length) return 0;
    const acha = u => a.some(t => t === u || (t.length >= 3 && u.length >= 3 && (t.startsWith(u) || u.startsWith(t))));
    return b.filter(acha).length / b.length;
  }
  function sugerir(desc, itens, n) {
    return itens.map(it => ({ it, nota: parecido(desc, it.nome + " " + (it.codigo || "")), cobre: cobertura(desc, it.nome) }))
      .filter(x => x.nota > 0.2).sort((x, y) => (y.nota - x.nota) || (y.cobre - x.cobre)).slice(0, n || 5);
  }

  // ---------- características do produto: medida, polegada, seção, potência, corrente, tensão, volume, peso ----------
  // Regra central: uma característica diferente nunca é aceita sozinha. A semelhança do texto só ordena as sugestões.
  const LIMITES = {
    AUTO: 0.6,        // semelhança mínima para "Já cadastrado"
    FOLGA: 0.15,      // vantagem mínima sobre o segundo material possível
    CONFIRA: 0.35,    // abaixo disso, a linha vira "Item novo"
    SUGERE: 0.2,      // abaixo disso, o material nem aparece em "Mais parecidos"
    TOLERANCIA: 0.005 // arredondamento aceito entre duas medidas (0,5%)
  };
  const FRACAO = { 0.125: "1/8", 0.25: "1/4", 0.375: "3/8", 0.5: "1/2", 0.625: "5/8", 0.75: "3/4", 0.875: "7/8" };
  const SECOES = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
  const numC = s => { const t = String(s); return /^\d{1,3}\.\d{3}$/.test(t) ? Number(t.replace(".", "")) : Number(t.replace(",", ".")); };
  const virgula = n => String(Math.round(n * 1000) / 1000).replace(".", ",");
  const MM = { mm: 1, cm: 10, m: 1000, mt: 1000, mts: 1000, metro: 1000, metros: 1000 };
  function rotuloMedida(f) {
    if (f.semUnidade) return virgula(f.bruto);
    return f.valor >= 1000 ? virgula(f.valor / 1000) + " m" : virgula(f.valor) + " mm";
  }
  function rotuloPol(v) {
    const int = Math.floor(v + 1e-9), fr = Math.round((v - int) * 1000) / 1000;
    return (int ? String(int) : "") + (fr ? (int ? " " : "") + (FRACAO[fr] || virgula(fr)) : "") + '"';
  }
  const ROTULO = {
    medida: rotuloMedida, pol: f => rotuloPol(f.valor), secao: f => virgula(f.valor) + " mm²",
    potencia: f => virgula(f.valor) + " W", corrente: f => virgula(f.valor) + " A",
    tensao: f => f.valores.join("/") + " V",
    volume: f => f.valor >= 1000 ? virgula(f.valor / 1000) + " L" : virgula(f.valor) + " ml",
    massa: f => f.valor >= 1000 ? virgula(f.valor / 1000) + " kg" : virgula(f.valor) + " g"
  };
  // lê as características de uma descrição; "resto" é o texto sem elas, para comparar as palavras
  function caracteristicas(texto) {
    let t = " " + String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[”“″]/g, '"').replace(/''/g, '"').replace(/²/g, "2") + " ";
    const lista = [];
    const tira = (re, fn) => { t = t.replace(re, function () { const r = fn.apply(null, arguments); return r === false ? arguments[0] : " ".repeat(arguments[0].length); }); };
    const add = (tipo, f) => { f.tipo = tipo; lista.push(f); };
    const N = "(\\d+(?:[.,]\\d+)?)", FIM = "(?![a-z0-9])";
    const eFio = /\b(cabo|fio|cordao)\b/.test(t), eDisj = /\bdisj/.test(t);
    // seção de cabo: 2,5mm2 / 2,5 mm²
    tira(new RegExp(N + "\\s*mm\\s*2" + FIM, "g"), (m, n) => add("secao", { valor: numC(n), principal: true }));
    // polegadas: 2 1/2" · 3/4 · 3/4 pol · 2"
    tira(/(?:\b(\d+)\s+)?\b(\d+)\s*\/\s*(2|4|8|16|32|64)\b\s*(?:"|pol(?:egadas?)?\b)?/g, (m, i, a, b) => {
      if (Number(a) >= Number(b)) return false;
      add("pol", { valor: (i ? Number(i) : 0) + Number(a) / Number(b), principal: true });
    });
    tira(new RegExp(N + "\\s*(?:\"|pol(?:egadas?)?" + FIM + ")", "g"), (m, n) => add("pol", { valor: numC(n), principal: true }));
    // dimensões: 24x50m · 48mm x 50m · 15x15cm · 4x2
    const U = "(mm|cm|mts|mt|m)?";
    tira(new RegExp(N + "\\s*" + U + "\\s*x\\s*" + N + "\\s*" + U + "(?:\\s*x\\s*" + N + "\\s*" + U + ")?" + FIM, "g"), (m, n1, u1, n2, u2, n3, u3) => {
      const ns = [n1, n2, n3].filter(x => x !== undefined), us = [u1, u2, u3].slice(0, ns.length);
      if (!us.some(Boolean)) { ns.forEach((n, k) => add("medida", { bruto: numC(n), semUnidade: true, principal: k === 0 })); return; }
      // largura sem unidade antes de um comprimento em metros: é milímetro (24x50m = 24 mm × 50 m)
      for (let k = us.length - 2; k >= 0; k--) if (!us[k]) us[k] = MM[us[k + 1]] === 1000 ? "mm" : us[k + 1];
      for (let k = 1; k < us.length; k++) if (!us[k]) us[k] = us[k - 1];
      ns.forEach((n, k) => add("medida", { bruto: numC(n), valor: numC(n) * MM[us[k]], principal: k === 0 }));
    });
    // medida avulsa: 24mm · 2,4 cm · 50m · 30 metros (em cabo, "2,5mm" é a seção)
    tira(new RegExp(N + "\\s*(mm|cm|mts|mt|metros|metro|m)" + FIM, "g"), (m, n, u) => {
      const v = numC(n);
      if (eFio && u === "mm" && SECOES.indexOf(v) >= 0) add("secao", { valor: v, principal: true });
      else add("medida", { bruto: v, valor: v * MM[u], principal: true });
    });
    tira(new RegExp(N + "\\s*(kw|w|watts?)" + FIM, "g"), (m, n, u) => add("potencia", { valor: numC(n) * (u === "kw" ? 1000 : 1), principal: true }));
    tira(/(\d{2,3})\s*(?:\/\s*(\d{2,3})\s*)?v(?:olts?)?(?![a-z0-9])/g, (m, a, b) => add("tensao", { valores: [Number(a)].concat(b ? [Number(b)] : []).sort((x, y) => x - y), principal: false }));
    tira(/\b(?:bivolt|biv)\b/g, () => add("tensao", { valores: [127, 220], principal: false }));
    tira(new RegExp(N + "\\s*(a|amp|amperes?)" + FIM, "g"), (m, n) => add("corrente", { valor: numC(n), principal: true }));
    if (eDisj) tira(/\b[bcd]\s?(\d{1,3})(?![a-z0-9])/g, (m, n) => add("corrente", { valor: Number(n), principal: true }));
    tira(new RegExp(N + "\\s*(ml|litros?|lts|lt|l)" + FIM, "g"), (m, n, u) => add("volume", { valor: numC(n) * (u === "ml" ? 1 : 1000), principal: true }));
    tira(new RegExp(N + "\\s*(kg|gramas?|gr|g)" + FIM, "g"), (m, n, u) => add("massa", { valor: numC(n) * (u === "kg" ? 1000 : 1), principal: true }));
    // comprimento do rolo (1 m ou mais) não define o produto quando há outra característica principal
    if (lista.some(f => f.principal && !(f.tipo === "medida" && f.valor >= 1000)))
      lista.forEach(f => { if (f.tipo === "medida" && f.valor >= 1000) f.principal = false; });
    lista.forEach(f => { f.rotulo = ROTULO[f.tipo](f); });
    return { lista, resto: t.replace(/\s+/g, " ").trim() };
  }
  const igualN = (a, b) => Math.abs(a - b) <= Math.max(1e-6, LIMITES.TOLERANCIA * Math.max(Math.abs(a), Math.abs(b)));
  function mesmo(x, y) {
    if (x.tipo === "tensao") return x.valores.some(v => y.valores.indexOf(v) >= 0);
    if (x.tipo === "medida" && (x.semUnidade || y.semUnidade)) return igualN(x.bruto, y.bruto) || (!x.semUnidade && igualN(x.valor, y.bruto)) || (!y.semUnidade && igualN(x.bruto, y.valor));
    return igualN(x.valor, y.valor);
  }
  // compara a linha da nota com o material: "compativel", "conflito", "incompleto" ou "sem" (nenhuma característica em comum)
  function compararCaracteristicas(cn, ci) {
    const ln = cn.lista || [], li = ci.lista || [];
    const tipos = [...new Set(ln.concat(li).map(f => f.tipo))];
    const difs = [];
    let conflito = false, incompleto = false, comum = false;
    tipos.forEach(tp => {
      const n = ln.filter(f => f.tipo === tp), m = li.filter(f => f.tipo === tp);
      if (!n.length || !m.length) {
        if (n.some(f => f.principal) || m.some(f => f.principal)) {
          incompleto = true;
          difs.push({ tipo: tp, nota: n.map(f => f.rotulo), item: m.map(f => f.rotulo), falta: true });
        }
        return;
      }
      comum = true;
      const nP = n.filter(f => f.principal), mP = m.filter(f => f.principal), nS = n.filter(f => !f.principal), mS = m.filter(f => !f.principal);
      const choca = nP.some(x => !m.some(y => mesmo(x, y))) || mP.some(y => !n.some(x => mesmo(x, y)))
        || (nS.length && mS.length && !nS.some(x => mS.some(y => mesmo(x, y))));
      if (choca) { conflito = true; difs.push({ tipo: tp, nota: n.map(f => f.rotulo), item: m.map(f => f.rotulo) }); }
    });
    return { resultado: conflito ? "conflito" : incompleto ? "incompleto" : comum ? "compativel" : "sem", difs };
  }
  // características principais, em ordem fixa: muda quando o nome do material passa a ter outra medida
  const assinaturaCar = c => (c.lista || []).filter(f => f.principal).map(f => f.tipo + ":" + f.rotulo).sort().join("|");

  // semelhança do texto sem as características (as medidas já foram comparadas à parte)
  const casa = (t, u) => t === u ? 1 : t.length >= 3 && u.length >= 3 && (u.startsWith(t) || t.startsWith(u)) ? 0.75 : t.length >= 4 && u.length >= 4 && t.slice(0, 4) === u.slice(0, 4) ? 0.5 : 0;
  function semelhanca(restoNota, restoItem) {
    const a = fichas(restoNota), b = fichas(restoItem);
    const aW = a.filter(x => !/^\d+$/.test(x)), bW = b.filter(x => !/^\d+$/.test(x) && x.length >= 2);
    const aN = a.filter(x => /^\d+$/.test(x)), bN = b.filter(x => /^\d+$/.test(x));
    if (!aW.length || !bW.length) return { nota: 0, cobre: 0 };
    const cobre = bW.filter(u => aW.some(t => casa(t, u) >= 0.75)).length / bW.length;
    const pontos = aW.reduce((s, t) => s + Math.max(...bW.map(u => casa(t, u))), 0);
    const parec = pontos / Math.max(aW.length, Math.min(bW.length, 4) * 0.8);
    // números soltos diferentes dos dois lados (modelo, referência) pesam contra
    const multa = aN.length && bN.length && !aN.some(x => bN.indexOf(x) >= 0) ? 0.25 : 0;
    return { nota: Math.max(0, 0.65 * cobre + 0.35 * parec - multa), cobre };
  }
  const codigoDoFornecedor = it => { const m = /c[oó]d\. do fornecedor (\S+)/i.exec(String(it.obs || "")); return m ? m[1] : ""; };

  // decide o que a tela mostra para uma linha da nota
  // opc: { podeNovo, memoria: {itemId, origem:"pessoa"|"auto", quando, vezes, carItem}, antiga: itemId (memória antiga), max }
  // o nome do material se repete em todas as linhas da nota: lê as características dele uma vez só
  const memoItem = new Map();
  function carDoItem(nome) {
    let c = memoItem.get(nome);
    if (!c) { if (memoItem.size > 5000) memoItem.clear(); c = caracteristicas(nome); memoItem.set(nome, c); }
    return c;
  }
  function classificar(linha, itens, opc) {
    opc = opc || {};
    const cn = caracteristicas(linha.descricao);
    const cod = String(linha.codigo || "").trim();
    let cands = itens.map(it => {
      const ci = carDoItem(String(it.nome || ""));
      const cmp = compararCaracteristicas(cn, ci);
      const s = semelhanca(cn.resto, ci.resto);
      const codigoBate = cod.length >= 3 && (cod === String(it.codigo || "") || cod === codigoDoFornecedor(it));
      return { it, nota: codigoBate ? Math.max(s.nota, 1) : s.nota, cobre: codigoBate ? 1 : s.cobre, car: cmp.resultado, difs: cmp.difs, carItem: ci, codigoBate };
    });
    const ordem = (x, y) => ((x.car === "conflito") - (y.car === "conflito")) || (y.nota - x.nota) || (y.cobre - x.cobre);
    const porNota = cands.filter(c => c.nota > LIMITES.SUGERE || c.codigoBate).sort(ordem);
    const validos = porNota.filter(c => c.car !== "conflito");
    const completos = validos.filter(c => c.car === "compativel" || c.car === "sem");
    const top = completos[0], segundo = validos.find(c => c !== top);
    const folga = top ? top.nota - (segundo ? segundo.nota : 0) : 0;
    const auto = !!top && top.cobre === 1 && top.nota >= LIMITES.AUTO && folga >= LIMITES.FOLGA;

    // memória: só a escolha feita por uma pessoa, ainda compatível, vira "Escolhido antes"
    let memoria = null, dica = null;
    const avaliarMemoria = (itemId, origem, carGuardada, quando) => {
      const c = cands.find(x => x.it.id === itemId);
      if (!c) return { tipo: "ignorada", motivo: "o material foi excluído ou é de outro setor", itemId };
      if (c.car === "conflito") return { tipo: "ignorada", motivo: "medida diferente", itemId, difs: c.difs };
      if (carGuardada != null && carGuardada !== assinaturaCar(c.carItem)) return { tipo: "ignorada", motivo: "o material mudou de medida desde a escolha", itemId };
      return { tipo: origem === "pessoa" ? "lembrado" : "dica", itemId, quando: quando || "", antiga: origem === "antiga" };
    };
    if (opc.memoria && opc.memoria.itemId) memoria = avaliarMemoria(opc.memoria.itemId, opc.memoria.origem === "pessoa" ? "pessoa" : "auto", opc.memoria.carItem != null ? opc.memoria.carItem : null, opc.memoria.quando);
    if ((!memoria || memoria.tipo === "ignorada") && opc.antiga) {
      const m1 = avaliarMemoria(opc.antiga, "antiga", null, "");
      if (!memoria || m1.tipo !== "ignorada") memoria = m1;
    }
    if (memoria && memoria.tipo === "dica") dica = memoria.itemId;

    let status, sel;
    if (memoria && memoria.tipo === "lembrado") { status = "lembrado"; sel = memoria.itemId; }
    else if (auto && (!dica || dica === top.it.id)) { status = "ok"; sel = top.it.id; }
    else if (validos.some(c => c.nota >= LIMITES.CONFIRA) || dica) { status = "confira"; sel = ""; }
    else if (opc.podeNovo) { status = "novo"; sel = "__novo"; }
    else { status = "escolha"; sel = ""; }

    // lista "Mais parecidos": lembrado/dica primeiro, compatíveis, depois os com medida diferente
    const n = opc.max || 6;
    let lista = validos.slice(0, n).concat(porNota.filter(c => c.car === "conflito").slice(0, 3));
    const fixo = memoria && memoria.tipo !== "ignorada" ? memoria.itemId : "";
    if (fixo) { const c = cands.find(x => x.it.id === fixo); lista = [c].concat(lista.filter(x => x !== c)); }
    return { status, sel, caracteristicas: cn, candidatos: lista, memoria, folga };
  }

  raiz.LeitorNF = { montarLinhas, lerDanfe, lerFotoDanfe, numerosDaLinha, descricaoDaLinha, regiaoProdutos, sugerir, parecido, cobertura,
    LIMITES, caracteristicas, compararCaracteristicas, assinaturaCar, semelhanca, classificar };
})(typeof window !== "undefined" ? window : globalThis);
