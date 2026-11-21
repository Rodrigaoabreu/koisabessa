const { Router } = require("express");
const { z } = require("zod");
const { getId, idSchema, only, parse, shortText, slug } = require("../http");
const { search, findProduct, saveProduct, deleteProduct } = require("../services/products");

const money = z.number().min(0).max(99_999_999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use até duas casas decimais.");
const image = z.object({
  id: idSchema.optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
  enabled: z.boolean().optional(),
  deleted: z.boolean().optional(),
}).strict();
const values = z.array(shortText(120).refine(value => !value.includes(","), "Separe os valores na lista.")).min(1).max(50);
const radius = z.union([z.number().int().min(0).max(500), z.string().regex(/^(?:[0-9]|[1-9][0-9]|[1-4][0-9]{2}|500)px$/).transform(value => Number.parseInt(value, 10))]);
const option = z.object({
  id: idSchema.optional(), title: shortText(120).optional(),
  shape: z.enum(["square", "circle"]).optional(),
  type: z.enum(["text", "color"]).optional(),
  radius: radius.optional(),
  values: values.optional(), value: values.optional(),
  deleted: z.boolean().optional(),
}).strict();
const product = z.object({
  enabled: z.boolean().optional(),
  name: shortText(160), slug: slug(160),
  use_in_menu: z.boolean().optional(),
  stock: z.number().int().min(0).max(2_147_483_647).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  price: money, price_with_discount: money,
  category_ids: z.array(idSchema).max(100).optional(),
  images: z.array(image).max(20).optional(),
  options: z.array(option).max(20).optional(),
}).strict();

function productRoutes(auth) {
  const router = Router();
  const isAdmin = req => req.user?.role === "admin";

  router.get("/search", auth.optional, async (req, res) => res.json(await search(req.query, isAdmin(req))));
  router.get("/:id", auth.optional, async (req, res) => res.json(await findProduct(getId(req.params.id), isAdmin(req))));

  router.post("/", auth.verify, auth.admin, async (req, res) => {
    const id = await saveProduct(null, parse(product, req.body));
    res.status(201).location(`/v1/product/${id}`).json(await findProduct(id, true));
  });
  router.put("/:id", auth.verify, auth.admin, async (req, res) => {
    await saveProduct(getId(req.params.id), only(parse(product.partial(), req.body)));
    res.sendStatus(204);
  });
  router.delete("/:id", auth.verify, auth.admin, async (req, res) => {
    await deleteProduct(getId(req.params.id));
    res.sendStatus(204);
  });

  return router;
}

module.exports = { productRoutes };
