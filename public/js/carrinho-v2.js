// Sistema completo de carrinho - Flor de Íris (versão corrigida)

document.addEventListener('DOMContentLoaded', () => {
  // Verificar login no header, se existir
  if (typeof verificarLoginHeader === 'function') {
    try {
      verificarLoginHeader();
    } catch {
      // ignora erro de login no header para não quebrar o carrinho
    }
  }

  // Elementos DOM principais
  const carrinhoVazio = document.getElementById('carrinho-vazio');
  const carrinhoConteudo = document.getElementById('carrinho-conteudo');
  const listaItens = document.getElementById('lista-itens');
  const totalItensEl = document.getElementById('total-itens');
  const carrinhoCountHeader = document.getElementById('carrinho-count-header');
  const subtotalEl = document.getElementById('subtotal');
  const descontoEl = document.getElementById('desconto');
  const totalFinalEl = document.getElementById('total-final');
  const limparCarrinhoBtn = document.getElementById('limpar-carrinho');
  const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
  const cupomInput = document.getElementById('cupom-input');
  const aplicarCupomBtn = document.getElementById('aplicar-cupom');
  const cepResumo = document.getElementById('cep-resumo');
  const btnCalcularResumo = document.getElementById('btn-calcular-resumo');
  const resultadoFrete = document.getElementById('resultado-frete');

  // Estado do carrinho
  let carrinho = [];
  let cupomAplicado = null;
  let freteCalculado = null;

  // Cupons disponíveis
  const cuponsDisponiveis = {
    IRIS10: { desconto: 10, tipo: 'percentual', descricao: '10% de desconto' },
    PRIMEIRA: { desconto: 15, tipo: 'percentual', descricao: '15% de desconto (primeira compra)' },
    FRETE5: { desconto: 5, tipo: 'fixo', descricao: 'R$ 5,00 de desconto' },
    VIP20: { desconto: 20, tipo: 'percentual', descricao: '20% de desconto VIP' }
  };

  // Formatação de moeda
  const formatPrice = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Carregar carrinho do localStorage
  function carregarCarrinho() {
    try {
      const carrinhoSalvo = localStorage.getItem('carrinho');
      carrinho = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : [];
    } catch {
      carrinho = [];
    }
    renderizarCarrinho();
  }

  // Salvar carrinho no localStorage
  function salvarCarrinho() {
    try {
      localStorage.setItem('carrinho', JSON.stringify(carrinho));
    } catch {
      // se der erro (modo privado, etc), apenas ignora
    }
  }

  // Agrupar itens por ID (para quantidade)
  function agruparItens() {
    const agrupado = {};

    carrinho.forEach((item) => {
      const id = item.id || item.nome;
      if (agrupado[id]) {
        agrupado[id].quantidade++;
      } else {
        agrupado[id] = { ...item, quantidade: 1 };
      }
    });

    return Object.values(agrupado);
  }

  // Renderizar carrinho
  function renderizarCarrinho() {
    const itensAgrupados = agruparItens();

    if (carrinhoCountHeader) {
      carrinhoCountHeader.textContent = String(carrinho.length);
    }

    if (!itensAgrupados.length) {
      if (carrinhoVazio) carrinhoVazio.style.display = 'flex';
      if (carrinhoConteudo) carrinhoConteudo.style.display = 'none';
      if (totalItensEl) totalItensEl.textContent = '0';
      atualizarTotais();
      return;
    }

    if (carrinhoVazio) carrinhoVazio.style.display = 'none';
    if (carrinhoConteudo) carrinhoConteudo.style.display = 'grid';

    if (totalItensEl) totalItensEl.textContent = String(carrinho.length);

    if (listaItens) {
      listaItens.innerHTML = '';

      itensAgrupados.forEach((item, index) => {
        const itemEl = criarItemCarrinho(item, index);
        listaItens.appendChild(itemEl);
      });
    }

    atualizarTotais();
  }

  // Criar elemento de item do carrinho
  function criarItemCarrinho(item, index) {
    const div = document.createElement('div');
    div.className = 'carrinho-item';
    div.style.animation = `fadeInUp 0.3s ease ${index * 0.05}s both`;

    const precoUnitario = Number(item.preco) || 0;
    const subtotalItem = precoUnitario * item.quantidade;

    div.innerHTML = `
      <div class="item-imagem">
        <img src="${item.imagem}" alt="${item.nome}" loading="lazy">
      </div>

      <div class="item-info">
        <h3>${item.nome}</h3>
        <p class="item-preco-unitario">${formatPrice(precoUnitario)} / unidade</p>
      </div>

      <div class="item-quantidade">
        <button class="btn-quantidade" data-acao="diminuir" data-item="${item.id || item.nome}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <span class="quantidade-valor">${item.quantidade}</span>
        <button class="btn-quantidade" data-acao="aumentar" data-item="${item.id || item.nome}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div class="item-subtotal">
        <p class="label-subtotal">Subtotal:</p>
        <p class="valor-subtotal">${formatPrice(subtotalItem)}</p>
      </div>

      <button class="btn-remover" data-item="${item.id || item.nome}" title="Remover item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    `;

    const btnDiminuir = div.querySelector('[data-acao="diminuir"]');
    const btnAumentar = div.querySelector('[data-acao="aumentar"]');
    const btnRemover = div.querySelector('.btn-remover');

    if (btnDiminuir) {
      btnDiminuir.addEventListener('click', () => alterarQuantidade(item.id || item.nome, -1));
    }
    if (btnAumentar) {
      btnAumentar.addEventListener('click', () => alterarQuantidade(item.id || item.nome, 1));
    }
    if (btnRemover) {
      btnRemover.addEventListener('click', () => removerItem(item.id || item.nome));
    }

    return div;
  }

  // Alterar quantidade de um item
  function alterarQuantidade(itemId, delta) {
    if (delta < 0) {
      const index = carrinho.findIndex((item) => (item.id || item.nome) === itemId);
      if (index !== -1) {
        carrinho.splice(index, 1);
      }
    } else {
      const itemOriginal = carrinho.find((item) => (item.id || item.nome) === itemId);
      if (itemOriginal) {
        carrinho.push({ ...itemOriginal });
      }
    }

    salvarCarrinho();
    renderizarCarrinho();
  }

  // Remover item completamente
  function removerItem(itemId) {
    if (confirm('Deseja remover este item do carrinho?')) {
      carrinho = carrinho.filter((item) => (item.id || item.nome) !== itemId);
      salvarCarrinho();
      renderizarCarrinho();
      mostrarNotificacao('Item removido do carrinho', 'info');
    }
  }

  // Calcular subtotal
  function calcularSubtotal() {
    return carrinho.reduce((total, item) => {
      return total + (Number(item.preco) || 0);
    }, 0);
  }

  // Calcular desconto
  function calcularDesconto(subtotal) {
    if (!cupomAplicado) return 0;

    if (cupomAplicado.tipo === 'percentual') {
      return subtotal * (cupomAplicado.desconto / 100);
    }
    return cupomAplicado.desconto;
  }

  // Atualizar totais
  function atualizarTotais() {
    const subtotal = calcularSubtotal();
    const desconto = calcularDesconto(subtotal);
    const frete = freteCalculado ? freteCalculado.valor : 0;
    const total = subtotal - desconto + frete;

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (descontoEl) {
      descontoEl.textContent = desconto > 0 ? `-${formatPrice(desconto)}` : formatPrice(0);
      if (desconto > 0) {
        descontoEl.style.color = '#10b981';
        descontoEl.style.fontWeight = '600';
      } else {
        descontoEl.style.color = '';
        descontoEl.style.fontWeight = '';
      }
    }
    if (totalFinalEl) totalFinalEl.textContent = formatPrice(total);
  }

  // Aplicar cupom
  if (aplicarCupomBtn && cupomInput) {
    aplicarCupomBtn.addEventListener('click', () => {
      const codigo = cupomInput.value.trim().toUpperCase();

      if (!codigo) {
        mostrarNotificacao('Digite um código de cupom', 'warning');
        return;
      }

      const cupom = cuponsDisponiveis[codigo];

      if (cupom) {
        cupomAplicado = cupom;
        atualizarTotais();
        mostrarNotificacao(`Cupom aplicado! ${cupom.descricao}`, 'success');
        cupomInput.value = '';
        cupomInput.disabled = true;
        aplicarCupomBtn.textContent = '✓ Aplicado';
        aplicarCupomBtn.disabled = true;
      } else {
        mostrarNotificacao('Cupom inválido', 'error');
      }
    });
  }

  // Máscara CEP
  if (cepResumo) {
    cepResumo.addEventListener('input', (e) => {
      let valor = e.target.value.replace(/\D/g, '');
      if (valor.length > 5) {
        valor = valor.substring(0, 5) + '-' + valor.substring(5, 8);
      }
      e.target.value = valor;
    });
  }

  // Calcular frete
  if (btnCalcularResumo && cepResumo && resultadoFrete) {
    btnCalcularResumo.addEventListener('click', () => {
      const cep = cepResumo.value.replace(/\D/g, '');

      if (cep.length !== 8) {
        mostrarNotificacao('Digite um CEP válido', 'warning');
        return;
      }

      btnCalcularResumo.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      `;
      btnCalcularResumo.disabled = true;

      setTimeout(() => {
        const opcoes = calcularOpcoesFretePorCEP(cep);
        if (!opcoes.length) {
          mostrarNotificacao('Não foi possível calcular o frete', 'error');
          btnCalcularResumo.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          `;
          btnCalcularResumo.disabled = false;
          return;
        }

        const melhorPreco = opcoes.reduce((acc, o) => (o.valor < acc.valor ? o : acc), opcoes[0]);
        const maisRapido = opcoes.reduce((acc, o) => (o.prazo < acc.prazo ? o : acc), opcoes[0]);

        freteCalculado = { ...melhorPreco };

        resultadoFrete.innerHTML = opcoes
          .map((o) => {
            const isSelected = o.id === freteCalculado.id;
            const tags = [
              o.id === melhorPreco.id ? '<span class="frete-tag frete-tag-preco">Melhor preço</span>' : '',
              o.id === maisRapido.id ? '<span class="frete-tag frete-tag-rapido">Mais rápido</span>' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return `
              <button type="button" class="opcao-frete opcao-frete-select ${isSelected ? 'is-selected' : ''}" data-frete-id="${String(
                o.id
              )}" aria-pressed="${isSelected ? 'true' : 'false'}">
                <div class="opcao-info">
                  <strong>${o.label} ${tags ? `<span style="margin-left:8px;">${tags}</span>` : ''}</strong>
                  <span>${o.prazo} dias úteis</span>
                </div>
                <span class="opcao-preco">${formatPrice(o.valor)}</span>
              </button>
            `;
          })
          .join('');

        resultadoFrete.querySelectorAll('[data-frete-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = String(btn.getAttribute('data-frete-id') || '');
            const chosen = opcoes.find((x) => String(x.id) === id);
            if (!chosen) return;
            freteCalculado = { ...chosen };

            resultadoFrete.querySelectorAll('[data-frete-id]').forEach((b) => {
              const bid = String(b.getAttribute('data-frete-id') || '');
              const active = bid === String(chosen.id);
              b.classList.toggle('is-selected', active);
              b.setAttribute('aria-pressed', active ? 'true' : 'false');
            });

            atualizarTotais();
          });
        });

        resultadoFrete.style.display = 'block';

        atualizarTotais();

        btnCalcularResumo.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        `;
        btnCalcularResumo.disabled = false;

        mostrarNotificacao('Frete calculado com sucesso!', 'success');
      }, 2000);
    });
  }

  // Função para calcular opções de frete por CEP (heurística simples)
  function calcularOpcoesFretePorCEP(cep) {
    const prefixo = cep.substring(0, 2);
    const regioes = {
      sudeste: {
        ceps: [
          '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
          '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24',
          '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36',
          '37', '38', '39'
        ],
        valor: 12.5,
        prazo: 7
      },
      sul: {
        ceps: [
          '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91',
          '92', '93', '94', '95', '96', '97', '98', '99'
        ],
        valor: 15.8,
        prazo: 10
      },
      centroOeste: {
        ceps: ['70', '71', '72', '73', '74', '75', '76', '78', '79'],
        valor: 18.9,
        prazo: 12
      },
      nordeste: {
        ceps: [
          '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51',
          '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63',
          '64', '65'
        ],
        valor: 22.3,
        prazo: 14
      },
      norte: {
        ceps: ['66', '67', '68', '69', '77'],
        valor: 28.5,
        prazo: 18
      }
    };

    let base = null;
    for (const regiao in regioes) {
      if (regioes[regiao].ceps.includes(prefixo)) {
        base = regioes[regiao];
        break;
      }
    }

    if (!base) base = { valor: 15.0, prazo: 10 };

    const pac = {
      id: 'pac',
      label: 'PAC',
      valor: Number(base.valor) || 0,
      prazo: Number(base.prazo) || 0
    };

    const ecoValor = Math.round(pac.valor * 0.9 * 100) / 100;
    const ecoPrazo = Math.max(3, Math.round(pac.prazo * 1.25));
    const economico = {
      id: 'economico',
      label: '💸 Econômico',
      valor: ecoValor,
      prazo: ecoPrazo
    };

    const sedexValor = Math.round(pac.valor * 1.35 * 100) / 100;
    const sedexPrazo = Math.max(2, Math.round(pac.prazo * 0.65));
    const sedex = {
      id: 'sedex',
      label: '⚡ SEDEX',
      valor: sedexValor,
      prazo: sedexPrazo
    };

    return [economico, pac, sedex].filter(
      (o) => Number.isFinite(o.valor) && o.valor >= 0 && Number.isFinite(o.prazo) && o.prazo > 0
    );
  }

  // Limpar carrinho
  if (limparCarrinhoBtn) {
    limparCarrinhoBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente limpar todo o carrinho?')) {
        carrinho = [];
        salvarCarrinho();
        renderizarCarrinho();
        cupomAplicado = null;
        freteCalculado = null;
        if (cupomInput) cupomInput.disabled = false;
        if (aplicarCupomBtn) {
          aplicarCupomBtn.disabled = false;
          aplicarCupomBtn.textContent = 'Aplicar';
        }
        if (resultadoFrete) {
          resultadoFrete.style.display = 'none';
          resultadoFrete.innerHTML = '';
        }
        mostrarNotificacao('Carrinho limpo', 'info');
      }
    });
  }

  // Finalizar pedido
  if (finalizarPedidoBtn) {
    finalizarPedidoBtn.addEventListener('click', () => {
      if (!carrinho.length) {
        mostrarNotificacao('Adicione produtos ao carrinho primeiro', 'warning');
        return;
      }

      const itensAgrupados = agruparItens();
      const subtotal = calcularSubtotal();
      const desconto = calcularDesconto(subtotal);
      const frete = freteCalculado ? freteCalculado.valor : 0;
      const total = subtotal - desconto + frete;

      const dadosPagamento = {
        itens: itensAgrupados,
        subtotal,
        desconto,
        frete,
        total,
        cupom: cupomAplicado
          ? Object.keys(cuponsDisponiveis).find((key) => cuponsDisponiveis[key] === cupomAplicado)
          : null
      };

      try {
        sessionStorage.setItem('dadosPagamento', JSON.stringify(dadosPagamento));
      } catch {
        // se não conseguir salvar, ainda assim tenta seguir
      }

      window.location.href = 'pagamento.html';
    });
  }

  // Sistema de notificações
  function mostrarNotificacao(mensagem, tipo = 'info') {
    const notifAnterior = document.querySelector('.notificacao');
    if (notifAnterior) {
      notifAnterior.remove();
    }

    const notif = document.createElement('div');
    notif.className = `notificacao notificacao-${tipo}`;

    const icones = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };

    notif.innerHTML = `
      <span class="notificacao-icone">${icones[tipo] || 'i'}</span>
      <span class="notificacao-mensagem">${mensagem}</span>
    `;

    document.body.appendChild(notif);

    setTimeout(() => notif.classList.add('notificacao-show'), 10);

    setTimeout(() => {
      notif.classList.remove('notificacao-show');
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // ============================
  // Rastreio do último pedido
  // ============================

  function getUltimoPedidoId() {
    try {
      const raw = localStorage.getItem('ultimoPedidoId');
      const id = String(raw || '').trim();
      return id || null;
    } catch {
      return null;
    }
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

  function getPedidosLocal() {
    try {
      const raw = localStorage.getItem('pedidos');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function findPedidoPreferServerById(pedidoId) {
    const server = await fetchJSON('/api/pedidos');
    if (Array.isArray(server)) {
      const found = server.find((p) => String(p?.id ?? p?.codigo ?? '') === String(pedidoId));
      if (found) return found;
    }

    const local = getPedidosLocal();
    return local.find((p) => String(p?.id ?? p?.codigo ?? '') === String(pedidoId)) || null;
  }

  function buildRastreaeUrl(codigo) {
    const base = 'https://rastreae.com.br/busca';
    const q = encodeURIComponent(String(codigo || '').trim());
    if (!q) return base;
    return `${base}?q=${q}&codigo=${q}&tracking=${q}#${q}`;
  }

  function getCodigoRastreio(pedido) {
    const v = pedido && typeof pedido.codigoRastreio === 'string' ? pedido.codigoRastreio : '';
    const trimmed = String(v || '').trim();
    return trimmed || null;
  }

  async function copiarTexto(texto) {
    const t = String(texto || '').trim();
    if (!t) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {
      // fallback abaixo
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function mostrarRastreioUltimoPedido() {
    const card = document.getElementById('rastreio-card');
    const placeholderVazio = document.getElementById('rastreio-placeholder-vazio');
    const placeholderResumo = document.getElementById('rastreio-placeholder-resumo');
    const pedidoIdEl = document.getElementById('rastreio-pedido-id');
    const statusEl = document.getElementById('rastreio-status');
    const codigoEl = document.getElementById('rastreio-codigo');
    const btnCopiar = document.getElementById('btn-copiar-codigo-rastreio');
    const btnAbrirRastreae = document.getElementById('btn-abrir-rastreae-carrinho');

    if (!card || !pedidoIdEl || !statusEl || !codigoEl || !btnCopiar || !btnAbrirRastreae) return;

    const target = Array.isArray(carrinho) && carrinho.length > 0 ? placeholderResumo : placeholderVazio;
    if (target && card.parentElement !== target) {
      target.appendChild(card);
    }

    const pedidoId = getUltimoPedidoId();
    if (!pedidoId) return;

    card.style.display = 'block';
    pedidoIdEl.textContent = pedidoId;
    statusEl.textContent = 'Carregando...';
    codigoEl.textContent = '—';
    btnCopiar.disabled = true;

    btnAbrirRastreae.setAttribute('href', 'https://rastreae.com.br/busca');
    btnAbrirRastreae.removeAttribute('aria-disabled');
    btnAbrirRastreae.style.pointerEvents = '';
    btnAbrirRastreae.style.opacity = '';

    const pedido = await findPedidoPreferServerById(pedidoId);
    if (!pedido) {
      statusEl.textContent = 'Pedido não encontrado';
      return;
    }

    statusEl.textContent = String(pedido.status || '—');
    const codigo = getCodigoRastreio(pedido);
    codigoEl.textContent = codigo || '—';
    btnCopiar.disabled = !codigo;

    if (codigo) {
      btnAbrirRastreae.setAttribute('href', buildRastreaeUrl(codigo));
    }

    btnCopiar.addEventListener('click', async () => {
      if (!codigo) return;
      const ok = await copiarTexto(codigo);
      if (ok) mostrarNotificacao('Código de rastreio copiado!', 'success');
      else mostrarNotificacao('Não foi possível copiar o código', 'error');
    });

    btnAbrirRastreae.addEventListener('click', async () => {
      if (!codigo) return;
      await copiarTexto(codigo);
    });
  }

  // Inicializar carrinho e rastreio
  carregarCarrinho();
  mostrarRastreioUltimoPedido();
});
