"use strict";

/**
 * Entrada Node.js do Forno Studio na Discloud.
 * O runtime da Discloud instala dependências a partir do package.json da raiz.
 * O Next.js deve ser resolvido de node_modules da raiz, não de frontend/node_modules.
 */
const http = require("http");
const path = require("path");
const next = require("next");

const hostname = "0.0.0.0";
const port = 8080;
const app = next({
  dev: false,
  dir: path.join(__dirname, "frontend"),
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const server = http.createServer((request, response) => handle(request, response));
    server.listen(port, hostname, () => {
      console.log("[Forno Studio] Next.js disponível na porta " + port);
    });
  })
  .catch((error) => {
    console.error("[Forno Studio] Erro ao iniciar Next.js:", error);
    process.exit(1);
  });
