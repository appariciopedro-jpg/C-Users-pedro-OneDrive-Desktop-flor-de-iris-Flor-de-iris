// Página de Pagamento
document.addEventListener('DOMContentLoaded', () => {
  
  // Tentar carregar usuário logado (opcional)
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  
  // Se estiver logado, preenche os dados de entrega; se não, segue como convidado
  if (usuarioLogado) {
    carregarDadosUsuario(usuarioLogado);
  }
  
  // Elementos
  const itensLista = document.getElementById('itens-lista');
  const subtotalEl = document.getElementById('subtotal-pag');
  const descontoEl = document.getElementById('desconto-pag');
  const freteEl = document.getElementById('frete-pag');
  const totalEl = document.getElementById('total-pag');
  const descontoLinha = document.getElementById('desconto-linha');
  const freteLinha = document.getElementById('frete-linha');
  const observacaoInput = document.getElementById('observacao-pedido');

  // Formatação de moeda
  const formatPrice = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Carregar dados do pedido
  async function criarPedidoBaseSeNecessario(usuarioLogado, pedidoBase) {
    if (!pedidoBase) return null;

    try {
      const atual = JSON.parse(sessionStorage.getItem('dadosPagamento') || '{}');
      if (atual && atual.pedidoId) {
        return atual.pedidoId;
      }
    } catch {
      // ignore
    }

    const now = new Date();
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');

    let usuario = null;
    if (usuarioLogado && typeof usuarioLogado.id !== 'undefined') {
      usuario = usuarios.find(u => u.id === usuarioLogado.id) || usuarioLogado;
    }

    // Se não houver usuário logado, cria um cliente genérico (compra como convidado)
    if (!usuario) {
      usuario = {
        nome: 'Cliente (convidado)',
        cpf: '',
        usuario: 'convidado',
        endereco: {
          endereco: '',
          complemento: '',
          cep: '',
          cidade: '',
          uf: ''
        }
      };
    }

    const endereco = usuario.endereco || {};
    const entrega = getDadosEntregaFromDom();

    const clienteNome = entrega.nome || usuario.nome;
    const clienteCpf = entrega.cpf || usuario.cpf;
    const clienteEndereco = entrega.endereco || endereco.endereco;
    const clienteComplemento = endereco.complemento || '';
    const clienteCep = entrega.cep || endereco.cep;
    const clienteCidade = entrega.cidade || endereco.cidade;
    const clienteUf = entrega.uf || endereco.uf;

    const pedidoBasico = {
      id: Date.now(),
      data: now.toLocaleString('pt-BR'),
      timestamp: Date.now(),
      codigoRastreio: null,
      cliente: {
        nome: clienteNome,
        cpf: clienteCpf,
        usuario: usuario.usuario,
        endereco: clienteEndereco,
        complemento: clienteComplemento,
        cep: clienteCep,
        cidade: clienteCidade,
        uf: clienteUf
      },
      itens: pedidoBase.itens,
      subtotal: pedidoBase.subtotal,
      desconto: pedidoBase.desconto,
      frete: pedidoBase.frete,
      total: pedidoBase.total,
      cupom: pedidoBase.cupom,
      comprovante: null,
      comprovanteUrl: null,
      comprovanteNome: null,
      comprovanteTipo: null,
      status: 'Aguardando Pagamento',
      dataPagamento: null,
      exibirNoAdmin: true,
      observacao: pedidoBase.observacao || ''
    };

    const ok = await salvarPedidoNoServidor(pedidoBasico);

    if (!ok) {
      // fallback local para não perder o pedido
      try {
        let pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        if (!Array.isArray(pedidos)) pedidos = [];
        pedidos.push(pedidoBasico);
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
      } catch {
        // ignore
      }
    }

    try {
      const atual = JSON.parse(sessionStorage.getItem('dadosPagamento') || '{}');
      atual.pedidoId = pedidoBasico.id;
      sessionStorage.setItem('dadosPagamento', JSON.stringify(atual));
    } catch {
      // ignore
    }

    return pedidoBasico.id;
  }

  async function carregarPedido() {
    const dadosPedido = sessionStorage.getItem('dadosPagamento');
    
    if (!dadosPedido) {
      alert('Nenhum pedido encontrado. Redirecionando para o carrinho...');
      window.location.href = 'carrinho.html';
      return;
    }

    const pedido = JSON.parse(dadosPedido);
    
    // Criar pedido base "Aguardando Pagamento" se ainda não existir
    try {
      await criarPedidoBaseSeNecessario(usuarioLogado, pedido);
    } catch {
      // se falhar, segue só com o front
    }

    // Renderizar itens
    let htmlItens = '';
    pedido.itens.forEach(item => {
      const subtotalItem = (Number(item.preco) || 0) * item.quantidade;
      htmlItens += `
        <div class="item-pedido">
          <div class="item-info">
            <div class="item-nome">${item.nome}</div>
            <div class="item-quantidade">Quantidade: ${item.quantidade}</div>
          </div>
          <div class="item-preco">${formatPrice(subtotalItem)}</div>
        </div>
      `;
    });
    itensLista.innerHTML = htmlItens;

    // Exibir totais
    subtotalEl.textContent = formatPrice(pedido.subtotal);
    
    if (pedido.desconto > 0) {
      descontoLinha.style.display = 'flex';
      descontoEl.textContent = `-${formatPrice(pedido.desconto)}`;
    }
    
    if (pedido.frete > 0) {
      freteLinha.style.display = 'flex';
      freteEl.textContent = formatPrice(pedido.frete);
    }
    
    totalEl.textContent = formatPrice(pedido.total);
    
    // Gerar QR Code com o valor total
    gerarQRCodeComValor(pedido.total);

    // Preencher observação se já existir
    if (observacaoInput && pedido.observacao) {
      observacaoInput.value = pedido.observacao;
    }
  }

  carregarPedido();

  // Salvar observação no sessionStorage ao digitar
  if (observacaoInput) {
    observacaoInput.addEventListener('input', () => {
      const dados = sessionStorage.getItem('dadosPagamento');
      if (!dados) return;
      let obj = {};
      try { obj = JSON.parse(dados); } catch { obj = {}; }
      obj.observacao = observacaoInput.value;
      sessionStorage.setItem('dadosPagamento', JSON.stringify(obj));
    });
  }
});

function getPixConfig() {
  const fallback = {
    chave: 'rodolfo.rags1@gmail.com',
    beneficiario: 'Rodolfo Adriano Goulart',
    cidade: 'Sao Paulo'
  };

  try {
    const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
      ? window.SiteConfig.get()
      : null;
    const pix = cfg && cfg.pix ? cfg.pix : null;
    return {
      chave: String(pix?.chave || fallback.chave),
      beneficiario: String(pix?.beneficiario || fallback.beneficiario),
      cidade: String(pix?.cidade || fallback.cidade)
    };
  } catch {
    return fallback;
  }
}

function getWhatsappDigitsFromConfig() {
  const fallbackDigits = '554498642644';
  try {
    const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
      ? window.SiteConfig.get()
      : null;

    const wa = cfg?.whatsapp;
    if (!wa) return fallbackDigits;

    if (window.SiteConfig && typeof window.SiteConfig.normalizeWhatsappDigits === 'function') {
      const digits = window.SiteConfig.normalizeWhatsappDigits(wa);
      return digits || fallbackDigits;
    }

    const digits = String(wa).replace(/\D+/g, '');
    if (!digits) return fallbackDigits;
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
    return digits;
  } catch {
    return fallbackDigits;
  }
}

// Carregar dados do usuário logado nos campos editáveis de entrega
function carregarDadosUsuario(usuario) {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const dadosCompletos = usuarios.find(u => u.id === usuario.id) || usuario;
  const endereco = dadosCompletos.endereco || {};

  const nomeEl = document.getElementById('usuario-nome');
  const cpfEl = document.getElementById('usuario-cpf');
  const endEl = document.getElementById('usuario-endereco');
  const cepEl = document.getElementById('usuario-cep');
  const cidEl = document.getElementById('usuario-cidade');
  const ufEl = document.getElementById('usuario-uf');

  if (nomeEl) nomeEl.value = dadosCompletos.nome || '';
  if (cpfEl) cpfEl.value = dadosCompletos.cpf || '';
  if (endEl) endEl.value = endereco.endereco || '';
  if (cepEl) cepEl.value = endereco.cep || '';
  if (cidEl) cidEl.value = endereco.cidade || '';
  if (ufEl) ufEl.value = (endereco.uf || '').toUpperCase();
}

// Ler dados de entrega digitados na tela (para usar no pedido)
function getDadosEntregaFromDom() {
  try {
    const nome = (document.getElementById('usuario-nome')?.value || '').trim();
    const cpf = (document.getElementById('usuario-cpf')?.value || '').trim();
    const endereco = (document.getElementById('usuario-endereco')?.value || '').trim();
    const cep = (document.getElementById('usuario-cep')?.value || '').trim();
    const cidade = (document.getElementById('usuario-cidade')?.value || '').trim();
    const uf = (document.getElementById('usuario-uf')?.value || '').trim().toUpperCase();

    return { nome, cpf, endereco, cep, cidade, uf };
  } catch {
    return { nome: '', cpf: '', endereco: '', cep: '', cidade: '', uf: '' };
  }
}

// Gerar QR Code com valor
function gerarQRCodeComValor(valorTotal) {
  const valor = Number(valorTotal).toFixed(2);
  
  // Gerar código PIX válido no formato EMV
  const pixPayload = gerarPayloadPix(valor);
  
  // Gerar QR Code usando API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;
  
  const qrImg = document.getElementById('qr-code-img');
  if (qrImg) {
    qrImg.src = qrCodeUrl;
  }
  
  // Atualizar valor exibido abaixo do QR Code
  const valorQRCode = document.getElementById('valor-qr-code');
  if (valorQRCode) {
    valorQRCode.textContent = formatPriceBR(valor);
  }
}

// Gerar payload PIX no formato EMV correto
function gerarPayloadPix(valor) {
  const pix = getPixConfig();
  const chavePix = pix.chave;
  const nomeBeneficiario = pix.beneficiario;
  const cidade = pix.cidade;
  
  // Função auxiliar para formatar campo EMV
  function formatarCampoEMV(id, valor) {
    const tamanho = valor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${valor}`;
  }
  
  // Payload Format Indicator
  let payload = formatarCampoEMV('00', '01');
  
  // Merchant Account Information (PIX)
  const merchantAccountInfo = 
    formatarCampoEMV('00', 'br.gov.bcb.pix') +
    formatarCampoEMV('01', chavePix);
  payload += formatarCampoEMV('26', merchantAccountInfo);
  
  // Merchant Category Code
  payload += formatarCampoEMV('52', '0000');
  
  // Transaction Currency (986 = BRL)
  payload += formatarCampoEMV('53', '986');
  
  // Transaction Amount
  payload += formatarCampoEMV('54', valor);
  
  // Country Code
  payload += formatarCampoEMV('58', 'BR');
  
  // Merchant Name
  payload += formatarCampoEMV('59', nomeBeneficiario);
  
  // Merchant City
  payload += formatarCampoEMV('60', cidade);
  
  // Additional Data Field Template
  const additionalData = formatarCampoEMV('05', '***');
  payload += formatarCampoEMV('62', additionalData);
  
  // CRC16 (será calculado)
  payload += '6304';
  
  // Calcular CRC16
  const crc = calcularCRC16(payload);
  payload += crc;
  
  return payload;
}

// Calcular CRC16 CCITT
function calcularCRC16(str) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Copiar chave PIX
function copiarChavePix() {
  const chavePix = getPixConfig().chave;
  
  navigator.clipboard.writeText(chavePix).then(() => {
    mostrarMensagemCopiado('Chave PIX copiada!');
  }).catch(() => {
    copiarFallback(chavePix);
  });
}

// Copiar código PIX Copia e Cola
function copiarCodigoPix() {
  // Pegar valor total do pedido
  const dadosPedido = sessionStorage.getItem('dadosPagamento');
  let valorTotal = '0.00';
  
  if (dadosPedido) {
    const pedido = JSON.parse(dadosPedido);
    valorTotal = Number(pedido.total).toFixed(2);
  }
  
  // Gerar código PIX válido
  const codigoPix = gerarPayloadPix(valorTotal);
  
  navigator.clipboard.writeText(codigoPix).then(() => {
    mostrarMensagemCopiado(`Código PIX copiado! Valor: R$ ${valorTotal}`);
  }).catch(() => {
    copiarFallback(codigoPix);
  });
}

// Fallback para copiar
function copiarFallback(texto) {
  const input = document.createElement('input');
  input.value = texto;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  mostrarMensagemCopiado('Copiado!');
}

// Mostrar mensagem de copiado
function mostrarMensagemCopiado(texto) {
  const msg = document.getElementById('copiado-msg');
  msg.textContent = String(texto || '');
  msg.classList.add('show');
  
  setTimeout(() => {
    msg.classList.remove('show');
  }, 3000);
}

// Preview do comprovante
let comprovanteData = null;
let comprovanteFileMeta = null;

const COMPROVANTE_MAX_MB_IMAGE = 6;
const COMPROVANTE_MAX_MB_PDF = 2;
const COMPROVANTE_ALLOWED_IMAGE_PREFIX = 'image/';
const COMPROVANTE_ALLOWED_PDF = 'application/pdf';

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
function previewComprovante(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  processComprovanteFile(file);
}

function removerComprovante() {
  comprovanteData = null;
  comprovanteFileMeta = null;
  const preview = document.getElementById('comprovante-preview');
  if (preview) preview.style.display = 'none';

  const metaEl = document.getElementById('comprovante-meta');
  if (metaEl) metaEl.textContent = '';

  const previewImg = document.getElementById('preview-img');
  if (previewImg) {
    previewImg.removeAttribute('src');
    previewImg.style.display = 'block';
  }

  const previewPdf = document.getElementById('preview-pdf');
  if (previewPdf) {
    previewPdf.removeAttribute('src');
    previewPdf.style.display = 'none';
  }

  const input = document.getElementById('comprovante-input');
  if (input) input.value = '';
  
  const btnEnviar = document.getElementById('btn-enviar-comprovante');
  btnEnviar.textContent = 'Enviar pedido';
  btnEnviar.style.background = 'linear-gradient(135deg, #6B46C1, #8B5CF6)';
}

async function uploadComprovanteIfPossible() {
  if (!comprovanteData) return null;
  try {
    const r = await fetch('/api/comprovantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: comprovanteData,
        originalName: comprovanteFileMeta?.name || 'comprovante'
      })
    });
    if (!r.ok) return null;
    const data = await r.json();
    const url = typeof data?.url === 'string' ? data.url : null;
    return url;
  } catch {
    return null;
  }
}

async function salvarPedidoNoServidor(pedidoCompleto) {
  try {
    const r = await fetch('/api/pedidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoCompleto)
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Enviar pedido (com comprovante) para o painel admin (versão antiga - mantida para compatibilidade)
async function enviarComprovante() {
  const statusBadge = document.getElementById('status-badge');

  // Pegar dados do usuário logado (opcional). Se não houver, segue como convidado.
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');

  if (!comprovanteData) {
    alert('📎 Para enviar o pedido, anexe o comprovante de pagamento.');
    return;
  }

  const btnEnviar = document.getElementById('btn-enviar-comprovante');
  if (btnEnviar) {
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
  }
  if (statusBadge) {
      alert('Erro ao carregar dados do pedido. Redirecionando para o carrinho...');
      window.location.href = 'carrinho.html';
  }
  
  // Buscar dados completos do usuário, se existir; caso contrário, cria um cliente genérico (convidado)
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  let usuario = null;
  if (usuarioLogado && typeof usuarioLogado.id !== 'undefined') {
    usuario = usuarios.find(u => u.id === usuarioLogado.id) || usuarioLogado;
  }

  if (!usuario) {
    usuario = {
      nome: 'Cliente (convidado)',
      cpf: '',
      usuario: 'convidado',
      endereco: {
        endereco: '',
        complemento: '',
        cep: '',
        cidade: '',
        uf: ''
      }
    };
  }

  const dadosPedido = sessionStorage.getItem('dadosPagamento');
  
  if (!dadosPedido) {
    alert('Erro ao carregar dados do pedido');
    return;
  }

  const pedido = JSON.parse(dadosPedido);
  // Adicionar observação ao pedido completo
  let observacao = '';
  try {
    observacao = document.getElementById('observacao-pedido')?.value || pedido.observacao || '';
  } catch { observacao = pedido.observacao || ''; }

  // Upload do comprovante no servidor (para permitir PDF/arquivo maior)
  const comprovanteUrl = await uploadComprovanteIfPossible();
  
  // Salvar pedido completo no localStorage (painel admin lê daqui)
  const pedidoCompleto = {
    id: Date.now(),
    data: new Date().toLocaleString('pt-BR'),
    timestamp: Date.now(), // Timestamp para controle de exibição
    codigoRastreio: null,
    cliente: {
      nome: usuario.nome,
      cpf: usuario.cpf,
      usuario: usuario.usuario,
      endereco: usuario.endereco.endereco,
      complemento: usuario.endereco.complemento,
      cep: usuario.endereco.cep,
      cidade: usuario.endereco.cidade,
      uf: usuario.endereco.uf
    },
    itens: pedido.itens,
    subtotal: pedido.subtotal,
    desconto: pedido.desconto,
    frete: pedido.frete,
    total: pedido.total,
    cupom: pedido.cupom,
    comprovante: comprovanteUrl ? null : (comprovanteData || null),
    comprovanteUrl: comprovanteUrl || null,
    comprovanteNome: comprovanteFileMeta?.name || null,
    comprovanteTipo: comprovanteFileMeta?.type || null,
    status: 'Pago',
    dataPagamento: new Date().toLocaleString('pt-BR'),
    exibirNoAdmin: true,
    observacao: observacao
  };

  // Salvar no servidor (preferencial)
  const okServidor = await salvarPedidoNoServidor(pedidoCompleto);

  // Fallback local (caso servidor não esteja disponível)
  if (!okServidor) {
    let pedidos = JSON.parse(localStorage.getItem('pedidos')) || [];
    pedidos.push(pedidoCompleto);
    try {
      localStorage.setItem('pedidos', JSON.stringify(pedidos));
    } catch (e) {
      alert(
        'Não foi possível salvar o pedido.\n\n' +
        'Tente um comprovante menor ou verifique o servidor.'
      );
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar pedido';
      }
      if (statusBadge) {
        statusBadge.textContent = 'Aguardando pagamento';
      }
      return;
    }
  }

  // Notificar no WhatsApp (abre com mensagem pronta)
  try {
    const nomeLoja = (() => {
      try {
        const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
          ? window.SiteConfig.get()
          : null;
        return String(cfg?.nomeLoja || 'Flor de Íris');
      } catch {
        return 'Flor de Íris';
      }
    })();

    const entrega = getDadosEntregaFromDom();
    const enderecoLinha = `${entrega.endereco || usuario.endereco.endereco}${usuario.endereco.complemento ? ', ' + usuario.endereco.complemento : ''}`;
    const itensMsg = (Array.isArray(pedido.itens) ? pedido.itens : []).map((item, i) => {
      const qtd = Number(item.quantidade) || 0;
      const preco = Number(item.preco) || 0;
      const subtotal = preco * qtd;
      return `${i + 1}) ${item.nome} — ${qtd}x ${formatPriceBR(preco)} = ${formatPriceBR(subtotal)}`;
    }).join('\n');

    let mensagem = `*PEDIDO ${nomeLoja}*\n`;
    mensagem += `Pedido #${pedidoCompleto.id}\n`;
    mensagem += `Data: ${pedidoCompleto.dataPagamento || pedidoCompleto.data}\n\n`;
    mensagem += `*Cliente:* ${usuario.nome}\n`;
    mensagem += `CPF: ${usuario.cpf}\n`;
    mensagem += `Endereço: ${enderecoLinha}\n`;
    mensagem += `CEP: ${usuario.endereco.cep} — ${usuario.endereco.cidade}/${usuario.endereco.uf}\n\n`;
    mensagem += `*Itens:*\n${itensMsg || '(sem itens)'}\n\n`;
    mensagem += `*Total:* ${formatPriceBR(pedido.total)}\n`;
    if (pedido.desconto > 0) mensagem += `Desconto: -${formatPriceBR(pedido.desconto)}${pedido.cupom ? ` (Cupom: ${pedido.cupom})` : ''}\n`;
    if (pedido.frete > 0) mensagem += `Frete: ${formatPriceBR(pedido.frete)}\n`;
    mensagem += `\n*COMPROVANTE ANEXADO* (disponível no painel admin)`;

    const waDigits = getWhatsappDigitsFromConfig();
    const urlWhatsApp = `https://api.whatsapp.com/send/?phone=${waDigits}&text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  } catch {
    // Se falhar, ainda assim o pedido já foi salvo no painel admin.
  }


  // Notificação visual para o cliente
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao('Pedido enviado com sucesso! Você será avisado quando for enviado.', 'success');
  } else {
    alert(
      'Pedido enviado com comprovante.\n\n' +
      'Ele já apareceu no painel admin.\n' +
      'O WhatsApp foi aberto com a mensagem pronta (clique em ENVIAR).'
    );
  }

  if (statusBadge) {
    statusBadge.textContent = 'Pagamento enviado - aguardando confirmação';
  }

  // Guardar o último pedido para exibir na confirmação e no carrinho
  try {
    localStorage.setItem('ultimoPedidoId', String(pedidoCompleto.id));
  } catch {
    // ignore
  }

  // Limpar carrinho e dados temporários
  localStorage.removeItem('carrinho');
  sessionStorage.removeItem('dadosPagamento');

  // Voltar para o início
  setTimeout(() => {
    window.location.href = 'confirmacao.html';
  }, 1200);
}

// Formatação auxiliar
function formatPriceBR(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// Página de Pagamento (bloco auxiliar)
document.addEventListener('DOMContentLoaded', () => {
  
  // Tentar carregar usuário logado (opcional)
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
  
  // Se estiver logado, preenche os dados de entrega; se não, segue como convidado
  if (usuarioLogado) {
    carregarDadosUsuario(usuarioLogado);
  }
  
  // Elementos
  const itensLista = document.getElementById('itens-lista');
  const subtotalEl = document.getElementById('subtotal-pag');
  const descontoEl = document.getElementById('desconto-pag');
  const freteEl = document.getElementById('frete-pag');
  const totalEl = document.getElementById('total-pag');
  const descontoLinha = document.getElementById('desconto-linha');
  const freteLinha = document.getElementById('frete-linha');
  const observacaoInput = document.getElementById('observacao-pedido');

  // Formatação de moeda
  const formatPrice = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Carregar dados do pedido
  function carregarPedido() {
    const dadosPedido = sessionStorage.getItem('dadosPagamento');
    
    if (!dadosPedido) {
      alert('Nenhum pedido encontrado. Redirecionando para o carrinho...');
      window.location.href = 'carrinho.html';
      return;
    }

    const pedido = JSON.parse(dadosPedido);
    
    // Renderizar itens
    let htmlItens = '';
    pedido.itens.forEach(item => {
      const subtotalItem = (Number(item.preco) || 0) * item.quantidade;
      htmlItens += `
        <div class="item-pedido">
          <div class="item-info">
            <div class="item-nome">${item.nome}</div>
            <div class="item-quantidade">Quantidade: ${item.quantidade}</div>
          </div>
          <div class="item-preco">${formatPrice(subtotalItem)}</div>
        </div>
      `;
    });
    itensLista.innerHTML = htmlItens;

    // Exibir totais
    subtotalEl.textContent = formatPrice(pedido.subtotal);
    
    if (pedido.desconto > 0) {
      descontoLinha.style.display = 'flex';
      descontoEl.textContent = `-${formatPrice(pedido.desconto)}`;
    }
    
    if (pedido.frete > 0) {
      freteLinha.style.display = 'flex';
      freteEl.textContent = formatPrice(pedido.frete);
    }
    
    totalEl.textContent = formatPrice(pedido.total);
    
    // Gerar QR Code com o valor total
    gerarQRCodeComValor(pedido.total);

    // Preencher observação se já existir
    if (observacaoInput && pedido.observacao) {
      observacaoInput.value = pedido.observacao;
    }
  }

  carregarPedido();

  // Salvar observação no sessionStorage ao digitar
  if (observacaoInput) {
    observacaoInput.addEventListener('input', () => {
      const dados = sessionStorage.getItem('dadosPagamento');
      if (!dados) return;
      let obj = {};
      try { obj = JSON.parse(dados); } catch { obj = {}; }
      obj.observacao = observacaoInput.value;
      sessionStorage.setItem('dadosPagamento', JSON.stringify(obj));
    });
  }
});

function getPixConfig() {
  const fallback = {
    chave: 'rodolfo.rags1@gmail.com',
    beneficiario: 'Rodolfo Adriano Goulart',
    cidade: 'Sao Paulo'
  };

  try {
    const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
      ? window.SiteConfig.get()
      : null;
    const pix = cfg && cfg.pix ? cfg.pix : null;
    return {
      chave: String(pix?.chave || fallback.chave),
      beneficiario: String(pix?.beneficiario || fallback.beneficiario),
      cidade: String(pix?.cidade || fallback.cidade)
    };
  } catch {
    return fallback;
  }
}

function getWhatsappDigitsFromConfig() {
  const fallbackDigits = '554498642644';
  try {
    const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
      ? window.SiteConfig.get()
      : null;

    const wa = cfg?.whatsapp;
    if (!wa) return fallbackDigits;

    if (window.SiteConfig && typeof window.SiteConfig.normalizeWhatsappDigits === 'function') {
      const digits = window.SiteConfig.normalizeWhatsappDigits(wa);
      return digits || fallbackDigits;
    }

    const digits = String(wa).replace(/\D+/g, '');
    if (!digits) return fallbackDigits;
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
    return digits;
  } catch {
    return fallbackDigits;
  }
}

// Carregar dados do usuário logado
function carregarDadosUsuario(usuario) {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const dadosCompletos = usuarios.find(u => u.id === usuario.id);
  
  if (dadosCompletos) {
    document.getElementById('usuario-nome').textContent = dadosCompletos.nome;
    document.getElementById('usuario-cpf').textContent = dadosCompletos.cpf;
    document.getElementById('usuario-endereco').textContent = `${dadosCompletos.endereco.endereco}${dadosCompletos.endereco.complemento ? ', ' + dadosCompletos.endereco.complemento : ''}`;
    document.getElementById('usuario-cep').textContent = dadosCompletos.endereco.cep;
    document.getElementById('usuario-cidade').textContent = `${dadosCompletos.endereco.cidade}/${dadosCompletos.endereco.uf}`;
  }
}

// Gerar QR Code com valor
function gerarQRCodeComValor(valorTotal) {
  const valor = Number(valorTotal).toFixed(2);
  
  // Gerar código PIX válido no formato EMV
  const pixPayload = gerarPayloadPix(valor);
  
  // Gerar QR Code usando API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;
  
  const qrImg = document.getElementById('qr-code-img');
  if (qrImg) {
    qrImg.src = qrCodeUrl;
  }
  
  // Atualizar valor exibido abaixo do QR Code
  const valorQRCode = document.getElementById('valor-qr-code');
  if (valorQRCode) {
    valorQRCode.textContent = formatPriceBR(valor);
  }
}

// Gerar payload PIX no formato EMV correto
function gerarPayloadPix(valor) {
  const pix = getPixConfig();
  const chavePix = pix.chave;
  const nomeBeneficiario = pix.beneficiario;
  const cidade = pix.cidade;
  
  // Função auxiliar para formatar campo EMV
  function formatarCampoEMV(id, valor) {
    const tamanho = valor.length.toString().padStart(2, '0');
    return `${id}${tamanho}${valor}`;
  }
  
  // Payload Format Indicator
  let payload = formatarCampoEMV('00', '01');
  
  // Merchant Account Information (PIX)
  const merchantAccountInfo = 
    formatarCampoEMV('00', 'br.gov.bcb.pix') +
    formatarCampoEMV('01', chavePix);
  payload += formatarCampoEMV('26', merchantAccountInfo);
  
  // Merchant Category Code
  payload += formatarCampoEMV('52', '0000');
  
  // Transaction Currency (986 = BRL)
  payload += formatarCampoEMV('53', '986');
  
  // Transaction Amount
  payload += formatarCampoEMV('54', valor);
  
  // Country Code
  payload += formatarCampoEMV('58', 'BR');
  
  // Merchant Name
  payload += formatarCampoEMV('59', nomeBeneficiario);
  
  // Merchant City
  payload += formatarCampoEMV('60', cidade);
  
  // Additional Data Field Template
  const additionalData = formatarCampoEMV('05', '***');
  payload += formatarCampoEMV('62', additionalData);
  
  // CRC16 (será calculado)
  payload += '6304';
  
  // Calcular CRC16
  const crc = calcularCRC16(payload);
  payload += crc;
  
  return payload;
}

// Calcular CRC16 CCITT
function calcularCRC16(str) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Copiar chave PIX
function copiarChavePix() {
  const chavePix = getPixConfig().chave;
  
  navigator.clipboard.writeText(chavePix).then(() => {
    mostrarMensagemCopiado('Chave PIX copiada!');
  }).catch(() => {
    copiarFallback(chavePix);
  });
}

// Copiar código PIX Copia e Cola
function copiarCodigoPix() {
  // Pegar valor total do pedido
  const dadosPedido = sessionStorage.getItem('dadosPagamento');
  let valorTotal = '0.00';
  
  if (dadosPedido) {
    const pedido = JSON.parse(dadosPedido);
    valorTotal = Number(pedido.total).toFixed(2);
  }
  
  // Gerar código PIX válido
  const codigoPix = gerarPayloadPix(valorTotal);
  
  navigator.clipboard.writeText(codigoPix).then(() => {
    mostrarMensagemCopiado(`Código PIX copiado! Valor: R$ ${valorTotal}`);
  }).catch(() => {
    copiarFallback(codigoPix);
  });
}

// Fallback para copiar
function copiarFallback(texto) {
  const input = document.createElement('input');
  input.value = texto;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  mostrarMensagemCopiado('Copiado!');
}

// Mostrar mensagem de copiado
function mostrarMensagemCopiado(texto) {
  const msg = document.getElementById('copiado-msg');
  msg.textContent = String(texto || '');
  msg.classList.add('show');
  
  setTimeout(() => {
    msg.classList.remove('show');
  }, 3000);
}

function setDropzoneActive(active) {
  const dz = document.getElementById('comprovante-dropzone');
  if (!dz) return;
  dz.style.borderColor = active ? 'rgba(107, 70, 193, 0.55)' : 'rgba(107, 70, 193, 0.22)';
  dz.style.background = active ? 'rgba(107, 70, 193, 0.10)' : 'rgba(107, 70, 193, 0.06)';
}

async function compressImageFileToDataUrl(file) {
  // Tenta comprimir/redimensionar para reduzir tamanho no localStorage.
  // Fallback: retorna DataURL original.
  const toDataUrl = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('read-failed'));
    r.readAsDataURL(blob);
  });

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no-canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise((resolve) => {
      // JPEG costuma comprimir bem comprovantes
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.78);
    });

    if (!blob) throw new Error('blob-failed');

    const compressedDataUrl = await toDataUrl(blob);
    // Se por algum motivo ficou maior, usa o original
    if (compressedDataUrl && compressedDataUrl.length > 0) {
      return compressedDataUrl;
    }
  } catch {
    // ignore
  }

  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e?.target?.result || ''));
    reader.readAsDataURL(file);
  });
}

function readFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e?.target?.result || ''));
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

function attachComprovanteDropzone() {
  const dz = document.getElementById('comprovante-dropzone');
  const input = document.getElementById('comprovante-input');
  if (!dz || !input) return;

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDropzoneActive(true);
  });
  dz.addEventListener('dragleave', () => setDropzoneActive(false));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    setDropzoneActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    // Dispara o mesmo fluxo do input (sem depender de input.files)
    processComprovanteFile(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachComprovanteDropzone();
});

async function processComprovanteFile(file) {
  if (!file) return;

  const type = String(file.type || '');
  const isImage = type.startsWith(COMPROVANTE_ALLOWED_IMAGE_PREFIX);
  const isPdf = type === COMPROVANTE_ALLOWED_PDF;

  if (!isImage && !isPdf) {
    alert('Tipo de arquivo inválido. Envie uma imagem (JPG/PNG/WebP) ou PDF.');
    removerComprovante();
    return;
  }

  const maxMb = isPdf ? COMPROVANTE_MAX_MB_PDF : COMPROVANTE_MAX_MB_IMAGE;
  const maxBytes = maxMb * 1024 * 1024;
  if ((Number(file.size) || 0) > maxBytes) {
    alert(`Arquivo muito grande. Envie até ${maxMb}MB.`);
    removerComprovante();
    return;
  }

  const metaEl = document.getElementById('comprovante-meta');
  if (metaEl) {
    const tipoLabel = isPdf ? 'PDF' : 'Imagem';
    metaEl.textContent = `${file.name} • ${formatBytes(file.size)} • ${tipoLabel}`;
  }

  comprovanteFileMeta = { name: String(file.name || 'comprovante'), type: String(file.type || ''), size: Number(file.size) || 0 };

  // Comprimir/redimensionar para armazenamento (apenas imagens)
  comprovanteData = isPdf ? await readFileToDataUrl(file) : await compressImageFileToDataUrl(file);

  const previewDiv = document.getElementById('comprovante-preview');
  const previewImg = document.getElementById('preview-img');
  const previewPdf = document.getElementById('preview-pdf');
  if (previewImg) {
    previewImg.style.display = isPdf ? 'none' : 'block';
    if (!isPdf) previewImg.src = comprovanteData;
    if (isPdf) previewImg.removeAttribute('src');
  }
  if (previewPdf) {
    previewPdf.style.display = isPdf ? 'block' : 'none';
    if (isPdf) previewPdf.setAttribute('src', comprovanteData);
    if (!isPdf) previewPdf.removeAttribute('src');
  }
  if (previewDiv) previewDiv.style.display = 'block';

  // Atualizar texto do botão
  const btnEnviar = document.getElementById('btn-enviar-comprovante');
  if (btnEnviar) {
    btnEnviar.textContent = 'Enviar pedido';
    btnEnviar.style.background = 'linear-gradient(135deg, #6B46C1, #8B5CF6)';
  }
}

function previewComprovante(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  processComprovanteFile(file);
}

function removerComprovante() {
  comprovanteData = null;
  comprovanteFileMeta = null;
  const preview = document.getElementById('comprovante-preview');
  if (preview) preview.style.display = 'none';

  const metaEl = document.getElementById('comprovante-meta');
  if (metaEl) metaEl.textContent = '';

  const previewImg = document.getElementById('preview-img');
  if (previewImg) {
    previewImg.removeAttribute('src');
    previewImg.style.display = 'block';
  }

  const previewPdf = document.getElementById('preview-pdf');
  if (previewPdf) {
    previewPdf.removeAttribute('src');
    previewPdf.style.display = 'none';
  }

  const input = document.getElementById('comprovante-input');
  if (input) input.value = '';
  
  const btnEnviar = document.getElementById('btn-enviar-comprovante');
  btnEnviar.textContent = 'Enviar pedido';
  btnEnviar.style.background = 'linear-gradient(135deg, #6B46C1, #8B5CF6)';
}

async function uploadComprovanteIfPossible() {
  if (!comprovanteData) return null;
  try {
    const r = await fetch('/api/comprovantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: comprovanteData,
        originalName: comprovanteFileMeta?.name || 'comprovante'
      })
    });
    if (!r.ok) return null;
    const data = await r.json();
    const url = typeof data?.url === 'string' ? data.url : null;
    return url;
  } catch {
    return null;
  }
}

async function salvarPedidoNoServidor(pedidoCompleto) {
  try {
    const r = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoCompleto)
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function atualizarPedidoNoServidor(id, dadosAtualizados) {
  if (!id) return false;
  try {
    const r = await fetch(`/api/pedidos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosAtualizados)
    });
    return r.ok;
  } catch {
    return false;
  }
}

function criarPedidoCompletoApartirPagamento(dadosPagamento, usuario, atualizacao) {
  const agora = new Date();
  const timestamp = Date.now();
  const endereco = usuario.endereco || {};
  const entrega = getDadosEntregaFromDom();

  const clienteNome = entrega.nome || usuario.nome;
  const clienteCpf = entrega.cpf || usuario.cpf;
  const clienteEndereco = entrega.endereco || endereco.endereco;
  const clienteComplemento = endereco.complemento || '';
  const clienteCep = entrega.cep || endereco.cep;
  const clienteCidade = entrega.cidade || endereco.cidade;
  const clienteUf = entrega.uf || endereco.uf;

  return {
    id: timestamp,
    data: agora.toLocaleString('pt-BR'),
    timestamp,
    codigoRastreio: null,
    cliente: {
      nome: clienteNome,
      cpf: clienteCpf,
      usuario: usuario.usuario,
      endereco: clienteEndereco,
      complemento: clienteComplemento,
      cep: clienteCep,
      cidade: clienteCidade,
      uf: clienteUf
    },
    itens: dadosPagamento.itens || [],
    subtotal: dadosPagamento.subtotal || 0,
    desconto: dadosPagamento.desconto || 0,
    frete: dadosPagamento.frete || 0,
    total: dadosPagamento.total || 0,
    cupom: dadosPagamento.cupom || null,
    comprovante: atualizacao?.comprovante ?? null,
    comprovanteUrl: atualizacao?.comprovanteUrl ?? null,
    comprovanteNome: atualizacao?.comprovanteNome ?? null,
    comprovanteTipo: atualizacao?.comprovanteTipo ?? null,
    status: atualizacao?.status || 'Pago',
    dataPagamento: atualizacao?.dataPagamento || agora.toLocaleString('pt-BR'),
    exibirNoAdmin: true,
    observacao: atualizacao?.observacao || dadosPagamento.observacao || ''
  };
}

// Enviar pedido (com comprovante) para o painel admin
async function enviarComprovante() {
  const statusBadge = document.getElementById('status-badge');
  const btnEnviar = document.getElementById('btn-enviar-comprovante');

  // Tenta usar usuário logado, mas permite seguir como convidado
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');

  if (!comprovanteData) {
    alert('📎 Para enviar o pedido, anexe o comprovante de pagamento.');
    return;
  }

  if (btnEnviar) {
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
  }
  if (statusBadge) {
    statusBadge.textContent = 'Enviando pedido para a loja...';
  }

  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  let usuario = null;
  if (usuarioLogado && typeof usuarioLogado.id !== 'undefined') {
    usuario = usuarios.find(u => u.id === usuarioLogado.id) || usuarioLogado;
  }

  // Se não houver usuário logado/dados no localStorage, cria um cliente genérico (compra como convidado)
  if (!usuario) {
    usuario = {
      nome: 'Cliente (convidado)',
      cpf: '',
      usuario: 'convidado',
      endereco: {
        endereco: '',
        complemento: '',
        cep: '',
        cidade: '',
        uf: ''
      }
    };
  }

  const dadosPagamentoStr = sessionStorage.getItem('dadosPagamento');
  if (!dadosPagamentoStr) {
    alert('Erro ao carregar dados do pedido. Redirecionando para o carrinho...');
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar pedido';
    }
    if (statusBadge) {
      statusBadge.textContent = 'Aguardando pagamento';
    }
    window.location.href = 'carrinho.html';
    return;
  }

  let dadosPagamento;
  try {
    dadosPagamento = JSON.parse(dadosPagamentoStr);
  } catch (error) {
    console.error('Erro ao analisar dados do pagamento:', error);
    alert('Erro ao ler os dados do pedido. Volte ao carrinho e tente novamente.');
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar pedido';
    }
    if (statusBadge) {
      statusBadge.textContent = 'Aguardando pagamento';
    }
    return;
  }

  let observacao = '';
  try {
    observacao = document.getElementById('observacao-pedido')?.value || dadosPagamento.observacao || '';
  } catch {
    observacao = dadosPagamento.observacao || '';
  }

  const comprovanteUrl = await uploadComprovanteIfPossible();

  const agora = new Date();
  const dataPagamento = agora.toLocaleString('pt-BR');

  const atualizacao = {
    comprovante: comprovanteUrl ? null : (comprovanteData || null),
    comprovanteUrl: comprovanteUrl || null,
    comprovanteNome: comprovanteFileMeta?.name || null,
    comprovanteTipo: comprovanteFileMeta?.type || null,
    status: 'Pago',
    dataPagamento,
    observacao
  };

  let pedidoSalvoComSucesso = false;
  let pedidoIdFinal = dadosPagamento.pedidoId || null;

  if (dadosPagamento.pedidoId) {
    try {
      pedidoSalvoComSucesso = await atualizarPedidoNoServidor(dadosPagamento.pedidoId, atualizacao);
    } catch (error) {
      console.error('Erro ao atualizar pedido no servidor:', error);
    }

    if (!pedidoSalvoComSucesso) {
      try {
        let pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        if (!Array.isArray(pedidos)) pedidos = [];
        const idx = pedidos.findIndex(p => String(p.id) === String(dadosPagamento.pedidoId));
        if (idx >= 0) {
          pedidos[idx] = { ...pedidos[idx], ...atualizacao };
          pedidoIdFinal = pedidos[idx].id;
        } else {
          const novoPedido = criarPedidoCompletoApartirPagamento(dadosPagamento, usuario, atualizacao);
          pedidos.push(novoPedido);
          pedidoIdFinal = novoPedido.id;
        }
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        pedidoSalvoComSucesso = true;
      } catch (error) {
        console.error('Erro ao atualizar pedido localmente:', error);
      }
    }
  }

  if (!pedidoSalvoComSucesso) {
    const pedidoCompleto = criarPedidoCompletoApartirPagamento(dadosPagamento, usuario, atualizacao);
    pedidoIdFinal = pedidoCompleto.id;

    let okServidor = false;
    try {
      okServidor = await salvarPedidoNoServidor(pedidoCompleto);
    } catch (error) {
      console.error('Erro ao salvar pedido no servidor:', error);
    }

    if (!okServidor) {
      try {
        let pedidos = JSON.parse(localStorage.getItem('pedidos') || '[]');
        if (!Array.isArray(pedidos)) pedidos = [];
        pedidos.push(pedidoCompleto);
        localStorage.setItem('pedidos', JSON.stringify(pedidos));
        pedidoSalvoComSucesso = true;
      } catch (e) {
        console.error('Erro ao salvar pedido localmente:', e);
        alert(
          'Não foi possível salvar o pedido.\n\n' +
          'Tente um comprovante menor ou verifique o servidor.'
        );
        if (btnEnviar) {
          btnEnviar.disabled = false;
          btnEnviar.textContent = 'Enviar pedido';
        }
        if (statusBadge) {
          statusBadge.textContent = 'Aguardando pagamento';
        }
        return;
      }
    } else {
      pedidoSalvoComSucesso = true;
    }
  }

  // Notificar no WhatsApp (abre com mensagem pronta)
  try {
    const nomeLoja = (() => {
      try {
        const cfg = window.SiteConfig && typeof window.SiteConfig.get === 'function'
          ? window.SiteConfig.get()
          : null;
        return String(cfg?.nomeLoja || 'Flor de Íris');
      } catch {
        return 'Flor de Íris';
      }
    })();

    const entrega = getDadosEntregaFromDom();
    const enderecoLinha = `${entrega.endereco || usuario.endereco.endereco}${usuario.endereco.complemento ? ', ' + usuario.endereco.complemento : ''}`;
    const itensMsg = (Array.isArray(dadosPagamento.itens) ? dadosPagamento.itens : []).map((item, i) => {
      const qtd = Number(item.quantidade) || 0;
      const preco = Number(item.preco) || 0;
      const subtotal = preco * qtd;
      return `${i + 1}) ${item.nome} — ${qtd}x ${formatPriceBR(preco)} = ${formatPriceBR(subtotal)}`;
    }).join('\n');

    let mensagem = `*PEDIDO ${nomeLoja}*\n`;
    if (pedidoIdFinal) {
      mensagem += `Pedido #${pedidoIdFinal}\n`;
    }
    mensagem += `Data: ${dataPagamento}\n\n`;
    mensagem += `*Cliente:* ${usuario.nome}\n`;
    mensagem += `CPF: ${usuario.cpf}\n`;
    mensagem += `Endereço: ${enderecoLinha}\n`;
    mensagem += `CEP: ${usuario.endereco.cep} — ${usuario.endereco.cidade}/${usuario.endereco.uf}\n\n`;
    mensagem += `*Itens:*\n${itensMsg || '(sem itens)'}\n\n`;
    mensagem += `*Total:* ${formatPriceBR(dadosPagamento.total)}\n`;
    if (dadosPagamento.desconto > 0) mensagem += `Desconto: -${formatPriceBR(dadosPagamento.desconto)}${dadosPagamento.cupom ? ` (Cupom: ${dadosPagamento.cupom})` : ''}\n`;
    if (dadosPagamento.frete > 0) mensagem += `Frete: ${formatPriceBR(dadosPagamento.frete)}\n`;
    mensagem += `\n*COMPROVANTE ANEXADO* (disponível no painel admin)`;

    const waDigits = getWhatsappDigitsFromConfig();
    const urlWhatsApp = `https://api.whatsapp.com/send/?phone=${waDigits}&text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank');
  } catch (error) {
    console.error('Erro ao abrir WhatsApp:', error);
    // Se falhar, ainda assim o pedido já foi salvo no painel admin.
  }

  // Notificação visual para o cliente
  if (typeof mostrarNotificacao === 'function') {
    mostrarNotificacao('Pedido enviado com sucesso! Você será avisado quando for enviado.', 'success');
  } else {
    alert(
      'Pedido enviado com comprovante.\n\n' +
      'Ele já apareceu no painel admin.\n' +
      'O WhatsApp foi aberto com a mensagem pronta (clique em ENVIAR).'
    );
  }

  if (statusBadge) {
    statusBadge.textContent = 'Pagamento enviado - aguardando confirmação';
  }

  // Guardar o último pedido para exibir na confirmação e no carrinho
  try {
    if (pedidoIdFinal) {
      localStorage.setItem('ultimoPedidoId', String(pedidoIdFinal));
    }
  } catch {
    // ignore
  }

  // Limpar carrinho e dados temporários
  localStorage.removeItem('carrinho');
  sessionStorage.removeItem('dadosPagamento');

  // Redirecionar para confirmação
  setTimeout(() => {
    window.location.href = 'confirmacao.html';
  }, 1200);
}

// Formatação auxiliar
function formatPriceBR(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
