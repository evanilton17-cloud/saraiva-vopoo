/* API de senha do admin — login, logout e troca de senha.
   Rota /api/admin-senha:
     GET      — diz apenas se existe senha e se a sessão está ativa (nunca devolve a senha)
     POST     — { senha } entra no painel · { senhaAtual, senhaNova } troca a senha
     DELETE   — sai (apaga o cookie de sessão) */

import {
  criarCookie,
  cookieDeSaida,
  dentroDoLimite,
  kvOK,
  respostaJSON,
  senhaDefinida,
  sessaoValida,
  trocarSenha,
  verificarSenha,
} from "./_auth.js";

export const runtime = "nodejs";

export default {
  async fetch(req) {
    if (!kvOK()) {
      return respostaJSON({ ok: false, erro: "Armazenamento (Vercel KV) ainda não configurado" }, 503);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      try {
        const definida = await senhaDefinida();
        const logado = await sessaoValida(req);
        return respostaJSON({ ok: true, definida: definida, logado: logado });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao ler a senha" }, 500);
      }
    }

    if (req.method === "DELETE") {
      return respostaJSON({ ok: true }, 200, { "set-cookie": cookieDeSaida() });
    }

    if (req.method === "POST" || req.method === "PUT") {
      let corpo = {};
      try {
        corpo = await req.json();
      } catch (e) {}

      const senhaAtual = typeof corpo.senhaAtual === "string" ? corpo.senhaAtual : "";
      const senhaNova = typeof corpo.senhaNova === "string" ? corpo.senhaNova : "";

      /* Troca de senha */
      if (senhaNova) {
        if (senhaNova.length < 4) {
          return respostaJSON({ ok: false, erro: "A nova senha deve ter ao menos 4 caracteres" }, 400);
        }
        try {
          if (!(await sessaoValida(req))) {
            if (!(await dentroDoLimite(req))) {
              return respostaJSON({ ok: false, erro: "Muitas tentativas. Tente de novo em alguns minutos." }, 429);
            }
            const atual = await verificarSenha(senhaAtual);
            if (!atual) return respostaJSON({ ok: false, erro: "Senha atual incorreta" }, 401);
          }
          const reg = await trocarSenha(senhaNova);
          return respostaJSON({ ok: true, logado: true }, 200, { "set-cookie": criarCookie(reg) });
        } catch (e) {
          return respostaJSON({ ok: false, erro: "Erro ao salvar a senha" }, 500);
        }
      }

      /* Login */
      const senha = typeof corpo.senha === "string" ? corpo.senha : "";
      if (!senha) return respostaJSON({ ok: false, erro: "Informe a senha" }, 400);

      try {
        if (!(await dentroDoLimite(req))) {
          return respostaJSON({ ok: false, erro: "Muitas tentativas. Tente de novo em alguns minutos." }, 429);
        }
        const reg = await verificarSenha(senha);
        if (!reg) return respostaJSON({ ok: false, erro: "Senha incorreta" }, 401);
        return respostaJSON({ ok: true, logado: true }, 200, { "set-cookie": criarCookie(reg) });
      } catch (e) {
        return respostaJSON({ ok: false, erro: "Erro ao conferir a senha" }, 500);
      }
    }

    return respostaJSON({ ok: false, erro: "Método não permitido" }, 405);
  },
};
