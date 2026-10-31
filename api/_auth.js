/* Autenticação do painel — sem senha em texto puro e sem token público.
   - A senha fica no Vercel KV apenas como hash (SHA-256 + salt).
   - O login devolve um cookie de sessão HttpOnly assinado (HMAC).
   - As rotas de escrita (catálogo, fotos, vendas) exigem essa sessão. */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CHAVE = "sv_admin_senha";
const COOKIE = "sv_sess";
const SENHA_PADRAO = "admin";
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TENTATIVAS = 12;
const JANELA_TENTATIVAS = 600; // segundos

export function configKV() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: String(url).replace(/\/+$/, ""), token };
}

export function kvOK() {
  return !!configKV();
}

export async function kvChamar(caminho, opcoes) {
  const k = configKV();
  const res = await fetch(k.url + caminho, {
    method: (opcoes && opcoes.method) || "GET",
    headers: Object.assign({ Authorization: "Bearer " + k.token }, (opcoes && opcoes.headers) || {}),
    body: opcoes && opcoes.body,
  });
  if (!res.ok) throw new Error("KV " + res.status);
  return res.json();
}

async function lerBruto() {
  const j = await kvChamar("/get/" + CHAVE);
  return j && typeof j.result === "string" ? j.result : "";
}

function registroDe(bruto) {
  if (!bruto) return null;
  try {
    const x = JSON.parse(bruto);
    if (x && x.v === 2 && x.hash && x.salt && x.secret) return x;
  } catch (e) {}
  return { v: 1, senha: bruto };
}

function hashDe(senha, salt) {
  return createHash("sha256").update(salt + "|" + senha).digest("hex");
}

function igualSeguro(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function gravarRegistro(senha) {
  const salt = randomBytes(16).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const reg = {
    v: 2,
    salt: salt,
    hash: hashDe(senha, salt),
    secret: secret,
    atualizadoEm: Date.now(),
  };
  await kvChamar("/set/" + CHAVE, { method: "POST", body: JSON.stringify(reg) });
  return reg;
}

/* Confere a senha e converte o formato antigo (texto puro) para hash. */
export async function verificarSenha(senha) {
  const reg = registroDe(await lerBruto());
  if (!reg) {
    if (senha !== SENHA_PADRAO) return null;
    return await gravarRegistro(SENHA_PADRAO);
  }
  if (reg.v === 1) {
    if (!igualSeguro(senha, reg.senha)) return null;
    return await gravarRegistro(senha);
  }
  if (!igualSeguro(hashDe(senha, reg.salt), reg.hash)) return null;
  return reg;
}

export async function senhaDefinida() {
  return !!(await lerBruto());
}

export async function trocarSenha(senhaNova) {
  return await gravarRegistro(senhaNova);
}

function assinar(segredo, texto) {
  return createHmac("sha256", segredo).update(texto).digest("base64url");
}

export function criarCookie(reg) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + DURACAO_MS })).toString("base64url");
  const token = payload + "." + assinar(reg.secret, payload);
  return (
    COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + Math.floor(DURACAO_MS / 1000)
  );
}

export function cookieDeSaida() {
  return COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

function tokenDoPedido(req) {
  const cab = req.headers.get("cookie") || "";
  const partes = cab.split(";");
  for (let i = 0; i < partes.length; i++) {
    const t = partes[i].trim();
    if (t.indexOf(COOKIE + "=") === 0) return t.slice(COOKIE.length + 1);
  }
  return "";
}

export async function sessaoValida(req) {
  const token = tokenDoPedido(req || { headers: { get: function () { return ""; } } });
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const reg = registroDe(await lerBruto());
  if (!reg || !reg.secret) return false;
  if (!igualSeguro(partes[1], assinar(reg.secret, partes[0]))) return false;
  try {
    const dados = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
    return !!(dados && dados.exp && dados.exp > Date.now());
  } catch (e) {
    return false;
  }
}

/* Limite simples de tentativas de senha por IP (guardado no KV). */
export async function dentroDoLimite(req) {
  try {
    const ip = String(req.headers.get("x-forwarded-for") || "sem-ip").split(",")[0].trim();
    const chave = "sv_tent:" + (ip || "sem-ip");
    const j = await kvChamar("/incr/" + chave, { method: "POST" });
    const n = Number(j && j.result) || 0;
    if (n === 1) await kvChamar("/expire/" + chave + "/" + JANELA_TENTATIVAS, { method: "POST" });
    return n <= MAX_TENTATIVAS;
  } catch (e) {
    return true;
  }
}

export function respostaJSON(corpo, status, cabecalhos) {
  return new Response(JSON.stringify(corpo), {
    status: status || 200,
    headers: Object.assign(
      { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      cabecalhos || {}
    ),
  });
}
