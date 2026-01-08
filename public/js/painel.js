// Painel Admin - Flor de Íris
// Dados: localStorage | Sessão admin: sessionStorage

// ===================
// Notificação visual para admin
// ===================
function mostrarNotificacaoAdmin(mensagem, tipo = 'info') {
  const notifAnterior = document.querySelector('.notificacao-admin');
  if (notifAnterior) notifAnterior.remove();

  const notif = document.createElement('div');
  notif.className = `notificacao notificacao-admin notificacao-${tipo}`;
  const icones = { success: '✓', error: '✕', warning: '!', info: 'i' };
  notif.innerHTML = `
      <span class="notificacao-icone">${icones[tipo] || 'i'}</span>
      <span class="notificacao-mensagem">${mensagem}</span>
    `;
  document.body.appendChild(notif);

  setTimeout(() => notif.classList.add('notificacao-show'), 10);
  setTimeout(() => {
    notif.classList.remove('notificacao-show');
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

// ===================
// Util
// ===================
function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function getPedidosServerOnly() {
  const server = await fetchJSON('/api/pedidos');
  return Array.isArray(server) ? server : null;
}

async function getPedidosPreferServer() {
  const server = await fetchJSON('/api/pedidos');
  if (Array.isArray(server)) return server;
  return getJSON('pedidos', []);
}

async function getProdutosServerOnly() {
  const server = await fetchJSON('/api/produtos');
  return Array.isArray(server) ? server : null;
}

async function getProdutosPreferServer() {
  const server = await getProdutosServerOnly();
  if (Array.isArray(server)) return server;
  return getJSON('produtos', []);
}

// ===================
// Helpers globais (formatação, sanitização, etc.)
// ===================
function formatPrice(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function sanitize(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto ?? '');
  return div.innerHTML;
}

function registrarAtividade(tipo, acao, descricao) {
  try {
    const atividades = getJSON('atividades', []);
    atividades.unshift({
      tipo: String(tipo || 'geral'),
      acao: String(acao || ''),
      descricao: String(descricao || ''),
      tempo: new Date().toLocaleString('pt-BR')
    });
    setJSON('atividades', atividades.slice(0, 100));
  } catch {
    // silencioso
  }
}

function getComprovanteSrc(pedido) {
  if (!pedido) return null;
  if (pedido.comprovante && typeof pedido.comprovante === 'string') return pedido.comprovante;
  if (pedido.comprovanteUrl && typeof pedido.comprovanteUrl === 'string') return pedido.comprovanteUrl;
  if (pedido.comprovantePath && typeof pedido.comprovantePath === 'string') return pedido.comprovantePath;
  return null;
}

function isPdfSrc(src) {
  const s = String(src || '').toLowerCase();
  return s.endsWith('.pdf') || s.startsWith('data:application/pdf');
}

async function findPedidoPreferServerById(id) {
  const todos = await getPedidosPreferServer();
  const idx = todos.findIndex(p => String(p.id || p.codigo || '') === String(id));
  return {
    pedidos: todos,
    index: idx,
    pedido: idx >= 0 ? todos[idx] : null
  };
}

// ===================
// Autenticação admin
// ===================
function verificarAutenticacao() {
  const logado = sessionStorage.getItem('admin-logado') === 'true';
  const token = sessionStorage.getItem('admin-token');
  const loginTime = Number(sessionStorage.getItem('admin-login-time') || '0');
  const MAX_SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 horas

  if (!logado || !token || !loginTime) {
    try {
      mostrarNotificacaoAdmin('Faça login para acessar o painel.', 'warning');
    } catch {
      alert('Faça login para acessar o painel.');
    }
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 100);
    return false;
  }

  if (Date.now() - loginTime > MAX_SESSION_DURATION) {
    try {
      mostrarNotificacaoAdmin('Sua sessão expirou. Faça login novamente.', 'warning');
    } catch {
      alert('Sua sessão expirou. Faça login novamente.');
    }
    sessionStorage.clear();
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 100);
    return false;
  }

  return true;
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'admin.html';
}

function marcarAtividadeAdmin() {
  sessionStorage.setItem('admin-last-activity', String(Date.now()));
}

function iniciarMonitorInatividade() {
  marcarAtividadeAdmin();
  document.addEventListener('click', marcarAtividadeAdmin);
  document.addEventListener('keypress', marcarAtividadeAdmin);

  setInterval(() => {
    const lastActivity = Number(sessionStorage.getItem('admin-last-activity') || '0');
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30min
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
      alert('Sessão encerrada por inatividade.');
      sessionStorage.clear();
      window.location.href = 'admin.html';
    }
  }, 60000);
}

// Expor logout/verificarAutenticacao globalmente (painel.html usa onclick)
window.logout = logout;
window.verificarAutenticacao = verificarAutenticacao;

  // ===================
  // Tabs
  // ===================
  function mudarAba(eventOrAba, abaMaybe) {
    const evt = typeof eventOrAba === 'string' ? null : eventOrAba;
    const aba = typeof eventOrAba === 'string' ? eventOrAba : abaMaybe;
    if (!aba) return;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.aba-conteudo').forEach(pane => pane.classList.remove('active'));

    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('active');
    } else {
      const btn = document.querySelector(`.tab-btn[onclick*="'${aba}'"]`);
      if (btn) btn.classList.add('active');
    }

    const pane = document.getElementById(`aba-${aba}`);
    if (pane) pane.classList.add('active');

    if (aba === 'dashboard') atualizarDashboard();
    if (aba === 'produtos') renderProdutosAdmin();
    if (aba === 'pedidos') carregarPedidos();
    if (aba === 'comprovantes') carregarComprovantes();
    if (aba === 'clientes') atualizarListaUsuarios();
    if (aba === 'relatorios') carregarRelatorios();
    if (aba === 'config') carregarConfiguracoes();
  }

  window.mudarAba = mudarAba;

  // ===================
  // Dashboard
  // ===================
  async function atualizarStats() {
    const produtos = await getProdutosPreferServer();
    const pedidos = await getPedidosPreferServer();

    // Notificação de novo pedido
    let lastPedidosCount = Number(sessionStorage.getItem('lastPedidosCount') || 0);
    if (pedidos.length > lastPedidosCount) {
      mostrarNotificacaoAdmin('Novo pedido recebido!', 'success');
    }
    sessionStorage.setItem('lastPedidosCount', pedidos.length);
    const usuarios = getJSON('usuarios', []);
    const carrinho = getJSON('carrinho', []);

    const totalProdutosEl = document.getElementById('total-produtos');
    const precoMedioEl = document.getElementById('preco-medio');
    const itensCarrinhoEl = document.getElementById('itens-carrinho');
    const totalClientesEl = document.getElementById('total-clientes');
    const visitasHojeEl = document.getElementById('visitas-hoje');
    const pedidosConcluidosEl = document.getElementById('pedidos-concluidos');

    if (totalProdutosEl) totalProdutosEl.textContent = String(produtos.length);

    const media = produtos.length
      ? produtos.reduce((acc, p) => acc + Number(p.preco || 0), 0) / produtos.length
      : 0;
    if (precoMedioEl) precoMedioEl.textContent = formatPrice(media);

    const itens = Array.isArray(carrinho)
      ? carrinho.reduce((acc, i) => acc + Number(i.quantidade || 0), 0)
      : 0;
    if (itensCarrinhoEl) itensCarrinhoEl.textContent = String(itens);

    if (totalClientesEl) totalClientesEl.textContent = String(usuarios.length);

    const visitasHoje = Number(localStorage.getItem('visitasHoje') || '0');
    if (visitasHojeEl) visitasHojeEl.textContent = String(visitasHoje);

    const concluidos = pedidos.filter(p => String(p.status || '').toLowerCase().includes('concl'));
    if (pedidosConcluidosEl) pedidosConcluidosEl.textContent = String(concluidos.length);

    // Resumo rápido do dia (home do painel)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pedidosHoje = pedidos.filter(p => {
      const ts = typeof p.timestamp === 'number' ? p.timestamp : Date.parse(p.timestamp);
      if (!ts || Number.isNaN(ts)) return false;
      return ts >= hoje.getTime();
    });

    const pendentesHoje = pedidosHoje.filter(p =>
      String(p.status || '').toLowerCase().includes('aguard')
    ).length;

    const pagosHoje = pedidosHoje.filter(p =>
      String(p.status || '').toLowerCase().includes('pago')
    );

    const faturamentoHoje = pagosHoje.reduce((acc, p) => acc + Number(p.total || 0), 0);

    const pedidosHojeEl = document.getElementById('dashboard-pedidos-hoje');
    const pendentesHojeEl = document.getElementById('dashboard-pendentes-hoje');
    const faturamentoHojeEl = document.getElementById('dashboard-faturamento-hoje');

    if (pedidosHojeEl) pedidosHojeEl.textContent = String(pedidosHoje.length);
    if (pendentesHojeEl) pendentesHojeEl.textContent = String(pendentesHoje);
    if (faturamentoHojeEl) faturamentoHojeEl.textContent = formatPrice(faturamentoHoje);
  }

  async function carregarTopProdutos() {
    const container = document.getElementById('top-produtos');
    if (!container) return;

    const produtos = await getProdutosPreferServer();
    if (!produtos.length) {
      container.innerHTML = '<p class="texto-vazio">Nenhum produto cadastrado ainda.</p>';
      return;
    }

    container.innerHTML = produtos.slice(0, 5).map((p, i) => {
      const nome = sanitize(p.nome || 'Produto');
      const preco = formatPrice(p.preco);
      const imagem = p.imagem || '';
      return `
        <div class="top-produto-item">
          <span class="posicao">#${i + 1}</span>
          <img src="${imagem}" alt="${nome}">
          <div class="info">
            <h4>${nome}</h4>
            <p>${preco}</p>
          </div>
          <div class="badge">Popular</div>
        </div>
      `;
    }).join('');
  }

  function carregarAtividades() {
    const container = document.getElementById('atividades');
    if (!container) return;

    const atividades = getJSON('atividades', []);
    if (!atividades.length) {
      container.innerHTML = `
        <div class="atividade-item">
          <div class="atividade-icon config"></div>
          <div class="atividade-info">
            <h4>Painel iniciado</h4>
            <p>Sistema pronto para uso</p>
          </div>
          <span class="atividade-tempo">Agora</span>
        </div>
      `;
      return;
    }

    container.innerHTML = atividades.slice(0, 10).map(a => {
      const icon = '•';
      return `
        <div class="atividade-item">
          <div class="atividade-icon ${sanitize(a.tipo || '')}">${icon}</div>
          <div class="atividade-info">
            <h4>${sanitize(a.acao || '')}</h4>
            <p>${sanitize(a.descricao || '')}</p>
          </div>
          <span class="atividade-tempo">${sanitize(a.tempo || '')}</span>
        </div>
      `;
    }).join('');
  }

  function atualizarDashboard() {
    atualizarStats();
    carregarTopProdutos();
    carregarAtividades();
  }

  window.atualizarDashboard = atualizarDashboard;

  // ===================
  // Produtos
  // ===================
  let imagemPreviewDataUrl = null;
  let produtoEditIndex = null;

  function setProdutoFormStatus(text, kind) {
    const el = document.getElementById('produto-form-status');
    if (!el) return;

    el.textContent = text || '';
    el.classList.remove('is-error', 'is-success');
    if (kind === 'error') el.classList.add('is-error');
    if (kind === 'success') el.classList.add('is-success');
  }

  function markFieldError(el, on) {
    if (!el) return;
    el.classList.toggle('field-error', Boolean(on));
  }

  function clearProdutoFormErrors() {
    markFieldError(document.getElementById('nome'), false);
    markFieldError(document.getElementById('preco'), false);
    markFieldError(document.getElementById('imagem-url'), false);
  }

  function setProdutoFormMode(mode, produto) {
    const tituloEl = document.getElementById('produto-form-titulo');
    const btnTextoEl = document.getElementById('btn-salvar-produto-texto');
    const btnCancelar = document.getElementById('btn-cancelar-edicao');

    if (mode === 'edit') {
      if (tituloEl) tituloEl.textContent = 'Editar Produto';
      if (btnTextoEl) btnTextoEl.textContent = 'Salvar alterações';
      if (btnCancelar) btnCancelar.style.display = 'inline-flex';
      setProdutoFormStatus(produto?.nome ? `Editando: ${produto.nome}` : 'Editando produto');
    } else {
      if (tituloEl) tituloEl.textContent = 'Adicionar Novo Produto';
      if (btnTextoEl) btnTextoEl.textContent = 'Adicionar Produto';
      if (btnCancelar) btnCancelar.style.display = 'none';
      setProdutoFormStatus('');
    }
  }

  function parsePrecoInputToNumber(raw) {
    const s = String(raw || '').trim();
    if (!s) return NaN;
    const normalized = s
      .replace(/\s+/g, '')
      .replace(/^R\$\s*/i, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return Number(normalized);
  }

  function limparFormularioProduto() {
    const nomeEl = document.getElementById('nome');
    const precoEl = document.getElementById('preco');
    const descricaoEl = document.getElementById('descricao');
    const categoriaEl = document.getElementById('categoria');
    const estoqueEl = document.getElementById('estoque');
    const tagsEl = document.getElementById('tags');
    const imgEl = document.getElementById('imagem');
    const imgUrlEl = document.getElementById('imagem-url');

    if (nomeEl) nomeEl.value = '';
    if (precoEl) precoEl.value = '';
    if (descricaoEl) descricaoEl.value = '';
    if (categoriaEl) categoriaEl.value = '';
    if (estoqueEl) estoqueEl.value = '';
    if (tagsEl) tagsEl.value = '';
    if (imgEl) imgEl.value = '';
    if (imgUrlEl) imgUrlEl.value = '';

    const fileNameEl = document.getElementById('file-name');
    if (fileNameEl) fileNameEl.textContent = 'Escolher imagem';
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const previewImg = document.getElementById('preview-img');
    if (previewImg) previewImg.removeAttribute('src');

    imagemPreviewDataUrl = null;
    produtoEditIndex = null;
    setProdutoFormMode('create');
    clearProdutoFormErrors();
  }

  function cancelarEdicaoProduto() {
    limparFormularioProduto();
  }

  function previewImagem(event) {
    const file = event?.target?.files?.[0];
    const fileNameEl = document.getElementById('file-name');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    const imgUrlEl = document.getElementById('imagem-url');

    imagemPreviewDataUrl = null;

    if (!file) {
      if (fileNameEl) fileNameEl.textContent = 'Escolher imagem';
      if (previewContainer) previewContainer.style.display = 'none';
      return;
    }

    // Se escolheu arquivo, limpa URL para evitar ambiguidade
    if (imgUrlEl) imgUrlEl.value = '';

    if (fileNameEl) fileNameEl.textContent = file.name;

    const reader = new FileReader();
    reader.onload = e => {
      imagemPreviewDataUrl = String(e.target?.result || '');
      if (previewImg) previewImg.src = imagemPreviewDataUrl;
      if (previewContainer) previewContainer.style.display = 'block';
      setProdutoFormStatus('Imagem carregada. Revise e salve o produto.');
      markFieldError(imgUrlEl, false);
    };
    reader.readAsDataURL(file);
  }

  function previewImagemUrl() {
    const imgUrlEl = document.getElementById('imagem-url');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    const fileNameEl = document.getElementById('file-name');
    const imgEl = document.getElementById('imagem');

    const url = String(imgUrlEl?.value || '').trim();
    if (!url) {
      // Não apaga a preview de arquivo aqui; só esconde se não tiver imagem setada
      if (!imagemPreviewDataUrl) {
        if (previewContainer) previewContainer.style.display = 'none';
      }
      markFieldError(imgUrlEl, false);
      return;
    }

    // Se digitou URL, limpa arquivo
    if (imgEl) imgEl.value = '';
    if (fileNameEl) fileNameEl.textContent = 'Escolher imagem';

    imagemPreviewDataUrl = url;
    if (previewImg) previewImg.src = url;
    if (previewContainer) previewContainer.style.display = 'block';
    setProdutoFormStatus('URL da imagem definida. Revise e salve o produto.');
    markFieldError(imgUrlEl, false);
  }

  function salvarProduto() {
    clearProdutoFormErrors();
    setProdutoFormStatus('');

    const nome = (document.getElementById('nome')?.value || '').trim();
    const preco = parsePrecoInputToNumber(document.getElementById('preco')?.value);
    const descricao = (document.getElementById('descricao')?.value || '').trim();
    const categoria = (document.getElementById('categoria')?.value || '').trim();
    const estoqueRaw = document.getElementById('estoque')?.value;
    const tagsRaw = (document.getElementById('tags')?.value || '').trim();
    const estoque = estoqueRaw === '' || estoqueRaw === null || typeof estoqueRaw === 'undefined'
      ? null
      : Number(estoqueRaw);

    if (!nome) {
      markFieldError(document.getElementById('nome'), true);
      setProdutoFormStatus('Informe o nome do produto.', 'error');
      document.getElementById('nome')?.focus();
      return;
    }

    if (!Number.isFinite(preco) || preco <= 0) {
      markFieldError(document.getElementById('preco'), true);
      setProdutoFormStatus('Informe um preço válido (ex: 19,90).', 'error');
      document.getElementById('preco')?.focus();
      return;
    }

    if (estoque !== null && (!Number.isFinite(estoque) || estoque < 0)) {
      markFieldError(document.getElementById('estoque'), true);
      setProdutoFormStatus('Estoque inválido.', 'error');
      document.getElementById('estoque')?.focus();
      return;
    }

    if (!imagemPreviewDataUrl) {
      markFieldError(document.getElementById('imagem-url'), true);
      setProdutoFormStatus('Selecione uma imagem (arquivo) ou cole uma URL da imagem.', 'error');
      document.getElementById('imagem-url')?.focus();
      return;
    }

    const produtos = getJSON('produtos', []);

    const tagsFinal = tagsRaw || categoria || '';

    const payload = {
      id: produtoEditIndex === null ? Date.now() : (produtos[produtoEditIndex]?.id || Date.now()),
      nome,
      preco,
      imagem: imagemPreviewDataUrl,
      descricao: descricao || null,
      categoria: categoria || null,
      // A página de produtos usa "tags" para categorias/filtros.
      tags: tagsFinal,
      estoque: estoque === null ? null : Math.trunc(estoque),
      criadoEm: produtoEditIndex === null
        ? new Date().toISOString()
        : (produtos[produtoEditIndex]?.criadoEm || new Date().toISOString()),
      atualizadoEm: new Date().toISOString()
    };

    (async () => {
      const isNovo = produtoEditIndex === null;

      if (isNovo) {
        produtos.push(payload);
        registrarAtividade('produto', 'Produto adicionado', nome);
      } else {
        produtos[produtoEditIndex] = { ...produtos[produtoEditIndex], ...payload };
        registrarAtividade('produto', 'Produto atualizado', nome);
      }
      setJSON('produtos', produtos);

      try {
        const method = isNovo ? 'POST' : 'PUT';
        const url = isNovo
          ? '/api/produtos'
          : `/api/produtos/${encodeURIComponent(String(payload.id))}`;
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        // se falhar, mantém pelo menos no localStorage
      }

      limparFormularioProduto();

      setProdutoFormStatus(
        isNovo ? 'Produto adicionado com sucesso.' : 'Produto atualizado com sucesso.',
        'success'
      );

      renderProdutosAdmin();
      atualizarStats();
    })();
  }

  function renderProdutosAdmin() {
    const produtos = getJSON('produtos', []);
    const container = document.getElementById('produtosAdmin');
    const semProdutos = document.getElementById('sem-produtos');
    const btnLimpar = document.getElementById('btn-limpar-todos');
    const countEl = document.getElementById('produtos-count');
    if (!container) return;

    if (countEl) countEl.textContent = produtos.length ? `${produtos.length} item(ns)` : '';

    if (!produtos.length) {
      container.innerHTML = '';
      if (semProdutos) semProdutos.style.display = 'block';
      if (btnLimpar) btnLimpar.style.display = 'none';
      return;
    }

    if (semProdutos) semProdutos.style.display = 'none';
    if (btnLimpar) btnLimpar.style.display = 'inline-flex';

    container.innerHTML = produtos.map((p, index) => {
      const nome = sanitize(p.nome || 'Produto');
      const preco = formatPrice(p.preco);
      const imagem = p.imagem || '';
      const categoria = p.categoria ? sanitize(p.categoria) : '';
      const estoque = Number.isFinite(Number(p.estoque)) ? Number(p.estoque) : null;
      const descricao = p.descricao ? sanitize(p.descricao) : '';
      const tags = p.tags ? String(p.tags) : '';
      const tagsList = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map(t => sanitize(t));

      const metaChips = [
        categoria ? `<span class="admin-chip">${categoria}</span>` : '',
        estoque !== null ? `<span class="admin-chip">Estoque: ${estoque}</span>` : ''
      ].filter(Boolean).join('');

      return `
        <div class="admin-card admin-card--produto" style="--enter-delay:${Math.min(index, 12)}">
          <img src="${imagem}" alt="${nome}">
          <div class="card-content">
            <div class="admin-card-top">
              <h4 title="${nome}">${nome}</h4>
              <span class="preco">${preco}</span>
            </div>
            ${metaChips ? `<div class="admin-meta">${metaChips}</div>` : ''}
            ${descricao ? `<p class="admin-desc">${descricao.length > 140 ? descricao.slice(0, 140) + '…' : descricao}</p>` : ''}
            ${tagsList.length ? `<div class="admin-tags">${tagsList.map(t => `<span class=\"admin-tag\">${t}</span>`).join('')}</div>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn-edit" onclick="editarProduto(${index})" aria-label="Editar produto">
              Editar
            </button>
            <button class="btn-duplicate" onclick="duplicarProduto(${index})" aria-label="Duplicar produto">
              Duplicar
            </button>
            <button class="btn-delete" onclick="excluirProduto(${index})" aria-label="Excluir produto">
              Excluir
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function editarProduto(index) {
    const produtos = getJSON('produtos', []);
    const produto = produtos[index];
    if (!produto) return;

    // Carrega no formulário (sem prompt)
    produtoEditIndex = index;
    const nomeEl = document.getElementById('nome');
    const precoEl = document.getElementById('preco');
    const descricaoEl = document.getElementById('descricao');
    const categoriaEl = document.getElementById('categoria');
    const estoqueEl = document.getElementById('estoque');
    const tagsEl = document.getElementById('tags');
    const imgUrlEl = document.getElementById('imagem-url');

    if (nomeEl) nomeEl.value = produto.nome || '';
    if (precoEl) precoEl.value = Number(produto.preco || 0) ? String(produto.preco) : '';
    if (descricaoEl) descricaoEl.value = produto.descricao || '';
    if (categoriaEl) categoriaEl.value = produto.categoria || '';
    if (estoqueEl) estoqueEl.value = produto.estoque === null || typeof produto.estoque === 'undefined' ? '' : String(produto.estoque);
    if (tagsEl) tagsEl.value = produto.tags || '';

    // Imagem: se for dataURL, mantém como preview; se for URL, preenche o campo de URL
    imagemPreviewDataUrl = String(produto.imagem || '') || null;
    if (imgUrlEl) {
      const isDataUrl = String(produto.imagem || '').startsWith('data:');
      imgUrlEl.value = !isDataUrl ? String(produto.imagem || '') : '';
    }

    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    if (previewImg && imagemPreviewDataUrl) previewImg.src = imagemPreviewDataUrl;
    if (previewContainer) previewContainer.style.display = imagemPreviewDataUrl ? 'block' : 'none';

    setProdutoFormMode('edit', produto);
    try {
      document.getElementById('aba-produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('nome')?.focus();
    } catch {
      // ignora
    }
  }

  async function duplicarProduto(index) {
    const produtos = getJSON('produtos', []);
    const produto = produtos[index];
    if (!produto) return;
    const copy = {
      ...produto,
      id: Date.now(),
      nome: `${produto.nome || 'Produto'} (cópia)`,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    produtos.push(copy);
    setJSON('produtos', produtos);

    try {
      await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(copy)
      });
    } catch {
      // falha silenciosa, fica ao menos no localStorage
    }

    registrarAtividade('produto', 'Produto duplicado', copy.nome);
    renderProdutosAdmin();
    atualizarStats();
  }

  async function excluirProduto(index) {
    const produtos = getJSON('produtos', []);
    const produto = produtos[index];
    if (!produto) return;
    if (!confirm(`Deseja excluir o produto "${produto.nome}"?`)) return;
    produtos.splice(index, 1);
    setJSON('produtos', produtos);

    try {
      if (produto.id) {
        await fetch(`/api/produtos/${encodeURIComponent(String(produto.id))}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' }
        });
      }
    } catch {
      // falha silenciosa
    }

    registrarAtividade('produto', 'Produto excluído', produto.nome);
    renderProdutosAdmin();
    atualizarStats();
  }

  async function limparTodosProdutos() {
    const produtos = getJSON('produtos', []);
    if (!produtos.length) return;
    if (!confirm('Deseja remover TODOS os produtos?')) return;
    localStorage.removeItem('produtos');

    try {
      await fetch('/api/produtos', {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
    } catch {
      // falha silenciosa
    }

    registrarAtividade('produto', 'Produtos limpos', 'Todos os produtos foram removidos');
    renderProdutosAdmin();
    atualizarStats();
  }

  window.previewImagem = previewImagem;
  window.previewImagemUrl = previewImagemUrl;
  window.salvarProduto = salvarProduto;
  window.renderProdutosAdmin = renderProdutosAdmin;
  window.editarProduto = editarProduto;
  window.duplicarProduto = duplicarProduto;
  window.excluirProduto = excluirProduto;
  window.limparTodosProdutos = limparTodosProdutos;
  window.limparFormularioProduto = limparFormularioProduto;
  window.cancelarEdicaoProduto = cancelarEdicaoProduto;

  // ===================
  // Pedidos
  // ===================
  function atualizarListaPedidos() {
    carregarPedidos();
  }

  function atualizarListaComprovantes() {
    carregarComprovantes();
  }

  window.atualizarListaComprovantes = atualizarListaComprovantes;

  function filtrarComprovantes() {
    const input = document.getElementById('filtro-comprovantes');
    const q = String(input?.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('#lista-comprovantes .pedido-card');
    cards.forEach(card => {
      const hay = String(card.getAttribute('data-search') || '').toLowerCase();
      card.style.display = !q || hay.includes(q) ? 'block' : 'none';
    });
  }

  window.filtrarComprovantes = filtrarComprovantes;

  function acharIndicePedido(pedidos, id) {
    return pedidos.findIndex(p => String(p.id || p.codigo || '—') === String(id));
  }

  function domSafeId(raw) {
    const s = String(raw ?? '').trim();
    return `p${s.replace(/[^a-zA-Z0-9_-]/g, '_') || '0'}`;
  }

  async function carregarPedidos() {
    const container = document.getElementById('lista-pedidos');
    if (!container) return;

    const pedidos = await getPedidosPreferServer();
    // Prazo para manter pedidos não pagos visíveis (2 horas)
    const TEMPO_LIMITE = 2 * 60 * 60 * 1000;
    const agora = Date.now();

    const visiveis = pedidos.filter(p => {
      if (getComprovanteSrc(p)) return true;
      const status = String(p.status || '').toLowerCase();
      if (status.includes('pago')) return true;
      const ts = typeof p.timestamp === 'number' ? p.timestamp : Date.parse(p.timestamp);
      if (!ts || Number.isNaN(ts)) return true;
      return (agora - ts) < TEMPO_LIMITE;
    });

    const totalVisiveisEl = document.getElementById('pedidos-total-visiveis');
    const aguardandoEl = document.getElementById('pedidos-aguardando');
    const pagosEl = document.getElementById('pedidos-pagos');

    if (!visiveis.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum pedido ainda</h3>
          <p>Os pedidos dos clientes aparecerão aqui automaticamente</p>
          <p style="font-size:0.85em;color:#888;margin-top:10px;">Pedidos não pagos ficam visíveis por até <strong>2 horas</strong> e depois somem daqui automaticamente.</p>
        </div>
      `;
      if (totalVisiveisEl) totalVisiveisEl.textContent = '0';
      if (aguardandoEl) aguardandoEl.textContent = '0';
      if (pagosEl) pagosEl.textContent = '0';
      return;
    }

    const pedidosOrdenados = [...visiveis].reverse();

    if (totalVisiveisEl) totalVisiveisEl.textContent = String(visiveis.length);
    if (aguardandoEl) {
      const aguardando = visiveis.filter(p => String(p.status || '').toLowerCase().includes('aguard')).length;
      aguardandoEl.textContent = String(aguardando);
    }
    if (pagosEl) {
      const pagos = visiveis.filter(p => {
        const s = String(p.status || '').toLowerCase();
        return s.includes('pago') || s.includes('concl');
      }).length;
      pagosEl.textContent = String(pagos);
    }
    container.innerHTML = `
      <div style="margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#f9f7fc;color:#6B46C1;font-size:0.88em;">
        Pedidos que ainda estão <strong>aguardando pagamento</strong> ficam visíveis aqui por até <strong>2 horas</strong> após a criação. Depois desse prazo, eles somem desta lista, mas continuam registrados no sistema.
      </div>
      ${pedidosOrdenados.map(pedido => {
      const status = String(pedido.status || 'Aguardando Pagamento');
      const statusClass = status.toLowerCase().replace(/\s+/g, '-');
      const id = pedido.id || pedido.codigo || '—';
      const domId = domSafeId(id);
      const cliente = pedido.cliente || {};
      const nomeCliente = cliente.nome || pedido.cliente || 'Cliente';
      const cpfCliente = String(cliente.cpf || pedido.cpf || '').trim();
      const dataPedido = String(pedido.data || pedido.dataPagamento || '').trim();
      const total = formatPrice(pedido.total);
      const temComprovante = Boolean(getComprovanteSrc(pedido));
      const codigoRastreio = (typeof pedido.codigoRastreio === 'string' ? pedido.codigoRastreio : '').trim();

      const search = [
        id,
        dataPedido,
        status,
        nomeCliente,
        cpfCliente,
        codigoRastreio,
        cliente.email,
        cliente.telefone,
        cliente.cep,
        cliente.cidade,
        cliente.uf
      ]
        .filter(Boolean)
        .map(v => String(v))
        .join(' ')
        .toLowerCase();

      const statusOptions = [
        'Aguardando Pagamento',
        'Pago',
        'Em Preparação',
        'Enviado',
        'Concluído',
        'Cancelado'
      ];

      const statusSelectHtml = statusOptions.map((s) => {
        const selected = String(s) === String(status) ? 'selected' : '';
        return `<option value="${sanitize(String(s))}" ${selected}>${sanitize(String(s))}</option>`;
      }).join('');

      return `
        <div class="pedido-card" data-status="${sanitize(status)}" data-search="${sanitize(search)}">
          <div class="pedido-header">
            <div>
              <h4>Pedido #${sanitize(String(id))}</h4>
              <p class="pedido-data">${sanitize(String(pedido.data || ''))}</p>
              ${status.toLowerCase().includes('pago') && pedido.dataPagamento
                ? `<p style=\"color:#27ae60;font-weight:600;font-size:0.9em;\">Pago em: ${sanitize(String(pedido.dataPagamento))}</p>`
                : ''}
            </div>
            <span class="status-badge status-${sanitize(statusClass)}">${sanitize(status)}</span>
          </div>
          <div class="pedido-body">
            <p><strong>Cliente:</strong> ${sanitize(String(nomeCliente))}</p>
            <p><strong>Total:</strong> ${total}</p>
            <p><strong>Itens:</strong> ${Array.isArray(pedido.itens) ? pedido.itens.length : 0}</p>
            <p style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <strong>Rastreio:</strong>
              <span style="font-weight:800;color:#333;">${sanitize(codigoRastreio || '—')}</span>
              <button onclick=\"copiarCodigoRastreioPedido('${sanitize(String(id))}')\" class="btn-status" ${codigoRastreio ? '' : 'disabled'}>Copiar</button>
            </p>
            ${pedido.observacao ? `<p style=\"margin:8px 0 0 0;font-size:0.98em;color:#b91c5c;\"><strong>Observação:</strong> ${sanitize(pedido.observacao)}</p>` : ''}
            ${temComprovante
              ? '<p style="color:#27ae60;font-weight:700;">Comprovante anexado</p>'
              : '<p style="color:#e67e22;font-weight:600;">Aguardando comprovante</p>'}
          </div>
          <div class="pedido-actions">
            ${temComprovante
              ? `<button onclick="verComprovante('${sanitize(String(id))}')" class="btn-status">Ver comprovante</button>`
              : ''}
            <button onclick="togglePedidoEditor('${sanitize(domId)}')" class="btn-status">Editar</button>
            <button onclick="verDetalhesPedido('${sanitize(String(id))}')" class="btn-detalhes">Ver detalhes</button>
            <button onclick="excluirPedido('${sanitize(String(id))}')" class="btn-status">Excluir</button>
          </div>

          <div id="pedido-editor-${sanitize(domId)}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,0.08);">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
              <div style="min-width:220px;flex:1;">
                <label style="display:block;font-weight:800;color:#6B46C1;margin-bottom:6px;">Status</label>
                <select id="pedido-status-${sanitize(domId)}" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);">
                  ${statusSelectHtml}
                </select>
              </div>
              <div style="min-width:260px;flex:2;">
                <label style="display:block;font-weight:800;color:#6B46C1;margin-bottom:6px;">Código de rastreio</label>
                <input id="pedido-codigo-${sanitize(domId)}" type="text" value="${sanitize(codigoRastreio)}" placeholder="Ex.: AB123456789BR" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);" />
                <div style="margin-top:6px;font-size:0.85em;color:#666;">Dica: preencha quando o pedido for marcado como <strong>Enviado</strong>.</div>
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button id="pedido-salvar-${sanitize(domId)}" onclick="salvarPedidoEdicao('${sanitize(String(id))}','${sanitize(domId)}')" class="btn-detalhes">Salvar</button>
                <button onclick="togglePedidoEditor('${sanitize(domId)}')" class="btn-status">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
    `;

    filtrarPedidos();
  }

  // ===================
  // Comprovantes (apenas pedidos com comprovante)
  // ===================
  async function carregarComprovantes() {
    const container = document.getElementById('lista-comprovantes');
    if (!container) return;

    const pedidos = await getPedidosPreferServer();
    const comComprovante = pedidos.filter(p => Boolean(getComprovanteSrc(p)));

    if (!comComprovante.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Nenhum comprovante ainda</h3>
          <p>Quando um pedido for pago e enviar comprovante, ele aparecerá aqui</p>
        </div>
      `;
      return;
    }

    const ordenados = [...comComprovante].reverse();
    container.innerHTML = ordenados.map(pedido => {
      const id = pedido.id || pedido.codigo || '—';
      const cliente = pedido.cliente || {};
      const nomeCliente = cliente.nome || pedido.cliente || 'Cliente';
      const enderecoLinha = [cliente.endereco, cliente.complemento].filter(Boolean).join(', ');
      const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/');
      const cep = String(cliente.cep || '').trim();
      const total = formatPrice(pedido.total);
      const data = String(pedido.dataPagamento || pedido.data || '');
      const img = String(getComprovanteSrc(pedido) || '');
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      const itensCount = itens.length;
      const itensPreview = itens
        .slice(0, 3)
        .map(item => {
          const nome = sanitize(String(item?.nome || 'Item'));
          const qtd = Number(item?.quantidade) || 0;
          return `• ${nome}${qtd ? ` (${qtd}x)` : ''}`;
        })
        .join('<br>');
      const hasMoreItens = itensCount > 3;
      const observacao = String(pedido.observacao || '').trim();
      const search = `${String(id)} ${String(nomeCliente)} ${String(data)} ${enderecoLinha} ${cep} ${cidadeUf} ${observacao}`.toLowerCase();

      const isPdf = isPdfSrc(img);
      const previewBlock = isPdf
        ? `
          <div
            onclick="verComprovante('${sanitize(String(id))}')"
            style="width:100%;height:170px;border-radius:12px;border:1px solid rgba(0,0,0,0.08);background:#fff;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;"
          >
            <div style="font-size:14px;font-weight:800;letter-spacing:0.08em;">PDF</div>
            <div style="font-weight:800;color:#6B46C1;">Comprovante em PDF (clique para abrir)</div>
          </div>
        `
        : `
          <img
            src="${sanitize(img)}"
            alt="Comprovante"
            style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,0.08);cursor:pointer;"
            onclick="verComprovante('${sanitize(String(id))}')"
          />
        `;

      return `
        <div class="pedido-card" data-status="Pago" data-search="${sanitize(search)}">
          <div class="pedido-header">
            <div>
              <h4>Comprovante — Pedido #${sanitize(String(id))}</h4>
              <p class="pedido-data">${sanitize(data)}</p>
            </div>
            <span class="status-badge status-pago">Pago</span>
          </div>

          <div class="pedido-body">
            <p><strong>Cliente:</strong> ${sanitize(String(nomeCliente))}</p>
            ${enderecoLinha || cep || cidadeUf
              ? `<p><strong>Endereço:</strong> ${sanitize(String(enderecoLinha || ''))}${(cep || cidadeUf) ? ` <span style="color:#666;">— ${sanitize(String([cep, cidadeUf].filter(Boolean).join(' — ')))}</span>` : ''}</p>`
              : ''}
            <p><strong>Total:</strong> ${total}</p>
            <p><strong>Itens:</strong> ${sanitize(String(itensCount))}</p>
            ${observacao
              ? `<p style="margin:8px 0 0 0;font-size:0.98em;color:#b91c5c;"><strong>Observação:</strong> ${sanitize(observacao)}</p>`
              : ''}
            ${itensCount
              ? `
                <div style="margin-top:8px;color:#555;line-height:1.25;">
                  <div style="font-weight:700;color:#4a2c6b;">Resumo do pedido</div>
                  <div style="margin-top:6px;">${itensPreview}${hasMoreItens ? `<br><span style=\"color:#777;\">… +${sanitize(String(itensCount - 3))} item(ns)</span>` : ''}</div>
                </div>
              `
              : ''}
            <div style="margin-top:12px;">
              ${previewBlock}
            </div>
          </div>

          <div class="pedido-actions">
            <button onclick="verComprovante('${sanitize(String(id))}')" class="btn-status">Ver comprovante</button>
            <button onclick="verDetalhesPedido('${sanitize(String(id))}')" class="btn-detalhes">Ver pedido</button>
          </div>
        </div>
      `;
    }).join('');

    filtrarComprovantes();
  }

  function filtrarPedidos() {
    const filtro = document.getElementById('filtro-status-pedido');
    const status = filtro ? filtro.value : 'todos';

    const input = document.getElementById('filtro-pedidos');
    const q = String(input?.value || '').trim().toLowerCase();

    const cards = document.querySelectorAll('#lista-pedidos .pedido-card');
    cards.forEach(card => {
      const cardStatus = String(card.getAttribute('data-status') || '');
      const hay = String(card.getAttribute('data-search') || '').toLowerCase();
      const okStatus = status === 'todos' || cardStatus === status;
      const okText = !q || hay.includes(q);
      card.style.display = (okStatus && okText) ? 'block' : 'none';
    });
  }

  function exportarPedidosCSV() {
    (async () => {
      const pedidos = await getPedidosPreferServer();
      if (!Array.isArray(pedidos) || !pedidos.length) {
        alert('Nenhum pedido para exportar.');
        return;
      }

      const delimiter = ';';

      const escapeCell = (value) => {
        const s = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim();
        const needsQuotes = s.includes(delimiter) || s.includes('"') || /\r\n|\r|\n/.test(s);
        const normalized = s.replace(/\"/g, '""');
        return needsQuotes ? `"${normalized}"` : normalized;
      };

      const header = [
        'id',
        'data',
        'dataPagamento',
        'status',
        'cliente_nome',
        'cliente_cpf',
        'cliente_email',
        'cliente_telefone',
        'endereco',
        'complemento',
        'cep',
        'cidade',
        'uf',
        'subtotal',
        'frete',
        'desconto',
        'cupom',
        'total',
        'codigoRastreio',
        'itens_count',
        'itens'
      ].join(delimiter);

      const lines = pedidos.map(p => {
        const id = p.id || p.codigo || '';
        const cliente = p.cliente || {};
        const itens = Array.isArray(p.itens) ? p.itens : [];

        const endereco = String(cliente.endereco || '').trim();
        const complemento = String(cliente.complemento || '').trim();

        const itensCompact = itens
          .map(i => {
            const nome = String(i?.nome || '').trim();
            const qtd = Number(i?.quantidade) || 0;
            return nome ? `${nome}${qtd ? ` (${qtd}x)` : ''}` : '';
          })
          .filter(Boolean)
          .join(' | ');

        return [
          id,
          p.data || '',
          p.dataPagamento || '',
          p.status || '',
          cliente.nome || p.cliente || '',
          cliente.cpf || p.cpf || '',
          cliente.email || '',
          cliente.telefone || '',
          endereco,
          complemento,
          cliente.cep || '',
          cliente.cidade || '',
          cliente.uf || '',
          p.subtotal ?? '',
          p.frete ?? '',
          p.desconto ?? '',
          p.cupom || '',
          p.total ?? '',
          (typeof p.codigoRastreio === 'string' ? p.codigoRastreio.trim() : ''),
          itens.length,
          itensCompact
        ].map(escapeCell).join(delimiter);
      });

      const bom = '\uFEFF';
      const excelSep = `sep=${delimiter}`;
      const csv = [excelSep, header, ...lines].join('\r\n');

      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flordeiris-pedidos-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      registrarAtividade('pedido', 'Pedidos exportados', 'Exportação CSV: ' + pedidos.length + ' pedido(s)');
    })();
  }

  async function alterarStatusPedidoModal(pedidoId) {
    // Mantém UX atual (prompt), mas resolve pedido via servidor quando disponível
    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    if (!pedido) {
      alert('Pedido não encontrado!');
      return;
    }

    // Notificação se status for alterado para Enviado
    const statusAtual = String(pedido.status || '').toLowerCase();
    const novoStatusPrompt = prompt('Novo status do pedido:', pedido.status || '');
    if (novoStatusPrompt && novoStatusPrompt.toLowerCase() === 'enviado' && statusAtual !== 'enviado') {
      mostrarNotificacaoAdmin('Pedido marcado como Enviado!', 'info');
    }

    const options = [
      { value: 'Aguardando Pagamento', label: 'Aguardando Pagamento' },
      { value: 'Pago', label: 'Pago' },
      { value: 'Em Preparação', label: 'Em Preparação' },
      { value: 'Enviado', label: 'Enviado' },
      { value: 'Concluído', label: 'Concluído' },
      { value: 'Cancelado', label: 'Cancelado' }
    ];

    var opcoes = options.map(function(o, i) {
      return (i + 1) + '. ' + o.label + (o.value === pedido.status ? ' (atual)' : '');
    }).join('\n');
    const escolha = prompt(
      'Escolha o novo status para o Pedido #' + (pedido.id || pedidoId) + ':\n\n' + opcoes + '\n\nDigite o número (1-' + options.length + '):',
      '1'
    );

    if (escolha === null) return;
    const idx = Number(escolha) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      alert('Opção inválida!');
      return;
    }

    const novoStatusSelecionado = options[idx].value;
    const updated = { ...pedido, status: novoStatusSelecionado };
    if (novoStatusSelecionado === 'Pago' && !updated.dataPagamento) {
      updated.dataPagamento = new Date().toLocaleString('pt-BR');
    }

    if (novoStatusSelecionado === 'Enviado') {
      const atual = typeof updated.codigoRastreio === 'string' ? updated.codigoRastreio : '';
      const codigo = prompt(
        `Código de rastreio do Pedido #${pedido.id || pedidoId} (opcional):\n\n` +
        `Dica: você pode deixar em branco e preencher depois.`,
        String(atual || '')
      );
      if (codigo !== null) {
        const limpo = String(codigo || '').trim();
        updated.codigoRastreio = limpo || null;
      }
    }

    // Atualiza local se existir lá (compatibilidade)
    const pedidosLocal = getJSON('pedidos', []);
    const indexLocal = acharIndicePedido(pedidosLocal, pedidoId);
    if (indexLocal !== -1) {
      pedidosLocal[indexLocal] = updated;
      setJSON('pedidos', pedidosLocal);
    }

    // Persiste no servidor quando possível
    patchPedidoServer(pedidoId, { status: updated.status, dataPagamento: updated.dataPagamento, codigoRastreio: updated.codigoRastreio }).catch(() => {});
    registrarAtividade('pedido', 'Status alterado', `Pedido #${pedido.id || pedidoId} -> ${novoStatus}`);

    carregarPedidos();
    atualizarStats();
  }

  function togglePedidoEditor(domId) {
    const el = document.getElementById(`pedido-editor-${domId}`);
    if (!el) return;
    el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
  }

  async function copiarCodigoRastreioPedido(pedidoId) {
    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    const codigo = (typeof pedido?.codigoRastreio === 'string' ? pedido.codigoRastreio : '').trim();
    if (!codigo) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(codigo);
        alert('Código de rastreio copiado.');
        return;
      }
    } catch {
      // fallback abaixo
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = codigo;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      alert('Código de rastreio copiado.');
    } catch {
      alert('Não foi possível copiar o código.');
    }
  }

  async function salvarPedidoEdicao(pedidoId, domId) {
    const btn = document.getElementById(`pedido-salvar-${domId}`);
    const statusEl = document.getElementById(`pedido-status-${domId}`);
    const codigoEl = document.getElementById(`pedido-codigo-${domId}`);
    if (!(statusEl instanceof HTMLSelectElement) || !(codigoEl instanceof HTMLInputElement)) return;

    const novoStatus = String(statusEl.value || '').trim() || 'Aguardando Pagamento';
    const codigoLimpo = String(codigoEl.value || '').trim();

    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    if (!pedido) {
      alert('Pedido não encontrado!');
      return;
    }

    const patch = {
      status: novoStatus,
      codigoRastreio: codigoLimpo || null
    };

    if (novoStatus === 'Pago' && !pedido.dataPagamento) {
      patch.dataPagamento = new Date().toLocaleString('pt-BR');
    }

    // Se foi preenchido um código de rastreio e o status ainda não é final,
    // marca automaticamente como "Enviado" para liberar o rastreio ao cliente.
    if (codigoLimpo) {
      const statusLower = novoStatus.toLowerCase();
      if (!['enviado', 'concluído', 'cancelado'].includes(statusLower)) {
        patch.status = 'Enviado';
      }
    }

    const originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Salvando...';
    }

    // Atualiza local (compatibilidade)
    const pedidosLocal = getJSON('pedidos', []);
    const indexLocal = acharIndicePedido(pedidosLocal, pedidoId);
    if (indexLocal !== -1) {
      pedidosLocal[indexLocal] = { ...pedidosLocal[indexLocal], ...patch };
      setJSON('pedidos', pedidosLocal);
    }

    // Persiste no servidor quando possível
    const ok = await patchPedidoServer(pedidoId, patch);
    if (!ok) {
      // Se servidor falhar, ainda temos o local como fallback.
      alert('Não consegui salvar no servidor agora. Verifique o servidor, mas mantive no localStorage.');
    } else {
      registrarAtividade('pedido', 'Pedido atualizado', `Pedido #${pedido.id || pedidoId} -> ${novoStatus}`);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Salvar';
    }

    carregarPedidos();
    atualizarStats();
  }

  async function excluirPedido(pedidoId) {
    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    if (!pedido) {
      alert('Pedido não encontrado!');
      return;
    }

    const ok = confirm(
      `ATENÇÃO: Deseja realmente EXCLUIR este pedido?\n\n` +
      `Pedido #${pedido.id || pedidoId}\n` +
      `Cliente: ${pedido.cliente?.nome || 'N/A'}\n` +
      `Total: ${formatPrice(pedido.total)}\n` +
      `Status: ${pedido.status || '—'}\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );
    if (!ok) return;

    // Remove do local se existir
    const pedidosLocal = getJSON('pedidos', []);
    const indexLocal = acharIndicePedido(pedidosLocal, pedidoId);
    if (indexLocal !== -1) {
      pedidosLocal.splice(indexLocal, 1);
      setJSON('pedidos', pedidosLocal);
    }

    // Remove do servidor quando possível
    deletePedidoServer(pedidoId).catch(() => {});
    registrarAtividade('pedido', 'Pedido excluído', `Pedido #${pedido.id || pedidoId} removido`);
    carregarPedidos();
    atualizarStats();
  }

  async function verDetalhesPedido(pedidoId) {
    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    if (!pedido) {
      alert('Pedido não encontrado!');
      return;
    }

    const id = pedido.id || pedidoId;
    const status = String(pedido.status || '—');
    const data = String(pedido.data || '');
    const dataPagamento = String(pedido.dataPagamento || '');

    const cliente = pedido.cliente || {};
    const nomeCliente = String(cliente.nome || 'N/A');
    const cpfCliente = String(cliente.cpf || 'N/A');
    const userCliente = String(cliente.usuario || '');
    const enderecoLinha = [cliente.endereco, cliente.complemento].filter(Boolean).join(', ');
    const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/');
    const cep = String(cliente.cep || '').trim();

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const rows = itens.map((item, i) => {
      const nome = sanitize(String(item?.nome || `Item ${i + 1}`));
      const qtd = Number(item?.quantidade) || 0;
      const preco = Number(item?.preco) || 0;
      const sub = preco * qtd;
      return `
        <tr>
          <td class="admin-td">${i + 1}</td>
          <td class="admin-td admin-td-strong">${nome}</td>
          <td class="admin-td admin-td-right">${sanitize(String(qtd))}</td>
          <td class="admin-td admin-td-right">${sanitize(formatPrice(preco))}</td>
          <td class="admin-td admin-td-right admin-td-strong">${sanitize(formatPrice(sub))}</td>
        </tr>
      `;
    }).join('');

    const subtotalValor = Number(pedido.subtotal || 0);
    const descontoValor = Number(pedido.desconto || 0);
    const freteValor = Number(pedido.frete || 0);
    const cupom = String(pedido.cupom || '').trim();
    const totalValor = Number(pedido.total || 0);

    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';

    modal.innerHTML = `
      <div class="admin-modal admin-modal--lg" role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <div class="admin-modal-header">
          <div class="admin-modal-header-left">
            <div class="admin-modal-title">Pedido #${sanitize(String(id))}</div>
            <div class="admin-modal-subtitle">${sanitize(data)}${dataPagamento ? ` • Pago em: ${sanitize(dataPagamento)}` : ''}</div>
          </div>
          <div class="admin-modal-header-right">
            <span class="admin-pill">${sanitize(status)}</span>
            <button id="fechar-pedido" class="admin-modal-close" type="button">Fechar</button>
          </div>
        </div>

        <div class="admin-modal-body">
          <div class="admin-grid-2">
            <div class="admin-panel">
              <div class="admin-panel-title">Cliente</div>
              <div class="admin-kv">
                <div><span class="admin-k">Nome:</span> <span class="admin-v">${sanitize(nomeCliente)}</span></div>
                <div><span class="admin-k">CPF:</span> <span class="admin-v">${sanitize(cpfCliente)}</span></div>
                ${userCliente ? `<div><span class="admin-k">Usuário:</span> <span class="admin-v">${sanitize(userCliente)}</span></div>` : ''}
              </div>
            </div>

            <div class="admin-panel">
              <div class="admin-panel-title">Entrega</div>
              <div class="admin-kv">
                <div class="admin-v">${sanitize(enderecoLinha || '—')}</div>
                <div class="admin-v">${sanitize([cep, cidadeUf].filter(Boolean).join(' — ') || '—')}</div>
              </div>
            </div>
          </div>

          <div class="admin-panel" style="margin-top:12px;">
            <div class="admin-panel-title">Itens do pedido (${sanitize(String(itens.length))})</div>
            ${itens.length
              ? `
                <div class="admin-table-wrap">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th class="admin-th">#</th>
                        <th class="admin-th">Item</th>
                        <th class="admin-th admin-th-right">Qtd</th>
                        <th class="admin-th admin-th-right">Preço</th>
                        <th class="admin-th admin-th-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rows}
                    </tbody>
                  </table>
                </div>
              `
              : `<div class="admin-empty-inline">(sem itens)</div>`}
          </div>

          <div class="admin-panel" style="margin-top:12px;">
            <div class="admin-panel-title">Valores</div>
            <div class="admin-totals">
              <div class="admin-total-row"><span>Subtotal</span><strong>${sanitize(formatPrice(subtotalValor))}</strong></div>
              ${descontoValor ? `<div class="admin-total-row"><span>Desconto${cupom ? ` (Cupom: ${sanitize(cupom)})` : ''}</span><strong class="admin-total-positive">-${sanitize(formatPrice(descontoValor))}</strong></div>` : ''}
              ${freteValor ? `<div class="admin-total-row"><span>Frete</span><strong>${sanitize(formatPrice(freteValor))}</strong></div>` : ''}
              <div class="admin-divider"></div>
              <div class="admin-total-row admin-total-row--grand"><span>Total</span><strong>${sanitize(formatPrice(totalValor))}</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    modal.querySelector('#fechar-pedido')?.addEventListener('click', () => modal.remove());
  }

  async function verComprovante(pedidoId) {
    const found = await findPedidoPreferServerById(pedidoId);
    const pedido = found.pedido;
    const src = getComprovanteSrc(pedido);
    if (!pedido || !src) {
      alert('Comprovante não encontrado!');
      return;
    }

    const comprovante = String(src || '');
    const isPdf = isPdfSrc(comprovante);
    const isImg = /^data:image\//i.test(comprovante) || /\.(png|jpe?g|webp)(\?|#|$)/i.test(comprovante);
    if (!isPdf && !isImg) {
      alert('Formato de comprovante não suportado!');
      return;
    }

    const safeSrc = sanitize(comprovante);
    const viewer = isPdf
      ? `
        <div class="admin-viewer-top">
          <div class="admin-viewer-label">PDF anexado</div>
          <a href="${safeSrc}" target="_blank" rel="noopener" class="admin-viewer-link">Abrir em nova aba</a>
        </div>
        <embed src="${safeSrc}" type="application/pdf" class="admin-viewer-embed" />
      `
      : `
        <img src="${safeSrc}" alt="Comprovante" class="admin-viewer-img" />
      `;

    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
      <div class="admin-modal admin-modal--md" role="dialog" aria-modal="true" aria-label="Comprovante">
        <div class="admin-modal-header">
          <div class="admin-modal-header-left">
            <div class="admin-modal-title">Comprovante — Pedido #${sanitize(String(pedido.id || pedidoId))}</div>
          </div>
          <div class="admin-modal-header-right">
            <button id="fechar-comprovante" class="admin-modal-close" type="button">Fechar</button>
          </div>
        </div>
        <div class="admin-modal-body">
          <div class="admin-panel">
            ${viewer}
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
    modal.querySelector('#fechar-comprovante')?.addEventListener('click', () => modal.remove());
  }

  window.atualizarListaPedidos = atualizarListaPedidos;
  window.carregarPedidos = carregarPedidos;
  window.filtrarPedidos = filtrarPedidos;
  window.exportarPedidosCSV = exportarPedidosCSV;
  window.alterarStatusPedidoModal = alterarStatusPedidoModal;
  window.togglePedidoEditor = togglePedidoEditor;
  window.salvarPedidoEdicao = salvarPedidoEdicao;
  window.copiarCodigoRastreioPedido = copiarCodigoRastreioPedido;
  window.excluirPedido = excluirPedido;
  window.verDetalhesPedido = verDetalhesPedido;
  window.verComprovante = verComprovante;

  // ===================
  // Usuários
  // ===================
  function atualizarListaUsuarios() {
    const container = document.getElementById('lista-usuarios');
    if (!container) return;

    const usuarios = getJSON('usuarios', []);
    if (!usuarios.length) {
      container.innerHTML = '<div class="empty-state"><h3>Nenhum usuário registrado ainda</h3><p>Quando alguém criar conta, aparecerá aqui.</p></div>';
      return;
    }

    usuarios.sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0));

    container.innerHTML = `
      <div class="usuarios-grid">
        ${usuarios.map(u => {
          const nome = sanitize(u.nome || 'Usuário');
          const user = sanitize(u.usuario || '');
          const cpf = sanitize(u.cpf || '');
          const criado = u.criadoEm ? new Date(u.criadoEm).toLocaleString('pt-BR') : '';
          const foto = u.foto;

          return `
            <div class="usuario-card">
              <div class="usuario-card-grid">
                <div class="usuario-avatar">
                  ${foto
                    ? `<img src="${foto}" alt="Foto" class="usuario-avatar-img">`
                    : `<div class="usuario-avatar-fallback" aria-hidden="true">U</div>`}
                </div>
                <div class="usuario-info">
                  <h3>${nome}</h3>
                  <p class="usuario-handle">@${user}</p>
                  ${cpf ? `<p>CPF: ${cpf}</p>` : ''}
                  ${criado ? `<p class="usuario-criado">Criado em: ${sanitize(criado)}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  window.atualizarListaUsuarios = atualizarListaUsuarios;

  // ===================
  // Relatórios (mínimo)
  // ===================
  let periodoSelecionado = 'hoje';

  function selecionarPeriodo(periodo) {
    periodoSelecionado = periodo;
    document.querySelectorAll('.btn-periodo').forEach(btn => btn.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.btn-periodo')).find(b => (b.getAttribute('onclick') || '').includes(`'${periodo}'`));
    if (btn) btn.classList.add('active');
    carregarRelatorios();
  }

  async function carregarRelatorios() {
    const canvas = document.getElementById('canvas-vendas');
    const ranking = document.getElementById('ranking-produtos');
    const categorias = document.getElementById('categorias-performance');

    const pedidos = await getPedidosPreferServer();
    const agora = new Date();
    const inicio = new Date(agora);

    if (periodoSelecionado === 'hoje') inicio.setHours(0, 0, 0, 0);
    if (periodoSelecionado === 'semana') inicio.setDate(inicio.getDate() - 7);
    if (periodoSelecionado === 'mes') inicio.setMonth(inicio.getMonth() - 1);
    if (periodoSelecionado === 'ano') inicio.setFullYear(inicio.getFullYear() - 1);

    const pagosPeriodo = pedidos.filter(p => {
      const status = String(p.status || '').toLowerCase();
      if (!status.includes('pago')) return false;
      const ts = typeof p.timestamp === 'number' ? p.timestamp : Date.parse(p.timestamp);
      if (!ts || Number.isNaN(ts)) return true;
      return ts >= inicio.getTime();
    });

    const totalVendido = pagosPeriodo.reduce((acc, p) => acc + Number(p.total || 0), 0);

    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      const w = (canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 600);
      const h = (canvas.height = 220);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#2b1b44';
      ctx.font = '700 16px Segoe UI, sans-serif';
      ctx.fillText(`Total vendido (${periodoSelecionado}): ${formatPrice(totalVendido)}`, 16, 34);
      const barW = Math.max(20, Math.min(w - 32, w - 32));
      ctx.fillStyle = 'rgba(107, 70, 193, 0.18)';
      ctx.fillRect(16, 70, w - 32, 20);
      ctx.fillStyle = 'rgba(107, 70, 193, 0.75)';
      ctx.fillRect(16, 70, barW, 20);
    }

    if (ranking) {
      ranking.innerHTML = pagosPeriodo.length
        ? `<p style="color:#666;">${pagosPeriodo.length} pedido(s) pagos no período.</p>`
        : '<p style="color:#999;">Nenhuma venda no período.</p>';
    }

    if (categorias) {
      categorias.innerHTML = '<p style="color:#999;">(Relatório de categorias disponível quando os produtos tiverem categorias cadastradas.)</p>';
    }
  }

  window.selecionarPeriodo = selecionarPeriodo;
  window.carregarRelatorios = carregarRelatorios;

  // ===================
  // Config
  // ===================
  function carregarConfiguracoes() {
    const cfg = (window.SiteConfig && typeof window.SiteConfig.get === 'function')
      ? window.SiteConfig.get()
      : getJSON('configAdmin', null);
    if (!cfg) return;

    const setVal = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    };
    const setCheck = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(value);
    };

    setVal('config-nome-loja', cfg.nomeLoja || '');
    setVal('config-whatsapp', cfg.whatsapp || '');
    setVal('config-horario', cfg.horarioAtendimento || '');
    setVal('config-email', cfg.email || '');
    setVal('config-endereco', cfg.endereco || '');

    setVal('config-title-suffix', cfg.seo?.titleSuffix || '');

    setVal('config-pix-chave', cfg.pix?.chave || '');
    setVal('config-pix-beneficiario', cfg.pix?.beneficiario || '');
    setVal('config-pix-cidade', cfg.pix?.cidade || '');

    setVal('config-hero-l1', cfg.home?.heroLinha1 || '');
    setVal('config-hero-l2', cfg.home?.heroLinha2 || '');
    setVal('config-hero-l3-prefix', cfg.home?.heroLinha3Prefixo || '');
    setVal('config-hero-l3-highlight', cfg.home?.heroLinha3Destaque || '');
    setVal('config-hero-desc', cfg.home?.heroDescricao || '');

    setVal('config-footer-desc', cfg.footer?.descricao || '');
    setVal('config-footer-copy', cfg.footer?.copyright || '');
    setVal('config-localizacao', cfg.localizacao || '');

    setVal('config-instagram', cfg.social?.instagramUrl || '');
    setVal('config-facebook', cfg.social?.facebookUrl || '');

    setVal('config-proc-titulo', cfg.homeSections?.processo?.titulo || '');
    setVal('config-proc-subtitulo', cfg.homeSections?.processo?.subtitulo || '');
    setVal('config-proc-p1-t', cfg.homeSections?.processo?.passos?.[0]?.titulo || '');
    setVal('config-proc-p1-d', cfg.homeSections?.processo?.passos?.[0]?.descricao || '');
    setVal('config-proc-p2-t', cfg.homeSections?.processo?.passos?.[1]?.titulo || '');
    setVal('config-proc-p2-d', cfg.homeSections?.processo?.passos?.[1]?.descricao || '');
    setVal('config-proc-p3-t', cfg.homeSections?.processo?.passos?.[2]?.titulo || '');
    setVal('config-proc-p3-d', cfg.homeSections?.processo?.passos?.[2]?.descricao || '');
    setVal('config-proc-p4-t', cfg.homeSections?.processo?.passos?.[3]?.titulo || '');
    setVal('config-proc-p4-d', cfg.homeSections?.processo?.passos?.[3]?.descricao || '');

    setVal('config-sobre-titulo', cfg.homeSections?.sobre?.titulo || '');
    setVal('config-sobre-p1', cfg.homeSections?.sobre?.paragrafo1 || '');
    setVal('config-sobre-p2', cfg.homeSections?.sobre?.paragrafo2 || '');

    setCheck('notif-novos-pedidos', cfg.notifNovosPedidos !== false);
    setCheck('notif-estoque-baixo', cfg.notifEstoqueBaixo !== false);
    setCheck('notif-novos-clientes', cfg.notifNovosClientes !== false);
  }

  function salvarConfiguracoes() {
    const next = {
      nomeLoja: document.getElementById('config-nome-loja')?.value || '',
      whatsapp: document.getElementById('config-whatsapp')?.value || '',
      horarioAtendimento: document.getElementById('config-horario')?.value || '',
      email: document.getElementById('config-email')?.value || '',
      endereco: document.getElementById('config-endereco')?.value || '',
      seo: {
        titleSuffix: document.getElementById('config-title-suffix')?.value || ''
      },
      pix: {
        chave: document.getElementById('config-pix-chave')?.value || '',
        beneficiario: document.getElementById('config-pix-beneficiario')?.value || '',
        cidade: document.getElementById('config-pix-cidade')?.value || ''
      },
      home: {
        heroLinha1: document.getElementById('config-hero-l1')?.value || '',
        heroLinha2: document.getElementById('config-hero-l2')?.value || '',
        heroLinha3Prefixo: document.getElementById('config-hero-l3-prefix')?.value || '',
        heroLinha3Destaque: document.getElementById('config-hero-l3-highlight')?.value || '',
        heroDescricao: document.getElementById('config-hero-desc')?.value || ''
      },
      footer: {
        descricao: document.getElementById('config-footer-desc')?.value || '',
        copyright: document.getElementById('config-footer-copy')?.value || ''
      },
      localizacao: document.getElementById('config-localizacao')?.value || '',
      social: {
        instagramUrl: document.getElementById('config-instagram')?.value || '',
        facebookUrl: document.getElementById('config-facebook')?.value || ''
      },
      homeSections: {
        processo: {
          titulo: document.getElementById('config-proc-titulo')?.value || '',
          subtitulo: document.getElementById('config-proc-subtitulo')?.value || '',
          passos: [
            {
              titulo: document.getElementById('config-proc-p1-t')?.value || '',
              descricao: document.getElementById('config-proc-p1-d')?.value || ''
            },
            {
              titulo: document.getElementById('config-proc-p2-t')?.value || '',
              descricao: document.getElementById('config-proc-p2-d')?.value || ''
            },
            {
              titulo: document.getElementById('config-proc-p3-t')?.value || '',
              descricao: document.getElementById('config-proc-p3-d')?.value || ''
            },
            {
              titulo: document.getElementById('config-proc-p4-t')?.value || '',
              descricao: document.getElementById('config-proc-p4-d')?.value || ''
            }
          ]
        },
        sobre: {
          titulo: document.getElementById('config-sobre-titulo')?.value || '',
          paragrafo1: document.getElementById('config-sobre-p1')?.value || '',
          paragrafo2: document.getElementById('config-sobre-p2')?.value || ''
        }
      },
      notifNovosPedidos: Boolean(document.getElementById('notif-novos-pedidos')?.checked),
      notifEstoqueBaixo: Boolean(document.getElementById('notif-estoque-baixo')?.checked),
      notifNovosClientes: Boolean(document.getElementById('notif-novos-clientes')?.checked)
    };

    if (window.SiteConfig && typeof window.SiteConfig.set === 'function') {
      window.SiteConfig.set(next);
    } else {
      setJSON('configAdmin', next);
    }

    registrarAtividade('config', 'Configurações salvas', 'Config global do site atualizada');
    alert('Configurações salvas!\n\nAs páginas do site vão refletir isso ao recarregar.');
  }

  function exportarDados() {
    const dados = {
      produtos: getJSON('produtos', []),
      pedidos: getJSON('pedidos', []),
      usuarios: getJSON('usuarios', []),
      atividades: getJSON('atividades', [])
    };

    const dataStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flordeiris-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    registrarAtividade('config', 'Dados exportados', 'Backup criado com sucesso');
    alert('Dados exportados com sucesso!');
  }

  function limparCache() {
    if (!confirm('Deseja limpar o cache? Esta ação irá remover dados temporários mas manterá produtos e pedidos.')) return;

    const adminLogado = sessionStorage.getItem('admin-logado');
    const adminToken = sessionStorage.getItem('admin-token');
    const adminLoginTime = sessionStorage.getItem('admin-login-time');

    sessionStorage.clear();
    if (adminLogado) sessionStorage.setItem('admin-logado', adminLogado);
    if (adminToken) sessionStorage.setItem('admin-token', adminToken);
    if (adminLoginTime) sessionStorage.setItem('admin-login-time', adminLoginTime);
    marcarAtividadeAdmin();

    registrarAtividade('config', 'Cache limpo', 'Dados temporários removidos');
    alert('Cache limpo com sucesso!');
  }

  function fazerBackup() {
    exportarDados();
  }

  function restaurarBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const json = JSON.parse(String(e.target?.result || '{}'));
          if (json.produtos) setJSON('produtos', json.produtos);
          if (json.pedidos) setJSON('pedidos', json.pedidos);
          if (json.usuarios) setJSON('usuarios', json.usuarios);
          if (json.atividades) setJSON('atividades', json.atividades);
          registrarAtividade('config', 'Backup restaurado', 'Dados importados com sucesso');
          alert('Backup restaurado!');
          atualizarDashboard();
          renderProdutosAdmin();
          carregarPedidos();
          atualizarListaUsuarios();
        } catch {
          alert('Arquivo inválido.');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  function alterarSenha() {
    alert('A alteração de senha do admin é feita na tela de admin (login).');
  }

  window.carregarConfiguracoes = carregarConfiguracoes;
  window.salvarConfiguracoes = salvarConfiguracoes;
  window.exportarDados = exportarDados;
  window.limparCache = limparCache;
  window.fazerBackup = fazerBackup;
  window.restaurarBackup = restaurarBackup;
  window.alterarSenha = alterarSenha;

  // ===================
  // Ações rápidas
  // ===================
  function verPedidosPendentes() {
    mudarAba('pedidos');
    const filtro = document.getElementById('filtro-status-pedido');
    if (filtro) filtro.value = 'Aguardando Pagamento';
    filtrarPedidos();
  }

  window.verPedidosPendentes = verPedidosPendentes;

  // ===================
  // Boot
  // ===================
  async function sincronizarProdutosComServidor() {
    try {
      const server = await getProdutosServerOnly();
      const local = getJSON('produtos', []);

      if (Array.isArray(server) && server.length) {
        // Se já há produtos no servidor, ele é a fonte de verdade
        setJSON('produtos', server);
        return;
      }

      if (Array.isArray(local) && local.length) {
        // Se o servidor está vazio mas o admin já tem produtos locais,
        // envia uma vez para o backend para que fiquem disponíveis para todos.
        for (const p of local) {
          try {
            await fetch('/api/produtos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(p)
            });
          } catch {
            // segue para o próximo
          }
        }
      }
    } catch {
      // silencioso: painel continua usando apenas localStorage
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!verificarAutenticacao()) return;
    iniciarMonitorInatividade();

    await sincronizarProdutosComServidor();

    atualizarDashboard();
    renderProdutosAdmin();
    carregarPedidos();
    atualizarListaUsuarios();
    carregarConfiguracoes();
    carregarRelatorios();

    // Atualização automática de pedidos e dashboard
    setInterval(() => {
      carregarPedidos();
      atualizarDashboard();
    }, 30000);

    console.log('Painel Admin carregado');
  });

