var CARRINHO_CHAVE = "sv_carrinho";
var carrinho = [];

function carregarCarrinho() {
  try {
    carrinho = JSON.parse(localStorage.getItem(CARRINHO_CHAVE)) || [];
  } catch (e) {
    carrinho = [];
  }
}

function salvarCarrinho() {
  try {
    localStorage.setItem(CARRINHO_CHAVE, JSON.stringify(carrinho));
  } catch (e) {}
  atualizarBadge();
}

function totalQtde() {
  return carrinho.reduce(function (soma, item) {
    return soma + item.qtd;
  }, 0);
}

function totalPreco() {
  return carrinho.reduce(function (soma, item) {
    return soma + item.qtd * item.preco;
  }, 0);
}

function atualizarBadge() {
  var badge = document.getElementById("carrinho-badge");
  if (!badge) return;
  var t = totalQtde();
  badge.textContent = t;
  badge.hidden = t === 0;
}

function produtoPorId(id) {
  var p = null;
  BANCO_DADOS.produtos.forEach(function (prod) {
    if (prod.id === id) p = prod;
  });
  return p;
}

function chaveItem(prodId, sabor) {
  return prodId + "|" + sabor;
}

function adicionarAoCarrinho(prodId, sabor, qtd) {
  var prod = produtoPorId(prodId);
  if (!prod) return;
  var desconto = prod.precoPromo || 0;
  var preco = desconto || prod.preco;
  var k = chaveItem(prodId, sabor);
  var achou = false;
  carrinho.forEach(function (item) {
    if (item.k === k) {
      item.qtd += qtd;
      achou = true;
    }
  });
  if (!achou) {
    carrinho.push({
      k: k,
      prodId: prodId,
      nome: prod.nome,
      sabor: sabor || "Padrão",
      preco: preco,
      qtd: qtd
    });
  }
  salvarCarrinho();
  renderizarCarrinho();
  mostrarToast('<b>' + prod.nome + "</b><br>adicionado ao pedido ✓");
}

function alterarQtd(k, delta) {
  carrinho.forEach(function (item) {
    if (item.k === k) {
      item.qtd += delta;
      if (item.qtd < 1) item.qtd = 1;
    }
  });
  salvarCarrinho();
  renderizarCarrinho();
}

function removerItem(k) {
  carrinho = carrinho.filter(function (item) {
    return item.k !== k;
  });
  salvarCarrinho();
  renderizarCarrinho();
}

function abrirCarrinho() {
  var drawer = document.getElementById("carrinho-drawer");
  var overlay = document.getElementById("carrinho-overlay");
  if (drawer) drawer.classList.add("aberto");
  if (overlay) overlay.classList.add("aberto");
  document.body.style.overflow = "hidden";
}

function fecharCarrinho() {
  var drawer = document.getElementById("carrinho-drawer");
  var overlay = document.getElementById("carrinho-overlay");
  if (drawer) drawer.classList.remove("aberto");
  if (overlay) overlay.classList.remove("aberto");
  document.body.style.overflow = "";
}

function montarTextoPedido() {
  var linhas = carrinho.map(function (item) {
    return (
      "• " + item.nome + " — " + item.sabor + " — " + item.qtd + "x — " + formatarPreco(item.qtd * item.preco)
    );
  });
  var texto =
    "Olá! 👋 Quero finalizar meu pedido:\n" +
    linhas.join("\n") +
    "\n\nTotal: " +
    formatarPreco(totalPreco());
  return texto;
}

function celulaItem(item) {
  var prod = produtoPorId(item.prodId);
  var grad = prod ? gradiente(prod.cor1, prod.cor2) : "linear-gradient(135deg,#444,#222)";
  return (
    '<div class="carrinho-item">' +
    '<div class="foto" style="background:' +
    grad +
    '">' +
    iniciais(item.nome) +
    "</div>" +
    '<div class="infos">' +
    '<div class="nome">' +
    item.nome +
    "</div>" +
    '<div class="sabor">' +
    item.sabor +
    "</div>" +
    '<div class="preco">' +
    formatarPreco(item.preco) +
    "</div>" +
    '<div class="controles">' +
    '<span class="stepper"><button data-qtd="-1" data-k="' +
    item.k +
    '">−</button><span class="qtd-valor">' +
    item.qtd +
    '</span><button data-qtd="1" data-k="' +
    item.k +
    '">+</button></span>' +
    '<button class="remover-btn" data-remover="' +
    item.k +
    '">Remover</button>' +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

function renderizarCarrinho() {
  var itens = document.getElementById("carrinho-itens");
  var rodape = document.getElementById("carrinho-rodape");
  if (!itens || !rodape) return;
  document.getElementById("carrinho-chekout").disabled = carrinho.length === 0;

  if (!carrinho.length) {
    itens.innerHTML =
      '<div class="carrinho-vazio"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Seu pedido está vazio.<br>Escolha um produto no catálogo.</div>';
    rodape.innerHTML =
      '<div class="total-linha"><span>Total</span><strong>' +
      formatarPreco(0) +
      "</strong></div>" +
      '<button class="btn btn-whats" id="carrinho-chekout" disabled>Finalizar no WhatsApp</button>';
    return;
  }

  itens.innerHTML = carrinho.map(celulaItem).join("");
  rodape.innerHTML =
    '<div class="total-linha"><span>Total</span><strong>' +
    formatarPreco(totalPreco()) +
    "</strong></div>" +
    '<button class="btn btn-whats" id="carrinho-chekout">Finalizar pedido no WhatsApp</button>';
}

function initCarrinho() {
  carregarCarrinho();

  var overlay = document.createElement("div");
  overlay.id = "carrinho-overlay";
  overlay.className = "carrinho-overlay";
  document.body.appendChild(overlay);

  var drawer = document.createElement("aside");
  drawer.id = "carrinho-drawer";
  drawer.className = "carrinho-drawer";
  drawer.innerHTML =
    '<div class="cab"><h3>Seu pedido</h3><button class="fechar-btn" id="fechar-carrinho" aria-label="Fechar">✕</button></div>' +
    '<div class="carrinho-itens" id="carrinho-itens"></div>' +
    '<div class="carrinho-rodape" id="carrinho-rodape"></div>';
  document.body.appendChild(drawer);

  document.getElementById("abrir-carrinho").addEventListener("click", function () {
    renderizarCarrinho();
    abrirCarrinho();
  });
  document.getElementById("fechar-carrinho").addEventListener("click", fecharCarrinho);
  overlay.addEventListener("click", fecharCarrinho);

  document.addEventListener("click", function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.add) {
      var prod = produtoPorId(el.dataset.add);
      if (prod) {
        var sabor = prod.sabores.filter(function (s) {
          return s.estoque;
        })[0];
        adicionarAoCarrinho(prod.id, sabor ? sabor.nome : "", 1);
      }
      return;
    }
    if (el.dataset && (el.dataset.qtd || el.dataset.remover)) {
      if (el.dataset.qtd) alterarQtd(el.dataset.k, Number(el.dataset.qtd));
      if (el.dataset.remover) removerItem(el.dataset.remover);
      return;
    }
    if (el.id === "carrinho-chekout") {
      window.open(waLink(montarTextoPedido()), "_blank");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharCarrinho();
  });

  atualizarBadge();
  renderizarCarrinho();
}