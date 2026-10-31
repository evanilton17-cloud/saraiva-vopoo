/* ============================================================
   PAINEL ADMIN — ESTILO BASE44 · SARAIVA
   Navegação, dashboard, CRUD de produtos/marcas, config, backup
   ============================================================ */

var CHAVE_PAINEL = "sv_painel";
var CHAVE_SENHA = "sv_admin_senha";
var CHAVE_LOGIN = "sv_admin_ok";
var CHAVE_TEMPO = "sv_painel_em";
var SENHA_PADRAO = "admin";

var estado = JSON.parse(JSON.stringify(BANCO_DADOS));
var modoEdicaoProduto = null;
var buscas = { produtos: "", marca: "", ordem: "nome" };

/* ---------- Helpers ---------- */
function slugificar(t) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uid() {
  return "p-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

function escAttr(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escHtml(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function get(id) {
  return document.getElementById(id);
}

function paiMarcaPorSlug(slug) {
  return estado.marcas.filter(function (m) {
    return m.slug === slug;
  })[0] || null;
}

function produtosDaMarca(slug) {
  return estado.produtos.filter(function (p) {
    return p.marca === slug;
  });
}

function precoDe(prod) {
  return prod.precoPromo || prod.preco;
}

function temEstoque(prod) {
  if (!prod.estoque) return false;
  return (prod.sabores || []).some(function (s) {
    return s.estoque;
  });
}

/* ---------- Status / Save automático ---------- */
function atualizarStatus() {
  var el = get("top-status");
  if (!el) return;
  var em = localStorage.getItem(CHAVE_TEMPO);
  el.textContent = em
    ? "Salvo às " + new Date(em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Salvo";
  el.className = "a-pill ok";
}

function marcarSujo() {
  salvarPainel();
}

function toast(msg, tipo) {
  var root = get("toast-root");
  if (!root) return;
  var t = document.createElement("div");
  t.className = "a-toast " + (tipo || "");
  t.innerHTML = '<span class="t-ico"></span><div>' + escHtml(msg) + "</div>";
  root.appendChild(t);
  setTimeout(function () {
    t.classList.add("out");
    setTimeout(function () {
      t.remove();
    }, 350);
  }, 2900);
}

/* ---------- Persistência (automática) ---------- */
function salvarPainel() {
  estado.atualizadoEm = Date.now();
  localStorage.setItem(CHAVE_PAINEL, JSON.stringify(estado));
  localStorage.setItem(CHAVE_TEMPO, new Date().toISOString());
  atualizarStatus();
  agendarPushCatalogo();
}

function baixarArquivo(nome, conteudo) {
  var blob = new Blob([conteudo], { type: "application/octet-stream" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}

function gerarDadosJS() {
  return "var BANCO_DADOS = " + JSON.stringify(estado, null, 2) + ";";
}

/* ---------- Modal ---------- */
function abrirModal(html, wide) {
  fecharModal();
  var mod = document.createElement("div");
  mod.className = "a-modal" + (wide ? " wide" : "");
  mod.innerHTML = html;
  get("mod-root").appendChild(mod);
  get("mod-root").classList.add("open");
}

function fecharModal() {
  var root = get("mod-root");
  if (!root) return;
  root.classList.remove("open");
  root.innerHTML = "";
}

/* ---------- Navegação ---------- */
var TITULOS = {
  dashboard: ["Visão geral", "Resumo da sua loja virtual"],
  vendas: ["Vendas", "Faturamento, pedidos e gráficos"],
  produtos: ["Produtos", "Catálogo, preços e sabores"],
  marcas: ["Marcas", "Cadastro e organização das marcas"],
  config: ["Configurações", "Identidade, contato e efeitos"],
  backup: ["Publicar", "Salve no navegador ou publique no site"]
};

function navegar(view) {
  if (!TITULOS[view]) return;
  document.querySelectorAll(".a-nav-item").forEach(function (n) {
    n.classList.toggle("ativo", n.dataset.view === view);
  });
  document.querySelectorAll(".a-view").forEach(function (v) {
    v.classList.toggle("esta", v.id === "view-" + view);
  });
  get("top-titulo").textContent = TITULOS[view][0];
  get("top-sub").textContent = TITULOS[view][1];
  if (view === "produtos") {
    get("busca-produto").value = buscas.produtos;
    get("filtro-marca").value = buscas.marca;
    get("ordem-produtos").value = buscas.ordem;
    renderProdutos();
  }
  if (view === "marcas") renderMarcas();
  if (view === "vendas") renderVendas();
  if (view === "backup") renderBackup();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  var produtos = estado.produtos;
  var marcas = estado.marcas;
  var sabores = produtos.reduce(function (t, p) {
    return t + (p.sabores || []).length;
  }, 0);
  var emEstoque = produtos.filter(temEstoque);
  var esgotados = produtos.filter(function (p) {
    return !temEstoque(p);
  });
  var novidades = produtos.filter(function (p) {
    return p.novidade;
  });
  var promos = produtos.filter(function (p) {
    return p.precoPromo;
  });

  get("m-produtos").textContent = produtos.length;
  get("m-marcas").textContent = marcas.length;
  get("m-sabores").textContent = sabores;
  get("m-estoque").textContent = emEstoque.length;
  get("m-novo").textContent = novidades.length;
  get("m-promo").textContent = promos.length;
  get("tag-produtos").textContent = produtos.length ? "ativos" : "vazio";
  get("tag-marcas").textContent = marcas.length ? "catálogo" : "vazio";
  get("marcas-resumo") && (get("marcas-resumo").textContent =
    marcas.length + " marcas cadastradas");

  if (esgotados.length) {
    get("tag-estoque").textContent = "faltam " + esgotados.length;
    get("tag-estoque").className = "m-tag tag-red";
  } else {
    get("tag-estoque").textContent = "disponível";
    get("tag-estoque").className = "m-tag tag-orange";
  }

  renderListaEsgotados(esgotados);
  renderListaPromos(promos);
}

function itemLinha(p) {
  var m = paiMarcaPorSlug(p.marca);
  var estilo = p.imagem
    ? "background-image:url('" + escAttr(p.imagem) + "')"
    : "background:" + gradiente(p.cor1 || "#333", p.cor2 || "#111");
  return (
    '<div class="a-row-item" data-ir-produto="' + escAttr(p.nome) + '">' +
    '<span class="a-thumb" style="' + estilo + '"></span>' +
    '<div class="ri-main">' +
    '<div class="ri-title">' + escHtml(p.nome) + "</div>" +
    '<div class="ri-sub"><span>' + escHtml(m ? m.nome : p.marca) + "</span><span>" + formatarPreco(precoDe(p)) + "</span><span>" + p.sabores.length + " sabor" + (p.sabores.length === 1 ? "" : "es") + "</span></div>" +
    "</div>" +
    '<button class="a-btn sm ghost" type="button">Abrir</button>' +
    "</div>"
  );
}

function listaVazia(msg) {
  return '<div class="a-empty"><div class="e-ico">—</div><div class="e-t">' + msg + "</div></div>";
}

function renderListaEsgotados(lista) {
  var el = get("lista-esgotados");
  el.innerHTML = lista.length
    ? lista.slice(0, 6).map(itemLinha).join("")
    : listaVazia("Tudo em estoque. Nenhum produto esgotado.");
}

function renderListaPromos(lista) {
  var el = get("lista-promos");
  el.innerHTML = lista.length
    ? lista.slice(0, 6).map(itemLinha).join("")
    : listaVazia("Nenhuma promoção ativa no momento.");
}

/* ---------- Produtos ---------- */
function marcaOpcoes(selecionada) {
  if (!estado.marcas.length) return '<option value="">Nenhuma marca criada</option>';
  return estado.marcas
    .map(function (m) {
      return (
        '<option value="' + escAttr(m.slug) + '"' +
        (m.slug === selecionada ? " selected" : "") +
        ">" + escHtml(m.nome) + " (" + escHtml(m.categoria) + ")</option>"
      );
    })
    .join("");
}

function renderProdutos() {
  var corpo = get("corpo-produtos");
  var f = (buscas.produtos || "").toLowerCase();
  var lista = estado.produtos.filter(function (p) {
    if (buscas.marca && p.marca !== buscas.marca) return false;
    if (!f) return true;
    var m = paiMarcaPorSlug(p.marca);
    var hay = (p.nome + " " + (m ? m.nome : "") + " " + (p.sabores || []).map(function (s) { return s.nome; }).join(" ")).toLowerCase();
    return hay.indexOf(f) > -1;
  });

  lista.sort(function (a, b) {
    if (buscas.ordem === "precoAsc") return precoDe(a) - precoDe(b);
    if (buscas.ordem === "precoDesc") return precoDe(b) - precoDe(a);
    if (buscas.ordem === "sabores") return (b.sabores || []).length - (a.sabores || []).length;
    return (a.marca + a.nome).localeCompare(b.marca + b.nome);
  });

  get("nav-cnt-produtos").textContent = estado.produtos.length;

  if (!lista.length) {
    corpo.innerHTML =
      '<tr><td colspan="7"><div class="a-empty"><div class="e-ico">∅</div><div class="e-t">Nada encontrado</div><div style="font-size:12.5px;margin-top:4px;">Tente mudar a busca ou os filtros.</div></div></td></tr>';
    return;
  }

  corpo.innerHTML = lista
    .map(function (p) {
      var m = paiMarcaPorSlug(p.marca);
      var estilo = p.imagem
        ? "background-image:url('" + escAttr(p.imagem) + "')"
        : "background:" + gradiente(p.cor1 || "#333", p.cor2 || "#111");
      return (
        "<tr>" +
        '<td><span class="a-thumb" style="' + estilo + '"></span></td>' +
        "<td><span class='forte'>" + escHtml(p.nome) + "</span>" +
        (p.novidade ? ' <span class="a-pill novo">NOVO</span>' : "") +
        (p.precoPromo ? ' <span class="a-pill promo">PROMO</span>' : "") +
        (p.puffs ? '<div class="sub">' + p.puffs.toLocaleString("pt-BR") + " puffs</div>" : "") +
        "</td>" +
        "<td>" + escHtml(m ? m.nome : p.marca) +
        (m ? '<div class="sub">' + escHtml(m.categoria) + "</div>" : "") +
        "</td>" +
        "<td>" +
        (p.precoPromo
          ? '<span style="color:var(--a-muted-2);text-decoration:line-through;font-size:12px;margin-right:6px;">' + formatarPreco(p.preco) + "</span>"
          : "") +
        "<span class='forte'>" + formatarPreco(precoDe(p)) + "</span></td>" +
        "<td>" + p.sabores.length + "</td>" +
        "<td>" + (temEstoque(p) ? '<span class="a-pill ok">Em estoque</span>' : '<span class="a-pill bad">Esgotado</span>') + "</td>" +
        "<td><div style='display:flex;gap:6px;flex-wrap:wrap;'>" +
        '<button class="a-btn sm ghost" data-editar="' + escAttr(p.id) + '" type="button">Editar</button>' +
        '<button class="a-btn sm ghost" data-duplicar="' + escAttr(p.id) + '" type="button">Duplicar</button>' +
        '<button class="a-btn sm danger" data-excluir="' + escAttr(p.id) + '" type="button">Excluir</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");
}

/* ---------- Editor de sabores ---------- */
function comporSabores() {
  var out = [];
  get("mod-root").querySelectorAll("[data-linha-sabor]").forEach(function (linha) {
    out.push({
      nome: linha.querySelector('input[type="text"]').value.trim(),
      estoque: linha.querySelector('input[type="checkbox"]').checked
    });
  });
  return out.filter(function (s) {
    return s.nome;
  });
}

function renderSaboresEditor(sabores) {
  var el = get("editor-sabores");
  el.innerHTML = sabores
    .map(function (s) {
      return (
        '<div class="a-row-sabor" data-linha-sabor>' +
        '<input class="a-input" type="text" value="' + escAttr(s.nome || "") + '" placeholder="Ex: Menta">' +
        '<label class="a-check-line"><input type="checkbox"' + (s.estoque ? " checked" : "") + "> Estoque</label>" +
        '<button class="a-btn sm danger" data-rem-sabor type="button">✕</button>' +
        "</div>"
      );
    })
    .join("");
  el.insertAdjacentHTML(
    "beforeend",
    '<button class="a-btn sm ghost" id="add-sabor" type="button">+ Adicionar sabor</button>'
  );
  get("add-sabor").addEventListener("click", function () {
    var sab = comporSabores();
    sab.push({ nome: "", estoque: true });
    renderSaboresEditor(sab);
  });
  el.querySelectorAll("[data-rem-sabor]").forEach(function (b) {
    b.addEventListener("click", function () {
      var sab = comporSabores();
      sab.splice(Array.prototype.indexOf.call(el.querySelectorAll("[data-rem-sabor]"), b), 1);
      renderSaboresEditor(sab);
    });
  });
}

/* ---------- Foto (câmera / galeria) ---------- */
function campoFotoHtml(pre, valor) {
  var url = valor || "";
  return (
    '<div class="a-field"><label>Foto</label>' +
    '<input class="a-input" id="' + pre + '-img" value="' + escAttr(url) + '" placeholder="Cole um link (https://) ou use os botões abaixo">' +
    '<div class="a-foto-row">' +
    '<button class="a-btn sm" id="' + pre + '-cam" type="button">Tirar foto</button>' +
    '<button class="a-btn sm ghost" id="' + pre + '-gal" type="button">Da galeria</button>' +
    '<button class="a-btn sm danger" id="' + pre + '-rm" type="button"' + (url ? "" : ' style="display:none"') + ">Remover</button>" +
    "</div>" +
    '<div class="a-foto-preview" id="' + pre + '-preview">' + (url ? '<img src="' + escAttr(url) + '" alt="">' : "") + "</div>" +
    "</div>"
  );
}

function ligarCampoFoto(pre) {
  function previewAtualizar() {
    var v = get(pre + "-img").value.trim();
    var el = get(pre + "-preview");
    var rm = get(pre + "-rm");
    if (el) el.innerHTML = v ? '<img src="' + escAttr(v) + '" alt="">' : "";
    if (rm) rm.style.display = v ? "" : "none";
  }
  var campo = get(pre + "-img");
  if (campo) campo.addEventListener("input", previewAtualizar);
  var cam = get(pre + "-cam");
  var gal = get(pre + "-gal");
  function escolher(comCaptura) {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    if (comCaptura) inp.setAttribute("capture", "environment");
    inp.style.display = "none";
    document.body.appendChild(inp);
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0];
      inp.parentNode.removeChild(inp);
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast("Escolha um arquivo de imagem", "err"); return; }
      var leitor = new FileReader();
      leitor.onload = function () {
        var imagem = new Image();
        imagem.onload = function () {
          var MAX = 600;
          var escala = Math.min(1, MAX / Math.max(imagem.width, imagem.height));
          var cv = document.createElement("canvas");
          cv.width = Math.round((imagem.width || 1) * escala);
          cv.height = Math.round((imagem.height || 1) * escala);
          cv.getContext("2d").drawImage(imagem, 0, 0, cv.width, cv.height);
          var data = cv.toDataURL("image/jpeg", 0.8);
          var campoAlvo = get(pre + "-img");
          function aplicarUrl(url) {
            campoAlvo.value = url;
            previewAtualizar();
          }
          fetch(data)
            .then(function (res) { return res.blob(); })
            .then(function (arquivo) {
              return fetch("api/foto", {
                method: "POST",
                headers: { "Content-Type": "image/jpeg", "x-loja-token": LOJA_TOKEN },
                body: arquivo
              });
            })
            .then(function (r) { return r.json(); })
            .then(function (j) {
              if (j && j.ok && j.url) {
                aplicarUrl(j.url);
                toast("Foto enviada para a nuvem. Clique em Salvar.");
              } else {
                aplicarUrl(data);
                toast("Sem internet: foto salva no navegador. Clique em Salvar.");
              }
            })
            .catch(function () {
              aplicarUrl(data);
              toast("Sem internet: foto salva no navegador. Clique em Salvar.");
            });
        };
        imagem.onerror = function () { toast("Não consegui ler essa imagem", "err"); };
        imagem.src = leitor.result;
      };
      leitor.readAsDataURL(f);
    });
    inp.click();
  }
  if (cam) cam.addEventListener("click", function () { escolher(true); });
  if (gal) gal.addEventListener("click", function () { escolher(false); });
  var rm = get(pre + "-rm");
  if (rm) rm.addEventListener("click", function () {
    get(pre + "-img").value = "";
    previewAtualizar();
  });
  previewAtualizar();
}

/* ---------- Formulário de produto ---------- */
function abrirFormProduto(id) {
  modoEdicaoProduto = id || null;
  var p = id
    ? estado.produtos.filter(function (x) { return x.id === id; })[0]
    : null;

  var specs = p ? p.specs.map(function (s) { return s[0] + ": " + s[1]; }).join("\n") : "";

  abrirModal(
    '<div class="a-modal-head"><h3>' + (p ? "Editar produto" : "Novo produto") + "</h3><button class='a-modal-x' id='mod-fechar' type='button'>✕</button></div>" +
    '<div class="a-modal-body">' +
    '<div class="a-field"><label>Nome do produto <span class="req">*</span></label><input class="a-input" id="p-nome" value="' + escAttr(p ? p.nome : "") + '" placeholder="Ex: Ignite V80"></div>' +
    '<div class="a-field"><label>Marca <span class="req">*</span></label><select class="a-select" id="p-marca">' + marcaOpcoes(p ? p.marca : "") + "</select></div>" +
    '<div class="a-form-row">' +
    '<div class="a-field"><label>Preço (R$) <span class="req">*</span></label><input class="a-input" id="p-preco" type="number" step="0.01" min="0" value="' + (p ? p.preco : "") + '"></div>' +
    '<div class="a-field"><label>Preço promocional</label><input class="a-input" id="p-promo" type="number" step="0.01" min="0" value="' + (p && p.precoPromo ? p.precoPromo : "") + '"></div>' +
    "</div>" +
    '<div class="a-form-row">' +
    '<div class="a-field"><label>Puffs</label><input class="a-input" id="p-puffs" type="number" min="0" value="' + (p && p.puffs ? p.puffs : "") + '"></div>' +
    campoFotoHtml("p", p && p.imagem) +
    "</div>" +
    '<div class="a-field"><label>Cores do gradiente (usadas se não houver foto)</label><div class="a-color-row"><input id="p-cor1" type="color" value="' + (p ? p.cor1 : "#22d3ee") + '"><input id="p-cor2" type="color" value="' + (p ? p.cor2 : "#0e7490") + '"></div></div>' +
    '<div class="a-form-row">' +
    '<label class="a-check-line"><input id="p-estoque" type="checkbox"' + (!p || p.estoque ? " checked" : "") + "> Produto em estoque</label>" +
    '<label class="a-check-line"><input id="p-novidade" type="checkbox"' + (p && p.novidade ? " checked" : "") + "> Destaque como NOVO</label>" +
    "</div>" +
    '<div class="a-field"><label>Especificações (uma por linha, formato "Nome: Valor")</label><textarea class="a-textarea" id="p-specs" placeholder="Tipo: Pods descartáveis&#10;Puffs: 10.000">' + escHtml(specs) + "</textarea></div>" +
    '<div class="a-field"><label>Sabores e estoque</label><div id="editor-sabores" style="width:100%"></div></div>' +
    "</div>" +
    '<div class="a-modal-foot"><button class="a-btn ghost" id="cancelar-produto" type="button">Cancelar</button><button class="a-btn" id="salvar-produto" type="button">Salvar produto</button></div>',
    true
  );

  get("mod-fechar").addEventListener("click", fecharModal);
  get("cancelar-produto").addEventListener("click", fecharModal);
  renderSaboresEditor(p ? p.sabores.slice() : [{ nome: "", estoque: true }]);
  ligarCampoFoto("p");

  get("salvar-produto").addEventListener("click", function () {
    var nome = get("p-nome").value.trim();
    var marca = get("p-marca").value;
    var preco = parseFloat(get("p-preco").value);
    var promo = get("p-promo").value;
    var puffs = get("p-puffs").value;
    var img = get("p-img").value.trim();
    var cor1 = get("p-cor1").value;
    var cor2 = get("p-cor2").value;
    var estoque = get("p-estoque").checked;
    var novidade = get("p-novidade").checked;
    var specs = get("p-specs").value.split("\n")
      .map(function (l) {
        var par = l.split(":");
        return par.length === 2 ? [par[0].trim(), par[1].trim()] : null;
      })
      .filter(Boolean);
    var sabores = comporSabores();

    if (!nome) { toast("Informe o nome do produto", "err"); return; }
    if (!marca) { toast("Crie uma marca antes de adicionar o produto", "err"); return; }
    if (isNaN(preco) || preco <= 0) { toast("Informe um preço válido", "err"); return; }
    if (!sabores.length) { toast("Adicione pelo menos um sabor", "err"); return; }

    var dados = {
      nome: nome,
      marca: marca,
      preco: preco,
      precoPromo: promo ? parseFloat(promo) : null,
      puffs: puffs ? Number(puffs) : null,
      imagem: img,
      cor1: cor1,
      cor2: cor2,
      estoque: estoque,
      novidade: novidade,
      specs: specs.length ? specs : [["Venda", "18+"]],
      sabores: sabores
    };

    if (modoEdicaoProduto) {
      estado.produtos.forEach(function (x, i) {
        if (x.id === modoEdicaoProduto) estado.produtos[i] = Object.assign({}, x, dados);
      });
    } else {
      estado.produtos.push(
        Object.assign({ id: uid(), slug: slugificar(nome) + "-" + uid().slice(-4) }, dados)
      );
    }
    marcarSujo();
    salvarPainel();
    renderProdutos();
    renderDashboard();
    fecharModal();
  });
}

/* ---------- Marcas ---------- */
function renderFiltroMarca() {
  var sel = get("filtro-marca");
  if (!sel) return;
  var anterior = sel.value;
  sel.innerHTML =
    '<option value="">Todas as marcas</option>' +
    estado.marcas
      .map(function (m) {
        return '<option value="' + escAttr(m.slug) + '">' + escHtml(m.nome) + "</option>";
      })
      .join("");
  sel.value = estado.marcas.some(function (m) { return m.slug === anterior; }) ? anterior : "";
}

function renderMarcas() {
  var corpo = get("corpo-marcas");
  get("nav-cnt-marcas").textContent = estado.marcas.length;
  renderFiltroMarca();
  if (get("marcas-resumo"))
    get("marcas-resumo").textContent = estado.marcas.length + " marcas cadastradas";

  if (!estado.marcas.length) {
    corpo.innerHTML =
      '<tr><td colspan="6"><div class="a-empty"><div class="e-ico">∅</div><div class="e-t">Nenhuma marca cadastrada</div><div style="font-size:12.5px;margin-top:4px;">Clique em "Nova marca" para começar.</div></div></td></tr>';
    return;
  }
  corpo.innerHTML = estado.marcas
    .map(function (m) {
      var prods = produtosDaMarca(m.slug);
      var sabores = prods.reduce(function (t, p) { return t + p.sabores.length; }, 0);
      var estilo = m.imagem
        ? "background-image:url('" + escAttr(m.imagem) + "')"
        : "background:" + gradiente(m.cor1, m.cor2);
      return (
        "<tr>" +
        '<td><span class="a-thumb" style="' + estilo + '"></span></td>' +
        "<td><span class='forte'>" + escHtml(m.nome) + "</span></td>" +
        "<td>" + escHtml(m.categoria) + "</td>" +
        "<td>" + prods.length + " produto" + (prods.length === 1 ? "" : "s") + "</td>" +
        "<td>" + sabores + " sabor" + (sabores === 1 ? "" : "es") + "</td>" +
        "<td><div style='display:flex;gap:6px;flex-wrap:wrap;'>" +
        '<button class="a-btn sm ghost" data-editar-marca="' + escAttr(m.slug) + '" type="button">Editar</button>' +
        '<button class="a-btn sm danger" data-excluir-marca="' + escAttr(m.slug) + '" type="button">Excluir</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");
}

function abrirFormMarca(slug) {
  var m = slug
    ? estado.marcas.filter(function (x) { return x.slug === slug; })[0]
    : null;
  var cats = ["Pods", "Essências", "Refis", "Acessórios", "Outros"];
  var catOpcoes = cats
    .map(function (c) {
      return (
        '<option value="' + c + '"' + (m && m.categoria === c ? " selected" : "") + ">" + c + "</option>"
      );
    })
    .join("");

  abrirModal(
    '<div class="a-modal-head"><h3>' + (m ? "Editar marca" : "Nova marca") + "</h3><button class='a-modal-x' id='mod-fechar' type='button'>✕</button></div>" +
    '<div class="a-modal-body">' +
    '<div class="a-field"><label>Nome da marca <span class="req">*</span></label><input class="a-input" id="m-nome" value="' + escAttr(m ? m.nome : "") + '" placeholder="Ex: Ignite"></div>' +
    '<div class="a-form-row">' +
    '<div class="a-field"><label>Categoria</label><select class="a-select" id="m-categoria">' + catOpcoes + "</select></div>" +
    campoFotoHtml("m", m && m.imagem) +
    "</div>" +
    '<div class="a-field"><label>Cores do gradiente (usadas se não houver foto)</label><div class="a-color-row"><input id="m-cor1" type="color" value="' + (m ? m.cor1 : "#22d3ee") + '"><input id="m-cor2" type="color" value="' + (m ? m.cor2 : "#0e7490") + '"></div></div>' +
    "</div>" +
    '<div class="a-modal-foot"><button class="a-btn ghost" id="cancelar-marca" type="button">Cancelar</button><button class="a-btn" id="salvar-marca" type="button">Salvar marca</button></div>'
  );

  get("mod-fechar").addEventListener("click", fecharModal);
  get("cancelar-marca").addEventListener("click", fecharModal);
  ligarCampoFoto("m");

  get("salvar-marca").addEventListener("click", function () {
    var nome = get("m-nome").value.trim();
    if (!nome) { toast("Informe o nome da marca", "err"); return; }
    var slug = slugificar(nome);
    var dados = {
      slug: slug,
      nome: nome,
      categoria: get("m-categoria").value,
      cor1: get("m-cor1").value,
      cor2: get("m-cor2").value,
      imagem: get("m-img").value.trim()
    };
    if (m) {
      var antigo = m.slug;
      estado.marcas.forEach(function (x, i) {
        if (x.slug === antigo) estado.marcas[i] = Object.assign({}, x, dados);
      });
      estado.produtos.forEach(function (p) {
        if (p.marca === antigo) p.marca = slug;
      });
    } else {
      if (estado.marcas.some(function (x) { return x.slug === slug; })) {
        toast("Já existe uma marca com esse nome", "err");
        return;
      }
      estado.marcas.push(dados);
    }
    marcarSujo();
    salvarPainel();
    renderMarcas();
    renderProdutos();
    renderDashboard();
    fecharModal();
  });
}

/* ---------- Configurações ---------- */
function renderConfig() {
  var el = get("form-config");
  var ef = estado.efeitos || {};
  el.innerHTML =
    '<div class="a-form-row">' +
    '<div class="a-field"><label>Nome do site</label><input class="a-input" id="c-nome" value="' + escAttr(estado.nomeSite || "") + '"></div>' +
    '<div class="a-field"><label>Nome da marca (logo)</label><input class="a-input" id="c-marca" value="' + escAttr(estado.nomeMarca || "") + '"></div>' +
    "</div>" +
    '<div class="a-field"><label>Senha do painel</label><input class="a-input" id="c-senha" type="password" value="' + escAttr(estado.senha || "") + '" placeholder="Deixe em branco para manter a atual"></div>' +
    '<div class="a-field"><label>Frase de apoio (tagline)</label><input class="a-input" id="c-tagline" value="' + escAttr(estado.tagline || "") + '"></div>' +
    '<div class="a-field"><label>Link de contato (opcional, sem WhatsApp)</label><input class="a-input" id="c-contato" value="' + escAttr(estado.contato || "") + '"></div>' +
    '<div class="a-field"><label>Como os pedidos chegam até você</label>' +
    '<p style="font-size:13px;color:var(--a-muted-2);line-height:1.7;margin:0;">' +
    "Os clientes finalizam o pedido no site, copiam o cupom e enviam para você pela conversa do WhatsApp. " +
    "O número do WhatsApp não fica exposto no site. Depois, registre cada cupom recebido na aba <strong style='color:var(--a-ink)'>Vendas</strong>.</p></div>" +
    '<div class="a-field"><label>Efeitos visuais</label><div class="a-chips">' +
    '<label class="a-check-line"><input id="c-fumaca" type="checkbox"' + (ef.fumaca !== false ? " checked" : "") + "> Fumaça animada de fundo</label>" +
    '<label class="a-check-line"><input id="c-spotlight" type="checkbox"' + (ef.spotlight !== false ? " checked" : "") + "> Spotlight seguindo o mouse</label>" +
    '<label class="a-check-line"><input id="c-parallax" type="checkbox"' + (ef.parallax !== false ? " checked" : "") + "> Cena de fundo com parallax</label>" +
    "</div></div>" +
    '<p style="font-size:12.5px;color:var(--a-muted-2);margin:12px 0 0;">Salvas automaticamente enquanto você digita.</p>';

  ["c-nome", "c-marca", "c-tagline", "c-contato", "c-senha"].forEach(function (id) {
    get(id).addEventListener("input", autosaveConfig);
  });
  ["c-fumaca", "c-spotlight", "c-parallax"].forEach(function (id) {
    get(id).addEventListener("change", autosaveConfig);
  });
}

function autosaveConfig() {
  estado.nomeSite = get("c-nome").value.trim() || "Saraiva";
  estado.nomeMarca = get("c-marca").value.trim() || "SARAIVA";
  estado.tagline = get("c-tagline").value.trim() || "";
  estado.contato = get("c-contato").value.trim();
  var novaSenha = get("c-senha").value.trim();
  if (novaSenha && novaSenha !== estado.senha) {
    estado.senha = novaSenha;
    localStorage.setItem(CHAVE_SENHA, novaSenha);
    senhaRemotaCache = novaSenha;
    agendarPushSenha(novaSenha);
  }
  estado.efeitos = {
    fumaca: get("c-fumaca").checked,
    spotlight: get("c-spotlight").checked,
    parallax: get("c-parallax").checked
  };
  marcarSujo();
}

/* ---------- Backup / Publicar ---------- */
function renderBackup() {
  var el = get("backup-status");
  if (!el) return;
  var em = localStorage.getItem(CHAVE_TEMPO);
  el.textContent = em
    ? "último salvamento em " + new Date(em).toLocaleString("pt-BR")
    : "sem salvamento ainda";
}

function baixarDadosJS() {
  baixarArquivo("dados.js", gerarDadosJS());
  toast("dados.js gerado. Substitua o arquivo no projeto para publicar", "ok");
}

function exportarJSON() {
  baixarArquivo("sara-vape-dados.json", JSON.stringify(estado, null, 2));
  toast("Backup JSON baixado", "ok");
}

function importarJSON(arquivo) {
  var leitor = new FileReader();
  leitor.onload = function () {
    try {
      var dados = JSON.parse(leitor.result);
      if (!dados.marcas || !dados.produtos || !Array.isArray(dados.marcas) || !Array.isArray(dados.produtos))
        throw new Error("formato");
      estado = dados;
      marcarSujo();
      salvarPainel();
      renderDashboard();
      renderProdutos();
      renderMarcas();
      renderConfig();
      renderBackup();
      toast("Dados importados", "ok");
    } catch (e) {
      toast("Arquivo inválido. Use um JSON exportado do painel", "err");
    }
  };
  leitor.readAsText(arquivo);
}

/* ---------- Login ---------- */
async function buscarSenhaRemota() {
  try {
    const res = await fetch("/api/admin-senha");
    if (!res.ok) return null;
    const j = await res.json();
    if (j && j.ok && typeof j.senha === "string") return j.senha;
  } catch (e) {}
  return null;
}

/* Senha que está na nuvem. Ela é usada como token para autorizar a troca,
   então precisa ser a senha ATUAL (antes da troca), não a nova.
   Se o KV ainda estiver vazio, o servidor aceita a senha padrão. */
var senhaNuvem = null;
async function tokenDaNuvem() {
  if (senhaNuvem) return senhaNuvem;
  var remota = await buscarSenhaRemota();
  senhaNuvem = remota || SENHA_PADRAO;
  return senhaNuvem;
}

async function atualizarSenhaRemota(senhaNova, token) {
  try {
    const res = await fetch("/api/admin-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token || "" },
      body: JSON.stringify({ senha: senhaNova }),
    });
    if (!res.ok) return false;
    const j = await res.json().catch(function () { return null; });
    return !!(j && j.ok);
  } catch (e) {
    return false;
  }
}

/* Agrupa a digitação no campo de senha para não enviar uma troca por letra. */
var pushSenhaTimer = null;
function agendarPushSenha(senhaNova) {
  clearTimeout(pushSenhaTimer);
  pushSenhaTimer = setTimeout(function () {
    empurrarSenha(senhaNova);
  }, 900);
}

function empurrarSenha(senhaNova, silencioso) {
  return tokenDaNuvem()
    .then(function (token) {
      return atualizarSenhaRemota(senhaNova, token);
    })
    .then(function (ok) {
      if (ok) {
        senhaNuvem = senhaNova;
        if (!silencioso) toast("Senha sincronizada na nuvem", "ok");
      } else if (!silencioso) {
        toast(
          "Senha salva aqui, mas não sincronizou na nuvem. Confira a conexão e salve de novo.",
          "err"
        );
      }
    })
    .catch(function () {
      if (!silencioso) toast("Senha salva aqui, mas não sincronizou na nuvem.", "err");
    });
}

var senhaRemotaCache = null;
async function senhaAtual() {
  if (senhaRemotaCache) return senhaRemotaCache;
  var local = (estado && estado.senha) || localStorage.getItem(CHAVE_SENHA);
  var remota = await buscarSenhaRemota();
  if (remota) {
    /* A nuvem é a fonte da verdade: se este navegador estava com outra
       senha (antiga ou só local), passa a usar a da nuvem. */
    if (local !== remota) {
      try { localStorage.setItem(CHAVE_SENHA, remota); } catch (e) {}
      if (estado) estado.senha = remota;
    }
    senhaNuvem = remota;
    senhaRemotaCache = remota;
    return remota;
  }
  if (local) {
    /* Nuvem ainda sem senha: usa a local e envia para a nuvem (uma vez). */
    senhaRemotaCache = local;
    senhaNuvem = SENHA_PADRAO;
    empurrarSenha(local, true);
    return local;
  }
  senhaRemotaCache = SENHA_PADRAO;
  return SENHA_PADRAO;
}

function mostrarAuth() {
  get("auth-root").style.display = "flex";
  get("app").style.display = "none";
  get("auth-err").classList.remove("show");
  setTimeout(function () { get("auth-senha").focus(); }, 40);
}

function mostrarApp() {
  get("auth-root").style.display = "none";
  get("app").style.display = "flex";
  renderDashboard();
  renderVendas();
  renderProdutos();
  renderMarcas();
  renderConfig();
  renderBackup();
  atualizarStatus();
}

function sair() {
  localStorage.removeItem(CHAVE_LOGIN);
  senhaRemotaCache = null;
  fecharModal();
  mostrarAuth();
}

/* ---------- Importação em massa ---------- */
var PALETA_GRADIENTES = [
  ["#22d3ee", "#0e7490"],
  ["#a855f7", "#7e22ce"],
  ["#fbbf24", "#b45309"],
  ["#3b82f6", "#1e3a8a"],
  ["#f43f5e", "#9f1239"],
  ["#10b981", "#065f46"],
  ["#94a3b8", "#334155"],
  ["#c4b5fd", "#6d28d9"],
  ["#f97316", "#7c2d12"],
  ["#22c55e", "#14532d"],
  ["#06b6d4", "#164e63"],
  ["#e879f9", "#86198f"]
];

function corParaMarca(slug) {
  var h = 0;
  for (var i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return PALETA_GRADIENTES[h % PALETA_GRADIENTES.length];
}

function detectarCategoria(t) {
  var x = String(t).toLowerCase();
  if (/(essencia|essência|.ess|30ml|60ml)/.test(x)) return "Essências";
  if (/(refil|refill)/.test(x)) return "Refis";
  if (/(seda|piteira|acessorio|acessório|bujão|bujao|cremalheira)/.test(x)) return "Acessórios";
  return "Pods";
}

function parseNumero(s) {
  var t = String(s).replace(/[^\d.,]/g, "");
  if (t.indexOf(",") > -1) t = t.replace(/\./g, "").replace(",", ".");
  return parseFloat(t);
}

function abrirImportarLista() {
  abrirModal(
    '<div class="a-modal-head"><h3>Importar produtos da lista</h3><button class="a-modal-x" id="mod-fechar" type="button">✕</button></div>' +
    '<div class="a-modal-body">' +
    '<p style="font-size:13px;color:var(--a-muted);line-height:1.7;margin-bottom:12px;">' +
    'Cole sua lista de produtos, <strong style="color:var(--a-ink)">um por linha</strong>, separando as colunas por <code>;</code>, <code>|</code> ou tab. ' +
    "Ordem: <b>Nome; Marca; Preço; Puffs (opcional); Sabores (opcional, separados por vírgula)</b>.</p>" +
    '<div class="a-field"><label>Lista de produtos</label><textarea class="a-textarea" id="import-lista" style="min-height:190px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;" placeholder="Ignite V80; Ignite; 129,90; 10000; Menta, Morango&#10;Elf Bar 600; Elf Bar; 39,90; 600; Uva&#10;Seda Royal; Seda Zomo; 8,00; ; &#10;Essência Morango; Essência Zgy; 49,90; 30ml"></textarea></div>' +
    '<p style="font-size:12.5px;color:var(--a-muted-2);line-height:1.6;">' +
    "Produtos que já existem pelo nome serão ignorados. Marcas que ainda não existirem serão criadas automaticamente, com cor e categoria detectadas.</p>" +
    "</div>" +
    '<div class="a-modal-foot"><button class="a-btn ghost" id="cancelar-importar" type="button">Cancelar</button><button class="a-btn" id="btn-processar-lista" type="button">Criar produtos</button></div>',
    true
  );
  get("mod-fechar").addEventListener("click", fecharModal);
  get("cancelar-importar").addEventListener("click", fecharModal);
  get("btn-processar-lista").addEventListener("click", processarLista);
  setTimeout(function () { get("import-lista").focus(); }, 50);
}

function processarLista() {
  var txt = get("import-lista").value;
  var linhas = txt.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  if (!linhas.length) { toast("Cole a lista de produtos primeiro", "err"); return; }

  var criados = 0;
  var ignorados = 0;
  var invalidas = 0;
  var marcasCriadas = {};

  linhas.forEach(function (linha) {
    var partes = linha.replace(/\t/g, ";").split(/[;|]/).map(function (s) { return s.trim(); });
    if (partes.length < 3) { invalidas++; return; }
    var nome = partes[0];
    var marcaNome = partes[1];
    var preco = parseNumero(partes[2]);
    var puffs = partes[3] ? parseInt(partes[3].replace(/\D/g, ""), 10) : null;
    var sabores = partes[4]
      ? partes[4].split(",").map(function (s) { return s.trim(); }).filter(Boolean)
      : [];

    if (!nome || !marcaNome || isNaN(preco) || preco <= 0) { invalidas++; return; }

    var slug = slugificar(nome);
    if (estado.produtos.some(function (p) { return p.slug === slug; })) { ignorados++; return; }

    var mSlug = slugificar(marcaNome);
    var marca = paiMarcaPorSlug(mSlug);
    if (!marca) {
      var cores = corParaMarca(mSlug);
      marca = {
        slug: mSlug,
        nome: marcaNome,
        categoria: detectarCategoria(nome + " " + marcaNome),
        cor1: cores[0],
        cor2: cores[1],
        imagem: ""
      };
      estado.marcas.push(marca);
      marcasCriadas[mSlug] = true;
    }

    estado.produtos.push({
      id: uid(),
      slug: slug,
      nome: nome,
      marca: mSlug,
      cor1: marca.cor1,
      cor2: marca.cor2,
      imagem: "",
      preco: preco,
      precoPromo: null,
      puffs: puffs,
      estoque: true,
      novidade: false,
      specs: [["Venda", "18+"]],
      sabores: sabores.length
        ? sabores.map(function (n) { return { nome: n, estoque: true }; })
        : [{ nome: "Padrão", estoque: true }]
    });
    criados++;
  });

  var nMarcas = Object.keys(marcasCriadas).length;
  if (criados || nMarcas) {
    marcarSujo();
    salvarPainel();
    renderProdutos();
    renderMarcas();
    renderDashboard();
  }
  fecharModal();

  var msg =
    "Lista processada: " + criados + " produto(s) criado(s)" +
    (nMarcas ? " · " + nMarcas + " marca(s) nova(s)" : "") +
    (ignorados ? " · " + ignorados + " já existia(m)" : "") +
    (invalidas ? " · " + invalidas + " linha(s) ignorada(s)" : "");
  toast(msg, criados ? "ok" : "warn");
}

/* ---------- Importação de produtos via JSON ---------- */
function abrirImportarProdJSON() {
  abrirModal(
    '<div class="a-modal-head"><h3>Importar produtos (JSON)</h3><button class="a-modal-x" id="mod-fechar" type="button">✕</button></div>' +
    '<div class="a-modal-body">' +
    '<p style="font-size:13px;color:var(--a-muted);line-height:1.7;margin-bottom:12px;">' +
    "Escolha um arquivo <code>.json</code> com a lista de produtos. Produtos que já existirem pelo nome são ignorados; marcas que não existirem são criadas automaticamente.</p>" +
    '<div class="a-field"><label>Formato aceito (seu catálogo)</label>' +
    '<pre class="a-pre">[&#10;  { "marca": "Elf Bar", "modelo": "15K", "tipo": "descartavel", "puffs": 15000, "preco": 100 },&#10;  { "marca": "Life Pod", "modelo": "Cápsula 8K", "tipo": "capsula", "preco": 85 }&#10;]</pre>' +
    '<p style="font-size:12px;color:var(--a-muted-2);margin-top:8px;">' +
    'Aceita <code>marca</code> + <code>modelo</code> (viram o nome do produto), além de <code>nome</code>, <code>sabores</code> e o backup completo do painel. Tipos reconhecidos: <code>descartavel</code>, <code>capsula</code> e <code>kit_completo</code>.</p></div>' +
    '<label class="a-check-line"><input type="checkbox" id="imp-subst"> Substituir catálogo (apaga produtos e marcas atuais antes de importar)</label>' +
    '<input type="file" id="imp-arquivo" accept=".json,application/json" style="display:none;">' +
    "</div>" +
    '<div class="a-modal-foot"><button class="a-btn ghost" id="cancelar-imp-json" type="button">Cancelar</button><button class="a-btn" id="btn-escolher-json" type="button">Escolher arquivo .json</button></div>'
  );
  get("mod-fechar").addEventListener("click", fecharModal);
  get("cancelar-imp-json").addEventListener("click", fecharModal);
  get("btn-escolher-json").addEventListener("click", function () {
    get("imp-arquivo").click();
  });
  get("imp-arquivo").addEventListener("change", function () {
    if (this.files && this.files[0]) {
      importarProdutosJSON(this.files[0], get("imp-subst").checked);
    }
    this.value = "";
    fecharModal();
  });
}

function importarProdutosJSON(arquivo, substituir) {
  var leitor = new FileReader();
  leitor.onload = function () {
    var dados = null;
    try {
      dados = JSON.parse(leitor.result);
    } catch (e) {
      toast("Arquivo JSON inválido", "err");
      return;
    }
    var lista = Array.isArray(dados) ? dados : (dados && Array.isArray(dados.produtos) ? dados.produtos : null);
    if (!lista) {
      toast("JSON sem lista de produtos. Use um array ou { produtos: [...] }", "err");
      return;
    }
    var marcasExtra = !Array.isArray(dados) && Array.isArray(dados.marcas) ? dados.marcas : [];
    var res = criarProdutosDoJSON(lista, marcasExtra, substituir);
    if (res.criados || res.marcasCriadas || substituir) {
      marcarSujo();
      salvarPainel();
      renderProdutos();
      renderMarcas();
      renderDashboard();
      renderVendas();
    }
    var msg =
      (substituir ? "Catálogo substituído: " : "") +
      res.criados + " produto(s) criado(s)" +
      (res.marcasCriadas ? " · " + res.marcasCriadas + " marca(s) nova(s)" : "") +
      (res.ignorados ? " · " + res.ignorados + " já existia(m)" : "") +
      (res.invalidos ? " · " + res.invalidos + " ignorado(s)" : "");
    toast(msg, res.criados || substituir ? "ok" : "warn");
  };
  leitor.readAsText(arquivo);
}

function criarProdutosDoJSON(lista, marcasExtra, substituir) {
  var criados = 0;
  var ignorados = 0;
  var invalidos = 0;
  var marcasCriadas = 0;

  if (substituir) {
    estado.produtos = [];
    estado.marcas = [];
  }

  var marcasMap = {};
  estado.marcas.forEach(function (m) { marcasMap[m.slug] = m; });

  function registrarMarca(mObj) {
    if (!mObj || !mObj.nome) return null;
    var slug = mObj.slug ? String(mObj.slug).toLowerCase() : slugificar(mObj.nome);
    var existente = marcasMap[slug];
    if (existente) return existente;
    var ig = estado.marcas.filter(function (m) { return m.nome.toLowerCase() === mObj.nome.toLowerCase(); })[0];
    if (ig) { marcasMap[ig.slug] = ig; return ig; }
    var cores = corParaMarca(slug);
    var nova = {
      slug: slug,
      nome: mObj.nome,
      categoria: mObj.categoria || detectarCategoria(mObj.nome),
      cor1: mObj.cor1 || cores[0],
      cor2: mObj.cor2 || cores[1],
      imagem: mObj.imagem || ""
    };
    estado.marcas.push(nova);
    marcasMap[slug] = nova;
    marcasCriadas++;
    return nova;
  }

  (marcasExtra || []).forEach(function (m) {
    if (m && typeof m === "object" && m.nome) registrarMarca(m);
  });

  lista.forEach(function (prod) {
    if (!prod || typeof prod !== "object") { invalidos++; return; }
    var preco = Number(prod.preco);
    if (isNaN(preco) || preco <= 0) { invalidos++; return; }

    var mObj = prod.marca && typeof prod.marca === "object" ? prod.marca : null;
    var mNome = (mObj ? String(mObj.nome || "").trim() : String(prod.marca || "").trim()) || "Outros";
    var marca = mObj ? registrarMarca(mObj) : registrarMarca({ nome: mNome });
    if (!marca) { invalidos++; return; }

    var nomeDado = String(prod.nome || "").trim();
    var modelo = String(prod.modelo || "").trim();
    var nome = nomeDado || (modelo ? mNome + " " + modelo : "");
    if (!nome) { invalidos++; return; }

    var slug = slugificar(nome);
    if (estado.produtos.some(function (p) { return p.slug === slug; })) { ignorados++; return; }

    var sabores;
    if (Array.isArray(prod.sabores)) {
      sabores = prod.sabores
        .map(function (s) {
          if (typeof s === "string") return { nome: s, estoque: true };
          return { nome: String(s.nome || "").trim(), estoque: s.estoque !== false };
        })
        .filter(function (s) { return s.nome; });
    }
    if (!sabores || !sabores.length) sabores = [{ nome: "Padrão", estoque: true }];

    var specs = [];
    if (Array.isArray(prod.specs) && prod.specs.length) {
      specs = prod.specs.filter(function (s) { return Array.isArray(s) && s.length >= 2; });
    } else {
      var tipoLabel = "";
      if (prod.tipo) {
        var tn = String(prod.tipo).toLowerCase();
        if (tn === "descartavel" || tn === "descartável") tipoLabel = "Pods descartáveis";
        else if (tn === "capsula" || tn === "cápsula") tipoLabel = "Cápsula";
        else if (tn === "kit_completo" || tn === "kit") tipoLabel = "Kit completo";
        else tipoLabel = String(prod.tipo);
      }
      if (tipoLabel) specs.push(["Tipo", tipoLabel]);
      var pf = Number(prod.puffs);
      if (pf) specs.push(["Puffs", pf.toLocaleString("pt-BR")]);
      if (!specs.length) specs.push(["Tipo", "Pods"]);
      specs.push(["Venda", "18+"]);
    }

    estado.produtos.push({
      id: uid(),
      slug: slug,
      nome: nome,
      marca: marca.slug,
      cor1: prod.cor1 || marca.cor1,
      cor2: prod.cor2 || marca.cor2,
      imagem: prod.imagem || "",
      preco: preco,
      precoPromo: prod.precoPromo ? Number(prod.precoPromo) : null,
      puffs: Number(prod.puffs) || null,
      estoque: prod.estoque !== false,
      novidade: !!prod.novidade,
      specs: specs,
      sabores: sabores
    });
    criados++;
  });

  return { criados: criados, ignorados: ignorados, invalidos: invalidos, marcasCriadas: marcasCriadas };
}

/* ---------- Vendas / Faturamento ---------- */
var CHAVE_VENDAS = "sv_vendas";
var LOJA_TOKEN = "sv8e4ac97ff788574ee6633547";
var vendas = [];
var vendasFiltro = "mes";
var COR_PAG = { Pix: "#22d3ee", Cartão: "#a855f7", Dinheiro: "#f59e0b" };
var COR_PAG_OUTRO = "#64748b";
var syncingVendas = false;

function carregarVendas() {
  try {
    vendas = JSON.parse(localStorage.getItem(CHAVE_VENDAS)) || [];
  } catch (e) {
    vendas = [];
  }
  if (!Array.isArray(vendas)) vendas = [];
}

function salvarVendas() {
  try {
    localStorage.setItem(CHAVE_VENDAS, JSON.stringify(vendas));
  } catch (e) {}
}

function pedidoServidor(opcoes) {
  var opts = opcoes || {};
  var url = "api/venda";
  if (opts.query) {
    var qs = Object.keys(opts.query)
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]); })
      .join("&");
    if (qs) url += "?" + qs;
  }
  return fetch(url, {
    method: opts.method || "GET",
    headers: Object.assign(
      { "x-loja-token": LOJA_TOKEN },
      opts.json ? { "Content-Type": "application/json" } : {}
    ),
    body: opts.json ? JSON.stringify(opts.json) : undefined
  }).then(function (r) {
    return r.json();
  });
}

function enviarVendaServidor(venda) {
  return pedidoServidor({ method: "POST", json: { venda: venda } }).catch(function () { return null; });
}

/* ---------- Catálogo na nuvem (api/catalogo) ---------- */
var pushCatalogoTimer = null;

function agendarPushCatalogo() {
  clearTimeout(pushCatalogoTimer);
  pushCatalogoTimer = setTimeout(empurrarCatalogo, 700);
}

function empurrarCatalogo() {
  var payload = {
    atualizadoEm: estado.atualizadoEm || Date.now(),
    marcas: estado.marcas,
    produtos: estado.produtos
  };
  try {
    if (JSON.stringify(payload).length > 850000) return;
  } catch (e) { return; }
  fetch("api/catalogo", {
    method: "POST",
    headers: Object.assign(
      { "x-loja-token": LOJA_TOKEN },
      { "Content-Type": "application/json" }
    ),
    body: JSON.stringify(payload)
  })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.ok && j.catalogo && j.catalogo.atualizadoEm) {
        estado.atualizadoEm = j.catalogo.atualizadoEm;
        try { localStorage.setItem(CHAVE_PAINEL, JSON.stringify(estado)); } catch (e) {}
      }
    })
    .catch(function () {});
}

function aplicCat(novoCatalogo) {
  if (!novoCatalogo || !Array.isArray(novoCatalogo.marcas) || !Array.isArray(novoCatalogo.produtos)) return;
  estado.marcas = novoCatalogo.marcas;
  estado.produtos = novoCatalogo.produtos;
  estado.atualizadoEm = novoCatalogo.atualizadoEm || Date.now();
}

function sincronizarCatalogo() {
  fetch("api/catalogo")
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var srv = j && j.ok ? j.catalogo : null;
      var localT = estado.atualizadoEm || 0;
      var srvT = srv ? srv.atualizadoEm || 0 : 0;
      if (srv && srvT > localT) {
        aplicCat(srv);
        salvarPainel();
        renderTodos();
      } else if (!srv || srvT < localT) {
        empurrarCatalogo();
      }
    })
    .catch(function () {});
}

function renderTodos() {
  renderDashboard();
  renderProdutos();
  renderMarcas();
  renderConfig();
  if (typeof renderVendas === "function") renderVendas();
}

/* ---------- Vendas na nuvem ---------- */
function sincronizarVendas() {
  if (syncingVendas) return;
  syncingVendas = true;
  pedidoServidor()
    .then(function (j) {
      if (!j || !Array.isArray(j.vendas)) { syncingVendas = false; return; }
      var ncServidor = {};
      var ncLocal = {};
      var alterou = false;
      j.vendas.forEach(function (x) { if (x && x.ncupom) ncServidor[x.ncupom] = true; });
      vendas.forEach(function (v) { if (v && v.ncupom) ncLocal[v.ncupom] = true; });
      j.vendas.forEach(function (v) {
        if (!v || !v.ncupom || ncLocal[v.ncupom]) return;
        ncLocal[v.ncupom] = true;
        vendas.push(v);
        alterou = true;
      });
      vendas.slice().forEach(function (v) {
        if (!v || !v.ncupom || ncServidor[v.ncupom]) return;
        ncServidor[v.ncupom] = true;
        enviarVendaServidor(v);
      });
      if (alterou) salvarVendas();
      renderVendas();
      syncingVendas = false;
    })
    .catch(function () {
      syncingVendas = false;
    });
}

function datKey(d) {
  var x = new Date(d);
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}

function mesChave(chave, offset) {
  var p = chave.split("-");
  var ano = Number(p[0]);
  var mes = Number(p[1]) + (offset || 0);
  while (mes < 1) { mes += 12; ano--; }
  while (mes > 12) { mes -= 12; ano++; }
  return ano + "-" + String(mes).padStart(2, "0");
}

function vendasDoFiltro() {
  carregarVendas();
  var t = new Date();
  var limite = null;
  if (vendasFiltro === "mes") {
    limite = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-01";
  } else if (vendasFiltro === "30") {
    limite = datKey(new Date(t.getTime() - 30 * 86400000));
  }
  return limite
    ? vendas.filter(function (v) { return (v.data || "") >= limite; })
    : vendas.slice();
}

function totalVendas(lista) {
  return lista.reduce(function (s, v) { return s + (v.total || 0); }, 0);
}

function qtdVendas(lista) {
  return lista.reduce(function (s, v) {
    return s + (v.itens || []).reduce(function (a, i) { return a + (i.qtd || 0); }, 0);
  }, 0);
}

function vendaDeCupom(texto) {
  var linhas = String(texto).split(/\r?\n/).map(function (l) { return l.trim(); });
  var pag = "";
  var entrega = "";
  var nome = "";
  var ncupom = "";
  var total = null;
  var itens = [];
  linhas.forEach(function (l) {
    var m = null;
    if ((m = l.match(/^Pedido[:：]\s*(.+)$/i))) ncupom = m[1].trim();
    else if ((m = l.match(/^Nome[:：]\s*(.+)$/i))) nome = m[1].trim();
    else if ((m = l.match(/^Pagamento[:：]\s*(.+)$/i))) pag = m[1].trim();
    else if ((m = l.match(/^(Entrega|Retirada)[:：]\s*(.+)$/i))) entrega = m[2].trim();
    else if ((m = l.match(/^Total[:：]\s*R\$\s*([\d.,]+)/i))) total = parseNumero(m[1]);
    else if (l.charAt(0) === "•" || l.charAt(0) === "-") {
      var partes = l.replace(/^[•\-]\s*/, "").split(/[—|]/).map(function (s) { return s.trim(); });
      if (partes.length >= 2) {
        var mt = (partes[2] || "").match(/(\d+)\s*x/i);
        var qtd = mt ? parseInt(mt[1], 10) : 1;
        var valor = partes[3] ? parseNumero(partes[3]) : null;
        itens.push({ nome: partes[0] || "Item", sabor: partes[1] || "", qtd: qtd || 1, valor: valor });
      }
    }
  });
  if (!itens.length && total == null) return null;
  if (total == null) total = itens.reduce(function (s, i) { return s + (i.valor || 0); }, 0);
  var agora = new Date();
  return {
    id: uid(),
    data: datKey(agora),
    hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    ncupom: ncupom,
    cliente: nome,
    itens: itens,
    total: total,
    pagamento: pag || "Não informado",
    entrega: entrega
  };
}

function vendaPreviaHTML(v) {
  var linhas = (v.itens || []).map(function (i) {
    return '<div class="v-prev-item"><span>' + escHtml(i.nome) +
      (i.sabor ? " — " + escHtml(i.sabor) : "") +
      "</span><span>" + (i.qtd || 1) + "x</span><span>" + formatarPreco(i.valor || 0) + "</span></div>";
  }).join("");
  return '<div class="v-previa ok">' +
    '<div class="v-prev-head"><strong>' + escHtml(v.ncupom || "Sem código") + "</strong><span>" + v.data + " " + v.hora + "</span></div>" +
    (v.cliente ? '<div class="v-prev-cli">Cliente: ' + escHtml(v.cliente) + "</div>" : "") +
    linhas +
    '<div class="v-prev-total"><span>Total</span><strong>' + formatarPreco(v.total) + "</strong></div>" +
    '<div class="v-prev-pag">Pagamento: <b>' + escHtml(v.pagamento) + "</b> · " + escHtml(v.entrega || "Entrega") + "</div>" +
    "</div>";
}

function abrirRegistrarVenda() {
  abrirModal(
    '<div class="a-modal-head"><h3>Registrar venda (colar cupom)</h3><button class="a-modal-x" id="mod-fechar" type="button">✕</button></div>' +
    '<div class="a-modal-body">' +
    '<p style="font-size:13px;color:var(--a-muted);line-height:1.7;margin-bottom:12px;">' +
    "Cole aqui o cupom que o cliente enviou para a loja. O painel identifica automaticamente os itens, o total, a retirada e o pagamento.</p>" +
    '<div class="a-field"><label>Cupom recebido</label>' +
    '<textarea class="a-textarea" id="v-cupom" style="min-height:200px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;" placeholder="Olá! 👋 Quero finalizar meu pedido:&#10;Pedido: SV2209-123&#10;Nome: Maria&#10;• Ignite V80 — Menta — 2x — R$ 129,90&#10;&#10;Total: R$ 129,90&#10;Entrega: Entrega (combinar taxa)&#10;Pagamento: Pix"></textarea></div>' +
    '<div id="v-previa"></div>' +
    "</div>" +
    '<div class="a-modal-foot"><button class="a-btn ghost" id="cancelar-venda" type="button">Cancelar</button><button class="a-btn" id="btn-revisar-venda" type="button">Revisar cupom</button><button class="a-btn success" disabled id="btn-salvar-venda" type="button">Salvar venda</button></div>',
    true
  );
  get("mod-fechar").addEventListener("click", fecharModal);
  get("cancelar-venda").addEventListener("click", fecharModal);
  var gravar = null;

  get("btn-revisar-venda").addEventListener("click", function () {
    var v = vendaDeCupom(get("v-cupom").value);
    if (!v) {
      get("v-previa").innerHTML = '<div class="v-previa aviso">Não consegui ler o cupom. Confira se colou o texto completo do pedido.</div>';
      get("btn-salvar-venda").disabled = true;
      gravar = null;
      return;
    }
    if (v.ncupom && vendas.some(function (x) { return x.ncupom && x.ncupom === v.ncupom; })) {
      get("v-previa").innerHTML = '<div class="v-previa aviso">Este cupom (código "' + escHtml(v.ncupom) + '") já está registrado. Venda duplicada?</div>';
      get("btn-salvar-venda").disabled = true;
      gravar = null;
      return;
    }
    gravar = v;
    get("v-previa").innerHTML = vendaPreviaHTML(v);
    get("btn-salvar-venda").disabled = false;
  });

  get("btn-salvar-venda").addEventListener("click", function () {
    if (!gravar) return;
    vendas.push(gravar);
    salvarVendas();
    enviarVendaServidor(gravar);
    renderVendas();
    fecharModal();
    toast("Venda registrada", "ok");
  });

  setTimeout(function () { get("v-cupom").focus(); }, 50);
}

function renderVendas() {
  carregarVendas();
  get("nav-cnt-vendas").textContent = vendas.length;
  document.querySelectorAll(".v-chip").forEach(function (c) {
    c.classList.toggle("sel", c.dataset.f === vendasFiltro);
  });
  get("v-tag-faturamento").textContent =
    vendasFiltro === "mes" ? "este mês" : (vendasFiltro === "30" ? "últimos 30 dias" : "todo o período");
  get("v-tag-pedidos").textContent = "pedidos";
  get("v-tag-ticket").textContent = "médio";
  get("v-tag-qtd").textContent = "unidades";

  var lista = vendasDoFiltro();
  var fat = totalVendas(lista);
  var ped = lista.length;
  var qtd = qtdVendas(lista);

  get("v-faturamento").textContent = formatarPreco(fat);
  get("v-pedidos").textContent = ped;
  get("v-qtd").textContent = qtd;
  get("v-ticket").textContent = ped ? formatarPreco(fat / ped) : "R$ 0,00";
  get("v-ticket").title = ped ? "média: " + (fat / ped).toFixed(2) : "";

  renderBarrasMensais();
  renderDonutPag(lista);
  renderDivProdutos();
  renderTopProdutos(lista);
  renderTabelaVendas(lista);
  sincronizarVendas();
}

function renderBarrasMensais() {
  var container = get("v-bars");
  var agora = new Date();
  var chaveAtual = agora.getFullYear() + "-" + String(agora.getMonth() + 1).padStart(2, "0");
  var meses = [];
  for (var i = 5; i >= 0; i--) meses.push(mesChave(chaveAtual, -i));
  var nomeMes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var valores = meses.map(function (ck) {
    return vendas
      .filter(function (v) { return (v.data || "").indexOf(ck) === 0; })
      .reduce(function (s, v) { return s + (v.total || 0); }, 0);
  });
  var max = Math.max.apply(null, valores.concat([1]));
  container.innerHTML = meses.map(function (ck, i) {
    var p = Number(ck.split("-")[1]) - 1;
    var h = Math.round((valores[i] / max) * 100);
    return '<div class="v-bar-col">' +
      '<span class="v-bar-val">' + (valores[i] ? formatarPreco(valores[i]).replace("R$ ", "") : "") + "</span>" +
      '<div class="v-bar-track"><div class="v-bar-fill' + (valores[i] ? "" : " none") + '" style="height:' + h + '%"></div></div>' +
      '<span class="v-bar-lab">' + nomeMes[p] + "</span></div>";
  }).join("");
}

function renderDonutPag(lista) {
  var el = get("v-donut");
  var porPag = {};
  lista.forEach(function (v) {
    var pg = v.pagamento || "Não informado";
    porPag[pg] = (porPag[pg] || 0) + (v.total || 0);
  });
  var chaves = Object.keys(porPag);
  if (!chaves.length) {
    el.innerHTML = '<div class="a-empty"><div class="e-ico">—</div><div class="e-t">Nenhuma venda no período</div></div>';
    return;
  }
  var soma = chaves.reduce(function (s, k) { return s + porPag[k]; }, 0);
  var acum = 0;
  var stops = chaves.map(function (k) {
    var ini = (acum / soma) * 100;
    acum += porPag[k];
    var fim = (acum / soma) * 100;
    var cor = COR_PAG[k] || COR_PAG_OUTRO;
    return cor + " " + ini.toFixed(2) + "% " + fim.toFixed(2) + "%";
  });
  var legs = chaves.map(function (k) {
    var pct = Math.round((porPag[k] / soma) * 100);
    return '<div class="v-legend-item"><span class="v-legend-dot" style="background:' + (COR_PAG[k] || COR_PAG_OUTRO) + '"></span><span>' + escHtml(k) + "</span><strong>" + pct + "% · " + formatarPreco(porPag[k]) + "</strong></div>";
  }).join("");
  el.innerHTML =
    '<div class="v-donut-row">' +
    '<div class="v-donut-ring" style="background:conic-gradient(' + stops.join(", ") + ')"><div class="v-donut-hole"><strong>' + formatarPreco(soma) + "</strong><span>no período</span></div></div>" +
    '<div class="v-legend">' + legs + "</div>" +
    "</div>";
}

function renderDivProdutos() {
  var vendidos = {};
  vendas.forEach(function (v) {
    (v.itens || []).forEach(function (i) {
      vendidos[i.nome] = vendidos[i.nome] || { qtd: 0, receita: 0 };
      vendidos[i.nome].qtd += (i.qtd || 1);
      vendidos[i.nome].receita += (i.valor || 0);
    });
  });
  var prods = estado.produtos;
  var saiu = [];
  var nao = [];
  prods.forEach(function (p) {
    if (vendidos[p.nome]) saiu.push({ p: p, info: vendidos[p.nome] });
    else nao.push(p);
  });
  var total = prods.length || 1;
  var pctSaiu = Math.round((saiu.length / total) * 100);

  get("v-divbar").innerHTML =
    '<div class="v-pctrow"><span>Saiu: ' + saiu.length + "</span><span>Não saiu: " + nao.length + "</span></div>" +
    '<div class="v-pct-track"><div class="v-pct-saiu" style="width:' + pctSaiu + '%"></div></div>' +
    '<div class="v-pctsub">' + pctSaiu + "% dos produtos já saíram · " + (saiu.length + nao.length) + " no catálogo</div>";

  get("v-saiu").innerHTML = saiu.length
    ? saiu.slice(0, 6).map(function (x) {
        var p = x.p;
        var estilo = p.imagem
          ? "background-image:url('" + escAttr(p.imagem) + "')"
          : "background:" + gradiente(p.cor1 || "#333", p.cor2 || "#111");
        return '<div class="a-row-item">' +
          '<span class="a-thumb" style="' + estilo + '"></span>' +
          '<div class="ri-main"><div class="ri-title">' + escHtml(p.nome) + "</div>" +
          '<div class="ri-sub"><span>' + x.info.qtd + " un vendidas · " + formatarPreco(x.info.receita) + "</span></div></div></div>";
      }).join("")
    : listaVazia("Nenhum registro de venda ainda. Registre vendas para ver aqui.");

  get("v-nao-saiu").innerHTML = nao.length
    ? nao.slice(0, 6).map(function (p) {
        var estilo = p.imagem
          ? "background-image:url('" + escAttr(p.imagem) + "')"
          : "background:" + gradiente(p.cor1 || "#333", p.cor2 || "#111");
        return '<div class="a-row-item">' +
          '<span class="a-thumb" style="' + estilo + '"></span>' +
          '<div class="ri-main"><div class="ri-title">' + escHtml(p.nome) + "</div>" +
          '<div class="ri-sub"><span>' + escHtml((paiMarcaPorSlug(p.marca) || {}).nome || p.marca) + " · sem venda" + "</span></div></div></div>";
      }).join("")
    : listaVazia("Todos os produtos já saíram. Nenhum parado.");
}

function renderTopProdutos(lista) {
  var el = get("v-top");
  var ag = {};
  lista.forEach(function (v) {
    (v.itens || []).forEach(function (i) {
      ag[i.nome] = ag[i.nome] || { qtd: 0, receita: 0 };
      ag[i.nome].qtd += (i.qtd || 1);
      ag[i.nome].receita += (i.valor || 0);
    });
  });
  var arr = Object.keys(ag).map(function (k) { return { n: k, q: ag[k].qtd, r: ag[k].receita }; });
  arr.sort(function (a, b) { return b.r - a.r; });
  if (!arr.length) {
    el.innerHTML = listaVazia("Sem vendas no período.");
    return;
  }
  var max = Math.max.apply(null, arr.map(function (x) { return x.r; })) || 1;
  el.innerHTML = arr.slice(0, 6).map(function (x) {
    var w = Math.round((x.r / max) * 100);
    return '<div class="v-top-item"><div class="v-top-main"><div class="ri-title">' + escHtml(x.n) + "</div>" +
      '<span class="v-top-meta">' + x.q + " un · " + formatarPreco(x.r) + "</span></div>" +
      '<div class="v-top-track"><div class="v-top-fill" style="width:' + w + '%"></div></div></div>';
  }).join("");
}

function pillPagamento(pg) {
  var cls = "muted";
  if (pg === "Pix") cls = "ok";
  else if (pg === "Cartão") cls = "novo";
  else if (pg === "Dinheiro") cls = "promo";
  return '<span class="a-pill ' + cls + '">' + escHtml(pg || "—") + "</span>";
}

function renderTabelaVendas(lista) {
  var corpo = get("v-corpo");
  if (!lista.length) {
    corpo.innerHTML =
      '<tr><td colspan="6"><div class="a-empty"><div class="e-ico">—</div><div class="e-t">Nenhuma venda registrada no período.</div><div style="font-size:12.5px;margin-top:4px;">Pedidos finalizados e copiados neste navegador entram aqui automaticamente. Cupons recebidos de outros aparelhos podem ser registrados em "Registrar venda".</div></div></td></tr>';
    return;
  }
  var ordenado = lista.slice().sort(function (a, b) {
    return (b.data + " " + (b.hora || "")) < (a.data + " " + (a.hora || "")) ? 1 : -1;
  });
  corpo.innerHTML = ordenado.map(function (v) {
    var itensHTML = (v.itens || []).map(function (i) {
      return '<div class="a-table-item">• ' + escHtml(i.nome) +
        (i.sabor ? ' <span class="muted2">(' + escHtml(i.sabor) + ")</span>" : "") +
        ' <span class="muted2">' + (i.qtd || 1) + "x</span> <span class='forte'>" + formatarPreco(i.valor || 0) + "</span></div>";
    }).join("");
    return "<tr>" +
      "<td>" + v.data + (v.hora ? ' <div class="sub">' + v.hora + "</div>" : "") + "</td>" +
      "<td><span class='forte'>" + escHtml(v.ncupom || "—") + "</span>" +
      (v.cliente ? ' <div class="sub">' + escHtml(v.cliente) + "</div>" : "") + "</td>" +
      "<td>" + (itensHTML || "—") + "</td>" +
      "<td>" + pillPagamento(v.pagamento) + "</td>" +
      "<td><span class='forte'>" + formatarPreco(v.total) + "</span></td>" +
      '<td><button class="a-btn sm danger ghost" data-excluir-venda="' + escAttr(v.id) + '" type="button">Excluir</button></td>' +
      "</tr>";
  }).join("");
}

/* ---------- Inicialização ---------- */
function initPainel() {
  /* Navegação lateral */
  document.querySelectorAll(".a-nav-item").forEach(function (n) {
    n.addEventListener("click", function () {
      navegar(n.dataset.view);
    });
  });

  /* Topbar */
  atualizarStatus();

  /* Login */
  get("auth-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var val = get("auth-senha").value.trim();
    try {
      var senha = await senhaAtual();
      if (val === senha) {
        localStorage.setItem(CHAVE_LOGIN, "1");
        get("auth-senha").value = "";
        mostrarApp();
      } else {
        get("auth-err").classList.add("show");
        get("auth-senha").select();
      }
    } catch (err) {
      get("auth-err").classList.add("show");
      get("auth-senha").select();
    }
  });

  /* Sair */
  get("btn-sair-lateral").addEventListener("click", function () {
    if (confirm("Sair do painel? As alterações salvas continuam guardadas neste navegador.")) sair();
  });
  get("btn-sair-config").addEventListener("click", function () {
    if (confirm("Sair do painel?")) sair();
  });

  /* Trocar senha */
  get("btn-trocar-senha").addEventListener("click", async function () {
    var atual = get("senha-atual").value;
    var nova = get("senha-nova").value.trim();
    var senha = await senhaAtual();
    if (atual !== senha) { toast("Senha atual incorreta", "err"); return; }
    if (nova.length < 4) { toast("A nova senha deve ter ao menos 4 caracteres", "err"); return; }
    var token = await tokenDaNuvem();
    estado.senha = nova;
    localStorage.setItem(CHAVE_SENHA, nova);
    try { localStorage.setItem(CHAVE_PAINEL, JSON.stringify(estado)); } catch (e) {}
    senhaRemotaCache = nova;
    get("senha-atual").value = "";
    get("senha-nova").value = "";
    var ok = await atualizarSenhaRemota(nova, token);
    if (ok) {
      senhaNuvem = nova;
      toast("Senha alterada e sincronizada na nuvem", "ok");
    } else {
      toast("Senha alterada neste navegador, mas não sincronizou na nuvem", "err");
    }
  });

  /* Produtos: filtros e ações */
  get("busca-produto").addEventListener("input", function () {
    buscas.produtos = this.value;
    renderProdutos();
  });
  get("filtro-marca").addEventListener("change", function () {
    buscas.marca = this.value;
    renderProdutos();
  });
  get("ordem-produtos").addEventListener("change", function () {
    buscas.ordem = this.value;
    renderProdutos();
  });
  get("novo-produto").addEventListener("click", function () {
    abrirFormProduto(null);
  });
  get("btn-importar-lista").addEventListener("click", abrirImportarLista);
  get("btn-importar-prod-json").addEventListener("click", abrirImportarProdJSON);

  get("corpo-produtos").addEventListener("click", function (e) {
    var t = e.target;
    if (!t.dataset) return;
    if (t.dataset.editar) abrirFormProduto(t.dataset.editar);
    if (t.dataset.duplicar) {
      var src = estado.produtos.filter(function (x) { return x.id === t.dataset.duplicar; })[0];
      if (src) {
        var copia = Object.assign({}, src);
        copia.id = uid();
        copia.slug = slugificar(copia.nome) + "-" + uid().slice(-4);
        copia.nome = copia.nome + " (cópia)";
        estado.produtos.push(copia);
        marcarSujo();
        salvarPainel();
        renderProdutos();
        renderDashboard();
      }
    }
    if (t.dataset.excluir) {
      if (confirm("Excluir este produto?")) {
        estado.produtos = estado.produtos.filter(function (x) { return x.id !== t.dataset.excluir; });
        marcarSujo();
        salvarPainel();
        renderProdutos();
        renderDashboard();
      }
    }
  });

  /* Marcas: ações */
  get("nova-marca").addEventListener("click", function () {
    abrirFormMarca(null);
  });
  get("corpo-marcas").addEventListener("click", function (e) {
    var t = e.target;
    if (!t.dataset) return;
    if (t.dataset.editarMarca) abrirFormMarca(t.dataset.editarMarca);
    if (t.dataset.excluirMarca) {
      var slug = t.dataset.excluirMarca;
      var bloqueada = produtosDaMarca(slug).length;
      if (confirm(
        "Excluir a marca? Os " + bloqueada + " produto(s) desta marca também serão removidos."
      )) {
        estado.marcas = estado.marcas.filter(function (m) { return m.slug !== slug; });
        estado.produtos = estado.produtos.filter(function (p) { return p.marca !== slug; });
        marcarSujo();
        salvarPainel();
        renderMarcas();
        renderProdutos();
        renderDashboard();
      }
    }
  });

  /* Dashboard: atalhos */
  get("dash-ver-esgotados").addEventListener("click", function () { navegar("produtos"); });
  get("dash-ver-promos").addEventListener("click", function () { navegar("produtos"); });

  /* Vendas */
  get("btn-registrar-venda").addEventListener("click", abrirRegistrarVenda);
  get("v-chips").addEventListener("click", function (e) {
    var b = e.target;
    if (b.dataset && b.dataset.f) {
      vendasFiltro = b.dataset.f;
      renderVendas();
    }
  });
  get("v-corpo").addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.excluirVenda) {
      if (confirm("Excluir esta venda do histórico?")) {
        var idVenda = t.dataset.excluirVenda;
        vendas = vendas.filter(function (v) { return v.id !== idVenda; });
        salvarVendas();
        pedidoServidor({ method: "DELETE", query: { id: idVenda } }).catch(function () {});
        renderVendas();
        toast("Venda excluída", "ok");
      }
    }
  });
  get("v-limpar").addEventListener("click", function () {
    if (confirm("Apagar todo o histórico de vendas?")) {
      vendas = [];
      salvarVendas();
      pedidoServidor({ method: "DELETE", query: { limpar: "1" } }).catch(function () {});
      renderVendas();
      toast("Histórico de vendas limpo", "ok");
    }
  });

  get("lista-esgotados").addEventListener("click", function (e) {
    var r = e.target.closest("[data-ir-produto]");
    if (r) {
      buscas.produtos = r.dataset.irProduto;
      navegar("produtos");
    }
  });
  get("lista-promos").addEventListener("click", function (e) {
    var r = e.target.closest("[data-ir-produto]");
    if (r) {
      buscas.produtos = r.dataset.irProduto;
      navegar("produtos");
    }
  });

  /* Backup */
  get("btn-dados-js").addEventListener("click", baixarDadosJS);
  get("btn-exportar").addEventListener("click", exportarJSON);
  get("btn-importar").addEventListener("click", function () {
    get("input-importar").click();
  });
  get("input-importar").addEventListener("change", function () {
    if (this.files && this.files[0]) importarJSON(this.files[0]);
    this.value = "";
  });
  get("btn-restaurar").addEventListener("click", function () {
    if (!confirm("Restaurar os dados padrão? As alterações do painel serão perdidas neste navegador.")) return;
    localStorage.removeItem(CHAVE_PAINEL);
    localStorage.removeItem(CHAVE_TEMPO);
    window.location.reload();
  });

  /* Modal: fechar por teclado/fundo */
  get("mod-root").addEventListener("click", function (e) {
    if (e.target === this) fecharModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") fecharModal();
  });

  /* Preencher filtro de marca (implantação via renderMarcas) */
  renderFiltroMarca();

  sincronizarCatalogo();

  if (localStorage.getItem(CHAVE_LOGIN) === "1") mostrarApp();
  else mostrarAuth();
}