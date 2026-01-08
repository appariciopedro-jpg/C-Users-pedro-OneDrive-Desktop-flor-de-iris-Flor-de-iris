// Sistema de Autenticação - Flor de Íris
console.log('Auth.js carregado');

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');

  if (formLogin) {
    formLogin.addEventListener('submit', fazerLogin);
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', fazerRegistro);
  }
});

// Trocar entre abas Login/Registro
function trocarAba(aba) {
  console.log('Trocando para aba:', aba);
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  forms.forEach(form => form.classList.remove('active'));
  
  if (aba === 'login') {
    tabs[0].classList.add('active');
    document.getElementById('form-login').classList.add('active');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('form-registro').classList.add('active');
  }
  
  esconderMensagem();
}

// Preview da foto de perfil
function previewFoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('foto-preview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
    };
    reader.readAsDataURL(file);
  }
}

// Formatar CPF
document.addEventListener('DOMContentLoaded', () => {
  const cpfInput = document.getElementById('reg-cpf');
  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
      }
    });
  }

  const cepInput = document.getElementById('reg-cep');
  if (cepInput) {
    cepInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 8) {
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
      }
    });
  }
});

// Mostrar mensagem
function mostrarMensagem(texto, tipo) {
  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = texto;
  mensagem.className = `mensagem ${tipo}`;
  mensagem.style.display = 'block';
  
  setTimeout(() => {
    esconderMensagem();
  }, 5000);
}

function esconderMensagem() {
  const mensagem = document.getElementById('mensagem');
  mensagem.style.display = 'none';
}

function setLoading(botaoId, isLoading, textoLoading) {
  const btn = document.getElementById(botaoId);
  if (!btn) return;

  if (!btn.dataset.originalText) {
    btn.dataset.originalText = btn.textContent;
  }

  btn.disabled = Boolean(isLoading);
  btn.textContent = isLoading ? (textoLoading || 'Aguarde...') : btn.dataset.originalText;
}

function toggleSenha(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(buttonId);
  if (!input || !btn) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
}

// Validar CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

// Fazer Login
function fazerLogin(event) {
  event.preventDefault();
  console.log('Tentando fazer login...');

  setLoading('btn-login', true, 'Entrando...');
  
  const usuario = document.getElementById('login-usuario').value.trim();
  const senha = document.getElementById('login-senha').value;
  
  console.log('Usuário digitado:', usuario);
  
  if (!usuario || !senha) {
    mostrarMensagem('Preencha todos os campos.', 'erro');
    setLoading('btn-login', false);
    return;
  }
  
  // Buscar usuários do localStorage
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  console.log('Total de usuários cadastrados:', usuarios.length);
  
  // Procurar usuário
  const usuarioEncontrado = usuarios.find(u => 
    (u.usuario.toLowerCase() === usuario.toLowerCase() || 
     u.cpf.replace(/\D/g, '') === usuario.replace(/\D/g, '')) && 
    u.senha === senha
  );
  
  if (usuarioEncontrado) {
    console.log('Usuário encontrado.');
    // Salvar sessão do usuário
    const sessao = {
      id: usuarioEncontrado.id,
      nome: usuarioEncontrado.nome,
      usuario: usuarioEncontrado.usuario,
      foto: usuarioEncontrado.foto || null,
      logadoEm: new Date().toISOString()
    };
    
    localStorage.setItem('usuarioLogado', JSON.stringify(sessao));
    
    mostrarMensagem('Login realizado com sucesso.', 'sucesso');
    
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } else {
    console.log('Usuário não encontrado');
    mostrarMensagem('Usuário ou senha incorretos.', 'erro');
    setLoading('btn-login', false);
  }
}

// Fazer Registro
function fazerRegistro(event) {
  event.preventDefault();
  console.log('Tentando fazer registro...');

  setLoading('btn-registro', true, 'Criando conta...');
  
  const nome = document.getElementById('reg-nome').value.trim();
  const usuario = document.getElementById('reg-usuario').value.trim();
  const cpf = document.getElementById('reg-cpf').value.trim();
  const cep = document.getElementById('reg-cep').value.trim();
  const endereco = document.getElementById('reg-endereco').value.trim();
  const cidade = document.getElementById('reg-cidade').value.trim();
  const uf = document.getElementById('reg-uf').value.trim().toUpperCase();
  const complemento = document.getElementById('reg-complemento').value.trim();
  const senha = document.getElementById('reg-senha').value;
  const confirmaSenha = document.getElementById('reg-confirma-senha').value;
  
  // Validações
  if (!nome || !usuario || !cpf || !cep || !endereco || !cidade || !uf || !senha) {
    mostrarMensagem('Preencha todos os campos obrigatórios.', 'erro');
    setLoading('btn-registro', false);
    return;
  }
  
  if (!validarCPF(cpf)) {
    mostrarMensagem('CPF inválido.', 'erro');
    setLoading('btn-registro', false);
    return;
  }
  
  if (senha.length < 6) {
    mostrarMensagem('A senha deve ter no mínimo 6 caracteres.', 'erro');
    setLoading('btn-registro', false);
    return;
  }
  
  if (senha !== confirmaSenha) {
    mostrarMensagem('As senhas não coincidem.', 'erro');
    setLoading('btn-registro', false);
    return;
  }
  
  // Verificar se usuário ou CPF já existe
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  
  const usuarioExiste = usuarios.find(u => 
    u.usuario.toLowerCase() === usuario.toLowerCase() || 
    u.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '')
  );
  
  if (usuarioExiste) {
    mostrarMensagem('Usuário ou CPF já cadastrado.', 'erro');
    setLoading('btn-registro', false);
    return;
  }
  
  // Pegar foto de perfil (se houver)
  const fotoPreview = document.querySelector('#foto-preview img');
  const foto = fotoPreview ? fotoPreview.src : null;
  
  // Criar novo usuário
  const novoUsuario = {
    id: Date.now(),
    nome,
    usuario,
    cpf,
    endereco: {
      cep,
      endereco,
      cidade,
      uf,
      complemento
    },
    foto,
    senha,
    criadoEm: new Date().toISOString()
  };
  
  usuarios.push(novoUsuario);
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  console.log('Novo usuário cadastrado:', usuario);
  console.log('Total de usuários agora:', usuarios.length);
  
  mostrarMensagem('Conta criada com sucesso. Faça login.', 'sucesso');
  
  // Limpar formulário
  document.getElementById('form-registro').reset();
  document.getElementById('foto-preview').innerHTML = '';
  
  // Trocar para aba de login após 2 segundos
  setTimeout(() => {
    trocarAba('login');
    setLoading('btn-registro', false);
  }, 2000);
}

// Verificar se usuário está logado ao carregar página
function verificarLogin() {
  const usuarioLogado = localStorage.getItem('usuarioLogado');
  return usuarioLogado ? JSON.parse(usuarioLogado) : null;
}

// Fazer logout
function fazerLogout() {
  localStorage.removeItem('usuarioLogado');
  window.location.href = 'login.html';
}

// Tornar funções acessíveis globalmente
window.trocarAba = trocarAba;
window.fazerLogin = fazerLogin;
window.fazerRegistro = fazerRegistro;
window.previewFoto = previewFoto;
window.verificarLogin = verificarLogin;
window.fazerLogout = fazerLogout;
 

