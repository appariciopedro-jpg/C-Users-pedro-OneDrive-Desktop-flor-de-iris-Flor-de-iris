# Hot Reload - Guia Rápido

Este arquivo explica como ativar e usar Hot Reload no seu projeto.

## O que é Hot Reload?
Hot Reload permite que você veja as alterações no seu código imediatamente no navegador, sem precisar atualizar manualmente a página.

## Passos Gerais

1. **Verifique se você tem um servidor local rodando**
   - Para projetos Node.js, use `npm start` ou `node server.js`.
   - Para projetos HTML/CSS/JS puros, use uma extensão como Live Server no VS Code.

2. **Instale uma ferramenta de Hot Reload**
   - Para projetos Node.js: `npm install -D nodemon` e rode com `npx nodemon server.js`.
   - Para HTML/CSS/JS puro: use a extensão Live Server.

3. **Compartilhe este arquivo com o time**
   - Envie este README_HotReload.md para todos do time.

## Exemplos Específicos

### Node.js (Express, etc)
```sh
npm install -D nodemon
npx nodemon server.js
```

### HTML/CSS/JS puro
- Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code.
- Clique com o botão direito no seu `index.html` e selecione "Open with Live Server".

## Dúvidas?
Se quiser instruções específicas para React, Angular, Vue ou outro framework, peça para o time de desenvolvimento ou consulte a documentação oficial.
