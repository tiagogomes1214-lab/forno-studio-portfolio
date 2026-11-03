"use strict";

// Ponto de entrada real da aplicação para a Discloud.
// O Next.js já foi compilado pelo comando BUILD e atende na porta 8080.
const { spawn } = require("node:child_process");
const path = require("node:path");

const frontend = path.join(__dirname, "frontend");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(npmCommand, ["run", "start"], {
  cwd: frontend,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

server.on("error", (error) => {
  console.error("[Forno Studio] Não foi possível iniciar o servidor Next.js:", error.message);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!server.killed) server.kill(signal);
  });
}
