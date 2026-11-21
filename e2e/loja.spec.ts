import { expect, test } from '@playwright/test';

test('Home, busca e detalhe do catálogo', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Sua casa,.*do seu jeito/);
  await expect(page.locator('.collection')).toHaveCount(3);
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.locator('.hero .gallery img')).toBeVisible();
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.getByRole('button', { name: 'Próxima imagem' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/À mesa/);

  const search = page.getByRole('searchbox', { name: 'Buscar produtos' });
  await search.fill('poltrona');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/produtos\?filter=poltrona/);
  await expect(page.getByRole('heading', { name: '1 produto', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('catalogo-busca.png'), fullPage: true });
  await page.getByRole('link', { name: /Poltrona Brisa/ }).click();
  await expect(page.getByRole('heading', { name: 'Poltrona Brisa', level: 1 })).toBeVisible();
  await page.screenshot({ path: info.outputPath('produto.png'), fullPage: true });
  await page.getByRole('button', { name: 'Exibir imagem 2' }).click();
  await expect(page.getByRole('button', { name: 'Exibir imagem 2' })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(search).toHaveValue('poltrona');
  await expect(page.getByRole('heading', { name: '1 produto', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Filtros, ordenação, paginação e estados vazios', async ({ page }, info) => {
  await page.goto('/products');
  await expect(page).toHaveURL('/produtos');
  await expect(page.getByRole('heading', { name: '16 produtos' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('catalogo.png'), fullPage: true });
  await page.getByLabel('Ordenar por').selectOption('price-asc');
  await expect(page.locator('.product-card h3').first()).toHaveText('Almofada Trama');
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  const category = page.getByRole('checkbox', { name: 'Mesa e cozinha' });
  await category.click();
  await expect(category).toBeChecked();
  await expect(page.getByRole('heading', { name: '4 produtos' })).toBeVisible();
  await page.getByLabel('Faixa de preço').selectOption('0-200');
  await expect(page.getByRole('heading', { name: '1 produto' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conjunto de pratos Calma' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByRole('heading', { name: '16 produtos' })).toBeVisible();
  await page.goto('/product/2147483647');
  await expect(page.getByRole('heading', { name: 'Produto não encontrado' })).toBeVisible();
  await page.goto('/produtos?filter=resultado-inexistente');
  await expect(page.getByText('Nenhum produto encontrado')).toBeVisible();
});

test('Carrinho persiste e permite ajustar quantidades', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Poltrona Brisa/ }).click();
  const buy = page.getByRole('button', { name: 'Comprar' });
  await expect(buy).toBeDisabled();
  await page.getByRole('radio', { name: 'Oliva' }).check();
  await page.getByRole('radio', { name: 'Madeira natural' }).check();
  await expect(buy).toBeEnabled();
  await buy.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Oliva · Madeira natural')).toBeVisible();
  await page.getByRole('button', { name: 'Aumentar quantidade de Poltrona Brisa' }).click();
  await expect(dialog.getByText(/2\.399,80/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(buy).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Carrinho, 2 itens' }).click();
  await page.getByRole('button', { name: 'Remover Poltrona Brisa' }).click();
  await expect(dialog.getByText('Seu carrinho está vazio.')).toBeVisible();
});

test('Cadastro e sessão real pela interface', async ({ page }, info) => {
  const email = `teste-${info.project.name}-${Date.now()}@example.com`;
  const password = 'KoisabessaTeste123!';
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Quero criar uma conta' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome', { exact: true }).fill('Marina');
  await dialog.getByLabel('Sobrenome').fill('Teste');
  await dialog.getByLabel('E-mail').fill(email);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByLabel('Confirmar senha').fill(password);
  await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Marina' })).toBeVisible();
  await page.getByRole('button', { name: 'Marina' }).click();
  await expect(dialog.getByText(email)).toBeVisible();
  await dialog.getByRole('button', { name: 'Sair da conta' }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('E-mail').fill(email);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Marina' })).toBeVisible();

  const tokenResponse = await page.request.post('/v1/user/token', { data: { email, password } });
  const { token } = await tokenResponse.json();
  const { sub } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  await page.request.delete(`/v1/user/${sub}`, { headers: { Authorization: `Bearer ${token}` } });
});

test('O catálogo permite tentar novamente quando a API falha', async ({ page }) => {
  await page.route('**/v1/product/search?**', async route => {
    await route.fulfill({ status: 503, json: { message: 'Serviço indisponível' } });
  }, { times: 1 });
  await page.goto('/produtos');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os produtos');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: '16 produtos' })).toBeVisible();
});
