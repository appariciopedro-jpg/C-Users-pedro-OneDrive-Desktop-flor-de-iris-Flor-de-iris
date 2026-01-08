// Referências globais da página de produtos
const produtosContainer = document.getElementById("produtos");
const produtosVazio = document.getElementById("produtos-vazio");
const countNumberEl = document.getElementById("count-number");

const buscaInput = document.getElementById("filtro-busca");
const minInput = document.getElementById("filtro-min");
const maxInput = document.getElementById("filtro-max");
const ordenarSelect = document.getElementById("filtro-ordenar");
const limparFiltros = document.getElementById("limpar-filtros");
const btnVerCarrinho = document.getElementById("btn-ver-carrinho");

// Helper local para formatar preços (independente do painel/perfil)
function formatPrice(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

let categoriaAtiva = "todos";
let produtos = [];

async function carregarProdutosLoja() {
  try {
    const r = await fetch('/api/produtos', { headers: { Accept: 'application/json' } });
    if (r.ok) {
      const data = await r.json();
      produtos = Array.isArray(data) ? data : [];
      // também salva em localStorage como cache
      try {
        localStorage.setItem('produtos', JSON.stringify(produtos));
      } catch {
        // ignora erro de quota
      }
      return;
    }
  } catch {
    // se API falhar, cai para o localStorage
  }

  try {
    const raw = localStorage.getItem("produtos");
    const parsed = raw ? JSON.parse(raw) : [];
    produtos = Array.isArray(parsed) ? parsed : [];
  } catch {
    produtos = [];
  }
}

function atualizarContagemProdutos(lista) {
  if (countNumberEl) {
    countNumberEl.textContent = String((lista && Array.isArray(lista) ? lista.length : 0));
  }
}

function inicializarCategorias() {
  const categoriaCards = document.querySelectorAll('.categoria-card');
  if (!categoriaCards.length) return;

  categoriaCards.forEach(card => {
    card.addEventListener('click', () => {
      categoriaAtiva = card.getAttribute('data-categoria') || 'todos';

      categoriaCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      aplicaFiltros();
    });
  });

  // Atualizar contagem em cada categoria
  categoriaCards.forEach(card => {
    const cat = card.getAttribute('data-categoria');
    const countSpan = card.querySelector('.categoria-count');
    if (!countSpan) return;

    if (cat === 'todos') {
      countSpan.textContent = produtos.length ? String(produtos.length) : '-';
    } else {
      const total = produtos.filter(p => {
        const tags = String(p.tags || '').toLowerCase();
        const preco = Number(p.preco) || 0;

        if (cat === 'hidratante') return tags.includes('hidratante');
        if (cat === 'esfoliante') return tags.includes('esfoliante');
        if (cat === 'aromatico') return tags.includes('aromático') || tags.includes('aromatico');
        if (cat === 'vegano') return tags.includes('vegano');
        if (cat === 'premium') return preco > 30;
        return true;
      }).length;

      countSpan.textContent = total ? String(total) : '-';
    }
  });
}

function inicializarVisualizacao() {
  if (!produtosContainer) return;
  const toggle = document.querySelector('.view-toggle');
  if (!toggle) return;

  const botoes = toggle.querySelectorAll('.view-btn');
  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view') || 'grid';
      botoes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (view === 'list') {
        produtosContainer.classList.remove('view-grid');
        produtosContainer.classList.add('view-list');
      } else {
        produtosContainer.classList.add('view-grid');
        produtosContainer.classList.remove('view-list');
      }
    });
  });
}

function renderCards(lista) {
  if (!produtosContainer || !produtosVazio) return;

  const dados = Array.isArray(lista) ? lista : [];
  produtosContainer.innerHTML = '';

  if (!dados.length) {
    produtosContainer.style.display = 'none';
    produtosVazio.style.display = 'flex';
    atualizarContagemProdutos(dados);
    return;
  }

  produtosContainer.style.display = 'grid';
  produtosVazio.style.display = 'none';
  atualizarContagemProdutos(dados);

  dados.forEach((p, i) => {
    const precoNumero = Number(p.preco) || 0;

    let badgeHTML = '';
    if (precoNumero <= 15) {
      badgeHTML = '<span class="badge badge-promo">Promoção</span>';
    } else if (i < 3) {
      badgeHTML = '<span class="badge badge-novo">Novo</span>';
    } else if (precoNumero > 30) {
      badgeHTML = '<span class="badge badge-destaque">Premium</span>';
    }

    const tags = (p.tags || '').split(',').filter(t => t.trim());
    const tagsHTML = tags.slice(0, 3).map(tag => 
      `<span class="card-tag">${tag.trim()}</span>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'card produto-card';
    card.style.animation = `fadeInUp 0.5s ease ${i * 0.1}s both`;

    card.innerHTML = `
      ${badgeHTML}
      <div class="card-image">
        <img src="${p.imagem}" alt="${p.nome}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Produto'">
      </div>
      <div class="card-info">
        <h4>${p.nome}</h4>
        <p class="card-descricao">${p.descricao || 'Sabonete artesanal feito com ingredientes naturais'}</p>
        ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
        <span class="preco">${formatPrice(p.preco)}</span>
        <button class="btn-card" data-index="${i}">
          <span class="btn-icon" aria-hidden="true"></span>
          <span>Adicionar ao carrinho</span>
        </button>
      </div>
    `;

    produtosContainer.appendChild(card);

    const btn = card.querySelector('.btn-card');
    btn.onclick = function() {
      let carrinho = [];

      // Lê o carrinho atual com segurança (evita quebrar em alguns navegadores mobile)
      try {
        const raw = localStorage.getItem('carrinho');
        carrinho = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(carrinho)) carrinho = [];
      } catch {
        carrinho = [];
      }

      // Tenta salvar no localStorage; em modo privado de alguns celulares pode falhar
      try {
        carrinho.push(p);
        localStorage.setItem('carrinho', JSON.stringify(carrinho));
      } catch {
        alert('Não foi possível salvar o carrinho neste navegador. Tente sair do modo privado ou usar outro navegador.');
        return;
      }

      btn.classList.add('btn-adicionado');
      btn.innerHTML = `
        <span class="btn-icon" aria-hidden="true"></span>
        <span>Adicionado</span>
      `;

      setTimeout(() => {
        btn.classList.remove('btn-adicionado');
        btn.innerHTML = `
          <span class="btn-icon" aria-hidden="true"></span>
          <span>Adicionar ao carrinho</span>
        `;
      }, 2000);

      if (typeof atualizarCarrinho === 'function') {
        try {
          atualizarCarrinho();
        } catch {
          // ignora erro de contador para não quebrar o clique
        }
      }
    };
  });
}

// Verificar login e carregar produtos no carregamento
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof verificarLoginHeader === 'function') {
    verificarLoginHeader();
  }

  await carregarProdutosLoja();
  inicializarCategorias();
  inicializarVisualizacao();

  renderCards(produtos);
});

function aplicaFiltros() {
  const termo = (buscaInput?.value || "").toLowerCase();
  const min = Number(minInput?.value) || 0;
  const max = Number(maxInput?.value) || Infinity;
  const ordenar = ordenarSelect?.value || "relevancia";

  let lista = produtos.filter((p) => {
    const nome = (p.nome || "").toLowerCase();
    const descricao = (p.descricao || "").toLowerCase();
    const preco = Number(p.preco) || 0;
    const tags = (p.tags || '').toLowerCase();
    
    // Filtro por categoria
    let passaCategoria = true;
    if (categoriaAtiva !== 'todos') {
      if (categoriaAtiva === 'hidratante') {
        passaCategoria = tags.includes('hidratante');
      } else if (categoriaAtiva === 'esfoliante') {
        passaCategoria = tags.includes('esfoliante');
      } else if (categoriaAtiva === 'aromatico') {
        passaCategoria = tags.includes('aromático') || tags.includes('aromatico');
      } else if (categoriaAtiva === 'vegano') {
        passaCategoria = tags.includes('vegano');
      } else if (categoriaAtiva === 'premium') {
        passaCategoria = preco > 30;
      }
    }
    
    const textoBusca = `${nome} ${descricao} ${tags}`;
    const passaBusca = !termo || textoBusca.includes(termo);

    return passaCategoria && passaBusca && preco >= min && preco <= max;
  });

  if (ordenar === "menor") {
    lista.sort((a, b) => (Number(a.preco) || 0) - (Number(b.preco) || 0));
  } else if (ordenar === "maior") {
    lista.sort((a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0));
  } else if (ordenar === "az") {
    lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt"));
  } else if (ordenar === "za") {
    lista.sort((a, b) => (b.nome || "").localeCompare(a.nome || "", "pt"));
  }

  renderCards(lista);
}

// Criar alias para compatibilidade
const aplicarFiltros = aplicaFiltros;

// Event listeners
buscaInput?.addEventListener("input", aplicaFiltros);
minInput?.addEventListener("input", aplicaFiltros);
maxInput?.addEventListener("input", aplicaFiltros);
ordenarSelect?.addEventListener("change", aplicaFiltros);

// Limpar filtros
limparFiltros?.addEventListener("click", () => {
  buscaInput.value = "";
  minInput.value = "";
  maxInput.value = "";
  ordenarSelect.value = "relevancia";
  
  // Resetar categoria
  categoriaAtiva = "todos";
  const categoriaCards = document.querySelectorAll('.categoria-card');
  categoriaCards.forEach(c => c.classList.remove('active'));
  document.querySelector('[data-categoria="todos"]')?.classList.add('active');
  
  aplicaFiltros();
});

// Botão ver carrinho
btnVerCarrinho?.addEventListener("click", () => {
  window.location.href = "carrinho.html";
});

// ========== CALCULADOR DE FRETE ==========
const cepInput = document.getElementById("cep-frete");
const btnCalcularFrete = document.getElementById("btn-calcular-frete");
const freteResultado = document.getElementById("frete-resultado");
const fretePac = document.getElementById("frete-pac");
const freteSedex = document.getElementById("frete-sedex");

// Máscara de CEP
cepInput?.addEventListener("input", (e) => {
  let valor = e.target.value.replace(/\D/g, "");
  if (valor.length > 5) {
    valor = valor.substring(0, 5) + "-" + valor.substring(5, 8);
  }
  e.target.value = valor;
});

// Calcular frete
btnCalcularFrete?.addEventListener("click", () => {
  const cep = cepInput.value.replace(/\D/g, "");
  
  if (cep.length !== 8) {
    alert("Por favor, digite um CEP válido com 8 dígitos!");
    cepInput.focus();
    return;
  }
  
  // Mostrar loading
  btnCalcularFrete.innerHTML = '<span class="loading-spinner"></span>';
  btnCalcularFrete.disabled = true;
  
  // Simular consulta de API (2 segundos)
  setTimeout(() => {
    // Calcular frete baseado nas regiões do Brasil
    const regiao = determinarRegiao(cep);
    const precosPac = {
      sudeste: 12.50,
      sul: 15.80,
      centroOeste: 18.90,
      nordeste: 22.30,
      norte: 28.50
    };
    
    const precosSedex = {
      sudeste: 22.80,
      sul: 28.50,
      centroOeste: 32.90,
      nordeste: 38.70,
      norte: 45.20
    };
    
    const valorPac = precosPac[regiao] || 20.00;
    const valorSedex = precosSedex[regiao] || 35.00;
    
    fretePac.textContent = valorPac.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    freteSedex.textContent = valorSedex.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    
    // Restaurar botão e mostrar resultado
    btnCalcularFrete.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    `;
    btnCalcularFrete.disabled = false;
    
    freteResultado.style.display = "block";
    
    // Animação de entrada
    freteResultado.style.animation = "slideDown 0.3s ease";
    
    // Feedback visual
    cepInput.style.borderColor = "#22c55e";
    setTimeout(() => {
      cepInput.style.borderColor = "";
    }, 2000);
    
  }, 2000);
});

// Determinar região pelo CEP
function determinarRegiao(cep) {
  const prefixo = parseInt(cep.substring(0, 2));
  
  // Sudeste: SP, RJ, MG, ES
  if ((prefixo >= 1 && prefixo <= 19) || // SP
      (prefixo >= 20 && prefixo <= 28) || // RJ
      (prefixo >= 30 && prefixo <= 39) || // MG
      (prefixo >= 29 && prefixo <= 29)) { // ES
    return "sudeste";
  }
  
  // Sul: PR, SC, RS
  if ((prefixo >= 80 && prefixo <= 87) || // PR
      (prefixo >= 88 && prefixo <= 89) || // SC
      (prefixo >= 90 && prefixo <= 99)) { // RS
    return "sul";
  }
  
  // Centro-Oeste: DF, GO, MT, MS
  if ((prefixo >= 70 && prefixo <= 72) || // DF
      (prefixo >= 73 && prefixo <= 76) || // GO
      (prefixo >= 78 && prefixo <= 78) || // MT
      (prefixo >= 79 && prefixo <= 79)) { // MS
    return "centroOeste";
  }
  
  // Nordeste: BA, SE, PE, AL, PB, RN, CE, PI, MA
  if ((prefixo >= 40 && prefixo <= 48) || // BA
      (prefixo >= 49 && prefixo <= 49) || // SE
      (prefixo >= 50 && prefixo <= 56) || // PE
      (prefixo >= 57 && prefixo <= 57) || // AL
      (prefixo >= 58 && prefixo <= 58) || // PB
      (prefixo >= 59 && prefixo <= 59) || // RN
      (prefixo >= 60 && prefixo <= 63) || // CE
      (prefixo >= 64 && prefixo <= 64) || // PI
      (prefixo >= 65 && prefixo <= 65)) { // MA
    return "nordeste";
  }
  
  // Norte: AM, RR, AP, PA, TO, RO, AC
  if ((prefixo >= 69 && prefixo <= 69) || // AM
      (prefixo >= 69 && prefixo <= 69) || // RR
      (prefixo >= 68 && prefixo <= 68) || // AP/AC
      (prefixo >= 66 && prefixo <= 68) || // PA/AM/RR/AP/RO/AC
      (prefixo >= 77 && prefixo <= 77)) { // TO
    return "norte";
  }
  
  return "sudeste"; // Padrão
}

// Inicialização extra via filtros será disparada pelo DOMContentLoaded

