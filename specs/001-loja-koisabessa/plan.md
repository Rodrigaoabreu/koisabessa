# Plano de implementação

## Contexto técnico

Front-end React, TypeScript, Vite e React Router. Back-end Node.js 24, Express, Sequelize 6 e MySQL 8.4 com migrations. Jest e Supertest verificam a API. O OpenAPI também alimenta o Swagger.

## Constituição

As três páginas e os CRUDs atendem ao curso. A busca opera no banco antes da paginação. Escrever produto, imagens, opções e vínculos é uma operação transacional. Senhas usam bcrypt, a API autoriza pelo usuário autenticado e o carrinho independe da sessão.

## Estrutura e dados

- `frontend/` contém páginas, componentes, cliente da API e recursos visuais. As rotas são `/`, `/produtos` e `/product/:id`, com alias `/products`.
- `backend/` contém modelos, migrations, rotas, serviços, seed e testes. No ambiente local o Vite encaminha `/v1` e `/media` ao Express.
- Usuários têm e-mail único e papel interno. Produtos têm preços decimais e estoque inteiro, e relacionam-se a categorias, imagens e opções. Preço efetivo é o promocional quando positivo. Estoque é compartilhado entre as variações de um produto.
- Ver [OpenAPI](contracts/openapi.json) e [guia de execução](../../README.md).
