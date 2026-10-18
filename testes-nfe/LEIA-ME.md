# Testes da correção da leitura de NF-e (Fase 2)

Esta pasta é **só de teste**. Ela fica num commit separado na branch `correcao-nfe` e **não vai para a `main`,
para a `liberacao-inventario` nem para o GitHub Pages**. Só o commit do código (`nfe.js`, `app.js`, `estilo.css`,
`index.html`) é candidato a ir para a produção, e só com autorização expressa.

Todos os dados são **fictícios**: materiais, contas, fornecedor e notas foram inventados. Nenhum teste acessa o
Google, a planilha oficial, a homologação ou qualquer endereço da internet.

| Arquivo | Para quê |
|---|---|
| `dados-ficticios.js` | Estoques de teste (E1, E2, E3) e a matriz de casos esperados. |
| `funcoes.test.js` | Regras de associação, leitura das medidas e memória, direto no Node. |
| `regressao.test.js` | Confirma que a leitura do PDF e da foto ficou idêntica à da `main`. |
| `simulador.js` | Apps Script simulado: roda o `apps-script/Codigo.gs` desta branch sobre uma planilha falsa em memória. |
| `notas.js` | Gera PDFs de DANFE fictícios. |
| `tela.test.js` | O site no Chromium, com o simulador, as notas fictícias e a rede travada para qualquer outro endereço. |
| `compatibilidade.js` | Aplica o código desta branch em cópias locais temporárias da `liberacao-inventario` e da `otimizacao-consulta`, roda as três suítes e apaga as cópias (nada é enviado). |
| `resultados/` | Saída da última execução, a linha de base da regra antiga e as capturas de tela. |

## Como rodar

Precisa de Node 18 ou mais novo e dos pacotes `playwright`, `pdf-lib` e `pdfjs-dist`, que são só de teste
e não vão para o site.

```
node testes-nfe/funcoes.test.js                 # regras novas
node testes-nfe/funcoes.test.js caminho/nfe.js  # mesma matriz com um nfe.js antigo (linha de base)
node testes-nfe/regressao.test.js               # compara com git show origin/main:nfe.js
node testes-nfe/tela.test.js                    # sobe o simulador e o site sozinho (portas 8795 e 8796)
node testes-nfe/compatibilidade.js              # T34 em cópias locais temporárias
```
