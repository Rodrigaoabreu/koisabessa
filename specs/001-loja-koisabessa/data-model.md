# Modelo de dados

- `users` possui nome, e-mail único, hash bcrypt e papel interno.
- `categories` possui nome, slug único e indicador de exibição no menu.
- `products` possui nome, slug único, preço original e promocional com duas casas, estoque, descrição e visibilidade.
- `product_images` pertence ao produto e guarda o caminho do arquivo local ou a URL externa.
- `product_options` pertence ao produto e define um grupo de valores de texto ou cor.
- `product_categories` vincula os produtos às categorias. A chave composta impede duplicação.

A exclusão de um produto remove seus vínculos, opções e imagens. A exclusão de uma categoria remove apenas os vínculos correspondentes. O carrinho permanece no navegador e usa uma chave por produto e combinação de opções.
