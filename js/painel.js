var CHAVE_PAINEL = "sv_painel";
var estado = JSON.parse(JSON.stringify(BANCO_DADOS));
var modoEdicaoProduto = null;

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

function salvarPainel() {
  localStorage.setItem(CHAVE_PAINEL, JSON.stringify(estado));
  mostrarToast("Alterações salvas ✓");
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

/* ---------- Abas ---------- */
function ativarAba(nome) {
  document.querySelectorAll(".aba-btn").forEach(function (b) {
    b.classList.toggle("ativo", b.dataset.aba === nome);
  });
  document.querySelectorAll(".aba").forEach(function (a) {
    a.classList.toggle("ativa", a.id === "aba-" + nome);
  });
}

/* ---------- Produtos ---------- */
function renderProdutos() {
  var corpo = document.getElementById("corpo-produtos");
  var lista = estado.produtos.slice().sort(function (a, b) {
    return (a.marca + a.nome).localeCompare(b.marca + b.nome);
  });
  if (!lista.length) {
    corpo.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Nenhum produto. Clique em "Novo produto".</td></tr>';
    return;
  }
  corpo.innerHTML = lista
    .map(function (p) {
      var m = marcaPorSlug(p.marca);
      var nomeMarca = m ? m.nome : p.marca;
      var estilo = p.imagem
        ? 'background-image:url("' + p.imagem + '")'
        : "background:" + gradiente(p.cor1 || "#333", p.cor2 || "#111");
      var marcaChip = m ? m.categoria : "";
      return (
        "<tr>" +
        '<td><span class="swatch" style="' + estilo + '"></span></td>' +
        "<td><strong>" + p.nome + "</strong></td>" +
        "<td>" + nomeMarca + "<br><span style='font-size:11px;color:var(--texto-3);'>" + marcaChip + "</span></td>" +
        "<td>" + formatarPreco(p.precoPromo || p.preco) + "</td>" +
        "<td>" + p.sabores.length + "</td>" +
        "<td>" + (produtoTemEstoque(p) ? '<span class="pill badge-verde">Em estoque</span>' : '<span class="pill badge-vermelho">Esgotado</span>') + "</td>" +
        '<td><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
        '<button class="btn-p" data-editar="' + p.id + '">Editar</button>' +
        '<button class="btn-p" data-duplicar="' + p.id + '">Duplicar</button>' +
        '<button class="btn-p perigo" data-excluir="' + p.id + '">Excluir</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");
}

function comporSabores() {
  var sabores = [];
  document.querySelectorAll('[data-linha-sabor]').forEach(function (linha) {
    sabores.push({
      nome: linha.querySelector('input[type="text"]').value.trim(),
      estoque: linha.querySelector('input[type="checkbox"]').checked
    });
  });
  return sabores.filter(function (s) {
    return s.nome;
  });
}

function renderSaboresEditor(sabores) {
  var el = document.getElementById("editor-sabores");
  el.innerHTML = sabores
    .map(function (s, i) {
      return (
        '<div class="linha-sabor" data-linha-sabor>' +
        '<input type="text" value="' + (s.nome || "").replace(/"/g, "&quot;") + '" placeholder="Ex: Menta">' +
        '<label class="campo-check"><input type="checkbox" ' + (s.estoque ? "checked" : "") + "> Em<br>estoque</label>" +
        '<button class="btn-p perigo" data-remove-sabor="' + i + '">✕</button>' +
        "</div>"
      );
    })
    .join("") + '<button class="btn-p" id="add-sabor" type="button">+ Adicionar sabor</button>';
  el.querySelector("#add-sabor").addEventListener("click", function () {
    var sab = comporSabores();
    sab.push({ nome: "", estoque: true });
    renderSaboresEditor(sab);
  });
  el.querySelectorAll("[data-remove-sabor]").forEach(function (b) {
    b.addEventListener("click", function () {
      var sab = comporSabores();
      sab.splice(Number(b.dataset.removeSabor), 1);
      renderSaboresEditor(sab);
    });
  });
}

function abrirFormProduto(id) {
  modoEdicaoProduto = id || null;
  var p = id
    ? estado.produtos.filter(function (x) {
        return x.id === id;
      })[0]
    : null;
  var editor = document.getElementById("editor-produto");
  editor.style.display = p || id ? "block" : "none";
  document.getElementById("titulo-editor").textContent = p ? "Editar produto" : "Novo produto";

  var marcaOpcoes = estado.marcas
    .map(function (m) {
      var sel = p && p.marca === m.slug ? " selected" : "";
      return '<option value="' + m.slug + '"' + sel + ">" + m.nome + " (" + m.categoria + ")</option>";
    })
    .join("");

  editor.innerHTML =
    '<h3 id="titulo-editor"></h3>' +
    '<div class="form-grid">' +
    '<div class="campo"><label>Nome do produto</label><input id="p-nome" value="' + (p ? p.nome : "").replace(/"/g, "&quot;") + '" placeholder="Ex: Ignite V80"></div>' +
    '<div class="campo"><label>Marca</label><select id="p-marca">' + marcaOpcoes + "</select></div>" +
    '<div class="campo"><label>Preço (R$)</label><input id="p-preco" type="number" step="0.01" min="0" value="' + (p ? p.preco : "") + '"></div>' +
    '<div class="campo"><label>Preço promocional (vazio = sem promo)</label><input id="p-promo" type="number" step="0.01" min="0" value="' + (p && p.precoPromo ? p.precoPromo : "") + '"></div>' +
    '<div class="campo"><label>Puffs (vazio = não se aplica)</label><input id="p-puffs" type="number" min="0" value="' + (p && p.puffs ? p.puffs : "") + '"></div>' +
    '<div class="campo"><label>Foto (URL, vazio = gradiente)</label><input id="p-img" value="' + (p && p.imagem ? p.imagem : "").replace(/"/g, "&quot;") + '" placeholder="https://..."></div>' +
    '<div class="campo"><label>Cores do gradiente (se sem foto)</label><div class="form-grid" style="grid-template-columns:1fr 1fr;"><input id="p-cor1" type="color" value="' + (p ? p.cor1 : "#22d3ee") + '"><input id="p-cor2" type="color" value="' + (p ? p.cor2 : "#0e7490") + '"></div></div>' +
    "</div>" +
    '<div class="campos-checks" style="display:flex;gap:18px;flex-wrap:wrap;">' +
    '<label class="campo-check"><input id="p-estoque" type="checkbox" ' + (!p || p.estoque ? "checked" : "") + "> Produto em estoque</label>" +
    '<label class="campo-check"><input id="p-novidade" type="checkbox" ' + (p && p.novidade ? "checked" : "") + "> Destaque como NOVO</label>" +
    "</div>" +
    '<div class="campo"><label>Especificações (uma por linha, formato "Nome: Valor")</label><textarea id="p-specs" placeholder="Tipo: Pods descartáveis&#10;Puffs: 10.000">' + (p ? p.specs.map(function (s) { return s[0] + ": " + s[1]; }).join("\n") : "") + "</textarea></div>" +
    '<div class="campo"><label>Sabores e estoque</label><div class="linha-sabor" id="editor-sabores"></div></div>' +
    '<div class="acoes-linha">' +
    '<button class="btn btn-primario" id="salvar-produto" type="button">Salvar produto</button>' +
    '<button class="btn btn-ghost" id="cancelar-produto" type="button">Cancelar</button>' +
    "</div>";

  renderSaboresEditor(p ? p.sabores : [{ nome: "", estoque: true }]);

  document.getElementById("salvar-produto").addEventListener("click", function () {
    var nome = document.getElementById("p-nome").value.trim();
    var marca = document.getElementById("p-marca").value;
    var preco = parseFloat(document.getElementById("p-preco").value);
    var promo = document.getElementById("p-promo").value;
    var puffs = document.getElementById("p-puffs").value;
    var img = document.getElementById("p-img").value.trim();
    var cor1 = document.getElementById("p-cor1").value;
    var cor2 = document.getElementById("p-cor2").value;
    var estoque = document.getElementById("p-estoque").checked;
    var novidade = document.getElementById("p-novidade").checked;
    var specs = document
      .getElementById("p-specs")
      .value.split("\n")
      .map(function (l) {
        var par = l.split(":");
        return par.length === 2 ? [par[0].trim(), par[1].trim()] : null;
      })
      .filter(Boolean);
    var sabores = comporSabores();

    if (!nome || !marca || isNaN(preco)) {
      mostrarToast("Preencha nome, marca e preço.");
      return;
    }

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
      sabores: sabores.length ? sabores : [{ nome: "Padrão", estoque: estoque }]
    };

    if (modoEdicaoProduto) {
      estado.produtos.forEach(function (x, i) {
        if (x.id === modoEdicaoProduto) {
          estado.produtos[i] = Object.assign({}, x, dados);
        }
      });
    } else {
      if (!estado.marcas.some(function (m) { return m.slug === marca; })) {
        mostrarToast("Crie a marca antes de adicionar o produto.");
        return;
      }
      var m = marcaPorSlug(marca);
      estado.produtos.push(
        Object.assign({ id: uid(), slug: slugificar(nome) + "-" + uid().slice(-4) }, dados)
      );
    }
    salvarPainel();
    renderProdutos();
    fecharFormProduto();
  });

  document.getElementById("cancelar-produto").addEventListener("click", fecharFormProduto);
}

function fecharFormProduto() {
  modoEdicaoProduto = null;
  document.getElementById("editor-produto").style.display = "none";
}

/* ---------- Marcas ---------- */
function renderMarcas() {
  var corpo = document.getElementById("corpo-marcas");
  if (!estado.marcas.length) {
    corpo.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;">Nenhuma marca cadastrada.</td></tr>';
    return;
  }
  corpo.innerHTML = estado.marcas
    .map(function (m) {
      var estilo = m.imagem
        ? 'background-image:url("' + m.imagem + '")'
        : "background:" + gradiente(m.cor1, m.cor2);
      return (
        "<tr>" +
        '<td><span class="swatch" style="' + estilo + '"></span></td>' +
        "<td><strong>" + m.nome + "</strong></td>" +
        "<td>" + m.categoria + "</td>" +
        "<td>" + produtosDaMarca(m.slug).length + " produto(s)</td>" +
        '<td><div style="display:flex;gap:6px;">' +
        '<button class="btn-p" data-editar-marca="' + m.slug + '">Editar</button>' +
        '<button class="btn-p perigo" data-excluir-marca="' + m.slug + '">Excluir</button>' +
        "</div></td>" +
        "</tr>"
      );
    })
    .join("");
}

function abrirFormMarca(slug) {
  var m = slug
    ? estado.marcas.filter(function (x) {
        return x.slug === slug;
      })[0]
    : null;
  var editor = document.getElementById("editor-marca");
  editor.style.display = "block";
  document.getElementById("titulo-editor-marca").textContent = m ? "Editar marca" : "Nova marca";

  var catOpcoes = ["Pods", "Essências", "Refis", "Acessórios", "Outros"]
    .map(function (c) {
      var sel = m && m.categoria === c ? " selected" : "";
      return '<option value="' + c + '"' + sel + ">" + c + "</option>";
    })
    .join("");

  editor.innerHTML =
    '<h3 id="titulo-editor-marca"></h3>' +
    '<div class="form-grid">' +
    '<div class="campo"><label>Nome da marca</label><input id="m-nome" value="' + (m ? m.nome : "").replace(/"/g, "&quot;") + '" placeholder="Ex: Ignite"></div>' +
    '<div class="campo"><label>Categoria</label><select id="m-categoria">' + catOpcoes + "</select></div>" +
    '<div class="campo"><label>Foto (URL, vazio = gradiente)</label><input id="m-img" value="' + (m && m.imagem ? m.imagem : "").replace(/"/g, "&quot;") + '"></div>' +
    '<div class="campo"><label>Cor do gradiente 1</label><input id="m-cor1" type="color" value="' + (m ? m.cor1 : "#22d3ee") + '"></div>' +
    '<div class="campo"><label>Cor do gradiente 2</label><input id="m-cor2" type="color" value="' + (m ? m.cor2 : "#0e7490") + '"></div>' +
    "</div>" +
    '<div class="acoes-linha">' +
    '<button class="btn btn-primario" id="salvar-marca" type="button">Salvar marca</button>' +
    '<button class="btn btn-ghost" id="cancelar-marca" type="button">Cancelar</button>' +
    "</div>";

  document.getElementById("salvar-marca").addEventListener("click", function () {
    var nome = document.getElementById("m-nome").value.trim();
    var categoria = document.getElementById("m-categoria").value;
    if (!nome) {
      mostrarToast("Informe o nome da marca.");
      return;
    }
    var slug = slugificar(nome);
    var dados = {
      slug: slug,
      nome: nome,
      categoria: categoria,
      cor1: document.getElementById("m-cor1").value,
      cor2: document.getElementById("m-cor2").value,
      imagem: document.getElementById("m-img").value.trim()
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
        mostrarToast("Já existe uma marca com esse nome.");
        return;
      }
      estado.marcas.push(dados);
    }
    salvarPainel();
    renderMarcas();
    renderProdutos();
    editor.style.display = "none";
  });

  document.getElementById("cancelar-marca").addEventListener("click", function () {
    editor.style.display = "none";
  });
}

/* ---------- Config ---------- */
function renderConfig() {
  var el = document.getElementById("form-config");
  var efeitos = estado.efeitos || {};
  el.innerHTML =
    '<div class="form-grid">' +
    '<div class="campo"><label>Nome do site</label><input id="c-nome" value="' + (estado.nomeSite || "").replace(/"/g, "&quot;") + '"></div>' +
    '<div class="campo"><label>WhatsApp (com DDI, ex: 5521999990000)</label><input id="c-whats" value="' + (estado.whatsapp || "").replace(/"/g, "&quot;") + '"></div>' +
    '<div class="campo"><label>Mensagem padrão do WhatsApp</label><textarea id="c-texto">' + (estado.whatsappTexto || "").replace(/</g, "&lt;") + "</textarea></div>" +
    "</div>" +
    '<div style="display:flex;gap:18px;flex-wrap:wrap;">' +
    '<label class="campo-check"><input id="c-fumaca" type="checkbox" ' + (efeitos.fumaca !== false ? "checked" : "") + "> Fumaça animada de fundo</label>" +
    '<label class="campo-check"><input id="c-spotlight" type="checkbox" ' + (efeitos.spotlight !== false ? "checked" : "") + "> Spotlight seguindo o mouse</label>" +
    '<label class="campo-check"><input id="c-parallax" type="checkbox" ' + (efeitos.parallax !== false ? "checked" : "") + "> Cena de fundo com parallax</label>" +
    "</div>" +
    '<div class="acoes-linha"><button class="btn btn-primario" id="salvar-config" type="button">Salvar configurações</button></div>';

  document.getElementById("salvar-config").addEventListener("click", function () {
    estado.nomeSite = document.getElementById("c-nome").value.trim() || "Sara Vape";
    estado.whatsapp = document.getElementById("c-whats").value.replace(/\D/g, "");
    estado.whatsappTexto = document.getElementById("c-texto").value;
    estado.efeitos = {
      fumaca: document.getElementById("c-fumaca").checked,
      spotlight: document.getElementById("c-spotlight").checked,
      parallax: document.getElementById("c-parallax").checked
    };
    salvarPainel();
    window.location.reload();
  });
}

/* ---------- Backup ---------- */
function baixarDadosJS() {
  baixarArquivo("dados.js", gerarDadosJS());
  mostrarToast("dados.js gerado. Substitua o arquivo no projeto para publicar.");
}

function exportarJSON() {
  baixarArquivo("sara-vape-dados.json", JSON.stringify(estado, null, 2));
}

function importarJSON(arquivo) {
  var leitor = new FileReader();
  leitor.onload = function () {
    try {
      var dados = JSON.parse(leitor.result);
      if (!dados.marcas || !dados.produtos) throw new Error("formato");
      estado = dados;
      salvarPainel();
      mostrarToast("Dados importados ✓");
      ativarAba("produtos");
      renderProdutos();
      renderMarcas();
      renderConfig();
    } catch (e) {
      mostrarToast("Arquivo inválido. Use um JSON exportado do painel.");
    }
  };
  leitor.readAsText(arquivo);
}

/* ---------- Inicialização ---------- */
function initPainel() {
  var abas = document.querySelectorAll(".aba-btn");
  abas.forEach(function (b) {
    b.addEventListener("click", function () {
      ativarAba(b.dataset.aba);
    });
  });

  document.getElementById("btn-salvar").addEventListener("click", salvarPainel);

  document.getElementById("novo-produto").addEventListener("click", function () {
    abrirFormProduto(null);
  });

  document.getElementById("corpo-produtos").addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.editar) abrirFormProduto(t.dataset.editar);
    if (t.dataset && t.dataset.duplicar) {
      var src = estado.produtos.filter(function (x) { return x.id === t.dataset.duplicar; })[0];
      if (src) {
        var copia = Object.assign({}, src);
        copia.id = uid();
        copia.slug = slugificar(copia.nome) + "-" + uid().slice(-4);
        copia.nome = copia.nome + " (cópia)";
        estado.produtos.push(copia);
        salvarPainel();
        renderProdutos();
      }
    }
    if (t.dataset && t.dataset.excluir) {
      estado.produtos = estado.produtos.filter(function (x) { return x.id !== t.dataset.excluir; });
      salvarPainel();
      renderProdutos();
    }
  });

  document.getElementById("corpo-marcas").addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.editarMarca) abrirFormMarca(t.dataset.editarMarca);
    if (t.dataset && t.dataset.excluirMarca) {
      var slug = t.dataset.excluirMarca;
      estado.marcas = estado.marcas.filter(function (m) { return m.slug !== slug; });
      estado.produtos = estado.produtos.filter(function (p) { return p.marca !== slug; });
      salvarPainel();
      renderMarcas();
      renderProdutos();
    }
  });

  document.getElementById("nova-marca").addEventListener("click", function () {
    abrirFormMarca(null);
  });

  document.getElementById("btn-restaurar").addEventListener("click", function () {
    if (!confirm("Restaurar os dados padrão? As alterações do painel serão perdidas neste navegador.")) return;
    localStorage.removeItem(CHAVE_PAINEL);
    window.location.reload();
  });

  document.getElementById("btn-dados-js").addEventListener("click", baixarDadosJS);
  document.getElementById("btn-exportar").addEventListener("click", exportarJSON);
  document.getElementById("btn-importar").addEventListener("click", function () {
    document.getElementById("input-importar").click();
  });
  document.getElementById("input-importar").addEventListener("change", function () {
    if (this.files && this.files[0]) importarJSON(this.files[0]);
  });

  renderProdutos();
  renderMarcas();
  renderConfig();
}