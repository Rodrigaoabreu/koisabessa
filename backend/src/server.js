const { sequelize } = require("./models");
const { createApp } = require("./app");

async function main() {
  const app = createApp({ jwtSecret: process.env.JWT_SECRET });
  await sequelize.authenticate();
  const port = Number(process.env.PORT || 3001);
  const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
    console.log(`Koisabessa API em http://127.0.0.1:${port}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(() => void sequelize.close()));
  }
}

main().catch(async error => {
  console.error(error.message);
  await sequelize.close();
  process.exitCode = 1;
});
