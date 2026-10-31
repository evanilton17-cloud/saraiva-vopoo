var CARRINHO_CHAVE = "sv_carrinho";
var carrinho = [];

function enviarVendaServidor(venda) {
  try {
    fetch("api/venda", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venda: venda }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
}

function escapeAttr(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function carregarCarrinho() {
  try {
    carrinho = JSON.parse(sessionStorage.getItem(CARRINHO_CHAVE)) || [];
  } catch (e) {
    carrinho = [];
  }
}

function salvarCarrinho() {
  try {
    sessionStorage.setItem(CARRINHO_CHAVE, JSON.stringify(carrinho));
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

var cupomCorrente = null;
var pagamentoCorrente = "";

function codigoPedido() {
  var d = new Date();
  return "SV" + String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + "-" + Math.floor(100 + Math.random() * 900);
}

function montarTextoPedido() {
  if (!cupomCorrente) cupomCorrente = codigoPedido();
  var todo = carrinho
    .map(function (item) {
      return (
        "• " + item.nome + " — " + item.sabor + " — " + item.qtd + "x — " + formatarPreco(item.qtd * item.preco)
      );
    })
    .join("\n");
  var campos = campoEntrega();
  var texto =
    "Olá! 👋 Quero finalizar meu pedido:\n" +
    "Pedido: " + cupomCorrente + "\n" +
    (campos.nome ? "Nome: " + campos.nome + "\n" : "") +
    todo +
    "\n\nTotal: " +
    formatarPreco(totalPreco()) +
    (campos.entrega ? "\nEntrega: " + campos.entrega : "") +
    (pagamentoCorrente ? "\nPagamento: " + pagamentoCorrente : "");
  return texto;
}

function campoEntrega() {
  var nomeEl = document.getElementById("cliente-nome");
  var entregaEl = document.getElementById("cliente-entrega");
  return {
    nome: (nomeEl && nomeEl.value.trim()) || "",
    entrega: entregaEl ? entregaEl.value : ""
  };
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
  var chekout = document.getElementById("carrinho-chekout");
  if (chekout) chekout.disabled = carrinho.length === 0;

  if (!carrinho.length) {
    itens.innerHTML =
      '<div class="carrinho-vazio"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Seu pedido está vazio.<br>Escolha um produto no catálogo.</div>';
    rodape.innerHTML =
      '<div class="total-linha"><span>Total</span><strong>' +
      formatarPreco(0) +
      "</strong></div>" +
      '<button class="btn btn-primario" id="carrinho-chekout" disabled>Finalizar pedido</button>';
    return;
  }

  var cliente = campoEntrega();
  itens.innerHTML = carrinho.map(celulaItem).join("");
  rodape.innerHTML =
    '<div class="campo"><label for="cliente-nome">Seu nome</label>' +
    '<input type="text" id="cliente-nome" placeholder="Como podemos te chamar?" maxlength="60" value="' +
    escapeAttr(cliente.nome) +
    '"></div>' +
    '<div class="campo"><label for="cliente-entrega">Entrega</label>' +
    '<select id="cliente-entrega"><option value="Entrega (combinar taxa)"' +
    (cliente.entrega === "Entrega (combinar taxa)" ? " selected" : "") +
    ">Entrega (combinar taxa)</option></select></div>" +
    '<div class="total-linha"><span>Total</span><strong>' +
    formatarPreco(totalPreco()) +
    "</strong></div>" +
    '<button class="btn btn-primario" id="carrinho-chekout">Finalizar pedido</button>';
}

function copiarCupom() {
  if (!pagamentoCorrente) {
    mostrarToast("<b>Escolha a forma de pagamento</b><br>Dinheiro, cartão ou Pix.");
    return;
  }
  var ta = document.getElementById("cupom-texto");
  if (!ta) return;
  var feito = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value);
      feito = true;
    }
  } catch (e) {}
  if (!feito) {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    try {
      document.execCommand("copy");
      feito = true;
    } catch (e) {}
  }
  if (feito) {
    var registrada = registrarVendaAuto();
    if (registrada) limparCarrinho();
    mostrarToast(
      registrada
        ? "<b>Cupom copiado ✓</b><br>Pedido registrado na loja."
        : "<b>Cupom copiado ✓</b><br>Cole na conversa da loja para confirmar."
    );
  }
}

function registrarVendaAuto() {
  if (!cupomCorrente || !carrinho.length || !pagamentoCorrente) return false;
  var agora = new Date();
  var campos = campoEntrega();
  var v = {
    id: "v-" + agora.getTime().toString(36) + "-" + Math.floor(Math.random() * 9999).toString(36),
    data: agora.getFullYear() + "-" + String(agora.getMonth() + 1).padStart(2, "0") + "-" + String(agora.getDate()).padStart(2, "0"),
    hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    ncupom: cupomCorrente,
    cliente: campos.nome,
    itens: carrinho.map(function (it) {
      return { nome: it.nome, sabor: it.sabor, qtd: it.qtd, valor: it.preco };
    }),
    total: totalPreco(),
    pagamento: pagamentoCorrente,
    entrega: campos.entrega
  };
  var vendas = [];
  try {
    vendas = JSON.parse(localStorage.getItem("sv_vendas")) || [];
  } catch (e) {
    vendas = [];
  }
  if (!Array.isArray(vendas)) vendas = [];
  if (vendas.some(function (x) { return x.ncupom && x.ncupom === v.ncupom; })) return false;
  vendas.push(v);
  try {
    localStorage.setItem("sv_vendas", JSON.stringify(vendas));
  } catch (e) {
    return false;
  }
  enviarVendaServidor(v);
  return true;
}

function limparCarrinho() {
  cupomCorrente = null;
  pagamentoCorrente = "";
  carrinho = [];
  salvarCarrinho();
}

function escolherPagamento(pg) {
  pagamentoCorrente = pg;
  document.querySelectorAll(".pagto-btn").forEach(function (b) {
    b.classList.toggle("sel", b.dataset.pag === pg);
  });
  atualizarTextoCupom();
}

function atualizarTextoCupom() {
  var ta = document.getElementById("cupom-texto");
  if (ta) ta.value = montarTextoPedido();
}

function mostrarCupom() {
  var itens = document.getElementById("carrinho-itens");
  var rodape = document.getElementById("carrinho-rodape");
  var cupom = document.getElementById("carrinho-cupom");
  var titulo = document.querySelector("#carrinho-drawer .cab h3");
  if (!cupom) return;
  montarTextoPedido();
  if (itens) itens.style.display = "none";
  if (rodape) rodape.style.display = "none";
  cupom.hidden = false;
  cupom.innerHTML =
    '<div class="cupom-num">' + cupomCorrente + "</div>" +
    '<div class="cupom-pagto"><span class="cupom-pagto-label">Como vai pagar?</span>' +
    '<div class="pagto-opcoes">' +
    '<button class="pagto-btn" data-pag="Dinheiro" type="button">Dinheiro</button>' +
    '<button class="pagto-btn" data-pag="Cartão" type="button">Cartão</button>' +
    '<button class="pagto-btn" data-pag="Pix" type="button">Pix</button>' +
    "</div></div>" +
    '<div class="cupom-box" id="cupom-box" title="Clique para copiar">' +
    '<textarea id="cupom-texto" readonly spellcheck="false">' + escapeAttr(montarTextoPedido()) + "</textarea>" +
    "</div>" +
    '<p class="cupom-dica">Toque no cupom para copiar.</p>' +
    '<button class="btn btn-primario" id="cupom-copiar">Copiar cupom</button>' +
    '<button class="btn" id="voltar-carrinho">← Voltar ao pedido</button>';
  if (titulo) titulo.textContent = "Seu cupom de pedido";
}

function voltarAoCarrinho() {
  cupomCorrente = null;
  pagamentoCorrente = "";
  var itens = document.getElementById("carrinho-itens");
  var rodape = document.getElementById("carrinho-rodape");
  var cupom = document.getElementById("carrinho-cupom");
  var titulo = document.querySelector("#carrinho-drawer .cab h3");
  if (cupom) cupom.hidden = true;
  if (itens) itens.style.display = "";
  if (rodape) rodape.style.display = "";
  if (titulo) titulo.textContent = "Seu pedido";
  renderizarCarrinho();
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
    '<div class="carrinho-rodape" id="carrinho-rodape"></div>' +
    '<div class="carrinho-cupom" id="carrinho-cupom" hidden></div>';
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
      var cliente = campoEntrega();
      if (!cliente.nome) {
        var nomeEl = document.getElementById("cliente-nome");
        if (nomeEl) nomeEl.focus();
        mostrarToast("<b>Falta seu nome</b><br>Preencha para finalizar o pedido.");
        return;
      }
      mostrarCupom();
      return;
    }
    if (el.dataset && el.dataset.pag) {
      escolherPagamento(el.dataset.pag);
      return;
    }
    if (el.id === "cupom-copiar" || el.id === "cupom-box") {
      copiarCupom();
      return;
    }
    if (el.id === "voltar-carrinho") {
      voltarAoCarrinho();
      return;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharCarrinho();
  });

  atualizarBadge();
  renderizarCarrinho();
}