const { Router } = require("express");
const { z } = require("zod");
const { Category } = require("../models");
const { badRequest, notFound, getId, only, pageQuery, parse, pick, shortText, slug } = require("../http");

const fields = ["id", "name", "slug", "use_in_menu"];
const categoryInput = z.object({ name: shortText(120), slug: slug(120), use_in_menu: z.boolean().optional() }).strict();

async function find(id) {
  const category = await Category.findByPk(id);
  if (!category) throw notFound();
  return category;
}

function categoryRoutes(auth) {
  const router = Router();

  router.get("/search", async (req, res) => {
    const { limit, page, offset, fields: selected } = pageQuery(req.query, fields);
    const menu = req.query.use_in_menu;
    if (menu !== undefined && menu !== "true" && menu !== "false") {
      throw badRequest("use_in_menu deve ser true ou false.");
    }
    const result = await Category.findAndCountAll({
      attributes: selected,
      where: menu === undefined ? {} : { use_in_menu: menu === "true" },
      order: [["id", "ASC"]],
      ...(limit === -1 ? {} : { limit, offset }),
    });
    res.json({ data: result.rows, total: result.count, limit, page });
  });

  router.get("/:id", async (req, res) => res.json(pick(await find(getId(req.params.id)), fields)));

  router.post("/", auth.verify, auth.admin, async (req, res) => {
    const category = await Category.create(parse(categoryInput, req.body));
    res.status(201).location(`/v1/category/${category.id}`).json(pick(category, fields));
  });

  router.put("/:id", auth.verify, auth.admin, async (req, res) => {
    const category = await find(getId(req.params.id));
    await category.update(only(parse(categoryInput.partial(), req.body)));
    res.sendStatus(204);
  });

  router.delete("/:id", auth.verify, auth.admin, async (req, res) => {
    const deleted = await Category.destroy({ where: { id: getId(req.params.id) } });
    if (!deleted) throw notFound();
    res.sendStatus(204);
  });
  return router;
}

module.exports = { categoryRoutes };
