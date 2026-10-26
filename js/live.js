/* Lê o catálogo da nuvem (api/catalogo) e, se estiver mais novo que o dados.js,
   guarda em cache de sessão e recarrega a página uma vez para mostrar os dados atuais.
   Rodada junto com main.js, que prioriza o cache (sv_cat_cache) ao montar o site. */
(function () {
  function ehValido(c) {
    return c && Array.isArray(c.marcas) && Array.isArray(c.produtos);
  }
  function texto(c) {
    return (c.atualizadoEm || "") + "|" + c.marcas.length + "m" + c.produtos.length + "p";
  }
  fetch("api/catalogo")
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var c = j && j.ok ? j.catalogo : null;
      if (!ehValido(c)) return;
      var t = texto(c);
      try { sessionStorage.setItem("sv_cat_cache", JSON.stringify(c)); } catch (e) {}
      var base = BANCO_DADOS && ehValido(BANCO_DADOS) ? BANCO_DADOS : null;
      var jaTem = base && texto(base) === t;
      if (jaTem) {
        try { sessionStorage.setItem("sv_cat_aceite", t); } catch (e) {}
        return;
      }
      var aceite = null;
      try { aceite = sessionStorage.getItem("sv_cat_aceite"); } catch (e) {}
      if (aceite === t) return;
      try { sessionStorage.setItem("sv_cat_aceite", t); } catch (e) {}
      window.location.reload();
    })
    .catch(function () {});
})();