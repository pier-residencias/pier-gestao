// T34 — compatibilidade com a liberacao-inventario e a otimizacao-consulta, só em CÓPIAS LOCAIS TEMPORÁRIAS.
// Para cada branch: cria uma cópia (git worktree, sem branch), aplica a diferença de código desta branch
// em relação à main (nfe.js, app.js, estilo.css, index.html), resolve o conflito previsto (versão ?v= no index.html),
// roda as três suítes e apaga a cópia. Nunca faz commit, merge ou envio; as branches originais não mudam.
// Uso: node testes-nfe/compatibilidade.js
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync, spawnSync } = require("child_process");
const RAIZ = path.join(__dirname, "..");
const git = (args, cwd) => execFileSync("git", args, { cwd: cwd || RAIZ, encoding: "utf8" }).trim();
const ARQS = ["nfe.js", "app.js", "estilo.css", "index.html"];
const ALVOS = ["liberacao-inventario", "otimizacao-consulta"];
let falhas = 0; const log = [];
const diz = t => { console.log(t); log.push(t); };

git(["fetch", "-q", "--depth=60", "origin", ...ALVOS.map(b => `+refs/heads/${b}:refs/remotes/origin/${b}`), "+refs/heads/main:refs/remotes/origin/main"]);
const antes = Object.fromEntries(ALVOS.map(b => [b, git(["ls-remote", "origin", "refs/heads/" + b]).split(/\s/)[0]]));
const patch = path.join(os.tmpdir(), "correcao-nfe-codigo.patch");
fs.writeFileSync(patch, git(["diff", "origin/main", "HEAD", "--", ...ARQS]) + "\n");
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "compat-nfe-"));

for (const b of ALVOS) {
  const w = path.join(pasta, b);
  git(["worktree", "add", "-q", "--detach", w, "origin/" + b]);
  try {
    if (git(["rev-parse", "--show-toplevel"], w) !== fs.realpathSync(w)) throw new Error("cópia no lugar errado: " + w);
    const r = spawnSync("git", ["apply", "-3", patch], { cwd: w, encoding: "utf8" });
    const conflitos = git(["diff", "--name-only", "--diff-filter=U"], w).split("\n").filter(Boolean);
    // único conflito esperado: a linha de versão dos arquivos no index.html
    let idx = fs.readFileSync(path.join(w, "index.html"), "utf8");
    idx = idx.replace(/<<<<<<< [^\n]*\n[\s\S]*?=======\n([\s\S]*?)>>>>>>> [^\n]*\n/g, (m, nosso) => nosso.replace(/\?v=[^"]+/g, "?v=compat-nfe"));
    fs.writeFileSync(path.join(w, "index.html"), idx);
    const inesperados = conflitos.filter(f => f !== "index.html");
    const resto = /<<<<<<<|>>>>>>>/.test(ARQS.map(f => fs.readFileSync(path.join(w, f), "utf8")).join(""));
    diz(`\n=== ${b} (${git(["rev-parse", "--short", "HEAD"], w)}): aplicação ${r.status === 0 ? "limpa" : "com conflito"}; conflitos: ${conflitos.join(", ") || "nenhum"}${inesperados.length || resto ? " — INESPERADO" : ""}`);
    if (inesperados.length || resto) { falhas++; continue; }
    fs.cpSync(__dirname, path.join(w, "testes-nfe-copia"), { recursive: true });
    const versao = (fs.readFileSync(path.join(w, "apps-script", "Codigo.gs"), "utf8").match(/const VERSAO = '([^']*)'/) || [])[1];
    diz(`    Apps Script da cópia no simulador: "${versao}"`);
    for (const [nome, args] of [["funções", ["funcoes.test.js"]], ["regressão", ["regressao.test.js"]], ["tela", ["tela.test.js"]]]) {
      const x = spawnSync(process.execPath, [path.join(w, "testes-nfe-copia", args[0])], { cwd: w, encoding: "utf8", timeout: 2400000 });
      const fim = (x.stdout || "").trim().split("\n").pop();
      if (x.status !== 0) falhas++;
      diz(`    ${nome.padEnd(9)} ${fim}${x.status !== 0 ? "  ← FALHOU" : ""}`);
    }
  } catch (e) { falhas++; diz(`    ERRO: ${e.message}`); }
  finally { git(["worktree", "remove", "--force", w]); }
}
git(["worktree", "prune"]);
fs.rmSync(pasta, { recursive: true, force: true });
const depois = Object.fromEntries(ALVOS.map(b => [b, git(["ls-remote", "origin", "refs/heads/" + b]).split(/\s/)[0]]));
const intactas = ALVOS.every(b => antes[b] === depois[b]);
diz(`\nBranches no GitHub antes e depois: ${ALVOS.map(b => `${b} ${depois[b].slice(0, 7)}`).join(", ")} — ${intactas ? "inalteradas" : "ALTERADAS"}`);
if (!intactas) falhas++;
diz(`Cópias temporárias apagadas: ${!fs.existsSync(pasta) && git(["worktree", "list"]).split("\n").length === 1 ? "sim" : "NÃO"}`);
diz(falhas ? `\n${falhas} falha(s)` : "\nCompatibilidade: tudo ok");
fs.writeFileSync(path.join(__dirname, "resultados", "compatibilidade.txt"), log.join("\n") + "\n");
process.exitCode = falhas ? 1 : 0;
