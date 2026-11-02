/* Espelha o snapshot local (js/dados.js) com o catálogo da nuvem.
   Uso: node scripts/sync-dados.js
   A nuvem é a fonte da verdade — inclusive quando uma imagem é removida
   no painel. Assim a home já abre com o catálogo certo, sem piscar nem
   ressuscitar fotos apagadas. */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO = path.join(RAIZ, "js", "dados.js");
const API = process.env.SV_API || "https://saraiva-vopoo.vercel.app/api/catalogo";

async function main() {
  const resposta = await fetch(API, { headers: { "cache-control": "no-cache" } });
  if (!resposta.ok) throw new Error("API respondeu " + resposta.status);
  const json = await resposta.json();
  if (!json || !json.ok || !json.catalogo) throw new Error("API sem catálogo válido");
  const remoto = json.catalogo;
  if (!Array.isArray(remoto.marcas) || !Array.isArray(remoto.produtos)) {
    throw new Error("Catálogo da nuvem inválido");
  }

  const saida = "var BANCO_DADOS = " + JSON.stringify(remoto, null, 2) + ";\n";
  fs.writeFileSync(ARQUIVO, saida, "utf8");

  console.log(
    "dados.js sincronizado: " +
      remoto.marcas.length +
      " marcas (" +
      remoto.marcas.filter((m) => m && m.imagem).length +
      " com foto) e " +
      remoto.produtos.length +
      " produtos (" +
      remoto.produtos.filter((p) => p && p.imagem).length +
      " com foto)."
  );
}

main().catch((e) => {
  console.error("Falhou: " + e.message);
  process.exit(1);
});
