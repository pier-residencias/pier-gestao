/**
 * Pier Gestão — banco de dados na planilha do Google.
 *
 * Como instalar (uma vez só):
 *  1. Abra a planilha "Estoque da Manutenção" no Google Drive.
 *  2. Menu Extensões → Apps Script. Apague o que estiver lá e cole este arquivo inteiro.
 *  3. Clique em Implantar → Nova implantação → tipo "App da Web".
 *       Executar como: Eu   |   Quem pode acessar: Qualquer pessoa
 *  4. Autorize o acesso quando o Google pedir e copie o link do "App da Web".
 *
 * Para atualizar o código depois: cole a versão nova, salve e use
 *   Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.
 *   Assim o link do App da Web continua o mesmo.
 *
 * Logins: cada pessoa tem uma linha na aba "Usuarios" (usuário, nome, senha, perfil, ativo).
 * Na primeira vez que o sistema roda, a aba é criada sozinha com a administração e 3 funcionários.
 */

const ABAS = {
  itens: {
    nome: 'Itens',
    cols: [
      ['id', 'ID'], ['codigo', 'Código'], ['nome', 'Item'], ['categoria', 'Categoria'],
      ['tipoItem', 'Tipo'], ['unidade', 'Unidade'], ['local', 'Local'], ['qtd', 'Estoque'],
      ['minimo', 'Mínimo'], ['obs', 'Observação'], ['criadoEm', 'Criado em'], ['atualizadoEm', 'Atualizado em'],
      ['setor', 'Setor']
    ],
    num: ['qtd', 'minimo'],
    opcionais: ['setor']
  },
  movs: {
    nome: 'Movimentacoes',
    cols: [
      ['id', 'ID'], ['data', 'Data'], ['tipo', 'Tipo'], ['itemId', 'ID do item'], ['itemCodigo', 'Código'],
      ['itemNome', 'Item'], ['qtd', 'Quantidade'], ['unidade', 'Unidade'], ['delta', 'Efeito no estoque'],
      ['responsavel', 'Responsável'], ['destino', 'Destino'], ['motivo', 'OS / motivo'],
      ['velhoDestino', 'Peça retirada'], ['fornecedor', 'Fornecedor'], ['nf', 'NF'],
      ['valorUnit', 'Valor unitário'], ['previsao', 'Devolver até'], ['estadoDevolucao', 'Estado na devolução'],
      ['obs', 'Observação'], ['registradoPor', 'Registrado por'], ['criadoEm', 'Criado em'],
      ['estornado', 'Estornado'], ['estornoDe', 'Estorno de'], ['emprestimoId', 'ID do empréstimo'],
      ['os', 'OS'], ['nfFotos', 'Foto da NF'],
      ['contagem', 'Contagem'], ['operacao', 'Operação'], ['saldoAnterior', 'Saldo anterior'], ['saldoFinal', 'Saldo final'], ['aprovadoPor', 'Aprovado por']
    ],
    num: ['qtd', 'delta', 'valorUnit', 'saldoAnterior', 'saldoFinal'],
    opcionais: ['os', 'nfFotos', 'contagem', 'operacao', 'saldoAnterior', 'saldoFinal', 'aprovadoPor']
  },
  cont: {
    nome: 'Contagens',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Nº'], ['lote', 'Lote'], ['origem', 'Origem'], ['itemId', 'ID do item'], ['itemCodigo', 'Código'],
      ['itemNome', 'Item'], ['setor', 'Setor'], ['unidade', 'Unidade'], ['saldoContagem', 'Saldo na contagem'],
      ['ultimaMov', 'Última movimentação na contagem'], ['qtdContada', 'Quantidade contada'], ['diferenca', 'Diferença'],
      ['justificativa', 'Justificativa'], ['contadoPor', 'Contado por (usuário)'], ['contadoPorNome', 'Contado por'],
      ['contadoEm', 'Contado em'], ['status', 'Situação'], ['versao', 'Versão'], ['decididoPor', 'Decidido por (usuário)'],
      ['decididoPorNome', 'Decidido por'], ['decididoEm', 'Decidido em'], ['motivoDecisao', 'Motivo da decisão'],
      ['qtdFinal', 'Quantidade final'], ['movId', 'Movimentação'], ['operacao', 'Operação'], ['etapa', 'Etapa'],
      ['extra', 'Dados da importação'], ['contadoPorId', 'Contado por (ID da conta)'], ['decididoPorId', 'Decidido por (ID da conta)']
    ],
    num: ['saldoContagem', 'qtdContada', 'diferenca', 'versao', 'qtdFinal']
  },
  emp: {
    nome: 'Emprestimos',
    cols: [
      ['id', 'ID'], ['itemId', 'ID do item'], ['itemCodigo', 'Código'], ['itemNome', 'Item'],
      ['qtd', 'Quantidade'], ['unidade', 'Unidade'], ['responsavel', 'Com quem'], ['destino', 'Onde'],
      ['data', 'Saiu em'], ['previsao', 'Devolver até'], ['registradoPor', 'Registrado por'],
      ['criadoEm', 'Criado em'], ['movId', 'ID da movimentação']
    ],
    num: ['qtd']
  },
  os: {
    nome: 'OS',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Número'], ['status', 'Situação'], ['prioridade', 'Prioridade'], ['prazo', 'Prazo'],
      ['categoria', 'Categoria'], ['local', 'Local'], ['titulo', 'Serviço'], ['descricao', 'Descrição'],
      ['solicitante', 'Solicitante'], ['abertaEm', 'Aberta em'], ['abertaPor', 'Aberta por'],
      ['abertaPorUsuario', 'Usuário que abriu'], ['responsavel', 'Responsável'], ['responsavelUsuario', 'Usuário responsável'],
      ['iniciadaEm', 'Iniciada em'], ['concluidaEm', 'Concluída em'], ['concluidaPor', 'Concluída por'],
      ['solucao', 'O que foi feito'], ['motivoCancelamento', 'Motivo do cancelamento'],
      ['fotosAntes', 'Fotos antes'], ['fotosDepois', 'Fotos depois'], ['andamento', 'Andamento'],
      ['atualizadoEm', 'Atualizado em']
    ],
    num: []
  },
  dem: {
    nome: 'Demandas',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Número'], ['status', 'Situação'], ['prioridade', 'Prioridade'], ['prazo', 'Prazo'],
      ['categoria', 'Categoria'], ['local', 'Local'], ['titulo', 'Demanda'], ['descricao', 'Descrição'],
      ['responsavel', 'Responsável'], ['responsavelUsuario', 'Usuário responsável'],
      ['criadaEm', 'Criada em'], ['criadaPor', 'Criada por'], ['criadaPorUsuario', 'Usuário que criou'],
      ['cienteEm', 'Ciente em'], ['iniciadaEm', 'Iniciada em'], ['concluidaEm', 'Concluída em'], ['concluidaPor', 'Concluída por'],
      ['conclusao', 'O que foi feito'], ['motivoCancelamento', 'Motivo do cancelamento'], ['os', 'OS gerada'],
      ['preventiva', 'Preventiva'], ['andamento', 'Andamento'], ['atualizadoEm', 'Atualizado em']
    ],
    num: []
  },
  prev: {
    nome: 'Preventivas',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Número'], ['ativa', 'Ativa'], ['titulo', 'Tarefa'], ['descricao', 'Descrição'],
      ['local', 'Local'], ['categoria', 'Categoria'], ['prioridade', 'Prioridade'],
      ['responsavel', 'Responsável'], ['responsavelUsuario', 'Usuário responsável'],
      ['intervalo', 'Repete a cada'], ['unidade', 'Unidade'], ['prazoDias', 'Dias para fazer'],
      ['proxima', 'Próxima data'], ['ultima', 'Última gerada'], ['criadaPor', 'Criada por'], ['criadaEm', 'Criada em'],
      ['atualizadoEm', 'Atualizado em']
    ],
    num: ['intervalo', 'prazoDias']
  },
  pend: {
    nome: 'Pendencias',
    criar: true,
    cols: [
      ['id', 'ID'], ['secao', 'Seção'], ['numero', 'Nº'], ['titulo', 'Pendência'], ['status', 'Situação'],
      ['responsavel', 'Responsável'], ['prazo', 'Prazo'], ['obs', 'Observação'], ['ordem', 'Ordem'],
      ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'],
      ['criadaPor', 'Incluída por'], ['origem', 'Origem'], ['vistaEm', 'Vista em'], ['vistaPor', 'Vista por'],
      ['criticidade', 'Criticidade'], ['tipo', 'Tipo'], ['frequencia', 'Frequência'], ['ultimaVez', 'Última execução'],
      ['execucoes', 'Execuções'], ['pai', 'Subitem de'],
      ['concluidoEm', 'Concluída em'], ['prazoDefinidoEm', 'Prazo definido em'], ['prazoDefinidoPor', 'Prazo definido por']
    ],
    num: ['ordem']
  },
  audit: {
    nome: 'Auditoria',
    criar: true,
    cols: [
      ['id', 'ID'], ['quando', 'Data e hora'], ['usuario', 'Usuário'], ['nome', 'Nome'], ['perfil', 'Perfil'],
      ['acao', 'Ação'], ['detalhe', 'Detalhe'], ['resultado', 'Resultado']
    ],
    num: []
  },
  acessos: {
    nome: 'Acessos',
    criar: true,
    cols: [
      ['id', 'ID'], ['quando', 'Data e hora'], ['usuario', 'Usuário'], ['nome', 'Nome'], ['perfil', 'Perfil'],
      ['entrada', 'Entrou por'], ['aparelho', 'Aparelho'], ['tipo', 'Tipo']
    ],
    num: []
  }
};

// setores do estoque: cada item pertence a um; o perfil define quais cada pessoa vê
const SETORES = [['Manutenção', 'setor_manutencao', 'MAN-'], ['Limpeza', 'setor_limpeza', 'LIM-']];
function setorDe(it) { const s = texto(it && it.setor); return SETORES.some(x => x[0] === s) ? s : 'Manutenção'; }
function setoresDe(conta) {
  const p = (conta && conta.perms) || {};
  const l = SETORES.filter(x => p[x[1]]).map(x => x[0]);
  return l.length ? l : ['Manutenção'];
}
function exigirSetor(conta, setor) {
  if (conta && setoresDe(conta).indexOf(setor) < 0) throw falha('Seu perfil não tem acesso aos itens do setor ' + setor + '.');
}
// locais de retirada sugeridos na tela Registrar; a administração edita a lista de cada setor
const LOCAIS_PADRAO = {
  'Limpeza': ['Bloco 1', 'Bloco 2', 'Bloco 3', 'Bloco 4', 'Bloco 5', 'Bloco 6', 'Portaria', 'Administração', 'Salão de festas',
    'Piscina', 'Sauna', 'Academia', 'Deck', 'Churrasqueira', 'Quadra', 'Vestiários', 'Garagem', 'Área externa', 'Copa dos funcionários'],
  'Manutenção': []
};
function abaConfig() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Config');
  if (!sh) { sh = ss.insertSheet('Config'); sh.getRange(1, 1, 1, 3).setValues([['Configuração', 'Valor', 'Para que serve']]).setFontWeight('bold'); }
  return sh;
}
function lerLocais(setor) {
  const vals = abaConfig().getDataRange().getValues();
  const chave = 'Locais - ' + setor;
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === chave) return String(vals[i][1] || '').split('\n').map(x => x.trim()).filter(Boolean);
  }
  return (LOCAIS_PADRAO[setor] || []).slice();
}
function salvarLocais(r, conta) {
  const setor = setorDe({ setor: r.setor });
  exigirSetor(conta, setor);
  const vistos = {};
  const lista = (Array.isArray(r.locais) ? r.locais : []).map(x => texto(x, 60)).filter(x => {
    const k = x.toLowerCase(); if (!x || vistos[k]) return false; vistos[k] = true; return true;
  }).slice(0, 150);
  const sh = abaConfig();
  const vals = sh.getDataRange().getValues();
  const chave = 'Locais - ' + setor;
  let row = 0;
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === chave) row = i + 1;
  if (!row) row = Math.max(sh.getLastRow(), 1) + 1;
  sh.getRange(row, 1, 1, 3).setNumberFormat('@').setValues([[chave, lista.join('\n'), 'Locais de retirada do setor ' + setor + ', um por linha. Dá para editar no site, em Registrar.']]);
  return 'Lista de locais da ' + setor + ' salva (' + lista.length + ').';
}

function prefixoSetor(setor) { const x = SETORES.find(s => s[0] === setor); return x ? x[2] : 'MAN-'; }

const DEM_STATUS = { pendente: 'Pendente', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
const PREV_UNIDADES = ['dias', 'semanas', 'meses'];

const OS_STATUS = { aberta: 'Aberta', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
const OS_PRIORIDADES = ['Urgente', 'Alta', 'Normal', 'Baixa'];
const OS_MAX_FOTOS = 8;
const NF_MAX_ARQUIVOS = 4;

const TIPOS = {
  entrada: 'Entrada', saida: 'Saída', troca: 'Troca', emprestimo: 'Empréstimo',
  devolucao: 'Devolução', ajuste: 'Ajuste', estorno: 'Estorno', conferencia: 'Conferência'
};
const TIPO_POR_NOME = Object.keys(TIPOS).reduce((m, k) => { m[TIPOS[k]] = k; return m; }, {});

// ---------- entrada da web ----------

const VERSAO = '2026-10-16 inventário com aprovação da Administração · ENSAIO DE DESEMPENHO'; // ÚNICA linha diferente da liberacao-inventario. Só para o ensaio.

function doGet() {
  return json({ ok: true, app: 'Pier Gestão', versao: VERSAO });
}

function doPost(e) {
  AUDIT_DET = ''; AUDIT_FEITO = false; SALDO_OK = {};
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, erro: 'Pedido inválido.' }); }
  let conta = null;
  try {
    garantirIdsUsuarios();
    let token = '';
    if (req.acao === 'entrar' && req.senha !== undefined) {
      // entrada com usuário e senha: confere bloqueio por tentativas, a senha (com hash) e abre uma sessão
      const usuarioDig = String(req.usuario || '').trim().toLowerCase();
      const bloq = loginBloqueado(usuarioDig);
      if (bloq) {
        registrarAcesso(null, usuarioDig, Object.assign({}, req.registro || {}, { motivo: 'bloqueado' }));
        return json({ ok: false, codigo: 'bloqueado', erro: 'Muitas tentativas com senha errada. Este login está bloqueado por mais ' + bloq + ' min. Tente depois ou peça para a administração liberar.' });
      }
      conta = autenticar(usuarioDig, req.senha);
      if (!conta) {
        const travou = registrarFalhaLogin(usuarioDig);
        registrarAcesso(null, usuarioDig, Object.assign({}, req.registro || {}, { motivo: 'falha' }));
        if (travou) auditar({ usuario: usuarioDig, nome: '', perfil: '' }, 'Login bloqueado', SEG.tentativas + ' senhas erradas seguidas; bloqueado por ' + SEG.bloqueioMin + ' min.', 'Negado');
        return json({ ok: false, codigo: 'senha', erro: travou ? 'Senha errada de novo. Por segurança, este login ficou bloqueado por ' + SEG.bloqueioMin + ' min.' : 'Usuário ou senha incorretos.' });
      }
      limparFalhasLogin(usuarioDig);
      token = abrirSessao(conta, req.registro);
    } else {
      conta = contaDaSessao(req.token);
      // código 'senha' também faz as versões antigas do site voltarem para a tela de entrada
      if (!conta) return json({ ok: false, codigo: 'senha', sessao: 'fim', erro: 'Sua sessão terminou. Entre de novo.' });
    }
    const nome = conta.nome;
    const base = { ok: true, nome, perfil: conta.perfil, perms: conta.perms, usuario: conta.usuario };
    const negar = () => { const e = falha('Seu perfil não tem permissão para isso.'); e.negado = true; throw e; };
    const pode = p => { if (!conta.perms[p]) negar(); };
    const algum = ps => { if (!ps.some(p => conta.perms[p])) negar(); };
    if (req.acao === 'entrar' || req.acao === 'dados') gerarPreventivasSePreciso();
    if (req.acao === 'entrar') {
      if (req.registro) registrarAcesso(conta, conta.usuario, req.registro);
      return json(Object.assign(base, token ? { token, sessaoHoras: Math.round(SEG.sessaoInativa / 36e5) } : {}));
    }
    if (req.acao === 'sair') { encerrarSessao(req.token); auditar(conta, 'Saiu do sistema', ''); return json({ ok: true }); }
    if (req.acao === 'acessos') { pode('acessos'); return json(Object.assign(base, { acessos: lerAcessos(req.dias) })); }
    if (req.acao === 'auditoria') { pode('acessos'); return json(Object.assign(base, { auditoria: lerAuditoria(req.dias) })); }
    if (req.acao === 'dados') return json(Object.assign(base, { dados: dados(req.meses, conta) }));
    if (req.acao === 'relatorio') { pode('dashboard'); return json(Object.assign(base, { relatorio: relatorio(req.de, req.ate, conta) })); }
    if (req.acao === 'usuarios') { pode('usuarios'); return json(Object.assign(base, { equipe: equipe() })); }
    if (req.acao === 'pendencias') { pode('pendencias'); return json(Object.assign(base, { pendencias: pendLista() })); }
    if (req.acao === 'nfVer') { algum(['historico_ver', 'registrar_entrada', 'dashboard']); const f = verArquivo(req.fotoId, pastaNF()); auditar(conta, 'Abriu nota fiscal', f.nome); delete f.nome; return json(Object.assign(base, { foto: f })); }
    if (req.acao === 'nfEnviar') { pode('registrar_entrada'); return json(Object.assign(base, { arquivo: nfEnviar(req, conta) })); }
    if (req.acao === 'osFotoVer') { algum(['os_ver', 'os_abrir', 'os_atender', 'os_gerenciar']); const f = verFoto(req.fotoId); delete f.nome; return json(Object.assign(base, { foto: f })); }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw falha('O sistema está ocupado com outro registro. Tente de novo em alguns segundos.');
    let msg, extra = {}, terminou = false;
    try {
      // aprovação de contagem interrompida: termina ou desfaz antes de qualquer outra gravação;
      // depois confere se algum saldo mudou fora do sistema (o item fica bloqueado)
      const rec = reconciliarContagens();
      conferirImportacaoInterrompida();
      conferirSaldos(rec.itens, SISTEMA);
      switch (req.acao) {
        case 'registrar': pode('registrar_' + String((req.mov || {}).tipo)); msg = registrar(req.mov || {}, nome, conta); break;
        case 'osAbrir': pode('os_abrir'); msg = osAbrir(req.os || {}, conta); extra.osNumero = msg.numero; extra.osId = msg.id; msg = msg.texto; break;
        case 'osAtualizar': msg = osAtualizar(req, conta); break;
        case 'osFoto': msg = osFoto(req, conta); break;
        case 'osFotoRemover': msg = osFotoRemover(req, conta); break;
        case 'demCriar': pode('dem_delegar'); msg = demCriar(req.dem || {}, conta); extra.demId = msg.id; msg = msg.texto; break;
        case 'demAtualizar': msg = demAtualizar(req, conta); break;
        case 'salvarPreventiva': pode('dem_delegar'); msg = salvarPreventiva(req.prev || {}, conta); break;
        case 'excluirPreventiva': pode('dem_delegar'); msg = excluirPreventiva(req.id); break;
        case 'salvarLocais': pode('itens_editar'); msg = salvarLocais(req, conta); break;
        case 'importarContagem': pode('itens_editar'); msg = importarContagem(req, conta); break;
        case 'contagemEnviar': msg = contagemEnviar(req, conta); break;
        case 'contagemDecidir': { const d = contagemDecidir(req, conta); msg = d.texto; extra.resultados = d.resultados; break; }
        case 'contagemCancelar': msg = contagemCancelar(req, conta); break;
        case 'itemLiberar': msg = itemLiberar(req, conta); break;
        case 'devolver': pode('devolver'); msg = devolver(req, nome, conta); break;
        case 'salvarItem': pode((req.item || {}).id ? 'itens_editar' : 'itens_cadastrar'); msg = salvarItem(req, nome, conta); break;
        case 'excluirItem': pode('itens_editar'); msg = excluirItem(req.id, conta); break;
        case 'estornar': pode('historico_estornar'); msg = estornar(req, nome, conta); break;
        case 'salvarUsuario': pode('usuarios'); msg = salvarUsuario(req, conta); extra.equipe = equipe(); break;
        case 'acessoUsuario': pode('usuarios'); msg = acessoUsuario(req, conta); extra.equipe = equipe(); break;
        case 'salvarPerfil': pode('usuarios'); exigirPerfilTotalParaPerfil(req, conta); msg = salvarPerfil(req); extra.equipe = equipe(); break;
        case 'excluirPerfil': pode('usuarios'); msg = excluirPerfil(req.nome); extra.equipe = equipe(); break;
        case 'pendSalvar': pode('pendencias'); msg = pendSalvar(req.pend || {}, conta); extra.pendencias = true; break;
        case 'pendExcluir': pode('pendencias'); msg = pendExcluir(req.id); extra.pendencias = true; break;
        default: throw falha('Ação desconhecida.');
      }
      SpreadsheetApp.flush();
      atualizarRetrato();
      terminou = true;
      if (!AUDIT_FEITO) auditar(conta, ACOES_AUDIT[req.acao] || req.acao, resumoAuditoria(req, msg));
    } finally {
      // erro no meio: o retrato só aceita os itens que terminaram certo; o resto é conferido na próxima vez
      if (!terminou && Object.keys(SALDO_OK).length) { try { atualizarRetrato(SALDO_OK); } catch (e2) {} }
      lock.releaseLock();
    }
    if (extra.pendencias) return json(Object.assign(base, { msg, pendencias: pendLista() }));
    if (extra.equipe) return json(Object.assign(base, { msg }, extra));
    return json(Object.assign(base, { msg, dados: dados(req.meses, conta) }, extra));
  } catch (err) {
    // tentativas sem permissão ficam no histórico de auditoria
    if (conta && (err.negado || /não tem permissão/i.test(String(err.message)))) auditar(conta, ACOES_AUDIT[req.acao] || String(req.acao || ''), String(err.message), 'Negado');
    return json(Object.assign({ ok: false, erro: err.paraUsuario ? err.message : 'Erro no servidor: ' + err.message }, err.codigo ? { codigo: err.codigo } : {}));
  }
}

// ---------- ações ----------

function registrar(m, nome, conta) {
  const tipo = m.tipo;
  if (['entrada', 'saida', 'troca', 'emprestimo'].indexOf(tipo) < 0) throw falha('Tipo de movimentação inválido.');
  const qtd = numero(m.qtd);
  if (!(qtd > 0)) throw falha('Informe uma quantidade maior que zero.');
  if (tipo !== 'entrada') {
    if (!texto(m.responsavel)) throw falha('Informe quem retirou.');
    if (!texto(m.destino)) throw falha('Informe o destino.');
  }
  if (tipo === 'troca' && !texto(m.velhoDestino)) throw falha('Informe o que foi feito com a peça retirada.');
  let nfLinks = '';
  if (tipo === 'entrada' && m.nfFotos) {
    const ids = idsDeArquivos(m.nfFotos);
    if (ids.length > NF_MAX_ARQUIVOS) throw falha('Anexe no máximo ' + NF_MAX_ARQUIVOS + ' arquivos da nota fiscal.');
    const pasta = pastaNF();
    ids.forEach(id => fotoDaPasta(id, pasta));
    nfLinks = ids.map(id => 'https://drive.google.com/file/d/' + id + '/view').join('\n');
  }
  let osNum = '';
  if (m.os) {
    const o = linhas(tabela('os')).find(x => x.numero === String(m.os).trim());
    if (!o) throw falha('A OS ' + m.os + ' não foi encontrada.');
    if (o.status === OS_STATUS.cancelada) throw falha('A ' + o.numero + ' está cancelada.');
    osNum = o.numero;
  }

  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === m.itemId);
  if (!it) throw falha('Item não encontrado. Atualize a página.');
  exigirSetor(conta, setorDe(it));
  exigirItemLivre(it.id, it.nome);
  const atual = Number(it.qtd) || 0;
  const delta = tipo === 'entrada' ? qtd : -qtd;
  if (atual + delta < 0) throw falha('Estoque insuficiente: há ' + fmt(atual) + ' ' + it.unidade + ' de ' + it.nome + '.');

  gravar(ti, { qtd: arred(atual + delta), atualizadoEm: agora() }, it._row);
  const id = novoId('M');
  const data = dataValida(m.data);
  const mov = {
    id, data, tipo: TIPOS[tipo], itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, qtd, unidade: it.unidade, delta,
    responsavel: texto(m.responsavel, 80), destino: texto(m.destino, 120), motivo: texto(m.motivo, 160),
    velhoDestino: texto(m.velhoDestino, 80), fornecedor: texto(m.fornecedor, 120), nf: texto(m.nf, 40),
    valorUnit: m.valorUnit === '' || m.valorUnit == null ? '' : numero(m.valorUnit),
    previsao: m.previsao ? dataValida(m.previsao) : '', obs: texto(m.obs, 300), registradoPor: nome, criadoEm: agora(),
    os: osNum, nfFotos: nfLinks
  };
  if (tipo === 'emprestimo') {
    const eid = novoId('E');
    mov.emprestimoId = eid;
    gravar(tabela('emp'), {
      id: eid, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, qtd, unidade: it.unidade,
      responsavel: mov.responsavel, destino: mov.destino, data, previsao: mov.previsao,
      registradoPor: nome, criadoEm: agora(), movId: id
    });
  }
  gravar(tabela('movs'), mov);
  SALDO_OK[it.id] = true;
  if (osNum) osRegistrarAndamento(osNum, nome, 'Material: ' + fmt(qtd) + ' ' + it.unidade + ' de ' + it.nome + ' (' + TIPOS[tipo].toLowerCase() + ')');
  return TIPOS[tipo] + (tipo === 'emprestimo' ? ' registrado: ' : ' registrada: ') + fmt(qtd) + ' ' + it.unidade + ' de ' + it.nome + (osNum ? ' · ' + osNum : '') + (nfLinks ? ' · nota fiscal anexada' : '') + '.';
}

function devolver(r, nome, conta) {
  const te = tabela('emp');
  const e = linhas(te).find(x => x.id === r.emprestimoId);
  if (!e) throw falha('Este empréstimo já foi encerrado. Atualize a página.');
  const itE = linhas(tabela('itens')).find(x => x.id === e.itemId);
  if (itE) { exigirSetor(conta, setorDe(itE)); exigirItemLivre(itE.id, itE.nome); }
  const estado = texto(r.estado, 40) || 'Em bom estado';
  const perdida = estado.indexOf('Não voltou') === 0;
  const qtd = Number(e.qtd) || 0;
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === e.itemId);
  if (!perdida && it) gravar(ti, { qtd: arred((Number(it.qtd) || 0) + qtd), atualizadoEm: agora() }, it._row);
  gravar(tabela('movs'), {
    id: novoId('M'), data: dataValida(r.data), tipo: TIPOS.devolucao, itemId: e.itemId, itemCodigo: e.itemCodigo,
    itemNome: e.itemNome, qtd, unidade: e.unidade, delta: perdida ? 0 : qtd, responsavel: e.responsavel,
    destino: e.destino, estadoDevolucao: estado, obs: texto(r.obs, 300), registradoPor: nome, criadoEm: agora(),
    emprestimoId: e.id
  });
  SALDO_OK[e.itemId] = true;
  te.sh.deleteRow(e._row);
  return perdida ? 'Perda registrada.' : 'Devolução registrada.';
}

function salvarItem(r, nome, conta) {
  const v = r.item || {};
  const ti = tabela('itens');
  const todos = linhas(ti);
  const nomeItem = texto(v.nome, 120);
  if (!nomeItem) throw falha('Informe o nome do item.');
  const anterior = v.id ? todos.find(x => x.id === v.id) : null;
  if (anterior) { exigirSetor(conta, setorDe(anterior)); exigirItemLivre(anterior.id, anterior.nome); }
  const setor = texto(v.setor) ? setorDe({ setor: v.setor }) : (anterior ? setorDe(anterior) : setoresDe(conta)[0]);
  exigirSetor(conta, setor);
  let codigo = texto(v.codigo, 30);
  if (!codigo) codigo = proxCodigo(todos, prefixoSetor(setor));
  const dup = todos.find(x => x.codigo === codigo && x.id !== v.id);
  if (dup) throw falha('O código ' + codigo + ' já é usado por "' + dup.nome + '".');
  const qtd = numero(v.qtd || 0), minimo = numero(v.minimo || 0);
  if (!(qtd >= 0)) throw falha('Quantidade inválida.');
  if (!(minimo >= 0)) throw falha('Estoque mínimo inválido.');
  const base = {
    codigo, nome: nomeItem, categoria: texto(v.categoria, 60), tipoItem: texto(v.tipoItem, 40),
    unidade: texto(v.unidade, 15) || 'un', local: texto(v.local, 60), minimo, obs: texto(v.obs, 300), atualizadoEm: agora(),
    setor
  };

  // o saldo nunca muda pelo cadastro: item novo nasce com 0 e a quantidade informada vira solicitação de ajuste
  if (!v.id) {
    const id = novoId('I');
    gravar(ti, Object.assign({ id, qtd: 0, criadoEm: agora() }, base));
    if (qtd > 0) {
      if (!podeContar(conta)) return 'Item cadastrado: ' + nomeItem + ', com estoque 0. Para registrar a quantidade, peça uma contagem a quem tem essa permissão.';
      const tc = tabela('cont');
      const c = novaSolicitacao({ id, codigo, nome: nomeItem, unidade: base.unidade, setor, qtd: 0 }, qtd,
        texto(r.motivo, 300) || 'Quantidade inicial informada no cadastro do item', conta,
        { numero: proximoNumeroContagem(linhas(tc)), origem: 'Estoque inicial', ultimaMov: '', extra: { novo: true } });
      gravarVarias(tc, [c]);
      auditarContagem(conta, 'Contagem enviada para aprovação', c, 'estoque inicial no cadastro');
      return 'Item cadastrado: ' + nomeItem + ', com estoque 0. A quantidade inicial (' + fmt(qtd) + ') foi para aprovação: ' + c.numero + '.';
    }
    return 'Item cadastrado: ' + nomeItem + '.';
  }

  const it = todos.find(x => x.id === v.id);
  if (!it) throw falha('Item não encontrado. Atualize a página.');
  const atual = Number(it.qtd) || 0;
  let aviso = '';
  if (v.qtd !== undefined && v.qtd !== '' && v.qtd !== null && qtd !== atual) {
    // mudar a quantidade pela edição = contagem que vai para aprovação; o saldo continua o mesmo
    exigirContagem(conta);
    const tc = tabela('cont'), conts = linhas(tc);
    const pend = contagemPendenteDoItem(conts, it.id);
    if (pend) throw falha('Este item já tem um ajuste aguardando aprovação (' + pend.numero + ').');
    const just = texto(r.motivo, 300);
    if (!just) throw falha('Explique a diferença no estoque.');
    const c = novaSolicitacao(it, qtd, just, conta, { numero: proximoNumeroContagem(conts), origem: 'Edição do item', ultimaMov: ultimasMovs()[it.id] || '' });
    gravarVarias(tc, [c]);
    auditarContagem(conta, 'Contagem enviada para aprovação', c, 'pela edição do item');
    aviso = ' O ajuste de ' + fmt(atual) + ' para ' + fmt(qtd) + ' foi para aprovação: ' + c.numero + '.';
  }
  gravar(ti, base, it._row);
  return 'Alterações salvas.' + aviso;
}

function excluirItem(id, conta) {
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === id);
  if (!it) throw falha('Item não encontrado.');
  exigirSetor(conta, setorDe(it));
  exigirItemLivre(it.id, it.nome);
  if (arred(Number(it.qtd) || 0) !== 0) throw falha('Só dá para excluir um item com estoque zerado (hoje: ' + fmt(Number(it.qtd) || 0) + ' ' + it.unidade + '). Faça uma contagem com a quantidade real: depois da aprovação, se ficar zerado, o item pode ser excluído.');
  const pend = contagemPendenteDoItem(linhas(tabela('cont')), it.id);
  if (pend) throw falha('Este item tem um ajuste aguardando aprovação (' + pend.numero + '). Decida o ajuste antes de excluir.');
  ti.sh.deleteRow(it._row);
  SALDO_OK[it.id] = true;
  return 'Item excluído. O histórico continua guardado.';
}

function estornar(r, nome, conta) {
  const motivo = texto(r.motivo, 160);
  if (!motivo) throw falha('Informe o motivo do estorno.');
  const tm = tabela('movs');
  const m = linhas(tm).find(x => x.id === r.movId);
  if (!m) throw falha('Lançamento não encontrado.');
  if (m.estornado) throw falha('Este lançamento já foi estornado.');
  if (m.tipo === 'estorno') throw falha('Um estorno não pode ser estornado.');
  if (m.tipo === 'ajuste' || m.tipo === 'conferencia') throw falha('Ajuste ou conferência de inventário não pode ser estornado. Se houver erro, faça uma nova contagem com justificativa: ela vai para a aprovação da Administração. O histórico anterior fica preservado.');
  const inv = -(Number(m.delta) || 0);
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === m.itemId);
  if (it) { exigirSetor(conta, setorDe(it)); exigirItemLivre(it.id, it.nome); }
  if (inv !== 0 && it) {
    const novo = arred((Number(it.qtd) || 0) + inv);
    if (novo < 0) throw falha('Não dá para estornar: o estoque ficaria negativo (' + fmt(novo) + ').');
    gravar(ti, { qtd: novo, atualizadoEm: agora() }, it._row);
  }
  const eid = novoId('M');
  gravar(tm, { estornado: 'sim' }, m._row);
  gravar(tm, {
    id: eid, data: hoje(), tipo: TIPOS.estorno, itemId: m.itemId, itemCodigo: m.itemCodigo, itemNome: m.itemNome,
    qtd: Math.abs(inv), unidade: m.unidade, delta: inv, motivo, estornoDe: m.id, registradoPor: nome, criadoEm: agora()
  });
  if (m.tipo === 'emprestimo' && m.emprestimoId) {
    const te = tabela('emp');
    const e = linhas(te).find(x => x.id === m.emprestimoId);
    if (e) te.sh.deleteRow(e._row);
  }
  if (m.itemId) SALDO_OK[m.itemId] = true;
  return 'Lançamento estornado.';
}

// ---------- leitura ----------

function dados(meses, conta) {
  const ms = (Array.isArray(meses) ? meses : []).filter(x => /^\d{4}-\d{2}$/.test(String(x)));
  const limpa = o => { const c = Object.assign({}, o); delete c._row; return c; };
  const p0 = (conta && conta.perms) || {};
  // perfil sem nenhuma permissão do estoque (ex.: Síndico) não recebe itens nem movimentações
  if (!PERMS_ESTOQUE.some(k => p0[k])) {
    const vazio = { itens: [], emprestimos: [], movs: [], setores: [], locais: {} };
    return Object.assign(vazio, dadosOsDem(ms, conta, [], limpa));
  }
  const todas = linhas(tabela('movs'));
  const V = visaoSetores(conta);
  const out = {
    itens: V.itens.map(limpa),
    emprestimos: linhas(tabela('emp')).filter(V.ve).map(e => V.marca(limpa(e))),
    movs: todas.filter(m => ms.indexOf(String(m.data).slice(0, 7)) >= 0 && V.ve(m)).map(m => V.marca(limpa(m))),
    setores: V.setores,
    locais: V.setores.reduce((m, st) => { m[st] = lerLocais(st); return m; }, {})
  };
  // contagens: solicitações visíveis e itens com ajuste aguardando aprovação
  const cs = contagensVisiveis(conta);
  if (cs) out.contagens = cs;
  out.ajustesPendentes = linhas(tabela('cont')).filter(c => c.status === CONT_STATUS.pendente || c.etapa === 'aplicando').map(c => c.itemId);
  // itens bloqueados para revisão (saldo alterado fora do sistema ou recuperação sem consistência)
  const bq = itensBloqueados();
  out.bloqueios = Object.keys(bq).map(k => bq[k]).filter(b => V.itens.some(i => i.id === b.itemId) || (conta && conta.perfil === PERFIL_TOTAL));
  if (conta && conta.perfil === PERFIL_TOTAL) {
    out.integridade = estadoIntegridade();
    out.adminsAtivos = lerUsuarios().lista.filter(u => u.ativo && u.perfil === PERFIL_TOTAL).length;
  }
  return Object.assign(out, dadosOsDem(ms, conta, todas, limpa));
}
function dadosOsDem(ms, conta, todas, limpa) {
  const out = {};
  const p = (conta && conta.perms) || {};
  if (p.os_ver || p.os_abrir || p.os_atender || p.os_gerenciar) {
    // OS em aberto, mais as encerradas nos últimos 90 dias e as abertas nos meses consultados
    const corte = Utilities.formatDate(new Date(Date.now() - 90 * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const lista = linhas(tabela('os')).filter(o =>
      o.status === OS_STATUS.aberta || o.status === OS_STATUS.andamento ||
      String(o.concluidaEm || o.atualizadoEm).slice(0, 10) >= corte ||
      ms.indexOf(String(o.abertaEm).slice(0, 7)) >= 0);
    out.os = comMateriais(lista.map(limpa), todas);
  }
  if (p.dem_ver || p.dem_executar || p.dem_delegar) {
    const corte = Utilities.formatDate(new Date(Date.now() - 90 * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    let lista = linhas(tabela('dem')).filter(d =>
      d.status === DEM_STATUS.pendente || d.status === DEM_STATUS.andamento ||
      String(d.concluidaEm || d.atualizadoEm).slice(0, 10) >= corte ||
      ms.indexOf(String(d.criadaEm).slice(0, 7)) >= 0);
    // quem só executa vê as próprias demandas e as que estão sem responsável
    if (!p.dem_ver && !p.dem_delegar) lista = lista.filter(d => d.responsavelUsuario === conta.usuario || !d.responsavelUsuario);
    out.demandas = lista.map(limpa);
    if (p.dem_delegar) out.preventivas = linhas(tabela('prev')).map(limpa);
  }
  if (out.os || out.demandas) {
    const fone = p.dem_delegar || p.os_gerenciar || p.usuarios;
    out.colaboradores = lerUsuarios().lista.filter(u => u.ativo).map(u =>
      fone ? { usuario: u.usuario, nome: u.nome || u.usuario, telefone: u.telefone } : { usuario: u.usuario, nome: u.nome || u.usuario });
  }
  return out;
}

// itens dos setores que a pessoa vê, e funções para filtrar e marcar movimentações e empréstimos
function visaoSetores(conta) {
  const setores = setoresDe(conta);
  const todos = linhas(tabela('itens'));
  const por = {};
  todos.forEach(i => { por[i.id] = setorDe(i); });
  const setorMov = x => por[x.itemId] || 'Manutenção';
  return {
    setores,
    itens: todos.filter(i => setores.indexOf(por[i.id]) >= 0).map(i => Object.assign(i, { setor: por[i.id] })),
    ve: x => setores.indexOf(setorMov(x)) >= 0,
    marca: x => Object.assign(x, { setor: setorMov(x) })
  };
}

// junta a cada OS os materiais retirados com o número dela
function comMateriais(lista, movs) {
  const por = {};
  movs.forEach(m => {
    if (!m.os) return;
    (por[m.os] = por[m.os] || []).push({
      id: m.id, data: m.data, tipo: m.tipo, itemId: m.itemId, itemNome: m.itemNome, itemCodigo: m.itemCodigo,
      qtd: m.qtd, unidade: m.unidade, estornado: !!m.estornado, registradoPor: m.registradoPor
    });
  });
  return lista.map(o => Object.assign(o, { materiais: por[o.numero] || [] }));
}

function tabela(chave) {
  const def = ABAS[chave];
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(def.nome);
  if (!sh && def.criar) {
    sh = ss.insertSheet(def.nome);
    const cab = def.cols.map(c => c[1]);
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  if (!sh) throw falha('A aba "' + def.nome + '" não foi encontrada na planilha.');
  let ncol = sh.getLastColumn();
  let head = sh.getRange(1, 1, 1, ncol).getValues()[0].map(h => String(h).trim());
  // colunas novas de versões mais recentes entram no fim da aba, sem mexer nas antigas
  def.cols.forEach(([k, label]) => {
    if (head.indexOf(label) < 0 && (def.criar || (def.opcionais || []).indexOf(k) >= 0)) {
      ncol++;
      sh.getRange(1, ncol).setValue(label).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
      head.push(label);
    }
  });
  const idx = {};
  def.cols.forEach(([k, label]) => {
    const i = head.indexOf(label);
    if (i < 0) throw falha('A coluna "' + label + '" não foi encontrada na aba ' + def.nome + '.');
    idx[k] = i;
  });
  return { sh, def, idx, ncol };
}

function linhas(t) {
  const n = t.sh.getLastRow() - 1;
  if (n < 1) return [];
  const vals = t.sh.getRange(2, 1, n, t.ncol).getValues();
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

function gravar(t, obj, row) {
  const novo = !row;
  if (novo) row = t.sh.getLastRow() + 1;
  const rng = t.sh.getRange(row, 1, 1, t.ncol);
  const vals = novo ? [new Array(t.ncol).fill('')] : rng.getValues();
  const fmts = rng.getNumberFormats();
  t.def.cols.forEach(([k]) => {
    if (!(k in obj)) return;
    const i = t.idx[k];
    const isNum = t.def.num.indexOf(k) >= 0;
    let v = obj[k];
    if (v === undefined || v === null) v = '';
    if (isNum) {
      vals[0][i] = v === '' ? '' : Number(v);
      fmts[0][i] = k === 'valorUnit' ? '"R$" #,##0.00' : 'General';
    } else {
      vals[0][i] = String(v);
      fmts[0][i] = '@';
    }
  });
  rng.setNumberFormats(fmts);
  rng.setValues(vals);
}

// ---------- utilidades ----------

// ---------- usuários, perfis e permissões ----------

const USUARIOS_CAB = ['Usuário', 'Nome', 'Senha', 'Perfil', 'Ativo'];
const PERFIL_TOTAL = 'Administração';
// [chave, título da coluna na aba Perfis, descrição, grupo]
const PERMISSOES = [
  ['painel', 'Ver painel', 'Ver o painel inicial', 'Consulta'],
  ['itens_ver', 'Ver itens', 'Ver a lista de itens e o estoque', 'Consulta'],
  ['historico_ver', 'Ver histórico', 'Ver o histórico de movimentações', 'Consulta'],
  ['dashboard', 'Ver dashboard', 'Ver o dashboard da administração', 'Consulta'],
  ['setor_manutencao', 'Setor Manutenção', 'Ver e movimentar os itens da manutenção', 'Setores do estoque'],
  ['setor_limpeza', 'Setor Limpeza', 'Ver e movimentar os materiais de limpeza', 'Setores do estoque'],
  ['registrar_saida', 'Saída', 'Registrar saídas', 'Movimentações'],
  ['registrar_entrada', 'Entrada', 'Registrar entradas e compras', 'Movimentações'],
  ['registrar_troca', 'Troca', 'Registrar trocas de peças', 'Movimentações'],
  ['registrar_emprestimo', 'Empréstimo', 'Emprestar ferramentas', 'Movimentações'],
  ['devolver', 'Devolução', 'Registrar devoluções de empréstimos', 'Movimentações'],
  ['os_ver', 'Ver OS', 'Ver as ordens de serviço', 'Ordens de serviço'],
  ['os_abrir', 'Abrir OS', 'Abrir ordens de serviço', 'Ordens de serviço'],
  ['os_atender', 'Atender OS', 'Iniciar, concluir e pôr fotos nas OS atribuídas a si ou sem responsável', 'Ordens de serviço'],
  ['os_gerenciar', 'Gerenciar OS', 'Atribuir, editar, cancelar e reabrir qualquer OS', 'Ordens de serviço'],
  ['dem_ver', 'Ver demandas', 'Ver todas as demandas da equipe', 'Demandas'],
  ['dem_executar', 'Executar demandas', 'Dar ciente, iniciar e concluir as demandas recebidas', 'Demandas'],
  ['dem_delegar', 'Delegar demandas', 'Criar e delegar demandas, cadastrar preventivas, cancelar e reabrir', 'Demandas'],
  ['itens_cadastrar', 'Cadastrar itens', 'Cadastrar itens novos', 'Cadastro'],
  ['itens_editar', 'Editar itens', 'Editar dados dos itens, importar inventário e excluir itens zerados', 'Cadastro'],
  ['contagem_registrar', 'Registrar contagens', 'Contar o estoque e enviar ajustes para a aprovação da Administração', 'Inventário'],
  ['historico_estornar', 'Estornar', 'Estornar lançamentos', 'Controle'],
  ['exportar', 'Exportar', 'Exportar planilhas', 'Controle'],
  ['usuarios', 'Usuários', 'Gerenciar usuários e permissões', 'Controle'],
  ['pendencias', 'Pendências', 'Ver e atualizar o controle de pendências do síndico (menu Administração)', 'Administração'],
  ['acessos', 'Histórico de acessos', 'Ver quem entrou no sistema, quando e de qual aparelho (menu Administração)', 'Administração']
];
const PADRAO_MANUTENCAO = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada',
  'registrar_troca', 'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'os_ver', 'os_abrir', 'os_atender', 'dem_ver', 'dem_executar',
  'setor_manutencao', 'contagem_registrar'];
const PADRAO_LIMPEZA = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada', 'itens_cadastrar', 'setor_limpeza'];

function autenticar(usuario, senha) {
  const u = String(usuario || '').trim().toLowerCase();
  const s = String(senha || '').trim();
  if (!u || !s) return null;
  const U = lerUsuarios();
  const us = U.lista.find(x => x.usuario === u);
  if (!us || !us.ativo || !conferirSenha(s, us.senha)) return null;
  // senha ainda em texto (digitada direto na planilha): vira código na primeira entrada
  if (!ehHash(us.senha)) U.sh.getRange(us.row, U.c['Senha'] + 1).setNumberFormat('@').setValue(hashSenha(s));
  return contaDe(us);
}
function contaDe(us) {
  const perms = lerPerfis()[us.perfil] || {};
  return { id: us.uid || '', usuario: us.usuario, nome: us.nome || us.usuario, perfil: us.perfil, perms };
}

// --- identificador fixo de cada conta (coluna "ID da conta" na aba Usuarios) ---
// Gerado uma vez pelo sistema e nunca reaproveitado: não muda se o login ou o nome mudar, e um login
// apagado e criado de novo com o mesmo nome recebe outro identificador. É ele que separa quem conta de quem aprova.
const COL_ID_CONTA = 'ID da conta';
function novoIdConta() { return 'C-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase(); }
function garantirColunaIdConta(U) {
  if (U.c['ID'] >= 0) return U;
  U.sh.getRange(1, U.ncol + 1).setValue(COL_ID_CONTA).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
  return lerUsuarios();
}
// dá identificador a quem não tem e troca identificadores repetidos (linha copiada à mão na planilha)
function garantirIdsUsuarios(semBloqueio) {
  let U = lerUsuarios();
  const vistos = {};
  const precisa = U.c['ID'] < 0 || U.lista.some(u => { const dup = !u.uid || vistos[u.uid]; vistos[u.uid] = true; return dup; });
  if (!precisa) return 0;
  const lock = semBloqueio ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(10000)) return 0; // outra execução está gravando: tenta na próxima
  try {
    U = garantirColunaIdConta(lerUsuarios());
    const usados = {}, trocados = [];
    let n = 0;
    U.lista.forEach(u => {
      if (u.uid && !usados[u.uid]) { usados[u.uid] = true; return; }
      if (u.uid) trocados.push(u.usuario);
      let id = novoIdConta();
      while (usados[id]) id = novoIdConta();
      usados[id] = true;
      U.sh.getRange(u.row, U.c['ID'] + 1).setNumberFormat('@').setValue(id);
      n++;
    });
    if (n) auditar({ usuario: 'sistema', nome: 'Sistema', perfil: '' }, 'Identificador das contas', n + ' conta(s) receberam identificador fixo' + (trocados.length ? '; identificador repetido trocado em: ' + trocados.join(', ') : ''));
    return n;
  } finally { if (lock) lock.releaseLock(); }
}
// mesma pessoa = mesmo identificador fixo; por segurança, o mesmo login também conta como a mesma pessoa
function mesmaConta(idA, usuarioA, conta) {
  if (!conta) return false;
  if (idA && conta.id && idA === conta.id) return true;
  return !!usuarioA && usuarioA === conta.usuario;
}
function contouEsta(c, conta) { return mesmaConta(c.contadoPorId, c.contadoPor, conta); }

function lerUsuarios() {
  const sh = abaUsuarios();
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(h => String(h).trim());
  const c = {};
  USUARIOS_CAB.forEach(label => {
    c[label] = head.indexOf(label);
    if (c[label] < 0) throw falha('A coluna "' + label + '" não foi encontrada na aba Usuarios.');
  });
  c['Telefone'] = head.indexOf('Telefone');
  c['ID'] = head.indexOf(COL_ID_CONTA);
  const lista = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const usuario = String(r[c['Usuário']]).trim().toLowerCase();
    if (!/^[a-z0-9._@-]{2,40}$/.test(usuario)) continue;
    lista.push({
      row: i + 1, usuario, nome: texto(r[c['Nome']], 60), senha: String(r[c['Senha']]).trim(),
      perfil: String(r[c['Perfil']]).trim(), ativo: String(r[c['Ativo']]).trim().toLowerCase().indexOf('n') !== 0,
      telefone: c['Telefone'] >= 0 ? String(r[c['Telefone']]).replace(/\D/g, '') : '',
      uid: c['ID'] >= 0 ? String(r[c['ID']]).trim() : ''
    });
  }
  return { sh, c, lista, ncol: head.length };
}

function lerPerfis() {
  const sh = abaPerfis();
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(h => String(h).trim());
  const out = {};
  for (let i = 1; i < vals.length; i++) {
    const nome = String(vals[i][0]).trim();
    if (!linhaDePerfil(vals[i], head)) continue;
    const perms = {};
    PERMISSOES.forEach(([k, label]) => {
      const j = head.indexOf(label);
      perms[k] = nome === PERFIL_TOTAL ? true : (j >= 0 && String(vals[i][j]).trim().toLowerCase().indexOf('s') === 0);
    });
    out[nome] = perms;
  }
  if (!out[PERFIL_TOTAL]) out[PERFIL_TOTAL] = PERMISSOES.reduce((m, p) => { m[p[0]] = true; return m; }, {});
  return out;
}

function equipe() {
  const perfis = lerPerfis();
  return {
    usuarios: (function () {
      const ses = contarSessoes();
      return lerUsuarios().lista.map(u => ({ usuario: u.usuario, nome: u.nome, perfil: u.perfil, ativo: u.ativo, telefone: u.telefone,
        sessoes: ses[u.usuario] || 0, bloqueado: !!loginBloqueado(u.usuario) }));
    })(),
    perfis: Object.keys(perfis).map(n => ({ nome: n, perms: perfis[n], fixo: n === PERFIL_TOTAL })),
    permissoes: PERMISSOES.map(([chave, coluna, descricao, grupo]) => ({ chave, descricao, grupo }))
  };
}

function salvarUsuario(r, conta) {
  const v = r.u || {};
  const original = String(r.original || '').trim().toLowerCase();
  const usuario = String(v.usuario || '').trim().toLowerCase();
  if (!/^[a-z0-9._@-]{2,40}$/.test(usuario)) throw falha('Usuário inválido: use letras minúsculas, números, ponto ou traço, sem espaços.');
  const nome = texto(v.nome, 60);
  if (!nome) throw falha('Informe o nome do colaborador.');
  const senha = String(v.senha || '').trim();
  if (!original && !senha) throw falha('Defina a senha do novo login.');
  if (senha && senha.length < SEG.senhaMin) throw falha('A senha precisa ter pelo menos ' + SEG.senhaMin + ' caracteres.');
  const perfis = lerPerfis();
  const perfil = String(v.perfil || '').trim();
  if (!perfis[perfil]) throw falha('Perfil não encontrado.');
  const ativo = v.ativo !== false;
  const telefone = String(v.telefone || '').replace(/\D/g, '').slice(0, 15);
  if (telefone && telefone.length < 10) throw falha('Telefone incompleto: informe o DDD e o número.');
  let U = lerUsuarios();
  if (U.c['Telefone'] < 0) {
    U.sh.getRange(1, U.ncol + 1).setValue('Telefone').setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    U = lerUsuarios();
  }
  U = garantirColunaIdConta(U);
  const outro = U.lista.find(x => x.usuario === usuario && x.usuario !== original);
  if (outro) throw falha('O usuário "' + usuario + '" já existe.');
  const anterior = original ? U.lista.find(x => x.usuario === original) : null;
  // só quem é do perfil Administração cria ou altera logins com acesso total
  if ((perfil === PERFIL_TOTAL || (anterior && anterior.perfil === PERFIL_TOTAL)) && conta.usuario && conta.perfil !== PERFIL_TOTAL) {
    const e = falha('Só um login do perfil Administração pode criar ou alterar logins com acesso total.'); e.negado = true; throw e;
  }
  if (original && original === conta.usuario) {
    if (!ativo) throw falha('Você não pode desativar o seu próprio login.');
    if (!perfis[perfil].usuarios) throw falha('Você não pode tirar de si mesmo o acesso a usuários e permissões.');
  }
  const linha = [];
  linha[U.c['Usuário']] = usuario; linha[U.c['Nome']] = nome;
  if (senha) linha[U.c['Senha']] = hashSenha(senha);
  linha[U.c['Perfil']] = perfil; linha[U.c['Ativo']] = ativo ? 'Sim' : 'Não'; linha[U.c['Telefone']] = telefone;
  if (!original || !(anterior && anterior.uid)) linha[U.c['ID']] = novoIdConta();
  let row;
  if (original) {
    const atual = U.lista.find(x => x.usuario === original);
    if (!atual) throw falha('Usuário não encontrado. Atualize a página.');
    row = atual.row;
  } else {
    const ultima = U.lista.length ? Math.max.apply(null, U.lista.map(x => x.row)) : 1;
    U.sh.insertRowAfter(ultima);
    row = ultima + 1;
  }
  const rng = U.sh.getRange(row, 1, 1, U.ncol);
  const vals = rng.getValues();
  linha.forEach((x, i) => { if (x !== undefined) vals[0][i] = x; });
  rng.setNumberFormat('@');
  rng.setValues(vals);
  if (original) {
    const t = tabela('os');
    linhas(t).forEach(o => {
      const upd = {};
      if (o.responsavelUsuario === original) { upd.responsavelUsuario = usuario; upd.responsavel = nome; }
      if (o.abertaPorUsuario === original) upd.abertaPorUsuario = usuario;
      if (Object.keys(upd).length) gravar(t, upd, o._row);
    });
    const tcr = tabela('cont');
    linhas(tcr).forEach(c => {
      const upd = {};
      if (c.contadoPor === original) upd.contadoPor = usuario;
      if (c.decididoPor === original) upd.decididoPor = usuario;
      if (Object.keys(upd).length) gravar(tcr, upd, c._row);
    });
    ['dem', 'prev'].forEach(k => {
      const td = tabela(k);
      linhas(td).forEach(d => {
        const upd = {};
        if (d.responsavelUsuario === original) { upd.responsavelUsuario = usuario; upd.responsavel = nome; }
        if (d.criadaPorUsuario === original) upd.criadaPorUsuario = usuario;
        if (Object.keys(upd).length) gravar(td, upd, d._row);
      });
    });
  }
  // sessões: renomeado leva junto; senha trocada ou login bloqueado encerra os acessos abertos
  if (original && original !== usuario) renomearSessoes(original, usuario);
  let encerradas = 0;
  if (original && (senha || !ativo)) encerradas = encerrarSessoesDe(usuario, original === conta.usuario ? conta.sessao : '');
  if (original && senha) limparFalhasLogin(usuario);
  const mud = [];
  if (!original) mud.push('perfil ' + perfil + (ativo ? '' : ', bloqueado'));
  else {
    if (anterior && anterior.nome !== nome) mud.push('nome');
    if (original !== usuario) mud.push('usuário ' + original + ' → ' + usuario);
    if (anterior && anterior.perfil !== perfil) mud.push('perfil ' + anterior.perfil + ' → ' + perfil);
    if (anterior && anterior.ativo !== ativo) mud.push(ativo ? 'reativado' : 'bloqueado');
    if (senha) mud.push('senha trocada');
    if (anterior && anterior.telefone !== telefone) mud.push('WhatsApp');
  }
  AUDIT_DET = (original ? 'Alterou ' : 'Criou ') + usuario + (mud.length ? ': ' + mud.join(', ') : ' (sem mudanças)') + (encerradas ? '; ' + encerradas + ' acesso(s) aberto(s) encerrado(s)' : '');
  return original ? 'Usuário atualizado: ' + nome + '.' + (encerradas ? ' Os acessos abertos dele foram encerrados.' : '') : 'Usuário criado: ' + nome + '.';
}

// encerrar acessos abertos ou liberar um login bloqueado por tentativas
function acessoUsuario(r, conta) {
  const u = String(r.usuario || '').trim().toLowerCase();
  const us = lerUsuarios().lista.find(x => x.usuario === u);
  if (!us) throw falha('Usuário não encontrado. Atualize a página.');
  if (us.perfil === PERFIL_TOTAL && conta.perfil !== PERFIL_TOTAL) { const e = falha('Só um login do perfil Administração pode mexer nos acessos de outro administrador.'); e.negado = true; throw e; }
  if (r.op === 'liberar') { limparFalhasLogin(u); AUDIT_DET = 'Liberou o login ' + u; return 'Login de ' + us.nome + ' liberado.'; }
  if (r.op === 'encerrar') {
    const n = encerrarSessoesDe(u, u === conta.usuario ? conta.sessao : '');
    AUDIT_DET = 'Encerrou ' + n + ' acesso(s) aberto(s) de ' + u;
    return n ? n + (n === 1 ? ' acesso encerrado.' : ' acessos encerrados.') + ' ' + us.nome + ' vai precisar entrar de novo.' : 'Não havia acessos abertos de ' + us.nome + '.';
  }
  throw falha('Operação inválida.');
}
function exigirPerfilTotalParaPerfil(r, conta) {
  const sensivel = r.perms && (r.perms.usuarios || r.perms.acessos);
  if (sensivel && conta.perfil !== PERFIL_TOTAL) { const e = falha('Só um login do perfil Administração pode dar a um perfil acesso a usuários ou ao histórico de acessos.'); e.negado = true; throw e; }
}

function salvarPerfil(r) {
  const nome = texto(r.nome, 40);
  const original = texto(r.original, 40);
  if (!nome) throw falha('Informe o nome do perfil.');
  if (nome === PERFIL_TOTAL || original === PERFIL_TOTAL) throw falha('O perfil Administração tem acesso total e não pode ser alterado.');
  const sh = abaPerfis();
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(h => String(h).trim());
  let row = 0, ultima = 1;
  for (let i = 1; i < vals.length; i++) {
    if (!linhaDePerfil(vals[i], head)) continue;
    ultima = i + 1;
    const n = String(vals[i][0]).trim();
    if (n === nome && n !== original) throw falha('Já existe um perfil chamado "' + nome + '".');
    if (original && n === original) row = i + 1;
  }
  if (original && !row) throw falha('Perfil não encontrado. Atualize a página.');
  if (!row) { sh.insertRowAfter(ultima); row = ultima + 1; }
  const linha = head.map((h, j) => {
    if (j === 0) return nome;
    const p = PERMISSOES.find(x => x[1] === h);
    if (!p) return original ? vals[row - 1][j] : '';
    return r.perms && r.perms[p[0]] ? 'Sim' : 'Não';
  });
  const rng = sh.getRange(row, 1, 1, head.length);
  rng.setNumberFormat('@');
  rng.setValues([linha]);
  if (original && original !== nome) {
    const U = lerUsuarios();
    U.lista.filter(u => u.perfil === original).forEach(u => U.sh.getRange(u.row, U.c['Perfil'] + 1).setValue(nome));
  }
  validacaoPerfis();
  return original ? 'Perfil atualizado: ' + nome + '.' : 'Perfil criado: ' + nome + '.';
}

function excluirPerfil(nome) {
  nome = texto(nome, 40);
  if (nome === PERFIL_TOTAL) throw falha('O perfil Administração não pode ser excluído.');
  const emUso = lerUsuarios().lista.filter(u => u.perfil === nome);
  if (emUso.length) throw falha('Este perfil ainda é usado por ' + emUso.map(u => u.nome || u.usuario).join(', ') + '. Troque o perfil dessas pessoas antes.');
  const sh = abaPerfis();
  const vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === nome) { sh.deleteRow(i + 1); validacaoPerfis(); return 'Perfil excluído.'; }
  }
  throw falha('Perfil não encontrado.');
}

// uma linha da aba Perfis só conta se tiver nome e alguma permissão marcada como Sim ou Não
function linhaDePerfil(r, head) {
  const nome = String(r[0]).trim();
  if (!nome || nome.length > 40) return false;
  return PERMISSOES.some(p => { const j = head.indexOf(p[1]); return j >= 0 && /^(sim|não|nao)$/i.test(String(r[j]).trim()); });
}

// mantém a lista de perfis da aba Usuarios igual à aba Perfis
function validacaoPerfis() {
  const U = lerUsuarios();
  const nomes = Object.keys(lerPerfis());
  U.sh.getRange(2, U.c['Perfil'] + 1, Math.max(50, U.sh.getLastRow()), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(nomes, true).build()
  );
}

// Cria a aba "Perfis" na primeira vez: Administração (acesso total) e Manutenção.
function abaPerfis() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Perfis');
  if (sh) { garantirColunasPerfis(sh); return sh; }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sh = ss.getSheetByName('Perfis');
    if (sh) return sh;
    sh = ss.insertSheet('Perfis', 1);
    const head = ['Perfil'].concat(PERMISSOES.map(p => p[1]));
    const linhas = [
      head,
      [PERFIL_TOTAL].concat(PERMISSOES.map(() => 'Sim')),
      ['Manutenção'].concat(PERMISSOES.map(p => PADRAO_MANUTENCAO.indexOf(p[0]) >= 0 ? 'Sim' : 'Não'))
    ];
    const rng = sh.getRange(1, 1, linhas.length, head.length);
    rng.setNumberFormat('@');
    rng.setValues(linhas);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    sh.setColumnWidth(1, 160);
    sh.getRange(2, 2, 50, PERMISSOES.length).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build()
    );
    sh.getRange(linhas.length + 2, 1).setValue(
      'O perfil Administração sempre tem acesso total. Os outros perfis podem ser ajustados aqui ou no site, em Usuários.'
    ).setFontStyle('italic');
    SpreadsheetApp.flush();
    return sh;
  } finally {
    lock.releaseLock();
  }
}

// Permissões criadas em versões novas viram colunas novas na aba Perfis.
// Administração ganha Sim; Manutenção ganha o padrão; os outros perfis começam com Não.
function garantirColunasPerfis(sh) {
  const ncol = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, ncol).getValues()[0].map(h => String(h).trim());
  const faltam = PERMISSOES.filter(p => head.indexOf(p[1]) < 0);
  if (!faltam.length) return;
  const vals = sh.getDataRange().getValues();
  const novas = vals.map((r, i) => {
    if (i === 0) return faltam.map(p => p[1]);
    if (!linhaDePerfil(r, head)) return faltam.map(() => '');
    const nome = String(r[0]).trim();
    return faltam.map(p => nome === PERFIL_TOTAL || (nome === 'Manutenção' && PADRAO_MANUTENCAO.indexOf(p[0]) >= 0) ? 'Sim' : 'Não');
  });
  const rng = sh.getRange(1, ncol + 1, novas.length, faltam.length);
  rng.setNumberFormat('@');
  rng.setValues(novas);
  sh.getRange(1, ncol + 1, 1, faltam.length).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
  sh.getRange(2, ncol + 1, 50, faltam.length).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build()
  );
}

// Cria a aba "Usuarios" na primeira vez, com a administração e 3 funcionários.
function abaUsuarios() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Usuarios');
  if (sh) return sh;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sh = ss.getSheetByName('Usuarios');
    if (sh) return sh;
    let senhaAdmin = '';
    const cfg = ss.getSheetByName('Config');
    if (cfg) {
      cfg.getDataRange().getValues().forEach(r => {
        const k = String(r[0]).trim().toLowerCase();
        if (k === 'senha da administração' || k === 'senha da administracao') senhaAdmin = String(r[1]).trim();
      });
    }
    sh = ss.insertSheet('Usuarios', 0);
    const linhas = [
      USUARIOS_CAB,
      ['admin', 'Administração', senhaAdmin || senhaAleatoria(), PERFIL_TOTAL, 'Sim'],
      ['funcionario1', 'Funcionário 1', senhaAleatoria(), 'Manutenção', 'Sim'],
      ['funcionario2', 'Funcionário 2', senhaAleatoria(), 'Manutenção', 'Sim'],
      ['funcionario3', 'Funcionário 3', senhaAleatoria(), 'Manutenção', 'Sim']
    ];
    const rng = sh.getRange(1, 1, linhas.length, USUARIOS_CAB.length);
    rng.setNumberFormat('@');
    rng.setValues(linhas);
    sh.getRange(1, 1, 1, USUARIOS_CAB.length).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, 5, 150);
    sh.getRange(linhas.length + 2, 1).setValue(
      'Os logins podem ser criados e editados no site, em Usuários, ou aqui mesmo. Para bloquear alguém, escreva Não em Ativo.'
    ).setFontStyle('italic');
    sh.getRange(2, 5, 50, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build()
    );
    if (cfg) {
      const v = cfg.getDataRange().getValues();
      for (let i = 0; i < v.length; i++) {
        const k = String(v[i][0]).trim().toLowerCase();
        if (k.indexOf('senha da') === 0) {
          cfg.getRange(i + 1, 2).setValue('');
          cfg.getRange(i + 1, 3).setValue('Não é mais usada. Os logins agora ficam na aba Usuarios.');
        }
      }
    }
    SpreadsheetApp.flush();
    return sh;
  } finally {
    lock.releaseLock();
  }
}

function senhaAleatoria() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

// ---------- relatório para o dashboard ----------

function relatorio(de, ate, conta) {
  const ok = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  if (!ok(de) || !ok(ate)) throw falha('Período inválido.');
  if (de > ate) { const t = de; de = ate; ate = t; }
  const limpa = o => { const c = Object.assign({}, o); delete c._row; return c; };
  const V = visaoSetores(conta);
  const todasSetores = linhas(tabela('movs'));
  const todas = todasSetores.filter(V.ve).map(V.marca);
  const ultimo = {}, preco = {};
  todas.forEach(m => {
    if (m.estornado || m.tipo === 'estorno' || m.tipo === 'conferencia') return; // conferência não é uso do item
    if (!ultimo[m.itemId] || m.data > ultimo[m.itemId]) ultimo[m.itemId] = m.data;
    if (m.tipo === 'entrada' && m.valorUnit !== '' && Number(m.valorUnit) > 0) {
      if (!preco[m.itemId] || m.data >= preco[m.itemId].data) preco[m.itemId] = { data: m.data, valor: Number(m.valorUnit) };
    }
  });
  Object.keys(preco).forEach(k => { preco[k] = preco[k].valor; });
  const osDoPeriodo = linhas(tabela('os')).filter(o => {
    const ab = String(o.abertaEm).slice(0, 10), fe = String(o.concluidaEm).slice(0, 10);
    return (ab >= de && ab <= ate) || (fe && fe >= de && fe <= ate) || o.status === OS_STATUS.aberta || o.status === OS_STATUS.andamento;
  }).map(limpa);
  const demDoPeriodo = linhas(tabela('dem')).filter(d => {
    const cr = String(d.criadaEm).slice(0, 10), fe = String(d.concluidaEm).slice(0, 10);
    return (cr >= de && cr <= ate) || (fe && fe >= de && fe <= ate) || d.status === DEM_STATUS.pendente || d.status === DEM_STATUS.andamento;
  }).map(limpa);
  return {
    de, ate,
    os: comMateriais(osDoPeriodo, todasSetores),
    demandas: demDoPeriodo,
    movs: todas.filter(m => m.data >= de && m.data <= ate).map(limpa),
    itens: V.itens.map(limpa),
    emprestimos: linhas(tabela('emp')).filter(V.ve).map(e => V.marca(limpa(e))),
    setores: V.setores,
    ultimo, preco
  };
}

// ---------- ordens de serviço ----------

function osAndamento(atual, nome, txt) {
  const linha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + ' · ' + nome + ' · ' + txt;
  const tudo = (atual ? String(atual) + '\n' : '') + linha;
  return tudo.length > 45000 ? tudo.slice(tudo.length - 45000) : tudo;
}

function osRegistrarAndamento(numero, nome, txt) {
  const t = tabela('os');
  const o = linhas(t).find(x => x.numero === numero);
  if (o) gravar(t, { andamento: osAndamento(o.andamento, nome, txt), atualizadoEm: agora() }, o._row);
}

function prazoPadrao(prioridade) {
  const dias = { Urgente: 0, Alta: 2, Normal: 7, Baixa: 15 }[prioridade];
  return Utilities.formatDate(new Date(Date.now() + (dias === undefined ? 7 : dias) * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function colaboradorAtivo(usuario) {
  const u = lerUsuarios().lista.find(x => x.usuario === String(usuario || '').trim().toLowerCase() && x.ativo);
  if (!u) throw falha('Colaborador não encontrado ou bloqueado.');
  return u;
}

function osCampos(v) {
  const titulo = texto(v.titulo, 120);
  if (!titulo) throw falha('Descreva o serviço em poucas palavras.');
  const local = texto(v.local, 120);
  if (!local) throw falha('Informe o local do serviço.');
  const prioridade = OS_PRIORIDADES.indexOf(v.prioridade) >= 0 ? v.prioridade : 'Normal';
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(v.prazo || '')) ? String(v.prazo) : prazoPadrao(prioridade);
  return {
    titulo, local, prioridade, prazo, categoria: texto(v.categoria, 40),
    descricao: texto(v.descricao, 3000), solicitante: texto(v.solicitante, 120)
  };
}

function osAbrir(v, conta) {
  const campos = osCampos(v);
  let resp = null;
  if (v.responsavelUsuario) {
    if (!conta.perms.os_gerenciar) throw falha('Só quem gerencia OS pode escolher o responsável.');
    resp = colaboradorAtivo(v.responsavelUsuario);
  }
  const t = tabela('os');
  const max = linhas(t).reduce((m, o) => { const x = /(\d+)\s*$/.exec(o.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  const numero = 'OS-' + ('000' + (max + 1)).slice(-4);
  const id = novoId('O');
  let and = osAndamento('', conta.nome, 'Abriu a OS');
  if (resp) and = osAndamento(and, conta.nome, 'Atribuiu a ' + (resp.nome || resp.usuario));
  gravar(t, Object.assign({
    id, numero, status: OS_STATUS.aberta, abertaEm: agora(), abertaPor: conta.nome, abertaPorUsuario: conta.usuario,
    responsavel: resp ? (resp.nome || resp.usuario) : '', responsavelUsuario: resp ? resp.usuario : '',
    andamento: and, atualizadoEm: agora()
  }, campos));
  return { texto: numero + ' aberta.', numero, id };
}

function osDireitos(o, conta) {
  const p = conta.perms;
  const ger = !!p.os_gerenciar;
  const livre = !o.responsavelUsuario;
  const minha = o.responsavelUsuario === conta.usuario;
  const encerrada = o.status === OS_STATUS.concluida || o.status === OS_STATUS.cancelada;
  return { ger, livre, minha, encerrada, atender: ger || (!!p.os_atender && (minha || livre)) };
}

function osAtualizar(r, conta) {
  const t = tabela('os');
  const o = linhas(t).find(x => x.id === r.id);
  if (!o) throw falha('OS não encontrada. Atualize a página.');
  const d = osDireitos(o, conta);
  const negar = () => { throw falha('Seu perfil não tem permissão para isso nesta OS.'); };
  const upd = { atualizadoEm: agora() };
  let txt, msg = 'OS atualizada.';
  switch (r.op) {
    case 'iniciar':
      if (!d.atender) negar();
      if (o.status !== OS_STATUS.aberta) throw falha('Só uma OS aberta pode ser iniciada.');
      upd.status = OS_STATUS.andamento; upd.iniciadaEm = agora();
      if (d.livre) { upd.responsavel = conta.nome; upd.responsavelUsuario = conta.usuario; }
      txt = 'Iniciou o atendimento'; msg = o.numero + ' em andamento.';
      break;
    case 'concluir': {
      if (!d.atender) negar();
      if (d.encerrada) throw falha('Esta OS já está encerrada.');
      const sol = texto(r.solucao, 3000);
      if (!sol) throw falha('Descreva o que foi feito.');
      upd.status = OS_STATUS.concluida; upd.concluidaEm = agora(); upd.concluidaPor = conta.nome; upd.solucao = sol;
      if (!o.iniciadaEm) upd.iniciadaEm = upd.concluidaEm;
      if (d.livre) { upd.responsavel = conta.nome; upd.responsavelUsuario = conta.usuario; }
      txt = 'Concluiu: ' + sol; msg = o.numero + ' concluída.';
      break;
    }
    case 'cancelar': {
      if (!d.ger) negar();
      if (d.encerrada) throw falha('Esta OS já está encerrada.');
      const mot = texto(r.motivo, 300);
      if (!mot) throw falha('Informe o motivo do cancelamento.');
      upd.status = OS_STATUS.cancelada; upd.motivoCancelamento = mot; upd.concluidaEm = agora();
      txt = 'Cancelou: ' + mot; msg = o.numero + ' cancelada.';
      break;
    }
    case 'reabrir':
      if (!d.ger) negar();
      if (!d.encerrada) throw falha('Esta OS já está em aberto.');
      upd.status = OS_STATUS.aberta; upd.concluidaEm = ''; upd.concluidaPor = ''; upd.motivoCancelamento = ''; upd.solucao = '';
      txt = 'Reabriu a OS' + (texto(r.motivo, 300) ? ': ' + texto(r.motivo, 300) : ''); msg = o.numero + ' reaberta.';
      break;
    case 'atribuir':
      if (!d.ger) negar();
      if (d.encerrada) throw falha('Reabra a OS antes de mudar o responsável.');
      if (!r.responsavelUsuario) { upd.responsavel = ''; upd.responsavelUsuario = ''; txt = 'Tirou o responsável'; }
      else { const u = colaboradorAtivo(r.responsavelUsuario); upd.responsavel = u.nome || u.usuario; upd.responsavelUsuario = u.usuario; txt = 'Atribuiu a ' + upd.responsavel; }
      break;
    case 'editar':
      if (!(d.ger || (o.abertaPorUsuario === conta.usuario && o.status === OS_STATUS.aberta))) negar();
      Object.assign(upd, osCampos(r.os || {}));
      txt = 'Editou os dados da OS';
      break;
    case 'nota': {
      const p = conta.perms;
      if (!(p.os_abrir || p.os_atender || p.os_gerenciar)) negar();
      const n = texto(r.nota, 1000);
      if (!n) throw falha('Escreva a anotação.');
      txt = 'Anotou: ' + n; msg = 'Anotação registrada.';
      break;
    }
    default: throw falha('Ação desconhecida.');
  }
  upd.andamento = osAndamento(o.andamento, conta.nome, txt);
  gravar(t, upd, o._row);
  if (r.op === 'concluir' || r.op === 'cancelar') {
    const td = tabela('dem');
    linhas(td).filter(d => d.os === o.numero).forEach(d =>
      gravar(td, { andamento: osAndamento(d.andamento, conta.nome, 'A ' + o.numero + ' foi ' + (r.op === 'concluir' ? 'concluída' : 'cancelada')), atualizadoEm: agora() }, d._row));
  }
  return msg;
}

// fotos e notas fiscais: cada tipo numa pasta própria no Drive, ao lado da planilha
function pastaDrive(chave, nome) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(chave);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const arq = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  const pais = arq.getParents();
  const pai = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
  const f = pai.createFolder(nome);
  props.setProperty(chave, f.getId());
  return f;
}
function pastaFotos() { return pastaDrive('PASTA_FOTOS_OS', 'Fotos das OS - Estoque da Manutenção'); }
function pastaNF() { return pastaDrive('PASTA_NF', 'Notas fiscais - Pier Gestão'); }

function idsDeArquivos(v) {
  const s = String(v || '');
  const links = s.match(/\/d\/([A-Za-z0-9_-]{10,})/g);
  if (links) return links.map(x => x.slice(3));
  return s.split(/[\s,]+/).filter(x => /^[A-Za-z0-9_-]{10,}$/.test(x));
}

// foto ou PDF da nota fiscal de uma compra; o lançamento da entrada guarda o link
function nfEnviar(r, conta) {
  const tipos = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  const ext = tipos[r.mime];
  if (!ext) throw falha('Envie a nota fiscal como foto (JPG ou PNG) ou PDF.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 10000000) throw falha('O arquivo da nota fiscal está muito grande (máximo de 7 MB).');
  const partes = ['NF', texto(r.nf, 30) || 'sem número', texto(r.fornecedor, 60), hoje()].filter(Boolean);
  const nomeArq = partes.join(' - ').replace(/[\\/:*?"<>|]/g, '-') + ' - ' + conta.usuario + '.' + ext;
  const f = pastaNF().createFile(Utilities.newBlob(Utilities.base64Decode(b64), r.mime, nomeArq));
  return { id: f.getId(), mime: r.mime };
}

function osFoto(r, conta) {
  const t = tabela('os');
  const o = linhas(t).find(x => x.id === r.id);
  if (!o) throw falha('OS não encontrada. Atualize a página.');
  const fase = r.fase === 'depois' ? 'depois' : 'antes';
  const d = osDireitos(o, conta);
  const abriu = o.abertaPorUsuario === conta.usuario && !!conta.perms.os_abrir;
  if (!(d.atender || (abriu && fase === 'antes'))) throw falha('Seu perfil não tem permissão para pôr fotos nesta OS.');
  if (o.status === OS_STATUS.cancelada) throw falha('Esta OS está cancelada.');
  const campo = fase === 'antes' ? 'fotosAntes' : 'fotosDepois';
  const ids = String(o[campo] || '').split(',').filter(Boolean);
  if (ids.length >= OS_MAX_FOTOS) throw falha('Esta OS já tem ' + OS_MAX_FOTOS + ' fotos de ' + fase + '.');
  const mime = ['image/jpeg', 'image/png', 'image/webp'].indexOf(r.mime) >= 0 ? r.mime : '';
  if (!mime) throw falha('Envie a foto em JPG ou PNG.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 8000000) throw falha('A foto está muito grande.');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, o.numero + '-' + fase + '-' + (ids.length + 1) + '.' + ext);
  const f = pastaFotos().createFile(blob);
  ids.push(f.getId());
  const upd = { atualizadoEm: agora(), andamento: osAndamento(o.andamento, conta.nome, 'Pôs uma foto de ' + fase) };
  upd[campo] = ids.join(',');
  gravar(t, upd, o._row);
  return 'Foto anexada.';
}

function fotoDaPasta(id, pastaObj) {
  id = String(id || '');
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw falha('Foto inválida.');
  let f;
  try { f = DriveApp.getFileById(id); } catch (e) { throw falha('Foto não encontrada.'); }
  const pasta = (pastaObj || pastaFotos()).getId();
  const pais = f.getParents();
  let dentro = false;
  while (pais.hasNext()) if (pais.next().getId() === pasta) dentro = true;
  if (!dentro || f.isTrashed()) throw falha('Foto não encontrada.');
  return f;
}

function verFoto(id) { return verArquivo(id, pastaFotos()); }
function verArquivo(id, pasta) {
  const f = fotoDaPasta(id, pasta), b = f.getBlob();
  return { mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()), nome: f.getName() };
}

function osFotoRemover(r, conta) {
  const t = tabela('os');
  const o = linhas(t).find(x => x.id === r.id);
  if (!o) throw falha('OS não encontrada. Atualize a página.');
  const d = osDireitos(o, conta);
  if (!d.ger && !(d.atender && !d.encerrada)) throw falha('Seu perfil não tem permissão para tirar fotos desta OS.');
  const campo = r.fase === 'depois' ? 'fotosDepois' : 'fotosAntes';
  const ids = String(o[campo] || '').split(',').filter(Boolean);
  if (ids.indexOf(r.fotoId) < 0) throw falha('Foto não encontrada nesta OS.');
  try { fotoDaPasta(r.fotoId).setTrashed(true); } catch (e) {}
  const upd = { atualizadoEm: agora(), andamento: osAndamento(o.andamento, conta.nome, 'Tirou uma foto de ' + (r.fase === 'depois' ? 'depois' : 'antes')) };
  upd[campo] = ids.filter(x => x !== r.fotoId).join(',');
  gravar(t, upd, o._row);
  return 'Foto removida.';
}

// ---------- demandas da administração para a manutenção ----------

function demCampos(v) {
  const titulo = texto(v.titulo, 120);
  if (!titulo) throw falha('Descreva a demanda em poucas palavras.');
  const prioridade = OS_PRIORIDADES.indexOf(v.prioridade) >= 0 ? v.prioridade : 'Normal';
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(v.prazo || '')) ? String(v.prazo) : prazoPadrao(prioridade);
  return {
    titulo, prioridade, prazo, local: texto(v.local, 120), categoria: texto(v.categoria, 40), descricao: texto(v.descricao, 3000)
  };
}

function demMaxNumero(lista) {
  return lista.reduce((m, d) => { const x = /(\d+)\s*$/.exec(d.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
}

function demGravarNova(t, n, campos, resp, autor, extra) {
  const numero = 'DM-' + ('000' + n).slice(-4);
  const id = novoId('D');
  let and = osAndamento('', autor.nome, extra && extra.preventiva ? 'Criada pela preventiva ' + extra.preventivaNumero : 'Criou a demanda');
  if (resp) and = osAndamento(and, autor.nome, 'Delegou a ' + (resp.nome || resp.usuario));
  gravar(t, Object.assign({
    id, numero, status: DEM_STATUS.pendente, criadaEm: agora(), criadaPor: autor.nome, criadaPorUsuario: autor.usuario || '',
    responsavel: resp ? (resp.nome || resp.usuario) : '', responsavelUsuario: resp ? resp.usuario : '',
    preventiva: extra && extra.preventiva ? extra.preventiva : '', andamento: and, atualizadoEm: agora()
  }, campos));
  return { id, numero };
}

function demCriar(v, conta) {
  const campos = demCampos(v);
  const resp = v.responsavelUsuario ? colaboradorAtivo(v.responsavelUsuario) : null;
  const t = tabela('dem');
  const r = demGravarNova(t, demMaxNumero(linhas(t)) + 1, campos, resp, conta);
  return { texto: r.numero + ' criada' + (resp ? ' e delegada a ' + (resp.nome || resp.usuario) : '') + '.', id: r.id };
}

function demDireitos(d, conta) {
  const p = conta.perms;
  const del = !!p.dem_delegar;
  const livre = !d.responsavelUsuario;
  const minha = d.responsavelUsuario === conta.usuario;
  const encerrada = d.status === DEM_STATUS.concluida || d.status === DEM_STATUS.cancelada;
  return { del, livre, minha, encerrada, exec: del || (!!p.dem_executar && (minha || livre)) };
}

function demAtualizar(r, conta) {
  const t = tabela('dem');
  const d = linhas(t).find(x => x.id === r.id);
  if (!d) throw falha('Demanda não encontrada. Atualize a página.');
  const dir = demDireitos(d, conta);
  const negar = () => { throw falha('Seu perfil não tem permissão para isso nesta demanda.'); };
  const upd = { atualizadoEm: agora() };
  let txt, msg = 'Demanda atualizada.';
  switch (r.op) {
    case 'ciente':
      if (!dir.minha) throw falha('Só o responsável pela demanda pode dar o ciente.');
      if (d.cienteEm) return 'O ciente já estava registrado.';
      upd.cienteEm = agora(); txt = 'Deu ciente'; msg = 'Ciente registrado na ' + d.numero + '.';
      break;
    case 'iniciar':
      if (!dir.exec) negar();
      if (d.status !== DEM_STATUS.pendente) throw falha('Só uma demanda pendente pode ser iniciada.');
      upd.status = DEM_STATUS.andamento; upd.iniciadaEm = agora();
      if (dir.livre) { upd.responsavel = conta.nome; upd.responsavelUsuario = conta.usuario; }
      if ((dir.minha || dir.livre) && !d.cienteEm) upd.cienteEm = agora();
      txt = 'Iniciou a demanda'; msg = d.numero + ' em andamento.';
      break;
    case 'concluir': {
      if (!dir.exec) negar();
      if (dir.encerrada) throw falha('Esta demanda já está encerrada.');
      const c = texto(r.conclusao, 3000);
      if (!c) throw falha('Descreva o que foi feito.');
      upd.status = DEM_STATUS.concluida; upd.concluidaEm = agora(); upd.concluidaPor = conta.nome; upd.conclusao = c;
      if (!d.iniciadaEm) upd.iniciadaEm = upd.concluidaEm;
      if (dir.livre) { upd.responsavel = conta.nome; upd.responsavelUsuario = conta.usuario; }
      if ((dir.minha || dir.livre) && !d.cienteEm) upd.cienteEm = upd.concluidaEm;
      txt = 'Concluiu: ' + c; msg = d.numero + ' concluída.';
      break;
    }
    case 'cancelar': {
      if (!dir.del) negar();
      if (dir.encerrada) throw falha('Esta demanda já está encerrada.');
      const m = texto(r.motivo, 300);
      if (!m) throw falha('Informe o motivo do cancelamento.');
      upd.status = DEM_STATUS.cancelada; upd.motivoCancelamento = m; upd.concluidaEm = agora();
      txt = 'Cancelou: ' + m; msg = d.numero + ' cancelada.';
      break;
    }
    case 'reabrir':
      if (!dir.del) negar();
      if (!dir.encerrada) throw falha('Esta demanda já está em aberto.');
      upd.status = DEM_STATUS.pendente; upd.concluidaEm = ''; upd.concluidaPor = ''; upd.conclusao = ''; upd.motivoCancelamento = '';
      txt = 'Reabriu a demanda' + (texto(r.motivo, 300) ? ': ' + texto(r.motivo, 300) : ''); msg = d.numero + ' reaberta.';
      break;
    case 'atribuir':
      if (!dir.del) negar();
      if (dir.encerrada) throw falha('Reabra a demanda antes de mudar o responsável.');
      if (!r.responsavelUsuario) { upd.responsavel = ''; upd.responsavelUsuario = ''; upd.cienteEm = ''; txt = 'Tirou o responsável'; }
      else {
        const u = colaboradorAtivo(r.responsavelUsuario);
        if (u.usuario === d.responsavelUsuario) return 'O responsável continua o mesmo.';
        upd.responsavel = u.nome || u.usuario; upd.responsavelUsuario = u.usuario; upd.cienteEm = '';
        txt = 'Delegou a ' + upd.responsavel; msg = d.numero + ' delegada a ' + upd.responsavel + '.';
      }
      break;
    case 'editar':
      if (!dir.del) negar();
      Object.assign(upd, demCampos(r.dem || {}));
      txt = 'Editou os dados da demanda';
      break;
    case 'nota': {
      const p = conta.perms;
      if (!(dir.del || dir.minha || dir.livre || p.dem_ver)) negar();
      const n = texto(r.nota, 1000);
      if (!n) throw falha('Escreva a anotação.');
      txt = 'Anotou: ' + n; msg = 'Anotação registrada.';
      break;
    }
    case 'os': {
      if (!conta.perms.os_abrir || !(dir.del || dir.minha)) throw falha('Seu perfil não pode abrir OS a partir desta demanda.');
      if (dir.encerrada) throw falha('Esta demanda já está encerrada.');
      if (d.os) throw falha('Esta demanda já gerou a ' + d.os + '.');
      const o = osAbrir({
        titulo: d.titulo, local: d.local || 'A definir', categoria: d.categoria, prioridade: d.prioridade, prazo: d.prazo,
        descricao: d.descricao, solicitante: 'Demanda ' + d.numero,
        responsavelUsuario: conta.perms.os_gerenciar ? d.responsavelUsuario : ''
      }, conta);
      upd.os = o.numero;
      txt = 'Abriu a ' + o.numero + ' para esta demanda'; msg = o.numero + ' aberta a partir da ' + d.numero + '.';
      break;
    }
    default: throw falha('Ação desconhecida.');
  }
  upd.andamento = osAndamento(d.andamento, conta.nome, txt);
  gravar(t, upd, d._row);
  return msg;
}

// ---------- preventivas: demandas que se repetem sozinhas ----------

function isoParaUTC(s) { const p = String(s).split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
function utcParaIso(ms) { const d = new Date(ms); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
function somarDias(s, n) { return utcParaIso(isoParaUTC(s) + n * 864e5); }

// a n-ésima repetição a partir da data inicial (meses mantêm o dia; dia 31 vira o último dia do mês)
function repeticao(inicio, k, intervalo, unidade) {
  if (unidade === 'meses') {
    const p = String(inicio).split('-').map(Number);
    const mes = p[1] - 1 + k * intervalo;
    const ano = p[0] + Math.floor(mes / 12), m = ((mes % 12) + 12) % 12;
    const ultimo = new Date(Date.UTC(ano, m + 1, 0)).getUTCDate();
    return utcParaIso(Date.UTC(ano, m, Math.min(p[2], ultimo)));
  }
  return somarDias(inicio, k * intervalo * (unidade === 'semanas' ? 7 : 1));
}

function descRepeticao(intervalo, unidade) {
  const n = Number(intervalo) || 1;
  if (unidade === 'semanas') return n === 1 ? 'toda semana' : 'a cada ' + n + ' semanas';
  if (unidade === 'meses') return n === 1 ? 'todo mês' : n === 12 ? 'todo ano' : 'a cada ' + n + ' meses';
  return n === 1 ? 'todo dia' : 'a cada ' + n + ' dias';
}

// cria as demandas das preventivas vencidas; uma por preventiva, mesmo que o sistema tenha ficado dias sem uso
function gerarPreventivas(dia, soId) {
  const tp = tabela('prev');
  const prevs = linhas(tp).filter(p => (!soId || p.id === soId) && /^s/i.test(p.ativa) && /^\d{4}-\d{2}-\d{2}$/.test(p.proxima) && p.proxima <= dia);
  if (!prevs.length) return [];
  const td = tabela('dem');
  let n = demMaxNumero(linhas(td));
  const usuarios = lerUsuarios().lista;
  const criadas = [];
  prevs.forEach(p => {
    const intervalo = Math.max(1, Number(p.intervalo) || 1);
    const unidade = PREV_UNIDADES.indexOf(p.unidade) >= 0 ? p.unidade : 'meses';
    // última data prevista até hoje e a próxima depois de hoje
    let k = 0, data = p.proxima;
    while (k < 5000) { const prox = repeticao(p.proxima, k + 1, intervalo, unidade); if (prox > dia) break; k++; data = prox; }
    const proxima = repeticao(p.proxima, k + 1, intervalo, unidade);
    const u = usuarios.find(x => x.usuario === p.responsavelUsuario && x.ativo);
    const prazo = somarDias(data, Math.max(0, Number(p.prazoDias) || 0));
    const campos = {
      titulo: p.titulo, prioridade: OS_PRIORIDADES.indexOf(p.prioridade) >= 0 ? p.prioridade : 'Normal', prazo,
      local: p.local, categoria: p.categoria,
      descricao: (p.descricao ? p.descricao + '\n\n' : '') + 'Preventiva ' + p.numero + ', repete ' + descRepeticao(intervalo, unidade) + '. Data prevista: ' + data.split('-').reverse().join('/') + '.'
    };
    n++;
    const r = demGravarNova(td, n, campos, u || null, { nome: 'Sistema', usuario: '' }, { preventiva: p.id, preventivaNumero: p.numero });
    gravar(tp, { proxima, ultima: data, atualizadoEm: agora() }, p._row);
    criadas.push(r.numero);
  });
  return criadas;
}

function gerarPreventivasSePreciso() {
  const props = PropertiesService.getScriptProperties();
  const dia = hoje();
  if (props.getProperty('PREVENTIVAS_DIA') === dia) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    if (props.getProperty('PREVENTIVAS_DIA') === dia) return;
    gerarPreventivas(dia);
    props.setProperty('PREVENTIVAS_DIA', dia);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function salvarPreventiva(v, conta) {
  const titulo = texto(v.titulo, 120);
  if (!titulo) throw falha('Descreva a tarefa em poucas palavras.');
  const intervalo = Math.round(numero(v.intervalo));
  if (!(intervalo >= 1 && intervalo <= 365)) throw falha('Informe de quanto em quanto tempo a tarefa se repete.');
  const unidade = PREV_UNIDADES.indexOf(v.unidade) >= 0 ? v.unidade : 'meses';
  const prazoDias = v.prazoDias === '' || v.prazoDias == null ? 3 : Math.round(numero(v.prazoDias));
  if (!(prazoDias >= 0 && prazoDias <= 365)) throw falha('Prazo para fazer inválido.');
  const proxima = /^\d{4}-\d{2}-\d{2}$/.test(String(v.proxima || '')) ? String(v.proxima) : hoje();
  const resp = v.responsavelUsuario ? colaboradorAtivo(v.responsavelUsuario) : null;
  const campos = {
    titulo, descricao: texto(v.descricao, 3000), local: texto(v.local, 120), categoria: texto(v.categoria, 40),
    prioridade: OS_PRIORIDADES.indexOf(v.prioridade) >= 0 ? v.prioridade : 'Normal',
    responsavel: resp ? (resp.nome || resp.usuario) : '', responsavelUsuario: resp ? resp.usuario : '',
    intervalo, unidade, prazoDias, proxima, ativa: v.ativa === false ? 'Não' : 'Sim', atualizadoEm: agora()
  };
  const t = tabela('prev');
  const todas = linhas(t);
  let id = v.id, numeroPv;
  if (id) {
    const p = todas.find(x => x.id === id);
    if (!p) throw falha('Preventiva não encontrada. Atualize a página.');
    gravar(t, campos, p._row);
    numeroPv = p.numero;
  } else {
    const max = todas.reduce((m, p) => { const x = /(\d+)\s*$/.exec(p.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
    id = novoId('P');
    numeroPv = 'PV-' + ('00' + (max + 1)).slice(-3);
    gravar(t, Object.assign({ id, numero: numeroPv, criadaPor: conta.nome, criadaEm: agora() }, campos));
  }
  const fmtData = s => s.split('-').reverse().join('/');
  if (campos.ativa !== 'Sim') return 'Preventiva ' + numeroPv + ' salva e pausada.';
  const criadas = gerarPreventivas(hoje(), id);
  if (criadas.length) return 'Preventiva ' + numeroPv + ' salva. A demanda ' + criadas[0] + ' já foi criada para hoje.';
  return 'Preventiva ' + numeroPv + ' salva. A primeira demanda será criada em ' + fmtData(proxima) + '.';
}

function excluirPreventiva(id) {
  const t = tabela('prev');
  const p = linhas(t).find(x => x.id === id);
  if (!p) throw falha('Preventiva não encontrada.');
  t.sh.deleteRow(p._row);
  return 'Preventiva ' + p.numero + ' excluída. As demandas que ela já criou continuam na lista.';
}

// ---------- importação de contagem de inventário ----------

function importarContagem(r, conta) {
  // A planilha de inventário é uma contagem: atualiza o cadastro (nome, local, mínimo…) na hora,
  // mas nenhum saldo muda aqui. Cada diferença vira uma solicitação para a aprovação da Administração;
  // linhas iguais ao saldo viram Conferência. O histórico antigo da planilha só entra com a aprovação.
  // Ordem segura: tudo é validado e montado antes; depois cada aba é gravada de uma vez só.
  const entrada = Array.isArray(r.linhas) ? r.linhas : [];
  if (!entrada.length) throw falha('A planilha não tem itens para importar.');
  if (entrada.length > 5000) throw falha('A planilha tem itens demais (máximo 5.000).');
  const substituir = r.modo === 'substituir';
  const motivo = texto(r.motivo, 120) || 'Contagem de inventário';
  const setor = texto(r.setor) ? setorDe({ setor: r.setor }) : setoresDe(conta)[0];
  exigirSetor(conta, setor);
  const prefixo = prefixoSetor(setor);
  const ti = tabela('itens');
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();

  // a mesma planilha enviada de novo: pede confirmação (mesmo confirmada, nada é lançado duas vezes)
  const digesto = digestoImportacao(setor, r);
  const ja = props.getProperty('IMPORT_' + digesto);
  if (ja && !r.confirmarRepeticao) {
    let x; try { x = JSON.parse(ja); } catch (e) { x = {}; }
    const e = falha('Esta mesma planilha já foi importada em ' + (x.em || '?') + ' por ' + (x.porNome || '?') + ' (lote ' + (x.lote || '?') + '). ' +
      'Importar de novo não lança nada em dobro, mas cria outra rodada de conferências. Confirme se quer mesmo enviar outra vez.');
    e.codigo = 'importacao_repetida'; throw e;
  }

  const n = ti.sh.getLastRow() - 1;
  const vals = n > 0 ? ti.sh.getRange(2, 1, n, ti.ncol).getValues() : [];
  const I = ti.idx;
  const normNome = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const porCodigo = {}, porNome = {};
  const setorDaLinha = row => setorDe({ setor: row[I.setor] });
  vals.forEach((row, i) => {
    if (!String(row[I.id])) return;
    const c = String(row[I.codigo]).trim().toUpperCase(); if (c) porCodigo[c] = i;
    if (setorDaLinha(row) === setor) { const kn = normNome(row[I.nome]); (porNome[kn] = porNome[kn] || []).push(i); }
  });
  let maxNum = 0;
  vals.forEach(row => {
    const c = String(row[I.codigo]);
    if (prefixo !== 'MAN-' && c.toUpperCase().indexOf(prefixo) !== 0) return;
    const x = /(\d+)\s*$/.exec(c); if (x) maxNum = Math.max(maxNum, Number(x[1]));
  });
  entrada.forEach(l => {
    const c = texto(l.codigo, 30);
    if (!c || (prefixo !== 'MAN-' && c.toUpperCase().indexOf(prefixo) !== 0)) return;
    const x = /(\d+)\s*$/.exec(c); if (x) maxNum = Math.max(maxNum, Number(x[1]));
  });

  // histórico da planilha (compras e retiradas já anotadas lá): guardado na solicitação e lançado só na aprovação,
  // com a data original. Linha sem data válida (ou com data futura) fica de fora: data inventada faria o
  // mesmo lançamento parecer novo numa próxima importação.
  let histDataRuim = 0;
  const hist = (Array.isArray(r.historico) ? r.historico : []).slice(0, 5000).map(h => ({
    tipo: h.tipo === 'saida' ? 'saida' : 'entrada', data: dataHistorica(h.data), nome: texto(h.nome, 160), qtd: numero(h.qtd),
    fornecedor: texto(h.fornecedor, 120), nf: texto(h.nf, 40), valorUnit: h.valorUnit === '' || h.valorUnit == null ? '' : numero(h.valorUnit),
    responsavel: texto(h.responsavel, 80), destino: texto(h.destino, 120), obs: texto(h.obs, 250)
  })).filter(h => h.nome && h.qtd > 0 && isFinite(h.qtd)).filter(h => { if (h.data) return true; histDataRuim++; return false; });
  // cada linha do histórico vai para o item de mesmo nome; nome repetido na planilha = ambíguo, fica de fora
  const linhasPorNome = {};
  entrada.forEach((l, k) => { const kn = normNome(l.nome); (linhasPorNome[kn] = linhasPorNome[kn] || []).push(k); });
  const histPorLinha = {};
  let histSemItem = 0, histAmbiguo = 0;
  hist.forEach(h => {
    const ks = linhasPorNome[normNome(h.nome)];
    if (!ks) { histSemItem++; return; }
    if (ks.length > 1) { histAmbiguo++; return; }
    (histPorLinha[ks[0]] = histPorLinha[ks[0]] || []).push(h);
  });
  const movsAtuais = linhas(tabela('movs'));
  const lancados = contarLancados(movsAtuais);
  let histJaNoSistema = 0;
  const histNovo = (k, itemId) => {
    const todos = histPorLinha[k] || [];
    const faltam = histFaltante(itemId, todos, lancados);
    histJaNoSistema += todos.length - faltam.length;
    return faltam.map(h => { const c = Object.assign({}, h); delete c.nome; return c; });
  };
  const dia = hoje();
  const dataAjuste = /^\d{4}-\d{2}-\d{2}$/.test(String(r.dataAjuste || '')) && String(r.dataAjuste) < dia ? String(r.dataAjuste) : dia;

  const tc = tabela('cont'), conts = linhas(tc), ult = ultimasMovs(movsAtuais), numeroCT = proximoNumeroContagem(conts);
  const bloqItens = itensBloqueados();
  const lote = 'L' + Date.now().toString(36).toUpperCase();
  const usados = {}, usadosIdx = {}, novos = [], mantidas = {}, pedidos = [], conferencias = [], bloqueados = [];
  let criados = 0, atualizadosCad = 0, removidos = 0, histNaFila = 0, porNomeAchados = 0;
  const ag = agora();

  entrada.forEach((l, k) => {
    const nome = texto(l.nome, 160);
    if (!nome) throw falha('Linha ' + (k + 1) + ': falta o nome do item.');
    const qtd = numero(l.qtd === '' || l.qtd == null ? 0 : l.qtd);
    if (!(qtd >= 0)) throw falha('Linha ' + (k + 1) + ' (' + nome + '): quantidade inválida.');
    let codigo = texto(l.codigo, 30);
    const chave = codigo.toUpperCase();
    if (chave && usados[chave]) throw falha('O código ' + codigo + ' aparece mais de uma vez na planilha.');
    if (chave) usados[chave] = true;
    if (!chave && linhasPorNome[normNome(nome)].length > 1) throw falha('O item "' + nome + '" aparece mais de uma vez na planilha sem código. Ponha o código em cada linha (ou junte as linhas) para não contar o mesmo item duas vezes.');
    const campos = {
      nome, categoria: texto(l.categoria, 60), tipoItem: texto(l.tipoItem, 40), unidade: texto(l.unidade, 15),
      local: texto(l.local, 60), obs: texto(l.obs, 300)
    };
    const minimo = l.minimo === '' || l.minimo == null ? null : numero(l.minimo);
    let i = chave ? porCodigo[chave] : undefined;
    // sem código: reconhece o item já cadastrado com o mesmo nome no setor (reimportação da mesma planilha)
    if (i === undefined && !chave) {
      const mesmos = porNome[normNome(nome)] || [];
      if (mesmos.length > 1) throw falha('Há ' + mesmos.length + ' itens chamados "' + nome + '" no cadastro. Ponha o código na linha ' + (k + 1) + ' da planilha.');
      if (mesmos.length === 1) { i = mesmos[0]; porNomeAchados++; }
    }
    if (i !== undefined && setorDaLinha(vals[i]) !== setor) {
      throw falha('O código ' + codigo + ' já é usado por "' + vals[i][I.nome] + '" no setor ' + setorDaLinha(vals[i]) + '. Mude o código na planilha.');
    }
    if (i !== undefined) {
      if (usadosIdx[i]) throw falha('O item "' + vals[i][I.nome] + '" aparece mais de uma vez na planilha (linha ' + (k + 1) + ').');
      usadosIdx[i] = true;
      const row = vals[i];
      mantidas[i] = true;
      Object.keys(campos).forEach(c => { if (campos[c]) row[I[c]] = campos[c]; });
      if (minimo !== null && minimo >= 0) row[I.minimo] = minimo;
      row[I.atualizadoEm] = ag; atualizadosCad++;
      const itx = { id: String(row[I.id]), codigo: String(row[I.codigo]), nome: String(row[I.nome]), unidade: String(row[I.unidade]), qtd: Number(row[I.qtd]) || 0, setor };
      if (bloqItens[itx.id]) { bloqueados.push(itx.nome + ' (bloqueado para revisão)'); return; }
      const pend = contagemPendenteDoItem(conts, itx.id);
      if (pend) { bloqueados.push(itx.nome + ' (' + pend.numero + ')'); return; }
      const hn = histNovo(k, itx.id);
      if (arred(qtd) === arred(itx.qtd) && !hn.length) { conferencias.push(movConferencia(itx, qtd, conta, 'Importação de inventário: ' + motivo)); return; }
      histNaFila += hn.length;
      pedidos.push(novaSolicitacao(itx, qtd, motivo, conta, { numero: numeroCT, lote, origem: 'Importação', ultimaMov: ult[itx.id] || '', extra: hn.length ? { hist: hn } : null }));
    } else {
      if (!conta.perms.itens_cadastrar) throw falha('Seu perfil não pode cadastrar itens novos ("' + nome + '").');
      if (!codigo) { maxNum++; codigo = prefixo + ('000' + maxNum).slice(prefixo === 'MAN-' ? -4 : -3); }
      const row = new Array(ti.ncol).fill('');
      const id = novoId('I');
      row[I.id] = id; row[I.codigo] = codigo;
      Object.keys(campos).forEach(c => { row[I[c]] = campos[c]; });
      if (!row[I.unidade]) row[I.unidade] = 'un';
      row[I.qtd] = 0; row[I.minimo] = minimo !== null && minimo >= 0 ? minimo : 0;
      row[I.criadoEm] = ag; row[I.atualizadoEm] = ag; row[I.setor] = setor;
      novos.push(row); criados++;
      const itx = { id, codigo, nome, unidade: row[I.unidade], qtd: 0, setor };
      const hn = histNovo(k, id);
      if (qtd === 0 && !hn.length) return;
      histNaFila += hn.length;
      pedidos.push(novaSolicitacao(itx, qtd, motivo + ' (item novo)', conta, { numero: numeroCT, lote, origem: 'Importação · item novo', ultimaMov: '', extra: { novo: true, hist: hn, dataAjuste } }));
    }
  });

  // modo substituir: item do setor fora da lista sai do cadastro; se ainda tem saldo, primeiro vai para aprovação zerar
  let final = vals;
  if (substituir) {
    final = [];
    vals.forEach((row, i) => {
      if (mantidas[i] || !String(row[I.id]) || setorDaLinha(row) !== setor) { if (String(row[I.id])) final.push(row); return; }
      const q = Number(row[I.qtd]) || 0;
      const itx = { id: String(row[I.id]), codigo: String(row[I.codigo]), nome: String(row[I.nome]), unidade: String(row[I.unidade]), qtd: q, setor };
      const pend = contagemPendenteDoItem(conts, itx.id);
      if (q === 0 && !pend && !bloqItens[itx.id]) { removidos++; return; }
      final.push(row);
      if (bloqItens[itx.id]) { bloqueados.push(itx.nome + ' (bloqueado para revisão)'); return; }
      if (pend) { bloqueados.push(itx.nome + ' (' + pend.numero + ')'); return; }
      pedidos.push(novaSolicitacao(itx, 0, 'Fora da lista do inventário: ' + motivo, conta, { numero: numeroCT, lote, origem: 'Importação · fora da lista', ultimaMov: ult[itx.id] || '', extra: { remover: true } }));
    });
  }
  if (pedidos.length) exigirContagem(conta);
  final = final.concat(novos);

  // a partir daqui, gravações. A marca avisa a verificação automática se o script parar no meio.
  props.setProperty('IMPORT_ANDAMENTO', JSON.stringify({ lote, setor, por: conta.usuario, porNome: conta.nome, em: agoraSeg() }));

  // cópia de segurança da aba Itens antes de qualquer mudança (protegida contra edição)
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH.mm.ss');
  let nomeCopia = 'Itens (cópia de ' + stamp + ')', k2 = 2;
  while (ss.getSheetByName(nomeCopia)) nomeCopia = 'Itens (cópia de ' + stamp + ' ' + (k2++) + ')';
  const copia = ti.sh.copyTo(ss).setName(nomeCopia).hideSheet();
  protegerSoDono(copia, 'Cópia de segurança do Pier Gestão: não editar');

  // grava o cadastro (saldos iguais aos de antes; itens novos com 0) numa única escrita, sem apagar antes:
  // as linhas que sobram no fim ficam em branco na mesma operação
  const total = Math.max(n, final.length);
  if (total > 0) {
    const vazias = new Array(total - final.length).fill(null).map(() => new Array(ti.ncol).fill(''));
    const rng = ti.sh.getRange(2, 1, total, ti.ncol);
    const fmts = final.concat(vazias).map(() => ti.def.cols.reduce((f, c) => { f[ti.idx[c[0]]] = ti.def.num.indexOf(c[0]) >= 0 ? 'General' : '@'; return f; }, new Array(ti.ncol).fill('@')));
    rng.setNumberFormats(fmts);
    rng.setValues(final.map(row => row.map((v, j) => {
      const c = ti.def.cols.find(x => ti.idx[x[0]] === j);
      if (c && ti.def.num.indexOf(c[0]) >= 0) return v === '' ? '' : Number(v);
      return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : String(v);
    })).concat(vazias));
  }
  if (FALHA_SIMULADA === 'import_apos_itens') throw new Error('Falha simulada depois de gravar os itens');
  gravarVarias(tc, pedidos);
  if (FALHA_SIMULADA === 'import_apos_pedidos') throw new Error('Falha simulada depois das solicitações');
  gravarVarias(tabela('movs'), conferencias);
  pedidos.forEach(c => auditarContagem(conta, 'Contagem enviada para aprovação', c, 'importação de inventário, lote ' + lote));
  props.setProperty('IMPORT_' + digesto, JSON.stringify({ lote, em: agora(), porNome: conta.nome }));
  props.deleteProperty('IMPORT_ANDAMENTO');
  auditar(conta, 'Importou inventário', 'setor ' + setor + '; lote ' + lote + '; ' + pedidos.length + ' ajuste(s) para aprovação; ' + conferencias.length + ' conferido(s); ' + criados + ' item(ns) novo(s) com saldo 0; ' + removidos + ' removido(s) com saldo 0; ' +
    histNaFila + ' lançamento(s) do histórico na fila; ' + histJaNoSistema + ' já no sistema; ' + histDataRuim + ' sem data válida; ' + histAmbiguo + ' ambíguo(s); cópia ' + nomeCopia + (r.confirmarRepeticao && ja ? '; reimportação confirmada' : ''));
  AUDIT_FEITO = true;

  const partes = [];
  if (pedidos.length) partes.push(pedidos.length + (pedidos.length === 1 ? ' ajuste enviado' : ' ajustes enviados') + ' para a aprovação da Administração');
  if (conferencias.length) partes.push(conferencias.length + ' conferido' + (conferencias.length === 1 ? '' : 's') + ' sem diferença');
  if (criados) partes.push(criados + ' ite' + (criados === 1 ? 'm novo cadastrado' : 'ns novos cadastrados') + ' com estoque 0');
  if (porNomeAchados) partes.push(porNomeAchados + ' reconhecido' + (porNomeAchados === 1 ? '' : 's') + ' pelo nome (linha sem código)');
  if (removidos) partes.push(removidos + ' saíram do cadastro (já estavam zerados)');
  if (histNaFila) partes.push(histNaFila + ' lançamentos do histórico da planilha aguardando a aprovação');
  if (histJaNoSistema) partes.push(histJaNoSistema + ' lançamentos do histórico já estavam no sistema (não repetidos)');
  if (histSemItem) partes.push(histSemItem + ' linhas do histórico sem item correspondente (não lançadas)');
  if (histAmbiguo) partes.push(histAmbiguo + ' linhas do histórico com nome de item repetido na planilha (não lançadas)');
  if (histDataRuim) partes.push(histDataRuim + ' linhas do histórico sem data válida ou com data futura (não lançadas)');
  if (bloqueados.length) partes.push(bloqueados.length + ' com ajuste pendente ou bloqueados, não enviados de novo: ' + bloqueados.slice(0, 5).join(', '));
  return 'Inventário de ' + setor + ': ' + (partes.join('; ') || 'nada mudou') + '. Nenhum saldo foi alterado. Cópia da lista anterior na aba oculta "' + nomeCopia + '".';
}

// data de lançamento antigo: só aceita dia que existe no calendário, de 2000 até hoje
function dataHistorica(s) {
  const t = String(s || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  if (utcParaIso(isoParaUTC(t)) !== t) return '';
  return t >= '2000-01-01' && t <= hoje() ? t : '';
}
// impressão digital da planilha importada (mesmo setor, mesmas linhas e mesmo histórico, qualquer que seja o modo)
function digestoImportacao(setor, r) {
  const txt = JSON.stringify([setor, r.linhas || [], r.historico || []]);
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt);
  return d.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('').slice(0, 24);
}
// quantas vezes cada lançamento (item, tipo, data, quantidade) já existe no histórico do sistema,
// venha da planilha antiga ou de registro feito no sistema; estornados não contam
function chaveHist(itemId, tipo, data, qtd) { return [itemId, tipo, String(data).slice(0, 10), arred(Number(qtd))].join('|'); }
function contarLancados(movs) {
  const n = {};
  movs.forEach(m => {
    if (m.estornado || (m.tipo !== 'entrada' && m.tipo !== 'saida')) return;
    const k = chaveHist(m.itemId, m.tipo, m.data, m.qtd); n[k] = (n[k] || 0) + 1;
  });
  return n;
}
// fica só o que ainda falta: 2 compras iguais no mesmo dia na planilha e 1 no sistema = entra 1
function histFaltante(itemId, hist, lancados) {
  const vistos = {};
  return (hist || []).filter(h => { const k = chaveHist(itemId, h.tipo, h.data, h.qtd); vistos[k] = (vistos[k] || 0) + 1; return vistos[k] > (lancados[k] || 0); });
}

// Rode esta função uma vez pelo editor (Executar) para autorizar o acesso ao Drive das fotos.
// Perfil "Limpeza" e um login único para a equipe de limpeza (criados uma vez só)
function garantirLimpeza() {
  const perfis = lerPerfis();
  let msg = '';
  if (!perfis['Limpeza']) {
    const perms = {}; PADRAO_LIMPEZA.forEach(k => { perms[k] = true; });
    salvarPerfil({ nome: 'Limpeza', perms });
    msg += ' Perfil Limpeza criado.';
  }
  const U = lerUsuarios();
  if (!U.lista.some(u => u.perfil === 'Limpeza') && !U.lista.some(u => u.usuario === 'limpeza')) {
    const senha = senhaAleatoria();
    salvarUsuario({ u: { usuario: 'limpeza', nome: 'Equipe de Limpeza', senha, perfil: 'Limpeza', ativo: true } }, { usuario: '' });
    msg += ' Login da limpeza: usuário "limpeza", senha ' + senha + '.';
  }
  return msg;
}

function autorizar() {
  pastaFotos();
  pastaNF();
  tabela('movs');
  tabela('os');
  tabela('dem');
  tabela('prev');
  pendLista();
  tabela('acessos');
  abaPerfis();
  tabela('itens');
  tabela('audit');
  tabela('cont');
  const limpeza = garantirLimpeza() + garantirSindico();
  const ids = garantirIdsUsuarios(true);
  // primeiro retrato dos saldos: a partir daqui, saldo mudado fora do sistema bloqueia o item
  if (!lerRetrato()) atualizarRetrato();
  const senhas = migrarSenhas();
  protegerAbas();
  const arquivos = verificarArquivos();
  Logger.log('Pronto: pastas de fotos e de notas fiscais, abas OS, Demandas, Preventivas e Pendencias, setores e permissões verificadas.' + limpeza);
  Logger.log('Segurança: ' + senhas + ' ' + arquivos + (ids ? ' ' + ids + ' conta(s) receberam identificador fixo.' : ''));
  Logger.log('Verificação automática: ' + (ScriptAppTemAcionador() ? 'acionador instalado.' : 'acionador NÃO instalado (instalarRecuperacao só com autorização; na planilha oficial exige LIBERAR_ACIONADOR_OFICIAL = sim).'));
}

// ---------- controle de pendências (menu Administração) ----------

const PEND_SECOES = [
  'Cotações e compras – aguardando entrega',
  'Cotações e compras – a cotar',
  'Cotações e compras – aguardando síndico',
  'Governança / administração',
  'Manutenção / limpeza / jardinagem',
  'Outras demandas da administração'
];
const PEND_CRITICIDADE = ['Baixa', 'Média', 'Alta'];
const PEND_STATUS = ['Pendente', 'A cotar', 'Em andamento', 'Aguardando entrega', 'Aguardando síndico', 'Concluído'];

// Lista do Sr. Fernando (e-mail de 13/10/2026), com os status do relatório de 14/10.
// Entra na aba Pendencias uma única vez, na primeira vez que a aba é aberta.
// [seção (posição em PEND_SECOES), nº, pendência, situação, observação]
const PEND_INICIAIS = [
  [0, "1", "Uniformes equipes Pier", "Concluído", ""],
  [0, "2", "Capa TV para salinha e gourmet", "Concluído", ""],
  [0, "3", "Carioca Geradores vs Trocar Diesel", "Em andamento", ""],
  [0, "4", "Execução Maçaneta externa, Portões Piscina e Entradas dos blocos (Gil)", "Em andamento", "Previsão: quinta/sexta"],
  [0, "5", "Entrega das Pedras de granito quebradas", "Em andamento", "Em confecção"],
  [0, "6", "Bomba do chafariz", "Aguardando entrega", "Compra concluída"],
  [1, "1", "8 novas lixeiras para a área da piscina", "A cotar", "Comprar após 13/10"],
  [1, "2", "Lixeira grande com tampa para o lado da Máquina de Gelo", "A cotar", ""],
  [1, "3", "3 Cotações para caixa de gordura", "A cotar", "Obter 3 cotações"],
  [1, "4", "Tampa redonda para os corrimãos de alumínio do condomínio", "A cotar", ""],
  [1, "5", "Tampas para as coberturas", "A cotar", ""],
  [1, "6", "Refletores para a Quadra de areia", "A cotar", ""],
  [1, "7", "Novo Ar-condicionado para Academia: 30.000 BTUs Inverter", "A cotar", ""],
  [1, "8", "Cortina de Ar para academia", "A cotar", ""],
  [1, "9", "Tinta marrom para o deck", "A cotar", ""],
  [1, "10", "Repelente para dispensers", "A cotar", ""],
  [1, "11", "Luminária para área de lavagem automotiva", "A cotar", ""],
  [1, "12", "Tinta adequada para pintura da garagem", "A cotar", "Definir especificação"],
  [2, "1", "Cotar Puxadores e troca dos trilhos e carrinhos das esquadrias da academia e Gourmet", "Aguardando síndico", ""],
  [2, "2", "Placas de Sinalização de Aço", "Aguardando síndico", ""],
  [2, "3", "Azuir x Troca da tela dos portões", "Aguardando síndico", ""],
  [2, "4", "Azuir x Troca dos LEDs", "Aguardando síndico", ""],
  [2, "5", "Azuir x Pintura da Base", "Aguardando síndico", ""],
  [3, "1", "SecuryLarm vs Sirenes, Placas e Novas Câmeras", "Em andamento", ""],
  [3, "2", "Investigação Caso Ovo/AR", "Em andamento", ""],
  [3, "3", "Implementar check-list de curta temporada (Airbnb)", "Pendente", ""],
  [3, "4", "Instalar todas as placas pendentes", "Em andamento", ""],
  [3, "5", "Laudo de vazamento das garagens e apartamentos", "Pendente", "Verificar com o Eng. Marcos Mendes"],
  [3, "6", "Ressarcimentos Franco Vieira", "Pendente", ""],
  [3, "7", "Saída Garagem: Sinaleira", "Em andamento", ""],
  [3, "8", "Saída Garagem: Placas de aviso aos pedestres", "Em andamento", ""],
  [3, "9", "Saída Garagem: Espelho 180º", "A cotar", ""],
  [3, "10", "Mastermed/Atenta Saúde – Rescindir Contrato", "Em andamento", ""],
  [3, "11", "Placas imantadas para elevadores", "Em andamento", ""],
  [3, "12", "Instalar novas películas das esteiras", "Em andamento", ""],
  [3, "13", "Revisão Geral dos Ombrelones", "Em andamento", ""],
  [3, "14", "Contagem de ombrelones aptos para uso", "Em andamento", ""],
  [3, "15", "Novas placas: Ponto de Recarga Elétrica / Fezes do cão na lixeira / Guardar rodo após o uso", "Em andamento", ""],
  [3, "16", "Notificação Alan – Portão Quebrado – Ressarcimento", "Em andamento", ""],
  [3, "17", "Casos de Infiltração", "Em andamento", "Acompanhamento individual nos subitens"],
  [3, "17.1", "Infiltração – Érica", "Em andamento", ""],
  [3, "17.2", "Infiltração – Marcos", "Em andamento", ""],
  [3, "17.3", "Infiltração – Alan", "Em andamento", "Já notificado"],
  [3, "17.4", "Infiltração – Dona Mônica", "Pendente", "Aguardando confirmação da data para refazer a pintura do teto"],
  [3, "17.5", "Infiltração – Fernanda (Bloco 7)", "Em andamento", ""],
  [3, "17.6", "Infiltração – Dani (Bloco 5)", "Concluído", ""],
  [3, "18", "Regularização da piscina", "Em andamento", ""],
  [3, "19", "Aplicar Check-List diário do supervisor e Auxiliar", "Em andamento", ""],
  [3, "20", "Regularizar a conta do Mercado Livre", "Pendente", ""],
  [3, "21", "Leila vs Kombis e Contrato de Locação da unidade", "Pendente", "Pendente de definição"],
  [3, "22", "Náutica vs Lista de associados", "Pendente", ""],
  [3, "23", "Sergio de Moura vs infiltração varanda", "Pendente", ""],
  [4, "", "Vazamento jardim entre blocos 5 e 3-4", "Pendente", ""],
  [4, "1", "Instalar placas da SecuryLarm", "Pendente", "Definição dos ambientes"],
  [4, "2", "Finalizar pintura do Muro saída de Carros", "Em andamento", ""],
  [4, "3", "Pintura da Demarcação das vagas da Garagem, incluindo área de visitantes", "Em andamento", "Haverá nova alteração de cor"],
  [4, "4", "Calhas na garagem vazando", "Pendente", ""],
  [4, "5", "Rejuntes e rebocos descascando na Garagem", "Em andamento", "Raspagem já iniciada"],
  [4, "6", "Vedação dos pontos de buraco do muro de pedra do 5/101", "Em andamento", ""],
  [4, "7", "Vedação das juntas de dilatação horizontal ao longo do 5/101", "Em andamento", ""],
  [4, "8", "Vedação das juntas de dilatação no condomínio", "Pendente", ""],
  [4, "9", "Avaliar pragas nas plantas e na árvore grande do jardim", "Concluído", ""],
  [4, "10", "Refazer paredes e rodapés nas entradas dos blocos", "Em andamento", ""],
  [4, "11", "Limpar limo no meio-fio ao longo dos jardins", "Em andamento", ""],
  [4, "12", "Limpar Tampo do Futmesa", "Pendente", "A cola não sai; substituir o adesivo"],
  [4, "13", "Verificar corrosão da estrutura do deck", "Concluído", ""],
  [4, "14", "Instalar pingadeiras nas pedras das fachadas", "Pendente", ""],
  [4, "15", "Iluminação para as palmeiras externas", "Em andamento", "Faltam apenas os blocos 1 e 2"],
  [4, "16", "Manutenção da Academia – Equipamentos quebrados", "Pendente", "Verificar responsabilidade da Residence Fitness"],
  [4, "17", "Instalar novos refletores na área da lavagem automotiva com disjuntor/interruptor dedicado", "Aguardando entrega", ""],
  [4, "18", "Refazer Quadro da Sauna", "Pendente", ""],
  [4, "19", "Terminar de raspar piso da área comum com o disco de aço", "Em andamento", "Concluído nas áreas atendidas; verificar outros pontos"],
  [4, "20", "Força-tarefa de organização geral da garagem: fiação solta, estruturas obsoletas, lixo/entulho, limpeza de tubulações, grades e esquadrias", "Em andamento", "Limpeza executada; falta revisão geral"],
  [4, "21", "Pintura dos tubos PVC abaixo do deck de marrom", "Pendente", "Aguardando compra da tinta"]
];

function pendLista() {
  const t = tabela('pend');
  let lista = linhas(t);
  if (!lista.length && pendSemear(t)) lista = linhas(t);
  if (pendNumerarSemNumero(t, lista)) lista = linhas(t);
  return lista
    .map(p => ({ id: p.id, secao: p.secao, numero: p.numero, titulo: p.titulo, status: p.status, responsavel: p.responsavel,
      prazo: p.prazo, obs: p.obs, ordem: p.ordem, atualizadoEm: p.atualizadoEm, atualizadoPor: p.atualizadoPor,
      criadaPor: p.criadaPor, origem: p.origem, vistaEm: p.vistaEm, vistaPor: p.vistaPor, criticidade: p.criticidade,
      tipo: p.tipo, frequencia: p.frequencia, ultimaVez: p.ultimaVez, execucoes: p.execucoes, pai: p.pai,
      concluidoEm: p.concluidoEm, prazoDefinidoEm: p.prazoDefinidoEm, prazoDefinidoPor: p.prazoDefinidoPor }))
    .sort((a, b) => (Number(a.ordem) || 1e9) - (Number(b.ordem) || 1e9));
}

// Itens principais sem número (como o "Vazamento no jardim", que veio solto no e-mail do síndico):
// a seção é renumerada em sequência, na ordem da lista, e os subitens acompanham o novo número.
function pendNumerarSemNumero(t, lista) {
  const principais = lista.filter(p => !p.pai && String(p.numero).indexOf('.') < 0);
  const secoes = PEND_SECOES.filter(s => principais.some(p => p.secao === s && !String(p.numero).trim()));
  if (!secoes.length) return false;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    secoes.forEach(s => {
      const daSecao = lista.filter(p => p.secao === s);
      const itens = principais.filter(p => p.secao === s).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
      itens.forEach((p, i) => {
        const novo = String(i + 1);
        const filhos = filhosDe(daSecao, p);
        if (String(p.numero) !== novo) gravar(t, { numero: novo }, p._row);
        filhos.forEach(f => {
          const suf = String(f.numero).indexOf('.') >= 0 ? String(f.numero).split('.').slice(1).join('.') : '';
          if (suf && String(f.numero) !== novo + '.' + suf) gravar(t, { numero: novo + '.' + suf, pai: p.id }, f._row);
        });
      });
    });
    SpreadsheetApp.flush();
    return true;
  } finally {
    lock.releaseLock();
  }
}

function pendSemear(t) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('PEND_SEMEADA')) return false;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (props.getProperty('PEND_SEMEADA') || t.sh.getLastRow() > 1) return false;
    const quando = '2026-10-14 06:50';
    const conta = {};
    const vals = PEND_INICIAIS.map((x, i) => {
      conta[x[0]] = (conta[x[0]] || 0) + 1;
      const o = { id: 'pd' + ('00' + (i + 1)).slice(-3), secao: PEND_SECOES[x[0]], numero: x[1], titulo: x[2], status: x[3],
        responsavel: '', prazo: '', obs: x[4], ordem: x[0] * 1000 + conta[x[0]], atualizadoEm: quando, atualizadoPor: 'Relatório de 14/10',
        criadaPor: '', origem: '', vistaEm: '', vistaPor: '', criticidade: '', tipo: '', frequencia: '', ultimaVez: '', execucoes: '', pai: '' };
      const r = new Array(t.ncol).fill('');
      t.def.cols.forEach(([k]) => { r[t.idx[k]] = k === 'ordem' ? o[k] : (o[k] === undefined || o[k] === null ? '' : String(o[k])); });
      return r;
    });
    const rng = t.sh.getRange(2, 1, vals.length, t.ncol);
    rng.setNumberFormat('@');
    t.sh.getRange(2, t.idx.ordem + 1, vals.length, 1).setNumberFormat('General');
    rng.setValues(vals);
    props.setProperty('PEND_SEMEADA', hoje());
    SpreadsheetApp.flush();
    return true;
  } finally {
    lock.releaseLock();
  }
}

// frequências das tarefas constantes: [nome, quantidade, unidade]
const PEND_FREQ = [['Diária', 1, 'dias'], ['Semanal', 7, 'dias'], ['Quinzenal', 15, 'dias'], ['Mensal', 1, 'meses'],
  ['Bimestral', 2, 'meses'], ['Trimestral', 3, 'meses'], ['Semestral', 6, 'meses'], ['Anual', 12, 'meses']];

function proximaData(base, frequencia) {
  const f = PEND_FREQ.find(x => x[0] === frequencia) || PEND_FREQ[3];
  if (f[2] === 'dias') return somarDias(base, f[1]);
  const p = String(base).split('-').map(Number);
  const alvo = new Date(Date.UTC(p[0], p[1] - 1 + f[1], 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(p[2], ultimoDia));
  return utcParaIso(alvo.getTime());
}

// subitens: os marcados com "Subitem de" e os numerados como N.k na mesma seção
function filhosDe(todas, pai) {
  const pref = pai.numero ? String(pai.numero) + '.' : null;
  return todas.filter(p => p.id !== pai.id && (p.pai === pai.id || (pref && p.secao === pai.secao && !p.pai && String(p.numero).indexOf(pref) === 0)));
}

function pendSalvar(v, conta) {
  const t = tabela('pend');
  const todas = linhas(t);
  const id = texto(v.id, 40);
  const atual = id ? todas.find(p => p.id === id) : null;
  if (id && !atual) throw falha('Esta pendência não existe mais. Atualize a tela.');
  const sindico = ehSindico(conta);
  const obj = { atualizadoEm: agora(), atualizadoPor: conta.nome };
  // o que o síndico inclui fica destacado para a administração até alguém da equipe dar ciente ou mexer nele
  if (atual && atual.origem === 'Síndico' && !atual.vistaEm && !sindico) { obj.vistaEm = agora(); obj.vistaPor = conta.nome; }
  if (atual && v.ciente) {
    if (sindico) throw falha('O ciente é dado pela administração.');
    if (!obj.vistaEm) return 'Esta pendência já estava vista.';
    gravar(t, { vistaEm: obj.vistaEm, vistaPor: obj.vistaPor }, atual._row);
    return 'Ciente registrado.';
  }
  // tarefa constante: registra a execução e agenda a próxima
  if (atual && v.feito) {
    if (atual.tipo !== 'Constante') throw falha('Só tarefas constantes têm execução registrada.');
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(v.data || '')) ? String(v.data) : hoje();
    obj.ultimaVez = dia;
    obj.prazo = proximaData(dia, atual.frequencia);
    obj.execucoes = [dia + ' ' + conta.nome].concat(String(atual.execucoes || '').split(';').map(s => s.trim()).filter(Boolean)).slice(0, 30).join('; ');
    gravar(t, obj, atual._row);
    return 'Feito em ' + dia.split('-').reverse().slice(0, 2).join('/') + '. Próxima: ' + obj.prazo.split('-').reverse().slice(0, 2).join('/') + '.';
  }
  if ('titulo' in v) { obj.titulo = texto(v.titulo, 300); if (!obj.titulo) throw falha('Descreva a pendência.'); }
  if ('status' in v) { if (PEND_STATUS.indexOf(v.status) < 0) throw falha('Situação inválida.'); obj.status = v.status; }
  if ('responsavel' in v) obj.responsavel = texto(v.responsavel, 60);
  if ('criticidade' in v) { if (v.criticidade && PEND_CRITICIDADE.indexOf(v.criticidade) < 0) throw falha('Criticidade inválida.'); obj.criticidade = v.criticidade || ''; }
  // prazo de pendência pontual: depois de definido fica bloqueado (correção só direto na planilha).
  // Na tarefa constante o prazo é a próxima execução e continua livre.
  const constFinal = 'tipo' in v ? v.tipo === 'Constante' : !!(atual && atual.tipo === 'Constante');
  if ('prazo' in v) {
    obj.prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(v.prazo || '')) ? String(v.prazo) : '';
    const prazoAntes = atual ? String(atual.prazo || '').slice(0, 10) : '';
    if (atual && atual.tipo !== 'Constante' && prazoAntes && obj.prazo !== prazoAntes) {
      if (constFinal && !obj.prazo) delete obj.prazo; // virou tarefa constante: a próxima execução é calculada abaixo
      else throw falha('O prazo desta pendência está bloqueado (' + prazoAntes.split('-').reverse().join('/') + '). Para corrigir, altere direto na aba Pendencias da planilha.');
    }
    if (!constFinal && obj.prazo && (!atual || !prazoAntes || atual.tipo === 'Constante')) { obj.prazoDefinidoEm = agora(); obj.prazoDefinidoPor = conta.nome; }
  }
  if ('concluidoEm' in v) {
    obj.concluidoEm = /^\d{4}-\d{2}-\d{2}$/.test(String(v.concluidoEm || '')) ? String(v.concluidoEm) : '';
    if (obj.concluidoEm && obj.concluidoEm > hoje()) throw falha('A data de conclusão não pode ser depois de hoje.');
  }
  if ('obs' in v) obj.obs = texto(v.obs, 1000);
  if ('tipo' in v) obj.tipo = v.tipo === 'Constante' ? 'Constante' : '';
  if ('frequencia' in v) { if (v.frequencia && !PEND_FREQ.some(f => f[0] === v.frequencia)) throw falha('Frequência inválida.'); obj.frequencia = v.frequencia || ''; }
  const tipoFinal = 'tipo' in obj ? obj.tipo : (atual ? atual.tipo : '');
  if (tipoFinal === 'Constante') {
    const freqFinal = obj.frequencia || (!('frequencia' in obj) && atual && atual.frequencia) || 'Mensal';
    if (freqFinal !== (atual && atual.frequencia)) obj.frequencia = freqFinal;
    const prazoFinal = 'prazo' in obj ? obj.prazo : (atual ? atual.prazo : '');
    if (!prazoFinal) obj.prazo = proximaData(hoje(), freqFinal);
    if (!atual || atual.status === 'Concluído' || obj.status === 'Concluído') obj.status = 'Em andamento';
    if (atual && atual.concluidoEm) obj.concluidoEm = '';
    else delete obj.concluidoEm;
  } else {
    // data de conclusão: entra sozinha ao concluir, some ao reabrir; preenchida à mão, conclui
    const stAntes = atual ? atual.status : '';
    if (obj.concluidoEm && (obj.status || stAntes) !== 'Concluído') obj.status = 'Concluído';
    if (obj.status === 'Concluído' && stAntes !== 'Concluído' && !('concluidoEm' in obj)) obj.concluidoEm = hoje();
    if (obj.status && obj.status !== 'Concluído' && atual && atual.concluidoEm) obj.concluidoEm = '';
  }

  if (atual) {
    // mudança de seção: ganha o próximo número da seção nova e leva os subitens junto
    if ('secao' in v && v.secao !== atual.secao) {
      if (PEND_SECOES.indexOf(v.secao) < 0) throw falha('Seção inválida.');
      if (atual.pai || String(atual.numero).indexOf('.') >= 0) throw falha('Um subitem fica sempre na seção do item principal.');
      const filhos = filhosDe(todas, atual);
      const destino = todas.filter(p => p.secao === v.secao);
      const nums = destino.map(p => parseInt(String(p.numero).split('.')[0], 10)).filter(n => !isNaN(n));
      const novoNum = String((nums.length ? Math.max.apply(null, nums) : 0) + 1);
      const ordem = Math.max.apply(null, [PEND_SECOES.indexOf(v.secao) * 1000].concat(destino.map(p => Number(p.ordem) || 0))) + 1;
      Object.assign(obj, { secao: v.secao, numero: novoNum, ordem });
      filhos.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)).forEach((f, i) => {
        const suf = String(f.numero).indexOf('.') >= 0 ? String(f.numero).split('.').slice(1).join('.') : String(i + 1);
        gravar(t, { secao: v.secao, numero: novoNum + '.' + suf, ordem: ordem + (i + 1) / 100, pai: atual.id }, f._row);
      });
    }
    gravar(t, obj, atual._row);
    if (obj.secao) return 'Movida para ' + obj.secao + ' como nº ' + obj.numero + '.';
    const dm = d => String(d).split('-').reverse().slice(0, 2).join('/');
    if (obj.prazoDefinidoEm && atual.tipo !== 'Constante' && !constFinal) return 'Prazo ' + dm(obj.prazo) + ' definido e bloqueado.';
    if ('concluidoEm' in v && obj.concluidoEm) return 'Concluída em ' + dm(obj.concluidoEm) + '.';
    return obj.status && 'status' in v ? 'Situação: ' + obj.status + '.' : 'criticidade' in v && Object.keys(v).length <= 2 ? 'Criticidade: ' + (obj.criticidade || 'sem definição') + '.' : 'Salvo.';
  }

  if (!obj.titulo) throw falha('Descreva a pendência.');
  const comuns = { criadaPor: conta.nome, origem: sindico ? 'Síndico' : '', vistaEm: '', vistaPor: '', execucoes: '', ultimaVez: '' };
  // subitem de uma pendência existente
  if (v.pai) {
    const pai = todas.find(p => p.id === texto(v.pai, 40));
    if (!pai) throw falha('A pendência principal não existe mais. Atualize a tela.');
    if (pai.pai || String(pai.numero).indexOf('.') >= 0) throw falha('Não é possível criar subitem de um subitem.');
    const filhos = filhosDe(todas, pai);
    const sufs = filhos.map(f => parseInt(String(f.numero).split('.').pop(), 10)).filter(n => !isNaN(n));
    const numero = pai.numero ? pai.numero + '.' + ((sufs.length ? Math.max.apply(null, sufs) : 0) + 1) : '';
    const daSecao = todas.filter(p => p.secao === pai.secao).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
    const fim = Math.max.apply(null, [Number(pai.ordem) || 0].concat(filhos.map(f => Number(f.ordem) || 0)));
    const depois = daSecao.find(p => (Number(p.ordem) || 0) > fim && filhos.indexOf(p) < 0);
    Object.assign(obj, comuns, {
      id: novoId('pd'), secao: pai.secao, numero, pai: pai.id,
      status: obj.status || 'Pendente', responsavel: obj.responsavel || '', prazo: obj.prazo || '', obs: obj.obs || '',
      concluidoEm: obj.concluidoEm || '', prazoDefinidoEm: obj.prazoDefinidoEm || '', prazoDefinidoPor: obj.prazoDefinidoPor || '',
      criticidade: obj.criticidade || pai.criticidade || '', tipo: obj.tipo || '', frequencia: obj.frequencia || '',
      ordem: depois ? (fim + Number(depois.ordem)) / 2 : fim + 1
    });
    gravar(t, obj);
    return 'Subitem ' + (numero || '') + ' adicionado.';
  }
  const secao = PEND_SECOES.indexOf(v.secao) >= 0 ? v.secao : PEND_SECOES[PEND_SECOES.length - 1];
  const daSecao = todas.filter(p => p.secao === secao);
  const nums = daSecao.map(p => parseInt(String(p.numero).split('.')[0], 10)).filter(n => !isNaN(n));
  const base = PEND_SECOES.indexOf(secao) * 1000;
  Object.assign(obj, comuns, {
    id: novoId('pd'), secao, pai: '',
    numero: String((nums.length ? Math.max.apply(null, nums) : 0) + 1),
    status: obj.status || 'Pendente', responsavel: obj.responsavel || '', prazo: obj.prazo || '', obs: obj.obs || '',
    concluidoEm: obj.concluidoEm || '', prazoDefinidoEm: obj.prazoDefinidoEm || '', prazoDefinidoPor: obj.prazoDefinidoPor || '',
    criticidade: obj.criticidade || '', tipo: obj.tipo || '', frequencia: obj.frequencia || '',
    ordem: Math.max.apply(null, [base].concat(daSecao.map(p => Number(p.ordem) || 0))) + 1
  });
  gravar(t, obj);
  return (obj.tipo === 'Constante' ? 'Tarefa constante ' : 'Pendência ') + obj.numero + ' adicionada.';
}

function pendExcluir(id) {
  const t = tabela('pend');
  const todas = linhas(t);
  const p = todas.find(x => x.id === texto(id, 40));
  if (!p) throw falha('Esta pendência já foi excluída.');
  const filhos = filhosDe(todas, p);
  [p].concat(filhos).map(x => x._row).sort((a, b) => b - a).forEach(r => t.sh.deleteRow(r));
  return filhos.length ? 'Pendência e ' + filhos.length + ' subite' + (filhos.length === 1 ? 'm' : 'ns') + ' excluídos.' : 'Pendência excluída.';
}

// ---------- segurança: senhas, sessões, tentativas de login e auditoria ----------

const SEG = {
  iteracoes: 3000,              // rodadas do hash da senha (deixa adivinhar senhas muito mais lento)
  senhaMin: 6,                  // tamanho mínimo das senhas novas
  sessaoInativa: 24 * 36e5,     // a sessão termina depois de 24 h sem uso…
  sessaoMax: 7 * 24 * 36e5,     // …e, de qualquer forma, 7 dias depois da entrada
  tentativas: 5,                // senhas erradas seguidas até bloquear o login…
  bloqueioMin: 15               // …por 15 minutos
};
const PERMS_ESTOQUE = ['painel', 'itens_ver', 'historico_ver', 'dashboard', 'registrar_saida', 'registrar_entrada', 'registrar_troca',
  'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'itens_editar', 'historico_estornar', 'exportar', 'contagem_registrar'];
var AUDIT_DET = '';

// Segredo guardado nas propriedades do script (fora da planilha): sem ele, quem copiar a aba Usuarios não consegue testar senhas.
function segredoSenhas() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SEG_SEGREDO');
  if (!s) { s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); props.setProperty('SEG_SEGREDO', s); }
  return s;
}
function ehHash(v) { return /^h1\$\d+\$[0-9a-f]{32}\$[A-Za-z0-9+/=]{40,}$/.test(String(v || '')); }
function calcularHash(senha, sal, n) {
  const chave = Utilities.newBlob(segredoSenhas() + ':' + sal).getBytes();
  let h = Utilities.computeHmacSha256Signature(Utilities.newBlob(sal + ':' + senha).getBytes(), chave);
  for (let i = 1; i < n; i++) h = Utilities.computeHmacSha256Signature(h, chave);
  return Utilities.base64Encode(h);
}
function hashSenha(senha) {
  const sal = Utilities.getUuid().replace(/-/g, '');
  return 'h1$' + SEG.iteracoes + '$' + sal + '$' + calcularHash(String(senha), sal, SEG.iteracoes);
}
function iguais(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function conferirSenha(senha, guardada) {
  guardada = String(guardada || '').trim();
  if (!guardada) return false;
  if (!ehHash(guardada)) return iguais(senha, guardada); // texto puro (antigo ou digitado na planilha)
  const p = guardada.split('$');
  return iguais(calcularHash(senha, p[2], Number(p[1]) || SEG.iteracoes), p[3]);
}
// troca todas as senhas em texto da aba Usuarios pelo código (hash)
function migrarSenhas() {
  const U = lerUsuarios();
  let n = 0;
  U.lista.forEach(u => {
    if (u.senha && !ehHash(u.senha)) { U.sh.getRange(u.row, U.c['Senha'] + 1).setNumberFormat('@').setValue(hashSenha(u.senha)); n++; }
  });
  if (n) auditar({ usuario: 'sistema', nome: 'Sistema', perfil: '' }, 'Senhas protegidas', n + ' senha(s) da aba Usuarios trocada(s) por código');
  return n ? n + ' senha(s) da aba Usuarios agora guardada(s) como código.' : 'Todas as senhas já estavam guardadas como código.';
}

// --- sessões: o aparelho guarda só um código de sessão, nunca a senha ---
function chaveSessao(token) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token));
  return 'SESS_' + d.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('').slice(0, 40);
}
function abrirSessao(conta, reg) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const agoraMs = Date.now();
  limparSessoesVencidas();
  PropertiesService.getScriptProperties().setProperty(chaveSessao(token), JSON.stringify({
    u: conta.usuario, i: conta.id || '', c: agoraMs, v: agoraMs, a: texto((reg || {}).aparelho, 60)
  }));
  return token;
}
function lerSessao(token) {
  if (!/^[0-9a-f]{64}$/.test(String(token || ''))) return null;
  const k = chaveSessao(token);
  const props = PropertiesService.getScriptProperties();
  let s;
  try { s = JSON.parse(props.getProperty(k) || 'null'); } catch (e) { s = null; }
  if (!s) return null;
  const t = Date.now();
  if (t - s.v > SEG.sessaoInativa || t - s.c > SEG.sessaoMax) { props.deleteProperty(k); return null; }
  return { k, s, props };
}
function contaDaSessao(token) {
  const x = lerSessao(token);
  if (!x) return null;
  const us = lerUsuarios().lista.find(u => u.usuario === x.s.u);
  // login apagado e recriado com o mesmo nome não herda a sessão da conta antiga
  if (!us || !us.ativo || (x.s.i && us.uid && x.s.i !== us.uid)) { x.props.deleteProperty(x.k); return null; }
  if (Date.now() - x.s.v > 5 * 60e3) { x.s.v = Date.now(); x.props.setProperty(x.k, JSON.stringify(x.s)); }
  const conta = contaDe(us);
  conta.sessao = x.k;
  return conta;
}
function encerrarSessao(token) {
  if (!/^[0-9a-f]{64}$/.test(String(token || ''))) return;
  PropertiesService.getScriptProperties().deleteProperty(chaveSessao(token));
}
function todasSessoes() {
  const all = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(all).filter(k => k.indexOf('SESS_') === 0).map(k => { try { return { k, s: JSON.parse(all[k]) }; } catch (e) { return { k, s: null }; } });
}
function limparSessoesVencidas() {
  const props = PropertiesService.getScriptProperties(), t = Date.now();
  todasSessoes().forEach(x => { if (!x.s || t - x.s.v > SEG.sessaoInativa || t - x.s.c > SEG.sessaoMax) props.deleteProperty(x.k); });
}
function encerrarSessoesDe(usuario, exceto) {
  const props = PropertiesService.getScriptProperties();
  let n = 0;
  todasSessoes().forEach(x => { if (x.s && x.s.u === usuario && x.k !== exceto) { props.deleteProperty(x.k); n++; } });
  return n;
}
function renomearSessoes(de, para) {
  const props = PropertiesService.getScriptProperties();
  todasSessoes().forEach(x => { if (x.s && x.s.u === de) { x.s.u = para; props.setProperty(x.k, JSON.stringify(x.s)); } });
}
function contarSessoes() {
  const t = Date.now(), out = {};
  todasSessoes().forEach(x => { if (x.s && t - x.s.v <= SEG.sessaoInativa && t - x.s.c <= SEG.sessaoMax) out[x.s.u] = (out[x.s.u] || 0) + 1; });
  return out;
}

// --- tentativas de login: 5 senhas erradas seguidas bloqueiam o login por 15 minutos ---
function chaveLogin(u) { return 'LOGIN_' + String(u || '').slice(0, 40); }
function loginBloqueado(usuario) {
  if (!usuario) return 0;
  let x;
  try { x = JSON.parse(PropertiesService.getScriptProperties().getProperty(chaveLogin(usuario)) || 'null'); } catch (e) { x = null; }
  if (!x || !x.ate) return 0;
  const falta = x.ate - Date.now();
  return falta > 0 ? Math.ceil(falta / 60e3) : 0;
}
function registrarFalhaLogin(usuario) {
  Utilities.sleep(700); // cada senha errada custa tempo para quem tenta adivinhar
  // só conta tentativas de logins que existem (nome inventado não ocupa espaço nas propriedades)
  if (!usuario || !lerUsuarios().lista.some(u => u.usuario === usuario)) return false;
  const props = PropertiesService.getScriptProperties(), k = chaveLogin(usuario), t = Date.now();
  let x;
  try { x = JSON.parse(props.getProperty(k) || 'null'); } catch (e) { x = null; }
  if (!x || t - (x.ult || 0) > SEG.bloqueioMin * 60e3) x = { n: 0 };
  x.n = (x.n || 0) + 1; x.ult = t;
  const travou = x.n >= SEG.tentativas;
  if (travou) { x.ate = t + SEG.bloqueioMin * 60e3; x.n = 0; }
  props.setProperty(k, JSON.stringify(x));
  return travou;
}
function limparFalhasLogin(usuario) { if (usuario) PropertiesService.getScriptProperties().deleteProperty(chaveLogin(usuario)); }

// --- histórico de auditoria (aba Auditoria) ---
const ACOES_AUDIT = {
  registrar: 'Movimentação', osAbrir: 'Abriu OS', osAtualizar: 'Atualizou OS', osFoto: 'Foto na OS', osFotoRemover: 'Tirou foto da OS',
  demCriar: 'Criou demanda', demAtualizar: 'Atualizou demanda', salvarPreventiva: 'Salvou preventiva', excluirPreventiva: 'Excluiu preventiva',
  salvarLocais: 'Alterou locais', importarContagem: 'Importou inventário', devolver: 'Devolução', salvarItem: 'Salvou item',
  excluirItem: 'Excluiu item', estornar: 'Estornou lançamento', salvarUsuario: 'Usuário', acessoUsuario: 'Acessos de usuário', contagemEnviar: 'Contagem', contagemDecidir: 'Aprovação de estoque', contagemCancelar: 'Contagem cancelada', itemLiberar: 'Item liberado',
  salvarPerfil: 'Perfil', excluirPerfil: 'Excluiu perfil', pendSalvar: 'Pendência', pendExcluir: 'Excluiu pendência',
  nfEnviar: 'Enviou nota fiscal', nfVer: 'Abriu nota fiscal', relatorio: 'Dashboard', usuarios: 'Usuários', acessos: 'Histórico de acessos',
  auditoria: 'Auditoria', pendencias: 'Pendências'
};
function resumoAuditoria(req, msg) {
  if (AUDIT_DET) return AUDIT_DET;
  const m = typeof msg === 'string' ? msg : (msg && msg.texto) || '';
  const extra = [];
  if (req.acao === 'salvarPerfil') extra.push('perfil ' + texto(req.nome, 40));
  if (req.acao === 'excluirPerfil') extra.push('perfil ' + texto(req.nome, 40));
  if (req.acao === 'excluirItem' || req.acao === 'pendExcluir') extra.push('id ' + texto(req.id, 40));
  if (req.acao === 'estornar' && req.motivo) extra.push('motivo: ' + texto(req.motivo, 120));
  return [m].concat(extra).filter(Boolean).join(' · ').slice(0, 500);
}
function auditar(conta, acao, detalhe, resultado) {
  try {
    gravar(tabela('audit'), {
      id: novoId('au'), quando: agora(), usuario: conta && conta.usuario || '', nome: conta && conta.nome || '',
      perfil: conta && conta.perfil || '', acao: texto(acao, 60), detalhe: texto(detalhe, 500), resultado: resultado || 'OK'
    });
  } catch (e) { /* a auditoria nunca pode impedir a operação */ }
}
function lerAuditoria(dias) {
  const t = tabela('audit');
  const ultima = t.sh.getLastRow();
  if (ultima < 2) return [];
  const n = Math.min(ultima - 1, 5000);
  const vals = t.sh.getRange(ultima - n + 1, 1, n, t.ncol).getValues();
  const corte = Number(dias) > 0 ? Utilities.formatDate(new Date(Date.now() - Number(dias) * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
  const out = [];
  for (let i = vals.length - 1; i >= 0; i--) {
    const r = vals[i];
    if (!r[t.idx.id]) continue;
    const quando = r[t.idx.quando] instanceof Date ? Utilities.formatDate(r[t.idx.quando], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : String(r[t.idx.quando]);
    if (corte && quando.slice(0, 10) < corte) continue;
    out.push({ quando, usuario: String(r[t.idx.usuario]), nome: String(r[t.idx.nome]), perfil: String(r[t.idx.perfil]),
      acao: String(r[t.idx.acao]), detalhe: String(r[t.idx.detalhe]), resultado: String(r[t.idx.resultado] || 'OK') });
  }
  return out;
}
// abas que só o sistema escreve: ninguém além do dono da planilha consegue editar à mão
function protegerAbas() {
  ['audit', 'acessos'].forEach(k => {
    try {
      const sh = tabela(k).sh;
      const ja = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      const p = ja.length ? ja[0] : sh.protect().setDescription('Gravada pelo Pier Gestão: não editar');
      // o dono vem da própria planilha (Session.getEffectiveUser pediria uma permissão a mais do Google)
      const dono = (function () { try { return SpreadsheetApp.getActive().getOwner().getEmail(); } catch (e) { return ''; } })();
      const outros = p.getEditors().filter(u => u.getEmail() && u.getEmail() !== dono);
      if (outros.length) p.removeEditors(outros);
      if (p.canDomainEdit()) p.setDomainEdit(false);
    } catch (e) { Logger.log('Não foi possível proteger a aba ' + k + ': ' + e.message); }
  });
}
// protege uma aba inteira: só o dono da planilha (que é quem o sistema usa para gravar) pode editar
function donoDaPlanilha() { try { return SpreadsheetApp.getActive().getOwner().getEmail(); } catch (e) { return ''; } }
function protegerSoDono(sh, descricao) {
  try {
    const ja = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    const p = ja.length ? ja[0] : sh.protect();
    p.setDescription(descricao || 'Gravada pelo Pier Gestão: não editar');
    if (p.isWarningOnly && p.isWarningOnly()) p.setWarningOnly(false);
    const dono = donoDaPlanilha();
    const outros = p.getEditors().filter(u => u.getEmail() && u.getEmail() !== dono);
    if (outros.length) p.removeEditors(outros);
    if (p.canDomainEdit()) p.setDomainEdit(false);
    return '';
  } catch (e) { let nome = 'aba'; try { nome = sh.getName(); } catch (e2) {} return nome + ': ' + e.message; }
}
// Proteção completa (rode pelo editor quando quiser aplicar; não roda sozinha):
// todas as abas do sistema e as cópias de segurança ficam editáveis só pelo dono da planilha.
// O site continua gravando normalmente, porque o Apps Script grava como o dono (implantação "Executar como: eu").
const ABAS_SISTEMA = ['itens', 'movs', 'emp', 'cont', 'audit', 'acessos', 'os', 'dem', 'prev'];
function protegerPlanilha() {
  const ss = SpreadsheetApp.getActive();
  const nomes = ABAS_SISTEMA.map(k => ABAS[k] && ABAS[k].nome).filter(Boolean).concat(['Usuarios', 'Perfis', 'Config', 'Pendencias', 'Pendências']);
  const feitas = [], erros = [];
  ss.getSheets().forEach(sh => {
    const nome = sh.getName();
    if (nomes.indexOf(nome) < 0 && nome.indexOf('Itens (cópia de') !== 0) return;
    const e = protegerSoDono(sh, nome.indexOf('Itens (cópia') === 0 ? 'Cópia de segurança do Pier Gestão: não editar' : 'Gravada pelo Pier Gestão: não editar');
    e ? erros.push(e) : feitas.push(nome);
  });
  const txt = feitas.length + ' aba(s) protegida(s): ' + feitas.join(', ') + (erros.length ? '. Erros: ' + erros.join('; ') : '');
  auditar(SISTEMA, 'Proteção da planilha', txt);
  Logger.log(txt);
  Logger.log(verificarProtecao());
  return txt;
}
// Só lê e informa: quem tem acesso à planilha e quais abas estão sem proteção ou só com aviso
function verificarProtecao() {
  const ss = SpreadsheetApp.getActive();
  const dono = donoDaPlanilha();
  const linhasTxt = ['Dono: ' + (dono || '?')];
  try {
    const f = DriveApp.getFileById(ss.getId());
    const ed = f.getEditors().map(u => u.getEmail()).filter(x => x && x !== dono);
    const ve = f.getViewers().map(u => u.getEmail()).filter(Boolean);
    linhasTxt.push('Editores além do dono: ' + (ed.length ? ed.join(', ') : 'nenhum'));
    linhasTxt.push('Leitores/comentadores: ' + (ve.length ? ve.join(', ') : 'nenhum'));
    linhasTxt.push('Link aberto: ' + (f.getSharingAccess() === DriveApp.Access.PRIVATE ? 'não' : 'SIM — feche o link'));
  } catch (e) { linhasTxt.push('Compartilhamento: não foi possível ler (' + e.message + ')'); }
  ss.getSheets().forEach(sh => {
    const ps = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (!ps.length) { linhasTxt.push('SEM PROTEÇÃO: ' + sh.getName()); return; }
    const p = ps[0];
    if (p.isWarningOnly && p.isWarningOnly()) { linhasTxt.push('SÓ AVISO (não impede): ' + sh.getName()); return; }
    const outros = p.getEditors().map(u => u.getEmail()).filter(x => x && x !== dono);
    linhasTxt.push('Protegida: ' + sh.getName() + (outros.length ? ' (também editam: ' + outros.join(', ') + ')' : ' (só o dono)'));
  });
  return linhasTxt.join('\n');
}

// confere quem tem acesso à planilha, às pastas e aos arquivos; tira qualquer link aberto
function verificarArquivos() {
  const avisos = [];
  let fechados = 0;
  const fechar = (item, rotulo) => {
    try {
      if (item.getSharingAccess() !== DriveApp.Access.PRIVATE) { item.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); fechados++; }
      const pessoas = item.getEditors().concat(item.getViewers()).map(u => u.getEmail()).filter(Boolean);
      if (pessoas.length) avisos.push(rotulo + ' compartilhada com: ' + pessoas.join(', '));
    } catch (e) { avisos.push(rotulo + ': não foi possível conferir (' + e.message + ')'); }
  };
  fechar(DriveApp.getFileById(SpreadsheetApp.getActive().getId()), 'Planilha');
  [[pastaFotos(), 'Pasta de fotos das OS'], [pastaNF(), 'Pasta de notas fiscais']].forEach(([pasta, rot]) => {
    fechar(pasta, rot);
    const it = pasta.getFiles();
    while (it.hasNext()) {
      const f = it.next();
      try { if (f.getSharingAccess() !== DriveApp.Access.PRIVATE) { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); fechados++; } } catch (e) {}
    }
  });
  const txt = (fechados ? fechados + ' link(s) aberto(s) fechado(s). ' : 'Nenhum arquivo com link aberto. ') + (avisos.length ? avisos.join('; ') + '.' : 'Planilha e pastas acessíveis só pelo dono.');
  auditar({ usuario: 'sistema', nome: 'Sistema', perfil: '' }, 'Verificação dos arquivos', txt);
  return txt;
}

// ---------- inventário: contagens com aprovação da Administração ----------
// Nenhuma correção de saldo entra sem aprovação: a contagem vira uma solicitação (aba Contagens) e só a
// aprovação de outra pessoa do perfil Administração altera o saldo e grava o Ajuste no histórico.
// Contagem igual ao saldo vira uma Conferência no histórico, sem aprovação e sem mexer no saldo.

const CONT_STATUS = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada', reconferir: 'Reconferir', cancelada: 'Cancelada' };
const CONT_MAX_ITENS = 500;
var FALHA_SIMULADA = '';   // usado só pelos testes: 'apos_marca', 'apos_historico', 'apos_saldo', 'import_apos_itens', 'import_apos_pedidos'
var FALHA_ITEM = '';       // testes: limita a falha simulada da aprovação a um item
var AUDIT_FEITO = false;   // a ação já gravou a própria auditoria detalhada

function podeContar(conta) { return !!(conta && (conta.perfil === PERFIL_TOTAL || (conta.perms && conta.perms.contagem_registrar))); }
function exigirContagem(conta) {
  if (!podeContar(conta)) { const e = falha('Seu perfil não tem permissão para registrar contagens.'); e.negado = true; throw e; }
}
function exigirAdministracao(conta) {
  if (!conta || conta.perfil !== PERFIL_TOTAL) { const e = falha('Só o perfil Administração aprova, rejeita ou devolve ajustes de estoque.'); e.negado = true; throw e; }
}
// última movimentação de cada item (pela ordem de gravação na aba)
function ultimasMovs(movs) {
  const u = {};
  (movs || linhas(tabela('movs'))).forEach(m => { if (m.itemId) u[m.itemId] = m.id; });
  return u;
}
function proximoNumeroContagem(conts) {
  let max = 0;
  conts.forEach(c => { const x = /(\d+)\s*$/.exec(String(c.numero || '')); if (x) max = Math.max(max, Number(x[1])); });
  return function () { max++; return 'CT-' + ('000' + max).slice(-4); };
}
function contagemPendenteDoItem(conts, itemId) {
  return conts.find(c => c.itemId === itemId && (c.status === CONT_STATUS.pendente || c.etapa === 'aplicando'));
}
// monta uma solicitação (não grava); quem chama grava todas de uma vez
function novaSolicitacao(it, qtd, just, conta, o) {
  o = o || {};
  const saldo = Number(it.qtd) || 0;
  return {
    id: novoId('CT'), numero: o.numero(), lote: o.lote || '', origem: o.origem || 'Contagem',
    itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome, setor: setorDe(it), unidade: it.unidade,
    saldoContagem: arred(saldo), ultimaMov: o.ultimaMov || '', qtdContada: arred(qtd), diferenca: arred(qtd - saldo),
    justificativa: texto(just, 300), contadoPor: conta.usuario, contadoPorId: conta.id || '', contadoPorNome: conta.nome, contadoEm: agoraSeg(),
    status: CONT_STATUS.pendente, versao: 1, decididoPor: '', decididoPorNome: '', decididoEm: '', motivoDecisao: '',
    qtdFinal: '', movId: '', operacao: '', etapa: '', extra: o.extra ? JSON.stringify(o.extra) : ''
  };
}
function gravarVarias(t, objs) {
  if (!objs.length) return;
  const rows = objs.map(o => { const row = new Array(t.ncol).fill(''); t.def.cols.forEach(([k]) => { if (k in o) row[t.idx[k]] = o[k] === undefined || o[k] === null ? '' : o[k]; }); return row; });
  const fmts = rows.map(() => t.def.cols.reduce((f, c) => { f[t.idx[c[0]]] = t.def.num.indexOf(c[0]) >= 0 ? 'General' : '@'; return f; }, new Array(t.ncol).fill('@')));
  const rng = t.sh.getRange(t.sh.getLastRow() + 1, 1, rows.length, t.ncol);
  rng.setNumberFormats(fmts);
  rng.setValues(rows.map(row => row.map((v, j) => { const c = t.def.cols.find(x => t.idx[x[0]] === j); return c && t.def.num.indexOf(c[0]) >= 0 ? (v === '' ? '' : Number(v)) : String(v); })));
}
function movConferencia(it, qtd, conta, obs) {
  return {
    id: novoId('M'), data: hoje(), tipo: TIPOS.conferencia, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome,
    qtd: arred(qtd), unidade: it.unidade, delta: 0, responsavel: conta.nome, motivo: 'Conferência sem divergência: ' + fmt(qtd) + ' ' + (it.unidade || ''),
    obs: texto(obs, 300), registradoPor: conta.nome, criadoEm: agoraSeg()
  };
}
function auditarContagem(conta, acao, c, extra, resultado) {
  auditar(conta, acao, [
    c.numero + ' · item ' + c.itemCodigo + ' ' + c.itemNome + ' (' + c.itemId + ')',
    'contado por ' + c.contadoPorNome + ' (' + c.contadoPor + (c.contadoPorId ? ', conta ' + c.contadoPorId : '') + ') em ' + c.contadoEm,
    'saldo na contagem ' + fmt(c.saldoContagem) + ', contado ' + fmt(c.qtdContada) + ', diferença ' + (c.diferenca > 0 ? '+' : '') + fmt(c.diferenca),
    c.justificativa ? 'justificativa: ' + c.justificativa : '', extra || ''
  ].filter(Boolean).join(' · '), resultado);
  AUDIT_FEITO = true;
}

// equipe registra a contagem: igual ao saldo = Conferência; diferente = solicitação pendente
function contagemEnviar(r, conta) {
  exigirContagem(conta);
  const lista = Array.isArray(r.itens) ? r.itens : [];
  if (!lista.length) throw falha('Informe ao menos um item contado.');
  if (lista.length > CONT_MAX_ITENS) throw falha('Conte no máximo ' + CONT_MAX_ITENS + ' itens por vez.');
  const itens = linhas(tabela('itens')), movs = linhas(tabela('movs')), tc = tabela('cont'), conts = linhas(tc);
  const ult = ultimasMovs(movs), numero = proximoNumeroContagem(conts), bloq = itensBloqueados();
  const lote = lista.length > 1 ? 'L' + Date.now().toString(36).toUpperCase() : '';
  const vistos = {}, sol = [], conf = [], erros = [];
  lista.forEach((l, k) => {
    const it = itens.find(x => x.id === l.itemId);
    if (!it) { erros.push('Linha ' + (k + 1) + ': item não encontrado. Atualize a página.'); return; }
    exigirSetor(conta, setorDe(it));
    if (vistos[it.id]) { erros.push(it.nome + ': aparece duas vezes na contagem.'); return; }
    if (bloq[it.id]) { erros.push(it.nome + ': item bloqueado para revisão da Administração (' + bloq[it.id].motivo + ')'); return; }
    vistos[it.id] = true;
    const qtd = numero_(l.qtd);
    if (!(qtd >= 0)) { erros.push(it.nome + ': quantidade contada inválida.'); return; }
    const saldo = Number(it.qtd) || 0;
    if (l.saldoVisto !== undefined && l.saldoVisto !== '' && arred(Number(l.saldoVisto)) !== arred(saldo)) {
      erros.push(it.nome + ': o saldo mudou de ' + fmt(l.saldoVisto) + ' para ' + fmt(saldo) + ' enquanto você contava. Confira de novo.'); return;
    }
    const pend = contagemPendenteDoItem(conts, it.id);
    if (pend) { erros.push(it.nome + ': já tem um ajuste aguardando aprovação (' + pend.numero + ').'); return; }
    if (arred(qtd) === arred(saldo)) { conf.push(movConferencia(it, qtd, conta, l.justificativa)); return; }
    const just = texto(l.justificativa, 300);
    if (!just) { erros.push(it.nome + ': explique a diferença (o sistema tem ' + fmt(saldo) + ', você contou ' + fmt(qtd) + ').'); return; }
    sol.push(novaSolicitacao(it, qtd, just, conta, { numero, lote, ultimaMov: ult[it.id] || '', origem: texto(r.origem, 40) || 'Contagem' }));
  });
  if (erros.length) throw falha(erros.slice(0, 8).join(' ') + (erros.length > 8 ? ' (e mais ' + (erros.length - 8) + ')' : '') + ' Nada foi enviado: corrija e envie de novo.');
  gravarVarias(tc, sol);
  gravarVarias(tabela('movs'), conf);
  sol.forEach(c => auditarContagem(conta, 'Contagem enviada para aprovação', c));
  conf.forEach(m => auditar(conta, 'Conferência sem divergência', m.itemCodigo + ' ' + m.itemNome + ' (' + m.itemId + ') · conferido ' + fmt(m.qtd) + ' ' + m.unidade));
  AUDIT_FEITO = true;
  const partes = [];
  if (sol.length) partes.push(sol.length === 1 ? 'ajuste ' + sol[0].numero + ' enviado para aprovação' : sol.length + ' ajustes enviados para aprovação');
  if (conf.length) partes.push(conf.length === 1 ? '1 item conferido sem diferença' : conf.length + ' itens conferidos sem diferença');
  return partes.join(' e ').replace(/^./, x => x.toUpperCase()) + '.';
}
function numero_(v) { return v === '' || v === null || v === undefined ? NaN : numero(v); }

// Administração decide: aprovar, rejeitar ou devolver para reconferência (cada item validado separadamente)
function contagemDecidir(r, conta) {
  exigirAdministracao(conta);
  const op = r.op;
  if (['aprovar', 'rejeitar', 'reconferir'].indexOf(op) < 0) throw falha('Operação inválida.');
  const alvos = (Array.isArray(r.itens) ? r.itens : []).slice(0, 200);
  if (!alvos.length) throw falha('Escolha ao menos uma solicitação.');
  const motivo = texto(r.motivo, 300);
  if (op !== 'aprovar' && !motivo) throw falha(op === 'rejeitar' ? 'Informe o motivo da rejeição.' : 'Explique o que precisa ser conferido de novo.');
  const tc = tabela('cont');
  const resultados = [];
  alvos.forEach(a => {
    const conts = linhas(tc);
    const c = conts.find(x => x.id === String(a.id || ''));
    if (!c) { resultados.push({ id: a.id, ok: false, msg: 'Solicitação não encontrada.' }); return; }
    const rot = c.numero + ' (' + c.itemNome + ')';
    if (c.etapa === 'aplicando') { resultados.push({ id: c.id, numero: c.numero, ok: false, msg: rot + ': aprovação em andamento. Atualize a tela.' }); return; }
    if (c.status !== CONT_STATUS.pendente) {
      resultados.push({ id: c.id, numero: c.numero, ok: c.status === CONT_STATUS.aprovada && op === 'aprovar', jaDecidida: true,
        msg: rot + ': já estava ' + c.status.toLowerCase() + (c.decididoPorNome ? ' (' + c.decididoPorNome + ', ' + c.decididoEm + ')' : '') + '.' });
      return;
    }
    if (Number(c.versao) !== Number(a.versao)) { resultados.push({ id: c.id, numero: c.numero, ok: false, msg: rot + ': a solicitação mudou. Atualize a tela e confira de novo.' }); return; }
    if (contouEsta(c, conta)) {
      auditarContagem(conta, 'Tentou decidir a própria contagem', c, 'conta ' + (conta.id || conta.usuario), 'Negado');
      resultados.push({ id: c.id, numero: c.numero, ok: false, msg: rot + ': quem contou não pode decidir a própria contagem. Outra pessoa da Administração precisa analisar.' });
      return;
    }
    const base = { decididoPor: conta.usuario, decididoPorId: conta.id || '', decididoPorNome: conta.nome, decididoEm: agoraSeg(), versao: Number(c.versao) + 1 };
    if (op !== 'aprovar') {
      const st = op === 'rejeitar' ? CONT_STATUS.rejeitada : CONT_STATUS.reconferir;
      gravar(tc, Object.assign(base, { status: st, motivoDecisao: motivo }), c._row);
      auditarContagem(conta, op === 'rejeitar' ? 'Ajuste rejeitado' : 'Ajuste devolvido para reconferência', c, 'motivo: ' + motivo + '; saldo continua ' + fmt(c.saldoContagem), st);
      resultados.push({ id: c.id, numero: c.numero, ok: true, msg: rot + ': ' + (op === 'rejeitar' ? 'rejeitado' : 'devolvido para reconferência') + '. O saldo não mudou.' });
      return;
    }
    const bq = lerBloqueio(c.itemId);
    if (bq) { resultados.push({ id: c.id, numero: c.numero, ok: false, msg: rot + ': o item está bloqueado para revisão (' + bq.motivo + ') Libere o item antes de decidir.' }); return; }
    // aprovação: o item e o histórico precisam estar como na hora da contagem
    const it = linhas(tabela('itens')).find(x => x.id === c.itemId);
    const ult = ultimasMovs()[c.itemId] || '';
    let mudou = '';
    if (!it) mudou = 'o item não existe mais no cadastro';
    else if (arred(Number(it.qtd) || 0) !== arred(c.saldoContagem)) mudou = 'o saldo mudou de ' + fmt(c.saldoContagem) + ' para ' + fmt(Number(it.qtd) || 0) + ' depois da contagem';
    else if (ult !== String(c.ultimaMov || '')) mudou = 'houve movimentação do item depois da contagem';
    if (mudou) {
      gravar(tc, Object.assign(base, { status: CONT_STATUS.reconferir, motivoDecisao: 'Conferência automática: ' + mudou + '. Conte de novo.' }), c._row);
      auditarContagem(conta, 'Ajuste exige reconferência', c, mudou, CONT_STATUS.reconferir);
      resultados.push({ id: c.id, numero: c.numero, ok: false, reconferir: true, msg: rot + ': ' + mudou + '. Foi para Reconferir, sem alterar o saldo.' });
      return;
    }
    aplicarAjuste(tc, c, it, conta, base);
    resultados.push({ id: c.id, numero: c.numero, ok: true, msg: rot + ': aprovado. Saldo ' + fmt(c.saldoContagem) + ' → ' + fmt(c.qtdContada) + '.' });
  });
  AUDIT_FEITO = true;
  const ok = resultados.filter(x => x.ok).length;
  return { texto: ok + ' de ' + resultados.length + (resultados.length === 1 ? ' solicitação concluída.' : ' solicitações concluídas.'), resultados };
}

// Aplicação em etapas, com identificador de operação: marca → histórico → saldo → conclusão.
// Se o script parar no meio, reconciliarContagens() termina ou desfaz na próxima gravação.
function aplicarAjuste(tc, c, it, conta, base) {
  const op = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  gravar(tc, Object.assign({}, base, { etapa: 'aplicando', operacao: op, qtdFinal: c.qtdContada }), c._row);
  props.setProperty('CONT_APLICANDO', op);
  SpreadsheetApp.flush();
  const falhar = ponto => FALHA_SIMULADA === ponto && (!FALHA_ITEM || FALHA_ITEM === c.itemId);
  if (falhar('apos_marca')) throw new Error('Falha simulada depois de marcar a operação');
  const movs = movsDoAjuste(c, it, op, conta);
  gravarVarias(tabela('movs'), movs);
  SpreadsheetApp.flush();
  if (falhar('apos_historico')) throw new Error('Falha simulada depois do histórico');
  aplicarSaldo(c, it);
  SpreadsheetApp.flush();
  if (falhar('apos_saldo')) throw new Error('Falha simulada depois do saldo');
  concluirContagem(tc, c, movs, conta);
  props.deleteProperty('CONT_APLICANDO');
  SALDO_OK[c.itemId] = true;
  // confirma a consistência antes de responder
  const conf = linhas(tc).find(x => x.id === c.id);
  const itD = linhas(tabela('itens')).find(x => x.id === c.itemId);
  const extra = lerExtra(c);
  const saldoOk = itD ? arred(Number(itD.qtd) || 0) === arred(c.qtdContada) : !!extra.remover;
  if (!conf || conf.status !== CONT_STATUS.aprovada || !saldoOk) throw falha('A aprovação de ' + c.numero + ' não pôde ser confirmada. Atualize a tela: o sistema confere de novo na próxima operação.');
  auditarContagem(conta, 'Ajuste aprovado', c, 'quantidade final ' + fmt(c.qtdContada) + '; movimentação ' + (conf.movId || '—') + '; operação ' + op, CONT_STATUS.aprovada);
}
function lerExtra(c) { try { return JSON.parse(c.extra || '{}') || {}; } catch (e) { return {}; } }
// histórico do ajuste: compras e retiradas antigas da planilha importada (com a data original, sem repetir)
// e o Ajuste que leva o saldo ao valor contado
function movsDoAjuste(c, it, op, conta) {
  const extra = lerExtra(c);
  const MARCA = 'Histórico da planilha';
  const hist = Array.isArray(extra.hist) ? extra.hist : [];
  // confere de novo na aprovação: o que entrou no histórico depois da importação não é lançado outra vez
  const novos = hist.length ? histFaltante(c.itemId, hist, contarLancados(linhas(tabela('movs')))) : [];
  const somaHist = novos.reduce((t, h) => t + (h.tipo === 'entrada' ? h.qtd : -h.qtd), 0);
  const ag = agoraSeg();
  const out = novos.map(h => ({
    id: novoId('M'), data: h.data, tipo: TIPOS[h.tipo], itemId: c.itemId, itemCodigo: c.itemCodigo, itemNome: c.itemNome,
    qtd: h.qtd, unidade: c.unidade, delta: h.tipo === 'entrada' ? h.qtd : -h.qtd, responsavel: h.responsavel, destino: h.destino,
    fornecedor: h.fornecedor, nf: h.nf, valorUnit: h.valorUnit, obs: (MARCA + (h.obs ? ': ' + h.obs : '')).slice(0, 300),
    registradoPor: conta.nome, criadoEm: ag, contagem: c.numero, operacao: op
  }));
  const delta = arred(c.qtdContada - c.saldoContagem - somaHist);
  const novo = !!extra.novo, remover = !!extra.remover;
  const rotulo = novo ? 'Saldo inicial' : remover ? 'Saiu da lista do inventário' : 'Contagem';
  if (delta === 0 && out.length) return out; // o histórico antigo já explica o saldo: não precisa de Ajuste
  out.push({
    id: novoId('M'), data: novo && hist.length && extra.dataAjuste ? extra.dataAjuste : hoje(), tipo: TIPOS.ajuste,
    itemId: c.itemId, itemCodigo: c.itemCodigo, itemNome: c.itemNome, qtd: Math.abs(delta), unidade: c.unidade, delta,
    responsavel: c.contadoPorNome,
    motivo: (rotulo + ' ' + c.numero + ' aprovada: ' + (c.justificativa || '') + ' (de ' + fmt(c.saldoContagem) + ' para ' + fmt(c.qtdContada) + ')').slice(0, 300),
    obs: ('Contado por ' + c.contadoPorNome + ' em ' + c.contadoEm + '; aprovado por ' + conta.nome + (novos.length ? '; ' + novos.length + ' lançamento(s) do histórico da planilha' : '')).slice(0, 300),
    registradoPor: conta.nome, criadoEm: ag, contagem: c.numero, operacao: op,
    saldoAnterior: c.saldoContagem, saldoFinal: c.qtdContada, aprovadoPor: conta.nome
  });
  return out;
}
function aplicarSaldo(c, it) {
  const ti = tabela('itens');
  const atual = it ? linhas(ti).find(x => x.id === c.itemId) : null;
  if (!atual) return;
  // valor absoluto: aplicar duas vezes dá o mesmo resultado
  gravar(ti, { qtd: arred(c.qtdContada), atualizadoEm: agora() }, atual._row);
  if (lerExtra(c).remover && arred(c.qtdContada) === 0) ti.sh.deleteRow(atual._row);
}
function concluirContagem(tc, c, movs, conta) {
  const aj = (movs || []).filter(m => m.tipo === TIPOS.ajuste || m.tipo === 'ajuste').pop();
  gravar(tc, { status: CONT_STATUS.aprovada, etapa: 'concluida', movId: aj ? aj.id : '' }, linhas(tc).find(x => x.id === c.id)._row);
}

// Termina ou desfaz uma aprovação interrompida (roda dentro do bloqueio, antes de qualquer gravação)
function reconciliarContagens(completo) {
  const props = PropertiesService.getScriptProperties();
  const res = { n: 0, erros: 0, itens: {} };
  // na gravação comum só procura quando há marca de operação aberta; a rotina agendada procura sempre
  if (!completo && !props.getProperty('CONT_APLICANDO')) return res;
  const tc = tabela('cont');
  const sist = SISTEMA;
  linhas(tc).filter(c => c.etapa === 'aplicando').forEach(c => {
    res.n++;
    res.itens[c.itemId] = true;
    const movs = linhas(tabela('movs')).filter(m => m.operacao && m.operacao === c.operacao);
    const it = linhas(tabela('itens')).find(x => x.id === c.itemId);
    const extra = lerExtra(c);
    const q = it ? arred(Number(it.qtd) || 0) : null;
    const saldoNovo = it ? q === arred(c.qtdFinal) : !!extra.remover;
    const saldoAntigo = it && q === arred(c.saldoContagem);
    const decisor = { id: c.decididoPorId, usuario: c.decididoPor, nome: c.decididoPorNome, perfil: PERFIL_TOTAL };
    if (!movs.length && saldoAntigo) {
      gravar(tc, { etapa: '', operacao: '', qtdFinal: '', decididoPor: '', decididoPorNome: '', decididoEm: '', versao: Number(c.versao) + 1 }, c._row);
      auditarContagem(sist, 'Aprovação interrompida desfeita', c, 'nada tinha sido gravado; voltou para Pendente', 'Recuperado');
    } else if (movs.length && (saldoNovo || saldoAntigo)) {
      if (!saldoNovo || (it && extra.remover && q === 0)) aplicarSaldo(c, it);
      concluirContagem(tc, c, movs, decisor);
      auditarContagem(sist, 'Aprovação interrompida concluída', c, 'histórico já gravado; ' + (saldoNovo ? 'saldo já atualizado' : 'saldo atualizado agora') + '; operação ' + c.operacao, CONT_STATUS.aprovada);
    } else if (!movs.length && saldoNovo) {
      const ms = movsDoAjuste(c, it, c.operacao, decisor);
      gravarVarias(tabela('movs'), ms);
      concluirContagem(tc, c, ms, decisor);
      auditarContagem(sist, 'Aprovação interrompida concluída', c, 'saldo já atualizado; histórico gravado agora; operação ' + c.operacao, CONT_STATUS.aprovada);
    } else {
      gravar(tc, { status: CONT_STATUS.reconferir, etapa: 'erro', versao: Number(c.versao) + 1,
        motivoDecisao: 'Recuperação: saldo atual ' + (q === null ? 'sem item' : fmt(q)) + ' não bate com a contagem nem com o aprovado. Confira o item e o histórico.' }, c._row);
      auditarContagem(sist, 'Inconsistência na recuperação', c, 'operação ' + c.operacao + '; movimentações gravadas: ' + movs.length + '; saldo atual ' + (q === null ? 'sem item' : fmt(q)), 'Erro');
      res.erros++;
      delete res.itens[c.itemId];
      // não dá para saber qual saldo está certo: o item fica travado até a Administração revisar
      bloquearItem({ itemId: c.itemId, itemCodigo: c.itemCodigo, itemNome: c.itemNome, tipo: 'recuperacao', contagem: c.numero, operacao: c.operacao,
        saldoPlanilha: q === null ? undefined : q,
        motivo: 'a aprovação ' + c.numero + ' parou no meio e o saldo (' + (q === null ? 'item apagado' : fmt(q)) + ') não bate nem com o saldo da contagem (' + fmt(c.saldoContagem) + ') nem com o aprovado (' + fmt(c.qtdFinal) + ').' });
    }
  });
  SpreadsheetApp.flush();
  props.deleteProperty('CONT_APLICANDO');
  return res;
}

// quem enviou cancela a própria solicitação enquanto está pendente
function contagemCancelar(r, conta) {
  const tc = tabela('cont');
  const c = linhas(tc).find(x => x.id === String(r.id || ''));
  if (!c) throw falha('Solicitação não encontrada.');
  if (!contouEsta(c, conta)) { const e = falha('Só quem enviou a contagem pode cancelar.'); e.negado = true; throw e; }
  if (c.status !== CONT_STATUS.pendente || c.etapa) throw falha('Esta solicitação já foi ' + c.status.toLowerCase() + '.');
  if (Number(c.versao) !== Number(r.versao)) throw falha('A solicitação mudou. Atualize a tela.');
  gravar(tc, { status: CONT_STATUS.cancelada, decididoPor: conta.usuario, decididoPorId: conta.id || '', decididoPorNome: conta.nome, decididoEm: agoraSeg(), motivoDecisao: 'Cancelada por quem contou', versao: Number(c.versao) + 1 }, c._row);
  auditarContagem(conta, 'Contagem cancelada', c, '', CONT_STATUS.cancelada);
  return c.numero + ' cancelada. O saldo não mudou.';
}

// o que cada um vê: Administração vê todas; quem conta vê as próprias (pendentes e dos últimos 90 dias)
function contagensVisiveis(conta) {
  if (!podeContar(conta)) return null;
  const corte = Utilities.formatDate(new Date(Date.now() - 90 * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const admin = conta.perfil === PERFIL_TOTAL;
  return linhas(tabela('cont'))
    .filter(c => c.status === CONT_STATUS.pendente || c.etapa === 'aplicando' || String(c.contadoEm).slice(0, 10) >= corte)
    .filter(c => admin || contouEsta(c, conta))
    .map(c => {
      const ex = lerExtra(c);
      const o = Object.assign({}, c); delete o._row; delete o.extra; delete o.operacao;
      o.minha = contouEsta(c, conta); delete o.contadoPorId; delete o.decididoPorId;
      o.historico = Array.isArray(ex.hist) ? ex.hist.length : 0; o.remover = !!ex.remover; o.novo = !!ex.novo;
      return o;
    });
}

// ---------- integridade: recuperação automática, bloqueio de itens e conferência dos saldos ----------
// 1) recuperarOperacoesPendentes() roda sozinha por um acionador de tempo (instalado à mão, só com
//    autorização) e também antes de cada gravação: termina ou desfaz aprovações
//    interrompidas, sempre pelo identificador da operação, sem aplicar nada duas vezes.
// 2) O sistema guarda (nas propriedades do script, fora da planilha) o último saldo que ele mesmo gravou
//    em cada item. Saldo diferente disso = alteração fora do sistema (edição direta na planilha) ou gravação
//    que parou no meio: o item fica bloqueado até a Administração revisar.
const SISTEMA = { id: '', usuario: 'sistema', nome: 'Sistema', perfil: '' };
const PLANILHA_OFICIAL = '15wnsofNNPt8E5HydcJaFfmQpDGAtyF45ErcwkIHhlm8';
const RECUP = { minutos: 10, esperaLockMs: 30000, pedaco: 8000 };
var SALDO_OK = {};   // itens cujo saldo esta execução gravou de forma completa (movimentação + saldo)

// --- bloqueio de itens (uma propriedade por item: BLOQ_<id>) ---
function chaveBloqueio(id) { return 'BLOQ_' + String(id).slice(0, 60); }
function lerBloqueio(id) {
  if (!id) return null;
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(chaveBloqueio(id)) || 'null'); } catch (e) { return null; }
}
function itensBloqueados() {
  const all = PropertiesService.getScriptProperties().getProperties(), out = {};
  Object.keys(all).forEach(k => { if (k.indexOf('BLOQ_') === 0) { try { const b = JSON.parse(all[k]); if (b && b.itemId) out[b.itemId] = b; } catch (e) {} } });
  return out;
}
function bloquearItem(info, conta) {
  if (lerBloqueio(info.itemId)) return false; // já bloqueado: mantém o primeiro registro
  const b = Object.assign({ desde: agoraSeg() }, info);
  b.motivo = texto(b.motivo, 300);
  PropertiesService.getScriptProperties().setProperty(chaveBloqueio(b.itemId), JSON.stringify(b));
  auditar(conta || SISTEMA, 'Item bloqueado', [b.itemCodigo, b.itemNome, '(' + b.itemId + ')', '·', b.motivo,
    b.saldoSistema !== undefined ? '· saldo do sistema ' + fmt(b.saldoSistema) : '', b.saldoPlanilha !== undefined ? '· saldo na planilha ' + fmt(b.saldoPlanilha) : '']
    .filter(Boolean).join(' '), 'Bloqueado');
  return true;
}
function exigirItemLivre(id, nomeItem) {
  const b = lerBloqueio(id);
  if (b) throw falha('O item ' + (nomeItem || b.itemNome || '') + ' está bloqueado para alterações: ' + b.motivo + ' A Administração precisa revisar e liberar o item.');
}

// --- retrato dos saldos gravados pelo sistema (propriedades SALDOS_0, SALDOS_1… em pedaços de 8 mil caracteres) ---
function lerRetrato() {
  const p = PropertiesService.getScriptProperties();
  const n = Number(p.getProperty('SALDOS_N') || 0);
  if (!n) return null;
  let txt = '';
  for (let i = 0; i < n; i++) txt += p.getProperty('SALDOS_' + i) || '';
  try { return JSON.parse(txt); } catch (e) { return null; }
}
function gravarRetrato(mapa) {
  const p = PropertiesService.getScriptProperties();
  const txt = JSON.stringify(mapa);
  const antes = Number(p.getProperty('SALDOS_N') || 0);
  const partes = [];
  for (let i = 0; i < txt.length; i += RECUP.pedaco) partes.push(txt.slice(i, i + RECUP.pedaco));
  if (!partes.length) partes.push('{}');
  partes.forEach((x, i) => { if (p.getProperty('SALDOS_' + i) !== x) p.setProperty('SALDOS_' + i, x); });
  for (let i = partes.length; i < antes; i++) p.deleteProperty('SALDOS_' + i);
  if (antes !== partes.length) p.setProperty('SALDOS_N', String(partes.length));
}
function saldosAtuais() {
  const out = {};
  linhas(tabela('itens')).forEach(it => { out[it.id] = { q: arred(Number(it.qtd) || 0), codigo: it.codigo, nome: it.nome }; });
  return out;
}
// compara a planilha com o retrato: diferença = item bloqueado. "ignorar" = itens que a recuperação acabou de acertar.
function conferirSaldos(ignorar, conta) {
  const atual = saldosAtuais();
  const ret = lerRetrato();
  const mapa = {};
  Object.keys(atual).forEach(id => { mapa[id] = atual[id].q; });
  if (!ret) { gravarRetrato(mapa); return { bloqueados: [], removidos: [], inicial: true }; }
  const bloq = itensBloqueados(), novos = [], removidos = [];
  Object.keys(atual).forEach(id => {
    if ((ignorar && ignorar[id]) || bloq[id]) return;
    const antes = id in ret ? arred(Number(ret[id]) || 0) : 0, agora = atual[id].q;
    if (antes === agora) return;
    const fora = !(id in ret);
    bloquearItem({ itemId: id, itemCodigo: atual[id].codigo, itemNome: atual[id].nome, tipo: 'saldo_externo', saldoSistema: antes, saldoPlanilha: agora,
      motivo: fora ? 'o item apareceu na planilha com saldo ' + fmt(agora) + ' sem ter sido cadastrado pelo sistema.'
        : 'o saldo mudou de ' + fmt(antes) + ' para ' + fmt(agora) + ' fora do sistema (edição direta na planilha ou gravação interrompida).' }, conta);
    novos.push(id);
  });
  Object.keys(ret).forEach(id => {
    if (id in atual || arred(Number(ret[id]) || 0) === 0) return;
    removidos.push(id);
    auditar(conta || SISTEMA, 'Item sumiu da planilha', 'o item ' + id + ' tinha saldo ' + fmt(ret[id]) + ' e foi apagado fora do sistema. Confira a aba Itens e a cópia de segurança.', 'Alerta');
  });
  if (JSON.stringify(mapa) !== JSON.stringify(ret)) gravarRetrato(mapa);
  if (removidos.length) registrarAlerta('Itens apagados direto na planilha: ' + removidos.join(', ') + '.');
  return { bloqueados: novos, removidos };
}
// depois de uma gravação: o retrato passa a ser o saldo atual (todos os itens, ou só os que terminaram certo)
function atualizarRetrato(soEstes) {
  const atual = saldosAtuais();
  let mapa = {};
  if (soEstes) {
    mapa = lerRetrato() || {};
    Object.keys(soEstes).forEach(id => { if (id in atual) mapa[id] = atual[id].q; else delete mapa[id]; });
  } else Object.keys(atual).forEach(id => { mapa[id] = atual[id].q; });
  gravarRetrato(mapa);
}

// --- situação da verificação automática (mostrada para a Administração) ---
function registrarAlerta(txt) {
  const p = PropertiesService.getScriptProperties();
  let a; try { a = JSON.parse(p.getProperty('RECUP_ALERTAS') || '[]'); } catch (e) { a = []; }
  a.unshift({ em: agoraSeg(), txt: texto(txt, 300) });
  p.setProperty('RECUP_ALERTAS', JSON.stringify(a.slice(0, 10)));
}
function estadoIntegridade() {
  const p = PropertiesService.getScriptProperties();
  let est = null, alertas = [];
  try { est = JSON.parse(p.getProperty('RECUP_ESTADO') || 'null'); } catch (e) {}
  try { alertas = JSON.parse(p.getProperty('RECUP_ALERTAS') || '[]'); } catch (e) {}
  return { ultima: est, alertas };
}

// --- importação interrompida: a marca IMPORT_ANDAMENTO só fica se o script parou no meio ---
function conferirImportacaoInterrompida() {
  const p = PropertiesService.getScriptProperties();
  const raw = p.getProperty('IMPORT_ANDAMENTO');
  if (!raw) return null;
  let x; try { x = JSON.parse(raw); } catch (e) { x = {}; }
  const txt = 'A importação do lote ' + (x.lote || '?') + ' (' + (x.setor || '') + ', ' + (x.porNome || x.por || '') + ', ' + (x.em || '') + ') parou no meio. ' +
    'Nenhum saldo muda na importação; importe a mesma planilha de novo: itens já criados são reconhecidos e o histórico não se repete.';
  auditar(SISTEMA, 'Importação interrompida', txt, 'Alerta');
  registrarAlerta(txt);
  p.deleteProperty('IMPORT_ANDAMENTO');
  return x;
}

// Rotina agendada (acionador de tempo). Nunca roda junto com uma gravação: espera o mesmo bloqueio do doPost.
function recuperarOperacoesPendentes() {
  const p = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  const inicio = agoraSeg();
  if (!lock.tryLock(RECUP.esperaLockMs)) {
    p.setProperty('RECUP_ESTADO', JSON.stringify({ em: inicio, resultado: 'ocupado', txt: 'Sistema ocupado com outra gravação; tenta de novo na próxima rodada.' }));
    return 'ocupado';
  }
  AUDIT_DET = ''; AUDIT_FEITO = false; SALDO_OK = {};
  let est;
  try {
    const rec = reconciliarContagens(true);
    const imp = conferirImportacaoInterrompida();
    const sal = conferirSaldos(rec.itens, SISTEMA);
    SpreadsheetApp.flush();
    const bloq = Object.keys(itensBloqueados()).length;
    const partes = [];
    if (rec.n) partes.push(rec.n + ' aprovação(ões) interrompida(s) tratada(s)' + (rec.erros ? ', ' + rec.erros + ' com inconsistência' : ''));
    if (sal.bloqueados.length) partes.push(sal.bloqueados.length + ' item(ns) com saldo alterado fora do sistema');
    if (sal.removidos.length) partes.push(sal.removidos.length + ' item(ns) apagado(s) fora do sistema');
    if (imp) partes.push('importação interrompida (lote ' + (imp.lote || '?') + ')');
    const problema = rec.erros || sal.bloqueados.length || sal.removidos.length || imp;
    est = { em: inicio, resultado: problema ? 'atencao' : rec.n ? 'corrigido' : 'ok', bloqueados: bloq,
      txt: partes.length ? partes.join('; ') + '.' : 'Nenhuma operação pendente; saldos conferidos.' };
    if (partes.length) auditar(SISTEMA, 'Verificação automática', est.txt, problema ? 'Alerta' : 'Recuperado');
  } catch (e) {
    est = { em: inicio, resultado: 'erro', txt: 'Erro na verificação: ' + texto(e.message, 200) };
    auditar(SISTEMA, 'Verificação automática', est.txt, 'Erro');
  } finally {
    p.setProperty('RECUP_ESTADO', JSON.stringify(est));
    lock.releaseLock();
  }
  return est.resultado + ': ' + est.txt;
}

// Administração revisa e libera um item bloqueado
function itemLiberar(r, conta) {
  exigirAdministracao(conta);
  const id = String(r.itemId || '');
  const b = lerBloqueio(id);
  if (!b) throw falha('Este item não está bloqueado. Atualize a tela.');
  const motivo = texto(r.motivo, 300);
  if (!motivo) throw falha('Descreva o que foi conferido antes de liberar o item.');
  const op = r.op === 'restaurar' ? 'restaurar' : 'manter';
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === id);
  const q = it ? arred(Number(it.qtd) || 0) : null;
  if (it && contagemPendenteDoItem(linhas(tabela('cont')), id) && op === 'restaurar') throw falha('Decida antes o ajuste pendente deste item.');
  let det = '';
  if (op === 'restaurar') {
    if (b.tipo !== 'saldo_externo' || !it) throw falha('Aqui não há um saldo anterior do sistema para restaurar. Use "Manter o saldo atual".');
    gravar(ti, { qtd: arred(b.saldoSistema), atualizadoEm: agora() }, it._row);
    det = 'saldo restaurado de ' + fmt(q) + ' para ' + fmt(b.saldoSistema) + ' (valor gravado pelo sistema)';
  } else if (b.tipo === 'saldo_externo' && it && q !== arred(b.saldoSistema)) {
    // a diferença feita fora do sistema passa a constar no histórico como Ajuste decidido pela Administração
    const delta = arred(q - b.saldoSistema);
    gravar(tabela('movs'), {
      id: novoId('M'), data: hoje(), tipo: TIPOS.ajuste, itemId: id, itemCodigo: it.codigo, itemNome: it.nome, qtd: Math.abs(delta), unidade: it.unidade, delta,
      responsavel: conta.nome, motivo: ('Alteração feita fora do sistema mantida pela Administração: ' + motivo).slice(0, 300),
      obs: ('Saldo do sistema ' + fmt(b.saldoSistema) + ', encontrado ' + fmt(q) + ' em ' + b.desde).slice(0, 300),
      registradoPor: conta.nome, criadoEm: agoraSeg(), saldoAnterior: b.saldoSistema, saldoFinal: q, aprovadoPor: conta.nome
    });
    det = 'saldo ' + fmt(q) + ' mantido; Ajuste de ' + (delta > 0 ? '+' : '') + fmt(delta) + ' registrado no histórico';
  } else det = it ? 'saldo atual ' + fmt(q) + ' mantido' : 'item não existe mais no cadastro';
  PropertiesService.getScriptProperties().deleteProperty(chaveBloqueio(id));
  SALDO_OK[id] = true;
  auditar(conta, 'Item liberado', (b.itemCodigo || '') + ' ' + (b.itemNome || '') + ' (' + id + ') · bloqueado em ' + b.desde + ': ' + b.motivo + ' · ' + det + ' · conferência: ' + motivo, 'Liberado');
  AUDIT_FEITO = true;
  return 'Item liberado: ' + det + '.';
}

// Onde o acionador pode ser instalado. Só lê; nada é removido nem criado aqui.
//  - Planilha oficial: só com autorização explícita (propriedade LIBERAR_ACIONADOR_OFICIAL = "sim",
//    criada à mão depois da autorização para levar a versão à produção) e sem a marca de homologação.
//  - Qualquer outra planilha: só a cópia de homologação, com as quatro conferências:
//    AMBIENTE exatamente "homologacao", HOMOLOG_PLANILHA_ID igual ao ID da planilha ativa,
//    nome com "HOMOLOGAÇÃO" e ID diferente do da oficial.
function ambienteDoAcionador() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  const id = String(ss.getId());
  const nome = String(ss.getName() || '');
  const ambiente = props.getProperty('AMBIENTE');
  const erros = [];
  if (id === PLANILHA_OFICIAL) {
    if (ambiente === 'homologacao') erros.push('A planilha oficial está com a propriedade AMBIENTE = "homologacao". Corrija as propriedades antes de qualquer instalação.');
    if (props.getProperty('LIBERAR_ACIONADOR_OFICIAL') !== 'sim') erros.push('Esta é a planilha oficial do condomínio. O acionador só pode ser instalado aqui com autorização (propriedade LIBERAR_ACIONADOR_OFICIAL = "sim"; veja o README).');
    return { modo: 'produção', id, nome, erros };
  }
  if (ambiente !== 'homologacao') erros.push('A propriedade AMBIENTE não é exatamente "homologacao" (está ' + (ambiente === null ? 'ausente' : '"' + ambiente + '"') + ').');
  if (props.getProperty('HOMOLOG_PLANILHA_ID') !== id) erros.push('A propriedade HOMOLOG_PLANILHA_ID não corresponde ao ID desta planilha (' + id + ').');
  if (nome.toUpperCase().indexOf('HOMOLOGAÇÃO') < 0) erros.push('O nome da planilha ("' + nome + '") não contém "HOMOLOGAÇÃO".');
  if (id === PLANILHA_OFICIAL) erros.push('O ID é o da planilha oficial.');
  return { modo: 'homologação', id, nome, erros };
}

// Instala o acionador de tempo da verificação automática. Rode pelo editor, à mão.
// Todas as conferências de ambienteDoAcionador() vêm antes de remover ou criar qualquer acionador.
function instalarRecuperacao() {
  const amb = ambienteDoAcionador();
  if (amb.erros.length) {
    const txt = 'Acionador NÃO instalado. Nenhum acionador foi removido ou criado.\n - ' + amb.erros.join('\n - ');
    Logger.log(txt);
    throw new Error(txt);
  }
  removerRecuperacao();
  ScriptApp.newTrigger('recuperarOperacoesPendentes').timeBased().everyMinutes(RECUP.minutos).create();
  auditar(SISTEMA, 'Verificação automática', 'Acionador instalado (' + amb.modo + ', a cada ' + RECUP.minutos + ' minutos) na planilha ' + amb.nome + ' (' + amb.id + ').', 'OK');
  const r = recuperarOperacoesPendentes();
  Logger.log('Verificação automática instalada (' + amb.modo + '): roda a cada ' + RECUP.minutos + ' minutos. Primeira rodada: ' + r);
  return r;
}
function ScriptAppTemAcionador() {
  try { return ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'recuperarOperacoesPendentes'); } catch (e) { return false; }
}
function removerRecuperacao() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'recuperarOperacoesPendentes') { ScriptApp.deleteTrigger(t); n++; } });
  Logger.log(n ? n + ' acionador(es) da verificação automática removido(s).' : 'Não havia acionador da verificação automática.');
  return n;
}

// ---------- histórico de acessos ----------

const ACESSO_TIPOS = { login: 'Entrou com senha', retorno: 'Voltou ao sistema', falha: 'Senha errada', bloqueado: 'Login bloqueado' };

// Grava uma linha na aba Acessos. Nunca impede a entrada: se der erro, só não registra.
function registrarAcesso(conta, usuarioDigitado, reg) {
  try {
    const t = tabela('acessos');
    const motivo = conta ? (reg.motivo === 'login' ? 'login' : 'retorno') : (reg.motivo === 'bloqueado' ? 'bloqueado' : 'falha');
    gravar(t, {
      id: novoId('ac'), quando: agora(), usuario: texto(usuarioDigitado, 40).toLowerCase(),
      nome: conta ? conta.nome : '', perfil: conta ? conta.perfil : '',
      entrada: texto(reg.entrada, 30), aparelho: texto(reg.aparelho, 80), tipo: ACESSO_TIPOS[motivo]
    });
  } catch (e) { /* o registro do acesso não pode atrapalhar a entrada */ }
}

function lerAcessos(dias) {
  const t = tabela('acessos');
  const ultima = t.sh.getLastRow();
  if (ultima < 2) return [];
  const n = Math.min(ultima - 1, 5000);
  const vals = t.sh.getRange(ultima - n + 1, 1, n, t.ncol).getValues();
  const corte = Number(dias) > 0 ? Utilities.formatDate(new Date(Date.now() - Number(dias) * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
  const porNome = Object.keys(ACESSO_TIPOS).reduce((m, k) => { m[ACESSO_TIPOS[k]] = k; return m; }, {});
  const out = [];
  for (let i = vals.length - 1; i >= 0; i--) {
    const r = vals[i];
    const quando = r[t.idx.quando] instanceof Date ? Utilities.formatDate(r[t.idx.quando], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : String(r[t.idx.quando]);
    if (!r[t.idx.id]) continue;
    if (corte && quando.slice(0, 10) < corte) continue;
    out.push({ quando, usuario: String(r[t.idx.usuario]), nome: String(r[t.idx.nome]), perfil: String(r[t.idx.perfil]),
      entrada: String(r[t.idx.entrada]), aparelho: String(r[t.idx.aparelho]), motivo: porNome[String(r[t.idx.tipo])] || 'retorno' });
  }
  return out;
}

function ehSindico(conta) {
  return String((conta && conta.perfil) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().indexOf('sindico') >= 0;
}

// Perfil "Síndico": só o controle de pendências, com acesso completo (criado uma vez só)
function garantirSindico() {
  if (lerPerfis()['Síndico']) return '';
  salvarPerfil({ nome: 'Síndico', perms: { pendencias: true } });
  return ' Perfil Síndico criado.';
}


function celula(v, isNum) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (isNum) { if (v === '' || v === null) return ''; const n = Number(v); return isNaN(n) ? '' : n; }
  return v === null || v === undefined ? '' : String(v);
}

function texto(v, max) {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return max ? s.slice(0, max) : s;
}

function numero(v) {
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  return Number(s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s);
}

function arred(n) { return Math.round(n * 1000) / 1000; }
function fmt(n) { return String(arred(n)).replace('.', ','); }
function hoje() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function agora() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); }
function agoraSeg() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }
function dataValida(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : hoje(); }
function novoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function proxCodigo(todos, prefixo) {
  prefixo = prefixo || 'MAN-';
  let max = 0;
  todos.forEach(it => {
    const c = String(it.codigo || '');
    if (prefixo !== 'MAN-' && c.toUpperCase().indexOf(prefixo) !== 0) return;
    const m = /(\d+)\s*$/.exec(c); if (m) max = Math.max(max, Number(m[1]));
  });
  return prefixo + ('000' + (max + 1)).slice(prefixo === 'MAN-' ? -4 : -3);
}

function falha(msg) { const e = new Error(msg); e.paraUsuario = true; return e; }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
