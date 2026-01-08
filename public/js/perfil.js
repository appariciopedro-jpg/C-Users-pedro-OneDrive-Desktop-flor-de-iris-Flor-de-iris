// Sistema de Perfil do Usuário
document.addEventListener('DOMContentLoaded', () => {
  verificarLogin();
  carregarDadosPerfil();
  carregarPrivacidade();
});

const RASTREAE_URL = 'https://rastreae.com.br/busca';
const JADLOG_URL = 'https://www.jadlog.com.br/jadlog/home';

function buildRastreaeUrl(codigo) {
  const q = encodeURIComponent(String(codigo || '').trim());
  if (!q) return RASTREAE_URL;
  return `${RASTREAE_URL}?q=${q}&codigo=${q}&tracking=${q}#${q}`;
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

async function getPedidosPreferServer() {
  const server = await fetchJSON('/api/pedidos');
  if (Array.isArray(server)) return server;
  try {
    const local = JSON.parse(localStorage.getItem('pedidos') || '[]');
    return Array.isArray(local) ? local : [];
  } catch {
    return [];
  }
}

function getComprovanteSrcPedido(pedido) {
  if (!pedido) return null;
  if (pedido.comprovante && typeof pedido.comprovante === 'string') return pedido.comprovante;
  if (pedido.comprovanteUrl && typeof pedido.comprovanteUrl === 'string') return pedido.comprovanteUrl;
  if (pedido.comprovantePath && typeof pedido.comprovantePath === 'string') return pedido.comprovantePath;
  return null;
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

function verificarLogin() {
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  
  if (!usuarioLogado) {
    alert('Você precisa estar logado para acessar seu perfil.');
    window.location.href = 'login.html';
    return;
  }
}

async function carregarDadosPerfil() {
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuario = usuarios.find(u => u.id === usuarioLogado.id);
  
  if (!usuario) {
    alert('Erro ao carregar dados do perfil.');
    window.location.href = 'login.html';
    return;
  }
  
  // Cabeçalho
  document.getElementById('perfil-nome').textContent = usuario.nome;
  document.getElementById('perfil-usuario').textContent = usuario.usuario;
  
  const dataCadastro = new Date(usuario.criadoEm).toLocaleDateString('pt-BR');
  document.getElementById('perfil-data').textContent = dataCadastro;
  
  // Foto de perfil
  if (usuario.foto) {
    document.getElementById('perfil-foto-header').innerHTML = `<img src="${usuario.foto}" alt="Foto">`;
    document.getElementById('perfil-foto-preview').innerHTML = `<img src="${usuario.foto}" alt="Foto">`;
  }
  
  // Badge de pedidos (prefere servidor)
  const pedidos = await getPedidosPreferServer();
  const pedidosUsuario = pedidos.filter(p => p?.cliente?.cpf === usuario.cpf);
  document.getElementById('badge-pedidos').textContent = `${pedidosUsuario.length} Pedido${pedidosUsuario.length !== 1 ? 's' : ''}`;
  
  // Informações Pessoais
  document.getElementById('info-nome').textContent = usuario.nome;
  document.getElementById('info-usuario').textContent = '@' + usuario.usuario;
  document.getElementById('info-cpf').textContent = usuario.cpf;
  document.getElementById('info-cadastro').textContent = dataCadastro;

  // Form de edição (dados)
  const inputEditarNome = document.getElementById('editar-nome');
  if (inputEditarNome) {
    inputEditarNome.value = usuario.nome;
  }
  
  // Endereço
  document.getElementById('end-endereco').textContent = usuario.endereco.endereco;
  document.getElementById('end-cep').textContent = usuario.endereco.cep;
  document.getElementById('end-cidade').textContent = usuario.endereco.cidade;
  document.getElementById('end-uf').textContent = usuario.endereco.uf;
  document.getElementById('end-complemento').textContent = usuario.endereco.complemento || 'Não informado';

  // Form de edição (endereço)
  const editarEndereco = document.getElementById('editar-endereco');
  const editarCep = document.getElementById('editar-cep');
  const editarCidade = document.getElementById('editar-cidade');
  const editarUf = document.getElementById('editar-uf');
  const editarComplemento = document.getElementById('editar-complemento');

  if (editarEndereco) editarEndereco.value = usuario.endereco.endereco || '';
  if (editarCep) editarCep.value = usuario.endereco.cep || '';
  if (editarCidade) editarCidade.value = usuario.endereco.cidade || '';
  if (editarUf) editarUf.value = (usuario.endereco.uf || '').toUpperCase();
  if (editarComplemento) editarComplemento.value = usuario.endereco.complemento || '';
  
  // Carregar pedidos
  carregarPedidosUsuario(usuario.cpf);
}

function trocarTab(event, tab) {
  // Remover active de todas as abas
  document.querySelectorAll('.perfil-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  // Ativar aba clicada
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
  document.getElementById('tab-' + tab).classList.add('active');
}

function abrirEdicaoDados() {
  const form = document.getElementById('form-editar-dados');
  if (!form) return;
  form.classList.add('active');
  const input = document.getElementById('editar-nome');
  if (input) input.focus();
}

function cancelarEdicaoDados() {
  const form = document.getElementById('form-editar-dados');
  if (!form) return;
  form.classList.remove('active');

  // Repor valor atual
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const usuario = usuarios.find(u => u.id === usuarioLogado?.id);
  const input = document.getElementById('editar-nome');
  if (usuario && input) input.value = usuario.nome;
}

function salvarEdicaoDados(event) {
  event.preventDefault();

  const novoNome = (document.getElementById('editar-nome')?.value || '').trim();
  if (!novoNome) {
    alert('Informe seu nome.');
    return;
  }

  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const index = usuarios.findIndex(u => u.id === usuarioLogado?.id);

  if (index === -1) {
    alert('Erro ao encontrar usuário.');
    return;
  }

  usuarios[index].nome = novoNome;
  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  usuarioLogado.nome = novoNome;
  localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));

  alert('Nome atualizado com sucesso.');
  cancelarEdicaoDados();
  carregarDadosPerfil();
}

function abrirEdicaoEndereco() {
  const form = document.getElementById('form-editar-endereco');
  if (!form) return;
  form.classList.add('active');
  const input = document.getElementById('editar-endereco');
  if (input) input.focus();
}

function cancelarEdicaoEndereco() {
  const form = document.getElementById('form-editar-endereco');
  if (!form) return;
  form.classList.remove('active');
  carregarDadosPerfil();
}

function salvarEdicaoEndereco(event) {
  event.preventDefault();

  const endereco = (document.getElementById('editar-endereco')?.value || '').trim();
  const cep = (document.getElementById('editar-cep')?.value || '').trim();
  const cidade = (document.getElementById('editar-cidade')?.value || '').trim();
  const uf = (document.getElementById('editar-uf')?.value || '').trim().toUpperCase();
  const complemento = (document.getElementById('editar-complemento')?.value || '').trim();

  if (!endereco || !cep || !cidade || !uf) {
    alert('Preencha endereço, CEP, cidade e UF.');
    return;
  }

  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const index = usuarios.findIndex(u => u.id === usuarioLogado?.id);
  if (index === -1) {
    alert('Erro ao encontrar usuário.');
    return;
  }

  usuarios[index].endereco = {
    endereco,
    cep,
    cidade,
    uf,
    complemento
  };

  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  alert('Endereço atualizado com sucesso.');
  cancelarEdicaoEndereco();
  carregarDadosPerfil();
}

function alterarFoto(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    alert('A foto deve ter no máximo 2MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
    const index = usuarios.findIndex(u => u.id === usuarioLogado.id);
    
    if (index !== -1) {
      usuarios[index].foto = e.target.result;
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      
      alert('Foto alterada com sucesso.');
      location.reload();
    }
  };
  
  reader.readAsDataURL(file);
}

async function carregarPedidosUsuario(cpf) {
  const container = document.getElementById('lista-pedidos-perfil');

  if (!container) return;
  container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Carregando pedidos...</p>';

  const pedidos = await getPedidosPreferServer();
  const pedidosUsuario = pedidos.filter(p => p?.cliente?.cpf === cpf);

  // Esconder automaticamente pedidos antigos que ainda não foram pagos (2 horas)
  const TEMPO_LIMITE = 2 * 60 * 60 * 1000; // 2 horas
  const agora = Date.now();

  const pedidosVisiveis = pedidosUsuario.filter(p => {
    const status = String(p.status || '').toLowerCase();

    // Se já está pago, sempre mostra
    if (status.includes('pago')) return true;

    // Se tem comprovante anexado, considera como pago
    const temComprovante = Boolean(getComprovanteSrcPedido(p));
    if (temComprovante) return true;

    // Para pedidos não pagos, só mostra por um tempo limitado
    const ts = typeof p.timestamp === 'number' ? p.timestamp : Date.parse(p.timestamp);
    if (!ts || Number.isNaN(ts)) return true; // se não tiver data, não some automaticamente
    return (agora - ts) < TEMPO_LIMITE;
  });
  
  if (pedidosVisiveis.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;color:#666;padding:32px 16px;">
        <p style="margin:0 0 8px 0;">Você ainda não fez nenhum pedido.</p>
        <p style="margin:0;font-size:0.9em;color:#888;">Pedidos não pagos ficam visíveis aqui por até <strong>2 horas</strong> após a criação.</p>
      </div>
    `;
    return;
  }
  
  // Ordenar por mais recentes
  pedidosVisiveis.sort((a, b) => b.id - a.id);
  
  let html = '';

  html += `
    <div style="margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#f9f7fc;color:#6B46C1;font-size:0.88em;">
      Pedidos que ainda estão <strong>aguardando pagamento</strong> aparecem aqui por até <strong>2 horas</strong> após a criação. Depois desse prazo, eles somem da sua lista, mas continuam registrados com a loja.
    </div>
  `;
  
  pedidosVisiveis.forEach(pedido => {
    const statusClass = pedido.status.toLowerCase().replace(/\s+/g, '-');
    const codigo = getCodigoRastreio(pedido);
    const rastreaeHref = codigo ? buildRastreaeUrl(codigo) : RASTREAE_URL;
    const comprovanteSrc = getComprovanteSrcPedido(pedido);
    const temComprovante = Boolean(comprovanteSrc);
    const comprovanteSafe = temComprovante ? String(comprovanteSrc).replace(/"/g, '&quot;') : '';
    const comprovanteHtml = temComprovante
      ? `
        <div style="background:#fff7fb;padding:12px;border-radius:8px;border:1px dashed rgba(219,39,119,0.35);margin-bottom:10px;">
          <p style="margin:0 0 6px 0;font-weight:700;color:#be185d;display:flex;align-items:center;gap:6px;">
            <span>📎</span><span>Comprovante do pagamento</span>
          </p>
          <a href="${comprovanteSafe}" target="_blank" rel="noopener noreferrer" class="btn-editar" style="display:inline-flex;align-items:center;gap:6px;font-size:0.9em;">
            Abrir comprovante
          </a>
          <p style="margin:6px 0 0 0;font-size:0.8em;color:#666;">Se não abrir, verifique se o bloqueador de pop-up do navegador não está impedindo.</p>
        </div>
      `
      : '';
    
    html += `
      <div class="pedido-card">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
          <div>
            <h4 style="margin: 0 0 5px 0;">Pedido #${pedido.id}</h4>
            <p style="margin: 0; color: #666; font-size: 0.9em;">${pedido.data}</p>
          </div>
          <span class="status-badge status-${statusClass}">${pedido.status}</span>
        </div>
        
        <div style="background: #f9f7fc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #6B46C1;">Itens:</p>
          ${pedido.itens.map(item => `
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span>${item.quantidade}x ${item.nome}</span>
              <span style="font-weight: 600;">${formatPrice(Number(item.preco) * item.quantidade)}</span>
            </div>
          `).join('')}
        </div>

        <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); margin-bottom: 10px;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #6B46C1;">Rastreio</p>
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">
            <div style="font-weight:800;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">
              Código: <span style="font-weight:900;">${codigo || '—'}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-secundario" data-track-copy="1" data-track-code="${codigo ? String(codigo).replace(/\"/g, '&quot;') : ''}" ${codigo ? '' : 'disabled'}>Copiar</button>
              <a class="btn-editar" data-track-open="rastreae" data-track-code="${codigo ? String(codigo).replace(/\"/g, '&quot;') : ''}" href="${rastreaeHref}" target="_blank" rel="noopener noreferrer">Abrir Rastreae</a>
              <a class="btn-secundario" data-track-open="jadlog" data-track-code="${codigo ? String(codigo).replace(/\"/g, '&quot;') : ''}" href="${JADLOG_URL}" target="_blank" rel="noopener noreferrer">Abrir Jadlog</a>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #666;">O código aparece quando o pedido for marcado como <strong>Enviado</strong>.</p>
        </div>
        ${comprovanteHtml}
        
        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e0d9f3;">
          <span style="font-weight: 600; color: #333;">Total:</span>
          <span style="font-weight: 700; color: #6B46C1; font-size: 1.2em;">${formatPrice(pedido.total)}</span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;

  // Wire actions
  container.querySelectorAll('button[data-track-copy="1"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const codigo = String(btn.getAttribute('data-track-code') || '').trim();
      if (!codigo) return;
      const ok = await copiarTexto(codigo);
      if (ok) alert('Código de rastreio copiado.');
    });
  });

  container.querySelectorAll('a[data-track-open]').forEach((a) => {
    a.addEventListener('click', () => {
      const codigo = String(a.getAttribute('data-track-code') || '').trim();
      if (!codigo) return;
      copiarTexto(codigo).catch(() => {});
    });
  });
}

function formatPrice(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function alterarSenha(event) {
  event.preventDefault();
  
  const senhaAtual = document.getElementById('senha-atual').value;
  const senhaNova = document.getElementById('senha-nova').value;
  const senhaConfirma = document.getElementById('senha-confirma').value;
  
  if (senhaNova !== senhaConfirma) {
    alert('As senhas não coincidem.');
    return;
  }
  
  if (senhaNova.length < 6) {
    alert('A nova senha deve ter no mínimo 6 caracteres.');
    return;
  }
  
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  const index = usuarios.findIndex(u => u.id === usuarioLogado.id);
  
  if (index === -1) {
    alert('Erro ao encontrar usuário.');
    return;
  }
  
  if (usuarios[index].senha !== senhaAtual) {
    alert('Senha atual incorreta.');
    return;
  }
  
  usuarios[index].senha = senhaNova;
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  alert('Senha alterada com sucesso.');
  
  document.getElementById('senha-atual').value = '';
  document.getElementById('senha-nova').value = '';
  document.getElementById('senha-confirma').value = '';
}

function fazerLogout() {
  if (confirm('Deseja realmente sair da sua conta?')) {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
  }
}

function carregarPrivacidade() {
  const privacidade = JSON.parse(localStorage.getItem('privacidade') || '{}');
  
  // Definir valores padrão
  const config = {
    notificacoes: privacidade.notificacoes !== false,
    emails: privacidade.emails || false,
    historico: privacidade.historico !== false,
    analise: privacidade.analise || false
  };
  
  localStorage.setItem('privacidade', JSON.stringify(config));
}

function togglePrivacidade(element, tipo) {
  element.classList.toggle('active');
  
  const privacidade = JSON.parse(localStorage.getItem('privacidade') || '{}');
  privacidade[tipo] = element.classList.contains('active');
  localStorage.setItem('privacidade', JSON.stringify(privacidade));
  
  // Notificação
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--iris-purple);color:white;padding:15px 25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:10000;';
  msg.textContent = element.classList.contains('active') ? 'Ativado' : 'Desativado';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

function excluirConta() {
  const confirma1 = confirm('TEM CERTEZA QUE DESEJA EXCLUIR SUA CONTA?\n\nTodos os seus dados serão permanentemente excluídos!');
  
  if (!confirma1) return;
  
  const confirma2 = confirm('ÚLTIMA CONFIRMAÇÃO!\n\nEsta ação NÃO PODE ser desfeita.\n\nDeseja mesmo excluir sua conta?');
  
  if (!confirma2) return;
  
  const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  
  // Remover usuário
  const novosUsuarios = usuarios.filter(u => u.id !== usuarioLogado.id);
  localStorage.setItem('usuarios', JSON.stringify(novosUsuarios));
  
  // Fazer logout
  localStorage.removeItem('usuarioLogado');
  
  alert('Conta excluída com sucesso.\n\nVocê será redirecionado para a página inicial.');
  window.location.href = 'index.html';
}
