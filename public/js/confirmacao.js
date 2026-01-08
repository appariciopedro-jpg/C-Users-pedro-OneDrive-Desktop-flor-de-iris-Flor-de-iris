(function () {
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
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
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
      const found = server.find(p => String(p?.id ?? p?.codigo ?? '') === String(pedidoId));
      if (found) return found;
    }

    const local = getPedidosLocal();
    return local.find(p => String(p?.id ?? p?.codigo ?? '') === String(pedidoId)) || null;
  }

  function getCodigoRastreio(pedido) {
    const v = pedido && typeof pedido.codigoRastreio === 'string' ? pedido.codigoRastreio : '';
    const trimmed = String(v || '').trim();
    return trimmed || null;
  }

  function buildRastreaeUrl(codigo) {
    const base = 'https://rastreae.com.br/busca';
    const q = encodeURIComponent(String(codigo || '').trim());
    if (!q) return base;
    return `${base}?q=${q}&codigo=${q}&tracking=${q}#${q}`;
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

  async function init() {
    const pedidoIdEl = document.getElementById('confirmacao-pedido-id');
    const statusEl = document.getElementById('confirmacao-status');
    const codigoEl = document.getElementById('confirmacao-codigo');
    const nomeClienteEl = document.getElementById('confirmacao-cliente-nome');
    const cpfClienteEl = document.getElementById('confirmacao-cliente-cpf');
    const enderecoClienteEl = document.getElementById('confirmacao-cliente-endereco');
    const cepClienteEl = document.getElementById('confirmacao-cliente-cep');
    const cidadeClienteEl = document.getElementById('confirmacao-cliente-cidade');
    const btnCopiar = document.getElementById('btn-copiar-codigo-rastreio-confirmacao');
    const btnAbrirRastreae = document.getElementById('btn-abrir-rastreae-confirmacao');

    const pedidoId = getUltimoPedidoId();
    if (pedidoIdEl) pedidoIdEl.textContent = pedidoId || '—';

    if (btnAbrirRastreae) {
      // Sempre deixa o botão funcional (mesmo sem código)
      btnAbrirRastreae.setAttribute('href', 'https://rastreae.com.br/busca');
      btnAbrirRastreae.removeAttribute('aria-disabled');
      btnAbrirRastreae.style.pointerEvents = '';
      btnAbrirRastreae.style.opacity = '';
    }

    if (!pedidoId) {
      if (statusEl) statusEl.textContent = '—';
      if (codigoEl) codigoEl.textContent = '—';
      if (btnCopiar) btnCopiar.disabled = true;
      return;
    }

    const pedido = await findPedidoPreferServerById(pedidoId);
    if (!pedido) {
      if (statusEl) statusEl.textContent = 'Pedido não encontrado';
      if (codigoEl) codigoEl.textContent = '—';
      if (nomeClienteEl) nomeClienteEl.textContent = '—';
      if (cpfClienteEl) cpfClienteEl.textContent = '—';
      if (enderecoClienteEl) enderecoClienteEl.textContent = '—';
      if (cepClienteEl) cepClienteEl.textContent = '—';
      if (cidadeClienteEl) cidadeClienteEl.textContent = '—';
      if (btnCopiar) btnCopiar.disabled = true;
      return;
    }

    if (statusEl) statusEl.textContent = String(pedido.status || '—');

    // Preencher dados de entrega do cliente, se existirem
    const cliente = pedido.cliente || {};
    const enderecoLinha = [cliente.endereco, cliente.complemento].filter(Boolean).join(', ');
    const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/');

    if (nomeClienteEl) nomeClienteEl.textContent = cliente.nome || '—';
    if (cpfClienteEl) cpfClienteEl.textContent = (cliente.cpf || '').toString().trim() || '—';
    if (enderecoClienteEl) enderecoClienteEl.textContent = enderecoLinha || '—';
    if (cepClienteEl) cepClienteEl.textContent = (cliente.cep || '').toString().trim() || '—';
    if (cidadeClienteEl) cidadeClienteEl.textContent = cidadeUf || '—';

    const codigo = getCodigoRastreio(pedido);
    if (codigoEl) codigoEl.textContent = codigo || '—';
    if (btnCopiar) {
      btnCopiar.disabled = !codigo;
      btnCopiar.addEventListener('click', async () => {
        if (!codigo) return;
        const ok = await copiarTexto(codigo);
        if (ok) {
          alert('Código de rastreio copiado.');
        } else {
          alert('Não foi possível copiar o código.');
        }
      });
    }

    if (btnAbrirRastreae) {
      if (codigo) {
        btnAbrirRastreae.setAttribute('href', buildRastreaeUrl(codigo));
        btnAbrirRastreae.addEventListener('click', async () => {
          // Copia junto para facilitar colar no Rastreae.
          await copiarTexto(codigo);
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

