/* API de vendas — sincroniza pedidos entre o site e o painel (Vercel Function, Web Handler).
   Rota /api/venda:
     POST   — cliente registra o pedido (público)
     GET    — painel logado lista as vendas
     DELETE — painel logado exclui/limpa */

import { kvChamar, kvOK, respostaJSON, sessaoValida } from "./_auth.js";

export const runtime = "nodejs";

const CHAVE = "sv_vendas";

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

export default {
  async fetch(req) {
    if (!kvOK()) {
      return respostaJSON(
        { ok: false, erro: "Armazenamento (Vercel KV) ainda não configurado" },
        503
      );
    }

    const metodo = req.method;

    /* Pedido do cliente: aberto, sem login. */
    if (metodo === "POST") {
      let v = null;
      try {
        v = (await req.json()).venda;
      } catch (e) {}
      if (!vendaValida(v)) {
        return respostaJSON({ ok: false, erro: "Venda inválida" }, 400);
      }
      try {
        const atuais = await todasVendas();
        if (atuais.some((x) => x.v && x.v.ncupom === v.ncupom)) {
          return respostaJSON({ ok: false, erro: "Cupom duplicado" }, 409);
        }
        await kvChamar("/lpush/" + CHAVE, { method: "POST", body: envelope(v) });
        return respostaJSON({ ok: true, venda: v }, 201);
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao salvar venda" }, 500);
      }
    }

    /* Daqui pra baixo só o painel logado. */
    if (!(await sessaoValida(req))) {
      return respostaJSON({ ok: false, erro: "Entre no painel para ver as vendas" }, 401);
    }

    if (metodo === "GET") {
      try {
        const lista = await todasVendas();
        return respostaJSON({ ok: true, vendas: lista.map((x) => x.v) });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao ler vendas" }, 500);
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
          return respostaJSON({ ok: true });
        } catch (e) {
          return respostaJSON({ ok: false, erro: "Erro ao limpar" }, 500);
        }
      }
      if (!corpo.id) {
        return respostaJSON({ ok: false, erro: "Sem id" }, 400);
      }
      try {
        const lista2 = await todasVendas();
        const alvo = lista2.filter((x) => x.v && x.v.id === corpo.id)[0];
        if (alvo) {
          await kvChamar("/lrem/" + CHAVE + "/0", { method: "POST", body: envelope(alvo.v) });
        }
        return respostaJSON({ ok: true });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao excluir venda" }, 500);
      }
    }

    return respostaJSON({ ok: false, erro: "Método não permitido" }, 405);
  },
};
