/* Envio de fotos para o Vercel Blob (rota /api/foto).
   Recebe os bytes da imagem e devolve a URL pública. */

import { put } from "@vercel/blob";

export const runtime = "nodejs";

function autorizado(req) {
  const t = process.env.SV_LOJA_TOKEN;
  if (!t) return true;
  return req.headers.get("x-loja-token") === t;
}

export default {
  async fetch(req) {
    if (!autorizado(req)) {
      return Response.json({ ok: false, erro: "Sem autorização" }, { status: 401 });
    }
    if (req.method !== "POST") {
      return Response.json({ ok: false, erro: "Método não permitido" }, { status: 405 });
    }

    const tipo = req.headers.get("content-type") || "image/jpeg";
    const ehPng = /image\/png/i.test(tipo);
    const ehWebp = /image\/webp/i.test(tipo);
    const ext = ehPng ? "png" : ehWebp ? "webp" : "jpg";

    let dados;
    try {
      dados = await req.arrayBuffer();
    } catch (e) {
      return Response.json({ ok: false, erro: "Não consegui ler a imagem" }, { status: 400 });
    }
    if (!dados || dados.byteLength < 64) {
      return Response.json({ ok: false, erro: "Imagem vazia ou pequena demais" }, { status: 400 });
    }
    if (dados.byteLength > 8 * 1024 * 1024) {
      return Response.json({ ok: false, erro: "Imagem muito grande (máx. 8MB)" }, { status: 400 });
    }

    const nome =
      "produtos/" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1e9) +
      "." +
      ext;

    try {
      const blob = new Blob([dados], { type: tipo });
      const r = await put(nome, blob, {
        access: "public",
        addRandomSuffix: false,
        contentType: tipo
      });
      return Response.json({ ok: true, url: r.url });
    } catch (e) {
      return Response.json({ ok: false, erro: "Erro ao salvar a imagem no armazenamento" }, { status: 500 });
    }
  }
};