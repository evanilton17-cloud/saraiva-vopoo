/* Envio de fotos para o Vercel Blob (rota /api/foto).
   Recebe os bytes da imagem e devolve a URL pública.
   Só o painel logado pode enviar (cookie de sessão). */

import { put } from "@vercel/blob";
import { respostaJSON, sessaoValida } from "./_auth.js";

export const runtime = "nodejs";

export default {
  async fetch(req) {
    if (!(await sessaoValida(req))) {
      return respostaJSON({ ok: false, erro: "Entre no painel para enviar fotos" }, 401);
    }
    if (req.method !== "POST") {
      return respostaJSON({ ok: false, erro: "Método não permitido" }, 405);
    }

    const tipo = req.headers.get("content-type") || "image/jpeg";
    if (!/^image\//i.test(tipo)) {
      return respostaJSON({ ok: false, erro: "Envie um arquivo de imagem" }, 400);
    }
    const ehPng = /image\/png/i.test(tipo);
    const ehWebp = /image\/webp/i.test(tipo);
    const ext = ehPng ? "png" : ehWebp ? "webp" : "jpg";

    let dados;
    try {
      dados = await req.arrayBuffer();
    } catch (e) {
      return respostaJSON({ ok: false, erro: "Não consegui ler a imagem" }, 400);
    }
    if (!dados || dados.byteLength < 64) {
      return respostaJSON({ ok: false, erro: "Imagem vazia ou pequena demais" }, 400);
    }
    if (dados.byteLength > 8 * 1024 * 1024) {
      return respostaJSON({ ok: false, erro: "Imagem muito grande (máx. 8MB)" }, 400);
    }

    const nome = "produtos/" + Date.now() + "-" + Math.floor(Math.random() * 1e9) + "." + ext;

    try {
      const blob = new Blob([dados], { type: tipo });
      const r = await put(nome, blob, {
        access: "public",
        addRandomSuffix: false,
        contentType: tipo,
      });
      return respostaJSON({ ok: true, url: r.url });
    } catch (e) {
      return respostaJSON({ ok: false, erro: "Erro ao salvar a imagem no armazenamento" }, 500);
    }
  },
};
