// ============================================
// SISTEMA DE SEGURANÇA
// ============================================

// Proteção contra força bruta
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos
let loginAttempts = parseInt(localStorage.getItem('loginAttempts')) || 0;
let lockoutTime = parseInt(localStorage.getItem('lockoutTime')) || 0;

// Credenciais (em produção, isso deveria estar em backend seguro)
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234"; // você pode mudar

// Sanitizar entrada (proteção XSS)
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Verificar se está bloqueado
function checkLockout() {
  const now = Date.now();
  if (lockoutTime > now) {
    const remainingMinutes = Math.ceil((lockoutTime - now) / 60000);
    return remainingMinutes;
  }
  // Lockout expirou, resetar
  if (lockoutTime > 0 && lockoutTime <= now) {
    loginAttempts = 0;
    lockoutTime = 0;
    localStorage.setItem('loginAttempts', '0');
    localStorage.setItem('lockoutTime', '0');
  }
  return 0;
}

// Registrar tentativa falhada
function registerFailedAttempt() {
  loginAttempts++;
  localStorage.setItem('loginAttempts', loginAttempts.toString());
  
  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    lockoutTime = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem('lockoutTime', lockoutTime.toString());
    return true; // Bloqueado
  }
  return false;
}

// Resetar tentativas após login bem-sucedido
function resetAttempts() {
  loginAttempts = 0;
  lockoutTime = 0;
  localStorage.setItem('loginAttempts', '0');
  localStorage.setItem('lockoutTime', '0');
}

function login(event) {
  if (event) event.preventDefault();
  
  // Verificar bloqueio
  const blockedMinutes = checkLockout();
  if (blockedMinutes > 0) {
    alert(`Muitas tentativas falhas.\n\nAcesso bloqueado por ${blockedMinutes} minuto(s).\n\nPor segurança, tente novamente mais tarde.`);
    return;
  }
  
  const user = sanitizeInput(document.getElementById("user").value.trim());
  const senha = sanitizeInput(document.getElementById("senha").value);

  // Validação básica
  if (!user || !senha) {
    alert('Preencha todos os campos.');
    return;
  }

  if(user === ADMIN_USER && senha === ADMIN_PASS) {
    // Login bem-sucedido
    resetAttempts();
    
    // Salvar login seguro no sessionStorage
    const loginToken = btoa(Date.now() + ':' + Math.random());
    sessionStorage.setItem("admin-logado", "true");
    sessionStorage.setItem("admin-token", loginToken);
    sessionStorage.setItem("admin-login-time", Date.now().toString());
    
    // Log de segurança
    console.log('Login bem-sucedido:', new Date().toISOString());
    
    // Redirecionar para painel
    window.location.href = "painel.html";
  } else {
    // Login falhou
    const isBlocked = registerFailedAttempt();
    
    document.getElementById("senha").value = "";
    document.getElementById("senha").focus();
    
    if (isBlocked) {
      alert(`Usuário ou senha incorretos.\n\nMuitas tentativas falhas.\n\nPor segurança, o acesso foi bloqueado por ${LOCKOUT_DURATION/60000} minutos.`);
    } else {
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - loginAttempts;
      alert(`Usuário ou senha incorretos.\n\nTentativas restantes: ${remainingAttempts}`);
    }
    
    // Log de segurança
    console.warn('Tentativa de login falha:', new Date().toISOString(), 'Tentativa:', loginAttempts);
  }
}

