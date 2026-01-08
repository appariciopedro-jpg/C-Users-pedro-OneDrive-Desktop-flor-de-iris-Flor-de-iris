# 🛡️ Sistema de Segurança - Flor de Íris

## Proteções Implementadas

### 1. Proteção no Servidor (server.js)

#### Rate Limiting
- **Limite:** 60 requisições por minuto por IP
- **Bloqueio:** IPs que excedem o limite são bloqueados por 15 minutos
- **Limpeza:** Dados de rate limiting são limpos automaticamente a cada 5 minutos

#### Headers de Segurança
- **X-Frame-Options:** SAMEORIGIN (previne clickjacking)
- **X-Content-Type-Options:** nosniff (previne MIME sniffing)
- **X-XSS-Protection:** 1; mode=block (proteção XSS no navegador)
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Content-Security-Policy:** Configurado para permitir apenas recursos confiáveis
- **X-Powered-By:** Removido (não expõe tecnologia do servidor)

#### Logging de Segurança
- Todas as requisições são registradas com:
  - Timestamp
  - IP do cliente
  - Método HTTP
  - URL acessada

### 2. Proteção no Login Admin (admin.js)

#### Proteção contra Força Bruta
- **Tentativas máximas:** 5 tentativas falhas
- **Bloqueio:** 15 minutos após exceder tentativas
- **Persistência:** Dados salvos em localStorage
- **Feedback:** Informa tentativas restantes

#### Sanitização de Entrada
- Remove caracteres HTML perigosos
- Previne injeção de scripts (XSS)
- Validação de campos vazios

#### Sessão Segura
- Token único gerado a cada login
- Timestamp de login registrado
- Dados salvos em sessionStorage (apagados ao fechar navegador)

### 3. Proteção no Painel Admin (painel.js)

#### Verificação de Autenticação
- Valida token de sessão
- Verifica expiração da sessão (2 horas)
- Redireciona para login se sessão inválida

#### Timeout por Inatividade
- **Limite:** 30 minutos sem atividade
- **Monitoramento:** Cliques e teclas pressionadas
- **Ação:** Logout automático e redirecionamento

#### Renovação de Sessão
- Atualiza timestamp de atividade a cada interação
- Mantém sessão ativa enquanto usuário está ativo

### 4. Biblioteca de Segurança (security.js)

#### Sanitização e Validação
- `sanitizeHTML()`: Remove/escapa caracteres HTML perigosos
- `validateEmail()`: Valida formato de email
- `validatePhone()`: Valida telefone brasileiro
- `validateCEP()`: Valida formato de CEP
- `validateCPF()`: Valida CPF com dígitos verificadores
- `validateURL()`: Valida URLs
- `validateFormInput()`: Validação completa de formulários

#### Detecção de Ataques
- `detectSuspiciousPatterns()`: Identifica padrões de injeção
  - Tags `<script>`
  - JavaScript inline (`javascript:`)
  - Event handlers (`onclick=`, etc)
  - `eval()`, `expression()`
  - VBScript
  - Data URIs maliciosos

#### Proteções Adicionais
- Limitação de tamanho de strings (1000 chars padrão)
- Remoção de caracteres de controle
- Validação de números em intervalos
- Geração de tokens seguros
- Verificação de força de senha
- Rate limiting no lado do cliente

O servidor já está configurado automaticamente. Ao iniciar:
```bash
   ✓ Rate Limiting: 60 req/min por IP
   ✓ Bloqueio automático: 15 minutos
   ✓ Proteção XSS ativa
   ✓ Proteção contra clickjacking
   ✓ Logging de requisições
```

### No Frontend

#### Validar formulários:
  minLength: 5,
  maxLength: 100
  alert(resultado.error);
  return;
```

#### Sanitizar HTML:
```javascript
#### Validar dados específicos:
```javascript

if (!validateCPF(cpf)) {
```

## Credenciais Padrão

const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

## Logs de Segurança

Monitore o console do servidor para ver:
- Requisições suspeitas
- IPs bloqueados
- Tentativas de login falhas
- Padrões de ataque
3. ✅ Use banco de dados para autenticação
4. ✅ Implemente autenticação JWT ou OAuth
5. ✅ Configure firewall (iptables, fail2ban)
6. ✅ Use serviço de CDN (Cloudflare, etc)
7. ✅ Backup regular dos dados
8. ✅ Monitore logs constantemente
9. ✅ Mantenha dependências atualizadas
10. ✅ Considere usar helmet.js para headers adicionais

### Monitoramento:
- Configure alertas para múltiplos IPs bloqueados
- Monitore tentativas de acesso ao painel admin
- Analise padrões de tráfego suspeitos
- Faça auditorias de segurança regulares

## Vulnerabilidades Protegidas

✅ **XSS (Cross-Site Scripting):** Sanitização de entrada e CSP
✅ **Clickjacking:** X-Frame-Options header
✅ **MIME Sniffing:** X-Content-Type-Options
✅ **SQL Injection:** Não aplicável (usando localStorage)
✅ **Força Bruta:** Rate limiting e bloqueio temporário
✅ **DDoS:** Rate limiting por IP
✅ **Session Hijacking:** Tokens únicos e expiração
✅ **CSRF:** Headers e validações
✅ **Path Traversal:** Validação de caminhos
✅ **Information Disclosure:** Headers removidos

## Níveis de Segurança

### 🔴 Crítico
- Login admin protegido contra força bruta
- Sessões com timeout automático
- Rate limiting global

### 🟡 Alto
- Sanitização de todas entradas
- Validação de dados
- Headers de segurança

### 🟢 Moderado
- Logging de atividades
- Detecção de padrões suspeitos
- Limpeza automática de dados

## Suporte

Para reportar vulnerabilidades ou problemas de segurança:
- Email: seguranca@flordeiris.com
- Nunca exponha vulnerabilidades publicamente

---

**Última atualização:** 30/12/2025
**Versão do sistema de segurança:** 1.0.0
=======
# 🛡️ Sistema de Segurança - Flor de Íris

## Proteções Implementadas

#### Rate Limiting
- **Limite:** 60 requisições por minuto por IP
- **Bloqueio:** IPs que excedem o limite são bloqueados por 15 minutos
- **Limpeza:** Dados de rate limiting são limpos automaticamente a cada 5 minutos

#### Headers de Segurança
- **X-Frame-Options:** SAMEORIGIN (previne clickjacking)
- **X-Content-Type-Options:** nosniff (previne MIME sniffing)
- **X-XSS-Protection:** 1; mode=block (proteção XSS no navegador)
#### Logging de Segurança
- Todas as requisições são registradas com:
  - Timestamp
  - IP do cliente
  - Método HTTP
  - URL acessada

### 2. Proteção no Login Admin (admin.js)

#### Proteção contra Força Bruta
- **Tentativas máximas:** 5 tentativas falhas
- **Bloqueio:** 15 minutos após exceder tentativas
- **Persistência:** Dados salvos em localStorage
- **Feedback:** Informa tentativas restantes

#### Sanitização de Entrada
#### Sessão Segura
- Token único gerado a cada login
- Timestamp de login registrado
- Dados salvos em sessionStorage (apagados ao fechar navegador)

### 3. Proteção no Painel Admin (painel.js)

#### Verificação de Autenticação
- Valida token de sessão
- Verifica expiração da sessão (2 horas)
- Redireciona para login se sessão inválida

#### Timeout por Inatividade
- **Limite:** 30 minutos sem atividade
- **Monitoramento:** Cliques e teclas pressionadas
- **Ação:** Logout automático e redirecionamento


### 4. Biblioteca de Segurança (security.js)
- `validateEmail()`: Valida formato de email
- `validatePhone()`: Valida telefone brasileiro
- `validateFormInput()`: Validação completa de formulários

#### Detecção de Ataques
- `detectSuspiciousPatterns()`: Identifica padrões de injeção
  - Event handlers (`onclick=`, etc)
  - VBScript
  - Data URIs maliciosos

#### Proteções Adicionais
- Limitação de tamanho de strings (1000 chars padrão)
- Remoção de caracteres de controle
- Validação de números em intervalos
- Geração de tokens seguros
- Verificação de força de senha
- Rate limiting no lado do cliente

## Como Usar

### No Backend (Node.js)
O servidor já está configurado automaticamente. Ao iniciar:
```bash
node server.js
```

Você verá:
```
🛡️ Sistema de Segurança Ativo:
   ✓ Rate Limiting: 60 req/min por IP
   ✓ Bloqueio automático: 15 minutos
   ✓ Headers de segurança configurados
   ✓ Proteção XSS ativa
   ✓ Proteção contra clickjacking
   ✓ Logging de requisições
```

### No Frontend

#### Validar formulários:
```javascript
const resultado = validateFormInput(input, {
  type: 'email',
  required: true,
  minLength: 5,
  maxLength: 100
});

if (!resultado.valid) {
  alert(resultado.error);
  return;
}

// Use resultado.value (já sanitizado)
```

#### Sanitizar HTML:
```javascript
const textoSeguro = sanitizeHTML(inputUsuario);
```

#### Validar dados específicos:
```javascript
if (!validateEmail(email)) {
  alert('Email inválido');
}

if (!validateCPF(cpf)) {
  alert('CPF inválido');
}
```

## Credenciais Padrão

⚠️ **IMPORTANTE:** Altere as credenciais padrão em produção!

- **Usuário:** admin
- **Senha:** 1234

Para alterar, edite em `public/js/admin.js`:
```javascript
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";
```

## Logs de Segurança

Monitore o console do servidor para ver:
- Requisições suspeitas
- IPs bloqueados
- Tentativas de login falhas
- Padrões de ataque

## Recomendações Adicionais

### Para Produção:
1. ✅ Use HTTPS (SSL/TLS)
2. ✅ Armazene credenciais em variáveis de ambiente
3. ✅ Use banco de dados para autenticação
4. ✅ Implemente autenticação JWT ou OAuth
5. ✅ Configure firewall (iptables, fail2ban)
6. ✅ Use serviço de CDN (Cloudflare, etc)
7. ✅ Backup regular dos dados
8. ✅ Monitore logs constantemente
9. ✅ Mantenha dependências atualizadas
10. ✅ Considere usar helmet.js para headers adicionais

### Monitoramento:
- Configure alertas para múltiplos IPs bloqueados
- Monitore tentativas de acesso ao painel admin
- Analise padrões de tráfego suspeitos
- Faça auditorias de segurança regulares

## Vulnerabilidades Protegidas

✅ **XSS (Cross-Site Scripting):** Sanitização de entrada e CSP
✅ **Clickjacking:** X-Frame-Options header
✅ **MIME Sniffing:** X-Content-Type-Options
✅ **SQL Injection:** Não aplicável (usando localStorage)
✅ **Força Bruta:** Rate limiting e bloqueio temporário
✅ **DDoS:** Rate limiting por IP
✅ **Session Hijacking:** Tokens únicos e expiração
✅ **CSRF:** Headers e validações
✅ **Path Traversal:** Validação de caminhos
✅ **Information Disclosure:** Headers removidos

## Níveis de Segurança

### 🔴 Crítico
- Login admin protegido contra força bruta
- Sessões com timeout automático
- Rate limiting global

### 🟡 Alto
- Sanitização de todas entradas
- Validação de dados
- Headers de segurança

### 🟢 Moderado
- Logging de atividades
- Detecção de padrões suspeitos
- Limpeza automática de dados

## Suporte

Para reportar vulnerabilidades ou problemas de segurança:
- Email: seguranca@flordeiris.com
- Nunca exponha vulnerabilidades publicamente

---

**Última atualização:** 30/12/2025
**Versão do sistema de segurança:** 1.0.0
