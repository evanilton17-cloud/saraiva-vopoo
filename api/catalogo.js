/* Catálogo na nuvem (rota /api/catalogo).
   GET  — qualquer pessoa lê o catálogo ativo (produtos + marcas).
   POST/PUT/DELETE — só o painel logado pode salvar (cookie de sessão). */

import { kvChamar, kvOK, respostaJSON, sessaoValida } from "./_auth.js";

export const runtime = "nodejs";

const CHAVE = "sv_catalogo";

async function lerCatalogo() {
  const j = await kvChamar("/get/" + CHAVE);
  const str = j && j.result;
  if (!str) return null;
  try {
    const x = JSON.parse(str);
    if (x && Array.isArray(x.produtos) && Array.isArray(x.marcas)) return x;
  } catch (e) {}
  return null;
}

export default {
  async fetch(req) {
    if (!kvOK()) {
      return respostaJSON(
        { ok: false, erro: "Armazenamento (Vercel KV) ainda não configurado" },
        503
      );
    }

    if (req.method === "GET" || req.method === "HEAD") {
      try {
        const c = await lerCatalogo();
        return respostaJSON({ ok: true, catalogo: c }, 200, { "cache-control": "no-cache" });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao ler catálogo" }, 500);
      }
    }

    if (req.method === "POST" || req.method === "PUT") {
      if (!(await sessaoValida(req))) {
        return respostaJSON({ ok: false, erro: "Entre no painel para salvar o catálogo" }, 401);
      }
      let corpo;
      try {
        corpo = await req.json();
      } catch (e) {}
      if (!corpo || !Array.isArray(corpo.marcas) || !Array.isArray(corpo.produtos)) {
        return respostaJSON({ ok: false, erro: "Catálogo inválido" }, 400);
      }
      const tamanho = JSON.stringify(corpo).length;
      if (tamanho > 900000) {
        return respostaJSON({ ok: false, erro: "Catálogo grande demais (use fotos na nuvem)" }, 413);
      }
      const atualizadoEm = corpo.atualizadoEm || Date.now();
      const catalogo = {
        atualizadoEm: atualizadoEm,
        marcas: corpo.marcas,
        produtos: corpo.produtos,
      };
      try {
        await kvChamar("/set/" + CHAVE, { method: "POST", body: JSON.stringify(catalogo) });
        return respostaJSON({ ok: true, catalogo: catalogo }, 200);
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao salvar catálogo" }, 500);
      }
    }

    if (req.method === "DELETE") {
      if (!(await sessaoValida(req))) {
        return respostaJSON({ ok: false, erro: "Entre no painel para limpar o catálogo" }, 401);
      }
      try {
        await kvChamar("/del/" + CHAVE, { method: "POST" });
        return respostaJSON({ ok: true });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao limpar catálogo" }, 500);
      }
    }

    return respostaJSON({ ok: false, erro: "Método não permitido" }, 405);
  },
};
