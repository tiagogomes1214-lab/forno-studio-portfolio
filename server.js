"use strict";

// A Discloud preserva o pacote de BUILD em dist/.
// Este arquivo fica na raiz para que MAIN=server.js seja validado no upload.
const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = "production";
process.env.PORT = "8080";
process.env.HOSTNAME = "0.0.0.0";

const releaseDir = path.join(__dirname, "dist");
const entry = path.join(releaseDir, "server.js");
const buildId = path.join(releaseDir, ".next", "BUILD_ID");

if (!fs.existsSync(entry) || !fs.existsSync(buildId)) {
  console.error("[Forno Studio] Build de produção ausente em dist/.");
  console.error("[Forno Studio] Execute um novo BUILD (npm run build), e não apenas Reiniciar.");
  process.exit(1);
}

// Servidor mínimo do Next.js gerado no build standalone.
require(entry);
