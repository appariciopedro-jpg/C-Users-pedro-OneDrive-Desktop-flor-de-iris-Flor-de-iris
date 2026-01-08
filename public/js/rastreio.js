(function () {
  const RASTREIO_URL = 'https://rastreae.com.br/busca';
  const JADLOG_URL = 'https://www.jadlog.com.br/jadlog/home';
  const JADLOG_LOGO_URL = 'https://www.jadlog.com.br/jadlog/img/logo_footer1.jpg';

  function buildRastreaeUrl(codigo) {
    const q = encodeURIComponent(String(codigo || '').trim());
    if (!q) return RASTREIO_URL;
    return `${RASTREIO_URL}?q=${q}&codigo=${q}&tracking=${q}#${q}`;
  }

  function getUltimoPedidoId() {
    try {
      const raw = localStorage.getItem('ultimoPedidoId');
      const id = String(raw || '').trim();
      return id || null;
    } catch {
      return null;
    }
  }

  function getCpfUsuarioLogado() {
    try {
      const sessao = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
      if (!sessao || !sessao.id) return null;
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      const u = Array.isArray(usuarios) ? usuarios.find(x => x && x.id === sessao.id) : null;
      const cpf = String(u?.cpf || '').trim();
      return cpf || null;
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

  function normalizeCodigoRastreioFromPedido(pedido) {
    const v = pedido && typeof pedido.codigoRastreio === 'string' ? pedido.codigoRastreio : '';
    const trimmed = String(v || '').trim();
    return trimmed || null;
  }

  function getSortablePedidoKey(pedido) {
    // Preferência: timestamp numérico, depois id.
    const ts = Number(pedido?.timestamp);
    if (Number.isFinite(ts) && ts > 0) return ts;
    const id = Number(pedido?.id);
    if (Number.isFinite(id) && id > 0) return id;
    return 0;
  }

  async function findLatestPedidoWithTrackingPreferServer(cpf) {
    const cpfStr = String(cpf || '').trim();
    if (!cpfStr) return null;

    const server = await fetchJSON('/api/pedidos');
    const list = Array.isArray(server) ? server : getPedidosLocal();
    const mine = list.filter(p => String(p?.cliente?.cpf || '').trim() === cpfStr);
    const withCode = mine
      .map(p => ({ pedido: p, codigo: normalizeCodigoRastreioFromPedido(p), key: getSortablePedidoKey(p) }))
      .filter(x => Boolean(x.codigo));

    if (!withCode.length) return null;
    withCode.sort((a, b) => (b.key - a.key));
    return withCode[0].pedido || null;
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
    return normalizeCodigoRastreioFromPedido(pedido);
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

  function buildPopover() {
    const pop = document.createElement('div');
    pop.className = 'rastreio-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Rastreio');

    pop.innerHTML = `
      <div class="rastreio-popover-inner">
        <div class="rastreio-popover-title">Rastreio</div>
        <a class="rastreio-logo-link rastreio-rastreae-link" href="${RASTREIO_URL}" target="_blank" rel="noopener noreferrer" aria-label="Abrir rastreio (Rastreae)">
          <span class="rastreio-logo" aria-hidden="true">
            <img class="rastreio-logo-img" src="https://rastreae.com.br/favicon.ico" alt="">
          </span>
          <span class="rastreio-logo-text">
            <span class="rastreio-logo-name">Abrir Rastreae</span>
            <span class="rastreio-logo-sub">rastreae.com.br</span>
          </span>
        </a>

        <a class="rastreio-logo-link rastreio-jadlog-link" href="${JADLOG_URL}" target="_blank" rel="noopener noreferrer" aria-label="Abrir rastreio (Jadlog)">
          <span class="rastreio-logo" aria-hidden="true">
            <img class="rastreio-logo-img" src="${JADLOG_LOGO_URL}" alt="">
          </span>
          <span class="rastreio-logo-text">
            <span class="rastreio-logo-name">Abrir Jadlog</span>
            <span class="rastreio-logo-sub">jadlog.com.br</span>
          </span>
        </a>

        <div class="rastreio-code">
          <div class="rastreio-code-label">Último código</div>
          <div class="rastreio-code-row">
            <span class="rastreio-code-value">—</span>
            <button class="rastreio-code-copy" type="button" disabled>Copiar</button>
          </div>
          <div class="rastreio-code-hint">O código aparece quando o pedido for marcado como <strong>Enviado</strong>.</div>
        </div>
      </div>
    `.trim();

    return pop;
  }

  async function hydratePopoverWithLastTracking(popover) {
    if (!popover) return;
    const linkRastreae = popover.querySelector('.rastreio-rastreae-link');
    const linkJadlog = popover.querySelector('.rastreio-jadlog-link');
    const valueEl = popover.querySelector('.rastreio-code-value');
    const btnCopy = popover.querySelector('.rastreio-code-copy');
    if (!(linkRastreae instanceof HTMLAnchorElement) || !(linkJadlog instanceof HTMLAnchorElement) || !valueEl || !(btnCopy instanceof HTMLButtonElement)) return;

    valueEl.textContent = 'Carregando...';
    btnCopy.disabled = true;
    linkRastreae.href = RASTREIO_URL;
    linkJadlog.href = JADLOG_URL;

    // Estratégia:
    // 1) Se existir ultimoPedidoId, tenta usar esse pedido.
    // 2) Se estiver logado, tenta achar o pedido mais recente do usuário que já tenha codigoRastreio.
    let pedido = null;
    const pedidoId = getUltimoPedidoId();
    if (pedidoId) {
      pedido = await findPedidoPreferServerById(pedidoId);
    }

    let codigo = pedido ? getCodigoRastreio(pedido) : null;
    if (!codigo) {
      const cpf = getCpfUsuarioLogado();
      const p2 = cpf ? await findLatestPedidoWithTrackingPreferServer(cpf) : null;
      if (p2) {
        pedido = p2;
        codigo = getCodigoRastreio(pedido);
      }
    }

    if (!pedidoId && !pedido && !codigo) {
      // Sem referência e sem sessão: mostra vazio.
      valueEl.textContent = '—';
      btnCopy.disabled = true;
      linkRastreae.href = RASTREIO_URL;
      linkJadlog.href = JADLOG_URL;
      return;
    }

    valueEl.textContent = codigo || '—';
    btnCopy.disabled = !codigo;
    linkRastreae.href = codigo ? buildRastreaeUrl(codigo) : RASTREIO_URL;
    linkJadlog.href = JADLOG_URL;

    btnCopy.onclick = async () => {
      if (!codigo) return;
      const ok = await copiarTexto(codigo);
      if (ok) {
        btnCopy.textContent = 'Copiado!';
        setTimeout(() => {
          btnCopy.textContent = 'Copiar';
        }, 900);
      }
    };

    linkRastreae.addEventListener('click', () => {
      if (!codigo) return;
      copiarTexto(codigo).catch(() => {});
    });

    linkJadlog.addEventListener('click', () => {
      if (!codigo) return;
      copiarTexto(codigo).catch(() => {});
    });
  }

  function positionPopover(popover, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const gap = 10;

    // Default: abaixo e alinhado à direita do anchor
    let top = rect.bottom + gap;
    let left = rect.right - popover.offsetWidth;

    // Ajuste se sair da tela
    const padding = 10;
    if (left < padding) left = padding;
    if (left + popover.offsetWidth > window.innerWidth - padding) {
      left = window.innerWidth - padding - popover.offsetWidth;
    }

    if (top + popover.offsetHeight > window.innerHeight - padding) {
      top = rect.top - gap - popover.offsetHeight;
    }
    if (top < padding) top = padding;

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function setup() {
    const anchors = Array.from(document.querySelectorAll('.order-track-mini[data-rastreio]'));
    if (!anchors.length) return;

    let popover = null;

    function close() {
      if (!popover) return;
      popover.remove();
      popover = null;
    }

    function onDocClick(e) {
      if (!popover) return;
      const t = e.target;
      if (t instanceof Node && popover.contains(t)) return;
      // Se clicou no próprio botão de rastrear, o handler dele cuida do toggle
      close();
    }

    function ensurePopover(anchor) {
      if (popover) return popover;
      popover = buildPopover();
      document.body.appendChild(popover);

      // Vincula com o último código (se existir)
      hydratePopoverWithLastTracking(popover);

      // Precisa medir depois de inserir
      positionPopover(popover, anchor);

      // Fecha ao apertar ESC
      const onKey = (ev) => {
        if (ev.key === 'Escape') close();
      };
      popover._onKey = onKey;
      document.addEventListener('keydown', onKey);

      // clique fora
      setTimeout(() => document.addEventListener('click', onDocClick), 0);

      // reposiciona em resize/scroll
      const onReflow = () => {
        if (popover) positionPopover(popover, anchor);
      };
      popover._onReflow = onReflow;
      window.addEventListener('resize', onReflow);
      window.addEventListener('scroll', onReflow, true);

      // cleanup ao remover
      const origRemove = popover.remove.bind(popover);
      popover.remove = () => {
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onReflow);
        window.removeEventListener('scroll', onReflow, true);
        origRemove();
      };

      return popover;
    }

    anchors.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();

        if (popover) {
          close();
          return;
        }

        ensurePopover(a);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
