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
var entregaCorrente = "Entrega";
var textoCupomCorrente = "";
var pedidoRegistrado = false;
var finalizando = false;
var nomeSalvo = "";

function carregarNomeCliente() {
  try {
    nomeSalvo = localStorage.getItem("sv_cliente_nome") || "";
  } catch (e) {
    nomeSalvo = "";
  }
}

function cupomJaExiste(codigo) {
  try {
    var vendas = JSON.parse(localStorage.getItem("sv_vendas")) || [];
    return Array.isArray(vendas) && vendas.some(function (v) {
      return v && v.ncupom === codigo;
    });
  } catch (e) {
    return false;
  }
}

function codigoPedido() {
  var d = new Date();
  var base = "SV" + String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + "-";
  var alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (var tentativa = 0; tentativa < 20; tentativa++) {
    var sufixo = "";
    for (var i = 0; i < 4; i++) {
      sufixo += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
    }
    var codigo = base + sufixo;
    if (!cupomJaExiste(codigo)) return codigo;
  }
  return base + Date.now().toString(36).toUpperCase().slice(-5);
}

function montarTextoPedido() {
  if (!cupomCorrente) cupomCorrente = codigoPedido();
  if (pedidoRegistrado && textoCupomCorrente) return textoCupomCorrente;
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
    "\n" + campos.linha +
    (pagamentoCorrente ? "\nPagamento: " + pagamentoCorrente : "");
  return texto;
}

function campoEntrega() {
  var nomeEl = document.getElementById("cliente-nome");
  var endEl = document.getElementById("cliente-endereco");
  var nome = nomeEl ? nomeEl.value.trim() : nomeSalvo;
  var endereco = endEl ? endEl.value.trim() : "";
  entregaCorrente = "Entrega";
  return {
    nome: nome,
    tipo: "Entrega",
    endereco: endereco,
    detalhe: endereco,
    linha: "Entrega: " + endereco
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

function botaoPagamento(pg) {
  return (
    '<button class="pagto-btn' +
    (pagamentoCorrente === pg ? " sel" : "") +
    '" data-pag="' +
    pg +
    '" type="button">' +
    pg +
    "</button>"
  );
}

function botaoEntrega(tipo) {
  return (
    '<button class="pagto-btn' +
    (entregaCorrente === tipo ? " sel" : "") +
    '" data-entrega="' +
    tipo +
    '" type="button">' +
    (tipo === "Retirada" ? "Retirada" : "Entrega") +
    "</button>"
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
    '<div class="campo"><label>Entrega</label>' +
    '<p style="font-size:13px;color:var(--muted, #888);margin:0 0 8px;">Entrega a combinar (taxa conforme região).</p></div>' +
    '<div class="campo" id="campo-endereco">' +
    '<label for="cliente-endereco">Endereço de entrega</label>' +
    '<input type="text" id="cliente-endereco" placeholder="Rua, número, bairro" maxlength="120" value="' +
    escapeAttr(cliente.endereco) +
    '"></div>' +
    '<div class="campo"><label>Pagamento</label>' +
    '<div class="pagto-opcoes" id="pagamento-opcoes">' +
    botaoPagamento("Dinheiro") +
    botaoPagamento("Cartão") +
    botaoPagamento("Pix") +
    "</div></div>" +
    '<div class="total-linha"><span>Total</span><strong>' +
    formatarPreco(totalPreco()) +
    "</strong></div>" +
    '<button class="btn btn-primario" id="carrinho-chekout">Finalizar pedido</button>';
}

function finalizarPedido() {
  if (finalizando || !carrinho.length) return;
  var campos = campoEntrega();
  if (!campos.nome) {
    var nomeEl = document.getElementById("cliente-nome");
    if (nomeEl) nomeEl.focus();
    mostrarToast("<b>Falta seu nome</b><br>Preencha para finalizar o pedido.");
    return;
  }
  if (!pagamentoCorrente) {
    mostrarToast("<b>Escolha o pagamento</b><br>Dinheiro, cartão ou Pix.");
    return;
  }
  if (entregaCorrente === "Entrega" && !campos.endereco) {
    var endEl = document.getElementById("cliente-endereco");
    if (endEl) endEl.focus();
    mostrarToast("<b>Falta o endereço</b><br>Rua, número e bairro para a entrega.");
    return;
  }
  if (!cupomCorrente) cupomCorrente = codigoPedido();

  nomeSalvo = campos.nome;
  try { localStorage.setItem("sv_cliente_nome", nomeSalvo); } catch (e) {}

  finalizando = true;
  if (!registrarVendaAuto()) {
    finalizando = false;
    mostrarToast("<b>Não deu para registrar</b><br>Tente novamente em instantes.");
    return;
  }
  textoCupomCorrente = montarTextoPedido();
  pedidoRegistrado = true;
  carrinho = [];
  salvarCarrinho();
  mostrarCupom();
  finalizando = false;
  mostrarToast("<b>Pedido registrado ✓</b><br>Copie o cupom e envie para a loja.");
}

function copiarCupom() {
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
    mostrarToast("<b>Cupom copiado ✓</b><br>Cole na conversa da loja para confirmar.");
  }
}
function registrarVendaAuto() {
  if (!cupomCorrente || !carrinho.length || !pagamentoCorrente) return false;
  var agora = new Date();
  var campos = campoEntrega();
  if (!campos.nome) return false;
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
    entrega: campos.detalhe,
    endereco: campos.endereco
  };
  var vendas = [];
  try {
    vendas = JSON.parse(localStorage.getItem("sv_vendas")) || [];
  } catch (e) {
    vendas = [];
  }
  if (!Array.isArray(vendas)) vendas = [];
  if (vendas.some(function (x) { return x.ncupom && x.ncupom === v.ncupom; })) return true;
  vendas.push(v);
  try {
    localStorage.setItem("sv_vendas", JSON.stringify(vendas));
  } catch (e) {}
  enviarVendaServidor(v);
  return true;
}

function limparCarrinho() {
  cupomCorrente = null;
  pagamentoCorrente = "";
  textoCupomCorrente = "";
  pedidoRegistrado = false;
  carrinho = [];
  salvarCarrinho();
}

function escolherPagamento(pg) {
  pagamentoCorrente = pg;
  document.querySelectorAll(".pagto-btn[data-pag]").forEach(function (b) {
    b.classList.toggle("sel", b.dataset.pag === pg);
  });
  atualizarTextoCupom();
}

function escolherEntrega(tipo) {
  var nomeEl = document.getElementById("cliente-nome");
  if (nomeEl) nomeSalvo = nomeEl.value.trim();
  entregaCorrente = "Entrega";
  renderizarCarrinho();
  var endEl = document.getElementById("cliente-endereco");
  if (endEl) endEl.focus();
}

function atualizarTextoCupom() {
  var ta = document.getElementById("cupom-texto");
  if (ta && !pedidoRegistrado) ta.value = montarTextoPedido();
}

function avisoHorarioHTML() {
  if (typeof lojaAbertaAgora !== "function" || lojaAbertaAgora()) return "";
  return (
    '<p class="cupom-horario">A loja está fechada agora. Seu pedido será respondido a partir das ' +
    proximaAberturaLoja() +
    ".</p>"
  );
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
    '<div class="cupom-box" id="cupom-box" title="Clique para copiar">' +
    '<textarea id="cupom-texto" readonly spellcheck="false">' + escapeAttr(montarTextoPedido()) + "</textarea>" +
    "</div>" +
    '<p class="cupom-dica">Toque no cupom para copiar.</p>' +
    avisoHorarioHTML() +
    '<button class="btn btn-primario" id="cupom-copiar">Copiar cupom</button>' +
    '<button class="btn" id="fechar-cupom">Fechar</button>';
  if (titulo) titulo.textContent = "Seu cupom de pedido";
}

function resetarCupom() {
  var itens = document.getElementById("carrinho-itens");
  var rodape = document.getElementById("carrinho-rodape");
  var cupom = document.getElementById("carrinho-cupom");
  var titulo = document.querySelector("#carrinho-drawer .cab h3");
  if (cupom) cupom.hidden = true;
  if (itens) itens.style.display = "";
  if (rodape) rodape.style.display = "";
  if (titulo) titulo.textContent = "Seu pedido";
}

function fecharCupom() {
  limparCarrinho();
  resetarCupom();
  renderizarCarrinho();
  fecharCarrinho();
}

function initCarrinho() {
  carregarCarrinho();
  carregarNomeCliente();

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
      finalizarPedido();
      return;
    }
    if (el.dataset && el.dataset.pag) {
      escolherPagamento(el.dataset.pag);
      return;
    }
    if (el.dataset && el.dataset.entrega) {
      escolherEntrega(el.dataset.entrega);
      return;
    }
    if (el.id === "cupom-copiar" || el.id === "cupom-box") {
      copiarCupom();
      return;
    }
    if (el.id === "fechar-cupom") {
      fecharCupom();
      return;
    }
  });

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || !el.id) return;
    if (el.id === "cliente-nome") {
      nomeSalvo = el.value.trim();
      try { localStorage.setItem("sv_cliente_nome", el.value); } catch (err) {}
    }
    if (el.id === "cliente-endereco") {
      atualizarTextoCupom();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharCarrinho();
  });

  atualizarBadge();
  renderizarCarrinho();
}