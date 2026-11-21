const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { HttpError } = require("../http");

const unauthorized = () => new HttpError(401, "Token ausente, expirado ou inválido.");

function auth(secret) {
  async function verify(req, res, next) {
    const header = req.get("authorization") || "";
    const token = /^Bearer ([^\s]+)$/i.exec(header)?.[1];
    if (!token) throw unauthorized();

    let claims;
    try {
      claims = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: "koisabessa" });
    } catch {
      throw unauthorized();
    }
    const user = await User.findByPk(Number(claims.sub), { attributes: ["id", "role"] });
    if (!user) throw unauthorized();
    req.user = user;
    next();
  }

  return {
    verify,
    optional: (req, res, next) => req.get("authorization") ? verify(req, res, next) : next(),
    sign: id => jwt.sign({}, secret, { algorithm: "HS256", issuer: "koisabessa", subject: String(id), expiresIn: "2h" }),
    admin(req, res, next) {
      if (req.user.role !== "admin") throw new HttpError(403, "Apenas administradores podem alterar o catálogo.");
      next();
    },
  };
}

module.exports = { auth };
