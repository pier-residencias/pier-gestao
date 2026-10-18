// Dados EXCLUSIVAMENTE fictícios para os testes da leitura de NF-e.
// Nenhum nome de morador, colaborador, fornecedor ou material real.
"use strict";

const item = (id, nome, unidade, extra) => Object.assign({
  id, codigo: "TST-" + id.slice(1).padStart(4, "0"), nome, unidade, qtd: 10, minimo: 0,
  setor: "Manutenção", categoria: "Teste", tipoItem: "Consumível", local: "Almoxarifado de teste", obs: ""
}, extra || {});

// E1: estoque variado
const E1 = [
  item("t1", "Fita crepe 24mm", "rolo"),
  item("t2", "Fita crepe 48mm", "rolo"),
  item("t3", "Parafuso 6mm", "un"),
  item("t4", "Disjuntor 20A", "un"),
  item("t5", "Lâmpada LED 9W", "un"),
  item("t6", "Lâmpada LED 12W", "un"),
  item("t7", "Cabo flexível 2,5mm²", "m"),
  item("t8", "Registro 3/4\"", "un"),
  item("t9", "Luva de raspa", "par"),
  item("t10", "Vassoura de piaçava", "un"),
  item("t11", "Silicone incolor 280g", "un"),
  item("t12", "Água sanitária 1L", "un"),
  item("t13", "Lâmpada LED 12W morna (quadrada)", "un"),
  item("t14", "Bucha 8mm", "un")
];
// E2: como o caso real que motivou a correção, só uma fita cadastrada
const E2 = [item("u1", "Fita crepe 24mm", "rolo"), item("u2", "Luva de raspa", "par")];
// E3: material sem medida no nome
const E3 = [item("v1", "Fita crepe", "rolo"), item("v2", "Luva de raspa", "par")];

// esperado: st = status aceito(s); sel = material aceito(s) ("" = nada pré-selecionado, "__novo" = item novo)
// nunca = materiais que não podem ser pré-selecionados de jeito nenhum
const MATRIZ = [
  { id: "T01", estoque: "E2", desc: "FITA CREPE 24X50M", st: ["ok"], sel: ["u1"] },
  { id: "T02", estoque: "E2", desc: "FITA CREPE 48X50M", st: ["novo"], sel: ["__novo"], conflito: ["u1"] },
  { id: "T03", estoque: "E2", desc: "FITA CREPE 18X50M", st: ["novo"], sel: ["__novo"], conflito: ["u1"] },
  { id: "T04", estoque: "E1", desc: "FITA CREPE 48X50M", st: ["ok"], sel: ["t2"], conflito: ["t1"] },
  { id: "T05", estoque: "E1", desc: "PARAFUSO 8MM", st: ["novo"], sel: ["__novo"], conflito: ["t3"] },
  { id: "T06", estoque: "E1", desc: "PARAF SEXT 6 MM", st: ["ok", "confira"], sel: ["t3", ""] },
  { id: "T07", estoque: "E1", desc: "DISJUNTOR 32A", st: ["novo"], sel: ["__novo"], conflito: ["t4"] },
  { id: "T08", estoque: "E1", desc: "DISJ DIN 20A CURVA C", st: ["ok", "confira"], sel: ["t4", ""] },
  { id: "T09", estoque: "E1", desc: "LAMPADA LED 15W", st: ["novo"], sel: ["__novo"], conflito: ["t5", "t6"] },
  { id: "T10", estoque: "E1", desc: "LAMP LED BULBO 12W", st: ["ok"], sel: ["t6"], conflito: ["t5"] },
  { id: "T11", estoque: "E1", desc: "LAMPADA LED 9 W", st: ["ok"], sel: ["t5"], conflito: ["t6"] },
  { id: "T12a", estoque: "E1", desc: "CABO FLEX 4MM2", st: ["novo"], sel: ["__novo"], conflito: ["t7"] },
  { id: "T12b", estoque: "E1", desc: "CABO FLEX 2,5MM²", st: ["ok"], sel: ["t7"] },
  { id: "T13", estoque: "E3", desc: "FITA CREPE 24X50M", st: ["confira"], sel: [""] },
  { id: "T14", estoque: "E1", desc: "REGISTRO 1/2\"", st: ["novo"], sel: ["__novo"], conflito: ["t8"] },
  { id: "T15", estoque: "E1", desc: "FITA CREPE 2,4CM", st: ["ok"], sel: ["t1"], conflito: ["t2"] }
];

// mesmo produto, medida escrita de outro jeito: o desejável é "Já cadastrado" (pelo menos 90%)
const ESCRITA_DIFERENTE = [
  { id: "D01", estoque: "E1", desc: "FITA CREPE 24MM X 50M", alvo: "t1" },
  { id: "D02", estoque: "E1", desc: "FITA CREPE 24 MM", alvo: "t1" },
  { id: "D03", estoque: "E1", desc: "FITA CREPE 48MMX50M", alvo: "t2" },
  { id: "D04", estoque: "E1", desc: "FITA CREPE 4,8CM X 50M", alvo: "t2" },
  { id: "D05", estoque: "E1", desc: "LAMPADA LED 12 W BIVOLT", alvo: "t6" },
  { id: "D06", estoque: "E1", desc: "LAMPADA LED 9W 6500K E27", alvo: "t5" },
  { id: "D07", estoque: "E1", desc: "DISJUNTOR DIN 20 A", alvo: "t4" },
  { id: "D08", estoque: "E1", desc: "PARAFUSO 6 MM", alvo: "t3" },
  { id: "D09", estoque: "E1", desc: "REGISTRO 3/4 POL", alvo: "t8" },
  { id: "D10", estoque: "E1", desc: "REGISTRO 3/4\"", alvo: "t8" },
  { id: "D11", estoque: "E1", desc: "CABO FLEXIVEL 2,5 MM2", alvo: "t7" },
  { id: "D12", estoque: "E1", desc: "CABO FLEXIVEL 2,5MM 100M", alvo: "t7" },
  { id: "D13", estoque: "E1", desc: "SILICONE INCOLOR 280 G", alvo: "t11" },
  { id: "D14", estoque: "E1", desc: "AGUA SANITARIA 1 LITRO", alvo: "t12" },
  { id: "D15", estoque: "E1", desc: "AGUA SANITARIA 1000ML", alvo: "t12" },
  { id: "D16", estoque: "E1", desc: "BUCHA NYLON 8 MM", alvo: "t14" },
  { id: "D17", estoque: "E1", desc: "LUVA DE RASPA", alvo: "t9" },
  { id: "D18", estoque: "E1", desc: "VASSOURA PIACAVA", alvo: "t10" },
  { id: "D19", estoque: "E1", desc: "LAMP. LED 9W", alvo: "t5" },
  { id: "D20", estoque: "E1", desc: "FITA CREPE 24X50 M", alvo: "t1" }
];

// sem medida identificável ou leitura incompleta: nunca escolha automática errada
const SEM_MEDIDA = [
  { id: "S01", estoque: "E1", desc: "FITA CREPE", st: ["confira"], sel: [""] },
  { id: "S02", estoque: "E1", desc: "LAMPADA LED", st: ["confira"], sel: [""] },
  { id: "S03", estoque: "E1", desc: "F1TA CREP3 24X5OM", st: ["ok", "confira", "novo", "escolha"], nunca: ["t2"] },
  { id: "S04", estoque: "E1", desc: "DISJUNTOR", st: ["confira"], sel: [""] },
  { id: "S05", estoque: "E1", desc: "PARAFUSO", st: ["confira"], sel: [""] },
  { id: "S06", estoque: "E1", desc: "SILICONE", st: ["confira", "ok"], sel: ["", "t11"] }
];

// características: o que deve ser lido de cada descrição (tipo:rótulo)
const CARACTERISTICAS = [
  ["FITA CREPE 24X50M", ["medida:24 mm*", "medida:50 m"]],
  ["Fita crepe 24mm", ["medida:24 mm*"]],
  ["FITA CREPE 2,4CM", ["medida:24 mm*"]],
  ["FITA CREPE 48MMX50M", ["medida:48 mm*", "medida:50 m"]],
  ["PARAFUSO 8MM", ["medida:8 mm*"]],
  ["PARAF SEXT 6 MM", ["medida:6 mm*"]],
  ["DISJUNTOR 32A", ["corrente:32 A*"]],
  ["Disjuntor C16", ["corrente:16 A*"]],
  ["LAMPADA LED 15W", ["potencia:15 W*"]],
  ["LAMPADA LED 12 W BIVOLT", ["potencia:12 W*", "tensao:127/220 V"]],
  ["LAMPADA 9W 220V", ["potencia:9 W*", "tensao:220 V"]],
  ["CABO FLEX 4MM2", ["secao:4 mm²*"]],
  ["Cabo flexível 2,5mm²", ["secao:2,5 mm²*"]],
  ["CABO FLEXIVEL 2,5MM 100M", ["secao:2,5 mm²*", "medida:100 m"]],
  ["REGISTRO 1/2\"", ["pol:1/2\"*"]],
  ["Registro geral 2 1/2\"", ["pol:2 1/2\"*"]],
  ["REGISTRO 3/4 POL", ["pol:3/4\"*"]],
  ["Registro 2\"", ["pol:2\"*"]],
  ["AGUA SANITARIA 1 LITRO", ["volume:1 L*"]],
  ["AGUA SANITARIA 1000ML", ["volume:1 L*"]],
  ["SILICONE INCOLOR 280 G", ["massa:280 g*"]],
  ["CIMENTO 50KG", ["massa:50 kg*"]],
  ["Caixinha 4x2", ["medida:4*", "medida:2"]],
  ["RALO 15X15CM", ["medida:150 mm*", "medida:150 mm"]],
  ["Trena 30m", ["medida:30 m*"]],
  ["MANGUEIRA 1/2 50M", ["pol:1/2\"*", "medida:50 m"]],
  ["Adaptador 60 x 2\"", ["pol:2\"*"]],
  ["LUVA DE RASPA", []],
  ["COLA BRANCA", []]
];

module.exports = { ESTOQUES: { E1, E2, E3 }, MATRIZ, ESCRITA_DIFERENTE, SEM_MEDIDA, CARACTERISTICAS, item };
