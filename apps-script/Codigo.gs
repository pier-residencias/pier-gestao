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
  compra: {
    nome: 'Controle de Compras',
    criar: true,
    cols: [['id', 'ID'], ['numero', 'Nº'], ['item', 'Item'], ['status', 'Status'], ['dataCompra', 'Data de Compra'], ['previsao', 'Previsão de Entrega'],
      ['entregaEm', 'Data Efetiva da Entrega'], ['obs', 'Observação'], ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por']],
    num: ['numero']
  },
  com: {
    nome: 'Comunicados',
    criar: true,
    cols: [['id', 'ID'], ['criadoEm', 'Criado em'], ['por', 'Enviado por'], ['porUsuario', 'Usuário'], ['assunto', 'Assunto'], ['tipo', 'Destaque'],
      ['destinos', 'Destinatários'], ['emails', 'E-mails'], ['status', 'Situação'], ['agendadoPara', 'Agendado para'], ['enviadoEm', 'Enviado em'],
      ['resumo', 'Resumo'], ['arquivo', 'Arquivo do agendamento']],
    num: []
  },
  correspondencias: {nome:'Correspondencias', cols:[['id','ID'],['operacaoId','Operação'],['bloco','Bloco'],['unidade','Unidade'],['destinatario','Destinatário'],['tipo','Tipo'],['transportadora','Transportadora'],['rastreio','Rastreio'],['local','Local de guarda'],['obs','Observação'],['status','Situação'],['recebidoEm','Recebido em'],['recebidoPor','Recebido por'],['retiradoEm','Retirado em'],['retiradoPor','Retirado por'],['entreguePor','Entregue por'],['canceladoEm','Cancelado em'],['canceladoPor','Cancelado por'],['motivo','Motivo do cancelamento'],['versao','Versão']], num:['versao'], criar:true},
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
      ['os', 'OS'], ['nfFotos', 'Foto da NF'], ['contagem','Contagem'], ['operacao','Operação'], ['saldoAnterior','Saldo anterior'], ['saldoFinal','Saldo final'], ['aprovadoPor','Aprovado por'], ['offId','Retirada sem internet (código do celular)']
    ],
    num: ['qtd', 'delta', 'valorUnit', 'saldoAnterior', 'saldoFinal'],
    opcionais: ['os', 'nfFotos', 'contagem', 'operacao', 'saldoAnterior', 'saldoFinal', 'aprovadoPor', 'offId']
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
      ['atualizadoEm', 'Atualizado em'],
      ['setor', 'Setor'], ['pendencia', 'Pendência de origem'], ['equipamento', 'Equipamento'],
      ['tipo', 'Tipo de OS'], ['atividade', 'Atividade'], ['agendadaPara', 'Agendada para'], ['periodo', 'Período agendado'], ['unidadeSolic', 'Unidade solicitante'],
      ['tecnicaEm', 'Conclusão técnica em'], ['tecnicaPor', 'Conclusão técnica por'],
      ['validadaEm', 'Validada em'], ['validadaPor', 'Validada por'],
      ['fechAdmEm', 'Fechada pela Administração em'], ['fechAdmPor', 'Fechada pela Administração por'], ['fechAdmJust', 'Justificativa do fechamento'], ['statusAnterior', 'Situação antes do fechamento'],
      ['offId', 'Aberta sem internet (código do celular)'], ['offConc', 'Baixa sem internet (código do celular)'], ['offIds', 'Envios sem internet (códigos do celular)']
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
      ['limite', 'Limite diário'], ['proxCiclo', 'Próxima leitura da concessionária'], ['fator', 'Constante do medidor']],
    num: ['casas', 'limite', 'fator']
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
      ['ativo', 'Ativo'], ['criadoEm', 'Criado em'], ['criadoPor', 'Criado por'], ['valor', 'Valor da reserva'],
      ['antecedencia', 'Antecedência mínima (dias)'], ['vagasDia', 'Reservas por dia'], ['cobranca', 'Cobrança']],
    num: ['valor']
  },
  esr: {
    nome: 'Reservas',
    criar: true,
    cols: [['id', 'ID'], ['solicitacao', 'Nº da solicitação'], ['espaco', 'Espaço'], ['data', 'Data'], ['bloco', 'Bloco'], ['unidade', 'Unidade'], ['status', 'Status'],
      ['origem', 'Origem'], ['obs', 'Observação'], ['emailEm', 'E-mail de'], ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'],
      ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'], ['valor', 'Valor (R$)'],
      ['tipoSol', 'Solicitante é'], ['unidadeId', 'ID da unidade'], ['solicitante', 'Solicitante'], ['email', 'E-mail do solicitante'], ['telefone', 'Telefone'], ['cpf', 'CPF'],
      ['periodo', 'Período'], ['horario', 'Horário'], ['avisoEm', 'E-mail de confirmação enviado em'],
      ['termoHash', 'Código do link do termo'], ['termoLinkEm', 'Link do termo enviado em'], ['termoAssinadoEm', 'Termo assinado em'], ['termoNome', 'Termo assinado por'], ['termoVia', 'Termo assinado via'], ['termoArquivo', 'Termo assinado (arquivo)'],
      ['termoAvisoEm', 'Termo pedido automaticamente em'], ['termoPrazo', 'Prazo para assinar'], ['termoLembreteEm', 'Lembrete do termo em'], ['termoVencidoEm', 'Prazo do termo vencido em'], ['termoObs', 'Observação do termo'], ['confAvisoEm', 'Confirmação ao morador em']],
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
      ['obs', 'Observação'], ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'], ['atualizadoEm', 'Corrigido em'], ['atualizadoPor', 'Corrigido por'], ['pdf', 'PDF da conta']],
    num: ['consumo', 'valor']
  },
  // registro dos arquivos importados (impressão digital SHA-256): avisa quando o mesmo arquivo vai ser importado de novo
  arq: {
    nome: 'Arquivos importados',
    criar: true,
    cols: [['id', 'ID'], ['tipo', 'Importação'], ['hash', 'Impressão digital (SHA-256)'], ['nomeArq', 'Arquivo'], ['tamanho', 'Tamanho (bytes)'],
      ['importadoEm', 'Importado em'], ['importadoPor', 'Importado por'], ['resumo', 'Resultado']],
    num: ['tamanho']
  },
  // Guaritas Sul e Norte: entrada e saída de visitantes e prestadores de serviço (pedido de 04/11/2026)
  gua: {
    nome: 'Guaritas',
    criar: true,
    cols: [['id', 'ID'], ['operacaoId', 'Operação'], ['guarita', 'Guarita'], ['tipo', 'Tipo'], ['nome', 'Nome'], ['documento', 'Documento'],
      ['empresa', 'Empresa / serviço'], ['bloco', 'Destino (bloco ou área)'], ['unidade', 'Unidade'], ['autorizadoPor', 'Autorizado por'], ['placa', 'Placa'],
      ['obs', 'Observação'], ['status', 'Situação'], ['entradaEm', 'Entrada'], ['entradaPor', 'Entrada registrada por'], ['saidaEm', 'Saída'],
      ['saidaPor', 'Saída registrada por'], ['motivo', 'Motivo do cancelamento'], ['canceladoEm', 'Cancelado em'], ['canceladoPor', 'Cancelado por'], ['versao', 'Versão']],
    num: ['versao']
  },
  // Quadro de avisos da Guarita Norte: só a Administração publica; os porteiros dão ciente
  avisos: {
    nome: 'Guarita Norte - avisos',
    criar: true,
    cols: [['id', 'ID'], ['titulo', 'Título'], ['texto', 'Recado'], ['prioridade', 'Prioridade'], ['validoAte', 'Válido até'], ['status', 'Situação'],
      ['criadoEm', 'Publicado em'], ['criadoPor', 'Publicado por'], ['editadoEm', 'Alterado em'], ['editadoPor', 'Alterado por'], ['cientes', 'Cientes'], ['versao', 'Versão']],
    num: ['versao']
  },
  // Barco do condomínio (táxi boat), controlado na Guarita Sul: um passageiro (ou grupo) por linha, em cada viagem do dia
  barco: {
    nome: 'Barco - passageiros',
    criar: true,
    cols: [['id', 'ID'], ['operacaoId', 'Operação'], ['data', 'Data'], ['grade', 'Grade'], ['horario', 'Horário'], ['trajeto', 'Trajeto'], ['nome', 'Nome do passageiro'],
      ['categoria', 'Morador / Visitante / Pier / Funcionário(a)'], ['blocoApto', 'Bloco / apartamento'], ['qtd', 'Quantidade'], ['obs', 'Observação'], ['status', 'Situação'],
      ['registradoEm', 'Registrado em'], ['registradoPor', 'Registrado por'], ['canceladoEm', 'Removido em'], ['canceladoPor', 'Removido por']],
    num: ['qtd']
  },
  // operador do barco e rendições de cada dia
  barcod: {
    nome: 'Barco - dias',
    criar: true,
    cols: [['id', 'ID'], ['data', 'Data'], ['operadorDia', 'Operador diurno (07h às 19h)'], ['operadorNoite', 'Operador noturno (19h às 07h)'], ['almocoDe', 'Rendição almoço de'], ['almocoAte', 'Rendição almoço até'],
      ['jantaDe', 'Rendição janta de'], ['jantaAte', 'Rendição janta até'], ['obs', 'Observação'], ['atualizadoEm', 'Atualizado em'], ['atualizadoPor', 'Atualizado por'],
      ['mare', 'Maré alta (viagens que não saíram)']],
    num: []
  },
  // medição individual de água por unidade (relatório mensal da Exista) e o resumo de cada período (conta da concessionária)
  mi: {
    nome: 'Medição individual',
    criar: true,
    cols: [['id', 'ID'], ['periodo', 'Período'], ['bloco', 'Bloco'], ['unidade', 'Unidade'], ['dataIni', 'Leitura anterior em'], ['dataFim', 'Leitura atual em'],
      ['leituraAnt', 'Leitura anterior'], ['leituraAtual', 'Leitura atual'], ['estimada', 'Leitura estimada'], ['consumo', 'Consumo (m³)'], ['valor', 'Valor (R$)'],
      ['hidrometro', 'Hidrômetro'], ['local', 'Localização'], ['origem', 'Origem'], ['importadoEm', 'Importado em'], ['importadoPor', 'Importado por']],
    num: ['leituraAnt', 'leituraAtual', 'estimada', 'consumo', 'valor']
  },
  mir: {
    nome: 'Medição individual - resumo',
    criar: true,
    cols: [['id', 'ID'], ['periodo', 'Período'], ['dataIni', 'Início (Exista)'], ['dataFim', 'Fim (Exista)'], ['concessionaria', 'Concessionária'],
      ['concIni', 'Início (concessionária)'], ['concFim', 'Fim (concessionária)'], ['concM3', 'Consumo da concessionária (m³)'], ['concValor', 'Valor da concessionária (R$)'],
      ['valorM3', 'Valor por m³ (R$)'], ['somaExista', 'Soma da Exista (m³)'], ['vencimento', 'Vencimento'], ['importadoEm', 'Importado em'], ['importadoPor', 'Importado por']],
    num: ['concM3', 'concValor', 'valorM3', 'somaExista']
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
  rondaPontos: {
    nome: 'Ronda - Pontos QR', criar: true,
    cols: [['id','ID'],['nome','Ponto'],['local','Local da OS'],['token','Código QR'],['ativo','Ativo'],['dias','Dias da semana'],['limite','Horário limite'],['desde','Vigente desde'],['atualizadoEm','Atualizado em'],['atualizadoPor','Atualizado por']], num: []
  },
  rondaVisitas: {
    nome: 'Ronda - Visitas QR', criar: true,
    cols: [['id','ID'],['pontoId','ID do ponto'],['pontoNome','Ponto'],['data','Data'],['quando','Data e hora'],['usuario','Usuário'],['contaId','ID da conta'],['nome','Responsável'],['resultado','Resultado'],['obs','Observação'],['operacao','Operação']], num: []
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
      ['os', 'OS gerada'], ['osId', 'ID da OS'], ['anexos', 'Comprovação (fotos e documentos)']
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
      ['mapaId', 'ID do mapa'], ['mapaEm', 'Mapa salvo em'], ['conversa', 'Conversa (não editar)']
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

const OS_STATUS = { aberta: 'Aberta', andamento: 'Em andamento', validacao: 'Aguardando validação', gerente: 'Aguardando gerente', concluida: 'Concluída', cancelada: 'Cancelada' };
const OS_PRIORIDADES = ['Urgente', 'Alta', 'Normal', 'Baixa'];
const OS_MAX_FOTOS = 8;
const NF_MAX_ARQUIVOS = 4;

const TIPOS = {
  entrada: 'Entrada', saida: 'Saída', troca: 'Troca', emprestimo: 'Empréstimo',
  devolucao: 'Devolução', ajuste: 'Ajuste', estorno: 'Estorno', conferencia: 'Conferência'
};
const TIPO_POR_NOME = Object.keys(TIPOS).reduce((m, k) => { m[TIPOS[k]] = k; return m; }, {});

// ---------- entrada da web ----------

const VERSAO = '2026-11-21 Pier Gestão 2.0 — Gourmet: painel do termo e conta do Gmail lida';

function doGet() {
  TABS = {};
  return json({ ok: true, app: 'Pier Gestão', versao: VERSAO, ambiente: PropertiesService.getScriptProperties().getProperty('PIER_AMBIENTE') || 'nao_configurado' });
}

function doPost(e) {
  AUDIT_DET = ''; AUDIT_FEITO = false; SALDO_OK = {};
  TABS = {};
  let req;
  try {
    req = JSON.parse(e.postData.contents);
    if (!req || typeof req !== 'object' || Array.isArray(req) ||
        typeof req.acao !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,49}$/.test(req.acao)) {
      return json({ ok: false, erro: 'Pedido inválido.' });
    }
  }
  catch (err) { return json({ ok: false, erro: 'Pedido inválido.' }); }
  try { exigirPlanilhaProducaoPier20(); } catch (e) { return json({ok:false,erro:e.message}); }
  if (req.acao === 'ambiente') return json({ok:true, ambiente:PropertiesService.getScriptProperties().getProperty('PIER_AMBIENTE') || 'nao_configurado'});
  let conta = null;
  try {
    let token = '';
    // esqueci a senha: código por e-mail para a própria pessoa (sem sessão)
    if (req.acao === 'esqueciSenha') return json({ ok: true, msg: pedirCodigoSenha(req.usuario, (req.registro || {}).aparelho) });
    // termo do Espaço Gourmet pelo link do e-mail (sem login; vale só o código do link)
    if (req.acao === 'termoVer') return json({ ok: true, termo: termoVer(req) });
    if (req.acao === 'termoAssinar') return json({ ok: true, msg: termoAssinar(req) });
    if (req.acao === 'redefinirSenha') return json({ ok: true, msg: redefinirComCodigo(req) });
    if (req.acao === 'entrar' && req.senha !== undefined) {
      // entrada com usuário e senha: confere bloqueio por tentativas, a senha (com hash) e abre uma sessão
      const usuarioDig = String(req.usuario || '').trim().toLowerCase();
      const login = verificarEntrada(usuarioDig, req.senha);
      const bloq = login.bloqueado;
      if (bloq) {
        registrarAcesso(null, usuarioDig, Object.assign({}, req.registro || {}, { motivo: 'bloqueado' }));
        return json({ ok: false, codigo: 'bloqueado', erro: 'Muitas tentativas com senha errada. Este login está bloqueado por mais ' + bloq + ' min. Tente depois ou peça para a administração liberar.' });
      }
      conta = login.conta;
      if (!conta) {
        const travou = login.travou;
        falhaLoginGlobal(usuarioDig, (req.registro || {}).aparelho);
        registrarAcesso(null, usuarioDig, Object.assign({}, req.registro || {}, { motivo: 'falha' }));
        if (travou) {
          auditar({ usuario: usuarioDig, nome: '', perfil: '' }, 'Login bloqueado', SEG.tentativas + ' senhas erradas seguidas; bloqueado por ' + SEG.bloqueioMin + ' min.', 'Negado');
          alertaSeguranca('bloqueio', usuarioDig, 'Login bloqueado por ' + SEG.bloqueioMin + ' min depois de ' + SEG.tentativas + ' senhas erradas seguidas.', (req.registro || {}).aparelho);
        }
        return json({ ok: false, codigo: 'senha', erro: travou ? 'Senha errada de novo. Por segurança, este login ficou bloqueado por ' + SEG.bloqueioMin + ' min.' : 'Usuário ou senha incorretos.' });
      }
      token = abrirSessao(conta, req.registro);
    } else {
      if (limiteSessaoExcedido(req.token)) return json({ ok: false, codigo: 'limite', erro: 'Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.' });
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
    if (req.acao === 'guaritas') return json(Object.assign(base, guaLista(req, conta)));
    if (req.acao === 'avisos') return json(Object.assign(base, avLista(conta)));
    if (req.acao === 'barco') return json(Object.assign(base, barcoDia(req, conta)));
    if (req.acao === 'barcoMes') return json(Object.assign(base, barcoMes(req, conta)));
    if (req.acao === 'barcoMoradores') return json(Object.assign(base, barcoMoradores(conta)));
    if (req.acao === 'barcoUnidades') return json(Object.assign(base, barcoUnidades(conta)));
    if (req.acao === 'correspondencias') { corrExigir(conta); return json(Object.assign(base, {correspondencias:linhas(tabela('correspondencias')).map(corrPublica)})); }
    if (req.acao === 'pendVerAnexo') { pode('pendencias'); const f = pendVerAnexo(req); auditar(conta, 'Abriu comprovação de pendência', f.nome); return json(Object.assign(base, { arquivo: f })); }
    if (req.acao === 'fornecedores') { pode('pendencias'); return json(Object.assign(base, fornLista())); }
    if (req.acao === 'compras') { pode('pendencias'); return json(Object.assign(base, comprasLista())); }
    if (req.acao === 'cotLista') { pode('pendencias'); return json(Object.assign(base, cotLista())); }
    if (req.acao === 'cotVerArquivo') { pode('pendencias'); const f = cotVerArquivo(req); auditar(conta, 'Abriu arquivo de cotação', f.nome); delete f.nome; return json(Object.assign(base, { arquivo: f })); }
    if (req.acao === 'unidades') { unExigir(conta, false); return json(Object.assign(base, unLista())); }
    if (req.acao === 'espacos') { espExigir(conta); return json(Object.assign(base, espLista())); }
    if (req.acao === 'gourmet') { espExigir(conta); return json(Object.assign(base, espLista(), { unidadesRes: grUnidades(), grAuto: grAutoVer(conta) })); }
    if (req.acao === 'grTermo') { espExigir(conta); const x = linhas(tabela('esr')).find(z => z.id === String(req.id || '')); if (!x) throw falha('Reserva não encontrada.'); return json(Object.assign(base, { termo: grTermoDados(x) })); }
    if (req.acao === 'grTermoPdf') { espExigir(conta); return json(Object.assign(base, { pdf: grTermoPdf(req) })); }
    if (req.acao === 'pendLembretes') {
      if (conta.perfil !== PERFIL_TOTAL && !conta.perms.usuarios) negar();
      const r = pendLembretesAcao(String(req.op || 'status'), conta, req);
      if (req.op && req.op !== 'status' && req.op !== 'previa') auditar(conta, 'Lembretes de pendências', r.msg || '');
      return json(Object.assign(base, r));
    }
    if (req.acao === 'arqVerificar') return json(Object.assign(base, { iguais: arqVerificar(req.hashes) }));
    if (req.acao === 'medicoes') { medExigir(conta, false); return json(Object.assign(base, medLista())); }
    if (req.acao === 'medContaPdf') { medExigir(conta, false); return json(Object.assign(base, { pdf: medContaPdf(req) })); }
    if (req.acao === 'miLista') { algum(['med_ver', 'med_lancar', 'un_ver', 'un_editar']); return json(Object.assign(base, miLista())); }
    if (req.acao === 'rondaPontoConsultar') { rondaExigir(conta, false); const p = rondaQrPontos().find(p => p.token === texto(req.codigo,80) && rondaQrAtivo(p)); if (!p) throw falha('QR inválido, inativo ou substituído.'); return json(Object.assign(base, {pontoQr: rondaQrLista(conta).pontosQr.find(x => x.id === p.id)})); }
    if (req.acao === 'rondaPontos') return json(Object.assign(base, rondaQrLista(conta)));
    if (req.acao === 'rondas') { rondaExigir(conta, false); return json(Object.assign(base, rondaLista())); }
    if (req.acao === 'rondaFotoVer') { rondaExigir(conta, false); const f = rondaFotoVer(req); delete f.nome; return json(Object.assign(base, { foto: f })); }
    if (req.acao === 'prestVerDoc') { prestExigir(conta, false); const f = prestVerDoc(req); auditar(conta, 'Abriu documento de prestador', f.nome); delete f.nome; return json(Object.assign(base, { arquivo: f })); }
    if (req.acao === 'comunicadoDestinos') { comExigir(conta); return json(Object.assign(base, { com: comPainel(conta) })); }
    if (req.acao === 'comunicadoPrevia') { comExigir(conta); return json(Object.assign(base, { previa: comunicadoPrevia(req, conta) })); }
    if (req.acao === 'pendencias') { pode('pendencias'); return json(Object.assign(base, { pendencias: pendLista(), pendVersao: PEND_VERSAO })); }
    if (req.acao === 'nfVer') { algum(['historico_ver', 'registrar_entrada', 'dashboard']); const f = verArquivo(req.fotoId, pastaNF()); auditar(conta, 'Abriu nota fiscal', f.nome); delete f.nome; return json(Object.assign(base, { foto: f })); }
    if (req.acao === 'nfEnviar') { pode('registrar_entrada'); return json(Object.assign(base, { arquivo: nfEnviar(req, conta) })); }
    if (req.acao === 'osFotoVer') { algum(['os_ver', 'os_abrir', 'os_atender', 'os_gerenciar']); const f = osFotoVerAutorizada(req.fotoId, conta); delete f.nome; return json(Object.assign(base, { foto: f })); }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw falha('O sistema está ocupado com outro registro. Tente de novo em alguns segundos.');
    const escritaEstoque = ['registrar','devolver','salvarItem','excluirItem','estornar','importarContagem','contagemEnviar','contagemDecidir','contagemCancelar','itemLiberar'].includes(req.acao);
    let msg, extra = {}, terminou = false;
    try {
      if (escritaEstoque) {
        const rec = reconciliarContagens();
        conferirImportacaoInterrompida();
        conferirSaldos(rec.itens, SISTEMA);
      }
      switch (req.acao) {
        case 'contagemEnviar': msg = contagemEnviar(req, conta); break;
        case 'contagemDecidir': { const d = contagemDecidir(req, conta); msg = d.texto; extra.resultados = d.resultados; break; }
        case 'contagemCancelar': msg = contagemCancelar(req, conta); break;
        case 'itemLiberar': msg = itemLiberar(req, conta); break;
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
        case 'excluirUsuario': pode('usuarios'); msg = excluirUsuario(req, conta); extra.equipe = equipe(); break;
        case 'salvarPerfil': pode('usuarios'); exigirPerfilTotalParaPerfil(req, conta); msg = salvarPerfil(req); extra.equipe = equipe(); break;
        case 'excluirPerfil': pode('usuarios'); msg = excluirPerfil(req.nome); extra.equipe = equipe(); break;
        case 'trocarSenha': msg = trocarMinhaSenha(req, conta); extra.semDados = true; break;
        case 'pendSalvar': pode('pendencias'); msg = pendSalvar(req.pend || {}, conta); extra.pendencias = true; break;
        case 'guaritaSalvar': msg = guaSalvar(req, conta); extra.semDados = true; break;
        case 'avisoSalvar': msg = avSalvar(req, conta); extra.semDados = true; break;
        case 'barcoSalvar': msg = barcoSalvar(req, conta); extra.semDados = true; break;
        case 'correspondenciaSalvar': corrExigir(conta); msg = corrSalvar(req, conta); extra.semDados = true; break;
        case 'fornSalvar': pode('pendencias'); msg = fornSalvar(req, conta); extra.forn = true; extra.semDados = true; break;
        case 'compraSalvar': pode('pendencias'); msg = compraSalvar(req, conta); extra.compras = true; extra.semDados = true; break;
        case 'compraImportar': pode('pendencias'); msg = compraImportar(req, conta); extra.compras = true; extra.semDados = true; break;
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
        case 'grReservar': espExigir(conta); msg = grReservar(req, conta); extra.esp = true; extra.semDados = true; extra.gr = { id: GR_ULTIMA }; break;
        case 'grAcao': espExigir(conta); msg = grAcao(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'grAuto': espExigir(conta); msg = grAutoSalvar(req, conta); extra.semDados = true; extra.grAuto = true; break;
        case 'grAutoAgora': espExigir(conta); grSoAdm(conta); msg = 'Conferido: ' + grAutoRodar(conta); AUDIT_DET = msg; extra.esp = true; extra.semDados = true; extra.grAuto = true; break;
        case 'espEspaco': espExigir(conta); msg = espEspaco(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espVistoria': espExigir(conta); msg = espVistoria(req, conta); extra.esp = true; extra.semDados = true; break;
        case 'espColar': espExigir(conta); msg = espColar(req, conta); if (msg.lida) { extra.lida = msg.lida; msg = 'ok'; } else { msg = msg.texto; extra.esp = true; } extra.semDados = true; break;
        case 'espImportar': espExigir(conta); msg = espImportar(req, conta); if (grAutoCfg().ativo) { const ga = grAutoProcessar().filter(z => !/^0 /.test(z)); if (ga.length) msg += ' Termo automático: ' + ga.join(' · '); } extra.esp = true; extra.semDados = true; break;
        case 'espEmails': espExigir(conta); msg = espLerEmails(conta); extra.esp = true; extra.semDados = true; break;
        case 'medImportar': medExigir(conta, true); msg = medImportar(req, conta); extra.med = true; extra.semDados = true; break;
        case 'miImportar': medExigir(conta, true); msg = miImportar(req, conta); extra.mi = true; extra.semDados = true; break;
        case 'miExcluir': medExigir(conta, true); msg = miExcluir(req, conta); extra.mi = true; extra.semDados = true; break;
        case 'miBlocos': medExigir(conta, true); msg = miSalvarBlocos(req); extra.mi = true; extra.semDados = true; break;
        case 'rondaPontoSalvar': msg = rondaQrSalvar(req, conta); extra.semDados = true; break;
        case 'rondaVisitar': msg = rondaQrVisitar(req, conta); extra.semDados = true; break;
        case 'rondaSalvar': rondaExigir(conta, true); msg = rondaSalvar(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaFoto': rondaExigir(conta, true); msg = rondaFoto(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaFotoRemover': rondaExigir(conta, true); msg = rondaFotoRemover(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'rondaResolver': rondaExigir(conta, true); msg = rondaResolver(req, conta); extra.ronda = msg.ronda; msg = msg.texto; extra.semDados = true; break;
        case 'prestImportar': prestExigir(conta, true); msg = prestImportar(req, conta); break;
        case 'comunicadoEnviar': comExigir(conta); msg = comunicadoEnviar(req, conta); extra.semDados = true; extra.com = true; break;
        case 'comunicadoCancelar': comExigir(conta); msg = comunicadoCancelar(req, conta); extra.semDados = true; extra.com = true; break;
        case 'comModeloSalvar': comExigir(conta); msg = comModeloSalvar(req, conta); extra.semDados = true; extra.com = true; break;
        case 'comModeloExcluir': comExigir(conta); msg = comModeloExcluir(req, conta); extra.semDados = true; extra.com = true; break;
        case 'pendAnexo': pode('pendencias'); msg = pendAnexo(req, conta); extra.pendencias = true; break;
        case 'pendExcluir': pode('pendencias'); msg = pendExcluir(req.id); extra.pendencias = true; break;
        default: throw falha('Ação desconhecida.');
      }
      if (Array.isArray(req.arquivos) && req.arquivos.length) arqRegistrar(req.acao, req.arquivos, conta, typeof msg === 'string' ? msg : '');
      SpreadsheetApp.flush();
      if (escritaEstoque) atualizarRetrato(); terminou = true;
      if (!AUDIT_FEITO) auditar(conta, ACOES_AUDIT[req.acao] || req.acao, resumoAuditoria(req, msg));
    } finally {
      if (escritaEstoque && !terminou && Object.keys(SALDO_OK).length) { try { atualizarRetrato(SALDO_OK); } catch (e2) {} }
      lock.releaseLock();
    }
    if (extra.pendencias) return json(Object.assign(base, { msg, pendencias: pendLista(), pendVersao: PEND_VERSAO }));
    if (extra.equipe) return json(Object.assign(base, { msg }, extra));
    if (extra.semDados) return json(Object.assign(base, { msg }, extra.avisos ? { avisos: extra.avisos } : {}, extra.cot ? { cot: extra.cot } : {}, extra.ronda ? { ronda: extra.ronda } : {}, extra.med ? medLista() : {}, extra.esp ? espLista() : {}, extra.forn ? fornLista() : {}, extra.compras ? comprasLista() : {}, extra.gr ? { gr: extra.gr } : {}, extra.grAuto ? { grAuto: grAutoVer(conta) } : {}, extra.mi ? miLista() : {}, extra.lida ? { lida: extra.lida } : {}, extra.com ? { com: comPainel(conta) } : {}));
    return json(Object.assign(base, { msg, dados: dados(req.meses, conta) }, extra));
  } catch (err) {
    // Falhas dos serviços de auditoria não podem impedir uma resposta segura.
    if (conta && err && (err.negado || /não tem permissão/i.test(String(err.message)))) {
      try {
        auditar(conta, ACOES_AUDIT[req.acao] || req.acao, String(err.message), 'Negado');
        alertaSeguranca('negado', conta.usuario, 'Tentativa sem permissão: ' + req.acao, '', conta.nome);
      } catch (auditoriaErro) {
        console.error('Pier Gestão: falha ao registrar acesso negado.');
      }
    }
    if (err && err.paraUsuario) return json(Object.assign({ ok: false, erro: err.message }, err.codigo ? {codigo:err.codigo} : {}));
    const referencia = Utilities.getUuid().slice(0, 8);
    console.error('Pier Gestão: erro interno [' + referencia + '] na ação ' + req.acao, err);
    return json({ ok: false, referencia,
      erro: 'Não foi possível concluir a operação. Informe o código ' + referencia + ' à Administração.' });
  }
}

// ---------- ações ----------

function registrar(m, nome, conta) {
  const tipo = m.tipo;
  if (['entrada', 'saida', 'troca', 'emprestimo'].indexOf(tipo) < 0) throw falha('Tipo de movimentação inválido.');
  const qtd = numero(m.qtd);
  if (!Number.isFinite(qtd) || !(qtd > 0)) throw falha('Informe uma quantidade maior que zero.');
  if (tipo !== 'entrada') {
    if (!texto(m.responsavel)) throw falha('Informe quem retirou.');
    if (!texto(m.destino)) throw falha('Informe o destino.');
  }
  if (tipo === 'troca' && !texto(m.velhoDestino)) throw falha('Informe o que foi feito com a peça retirada.');
  // retirada feita sem internet no aplicativo: o mesmo código enviado de novo não desconta duas vezes
  const offK = (tipo === 'saida' || tipo === 'troca') && /^F[a-z0-9]{6,40}$/i.test(String(m.offId || '')) ? String(m.offId) : '';
  if (offK && linhas(tabela('movs')).some(x => x.offId === offK)) return 'Retirada já recebida.';
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
  if (offK) { mov.offId = offK; mov.obs = texto((mov.obs ? mov.obs + ' · ' : '') + 'Registrada sem internet no aplicativo' + osOffQuando(m.offEm), 300); }
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
  exigirItemLivre(e.itemId);
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
  if (it) SALDO_OK[it.id] = true;
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
  if (!Number.isFinite(qtd) || !(qtd >= 0)) throw falha('Quantidade inválida.');
  if (!Number.isFinite(minimo) || !(minimo >= 0)) throw falha('Estoque mínimo inválido.');
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
  if (m.tipo === 'ajuste' || m.tipo === 'conferencia') throw falha('Ajuste ou conferência não pode ser estornado. Faça uma nova contagem com justificativa.');
  exigirItemLivre(m.itemId);
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
  if (it) SALDO_OK[it.id] = true;
  return 'Lançamento estornado.';
}

// ---------- leitura ----------

function dadosBasePier(meses, conta) {
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
      o.status === OS_STATUS.aberta || o.status === OS_STATUS.andamento || o.status === OS_STATUS.validacao || o.status === OS_STATUS.gerente ||
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
    if (sh.getMaxColumns() < cab.length) sh.insertColumnsAfter(sh.getMaxColumns(), cab.length - sh.getMaxColumns());
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
      if (sh.getMaxColumns() < ncol) sh.insertColumnsAfter(sh.getMaxColumns(), ncol - sh.getMaxColumns());
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
  ['contagem_registrar','Registrar contagens','Contar materiais da manutenção e enviar diferenças para aprovação','Inventário'],
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
  ['gua_sul', 'Guarita Sul', 'Registrar a entrada e a saída de visitantes e prestadores na Guarita Sul (setor Guaritas)', 'Guaritas'],
  ['gua_norte', 'Guarita Norte', 'Registrar a entrada e a saída de visitantes e prestadores na Guarita Norte (setor Guaritas)', 'Guaritas'],
  ['espacos', 'Espaços e reservas', 'Reservas do Espaço Gourmet e outros espaços, vistoria de entrega/devolução e cadastro dos espaços (setor Administração)', 'Espaços']
];
const PADRAO_MANUTENCAO = ['painel', 'itens_ver', 'historico_ver', 'registrar_saida', 'registrar_entrada',
  'registrar_troca', 'registrar_emprestimo', 'devolver', 'itens_cadastrar', 'os_ver', 'os_abrir', 'os_atender', 'dem_ver', 'dem_executar',
  'setor_manutencao', 'contagem_registrar'];
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
  if (senhaFracaMotivo(nova, usuario)) throw falha(senhaFracaMotivo(nova, usuario));
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
    if (senhaFracaMotivo(nova, u)) throw falha(senhaFracaMotivo(nova, u));
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
  return { id: us.uid || '', usuario: us.usuario, nome: us.nome || us.usuario, perfil: us.perfil, perms };
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
  c['ID'] = head.indexOf(COL_ID_CONTA);
  c['Telefone'] = head.indexOf('Telefone');
  c['E-mail'] = head.indexOf('E-mail');
  c['Senha provisória'] = head.indexOf('Senha provisória');
  const lista = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    const usuario = String(r[c['Usuário']]).trim().toLowerCase();
    if (!/^[a-z0-9._@-]{2,40}$/.test(usuario)) continue;
    lista.push({
      row: i + 1, uid: c['ID'] >= 0 ? String(r[c['ID']] || '').trim() : '', usuario, nome: texto(r[c['Nome']], 60), senha: String(r[c['Senha']]).trim(),
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
  if (senha) {
    linha[U.c['Senha']] = hashSenha(senha);
    // senha criada pela Administração para outra pessoa é provisória: na entrada, ela é convidada a criar a própria
    linha[U.c['Senha provisória']] = original && original === conta.usuario ? '' : 'Sim';
  }
  linha[U.c['Perfil']] = perfil; linha[U.c['Ativo']] = ativo ? 'Sim' : 'Não'; linha[U.c['Telefone']] = telefone;
  if (v.email !== undefined) linha[U.c['E-mail']] = email;
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
    if (anterior && anterior.telefone !== telefone) mud.push('Telefone');
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
// exclui o login de vez: a linha sai da aba Usuarios e os acessos abertos são encerrados.
// O histórico (OS, movimentações, auditoria) continua com o nome da pessoa.
function excluirUsuario(r, conta) {
  const u = String(r.usuario || '').trim().toLowerCase();
  if (!u || String(r.confirmar || '').trim().toLowerCase() !== u) throw falha('Confirme a exclusão do login.');
  const U = lerUsuarios();
  const us = U.lista.find(x => x.usuario === u);
  if (!us) throw falha('Usuário não encontrado. Atualize a página.');
  if (u === conta.usuario) throw falha('Você não pode excluir o seu próprio login.');
  if (us.perfil === PERFIL_TOTAL && conta.perfil !== PERFIL_TOTAL) { const e = falha('Só um login do perfil Administração pode excluir outro administrador.'); e.negado = true; throw e; }
  if (us.perfil === PERFIL_TOTAL && !U.lista.some(x => x.usuario !== u && x.perfil === PERFIL_TOTAL && x.ativo)) throw falha('Este é o último login ativo da Administração: não dá para excluir.');
  const n = encerrarSessoesDe(u, '');
  limparFalhasLogin(u);
  U.sh.deleteRow(us.row);
  AUDIT_DET = 'Excluiu o login ' + u + ' (' + us.nome + ', perfil ' + us.perfil + ')' + (n ? '; ' + n + ' acesso(s) aberto(s) encerrado(s)' : '');
  alertaSeguranca('usuario', u, AUDIT_DET + ' (feito por ' + conta.nome + ').', '', us.nome);
  return 'Login de ' + us.nome + ' excluído.';
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
    // as guaritas já chegam liberadas para a gerência (pedido de 04/11/2026)
    return faltam.map(p => nome === PERFIL_TOTAL || (nome === 'Manutenção' && PADRAO_MANUTENCAO.indexOf(p[0]) >= 0)
      || (/^gua_/.test(p[0]) && chaveNome(nome).indexOf('gerente') >= 0) ? 'Sim' : 'Não');
  });
  const necessarias = ncol + faltam.length;
  if (sh.getMaxColumns() < necessarias) sh.insertColumnsAfter(sh.getMaxColumns(), necessarias - sh.getMaxColumns());
  const rng = sh.getRange(1, ncol + 1, novas.length, faltam.length);
  rng.setNumberFormat('@');
  rng.setValues(novas);
  sh.getRange(1, ncol + 1, 1, faltam.length).setFontWeight('bold').setBackground('#1F2A37').setFontColor('#FFFFFF');
  sh.getRange(2, ncol + 1, 50, faltam.length).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build()
  );
  // quando as permissões das guaritas chegam, cria uma vez só o perfil Porteiro (só as duas guaritas; ajustável em Usuários)
  if (faltam.some(p => p[0] === 'gua_sul') && !vals.some((r, i) => i > 0 && String(r[0]).trim() === 'Porteiro')) {
    try { salvarPerfil({ nome: 'Porteiro', perms: { gua_sul: true, gua_norte: true } }); } catch (e) { /* o perfil pode ser criado depois em Usuários */ }
  }
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
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
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
    return (ab >= de && ab <= ate) || (fe && fe >= de && fe <= ate) || o.status === OS_STATUS.aberta || o.status === OS_STATUS.andamento || o.status === OS_STATUS.validacao || o.status === OS_STATUS.gerente;
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
  // OS aberta sem internet no aplicativo: o celular manda um código; se ele já chegou antes (envio repetido), não cria outra
  const offId = /^F[a-z0-9]{6,40}$/i.test(String(v.offId || '')) ? String(v.offId) : '';
  if (offId) {
    const ja = linhas(t).find(x => x.offId === offId);
    if (ja) return { texto: ja.numero + ' já tinha sido recebida.', numero: ja.numero, id: ja.id };
  }
  const max = linhas(t).reduce((m, o) => { const x = /(\d+)\s*$/.exec(o.numero || ''); return x ? Math.max(m, Number(x[1])) : m; }, 0);
  const numero = 'OS-' + ('000' + (max + 1)).slice(-4);
  const id = novoId('O');
  let and = osAndamento('', conta.nome, 'Abriu a OS' + (campos.agendadaPara ? ' (agendada para ' + campos.agendadaPara.split('-').reverse().join('/') + ', ' + String(campos.periodo).toLowerCase() + ')' : ''));
  if (resp) and = osAndamento(and, conta.nome, 'Atribuiu a ' + (resp.nome || resp.usuario));
  if (offId) {
    const em = new Date(String(v.offEm || ''));
    and = osAndamento(and, conta.nome, 'Aberta sem internet no aplicativo' + (isNaN(em) ? '' : ' em ' + Utilities.formatDate(em, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')) + '; enviada quando a conexão voltou');
  }
  gravar(t, Object.assign({
    id, numero, status: OS_STATUS.aberta, abertaEm: agora(), abertaPor: conta.nome, abertaPorUsuario: conta.usuario,
    responsavel: resp ? (resp.nome || resp.usuario) : '', responsavelUsuario: resp ? resp.usuario : '',
    andamento: and, atualizadoEm: agora(), setor, pendencia: (origem && origem.pendencia) || '', offId
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

// envios do aplicativo sem internet: a OS guarda os últimos códigos recebidos para não repetir um reenvio
function osOffChave(v) { const s = String(v || ''); return /^F[a-z0-9]{6,40}(-[a-z][0-9]{1,2})?$/i.test(s) ? s : ''; }
function osOffVisto(o, k) { return !!k && String(o.offIds || '').split(',').indexOf(k) >= 0; }
function osOffMarcar(o, k) { const l = String(o.offIds || '').split(',').filter(Boolean); l.push(k); return l.slice(-60).join(','); }
function osOffQuando(v) { const em = new Date(String(v || '')); return isNaN(em) ? '' : ' em ' + Utilities.formatDate(em, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }

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
      // baixa feita sem internet no aplicativo: o mesmo código enviado de novo não repete a baixa
      const offC = /^F[a-z0-9]{6,40}$/i.test(String(r.offId || '')) ? String(r.offId) : '';
      if (offC && o.offConc === offC) return o.numero + ' já tinha sido recebida.';
      if (!d.atender) negar();
      if (d.encerrada) throw falha('Esta OS já está encerrada.');
      const sol = texto(r.solucao, 3000);
      if (!sol) throw falha('Descreva o que foi feito.');
      if (o.status !== OS_STATUS.andamento) throw falha('Inicie o atendimento antes de enviar para validação.');
      if (!idsDeArquivos(o.fotosDepois).length) throw falha('Anexe pelo menos uma foto depois do serviço.');
      upd.status = OS_STATUS.validacao; upd.tecnicaEm = agora(); upd.tecnicaPor = conta.nome; upd.solucao = sol;
      if (d.livre) { upd.responsavel = conta.nome; upd.responsavelUsuario = conta.usuario; }
      txt = 'Enviou para validação: ' + sol; msg = o.numero + ' aguardando validação administrativa.';
      if (offC) {
        upd.offConc = offC;
        const em = new Date(String(r.offEm || ''));
        txt += ' (baixa feita sem internet no aplicativo' + (isNaN(em) ? '' : ' em ' + Utilities.formatDate(em, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')) + ')';
      }
      break;
    }
    case 'validar': {
      if (!d.ger || conta.perfil !== 'Administração') negar();
      if (o.status !== OS_STATUS.validacao) throw falha('Esta OS não está aguardando validação.');
      if (!texto(o.solucao, 3000) || !idsDeArquivos(o.fotosDepois).length) throw falha('A conclusão precisa de solução e foto.');
      upd.status = OS_STATUS.concluida; upd.concluidaEm = agora(); upd.concluidaPor = conta.nome;
      upd.validadaEm = upd.concluidaEm; upd.validadaPor = conta.nome;
      txt = 'Validou e encerrou a OS'; msg = o.numero + ' validada e encerrada.';
      break;
    }
    case 'devolver': {
      if (!d.ger || conta.perfil !== 'Administração') negar();
      if (o.status !== OS_STATUS.validacao) throw falha('Esta OS não está aguardando validação.');
      const motivo = texto(r.motivo, 300);
      if (!motivo) throw falha('Informe o motivo da devolução.');
      upd.status = OS_STATUS.andamento;
      txt = 'Devolveu para correção: ' + motivo; msg = o.numero + ' devolvida para correção.';
      break;
    }
    // Fechamento pela Administração (pedido de 17/11/2026): só com justificativa, sem fotos; vai para a aprovação do gerente
    case 'fecharAdm': {
      if (conta.perfil !== PERFIL_TOTAL) negar();
      if (d.encerrada) throw falha('Esta OS já está encerrada.');
      if (o.status === OS_STATUS.gerente) throw falha('Esta OS já está aguardando a aprovação do gerente.');
      const just = texto(r.justificativa, 1000);
      if (just.length < 10) throw falha('Escreva a justificativa do fechamento (pelo menos 10 caracteres).');
      upd.statusAnterior = o.status; upd.status = OS_STATUS.gerente;
      upd.fechAdmEm = agora(); upd.fechAdmPor = conta.nome; upd.fechAdmJust = just;
      if (!texto(o.solucao, 3000)) upd.solucao = 'Fechada pela Administração: ' + just;
      txt = 'Fechou pela Administração (sem fotos), aguardando o gerente: ' + just;
      msg = o.numero + ' enviada para a aprovação do gerente.' + osAvisarGerente(o, conta, just);
      break;
    }
    case 'aprovarFech': {
      if (!ehGerente(conta)) negar();
      if (o.status !== OS_STATUS.gerente) throw falha('Esta OS não está aguardando a aprovação do gerente.');
      upd.status = OS_STATUS.concluida; upd.concluidaEm = agora(); upd.concluidaPor = o.fechAdmPor || conta.nome;
      upd.validadaEm = upd.concluidaEm; upd.validadaPor = conta.nome;
      txt = 'Gerente aprovou o fechamento feito pela Administração'; msg = o.numero + ' encerrada com a aprovação do gerente.';
      break;
    }
    case 'recusarFech': {
      if (!ehGerente(conta)) negar();
      if (o.status !== OS_STATUS.gerente) throw falha('Esta OS não está aguardando a aprovação do gerente.');
      const motivo = texto(r.motivo, 300);
      if (!motivo) throw falha('Informe o motivo da recusa.');
      const volta = [OS_STATUS.aberta, OS_STATUS.andamento, OS_STATUS.validacao].indexOf(o.statusAnterior) >= 0 ? o.statusAnterior : OS_STATUS.aberta;
      upd.status = volta; upd.fechAdmEm = ''; upd.fechAdmPor = ''; upd.fechAdmJust = ''; upd.statusAnterior = '';
      if (String(o.solucao || '').indexOf('Fechada pela Administração: ') === 0) upd.solucao = '';
      txt = 'Gerente recusou o fechamento: ' + motivo; msg = o.numero + ' voltou para "' + volta + '".';
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
      upd.status = OS_STATUS.aberta; upd.concluidaEm = ''; upd.concluidaPor = ''; upd.motivoCancelamento = ''; upd.solucao = ''; upd.tecnicaEm = ''; upd.tecnicaPor = ''; upd.validadaEm = ''; upd.validadaPor = '';
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
      const offK = osOffChave(r.offId);
      if (offK && osOffVisto(o, offK)) return 'Anotação já recebida.';
      txt = 'Anotou: ' + n; msg = 'Anotação registrada.';
      if (offK) { upd.offIds = osOffMarcar(o, offK); txt += ' (feita sem internet no aplicativo' + osOffQuando(r.offEm) + ')'; }
      break;
    }
    default: throw falha('Ação desconhecida.');
  }
  upd.andamento = osAndamento(o.andamento, conta.nome, txt);
  gravar(t, upd, o._row);
  if (r.op === 'validar' || r.op === 'cancelar' || r.op === 'aprovarFech') {
    const td = tabela('dem');
    linhas(td).filter(d => d.os === o.numero).forEach(d =>
      gravar(td, { andamento: osAndamento(d.andamento, conta.nome, 'A ' + o.numero + ' foi ' + (r.op === 'cancelar' ? 'cancelada' : 'concluída')), atualizadoEm: agora() }, d._row));
  }
  return msg;
}

// e-mail para a gerência quando a Administração fecha uma OS sem fotos (uma falha no e-mail não desfaz o fechamento)
function osAvisarGerente(o, conta, just) {
  try {
    const dest = emailsDoSetor('Gerência'); if (!dest.length) return ' (Sem e-mail da Gerência cadastrado: o gerente verá na lista de OS.)';
    const h = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    MailApp.sendEmail({ to: dest.join(','), subject: 'Pier Gestão – ' + o.numero + ' fechada pela Administração: aguarda sua aprovação',
      body: o.numero + ' – ' + o.titulo + '\nFechada por ' + conta.nome + ', sem fotos.\nJustificativa: ' + just + '\n\nAprove ou recuse em Manutenção > Ordens de serviço > filtro "Aguardando gerente": https://piergestao.condominiopier.com.br',
      htmlBody: '<p><b>' + h(o.numero) + '</b> – ' + h(o.titulo) + '</p><p>Fechada por <b>' + h(conta.nome) + '</b>, sem fotos.</p><p><b>Justificativa:</b> ' + h(just) + '</p>'
        + '<p>Aprove ou recuse em <b>Manutenção › Ordens de serviço</b>, filtro “Aguardando gerente”:<br><a href="https://piergestao.condominiopier.com.br">piergestao.condominiopier.com.br</a></p>' });
    return ' Gerente avisado por e-mail.';
  } catch (e) { return ' (Não foi possível enviar o e-mail ao gerente; ele verá na lista de OS.)'; }
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
  const f = pastaNF().createFile(blobConferido(b64, r.mime, nomeArq));
  return { id: f.getId(), mime: r.mime };
}

function osFoto(r, conta) {
  const t = tabela('os');
  const o = linhas(t).find(x => x.id === r.id);
  if (!o) throw falha('OS não encontrada. Atualize a página.');
  const fase = r.fase === 'depois' ? 'depois' : 'antes';
  const offK = osOffChave(r.offId);
  if (offK && osOffVisto(o, offK)) return 'Foto já recebida.';
  const d = osDireitos(o, conta);
  const abriu = o.abertaPorUsuario === conta.usuario && !!conta.perms.os_abrir;
  if (!(d.atender || (abriu && fase === 'antes'))) throw falha('Seu perfil não tem permissão para pôr fotos nesta OS.');
  if (d.encerrada || o.status === OS_STATUS.validacao || o.status === OS_STATUS.gerente) throw falha('Reabra ou devolva a OS para alterar as evidências.');
  const campo = fase === 'antes' ? 'fotosAntes' : 'fotosDepois';
  const ids = String(o[campo] || '').split(',').filter(Boolean);
  if (ids.length >= OS_MAX_FOTOS) throw falha('Esta OS já tem ' + OS_MAX_FOTOS + ' fotos de ' + fase + '.');
  const mime = ['image/jpeg', 'image/png', 'image/webp'].indexOf(r.mime) >= 0 ? r.mime : '';
  if (!mime) throw falha('Envie a foto em JPG ou PNG.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 8000000) throw falha('A foto está muito grande.');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const blob = blobConferido(b64, mime, o.numero + '-' + fase + '-' + (ids.length + 1) + '.' + ext);
  const f = pastaFotos().createFile(blob);
  ids.push(f.getId());
  const upd = { atualizadoEm: agora(), andamento: osAndamento(o.andamento, conta.nome, 'Pôs uma foto de ' + fase) };
  upd[campo] = ids.join(',');
  if (offK) upd.offIds = osOffMarcar(o, offK);
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

// O ID de um arquivo não concede acesso: confira a OS e o setor antes de ler o Drive.
function osFotoVerAutorizada(id, conta) {
  const fotoId = String(id || '');
  const permitida = linhas(tabela('os')).some(o =>
    setoresDe(conta).indexOf(osSetor(o)) >= 0 &&
    idsDeArquivos(String(o.fotosAntes || '') + ',' + String(o.fotosDepois || '')).indexOf(fotoId) >= 0);
  if (!permitida) {
    const e = falha('Seu perfil não tem permissão para abrir esta foto.'); e.negado = true; throw e;
  }
  return verFoto(fotoId);
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
  if (d.encerrada || o.status === OS_STATUS.validacao || o.status === OS_STATUS.gerente) throw falha('Reabra ou devolva a OS para alterar as evidências.');
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
  const f = pastaPrestadores().createFile(blobConferido(b64, r.mime, arq));
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
// número que já chega como número (do site) não passa pela regra do ponto de milhar
const medNum = v => (v === '' || v === null || v === undefined) ? NaN : typeof v === 'number' ? v : /^\d{1,3}(\.\d{3})+$/.test(String(v).trim()) ? Number(String(v).trim().replace(/\./g, '')) : numero(v);
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
  // constante (multiplicador) do relógio: consumo = diferença das leituras × constante (ex.: energia com "Const. medidor 80")
  const temF = String(v.fator === undefined || v.fator === null ? '' : v.fator).trim() !== '', fator = temF ? medNum(v.fator) : 1;
  if (!(fator > 0 && fator <= 100000 && isFinite(fator))) throw falha('A constante do medidor deve ser um número maior que zero (deixe 1 se a conta não mostrar).');
  const o = { tipo, nome, numero: num, casas, unidade, local: texto(v.local, 80), obs: texto(v.obs, 300), limite: temLim ? Math.round(limite * 1000) / 1000 : '', proxCiclo: prox, fator: fator === 1 ? '' : Math.round(fator * 100000) / 100000,
    ativo: v.ativo === false || v.ativo === 'Não' ? 'Não' : 'Sim', atualizadoEm: agora(), atualizadoPor: conta.nome };
  if (atual) {
    gravar(t, o, atual._row);
    AUDIT_DET = 'Alterou o medidor ' + nome + ' (' + tipo + ' nº ' + num + ')' + (o.ativo === 'Não' ? ' — inativo' : '')
      + (String(atual.fator || '') !== String(o.fator) ? ' — constante ' + medFmt(Number(atual.fator) || 1) + ' → ' + medFmt(fator) : '');
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
function medPdfLixo(id) { if (!id) return; try { DriveApp.getFileById(String(id)).setTrashed(true); } catch (e) {} }
// abre o PDF guardado de uma conta (o navegador recebe o arquivo; nada fica público no Drive)
function medContaPdf(r) {
  const c = linhas(tabela('medc')).find(x => x.id === String(r.id || ''));
  if (!c || !c.pdf) throw falha('Esta conta não tem PDF.');
  let f; try { f = DriveApp.getFileById(String(c.pdf)); } catch (e) { throw falha('O PDF desta conta não foi encontrado no Drive.'); }
  const b = f.getBlob();
  return { nome: f.getName(), b64: Utilities.base64Encode(b.getBytes()) };
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
    medPdfLixo(x.pdf);
    AUDIT_DET = 'Excluiu a conta de ' + m.nome + ' de ' + x.mes;
    return 'Conta excluída.';
  }
  const v = r.conta || {};
  const atual = v.id ? todas.find(z => z.id === String(v.id)) : null;
  if (v.id && !atual) throw falha('Conta não encontrada. Atualize a tela.');
  const { m, o } = medConta(v, meds, todas, conta);
  if (todas.some(z => (!atual || z.id !== atual.id) && z.medidor === o.medidor && z.mes === o.mes)) throw falha('Já há conta de ' + m.nome + ' em ' + o.mes.split('-').reverse().join('/') + '. Edite a que já existe.');
  // PDF da conta (opcional): guardado no Drive, numa pasta própria, sem compartilhar
  if (v.pdf && v.pdf.b64) {
    const b64 = String(v.pdf.b64);
    if (b64.length > 14000000) throw falha('O PDF da conta de ' + m.nome + ' passa de 10 MB.');
    if (!conteudoConfere(b64, 'application/pdf')) throw falha('O arquivo da conta de ' + m.nome + ' não é um PDF.');
    const nomeArq = (m.nome + ' - ' + o.mes + '.pdf').replace(/[\\/:*?"<>|]/g, '_');
    const f = pastaDrive('PASTA_CONTAS_CONSUMO', 'Contas de consumo - Pier Gestão').createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', nomeArq));
    o.pdf = f.getId();
    if (atual && atual.pdf) medPdfLixo(atual.pdf);
  } else if (v.tirarPdf && atual && atual.pdf) { medPdfLixo(atual.pdf); o.pdf = ''; }
  if (atual) { o.atualizadoEm = agora(); o.atualizadoPor = conta.nome; gravar(t, o, atual._row); }
  else { o.id = novoId('MC'); o.registradoEm = agora(); o.registradoPor = conta.nome; gravar(t, o); }
  AUDIT_DET = (atual ? 'Corrigiu' : 'Lançou') + ' a conta de ' + m.nome + ' de ' + o.mes.split('-').reverse().join('/') + (o.valor !== '' ? ': R$ ' + Number(o.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  return atual ? 'Conta corrigida.' : 'Conta lançada.';
}
// planilha lida no navegador: leituras (data, medidor, leitura) e/ou contas (mês, medidor, consumo, valor).
// Grava as linhas certas, pula as repetidas e devolve as com erro.
// ---------- arquivos importados: o mesmo arquivo (mesma impressão digital) não entra duas vezes sem aviso ----------
const ARQ_TIPOS = { unImportar: 'Cadastro de unidades', medImportar: 'Planilha de medições', espImportar: 'PDF de reservas', fornImportar: 'Planilha de fornecedores',
  prestImportar: 'Planilha de prestadores', importarContagem: 'Contagem de estoque', miImportar: 'Medição individual (Exista)', cotSalvar: 'Mapa de cotação' };
const arqHashOk = h => /^[0-9a-f]{64}$/.test(String(h || ''));
function arqVerificar(hashes) {
  const hs = (Array.isArray(hashes) ? hashes : []).map(h => String(h).toLowerCase()).filter(arqHashOk).slice(0, 80);
  if (!hs.length) return [];
  return linhasOnde(tabela('arq'), ['hash'], x => hs.indexOf(String(x.hash).toLowerCase()) >= 0)
    .map(x => ({ hash: x.hash, tipo: x.tipo, nome: x.nomeArq, tamanho: x.tamanho, quando: x.importadoEm, por: x.importadoPor, resumo: x.resumo }))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}
function arqRegistrar(acao, arquivos, conta, msg) {
  try {
    const t = tabela('arq'), quando = agora();
    const novos = arquivos.slice(0, 10).filter(a => a && arqHashOk(String(a.hash).toLowerCase())).map(a => ({ id: novoId('AQ'), tipo: ARQ_TIPOS[acao] || acao,
      hash: String(a.hash).toLowerCase(), nomeArq: texto(a.nome, 120), tamanho: Number(a.tamanho) > 0 ? Number(a.tamanho) : '', importadoEm: quando, importadoPor: conta.nome, resumo: texto(msg, 200) }));
    if (novos.length) anexarLinhas(t, novos);
  } catch (e) { Logger.log('Registro do arquivo importado não gravado: ' + e.message); }
}

// ---------- medição individual (Exista) ----------
// Cada linha: uma unidade num período (AAAA-MM = mês da leitura atual). O histórico do demonstrativo individual entra só com o consumo
// e nunca sobrepõe um período importado da planilha. O resumo guarda a conta da concessionária do período (conferência).
function miLista() {
  const ls = linhas(tabela('mi')).map(unLimpa), rs = linhas(tabela('mir')).map(unLimpa);
  ls.sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)) || String(a.bloco).localeCompare(String(b.bloco), 'pt-BR', { numeric: true }) || String(a.unidade).localeCompare(String(b.unidade), 'pt-BR', { numeric: true }));
  rs.sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
  return { mi: ls, mir: rs, miBlocos: miNomesBlocos() };
}
// nomes dos blocos ("1" → "Marina"): os salvos na medição individual; sem isso, os do cadastro de Unidades que tenham o número
function miNomesBlocos() {
  const props = PropertiesService.getScriptProperties();
  let salvos = {}, un = [];
  try { salvos = JSON.parse(props.getProperty('MI_BLOCOS') || '{}') || {}; } catch (e) { salvos = {}; }
  try { un = JSON.parse(props.getProperty('UN_BLOCOS') || '[]') || []; } catch (e) { un = []; }
  const out = {};
  un.forEach(nome => {
    const m = /\d+/.exec(String(nome)); if (!m) return;
    const resto = String(nome).replace(/bloco/i, '').replace(m[0], '').replace(/[()\-–·:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (resto) out[String(Number(m[0]))] = resto;
  });
  Object.keys(salvos).forEach(k => { if (String(salvos[k]).trim()) out[k] = String(salvos[k]).trim(); else delete out[k]; });
  return out;
}
function miSalvarBlocos(r) {
  const v = r.blocos || {}, o = {};
  Object.keys(v).slice(0, 40).forEach(k => { const b = texto(k, 10); if (b) o[b] = texto(v[k], 40); });
  PropertiesService.getScriptProperties().setProperty('MI_BLOCOS', JSON.stringify(o));
  AUDIT_DET = 'Nomes dos blocos na medição individual: ' + Object.keys(o).map(k => k + '=' + (o[k] || '—')).join(', ');
  return 'Nomes dos blocos salvos.';
}
const miChave = (p, b, u) => String(p) + '|' + String(b).trim().toLowerCase() + '|' + String(u).trim().toLowerCase();
const miPer = s => /^\d{4}-\d{2}$/.test(String(s || ''));
function miNumOpc(v, rot) {
  if (v === '' || v === null || v === undefined) return '';
  // número que já vem como número (lido da planilha) não passa pela regra do ponto de milhar ("312.389" não é 312389)
  const n = typeof v === 'number' ? v : medNum(v);
  if (!isFinite(n) || n < 0) throw falha('Valor inválido em ' + rot + '.');
  return Math.round(n * 1000) / 1000;
}
function miImportar(r, conta) {
  const unidades = Array.isArray(r.unidades) ? r.unidades : [], hist = Array.isArray(r.historico) ? r.historico : [], res = r.resumo || null;
  if (!unidades.length && !hist.length && !res) throw falha('Nada para importar.');
  if (unidades.length > 600 || hist.length > 4000) throw falha('Arquivo grande demais para uma importação.');
  const t = tabela('mi'), todas = linhas(t), porChave = new Map(todas.map(x => [miChave(x.periodo, x.bloco, x.unidade), x]));
  const novas = [], upd = [], quando = agora();
  let atualizadas = 0, hNovos = 0;
  unidades.forEach((x, i) => {
    const periodo = String(x.periodo || r.periodo || ''), bloco = texto(x.bloco, 10), unidade = texto(x.unidade, 20);
    if (!miPer(periodo)) throw falha('Período inválido na linha ' + (i + 1) + '.');
    if (!unidade) throw falha('Unidade em branco na linha ' + (i + 1) + '.');
    const consumo = miNumOpc(x.consumo, 'consumo da unidade ' + unidade);
    if (consumo === '') throw falha('Consumo em branco na unidade ' + unidade + ' (bloco ' + bloco + ').');
    const o = { periodo, bloco, unidade, dataIni: dataOk(x.dataIni) ? x.dataIni : '', dataFim: dataOk(x.dataFim) ? x.dataFim : '',
      leituraAnt: miNumOpc(x.leituraAnt, 'leitura anterior'), leituraAtual: miNumOpc(x.leituraAtual, 'leitura atual'), estimada: miNumOpc(x.estimada, 'leitura estimada'),
      consumo, valor: x.valor === '' || x.valor == null ? '' : Math.round(miNumOpc(x.valor, 'valor') * 100) / 100,
      origem: ['Relatório Global', 'Demonstrativo Individual'].indexOf(x.origem) >= 0 ? x.origem : 'Planilha Exista', importadoEm: quando, importadoPor: conta.nome };
    if (x.hidrometro) o.hidrometro = texto(x.hidrometro, 30);
    if (x.local) o.local = texto(x.local, 60);
    const k = miChave(periodo, bloco, unidade), atual = porChave.get(k);
    if (atual && atual._row) { upd.push([atual._row, o]); atualizadas++; }
    else if (!atual) { o.id = novoId('MI'); novas.push(o); porChave.set(k, o); }
  });
  hist.forEach(x => {
    const periodo = String(x.periodo || ''), bloco = texto(x.bloco, 10), unidade = texto(x.unidade, 20);
    if (!miPer(periodo) || !unidade) return;
    const consumo = miNumOpc(x.consumo, 'histórico da unidade ' + unidade);
    if (consumo === '') return;
    const k = miChave(periodo, bloco, unidade);
    if (porChave.has(k)) return;
    const o = { id: novoId('MI'), periodo, bloco, unidade, consumo, origem: 'Histórico Exista', importadoEm: quando, importadoPor: conta.nome };
    novas.push(o); porChave.set(k, o); hNovos++;
  });
  // substituição de um período já importado: um bloco só de leitura e gravação (antes era uma gravação por unidade e passava do tempo)
  if (upd.length) {
    const r0 = Math.min.apply(null, upd.map(u => u[0])), r1 = Math.max.apply(null, upd.map(u => u[0]));
    const rng = t.sh.getRange(r0, 1, r1 - r0 + 1, t.ncol), vals = rng.getValues();
    upd.forEach(([row, o]) => { const v = vals[row - r0]; Object.keys(o).forEach(k => { if (t.idx[k] !== undefined) v[t.idx[k]] = o[k]; }); });
    rng.setValues(vals);
  }
  anexarLinhas(t, novas);
  let resumo = '';
  if (res && miPer(res.periodo)) {
    const tr = tabela('mir'), atualR = linhas(tr).find(x => x.periodo === res.periodo);
    const o = { periodo: res.periodo, importadoEm: quando, importadoPor: conta.nome };
    [['dataIni'], ['dataFim'], ['concIni'], ['concFim'], ['vencimento']].forEach(([k]) => { if (dataOk(res[k])) o[k] = res[k]; });
    if (res.concessionaria) o.concessionaria = texto(res.concessionaria, 40);
    [['concM3', 'consumo da concessionária'], ['concValor', 'valor da concessionária'], ['valorM3', 'valor por m³'], ['somaExista', 'soma da Exista']].forEach(([k, rot]) => {
      const v = miNumOpc(res[k], rot); if (v !== '') o[k] = k === 'concValor' ? Math.round(v * 100) / 100 : v;
    });
    if (atualR) gravar(tr, o, atualR._row); else { o.id = novoId('MR'); gravar(tr, o); }
    resumo = ' Conta da concessionária do período registrada.';
  }
  AUDIT_DET = 'Medição individual: ' + (unidades.length ? unidades.length + ' unidade(s) do período ' + String(unidades[0].periodo || r.periodo || '') : '') + (hNovos ? ' · ' + hNovos + ' consumo(s) de histórico' : '') + (resumo ? ' · resumo da conta' : '');
  return (unidades.length ? (novas.length - hNovos) + ' unidade(s) nova(s) e ' + atualizadas + ' atualizada(s).' : '') + (hNovos ? ' ' + hNovos + ' consumo(s) de meses anteriores.' : '') + resumo;
}
function miExcluir(r, conta) {
  // uma linha só (lançamento de uma unidade num período)
  if (r.id) {
    const t = tabela('mi'), x = linhas(t).find(z => z.id === texto(r.id, 40));
    if (!x) throw falha('Este lançamento não existe mais. Atualize a tela.');
    t.sh.deleteRow(x._row);
    AUDIT_DET = 'Excluiu o lançamento da unidade ' + x.unidade + ' (bloco ' + x.bloco + ') em ' + x.periodo + ' da medição individual';
    return 'Lançamento da unidade ' + x.unidade + ' (' + x.periodo.split('-').reverse().join('/') + ') excluído.';
  }
  const periodo = String(r.periodo || '');
  if (!miPer(periodo)) throw falha('Período inválido.');
  let n = 0;
  [['mi', 'periodo'], ['mir', 'periodo']].forEach(([k]) => {
    const t = tabela(k), tot = t.sh.getLastRow() - 1;
    if (tot < 1) return;
    const vals = t.sh.getRange(2, 1, tot, t.ncol).getValues(), fica = vals.filter(v => celula(v[t.idx.periodo], false) !== periodo);
    if (fica.length === vals.length) return;
    if (k === 'mi') n = vals.length - fica.length; else r.temResumo = true;
    t.sh.getRange(2, 1, tot, t.ncol).clearContent();
    if (fica.length) t.sh.getRange(2, 1, fica.length, t.ncol).setValues(fica);
  });
  if (!n && !r.temResumo) throw falha('Não há lançamentos neste período.');
  AUDIT_DET = 'Excluiu o período ' + periodo + ' da medição individual (' + n + ' linha(s))';
  return 'Período ' + periodo.split('-').reverse().join('/') + ' excluído (' + n + ' unidade(s)).';
}

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
const ESP_STATUS = ['Solicitada', 'Aguardando assinatura', 'Termo assinado', 'Pré-reserva', 'Confirmada', 'Cancelada', 'Recusada', 'Realizada'];
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
  const rs = linhas(tabela('esr')).map(unLimpa).map(x => { delete x.termoHash; return x; }).sort((a, b) => String(a.data).localeCompare(String(b.data)));
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
    bloco: texto(g(/Bloco:?\s*([^\n]+)/i), 60), unidade: texto(g(/Unidade:?\s*([^\n]+)/i), 20), titulo: texto(tit, 120),
    solicitante: texto(g(/(?:Solicitante|Morador|Cond[ôo]mino|Nome do solicitante|Nome)\s*:\s*([^\n]+)/i), 80) };
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
      // o termo (Aguardando assinatura / Termo assinado) não volta para "Solicitada" por causa de um e-mail repetido
      const manter = ja.status === 'Realizada' || ((ja.status === 'Aguardando assinatura' || ja.status === 'Termo assinado' || ja.status === 'Confirmada') && (r.status === 'Solicitada' || r.status === 'Pré-reserva'));
      const o = { status: manter ? ja.status : r.status, emailEm: quando, atualizadoEm: agora(), atualizadoPor: conta.nome + ' (' + origem + ')' };
      if (r.data) o.data = r.data;
      gravar(t, o, ja._row); Object.assign(ja, o); atual++;
    } else {
      const nomeE = espAchar(r.espaco, conta);
      const o = { id: novoId('RS'), solicitacao: r.solicitacao, espaco: nomeE, valor: espValorDe(nomeE), data: r.data, bloco: r.bloco, unidade: r.unidade, status: r.status,
        origem, obs: '', emailEm: quando, registradoEm: agora(), registradoPor: conta.nome, solicitante: r.solicitante || '' };
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
// Espaços tirados do sistema (02/11/2026): a leitura automática dos e-mails de reserva para. Para voltar, troque para true.
const ESPACOS_ATIVO = false;
function lerReservasAutomatico() {
  if (!ESPACOS_ATIVO) return;
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
      // o PDF mostra "Iniciada": não desfaz o andamento do termo (Aguardando assinatura / Termo assinado) nem uma confirmação
      const manter = ja.status === 'Realizada' || (['Aguardando assinatura', 'Termo assinado', 'Confirmada'].indexOf(ja.status) >= 0 && (status === 'Solicitada' || status === 'Pré-reserva'));
      if (ja.status === status || manter) { iguais++; return; }
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
  if (r.op === 'excluir') { grSoAdm(conta); if (!ja) throw falha('Reserva não encontrada.'); t.sh.deleteRow(ja._row); AUDIT_DET = 'Excluiu a reserva ' + (ja.solicitacao || ja.id) + ' (' + (ja.solicitante || '') + ', ' + ja.data + ')'; return 'Reserva excluída.'; }
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
// ---------- Reserva do Espaço Gourmet (calendário, solicitante e e-mail de confirmação) ----------
// Unidade: cobrança no boleto, a reserva já sai confirmada. Externo: fica "Pré-reserva" (aguardando pagamento) e a data
// fica bloqueada até alguém confirmar. Uma vaga por dia (ou o que estiver no cadastro do espaço).
let GR_ULTIMA = '';
const GR_ATIVAS = ['Solicitada', 'Aguardando assinatura', 'Termo assinado', 'Pré-reserva', 'Confirmada'];
const grFoneDe = s => { const m = String(s || '').match(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/); return m ? m[0].trim() : ''; };
const grEmailDe = s => (String(s || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || []).filter(emailValido);
function grUnidades() {
  const pes = linhas(tabela('unp'));
  return linhas(tabela('un')).map(u => {
    const pessoas = [];
    if (u.proprietario) pessoas.push({ nome: texto(u.proprietario, 80), rel: 'Proprietário', email: grEmailDe(u.contatos)[0] || '', telefone: grFoneDe(u.contatos), fonte: 'un', pid: u.id });
    pes.filter(p => p.unidade === u.id && p.nome).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
      .forEach(p => { if (!pessoas.some(x => chaveNome(x.nome) === chaveNome(p.nome))) pessoas.push({ nome: texto(p.nome, 80), rel: texto(p.parentesco, 40), email: grEmailDe(p.contatos)[0] || '', telefone: grFoneDe(p.contatos), fonte: 'unp', pid: p.id }); });
    return { id: u.id, bloco: u.bloco, andar: u.andar, numero: u.numero, pessoas };
  }).filter(u => u.numero);
}
// grava e-mail/telefone no campo Contatos do cadastro (proprietário: aba Unidades; morador: aba Moradores)
function grSalvarContato(p, email, telefone, conta) {
  if (!p || !p.pid) return false;
  const t = tabela(p.fonte === 'un' ? 'un' : 'unp'), x = linhas(t).find(z => z.id === p.pid); if (!x) return false;
  let c = String(x.contatos || '').trim(); const antes = c;
  if (email && grEmailDe(c).indexOf(email) < 0) { const velho = grEmailDe(c)[0]; c = velho ? c.replace(new RegExp(velho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), email) : (c ? c + ' · ' : '') + email; }
  if (telefone && String(c).replace(/\D/g, '').indexOf(telefone.replace(/\D/g, '')) < 0) c = (c ? c + ' · ' : '') + telefone;
  if (c === antes) return false;
  const upd = { contatos: texto(c, 500) }; if (p.fonte === 'un') { upd.atualizadoEm = agora(); upd.atualizadoPor = conta.nome; }
  gravar(t, upd, x._row); return true;
}
// ---------- Termo automático para as reservas feitas no sistema da administradora ----------
// O e-mail da administradora ("Número da Solicitação", reserva Iniciada) chega na conta do sistema; a cada 15 minutos
// o acionador lê os e-mails, acha a unidade no cadastro e manda ao morador o link do termo com prazo (48 h).
// 24 h antes do fim do prazo vai um lembrete; vencido, a Administração é avisada para decidir o cancelamento.
// Assinado: fica "Termo assinado" (falta confirmar no sistema da administradora); quando chega o e-mail de confirmação
// da administradora (ou a Administração clica em Confirmar), o morador recebe a confirmação.
const GR_AUTO_FUNCAO = 'reservasAutomatico';
const GR_ORIGENS_ADM = ['e-mail', 'PDF', 'colado'];
function grAutoCfg() { const c = comJson('GR_AUTO', {}); return { ativo: !!c.ativo, prazoH: Math.max(6, Math.min(240, Number(c.prazoH) || 48)), lembreteH: Math.max(1, Math.min(120, Number(c.lembreteH) || 24)), ultima: c.ultima || '', resumo: c.resumo || '' }; }
// para a tela: a configuração e, só para a Administração, a conta do Gmail que o Pier lê (a dona do Apps Script)
function grAutoVer(conta) {
  const c = grAutoCfg();
  if (conta && conta.perfil === PERFIL_TOTAL) { try { c.gmail = Session.getEffectiveUser().getEmail() || ''; } catch (e) { c.gmail = ''; } }
  return c;
}
function grAutoSalvar(r, conta) {
  grSoAdm(conta);
  const c = grAutoCfg(), novo = { ativo: !!r.ativo, prazoH: Math.max(6, Math.min(240, parseInt(r.prazoH, 10) || 48)), lembreteH: Math.max(1, Math.min(120, parseInt(r.lembreteH, 10) || 24)), ultima: c.ultima, resumo: c.resumo };
  if (novo.lembreteH >= novo.prazoH) throw falha('O lembrete precisa sair antes do fim do prazo.');
  comProps().setProperty('GR_AUTO', JSON.stringify(novo));
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === GR_AUTO_FUNCAO).forEach(t => ScriptApp.deleteTrigger(t));
  if (novo.ativo) ScriptApp.newTrigger(GR_AUTO_FUNCAO).timeBased().everyMinutes(15).create();
  AUDIT_DET = 'Termo automático das reservas da administradora: ' + (novo.ativo ? 'ligado' : 'desligado') + ' (prazo ' + novo.prazoH + ' h, lembrete ' + novo.lembreteH + ' h antes)';
  return novo.ativo ? 'Envio automático ligado: o sistema confere os e-mails da administradora a cada 15 minutos.' : 'Envio automático desligado.';
}
// acionador de tempo (criado pelo botão na tela; não precisa mexer em Acionadores)
function reservasAutomatico() {
  if (!grAutoCfg().ativo) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try { grAutoRodar({ nome: 'Envio automático', usuario: 'automatico', perfil: PERFIL_TOTAL }); } finally { lock.releaseLock(); }
}
function grAutoRodar(conta) {
  let lidos = '';
  try { lidos = espLerEmails(conta); } catch (e) { lidos = 'e-mails não lidos: ' + texto(e.message, 120); }
  const r = grAutoProcessar();
  const resumo = lidos + ' · ' + r.join(' · ');
  const c = grAutoCfg(); comProps().setProperty('GR_AUTO', JSON.stringify(Object.assign(c, { ultima: agora(), resumo: texto(resumo, 400) })));
  return resumo;
}
// acha a unidade do cadastro pelo bloco/unidade do e-mail da administradora ("BL 03 - BL 03 - CAPRI" / "0103")
function grAcharUnidade(bloco, unidade) {
  const nb = (/BL(?:OCO)?\s*0*(\d+)/i.exec(String(bloco || '')) || /(\d+)/.exec(String(bloco || '')) || [])[1] || '';
  const nu = String(unidade || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!nu) return null;
  return grUnidades().find(u => String(u.numero).replace(/\D/g, '').replace(/^0+/, '') === nu && (!nb || ((/(\d+)/.exec(String(u.bloco)) || [])[1] || '').replace(/^0+/, '') === nb.replace(/^0+/, ''))) || null;
}
function grAdmEmails() {
  const l = []; try { lerUsuarios().lista.forEach(u => { if (u.ativo && u.perfil === PERFIL_TOTAL && emailValido(u.email) && l.indexOf(u.email) < 0) l.push(u.email); }); } catch (e) {}
  if (!l.length) emailsDoSetor('Auxiliar').forEach(e => { if (l.indexOf(e) < 0) l.push(e); });
  return l;
}
function grAvisarAdm(assunto, linhasTxt) {
  const para = grAdmEmails(); if (!para.length) return false;
  try { MailApp.sendEmail({ to: para.join(','), subject: 'Pier Gestão – ' + assunto, body: linhasTxt.join('\n') + '\n\nVeja em Reserva do Espaço Gourmet: ' + GR_SITE, name: 'Pier Gestão' }); return true; } catch (e) { return false; }
}
const grQuando = ms => Utilities.formatDate(new Date(ms), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
const grMs = s => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime() : NaN; };
function grAutoProcessar() {
  const cfg = grAutoCfg(), t = tabela('esr'), agoraMs = Date.now(), h = hoje();
  let enviados = 0, semEmail = 0, lembretes = 0, vencidos = 0, confirmados = 0; const avisoAdm = [];
  linhas(t).forEach(x => {
    if (!/gourmet/i.test(espNome(x.espaco)) || !x.data || x.data <= h) return;
    const daAdm = GR_ORIGENS_ADM.indexOf(x.origem) >= 0;
    // 1) reserva nova da administradora: manda o termo
    if (daAdm && (x.status === 'Solicitada' || x.status === 'Pré-reserva') && !x.termoAvisoEm && !x.termoAssinadoEm) {
      const u = grAcharUnidade(x.bloco, x.unidade);
      const ps = u ? u.pessoas : [];
      const p = (x.solicitante && ps.find(z => chaveNome(z.nome) === chaveNome(x.solicitante) && z.email)) || ps.find(z => z.email);
      if (!p) { gravar(t, { termoAvisoEm: agora(), termoObs: u ? 'Sem e-mail no cadastro da unidade' : 'Unidade não encontrada no cadastro' }, x._row); semEmail++;
        avisoAdm.push('• ' + String(x.data).split('-').reverse().join('/') + ' · ' + (x.bloco || '') + ' ' + (x.unidade || '') + ': ' + (u ? 'sem e-mail no cadastro' : 'unidade não encontrada') + ' — o termo precisa ser assinado na Administração.'); return; }
      const prazoMs = Math.min(agoraMs + cfg.prazoH * 3600000, grMs(x.data) - 3600000);
      const o = { tipoSol: 'Unidade', unidadeId: u.id, solicitante: x.solicitante || p.nome, email: p.email, telefone: p.telefone || '', status: 'Aguardando assinatura', termoPrazo: grQuando(prazoMs), termoAvisoEm: agora(), termoObs: '' };
      if (!x.horario) o.horario = (grEspacoSeguro(x.espaco) || {}).horario || '';
      gravar(t, o, x._row); Object.assign(x, o);
      try { grTermoLink(x, null, { prazo: o.termoPrazo, presencial: true }); enviados++; } catch (e) { gravar(t, { termoObs: 'Falha ao enviar: ' + texto(e.message, 120) }, x._row); }
      return;
    }
    if (x.status === 'Aguardando assinatura' && x.termoPrazo && !x.termoAssinadoEm) {
      const fim = grMs(x.termoPrazo);
      // 2) lembrete antes do fim do prazo
      if (!x.termoLembreteEm && agoraMs >= fim - cfg.lembreteH * 3600000 && agoraMs < fim && x.email) {
        try { grTermoLink(x, null, { prazo: x.termoPrazo, lembrete: true, presencial: GR_ORIGENS_ADM.indexOf(x.origem) >= 0 }); gravar(t, { termoLembreteEm: agora() }, x._row); lembretes++; } catch (e) {}
      }
      // 3) prazo vencido: avisa a Administração uma vez
      if (!x.termoVencidoEm && agoraMs >= fim) {
        gravar(t, { termoVencidoEm: agora() }, x._row); vencidos++;
        avisoAdm.push('• PRAZO VENCIDO: ' + (x.solicitante || '') + ' (' + (x.bloco || '') + ' ' + (x.unidade || '') + ') não assinou o termo da reserva de ' + String(x.data).split('-').reverse().join('/') + '. Decida se cancela no sistema da administradora.');
      }
    }
    // 4) confirmada (pelo e-mail da administradora ou pela Administração): avisa o morador uma vez
    if (x.status === 'Confirmada' && x.termoAssinadoEm && x.email && !x.confAvisoEm) {
      let cfgE = null; try { cfgE = grEspaco(x.espaco); } catch (e) { cfgE = { horario: x.horario, cobranca: 'boleto condominial' }; }
      if (grAvisar(x, '', cfgE)) { gravar(t, { confAvisoEm: agora(), avisoEm: agora() }, x._row); confirmados++; }
    }
  });
  if (avisoAdm.length) grAvisarAdm('Reservas do Espaço Gourmet: atenção ao termo', ['Reservas do Espaço Gourmet que precisam da Administração:', ''].concat(avisoAdm));
  return [enviados + ' termo(s) enviado(s)', lembretes + ' lembrete(s)', vencidos + ' prazo(s) vencido(s)', semEmail + ' sem e-mail', confirmados + ' confirmação(ões) ao morador'];
}
function grEspacoSeguro(nome) { try { return grEspaco(nome); } catch (e) { return null; } }

function grSoAdm(conta) { if (!conta || conta.perfil !== PERFIL_TOTAL) { const e = falha('Só o perfil Administração pode excluir reservas.'); e.negado = true; throw e; } }
function grEspaco(nome) {
  const e = linhas(tabela('esp')).find(x => x.nome === nome && x.ativo !== 'Não');
  if (!e) throw falha('Espaço não encontrado ou inativo.');
  return { e, antecedencia: e.antecedencia === '' || e.antecedencia === undefined ? 7 : Math.max(0, Number(e.antecedencia) || 0), vagas: Math.max(1, Number(e.vagasDia) || 1),
    horario: texto(e.horario, 40) || '00:00 – 23:59', valor: e.valor === '' ? 0 : Number(e.valor) || 0, cobranca: texto(e.cobranca, 80) || 'boleto condominial' };
}
const grRotUn = (bloco, andar, numero) => [bloco ? 'Bloco ' + String(bloco).replace(/^bloco\s*/i, '') : '', andar, numero].filter(Boolean).join(' - ');
function grReservar(r, conta) {
  const v = r.reserva || {}, data = String(v.data || '');
  if (!dataOk(data)) throw falha('Escolha a data no calendário.');
  const cfg = grEspaco(String(v.espaco || ''));
  const minimo = new Date(); minimo.setHours(0, 0, 0, 0); minimo.setDate(minimo.getDate() + cfg.antecedencia);
  if (new Date(data + 'T12:00:00') < minimo) throw falha('Esta data está fora do prazo: é preciso reservar com ' + cfg.antecedencia + ' dia(s) de antecedência.');
  const t = tabela('esr');
  const doDia = linhas(t).filter(x => x.espaco === cfg.e.nome && x.data === data && GR_ATIVAS.indexOf(x.status) >= 0);
  if (doDia.length >= cfg.vagas) throw falha('Esta data já está lotada. Escolha outro dia.');
  const o = { id: novoId('RS'), espaco: cfg.e.nome, data, origem: 'Pier Gestão', obs: texto(v.obs, 300), registradoEm: agora(), registradoPor: conta.nome,
    atualizadoEm: agora(), atualizadoPor: conta.nome, valor: cfg.valor, periodo: 'Dia inteiro', horario: cfg.horario };
  if (v.tipo === 'externo') {
    const nome = texto(v.nome, 80), email = String(v.email || '').trim().toLowerCase(), cpf = String(v.cpf || '').replace(/\D/g, '');
    if (!nome) throw falha('Informe o nome do solicitante externo.');
    if (email && !emailValido(email)) throw falha('E-mail do solicitante inválido.');
    if (cpf && cpf.length !== 11) throw falha('CPF inválido (11 números).');
    Object.assign(o, { tipoSol: 'Externo', solicitante: nome, email, telefone: texto(v.telefone, 30), cpf, status: 'Aguardando assinatura' });
  } else {
    const u = grUnidades().find(x => x.id === String(v.unidade || ''));
    if (!u) throw falha('Escolha a unidade.');
    const p = u.pessoas[Number(v.pessoa)];
    if (!p) throw falha('Escolha o condômino solicitante.');
    const em = String(v.email === undefined ? p.email : v.email || '').trim().toLowerCase(), fone = texto(v.telefone === undefined ? p.telefone : v.telefone, 30);
    if (em && !emailValido(em)) throw falha('E-mail para a confirmação inválido.');
    Object.assign(o, { tipoSol: 'Unidade', unidadeId: u.id, bloco: texto(u.bloco, 60), unidade: texto(u.numero, 20), solicitante: p.nome, email: em, telefone: fone, status: 'Aguardando assinatura' });
    if (v.salvarCadastro && (em !== p.email || (fone && fone !== p.telefone))) o.cadastroAtualizado = grSalvarContato(p, em !== p.email ? em : '', fone !== p.telefone ? fone : '', conta);
    o.andar = u.andar;
  }
  delete o.andar; const cadAt = o.cadastroAtualizado; delete o.cadastroAtualizado;
  gravar(t, o);
  GR_ULTIMA = o.id;
  let env = false;
  if (v.enviarLink && o.email) { try { grTermoLink(linhas(t).find(x => x.id === o.id), conta); env = true; } catch (e) {} }
  AUDIT_DET = 'Reserva do ' + o.espaco + ' em ' + data.split('-').reverse().join('/') + ' para ' + o.solicitante + (o.unidade ? ' (unidade ' + o.unidade + ')' : ' (externo)') + ' · ' + o.status;
  return 'Reserva guardada. Falta o solicitante ler e assinar o termo para confirmar.' + (cadAt ? ' O contato foi salvo no cadastro da unidade.' : '') + (env ? ' Link do termo enviado para ' + o.email + '.' : '');
}
function grAcao(r, conta) {
  const t = tabela('esr'), x = linhas(t).find(z => z.id === String(r.id || ''));
  if (!x) throw falha('Reserva não encontrada. Atualize a tela.');
  let cfg = null; try { cfg = grEspaco(x.espaco); } catch (e) { cfg = { horario: x.horario || '00:00 – 23:59', cobranca: 'boleto condominial' }; }
  const andar = (linhas(tabela('un')).find(u => u.id === x.unidadeId) || {}).andar || '';
  if (r.op === 'excluir') {
    grSoAdm(conta);
    t.sh.deleteRow(x._row);
    AUDIT_DET = 'Excluiu a reserva do ' + x.espaco + ' de ' + (x.solicitante || '—') + ' em ' + String(x.data).split('-').reverse().join('/') + ' (' + x.status + ')' + (r.motivo ? ': ' + texto(r.motivo, 200) : '') + (x.termoArquivo ? '; o termo assinado continua guardado no Drive' : '');
    return 'Reserva excluída. A data ficou livre.';
  }
  if (r.op === 'email') {
    const em = String(r.email || '').trim().toLowerCase(), fone = texto(r.telefone, 30);
    if (em && !emailValido(em)) throw falha('E-mail inválido.');
    gravar(t, { email: em, telefone: fone || x.telefone || '', atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row);
    let cad = false;
    if (r.salvarCadastro && x.unidadeId) { const u = grUnidades().find(z => z.id === x.unidadeId), p = u && u.pessoas.find(z => chaveNome(z.nome) === chaveNome(x.solicitante)); if (p) cad = grSalvarContato(p, em !== p.email ? em : '', fone && fone !== p.telefone ? fone : '', conta); }
    AUDIT_DET = 'Corrigiu o contato da reserva de ' + x.solicitante + ' (' + x.data + ')' + (cad ? ' e o cadastro da unidade' : '');
    return 'Contato da reserva salvo.' + (cad ? ' O cadastro da unidade também foi atualizado.' : '');
  }
  if (r.op === 'enviarTermo') { const m = grTermoLink(x, conta, { prazo: x.termoPrazo && grMs(x.termoPrazo) > Date.now() ? x.termoPrazo : '' }); AUDIT_DET = 'Enviou o link do termo para ' + x.solicitante + ' (' + x.data + ')'; return m; }
  if (r.op === 'pedirTermo') {
    if (['Solicitada', 'Pré-reserva'].indexOf(x.status) < 0 || x.termoAssinadoEm) throw falha('Esta reserva não está esperando o termo.');
    const u = x.unidadeId ? grUnidades().find(z => z.id === x.unidadeId) : grAcharUnidade(x.bloco, x.unidade); if (!u) throw falha('Não achei a unidade ' + (x.bloco || '') + ' ' + (x.unidade || '') + ' no cadastro.');
    const cfgA = grAutoCfg(), prazo = grQuando(Math.min(Date.now() + cfgA.prazoH * 3600000, grMs(x.data) - 3600000));
    const p = (x.solicitante && u.pessoas.find(z => chaveNome(z.nome) === chaveNome(x.solicitante))) || u.pessoas.find(z => z.email) || u.pessoas[0]; if (!p) throw falha('A unidade não tem morador cadastrado.');
    const o = { tipoSol: 'Unidade', unidadeId: u.id, solicitante: x.solicitante || p.nome, email: x.email || p.email || '', status: 'Aguardando assinatura', termoPrazo: prazo, termoAvisoEm: agora(), termoObs: '' };
    gravar(t, o, x._row); Object.assign(x, o);
    let m = 'Reserva passou para Aguardando assinatura (prazo ' + prazo.slice(8, 10) + '/' + prazo.slice(5, 7) + ' ' + prazo.slice(11) + ').';
    if (x.email) { grTermoLink(x, conta, { prazo, presencial: true }); m += ' E-mail enviado para ' + x.email + ' pedindo para assinar o termo na Administração.'; } else m += ' Sem e-mail: assine na tela ou adicione o e-mail.';
    AUDIT_DET = 'Pediu o termo da reserva de ' + (x.solicitante || '') + ' (' + x.data + ')'; return m;
  }
  if (r.op === 'assinar') {
    if (x.status !== 'Aguardando assinatura') throw falha('Esta reserva não está aguardando assinatura.');
    const m = grAssinarAplicar(x, r, 'Tela da Administração', conta); AUDIT_DET = 'Termo do ' + x.espaco + ' assinado na Administração por ' + x.solicitante + ' (' + x.data + ')'; return m;
  }
  if (r.op === 'confirmar') {
    if (x.status === 'Confirmada') throw falha('Esta reserva já está confirmada.');
    if (x.status === 'Aguardando assinatura') throw falha('Falta o solicitante assinar o termo.');
    if (GR_ORIGENS_ADM.indexOf(x.origem) >= 0 && /gourmet/i.test(espNome(x.espaco)) && !x.termoAssinadoEm) throw falha('Falta o termo assinado. Use “Pedir termo” ou assine na tela.');
    if (GR_ATIVAS.indexOf(x.status) < 0) throw falha('Só dá para confirmar uma reserva em aberto.');
    gravar(t, { status: 'Confirmada', atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row); x.status = 'Confirmada';
    const env = grAvisar(x, andar, cfg); if (env) gravar(t, { avisoEm: agora(), confAvisoEm: agora() }, x._row);
    AUDIT_DET = 'Confirmou a reserva de ' + x.solicitante + ' em ' + x.data; return 'Reserva confirmada.' + (env ? ' E-mail enviado para ' + x.email + '.' : '');
  }
  if (r.op === 'cancelar') {
    if (GR_ATIVAS.indexOf(x.status) < 0) throw falha('Esta reserva já não está em aberto.');
    gravar(t, { status: 'Cancelada', obs: texto((x.obs ? x.obs + ' · ' : '') + 'Cancelada: ' + texto(r.motivo, 200), 300), atualizadoEm: agora(), atualizadoPor: conta.nome }, x._row); x.status = 'Cancelada';
    const env = r.avisar ? grAvisar(x, andar, cfg) : false;
    AUDIT_DET = 'Cancelou a reserva de ' + x.solicitante + ' em ' + x.data; return 'Reserva cancelada; a data ficou livre.' + (env ? ' E-mail enviado para ' + x.email + '.' : '');
  }
  if (r.op === 'reenviar') {
    if (!x.email) throw falha('Esta reserva não tem e-mail do solicitante.');
    if (!grAvisar(x, andar, cfg)) throw falha('Não foi possível enviar o e-mail.');
    gravar(t, { avisoEm: agora() }, x._row);
    AUDIT_DET = 'Reenviou o e-mail da reserva de ' + x.solicitante; return 'E-mail reenviado para ' + x.email + '.';
  }
  throw falha('Ação desconhecida.');
}
// ---------- Termo do Espaço Gourmet: ler, assinar e só então confirmar a reserva ----------
// A reserva nasce "Aguardando assinatura" (a data já fica bloqueada). O morador assina na tela da Administração
// ou por um link enviado por e-mail (página pública assinar.html, com um código de uso único que vence no dia da reserva).
// Depois da assinatura: unidade → Confirmada; externo → Pré-reserva (aguardando pagamento). O termo assinado vira PDF no Drive.
const GR_SITE = 'https://piergestao.condominiopier.com.br';
const grHash = t => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
function grValorExtenso(v) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = n => { if (n === 100) return 'cem'; const p = []; if (n >= 100) { p.push(c[Math.floor(n / 100)]); n %= 100; } if (n >= 20) { p.push(d[Math.floor(n / 10)] + (n % 10 ? ' e ' + u[n % 10] : '')); } else if (n) p.push(u[n]); return p.join(' e '); };
  const tudo = n => { if (!n) return 'zero'; const mil = Math.floor(n / 1000), r = n % 1000; return [mil ? (mil === 1 ? 'mil' : ate999(mil) + ' mil') : '', r ? ate999(r) : ''].filter(Boolean).join(r && (r < 100 || r % 100 === 0) ? ' e ' : ' '); };
  const reais = Math.floor(v), cent = Math.round((v - reais) * 100);
  return (tudo(reais) + (reais === 1 ? ' real' : ' reais') + (cent ? ' e ' + tudo(cent) + (cent === 1 ? ' centavo' : ' centavos') : '')).replace(/^./, s => s.toUpperCase());
}
function grTermoDados(x) {
  const un = linhas(tabela('un')).find(u => u.id === x.unidadeId) || {};
  const valor = Number(x.valor) || 0;
  return { reserva: { id: x.id, espaco: x.espaco, data: x.data, horario: x.horario, solicitante: x.solicitante, bloco: x.bloco ? String(x.bloco).replace(/^bloco\s*/i, '') : (x.tipoSol === 'Externo' ? '—' : ''),
      andar: un.andar || '', unidade: x.unidade || (x.tipoSol === 'Externo' ? 'Externo' : ''), valor, valorTxt: 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valorExt: grValorExtenso(valor),
      status: x.status, assinadoEm: x.termoAssinadoEm || '' },
    termo: TERMO_GOURMET, rodape: TERMO_RODAPE, mapa: TERMO_MAPA_B64 };
}
// novo link (o anterior deixa de valer) e e-mail com o botão "Ler e assinar o termo"
function grTermoLink(x, conta, op) {
  op = op || {}; const prazoTxt = op.prazo ? String(op.prazo).slice(8, 10) + '/' + String(op.prazo).slice(5, 7) + ' às ' + String(op.prazo).slice(11, 16) : '';
  if (x.status !== 'Aguardando assinatura') throw falha('Esta reserva não está aguardando assinatura.');
  if (!x.email || !emailValido(x.email)) throw falha('O solicitante não tem e-mail cadastrado. Assine na tela da Administração.');
  if (x.data <= hoje()) throw falha('A data da reserva já chegou: o ' + (op.presencial ? 'aviso' : 'link') + ' não pode mais ser enviado.');
  let link = '';
  if (!op.presencial) { const t = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); gravar(tabela('esr'), { termoHash: grHash(t), termoLinkEm: agora() }, x._row); link = GR_SITE + '/assinar.html#t=' + t; }
  const F = 'font-family:Arial,Helvetica,sans-serif;', h = comH;
  const html = '<div style="background:#f2f5f7;padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d9e1e8;border-radius:12px">'
    + '<tr><td align="center" style="padding:26px 24px 8px"><img src="cid:logo" width="190" alt="Pier Residências" style="display:block;width:190px;max-width:70%;height:auto;border:0"></td></tr>'
    + '<tr><td align="center" style="padding:6px 24px 18px;' + F + 'font-size:13px;font-weight:bold;letter-spacing:.14em;color:' + (op.lembrete ? '#c0392b' : '#c98a0b') + '">' + (op.lembrete ? 'LEMBRETE: FALTA ASSINAR O TERMO' : 'FALTA ASSINAR O TERMO') + '</td></tr>'
    + '<tr><td style="padding:0 30px 10px;' + F + 'font-size:15px;color:#163047;line-height:1.6">Olá, <b>' + h(String(x.solicitante).split(/\s+/)[0]) + '</b>,<br>Sua reserva do <b>' + h(x.espaco) + '</b> para <b>' + h(String(x.data).split('-').reverse().join('/')) + '</b> está guardada. '
    + (op.presencial ? 'Para <b>confirmar</b>, compareça à <b>Administração do condomínio</b> para ler as regras e assinar o Termo de Responsabilidade da reserva.'
      : 'Para <b>confirmar</b>, leia as regras e assine o Termo de Responsabilidade pelo botão abaixo (dá para assinar com o dedo, no celular).')
    + (prazoTxt ? '<div style="margin-top:12px;border-left:4px solid #c0392b;background:#fdf3f2;border-radius:8px;padding:10px 12px"><b>' + (op.presencial ? 'Compareça até ' : 'Assine até ') + prazoTxt + '.</b> Se o termo não for assinado até lá, a reserva poderá ser cancelada pela Administração.</div>' : '') + '</td></tr>'
    + (op.presencial ? '<tr><td style="padding:6px 30px 22px;' + F + 'font-size:12.5px;color:#5b6b7a;line-height:1.5">Leve um documento com foto. Se não for assinado, a reserva não é confirmada.</td></tr>' : '<tr><td align="center" style="padding:14px 30px 22px"><a href="' + link + '" style="display:inline-block;background:#17324d;color:#fff;' + F + 'font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px">Ler e assinar o termo</a></td></tr>'
    + '<tr><td style="padding:0 30px 22px;' + F + 'font-size:12.5px;color:#5b6b7a;line-height:1.5">O link é pessoal e vale até a véspera da reserva. Se não for assinado, a reserva não é confirmada.</td></tr>')
    + '<tr><td style="padding:14px 30px 22px;border-top:1px solid #d9e1e8;' + F + 'font-size:12px;color:#5b6b7a;text-align:center">Administração · Pier Residências · enviado pelo Pier Gestão</td></tr></table></div>';
  MailApp.sendEmail({ to: x.email, subject: (op.lembrete ? 'Lembrete: ' : '') + (op.presencial ? 'Compareça à Administração para assinar o termo da sua reserva – ' : 'Assine o termo para confirmar sua reserva – ') + x.espaco + ' – ' + String(x.data).split('-').reverse().join('/') + (prazoTxt ? ' (prazo: ' + prazoTxt + ')' : ''), htmlBody: html,
    body: op.presencial ? 'Para confirmar sua reserva do ' + x.espaco + ' (' + String(x.data).split('-').reverse().join('/') + '), compareça à Administração do condomínio para assinar o termo' + (prazoTxt ? ' até ' + prazoTxt + ' (senão a reserva poderá ser cancelada)' : '') + '.'
      : 'Para confirmar sua reserva, leia e assine o termo' + (prazoTxt ? ' até ' + prazoTxt + ' (senão a reserva poderá ser cancelada)' : '') + ': ' + link, inlineImages: { logo: lembLogoBlob() }, name: 'Pier Residências' });
  return (op.presencial ? 'Aviso para assinar na Administração enviado para ' : 'Link do termo enviado para ') + x.email + '.';
}
// página pública: abre o termo pelo código do link (sem login)
function grPorToken(t) {
  const tok = String(t || '');
  if (!/^[a-f0-9]{64}$/.test(tok)) throw falha('Link inválido.');
  const h = grHash(tok), x = linhas(tabela('esr')).find(z => z.termoHash && z.termoHash === h);
  if (!x) throw falha('Este link não vale mais. Peça um novo à Administração.');
  return x;
}
function termoVer(r) {
  const x = grPorToken(r.t);
  if (x.status !== 'Aguardando assinatura') throw falha('Esta reserva não está aguardando assinatura.');
  if (x.data <= hoje()) throw falha('O prazo para assinar este termo terminou. Fale com a Administração.');
  return grTermoDados(x);
}
function termoAssinar(r) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw falha('O sistema está ocupado. Tente de novo em alguns segundos.');
  try {
    const x = grPorToken(r.t);
    if (x.status !== 'Aguardando assinatura') throw falha('Esta reserva não está aguardando assinatura.');
    if (x.data <= hoje()) throw falha('O prazo para assinar este termo terminou. Fale com a Administração.');
    const msg = grAssinarAplicar(x, r, 'Link enviado por e-mail', null);
    AUDIT_DET = 'Termo do ' + x.espaco + ' assinado pelo link (' + x.solicitante + ', ' + x.data + ')';
    try { auditar({ usuario: 'link-termo', nome: texto(x.solicitante, 60), perfil: 'Morador' }, 'termoAssinar', AUDIT_DET); } catch (e) {}
    return msg;
  } finally { lock.releaseLock(); }
}
function grAssinarAplicar(x, r, via, conta) {
  const png = String(r.assinatura || '').replace(/^data:image\/png;base64,/, '');
  if (!r.aceite || !r.lido) throw falha('É preciso ler o termo até o fim e marcar que concorda.');
  if (png.length < 800 || png.length > 600000 || !conteudoConfere(png, 'image/png')) throw falha('Faça a assinatura no quadro antes de confirmar.');
  const nome = texto(r.nome, 80) || x.solicitante;
  const quando = agora(), t = tabela('esr'), d = grTermoDados(x);
  // termo assinado: HTML → PDF no Drive (pasta própria, sem compartilhar)
  const html = grTermoHtml(d, { png, nome, quando, via, ua: texto(r.ua, 200), rep: conta ? conta.nome : 'Administração (registro eletrônico)' });
  const pasta = pastaDrive('PASTA_TERMOS_GOURMET', 'Termos do Espaço Gourmet - Pier Gestão');
  const nomeArq = ('Termo ' + x.espaco + ' ' + x.data + ' - ' + nome).replace(/[\\/:*?"<>|]/g, '_');
  let arq;
  try { arq = pasta.createFile(Utilities.newBlob(html, 'text/html', nomeArq + '.html').getAs('application/pdf').setName(nomeArq + '.pdf')); }
  catch (e) { arq = pasta.createFile(Utilities.newBlob(html, 'text/html', nomeArq + '.html')); }
  const daAdm = GR_ORIGENS_ADM.indexOf(x.origem) >= 0;
  const novo = daAdm ? 'Termo assinado' : x.tipoSol === 'Externo' ? 'Pré-reserva' : 'Confirmada';
  gravar(t, { status: novo, termoAssinadoEm: quando, termoNome: nome, termoVia: via + (conta ? ' (' + conta.nome + ')' : ''), termoArquivo: arq.getId(), termoHash: '', atualizadoEm: quando, atualizadoPor: conta ? conta.nome : 'Assinatura pelo link' }, x._row);
  x.status = novo;
  let cfg = null; try { cfg = grEspaco(x.espaco); } catch (e) { cfg = { horario: x.horario, cobranca: 'boleto condominial' }; }
  const env = grAvisar(x, d.reserva.andar, cfg, arq);
  if (env) gravar(t, { avisoEm: agora() }, x._row);
  if (daAdm) grAvisarAdm('Termo assinado: confirme a reserva na administradora', ['O termo da reserva do ' + x.espaco + ' de ' + String(x.data).split('-').reverse().join('/') + ' foi assinado por ' + nome + ' (' + (x.bloco || '') + ' ' + (x.unidade || '') + ')' + (x.solicitacao ? ', solicitação ' + x.solicitacao : '') + '.', 'Falta confirmar a reserva no sistema da administradora. Quando chegar o e-mail de confirmação (ou ao clicar em Confirmar no Pier Gestão), o morador recebe a confirmação.']);
  return (novo === 'Confirmada' ? 'Termo assinado e reserva confirmada.' : novo === 'Termo assinado' ? 'Termo assinado! A Administração vai confirmar a sua reserva e você receberá a confirmação por e-mail.' : 'Termo assinado. A reserva fica aguardando o pagamento.') + (env ? ' Enviamos uma cópia do termo para ' + x.email + '.' : '');
}
function grTermoHtml(d, a) {
  const r = d.reserva, h = comH;
  const rep = s => s.replace(/\{NOME\}/g, '<u>' + h(a ? a.nome : r.solicitante) + '</u>').replace(/\{BLOCO\}/g, '<u>' + h(r.bloco || '—') + '</u>').replace(/\{UNIDADE\}/g, '<u>' + h(r.unidade || '—') + '</u>')
    .replace(/\{DATA\}/g, '<u>' + h(String(r.data).split('-').reverse().join('/')) + '</u>').replace(/\{VALOR\}/g, h(r.valorTxt)).replace(/\{VALOR_EXT\}/g, h(r.valorExt));
  const corpo = d.termo.map(l => l === '@mapa' ? '<p style="text-align:center"><img src="data:image/jpeg;base64,' + d.mapa + '" style="width:100%;max-width:640px"></p>'
    : /^# /.test(l) ? '<h2>' + h(l.slice(2)) + '</h2>' : /^! /.test(l) ? '<p class="dec">' + rep(h(l.slice(2))) + '</p>'
    : /^[a-h]\. /.test(l) ? '<p class="sub">' + rep(h(l)) + '</p>' : '<p>' + rep(h(l)) + '</p>').join('');
  return '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:10.5pt;color:#111;line-height:1.4}h1{font-size:14pt;text-align:center;margin:0 0 6px}h2{font-size:11pt;margin:14px 0 6px}'
    + 'p{margin:4px 0}.sub{margin-left:22px}.dec{font-weight:bold}.cab td{padding:2px 6px}.ass{margin-top:18px;width:100%}.ass td{vertical-align:bottom;width:50%;padding:6px}.ass img{height:70px}.lin{border-top:1px solid #111;padding-top:4px;font-size:9.5pt}.rod{margin-top:16px;font-size:8.5pt;color:#555;text-align:center;border-top:1px solid #999;padding-top:6px}.reg{font-size:8.5pt;color:#555;margin-top:8px}</style></head><body>'
    + '<h1>TERMO DE RESPONSABILIDADE PARA RESERVA<br>E USO DO ESPAÇO GOURMET</h1>'
    + '<table class="cab"><tr><td><b>DATA DA RESERVA:</b> ' + h(String(r.data).split('-').reverse().join('/')) + '</td><td><b>NOME DO MORADOR:</b> ' + h(a ? a.nome : r.solicitante) + '</td><td><b>BLOCO / APT:</b> ' + h((r.bloco || '—') + ' / ' + (r.unidade || '—')) + '</td></tr></table>'
    + corpo
    + (a ? '<p>Rio de Janeiro, ' + h(a.quando.slice(8, 10) + '/' + a.quando.slice(5, 7) + '/' + a.quando.slice(0, 4)) + '.</p>'
      + '<table class="ass"><tr><td><img src="data:image/png;base64,' + a.png + '"><div class="lin">Assinatura do Morador<br>Nome: ' + h(a.nome) + '<br>Bloco/Apt: ' + h((r.bloco || '—') + ' / ' + (r.unidade || '—')) + '</div></td>'
      + '<td><div class="lin">Representante do Condomínio<br>Nome: ' + h(a.rep) + '<br>Cargo: Administração</div></td></tr></table>'
      + '<p class="reg">Assinado eletronicamente em ' + h(a.quando) + ' · via ' + h(a.via) + (a.ua ? ' · aparelho: ' + h(a.ua) : '') + ' · Pier Gestão</p>' : '')
    + '<div class="rod">' + h(d.rodape) + '</div></body></html>';
}
function grTermoPdf(r) {
  const x = linhas(tabela('esr')).find(z => z.id === String(r.id || ''));
  if (!x || !x.termoArquivo) throw falha('Esta reserva não tem termo assinado.');
  let f; try { f = DriveApp.getFileById(String(x.termoArquivo)); } catch (e) { throw falha('O termo assinado não foi encontrado no Drive.'); }
  const b = f.getBlob();
  return { nome: f.getName(), mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()) };
}

// e-mail de confirmação (mesmo visual do comunicado: logo do Pier, faixa de situação e quadro com os dados)
function grEmailHtml(x, andar, cfg, previa) {
  const h = comH, F = 'font-family:Arial,Helvetica,sans-serif;';
  const st = x.status === 'Confirmada' ? ['RESERVA CONFIRMADA', '#2e7d4f'] : x.status === 'Cancelada' ? ['RESERVA CANCELADA', '#c0392b'] : x.status === 'Termo assinado' ? ['TERMO ASSINADO', '#397d9d'] : ['AGUARDANDO PAGAMENTO', '#c98a0b'];
  const linha = (k, v, forte) => '<tr><td style="padding:9px 0;color:#5b6b7a;' + F + 'font-size:14px;vertical-align:top">' + k + '</td><td style="padding:9px 0;text-align:right;' + F + 'font-size:14px;color:#17324d;' + (forte ? 'font-weight:bold;font-size:17px;color:#397d9d' : 'font-weight:bold') + '">' + v + '</td></tr>';
  const unid = x.unidade ? h(grRotUn(x.bloco, andar, x.unidade)) + ' · ' : '';
  const valor = 'R$ ' + Number(x.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pg = x.status === 'Cancelada' ? 'Esta reserva foi <b>cancelada</b> e a data ficou livre. Em caso de dúvida, fale com a Administração.'
    : x.status === 'Termo assinado' ? 'Recebemos o seu termo assinado (cópia em anexo). A Administração vai <b>confirmar a reserva</b> e você receberá outro e-mail com a confirmação.'
    : x.tipoSol === 'Externo' && x.status !== 'Confirmada' ? 'A data fica <b>bloqueada</b> para você até a Administração confirmar o pagamento de <b>' + valor + '</b>.'
    : 'O valor de <b>' + valor + '</b> será incluído e cobrado no <b>próximo ' + h(cfg.cobranca || 'boleto condominial') + '</b>.';
  return '<div style="background:#f2f5f7;padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e8;border-radius:12px">'
    + '<tr><td align="center" style="padding:26px 24px 8px"><img src="' + (previa ? 'data:image/png;base64,' + LEMB_LOGO_B64 : 'cid:logo') + '" width="190" alt="Pier Residências" style="display:block;width:190px;max-width:70%;height:auto;border:0"></td></tr>'
    + '<tr><td align="center" style="padding:6px 24px 18px;' + F + 'font-size:13px;font-weight:bold;letter-spacing:.14em;color:' + st[1] + '">' + st[0] + '</td></tr>'
    + '<tr><td style="padding:0 30px"><div style="border-top:2px solid ' + st[1] + ';height:0;line-height:0">&nbsp;</div></td></tr>'
    + '<tr><td style="padding:20px 30px 6px;' + F + 'font-size:15px;color:#163047;line-height:1.6">Olá, <b>' + h(String(x.solicitante || '').split(/\s+/)[0]) + '</b>,<br>'
    + (x.status === 'Cancelada' ? 'Sua reserva no <b>Pier Residências</b> foi cancelada.' : 'Sua reserva no <b>Pier Residências</b> foi registrada com sucesso.') + '</td></tr>'
    + '<tr><td style="padding:10px 30px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9e1e8;border-radius:10px;padding:6px 16px;background:#f7fafc">'
    + linha('Espaço', h(x.espaco)) + linha('Data', h(String(x.data).split('-').reverse().join('/'))) + linha('Horário', h(x.horario || cfg.horario || '00:00 – 23:59'))
    + linha('Unidade / solicitante', unid + h(x.solicitante)) + linha('Valor', valor, true) + linha('Situação', h(x.status === 'Pré-reserva' ? 'Aguardando pagamento' : x.status === 'Confirmada' ? 'Reserva confirmada' : x.status === 'Termo assinado' ? 'Termo assinado, aguardando confirmação' : x.status))
    + '</table></td></tr>'
    + '<tr><td style="padding:10px 30px 22px"><div style="border-left:4px solid ' + st[1] + ';background:#f7fafc;border-radius:8px;padding:12px 14px;' + F + 'font-size:14px;color:#163047;line-height:1.55">' + pg + '</div></td></tr>'
    + '<tr><td style="padding:14px 30px 22px;border-top:1px solid #d9e1e8;' + F + 'font-size:12px;color:#5b6b7a;text-align:center">Administração · Pier Residências · enviado pelo Pier Gestão<br>Não responda esta mensagem. Em caso de dúvidas, fale com a Administração do condomínio.</td></tr>'
    + '</table></div>';
}
function grAvisar(x, andar, cfg, termoArq) {
  if (!x.email || !emailValido(x.email)) return false;
  try {
    const assunto = (x.status === 'Cancelada' ? 'Reserva cancelada' : x.status === 'Confirmada' ? 'Reserva confirmada' : x.status === 'Termo assinado' ? 'Termo assinado recebido' : 'Pré-reserva registrada') + ' – ' + x.espaco + ' – ' + String(x.data).split('-').reverse().join('/');
    let anexos = []; try { const id = termoArq ? termoArq.getId() : x.termoArquivo; if (id && x.status !== 'Cancelada') anexos = [DriveApp.getFileById(String(id)).getBlob()]; } catch (e) {}
    MailApp.sendEmail({ to: x.email, subject: assunto, htmlBody: grEmailHtml(x, andar, cfg, false), inlineImages: { logo: lembLogoBlob() }, attachments: anexos, name: 'Pier Residências',
      body: assunto + '\nSolicitante: ' + x.solicitante + '\nHorário: ' + (x.horario || '') + '\nValor: R$ ' + Number(x.valor || 0).toFixed(2).replace('.', ',') });
    return true;
  } catch (e) { return false; }
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
  const o = { antecedencia: v.antecedencia === undefined ? undefined : String(Math.max(0, Math.min(365, parseInt(v.antecedencia, 10) || 0))), vagasDia: v.vagasDia === undefined ? undefined : String(Math.max(1, Math.min(20, parseInt(v.vagasDia, 10) || 1))), cobranca: v.cobranca === undefined ? undefined : texto(v.cobranca, 80),
    nome, valor: tv === '' ? '' : Math.round(val * 100) / 100, capacidade: texto(v.capacidade, 20), horario: texto(v.horario, 60), regras: texto(v.regras, 3000), itens: JSON.stringify(itens), ativo: v.ativo === false ? 'Não' : 'Sim' };
  Object.keys(o).forEach(k => { if (o[k] === undefined) delete o[k]; });
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
  const f = pastaRondas().createFile(blobConferido(b64, 'image/jpeg', nome));
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
    if (!Number.isFinite(qtd) || !(qtd >= 0)) throw falha('Linha ' + (k + 1) + ' (' + nome + '): quantidade inválida.');
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
  const protecaoErro = protegerSoDono(copia, 'Cópia de segurança do Pier Gestão: não editar');
  if (protecaoErro) throw falha('Não foi possível proteger a cópia de segurança. A importação foi interrompida antes de alterar o cadastro.');

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
  const limpeza = garantirLimpeza() + garantirSindico() + garantirGerente() + garantirPorteiro();
  abaEmails();
  garantirLinhaEmail('Segurança');
  Logger.log('Acionadores do projeto: ' + ScriptApp.getProjectTriggers().length + ' (a permissão para os lembretes automáticos fica autorizada).');
  Logger.log('E-mail: ' + MailApp.getRemainingDailyQuota() + ' envios disponíveis hoje (a permissão de enviar e-mail fica autorizada).');
  const senhas = migrarSenhas();
  garantirColunaProvisoria();
  protegerAbas();
  const arquivos = verificarArquivos();
  Logger.log('Pronto: pastas de fotos e de notas fiscais, abas OS, Demandas, Preventivas, Pendencias e Emails, setores e permissões verificadas.' + limpeza);
  Logger.log('Segurança: ' + senhas + ' ' + arquivos);
}

// ---------- lembrete das pendências por e-mail (segunda e quinta, 9h) ----------
// Cada responsável (Auxiliar, Supervisor, Gerência…) recebe só as pendências em aberto que estão com ele; o síndico recebe o resumo geral.
// Os endereços vêm da aba Emails e do e-mail cadastrado em Usuários (perfil com o mesmo nome do responsável).
const LEMB_HORA = 9, LEMB_FUNCAO = 'lembretePendencias';
const LEMB_CRIT = { Alta: 0, 'Média': 1, Baixa: 2 };
function lembAberta(p, hj) {
  if (p.status === 'Concluído' || p.status === 'Cancelado') return false;
  if (p.tipo === 'Constante') return !!p.prazo && String(p.prazo).slice(0, 10) <= hj; // tarefa constante: só quando a execução está vencida
  return true;
}
const lembPrazo = p => String((p.tipo !== 'Constante' && p.prazoAtualizado) || p.prazo || '').slice(0, 10);
function lembDados() {
  const hj = hoje(), grupos = {}, semResp = [];
  linhas(tabela('pend')).filter(p => lembAberta(p, hj)).forEach(p => {
    const r = String(p.responsavel || '').trim();
    if (!r) { semResp.push(p); return; }
    (grupos[r] = grupos[r] || []).push(p);
  });
  const ordem = (a, b) => {
    const pa = lembPrazo(a), pb = lembPrazo(b), la = !!pa && pa < hj, lb = !!pb && pb < hj;
    if (la !== lb) return la ? -1 : 1;
    const ca = LEMB_CRIT[a.criticidade] ?? 3, cb = LEMB_CRIT[b.criticidade] ?? 3;
    if (ca !== cb) return ca - cb;
    return (pa || '9999') < (pb || '9999') ? -1 : (pa || '9999') > (pb || '9999') ? 1 : 0;
  };
  Object.keys(grupos).forEach(k => grupos[k].sort(ordem));
  return { hj, grupos, semResp };
}
function lembLinha(p, hj) {
  const dt = d => String(d).split('-').reverse().join('/');
  const pz = lembPrazo(p), dias = pz ? Math.round((Date.parse(hj + 'T12:00:00') - Date.parse(pz + 'T12:00:00')) / 864e5) : 0;
  const partes = [(p.numero ? 'Nº ' + p.numero + ' – ' : '') + String(p.titulo).slice(0, 140)];
  if (p.criticidade) partes.push('criticidade ' + p.criticidade.toLowerCase());
  if (pz) partes.push((p.tipo === 'Constante' ? 'execução ' : 'prazo ') + dt(pz) + (dias > 0 ? ' (ATRASADA há ' + dias + ' dia' + (dias === 1 ? '' : 's') + ')' : dias === 0 ? ' (vence hoje)' : ''));
  else partes.push('sem prazo');
  partes.push(String(p.status || 'Pendente').toLowerCase());
  if (pendAguardando(p)) partes.push('aguardando aprovação');
  return ' • ' + partes.join(' · ') + (String(p.obs || '').trim() ? '\n     Obs.: ' + String(p.obs).trim().replace(/\s+/g, ' ').slice(0, 200) : '');
}
// ----- personalização do e-mail (tela Lembretes por e-mail): textos e o que mostrar -----
const LEMB_CFG_PADRAO = {
  abertura: 'Olá, {responsavel}! Estas são as pendências em aberto com você no Controle de pendências do Pier Gestão ({total} no total, {atrasadas} atrasada(s)).',
  fechamento: 'Por favor, atualize a situação no sistema assim que houver novidade.',
  assinatura: 'Administração – Condomínio Residencial Pier',
  agrupar: true, obs: true, crit: true, prazo: true
};
function lembCfg() {
  let c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty('LEMB_CFG') || '{}') || {}; } catch (e) { c = {}; }
  const o = Object.assign({}, LEMB_CFG_PADRAO);
  ['abertura', 'fechamento', 'assinatura'].forEach(k => { if (typeof c[k] === 'string') o[k] = c[k]; });
  ['agrupar', 'obs', 'crit', 'prazo'].forEach(k => { if (typeof c[k] === 'boolean') o[k] = c[k]; });
  return o;
}
function lembSalvarCfg(v) {
  const o = {};
  ['abertura', 'fechamento', 'assinatura'].forEach(k => { o[k] = String(v[k] == null ? '' : v[k]).slice(0, 1500); });
  ['agrupar', 'obs', 'crit', 'prazo'].forEach(k => { o[k] = v[k] !== false; });
  PropertiesService.getScriptProperties().setProperty('LEMB_CFG', JSON.stringify(o));
  return o;
}
// logo do condomínio (PNG pequeno) para o topo dos e-mails: vai junto da mensagem (cid:logo), sem depender de link externo
const LEMB_LOGO_B64 = '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';
const lembLogoBlob = () => Utilities.newBlob(Utilities.base64Decode(LEMB_LOGO_B64), 'image/png', 'logo-pier.png');
const lembH = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lembTxtHtml = s => lembH(s).replace(/\n/g, '<br>');
const lembDt = d => String(d).split('-').reverse().join('/');
const lembAtras = (p, hj) => { const pz = lembPrazo(p); return pz && pz < hj ? Math.round((Date.parse(hj + 'T12:00:00') - Date.parse(pz + 'T12:00:00')) / 864e5) : 0; };
const LEMB_ORDEM_ST = ['Em andamento', 'Pendente', 'A cotar', 'Aguardando entrega', 'Aguardando síndico'];
const lembPlural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
function lembTrocar(t, x) { return String(t || '').replace(/\{(\w+)\}/g, (m, k) => (k in x ? x[k] : m)); }
// blocos da lista: atrasadas primeiro e depois por situação (ou um bloco só)
function lembBlocos(lista, hj, cfg) {
  if (!cfg.agrupar) return [{ tit: '', l: lista }];
  const atr = lista.filter(p => lembAtras(p, hj) > 0), resto = lista.filter(p => !lembAtras(p, hj));
  const sts = LEMB_ORDEM_ST.concat([...new Set(resto.map(p => p.status || 'Pendente'))].filter(s => LEMB_ORDEM_ST.indexOf(s) < 0));
  const out = atr.length ? [{ tit: 'Atrasadas', l: atr, cor: '#b42318' }] : [];
  sts.forEach(st => { const l = resto.filter(p => (p.status || 'Pendente') === st); if (l.length) out.push({ tit: st, l }); });
  return out;
}
// tabela de um bloco (HTML com estilos na própria tag, como os programas de e-mail exigem)
function lembTabela(lista, hj, cfg, comSt) {
  const th = 'style="text-align:left;padding:8px 10px;font-size:12px;color:#5b6b7a;border-bottom:2px solid #d6e0e8;font-weight:600"';
  const td = 'style="padding:8px 10px;border-bottom:1px solid #e6edf2;vertical-align:top;font-size:14px;color:#16283a"';
  const corCrit = { Alta: ['#fde8e8', '#b42318'], 'Média': ['#fff4e0', '#a15c00'], Baixa: ['#e6f4ea', '#1e7b3c'] };
  const pill = (t, bg, fg) => '<span style="display:inline-block;padding:2px 8px;border-radius:10px;background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:600;white-space:nowrap">' + lembH(t) + '</span>';
  const linhas = lista.map(p => {
    const a = lembAtras(p, hj), pz = lembPrazo(p);
    let h = '<tr><td ' + td + ' width="40"><b>' + lembH(p.numero || '—') + '</b></td><td ' + td + '>' + lembH(p.titulo)
      + (pendAguardando(p) ? ' ' + pill('aguardando aprovação', '#eef2ff', '#3949ab') : '')
      + (cfg.obs && String(p.obs || '').trim() ? '<div style="color:#5b6b7a;font-size:12px;margin-top:3px">' + lembTxtHtml(String(p.obs).trim().slice(0, 300)) + '</div>' : '') + '</td>';
    if (cfg.crit) h += '<td ' + td + '>' + (p.criticidade ? pill(p.criticidade, (corCrit[p.criticidade] || ['#eef1f4', '#41505e'])[0], (corCrit[p.criticidade] || ['#eef1f4', '#41505e'])[1]) : '<span style="color:#9aa8b5">—</span>') + '</td>';
    if (cfg.prazo) h += '<td ' + td.replace('vertical-align:top;', 'vertical-align:top;white-space:nowrap;') + '>' + (pz ? (a ? '<b style="color:#b42318">' + lembDt(pz) + '</b><div style="color:#b42318;font-size:12px">atrasada há ' + lembPlural(a, 'dia', 'dias') + '</div>' : lembDt(pz) + (pz === hj ? '<div style="color:#a15c00;font-size:12px">vence hoje</div>' : '')) : '<span style="color:#9aa8b5">sem prazo</span>') + '</td>';
    if (comSt) h += '<td ' + td + '>' + lembH(p.status || 'Pendente') + '</td>';
    return h + '</tr>';
  }).join('');
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 18px">'
    + '<tr><th ' + th + ' width="44">Nº</th><th ' + th + '>Pendência</th>' + (cfg.crit ? '<th ' + th + ' width="100">Criticidade</th>' : '') + (cfg.prazo ? '<th ' + th + ' width="130">Prazo</th>' : '') + (comSt ? '<th ' + th + ' width="140">Situação</th>' : '') + '</tr>'
    + linhas + '</table>';
}
function lembHtmlLista(lista, hj, cfg) {
  return lembBlocos(lista, hj, cfg).map(b => (b.tit ? '<h3 style="margin:18px 0 6px;font-size:15px;color:' + (b.cor || '#17324d') + '">' + lembH(b.tit) + ' (' + b.l.length + ')</h3>' : '') + lembTabela(b.l, hj, cfg, !cfg.agrupar || b.tit === 'Atrasadas')).join('');
}
// logo: 'cid:logo' no e-mail enviado; na prévia da tela, a imagem embutida (data:)
function lembMoldura(titulo, sub, miolo, cfg, logo) {
  const src = logo || 'cid:logo';
  return '<div style="background:#eef3f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">'
    + '<div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #d6e0e8">'
    + '<div style="background:#ffffff;padding:16px 24px 10px;text-align:center;border-bottom:1px solid #e6edf2"><img src="' + src + '" width="220" alt="Pier Residências" style="display:inline-block;width:220px;max-width:70%;height:auto;border:0"></div>'
    + '<div style="background:#17324d;color:#ffffff;padding:18px 24px"><div style="font-size:12px;letter-spacing:2px;opacity:.8">PIER GESTÃO</div><div style="font-size:20px;font-weight:700;margin-top:4px">' + lembH(titulo) + '</div>' + (sub ? '<div style="font-size:13px;opacity:.85;margin-top:4px">' + lembH(sub) + '</div>' : '') + '</div>'
    + '<div style="padding:20px 24px">' + miolo
    + (cfg.fechamento ? '<p style="font-size:14px;color:#16283a;margin:8px 0 14px">' + lembTxtHtml(cfg.fechamento) + '</p>' : '')
    + (cfg.assinatura ? '<p style="font-size:14px;color:#16283a;margin:0 0 6px">' + lembTxtHtml(cfg.assinatura) + '</p>' : '')
    + '</div><div style="background:#f5f8fa;color:#7a8a99;font-size:11px;padding:12px 24px;border-top:1px solid #e6edf2">Veja e atualize em: Pier Gestão → Administração → Pendências e compras → Controle de pendências. Mensagem automática (toda segunda e quinta); não responda este e-mail.</div>'
    + '</div></div>';
}
// e-mail de um responsável: assunto, texto simples (para programas sem HTML) e HTML
function lembEmailResp(resp, lista, hj, cfg, logo) {
  const atras = lista.filter(p => lembAtras(p, hj) > 0).length;
  const x = { responsavel: resp, total: lista.length, atrasadas: atras, data: lembDt(hj) };
  const abertura = lembTrocar(cfg.abertura, x);
  const html = lembMoldura('Pendências de ' + resp, lembDt(hj) + ' · ' + lembPlural(lista.length, 'em aberto', 'em aberto') + (atras ? ' · ' + lembPlural(atras, 'atrasada', 'atrasadas') : ''),
    (abertura ? '<p style="font-size:14px;color:#16283a;margin:0 0 14px">' + lembTxtHtml(abertura) + '</p>' : '') + lembHtmlLista(lista, hj, cfg), cfg, logo);
  const texto = [abertura, ''].concat(lista.map(p => lembLinha(p, hj)), ['', lembTrocar(cfg.fechamento, x), '', cfg.assinatura]).join('\n');
  return { assunto: 'Pier Gestão – pendências de ' + resp + ': ' + lista.length + ' em aberto' + (atras ? ', ' + atras + ' atrasada' + (atras === 1 ? '' : 's') : ''), texto, html };
}
function lembEmailSindico(d, semEmail, cfg, logo) {
  const total = Object.keys(d.grupos).reduce((s, k) => s + d.grupos[k].length, 0) + d.semResp.length;
  const resps = Object.keys(d.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const resumoTab = '<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 16px">' + resps.map(r => {
    const l = d.grupos[r], a = l.filter(p => lembAtras(p, d.hj) > 0).length;
    return '<tr><td style="padding:4px 14px 4px 0;font-size:14px"><b>' + lembH(r) + '</b></td><td style="padding:4px 14px 4px 0;font-size:14px">' + lembPlural(l.length, 'em aberto', 'em aberto') + '</td><td style="padding:4px 0;font-size:14px;color:' + (a ? '#b42318' : '#1e7b3c') + '">' + (a ? lembPlural(a, 'atrasada', 'atrasadas') : 'em dia') + (semEmail.indexOf(r) >= 0 ? ' <span style="color:#a15c00">· sem e-mail cadastrado</span>' : '') + '</td></tr>';
  }).join('') + (d.semResp.length ? '<tr><td style="padding:4px 14px 4px 0;font-size:14px"><b>Sem responsável</b></td><td colspan="2" style="font-size:14px">' + d.semResp.length + '</td></tr>' : '') + '</table>';
  const secoes = resps.map(r => '<h2 style="margin:22px 0 4px;font-size:17px;color:#17324d;border-bottom:2px solid #17324d;padding-bottom:4px">' + lembH(r) + '</h2>' + lembHtmlLista(d.grupos[r], d.hj, cfg)).join('')
    + (d.semResp.length ? '<h2 style="margin:22px 0 4px;font-size:17px;color:#17324d;border-bottom:2px solid #17324d;padding-bottom:4px">Sem responsável</h2>' + lembHtmlLista(d.semResp, d.hj, cfg) : '');
  const html = lembMoldura('Resumo das pendências por responsável', lembDt(d.hj) + ' · ' + total + ' em aberto',
    '<p style="font-size:14px;color:#16283a;margin:0 0 12px">Resumo das pendências em aberto. Os responsáveis com e-mail cadastrado receberam hoje a lista deles.</p>' + resumoTab + secoes, cfg, logo);
  const texto = ['Resumo das pendências em aberto por responsável (' + total + ' no total).', ''].concat(resps.map(r => [r.toUpperCase() + ' — ' + d.grupos[r].length + ' em aberto' + (semEmail.indexOf(r) >= 0 ? ' (sem e-mail cadastrado)' : '')].concat(d.grupos[r].map(p => lembLinha(p, d.hj))).join('\n')), d.semResp.length ? ['SEM RESPONSÁVEL — ' + d.semResp.length].concat(d.semResp.map(p => lembLinha(p, d.hj))).join('\n') : [], ['', cfg.assinatura]).join('\n\n');
  return { assunto: 'Pier Gestão – resumo das pendências por responsável (' + total + ' em aberto)', texto, html };
}
// envia os lembretes; devolve um resumo do que saiu (para a tela e para o registro)
function lembEnviar(forcado) {
  const props = PropertiesService.getScriptProperties(), d = lembDados(), cfg = lembCfg();
  if (!forcado && props.getProperty('LEMB_PEND_DIA') === d.hj) return { enviados: 0, msg: 'Os lembretes de hoje já foram enviados.' };
  const sind = emailsDoSetor('Síndico'), enviados = [], semEmail = [];
  Object.keys(d.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(resp => {
    const lista = d.grupos[resp];
    const dest = emailsDoSetor(resp).filter(e => sind.indexOf(e) < 0); // o síndico já recebe tudo no resumo
    if (!dest.length) { if (!emailsDoSetor(resp).length) semEmail.push(resp); return; }
    const m = lembEmailResp(resp, lista, d.hj, cfg);
    try {
      MailApp.sendEmail({ to: dest.join(','), subject: m.assunto, body: m.texto, htmlBody: m.html, inlineImages: { logo: lembLogoBlob() }, name: 'Pier Gestão' });
      enviados.push(resp + ' (' + lista.length + ')');
    } catch (e) { Logger.log('Lembrete de ' + resp + ' não enviado: ' + e.message); }
  });
  let resumo = '';
  if (sind.length) {
    const m = lembEmailSindico(d, semEmail, cfg);
    try {
      MailApp.sendEmail({ to: sind.join(','), subject: m.assunto, body: m.texto, htmlBody: m.html, inlineImages: { logo: lembLogoBlob() }, name: 'Pier Gestão' });
      resumo = ' Resumo enviado ao síndico.';
    } catch (e) { Logger.log('Resumo ao síndico não enviado: ' + e.message); }
  }
  if (!forcado) props.setProperty('LEMB_PEND_DIA', d.hj); // o envio manual não impede o automático do dia
  props.setProperty('LEMB_PEND_ULTIMO', agora() + ' · ' + (enviados.length ? enviados.join(', ') : 'nenhum responsável') + (resumo ? ' · resumo ao síndico' : ''));
  return { enviados: enviados.length, msg: (enviados.length ? 'Lembretes enviados: ' + enviados.join(', ') + '.' : 'Nenhum responsável com e-mail para receber.') + resumo + (semEmail.length ? ' Sem e-mail cadastrado: ' + semEmail.join(', ') + '.' : '') };
}
// chamada pelo acionador de tempo (segunda e quinta, 9h)
function lembretePendencias() {
  const dia = new Date().getDay();
  if (dia !== 1 && dia !== 4) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try { lembEnviar(false); } finally { lock.releaseLock(); }
}
function lembAtivo() { return ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === LEMB_FUNCAO); }
function pendLembretesAcao(op, conta, req) {
  if (op === 'config') { lembSalvarCfg((req && req.cfg) || {}); return Object.assign(lembStatus(), { msg: 'Texto e formato do e-mail salvos.' }); }
  if (op === 'previa') {
    const d = lembDados(), cfg = req && req.cfg ? Object.assign(lembCfg(), req.cfg) : lembCfg(), resp = String((req && req.resp) || '');
    const logo = 'data:image/png;base64,' + LEMB_LOGO_B64;
    if (resp === '__sindico') return { previa: lembEmailSindico(d, [], cfg, logo) };
    const r = d.grupos[resp] ? resp : Object.keys(d.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'))[0];
    if (!r) throw falha('Não há pendências em aberto com responsável para mostrar a prévia.');
    return { previa: Object.assign(lembEmailResp(r, d.grupos[r], d.hj, cfg, logo), { resp: r }) };
  }
  if (op === 'ativar' || op === 'desativar') {
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === LEMB_FUNCAO).forEach(t => ScriptApp.deleteTrigger(t));
    if (op === 'ativar') [ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.THURSDAY].forEach(dia => ScriptApp.newTrigger(LEMB_FUNCAO).timeBased().onWeekDay(dia).atHour(LEMB_HORA).create());
  } else if (op === 'enviar') {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw falha('Sistema ocupado. Tente de novo em instantes.');
    let r; try { r = lembEnviar(true); } finally { lock.releaseLock(); }
    return Object.assign(lembStatus(), { msg: r.msg });
  } else if (op !== 'status') throw falha('Operação inválida.');
  return Object.assign(lembStatus(), op === 'status' ? {} : { msg: op === 'ativar' ? 'Lembretes ativados: toda segunda e quinta, a partir das 9h.' : 'Lembretes desativados.' });
}
function lembStatus() {
  const d = lembDados(), sind = emailsDoSetor('Síndico');
  return { lembretes: {
    ativo: lembAtivo(), ultimo: PropertiesService.getScriptProperties().getProperty('LEMB_PEND_ULTIMO') || '',
    previa: Object.keys(d.grupos).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(resp => ({ resp, n: d.grupos[resp].length,
      atrasadas: d.grupos[resp].filter(p => { const pz = lembPrazo(p); return pz && pz < d.hj; }).length, emails: emailsDoSetor(resp).length })),
    semResp: d.semResp.length, sindico: sind.length, cfg: lembCfg() } };
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
const PEND_STATUS = ['Pendente', 'A cotar', 'Em andamento', 'Aguardando entrega', 'Aguardando síndico', 'Concluído', 'Cancelado'];
// 2: prazo inicial (só o síndico altera depois de definido), atualização de prazo, data de conclusão obrigatória,
//    aprovação do gerente e do síndico na inclusão e na conclusão, aviso por e-mail ao incluir
// 3: criar OS para a equipe (Manutenção, inclusive jardinagem, ou Limpeza) a partir da pendência
const PEND_VERSAO = 3;
const pendAguardando = p => !!p && p.status !== 'Cancelado' && (p.aprovacao === 'Aguardando gerente' || p.aprovacao === 'Aguardando síndico');
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

// ---------- comprovação da conclusão das pendências: fotos, PDF e Excel numa pasta própria do Drive ----------
const PEND_ANEXO_MAX = 15;
const PEND_ANEXO_TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.ms-excel': 'xls' };
function pastaComprovacoes() { return pastaDrive('PASTA_PEND_COMPROV', 'Comprovações das pendências - Pier Gestão'); }
function pendAnexosDe(p) { try { const l = JSON.parse(p.anexos || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
// só depois de concluída (ou com a conclusão pedida, aguardando aprovação)
function pendPodeComprovar(p) { return p.status === 'Concluído' || (!!String(p.conclPedida || '').trim() && p.status !== 'Cancelado'); }
function pendAnexo(r, conta) {
  const t = tabela('pend'), id = texto(r.id, 40);
  const p = linhasOnde(t, ['id'], o => o.id === id)[0];
  if (!p) throw falha('Pendência não encontrada. Atualize a tela.');
  const l = pendAnexosDe(p);
  if (r.op === 'remover') {
    const a = l.find(x => x.id === String(r.fileId || ''));
    if (!a) throw falha('Arquivo não encontrado nesta pendência.');
    if (a.u !== conta.usuario && conta.perfil !== PERFIL_TOTAL && !ehGerente(conta)) throw falha('Só quem anexou, a Administração ou o gerente podem tirar este arquivo.');
    try { fotoDaPasta(a.id, pastaComprovacoes()).setTrashed(true); } catch (e) {}
    gravar(t, { anexos: JSON.stringify(l.filter(x => x.id !== a.id)), atualizadoEm: agora(), atualizadoPor: conta.nome }, p._row);
    AUDIT_DET = 'Tirou comprovação da pendência ' + (p.numero || p.id);
    return 'Arquivo retirado da comprovação.';
  }
  if (!pendPodeComprovar(p)) throw falha('A comprovação é anexada depois de concluir a pendência (ou de pedir a conclusão).');
  if (l.length >= PEND_ANEXO_MAX) throw falha('Esta pendência já tem ' + PEND_ANEXO_MAX + ' arquivos de comprovação.');
  const ext = PEND_ANEXO_TIPOS[r.mime];
  if (!ext) throw falha('Envie foto (JPG ou PNG), PDF ou planilha do Excel.');
  const b64 = String(r.b64 || '');
  if (!b64 || b64.length > 10000000) throw falha('O arquivo está muito grande (máximo de 7 MB).');
  const nome = ('Pendência ' + (p.numero || '') + ' - ' + String(p.titulo || '').slice(0, 50) + ' - comprovação ' + (l.length + 1)).replace(/[\\/:*?"<>|]/g, '-') + '.' + ext;
  const f = pastaComprovacoes().createFile(blobConferido(b64, r.mime, nome));
  l.push({ id: f.getId(), nome: texto(r.nome, 120) || nome, mime: r.mime, em: agora(), por: conta.nome, u: conta.usuario });
  gravar(t, { anexos: JSON.stringify(l), atualizadoEm: agora(), atualizadoPor: conta.nome }, p._row);
  AUDIT_DET = 'Anexou comprovação na pendência ' + (p.numero || p.id);
  return 'Comprovação anexada.';
}
// abre um arquivo: só os que pertencem à pendência e estão na pasta das comprovações
function pendVerAnexo(r) {
  const p = linhasOnde(tabela('pend'), ['id'], o => o.id === texto(r.id, 40))[0];
  if (!p) throw falha('Pendência não encontrada.');
  const fid = String(r.fileId || '');
  if (!fid || !pendAnexosDe(p).some(a => a.id === fid)) throw falha('Arquivo não encontrado nesta pendência.');
  return verArquivo(fid, pastaComprovacoes());
}

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
      conclSindico: p.conclSindico, os: p.os, osId: p.osId, anexos: pendAnexosDe(p).map(a => ({ id: a.id, nome: a.nome, mime: a.mime, em: a.em, por: a.por })),
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
  // cancelar (ou tirar do cancelado) só o gerente, o síndico ou a Administração; cancelada sai dos pedidos de conclusão
  const stAntigo = atual ? atual.status : '';
  if ('status' in obj && (obj.status === 'Cancelado') !== (stAntigo === 'Cancelado')) {
    if (!atual) throw falha('Inclua a pendência primeiro. Depois ela pode ser cancelada.');
    if (!gerente && !sindico && conta.perfil !== PERFIL_TOTAL) { const e = falha('Só o gerente, o síndico ou a Administração podem ' + (obj.status === 'Cancelado' ? 'cancelar uma pendência.' : 'reabrir uma pendência cancelada.')); e.negado = true; throw e; }
    if (obj.status === 'Cancelado') Object.assign(obj, { conclPedida: '', conclData: '', conclGerente: '', conclSindico: '' });
  }
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
    // aviso de "pendência alterada" para o síndico: desligado a pedido (09/11/2026) — mandava um e-mail a cada edição.
    // Continuam indo: pedido de conclusão e as aprovações que dependem dele. Para voltar, troque PEND_AVISAR_ALTERACOES para true.
    else if (PEND_AVISAR_ALTERACOES && !(aviso && chaveNome(respNovo) === 'sindico') && (pendAcompanhadaPeloSindico(atual) || pendAcompanhadaPeloSindico(depois))) {
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
  if (atual.status === 'Cancelado') throw falha('Esta pendência está cancelada. Reabra antes de aprovar.');
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
// ---------- controle de compras (Compras e pendências) ----------
// Mesmas colunas da planilha "Controle de Compras e Cotações": Item, Status, Data de Compra, Previsão e Data Efetiva da Entrega.
const COMPRA_ST = ['Aguardando Entrega', 'Entregue', 'Devolvido'];
function compraData(v) { const s = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00')) ? s : ''; }
function compraStatus(v) { const k = chaveNome(v); return COMPRA_ST.find(x => chaveNome(x) === k) || (/^entreg/.test(k) ? 'Entregue' : /^devol/.test(k) ? 'Devolvido' : /aguard/.test(k) ? 'Aguardando Entrega' : ''); }
function comprasLista() {
  return { compras: linhas(tabela('compra')).map(x => ({ id: x.id, numero: Number(x.numero) || 0, item: x.item, status: x.status, dataCompra: x.dataCompra, previsao: x.previsao,
    entregaEm: x.entregaEm, obs: x.obs, criadoPor: x.criadoPor, atualizadoEm: x.atualizadoEm, atualizadoPor: x.atualizadoPor })).sort((a, b) => a.numero - b.numero) };
}
function compraLimpa(v) {
  const o = { item: texto(v.item, 150), status: compraStatus(v.status) || 'Aguardando Entrega', dataCompra: compraData(v.dataCompra), previsao: compraData(v.previsao), entregaEm: compraData(v.entregaEm), obs: texto(v.obs, 500) };
  if (!o.item) throw falha('Escreva o item comprado.');
  return o;
}
function compraSalvar(r, conta) {
  const t = tabela('compra'), todas = linhas(t), v = r.compra || {};
  const ja = v.id ? todas.find(x => x.id === String(v.id)) : null;
  if (v.id && !ja) throw falha('Compra não encontrada. Atualize a tela.');
  if (r.op === 'excluir') { if (!ja) throw falha('Compra não encontrada.'); t.sh.deleteRow(ja._row); AUDIT_DET = 'Excluiu a compra ' + ja.numero + ' (' + ja.item + ')'; return 'Compra excluída.'; }
  if (r.op === 'entregue') {
    if (!ja) throw falha('Compra não encontrada.');
    const quando = compraData(v.entregaEm) || hoje();
    gravar(t, { status: 'Entregue', entregaEm: quando, atualizadoEm: agora(), atualizadoPor: conta.nome }, ja._row);
    AUDIT_DET = 'Marcou como entregue a compra ' + ja.numero + ' (' + ja.item + ') em ' + quando; return 'Compra marcada como entregue.';
  }
  const o = compraLimpa(v);
  if (ja) { gravar(t, Object.assign(o, { atualizadoEm: agora(), atualizadoPor: conta.nome }), ja._row); AUDIT_DET = 'Editou a compra ' + ja.numero + ' (' + o.item + ', ' + o.status + ')'; return 'Compra salva.'; }
  const numero = todas.reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0) + 1;
  gravar(t, Object.assign(o, { id: novoId('CP'), numero, criadoEm: agora(), criadoPor: conta.nome }));
  AUDIT_DET = 'Nova compra ' + numero + ' (' + o.item + ', ' + o.status + ')';
  return 'Compra nº ' + numero + ' incluída.';
}
// planilha: inclui as linhas novas; a mesma compra (mesmo item e mesma data de compra) é atualizada em vez de repetir
function compraImportar(r, conta) {
  const lista = Array.isArray(r.lista) ? r.lista.slice(0, 500) : [];
  if (!lista.length) throw falha('A planilha não tem compras.');
  const t = tabela('compra'), todas = linhas(t);
  let numero = todas.reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0), novos = 0, atual = 0; const erros = [];
  const chave = x => chaveNome(x.item) + '|' + (x.dataCompra || '');
  const mapa = {}; todas.forEach(x => { mapa[chave(x)] = x; });
  const novasLinhas = [];
  lista.forEach((v, i) => {
    try {
      const o = compraLimpa(v), ja = mapa[chave(o)];
      if (ja) { gravar(t, Object.assign(o, { atualizadoEm: agora(), atualizadoPor: conta.nome }), ja._row); atual++; return; }
      const nova = Object.assign(o, { id: novoId('CP'), numero: ++numero, criadoEm: agora(), criadoPor: conta.nome });
      novasLinhas.push(nova); mapa[chave(nova)] = nova; novos++;
    } catch (e) { erros.push('linha ' + (v._linha || i + 2) + ': ' + e.message); }
  });
  if (novasLinhas.length) gravarVarias(t, novasLinhas);
  AUDIT_DET = 'Planilha do controle de compras: ' + novos + ' nova(s), ' + atual + ' atualizada(s)' + (erros.length ? ', ' + erros.length + ' com erro' : '');
  return 'Planilha importada: ' + novos + ' compra(s) nova(s), ' + atual + ' atualizada(s).' + (erros.length ? ' Não entraram ' + erros.length + ': ' + erros.slice(0, 3).join('; ') + '.' : '');
}

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
    aprovGerente: c.aprovGerente, aprovSindico: c.aprovSindico, recusa: c.recusa, mapaId: c.mapaId, mapaEm: c.mapaEm, conversa: cotConversa(c) };
}
// conversa da cotação (síndico, gerente e administração): lista de mensagens guardada em JSON na própria linha
function cotConversa(c) {
  let l = [];
  try { l = JSON.parse(c.conversa || '[]'); } catch (e) { l = []; }
  return Array.isArray(l) ? l.filter(m => m && m.txt).map(m => ({ em: String(m.em || ''), por: String(m.por || ''), usuario: String(m.usuario || ''), papel: String(m.papel || ''), txt: String(m.txt) })) : [];
}
const cotPapel = conta => ehSindico(conta) ? 'Síndico' : ehGerente(conta) ? 'Gerente' : (conta.perfil || 'Administração');
// nova mensagem: quem é do síndico/gerente avisa a administração (e quem criou a cotação); a administração avisa o síndico e o gerente
function cotAvisarMensagem(c, txt, conta) {
  try {
    const dest = [], add = e => { e = String(e || '').toLowerCase(); if (e && dest.indexOf(e) < 0) dest.push(e); };
    const us = lerUsuarios().lista, eu = us.find(u => u.usuario === conta.usuario), meu = eu && eu.email ? eu.email.toLowerCase() : '';
    if (ehSindico(conta) || ehGerente(conta)) {
      emailsDoSetor('Administração').forEach(add);
      const criador = us.find(u => u.ativo && u.nome === c.criadaPor && emailValido(u.email));
      if (criador) add(criador.email);
      if (!ehSindico(conta)) emailsDoSetor('Síndico').forEach(add);
      if (!ehGerente(conta)) emailsDoSetor('Gerente').forEach(add);
    } else { emailsDoSetor('Síndico').forEach(add); emailsDoSetor('Gerente').forEach(add); }
    const para = dest.filter(e => e !== meu);
    if (!para.length) return '';
    const corpo = [
      conta.nome + ' (' + cotPapel(conta) + ') escreveu na cotação ' + c.numero + ':',
      '',
      txt,
      '',
      'Finalidade: ' + c.finalidade,
      'Situação: ' + c.status,
      '',
      'Para responder: Pier Gestão → setor Administração → Pendências e compras → Cotações → ' + c.numero + ' → Conversa.',
      'Mensagem automática do Pier Gestão. Não responda este e-mail.'
    ].join('\n');
    MailApp.sendEmail({ to: para.join(','), subject: 'Pier Gestão – cotação ' + c.numero + ': mensagem de ' + conta.nome, body: corpo, name: 'Pier Gestão' });
    return ' Aviso enviado por e-mail.';
  } catch (e) {
    Logger.log('Aviso da mensagem da cotação não enviado: ' + e.message);
    return '';
  }
}

function cotLista() {
  const lista = linhas(tabela('cot')).map(cotLer).sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)) || String(b.numero).localeCompare(String(a.numero)));
  const pend = SpreadsheetApp.getActive().getSheetByName(ABAS.pend.nome) ? linhas(tabela('pend'))
    .filter(p => p.status !== 'Concluído' && p.status !== 'Cancelado' && p.tipo !== 'Constante')
    .map(p => ({ id: p.id, numero: p.numero, titulo: p.titulo, secao: pendRotuloSecao(p.secao) })) : [];
  return { cotacoes: lista, pendOpcoes: pend, cotVersao: COT_VERSAO };
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
    if (op === 'mensagem') {
      if (atual.status === COT_STATUS.cancelada) throw falha('Esta cotação está cancelada. Reabra para conversar sobre ela.');
      const txt = cotTxt(r.texto, 1000);
      if (!txt) throw falha('Escreva a mensagem.');
      const conv = cotConversa(atual);
      conv.push({ em: agora(), por: conta.nome, usuario: conta.usuario || '', papel: cotPapel(conta), txt });
      let json = JSON.stringify(conv.slice(-200));
      while (json.length > 40000) { conv.shift(); json = JSON.stringify(conv); }
      obj.conversa = json;
      AUDIT_DET = 'Mensagem na cotação ' + atual.numero + ': ' + txt.slice(0, 200);
      const r0 = fim('Mensagem enviada.');
      r0.texto += cotAvisarMensagem(atual, txt, conta);
      return r0;
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
    const f = pastaCotacoes().createFile(blobConferido(b64, r.mime, nome));
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
  const f = pastaCotacoes().createFile(blobConferido(b64, r.mime, nome));
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
    const titulo = { bloqueio: 'login bloqueado', negado: 'acesso negado', senha: 'senha trocada', usuario: 'usuário criado ou alterado', ataque: 'muitas senhas erradas em vários logins' }[tipo] || tipo;
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

// ---------- comunicado por e-mail (Administração > Início) ----------
// Destinatários: os grupos da aba "Emails" (Gerente, Síndico, Supervisor…) e os logins ativos com e-mail.
// O navegador só escolhe entre os endereços que o servidor listou; nenhum endereço digitado é aceito.
// Recursos: destaque (Novidade/Importante/Urgente), lista ou cards, imagens no corpo, anexos (PDF/Excel/foto),
// botões extras, rodapé com contatos, saudação pelo nome, modelos salvos, prévia, teste para mim, cópia,
// agendamento (acionador de uma vez) e histórico na aba "Comunicados".
const COM_FUNCAO = 'comunicadosAgendados';
const COM_TIPOS = { Normal: '', Novidade: '#397d9d', Importante: '#c98a0b', Urgente: '#c0392b' };
function comExigir(conta) { if (!conta || conta.perfil !== PERFIL_TOTAL) { const e = falha('Só o perfil Administração envia comunicados por e-mail.'); e.negado = true; throw e; } }
function comDestinos() {
  const grupos = EMAILS_INICIAIS.map(x => x[0]).filter(g => ['Segurança', 'Fornecedor'].indexOf(g) < 0);
  try { lerUsuarios().lista.forEach(u => { if (u.ativo && emailValido(u.email) && u.perfil && !grupos.some(g => chaveNome(g) === chaveNome(u.perfil) || (chaveNome(g) === 'gerente' && chaveNome(u.perfil) === 'gerencia'))) grupos.push(u.perfil); }); } catch (e) {}
  return grupos.map(g => ({ grupo: g, emails: emailsDoSetor(g) })).filter(x => x.emails.length);
}
function comMeuEmail(conta) { try { const u = lerUsuarios().lista.find(x => x.usuario === conta.usuario); return u && emailValido(u.email) ? u.email : ''; } catch (e) { return ''; } }
function comNomes() { const m = {}; try { lerUsuarios().lista.forEach(u => { if (u.ativo && emailValido(u.email)) m[u.email] = u.nome; }); } catch (e) {} return m; }
function comProps() { return PropertiesService.getScriptProperties(); }
function comJson(chave, padrao) { try { const v = JSON.parse(comProps().getProperty(chave) || 'null'); return v == null ? padrao : v; } catch (e) { return padrao; } }
function comCfg() { const c = comJson('COM_CFG', {}); return { endereco: texto(c.endereco, 160), telefone: texto(c.telefone, 40), whatsapp: texto(c.whatsapp, 40) }; }
function comModelos() { const l = comJson('COM_MODELOS', []); return Array.isArray(l) ? l : []; }
function comHistorico() {
  return linhas(tabela('com')).slice(-40).reverse().map(x => ({ id: x.id, criadoEm: x.criadoEm, por: x.por, assunto: x.assunto, tipo: x.tipo, destinos: x.destinos,
    status: x.status, agendadoPara: x.agendadoPara, enviadoEm: x.enviadoEm, resumo: x.resumo }));
}
function comPainel(conta) {
  let cota = null; try { cota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  return { destinos: comDestinos(), cota, cfg: comCfg(), modelos: comModelos(), historico: comHistorico(), meuEmail: comMeuEmail(conta) };
}
const COM_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
// confere e normaliza o pedido vindo do navegador (nada é confiado sem checar)
function comLer(r) {
  const p = {
    assunto: texto(r.assunto, 120), mensagem: String(r.mensagem || '').replace(/\r/g, '').trim().slice(0, 6000),
    tipo: Object.prototype.hasOwnProperty.call(COM_TIPOS, r.tipo) ? r.tipo : 'Normal', formato: r.formato === 'cards' ? 'cards' : 'lista',
    saudacao: r.saudacao !== false, botaoApp: !!r.botaoApp, copia: !!r.copia, imagens: [], anexos: [], botaoExtra: null
  };
  if (!p.assunto) throw falha('Escreva o assunto.');
  if (p.mensagem.length < 10) throw falha('Escreva a mensagem.');
  const bt = r.botaoExtra || {}, btTxt = texto(bt.texto, 40), btUrl = String(bt.url || '').trim();
  if (btTxt || btUrl) {
    if (!btTxt || !/^https:\/\/[^\s"'<>]{3,300}$/i.test(btUrl)) throw falha('Botão extra: escreva o texto e um link que comece com https://');
    p.botaoExtra = { texto: btTxt, url: btUrl };
  }
  let total = 0;
  const arq = (lista, max, soImagem, rotulo) => (Array.isArray(lista) ? lista : []).slice(0, max).map((a, i) => {
    const mime = String(a.mime || ''), b64 = String(a.b64 || '');
    if (COM_MIMES.indexOf(mime) < 0 || (soImagem && mime.indexOf('image/') !== 0)) throw falha(rotulo + ': use foto (JPG ou PNG), PDF ou Excel.');
    total += b64.length; if (total > 9000000) throw falha('Imagens e anexos passaram do limite (cerca de 6 MB no total).');
    if (!conteudoConfere(b64, mime)) throw falha(rotulo + ' "' + texto(a.nome, 80) + '": o conteúdo não confere com o tipo do arquivo.');
    return { mime, b64, nome: (texto(a.nome, 80) || (rotulo.toLowerCase() + '-' + (i + 1))).replace(/[\\/:*?"<>|]/g, '_') };
  });
  if (r.rodape && typeof r.rodape === 'object') p.rodape = { endereco: texto(r.rodape.endereco, 160), telefone: texto(r.rodape.telefone, 40), whatsapp: texto(r.rodape.whatsapp, 40) };
  p.imagens = arq(r.imagens, 3, true, 'Imagem');
  p.anexos = arq(r.anexos, 3, false, 'Anexo');
  return p;
}
function comH(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function comLinks(s) { return comH(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => '<a href="' + u + '" style="color:#397d9d">' + u + '</a>'); }
// monta o e-mail; "previa" usa imagens embutidas (data:) para mostrar no navegador
function comMontar(p, porNome, nomeDest, previa) {
  const site = 'https://piergestao.condominiopier.com.br', F = 'font-family:Arial,Helvetica,sans-serif;';
  const cor = COM_TIPOS[p.tipo];
  const saud = p.saudacao ? 'Olá' + (nomeDest ? ', ' + String(nomeDest).split(/\s+/)[0] : '') + ',' : '';
  const item = l => l.replace(/^\s*[•\-*]\s+/, '');
  const pars = p.mensagem.split(/\n{2,}/).map(par => {
    const ls = par.split('\n');
    if (ls.every(l => /^\s*[•\-*]\s+/.test(l))) {
      if (p.formato === 'cards') return ls.map(l => { const t = item(l), k = t.indexOf(':'); const tit = k > 0 && k < 60 ? t.slice(0, k) : '', txt0 = tit ? t.slice(k + 1).trim() : t, txt = tit ? txt0.charAt(0).toUpperCase() + txt0.slice(1) : txt0;
        return '<div style="border:1px solid #d9e1e8;border-left:4px solid ' + (cor || '#397d9d') + ';border-radius:8px;padding:12px 14px;margin:0 0 10px;background:#f7fafc">'
          + (tit ? '<div style="font-weight:bold;color:#17324d;margin:0 0 4px">' + comH(tit) + '</div>' : '') + '<div>' + comLinks(txt) + '</div></div>'; }).join('');
      return '<ul style="margin:0 0 16px;padding-left:22px">' + ls.map(l => '<li style="margin:0 0 10px">' + comLinks(item(l)) + '</li>').join('') + '</ul>';
    }
    return '<p style="margin:0 0 14px">' + ls.map(comLinks).join('<br>') + '</p>';
  }).join('');
  const imgs = p.imagens.map((im, i) => '<div style="margin:6px 0 16px;text-align:center"><img src="' + (previa ? 'data:' + im.mime + ';base64,' + im.b64 : 'cid:img' + i) + '" alt="' + comH(im.nome) + '" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #d9e1e8"></div>').join('');
  const botao = (t, u, prim) => '<a href="' + comH(u) + '" style="display:inline-block;margin:4px 6px;background:' + (prim ? '#17324d' : '#ffffff') + ';color:' + (prim ? '#ffffff' : '#17324d') + ';border:2px solid #17324d;' + F + 'font-size:15px;font-weight:bold;text-decoration:none;padding:10px 22px;border-radius:8px">' + comH(t) + '</a>';
  const botoes = botao('Abrir o Pier Gestão', site, true) + (p.botaoApp ? botao('Instalar o aplicativo', site + '/instalar.html', false) : '') + (p.botaoExtra ? botao(p.botaoExtra.texto, p.botaoExtra.url, false) : '');
  const c = p.rodape || comCfg(), contatos = [c.endereco, c.telefone ? 'Tel.: ' + c.telefone : '', c.whatsapp ? 'WhatsApp: ' + c.whatsapp : ''].filter(Boolean).map(comH).join(' · ');
  const anexosTxt = p.anexos.length ? '<p style="margin:0 0 14px;color:#5b6b7a;font-size:13px">📎 Anexo' + (p.anexos.length > 1 ? 's' : '') + ': ' + p.anexos.map(a => comH(a.nome)).join(', ') + '</p>' : '';
  const html = '<div style="background:#f2f5f7;padding:24px 12px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9e1e8;border-radius:12px">'
    + '<tr><td align="center" style="padding:28px 24px 18px"><img src="' + (previa ? 'data:image/png;base64,' + LEMB_LOGO_B64 : 'cid:logo') + '" width="200" alt="Pier Residências" style="display:block;width:200px;max-width:70%;height:auto;border:0"></td></tr>'
    + '<tr><td style="padding:0 32px"><div style="border-top:2px solid ' + (cor || '#397d9d') + ';height:0;line-height:0">&nbsp;</div></td></tr>'
    + (cor ? '<tr><td style="padding:18px 32px 0"><span style="display:inline-block;background:' + cor + ';color:#fff;' + F + 'font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px">' + comH(p.tipo) + '</span></td></tr>' : '')
    + '<tr><td style="padding:' + (cor ? '12px' : '22px') + ' 32px 6px;' + F + 'font-size:22px;font-weight:bold;color:#17324d">' + comH(p.assunto) + '</td></tr>'
    + '<tr><td style="padding:10px 32px 4px;' + F + 'font-size:15px;line-height:1.6;color:#163047">' + (saud ? '<p style="margin:0 0 14px">' + comH(saud) + '</p>' : '') + pars + imgs + anexosTxt + '</td></tr>'
    + '<tr><td align="center" style="padding:8px 26px 26px">' + botoes + '</td></tr>'
    + '<tr><td style="padding:0 32px"><div style="border-top:1px solid #d9e1e8;height:0;line-height:0">&nbsp;</div></td></tr>'
    + '<tr><td style="padding:16px 32px 24px;' + F + 'font-size:13px;line-height:1.6;color:#5b6b7a"><b style="color:#17324d">' + comH(porNome) + '</b>' + (chaveNome(porNome) === 'administracao' ? '' : ' · Administração') + ' · Pier Residências'
    + (contatos ? '<br>' + contatos : '') + '<br>Comunicado enviado pelo Pier Gestão · <a href="' + site + '" style="color:#397d9d">' + site.replace('https://', '') + '</a></td></tr>'
    + '</table></div>';
  const body = (saud ? saud + '\n\n' : '') + p.mensagem + '\n\n' + (p.botaoExtra ? p.botaoExtra.texto + ': ' + p.botaoExtra.url + '\n' : '') + '—\n' + porNome + ' · Pier Residências\n' + (c.endereco || c.telefone || c.whatsapp ? [c.endereco, c.telefone, c.whatsapp].filter(Boolean).join(' · ') + '\n' : '') + site;
  return { subject: (p.tipo === 'Urgente' ? '[URGENTE] ' : p.tipo === 'Importante' ? '[Importante] ' : '') + 'Pier Gestão – ' + p.assunto, html, body };
}
function comDisparar(p, porNome, emails) {
  const nomes = comNomes(), inline = { logo: lembLogoBlob() };
  p.imagens.forEach((im, i) => { inline['img' + i] = Utilities.newBlob(Utilities.base64Decode(im.b64), im.mime, im.nome); });
  const anexos = p.anexos.map(a => Utilities.newBlob(Utilities.base64Decode(a.b64), a.mime, a.nome));
  let ok = 0; const falhas = [];
  emails.forEach(e => { try { const m = comMontar(p, porNome, nomes[e] || '', false);
    MailApp.sendEmail({ to: e, subject: m.subject, body: m.body, htmlBody: m.html, inlineImages: inline, attachments: anexos, name: 'Pier Gestão' }); ok++; } catch (err) { falhas.push(e); } });
  return { ok, falhas };
}
function comDestinosEscolhidos(r) {
  const validos = {}; comDestinos().forEach(x => x.emails.forEach(e => { validos[e] = true; }));
  const dest = [];
  (Array.isArray(r.emails) ? r.emails : []).forEach(e => { e = String(e || '').trim().toLowerCase(); if (validos[e] && dest.indexOf(e) < 0) dest.push(e); });
  if (!dest.length) throw falha('Escolha ao menos um destinatário.');
  if (dest.length > 60) throw falha('Envie para no máximo 60 pessoas por vez.');
  return dest;
}
function comunicadoPrevia(r, conta) {
  comExigir(conta);
  const p = comLer(r), m = comMontar(p, conta.nome, conta.nome, true);
  return { assunto: m.subject, html: m.html };
}
function comSalvarCfg(r) {
  const c = r.rodape || {};
  comProps().setProperty('COM_CFG', JSON.stringify({ endereco: texto(c.endereco, 160), telefone: texto(c.telefone, 40), whatsapp: texto(c.whatsapp, 40) }));
}
function comunicadoEnviar(r, conta) {
  comExigir(conta);
  if (r.rodape) comSalvarCfg(r);
  const p = comLer(r);
  if (r.modo === 'teste') {
    const eu = comMeuEmail(conta);
    if (!eu) throw falha('Cadastre o seu e-mail no seu login (Pessoas > Usuários) para receber o teste.');
    const x = comDisparar(p, conta.nome, [eu]);
    if (!x.ok) throw falha('Não foi possível enviar o teste.');
    AUDIT_DET = 'Comunicado de teste "' + p.assunto + '" para o próprio e-mail';
    return 'Teste enviado para ' + eu + '.';
  }
  const dest = comDestinosEscolhidos(r);
  const eu = p.copia ? comMeuEmail(conta) : '';
  if (eu && dest.indexOf(eu) < 0) dest.push(eu);
  const t = tabela('com'), id = novoId('C');
  const linha = { id, criadoEm: agora(), por: conta.nome, porUsuario: conta.usuario, assunto: p.assunto, tipo: p.tipo, destinos: dest.length, emails: dest.join(', ').slice(0, 4000) };
  if (r.modo === 'agendar') {
    const quando = new Date(String(r.quando || ''));
    if (isNaN(quando) || quando.getTime() < Date.now() + 2 * 60000) throw falha('Escolha uma data e hora daqui a pelo menos alguns minutos.');
    if (quando.getTime() > Date.now() + 60 * 864e5) throw falha('Agende para no máximo 60 dias à frente.');
    const f = pastaDrive('PASTA_COMUNICADOS', 'Comunicados agendados - Pier Gestão').createFile(id + '.json', JSON.stringify({ p, emails: dest, por: conta.nome }), 'application/json');
    const qtxt = Utilities.formatDate(quando, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    gravar(t, Object.assign(linha, { status: 'Agendado', agendadoPara: qtxt, arquivo: f.getId(), resumo: 'Agendado para ' + qtxt.split(' ')[0].split('-').reverse().join('/') + ' ' + qtxt.split(' ')[1] }));
    comReagendar();
    AUDIT_DET = 'Agendou o comunicado "' + p.assunto + '" para ' + qtxt + ' (' + dest.length + ' pessoa(s))';
    return 'Comunicado agendado para ' + qtxt.split(' ')[0].split('-').reverse().join('/') + ' às ' + qtxt.split(' ')[1] + '.';
  }
  let cota = 100; try { cota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  if (cota < dest.length) throw falha('A cota de e-mails do Google para hoje acabou (restam ' + cota + '). Tente amanhã, agende ou envie para menos pessoas.');
  const x = comDisparar(p, conta.nome, dest);
  gravar(t, Object.assign(linha, { status: x.ok ? 'Enviado' : 'Falhou', enviadoEm: agora(), resumo: x.ok + ' enviado(s)' + (x.falhas.length ? ', ' + x.falhas.length + ' com falha' : '') }));
  AUDIT_DET = 'Comunicado "' + p.assunto + '" para ' + x.ok + ' pessoa(s)' + (x.falhas.length ? '; falhou para ' + x.falhas.length : '');
  if (!x.ok) throw falha('Não foi possível enviar o comunicado. Tente de novo mais tarde.');
  return 'Comunicado enviado para ' + x.ok + (x.ok === 1 ? ' pessoa' : ' pessoas') + '.' + (x.falhas.length ? ' Não foi possível enviar para ' + x.falhas.length + '.' : '');
}
function comunicadoCancelar(r, conta) {
  comExigir(conta);
  const t = tabela('com'), c = linhas(t).find(x => x.id === r.id);
  if (!c) throw falha('Comunicado não encontrado. Atualize a página.');
  if (c.status !== 'Agendado') throw falha('Só dá para cancelar um comunicado agendado.');
  gravar(t, { status: 'Cancelado', resumo: 'Cancelado por ' + conta.nome + ' em ' + agora() }, c._row);
  try { if (c.arquivo) DriveApp.getFileById(c.arquivo).setTrashed(true); } catch (e) {}
  comReagendar();
  AUDIT_DET = 'Cancelou o comunicado agendado "' + c.assunto + '"';
  return 'Comunicado agendado cancelado.';
}
function comModeloSalvar(r, conta) {
  comExigir(conta);
  const nome = texto(r.nome, 60); if (!nome) throw falha('Dê um nome ao modelo.');
  const p = { assunto: texto(r.assunto, 120), mensagem: String(r.mensagem || '').replace(/\r/g, '').slice(0, 6000), tipo: Object.prototype.hasOwnProperty.call(COM_TIPOS, r.tipo) ? r.tipo : 'Normal', formato: r.formato === 'cards' ? 'cards' : 'lista' };
  const l = comModelos().filter(m => chaveNome(m.nome) !== chaveNome(nome));
  l.push(Object.assign({ id: novoId('MD'), nome }, p));
  if (l.length > 20) throw falha('Guarde no máximo 20 modelos. Exclua algum antes.');
  l.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const txt = JSON.stringify(l); if (txt.length > 8500) throw falha('Os modelos ficaram grandes demais. Exclua algum ou encurte o texto.');
  comProps().setProperty('COM_MODELOS', txt);
  AUDIT_DET = 'Salvou o modelo de comunicado "' + nome + '"';
  return 'Modelo "' + nome + '" salvo.';
}
function comModeloExcluir(r, conta) {
  comExigir(conta);
  const l = comModelos(), m = l.find(x => x.id === r.id); if (!m) throw falha('Modelo não encontrado.');
  comProps().setProperty('COM_MODELOS', JSON.stringify(l.filter(x => x.id !== r.id)));
  AUDIT_DET = 'Excluiu o modelo de comunicado "' + m.nome + '"';
  return 'Modelo "' + m.nome + '" excluído.';
}
// agendamento: um único acionador de tempo, sempre para o próximo comunicado agendado
function comReagendar() {
  ScriptApp.getProjectTriggers().filter(tr => tr.getHandlerFunction() === COM_FUNCAO).forEach(tr => ScriptApp.deleteTrigger(tr));
  const prox = linhas(tabela('com')).filter(x => x.status === 'Agendado' && x.agendadoPara).map(x => x.agendadoPara).sort()[0];
  if (!prox) return;
  const [d, h] = String(prox).split(' '), [a, m, di] = d.split('-').map(Number), [hh, mm] = (h || '00:00').split(':').map(Number);
  const quando = new Date(a, m - 1, di, hh, mm);
  ScriptApp.newTrigger(COM_FUNCAO).timeBased().at(new Date(Math.max(quando.getTime(), Date.now() + 60000))).create();
}
// chamada pelo acionador: envia os agendados que já venceram
function comunicadosAgendados() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { try { ScriptApp.newTrigger(COM_FUNCAO).timeBased().after(5 * 60000).create(); } catch (e) {} return; }
  try {
    const agoraTxt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const t = tabela('com');
    linhas(t).filter(x => x.status === 'Agendado' && x.agendadoPara && x.agendadoPara <= agoraTxt).forEach(c => {
      try {
        const dadosArq = JSON.parse(DriveApp.getFileById(c.arquivo).getBlob().getDataAsString());
        const x = comDisparar(dadosArq.p, dadosArq.por, dadosArq.emails);
        gravar(t, { status: x.ok ? 'Enviado' : 'Falhou', enviadoEm: agora(), resumo: x.ok + ' enviado(s) no horário agendado' + (x.falhas.length ? ', ' + x.falhas.length + ' com falha' : '') }, c._row);
        try { DriveApp.getFileById(c.arquivo).setTrashed(true); } catch (e) {}
      } catch (e) { gravar(t, { status: 'Falhou', resumo: 'Falhou no horário agendado: ' + texto(e.message, 200) }, c._row); }
    });
    comReagendar();
  } finally { lock.releaseLock(); }
}

// --- avisos ao síndico: pendência aguardando a aprovação dele e alterações nas pendências que ele acompanha ---
// (as que ele incluiu ou que estão com o Síndico como responsável). Quem fez a mudança sendo o próprio síndico, não sai e-mail.
// Uma falha no e-mail nunca desfaz a gravação.
function pendAcompanhadaPeloSindico(p) { return p.origem === 'Síndico' || chaveNome(p.responsavel) === 'sindico'; }
const PEND_AVISAR_ALTERACOES = false;
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
  senhaMin: 10,                  // tamanho mínimo das senhas novas
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
    u: conta.usuario, id: conta.id || '', c: agoraMs, v: agoraMs, a: texto((reg || {}).aparelho, 60)
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
  if (!us || !us.ativo || (x.s.id && x.s.id !== us.uid)) { x.props.deleteProperty(x.k); return null; }
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

// --- limites de requisições (CacheService: contadores que somem sozinhos) ---
// por sessão: no máximo 150 pedidos por minuto (o uso normal fica bem abaixo disso)
// no sistema todo: mais de 40 senhas erradas em 10 min (em logins diferentes) atrasa cada nova tentativa e avisa a Segurança
const LIMITE = { porSessaoMin: 150, falhasGlobais: 40, janelaFalhasMin: 10 };
function limiteSessaoExcedido(token) {
  if (!/^[0-9a-f]{64}$/.test(String(token || ''))) return false;
  try {
    const c = CacheService.getScriptCache(), k = 'RL_S_' + chaveSessao(token).slice(5, 29) + '_' + Math.floor(Date.now() / 60000);
    const n = Number(c.get(k) || 0) + 1;
    c.put(k, String(n), 120);
    return n > LIMITE.porSessaoMin;
  } catch (e) { return false; }
}
function falhaLoginGlobal(usuario, aparelho) {
  try {
    const c = CacheService.getScriptCache(), k = 'RL_F_' + Math.floor(Date.now() / (LIMITE.janelaFalhasMin * 60000));
    const n = Number(c.get(k) || 0) + 1;
    c.put(k, String(n), LIMITE.janelaFalhasMin * 60 + 60);
    if (n <= LIMITE.falhasGlobais) return;
    Utilities.sleep(Math.min(5000, 1000 + (n - LIMITE.falhasGlobais) * 100));
    if (n === LIMITE.falhasGlobais + 1) {
      auditar({ usuario: usuario || '—', nome: '', perfil: '' }, 'Muitas senhas erradas', 'Mais de ' + LIMITE.falhasGlobais + ' senhas erradas em ' + LIMITE.janelaFalhasMin + ' min no sistema todo.', 'Negado');
      alertaSeguranca('ataque', 'vários logins', 'Mais de ' + LIMITE.falhasGlobais + ' senhas erradas em ' + LIMITE.janelaFalhasMin + ' minutos, em logins diferentes. Pode ser alguém tentando adivinhar senhas. As tentativas seguintes ficam mais lentas.', aparelho);
    }
  } catch (e) { /* o limite é uma proteção a mais; não pode impedir a entrada */ }
}

// --- arquivos enviados: o conteúdo precisa ser do tipo informado (não basta o nome ou o tipo dito pelo navegador) ---
function conteudoConfere(b64, mime) {
  let b;
  try { b = Utilities.base64Decode(String(b64 || '').replace(/[^A-Za-z0-9+/=]/g, '').slice(0, mime === 'application/pdf' ? 1368 : 24)); } catch (e) { return false; }
  b = b.map(x => x & 255);
  const comeca = sig => sig.every((v, i) => b[i] === v);
  if (mime === 'image/jpeg') return comeca([0xFF, 0xD8, 0xFF]);
  if (mime === 'image/png') return comeca([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (mime === 'image/webp') return comeca([0x52, 0x49, 0x46, 0x46]) && [0x57, 0x45, 0x42, 0x50].every((v, i) => b[8 + i] === v);
  if (mime === 'application/pdf') return String.fromCharCode.apply(null, b).indexOf('%PDF-') >= 0;
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return comeca([0x50, 0x4B, 0x03, 0x04]);
  if (mime === 'application/vnd.ms-excel') return comeca([0xD0, 0xCF, 0x11, 0xE0]);
  return false;
}
function blobConferido(b64, mime, nome) {
  if (!conteudoConfere(b64, mime)) throw falha('O conteúdo do arquivo não confere com o tipo (foto, PDF ou Excel). Escolha o arquivo original.');
  return Utilities.newBlob(Utilities.base64Decode(b64), mime, nome);
}
// senhas novas: além do tamanho mínimo, recusa as muito comuns ou fáceis de adivinhar
const SENHAS_COMUNS = ['1234567890', '12345678910', '0123456789', '1234512345', '1234554321', '9876543210', '0987654321', '1122334455',
  'senha12345', 'senha123456', 'senha@1234', 'password123', 'qwertyuiop', 'qwerty1234', 'asdfghjklç', 'abcdefghij', 'abc1234567',
  '1q2w3e4r5t', 'q1w2e3r4t5', 'pier123456', 'pier@12345', 'pierresidencias', 'pierresidencia', 'condominio', 'condominio123',
  'administracao', 'manutencao', 'portaria123', 'brasil1234', 'mudar12345', 'trocar1234', 'iloveyou12'];
function senhaFracaMotivo(nova, usuario) {
  const s = String(nova || ''), b = s.toLowerCase();
  if (s.length < SEG.senhaMin) return 'A nova senha precisa ter pelo menos ' + SEG.senhaMin + ' caracteres.';
  if (usuario && String(usuario).length >= 4 && b.indexOf(String(usuario).toLowerCase()) >= 0) return 'A senha não pode conter o seu usuário.';
  if (/^(.)\1+$/.test(s)) return 'Escolha uma senha menos óbvia (não use o mesmo caractere repetido).';
  if (SENHAS_COMUNS.indexOf(b) >= 0 || /^\d+$/.test(s) && '01234567890123456789'.indexOf(s) >= 0 || /^\d+$/.test(s) && '98765432109876543210'.indexOf(s) >= 0)
    return 'Essa senha é muito comum. Use uma frase ou misture palavras, números e símbolos.';
  return '';
}

// --- tentativas de login: 5 senhas erradas seguidas bloqueiam o login por 15 minutos ---
function verificarEntrada(usuario, senha) {
  // A criação inicial das abas possui seu próprio lock; prepare antes da seção crítica.
  abaUsuarios();
  abaPerfis();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw falha('O sistema está ocupado. Tente entrar novamente em alguns segundos.');
  try {
    garantirIdsUsuarios(true);
    const bloqueado = loginBloqueado(usuario);
    if (bloqueado) return { bloqueado, conta: null, travou: false };
    const conta = autenticar(usuario, senha);
    if (!conta) return { bloqueado: 0, conta: null, travou: registrarFalhaLogin(usuario) };
    limparFalhasLogin(usuario);
    return { bloqueado: 0, conta, travou: false };
  } finally { lock.releaseLock(); }
}
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
  cotSalvar: 'Cotação', cotArquivo: 'Arquivo de cotação', pendAnexo: 'Comprovação de pendência', guaritaSalvar: 'Guarita (visitante/prestador)', barcoSalvar: 'Barco (passageiros)', avisoSalvar: 'Quadro de avisos (Guarita Norte)',
  prestSalvar: 'Prestador de serviço', prestVisita: 'Visita de prestador', prestDoc: 'Documento de prestador', prestDocRemover: 'Tirou documento de prestador', prestImportar: 'Importou planilha de prestadores',
  unSalvar: 'Unidade', unConfig: 'Configuração das unidades', unOcupadas: 'Marcou unidades ocupadas', unImportar: 'Importou cadastro de moradores',
  compraSalvar: 'Controle de compras', compraImportar: 'Importou planilha do controle de compras',
  fornSalvar: 'Fornecedor', fornImportar: 'Importou planilha de fornecedores', fornDasCotacoes: 'Trouxe fornecedores das cotações',
  grAuto: 'Termo automático das reservas', grAutoAgora: 'Conferiu as reservas da administradora',
  grReservar: 'Nova reserva do Espaço Gourmet', grAcao: 'Reserva do Espaço Gourmet',
  espReserva: 'Reserva de espaço', espEspaco: 'Espaço', espVistoria: 'Vistoria de espaço', espColar: 'Reserva colada do e-mail', espImportar: 'Importou PDF de reservas', espEmails: 'Leu e-mails de reserva',
  medMedidor: 'Medidor', medLeituras: 'Leitura de medidor', medContas: 'Conta de consumo', medImportar: 'Importou planilha de medições',
  miImportar: 'Importou medição individual (Exista)', miBlocos: 'Nomes dos blocos (medição individual)', miExcluir: 'Excluiu período da medição individual',
  rondaPontoSalvar: 'Configurou ponto QR', rondaVisitar: 'Vistoria no ponto QR',
  rondaSalvar: 'Ronda', rondaFoto: 'Foto na ronda', rondaFotoRemover: 'Tirou foto da ronda', rondaResolver: 'Resolveu pendência da ronda',
  visao: 'Abriu tela',
  trocarSenha: 'Trocou a própria senha',
  registrar: 'Movimentação', osAbrir: 'Abriu OS', osAtualizar: 'Atualizou OS', osFoto: 'Foto na OS', osFotoRemover: 'Tirou foto da OS',
  demCriar: 'Criou demanda', demAtualizar: 'Atualizou demanda', salvarPreventiva: 'Salvou preventiva', excluirPreventiva: 'Excluiu preventiva',
  salvarLocais: 'Alterou locais', importarContagem: 'Importou inventário', devolver: 'Devolução', salvarItem: 'Salvou item',
  excluirItem: 'Excluiu item', estornar: 'Estornou lançamento', salvarUsuario: 'Usuário', comunicadoEnviar: 'Enviou comunicado por e-mail', comunicadoCancelar: 'Cancelou comunicado agendado', comModeloSalvar: 'Modelo de comunicado', comModeloExcluir: 'Modelo de comunicado', acessoUsuario: 'Acessos de usuário', excluirUsuario: 'Excluiu usuário',
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

// Perfil "Porteiro": só as Guaritas Sul e Norte (criado uma vez só; ajustável na tela Usuários)
function garantirPorteiro() {
  if (lerPerfis()['Porteiro']) return '';
  salvarPerfil({ nome: 'Porteiro', perms: { gua_sul: true, gua_norte: true } });
  return ' Perfil Porteiro criado.';
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

/**
 * Executar SOMENTE no projeto vinculado à planilha nova de homologação.
 * Adicionar junto de Codigo.gs. Não instala, publica ou envia mensagens.
 * Propriedade exigida: PIER_HOMOLOG_ID = ID da planilha nova.
 */
function prepararHomologacaoPier() { throw new Error('Rotina de homologação indisponível em produção.'); }


/** Testes de integração no Google, apenas na planilha fictícia preparada. Sem implantação. */
function testarHomologacaoPier() { throw new Error('Rotina de homologação indisponível em produção.'); }

/** Atualização da homologação existente: não recria a preparação nem redefine usuários. */
// Compatibilidade: mantém o nome anterior sem reativar módulos retirados.
function atualizarHomologacaoPier20() { throw new Error('Rotina de homologação indisponível em produção.'); }

// Compatibilidade da importação de inventário.
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

// Inventário: módulo reconciliado da branch liberacao-inventario.
const CONT_STATUS = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada', reconferir: 'Reconferir', cancelada: 'Cancelada' };
const CONT_MAX_ITENS = 500;
var FALHA_SIMULADA = '';   // usado só pelos testes: 'apos_marca', 'apos_historico', 'apos_saldo', 'import_apos_itens', 'import_apos_pedidos'
var FALHA_ITEM = '';       // testes: limita a falha simulada da aprovação a um item
var AUDIT_FEITO = false;   // a ação já gravou a própria auditoria detalhada

function podeContar(conta) { const p = conta && conta.perms || {}; return !!conta && (conta.perfil === PERFIL_TOTAL || (conta.perfil !== 'Limpeza' && p.contagem_registrar && p.setor_manutencao)); }
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
  return function () { max++; return 'CT-' + String(max).padStart(4, '0'); };
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
  if (!conta.id) throw falha('Entre novamente para identificar sua conta antes de contar.');
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
    if (setorDe(it) !== 'Manutenção') throw falha('O inventário está disponível somente para materiais da Manutenção.');
    if (vistos[it.id]) { erros.push(it.nome + ': aparece duas vezes na contagem.'); return; }
    if (bloq[it.id]) { erros.push(it.nome + ': item bloqueado para revisão da Administração (' + bloq[it.id].motivo + ')'); return; }
    vistos[it.id] = true;
    const qtd = numero_(l.qtd);
    if (!Number.isFinite(qtd) || !(qtd >= 0)) { erros.push(it.nome + ': quantidade contada inválida.'); return; }
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
  if (!conta.id) throw falha('Entre novamente para identificar sua conta antes de decidir.');
  const op = r.op;
  if (['aprovar', 'rejeitar', 'reconferir'].indexOf(op) < 0) throw falha('Operação inválida.');
  const alvos = Array.isArray(r.itens) ? r.itens : [];
  if (alvos.length > 200) throw falha('Decida no máximo 200 solicitações por chamada.');
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
  exigirHomologacaoInventario();
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
  const id = String(r.itemId || ''), b = lerBloqueio(id);
  if (!b) throw falha('Este item não está bloqueado. Atualize a tela.');
  if (r.op !== 'restaurar') throw falha('Uma alteração externa não pode ser aceita como ajuste direto. Restaure o saldo do sistema e registre uma nova contagem.');
  const motivo = texto(r.motivo, 300);
  if (!motivo) throw falha('Descreva a conferência antes de restaurar o saldo.');
  const ti = tabela('itens'), it = linhas(ti).find(x => x.id === id);
  if (b.tipo !== 'saldo_externo' || !it || !Number.isFinite(Number(b.saldoSistema)))
    throw falha('Esta inconsistência exige revisão técnica do histórico antes da liberação.');
  if (contagemPendenteDoItem(linhas(tabela('cont')), id)) throw falha('Decida antes a contagem pendente deste item.');
  gravar(ti, {qtd:arred(Number(b.saldoSistema)),atualizadoEm:agora()}, it._row);
  SpreadsheetApp.flush();
  PropertiesService.getScriptProperties().deleteProperty(chaveBloqueio(id));
  SALDO_OK[id] = true;
  auditar(conta,'Saldo restaurado',it.codigo + ': restauração de ' + fmt(it.qtd) + ' para ' + fmt(b.saldoSistema) + '. ' + motivo,'Restaurado');
  AUDIT_FEITO = true;
  return 'Saldo do sistema restaurado. Se houver diferença física, envie uma nova contagem para aprovação.';
}

// Identificação fixa das contas do inventário.
const COL_ID_CONTA = 'ID da conta';
function novoIdConta() { return 'C-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase(); }
function garantirColunaIdConta(U) {
  if (U.c['ID'] >= 0) return U;
  if (U.sh.getMaxColumns() < U.ncol + 1) U.sh.insertColumnsAfter(U.sh.getMaxColumns(), 1);
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


function dados(meses, conta) {
  const out = dadosBasePier(meses, conta);
  out.contagens = contagensVisiveis(conta) || [];
  const visiveis = new Set((out.itens || []).map(it => it.id));
  out.bloqueios = Object.values(itensBloqueados()).filter(b => visiveis.has(b.itemId));
  if (conta && conta.perfil === PERFIL_TOTAL) {
    out.integridade = estadoIntegridade();
    out.adminsAtivos = lerUsuarios().lista.filter(u => u.ativo && u.perfil === PERFIL_TOTAL).length;
  }
  return out;
}

function exigirHomologacaoInventario() {
  const ss = SpreadsheetApp.getActive(), p = PropertiesService.getScriptProperties();
  if (!ss || ss.getId() !== '1h96bbEfeMth_cnjjwpujCeIaTjyBYoabbJ2UzmmY_Eo' ||
      p.getProperty('PIER_HOMOLOG_ID') !== ss.getId() || p.getProperty('PIER_AMBIENTE') !== 'homologacao')
    throw new Error('Use exclusivamente o projeto da homologação do Pier Gestão 2.0.');
}
function atualizarInventarioPier20() { throw new Error('Rotina de homologação indisponível em produção.'); }

function agoraSeg() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }

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

// Pontos QR: o código identifica o local, nunca substitui a sessão ou a confirmação de vistoria.
function rondaQrAdmin(conta) {
  rondaExigir(conta, false);
  if (conta.perfil !== 'Administração' || !conta.perms.ronda_fazer) throw falha('Somente a Administração pode configurar os pontos.');
}
function rondaQrPontos() { return linhas(tabela('rondaPontos')); }
function rondaQrAtivo(p) { return String(p.ativo).toLowerCase() === 'sim'; }
function rondaQrNormal(v) { return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function rondaQrLista(conta) {
  rondaExigir(conta, false);
  const admin = conta.perfil === 'Administração' && !!conta.perms.ronda_fazer;
  const data = hoje(), dia = String(new Date(data + 'T12:00:00Z').getUTCDay());
  const hora = agora().slice(11,16);
  const historico = linhas(tabela('rondaVisitas')).filter(v => v.data >= somarDias(data, -60));
  const visitas = historico.filter(v => v.data === data);
  const verOs = ['os_ver','os_abrir','os_atender','os_gerenciar'].some(k => conta.perms[k]);
  const ordens = verOs ? linhas(tabela('os')).filter(o => o.status !== OS_STATUS.concluida && o.status !== OS_STATUS.cancelada && setoresDe(conta).includes(osSetor(o))) : [];
  return {pontosQr: rondaQrPontos().filter(p => admin || rondaQrAtivo(p)).map(p => {
    const feitas = visitas.filter(v => v.pontoId === p.id);
    const cumprida = feitas.some(v => v.resultado !== 'NV');
    const prevista = rondaQrAtivo(p) && p.desde <= data && String(p.dias).split(',').includes(dia);
    const os = ordens.filter(o => rondaQrNormal(o.local) === rondaQrNormal(p.local)).map(o => ({id:o.id,numero:o.numero,titulo:o.titulo,status:o.status}));
    const x = {id:p.id,nome:p.nome,local:p.local,ativo:rondaQrAtivo(p),dias:p.dias,limite:p.limite,
      situacao: !rondaQrAtivo(p) ? 'Inativo' : !prevista ? 'Sem programação hoje' : cumprida ? 'Realizada' : hora >= p.limite ? 'Ronda não realizada' : 'Pendente',
      visitas: feitas.map(v => ({quando:v.quando,nome:v.nome,resultado:v.resultado,obs:v.obs})),
      historico:historico.filter(v => v.pontoId === p.id).map(v => ({quando:v.quando,nome:v.nome,resultado:v.resultado,obs:v.obs})), os};
    if (admin) x.token = p.token;
    return x;
  }), podeConfigurarQr:admin};
}
function rondaQrSalvar(r, conta) {
  rondaQrAdmin(conta);
  const t = tabela('rondaPontos'), lista = linhas(t), v = r.ponto || {};
  const anterior = v.id ? lista.find(p => p.id === v.id) : null;
  if (v.id && !anterior) throw falha('Ponto não encontrado.');
  const nome = texto(v.nome,80), local = texto(v.local,120), limite = texto(v.limite,5);
  if (!nome || !local) throw falha('Informe o nome do ponto e o local correspondente nas OS.');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(limite)) throw falha('Informe um horário válido.');
  const dias = String(v.dias || '').split(',');
  if (!dias.length || dias.some(d => !/^[0-6]$/.test(d)) || new Set(dias).size !== dias.length) throw falha('Selecione dias válidos, sem repetição.');
  const novo = {id:anterior ? anterior.id : novoId('RQ'),nome,local,limite,dias:dias.sort().join(','),ativo:v.ativo === false ? 'Não' : 'Sim',
    token:anterior && !r.renovar ? anterior.token : Utilities.getUuid().replace(/-/g,''),
    desde:anterior ? anterior.desde : hoje(),atualizadoEm:agora(),atualizadoPor:conta.nome};
  gravar(t, novo, anterior && anterior._row);
  AUDIT_DET = 'Configurou ponto QR ' + nome + (r.renovar ? ' · código renovado' : '');
  return 'Ponto salvo. Mudanças de horário e dias valem imediatamente; renove e substitua a etiqueta se necessário.';
}
function rondaQrVisitar(r, conta) {
  rondaExigir(conta, true);
  const p = rondaQrPontos().find(p => p.token === texto(r.codigo,80) && rondaQrAtivo(p));
  if (!p) throw falha('QR inválido, inativo ou substituído.');
  if (!['OK','P','C','NV'].includes(r.resultado)) throw falha('Selecione o resultado da vistoria.');
  const obs = texto(r.obs,1000);
  if (r.resultado !== 'OK' && !obs) throw falha('Descreva a ocorrência ou o motivo de não observar o local.');
  const op = texto(r.operacao,80);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(op)) throw falha('Identificação do envio inválida.');
  const t = tabela('rondaVisitas');
  const repetida = linhas(t).find(v => v.operacao === op);
  if (repetida) {
    if (repetida.pontoId !== p.id || repetida.usuario !== conta.usuario || repetida.contaId !== (conta.id || '') || repetida.resultado !== r.resultado || repetida.obs !== obs) throw falha('Esse envio já foi usado para outro registro.');
    return 'Vistoria já registrada; nenhum registro duplicado.';
  }
  gravar(t,{id:novoId('RV'),pontoId:p.id,pontoNome:p.nome,data:hoje(),quando:agora(),usuario:conta.usuario,contaId:conta.id || '',nome:conta.nome,resultado:r.resultado,obs,operacao:op});
  AUDIT_DET = 'Vistoriou ponto QR ' + p.nome + ' · ' + r.resultado;
  return r.resultado === 'NV' ? 'Não observado registrado. A ronda continua pendente neste ponto.' : 'Vistoria registrada no ponto ' + p.nome + '.';
}

// Correspondências: controle manual, exclusivo do perfil Administração.
function corrExigir(conta) {
  if (!conta || conta.perfil !== 'Administração') throw falha('Somente a Administração pode acessar correspondências.');
}
function corrPublica(x) { const o = Object.assign({}, x); delete o._row; delete o.operacaoId; return o; }
function corrSalvar(req, conta) {
  corrExigir(conta);
  const t = tabela('correspondencias'), lista = linhas(t), v = req.correspondencia || {};
  if (req.op === 'receber') {
    const operacaoId = texto(req.operacaoId, 80);
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(operacaoId)) throw falha('Identificador da operação inválido.');
    if (lista.some(x => x.operacaoId === operacaoId)) return 'Recebimento já registrado.';
    const o = {bloco:texto(v.bloco,40), unidade:texto(v.unidade,30), destinatario:texto(v.destinatario,100), tipo:texto(v.tipo,30), transportadora:texto(v.transportadora,80), rastreio:texto(v.rastreio,100), local:texto(v.local,100), obs:texto(v.obs,500)};
    if (!o.bloco || !o.unidade || !o.destinatario || !o.local) throw falha('Informe bloco, unidade, destinatário e local de guarda.');
    if (!['Encomenda','Carta','Documento','Outro'].includes(o.tipo)) throw falha('Tipo de correspondência inválido.');
    Object.assign(o,{id:novoId('CR'),operacaoId,status:'Aguardando retirada',recebidoEm:agora(),recebidoPor:conta.nome,versao:1});
    gravar(t,o); AUDIT_DET = 'Recebeu correspondência '+o.id+' · '+o.bloco+'/'+o.unidade;
    return 'Recebimento registrado.';
  }
  const ja = lista.find(x => x.id === String(req.id || ''));
  if (!ja) throw falha('Correspondência não encontrada.');
  const alvo = req.op === 'entregar' ? 'Entregue' : req.op === 'cancelar' ? 'Cancelada' : '';
  if (!alvo) throw falha('Operação inválida.');
  if (ja.status !== 'Aguardando retirada') throw falha('Este registro já foi finalizado. Atualize a lista.');
  if (Number(req.versao) !== Number(ja.versao)) throw falha('O registro mudou. Atualize a lista antes de continuar.');
  const o = {status:alvo,versao:Number(ja.versao)+1};
  if (req.op === 'entregar') {
    o.retiradoPor = texto(req.retiradoPor,100);
    if (!o.retiradoPor) throw falha('Informe quem retirou a correspondência.');
    o.retiradoEm = agora(); o.entreguePor = conta.nome;
  } else {
    o.motivo = texto(req.motivo,500);
    if (!o.motivo) throw falha('Informe o motivo do cancelamento.');
    o.canceladoEm = agora(); o.canceladoPor = conta.nome;
  }
  gravar(t,o,ja._row); AUDIT_DET = alvo+' · correspondência '+ja.id+' · '+ja.bloco+'/'+ja.unidade;
  return alvo === 'Entregue' ? 'Retirada registrada.' : 'Recebimento cancelado; histórico preservado.';
}

// ---------- Guaritas Sul e Norte: visitantes e prestadores de serviço ----------
// Cada guarita tem a sua permissão (gua_sul / gua_norte); o perfil Porteiro é criado com as duas.
const GUARITAS = { Sul: 'gua_sul', Norte: 'gua_norte' };
const GUA_TIPOS = ['Visitante', 'Prestador de serviço', 'Entregador', 'Outro'];
function guaExigir(conta, g) {
  if (!GUARITAS[g]) throw falha('Guarita inválida.');
  if (!conta || !conta.perms || !conta.perms[GUARITAS[g]]) throw falha('Seu perfil não tem acesso à Guarita ' + g + '.');
}
function guaPublica(x) { const o = Object.assign({}, x); delete o._row; delete o.operacaoId; return o; }
// quem está dentro (qualquer data) e as entradas dos últimos dias (padrão 7, até 90)
function guaLista(req, conta) {
  const g = texto(req.guarita, 10); guaExigir(conta, g);
  const dias = Math.min(90, Math.max(1, Math.floor(Number(req.dias)) || 7));
  const desde = Utilities.formatDate(new Date(Date.now() - (dias - 1) * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const l = linhasOnde(tabela('gua'), ['guarita', 'status', 'entradaEm'], o => o.guarita === g && (o.status === 'Dentro' || String(o.entradaEm).slice(0, 10) >= desde));
  return { guarita: g, dias, registros: l.map(guaPublica) };
}
function guaSalvar(req, conta) {
  const g = texto(req.guarita, 10); guaExigir(conta, g);
  const t = tabela('gua');
  if (req.op === 'entrada') {
    const operacaoId = texto(req.operacaoId, 80);
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(operacaoId)) throw falha('Identificador da operação inválido.');
    if (linhasOnde(t, ['operacaoId'], o => o.operacaoId === operacaoId).length) return 'Entrada já registrada.';
    const v = req.registro || {};
    const o = { guarita: g, tipo: texto(v.tipo, 30), nome: texto(v.nome, 100), documento: texto(v.documento, 30), empresa: texto(v.empresa, 100),
      bloco: texto(v.bloco, 60), unidade: texto(v.unidade, 30), autorizadoPor: texto(v.autorizadoPor, 100), placa: texto(v.placa, 10).toUpperCase(), obs: texto(v.obs, 500) };
    if (GUA_TIPOS.indexOf(o.tipo) < 0) throw falha('Tipo inválido.');
    if (!o.nome || !o.bloco) throw falha('Informe o nome e o destino (bloco ou área).');
    if (o.tipo === 'Prestador de serviço' && !o.empresa) throw falha('Informe a empresa ou o serviço do prestador.');
    Object.assign(o, { id: novoId('GU'), operacaoId, status: 'Dentro', entradaEm: agora(), entradaPor: conta.nome, versao: 1 });
    gravar(t, o);
    AUDIT_DET = 'Entrada na Guarita ' + g + ' · ' + o.tipo + ' · ' + o.id;
    return 'Entrada registrada.';
  }
  const id = String(req.id || '');
  const ja = id ? linhasOnde(t, ['id'], o => o.id === id)[0] : null;
  if (!ja || ja.guarita !== g) throw falha('Registro não encontrado. Atualize a lista.');
  if (ja.status !== 'Dentro') throw falha('Este registro já foi finalizado. Atualize a lista.');
  if (Number(req.versao) !== Number(ja.versao)) throw falha('O registro mudou. Atualize a lista antes de continuar.');
  const o = { versao: Number(ja.versao) + 1 };
  if (req.op === 'saida') { o.status = 'Saiu'; o.saidaEm = agora(); o.saidaPor = conta.nome; }
  else if (req.op === 'cancelar') {
    o.motivo = texto(req.motivo, 500);
    if (!o.motivo) throw falha('Informe o motivo do cancelamento.');
    o.status = 'Cancelado'; o.canceladoEm = agora(); o.canceladoPor = conta.nome;
  } else throw falha('Operação inválida.');
  gravar(t, o, ja._row);
  AUDIT_DET = (o.status === 'Saiu' ? 'Saída' : 'Cancelou entrada') + ' · Guarita ' + g + ' · ' + ja.id;
  return o.status === 'Saiu' ? 'Saída registrada.' : 'Registro cancelado; o histórico fica guardado.';
}

// ---------- Quadro de avisos da Guarita Norte ----------
// Publicar, alterar e arquivar: só o perfil Administração. Ler e dar ciente: quem tem a Guarita Norte (e a Administração).
const AV_PRIOR = ['Normal', 'Importante', 'Urgente'];
function avAdm(conta) { return !!conta && conta.perfil === PERFIL_TOTAL; }
function avExigirLer(conta) { if (!avAdm(conta) && !(conta && conta.perms && conta.perms.gua_norte)) throw falha('Seu perfil não tem acesso ao quadro de avisos da Guarita Norte.'); }
function avCientes(x) { try { const l = JSON.parse(x.cientes || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function avLista(conta) {
  avExigirLer(conta);
  const h = hoje(), adm = avAdm(conta), limite = Utilities.formatDate(new Date(Date.now() - 30 * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const l = linhas(tabela('avisos')).map(x => {
    const vencido = !!x.validoAte && x.validoAte < h, ativo = x.status === 'Ativo' && !vencido, cientes = avCientes(x);
    return { id: x.id, titulo: x.titulo, texto: x.texto, prioridade: x.prioridade, validoAte: x.validoAte, ativo, status: x.status === 'Ativo' && vencido ? 'Vencido' : x.status,
      criadoEm: x.criadoEm, criadoPor: x.criadoPor, editadoEm: x.editadoEm, editadoPor: x.editadoPor, versao: x.versao,
      cientes: adm ? cientes : [], euCiente: cientes.some(c => c.u === conta.usuario) };
  }).filter(x => x.ativo || (adm && String(x.editadoEm || x.criadoEm).slice(0, 10) >= limite));
  return { avisos: l, avAdm: adm };
}
function avSalvar(req, conta) {
  const t = tabela('avisos');
  if (req.op === 'ciente') {
    avExigirLer(conta);
    const x = linhasOnde(t, ['id'], o => o.id === String(req.id || ''))[0];
    if (!x || x.status !== 'Ativo') throw falha('Aviso não encontrado. Atualize a tela.');
    const l = avCientes(x);
    if (l.some(c => c.u === conta.usuario)) return 'Você já estava ciente.';
    l.push({ u: conta.usuario, n: conta.nome, em: agora() });
    gravar(t, { cientes: JSON.stringify(l) }, x._row);
    AUDIT_DET = 'Ciente do aviso ' + x.id;
    return 'Ciente registrado.';
  }
  if (!avAdm(conta)) throw falha('Somente a Administração pode publicar ou alterar avisos.');
  if (req.op === 'arquivar') {
    const x = linhasOnde(t, ['id'], o => o.id === String(req.id || ''))[0];
    if (!x) throw falha('Aviso não encontrado. Atualize a tela.');
    gravar(t, { status: 'Arquivado', editadoEm: agora(), editadoPor: conta.nome, versao: Number(x.versao || 1) + 1 }, x._row);
    AUDIT_DET = 'Arquivou aviso ' + x.id;
    return 'Aviso retirado do quadro.';
  }
  const v = req.aviso || {};
  const o = { titulo: texto(v.titulo, 100), texto: texto(v.texto, 2000), prioridade: texto(v.prioridade, 20), validoAte: texto(v.validoAte, 10) };
  if (!o.titulo || !o.texto) throw falha('Informe o título e o recado.');
  if (AV_PRIOR.indexOf(o.prioridade) < 0) throw falha('Prioridade inválida.');
  if (o.validoAte && !/^\d{4}-\d{2}-\d{2}$/.test(o.validoAte)) throw falha('Data de validade inválida.');
  if (o.validoAte && o.validoAte < hoje()) throw falha('A validade não pode ser no passado.');
  if (req.op === 'criar') {
    Object.assign(o, { id: novoId('AV'), status: 'Ativo', criadoEm: agora(), criadoPor: conta.nome, cientes: '[]', versao: 1 });
    gravar(t, o);
    AUDIT_DET = 'Publicou aviso ' + o.id;
    return 'Aviso publicado. Os porteiros serão avisados na tela.' + telegramAvisar(o, 'Novo aviso');
  }
  if (req.op === 'editar') {
    const x = linhasOnde(t, ['id'], q => q.id === String(req.id || ''))[0];
    if (!x || x.status !== 'Ativo') throw falha('Aviso não encontrado. Atualize a tela.');
    if (Number(req.versao) !== Number(x.versao)) throw falha('O aviso mudou. Atualize a tela antes de alterar.');
    // recado alterado: todos precisam dar ciente de novo
    Object.assign(o, { editadoEm: agora(), editadoPor: conta.nome, cientes: '[]', versao: Number(x.versao) + 1 });
    gravar(t, o, x._row);
    AUDIT_DET = 'Alterou aviso ' + x.id;
    return 'Aviso alterado. Os porteiros serão avisados de novo.' + telegramAvisar(Object.assign({}, x, o), 'Aviso alterado');
  }
  throw falha('Operação inválida.');
}

// ---------- Telegram: avisos no celular (teste com o Telegram do Auxiliar, 11/11/2026) ----------
// Configuração (feita uma vez, no editor do Apps Script — o código do robô NUNCA vai para o GitHub nem para o chat):
//  1. No Telegram, fale com @BotFather → /newbot → escolha nome e usuário do robô; ele entrega um código (token).
//  2. Aqui: Configurações do projeto → Propriedades do script → Adicionar: TELEGRAM_TOKEN = (o código do robô).
//  3. No Telegram, abra o robô novo e mande /start.
//  4. Aqui no editor, escolha a função telegramConectar e clique em Executar (autorize o acesso a serviços externos).
//     Ela grava quem mandou /start e manda uma mensagem de teste. Para recomeçar a lista: telegramDesconectarTodos.
function telegramToken() { return String(PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN') || '').trim(); }
function telegramChats() { try { const l = JSON.parse(PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHATS') || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function telegramApi(metodo, dados) {
  const tk = telegramToken();
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(tk)) throw new Error('TELEGRAM_TOKEN ausente ou inválido nas Propriedades do script.');
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + tk + '/' + metodo, { method: 'post', contentType: 'application/json', payload: JSON.stringify(dados || {}), muteHttpExceptions: true });
  const j = JSON.parse(r.getContentText() || '{}');
  if (!j.ok) throw new Error('Telegram recusou (' + metodo + '): ' + (j.description || r.getResponseCode()));
  return j.result;
}
function telegramH(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function telegramConectar() {
  const ups = telegramApi('getUpdates', { allowed_updates: ['message'] }) || [];
  const chats = telegramChats(), ja = {};
  chats.forEach(c => { ja[c.id] = true; });
  let novos = 0, maxId = 0;
  ups.forEach(u => {
    maxId = Math.max(maxId, u.update_id || 0);
    const m = u.message; if (!m || !m.chat || m.chat.type !== 'private' || !/^\/start\b/.test(String(m.text || ''))) return;
    if (ja[m.chat.id]) return;
    ja[m.chat.id] = true; novos++;
    chats.push({ id: m.chat.id, nome: [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || m.chat.username || 'sem nome', em: agora() });
  });
  if (maxId) telegramApi('getUpdates', { offset: maxId + 1 });
  PropertiesService.getScriptProperties().setProperty('TELEGRAM_CHATS', JSON.stringify(chats));
  chats.forEach(c => { try { telegramApi('sendMessage', { chat_id: c.id, parse_mode: 'HTML', text: '✅ <b>Pier Gestão conectado</b>\nVocê vai receber aqui os avisos do quadro da Guarita Norte.' }); } catch (e) {} });
  const msg = 'Telegram: ' + chats.length + ' contato(s) conectado(s) (' + novos + ' novo(s)): ' + chats.map(c => c.nome).join(', ');
  console.log(msg);
  return msg;
}
// teste pelo editor, sem publicar nada no quadro: manda um aviso de exemplo para quem está conectado
function telegramTesteAviso() {
  const r = telegramAvisar({ titulo: 'Teste do Pier Gestão', texto: 'Este é um aviso de teste. Se chegou aqui, os avisos do quadro vão chegar no seu Telegram.', prioridade: 'Importante', criadoPor: 'Teste pelo editor' }, 'Aviso de teste');
  console.log(r || 'Ninguém conectado: rode telegramConectar primeiro.');
  return r;
}
function telegramDesconectarTodos() { PropertiesService.getScriptProperties().deleteProperty('TELEGRAM_CHATS'); return 'Lista do Telegram apagada.'; }
// manda o aviso do quadro para quem está conectado; nunca impede a publicação se o Telegram falhar
function telegramAvisar(a, rotulo) {
  const chats = telegramChats(); if (!chats.length || !telegramToken()) return '';
  const icone = a.prioridade === 'Urgente' ? '🚨' : a.prioridade === 'Importante' ? '⚠️' : '📢';
  const texto = icone + ' <b>' + telegramH(rotulo) + ' · ' + telegramH(String(a.prioridade || 'Normal').toUpperCase()) + '</b>\n\n<b>' + telegramH(a.titulo) + '</b>\n'
    + telegramH(a.texto) + '\n\n<i>Publicado por ' + telegramH(a.editadoPor || a.criadoPor || '') + (a.validoAte ? ' · válido até ' + String(a.validoAte).split('-').reverse().join('/') : '') + '</i>'
    + '\n\nAbra o Pier Gestão para dar ciente: https://piergestao.condominiopier.com.br';
  let ok = 0;
  chats.forEach(c => { try { telegramApi('sendMessage', { chat_id: c.id, parse_mode: 'HTML', text: texto.slice(0, 4000), disable_web_page_preview: true }); ok++; } catch (e) { console.log('Telegram: falhou para ' + c.nome + ': ' + e.message); } });
  return ok ? ' Enviado no Telegram (' + ok + ').' : ' (O Telegram não respondeu; o aviso está no quadro.)';
}

// ---------- Barco do condomínio (Guarita Sul): controle de passageiros por viagem ----------
const BARCO_CATS = ['Morador(a)', 'Funcionário(a)', 'Pier', 'Visitante', 'Prestador de serviço'];
const BARCO_GRADES = ['Dias úteis', 'Fim de semana e feriado'];
function barcoData(v) { const d = texto(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw falha('Data inválida.'); return d; }
function barcoPublica(x) { const o = Object.assign({}, x); delete o._row; delete o.operacaoId; return o; }
function barcoDia(req, conta) {
  guaExigir(conta, 'Sul');
  const data = barcoData(req.data);
  const passageiros = linhasOnde(tabela('barco'), ['data'], o => o.data === data).map(barcoPublica);
  const dia = linhasOnde(tabela('barcod'), ['data'], o => o.data === data)[0] || null;
  if (dia) delete dia._row;
  return { data, passageiros, dia };
}
function barcoMes(req, conta) {
  guaExigir(conta, 'Sul');
  const mes = texto(req.mes, 7); if (!/^\d{4}-\d{2}$/.test(mes)) throw falha('Mês inválido.');
  const passageiros = linhasOnde(tabela('barco'), ['data', 'status'], o => o.data.slice(0, 7) === mes && o.status !== 'Removido').map(barcoPublica);
  const dias = linhasOnde(tabela('barcod'), ['data'], o => o.data.slice(0, 7) === mes).map(o => { delete o._row; return o; });
  return { mes, passageiros, dias };
}
// Blocos e números de apartamento para o menu suspenso do passageiro. Só bloco e número saem daqui (nenhum dado de morador),
// por isso basta ter a Guarita Sul. A fonte é o cadastro de unidades da Administração.
function barcoUnidades(conta) {
  guaExigir(conta, 'Sul');
  const us = linhas(tabela('un')).map(u => ({ bloco: String(u.bloco || '').trim(), numero: String(u.numero || '').trim() })).filter(u => u.bloco && u.numero);
  const por = {};
  us.forEach(u => { (por[u.bloco] = por[u.bloco] || []).push(u.numero); });
  const cmp = (a, b) => (Number(a) || 0) - (Number(b) || 0) || String(a).localeCompare(String(b), 'pt-BR');
  const blocos = unBlocos(us).filter(b => por[b]).map(b => { const m = /^\s*(\d+)/.exec(b); return { bloco: b, curto: m ? m[1] : b, unidades: por[b].slice().sort(cmp) }; });
  return { blocos };
}
// Nomes dos moradores para a busca por inicial no lançamento do passageiro (pedido de 11/11/2026).
// Sai só o nome, o bloco, a unidade e se tem acesso ao barco — nada de contatos, documentos ou parentesco.
function barcoMoradores(conta) {
  guaExigir(conta, 'Sul');
  const l = linhas(tabela('unp')).map(m => {
    const bloco = String(m.bloco || '').trim(), mm = /^\s*(\d+)/.exec(bloco);
    return { nome: String(m.nome || '').trim(), bloco, curto: mm ? mm[1] : bloco, numero: String(m.numero || '').trim(), barco: /^s/i.test(String(m.barco || '')) };
  }).filter(m => m.nome && m.bloco);
  return { moradores: l };
}
function barcoSalvar(req, conta) {
  guaExigir(conta, 'Sul');
  const data = barcoData(req.data);
  if (req.op === 'passageiro') {
    const t = tabela('barco'), operacaoId = texto(req.operacaoId, 80);
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(operacaoId)) throw falha('Identificador da operação inválido.');
    if (linhasOnde(t, ['operacaoId'], o => o.operacaoId === operacaoId).length) return 'Passageiro já registrado.';
    const v = req.passageiro || {};
    const o = { data, grade: texto(v.grade, 40), horario: texto(v.horario, 5), trajeto: texto(v.trajeto, 60), nome: texto(v.nome, 100), categoria: texto(v.categoria, 30),
      blocoApto: texto(v.blocoApto, 30), qtd: Math.floor(Number(v.qtd) || 1), obs: texto(v.obs, 300) };
    if (BARCO_GRADES.indexOf(o.grade) < 0) throw falha('Grade de horários inválida.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.horario) || !o.trajeto) throw falha('Informe o horário e o trajeto da viagem.');
    if (BARCO_CATS.indexOf(o.categoria) < 0) throw falha('Escolha morador(a), funcionário(a), Pier, visitante ou prestador de serviço.');
    if (!o.nome) throw falha('Informe o nome do passageiro.');
    if (o.qtd < 1 || o.qtd > 50) throw falha('Quantidade inválida (1 a 50).');
    Object.assign(o, { id: novoId('BA'), operacaoId, status: 'Ativo', registradoEm: agora(), registradoPor: conta.nome });
    gravar(t, o);
    AUDIT_DET = 'Barco ' + data + ' ' + o.horario + ' · ' + o.categoria + ' · ' + o.id;
    return 'Passageiro registrado.';
  }
  if (req.op === 'remover') {
    const t = tabela('barco'), id = String(req.id || '');
    const ja = id ? linhasOnde(t, ['id'], o => o.id === id)[0] : null;
    if (!ja || ja.data !== data) throw falha('Passageiro não encontrado. Atualize a tela.');
    if (ja.status === 'Removido') return 'Este passageiro já tinha sido removido.';
    gravar(t, { status: 'Removido', canceladoEm: agora(), canceladoPor: conta.nome }, ja._row);
    AUDIT_DET = 'Removeu passageiro do barco ' + data + ' · ' + ja.id;
    return 'Passageiro removido; o histórico fica guardado.';
  }
  if (req.op === 'dia') {
    const t = tabela('barcod'), v = req.dia || {}, hora = h => { const s = texto(h, 5); if (s && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw falha('Horário inválido: ' + s); return s; };
    const o = { id: 'BD-' + data, data, operadorDia: texto(v.operadorDia, 100), operadorNoite: texto(v.operadorNoite, 100), almocoDe: hora(v.almocoDe), almocoAte: hora(v.almocoAte),
      jantaDe: hora(v.jantaDe), jantaAte: hora(v.jantaAte), obs: texto(v.obs, 300), atualizadoEm: agora(), atualizadoPor: conta.nome };
    const ja = linhasOnde(t, ['data'], x => x.data === data)[0];
    gravar(t, o, ja ? ja._row : undefined);
    AUDIT_DET = 'Turno do barco ' + data;
    return 'Turno do dia salvo.';
  }
  // viagem que não saiu por maré alta: marcar ou desmarcar (fica em vermelho na tela)
  if (req.op === 'mare') {
    const t = tabela('barcod'), horario = texto(req.horario, 5), trajeto = texto(req.trajeto, 60);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario) || !trajeto) throw falha('Informe o horário e o trajeto da viagem.');
    const ja = linhasOnde(t, ['data'], x => x.data === data)[0];
    let l = []; try { l = JSON.parse((ja && ja.mare) || '[]'); if (!Array.isArray(l)) l = []; } catch (e) { l = []; }
    const chave = horario + '|' + trajeto, tinha = l.some(x => x.v === chave);
    if (req.ativo && !tinha) l.push({ v: chave, por: conta.nome, em: agora() });
    if (!req.ativo) l = l.filter(x => x.v !== chave);
    const o = { mare: JSON.stringify(l), atualizadoEm: agora(), atualizadoPor: conta.nome };
    if (ja) gravar(t, o, ja._row); else gravar(t, Object.assign({ id: 'BD-' + data, data }, o));
    AUDIT_DET = (req.ativo ? 'Maré alta' : 'Desfez maré alta') + ' · barco ' + data + ' ' + horario;
    return req.ativo ? 'Viagem marcada como MARÉ ALTA.' : 'Marcação de maré alta retirada.';
  }
  throw falha('Operação inválida.');
}

// Ativação exclusiva da planilha oficial informada por Alexsandro.
function exigirPlanilhaProducaoPier20() {
  const ss=SpreadsheetApp.getActive();
  if (!ss || ss.getId() !== '15wnsofNNPt8E5HydcJaFfmQpDGAtyF45ErcwkIHhlm8') throw new Error('Use o projeto vinculado à planilha oficial PIER GESTÃO.');
  ['Usuarios','Perfis','Itens','Movimentacoes'].forEach(nome=>{if(!ss.getSheetByName(nome))throw new Error('Aba obrigatória ausente: '+nome+'. A ativação foi interrompida.');});
}
function ativarProducaoPier20() {
  exigirPlanilhaProducaoPier20();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Outro registro está em andamento. Tente novamente.');
  try {
    // Confere cabeçalhos obrigatórios antes de criar colunas ou preencher IDs.
    ['itens','movs'].forEach(k => {
      const d = ABAS[k], sh = SpreadsheetApp.getActive().getSheetByName(d.nome);
      if (!sh) throw new Error('Aba ausente: ' + d.nome);
      const cab = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
      if (d.cols.some(c => !(d.opcionais || []).includes(c[0]) && !cab.includes(c[1]))) throw new Error('Cabeçalho incompatível em ' + d.nome);
    });
    const U = lerUsuarios(), ids = new Set();
    U.lista.forEach(u => { if (u.uid && ids.has(u.uid)) throw new Error('Há ID de conta duplicado. Revise antes de migrar.'); if (u.uid) ids.add(u.uid); });
    TABS = {};
    tabela('cont'); tabela('movs');
    const n = garantirIdsUsuarios(true);
    garantirColunasPerfis(abaPerfis());
    if (!lerRetrato()) atualizarRetrato();
    // A migração inicial encerra as sessões antigas, que ainda não possuíam ID fixo.
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('PIER_INVENTARIO_V4') !== 'pronto') {
      lerUsuarios().lista.forEach(u => encerrarSessoesDe(u.usuario));
      props.setProperty('PIER_INVENTARIO_V4','pronto');
    }
    SpreadsheetApp.flush();
    props.setProperty('PIER_AMBIENTE','producao');
    props.setProperty('PIER_PRODUCAO_ID',SpreadsheetApp.getActive().getId());
    return 'Produção ativada. '+n+' conta(s) receberam ID fixo. Dados e senhas preservados. Atualize a implantação existente.';
  } finally { lock.releaseLock(); }
}

const TERMO_MAPA_B64 = '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';
// Texto do "Termo de responsabilidade para reserva e uso do Espaço Gourmet" (PDF da Administração, 11/2026).
// Marcas: "# " título de seção, "1. " item, "a. " subitem, "! " destaque, "@mapa" figura das áreas. {DATA} {NOME} {BLOCO} {UNIDADE} {VALOR} {VALOR_EXT}
const TERMO_GOURMET = [
  '! EU, {NOME}, UNIDADE {UNIDADE}, BLOCO {BLOCO}, DECLARO QUE TENHO CIÊNCIA DO COMPROMISSO DE UTILIZAÇÃO QUE ESTOU ASSUMINDO COM O CONDOMÍNIO, COM AS SEGUINTES OBRIGAÇÕES QUE DEVO CUMPRIR, A SEGUIR LISTADAS:',
  '1. A COBRANÇA: vem junto com a Taxa de Condomínio, da Taxa de utilização do Espaço Gourmet, que será de {VALOR} ({VALOR_EXT}) para a vigência 2025-2026.',
  '2. CANCELAMENTO: conforme consta do item 9.12 do Regulamento Interno, o cancelamento ou alteração da data do evento, garantido o crédito correspondente ao desconto realizado, somente será considerado se avisado por escrito à Administração com antecedência mínima de 07 (sete) dias corridos; caso contrário, o evento ter-se-á como havido.',
  '3. A ENTREGA DAS CHAVES ocorrerá SOMENTE APÓS A VISTORIA dos ambientes e fornecimento da lista de convidados não moradores, para ser mantida nas Guaritas Norte e Sul durante todo o período de realização do evento. Esta reserva é para realização de evento relacionado a MORADOR do Condomínio Residencial Pier (CPR).',
  '4. É VEDADA a utilização do Espaço Gourmet para atividades político-partidárias, religiosas, mercantis e jogos considerados de "azar" pela legislação pertinente.',
  '5. A MÁQUINA DE GELO é para uso exclusivo dos moradores, não sendo permitido o abastecimento para o evento.',
  '# REGRAS BÁSICAS DE USO DO ESPAÇO GOURMET',
  '1. O morador responsável pelo evento e os responsáveis pelo buffet e pela animação/som deverão ZELAR PELA ORGANIZAÇÃO E SILÊNCIO DURANTE O INÍCIO, MEIO E TÉRMINO DO EVENTO;',
  '2. O Espaço Gourmet NÃO PODE SER RESERVADO OU UTILIZADO PARA EVENTOS DE NÃO MORADORES;',
  '3. A cessão do Espaço Gourmet será das 08:00 DO DIA DO EVENTO ATÉ AS 24:00. Sendo assim, deve haver planejamento para que a desmobilização da copa/cozinha e a saída dos convidados aconteçam antes desse horário;',
  '4. Aparelhos sonoros só serão permitidos DENTRO do Espaço Gourmet e com uso limitado às 22:00, devendo ser utilizados com moderação durante todo o período;',
  '5. É recomendada visita de reconhecimento, pois o espaço é restrito a eventos com até 60 PESSOAS; além disso, É OBRIGATÓRIO DEIXAR A LISTA DE CONVIDADOS, com até 24 horas de antecedência, na Administração;',
  '6. A mudança, retirada ou acréscimo dos móveis da área externa ou do interior do Espaço Gourmet somente ocorrerá com a PRESENÇA do funcionário do CPR responsável pela condução do checklist;',
  '7. É proibido o uso de BOTIJÃO DE GÁS na copa/cozinha ou em qualquer outro ambiente, bem como a utilização da área externa para elaboração de alimentos, sendo permitido apenas na copa/cozinha do Espaço Gourmet;',
  '8. EM NENHUMA HIPÓTESE é permitido o uso do hall social do Bloco 06 para depósito de qualquer material de festa, ou seja, nenhum material poderá ser estocado em dependências que não sejam o interior do Espaço Gourmet;',
  '9. Não é permitido o USO de COLAS, FITAS ADESIVAS, GRAMPOS E PREGOS nos tetos, paredes e/ou móveis do Espaço Gourmet e nas áreas externas;',
  '10. Não é permitido pendurar OBJETOS DE DECORAÇÃO (BOLAS ETC.) nos extintores e/ou sprinklers ("chuveirinhos de incêndio"), devendo o morador utilizar os ganchos existentes no teto do Espaço Gourmet, instalados pela Administração para essa finalidade;',
  '11. A porta de acesso à copa/cozinha do Espaço Gourmet DEVERÁ PERMANECER FECHADA;',
  '12. Havendo necessidade de qualquer tipo de limpeza (escadas, hall social do Bloco 06, elevador de serviço, garagem e corredores) ou qualquer imprevisto, FAVOR COMUNICAR a Guarita Norte (ramais 9 e 5112) ou a Guarita Sul (ramais 10 e 1111); e',
  '13. Uso de brinquedos ou similares:',
  'a. A utilização destes equipamentos não deverá ultrapassar o teto do pavimento térreo (altura máxima de 2,5 m);',
  'b. A utilização destes equipamentos não poderá causar incômodos ou perturbação do sossego, ou ainda desconforto aos demais moradores do Condomínio;',
  'c. A utilização destes equipamentos não deverá causar ruído ou barulho que cause perturbação do sossego aos demais moradores do Condomínio;',
  'd. A utilização destes equipamentos não poderá prejudicar a circulação de pessoas nas partes comuns da edificação;',
  'e. A utilização destes equipamentos é de inteira responsabilidade do morador, sendo que qualquer dano sofrido por terceiros ou seus convidados será de inteira responsabilidade do mesmo, sem qualquer relação com o condomínio;',
  'f. A utilização destes equipamentos deverá respeitar a projeção da fachada da edificação e ser utilizada dentro da área permitida no mapa abaixo;',
  'g. A utilização destes equipamentos não poderá ser realizada nos jardins, gramado ou área comum do condomínio;',
  'h. A utilização destes equipamentos, havendo descarte de resíduos e/ou escoamento de líquidos de qualquer natureza (inclusive água e sabão), não pode ser realizada.',
  'O descumprimento dessas regras, bem como eventuais reclamações de moradores devido ao uso inadequado, implicará o desligamento imediato do equipamento e sua remoção do espaço condominial. Qualquer dano causado às áreas comuns, comprovadamente decorrente da utilização de brinquedos ou similares, deverá ser ressarcido pelo morador responsável.',
  '14. AS ÁREAS DISPONÍVEIS PARA OS PARTICIPANTES DOS EVENTOS ESTÃO MARCADAS EM AZUL NA FIGURA ABAIXO:',
  '@mapa',
  '! EU, {NOME}, MORADOR(A) DO BLOCO {BLOCO}, UNIDADE {UNIDADE}, DECLARO QUE TENHO CIÊNCIA DO COMPROMISSO DE UTILIZAÇÃO QUE ESTOU ASSUMINDO COM O CONDOMÍNIO E DEMAIS MORADORES, COM AS OBRIGAÇÕES QUE DEVO CUMPRIR LISTADAS ACIMA NA RESERVA FEITA DO ESPAÇO GOURMET PARA O DIA {DATA}. COM A ASSINATURA DESTE TERMO, RECONHEÇO E AUTORIZO, BASEANDO-SE NO REGULAMENTO INTERNO E CONVENÇÃO DO CONDOMÍNIO, A AUTOMÁTICA NOTIFICAÇÃO/PENALIZAÇÃO POR PARTE DA ADMINISTRAÇÃO, CASO AS REGRAS SUPRACITADAS SEJAM QUEBRADAS. A PENALIZAÇÃO SERÁ PECUNIÁRIA NO VALOR DE R$ 1.500,00, POR QUALQUER DESCUMPRIMENTO DAS REGRAS SE, APÓS INFORMADO PELO COLABORADOR DO CONDOMÍNIO, NÃO SE FIZER CESSAR TAL DESCUMPRIMENTO. ESTE TERMO SERVE COMO DOCUMENTO HÁBIL PARA EVENTUAL COBRANÇA DA PENALIDADE, CASO A MESMA SEJA APLICADA.'
];
const TERMO_RODAPE = 'Est. da Barra da Tijuca, 231 - Barra da Tijuca - Rio de Janeiro - RJ - CEP 22.611-201 · Tel.: (21) 2117-1847 / 2117-1834 · E-mail: adm@condominiopier.com.br';
