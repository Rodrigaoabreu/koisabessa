const { z } = require("zod");
const { UniqueConstraintError } = require("sequelize");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = message => new HttpError(400, message);
const notFound = () => new HttpError(404, "Recurso não encontrado.");

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue.path.join(".");
  throw badRequest(field ? `${field}: ${issue.message}` : issue.message);
}

function getId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw notFound();
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) throw notFound();
  return id;
}

function fail(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof HttpError) {
    if (error.status === 401) res.set("WWW-Authenticate", "Bearer");
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof UniqueConstraintError) {
    return res.status(400).json({ message: "Já existe um registro com esses dados." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Envie um corpo JSON válido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "O corpo da requisição excede o limite de 8 MB." });
  }
  console.error(error);
  return res.status(500).json({ message: "Não foi possível concluir a operação." });
}

const shortText = max => z.string().trim().min(1, "Preencha este campo.").max(max);
const slug = max => shortText(max).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.");
const idSchema = z.number().int().min(1).max(2_147_483_647);

function pageQuery(query, allowedFields) {
  const { limit = "12", page = "1", fields } = query;
  const validLimit = typeof limit === "string" && /^(?:-1|[1-9]\d*)$/.test(limit) && Number.isSafeInteger(Number(limit));
  const validPage = limit === "-1" || (typeof page === "string" && /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page)));
  if (!validLimit || !validPage) throw badRequest("Informe limit e page válidos.");
  const size = Number(limit);
  const pageNumber = size === -1 ? 1 : Number(page);
  const offset = size === -1 ? 0 : (pageNumber - 1) * size;
  if (!Number.isSafeInteger(offset)) throw badRequest("A página excede o limite permitido.");

  const selected = fields === undefined ? allowedFields : typeof fields === "string" ? fields.split(",").map(field => field.trim()) : [];
  if (!selected.length || selected.some(field => !allowedFields.includes(field))) {
    throw badRequest("O parâmetro fields contém um campo desconhecido.");
  }
  return { limit: size, page: pageNumber, offset, fields: selected };
}

function pick(object, fields) {
  return Object.fromEntries(fields.map(field => [field, object[field]]));
}

function only(body) {
  if (Object.keys(body).length === 0) throw badRequest("Informe ao menos um campo para atualizar.");
  return body;
}

module.exports = { HttpError, badRequest, notFound, parse, getId, fail, shortText, slug, idSchema, pageQuery, pick, only };
