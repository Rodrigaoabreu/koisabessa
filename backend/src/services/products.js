const { Op, QueryTypes } = require("sequelize");
const { sequelize, Category, Product, ProductImage, ProductOption } = require("../models");
const { badRequest, notFound, pageQuery, pick } = require("../http");
const { saveImage, cleanImages } = require("./product-media");

const fields = ["id", "enabled", "name", "slug", "use_in_menu", "stock", "description", "price", "price_with_discount", "category_ids", "images", "options"];
const effectivePrice = "CASE WHEN p.price_with_discount > 0 THEN p.price_with_discount ELSE p.price END";
const fieldsWithRelations = [
  { association: "categories", attributes: ["id"], through: { attributes: [] } },
  { association: "options", separate: true, order: [["id", "ASC"]] },
];

function includes(showDisabled) {
  return [
    ...fieldsWithRelations,
    {
      association: "images",
      separate: true,
      order: [["id", "ASC"]],
      ...(showDisabled ? {} : { where: { enabled: true } }),
    },
  ];
}

function format(product, showDisabled) {
  return {
    ...pick(product, fields.slice(0, 9)),
    price: Number(product.price),
    price_with_discount: Number(product.price_with_discount),
    category_ids: product.categories.map(category => category.id).sort((a, b) => a - b),
    images: product.images.map(image => ({
      id: image.id,
      content: image.path,
      ...(showDisabled ? { enabled: image.enabled } : {}),
    })),
    options: product.options.map(option => ({
      ...pick(option, ["id", "title", "shape", "radius", "type"]),
      values: option.values.split(","),
    })),
  };
}

function productFilters(query, showDisabled) {
  const conditions = showDisabled ? [] : ["p.enabled = 1"];
  const replacements = {};
  const { match, category_ids: categoryIds, "price-range": priceRange, sort } = query;

  if (match !== undefined) {
    if (typeof match !== "string" || match.length > 160) throw badRequest("Busca inválida.");
    if (match.trim()) {
      replacements.match = `%${match.trim().replace(/[=%_]/g, value => `=${value}`)}%`;
      conditions.push("(p.name LIKE :match ESCAPE '=' OR p.description LIKE :match ESCAPE '=')");
    }
  }
  if (categoryIds !== undefined) {
    if (typeof categoryIds !== "string" || !/^[1-9]\d{0,9}(?:,[1-9]\d{0,9})*$/.test(categoryIds)) {
      throw badRequest("Informe IDs de categorias separados por vírgula.");
    }
    replacements.categoryIds = categoryIds.split(",").map(Number);
    conditions.push("EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (:categoryIds))");
  }
  if (priceRange !== undefined) {
    const matchPrice = typeof priceRange === "string" && /^(\d{1,8}(?:\.\d{1,2})?)-(\d{1,8}(?:\.\d{1,2})?)$/.exec(priceRange);
    if (!matchPrice || Number(matchPrice[1]) > Number(matchPrice[2])) throw badRequest("Informe um intervalo de preços válido.");
    replacements.minPrice = Number(matchPrice[1]);
    replacements.maxPrice = Number(matchPrice[2]);
    conditions.push(`(${effectivePrice}) BETWEEN :minPrice AND :maxPrice`);
  }
  if (sort !== undefined && sort !== "price-asc" && sort !== "price-desc") {
    throw badRequest("Use price-asc ou price-desc para ordenar.");
  }
  for (const [name, value] of Object.entries(query)) {
    if (!name.startsWith("option")) continue;
    const numeric = /^option\[([1-9]\d{0,9})\]$/.exec(name);
    if (!numeric || typeof value !== "string" || value.length > 2000) throw badRequest("Filtro de opção inválido.");
    const values = value.split(",").map(item => item.trim());
    if (values.some(item => !item)) throw badRequest("Filtro de opção vazio.");
    const key = `option${numeric[1]}`;
    replacements[key] = Number(numeric[1]);
    const options = values.map((item, index) => {
      const valueKey = `${key}Value${index}`;
      replacements[valueKey] = item;
      return `FIND_IN_SET(:${valueKey}, o.\`values\`) > 0`;
    });
    conditions.push(`EXISTS (SELECT 1 FROM product_options o WHERE o.product_id = p.id AND o.id = :${key} AND (${options.join(" OR ")}))`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const direction = sort === "price-desc" ? "DESC" : "ASC";
  const order = sort ? `ORDER BY (${effectivePrice}) ${direction}, p.id ASC` : "ORDER BY p.id ASC";
  return { where, order, replacements };
}

async function search(query, showDisabled) {
  const { limit, page, offset, fields: selected } = pageQuery(query, fields);
  const { where, order, replacements } = productFilters(query, showDisabled);
  return sequelize.transaction(async transaction => {
    const options = { replacements, transaction, type: QueryTypes.SELECT };
    const [{ total }] = await sequelize.query(`SELECT COUNT(*) AS total FROM products p ${where}`, options);
    const pagination = limit === -1 ? "" : "LIMIT :limit OFFSET :offset";
    const keys = await sequelize.query(`SELECT p.id FROM products p ${where} ${order} ${pagination}`, {
      ...options, replacements: { ...replacements, limit, offset },
    });
    const ids = keys.map(key => key.id);
    const products = await Product.findAll({ where: { id: { [Op.in]: ids } }, include: includes(showDisabled), transaction });
    const byId = new Map(products.map(product => [product.id, format(product, showDisabled)]));
    return { data: ids.map(id => pick(byId.get(id), selected)), total: Number(total), limit, page };
  });
}

async function findProduct(id, showDisabled) {
  const product = await Product.findOne({
    where: { id, ...(showDisabled ? {} : { enabled: true }) },
    include: includes(showDisabled),
  });
  if (!product) throw notFound();
  return format(product, showDisabled);
}

function assertPrice(price, discounted) {
  if (Number(discounted) > Number(price)) throw badRequest("O preço promocional não pode superar o preço original.");
}

async function setCategories(product, categoryIds, transaction) {
  const ids = [...new Set(categoryIds)];
  const total = await Category.count({ where: { id: ids }, transaction });
  if (total !== ids.length) throw badRequest("Uma ou mais categorias não existem.");
  await product.setCategories(ids, { transaction });
}

async function relatedWrite(Model, product, entries, transaction, prepare) {
  const ids = entries.filter(entry => entry.id !== undefined).map(entry => entry.id);
  if (new Set(ids).size !== ids.length) throw badRequest("Cada ID relacionado pode aparecer uma vez.");
  for (const { id, deleted, ...fields } of entries) {
    const existing = id === undefined ? null : await Model.findOne({
      where: { id, product_id: product.id }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (id !== undefined && !existing) throw badRequest("O item informado não pertence ao produto.");
    if (deleted && !existing) throw badRequest("Informe o ID do item a excluir.");
    const data = await prepare(fields, existing, deleted);
    if (deleted) await existing.destroy({ transaction });
    else if (existing) await existing.update(data, { transaction });
    else await Model.create({ ...data, product_id: product.id }, { transaction });
  }
}

async function writeImages(product, images, transaction, changes) {
  await relatedWrite(ProductImage, product, images, transaction, async ({ content, type, enabled }, existing, deleted) => {
    if (deleted) {
      changes.retired.push(existing.path);
      return {};
    }
    if (content === undefined && (!existing || type !== undefined)) throw badRequest("Informe o conteúdo da imagem.");
    const data = existing ? {} : { enabled: true };
    if (enabled !== undefined) data.enabled = enabled;
    if (content !== undefined) {
      data.path = await saveImage(content, type, changes, existing?.path);
      if (existing && data.path !== existing.path) changes.retired.push(existing.path);
    }
    return data;
  });
}

async function writeOptions(product, options, transaction) {
  await relatedWrite(ProductOption, product, options, transaction, ({ values, value, ...fields }, existing, deleted) => {
    if (deleted) return {};
    const nextValues = values ?? value ?? existing?.values.split(",");
    if (!nextValues || !(fields.title ?? existing?.title)) throw badRequest("Informe o título e os valores da opção.");
    const nextType = fields.type ?? existing?.type ?? "text";
    if (nextType === "color" && nextValues.some(item => !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(item))) {
      throw badRequest("Opções de cor devem usar valores hexadecimais.");
    }
    return { ...fields, values: nextValues.join(",") };
  });
}

async function saveProduct(id, { category_ids: categoryIds, images, options, ...fields }) {
  const changes = { created: [], retired: [] };
  let productId;
  try {
    productId = await sequelize.transaction(async transaction => {
      let product;
      if (id === null) {
        assertPrice(fields.price, fields.price_with_discount);
        product = await Product.create(fields, { transaction });
      } else {
        product = await Product.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) throw notFound();
        assertPrice(fields.price ?? product.price, fields.price_with_discount ?? product.price_with_discount);
        await product.update(fields, { transaction });
      }
      if (categoryIds !== undefined) await setCategories(product, categoryIds, transaction);
      if (images !== undefined) await writeImages(product, images, transaction, changes);
      if (options !== undefined) await writeOptions(product, options, transaction);
      return product.id;
    });
  } catch (error) {
    await cleanImages(changes.created);
    throw error;
  }
  await cleanImages(changes.retired);
  return productId;
}

async function deleteProduct(id) {
  const paths = await sequelize.transaction(async transaction => {
    const product = await Product.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw notFound();
    const images = await ProductImage.findAll({ where: { product_id: id }, attributes: ["path"], transaction });
    await product.destroy({ transaction });
    return images.map(image => image.path);
  });
  await cleanImages(paths);
}

module.exports = { search, findProduct, saveProduct, deleteProduct };
