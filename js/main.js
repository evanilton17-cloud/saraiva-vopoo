(function aplicarPainel() {
  try {
    var guardado = JSON.parse(localStorage.getItem("sv_painel") || "null");
    if (!guardado || typeof guardado !== "object") return;
    if (!Array.isArray(guardado.marcas) || !Array.isArray(guardado.produtos)) return;
    for (var i = 0; i < guardado.produtos.length; i++) {
      var p = guardado.produtos[i];
      if (!p || !p.id || !p.slug || !Array.isArray(p.sabores)) return;
      if (typeof p.cor1 !== "string") p.cor1 = "#22d3ee";
      if (typeof p.cor2 !== "string") p.cor2 = "#0e7490";
    }
    BANCO_DADOS = guardado;
  } catch (e) {}
})();

function waLink(mensagem) {
  var base = "https://wa.me/" + BANCO_DADOS.whatsapp + "?text=";
  return base + encodeURIComponent(mensagem || BANCO_DADOS.whatsappTexto);
}

function formatarPreco(v) {
  var n = Math.round(v * 100) / 100;
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function iniciais(nome) {
  if (!nome) return "";
  var partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 3).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function gradiente(cor1, cor2) {
  return "linear-gradient(135deg, " + cor1 + ", " + cor2 + ")";
}

function marcaPorSlug(slug) {
  return BANCO_DADOS.marcas.filter(function (m) {
    return m.slug === slug;
  })[0];
}

function produtoPorSlug(slug) {
  return BANCO_DADOS.produtos.filter(function (p) {
    return p.slug === slug;
  })[0];
}

function produtosDaMarca(slugMarca) {
  return BANCO_DADOS.produtos.filter(function (p) {
    return p.marca === slugMarca;
  });
}

function precoAtual(prod) {
  return prod.precoPromo || prod.preco;
}

function desconto(prod) {
  if (!prod.precoPromo) return 0;
  return Math.round((1 - prod.precoPromo / prod.preco) * 100);
}

function produtoTemEstoque(prod) {
  if (!prod.estoque) return false;
  return prod.sabores.some(function (s) {
    return s.estoque;
  });
}

function totalSaboresMarca(slugMarca) {
  var t = 0;
  produtosDaMarca(slugMarca).forEach(function (p) {
    t += p.sabores.length;
  });
  return t;
}

function precoMinMarca(slugMarca) {
  var min = Infinity;
  produtosDaMarca(slugMarca).forEach(function (p) {
    if (precoAtual(p) < min) min = precoAtual(p);
  });
  return min === Infinity ? 0 : min;
}

function capaFoto(item, badges, inciais) {
  if (item.imagem) {
    return (
      '<img src="' +
      item.imagem +
      '" alt="' +
      item.nome +
      '">' +
      '<span class="badges">' +
      badges +
      "</span>"
    );
  }
  return (
    '<span class="badges">' +
    badges +
    "</span>" +
    iniciais(inciais || item.nome)
  );
}

function marcaCardHTML(marca) {
  var modelos = produtosDaMarca(marca.slug).length;
  var sabores = totalSaboresMarca(marca.slug);
  var temNovo = produtosDaMarca(marca.slug).some(function (p) {
    return p.novidade;
  });
  var estilo = marca.imagem
    ? ""
    : ' style="--glow-cor:' + gradiente(marca.cor1, marca.cor2) + '"';
  var bg = marca.imagem
    ? '<img class="marca-bg" src="' + marca.imagem + '" alt="' + marca.nome + '" loading="lazy">'
    : "";
  return (
    '<a class="marca-card glass"' +
    estilo +
    ' href="catalogo.html?marca=' +
    encodeURIComponent(marca.slug) +
    '">' +
    bg +
    '<span class="marca-glow"></span>' +
    (temNovo ? '<span class="badge-novo">NOVO</span>' : "") +
    '<div class="marca-corpo">' +
    "<h3>" +
    marca.nome +
    "</h3>" +
    '<span class="marca-sub">' +
    marca.categoria +
    " · " +
    modelos +
    " modelo" +
    (modelos === 1 ? "" : "s") +
    " · " +
    sabores +
    " sabor" +
    (sabores === 1 ? "" : "es") +
    "</span>" +
    '<div class="marca-rodape">' +
    '<div class="marca-de">A partir de<span class="marca-preco">' +
    formatarPreco(precoMinMarca(marca.slug)) +
    "</span></div>" +
    '<span class="marca-ver">Ver modelos <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>' +
    "</div>" +
    "</div>" +
    "</a>"
  );
}

function produtoCardHTML(prod) {
  var marca = marcaPorSlug(prod.marca);
  var temEstoque = produtoTemEstoque(prod);
  var qa = temEstoque
    ? '<button class="quick-add" title="Adicionar ao pedido" data-add="' +
      prod.id +
      '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>'
    : "";
  var img = prod.imagem ||
    (marca && marca.imagem) ||
    "";
  var bg = img ? '<img class="produto-bg" src="' + img + '" alt="" loading="lazy">' : "";
  var precoLinha =
    prod.precoPromo
      ? '<span class="de" style="text-decoration:line-through;color:var(--texto-3);font-size:13px;margin-right:10px;">' +
        formatarPreco(prod.preco) +
        "</span>"
      : "";
  var puffs = prod.puffs
    ? '<span class="puffs-linha pill badge-borda">' + prod.puffs.toLocaleString("pt-BR") + " puffs</span>"
    : "";
  var sabores = prod.sabores
    .map(function (s) {
      return (
        '<span' +
        (s.estoque ? "" : ' style="opacity:0.4"') +
        ">" +
        s.nome +
        "</span>"
      );
    })
    .join("");

  return (
    '<article class="produto-card">' +
    (qa || "") +
    '<a class="produto-link" href="produto.html?produto=' +
    encodeURIComponent(prod.slug) +
    '" style="display:block;">' +
    bg +
    '<span class="produto-glow"></span>' +
    '<div class="produto-info">' +
    "<h2>" +
    prod.nome +
    "</h2>" +
    '<p class="preco-primary">' +
    precoLinha +
    formatarPreco(precoAtual(prod)) +
    "</p>" +
    (puffs ? puffs : "") +
    '<p class="sabores-titulo">Sabores</p>' +
    '<div class="sabores-chips">' +
    sabores +
    "</div>" +
    "</div>" +
    "</a>" +
    "</article>"
  );
}

function renderizarCards(container, lista, funcaoCard) {
  if (!lista.length) {
    container.innerHTML =
      '<div class="vazio"><b>Nada encontrado</b>Tente mudar a busca ou limpar os filtros.</div>';
    return;
  }
  container.innerHTML = lista
    .map(function (item) {
      return funcaoCard(item);
    })
    .join("");
}

function lerQuery(nome) {
  var url = new URL(window.location.href);
  return url.searchParams.get(nome) || "";
}

/* ---------- Header / Footer ---------- */
function NAV_HTML(pagina) {
  var itens = [
    { href: "index.html", rotulo: "Marcas", key: "marcas" },
    { href: "catalogo.html", rotulo: "Todos os pods", key: "pods" },
    { href: "contato.html", rotulo: "Contato", key: "contato" }
  ];
  return itens
    .map(function (i) {
      var ativo = i.key === pagina ? " ativo" : "";
      return '<a href="' + i.href + '" class="' + ativo.trim() + '">' + i.rotulo + "</a>";
    })
    .join("");
}

function CABECALHO_HTML(pagina) {
  return (
    '<header class="cabecalho"><div class="container cabecalho-topo">' +
    '<a class="logo" href="index.html"><b>' +
    (BANCO_DADOS.nomeMarca || "SARAIVA VAPOR") +
    "</b><span>" +
    (BANCO_DADOS.tagline || "Pods Premium") +
    "</span></a>" +
    '<nav class="nav" id="nav">' +
    NAV_HTML(pagina) +
    "</nav>" +
    '<div class="acoes">' +
    '<div class="busca"><input id="busca-global" type="search" placeholder="Buscar por marca, categoria ou sabor..." aria-label="Buscar"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div>' +
    '<button class="icone-btn" id="abrir-carrinho" aria-label="Carrinho"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span class="badge-carrinho" id="carrinho-badge" hidden>0</span></button>' +
    '<a class="btn-whats-peq" href="' +
    waLink() +
    '" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2Z"/></svg><span class="rotulo">WhatsApp</span></a>' +
    '<button class="menu-btn" id="menu-btn" aria-label="Abrir menu">☰</button>' +
    "</div>" +
    "</div></header>"
  );
}

function RODAPE_HTML() {
  return (
    '<footer class="rodape"><div class="container">' +
    '<div class="rodape-linha">' +
    '<span class="rodape-logo grad-text">' +
    (BANCO_DADOS.nomeMarca || "SARAIVA VAPOR") +
    "</span>" +
    '<p>© <span id="ano"></span> ' +
    (BANCO_DADOS.nomeMarca || "SARAIVA VAPOR") +
    ". Todos os direitos reservados.</p>" +
    '<p class="aviso">Venda proibida para menores de 18 anos.</p>' +
    '<a class="painel-link" href="painel.html">Painel</a>' +
    "</div>" +
    "</div></footer>"
  );
}

function WA_FLUTUANTE_HTML() {
  return (
    '<a class="wa-flutuante" href="' +
    waLink() +
    '" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2Z"/></svg></a>'
  );
}

/* ---------- Camadas de efeito ---------- */
function montarParallax() {
  var cfg = BANCO_DADOS.fundo || {};
  var el = document.createElement("div");
  el.className = "fundo-parallax";
  el.innerHTML =
    '<div class="fundo-foto"></div>' +
    '<div class="fundo-fumaca"></div>' +
    '<div class="fundo-mascara"></div>';
  document.body.insertBefore(el, document.body.firstChild);

  var foto = el.querySelector(".fundo-foto");
  var fumaca = el.querySelector(".fundo-fumaca");
  if (cfg.foto) foto.style.backgroundImage = 'url("' + cfg.foto + '")';
  if (cfg.fumaca) fumaca.style.backgroundImage = 'url("' + cfg.fumaca + '")';

  var agendado = false;
  function atualizar() {
    agendado = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var vel = cfg.velocidadeParallax || 0.06;
    if (foto) foto.style.setProperty("--par", Math.round(-y * vel) + "px");
    if (fumaca) fumaca.style.setProperty("--par2", Math.round(-y * vel * 0.5) + "px");
  }
  window.addEventListener("scroll", function () {
    if (!agendado) {
      agendado = true;
      requestAnimationFrame(atualizar);
    }
  });
  atualizar();
}

function efeitoSpotlight() {
  if (!BANCO_DADOS.efeitos || BANCO_DADOS.efeitos.spotlight === false) return;
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;

  var alvoX = window.innerWidth / 2;
  var alvoY = 160;
  var x = alvoX;
  var y = alvoY;
  var rodando = false;
  var el = document.createElement("div");
  el.className = "spotlight";
  document.body.appendChild(el);

  function pintar() {
    el.style.background =
      "radial-gradient(640px circle at " +
      Math.round(x) +
      "px " +
      Math.round(y) +
      "px, rgba(255,255,255,0.05), transparent 65%)";
  }

  function loop() {
    x += (alvoX - x) * 0.12;
    y += (alvoY - y) * 0.12;
    pintar();
    if (Math.abs(x - alvoX) < 0.6 && Math.abs(y - alvoY) < 0.6) {
      rodando = false;
    } else {
      requestAnimationFrame(loop);
    }
  }

  window.addEventListener("pointermove", function (e) {
    alvoX = e.clientX;
    alvoY = e.clientY;
    if (!rodando) {
      rodando = true;
      requestAnimationFrame(loop);
    }
  });
  pintar();
}

function montarCanvasFumaca() {
  if (!BANCO_DADOS.efeitos || BANCO_DADOS.efeitos.fumaca === false) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.className = "fundo-canvas";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var atual = 0;
  var dps = Math.min(window.devicePixelRatio || 1, 2);

  function redimensionar() {
    canvas.width = window.innerWidth * dps;
    canvas.height = window.innerHeight * dps;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dps, 0, 0, dps, 0, 0);
  }
  redimensionar();
  window.addEventListener("resize", redimensionar);

  var nuvens = [];
  var total = 46;
  for (var i = 0; i < total; i++) {
    nuvens.push(criarNuvem(true));
  }

  function criarNuvem(primeira) {
    var r = 70 + Math.random() * 170;
    var largura = window.innerWidth + r * 2;
    var altura = window.innerHeight + r * 2;
    return {
      x: Math.random() * largura - r,
      y: primeira ? Math.random() * altura - r : altura - Math.random() * 200,
      r: r,
      alpha: 0.016 + Math.random() * 0.03,
      vy: -0.06 - Math.random() * 0.08,
      vx: (Math.random() - 0.5) * 0.05,
      fase: Math.random() * Math.PI * 2
    };
  }

  var visivel = true;
  document.addEventListener("visibilitychange", function () {
    visivel = document.visibilityState === "visible";
  });

  function desenharNuvem(n) {
    var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    grad.addColorStop(0, "rgba(214,226,244," + n.alpha + ")");
    grad.addColorStop(1, "rgba(214,226,244,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function quadro() {
    if (!visivel) {
      requestAnimationFrame(quadro);
      return;
    }
    atual++;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    nuvens.forEach(function (n) {
      n.y += n.vy;
      n.x += n.vx + Math.sin(atual * 0.004 + n.fase) * 0.06;
      if (n.y + n.r < 0) {
        var r = criarNuvem();
        nuvens[nuvens.indexOf(n)] = r;
        return;
      }
      desenharNuvem(n);
    });
    requestAnimationFrame(quadro);
  }

  requestAnimationFrame(quadro);
}

function efeitoCursorFumo() {
  if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ultimo = 0;
  window.addEventListener("pointermove", function (e) {
    var agora = Date.now();
    if (agora - ultimo < 45) return;
    ultimo = agora;
    var t = document.createElement("span");
    t.className = "part-fumo";
    var tam = 8 + Math.random() * 12;
    t.style.width = tam + "px";
    t.style.height = tam + "px";
    t.style.left = e.clientX + "px";
    t.style.top = e.clientY + "px";
    document.body.appendChild(t);
    t.addEventListener("animationend", function () {
      t.remove();
    });
  });
}

function mostrarToast(html) {
  var t = document.getElementById("toast-global");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast-global";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.innerHTML = html;
  t.classList.add("mostrar");
  clearTimeout(t._timer);
  t._timer = setTimeout(function () {
    t.classList.remove("mostrar");
  }, 2400);
}

/* ---------- Montagem da página ---------- */
function montarPagina(pagina) {
  montarParallax();
  efeitoSpotlight();
  montarCanvasFumaca();
  efeitoCursorFumo();

  document.getElementById("cabecalho").innerHTML = CABECALHO_HTML(pagina);
  document.getElementById("rodape").innerHTML = RODAPE_HTML();
  var wa = document.getElementById("wa-flutuante");
  if (wa) wa.innerHTML = WA_FLUTUANTE_HTML();
  document.getElementById("ano").textContent = new Date().getFullYear();

  var principal = document.querySelector("main");
  if (principal) principal.classList.add("fade-in");

  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      nav.classList.toggle("aberta");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") nav.classList.remove("aberta");
    });
  }

  var busca = document.getElementById("busca-global");
  if (busca) {
    busca.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        window.location.href = "catalogo.html?q=" + encodeURIComponent(busca.value.trim());
      }
    });
  }

  if (typeof initCarrinho === "function") initCarrinho();
}