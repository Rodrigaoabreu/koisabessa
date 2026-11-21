# Koisabessa

Loja demonstrativa de móveis, decoração e utilidades para casa. Projeto final de front-end e back-end da Digital College, desenvolvido por **Rodrigo Sousa**.

## O que a loja faz

A Home apresenta coleções e produtos em alta. O catálogo tem busca por nome ou descrição, filtros por categoria e preço, ordenação e paginação. A página de produto mostra fotos, variações e disponibilidade. O carrinho salva os itens no navegador. A edição do catálogo é feita pela API e o checkout fica fora do escopo acadêmico.

| Área | Tecnologias |
| --- | --- |
| Front-end | React, TypeScript, Vite, React Router e CSS |
| Back-end | Node.js, Express, Sequelize, MySQL, bcrypt e JWT |
| Verificação | Jest, Supertest, Playwright e Swagger |

## Rodar localmente

Use Node.js 24 ou superior, npm e Docker Compose ou uma instância MySQL 8.4.

1. Instale as dependências na raiz.

   ```sh
   npm ci
   ```

2. Inicie o MySQL do Compose.

   ```sh
   docker compose up -d --wait mysql
   ```

   Se você já usa MySQL, crie a base `koisabessa` e um usuário com permissão nessa base. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` no próximo passo.

3. Copie `backend/.env.example` para `backend/.env` e preencha `JWT_SECRET` com um segredo de pelo menos 32 bytes. Este comando gera um valor aleatório.

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Para testar a escrita de catálogo no Swagger, preencha também `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de rodar o seed. Use uma senha de pelo menos 12 caracteres. Essas variáveis são opcionais para a navegação na loja.

4. Aplique a migração, carregue o catálogo demonstrativo e inicie os dois serviços.

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

   A loja abre em <http://127.0.0.1:5173> e o Swagger em <http://127.0.0.1:3001/docs/>. O seed inicial é seguro para repetir e preserva edições feitas em registros existentes. Para servir o build integrado, rode `npm run build`, adicione `SERVE_WEB=true` a `backend/.env` e inicie com `npm run start -w backend`.

## Rotas e contrato

| Interface | Caminho |
| --- | --- |
| Página inicial | `/` |
| Catálogo | `/produtos` |
| Detalhe | `/product/:id` |
| Documentação | `/docs/` |
| OpenAPI | `/docs/openapi.json` |

A API usa `/v1/user`, `/v1/category` e `/v1/product`. Acesse `/v1/user/token` com e-mail e senha. Use o token no botão **Authorize** do Swagger para experimentar as rotas protegidas. A leitura da conta exige o token do titular. A leitura do catálogo é pública e um administrador autenticado também pode ler produtos desativados. O cadastro público cria contas de cliente.

A busca de produtos aceita `match`, `category_ids`, `price-range`, `option[ID]`, `fields`, `limit`, `page` e `sort`. Para ordenar, use `price-asc` ou `price-desc`. Busca por opção usa o ID retornado em `options`. Preços promocionais positivos são usados na faixa e na ordenação. O valor zero indica ausência de promoção.

As imagens do seed são servidas por `/media/catalog`. A API aceita URLs HTTP(S) e uploads em base64 para JPEG, PNG e WebP de até 3 MB por imagem, com teto de 8 MB por requisição. As mídias enviadas ficam em `backend/storage/uploads` por padrão, com destino configurável em `MEDIA_DIR`.

O código `401` segue as seções de cada rota para token ausente ou inválido. Permissão insuficiente retorna `403`. Cadastro e login são públicos, com limite de tentativas. A sessão da interface termina ao recarregar a página ou sair da conta. O carrinho persiste independentemente da sessão.

Consulte o [contrato OpenAPI](specs/001-loja-koisabessa/contracts/openapi.json) e os enunciados oficiais de [front-end](https://github.com/digitalcollegebr/projeto-digital-store) e [back-end](https://github.com/digitalcollegebr/projeto-backend).

## Verificar a entrega

- Para a API, crie uma base vazia `koisabessa_test` na mesma instância e conceda permissão ao usuário de teste ou ao usuário local do aplicativo. Defina `DB_NAME=koisabessa_test` apenas no terminal de teste, rode `npm run db:migrate` e `npm test`. No PowerShell, use `$env:DB_NAME = 'koisabessa_test'` e remova a variável com `Remove-Item Env:DB_NAME` ao terminar.
- Para verificar o rollback em uma base dedicada, rode `npm run db:rollback` e depois `npm run db:migrate`.
- Para a loja, use a base de demonstração com seed, rode `npx playwright install chromium` e `npm run test:e2e`. Os testes abrem o projeto se ele estiver parado. O build de produção é verificado com `npm run build`.

## Deploy

O [site no Netlify](https://koisabessa-web.netlify.app/) serve o build do front-end. O `netlify.toml` encaminha as rotas da API, das fotos e do Swagger para o Express no EasyPanel.

O `compose.production.yaml` inicia o Express e um MySQL 8.4 na mesma rede privada, com volumes para os dados e os uploads. Configure `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` e `JWT_SECRET` no ambiente do serviço. A API aguarda o MySQL, aplica a migração e popula os 16 produtos antes de começar a atender. No EasyPanel, associe o domínio HTTPS da API ao serviço `api`, porta `3001`.

## Especificação e imagens

A [especificação](specs/001-loja-koisabessa/spec.md), o plano e as tarefas seguem o GitHub Spec Kit 1.4.3. As skills Ponytail e [Unslop, de Damir Sokolovsky](https://github.com/heydamir/unslop), estão disponíveis localmente em `.agents/skills/`.

As imagens de demonstração foram geradas com a ferramenta ImageGen integrada. A direção de arte, a revisão Unslop e os prompts finais estão na [especificação visual](specs/001-loja-koisabessa/visual.md). Os arquivos usados pela loja estão em [ambientes](frontend/public/ambientes) e [fotos do catálogo](backend/catalog-media).
