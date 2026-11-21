# Especificação da Koisabessa

**Status** Implementação aprovada

**Data** 20/11/2026

## Jornadas

### P1 · Descobrir produtos

Como visitante, quero explorar coleções e pesquisar artigos para casa, para achar um produto que combine com meu ambiente e orçamento.

- Dada a Home, o visitante navega pelo carrossel, vê três coleções e oito produtos em alta.
- Ao pesquisar pelo cabeçalho ou abrir uma coleção, vê resultados reais, contagem e paginação. Busca, filtros e ordenação permanecem ao retornar do detalhe.
- Se a consulta falhar, a página apresenta uma tentativa novamente. Resultados vazios incluem ação para limpar critérios.

### P1 · Escolher e guardar produtos

Como visitante, quero comparar fotos, acabamentos e preços e guardar minhas escolhas em um carrinho.

- O detalhe mostra fotos, miniaturas, referência, preços, disponibilidade, descrição, variações e recomendações da categoria.
- O comprador seleciona as variações obrigatórias, adiciona o produto, altera a quantidade e remove itens. Recarregar preserva o carrinho. Produtos sem estoque desabilitam a compra.

### P2 · Acessar uma conta e manter o catálogo

Como cliente, quero criar uma conta e entrar. Como mantenedor, quero editar o catálogo pela API documentada.

- Cadastro e login operam no MySQL e a API protege recursos com JWT. Um cliente só acessa a própria conta e somente administradores editam o catálogo.
- Um mantenedor pode criar, ler, atualizar e excluir produtos e categorias, incluindo imagens, opções e vínculos. Uma alteração inválida mantém o produto anterior íntegro.

## Requisitos e aceite

- RF01 · Layout compartilhado e três páginas responsivas com hierarquia do Digital Store e identidade Koisabessa.
- RF02 · Catálogo, categorias e conta usam a API versionada. O carrinho persiste localmente.
- RF03 · API implementa os contratos do curso, OpenAPI, migrations reversíveis e 16 produtos demonstrativos.
- RF04 · Interface navegável por teclado, com campos rotulados, foco visível e estados de erro legíveis.
- RF05 · Projeto reproduzível a partir de um único repositório e README com autoria de Rodrigo Sousa.

Considerar concluído quando as três jornadas funcionarem em navegador desktop e móvel, o contrato passar em testes sobre MySQL limpo e o repositório estiver acessível publicamente.

Compras com pagamento, pedidos, expedição e vendedores pertencem a fases posteriores.
