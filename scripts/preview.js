/* Prévia local do site com as APIs da Vercel funcionando.
   - Serve os arquivos do projeto na porta 5500 (ou PORT / argumento).
   - Encaminha /api/* para o site publicado, então catálogo, fotos, senha
     e vendas usam o mesmo armazenamento da nuvem (Vercel KV + Blob).
   Uso: npm run preview   (ou: node scripts/preview.js 5500) */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const PORTA = Number(process.env.PORT || process.argv[2] || 5500);
const ORIGEM = new URL(process.env.SV_ORIGEM || "https://saraiva-vopoo.vercel.app");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function encaminharAPI(req, res) {
  const alvo = new URL(req.url, ORIGEM);
  const cabecalhos = Object.assign({}, req.headers, { host: alvo.host });
  delete cabecalhos["accept-encoding"];

  const pedido = https.request(
    {
      protocol: alvo.protocol,
      hostname: alvo.hostname,
      port: alvo.port || 443,
      path: alvo.pathname + alvo.search,
      method: req.method,
      headers: cabecalhos,
    },
    function (resposta) {
      res.writeHead(resposta.statusCode || 502, resposta.headers);
      resposta.pipe(res);
    }
  );

  pedido.on("error", function (erro) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({ ok: false, erro: "Sem conexão com a nuvem: " + erro.message })
    );
  });

  req.pipe(pedido);
}

function caminhoDoArquivo(url) {
  let caminho = decodeURIComponent(new URL(url, "http://local").pathname);
  if (caminho === "/") caminho = "/index.html";
  if (caminho === "/painel.html" || caminho === "/admin" || caminho === "/admin/") {
    caminho = "/admin.html";
  }
  const arquivo = path.normalize(path.join(RAIZ, caminho));
  if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + path.sep)) return null;
  return arquivo;
}

function servirArquivo(req, res) {
  const arquivo = caminhoDoArquivo(req.url);
  if (!arquivo) {
    res.writeHead(403).end("Acesso negado");
    return;
  }

  fs.stat(arquivo, function (erro, info) {
    if (erro) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Arquivo não encontrado: " + req.url);
      return;
    }
    const alvo = info.isDirectory() ? path.join(arquivo, "index.html") : arquivo;
    fs.stat(alvo, function (erro2, info2) {
      if (erro2 || !info2.isFile()) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Arquivo não encontrado: " + req.url);
        return;
      }
      const ext = path.extname(alvo).toLowerCase();
      const cacheavel = ext === ".jpg" || ext === ".png" || ext === ".webp" || ext === ".svg";
      res.writeHead(200, {
        "content-type": TIPOS[ext] || "application/octet-stream",
        "cache-control": cacheavel ? "public, max-age=3600" : "no-store",
      });
      fs.createReadStream(alvo).pipe(res);
    });
  });
}

http
  .createServer(function (req, res) {
    if (req.url.indexOf("/api/") === 0) {
      encaminharAPI(req, res);
      return;
    }
    servirArquivo(req, res);
  })
  .listen(PORTA, "127.0.0.1", function () {
    console.log("Prévia em http://localhost:" + PORTA + "/");
    console.log("APIs (/api/*) encaminhadas para " + ORIGEM.origin);
  });
