/* Sincroniza o snapshot local (js/dados.js) com o catálogo da nuvem.
   Uso: node scripts/sync-dados.js
   - Mantém as fotos locais de marca que a nuvem não tem (mesclando por nome).
   - Assim a home já abre com o catálogo certo, sem recarregar a página. */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const ARQUIVO = path.join(RAIZ, "js", "dados.js");
const API = process.env.SV_API || "https://saraiva-vopoo.vercel.app/api/catalogo";

const APELIDOS = {
  ignitepods: "ignite",
  elfbarpods: "elfbar",
  lifepods: "lifepod",
  blackcheeppods: "blacksheep",
  nikbarpods: "nikbar",
  blvkpod: "blvk",
  oxbarpods: "oxbar",
  dinnerpods: "dinner",
  reabbeats: "realbeatsbyelfbar"
};

function normalizar(t) {
  return String(t == null ? "" : t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function limparVersao(url) {
  return String(url || "").replace(/\?v=[^&]*$/, "");
}

function lerDados() {
  const bruto = fs.readFileSync(ARQUIVO, "utf8");
  const json = bruto.replace(/^\uFEFF?var BANCO_DADOS\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(json);
}

function juntarFotos(locais, remoto) {
  const fotosMarca = {};
  (locais.marcas || []).forEach((m) => {
    if (m && m.imagem) fotosMarca[normalizar(m.nome)] = limparVersao(m.imagem);
  });

  let marcasComFoto = 0;
  (remoto.marcas || []).forEach((m) => {
    if (!m || m.imagem) {
      if (m && m.imagem) marcasComFoto++;
      return;
    }
    const chave = normalizar(m.nome);
    const alvo = APELIDOS[chave] || "";
    let foto = alvo && fotosMarca[alvo] ? fotosMarca[alvo] : "";
    if (!foto) {
      let melhor = "";
      Object.keys(fotosMarca).forEach((k) => {
        if (chave.indexOf(k) === 0 || k.indexOf(chave) === 0) {
          if (k.length > melhor.length) melhor = k;
        }
      });
      if (melhor) foto = fotosMarca[melhor];
    }
    if (foto) {
      m.imagem = foto;
      marcasComFoto++;
    }
  });

  const fotosProduto = {};
  (locais.produtos || []).forEach((p) => {
    if (p && p.imagem) fotosProduto[normalizar(p.nome)] = limparVersao(p.imagem);
  });
  (remoto.produtos || []).forEach((p) => {
    if (!p || p.imagem) return;
    const foto = fotosProduto[normalizar(p.nome)];
    if (foto) p.imagem = foto;
  });

  return { marcasComFoto };
}

async function main() {
  const locais = lerDados();
  const resposta = await fetch(API, { headers: { "cache-control": "no-cache" } });
  if (!resposta.ok) throw new Error("API respondeu " + resposta.status);
  const json = await resposta.json();
  if (!json || !json.ok || !json.catalogo) throw new Error("API sem catálogo válido");
  const remoto = json.catalogo;
  if (!Array.isArray(remoto.marcas) || !Array.isArray(remoto.produtos)) {
    throw new Error("Catálogo da nuvem inválido");
  }

  const antes = (locais.marcas || []).filter((m) => m && m.imagem).length;
  const { marcasComFoto } = juntarFotos(locais, remoto);
  const saida = "var BANCO_DADOS = " + JSON.stringify(remoto, null, 2) + ";\n";
  fs.writeFileSync(ARQUIVO, saida, "utf8");

  console.log(
    "dados.js sincronizado: " +
      remoto.marcas.length +
      " marcas (" +
      marcasComFoto +
      " com foto, antes " +
      antes +
      ") e " +
      remoto.produtos.length +
      " produtos."
  );
}

main().catch((e) => {
  console.error("Falhou: " + e.message);
  process.exit(1);
});
