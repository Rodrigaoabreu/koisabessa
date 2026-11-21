const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "../../.env"), quiet: true });

const database = {
  dialect: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3307),
  database: process.env.DB_NAME || "koisabessa",
  username: process.env.DB_USER || "koisabessa",
  password: process.env.DB_PASSWORD || "koisabessa_local",
  logging: false,
};

module.exports = { development: database, production: database, test: database };
