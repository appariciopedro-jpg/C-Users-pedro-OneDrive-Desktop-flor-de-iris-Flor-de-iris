// Configuração global do site (cliente/admin)
// Persistência: localStorage (chave: configAdmin)

(function () {
  // Evita que Service Workers antigos (de versões anteriores do site) prendam o usuário
  // em uma versão desatualizada. O projeto não depende de PWA/offline.
  (async function cleanupServiceWorkerAndCaches() {
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      if (!('serviceWorker' in navigator)) return;

      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // ignora
    }
  })();

  const STORAGE_KEY = 'configAdmin';

  // Valores antigos (usados para migração automática quando o usuário tem configAdmin salvo)
  const LEGACY_DEFAULTS = {
    home: {
      heroDescricao: 'Ingredientes 100% naturais, aromas exclusivos e cuidado especial para sua pele. Cada sabonete é feito à mão com atenção aos detalhes.'
    },
    homeSections: {
      processo: {
        subtitulo: 'Um processo artesanal de amor e dedicação',
        passos: [
          {
            descricao: 'Escolhemos cuidadosamente óleos naturais, manteigas vegetais e botânicos orgânicos'
          },
          {
            descricao: 'Combinamos os ingredientes com técnicas tradicionais, garantindo qualidade'
          },
          {
            descricao: 'Deixamos curar por 30-45 dias para desenvolver a textura perfeita'
          },
          {
            descricao: 'Cada sabonete é embalado à mão com cuidado e carinho especial'
          }
        ]
      }
    }
  };

  const DEFAULTS = {
    nomeLoja: 'Flor de Íris',
    whatsapp: '44 9864-2644',
    email: 'contato@flordeiris.com',
    endereco: 'Rua das Flores, 123',
    localizacao: 'Maringá, PR',
    horarioAtendimento: 'Segunda a Sexta, 9h às 18h',
    pix: {
      chave: 'rodolfo.rags1@gmail.com',
      beneficiario: 'Rodolfo Adriano Goulart',
      cidade: 'Sao Paulo'
    },
    footer: {
      descricao: 'Sabonetes artesanais feitos com ingredientes 100% naturais. Transforme seu banho em um momento especial de autocuidado e bem-estar.',
      copyright: '© 2025 Flor de Íris - Sabonetes Artesanais. Todos os direitos reservados.'
    },
    social: {
      instagramUrl: '#',
      facebookUrl: '#'
    },
    seo: {
      titleSuffix: 'Flor de Íris'
    },
    homeSections: {
      processo: {
        titulo: 'Como Criamos Nossos Sabonetes',
        subtitulo: 'Um processo artesanal com qualidade e cuidado',
        passos: [
          {
            titulo: 'Seleção de Ingredientes',
            descricao: 'Óleos, manteigas vegetais e botânicos escolhidos com critério'
          },
          {
            titulo: 'Mistura Artesanal',
            descricao: 'Técnicas tradicionais para consistência, aroma e suavidade'
          },
          {
            titulo: 'Cura Natural',
            descricao: 'Tempo de cura para firmeza e espuma equilibrada'
          },
          {
            titulo: 'Embalagem com Amor',
            descricao: 'Acabamento e embalagem cuidadosos para chegar perfeito'
          }
        ]
      },
      sobre: {
        titulo: 'Nossa História',
        paragrafo1: 'A Flor de Íris nasceu do amor pela natureza e pelo cuidado com a pele. Criamos sabonetes artesanais premium com ingredientes naturais cuidadosamente selecionados.',
        paragrafo2: 'Cada produto é feito à mão, com receitas exclusivas que combinam botânicos, óleos essenciais e muito carinho. Nossa missão é transformar o cuidado diário em um ritual de bem-estar e amor próprio.'
      }
    },
    home: {
      heroLinha1: 'Sabonetes artesanais',
      heroLinha2: 'que despertam',
      heroLinha3Prefixo: 'bem-estar no',
      heroLinha3Destaque: 'primeiro toque',
      heroDescricao: 'Fórmulas naturais, aromas marcantes e espuma cremosa. Feitos à mão, em pequenos lotes, para transformar o seu banho em um momento de pausa e carinho com a pele.',
      featuredProductIds: []
    },
    notifNovosPedidos: true,
    notifEstoqueBaixo: true,
    notifNovosClientes: true
  };

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(extra)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object') {
        out[k] = deepMerge(base[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function getRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) return null;

      // Migra configs antigas que apenas repetiam os defaults anteriores.
      // Isso evita o efeito: "dou Ctrl+Shift+R e vejo, depois some".
      let changed = false;

      if (parsed?.home?.heroDescricao === LEGACY_DEFAULTS.home.heroDescricao) {
        parsed.home.heroDescricao = DEFAULTS.home.heroDescricao;
        changed = true;
      }

      const legacyProcesso = LEGACY_DEFAULTS.homeSections?.processo;
      const parsedProcesso = parsed?.homeSections?.processo;
      if (legacyProcesso && parsedProcesso) {
        if (parsedProcesso.subtitulo === legacyProcesso.subtitulo) {
          parsedProcesso.subtitulo = DEFAULTS.homeSections.processo.subtitulo;
          changed = true;
        }

        if (Array.isArray(parsedProcesso.passos) && Array.isArray(legacyProcesso.passos)) {
          for (let i = 0; i < 4; i++) {
            const legacyStep = legacyProcesso.passos[i];
            const step = parsedProcesso.passos[i];
            if (step && legacyStep && step.descricao === legacyStep.descricao) {
              step.descricao = DEFAULTS.homeSections.processo.passos[i].descricao;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // ignora
        }
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function get() {
    return deepMerge(DEFAULTS, getRaw() || {});
  }

  function set(next) {
    const current = get();
    const merged = deepMerge(current, next || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function normalizeWhatsappDigits(input) {
    const digits = String(input || '').replace(/\D+/g, '');
    if (!digits) return '';

    // Se já vier com DDI (55), mantém.
    if (digits.startsWith('55') && digits.length >= 12) return digits;

    // Se vier só DDD+numero (10-11), prefixa 55
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;

    return digits;
  }

  function getWhatsappDigits() {
    const cfg = get();
    return normalizeWhatsappDigits(cfg.whatsapp) || normalizeWhatsappDigits(DEFAULTS.whatsapp);
  }

  function applyToDOM() {
    const cfg = get();
    const raw = getRaw() || {};

    const hasNonEmptyText = (v) => {
      if (v === null || v === undefined) return false;
      return String(v).trim().length > 0;
    };

    // SEO (título): se a página usar o padrão "Algo - Sufixo", substitui o sufixo
    const titleSuffix = cfg.seo?.titleSuffix || DEFAULTS.seo.titleSuffix;
    if (titleSuffix && typeof document !== 'undefined' && typeof document.title === 'string' && document.title.includes(' - ')) {
      document.title = document.title.replace(/\s-\s.*$/, ` - ${titleSuffix}`);
    }

    // Nome da loja (texto)
    document.querySelectorAll('[data-site-nome-loja]').forEach(el => {
      el.textContent = cfg.nomeLoja || DEFAULTS.nomeLoja;
    });

    // WhatsApp (texto)
    document.querySelectorAll('[data-site-whatsapp]').forEach(el => {
      el.textContent = cfg.whatsapp || DEFAULTS.whatsapp;
    });

    // WhatsApp (link)
    const waDigits = getWhatsappDigits();
    if (waDigits) {
      document.querySelectorAll('[data-site-whatsapp-link]').forEach(el => {
        try {
          const message = el.getAttribute('data-site-whatsapp-message');
          if (message) {
            el.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
          } else {
            el.href = `https://wa.me/${waDigits}`;
          }
        } catch {
          // ignora
        }
      });
    }

    // E-mail (texto)
    document.querySelectorAll('[data-site-email]').forEach(el => {
      el.textContent = cfg.email || DEFAULTS.email;
    });

    // E-mail (link)
    const email = cfg.email || DEFAULTS.email;
    if (email) {
      document.querySelectorAll('[data-site-email-link]').forEach(el => {
        try {
          el.href = `mailto:${email}`;
        } catch {
          // ignora
        }
      });
    }

    // Endereço / Localização
    document.querySelectorAll('[data-site-endereco]').forEach(el => {
      el.textContent = cfg.endereco || DEFAULTS.endereco;
    });
    document.querySelectorAll('[data-site-localizacao]').forEach(el => {
      el.textContent = cfg.localizacao || DEFAULTS.localizacao;
    });

    // Horário
    document.querySelectorAll('[data-site-horario]').forEach(el => {
      el.textContent = cfg.horarioAtendimento || DEFAULTS.horarioAtendimento;
    });

    // Rodapé
    document.querySelectorAll('[data-site-footer-desc]').forEach(el => {
      el.textContent = cfg.footer?.descricao || DEFAULTS.footer.descricao;
    });
    document.querySelectorAll('[data-site-footer-copy]').forEach(el => {
      el.textContent = cfg.footer?.copyright || DEFAULTS.footer.copyright;
    });

    // Redes sociais
    document.querySelectorAll('[data-site-social-instagram]').forEach(el => {
      try {
        el.href = cfg.social?.instagramUrl || DEFAULTS.social.instagramUrl;
      } catch {
        // ignora
      }
    });
    document.querySelectorAll('[data-site-social-facebook]').forEach(el => {
      try {
        el.href = cfg.social?.facebookUrl || DEFAULTS.social.facebookUrl;
      } catch {
        // ignora
      }
    });

    // Home Hero
    // Importante: não sobrescreve o HTML por padrão.
    // Só aplica se existir configuração salva (raw).
    const h1 = document.getElementById('hero-title-line-1');
    const h2 = document.getElementById('hero-title-line-2');
    const h3p = document.getElementById('hero-title-line-3-prefix');
    const h3h = document.getElementById('hero-title-line-3-highlight');
    const desc = document.getElementById('hero-desc');

    const rawHome = raw.home || {};
    if (h1 && hasNonEmptyText(rawHome.heroLinha1)) h1.textContent = rawHome.heroLinha1;
    if (h2 && hasNonEmptyText(rawHome.heroLinha2)) h2.textContent = rawHome.heroLinha2;
    if (h3p && hasNonEmptyText(rawHome.heroLinha3Prefixo)) h3p.textContent = rawHome.heroLinha3Prefixo;
    if (h3h && hasNonEmptyText(rawHome.heroLinha3Destaque)) h3h.textContent = rawHome.heroLinha3Destaque;
    if (desc && hasNonEmptyText(rawHome.heroDescricao)) desc.textContent = rawHome.heroDescricao;

    // Home - Processo (só aplica se estiver salvo no raw)
    const processoTituloEl = document.getElementById('home-processo-titulo');
    const processoSubEl = document.getElementById('home-processo-subtitulo');

    const rawProcesso = raw.homeSections?.processo || {};
    if (processoTituloEl && hasNonEmptyText(rawProcesso.titulo)) processoTituloEl.textContent = rawProcesso.titulo;
    if (processoSubEl && hasNonEmptyText(rawProcesso.subtitulo)) processoSubEl.textContent = rawProcesso.subtitulo;

    for (let i = 1; i <= 4; i++) {
      const t = document.getElementById(`home-processo-passo-${i}-titulo`);
      const d = document.getElementById(`home-processo-passo-${i}-desc`);
      const rawStep = rawProcesso?.passos?.[i - 1];

      if (t && hasNonEmptyText(rawStep?.titulo)) t.textContent = rawStep.titulo;
      if (d && hasNonEmptyText(rawStep?.descricao)) d.textContent = rawStep.descricao;
    }

    // Home - Sobre (só aplica se estiver salvo no raw)
    const sobreTituloEl = document.getElementById('home-sobre-titulo');
    const sobreP1El = document.getElementById('home-sobre-p1');
    const sobreP2El = document.getElementById('home-sobre-p2');

    const rawSobre = raw.homeSections?.sobre || {};
    if (sobreTituloEl && hasNonEmptyText(rawSobre.titulo)) sobreTituloEl.textContent = rawSobre.titulo;
    if (sobreP1El && hasNonEmptyText(rawSobre.paragrafo1)) sobreP1El.textContent = rawSobre.paragrafo1;
    if (sobreP2El && hasNonEmptyText(rawSobre.paragrafo2)) sobreP2El.textContent = rawSobre.paragrafo2;

    // Pagamento (chave pix)
    const chavePixEl = document.getElementById('chave-pix');
    if (chavePixEl) chavePixEl.textContent = cfg.pix?.chave || DEFAULTS.pix.chave;
  }

  window.SiteConfig = {
    DEFAULTS,
    get,
    set,
    applyToDOM,
    normalizeWhatsappDigits,
    getWhatsappDigits
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyToDOM();
  });
})();
// Configuração global do site (cliente/admin)
// Persistência: localStorage (chave: configAdmin)

(function () {
  // Evita que Service Workers antigos (de versões anteriores do site) prendam o usuário
  // em uma versão desatualizada. O projeto não depende de PWA/offline.
  (async function cleanupServiceWorkerAndCaches() {
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      if (!('serviceWorker' in navigator)) return;

      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // ignora
    }
  })();

  const STORAGE_KEY = 'configAdmin';

  // Valores antigos (usados para migração automática quando o usuário tem configAdmin salvo)
  const LEGACY_DEFAULTS = {
    home: {
      heroDescricao: 'Ingredientes 100% naturais, aromas exclusivos e cuidado especial para sua pele. Cada sabonete é feito à mão com atenção aos detalhes.'
    },
    homeSections: {
      processo: {
        subtitulo: 'Um processo artesanal de amor e dedicação',
        passos: [
          {
            descricao: 'Escolhemos cuidadosamente óleos naturais, manteigas vegetais e botânicos orgânicos'
          },
          {
            descricao: 'Combinamos os ingredientes com técnicas tradicionais, garantindo qualidade'
          },
          {
            descricao: 'Deixamos curar por 30-45 dias para desenvolver a textura perfeita'
          },
          {
            descricao: 'Cada sabonete é embalado à mão com cuidado e carinho especial'
          }
        ]
      }
    }
  };

  const DEFAULTS = {
    nomeLoja: 'Flor de Íris',
    whatsapp: '44 9864-2644',
    email: 'contato@flordeiris.com',
    endereco: 'Rua das Flores, 123',
    localizacao: 'Maringá, PR',
    horarioAtendimento: 'Segunda a Sexta, 9h às 18h',
    pix: {
      chave: 'rodolfo.rags1@gmail.com',
      beneficiario: 'Rodolfo Adriano Goulart',
      cidade: 'Sao Paulo'
    },
    footer: {
      descricao: 'Sabonetes artesanais feitos com ingredientes 100% naturais. Transforme seu banho em um momento especial de autocuidado e bem-estar.',
      copyright: '© 2025 Flor de Íris - Sabonetes Artesanais. Todos os direitos reservados.'
    },
    social: {
      instagramUrl: '#',
      facebookUrl: '#'
    },
    seo: {
      titleSuffix: 'Flor de Íris'
    },
    homeSections: {
      processo: {
        titulo: 'Como Criamos Nossos Sabonetes',
        subtitulo: 'Um processo artesanal com qualidade e cuidado',
        passos: [
          {
            titulo: 'Seleção de Ingredientes',
            descricao: 'Óleos, manteigas vegetais e botânicos escolhidos com critério'
          },
          {
            titulo: 'Mistura Artesanal',
            descricao: 'Técnicas tradicionais para consistência, aroma e suavidade'
          },
          {
            titulo: 'Cura Natural',
            descricao: 'Tempo de cura para firmeza e espuma equilibrada'
          },
          {
            titulo: 'Embalagem com Amor',
            descricao: 'Acabamento e embalagem cuidadosos para chegar perfeito'
          }
        ]
      },
      sobre: {
        titulo: 'Nossa História',
        paragrafo1: 'A Flor de Íris nasceu do amor pela natureza e pelo cuidado com a pele. Criamos sabonetes artesanais premium com ingredientes naturais cuidadosamente selecionados.',
        paragrafo2: 'Cada produto é feito à mão, com receitas exclusivas que combinam botânicos, óleos essenciais e muito carinho. Nossa missão é transformar o cuidado diário em um ritual de bem-estar e amor próprio.'
      }
    },
    home: {
      heroLinha1: 'Sabonetes artesanais',
      heroLinha2: 'que despertam',
      heroLinha3Prefixo: 'bem-estar no',
      heroLinha3Destaque: 'primeiro toque',
      heroDescricao: 'Fórmulas naturais, aromas marcantes e espuma cremosa. Feitos à mão, em pequenos lotes, para transformar o seu banho em um momento de pausa e carinho com a pele.',
      featuredProductIds: []
    },
    notifNovosPedidos: true,
    notifEstoqueBaixo: true,
    notifNovosClientes: true
  };

  function deepMerge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(extra)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object') {
        out[k] = deepMerge(base[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function getRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) return null;

      // Migra configs antigas que apenas repetiam os defaults anteriores.
      // Isso evita o efeito: "dou Ctrl+Shift+R e vejo, depois some".
      let changed = false;

      if (parsed?.home?.heroDescricao === LEGACY_DEFAULTS.home.heroDescricao) {
        parsed.home.heroDescricao = DEFAULTS.home.heroDescricao;
        changed = true;
      }

      const legacyProcesso = LEGACY_DEFAULTS.homeSections?.processo;
      const parsedProcesso = parsed?.homeSections?.processo;
      if (legacyProcesso && parsedProcesso) {
        if (parsedProcesso.subtitulo === legacyProcesso.subtitulo) {
          parsedProcesso.subtitulo = DEFAULTS.homeSections.processo.subtitulo;
          changed = true;
        }

        if (Array.isArray(parsedProcesso.passos) && Array.isArray(legacyProcesso.passos)) {
          for (let i = 0; i < 4; i++) {
            const legacyStep = legacyProcesso.passos[i];
            const step = parsedProcesso.passos[i];
            if (step && legacyStep && step.descricao === legacyStep.descricao) {
              step.descricao = DEFAULTS.homeSections.processo.passos[i].descricao;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // ignora
        }
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function get() {
    return deepMerge(DEFAULTS, getRaw() || {});
  }

  function set(next) {
    const current = get();
    const merged = deepMerge(current, next || {});
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function normalizeWhatsappDigits(input) {
    const digits = String(input || '').replace(/\D+/g, '');
    if (!digits) return '';

    // Se já vier com DDI (55), mantém.
    if (digits.startsWith('55') && digits.length >= 12) return digits;

    // Se vier só DDD+numero (10-11), prefixa 55
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;

    return digits;
  }

  function getWhatsappDigits() {
    const cfg = get();
    return normalizeWhatsappDigits(cfg.whatsapp) || normalizeWhatsappDigits(DEFAULTS.whatsapp);
  }

  function applyToDOM() {
    const cfg = get();
    const raw = getRaw() || {};

    const hasNonEmptyText = (v) => {
      if (v === null || v === undefined) return false;
      return String(v).trim().length > 0;
    };

    // SEO (título): se a página usar o padrão "Algo - Sufixo", substitui o sufixo
    const titleSuffix = cfg.seo?.titleSuffix || DEFAULTS.seo.titleSuffix;
    if (titleSuffix && typeof document !== 'undefined' && typeof document.title === 'string' && document.title.includes(' - ')) {
      document.title = document.title.replace(/\s-\s.*$/, ` - ${titleSuffix}`);
    }

    // Nome da loja (texto)
    document.querySelectorAll('[data-site-nome-loja]').forEach(el => {
      el.textContent = cfg.nomeLoja || DEFAULTS.nomeLoja;
    });

    // WhatsApp (texto)
    document.querySelectorAll('[data-site-whatsapp]').forEach(el => {
      el.textContent = cfg.whatsapp || DEFAULTS.whatsapp;
    });

    // WhatsApp (link)
    const waDigits = getWhatsappDigits();
    if (waDigits) {
      document.querySelectorAll('[data-site-whatsapp-link]').forEach(el => {
        try {
          const message = el.getAttribute('data-site-whatsapp-message');
          if (message) {
            el.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
          } else {
            el.href = `https://wa.me/${waDigits}`;
          }
        } catch {
          // ignora
        }
      });
    }

    // E-mail (texto)
    document.querySelectorAll('[data-site-email]').forEach(el => {
      el.textContent = cfg.email || DEFAULTS.email;
    });

    // E-mail (link)
    const email = cfg.email || DEFAULTS.email;
    if (email) {
      document.querySelectorAll('[data-site-email-link]').forEach(el => {
        try {
          el.href = `mailto:${email}`;
        } catch {
          // ignora
        }
      });
    }

    // Endereço / Localização
    document.querySelectorAll('[data-site-endereco]').forEach(el => {
      el.textContent = cfg.endereco || DEFAULTS.endereco;
    });
    document.querySelectorAll('[data-site-localizacao]').forEach(el => {
      el.textContent = cfg.localizacao || DEFAULTS.localizacao;
    });

    // Horário
    document.querySelectorAll('[data-site-horario]').forEach(el => {
      el.textContent = cfg.horarioAtendimento || DEFAULTS.horarioAtendimento;
    });

    // Rodapé
    document.querySelectorAll('[data-site-footer-desc]').forEach(el => {
      el.textContent = cfg.footer?.descricao || DEFAULTS.footer.descricao;
    });
    document.querySelectorAll('[data-site-footer-copy]').forEach(el => {
      el.textContent = cfg.footer?.copyright || DEFAULTS.footer.copyright;
    });

    // Redes sociais
    document.querySelectorAll('[data-site-social-instagram]').forEach(el => {
      try {
        el.href = cfg.social?.instagramUrl || DEFAULTS.social.instagramUrl;
      } catch {
        // ignora
      }
    });
    document.querySelectorAll('[data-site-social-facebook]').forEach(el => {
      try {
        el.href = cfg.social?.facebookUrl || DEFAULTS.social.facebookUrl;
      } catch {
        // ignora
      }
    });

    // Home Hero
    // Importante: não sobrescreve o HTML por padrão.
    // Só aplica se existir configuração salva (raw).
    const h1 = document.getElementById('hero-title-line-1');
    const h2 = document.getElementById('hero-title-line-2');
    const h3p = document.getElementById('hero-title-line-3-prefix');
    const h3h = document.getElementById('hero-title-line-3-highlight');
    const desc = document.getElementById('hero-desc');

    const rawHome = raw.home || {};
    if (h1 && hasNonEmptyText(rawHome.heroLinha1)) h1.textContent = rawHome.heroLinha1;
    if (h2 && hasNonEmptyText(rawHome.heroLinha2)) h2.textContent = rawHome.heroLinha2;
    if (h3p && hasNonEmptyText(rawHome.heroLinha3Prefixo)) h3p.textContent = rawHome.heroLinha3Prefixo;
    if (h3h && hasNonEmptyText(rawHome.heroLinha3Destaque)) h3h.textContent = rawHome.heroLinha3Destaque;
    if (desc && hasNonEmptyText(rawHome.heroDescricao)) desc.textContent = rawHome.heroDescricao;

    // Home - Processo (só aplica se estiver salvo no raw)
    const processoTituloEl = document.getElementById('home-processo-titulo');
    const processoSubEl = document.getElementById('home-processo-subtitulo');

    const rawProcesso = raw.homeSections?.processo || {};
    if (processoTituloEl && hasNonEmptyText(rawProcesso.titulo)) processoTituloEl.textContent = rawProcesso.titulo;
    if (processoSubEl && hasNonEmptyText(rawProcesso.subtitulo)) processoSubEl.textContent = rawProcesso.subtitulo;

    for (let i = 1; i <= 4; i++) {
      const t = document.getElementById(`home-processo-passo-${i}-titulo`);
      const d = document.getElementById(`home-processo-passo-${i}-desc`);
      const rawStep = rawProcesso?.passos?.[i - 1];

      if (t && hasNonEmptyText(rawStep?.titulo)) t.textContent = rawStep.titulo;
      if (d && hasNonEmptyText(rawStep?.descricao)) d.textContent = rawStep.descricao;
    }

    // Home - Sobre (só aplica se estiver salvo no raw)
    const sobreTituloEl = document.getElementById('home-sobre-titulo');
    const sobreP1El = document.getElementById('home-sobre-p1');
    const sobreP2El = document.getElementById('home-sobre-p2');

    const rawSobre = raw.homeSections?.sobre || {};
    if (sobreTituloEl && hasNonEmptyText(rawSobre.titulo)) sobreTituloEl.textContent = rawSobre.titulo;
    if (sobreP1El && hasNonEmptyText(rawSobre.paragrafo1)) sobreP1El.textContent = rawSobre.paragrafo1;
    if (sobreP2El && hasNonEmptyText(rawSobre.paragrafo2)) sobreP2El.textContent = rawSobre.paragrafo2;

    // Pagamento (chave pix)
    const chavePixEl = document.getElementById('chave-pix');
    if (chavePixEl) chavePixEl.textContent = cfg.pix?.chave || DEFAULTS.pix.chave;
  }

  window.SiteConfig = {
    DEFAULTS,
    get,
    set,
    applyToDOM,
    normalizeWhatsappDigits,
    getWhatsappDigits
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyToDOM();
  });
})();
