const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { User } = require("../models");
const { HttpError, badRequest, getId, only, parse, pick, shortText } = require("../http");

const email = z.email().max(254).transform(value => value.toLowerCase());
const names = { firstname: shortText(80), surname: shortText(120), email };
const account = z.object(names).strict();
const password = z.string().min(8).refine(value => Buffer.byteLength(value) <= 72, "Use até 72 bytes.");
const signup = account.extend({ password, confirmPassword: password })
  .refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "As senhas devem ser iguais." });
const credentials = z.object({ email, password: z.string().min(1).max(72) }).strict();
const publicFields = ["id", "firstname", "surname", "email"];
const missingUserHash = bcrypt.hashSync("unused-password-placeholder", 12);

function userRoutes(auth) {
  const router = Router();
  const throttle = rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Muitas tentativas. Tente novamente em alguns minutos." },
  });

  router.post("/", throttle, async (req, res) => {
    const input = parse(signup, req.body);
    if (await User.findOne({ where: { email: input.email }, attributes: ["id"] })) {
      throw badRequest("Já existe uma conta com este e-mail.");
    }
    const user = await User.create({ ...pick(input, Object.keys(names)), password: await bcrypt.hash(input.password, 12) });
    res.status(201).location(`/v1/user/${user.id}`).json(pick(user, publicFields));
  });

  router.post("/token", throttle, async (req, res) => {
    const input = parse(credentials, req.body);
    const user = await User.findOne({ where: { email: input.email } });
    const valid = await bcrypt.compare(input.password, user?.password || missingUserHash);
    if (!user || !valid) throw badRequest("E-mail ou senha inválidos.");
    res.set("Cache-Control", "no-store").json({ token: auth.sign(user.id) });
  });

  router.use("/:id", auth.verify, (req, res, next) => {
    if (getId(req.params.id) !== req.user.id) throw new HttpError(403, "Acesse apenas a sua conta.");
    next();
  });

  router.get("/:id", async (req, res) => {
    const user = await User.findByPk(req.user.id, { attributes: publicFields, rejectOnEmpty: false });
    if (!user) throw new HttpError(404, "Conta não encontrada.");
    res.set("Cache-Control", "no-store").json(user);
  });

  router.put("/:id", async (req, res) => {
    const [updated] = await User.update(only(parse(account.partial(), req.body)), { where: { id: req.user.id } });
    if (!updated) throw new HttpError(404, "Conta não encontrada.");
    res.sendStatus(204);
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await User.destroy({ where: { id: req.user.id } });
    if (!deleted) throw new HttpError(404, "Conta não encontrada.");
    res.sendStatus(204);
  });

  return router;
}

module.exports = { userRoutes };
