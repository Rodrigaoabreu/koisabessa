const path = require("node:path");
const express = require("express");
const swagger = require("swagger-ui-express");
const openapi = require("../../specs/001-loja-koisabessa/contracts/openapi.json");
const { auth } = require("./middleware/auth");
const { userRoutes } = require("./routes/users");
const { categoryRoutes } = require("./routes/categories");
const { productRoutes } = require("./routes/products");
const { mediaDirectory, catalogDirectory } = require("./services/product-media");
const { fail } = require("./http");

function createApp({ jwtSecret } = {}) {
  if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error("JWT_SECRET deve conter pelo menos 32 bytes.");
  }
  const app = express();
  const authorization = auth(jwtSecret);
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "8mb" }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/media/catalog", express.static(catalogDirectory));
  app.use("/media/uploads", express.static(mediaDirectory, { immutable: true, maxAge: "7d" }));
  app.get("/docs/openapi.json", (req, res) => res.json(openapi));
  app.use("/docs", swagger.serve, swagger.setup(openapi, { customSiteTitle: "Koisabessa | API" }));
  app.use("/v1/user", userRoutes(authorization));
  app.use("/v1/category", categoryRoutes(authorization));
  app.use("/v1/product", productRoutes(authorization));

  const web = process.env.SERVE_WEB === "true";
  const webRoot = path.join(__dirname, "../../frontend/dist");
  if (web) {
    app.use(express.static(webRoot));
    app.get(/^(?!\/(?:v1|media|docs)(?:\/|$)).*/, (req, res, next) => {
      if (!req.accepts("html") || path.extname(req.path)) return next();
      return res.sendFile(path.join(webRoot, "index.html"));
    });
  }
  app.use((req, res) => res.status(404).json({ message: "Recurso não encontrado." }));
  app.use(fail);
  return app;
}

module.exports = { createApp };
