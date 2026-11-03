"use strict";

/**
 * Faz o build do frontend no monorepo.
 * O GitHub integration da Discloud pode gerar .env na raiz do repositorio,
 * mas o Next.js le .env dentro de frontend/. Por isso importamos SOMENTE
 * as tres variaveis publicas necessarias ao processo de compilacao.
 * Nenhum segredo e copiado ou impresso nos logs.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const environmentFile = path.join(root, ".env");
const allow = new Set([
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_DEMO_MODE",
  "NEXT_PUBLIC_SITE_URL",
]);

if (fs.existsSync(environmentFile)) {
  const lines = fs.readFileSync(environmentFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?(NEXT_PUBLIC_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (!match || !allow.has(match[1]) || process.env[match[1]]) continue;
    let value = match[2];
    if (
      value.length >= 2 &&
      ((value[0] === '"' && value.at(-1) === '"') ||
        (value[0] === "'" && value.at(-1) === "'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

// O build Docker da Discloud pode não receber as variáveis cadastradas
// no painel até a execução da aplicação. São valores PÚBLICOS,
 // exclusivos do portfólio demonstrativo: nenhum segredo é embutido.
const demoDefaults = {
  NEXT_PUBLIC_API_URL: "https://forno-studio-api.onrender.com",
  NEXT_PUBLIC_DEMO_MODE: "true",
  NEXT_PUBLIC_SITE_URL: "https://fornostudio-tiago.discloud.app",
};
for (const [name, value] of Object.entries(demoDefaults)) {
  if (!process.env[name] || !process.env[name].trim()) {
    process.env[name] = value;
    console.log(`[Discloud] ${name} não recebida pelo build; usando valor público de demonstração.`);
  }
}

for (const name of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_SITE_URL"]) {
  try {
    const url = new URL(process.env[name]);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("URL invalida");
  } catch {
    console.error(`[Discloud] ${name} precisa conter uma URL http(s) valida.`);
    process.exit(1);
  }
}

if (!["true", "false"].includes(process.env.NEXT_PUBLIC_DEMO_MODE)) {
  console.error("[Discloud] NEXT_PUBLIC_DEMO_MODE deve ser true ou false.");
  process.exit(1);
}
if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
  console.error("[Discloud] Bloqueado: a hospedagem publica do portfolio deve usar DEMO_MODE=true.");
  process.exit(1);
}

function run(args) {
  const bin = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(bin, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error("[Discloud] Falha ao iniciar npm:", result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("[Discloud] Instalando dependencias e compilando o frontend Next.js.");
run(["--prefix", "frontend", "ci", "--include=dev"]);
run(["--prefix", "frontend", "run", "build"]);
