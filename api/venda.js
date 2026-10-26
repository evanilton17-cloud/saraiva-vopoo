/* API de vendas — sincroniza pedidos entre o site e o painel (Vercel Function, Web Handler).
   Usa o Vercel KV (Upstash Redis) via variáveis KV_REST_API_URL e KV_REST_API_TOKEN.
   Rota /api/venda:  GET (listar) · POST (registrar) · DELETE (excluir/limpar). */

export const runtime = "nodejs";

const CHAVE = "sv_vendas";

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

async function todasVendas() {
  const j = await kvChamar("/lrange/" + CHAVE + "/0/-1");
  const arr = (j && j.result) || [];
  return arr
    .map((s) => {
      try {
        const x = JSON.parse(s);
        return x && x.v ? x : null;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

function envelope(venda) {
  return JSON.stringify({ id: venda.id, v: venda });
}

function vendaValida(v) {
  return (
    v &&
    typeof v === "object" &&
    Array.isArray(v.itens) &&
    v.itens.length > 0 &&
    typeof v.total === "number" &&
    typeof v.ncupom === "string" &&
    v.ncupom.length > 0 &&
    typeof v.pagamento === "string" &&
    v.pagamento.length > 0
  );
}

function autorizado(req) {
  const t = process.env.SV_LOJA_TOKEN;
  if (!t) return true;
  return req.headers.get("x-loja-token") === t;
}

export default {
  async fetch(req) {
    if (!configKV()) {
      return Response.json({ ok: false, erro: "Armazenamento (Vercel KV) ainda não configurado" }, { status: 503 });
    }
    if (!autorizado(req)) {
      return Response.json({ ok: false, erro: "Sem autorização" }, { status: 401 });
    }

    const metodo = req.method;

    if (metodo === "GET") {
      try {
        const lista = await todasVendas();
        return Response.json({ ok: true, vendas: lista.map((x) => x.v) });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao ler vendas" }, { status: 500 });
      }
    }

    if (metodo === "POST") {
      let v = null;
      try {
        v = (await req.json()).venda;
      } catch (e) {}
      if (!vendaValida(v)) {
        return Response.json({ ok: false, erro: "Venda inválida" }, { status: 400 });
      }
      try {
        const atuais = await todasVendas();
        if (atuais.some((x) => x.v && x.v.ncupom === v.ncupom)) {
          return Response.json({ ok: false, erro: "Cupom duplicado" }, { status: 409 });
        }
        await kvChamar("/lpush/" + CHAVE, { method: "POST", body: envelope(v) });
        return Response.json({ ok: true, venda: v }, { status: 201 });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao salvar venda" }, { status: 500 });
      }
    }

    if (metodo === "DELETE") {
      const params = new URL(req.url).searchParams;
      let corpo = {};
      if (params.has("limpar")) corpo.limpar = params.get("limpar") === "1";
      if (params.has("id")) corpo.id = params.get("id");
      try {
        const t = await req.json();
        if (t && typeof t === "object") corpo = Object.assign(corpo, t);
      } catch (e) {}
      if (corpo.limpar === true) {
        try {
          await kvChamar("/del/" + CHAVE, { method: "POST" });
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json({ ok: false, erro: "Erro ao limpar" }, { status: 500 });
        }
      }
      if (!corpo.id) {
        return Response.json({ ok: false, erro: "Sem id" }, { status: 400 });
      }
      try {
        const lista2 = await todasVendas();
        const alvo = lista2.filter((x) => x.v && x.v.id === corpo.id)[0];
        if (alvo) {
          await kvChamar("/lrem/" + CHAVE + "/0", { method: "POST", body: envelope(alvo.v) });
        }
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao excluir venda" }, { status: 500 });
      }
    }

    return Response.json({ ok: false, erro: "Método não permitido" }, { status: 405 });
  }
};