/* Taxas de entrega — Paraná/RO.
   Fonte única usada pelo carrinho e pelo cupom do pedido.
   Bairros fora da lista pagam a taxa padrão. Ruas "T" (T1, T2, T3...)
   também entram na taxa de R$ 15,00. */

var TAXA_PADRAO_ENTREGA = 15;

var REGRAS_ENTREGA = [
  {
    chave: "1-distrito",
    nome: "1º Distrito",
    taxa: 10,
    termos: ["1 distrito", "distrito 1", "primeiro distrito", "jd 1 distrito"]
  },
  {
    chave: "copas-verdes",
    nome: "Copas Verdes",
    taxa: 12,
    termos: ["copas verdes", "copas"]
  },
  {
    chave: "milao",
    nome: "Milão",
    taxa: 15,
    termos: ["milao"]
  },
  {
    chave: "2-distrito",
    nome: "2º Distrito",
    taxa: 12,
    termos: ["2 distrito", "distrito 2", "segundo distrito", "jd 2 distrito"]
  },
  {
    chave: "ruas-t",
    nome: "Ruas T (T1, T2, T3...)",
    taxa: 15,
    termos: []
  },
  {
    chave: "capelasso",
    nome: "Capelasso",
    taxa: 20,
    termos: ["capelasso"]
  }
];

function normalizarParaEntrega(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/º|°/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* Reconhece o bairro pelo endereço digitado ("Rua X, 10, Copas Verdes").
   As ruas de atravessado começam com T seguido de número (T1, T2, T15...). */
function regraEntregaPorEndereco(endereco) {
  var alvo = normalizarParaEntrega(endereco);
  if (!alvo) return null;

  for (var i = 0; i < REGRAS_ENTREGA.length; i++) {
    var regra = REGRAS_ENTREGA[i];
    for (var j = 0; j < regra.termos.length; j++) {
      var termo = normalizarParaEntrega(regra.termos[j]);
      if (termo && alvo.indexOf(termo) !== -1) return regra;
    }
  }

  if (/\bt\s*\d+\b/.test(alvo)) {
    for (var k = 0; k < REGRAS_ENTREGA.length; k++) {
      if (REGRAS_ENTREGA[k].chave === "ruas-t") return REGRAS_ENTREGA[k];
    }
  }
  return null;
}

function regraEntregaPorChave(chave) {
  for (var i = 0; i < REGRAS_ENTREGA.length; i++) {
    if (REGRAS_ENTREGA[i].chave === chave) return REGRAS_ENTREGA[i];
  }
  return null;
}

function chaveEntregaPorEndereco(endereco) {
  var regra = regraEntregaPorEndereco(endereco);
  return regra ? regra.chave : "outro";
}

function taxaDaChaveEntrega(chave) {
  var regra = regraEntregaPorChave(chave);
  return regra ? regra.taxa : TAXA_PADRAO_ENTREGA;
}

function nomeDaChaveEntrega(chave) {
  var regra = regraEntregaPorChave(chave);
  return regra ? regra.nome : "Outro bairro";
}
