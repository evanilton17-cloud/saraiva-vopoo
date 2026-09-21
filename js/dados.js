var BANCO_DADOS = {
  whatsapp: "5521999990000",
  whatsappTexto: "Olá! 👋 Gostaria de mais informações sobre os produtos.",
  nomeSite: "Saraiva Vapor",
  nomeMarca: "SARAIVA VAPOR",
  tagline: "Pods Premium",
  efeitos: {
    fumaca: true,
    spotlight: true,
    parallax: true
  },
  marcas: [
    { slug: "ignite", nome: "Ignite", categoria: "Pods", cor1: "#22d3ee", cor2: "#0e7490", imagem: "img/brand-ignite.jpg" },
    { slug: "elfbar-duke", nome: "ElfBar Duke", categoria: "Pods", cor1: "#a855f7", cor2: "#7e22ce", imagem: "img/brand-elfbar-duke.jpg" },
    { slug: "essencia-zgy", nome: "Essência Zgy", categoria: "Essências", cor1: "#fbbf24", cor2: "#b45309", imagem: "img/brand-essencia-zgy.jpg" },
    { slug: "life-pod-10k-kite", nome: "LIFE POD 10K KITE", categoria: "Pods", cor1: "#3b82f6", cor2: "#1e3a8a", imagem: "img/brand-life-pod-10k-kite.jpg" },
    { slug: "life-pod-refil-10k", nome: "Life Pod Refil 10K", categoria: "Refis", cor1: "#f43f5e", cor2: "#9f1239", imagem: "img/brand-life-pod-refil-10k.jpg" },
    { slug: "seda-zomo", nome: "Seda Zomo", categoria: "Acessórios", cor1: "#94a3b8", cor2: "#334155", imagem: "img/brand-seda-zomo.jpg" },
    { slug: "seda-zomo-com-piteira", nome: "SEDA ZOMO COM PITEIRA", categoria: "Acessórios", cor1: "#cbd5e1", cor2: "#475569", imagem: "img/brand-seda-zomo-com-piteira.jpg" },
    { slug: "the-black-sheep-30k", nome: "THE BLACK SHEEP 30K", categoria: "Pods", cor1: "#10b981", cor2: "#065f46", imagem: "img/brand-the-black-sheep-30k.jpg" }
  ],
  produtos: [
    {
      id: "p-ignite-v80",
      slug: "ignite-v80",
      nome: "Ignite V80",
      marca: "ignite",
      cor1: "#22d3ee",
      cor2: "#0e7490",
      imagem: "img/brand-ignite.jpg",
      preco: 125,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Uva", estoque: true },
        { nome: "Menta", estoque: true },
        { nome: "Blueberry", estoque: true },
        { nome: "Morango", estoque: true }
      ]
    },
    {
      id: "p-ignite-v50",
      slug: "ignite-v50",
      nome: "Ignite V50",
      marca: "ignite",
      cor1: "#22d3ee",
      cor2: "#0e7490",
      imagem: "img/brand-ignite.jpg",
      preco: 125,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Melancia", estoque: true },
        { nome: "Ice Mint", estoque: true },
        { nome: "Pêssego", estoque: true }
      ]
    },
    {
      id: "p-ignite-v150",
      slug: "ignite-v150",
      nome: "Ignite V150",
      marca: "ignite",
      cor1: "#22d3ee",
      cor2: "#0e7490",
      imagem: "img/brand-ignite.jpg",
      preco: 135,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Manga", estoque: true },
        { nome: "Cereja", estoque: true },
        { nome: "Café", estoque: true }
      ]
    },
    {
      id: "p-elfbar-duke",
      slug: "elfbar-duke",
      nome: "ElfBar Duke",
      marca: "elfbar-duke",
      cor1: "#a855f7",
      cor2: "#7e22ce",
      imagem: "img/brand-elfbar-duke.jpg",
      preco: 145,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Morango Kiwi", estoque: true },
        { nome: "Blue Razz", estoque: true },
        { nome: "Menta Gelada", estoque: true }
      ]
    },
    {
      id: "p-essencia-zgy-30ml",
      slug: "essencia-zgy-30ml",
      nome: "Essência Zgy 30ml",
      marca: "essencia-zgy",
      cor1: "#fbbf24",
      cor2: "#b45309",
      imagem: "img/brand-essencia-zgy.jpg",
      preco: 15,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Essência"],
        ["Conteúdo", "30 ml"],
        ["Uso", "Para refil recarregável"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Uva", estoque: true },
        { nome: "Menta", estoque: true },
        { nome: "Tabaco", estoque: true },
        { nome: "Morango", estoque: true },
        { nome: "Melancia", estoque: true }
      ]
    },
    {
      id: "p-life-pod-10k-kite",
      slug: "life-pod-10k-kite",
      nome: "LIFE POD 10K KITE",
      marca: "life-pod-10k-kite",
      cor1: "#3b82f6",
      cor2: "#1e3a8a",
      imagem: "img/brand-life-pod-10k-kite.jpg",
      preco: 145,
      precoPromo: null,
      puffs: 10000,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Puffs", "10.000"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Blueberry Ice", estoque: true },
        { nome: "Manga", estoque: true },
        { nome: "Melancia", estoque: true }
      ]
    },
    {
      id: "p-life-pod-refil-10k",
      slug: "life-pod-refil-10k",
      nome: "Life Pod Refil 10K",
      marca: "life-pod-refil-10k",
      cor1: "#f43f5e",
      cor2: "#9f1239",
      imagem: "img/brand-life-pod-refil-10k.jpg",
      preco: 115,
      precoPromo: null,
      puffs: 10000,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Refil"],
        ["Puffs", "10.000"],
        ["Uso", "Para dispositivo recarregável"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Uva", estoque: true },
        { nome: "Menta", estoque: true },
        { nome: "Morango", estoque: true },
        { nome: "Melancia", estoque: true },
        { nome: "Pêssego", estoque: true },
        { nome: "Blueberry", estoque: true },
        { nome: "Kiwi", estoque: true },
        { nome: "Café", estoque: true }
      ]
    },
    {
      id: "p-seda-zomo",
      slug: "seda-zomo",
      nome: "Seda Zomo",
      marca: "seda-zomo",
      cor1: "#94a3b8",
      cor2: "#334155",
      imagem: "img/brand-seda-zomo.jpg",
      preco: 3,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Acessório"],
        ["Uso", "Seda para uso adulto"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Natural", estoque: true }
      ]
    },
    {
      id: "p-seda-zomo-com-piteira",
      slug: "seda-zomo-com-piteira",
      nome: "Seda Zomo com Piteira",
      marca: "seda-zomo-com-piteira",
      cor1: "#cbd5e1",
      cor2: "#475569",
      imagem: "img/brand-seda-zomo-com-piteira.jpg",
      preco: 7,
      precoPromo: null,
      puffs: null,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Acessório"],
        ["Uso", "Seda com piteira para uso adulto"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Natural", estoque: true }
      ]
    },
    {
      id: "p-the-black-sheep-30k",
      slug: "the-black-sheep-30k",
      nome: "THE BLACK SHEEP 30K",
      marca: "the-black-sheep-30k",
      cor1: "#10b981",
      cor2: "#065f46",
      imagem: "img/brand-the-black-sheep-30k.jpg",
      preco: 150,
      precoPromo: null,
      puffs: 30000,
      novidade: false,
      estoque: true,
      specs: [
        ["Tipo", "Pods descartáveis"],
        ["Puffs", "30.000"],
        ["Uso", "Uso único"],
        ["Venda", "18+"]
      ],
      sabores: [
        { nome: "Uva Ice", estoque: true },
        { nome: "Mango", estoque: true },
        { nome: "Mint", estoque: true }
      ]
    }
  ]
};