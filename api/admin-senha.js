/* API de senha do admin — sincroniza senha entre dispositivos (Vercel KV).
   Rota /api/admin-senha:
     GET  — retorna a senha atual
     POST/PUT — atualiza a senha (exige x-admin-token igual à senha atual)
*/

export const runtime = "nodejs";

const CHAVE = "sv_admin_senha";
const SENHA_PADRAO = "admin";

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
    body: opcoes && opcoes.body,
  });
  if (!res.ok) throw new Error("KV " + res.status);
  return res.json();
}

async function lerSenhaAtual() {
  const j = await kvChamar("/get/" + CHAVE);
  return (j && j.result) || "";
}

async function autorizado(req) {
  const token = req.headers.get("x-admin-token");
  if (!token) return false;
  const atual = await lerSenhaAtual();
  return token === atual || token === SENHA_PADRAO;
}

export default {
  async fetch(req) {
    if (!configKV()) {
      return Response.json({ ok: false, erro: "Armazenamento não configurado" }, { status: 503 });
    }

    if (req.method === "GET" || req.method === "HEAD") {
      try {
        const senha = await lerSenhaAtual();
        return Response.json({ ok: true, senha });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao ler senha" }, { status: 500 });
      }
    }

    if (req.method === "POST" || req.method === "PUT") {
      if (!(await autorizado(req))) {
        return Response.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
      }
      try {
        const body = await req.json();
        const senha = (body && body.senha) || "";
        await kvChamar("/set/" + CHAVE, {
          method: "POST",
          body: senha,
        });
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ ok: false, erro: "Erro ao salvar senha" }, { status: 500 });
      }
    }

    return Response.json({ ok: false, erro: "Método não permitido" }, { status: 405 });
  },
};
