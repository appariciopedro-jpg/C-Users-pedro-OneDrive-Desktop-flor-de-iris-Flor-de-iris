// Atualiza contadores de itens do carrinho em qualquer página
function atualizarCarrinho() {
  try {
    const carrinhoRaw = localStorage.getItem('carrinho');
    const carrinho = carrinhoRaw ? JSON.parse(carrinhoRaw) : [];
    const total = Array.isArray(carrinho) ? carrinho.length : 0;

    const headerCount = document.getElementById('carrinho-count-header');
    if (headerCount) {
      headerCount.textContent = String(total);
    }

    const sidebarCount = document.getElementById('carrinho-count-sidebar');
    if (sidebarCount) {
      sidebarCount.textContent = String(total);
    }
  } catch {
    const headerCount = document.getElementById('carrinho-count-header');
    if (headerCount) headerCount.textContent = '0';
    const sidebarCount = document.getElementById('carrinho-count-sidebar');
    if (sidebarCount) sidebarCount.textContent = '0';
  }
}

// Animações de entrada
document.addEventListener("DOMContentLoaded", () => {
  // Verificar login do usuário (nem todas as páginas carregam auth.js)
  if (typeof verificarLoginHeader === 'function') {
    verificarLoginHeader();
  }
  
  // Animação de scroll reveal
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  let observer = null;
  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, observerOptions);
  } catch {
    observer = null;
  }

  // Observar elementos para animação
  const elements = document.querySelectorAll(".trust-badge, .beneficio-card, .depoimento-card, .sobre-content, .cta-section, .processo-step, .ingrediente-card");
  elements.forEach(el => {
    el.classList.add("fade-in");
    if (observer) {
      observer.observe(el);
    } else {
      // Fallback: garante conteúdo visível mesmo sem observer
      el.classList.add("visible");
    }
  });

  // Fallback extra: se por algum motivo o observer não disparar,
  // libera os elementos após um curto tempo para evitar “tela em branco”.
  setTimeout(() => {
    document.querySelectorAll('.fade-in:not(.visible)').forEach((el) => {
      el.classList.add('visible');
    });
  }, 1200);

  // Failsafe do HERO (topo da home): em alguns ambientes as animações podem travar
  // e manter o hero com opacity 0 (por causa do animation-fill-mode: both).
  // Se isso acontecer, força visibilidade.
  setTimeout(() => {
    try {
      const heroEls = document.querySelectorAll(
        '.hero-badge-premium, .hero-mega-title, .hero-premium-description, .hero-cta-buttons, .hero-stats-modern, .hero-visual-side'
      );

      let foundHidden = false;
      heroEls.forEach((el) => {
        const cs = window.getComputedStyle(el);
        const opacity = Number(cs.opacity);
        if (Number.isFinite(opacity) && opacity < 0.2) {
          foundHidden = true;
        }
      });

      if (foundHidden) {
        heroEls.forEach((el) => el.classList.add('force-visible'));
      }
    } catch {
      // ignore
    }
  }, 1600);

  // Contador animado para estatísticas
  const counters = document.querySelectorAll('.counter');

  let counterObserver = null;
  try {
    counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          animateCounter(entry.target);
          entry.target.classList.add('counted');
        }
      });
    }, { threshold: 0.5 });
  } catch {
    counterObserver = null;
  }

  counters.forEach(counter => {
    if (counterObserver) {
      counterObserver.observe(counter);
    } else {
      // Fallback: anima imediatamente
      try {
        animateCounter(counter);
        counter.classList.add('counted');
      } catch {
        // ignore
      }
    }
  });

  // Carregar produtos em destaque
  carregarProdutosDestaque();

  // Atualizar contador do carrinho (header / sidebar) com base no localStorage
  try {
    atualizarCarrinho();
  } catch {
    // se algo der errado aqui, não quebra o restante da página
  }
  
  // Smooth scroll para âncoras
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Adicionar parallax leve no hero
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
      heroImage.style.transform = `translateY(${scrolled * 0.18}px) translateZ(0)`;
    }
  });
});

// Função para animar contadores
function animateCounter(element) {
  const target = parseInt(element.parentElement.dataset.target) || parseInt(element.textContent);
  if (isNaN(target)) return;
  
  const duration = 2000; // 2 segundos
  const step = Math.ceil(target / (duration / 16)); // 60 FPS
  let current = 0;
  
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = current;
    }
  }, 16);
}

// Carregar produtos do localStorage para exibir em destaque
function carregarProdutosDestaque() {
  const produtos = JSON.parse(localStorage.getItem("produtos")) || [];
  const container = document.getElementById("produtos-destaque");
  
  if (!container) return;
  
  // Se não houver produtos no localStorage, mostrar produtos padrão
  if (produtos.length === 0) {
    container.innerHTML = `
      <div class="card">
        <img src="images/sabonete-lavanda.svg" alt="Sabonete Lavanda" loading="lazy" decoding="async">
        <div class="card-info">
          <h4>Sabonete de Lavanda</h4>
          <p class="preco">R$ 14,90</p>
        </div>
        <a href="produtos.html" class="btn-card">Ver Produtos</a>
      </div>
      <div class="card">
        <img src="images/sabonete-rosas.svg" alt="Sabonete Rosa" loading="lazy" decoding="async">
        <div class="card-info">
          <h4>Sabonete de Rosas</h4>
          <p class="preco">R$ 13,90</p>
        </div>
        <a href="produtos.html" class="btn-card">Ver Produtos</a>
      </div>
      <div class="card">
        <img src="images/sabonete-natural.svg" alt="Sabonete Natural" loading="lazy" decoding="async">
        <div class="card-info">
          <h4>Sabonete Natural</h4>
          <p class="preco">R$ 12,90</p>
        </div>
        <a href="produtos.html" class="btn-card">Ver Produtos</a>
      </div>
    `;
    return;
  }
  
  // Mostrar até 3 produtos
  const produtosDestaque = produtos.slice(0, 3);
  container.innerHTML = "";
  
  produtosDestaque.forEach(p => {
    const precoFormatado = Number(p.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}">
      <div class="card-info">
        <h4>${p.nome}</h4>
        <p class="preco">${precoFormatado}</p>
      </div>
      <a href="produtos.html" class="btn-card">Ver Produto</a>
    `;
    container.appendChild(card);
  });
}

// Verificar login no header
function verificarLoginHeader() {
  const btnUsuario = document.getElementById('btn-usuario');
  if (!btnUsuario) return;
  
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  
  if (usuarioLogado) {
    btnUsuario.textContent = 'Minha conta';
    btnUsuario.href = '#';
    btnUsuario.onclick = (e) => {
      e.preventDefault();
      mostrarMenuUsuario();
    };
  } else {
    btnUsuario.textContent = 'Entrar';
    btnUsuario.href = 'login.html';
    btnUsuario.onclick = null;
  }
}

// Newsletter (home): salva e-mail localmente e mostra feedback
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  const emailInput = document.getElementById('newsletter-email');
  const msg = document.getElementById('newsletter-msg');
  if (!form || !emailInput || !msg) return;

  function setMsg(texto) {
    msg.textContent = String(texto || '');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = String(emailInput.value || '').trim();
    if (!email || !email.includes('@')) {
      setMsg('Informe um e-mail válido.');
      return;
    }

    try {
      localStorage.setItem('newsletterEmail', email);
    } catch {
      // ignore
    }

    emailInput.value = '';
    setMsg('Cadastro realizado.');
  });
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsletter);
  } else {
    initNewsletter();
  }
} catch {
  // ignore
}

function mostrarMenuUsuario() {
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  
  // Criar menu dropdown
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;top:70px;right:20px;background:rgba(255,255,255,0.98);border-radius:14px;box-shadow:0 18px 44px rgba(0,0,0,0.18);padding:10px;z-index:10000;min-width:220px;border:1px solid rgba(0,0,0,0.12);';
  
  menu.innerHTML = `
    <div style="padding:15px;border-bottom:1px solid rgba(0,0,0,0.08);">
      <div style="font-weight:800;color:rgba(31,31,31,0.92);">${usuarioLogado.nome}</div>
      <div style="font-size:0.85em;color:#666;margin-top:3px;">@${usuarioLogado.usuario}</div>
    </div>
    <a href="perfil.html" style="display:block;padding:12px 15px;color:#333;text-decoration:none;border-radius:8px;transition:all 0.2s;">
      Meu perfil
    </a>
    <a href="perfil.html#pedidos" style="display:block;padding:12px 15px;color:#333;text-decoration:none;border-radius:8px;transition:all 0.2s;">
      Meus pedidos
    </a>
    <a href="#" id="menu-rastreio-link" style="display:block;padding:12px 15px;color:#333;text-decoration:none;border-radius:8px;transition:all 0.2s;">
      Rastrear pedidos ▸
    </a>
    <div id="menu-rastreio-opcoes" style="display:none;padding:4px 0 4px 0;border-radius:8px;">
      <a href="https://rastreae.com.br/busca" target="_blank" rel="noopener noreferrer" style="display:block;padding:8px 15px 8px 28px;color:#333;text-decoration:none;border-radius:8px;transition:all 0.2s;">
        Rastrear no site
      </a>
      <a href="https://api.whatsapp.com/send/?phone=554498642644&text=Ol%C3%A1,%20preciso%20de%20ajuda%20para%20rastrear%20meu%20pedido" target="_blank" rel="noopener noreferrer" style="display:block;padding:8px 15px 8px 28px;color:#333;text-decoration:none;border-radius:8px;transition:all 0.2s;">
        Ajuda com rastreio (WhatsApp)
      </a>
    </div>
    <a href="#" onclick="fazerLogoutMenu(event)" style="display:block;padding:12px 15px;color:#f44336;text-decoration:none;border-radius:8px;transition:all 0.2s;">
      Sair
    </a>
  `;
  
  // Adicionar hover aos links
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.background = '#f9f7fc';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = 'transparent';
    });
  });

  // Toggle das opções de rastreio
  const rastrearLink = menu.querySelector('#menu-rastreio-link');
  const rastrearBox = menu.querySelector('#menu-rastreio-opcoes');
  if (rastrearLink && rastrearBox) {
    rastrearLink.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = rastrearBox.style.display === 'block';
      rastrearBox.style.display = isOpen ? 'none' : 'block';
    });
  }
  
  document.body.appendChild(menu);
  
  // Fechar ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function fecharMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', fecharMenu);
      }
    });
  }, 100);
}

function fazerLogoutMenu(e) {
  e.preventDefault();
  if (confirm('Deseja sair da sua conta?')) {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
  }
}
