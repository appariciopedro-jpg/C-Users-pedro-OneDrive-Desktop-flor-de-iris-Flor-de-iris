const express = require("express");
const path = require("path");
const fs = require("fs");

// Carrega variáveis do arquivo .env em desenvolvimento/local (se existir)
try {
  require('dotenv').config();
} catch {
  // ignore
}

const app = express();
const PORT = process.env.PORT || 3001;


// IA (Suporte)
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const AI_SUPPORT_ENABLED = (String(process.env.AI_SUPPORT_ENABLED || 'true').toLowerCase() !== 'false') && Boolean(OPENAI_API_KEY);

// Body parsing (para upload via DataURL e APIs)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Persistência simples em arquivo (MVP)
const DATA_DIR = path.join(__dirname, 'data');
const PEDIDOS_PATH = path.join(DATA_DIR, 'pedidos.json');
const PRODUTOS_PATH = path.join(DATA_DIR, 'produtos.json');

function ensureDirSync(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  } catch (e) {
    console.error('❌ Falha ao criar diretório:', dirPath, e.message);
  }
}

function readPedidosSafe() {
  try {
    if (!fs.existsSync(PEDIDOS_PATH)) return [];
    const raw = fs.readFileSync(PEDIDOS_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePedidosSafe(pedidos) {
  ensureDirSync(DATA_DIR);
  fs.writeFileSync(PEDIDOS_PATH, JSON.stringify(pedidos || [], null, 2), 'utf8');
}

function readProdutosSafe() {
  try {
    if (!fs.existsSync(PRODUTOS_PATH)) return [];
    const raw = fs.readFileSync(PRODUTOS_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProdutosSafe(produtos) {
  ensureDirSync(DATA_DIR);
  fs.writeFileSync(PRODUTOS_PATH, JSON.stringify(produtos || [], null, 2), 'utf8');
}


// ============================================
// SISTEMA DE SEGURANÇA
// ============================================

const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
// Em desenvolvimento/local, desabilita rate limit por padrão para não atrapalhar testes.
const RATE_LIMIT_DISABLED = String(process.env.RATE_LIMIT_DISABLED || (!IS_PROD ? 'true' : 'false')).toLowerCase() === 'true';

// Rate Limiting por IP (proteção contra DDoS e força bruta)
const requestCounts = new Map();
const blockedIPs = new Set();
const MAX_REQUESTS_PER_MINUTE = Number(process.env.RATE_LIMIT_MAX_PER_MINUTE || 60);
const BLOCK_DURATION = Number(process.env.RATE_LIMIT_BLOCK_MS || (15 * 60 * 1000)); // 15 minutos

function getClientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const raw = xf || req.ip || req.socket?.remoteAddress || '';
  return String(raw);
}

function isLocalhostIp(ip) {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip.endsWith('127.0.0.1');
}

function isStaticAssetPath(p) {
  const pathStr = String(p || '');
  if (pathStr === '/' || pathStr === '/index.html') return false;
  return (
    pathStr.startsWith('/css/') ||
    pathStr.startsWith('/js/') ||
    pathStr.startsWith('/images/') ||
    pathStr.startsWith('/uploads/') ||
    pathStr.startsWith('/videos/') ||
    /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|mp4|pdf|woff2?|ttf)$/i.test(pathStr)
  );
}

// Middleware de Rate Limiting
app.use((req, res, next) => {
  if (RATE_LIMIT_DISABLED) return next();

  const ip = getClientIp(req);

  // Não aplica rate limit em localhost (dev/testes)
  if (isLocalhostIp(ip)) return next();

  // Não aplica rate limit para assets estáticos
  if (req.method === 'GET' && isStaticAssetPath(req.path)) return next();
  
  // Verificar se IP está bloqueado
  if (blockedIPs.has(ip)) {
    return res.status(429).send('Muitas requisições. Tente novamente mais tarde.');
  }
  
  // Contar requisições
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip);
  // Remover requisições antigas (mais de 1 minuto)
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    blockedIPs.add(ip);
    console.log(`⚠️ IP bloqueado por excesso de requisições: ${ip}`);
    
    // Desbloquear após duração definida
    setTimeout(() => {
      blockedIPs.delete(ip);
      console.log(`✅ IP desbloqueado: ${ip}`);
    }, BLOCK_DURATION);
    
    return res.status(429).send('Limite de requisições excedido. IP bloqueado temporariamente.');
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  
  next();
});

// Headers de Segurança
app.use((req, res, next) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Política de referência
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (proteção contra XSS)
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: http:; " +
    "connect-src 'self' https://api.whatsapp.com https://buscacepinter.correios.com.br; " +
    "frame-src 'self' https://api.whatsapp.com;"
  );
  
  // Remover header que expõe tecnologia
  res.removeHeader('X-Powered-By');
  
  next();
});

// Logging de segurança
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${ip} - ${req.method} ${req.url}`);
  next();
});

// DEBUG: Listar estrutura de diretórios
console.log("\n🔍 DEBUG - Estrutura de diretórios:");
console.log(`📁 __dirname: ${__dirname}`);
console.log(`📁 process.cwd(): ${process.cwd()}`);

// Listar arquivos no diretório raiz
try {
  const rootFiles = fs.readdirSync(__dirname);
  console.log(`📂 Arquivos em __dirname:`, rootFiles);
  
  // Verificar se pasta public existe
  const publicPath = path.join(__dirname, "public");
  if (fs.existsSync(publicPath)) {
    console.log(`✅ Pasta public encontrada em: ${publicPath}`);
    const publicFiles = fs.readdirSync(publicPath);
    console.log(`📂 Arquivos em public:`, publicFiles);
  } else {
    console.log(`❌ Pasta public NÃO encontrada em: ${publicPath}`);
  }
} catch (err) {
  console.error("❌ Erro ao listar diretórios:", err.message);
}
console.log("\n");

// SERVIR ARQUIVOS ESTÁTICOS com options para vídeo
const publicPath = path.join(__dirname, "public");

// Em ambiente local/dev, alguns browsers (incluindo o Simple Browser do VS Code)
// podem segurar assets em cache de forma agressiva. Isso garante que alterações
// de HTML/CSS/JS apareçam sempre ao recarregar.
const DEV_NO_CACHE = String(process.env.DEV_NO_CACHE || (!IS_PROD ? 'true' : 'false')).toLowerCase() === 'true';

app.use(express.static(publicPath, {
  setHeaders: (res, filePath) => {
    if (DEV_NO_CACHE) {
      const lower = String(filePath || '').toLowerCase();
      if (
        lower.endsWith('.html') ||
        lower.endsWith('.css') ||
        lower.endsWith('.js') ||
        lower.endsWith('.json') ||
        lower.endsWith('.map')
      ) {
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }

    if (filePath.endsWith('.mp4')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
    if (filePath.endsWith('.pdf')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// ============================================
// API - Comprovantes (upload)
// ============================================
app.post('/api/comprovantes', (req, res) => {
  try {
    const dataUrl = String(req.body?.dataUrl || '');
    const originalName = String(req.body?.originalName || 'comprovante');

    if (!dataUrl.startsWith('data:')) {
      return res.status(400).json({ error: 'dataUrl inválido' });
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    if (!match) {
      return res.status(400).json({ error: 'dataUrl mal formatado' });
    }

    const mime = match[1];
    const b64 = match[2];

    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(mime)) {
      return res.status(400).json({ error: 'Tipo não permitido' });
    }

    const extFromMime = (() => {
      if (mime === 'application/pdf') return 'pdf';
      if (mime === 'image/png') return 'png';
      if (mime === 'image/webp') return 'webp';
      return 'jpg';
    })();

    const safeBaseName = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .slice(0, 60) || 'comprovante';

    const rand = Math.random().toString(16).slice(2, 10);
    const filename = `${Date.now()}_${rand}_${safeBaseName}.${extFromMime}`;

    const uploadsDir = path.join(publicPath, 'uploads', 'comprovantes');
    ensureDirSync(uploadsDir);

    const outPath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(b64, 'base64');

    // Limites (proteção básica)
    const maxBytes = mime === 'application/pdf' ? 20 * 1024 * 1024 : 12 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return res.status(413).json({ error: 'Arquivo muito grande' });
    }

    fs.writeFileSync(outPath, buffer);

    const url = `/uploads/comprovantes/${filename}`;
    return res.json({ url });
  } catch (e) {
    console.error('❌ Upload comprovante falhou:', e.message);
    return res.status(500).json({ error: 'Falha ao salvar comprovante' });
  }
});

// ============================================
// API - Pedidos (persistência em arquivo)
// ============================================
app.get('/api/pedidos', (req, res) => {
  const pedidos = readPedidosSafe();
  res.json(pedidos);
});

app.post('/api/pedidos', (req, res) => {
  try {
    const pedido = req.body;
    if (!pedido || !pedido.id) {
      return res.status(400).json({ error: 'Pedido inválido' });
    }
    const pedidos = readPedidosSafe();
    pedidos.push(pedido);
    writePedidosSafe(pedidos);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Salvar pedido falhou:', e.message);
    res.status(500).json({ error: 'Falha ao salvar pedido' });
  }
});

app.patch('/api/pedidos/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const pedidos = readPedidosSafe();
    const idx = pedidos.findIndex(p => String(p?.id ?? p?.codigo ?? '') === id);
    if (idx < 0) return res.status(404).json({ error: 'Pedido não encontrado' });
    pedidos[idx] = { ...pedidos[idx], ...req.body };
    writePedidosSafe(pedidos);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Atualizar pedido falhou:', e.message);
    res.status(500).json({ error: 'Falha ao atualizar pedido' });
  }
});

app.delete('/api/pedidos/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const pedidos = readPedidosSafe();
    const next = pedidos.filter(p => String(p?.id ?? p?.codigo ?? '') !== id);
    if (next.length === pedidos.length) return res.status(404).json({ error: 'Pedido não encontrado' });
    writePedidosSafe(next);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Excluir pedido falhou:', e.message);
    res.status(500).json({ error: 'Falha ao excluir pedido' });
  }
});

// ============================================
// API - Produtos (persistência em arquivo)
// ============================================

app.get('/api/produtos', (req, res) => {
  const produtos = readProdutosSafe();
  res.json(produtos);
});

app.post('/api/produtos', (req, res) => {
  try {
    const produto = req.body || {};
    const produtos = readProdutosSafe();

    let id = produto.id;
    if (!id) {
      id = Date.now();
    }

    const payload = { ...produto, id };
    produtos.push(payload);
    writeProdutosSafe(produtos);
    res.json(payload);
  } catch (e) {
    console.error('❌ Salvar produto falhou:', e.message);
    res.status(500).json({ error: 'Falha ao salvar produto' });
  }
});

app.put('/api/produtos/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const produtos = readProdutosSafe();
    const idx = produtos.findIndex(p => String(p?.id ?? '') === id);
    if (idx < 0) return res.status(404).json({ error: 'Produto não encontrado' });

    produtos[idx] = { ...produtos[idx], ...req.body, id: produtos[idx].id };
    writeProdutosSafe(produtos);
    res.json(produtos[idx]);
  } catch (e) {
    console.error('❌ Atualizar produto falhou:', e.message);
    res.status(500).json({ error: 'Falha ao atualizar produto' });
  }
});

app.delete('/api/produtos/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const produtos = readProdutosSafe();
    const next = produtos.filter(p => String(p?.id ?? '') !== id);
    if (next.length === produtos.length) return res.status(404).json({ error: 'Produto não encontrado' });
    writeProdutosSafe(next);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Excluir produto falhou:', e.message);
    res.status(500).json({ error: 'Falha ao excluir produto' });
  }
});

// Remover todos os produtos (usado pelo painel para "limpar todos")
app.delete('/api/produtos', (req, res) => {
  try {
    writeProdutosSafe([]);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Limpar produtos falhou:', e.message);
    res.status(500).json({ error: 'Falha ao limpar produtos' });
  }
});

// ============================================
// API - Suporte com IA (proxy server-side)
// ============================================

app.get('/api/suporte/ai/status', (req, res) => {
  res.json({ enabled: AI_SUPPORT_ENABLED });
});

function normalizeAiMessages(raw) {
  const safe = [];
  const arr = Array.isArray(raw) ? raw : [];
  for (const m of arr) {
    if (!m || typeof m !== 'object') continue;
    const role = String(m.role || '').toLowerCase();
    if (role !== 'user' && role !== 'assistant') continue;
    const content = String(m.content || '').slice(0, 2000).trim();
    if (!content) continue;
    safe.push({ role, content });
  }
  // Mantém só o final pra não estourar tokens
  return safe.slice(-12);
}

app.post('/api/suporte/ai', async (req, res) => {
  try {
    if (!AI_SUPPORT_ENABLED) {
      return res.status(501).json({ error: 'IA não configurada no servidor.' });
    }

    const page = String(req.body?.page || '').slice(0, 120);
    const messages = normalizeAiMessages(req.body?.messages);

    if (!messages.length) {
      return res.status(400).json({ error: 'Mensagens ausentes.' });
    }

    const system =
      "Você é a Iris, assistente de suporte da loja Flor de Íris (e-commerce de sabonetes artesanais). " +
      "Responda em português (Brasil), de forma simpática e objetiva. " +
      "Se o cliente pedir algo fora do site, explique de forma simples. " +
      "Nunca peça ou aceite senhas, códigos 2FA, dados bancários completos. " +
      "Se o cliente quiser falar com um humano, sugira o WhatsApp. " +
      "Se perguntarem sobre preços/produtos, direcione para o catálogo. " +
      "Se perguntarem sobre entrega/frete, peça o CEP (sem dados sensíveis além disso). " +
      (page ? `Contexto: página atual do cliente: ${page}. ` : "");

    const payload = {
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 320,
      messages: [{ role: 'system', content: system }, ...messages]
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('❌ IA suporte falhou:', r.status, text.slice(0, 800));
      return res.status(502).json({ error: 'Falha ao consultar IA.' });
    }

    const data = await r.json();
    const reply = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!reply) return res.status(502).json({ error: 'Resposta vazia da IA.' });

    return res.json({ reply });
  } catch (e) {
    console.error('❌ IA suporte erro:', e.message);
    return res.status(500).json({ error: 'Erro interno no suporte IA.' });
  }
});

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ROTA DE STREAM DE VÍDEO COM SUPORTE A RANGE (evita RangeNotSatisfiable)
app.get("/videos/:file", (req, res) => {
  const videoPath = path.join(__dirname, "public", "videos", req.params.file);

  fs.stat(videoPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.sendStatus(404);
    }

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        "Content-Length": stats.size,
        "Content-Type": "video/mp4",
      });
      return fs.createReadStream(videoPath).pipe(res);
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

    if (isNaN(start) || isNaN(end) || start >= stats.size || end >= stats.size) {
      res.status(416).setHeader("Content-Range", `bytes */${stats.size}`);
      return res.end();
    }

    const chunkSize = (end - start) + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(videoPath, { start, end }).pipe(res);
  });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🌸 Servidor Flor de Íris rodando em http://localhost:${PORT}`);
  console.log("=".repeat(50));
  console.log("🛡️  Sistema de Segurança Ativo:");
  console.log(`   ✓ Rate Limiting: ${MAX_REQUESTS_PER_MINUTE} req/min por IP`);
  console.log(`   ✓ Bloqueio automático: ${BLOCK_DURATION/60000} minutos`);
  console.log("   ✓ Headers de segurança configurados");
  console.log("   ✓ Proteção XSS ativa");
  console.log("   ✓ Proteção contra clickjacking");
  console.log("   ✓ Logging de requisições");
  console.log("=".repeat(50));
});

// Limpeza periódica de dados de rate limiting (a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestCounts.entries()) {
    const recent = requests.filter(time => now - time < 60000);
    if (recent.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, recent);
    }
  }
}, 5 * 60 * 1000);
