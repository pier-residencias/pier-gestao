// =====================================================================================
// Pier Gestão — ENSAIO DE DESEMPENHO
// Somente para a planilha "PIER GESTÃO - HOMOLOGAÇÃO - ENSAIO DE DESEMPENHO".
//
// NUNCA colar no Apps Script oficial nem no da homologação existente. Este arquivo fica só na
// branch "ensaio-desempenho" e não vai para a "liberacao-inventario" nem para a "main".
//
// O que faz (só na planilha de ensaio, depois de todas as travas):
//   - troca os dados por um volume fictício parecido com a produção: 300 materiais (250 Manutenção,
//     50 Limpeza), cerca de 1.500 movimentações em 6 meses, 10 empréstimos abertos, 40 OS, 30 demandas;
//   - troca as contas da aba Usuarios por contas de ensaio (senha inicial lida da propriedade ENSAIO_SENHA,
//     que é apagada ao final);
//   - deixa saldo = soma dos efeitos do histórico em todos os itens, para conferir a consistência depois.
// Ferramentas de medição (só leitura, ou só na planilha de ensaio):
//   conferirEnsaio(), medirRecuperacaoSemPendencias(), prepararInterrompidas5(), prepararInterrompidas20(),
//   prepararInterrompidasComHistorico5(), medirRecuperacaoComPendencias().
//
// Uso da carga: simularCargaEnsaio() → copiar o código para a propriedade CONFIRMAR_ENSAIO →
// executarCargaEnsaio(). Funções que terminam com "_" são internas e não aparecem no menu Executar.
// =====================================================================================

const ENS = {
  // o código do sistema precisa ser um dos dois do ensaio, cada um com UMA linha diferente do original:
  // a VERSAO ganha o sufixo " · ENSAIO DE DESEMPENHO". Assim a implantação do ensaio se identifica numa leitura
  // (doGet) e o painel não envia nada a nenhuma outra implantação; e este arquivo recusa rodar ao lado do
  // Código.gs da produção ou da homologação, que não têm o sufixo.
  //   A (atual):    ensaio/Codigo-ensaio.gs           = liberacao-inventario (0041062) + sufixo
  //   B (otimizada): ensaio/Codigo-ensaio-otimizado.gs = otimizacao-consulta + sufixo
  versoesAceitas: [
    '2026-10-16 inventário com aprovação da Administração · ENSAIO DE DESEMPENHO',
    '2026-10-17 inventário com aprovação da Administração + consulta otimizada (fase 1) · ENSAIO DE DESEMPENHO'
  ],
  nomeObrigatorio: ['HOMOLOGAÇÃO', 'ENSAIO DE DESEMPENHO'],
  // planilhas e pastas que nunca podem ser usadas, guardadas como impressão SHA-256 (não como ID):
  // a planilha de homologação existente e as duas pastas de teste dela
  planilhasProibidas: ['97acef357c6ad32f67181969'],
  pastasProibidas: ['efc467705f4989f6380e5586', 'aaaa73e2894af32ecf48ba28'],
  pastaNomeObrigatorio: 'ENSAIO',   // as pastas de ensaio precisam ter ENSAIO no nome (as da homologação e as oficiais não têm)
  validadeMin: 15,
  semente: 20261016,
  itensMan: 250, itensLim: 50, eventosMin: 2, eventosMax: 6,
  emprestimosAbertos: 10, os: 40, dem: 30,
  maxItensSemMarca: 20,          // mais que isso de itens "reais" na planilha = planilha errada
  contasPermitidasAntes: ['admin.teste1', 'admin.teste2', 'manut.teste', 'limpeza.teste'],
  contas: [
    ['admin.ensaio1', 'Admin Ensaio 1', 'Administração', true],
    ['admin.ensaio2', 'Admin Ensaio 2', 'Administração', true],
    ['manut.ensaio1', 'Manutenção Ensaio 1', 'Manutenção', true],
    ['manut.ensaio2', 'Manutenção Ensaio 2', 'Manutenção', true],
    ['manut.ensaio3', 'Manutenção Ensaio 3', 'Manutenção', true],
    ['manut.ensaio4', 'Manutenção Ensaio 4', 'Manutenção', true],
    ['manut.ensaio5', 'Manutenção Ensaio 5', 'Manutenção', true],
    ['limpeza.ensaio', 'Limpeza Ensaio', 'Limpeza', false]
  ],
  limpar: ['itens', 'movs', 'emp', 'cont', 'os', 'dem', 'prev', 'pend', 'audit', 'acessos'],
  zerarPrefixos: ['SALDOS_', 'BLOQ_', 'IMPORT_', 'SESS_', 'LOGIN_'],
  zerarChaves: ['CONT_APLICANDO', 'RECUP_ESTADO', 'RECUP_ALERTAS', 'PREVENTIVAS_DIA'],
  autor: { id: '', usuario: 'carga.ensaio', nome: 'Carga do ensaio', perfil: '' },
  locais: {
    'Manutenção': ['Almoxarifado Ensaio', 'Área Técnica Ensaio', 'Oficina Ensaio', 'Bloco Fictício A', 'Bloco Fictício B'],
    'Limpeza': ['Almoxarifado Ensaio', 'Depósito Ensaio', 'Bloco Fictício A']
  },
  categorias: {
    'Manutenção': [['Elétrica', 'Peça de reposição', 'un'], ['Iluminação', 'Peça de reposição', 'un'], ['Hidráulica', 'Peça de reposição', 'pç'],
      ['Ferramentas', 'Ferramenta', 'un'], ['Fixação e ferragens', 'Consumível', 'cx'], ['Tintas, colas e químicos', 'Consumível', 'un'],
      ['Discos e abrasivos', 'Consumível', 'un'], ['EPI', 'EPI', 'par']],
    'Limpeza': [['Produtos de limpeza', 'Produto químico', 'L'], ['Descartáveis', 'Descartável', 'pct'], ['Utensílios', 'Utensílio', 'un']]
  }
};

// ---------------- impressão digital (para comparar IDs sem guardar os IDs) ----------------
function ensDigesto_(txt) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(txt));
  return d.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('').slice(0, 24);
}

// ---------------- travas de ambiente (nada é lido além disto se alguma falhar) ----------------
function ensTravas_(ss, props) {
  const erros = [];
  if (typeof PLANILHA_OFICIAL === 'undefined' || typeof VERSAO === 'undefined' || typeof atualizarRetrato !== 'function') {
    return ['O Código.gs da liberação não está neste projeto.'];
  }
  const id = String(ss.getId());
  const nome = String(ss.getName() || '');
  if (id === PLANILHA_OFICIAL) erros.push('Esta é a PLANILHA OFICIAL. Nada será feito aqui.');
  if (ENS.planilhasProibidas.indexOf(ensDigesto_(id)) >= 0) erros.push('Esta é a planilha de HOMOLOGAÇÃO já existente. O ensaio precisa de uma cópia nova.');
  ENS.nomeObrigatorio.forEach(p => { if (nome.toUpperCase().indexOf(p) < 0) erros.push('O nome da planilha ("' + nome + '") não contém "' + p + '".'); });
  if (props.getProperty('AMBIENTE') !== 'homologacao') erros.push('A propriedade AMBIENTE não é exatamente "homologacao".');
  if (props.getProperty('ENSAIO') !== 'sim') erros.push('A propriedade ENSAIO não é exatamente "sim".');
  if (props.getProperty('HOMOLOG_PLANILHA_ID') !== id) erros.push('A propriedade HOMOLOG_PLANILHA_ID não é o ID desta planilha (' + id + ').');
  if (props.getProperty('ENSAIO_PLANILHA_ID') !== id) erros.push('A propriedade ENSAIO_PLANILHA_ID não é o ID desta planilha (' + id + ').');
  if (props.getProperty('LIBERAR_ACIONADOR_OFICIAL')) erros.push('A propriedade LIBERAR_ACIONADOR_OFICIAL existe neste projeto; apague antes.');
  if (ENS.versoesAceitas.indexOf(VERSAO) < 0) erros.push('O Código.gs não é o do ensaio (VERSAO "' + VERSAO + '"; aceitas: "' + ENS.versoesAceitas.join('" ou "') + '"). Use ensaio/Codigo-ensaio.gs ou ensaio/Codigo-ensaio-otimizado.gs.');
  if (typeof simularCargaHomologacao !== 'undefined' || typeof executarCargaHomologacao !== 'undefined') erros.push('O arquivo Homologacao.gs está neste projeto. Remova-o antes do ensaio.');
  return erros;
}

// ---------------- verificações de conteúdo (só leitura) ----------------
function ensVerificar_(paraCarga) {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  const erros = ensTravas_(ss, props), avisos = [], resumo = [];
  if (erros.length) return { ok: false, erros, avisos, resumo, ss, props };

  // cabeçalhos de todas as abas do sistema
  Object.keys(ABAS).forEach(k => {
    const def = ABAS[k], sh = ss.getSheetByName(def.nome);
    if (!sh) { erros.push('Falta a aba ' + def.nome + ' (rode autorizar antes).'); return; }
    const n = sh.getLastColumn();
    const head = n ? sh.getRange(1, 1, 1, n).getValues()[0].map(h => String(h).trim()) : [];
    const faltam = def.cols.filter(c => head.indexOf(c[1]) < 0).map(c => c[1]);
    if (faltam.length) erros.push('Aba ' + def.nome + ': faltam as colunas ' + faltam.join(', ') + ' (rode autorizar antes).');
  });

  // usuários: só contas de ensaio ou as contas de teste copiadas da homologação
  const shU = ss.getSheetByName('Usuarios');
  if (!shU) erros.push('Falta a aba Usuarios.');
  else {
    const v = shU.getDataRange().getValues(), h = v[0].map(x => String(x).trim());
    USUARIOS_CAB.concat([COL_ID_CONTA]).forEach(l => { if (h.indexOf(l) < 0) erros.push('Aba Usuarios: falta a coluna ' + l + ' (rode autorizar antes).'); });
    const iU = h.indexOf('Usuário'), iT = h.indexOf('Telefone');
    const ensaio = ENS.contas.map(c => c[0]);
    const vistos = [];
    for (let i = 1; i < v.length; i++) {
      const u = String(v[i][iU] || '').trim().toLowerCase();
      if (!/^[a-z0-9._@-]{2,40}$/.test(u)) continue;
      vistos.push(u);
      if (ensaio.indexOf(u) < 0 && ENS.contasPermitidasAntes.indexOf(u) < 0) erros.push('Usuarios, linha ' + (i + 1) + ': o login "' + u + '" não é de teste nem de ensaio. Esta não parece a planilha de ensaio.');
      if (iT >= 0 && String(v[i][iT]).replace(/\D/g, '')) erros.push('Usuarios, linha ' + (i + 1) + ': telefone preenchido em "' + u + '". Apague.');
    }
    resumo.push('Contas encontradas: ' + (vistos.join(', ') || 'nenhuma'));
  }
  const shP = ss.getSheetByName('Perfis');
  if (!shP) erros.push('Falta a aba Perfis.');
  else {
    const nomes = shP.getDataRange().getValues().slice(1).map(r => String(r[0]).trim());
    [PERFIL_TOTAL, 'Manutenção', 'Limpeza'].forEach(p => { if (nomes.indexOf(p) < 0) erros.push('Aba Perfis: falta o perfil ' + p + '.'); });
  }

  // itens: planilha com muitos itens "reais" não é a de ensaio
  const shI = ss.getSheetByName('Itens');
  if (shI && shI.getLastRow() > 1) {
    const iN = shI.getRange(1, 1, 1, shI.getLastColumn()).getValues()[0].map(x => String(x).trim()).indexOf('Item');
    const nomes = shI.getRange(2, iN + 1, shI.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
    const reais = nomes.filter(x => x && x.indexOf('[ENSAIO]') !== 0 && x.indexOf('[TESTE]') !== 0).length;
    resumo.push('Itens na planilha: ' + nomes.filter(Boolean).length + ' (' + reais + ' sem marca de teste ou ensaio)');
    if (reais > ENS.maxItensSemMarca) erros.push('A aba Itens tem ' + reais + ' itens sem a marca [TESTE] ou [ENSAIO]. Esta não parece a planilha de ensaio.');
  }

  // pastas: novas, vazias e diferentes das pastas da homologação
  [['PASTA_FOTOS_OS', 'fotos das OS'], ['PASTA_NF', 'notas fiscais']].forEach(([k, rot]) => {
    const id = props.getProperty(k);
    if (!id) { erros.push('Falta a propriedade ' + k + ' (pasta de ensaio das ' + rot + ').'); return; }
    if (ENS.pastasProibidas.indexOf(ensDigesto_(id)) >= 0) { erros.push('A propriedade ' + k + ' aponta para a pasta da homologação existente. Crie uma pasta nova para o ensaio.'); return; }
    try {
      const f = DriveApp.getFolderById(id);
      let n = 0; const it = f.getFiles(); while (it.hasNext() && n < 50) { it.next(); n++; }
      if (String(f.getName()).toUpperCase().indexOf(ENS.pastaNomeObrigatorio) < 0) erros.push('A pasta das ' + rot + ' ("' + f.getName() + '") não tem ' + ENS.pastaNomeObrigatorio + ' no nome. Use uma pasta nova, só do ensaio.');
      else if (f.isTrashed()) erros.push('A pasta de ensaio das ' + rot + ' está na lixeira.');
      else if (n) erros.push('A pasta de ensaio das ' + rot + ' ("' + f.getName() + '") não está vazia (' + n + ' arquivo(s)). Use uma pasta nova.');
      else resumo.push('Pasta das ' + rot + ': "' + f.getName() + '" (vazia) — não é alterada.');
    } catch (e) { erros.push('Não foi possível abrir a pasta de ensaio das ' + rot + ': ' + e.message); }
  });

  if (paraCarga) {
    const s = String(props.getProperty('ENSAIO_SENHA') || '');
    if (s.length < 10) erros.push('Crie a propriedade ENSAIO_SENHA com a senha inicial das contas de ensaio (pelo menos 10 caracteres). Ela é apagada ao final da carga.');
  }
  return { ok: !erros.length, erros, avisos, resumo, ss, props };
}

function ensEstado_(ss) {
  const nomes = Object.keys(ABAS).map(k => ABAS[k].nome).concat(['Usuarios', 'Perfis', 'Config']);
  const linhasPorAba = {}, copias = [], outras = [];
  ss.getSheets().forEach(sh => {
    const n = sh.getName();
    if (n.indexOf('Itens (cópia de') === 0) { copias.push(n); return; }
    if (nomes.indexOf(n) < 0) { outras.push(n); return; }
    linhasPorAba[n] = Math.max(0, sh.getLastRow() - 1);
  });
  return { linhasPorAba, copias: copias.sort(), outras: outras.sort() };
}
function ensAssinatura_(ss, est) { return ensDigesto_(JSON.stringify([ss.getId(), est.linhasPorAba, est.copias, est.outras])); }
function ensZerarChave_(k) {
  if (['SEG_SEGREDO', 'PASTA_FOTOS_OS', 'PASTA_NF', 'AMBIENTE', 'HOMOLOG_PLANILHA_ID', 'ENSAIO', 'ENSAIO_PLANILHA_ID', 'ENSAIO_SENHA', 'CONFIRMAR_ENSAIO'].indexOf(k) >= 0) return false;
  if (k.indexOf('ENSAIO_') === 0) return false;
  return ENS.zerarChaves.indexOf(k) >= 0 || ENS.zerarPrefixos.some(p => k.indexOf(p) === 0);
}
function ensRelatorio_(titulo, v, est) {
  const L = ['=== ' + titulo + ' ==='];
  if (v.ss) L.push('Planilha: ' + v.ss.getName() + ' (' + v.ss.getId() + ')');
  if (v.erros.length) { L.push('', 'PROBLEMAS (nada foi feito):'); v.erros.forEach(e => L.push(' - ' + e)); }
  (v.resumo || []).forEach(x => L.push(x));
  if (est) {
    L.push('', 'Linhas que serão apagadas (o cabeçalho fica):');
    ENS.limpar.forEach(k => L.push(' - ' + ABAS[k].nome + ': ' + (est.linhasPorAba[ABAS[k].nome] || 0)));
    L.push('Abas de cópia que serão apagadas: ' + (est.copias.join(', ') || 'nenhuma'));
    L.push('Abas desconhecidas (não são tocadas): ' + (est.outras.join(', ') || 'nenhuma'));
    L.push('A aba Usuarios será trocada pelas contas de ensaio: ' + ENS.contas.map(c => c[0]).join(', ') + '.');
    L.push('Volume: ' + (ENS.itensMan + ENS.itensLim) + ' materiais, cerca de 1.500 movimentações, ' + ENS.emprestimosAbertos + ' empréstimos abertos, ' + ENS.os + ' OS, ' + ENS.dem + ' demandas.');
  }
  return L.join('\n');
}

// ---------------- 1. simulação ----------------
function simularCargaEnsaio() {
  const v = ensVerificar_(true);
  const props = v.props || PropertiesService.getScriptProperties();
  // carga já feita: é a primeira coisa a dizer (as travas de ambiente continuam valendo antes disso)
  if (props.getProperty('ENSAIO_CARGA_FEITA') && !ensTravas_(v.ss || SpreadsheetApp.getActive(), props).length) {
    v.erros = ['A carga do ensaio já foi feita (' + props.getProperty('ENSAIO_CARGA_FEITA') + '). Para repetir de propósito, apague a propriedade ENSAIO_CARGA_FEITA e crie de novo ENSAIO_SENHA.']
      .concat(v.erros.filter(x => x.indexOf('ENSAIO_SENHA') < 0));
  }
  const est = v.erros.length ? null : ensEstado_(v.ss);
  let txt = ensRelatorio_('SIMULAÇÃO DA CARGA DO ENSAIO (nada foi alterado)', v, est);
  if (props.getProperty('ENSAIO_CARGA_ANDAMENTO')) txt += '\nAviso: uma carga anterior parou no meio (' + props.getProperty('ENSAIO_CARGA_ANDAMENTO') + '). Executar de novo é seguro.';
  if (!v.erros.length) {
    const codigo = 'ENS-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
    props.setProperty('ENSAIO_SIMULACAO', JSON.stringify({ codigo, em: Date.now(), assinatura: ensAssinatura_(v.ss, est) }));
    txt += '\n\nTudo conferido. Código de confirmação: ' + codigo + ' (vale ' + ENS.validadeMin + ' minutos).\nPara executar: crie a propriedade CONFIRMAR_ENSAIO com esse código e rode executarCargaEnsaio.';
  }
  Logger.log(txt);
  return txt;
}

// ---------------- 2. execução ----------------
function executarCargaEnsaio() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('O sistema está ocupado com outra gravação. Tente de novo em alguns segundos.');
  try {
    const v = ensVerificar_(true);
    const props = v.props || PropertiesService.getScriptProperties();
    const parar = msg => { Logger.log(ensRelatorio_('CARGA DO ENSAIO NÃO EXECUTADA', { ss: v.ss, erros: v.erros.concat(msg ? [msg] : []), resumo: v.resumo })); throw new Error('Carga do ensaio não executada. ' + (msg || v.erros[0])); };
    if (!v.ok) parar('');
    if (props.getProperty('ENSAIO_CARGA_FEITA')) parar('A carga do ensaio já foi feita. Para repetir de propósito, apague a propriedade ENSAIO_CARGA_FEITA.');
    let sim = null; try { sim = JSON.parse(props.getProperty('ENSAIO_SIMULACAO') || 'null'); } catch (e) {}
    const conf = String(props.getProperty('CONFIRMAR_ENSAIO') || '').trim().toUpperCase();
    if (!sim) parar('Rode simularCargaEnsaio antes.');
    if (!conf) parar('Falta a confirmação manual: crie a propriedade CONFIRMAR_ENSAIO com o código da simulação.');
    if (conf !== sim.codigo) parar('O código em CONFIRMAR_ENSAIO não é o da última simulação.');
    if (Date.now() - sim.em > ENS.validadeMin * 60e3) parar('O código da simulação venceu. Simule de novo.');
    if (ensAssinatura_(v.ss, ensEstado_(v.ss)) !== sim.assinatura) parar('A planilha mudou depois da simulação. Simule de novo.');
    props.deleteProperty('CONFIRMAR_ENSAIO');
    props.deleteProperty('ENSAIO_SIMULACAO');
    const res = ensAplicar_(v.ss, props);
    Logger.log(res);
    return res;
  } finally { lock.releaseLock(); }
}

function ensEtapa_(props, etapa) {
  props.setProperty('ENSAIO_CARGA_ANDAMENTO', JSON.stringify({ etapa, em: agoraSeg() }));
  if (FALHA_SIMULADA === 'ens_' + etapa) throw new Error('Falha simulada na etapa ' + etapa);
}

// gerador determinístico (mesma semente = mesmos dados)
function ensSorteio_(semente) {
  let a = semente >>> 0;
  const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.int = (min, max) => min + Math.floor(r() * (max - min + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  return r;
}

// monta todas as linhas fictícias em memória (nenhuma gravação aqui)
function ensGerarDados_() {
  const R = ensSorteio_(ENS.semente);
  const fim = somarDias(hoje(), -1), inicio = somarDias(hoje(), -180);
  const diasTot = (isoParaUTC(fim) - isoParaUTC(inicio)) / 864e5;
  const dataAleat = () => somarDias(inicio, R.int(1, diasTot));
  const pessoas = ['Equipe Ensaio A', 'Equipe Ensaio B', 'Equipe Ensaio C', 'Equipe Ensaio D'];
  const itens = [], movs = [], emps = [];
  let nMov = 0, abertos = 0;
  const novoMov = (o) => Object.assign({ id: 'MENS' + ('00000' + (++nMov)).slice(-5), unidade: o.unidade, registradoPor: ENS.autor.nome }, o);
  const setores = [['Manutenção', ENS.itensMan, 'MAN-', 4], ['Limpeza', ENS.itensLim, 'LIM-', 3]];
  let nItem = 0;
  setores.forEach(([setor, qtdItens, pref, dig]) => {
    for (let k = 1; k <= qtdItens; k++) {
      nItem++;
      const cat = R.pick(ENS.categorias[setor]);
      const it = {
        id: 'iENS' + ('0000' + nItem).slice(-4), codigo: pref + ('0000' + k).slice(-dig), nome: '[ENSAIO] ' + cat[0] + ' ' + ('000' + k).slice(-3),
        categoria: cat[0], tipoItem: cat[1], unidade: cat[2], local: R.pick(ENS.locais[setor]), qtd: 0, minimo: R.int(0, 10),
        obs: 'Material fictício do ensaio de desempenho.', criadoEm: inicio + ' 08:00', atualizadoEm: fim + ' 18:00', setor
      };
      // saldo inicial
      let s = R.int(5, 60);
      movs.push(novoMov({ data: inicio, tipo: TIPOS.ajuste, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, qtd: s, unidade: it.unidade, delta: s,
        responsavel: ENS.autor.nome, motivo: 'Saldo inicial do ensaio', obs: 'Carga fictícia do ensaio de desempenho', criadoEm: inicio + ' 08:00',
        operacao: 'ENS-CARGA', saldoAnterior: 0, saldoFinal: s, aprovadoPor: ENS.autor.nome }));
      // eventos em ordem de data
      const n = R.int(ENS.eventosMin, ENS.eventosMax);
      const datas = []; for (let j = 0; j < n; j++) datas.push(dataAleat()); datas.sort();
      const saidas = [];
      datas.forEach((d, j) => {
        const p = R(), hora = d + ' ' + ('0' + (8 + (j % 9))).slice(-2) + ':' + ('0' + R.int(0, 59)).slice(-2);
        const base = { data: d, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, unidade: it.unidade, criadoEm: hora };
        if (p < 0.35 || s < 2) {
          const q = R.int(1, 20); s += q;
          movs.push(novoMov(Object.assign({}, base, { tipo: TIPOS.entrada, qtd: q, delta: q, fornecedor: 'Fornecedor Fictício ' + R.int(1, 9), valorUnit: R.int(2, 150) })));
        } else if (p < 0.75) {
          const q = R.int(1, Math.max(1, Math.min(5, s - 1))); s -= q;
          const m = novoMov(Object.assign({}, base, { tipo: TIPOS.saida, qtd: q, delta: -q, responsavel: R.pick(pessoas), destino: R.pick(ENS.locais[setor]), motivo: 'Uso fictício' }));
          movs.push(m); saidas.push(m);
        } else if (p < 0.83) {
          s -= 1;
          movs.push(novoMov(Object.assign({}, base, { tipo: TIPOS.troca, qtd: 1, delta: -1, responsavel: R.pick(pessoas), destino: R.pick(ENS.locais[setor]), velhoDestino: 'Descartada' })));
        } else if (p < 0.90) {
          const q = 1; s -= q;
          const eid = 'EENS' + ('0000' + nMov).slice(-4);
          const m = novoMov(Object.assign({}, base, { tipo: TIPOS.emprestimo, qtd: q, delta: -q, responsavel: R.pick(pessoas), destino: R.pick(ENS.locais[setor]), previsao: somarDias(d, 7), emprestimoId: eid }));
          movs.push(m);
          if (abertos < ENS.emprestimosAbertos && R() < 0.5) {
            abertos++;
            emps.push({ id: eid, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, qtd: q, unidade: it.unidade, responsavel: m.responsavel, destino: m.destino,
              data: d, previsao: m.previsao, registradoPor: ENS.autor.nome, criadoEm: hora, movId: m.id });
          } else {
            s += q;
            movs.push(novoMov(Object.assign({}, base, { tipo: TIPOS.devolucao, qtd: q, delta: q, responsavel: m.responsavel, destino: m.destino, estadoDevolucao: 'Em bom estado', emprestimoId: eid })));
          }
        } else if (p < 0.95 && saidas.some(x => !x.estornado)) {
          const alvo = saidas.filter(x => !x.estornado).pop();
          alvo.estornado = 'sim'; s += alvo.qtd;
          movs.push(novoMov(Object.assign({}, base, { tipo: TIPOS.estorno, qtd: alvo.qtd, delta: alvo.qtd, motivo: 'Estorno fictício', estornoDe: alvo.id })));
        } else {
          movs.push(novoMov(Object.assign({}, base, { tipo: TIPOS.conferencia, qtd: s, delta: 0, responsavel: R.pick(pessoas), motivo: 'Conferência sem divergência: ' + s })));
        }
      });
      it.qtd = s;
      itens.push(it);
    }
  });
  // abertos mínimos garantidos
  // OS e demandas fictícias (sem fotos, sem anexos)
  const statusOS = [OS_STATUS.aberta, OS_STATUS.andamento, OS_STATUS.concluida, OS_STATUS.concluida, OS_STATUS.cancelada];
  const oss = [];
  for (let k = 1; k <= ENS.os; k++) {
    const d = dataAleat(), st = statusOS[k % statusOS.length], resp = 'manut.ensaio' + (1 + (k % 5));
    oss.push({ id: 'OENS' + ('000' + k).slice(-3), numero: 'OS-' + ('000' + k).slice(-4), status: st, prioridade: R.pick(OS_PRIORIDADES), prazo: somarDias(d, 5),
      categoria: 'Ensaio', local: R.pick(ENS.locais['Manutenção']), titulo: '[ENSAIO] Serviço ' + k, descricao: 'OS fictícia do ensaio.', solicitante: 'Ensaio',
      abertaEm: d + ' 09:00', abertaPor: 'Admin Ensaio 1', abertaPorUsuario: 'admin.ensaio1', responsavel: 'Manutenção Ensaio ' + (1 + (k % 5)), responsavelUsuario: resp,
      iniciadaEm: st === OS_STATUS.aberta ? '' : d + ' 10:00', concluidaEm: st === OS_STATUS.concluida ? somarDias(d, 1) + ' 16:00' : '', concluidaPor: st === OS_STATUS.concluida ? 'Manutenção Ensaio ' + (1 + (k % 5)) : '',
      solucao: st === OS_STATUS.concluida ? 'Feito (fictício).' : '', motivoCancelamento: st === OS_STATUS.cancelada ? 'Cancelada (fictício).' : '',
      fotosAntes: '', fotosDepois: '', andamento: '', atualizadoEm: d + ' 18:00' });
  }
  const statusDem = [DEM_STATUS.pendente, DEM_STATUS.andamento, DEM_STATUS.concluida];
  const dems = [];
  for (let k = 1; k <= ENS.dem; k++) {
    const d = dataAleat(), st = statusDem[k % statusDem.length];
    dems.push({ id: 'DENS' + ('000' + k).slice(-3), numero: 'DM-' + ('000' + k).slice(-4), status: st, prioridade: R.pick(OS_PRIORIDADES), prazo: somarDias(d, 3),
      categoria: 'Ensaio', local: R.pick(ENS.locais['Manutenção']), titulo: '[ENSAIO] Demanda ' + k, descricao: 'Demanda fictícia do ensaio.',
      responsavel: 'Manutenção Ensaio ' + (1 + (k % 5)), responsavelUsuario: 'manut.ensaio' + (1 + (k % 5)), criadaEm: d + ' 08:30', criadaPor: 'Admin Ensaio 1',
      criadaPorUsuario: 'admin.ensaio1', cienteEm: '', iniciadaEm: st === DEM_STATUS.pendente ? '' : d + ' 10:00', concluidaEm: st === DEM_STATUS.concluida ? somarDias(d, 1) + ' 15:00' : '',
      concluidaPor: '', conclusao: '', motivoCancelamento: '', os: '', preventiva: '', andamento: '', atualizadoEm: d + ' 18:00' });
  }
  // saídas ligadas a OS (para o histórico de materiais das OS)
  movs.filter(m => m.tipo === TIPOS.saida).forEach((m, i) => { if (i % 6 === 0) m.os = oss[i % oss.length].numero; });
  // estornados: a coluna recebe "sim"
  movs.forEach(m => { if (m.estornado) m.estornado = 'sim'; });
  movs.sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  return { itens, movs, emps, oss, dems };
}

// Limpa e carrega. Pode ser repetida: limpa antes e usa IDs fixos.
function ensAplicar_(ss, props) {
  if (!ss || !props) throw new Error('Use executarCargaEnsaio.');
  const travas = ensTravas_(ss, props);
  if (travas.length) throw new Error('Carga do ensaio não executada. ' + travas[0]);
  if (props.getProperty('CONFIRMAR_ENSAIO') || props.getProperty('ENSAIO_SIMULACAO')) throw new Error('Use executarCargaEnsaio.');
  const senha = String(props.getProperty('ENSAIO_SENHA') || '');
  if (senha.length < 10) throw new Error('Falta a propriedade ENSAIO_SENHA (pelo menos 10 caracteres).');

  // tudo montado em memória antes da primeira gravação
  const dados = ensGerarDados_();

  ensEtapa_(props, 'limpeza');
  ENS.limpar.forEach(k => {
    const sh = ss.getSheetByName(ABAS[k].nome), n = sh.getLastRow() - 1;
    if (n > 0) sh.getRange(2, 1, n, Math.max(1, sh.getLastColumn())).clearContent();
  });
  ss.getSheets().forEach(sh => { if (sh.getName().indexOf('Itens (cópia de') === 0) ss.deleteSheet(sh); });
  SpreadsheetApp.flush();

  ensEtapa_(props, 'estado');
  const todas = props.getProperties();
  Object.keys(todas).forEach(k => { if (ensZerarChave_(k)) props.deleteProperty(k); });
  props.setProperty('PEND_SEMEADA', 'ensaio ' + hoje());      // a lista real de pendências embutida no código não volta
  props.setProperty('PREVENTIVAS_DIA', hoje());

  ensEtapa_(props, 'usuarios');
  const U = lerUsuarios();
  const nU = U.sh.getLastRow() - 1;
  if (nU > 0) U.sh.getRange(2, 1, nU, U.ncol).clearContent();
  const linhasU = ENS.contas.map(([u, nome, perfil, ativo]) => {
    const r = new Array(U.ncol).fill('');
    r[U.c['Usuário']] = u; r[U.c['Nome']] = nome; r[U.c['Senha']] = ativo ? hashSenha(senha) : ''; r[U.c['Perfil']] = perfil;
    r[U.c['Ativo']] = ativo ? 'Sim' : 'Não'; if (U.c['Telefone'] >= 0) r[U.c['Telefone']] = ''; r[U.c['ID']] = novoIdConta();
    return r;
  });
  U.sh.getRange(2, 1, linhasU.length, U.ncol).setNumberFormat('@').setValues(linhasU);

  ensEtapa_(props, 'locais');
  const cfg = abaConfig();
  Object.keys(ENS.locais).forEach(setor => {
    const chave = 'Locais - ' + setor, vals = cfg.getDataRange().getValues();
    let row = 0; for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === chave) row = i + 1;
    if (!row) row = Math.max(cfg.getLastRow(), 1) + 1;
    cfg.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[chave, ENS.locais[setor].join('\n'), 'Locais fictícios do ensaio (setor ' + setor + ').']]);
  });

  ensEtapa_(props, 'dados');
  const ti = tabela('itens'), tm = tabela('movs');
  if (ti.sh.getLastRow() > 1 || tm.sh.getLastRow() > 1) throw new Error('Itens ou Movimentacoes não estão vazias; a carga parou para não duplicar.');
  gravarVarias(ti, dados.itens);
  gravarVarias(tm, dados.movs);
  gravarVarias(tabela('emp'), dados.emps);
  gravarVarias(tabela('os'), dados.oss);
  gravarVarias(tabela('dem'), dados.dems);
  SpreadsheetApp.flush();

  ensEtapa_(props, 'verificacao');
  atualizarRetrato();
  const conf = ensConferir_();
  if (conf.problemas.length) throw new Error('A conferência final encontrou: ' + conf.problemas.slice(0, 5).join('; ') + '. Simule e execute de novo.');
  const resumo = conf.resumo + ' Contas: ' + ENS.contas.map(c => c[0] + (c[3] ? '' : ' (desativada)')).join(', ') + '.';
  auditar(ENS.autor, 'Carga do ensaio', resumo, 'OK');
  props.deleteProperty('ENSAIO_SENHA');
  props.setProperty('ENSAIO_CARGA_FEITA', agoraSeg());
  props.deleteProperty('ENSAIO_CARGA_ANDAMENTO');
  return '=== CARGA DO ENSAIO CONCLUÍDA ===\n' + resumo + '\nA propriedade ENSAIO_SENHA foi apagada; a senha das contas ativas é a que você definiu.';
}

// ---------------- 3. conferência de consistência (só leitura) ----------------
function ensConferir_() {
  const itens = linhas(tabela('itens')), movs = linhas(tabela('movs')), emps = linhas(tabela('emp')), conts = linhas(tabela('cont'));
  const problemas = [];
  const soma = {}, idsMov = {};
  movs.forEach(m => {
    if (idsMov[m.id]) problemas.push('movimentação repetida ' + m.id); idsMov[m.id] = true;
    soma[m.itemId] = arred((soma[m.itemId] || 0) + (Number(m.delta) || 0));
  });
  const idsIt = {}, cods = {};
  let semMarca = 0;
  itens.forEach(it => {
    if (idsIt[it.id]) problemas.push('item repetido ' + it.id); idsIt[it.id] = true;
    if (cods[it.codigo]) problemas.push('código repetido ' + it.codigo); cods[it.codigo] = true;
    if (String(it.nome).indexOf('[ENSAIO]') !== 0) semMarca++;
    const q = arred(Number(it.qtd) || 0), sm = arred(soma[it.id] || 0);
    if (q !== sm) problemas.push(it.codigo + ': saldo ' + fmt(q) + ' ≠ soma do histórico ' + fmt(sm));
    if (q < 0) problemas.push(it.codigo + ': saldo negativo');
  });
  emps.forEach(e => {
    const m = movs.find(x => x.id === e.movId);
    if (!m || m.emprestimoId !== e.id) problemas.push('empréstimo ' + e.id + ' sem a movimentação de origem');
    if (!idsIt[e.itemId]) problemas.push('empréstimo ' + e.id + ' de item inexistente');
  });
  const aplicando = conts.filter(c => c.etapa === 'aplicando').length;
  if (aplicando) problemas.push(aplicando + ' contagem(ns) presas em "aplicando"');
  conts.filter(c => c.status === CONT_STATUS.aprovada && c.movId).forEach(c => {
    const m = movs.find(x => x.id === c.movId);
    if (!m || m.tipo !== 'ajuste' || m.operacao !== c.operacao) problemas.push(c.numero + ' aprovada sem o Ajuste correspondente');
  });
  const ret = lerRetrato() || {};
  const difRet = itens.filter(it => arred(Number(ret[it.id])) !== arred(Number(it.qtd) || 0)).length;
  if (difRet) problemas.push(difRet + ' item(ns) com retrato diferente do saldo');
  const bloq = Object.keys(itensBloqueados()).length;
  if (bloq) problemas.push(bloq + ' item(ns) bloqueado(s)');
  const porStatus = conts.reduce((m, c) => { m[c.status] = (m[c.status] || 0) + 1; return m; }, {});
  const resumo = itens.length + ' materiais (' + semMarca + ' sem a marca [ENSAIO]), ' + movs.length + ' movimentações, ' + emps.length + ' empréstimos abertos, ' +
    conts.length + ' contagens ' + JSON.stringify(porStatus) + ', ' + bloq + ' bloqueio(s).';
  return { problemas, resumo };
}
function conferirEnsaio() {
  const v = ensTravas_(SpreadsheetApp.getActive(), PropertiesService.getScriptProperties());
  if (v.length) { const t = 'Conferência não executada:\n - ' + v.join('\n - '); Logger.log(t); throw new Error(t); }
  const c = ensConferir_();
  const txt = '=== CONFERÊNCIA DO ENSAIO (só leitura) ===\n' + c.resumo + '\n' + (c.problemas.length ? 'PROBLEMAS (' + c.problemas.length + '):\n - ' + c.problemas.slice(0, 50).join('\n - ') : 'Nenhuma divergência: saldo = soma do histórico em todos os itens, sem repetições, sem contagens presas e retrato coerente.');
  Logger.log(txt);
  return txt;
}

// ---------------- 4. recuperação: medir e montar interrupções (só na planilha de ensaio) ----------------
function ensEstatistica_(ms) {
  const v = ms.slice().sort((a, b) => a - b), n = v.length;
  const p95 = n >= 20 ? v[Math.ceil(0.95 * n) - 1] : null;
  return 'n=' + n + ' · mínimo ' + v[0] + ' ms · médio ' + Math.round(v.reduce((a, b) => a + b, 0) / n) + ' ms · máximo ' + v[n - 1] + ' ms' + (p95 !== null ? ' · p95 ' + p95 + ' ms' : ' · p95 —');
}
function ensExigirEnsaioPronto_() {
  const ss = SpreadsheetApp.getActive(), props = PropertiesService.getScriptProperties();
  const t = ensTravas_(ss, props);
  if (!t.length && !props.getProperty('ENSAIO_CARGA_FEITA')) t.push('A carga do ensaio ainda não foi feita.');
  if (t.length) { const txt = 'Não executado:\n - ' + t.join('\n - '); Logger.log(txt); throw new Error(txt); }
  return { ss, props };
}
function ensMedir_(n) {
  ensExigirEnsaioPronto_();
  const ms = [], res = [];
  for (let i = 0; i < n; i++) { const t0 = Date.now(); res.push(recuperarOperacoesPendentes()); ms.push(Date.now() - t0); }
  const txt = 'Recuperação (' + n + ' rodada(s)): ' + ensEstatistica_(ms) + '\nResultados: ' + res.map(r => String(r).slice(0, 60)).join(' | ') + '\nTempos (ms): ' + ms.join(', ');
  Logger.log(txt);
  return txt;
}
function medirRecuperacaoSemPendencias() { return ensMedir_(20); }
function medirRecuperacaoComPendencias() { return ensMedir_(1); }

// monta k aprovações interrompidas: 'marca' = parou logo após marcar; 'historico' = parou depois de gravar o histórico
function ensInterromper_(k, modo) {
  const { props } = ensExigirEnsaioPronto_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Sistema ocupado.');
  try {
    const U = lerUsuarios().lista;
    const contador = U.find(u => u.usuario === 'manut.ensaio1'), aprovador = U.find(u => u.usuario === 'admin.ensaio2');
    if (!contador || !aprovador) throw new Error('Contas manut.ensaio1 e admin.ensaio2 não encontradas.');
    const cConta = contaDe(contador), aConta = contaDe(aprovador);
    const tc = tabela('cont'), conts = linhas(tc), movs = linhas(tabela('movs')), ult = ultimasMovs(movs), bloq = itensBloqueados();
    const livres = linhas(tabela('itens')).filter(it => String(it.nome).indexOf('[ENSAIO]') === 0 && !contagemPendenteDoItem(conts, it.id) && !bloq[it.id]).slice(0, k);
    if (livres.length < k) throw new Error('Não há ' + k + ' itens livres para montar as interrupções.');
    const num = proximoNumeroContagem(conts);
    const sols = livres.map(it => novaSolicitacao(it, (Number(it.qtd) || 0) + 1, 'Interrupção montada pelo ensaio', cConta, { numero: num, origem: 'Ensaio', ultimaMov: ult[it.id] || '' }));
    gravarVarias(tc, sols);
    const linhasC = linhas(tc), movsNovos = [];
    sols.forEach(s => {
      const c = linhasC.find(x => x.id === s.id), op = Utilities.getUuid();
      gravar(tc, { decididoPor: aConta.usuario, decididoPorId: aConta.id, decididoPorNome: aConta.nome, decididoEm: agoraSeg(), versao: 2, etapa: 'aplicando', operacao: op, qtdFinal: s.qtdContada }, c._row);
      if (modo === 'historico') movsDoAjuste(Object.assign({}, c, { operacao: op }), null, op, aConta).forEach(m => movsNovos.push(m));
    });
    if (movsNovos.length) gravarVarias(tabela('movs'), movsNovos);
    props.setProperty('CONT_APLICANDO', 'ensaio');
    SpreadsheetApp.flush();
    const txt = k + ' aprovação(ões) interrompida(s) montada(s) (' + (modo === 'historico' ? 'depois do histórico' : 'logo após marcar') + '). Agora rode medirRecuperacaoComPendencias e depois conferirEnsaio.';
    auditar(ENS.autor, 'Ensaio: interrupções montadas', txt, 'OK');
    Logger.log(txt);
    return txt;
  } finally { lock.releaseLock(); }
}
function prepararInterrompidas5() { return ensInterromper_(5, 'marca'); }
function prepararInterrompidas20() { return ensInterromper_(20, 'marca'); }
function prepararInterrompidasComHistorico5() { return ensInterromper_(5, 'historico'); }
