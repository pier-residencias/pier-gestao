// =====================================================================================================
// AJUDA DA IA NAS COTAÇÕES (OPCIONAL)
// NÃO INSTALAR antes de existir a conta de API da Anthropic (console.anthropic.com).
// Para ligar:
//   1. No Apps Script, crie um arquivo novo chamado IA e cole este conteúdo (o Codigo.gs continua como está).
//   2. Em Configurações do projeto → Propriedades do script, crie ANTHROPIC_API_KEY com a chave da conta
//      (a chave nunca vai para o site nem para o GitHub). Opcional: IA_MODELO e IA_LIMITE_DIA.
//   3. Execute a função autorizar uma vez: o Google vai pedir a permissão de "conectar a um serviço externo".
//   4. Implante uma nova versão. Os botões de IA aparecem sozinhos na tela de Cotações.
// O que vai para a IA: só os dados da cotação (itens, fornecedores, preços) e o orçamento anexado que for lido.
// Cada uso fica na Auditoria ("Usou a IA") e há um limite de consultas por dia.
// =====================================================================================================

const IA = {
  url: 'https://api.anthropic.com/v1/messages',
  versaoApi: '2023-06-01',
  modeloPadrao: 'claude-sonnet-5-5',
  limiteDia: 40,
  sistema: 'Você ajuda a administração do Pier Residências, um condomínio residencial na Barra da Tijuca (Rio de Janeiro), ' +
    'a fazer cotações de compras e serviços. Responda sempre em português do Brasil. Seja exato com números: não invente ' +
    'valores, prazos ou dados que não estejam no material. Quando um dado não existir, deixe o campo vazio.'
};

// entrada única, chamada pelo Codigo.gs (cotIA) quando a chave existe
function iaCotacao(r, conta) {
  const props = PropertiesService.getScriptProperties();
  const chave = props.getProperty('ANTHROPIC_API_KEY');
  if (!chave) throw falha('A chave da IA não está configurada.');
  const c = linhas(tabela('cot')).find(x => x.id === texto(r.id, 40));
  if (!c) throw falha('Cotação não encontrada.');
  const cot = cotLer(c);
  const tipos = { ler: 'Leu orçamento', comparar: 'Comparou propostas', pedido: 'Escreveu pedido de cotação', referencia: 'Pesquisou preço de referência' };
  if (!tipos[r.tipo]) throw falha('Pedido inválido para a IA.');
  // limite diário de consultas (controle de custo)
  const kUso = 'IA_USO_' + hoje(), usados = Number(props.getProperty(kUso) || 0);
  const limite = Number(props.getProperty('IA_LIMITE_DIA') || IA.limiteDia);
  if (usados >= limite) throw falha('O limite de ' + limite + ' consultas à IA por dia foi atingido. Tente amanhã.');
  props.setProperty(kUso, String(usados + 1));
  let out;
  if (r.tipo === 'ler') out = iaLerOrcamento(cot, r, chave);
  else if (r.tipo === 'comparar') out = iaComparar(cot, chave);
  else if (r.tipo === 'pedido') out = iaPedido(cot, chave);
  else out = iaReferencia(cot, chave);
  auditar(conta, 'Usou a IA', tipos[r.tipo] + ' · ' + cot.numero);
  return out;
}

// chamada à API de mensagens; devolve o texto final da resposta
function iaChamar(chave, conteudo, opcoes) {
  opcoes = opcoes || {};
  const corpo = {
    model: PropertiesService.getScriptProperties().getProperty('IA_MODELO') || IA.modeloPadrao,
    max_tokens: opcoes.maxTokens || 2000,
    system: IA.sistema,
    messages: [{ role: 'user', content: conteudo }]
  };
  if (opcoes.tools) corpo.tools = opcoes.tools;
  let resp;
  try {
    resp = UrlFetchApp.fetch(IA.url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': chave, 'anthropic-version': IA.versaoApi },
      payload: JSON.stringify(corpo)
    });
  } catch (e) { throw falha('Não foi possível falar com a IA agora. Tente de novo em instantes.'); }
  const codigo = resp.getResponseCode();
  let j = {};
  try { j = JSON.parse(resp.getContentText() || '{}'); } catch (e) {}
  if (codigo !== 200) {
    const m = j && j.error && j.error.message ? String(j.error.message).slice(0, 160) : 'código ' + codigo;
    throw falha(codigo === 401 ? 'A chave da IA foi recusada. Confira a propriedade ANTHROPIC_API_KEY.' : codigo === 429 ? 'A IA está ocupada ou o limite da conta foi atingido. Tente mais tarde.' : 'A IA não conseguiu responder (' + m + ').');
  }
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// pega o primeiro objeto ou lista JSON do texto da resposta
function iaJSON(txt) {
  const s = String(txt || '');
  const ini = s.search(/[{[]/);
  if (ini < 0) throw falha('A IA não devolveu os dados no formato esperado. Tente de novo.');
  const abre = s[ini], fecha = abre === '{' ? '}' : ']';
  const fim = s.lastIndexOf(fecha);
  try { return JSON.parse(s.slice(ini, fim + 1)); } catch (e) { throw falha('A IA não devolveu os dados no formato esperado. Tente de novo.'); }
}

// resumo da cotação enviado à IA (sem anexos, sem IDs de arquivos)
function iaResumo(cot) {
  const d = cot.dados, tot = cotTotais(d);
  return {
    finalidade: cot.finalidade, especificacao: d.especificacao,
    fornecedores: d.fornecedores.map((f, i) => ({ indice: i, empresa: f.empresa, modelo: f.modelo, atende: f.atende, prazo: f.prazo,
      pagamento: f.pagamento, validade: f.validade, garantia: f.garantia, instalacao: f.instalacao, frete: f.frete, desconto: f.desconto,
      obs: f.obs, subtotal: tot[i].subtotal, total: tot[i].total, todosOsItensCotados: tot[i].completo })),
    itens: d.itens.map((it, j) => ({ indice: j, descricao: it.descricao, unidade: it.unid, quantidade: it.quant,
      precosUnitarios: it.precos, referenciaDeMercado: it.ref })),
    observacoes: d.observacoes
  };
}

// 1. ler o orçamento (PDF ou foto) de um fornecedor
function iaLerOrcamento(cot, r, chave) {
  const i = Number(r.indice), f = cot.dados.fornecedores[i];
  if (!f) throw falha('Fornecedor não encontrado nesta cotação.');
  const anexo = (f.anexos || []).find(a => a.id === String(r.fileId || ''));
  if (!anexo) throw falha('Orçamento não encontrado neste fornecedor.');
  const arq = verArquivo(anexo.id, pastaCotacoes());
  const pdf = arq.mime === 'application/pdf';
  const itensCotacao = cot.dados.itens.map((it, j) => (j + 1) + '. ' + it.descricao + ' (' + (it.quant || '') + ' ' + (it.unid || '') + ')').join('\n');
  const pedido = 'Leia este orçamento de fornecedor e devolva SOMENTE um JSON, sem texto antes ou depois, neste formato:\n' +
    '{"fornecedor":{"empresa":"","cnpj":"","telefone":"","email":"","contato":"","modelo":"marca e modelo ofertados","prazo":"prazo de entrega",' +
    '"pagamento":"condição de pagamento","validade":"validade da proposta","garantia":"","instalacao":"Sim ou Não ou vazio","frete":0,"desconto":0},' +
    '"itens":[{"descricao":"","unid":"","quant":0,"precoUnit":0}]}\n' +
    'Valores em reais como número (ex.: 1234.56). Frete e desconto em reais (se o desconto vier em %, calcule o valor). ' +
    'Itens que estamos cotando, para usar as mesmas descrições quando for o mesmo produto:\n' + itensCotacao;
  const txt = iaChamar(chave, [
    { type: pdf ? 'document' : 'image', source: { type: 'base64', media_type: arq.mime, data: arq.b64 } },
    { type: 'text', text: pedido }
  ], { maxTokens: 2500 });
  const j = iaJSON(txt);
  const fo = j.fornecedor || {};
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };
  return {
    fornecedor: { empresa: texto(fo.empresa, 80), cnpj: texto(fo.cnpj, 20), telefone: texto(fo.telefone, 30), email: texto(fo.email, 80),
      contato: texto(fo.contato, 80), modelo: texto(fo.modelo, 160), prazo: texto(fo.prazo, 120), pagamento: texto(fo.pagamento, 160),
      validade: texto(fo.validade, 60), garantia: texto(fo.garantia, 80), instalacao: ['Sim', 'Não'].indexOf(fo.instalacao) >= 0 ? fo.instalacao : '',
      frete: num(fo.frete), desconto: num(fo.desconto) },
    itens: (Array.isArray(j.itens) ? j.itens : []).slice(0, 60).map(x => ({ descricao: texto(x.descricao, 300), unid: texto(x.unid, 12), quant: num(x.quant), precoUnit: num(x.precoUnit) }))
      .filter(x => x.descricao && x.precoUnit !== null)
  };
}

// 2. comparar as propostas e recomendar
function iaComparar(cot, chave) {
  const pedido = 'Compare as propostas desta cotação e recomende um fornecedor. Considere preço total (com frete e desconto), ' +
    'se atende à especificação, prazo, garantia, instalação e condição de pagamento. Devolva SOMENTE um JSON:\n' +
    '{"fornecedor": <indice do fornecedor recomendado>, "justificativa": "texto curto, até 5 frases, com os valores", ' +
    '"alertas": ["pontos de atenção, como modelos diferentes ou preços faltando"]}\n\nCotação:\n' + JSON.stringify(iaResumo(cot));
  const j = iaJSON(iaChamar(chave, [{ type: 'text', text: pedido }], { maxTokens: 1500 }));
  const n = cot.dados.fornecedores.length;
  return { recomendacao: { fornecedor: Number.isInteger(j.fornecedor) && j.fornecedor >= 0 && j.fornecedor < n ? j.fornecedor : -1,
    justificativa: texto(j.justificativa, 1500) }, alertas: (Array.isArray(j.alertas) ? j.alertas : []).slice(0, 8).map(a => texto(a, 200)).filter(Boolean) };
}

// 3. escrever o pedido de cotação para os fornecedores
function iaPedido(cot, chave) {
  const d = cot.dados;
  const pedido = 'Escreva uma mensagem curta e cordial de pedido de cotação, para enviar por WhatsApp ou e-mail a fornecedores, ' +
    'em nome de ' + (cot.solicitante || 'a administração') + ', do Pier Residências. Liste os itens com quantidade, inclua a especificação ' +
    'e peça: preço unitário e total, frete, prazo de entrega, condição de pagamento, validade da proposta, garantia, se a instalação está ' +
    'inclusa e a proposta em PDF com CNPJ. Sem assunto, sem emojis, sem colchetes para preencher. Devolva só o texto da mensagem.\n\n' +
    'Finalidade: ' + cot.finalidade + '\nEspecificação: ' + (d.especificacao || '—') + '\nItens:\n' +
    d.itens.filter(it => it.descricao).map((it, j) => (j + 1) + '. ' + it.descricao + ' – ' + (it.quant || '') + ' ' + (it.unid || '')).join('\n');
  return { texto: texto(iaChamar(chave, [{ type: 'text', text: pedido }], { maxTokens: 1000 }), 3000) };
}

// 4. preço de referência na internet (busca na web feita pela própria API)
function iaReferencia(cot, chave) {
  const itens = cot.dados.itens.map((it, j) => ({ indice: j, descricao: it.descricao, unidade: it.unid })).filter(x => x.descricao);
  if (!itens.length) throw falha('Descreva os itens antes de pesquisar o preço de referência.');
  const pedido = 'Pesquise na internet o preço atual, no Brasil, de cada item abaixo (de preferência em lojas do Rio de Janeiro ou ' +
    'grandes varejistas nacionais), considerando a especificação: ' + (cot.dados.especificacao || '—') + '. Para cada item, use o ' +
    'preço unitário de uma oferta real que você encontrou. Devolva SOMENTE um JSON: [{"indice":0,"preco":1234.56,"fonte":"URL da página"}]. ' +
    'Se não encontrar um item, deixe-o fora da lista.\nItens: ' + JSON.stringify(itens);
  const txt = iaChamar(chave, [{ type: 'text', text: pedido }], {
    maxTokens: 3000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5,
      user_location: { type: 'approximate', city: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'BR', timezone: 'America/Sao_Paulo' } }]
  });
  const lista = iaJSON(txt);
  return { itens: (Array.isArray(lista) ? lista : []).filter(x => Number.isInteger(x.indice) && x.indice >= 0 && x.indice < cot.dados.itens.length)
    .map(x => ({ indice: x.indice, preco: Number(x.preco) > 0 ? Math.round(Number(x.preco) * 100) / 100 : null, fonte: /^https?:\/\//.test(String(x.fonte || '')) ? texto(x.fonte, 300) : '' }))
    .filter(x => x.preco !== null) };
}
