# Ensaio de desempenho — Pier Gestão

Esta pasta é **só do ensaio**. Nada daqui vai para a `liberacao-inventario`, para a `main` nem para o GitHub Pages.
Na branch `otimizacao-consulta`, ela está num commit separado do commit da otimização: só o commit da otimização
(`apps-script/Codigo.gs`) é candidato a entrar na liberação, e só com autorização expressa.

| Arquivo | Para quê |
|---|---|
| `Codigo-ensaio.gs` | **Versão A**: o `Código.gs` da `liberacao-inventario` (0041062) com **uma única linha diferente**: a `VERSAO` termina em `· ENSAIO DE DESEMPENHO`. |
| `Codigo-ensaio-otimizado.gs` | **Versão B**: o `Código.gs` da `otimizacao-consulta` (consulta otimizada, fase 1) com a mesma única linha diferente. |
| `Ensaio.gs` | Carga fictícia (300 materiais, cerca de 1.500 movimentações), conferência e medição da recuperação. Aceita só as versões A e B. |
| `Diagnostico.gs` | Diagnóstico **somente leitura** da Consulta (`diagnosticarConsulta`). Reconhece se a versão instalada é A ou B. Pode ser apagado depois sem afetar nada. |
| `painel-ensaio.html` | Painel que mede o tempo das operações. Abra direto no Chrome ou Edge (duplo clique). Separa os resultados por versão (A ou B). |

## Travas de segurança

**Dentro do Apps Script (`Ensaio.gs`)**: a carga se recusa a rodar, sem gravar nada, se:
- a planilha for a oficial (comparação pelo ID) ou a homologação existente (comparação por impressão SHA-256);
- o nome da planilha não tiver "HOMOLOGAÇÃO" **e** "ENSAIO DE DESEMPENHO";
- faltar `AMBIENTE=homologacao` ou `ENSAIO=sim`;
- `HOMOLOG_PLANILHA_ID` ou `ENSAIO_PLANILHA_ID` não forem exatamente o ID desta planilha;
- existir `LIBERAR_ACIONADOR_OFICIAL`;
- a `VERSAO` não for exatamente a A ou a B do ensaio (o `Código.gs` da produção, o da homologação e o da liberação não têm o sufixo);
- o `Homologacao.gs` estiver no projeto.

Antes da carga, ela também confere o conteúdo:
- só existem contas de teste ou de ensaio;
- nenhum telefone está preenchido;
- há no máximo 20 materiais sem a marca [TESTE] ou [ENSAIO];
- as pastas de fotos e NF têm "ENSAIO" no nome, estão vazias e não são as da homologação.

Depois disso, a carga ainda exige a simulação, o código `ENS-XXXXXX` copiado para `CONFIRMAR_ENSAIO` (vale 15 minutos) e a planilha sem mudanças desde a simulação.

**No painel**, nesta ordem, e para na primeira trava que falhar:
1. O endereço precisa ser um link `/exec`. Os prefixos da produção e da homologação existente são recusados sem nenhuma chamada.
2. É feita só uma **leitura** da versão (GET). Se a implantação não responder com a versão A ou B do ensaio, nenhum POST é enviado, nem mesmo um login. Isso protege também contra um endereço novo da produção ou da homologação.
3. As 7 contas de ensaio precisam entrar e voltar com o usuário e o perfil esperados. Com a senha errada, o painel para na primeira conta.
4. Todos os materiais precisam ter a marca [ENSAIO], e são pelo menos 250.
5. A rede fica travada no próprio navegador: `fetch` só chega ao endereço conferido; `XMLHttpRequest` e `sendBeacon` ficam desligados.
6. As gravações só usam materiais [ENSAIO] de Manutenção, sem ajuste pendente e sem bloqueio. Nada é guardado no navegador: nem senha, nem endereço, nem sessão.
7. Ao trocar de endereço (de A para B ou o contrário), a tela trava, as sessões abertas na implantação anterior são encerradas e só então a nova é conferida.

**No diagnóstico (`Diagnostico.gs`)**: começa pelas travas do `Ensaio.gs`. Antes de chamar qualquer função do `Código.gs`, confere, só lendo, que todas as abas e colunas usadas existem (as funções de leitura só gravam quando falta aba ou coluna). Não chama login, sessão, preventivas, auditoria nem trava. Compara uma impressão digital de todas as abas e propriedades antes e depois, e não registra logins, senhas, segredos, sessões nem IDs.

## Medições no editor do Apps Script da planilha de ensaio
- `diagnosticarConsulta()` — tempo de cada etapa da Consulta, somente leitura, cerca de 2 minutos. A linha **C0** (sequência completa do `doPost`) é a medida para comparar A e B. Não use o painel enquanto ele roda.
- `medirRecuperacaoSemPendencias()` — 20 execuções.
- `prepararInterrompidas5()` ou `prepararInterrompidas20()` ou `prepararInterrompidasComHistorico5()` → depois `medirRecuperacaoComPendencias()`.
- `conferirEnsaio()` — só leitura, a qualquer momento.

## Ordem de montagem do ensaio no Google (já feita; registrada aqui para referência)
1. Fazer uma **cópia nova** da planilha de homologação com o nome `PIER GESTÃO - HOMOLOGAÇÃO - ENSAIO DE DESEMPENHO`. A homologação existente não é usada nem alterada.
2. No Apps Script da cópia:
   - substituir todo o conteúdo do `Código.gs` pelo `Codigo-ensaio.gs` (Ctrl+A, Delete, colar);
   - apagar o `Homologacao.gs` e qualquer arquivo que não faça parte da liberação;
   - manter o `AutomacaoPreventivas.gs` sem alteração e sem acionador;
   - criar o arquivo `Ensaio` (+ → Script), apagar todo o modelo `myFunction` com Ctrl+A e Delete, e só então colar o `Ensaio.gs`.
3. Executar `conferirEnsaio` uma vez, ainda sem propriedades: deve recusar listando só `AMBIENTE`, `ENSAIO`, `HOMOLOG_PLANILHA_ID` e `ENSAIO_PLANILHA_ID` (teste da trava, não grava nada).
4. Criar duas pastas novas e vazias com "ENSAIO" no nome.
5. Criar as propriedades `AMBIENTE` (`homologacao`), `ENSAIO` (`sim`), `HOMOLOG_PLANILHA_ID` e `ENSAIO_PLANILHA_ID` (o ID desta planilha), `PASTA_FOTOS_OS` e `PASTA_NF` (os IDs das pastas). **Não** criar `SEG_SEGREDO` (a carga cria um novo) nem copiar propriedades da homologação.
6. Executar `simularCargaEnsaio` sem senha: o único problema deve ser a falta de `ENSAIO_SENHA`.
7. Criar `ENSAIO_SENHA` (10 caracteres ou mais), executar `simularCargaEnsaio`, copiar o código para `CONFIRMAR_ENSAIO` e executar `executarCargaEnsaio`. A senha é apagada ao final.
8. Implantar como app da Web (Executar como: Eu; Quem pode acessar: Qualquer pessoa), conferir a versão abrindo o `/exec` e colar o endereço no painel.

**Não rodar `autorizar` no ensaio.** A cópia já tem todas as abas; o `autorizar` criaria pastas sozinho (sem "ENSAIO" no nome), mexeria no compartilhamento da planilha e gravaria na Auditoria. Se faltar alguma aba ou coluna, a simulação avisa.

## Comparação A/B (somente depois de autorizada)
As duas versões rodam **no mesmo projeto e na mesma planilha**, em duas implantações. A implantação atual (A) fica como está: ela é uma versão congelada e não muda quando o código do editor muda.

1. No Apps Script da planilha de ensaio:
   - substituir todo o `Código.gs` pelo `Codigo-ensaio-otimizado.gs`;
   - substituir todo o `Ensaio.gs` e o `Diagnostico.gs` pelos desta pasta.

   Conferir as contagens de cada arquivo antes de salvar.

Contagens para conferir cada colagem (Ctrl+F, com o botão Aa desligado):

| Arquivo no projeto | Linhas | `{` | `}` | `function` | `myFunction` |
|---|---|---|---|---|---|
| `Código.gs ← Codigo-ensaio-otimizado.gs` | 3281 | 855 | 855 | 186 | 0 |
| `Ensaio.gs` | 539 | 132 | 132 | 25 | 0 |
| `Diagnostico.gs` | 277 | 62 | 62 | 13 | 0 |
2. Executar `conferirEnsaio`. Deve aceitar a versão B e mostrar 300 materiais sem divergência.
3. Criar uma **nova** implantação (B), sem mexer na A. Abrir o `/exec` da B: a versão deve terminar em `consulta otimizada (fase 1) · ENSAIO DE DESEMPENHO`.
4. Antes de medir, abrir o `/exec` da A e da B 10 vezes cada. Isso dá o piso da plataforma: as execuções de `doGet` aparecem em Execuções.
5. No painel, rodar em blocos alternados no mesmo horário: conferir A → Consulta (Manutenção) 30 → conferir B → 30 → A 30 → B 30. O painel encerra as sessões ao trocar e separa os resultados por versão. O CSV traz `versao`, `inicio` (saída do navegador) e `fim` (chegada da resposta).
6. Em Execuções, anotar as durações do `doPost` de cada bloco (pelo horário do CSV).
7. Executar `diagnosticarConsulta` (agora com a B instalada) e comparar a linha C0 com a do diagnóstico anterior da A.
8. Conferir a consistência no painel e com `conferirEnsaio`.
9. Ao terminar, arquivar as duas implantações.

Nada disso altera a produção, a homologação original nem o site.
