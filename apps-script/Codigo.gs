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
      ['atualizadoEm', 'Atualizado em'],
      ['setor', 'Setor'], ['pendencia', 'Pendência de origem'], ['equipamento', 'Equipamento'],
      ['tipo', 'Tipo de OS'], ['atividade', 'Atividade'], ['agendadaPara', 'Agendada para'], ['periodo', 'Período agendado'], ['unidadeSolic', 'Unidade solicitante']
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
      ['atualizadoEm', 'Atualizado em'], ['prestador', 'Prestador']
    ],
    num: ['intervalo', 'prazoDias']
  },
  // unidades do condomínio e o cadastro de cada uma (dados pessoais: só quem tem "Ver unidades e moradores")
  un: {
    nome: 'Unidades',
    criar: true,
    cols: [
      ['id', 'ID'], ['bloco', 'Bloco'], ['andar', 'Andar'], ['numero', 'Unidade'], ['situacao', 'Situação'], ['ocupacao', 'Ocupação'],
      ['proprietario', 'Proprietário'], ['contatos', 'Contatos do proprietário'], ['identidade', 'Identidades'], ['obs', 'Observação'],
      ['cadastroEm', 'Atualização cadastral em'], ['cadastroPor', 'Atualização cadastral por'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por']
    ],
    num: []
  },
  unp: {
    nome: 'Moradores',
    criar: true,
    cols: [['id', 'ID'], ['unidade', 'ID da unidade'], ['bloco', 'Bloco'], ['numero', 'Unidade'], ['nome', 'Nome'], ['parentesco', 'Parentesco / relação'],
      ['morador', 'Morador?'], ['facial', 'Cadastro facial'], ['barco', 'Acesso barco?'], ['contatos', 'Contatos'], ['ordem', 'Ordem']],
    num: []
  },
  unpet: {
    nome: 'Pets',
    criar: true,
    cols: [['id', 'ID'], ['unidade', 'ID da unidade'], ['bloco', 'Bloco'], ['numero', 'Unidade'], ['descricao', 'Pet']],
    num: []
  },
  unv: {
    nome: 'Veiculos',
    criar: true,
    cols: [['id', 'ID'], ['unidade', 'ID da unidade'], ['bloco', 'Bloco'], ['numero', 'Unidade'], ['vaga', 'Vaga'], ['marca', 'Marca'],
      ['modelo', 'Modelo'], ['cor', 'Cor'], ['tag', 'TAG?'], ['placa', 'Placa']],
    num: []
  },
  // central de medições: medidores, leituras do relógio e contas mensais da concessionária
  med: {
    nome: 'Medidores',
    criar: true,
    cols: [['id', 'ID'], ['tipo', 'Concessionária'], ['nome', 'Medidor'], ['numero', 'Número do medidor'], ['casas', 'Casas'], ['unidade', 'Unidade de medida'],
      ['local', 'Local'], ['obs', 'Observação'], ['ativo', 'Ativo'], ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'],
      ['limite', 'Limite diário'], ['proxCiclo', 'Próxima leitura da concessionária']],
    num: ['casas', 'limite']
  },
  medl: {
    nome: 'Leituras',
    criar: true,
    cols: [['id', 'ID'], ['medidor', 'ID do medidor'], ['data', 'Data'], ['leitura', 'Leitura'], ['virada', 'Relógio virou?'], ['obs', 'Observação'],
      ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'], ['atualizadoEm', 'Corrigido em'], ['atualizadoPor', 'Corrigido por'],
      ['ciclo', 'Leitura da concessionária?']],
    num: ['leitura']
  },
  esp: {
    nome: 'Espaços',
    criar: true,
    cols: [['id', 'ID'], ['nome', 'Espaço'], ['capacidade', 'Capacidade'], ['horario', 'Horário'], ['regras', 'Regras'], ['itens', 'Itens do checklist (JSON)'],
      ['ativo', 'Ativo'], ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['valor', 'Valor da reserva']],
    num: ['valor']
  },
  esr: {
    nome: 'Reservas',
    criar: true,
    cols: [['id', 'ID'], ['solicitacao', 'Nº da solicitação'], ['espaco', 'Espaço'], ['data', 'Data'], ['bloco', 'Bloco'], ['unidade', 'Unidade'], ['status', 'Status'],
      ['origem', 'Origem'], ['obs', 'Observação'], ['emailEm', 'E-mail de'], ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'],
      ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'], ['valor', 'Valor (R$)']],
    num: ['valor']
  },
  esc: {
    nome: 'Vistorias de espaços',
    criar: true,
    cols: [['id', 'ID'], ['reserva', 'ID da reserva'], ['espaco', 'Espaço'], ['fase', 'Fase'], ['data', 'Data'], ['itens', 'Itens (JSON)'], ['problemas', 'Problemas'],
      ['responsavel', 'Responsável (morador)'], ['obs', 'Observação'], ['feitoEm', 'Feito em'], ['feitoPor', 'Feito por']],
    num: ['problemas']
  },
  medc: {
    nome: 'Contas de consumo',
    criar: true,
    cols: [['id', 'ID'], ['medidor', 'ID do medidor'], ['mes', 'Mês de referência'], ['consumo', 'Consumo da conta'], ['valor', 'Valor (R$)'], ['vencimento', 'Vencimento'],
      ['obs', 'Observação'], ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'], ['atualizadoEm', 'Corrigido em'], ['atualizadoPor', 'Corrigido por']],
    num: ['consumo', 'valor']
  },
  // rondas (vistorias preventivas): cabeçalho em colunas; os itens da ficha e os dados extras em JSON
  ronda: {
    nome: 'Rondas',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Número'], ['tipo', 'Tipo'], ['alvo', 'Local'], ['data', 'Data'], ['inicio', 'Início'], ['fim', 'Fim'],
      ['responsaveis', 'Responsáveis'], ['acesso', 'Condições de acesso'], ['osRel', 'OS relacionadas'], ['obs', 'Observação'],
      ['status', 'Situação'], ['resumo', 'Resumo'], ['extras', 'Extras (não editar)'], ['itens', 'Itens (não editar)'],
      ['criadaPor', 'Criada por'], ['criadaPorUsuario', 'Usuário que criou'], ['criadaEm', 'Criada em'],
      ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por']
    ],
    num: []
  },
  // prestadores de serviço da manutenção (contratos, visitas e documentos); documentos e visitas em JSON
  // fornecedores de materiais e serviços (Pendências e compras)
  forn: {
    nome: 'Fornecedores',
    criar: true,
    cols: [['id', 'ID'], ['nome', 'Empresa'], ['cnpj', 'CNPJ'], ['categoria', 'Categoria'], ['contato', 'Contato'], ['telefone', 'Telefone'], ['email', 'E-mail'],
      ['endereco', 'Endereço'], ['site', 'Site'], ['pagamento', 'Condições de pagamento'], ['obs', 'Observação'], ['ativo', 'Ativo'],
      ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'],
      ['codigo', 'Código'], ['servicos', 'Serviços / Produtos'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['situacao', 'Situação'], ['fonte', 'Fonte']],
    num: []
  },
  prest: {
    nome: 'Prestadores',
    criar: true,
    cols: [
      ['id', 'ID'], ['nome', 'Empresa'], ['servico', 'Serviço'], ['contato', 'Contato'], ['telefone', 'Telefone'], ['email', 'E-mail'],
      ['cnpj', 'CNPJ'], ['endereco', 'Endereço'], ['contratoInicio', 'Contrato início'], ['contratoFim', 'Contrato fim'],
      ['valorMensal', 'Valor mensal'], ['frequencia', 'Frequência das visitas'], ['ultimaVisita', 'Última visita'],
      ['proximaVisita', 'Próxima visita'], ['observacao', 'Observação'], ['ativo', 'Ativo'], ['docs', 'Documentos'],
      ['visitas', 'Visitas'], ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['atualizadoEm', 'Atualizado em'],
      ['atualizadoPor', 'Atualizado por']
    ],
    num: ['valorMensal']
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
      ['conclGerente', 'Conclusão aprovada pelo gerente'], ['conclSindico', 'Conclusão aprovada pelo síndico'],
      ['os', 'OS gerada'], ['osId', 'ID da OS']
    ],
    num: ['ordem']
  },
  cot: {
    nome: 'Cotacoes',
    criar: true,
    cols: [
      ['id', 'ID'], ['numero', 'Nº'], ['status', 'Situação'], ['finalidade', 'Finalidade'], ['data', 'Data da cotação'],
      ['solicitante', 'Solicitante / Responsável'], ['pendencia', 'ID da pendência'], ['pendNumero', 'Pendência'],
      ['vencedor', 'Fornecedor recomendado'], ['valorVencedor', 'Valor recomendado (R$)'], ['dados', 'Dados (não editar)'],
      ['criadaEm', 'Criada em'], ['criadaPor', 'Criada por'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'],
      ['aprovGerente', 'Aprovada pelo gerente'], ['aprovSindico', 'Aprovada pelo síndico'], ['recusa', 'Última recusa'],
      ['mapaId', 'ID do mapa'], ['mapaEm', 'Mapa salvo em']
    ],
    num: []
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
// setor da OS: Manutenção (inclui jardinagem) ou Limpeza; OS antiga, sem setor, é da Manutenção
function osSetor(o) { return texto(o && o.setor) === 'Limpeza' ? 'Limpeza' : 'Manutenção'; }
function osExigirSetor(o, conta) {
  if (conta && setoresDe(conta).indexOf(osSetor(o)) < 0) throw falha('Esta OS é do setor ' + osSetor(o) + '. Seu perfil não tem acesso a ele.');
}
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

const VERSAO = '2026-10-27 avisos do síndico';

function doGet() {
  TABS = {};
  return json({ ok: true, app: 'Pier Gestão', versao: VERSAO });
}

function doPost(e) {
  AUDIT_DET = '';
  TABS = {};
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, erro: 'Pedido inválido.' }); }
  let conta = null;
  try {
    let token = '';
    // esqueci a senha: código por e-mail para a própria pessoa (sem sessão)
    if (req.acao === 'esqueciSenha') return json({ ok: true, msg: pedirCodigoSenha(req.usuario, (req.registro || {}).aparelho) });
    if (req.acao === 'redefinirSenha') return json({ ok: true, msg: redefinirComCodigo(req) });
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
        if (travou) {
          auditar({ usuario: usuarioDig, nome: '', perfil: '' }, 'Login bloqueado', SEG.tentativas + ' senhas erradas seguidas; bloqueado por ' + SEG.bloqueioMin + ' min.', 'Negado');
          alertaSeguranca('bloqueio', usuarioDig, 'Login bloqueado por ' + SEG.bloqueioMin + ' min depois de ' + SEG.tentativas + ' senhas erradas seguidas.', (req.registro || {}).aparelho);
        }
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
      // a entrada já devolve os dados (e as pendências, se pedidas e permitidas): o site abre com uma ida só à planilha
      const junto = {};
      if (req.comDados) junto.dados = dados(req.meses, conta);
      if (req.comPend && conta.perms.pendencias) { junto.pendencias = pendLista(); junto.pendVersao = PEND_VERSAO; }
      return json(Object.assign(base, token ? { token, sessaoHoras: Math.round(SEG.sessaoInativa / 36e5), senhaProvisoria: !!conta.senhaProvisoria } : {}, junto));
    }
    if (req.acao === 'sair') { encerrarSessao(req.token); auditar(conta, 'Saiu do sistema', ''); return json({ ok: true }); }
    if (req.acao === 'visao') { registrarVisao(conta, req); return json({ ok: true }); }
    if (req.acao === 'acessos') { pode('acessos'); return json(Object.assign(base, { acessos: lerAcessos(req.dias) })); }
    if (req.acao === 'auditoria') { pode('acessos'); return json(Object.assign(base, { auditoria: lerAuditoria(req.dias) })); }
    if (req.acao === 'dados') return json(Object.assign(base, { dados: dados(req.meses, conta) }));
    if (req.acao === 'relatorio') { pode('dashboard'); return json(Object.assign(base, { relatorio: relatorio(req.de, req.ate, conta) })); }
    if (req.acao === 'usuarios') { pode('usuarios'); return json(Object.assign(base, { equipe: equipe() })); }
    if (req.acao === 'fornecedores') { pode('pendencias'); return json(Object.assign(base, fornLista())); }
    if (req.acao === 'cotLista') { pode('pendencias'); return json(Object.assign(base, cotLista())); }
    if (req.acao === 'cotVerArquivo') { pode('pendencias'); const f = cotVerArquivo(req); auditar(conta, 'Abriu arquivo de cotação', f.nome); delete f.nome; return json(Object.assign(base, { arquivo: f })); }
    if (req.acao === 'unidades') { unExigir(conta, false); return json(Object.assign(base, unLista())); }
    if (req.acao === 'espacos') { espExigir(conta); return json(Object.assign(base, espLista())); }
    if (req.acao === 'medicoes') { medExigir(conta, false); return json(Object.assign(base, medLista())); }
    if (req.acao === 'rondas') { rondaExigir(conta, false); return json(Object.assign(base, rondaLista())); }
    if (req.acao === 'rondaFotoVer') { rondaExigir(conta, false); const f = rondaFotoVer(req); delete f.nome; return json(Object.assign(base, { foto: f })); }
    if (req.acao === 'prestVerDoc') { prestExigir(conta, false); const f = prestVerDoc(req); auditar(conta, 'Abriu documento de prestador', f.nome); delete f.nome; return json(Object.assign(base, { arquivo: f })); }
    if (req.acao === 'cotIA') { pode('pendencias'); return json(Object.assign(base, cotIA(req, conta))); }
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
        case 'trocarSenha': msg = trocarMinhaSenha(req, conta); extra.semDados = true; break;
        case 'pendSalvar': pode('pendencias'); msg = pendSalvar(req.pend || {}, conta); extra.pendencias = true; break;
        case 'fornSalvar': pode('pendencias'); msg = fornSalvar(req, conta); extra.forn = true; extra.semDados = true; break;
        case 'fornImportar': pode('pendencias'); msg = fornImportar(req, conta); extra.forn = true; extra.semDados = true; break;
        case 'fornDasCotacoes': pode('pendencias'); msg = fornDasCotacoes(conta); extra.forn = true; extra.semDados = true; break;
        case 'cotSalvar': pode('pendencias'); msg = cotSalvar(req, conta); extra.cot = msg.cot; msg = msg.texto; extra.semDados = true; break;
        case 'cotArquivo': pode('pendencias'); msg = cotArquivo(req, conta); extra.cot = msg.cot; msg = msg.texto; extra.semDados = true; break;
        case 'prestSalvar': prestExigir(conta, true); msg = prestSalvar(req.prest || {}, conta); break;
        case 'prestVisita': prestExigir(conta, true); msg = prestVisita(req, conta); break;
        case 'prestDoc': prestExigir(conta, true); msg = prestDoc(req, conta); break;
        case 'prestDocRemover': prestExigir(conta, true); msg = prestDocRemover(req, conta); break;
        case 'unSalvar': unExigir(conta, true); msg = unSalvar(req, conta); extra.semDados = true; break;
        case 'unConfig': unExigir(conta, true); msg = unConfig(req, conta); extra.semDados = true; break;
        case 'unOcupadas': unExigir(conta, true); msg = unOcupadas(conta); extra.semDados = true; break;
        case 'unImportar': unExigir(conta, true); msg = unImportar(req, conta); extra.semDados = true; break;
        case 'medMedidor': medExigir(conta, true); msg = medMedidor(req, conta); extra.med = true; extra.semDados = true; break;
        case 'medLeituras': medExigir(conta, true); msg = medLeituras(req, conta); extra.med = true; extra.semDados = true; break;
        case 'medContas': medExigir(conta, true); msg = medContas(req, conta); extra.med = true; extra.semDados = true; break;
        case 'espReserva': espExigir(conta); msg = espReserva(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espEspaco': espExigir(conta); msg = espEspaco(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espVistoria': espExigir(conta); msg = espVistoria(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espColar': espExigir(conta); msg = espColar(req, conta); if (msg.lida) { extra.lida = msg.lida; msg = 'ok'; } else { msg = msg.texto; extra.esp = true; } extra.semDados = true; break;
        case 'espImportar': espExigir(conta); msg = espImportar(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espEmails': espExigir(conta); msg = espLerEmails(conta); extra.esp = true; extra.semDados = true; break;
        case 'medImportar': medExigir(conta, true); msg = medImportar(req, conta); extra.med = true; extra.semDados = true; break;
        case 'rondaSalvar': rondaExigir(conta, true); msg = rondaSalvar(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaFoto': rondaExigir(conta, true); msg = rondaFoto(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaFotoRemover': rondaExigir(conta, true); msg = rondaFotoRemover(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaResolver': rondaExigir(conta, true); msg = rondaResolver(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'prestImportar': prestExigir(conta, true); msg = prestImportar(req, conta); break;
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
    if (extra.semDados) return json(Object.assign(base, { msg }, extra.cot ? { cot: extra.cot } : {}, extra.ronda ? { ronda: extra.ronda } : {}, extra.med ? medLista() : {}, extra.esp ? espLista() : {}, extra.forn ? fornLista() : {}, extra.lida ? { lida: extra.lida } : {}));
    return json(Object.assign(base, { msg, dados: dados(req.meses, conta) }, extra));
  } catch (err) {
    // tentativas sem permissão ficam no histórico de auditoria
    if (conta && (err.negado || /não tem permissão/i.test(String(err.message)))) {
      auditar(conta, ACOES_AUDIT[req.acao] || String(req.acao || ''), String(err.message), 'Negado');
      alertaSeguranca('negado', conta.usuario, 'Tentativa sem permissão: ' + (ACOES_AUDIT[req.acao] || String(req.acao || '')) + ' — ' + String(err.message), '', conta.nome);
    }
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
  // movimentações: só as dos meses pedidos e as ligadas às OS que vão na resposta (não o histórico inteiro)
  let lidas = null;
  const lerMovs = osLista => {
    const nums = {};
    (osLista || []).forEach(o => { if (o.numero) nums[String(o.numero)] = 1; });
    lidas = linhasOnde(tabela('movs'), ['data', 'os'], m => ms.indexOf(String(m.data).slice(0, 7)) >= 0 || (m.os && nums[m.os] === 1));
    return lidas;
  };
  const V = visaoSetores(conta);
  const extra = dadosOsDem(ms, conta, lerMovs, limpa);
  if (!lidas) lerMovs([]);
  const out = {
    itens: V.itens.map(limpa),
    emprestimos: linhas(tabela('emp')).filter(V.ve).map(e => V.marca(limpa(e))),
    movs: lidas.filter(m => ms.indexOf(String(m.data).slice(0, 7)) >= 0 && V.ve(m)).map(m => V.marca(limpa(m))),
    setores: V.setores,
    locais: V.setores.reduce((m, st) => { m[st] = lerLocais(st); return m; }, {})
  };
  return Object.assign(out, extra);
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
      ms.indexOf(String(o.abertaEm).slice(0, 7)) >= 0)
      .filter(o => setoresDe(conta).indexOf(osSetor(o)) >= 0)
      .map(o => Object.assign(o, { setor: osSetor(o) }));
    out.os = comMateriais(lista.map(limpa), typeof todas === 'function' ? todas(lista) : todas);
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
  // prestadores de serviço: para quem é da manutenção (vê OS ou demandas)
  if (prestPode(conta, false)) { try { out.prestadores = prestLista(); } catch (e) { /* aba nova: aparece no próximo acesso */ } }
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
  if (TABS[chave]) return TABS[chave];
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
  return (TABS[chave] = { sh, def, idx, ncol });
}

function objLinha(t, r, row) {
  const o = { _row: row };
  t.def.cols.forEach(([k]) => { o[k] = celula(r[t.idx[k]], t.def.num.indexOf(k) >= 0); });
  if (!o.id) return null;
  if (t.def === ABAS.movs) o.tipo = TIPO_POR_NOME[o.tipo] || String(o.tipo).toLowerCase();
  return o;
}

function linhas(t) {
  const n = t.sh.getLastRow() - 1;
  if (n < 1) return [];
  const vals = t.sh.getRange(2, 1, n, t.ncol).getValues();
  const out = [];
  vals.forEach((r, i) => { const o = objLinha(t, r, i + 2); if (o) out.push(o); });
  return out;
}

// Lê só as linhas que interessam: primeiro as colunas-chave (estreitas), depois só os trechos escolhidos.
// Evita ler o histórico inteiro (todas as colunas) em cada entrada.
function linhasOnde(t, cols, manter) {
  const n = t.sh.getLastRow() - 1;
  if (n < 1) return [];
  const chaves = cols.map(k => t.sh.getRange(2, t.idx[k] + 1, n, 1).getValues());
  const quero = [];
  for (let i = 0; i < n; i++) {
    const o = {};
    cols.forEach((k, j) => { o[k] = celula(chaves[j][i][0], false); });
    if (manter(o)) quero.push(i);
  }
  if (!quero.length) return [];
  let blocos = [];
  quero.forEach(i => { const b = blocos[blocos.length - 1]; if (b && i - b[1] <= 30) b[1] = i; else blocos.push([i, i]); });
  if (blocos.length > 12) blocos = [[quero[0], quero[quero.length - 1]]];
  const sel = {}; quero.forEach(i => { sel[i] = 1; });
  const out = [];
  blocos.forEach(([a, z]) => {
    t.sh.getRange(a + 2, 1, z - a + 1, t.ncol).getValues().forEach((r, k) => {
      if (!sel[a + k]) return;
      const o = objLinha(t, r, a + k + 2);
      if (o) out.push(o);
    });
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
  ['acessos', 'Histórico de acessos', 'Ver quem entrou no sistema, quando e de qual aparelho (menu Administração)', 'Administração'],
  ['ronda_fazer', 'Fazer ronda', 'Preencher as fichas de ronda (vistoria), pôr fotos e marcar pendências como resolvidas (setor Administração)', 'Ronda'],
  ['ronda_ver', 'Ver rondas', 'Ver as rondas, as pendências e o fechamento semanal (setor Administração)', 'Ronda'],
  ['un_ver', 'Ver unidades e moradores', 'Ver a lista de unidades, moradores, pets e veículos (setor Administração; dados pessoais)', 'Unidades'],
  ['un_editar', 'Editar unidades e moradores', 'Atualizar o cadastro das unidades, configurar blocos e unidades e importar a planilha (setor Administração)', 'Unidades'],
  ['med_lancar', 'Lançar medições', 'Lançar as leituras dos medidores e as contas de água, energia e gás, cadastrar medidores e importar planilha (setor Administração)', 'Medições'],
  ['med_ver', 'Ver relatórios de medições', 'Ver os medidores, os lançamentos e os relatórios de consumo (setor Administração)', 'Medições'],
  ['espacos', 'Espaços e reservas', 'Reservas do Espaço Gourmet e outros espaços, vistoria de entrega/devolução e cadastro dos espaços (setor Administração)', 'Espaços']
];
const PADRAO_MANUTENCAO = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada',
  'registrar_troca', 'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'os_ver', 'os_abrir', 'os_atender', 'dem_ver', 'dem_executar',
  'setor_manutencao'];
const PADRAO_LIMPEZA = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada', 'itens_cadastrar', 'setor_limpeza'];

function autenticar(usuario, senha) {
  const u = String(usuario || '').trim().toLowerCase();
  const s = String(senha || '').trim();
  if (!u || !s) return null;
  garantirColunaProvisoria();
  const U = lerUsuarios();
  const us = U.lista.find(x => x.usuario === u);
  if (!us || !us.ativo || !conferirSenha(s, us.senha)) return null;
  // senha ainda em texto (digitada direto na planilha): vira código na primeira entrada
  if (!ehHash(us.senha)) U.sh.getRange(us.row, U.c['Senha'] + 1).setNumberFormat('@').setValue(hashSenha(s));
  const conta = contaDe(us);
  conta.senhaProvisoria = us.provisoria;
  return conta;
}

// Coluna "Senha provisória" da aba Usuarios: criada uma vez só. Na criação, quem já usa o sistema fica com a
// senha marcada como provisória e é convidado a criar a própria na próxima entrada
// (menos o "admin" e o login compartilhado "limpeza").
function garantirColunaProvisoria() {
  const U = lerUsuarios();
  if (U.c['Senha provisória'] >= 0) return false;
  const col = U.ncol + 1;
  U.sh.getRange(1, col).setValue('Senha provisória').setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
  U.lista.forEach(us => {
    const marcar = us.usuario !== 'admin' && us.usuario !== 'limpeza';
    U.sh.getRange(us.row, col).setNumberFormat('@').setValue(marcar ? 'Sim' : '');
  });
  return true;
}

// a própria pessoa troca a senha: confere a atual, grava a nova (com hash) e encerra os outros acessos abertos
function trocarMinhaSenha(r, conta) {
  const usuario = conta.usuario;
  const atual = String(r.atual || '').trim(), nova = String(r.nova || '').trim();
  const bloq = loginBloqueado(usuario);
  if (bloq) throw falha('Muitas tentativas com senha errada. Tente de novo em ' + bloq + ' min.');
  const U = lerUsuarios();
  const us = U.lista.find(x => x.usuario === usuario);
  if (!us || !us.ativo) throw falha('Usuário não encontrado.');
  if (!atual || !conferirSenha(atual, us.senha)) {
    const travou = registrarFalhaLogin(usuario);
    AUDIT_DET = 'Senha atual errada ao trocar a senha';
    if (travou) alertaSeguranca('bloqueio', usuario, 'Login bloqueado por ' + SEG.bloqueioMin + ' min: senha atual errada ' + SEG.tentativas + ' vezes ao tentar trocar a senha.', '', conta.nome);
    throw falha(travou ? 'Senha atual errada de novo. Por segurança, novas entradas deste login ficaram bloqueadas por ' + SEG.bloqueioMin + ' min.' : 'A senha atual não confere.');
  }
  if (nova.length < SEG.senhaMin) throw falha('A nova senha precisa ter pelo menos ' + SEG.senhaMin + ' caracteres.');
  if (nova === atual) throw falha('A nova senha precisa ser diferente da atual.');
  if (nova.toLowerCase() === usuario) throw falha('A senha não pode ser igual ao usuário.');
  if (/^(.)\1+$/.test(nova)) throw falha('Escolha uma senha menos óbvia (não use o mesmo caractere repetido).');
  garantirColunaProvisoria();
  const U2 = lerUsuarios();
  U2.sh.getRange(us.row, U2.c['Senha'] + 1).setNumberFormat('@').setValue(hashSenha(nova));
  U2.sh.getRange(us.row, U2.c['Senha provisória'] + 1).setNumberFormat('@').setValue('');
  limparFalhasLogin(usuario);
  const encerradas = encerrarSessoesDe(usuario, conta.sessao);
  AUDIT_DET = 'Trocou a própria senha' + (encerradas ? '; ' + encerradas + ' outro(s) acesso(s) encerrado(s)' : '');
  alertaSeguranca('senha', usuario, 'Trocou a própria senha.' + (encerradas ? ' ' + encerradas + ' outro(s) aparelho(s) desconectado(s).' : ''), '', conta.nome);
  return 'Senha trocada. A partir de agora, use a sua nova senha.' + (encerradas ? ' Os outros aparelhos conectados vão pedir a senha de novo.' : '');
}
// --- esqueci a senha: código de 6 dígitos enviado para o e-mail cadastrado da própria pessoa ---
// A senha atual continua valendo até a pessoa usar o código. O código vale 15 min e aceita 5 tentativas.
const REDEF = { validadeMin: 15, tentativas: 5, intervaloSeg: 60, porDia: 5 };
function emailValido(e) { return /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(String(e || '')); }
function chaveRedef(u) { return 'REDEF_' + String(u || '').slice(0, 40); }
function lerRedef(u) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(chaveRedef(u)) || 'null'); } catch (e) { return null; } }
function mascararEmail(e) { const [a, d] = String(e).split('@'); return a.slice(0, 2) + '***@' + d; }
function pedirCodigoSenha(usuarioDig, aparelho) {
  const u = String(usuarioDig || '').trim().toLowerCase();
  if (!/^[a-z0-9._@-]{2,40}$/.test(u)) throw falha('Informe o seu usuário.');
  // a resposta é a mesma exista ou não o usuário: ninguém descobre quais logins existem
  const resposta = 'Se esse usuário tiver e-mail cadastrado, enviamos um código para ele. Confira a caixa de entrada (e o spam). Se não chegar em alguns minutos, fale com a Administração.';
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw falha('Sistema ocupado. Tente de novo em instantes.');
  try {
    const us = lerUsuarios().lista.find(x => x.usuario === u);
    if (!us || !us.ativo || !emailValido(us.email)) { Utilities.sleep(400); return resposta; }
    const t = Date.now(), x = lerRedef(u) || {};
    const envios = (x.envios || []).filter(z => t - z < 864e5);
    if (envios.length && t - envios[envios.length - 1] < REDEF.intervaloSeg * 1000) throw falha('Aguarde 1 minuto antes de pedir outro código.');
    if (envios.length >= REDEF.porDia) throw falha('Muitos pedidos de código hoje. Fale com a Administração.');
    const codigo = String(100000 + parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 900000);
    envios.push(t);
    PropertiesService.getScriptProperties().setProperty(chaveRedef(u), JSON.stringify({ h: hashSenha(codigo), ate: t + REDEF.validadeMin * 60e3, n: 0, envios }));
    const corpo = [
      'Olá, ' + (us.nome || us.usuario) + '.',
      '',
      'Recebemos um pedido para redefinir a sua senha do Pier Gestão (usuário: ' + us.usuario + ').',
      '',
      'Código: ' + codigo,
      '',
      'Na tela de entrada, em "Esqueci minha senha", digite este código e crie a sua nova senha.',
      'O código vale por ' + REDEF.validadeMin + ' minutos.',
      '',
      'Se não foi você, ignore este e-mail: a sua senha atual continua valendo.',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].join('\n');
    try { MailApp.sendEmail({ to: us.email, subject: 'Pier Gestão – código para redefinir a sua senha', body: corpo, name: 'Pier Gestão' }); }
    catch (e) { throw falha('Não foi possível enviar o e-mail agora. Tente mais tarde ou fale com a Administração.'); }
    auditar({ usuario: u, nome: us.nome, perfil: us.perfil }, 'Pediu código para redefinir a senha', 'Enviado para ' + mascararEmail(us.email) + (aparelho ? ' · ' + texto(aparelho, 60) : ''), 'OK');
    return resposta;
  } finally { lock.releaseLock(); }
}
function redefinirComCodigo(r) {
  const u = String(r.usuario || '').trim().toLowerCase();
  const codigo = String(r.codigo || '').replace(/\D/g, ''), nova = String(r.nova || '').trim();
  if (!u) throw falha('Informe o seu usuário.');
  if (codigo.length !== 6) throw falha('Digite o código de 6 números que chegou no seu e-mail.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw falha('Sistema ocupado. Tente de novo em instantes.');
  try {
    const props = PropertiesService.getScriptProperties(), x = lerRedef(u), t = Date.now();
    const invalido = 'Código inválido ou vencido. Peça um código novo.';
    if (!x || !x.h || !(x.ate > t)) { Utilities.sleep(700); throw falha(invalido); }
    if (!conferirSenha(codigo, x.h)) {
      Utilities.sleep(700);
      x.n = (x.n || 0) + 1;
      if (x.n >= REDEF.tentativas) { delete x.h; delete x.ate; }
      props.setProperty(chaveRedef(u), JSON.stringify(x));
      throw falha(x.h ? 'Código errado. Confira o número no e-mail.' : 'Código errado muitas vezes. Peça um código novo.');
    }
    const U = lerUsuarios();
    const us = U.lista.find(z => z.usuario === u);
    if (!us || !us.ativo) throw falha(invalido);
    if (nova.length < SEG.senhaMin) throw falha('A nova senha precisa ter pelo menos ' + SEG.senhaMin + ' caracteres.');
    if (nova.toLowerCase() === u) throw falha('A senha não pode ser igual ao usuário.');
    if (/^(.)\1+$/.test(nova)) throw falha('Escolha uma senha menos óbvia (não use o mesmo caractere repetido).');
    garantirColunaProvisoria();
    const U2 = lerUsuarios();
    U2.sh.getRange(us.row, U2.c['Senha'] + 1).setNumberFormat('@').setValue(hashSenha(nova));
    U2.sh.getRange(us.row, U2.c['Senha provisória'] + 1).setNumberFormat('@').setValue('');
    // o código só vale uma vez; o login volta a entrar (se estava bloqueado) e os acessos abertos são encerrados
    props.setProperty(chaveRedef(u), JSON.stringify({ envios: x.envios || [] }));
    limparFalhasLogin(u);
    const encerradas = encerrarSessoesDe(u, '');
    auditar({ usuario: u, nome: us.nome, perfil: us.perfil }, 'Redefiniu a senha pelo e-mail', encerradas ? encerradas + ' acesso(s) aberto(s) encerrado(s)' : '', 'OK');
    alertaSeguranca('senha', u, 'Redefiniu a senha com o código enviado por e-mail.', texto((r.registro || {}).aparelho, 60), us.nome);
    return 'Senha redefinida. Entre agora com a sua nova senha.';
  } finally { lock.releaseLock(); }
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
  c['E-mail'] = head.indexOf('E-mail');
  c['Senha provisória'] = head.indexOf('Senha provisória');
  const lista = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const usuario = String(r[c['Usuário']]).trim().toLowerCase();
    if (!/^[a-z0-9._@-]{2,40}$/.test(usuario)) continue;
    lista.push({
      row: i + 1, usuario, nome: texto(r[c['Nome']], 60), senha: String(r[c['Senha']]).trim(),
      perfil: String(r[c['Perfil']]).trim(), ativo: String(r[c['Ativo']]).trim().toLowerCase().indexOf('n') !== 0,
      telefone: c['Telefone'] >= 0 ? String(r[c['Telefone']]).replace(/\D/g, '') : '',
      email: c['E-mail'] >= 0 ? String(r[c['E-mail']]).trim().toLowerCase() : '',
      provisoria: c['Senha provisória'] >= 0 && String(r[c['Senha provisória']]).trim().toLowerCase().indexOf('s') === 0
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
      return lerUsuarios().lista.map(u => ({ usuario: u.usuario, nome: u.nome, perfil: u.perfil, ativo: u.ativo, telefone: u.telefone, email: u.email, provisoria: u.provisoria,
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
  const email = String(v.email || '').trim().toLowerCase().slice(0, 120);
  if (email && !emailValido(email)) throw falha('E-mail inválido.');
  let U = lerUsuarios();
  if (U.c['Telefone'] < 0) {
    U.sh.getRange(1, U.ncol + 1).setValue('Telefone').setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    U = lerUsuarios();
  }
  if (U.c['E-mail'] < 0) {
    U.sh.getRange(1, U.ncol + 1).setValue('E-mail').setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
    U = lerUsuarios();
  }
  if (garantirColunaProvisoria()) U = lerUsuarios();
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
  if (senha) {
    linha[U.c['Senha']] = hashSenha(senha);
    // senha criada pela Administração para outra pessoa é provisória: na entrada, ela é convidada a criar a própria
    linha[U.c['Senha provisória']] = original && original === conta.usuario ? '' : 'Sim';
  }
  linha[U.c['Perfil']] = perfil; linha[U.c['Ativo']] = ativo ? 'Sim' : 'Não'; linha[U.c['Telefone']] = telefone;
  if (v.email !== undefined) linha[U.c['E-mail']] = email;
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
  if (!original || senha || (anterior && (anterior.perfil !== perfil || anterior.ativo !== ativo || original !== usuario)))
    alertaSeguranca('usuario', usuario, AUDIT_DET + ' (feito por ' + conta.nome + ').', '', nome);
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
  const c = {
    titulo, local, prioridade, prazo, categoria: texto(v.categoria, 40),
    descricao: texto(v.descricao, 3000), solicitante: texto(v.solicitante, 120)
  };
  // equipamento é opcional; só muda quando vem no pedido (versões antigas do site não mandam e não apagam)
  if ('equipamento' in v) c.equipamento = texto(v.equipamento, 80);
  // campos da tela nova de abertura (opcionais; quem não manda não apaga)
  if ('tipo' in v) c.tipo = ['Corretiva', 'Preventiva'].indexOf(v.tipo) >= 0 ? v.tipo : 'Corretiva';
  if ('atividade' in v) c.atividade = texto(v.atividade, 80);
  if ('agendadaPara' in v) {
    const ag = String(v.agendadaPara || '');
    if (ag && !/^\d{4}-\d{2}-\d{2}$/.test(ag)) throw falha('Data do agendamento inválida.');
    c.agendadaPara = ag; c.periodo = ag ? (['Manhã', 'Tarde', 'Dia todo'].indexOf(v.periodo) >= 0 ? v.periodo : 'Dia todo') : '';
    if (ag && c.prazo < ag) c.prazo = ag; // o prazo nunca fica antes do dia agendado
  }
  if ('unidadeSolic' in v) c.unidadeSolic = texto(v.unidadeSolic, 60);
  return c;
}

function osAbrir(v, conta, origem) {
  const campos = osCampos(v);
  // a OS é do setor do ambiente em que foi aberta (ou do escolhido ao criar a partir de uma pendência)
  const setor = v.setor === 'Limpeza' ? 'Limpeza' : 'Manutenção';
  if (!origem && setoresDe(conta).indexOf(setor) < 0) throw falha('Seu perfil não tem acesso às OS do setor ' + setor + '.');
  let resp = null;
  if (v.responsavelUsuario) {
    if (!conta.perms.os_gerenciar) throw falha('Só quem gerencia OS pode escolher o responsável.');
    resp = colaboradorAtivo(v.responsavelUsuario);
  }
  const t = tabela('os');
  const max = linhas(t).reduce((m, o) => { const x = /(\d+)\s*$/.exec(o.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  const numero = 'OS-' + ('000' + (max + 1)).slice(-4);
  const id = novoId('O');
  let and = osAndamento('', conta.nome, 'Abriu a OS' + (campos.agendadaPara ? ' (agendada para ' + campos.agendadaPara.split('-').reverse().join('/') + ', ' + String(campos.periodo).toLowerCase() + ')' : ''));
  if (resp) and = osAndamento(and, conta.nome, 'Atribuiu a ' + (resp.nome || resp.usuario));
  gravar(t, Object.assign({
    id, numero, status: OS_STATUS.aberta, abertaEm: agora(), abertaPor: conta.nome, abertaPorUsuario: conta.usuario,
    responsavel: resp ? (resp.nome || resp.usuario) : '', responsavelUsuario: resp ? resp.usuario : '',
    andamento: and, atualizadoEm: agora(), setor, pendencia: (origem && origem.pendencia) || ''
  }, campos));
  return { texto: numero + ' aberta.', numero, id };
}

function osDireitos(o, conta) {
  osExigirSetor(o, conta); // cada setor só mexe nas próprias OS
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
function pastaCotacoes() { return pastaDrive('PASTA_COTACOES', 'Cotações e mapas - Pier Gestão'); }

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
  let cachePrest = null;
  const prestadores = () => cachePrest || (cachePrest = (() => { try { return linhas(tabela('prest')); } catch (e) { return []; } })());
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
    const pr = p.prestador ? prestadores().find(x => x.id === p.prestador) : null;
    const campos = {
      titulo: p.titulo, prioridade: OS_PRIORIDADES.indexOf(p.prioridade) >= 0 ? p.prioridade : 'Normal', prazo,
      local: p.local, categoria: p.categoria,
      descricao: (p.descricao ? p.descricao + '\n\n' : '') + 'Preventiva ' + p.numero + ', repete ' + descRepeticao(intervalo, unidade) + '. Data prevista: ' + data.split('-').reverse().join('/') + '.'
        + (pr ? '\nPrestador: ' + pr.nome + (pr.contato ? ' (' + pr.contato + ')' : '') + (pr.telefone ? ' · ' + pr.telefone : '') + '.' : '')
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
  // prestador de serviço que faz a preventiva (opcional; versões antigas do site não mandam e não apagam)
  if ('prestador' in v) {
    const pid = texto(v.prestador, 40);
    if (pid && !linhas(tabela('prest')).some(x => x.id === pid)) throw falha('Prestador não encontrado. Atualize a página.');
    campos.prestador = pid;
  }
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

// ---------- prestadores de serviço (manutenção) ----------
// Vê quem é da manutenção (OS ou demandas); cadastra e altera quem gerencia OS ou distribui demandas.
const PREST_FREQ = { 'Semanal': [1, 'semanas'], 'Quinzenal': [15, 'dias'], 'Mensal': [1, 'meses'], 'Bimestral': [2, 'meses'],
  'Trimestral': [3, 'meses'], 'Semestral': [6, 'meses'], 'Anual': [12, 'meses'], 'Sob demanda': null };
const PREST_MAX_DOCS = 20;
function pastaPrestadores() { return pastaDrive('PASTA_PRESTADORES', 'Prestadores de serviço - Pier Gestão'); }
function prestPode(conta, editar) {
  const p = (conta && conta.perms) || {};
  if (setoresDe(conta).indexOf('Manutenção') < 0) return false;
  if (editar) return !!(p.os_gerenciar || p.dem_delegar);
  return !!(p.os_ver || p.os_abrir || p.os_atender || p.os_gerenciar || p.dem_ver || p.dem_executar || p.dem_delegar);
}
function prestExigir(conta, editar) {
  if (!prestPode(conta, editar)) { const e = falha(editar ? 'Só quem gerencia OS ou distribui demandas cadastra prestadores.' : 'Seu perfil não tem permissão para ver os prestadores.'); e.negado = true; throw e; }
}
const prestJSON = (v, padrao) => { try { const x = JSON.parse(String(v || '')); return Array.isArray(x) ? x : padrao; } catch (e) { return padrao; } };
const dataOk = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
function prestLista() {
  return linhas(tabela('prest')).map(x => {
    const o = Object.assign({}, x); delete o._row;
    o.docs = prestJSON(x.docs, []); o.visitas = prestJSON(x.visitas, []).slice(-30);
    return o;
  }).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}
function prestProxima(data, freq) {
  const f = PREST_FREQ[freq];
  return f && dataOk(data) ? repeticao(data, 1, f[0], f[1]) : '';
}
function prestSalvar(v, conta) {
  const nome = texto(v.nome, 120);
  if (!nome) throw falha('Informe o nome da empresa ou do prestador.');
  const email = texto(v.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw falha('E-mail inválido.');
  const cnpj = texto(v.cnpj, 20).replace(/\D/g, '');
  if (cnpj && cnpj.length !== 14 && cnpj.length !== 11) throw falha('O CNPJ deve ter 14 números (ou CPF com 11).');
  const ini = texto(v.contratoInicio, 10), fim = texto(v.contratoFim, 10);
  if ((ini && !dataOk(ini)) || (fim && !dataOk(fim))) throw falha('Data do contrato inválida.');
  if (ini && fim && fim < ini) throw falha('O fim do contrato não pode ser antes do início.');
  const valor = v.valorMensal === '' || v.valorMensal == null ? '' : numero(v.valorMensal);
  if (valor !== '' && !(valor >= 0)) throw falha('Valor mensal inválido.');
  const freq = texto(v.frequencia, 20);
  if (freq && !(freq in PREST_FREQ)) throw falha('Frequência inválida.');
  const ult = texto(v.ultimaVisita, 10), prox = texto(v.proximaVisita, 10);
  if ((ult && !dataOk(ult)) || (prox && !dataOk(prox))) throw falha('Data de visita inválida.');
  if (ult && ult > hoje()) throw falha('A última visita não pode ser depois de hoje.');
  const campos = {
    nome, servico: texto(v.servico, 60), contato: texto(v.contato, 80), telefone: texto(v.telefone, 30), email,
    cnpj: cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : cnpj.length === 11 ? cnpj.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : '',
    endereco: texto(v.endereco, 200), contratoInicio: ini, contratoFim: fim, valorMensal: valor, frequencia: freq,
    ultimaVisita: ult, proximaVisita: prox || (ult ? prestProxima(ult, freq) : ''), observacao: texto(v.observacao, 1000),
    ativo: v.ativo === false ? 'Não' : 'Sim', atualizadoEm: agora(), atualizadoPor: conta.nome
  };
  const t = tabela('prest'), todos = linhas(t);
  const igual = todos.find(x => x.id !== v.id && /^s/i.test(x.ativo) && String(x.nome).trim().toLowerCase() === nome.toLowerCase());
  if (igual && campos.ativo === 'Sim') throw falha('Já existe um prestador ativo com o nome "' + igual.nome + '".');
  if (v.id) {
    const x = todos.find(p => p.id === v.id);
    if (!x) throw falha('Prestador não encontrado. Atualize a página.');
    gravar(t, campos, x._row);
    AUDIT_DET = 'Alterou o prestador ' + nome + (campos.ativo === 'Sim' ? '' : ' (inativo)');
    return 'Prestador ' + nome + ' salvo.';
  }
  gravar(t, Object.assign({ id: novoId('PR'), docs: '[]', visitas: '[]', criadoEm: agora(), criadoPor: conta.nome }, campos));
  AUDIT_DET = 'Cadastrou o prestador ' + nome;
  return 'Prestador ' + nome + ' cadastrado.';
}
function prestAchar(id) {
  const t = tabela('prest'), x = linhas(t).find(p => p.id === texto(id, 40));
  if (!x) throw falha('Prestador não encontrado. Atualize a página.');
  return { t, x };
}
// registra uma visita feita: atualiza a última e calcula a próxima pela frequência
function prestVisita(r, conta) {
  const { t, x } = prestAchar(r.id);
  const data = texto(r.data, 10) || hoje();
  if (!dataOk(data)) throw falha('Data da visita inválida.');
  if (data > hoje()) throw falha('A visita não pode ser depois de hoje.');
  const visitas = prestJSON(x.visitas, []);
  visitas.push({ data, obs: texto(r.obs, 300), por: conta.nome, em: agora() });
  const ultima = !x.ultimaVisita || data >= x.ultimaVisita ? data : x.ultimaVisita;
  const proxima = prestProxima(ultima, x.frequencia) || (ultima === data ? '' : x.proximaVisita);
  gravar(t, { visitas: JSON.stringify(visitas.slice(-60)), ultimaVisita: ultima, proximaVisita: proxima, atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  AUDIT_DET = 'Registrou visita de ' + x.nome + ' em ' + data.split('-').reverse().join('/');
  return 'Visita registrada.' + (proxima ? ' Próxima prevista para ' + proxima.split('-').reverse().join('/') + '.' : '');
}
function prestDoc(r, conta) {
  const { t, x } = prestAchar(r.id);
  const docs = prestJSON(x.docs, []);
  if (docs.length >= PREST_MAX_DOCS) throw falha('Este prestador já tem ' + PREST_MAX_DOCS + ' documentos. Tire algum antes.');
  const tipos = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
  const ext = tipos[r.mime];
  if (!ext) throw falha('Envie o documento em PDF ou foto (JPG ou PNG).');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 10000000) throw falha('O arquivo está muito grande (máximo de 7 MB).');
  const nome = texto(r.nome, 80) || 'Documento';
  const validade = texto(r.validade, 10);
  if (validade && !dataOk(validade)) throw falha('Validade inválida.');
  const arq = (x.nome + ' - ' + nome).replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) + '.' + ext;
  const f = pastaPrestadores().createFile(Utilities.newBlob(Utilities.base64Decode(b64), r.mime, arq));
  docs.push({ id: f.getId(), nome, validade, mime: r.mime, em: agora(), por: conta.nome });
  gravar(t, { docs: JSON.stringify(docs), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  AUDIT_DET = 'Anexou "' + nome + '" ao prestador ' + x.nome;
  return 'Documento anexado.';
}
function prestDocRemover(r, conta) {
  const { t, x } = prestAchar(r.id);
  const docs = prestJSON(x.docs, []), d = docs.find(k => k.id === String(r.docId || ''));
  if (!d) throw falha('Documento não encontrado neste prestador.');
  try { fotoDaPasta(d.id, pastaPrestadores()).setTrashed(true); } catch (e) {}
  gravar(t, { docs: JSON.stringify(docs.filter(k => k.id !== d.id)), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  AUDIT_DET = 'Tirou "' + d.nome + '" do prestador ' + x.nome;
  return 'Documento retirado.';
}
// importação pela planilha: cada linha cadastra um prestador novo ou atualiza o que já existe
// (pelo ID da planilha baixada do sistema, pelo CNPJ ou pelo nome). Célula em branco mantém o que já estava.
const PREST_CAMPOS = ['nome', 'servico', 'contato', 'telefone', 'email', 'cnpj', 'endereco', 'contratoInicio', 'contratoFim', 'valorMensal',
  'frequencia', 'ultimaVisita', 'proximaVisita', 'observacao', 'ativo'];
function prestImportar(r, conta) {
  const linhas_ = Array.isArray(r.linhas) ? r.linhas : [];
  if (!linhas_.length) throw falha('A planilha não tem nenhuma linha preenchida.');
  if (linhas_.length > 300) throw falha('Importe no máximo 300 prestadores de cada vez.');
  const so = s => String(s || '').replace(/\D/g, ''), nm = s => String(s || '').trim().toLowerCase();
  let novos = 0, atualizados = 0;
  const erros = [];
  linhas_.forEach((l, i) => {
    const n = Number(l._linha) || i + 2;
    try {
      const todos = linhas(tabela('prest'));
      const atual = (l.id && todos.find(x => x.id === String(l.id))) || (so(l.cnpj) && todos.find(x => so(x.cnpj) === so(l.cnpj)))
        || (l.nome && todos.find(x => nm(x.nome) === nm(l.nome))) || null;
      const v = {};
      if (atual) PREST_CAMPOS.forEach(k => { v[k] = atual[k]; });
      PREST_CAMPOS.forEach(k => { if (l[k] !== undefined && l[k] !== null && String(l[k]).trim() !== '') v[k] = l[k]; });
      if (l.ultimaVisita && !l.proximaVisita) v.proximaVisita = ''; // recalcula pela frequência
      v.ativo = /^n/i.test(String(v.ativo || 'Sim')) ? false : true;
      if (atual) v.id = atual.id;
      prestSalvar(v, conta);
      if (atual) atualizados++; else novos++;
    } catch (e) { erros.push('linha ' + n + ': ' + String(e.message || e)); }
  });
  AUDIT_DET = 'Planilha de prestadores: ' + novos + ' novo(s), ' + atualizados + ' atualizado(s)' + (erros.length ? ', ' + erros.length + ' com erro' : '');
  return (novos ? novos + ' prestador' + (novos === 1 ? '' : 'es') + ' cadastrado' + (novos === 1 ? '' : 's') + '. ' : '')
    + (atualizados ? atualizados + ' atualizado' + (atualizados === 1 ? '' : 's') + '. ' : '')
    + (erros.length ? erros.length + ' linha' + (erros.length === 1 ? '' : 's') + ' com erro (' + erros.slice(0, 5).join('; ') + (erros.length > 5 ? '; …' : '') + ').' : '')
    || 'Nada foi alterado.';
}
// abre um documento: só os que pertencem ao prestador e estão na pasta dos prestadores
function prestVerDoc(r) {
  const { x } = prestAchar(r.id);
  const d = prestJSON(x.docs, []).find(k => k.id === String(r.docId || ''));
  if (!d) throw falha('Documento não encontrado neste prestador.');
  const f = verArquivo(d.id, pastaPrestadores());
  f.nome = x.nome + ' · ' + d.nome;
  return f;
}

// ---------- unidades, moradores, pets e veículos (setor Administração; dados pessoais) ----------
// Vê quem tem "Ver unidades e moradores"; altera quem tem "Editar unidades e moradores". Tudo vai para a Auditoria.
const UN_OCUP = ['Ocupada', 'Em obra', 'Vazia'], UN_SIT = ['Proprietário', 'Alugado'], UN_SN = ['Sim', 'Não'];
function unExigir(conta, editar) {
  const p = conta.perms || {};
  if (editar ? !p.un_editar : !(p.un_ver || p.un_editar)) { const e = falha(editar ? 'Seu perfil não tem permissão para alterar o cadastro das unidades.' : 'Seu perfil não tem permissão para ver as unidades e os moradores.'); e.negado = true; throw e; }
}
const unSN = v => { const s = String(v || '').trim().toLowerCase(); return !s ? '' : /^s/.test(s) ? 'Sim' : /^n/.test(s) ? 'Não' : ''; };
const unLimpa = o => { const c = Object.assign({}, o); delete c._row; return c; };
// número do bloco para ordenar: "1 (SEYCHELES)" → 1
const unBlocoN = b => { const m = /^\s*(\d+)/.exec(String(b || '')); return m ? Number(m[1]) : 999; };
function unBlocos(unidades) {
  let salvos = [];
  try { salvos = JSON.parse(PropertiesService.getScriptProperties().getProperty('UN_BLOCOS') || '[]'); } catch (e) { salvos = []; }
  const todos = salvos.slice();
  unidades.forEach(u => { if (todos.indexOf(u.bloco) < 0) todos.push(u.bloco); });
  return todos.sort((a, b) => unBlocoN(a) - unBlocoN(b) || String(a).localeCompare(String(b), 'pt-BR'));
}
function unLista() {
  const us = linhas(tabela('un')).map(unLimpa), pes = linhas(tabela('unp')).map(unLimpa), pets = linhas(tabela('unpet')).map(unLimpa), vs = linhas(tabela('unv')).map(unLimpa);
  const por = {};
  us.forEach(u => { u.pessoas = []; u.pets = []; u.veiculos = []; por[u.id] = u; });
  pes.sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)).forEach(x => { if (por[x.unidade]) por[x.unidade].pessoas.push(x); });
  pets.forEach(x => { if (por[x.unidade]) por[x.unidade].pets.push(x); });
  vs.forEach(x => { if (por[x.unidade]) por[x.unidade].veiculos.push(x); });
  us.sort((a, b) => unBlocoN(a.bloco) - unBlocoN(b.bloco) || String(a.bloco).localeCompare(String(b.bloco)) || (Number(a.numero) || 0) - (Number(b.numero) || 0) || String(a.numero).localeCompare(String(b.numero)));
  return { unidades: us, blocos: unBlocos(us) };
}
// regrava a aba inteira de uma vez (rápido no Google e sem converter telefone em número)
function substituirLinhas(t, objs) {
  const n = t.sh.getLastRow() - 1;
  if (n > 0) t.sh.getRange(2, 1, n, t.ncol).clearContent();
  if (!objs.length) return;
  const vals = objs.map(o => { const r = new Array(t.ncol).fill(''); t.def.cols.forEach(([k]) => { if (o[k] !== undefined && o[k] !== null) r[t.idx[k]] = String(o[k]); }); return r; });
  const rng = t.sh.getRange(2, 1, vals.length, t.ncol);
  rng.setNumberFormat('@');
  rng.setValues(vals);
}
function unPessoas(lista, u) {
  return (Array.isArray(lista) ? lista : []).slice(0, 60).map((x, i) => {
    const nome = texto(x.nome, 120);
    if (!nome) throw falha('Informe o nome de cada pessoa da unidade ' + u.numero + ' (ou tire a linha vazia).');
    return { id: /^[A-Za-z0-9_-]{4,40}$/.test(String(x.id || '')) ? String(x.id) : novoId('MP'), unidade: u.id, bloco: u.bloco, numero: u.numero, nome,
      parentesco: texto(x.parentesco, 60), morador: unSN(x.morador), facial: unSN(x.facial), barco: unSN(x.barco), contatos: texto(x.contatos, 300), ordem: i + 1 };
  });
}
function unPets(lista, u) {
  return (Array.isArray(lista) ? lista : []).slice(0, 30).map(x => ({ id: /^[A-Za-z0-9_-]{4,40}$/.test(String(x.id || '')) ? String(x.id) : novoId('PT'), unidade: u.id, bloco: u.bloco, numero: u.numero, descricao: texto(x.descricao, 120) })).filter(x => x.descricao);
}
function unVeiculos(lista, u) {
  return (Array.isArray(lista) ? lista : []).slice(0, 30).map(x => ({ id: /^[A-Za-z0-9_-]{4,40}$/.test(String(x.id || '')) ? String(x.id) : novoId('VC'), unidade: u.id, bloco: u.bloco, numero: u.numero,
    vaga: texto(x.vaga, 10).toUpperCase(), marca: texto(x.marca, 40), modelo: texto(x.modelo, 60), cor: texto(x.cor, 30), tag: texto(x.tag, 40), placa: texto(x.placa, 10).toUpperCase().replace(/\s+/g, '') }))
    .filter(x => x.placa || x.marca || x.modelo || x.vaga);
}
// salva a ficha de uma unidade (dados, pessoas, pets e veículos); "cadastro" marca a atualização cadastral de hoje
function unSalvar(r, conta) {
  const v = r.unidade || {};
  const tu = tabela('un'), us = linhas(tu), u = us.find(x => x.id === texto(v.id, 40));
  if (!u) throw falha('Unidade não encontrada. Atualize a tela.');
  const sit = UN_SIT.indexOf(v.situacao) >= 0 ? v.situacao : '';
  const ocup = UN_OCUP.indexOf(v.ocupacao) >= 0 ? v.ocupacao : (u.ocupacao || 'Vazia');
  const campos = { situacao: sit, ocupacao: ocup, proprietario: texto(v.proprietario, 200), contatos: texto(v.contatos, 600), identidade: texto(v.identidade, 300),
    obs: texto(v.obs, 1000), atualizadoEm: agora(), atualizadoPor: conta.nome };
  if (r.cadastro) { campos.cadastroEm = agora(); campos.cadastroPor = conta.nome; }
  const pessoas = unPessoas(v.pessoas, u), pets = unPets(v.pets, u), veiculos = unVeiculos(v.veiculos, u);
  gravar(tu, campos, u._row);
  [['unp', pessoas], ['unpet', pets], ['unv', veiculos]].forEach(([k, novos]) => {
    const t = tabela(k), outros = linhas(t).filter(x => x.unidade !== u.id).map(unLimpa);
    substituirLinhas(t, outros.concat(novos));
  });
  AUDIT_DET = (r.cadastro ? 'Atualização cadastral' : 'Alterou o cadastro') + ' da unidade ' + u.numero + ' (bloco ' + u.bloco + '): ' + pessoas.length + ' pessoa(s), ' + pets.length + ' pet(s), ' + veiculos.length + ' veículo(s)';
  return 'Unidade ' + u.numero + ' salva.' + (r.cadastro ? ' Atualização cadastral registrada hoje.' : '');
}
// blocos, andares e unidades (tela Configurações): cria, renomeia e tira; não tira unidade que tenha cadastro
function unConfig(r, conta) {
  const blocos = Array.isArray(r.blocos) ? r.blocos : [];
  if (blocos.length > 60) throw falha('Blocos demais.');
  const tu = tabela('un'), us = linhas(tu), porId = {};
  us.forEach(u => { porId[u.id] = u; });
  const pes = linhas(tabela('unp')), pets = linhas(tabela('unpet')), vs = linhas(tabela('unv'));
  const temCadastro = id => pes.some(x => x.unidade === id) || pets.some(x => x.unidade === id) || vs.some(x => x.unidade === id) || !!(porId[id] && String(porId[id].proprietario || '').trim());
  const nomes = {}, novos = [], vistos = {};
  let criadas = 0, renomeadas = 0;
  blocos.forEach(b => {
    const nome = texto(b.nome, 60);
    if (!nome) throw falha('Todo bloco precisa de um nome.');
    if (nomes[nome.toLowerCase()]) throw falha('O bloco "' + nome + '" aparece duas vezes.');
    nomes[nome.toLowerCase()] = true;
    (Array.isArray(b.unidades) ? b.unidades : []).forEach(x => {
      const numero = texto(x.numero, 12);
      if (!numero) throw falha('Toda unidade precisa de um número (bloco ' + nome + ').');
      const chave = nome.toLowerCase() + '|' + numero.toLowerCase();
      if (vistos[chave]) throw falha('A unidade ' + numero + ' aparece duas vezes no bloco ' + nome + '.');
      vistos[chave] = true;
      const andar = texto(x.andar, 4) || String(Math.floor((Number(numero) || 0) / 100) || '');
      const atual = x.id && porId[x.id];
      if (atual) {
        if (atual.bloco !== nome || atual.numero !== numero || String(atual.andar) !== andar) renomeadas++;
        novos.push(Object.assign(unLimpa(atual), { bloco: nome, numero, andar }));
        delete porId[x.id];
      } else {
        criadas++;
        novos.push({ id: novoId('UN'), bloco: nome, andar, numero, situacao: '', ocupacao: 'Vazia', proprietario: '', contatos: '', identidade: '', obs: '', cadastroEm: '', cadastroPor: '', atualizadoEm: agora(), atualizadoPor: conta.nome });
      }
    });
  });
  const sairam = Object.keys(porId);
  const presas = sairam.filter(temCadastro).map(id => porId[id].numero + ' (' + porId[id].bloco + ')');
  if (presas.length) throw falha('Não dá para tirar unidade com cadastro (proprietário, pessoas, pets ou veículos): ' + presas.slice(0, 5).join(', ') + (presas.length > 5 ? '…' : '') + '. Limpe o cadastro dela antes.');
  substituirLinhas(tu, novos);
  // bloco/número também ficam nas abas de pessoas, pets e veículos (para quem lê a planilha)
  const porNovo = {}; novos.forEach(u => { porNovo[u.id] = u; });
  [['unp', pes], ['unpet', pets], ['unv', vs]].forEach(([k, l]) => {
    if (!l.some(x => porNovo[x.unidade] && (porNovo[x.unidade].bloco !== x.bloco || porNovo[x.unidade].numero !== x.numero))) return;
    substituirLinhas(tabela(k), l.map(x => Object.assign(unLimpa(x), porNovo[x.unidade] ? { bloco: porNovo[x.unidade].bloco, numero: porNovo[x.unidade].numero } : {})));
  });
  PropertiesService.getScriptProperties().setProperty('UN_BLOCOS', JSON.stringify(blocos.map(b => texto(b.nome, 60))));
  AUDIT_DET = 'Configuração das unidades: ' + blocos.length + ' bloco(s), ' + novos.length + ' unidade(s); ' + criadas + ' criada(s), ' + sairam.length + ' retirada(s), ' + renomeadas + ' alterada(s)';
  return 'Configuração salva: ' + novos.length + ' unidades em ' + blocos.length + ' blocos.' + (criadas ? ' ' + criadas + ' nova(s).' : '') + (sairam.length ? ' ' + sairam.length + ' retirada(s).' : '');
}
// marca como ocupadas as unidades com ao menos uma pessoa com "Morador? = Sim"
function unOcupadas(conta) {
  const tu = tabela('un'), us = linhas(tu), pes = linhas(tabela('unp'));
  const com = {}; pes.forEach(x => { if (x.morador === 'Sim') com[x.unidade] = true; });
  let n = 0;
  const novos = us.map(u => { const o = unLimpa(u); if (com[u.id] && u.ocupacao !== 'Ocupada') { o.ocupacao = 'Ocupada'; o.atualizadoEm = agora(); o.atualizadoPor = conta.nome; n++; } return o; });
  if (n) substituirLinhas(tu, novos);
  AUDIT_DET = 'Marcou ' + n + ' unidade(s) como ocupadas (com morador ativo)';
  return n ? n + ' unidade' + (n === 1 ? '' : 's') + ' marcada' + (n === 1 ? '' : 's') + ' como ocupada' + (n === 1 ? '' : 's') + '.' : 'Nenhuma unidade para mudar: as que têm morador ativo já estão como ocupadas.';
}
// importação da planilha de cadastro (lida no navegador): substitui o cadastro inteiro de uma vez.
// Mantém o ID, "Em obra" e a data da atualização cadastral das unidades que já existiam (pelo bloco + número).
function unImportar(r, conta) {
  const lista = Array.isArray(r.unidades) ? r.unidades : [];
  if (!lista.length) throw falha('A planilha não tem unidades.');
  if (lista.length > 2000) throw falha('Unidades demais na planilha.');
  const tu = tabela('un'), antes = {};
  linhas(tu).forEach(u => { antes[String(u.bloco).toLowerCase() + '|' + String(u.numero).toLowerCase()] = u; });
  const us = [], pes = [], pets = [], vs = [], vistos = {};
  lista.forEach(x => {
    const bloco = texto(x.bloco, 60), numero = texto(x.numero, 12);
    if (!bloco || !numero) return;
    const chave = bloco.toLowerCase() + '|' + numero.toLowerCase();
    if (vistos[chave]) throw falha('A unidade ' + numero + ' do bloco ' + bloco + ' aparece duas vezes na planilha.');
    vistos[chave] = true;
    const a = antes[chave] || {};
    const u = { id: a.id || novoId('UN'), bloco, andar: texto(x.andar, 4) || String(Math.floor((Number(numero) || 0) / 100) || ''), numero,
      situacao: UN_SIT.indexOf(x.situacao) >= 0 ? x.situacao : '', proprietario: texto(x.proprietario, 200), contatos: texto(x.contatos, 600),
      identidade: texto(x.identidade, 300), obs: a.obs || '', cadastroEm: a.cadastroEm || '', cadastroPor: a.cadastroPor || '', atualizadoEm: agora(), atualizadoPor: conta.nome };
    const p = unPessoas((x.pessoas || []).filter(z => texto(z.nome, 120)), u);
    u.ocupacao = a.ocupacao === 'Em obra' ? 'Em obra' : p.some(z => z.morador === 'Sim') ? 'Ocupada' : 'Vazia';
    us.push(u); p.forEach(z => pes.push(z)); unPets(x.pets, u).forEach(z => pets.push(z)); unVeiculos(x.veiculos, u).forEach(z => vs.push(z));
  });
  if (!us.length) throw falha('Nenhuma unidade com bloco e número na planilha.');
  substituirLinhas(tu, us); substituirLinhas(tabela('unp'), pes); substituirLinhas(tabela('unpet'), pets); substituirLinhas(tabela('unv'), vs);
  const blocos = unBlocos(us);
  PropertiesService.getScriptProperties().setProperty('UN_BLOCOS', JSON.stringify(blocos));
  AUDIT_DET = 'Importou o cadastro: ' + us.length + ' unidades, ' + pes.length + ' pessoas, ' + pets.length + ' pets, ' + vs.length + ' veículos';
  return 'Cadastro importado: ' + us.length + ' unidades em ' + blocos.length + ' blocos, ' + pes.length + ' pessoas, ' + pets.length + ' pets e ' + vs.length + ' veículos.';
}

// ---------- central de medições (água, energia e gás; setor Administração) ----------
// Medidores, leituras do relógio (o consumo é a diferença entre duas leituras; o site divide pelos dias entre elas)
// e contas mensais da concessionária (consumo e valor em R$). Lança quem tem "Lançar medições"; vê quem tem uma das duas.
const MED_TIPOS = ['Água', 'Energia', 'Gás'], MED_UNID = ['m³', 'kWh', 'Litros'];
function medExigir(conta, lancar) {
  const p = conta.perms || {};
  if (lancar ? !p.med_lancar : !(p.med_ver || p.med_lancar)) { const e = falha(lancar ? 'Seu perfil não tem permissão para lançar medições.' : 'Seu perfil não tem permissão para ver as medições.'); e.negado = true; throw e; }
}
// padrão brasileiro: "1.420" = 1420 (ponto de milhar); "1.050,5" e "1050,5" = 1050,5
const medNum = v => (v === '' || v === null || v === undefined) ? NaN : /^\d{1,3}(\.\d{3})+$/.test(String(v).trim()) ? Number(String(v).trim().replace(/\./g, '')) : numero(v);
const medDataBR = s => String(s || '').split('-').reverse().join('/');
const medFmt = n => (Math.round(Number(n) * 1000) / 1000).toLocaleString('pt-BR');
function medLista() {
  const ms = linhas(tabela('med')).map(unLimpa), ls = linhas(tabela('medl')).map(unLimpa), cs = linhas(tabela('medc')).map(unLimpa);
  ls.sort((a, b) => String(a.data).localeCompare(String(b.data)));
  cs.sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
  return { medidores: ms, leituras: ls, contas: cs };
}
// acrescenta várias linhas de uma vez no fim da aba (texto fica como texto; números como número)
function anexarLinhas(t, objs) {
  if (!objs.length) return;
  const vals = objs.map(o => { const r = new Array(t.ncol).fill(''); t.def.cols.forEach(([k]) => { const v = o[k]; if (v === undefined || v === null || v === '') return; r[t.idx[k]] = t.def.num.indexOf(k) >= 0 ? Number(v) : String(v); }); return r; });
  const fm = objs.map(() => { const r = new Array(t.ncol).fill('@'); t.def.num.forEach(k => { r[t.idx[k]] = 'General'; }); return r; });
  const rng = t.sh.getRange(t.sh.getLastRow() + 1, 1, vals.length, t.ncol);
  rng.setNumberFormats(fm);
  rng.setValues(vals);
}
function medMedidor(r, conta) {
  const v = r.medidor || {}, t = tabela('med'), todos = linhas(t);
  const atual = v.id ? todos.find(x => x.id === String(v.id)) : null;
  if (v.id && !atual) throw falha('Medidor não encontrado. Atualize a tela.');
  if (r.op === 'excluir') {
    if (!atual) throw falha('Medidor não encontrado. Atualize a tela.');
    const usa = linhas(tabela('medl')).some(x => x.medidor === atual.id) || linhas(tabela('medc')).some(x => x.medidor === atual.id);
    if (usa) throw falha('Este medidor já tem lançamentos. Em vez de excluir, marque como inativo.');
    t.sh.deleteRow(atual._row);
    AUDIT_DET = 'Excluiu o medidor ' + atual.nome + ' (' + atual.tipo + ' nº ' + atual.numero + ')';
    return 'Medidor excluído.';
  }
  const tipo = MED_TIPOS.indexOf(v.tipo) >= 0 ? v.tipo : '';
  if (!tipo) throw falha('Escolha o tipo de concessionária (Água, Energia ou Gás).');
  const nome = texto(v.nome, 60);
  if (!nome) throw falha('Dê um nome ao medidor (ex.: Guarita norte).');
  const num = texto(v.numero, 40);
  if (!num) throw falha('Informe o número do medidor.');
  const casas = Number(v.casas);
  if (!(casas === Math.floor(casas) && casas >= 3 && casas <= 12)) throw falha('O número de casas do medidor deve ficar entre 3 e 12.');
  const unidade = MED_UNID.indexOf(v.unidade) >= 0 ? v.unidade : '';
  if (!unidade) throw falha('Escolha a unidade de medida.');
  if (todos.some(x => (!atual || x.id !== atual.id) && x.tipo === tipo && String(x.numero).toLowerCase() === num.toLowerCase())) throw falha('Já existe um medidor de ' + tipo + ' com o número ' + num + '.');
  if (atual) {
    const maxL = linhas(tabela('medl')).filter(x => x.medidor === atual.id).reduce((m, x) => Math.max(m, Number(x.leitura) || 0), 0);
    if (maxL >= Math.pow(10, casas)) throw falha('Este medidor já tem leitura com mais de ' + casas + ' casas (' + medFmt(maxL) + '). Confira o número de casas.');
  }
  const temLim = String(v.limite === undefined || v.limite === null ? '' : v.limite).trim() !== '', limite = temLim ? medNum(v.limite) : '';
  if (temLim && !(limite > 0 && isFinite(limite))) throw falha('O limite diário deve ser um número maior que zero (ou fique em branco).');
  const prox = String(v.proxCiclo || '');
  if (prox && !dataOk(prox)) throw falha('Data inválida na próxima leitura da concessionária.');
  const o = { tipo, nome, numero: num, casas, unidade, local: texto(v.local, 80), obs: texto(v.obs, 300), limite: temLim ? Math.round(limite * 1000) / 1000 : '', proxCiclo: prox,
    ativo: v.ativo === false || v.ativo === 'Não' ? 'Não' : 'Sim', atualizadoEm: agora(), atualizadoPor: conta.nome };
  if (atual) {
    gravar(t, o, atual._row);
    AUDIT_DET = 'Alterou o medidor ' + nome + ' (' + tipo + ' nº ' + num + ')' + (o.ativo === 'Não' ? ' — inativo' : '');
    return 'Medidor salvo.';
  }
  o.id = novoId('MD'); o.criadoEm = agora(); o.criadoPor = conta.nome;
  gravar(t, o);
  AUDIT_DET = 'Cadastrou o medidor ' + nome + ' (' + tipo + ' nº ' + num + ')';
  return 'Medidor cadastrado.';
}
// confere uma leitura contra as outras do mesmo medidor ("outras" em ordem de data)
function medConferirLeitura(m, outras, l, auto) {
  const casas = Number(m.casas) || 0, lim = casas ? Math.pow(10, casas) : Infinity;
  if (l.leitura >= lim) throw falha('A leitura ' + medFmt(l.leitura) + ' tem mais casas que o medidor ' + m.nome + ' (' + casas + ' casas).');
  if (outras.some(x => x.data === l.data)) throw falha('O medidor ' + m.nome + ' já tem leitura em ' + medDataBR(l.data) + '. Edite a que já existe.');
  const antes = outras.filter(x => x.data < l.data), ant = antes[antes.length - 1], prox = outras.find(x => x.data > l.data);
  l.virada = '';
  if (ant && l.leitura < Number(ant.leitura)) {
    // relógio que passou do máximo e recomeçou do zero: só com a marcação (ou, na planilha, quando a queda é maior que meio relógio)
    const virou = l.querVirada || (auto && casas && Number(ant.leitura) - l.leitura > lim / 2);
    if (!virou) throw falha('A leitura de ' + m.nome + ' (' + medFmt(l.leitura) + ') é menor que a anterior (' + medFmt(ant.leitura) + ' em ' + medDataBR(ant.data) + '). Confira o número. Se o relógio passou do máximo e recomeçou do zero, marque "o relógio virou".');
    l.virada = 'Sim';
  }
  if (prox && Number(prox.leitura) < l.leitura && prox.virada !== 'Sim') throw falha('A leitura de ' + m.nome + ' (' + medFmt(l.leitura) + ') é maior que a seguinte (' + medFmt(prox.leitura) + ' em ' + medDataBR(prox.data) + '). Confira a data e o número.');
}
// lança (ou corrige) leituras; várias de uma vez (a ronda dos medidores do dia). Confere todas antes de gravar.
function medLeituras(r, conta) {
  const t = tabela('medl'), todas = linhas(t), meds = linhas(tabela('med'));
  if (r.op === 'excluir') {
    const x = todas.find(z => z.id === String(r.id || ''));
    if (!x) throw falha('Leitura não encontrada. Atualize a tela.');
    const m = meds.find(z => z.id === x.medidor) || { nome: 'medidor' };
    t.sh.deleteRow(x._row);
    AUDIT_DET = 'Excluiu a leitura de ' + m.nome + ' em ' + medDataBR(x.data) + ' (' + medFmt(x.leitura) + ')';
    return 'Leitura excluída.';
  }
  const lista = Array.isArray(r.leituras) ? r.leituras : [];
  if (!lista.length) throw falha('Informe ao menos uma leitura.');
  if (lista.length > 60) throw falha('Lance no máximo 60 leituras de cada vez.');
  const hj = hoje(), trab = todas.slice(), novas = [], edits = [], vistos = {};
  lista.forEach(x => {
    const m = meds.find(z => z.id === String(x.medidor || ''));
    if (!m) throw falha('Medidor não encontrado. Atualize a tela.');
    const data = String(x.data || '');
    if (!dataOk(data)) throw falha('Data inválida na leitura de ' + m.nome + '.');
    if (data > hj) throw falha('A data da leitura de ' + m.nome + ' não pode ser no futuro.');
    if (vistos[m.id + '|' + data]) throw falha('O medidor ' + m.nome + ' aparece duas vezes no mesmo dia.');
    vistos[m.id + '|' + data] = true;
    const atual = x.id ? todas.find(z => z.id === String(x.id)) : null;
    if (x.id && !atual) throw falha('Leitura não encontrada. Atualize a tela.');
    if (!atual && m.ativo === 'Não') throw falha('O medidor ' + m.nome + ' está inativo.');
    const leitura = medNum(x.leitura);
    if (!(leitura >= 0) || !isFinite(leitura)) throw falha('Leitura inválida para ' + m.nome + '.');
    const l = { leitura: Math.round(leitura * 1000) / 1000, data, querVirada: !!x.virada };
    const outras = trab.filter(z => z.medidor === m.id && (!atual || z.id !== atual.id)).sort((a, b) => String(a.data).localeCompare(String(b.data)));
    medConferirLeitura(m, outras, l, false);
    const o = { medidor: m.id, data, leitura: l.leitura, virada: l.virada, obs: texto(x.obs, 200), ciclo: x.ciclo ? 'Sim' : '' };
    if (atual) {
      o.id = atual.id; o.atualizadoEm = agora(); o.atualizadoPor = conta.nome;
      edits.push({ o, row: atual._row, m });
      trab[trab.indexOf(atual)] = Object.assign({}, atual, o);
    } else {
      o.id = novoId('ML'); o.registradoEm = agora(); o.registradoPor = conta.nome;
      novas.push(o); trab.push(o);
    }
  });
  edits.forEach(e => gravar(t, e.o, e.row));
  anexarLinhas(t, novas);
  const nomes = lista.map(x => (meds.find(z => z.id === String(x.medidor)) || {}).nome).filter(Boolean);
  AUDIT_DET = (edits.length ? 'Corrigiu ' : 'Lançou ') + lista.length + ' leitura(s): ' + nomes.slice(0, 6).join(', ') + (nomes.length > 6 ? '…' : '');
  return edits.length && !novas.length ? 'Leitura corrigida.' : novas.length === 1 ? 'Leitura lançada.' : novas.length + ' leituras lançadas.';
}
// conta mensal da concessionária: consumo e valor (R$) de um medidor num mês
function medConta(x, meds, todas, conta) {
  const m = meds.find(z => z.id === String(x.medidor || ''));
  if (!m) throw falha('Medidor não encontrado.');
  const mes = String(x.mes || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw falha('Mês de referência inválido na conta de ' + m.nome + '.');
  if (mes > hoje().slice(0, 7)) throw falha('O mês da conta de ' + m.nome + ' não pode ser no futuro.');
  const consumo = medNum(x.consumo), valor = medNum(x.valor);
  const temC = String(x.consumo === undefined || x.consumo === null ? '' : x.consumo).trim() !== '', temV = String(x.valor === undefined || x.valor === null ? '' : x.valor).trim() !== '';
  if (temC && !(consumo >= 0 && isFinite(consumo))) throw falha('Consumo inválido na conta de ' + m.nome + '.');
  if (temV && !(valor >= 0 && isFinite(valor))) throw falha('Valor inválido na conta de ' + m.nome + '.');
  if (!temC && !temV) throw falha('Informe o consumo ou o valor da conta de ' + m.nome + '.');
  const venc = String(x.vencimento || '');
  if (venc && !dataOk(venc)) throw falha('Vencimento inválido na conta de ' + m.nome + '.');
  return { m, o: { medidor: m.id, mes, consumo: temC ? Math.round(consumo * 1000) / 1000 : '', valor: temV ? Math.round(valor * 100) / 100 : '', vencimento: venc, obs: texto(x.obs, 200) } };
}
function medContas(r, conta) {
  const t = tabela('medc'), todas = linhas(t), meds = linhas(tabela('med'));
  if (r.op === 'excluir') {
    const x = todas.find(z => z.id === String(r.id || ''));
    if (!x) throw falha('Conta não encontrada. Atualize a tela.');
    const m = meds.find(z => z.id === x.medidor) || { nome: 'medidor' };
    t.sh.deleteRow(x._row);
    AUDIT_DET = 'Excluiu a conta de ' + m.nome + ' de ' + x.mes;
    return 'Conta excluída.';
  }
  const v = r.conta || {};
  const atual = v.id ? todas.find(z => z.id === String(v.id)) : null;
  if (v.id && !atual) throw falha('Conta não encontrada. Atualize a tela.');
  const { m, o } = medConta(v, meds, todas, conta);
  if (todas.some(z => (!atual || z.id !== atual.id) && z.medidor === o.medidor && z.mes === o.mes)) throw falha('Já há conta de ' + m.nome + ' em ' + o.mes.split('-').reverse().join('/') + '. Edite a que já existe.');
  if (atual) { o.atualizadoEm = agora(); o.atualizadoPor = conta.nome; gravar(t, o, atual._row); }
  else { o.id = novoId('MC'); o.registradoEm = agora(); o.registradoPor = conta.nome; gravar(t, o); }
  AUDIT_DET = (atual ? 'Corrigiu' : 'Lançou') + ' a conta de ' + m.nome + ' de ' + o.mes.split('-').reverse().join('/') + (o.valor !== '' ? ': R$ ' + Number(o.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  return atual ? 'Conta corrigida.' : 'Conta lançada.';
}
// planilha lida no navegador: leituras (data, medidor, leitura) e/ou contas (mês, medidor, consumo, valor).
// Grava as linhas certas, pula as repetidas e devolve as com erro.
function medImportar(r, conta) {
  const ls = Array.isArray(r.leituras) ? r.leituras : [], cs = Array.isArray(r.contas) ? r.contas : [];
  if (!ls.length && !cs.length) throw falha('A planilha não tem lançamentos.');
  if (ls.length + cs.length > 5000) throw falha('Importe no máximo 5.000 linhas de cada vez.');
  const meds = linhas(tabela('med')), erros = [];
  let nL = 0, nC = 0, nA = 0, nM = 0, iguais = 0;
  if (ls.length) {
    const t = tabela('medl'), trab = linhas(t), hj = hoje(), novas = [];
    ls.slice().sort((a, b) => String(a.data).localeCompare(String(b.data))).forEach(x => {
      const n = Number(x._linha) || 0;
      try {
        const m = meds.find(z => z.id === String(x.medidor || ''));
        if (!m) throw falha('medidor não encontrado');
        const data = String(x.data || '');
        if (!dataOk(data)) throw falha('data inválida');
        if (data > hj) throw falha('data no futuro');
        const leitura = medNum(x.leitura);
        if (!(leitura >= 0) || !isFinite(leitura)) throw falha('leitura inválida');
        const lv = Math.round(leitura * 1000) / 1000;
        const mesmo = trab.find(z => z.medidor === m.id && z.data === data);
        if (mesmo && Number(mesmo.leitura) === lv) {
          // já lançada: só acrescenta a marcação da leitura da concessionária, se a planilha trouxer
          if (x.ciclo && mesmo.ciclo !== 'Sim' && mesmo._row) { gravar(t, { ciclo: 'Sim' }, mesmo._row); mesmo.ciclo = 'Sim'; nM++; } else iguais++;
          return;
        }
        const l = { leitura: lv, data, querVirada: false };
        medConferirLeitura(m, trab.filter(z => z.medidor === m.id).sort((a, b) => String(a.data).localeCompare(String(b.data))), l, true);
        const o = { id: novoId('ML'), medidor: m.id, data, leitura: lv, virada: l.virada, obs: texto(x.obs, 200), ciclo: x.ciclo ? 'Sim' : '', registradoEm: agora(), registradoPor: conta.nome + ' (planilha)' };
        novas.push(o); trab.push(o); nL++;
      } catch (e) { erros.push('linha ' + n + ': ' + String(e.message || e)); }
    });
    anexarLinhas(t, novas);
  }
  if (cs.length) {
    const t = tabela('medc'), todas = linhas(t), novas = [];
    cs.forEach(x => {
      const n = Number(x._linha) || 0;
      try {
        const { o } = medConta(x, meds, todas, conta);
        const atual = todas.find(z => z.medidor === o.medidor && z.mes === o.mes);
        if (atual) {
          if (String(atual.consumo) === String(o.consumo) && String(atual.valor) === String(o.valor)) { iguais++; return; }
          o.atualizadoEm = agora(); o.atualizadoPor = conta.nome + ' (planilha)'; gravar(t, o, atual._row); Object.assign(atual, o); nA++;
        } else {
          o.id = novoId('MC'); o.registradoEm = agora(); o.registradoPor = conta.nome + ' (planilha)'; novas.push(o); todas.push(o); nC++;
        }
      } catch (e) { erros.push('linha ' + n + ': ' + String(e.message || e)); }
    });
    anexarLinhas(t, novas);
  }
  AUDIT_DET = 'Planilha de medições: ' + nL + ' leitura(s), ' + (nM ? nM + ' marcada(s) como leitura da concessionária, ' : '') + nC + ' conta(s) nova(s), ' + nA + ' atualizada(s)' + (iguais ? ', ' + iguais + ' repetida(s)' : '') + (erros.length ? ', ' + erros.length + ' com erro' : '');
  return [nL ? nL + ' leitura' + (nL === 1 ? '' : 's') + ' lançada' + (nL === 1 ? '' : 's') + '.' : '',
    nC ? nC + ' conta' + (nC === 1 ? '' : 's') + ' lançada' + (nC === 1 ? '' : 's') + '.' : '',
    nA ? nA + ' conta' + (nA === 1 ? '' : 's') + ' atualizada' + (nA === 1 ? '' : 's') + '.' : '',
    nM ? nM + ' leitura' + (nM === 1 ? '' : 's') + ' marcada' + (nM === 1 ? '' : 's') + ' como leitura da concessionária.' : '',
    iguais ? iguais + ' já estava' + (iguais === 1 ? '' : 'm') + ' lançada' + (iguais === 1 ? '' : 's') + '.' : '',
    erros.length ? erros.length + ' linha' + (erros.length === 1 ? '' : 's') + ' com erro (' + erros.slice(0, 5).join('; ') + (erros.length > 5 ? '; …' : '') + ').' : ''].filter(Boolean).join(' ') || 'Nada foi alterado.';
}

// ---------- espaços (Espaço Gourmet etc.): reservas, vistoria de entrega/devolução e cadastro (setor Administração) ----------
// As reservas chegam pelos e-mails do site da administradora ("Reserva - PRÉ RESERVA ESPAÇO GOURMET", com o número da
// solicitação): lidos no Gmail desta conta (acionador a cada 15 min ou botão "Ler e-mails agora") ou colados na tela.
const ESP_STATUS = ['Solicitada', 'Pré-reserva', 'Confirmada', 'Cancelada', 'Recusada', 'Realizada'];
const ESP_ROTULO = 'Pier Gestão/Reservas lidas';
const ESP_VALOR_GOURMET = 361.44; // valor da reserva do Espaço Gourmet (pedido de 24/10/2026)
const ESP_ITENS_PADRAO = ['Chaves entregues / devolvidas', 'Limpeza do salão e dos banheiros', 'Louças, copos e talheres (quantidade)', 'Geladeira e freezer',
  'Fogão, forno e cooktop', 'Churrasqueira', 'Mesas e cadeiras', 'Ar-condicionado e ventiladores', 'Iluminação e tomadas', 'Som e TV', 'Lixo retirado',
  'Paredes, piso, vidros e mobiliário sem danos'];
function espExigir(conta) {
  if (!(conta.perms || {}).espacos) { const e = falha('Seu perfil não tem permissão para os espaços e reservas.'); e.negado = true; throw e; }
}
const espJSON = (v, p) => { try { const x = JSON.parse(String(v || '')); return Array.isArray(x) ? x : p; } catch (e) { return p; } };
// valor da reserva de um espaço (para gravar na reserva nova)
const espValorDe = nome => { const e = linhas(tabela('esp')).find(x => x.nome === nome); return e && e.valor !== '' ? e.valor : ''; };
function espLista() {
  // Espaço Gourmet cadastrado antes do valor: recebe o valor padrão uma vez
  const te = tabela('esp');
  linhas(te).forEach(e => { if (e.valor === '' && /gourmet/.test(espNome(e.nome))) gravar(te, { valor: ESP_VALOR_GOURMET }, e._row); });
  const es = linhas(tabela('esp')).map(unLimpa).map(e => Object.assign(e, { itens: espJSON(e.itens, []) }));
  const rs = linhas(tabela('esr')).map(unLimpa).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const cs = linhas(tabela('esc')).map(unLimpa).map(c => Object.assign(c, { itens: espJSON(c.itens, []) })).sort((a, b) => String(b.feitoEm).localeCompare(String(a.feitoEm)));
  return { espacos: es, reservas: rs, vistorias: cs };
}
const espNome = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
// acha o espaço pelo nome (ou cria, com o checklist padrão)
function espAchar(nome, conta) {
  const t = tabela('esp'), es = linhas(t), n = espNome(nome);
  const e = es.find(x => espNome(x.nome) === n) || es.find(x => n && (n.indexOf(espNome(x.nome)) >= 0 || espNome(x.nome).indexOf(n) >= 0));
  if (e) return e.nome;
  const o = { id: novoId('ES'), nome: texto(nome, 60) || 'Espaço', capacidade: '', horario: '', regras: '', itens: JSON.stringify(ESP_ITENS_PADRAO), ativo: 'Sim', criadoEm: agora(), criadoPor: conta.nome,
    valor: /gourmet/.test(espNome(nome)) ? ESP_VALOR_GOURMET : '' };
  gravar(t, o);
  return o.nome;
}
// lê o texto de um e-mail de reserva; null se não for um
function espLerTexto(assunto, corpo) {
  const s = (String(assunto || '') + '\n' + String(corpo || '')).replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const g = re => { const m = re.exec(s); return m ? m[1].trim() : ''; };
  const sol = g(/N[úu]mero da Solicita[çc][ãa]o:?\s*(\d+)/i);
  if (!sol) return null;
  const tit = g(/Reserva\s*[-–]\s*([^\n]+)/i) || g(/^([^\n]+)/);
  const d = /para o dia\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(s) || /(?:dia|data)[^\d\n]{0,15}(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(s);
  const T = espNome(tit);
  const status = /cancel/.test(T) ? 'Cancelada' : /recus|negad|reprov|indefer/.test(T) ? 'Recusada' : /pre[\s-]*reserva/.test(T) ? 'Pré-reserva'
    : /confirm|aprov|efetiv|deferid/.test(T) ? 'Confirmada' : 'Solicitada';
  let esp = tit.replace(/pr[ée][\s-]*reserva|cancelamento( da| de)?( reserva)?|reserva (confirmada|cancelada|aprovada|recusada)|confirma[çc][ãa]o( da| de)?|reserva/gi, '').replace(/^[\s:–-]+|[\s:–-]+$/g, '').trim();
  esp = esp ? esp.toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g, x => x.toLowerCase()) : 'Espaço Gourmet';
  return { solicitacao: sol, espaco: texto(esp, 60), status, data: d ? d[3] + '-' + ('0' + d[2]).slice(-2) + '-' + ('0' + d[1]).slice(-2) : '',
    bloco: texto(g(/Bloco:?\s*([^\n]+)/i), 60), unidade: texto(g(/Unidade:?\s*([^\n]+)/i), 20), titulo: texto(tit, 120) };
}
// grava (ou atualiza pelo número da solicitação) as reservas lidas; mensagens mais antigas não desfazem as mais novas
function espProcessar(msgs, conta, origem) {
  const t = tabela('esr'), rs = linhas(t);
  let novas = 0, atual = 0, ign = 0;
  msgs.slice().sort((a, b) => String(a.data).localeCompare(String(b.data))).forEach(m => {
    const r = espLerTexto(m.assunto, m.corpo);
    if (!r) { ign++; return; }
    const quando = String(m.data || agora());
    const ja = rs.find(x => String(x.solicitacao) === r.solicitacao);
    if (ja) {
      if (String(ja.emailEm || '') > quando) { ign++; return; }
      const o = { status: ja.status === 'Realizada' ? 'Realizada' : r.status, emailEm: quando, atualizadoEm: agora(), atualizadoPor: conta.nome + ' (' + origem + ')' };
      if (r.data) o.data = r.data;
      gravar(t, o, ja._row); Object.assign(ja, o); atual++;
    } else {
      const nomeE = espAchar(r.espaco, conta);
      const o = { id: novoId('RS'), solicitacao: r.solicitacao, espaco: nomeE, valor: espValorDe(nomeE), data: r.data, bloco: r.bloco, unidade: r.unidade, status: r.status,
        origem, obs: '', emailEm: quando, registradoEm: agora(), registradoPor: conta.nome };
      gravar(t, o); o._row = 0; rs.push(o); novas++;
    }
  });
  return { novas, atual, ign };
}
// lê no Gmail desta conta os e-mails de reserva ainda não lidos pelo sistema e marca com o rótulo
function espLerEmails(conta) {
  let lbl = GmailApp.getUserLabelByName(ESP_ROTULO);
  if (!lbl) lbl = GmailApp.createLabel(ESP_ROTULO);
  const ths = GmailApp.search('"Solicitação" Reserva newer_than:90d -label:"' + ESP_ROTULO + '"', 0, 60), msgs = [];
  ths.forEach(th => th.getMessages().forEach(m => msgs.push({ assunto: m.getSubject(), corpo: m.getPlainBody(), data: Utilities.formatDate(m.getDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') })));
  const r = espProcessar(msgs, conta, 'e-mail');
  ths.forEach(th => th.addLabel(lbl));
  AUDIT_DET = 'Leu e-mails de reserva: ' + r.novas + ' nova(s), ' + r.atual + ' atualizada(s)';
  return r.novas || r.atual ? (r.novas ? r.novas + ' reserva' + (r.novas === 1 ? '' : 's') + ' nova' + (r.novas === 1 ? '' : 's') + '. ' : '') + (r.atual ? r.atual + ' atualizada' + (r.atual === 1 ? '' : 's') + '.' : '') : 'Nenhum e-mail de reserva novo.';
}
// para o acionador de tempo (a cada 15 minutos): Acionadores → Adicionar → lerReservasAutomatico → Baseado no tempo
function lerReservasAutomatico() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try { espLerEmails({ nome: 'Leitura automática' }); } finally { lock.releaseLock(); }
}
// e-mail colado na tela: "previa" só mostra o que foi lido
function espColar(r, conta) {
  const x = espLerTexto('', texto(r.texto, 20000));
  if (!x) throw falha('Não achei o "Número da Solicitação" nesse texto. Copie o e-mail inteiro da reserva.');
  if (r.previa) { AUDIT_DET = 'Conferiu e-mail de reserva colado (solicitação ' + x.solicitacao + ')'; return { lida: x }; }
  const p = espProcessar([{ assunto: '', corpo: texto(r.texto, 20000), data: agora() }], conta, 'colado');
  AUDIT_DET = 'Reserva colada do e-mail: solicitação ' + x.solicitacao + ' (' + x.status + ')';
  return { texto: p.novas ? 'Reserva ' + x.solicitacao + ' cadastrada.' : 'Reserva ' + x.solicitacao + ' atualizada (' + x.status + ').' };
}
// chave para achar a mesma reserva sem o número da solicitação: data + espaço + nº do bloco + nº da unidade
const espChave = x => [String(x.data || ''), espNome(x.espaco), (/BL\s*0*(\d+)/i.exec(String(x.bloco || '')) || [, espNome(x.bloco)])[1], String(x.unidade || '').replace(/\D/g, '').replace(/^0+/, '')].join('|');
// lista de reservas do site da administradora (PDF lido no navegador): cria as que faltam e atualiza o status das que já existem
function espImportar(r, conta) {
  const lista = Array.isArray(r.lista) ? r.lista.slice(0, 1000) : [];
  if (!lista.length) throw falha('O PDF não tem reservas.');
  const t = tabela('esr'), rs = linhas(t), porChave = {};
  rs.forEach(x => { porChave[espChave(x)] = x; });
  let novas = 0, atual = 0, iguais = 0;
  lista.forEach(v => {
    const data = String(v.data || ''); if (!dataOk(data)) return;
    const status = ESP_STATUS.indexOf(v.status) >= 0 ? v.status : 'Solicitada';
    const o = { data, espaco: espAchar(texto(v.espaco, 60) || 'Espaço Gourmet', conta), bloco: texto(v.bloco, 60), unidade: texto(v.unidade, 20) };
    const ja = porChave[espChave(o)];
    if (ja) {
      if (ja.status === status || ja.status === 'Realizada') { iguais++; return; }
      gravar(t, { status, atualizadoEm: agora(), atualizadoPor: conta.nome + ' (PDF da administradora)' }, ja._row); ja.status = status; atual++;
    } else {
      Object.assign(o, { id: novoId('RS'), solicitacao: '', valor: espValorDe(o.espaco), status, origem: 'PDF', obs: texto([v.hora, v.obs].filter(Boolean).join(' · '), 300), registradoEm: agora(), registradoPor: conta.nome });
      gravar(t, o); porChave[espChave(o)] = o; novas++;
    }
  });
  AUDIT_DET = 'Importou PDF de reservas: ' + novas + ' nova(s), ' + atual + ' atualizada(s), ' + iguais + ' sem mudança';
  return (novas ? novas + ' reserva' + (novas === 1 ? '' : 's') + ' nova' + (novas === 1 ? '' : 's') + '. ' : '') + (atual ? atual + ' com status atualizado. ' : '') + (iguais ? iguais + ' já estava' + (iguais === 1 ? '' : 'm') + ' em dia.' : '') || 'Nada para importar.';
}
function espReserva(r, conta) {
  const t = tabela('esr'), rs = linhas(t), v = r.reserva || {};
  const ja = v.id ? rs.find(x => x.id === String(v.id)) : null;
  if (v.id && !ja) throw falha('Reserva não encontrada. Atualize a tela.');
  if (r.op === 'excluir') { if (!ja) throw falha('Reserva não encontrada.'); t.sh.deleteRow(ja._row); AUDIT_DET = 'Excluiu a reserva ' + (ja.solicitacao || ja.id); return 'Reserva excluída.'; }
  const data = String(v.data || '');
  if (!dataOk(data)) throw falha('Informe a data da reserva.');
  const status = ESP_STATUS.indexOf(v.status) >= 0 ? v.status : 'Confirmada';
  const sol = texto(v.solicitacao, 20);
  if (sol && rs.some(x => x !== ja && String(x.solicitacao) === sol)) throw falha('Já existe uma reserva com a solicitação ' + sol + '.');
  const o = { solicitacao: sol, espaco: espAchar(texto(v.espaco, 60) || 'Espaço Gourmet', conta), data, bloco: texto(v.bloco, 60), unidade: texto(v.unidade, 20), status,
    obs: texto(v.obs, 300), atualizadoEm: agora(), atualizadoPor: conta.nome };
  const tv = String(v.valor === undefined || v.valor === null ? '' : v.valor).trim(), val = tv === '' ? '' : medNum(tv);
  if (tv !== '' && !(val >= 0 && isFinite(val))) throw falha('Valor da reserva inválido.');
  o.valor = tv === '' ? (ja ? '' : espValorDe(o.espaco)) : Math.round(val * 100) / 100;
  if (ja) { gravar(t, o, ja._row); AUDIT_DET = 'Alterou a reserva ' + (sol || ja.id) + ' (' + status + ')'; return 'Reserva salva.'; }
  Object.assign(o, { id: novoId('RS'), origem: 'manual', registradoEm: agora(), registradoPor: conta.nome });
  gravar(t, o); AUDIT_DET = 'Cadastrou reserva ' + (sol || '') + ' em ' + data + ' (' + status + ')';
  return 'Reserva cadastrada.';
}
function espEspaco(r, conta) {
  const t = tabela('esp'), es = linhas(t), v = r.espaco || {};
  const ja = v.id ? es.find(x => x.id === String(v.id)) : null;
  if (v.id && !ja) throw falha('Espaço não encontrado. Atualize a tela.');
  const nome = texto(v.nome, 60);
  if (!nome) throw falha('Dê um nome ao espaço.');
  if (es.some(x => x !== ja && espNome(x.nome) === espNome(nome))) throw falha('Já existe um espaço com esse nome.');
  const itens = (Array.isArray(v.itens) ? v.itens : []).map(x => texto(x, 100)).filter(Boolean).slice(0, 60);
  const tv = String(v.valor === undefined || v.valor === null ? '' : v.valor).trim(), val = tv === '' ? '' : medNum(tv);
  if (tv !== '' && !(val >= 0 && isFinite(val))) throw falha('Valor da reserva inválido.');
  const o = { nome, valor: tv === '' ? '' : Math.round(val * 100) / 100, capacidade: texto(v.capacidade, 20), horario: texto(v.horario, 60), regras: texto(v.regras, 3000), itens: JSON.stringify(itens), ativo: v.ativo === false ? 'Não' : 'Sim' };
  if (ja) {
    gravar(t, o, ja._row);
    if (espNome(ja.nome) !== espNome(nome)) { const tr = tabela('esr'); linhas(tr).filter(x => x.espaco === ja.nome).forEach(x => gravar(tr, { espaco: nome }, x._row)); }
    AUDIT_DET = 'Alterou o espaço ' + nome; return 'Espaço salvo.';
  }
  Object.assign(o, { id: novoId('ES'), criadoEm: agora(), criadoPor: conta.nome }); gravar(t, o);
  AUDIT_DET = 'Cadastrou o espaço ' + nome; return 'Espaço cadastrado.';
}
// vistoria de entrega (antes do evento) ou devolução (depois), item a item
function espVistoria(r, conta) {
  const v = r.vistoria || {}, rs = linhas(tabela('esr'));
  const res = v.reserva ? rs.find(x => x.id === String(v.reserva)) : null;
  if (v.reserva && !res) throw falha('Reserva não encontrada. Atualize a tela.');
  const fase = v.fase === 'Devolução' ? 'Devolução' : 'Entrega';
  const itens = (Array.isArray(v.itens) ? v.itens : []).slice(0, 60).map(x => ({ i: texto(x.i, 100), st: ['OK', 'Problema', 'N/A'].indexOf(x.st) >= 0 ? x.st : '', obs: texto(x.obs, 200) }));
  if (!itens.length) throw falha('O checklist não tem itens.');
  const falt = itens.filter(x => !x.st);
  if (falt.length) throw falha('Marque todos os itens (falta: ' + falt.slice(0, 3).map(x => x.i).join(', ') + (falt.length > 3 ? '…' : '') + ').');
  const semObs = itens.filter(x => x.st === 'Problema' && !x.obs);
  if (semObs.length) throw falha('Descreva o problema em: ' + semObs.slice(0, 3).map(x => x.i).join(', ') + '.');
  if (res && linhas(tabela('esc')).some(x => x.reserva === res.id && x.fase === fase)) throw falha('Esta reserva já tem a vistoria de ' + fase.toLowerCase() + '.');
  const prob = itens.filter(x => x.st === 'Problema').length;
  const o = { id: novoId('VC'), reserva: res ? res.id : '', espaco: res ? res.espaco : texto(v.espaco, 60), fase, data: dataOk(v.data) ? v.data : hoje(),
    itens: JSON.stringify(itens), problemas: prob, responsavel: texto(v.responsavel, 80), obs: texto(v.obs, 500), feitoEm: agora(), feitoPor: conta.nome };
  gravar(tabela('esc'), o);
  if (res && fase === 'Devolução' && res.status !== 'Cancelada') gravar(tabela('esr'), { status: 'Realizada', atualizadoEm: agora(), atualizadoPor: conta.nome }, res._row);
  AUDIT_DET = 'Vistoria de ' + fase.toLowerCase() + ' do ' + o.espaco + (res ? ' (reserva ' + (res.solicitacao || res.data) + ')' : '') + ': ' + prob + ' problema(s)';
  return 'Vistoria de ' + fase.toLowerCase() + ' salva' + (prob ? ' com ' + prob + ' problema(s).' : ', tudo OK.');
}

// ---------- ronda (vistorias preventivas do condomínio) ----------
// Fichas: por bloco (níveis × categorias), diária das áreas comuns e checklist-mestre A a I (modelo do Checklist Consolidado).
// Códigos: OK, P (pendente), C (crítico), NA (não se aplica), NV (não verificado). P, C e NV pedem observação/motivo.
// P e C ficam na lista de pendências até alguém marcar como resolvido. Fotos ficam na pasta "Rondas - Pier Gestão".
const RONDA_TIPOS = { bloco: 'Ficha do bloco', areas: 'Áreas comuns', checklist: 'Checklist' };
const RONDA_COD = ['OK', 'P', 'C', 'NA', 'NV'];
const RONDA_ST = { andamento: 'Em andamento', concluida: 'Concluída' };
const RONDA_DIAS = 60, RONDA_MAX_FOTOS = 3, RONDA_MAX_ITENS = 120;
function pastaRondas() { return pastaDrive('PASTA_RONDAS', 'Rondas - Pier Gestão'); }
function rondaExigir(conta, fazer) {
  const p = conta.perms || {};
  const ok = fazer ? !!p.ronda_fazer : !!(p.ronda_ver || p.ronda_fazer);
  if (!ok) { const e = falha(fazer ? 'Seu perfil não tem permissão para fazer ronda.' : 'Seu perfil não tem permissão para ver as rondas.'); e.negado = true; throw e; }
}
const rondaJSON = (v, padrao) => { try { const x = JSON.parse(String(v || '')); return x && typeof x === 'object' ? x : padrao; } catch (e) { return padrao; } };
function rondaLer(x) {
  const o = Object.assign({}, x); delete o._row;
  o.itens = rondaJSON(x.itens, []); if (!Array.isArray(o.itens)) o.itens = [];
  o.extras = rondaJSON(x.extras, {});
  return o;
}
const rondaAberta = i => (i.c === 'P' || i.c === 'C') && !i.res;
// últimas 8 semanas, mais as antigas que ainda têm pendência aberta
function rondaLista() {
  const corte = somarDias(hoje(), -RONDA_DIAS);
  const lista = linhas(tabela('ronda')).map(rondaLer).filter(r => String(r.data) >= corte || r.itens.some(rondaAberta));
  lista.sort((a, b) => String(b.data + b.inicio).localeCompare(String(a.data + a.inicio)));
  return { rondas: lista, rondaDias: RONDA_DIAS };
}
function rondaResumo(itens) {
  const n = {}; RONDA_COD.forEach(c => { n[c] = 0; });
  itens.forEach(i => { if (n[i.c] !== undefined) n[i.c]++; });
  return RONDA_COD.filter(c => n[c]).map(c => n[c] + ' ' + c).join(' · ');
}
// itens que vêm do site: só os campos permitidos; fotos e resolução continuam as que já estavam no servidor
function rondaItens(lista, antes) {
  if (!Array.isArray(lista)) throw falha('Ficha inválida.');
  if (lista.length > RONDA_MAX_ITENS) throw falha('Ficha grande demais.');
  const ant = {}; (antes || []).forEach(i => { ant[i.k] = i; });
  const vistos = {};
  return lista.map(i => {
    const k = texto(i.k, 40);
    if (!k || vistos[k]) throw falha('Ficha inválida (item repetido).');
    vistos[k] = true;
    const c = String(i.c || '');
    if (c && RONDA_COD.indexOf(c) < 0) throw falha('Código inválido na ficha: use OK, P, C, NA ou NV.');
    const a = ant[k] || {};
    const o = { k, g: texto(i.g, 80), r: texto(i.r, 300), c, o: texto(i.o, 300) };
    if (i.p) o.p = texto(i.p, 200);
    if (a.f && a.f.length) o.f = a.f;
    if (a.res && (c === 'P' || c === 'C')) { o.res = a.res; if (a.ro) o.ro = a.ro; }
    return o;
  });
}
function rondaSalvar(r, conta) {
  const v = r.ronda || {}, op = String(r.op || 'salvar');
  const t = tabela('ronda'), todas = linhas(t);
  const atual = v.id ? todas.find(x => x.id === texto(v.id, 40)) : null;
  if (v.id && !atual) throw falha('Ronda não encontrada. Atualize a tela.');
  const ler = id => rondaLer(linhas(t).find(x => x.id === id));
  if (op === 'reabrir') {
    if (!atual || atual.status !== RONDA_ST.concluida) throw falha('Só uma ronda concluída pode ser reaberta.');
    gravar(t, { status: RONDA_ST.andamento, fim: '', atualizadoEm: agora(), atualizadoPor: conta.nome }, atual._row);
    AUDIT_DET = 'Reabriu a ronda ' + atual.numero;
    return { texto: 'Ronda ' + atual.numero + ' reaberta para correção.', ronda: ler(atual.id) };
  }
  if (atual && atual.status !== RONDA_ST.andamento) throw falha('Esta ronda já foi concluída. Para corrigir, reabra.');
  const tipo = atual ? atual.tipo : String(v.tipo || '');
  if (!RONDA_TIPOS[tipo]) throw falha('Tipo de ficha inválido.');
  const alvo = texto(v.alvo, 80) || (atual && atual.alvo) || '';
  if (!alvo) throw falha('Informe o local da ronda.');
  const data = texto(v.data, 10) || (atual && atual.data) || hoje();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw falha('Data inválida.');
  if (data > hoje()) throw falha('A data da ronda não pode ser depois de hoje.');
  const itens = rondaItens(v.itens || [], atual ? rondaJSON(atual.itens, []) : []);
  const extras = {};
  Object.keys(v.extras || {}).slice(0, 12).forEach(k => { extras[texto(k, 30)] = texto(v.extras[k], 200); });
  const campos = {
    alvo, data, responsaveis: texto(v.responsaveis, 120) || conta.nome, acesso: texto(v.acesso, 200), osRel: texto(v.osRel, 120),
    obs: texto(v.obs, 1000), itens: JSON.stringify(itens), extras: JSON.stringify(extras), resumo: rondaResumo(itens),
    atualizadoEm: agora(), atualizadoPor: conta.nome
  };
  if (op === 'concluir') {
    const falta = itens.filter(i => !i.c);
    if (!itens.length) throw falha('A ficha está vazia.');
    if (falta.length) throw falha('Faltam ' + falta.length + ' ite' + (falta.length === 1 ? 'm' : 'ns') + ' sem código (OK, P, C, NA ou NV). Não marque OK em local não observado: use NV e informe o motivo.');
    const semObs = itens.filter(i => (i.c === 'P' || i.c === 'C' || i.c === 'NV') && !i.o);
    if (semObs.length) throw falha('Descreva o problema (P ou C) ou o motivo (NV) em: ' + semObs.slice(0, 3).map(i => (i.g ? i.g + ' · ' : '') + i.r).join('; ') + (semObs.length > 3 ? '…' : '') + '.');
    campos.status = RONDA_ST.concluida; campos.fim = agora();
  }
  if (atual) {
    gravar(t, campos, atual._row);
    AUDIT_DET = (op === 'concluir' ? 'Concluiu' : 'Salvou') + ' a ronda ' + atual.numero + ' (' + alvo + ')' + (campos.resumo ? ': ' + campos.resumo : '');
    const c = itens.filter(i => i.c === 'C').length;
    return { texto: op === 'concluir' ? 'Ronda ' + atual.numero + ' concluída.' + (c ? ' Atenção: ' + c + ' ite' + (c === 1 ? 'm crítico' : 'ns críticos') + ' — comunique a Gerência.' : '') : 'Ronda salva.', ronda: ler(atual.id) };
  }
  const max = todas.reduce((m, x) => { const z = /(\d+)\s*$/.exec(x.numero || ''); return z ? Math.max(m, Number(z[1])) : m; }, 0);
  const id = novoId('RD'), numero = 'RD-' + ('000' + (max + 1)).slice(-4);
  gravar(t, Object.assign({ id, numero, tipo, inicio: agora(), fim: '', status: RONDA_ST.andamento, criadaPor: conta.nome, criadaPorUsuario: conta.usuario, criadaEm: agora() }, campos));
  AUDIT_DET = 'Iniciou a ronda ' + numero + ' (' + RONDA_TIPOS[tipo] + ' · ' + alvo + ')';
  return { texto: 'Ronda ' + numero + ' iniciada.', ronda: ler(id) };
}
function rondaAchar(id) {
  const t = tabela('ronda'), x = linhas(t).find(r => r.id === texto(id, 40));
  if (!x) throw falha('Ronda não encontrada. Atualize a tela.');
  return { t, x, itens: rondaJSON(x.itens, []) };
}
function rondaFoto(r, conta) {
  const { t, x, itens } = rondaAchar(r.id);
  const it = itens.find(i => i.k === String(r.k || ''));
  if (!it) throw falha('Salve a ficha antes de pôr a foto neste item.');
  if ((it.f || []).length >= RONDA_MAX_FOTOS) throw falha('Cada item aceita até ' + RONDA_MAX_FOTOS + ' fotos.');
  if (r.mime !== 'image/jpeg') throw falha('Foto inválida.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 4000000) throw falha('A foto está muito grande.');
  const nome = (x.numero + ' - ' + (it.g ? it.g + ' - ' : '') + it.r).replace(/[\\/:*?"<>|]/g, '-').slice(0, 110) + ' - ' + ((it.f || []).length + 1) + '.jpg';
  const f = pastaRondas().createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', nome));
  it.f = (it.f || []).concat(f.getId());
  gravar(t, { itens: JSON.stringify(itens), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  AUDIT_DET = 'Foto na ronda ' + x.numero + ': ' + (it.g ? it.g + ' · ' : '') + it.r;
  return { texto: 'Foto anexada.', ronda: rondaLer(linhas(t).find(z => z.id === x.id)) };
}
function rondaFotoRemover(r, conta) {
  const { t, x, itens } = rondaAchar(r.id);
  if (x.status !== RONDA_ST.andamento) throw falha('Esta ronda já foi concluída. Para mexer nas fotos, reabra.');
  const it = itens.find(i => (i.f || []).indexOf(String(r.fotoId || '')) >= 0);
  if (!it) throw falha('Foto não encontrada nesta ronda.');
  try { fotoDaPasta(r.fotoId, pastaRondas()).setTrashed(true); } catch (e) {}
  it.f = it.f.filter(z => z !== r.fotoId);
  gravar(t, { itens: JSON.stringify(itens), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  return { texto: 'Foto retirada.', ronda: rondaLer(linhas(t).find(z => z.id === x.id)) };
}
function rondaFotoVer(r) {
  const { itens } = rondaAchar(r.id);
  if (!itens.some(i => (i.f || []).indexOf(String(r.fotoId || '')) >= 0)) throw falha('Foto não encontrada nesta ronda.');
  return verArquivo(r.fotoId, pastaRondas());
}
// pendência (P ou C) resolvida: guarda quando, quem e como; ela sai da lista de pendências
function rondaResolver(r, conta) {
  const { t, x, itens } = rondaAchar(r.id);
  const it = itens.find(i => i.k === String(r.k || ''));
  if (!it || (it.c !== 'P' && it.c !== 'C')) throw falha('Este item não é uma pendência.');
  if (it.res) throw falha('Esta pendência já foi marcada como resolvida.');
  const como = texto(r.obs, 300);
  if (!como) throw falha('Diga como foi resolvida (ex.: OS-0012 concluída, reinspecionado em 24/10).');
  it.res = agora() + ' · ' + conta.nome; it.ro = como;
  gravar(t, { itens: JSON.stringify(itens), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
  AUDIT_DET = 'Resolveu pendência da ronda ' + x.numero + ': ' + (it.g ? it.g + ' · ' : '') + it.r + ' — ' + como;
  return { texto: 'Pendência marcada como resolvida.', ronda: rondaLer(linhas(t).find(z => z.id === x.id)) };
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
  garantirLinhaEmail('Segurança');
  Logger.log('E-mail: ' + MailApp.getRemainingDailyQuota() + ' envios disponíveis hoje (a permissão de enviar e-mail fica autorizada).');
  const senhas = migrarSenhas();
  garantirColunaProvisoria();
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
// 3: criar OS para a equipe (Manutenção, inclusive jardinagem, ou Limpeza) a partir da pendência
const PEND_VERSAO = 3;
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
  const osPorId = {};
  if (lista.some(p => p.osId)) linhas(tabela('os')).forEach(o => { osPorId[o.id] = o; });
  // cotação mais recente (não cancelada) de cada pendência
  const cotPorPend = {};
  if (SpreadsheetApp.getActive().getSheetByName(ABAS.cot.nome)) linhas(tabela('cot')).forEach(c => {
    if (!c.pendencia || c.status === COT_STATUS.cancelada) return;
    const ja = cotPorPend[c.pendencia];
    if (!ja || String(c.criadaEm) > String(ja.criadaEm)) cotPorPend[c.pendencia] = c;
  });
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
      conclSindico: p.conclSindico, os: p.os, osId: p.osId,
      osStatus: p.osId && osPorId[p.osId] ? osPorId[p.osId].status : '', osSetor: p.osId && osPorId[p.osId] ? osSetor(osPorId[p.osId]) : '',
      cotId: cotPorPend[p.id] ? cotPorPend[p.id].id : '', cotNumero: cotPorPend[p.id] ? cotPorPend[p.id].numero : '',
      cotStatus: cotPorPend[p.id] ? cotPorPend[p.id].status : '' }))
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
  // criar uma OS para a equipe a partir de uma pendência já existente
  if (atual && v.criarOS) {
    const r = pendCriarOS(atual, v.criarOS, conta);
    gravar(t, Object.assign(obj, { os: r.numero, osId: r.id }), atual._row);
    return r.numero + ' aberta para a equipe de ' + r.setor + '.';
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
    // conclusão: exige a data e vira um pedido, que só conclui depois da aprovação do gerente e do síndico (em qualquer ordem)
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
    const depois = Object.assign({}, atual, obj);
    let avS = '';
    if (pedidoConclusao) avS = pendAvisarSindico(depois, 'Foi pedida a conclusão da pendência (em ' + String(obj.conclData).split('-').reverse().join('/') + '); ela aguarda a sua aprovação e a do gerente', [], conta);
    else if (!(aviso && chaveNome(respNovo) === 'sindico') && (pendAcompanhadaPeloSindico(atual) || pendAcompanhadaPeloSindico(depois))) {
      const mud = pendMudancas(atual, obj);
      if (mud.length) avS = pendAvisarSindico(depois, 'A pendência que você acompanha foi alterada', mud, conta);
    }
    return r + aviso + avS;
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
    const osSub = v.criarOS ? pendCriarOS(obj, v.criarOS, conta) : null;
    if (osSub) Object.assign(obj, { os: osSub.numero, osId: osSub.id });
    gravar(t, obj);
    return 'Subitem ' + (numero || '') + ' adicionado. Aguarda aprovação do gerente e do síndico.'
      + (osSub ? ' ' + osSub.numero + ' aberta para a equipe de ' + osSub.setor + '.' : '') + pendAvisarCriacao(obj, conta, pai);
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
  const osNova = v.criarOS ? pendCriarOS(obj, v.criarOS, conta) : null;
  if (osNova) Object.assign(obj, { os: osNova.numero, osId: osNova.id });
  gravar(t, obj);
  return (obj.tipo === 'Constante' ? 'Tarefa constante ' : 'Pendência ') + obj.numero + ' adicionada. Aguarda aprovação do gerente e do síndico.'
    + (osNova ? ' ' + osNova.numero + ' aberta para a equipe de ' + osNova.setor + '.' : '') + pendAvisarCriacao(obj, conta, null);
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

// abre a OS da equipe (Manutenção, inclusive jardinagem, ou Limpeza) ligada à pendência
function pendCriarOS(p, os, conta) {
  if (p.osId) {
    const ja = linhas(tabela('os')).find(o => o.id === p.osId);
    if (ja && ja.status !== OS_STATUS.cancelada) throw falha('Esta pendência já tem a ' + ja.numero + ' (' + String(ja.status).toLowerCase() + ').');
  }
  const setor = os.setor === 'Limpeza' ? 'Limpeza' : 'Manutenção';
  const prioridade = OS_PRIORIDADES.indexOf(os.prioridade) >= 0 ? os.prioridade
    : ({ 'Alta': 'Alta', 'Média': 'Normal', 'Baixa': 'Baixa' })[p.criticidade] || 'Normal';
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(os.prazo || '')) ? String(os.prazo)
    : (p.tipo !== 'Constante' && p.prazoAtualizado) || p.prazo || '';
  const ref = 'Gerada a partir da pendência ' + (p.numero ? 'nº ' + p.numero + ' ' : '') + '(' + pendRotuloSecao(p.secao) + ') do Controle de pendências.';
  const r = osAbrir({
    titulo: String(p.titulo || '').slice(0, 120), local: os.local, prioridade, prazo,
    categoria: texto(os.categoria, 40), setor,
    descricao: [texto(os.descricao, 2500) || String(p.obs || '').trim(), ref].filter(Boolean).join('\n\n'),
    solicitante: conta.nome + ' (Controle de pendências)'
  }, conta, { pendencia: p.id });
  return { numero: r.numero, id: r.id, setor };
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
      return 'Aprovada pelo gerente' + (gerente ? '' : ' (em nome dele)') + '. Falta a aprovação do síndico.'
        + pendAvisarSindico(Object.assign({}, atual, obj), 'A pendência foi aprovada pelo gerente e aguarda a sua aprovação (inclusão)', [], conta);
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
    // conclusão: gerente e síndico aprovam cada um a sua parte, em qualquer ordem; conclui quando os dois aprovarem
    if (!pendConclPendente(atual)) throw falha('Esta pendência não tem conclusão aguardando aprovação.');
    if (!gerente && !sindico) throw falha('Só o gerente e o síndico aprovam a conclusão.');
    const temG = !!String(atual.conclGerente || '').trim(), temS = !!String(atual.conclSindico || '').trim();
    let quem;
    if (sindico && !temS) { obj.conclSindico = marca(false); quem = 'síndico'; }
    else if (gerente && !temG) { obj.conclGerente = marca(false); quem = 'gerente'; }
    else throw falha('Você já aprovou esta conclusão. Falta a aprovação do ' + (temG ? 'síndico' : 'gerente') + '.');
    if ((temG || obj.conclGerente) && (temS || obj.conclSindico)) {
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(String(atual.conclData || '')) ? String(atual.conclData) : hoje();
      Object.assign(obj, { status: 'Concluído', concluidoEm: dia });
      gravar(t, obj, atual._row);
      return 'Conclusão aprovada pelo ' + quem + '. Pendência concluída em ' + dm(dia) + '.';
    }
    gravar(t, obj, atual._row);
    return 'Conclusão aprovada pelo ' + quem + '. Falta a aprovação do ' + (quem === 'síndico' ? 'gerente' : 'síndico') + '.'
      + (quem === 'gerente' ? pendAvisarSindico(Object.assign({}, atual, obj), 'A conclusão da pendência foi aprovada pelo gerente e aguarda a sua aprovação', [], conta) : '');
  }
  throw falha('Aprovação inválida.');
}

// ---------- cotações e mapa de cotação ----------
// Cada cotação guarda os fornecedores, os itens e os preços em JSON (coluna "Dados"); a tela gera o mapa no modelo do Pier.
// Situação: Em cotação → (enviar) Aguardando aprovação (gerente e síndico ao mesmo tempo) → Aprovada; recusar volta para Em cotação.
// aprovação: vai para o gerente e o síndico ao mesmo tempo; cada um aprova com o próprio login, em qualquer ordem (pedido de 24/10/2026).
// "Aguardando gerente" e "Aguardando síndico" ficam só para as cotações enviadas antes da mudança.
const COT_STATUS = { cotacao: 'Em cotação', aprovacao: 'Aguardando aprovação', gerente: 'Aguardando gerente', sindico: 'Aguardando síndico', aprovada: 'Aprovada', cancelada: 'Cancelada' };
const cotAguardando = s => s === COT_STATUS.aprovacao || s === COT_STATUS.gerente || s === COT_STATUS.sindico;
const COT_VERSAO = 1;
const COT_MAX = { fornecedores: 10, itens: 60, anexos: 6 };

// número em formato brasileiro ("4.769,97", "R$ 205,16") ou já numérico; negativo ou inválido vira vazio
const cotNum = v => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? Math.round(v * 10000) / 10000 : null;
  let s = String(v).replace(/R\$|\s/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isFinite(n) && n >= 0 ? Math.round(n * 10000) / 10000 : null;
};
const cotTxt = (v, max) => texto(v, max || 200);
const cotId = () => 'f' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);

// limpa e limita o que vem da tela; anexos nunca vêm da tela (ficam com o que já está gravado)
function cotLimpar(d, antes) {
  d = d || {}; antes = antes || {};
  const anexosAntes = {};
  (antes.fornecedores || []).forEach(f => { if (f && f.id) anexosAntes[f.id] = f.anexos || []; });
  const opc = (v, lista) => lista.indexOf(v) >= 0 ? v : '';
  const forn = (Array.isArray(d.fornecedores) ? d.fornecedores : []).slice(0, COT_MAX.fornecedores).map(f => {
    f = f || {};
    const id = /^f[0-9a-f]{10}$/.test(String(f.id || '')) ? String(f.id) : cotId();
    return {
      id, empresa: cotTxt(f.empresa, 80), cnpj: cotTxt(f.cnpj, 20), telefone: cotTxt(f.telefone, 30), email: cotTxt(f.email, 80),
      contato: cotTxt(f.contato, 80), modelo: cotTxt(f.modelo, 160), atende: opc(f.atende, ['Sim', 'Não', 'Parcial']),
      prazo: cotTxt(f.prazo, 120), pagamento: cotTxt(f.pagamento, 160), validade: cotTxt(f.validade, 60), garantia: cotTxt(f.garantia, 80),
      instalacao: opc(f.instalacao, ['Sim', 'Não']), frete: cotNum(f.frete), desconto: cotNum(f.desconto), obs: cotTxt(f.obs, 400),
      anexos: anexosAntes[id] || []
    };
  });
  const itens = (Array.isArray(d.itens) ? d.itens : []).slice(0, COT_MAX.itens).map(it => {
    it = it || {};
    const precos = forn.map((f, i) => cotNum((it.precos || [])[i]));
    return { descricao: cotTxt(it.descricao, 300), unid: cotTxt(it.unid, 12), quant: cotNum(it.quant), precos,
      ref: cotNum(it.ref), refFonte: cotTxt(it.refFonte, 300) };
  });
  const rec = d.recomendacao || {};
  const iRec = Number.isInteger(rec.fornecedor) && rec.fornecedor >= 0 && rec.fornecedor < forn.length ? rec.fornecedor : -1;
  return { especificacao: cotTxt(d.especificacao, 1500), fornecedores: forn, itens, observacoes: cotTxt(d.observacoes, 3000),
    recomendacao: { fornecedor: iRec, justificativa: cotTxt(rec.justificativa, 1500) } };
}

// total de cada fornecedor: soma dos itens + frete − desconto; "completo" quando todos os itens têm preço
// e-mail único para o gerente e o síndico quando a cotação vai para aprovação (linhas "Gerente" e "Síndico" da aba Emails).
// Uma falha no e-mail nunca desfaz o envio.
function cotAvisarAprovacao(c, dados, conta) {
  try {
    const dest = [];
    emailsDoSetor('Gerente').concat(emailsDoSetor('Síndico')).forEach(e => { if (dest.indexOf(e) < 0) dest.push(e); });
    if (!dest.length) return ' Nenhum e-mail cadastrado para Gerente e Síndico na aba Emails.';
    const brl = v => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const forn = (dados.fornecedores || []).filter(f => f.empresa).map(f => f.empresa);
    const corpo = [
      'A cotação ' + c.numero + ' foi enviada para aprovação no Pier Gestão e aguarda o gerente e o síndico.',
      'Cada um aprova com o próprio login, em qualquer ordem. Ela fica aprovada quando os dois aprovarem.',
      '',
      'Finalidade: ' + c.finalidade,
      c.pendNumero ? 'Pendência: ' + c.pendNumero : '',
      'Fornecedores consultados: ' + (forn.length ? forn.join(', ') : '—'),
      'Recomendado: ' + (c.vencedor || '—') + (c.valorVencedor ? ' · ' + brl(c.valorVencedor) : ''),
      dados.recomendacao && dados.recomendacao.justificativa ? 'Justificativa: ' + dados.recomendacao.justificativa : '',
      'Enviada por: ' + conta.nome,
      '',
      'Para aprovar ou devolver: Pier Gestão → setor Administração → Pendências e compras → Cotações.',
      '',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – cotação ' + c.numero + ' aguardando aprovação: ' + String(c.finalidade).slice(0, 80), body: corpo, name: 'Pier Gestão' });
    return ' Aviso enviado por e-mail ao gerente e ao síndico.';
  } catch (e) {
    Logger.log('Aviso da cotação não enviado: ' + e.message);
    return ' O aviso por e-mail não foi enviado (' + String(e.message).slice(0, 120) + ').';
  }
}

function cotTotais(d) {
  return d.fornecedores.map((f, i) => {
    let sub = 0, comPreco = 0;
    d.itens.forEach(it => { const p = it.precos[i]; if (p !== null && p !== undefined) { sub += (it.quant || 0) * p; comPreco++; } });
    const total = Math.round((sub + (f.frete || 0) - (f.desconto || 0)) * 100) / 100;
    return { subtotal: Math.round(sub * 100) / 100, total, completo: d.itens.length > 0 && comPreco === d.itens.length, algum: comPreco > 0 };
  });
}

// ---------- fornecedores (Pendências e compras) ----------
const fornSo = s => String(s || '').replace(/\D/g, '');
const fornN = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(ltda|me|epp|eireli|s\.?a\.?|comercio|com\.?)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const fornIgual = (f, x) => (fornSo(f.cnpj).length >= 11 && fornSo(f.cnpj) === fornSo(x.cnpj)) || (!!fornN(f.nome) && fornN(f.nome) === fornN(x.nome || x.empresa));
// cadastro + histórico nas cotações (participações, vitórias e valor ganho)
function fornLista() {
  const fs = linhas(tabela('forn')).map(unLimpa);
  const cots = SpreadsheetApp.getActive().getSheetByName(ABAS.cot.nome) ? linhas(tabela('cot')).map(cotLer) : [];
  fs.forEach(f => {
    const part = cots.filter(c => (c.dados.fornecedores || []).some(x => fornIgual(f, x)));
    const ganhou = part.filter(c => c.vencedor && fornIgual(f, { nome: c.vencedor }));
    f.cotacoes = part.length; f.vitorias = ganhou.length;
    f.valorGanho = ganhou.reduce((a, c) => a + (Number(c.valorVencedor) || 0), 0);
    const ult = part.sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)))[0];
    f.ultimaCot = ult ? { numero: ult.numero, data: String(ult.criadaEm).slice(0, 10), finalidade: String(ult.finalidade || '').slice(0, 80) } : null;
  });
  return { fornecedores: fs.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')) };
}
function fornSalvar(r, conta) {
  const t = tabela('forn'), fs = linhas(t), v = r.fornecedor || {};
  const ja = v.id ? fs.find(x => x.id === String(v.id)) : null;
  if (v.id && !ja) throw falha('Fornecedor não encontrado. Atualize a tela.');
  if (r.op === 'excluir') { if (!ja) throw falha('Fornecedor não encontrado.'); t.sh.deleteRow(ja._row); AUDIT_DET = 'Excluiu o fornecedor ' + ja.nome; return 'Fornecedor excluído.'; }
  const nome = texto(v.nome, 100);
  if (!nome) throw falha('Informe o nome da empresa.');
  const cnpj = texto(v.cnpj, 20), d = fornSo(cnpj);
  if (cnpj && d.length !== 14 && d.length !== 11) throw falha('CNPJ (ou CPF) inválido: confira os números.');
  const email = texto(v.email, 100);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw falha('E-mail inválido.');
  const dup = fs.find(x => x !== ja && fornIgual(x, { nome, cnpj }));
  if (dup) throw falha('Já existe o fornecedor ' + dup.nome + (dup.cnpj ? ' (CNPJ ' + dup.cnpj + ')' : '') + '.');
  const codigo = texto(v.codigo, 20).toUpperCase();
  if (codigo && fs.some(x => x !== ja && String(x.codigo).toUpperCase() === codigo)) throw falha('O código ' + codigo + ' já é de outro fornecedor.');
  const o = { nome, cnpj, categoria: texto(v.categoria, 60), contato: texto(v.contato, 80), telefone: texto(v.telefone, 40), email, endereco: texto(v.endereco, 200),
    site: texto(v.site, 120), pagamento: texto(v.pagamento, 160), obs: texto(v.obs, 500), ativo: v.ativo === false || v.ativo === 'Não' ? 'Não' : 'Sim', atualizadoEm: agora(), atualizadoPor: conta.nome,
    codigo: codigo || (ja && ja.codigo) || fornProxCodigo(fs), servicos: texto(v.servicos, 500), whatsapp: texto(v.whatsapp, 40), instagram: texto(v.instagram, 80),
    situacao: texto(v.situacao, 40), fonte: texto(v.fonte, 120) };
  if (r.soValidar) return o;
  if (ja) { gravar(t, o, ja._row); AUDIT_DET = 'Alterou o fornecedor ' + nome; return 'Fornecedor salvo.'; }
  Object.assign(o, { id: novoId('FO'), criadoEm: agora(), criadoPor: conta.nome }); gravar(t, o);
  AUDIT_DET = 'Cadastrou o fornecedor ' + nome; return 'Fornecedor cadastrado.';
}
// próximo código FOR-001, FOR-002…
function fornProxCodigo(fs) {
  const n = fs.reduce((m, x) => { const k = /^FOR-(\d+)$/i.exec(String(x.codigo || '')); return k ? Math.max(m, Number(k[1])) : m; }, 0);
  return 'FOR-' + ('00' + (n + 1)).slice(-3);
}
// planilha de fornecedores (lida no navegador): atualiza pelo código, CNPJ ou nome; cria os que faltam
function fornImportar(r, conta) {
  const lista = Array.isArray(r.lista) ? r.lista.slice(0, 500) : [];
  if (!lista.length) throw falha('A planilha não tem fornecedores.');
  let novos = 0, atual = 0; const erros = [];
  lista.forEach(v => {
    try {
      const fs = linhas(tabela('forn'));
      const ja = (v.codigo && fs.find(x => String(x.codigo).toUpperCase() === String(v.codigo).trim().toUpperCase())) || fs.find(x => fornIgual(x, { nome: v.nome, cnpj: v.cnpj })) || null;
      const base = {};
      if (ja) ['nome', 'cnpj', 'categoria', 'contato', 'telefone', 'email', 'endereco', 'site', 'pagamento', 'obs', 'ativo', 'codigo', 'servicos', 'whatsapp', 'instagram', 'situacao', 'fonte'].forEach(k => { base[k] = ja[k]; });
      Object.keys(v).forEach(k => { if (k !== '_linha' && v[k] !== undefined && v[k] !== null && String(v[k]).trim() !== '') base[k] = v[k]; });
      if (ja) base.id = ja.id;
      fornSalvar({ fornecedor: base }, conta);
      if (ja) atual++; else novos++;
    } catch (e) { erros.push('linha ' + (v._linha || '?') + ': ' + String(e.message || e)); }
  });
  AUDIT_DET = 'Planilha de fornecedores: ' + novos + ' novo(s), ' + atual + ' atualizado(s)' + (erros.length ? ', ' + erros.length + ' com erro' : '');
  return [novos ? novos + ' fornecedor' + (novos === 1 ? '' : 'es') + ' cadastrado' + (novos === 1 ? '' : 's') + '.' : '', atual ? atual + ' atualizado' + (atual === 1 ? '' : 's') + '.' : '',
    erros.length ? erros.length + ' linha' + (erros.length === 1 ? '' : 's') + ' com erro (' + erros.slice(0, 4).join('; ') + ').' : ''].filter(Boolean).join(' ') || 'Nada foi alterado.';
}
// traz para o cadastro os fornecedores que já aparecem nas cotações (sem duplicar)
function fornDasCotacoes(conta) {
  const t = tabela('forn'), fs = linhas(t), novos = [];
  const cots = SpreadsheetApp.getActive().getSheetByName(ABAS.cot.nome) ? linhas(tabela('cot')).map(cotLer) : [];
  cots.forEach(c => (c.dados.fornecedores || []).forEach(x => {
    const nome = texto(x.empresa, 100); if (!nome) return;
    if (fs.concat(novos).some(f => fornIgual(f, { nome, cnpj: x.cnpj }))) return;
    novos.push({ id: novoId('FO'), codigo: fornProxCodigo(fs.concat(novos)), nome, cnpj: texto(x.cnpj, 20), categoria: '', contato: texto(x.contato, 80), telefone: texto(x.telefone, 40), email: texto(x.email, 100),
      endereco: '', site: '', pagamento: texto(x.pagamento, 160), obs: 'Trazido da cotação ' + c.numero, ativo: 'Sim', criadoEm: agora(), criadoPor: conta.nome });
  }));
  if (novos.length) anexarLinhas(t, novos);
  AUDIT_DET = 'Trouxe ' + novos.length + ' fornecedor(es) das cotações';
  return novos.length ? novos.length + ' fornecedor' + (novos.length === 1 ? '' : 'es') + ' trazido' + (novos.length === 1 ? '' : 's') + ' das cotações.' : 'Todos os fornecedores das cotações já estão cadastrados.';
}
function cotLer(c) {
  let dados = {};
  try { dados = JSON.parse(c.dados || '{}'); } catch (e) { dados = {}; }
  dados = cotLimpar(dados, dados);
  return { id: c.id, numero: c.numero, status: c.status, finalidade: c.finalidade, data: c.data, solicitante: c.solicitante,
    pendencia: c.pendencia, pendNumero: c.pendNumero, vencedor: c.vencedor, valorVencedor: c.valorVencedor, dados,
    criadaEm: c.criadaEm, criadaPor: c.criadaPor, atualizadoEm: c.atualizadoEm, atualizadoPor: c.atualizadoPor,
    aprovGerente: c.aprovGerente, aprovSindico: c.aprovSindico, recusa: c.recusa, mapaId: c.mapaId, mapaEm: c.mapaEm };
}

function cotLista() {
  const lista = linhas(tabela('cot')).map(cotLer).sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)) || String(b.numero).localeCompare(String(a.numero)));
  const pend = SpreadsheetApp.getActive().getSheetByName(ABAS.pend.nome) ? linhas(tabela('pend'))
    .filter(p => p.status !== 'Concluído' && p.tipo !== 'Constante')
    .map(p => ({ id: p.id, numero: p.numero, titulo: p.titulo, secao: pendRotuloSecao(p.secao) })) : [];
  return { cotacoes: lista, pendOpcoes: pend, cotVersao: COT_VERSAO, ia: cotIADisponivel() };
}

function cotIADisponivel() {
  return typeof iaCotacao === 'function' && !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
}

function cotSalvar(r, conta) {
  const t = tabela('cot');
  const todas = linhas(t);
  const v = r.cot || {};
  const atual = v.id ? todas.find(c => c.id === texto(v.id, 40)) : null;
  if (v.id && !atual) throw falha('Esta cotação não existe mais. Atualize a tela.');
  const sindico = ehSindico(conta), gerente = ehGerente(conta);
  const marca = emNome => agora() + ' · ' + conta.nome + (emNome ? ' (em nome do gerente)' : '');
  const obj = { atualizadoEm: agora(), atualizadoPor: conta.nome };
  const fim = (texto2) => { gravar(t, obj, atual ? atual._row : undefined); const c = linhas(t).find(x => x.id === (atual ? atual.id : obj.id)); return { texto: texto2, cot: cotLer(c) }; };
  const op = String(r.op || 'salvar');

  if (op !== 'salvar') {
    if (!atual) throw falha('Salve a cotação primeiro.');
    const dados = cotLer(atual).dados;
    if (op === 'enviar') {
      if (atual.status !== COT_STATUS.cotacao) throw falha('Só uma cotação "Em cotação" pode ir para aprovação.');
      const tot = cotTotais(dados);
      if (!dados.fornecedores.length || !tot.some(x => x.algum)) throw falha('Informe ao menos um fornecedor com preço.');
      const iRec = dados.recomendacao.fornecedor;
      if (iRec < 0) throw falha('Escolha o fornecedor recomendado antes de enviar para aprovação.');
      if (!dados.recomendacao.justificativa) throw falha('Escreva a justificativa da recomendação.');
      Object.assign(obj, { status: COT_STATUS.aprovacao, aprovGerente: '', aprovSindico: '', recusa: '' });
      const r0 = fim(atual.numero + ' enviada ao gerente e ao síndico ao mesmo tempo. Cada um aprova com o próprio login.');
      r0.texto += cotAvisarAprovacao(Object.assign({}, atual, obj), dados, conta);
      return r0;
    }
    if (op === 'aprovar') {
      if (!cotAguardando(atual.status)) throw falha('Esta cotação não está aguardando aprovação.');
      if (!gerente && !sindico) throw falha('Só o gerente e o síndico aprovam a cotação.');
      const temG = !!String(atual.aprovGerente || '').trim(), temS = !!String(atual.aprovSindico || '').trim();
      let quem;
      if (sindico && !temS) { obj.aprovSindico = marca(false); quem = 'síndico'; }
      else if (gerente && !temG) { obj.aprovGerente = marca(false); quem = 'gerente'; }
      else throw falha('Você já aprovou esta cotação. Falta a aprovação do ' + (temG ? 'síndico' : 'gerente') + '.');
      if ((temG || obj.aprovGerente) && (temS || obj.aprovSindico)) {
        obj.status = COT_STATUS.aprovada;
        return fim(atual.numero + ' aprovada pelo gerente e pelo síndico. Fornecedor: ' + (atual.vencedor || '—') + '.');
      }
      obj.status = COT_STATUS.aprovacao;
      return fim('Cotação aprovada pelo ' + quem + '. Falta a aprovação do ' + (quem === 'síndico' ? 'gerente' : 'síndico') + '.');
    }
    if (op === 'recusar') {
      if (!cotAguardando(atual.status)) throw falha('Esta cotação não está aguardando aprovação.');
      if (!gerente && !sindico) throw falha('Só o gerente ou o síndico podem recusar.');
      const motivo = cotTxt(r.motivo, 300);
      Object.assign(obj, { status: COT_STATUS.cotacao, aprovGerente: '', aprovSindico: '', recusa: agora() + ' · ' + conta.nome + (motivo ? ': ' + motivo : '') });
      return fim(atual.numero + ' devolvida para ajustes.');
    }
    if (op === 'cancelar') {
      if (atual.status === COT_STATUS.aprovada) throw falha('Uma cotação aprovada não pode ser cancelada.');
      Object.assign(obj, { status: COT_STATUS.cancelada });
      return fim(atual.numero + ' cancelada.');
    }
    if (op === 'reabrir') {
      if (atual.status !== COT_STATUS.cancelada) throw falha('Só uma cotação cancelada pode ser reaberta.');
      Object.assign(obj, { status: COT_STATUS.cotacao });
      return fim(atual.numero + ' reaberta.');
    }
    throw falha('Operação inválida.');
  }

  // salvar (criar ou editar): só enquanto estiver "Em cotação"
  if (atual && atual.status !== COT_STATUS.cotacao) throw falha('Esta cotação está "' + atual.status + '" e não pode ser alterada. Para mudar, ela precisa ser devolvida (recusada) ou reaberta.');
  const finalidade = cotTxt(v.finalidade, 160);
  if (!finalidade) throw falha('Informe a finalidade da cotação.');
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(v.data || '')) ? String(v.data) : hoje();
  const solicitante = cotTxt(v.solicitante, 80) || conta.nome;
  const dados = cotLimpar(v.dados, atual ? cotLer(atual).dados : null);
  let pendencia = '', pendNumero = '';
  if (v.pendencia) {
    const p = linhas(tabela('pend')).find(x => x.id === texto(v.pendencia, 40));
    if (!p) throw falha('A pendência escolhida não existe mais.');
    pendencia = p.id; pendNumero = (p.numero ? p.numero + ' · ' : '') + String(p.titulo).slice(0, 80);
  }
  const tot = cotTotais(dados), iRec = dados.recomendacao.fornecedor;
  Object.assign(obj, { finalidade, data, solicitante, pendencia, pendNumero, dados: JSON.stringify(dados),
    vencedor: iRec >= 0 ? dados.fornecedores[iRec].empresa : '', valorVencedor: iRec >= 0 && tot[iRec].algum ? String(tot[iRec].total) : '' });
  if (obj.dados.length > 45000) throw falha('A cotação ficou grande demais. Reduza os textos ou o número de itens.');
  if (!atual) {
    const ano = data.slice(0, 4);
    const nums = todas.map(c => { const m = /^COT-(\d{4})-(\d+)$/.exec(c.numero || ''); return m && m[1] === ano ? Number(m[2]) : 0; });
    Object.assign(obj, { id: novoId('ct'), numero: 'COT-' + ano + '-' + ('00' + (Math.max.apply(null, [0].concat(nums)) + 1)).slice(-3),
      status: COT_STATUS.cotacao, criadaEm: agora(), criadaPor: conta.nome, aprovGerente: '', aprovSindico: '', recusa: '', mapaId: '', mapaEm: '' });
    return fim(obj.numero + ' criada.');
  }
  return fim(atual.numero + ' salva.');
}

// orçamento de um fornecedor (PDF ou foto) ou o mapa gerado (.xlsx), na pasta de cotações do Drive
function cotArquivo(r, conta) {
  const t = tabela('cot');
  const c = linhas(t).find(x => x.id === texto(r.id, 40));
  if (!c) throw falha('Cotação não encontrada. Atualize a tela.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 10000000) throw falha('O arquivo está muito grande (máximo de 7 MB).');
  const dados = cotLer(c).dados;
  if (r.tipo === 'mapa') {
    if (r.mime !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') throw falha('Mapa inválido.');
    const nome = ('Mapa de cotação ' + c.numero + ' - ' + String(c.finalidade).slice(0, 60)).replace(/[\\/:*?"<>|]/g, '-') + '.xlsx';
    const f = pastaCotacoes().createFile(Utilities.newBlob(Utilities.base64Decode(b64), r.mime, nome));
    if (c.mapaId) { try { fotoDaPasta(c.mapaId, pastaCotacoes()).setTrashed(true); } catch (e) {} }
    gravar(t, { mapaId: f.getId(), mapaEm: agora() }, c._row);
    AUDIT_DET = 'Salvou o mapa da ' + c.numero + ' no Drive';
    return { texto: 'Mapa salvo no Drive (pasta "Cotações e mapas - Pier Gestão").', cot: cotLer(linhas(t).find(x => x.id === c.id)) };
  }
  if (c.status !== COT_STATUS.cotacao) throw falha('Esta cotação não está mais "Em cotação".');
  const tipos = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
  const ext = tipos[r.mime];
  if (!ext) throw falha('Envie o orçamento em PDF ou foto (JPG ou PNG).');
  const forn = dados.fornecedores.find(f => f.id === String(r.fornecedor || ''));
  if (!forn) throw falha('Salve a cotação com este fornecedor antes de anexar o orçamento.');
  if (forn.anexos.length >= COT_MAX.anexos) throw falha('Este fornecedor já tem ' + COT_MAX.anexos + ' arquivos.');
  const nome = ('Orçamento ' + c.numero + ' - ' + (forn.empresa || 'fornecedor') + ' - ' + (forn.anexos.length + 1)).replace(/[\\/:*?"<>|]/g, '-') + '.' + ext;
  const f = pastaCotacoes().createFile(Utilities.newBlob(Utilities.base64Decode(b64), r.mime, nome));
  forn.anexos.push({ id: f.getId(), nome: cotTxt(r.nome, 120) || nome, mime: r.mime });
  gravar(t, { dados: JSON.stringify(dados), atualizadoEm: agora(), atualizadoPor: conta.nome }, c._row);
  AUDIT_DET = 'Anexou orçamento de ' + (forn.empresa || 'fornecedor') + ' na ' + c.numero;
  return { texto: 'Orçamento anexado.', cot: cotLer(linhas(t).find(x => x.id === c.id)) };
}

// abre um anexo ou o mapa: só arquivos que pertencem à cotação e estão na pasta de cotações
function cotVerArquivo(r) {
  const c = linhas(tabela('cot')).find(x => x.id === texto(r.id, 40));
  if (!c) throw falha('Cotação não encontrada.');
  const fid = String(r.fileId || '');
  const dados = cotLer(c).dados;
  const ok = fid && (fid === c.mapaId || dados.fornecedores.some(f => f.anexos.some(a => a.id === fid)));
  if (!ok) throw falha('Arquivo não encontrado nesta cotação.');
  return verArquivo(fid, pastaCotacoes());
}

// ajuda da IA: só existe quando o arquivo IA.gs estiver instalado e a chave da API configurada
function cotIA(r, conta) {
  if (!cotIADisponivel()) throw falha('A ajuda da IA ainda não foi ligada. Ela depende de uma conta de API da Anthropic.');
  return iaCotacao(r, conta);
}

// ---------- log de segurança: telas vistas, exportações e alertas ----------
// telas sensíveis (e exportações) que ficam registradas na Auditoria, com a permissão que cada uma exige
const TELAS_VISTAS = {
  historico: ['Histórico de movimentações', 'historico_ver'], dashboard: ['Dashboard', 'dashboard'],
  usuarios: ['Usuários e permissões', 'usuarios'], pendencias: ['Controle de pendências', 'pendencias'],
  acessos: ['Histórico de acessos', 'acessos'], cotacoes: ['Cotações', 'pendencias'],
  exportar_mapa: ['Mapa de cotação (planilha)', 'pendencias'], rondas: ['Ronda (vistorias)', ['ronda_ver', 'ronda_fazer']],
  unidades: ['Lista de unidades e moradores', ['un_ver', 'un_editar']], uncadastro: ['Atualização cadastral', ['un_ver', 'un_editar']],
  unconfig: ['Configurações das unidades', 'un_editar'], unficha: ['Ficha da unidade', ['un_ver', 'un_editar']],
  exportar_unidades: ['Lista de unidades (planilha)', ['un_ver', 'un_editar']], imprimir_unidade: ['Ficha da unidade para imprimir', ['un_ver', 'un_editar']],
  exportar_medicoes: ['Relatório de medições (planilha)', ['med_ver', 'med_lancar']], imprimir_medicoes: ['Relatório de medições (PDF)', ['med_ver', 'med_lancar']],
  exportar_movs: ['Movimentações (planilha CSV)', 'exportar'], exportar_consumo: ['Consumo por item (planilha CSV)', 'exportar']
};
function registrarVisao(conta, req) {
  const t = TELAS_VISTAS[String(req.tela || '')];
  if (!t) return;
  const exp = String(req.tela).indexOf('exportar_') === 0;
  const det = t[0] + (req.detalhe ? ' · ' + texto(req.detalhe, 80) : '');
  if (![].concat(t[1]).some(k => conta.perms[k])) {
    auditar(conta, exp ? 'Exportou planilha' : 'Abriu tela', det + ' — sem permissão', 'Negado');
    alertaSeguranca('negado', conta.usuario, 'Tentou ' + (exp ? 'exportar ' : 'abrir ') + det + ' sem permissão.', '', conta.nome);
    return;
  }
  auditar(conta, exp ? 'Exportou planilha' : 'Abriu tela', det);
}

// alerta por e-mail para a linha "Segurança" da aba Emails; o mesmo tipo de alerta da mesma pessoa
// sai no máximo uma vez a cada 15 min (bloqueio e acesso negado) ou 1 min (senha e usuário). Nunca leva senhas.
function alertaSeguranca(tipo, usuario, detalhe, aparelho, nome) {
  try {
    const props = PropertiesService.getScriptProperties();
    const chave = 'ALERTA_' + tipo + '_' + String(usuario || '').slice(0, 40);
    const intervalo = (tipo === 'bloqueio' || tipo === 'negado' ? 15 : 1) * 60 * 1000;
    const ultimo = Number(props.getProperty(chave) || 0);
    if (Date.now() - ultimo < intervalo) return;
    const dest = emailsDoSetor('Segurança');
    if (!dest.length) { garantirLinhaEmail('Segurança'); return; }
    props.setProperty(chave, String(Date.now()));
    const titulo = { bloqueio: 'login bloqueado', negado: 'acesso negado', senha: 'senha trocada', usuario: 'usuário criado ou alterado' }[tipo] || tipo;
    const quando = agora();
    const corpo = [
      'Alerta de segurança do Pier Gestão: ' + titulo + '.',
      '',
      'Quando: ' + String(quando).slice(0, 10).split('-').reverse().join('/') + ' ' + String(quando).slice(11, 16),
      'Usuário: ' + (usuario || '—') + (nome ? ' (' + nome + ')' : ''),
      aparelho ? 'Aparelho: ' + texto(aparelho, 60) : '',
      'O que aconteceu: ' + texto(detalhe, 400),
      '',
      'Veja os detalhes em Administração → Histórico de acessos → Segurança.',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – alerta de segurança: ' + titulo + ' (' + (usuario || '—') + ')', body: corpo, name: 'Pier Gestão' });
  } catch (e) {
    Logger.log('Alerta de segurança não enviado: ' + e.message);
  }
}
// acrescenta uma linha na aba Emails (sem e-mail) para a Administração preencher
function garantirLinhaEmail(para) {
  const sh = abaEmails();
  const n = sh.getLastRow();
  const nomes = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => chaveNome(r[0])) : [];
  if (nomes.indexOf(chaveNome(para)) >= 0) return;
  const ex = EMAILS_INICIAIS.find(x => chaveNome(x[0]) === chaveNome(para));
  sh.getRange(n + 1, 1, 1, 3).setValues([[para, '', ex ? ex[1] : '']]);
}

// ---------- aviso por e-mail ao incluir uma pendência ----------
// Os endereços ficam na aba "Emails" da planilha (coluna "Para": Gerente, Síndico ou o nome do responsável; coluna "E-mail").
const EMAILS_ABA = 'Emails';
const EMAILS_INICIAIS = [
  ['Gerente', 'Recebe quando for o responsável (Gerência)'], ['Síndico', 'Recebe quando for o responsável'],
  ['Supervisor', 'Recebe quando for o responsável'], ['Auxiliar', 'Recebe quando for o responsável'],
  ['Manutenção', 'Recebe quando for o responsável'], ['Limpeza', 'Recebe quando for o responsável'],
  ['Jardinagem', 'Recebe quando for o responsável'], ['Piscina', 'Recebe quando for o responsável'],
  ['Fornecedor', 'Recebe quando for o responsável'],
  ['Segurança', 'Recebe os alertas de segurança: login bloqueado, acesso negado, senha trocada, usuário criado ou alterado']
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
    const dest = emailsDoSetor(resp);
    if (!dest.length) return ' Nenhum e-mail cadastrado para ' + resp + ' (aba Emails ou Usuários).';
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

// e-mails de um setor na aba Emails ("Gerência" usa a linha "Gerente" se não tiver linha própria)
// mais os e-mails cadastrados em Usuários de quem está ativo e tem esse perfil (ex.: perfil Síndico recebe os avisos do Síndico)
function emailsDoSetor(resp) {
  const mapa = lerEmails(), k = chaveNome(resp), dest = [];
  const add = e => { e = String(e || '').trim().toLowerCase(); if (e && dest.indexOf(e) < 0) dest.push(e); };
  (mapa[k] || (k === 'gerencia' ? mapa.gerente : null) || []).forEach(add);
  if (k) {
    let us = [];
    try { us = lerUsuarios().lista; } catch (e) { us = []; }
    us.forEach(u => {
      const pk = chaveNome(u.perfil);
      if (u.ativo && emailValido(u.email) && (pk === k || (k === 'gerencia' && pk === 'gerente'))) add(u.email);
    });
  }
  return dest;
}

// --- avisos ao síndico: pendência aguardando a aprovação dele e alterações nas pendências que ele acompanha ---
// (as que ele incluiu ou que estão com o Síndico como responsável). Quem fez a mudança sendo o próprio síndico, não sai e-mail.
// Uma falha no e-mail nunca desfaz a gravação.
function pendAcompanhadaPeloSindico(p) { return p.origem === 'Síndico' || chaveNome(p.responsavel) === 'sindico'; }
function pendAvisarSindico(p, motivo, mudancas, conta) {
  try {
    if (ehSindico(conta)) return '';
    const dest = emailsDoSetor('Síndico');
    if (!dest.length) return '';
    const dt = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
    const corpo = [
      motivo + '.',
      '',
      'Seção: ' + pendRotuloSecao(p.secao),
      'Nº: ' + (p.numero || '—'),
      'Pendência: ' + p.titulo,
      (mudancas || []).length ? '' : '',
      (mudancas || []).length ? 'O que mudou:' : '',
      (mudancas || []).map(m => ' • ' + m).join('\n'),
      (mudancas || []).length ? '' : '',
      'Situação: ' + (p.status || 'Pendente'),
      'Responsável: ' + (String(p.responsavel || '').trim() || 'não definido'),
      p.prazo ? (p.tipo === 'Constante' ? 'Próxima execução: ' : 'Prazo inicial: ') + dt(p.prazo) : '',
      p.prazoAtualizado ? 'Atualização de prazo: ' + dt(p.prazoAtualizado) : '',
      'Feito por: ' + conta.nome + ' em ' + dt(agora()) + ' ' + String(agora()).slice(11, 16),
      '',
      'Veja no Pier Gestão: Administração → Pendências e compras.',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].filter(l => l !== null && l !== undefined).filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – pendência' + (p.numero ? ' nº ' + p.numero : '') + ': ' + motivo.replace(/^A pendência /, '').slice(0, 60) + ' – ' + String(p.titulo).slice(0, 60), body: corpo, name: 'Pier Gestão' });
    return ' Síndico avisado por e-mail.';
  } catch (e) {
    Logger.log('Aviso ao síndico não enviado: ' + e.message);
    return '';
  }
}
// o que mudou numa alteração (só os campos que o síndico acompanha)
function pendMudancas(antes, obj) {
  const dt = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '(sem data)';
  const campos = [['titulo', 'Descrição'], ['status', 'Situação'], ['responsavel', 'Responsável'], ['criticidade', 'Criticidade'],
    ['prazo', 'Prazo', dt], ['prazoAtualizado', 'Atualização de prazo', dt], ['obs', 'Detalhes']];
  const out = [];
  campos.forEach(([k, rot, f]) => {
    if (!(k in obj)) return;
    const a = String(antes[k] == null ? '' : antes[k]).trim(), b = String(obj[k] == null ? '' : obj[k]).trim();
    if (a === b) return;
    const fx = f || (x => x || '(vazio)');
    out.push(k === 'obs' ? rot + ': ' + (b ? b.slice(0, 400) : '(apagados)') : rot + ': ' + fx(a) + ' → ' + fx(b));
  });
  return out;
}

// pendência nova: o aviso vai SÓ para o setor responsável escolhido; sem responsável, não sai e-mail.
// Uma falha no e-mail nunca desfaz a inclusão.
function pendAvisarCriacao(p, conta, pai) {
  try {
    const resp = String(p.responsavel || '').trim();
    if (!resp) return '';
    const dest = emailsDoSetor(resp);
    if (!dest.length) return ' Nenhum e-mail cadastrado para ' + resp + ' (aba Emails ou Usuários).';
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
    return ' Aviso enviado por e-mail para ' + resp + ' (' + dest.length + ' destinatário' + (dest.length === 1 ? '' : 's') + ').';
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
// cabeçalhos já conferidos nesta execução (cada aba é conferida uma vez por pedido)
var TABS = {};

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
  cotSalvar: 'Cotação', cotArquivo: 'Arquivo de cotação',
  prestSalvar: 'Prestador de serviço', prestVisita: 'Visita de prestador', prestDoc: 'Documento de prestador', prestDocRemover: 'Tirou documento de prestador', prestImportar: 'Importou planilha de prestadores',
  unSalvar: 'Unidade', unConfig: 'Configuração das unidades', unOcupadas: 'Marcou unidades ocupadas', unImportar: 'Importou cadastro de moradores',
  fornSalvar: 'Fornecedor', fornImportar: 'Importou planilha de fornecedores', fornDasCotacoes: 'Trouxe fornecedores das cotações',
  espReserva: 'Reserva de espaço', espEspaco: 'Espaço', espVistoria: 'Vistoria de espaço', espColar: 'Reserva colada do e-mail', espImportar: 'Importou PDF de reservas', espEmails: 'Leu e-mails de reserva',
  medMedidor: 'Medidor', medLeituras: 'Leitura de medidor', medContas: 'Conta de consumo', medImportar: 'Importou planilha de medições',
  rondaSalvar: 'Ronda', rondaFoto: 'Foto na ronda', rondaFotoRemover: 'Tirou foto da ronda', rondaResolver: 'Resolveu pendência da ronda',
  visao: 'Abriu tela',
  trocarSenha: 'Trocou a própria senha',
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
  [[pastaFotos(), 'Pasta de fotos das OS'], [pastaNF(), 'Pasta de notas fiscais'], [pastaCotacoes(), 'Pasta de cotações']].forEach(([pasta, rot]) => {
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
// quem tem o perfil "Gerente" aprova a primeira etapa da inclusão e a parte dele na conclusão das pendências
function ehGerente(conta) {
  return String((conta && conta.perfil) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().indexOf('gerente') >= 0;
}

// Perfil "Gerente": criado uma vez só, com todas as permissões menos a gestão de usuários e os dados dos moradores (ajustável na tela Usuários)
function garantirGerente() {
  if (Object.keys(lerPerfis()).some(n => chaveNome(n).indexOf('gerente') >= 0)) return '';
  // dados pessoais dos moradores (unidades) não entram por padrão: a Administração marca se quiser
  const perms = {}; PERMISSOES.forEach(p => { if (['usuarios', 'un_ver', 'un_editar', 'med_lancar', 'med_ver'].indexOf(p[0]) < 0) perms[p[0]] = true; });
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
