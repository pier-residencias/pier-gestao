// =====================================================================================
// Pier Gestão — DIAGNÓSTICO DA CONSULTA (somente leitura)
// Somente para a planilha "PIER GESTÃO - HOMOLOGAÇÃO - ENSAIO DE DESEMPENHO".
//
// NUNCA colar no Apps Script oficial nem no da homologação existente. Este arquivo fica só na branch
// "ensaio-desempenho". É um arquivo à parte: pode ser apagado depois do diagnóstico sem afetar nada.
// Depende do Código.gs do ensaio e do Ensaio.gs (usa as mesmas travas de ambiente).
//
// diagnosticarConsulta(): mede, por dentro do Apps Script, quanto tempo cada etapa da ação "dados"
// (a Consulta do painel) consome, em 5 rodadas (a 1ª é a "fria"). O resultado sai só no registro.
//
// Por que é somente leitura:
//  1. Começa pelas travas do ensaio (planilha, propriedades, versão ENSAIO DE DESEMPENHO, carga feita).
//  2. Antes de chamar qualquer função do Código.gs, confere (só lendo) que todas as abas e colunas usadas
//     existem. As funções de leitura do Código.gs só gravam quando falta uma aba ou coluna (para criá-la);
//     com tudo presente, esse caminho não é alcançado. Faltando algo, o diagnóstico para sem chamar nada.
//  3. Nunca chama doPost, garantirIdsUsuarios, contaDaSessao/abrirSessao, gerarPreventivasSePreciso,
//     auditar, nenhuma função de registro/aprovação/importação, nem LockService. A conta medida é montada
//     a partir da aba Usuarios, sem login e sem sessão.
//  4. Tira uma impressão digital de todas as abas (conteúdo) e de todas as propriedades (valores) antes e
//     depois, e informa no fim se algo mudou. Nenhum valor é registrado: só a comparação.
//  5. Não grava resultado em lugar nenhum: tudo vai só para o registro da execução.
//  6. Não registra logins, nomes, senhas, códigos de senha, sessões, segredos nem IDs.
//  Serve para as duas versões do ensaio (A = liberação atual, B = consulta otimizada): reconhece a instalada.
// =====================================================================================

const DGN = {
  rodadas: 5,
  limiteMs: 4 * 60 * 1000,        // para as rodadas antes do limite de 6 min do Google
  chamadasSimples: 20,
  ultimasLinhas: 300,
  abasDaConsulta: ['movs', 'itens', 'emp', 'cont', 'os', 'dem', 'prev'],
  // chamadas ao SpreadsheetApp numa Consulta da Manutenção, contadas no simulador (um contador em cada chamada):
  // A = código atual da liberação; B = consulta otimizada (fase 1)
  chamadasPorVersao: { A: { chamadas: 75, leituras: 18 }, B: { chamadas: 28, leituras: 9 } }
};
// A ou B, conforme o Código.gs instalado (só a versão B tem lerTabela)
function dgnVersao_() { return typeof lerTabela === 'function' ? 'B' : 'A'; }

function diagnosticarConsulta() {
  // primeira chamada ao serviço de planilhas nesta execução (custo de "acordar" o serviço)
  const t0 = Date.now();
  const ss = SpreadsheetApp.getActive();
  ss.getId();
  const primeiraChamada = Date.now() - t0;
  const inicio = t0;

  ensExigirEnsaioPronto_();                       // travas do ensaio + carga feita (lança erro se faltar algo)
  const props = PropertiesService.getScriptProperties();
  const pre = dgnPreChecar_(ss);
  if (pre.length) dgnParar_('Diagnóstico não executado (nada foi chamado no Código.gs):\n - ' + pre.join('\n - '));
  const contas = dgnContas_();                    // só contas de ensaio; lança erro se houver outras

  const antes = dgnImpressao_(ss, props);
  const meses = [hoje().slice(0, 7)];             // o painel consulta o mês atual
  const acc = {}, ordem = [];
  const M = (rot, fn) => dgnMedir_(acc, ordem, rot, fn);
  const extra = { tamanhoResposta: 0, volume: '' };
  let feitas = 0, cortado = false;

  for (let r = 0; r < DGN.rodadas; r++) {
    if (Date.now() - inicio > DGN.limiteMs) { cortado = true; break; }
    dgnRodada_(M, contas, meses, props, extra);
    feitas++;
  }

  const depois = dgnImpressao_(ss, props);
  const txt = dgnRelatorio_(acc, ordem, feitas, cortado, primeiraChamada, meses, extra, dgnComparar_(antes, depois), Date.now() - inicio);
  Logger.log(txt);
  return txt;
}

// ---------------- uma rodada: a mesma sequência da ação "dados" no doPost ----------------
function dgnRodada_(M, contas, meses, props, extra) {
  const cm = contas.man, ca = contas.adm;
  const limpa = o => { const c = Object.assign({}, o); delete c._row; return c; };

  // A. o que o doPost faz antes de dados(): as mesmas leituras, sem os trechos que gravam
  M('A1 Usuarios — conferência dos IDs das contas', () => lerUsuarios());
  M('A2 Propriedade da sessão (chave inexistente)', () => props.getProperty('SESS_DIAGNOSTICO_INEXISTENTE'));
  M('A3 Usuarios — validação da sessão', () => lerUsuarios());
  M('A4 Perfis — permissões da conta', () => lerPerfis());
  M('A5 Propriedade PREVENTIVAS_DIA', () => props.getProperty('PREVENTIVAS_DIA'));

  // B. dados() decomposta, na mesma ordem do Código.gs
  const tm = M('B1 Movimentacoes — cabeçalho (tabela)', () => tabela('movs'));
  const todas = M('B2 Movimentacoes — leitura + conversão (linhas)', () => linhas(tm)) || [];
  const bruto = M('B2a Movimentacoes — só a leitura bruta', () => { const n = tm.sh.getLastRow() - 1; return n > 0 ? tm.sh.getRange(2, 1, n, tm.ncol).getValues() : []; }) || [];
  M('B2b Movimentacoes — só a conversão em JavaScript', () => dgnConverter_(tm, bruto));
  const V = M('B3 Itens — cabeçalho + leitura (visaoSetores)', () => visaoSetores(cm));
  M('B4 Emprestimos — cabeçalho + leitura', () => linhas(tabela('emp')).filter(V.ve).map(e => V.marca(limpa(e))));
  M('B5 Config — locais', () => V.setores.map(st => lerLocais(st)));
  M('B6 Contagens — 1ª leitura (lista)', () => contagensVisiveis(cm));
  M('B7 Contagens — 2ª leitura (ajustes pendentes)', () => linhas(tabela('cont')).filter(c => c.status === CONT_STATUS.pendente || c.etapa === 'aplicando').map(c => c.itemId));
  M('B8 Propriedades — todas (bloqueios)', () => itensBloqueados());
  M('B9 OS + Demandas + Usuarios (colaboradores)', () => dadosOsDem(meses, cm, todas, limpa));

  // C. a consulta inteira e a montagem da resposta
  M('C0 Sequência completa do doPost — Manutenção', () => dgnSequenciaDoPost_(contas, meses, props));
  const d = M('C1 dados() completa — Manutenção', () => dados(meses, cm));
  M('C2 Montar a resposta (JSON + ContentService)', () => {
    const s = JSON.stringify({ ok: true, nome: cm.nome, perfil: cm.perfil, perms: cm.perms, usuario: cm.usuario, dados: d });
    extra.tamanhoResposta = s.length;
    return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
  });
  M('C3 dados() completa — Administração', () => dados(meses, ca));

  // D. alternativas, só leitura (para estimar ganhos)
  M('D1 Movimentacoes — cabeçalho e corpo numa chamada só', () => tm.sh.getDataRange().getValues());
  M('D2 Movimentacoes — só as últimas ' + DGN.ultimasLinhas + ' linhas', () => {
    const fim = tm.sh.getLastRow(), ini = Math.max(2, fim - DGN.ultimasLinhas + 1);
    return fim >= ini ? tm.sh.getRange(ini, 1, fim - ini + 1, tm.ncol).getValues() : [];
  });
  M('D3 Chamada simples ao SpreadsheetApp × ' + DGN.chamadasSimples, () => { for (let i = 0; i < DGN.chamadasSimples; i++) tm.sh.getLastRow(); });
  M('D4 Usuarios — uma leitura isolada', () => lerUsuarios());

  if (!extra.volume && tm && tm.sh) {
    const n = Math.max(0, tm.sh.getLastRow() - 1);
    extra.volume = 'Movimentacoes ' + n.toLocaleString('pt-BR') + ' linhas × ' + tm.ncol + ' colunas = ' + (n * tm.ncol).toLocaleString('pt-BR') + ' células; ' +
      'Itens ' + ((V && V.itens) ? V.itens.length : '?') + ' (visíveis para a Manutenção); movimentações devolvidas na resposta: ' + ((d && d.movs) ? d.movs.length : '?');
  }
}

// o que o doPost faz numa Consulta, na versão instalada, sem os trechos que gravam (sessão, IDs, preventivas):
// A: Usuarios, sessão, Usuarios de novo, Perfis, preventivas, dados(), resposta
// B: Usuarios uma vez (reaproveitada), sessão, Perfis, preventivas, dados(…, Usuarios), resposta
function dgnSequenciaDoPost_(contas, meses, props) {
  const achar = U => U.lista.find(u => u.usuario === contas.manLogin);
  let d;
  if (dgnVersao_() === 'B') {
    PLANILHA_REQ = null;                     // como no início de cada doPost
    const U = lerUsuarios();
    props.getProperty('SESS_DIAGNOSTICO_INEXISTENTE');
    const conta = contaDe(achar(U));
    props.getProperty('PREVENTIVAS_DIA');
    d = dados(meses, conta, U);
  } else {
    lerUsuarios();
    props.getProperty('SESS_DIAGNOSTICO_INEXISTENTE');
    const conta = contaDe(achar(lerUsuarios()));
    props.getProperty('PREVENTIVAS_DIA');
    d = dados(meses, conta);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, dados: d })).setMimeType(ContentService.MimeType.JSON);
}

// mesma conversão que linhas() faz em cada célula (cópia do laço de linhas(), para separar o tempo de leitura
// do tempo de conversão; o teste local confere que o resultado é idêntico ao de linhas())
function dgnConverter_(t, vals) {
  const out = [];
  vals.forEach((r, i) => {
    const o = { _row: i + 2 };
    t.def.cols.forEach(([k]) => { o[k] = celula(r[t.idx[k]], t.def.num.indexOf(k) >= 0); });
    if (!o.id) return;
    if (t.def === ABAS.movs) o.tipo = TIPO_POR_NOME[o.tipo] || String(o.tipo).toLowerCase();
    out.push(o);
  });
  return out;
}

function dgnMedir_(acc, ordem, rot, fn) {
  const t = Date.now();
  let r, erro = '';
  try { r = fn(); } catch (e) { erro = String((e && e.message) || e).slice(0, 120); }
  const ms = Date.now() - t;
  if (!acc[rot]) { acc[rot] = { ms: [], erros: 0, erro: '' }; ordem.push(rot); }
  acc[rot].ms.push(ms);
  if (erro) { acc[rot].erros++; acc[rot].erro = erro; }
  return r;
}

function dgnParar_(txt) { Logger.log(txt); throw new Error(txt); }

// ---------------- conferência prévia: com isto, nenhuma função de leitura chega ao trecho que cria abas/colunas ----------------
function dgnPreChecar_(ss) {
  const erros = [];
  const cab = sh => { const n = sh.getLastColumn(); return n ? sh.getRange(1, 1, 1, n).getValues()[0].map(h => String(h).trim()) : []; };
  ['Usuarios', 'Perfis', 'Config'].forEach(n => { if (!ss.getSheetByName(n)) erros.push('Falta a aba ' + n + '.'); });
  DGN.abasDaConsulta.forEach(k => {
    const def = ABAS[k], sh = ss.getSheetByName(def.nome);
    if (!sh) { erros.push('Falta a aba ' + def.nome + '.'); return; }
    const head = cab(sh);
    const faltam = def.cols.filter(c => head.indexOf(c[1]) < 0).map(c => c[1]);
    if (faltam.length) erros.push('Aba ' + def.nome + ': faltam as colunas ' + faltam.join(', ') + '.');
  });
  const shP = ss.getSheetByName('Perfis');
  if (shP) {
    const head = cab(shP);
    const faltam = PERMISSOES.filter(p => head.indexOf(p[1]) < 0).map(p => p[1]);
    if (faltam.length) erros.push('Aba Perfis: faltam as colunas de permissão ' + faltam.join(', ') + '.');
  }
  const shU = ss.getSheetByName('Usuarios');
  if (shU) {
    const head = cab(shU);
    USUARIOS_CAB.concat([COL_ID_CONTA]).forEach(l => { if (head.indexOf(l) < 0) erros.push('Aba Usuarios: falta a coluna ' + l + '.'); });
  }
  return erros;
}

// ---------------- contas medidas: montadas da aba Usuarios, sem login e sem sessão ----------------
function dgnContas_() {
  const U = lerUsuarios();
  const ensaio = ENS.contas.map(c => c[0]);
  const outras = U.lista.filter(u => ensaio.indexOf(u.usuario) < 0).length;
  if (outras) dgnParar_('Diagnóstico não executado: a aba Usuarios tem ' + outras + ' conta(s) que não são do ensaio.');
  const man = U.lista.find(u => u.ativo && u.perfil === 'Manutenção');
  const adm = U.lista.find(u => u.ativo && u.perfil === PERFIL_TOTAL);
  if (!man || !adm) dgnParar_('Diagnóstico não executado: faltam contas ativas de ensaio da Manutenção e da Administração.');
  return { man: contaDe(man), adm: contaDe(adm), manLogin: man.usuario };
}

// ---------------- impressão digital (antes/depois): conteúdo de todas as abas e valores de todas as propriedades ----------------
function dgnImpressao_(ss, props) {
  const abas = {};
  ss.getSheets().forEach(sh => {
    const lr = sh.getLastRow(), lc = sh.getLastColumn();
    const v = lr && lc ? sh.getRange(1, 1, lr, lc).getValues() : [];
    abas[sh.getName()] = lr + 'x' + lc + ':' + ensDigesto_(JSON.stringify(v));
  });
  const p = props.getProperties(), chaves = {};
  Object.keys(p).forEach(k => { chaves[k] = ensDigesto_(k + '\u0000' + p[k]); });
  return { abas, chaves };
}
function dgnComparar_(a, b) {
  const abas = Object.keys(Object.assign({}, a.abas, b.abas)).filter(n => a.abas[n] !== b.abas[n]).sort();
  // nomes de propriedades de sessão, login e bloqueio contêm códigos: só o grupo é informado
  const grupo = k => { const m = /^(SESS_|LOGIN_|BLOQ_|IMPORT_|SALDOS_)/.exec(k); return m ? m[1] + '*' : k; };
  const props = {};
  Object.keys(Object.assign({}, a.chaves, b.chaves)).forEach(k => { if (a.chaves[k] !== b.chaves[k]) props[grupo(k)] = (props[grupo(k)] || 0) + 1; });
  return { ok: !abas.length && !Object.keys(props).length, abas, props, nAbas: Object.keys(b.abas).length, nProps: Object.keys(b.chaves).length };
}

// ---------------- relatório ----------------
function dgnRelatorio_(acc, ordem, feitas, cortado, primeiraChamada, meses, extra, cmp, totalMs) {
  const f = n => n === null || n === undefined ? '—' : Math.round(n).toLocaleString('pt-BR');
  const est = l => { if (!l.length) return null; const v = l.slice().sort((x, y) => x - y); return { min: v[0], med: v.reduce((x, y) => x + y, 0) / v.length, max: v[v.length - 1] }; };
  const quentes = rot => acc[rot] ? acc[rot].ms.slice(1) : [];
  const media = rot => { const e = est(quentes(rot).length ? quentes(rot) : (acc[rot] ? acc[rot].ms : [])); return e ? e.med : 0; };
  const L = ['=== DIAGNÓSTICO DA CONSULTA (somente leitura) ==='];
  const ver = dgnVersao_(), cv = DGN.chamadasPorVersao[ver];
  L.push('Código instalado: versão ' + ver + (ver === 'B' ? ' (consulta otimizada, fase 1)' : ' (liberação atual)') + ' · VERSAO "' + VERSAO + '".');
  L.push('Planilha de ensaio conferida. Rodadas: ' + feitas + (cortado ? ' (interrompido no limite de tempo)' : '') + ' · a 1ª é a "fria" · mês consultado: ' + meses[0] + '.');
  if (extra.volume) L.push('Volume: ' + extra.volume + '.');
  if (extra.tamanhoResposta) L.push('Tamanho da resposta da consulta (Manutenção): ' + f(extra.tamanhoResposta / 1024) + ' KB.');
  L.push('Primeira chamada ao SpreadsheetApp nesta execução: ' + f(primeiraChamada) + ' ms.');
  L.push('', 'Etapa · 1ª rodada · demais rodadas: mínimo / médio / máximo (ms)');
  ordem.forEach(rot => {
    const a = acc[rot], e = est(a.ms.slice(1));
    L.push(rot + ' · ' + f(a.ms[0]) + ' · ' + (e ? f(e.min) + ' / ' + f(e.med) + ' / ' + f(e.max) : '—') + (a.erros ? ' · ERRO ×' + a.erros + ': ' + a.erro : ''));
  });
  const A = ['A1 Usuarios — conferência dos IDs das contas', 'A2 Propriedade da sessão (chave inexistente)', 'A3 Usuarios — validação da sessão', 'A4 Perfis — permissões da conta', 'A5 Propriedade PREVENTIVAS_DIA'];
  const somaA = A.reduce((s, r) => s + media(r), 0);
  const c1 = media('C1 dados() completa — Manutenção'), c2 = media('C2 Montar a resposta (JSON + ContentService)');
  const consulta = somaA + c1 + c2;
  const pct = x => consulta ? ' (' + Math.round(100 * x / consulta) + '% da consulta)' : '';
  const usu = media('D4 Usuarios — uma leitura isolada');
  const cont = media('B7 Contagens — 2ª leitura (ajustes pendentes)');
  const porChamada = media('D3 Chamada simples ao SpreadsheetApp × ' + DGN.chamadasSimples) / DGN.chamadasSimples;
  const c0 = media('C0 Sequência completa do doPost — Manutenção'), c0fria = acc['C0 Sequência completa do doPost — Manutenção'] ? acc['C0 Sequência completa do doPost — Manutenção'].ms[0] : null;
  L.push('', 'Resumo (médias das rodadas 2 em diante):');
  L.push(' - Consulta no servidor, sequência do doPost (C0) — a medida para comparar A e B: ' + f(c0) + ' ms (1ª rodada, fria: ' + f(c0fria) + ' ms). Compare com a duração média do doPost em Execuções; a diferença é a inicialização da plataforma.');
  L.push(' - Soma das etapas A1–A5 + dados() + resposta: ' + f(consulta) + ' ms' + (ver === 'B' ? ' (na versão B o doPost não faz mais todas essas leituras; use o C0).' : ' (mesma medida do diagnóstico anterior).'));
  L.push(' - Antes de dados() (Usuarios ×2, Perfis, 2 propriedades): ' + f(somaA) + ' ms' + pct(somaA) + '.');
  L.push(ver === 'B' ? ' - Usuarios: cada leitura ' + f(usu) + ' ms; na versão B a consulta lê 1 vez (antes: 3).'
    : ' - Usuarios: cada leitura ' + f(usu) + ' ms; a consulta lê 3 vezes ≈ ' + f(3 * usu) + ' ms' + pct(3 * usu) + '; lendo 1 vez economizaria ≈ ' + f(2 * usu) + ' ms.');
  L.push(' - Contagens: uma 2ª leitura custa ' + f(cont) + ' ms' + (ver === 'B' ? '; na versão B a consulta não faz mais essa leitura.' : pct(cont) + '.'));
  L.push(' - Movimentacoes: leitura bruta ' + f(media('B2a Movimentacoes — só a leitura bruta')) + ' ms + conversão ' + f(media('B2b Movimentacoes — só a conversão em JavaScript')) + ' ms; cabeçalho ' + f(media('B1 Movimentacoes — cabeçalho (tabela)')) +
    ' ms; numa chamada só ' + f(media('D1 Movimentacoes — cabeçalho e corpo numa chamada só')) + ' ms; só as últimas ' + DGN.ultimasLinhas + ' linhas ' + f(media('D2 Movimentacoes — só as últimas ' + DGN.ultimasLinhas + ' linhas')) + ' ms.');
  L.push(' - Chamada simples ao SpreadsheetApp: ' + (porChamada ? porChamada.toFixed(1).replace('.', ',') : '—') + ' ms cada. Na versão ' + ver + ', a consulta faz ' + cv.chamadas + ' chamadas (' + cv.leituras +
    ' leituras de valores; contadas no simulador) ≈ ' + f(porChamada * cv.chamadas) + ' ms só pela quantidade de chamadas, sem contar o volume lido.');
  L.push(' - Consulta da Administração (dados() completa): ' + f(media('C3 dados() completa — Administração')) + ' ms.');
  L.push('', cmp.ok ? 'Conferência final: nada mudou na planilha nem nas propriedades (' + cmp.nAbas + ' abas e ' + cmp.nProps + ' propriedades comparadas).'
    : '*** ATENÇÃO: algo mudou durante o diagnóstico. Abas: ' + (cmp.abas.join(', ') || 'nenhuma') + '. Propriedades: ' + (Object.keys(cmp.props).map(k => k + ' ×' + cmp.props[k]).join(', ') || 'nenhuma') +
      '. Se o painel ou o site estavam em uso ao mesmo tempo, isso explica; senão, me avise antes de continuar. ***');
  L.push('Duração total desta execução: ' + f(totalMs / 1000) + ' s.');
  return L.join('\n');
}
