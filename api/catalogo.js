/* Catálogo na nuvem (rota /api/catalogo).
   GET  — qualquer pessoa lê o catálogo ativo (produtos + marcas).
   POST/PUT — painel salva o catálogo (exige SV_LOJA_TOKEN). */

export const runtime = "nodejs";

const CHAVE = "sv_catalogo";

function configKV() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: String(url).replace(/\/+$/, ""), token };
}

async function kvChamar(caminho, opcoes) {
  const k = configKV();
  const res = await fetch(k.url + caminho, {
    method: (opcoes && opcoes.method) || "GET",
    headers: Object.assign({ Authorization: "Bearer " + k.token }, (opcoes && opcoes.headers) || {}),
    body: opcoes && opcoes.body
  });
  if (!res.ok) throw new Error("KV " + res.status);
  return res.json();
}

function autorizado(req) {
  const t = process.env.SV_LOJA_TOKEN;
  if (!t) return true;
  return req.headers.get("x-loja-token") === t;
}

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
    if (!configKV()) {
      return Response.json({ ok: false, erro: "Armazenamento (Vercel KV) ainda não configurado" }, { status: 503 });
    }

    if (req.method === "GET" || req.method === "HEAD") {
      try {
        const c = await lerCatalogo();
        return Response.json({ ok: true, catalogo: c });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao ler catálogo" }, { status: 500 });
      }
    }

    if (req.method === "POST" || req.method === "PUT") {
      if (!autorizado(req)) {
        return Response.json({ ok: false, erro: "Sem autorização" }, { status: 401 });
      }
      let corpo;
      try {
        corpo = await req.json();
      } catch (e) {}
      if (!corpo || !Array.isArray(corpo.marcas) || !Array.isArray(corpo.produtos)) {
        return Response.json({ ok: false, erro: "Catálogo inválido" }, { status: 400 });
      }
      const tamanho = JSON.stringify(corpo).length;
      if (tamanho > 900000) {
        return Response.json({ ok: false, erro: "Catálogo grande demais (use fotos na nuvem)" }, { status: 413 });
      }
      const atualizadoEm = corpo.atualizadoEm || Date.now();
      const catalogo = {
        atualizadoEm: atualizadoEm,
        marcas: corpo.marcas,
        produtos: corpo.produtos
      };
      try {
        await kvChamar("/set/" + CHAVE, { method: "POST", body: JSON.stringify(catalogo) });
        return Response.json({ ok: true, catalogo: catalogo }, { status: 200 });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao salvar catálogo" }, { status: 500 });
      }
    }

    if (req.method === "DELETE") {
      if (!autorizado(req)) {
        return Response.json({ ok: false, erro: "Sem autorização" }, { status: 401 });
      }
      try {
        await kvChamar("/del/" + CHAVE, { method: "POST" });
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao limpar catálogo" }, { status: 500 });
      }
    }

    return Response.json({ ok: false, erro: "Método não permitido" }, { status: 405 });
  }
};