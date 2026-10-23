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
      ['os', 'OS'], ['nfFotos', 'Foto da NF']
    ],
    num: ['qtd', 'delta', 'valorUnit'],
    opcionais: ['os', 'nfFotos']
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
      ['concluidoEm', 'Concluída em'], ['prazoDefinidoEm', 'Prazo definido em'], ['prazoDefinidoPor', 'Prazo definido por'],
      ['criadaEm', 'Incluída em'], ['prazoAtualizado', 'Atualização de prazo'],
      ['aprovacao', 'Aprovação'], ['aprovGerente', 'Aprovada pelo gerente'], ['aprovSindico', 'Aprovada pelo síndico'],
      ['conclPedida', 'Conclusão pedida'], ['conclData', 'Data de conclusão informada'],
      ['conclGerente', 'Conclusão aprovada pelo gerente'], ['conclSindico', 'Conclusão aprovada pelo síndico']
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
  devolucao: 'Devolução', ajuste: 'Ajuste', estorno: 'Estorno'
};
const TIPO_POR_NOME = Object.keys(TIPOS).reduce((m, k) => { m[TIPOS[k]] = k; return m; }, {});

// ---------- entrada da web ----------

const VERSAO = '2026-10-15 segurança 2';

function doGet() {
  return json({ ok: true, app: 'Pier Gestão', versao: VERSAO });
}

function doPost(e) {
  AUDIT_DET = '';
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, erro: 'Pedido inválido.' }); }
  let conta = null;
  try {
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
    if (req.acao === 'pendencias') { pode('pendencias'); return json(Object.assign(base, { pendencias: pendLista(), pendVersao: PEND_VERSAO })); }
    if (req.acao === 'nfVer') { algum(['historico_ver', 'registrar_entrada', 'dashboard']); const f = verArquivo(req.fotoId, pastaNF()); auditar(conta, 'Abriu nota fiscal', f.nome); delete f.nome; return json(Object.assign(base, { foto: f })); }
    if (req.acao === 'nfEnviar') { pode('registrar_entrada'); return json(Object.assign(base, { arquivo: nfEnviar(req, conta) })); }
    if (req.acao === 'osFotoVer') { algum(['os_ver', 'os_abrir', 'os_atender', 'os_gerenciar']); const f = verFoto(req.fotoId); delete f.nome; return json(Object.assign(base, { foto: f })); }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw falha('O sistema está ocupado com outro registro. Tente de novo em alguns segundos.');
    let msg, extra = {};
    try {
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
      auditar(conta, ACOES_AUDIT[req.acao] || req.acao, resumoAuditoria(req, msg));
    } finally {
      lock.releaseLock();
    }
    if (extra.pendencias) return json(Object.assign(base, { msg, pendencias: pendLista(), pendVersao: PEND_VERSAO }));
    if (extra.equipe) return json(Object.assign(base, { msg }, extra));
    return json(Object.assign(base, { msg, dados: dados(req.meses, conta) }, extra));
  } catch (err) {
    // tentativas sem permissão ficam no histórico de auditoria
    if (conta && (err.negado || /não tem permissão/i.test(String(err.message)))) auditar(conta, ACOES_AUDIT[req.acao] || String(req.acao || ''), String(err.message), 'Negado');
    return json({ ok: false, erro: err.paraUsuario ? err.message : 'Erro no servidor: ' + err.message });
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
  if (osNum) osRegistrarAndamento(osNum, nome, 'Material: ' + fmt(qtd) + ' ' + it.unidade + ' de ' + it.nome + ' (' + TIPOS[tipo].toLowerCase() + ')');
  return TIPOS[tipo] + (tipo === 'emprestimo' ? ' registrado: ' : ' registrada: ') + fmt(qtd) + ' ' + it.unidade + ' de ' + it.nome + (osNum ? ' · ' + osNum : '') + (nfLinks ? ' · nota fiscal anexada' : '') + '.';
}

function devolver(r, nome, conta) {
  const te = tabela('emp');
  const e = linhas(te).find(x => x.id === r.emprestimoId);
  if (!e) throw falha('Este empréstimo já foi encerrado. Atualize a página.');
  const itE = linhas(tabela('itens')).find(x => x.id === e.itemId);
  if (itE) exigirSetor(conta, setorDe(itE));
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
  if (anterior) exigirSetor(conta, setorDe(anterior));
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

  if (!v.id) {
    const id = novoId('I');
    gravar(ti, Object.assign({ id, qtd, criadoEm: agora() }, base));
    if (qtd > 0) {
      gravar(tabela('movs'), {
        id: novoId('M'), data: hoje(), tipo: TIPOS.ajuste, itemId: id, itemCodigo: codigo, itemNome: nomeItem,
        qtd, unidade: base.unidade, delta: qtd, motivo: 'Cadastro com estoque inicial', registradoPor: nome, criadoEm: agora()
      });
    }
    return 'Item cadastrado: ' + nomeItem + '.';
  }

  const it = todos.find(x => x.id === v.id);
  if (!it) throw falha('Item não encontrado. Atualize a página.');
  const atual = Number(it.qtd) || 0;
  if (qtd !== atual) {
    const motivo = texto(r.motivo, 160);
    if (!motivo) throw falha('Explique o motivo da mudança no estoque.');
    base.qtd = qtd;
    gravar(tabela('movs'), {
      id: novoId('M'), data: hoje(), tipo: TIPOS.ajuste, itemId: it.id, itemCodigo: codigo, itemNome: nomeItem,
      qtd: Math.abs(arred(qtd - atual)), unidade: base.unidade, delta: arred(qtd - atual),
      motivo: motivo + ' (de ' + fmt(atual) + ' para ' + fmt(qtd) + ')', registradoPor: nome, criadoEm: agora()
    });
  }
  gravar(ti, base, it._row);
  return 'Alterações salvas.';
}

function excluirItem(id, conta) {
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === id);
  if (!it) throw falha('Item não encontrado.');
  exigirSetor(conta, setorDe(it));
  ti.sh.deleteRow(it._row);
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
  const inv = -(Number(m.delta) || 0);
  const ti = tabela('itens');
  const it = linhas(ti).find(x => x.id === m.itemId);
  if (it) exigirSetor(conta, setorDe(it));
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
  ['itens_editar', 'Editar itens', 'Editar, ajustar estoque e excluir itens', 'Cadastro'],
  ['historico_estornar', 'Estornar', 'Estornar lançamentos', 'Controle'],
  ['exportar', 'Exportar', 'Exportar planilhas', 'Controle'],
  ['usuarios', 'Usuários', 'Gerenciar usuários e permissões', 'Controle'],
  ['pendencias', 'Pendências', 'Ver e atualizar o controle de pendências do síndico (menu Administração)', 'Administração'],
  ['acessos', 'Histórico de acessos', 'Ver quem entrou no sistema, quando e de qual aparelho (menu Administração)', 'Administração']
];
const PADRAO_MANUTENCAO = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada',
  'registrar_troca', 'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'os_ver', 'os_abrir', 'os_atender', 'dem_ver', 'dem_executar',
  'setor_manutencao'];
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
  return { usuario: us.usuario, nome: us.nome || us.usuario, perfil: us.perfil, perms };
}

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
  const lista = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const usuario = String(r[c['Usuário']]).trim().toLowerCase();
    if (!/^[a-z0-9._@-]{2,40}$/.test(usuario)) continue;
    lista.push({
      row: i + 1, usuario, nome: texto(r[c['Nome']], 60), senha: String(r[c['Senha']]).trim(),
      perfil: String(r[c['Perfil']]).trim(), ativo: String(r[c['Ativo']]).trim().toLowerCase().indexOf('n') !== 0,
      telefone: c['Telefone'] >= 0 ? String(r[c['Telefone']]).replace(/\D/g, '') : ''
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
    if (m.estornado || m.tipo === 'estorno') return;
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
  if (!conta.perms.itens_cadastrar && entrada.some(l => !l.codigo)) throw falha('Seu perfil não pode cadastrar itens novos.');

  // cópia de segurança da aba Itens antes de qualquer mudança
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH.mm.ss');
  let nomeCopia = 'Itens (cópia de ' + stamp + ')', k2 = 2;
  while (ss.getSheetByName(nomeCopia)) nomeCopia = 'Itens (cópia de ' + stamp + ' ' + (k2++) + ')';
  ti.sh.copyTo(ss).setName(nomeCopia).hideSheet();

  const n = ti.sh.getLastRow() - 1;
  const vals = n > 0 ? ti.sh.getRange(2, 1, n, ti.ncol).getValues() : [];
  const I = ti.idx;
  const porCodigo = {};
  vals.forEach((row, i) => { const c = String(row[I.codigo]).trim().toUpperCase(); if (c && String(row[I.id])) porCodigo[c] = i; });
  const setorDaLinha = row => setorDe({ setor: row[I.setor] });
  let maxNum = 0;
  vals.forEach(row => {
    const c = String(row[I.codigo]);
    if (prefixo !== 'MAN-' && c.toUpperCase().indexOf(prefixo) !== 0) return;
    const x = /(\d+)\s*$/.exec(c); if (x) maxNum = Math.max(maxNum, Number(x[1]));
  });
  // os códigos que já vêm na planilha também contam, para o automático não repetir nenhum
  entrada.forEach(l => {
    const c = texto(l.codigo, 30);
    if (!c || (prefixo !== 'MAN-' && c.toUpperCase().indexOf(prefixo) !== 0)) return;
    const x = /(\d+)\s*$/.exec(c); if (x) maxNum = Math.max(maxNum, Number(x[1]));
  });

  const usados = {}, novos = [], movs = [], mantidas = {};
  let atualizados = 0, criados = 0, iguais = 0;
  const ag = agora(), dia = hoje();

  // histórico da planilha (compras e retiradas já anotadas lá): entra com a data original,
  // e o estoque inicial do item é o saldo menos esse histórico, para o saldo final continuar igual
  const MARCA = 'Histórico da planilha';
  const normNome = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const hist = (Array.isArray(r.historico) ? r.historico : []).slice(0, 5000).map(h => ({
    tipo: h.tipo === 'saida' ? 'saida' : 'entrada', data: dataValida(h.data), nome: texto(h.nome, 160), qtd: numero(h.qtd),
    fornecedor: texto(h.fornecedor, 120), nf: texto(h.nf, 40), valorUnit: h.valorUnit === '' || h.valorUnit == null ? '' : numero(h.valorUnit),
    responsavel: texto(h.responsavel, 80), destino: texto(h.destino, 120), obs: texto(h.obs, 250)
  })).filter(h => h.nome && h.qtd > 0 && isFinite(h.qtd));
  const linhaPorNome = {};
  entrada.forEach((l, k) => { const kn = normNome(l.nome); if (!(kn in linhaPorNome)) linhaPorNome[kn] = k; });
  const histPorLinha = {};
  let histSemItem = 0;
  hist.forEach(h => { const k = linhaPorNome[normNome(h.nome)]; if (k === undefined) { histSemItem++; return; } (histPorLinha[k] = histPorLinha[k] || []).push(h); });
  const jaLancado = {};
  if (hist.length) linhas(tabela('movs')).forEach(m => { if (String(m.obs).indexOf(MARCA) === 0) jaLancado[[m.itemId, m.tipo, m.data, arred(Number(m.qtd))].join('|')] = true; });
  const histNovo = (k, itemId) => (histPorLinha[k] || []).filter(h => !jaLancado[[itemId, h.tipo, h.data, arred(h.qtd)].join('|')]);
  const somaHist = lista => lista.reduce((t, h) => t + (h.tipo === 'entrada' ? h.qtd : -h.qtd), 0);
  const dataAjuste = /^\d{4}-\d{2}-\d{2}$/.test(String(r.dataAjuste || '')) && String(r.dataAjuste) < dia ? String(r.dataAjuste) : dia;
  const pendentes = [];
  let histLancado = 0;

  const mov = (it, delta, mot, data) => movs.push({
    id: novoId('M'), data: data || dia, tipo: TIPOS.ajuste, itemId: it.id, itemCodigo: it.codigo, itemNome: it.nome,
    qtd: Math.abs(arred(delta)), unidade: it.unidade, delta: arred(delta), motivo: mot, obs: 'Importação de inventário',
    registradoPor: conta.nome, criadoEm: ag
  });

  entrada.forEach((l, k) => {
    const nome = texto(l.nome, 160);
    if (!nome) throw falha('Linha ' + (k + 1) + ': falta o nome do item.');
    const qtd = numero(l.qtd === '' || l.qtd == null ? 0 : l.qtd);
    if (!(qtd >= 0)) throw falha('Linha ' + (k + 1) + ' (' + nome + '): quantidade inválida.');
    let codigo = texto(l.codigo, 30);
    const chave = codigo.toUpperCase();
    if (chave && usados[chave]) throw falha('O código ' + codigo + ' aparece mais de uma vez na planilha.');
    if (chave) usados[chave] = true;
    const campos = {
      nome, categoria: texto(l.categoria, 60), tipoItem: texto(l.tipoItem, 40), unidade: texto(l.unidade, 15),
      local: texto(l.local, 60), obs: texto(l.obs, 300)
    };
    const minimo = l.minimo === '' || l.minimo == null ? null : numero(l.minimo);
    const i = chave ? porCodigo[chave] : undefined;
    if (i !== undefined && setorDaLinha(vals[i]) !== setor) {
      throw falha('O código ' + codigo + ' já é usado por "' + vals[i][I.nome] + '" no setor ' + setorDaLinha(vals[i]) + '. Mude o código na planilha.');
    }
    if (i !== undefined) {
      const row = vals[i];
      mantidas[i] = true;
      Object.keys(campos).forEach(c => { if (campos[c]) row[I[c]] = campos[c]; });
      if (minimo !== null && minimo >= 0) row[I.minimo] = minimo;
      const antes = Number(row[I.qtd]) || 0;
      row[I.atualizadoEm] = ag;
      const itx = { id: String(row[I.id]), codigo: String(row[I.codigo]), nome: String(row[I.nome]), unidade: String(row[I.unidade]) };
      const hn = histNovo(k, itx.id), base = arred(qtd - somaHist(hn));
      if (hn.length) pendentes.push({ it: itx, lista: hn });
      if (arred(base) !== arred(antes)) mov(itx, base - antes, motivo + ' (de ' + fmt(antes) + ' para ' + fmt(base) + ')');
      if (arred(qtd) !== arred(antes)) { row[I.qtd] = qtd; atualizados++; } else iguais++;
    } else {
      if (!codigo) { maxNum++; codigo = prefixo + ('000' + maxNum).slice(prefixo === 'MAN-' ? -4 : -3); }
      const row = new Array(ti.ncol).fill('');
      const id = novoId('I');
      row[I.id] = id; row[I.codigo] = codigo;
      Object.keys(campos).forEach(c => { row[I[c]] = campos[c]; });
      if (!row[I.unidade]) row[I.unidade] = 'un';
      row[I.qtd] = qtd; row[I.minimo] = minimo !== null && minimo >= 0 ? minimo : 0;
      row[I.criadoEm] = ag; row[I.atualizadoEm] = ag; row[I.setor] = setor;
      novos.push(row); criados++;
      const itx = { id, codigo, nome, unidade: row[I.unidade] };
      const hn = histNovo(k, id), base = arred(qtd - somaHist(hn));
      if (hn.length) pendentes.push({ it: itx, lista: hn });
      if (base !== 0) mov(itx, base, motivo + ' (item novo)', hn.length ? dataAjuste : dia);
    }
  });

  // lançamentos do histórico, com a data, o fornecedor e o valor que estavam na planilha
  pendentes.forEach(p => p.lista.forEach(h => {
    movs.push({
      id: novoId('M'), data: h.data, tipo: TIPOS[h.tipo], itemId: p.it.id, itemCodigo: p.it.codigo, itemNome: p.it.nome,
      qtd: h.qtd, unidade: p.it.unidade, delta: h.tipo === 'entrada' ? h.qtd : -h.qtd,
      responsavel: h.responsavel, destino: h.destino, fornecedor: h.fornecedor, nf: h.nf, valorUnit: h.valorUnit,
      obs: (MARCA + (h.obs ? ': ' + h.obs : '')).slice(0, 300), registradoPor: conta.nome, criadoEm: ag
    });
    histLancado++;
  }));

  let removidos = 0;
  let final = vals;
  if (substituir) {
    final = [];
    vals.forEach((row, i) => {
      // só sai do cadastro o que é do mesmo setor da planilha importada
      if (mantidas[i] || !String(row[I.id]) || setorDaLinha(row) !== setor) { if (String(row[I.id])) final.push(row); return; }
      removidos++;
      const q = Number(row[I.qtd]) || 0;
      if (q) mov({ id: String(row[I.id]), codigo: String(row[I.codigo]), nome: String(row[I.nome]), unidade: String(row[I.unidade]) },
        -q, 'Saiu do cadastro na importação: ' + motivo);
    });
  }
  final = final.concat(novos);

  // grava a aba Itens de uma vez só
  if (n > 0) ti.sh.getRange(2, 1, n, ti.ncol).clearContent();
  if (final.length) {
    const fmts = final.map(() => ti.def.cols.reduce((f, c) => { f[ti.idx[c[0]]] = ti.def.num.indexOf(c[0]) >= 0 ? 'General' : '@'; return f; }, new Array(ti.ncol).fill('@')));
    const rng = ti.sh.getRange(2, 1, final.length, ti.ncol);
    rng.setNumberFormats(fmts);
    rng.setValues(final.map(row => row.map((v, j) => {
      const c = ti.def.cols.find(x => ti.idx[x[0]] === j);
      if (c && ti.def.num.indexOf(c[0]) >= 0) return v === '' ? '' : Number(v);
      return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : String(v);
    })));
  }

  // grava os ajustes na aba Movimentacoes de uma vez só
  if (movs.length) {
    const tm = tabela('movs');
    const linhasMov = movs.map(m => {
      const row = new Array(tm.ncol).fill('');
      tm.def.cols.forEach(([k]) => { if (k in m) row[tm.idx[k]] = m[k]; });
      return row;
    });
    const fmts = linhasMov.map(() => tm.def.cols.reduce((f, c) => { f[tm.idx[c[0]]] = tm.def.num.indexOf(c[0]) >= 0 ? 'General' : '@'; return f; }, new Array(tm.ncol).fill('@')));
    const rng = tm.sh.getRange(tm.sh.getLastRow() + 1, 1, linhasMov.length, tm.ncol);
    rng.setNumberFormats(fmts);
    rng.setValues(linhasMov);
  }

  const partes = [];
  if (atualizados) partes.push(atualizados + ' com quantidade nova');
  if (criados) partes.push(criados + ' novos');
  if (iguais) partes.push(iguais + ' sem mudança');
  if (removidos) partes.push(removidos + ' saíram do cadastro');
  if (histLancado) partes.push(histLancado + ' lançamentos do histórico da planilha');
  if (histSemItem) partes.push(histSemItem + ' linhas do histórico sem item correspondente (não lançadas)');
  return 'Inventário de ' + setor + ' importado: ' + partes.join(', ') + '. Cópia da lista anterior guardada na aba oculta "' + nomeCopia + '".';
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
  const limpeza = garantirLimpeza() + garantirSindico() + garantirGerente();
  abaEmails();
  Logger.log('E-mail: ' + MailApp.getRemainingDailyQuota() + ' envios disponíveis hoje (a permissão de enviar e-mail fica autorizada).');
  const senhas = migrarSenhas();
  protegerAbas();
  const arquivos = verificarArquivos();
  Logger.log('Pronto: pastas de fotos e de notas fiscais, abas OS, Demandas, Preventivas, Pendencias e Emails, setores e permissões verificadas.' + limpeza);
  Logger.log('Segurança: ' + senhas + ' ' + arquivos);
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
// 2: prazo inicial (só o síndico altera depois de definido), atualização de prazo, data de conclusão obrigatória,
//    aprovação do gerente e do síndico na inclusão e na conclusão, aviso por e-mail ao incluir
const PEND_VERSAO = 2;
const pendAguardando = p => !!p && (p.aprovacao === 'Aguardando gerente' || p.aprovacao === 'Aguardando síndico');
const pendConclPendente = p => !!p && !!String(p.conclPedida || '').trim() && p.status !== 'Concluído';
const pendRotuloSecao = s => String(s || '').indexOf('Cotações e compras') === 0 ? 'Cotações e compras' : String(s || '');

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
      concluidoEm: p.concluidoEm, prazoDefinidoEm: p.prazoDefinidoEm, prazoDefinidoPor: p.prazoDefinidoPor,
      criadaEm: p.criadaEm, prazoAtualizado: p.prazoAtualizado, aprovacao: p.aprovacao, aprovGerente: p.aprovGerente,
      aprovSindico: p.aprovSindico, conclPedida: p.conclPedida, conclData: p.conclData, conclGerente: p.conclGerente,
      conclSindico: p.conclSindico }))
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
  const sindico = ehSindico(conta), gerente = ehGerente(conta);
  const obj = { atualizadoEm: agora(), atualizadoPor: conta.nome };
  let pedidoConclusao = false, prazoPeloSindico = false;
  // o que o síndico inclui fica destacado para a administração até alguém da equipe dar ciente ou mexer nele
  if (atual && atual.origem === 'Síndico' && !atual.vistaEm && !sindico) { obj.vistaEm = agora(); obj.vistaPor = conta.nome; }
  if (atual && v.ciente) {
    if (sindico) throw falha('O ciente é dado pela administração.');
    if (!obj.vistaEm) return 'Esta pendência já estava vista.';
    gravar(t, { vistaEm: obj.vistaEm, vistaPor: obj.vistaPor }, atual._row);
    return 'Ciente registrado.';
  }
  // aprovações: primeiro o gerente, depois o síndico (o síndico pode aprovar em nome do gerente; o gerente não aprova pelo síndico)
  if (atual && (v.aprovar || v.recusarConclusao)) return pendAprovar(t, atual, v, conta, obj);
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
      else if (sindico) { obj.prazoDefinidoEm = agora(); obj.prazoDefinidoPor = conta.nome; prazoPeloSindico = true; }
      else throw falha('O prazo inicial desta pendência está bloqueado (' + prazoAntes.split('-').reverse().join('/') + '). Só o síndico pode alterar. Para registrar uma nova data, use "Atualização de prazo".');
    }
    if (!constFinal && obj.prazo && (!atual || !prazoAntes || atual.tipo === 'Constante')) { obj.prazoDefinidoEm = agora(); obj.prazoDefinidoPor = conta.nome; }
  }
  if ('concluidoEm' in v) {
    obj.concluidoEm = /^\d{4}-\d{2}-\d{2}$/.test(String(v.concluidoEm || '')) ? String(v.concluidoEm) : '';
    if (obj.concluidoEm && obj.concluidoEm > hoje()) throw falha('A data de conclusão não pode ser depois de hoje.');
  }
  if ('obs' in v) obj.obs = texto(v.obs, 1000);
  if ('prazoAtualizado' in v) obj.prazoAtualizado = /^\d{4}-\d{2}-\d{2}$/.test(String(v.prazoAtualizado || '')) ? String(v.prazoAtualizado) : '';
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
    // conclusão: exige a data e vira um pedido, que só conclui depois da aprovação do gerente e do síndico
    const stAntes = atual ? atual.status : '';
    const quer = obj.status === 'Concluído' || (!!obj.concluidoEm && !('status' in obj));
    if (!atual && quer) throw falha('Inclua a pendência primeiro. A conclusão é pedida depois e passa pela aprovação do gerente e do síndico.');
    if (atual && quer && stAntes !== 'Concluído') {
      if (pendAguardando(atual)) throw falha('Esta pendência ainda aguarda a aprovação de inclusão (gerente e síndico). A conclusão só pode ser pedida depois.');
      if (pendConclPendente(atual)) throw falha('A conclusão desta pendência já foi pedida e aguarda aprovação.');
      if (!obj.concluidoEm) throw falha('Informe a data de conclusão.');
      Object.assign(obj, { conclPedida: agora() + ' · ' + conta.nome, conclData: obj.concluidoEm, conclGerente: '', conclSindico: '' });
      delete obj.status; delete obj.concluidoEm;
      pedidoConclusao = true;
    } else if (atual && stAntes === 'Concluído' && obj.status && obj.status !== 'Concluído') {
      // reaberta: limpa a conclusão para poder pedir de novo
      Object.assign(obj, { concluidoEm: '', conclPedida: '', conclData: '', conclGerente: '', conclSindico: '' });
    } else if (atual && stAntes === 'Concluído' && 'concluidoEm' in obj) {
      if (!obj.concluidoEm) throw falha('A data de conclusão é obrigatória.');
      if (!gerente && !sindico) throw falha('A data de uma pendência já concluída só pode ser corrigida pelo gerente ou pelo síndico.');
    } else if ('concluidoEm' in obj && stAntes !== 'Concluído') delete obj.concluidoEm; // data só entra pela aprovação
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
    // responsável definido ou trocado depois pelo síndico ou pela Administração: o setor recebe o aviso
    const respNovo = 'responsavel' in obj ? String(obj.responsavel || '').trim() : '';
    const aviso = respNovo && respNovo !== String(atual.responsavel || '').trim() && (sindico || conta.perfil === PERFIL_TOTAL)
      ? pendAvisarResponsavel(Object.assign({}, atual, obj), conta) : '';
    const r = pendMsgAtualizacao(v, obj, atual, constFinal, pedidoConclusao, prazoPeloSindico);
    return r + aviso;
  }

  if (!obj.titulo) throw falha('Descreva a pendência.');

  // toda pendência nova (inclusive a do síndico) aguarda a aprovação do gerente e, em seguida, do síndico
  const comuns = { criadaPor: conta.nome, origem: sindico ? 'Síndico' : '', vistaEm: '', vistaPor: '', execucoes: '', ultimaVez: '',
    criadaEm: agora(), prazoAtualizado: obj.prazoAtualizado || '', aprovacao: 'Aguardando gerente', aprovGerente: '', aprovSindico: '',
    conclPedida: '', conclData: '', conclGerente: '', conclSindico: '' };
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
    return 'Subitem ' + (numero || '') + ' adicionado. Aguarda aprovação do gerente e do síndico.' + pendAvisarCriacao(obj, conta, pai);
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
  return (obj.tipo === 'Constante' ? 'Tarefa constante ' : 'Pendência ') + obj.numero + ' adicionada. Aguarda aprovação do gerente e do síndico.' + pendAvisarCriacao(obj, conta, null);
}

// mensagem de retorno de uma alteração
function pendMsgAtualizacao(v, obj, atual, constFinal, pedidoConclusao, prazoPeloSindico) {
  if (obj.secao) return 'Movida para ' + pendRotuloSecao(obj.secao) + ' como nº ' + obj.numero + '.';
  const dm = d => String(d).split('-').reverse().slice(0, 2).join('/');
  if (pedidoConclusao) return 'Conclusão pedida (' + dm(obj.conclData) + '). Falta a aprovação do gerente e do síndico.';
  if (prazoPeloSindico) return obj.prazo ? 'Prazo inicial alterado para ' + dm(obj.prazo) + ' pelo síndico.' : 'Prazo inicial retirado pelo síndico.';
  if ('prazoAtualizado' in v && Object.keys(v).length <= 2) return obj.prazoAtualizado ? 'Prazo atualizado para ' + dm(obj.prazoAtualizado) + '.' : 'Atualização de prazo retirada.';
  if (obj.prazoDefinidoEm && atual.tipo !== 'Constante' && !constFinal) return 'Prazo ' + dm(obj.prazo) + ' definido e bloqueado.';
  if ('concluidoEm' in v && obj.concluidoEm) return 'Concluída em ' + dm(obj.concluidoEm) + '.';
  if ('responsavel' in v && Object.keys(v).length <= 2) return 'Responsável: ' + (obj.responsavel || 'nenhum') + '.';
  return obj.status && 'status' in v ? 'Situação: ' + obj.status + '.' : 'criticidade' in v && Object.keys(v).length <= 2 ? 'Criticidade: ' + (obj.criticidade || 'sem definição') + '.' : 'Salvo.';
}

function pendAprovar(t, atual, v, conta, obj) {
  const sindico = ehSindico(conta), gerente = ehGerente(conta);
  const marca = emNome => agora() + ' · ' + conta.nome + (emNome ? ' (em nome do gerente)' : '');
  const dm = d => String(d).split('-').reverse().slice(0, 2).join('/');
  if (v.recusarConclusao) {
    if (!pendConclPendente(atual)) throw falha('Esta pendência não tem conclusão aguardando aprovação.');
    if (!gerente && !sindico) throw falha('Só o gerente ou o síndico podem recusar a conclusão.');
    Object.assign(obj, { conclPedida: '', conclData: '', conclGerente: '', conclSindico: '' });
    gravar(t, obj, atual._row);
    return 'Conclusão recusada. A pendência continua aberta.';
  }
  if (v.aprovar === 'inclusao') {
    if (atual.aprovacao === 'Aguardando gerente') {
      if (!gerente && !sindico) throw falha('Só o gerente (ou o síndico, em nome dele) aprova esta etapa.');
      Object.assign(obj, { aprovacao: 'Aguardando síndico', aprovGerente: marca(!gerente) });
      gravar(t, obj, atual._row);
      return 'Aprovada pelo gerente' + (gerente ? '' : ' (em nome dele)') + '. Falta a aprovação do síndico.';
    }
    if (atual.aprovacao === 'Aguardando síndico') {
      if (!sindico) throw falha('Só o síndico aprova esta etapa.');
      Object.assign(obj, { aprovacao: 'Aprovada', aprovSindico: marca(false) });
      gravar(t, obj, atual._row);
      return 'Pendência aprovada pelo síndico. Agora ela está válida.';
    }
    throw falha('Esta pendência não está aguardando aprovação.');
  }
  if (v.aprovar === 'conclusao') {
    if (!pendConclPendente(atual)) throw falha('Esta pendência não tem conclusão aguardando aprovação.');
    if (!String(atual.conclGerente || '').trim()) {
      if (!gerente && !sindico) throw falha('Só o gerente (ou o síndico, em nome dele) aprova esta etapa.');
      Object.assign(obj, { conclGerente: marca(!gerente) });
      gravar(t, obj, atual._row);
      return 'Conclusão aprovada pelo gerente' + (gerente ? '' : ' (em nome dele)') + '. Falta a aprovação do síndico.';
    }
    if (!sindico) throw falha('Só o síndico aprova esta etapa.');
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(atual.conclData || '')) ? String(atual.conclData) : hoje();
    Object.assign(obj, { conclSindico: marca(false), status: 'Concluído', concluidoEm: dia });
    gravar(t, obj, atual._row);
    return 'Conclusão aprovada. Pendência concluída em ' + dm(dia) + '.';
  }
  throw falha('Aprovação inválida.');
}

// ---------- aviso por e-mail ao incluir uma pendência ----------
// Os endereços ficam na aba "Emails" da planilha (coluna "Para": Gerente, Síndico ou o nome do responsável; coluna "E-mail").
const EMAILS_ABA = 'Emails';
const EMAILS_INICIAIS = [
  ['Gerente', 'Recebe o aviso de toda pendência nova'], ['Síndico', 'Recebe o aviso de toda pendência nova'],
  ['Supervisor', 'Recebe quando for o responsável'], ['Auxiliar', 'Recebe quando for o responsável'],
  ['Manutenção', 'Recebe quando for o responsável'], ['Limpeza', 'Recebe quando for o responsável'],
  ['Jardinagem', 'Recebe quando for o responsável'], ['Piscina', 'Recebe quando for o responsável'],
  ['Fornecedor', 'Recebe quando for o responsável']
];
const chaveNome = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

function abaEmails() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(EMAILS_ABA);
  if (!sh) {
    sh = ss.insertSheet(EMAILS_ABA);
    const vals = [['Para', 'E-mail', 'Observação']].concat(EMAILS_INICIAIS.map(x => [x[0], '', x[1]]));
    sh.getRange(1, 1, vals.length, 3).setValues(vals);
    sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

function lerEmails() {
  const sh = abaEmails();
  const n = sh.getLastRow();
  const mapa = {};
  if (n < 2) return mapa;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(r => {
    const k = chaveNome(r[0]); if (!k) return;
    const lista = String(r[1] || '').split(/[,;\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    mapa[k] = (mapa[k] || []).concat(lista);
  });
  return mapa;
}

// setor responsável definido depois pelo síndico ou pela Administração: avisa só o setor
function pendAvisarResponsavel(p, conta) {
  try {
    const resp = String(p.responsavel || '').trim();
    const dest = [];
    (lerEmails()[chaveNome(resp)] || []).forEach(e => { if (dest.indexOf(e.toLowerCase()) < 0) dest.push(e.toLowerCase()); });
    if (!dest.length) return ' Nenhum e-mail cadastrado na aba Emails para ' + resp + '.';
    const dt = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
    const corpo = [
      'O setor ' + resp + ' foi definido como responsável por uma pendência do Controle de pendências do Pier Gestão.',
      '',
      'Seção: ' + pendRotuloSecao(p.secao),
      'Nº: ' + (p.numero || '—'),
      'Pendência: ' + p.titulo,
      String(p.obs || '').trim() ? 'Detalhes: ' + String(p.obs).trim() : '',
      'Criticidade: ' + (p.criticidade || 'não definida'),
      p.prazo ? (p.tipo === 'Constante' ? 'Próxima execução: ' : 'Prazo inicial: ') + dt(p.prazo) : '',
      p.prazoAtualizado ? 'Atualização de prazo: ' + dt(p.prazoAtualizado) : '',
      'Situação: ' + (p.status || 'Pendente'),
      (p.criadaPor ? 'Incluída por ' + p.criadaPor + (p.origem === 'Síndico' ? ' (síndico)' : '') + '. ' : '') + 'Setor definido por ' + conta.nome + '.',
      '',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – pendência' + (p.numero ? ' nº ' + p.numero : '') + ' para ' + resp + ': ' + String(p.titulo).slice(0, 80), body: corpo, name: 'Pier Gestão' });
    return ' Aviso enviado por e-mail para ' + resp + ' (' + dest.length + ' destinatário' + (dest.length === 1 ? '' : 's') + ').';
  } catch (e) {
    Logger.log('Aviso por e-mail ao responsável não enviado: ' + e.message);
    return ' O aviso por e-mail não foi enviado (' + String(e.message).slice(0, 120) + ').';
  }
}

// envia para o Gerente, o Síndico e o responsável; uma falha no e-mail nunca desfaz a inclusão
function pendAvisarCriacao(p, conta, pai) {
  try {
    const mapa = lerEmails(), dest = [];
    const somar = nome => (mapa[chaveNome(nome)] || []).forEach(e => { if (dest.indexOf(e.toLowerCase()) < 0) dest.push(e.toLowerCase()); });
    somar('Gerente'); somar('Síndico');
    if (String(p.responsavel || '').trim()) somar(p.responsavel);
    if (!dest.length) return ' Nenhum e-mail cadastrado na aba Emails para o aviso.';
    const dt = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
    const nome = (pai ? 'novo subitem' : 'nova pendência') + (p.numero ? ' nº ' + p.numero : '');
    const corpo = [
      (pai ? 'Um novo subitem foi incluído' : 'Uma nova pendência foi incluída') + ' no Controle de pendências do Pier Gestão.',
      '',
      'Seção: ' + pendRotuloSecao(p.secao),
      pai ? 'Subitem de: ' + (pai.numero ? pai.numero + ' – ' : '') + pai.titulo : '',
      'Nº: ' + (p.numero || '—'),
      'Pendência: ' + p.titulo,
      String(p.obs || '').trim() ? 'Detalhes: ' + String(p.obs).trim() : '',
      'Criticidade: ' + (p.criticidade || 'não definida'),
      p.tipo === 'Constante' ? 'Tipo: tarefa constante (' + String(p.frequencia || 'Mensal').toLowerCase() + ')' : '',
      p.prazo ? (p.tipo === 'Constante' ? 'Próxima execução: ' : 'Prazo inicial: ') + dt(p.prazo) : '',
      'Responsável: ' + (String(p.responsavel || '').trim() || 'não definido'),
      'Incluída por: ' + conta.nome + ' em ' + dt(p.criadaEm) + ' ' + String(p.criadaEm || '').slice(11, 16),
      '',
      'Aprovação: aguardando a aprovação do gerente e, em seguida, do síndico.',
      '',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – ' + nome + ': ' + String(p.titulo).slice(0, 80), body: corpo, name: 'Pier Gestão' });
    return ' Aviso enviado por e-mail (' + dest.length + ' destinatário' + (dest.length === 1 ? '' : 's') + ').';
  } catch (e) {
    Logger.log('Aviso por e-mail da pendência não enviado: ' + e.message);
    return ' O aviso por e-mail não foi enviado (' + String(e.message).slice(0, 120) + ').';
  }
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
  'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'itens_editar', 'historico_estornar', 'exportar'];
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
    u: conta.usuario, c: agoraMs, v: agoraMs, a: texto((reg || {}).aparelho, 60)
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
  if (!us || !us.ativo) { x.props.deleteProperty(x.k); return null; }
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
  excluirItem: 'Excluiu item', estornar: 'Estornou lançamento', salvarUsuario: 'Usuário', acessoUsuario: 'Acessos de usuário',
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
// quem tem o perfil "Gerente" aprova a primeira etapa das pendências (inclusão e conclusão)
function ehGerente(conta) {
  return String((conta && conta.perfil) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().indexOf('gerente') >= 0;
}

// Perfil "Gerente": criado uma vez só, com todas as permissões menos a gestão de usuários (ajustável na tela Usuários)
function garantirGerente() {
  if (Object.keys(lerPerfis()).some(n => chaveNome(n).indexOf('gerente') >= 0)) return '';
  const perms = {}; PERMISSOES.forEach(p => { if (p[0] !== 'usuarios') perms[p[0]] = true; });
  salvarPerfil({ nome: 'Gerente', perms });
  return ' Perfil Gerente criado.';
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
