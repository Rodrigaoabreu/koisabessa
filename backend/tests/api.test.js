const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testMedia = fs.mkdtempSync(path.join(os.tmpdir(), "koisabessa-api-test-"));
process.env.MEDIA_DIR = testMedia;

const supertest = require("supertest");
const bcrypt = require("bcryptjs");
const { sequelize, User, Category, Product } = require("../src/models");
const { createApp } = require("../src/app");
const api = supertest(createApp({ jwtSecret: "test-only-secret-long-enough-to-sign-jwt" }));

const suffix = Date.now().toString(36);
const password = "Koisabessa123!";
const emails = {
  customer: `cliente-${suffix}@example.com`,
  other: `segundo-${suffix}@example.com`,
  admin: `admin-${suffix}@example.com`,
};
const categorySlug = `sala-${suffix}`;
const otherCategorySlug = `mesa-${suffix}`;
const slugs = Array.from({ length: 4 }, (_, index) => `produto-${suffix}-${index}`);
const login = async email => (await api.post("/v1/user/token").send({ email, password }).expect(200)).body.token;
const bearer = token => ({ Authorization: `Bearer ${token}` });
const signup = email => ({ firstname: "Maria", surname: "Silva", email, password, confirmPassword: password });
const imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCNsAAAAASUVORK5CYII=";
let dbReady = false;
let admin;
let customer;
let userId;
let otherId;
let categoryId;
let otherCategoryId;
let first;
let second;
let third;

beforeAll(async () => {
  if (!sequelize.config.database.endsWith("_test")) throw new Error("Use uma base dedicada com nome terminado em _test.");
  await sequelize.authenticate();
  dbReady = true;
  await User.create({ ...signup(emails.admin), password: await bcrypt.hash(password, 4), role: "admin" });
  admin = bearer(await login(emails.admin));
});

afterAll(async () => {
  try {
    if (dbReady) {
      await Product.destroy({ where: { slug: slugs } });
      await Category.destroy({ where: { slug: [categorySlug, otherCategorySlug] } });
      await User.destroy({ where: { email: Object.values(emails) } });
    }
  } finally {
    await sequelize.close();
    fs.rmSync(testMedia, { recursive: true, force: true });
  }
});

test("cadastro, login, privacidade, atualização e exclusão da conta", async () => {
  await api.post("/v1/user").send({ ...signup(emails.customer), confirmPassword: "senha-diferente" }).expect(400);
  const original = await api.post("/v1/user").send(signup(emails.customer)).expect(201);
  userId = original.body.id;
  expect(original.body).toEqual({ id: userId, firstname: "Maria", surname: "Silva", email: emails.customer });
  await api.post("/v1/user").send(signup(emails.customer)).expect(400);
  const row = await User.findByPk(userId);
  expect(row.password).not.toBe(password);
  expect(await bcrypt.compare(password, row.password)).toBe(true);
  await api.post("/v1/user/token").send({ email: emails.customer, password: "wrong" }).expect(400);
  customer = bearer(await login(emails.customer));

  const other = await api.post("/v1/user").send(signup(emails.other)).expect(201);
  otherId = other.body.id;
  await api.get(`/v1/user/${userId}`).expect(401);
  await api.get(`/v1/user/${userId}`).set(customer).expect(200, original.body);
  await api.put(`/v1/user/${otherId}`).set(customer).send({ firstname: "Ana" }).expect(403);
  const update = await api.put(`/v1/user/${userId}`).set(customer).send({ firstname: "Mariana" }).expect(204);
  expect(update.text).toBe("");
  expect((await api.get(`/v1/user/${userId}`).set(customer).expect(200)).body.firstname).toBe("Mariana");
  const otherAuth = bearer(await login(emails.other));
  await api.delete(`/v1/user/${otherId}`).set(otherAuth).expect(204);
  await api.get(`/v1/user/${otherId}`).set(otherAuth).expect(401);
});

test("categoria com permissões, projeção de campos e filtro do menu", async () => {
  const data = { name: "Sala de teste", slug: categorySlug, use_in_menu: true };
  await api.post("/v1/category").send(data).expect(401);
  await api.post("/v1/category").set(bearer("invalid.jwt.signature")).send(data).expect(401);
  await api.post("/v1/category").set(customer).send(data).expect(403);
  const result = await api.post("/v1/category").set(admin).send(data).expect(201);
  categoryId = result.body.id;
  const other = await api.post("/v1/category").set(admin).send({ name: "Mesa de teste", slug: otherCategorySlug }).expect(201);
  otherCategoryId = other.body.id;
  await api.get(`/v1/category/${categoryId}`).expect(200, { id: categoryId, ...data });
  await api.put(`/v1/category/${categoryId}`).set(admin).send({ name: "Sala atualizada" }).expect(204);
  const list = await api.get("/v1/category/search?limit=-1&page=8&fields=slug&use_in_menu=true").expect(200);
  expect(list.body.data).toContainEqual({ slug: categorySlug });
  expect(list.body.data).not.toContainEqual({ slug: otherCategorySlug });
  expect(list.body.page).toBe(1);
  await api.get("/v1/category/search?fields=password").expect(400);
});

function productPayload(index, fields) {
  return {
    name: `Poltrona Teste ${suffix} ${index}`, slug: slugs[index], enabled: true,
    stock: 8, description: "Madeira maciça e linho", price: 450, price_with_discount: 0,
    category_ids: [categoryId], ...fields,
  };
}

test("busca combinada, intervalos, opções e ordem global antes da paginação", async () => {
  const create = async (index, fields) => (await api.post("/v1/product").set(admin).send(productPayload(index, fields)).expect(201)).body;
  first = await create(0, { price: 450, options: [{ title: "Tecido", values: ["Linho", "Algodão"] }] });
  second = await create(1, { price: 600, price_with_discount: 250, category_ids: [categoryId, otherCategoryId] });
  third = await create(2, { price: 300, category_ids: [otherCategoryId] });
  const hidden = await create(3, { enabled: false, price: 200, images: [{ enabled: false, content: "https://example.com/teste.jpg" }] });
  await api.get(`/v1/product/${hidden.id}`).expect(404);
  await api.get(`/v1/product/${hidden.id}`).set(admin).expect(200);
  const page = (pageNumber, sort = "price-asc") => api.get("/v1/product/search").query({
    match: suffix, category_ids: `${categoryId},${otherCategoryId}`, "price-range": "200-500",
    limit: 1, page: pageNumber, sort, fields: "id,price,price_with_discount",
  }).expect(200);
  const one = await page(1);
  expect(one.body).toEqual({ data: [{ id: second.id, price: 600, price_with_discount: 250 }], total: 3, page: 1, limit: 1 });
  expect((await page(2)).body.data[0].id).toBe(third.id);
  expect((await page(1, "price-desc")).body.data[0].id).toBe(first.id);
  const option = await api.get("/v1/product/search").query({
    match: "macica", category_ids: categoryId, [`option[${first.options[0].id}]`]: "Linho", limit: -1,
  }).expect(200);
  expect(option.body.data.map(item => item.id)).toEqual([first.id]);
  await api.get("/v1/product/search?price-range=500-100").expect(400);
  await api.get("/v1/product/search?match=%25").expect(200, { data: [], page: 1, limit: 12, total: 0 });
});

test("atualização transacional, arquivos base64 e exclusão de relações", async () => {
  const url = `/v1/product/${first.id}`;
  await api.put(url).set(admin).send({
    name: "Nome que deve ser revertido", images: [{ type: "image/png", content: imageData }],
    options: [{ id: 2_000_000_000, values: ["inválido"] }],
  }).expect(400);
  expect(fs.readdirSync(testMedia)).toEqual([]);
  const unchanged = (await api.get(url).set(admin).expect(200)).body;
  expect(unchanged.name).toBe(first.name);
  expect(unchanged.images).toEqual([]);
  expect(unchanged.options).toEqual(first.options);
  await api.put(url).set(admin).send({ category_ids: [2_000_000_000] }).expect(400);
  await api.put(url).set(admin).send({
    name: "Poltrona renovada", images: [{ type: "image/png", content: imageData }],
    options: [{ id: first.options[0].id, radius: "10px", value: ["Linho cru"] }],
  }).expect(204);
  const current = (await api.get(url).expect(200)).body;
  expect(current.name).toBe("Poltrona renovada");
  expect(current.options[0]).toMatchObject({ radius: 10, values: ["Linho cru"] });
  await api.get(current.images[0].content).expect(200).expect("Content-Type", /image\/png/);
  await api.put(url).set(admin).send({ images: [{ id: current.images[0].id, deleted: true }] }).expect(204);
  await api.get(current.images[0].content).expect(404);
  expect(fs.readdirSync(testMedia)).toEqual([]);
  await api.delete(url).set(customer).expect(403);
  await api.delete(url).set(admin).expect(204);
  await api.get(url).expect(404);
  await api.delete(`/v1/category/${categoryId}`).set(admin).expect(204);
  await api.get(`/v1/category/${categoryId}`).expect(404);
  const cascaded = (await api.get(`/v1/product/${second.id}`).expect(200)).body;
  expect(cascaded.category_ids).toEqual([otherCategoryId]);
});

test("Swagger serve o mesmo contrato com rotas públicas e protegidas", async () => {
  await api.get("/docs/").expect(200).expect(/Koisabessa/);
  const { body } = await api.get("/docs/openapi.json").expect(200);
  expect(body.paths["/v1/product/{id}"].put.security).toEqual([{ bearerAuth: [] }]);
  expect(body.paths["/v1/user/token"].post.security).toBeUndefined();
});
