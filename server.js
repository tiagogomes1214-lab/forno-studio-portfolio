"use strict";

/**
 * Entrada Node.js do Forno Studio na Discloud.
 * O Next.js é instalado em frontend/node_modules durante o BUILD.
 * Não use 'next start' com um segundo processo: servimos o Next diretamente.
 */
const http = require("http");
const path = require("path");
const next = require("./frontend/node_modules/next");

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
