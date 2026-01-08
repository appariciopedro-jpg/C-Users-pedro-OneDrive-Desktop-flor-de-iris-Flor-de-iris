// Página de detalhes de produto
// Carrega um único produto com base em ?pid= e permite comprar direto

(function () {
  let avaliacaoProdutoId = null;

  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function formatPrice(valor) {
    const n = Number(valor) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function criarTagsHTML(produto) {
    const tags = [];
    if (produto.categoria) tags.push(produto.categoria);
    if (Array.isArray(produto.tags)) {
      produto.tags.forEach(t => { if (t) tags.push(t); });
    }
    if (!tags.length) return '';
    return tags.map(t => `<span class="tag">${t}</span>`).join('');
  }

  // Fallback de avaliações em localStorage (para quando a API falhar)
  function lerAvaliacoesLocal(produtoId) {
    try {
      const raw = localStorage.getItem('avaliacoesLocal');
      if (!raw) return [];
      const todas = JSON.parse(raw);
      if (!Array.isArray(todas)) return [];
      return todas.filter(a => String(a.produtoId || '') === String(produtoId || ''));
    } catch {
      return [];
    }
  }

  function salvarAvaliacaoLocal(avaliacao) {
    try {
      const raw = localStorage.getItem('avaliacoesLocal');
      const todas = raw ? JSON.parse(raw) : [];
      const lista = Array.isArray(todas) ? todas : [];
      lista.push(avaliacao);
      localStorage.setItem('avaliacoesLocal', JSON.stringify(lista));
    } catch {
      // se não conseguir salvar, apenas ignora
    }
  }

  function formatStars(nota) {
    const n = Math.round(Number(nota) || 0);
    const filled = '★'.repeat(Math.max(0, Math.min(5, n)));
    const empty = '☆'.repeat(5 - filled.length);
    return filled + empty;
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return '';
    }
  }

  async function carregarProdutosFonte() {
    // Tenta reaproveitar produtos do localStorage (caso já tenham sido carregados em produtos.js)
    try {
      const cache = localStorage.getItem('produtosLoja');
      if (cache) {
        const lista = JSON.parse(cache);
        if (Array.isArray(lista) && lista.length) return lista;
      }
    } catch (e) {
      console.warn('Não foi possível ler produtos do cache:', e);
    }

    // Fallback: buscar da API
    try {
      const resp = await fetch('/api/produtos');
      if (!resp.ok) throw new Error('Falha ao carregar produtos');
      const dados = await resp.json();
      if (Array.isArray(dados)) {
        try {
          localStorage.setItem('produtosLoja', JSON.stringify(dados));
        } catch {}
        return dados;
      }
      return [];
    } catch (e) {
      console.error('Erro ao buscar produtos da API:', e);
      return [];
    }
  }

  function encontrarProduto(lista, pid) {
    if (!pid) return null;
    // Primeiro tenta por id exato
    let produto = lista.find(p => String(p.id) === pid);
    if (produto) return produto;
    // Depois tenta por nome (caso antigo: usamos nome como pid)
    produto = lista.find(p => (p.nome || '').toLowerCase() === decodeURIComponent(pid).toLowerCase());
    return produto || null;
  }

  function preencherDetalhes(produto) {
    const elWrapper = document.getElementById('produto-detalhe');
    const elEmpty = document.getElementById('produto-detalhe-nao-encontrado');
    if (!produto) {
      if (elWrapper) elWrapper.style.display = 'none';
      if (elEmpty) elEmpty.style.display = 'block';
      return;
    }

    if (elEmpty) elEmpty.style.display = 'none';
    if (elWrapper) elWrapper.style.display = 'grid';

    const img = document.getElementById('det-produto-imagem');
    const nome = document.getElementById('det-produto-nome');
    const desc = document.getElementById('det-produto-descricao');
    const preco = document.getElementById('det-produto-preco');
    const tags = document.getElementById('det-produto-tags');

    if (img) {
      img.src = produto.imagem || 'https://via.placeholder.com/600x600/ff6b6b/ffffff?text=Produto';
      img.alt = produto.nome || 'Produto';
      img.onerror = function () {
        this.onerror = null;
        this.src = 'https://via.placeholder.com/600x600/ff6b6b/ffffff?text=Produto';
      };
    }
    if (nome) nome.textContent = produto.nome || 'Produto';
    if (desc) desc.textContent = produto.descricao || 'Produto artesanal exclusivo da Flor de Íris.';
    if (preco) preco.textContent = formatPrice(produto.preco);
    if (tags) tags.innerHTML = criarTagsHTML(produto);

    const btnCompreJa = document.getElementById('det-btn-compre-ja');
    if (btnCompreJa) {
      btnCompreJa.onclick = function () {
        const precoNumber = Number(produto.preco) || 0;
        const item = {
          id: produto.id || produto.nome,
          nome: produto.nome,
          preco: precoNumber,
          quantidade: 1,
          imagem: produto.imagem
        };

        const dadosPagamento = {
          itens: [item],
          subtotal: precoNumber,
          desconto: 0,
          frete: 0,
          total: precoNumber,
          cupom: null,
          observacao: ''
        };

        try {
          sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));
        } catch {
          alert('Não foi possível preparar o pagamento neste navegador. Tente sair do modo privado ou usar outro navegador.');
          return;
        }

        window.location.href = 'pagamento.html';
      };
    }

    const btnAddCarrinho = document.getElementById('det-btn-adicionar-carrinho');
    if (btnAddCarrinho) {
      btnAddCarrinho.onclick = function () {
        const item = {
          id: produto.id || produto.nome,
          nome: produto.nome,
          preco: Number(produto.preco) || 0,
          imagem: produto.imagem
        };

        try {
          const atual = localStorage.getItem('carrinho');
          const lista = atual ? JSON.parse(atual) : [];
          if (Array.isArray(lista)) {
            lista.push(item);
            localStorage.setItem('carrinho', JSON.stringify(lista));
          } else {
            localStorage.setItem('carrinho', JSON.stringify([item]));
          }
        } catch {
          alert('Não foi possível salvar no carrinho neste navegador. Tente sair do modo privado ou usar outro navegador.');
          return;
        }

        try {
          const headerCount = document.getElementById('carrinho-count-header');
          if (headerCount) {
            const atual = localStorage.getItem('carrinho');
            const lista = atual ? JSON.parse(atual) : [];
            headerCount.textContent = String(Array.isArray(lista) ? lista.length : 0);
          }
        } catch {
          // ignora erro de contador
        }

        alert('Produto adicionado ao carrinho com sucesso!');
      };
    }

    // Inicializa área de avaliações para este produto
    avaliacaoProdutoId = String(produto.id || produto.nome || '').trim();
    if (avaliacaoProdutoId) {
      carregarAvaliacoes(avaliacaoProdutoId);
      inicializarFormularioAvaliacoes(avaliacaoProdutoId);
    }
  }

  async function carregarAvaliacoes(produtoId) {
    try {
      const resp = await fetch(`/api/avaliacoes?produtoId=${encodeURIComponent(produtoId)}`);
      if (!resp.ok) throw new Error('Falha ao carregar avaliações');
      const lista = await resp.json();
      const doServidor = Array.isArray(lista) ? lista : [];
      const locais = lerAvaliacoesLocal(produtoId);
      // Junta comentários do servidor + locais (caso exista fallback offline)
      renderAvaliacoes([...doServidor, ...locais]);
    } catch (e) {
      console.error('Erro ao carregar avaliações:', e.message || e);
      // se API falhar, tenta mostrar pelo menos as locais
      const locais = lerAvaliacoesLocal(produtoId);
      renderAvaliacoes(locais);
    }
  }

  function renderAvaliacoes(lista) {
    const mediaEl = document.getElementById('avaliacoes-media');
    const estrelasEl = document.getElementById('avaliacoes-estrelas');
    const contagemEl = document.getElementById('avaliacoes-contagem');
    const listaEl = document.getElementById('avaliacoes-lista');

    if (!mediaEl || !estrelasEl || !contagemEl || !listaEl) return;

    if (!lista.length) {
      mediaEl.textContent = '-';
      estrelasEl.textContent = '★★★★★';
      contagemEl.textContent = 'Nenhum comentário ainda';
      listaEl.innerHTML = '';
      return;
    }

    const soma = lista.reduce((acc, a) => acc + (Number(a.nota) || 0), 0);
    const media = soma / lista.length;

    mediaEl.textContent = media.toFixed(1).replace('.', ',');
    estrelasEl.textContent = formatStars(media);
    contagemEl.textContent = `${lista.length} comentário${lista.length > 1 ? 's' : ''}`;

    listaEl.innerHTML = '';
    lista
      .sort((a, b) => (b.criadoEm || 0).localeCompare(a.criadoEm || 0))
      .forEach(a => {
        const item = document.createElement('div');
        item.className = 'avaliacao-item';
        item.innerHTML = `
          <div class="avaliacao-top">
            <strong class="avaliacao-nome">${(a.nome || 'Cliente Flor de Íris')}</strong>
            <span class="avaliacao-nota">${formatStars(a.nota)}</span>
          </div>
          <p class="avaliacao-comentario">${(a.comentario || '').replace(/</g, '&lt;')}</p>
          <span class="avaliacao-data">${formatDateBR(a.criadoEm)}</span>
        `;
        listaEl.appendChild(item);
      });
  }

  function inicializarFormularioAvaliacoes(produtoId) {
    const form = document.getElementById('avaliacao-form');
    const nomeEl = document.getElementById('avaliacao-nome');
    const notaEl = document.getElementById('avaliacao-nota');
    const comentarioEl = document.getElementById('avaliacao-comentario');
    const msgEl = document.getElementById('avaliacao-mensagem');
    if (!form || !notaEl || !comentarioEl) return;

    form.onsubmit = async function (e) {
      e.preventDefault();
      if (msgEl) msgEl.textContent = '';

      const nome = (nomeEl?.value || '').trim();
      const nota = Number(notaEl.value || 0);
      const comentario = (comentarioEl.value || '').trim();

      if (!nota || nota < 1 || nota > 5) {
        if (msgEl) msgEl.textContent = 'Escolha uma nota de 1 a 5.';
        return;
      }
      if (!comentario) {
        if (msgEl) msgEl.textContent = 'Escreva um comentário sobre o produto.';
        return;
      }

      try {
        const resp = await fetch('/api/avaliacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produtoId,
            nome,
            nota,
            comentario
          })
        });

        if (!resp.ok) {
          let msg = 'Falha ao enviar sua avaliação. Tente novamente.';
          try {
            const data = await resp.json();
            if (data && data.error) msg = data.error;
          } catch {
            // ignora erro ao ler corpo
          }
          throw new Error(msg);
        }

        if (msgEl) msgEl.textContent = 'Obrigado! Seu comentário foi enviado.';
        if (comentarioEl) comentarioEl.value = '';
        if (notaEl) notaEl.value = '';

        carregarAvaliacoes(produtoId);
      } catch (err) {
        console.error('Erro ao enviar avaliação:', err.message || err);
        // Fallback: salva localmente para não perder o comentário
        const agora = new Date().toISOString();
        const avaliacaoLocal = {
          id: 'local-' + Date.now(),
          produtoId,
          nome: nome || 'Cliente Flor de Íris',
          comentario,
          nota,
          criadoEm: agora,
          local: true
        };
        salvarAvaliacaoLocal(avaliacaoLocal);

        if (msgEl) {
          msgEl.textContent = 'Seu comentário foi salvo neste aparelho. Se o servidor estiver fora do ar, ele será visível aqui mesmo assim.';
        }

        // Atualiza lista usando localStorage
        const locais = lerAvaliacoesLocal(produtoId);
        renderAvaliacoes(locais);
      }
    };
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const pid = getParam('pid');
    const lista = await carregarProdutosFonte();
    const produto = encontrarProduto(lista, pid);
    preencherDetalhes(produto);
  });
})();
