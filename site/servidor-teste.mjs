import http from 'node:http';
import {readFile} from 'node:fs/promises';

const root=new URL('./',import.meta.url);
const allowed=new Set(['index.html','verificar-conexao.html','estilo.css','visual-2.css','tema.js','app.js','nfe.js','config.js','vendor/qrcode.js','manifest.json','pier-icon-192.png','pier-icon-512.png','img/logo.png','img/logo-oficial.png','img/logo-sem-fundo.png','img/logo-claro.png','img/fundo-login.jpg']);
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',png:'image/png',jpg:'image/jpeg'};
const server=http.createServer(async(req,res)=>{
  let path;
  try { path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'index.html'; }
  catch {res.writeHead(400);res.end('Pedido inválido');return;}
  if(req.method!=='GET'||!allowed.has(path)){res.writeHead(404);res.end('Não encontrado');return;}
  try {
    const bytes=await readFile(new URL(path,root));
    res.writeHead(200,{'Content-Type':mime[path.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(bytes);
  }catch {res.writeHead(404);res.end('Arquivo não encontrado. Extraia o pacote completo.');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'A porta 8787 já está em uso. Feche o teste anterior e tente novamente.':e.message);process.exitCode=1;});
server.listen(8787,'127.0.0.1',()=>console.log('Pier Gestão 2.0 — Testes\nAbra: http://127.0.0.1:8787/verificar-conexao.html\nPara encerrar: Ctrl+C.'));
